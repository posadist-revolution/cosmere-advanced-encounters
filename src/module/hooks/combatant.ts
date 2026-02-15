// System Imports
import { CosmereItem, CosmereActiveEffect, CosmereActor, CosmereChatMessage, MESSAGE_TYPES} from "@system/documents";
import { ActionCostType, Status, TurnSpeed } from "@system/types/cosmere";
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
    Hooks.on(HOOKS.PRE_USE_ITEM, (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        // Check the settings for what level of control the module has over using actions
        let checkActionUsability = getModuleSetting(SETTINGS.CHECK_ACTION_USABILITY);

        if(checkActionUsability == CheckActionUsabilityOptions.warn || checkActionUsability == CheckActionUsabilityOptions.block){
            // Get all relevant combatant actions information
            let combatantActions = activeCombat.getCombatantActionsByTokenId(options.actor?.getActiveTokens(true)[0].id!)!;
            let turnSpeed = activeCombat.combat.combatant?.turnSpeed!;
            let combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);
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
        if(!getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT)){
            return true;
        }
        // Get all relevant combatant actions information
        let combatantActions = activeCombat.getCombatantActionsByTokenId(options.actor?.getActiveTokens(true)[0].id!)!;

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
    //TODO: Add a way to choose which boss turn the action was used on if it's not currently either boss's turns
    if(activeCombat.combat.combatant?.turnSpeed == TurnSpeed.Fast && combatantActions?.isBoss){
        combatantActions.bossFastTurnActions.useFreeAction(usedAction);
    }
    else{
        combatantActions.combatantTurnActions.useFreeAction(usedAction);
    }
}

function handleSpecialAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(1, cosmereItem.name);
    //TODO: Add a way to choose which boss turn the action was used on if it's not currently either boss's turns
    if(activeCombat.combat.combatant?.turnSpeed == TurnSpeed.Fast && combatantActions?.isBoss){
        combatantActions.bossFastTurnActions.useSpecialAction(usedAction);
    }
    else{
        combatantActions.combatantTurnActions.useSpecialAction(usedAction);
    }
}

function handleReaction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    combatantActions.combatantTurnActions.useReaction(new UsedAction(1, cosmereItem.name));
}

function handleUseAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(cosmereItem.system.activation.cost.value!, cosmereItem.name);
    //TODO: Add a way to choose which boss turn the action was used on if it's not currently either boss's turns
    if(activeCombat.combat.combatant?.turnSpeed == TurnSpeed.Fast && combatantActions?.isBoss){
        combatantActions.bossFastTurnActions.useAction(usedAction);
    }
    else{
        combatantActions.combatantTurnActions.useAction(usedAction);
    }
}