export type MODULE_COMBATANT_FLAGS = {
    actionsUsed: any;
    actionsAvailableGroups: any;
    reactionsUsed: any;
    reactionsAvailable: any;
    freeActionsUsed: any;
    specialActionsUsed: any;
    flags_initialized_version: string;

    //@deprecated These flags are kept in the configuration to allow for intelligently updating combats in progress to new module versions
    reactionUsed: boolean;
    bossFastActionsOnTurn: number;
    actionsOnTurn: number;
    linkedCombatantIds: string[];
}