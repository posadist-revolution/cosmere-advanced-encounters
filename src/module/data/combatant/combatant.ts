import { TurnSpeed } from '@system/types/cosmere';
import { CosmereCombatant } from '@system/documents/combatant';
import { ActionGroup } from '@src/module/documents/used-action';

const SCHEMA = () => ({
    /**
     * The turn speed type of the combatant, either slow or fast.
     */
    turnSpeed: new foundry.data.fields.StringField({
        required: true,
        blank: false,
        initial: TurnSpeed.Slow,
        choices: [TurnSpeed.Slow, TurnSpeed.Fast],
    }),

    /**
     * Whether or not the combatant has acted this turn.
     */
    activated: new foundry.data.fields.BooleanField({
        required: true,
        initial: false,
    }),

    /**
     * Whether or not the boss combatant has acted on its fast turn.
     * This is only used for boss adversaries.
     */
    bossFastActivated: new foundry.data.fields.BooleanField({
        required: false,
    }),

    linkedCombatantIds: new foundry.data.fields.ArrayField(
        new foundry.data.fields.StringField(),
        { required: false },
    ),

    //TODO: Make these all strongly typed

    actionsAvailableGroups: new foundry.data.fields.ArrayField(
        new foundry.data.fields.ObjectField(),
        {required: true}
    ),

    reactionsAvailable: new foundry.data.fields.ArrayField(
        new foundry.data.fields.ObjectField(),
        {required: true}
    ),

    actionsUsed: new foundry.data.fields.ArrayField(
        new foundry.data.fields.ObjectField(),
        {required: true}
    ),

    reactionsUsed: new foundry.data.fields.ArrayField(
        new foundry.data.fields.ObjectField(),
        {required: true}
    ),

    freeActionsUsed: new foundry.data.fields.ArrayField(
        new foundry.data.fields.ObjectField(),
        {required: true}
    ),

    specialActionsUsed: new foundry.data.fields.ArrayField(
        new foundry.data.fields.ObjectField(),
        {required: true}
    ),

});

export type CombatantDataSchema = ReturnType<typeof SCHEMA>;

export class CombatantDataModel extends foundry.abstract.TypeDataModel<
    CombatantDataSchema,
    CosmereCombatant
> {
    static defineSchema() {
        return SCHEMA();
    }
}
