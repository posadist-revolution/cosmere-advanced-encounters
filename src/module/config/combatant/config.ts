import { MovementType } from "@src/declarations/cosmere-rpg/types/cosmere";

export type MODULE_COMBATANT_FLAGS = {
    actionsUsed: any;
    actionsAvailableGroups: any;
    reactionsUsed: any;
    reactionsAvailable: any;
    freeActionsUsed: any;
    specialActionsUsed: any;
    flags_initialized_version: string;
    remainingMovementFromLastAction: Record<MovementType | "blink", number>;

    //@deprecated These flags are kept in the configuration to allow for intelligently updating combats in progress to new module versions
    reactionUsed: boolean;
    bossFastActionsOnTurn: number;
    actionsOnTurn: number;
    linkedCombatantIds: string[];
}