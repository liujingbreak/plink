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
const rxjs_1 = require("rxjs");
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
const operators_1 = require("rxjs/operators");
const pkgMgr = __importStar(require("../package-mgr"));
const store_1 = require("../store");
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
    })), 
    // pkgMgr.getStore().pipe(
    //   map(s => s.srcPackages),
    //   distinctUntilChanged(),
    //   skip(1),
    //   debounceTime(200),
    //   map(srcPackages => {
    //     scanPackageJson(srcPackages.values());
    //   })
    // ),
    // action$.pipe(ofPayloadAction(pkgMgr.slice.actions._installWorkspace),
    //   map(action => action.payload.workspaceKey),
    //   mergeMap(ws => pkgMgr.getStore().pipe(
    //     map(s => s.workspaces.get(ws)!.installedComponents),
    //     distinctUntilChanged(),
    //     filter(installed => installed != null && installed.size > 0),
    //     map(installed => {
    //       scanPackageJson(installed!.values());
    //     })
    //   ))
    // ),
    // action$.pipe(ofPayloadAction(cliSlice.actions.plinkUpgraded),
    //   map(() => {
    //     scanPackageJson(allPackages());
    //   })
    // ),
    // ...Array.from(pkgMgr.getState().workspaces.keys()).map(key => {
    //   return pkgMgr.getStore().pipe(
    //     map(s => s.workspaces.get(key)!.installedComponents),
    //     distinctUntilChanged(),
    //     skip(1),
    //     filter(installed => installed != null && installed.size > 0),
    //     map(installed => {
    //       scanPackageJson(installed!.values());
    //     })
    //   );
    // }),
    rxjs_1.from(getLocale()).pipe(operators_1.map(locale => {
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
// function scanPackageJson(pkgs: Iterable<pkgMgr.PackageInfo>) {
//   const extensions: CliExtension[] = [];
//   for (const pk of pkgs) {
//     const dr = pk.json.dr;
//     if (dr && dr.cli) {
//       const parts = (dr.cli as string).split('#');
//       extensions.push({pkName: pk.name, pkgFilePath: parts[0], funcName: parts[1]});
//     }
//   }
//   cliActionDispatcher.updateExtensions(extensions);
// }
function availabeCliExtension() {
}
exports.availabeCliExtension = availabeCliExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQXVDO0FBQ3ZDLHFGQUFxRjtBQUNyRiw4Q0FBdUY7QUFDdkYsdURBQXlDO0FBQ3pDLG9DQUF3QztBQW1CeEMsTUFBTSxZQUFZLEdBQWE7SUFDN0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsbUJBQW1CLEVBQUUsSUFBSSxHQUFHLEVBQUU7Q0FDL0IsQ0FBQztBQUVXLFFBQUEsUUFBUSxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQzVDLElBQUksRUFBRSxLQUFLO0lBQ1gsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGdCQUFnQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBZ0M7WUFDOUQsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQXdCO1lBQzNELENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO1FBQ3pCLENBQUM7UUFDRCxZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFrQztZQUN6RSxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNoQixDQUFDLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztRQUN4QixDQUFDO1FBQ0QsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBK0M7WUFDeEUsS0FBSyxNQUFNLEdB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QUFDO0FBRUgsaUVBQWlFO0FBQ2pFLDJDQUEyQztBQUMzQyw2QkFBNkI7QUFDN0IsNkJBQTZCO0FBQzdCLDBCQUEwQjtBQUMxQixxREFBcUQ7QUFDckQsdUZBQXVGO0FBQ3ZGLFFBQVE7QUFDUixNQUFNO0FBQ04sc0RBQXNEO0FBQ3RELElBQUk7QUFHSixTQUFnQixvQkFBb0I7QUFDcEMsQ0FBQztBQURELG9EQUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mIH0gZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXIsIGdldFN0b3JlLCBjbGlTbGljZSwgQ2xpRXh0ZW5zaW9ufSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgeyBjYXRjaEVycm9yLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgaWdub3JlRWxlbWVudHMsIG1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBDbGlTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lICovXG4gIGV4dGVuc2lvbnM6IE1hcDxzdHJpbmcsIENsaUV4dGVuc2lvbj47XG4gIHZlcnNpb246IHN0cmluZztcbiAgb3NMYW5nPzogc3RyaW5nO1xuICBvc0NvdW50cnk/OiBzdHJpbmc7XG4gIC8qKiBrZXk6IGNvbW1hbmQgbmFtZSwgdmFsdWU6IGZpbGUgcGF0aCAqL1xuICBsb2FkZWRFeHRlbnNpb25DbWRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaUV4dGVuc2lvbiB7XG4gIHBrTmFtZTogc3RyaW5nO1xuICBwa2dGaWxlUGF0aDogc3RyaW5nO1xuICBmdW5jTmFtZT86IHN0cmluZztcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDbGlTdGF0ZSA9IHtcbiAgZXh0ZW5zaW9uczogbmV3IE1hcCgpLFxuICB2ZXJzaW9uOiAnJyxcbiAgbG9hZGVkRXh0ZW5zaW9uQ21kczogbmV3IE1hcCgpXG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIHVwZGF0ZUV4dGVuc2lvbnMoZHJhZnQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxDbGlFeHRlbnNpb25bXT4pIHtcbiAgICAgIGRyYWZ0LmV4dGVuc2lvbnMgPSBuZXcgTWFwKHBheWxvYWQubWFwKGV4ID0+IFtleC5wa05hbWUsIGV4XSkpO1xuICAgIH0sXG4gICAgcGxpbmtVcGdyYWRlZChkLCB7cGF5bG9hZDogbmV3VmVyc2lvbn06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgICB9LFxuICAgIHVwZGF0ZUxvY2FsZShkLCB7cGF5bG9hZDogW2xhbmcsIGNvdW50cnldfTogUGF5bG9hZEFjdGlvbjxbc3RyaW5nLCBzdHJpbmddPikge1xuICAgICAgZC5vc0xhbmcgPSBsYW5nO1xuICAgICAgZC5vc0NvdW50cnkgPSBjb3VudHJ5O1xuICAgIH0sXG4gICAgdXBkYXRlTG9hZGVkQ21kKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7Y21kOiBzdHJpbmcsIGZpbGU6IHN0cmluZ31bXT4pIHtcbiAgICAgIGZvciAoY29uc3Qgcm93IG9mIHBheWxvYWQpXG4gICAgICAgIGQubG9hZGVkRXh0ZW5zaW9uQ21kcy5zZXQocm93LmNtZCwgcm93LmZpbGUpO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBjbGlBY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjbGlTbGljZSk7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuY29uc3QgZ2V0TG9jYWxlOiAoKSA9PiBQcm9taXNlPHN0cmluZz4gPSByZXF1aXJlKCdvcy1sb2NhbGUnKTtcbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKTtcblxuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnZlcnNpb24pLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHZlcnNpb24gPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygncXVpY2shISEhISEhISEhJywgZ2V0U3RhdGUoKSk7XG4gICAgICAgIGlmICh2ZXJzaW9uICE9PSBkcmNwUGtKc29uLnZlcnNpb24pIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnBsaW5rVXBncmFkZWQoZHJjcFBrSnNvbi52ZXJzaW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIC8vIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgLy8gICBtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAvLyAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICBza2lwKDEpLFxuICAgIC8vICAgZGVib3VuY2VUaW1lKDIwMCksXG4gICAgLy8gICBtYXAoc3JjUGFja2FnZXMgPT4ge1xuICAgIC8vICAgICBzY2FuUGFja2FnZUpzb24oc3JjUGFja2FnZXMudmFsdWVzKCkpO1xuICAgIC8vICAgfSlcbiAgICAvLyApLFxuICAgIC8vIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24ocGtnTWdyLnNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpLFxuICAgIC8vICAgbWFwKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXkpLFxuICAgIC8vICAgbWVyZ2VNYXAod3MgPT4gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAvLyAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3cykhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgIC8vICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgLy8gICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgIC8vICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAvLyAgICAgfSlcbiAgICAvLyAgICkpXG4gICAgLy8gKSxcbiAgICAvLyBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKGNsaVNsaWNlLmFjdGlvbnMucGxpbmtVcGdyYWRlZCksXG4gICAgLy8gICBtYXAoKCkgPT4ge1xuICAgIC8vICAgICBzY2FuUGFja2FnZUpzb24oYWxsUGFja2FnZXMoKSk7XG4gICAgLy8gICB9KVxuICAgIC8vICksXG4gICAgLy8gLi4uQXJyYXkuZnJvbShwa2dNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgLy8gICByZXR1cm4gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAvLyAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpIS5pbnN0YWxsZWRDb21wb25lbnRzKSxcbiAgICAvLyAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAvLyAgICAgc2tpcCgxKSxcbiAgICAvLyAgICAgZmlsdGVyKGluc3RhbGxlZCA9PiBpbnN0YWxsZWQgIT0gbnVsbCAmJiBpbnN0YWxsZWQuc2l6ZSA+IDApLFxuICAgIC8vICAgICBtYXAoaW5zdGFsbGVkID0+IHtcbiAgICAvLyAgICAgICBzY2FuUGFja2FnZUpzb24oaW5zdGFsbGVkIS52YWx1ZXMoKSk7XG4gICAgLy8gICAgIH0pXG4gICAgLy8gICApO1xuICAgIC8vIH0pLFxuICAgIGZyb20oZ2V0TG9jYWxlKCkpLnBpcGUoXG4gICAgICBtYXAobG9jYWxlID0+IHtcbiAgICAgICAgY29uc3QgW2xhbmcsIGNvdW50cnldID0gbG9jYWxlLnNwbGl0KC9bXy1dLyk7XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLm9zTGFuZyAhPT0gbGFuZyB8fCBnZXRTdGF0ZSgpLm9zQ291bnRyeSAhPT0gY291bnRyeSkge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlTG9jYWxlKFtsYW5nLCBjb3VudHJ5XSk7XG4gICAgICAgICAgcGtnTWdyLmFjdGlvbkRpc3BhdGNoZXIuc2V0SW5DaGluYShjb3VudHJ5LnRvVXBwZXJDYXNlKCkgPT09ICdDTicpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBvZjxQYXlsb2FkQWN0aW9uPigpO1xuICAgIH0pLFxuICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG4vLyBmdW5jdGlvbiBzY2FuUGFja2FnZUpzb24ocGtnczogSXRlcmFibGU8cGtnTWdyLlBhY2thZ2VJbmZvPikge1xuLy8gICBjb25zdCBleHRlbnNpb25zOiBDbGlFeHRlbnNpb25bXSA9IFtdO1xuLy8gICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbi8vICAgICBjb25zdCBkciA9IHBrLmpzb24uZHI7XG4vLyAgICAgaWYgKGRyICYmIGRyLmNsaSkge1xuLy8gICAgICAgY29uc3QgcGFydHMgPSAoZHIuY2xpIGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbi8vICAgICAgIGV4dGVuc2lvbnMucHVzaCh7cGtOYW1lOiBway5uYW1lLCBwa2dGaWxlUGF0aDogcGFydHNbMF0sIGZ1bmNOYW1lOiBwYXJ0c1sxXX0pO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUV4dGVuc2lvbnMoZXh0ZW5zaW9ucyk7XG4vLyB9XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGF2YWlsYWJlQ2xpRXh0ZW5zaW9uKCkge1xufVxuXG4iXX0=