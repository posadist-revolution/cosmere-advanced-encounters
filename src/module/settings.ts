import { MODULE_ID } from "./constants";

export const SETTINGS = {
	REFRESH_COMBATANT_ACTIONS_WHEN: 'refreshCombatantActionsWhen',
} as const;

type ModuleSettingsConfig = {
    [key in `${typeof MODULE_ID}.${typeof SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN}`]: string;};

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

export function registerModuleSettings() {
	// CONFIG REGISTRATION
	const configOptions = [
		{
			name: SETTINGS.REFRESH_COMBATANT_ACTIONS_WHEN,
            default: RefreshCombatantActionsWhenOptions.turnStart,
			scope: 'world',
		},
	];

	configOptions.forEach(option => {
		game.settings!.register(MODULE_ID, option.name, {
			scope: option.scope as "world" | "client" | undefined,
			default: option.default,
			type: String,
			config: true,
		});
	});
}


declare module '@league-of-foundry-developers/foundry-vtt-types/configuration' {
    interface SettingConfig extends ModuleSettingsConfig {}
}
