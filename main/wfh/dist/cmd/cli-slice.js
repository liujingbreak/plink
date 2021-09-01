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
const helper_1 = require("../../../redux-toolkit-observable/dist/helper");
const rxjs_1 = require("rxjs");
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
const op = __importStar(require("rxjs/operators"));
const pkgMgr = __importStar(require("../package-mgr"));
const store_1 = require("../store");
const initialState = {
    commandByPackage: new Map(),
    commandInfoByName: new Map(),
    version: ''
    // loadedExtensionCmds: new Map()
};
const simpleReduces = {
    plinkUpgraded(d, newVersion) {
        d.version = newVersion;
    },
    updateLocale(d, [lang, country]) {
        d.osLang = lang;
        d.osCountry = country;
    },
    addCommandMeta(d, { pkg, metas }) {
        const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.name)[1]);
        d.commandByPackage.set(pkg, names);
        for (let i = 0, l = names.length; i < l; i++) {
            d.commandInfoByName.set(names[i], metas[i]);
        }
    }
};
exports.cliSlice = store_1.stateFactory.newSlice({
    name: 'cli',
    initialState,
    reducers: helper_1.createReducers(simpleReduces)
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
    // const actionStreams = castByActionType(cliSlice.actions, action$);
    return rxjs_1.merge(getStore().pipe(op.map(s => s.version), op.distinctUntilChanged(), op.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), rxjs_1.from(getLocale()).pipe(op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
            exports.cliActionDispatcher.updateLocale([lang, country]);
            pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
    })), action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'), op.tap(() => exports.cliActionDispatcher._change(s => {
        s.commandByPackage.clear();
        s.commandInfoByName.clear();
    })))).pipe(op.catchError(ex => {
        // eslint-disable-next-line no-console
        console.error(ex);
        return rxjs_1.of();
    }), op.ignoreElements());
});
function availabeCliExtension() {
}
exports.availabeCliExtension = availabeCliExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMEVBQTZFO0FBQzdFLCtCQUF1QztBQUN2QyxxRkFBcUY7QUFDckYsbURBQXFDO0FBQ3JDLHVEQUF5QztBQUN6QyxvQ0FBd0M7QUFtQnhDLE1BQU0sWUFBWSxHQUFhO0lBQzdCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzVCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsaUNBQWlDO0NBQ2xDLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRztJQUNwQixhQUFhLENBQUMsQ0FBVyxFQUFFLFVBQWtCO1FBQzNDLENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO0lBQ3pCLENBQUM7SUFDRCxZQUFZLENBQUMsQ0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBbUI7UUFDekQsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUNELGNBQWMsQ0FBQyxDQUFXLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUE2QztRQUNsRixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQzVDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzdDO0lBQ0gsQ0FBQztDQUNGLENBQUM7QUFFVyxRQUFBLFFBQVEsR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUM1QyxJQUFJLEVBQUUsS0FBSztJQUNYLFlBQVk7SUFDWixRQUFRLEVBQUUsdUJBQWMsQ0FBaUMsYUFBYSxDQUFDO0NBQ3hFLENBQUMsQ0FBQztBQUVVLFFBQUEsbUJBQW1CLEdBQUcsb0JBQVksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBUSxDQUFDLENBQUM7QUFJN0UsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLGdCQUFRLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsZ0JBQVEsQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFGRCw0QkFFQztBQUVELE1BQU0sU0FBUyxHQUEwQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUQsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLHVCQUF1QixDQUFzQixDQUFDO0FBR3pFLG9CQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO0lBQ3ZDLHFFQUFxRTtJQUNyRSxPQUFPLFlBQUssQ0FDVixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDL0QsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUNmLDhDQUE4QztRQUM5QyxJQUFJLE9BQU8sS0FBSyxVQUFVLENBQUMsT0FBTyxFQUFFO1lBQ2xDLDJCQUFtQixDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7U0FDdkQ7SUFDSCxDQUFDLENBQUMsQ0FDSCxFQUNELFdBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FDcEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNkLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLFFBQVEsRUFBRSxDQUFDLE1BQU0sS0FBSyxJQUFJLElBQUksUUFBUSxFQUFFLENBQUMsU0FBUyxLQUFLLE9BQU8sRUFBRTtZQUNsRSwyQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNsRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDdEY7SUFDSCxDQUFDLENBQUMsQ0FDSCxFQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssbUJBQW1CLENBQUMsRUFDbkUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQywyQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDM0MsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzNCLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixDQUFDLENBQUMsQ0FBQyxDQUNKLENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNqQixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLFNBQUUsRUFBaUIsQ0FBQztJQUM3QixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZVJlZHVjZXJzfSBmcm9tICcuLi8uLi8uLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9oZWxwZXInO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mIH0gZnJvbSAncnhqcyc7XG4vLyBpbXBvcnQge2NsaUFjdGlvbkRpc3BhdGNoZXIsIGdldFN0b3JlLCBjbGlTbGljZSwgQ2xpRXh0ZW5zaW9ufSBmcm9tICcuL2NsaS1zbGljZSc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5IH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHtPdXJDb21tYW5kTWV0YWRhdGF9IGZyb20gJy4vdHlwZXMnO1xuZXhwb3J0IGludGVyZmFjZSBDbGlTdGF0ZSB7XG4gIC8qKiBrZXkgaXMgcGFja2FnZSBuYW1lLCB2YWx1ZSBpcyBDb21tYW5kIG5hbWUgYW5kIGFyZ3MgKi9cbiAgY29tbWFuZEJ5UGFja2FnZTogTWFwPHN0cmluZywgT3VyQ29tbWFuZE1ldGFkYXRhWyduYW1lJ11bXT47XG4gIGNvbW1hbmRJbmZvQnlOYW1lOiBNYXA8T3VyQ29tbWFuZE1ldGFkYXRhWyduYW1lJ10sIE91ckNvbW1hbmRNZXRhZGF0YT47XG4gIHZlcnNpb246IHN0cmluZztcbiAgb3NMYW5nPzogc3RyaW5nO1xuICBvc0NvdW50cnk/OiBzdHJpbmc7XG4gIC8qKiBrZXk6IGNvbW1hbmQgbmFtZSwgdmFsdWU6IGZpbGUgcGF0aCAqL1xuICAvLyBsb2FkZWRFeHRlbnNpb25DbWRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaUV4dGVuc2lvbiB7XG4gIHBrTmFtZTogc3RyaW5nO1xuICBwa2dGaWxlUGF0aDogc3RyaW5nO1xuICBmdW5jTmFtZT86IHN0cmluZztcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBDbGlTdGF0ZSA9IHtcbiAgY29tbWFuZEJ5UGFja2FnZTogbmV3IE1hcCgpLFxuICBjb21tYW5kSW5mb0J5TmFtZTogbmV3IE1hcCgpLFxuICB2ZXJzaW9uOiAnJ1xuICAvLyBsb2FkZWRFeHRlbnNpb25DbWRzOiBuZXcgTWFwKClcbn07XG5cbmNvbnN0IHNpbXBsZVJlZHVjZXMgPSB7XG4gIHBsaW5rVXBncmFkZWQoZDogQ2xpU3RhdGUsIG5ld1ZlcnNpb246IHN0cmluZykge1xuICAgIGQudmVyc2lvbiA9IG5ld1ZlcnNpb247XG4gIH0sXG4gIHVwZGF0ZUxvY2FsZShkOiBDbGlTdGF0ZSwgW2xhbmcsIGNvdW50cnldOiBbc3RyaW5nLCBzdHJpbmddKSB7XG4gICAgZC5vc0xhbmcgPSBsYW5nO1xuICAgIGQub3NDb3VudHJ5ID0gY291bnRyeTtcbiAgfSxcbiAgYWRkQ29tbWFuZE1ldGEoZDogQ2xpU3RhdGUsIHtwa2csIG1ldGFzfToge3BrZzogc3RyaW5nOyBtZXRhczogT3VyQ29tbWFuZE1ldGFkYXRhW119KSB7XG4gICAgY29uc3QgbmFtZXMgPSBtZXRhcy5tYXAobWV0YSA9PiAvXlxccyo/KFxcUyspLy5leGVjKG1ldGEubmFtZSkhWzFdKTtcbiAgICBkLmNvbW1hbmRCeVBhY2thZ2Uuc2V0KHBrZywgbmFtZXMpO1xuICAgIGZvciAobGV0IGkgPSAwLCBsID0gbmFtZXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBkLmNvbW1hbmRJbmZvQnlOYW1lLnNldChuYW1lc1tpXSwgbWV0YXNbaV0pO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IGNsaVNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2NsaScsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IGNyZWF0ZVJlZHVjZXJzPENsaVN0YXRlLCB0eXBlb2Ygc2ltcGxlUmVkdWNlcz4oc2ltcGxlUmVkdWNlcylcbn0pO1xuXG5leHBvcnQgY29uc3QgY2xpQWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoY2xpU2xpY2UpO1xuXG5cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoY2xpU2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShjbGlTbGljZSk7XG59XG5cbmNvbnN0IGdldExvY2FsZTogKCkgPT4gUHJvbWlzZTxzdHJpbmc+ID0gcmVxdWlyZSgnb3MtbG9jYWxlJyk7XG5jb25zdCBkcmNwUGtKc29uID0gcmVxdWlyZSgnLi4vLi4vLi4vcGFja2FnZS5qc29uJykgYXMge3ZlcnNpb246IHN0cmluZ307XG5cblxuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICAvLyBjb25zdCBhY3Rpb25TdHJlYW1zID0gY2FzdEJ5QWN0aW9uVHlwZShjbGlTbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShvcC5tYXAocyA9PiBzLnZlcnNpb24pLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgb3AubWFwKHZlcnNpb24gPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygncXVpY2shISEhISEhISEhJywgZ2V0U3RhdGUoKSk7XG4gICAgICAgIGlmICh2ZXJzaW9uICE9PSBkcmNwUGtKc29uLnZlcnNpb24pIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnBsaW5rVXBncmFkZWQoZHJjcFBrSnNvbi52ZXJzaW9uKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIGZyb20oZ2V0TG9jYWxlKCkpLnBpcGUoXG4gICAgICBvcC5tYXAobG9jYWxlID0+IHtcbiAgICAgICAgY29uc3QgW2xhbmcsIGNvdW50cnldID0gbG9jYWxlLnNwbGl0KC9bXy1dLyk7XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLm9zTGFuZyAhPT0gbGFuZyB8fCBnZXRTdGF0ZSgpLm9zQ291bnRyeSAhPT0gY291bnRyeSkge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIudXBkYXRlTG9jYWxlKFtsYW5nLCBjb3VudHJ5XSk7XG4gICAgICAgICAgcGtnTWdyLmFjdGlvbkRpc3BhdGNoZXIuc2V0SW5DaGluYShjb3VudHJ5ID8gY291bnRyeS50b1VwcGVyQ2FzZSgpID09PSAnQ04nIDogZmFsc2UpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnR5cGUgPT09ICdCRUZPUkVfU0FWRV9TVEFURScpLFxuICAgICAgb3AudGFwKCgpID0+IGNsaUFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5jb21tYW5kQnlQYWNrYWdlLmNsZWFyKCk7XG4gICAgICAgIHMuY29tbWFuZEluZm9CeU5hbWUuY2xlYXIoKTtcbiAgICAgIH0pKVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIG9mPFBheWxvYWRBY3Rpb24+KCk7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19