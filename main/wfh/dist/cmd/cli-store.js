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
exports.getStore = exports.getState = exports.cliActionDispatcher = exports.cliSlice = void 0;
const redux_toolkit_abservable_1 = require("../../../redux-toolkit-abservable");
const store_1 = require("../store");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const pkgMgr = __importStar(require("../package-mgr"));
const drcpPkJson = require('../../../package.json');
const initialState = {
    extensions: [],
    version: ''
};
exports.cliSlice = store_1.stateFactory.newSlice({
    name: 'cli',
    initialState,
    reducers: {
        updateExtensions(draft, { payload }) {
            // modify state draft
            // draft.foo = payload;
        },
        plinkUpgraded(d, { payload: newVersion }) {
            d.version = newVersion;
        }
    }
});
exports.cliActionDispatcher = store_1.stateFactory.bindActionCreators(exports.cliSlice);
store_1.stateFactory.addEpic((action$) => {
    return rxjs_1.merge(getStore().pipe(operators_1.map(s => s.version), operators_1.distinctUntilChanged(), operators_1.map(version => {
        if (version !== drcpPkJson.version) {
            console.log('++++++++++++', version, drcpPkJson.version);
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), pkgMgr.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.debounceTime(200), operators_1.map(srcPackages => {
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
function scanPackageJson(pkgs) {
    console.log('>>>>>>>>>>>>>>>>> scanPackageJson');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0ZBQW1FO0FBQ25FLG9DQUFzQztBQUN0Qyw4Q0FDc0M7QUFDdEMsK0JBQStCO0FBQy9CLHVEQUF5QztBQUN6QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQU9wRCxNQUFNLFlBQVksR0FBYTtJQUM3QixVQUFVLEVBQUUsRUFBRTtJQUNkLE9BQU8sRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVXLFFBQUEsUUFBUSxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQzVDLElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGdCQUFnQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBeUI7WUFDdkQscUJBQXFCO1lBQ3JCLHVCQUF1QjtRQUN6QixDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQXdCO1lBQzNELENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3pCLENBQUM7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsbUJBQW1CLEdBQUcsb0JBQVksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBUSxDQUFDLENBQUM7QUFFN0Usb0JBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUMvQixPQUFPLFlBQUssQ0FDVixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQ3pELGVBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNaLElBQUksT0FBTyxLQUFLLFVBQVUsQ0FBQyxPQUFPLEVBQUU7WUFD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QztJQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7b2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vLi4vLi4vcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge21hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIGNhdGNoRXJyb3IsIGlnbm9yZUVsZW1lbnRzLCBtZXJnZU1hcCwgZGVib3VuY2VUaW1lLFxuICBza2lwLCBmaWx0ZXJ9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7b2YsIG1lcmdlfSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICBleHRlbnNpb25zOiB7cGtnRmlsZVBhdGg6IHN0cmluZzsgZnVuY05hbWU/OiBzdHJpbmd9W107XG4gIHZlcnNpb246IHN0cmluZztcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDbGlTdGF0ZSA9IHtcbiAgZXh0ZW5zaW9uczogW10sXG4gIHZlcnNpb246ICcnXG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIHVwZGF0ZUV4dGVuc2lvbnMoZHJhZnQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxib29sZWFuPikge1xuICAgICAgLy8gbW9kaWZ5IHN0YXRlIGRyYWZ0XG4gICAgICAvLyBkcmFmdC5mb28gPSBwYXlsb2FkO1xuICAgIH0sXG4gICAgcGxpbmtVcGdyYWRlZChkLCB7cGF5bG9hZDogbmV3VmVyc2lvbn06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCkgPT4ge1xuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMudmVyc2lvbiksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIGlmICh2ZXJzaW9uICE9PSBkcmNwUGtKc29uLnZlcnNpb24pIHtcbiAgICAgICAgICBjb25zb2xlLmxvZygnKysrKysrKysrKysrJywgdmVyc2lvbiwgZHJjcFBrSnNvbi52ZXJzaW9uKTtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnBsaW5rVXBncmFkZWQoZHJjcFBrSnNvbi52ZXJzaW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBza2lwKDEpLFxuICAgICAgZGVib3VuY2VUaW1lKDIwMCksXG4gICAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgICBzY2FuUGFja2FnZUpzb24oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24ocGtnTWdyLnNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpLFxuICAgICAgbWFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXkpLFxuICAgICAgbWVyZ2VNYXAod3MgPT4gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3cykhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICkpXG4gICAgKSxcbiAgICAuLi5BcnJheS5mcm9tKHBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBza2lwKDEpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBvZjxQYXlsb2FkQWN0aW9uPigpO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuZnVuY3Rpb24gc2NhblBhY2thZ2VKc29uKHBrZ3M6IEl0ZXJhYmxlPHBrZ01nci5QYWNrYWdlSW5mbz4pIHtcbiAgY29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IHNjYW5QYWNrYWdlSnNvbicpO1xufVxuIl19