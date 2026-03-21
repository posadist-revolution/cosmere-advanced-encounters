import { MODULE_ID } from "@src/module/constants";
import { createTestCombat, TestCombatantOptions, TestCombat, teardownTestCombat } from "./combat-setup";
import { AdvancedCosmereCombat } from "@src/module/documents/combat";
import { AdvancedCosmereCombatant } from "@src/module/documents/combatant";

const enum MODULE_QUERY {
    setupTestCombat = `${MODULE_ID}.setupTestCombat`,
    teardownTestCombat = `${MODULE_ID}.teardownTestCombat`,
    setPermissions = `${MODULE_ID}.setPermissions`,
    getDisplayedActions = `${MODULE_ID}.getDisplayedActions`
    //TODO: "Set specific setting" and "Reset settings"
}

export interface TestCombatUuids {
    combatUuid?: string;
    actorUuids?: string[];
    tokenDocumentUuids?: string[];
    combatantUuids?: string[];
}

export interface SetPermissionsData {
    userIdForRequest: string;
    docUuidForRequest: string;
    permissions: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS;
}

export function registerTestQueries(){
    console.log("Registering test queries");
    CONFIG.queries[MODULE_QUERY.setupTestCombat] = setupTestCombatQuery;
    CONFIG.queries[MODULE_QUERY.teardownTestCombat] = teardownTestCombatQuery;
    CONFIG.queries[MODULE_QUERY.setPermissions] = setUserPermissionsQuery;
}

export async function createTestCombatPlayer(data: TestCombatantOptions[]){
    console.log("Query data:");
    console.log(data);
    if(game.users && game.users.activeGM){
        let testCombatUuids = await game.users.activeGM.query(MODULE_QUERY.setupTestCombat, data);
        if(testCombatUuids){
            return getTestCombatFromUuids(testCombatUuids);
        }
    }
    return undefined;
}

export async function teardownTestCombatPlayer(data: TestCombat){
    let testCombatUuids = getUuidsFromTestCombat(data);
    if(testCombatUuids){
        await game.users?.activeGM?.query(MODULE_QUERY.teardownTestCombat, testCombatUuids);
    }
}

export async function setOwner(doc: ClientDocument){
    let queryData: SetPermissionsData = {
        userIdForRequest: game.userId!,
        docUuidForRequest: doc.uuid,
        permissions: foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    }
    await game.users?.activeGM?.query(MODULE_QUERY.setPermissions, queryData);
}

async function setUserPermissionsQuery(setPermissionsData: SetPermissionsData){
    let document = await fromUuid(setPermissionsData.docUuidForRequest);
    let updateData = {
        ownership: {
            [setPermissionsData.userIdForRequest]: setPermissionsData.permissions
        }
    }
    //@ts-expect-error
    await document?.update(updateData, {})
}

async function setupTestCombatQuery(data: TestCombatantOptions[]){
    return getUuidsFromTestCombat(await createTestCombat(data));
}

async function teardownTestCombatQuery(data: TestCombatUuids){
    let testCombat = getTestCombatFromUuids(data);
    await teardownTestCombat(testCombat);
}

function getUuidsFromTestCombat(testCombat: TestCombat){
    const combatUuid = testCombat.combat?.uuid;
    let actorUuids = [];
    let tokenDocumentUuids = [];
    let combatantUuids = [];
    if(testCombat.actors){
        for(const actor of testCombat.actors){
            actorUuids.push(actor.uuid);
        }
    }
    if(testCombat.tokenDocuments){
        for(const tokenDocument of testCombat.tokenDocuments){
            tokenDocumentUuids.push(tokenDocument.uuid);
        }
    }
    if(testCombat.combatants){
        for(const combatant of testCombat.combatants){
            combatantUuids.push(combatant.uuid);
        }
    }

    const testCombatUuids: TestCombatUuids = {
        combatUuid,
        actorUuids,
        tokenDocumentUuids,
        combatantUuids
    }
    return testCombatUuids;
}

function getTestCombatFromUuids(testCombatUuids: TestCombatUuids){
    let advancedCombat = (fromUuidSync(testCombatUuids.combatUuid) as AdvancedCosmereCombat);
    let actors: Actor.Implementation[] = [];
    let tokenDocuments: TokenDocument.Implementation[] = [];
    let combatants: AdvancedCosmereCombatant[] = [];
    for (const uuid of testCombatUuids.actorUuids!){
        actors.push(fromUuidSync(uuid) as Actor.Implementation);
    }
    for (const uuid of testCombatUuids.tokenDocumentUuids!){
        tokenDocuments.push(fromUuidSync(uuid) as TokenDocument.Implementation);
    }
    for (const uuid of testCombatUuids.combatantUuids!){
        combatants.push(fromUuidSync(uuid) as AdvancedCosmereCombatant);
    }

    let testCombat: TestCombat = {
        combat: advancedCombat,
        actors,
        tokenDocuments,
        combatants
    }
    return testCombat;
}


declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace CONFIG {
        interface Queries {
            [MODULE_QUERY.setupTestCombat]: (data: TestCombatantOptions[]) => Promise<TestCombatUuids>,
            [MODULE_QUERY.teardownTestCombat]: (data: TestCombatUuids) => Promise<void>,
            [MODULE_QUERY.setPermissions]: (data: SetPermissionsData) => Promise<void>,
        }
    }
}