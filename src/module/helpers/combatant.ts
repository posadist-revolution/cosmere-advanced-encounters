import { AdvancedCosmereCombatant } from "@module/documents/combatant";
import { CosmereActor, CosmereItem } from "@system/documents";
import { ActionCostType, AdversaryRole, TurnSpeed } from "@system/types/cosmere";
import { MODULE_ID } from "../constants";

export async function getCombatantForAction(actor: CosmereActor, item?: CosmereItem): Promise<AdvancedCosmereCombatant | undefined>{
    if(!game.combat){
        return undefined;
    }
    var combatant = game.combat.combatant;
    var actorCombatants = game.combat.getCombatantsByActor(actor)!;
    if(combatant && (combatant.actorId === actor.id)){
        return combatant;
    }
    combatant = actorCombatants[0];

    var turnSpeed: TurnSpeed | string;
    if(actor.isAdversary()){
        // If this is an action being used by a boss actor without it being that boss's turn,
        // we need to prompt and see which turn this action should be used from.
        if(actor.system.role === AdversaryRole.Boss){
            game.combat.lastBossTurnSpeed = combatant?.turnSpeed!;
            if(!(item && item.system.activation.cost.type == ActionCostType.Reaction)){
                // TODO: Add a setting to automatically use off-turn if off-turn
                turnSpeed = await promptBossSpeed();
                game.combat.lastBossTurnSpeed = turnSpeed;
                if(turnSpeed == "offTurn"){
                    // Always allow using actions off-turn
                    return undefined;
                }
                else{
                    combatant = actorCombatants.find((filterCombatant) => {return filterCombatant.turnSpeed == turnSpeed})!;
                }
            }
        }
    }
    return combatant;
}

async function promptBossSpeed(): Promise<TurnSpeed | "offTurn">{
    let bossSpeed = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n?.format(`${MODULE_ID}.prompts.bossTurnSpeedSelect.content`) },
        content: `<p>${game.i18n?.format(`${MODULE_ID}.prompts.bossTurnSpeedSelect.content`)}</p>`,
        // This example does not use i18n strings for the button labels,
        // but they are automatically localized.
        buttons: [
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.fast`,
                action: TurnSpeed.Fast,
            },
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.slow`,
                action: TurnSpeed.Slow,
            },
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.offTurn`,
                action: "offTurn",
            },
        ]
    }) as TurnSpeed | "offTurn";
    return bossSpeed;
}