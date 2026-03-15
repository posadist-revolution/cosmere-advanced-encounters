import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, createTestCombat, endTurn, getRemainingBaseActions, getRemainingBaseReactions, helperCombatant, hookRanAfterCall, nextRound, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions, useOneAction, useReaction, useThreeActions, useTwoActions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { getAllModuleSettings, getModuleSetting, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { AdversaryActor } from "@src/declarations/cosmere-rpg/documents";


export function registerCombatantActionsTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.combatant-actions`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;

            describe("Combatant Actions suite", async function() {
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

                beforeEach(async function() {
                    testCombat = await createTestCombat(testCombatantOptions);
                });
                it("Boss actors generate 2 combatants", function() {
                    for(const actor of testCombat.actors!){
                        if(actor.isAdversary() && (actor as AdversaryActor).system.role == AdversaryRole.Boss){
                            expect(testCombat.combat?.getCombatantsByActor(actor).length).to.equal(2);
                        }
                        else{
                            expect(testCombat.combat?.getCombatantsByActor(actor).length).to.equal(1);
                        }
                    }
                });
                it("Combatant Actions Defaults", async function() {
                    expect(testCombat.combatants?.length).greaterThanOrEqual(testCombatantOptions.length);
                    for(const combatant of testCombat.combatants!){
                        if(combatant.turnSpeed == TurnSpeed.Slow ){
                            expect(combatant.actionsAvailableGroups[0].max).to.equal(3);
                            expect(combatant.actionsAvailableGroups[0].remaining).to.equal(3);
                            expect(combatant.actionsAvailableGroups[0].used).to.equal(0);
                        }
                        else{
                            expect(combatant.actionsAvailableGroups[0].max).to.equal(2);
                            expect(combatant.actionsAvailableGroups[0].remaining).to.equal(2);
                            expect(combatant.actionsAvailableGroups[0].used).to.equal(0);
                        }
                        expect(combatant.reactionsAvailable[0].max).to.equal(1);
                        expect(combatant.reactionsAvailable[0].remaining).to.equal(1);
                        expect(combatant.reactionsAvailable[0].used).to.equal(0);
                    }
                });

                it("Manual action", async function() {
                    const fastCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!;
                    console.log("Fast combatants:");
                    console.log(fastCombatants);
                    console.log("Checking fast combatant 0");
                    setHelperCombatant(fastCombatants[0]);
                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);

                    console.log("Checking fast combatant 1");
                    setHelperCombatant(fastCombatants[1]);
                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);

                    console.log("Checking fast combatant 2");
                    setHelperCombatant(fastCombatants[2]);
                    expect(useThreeActions).to.not.change(getRemainingBaseActions);
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;

                    console.log("Checking slow combatant 0");
                    setHelperCombatant(slowCombatants[0]);
                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);

                    console.log("Checking slow combatant 1");
                    setHelperCombatant(slowCombatants[1]);
                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);

                    console.log("Checking slow combatant 2");
                    setHelperCombatant(slowCombatants[2]);
                    expect(useThreeActions).to.decrease(getRemainingBaseActions).by(3);
                });

                it("Manual reaction", async function() {
                    const fastCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!;
                    console.log("Fast combatants:");
                    console.log(fastCombatants);
                    console.log("Checking fast combatant 0");
                    setHelperCombatant(fastCombatants[0]);
                    expect(useReaction).to.decrease(getRemainingBaseReactions).by(1);
                    expect(useReaction).to.not.change(getRemainingBaseReactions);
                });

                it("Actions remaining of type", async function() {
                    setHelperCombatant(testCombat.combatants![0]);
                });

                afterEach(async function() {
                    await teardownTestCombat(testCombat as TestCombat);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Combatant Actions Tests` }
    );
}