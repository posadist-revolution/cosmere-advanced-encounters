import { CosmereChatMessage, MESSAGE_TYPES } from "@src/declarations/cosmere-rpg/documents/chat-message";


Hooks.on("preCreateChatMessage", (
    chatMessage: CosmereChatMessage
) => {
    if(chatMessage.getFlag("cosmere-rpg", "message").type != MESSAGE_TYPES.ACTION){
        return true;
    }
    let html = chatMessage.content;
    let tokenId = chatMessage.speaker.token;

    return true;
});