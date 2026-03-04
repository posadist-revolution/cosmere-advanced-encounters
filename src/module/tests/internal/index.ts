import { Quench, QuenchBatchContext } from "@ethaks/fvtt-quench";
import { MODULE_ID, MODULE_NAME } from "@src/module/constants";

export function registerInternalTestBatch(quench: Quench){
    quench.registerBatch(
        `${MODULE_ID}.internal`,
        (context) => {
            const { describe, it, assert } = context;


            describe("Combat tracker UI suite", function() {
                it("placeholder test", function() {
                    assert.ok(false, "Internal test infrastructure is working");
                });
            });



            describe("Combatant Actions suite", function() {
                it("placeholder test 2", function() {
                    assert.ok(true, "Internal test infrastructure is working");
                });
            });
        },
        { displayName: `${MODULE_NAME}: Internal Tests`}
    );
}