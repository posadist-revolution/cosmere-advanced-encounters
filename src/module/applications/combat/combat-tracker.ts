import { ActorType, TurnSpeed } from '@system/types/cosmere';

// Documents
import { AdvancedCosmereCombatant } from '@module/documents/combatant';

// Constants
import { SYSTEM_ID } from '@system/constants';
import { TEMPLATES } from '@module/helpers/templates.mjs';
import { ActionGroup, UsedAction } from '@src/module/documents/used-action';

export interface CosmereTurnContext extends CombatTracker.TurnContext {
    type?: Actor.SubType;
    turnSpeed?: TurnSpeed;
    activated?: boolean;
    isBoss?: boolean;
    isObserver?: boolean;
    actionsAvailableGroups: ActionGroup[];
    actionsUsed: UsedAction[];
    reactionsAvailable: ActionGroup[];
    reactionsUsed: UsedAction[];
    freeActionsUsed: UsedAction[];
    specialActionsUsed: UsedAction[];
}

interface CosmereTrackerContext extends CombatTracker.TrackerContext {
    turns: CosmereTurnContext[];
    fastPlayers: CosmereTurnContext[];
    slowPlayers: CosmereTurnContext[];
    fastNPC: CosmereTurnContext[];
    slowNPC: CosmereTurnContext[];
}

/**
 * Overrides default tracker template to implement slow/fast buckets and combatant activation button.
 */
