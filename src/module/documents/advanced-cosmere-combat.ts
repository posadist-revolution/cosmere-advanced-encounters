import { activeCombat, Dictionary } from "@src/index";
import { CombatantActions } from "./combatant-actions.js";
import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from "../settings";
import { CosmereItem } from "@src/declarations/cosmere-rpg/documents/item.js";
import { AdvancedCosmereCombatant } from "./advanced-cosmere-combatant.js";
import { SYSTEM_ID } from "@src/declarations/cosmere-rpg/system/constants/index.js";
import { TurnSpeed } from "@src/declarations/cosmere-rpg/system/types/cosmere.js";

export class AdvancedCosmereCombat extends Combat{
    lastUsedItem: CosmereItem | undefined;
    /**
     * Sets all defeated combatants activation status to true (already activated),
     * and all others to false (hasn't activated yet)
     */
    resetActivations() {
        this.turns.forEach((combatant) => void combatant.resetActivation());
        if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) != RefreshCombatantActionsWhenOptions.roundStart){
            return;
        }
        this.turns.forEach((combatant) => void combatant.resetActions());
    }

    override async startCombat(): Promise<this> {
        this.resetActivations();
        return super.startCombat();
    }

    override async nextRound(): Promise<this> {
        this.resetActivations();
        return super.nextRound();
    }

    override setupTurns(): AdvancedCosmereCombatant[] {
        this.turns ??= [];

        const turns = Array.from(this.combatants)
            .flatMap((c) => {
                if (c.isBoss) {
                    // If the combatant is a boss, clone it to create a fast turn beside its slow turn
                    const clone = new (CONFIG.Combatant
                        .documentClass as unknown as new (
                        data: unknown,
                        options: unknown,
                    ) => AdvancedCosmereCombatant)(
                        foundry.utils.mergeObject(c.toObject(), {
                            [`flags.${SYSTEM_ID}.turnSpeed`]: TurnSpeed.Fast,
                        }),
                        { parent: c.parent },
                    );
                    return [clone, c];
                } else {
                    return c;
                }
            })
            .sort(this._sortCombatants.bind(this));

        if (this.turn !== null)
            this.turn = Math.clamp(this.turn, 0, turns.length - 1);

        // Update state tracking
        const c = turns[this.turn!];
        this.current = this._getCurrentState(c);

        // One-time initialization of the previous state
        if (!this.previous) this.previous = this.current;

        // Assign turns
        this.turns = turns;

        // Return the array of prepared turns
        return this.turns;
    }

    public setLastUsedItemData(item: CosmereItem){
        this.lastUsedItem = item;
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredCombat<SubType extends Combat.SubType> {
        document: AdvancedCosmereCombat;
    }
}