"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.getState = exports.dispatcher = exports.configViewSlice = void 0;
const store_1 = require("../store");
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
const index_1 = require("./index");
const path_1 = __importDefault(require("path"));
// import Selector from '../utils/ts-ast-query';
const dist_1 = require("../../../thread-promise-pool/dist");
const package_mgr_1 = require("../package-mgr");
const os_1 = __importDefault(require("os"));
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
        return Promise.all(Array.from((0, index_1.getPackageSettingFiles)(payload.workspaceKey, payload.packageName ? new Set([payload.packageName]) : undefined)).concat([['wfh/dist/config/config-slice', 'BasePlinkSettings', '', '', plinkPkg]])
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
    })), action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'), op.tap(() => exports.dispatcher._change(s => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvY29uZmlnLXZpZXctc2xpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUF1RDtBQUN2RCxtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLG1DQUErQztBQUUvQyxnREFBd0I7QUFFeEIsZ0RBQWdEO0FBQ2hELDREQUF1RDtBQUN2RCxnREFBdUU7QUFDdkUsNENBQW9CO0FBQ3BCLG1DQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLHlCQUF5QixDQUFDLENBQUM7QUFjakQsTUFBTSxZQUFZLEdBQW9CO0lBQ3BDLGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN6QixpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUM1QixjQUFjLEVBQUUsQ0FBQztDQUNsQixDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbkQsSUFBSSxFQUFFLFlBQVk7SUFDbEIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLHNCQUFzQixDQUFDLENBQUMsRUFBRSxNQUFtRSxJQUFHLENBQUM7UUFDakcseUJBQXlCLENBQUMsQ0FBQyxFQUN6QixFQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQXVEO1lBQzFGLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtnQkFDaEMsUUFBUSxFQUFFLE9BQU87Z0JBQ2pCLFVBQVUsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUNqRCxDQUFDLENBQUM7WUFFSCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFD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cnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1Byb3BlcnR5TWV0YX0gZnJvbSAnLi9jb25maWcudHlwZXMnO1xuLy8gaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQge1Bvb2x9IGZyb20gJy4uLy4uLy4uL3RocmVhZC1wcm9taXNlLXBvb2wvZGlzdCc7XG5pbXBvcnQge2dldFN0YXRlIGFzIGdldFBrZ01nclN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuLy8gaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyfSBmcm9tICcuLi9jb25maWctaGFuZGxlcic7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZy12aWV3LXNsaWNlJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnVmlld1N0YXRlIHtcbiAgLyoqIGtleSBpcyBwYWNrYWdlTmFtZSArICcsJyArIHByb3BlcnR5TmFtZSAqL1xuICBwcm9wZXJ0eUJ5TmFtZTogTWFwPHN0cmluZywgUHJvcGVydHlNZXRhPjtcbiAgLyoqIGtleSBpcyBwYWNrYWdlIG5hbWUgKi9cbiAgcGFja2FnZU1ldGFCeU5hbWU6IE1hcDxzdHJpbmcsIHtcbiAgICBwcm9wZXJ0aWVzOiBzdHJpbmdbXTtcbiAgICB0eXBlRmlsZTogc3RyaW5nO1xuICB9PjtcbiAgcGFja2FnZU5hbWVzPzogc3RyaW5nW107XG4gIHVwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ29uZmlnVmlld1N0YXRlID0ge1xuICBwcm9wZXJ0eUJ5TmFtZTogbmV3IE1hcCgpLFxuICBwYWNrYWdlTWV0YUJ5TmFtZTogbmV3IE1hcCgpLFxuICB1cGRhdGVDaGVja3N1bTogMFxufTtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ1ZpZXdTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjb25maWdWaWV3JyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGxvYWRQYWNrYWdlU2V0dGluZ01ldGEoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHt3b3Jrc3BhY2VLZXk6IHN0cmluZywgcGFja2FnZU5hbWU/OiBzdHJpbmd9Pikge30sXG4gICAgX3BhY2thZ2VTZXR0aW5nTWV0YUxvYWRlZChzLFxuICAgICAge3BheWxvYWQ6IFtwcm9wTWV0YXMsIGR0c0ZpbGUsIHBrZ119OiBQYXlsb2FkQWN0aW9uPFtQcm9wZXJ0eU1ldGFbXSwgc3RyaW5nLCBQYWNrYWdlSW5mb10+KSB7XG4gICAgICBzLnBhY2thZ2VNZXRhQnlOYW1lLnNldChwa2cubmFtZSwge1xuICAgICAgICB0eXBlRmlsZTogZHRzRmlsZSxcbiAgICAgICAgcHJvcGVydGllczogcHJvcE1ldGFzLm1hcChpdGVtID0+IGl0ZW0ucHJvcGVydHkpXG4gICAgICB9KTtcblxuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHByb3BNZXRhcykge1xuICAgICAgICBzLnByb3BlcnR5QnlOYW1lLnNldChwa2cubmFtZSArICcsJyArIGl0ZW0ucHJvcGVydHksIGl0ZW0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcGFja2FnZVNldHRpbmdzTWV0YUxvYWRlZChzKSB7XG4gICAgICAvLyBTb3J0IHBhY2thZ2VzIHRvIG1vdmUgUGxpbmsgcGFja2FnZSB0byB0aGUgZmlyc3RcbiAgICAgIHMucGFja2FnZU5hbWVzID0gQXJyYXkuZnJvbShzLnBhY2thZ2VNZXRhQnlOYW1lLmtleXMoKSk7XG4gICAgICBjb25zdCBwbGlua0lkeCA9IHMucGFja2FnZU5hbWVzLmZpbmRJbmRleChuYW1lID0+IG5hbWUgPT09ICdAd2ZoL3BsaW5rJyk7XG4gICAgICBzLnBhY2thZ2VOYW1lcy5zcGxpY2UocGxpbmtJZHgsIDEpO1xuICAgICAgcy5wYWNrYWdlTmFtZXMudW5zaGlmdCgnQHdmaC9wbGluaycpO1xuICAgICAgcy51cGRhdGVDaGVja3N1bSsrO1xuICAgIH1cbiAgfVxufSk7XG5cbi8vIHR5cGUgTWFwVmFsdWU8TT4gPSBNIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogbmV2ZXI7XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjb25maWdWaWV3U2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7Y29uZmlnVmlldzogQ29uZmlnVmlld1N0YXRlfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihjb25maWdWaWV3U2xpY2UuYWN0aW9ucy5sb2FkUGFja2FnZVNldHRpbmdNZXRhKSxcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBuZXcgUG9vbChvcy5jcHVzKCkubGVuZ3RoIC0gMSk7XG4gICAgICAgIGNvbnN0IHBrZ1N0YXRlID0gZ2V0UGtnTWdyU3RhdGUoKTtcbiAgICAgICAgY29uc3QgcGxpbmtQa2cgPSBwa2dTdGF0ZS5saW5rZWREcmNwID8gcGtnU3RhdGUubGlua2VkRHJjcCA6IHBrZ1N0YXRlLmluc3RhbGxlZERyY3AhO1xuXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChBcnJheS5mcm9tKGdldFBhY2thZ2VTZXR0aW5nRmlsZXMoXG4gICAgICAgICAgICBwYXlsb2FkLndvcmtzcGFjZUtleSwgcGF5bG9hZC5wYWNrYWdlTmFtZSA/IG5ldyBTZXQoW3BheWxvYWQucGFja2FnZU5hbWVdKSA6IHVuZGVmaW5lZClcbiAgICAgICAgICApLmNvbmNhdChbIFsnd2ZoL2Rpc3QvY29uZmlnL2NvbmZpZy1zbGljZScsICdCYXNlUGxpbmtTZXR0aW5ncycsICcnLCAnJywgcGxpbmtQa2ddIF0pXG4gICAgICAgICAgLm1hcCgoW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCwscGtnXSkgPT4ge1xuXG4gICAgICAgICAgICBjb25zdCBkdHNGaWxlQmFzZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHR5cGVGaWxlKTtcbiAgICAgICAgICAgIHJldHVybiBwb29sLnN1Ym1pdDxbbWV0YXM6IFByb3BlcnR5TWV0YVtdLCBkdHNGaWxlOiBzdHJpbmddPih7XG4gICAgICAgICAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjb25maWctdmlldy1zbGljZS13b3JrZXIuanMnKSxcbiAgICAgICAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgYXJnczogW2R0c0ZpbGVCYXNlLCB0eXBlRXhwb3J0LyogLCBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyovXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKChbcHJvcE1ldGFzLCBkdHNGaWxlXSkgPT4ge1xuICAgICAgICAgICAgICBsb2cuZGVidWcocHJvcE1ldGFzKTtcbiAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fcGFja2FnZVNldHRpbmdNZXRhTG9hZGVkKFtwcm9wTWV0YXMsIFBhdGgucmVsYXRpdmUocGtnLnJlYWxQYXRoLCBkdHNGaWxlKSwgcGtnXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIucGFja2FnZVNldHRpbmdzTWV0YUxvYWRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnQkVGT1JFX1NBVkVfU1RBVEUnKSxcbiAgICAgIG9wLnRhcCgoKSA9PiBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgIHMucGFja2FnZU1ldGFCeU5hbWUuY2xlYXIoKTtcbiAgICAgICAgcy5wcm9wZXJ0eUJ5TmFtZS5jbGVhcigpO1xuICAgICAgfSkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcigoZXgsIHNyYykgPT4ge1xuICAgICAgbG9nLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNvbmZpZ1ZpZXdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1ZpZXdTbGljZSk7XG59XG4iXX0=