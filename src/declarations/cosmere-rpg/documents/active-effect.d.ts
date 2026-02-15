import { ActiveEffectDataModel } from '@system/data/active-effect';

export declare class CosmereActiveEffect<out SubType extends ActiveEffect.SubType = ActiveEffect.SubType> extends ActiveEffect<SubType> {
    system: ActiveEffectDataModel;
    //TODO: Figure out how to make ActiveEffect.UpdateData accept system fields natively
    static defineSchema(): ActiveEffect.Schema;
    static get schema(): foundry.data.fields.SchemaField<ActiveEffect.Schema>;
    /**
     * The number of stacked instances of this effect. Used for stackable effects.
     * Shorthand for `system.stacks`.
     */
    get stacks(): number;
    /**
     * Whether this effect is a system defined status effect.
     */
    get isStatusEffect(): boolean;
    /**
     * Whether this effect is a system defined condition.
     * This is an alias for `isStatusEffect`.
     */
    get isCondition(): boolean;
    /**
     * Whether this effect is stackable.
     * Shorthand for `system.isStackable`.
     */
    get isStackable(): boolean | undefined;
}
export declare namespace CosmereActiveEffect {
    type Schema = ActiveEffect.Schema;
}
