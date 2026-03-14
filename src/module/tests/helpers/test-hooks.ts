import { MODULE_ID } from "@src/module/constants";

export declare const enum TEST_HOOKS {
    PULL_ACTIONS = `${MODULE_ID}.pullActions`
}
export type PullActionsFromFlags = (
    combatantId: string
) => void;


declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
    namespace Hooks {
        interface HookConfig {
            [TEST_HOOKS.PULL_ACTIONS]: PullActionsFromFlags
        }
    }
}