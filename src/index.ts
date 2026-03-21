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
import { QueuedMoveData } from './module/helpers/movement';

declare global {
	interface LenientGlobalVariableTypes {
		game: never;
	}
    interface CONFIG {
        COSMERE: any;
        COSMERE_ADVANCED_ENCOUNTERS: typeof COSMERE_ADVANCED_ENCOUNTERS;
    }
    var useTestHooks: boolean;
    var queuedMoveData: QueuedMoveData | undefined;
}

Hooks.once('init', async function() {
    CONFIG.Combat.documentClass = AdvancedCosmereCombat as any;
    CONFIG.ui.combat = AdvancedCosmereCombatTracker;
    CONFIG.Combatant.documentClass = AdvancedCosmereCombatant as any;
    globalThis.useTestHooks = false;
    globalThis.queuedMoveData = undefined;
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
    if((!change.flags) || change.flags[MODULE_ID] == null){
        return;
    }
    await combatant.pullActionsFromFlags();

    // If we're updating the remaining movement of this combatant, and that combatant has move data queued up, activate the queued movement
    if(change.flags[MODULE_ID].remainingMovementFromLastAction && globalThis.queuedMoveData && combatant.id == globalThis.queuedMoveData.combatantId){
        let movementData = foundry.utils.deepClone(globalThis.queuedMoveData.moveData);
        console.log("Attempting queued move:");
        console.log(movementData);
        globalThis.queuedMoveData = undefined; // We're handling the queued move now, so reset it to undefined
        let moveOptions: TokenDocument.MoveOptions = {
                method: movementData.method,
                autoRotate: movementData.autoRotate,
                showRuler: movementData.showRuler,
                constrainOptions: movementData.constrainOptions,
                ...movementData.updateOptions
        }
        await combatant.token?.move(movementData.passed.waypoints, moveOptions);
    }
});