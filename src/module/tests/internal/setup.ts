import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { createTestCombat, getNumMatching, teardownTestCombat, TestCombat, TestCombatantOptions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";


export function registerSetupTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.setup`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;
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
        },
        { displayName: `${MODULE_NAME}: Setup Tests` }
    );
}