import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, baseActionsUsedHookRanForCombatant, createTestCombat, helperCombatant, hookRanWithParamWithProperty, movementUpdateHookRanForCombatant, pullActionsDoneAfterFunc, pullActionsHookRanForCombatant, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions } from "../helpers";
import { ActorType, AdversaryRole, MovementType, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { BasicMoveActionWhenOptions, CheckActionUsabilityOptions, getAllModuleSettings, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { InexactPartial } from "@league-of-foundry-developers/foundry-vtt-types/utils";

declare const enum EXAMPLE_ITEM_UUIDS {
    move = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.UEGVL0QnZ6UelxxZ', // 1 action
}

function useItem(uuid: EXAMPLE_ITEM_UUIDS){
    helperCombatant.actor.useItem(fromUuidSync(uuid));
}

function useMove(){
    useItem(EXAMPLE_ITEM_UUIDS.move);
}

function moveRemaining(){
    return helperCombatant.getFlag(MODULE_ID, "remainingMovementFromLastAction")[helperCombatant.token?.movementAction as MovementType | "blink"];
}

function moveSouthWaypoint(gridDist: number = 1){
    let dist = gridDist * game.scenes?.active?.grid.size!;
    let nextWaypoint: InexactPartial<TokenDocument.MovementWaypoint> = {
        x: currPos()?.x!,
        y: currPos()?.y! + dist,
        action: (helperCombatant.token?.movementAction! as MovementType | "blink"),
    }
    return nextWaypoint
}

function currPos(){

    return {
        x: (helperCombatant.token?.x! / game.scenes?.active?.grid.size!),
        y: (helperCombatant.token?.y! / game.scenes?.active?.grid.size!)
    }
}

async function moveDone(waypoints: InexactPartial<TokenDocument.MovementWaypoint> | InexactPartial<TokenDocument.MovementWaypoint>[], options?: InexactPartial<TokenDocument.MoveOptions>, expectAction?: boolean){
    let promiseArray: Promise<boolean>[] = [];
    if(expectAction){
        promiseArray.push(baseActionsUsedHookRanForCombatant(helperCombatant.id!))
    }
    // Await movementLeft update
    promiseArray.push(movementUpdateHookRanForCombatant(helperCombatant.id!));
    // Await refreshToken at the end of the movement
    promiseArray.push(hookRanWithParamWithProperty("refreshToken", [{paramExpectedIndex: 1, properties:[{key: `refreshPosition`, value: true}]}]));
    // Await move call itself being done
    promiseArray.push(helperCombatant.token?.move(waypoints, options)!);
    let hookRanPromise = Promise.allSettled(promiseArray);
    return hookRanPromise;
}

export function registerMovementTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.movement`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;

            describe("Movement suite", async function() {
                console.log("Registering Movement suite");
                let testCombat: TestCombat = {};
                let testCombatantOptions: TestCombatantOptions[] = [
                    {
                        actorType: ActorType.Character,
                        turnSpeed: TurnSpeed.Fast,
                    },
                    {
                        actorType: ActorType.Character,
                        turnSpeed: TurnSpeed.Slow,
                    },
                    {
                        actorType: ActorType.Adversary,
                        turnSpeed: TurnSpeed.Fast,
                    },
                    {
                        actorType: ActorType.Adversary,
                        turnSpeed: TurnSpeed.Slow,
                    },
                    {
                        actorType: ActorType.Adversary,
                        adversaryRole: AdversaryRole.Boss
                    }
                ];
                let currentSettings = getAllModuleSettings();

                beforeEach(async function() {
                    // CONFIG.debug.hooks = true;
                    testCombat = await createTestCombat(testCombatantOptions);
                    setHelperCombat(testCombat.combat!);
                });

                describe("Blocking movement", async function(){
                    it("Move off-turn", async function() {
                        await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                        await setModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN, BasicMoveActionWhenOptions.auto);
                        await setModuleSetting(SETTINGS.BLOCK_MOVE_WITHOUT_ACTION, true);
                        await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                        await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        let helperToken = helperCombatant.token!;

                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);
                        let nextWaypoint = moveSouthWaypoint();
                        let refreshDone = hookRanWithParamWithProperty("refreshToken", [{paramExpectedIndex: 1, properties:[{key: `refreshPosition`, value: true}]}]);
                        expect(helperToken?.move(nextWaypoint, {animate: false})).to.eventually.equal(true);
                        await refreshDone;

                        console.log("Current pos: ");
                        console.log(currPos());

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(1);
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);
                    });

                    it("Move 20 ft", async function() {
                        CONFIG.debug.hooks = true;
                        await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                        await setModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN, BasicMoveActionWhenOptions.auto);
                        await setModuleSetting(SETTINGS.BLOCK_MOVE_WITHOUT_ACTION, true);
                        await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                        await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        let helperToken = helperCombatant.token!;

                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        let nextWaypoint = moveSouthWaypoint();
                        await moveDone(nextWaypoint, {animate: false}, true);

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(1);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(15);

                        nextWaypoint = moveSouthWaypoint();
                        await moveDone(nextWaypoint, {animate: false});

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(2);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(10);

                        nextWaypoint = moveSouthWaypoint();
                        await moveDone(nextWaypoint, {animate: false});

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(3);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(5);

                        nextWaypoint = moveSouthWaypoint();
                        await moveDone(nextWaypoint, {animate: false});

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);
                    });

                    it("Move 25 ft", async function() {
                        await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                        await setModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN, BasicMoveActionWhenOptions.auto);
                        await setModuleSetting(SETTINGS.BLOCK_MOVE_WITHOUT_ACTION, true);
                        await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                        await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        let helperToken = helperCombatant.token!;

                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        let nextWaypoint = moveSouthWaypoint(4);
                        await moveDone(nextWaypoint, {animate: false}, true);

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);

                        nextWaypoint = moveSouthWaypoint(1);
                        await moveDone(nextWaypoint, {animate: false}, true);

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(5);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(15);
                    });

                });

                describe("Not blocking movement", async function(){

                });

                describe("", async function(){

                });

                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombat(testCombat as TestCombat);
                    await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Movement Tests` }
    );
}