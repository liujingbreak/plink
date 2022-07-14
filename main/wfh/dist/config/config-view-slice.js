"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.getState = exports.dispatcher = exports.configViewSlice = void 0;
const tslib_1 = require("tslib");
const store_1 = require("../store");
const op = tslib_1.__importStar(require("rxjs/operators"));
const rx = tslib_1.__importStar(require("rxjs"));
const index_1 = require("./index");
const path_1 = tslib_1.__importDefault(require("path"));
// import Selector from '../utils/ts-ast-query';
const dist_1 = require("../../../packages/thread-promise-pool/dist");
const package_mgr_1 = require("../package-mgr");
const os_1 = tslib_1.__importDefault(require("os"));
const log4js_1 = require("log4js");
// import {ConfigHandlerMgr} from '../config-handler';
const log = (0, log4js_1.getLogger)('plink.config-view-slice');
const initialState = {
    propertyByName: new Map(),
    packageMetaByName: new Map(),
    updateChecksum: 0
};
exports.configViewSlice = store_1.stateFactory.newSlice({
    name: 'configView',
    initialState,
    reducers: {
        loadPackageSettingMeta(d, action) { },
        _packageSettingMetaLoaded(s, { payload: [propMetas, dtsFile, pkg] }) {
            s.packageMetaByName.set(pkg.name, {
                typeFile: dtsFile,
                properties: propMetas.map(item => item.property)
            });
            for (const item of propMetas) {
                s.propertyByName.set(pkg.name + ',' + item.property, item);
            }
        },
        packageSettingsMetaLoaded(s) {
            // Sort packages to move Plink package to the first
            s.packageNames = Array.from(s.packageMetaByName.keys());
            const plinkIdx = s.packageNames.findIndex(name => name === '@wfh/plink');
            s.packageNames.splice(plinkIdx, 1);
            s.packageNames.unshift('@wfh/plink');
            s.updateChecksum++;
        }
    }
});
// type MapValue<M> = M extends Map<string, infer T> ? T : never;
exports.dispatcher = store_1.stateFactory.bindActionCreators(exports.configViewSlice);
store_1.stateFactory.addEpic((action$, state$) => {
    return rx.merge(action$.pipe((0, store_1.ofPayloadAction)(exports.configViewSlice.actions.loadPackageSettingMeta), op.switchMap(({ payload }) => {
        const pool = new dist_1.Pool(os_1.default.cpus().length - 1);
        const pkgState = (0, package_mgr_1.getState)();
        const plinkPkg = pkgState.linkedDrcp ? pkgState.linkedDrcp : pkgState.installedDrcp;
        return Promise.all(Array.from((0, index_1.getPackageSettingFiles)(payload.workspaceKey, payload.packageName ? new Set([payload.packageName]) : undefined)).concat([['wfh/dist/config/config-slice', 'PlinkSettings', '', '', plinkPkg]])
            .map(([typeFile, typeExport, , , pkg]) => {
            const dtsFileBase = path_1.default.resolve(pkg.realPath, typeFile);
            return pool.submit({
                file: path_1.default.resolve(__dirname, 'config-view-slice-worker.js'),
                exportFn: 'default',
                args: [dtsFileBase, typeExport /* , ConfigHandlerMgr.compilerOptions*/]
            })
                .then(([propMetas, dtsFile]) => {
                log.debug(propMetas);
                exports.dispatcher._packageSettingMetaLoaded([propMetas, path_1.default.relative(pkg.realPath, dtsFile), pkg]);
            });
        }));
    }), op.tap(() => {
        exports.dispatcher.packageSettingsMetaLoaded();
    })), store_1.processExitAction$.pipe(op.tap(() => exports.dispatcher._change(s => {
        s.packageMetaByName.clear();
        s.propertyByName.clear();
    })))).pipe(op.catchError((ex, src) => {
        log.error(ex);
        return src;
    }), op.ignoreElements());
});
function getState() {
    return store_1.stateFactory.sliceState(exports.configViewSlice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.configViewSlice);
}
exports.getStore = getStore;
//# sourceMappingURL=config-view-slice.js.map