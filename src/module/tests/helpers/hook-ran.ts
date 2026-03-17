import { AdvancedCosmereCombatant } from "@src/module/documents/combatant";
import { TEST_HOOKS } from "./test-hooks";

const HOOK_TIMEOUT = 100;

export async function hookRan(hookName: Hooks.HookName){
    console.log(`Test waiting on hook: ${hookName}`);
    let done = false;
    return new Promise<boolean>((resolve, reject) => {
        let hookId = Hooks.on(hookName, (
            ...hookArgs: any[]
        ) => {
            console.log("Hook resolved with args:");
            console.log(hookArgs);
            done = true;
            resolve(true);
            Hooks.off(hookName, hookId);
        });
        setTimeout(function() {
            if(done) return;
            Hooks.off(hookName, hookId);
            resolve(false);
        }, HOOK_TIMEOUT);
    });
}

export async function hookRanAfterCall(hookName: Hooks.HookName, fn: Function, ...args: any){
    let hookRanPromise = hookRan(hookName);
    fn(args);
    return hookRanPromise;
}

export async function pullActionsHookRanForCombatantsAfterCall(combatantIds: string[], fn: Function, ...args: any){
    let promiseArray: Promise<boolean>[] = [];
    console.log(`Creating hook listeners for ${fn.name}`);
    for(const combatantId of combatantIds){
        promiseArray.push(pullActionsHookRanForCombatant(combatantId));
    }
    let hookRanPromise = Promise.allSettled(promiseArray);
    fn(args);
    return hookRanPromise;
}

export async function pullActionsHookRanForCombatant(combatantId: string){
    console.log(`Test waiting on hook: ${TEST_HOOKS.PULL_ACTIONS}`);
    let done = false;
    return new Promise<boolean>((resolve, reject) => {
        let hookId = Hooks.on(TEST_HOOKS.PULL_ACTIONS, (
            hookCombatantId: string
        ) => {
            if(hookCombatantId !== combatantId) return;
            console.log(`Hook ${hookId} resolved with: ${hookCombatantId}`);
            done = true;
            resolve(true);
            Hooks.off(TEST_HOOKS.PULL_ACTIONS, hookId);
        });
        setTimeout(function() {
            if(done) return;
            console.log(`Hook ${hookId} not resolved`);
            Hooks.off(TEST_HOOKS.PULL_ACTIONS, hookId);
            resolve(false);
        }, HOOK_TIMEOUT);
        console.log(`Setup hook: ${hookId}`);
    });
}

export async function baseActionsUsedHookRanForCombatant(combatantId: string){
    console.log(`Test waiting on hook: updateCombatant with base actions used update`);
    let done = false;
    return new Promise<boolean>((resolve, reject) => {
        let hookId = Hooks.on('updateCombatant', (
            combatant : AdvancedCosmereCombatant,
            change : Combatant.UpdateData,
            options : Combatant.Database.UpdateOptions,
            userId : string
        ) => {
            if(combatant.id !== combatantId){
                return;
            }
            if(!(change.system && change.system.actionsAvailableGroups))
            {
                return;
            }
            console.log(`Hook ${hookId} resolved with: ${combatant.id}`);
            done = true;
            resolve(true);
            Hooks.off('updateCombatant', hookId);
        });
        setTimeout(function() {
            if(done) return;
            console.log(`Hook ${hookId} not resolved`);
            Hooks.off('updateCombatant', hookId);
            resolve(false);
        }, HOOK_TIMEOUT);
        console.log(`Setup hook: ${hookId}`);
    });
}

export async function movementUpdateHookRanForCombatant(combatantId: string){
    console.log(`Test waiting on hook: updateCombatant with movement data update`);
    let done = false;
    return new Promise<boolean>((resolve, reject) => {
        let hookId = Hooks.on('updateCombatant', (
            combatant : AdvancedCosmereCombatant,
            change : Combatant.UpdateData,
            options : Combatant.Database.UpdateOptions,
            userId : string
        ) => {
            if(combatant.id !== combatantId){
                return;
            }
            if(!(change.flags && change.flags["cosmere-advanced-encounters"] && change.flags["cosmere-advanced-encounters"].remainingMovementFromLastAction))
            {
                return;
            }
            console.log(`Hook ${hookId} resolved with: ${combatant.id}`);
            done = true;
            resolve(true);
            Hooks.off('updateCombatant', hookId);
        });
        setTimeout(function() {
            if(done) return;
            console.log(`Hook ${hookId} not resolved`);
            Hooks.off('updateCombatant', hookId);
            resolve(false);
        }, HOOK_TIMEOUT);
        console.log(`Setup hook: ${hookId}`);
    });
}

export interface ParamWithProperty {
    paramExpectedIndex: number,
    properties: Array<
        {
            key: string,
            value?: any,
        }
    >
}

export async function hookRanWithParamWithProperty(hookName: Hooks.HookName, params: ParamWithProperty[]){
    console.log(`Test waiting on hook: ${hookName} with params:`);
    console.log(params);
    return new Promise<boolean>((resolve, reject) => {
        let hookId = Hooks.on(hookName, (
            ...hookArgs: any[]
        ) => {
            for(const param of params){
                let hookArg = hookArgs[param.paramExpectedIndex];
                if(!hookArg){
                    return;
                }
                for(const property of param.properties){
                    if(!foundry.utils.hasProperty(hookArg, property.key)){
                        return;
                    }
                    if(property.value && (property.value !== foundry.utils.getProperty(hookArg, property.key))){
                        return;
                    }
                }
            }
            console.log("Hook resolved with args:");
            console.log(hookArgs);
            resolve(true);
            Hooks.off(hookName, hookId);
        });
        setTimeout(function() {
            Hooks.off(hookName, hookId);
            resolve(false);
        }, HOOK_TIMEOUT);
    });
}