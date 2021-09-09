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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvY29uZmlnLXZpZXctc2xpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUEyRTtBQUMzRSxtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLG1DQUErQztBQUUvQyxnREFBd0I7QUFFeEIsZ0RBQWdEO0FBQ2hELHFFQUFnRTtBQUNoRSxnREFBdUU7QUFDdkUsNENBQW9CO0FBQ3BCLG1DQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLHlCQUF5QixDQUFDLENBQUM7QUFjakQsTUFBTSxZQUFZLEdBQW9CO0lBQ3BDLGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN6QixpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUM1QixjQUFjLEVBQUUsQ0FBQztDQUNsQixDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbkQsSUFBSSxFQUFFLFlBQVk7SUFDbEIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLHNCQUFzQixDQUFDLENBQUMsRUFBRSxNQUFtRSxJQUFHLENBQUM7UUFDakcseUJBQXlCLENBQUMsQ0FBQyxFQUN6QixFQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQXVEO1lBQzFGLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtnQkFDaEMsUUFBUSxFQUFFLE9BQU87Z0JBQ2pCLFVBQVUsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUNqRCxDQUFDLENBQUM7WUFFSCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFD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QUFHLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDL0YsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ1IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7UUFDVixrQkFBVSxDQUFDLHlCQUF5QixFQUFFLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQ0gsRUFDRCwwQkFBa0IsQ0FBQyxJQUFJLENBQ3JCLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsa0JBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDbEMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzVCLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FDSixDQUNGLENBQUMsSUFBSSxDQUNKLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNkLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsdUJBQWUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyx1QkFBZSxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUZELDRCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiwgcHJvY2Vzc0V4aXRBY3Rpb24kfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UHJvcGVydHlNZXRhfSBmcm9tICcuL2NvbmZpZy50eXBlcyc7XG4vLyBpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7UG9vbH0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvdGhyZWFkLXByb21pc2UtcG9vbC9kaXN0JztcbmltcG9ydCB7Z2V0U3RhdGUgYXMgZ2V0UGtnTWdyU3RhdGUsIFBhY2thZ2VJbmZvfSBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3J9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsuY29uZmlnLXZpZXctc2xpY2UnKTtcblxuZXhwb3J0IGludGVyZmFjZSBDb25maWdWaWV3U3RhdGUge1xuICAvKioga2V5IGlzIHBhY2thZ2VOYW1lICsgJywnICsgcHJvcGVydHlOYW1lICovXG4gIHByb3BlcnR5QnlOYW1lOiBNYXA8c3RyaW5nLCBQcm9wZXJ0eU1ldGE+O1xuICAvKioga2V5IGlzIHBhY2thZ2UgbmFtZSAqL1xuICBwYWNrYWdlTWV0YUJ5TmFtZTogTWFwPHN0cmluZywge1xuICAgIHByb3BlcnRpZXM6IHN0cmluZ1tdO1xuICAgIHR5cGVGaWxlOiBzdHJpbmc7XG4gIH0+O1xuICBwYWNrYWdlTmFtZXM/OiBzdHJpbmdbXTtcbiAgdXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDb25maWdWaWV3U3RhdGUgPSB7XG4gIHByb3BlcnR5QnlOYW1lOiBuZXcgTWFwKCksXG4gIHBhY2thZ2VNZXRhQnlOYW1lOiBuZXcgTWFwKCksXG4gIHVwZGF0ZUNoZWNrc3VtOiAwXG59O1xuXG5leHBvcnQgY29uc3QgY29uZmlnVmlld1NsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NvbmZpZ1ZpZXcnLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgbG9hZFBhY2thZ2VTZXR0aW5nTWV0YShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e3dvcmtzcGFjZUtleTogc3RyaW5nLCBwYWNrYWdlTmFtZT86IHN0cmluZ30+KSB7fSxcbiAgICBfcGFja2FnZVNldHRpbmdNZXRhTG9hZGVkKHMsXG4gICAgICB7cGF5bG9hZDogW3Byb3BNZXRhcywgZHRzRmlsZSwgcGtnXX06IFBheWxvYWRBY3Rpb248W1Byb3BlcnR5TWV0YVtdLCBzdHJpbmcsIFBhY2thZ2VJbmZvXT4pIHtcbiAgICAgIHMucGFja2FnZU1ldGFCeU5hbWUuc2V0KHBrZy5uYW1lLCB7XG4gICAgICAgIHR5cGVGaWxlOiBkdHNGaWxlLFxuICAgICAgICBwcm9wZXJ0aWVzOiBwcm9wTWV0YXMubWFwKGl0ZW0gPT4gaXRlbS5wcm9wZXJ0eSlcbiAgICAgIH0pO1xuXG4gICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcHJvcE1ldGFzKSB7XG4gICAgICAgIHMucHJvcGVydHlCeU5hbWUuc2V0KHBrZy5uYW1lICsgJywnICsgaXRlbS5wcm9wZXJ0eSwgaXRlbSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwYWNrYWdlU2V0dGluZ3NNZXRhTG9hZGVkKHMpIHtcbiAgICAgIC8vIFNvcnQgcGFja2FnZXMgdG8gbW92ZSBQbGluayBwYWNrYWdlIHRvIHRoZSBmaXJzdFxuICAgICAgcy5wYWNrYWdlTmFtZXMgPSBBcnJheS5mcm9tKHMucGFja2FnZU1ldGFCeU5hbWUua2V5cygpKTtcbiAgICAgIGNvbnN0IHBsaW5rSWR4ID0gcy5wYWNrYWdlTmFtZXMuZmluZEluZGV4KG5hbWUgPT4gbmFtZSA9PT0gJ0B3ZmgvcGxpbmsnKTtcbiAgICAgIHMucGFja2FnZU5hbWVzLnNwbGljZShwbGlua0lkeCwgMSk7XG4gICAgICBzLnBhY2thZ2VOYW1lcy51bnNoaWZ0KCdAd2ZoL3BsaW5rJyk7XG4gICAgICBzLnVwZGF0ZUNoZWNrc3VtKys7XG4gICAgfVxuICB9XG59KTtcblxuLy8gdHlwZSBNYXBWYWx1ZTxNPiA9IE0gZXh0ZW5kcyBNYXA8c3RyaW5nLCBpbmZlciBUPiA/IFQgOiBuZXZlcjtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNvbmZpZ1ZpZXdTbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHtjb25maWdWaWV3OiBDb25maWdWaWV3U3RhdGV9PigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKGNvbmZpZ1ZpZXdTbGljZS5hY3Rpb25zLmxvYWRQYWNrYWdlU2V0dGluZ01ldGEpLFxuICAgICAgb3Auc3dpdGNoTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3QgcG9vbCA9IG5ldyBQb29sKG9zLmNwdXMoKS5sZW5ndGggLSAxKTtcbiAgICAgICAgY29uc3QgcGtnU3RhdGUgPSBnZXRQa2dNZ3JTdGF0ZSgpO1xuICAgICAgICBjb25zdCBwbGlua1BrZyA9IHBrZ1N0YXRlLmxpbmtlZERyY3AgPyBwa2dTdGF0ZS5saW5rZWREcmNwIDogcGtnU3RhdGUuaW5zdGFsbGVkRHJjcCE7XG5cbiAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKEFycmF5LmZyb20oZ2V0UGFja2FnZVNldHRpbmdGaWxlcyhcbiAgICAgICAgICAgIHBheWxvYWQud29ya3NwYWNlS2V5LCBwYXlsb2FkLnBhY2thZ2VOYW1lID8gbmV3IFNldChbcGF5bG9hZC5wYWNrYWdlTmFtZV0pIDogdW5kZWZpbmVkKVxuICAgICAgICAgICkuY29uY2F0KFsgWyd3ZmgvZGlzdC9jb25maWcvY29uZmlnLXNsaWNlJywgJ0Jhc2VQbGlua1NldHRpbmdzJywgJycsICcnLCBwbGlua1BrZ10gXSlcbiAgICAgICAgICAubWFwKChbdHlwZUZpbGUsIHR5cGVFeHBvcnQsLCxwa2ddKSA9PiB7XG5cbiAgICAgICAgICAgIGNvbnN0IGR0c0ZpbGVCYXNlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgdHlwZUZpbGUpO1xuICAgICAgICAgICAgcmV0dXJuIHBvb2wuc3VibWl0PFttZXRhczogUHJvcGVydHlNZXRhW10sIGR0c0ZpbGU6IHN0cmluZ10+KHtcbiAgICAgICAgICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2NvbmZpZy12aWV3LXNsaWNlLXdvcmtlci5qcycpLFxuICAgICAgICAgICAgICBleHBvcnRGbjogJ2RlZmF1bHQnLFxuICAgICAgICAgICAgICBhcmdzOiBbZHRzRmlsZUJhc2UsIHR5cGVFeHBvcnQvKiAsIENvbmZpZ0hhbmRsZXJNZ3IuY29tcGlsZXJPcHRpb25zKi9dXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnRoZW4oKFtwcm9wTWV0YXMsIGR0c0ZpbGVdKSA9PiB7XG4gICAgICAgICAgICAgIGxvZy5kZWJ1Zyhwcm9wTWV0YXMpO1xuICAgICAgICAgICAgICBkaXNwYXRjaGVyLl9wYWNrYWdlU2V0dGluZ01ldGFMb2FkZWQoW3Byb3BNZXRhcywgUGF0aC5yZWxhdGl2ZShwa2cucmVhbFBhdGgsIGR0c0ZpbGUpLCBwa2ddKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pKTtcbiAgICAgIH0pLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci5wYWNrYWdlU2V0dGluZ3NNZXRhTG9hZGVkKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgcHJvY2Vzc0V4aXRBY3Rpb24kLnBpcGUoXG4gICAgICBvcC50YXAoKCkgPT4gZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICBzLnBhY2thZ2VNZXRhQnlOYW1lLmNsZWFyKCk7XG4gICAgICAgIHMucHJvcGVydHlCeU5hbWUuY2xlYXIoKTtcbiAgICAgIH0pKVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoKGV4LCBzcmMpID0+IHtcbiAgICAgIGxvZy5lcnJvcihleCk7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjb25maWdWaWV3U2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjb25maWdWaWV3U2xpY2UpO1xufVxuIl19