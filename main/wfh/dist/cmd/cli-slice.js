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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabeCliExtension = exports.getStore = exports.getState = exports.cliActionDispatcher = exports.cliSlice = void 0;
const rxjs_1 = require("rxjs");
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
const op = __importStar(require("rxjs/operators"));
const pkgMgr = __importStar(require("../package-mgr"));
const store_1 = require("../store");
const initialState = {
    extensions: new Map(),
    commandByPackage: new Map(),
    commandInfoByName: new Map(),
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
        },
        addCommandMeta(d, { payload: { pkg, metas } }) {
            const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.nameAndArgs)[1]);
            const existingMetas = d.commandByPackage.get(pkg);
            if (existingMetas) {
                existingMetas.push(...names);
            }
            else {
                d.commandByPackage.set(pkg, names);
            }
            for (let i = 0, l = names.length; i < l; i++) {
                d.commandInfoByName.set(names[i], metas[i]);
            }
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
    return rxjs_1.merge(getStore().pipe(op.map(s => s.version), op.distinctUntilChanged(), op.map(version => {
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
    rxjs_1.from(getLocale()).pipe(op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
            exports.cliActionDispatcher.updateLocale([lang, country]);
            pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
    }))).pipe(op.catchError(ex => {
        // tslint:disable-next-line: no-console
        console.error(ex);
        return rxjs_1.of();
    }), op.ignoreElements());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQXVDO0FBQ3ZDLHFGQUFxRjtBQUNyRixtREFBcUM7QUFDckMsdURBQXlDO0FBQ3pDLG9DQUF3QztBQXNCeEMsTUFBTSxZQUFZLEdBQWE7SUFDN0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzVCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsaUNBQWlDO0NBQ2xDLENBQUM7QUFFVyxRQUFBLFFBQVEsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUM1QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQWdDO1lBQzlELEtBQUssQ0FBQyxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELGFBQWEsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUF3QjtZQUMzRCxDQUFDLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztRQUN6QixDQUFDO1FBQ0QsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsRUFBa0M7WUFDekUsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDeEIsQ0FBQztRQUNELGNBQWMsQ0FB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RUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNkLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLFFBQVEsRUFBRSxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksUUFBUSxFQUFFLENBQUMsU0FBUyxLQUFLLE9BQU8sRUFBRTtZQUNsRSwyQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdEY7SUFDSCxDQUFDLENBQUMsQ0FDSCxDQUNGLENBQUMsSUFBSSxDQUNKLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDakIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDbEIsT0FBTyxTQUFFLEVBQWlCLENBQUM7SUFDN0IsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFFSCxpRUFBaUU7QUFDakUsMkNBQTJDO0FBQzNDLDZCQUE2QjtBQUM3Qiw2QkFBNkI7QUFDN0IsMEJBQTBCO0FBQzFCLHFEQUFxRDtBQUNyRCx1RkFBdUY7QUFDdkYsUUFBUTtBQUNSLE1BQU07QUFDTixzREFBc0Q7QUFDdEQsSUFBSTtBQUdKLFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2YgfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGNsaVNsaWNlLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge091ckNvbW1hbmRNZXRhZGF0YX0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICAvKioga2V5IGlzIHBhY2thZ2UgbmFtZSAqL1xuICBleHRlbnNpb25zOiBNYXA8c3RyaW5nLCBDbGlFeHRlbnNpb24+O1xuICAvKioga2V5IGlzIHBhY2thZ2UgbmFtZSwgdmFsdWUgaXMgQ29tbWFuZCBuYW1lIGFuZCBhcmdzICovXG4gIGNvbW1hbmRCeVBhY2thZ2U6IE1hcDxzdHJpbmcsIE91ckNvbW1hbmRNZXRhZGF0YVsnbmFtZUFuZEFyZ3MnXVtdPjtcbiAgY29tbWFuZEluZm9CeU5hbWU6IE1hcDxPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWVBbmRBcmdzJ10sIE91ckNvbW1hbmRNZXRhZGF0YT47XG4gIHZlcnNpb246IHN0cmluZztcbiAgb3NMYW5nPzogc3RyaW5nO1xuICBvc0NvdW50cnk/OiBzdHJpbmc7XG4gIC8qKiBrZXk6IGNvbW1hbmQgbmFtZSwgdmFsdWU6IGZpbGUgcGF0aCAqL1xuICAvLyBsb2FkZWRFeHRlbnNpb25DbWRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaUV4dGVuc2lvbiB7XG4gIHBrTmFtZTogc3RyaW5nO1xuICBwa2dGaWxlUGF0aDogc3RyaW5nO1xuICBmdW5jTmFtZT86IHN0cmluZztcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDbGlTdGF0ZSA9IHtcbiAgZXh0ZW5zaW9uczogbmV3IE1hcCgpLFxuICBjb21tYW5kQnlQYWNrYWdlOiBuZXcgTWFwKCksXG4gIGNvbW1hbmRJbmZvQnlOYW1lOiBuZXcgTWFwKCksXG4gIHZlcnNpb246ICcnXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IG5ldyBNYXAoKVxufTtcblxuZXhwb3J0IGNvbnN0IGNsaVNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NsaScsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICB1cGRhdGVFeHRlbnNpb25zKGRyYWZ0LCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Q2xpRXh0ZW5zaW9uW10+KSB7XG4gICAgICBkcmFmdC5leHRlbnNpb25zID0gbmV3IE1hcChwYXlsb2FkLm1hcChleCA9PiBbZXgucGtOYW1lLCBleF0pKTtcbiAgICB9LFxuICAgIHBsaW5rVXBncmFkZWQoZCwge3BheWxvYWQ6IG5ld1ZlcnNpb259OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHtcbiAgICAgIGQudmVyc2lvbiA9IG5ld1ZlcnNpb247XG4gICAgfSxcbiAgICB1cGRhdGVMb2NhbGUoZCwge3BheWxvYWQ6IFtsYW5nLCBjb3VudHJ5XX06IFBheWxvYWRBY3Rpb248W3N0cmluZywgc3RyaW5nXT4pIHtcbiAgICAgIGQub3NMYW5nID0gbGFuZztcbiAgICAgIGQub3NDb3VudHJ5ID0gY291bnRyeTtcbiAgICB9LFxuICAgIGFkZENvbW1hbmRNZXRhKGQsIHtwYXlsb2FkOiB7cGtnLCBtZXRhc319OiBQYXlsb2FkQWN0aW9uPHtwa2c6IHN0cmluZzsgbWV0YXM6IE91ckNvbW1hbmRNZXRhZGF0YVtdfT4pIHtcbiAgICAgIGNvbnN0IG5hbWVzID0gbWV0YXMubWFwKG1ldGEgPT4gL15cXHMqPyhcXFMrKS8uZXhlYyhtZXRhLm5hbWVBbmRBcmdzKSFbMV0pO1xuICAgICAgY29uc3QgZXhpc3RpbmdNZXRhcyA9IGQuY29tbWFuZEJ5UGFja2FnZS5nZXQocGtnKTtcbiAgICAgIGlmIChleGlzdGluZ01ldGFzKSB7XG4gICAgICAgIGV4aXN0aW5nTWV0YXMucHVzaCguLi5uYW1lcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkLmNvbW1hbmRCeVBhY2thZ2Uuc2V0KHBrZywgbmFtZXMpO1xuICAgICAgfVxuICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgZC5jb21tYW5kSW5mb0J5TmFtZS5zZXQobmFtZXNbaV0sIG1ldGFzW2ldKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY2xpU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjbGlTbGljZSk7XG59XG5cbmNvbnN0IGdldExvY2FsZTogKCkgPT4gUHJvbWlzZTxzdHJpbmc+ID0gcmVxdWlyZSgnb3MtbG9jYWxlJyk7XG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJyk7XG5cblxuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuXG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUob3AubWFwKHMgPT4gcy52ZXJzaW9uKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm1hcCh2ZXJzaW9uID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3F1aWNrISEhISEhISEhIScsIGdldFN0YXRlKCkpO1xuICAgICAgICBpZiAodmVyc2lvbiAhPT0gZHJjcFBrSnNvbi52ZXJzaW9uKSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5wbGlua1VwZ3JhZGVkKGRyY3BQa0pzb24udmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBwa2dNZ3IuZ2V0U3RvcmUoKS5waXBlKFxuICAgIC8vICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgLy8gICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIC8vICAgc2tpcCgxKSxcbiAgICAvLyAgIGRlYm91bmNlVGltZSgyMDApLFxuICAgIC8vICAgbWFwKHNyY1BhY2thZ2VzID0+IHtcbiAgICAvLyAgICAgc2NhblBhY2thZ2VKc29uKHNyY1BhY2thZ2VzLnZhbHVlcygpKTtcbiAgICAvLyAgIH0pXG4gICAgLy8gKSxcbiAgICAvLyBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ01nci5zbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAvLyAgIG1hcChhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5KSxcbiAgICAvLyAgIG1lcmdlTWFwKHdzID0+IHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgLy8gICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3MpIS5pbnN0YWxsZWRDb21wb25lbnRzKSxcbiAgICAvLyAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAvLyAgICAgZmlsdGVyKGluc3RhbGxlZCA9PiBpbnN0YWxsZWQgIT0gbnVsbCAmJiBpbnN0YWxsZWQuc2l6ZSA+IDApLFxuICAgIC8vICAgICBtYXAoaW5zdGFsbGVkID0+IHtcbiAgICAvLyAgICAgICBzY2FuUGFja2FnZUpzb24oaW5zdGFsbGVkIS52YWx1ZXMoKSk7XG4gICAgLy8gICAgIH0pXG4gICAgLy8gICApKVxuICAgIC8vICksXG4gICAgLy8gYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihjbGlTbGljZS5hY3Rpb25zLnBsaW5rVXBncmFkZWQpLFxuICAgIC8vICAgbWFwKCgpID0+IHtcbiAgICAvLyAgICAgc2NhblBhY2thZ2VKc29uKGFsbFBhY2thZ2VzKCkpO1xuICAgIC8vICAgfSlcbiAgICAvLyApLFxuICAgIC8vIC4uLkFycmF5LmZyb20ocGtnTWdyLmdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgIC8vICAgcmV0dXJuIHBrZ01nci5nZXRTdG9yZSgpLnBpcGUoXG4gICAgLy8gICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyksXG4gICAgLy8gICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gICAgIHNraXAoMSksXG4gICAgLy8gICAgIGZpbHRlcihpbnN0YWxsZWQgPT4gaW5zdGFsbGVkICE9IG51bGwgJiYgaW5zdGFsbGVkLnNpemUgPiAwKSxcbiAgICAvLyAgICAgbWFwKGluc3RhbGxlZCA9PiB7XG4gICAgLy8gICAgICAgc2NhblBhY2thZ2VKc29uKGluc3RhbGxlZCEudmFsdWVzKCkpO1xuICAgIC8vICAgICB9KVxuICAgIC8vICAgKTtcbiAgICAvLyB9KSxcbiAgICBmcm9tKGdldExvY2FsZSgpKS5waXBlKFxuICAgICAgb3AubWFwKGxvY2FsZSA9PiB7XG4gICAgICAgIGNvbnN0IFtsYW5nLCBjb3VudHJ5XSA9IGxvY2FsZS5zcGxpdCgvW18tXS8pO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS5vc0xhbmcgIT09IGxhbmcgfHwgZ2V0U3RhdGUoKS5vc0NvdW50cnkgIT09IGNvdW50cnkpIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUxvY2FsZShbbGFuZywgY291bnRyeV0pO1xuICAgICAgICAgIHBrZ01nci5hY3Rpb25EaXNwYXRjaGVyLnNldEluQ2hpbmEoY291bnRyeSA/IGNvdW50cnkudG9VcHBlckNhc2UoKSA9PT0gJ0NOJyA6IGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKGV4ID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oKTtcbiAgICB9KSxcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuLy8gZnVuY3Rpb24gc2NhblBhY2thZ2VKc29uKHBrZ3M6IEl0ZXJhYmxlPHBrZ01nci5QYWNrYWdlSW5mbz4pIHtcbi8vICAgY29uc3QgZXh0ZW5zaW9uczogQ2xpRXh0ZW5zaW9uW10gPSBbXTtcbi8vICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4vLyAgICAgY29uc3QgZHIgPSBway5qc29uLmRyO1xuLy8gICAgIGlmIChkciAmJiBkci5jbGkpIHtcbi8vICAgICAgIGNvbnN0IHBhcnRzID0gKGRyLmNsaSBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4vLyAgICAgICBleHRlbnNpb25zLnB1c2goe3BrTmFtZTogcGsubmFtZSwgcGtnRmlsZVBhdGg6IHBhcnRzWzBdLCBmdW5jTmFtZTogcGFydHNbMV19KTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVFeHRlbnNpb25zKGV4dGVuc2lvbnMpO1xuLy8gfVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19