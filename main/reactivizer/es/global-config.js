// const globalConfigChange$ = new rx.Subject<RxControlConfigEntryType>();
// export const globalConfigChanges = globalConfigChange$.asObservable();
export const defaultConfig = {
    debug: false,
    debugIncludeTypes: null,
    debugExcludeTypes: [],
    logStyle: 'full',
    log: null
};
export const allRefs = new Set();
export function addConfigurable(item) {
    const ref = new WeakRef(item);
    allRefs.add(ref);
    finalizationRegistry.register(item, ref, item);
}
export function* iterateConfigurables() {
    for (const item of allRefs) {
        const obj = item.deref();
        if (obj)
            yield obj;
    }
}
// FinalizationRegistry must be strongly refered by ROOT module to avoid being GCed
// e.g. being referred by a "export" object
const finalizationRegistry = new FinalizationRegistry(ref => {
    // eslint-disable-next-line no-console
    allRefs.delete(ref);
});
export function configAll(opts) {
    for (const item of iterateConfigurables()) {
        item.config(opts);
    }
}
//# sourceMappingURL=global-config.js.map