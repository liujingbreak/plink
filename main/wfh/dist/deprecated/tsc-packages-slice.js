"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.getState = exports.tscActionDispatcher = exports.tscSlice = void 0;
const store_1 = require("../store");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const package_mgr_1 = require("../package-mgr");
const initialState = {
    configs: new Map()
};
exports.tscSlice = store_1.stateFactory.newSlice({
    name: 'tsc',
    initialState,
    reducers: {
        // normalizePackageJsonTscProperty(d, action: PayloadAction) {},
        putConfig(draft, { payload }) {
            for (const { pkg, items } of payload)
                draft.configs.set(pkg, items);
        }
    }
});
exports.tscActionDispatcher = store_1.stateFactory.bindActionCreators(exports.tscSlice);
const releaseEpic = store_1.stateFactory.addEpic((action$) => {
    return (0, rxjs_1.merge)((0, package_mgr_1.getStore)().pipe((0, operators_1.map)(s => s.srcPackages), (0, operators_1.distinctUntilChanged)(), (0, operators_1.skip)(1), (0, operators_1.debounceTime)(500), (0, operators_1.mergeMap)(pkgMap => {
        return (0, rxjs_1.merge)(...Array.from(pkgMap.values())
            .map(pkg => normalizePackageJsonTscProperty$(pkg)))
            .pipe((0, operators_1.reduce)((all, configs) => {
            all.push(configs);
            return all;
        }, []));
    }), (0, operators_1.map)(configs => exports.tscActionDispatcher.putConfig(configs)))).pipe((0, operators_1.catchError)(ex => {
        // eslint-disable-next-line no-console
        console.error(ex);
        return (0, rxjs_1.of)();
    }), (0, operators_1.ignoreElements)());
});
function getState() {
    return store_1.stateFactory.sliceState(exports.tscSlice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.tscSlice);
}
exports.getStore = getStore;
function normalizePackageJsonTscProperty$(pkg) {
    const dr = pkg.json.dr;
    let rawConfigs;
    if (dr && dr.tsc) {
        const items = Array.isArray(dr.tsc) ? dr.tsc : [dr.tsc];
        rawConfigs = (0, rxjs_1.from)(items);
    }
    else {
        const rawConfigs2 = new rxjs_1.ReplaySubject();
        rawConfigs = rawConfigs2;
        fs_1.default.exists(path_1.default.resolve(pkg.realPath, 'isom'), exists => {
            if (exists) {
                const temp = { rootDir: 'isom', outDir: 'isom' };
                rawConfigs2.next(temp);
            }
            const temp = {
                rootDir: 'ts',
                outDir: 'dist'
            };
            rawConfigs2.next(temp);
            rawConfigs2.complete();
        });
    }
    return rawConfigs.pipe((0, operators_1.reduce)((all, item) => {
        all.push(item);
        return all;
    }, []), (0, operators_1.map)(items => {
        return { pkg: pkg.name, items };
    }));
}
if (module.hot) {
    module.hot.dispose(data => {
        store_1.stateFactory.removeSlice(exports.tscSlice);
        releaseEpic();
    });
}
//# sourceMappingURL=tsc-packages-slice.js.map