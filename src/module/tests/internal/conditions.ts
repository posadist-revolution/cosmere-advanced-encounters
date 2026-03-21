import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, createTestCombat, endTurn, getRemainingBaseActions, getRemainingBaseReactions, helperCombatant, hookRanAfterCall, nextRound, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions, useOneAction, useReaction, useThreeActions, useTwoActions } from "../helpers";
import { ActorType, AdversaryRole, Status, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { CheckActionUsabilityOptions, getAllModuleSettings, getModuleSetting, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { AdversaryActor } from "@src/declarations/cosmere-rpg/documents";

var helperCondition: Status;
function toggleTestCondition(){
    helperCombatant.actor.toggleStatusEffect(helperCondition);
}

export function registerConditionsTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.conditions`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;

            describe("Conditions suite", async function() {
                console.log("Registering conditions suite");
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
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                    await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                    await setModuleSetting(SETTINGS.CONDITIONS_APPLY_TO_ACTIONS, true);
                });

                describe("Stunned", async function() {
                    it("Fast combatant", async function() {
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        helperCondition = Status.Stunned;

                        // Start with 2 actions and 1 reaction
                        expect(actVals()).to.deep.equal([2, 1]);

                        // After being stunned, have 2 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 0]);

                        // After starting turn, have 0 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([0, 0]);

                        // After losing stunned, have 0 actions and 1 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([0, 1]);
                    });

                    it("Slow combatant", async function() {
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        helperCondition = Status.Stunned;

                        // Start with 3 actions and 1 reaction
                        expect(actVals()).to.deep.equal([3, 1]);

                        // After being stunned, have 3 action and 0 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([3, 0]);

                        // After starting turn, have 1 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([1, 0]);

                        // After losing stunned, have 3 actions and 1 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([1, 1]);
                    });
                });

                describe("Surprised", async function() {
                    it("Slow combatant", async function() {
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        helperCondition = Status.Surprised;

                        // Start with 3 actions and 1 reaction
                        expect(actVals()).to.deep.equal([3, 1]);

                        // After being surprised, have 3 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([3, 0]);

                        // After starting turn, have 2 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 0]);

                        // After losing surprised, have 2 actions and 1 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                    });
                });

                describe("Disoriented", async function() {
                    it("Fast combatant", async function() {
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        helperCondition = Status.Disoriented;

                        // Start with 2 actions and 1 reaction
                        expect(actVals()).to.deep.equal([2, 1]);

                        // After being disoriented, have 2 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 0]);

                        // After starting turn, have 2 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 0]);

                        // After losing disoriented, have 2 actions and 1 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([2, 1]);
                    });

                    it("Slow combatant", async function() {
                        expect(testCombat.combat?.current.turn).to.be.null;
                        setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!);
                        console.log("HelperCombatant:");
                        console.log(helperCombatant);
                        setHookWatchedIds([helperCombatant.id!]);
                        helperCondition = Status.Disoriented;

                        // Start with 3 actions and 1 reaction
                        expect(actVals()).to.deep.equal([3, 1]);

                        // After being disoriented, have 3 action and 0 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([3, 0]);

                        // After starting turn, have 3 actions and 0 reaction
                        expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([false], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([3, 0]);

                        // After losing disoriented, have 3 actions and 1 reaction
                        expect(await pullActionsDoneAfterFunc(toggleTestCondition)).to.deep.equal([true], "Unexpected hook calls");
                        expect(actVals()).to.deep.equal([3, 1]);
                    });
                });

                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombat(testCombat as TestCombat);
                    await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Conditions Tests` }
    );
}