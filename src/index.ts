// Module imports
import { MODULE_ID } from '@module/constants';
// import { AdvancedCosmereCombat } from '@module/documents/advanced-cosmere-combat';
import { COSMERE_ADVANCED_ENCOUNTERS } from '@module/config';
import { preloadHandlebarsTemplates } from '@module/helpers/templates.mjs';
import { registerModuleSettings } from '@module/settings.js';
import { activateCombatantHooks } from '@module/hooks/combatant.js';
import { activateCombatHooks } from '@module/hooks/combat.js';
import { registerWelcomeMessage } from '@module/hooks/welcome';
import { AdvancedCosmereCombat } from '@module/documents/combat';
import { AdvancedCosmereCombatTracker } from '@module/applications/combat';
import { AdvancedCosmereCombatant } from '@module/documents/combatant';
import { initializeTestHooks } from '@module/tests';

declare global {
	interface LenientGlobalVariableTypes {
		game: never;
	}
    interface CONFIG {
        COSMERE: any;
        COSMERE_ADVANCED_ENCOUNTERS: typeof COSMERE_ADVANCED_ENCOUNTERS;
    }
    var useTestHooks: boolean;
}

Hooks.once('init', async function() {
    CONFIG.Combat.documentClass = AdvancedCosmereCombat as any;
    CONFIG.ui.combat = AdvancedCosmereCombatTracker;
    CONFIG.Combatant.documentClass = AdvancedCosmereCombatant as any;
    globalThis.useTestHooks = false;
    registerModuleSettings();
    registerWelcomeMessage();
    initializeTestHooks();
	// Preload Handlebars templates.
	return preloadHandlebarsTemplates();
});

Hooks.once('ready', async function() {
    if(game.combats){
        for(const combat of game.combats){
            combat.pullAllCombatantActionsFromFlags();
        }
    }
    activateCombatantHooks();
    activateCombatHooks();
});

Hooks.on("updateCombatant", async (
    combatant : AdvancedCosmereCombatant,
    change : Combatant.UpdateData,
    options : Combatant.Database.UpdateOptions,
    userId : string
) => {
    //If this update doesn't have flags pertaining to a combatant's action flags, don't do anything
    if(change.flags?.[MODULE_ID] == null){
        return;
    }
    await combatant.pullActionsFromFlags();
    // activeCombat.getCombatantActionsByCombatantId(combatant?.id!)?.pullFlagInformation();
});