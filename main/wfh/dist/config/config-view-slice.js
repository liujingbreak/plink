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
const dist_1 = require("../../../packages/thread-promise-pool/dist");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvY29uZmlnLXZpZXctc2xpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUEyRTtBQUMzRSxtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLG1DQUErQztBQUUvQyxnREFBd0I7QUFFeEIsZ0RBQWdEO0FBQ2hELHFFQUFnRTtBQUNoRSxnREFBdUU7QUFDdkUsNENBQW9CO0FBQ3BCLG1DQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLHlCQUF5QixDQUFDLENBQUM7QUFjakQsTUFBTSxZQUFZLEdBQW9CO0lBQ3BDLGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN6QixpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUM1QixjQUFjLEVBQUUsQ0FBQztDQUNsQixDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbkQsSUFBSSxFQUFFLFlBQVk7SUFDbEIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLHNCQUFzQixDQUFDLENBQUMsRUFBRSxNQUFtRSxJQUFHLENBQUM7UUFDakcseUJBQXlCLENBQUMsQ0FBQyxFQUN6QixFQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQXVEO1lBQzFGLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtnQkFDaEMsUUFBUSxFQUFFLE9BQU87Z0JBQ2pCLFVBQVUsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUNqRCxDQUFDLENBQUM7WUFFSCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFD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QUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQy9GLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQVUsQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUNILEVBQ0QsMEJBQWtCLENBQUMsSUFBSSxDQUNyQixFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2xDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM1QixDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQ0osQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ3hCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDZCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLHVCQUFlLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsdUJBQWUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFGRCw0QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7c3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24sIHByb2Nlc3NFeGl0QWN0aW9uJH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1Byb3BlcnR5TWV0YX0gZnJvbSAnLi9jb25maWcudHlwZXMnO1xuLy8gaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQge1Bvb2x9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3RocmVhZC1wcm9taXNlLXBvb2wvZGlzdCc7XG5pbXBvcnQge2dldFN0YXRlIGFzIGdldFBrZ01nclN0YXRlLCBQYWNrYWdlSW5mb30gZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuLy8gaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyfSBmcm9tICcuLi9jb25maWctaGFuZGxlcic7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZy12aWV3LXNsaWNlJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29uZmlnVmlld1N0YXRlIHtcbiAgLyoqIGtleSBpcyBwYWNrYWdlTmFtZSArICcsJyArIHByb3BlcnR5TmFtZSAqL1xuICBwcm9wZXJ0eUJ5TmFtZTogTWFwPHN0cmluZywgUHJvcGVydHlNZXRhPjtcbiAgLyoqIGtleSBpcyBwYWNrYWdlIG5hbWUgKi9cbiAgcGFja2FnZU1ldGFCeU5hbWU6IE1hcDxzdHJpbmcsIHtcbiAgICBwcm9wZXJ0aWVzOiBzdHJpbmdbXTtcbiAgICB0eXBlRmlsZTogc3RyaW5nO1xuICB9PjtcbiAgcGFja2FnZU5hbWVzPzogc3RyaW5nW107XG4gIHVwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ29uZmlnVmlld1N0YXRlID0ge1xuICBwcm9wZXJ0eUJ5TmFtZTogbmV3IE1hcCgpLFxuICBwYWNrYWdlTWV0YUJ5TmFtZTogbmV3IE1hcCgpLFxuICB1cGRhdGVDaGVja3N1bTogMFxufTtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ1ZpZXdTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjb25maWdWaWV3JyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGxvYWRQYWNrYWdlU2V0dGluZ01ldGEoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHt3b3Jrc3BhY2VLZXk6IHN0cmluZzsgcGFja2FnZU5hbWU/OiBzdHJpbmd9Pikge30sXG4gICAgX3BhY2thZ2VTZXR0aW5nTWV0YUxvYWRlZChzLFxuICAgICAge3BheWxvYWQ6IFtwcm9wTWV0YXMsIGR0c0ZpbGUsIHBrZ119OiBQYXlsb2FkQWN0aW9uPFtQcm9wZXJ0eU1ldGFbXSwgc3RyaW5nLCBQYWNrYWdlSW5mb10+KSB7XG4gICAgICBzLnBhY2thZ2VNZXRhQnlOYW1lLnNldChwa2cubmFtZSwge1xuICAgICAgICB0eXBlRmlsZTogZHRzRmlsZSxcbiAgICAgICAgcHJvcGVydGllczogcHJvcE1ldGFzLm1hcChpdGVtID0+IGl0ZW0ucHJvcGVydHkpXG4gICAgICB9KTtcblxuICAgICAgZm9yIChjb25zdCBpdGVtIG9mIHByb3BNZXRhcykge1xuICAgICAgICBzLnByb3BlcnR5QnlOYW1lLnNldChwa2cubmFtZSArICcsJyArIGl0ZW0ucHJvcGVydHksIGl0ZW0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcGFja2FnZVNldHRpbmdzTWV0YUxvYWRlZChzKSB7XG4gICAgICAvLyBTb3J0IHBhY2thZ2VzIHRvIG1vdmUgUGxpbmsgcGFja2FnZSB0byB0aGUgZmlyc3RcbiAgICAgIHMucGFja2FnZU5hbWVzID0gQXJyYXkuZnJvbShzLnBhY2thZ2VNZXRhQnlOYW1lLmtleXMoKSk7XG4gICAgICBjb25zdCBwbGlua0lkeCA9IHMucGFja2FnZU5hbWVzLmZpbmRJbmRleChuYW1lID0+IG5hbWUgPT09ICdAd2ZoL3BsaW5rJyk7XG4gICAgICBzLnBhY2thZ2VOYW1lcy5zcGxpY2UocGxpbmtJZHgsIDEpO1xuICAgICAgcy5wYWNrYWdlTmFtZXMudW5zaGlmdCgnQHdmaC9wbGluaycpO1xuICAgICAgcy51cGRhdGVDaGVja3N1bSsrO1xuICAgIH1cbiAgfVxufSk7XG5cbi8vIHR5cGUgTWFwVmFsdWU8TT4gPSBNIGV4dGVuZHMgTWFwPHN0cmluZywgaW5mZXIgVD4gPyBUIDogbmV2ZXI7XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjb25maWdWaWV3U2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx7Y29uZmlnVmlldzogQ29uZmlnVmlld1N0YXRlfT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gcngubWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihjb25maWdWaWV3U2xpY2UuYWN0aW9ucy5sb2FkUGFja2FnZVNldHRpbmdNZXRhKSxcbiAgICAgIG9wLnN3aXRjaE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBuZXcgUG9vbChvcy5jcHVzKCkubGVuZ3RoIC0gMSk7XG4gICAgICAgIGNvbnN0IHBrZ1N0YXRlID0gZ2V0UGtnTWdyU3RhdGUoKTtcbiAgICAgICAgY29uc3QgcGxpbmtQa2cgPSBwa2dTdGF0ZS5saW5rZWREcmNwID8gcGtnU3RhdGUubGlua2VkRHJjcCA6IHBrZ1N0YXRlLmluc3RhbGxlZERyY3AhO1xuXG4gICAgICAgIHJldHVybiBQcm9taXNlLmFsbChBcnJheS5mcm9tKGdldFBhY2thZ2VTZXR0aW5nRmlsZXMoXG4gICAgICAgICAgICBwYXlsb2FkLndvcmtzcGFjZUtleSwgcGF5bG9hZC5wYWNrYWdlTmFtZSA/IG5ldyBTZXQoW3BheWxvYWQucGFja2FnZU5hbWVdKSA6IHVuZGVmaW5lZClcbiAgICAgICAgICApLmNvbmNhdChbIFsnd2ZoL2Rpc3QvY29uZmlnL2NvbmZpZy1zbGljZScsICdCYXNlUGxpbmtTZXR0aW5ncycsICcnLCAnJywgcGxpbmtQa2ddIF0pXG4gICAgICAgICAgLm1hcCgoW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCAsICwgcGtnXSkgPT4ge1xuXG4gICAgICAgICAgICBjb25zdCBkdHNGaWxlQmFzZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHR5cGVGaWxlKTtcbiAgICAgICAgICAgIHJldHVybiBwb29sLnN1Ym1pdDxbbWV0YXM6IFByb3BlcnR5TWV0YVtdLCBkdHNGaWxlOiBzdHJpbmddPih7XG4gICAgICAgICAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjb25maWctdmlldy1zbGljZS13b3JrZXIuanMnKSxcbiAgICAgICAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgYXJnczogW2R0c0ZpbGVCYXNlLCB0eXBlRXhwb3J0LyogLCBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyovXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKChbcHJvcE1ldGFzLCBkdHNGaWxlXSkgPT4ge1xuICAgICAgICAgICAgICBsb2cuZGVidWcocHJvcE1ldGFzKTtcbiAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fcGFja2FnZVNldHRpbmdNZXRhTG9hZGVkKFtwcm9wTWV0YXMsIFBhdGgucmVsYXRpdmUocGtnLnJlYWxQYXRoLCBkdHNGaWxlKSwgcGtnXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIucGFja2FnZVNldHRpbmdzTWV0YUxvYWRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIHByb2Nlc3NFeGl0QWN0aW9uJC5waXBlKFxuICAgICAgb3AudGFwKCgpID0+IGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5wYWNrYWdlTWV0YUJ5TmFtZS5jbGVhcigpO1xuICAgICAgICBzLnByb3BlcnR5QnlOYW1lLmNsZWFyKCk7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKChleCwgc3JjKSA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY29uZmlnVmlld1NsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY29uZmlnVmlld1NsaWNlKTtcbn1cbiJdfQ==