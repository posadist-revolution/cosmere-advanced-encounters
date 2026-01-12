import { Dictionary } from "@src/index";
import { CombatantActions } from "./combatant_actions.mjs";

export class AdvancedCosmereCombat{
    readonly combat : Combat
    actorIdToCombatantActionsListMap: Dictionary<string[]>;
    combatantActionsMap: Dictionary<CombatantActions>;

    constructor(combat: Combat){
        this.combat = combat;
        this.actorIdToCombatantActionsListMap = {};
        this.combatantActionsMap = {};
        for (const combatant of combat.combatants){
            let combatantActions = new CombatantActions(combatant);
            this.register_actor_combatant_actions(combatantActions);
            this.combatantActionsMap[combatant.id] = combatantActions;
        }
    }

    register_actor_combatant_actions(combatantActions : CombatantActions){
        const combatant = combatantActions.combatant;
        if(!this.actorIdToCombatantActionsListMap[combatant.actor.id]){
            this.actorIdToCombatantActionsListMap[combatant.actor.id] = [combatant.id];
        }
        else if(!this.actorIdToCombatantActionsListMap[combatant.actor.id]?.includes(combatant.id))
        {
            this.actorIdToCombatantActionsListMap[combatant.actor.id].push(combatant.id);
        }
    }
}