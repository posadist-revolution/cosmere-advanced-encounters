import { CosmereActor } from './actor';
import { CosmereItem } from './item';
import { SYSTEM_ID } from '@system/constants';
export declare const enum MESSAGE_TYPES {
    SKILL = 'skill',
    ACTION = 'action',
    INJURY = 'injury',
    DAMAGE_TAKEN = 'taken',
};
export declare class CosmereChatMessage<out SubType extends ChatMessage.SubType = ChatMessage.SubType> extends ChatMessage<SubType> {
    get actorSource(): CosmereActor | null;
    get itemSource(): CosmereItem | null;
    get d20Rolls(): D20Roll[];
    get damageRolls(): DamageRoll[];
    get hasSkillTest(): boolean;
    get hasDamage(): boolean;
    get hasInjury(): boolean;
    get hasDamageTaken(): boolean;
    get headerImg(): string | undefined;
    getHTML(): Promise<JQuery>;
    /**
     * Listen for shift key being pressed to show the chat message "delete" icon, or released (or focus lost) to hide it.
     */
    static activateListeners(): void;
}