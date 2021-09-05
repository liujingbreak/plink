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
    })), action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'), op.tap(() => exports.cliActionDispatcher._change(s => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsMEVBQTZFO0FBQzdFLCtCQUF1QztBQUN2QyxxRkFBcUY7QUFDckYsbURBQXFDO0FBQ3JDLHVEQUF5QztBQUN6QyxvQ0FBd0M7QUFtQnhDLE1BQU0sWUFBWSxHQUFhO0lBQzdCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzVCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsaUNBQWlDO0NBQ2xDLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRztJQUNwQixhQUFhLENBQUMsQ0FBVyxFQUFFLFVBQWtCO1FBQzNDLENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO0lBQ3pCLENBQUM7SUFDRCxZQUFZLENBQUMsQ0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBbUI7UUFDekQsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUNELGNBQWMsQ0FBQyxDQUFXLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUE2QztRQUNsRixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxF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QUssQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNsQixPQUFPLElBQUEsU0FBRSxHQUFpQixDQUFDO0lBQzdCLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0Isb0JBQW9CO0FBQ3BDLENBQUM7QUFERCxvREFDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7Y3JlYXRlUmVkdWNlcnN9IGZyb20gJy4uLy4uLy4uL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L2hlbHBlcic7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2YgfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGNsaVNsaWNlLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge091ckNvbW1hbmRNZXRhZGF0YX0gZnJvbSAnLi90eXBlcyc7XG5leHBvcnQgaW50ZXJmYWNlIENsaVN0YXRlIHtcbiAgLyoqIGtleSBpcyBwYWNrYWdlIG5hbWUsIHZhbHVlIGlzIENvbW1hbmQgbmFtZSBhbmQgYXJncyAqL1xuICBjb21tYW5kQnlQYWNrYWdlOiBNYXA8c3RyaW5nLCBPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWUnXVtdPjtcbiAgY29tbWFuZEluZm9CeU5hbWU6IE1hcDxPdXJDb21tYW5kTWV0YWRhdGFbJ25hbWUnXSwgT3VyQ29tbWFuZE1ldGFkYXRhPjtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBvc0xhbmc/OiBzdHJpbmc7XG4gIG9zQ291bnRyeT86IHN0cmluZztcbiAgLyoqIGtleTogY29tbWFuZCBuYW1lLCB2YWx1ZTogZmlsZSBwYXRoICovXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IE1hcDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xpRXh0ZW5zaW9uIHtcbiAgcGtOYW1lOiBzdHJpbmc7XG4gIHBrZ0ZpbGVQYXRoOiBzdHJpbmc7XG4gIGZ1bmNOYW1lPzogc3RyaW5nO1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IENsaVN0YXRlID0ge1xuICBjb21tYW5kQnlQYWNrYWdlOiBuZXcgTWFwKCksXG4gIGNvbW1hbmRJbmZvQnlOYW1lOiBuZXcgTWFwKCksXG4gIHZlcnNpb246ICcnXG4gIC8vIGxvYWRlZEV4dGVuc2lvbkNtZHM6IG5ldyBNYXAoKVxufTtcblxuY29uc3Qgc2ltcGxlUmVkdWNlcyA9IHtcbiAgcGxpbmtVcGdyYWRlZChkOiBDbGlTdGF0ZSwgbmV3VmVyc2lvbjogc3RyaW5nKSB7XG4gICAgZC52ZXJzaW9uID0gbmV3VmVyc2lvbjtcbiAgfSxcbiAgdXBkYXRlTG9jYWxlKGQ6IENsaVN0YXRlLCBbbGFuZywgY291bnRyeV06IFtzdHJpbmcsIHN0cmluZ10pIHtcbiAgICBkLm9zTGFuZyA9IGxhbmc7XG4gICAgZC5vc0NvdW50cnkgPSBjb3VudHJ5O1xuICB9LFxuICBhZGRDb21tYW5kTWV0YShkOiBDbGlTdGF0ZSwge3BrZywgbWV0YXN9OiB7cGtnOiBzdHJpbmc7IG1ldGFzOiBPdXJDb21tYW5kTWV0YWRhdGFbXX0pIHtcbiAgICBjb25zdCBuYW1lcyA9IG1ldGFzLm1hcChtZXRhID0+IC9eXFxzKj8oXFxTKykvLmV4ZWMobWV0YS5uYW1lKSFbMV0pO1xuICAgIGQuY29tbWFuZEJ5UGFja2FnZS5zZXQocGtnLCBuYW1lcyk7XG4gICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuYW1lcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGQuY29tbWFuZEluZm9CeU5hbWUuc2V0KG5hbWVzW2ldLCBtZXRhc1tpXSk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgY29uc3QgY2xpU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnY2xpJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2VyczogY3JlYXRlUmVkdWNlcnM8Q2xpU3RhdGUsIHR5cGVvZiBzaW1wbGVSZWR1Y2VzPihzaW1wbGVSZWR1Y2VzKVxufSk7XG5cbmV4cG9ydCBjb25zdCBjbGlBY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhjbGlTbGljZSk7XG5cblxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShjbGlTbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKGNsaVNsaWNlKTtcbn1cblxuY29uc3QgZ2V0TG9jYWxlOiAoKSA9PiBQcm9taXNlPHN0cmluZz4gPSByZXF1aXJlKCdvcy1sb2NhbGUnKTtcbmNvbnN0IGRyY3BQa0pzb24gPSByZXF1aXJlKCcuLi8uLi8uLi9wYWNrYWdlLmpzb24nKSBhcyB7dmVyc2lvbjogc3RyaW5nfTtcblxuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIC8vIGNvbnN0IGFjdGlvblN0cmVhbXMgPSBjYXN0QnlBY3Rpb25UeXBlKGNsaVNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG9wLm1hcChzID0+IHMudmVyc2lvbiksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBvcC5tYXAodmVyc2lvbiA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCdxdWljayEhISEhISEhISEnLCBnZXRTdGF0ZSgpKTtcbiAgICAgICAgaWYgKHZlcnNpb24gIT09IGRyY3BQa0pzb24udmVyc2lvbikge1xuICAgICAgICAgIGNsaUFjdGlvbkRpc3BhdGNoZXIucGxpbmtVcGdyYWRlZChkcmNwUGtKc29uLnZlcnNpb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgZnJvbShnZXRMb2NhbGUoKSkucGlwZShcbiAgICAgIG9wLm1hcChsb2NhbGUgPT4ge1xuICAgICAgICBjb25zdCBbbGFuZywgY291bnRyeV0gPSBsb2NhbGUuc3BsaXQoL1tfLV0vKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkub3NMYW5nICE9PSBsYW5nIHx8IGdldFN0YXRlKCkub3NDb3VudHJ5ICE9PSBjb3VudHJ5KSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci51cGRhdGVMb2NhbGUoW2xhbmcsIGNvdW50cnldKTtcbiAgICAgICAgICBwa2dNZ3IuYWN0aW9uRGlzcGF0Y2hlci5zZXRJbkNoaW5hKGNvdW50cnkgPyBjb3VudHJ5LnRvVXBwZXJDYXNlKCkgPT09ICdDTicgOiBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24udHlwZSA9PT0gJ0JFRk9SRV9TQVZFX1NUQVRFJyksXG4gICAgICBvcC50YXAoKCkgPT4gY2xpQWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICBzLmNvbW1hbmRCeVBhY2thZ2UuY2xlYXIoKTtcbiAgICAgICAgcy5jb21tYW5kSW5mb0J5TmFtZS5jbGVhcigpO1xuICAgICAgfSkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcihleCA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5lcnJvcihleCk7XG4gICAgICByZXR1cm4gb2Y8UGF5bG9hZEFjdGlvbj4oKTtcbiAgICB9KSxcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGF2YWlsYWJlQ2xpRXh0ZW5zaW9uKCkge1xufVxuXG4iXX0=