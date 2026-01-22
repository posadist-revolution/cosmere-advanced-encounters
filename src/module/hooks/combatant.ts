import { ActionCostType, TurnSpeed } from "../../declarations/cosmere-rpg/system/types/cosmere";
import { activeCombat } from "@src/index";
import { CombatantActions, UsedAction } from "../documents/combatant_actions.js";
import { CosmereItem } from "../../declarations/cosmere-rpg/documents/item";
import { CosmereChatMessage, MESSAGE_TYPES } from '../../declarations/cosmere-rpg/documents/chat-message';
import { MODULE_ID, SYSTEM_ID } from "../constants";


export function activateCombatantHooks(){
    console.log(`${MODULE_ID}: Registering combatant hooks`);
    Hooks.on("preCreateChatMessage", (
        chatMessage: CosmereChatMessage
    ) => {
        // console.log(`${MODULE_ID}: Running preCreateChatMessage`);
        if(chatMessage.getFlag("cosmere-rpg", "message")?.type != MESSAGE_TYPES.ACTION){
            // console.log(`${MODULE_ID}: Message is not an action`);
            return true;
        }
        let cosmereItem: CosmereItem = chatMessage.itemSource!;
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
    if(activeCombat.combat.combatant?.turnSpeed == TurnSpeed.Fast && combatantActions?.isBoss){
        combatantActions.bossFastTurnActions.useAction(usedAction);
    }
    else{
        combatantActions.combatantTurnActions.useAction(usedAction);
    }
}