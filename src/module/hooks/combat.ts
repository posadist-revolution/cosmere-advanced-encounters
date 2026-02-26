import { getModuleSetting, SETTINGS, RefreshCombatantActionsWhenOptions } from "@module/settings";
import { AdvancedCosmereCombat } from "../documents/combat";


Hooks.on("combatRound", (
    combat: AdvancedCosmereCombat,
) => {
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.roundStart){
        return;
    }
    combat.resetAllCombatantActions();
});