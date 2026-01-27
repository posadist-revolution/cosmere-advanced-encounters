import { MODULE_ID } from "./constants";

export const SETTINGS = {
	REFRESH_COMBATANT_ACTIONS_WHEN: 'refreshCombatantActionsWhen',
    PULL_ACTIONS_FROM_CHAT: 'pullActionsFromChat',
    PLAYERS_CAN_RESTORE_ACTIONS: 'playersCanRestoreActions',
    CHECK_ACTION_USABILITY: 'checkActionUsability',
    CONDITIONS_APPLY_TO_ACTIONS: 'conditionsApplyToActions',
} as const;

type ModuleSettingsConfig = {
    [key in `${typeof MODULE_ID}.${typeof SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN}`]: string;
} & {
    [key in `${typeof MODULE_ID}.${typeof SETTINGS.PULL_ACTIONS_FROM_CHAT}`]: boolean;
} & {
    [key in `${typeof MODULE_ID}.${typeof SETTINGS.PLAYERS_CAN_RESTORE_ACTIONS}`]: boolean;
} & {
    [key in `${typeof MODULE_ID}.${typeof SETTINGS.CHECK_ACTION_USABILITY}`]: string;
} & {
    [key in `${typeof MODULE_ID}.${typeof SETTINGS.CONDITIONS_APPLY_TO_ACTIONS}`]: boolean;};

type ModuleSettingsKey = (typeof SETTINGS)[keyof typeof SETTINGS];
export function getModuleSetting<
    T extends string | boolean | number = string | boolean | number,
>(settingKey: ModuleSettingsKey) {
	return game.settings!.get(MODULE_ID, settingKey) as T;
}

export function setModuleSetting<
    TKey extends ModuleSettingsKey,
    TValue extends ModuleSettingsConfig[`${typeof MODULE_ID}.${TKey}`],
>(settingKey: TKey, value: TValue){
	return game.settings!.set(MODULE_ID, settingKey, value as any);
}

export const enum RefreshCombatantActionsWhenOptions {
    turnStart = `turnStart`,
    roundStart = `roundStart`,
    onlyManual = `onlyManual`,
}

export const enum CheckActionUsabilityOptions {
    none = `none`,
    warn = `warn`,
    block = `block`,
}

export function registerModuleSettings() {
    // TOGGLE REGISTRATION
    const toggleOptions = [
        {
            name: SETTINGS.PULL_ACTIONS_FROM_CHAT,
            default: true,
            scope: 'world',
        },
        {
            name: SETTINGS.PLAYERS_CAN_RESTORE_ACTIONS,
            default: true,
            scope: 'world',
        },
        {
            name: SETTINGS.CONDITIONS_APPLY_TO_ACTIONS,
            default: true,
            scope: 'world',
        }
    ];

    toggleOptions.forEach(option => {
		game.settings!.register(MODULE_ID, option.name, {
            name: game.i18n?.localize(`cosmere-advanced-encounters.settings.${option.name}.name`),
            hint: game.i18n?.localize(`cosmere-advanced-encounters.settings.${option.name}.hint`),
			scope: option.scope as "world" | "client" | undefined,
			default: option.default,
			type: Boolean,
			config: true
		});
    });

	// CONFIG REGISTRATION
	const configOptions = [
		{
			name: SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN,
            default: RefreshCombatantActionsWhenOptions.turnStart,
			scope: 'world',
            choices: {
                [RefreshCombatantActionsWhenOptions.turnStart]: game.i18n?.localize(
                    `cosmere-advanced-encounters.settings.refresh_combatant_actions_when_options.${RefreshCombatantActionsWhenOptions.turnStart}`,
                ),
                [RefreshCombatantActionsWhenOptions.roundStart]: game.i18n?.localize(
                    `cosmere-advanced-encounters.settings.refresh_combatant_actions_when_options.${RefreshCombatantActionsWhenOptions.roundStart}`,
                ),
                [RefreshCombatantActionsWhenOptions.onlyManual]: game.i18n?.localize(
                    `cosmere-advanced-encounters.settings.refresh_combatant_actions_when_options.${RefreshCombatantActionsWhenOptions.onlyManual}`,
                )
            },
		},
        {
			name: SETTINGS.CHECK_ACTION_USABILITY,
            default: CheckActionUsabilityOptions.warn,
			scope: 'world',
            choices: {
                [CheckActionUsabilityOptions.none]: game.i18n?.localize(
                    `cosmere-advanced-encounters.settings.check_action_usability_options.${CheckActionUsabilityOptions.none}`,
                ),
                [CheckActionUsabilityOptions.warn]: game.i18n?.localize(
                    `cosmere-advanced-encounters.settings.check_action_usability_options.${CheckActionUsabilityOptions.warn}`,
                ),
                [CheckActionUsabilityOptions.block]: game.i18n?.localize(
                    `cosmere-advanced-encounters.settings.check_action_usability_options.${CheckActionUsabilityOptions.block}`,
                )
            },
        }
	];

	configOptions.forEach(option => {
		game.settings!.register(MODULE_ID, option.name, {
            name: game.i18n?.localize(`cosmere-advanced-encounters.settings.${option.name}.name`),
            hint: game.i18n?.localize(`cosmere-advanced-encounters.settings.${option.name}.hint`),
			scope: option.scope as "world" | "client" | undefined,
			default: option.default,
			type: String,
			config: true,
            choices: option.choices
		});
	});
}


declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface SettingConfig extends ModuleSettingsConfig {}
}
