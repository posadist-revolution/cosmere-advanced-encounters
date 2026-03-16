import { Quench } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";
import { actVals, createTestCombat, helperCombatant, pullActionsDoneAfterFunc, setHelperCombat, setHelperCombatant, setHookWatchedIds, startTurn, teardownTestCombat, TestCombat, TestCombatantOptions } from "../helpers";
import { ActorType, AdversaryRole, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { CheckActionUsabilityOptions, getAllModuleSettings, RefreshCombatantActionsWhenOptions, setAllModuleSettings, setModuleSetting, SETTINGS } from "@src/module/settings";

declare const enum EXAMPLE_ITEM_UUIDS {
    drop = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.DOeZCEIwrwFuYQEd', // Free
    brace = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.I1CQjZicYdeG9NCN', // 1 action
    disengage = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.wC4Z0mdGwRxLDpMC', //1 action
    breathe_stormlight = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.kzgs9GPqYqfHHS2q', //2 actions
    move = 'Compendium.cosmere-rpg-stormlight-handbook.actions.Item.UEGVL0QnZ6UelxxZ', // 1 action
}

function useItem(uuid: EXAMPLE_ITEM_UUIDS){
    helperCombatant.actor.useItem(fromUuidSync(uuid));
}

function useBrace(){
    useItem(EXAMPLE_ITEM_UUIDS.brace);
}

function useMove(){
    useItem(EXAMPLE_ITEM_UUIDS.move);
}

function useBreatheStormlight(){
    useItem(EXAMPLE_ITEM_UUIDS.breathe_stormlight);
}

export function registerUseItemTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal.use-item`,
        (context) => {
            const { describe, it, assert, before, after, beforeEach, afterEach, expect, should } = context;

            describe("Use item suite", async function() {
                console.log("Registering use item suite");
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

                it("Use Brace & Breathe Stormlight", async function() {
                    await setModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN, RefreshCombatantActionsWhenOptions.turnStart);
                    await setModuleSetting(SETTINGS.PULL_ACTIONS_FROM_CHAT, true);
                    await setModuleSetting(SETTINGS.CHECK_ACTION_USABILITY, CheckActionUsabilityOptions.block);
                    expect(testCombat.combat?.current.turn).to.be.null;
                    setHelperCombatant(testCombat.combat?.combatants?.find((combatant) => (combatant.turnSpeed == TurnSpeed.Fast))!);
                    console.log("HelperCombatant:");
                    console.log(helperCombatant);
                    setHookWatchedIds([helperCombatant.id!]);

                    expect(actVals()).to.deep.equal([2, 1]);
                    expect(await pullActionsDoneAfterFunc(useBrace)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([1, 1]);

                    expect(await pullActionsDoneAfterFunc(startTurn)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([2, 1]);

                    expect(await pullActionsDoneAfterFunc(useBreatheStormlight)).to.deep.equal([true], "Unexpected hook calls");
                    expect(actVals()).to.deep.equal([0, 1]);
                    //TODO: Test to make sure items don't actually get used when blocked

                    // OKAY SO: async preUseItem call doesn't work. Hooks cannot be awaited.
                    // HOWEVER, I could make the async prompt for boss turns appear during UseItem, and then
                    // simply VARY the available buttons, so that you can't use an item from a boss turn which
                    // you don't have actions left for.


                });

                afterEach(async function() {
                    CONFIG.debug.hooks = false;
                    await teardownTestCombat(testCombat as TestCombat);
                    await setAllModuleSettings(currentSettings);
                });
            });
        },
        { displayName: `${MODULE_NAME}: UseItem Tests` }
    );
}