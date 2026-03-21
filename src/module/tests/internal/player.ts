import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, createTestCombat, endTurn, helperCombatant, hookRanAfterCall, nextRound, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHelperCombatant2, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions, useOneAction, useReaction, useThreeActions, useTwoActions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { getAllModuleSettings, getModuleSetting, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { createTestCombatPlayer, registerTestQueries, setObserver, setOwner, teardownTestCombatPlayer } from "../helpers/test-queries";
import { CombatantUIHelper } from "../helpers/ui-helpers";


export function registerPlayerTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.player`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;
            describe("Player suite", async function() {
                console.log("Registering player suite");
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
                // let currentSettings = getAllModuleSettings();

                beforeEach(async function() {
                    testCombat = (await createTestCombatPlayer(testCombatantOptions))!;
                    setHelperCombat(testCombat.combat!);
                });

                it("Test owner permissions", async function() {
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCharacterCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.actor.type == ActorType.Character && combatant.turnSpeed == TurnSpeed.Slow))!;
                    setHelperCombatant(slowCharacterCombatants[0]);
                    setHookWatchedIds([helperCombatant.id!]);
                    expect(helperCombatant.canUserModify(game.user!, "update")).to.equal(false);
                    expect(helperCombatant.hasPlayerOwner).to.equal(false);
                    expect(helperCombatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)).to.equal(false);
                    expect(helperCombatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)).to.equal(false);

                    await setOwner(helperCombatant.actor as any);
                    expect(helperCombatant.canUserModify(game.user!, "update")).to.equal(true);
                    expect(helperCombatant.hasPlayerOwner).to.equal(true);
                    expect(helperCombatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)).to.equal(true);
                    expect(helperCombatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)).to.equal(true);
                });

                it("Test UI respecting permissions", async function() {
                    expect(testCombat.combat?.current.turn).to.be.null;
                    const slowCharacterCombatants = testCombat.combat?.combatants?.filter((combatant) => (combatant.actor.type == ActorType.Character && combatant.turnSpeed == TurnSpeed.Slow))!;
                    const bossCombatant = testCombat.combat?.combatants.find((combatant) => (combatant.isBoss));

                    setHelperCombatant(slowCharacterCombatants[0]);
                    setHookWatchedIds([helperCombatant.id!]);

                    await setOwner(helperCombatant.actor as any);
                    await setObserver(bossCombatant?.actor as any);

                    for(const combatant of testCombat.combat?.combatants!){
                        let ui = new CombatantUIHelper(combatant);
                        if(combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)){
                            if(combatant.turnSpeed == TurnSpeed.Fast){
                                expect(ui.numActionsAvailable).to.equal(2);
                            }
                            else{
                                expect(ui.numActionsAvailable).to.equal(3);
                            }
                        }
                        else{
                            expect(ui.numActionsAvailable).to.equal(0);
                        }
                    }
                });

                //TODO: Test setting which enables/disables resetting actions used


                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombatPlayer(testCombat as TestCombat);
                    // await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Player Tests` }
    );
}