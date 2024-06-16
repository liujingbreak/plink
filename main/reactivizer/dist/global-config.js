"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configAll = exports.iterateConfigurables = exports.addConfigurable = exports.allRefs = exports.defaultConfig = void 0;
// const globalConfigChange$ = new rx.Subject<RxControlConfigEntryType>();
// export const globalConfigChanges = globalConfigChange$.asObservable();
exports.defaultConfig = {
    name: '',
    debug: false,
    debugIncludeTypes: null,
    debugExcludeTypes: [],
    logStyle: 'full',
    log: null
};
exports.allRefs = new Set();
function addConfigurable(item) {
    const ref = new WeakRef(item);
    exports.allRefs.add(ref);
    finalizationRegistry.register(item, ref, item);
}
exports.addConfigurable = addConfigurable;
function* iterateConfigurables() {
    for (const item of exports.allRefs) {
        const obj = item.deref();
        if (obj)
            yield obj;
    }
}
exports.iterateConfigurables = iterateConfigurables;
// FinalizationRegistry must be strongly refered by ROOT module to avoid being GCed
// e.g. being referred by a "export" object
const finalizationRegistry = new FinalizationRegistry(ref => {
    // eslint-disable-next-line no-console
    exports.allRefs.delete(ref);
});
function configAll(opts) {
    for (const item of iterateConfigurables()) {
        item.config(opts);
    }
}
exports.configAll = configAll;
//# sourceMappingURL=global-config.js.map