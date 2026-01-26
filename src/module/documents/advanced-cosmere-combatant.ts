import { AdversaryRole, TurnSpeed } from '@system/types/cosmere';

// Documents
import { CombatTurnActionsContext } from './combatant-turn-actions';
import { CosmereCombatant } from '@src/declarations/cosmere-rpg/documents/combatant';
// Constants
import { SYSTEM_ID } from '@system/constants';
import { MODULE_ID } from '../constants';

let _schema:
    | foundry.data.fields.SchemaField<CosmereCombatant.Schema>
    | undefined;

export class AdvancedCosmereCombatant extends CosmereCombatant {

    /* --- Accessors --- */

    public get actionsContext(): CombatTurnActionsContext {
        let actionsContext: CombatTurnActionsContext;
        if(this.isBoss && this.turnSpeed == TurnSpeed.Fast){
            actionsContext = {
                combatantId: this.id!,
                actionsAvailableGroups: this.getFlag(MODULE_ID, "bossFastActionsAvailableGroups"),
                actionsUsed: this.getFlag(MODULE_ID, "bossFastActionsUsed"),
                reactionsAvailable: this.getFlag(MODULE_ID, "reactionsAvailable"),
                reactionsUsed: this.getFlag(MODULE_ID, "reactionsUsed"),
                freeActionsUsed: this.getFlag(MODULE_ID, "bossFastFreeActionsUsed"),
                specialActionsUsed: this.getFlag(MODULE_ID, "bossFastSpecialActionsUsed"),
            };
        }
        else{
            actionsContext = {
                combatantId: this.id!,
                actionsAvailableGroups: this.getFlag(MODULE_ID, "actionsAvailableGroups"),
                actionsUsed: this.getFlag(MODULE_ID, "actionsUsed"),
                reactionsAvailable: this.getFlag(MODULE_ID, "reactionsAvailable"),
                reactionsUsed: this.getFlag(MODULE_ID, "reactionsUsed"),
                freeActionsUsed: this.getFlag(MODULE_ID, "freeActionsUsed"),
                specialActionsUsed: this.getFlag(MODULE_ID, "specialActionsUsed"),
            };

        }
        return actionsContext ?? undefined;
    }

    /* --- Life cycle --- */

    public override rollInitiative(): Promise<this> {
        // Initiative is static and does not require rolling
        return Promise.resolve(this);
    }

    /* --- System functions --- */

    /**
     * Utility function to flip the combatants current turn speed between slow and fast. It then updates initiative to force an update of the combat-tracker ui
     */
    public async toggleTurnSpeed() {
        const newSpeed =
            this.turnSpeed === TurnSpeed.Slow ? TurnSpeed.Fast : TurnSpeed.Slow;

        // Update the turn speed
        await this.setFlag(SYSTEM_ID, 'turnSpeed', newSpeed);
    }

    public async markActivated(bossFastActivated = false) {
        if (bossFastActivated && this.isBoss) {
            await this.setFlag(SYSTEM_ID, 'bossFastActivated', true);
        } else {
            await this.setFlag(SYSTEM_ID, 'activated', true);
        }
    }

    public async resetActivation() {
        await this.update({
            flags: {
                [SYSTEM_ID]: {
                    activated: false,
                    bossFastActivated: false,
                },
            },
        });
    }

    public async resetActions() {
        await this.update({
            flags: {
                [MODULE_ID]:{
                    //TODO: Add action resets here
                }
            }
        })
    }
}

export namespace AdvancedCosmereCombatant {
    export type Schema = Omit<Combatant.Schema, 'initiative'>;
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredCombatant<SubType extends Combatant.SubType> {
        document: AdvancedCosmereCombatant;
    }

    interface FlagConfig {
        Combatant: {
            [SYSTEM_ID]: {
                turnSpeed: TurnSpeed;
                bossFastActivated: boolean;
                activated: boolean;
            };
            [MODULE_ID]: {
                actionsUsed: any;
                actionsAvailableGroups: any;
                bossFastActionsUsed: any;
                bossFastActionsAvailableGroups: any;
                reactionsUsed: any;
                reactionsAvailable: any;
                freeActionsUsed: any;
                specialActionsUsed: any;
                bossFastFreeActionsUsed: any;
                bossFastSpecialActionsUsed: any;
                flags_initialized_version: string;

                //@deprecated These flags are kept in the configuration to allow for intelligently updating combats in progress to new module versions
                reactionUsed: boolean;
                bossFastActionsOnTurn: number;
                actionsOnTurn: number;
            }
        };
    }
}
