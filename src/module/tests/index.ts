import { Quench } from "@ethaks/fvtt-quench";
import { registerInternalTestBatches } from "./internal";


export function initializeTestHooks(){
    Hooks.on('quenchReady', (
        quench: Quench
    ) => {
        useTestHooks = true;
        registerAllTestBatches(quench);
    });
}

function registerAllTestBatches(quench: Quench){
    registerInternalTestBatches(quench);
}

declare module "@league-of-foundry-developers/foundry-vtt-types/configuration" {
	namespace Hooks {
        interface HookConfig {
            /**
             * A hook event that fires when Quench is ready to register batches.
             *
             * @group Initialization
             * @see {@link quench!Quench#registerBatch quench.registerBatch}
             * @remarks This is called by {@link Hooks.callAll}
             * @param quench - The global {@link Quench} instance
             */
            quenchReady: (quench: Quench) => void;
        }
	}
}