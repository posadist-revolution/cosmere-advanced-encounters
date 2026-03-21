import { AdvancedCosmereCombatant } from "@src/module/documents/combatant";

export class CombatantUIHelper{
    public topElement: HTMLElement
    constructor(combatant: AdvancedCosmereCombatant){
        this.topElement = getCombatantUIElement(combatant);
    }

    public get numActionsAvailable(){
        let actionGroupsUI = this.topElement.querySelectorAll('.active.actions-available');
        let totalNumActions = 0;
        if(actionGroupsUI){
            for(const actionGroupUI of actionGroupsUI){
                let groupText = actionGroupUI.querySelector('.cosmere-icon')?.textContent
                console.log("Found action group with internal text:");
                console.log(groupText)
                totalNumActions += parseInt(groupText!);
            }
        }
        return totalNumActions;
    }
}

export function getCombatantUIElement(combatant: AdvancedCosmereCombatant){
    return (document.querySelector(`[data-combatant-id="${combatant.id}"]`) as HTMLElement);
}

