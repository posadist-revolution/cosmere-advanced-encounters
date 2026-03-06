import { ActionCostType, AdversaryRole, Status, TurnSpeed } from '@system/types/cosmere';

// Documents
import { CosmereActor, CosmereItem } from '@system/documents';

// Constants

import { AnyMutableObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import { MODULE_ID, SYSTEM_ID } from '@module/constants';
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
        let noPropagateKeys = [
            `system`,
            `flags.${SYSTEM_ID}`,
            `flags.${MODULE_ID}.actionsAvailableGroups`,
            `flags.${MODULE_ID}.actionsUsed`,
            `flags.${MODULE_ID}.freeActionsUsed`,
            `flags.${MODULE_ID}.specialActionsUsed`,
        ];
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
                    if(foundry.utils.deleteProperty(linkedCombatantUpdate, key)){
                        // We deleted the property, now let's iterate through and see if the parents are empty, and delete those
                        let lastKeyPeriodIndex = key.lastIndexOf('.');
                        let parentKey = key.slice(0, lastKeyPeriodIndex);
                        let parentKeyEmpty = true;
                        while(lastKeyPeriodIndex !== -1 && parentKeyEmpty) {
                            // console.log(`Checking if parent key ${parentKey} is empty`);
                            // console.log(foundry.utils.getProperty(linkedCombatantUpdate, parentKey));
                            //@ts-ignore
                            if(Object.keys(foundry.utils.getProperty(linkedCombatantUpdate, parentKey)).length == 0){
                                // console.log("Empty");
                                foundry.utils.deleteProperty(linkedCombatantUpdate, parentKey);
                                parentKeyEmpty = true;
                                lastKeyPeriodIndex = parentKey.lastIndexOf('.');
                                parentKey = parentKey.slice(0, lastKeyPeriodIndex);
                            }
                            else{
                                // console.log("Not empty");
                                parentKeyEmpty = false;
                            }
                        }
                    }
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
        await this.update({
            flags: {
                [SYSTEM_ID]: {
                    'turnSpeed': newSpeed
                }
            }
        }, {turnEvents: false})
        await this.setMaxBaseActions();
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

    //#region Module

    private _localActionsAvailableGroups?: ActionGroup[];
    private _localReactionsAvailable?: ActionGroup[];
    private _localActionsUsed?: UsedAction[];
    private _localReactionsUsed?: UsedAction[];
    private _localFreeActionsUsed?: UsedAction[];
    private _localSpecialActionsUsed?: UsedAction[];

    //#region GetSet

    //#region Get
    public get actionsAvailableGroups(): ActionGroup[] {
        if(!this._localActionsAvailableGroups){
            let flagData = this.getFlag(MODULE_ID, 'actionsAvailableGroups');
            if(foundry.utils.hasProperty(flagData, "Symbol.iterator")){
                this._localActionsAvailableGroups = ActionGroup.DeserializeArray(flagData);
            }
            else{
                this._localActionsAvailableGroups = []
            }
        }
        return this._localActionsAvailableGroups;
    }

    public get reactionsAvailable(): ActionGroup[] {
        if(!this._localReactionsAvailable){
            let flagData = this.getFlag(MODULE_ID, 'reactionsAvailable')
            if(foundry.utils.hasProperty(flagData, "Symbol.iterator")){
                this._localReactionsAvailable = ActionGroup.DeserializeArray(flagData);
            }
            else{
                this._localReactionsAvailable = []
            }
        }
        return this._localReactionsAvailable;
    }

    public get actionsUsed(): UsedAction[] {
        if(!this._localActionsUsed){
            let flagData = this.getFlag(MODULE_ID, 'actionsUsed');
            if(foundry.utils.hasProperty(flagData, "Symbol.iterator")){
                this._localActionsUsed = UsedAction.DeserializeArray(flagData);
            }
            else{
                this._localActionsUsed = []
            }
        }
        return this._localActionsUsed;
    }

    public get reactionsUsed(): UsedAction[] {
        if(!this._localReactionsUsed){
            let flagData = this.getFlag(MODULE_ID, 'reactionsUsed');
            if(foundry.utils.hasProperty(flagData, "Symbol.iterator")){
                this._localReactionsUsed = UsedAction.DeserializeArray(flagData);
            }
            else{
                this._localReactionsUsed = []
            }
        }
        return this._localReactionsUsed;
    }

    public get freeActionsUsed(): UsedAction[] {
        if(!this._localFreeActionsUsed){
            let flagData = this.getFlag(MODULE_ID, 'freeActionsUsed');
            if(foundry.utils.hasProperty(flagData, "Symbol.iterator")){
                this._localFreeActionsUsed = UsedAction.DeserializeArray(flagData);
            }
            else{
                this._localFreeActionsUsed = []
            }
        }
        return this._localFreeActionsUsed;
    }

    public get specialActionsUsed(): UsedAction[] {
        if(!this._localSpecialActionsUsed){
            let flagData = this.getFlag(MODULE_ID, 'specialActionsUsed');
            if(foundry.utils.hasProperty(flagData, "Symbol.iterator")){
                this._localSpecialActionsUsed = UsedAction.DeserializeArray(flagData);
            }
            else{
                this._localSpecialActionsUsed = []
            }
        }
        return this._localSpecialActionsUsed;
    }

    public async pullActionsFromFlags() {
        this._localActionsAvailableGroups = ActionGroup.DeserializeArray(await this.getFlag(MODULE_ID, 'actionsAvailableGroups'));
        this._localReactionsAvailable = ActionGroup.DeserializeArray(await this.getFlag(MODULE_ID, 'reactionsAvailable'));
        this._localActionsUsed = UsedAction.DeserializeArray(await this.getFlag(MODULE_ID, 'actionsUsed'));
        this._localReactionsUsed = UsedAction.DeserializeArray(await this.getFlag(MODULE_ID, 'reactionsUsed'));
        this._localFreeActionsUsed = UsedAction.DeserializeArray(await this.getFlag(MODULE_ID, 'freeActionsUsed'));
        this._localSpecialActionsUsed = UsedAction.DeserializeArray(await this.getFlag(MODULE_ID, 'specialActionsUsed'));
    }
    //#endregion Get

    //#region Set
    public set actionsAvailableGroups(actionsAvailableGroups: ActionGroup[]) {
        this._localActionsAvailableGroups = actionsAvailableGroups;
    }

    public set reactionsAvailable(reactionsAvailable: ActionGroup[]) {
        this._localReactionsAvailable = reactionsAvailable;
    }

    public set actionsUsed(actionsUsed: UsedAction[]) {
        this._localActionsUsed = actionsUsed;
    }

    public set reactionsUsed(reactionsUsed: UsedAction[]) {
        this._localReactionsUsed = reactionsUsed;
    }

    public set freeActionsUsed(freeActionsUsed: UsedAction[]) {
        this._localFreeActionsUsed = freeActionsUsed;
    }

    public set specialActionsUsed(specialActionsUsed: UsedAction[]) {
        this._localSpecialActionsUsed = specialActionsUsed;
    }

    public async sendUpdateFromActions(){
        // Get the diffs of what /actually/ changed
        var updateData: Combatant.UpdateData = {}
        const allPossibleUpdates: Combatant.UpdateData = {
            flags: {
                [MODULE_ID]: {
                    actionsAvailableGroups: ActionGroup.SerializeArray(this.actionsAvailableGroups),
                    actionsUsed: UsedAction.SerializeArray(this.actionsUsed),
                    reactionsAvailable: ActionGroup.SerializeArray(this.reactionsAvailable),
                    reactionsUsed: UsedAction.SerializeArray(this.reactionsUsed),
                    freeActionsUsed: UsedAction.SerializeArray(this.freeActionsUsed),
                    specialActionsUsed: UsedAction.SerializeArray(this.specialActionsUsed),
                }
            }
        }
        if(this.flags[MODULE_ID]){
            updateData = foundry.utils.diffObject(this, allPossibleUpdates);
        }
        else{
            updateData = allPossibleUpdates;
        }
        const updateOperation: Combatant.Database.UpdateOperation = {
            turnEvents: false,
            broadcast: true,
        }
        await this.update(updateData, updateOperation);
    }
    //#endregion Set

    //#endregion GetSet

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
        await this.sendUpdateFromActions();
    }

    protected applyConditionsToActions(){
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
        this.actionsAvailableGroups[0].recalculateRemaining();
        await this.sendUpdateFromActions();
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
        actionGroupToUse.useAction(action);
        if(!this._localActionsUsed){
            this._localActionsUsed = [action];
        }
        else{
            this._localActionsUsed.push(action);
        }
        await this.sendUpdateFromActions();
    }

    public async removeAction(action: UsedAction){
        let actionIndex = this.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        let actionGroup = this.getActionGroupByName(action.actionGroupUsedFromName!);

        actionGroup.removeAction(action);
        this._localActionsUsed?.splice(actionIndex, 1);

        await this.sendUpdateFromActions();
    }

    public async useReaction(reaction: UsedAction, reactionGroupName? : string){
        let reactionGroupToUse : ActionGroup;
        if(reactionGroupName){
            reactionGroupToUse = this.getReactionGroupByName(reactionGroupName);
        }
        else{
            reactionGroupToUse = this.getBestGroupForReaction(reaction);
        }
        reactionGroupToUse.useAction(reaction);
        if(!this._localReactionsUsed){
            this._localReactionsUsed = [reaction];
        }
        else{
            this._localReactionsUsed.push(reaction);
        }
        await this.sendUpdateFromActions();
    }

    public async removeReaction(reaction: UsedAction){
        let reactionIndex = this.reactionsUsed.findIndex((element) => (element.cost == reaction.cost && element.name == reaction.name));
        let reactionGroup = this.getReactionGroupByName(reaction.actionGroupUsedFromName!);

        reactionGroup.removeAction(reaction);
        this._localReactionsUsed?.splice(reactionIndex, 1);

        await this.sendUpdateFromActions();
    }

    public async useFreeAction(action: UsedAction){
        if(!this._localFreeActionsUsed){
            this._localFreeActionsUsed = [action];
        }
        else{
            this._localFreeActionsUsed.push(action);
        }
        await this.sendUpdateFromActions();
    }

    public async removeFreeAction(freeAction: UsedAction){
        let freeActionIndex = this.freeActionsUsed.findIndex((element) => (element.cost == freeAction.cost && element.name == freeAction.name));
        this._localFreeActionsUsed?.splice(freeActionIndex, 1);
        await this.sendUpdateFromActions();
    }

    public async useSpecialAction(action: UsedAction){
        if(!this._localSpecialActionsUsed){
            this._localSpecialActionsUsed = [action];
        }
        else{
            this._localSpecialActionsUsed.push(action);
        }
        await this.sendUpdateFromActions();
    }

    public async removeSpecialAction(specialAction: UsedAction){
        let specialActionIndex = this.specialActionsUsed.findIndex((element) => (element.cost == specialAction.cost && element.name == specialAction.name));
        this._localSpecialActionsUsed?.splice(specialActionIndex, 1);
        await this.sendUpdateFromActions();
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
}

export namespace AdvancedCosmereCombatant {
    export type Schema = Omit<Combatant.Schema, 'initiative'>;
    export namespace Database {
        export interface Update extends Combatant.Database.Update {
            noPropagateKeys?: string[];
        }
    }
}