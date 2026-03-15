import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actValsBoth, createTestCombat, endTurn, findOtherBossCombatant, helperCombatant, helperCombatant2, hookRanAfterCall, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions, useOneAction, useReaction, useThreeActions, useTwoActions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { getAllModuleSettings, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";


export function registerBossTurnsTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.boss-turns`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;

            describe("Boss turns suite", async function() {
                console.log("Registering boss turns suite");
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

                it("Check number of bossFast update hooks", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast && combatant.isBoss))!);
                    console.log("HelperCombatant:");
                    console.log(helperCombatant);
                    findOtherBossCombatant();
                    console.log("HelperCombatant2:");
                    console.log(helperCombatant2);
                    setHookWatchedIds([helperCombatant.id!, helperCombatant2.id!]);


                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true, false], "Unexpected hook calls");

                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true, true], "Unexpected hook calls");

                });

                it("Use actions from bossFast", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast && combatant.isBoss))!);
                    console.log("HelperCombatant:");
                    console.log(helperCombatant);
                    findOtherBossCombatant();
                    console.log("HelperCombatant2:");
                    console.log(helperCombatant2);
                    setHookWatchedIds([helperCombatant.id!, helperCombatant2.id!]);



                    // Use 1 action
                    expect(actValsBoth()).to.deep.equal([2, 1, 3, 1]);
                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true, false], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([1, 1, 3, 1]);

                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, false], "Unexpected hook calls");

                    // Use 2 actions
                    expect(actValsBoth()).to.deep.equal([2, 1, 3, 1]);
                    expect(await pullActionsDoneAfterFunc(useTwoActions)).to.deep.equal([true, false], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([0, 1, 3, 1]);

                    expect(await pullActionsDoneAfterFunc(endTurn)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, false], "Unexpected hook calls");

                    // Use 3 actions
                    expect(actValsBoth()).to.deep.equal([2, 1, 3, 1]);
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([2, 1, 3, 1]);

                    expect(await pullActionsDoneAfterFunc(endTurn)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false, false], "Unexpected hook calls");

                    // Use reaction
                    expect(actValsBoth()).to.deep.equal([2, 1, 3, 1]);
                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true, true], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([2, 0, 3, 0]);

                    await hookRanAfterCall("combatTurnChange", endTurn);
                    expect(await pullActionsDoneAfterFunc(endTurn)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, true], "Unexpected hook calls");

                    expect(actValsBoth()).to.deep.equal([2, 1, 3, 1]);

                });

                it("Use actions from bossSlow", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Slow && combatant.isBoss))!);
                    console.log("HelperCombatant:");
                    console.log(helperCombatant);
                    findOtherBossCombatant();
                    console.log("HelperCombatant2:");
                    console.log(helperCombatant2);
                    setHookWatchedIds([helperCombatant.id!, helperCombatant2.id!]);



                    // Use 1 action
                    expect(actValsBoth()).to.deep.equal([3, 1, 2, 1]);
                    expect(await pullActionsDoneAfterFunc(useOneAction)).to.deep.equal([true, false], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([2, 1, 2, 1]);

                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, false], "Unexpected hook calls");

                    // Use 2 actions
                    expect(actValsBoth()).to.deep.equal([3, 1, 2, 1]);
                    expect(await pullActionsDoneAfterFunc(useTwoActions)).to.deep.equal([true, false], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([1, 1, 2, 1]);

                    expect(await pullActionsDoneAfterFunc(endTurn)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, false], "Unexpected hook calls");

                    // Use 3 actions
                    expect(actValsBoth()).to.deep.equal([3, 1, 2, 1]);
                    expect(await pullActionsDoneAfterFunc(useThreeActions)).to.deep.equal([true, false], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([0, 1, 2, 1]);

                    expect(await pullActionsDoneAfterFunc(endTurn)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, false], "Unexpected hook calls");

                    // Use reaction
                    expect(actValsBoth()).to.deep.equal([3, 1, 2, 1]);
                    expect(await pullActionsDoneAfterFunc(useReaction)).to.deep.equal([true, true], "Unexpected hook calls");
                    expect(actValsBoth()).to.deep.equal([3, 0, 2, 0]);

                    await hookRanAfterCall("combatTurnChange", endTurn);
                    expect(await pullActionsDoneAfterFunc(endTurn)).to.deep.equal([false, false], "Unexpected hook calls");
                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true, true], "Unexpected hook calls");

                    expect(actValsBoth()).to.deep.equal([3, 1, 2, 1]);

                });

                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombat(testCombat as TestCombat);
                    await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Boss Turn Tests` }
    );
}