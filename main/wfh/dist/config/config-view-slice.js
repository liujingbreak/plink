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
const log = log4js_1.getLogger('plink.config-view-slice');
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
    return rx.merge(action$.pipe(store_1.ofPayloadAction(exports.configViewSlice.actions.loadPackageSettingMeta), op.switchMap(({ payload }) => {
        const pool = new dist_1.Pool(os_1.default.cpus().length - 1);
        const pkgState = package_mgr_1.getState();
        const plinkPkg = pkgState.linkedDrcp ? pkgState.linkedDrcp : pkgState.installedDrcp;
        return Promise.all(Array.from(index_1.getPackageSettingFiles(payload.workspaceKey, payload.packageName ? new Set([payload.packageName]) : undefined)).concat([['wfh/dist/config/config-slice', 'BasePlinkSettings', '', '', plinkPkg]])
            .map(([typeFile, typeExport, , , pkg]) => {
            const dtsFileBase = path_1.default.resolve(pkg.realPath, typeFile);
            return pool.submit({
                file: path_1.default.resolve(__dirname, 'config-view-slice-worker.js'),
                exportFn: 'default',
                args: [dtsFileBase, typeExport /*, ConfigHandlerMgr.compilerOptions*/]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvY29uZmlnLXZpZXctc2xpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUF1RDtBQUN2RCxtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLG1DQUErQztBQUUvQyxnREFBd0I7QUFFeEIsZ0RBQWdEO0FBQ2hELDREQUF1RDtBQUN2RCxnREFBdUU7QUFDdkUsNENBQW9CO0FBQ3BCLG1DQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBY2pELE1BQU0sWUFBWSxHQUFvQjtJQUNwQyxjQUFjLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDekIsaUJBQWlCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDNUIsY0FBYyxFQUFFLENBQUM7Q0FDbEIsQ0FBQztBQUVXLFFBQUEsZUFBZSxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ25ELElBQUksRUFBRSxZQUFZO0lBQ2xCLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsTUFBbUUsSUFBRyxDQUFDO1FBQ2pHLHlCQUF5QixDQUFDLENBQUMsRUFDekIsRUFBQyxPQUFPLEVBQUUsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUF1RDtZQUMxRixDQUFDLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7Z0JBQ2hDLFFBQVEsRUFBRSxPQUFPO2dCQUNqQixVQUFVLEVBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7YUFDakQsQ0FBQyxDQUFDO1lBRUgsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUU7Z0JBQzVCLENB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IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQcm9wZXJ0eU1ldGF9IGZyb20gJy4vY29uZmlnLnR5cGVzJztcbi8vIGltcG9ydCBTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IHtnZXRTdGF0ZSBhcyBnZXRQa2dNZ3JTdGF0ZSwgUGFja2FnZUluZm99IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCB7Q29uZmlnSGFuZGxlck1ncn0gZnJvbSAnLi4vY29uZmlnLWhhbmRsZXInO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jb25maWctdmlldy1zbGljZScpO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ1ZpZXdTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZU5hbWUgKyAnLCcgKyBwcm9wZXJ0eU5hbWUgKi9cbiAgcHJvcGVydHlCeU5hbWU6IE1hcDxzdHJpbmcsIFByb3BlcnR5TWV0YT47XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lICovXG4gIHBhY2thZ2VNZXRhQnlOYW1lOiBNYXA8c3RyaW5nLCB7XG4gICAgcHJvcGVydGllczogc3RyaW5nW107XG4gICAgdHlwZUZpbGU6IHN0cmluZztcbiAgfT47XG4gIHBhY2thZ2VOYW1lcz86IHN0cmluZ1tdO1xuICB1cGRhdGVDaGVja3N1bTogbnVtYmVyO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENvbmZpZ1ZpZXdTdGF0ZSA9IHtcbiAgcHJvcGVydHlCeU5hbWU6IG5ldyBNYXAoKSxcbiAgcGFja2FnZU1ldGFCeU5hbWU6IG5ldyBNYXAoKSxcbiAgdXBkYXRlQ2hlY2tzdW06IDBcbn07XG5cbmV4cG9ydCBjb25zdCBjb25maWdWaWV3U2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY29uZmlnVmlldycsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBsb2FkUGFja2FnZVNldHRpbmdNZXRhKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmcsIHBhY2thZ2VOYW1lPzogc3RyaW5nfT4pIHt9LFxuICAgIF9wYWNrYWdlU2V0dGluZ01ldGFMb2FkZWQocyxcbiAgICAgIHtwYXlsb2FkOiBbcHJvcE1ldGFzLCBkdHNGaWxlLCBwa2ddfTogUGF5bG9hZEFjdGlvbjxbUHJvcGVydHlNZXRhW10sIHN0cmluZywgUGFja2FnZUluZm9dPikge1xuICAgICAgcy5wYWNrYWdlTWV0YUJ5TmFtZS5zZXQocGtnLm5hbWUsIHtcbiAgICAgICAgdHlwZUZpbGU6IGR0c0ZpbGUsXG4gICAgICAgIHByb3BlcnRpZXM6IHByb3BNZXRhcy5tYXAoaXRlbSA9PiBpdGVtLnByb3BlcnR5KVxuICAgICAgfSk7XG5cbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwcm9wTWV0YXMpIHtcbiAgICAgICAgcy5wcm9wZXJ0eUJ5TmFtZS5zZXQocGtnLm5hbWUgKyAnLCcgKyBpdGVtLnByb3BlcnR5LCBpdGVtKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHBhY2thZ2VTZXR0aW5nc01ldGFMb2FkZWQocykge1xuICAgICAgLy8gU29ydCBwYWNrYWdlcyB0byBtb3ZlIFBsaW5rIHBhY2thZ2UgdG8gdGhlIGZpcnN0XG4gICAgICBzLnBhY2thZ2VOYW1lcyA9IEFycmF5LmZyb20ocy5wYWNrYWdlTWV0YUJ5TmFtZS5rZXlzKCkpO1xuICAgICAgY29uc3QgcGxpbmtJZHggPSBzLnBhY2thZ2VOYW1lcy5maW5kSW5kZXgobmFtZSA9PiBuYW1lID09PSAnQHdmaC9wbGluaycpO1xuICAgICAgcy5wYWNrYWdlTmFtZXMuc3BsaWNlKHBsaW5rSWR4LCAxKTtcbiAgICAgIHMucGFja2FnZU5hbWVzLnVuc2hpZnQoJ0B3ZmgvcGxpbmsnKTtcbiAgICAgIHMudXBkYXRlQ2hlY2tzdW0rKztcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyB0eXBlIE1hcFZhbHVlPE0+ID0gTSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IG5ldmVyO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY29uZmlnVmlld1NsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2NvbmZpZ1ZpZXc6IENvbmZpZ1ZpZXdTdGF0ZX0+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oY29uZmlnVmlld1NsaWNlLmFjdGlvbnMubG9hZFBhY2thZ2VTZXR0aW5nTWV0YSksXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCBwb29sID0gbmV3IFBvb2wob3MuY3B1cygpLmxlbmd0aCAtIDEpO1xuICAgICAgICBjb25zdCBwa2dTdGF0ZSA9IGdldFBrZ01nclN0YXRlKCk7XG4gICAgICAgIGNvbnN0IHBsaW5rUGtnID0gcGtnU3RhdGUubGlua2VkRHJjcCA/IHBrZ1N0YXRlLmxpbmtlZERyY3AgOiBwa2dTdGF0ZS5pbnN0YWxsZWREcmNwITtcblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoQXJyYXkuZnJvbShnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKFxuICAgICAgICAgICAgcGF5bG9hZC53b3Jrc3BhY2VLZXksIHBheWxvYWQucGFja2FnZU5hbWUgPyBuZXcgU2V0KFtwYXlsb2FkLnBhY2thZ2VOYW1lXSkgOiB1bmRlZmluZWQpXG4gICAgICAgICAgKS5jb25jYXQoWyBbJ3dmaC9kaXN0L2NvbmZpZy9jb25maWctc2xpY2UnLCAnQmFzZVBsaW5rU2V0dGluZ3MnLCAnJywgJycsIHBsaW5rUGtnXSBdKVxuICAgICAgICAgIC5tYXAoKFt0eXBlRmlsZSwgdHlwZUV4cG9ydCwsLHBrZ10pID0+IHtcblxuICAgICAgICAgICAgY29uc3QgZHRzRmlsZUJhc2UgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlRmlsZSk7XG4gICAgICAgICAgICByZXR1cm4gcG9vbC5zdWJtaXQ8W21ldGFzOiBQcm9wZXJ0eU1ldGFbXSwgZHRzRmlsZTogc3RyaW5nXT4oe1xuICAgICAgICAgICAgICBmaWxlOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnY29uZmlnLXZpZXctc2xpY2Utd29ya2VyLmpzJyksXG4gICAgICAgICAgICAgIGV4cG9ydEZuOiAnZGVmYXVsdCcsXG4gICAgICAgICAgICAgIGFyZ3M6IFtkdHNGaWxlQmFzZSwgdHlwZUV4cG9ydC8qLCBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyovXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKChbcHJvcE1ldGFzLCBkdHNGaWxlXSkgPT4ge1xuICAgICAgICAgICAgICBsb2cuZGVidWcocHJvcE1ldGFzKTtcbiAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fcGFja2FnZVNldHRpbmdNZXRhTG9hZGVkKFtwcm9wTWV0YXMsIFBhdGgucmVsYXRpdmUocGtnLnJlYWxQYXRoLCBkdHNGaWxlKSwgcGtnXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIucGFja2FnZVNldHRpbmdzTWV0YUxvYWRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi50eXBlID09PSAnQkVGT1JFX1NBVkVfU1RBVEUnKSxcbiAgICAgIG9wLnRhcCgoKSA9PiBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgIHMucGFja2FnZU1ldGFCeU5hbWUuY2xlYXIoKTtcbiAgICAgICAgcy5wcm9wZXJ0eUJ5TmFtZS5jbGVhcigpO1xuICAgICAgfSkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcigoZXgsIHNyYykgPT4ge1xuICAgICAgbG9nLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBzcmM7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNvbmZpZ1ZpZXdTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNvbmZpZ1ZpZXdTbGljZSk7XG59XG4iXX0=