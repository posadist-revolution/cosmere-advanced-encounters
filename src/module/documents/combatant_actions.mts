import { CosmereCombatTracker, CosmereTrackerContext } from "@src/declarations/cosmere-rpg/applications/combat/combat_tracker";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";

const templatePath = 'modules/cosmere-advanced-encounters/templates/combat/combatant_actions.hbs'

export async function injectCombatantActions(combatant : Combatant, combatantJQuery : JQuery)
{
    console.log(`Injecting actions buttons for combatant ${combatant.id}`);
    const actionsButtons = await foundry.applications.handlebars.renderTemplate(templatePath, null);
    console.log(`Template loaded, adding to jQuery`);
    console.log(`combatant jQuery:`);
    console.log(combatantJQuery);
    combatantJQuery.find("div.combatant-controls.flexrow").before(actionsButtons);
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