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
    version: ''
    // loadedExtensionCmds: new Map()
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
        }
        // updateLoadedCmd(d, {payload}: PayloadAction<{cmd: string, file: string}[]>) {
        //   for (const row of payload)
        //     d.loadedExtensionCmds.set(row.cmd, row.file);
        // }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQXVDO0FBQ3ZDLHFGQUFxRjtBQUNyRiw4Q0FBdUY7QUFDdkYsdURBQXlDO0FBQ3pDLG9DQUF3QztBQW1CeEMsTUFBTSxZQUFZLEdBQWE7SUFDN0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsaUNBQWlDO0NBQ2xDLENBQUM7QUFFVyxRQUFBLFFBQVEsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUM1QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQWdDO1lBQzlELEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUF3QjtZQUMzRCxDQUFDLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUN6QixDQUFDO1FBQ0QsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBa0M7WUFDekUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDeEIsQ0FBQztRQUNELGdGQUFnRjtRQUNoRiwrQkFBK0I7UUFDL0Isb0RBQW9EO1FBQ3BELElBQUk7S0FDTDtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEs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QUFHSixTQUFnQixvQkFBb0I7QUFDcEMsQ0FBQztBQURELG9EQUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mIH0gZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXIsIGdldFN0b3JlLCBjbGlTbGljZSwgQ2xpRXh0ZW5zaW9ufSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgeyBjYXRjaEVycm9yLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgaWdub3JlRWxlbWVudHMsIG1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5cblxuZXhwb3J0IGludGVyZmFjZSBDbGlTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lICovXG4gIGV4dGVuc2lvbnM6IE1hcDxzdHJpbmcsIENsaUV4dGVuc2lvbj47XG4gIHZlcnNpb246IHN0cmluZztcbiAgb3NMYW5nPzogc3RyaW5nO1xuICBvc0NvdW50cnk/OiBzdHJpbmc7XG4gIC8qKiBrZXk6IGNvbW1hbmQgbmFtZSwgdmFsdWU6IGZpbGUgcGF0aCAqL1xuICAvLyBsb2FkZWRFeHRlbnNpb25DbWRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaUV4dGVuc2lvbiB7XG4gIHBrTmFtZTogc3RyaW5nO1xuICBwa2dGaWxlUGF0aDogc3RyaW5nO1xuICBmdW5jTmFtZT86IHN0cmluZztcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDbGlTdGF0ZSA9IHtcbiAgZXh0ZW5zaW9uczogbmV3IE1hcCgpLFxuICB2ZXJzaW9uOiAnJ1xuICAvLyBsb2FkZWRFeHRlbnNpb25DbWRzOiBuZXcgTWFwKClcbn07XG5cbmV4cG9ydCBjb25zdCBjbGlTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjbGknLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgdXBkYXRlRXh0ZW5zaW9ucyhkcmFmdCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPENsaUV4dGVuc2lvbltdPikge1xuICAgICAgZHJhZnQuZXh0ZW5zaW9ucyA9IG5ldyBNYXAocGF5bG9hZC5tYXAoZXggPT4gW2V4LnBrTmFtZSwgZXhdKSk7XG4gICAgfSxcbiAgICBwbGlua1VwZ3JhZGVkKGQsIHtwYXlsb2FkOiBuZXdWZXJzaW9ufTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7XG4gICAgICBkLnZlcnNpb24gPSBuZXdWZXJzaW9uO1xuICAgIH0sXG4gICAgdXBkYXRlTG9jYWxlKGQsIHtwYXlsb2FkOiBbbGFuZywgY291bnRyeV19OiBQYXlsb2FkQWN0aW9uPFtzdHJpbmcsIHN0cmluZ10+KSB7XG4gICAgICBkLm9zTGFuZyA9IGxhbmc7XG4gICAgICBkLm9zQ291bnRyeSA9IGNvdW50cnk7XG4gICAgfVxuICAgIC8vIHVwZGF0ZUxvYWRlZENtZChkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e2NtZDogc3RyaW5nLCBmaWxlOiBzdHJpbmd9W10+KSB7XG4gICAgLy8gICBmb3IgKGNvbnN0IHJvdyBvZiBwYXlsb2FkKVxuICAgIC8vICAgICBkLmxvYWRlZEV4dGVuc2lvbkNtZHMuc2V0KHJvdy5jbWQsIHJvdy5maWxlKTtcbiAgICAvLyB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY2xpU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjbGlTbGljZSk7XG59XG5cbmNvbnN0IGdldExvY2FsZTogKCkgPT4gUHJvbWlzZTxzdHJpbmc+ID0gcmVxdWlyZSgnb3MtbG9jYWxlJyk7XG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cblxuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuXG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy52ZXJzaW9uKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh2ZXJzaW9uID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3F1aWNrISEhISEhISEhIScsIGdldFN0YXRlKCkpO1xuICAgICAgICBpZiAodmVyc2lvbiAhPT0gZHJjcFBrSnNvbi52ZXJzaW9uKSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5wbGlua1VwZ3JhZGVkKGRyY3BQa0pzb24udmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIC8vICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgLy8gICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgc2tpcCgxKSxcbiAgICAvLyAgIGRlYm91bmNlVGltZSgyMDApLFxuICAgIC8vICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAvLyAgICAgc2NhblBhY2thZ2VKc29uKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAvLyAgIH0pXG4gICAgLy8gKSxcbiAgICAvLyBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ01nci5zbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAvLyAgIG1hcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5KSxcbiAgICAvLyAgIG1lcmdlTWFwKHdzID0+IHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgLy8gICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3MpIS5pbnN0YWxsZWRDb21wb25lbnRzKSxcbiAgICAvLyAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAvLyAgICAgZmlsdGVyKGluc3RhbGxlZCA9PiBpbnN0YWxsZWQgIT0gbnVsbCAmJiBpbnN0YWxsZWQuc2l6ZSA+IDApLFxuICAgIC8vICAgICBtYXAoaW5zdGFsbGVkID0+IHtcbiAgICAvLyAgICAgICBzY2FuUGFja2FnZUpzb24oaW5zdGFsbGVkIS52YWx1ZXMoKSk7XG4gICAgLy8gICAgIH0pXG4gICAgLy8gICApKVxuICAgIC8vICksXG4gICAgLy8gYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihjbGlTbGljZS5hY3Rpb25zLnBsaW5rVXBncmFkZWQpLFxuICAgIC8vICAgbWFwKCgpID0+IHtcbiAgICAvLyAgICAgc2NhblBhY2thZ2VKc29uKGFsbFBhY2thZ2VzKCkpO1xuICAgIC8vICAgfSlcbiAgICAvLyApLFxuICAgIC8vIC4uLkFycmF5LmZyb20ocGtnTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgIC8vICAgcmV0dXJuIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgLy8gICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgLy8gICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICAgIHNraXAoMSksXG4gICAgLy8gICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAvLyAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgLy8gICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgIC8vICAgICB9KVxuICAgIC8vICAgKTtcbiAgICAvLyB9KSxcbiAgICBmcm9tKGdldExvY2FsZSgpKS5waXBlKFxuICAgICAgbWFwKGxvY2FsZSA9PiB7XG4gICAgICAgIGNvbnN0IFtsYW5nLCBjb3VudHJ5XSA9IGxvY2FsZS5zcGxpdCgvW18tXS8pO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS5vc0xhbmcgIT09IGxhbmcgfHwgZ2V0U3RhdGUoKS5vc0NvdW50cnkgIT09IGNvdW50cnkpIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUxvY2FsZShbbGFuZywgY291bnRyeV0pO1xuICAgICAgICAgIHBrZ01nci5hY3Rpb25EaXNwYXRjaGVyLnNldEluQ2hpbmEoY291bnRyeS50b1VwcGVyQ2FzZSgpID09PSAnQ04nKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKGV4ID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oKTtcbiAgICB9KSxcbiAgICBpZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuLy8gZnVuY3Rpb24gc2NhblBhY2thZ2VKc29uKHBrZ3M6IEl0ZXJhYmxlPHBrZ01nci5QYWNrYWdlSW5mbz4pIHtcbi8vICAgY29uc3QgZXh0ZW5zaW9uczogQ2xpRXh0ZW5zaW9uW10gPSBbXTtcbi8vICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4vLyAgICAgY29uc3QgZHIgPSBway5qc29uLmRyO1xuLy8gICAgIGlmIChkciAmJiBkci5jbGkpIHtcbi8vICAgICAgIGNvbnN0IHBhcnRzID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4vLyAgICAgICBleHRlbnNpb25zLnB1c2goe3BrTmFtZTogcGsubmFtZSwgcGtnRmlsZVBhdGg6IHBhcnRzWzBdLCBmdW5jTmFtZTogcGFydHNbMV19KTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVFeHRlbnNpb25zKGV4dGVuc2lvbnMpO1xuLy8gfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19