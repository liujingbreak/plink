"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const helper_1 = require("../../../packages/redux-toolkit-observable/dist/helper");
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
    reducers: (0, helper_1.createReducers)(simpleReduces)
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
    return (0, rxjs_1.merge)(getStore().pipe(op.map(s => s.version), op.distinctUntilChanged(), op.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
            exports.cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
    })), (0, rxjs_1.from)(getLocale()).pipe(op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
            exports.cliActionDispatcher.updateLocale([lang, country]);
            pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
    })), store_1.processExitAction$.pipe(op.tap(() => exports.cliActionDispatcher._change(s => {
        s.commandByPackage.clear();
        s.commandInfoByName.clear();
    })))).pipe(op.catchError(ex => {
        // eslint-disable-next-line no-console
        console.error(ex);
        return (0, rxjs_1.of)();
    }), op.ignoreElements());
});
function availabeCliExtension() {
}
exports.availabeCliExtension = availabeCliExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUF1QztBQUN2QyxxRkFBcUY7QUFDckYsbURBQXFDO0FBQ3JDLG1GQUFzRjtBQUN0Rix1REFBeUM7QUFDekMsb0NBQTREO0FBbUI1RCxNQUFNLFlBQVksR0FBYTtJQUM3QixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUMzQixpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUM1QixPQUFPLEVBQUUsRUFBRTtJQUNYLGlDQUFpQztDQUNsQyxDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUc7SUFDcEIsYUFBYSxDQUFDLENBQVcsRUFBRSxVQUFrQjtRQUMzQyxDQUFDLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQztJQUN6QixDQUFDO0lBQ0QsWUFBWSxDQUFDLENBQVcsRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLENBQW1CO1FBQ3pELENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLENBQUMsQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFDRCxjQUFjLENBQUMsQ0FBVyxFQUFFLEVBQUMsR0FBRyxFQUFFLEtBQUssRUFBNkM7UUFDbEYsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENB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RUFDRixFQUFFLENBQUMsY0FBYyxFQUFFLENBQ3BCLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLG9CQUFvQjtBQUNwQyxDQUFDO0FBREQsb0RBQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2YgfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGNsaVNsaWNlLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlUmVkdWNlcnN9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L2hlbHBlcic7XG5pbXBvcnQgKiBhcyBwa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBwcm9jZXNzRXhpdEFjdGlvbiQgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge091ckNvbW1hbmRNZXRhZGF0YX0gZnJvbSAnLi90eXBlcyc7XG5leHBvcnQgaW50ZXJmYWNlIENsaVN0YXRlIHtcbiAgLyoqIGtleSBpcyBwYWNrYWdlIG5hbWUsIHZhbHVlIGlzIENvbW1hbmQgbmFtZSBhbmQgYXJncyAqL1xuICBjb21tYW5kQnlQYWNrYWdlOiBNYXA8c3RyaW5nLCBPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWUnXVtdPjtcbiAgY29tbWFuZEluZm9CeU5hbWU6IE1hcDxPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWUnXSwgT3VyQ29tbWFuZE1ldGFkYXRhPjtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBvc0xhbmc/OiBzdHJpbmc7XG4gIG9zQ291bnRyeT86IHN0cmluZztcbiAgLyoqIGtleTogY29tbWFuZCBuYW1lLCB2YWx1ZTogZmlsZSBwYXRoICovXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IE1hcDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpRXh0ZW5zaW9uIHtcbiAgcGtOYW1lOiBzdHJpbmc7XG4gIHBrZ0ZpbGVQYXRoOiBzdHJpbmc7XG4gIGZ1bmNOYW1lPzogc3RyaW5nO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENsaVN0YXRlID0ge1xuICBjb21tYW5kQnlQYWNrYWdlOiBuZXcgTWFwKCksXG4gIGNvbW1hbmRJbmZvQnlOYW1lOiBuZXcgTWFwKCksXG4gIHZlcnNpb246ICcnXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IG5ldyBNYXAoKVxufTtcblxuY29uc3Qgc2ltcGxlUmVkdWNlcyA9IHtcbiAgcGxpbmtVcGdyYWRlZChkOiBDbGlTdGF0ZSwgbmV3VmVyc2lvbjogc3RyaW5nKSB7XG4gICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgfSxcbiAgdXBkYXRlTG9jYWxlKGQ6IENsaVN0YXRlLCBbbGFuZywgY291bnRyeV06IFtzdHJpbmcsIHN0cmluZ10pIHtcbiAgICBkLm9zTGFuZyA9IGxhbmc7XG4gICAgZC5vc0NvdW50cnkgPSBjb3VudHJ5O1xuICB9LFxuICBhZGRDb21tYW5kTWV0YShkOiBDbGlTdGF0ZSwge3BrZywgbWV0YXN9OiB7cGtnOiBzdHJpbmc7IG1ldGFzOiBPdXJDb21tYW5kTWV0YWRhdGFbXX0pIHtcbiAgICBjb25zdCBuYW1lcyA9IG1ldGFzLm1hcChtZXRhID0+IC9eXFxzKj8oXFxTKykvLmV4ZWMobWV0YS5uYW1lKSFbMV0pO1xuICAgIGQuY29tbWFuZEJ5UGFja2FnZS5zZXQocGtnLCBuYW1lcyk7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGQuY29tbWFuZEluZm9CeU5hbWUuc2V0KG5hbWVzW2ldLCBtZXRhc1tpXSk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2VyczogY3JlYXRlUmVkdWNlcnM8Q2xpU3RhdGUsIHR5cGVvZiBzaW1wbGVSZWR1Y2VzPihzaW1wbGVSZWR1Y2VzKVxufSk7XG5cbmV4cG9ydCBjb25zdCBjbGlBY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjbGlTbGljZSk7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuY29uc3QgZ2V0TG9jYWxlOiAoKSA9PiBQcm9taXNlPHN0cmluZz4gPSByZXF1aXJlKCdvcy1sb2NhbGUnKTtcbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcblxuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIC8vIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKGNsaVNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG9wLm1hcChzID0+IHMudmVyc2lvbiksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5tYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdxdWljayEhISEhISEhISEnLCBnZXRTdGF0ZSgpKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT09IGRyY3BQa0pzb24udmVyc2lvbikge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIucGxpbmtVcGdyYWRlZChkcmNwUGtKc29uLnZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgZnJvbShnZXRMb2NhbGUoKSkucGlwZShcbiAgICAgIG9wLm1hcChsb2NhbGUgPT4ge1xuICAgICAgICBjb25zdCBbbGFuZywgY291bnRyeV0gPSBsb2NhbGUuc3BsaXQoL1tfLV0vKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkub3NMYW5nICE9PSBsYW5nIHx8IGdldFN0YXRlKCkub3NDb3VudHJ5ICE9PSBjb3VudHJ5KSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVMb2NhbGUoW2xhbmcsIGNvdW50cnldKTtcbiAgICAgICAgICBwa2dNZ3IuYWN0aW9uRGlzcGF0Y2hlci5zZXRJbkNoaW5hKGNvdW50cnkgPyBjb3VudHJ5LnRvVXBwZXJDYXNlKCkgPT09ICdDTicgOiBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBwcm9jZXNzRXhpdEFjdGlvbiQucGlwZShcbiAgICAgIG9wLnRhcCgoKSA9PiBjbGlBY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgIHMuY29tbWFuZEJ5UGFja2FnZS5jbGVhcigpO1xuICAgICAgICBzLmNvbW1hbmRJbmZvQnlOYW1lLmNsZWFyKCk7XG4gICAgICB9KSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5jYXRjaEVycm9yKGV4ID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmVycm9yKGV4KTtcbiAgICAgIHJldHVybiBvZjxQYXlsb2FkQWN0aW9uPigpO1xuICAgIH0pLFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gYXZhaWxhYmVDbGlFeHRlbnNpb24oKSB7XG59XG5cbiJdfQ==