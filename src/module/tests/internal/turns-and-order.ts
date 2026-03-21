import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, createTestCombat, endTurn, helperCombatant, hookRanAfterCall, nextRound, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions, useOneAction, useReaction, useThreeActions, useTwoActions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { getAllModuleSettings, getModuleSetting, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";


export function registerTurnsAndOrderTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.turns-and-order`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;
            describe("Turns and order suite", async function() {
                console.log("Registering combatant actions suite");
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
                    testCombat = await createTestCombat(testCombatantOptions);
                    setHelperCombat(testCombat.combat!);
                });

                it("Turn Start (setting true, slow turn)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    setHelperCombatant(slowCombatants[0]);
                    console.log("Testing slow combatant turn start with helperCombatant:");
                    console.log(helperCombatant);
                    setHookWatchedIds([helperCombatant.id!]);

                    expect(actVals()).to.deep.equal([3, 1]);
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");

                    // Use 1 action, start turn
                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);

                    // Use 2 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useTwoActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([1, 1]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);

                    // Use 3 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);

                    // Use 3 actions and reaction, start turn
                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 0]);
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);
                });

                it("Turn Start (setting false, slow turn)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.onlyManual);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    setHelperCombatant(slowCombatants[0]);
                    console.log("Testing slow combatant turn start with helperCombatant:");
                    console.log(helperCombatant);
                    setHookWatchedIds([helperCombatant.id!]);

                    expect(actVals()).to.deep.equal([3, 1]);
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");

                    // Use 1 action, start turn
                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);

                    // Use 2 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useTwoActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);

                    // Use 3 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);

                    // Use 3 actions and reaction, start turn
                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                    expect(await hookRanAfterCall("combatTurnChange", endTurn)).to.be.equal(true, "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                });

                it("Round Start (setting true)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.roundStart);
                    expect(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN)).to.equal(RefreshCombatantActionsWhenOptions.roundStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    setHelperCombatant(slowCombatants[0]);
                    setHookWatchedIds([helperCombatant.id!]);

                    expect(actVals()).to.deep.equal([3, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([false], "Unexpected hook calls");

                    // Use 1 action, start turn
                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);

                    // Use 2 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useTwoActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([1, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);

                    // Use 3 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);

                    // Use 3 actions and reaction, start turn
                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 0]);
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([3, 1]);
                });

                it("Round Start (setting false)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.onlyManual);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    setHelperCombatant(slowCombatants[0]);
                    setHookWatchedIds([helperCombatant.id!]);

                    expect(actVals()).to.deep.equal([3, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([false], "Unexpected hook calls");

                    // Use 1 action, start turn
                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);

                    // Use 2 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useTwoActions)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);

                    // Use 3 actions, start turn
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);

                    // Use 3 actions and reaction, start turn
                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                    expect(await pullActionsDoneAfterFunc(nextRound)).to.deep.equal([false], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 0]);
                });

                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombat(testCombat as TestCombat);
                    await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Turns And Order Tests` }
    );
}