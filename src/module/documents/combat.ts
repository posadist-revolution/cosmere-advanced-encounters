import { TurnSpeed } from '@system/types/cosmere';

import { AdvancedCosmereCombatant } from './combatant';

// Constants
import { MODULE_ID, SYSTEM_ID } from '@module/constants';
import { getModuleSetting, RefreshCombatantActionsWhenOptions, SETTINGS } from '../settings';

export class AdvancedCosmereCombat extends Combat {
    /**
     * Sets all defeated combatants activation status to true (already activated),
     * and all others to false (hasn't activated yet)
     */
    resetActivations() {
        this.turns.forEach((combatant) => void combatant.resetActivation());
    }

    override async startCombat(): Promise<this> {
        this.resetAllCombatantActions();
        this.resetActivations();
        this._playCombatSound('startEncounter');
        const updateData = { round: 1, turn: null };
        //@ts-expect-error: FVTT Types expects the combatStart hook to never have a "null" turn, but
        // with the Cosmere RPG, having a null turn at start of combat makes sense.
        Hooks.callAll('combatStart', this, updateData);
        await this.update(updateData);
        return this;
    }

    override async nextRound(): Promise<this> {
        this.resetActivations();
        if(getModuleSetting(SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN) == RefreshCombatantActionsWhenOptions.roundStart){
            this.resetAllCombatantActions();
        }

        // Ensure that at the start of the round, it's no combatant's turn
        await this.update({ round: this.round, turn: null });

        return super.nextRound();
    }

    override async nextTurn(): Promise<this> {
        // The Cosmere RPG doesn't have an easy programmatic "next turn",
        // so we should reset the combat tracker to be no-one's turn when
        // the nextTurn button is pressed.
        if (this.turn === null) {
            return this;
        }
        let advanceTime;
        if (this.turns.length > this.turn + 1) {
            advanceTime = this.getTimeDelta(
                this.round,
                this.turn,
                this.round,
                this.turn + 1,
            );
        } else advanceTime = 0;
        const updateData = { round: this.round, turn: null };
        const updateOptions: Combat.Database.UpdateOperation = {
            direction: 1,
            worldTime: { delta: advanceTime },
        };

        await this.update(updateData, updateOptions);
        return this;
    }

    override setupTurns(): AdvancedCosmereCombatant[] {
        this.turns ??= [];
        let currTurnId: string | undefined | null;
        if (this.current) {
            if(this.current.combatantId){
                currTurnId = this.current.combatantId;
            }
            else if (this.current.turn && this.turns[this.current.turn]){
                currTurnId = this.turns[this.current.turn].id;
            }
        }

        // One-time initialization of the previous state
        if (!this.previous) this.previous = this.current;

        const turns = Array.from(this.combatants).sort(
            this._sortCombatants.bind(this),
        );

        // Assign turns
        this.turns = turns;

        // Update state tracking
        if (currTurnId) {
            this.turn = turns.findIndex((combatant) => {
                return combatant.id == currTurnId;
            });
            this.update({
                turn: this.turn
            }, {turnEvents: false})
        }

        if (this.turn){
            this.turn = Math.clamp(this.turn, 0, turns.length - 1);
            const c = turns[this.turn];
            this.current = this._getCurrentState(c);
        }
        // Return the array of prepared turns
        return this.turns;
    }

    override async _onEnter(combatant: AdvancedCosmereCombatant) {
        // Initialize the combatant's actions
        combatant.onTurnStart();

        // If the combatant is a boss, clone it to create a fast turn beside its slow turn
        if (combatant.isBoss && combatant.turnSpeed == TurnSpeed.Slow) {
            const createData: Combatant.CreateData = {
                tokenId: combatant.tokenId,
                sceneId: combatant.sceneId,
                actorId: combatant.actorId,
                hidden: combatant.hidden,
                flags: {
                    [SYSTEM_ID]: {
                        turnSpeed: TurnSpeed.Fast,
                    },
                },
            };
            void (await this.createLinkedCombatants(combatant, [createData]));
        }
    }

    async createLinkedCombatants(
        combatant: AdvancedCosmereCombatant,
        data: Combatant.CreateData[],
    ) {
        const linkedCombatants: AdvancedCosmereCombatant[] =
            await this.createEmbeddedDocuments('Combatant', data);
        const linkedCombatantIds: string[] = [combatant.id!];
        for (const linkedCombatant of linkedCombatants) {
            linkedCombatantIds.push(linkedCombatant.id!);
        }
        void (await combatant.setFlag(
            MODULE_ID,
            'linkedCombatantIds',
            linkedCombatantIds.filter((id) => id !== combatant.id),
        ));
        for (const linkedCombatant of linkedCombatants) {
            void (await linkedCombatant.setFlag(
                MODULE_ID,
                'linkedCombatantIds',
                linkedCombatantIds.filter((id) => id !== linkedCombatant.id),
            ));
        }
    }

    public async setCurrentTurnFromCombatant(combatant: AdvancedCosmereCombatant) {
        const turnIndex = this.turns.indexOf(combatant);

        if (turnIndex !== -1) {
            const updateData = { round: this.round, turn: turnIndex };
            const updateOptions = {
                advanceTime: 0,
                direction: 1,
            };
            Hooks.callAll('combatTurn', this, updateData, updateOptions);
            await this.update(
                updateData,
                updateOptions as Combat.Database.UpdateOperation,
            );
        }
    }

    public resetAllCombatantActions(){
        for (const combatant of this.combatants){
            combatant.onTurnStart();
        }
    }

    public pullAllCombatantActionsFromFlags(){
        for (const combatant of this.combatants){
            combatant.pullActionsFromFlags();
        }
    }

    public get lastBossTurnSpeed(){
        return this.getFlag(MODULE_ID, "lastBossTurnSpeed");
    }

    public set lastBossTurnSpeed(turnSpeed: TurnSpeed | string | null){
        this.setFlag(MODULE_ID, "lastBossTurnSpeed", turnSpeed);
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredCombat<SubType extends Combat.SubType> {
        document: AdvancedCosmereCombat;
    }
    interface FlagConfig {
        Combat: {
            [MODULE_ID]: {
                lastBossTurnSpeed: TurnSpeed | string | null,
            };
        };
    }
}
