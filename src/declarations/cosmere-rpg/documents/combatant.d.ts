import { TurnSpeed } from '@system/types/cosmere';
import { CosmereActor } from './actor';
import { SYSTEM_ID } from '@system/constants';
import { MODULE_ID } from '@src/module/constants';
export declare class CosmereCombatant extends foundry.documents.Combatant {
    static defineSchema(): Combatant.Schema;
    static get schema(): foundry.data.fields.SchemaField<Combatant.Schema>;
    get actor(): CosmereActor;
    get isBoss(): boolean;
    get initiative(): number;
    get turnSpeed(): TurnSpeed;
    get activated(): boolean;
    get bossFastActivated(): boolean;
    rollInitiative(): Promise<this>;
    /**
     * Utility function to flip the combatants current turn speed between slow and fast. It then updates initiative to force an update of the combat-tracker ui
     */
    toggleTurnSpeed(): Promise<void>;
    markActivated(bossFastActivated?: boolean): Promise<void>;
    resetActivation(): Promise<void>;
}
export declare namespace CosmereCombatant {
    type Schema = Omit<Combatant.Schema, 'initiative'>;
}