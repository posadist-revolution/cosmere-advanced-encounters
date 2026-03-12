import { CosmereActor, CosmereItem } from "@src/declarations/cosmere-rpg/documents";
import { MovementType } from "@src/declarations/cosmere-rpg/types/cosmere";
import { AdvancedCosmereCombatant } from "../documents/combatant";
import { MODULE_ID } from "../constants";

interface ActionMovement {
    movementType: MovementType | "blink",
    distance: number
}
function getMovementOfItem(combatant: AdvancedCosmereCombatant, item: CosmereItem): ActionMovement | undefined{
    console.log("Checking item for movement: ");
    console.log(item);
    let desc: string = item.system.description.value;
    if(desc.toLocaleLowerCase().includes("move")){
        let retVal: ActionMovement = {
            movementType: combatant.token?.movementAction! as MovementType | "blink",
            distance: combatant.actor.system.movement[combatant.token?.movementAction!].rate.value
        }
        return retVal;
    }
    else return undefined
}

export async function applyMovementFromItem(combatant: AdvancedCosmereCombatant, item: CosmereItem){
    //TODO: Reset movement if this item isn't a move item, unless the actor has the mobile feature or equivalent
    let actionMovement = getMovementOfItem(combatant, item);
    if(!actionMovement) return;
    let remainingMovement = await combatant.getFlag(MODULE_ID, "remainingMovementFromLastAction");
    remainingMovement[actionMovement.movementType] += actionMovement.distance;
    await combatant.setFlag(MODULE_ID, "remainingMovementFromLastAction", remainingMovement);
}

export async function getDefaultMovementItemForType(actor: CosmereActor, movementType: MovementType | "blink"): Promise<CosmereItem | undefined>{
    switch(movementType){
        case MovementType.Walk:
            return (await fromUuid("Compendium.cosmere-rpg-stormlight-handbook.actions.Item.UEGVL0QnZ6UelxxZ")) as CosmereItem;

        case MovementType.Swim:
            return (await fromUuid("Compendium.cosmere-rpg-stormlight-handbook.actions.Item.UEGVL0QnZ6UelxxZ")) as CosmereItem;

        case MovementType.Fly:
            return (await fromUuid("Compendium.cosmere-rpg-stormlight-handbook.actions.Item.UEGVL0QnZ6UelxxZ")) as CosmereItem;

        case "blink":
            return undefined;
    }
}

export async function resetRemainingMovement(combatant: AdvancedCosmereCombatant){
    const defaultremainingMovementFromLastAction = {
        [MovementType.Walk]: 0,
        [MovementType.Swim]: 0,
        [MovementType.Fly]: 0,
        ['blink']: 0,
    }
    await combatant.setFlag(MODULE_ID, "remainingMovementFromLastAction", defaultremainingMovementFromLastAction);
}