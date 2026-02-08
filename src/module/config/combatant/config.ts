export type MODULE_COMBATANT_FLAGS = {
    actionsUsed: any;
    actionsAvailableGroups: any;
    bossFastActionsUsed: any;
    bossFastActionsAvailableGroups: any;
    reactionsUsed: any;
    reactionsAvailable: any;
    freeActionsUsed: any;
    specialActionsUsed: any;
    bossFastFreeActionsUsed: any;
    bossFastSpecialActionsUsed: any;
    flags_initialized_version: string;

    //@deprecated These flags are kept in the configuration to allow for intelligently updating combats in progress to new module versions
    reactionUsed: boolean;
    bossFastActionsOnTurn: number;
    actionsOnTurn: number;
}