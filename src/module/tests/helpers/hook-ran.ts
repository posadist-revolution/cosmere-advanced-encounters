export async function hookRan(hookName: Hooks.HookName){
    console.log(`Test waiting on hook: ${hookName}`);
    return new Promise<void>((resolve, reject) => {
        let hookId = Hooks.on(hookName, () =>{
            resolve();
            Hooks.off(hookName, hookId);
        });
    });
}

export async function hookRanAfterCall(hookName: Hooks.HookName, fn: Function, ...args: any){
    let hookRanPromise = hookRan(hookName);
    fn(args);
    return hookRanPromise;
}