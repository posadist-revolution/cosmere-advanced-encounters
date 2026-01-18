
export declare const MESSAGE_TYPES = {
    SKILL: 'skill',
    ACTION: 'action',
    INJURY: 'injury',
    DAMAGE_TAKEN: 'taken',
};

export declare class CosmereChatMessage<
    out SubType extends ChatMessage.SubType = ChatMessage.SubType,
> extends ChatMessage<SubType> {

    /* --- Accessors --- */
    public get actorSource(): CosmereActor | null;

    public get itemSource(): CosmereItem | null;

    public get d20Rolls(): D20Roll[];

    public get damageRolls(): DamageRoll[];

    public get hasSkillTest(): boolean;

    public get hasDamage(): boolean;

    public get hasInjury(): boolean;

    public get hasDamageTaken(): boolean;

    public get headerImg(): string | undefined;

    /* --- Rendering --- */
    public override async getHTML(): Promise<JQuery>;

    /**
     * Listen for shift key being pressed to show the chat message "delete" icon, or released (or focus lost) to hide it.
     */
    public static activateListeners(): void;
}


declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredChatMessage<SubType extends ChatMessage.SubType> {
        document: CosmereChatMessage<SubType>;
    }

    interface FlagConfig {
        ChatMessage: {
            ['cosmere-rpg']: {
                message: {
                    description?: HTMLElement;
                    item?: string;
                    type: (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
                };
                'message.item': string;
                headerImg: string | undefined;
                [MESSAGE_TYPES.INJURY]: {
                    details: TableResult.CreateData;
                    roll: Roll.Data;
                };
                [
                    key: `${typeof MESSAGE_TYPES.INJURY}.details`
                ]: TableResult.CreateData;
                [key: `${typeof MESSAGE_TYPES.INJURY}.roll`]: Roll.Data;
                [MESSAGE_TYPES.DAMAGE_TAKEN]: unknown;
            };
        };
    }
}