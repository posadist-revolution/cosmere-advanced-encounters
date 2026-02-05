import { TurnSpeed } from '@system/types/cosmere';
import type { CosmereCombatant } from '@system/documents/combatant';

interface CombatantData {
    /**
     * The turn speed type of the combatant, either slow or fast.
     */
    turnSpeed: TurnSpeed

    /**
     * Whether or not the combatant has acted this turn.
     */
    activated: boolean

    /**
     * Whether or not the boss combatant has acted on its fast turn.
     * This is only used for boss adversaries.
     */
    bossFastActivated: boolean
}

export class CombatantDataModel extends foundry.abstract.TypeDataModel<CombatantData, CosmereCombatant> implements CombatantData {
    turnSpeed: TurnSpeed;
    activated: boolean;
    bossFastActivated: boolean;
    static defineSchema(): DataSchema;
}
