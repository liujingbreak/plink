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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXZpZXctc2xpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvY29uZmlnLXZpZXctc2xpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUEyRTtBQUMzRSxtREFBcUM7QUFDckMseUNBQTJCO0FBQzNCLG1DQUErQztBQUUvQyxnREFBd0I7QUFFeEIsZ0RBQWdEO0FBQ2hELHFFQUFnRTtBQUNoRSxnREFBdUU7QUFDdkUsNENBQW9CO0FBQ3BCLG1DQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLHlCQUF5QixDQUFDLENBQUM7QUFjakQsTUFBTSxZQUFZLEdBQW9CO0lBQ3BDLGNBQWMsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN6QixpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUM1QixjQUFjLEVBQUUsQ0FBQztDQUNsQixDQUFDO0FBRVcsUUFBQSxlQUFlLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbkQsSUFBSSxFQUFFLFlBQVk7SUFDbEIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLHNCQUFzQixDQUFDLENBQUMsRUFBRSxNQUFtRSxJQUFHLENBQUM7UUFDakcseUJBQXlCLENBQUMsQ0FBQyxFQUN6QixFQUFDLE9BQU8sRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQXVEO1lBQzFGLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRTtnQkFDaEMsUUFBUSxFQUFFLE9BQU87Z0JBQ2pCLFVBQVUsRUFBRSxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUNqRCxDQUFDLENBQUM7WUFFSCxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsRUFBRTtnQkFD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USxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvRixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDUixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRTtRQUNWLGtCQUFVLENBQUMseUJBQXlCLEVBQUUsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FDSCxFQUNELDBCQUFrQixDQUFDLElBQUksQ0FDckIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxrQkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDNUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQyxDQUNKLENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUN4QixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyx1QkFBZSxDQUFDLENBQUM7QUFDbEQsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLHVCQUFlLENBQUMsQ0FBQztBQUNsRCxDQUFDO0FBRkQsNEJBRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge3N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uLCBwcm9jZXNzRXhpdEFjdGlvbiR9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQcm9wZXJ0eU1ldGF9IGZyb20gJy4vY29uZmlnLnR5cGVzJztcbi8vIGltcG9ydCBTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IHtQb29sfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy90aHJlYWQtcHJvbWlzZS1wb29sL2Rpc3QnO1xuaW1wb3J0IHtnZXRTdGF0ZSBhcyBnZXRQa2dNZ3JTdGF0ZSwgUGFja2FnZUluZm99IGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCB7Q29uZmlnSGFuZGxlck1ncn0gZnJvbSAnLi4vY29uZmlnLWhhbmRsZXInO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5jb25maWctdmlldy1zbGljZScpO1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbmZpZ1ZpZXdTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZU5hbWUgKyAnLCcgKyBwcm9wZXJ0eU5hbWUgKi9cbiAgcHJvcGVydHlCeU5hbWU6IE1hcDxzdHJpbmcsIFByb3BlcnR5TWV0YT47XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lICovXG4gIHBhY2thZ2VNZXRhQnlOYW1lOiBNYXA8c3RyaW5nLCB7XG4gICAgcHJvcGVydGllczogc3RyaW5nW107XG4gICAgdHlwZUZpbGU6IHN0cmluZztcbiAgfT47XG4gIHBhY2thZ2VOYW1lcz86IHN0cmluZ1tdO1xuICB1cGRhdGVDaGVja3N1bTogbnVtYmVyO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENvbmZpZ1ZpZXdTdGF0ZSA9IHtcbiAgcHJvcGVydHlCeU5hbWU6IG5ldyBNYXAoKSxcbiAgcGFja2FnZU1ldGFCeU5hbWU6IG5ldyBNYXAoKSxcbiAgdXBkYXRlQ2hlY2tzdW06IDBcbn07XG5cbmV4cG9ydCBjb25zdCBjb25maWdWaWV3U2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY29uZmlnVmlldycsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBsb2FkUGFja2FnZVNldHRpbmdNZXRhKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmc7IHBhY2thZ2VOYW1lPzogc3RyaW5nfT4pIHt9LFxuICAgIF9wYWNrYWdlU2V0dGluZ01ldGFMb2FkZWQocyxcbiAgICAgIHtwYXlsb2FkOiBbcHJvcE1ldGFzLCBkdHNGaWxlLCBwa2ddfTogUGF5bG9hZEFjdGlvbjxbUHJvcGVydHlNZXRhW10sIHN0cmluZywgUGFja2FnZUluZm9dPikge1xuICAgICAgcy5wYWNrYWdlTWV0YUJ5TmFtZS5zZXQocGtnLm5hbWUsIHtcbiAgICAgICAgdHlwZUZpbGU6IGR0c0ZpbGUsXG4gICAgICAgIHByb3BlcnRpZXM6IHByb3BNZXRhcy5tYXAoaXRlbSA9PiBpdGVtLnByb3BlcnR5KVxuICAgICAgfSk7XG5cbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwcm9wTWV0YXMpIHtcbiAgICAgICAgcy5wcm9wZXJ0eUJ5TmFtZS5zZXQocGtnLm5hbWUgKyAnLCcgKyBpdGVtLnByb3BlcnR5LCBpdGVtKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHBhY2thZ2VTZXR0aW5nc01ldGFMb2FkZWQocykge1xuICAgICAgLy8gU29ydCBwYWNrYWdlcyB0byBtb3ZlIFBsaW5rIHBhY2thZ2UgdG8gdGhlIGZpcnN0XG4gICAgICBzLnBhY2thZ2VOYW1lcyA9IEFycmF5LmZyb20ocy5wYWNrYWdlTWV0YUJ5TmFtZS5rZXlzKCkpO1xuICAgICAgY29uc3QgcGxpbmtJZHggPSBzLnBhY2thZ2VOYW1lcy5maW5kSW5kZXgobmFtZSA9PiBuYW1lID09PSAnQHdmaC9wbGluaycpO1xuICAgICAgcy5wYWNrYWdlTmFtZXMuc3BsaWNlKHBsaW5rSWR4LCAxKTtcbiAgICAgIHMucGFja2FnZU5hbWVzLnVuc2hpZnQoJ0B3ZmgvcGxpbmsnKTtcbiAgICAgIHMudXBkYXRlQ2hlY2tzdW0rKztcbiAgICB9XG4gIH1cbn0pO1xuXG4vLyB0eXBlIE1hcFZhbHVlPE0+ID0gTSBleHRlbmRzIE1hcDxzdHJpbmcsIGluZmVyIFQ+ID8gVCA6IG5ldmVyO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY29uZmlnVmlld1NsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8e2NvbmZpZ1ZpZXc6IENvbmZpZ1ZpZXdTdGF0ZX0+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oY29uZmlnVmlld1NsaWNlLmFjdGlvbnMubG9hZFBhY2thZ2VTZXR0aW5nTWV0YSksXG4gICAgICBvcC5zd2l0Y2hNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCBwb29sID0gbmV3IFBvb2wob3MuY3B1cygpLmxlbmd0aCAtIDEpO1xuICAgICAgICBjb25zdCBwa2dTdGF0ZSA9IGdldFBrZ01nclN0YXRlKCk7XG4gICAgICAgIGNvbnN0IHBsaW5rUGtnID0gcGtnU3RhdGUubGlua2VkRHJjcCA/IHBrZ1N0YXRlLmxpbmtlZERyY3AgOiBwa2dTdGF0ZS5pbnN0YWxsZWREcmNwITtcblxuICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwoQXJyYXkuZnJvbShnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKFxuICAgICAgICAgICAgcGF5bG9hZC53b3Jrc3BhY2VLZXksIHBheWxvYWQucGFja2FnZU5hbWUgPyBuZXcgU2V0KFtwYXlsb2FkLnBhY2thZ2VOYW1lXSkgOiB1bmRlZmluZWQpXG4gICAgICAgICAgKS5jb25jYXQoWyBbJ3dmaC9kaXN0L2NvbmZpZy9jb25maWctc2xpY2UnLCAnUGxpbmtTZXR0aW5ncycsICcnLCAnJywgcGxpbmtQa2ddIF0pXG4gICAgICAgICAgLm1hcCgoW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCAsICwgcGtnXSkgPT4ge1xuXG4gICAgICAgICAgICBjb25zdCBkdHNGaWxlQmFzZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHR5cGVGaWxlKTtcbiAgICAgICAgICAgIHJldHVybiBwb29sLnN1Ym1pdDxbbWV0YXM6IFByb3BlcnR5TWV0YVtdLCBkdHNGaWxlOiBzdHJpbmddPih7XG4gICAgICAgICAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdjb25maWctdmlldy1zbGljZS13b3JrZXIuanMnKSxcbiAgICAgICAgICAgICAgZXhwb3J0Rm46ICdkZWZhdWx0JyxcbiAgICAgICAgICAgICAgYXJnczogW2R0c0ZpbGVCYXNlLCB0eXBlRXhwb3J0LyogLCBDb25maWdIYW5kbGVyTWdyLmNvbXBpbGVyT3B0aW9ucyovXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50aGVuKChbcHJvcE1ldGFzLCBkdHNGaWxlXSkgPT4ge1xuICAgICAgICAgICAgICBsb2cuZGVidWcocHJvcE1ldGFzKTtcbiAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fcGFja2FnZVNldHRpbmdNZXRhTG9hZGVkKFtwcm9wTWV0YXMsIFBhdGgucmVsYXRpdmUocGtnLnJlYWxQYXRoLCBkdHNGaWxlKSwgcGtnXSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KSk7XG4gICAgICB9KSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIucGFja2FnZVNldHRpbmdzTWV0YUxvYWRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIHByb2Nlc3NFeGl0QWN0aW9uJC5waXBlKFxuICAgICAgb3AudGFwKCgpID0+IGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5wYWNrYWdlTWV0YUJ5TmFtZS5jbGVhcigpO1xuICAgICAgICBzLnByb3BlcnR5QnlOYW1lLmNsZWFyKCk7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKChleCwgc3JjKSA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY29uZmlnVmlld1NsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY29uZmlnVmlld1NsaWNlKTtcbn1cbiJdfQ==