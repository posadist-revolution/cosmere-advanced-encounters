import { CosmereCombatTracker, CosmereTrackerContext } from "@src/declarations/cosmere-rpg/applications/combat/combat_tracker";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { MODULE_ID } from "../constants";

const templatePath = 'modules/cosmere-advanced-encounters/templates/combat/combatant_actions.hbs'

class CombatantActions{
    declare actionsLeft: number
    declare actionsUsed: number[]
}

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    console.log(`Injecting actions buttons for combatant ${combatant.id}`);
    const combatantActions = new CombatantActions
    combatantActions.actionsUsed = combatant.getFlag(MODULE_ID, "actionsUsed");
    combatantActions.actionsLeft = combatant.getFlag(MODULE_ID, "actionsLeft");
    console.log(combatantActions);
    const actionsButtons = await foundry.applications.handlebars.renderTemplate(templatePath, combatantActions);
    console.log(`Template loaded, adding to jQuery`);
    console.log(`combatant jQuery:`);
    console.log(combatantJQuery);
    // if(game.user.isGM) // TODO: Issue with game always rendering as never. NO idea how to fix it right now.
    combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-eye-slash").before(actionsButtons);
    //else
        //combatantJQuery.find("button.inline-control.combatant-control.icon.fa-solid.fa-arrows-to-eye").before(actionsButtons);
}

export async function injectAllCombatantActions(
    tracker : CosmereCombatTracker,
    html : HTMLElement,
    context: CosmereTrackerContext)
{
    console.log("HTML: " + html);
    let combatantJQueryList = $(html).find("li.combatant.flexrow");
    console.log(`all combatants jQuery:`);
    console.log(combatantJQueryList);
    for (const combatant of (tracker.viewed?.combatants ?? [])) {
        console.log("Finding combatant with id %s", combatant.id);
        const combatantJQuery = $(html).find(`[data-combatant-id=\"${combatant.id}\"]`);
        await injectCombatantActions(combatant, combatantJQuery);
    }
    return true;
}