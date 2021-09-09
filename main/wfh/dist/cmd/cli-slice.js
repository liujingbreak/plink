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
const helper_1 = require("../../../packages/redux-toolkit-observable/dist/helper");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLXNsaWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1zbGljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUZBQXNGO0FBQ3RGLCtCQUF1QztBQUN2QyxxRkFBcUY7QUFDckYsbURBQXFDO0FBQ3JDLHVEQUF5QztBQUN6QyxvQ0FBNEQ7QUFtQjVELE1BQU0sWUFBWSxHQUFhO0lBQzdCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzVCLE9BQU8sRUFBRSxFQUFFO0lBQ1gsaUNBQWlDO0NBQ2xDLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRztJQUNwQixhQUFhLENBQUMsQ0FBVyxFQUFFLFVBQWtCO1FBQzNDLENBQUMsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO0lBQ3pCLENBQUM7SUFDRCxZQUFZLENBQUMsQ0FBVyxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBbUI7UUFDekQsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7UUFDaEIsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUNELGNBQWMsQ0FBQyxDQUFXLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUE2QztRQUNsRixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxF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LEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FDcEIsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0Isb0JBQW9CO0FBQ3BDLENBQUM7QUFERCxvREFDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7Y3JlYXRlUmVkdWNlcnN9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L2hlbHBlcic7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2YgfSBmcm9tICdyeGpzJztcbi8vIGltcG9ydCB7Y2xpQWN0aW9uRGlzcGF0Y2hlciwgZ2V0U3RvcmUsIGNsaVNsaWNlLCBDbGlFeHRlbnNpb259IGZyb20gJy4vY2xpLXNsaWNlJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHBrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIHByb2Nlc3NFeGl0QWN0aW9uJCB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7T3VyQ29tbWFuZE1ldGFkYXRhfSBmcm9tICcuL3R5cGVzJztcbmV4cG9ydCBpbnRlcmZhY2UgQ2xpU3RhdGUge1xuICAvKioga2V5IGlzIHBhY2thZ2UgbmFtZSwgdmFsdWUgaXMgQ29tbWFuZCBuYW1lIGFuZCBhcmdzICovXG4gIGNvbW1hbmRCeVBhY2thZ2U6IE1hcDxzdHJpbmcsIE91ckNvbW1hbmRNZXRhZGF0YVsnbmFtZSddW10+O1xuICBjb21tYW5kSW5mb0J5TmFtZTogTWFwPE91ckNvbW1hbmRNZXRhZGF0YVsnbmFtZSddLCBPdXJDb21tYW5kTWV0YWRhdGE+O1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG9zTGFuZz86IHN0cmluZztcbiAgb3NDb3VudHJ5Pzogc3RyaW5nO1xuICAvKioga2V5OiBjb21tYW5kIG5hbWUsIHZhbHVlOiBmaWxlIHBhdGggKi9cbiAgLy8gbG9hZGVkRXh0ZW5zaW9uQ21kczogTWFwPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbGlFeHRlbnNpb24ge1xuICBwa05hbWU6IHN0cmluZztcbiAgcGtnRmlsZVBhdGg6IHN0cmluZztcbiAgZnVuY05hbWU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogQ2xpU3RhdGUgPSB7XG4gIGNvbW1hbmRCeVBhY2thZ2U6IG5ldyBNYXAoKSxcbiAgY29tbWFuZEluZm9CeU5hbWU6IG5ldyBNYXAoKSxcbiAgdmVyc2lvbjogJydcbiAgLy8gbG9hZGVkRXh0ZW5zaW9uQ21kczogbmV3IE1hcCgpXG59O1xuXG5jb25zdCBzaW1wbGVSZWR1Y2VzID0ge1xuICBwbGlua1VwZ3JhZGVkKGQ6IENsaVN0YXRlLCBuZXdWZXJzaW9uOiBzdHJpbmcpIHtcbiAgICBkLnZlcnNpb24gPSBuZXdWZXJzaW9uO1xuICB9LFxuICB1cGRhdGVMb2NhbGUoZDogQ2xpU3RhdGUsIFtsYW5nLCBjb3VudHJ5XTogW3N0cmluZywgc3RyaW5nXSkge1xuICAgIGQub3NMYW5nID0gbGFuZztcbiAgICBkLm9zQ291bnRyeSA9IGNvdW50cnk7XG4gIH0sXG4gIGFkZENvbW1hbmRNZXRhKGQ6IENsaVN0YXRlLCB7cGtnLCBtZXRhc306IHtwa2c6IHN0cmluZzsgbWV0YXM6IE91ckNvbW1hbmRNZXRhZGF0YVtdfSkge1xuICAgIGNvbnN0IG5hbWVzID0gbWV0YXMubWFwKG1ldGEgPT4gL15cXHMqPyhcXFMrKS8uZXhlYyhtZXRhLm5hbWUpIVsxXSk7XG4gICAgZC5jb21tYW5kQnlQYWNrYWdlLnNldChwa2csIG5hbWVzKTtcbiAgICBmb3IgKGxldCBpID0gMCwgbCA9IG5hbWVzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgZC5jb21tYW5kSW5mb0J5TmFtZS5zZXQobmFtZXNbaV0sIG1ldGFzW2ldKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydCBjb25zdCBjbGlTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdjbGknLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiBjcmVhdGVSZWR1Y2VyczxDbGlTdGF0ZSwgdHlwZW9mIHNpbXBsZVJlZHVjZXM+KHNpbXBsZVJlZHVjZXMpXG59KTtcblxuZXhwb3J0IGNvbnN0IGNsaUFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKGNsaVNsaWNlKTtcblxuXG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKGNsaVNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoY2xpU2xpY2UpO1xufVxuXG5jb25zdCBnZXRMb2NhbGU6ICgpID0+IFByb21pc2U8c3RyaW5nPiA9IHJlcXVpcmUoJ29zLWxvY2FsZScpO1xuY29uc3QgZHJjcFBrSnNvbiA9IHJlcXVpcmUoJy4uLy4uLy4uL3BhY2thZ2UuanNvbicpIGFzIHt2ZXJzaW9uOiBzdHJpbmd9O1xuXG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgLy8gY29uc3QgYWN0aW9uU3RyZWFtcyA9IGNhc3RCeUFjdGlvblR5cGUoY2xpU2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUob3AubWFwKHMgPT4gcy52ZXJzaW9uKSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG9wLm1hcCh2ZXJzaW9uID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJ3F1aWNrISEhISEhISEhIScsIGdldFN0YXRlKCkpO1xuICAgICAgICBpZiAodmVyc2lvbiAhPT0gZHJjcFBrSnNvbi52ZXJzaW9uKSB7XG4gICAgICAgICAgY2xpQWN0aW9uRGlzcGF0Y2hlci5wbGlua1VwZ3JhZGVkKGRyY3BQa0pzb24udmVyc2lvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBmcm9tKGdldExvY2FsZSgpKS5waXBlKFxuICAgICAgb3AubWFwKGxvY2FsZSA9PiB7XG4gICAgICAgIGNvbnN0IFtsYW5nLCBjb3VudHJ5XSA9IGxvY2FsZS5zcGxpdCgvW18tXS8pO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS5vc0xhbmcgIT09IGxhbmcgfHwgZ2V0U3RhdGUoKS5vc0NvdW50cnkgIT09IGNvdW50cnkpIHtcbiAgICAgICAgICBjbGlBY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZUxvY2FsZShbbGFuZywgY291bnRyeV0pO1xuICAgICAgICAgIHBrZ01nci5hY3Rpb25EaXNwYXRjaGVyLnNldEluQ2hpbmEoY291bnRyeSA/IGNvdW50cnkudG9VcHBlckNhc2UoKSA9PT0gJ0NOJyA6IGZhbHNlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIHByb2Nlc3NFeGl0QWN0aW9uJC5waXBlKFxuICAgICAgb3AudGFwKCgpID0+IGNsaUFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgcy5jb21tYW5kQnlQYWNrYWdlLmNsZWFyKCk7XG4gICAgICAgIHMuY29tbWFuZEluZm9CeU5hbWUuY2xlYXIoKTtcbiAgICAgIH0pKVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoZXggPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUuZXJyb3IoZXgpO1xuICAgICAgcmV0dXJuIG9mPFBheWxvYWRBY3Rpb24+KCk7XG4gICAgfSksXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhdmFpbGFiZUNsaUV4dGVuc2lvbigpIHtcbn1cblxuIl19