import { AnyObject } from "@league-of-foundry-developers/foundry-vtt-types/utils";
import { ActionGroup, UsedAction } from "./used-action";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { ActionCostType, Status, TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere";
import { activeCombat } from "@src/index";
import { MODULE_ID } from "../constants";
import { TEMPLATES } from "../helpers/templates.mjs";
import { CombatantActions } from "./combatant-actions";
import { CosmereItem } from "@src/declarations/cosmere-rpg/documents/item";
import { getModuleSetting, SETTINGS } from "../settings";


interface CombatTurnActionsContext{
    combatantId: string;
    actionsAvailableGroups: ActionGroup[];
    actionsUsed: UsedAction[];
    reactionsAvailable: ActionGroup[];
    reactionsUsed: UsedAction[];
    freeActionsUsed: UsedAction[];
    specialActionsUsed: UsedAction[];
}

export class CombatantTurnActions extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2<AnyObject>,
){
    static DEFAULT_OPTIONS = {
        actions: {
            useAction: this._onUseActionButton,
            restoreAction: this._onRestoreActionButton,
            useReaction: this._onUseReactionButton,
            restoreReaction: this._onRestoreReactionButton,
            restoreFreeAction: this._onRestoreFreeActionButton,
            restoreSpecialAction: this._onRestoreSpecialActionButton
        },
        window: {
            frame: false
        },
        classes: ["combatant-controls", "flexrow"],
    };

    static PARTS = foundry.utils.mergeObject(
        foundry.utils.deepClone(super.PARTS),
        {
            content: {
                template: TEMPLATES.COMBATANT_ACTIONS_TEMPLATE,
                root: true,
            },
        },
    );

    readonly combatantActions: CombatantActions;
    readonly combatant: CosmereCombatant;
    // readonly turnContext: CosmereTurnContext;
    readonly isBossFastTurn: boolean;
    declare context: CombatTurnActionsContext;

    constructor(combatantActions: CombatantActions, bossFastTurn = false) {
        super();
        this.combatantActions = combatantActions;
        this.combatant = combatantActions.combatant;
        this.isBossFastTurn = bossFastTurn;
        this.context = {
            combatantId: this.combatant.id!,
            actionsAvailableGroups: [],
            actionsUsed: [],
            reactionsAvailable: [],
            reactionsUsed: [],
            freeActionsUsed: [],
            specialActionsUsed: []
        };
        this.refreshActionsFromFlags();
    }

    /* --- Public action interfaces ---*/
    //#region CombatantTurnActions_PublicActionInterfaces
    public async onTurnStart(){
        let actionsOnTurn = this.getMaxBaseActionsOnTurn(this.combatant.turnSpeed);
        this.context.actionsAvailableGroups = [new ActionGroup(actionsOnTurn, "base")];
        this.context.reactionsAvailable = [new ActionGroup(1, "base")];
        this.context.actionsUsed = [];
        this.context.reactionsUsed = [];
        this.context.freeActionsUsed = [];
        this.context.specialActionsUsed = [];
        this.applyConditionsToActions();
        this.setFlagAll();
    }

    public applyConditionsToActions(){
        // Check the setting, and if we don't apply conditions to actions, return
        if(!getModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS)){
            return;
        }
        if(this.combatant.actor.statuses.has(Status.Stunned)) {
            this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Stunned")), "base");
            this.useAction(new UsedAction(2, game.i18n?.localize("COSMERE.Status.Stunned")), "base");
            return;
        }
        if(this.combatant.actor.statuses.has(Status.Surprised)) {
            this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Surprised")), "base");
            this.useAction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Surprised")), "base");
            return;
        }
        if(this.combatant.actor.statuses.has(Status.Disoriented)) {
            this.useReaction(new UsedAction(1, game.i18n?.localize("COSMERE.Status.Disoriented")), "base");
            return;
        }
    }

    public async applyConditionsOffTurn(statuses: Set<string>){
        for(const reactionAvailable of this.context.reactionsAvailable){
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
        await this.setFlagReactions();
    }

    public async removeConditionsOffTurn(statuses: Set<string>){
        for(const reactionUsed of this.context.reactionsUsed){
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
        await this.setFlagReactions();
    }

    public async setMaxBaseActions(turnSpeed: TurnSpeed){
        this.context.actionsAvailableGroups[0].max = this.getMaxBaseActionsOnTurn(turnSpeed);
        this.recalculateRemaining(this.context.actionsAvailableGroups[0]);
        await this.setFlagActions();
    }

    public async refreshActionsFromFlags(){
        await this.getFlagAll();
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
        this.context.actionsUsed.push(action);
        await this.setFlagActions();
    }

    public async removeAction(action: UsedAction){
        let actionIndex = this.context.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        let actionGroup = this.getActionGroupByName(action.actionGroupUsedFromName!);
        this.removeActionFromGroup(actionGroup, action);
        this.context.actionsUsed.splice(actionIndex, 1);
        await this.setFlagActions();
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
        this.context.reactionsUsed.push(reaction);
        await this.setFlagReactions();
    }

    public async removeReaction(reaction: UsedAction){
        let reactionIndex = this.context.actionsUsed.findIndex((element) => (element.cost == reaction.cost && element.name == reaction.name));
        let reactionGroup = this.getReactionGroupByName(reaction.actionGroupUsedFromName!);
        this.removeActionFromGroup(reactionGroup, reaction);
        this.context.reactionsUsed.splice(reactionIndex, 1);
        await this.setFlagReactions();
    }

    public async useFreeAction(action: UsedAction){
        this.context.freeActionsUsed.push(action);
        await this.setFlagActions();
    }

    public async removeFreeAction(freeAction: UsedAction){
        let freeActionIndex = this.context.freeActionsUsed.findIndex((element) => (element.cost == freeAction.cost && element.name == freeAction.name));
        this.context.freeActionsUsed.splice(freeActionIndex, 1);
        await this.setFlagActions();
    }

    public async useSpecialAction(action: UsedAction){
        this.context.specialActionsUsed.push(action);
        await this.setFlagActions();
    }

    public async removeSpecialAction(specialAction: UsedAction){
        let specialActionIndex = this.context.specialActionsUsed.findIndex((element) => (element.cost == specialAction.cost && element.name == specialAction.name));
        this.context.specialActionsUsed.splice(specialActionIndex, 1);
        await this.setFlagActions();
    }

    public async onCombatantTurnSpeedChange(turnSpeed: TurnSpeed){
        //console.log(`${MODULE_ID}: Combatant ${this.combatant.id} changed turn speed`)
        this.setMaxBaseActions(turnSpeed);
    }

    public canUseItem(item: CosmereItem): boolean{
        switch(item.system.activation.cost.type){
            case ActionCostType.Action:
                for(const actionGroup of this.context.actionsAvailableGroups){
                    if(actionGroup.actionIsInGroup && (!actionGroup.actionIsInGroup(item))){
                        continue;
                    }
                    if(actionGroup.remaining >= item.system.activation.cost.value){
                        return true;
                    }
                }
                return false;
            case ActionCostType.Reaction:
                for(const reactionGroup of this.context.reactionsAvailable){
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

    protected getMaxBaseActionsOnTurn(turnSpeed: TurnSpeed){
        var actionsOnTurn = 0;
        if(this.combatant.isBoss){
            if(this.isBossFastTurn){
                actionsOnTurn = 2;
            }
            else{
                actionsOnTurn = 3;
            }
        }
        else{
            if(turnSpeed == TurnSpeed.Fast){
                actionsOnTurn = 2;
            }
            else{
                actionsOnTurn = 3;
            }
        }
        return actionsOnTurn;
    }

    protected getActionGroupByName(name: string){
        for (const actionGroup of this.context.actionsAvailableGroups){
            if(actionGroup.name == name){
                return actionGroup;
            }
            // TODO: Error if we can't find an action group with a matching name
        }
        return this.context.actionsAvailableGroups[0];
    }

    protected getBestGroupForAction(action: UsedAction){
        let matchingLimitedActionGroups = [];
        let matchingActionGroups = [];
        // Find all the action groups which this action could fit into
        for (const actionGroup of this.context.actionsAvailableGroups){
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
        for (const actionGroup of this.context.reactionsAvailable){
            if(actionGroup.name == name){
                return actionGroup;
            }
            // TODO: Error if we can't find an action group with a matching name
        }
        return this.context.reactionsAvailable[0];
    }

    protected getBestGroupForReaction(action: UsedAction){
        let matchingLimitedActionGroups = [];
        let matchingActionGroups = [];
        // Find all the action groups which this action could fit into
        for (const actionGroup of this.context.reactionsAvailable){
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

    protected async _prepareContext(options: any){
        return this.context as any;
    }

    /* --- Actions --- */
    //#region CombatantTurnActions_Actions
    protected static async _onUseActionButton(
        event: Event
    ){
        // console.log("Use action button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionGroupName = btn.getAttribute("action-group-name")!;

        // Get the combatant actions and turn speed of what was clicked
        const combatantActions = activeCombat!.getCombatantActionsByCombatantId(li.dataset.combatantId!)!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`UsedAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.useAction(new UsedAction(1, game.i18n?.localize("cosmere-advanced-encounters.cost_manual"), actionGroupName));
    }

    protected static async _onRestoreActionButton(
        event: Event
    ){
        // console.log("Restore action button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name")!;
        const actionCost = btn.getAttribute("action-cost")!;
        const actionGroupName = btn.getAttribute("action-group-name")!;

        // Get the combatant actions
        const combatantActions = activeCombat!.getCombatantActionsByCombatantId(li.dataset.combatantId!)!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`RestoredAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.removeAction(new UsedAction(Number(actionCost), actionName, actionGroupName));
    }

    protected static async _onUseReactionButton(
        event: Event
    ){
        // console.log("Use reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionGroupName = btn.getAttribute("action-group-name")!;

        // Get the combatant actions
        const combatantActions = activeCombat!.getCombatantActionsByCombatantId(li.dataset.combatantId!)!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.useReaction(new UsedAction(1, game.i18n?.localize("cosmere-advanced-encounters.cost_manual"), actionGroupName));

        void await combatantTurnActions.setFlagReactions();
    }

    protected static async _onRestoreReactionButton(
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionGroupName = btn.getAttribute("action-group-name")!;
        const actionName = btn.getAttribute("action-name")!;

        // Get the combatant actions
        const combatantActions = activeCombat!.getCombatantActionsByCombatantId(li.dataset.combatantId!)!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.removeReaction(new UsedAction(1, actionName, actionGroupName));

        void await combatantTurnActions.setFlagReactions();
    }

    protected static async _onRestoreFreeActionButton(
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name")!;

        // Get the combatant actions
        const combatantActions = activeCombat!.getCombatantActionsByCombatantId(li.dataset.combatantId!)!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.removeFreeAction(new UsedAction(1, actionName));
    }

    protected static async _onRestoreSpecialActionButton(
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name")!;

        // Get the combatant actions
        const combatantActions = activeCombat!.getCombatantActionsByCombatantId(li.dataset.combatantId!)!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.removeSpecialAction(new UsedAction(1, actionName));
    }
    //#endregion

    /* --- Flag Operations --- */
    //#region CombatantTurnActions_FlagOperations
    //#region CombatantTurnActions_SetFlag

    protected async setFlagAll(){
        this.setFlagActions();
        this.setFlagReactions();
    }

    protected async setFlagActions(){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!this.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }
        var updateData = {};
        if(this.isBossFastTurn){
            updateData = {
                flags: {
                    [MODULE_ID]: {
                        ["bossFastActionsAvailableGroups"]: this.context.actionsAvailableGroups,
                        ["bossFastActionsUsed"]: this.context.actionsUsed,
                        ["bossFastFreeActionsUsed"]: this.context.freeActionsUsed,
                        ["bossFastSpecialActionsUsed"]: this.context.specialActionsUsed,
                    }
                }
            }
        }
        else{
            updateData = {
                flags: {
                    [MODULE_ID]: {
                        ["actionsAvailableGroups"]: this.context.actionsAvailableGroups,
                        ["actionsUsed"]: this.context.actionsUsed,
                        ["freeActionsUsed"]: this.context.freeActionsUsed,
                        ["specialActionsUsed"]: this.context.specialActionsUsed,
                    }
                }
            }
        }
        await this.combatantActions.updateDataWithCombatTurn(updateData);
    }

    protected async setFlagReactions(){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!this.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }
        const updateData = {
            flags: {
                [MODULE_ID]: {
                    ["reactionsAvailable"]: this.context.reactionsAvailable,
                    ["reactionsUsed"]: this.context.reactionsUsed
                }
            }
        };
        await this.combatantActions.updateDataWithCombatTurn(updateData);
    }
    //#endregion
    //#region CombatantTurnActions_GetFlag

    protected async getFlagAll(){
        await this.getFlagActions();
        await this.getFlagReactions();
    }

    protected async getFlagActions(){
        if(this.isBossFastTurn){
            this.context.actionsAvailableGroups = this.combatant.flags[MODULE_ID]?.bossFastActionsAvailableGroups!;
            this.context.actionsUsed = this.combatant.flags[MODULE_ID]?.bossFastActionsUsed!;
            this.context.freeActionsUsed = this.combatant.flags[MODULE_ID]?.bossFastFreeActionsUsed!;
            this.context.specialActionsUsed = this.combatant.flags[MODULE_ID]?.bossFastSpecialActionsUsed!;
        }
        else{
            this.context.actionsAvailableGroups = this.combatant.flags[MODULE_ID]?.actionsAvailableGroups!;
            this.context.actionsUsed = this.combatant.flags[MODULE_ID]?.actionsUsed!;
            this.context.freeActionsUsed = this.combatant.flags[MODULE_ID]?.freeActionsUsed!;
            this.context.specialActionsUsed = this.combatant.flags[MODULE_ID]?.specialActionsUsed!;
        }
    }

    protected async getFlagReactions(){
        this.context.reactionsAvailable = this.combatant.flags[MODULE_ID]?.reactionsAvailable!;
        this.context.reactionsUsed = this.combatant.flags[MODULE_ID]?.reactionsUsed!;
    }
    //#endregion
    //#endregion
}