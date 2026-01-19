import { activeCombat, Dictionary } from "@src/index";
import { CombatantActions } from "./combatant_actions.mjs";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";

export class AdvancedCosmereCombat{
    readonly combat : Combat
    actorIdToCombatantActionsListMap: Dictionary<string[]>;
    combatantIdToActionsMap: Map<string, CombatantActions>;

    constructor(combat: Combat){
        this.combat = combat;
        this.actorIdToCombatantActionsListMap = {};
        this.combatantIdToActionsMap = new Map<string, CombatantActions>();
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
        this.combatantIdToActionsMap.set(combatant.id!, combatantActions);
    }

    public getCombatantActionsFromId(combatantId: string){
        return this.combatantIdToActionsMap.get(combatantId);
    }
}

Hooks.on("combatRound", () => {

});