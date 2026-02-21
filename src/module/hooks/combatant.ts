// System Imports
import { CosmereItem, CosmereActiveEffect, CosmereActor, CosmereChatMessage, MESSAGE_TYPES, AdversaryActor, CharacterActor} from "@system/documents";
import { ActionCostType, AdversaryRole, Status, TurnSpeed } from "@system/types/cosmere";
import { HOOKS } from "@system/constants/hooks";

// Module Imports
import { activeCombat } from "@src/index";
import { CombatantActions } from "@module/documents/combatant-actions.js";
import { MODULE_ID } from "@module/constants";
import { CheckActionUsabilityOptions, getModuleSetting, SETTINGS } from "@module/settings";
import { UsedAction } from "@module/documents/used-action";


export function activateCombatantHooks(){
    console.log(`${MODULE_ID}: Registering combatant hooks`);

    // Before an actor uses an item, register that usage in the combatant actions tracker
    Hooks.on(HOOKS.PRE_USE_ITEM, async (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        if(!(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT) && activeCombat.combat.started)){
            return true;
        }
        // Check the settings for what level of control the module has over using actions
        let checkActionUsability = getModuleSetting(SETTINGS.CHECK_ACTION_USABILITY);
        var turnSpeed: TurnSpeed | undefined | string;
        // If this is an action being used by a boss actor without it being that boss's turn,
        // we need to prompt and see which turn this action should be used from.
        if(item.actor?.isAdversary){
            var actor = item.actor as AdversaryActor;
            if(actor.system.role == AdversaryRole.Boss && item.system.activation.cost.type == ActionCostType.Action && activeCombat.combat.combatant?.actorId != item.actor?.id){
                turnSpeed = await promptBossSpeed(actor);
                activeCombat.lastBossTurnSpeed = turnSpeed;
                if(turnSpeed == "offTurn"){
                    // Always allow using actions off-turn
                    return true;
                }
            }
        }

        if(checkActionUsability == CheckActionUsabilityOptions.warn || checkActionUsability == CheckActionUsabilityOptions.block){
            // Get all relevant combatant actions information
            let combatantActions = activeCombat.getCombatantActionsByTokenId(options.actor?.getActiveTokens(true)[0].id!)!;
            if(!turnSpeed) {turnSpeed = activeCombat.combat.combatant?.turnSpeed!;}
            let combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed as TurnSpeed);
            if(combatantTurnActions && !combatantTurnActions.canUseItem(item)){
                if((game.i18n) && (options.actor)){
                    ui.notifications?.warn(
                        game.i18n?.format(`${MODULE_ID}.warning.notEnoughActionType`, {
                            actor: options.actor.name,
                            actionCostType: game.i18n.localize(`${MODULE_ID}.actionCostType.${item.system.activation.cost.type}`),
                            actionName: item.name
                        }),
                    );
                }

                if(checkActionUsability == CheckActionUsabilityOptions.block){
                    return false;
                }
            }
        }
        return true;
    });

    Hooks.on(HOOKS.USE_ITEM, (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        if(!(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT) && activeCombat.combat.started)){
            return true;
        }
        // Get all relevant combatant actions information
        let combatantActions = activeCombat.getCombatantActionsByTokenId(options.actor?.getActiveTokens(true)[0].id!)!;

        if(activeCombat.lastBossTurnSpeed == "offTurn"){
            // Don't mark off-turn actions for now
            // TODO: Find a way to track these well
            return true;
        }

        switch(item.system.activation.cost.type){
            case ActionCostType.Action:
                handleUseAction(combatantActions, item);
                break;
            case ActionCostType.FreeAction:
                handleFreeAction(combatantActions, item);
                break;
            case ActionCostType.Reaction:
                handleReaction(combatantActions, item);
                break;
            case ActionCostType.Special:
                handleSpecialAction(combatantActions, item);
                break;
            default:
                break;
        }
        return true;

    });

    Hooks.on("preCreateActiveEffect", (
        activeEffect: CosmereActiveEffect
    ) => {
        if(!getModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS)){
            return;
        }
        if(activeEffect.statuses.has(Status.Stunned) || activeEffect.statuses.has(Status.Disoriented) || activeEffect.statuses.has(Status.Surprised)){
            const actor = activeEffect.parent as CosmereActor;
            const tokenId = actor.getActiveTokens(true)[0].id;

            // Get the associated combatant turn actions information
            let combatantActions = activeCombat.getCombatantActionsByTokenId(tokenId)!;
            let turnSpeed = activeCombat.combat.combatant?.turnSpeed!;
            let combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

            //Apply the condition effects associated with this active effect
            combatantTurnActions.applyConditionsOffTurn(activeEffect.statuses);
        }
    });

    Hooks.on("preDeleteActiveEffect", (
        activeEffect: CosmereActiveEffect
    ) => {
        if(!getModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS)){
            return;
        }
        if(activeEffect.statuses.has(Status.Stunned) || activeEffect.statuses.has(Status.Disoriented) || activeEffect.statuses.has(Status.Surprised)){
            const actor = activeEffect.parent as CosmereActor;
            const tokenId = actor.getActiveTokens(true)[0].id;

            // Get the associated combatant turn actions information
            let combatantActions = activeCombat.getCombatantActionsByTokenId(tokenId)!;
            let turnSpeed = activeCombat.combat.combatant?.turnSpeed!;
            let combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

            //Remove the condition effects associated with this active effect
            combatantTurnActions.removeConditionsOffTurn(activeEffect.statuses);
        }
    });
}

function handleFreeAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(1, cosmereItem.name);
    combatantActions.getCombatantTurnActions(activeCombat.lastBossTurnSpeed as TurnSpeed).useFreeAction(usedAction);
}

function handleSpecialAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(1, cosmereItem.name);
    combatantActions.getCombatantTurnActions(activeCombat.lastBossTurnSpeed as TurnSpeed).useSpecialAction(usedAction);
}

function handleReaction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    combatantActions.combatantTurnActions.useReaction(new UsedAction(1, cosmereItem.name));
}

function handleUseAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(cosmereItem.system.activation.cost.value!, cosmereItem.name);
    combatantActions.getCombatantTurnActions(activeCombat.lastBossTurnSpeed as TurnSpeed).useAction(usedAction);
}

async function promptBossSpeed(actor: CosmereActor): Promise<TurnSpeed | "offTurn">{
    let bossSpeed = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n?.format(`${MODULE_ID}.prompts.bossTurnSpeedSelect.content`) },
        content: `<p>${game.i18n?.format(`${MODULE_ID}.prompts.bossTurnSpeedSelect.content`)}</p>`,
        // This example does not use i18n strings for the button labels,
        // but they are automatically localized.
        buttons: [
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.fast`,
                action: TurnSpeed.Fast,
            },
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.slow`,
                action: TurnSpeed.Slow,
            },
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.offTurn`,
                action: "offTurn",
            },
        ]
    }) as TurnSpeed | "offTurn";
    return bossSpeed;
}