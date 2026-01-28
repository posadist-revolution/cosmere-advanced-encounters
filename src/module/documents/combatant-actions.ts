import { MODULE_ID } from "../constants";
import { AdvancedCosmereCombat } from "./advanced-cosmere-combat";
import { activeCombat, advancedCombatsMap } from "@src/index";
import { TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "../settings";
import { CosmereCombat } from "@src/declarations/cosmere-rpg/documents/combat";
import { migrateFlags } from "../helpers/flag-migration-helper";
import { CombatantTurnActions } from "./combatant-turn-actions";
import { ActionGroup } from "./used-action";

export class CombatantActions{

    readonly combatant: CosmereCombatant;
    declare combatantTurnActions: CombatantTurnActions;
    declare bossFastTurnActions: CombatantTurnActions;
    declare combatantTurnActionsPopout?: CombatantTurnActions;
    declare bossFastTurnActionsPopout?: CombatantTurnActions;

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

    public async createPopoutTurns(){
        this.combatantTurnActionsPopout = new CombatantTurnActions(this)
        if(this.isBoss){
            this.bossFastTurnActionsPopout = new CombatantTurnActions(this, true);
        }
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

// If a combatant is activated using the "Activate" button, set the current turn to that combatant
Hooks.on("preUpdateCombatant", (
    combatant : CosmereCombatant,
    change : Combatant.UpdateData
) => {
    if(!getModuleSetting(SETTINGS.ACTIVATE_SETS_TURN)){
        return;
    }
    if(foundry.utils.hasProperty(change, `flags.cosmere-rpg.activated`) && change.flags["cosmere-rpg"].activated){
        // Regular turn has activated
        activeCombat.setCurrentTurnFromCombatant(combatant.id!, false);
    }
    else if(foundry.utils.hasProperty(change, `flags.cosmere-rpg.bossFastActivated`) && change.flags["cosmere-rpg"].bossFastActivated){
        // Boss fast turn has activated
        activeCombat.setCurrentTurnFromCombatant(combatant.id!, true);
    }
});

Hooks.on("combatTurnChange", async (
    combat: CosmereCombat,
    prior: Combat.HistoryData,
    current: Combat.HistoryData
) => {
    if(current.round != prior.round){
        // This is a round start turn change, we shouldn't refresh the combatant's actions because the turn order might change
        return;
    }
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.turnStart){
        return;
    }
    let turns = combat.turns;
    let turnSpeed: TurnSpeed = turns[current.turn!].turnSpeed;
    let combatantActions = advancedCombatsMap[combat?.id!].getCombatantActionsByCombatantId(current?.combatantId!);

    await combatantActions?.getCombatantTurnActions(turnSpeed).onTurnStart();
});

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery, isPopoutWindow?: boolean)
{
    // console.log(`${MODULE_ID}: Injecting combatant actions`);
    const combatantActions = activeCombat!.getCombatantActionsByCombatantId(combatant?.id!)!;
    if(! combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER))
    {
        return;
    }

    // console.log("Injecting actions for combatant:");
    // console.log(combatant)
    var actionsButtons: CombatantTurnActions;
    if(isPopoutWindow){
        await combatantActions.createPopoutTurns();
        actionsButtons = await combatantActions.combatantTurnActionsPopout!.render({force:true});
    }
    else{
        actionsButtons = await combatantActions.combatantTurnActions.render({force:true});
    }
    // console.log("Actions buttons: ");
    // console.log(actionsButtons);
    // console.log(combatantActions);
    if(combatantActions.isBoss){
        var bossFastActionsButtons: CombatantTurnActions;
        if(isPopoutWindow){
            bossFastActionsButtons = await combatantActions.bossFastTurnActionsPopout!.render({force:true});
        }
        else{
            bossFastActionsButtons = await combatantActions.bossFastTurnActions.render({force:true});
        }
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
    // console.log("Finding location to add the actionsButtons");
    combatantJQuery.find("h4.combatant-name").after(actionsButtons.element)
    // console.log("Done finding location");

    //else
        //combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-arrows-to-eye").before(actionsButtons);

    if(getModuleSetting(SETTINGS.ACTIVATE_SETS_TURN)){
        // Update the tooltip text for the activate combatant button
        combatantJQuery.find('[data-action="activateCombatant"]').attr('data-tooltip', `${MODULE_ID}.activate_combatant`);
    }
}

export async function injectAllCombatantActions(
    advancedCombat : AdvancedCosmereCombat,
    html : HTMLElement,
    isPopoutWindow?: boolean)
{
    // console.log(`${MODULE_ID}: Injecting all combatant actions with popout = ${isPopoutWindow}`);
    for (const combatant of (advancedCombat.combat.combatants ?? [])) {
        // console.log(`${MODULE_ID}: Looking for combatant with: [data-combatant-id=\"${combatant.id}\"]`);
        const combatantJQuery = $(html).find(`[data-combatant-id=\"${combatant.id}\"]`);
        // console.log(`${MODULE_ID}: Found the following jQuery`);
        // console.log(combatantJQuery);
        await injectCombatantActions(combatant, combatantJQuery, isPopoutWindow);
    }
    return true;
}