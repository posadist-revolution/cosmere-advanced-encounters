import { ActionCostType, Status, TurnSpeed } from "../../declarations/cosmere-rpg/system/types/cosmere";
import { activeCombat } from "@src/index";
import { CombatantActions } from "../documents/combatant-actions.js";
import { CosmereItem } from "../../declarations/cosmere-rpg/documents/item";
import { CosmereChatMessage, MESSAGE_TYPES } from '../../declarations/cosmere-rpg/documents/chat-message';
import { MODULE_ID, SYSTEM_ID } from "../constants";
import { HOOKS } from "../../declarations/cosmere-rpg/system/constants/hooks";
import { CheckActionUsabilityOptions, getModuleSetting, SETTINGS } from "../settings";
import { UsedAction } from "../documents/used-action";


export function activateCombatantHooks(){
    console.log(`${MODULE_ID}: Registering combatant hooks`);

    // Before an actor uses an item, register that usage in the combatant actions tracker
    Hooks.on(HOOKS.PRE_USE_ITEM, (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        // Check the settings for what level of control the module has over using actions
        let checkActionUsability = getModuleSetting(SETTINGS.CHECK_ACTION_USABILITY);

        // Get all relevant combatant actions information
        let combatantActions = activeCombat.getCombatantActionsByTokenId(options.actor?.getActiveTokens()[0].id!)!;
        let turnSpeed = activeCombat.combat.combatant?.turnSpeed!;
        let combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

        if(checkActionUsability == CheckActionUsabilityOptions.warn || checkActionUsability == CheckActionUsabilityOptions.block){
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
        if(!getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT)){
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
        activeEffect: ActiveEffect
    ) => {
        if(!getModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS)){
            return;
        }
        if(activeEffect.statuses.has(Status.Stunned) || activeEffect.statuses.has(Status.Disoriented) || activeEffect.statuses.has(Status.Surprised)){
            const actor = activeEffect.parent as unknown as CosmereActor;
            const tokenId = actor.getActiveTokens()[0].id;

            // Get the associated combatant turn actions information
            let combatantActions = activeCombat.getCombatantActionsByTokenId(tokenId)!;
            let turnSpeed = activeCombat.combat.combatant?.turnSpeed!;
            let combatantTurnActions = combatantActions.getCombatantTurnActions(turnSpeed);

            //Apply the condition effects associated with this active effect
            combatantTurnActions.applyConditionsOffTurn(activeEffect.statuses);
        }
    });

    Hooks.on("preDeleteActiveEffect", (
        activeEffect: ActiveEffect
    ) => {
        if(!getModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS)){
            return;
        }
        if(activeEffect.statuses.has(Status.Stunned) || activeEffect.statuses.has(Status.Disoriented) || activeEffect.statuses.has(Status.Surprised)){
            const actor = activeEffect.parent as unknown as CosmereActor;
            const tokenId = actor.getActiveTokens()[0].id;

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