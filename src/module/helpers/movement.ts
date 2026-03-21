import { CosmereActor, CosmereItem } from "@src/declarations/cosmere-rpg/documents";
import { MovementType } from "@src/declarations/cosmere-rpg/types/cosmere";
import { AdvancedCosmereCombatant } from "../documents/combatant";
import { MODULE_ID } from "../constants";

interface ActionMovement {
    movementType: MovementType | "blink";
    distance: SentenceMoveData;
}

interface SentenceMoveData {
    movementType?: MovementType | "blink";
    rate?: "moveRate" | "halfRate";
    feet?: number;
}

export interface QueuedMoveData {
    moveData: Omit<TokenDocument.MovementData, "user" | "state">;
    combatantId: string;
}

function getMovementOfItem(combatant: AdvancedCosmereCombatant, item: CosmereItem): ActionMovement | undefined{
    console.log("Checking item for movement: ");
    console.log(item);
    let desc: string = item.system.description.value;
    let sentences = desc.toLocaleLowerCase().split(". ");
    for(const sentence of sentences){
        let sentenceMoveData = getSentenceMove(sentence);
        if(sentenceMoveData){
            return {
                movementType: sentenceMoveData.movementType ?? (combatant.token?.movementAction! as MovementType | "blink"),
                distance: sentenceMoveData
            }
        }
    }
    return undefined
}

function getSentenceMove(sentence: string): SentenceMoveData | undefined{
    // A list of everything I've seen this succeed for:
    // Move
    // Disengage
    // Skate
    // Axehound Bite
    // Veth's "Exploit Advantage"
    // Khornak's "Drag"

    // A list of everything I have seen this parsing fail for:
    // Warpair Coordination
    // Dive Bomb
    // Avoid Danger?
    // Eyes of Pala Agent "Quick Escape"

    let retMoveData: SentenceMoveData = {};
    if(!sentence.includes("move") || sentence.startsWith("if")){
        return undefined
    }
    const pattern = /(?<rate>(?:half\s+)?movement\s+rate)|(?<feet>\d+)\s*feet/gi;
    for(const match of sentence.matchAll(pattern)){
        if(match.groups?.rate){
            retMoveData.rate = "moveRate"
        }
        else if (match.groups?.feet){
            retMoveData.feet = parseInt(match.groups.feet);
        }
    }
    if(!retMoveData.feet && !retMoveData.rate){
        return undefined;
    }
    return retMoveData;
}

export async function applyMovementFromItem(combatant: AdvancedCosmereCombatant, item: CosmereItem){
    //TODO: Reset movement if this item isn't a move item, unless the actor has the mobile feature or equivalent
    let actionMovement = getMovementOfItem(combatant, item);
    if(!actionMovement) return;
    let remainingMovement = combatant.getFlag(MODULE_ID, "remainingMovementFromLastAction");
    let distanceToMove = 0;
    if(actionMovement.distance.feet){
        distanceToMove = actionMovement.distance.feet;
        console.log(`We think that the action ${item.name} allows you to move ${distanceToMove} feet`);
    }
    else if(actionMovement.distance.rate){
        distanceToMove = combatant.actor.system.movement[actionMovement.movementType].rate.value;
        console.log(`We think that the action ${item.name} allows you to move up to movement rate, which is ${distanceToMove} feet`);
    }
    remainingMovement[actionMovement.movementType] += distanceToMove;
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
    const defaultRemainingMovementFromLastAction = {
        [MovementType.Walk]: 0,
        [MovementType.Swim]: 0,
        [MovementType.Fly]: 0,
        ['blink']: 0,
    }
    await combatant.setFlag(MODULE_ID, "remainingMovementFromLastAction", defaultRemainingMovementFromLastAction);
}