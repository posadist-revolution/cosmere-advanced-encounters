import { getModuleSetting, SETTINGS, RefreshCombatantActionsWhenOptions } from "@module/settings";
import { AdvancedCosmereCombat } from "../documents/combat";


export function activateCombatHooks(){
    Hooks.on("combatRound", async (
        combat: AdvancedCosmereCombat,
    ) => {
        if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.roundStart){
            return;
        }
        await combat.resetAllCombatantActions();
    });
}