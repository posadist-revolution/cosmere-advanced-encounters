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


    // In the future, this should probably be based on actorCombatants.length > 1
    var turnSpeed: TurnSpeed | string;
    if(actor.isAdversary()){
        // If this is an action being used by a boss actor without it being that boss's turn,
        // we need to prompt and see which turn this action should be used from.
        if(actor.system.role === AdversaryRole.Boss){
            if(!(item && item.system.activation.cost.type == ActionCostType.Reaction)){
                // TODO: Add a setting to automatically use off-turn if off-turn
                turnSpeed = await promptBossSpeed(actorCombatants, item!);
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

async function promptBossSpeed(combatants: AdvancedCosmereCombatant[], item: CosmereItem): Promise<TurnSpeed | "offTurn">{
    var buttons = [];
    if(combatants[0].actor.system.resources.foc.value > 0){
        buttons.push(
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.offTurn`,
                action: "offTurn",
            });
    }
    for(const combatant of combatants){
        if(combatant.canUseItem(item)){
            let newButton =
            {
                label: `${MODULE_ID}.prompts.bossTurnSpeedSelect.${combatant.turnSpeed}`,
                action: combatant.turnSpeed,
            }
            buttons.push(newButton);
        }
    }
    if(buttons.length == 1){
        return buttons[0].action as TurnSpeed | "offTurn";
    }

    let bossSpeed = await foundry.applications.api.DialogV2.wait({
        window: { title: game.i18n?.format(`${MODULE_ID}.prompts.bossTurnSpeedSelect.content`) },
        content: `<p>${game.i18n?.format(`${MODULE_ID}.prompts.bossTurnSpeedSelect.content`)}</p>`,
        // This example does not use i18n strings for the button labels,
        // but they are automatically localized.
        buttons: buttons
    }) as TurnSpeed | "offTurn";
    return bossSpeed;
}