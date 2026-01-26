import { ActionGroup } from "@src/module/documents/action-group";

const SCHEMA = () => ({
});

export type ActionGroupDataSchema = ReturnType<typeof SCHEMA>;

export class ActionGroupDataModel extends foundry.abstract.TypeDataModel<
    ActionGroupDataSchema,
    ActionGroup
> {
    static defineSchema() {
        return SCHEMA();
    }
}
