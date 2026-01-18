import { MODULE_ID } from "../constants";
import { AnyObject } from '@league-of-foundry-developers/foundry-vtt-types/utils';
import { AdvancedCosmereCombat } from "./advanced-cosmere-combat";
import { activeCombat } from "@src/index";
import { TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { TEMPLATES } from "../helpers/templates.mjs"
import { CosmereTurnContext } from "@src/declarations/cosmere-rpg/applications/combat/combat_tracker";

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

    constructor(combatant: CosmereCombatant) {
        this.combatant = combatant;
        //console.log(`${MODULE_ID}: New combatant- ID # ${combatant.id}`)
        if(!(this.combatant.getFlag(MODULE_ID, "flags_initialized_version") == game.modules?.get(MODULE_ID)?.version)){
            CombatantActions.initializeCombatantFlags(this.combatant);
        }
        this.combatantTurnActions = new CombatantTurnActions(this)
        if(this.isBoss){
            this.bossFastTurnActions = new CombatantTurnActions(this, true);
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

    public pullFlagInformation(){
        this.combatantTurnActions.refreshActionsFromFlags();
        if(this.isBoss){
            this.bossFastTurnActions.refreshActionsFromFlags();
        }
    }

    protected static async initializeCombatantFlags(combatant: CosmereCombatant){
        //console.log(`${MODULE_ID}: Initializing Combatant Flags`);

        // If the user doesn't have ownership permissions over the document, never set the values
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }

        if(combatant.isBoss){
            if(!(await combatant.getFlag(MODULE_ID, "flags_initialized_version") == game.modules?.get(MODULE_ID)?.version)){
                //console.log(`${MODULE_ID}: Boss flags not initialized`);
                await combatant.setFlag(MODULE_ID, "actionsUsed", []);
                await combatant.setFlag(MODULE_ID, "actionsOnTurn", 3);
                await combatant.setFlag(MODULE_ID, "reactionUsed", false);
                await combatant.setFlag(MODULE_ID, "bossFastActionsUsed", []);
                await combatant.setFlag(MODULE_ID, "bossFastActionsOnTurn", 2);
                await combatant.setFlag(MODULE_ID, "flags_initialized_version", game.modules?.get(MODULE_ID)?.version!);
            }
        }
        else{
            if(!(await combatant.getFlag(MODULE_ID, "flags_initialized_version"))){
                //console.log(`${MODULE_ID}: Regular actor flags not initialized`);
                await combatant.setFlag(MODULE_ID, "actionsUsed", []);
                await combatant.setFlag(MODULE_ID, "actionsOnTurn", CombatantTurnActions.getActionsOnTurnFromTurnSpeed(combatant.turnSpeed));
                await combatant.setFlag(MODULE_ID, "reactionUsed", false);
                await combatant.setFlag(MODULE_ID, "flags_initialized_version", game.modules?.get(MODULE_ID)?.version!);
            }
        }
        //console.log(`${MODULE_ID}: Initialized flags on combatant ${combatant.id}:`);
        //console.log(combatant);
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
            actionsOnTurn: 0,
            actionsUsed: [],
            actionsLeft: 0,
            reactionUsed: false,
        };
        this.refreshActionsFromFlags();
    }

    /* --- Public action interfaces ---*/
    //#region CombatantTurnActions_PublicActionInterfaces

    public async resetAllActions(){
        // Set actionsOnTurn
        this.context.actionsUsed = [];
        this.context.reactionUsed = false;
        this.setFlagAll();
        this.calculateActionsLeft();
    }

    public async setActionsOnTurn(){
        if(this.combatant.isBoss){
            if(this.isBossFastTurn){
                this.context.actionsOnTurn = 2;
            }
            else{
                this.context.actionsOnTurn = 3;
            }
        }
        else{
            if(this.combatant.turnSpeed == TurnSpeed.Fast){
                this.context.actionsOnTurn = 2;
            }
            else{
                this.context.actionsOnTurn = 3;
            }
        }
        this.setFlagActionsOnTurn();
    }

    public static getActionsOnTurnFromTurnSpeed(turnSpeed: TurnSpeed){
        if(turnSpeed == TurnSpeed.Fast){
            return 2;
        }
        else if(turnSpeed == TurnSpeed.Slow){
            return 3;
        }
        else{
            return 0;
        }
    }

    public async refreshActionsFromFlags(){
        await this.getFlagAll();
        this.calculateActionsLeft();
    }

    public async useAction(action : UsedAction){
        // console.log("useAction");
        this.context.actionsUsed.push(action);
        this.calculateActionsLeft();
        this.setFlagActionsUsed();
    }

    public async useReaction(){
        this.context.reactionUsed = true;
        this.setFlagReactionUsed();
    }

    public async removeAction(action: UsedAction){
        let actionIndex = this.context.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        this.context.actionsUsed.splice(actionIndex, 1);
        this.calculateActionsLeft();
        await this.setFlagActionsUsed();
    }

    public async onCombatantTurnSpeedChange(){
        //console.log(`${MODULE_ID}: Combatant ${this.combatant.id} changed turn speed`)
        this.getFlagActionsOnTurn();
        this.calculateActionsLeft();
    }
    //#endregion

    protected get totalActionsUsedCost(){
        var actionsUsedCost = 0;
        for (const usedAction of this.context.actionsUsed)
        {
            actionsUsedCost += usedAction?.cost;
        }
        return actionsUsedCost;
    }

    protected calculateActionsLeft(){
        // Actions left is equal to either the actions on the turn minus the actions used, or zero to not underflow.
        this.context.actionsLeft = (this.context.actionsOnTurn - this.totalActionsUsedCost > 0) ? (this.context.actionsOnTurn - this.totalActionsUsedCost) : 0;
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

        // Get the combatant actions and turn speed of what was clicked
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`UsedAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.useAction(new UsedAction(1));
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
        const actionName = btn.getAttribute("action-name");
        const actionCost = btn.getAttribute("action-cost");

        // Get the combatant actions
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;
        const turnSpeed = CombatantActions.findTurnSpeedForElement(li);

        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        // console.log(`RestoredAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatantTurnActions.removeAction(new UsedAction(Number(actionCost), String(actionName)));
    }

    protected static async _onToggleReactionButton(
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant actions
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;

        // By convention, always trust that CombatantTurnActions to be trusted for reaction data is the default CombatantTurnActions
        // Get the associated CombatTurnActions
        const combatantTurnActions = combatantActions.combatantTurnActions;

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatantActions.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        combatantTurnActions.context.reactionUsed = !(combatantTurnActions.context.reactionUsed);

        void await combatantTurnActions.setFlagReactionUsed();
    }
    //#endregion

    /* --- Flag Operations --- */
    //#region CombatantTurnActions_FlagOperations
    //#region CombatantTurnActions_SetFlag

    protected async setFlagAll(){
        this.setFlagActionsOnTurn();
        this.setFlagActionsUsed();
        this.setFlagReactionUsed();
    }

    protected async setFlagActionsOnTurn(){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!this.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }
        if(this.isBossFastTurn){
            await this.combatant.setFlag(MODULE_ID, "bossFastActionsOnTurn", this.context.actionsOnTurn);
        }
        else{
            await this.combatant.setFlag(MODULE_ID, "actionsOnTurn", this.context.actionsOnTurn);
        }
    }

    protected async setFlagActionsUsed(){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!this.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }
        if(this.isBossFastTurn){
            await this.combatant.setFlag(MODULE_ID, "bossFastActionsUsed", this.context.actionsUsed);
        }
        else{
            await this.combatant.setFlag(MODULE_ID, "actionsUsed", this.context.actionsUsed);
        }
    }

    protected async setFlagReactionUsed(){
        // If the user doesn't have ownership permissions over the document, never set the values
        if(!this.combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
            return;
        }
        await this.combatant.setFlag(MODULE_ID, "reactionUsed", this.context.reactionUsed);
    }
    //#endregion
    //#region CombatantTurnActions_GetFlag

    protected async getFlagAll(){
        this.getFlagActionsOnTurn();
        this.getFlagActionsUsed();
        this.getFlagReactionUsed();
    }

    protected async getFlagActionsOnTurn(){
        if(this.isBossFastTurn){
            this.context.actionsOnTurn = this.combatant.getFlag(MODULE_ID, "bossFastActionsOnTurn");
        }
        else{
            this.context.actionsOnTurn = this.combatant.getFlag(MODULE_ID, "actionsOnTurn");
        }
    }

    protected async getFlagActionsUsed(){
        if(this.isBossFastTurn){
            this.context.actionsUsed = this.combatant.getFlag(MODULE_ID, "bossFastActionsUsed");
        }
        else{
            this.context.actionsUsed = this.combatant.getFlag(MODULE_ID, "actionsUsed");
        }
    }

    protected async getFlagReactionUsed(){
        this.context.reactionUsed = this.combatant.getFlag(MODULE_ID, "reactionUsed");
    }
    //#endregion
    //#endregion
}

/* --- CombatantTurnActions Hooks --- */

Hooks.on("preUpdateCombatant", (
    combatant : CosmereCombatant,
    change : Combatant.UpdateData
) => {
    if(foundry.utils.hasProperty(change, `flags.cosmere-rpg.turnSpeed`)){
        let actionsOnTurn = CombatantTurnActions.getActionsOnTurnFromTurnSpeed(change.flags["cosmere-rpg"].turnSpeed as TurnSpeed);
        foundry.utils.setProperty(
                change,
                `flags.${MODULE_ID}.actionsOnTurn`,
                actionsOnTurn,
            )
        activeCombat.combatantActionsMap[combatant?.id!].combatantTurnActions.onCombatantTurnSpeedChange();
    }
    return true;
});

Hooks.on("updateCombatant", async (
    combatant : CosmereCombatant,
    change : Combatant.UpdateData,
    options : Combatant.Database.UpdateOptions,
    userId : string
) => {
    if(foundry.utils.hasProperty(change, `flags.cosmere-rpg.turnSpeed`)){
        activeCombat.combatantActionsMap[combatant?.id!].combatantTurnActions.onCombatantTurnSpeedChange();
    }
});

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    //console.log(`${MODULE_ID}: Injecting combatant actions`);
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