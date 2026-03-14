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
import { applyMovementFromItem, getDefaultMovementItemForType, resetRemainingMovement } from "../helpers/movement";
import { getCombatantForAction } from "../helpers/combatant";


export function activateCombatantHooks(){
    console.log(`${MODULE_ID}: Registering combatant hooks`);

    // Before an actor uses an item, register that usage in the combatant actions tracker
    Hooks.on(HOOKS.PRE_USE_ITEM, async (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        if(!(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT) && game.combat?.started)){
            return true;
        }
        // Check the settings for what level of control the module has over using actions
        let checkActionUsability = getModuleSetting(SETTINGS.CHECK_ACTION_USABILITY);

        var combatant = await getCombatantForAction(options.actor, item);
        if(!combatant){
            // Always allow using actions off-turn
            return true;
        }

        if(checkActionUsability == CheckActionUsabilityOptions.warn || checkActionUsability == CheckActionUsabilityOptions.block){
            // Get all relevant combatant actions information
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
        }
        return true;
    });

    Hooks.on(HOOKS.USE_ITEM, (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        if(!(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT) && game.combat?.started)){
            return;
        }
        // Get all relevant combatant actions information
        let combatants = game.combat?.getCombatantsByActor(options.actor)!;
        var combatant = combatants[0];

        if(game.combat.lastBossTurnSpeed){
            if(game.combat.lastBossTurnSpeed == "offTurn"){
                // Don't mark off-turn actions for now
                // TODO: Find a way to track these well
                game.combat.lastBossTurnSpeed = null;
                return;
            }
            else{
                combatant = combatants.find((combatant) => {return combatant.turnSpeed == game.combat?.lastBossTurnSpeed})!;
            }
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

    Hooks.on("preMoveToken", async (token: TokenDocument, movementData: TokenDocument.MovementData) => {
        console.log("Running preMoveToken");
        console.log("Token:");
        console.log(token);
        console.log("movementData:");
        console.log(movementData);
        if(!game.combat || !game.combat.active){
            return true;
        }

        if(!token.actor) return true;
        let tokenCombatant = await getCombatantForAction(token.actor!);
        if(!tokenCombatant) return true;
        console.log("tokenCombatant");
        console.log(tokenCombatant);

        let moveCost = movementData.passed.cost
        let moveType = token.movementAction as MovementType | "blink";
        console.log("moveCost");
        console.log(moveCost);
        console.log("moveType");
        console.log(moveType);
        let initialremainingMovementFromLastAction = (tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction"));
        if(!initialremainingMovementFromLastAction){
            resetRemainingMovement(tokenCombatant);
        }

        if(tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[moveType] < moveCost){
            //TODO: Get movement item from actor sheet or from compendium
            console.log("Not enough remaining movement:");
            console.log((tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[moveType]));
            switch(getModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN)){
                case BasicMoveActionWhenOptions.never:
                    return combatantNotEnoughMovement(tokenCombatant, moveType);

                case BasicMoveActionWhenOptions.prompt:
                    //TODO: Create "Use basic movement action" prompt
                    await useDefaultMoveAction(tokenCombatant, moveType);
                    break;

                case BasicMoveActionWhenOptions.auto:
                    await useDefaultMoveAction(tokenCombatant, moveType);
                    break;
            }
            if(tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[moveType] <= moveCost){
                console.log("Still not enough remaining movement");
                console.log(tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[moveType]);
                return combatantNotEnoughMovement(tokenCombatant, moveType);
            }
        }

        let remainingMovementFromLastAction = (await tokenCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction"));
        remainingMovementFromLastAction[moveType] -= moveCost;
        await tokenCombatant.setFlag(MODULE_ID, "remainingMovementFromLastAction", remainingMovementFromLastAction);
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
    let moveActionItem = await getDefaultMovementItemForType(combatant.actor, moveType);
    console.log("attempting to use move action:");
    console.log(moveActionItem);
    await combatant.actor.useItem(moveActionItem);
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