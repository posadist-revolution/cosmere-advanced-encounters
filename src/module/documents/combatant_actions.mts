import { MODULE_ID } from "../constants";
import { AdvancedCosmereCombat } from "./advanced-cosmere-combat";
import { activeCombat } from "@src/index";
import { TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";

const templatePath = 'modules/cosmere-advanced-encounters/templates/combat/combatant_actions.hbs'
const bossFastTemplatePath = 'modules/cosmere-advanced-encounters/templates/combat/combatant_actions_boss_fast.hbs'

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
            this.name = "Manual Action"; //TODO: game.i18n!.localize(`cosmere-advanced-encounters.cost_manual`);
        }
    }
}

export class CombatantActions{

    readonly combatant: CosmereCombatant
    declare actionsOnTurn: number
    declare actionsUsed: UsedAction[]
    declare actionsLeft: number
    declare reactionUsed: boolean
    declare bossFastActionsOnTurn? : number
    declare bossFastActionsUsed : UsedAction[]
    declare bossFastActionsLeft: number

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
            this.actionsOnTurn = combatant.getFlag(MODULE_ID, "actionsOnTurn");
            this.actionsUsed = combatant.getFlag(MODULE_ID, "actionsUsed");
            this.reactionUsed = combatant.getFlag(MODULE_ID, "reactionUsed");
            this.bossFastActionsOnTurn = combatant.getFlag(MODULE_ID, "bossFastActionsOnTurn");
            this.bossFastActionsUsed = combatant.getFlag(MODULE_ID, "bossFastActionsUsed");
        }
        else
        {
            if(!combatant.getFlag(MODULE_ID, "flags_initialized")){
                combatant.setFlag(MODULE_ID, "actionsUsed", []);
                combatant.setFlag(MODULE_ID, "actionsOnTurn", combatant.turnSpeed);
                combatant.setFlag(MODULE_ID, "reactionUsed", false);
                combatant.setFlag(MODULE_ID, "flags_initialized", true);
            }
            this.actionsOnTurn = combatant.getFlag(MODULE_ID, "actionsOnTurn");
            this.actionsUsed = combatant.getFlag(MODULE_ID, "actionsUsed");
            this.reactionUsed = combatant.getFlag(MODULE_ID, "reactionUsed");
        }
        this.calculateActionsLeft();
    }

    protected get totalActionsUsedCost(){
        var actionsUsedCost = 0;
        for (const usedAction of this.actionsUsed)
        {
            actionsUsedCost += usedAction?.cost;
        }
        return actionsUsedCost;
    }

    protected get totalBossFastActionsUsedCost(){
        var actionsUsedCost = 0;
        for (const usedAction of this.bossFastActionsUsed)
        {
            actionsUsedCost += usedAction?.cost;
        }
        return actionsUsedCost;
    }

    protected calculateActionsLeft(){
        if(this.isBoss)
        {
            // Boss fast actions left is equal to either the bossFast actions on the turn minus the bossFast actions used,
            // or zero to not underflow.
            this.bossFastActionsLeft = (this.bossFastActionsOnTurn! - this.totalBossFastActionsUsedCost > 0) ?
                (this.bossFastActionsOnTurn! - this.totalBossFastActionsUsedCost) : 0;
        }
        // Actions left is equal to either the actions on the turn minus the actions used, or zero to not underflow.
        this.actionsLeft = (this.actionsOnTurn - this.totalActionsUsedCost > 0) ? (this.actionsOnTurn - this.totalActionsUsedCost) : 0;
    }

    protected isBossFastTurn(turnSpeed? : TurnSpeed)
    {
        return (this.isBoss && turnSpeed == TurnSpeed.Fast)
    }

    protected static async _onUseActionButton(
        event: JQuery.ClickEvent
    ){
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant actions and turn speed of what was clicked
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);
        console.log(`UsedAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);

        await combatantActions.useAction(new UsedAction(1), turnSpeed);
    }

    protected static async _onRestoreActionButton(
        event: JQuery.ClickEvent
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
        console.log(`RestoredAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);

        await combatantActions.removeAction(new UsedAction(Number(actionCost), String(actionName)), turnSpeed);
    }

    protected static async _onToggleReactionButton(
        event: JQuery.ClickEvent
    ){
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant actions
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        combatantActions.reactionUsed = !(combatantActions.reactionUsed);
        await combatantActions.propagateFlagInformation(false, true, false);
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
        console.log("useAction");
        if(this.combatant.isBoss && turnSpeed == TurnSpeed.Fast)
        {
            this.bossFastActionsUsed.push(action);
            this.calculateActionsLeft();
            await this.propagateFlagInformation(true, false, true);
            return;
        }
        this.actionsUsed.push(action);
        this.calculateActionsLeft();
        await this.propagateFlagInformation(true, false, true);
    }

    public async useReaction(){
        this.reactionUsed = true;
        await this.combatant.setFlag(MODULE_ID, "reactionUsed", this.reactionUsed);
    }

    public async removeAction(action: UsedAction, turnSpeed? : TurnSpeed){
        if(this.isBossFastTurn(turnSpeed))
        {
            let actionIndex = this.bossFastActionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
            this.bossFastActionsUsed.splice(actionIndex, 1);
            this.calculateActionsLeft();
            await this.propagateFlagInformation(true, false, false);
            return;
        }
        let actionIndex = this.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        this.actionsUsed.splice(actionIndex, 1);
        this.calculateActionsLeft();
        await this.propagateFlagInformation(true, false, false);
    }

    public onRender(combatantJQuery : JQuery){
        this.determineCombatantActionsCount();
        combatantJQuery.find("button.actions-left").on('click', async (event) => await CombatantActions._onUseActionButton(event));
        combatantJQuery.find("button.actions-used").on('click', async (event) => await CombatantActions._onRestoreActionButton(event));
        combatantJQuery.find("button.reaction-used").on('click', async (event) => await CombatantActions._onToggleReactionButton(event));
    }

    public startTurn(){

    }

    public async determineCombatantActionsCount(){
        if(this.isBoss)
        {
            this.actionsOnTurn = 3;
            this.bossFastActionsOnTurn = 2;
            this.calculateActionsLeft();
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
        this.calculateActionsLeft();
        await this.propagateFlagInformation(false, false, true);
    }

    protected async propagateFlagInformation(actionsUsed?: boolean, reaction?: boolean, actionsOnTurn?: boolean){
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
}

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    // console.log(`Injecting actions buttons for combatant ${combatant.id}`);
    const combatantActions = activeCombat!.combatantActionsMap[combatant.id!]!;
    if(! combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER))
    {
        return;
    }

    const actionsButtons = await foundry.applications.handlebars.renderTemplate(templatePath, combatantActions as any);
    // console.log(combatantActions);
    if(combatantActions.isBoss){
        const bossFastActionsButtons = await foundry.applications.handlebars.renderTemplate(bossFastTemplatePath, combatantActions as any);
        combatantJQuery.each((index: number, element: HTMLElement) => {
            let turnSpeed = CombatantActions.findTurnSpeedForElement(element);
            if(turnSpeed == TurnSpeed.Fast){
                // console.log("Adding bossJQuery")
                $(element).find("div.combatant-controls.flexrow").prepend(bossFastActionsButtons);
            }
            else{
               $(element).find("div.combatant-controls.flexrow").prepend(actionsButtons)
            }
        });
        combatantActions.onRender(combatantJQuery);
        return;
    }

    combatantJQuery.find("div.combatant-controls.flexrow").prepend(actionsButtons)

    combatantActions.onRender(combatantJQuery);
    //else
        //combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-arrows-to-eye").before(actionsButtons);
}

export async function injectAllCombatantActions(
    advancedCombat : AdvancedCosmereCombat,
    html : HTMLElement)
{
    for (const combatant of (advancedCombat.combat.combatants ?? [])) {
        const combatantJQuery = $(html).find(`[data-combatant-id=\"${combatant.id}\"]`);
        await injectCombatantActions(combatant, combatantJQuery);
    }
    return true;
}