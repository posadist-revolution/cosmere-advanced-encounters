// System Imports
import { CosmereItem, CosmereActiveEffect, CosmereActor, AdversaryActor} from "@system/documents";
import { ActionCostType, AdversaryRole, Status, TurnSpeed } from "@system/types/cosmere";
import { HOOKS } from "@system/constants/hooks";

// Module Imports
import { MODULE_ID } from "@module/constants";
import { CheckActionUsabilityOptions, getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "@module/settings";
import { UsedAction } from "@module/documents/used-action";
import { AdvancedCosmereCombatant } from "@module/documents/combatant";
import { AdvancedCosmereCombat } from "@module/documents/combat";


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

        var combatant = game.combat.combatant;
        var turnSpeed: TurnSpeed | undefined | string;
        if(combatant?.actorId !== options.actor?.id){
            // If this is an action being used by a boss actor without it being that boss's turn,
            // we need to prompt and see which turn this action should be used from.
            if(options.actor?.isAdversary){
                var actor = options.actor as AdversaryActor;
                if(actor.system.role == AdversaryRole.Boss && item.system.activation.cost.type == ActionCostType.Action && game.combat.combatant?.actorId != options.actor.id){
                    turnSpeed = await promptBossSpeed(actor);
                    game.combat.lastBossTurnSpeed = turnSpeed;
                    if(turnSpeed == "offTurn"){
                        // Always allow using actions off-turn
                        return true;
                    }
                    else{
                        combatant = game.combat.getCombatantsByActor(options.actor).filter((combatant) => {return combatant.turnSpeed == turnSpeed})[0]!;
                    }
                }
            }
            else{
                combatant = game.combat.getCombatantsByActor(options.actor!)[0]!;
            }
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
            return true;
        }
        // Get all relevant combatant actions information
        let combatants = game.combat?.getCombatantsByToken(options.actor?.getActiveTokens(true)[0].id!)!;
        var combatant = combatants[0];

        if(game.combat.lastBossTurnSpeed){
            if(game.combat.lastBossTurnSpeed == "offTurn"){
                // Don't mark off-turn actions for now
                // TODO: Find a way to track these well
                game.combat.lastBossTurnSpeed = null;
                return true;
            }
            else{
                combatant = combatants.filter((combatant) => {return combatant.turnSpeed == game.combat?.lastBossTurnSpeed})[0]!;
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
}

function handleFreeAction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(1, cosmereItem.name);
    combatant.useFreeAction(usedAction);
}

function handleSpecialAction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(1, cosmereItem.name);
    combatant.useSpecialAction(usedAction);
}

function handleReaction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    combatant.useReaction(new UsedAction(1, cosmereItem.name));
}

function handleUseAction(combatant: AdvancedCosmereCombatant, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(cosmereItem.system.activation.cost.value!, cosmereItem.name);
    combatant.useAction(usedAction);
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
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.turnStart || (! current.combatantId)){
        return;
    }
    let turns = combat.turns;
    let combatant = combat.combatants.get(current.combatantId)!;

    await combatant.onTurnStart();
});