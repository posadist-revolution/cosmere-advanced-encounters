// System imports
import { CosmereItem, CosmereCombatant, CosmereCombat } from "@system/documents";
import { TurnSpeed } from "@system/types/cosmere.js";

// Module imports
import { activeCombat } from "@src/index";
import { CombatantActions } from "./combatant-actions.js";
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "../settings";


export class AdvancedCosmereCombat{
    readonly combat : CosmereCombat
    tokenIdToCombatantIdMap: Map<string, string>;
    combatantIdToCombatantActionsMap: Map<string, CombatantActions>;
    lastUsedItem: CosmereItem | undefined;
    lastBossTurnSpeed: TurnSpeed | undefined | string;

    constructor(combat: CosmereCombat){
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

    public async setCurrentTurnFromCombatant(combatantId: string, isBossFastTurn: boolean = false){
        var turnIndex: number;
        if(isBossFastTurn){
            // Find the turn index that matches this combatant and turn speed
            turnIndex = this.combat.turns.findIndex((turn: CosmereCombatant) =>
                turn.id === combatantId && turn.turnSpeed === TurnSpeed.Fast
            );
        }
        else{
            turnIndex = this.combat.turns.findLastIndex((turn: CosmereCombatant) =>
                turn.id === combatantId
            );
        }

        if(turnIndex !== -1){
            if(this.combat.turn == turnIndex){
                // It is this combatant's turn already, and we should refresh their actions to make sure
                await this.getCombatantActionsByCombatantId(combatantId)?.getCombatantTurnActions(this.combat.combatant?.turnSpeed!).onTurnStart();
            }
            await this.combat.update({ turn: turnIndex });
        }
    }
}