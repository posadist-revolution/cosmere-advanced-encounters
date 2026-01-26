import { ActionGroupDataModel } from "../data/combatant/action-group";

export class ActionGroup extends foundry.data.fields.EmbeddedDataField<ActionGroupDataModel>{
    declare max: number;
    declare remaining: number;
    declare used: number;
    declare name: string;
    declare actionIsInGroup?: ActionIsInGroupFunc;
    constructor(count: number, name : string, actionIsInGroup? : ActionIsInGroupFunc){
        this.max = count;
        this.remaining = count;
        this.used = 0;
        this.name = name;
        this.actionIsInGroup = actionIsInGroup;
    }
}