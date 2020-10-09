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
const pkgMgr = __importStar(require("../package-mgr"));
const store_1 = require("../store");
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const redux_toolkit_observable_1 = require("../../../redux-toolkit-observable");
const package_utils_1 = require("../package-utils");
const initialState = {
    extensions: new Map(),
    version: '',
    loadedExtensionCmds: new Map()
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
        updateLocale(d, { payload: [lang, country] }) {
            d.osLang = lang;
            d.osCountry = country;
        },
        updateLoadedCmd(d, { payload }) {
            d.loadedExtensionCmds.set(payload.cmd, payload.file);
        }
    }
});
exports.cliActionDispatcher = store_1.stateFactory.bindActionCreators(exports.cliSlice);
function getState() {
    return store_1.stateFactory.sliceState(exports.cliSlice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.cliSlice);
}
exports.getStore = getStore;
const getLocale = require('os-locale');
const drcpPkJson = require('../../../package.json');
store_1.stateFactory.addEpic((action$, state$) => {
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
    }), rxjs_1.from(getLocale()).pipe(operators_1.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
            exports.cliActionDispatcher.updateLocale([lang, country]);
            pkgMgr.actionDispatcher.setInChina(country.toUpperCase() === 'CN');
        }
    }))).pipe(operators_1.catchError(ex => {
        // tslint:disable-next-line: no-console
        console.error(ex);
        return rxjs_1.of();
    }), operators_1.ignoreElements());
});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdURBQXlDO0FBQ3pDLG9DQUFzQztBQUN0QyxxRkFBcUY7QUFDckYsOENBQ3NDO0FBQ3RDLCtCQUFxQztBQUNyQyxnRkFBbUU7QUFDbkUsb0RBQTZDO0FBbUI3QyxNQUFNLFlBQVksR0FBYTtJQUM3QixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsT0FBTyxFQUFFLEVBQUU7SUFDWCxtQkFBbUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUMvQixDQUFDO0FBRVcsUUFBQSxRQUFRLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDNUMsSUFBSSxFQUFFLEtBQUs7SUFDWCxZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFnQztZQUM5RCxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFDRCxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLFVBQVUsRUFBd0I7WUFDM0QsQ0FBQyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDekIsQ0FBQztRQUNELFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWtDO1lBQ3pFLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLENBQUMsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLENBQUM7UUFDRCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FB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T0FBTyxTQUFFLEVBQWlCLENBQUM7SUFDN0IsQ0FBQyxDQUFDLEVBQ0YsMEJBQWMsRUFBRSxDQUNqQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxTQUFTLGVBQWUsQ0FBQyxJQUFrQztJQUN6RCxNQUFNLFVBQVUsR0FBbUIsRUFBRSxDQUFDO0lBQ3RDLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFO1FBQ3JCLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3RCLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUU7WUFDaEIsTUFBTSxLQUFLLEdBQUksRUFBRSxDQUFDLEdBQWMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBQyxDQUFDLENBQUM7U0FDL0U7S0FDRjtJQUNELDJCQUFtQixDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25ELENBQUM7QUFHRCxTQUFnQixvQkFBb0I7QUFDcEMsQ0FBQztBQURELG9EQUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0ICogYXMgcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7c3RhdGVGYWN0b3J5fSBmcm9tICcuLi9zdG9yZSc7XG4vLyBpbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXIsIGdldFN0b3JlLCBjbGlTbGljZSwgQ2xpRXh0ZW5zaW9ufSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQge21hcCwgZGlzdGluY3RVbnRpbENoYW5nZWQsIGNhdGNoRXJyb3IsIGlnbm9yZUVsZW1lbnRzLCBtZXJnZU1hcCwgZGVib3VuY2VUaW1lLFxuICBza2lwLCBmaWx0ZXJ9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7b2YsIG1lcmdlLCBmcm9tfSBmcm9tICdyeGpzJztcbmltcG9ydCB7b2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7YWxsUGFja2FnZXN9IGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICAvKioga2V5IGlzIHBhY2thZ2UgbmFtZSAqL1xuICBleHRlbnNpb25zOiBNYXA8c3RyaW5nLCBDbGlFeHRlbnNpb24+O1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG9zTGFuZz86IHN0cmluZztcbiAgb3NDb3VudHJ5Pzogc3RyaW5nO1xuICAvKioga2V5OiBjb21tYW5kIG5hbWUsIHZhbHVlOiBmaWxlIHBhdGggKi9cbiAgbG9hZGVkRXh0ZW5zaW9uQ21kczogTWFwPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbGlFeHRlbnNpb24ge1xuICBwa05hbWU6IHN0cmluZztcbiAgcGtnRmlsZVBhdGg6IHN0cmluZztcbiAgZnVuY05hbWU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xpU3RhdGUgPSB7XG4gIGV4dGVuc2lvbnM6IG5ldyBNYXAoKSxcbiAgdmVyc2lvbjogJycsXG4gIGxvYWRlZEV4dGVuc2lvbkNtZHM6IG5ldyBNYXAoKVxufTtcblxuZXhwb3J0IGNvbnN0IGNsaVNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NsaScsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICB1cGRhdGVFeHRlbnNpb25zKGRyYWZ0LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Q2xpRXh0ZW5zaW9uW10+KSB7XG4gICAgICBkcmFmdC5leHRlbnNpb25zID0gbmV3IE1hcChwYXlsb2FkLm1hcChleCA9PiBbZXgucGtOYW1lLCBleF0pKTtcbiAgICB9LFxuICAgIHBsaW5rVXBncmFkZWQoZCwge3BheWxvYWQ6IG5ld1ZlcnNpb259OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHtcbiAgICAgIGQudmVyc2lvbiA9IG5ld1ZlcnNpb247XG4gICAgfSxcbiAgICB1cGRhdGVMb2NhbGUoZCwge3BheWxvYWQ6IFtsYW5nLCBjb3VudHJ5XX06IFBheWxvYWRBY3Rpb248W3N0cmluZywgc3RyaW5nXT4pIHtcbiAgICAgIGQub3NMYW5nID0gbGFuZztcbiAgICAgIGQub3NDb3VudHJ5ID0gY291bnRyeTtcbiAgICB9LFxuICAgIHVwZGF0ZUxvYWRlZENtZChkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e2NtZDogc3RyaW5nLCBmaWxlOiBzdHJpbmd9Pikge1xuICAgICAgZC5sb2FkZWRFeHRlbnNpb25DbWRzLnNldChwYXlsb2FkLmNtZCwgcGF5bG9hZC5maWxlKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY2xpU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjbGlTbGljZSk7XG59XG5cbmNvbnN0IGdldExvY2FsZTogKCkgPT4gUHJvbWlzZTxzdHJpbmc+ID0gcmVxdWlyZSgnb3MtbG9jYWxlJyk7XG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cblxuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuXG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy52ZXJzaW9uKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh2ZXJzaW9uID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3F1aWNrISEhISEhISEhIScsIGdldFN0YXRlKCkpO1xuICAgICAgICBpZiAodmVyc2lvbiAhPT0gZHJjcFBrSnNvbi52ZXJzaW9uKSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5wbGlua1VwZ3JhZGVkKGRyY3BQa0pzb24udmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2tpcCgxKSxcbiAgICAgIGRlYm91bmNlVGltZSgyMDApLFxuICAgICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAgICAgc2NhblBhY2thZ2VKc29uKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ01nci5zbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIG1hcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5KSxcbiAgICAgIG1lcmdlTWFwKHdzID0+IHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3MpIS5pbnN0YWxsZWRDb21wb25lbnRzKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKGluc3RhbGxlZCA9PiBpbnN0YWxsZWQgIT0gbnVsbCAmJiBpbnN0YWxsZWQuc2l6ZSA+IDApLFxuICAgICAgICBtYXAoaW5zdGFsbGVkID0+IHtcbiAgICAgICAgICBzY2FuUGFja2FnZUpzb24oaW5zdGFsbGVkIS52YWx1ZXMoKSk7XG4gICAgICAgIH0pXG4gICAgICApKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihjbGlTbGljZS5hY3Rpb25zLnBsaW5rVXBncmFkZWQpLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgc2NhblBhY2thZ2VKc29uKGFsbFBhY2thZ2VzKCkpO1xuICAgICAgfSlcbiAgICApLFxuICAgIC4uLkFycmF5LmZyb20ocGtnTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIHNraXAoMSksXG4gICAgICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KSxcbiAgICBmcm9tKGdldExvY2FsZSgpKS5waXBlKFxuICAgICAgbWFwKGxvY2FsZSA9PiB7XG4gICAgICAgIGNvbnN0IFtsYW5nLCBjb3VudHJ5XSA9IGxvY2FsZS5zcGxpdCgvW18tXS8pO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS5vc0xhbmcgIT09IGxhbmcgfHwgZ2V0U3RhdGUoKS5vc0NvdW50cnkgIT09IGNvdW50cnkpIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUxvY2FsZShbbGFuZywgY291bnRyeV0pO1xuICAgICAgICAgIHBrZ01nci5hY3Rpb25EaXNwYXRjaGVyLnNldEluQ2hpbmEoY291bnRyeS50b1VwcGVyQ2FzZSgpID09PSAnQ04nKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKGV4ID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oKTtcbiAgICB9KSxcbiAgICBpZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZnVuY3Rpb24gc2NhblBhY2thZ2VKc29uKHBrZ3M6IEl0ZXJhYmxlPHBrZ01nci5QYWNrYWdlSW5mbz4pIHtcbiAgY29uc3QgZXh0ZW5zaW9uczogQ2xpRXh0ZW5zaW9uW10gPSBbXTtcbiAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgY29uc3QgZHIgPSBway5qc29uLmRyO1xuICAgIGlmIChkciAmJiBkci5jbGkpIHtcbiAgICAgIGNvbnN0IHBhcnRzID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4gICAgICBleHRlbnNpb25zLnB1c2goe3BrTmFtZTogcGsubmFtZSwgcGtnRmlsZVBhdGg6IHBhcnRzWzBdLCBmdW5jTmFtZTogcGFydHNbMV19KTtcbiAgICB9XG4gIH1cbiAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVFeHRlbnNpb25zKGV4dGVuc2lvbnMpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19