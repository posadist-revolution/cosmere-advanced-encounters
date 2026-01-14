import { CosmereCombatTracker, CosmereTrackerContext } from './declarations/cosmere-rpg/applications/combat/combat_tracker';
import { CosmereCombatant } from './declarations/cosmere-rpg/documents/combatant';
import { MODULE_ID } from './module/constants';
import { AdvancedCosmereCombat } from './module/documents/advanced-cosmere-combat';
import { injectAllCombatantActions } from './module/documents/combatant_actions.mjs'
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

Hooks.on('renderCombatTracker', async (
    tracker : CombatTracker,
    html : HTMLElement,
    trackerContext : CombatTracker.RenderContext,
    renderOptions : CombatTracker.RenderOptions
) => {
    if(tracker.viewed == null){
        return true
    }
    if(advancedCombatsMap[tracker.viewed.id] == null){
        advancedCombatsMap[tracker.viewed.id] = new AdvancedCosmereCombat(tracker.viewed);
    }
    for (const combatant of tracker.viewed.combatants){
        if(advancedCombatsMap[tracker.viewed.id].combatantActionsMap[combatant.id] == undefined){
            advancedCombatsMap[tracker.viewed.id].addNewCombatantToCombat(combatant);
        }
    }
    activeCombat = advancedCombatsMap[tracker.viewed.id];
    await injectAllCombatantActions(activeCombat, html);
    return true;
});

Hooks.on(
    "preCreateCombatant",
    (
        combatant: CosmereCombatant,
        data: Combatant.CreateData,
        options: Combatant.Database.PreCreateOptions,
        userId: string
    ) => {

    // Configure default combatant flags
    const flags = {
        [MODULE_ID]: {
            actionsUsed: [],
            actionsLeft: 3,
            reactionUsed: false,
        },
    };
    if ((combatant).isBoss){
        const boss_flags = {
            [MODULE_ID]: {
                bossFastActionsUsed: [],
                bossFastActionsLeft: 2
            }
        }
        mergeObject(flags, boss_flags);
    }
    mergeObject(flags, combatant.flags);
    combatant.updateSource({ flags });
});

Hooks.on("updateCombatant", async (
    combatant : CosmereCombatant,
    change : Combatant.UpdateData,
    options : Combatant.Database.UpdateOptions,
    userId : string
) => {
    if(change.flags?.['cosmere-advanced-encounters'] == null){
        return;
    }
    activeCombat.combatantActionsMap[combatant?.id!].pullFlagInformation();
});