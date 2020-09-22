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
exports.availabeCliExtension = exports.getStore = exports.getState = exports.cliActionDispatcher = exports.cliSlice = void 0;
const redux_toolkit_observable_1 = require("../../../redux-toolkit-observable");
const store_1 = require("../store");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const pkgMgr = __importStar(require("../package-mgr"));
const package_utils_1 = require("../package-utils");
const getLocale = require('os-locale');
const drcpPkJson = require('../../../package.json');
const initialState = {
    extensions: new Map(),
    version: ''
};
exports.cliSlice = store_1.stateFactory.newSlice({
    name: 'cli',
    initialState,
    reducers: {
        updateExtensions(draft, { payload }) {
            draft.extensions = new Map(payload.map(ex => [ex.pkName, ex]));
        },
        plinkUpgraded(d, { payload: newVersion }) {
            d.version = newVersion;
        },
        updateLocale(d, { payload: raw }) {
            const arr = raw.split(/[_-]/);
            d.osLang = arr[0];
            d.osCountry = arr[1];
        }
    }
});
exports.cliActionDispatcher = store_1.stateFactory.bindActionCreators(exports.cliSlice);
store_1.stateFactory.addEpic((action$) => {
    getLocale().then(locale => exports.cliActionDispatcher.updateLocale(locale));
    return rxjs_1.merge(getStore().pipe(operators_1.map(s => s.version), operators_1.distinctUntilChanged(), operators_1.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), pkgMgr.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.debounceTime(200), operators_1.map(srcPackages => {
        scanPackageJson(srcPackages.values());
    })), action$.pipe(redux_toolkit_observable_1.ofPayloadAction(pkgMgr.slice.actions._installWorkspace), operators_1.map(action => action.payload.workspaceKey), operators_1.mergeMap(ws => pkgMgr.getStore().pipe(operators_1.map(s => s.workspaces.get(ws).installedComponents), operators_1.distinctUntilChanged(), operators_1.filter(installed => installed != null && installed.size > 0), operators_1.map(installed => {
        scanPackageJson(installed.values());
    })))), action$.pipe(redux_toolkit_observable_1.ofPayloadAction(exports.cliSlice.actions.plinkUpgraded), operators_1.map(() => {
        scanPackageJson(package_utils_1.allPackages());
    })), ...Array.from(pkgMgr.getState().workspaces.keys()).map(key => {
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
    const extensions = [];
    for (const pk of pkgs) {
        const dr = pk.json.dr;
        if (dr && dr.cli) {
            const parts = dr.cli.split('#');
            extensions.push({ pkName: pk.name, pkgFilePath: parts[0], funcName: parts[1] });
        }
    }
    exports.cliActionDispatcher.updateExtensions(extensions);
}
function availabeCliExtension() {
}
exports.availabeCliExtension = availabeCliExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0ZBQW1FO0FBQ25FLG9DQUFzQztBQUN0Qyw4Q0FDc0M7QUFDdEMsK0JBQStCO0FBQy9CLHVEQUF5QztBQUN6QyxvREFBNkM7QUFDN0MsTUFBTSxTQUFTLEdBQTBCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM5RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQWdCcEQsTUFBTSxZQUFZLEdBQWE7SUFDN0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVXLFFBQUEsUUFBUSxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQzVDLElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGdCQUFnQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBZ0M7WUFDOUQsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQXdCO1lBQzNELENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3pCLENBQUM7UUFDRCxZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBd0I7WUFDbkQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQUMsTUFBTSxHQUFHLEdBQUcs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LEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7U0FDL0U7S0FDRjtJQUNELDJCQUFtQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25ELENBQUM7QUFFRCxTQUFnQixvQkFBb0I7QUFDcEMsQ0FBQztBQURELG9EQUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHtvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuLi8uLi8uLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7bWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgY2F0Y2hFcnJvciwgaWdub3JlRWxlbWVudHMsIG1lcmdlTWFwLCBkZWJvdW5jZVRpbWUsXG4gIHNraXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtvZiwgbWVyZ2V9IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7YWxsUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuY29uc3QgZ2V0TG9jYWxlOiAoKSA9PiBQcm9taXNlPHN0cmluZz4gPSByZXF1aXJlKCdvcy1sb2NhbGUnKTtcbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKTtcblxuZXhwb3J0IGludGVyZmFjZSBDbGlTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lICovXG4gIGV4dGVuc2lvbnM6IE1hcDxzdHJpbmcsIENsaUV4dGVuc2lvbj47XG4gIHZlcnNpb246IHN0cmluZztcbiAgb3NMYW5nPzogc3RyaW5nO1xuICBvc0NvdW50cnk/OiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGlFeHRlbnNpb24ge1xuICBwa05hbWU6IHN0cmluZztcbiAgcGtnRmlsZVBhdGg6IHN0cmluZztcbiAgZnVuY05hbWU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xpU3RhdGUgPSB7XG4gIGV4dGVuc2lvbnM6IG5ldyBNYXAoKSxcbiAgdmVyc2lvbjogJydcbn07XG5cbmV4cG9ydCBjb25zdCBjbGlTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjbGknLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgdXBkYXRlRXh0ZW5zaW9ucyhkcmFmdCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPENsaUV4dGVuc2lvbltdPikge1xuICAgICAgZHJhZnQuZXh0ZW5zaW9ucyA9IG5ldyBNYXAocGF5bG9hZC5tYXAoZXggPT4gW2V4LnBrTmFtZSwgZXhdKSk7XG4gICAgfSxcbiAgICBwbGlua1VwZ3JhZGVkKGQsIHtwYXlsb2FkOiBuZXdWZXJzaW9ufTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7XG4gICAgICBkLnZlcnNpb24gPSBuZXdWZXJzaW9uO1xuICAgIH0sXG4gICAgdXBkYXRlTG9jYWxlKGQsIHtwYXlsb2FkOiByYXd9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHtcbiAgICAgIGNvbnN0IGFyciA9IHJhdy5zcGxpdCgvW18tXS8pO1xuICAgICAgZC5vc0xhbmcgPSBhcnJbMF07XG4gICAgICBkLm9zQ291bnRyeSA9IGFyclsxXTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCkgPT4ge1xuICBnZXRMb2NhbGUoKS50aGVuKGxvY2FsZSA9PiBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUxvY2FsZShsb2NhbGUpKTtcblxuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMudmVyc2lvbiksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdxdWljayEhISEhISEhISEnLCBnZXRTdGF0ZSgpKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT09IGRyY3BQa0pzb24udmVyc2lvbikge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIucGxpbmtVcGdyYWRlZChkcmNwUGtKc29uLnZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNraXAoMSksXG4gICAgICBkZWJvdW5jZVRpbWUoMjAwKSxcbiAgICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICAgIHNjYW5QYWNrYWdlSnNvbihzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dNZ3Iuc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgICBtYXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleSksXG4gICAgICBtZXJnZU1hcCh3cyA9PiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzKSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgICAgICB9KVxuICAgICAgKSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oY2xpU2xpY2UuYWN0aW9ucy5wbGlua1VwZ3JhZGVkKSxcbiAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgIHNjYW5QYWNrYWdlSnNvbihhbGxQYWNrYWdlcygpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAuLi5BcnJheS5mcm9tKHBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBza2lwKDEpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBvZjxQYXlsb2FkQWN0aW9uPigpO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuZnVuY3Rpb24gc2NhblBhY2thZ2VKc29uKHBrZ3M6IEl0ZXJhYmxlPHBrZ01nci5QYWNrYWdlSW5mbz4pIHtcbiAgY29uc3QgZXh0ZW5zaW9uczogQ2xpRXh0ZW5zaW9uW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgY29uc3QgZHIgPSBway5qc29uLmRyO1xuICAgIGlmIChkciAmJiBkci5jbGkpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4gICAgICBleHRlbnNpb25zLnB1c2goe3BrTmFtZTogcGsubmFtZSwgcGtnRmlsZVBhdGg6IHBhcnRzWzBdLCBmdW5jTmFtZTogcGFydHNbMV19KTtcbiAgICB9XG4gIH1cbiAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVFeHRlbnNpb25zKGV4dGVuc2lvbnMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXZhaWxhYmVDbGlFeHRlbnNpb24oKSB7XG59XG5cbiJdfQ==