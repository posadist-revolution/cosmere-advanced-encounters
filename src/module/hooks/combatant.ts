import { ActionCostType, TurnSpeed } from "../../declarations/cosmere-rpg/system/types/cosmere";
import { activeCombat } from "@src/index";
import { CombatantActions, UsedAction } from "../documents/combatant_actions.js";
import { CosmereItem } from "../../declarations/cosmere-rpg/documents/item";
import { CosmereChatMessage, MESSAGE_TYPES } from '../../declarations/cosmere-rpg/documents/chat-message';
import { MODULE_ID, SYSTEM_ID } from "../constants";
import { HOOKS } from "../../declarations/cosmere-rpg/system/constants/hooks";
import { getModuleSetting, SETTINGS } from "../settings";


export function activateCombatantHooks(){
    console.log(`${MODULE_ID}: Registering combatant hooks`);
    Hooks.on(HOOKS.PRE_USE_ITEM, (
        item: CosmereItem,
        options: CosmereItem.UseOptions
    ) => {
        //TODO: Add checks for "Does the combatant have enough actions to use this?"
        if(getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT)){
            activeCombat.setLastUsedItemData(item);
        }
        return true;
    });

    Hooks.on("preCreateChatMessage", (
        chatMessage: CosmereChatMessage
    ) => {
        if(!getModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT)){
            return true;
        }
        // console.log(`${MODULE_ID}: Running preCreateChatMessage`);
        if(chatMessage.getFlag("cosmere-rpg", "message")?.type != MESSAGE_TYPES.ACTION){
            // console.log(`${MODULE_ID}: Message is not an action`);
            return true;
        }
        let cosmereItem: CosmereItem = chatMessage.itemSource ?? activeCombat.lastUsedItem!;
        if(!cosmereItem){
            let id = chatMessage.getFlag(SYSTEM_ID, "message.item");
            // TODO: Figure out how to find an item from a compendium
            console.log(`Item ID: ${id}`);
        }
        // console.log(`${MODULE_ID}: Message associated item:`);
        // console.log(cosmereItem);
        let tokenId = chatMessage.speaker.token;
        let combatantActions = activeCombat.getCombatantActionsByTokenId(tokenId!)!;
        switch(cosmereItem.system.activation.cost.type){
            case ActionCostType.Action:
                handleUseAction(combatantActions, cosmereItem);
                break;
            case ActionCostType.FreeAction:
                handleFreeAction(combatantActions, cosmereItem);
                break;
            case ActionCostType.Reaction:
                handleReaction(combatantActions, cosmereItem);
                break;
            case ActionCostType.Special:
                handleSpecialAction(combatantActions, cosmereItem);
                break;
            default:
                break;
        }

        return true;
    });
}

function handleFreeAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){

}

function handleSpecialAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){

}

function handleReaction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    combatantActions.combatantTurnActions.useReaction(new UsedAction(1, cosmereItem.name));
}

function handleUseAction(combatantActions: CombatantActions, cosmereItem: CosmereItem){
    let usedAction = new UsedAction(cosmereItem.system.activation.cost.value!, cosmereItem.name);
    //TODO: Add a way to choose which boss turn the action was used on if it's not currently either boss's turn
    if(activeCombat.combat.combatant?.turnSpeed == TurnSpeed.Fast && combatantActions?.isBoss){
        combatantActions.bossFastTurnActions.useAction(usedAction);
    }
    else{
        combatantActions.combatantTurnActions.useAction(usedAction);
    }
}