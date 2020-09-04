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
const redux_toolkit_abservable_1 = require("../../../redux-toolkit-abservable");
const store_1 = require("../store");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const pkgMgr = __importStar(require("../package-mgr"));
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
        }
    }
});
exports.cliActionDispatcher = store_1.stateFactory.bindActionCreators(exports.cliSlice);
store_1.stateFactory.addEpic((action$) => {
    return rxjs_1.merge(getStore().pipe(operators_1.map(s => s.version), operators_1.distinctUntilChanged(), operators_1.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), pkgMgr.getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.debounceTime(200), operators_1.map(srcPackages => {
        scanPackageJson(srcPackages.values());
    })), action$.pipe(redux_toolkit_abservable_1.ofPayloadAction(pkgMgr.slice.actions._installWorkspace), operators_1.map(action => action.payload.workspaceKey), operators_1.mergeMap(ws => pkgMgr.getStore().pipe(operators_1.map(s => s.workspaces.get(ws).installedComponents), operators_1.distinctUntilChanged(), operators_1.filter(installed => installed != null && installed.size > 0), operators_1.map(installed => {
        scanPackageJson(installed.values());
    })))), action$.pipe(redux_toolkit_abservable_1.ofPayloadAction(exports.cliSlice.actions.plinkUpgraded), operators_1.map(() => {
        scanPackageJson(allPackages());
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
/** Including installed package from all workspaces, unlike package-utils which only include installed
 * packages from current working directory as workspace
 */
function* allPackages() {
    for (const pk of pkgMgr.getState().srcPackages.values()) {
        yield pk;
    }
    for (const ws of pkgMgr.getState().workspaces.values()) {
        const installed = ws.installedComponents;
        if (installed) {
            for (const comp of installed.values()) {
                yield comp;
            }
        }
    }
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0ZBQW1FO0FBQ25FLG9DQUFzQztBQUN0Qyw4Q0FDc0M7QUFDdEMsK0JBQStCO0FBQy9CLHVEQUF5QztBQUN6QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQWFwRCxNQUFNLFlBQVksR0FBYTtJQUM3QixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsT0FBTyxFQUFFLEVBQUU7Q0FDWixDQUFDO0FBRVcsUUFBQSxRQUFRLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDNUMsSUFBSSxFQUFFLEtBQUs7SUFDWCxZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFnQztZQUM5RCxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFDRCxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLFVBQVUsRUFBd0I7WUFDM0QsQ0FBQyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDekIsQ0FBQztLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRVUsUUFBQSxtQkFBbUIsR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLGdCQUFRLENBQUMsQ0FBQztBQUU3RSxvQkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQy9CLE9BQU8sWUFBSyxDQUNWLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUs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RUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztTQUMvRTtLQUNGO0lBQ0QsMkJBQW1CLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge29mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uLy4uLy4uL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZSc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeX0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBjYXRjaEVycm9yLCBpZ25vcmVFbGVtZW50cywgbWVyZ2VNYXAsIGRlYm91bmNlVGltZSxcbiAgc2tpcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge29mLCBtZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuY29uc3QgZHJjcFBrSnNvbiA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIENsaVN0YXRlIHtcbiAgZXh0ZW5zaW9uczogTWFwPHN0cmluZywgQ2xpRXh0ZW5zaW9uPjtcbiAgdmVyc2lvbjogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgQ2xpRXh0ZW5zaW9uIHtcbiAgcGtOYW1lOiBzdHJpbmc7XG4gIHBrZ0ZpbGVQYXRoOiBzdHJpbmc7XG4gIGZ1bmNOYW1lPzogc3RyaW5nO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENsaVN0YXRlID0ge1xuICBleHRlbnNpb25zOiBuZXcgTWFwKCksXG4gIHZlcnNpb246ICcnXG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIHVwZGF0ZUV4dGVuc2lvbnMoZHJhZnQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxDbGlFeHRlbnNpb25bXT4pIHtcbiAgICAgIGRyYWZ0LmV4dGVuc2lvbnMgPSBuZXcgTWFwKHBheWxvYWQubWFwKGV4ID0+IFtleC5wa05hbWUsIGV4XSkpO1xuICAgIH0sXG4gICAgcGxpbmtVcGdyYWRlZChkLCB7cGF5bG9hZDogbmV3VmVyc2lvbn06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCkgPT4ge1xuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMudmVyc2lvbiksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdxdWljayEhISEhISEhISEnLCBnZXRTdGF0ZSgpKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT09IGRyY3BQa0pzb24udmVyc2lvbikge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIucGxpbmtVcGdyYWRlZChkcmNwUGtKc29uLnZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNraXAoMSksXG4gICAgICBkZWJvdW5jZVRpbWUoMjAwKSxcbiAgICAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgICAgIHNjYW5QYWNrYWdlSnNvbihzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dNZ3Iuc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgICBtYXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleSksXG4gICAgICBtZXJnZU1hcCh3cyA9PiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzKSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgICAgICB9KVxuICAgICAgKSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oY2xpU2xpY2UuYWN0aW9ucy5wbGlua1VwZ3JhZGVkKSxcbiAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgIHNjYW5QYWNrYWdlSnNvbihhbGxQYWNrYWdlcygpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAuLi5BcnJheS5mcm9tKHBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBza2lwKDEpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBvZjxQYXlsb2FkQWN0aW9uPigpO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuLyoqIEluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZSBmcm9tIGFsbCB3b3Jrc3BhY2VzLCB1bmxpa2UgcGFja2FnZS11dGlscyB3aGljaCBvbmx5IGluY2x1ZGUgaW5zdGFsbGVkXG4gKiBwYWNrYWdlcyBmcm9tIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkgYXMgd29ya3NwYWNlXG4gKi9cbmZ1bmN0aW9uKiBhbGxQYWNrYWdlcygpIHtcbiAgZm9yIChjb25zdCBwayBvZiBwa2dNZ3IuZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3Qgd3Mgb2YgcGtnTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgaWYgKGluc3RhbGxlZCkge1xuICAgICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBzY2FuUGFja2FnZUpzb24ocGtnczogSXRlcmFibGU8cGtnTWdyLlBhY2thZ2VJbmZvPikge1xuICBjb25zdCBleHRlbnNpb25zOiBDbGlFeHRlbnNpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHI7XG4gICAgaWYgKGRyICYmIGRyLmNsaSkge1xuICAgICAgY29uc3QgcGFydHMgPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgICAgIGV4dGVuc2lvbnMucHVzaCh7cGtOYW1lOiBway5uYW1lLCBwa2dGaWxlUGF0aDogcGFydHNbMF0sIGZ1bmNOYW1lOiBwYXJ0c1sxXX0pO1xuICAgIH1cbiAgfVxuICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUV4dGVuc2lvbnMoZXh0ZW5zaW9ucyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19