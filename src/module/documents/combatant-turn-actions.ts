// System Imports
import { CosmereCombatant, CosmereItem } from "@system/documents";
import { ActionCostType, Status, TurnSpeed } from "@system/types/cosmere";
import { AnyObject } from "@league-of-foundry-developers/foundry-vtt-types/utils";

// Module Imports
import { activeCombat } from "@src/index";
import { getModuleSetting, SETTINGS } from "@module/settings";
import { MODULE_ID } from "@module/constants";
import { TEMPLATES } from "@module/helpers/templates.mjs";
import { CombatantActions } from "./combatant-actions";
import { ActionGroup, UsedAction } from "./used-action";


interface CombatTurnActionsContext{
    combatantId: string;
    actionsAvailableGroups: ActionGroup[];
    actionsUsed: UsedAction[];
    reactionsAvailable: ActionGroup[];
    reactionsUsed: UsedAction[];
    freeActionsUsed: UsedAction[];
    specialActionsUsed: UsedAction[];
}

export class CombatantTurnActions extends foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.api.ApplicationV2<AnyObject>,
){
    static DEFAULT_OPTIONS = {
        actions: {
            useAction: this._onUseActionButton,
            restoreAction: this._onRestoreActionButton,
            useReaction: this._onUseReactionButton,
            restoreReaction: this._onRestoreReactionButton,
            restoreFreeAction: this._onRestoreFreeActionButton,
            restoreSpecialAction: this._onRestoreSpecialActionButton
        },
        window: {
            frame: false
        },
        classes: ["combatant-controls", "flexrow"],
    };

    static PARTS = foundry.utils.mergeObject(
        foundry.utils.deepClone(super.PARTS),
        {
            content: {
                template: TEMPLATES.COMBATANT_ACTIONS_TEMPLATE,
                root: true,
            },
        },
    );

    readonly combatantActions: CombatantActions;
    readonly combatant: CosmereCombatant;
    // readonly turnContext: CosmereTurnContext;
    readonly isBossFastTurn: boolean;
    declare context: CombatTurnActionsContext;

    constructor(combatantActions: CombatantActions, bossFastTurn = false) {
        super();
        this.combatantActions = combatantActions;
        this.combatant = combatantActions.combatant;
        this.isBossFastTurn = bossFastTurn;
        this.context = {
            combatantId: this.combatant.id!,
            actionsAvailableGroups: [],
            actionsUsed: [],
            reactionsAvailable: [],
            reactionsUsed: [],
            freeActionsUsed: [],
            specialActionsUsed: []
        };
        this.refreshActionsFromFlags();
    }

    protected async _prepareContext(options: any){
        return this.context as any;
    }
}