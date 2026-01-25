import { MODULE_ID } from "../constants";
import { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import { AdvancedCosmereCombat } from "./advanced-cosmere-combat";
import { activeCombat, advancedCombatsMap } from "@src/index";
import { TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { TEMPLATES } from "../helpers/templates.mjs"
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "../settings";
import { CosmereCombat } from "@src/declarations/cosmere-rpg/documents/combat";
import { migrateFlags } from "../helpers/flag-migration-helper";

export class UsedAction{
    declare cost: number
    declare name: string
    declare actionGroupUsedFromName?: string
    constructor(cost: number, name?: string, actionGroupName?: string){
        this.cost = cost;
        this.actionGroupUsedFromName = actionGroupName ?? "base";
        this.name = name ?? game.i18n!.localize(`cosmere-advanced-encounters.cost_manual`);
    }
}

export type ActionIsInGroupFunc = (action: UsedAction) => boolean;

export class ActionGroup{
    declare max: number;
    declare remaining: number;
    declare used: number;
    declare name: string;
    declare actionIsInGroup?: ActionIsInGroupFunc;
    constructor(count: number, name : string, actionIsInGroup? : ActionIsInGroupFunc){
        this.max = count;
        this.remaining = count;
        this.used = 0;
        this.name = name;
        this.actionIsInGroup = actionIsInGroup;
    }
}

export class CombatantActions{

    readonly combatant: CosmereCombatant;
    declare combatantTurnActions: CombatantTurnActions;
    declare bossFastTurnActions: CombatantTurnActions;

    constructor(combatant: CosmereCombatant) {
        this.combatant = combatant;
        //console.log(`${MODULE_ID}: New combatant- ID # ${combatant.id}`)
        this.combatantTurnActions = new CombatantTurnActions(this)
        if(this.isBoss){
            this.bossFastTurnActions = new CombatantTurnActions(this, true);
        }
        if(this.combatant.getFlag(MODULE_ID, "flags_initialized_version")){
            if(!(this.combatant.getFlag(MODULE_ID, "flags_initialized_version") == game.modules?.get(MODULE_ID)?.version)){
                // Combatant has flags from a previous version
                migrateFlags(this);
            }
        }
        else{
            CombatantActions.initializeCombatantFlags(this.combatant);
        }
    }

    public get isBoss()
    {
        return this.combatant.isBoss;
    }

    public static findTurnSpeedForElement(element: HTMLElement){
        if(element.classList.contains("slow")){
            return TurnSpeed.Slow;
        }
        else{
            return TurnSpeed.Fast;
        }
    }

    //#region CombatantTurnActions_PublicActionInterfaces
    public getCombatantTurnActions(turnSpeed: TurnSpeed){
        // console.log("useAction");
        if(this.isBoss && turnSpeed == TurnSpeed.Fast){
            return this.bossFastTurnActions;
        }
        else{
            return this.combatantTurnActions;
        }
    }

    public onCombatantTurnStart(turnSpeed: TurnSpeed){
        this.getCombatantTurnActions(turnSpeed).onTurnStart();
    }

    public async pullFlagInformation(){
        await this.combatantTurnActions.refreshActionsFromFlags();
        if(this.isBoss){
            await this.bossFastTurnActions.refreshActionsFromFlags();
        }
    }

    public resetAllCombatantTurnActions(){
        this.combatantTurnActions.onTurnStart();
        if(this.isBoss){
            this.bossFastTurnActions.onTurnStart();
        }
    }

    public updateDataWithCombatTurn(updateData: any){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!this.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }
        const updateOperation: Combatant.Database.UpdateOperation = {
            combatTurn: activeCombat.combat.turn as number,
            turnEvents: false,
            broadcast: true
        };
        this.combatant.update(updateData, updateOperation);
    }

    //#endregion

    protected static async initializeCombatantFlags(combatant: CosmereCombatant){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }

        if(combatant.isBoss){
            if(!(await combatant.getFlag(MODULE_ID, "flags_initialized_version") == game.modules?.get(MODULE_ID)?.version)){
                //console.log(`${MODULE_ID}: Boss flags not initialized`);
                await combatant.setFlag(MODULE_ID, "bossFastActionsAvailableGroups", [new ActionGroup(2, "base")]);
                await combatant.setFlag(MODULE_ID, "bossFastActionsUsed", []);
                await combatant.setFlag(MODULE_ID, "actionsAvailableGroups", [new ActionGroup(3, "base")]);
                await combatant.setFlag(MODULE_ID, "actionsUsed", []);
                await combatant.setFlag(MODULE_ID, "reactionsAvailable", [new ActionGroup(1, "base")]);
                await combatant.setFlag(MODULE_ID, "reactionsUsed", []);
                await combatant.setFlag(MODULE_ID, "flags_initialized_version", game.modules?.get(MODULE_ID)?.version!);
            }
        }
        else{
            if(!(await combatant.getFlag(MODULE_ID, "flags_initialized_version") == game.modules?.get(MODULE_ID)?.version)){
                //console.log(`${MODULE_ID}: Regular actor flags not initialized`);
                await combatant.setFlag(MODULE_ID, "actionsAvailableGroups", [new ActionGroup(3, "base")]);
                await combatant.setFlag(MODULE_ID, "actionsUsed", []);
                await combatant.setFlag(MODULE_ID, "reactionsAvailable", [new ActionGroup(1, "base")]);
                await combatant.setFlag(MODULE_ID, "reactionsUsed", []);
                await combatant.setFlag(MODULE_ID, "flags_initialized_version", game.modules?.get(MODULE_ID)?.version!);
            }
        }
    }
}

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
        this.setFlagAll();
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
        // Find all the action groups which are limited
        for (const actionGroup of this.context.actionsAvailableGroups){
            if(actionGroup.actionIsInGroup){
                if(actionGroup.actionIsInGroup(action)){
                    matchingLimitedActionGroups.push(actionGroup);
                }
            }
        }
        if(matchingLimitedActionGroups.length != 0){
            // TODO: Prompt the user to select a group instead of just selecting the 0th element
            return matchingLimitedActionGroups[0];
        }
        else{
            return this.context.actionsAvailableGroups[0];
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
        // Find all the action groups which are limited
        for (const actionGroup of this.context.reactionsAvailable){
            if(actionGroup.actionIsInGroup){
                if(actionGroup.actionIsInGroup(action)){
                    matchingLimitedActionGroups.push(actionGroup);
                }
            }
        }
        if(matchingLimitedActionGroups.length != 0){
            // TODO: Prompt the user to select a group instead of just selecting the 0th element
            return matchingLimitedActionGroups[0];
        }
        else{
            return this.context.reactionsAvailable[0];
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

/* --- CombatantTurnActions Hooks --- */

// If a combatant is updated with a new turnSpeed, update actionsOnTurn accordingly
Hooks.on("preUpdateCombatant", (
    combatant : CosmereCombatant,
    change : Combatant.UpdateData
) => {
    if(foundry.utils.hasProperty(change, `flags.cosmere-rpg.turnSpeed`)){
        activeCombat.getCombatantActionsByCombatantId(combatant?.id!)?.combatantTurnActions.onCombatantTurnSpeedChange(change.flags["cosmere-rpg"].turnSpeed!);
    }
    return true;
});

Hooks.on("combatTurnChange", async (
    combat: CosmereCombat,
    prior: Combat.HistoryData,
    current: Combat.HistoryData
) => {
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.turnStart){
        return;
    }
    let turns = combat.turns;
    let turnSpeed: TurnSpeed = turns[current.turn!].turnSpeed;
    let combatantActions = advancedCombatsMap[combat?.id!].getCombatantActionsByCombatantId(current?.combatantId!);

    await combatantActions?.getCombatantTurnActions(turnSpeed).onTurnStart();
});

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    //console.log(`${MODULE_ID}: Injecting combatant actions`);
    const combatantActions = activeCombat!.getCombatantActionsByCombatantId(combatant?.id!)!;
    if(! combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER))
    {
        return;
    }

    // console.log("Injecting actions for combatant:");
    // console.log(combatant)
    const actionsButtons = await combatantActions.combatantTurnActions.render({force:true});
    // console.log("Actions buttons: ");
    // console.log(actionsButtons);
    // console.log(combatantActions);
    if(combatantActions.isBoss){
        const bossFastActionsButtons = await combatantActions.bossFastTurnActions.render({force:true});
        combatantJQuery.each((index: number, element: HTMLElement) => {
            let turnSpeed = CombatantActions.findTurnSpeedForElement(element);
            if(turnSpeed == TurnSpeed.Fast){
                // console.log("Adding bossJQuery")
                $(element).find("h4.combatant-name").after(bossFastActionsButtons.element);
            }
            else{
               $(element).find("h4.combatant-name").after(actionsButtons.element)
            }
        });
        return;
    }

    combatantJQuery.find("h4.combatant-name").after(actionsButtons.element)

    //else
        //combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-arrows-to-eye").before(actionsButtons);
}

export async function injectAllCombatantActions(
    advancedCombat : AdvancedCosmereCombat,
    html : HTMLElement)
{
    //console.log(`${MODULE_ID}: Injecting all combatant actions`);
    for (const combatant of (advancedCombat.combat.combatants ?? [])) {
        const combatantJQuery = $(html).find(`[data-combatant-id=\"${combatant.id}\"]`);
        await injectCombatantActions(combatant, combatantJQuery);
    }
    return true;
}