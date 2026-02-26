import { ActionCostType, AdversaryRole, Status, TurnSpeed } from '@system/types/cosmere';

// Documents
import { CosmereActor, CosmereItem } from '@system/documents';

// Constants
import { SYSTEM_ID } from '@system/constants';

import { AnyMutableObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import { MODULE_ID } from '@module/constants';
import { ActionGroup, UsedAction } from './used-action';
import { getModuleSetting, SETTINGS } from '../settings';

let _schema:
    | foundry.data.fields.SchemaField<AdvancedCosmereCombatant.Schema>
    | undefined;

export class AdvancedCosmereCombatant extends Combatant {
    //#region System
    public static defineSchema() {
        const schema = super.defineSchema() as AdvancedCosmereCombatant.Schema &
            Partial<Pick<Combatant.Schema, 'initiative'>>;
        // Remove the initiative field from the schema as we handle it using a getter
        delete schema.initiative;
        return schema as Combatant.Schema;
    }

    public static get schema() {
        if (!_schema) {
            _schema = new foundry.data.fields.SchemaField(this.defineSchema());
        }
        return _schema as foundry.data.fields.SchemaField<Combatant.Schema>;
    }

    protected static override async _preUpdateOperation(
        documents: Combatant.Implementation[],
        operation: AdvancedCosmereCombatant.Database.Update,
        user: User.Implementation,
    ): Promise<boolean | void> {
        const newChanges: Combatant.UpdateData[] = [];

        // These are a set of keys the system wants never to be propagated between combatant turns
        let noPropagateKeys = [`system`, `flags.${SYSTEM_ID}`];
        if (operation.noPropagateKeys) {
            // If the operation had instructions to ignore any more keys of the update, add those here
            noPropagateKeys = noPropagateKeys.concat(operation.noPropagateKeys);
        }
        for (const update of operation.updates) {
            if (!update._id) {
                // This changed document for some reason doesn't have an ID, ignore it.
                continue;
            }
            const changedCombatant: AdvancedCosmereCombatant = documents.find(
                (combatant) => {
                    return combatant.id === update._id;
                },
            )!;
            if (!changedCombatant.linkedCombatantIds) {
                // This combatant has no duplicate combatants, continue
                continue;
            }
            for (const linkedCombatantId of changedCombatant.linkedCombatantIds) {
                // Clone the update data and change the id property to point to the linked combatant
                const linkedCombatantUpdate = foundry.utils.deepClone(
                    update,
                ) as AnyMutableObject;
                linkedCombatantUpdate._id = linkedCombatantId;
                for (const key of noPropagateKeys) {
                    foundry.utils.deleteProperty(linkedCombatantUpdate, key);
                }

                // Check to make sure this update contains useful information
                for (const key of Object.keys(linkedCombatantUpdate)) {
                    if (key !== '_id' && key !== '_stats') {
                        // If the update has a key other than the _id property or the _stats property, this update contains useful data
                        // TODO: Check to make sure this is a non-empty object?
                        documents.push(
                            changedCombatant.parent.getEmbeddedDocument(
                                'Combatant',
                                linkedCombatantId,
                                { strict: true },
                            )!,
                        );
                        newChanges.push(linkedCombatantUpdate);
                        break;
                    }
                }
            }
        }
        for (const newChange of newChanges) {
            operation.updates.push(newChange);
        }

        return Promise.resolve(true);
    }

    /* --- Accessors --- */

    override get actor(): CosmereActor {
        return super.actor!;
    }

    public get isBoss(): boolean {
        return (
            this.actor.isAdversary() &&
            this.actor.system.role === AdversaryRole.Boss
        );
    }

    public get initiative(): number {
        const spd = this.actor.system.attributes.spd;
        let initiative = spd.value + spd.bonus;
        if (this.actor.isCharacter()) initiative += 500;
        if (this.turnSpeed === TurnSpeed.Fast) initiative += 1000;
        return initiative;
    }

    public get turnSpeed(): TurnSpeed {
        return this.getFlag(SYSTEM_ID, 'turnSpeed') ?? TurnSpeed.Slow;
    }

    public get activated(): boolean {
        return this.getFlag(SYSTEM_ID, 'activated') ?? false;
    }

    public get linkedCombatantIds(): string[] | undefined {
        return this.getFlag(MODULE_ID, 'linkedCombatantIds') ?? undefined;
    }

    /* --- Life cycle --- */

    public override rollInitiative(): Promise<this> {
        // Initiative is static and does not require rolling
        return Promise.resolve(this);
    }

    /* --- System functions --- */

    /**
     * Utility function to flip the combatants current turn speed between slow and fast. It then updates initiative to force an update of the combat-tracker ui
     */
    public async toggleTurnSpeed() {
        const newSpeed =
            this.turnSpeed === TurnSpeed.Slow ? TurnSpeed.Fast : TurnSpeed.Slow;

        // Update the turn speed
        await this.setFlag(SYSTEM_ID, 'turnSpeed', newSpeed);
    }

    public async markActivated() {
        await this.setFlag(SYSTEM_ID, 'activated', true);
    }

    public async resetActivation() {
        await this.update({
            flags: {
                [SYSTEM_ID]: {
                    activated: false,
                },
            },
        });
    }
    //#endregion

    public get actionsAvailableGroups(): ActionGroup[] {
        return this.getFlag(MODULE_ID, 'actionsAvailableGroups');
    }

    public get reactionsAvailable(): ActionGroup[] {
        return this.getFlag(MODULE_ID, 'reactionsAvailable');
    }

    public get actionsUsed(): UsedAction[] {
        return this.getFlag(MODULE_ID, 'actionsUsed');
    }

    public get reactionsUsed(): UsedAction[] {
        return this.getFlag(MODULE_ID, 'reactionsUsed');
    }

    public get freeActionsUsed(): UsedAction[] {
        return this.getFlag(MODULE_ID, 'freeActionsUsed');
    }

    public get specialActionsUsed(): UsedAction[] {
        return this.getFlag(MODULE_ID, 'specialActionsUsed');
    }

    public set actionsAvailableGroups(actionsAvailableGroups: ActionGroup[]) {
        const updateData: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    ["actionsAvailableGroups"]: actionsAvailableGroups
                }
            }
        };
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true
        };
        this.update(updateData, updateOperation);
    }

    public set reactionsAvailable(reactionsAvailable: ActionGroup[]) {
        const updateData: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    ["reactionsAvailable"]: reactionsAvailable
                }
            }
        };
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true
        };
        this.update(updateData, updateOperation);
    }

    public set actionsUsed(actionsUsed: UsedAction[]) {
        const updateData: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    ["actionsUsed"]: actionsUsed
                }
            }
        };
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true
        };
        this.update(updateData, updateOperation);
    }

    public set reactionsUsed(reactionsUsed: UsedAction[]) {
        const updateData: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    ["reactionsUsed"]: reactionsUsed
                }
            }
        };
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true
        };
        this.update(updateData, updateOperation);
    }

    public set freeActionsUsed(freeActionsUsed: UsedAction[]) {
        const updateData: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    ["freeActionsUsed"]: freeActionsUsed
                }
            }
        };
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true
        };
        this.update(updateData, updateOperation);
    }

    public set specialActionsUsed(specialActionsUsed: UsedAction[]) {
        const updateData: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    ["specialActionsUsed"]: specialActionsUsed
                }
            }
        };
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true
        };
        this.update(updateData, updateOperation);
    }

    /* --- Public action interfaces ---*/
    //#region CombatantTurnActions_PublicActionInterfaces
    public async onTurnStart(){
        let actionsOnTurn = this.getMaxBaseActionsOnTurn();
        this.actionsAvailableGroups = [new ActionGroup(actionsOnTurn, "base")];
        this.reactionsAvailable = [new ActionGroup(1, "base")];
        this.actionsUsed = [];
        this.reactionsUsed = [];
        this.freeActionsUsed = [];
        this.specialActionsUsed = [];
        this.applyConditionsToActions();
    }

    public applyConditionsToActions(){
        // Check the setting, and if we don't apply conditions to actions, return
        if(!getModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS)){
            return;
        }
        if(this.actor.statuses.has(Status.Stunned)) {
            this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Stunned")), "base");
            this.useAction(new UsedAction(2, game.i18n?.localize("COSMERE.Status.Stunned")), "base");
            return;
        }
        if(this.actor.statuses.has(Status.Surprised)) {
            this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Surprised")), "base");
            this.useAction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Surprised")), "base");
            return;
        }
        if(this.actor.statuses.has(Status.Disoriented)) {
            this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Disoriented")), "base");
            return;
        }
    }

    public async applyConditionsOffTurn(statuses: Set<string>){
        for(const reactionAvailable of this.reactionsAvailable){
            if(reactionAvailable.remaining > 0){
                if(statuses.has(Status.Stunned)){
                    this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Stunned")), reactionAvailable.name);
                }
                else if(statuses.has(Status.Surprised)){
                    this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Surprised")), reactionAvailable.name);
                }
                else if(statuses.has(Status.Disoriented)){
                    this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Disoriented")), reactionAvailable.name);
                }
            }
        }
    }

    public async removeConditionsOffTurn(statuses: Set<string>){
        for(const reactionUsed of this.reactionsUsed){
            if(statuses.has(Status.Stunned) && reactionUsed.name == game.i18n?.localize("COSMERE.Status.Stunned")){
                this.removeReaction(reactionUsed);
            }
            else if(statuses.has(Status.Surprised) && reactionUsed.name == game.i18n?.localize("COSMERE.Status.Surprised")){
                this.removeReaction(reactionUsed);
            }
            else if(statuses.has(Status.Disoriented) && reactionUsed.name == game.i18n?.localize("COSMERE.Status.Disoriented")){
                this.removeReaction(reactionUsed);
            }
        }
    }

    public async setMaxBaseActions(){
        this.actionsAvailableGroups[0].max = this.getMaxBaseActionsOnTurn();
        this.recalculateRemaining(this.actionsAvailableGroups[0]);
    }

    public async useAction(action : UsedAction, actionGroupName? : string){
        // console.log("useAction");
        let actionGroupToUse : ActionGroup;
        if(actionGroupName){
            actionGroupToUse = this.getActionGroupByName(actionGroupName);
        }
        else{
            actionGroupToUse = this.getBestGroupForAction(action);
        }
        this.useActionFromGroup(actionGroupToUse, action);
        let newActionsUsed = this.actionsUsed;
        newActionsUsed.push(action);
        this.actionsUsed = newActionsUsed;
    }

    public async removeAction(action: UsedAction){
        let actionIndex = this.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        let actionGroup = this.getActionGroupByName(action.actionGroupUsedFromName!);
        this.removeActionFromGroup(actionGroup, action);
        let newActionsUsed = this.actionsUsed;
        newActionsUsed.splice(actionIndex, 1);
        this.actionsUsed = newActionsUsed;
    }

    public async useReaction(reaction: UsedAction, reactionGroupName? : string){
        let reactionGroupToUse : ActionGroup;
        if(reactionGroupName){
            reactionGroupToUse = this.getReactionGroupByName(reactionGroupName);
        }
        else{
            reactionGroupToUse = this.getBestGroupForReaction(reaction);
        }
        this.useActionFromGroup(reactionGroupToUse, reaction);
        let newReactionsUsed = this.reactionsUsed;
        newReactionsUsed.push(reaction);
        this.reactionsUsed = newReactionsUsed;
    }

    public async removeReaction(reaction: UsedAction){
        let reactionIndex = this.reactionsUsed.findIndex((element) => (element.cost == reaction.cost && element.name == reaction.name));
        let reactionGroup = this.getReactionGroupByName(reaction.actionGroupUsedFromName!);
        this.removeActionFromGroup(reactionGroup, reaction);
        let newReactionsUsed = this.reactionsUsed;
        newReactionsUsed.splice(reactionIndex, 1);
        this.reactionsUsed = newReactionsUsed;
    }

    public async useFreeAction(action: UsedAction){
        let newFreeActionsUsed = this.freeActionsUsed;
        newFreeActionsUsed.push(action);
        this.freeActionsUsed = newFreeActionsUsed;
    }

    public async removeFreeAction(freeAction: UsedAction){
        let freeActionIndex = this.freeActionsUsed.findIndex((element) => (element.cost == freeAction.cost && element.name == freeAction.name));
        let newFreeActionsUsed = this.freeActionsUsed;
        newFreeActionsUsed.splice(freeActionIndex, 1);
        this.freeActionsUsed = newFreeActionsUsed;
    }

    public async useSpecialAction(action: UsedAction){
        let newSpecialActionsUsed = this.specialActionsUsed;
        newSpecialActionsUsed.push(action);
        this.specialActionsUsed = newSpecialActionsUsed;
    }

    public async removeSpecialAction(specialAction: UsedAction){
        let specialActionIndex = this.specialActionsUsed.findIndex((element) => (element.cost == specialAction.cost && element.name == specialAction.name));
        let newSpecialActionsUsed = this.specialActionsUsed;
        newSpecialActionsUsed.splice(specialActionIndex, 1);
        this.specialActionsUsed = newSpecialActionsUsed;
    }

    public async onCombatantTurnSpeedChange(){
        //console.log(`${MODULE_ID}: Combatant ${this.combatant.id} changed turn speed`)
        this.setMaxBaseActions();
    }

    public canUseItem(item: CosmereItem): boolean{
        switch(item.system.activation.cost.type){
            case ActionCostType.Action:
                for(const actionGroup of this.actionsAvailableGroups){
                    if(actionGroup.actionIsInGroup && (!actionGroup.actionIsInGroup(item))){
                        continue;
                    }
                    if(actionGroup.remaining >= item.system.activation.cost.value){
                        return true;
                    }
                }
                return false;
            case ActionCostType.Reaction:
                for(const reactionGroup of this.reactionsAvailable){
                    if(reactionGroup.actionIsInGroup && (!reactionGroup.actionIsInGroup(item))){
                        continue;
                    }
                    if(reactionGroup.remaining > 0){
                        return true;
                    }
                }
                return false;
            default:
                return true;
        }
    }
    //#endregion

    protected getMaxBaseActionsOnTurn(){
        var actionsOnTurn = 0;
        if(this.turnSpeed == TurnSpeed.Fast){
            actionsOnTurn = 2;
        }
        else{
            actionsOnTurn = 3;
        }
        return actionsOnTurn;
    }

    protected getActionGroupByName(name: string){
        for (const actionGroup of this.actionsAvailableGroups){
            if(actionGroup.name == name){
                return actionGroup;
            }
            // TODO: Error if we can't find an action group with a matching name
        }
        return this.actionsAvailableGroups[0];
    }

    protected getBestGroupForAction(action: UsedAction){
        let matchingLimitedActionGroups = [];
        let matchingActionGroups = [];
        // Find all the action groups which this action could fit into
        for (const actionGroup of this.actionsAvailableGroups){
            if(actionGroup.remaining >= action.cost){
                if(actionGroup.actionIsInGroup && actionGroup.actionIsInGroup(action)){
                    matchingLimitedActionGroups.push(actionGroup);
                    matchingActionGroups.push(actionGroup);
                }
                else if(!(actionGroup.actionIsInGroup)){
                    matchingActionGroups.push(actionGroup);
                }
            }
        }
        if(matchingLimitedActionGroups.length != 0){
            // TODO: Prompt the user to select a group instead of just selecting the 0th element
            return matchingLimitedActionGroups[0];
        }
        else{
            return matchingActionGroups[0];
        }
    }

    protected getReactionGroupByName(name: string){
        for (const actionGroup of this.reactionsAvailable){
            if(actionGroup.name == name){
                return actionGroup;
            }
            // TODO: Error if we can't find an action group with a matching name
        }
        return this.reactionsAvailable[0];
    }

    protected getBestGroupForReaction(action: UsedAction){
        let matchingLimitedActionGroups = [];
        let matchingActionGroups = [];
        // Find all the action groups which this action could fit into
        for (const actionGroup of this.reactionsAvailable){
            if(actionGroup.remaining >= action.cost){
                if(actionGroup.actionIsInGroup && actionGroup.actionIsInGroup(action)){
                    matchingLimitedActionGroups.push(actionGroup);
                    matchingActionGroups.push(actionGroup);
                }
                else if(!(actionGroup.actionIsInGroup)){
                    matchingActionGroups.push(actionGroup);
                }
            }
        }
        if(matchingLimitedActionGroups.length != 0){
            // TODO: Prompt the user to select a group instead of just selecting the 0th element
            return matchingLimitedActionGroups[0];
        }
        else{
            return matchingActionGroups[0];
        }
    }

    protected useActionFromGroup(actionGroup: ActionGroup, usedAction: UsedAction){
        let tempUsed = actionGroup.used += usedAction.cost;
        actionGroup.used = (tempUsed < 0) ? 0 : (tempUsed > 3) ? 3 : tempUsed;
        this.recalculateRemaining(actionGroup);
        usedAction.actionGroupUsedFromName = actionGroup.name;
    }

    protected recalculateRemaining(actionGroup: ActionGroup){
        let tempRemaining = actionGroup.max - actionGroup.used;
        actionGroup.remaining = (tempRemaining < 0) ? 0 : (tempRemaining > 3) ? 3 : tempRemaining;
    }

    protected removeActionFromGroup(actionGroup: ActionGroup, usedAction: UsedAction){
        let tempUsed = actionGroup.used - usedAction.cost;
        actionGroup.used = (tempUsed < 0) ? 0 : (tempUsed > 3) ? 3 : tempUsed;
        this.recalculateRemaining(actionGroup);
        usedAction.actionGroupUsedFromName = actionGroup.name;
    }
}

export namespace AdvancedCosmereCombatant {
    export type Schema = Omit<Combatant.Schema, 'initiative'>;
    export namespace Database {
        export interface Update extends Combatant.Database.Update {
            noPropagateKeys?: string[];
        }
    }
}