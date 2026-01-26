import { CosmereCombatant } from "@src/declarations/cosmere-rpg/documents/combatant";
import { activeCombat } from "@src/index";
import { getModuleSetting, SETTINGS } from "../settings";

export const TEMPLATES = {
	COMBATANT_ACTIONS_TEMPLATE: 'modules/cosmere-advanced-encounters/templates/combat/combatant-actions.hbs',
} as const;

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
	return foundry.applications.handlebars.loadTemplates([
		TEMPLATES.COMBATANT_ACTIONS_TEMPLATE,
	]);
};


Handlebars.registerHelper(
    'allowRestoreButtonAction',
    (combatantId: string) => {
		let combatant: CosmereCombatant = activeCombat.getCombatantActionsByCombatantId(combatantId)?.combatant!;
		if(!(getModuleSetting(SETTINGS.PLAYERS_CAN_RESTORE_ACTIONS)) && !(game.user?.isGM)){
			return false;
		}
        else if(!combatant.testUserPermission(game.user!, foundry.CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)){
			return false;
		}
		return true;
    },
);