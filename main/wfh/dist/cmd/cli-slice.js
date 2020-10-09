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
            for (const row of payload)
                d.loadedExtensionCmds.set(row.cmd, row.file);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdURBQXlDO0FBQ3pDLG9DQUFzQztBQUN0QyxxRkFBcUY7QUFDckYsOENBQ3NDO0FBQ3RDLCtCQUFxQztBQUNyQyxnRkFBbUU7QUFDbkUsb0RBQTZDO0FBbUI3QyxNQUFNLFlBQVksR0FBYTtJQUM3QixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsT0FBTyxFQUFFLEVBQUU7SUFDWCxtQkFBbUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUMvQixDQUFDO0FBRVcsUUFBQSxRQUFRLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDNUMsSUFBSSxFQUFFLEtBQUs7SUFDWCxZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFnQztZQUM5RCxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pFLENBQUM7UUFDRCxhQUFhLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLFVBQVUsRUFBd0I7WUFDM0QsQ0FBQyxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUM7UUFDekIsQ0FBQztRQUNELFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEVBQWtDO1lBQ3pFLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLENBQUMsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLENBQUM7UUFDRCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FB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LEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLFNBQUUsRUFBaUIsQ0FBQztJQUM3QixDQUFDLENBQUMsRUFDRiwwQkFBYyxFQUFFLENBQ2pCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQVMsZUFBZSxDQUFDLElBQWtDO0lBQ3pELE1BQU0sVUFBVSxHQUFtQixFQUFFLENBQUM7SUFDdEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLEVBQUU7UUFDckIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDdEIsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRTtZQUNoQixNQUFNLEtBQUssR0FBSSxFQUFFLENBQUMsR0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1QyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsQ0FBQztTQUMvRTtLQUNGO0lBQ0QsMkJBQW1CLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUdELFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtzdGF0ZUZhY3Rvcnl9IGZyb20gJy4uL3N0b3JlJztcbi8vIGltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGNsaVNsaWNlLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCB7bWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgY2F0Y2hFcnJvciwgaWdub3JlRWxlbWVudHMsIG1lcmdlTWFwLCBkZWJvdW5jZVRpbWUsXG4gIHNraXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtvZiwgbWVyZ2UsIGZyb219IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuLi8uLi8uLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHthbGxQYWNrYWdlc30gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBDbGlTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lICovXG4gIGV4dGVuc2lvbnM6IE1hcDxzdHJpbmcsIENsaUV4dGVuc2lvbj47XG4gIHZlcnNpb246IHN0cmluZztcbiAgb3NMYW5nPzogc3RyaW5nO1xuICBvc0NvdW50cnk/OiBzdHJpbmc7XG4gIC8qKiBrZXk6IGNvbW1hbmQgbmFtZSwgdmFsdWU6IGZpbGUgcGF0aCAqL1xuICBsb2FkZWRFeHRlbnNpb25DbWRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaUV4dGVuc2lvbiB7XG4gIHBrTmFtZTogc3RyaW5nO1xuICBwa2dGaWxlUGF0aDogc3RyaW5nO1xuICBmdW5jTmFtZT86IHN0cmluZztcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDbGlTdGF0ZSA9IHtcbiAgZXh0ZW5zaW9uczogbmV3IE1hcCgpLFxuICB2ZXJzaW9uOiAnJyxcbiAgbG9hZGVkRXh0ZW5zaW9uQ21kczogbmV3IE1hcCgpXG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIHVwZGF0ZUV4dGVuc2lvbnMoZHJhZnQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxDbGlFeHRlbnNpb25bXT4pIHtcbiAgICAgIGRyYWZ0LmV4dGVuc2lvbnMgPSBuZXcgTWFwKHBheWxvYWQubWFwKGV4ID0+IFtleC5wa05hbWUsIGV4XSkpO1xuICAgIH0sXG4gICAgcGxpbmtVcGdyYWRlZChkLCB7cGF5bG9hZDogbmV3VmVyc2lvbn06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgICB9LFxuICAgIHVwZGF0ZUxvY2FsZShkLCB7cGF5bG9hZDogW2xhbmcsIGNvdW50cnldfTogUGF5bG9hZEFjdGlvbjxbc3RyaW5nLCBzdHJpbmddPikge1xuICAgICAgZC5vc0xhbmcgPSBsYW5nO1xuICAgICAgZC5vc0NvdW50cnkgPSBjb3VudHJ5O1xuICAgIH0sXG4gICAgdXBkYXRlTG9hZGVkQ21kKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7Y21kOiBzdHJpbmcsIGZpbGU6IHN0cmluZ31bXT4pIHtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIHBheWxvYWQpXG4gICAgICAgIGQubG9hZGVkRXh0ZW5zaW9uQ21kcy5zZXQocm93LmNtZCwgcm93LmZpbGUpO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBjbGlBY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjbGlTbGljZSk7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuY29uc3QgZ2V0TG9jYWxlOiAoKSA9PiBQcm9taXNlPHN0cmluZz4gPSByZXF1aXJlKCdvcy1sb2NhbGUnKTtcbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKTtcblxuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnZlcnNpb24pLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHZlcnNpb24gPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygncXVpY2shISEhISEhISEhJywgZ2V0U3RhdGUoKSk7XG4gICAgICAgIGlmICh2ZXJzaW9uICE9PSBkcmNwUGtKc29uLnZlcnNpb24pIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnBsaW5rVXBncmFkZWQoZHJjcFBrSnNvbi52ZXJzaW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBza2lwKDEpLFxuICAgICAgZGVib3VuY2VUaW1lKDIwMCksXG4gICAgICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgICAgICBzY2FuUGFja2FnZUpzb24oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24ocGtnTWdyLnNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpLFxuICAgICAgbWFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXkpLFxuICAgICAgbWVyZ2VNYXAod3MgPT4gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3cykhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAgICAgfSlcbiAgICAgICkpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKGNsaVNsaWNlLmFjdGlvbnMucGxpbmtVcGdyYWRlZCksXG4gICAgICBtYXAoKCkgPT4ge1xuICAgICAgICBzY2FuUGFja2FnZUpzb24oYWxsUGFja2FnZXMoKSk7XG4gICAgICB9KVxuICAgICksXG4gICAgLi4uQXJyYXkuZnJvbShwa2dNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgICByZXR1cm4gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpIS5pbnN0YWxsZWRDb21wb25lbnRzKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgZmlsdGVyKGluc3RhbGxlZCA9PiBpbnN0YWxsZWQgIT0gbnVsbCAmJiBpbnN0YWxsZWQuc2l6ZSA+IDApLFxuICAgICAgICBtYXAoaW5zdGFsbGVkID0+IHtcbiAgICAgICAgICBzY2FuUGFja2FnZUpzb24oaW5zdGFsbGVkIS52YWx1ZXMoKSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pLFxuICAgIGZyb20oZ2V0TG9jYWxlKCkpLnBpcGUoXG4gICAgICBtYXAobG9jYWxlID0+IHtcbiAgICAgICAgY29uc3QgW2xhbmcsIGNvdW50cnldID0gbG9jYWxlLnNwbGl0KC9bXy1dLyk7XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLm9zTGFuZyAhPT0gbGFuZyB8fCBnZXRTdGF0ZSgpLm9zQ291bnRyeSAhPT0gY291bnRyeSkge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlTG9jYWxlKFtsYW5nLCBjb3VudHJ5XSk7XG4gICAgICAgICAgcGtnTWdyLmFjdGlvbkRpc3BhdGNoZXIuc2V0SW5DaGluYShjb3VudHJ5LnRvVXBwZXJDYXNlKCkgPT09ICdDTicpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBvZjxQYXlsb2FkQWN0aW9uPigpO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5mdW5jdGlvbiBzY2FuUGFja2FnZUpzb24ocGtnczogSXRlcmFibGU8cGtnTWdyLlBhY2thZ2VJbmZvPikge1xuICBjb25zdCBleHRlbnNpb25zOiBDbGlFeHRlbnNpb25bXSA9IFtdO1xuICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICBjb25zdCBkciA9IHBrLmpzb24uZHI7XG4gICAgaWYgKGRyICYmIGRyLmNsaSkge1xuICAgICAgY29uc3QgcGFydHMgPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgICAgIGV4dGVuc2lvbnMucHVzaCh7cGtOYW1lOiBway5uYW1lLCBwa2dGaWxlUGF0aDogcGFydHNbMF0sIGZ1bmNOYW1lOiBwYXJ0c1sxXX0pO1xuICAgIH1cbiAgfVxuICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUV4dGVuc2lvbnMoZXh0ZW5zaW9ucyk7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGF2YWlsYWJlQ2xpRXh0ZW5zaW9uKCkge1xufVxuXG4iXX0=