import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, createTestCombat, endTurn, getRemainingBaseActions, getRemainingBaseReactions, helperCombatant, hookRanAfterCall, nextRound, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions, useOneAction, useReaction, useThreeActions, useTwoActions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { getAllModuleSettings, getModuleSetting, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";
import { AdversaryActor } from "@src/declarations/cosmere-rpg/documents";


export function registerCombatantActionsTestBatch(quench: Quench){
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

                beforeEach(async function() {
                    testCombat = await createTestCombat(testCombatantOptions);
                });
                describe("Stunned", async function() {

                });
                describe("Surprised", async function() {

                });
                describe("Disoriented", async function() {

                });

                afterEach(async function() {
                    await teardownTestCombat(testCombat as TestCombat);
                });
            });
        },
        { displayName: `${MODULE_NAME}: Conditions Tests` }
    );
}