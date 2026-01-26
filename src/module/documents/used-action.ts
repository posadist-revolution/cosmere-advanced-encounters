import { CosmereItem } from "@src/declarations/cosmere-rpg/documents/item";

export class UsedAction{
    declare cost: number
    declare name: string
    declare actionGroupUsedFromName?: string
    constructor(cost: number, name?: string, actionGroupName?: string){
        this.cost = cost;
        this.actionGroupUsedFromName = actionGroupName ?? "base";
        this.name = name ?? game.i18n!.localize(`cosmere-advanced-encounters.cost_manual`);
    }
}

export type ActionIsInGroupFunc = (action: CosmereItem | UsedAction) => boolean;

export class ActionGroup{
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