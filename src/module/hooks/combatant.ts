// System Imports
import { CosmereItem, CosmereActiveEffect, CosmereActor} from "@system/documents";
import { ActionCostType, AdversaryRole, MovementType, Status, TurnSpeed } from "@system/types/cosmere";
import { HOOKS } from "@system/constants/hooks";

// Module Imports
import { MODULE_ID } from "@module/constants";
import { BasicMoveActionWhenOptions, CheckActionUsabilityOptions, getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "@module/settings";
import { UsedAction } from "@module/documents/used-action";
import { AdvancedCosmereCombatant } from "@module/documents/combatant";
import { AdvancedCosmereCombat } from "@module/documents/combat";
import { applyMovementFromItem, getDefaultMovementItemForType, QueuedMoveData, resetRemainingMovement } from "../helpers/movement";
import { getCombatantForAction } from "../helpers/combatant";
import { Use_Skill } from "../applications/dialogs/use-skill-dialog";


export function activateCombatantHooks(){
    console.log(`${MODULE_ID}: Registering combatant hooks`);

    // Before an actor uses an item, register that usage in the combatant actions tracker
    Hooks.on(HOOKS.PRE_USE_ITEM, (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        if((item.system.id == "gain_advantage" || item.system.id == "use_a_skill") && getModuleSetting(SETTINGS.USE_SKILL_POPUP)){
            Use_Skill(options.actor);
        }
        if(!(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT) && game.combat?.started)){
            return true;
        }
        // Check the settings for what level of control the module has over using actions
        let checkActionUsability = getModuleSetting(SETTINGS.CHECK_ACTION_USABILITY);


        if(game.combat.combatant && (game.combat.combatant?.actorId === options.actor.id)){
            let combatant = game.combat.combatant;
            if(!combatant?.canUseItem(item)){
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
            else{
                return true;
            }
        }

        let combatants = game.combat.getCombatantsByActor(options.actor);

        if(checkActionUsability == CheckActionUsabilityOptions.warn || checkActionUsability == CheckActionUsabilityOptions.block){
            // Get all relevant combatant actions information
            // If any of the combatants for this actor have enough actions, return true
            if(combatants.some((combatant) => {return combatant.canUseItem(item)})){
                return true;
            }
            else if(options.actor.isBoss && options.actor?.system.resources.foc.value > 0){
                //If this is a boss actor, and we have some focus left, we should return true
                return true;
            }
            else{
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

    Hooks.on(HOOKS.USE_ITEM, async (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        if(!(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT) && game.combat?.started)){
            return;
        }
        // Get all relevant combatant actions information
        let combatants = game.combat?.getCombatantsByActor(options.actor)!;

        var combatant = await getCombatantForAction(options.actor, item);
        if(!combatant){
            //TODO: Track off-turn action usages by bosses and such better
            return;
        }

        switch(item.system.activation.cost.type){
            case ActionCostType.Action:
                handleUseAction(combatant, item);
                break;
            case ActionCostType.FreeAction:
                handleFreeAction(combatant, item);
                break;
            case ActionCostType.Reaction:
                handleReaction(combatant, item);
                break;
            case ActionCostType.Special:
                handleSpecialAction(combatant, item);
                break;
            default:
                break;
        }
        return;

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

            // Get the associated combatant information
            let combatants = game.combat?.getCombatantsByToken(tokenId)!;

            //Apply the condition effects associated with this active effect
            for(const combatant of combatants){
                combatant.applyConditionsOffTurn(activeEffect.statuses);
            }
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

            // Get the associated combatant information
            let combatants = game.combat?.getCombatantsByToken(tokenId)!;


            //Remove the condition effects associated with this active effect
            for(const combatant of combatants){
                combatant.removeConditionsOffTurn(activeEffect.statuses);
            }
        }
    });

    //TODO: This should probably be done by overriding the token document, not by a hook.
    Hooks.on("preMoveToken", (token: TokenDocument, movementData: TokenDocument.MovementOperation, options: TokenDocument.Database.UpdateOptions) => {
        console.log("Running preMoveToken");
        console.log("Token:");
        console.log(token);
        console.log("movementData:");
        console.log(movementData);
        if(!game.combat || !game.combat.active){
            return true;
        }

        if(movementData.constrainOptions.ignoreCost){
            return true;
        }

        if(!token.actor) return true;
        var tokenCombatant: AdvancedCosmereCombatant | undefined;
        if(game.combat.combatant && (game.combat.combatant?.actorId === token.actor.id)){
            tokenCombatant = game.combat.combatant;
        }
        else{
            // If it's not this combatant's turn, for now, just let the combatant move freely
            return true;
        }
        console.log("tokenCombatant");
        console.log(tokenCombatant);

        let moveCost = movementData.passed.cost
        let moveType = token.movementAction as MovementType | "blink";
        console.log("moveCost");
        console.log(moveCost);
        console.log("moveType");
        console.log(moveType);
        let initialRemainingMovementFromLastAction = (tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction"));
        let requeueMoveData: Omit<TokenDocument.MovementData, "user" | "state"> = {
            updateOptions: options,
            ...movementData
        }
        if(!initialRemainingMovementFromLastAction){
            requeueMoveAfter(tokenCombatant, requeueMoveData, resetRemainingMovement, tokenCombatant);
        }

        if(tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[moveType] < moveCost){
            //TODO: Get movement item from actor sheet or from compendium
            console.log("Not enough remaining movement:");
            console.log((tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[moveType]));
            switch(getModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN)){
                case BasicMoveActionWhenOptions.never:
                    return combatantNotEnoughMovement(tokenCombatant, moveType);

                // case BasicMoveActionWhenOptions.prompt:
                //     //TODO: Create "Use basic movement action" prompt
                //     requeueMoveAfter(tokenCombatant, requeueMoveData, useDefaultMoveAction, tokenCombatant, moveType);
                //     return false;

                case BasicMoveActionWhenOptions.auto:
                    requeueMoveAfter(tokenCombatant, requeueMoveData, useDefaultMoveAction, tokenCombatant, moveType);
                    return false;

                default:
                    return combatantNotEnoughMovement(tokenCombatant, moveType);
            }
        }

        let remainingMovementFromLastAction = (tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction"));
        remainingMovementFromLastAction[moveType] -= moveCost;
        tokenCombatant.setFlag(MODULE_ID, "remainingMovementFromLastAction", remainingMovementFromLastAction);
        return true;
    });
}

function combatantNotEnoughMovement(combatant: AdvancedCosmereCombatant, moveType: MovementType | "blink"){
    if(game.i18n){
        ui.notifications?.warn(
            game.i18n.format(`${MODULE_ID}.warning.notEnoughMovementType`, {
                actor: combatant.actor.name,
                moveType: game.i18n.localize(`${MODULE_ID}.movementType.${moveType}`)
            })
        );
    }
    if(getModuleSetting(SETTINGS.BLOCK_MOVE_WITHOUT_ACTION)){
        return false;
    }
    return true;
}

async function useDefaultMoveAction(combatant: AdvancedCosmereCombatant, moveType: MovementType | "blink"){
    console.log("Attempting using default move action");
    let moveActionItem = await getDefaultMovementItemForType(combatant.actor, moveType);
    console.log("Found move action item: ");
    console.log(moveActionItem);
    if(moveActionItem && combatant.canUseItem(moveActionItem)){
        console.log("attempting to use move action:");
        console.log(moveActionItem);
        await combatant.actor.useItem(moveActionItem);
        return true;
    }
    return false;
}

async function requeueMoveAfter(combatant: AdvancedCosmereCombatant, movementData: Omit<TokenDocument.MovementData, "user" | "state">, fn: Function, ...args: any[]){
    console.log("Checking if move should be requeued");
    if((await fn(...args)) !== false){
        console.log("Requeueing move");
        let newQueuedMoveData: QueuedMoveData = {
            moveData: movementData,
            combatantId: combatant.id!
        }
        globalThis.queuedMoveData = newQueuedMoveData;
    }
    else{
        console.log("Cancelling or finalizing move");
        let moveType = combatant.token?.movementAction as MovementType | "blink";
        if(combatantNotEnoughMovement(combatant, moveType)){
            // If this returns true, we should reattempt the move with ignore cost on
            let moveOptions: TokenDocument.MoveOptions = {
                    method: movementData.method,
                    autoRotate: movementData.autoRotate,
                    showRuler: movementData.showRuler,
                    constrainOptions: {
                        ignoreWalls: movementData.constrainOptions.ignoreWalls,
                        ignoreCost: true,
                    },
                    ...movementData.updateOptions
            }
            await combatant.token?.move(movementData.passed.waypoints, moveOptions);
        }
    }
}

async function handleFreeAction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    await applyMovementFromItem(combatant, cosmereItem);
    let usedAction = new UsedAction(1, cosmereItem.name);
    await combatant.useFreeAction(usedAction);
}

async function handleSpecialAction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    await applyMovementFromItem(combatant, cosmereItem);
    let usedAction = new UsedAction(1, cosmereItem.name);
    await combatant.useSpecialAction(usedAction);
}

async function handleReaction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    await applyMovementFromItem(combatant, cosmereItem);
    await combatant.useReaction(new UsedAction(1, cosmereItem.name));
}

async function handleUseAction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    await applyMovementFromItem(combatant, cosmereItem);
    let usedAction = new UsedAction(cosmereItem.system.activation.cost.value!, cosmereItem.name);
    await combatant.useAction(usedAction);
}

// If a combatant is updated with a new turnSpeed, update actionsOnTurn accordingly
// Hooks.on("preUpdateCombatant", (
//     combatant : AdvancedCosmereCombatant,
//     change : Combatant.UpdateData
// ) => {
//     if(foundry.utils.hasProperty(change, `flags.cosmere-rpg.turnSpeed`)){
//         combatant.onCombatantTurnSpeedChange();
//     }
//     return true;
// });

Hooks.on("combatTurnChange", async (
    combat: AdvancedCosmereCombat,
    prior: Combat.HistoryData,
    current: Combat.HistoryData
) => {
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.turnStart ||
        (!current.combatantId) ||
        (!game.user?.isActiveGM)){
        return;
    }
    let turns = combat.turns;
    let combatant = combat.combatants.get(current.combatantId)!;

    await combatant.onTurnStart();
});