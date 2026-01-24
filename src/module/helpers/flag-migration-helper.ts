import { MODULE_ID } from "../constants";
import { ActionGroup, CombatantActions, UsedAction } from "../documents/combatant_actions";

export async function migrateFlags(combatantActions: CombatantActions){

    let combatant = combatantActions.combatant;
    let previousDataVersion = await combatant.getFlag(MODULE_ID, "flags_initialized_version");
    let updateData;

    // Setup updateData for the current version
    if(combatant.isBoss){
        updateData = {
            flags: {
                [MODULE_ID]: {
                    ["flags_initialized_version"]: game.modules?.get(MODULE_ID)?.version,
                    ["bossFastActionsAvailableGroups"]: {},
                    ["bossFastActionsUsed"]: {},
                    ["bossFastFreeActionsUsed"]: {},
                    ["bossFastSpecialActionsUsed"]: {},
                    ["actionsAvailableGroups"]: {},
                    ["actionsUsed"]: {},
                    ["freeActionsUsed"]: {},
                    ["specialActionsUsed"]: {},
                    ["reactionsAvailable"]: {},
                    ["reactionsUsed"]: {}
                }
            }
        };
    }

    else{
        updateData = {
            flags: {
                [MODULE_ID]: {
                    ["flags_initialized_version"]: game.modules?.get(MODULE_ID)?.version,
                    ["actionsAvailableGroups"]: {},
                    ["actionsUsed"]: {},
                    ["freeActionsUsed"]: {},
                    ["specialActionsUsed"]: {},
                    ["reactionsAvailable"]: {},
                    ["reactionsUsed"]: {}
                }
            }
        }
    }


    /* Previous flag configs:
    Version 0.3.0:
        bossFastActionsUsed: any;
        bossFastActionsOnTurn: number;
        actionsUsed: UsedAction[];
        reactionUsed: boolean;
        actionsOnTurn: number;
        flags_initialized_version: string;
    */
    if(previousDataVersion == "0.3.0"){
        if(combatant.isBoss){
            //Set bossFastActionsUsed
            let bossFastActionsUsed: UsedAction[];
            bossFastActionsUsed = await combatant.getFlag(MODULE_ID, "bossFastActionsUsed");
            updateData.flags[MODULE_ID].bossFastActionsUsed = bossFastActionsUsed;

            //Set bossFastActionsAvailableGroups and unset bossFastActionsOnTurn
            let bossFastUsedActionCount = 0;
            for(const usedAction of bossFastActionsUsed){
                bossFastUsedActionCount += usedAction.cost;
            }
            let bossFastActionsAvailableGroups = [new ActionGroup(2, "base")];
            bossFastActionsAvailableGroups[0].used += bossFastUsedActionCount;
            bossFastActionsAvailableGroups[0].remaining -= bossFastUsedActionCount;
            updateData.flags[MODULE_ID].bossFastActionsAvailableGroups = bossFastActionsAvailableGroups;
            await combatant.unsetFlag(MODULE_ID, "bossFastActionsOnTurn");
        }

        //Set actionsUsed
        let actionsUsed: UsedAction[] = await combatant.getFlag(MODULE_ID, "actionsUsed");
        updateData.flags[MODULE_ID].actionsUsed = actionsUsed;

        //Set actionsAvailableGroups and unset actionsOnTurn
        let usedActionCount = 0;
        for(const usedAction of actionsUsed){
            usedActionCount += usedAction.cost;
        }
        let actionsOnTurn: number = await combatant.getFlag(MODULE_ID, "actionsOnTurn");
        let actionsAvailableGroups = [new ActionGroup(actionsOnTurn, "base")];
        actionsAvailableGroups[0].used += usedActionCount;
        actionsAvailableGroups[0].remaining -= usedActionCount;
        updateData.flags[MODULE_ID].actionsAvailableGroups = actionsAvailableGroups;
        await combatant.unsetFlag(MODULE_ID, "actionsOnTurn");

        //Get reactionUsed
        let reactionUsed: boolean = await combatant.getFlag(MODULE_ID, "reactionUsed");
        await combatant.unsetFlag(MODULE_ID, "reactionUsed");

        //Set reactionsAvailable and reactionUsed
        let reactionsAvailable = [new ActionGroup(1, "base")];
        if(reactionUsed){
            updateData.flags[MODULE_ID].reactionsUsed = [new UsedAction(1)];
            reactionsAvailable[0].used = 1;
            reactionsAvailable[0].remaining = 0;
        }
        updateData.flags[MODULE_ID].reactionsAvailable = reactionsAvailable;
    }

    //Push new flags out
    combatantActions.updateDataWithCombatTurn(updateData);
}