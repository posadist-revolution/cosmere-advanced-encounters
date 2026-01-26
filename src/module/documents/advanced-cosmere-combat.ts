import { activeCombat, Dictionary } from "@src/index";
import { CombatantActions } from "./combatant-actions.js";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "../settings";
import { CosmereItem } from "@src/declarations/cosmere-rpg/documents/item.js";

export class AdvancedCosmereCombat{
    readonly combat : Combat
    tokenIdToCombatantIdMap: Map<string, string>;
    combatantIdToCombatantActionsMap: Map<string, CombatantActions>;
    lastUsedItem: CosmereItem | undefined;

    constructor(combat: Combat){
        this.combat = combat;
        this.tokenIdToCombatantIdMap = new Map<string, string>();
        this.combatantIdToCombatantActionsMap = new Map<string, CombatantActions>();
        for (const combatant of combat.combatants){
            this.addNewCombatantToCombat(combatant);
        }
    }

    registerActorCombatantActions(combatantActions : CombatantActions){
        const combatant = combatantActions.combatant;
        if(!this.tokenIdToCombatantIdMap.get(combatant.tokenId!)){
            this.tokenIdToCombatantIdMap.set(combatant.tokenId!, combatant.id!);
        }
    }

    public addNewCombatantToCombat(combatant: CosmereCombatant){
        let combatantActions = new CombatantActions(combatant);
        this.registerActorCombatantActions(combatantActions);
        this.combatantIdToCombatantActionsMap.set(combatant.id!, combatantActions);
    }

    public getCombatantActionsByCombatantId(combatantId: string){
        return this.combatantIdToCombatantActionsMap.get(combatantId);
    }

    public getCombatantActionsByTokenId(tokenId: string){
        return this.getCombatantActionsByCombatantId(this.tokenIdToCombatantIdMap.get(tokenId)!);
    }

    public resetAllCombatantActions(){
        for (const combatantActions of this.combatantIdToCombatantActionsMap.values()){
            combatantActions.resetAllCombatantTurnActions();
        }
    }

    public setLastUsedItemData(item: CosmereItem){
        this.lastUsedItem = item;
    }
}

Hooks.on("combatRound", () => {
    if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.roundStart){
        return;
    }
    activeCombat.resetAllCombatantActions();
});