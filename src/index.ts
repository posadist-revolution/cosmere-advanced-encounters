import { CosmereCombatTracker, CosmereTrackerContext } from './declarations/cosmere-rpg/applications/combat/combat_tracker';
import { CosmereCombatant } from './declarations/cosmere-rpg/documents/combatant';
import { MODULE_ID } from './module/constants';
import { AdvancedCosmereCombat } from './module/documents/advanced-cosmere-combat';
import { injectAllCombatantActions } from './module/documents/combatant-actions.js'
import { COSMERE_ADVANCED_ENCOUNTERS } from './module/helpers/config.mjs';
import { preloadHandlebarsTemplates } from './module/helpers/templates.mjs';
import { registerModuleSettings } from './module/settings.js';
import { activateCombatantHooks } from './module/hooks/combatant.js';

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
    registerModuleSettings();
	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once('ready', async function() {
    activateCombatantHooks();
});

Hooks.on('renderCombatTracker', async (
    tracker : CombatTracker,
    html : HTMLElement,
    trackerContext : CombatTracker.RenderContext,
    renderOptions : CombatTracker.RenderOptions
) => {
    if(tracker.viewed == null){
        return true
    }
    //console.log(`${MODULE_ID}: Rendering combat tracker`);
    if(advancedCombatsMap[tracker.viewed.id] == null){
        //console.log(`${MODULE_ID}: Making new AdvancedCombat`);
        advancedCombatsMap[tracker.viewed.id] = new AdvancedCosmereCombat(tracker.viewed);
    }
    for (const combatant of tracker.viewed.combatants){
        if(advancedCombatsMap[tracker.viewed.id].getCombatantActionsByCombatantId(combatant.id) == undefined){
            //console.log(`${MODULE_ID}: Adding new combatant`);
            advancedCombatsMap[tracker.viewed.id].addNewCombatantToCombat(combatant);
        }
    }
    activeCombat = advancedCombatsMap[tracker.viewed.id];
    await injectAllCombatantActions(activeCombat, html);
    return true;
});

Hooks.on("updateCombatant", async (
    combatant : CosmereCombatant,
    change : Combatant.UpdateData,
    options : Combatant.Database.UpdateOptions,
    userId : string
) => {
    //If this update doesn't have flags pertaining to a combatant's action flags, don't do anything
    if(change.flags?.[MODULE_ID] == null){
        return;
    }
    activeCombat.getCombatantActionsByCombatantId(combatant?.id!)?.pullFlagInformation();
});