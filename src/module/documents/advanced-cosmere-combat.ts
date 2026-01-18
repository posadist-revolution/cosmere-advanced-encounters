import { activeCombat, Dictionary } from "@src/index";
import { CombatantActions } from "./combatant_actions.mjs";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";

export class AdvancedCosmereCombat{
    readonly combat : Combat
    actorIdToCombatantActionsListMap: Dictionary<string[]>;
    combatantActionsMap: Dictionary<CombatantActions>;

    constructor(combat: Combat){
        this.combat = combat;
        this.actorIdToCombatantActionsListMap = {};
        this.combatantActionsMap = {};
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
        this.combatantActionsMap[combatant.id!] = combatantActions;
    }
}

Hooks.on("combatRound", () => {

});