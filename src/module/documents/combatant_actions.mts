import { CosmereCombatTracker, CosmereTrackerContext } from "@src/declarations/cosmere-rpg/applications/combat/combat_tracker";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { MODULE_ID } from "../constants";
import { AdvancedCosmereCombat } from "./advanced-cosmere-combat";
import { activeCombat } from "@src/index";

const templatePath = 'modules/cosmere-advanced-encounters/templates/combat/combatant_actions.hbs'

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

    readonly combatant: Combatant
    declare actionsLeft: number
    declare actionsUsed: UsedAction[]
    declare reactionUsed: boolean
    declare bossFastActionsLeft? : number
    declare bossFastActionsUsed? : UsedAction[]

    constructor(combatant: Combatant) {
        this.combatant = combatant;
        if(!combatant.getFlag(MODULE_ID, "flags_initialized")){
            combatant.setFlag(MODULE_ID, "actionsUsed", []);
            combatant.setFlag(MODULE_ID, "actionsLeft", 3);
            combatant.setFlag(MODULE_ID, "reactionUsed", false);
        }
        this.actionsLeft = combatant.getFlag(MODULE_ID, "actionsLeft");
        this.actionsUsed = combatant.getFlag(MODULE_ID, "actionsUsed");
        this.reactionUsed = combatant.getFlag(MODULE_ID, "reactionUsed");
    }

    protected static async _onUseActionButton(
        event: JQuery.ClickEvent
    ){
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant actions
        const combatantActions = activeCombat!.combatantActionsMap[li.dataset.combatantId!]!;

        await combatantActions.useAction(new UsedAction(1));

        console.log(`UsedAction on combatant ${li.dataset.combatantId}`);
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
        await combatantActions.removeAction(new UsedAction(Number(actionCost), String(actionName)));

        console.log(`RestoredAction on combatant ${li.dataset.combatantId}`);
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
        await combatantActions.combatant.setFlag(MODULE_ID, "reactionUsed", combatantActions.reactionUsed);
    }

    public async useAction(action : UsedAction){
        this.actionsUsed.push(action)
        this.actionsLeft = (this.actionsLeft - action.cost > 0) ? (this.actionsLeft - action.cost) : 0;
        await this.combatant.setFlag(MODULE_ID, "actionsUsed", this.actionsUsed);
        await this.combatant.setFlag(MODULE_ID, "actionsLeft", this.actionsLeft);
    }

    public async useReaction(){
        this.reactionUsed = true;
        await this.combatant.setFlag(MODULE_ID, "reactionUsed", this.reactionUsed);
    }

    public async removeAction(action: UsedAction){
        let actionIndex = this.actionsUsed.findIndex((element) => (element.cost == action.cost && element.name == action.name));
        this.actionsUsed.splice(actionIndex, 1);
        this.actionsLeft += action.cost;
        await this.combatant.setFlag(MODULE_ID, "actionsUsed", this.actionsUsed);
        await this.combatant.setFlag(MODULE_ID, "actionsLeft", this.actionsLeft);
    }

    public onRender(combatantJQuery : JQuery){
        combatantJQuery.find("button.actions-left").on('click', async (event) => await CombatantActions._onUseActionButton(event));
        combatantJQuery.find("button.actions-used").on('click', async (event) => await CombatantActions._onRestoreActionButton(event));
        combatantJQuery.find("button.reaction-used").on('click', async (event) => await CombatantActions._onToggleReactionButton(event));
    }
}

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    console.log(`Injecting actions buttons for combatant ${combatant.id}`);
    const combatantActions = activeCombat!.combatantActionsMap[combatant.id!]!;
    // console.log(combatantActions);
    const actionsButtons = await foundry.applications.handlebars.renderTemplate(templatePath, combatantActions);
    // console.log(`Template loaded, adding to jQuery`);
    // console.log(`combatant jQuery:`);
    // console.log(combatantJQuery);
    // if(game.user.isGM) // TODO: Issue with game always rendering as never. NO idea how to fix it right now.
    combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-eye-slash").before(actionsButtons)
    combatantActions.onRender(combatantJQuery);
    //else
        //combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-arrows-to-eye").before(actionsButtons);
}

export async function injectAllCombatantActions(
    advancedCombat : AdvancedCosmereCombat,
    html : HTMLElement,
    context: CosmereTrackerContext)
{
    // console.log("HTML: " + html);
    let combatantJQueryList = $(html).find("li.combatant.flexrow");
    // console.log(`all combatants jQuery:`);
    // console.log(combatantJQueryList);
    for (const combatant of (advancedCombat.combat.combatants ?? [])) {
        // console.log("Finding combatant with id %s", combatant.id);
        const combatantJQuery = $(html).find(`[data-combatant-id=\"${combatant.id}\"]`);
        await injectCombatantActions(combatant, combatantJQuery);
    }
    return true;
}