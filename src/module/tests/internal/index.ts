import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { createTestCombat, teardownTestCombat, TestCombat, TestCombatantOptions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { AdversaryActor } from "@src/declarations/cosmere-rpg/documents";

export function registerInternalTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, utils } = context;


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

                });

                after(async function() {

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
                it("Combat Exists", function() {
                    assert.ok(testCombat.combat, "Combat does not exist");
                });
                it("Actors Exist", function() {
                    assert.ok(testCombat.actors, "Actors do not exist");
                    assert.equal(testCombat.actors?.length, testCombatantOptions.length, "Didn't generate all actors");
                });
                it("Token documents exist", function() {
                    assert.ok(testCombat.tokenDocuments, "Token documents do not exist");
                    assert.equal(testCombat.tokenDocuments?.length, testCombatantOptions.length, "Didn't generate all tokens");
                });
                it("Combatants Exist", function() {
                    assert.ok(testCombat.combatants, "Combatants do not exist");
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

                afterEach(async function() {
                    await teardownTestCombat(testCombat as TestCombat);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Internal Tests` }
    );
}