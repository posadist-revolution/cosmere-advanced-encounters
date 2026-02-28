import { HOOKS } from "@src/declarations/cosmere-rpg/constants/hooks";
import { ActiveEffectDataModel } from "@src/declarations/cosmere-rpg/data/active-effect";
import { WeaponItemDataModel, ArmorItemDataModel, EquipmentItemDataModel, LootItemDataModel, AncestryItemDataModel, CultureItemDataModel, PathItemDataModel, TalentItemDataModel, TraitItemDataModel, ActionItemDataModel, InjuryItemDataModel, ConnectionItemDataModel, GoalItemDataModel, PowerItemDataModel, TalentTreeItemDataModel } from "@src/declarations/cosmere-rpg/data/item";
import { CosmereActiveEffect, CosmereActor, CosmereChatMessage, MESSAGE_TYPES, CosmereCombat, CosmereCombatant, CosmereItem } from "@src/declarations/cosmere-rpg/documents";
import { ActorType, ItemType, InjuryType, TurnSpeed } from "@src/declarations/cosmere-rpg/types/cosmere";
import { PreApplyInjury, ApplyInjury, PreApplyDamage, ApplyDamage, PreRest, Rest } from "@src/declarations/cosmere-rpg/types/hooks/actor";
import { MessageInteract } from "@src/declarations/cosmere-rpg/types/hooks/chat-message";
import { TriggerTestEnricher, TriggerDamageEnricher } from "@src/declarations/cosmere-rpg/types/hooks/enricher";
import { PreUseItem, UseItem, PreModeActivateItem, ModeActivateItem, PreModeDeactivateItem, ModeDeactivateItem, ProgressGoal, PreProgressGoal, UpdateProgressGoal, PreUpdateProgressGoal, CompleteGoal, PreCompleteGoal } from "@src/declarations/cosmere-rpg/types/hooks/item";
import { PreMigration, Migration, PreMigrateVersion, MigrateVersion } from "@src/declarations/cosmere-rpg/types/hooks/migration";
import { PreInjuryTypeRoll, InjuryTypeRoll, PreInjuryDurationRoll, InjuryDurationRoll, PreShortRestRecoveryRoll, ShortRestRecoveryRoll, PreAttackRollConfiguration, AttackRollConfiguration, PreDamageRoll, DamageRoll, AttackRoll, SkillRoll, PreRoll, PreRollConfiguration, RollConfiguration } from "@src/declarations/cosmere-rpg/types/hooks/rolls";
import { SYSTEM_ID, MODULE_ID } from "../constants";
import { MODULE_COMBATANT_FLAGS } from "./combatant";
import { ModuleSettingsConfig } from "../settings";
import { AdvancedCosmereCombatant } from "../documents/combatant";
import { AdvancedCosmereCombat } from "../documents/combat";

