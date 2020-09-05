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
const package_utils_1 = require("../package-utils");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXN0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsZ0ZBQW1FO0FBQ25FLG9DQUFzQztBQUN0Qyw4Q0FDc0M7QUFDdEMsK0JBQStCO0FBQy9CLHVEQUF5QztBQUN6QyxvREFBNkM7QUFDN0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFhcEQsTUFBTSxZQUFZLEdBQWE7SUFDN0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxFQUFFO0NBQ1osQ0FBQztBQUVXLFFBQUEsUUFBUSxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQzVDLElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGdCQUFnQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBZ0M7WUFDOUQsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQXdCO1lBQzNELENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3pCLENBQUM7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsbUJBQW1CLEdBQUcsb0JBQVksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBUSxDQUFDLENBQUM7QUFFN0Usb0JBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUMvQixPQUFPLFlBQUssQ0FDVixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBRyxDQUFDLENB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Q0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLGdCQUFRLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsZ0JBQVEsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQVMsZUFBZSxDQUFDLElBQWtDO0lBQ3pELE1BQU0sVUFBVSxHQUFtQixFQUFFLENBQUM7SUFDdEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7UUFDckIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDdEIsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRTtZQUNoQixNQUFNLEtBQUssR0FBSSxFQUFFLENBQUMsR0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1QyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztTQUMvRTtLQUNGO0lBQ0QsMkJBQW1CLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge29mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uLy4uLy4uL3JlZHV4LXRvb2xraXQtYWJzZXJ2YWJsZSc7XG5pbXBvcnQge3N0YXRlRmFjdG9yeX0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBjYXRjaEVycm9yLCBpZ25vcmVFbGVtZW50cywgbWVyZ2VNYXAsIGRlYm91bmNlVGltZSxcbiAgc2tpcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge29mLCBtZXJnZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHthbGxQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICBleHRlbnNpb25zOiBNYXA8c3RyaW5nLCBDbGlFeHRlbnNpb24+O1xuICB2ZXJzaW9uOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBDbGlFeHRlbnNpb24ge1xuICBwa05hbWU6IHN0cmluZztcbiAgcGtnRmlsZVBhdGg6IHN0cmluZztcbiAgZnVuY05hbWU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xpU3RhdGUgPSB7XG4gIGV4dGVuc2lvbnM6IG5ldyBNYXAoKSxcbiAgdmVyc2lvbjogJydcbn07XG5cbmV4cG9ydCBjb25zdCBjbGlTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjbGknLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgdXBkYXRlRXh0ZW5zaW9ucyhkcmFmdCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPENsaUV4dGVuc2lvbltdPikge1xuICAgICAgZHJhZnQuZXh0ZW5zaW9ucyA9IG5ldyBNYXAocGF5bG9hZC5tYXAoZXggPT4gW2V4LnBrTmFtZSwgZXhdKSk7XG4gICAgfSxcbiAgICBwbGlua1VwZ3JhZGVkKGQsIHtwYXlsb2FkOiBuZXdWZXJzaW9ufTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7XG4gICAgICBkLnZlcnNpb24gPSBuZXdWZXJzaW9uO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBjbGlBY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjbGlTbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy52ZXJzaW9uKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh2ZXJzaW9uID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3F1aWNrISEhISEhISEhIScsIGdldFN0YXRlKCkpO1xuICAgICAgICBpZiAodmVyc2lvbiAhPT0gZHJjcFBrSnNvbi52ZXJzaW9uKSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5wbGlua1VwZ3JhZGVkKGRyY3BQa0pzb24udmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2tpcCgxKSxcbiAgICAgIGRlYm91bmNlVGltZSgyMDApLFxuICAgICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgICAgc2NhblBhY2thZ2VKc29uKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ01nci5zbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIG1hcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5KSxcbiAgICAgIG1lcmdlTWFwKHdzID0+IHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3MpIS5pbnN0YWxsZWRDb21wb25lbnRzKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKGluc3RhbGxlZCA9PiBpbnN0YWxsZWQgIT0gbnVsbCAmJiBpbnN0YWxsZWQuc2l6ZSA+IDApLFxuICAgICAgICBtYXAoaW5zdGFsbGVkID0+IHtcbiAgICAgICAgICBzY2FuUGFja2FnZUpzb24oaW5zdGFsbGVkIS52YWx1ZXMoKSk7XG4gICAgICAgIH0pXG4gICAgICApKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihjbGlTbGljZS5hY3Rpb25zLnBsaW5rVXBncmFkZWQpLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgc2NhblBhY2thZ2VKc29uKGFsbFBhY2thZ2VzKCkpO1xuICAgICAgfSlcbiAgICApLFxuICAgIC4uLkFycmF5LmZyb20ocGtnTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIHNraXAoMSksXG4gICAgICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KVxuICApLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihleCA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIG9mPFBheWxvYWRBY3Rpb24+KCk7XG4gICAgfSksXG4gICAgaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNsaVNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY2xpU2xpY2UpO1xufVxuXG5mdW5jdGlvbiBzY2FuUGFja2FnZUpzb24ocGtnczogSXRlcmFibGU8cGtnTWdyLlBhY2thZ2VJbmZvPikge1xuICBjb25zdCBleHRlbnNpb25zOiBDbGlFeHRlbnNpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHI7XG4gICAgaWYgKGRyICYmIGRyLmNsaSkge1xuICAgICAgY29uc3QgcGFydHMgPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgICAgIGV4dGVuc2lvbnMucHVzaCh7cGtOYW1lOiBway5uYW1lLCBwa2dGaWxlUGF0aDogcGFydHNbMF0sIGZ1bmNOYW1lOiBwYXJ0c1sxXX0pO1xuICAgIH1cbiAgfVxuICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUV4dGVuc2lvbnMoZXh0ZW5zaW9ucyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19