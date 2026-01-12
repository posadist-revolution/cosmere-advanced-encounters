import { CosmereCombatTracker, CosmereTrackerContext } from './declarations/cosmere-rpg/applications/combat/combat_tracker';
import { MODULE_ID } from './module/constants';
import { injectCombatantActions, injectAllCombatantActions } from './module/documents/combatant_actions.mjs'
import { COSMERE_ADVANCED_ENCOUNTERS } from './module/helpers/config.mjs';
import { preloadHandlebarsTemplates } from './module/helpers/templates.mjs';

declare global {
	interface LenientGlobalVariableTypes {
		game: never;
	}
    interface CONFIG {
        COSMERE: any;
        COSMERE_ADVANCED_ENCOUNTERS: typeof COSMERE_ADVANCED_ENCOUNTERS;
    }
}

Hooks.once('init', async function() {
	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once('ready', async function() {

});

Hooks.on('renderCombatTracker', async (tracker : CosmereCombatTracker, html : HTMLElement, trackerContext : CosmereTrackerContext) => {
    await injectAllCombatantActions(tracker, html, trackerContext);
    return true;
});

Hooks.on("preCreateCombatant", async function(combatant: Combatant) {

    // Configure default combatant flags
    const flags = {
        [MODULE_ID]: {
            actionsUsed: [1],
            actionsLeft: 2,
        },
    };
    mergeObject(flags, combatant.flags);
    combatant.updateSource({ flags });
});