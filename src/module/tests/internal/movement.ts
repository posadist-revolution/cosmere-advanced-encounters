import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, baseActionsUsedHookRanForCombatant, createTestCombat, helperCombatant, hookRanWithParamWithProperty, movementUpdateHookRanForCombatant, pullActionsDoneAfterFunc, pullActionsHookRanForCombatant, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions } from "../helpers";
import { ActorType, AdversaryRole, MovementType, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { BasicMoveActionWhenOptions, CheckActionUsabilityOptions, getAllModuleSettings, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { InexactPartial } from "@league-of-foundry-developers/foundry-vtt-types/utils";

declare const enum EXAMPLE_ITEM_UUIDS {
    move = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.UEGVL0QnZ6UelxxZ', // 1 action
}

interface MoveDoneHookResults {
    actionsUsedHook?: boolean,
    moveUpdatesHook: boolean,
    refreshTokenHook: boolean,
    firstMoveSuccess: boolean,
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
    let nextWaypoint: InexactPartial<TokenDocument.MovementWaypoint> = {
        x: currPos()?.x! * game.scenes?.active?.grid.size!,
        y: (currPos()?.y! + gridDist) * game.scenes?.active?.grid.size!,
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

async function moveDone(
    waypoints: InexactPartial<TokenDocument.MovementWaypoint> | InexactPartial<TokenDocument.MovementWaypoint>[],
    options?: InexactPartial<TokenDocument.MoveOptions>,
    actionsExpected: number = 0
) {
    let promiseArray: Promise<boolean>[] = [];
    if(actionsExpected > 0){
        promiseArray.push(baseActionsUsedHookRanForCombatant(helperCombatant.id!, actionsExpected))
    }
    // Await movementLeft update
    promiseArray.push(movementUpdateHookRanForCombatant(helperCombatant.id!, actionsExpected + 1));
    // Await refreshToken at the end of the movement
    promiseArray.push(hookRanWithParamWithProperty("refreshToken", [{paramExpectedIndex: 1, properties:[{key: `refreshPosition`, value: true}]}]));
    // Await move call itself being done
    promiseArray.push(helperCombatant.token?.move(waypoints, options)!);
    let hookRanPromise = Promise.allSettled(promiseArray);
    let valArray = (await hookRanPromise).map((result) => {return (result as PromiseFulfilledResult<boolean>).value});
    let i = 0;
    let results: MoveDoneHookResults;
    if(actionsExpected > 0){
        results = {
            actionsUsedHook: valArray[0],
            moveUpdatesHook: valArray[1],
            refreshTokenHook: valArray[2],
            firstMoveSuccess: valArray[3]
        }
    }
    else{
        results = {
            moveUpdatesHook: valArray[0],
            refreshTokenHook: valArray[1],
            firstMoveSuccess: valArray[2]
        }
    }
    return results;
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
                    beforeEach(async function() {
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
                    });

                    it("Move off-turn", async function() {
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
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use 1 action and succeed
                        let nextWaypoint = moveSouthWaypoint();
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");


                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(1);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(15);

                        // Move 1 square down (5 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(2);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(10);

                        // Move 1 square down (5 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(3);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(5);

                        // Move 1 square down (5 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);
                    });

                    it("Move 25 ft", async function() {
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 4 squares down (20 feet), expect to use 1 action and succeed
                        let nextWaypoint = moveSouthWaypoint(4);
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use 1 action and succeed
                        nextWaypoint = moveSouthWaypoint(1);
                        expectedResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(5);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(15);
                    });

                    it("Move 35 feet in 1 move, check 2 action usages", async function() {
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 7 squares down (35 feet), expect to use 2 actions and succeed
                        let nextWaypoint = moveSouthWaypoint(7);
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 2)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(7);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(5);
                    });

                    it("Move 40 feet, check further movement is blocked", async function() {
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 4 squares down (20 feet), expect to use 1 action and succeed
                        let nextWaypoint = moveSouthWaypoint(4);
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 8 squares down (40 feet), expect to use 1 action and fail
                        nextWaypoint = moveSouthWaypoint(8);
                        expectedResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: false,
                            refreshTokenHook: false,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(20);

                        // Move 4 squares down (20 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint(4);
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(8);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(0);
                    });

                });

                describe("Not blocking movement", async function(){
                    beforeEach(async function() {
                        await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                        await setModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN, BasicMoveActionWhenOptions.auto);
                        await setModuleSetting(SETTINGS.BLOCK_MOVE_WITHOUT_ACTION, false);
                        await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                        await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                    });

                    it("Move off-turn", async function() {
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
                        let helperToken = helperCombatant.token!;

                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use 1 action and succeed
                        let nextWaypoint = moveSouthWaypoint();
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");


                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(1);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(15);

                        // Move 1 square down (5 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(2);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(10);

                        // Move 1 square down (5 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(3);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(5);

                        // Move 1 square down (5 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);
                    });

                    it("Move 25 ft", async function() {
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 4 squares down (20 feet), expect to use 1 action and succeed
                        let nextWaypoint = moveSouthWaypoint(4);
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use 1 action and succeed
                        nextWaypoint = moveSouthWaypoint(1);
                        expectedResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(5);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(15);
                    });

                    it("Move 35 feet in 1 move, check 2 action usages", async function() {
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 7 squares down (35 feet), expect to use 2 actions and succeed
                        let nextWaypoint = moveSouthWaypoint(7);
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 2)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(7);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(5);
                    });

                    it("Move 40 feet, check further movement is NOT blocked", async function() {
                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 4 squares down (20 feet), expect to use 1 action and succeed
                        let nextWaypoint = moveSouthWaypoint(4);
                        let expectedResults: MoveDoneHookResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(4);
                        expect(actVals()).to.deep.equal([1, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 8 squares down (40 feet), expect to use 1 action and succeed
                        nextWaypoint = moveSouthWaypoint(8);
                        expectedResults = {
                            actionsUsedHook: true,
                            moveUpdatesHook: false,
                            refreshTokenHook: true,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false}, 1)).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(12);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(20);

                        // Move 4 squares down (20 feet), expect to use no action and succeed
                        nextWaypoint = moveSouthWaypoint(4);
                        expectedResults = {
                            moveUpdatesHook: true,
                            refreshTokenHook: true,
                            firstMoveSuccess: true
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(16);
                        expect(actVals()).to.deep.equal([0, 1]);
                        expect(moveRemaining()).to.equal(0);
                    });

                });

                describe("Auto-use Move action never", async function(){

                    beforeEach(async function() {
                        await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                        await setModuleSetting(SETTINGS.BASIC_MOVE_ACTION_WHEN, BasicMoveActionWhenOptions.never);
                        await setModuleSetting(SETTINGS.BLOCK_MOVE_WITHOUT_ACTION, true);
                        await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                        await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                    });

                    it("Move off-turn", async function() {
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
                        let helperToken = helperCombatant.token!;

                        console.log("Starting location:");
                        let startPos = currPos();
                        console.log(startPos);
                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);

                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use no action and fail
                        let nextWaypoint = moveSouthWaypoint();
                        let expectedResults: MoveDoneHookResults = {
                            moveUpdatesHook: false,
                            refreshTokenHook: false,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use no action and fail
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: false,
                            refreshTokenHook: false,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use no action and fail
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: false,
                            refreshTokenHook: false,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                        // Move 1 square down (5 feet), expect to use no action and fail
                        nextWaypoint = moveSouthWaypoint();
                        expectedResults = {
                            moveUpdatesHook: false,
                            refreshTokenHook: false,
                            firstMoveSuccess: false
                        }
                        expect(await moveDone(nextWaypoint, {animate: false})).to.deep.equal(expectedResults, "Unexpected hook calls");

                        expect(currPos().x).to.equal(0);
                        expect(currPos().y).to.equal(0);
                        expect(actVals()).to.deep.equal([2, 1]);
                        expect(moveRemaining()).to.equal(0);

                    });
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