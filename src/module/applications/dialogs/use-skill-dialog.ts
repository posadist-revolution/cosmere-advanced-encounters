/**
* This macro opens a small window for the selected actor, listing all skills and their bonuses. Clicking a skill initiates a roll, the same as it would from the full character sheet.
**/

import { CosmereActor } from "@src/declarations/cosmere-rpg/documents";
import { Attribute, AttributeGroup, Skill } from "@src/declarations/cosmere-rpg/types/cosmere";
import { MODULE_ID } from "@src/module/constants";

declare interface ActorSkillData{
    attribute: Attribute;
    rank: number;
    mod: Derived<number>;
    /**
     * Derived field describing whether this skill is unlocked or not.
     * This field is only present for non-core skills.
     * Core skills are always unlocked.
     */
    unlocked?: boolean;
}

declare interface SkillListItemData{
    key: Skill;
    name: string;
    skill: ActorSkillData;
}

export async function Use_Skill(actor: CosmereActor) {

    //function to dynamically create an actor's skill list
    function getSkillList(actor: CosmereActor) {
        let skills: Record<AttributeGroup | "inv", SkillListItemData[]> = {
            [AttributeGroup.Physical]: [], [AttributeGroup.Cognitive]: [], [AttributeGroup.Spiritual]: [], ["inv"]: []};

        for (let skillKey in actor.system.skills) {
            let skill = actor.system.skills[skillKey];
            let skillValid = skill.unlocked == undefined || skill.unlocked == true || skill.rank > 0;
            if (skillValid && game.i18n) {
                let name = game.i18n.localize(CONFIG.COSMERE.skills[skillKey].label);
                let list = 'inv';
                if(CONFIG.COSMERE.skills[skillKey].core){
                    if(CONFIG.COSMERE.attributeGroups[AttributeGroup.Physical].attributes.includes(skill.attribute)){
                        list = AttributeGroup.Physical;
                    }
                    else if(CONFIG.COSMERE.attributeGroups[AttributeGroup.Cognitive].attributes.includes(skill.attribute)){
                        list = AttributeGroup.Cognitive;
                    }
                    else{
                        list = AttributeGroup.Spiritual;
                    }
                }

                skills[list as AttributeGroup | 'inv'].push( {key:skillKey as Skill, name:name, skill:skill});
            }
        }
        return skills;
    }  //end of function getSkillList

    function categoryName(categoryKey: (AttributeGroup | 'inv')){
        if(categoryKey !== 'inv'){
            return game.i18n?.localize(CONFIG.COSMERE.attributeGroups[categoryKey].label);
        }
        return game.i18n?.localize(`${MODULE_ID}.prompts.useSkill.inv`);
    }

    //function to generate pop-up dialog
    async function getDialog(actor: CosmereActor) {

        //generate HTML and push data actions to dialog object
        let skills = getSkillList(actor);
        let toHtml = "";

        toHtml += '<div class="flexrow" style="align-items: flex-start">'
        //loop through each category of skills in the skill list
        for (let category in skills) {
            let skillList = skills[category as AttributeGroup | 'inv'];
            if (skillList.length > 0) {
                toHtml +='<div class="flexcol">';
                toHtml += `<h4 style="align-self: center">${categoryName(category as AttributeGroup | 'inv')}</strong></h4>`;
                for (let skill of skillList) {
                    toHtml += `<button type="button" class="name" data-skill=="${skill.key}" id="${skill.key}">${skill.name} (+${actor.getSkillMod(skill.key)})</button>`;
                }

                toHtml += '</div>';
            }
        }
        toHtml +='</div>';

        // Create Dialog object
        let dialogObject = {
            window: {title: game.i18n?.format(`${MODULE_ID}.prompts.useSkill.title`,{NAME: actor.name})},
            position: {width: 600},
            content: toHtml,
            ok: { label: game.i18n?.localize(`${MODULE_ID}.prompts.useSkill.done`) },
            render: (_event: any, app: any, ) => {
                const html = app.element;
                html.querySelectorAll("button.name").forEach((e: any) => {
                    e.addEventListener("click", ()=>{
                        actor.rollSkill(e.id);
                    });
                });
            }
        }

        return await foundry.applications.api.DialogV2.prompt(dialogObject);
    }  //end function getDialog

    //call function to get dialog
    getDialog(actor);

}// end export function