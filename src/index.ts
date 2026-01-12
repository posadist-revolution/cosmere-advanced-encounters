
import { CosmereCombatTracker, CosmereTrackerContext } from './declarations/cosmere-rpg/applications/combat/combat_tracker';
import { injectCombatantActions, injectAllCombatantActions } from './module/documents/combatant_actions.mjs'

Hooks.once('init', async function() {

});

Hooks.once('ready', async function() {

});

Hooks.on('renderCombatTracker', async (tracker : CosmereCombatTracker, html : HTMLElement, trackerContext : CosmereTrackerContext) => {
    await injectAllCombatantActions(tracker, html, trackerContext);
    return true;
});