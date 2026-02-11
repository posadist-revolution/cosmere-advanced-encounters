import { CosmereCombatant } from './combatant';
export declare class CosmereCombat extends Combat {
    /**
     * Sets all defeated combatants activation status to true (already activated),
     * and all others to false (hasn't activated yet)
     */
    resetActivations(): void;
    startCombat(): Promise<this>;
    nextRound(): Promise<this>;
    setupTurns(): CosmereCombatant[];
}