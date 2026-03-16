import { MODULE_ID } from '@src/module/constants';
import { AdvancedCosmereCombat } from '@src/module/documents/combat';
import { AdvancedCosmereCombatant } from '@src/module/documents/combatant';
import { UsedAction } from '@src/module/documents/used-action';
import { hookRanWithParamWithProperty, pullActionsHookRanForCombatantsAfterCall } from './hook-ran';

export * from './combat-setup';
export * from './hook-ran';
export * from './test-hooks';


export var helperCombatant: AdvancedCosmereCombatant;
export var helperCombatant2: AdvancedCosmereCombatant;
export var helperCombat: AdvancedCosmereCombat;
export var hookWatchedIds: string[];

export function setHelperCombat(combat: AdvancedCosmereCombat){
    helperCombat = combat;
}

export function setHelperCombatant(combatant: AdvancedCosmereCombatant){
    helperCombatant = combatant;
}

export function setHelperCombatant2(combatant: AdvancedCosmereCombatant){
    helperCombatant2 = combatant;
}

export function setHookWatchedIds(ids: string[]){
    hookWatchedIds = ids;
}

export function getRemainingBaseActions(){
    return helperCombatant.actionsAvailableGroups[0].remaining
}

export function getRemainingBaseActions2(){
    return helperCombatant2.actionsAvailableGroups[0].remaining
}

export function getRemainingBaseReactions(){
    return helperCombatant.reactionsAvailable[0].remaining
}

export function getRemainingBaseReactions2(){
    return helperCombatant2.reactionsAvailable[0].remaining

}


export function useOneAction(){
    helperCombatant.useAction(new UsedAction(1));
}

export function useTwoActions(){
    helperCombatant.useAction(new UsedAction(2));
}

export function useThreeActions(){
    helperCombatant.useAction(new UsedAction(3));
}

export function useReaction(){
    helperCombatant.useReaction(new UsedAction(1));
}

export async function startTurn(){
    await helperCombat.setCurrentTurnFromCombatant(helperCombatant);
}

export async function endTurn(){
    await helperCombat.nextTurn();
}

export async function nextRound(){
    await helperCombat.nextRound();
}

export async function helperCombatantActionsUpdateDone(){
    let done = await hookRanWithParamWithProperty("updateCombatant",[{paramExpectedIndex: 1, properties:[{key: `flags.${MODULE_ID}`}, {key: "_id", value: helperCombatant.id}]}]);
    if(!done){
        console.log("Update combatant actions didn't run!");
    }
    return;
}

export function actVals() {
    return [getRemainingBaseActions(), getRemainingBaseReactions()]
}

export function actValsBoth() {
    return [getRemainingBaseActions(), getRemainingBaseReactions(), getRemainingBaseActions2(), getRemainingBaseReactions2()]
}

export async function pullActionsDoneAfterFunc(fn: Function){

    let promise = pullActionsHookRanForCombatantsAfterCall(hookWatchedIds, fn);
    let valArray = (await promise).map((result) => {return (result as PromiseFulfilledResult<boolean>).value});
    return valArray;
}

export function findOtherBossCombatant(){
    helperCombatant2 = helperCombat.combatants?.find((combatant) => {
        return combatant.turnSpeed !== helperCombatant.turnSpeed && combatant.isBoss && combatant.actorId === helperCombatant.actorId
    })!;
}