export const COSMERE_ADVANCED_ENCOUNTERS: any = {};

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    interface DataModelConfig {
        ActiveEffect: {
            base: typeof ActiveEffectDataModel
        }
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    interface DataModelConfig {
        Actor: {
            'base': typeof CommonActorDataModel;
            [ActorType.Character]: typeof CharacterActorDataModel;
            [ActorType.Adversary]: typeof AdversaryActorDataModel;
        };
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    interface DataModelConfig {
        Item: {
            [ItemType.Weapon]: typeof WeaponItemDataModel;
            [ItemType.Armor]: typeof ArmorItemDataModel;
            [ItemType.Equipment]: typeof EquipmentItemDataModel;
            [ItemType.Loot]: typeof LootItemDataModel;
            [ItemType.Ancestry]: typeof AncestryItemDataModel;
            [ItemType.Culture]: typeof CultureItemDataModel;
            [ItemType.Path]: typeof PathItemDataModel;
            [ItemType.Talent]: typeof TalentItemDataModel;
            [ItemType.Trait]: typeof TraitItemDataModel;
            [ItemType.Action]: typeof ActionItemDataModel;
            [ItemType.Injury]: typeof InjuryItemDataModel;
            [ItemType.Connection]: typeof ConnectionItemDataModel;
            [ItemType.Goal]: typeof GoalItemDataModel;
            [ItemType.Power]: typeof PowerItemDataModel;
            [ItemType.TalentTree]: typeof TalentTreeItemDataModel;
        };
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredActiveEffect<SubType extends ActiveEffect.SubType> {
        document: CosmereActiveEffect<SubType>;
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredActor<SubType extends Actor.SubType> {
        document: CosmereActor;
    }

    interface FlagConfig {
        Actor: {
            'cosmere-rpg': {
                sheet: object;
                'sheet.mode': 'edit' | 'view';
                'sheet.expertisesCollapsed': boolean;
                'sheet.immunitiesCollapsed': boolean;
                'sheet.skillsCollapsed': boolean;
                'sheet.hideUnranked': boolean;
                'sheet.autosetPrototypeTokenValues': boolean;
                goals: object;
                'goals.hide-completed': boolean;
                [key: `meta.update.mode.${string}`]: string;
                [key: `mode.${string}`]: string;
            };
        };

        TableResult: {
            [SYSTEM_ID]: {
                'injury-data': {
                    type: InjuryType;
                    durationFormula: string;
                };
            };
        };
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredChatMessage<SubType extends ChatMessage.SubType> {
        document: CosmereChatMessage<SubType>;
    }
    interface FlagConfig {
        ChatMessage: {
            [SYSTEM_ID]: {
                message: {
                    item?: string;
                    type: (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];
                };
                'message.item': string;
                headerImg: string | undefined;
                // [key: `${typeof MESSAGE_TYPES.INJURY}.details`]: TableResult.CreateData;
                // [key: `${typeof MESSAGE_TYPES.INJURY}.roll`]: Roll.Data;
            };
        };
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredCombat<SubType extends Combat.SubType> {
        document: AdvancedCosmereCombat;
    }
}


declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredCombatant<SubType extends Combatant.SubType> {
        document: AdvancedCosmereCombatant;
    }
    interface FlagConfig {
        Combatant: {
            [SYSTEM_ID]: {
                turnSpeed: TurnSpeed;
                activated: boolean;
                bossFastActivated: boolean;
            };
            [MODULE_ID]: MODULE_COMBATANT_FLAGS;
        };
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    interface DocumentClassConfig {
        Actor: CosmereActor;
        Item: CosmereItem;
        Combat: AdvancedCosmereCombat;
        Combatant: AdvancedCosmereCombatant;
        ChatMessage: CosmereChatMessage;
        // Token: CosmereTokenDocument;
        ActiveEffect: CosmereActiveEffect;
    }
}


declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface ConfiguredItem<SubType extends Item.SubType> {
        document: CosmereItem;
    }

    interface FlagConfig {
        Item: {
            [SYSTEM_ID]: {
                sheet: {
                    mode: 'edit' | 'view';
                };
                'sheet.mode': 'edit' | 'view';
                meta: {
                    origin: any;
                };
                'meta.origin': any;
                previousLevel?: number;
                isStartingPath?: boolean;
            };
        };
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [HOOKS.PRE_APPLY_INJURY]: PreApplyInjury;
            [HOOKS.APPLY_INJURY]: ApplyInjury;
            [HOOKS.PRE_APPLY_DAMAGE]: PreApplyDamage;
            [HOOKS.APPLY_DAMAGE]: ApplyDamage;
            [HOOKS.PRE_REST]: PreRest;
            [HOOKS.REST]: Rest;
        }
    }
}
declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [HOOKS.MESSAGE_INTERACTED]: MessageInteract;
        }
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [HOOKS.TRIGGER_TEST_ENRICHER]: TriggerTestEnricher;
            [HOOKS.TRIGGER_DAMAGE_ENRICHER]: TriggerDamageEnricher;
        }
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [HOOKS.PRE_USE_ITEM]: PreUseItem;
            [HOOKS.USE_ITEM]: UseItem;
            [HOOKS.PRE_MODE_ACTIVATE_ITEM]: PreModeActivateItem;
            [HOOKS.MODE_ACTIVATE_ITEM]: ModeActivateItem;
            [HOOKS.PRE_MODE_DEACTIVATE_ITEM]: PreModeDeactivateItem;
            [HOOKS.MODE_DEACTIVATE_ITEM]: ModeDeactivateItem;
            [HOOKS.PROGRESS_GOAL]: ProgressGoal;
            [HOOKS.PRE_PROGRESS_GOAL]: PreProgressGoal;
            [HOOKS.UPDATE_PROGRESS_GOAL]: UpdateProgressGoal;
            [HOOKS.PRE_UPDATE_PROGRESS_GOAL]: PreUpdateProgressGoal;
            [HOOKS.COMPLETE_GOAL]: CompleteGoal;
            [HOOKS.PRE_COMPLETE_GOAL]: PreCompleteGoal;
        }
    }
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [HOOKS.PRE_MIGRATION]: PreMigration;
            [HOOKS.MIGRATION]: Migration;
            [HOOKS.PRE_MIGRATE_VERSION]: PreMigrateVersion;
            [HOOKS.MIGRATE_VERSION]: MigrateVersion;
        }
    }
}

declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface SettingConfig extends ModuleSettingsConfig {}
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [HOOKS.PRE_INJURY_TYPE_ROLL]: PreInjuryTypeRoll;
            [HOOKS.INJURY_TYPE_ROLL]: InjuryTypeRoll;
            [HOOKS.PRE_INJURY_DURATION_ROLL]: PreInjuryDurationRoll;
            [HOOKS.INJURY_DURATION_ROLL]: InjuryDurationRoll;
            [HOOKS.PRE_SHORT_REST_RECOVERY_ROLL]: PreShortRestRecoveryRoll;
            [HOOKS.SHORT_REST_RECOVERY_ROLL]: ShortRestRecoveryRoll;
            [HOOKS.PRE_ATTACK_ROLL_CONFIGURATION]: PreAttackRollConfiguration;
            [HOOKS.ATTACK_ROLL_CONFIGURATION]: AttackRollConfiguration;
            [HOOKS.PRE_DAMAGE_ROLL]: PreDamageRoll;
            [HOOKS.DAMAGE_ROLL]: DamageRoll;
            [HOOKS.ATTACK_ROLL]: AttackRoll;
            [HOOKS.SKILL_ROLL]: SkillRoll;
            // [key: ReturnType<typeof HOOKS.PRE_ROLL>]: PreRoll;
            // [key: ReturnType<typeof HOOKS.ROLL>]: Roll;
            // [key: ReturnType<typeof HOOKS.PRE_ROLL_CONFIGURATION>]: PreRollConfiguration;
            // [key: ReturnType<typeof HOOKS.ROLL_CONFIGURATION>]: RollConfiguration;
        }
    }
}
