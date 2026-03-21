import { Quench } from "@ethaks/fvtt-quench";
import { registerSetupTestBatch } from "./setup";
import { registerCombatantActionsTestBatch } from "./combatant-actions";
import { registerTurnsAndOrderTestBatch } from "./turns-and-order";
import { registerBossTurnsTestBatch } from "./boss-turns";
import { registerUseItemTestBatch } from "./items-from-chat";
import { registerMovementTestBatch } from "./movement";


/* TODO: Add tests for:
 *
 *
 * Actions from chat:
 * Setting enabled
 * Setting disabled
 * One action
 * Two action
 * Three action
 * Reaction
 * Free action
 * Special action
 *
 * Condtions:
 * Surprised
 * Stunned
 * Disoriented
 *
 *
 *
 *
 * Boss Turns:
 * Use an action off of a boss's turn for fast, slow, offturn, validate actions used correctly
 *
 *
 *
 *
 *
 * Movement:
 *
 *
 *
 */
export function registerInternalTestBatches(quench: Quench){
    registerSetupTestBatch(quench);
    registerMovementTestBatch(quench);
    registerCombatantActionsTestBatch(quench);
    registerTurnsAndOrderTestBatch(quench);
    registerBossTurnsTestBatch(quench);
    registerUseItemTestBatch(quench);

}