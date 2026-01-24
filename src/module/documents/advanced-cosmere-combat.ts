import { activeCombat, Dictionary } from "@src/index";
import { CombatantActions } from "./combatant_actions.mjs";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "../settings";

export class AdvancedCosmereCombat{
    readonly combat : Combat
    actorIdToCombatantActionsListMap: Dictionary<string[]>;
    combatantIdToCombatantActionsMap: Map<string, CombatantActions>;

    constructor(combat: Combat){
        this.combat = combat;
        this.actorIdToCombatantActionsListMap = {};
        this.combatantIdToCombatantActionsMap = new Map<string, CombatantActions>();
        for (const combatant of combat.combatants){
            this.addNewCombatantToCombat(combatant);
        }
    }

    registerActorCombatantActions(combatantActions : CombatantActions){
        const combatant = combatantActions.combatant;
        if(!this.actorIdToCombatantActionsListMap[combatant.actor.id]){
            this.actorIdToCombatantActionsListMap[combatant.actor.id] = [combatant.id!];
        }
        else if(!this.actorIdToCombatantActionsListMap[combatant.actor.id]?.includes(combatant.id!))
        {
            this.actorIdToCombatantActionsListMap[combatant.actor.id].push(combatant.id!);
        }
    }

    public addNewCombatantToCombat(combatant: CosmereCombatant){
        let combatantActions = new CombatantActions(combatant);
        this.registerActorCombatantActions(combatantActions);
        this.combatantIdToCombatantActionsMap.set(combatant.id!, combatantActions);
    }

    public getCombatantActionsByCombatantId(combatantId: string){
        return this.combatantIdToCombatantActionsMap.get(combatantId);
    }

    public resetAllCombatantActions(){
        for (const combatantActions of this.combatantIdToCombatantActionsMap.values()){
            combatantActions.resetAllCombatantTurnActions();
        }
    }
}

Hooks.on("combatRound", () => {
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.roundStart){
        return;
    }
    activeCombat.resetAllCombatantActions();
});