export class AdvancedCosmereCombatTracker extends foundry.applications.sidebar.tabs
    .CombatTracker {
    /**
     * NOTE: Unbound methods is the standard for defining actions
     * within ApplicationV2
     */
    /* eslint-disable @typescript-eslint/unbound-method */
    static DEFAULT_OPTIONS = {
        actions: {
            toggleSpeed: this._onClickToggleTurnSpeed,
            activateCombatant: this._onActivateCombatant,
            useAction: this._onUseActionButton,
            restoreAction: this._onRestoreActionButton,
            useReaction: this._onUseReactionButton,
            restoreReaction: this._onRestoreReactionButton,
            restoreFreeAction: this._onRestoreFreeActionButton,
            restoreSpecialAction: this._onRestoreSpecialActionButton
        },
    };
    /* eslint-enable @typescript-eslint/unbound-method */

    static PARTS = foundry.utils.mergeObject(
        foundry.utils.deepClone(super.PARTS),
        {
            tracker: {
                template: `${TEMPLATES.COMBAT_TRACKER}`,
            },
            footer: {
                template: `${TEMPLATES.COMBAT_TRACKER_FOOTER}`,
            },
        },
    );

    public override async _prepareTrackerContext(
        context: CombatTracker.RenderContext & CosmereTrackerContext,
        options: CombatTracker.RenderOptions,
    ) {
        const combat = this.viewed;
        if (!combat) return;

        context.turns = await combat.turns
            .filter((c) => c.visible)
            .reduce(
                async (prev, combatant, i) => [
                    ...(await prev),
                    await this._prepareTurnContext(combat, combatant, i),
                ],
                Promise.resolve([] as CosmereTurnContext[]),
            );

        // Split turn data into individual turn "buckets" to separate them in the combat tracker ui
        context.fastPlayers = context.turns.filter((turn) => {
            return (
                turn.type === ActorType.Character &&
                turn.turnSpeed === TurnSpeed.Fast
            );
        });
        context.slowPlayers = context.turns.filter((turn) => {
            return (
                turn.type === ActorType.Character &&
                turn.turnSpeed === TurnSpeed.Slow
            );
        });
        context.fastNPC = context.turns.filter((turn) => {
            return (
                turn.type === ActorType.Adversary &&
                turn.turnSpeed === TurnSpeed.Fast
            );
        });
        context.slowNPC = context.turns.filter((turn) => {
            return (
                turn.type === ActorType.Adversary &&
                turn.turnSpeed === TurnSpeed.Slow
            );
        });
    }

    protected override async _prepareTurnContext(
        combat: Combat.Stored,
        combatant: AdvancedCosmereCombatant,
        index: number,
    ): Promise<CosmereTurnContext> {
        return {
            ...(await super._prepareTurnContext(
                combat,
                combatant as Combatant.Stored,
                index,
            )),
            turnSpeed: combatant.turnSpeed,
            type: combatant.actor?.type,
            activated: combatant.activated,
            isBoss: combatant.isBoss,
            isObserver: combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER),
            actionsAvailableGroups: combatant.actionsAvailableGroups,
            reactionsAvailable: combatant.reactionsAvailable,
            actionsUsed: combatant.actionsUsed,
            reactionsUsed: combatant.reactionsUsed,
            freeActionsUsed: combatant.freeActionsUsed,
            specialActionsUsed: combatant.specialActionsUsed
        };
    }

    /**
     * toggles combatant turn speed on clicking the "fast/slow" button on the combat tracker window
     * */
    protected static _onClickToggleTurnSpeed(
        this: AdvancedCosmereCombatTracker,
        event: Event,
    ) {
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // Toggle the combatant's turn speed
        void combatant.toggleTurnSpeed();
    }

    /**
     *  activates the combatant when clicking the activation button
     */
    protected static _onActivateCombatant(
        this: AdvancedCosmereCombatTracker,
        event: Event,
    ) {
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;

        // Get the combatant
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // Mark the combatant as activated
        void combatant.markActivated();

        // Set the current turn to this combatant
        void this.viewed?.setCurrentTurnFromCombatant(combatant);
    }

    /**
     * toggles combatant turn speed on clicking the "fast/slow" option in the turn tracker context menu
     */
    protected _onContextToggleTurnSpeed(el: HTMLElement) {
        const li = $(el);
        // Get the combatant from the list item
        const combatant = this.viewed!.combatants.get(
            li.data('combatant-id') as string,
        )!;

        // Toggling a boss's turn speed should not be possible, so return
        if (combatant.isBoss) {
            return;
        }

        // Toggle the combatant's turn speed
        void combatant.toggleTurnSpeed();
    }

    /**
     * resets combatants activation status to hasn't activated
     */
    protected _onContextResetActivation(el: HTMLElement) {
        const li = $(el);
        // Get the combatant from the list item
        const combatant = this.viewed!.combatants.get(
            li.data('combatant-id') as string,
        )!;

        // Reset the combatant's activation status
        void combatant.resetActivation();
    }

    protected override _getEntryContextOptions(): ContextMenu.Entry<HTMLElement>[] {
        const menu: ContextMenu.Entry<HTMLElement>[] = [
            {
                name: 'COSMERE.Combat.ToggleTurn',
                icon: '',
                callback: this._onContextToggleTurnSpeed.bind(this),
            },
            {
                name: 'COSMERE.Combat.ResetActivation',
                icon: '<i class="fas fa-undo"></i>',
                callback: this._onContextResetActivation.bind(this),
            },
        ];

        // pushes existing context menu options, filtering out the initiative reroll and initiative clear options
        menu.push(
            ...super
                ._getEntryContextOptions()
                .filter(
                    (i) =>
                        i.name !== 'COMBAT.CombatantReroll' &&
                        i.name !== 'COMBAT.CombatantClear',
                ),
        );
        return menu;
    }

    //#region CombatantTurnActions_Actions
    protected static async _onUseActionButton(
        this: AdvancedCosmereCombatTracker,
        event: Event
    ){
        // console.log("Use action button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionGroupName = btn.getAttribute("action-group-name")!;

        // Get the combatant actions and turn speed of what was clicked
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // console.log(`UsedAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatant.useAction(new UsedAction(1, game.i18n?.localize("cosmere-advanced-encounters.cost_manual"), actionGroupName));
    }

    protected static async _onRestoreActionButton(
        this: AdvancedCosmereCombatTracker,
        event: Event
    ){
        // console.log("Restore action button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name")!;
        const actionCost = btn.getAttribute("action-cost")!;
        const actionGroupName = btn.getAttribute("action-group-name")!;

        // Get the combatant actions
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // console.log(`RestoredAction on combatant ${li.dataset.combatantId} with turn speed ${turnSpeed}`);
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatant.removeAction(new UsedAction(Number(actionCost), actionName, actionGroupName));
    }

    protected static async _onUseReactionButton(
        this: AdvancedCosmereCombatTracker,
        event: Event
    ){
        // console.log("Use reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionGroupName = btn.getAttribute("action-group-name")!;

        // Get the combatant actions
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatant.useReaction(new UsedAction(1, game.i18n?.localize("cosmere-advanced-encounters.cost_manual"), actionGroupName));
    }

    protected static async _onRestoreReactionButton(
        this: AdvancedCosmereCombatTracker,
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionGroupName = btn.getAttribute("action-group-name")!;
        const actionName = btn.getAttribute("action-name")!;

        // Get the combatant actions
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatant.removeReaction(new UsedAction(1, actionName, actionGroupName));
    }

    protected static async _onRestoreFreeActionButton(
        this: AdvancedCosmereCombatTracker,
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name")!;

        // Get the combatant actions
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatant.removeFreeAction(new UsedAction(1, actionName));
    }

    protected static async _onRestoreSpecialActionButton(
        this: AdvancedCosmereCombatTracker,
        event: Event
    ){
        // console.log("Toggle reaction button pressed");
        event.preventDefault();
        event.stopPropagation();

        // Get the button and the closest combatant list item
        const btn = event.target as HTMLElement;
        const li = btn.closest<HTMLElement>('.combatant')!;
        const actionName = btn.getAttribute("action-name")!;

        // Get the combatant actions
        const combatant = this.viewed!.combatants.get(li.dataset.combatantId!)!;

        // console.log(`ToggledReaction on combatant ${li.dataset.combatantId}`);
        if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER))
        {
            return;
        }

        void await combatant.removeSpecialAction(new UsedAction(1, actionName));
    }
    //#endregion
}
