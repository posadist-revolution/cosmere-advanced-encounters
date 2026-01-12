import { CosmereCombatTracker, CosmereTrackerContext } from './declarations/cosmere-rpg/applications/combat/combat_tracker';
import { CosmereCombat } from './declarations/cosmere-rpg/documents/combat';
import { MODULE_ID } from './module/constants';
import { AdvancedCosmereCombat } from './module/documents/advanced-cosmere-combat';
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

export var activeCombat: AdvancedCosmereCombat;

export interface Dictionary<T> {
    [key: string]: T;
}

export var advancedCombatsMap: Dictionary<AdvancedCosmereCombat> = {};

Hooks.once('init', async function() {
	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once('ready', async function() {

});

Hooks.on('renderCombatTracker', async (tracker : CosmereCombatTracker, html : HTMLElement, trackerContext : CosmereTrackerContext) => {
    if(advancedCombatsMap[tracker.viewed.id] == null){
        advancedCombatsMap[tracker.viewed.id] = new AdvancedCosmereCombat(tracker.viewed);
    }
    activeCombat = advancedCombatsMap[tracker.viewed.id];
    await injectAllCombatantActions(activeCombat, html, trackerContext);
    return true;
});

Hooks.on("preCreateCombatant", async function(combatant: Combatant) {

    // Configure default combatant flags
    const flags = {
        [MODULE_ID]: {
            actionsUsed: [],
            actionsLeft: 3,
            reactionUsed: false,
        },
    };
    mergeObject(flags, combatant.flags);
    combatant.updateSource({ flags });
});