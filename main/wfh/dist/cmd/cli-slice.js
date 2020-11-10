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
            pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQXVDO0FBQ3ZDLHFGQUFxRjtBQUNyRiw4Q0FBdUY7QUFDdkYsdURBQXlDO0FBQ3pDLG9DQUF3QztBQW1CeEMsTUFBTSxZQUFZLEdBQWE7SUFDN0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsaUNBQWlDO0NBQ2xDLENBQUM7QUFFVyxRQUFBLFFBQVEsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUM1QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQWdDO1lBQzlELEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUF3QjtZQUMzRCxDQUFDLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUN6QixDQUFDO1FBQ0QsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBa0M7WUFDekUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDeEIsQ0FBQztRQUNELGdGQUFnRjtRQUNoRiwrQkFBK0I7UUFDL0Isb0RBQW9EO1FBQ3BELElBQUk7S0FDTDtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEs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RixRQUFRO0FBQ1IsTUFBTTtBQUNOLHNEQUFzRDtBQUN0RCxJQUFJO0FBR0osU0FBZ0Isb0JBQW9CO0FBQ3BDLENBQUM7QUFERCxvREFDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7IGZyb20sIG1lcmdlLCBvZiB9IGZyb20gJ3J4anMnO1xuLy8gaW1wb3J0IHtjbGlBY3Rpb25EaXNwYXRjaGVyLCBnZXRTdG9yZSwgY2xpU2xpY2UsIENsaUV4dGVuc2lvbn0gZnJvbSAnLi9jbGktc2xpY2UnO1xuaW1wb3J0IHsgY2F0Y2hFcnJvciwgZGlzdGluY3RVbnRpbENoYW5nZWQsIGlnbm9yZUVsZW1lbnRzLCBtYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5IH0gZnJvbSAnLi4vc3RvcmUnO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICAvKioga2V5IGlzIHBhY2thZ2UgbmFtZSAqL1xuICBleHRlbnNpb25zOiBNYXA8c3RyaW5nLCBDbGlFeHRlbnNpb24+O1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG9zTGFuZz86IHN0cmluZztcbiAgb3NDb3VudHJ5Pzogc3RyaW5nO1xuICAvKioga2V5OiBjb21tYW5kIG5hbWUsIHZhbHVlOiBmaWxlIHBhdGggKi9cbiAgLy8gbG9hZGVkRXh0ZW5zaW9uQ21kczogTWFwPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbGlFeHRlbnNpb24ge1xuICBwa05hbWU6IHN0cmluZztcbiAgcGtnRmlsZVBhdGg6IHN0cmluZztcbiAgZnVuY05hbWU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xpU3RhdGUgPSB7XG4gIGV4dGVuc2lvbnM6IG5ldyBNYXAoKSxcbiAgdmVyc2lvbjogJydcbiAgLy8gbG9hZGVkRXh0ZW5zaW9uQ21kczogbmV3IE1hcCgpXG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIHVwZGF0ZUV4dGVuc2lvbnMoZHJhZnQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxDbGlFeHRlbnNpb25bXT4pIHtcbiAgICAgIGRyYWZ0LmV4dGVuc2lvbnMgPSBuZXcgTWFwKHBheWxvYWQubWFwKGV4ID0+IFtleC5wa05hbWUsIGV4XSkpO1xuICAgIH0sXG4gICAgcGxpbmtVcGdyYWRlZChkLCB7cGF5bG9hZDogbmV3VmVyc2lvbn06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgICB9LFxuICAgIHVwZGF0ZUxvY2FsZShkLCB7cGF5bG9hZDogW2xhbmcsIGNvdW50cnldfTogUGF5bG9hZEFjdGlvbjxbc3RyaW5nLCBzdHJpbmddPikge1xuICAgICAgZC5vc0xhbmcgPSBsYW5nO1xuICAgICAgZC5vc0NvdW50cnkgPSBjb3VudHJ5O1xuICAgIH1cbiAgICAvLyB1cGRhdGVMb2FkZWRDbWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtjbWQ6IHN0cmluZywgZmlsZTogc3RyaW5nfVtdPikge1xuICAgIC8vICAgZm9yIChjb25zdCByb3cgb2YgcGF5bG9hZClcbiAgICAvLyAgICAgZC5sb2FkZWRFeHRlbnNpb25DbWRzLnNldChyb3cuY21kLCByb3cuZmlsZSk7XG4gICAgLy8gfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGNsaUFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNsaVNsaWNlKTtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNsaVNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY2xpU2xpY2UpO1xufVxuXG5jb25zdCBnZXRMb2NhbGU6ICgpID0+IFByb21pc2U8c3RyaW5nPiA9IHJlcXVpcmUoJ29zLWxvY2FsZScpO1xuY29uc3QgZHJjcFBrSnNvbiA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpO1xuXG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcblxuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMudmVyc2lvbiksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdxdWljayEhISEhISEhISEnLCBnZXRTdGF0ZSgpKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT09IGRyY3BQa0pzb24udmVyc2lvbikge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIucGxpbmtVcGdyYWRlZChkcmNwUGtKc29uLnZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gcGtnTWdyLmdldFN0b3JlKCkucGlwZShcbiAgICAvLyAgIG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgIC8vICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAvLyAgIHNraXAoMSksXG4gICAgLy8gICBkZWJvdW5jZVRpbWUoMjAwKSxcbiAgICAvLyAgIG1hcChzcmNQYWNrYWdlcyA9PiB7XG4gICAgLy8gICAgIHNjYW5QYWNrYWdlSnNvbihzcmNQYWNrYWdlcy52YWx1ZXMoKSk7XG4gICAgLy8gICB9KVxuICAgIC8vICksXG4gICAgLy8gYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dNZ3Iuc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgLy8gICBtYXAoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleSksXG4gICAgLy8gICBtZXJnZU1hcCh3cyA9PiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIC8vICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzKSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgLy8gICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAvLyAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgLy8gICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgIC8vICAgICB9KVxuICAgIC8vICAgKSlcbiAgICAvLyApLFxuICAgIC8vIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oY2xpU2xpY2UuYWN0aW9ucy5wbGlua1VwZ3JhZGVkKSxcbiAgICAvLyAgIG1hcCgoKSA9PiB7XG4gICAgLy8gICAgIHNjYW5QYWNrYWdlSnNvbihhbGxQYWNrYWdlcygpKTtcbiAgICAvLyAgIH0pXG4gICAgLy8gKSxcbiAgICAvLyAuLi5BcnJheS5mcm9tKHBrZ01nci5nZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAvLyAgIHJldHVybiBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIC8vICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhLmluc3RhbGxlZENvbXBvbmVudHMpLFxuICAgIC8vICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgICBza2lwKDEpLFxuICAgIC8vICAgICBmaWx0ZXIoaW5zdGFsbGVkID0+IGluc3RhbGxlZCAhPSBudWxsICYmIGluc3RhbGxlZC5zaXplID4gMCksXG4gICAgLy8gICAgIG1hcChpbnN0YWxsZWQgPT4ge1xuICAgIC8vICAgICAgIHNjYW5QYWNrYWdlSnNvbihpbnN0YWxsZWQhLnZhbHVlcygpKTtcbiAgICAvLyAgICAgfSlcbiAgICAvLyAgICk7XG4gICAgLy8gfSksXG4gICAgZnJvbShnZXRMb2NhbGUoKSkucGlwZShcbiAgICAgIG1hcChsb2NhbGUgPT4ge1xuICAgICAgICBjb25zdCBbbGFuZywgY291bnRyeV0gPSBsb2NhbGUuc3BsaXQoL1tfLV0vKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkub3NMYW5nICE9PSBsYW5nIHx8IGdldFN0YXRlKCkub3NDb3VudHJ5ICE9PSBjb3VudHJ5KSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVMb2NhbGUoW2xhbmcsIGNvdW50cnldKTtcbiAgICAgICAgICBwa2dNZ3IuYWN0aW9uRGlzcGF0Y2hlci5zZXRJbkNoaW5hKGNvdW50cnkgPyBjb3VudHJ5LnRvVXBwZXJDYXNlKCkgPT09ICdDTicgOiBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihleCA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIG9mPFBheWxvYWRBY3Rpb24+KCk7XG4gICAgfSksXG4gICAgaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbi8vIGZ1bmN0aW9uIHNjYW5QYWNrYWdlSnNvbihwa2dzOiBJdGVyYWJsZTxwa2dNZ3IuUGFja2FnZUluZm8+KSB7XG4vLyAgIGNvbnN0IGV4dGVuc2lvbnM6IENsaUV4dGVuc2lvbltdID0gW107XG4vLyAgIGZvciAoY29uc3QgcGsgb2YgcGtncykge1xuLy8gICAgIGNvbnN0IGRyID0gcGsuanNvbi5kcjtcbi8vICAgICBpZiAoZHIgJiYgZHIuY2xpKSB7XG4vLyAgICAgICBjb25zdCBwYXJ0cyA9IChkci5jbGkgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuLy8gICAgICAgZXh0ZW5zaW9ucy5wdXNoKHtwa05hbWU6IHBrLm5hbWUsIHBrZ0ZpbGVQYXRoOiBwYXJ0c1swXSwgZnVuY05hbWU6IHBhcnRzWzFdfSk7XG4vLyAgICAgfVxuLy8gICB9XG4vLyAgIGNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlRXh0ZW5zaW9ucyhleHRlbnNpb25zKTtcbi8vIH1cblxuXG5leHBvcnQgZnVuY3Rpb24gYXZhaWxhYmVDbGlFeHRlbnNpb24oKSB7XG59XG5cbiJdfQ==