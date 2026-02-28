// System Imports
import { CosmereItem } from "@system/documents";
// import { ActionGroupDataModel, ActionGroupDataSchema } from "../data/combatant/action-group";

// Module Imports

export class UsedAction{
    declare cost: number
    declare name: string
    declare actionGroupUsedFromName?: string
    constructor(cost: number, name?: string, actionGroupName?: string){
        this.cost = cost;
        this.actionGroupUsedFromName = actionGroupName ?? "base";
        this.name = name ?? game.i18n!.localize(`cosmere-advanced-encounters.cost_manual`);
    }

    static DeserializeArray(inputArray: any): UsedAction[]{
        var outputArray: UsedAction[] = [];
        for(const item of inputArray){
            outputArray.push(new UsedAction(item.cost, item.name, item.actionGroupUsedFromName));
        }
        return outputArray;
    }

    static SerializeArray(inputArray: UsedAction[]): Array<any>{
        var outputArray = [];
        for(const item of inputArray){
            outputArray.push(item.Serialize());
        }
        return outputArray;
    }

    private Serialize(): any{
        return {
            cost: this.cost,
            name: this.name,
            actionGroupUsedFromName: this.actionGroupUsedFromName,
        }
    }
}

export type ActionIsInGroupFunc = (action: CosmereItem | UsedAction) => boolean;

export class ActionGroup{
    declare max: number;
    declare remaining: number;
    declare used: number;
    declare name: string;
    declare actionIsInGroup?: ActionIsInGroupFunc;
    constructor(count: number, name : string, actionIsInGroup? : ActionIsInGroupFunc, remaining?: number){
        this.max = count;
        this.remaining = remaining ?? count;
        this.used = this.max - this.remaining;
        this.name = name;
        this.actionIsInGroup = actionIsInGroup;
    }

    static DeserializeArray(inputArray: any): ActionGroup[]{
        var outputArray: ActionGroup[] = [];
        for(const item of inputArray){
            outputArray.push(new ActionGroup(item.max, item.name, item.actionIsInGroupFunc, item.remaining));
        }
        return outputArray;
    }

    static SerializeArray(inputArray: ActionGroup[]): Array<any>{
        var outputArray = [];
        for(const item of inputArray){
            outputArray.push(item.Serialize());
        }
        return outputArray;
    }

    private Serialize(): any{
        return {
            max: this.max,
            remaining: this.remaining,
            used: this.used,
            name: this.name,
        }
    }

    public useAction(usedAction: UsedAction){
        let tempUsed = this.used += usedAction.cost;
        this.used = (tempUsed < 0) ? 0 : (tempUsed > 3) ? 3 : tempUsed;
        this.recalculateRemaining();
        usedAction.actionGroupUsedFromName = this.name;
    }

    public recalculateRemaining(){
        let tempRemaining = this.max - this.used;
        this.remaining = (tempRemaining < 0) ? 0 : (tempRemaining > 3) ? 3 : tempRemaining;
    }

    public removeAction(usedAction: UsedAction){
        let tempUsed = this.used - usedAction.cost;
        this.used = (tempUsed < 0) ? 0 : (tempUsed > 3) ? 3 : tempUsed;
        this.recalculateRemaining();
        usedAction.actionGroupUsedFromName = this.name;
    }
}