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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.getState = exports.exampleActionDispatcher = exports.cliSlice = void 0;
const redux_toolkit_abservable_1 = require("../../../redux-toolkit-abservable");
const store_1 = require("../store");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const pkgMgr = __importStar(require("../package-mgr"));
const initialState = {
    extensions: []
};
exports.cliSlice = store_1.stateFactory.newSlice({
    name: 'cli',
    initialState,
    reducers: {
        updateExtensions(draft, { payload }) {
            // modify state draft
            // draft.foo = payload;
        }
    }
});
exports.exampleActionDispatcher = store_1.stateFactory.bindActionCreators(exports.cliSlice);
const releaseEpic = store_1.stateFactory.addEpic((action$) => {
    // const gService = getModuleInjector().get(GlobalStateStore);
    return rxjs_1.merge(pkgMgr.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.debounceTime(200), operators_1.map(srcPackages => {
        scanPackageJson(srcPackages.values());
    })), action$.pipe(redux_toolkit_abservable_1.ofPayloadAction(pkgMgr.slice.actions._installWorkspace), operators_1.map(action => action.payload.workspaceKey), operators_1.mergeMap(ws => pkgMgr.getStore().pipe(operators_1.map(s => s.workspaces.get(ws).installedComponents), operators_1.distinctUntilChanged(), operators_1.filter(installed => installed != null && installed.size > 0), operators_1.map(installed => {
        scanPackageJson(installed.values());
    })))), ...Array.from(pkgMgr.getState().workspaces.keys()).map(key => {
        return pkgMgr.getStore().pipe(operators_1.map(s => s.workspaces.get(key).installedComponents), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.filter(installed => installed != null && installed.size > 0), operators_1.map(installed => {
            scanPackageJson(installed.values());
        }));
    })).pipe(operators_1.catchError(ex => {
        // tslint:disable-next-line: no-console
        console.error(ex);
        // gService.toastAction('网络错误\n' + ex.message);
        return rxjs_1.of();
    }), operators_1.ignoreElements());
});
function getState() {
    return store_1.stateFactory.sliceState(exports.cliSlice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.cliSlice);
}
exports.getStore = getStore;
if (module.hot) {
    module.hot.dispose(data => {
        store_1.stateFactory.removeSlice(exports.cliSlice);
        releaseEpic();
    });
}
function scanPackageJson(pkgs) {
    console.log('scanPackageJson');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0ZBQW1FO0FBQ25FLG9DQUFzQztBQUN0Qyw4Q0FDc0M7QUFDdEMsK0JBQStCO0FBQy9CLHVEQUF5QztBQU16QyxNQUFNLFlBQVksR0FBYTtJQUM3QixVQUFVLEVBQUUsRUFBRTtDQUNmLENBQUM7QUFFVyxRQUFBLFFBQVEsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUM1QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQXlCO1lBQ3ZELHFCQUFxQjtZQUNyQix1QkFBdUI7UUFDekIsQ0FBQztLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRVUsUUFBQSx1QkFBdUIsR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLGdCQUFRLENBQUMsQ0FBQztBQUVqRixNQUFNLFdBQVcsR0FBRyxvQkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ25ELDhEQUE4RDtJQUU5RCxPQUFPLFlBQUssQ0FDVixNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNwQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3ZCLGdDQUFvQixFQUFFLEVBQ3RCLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1Asd0JBQVksQ0FBQyxHQUFHLENBQUMsRUFDakIsZUFBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFO1FBQ2hCLGVBQWUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN4QyxDQUFDLENBQUMsQ0FDSCxFQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsMENBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUNsRSxlQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUMxQyxvQkFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDbkMsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFFLENBQUMsbUJBQW1CLENBQUMsRUFDbkQsZ0NBQW9CLEVBQUUsRUFDdEIsa0JBQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksU0FBUyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsRUFDNUQsZUFBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1FBQ2QsZUFBZSxDQUFDLFNBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQyxDQUNILENBQUMsQ0FDSCxFQUNELEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzNELE9BQU8sTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDM0IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsbUJBQW1CLENBQUMsRUFDcEQsZ0NBQW9CLEVBQUUsRUFDdEIsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxrQkFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsU0FBUyxJQUFJLElBQUksSUFBSSxTQUFTLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxFQUM1RCxlQUFHLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDZCxlQUFlLENBQUMsU0FBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUNILENBQUMsSUFBSSxDQUNKLHNCQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDZCx1Q0FBdUM7UUFDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQiwrQ0FBK0M7UUFDL0MsT0FBTyxTQUFFLEVBQWlCLENBQUM7SUFDN0IsQ0FBQyxDQUFDLEVBQ0YsMEJBQWMsRUFBRSxDQUNqQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsZ0JBQVEsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxnQkFBUSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUZELDRCQUVDO0FBRUQsSUFBSSxNQUFNLENBQUMsR0FBRyxFQUFFO0lBQ2QsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDeEIsb0JBQVksQ0FBQyxXQUFXLENBQUMsZ0JBQVEsQ0FBQyxDQUFDO1FBQ25DLFdBQVcsRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0NBQ0o7QUFFRCxTQUFTLGVBQWUsQ0FBQyxJQUFrQztJQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7b2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vLi4vLi4vcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge21hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIGNhdGNoRXJyb3IsIGlnbm9yZUVsZW1lbnRzLCBtZXJnZU1hcCwgZGVib3VuY2VUaW1lLFxuICBza2lwLCBmaWx0ZXJ9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7b2YsIG1lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICBleHRlbnNpb25zOiB7cGtnRmlsZVBhdGg6IHN0cmluZzsgZnVuY05hbWU/OiBzdHJpbmd9W107XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xpU3RhdGUgPSB7XG4gIGV4dGVuc2lvbnM6IFtdXG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIHVwZGF0ZUV4dGVuc2lvbnMoZHJhZnQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxib29sZWFuPikge1xuICAgICAgLy8gbW9kaWZ5IHN0YXRlIGRyYWZ0XG4gICAgICAvLyBkcmFmdC5mb28gPSBwYXlsb2FkO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBleGFtcGxlQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5jb25zdCByZWxlYXNlRXBpYyA9IHN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gIC8vIGNvbnN0IGdTZXJ2aWNlID0gZ2V0TW9kdWxlSW5qZWN0b3IoKS5nZXQoR2xvYmFsU3RhdGVTdG9yZSk7XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBza2lwKDEpLFxuICAgICAgZGVib3VuY2VUaW1lKDIwMCksXG4gICAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgICBzY2FuUGFja2FnZUpzb24oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24ocGtnTWdyLnNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpLFxuICAgICAgbWFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXkpLFxuICAgICAgbWVyZ2VNYXAod3MgPT4gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3cykhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICkpXG4gICAgKSxcbiAgICAuLi5BcnJheS5mcm9tKHBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBza2lwKDEpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIC8vIGdTZXJ2aWNlLnRvYXN0QWN0aW9uKCfnvZHnu5zplJnor69cXG4nICsgZXgubWVzc2FnZSk7XG4gICAgICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oKTtcbiAgICB9KSxcbiAgICBpZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY2xpU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjbGlTbGljZSk7XG59XG5cbmlmIChtb2R1bGUuaG90KSB7XG4gIG1vZHVsZS5ob3QuZGlzcG9zZShkYXRhID0+IHtcbiAgICBzdGF0ZUZhY3RvcnkucmVtb3ZlU2xpY2UoY2xpU2xpY2UpO1xuICAgIHJlbGVhc2VFcGljKCk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzY2FuUGFja2FnZUpzb24ocGtnczogSXRlcmFibGU8cGtnTWdyLlBhY2thZ2VJbmZvPikge1xuICBjb25zb2xlLmxvZygnc2NhblBhY2thZ2VKc29uJyk7XG59XG4iXX0=