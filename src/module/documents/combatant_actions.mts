import { MODULE_ID } from "../constants";
import { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import { AdvancedCosmereCombat } from "./advanced-cosmere-combat";
import { activeCombat } from "@src/index";
import { TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { TEMPLATES } from "../helpers/templates.mjs"

export class UsedAction{
    declare cost: number
    declare name: string
    constructor(cost : number, name? : string){
        this.cost = cost;
        if(name !== undefined)
        {
            this.name = name;
        }
        else
        {
            this.name = game.i18n!.localize(`cosmere-advanced-encounters.cost_manual`);
        }
    }
}

export class CombatantActions{

    readonly combatant: CosmereCombatant;
    declare combatantTurnActions: CombatantTurnActions;
    declare bossFastTurnActions: CombatantTurnActions;
    declare actionsOnTurn: number;
    declare actionsUsed: UsedAction[];
    declare actionsLeft: number;
    declare reactionUsed: boolean;
    declare bossFastActionsOnTurn? : number;
    declare bossFastActionsUsed : UsedAction[];
    declare bossFastActionsLeft: number;

    constructor(combatant: CosmereCombatant) {
        this.combatant = combatant;
        if(combatant.isBoss)
        {
            if(!combatant.getFlag(MODULE_ID, "flags_initialized")){
                combatant.setFlag(MODULE_ID, "actionsUsed", []);
                combatant.setFlag(MODULE_ID, "actionsOnTurn", 3);
                combatant.setFlag(MODULE_ID, "reactionUsed", false);
                combatant.setFlag(MODULE_ID, "bossFastActionsUsed", []);
                combatant.setFlag(MODULE_ID, "bossFastActionsOnTurn", 2);
                combatant.setFlag(MODULE_ID, "flags_initialized", true);
            }
            this.bossFastActionsOnTurn = combatant.getFlag(MODULE_ID, "bossFastActionsOnTurn");
            this.bossFastActionsUsed = combatant.getFlag(MODULE_ID, "bossFastActionsUsed");
            this.bossFastTurnActions = new CombatantTurnActions(this, true);
        }
        else
        {
            if(!combatant.getFlag(MODULE_ID, "flags_initialized")){
                combatant.setFlag(MODULE_ID, "actionsUsed", []);
                combatant.setFlag(MODULE_ID, "actionsOnTurn", combatant.turnSpeed);
                combatant.setFlag(MODULE_ID, "reactionUsed", false);
                combatant.setFlag(MODULE_ID, "flags_initialized", true);
            }
        }
        this.actionsOnTurn = combatant.getFlag(MODULE_ID, "actionsOnTurn");
        this.actionsUsed = combatant.getFlag(MODULE_ID, "actionsUsed");
        this.reactionUsed = combatant.getFlag(MODULE_ID, "reactionUsed");
        this.combatantTurnActions = new CombatantTurnActions(this);
        this.refreshCombatantTurnActions();
    }

    protected refreshCombatantTurnActions(){
        if(this.isBoss){
            this.bossFastTurnActions.pullActions();
        }
        this.combatantTurnActions.pullActions();
    }

    public static findTurnSpeedForElement(element: HTMLElement){
        if(element.classList.contains("slow")){
            return TurnSpeed.Slow;
        }
        else{
            return TurnSpeed.Fast;
        }
    }

    public get isBoss()
    {
        return this.combatant.isBoss;
    }

    public async useAction(action : UsedAction, turnSpeed? : TurnSpeed){
        // console.log("useAction");
        if(this.combatant.isBoss && turnSpeed == TurnSpeed.Fast)
        {
            this.bossFastActionsUsed.push(action);
            this.refreshCombatantTurnActions();
            await this.propagateFlagInformation(true, false, true);
            return;
        }
        this.actionsUsed.push(action);
        this.refreshCombatantTurnActions();
        await this.propagateFlagInformation(true, false, true);
    }

    public async useReaction(){
        this.reactionUsed = true;
        this.refreshCombatantTurnActions();
        await this.combatant.setFlag(MODULE_ID, "reactionUsed", this.reactionUsed);
    }

    public async removeAction(action: UsedAction, turnSpeed? : TurnSpeed){
        if(this.isBoss && turnSpeed == TurnSpeed.Fast)
        {
            let actionIndex = this.bossFastActionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
            this.bossFastActionsUsed.splice(actionIndex, 1);
            this.refreshCombatantTurnActions();
            await this.propagateFlagInformation(true, false, false);
            return;
        }
        let actionIndex = this.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        this.actionsUsed.splice(actionIndex, 1);
        this.refreshCombatantTurnActions();
        await this.propagateFlagInformation(true, false, false);
    }

    public onRender(combatantJQuery : JQuery){
        this.determineCombatantActionsCount();
    }

    public startTurn(){

    }

    public async determineCombatantActionsCount(){
        if(this.isBoss)
        {
            this.actionsOnTurn = 3;
            this.bossFastActionsOnTurn = 2;
            this.refreshCombatantTurnActions();
            await this.propagateFlagInformation(false, false, true);
            return;
        }

        if(this.combatant.turnSpeed == TurnSpeed.Slow)
        {
            this.actionsOnTurn = 3;
        }
        else
        {
            this.actionsOnTurn = 2;
        }
        this.refreshCombatantTurnActions();
        await this.propagateFlagInformation(false, false, true);
    }

    public async propagateFlagInformation(actionsUsed?: boolean, reaction?: boolean, actionsOnTurn?: boolean){
        if(this.isBoss)
        {
            if(actionsUsed){
                await this.combatant.setFlag(MODULE_ID, "bossFastActionsUsed", this.bossFastActionsUsed);
            }
            if(actionsOnTurn){
                await this.combatant.setFlag(MODULE_ID, "bossFastActionsOnTurn", this.bossFastActionsOnTurn!);
            }
        }
        if(actionsUsed){
            await this.combatant.setFlag(MODULE_ID, "actionsUsed", this.actionsUsed);
        }
        if(reaction){
            await this.combatant.setFlag(MODULE_ID, "reactionUsed", this.reactionUsed);
        }
        if(actionsOnTurn){
            await this.combatant.setFlag(MODULE_ID, "actionsOnTurn", this.actionsOnTurn);
        }
    }

    public async pullFlagInformation(){
        this.actionsOnTurn = this.combatant.getFlag(MODULE_ID, "actionsOnTurn");
        this.actionsUsed = this.combatant.getFlag(MODULE_ID, "actionsUsed");
        this.reactionUsed = this.combatant.getFlag(MODULE_ID, "reactionUsed");
        if(this.isBoss){
            this.bossFastActionsOnTurn = this.combatant.getFlag(MODULE_ID, "bossFastActionsOnTurn");
            this.bossFastActionsUsed = this.combatant.getFlag(MODULE_ID, "bossFastActionsUsed");
        }
        this.refreshCombatantTurnActions();
    }
}

interface CombatTurnActionsContext{
    actionsOnTurn: number;
    actionsUsed: UsedAction[];
    actionsLeft: number;
    reactionUsed: boolean;
}

export class CombatantTurnActions extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2<AnyObject>,
){
    static DEFAULT_OPTIONS = {
        actions: {
            useAction: this._onUseActionButton,
            restoreAction: this._onRestoreActionButton,
            toggleReaction: this._onToggleReactionButton,
        },
        window: {
            frame: false
        }
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
    readonly isBossFastTurn: boolean;
    declare context: CombatTurnActionsContext;

    constructor(combatantActions: CombatantActions, bossFastTurn = false) {
        super();
        this.combatantActions = combatantActions;
        this.combatant = combatantActions.combatant;
        this.isBossFastTurn = bossFastTurn;
        this.context = {
            actionsOnTurn: 0,
            actionsUsed: [],
            actionsLeft: 0,
            reactionUsed: false,
        };
        this.pullActions();
    }

    protected get totalActionsUsedCost(){
        var actionsUsedCost = 0;
        for (const usedAction of this.context.actionsUsed)
        {
            actionsUsedCost += usedAction?.cost;
        }
        return actionsUsedCost;
    }

    public pullActions(){
        if(this.isBossFastTurn){
            // this.context.actionsOnTurn = this.combatant.getFlag(MODULE_ID, "bossFastActionsOnTurn");
            // this.context.actionsUsed = this.combatant.getFlag(MODULE_ID, "bossFastActionsUsed");
            this.context.actionsOnTurn = this.combatantActions.bossFastActionsOnTurn!;
            this.context.actionsUsed = this.combatantActions.bossFastActionsUsed;
        }
        else{
            this.context.actionsOnTurn = this.combatantActions.actionsOnTurn;
            this.context.actionsUsed = this.combatantActions.actionsUsed;
        }
        this.context.reactionUsed = this.combatantActions.reactionUsed;
        // Actions left is equal to either the actions on the turn minus the actions used, or zero to not underflow.
        this.context.actionsLeft = (this.context.actionsOnTurn - this.totalActionsUsedCost > 0) ? (this.context.actionsOnTurn - this.totalActionsUsedCost) : 0;
    }

    protected async _prepareContext(options: any){
        return this.context as any;
    }

    protected static async _onUseActionButton(
        event: Event
    ){
        console.log("Use action button firing");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant actions and turn speed of what was clicked
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);
        // console.log(`UsedAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantActions.useAction(new UsedAction(1), turnSpeed);
    }

    protected static async _onRestoreActionButton(
        event: Event
    ){
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name");
        const actionCost = btn.getAttribute("action-cost");
        // Get the combatant actions
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);
        // console.log(`RestoredAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantActions.removeAction(new UsedAction(Number(actionCost), String(actionName)), turnSpeed);
    }

    protected static async _onToggleReactionButton(
        event: Event
    ){
        console.log("Toggled reactions");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant actions
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        combatantActions.reactionUsed = !(combatantActions.reactionUsed);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantActions.propagateFlagInformation(false, true, false);
    }
}

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    const combatantActions = activeCombat!.combatantActionsMap[combatant.id!]!;
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
                $(element).find("div.combatant-controls.flexrow").prepend(bossFastActionsButtons.element);
            }
            else{
               $(element).find("div.combatant-controls.flexrow").prepend(actionsButtons.element)
            }
        });
        combatantActions.onRender(combatantJQuery);
        return;
    }

    combatantJQuery.find("div.combatant-controls.flexrow").prepend(actionsButtons.element)

    //else
        //combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-arrows-to-eye").before(actionsButtons);
}

export async function injectAllCombatantActions(
    advancedCombat : AdvancedCosmereCombat,
    html : HTMLElement)
{
    console.log("Injecting all combatant actions");
    for (const combatant of (advancedCombat.combat.combatants ?? [])) {
        const combatantJQuery = $(html).find(`[data-combatant-id=\"${combatant.id}\"]`);
        await injectCombatantActions(combatant, combatantJQuery);
    }
    return true;
}