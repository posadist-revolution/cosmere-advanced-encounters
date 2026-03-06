import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { createTestCombat, getNumMatching, hookRan, hookRanAfterCall, hookRanWithParamWithProperty, teardownTestCombat, TestCombat, TestCombatantOptions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { AdversaryActor } from "@src/declarations/cosmere-rpg/documents";
import { UsedAction } from "@src/module/documents/used-action";
import { AdvancedCosmereCombatant } from "@src/module/documents/combatant";
import { getAllModuleSettings, getModuleSetting, ModuleSettingsConfig, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { AdvancedCosmereCombat } from "@src/module/documents/combat";

export function registerInternalTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;


            // describe("Combat tracker UI suite", function() {
            //     it("placeholder test", function() {
            //         assert.ok(true, "Internal test infrastructure is working");
            //     });
            // });
            describe("Combat Setup helper suite", async function() {
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
                before(async function() {
                    testCombat = await createTestCombat(testCombatantOptions);
                });

                it("Setup Test Combat", async function() {
                    assert.ok(testCombat.combat, "Combat does not exist");
                    assert.ok(testCombat.actors, "Actors do not exist");
                    assert.ok(testCombat.tokenDocuments, "Token documents do not exist");
                    assert.ok(testCombat.combatants, "Combatants do not exist");
                    for(const option of testCombatantOptions){
                        expect(getNumMatching("actor", testCombat, option)).to.equal(1, "Incorrect number of actors matching an input option");
                        expect(getNumMatching("token", testCombat, option)).to.equal(1, "Incorrect number of tokens matching an input option");
                        if(option.adversaryRole == AdversaryRole.Boss){
                            expect(getNumMatching("combatant", testCombat, option)).to.equal(2, "Incorrect number of combatants matching an input option");
                        }
                        else{
                            expect(getNumMatching("combatant", testCombat, option)).to.equal(1, "Incorrect number of combatants matching an input option");
                        }
                    }
                })

                after(async function() {
                    await teardownTestCombat(testCombat);
                })
            });

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
                    helperCombatant = fastCombatants[0];
                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);

                    console.log("Checking fast combatant 1");
                    helperCombatant = fastCombatants[1];
                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);

                    console.log("Checking fast combatant 2");
                    helperCombatant = fastCombatants[2];
                    expect(useThreeActions).to.not.change(getRemainingBaseActions);
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;

                    console.log("Checking slow combatant 0");
                    helperCombatant = slowCombatants[0];
                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);

                    console.log("Checking slow combatant 1");
                    helperCombatant = slowCombatants[1];
                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);

                    console.log("Checking slow combatant 2");
                    helperCombatant = slowCombatants[2];
                    expect(useThreeActions).to.decrease(getRemainingBaseActions).by(3);
                });

                it("Manual reaction", async function() {
                    const fastCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!;
                    console.log("Fast combatants:");
                    console.log(fastCombatants);
                    console.log("Checking fast combatant 0");
                    helperCombatant = fastCombatants[0];
                    expect(useReaction).to.decrease(getRemainingBaseReactions).by(1);
                    expect(useReaction).to.not.change(getRemainingBaseReactions);
                });

                it("Actions remaining of type", async function() {
                    helperCombatant = testCombat.combatants![0];
                });

                afterEach(async function() {
                    await teardownTestCombat(testCombat as TestCombat);
                });
            });

            describe("Settings suite", async function() {
                console.log("Registering settings suite");
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

                afterEach(async function() {
                    helperCombatant = undefined as any;
                    await teardownTestCombat(testCombat as TestCombat);
                });
            });

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
                    helperCombat = testCombat.combat!;
                });

                it("Turn Start (setting true)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    helperCombatant = slowCombatants[0];
                    console.log("Testing slow combatant turn start with helperCombatant:");
                    console.log(helperCombatant);

                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatTurnChange", startTurn);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatTurnChange", endTurn);
                    await hookRanAfterCall("combatTurnChange", startTurn);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useThreeActions).to.decrease(getRemainingBaseActions).by(3);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatTurnChange", endTurn);
                    await hookRanAfterCall("combatTurnChange", startTurn);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useReaction).to.decrease(getRemainingBaseReactions).by(1);
                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatTurnChange", endTurn);
                    await hookRanAfterCall("combatTurnChange", startTurn);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);
                });

                it("Turn Start (setting false)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.onlyManual);

                });

                it("Round Start (setting true)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.roundStart);
                    expect(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN)).to.equal(RefreshCombatantActionsWhenOptions.roundStart);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    helperCombatant = slowCombatants[0];
                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatRound", nextRound);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatRound", nextRound);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useThreeActions).to.decrease(getRemainingBaseActions).by(3);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatRound", nextRound);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useReaction).to.decrease(getRemainingBaseReactions).by(1);
                    await helperCombatantActionsUpdateDone();
                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatRound", nextRound);
                    await helperCombatantActionsUpdateDone();
                    expect(getRemainingBaseActions()).to.equal(3);
                    expect(getRemainingBaseReactions()).to.equal(1);
                });

                it("Round Start (setting false)", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.onlyManual);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.turnSpeed == TurnSpeed.Slow))!;
                    helperCombatant = slowCombatants[0];

                    expect(useOneAction).to.decrease(getRemainingBaseActions).by(1);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatRound", nextRound);
                    expect(getRemainingBaseActions()).to.equal(2);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useTwoActions).to.decrease(getRemainingBaseActions).by(2);
                    await helperCombatantActionsUpdateDone();
                    await hookRanAfterCall("combatRound", nextRound);
                    expect(getRemainingBaseActions()).to.equal(0);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useThreeActions).to.not.change(getRemainingBaseActions);
                    await hookRanAfterCall("combatRound", nextRound);
                    expect(getRemainingBaseActions()).to.equal(0);
                    expect(getRemainingBaseReactions()).to.equal(1);

                    expect(useReaction).to.decrease(getRemainingBaseReactions).by(1);
                    await helperCombatantActionsUpdateDone();
                    expect(useTwoActions).to.not.change(getRemainingBaseActions);
                    await hookRanAfterCall("combatRound", nextRound);
                    expect(getRemainingBaseActions()).to.equal(0);
                    expect(getRemainingBaseReactions()).to.equal(0);
                });

                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombat(testCombat as TestCombat);
                    await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Internal Tests` }
    );
}

var helperCombatant: AdvancedCosmereCombatant;
var helperCombat: AdvancedCosmereCombat;

function getRemainingBaseActions(){
    return helperCombatant.actionsAvailableGroups[0].remaining
}

function getRemainingBaseReactions(){
    return helperCombatant.reactionsAvailable[0].remaining
}


function useOneAction(){
    helperCombatant.useAction(new UsedAction(1));
}

function useTwoActions(){
    helperCombatant.useAction(new UsedAction(2));
}

function useThreeActions(){
    helperCombatant.useAction(new UsedAction(3));
}

function useReaction(){
    helperCombatant.useReaction(new UsedAction(1));
}

async function startTurn(){
    await helperCombat.setCurrentTurnFromCombatant(helperCombatant);
}

async function endTurn(){
    await helperCombat.nextTurn();
}

async function nextRound(){
    await helperCombat.nextRound();
}

async function helperCombatantActionsUpdateDone(){
    let done = await hookRanWithParamWithProperty("updateCombatant",[{paramExpectedIndex: 1, properties:[{key: `flags.${MODULE_ID}`}, {key: "_id", value: helperCombatant.id}]}]);
    if(!done){
        "Update combatant actions didn't run!";
    }
    return;
}