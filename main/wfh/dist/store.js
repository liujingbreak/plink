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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startLogging = exports.storeSavedAction$ = exports.processExitAction$ = exports.dispatcher = exports.stateFactory = exports.lastSavedState = exports.BEFORE_SAVE_STATE = exports.isStateSyncMsg = exports.action$Of = exports.createReducers = exports.ofPayloadAction = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const operators_1 = require("rxjs/operators");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const redux_toolkit_observable_1 = require("../../packages/redux-toolkit-observable/dist/redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const log4js_1 = __importDefault(require("log4js"));
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const immer_1 = require("immer");
const worker_threads_1 = require("worker_threads");
const chalk_1 = __importDefault(require("chalk"));
const helper_1 = require("../../packages/redux-toolkit-observable/dist/helper");
Object.defineProperty(exports, "createReducers", { enumerable: true, get: function () { return helper_1.createReducers; } });
Object.defineProperty(exports, "action$Of", { enumerable: true, get: function () { return helper_1.action$Of; } });
(0, immer_1.enableMapSet)();
configDefaultLog();
const PROCESS_MSG_TYPE = 'rtk-observable:state';
function isStateSyncMsg(msg) {
    return msg.type === PROCESS_MSG_TYPE;
}
exports.isStateSyncMsg = isStateSyncMsg;
function configDefaultLog() {
    let logPatternPrefix = '';
    if (process.send || !worker_threads_1.isMainThread)
        logPatternPrefix = `[P${process.pid}.T${worker_threads_1.threadId}] `;
    log4js_1.default.configure({
        appenders: {
            out: {
                type: 'stdout',
                layout: { type: 'pattern', pattern: logPatternPrefix + '%[%c%] - %m' }
            }
        },
        categories: {
            default: { appenders: ['out'], level: 'info' }
        }
    });
    /**
     - %r time in toLocaleTimeString format
     - %p log level
     - %c log category
     - %h hostname
     - %m log data
     - %d date, formatted - default is ISO8601, format options are: ISO8601, ISO8601_WITH_TZ_OFFSET, ABSOLUTE, DATE, or any string compatible with the date-format library. e.g. %d{DATE}, %d{yyyy/MM/dd-hh.mm.ss}
     - %% % - for when you want a literal % in your output
     - %n newline
     - %z process id (from process.pid)
     - %f full path of filename (requires enableCallStack: true on the category, see configuration object)
     - %f{depth} path’s depth let you chose to have only filename (%f{1}) or a chosen number of directories
     - %l line number (requires enableCallStack: true on the category, see configuration object)
     - %o column postion (requires enableCallStack: true on the category, see configuration object)
     - %s call stack (requires enableCallStack: true on the category, see configuration object)
     - %x{<tokenname>} add dynamic tokens to your log. Tokens are specified in the tokens parameter.
     - %X{<tokenname>} add values from the Logger context. Tokens are keys into the context values.
     - %[ start a coloured block (colour will be taken from the log level, similar to colouredLayout)
     - %] end a coloured block
     */
}
exports.BEFORE_SAVE_STATE = 'BEFORE_SAVE_STATE';
const IGNORE_SLICE = ['config', 'configView', 'cli', 'analyze', 'storeSetting'];
const IGNORE_ACTION = new Set(['packages/setInChina', 'packages/updatePlinkPackageInfo']);
const ignoreSliceSet = new Set(IGNORE_SLICE);
const stateFile = path_1.default.resolve(JSON.parse(process.env.__plink).distDir, 'plink-state.json');
/**
 * Since Redux-toolkit does not read initial state with any lazy slice that has not defined in root reducer,
 * e.g.
 * "Unexpected keys "clean", "packages" found in preloadedState argument passed to createStore.
 * Expected to find one of the known reducer keys instead: "main". Unexpected keys will be ignored.""
 *
 * I have to export saved state, so that eacy lazy slice can initialize its own slice state by themself
 */
const savedStore = fs_1.default.existsSync(stateFile) ? fs_1.default.readFileSync(stateFile, 'utf8') : null;
if (savedStore && savedStore.length === 0) {
    throw new Error('Emptry store file ' + stateFile + ', delete it and initial new workspaces');
}
// eslint-disable-next-line no-eval
exports.lastSavedState = savedStore ? eval('(' + savedStore + ')') : {};
for (const ignoreSliceName of IGNORE_SLICE) {
    delete exports.lastSavedState[ignoreSliceName];
}
exports.stateFactory = new redux_toolkit_observable_1.StateFactory(exports.lastSavedState);
const defaultLog = log4js_1.default.getLogger('plink.store');
const initialState = {
    actionOnExit: process.env.__plink_save_state === '1' ? 'save' : process.send && worker_threads_1.isMainThread ? 'send' : 'none',
    stateChangeCount: 0
};
process.env.__plink_save_state = '0';
const simpleReducers = {
    changeActionOnExit(s, mode) {
        s.actionOnExit = mode;
    },
    /**
     * Dispatch this action before you explicitly run process.exit(0) to quit, because "beforeExit"
     * won't be triggered prior to process.exit(0)
     */
    processExit(s) { },
    storeSaved(s) { }
};
const storeSettingSlice = exports.stateFactory.newSlice({
    name: 'storeSetting',
    initialState,
    reducers: (0, helper_1.createReducers)(simpleReducers)
});
function getState() {
    return exports.stateFactory.sliceState(storeSettingSlice);
}
exports.dispatcher = exports.stateFactory.bindActionCreators(storeSettingSlice);
exports.stateFactory.addEpic((action$, store$) => rx.merge(exports.stateFactory.sliceStore(storeSettingSlice).pipe(op.map((s) => s.stateChangeCount), op.distinctUntilChanged(), op.filter(count => count === 0), op.tap(() => {
    exports.dispatcher.changeActionOnExit('none');
})), action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(storeSettingSlice.actions.processExit), op.take(1), op.switchMap(async (action) => {
    const log = log4js_1.default.getLogger('plink.store');
    const { actionOnExit } = getState();
    if (actionOnExit === 'save') {
        const store = await exports.stateFactory.rootStoreReady;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        const jsonStr = (0, serialize_javascript_1.default)(mergedState, { space: '  ' });
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(stateFile));
        try {
            const relFile = path_1.default.relative(process.cwd(), stateFile);
            log.info(chalk_1.default.gray(`saving state file ${relFile}`));
            await fs_1.default.promises.writeFile(stateFile, jsonStr);
            log.info(chalk_1.default.gray(`state file ${relFile} saved (${getState().stateChangeCount})`));
        }
        catch (err) {
            log.error(chalk_1.default.gray(`Failed to write state file ${path_1.default.relative(process.cwd(), stateFile)}`), err);
        }
    }
    else if (actionOnExit === 'send' && process.send) {
        const store = await exports.stateFactory.rootStoreReady;
        log.info('send state sync message');
        process.send({
            type: PROCESS_MSG_TYPE,
            data: (0, serialize_javascript_1.default)(store.getState(), { space: '' })
        });
        log.info(chalk_1.default.gray('in a forked child process, skip saving state'));
    }
}), op.tap(() => exports.dispatcher.storeSaved())), exports.stateFactory.actionsToDispatch.pipe((0, operators_1.filter)(action => !action.type.endsWith('/_init') &&
    !IGNORE_ACTION.has(action.type) &&
    !ignoreSliceSet.has(action.type.slice(0, action.type.indexOf('/')))), op.takeUntil(action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(storeSettingSlice.actions.processExit))), (0, operators_1.tap)((action) => {
    exports.dispatcher._change(s => s.stateChangeCount = s.stateChangeCount + 1);
}))).pipe(op.ignoreElements()));
exports.processExitAction$ = (0, helper_1.action$Of)(exports.stateFactory, storeSettingSlice.actions.processExit).pipe(op.take(1));
exports.storeSavedAction$ = (0, helper_1.action$Of)(exports.stateFactory, storeSettingSlice.actions.storeSaved);
function startLogging() {
    // const logState = log4js.getLogger('plink.store.state');
    const logAction = log4js_1.default.getLogger('plink.store.action');
    exports.stateFactory.log$.pipe((0, operators_1.tap)(params => {
        if (params[0] === 'state') {
            // (logState.debug as any)(...params.slice(1));
        }
        else if (params[0] === 'action') {
            logAction.debug(...params.slice(1));
        }
        else
            defaultLog.debug(...params);
    })).subscribe();
}
exports.startLogging = startLogging;
let signaled = false;
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls,
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
process.on('beforeExit', (code) => {
    if (signaled)
        return;
    signaled = true;
    exports.dispatcher.processExit();
});
// TEST async action for Thunk middleware
// stateFactory.store$.subscribe(store => {
//   if (store) {
//     debugger;
//     store.dispatch((async (dispatch: any) => {
//       await new Promise(resolve => setTimeout(resolve, 500));
//       dispatch({type: 'ok'});
//     }) as any);
//   }
// });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix3REFBMkI7QUFDM0IsOENBQTJDO0FBQzNDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0hBQW9IO0FBVzVHLGdHQVhjLDBDQUFlLE9BV2Q7QUFWdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQXNEO0FBRXRELGtEQUEwQjtBQUUxQixnRkFBOEY7QUFHckUsK0ZBSGpCLHVCQUFjLE9BR2lCO0FBQUUsMEZBSGpCLGtCQUFTLE9BR2lCO0FBQ2xELElBQUEsb0JBQVksR0FBRSxDQUFDO0FBQ2YsZ0JBQWdCLEVBQUUsQ0FBQztBQUVuQixNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDO0FBS2hELFNBQWdCLGNBQWMsQ0FBQyxHQUFZO0lBQ3pDLE9BQVEsR0FBMkIsQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLENBQUM7QUFDaEUsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7SUFDMUIsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNkJBQVk7UUFDL0IsZ0JBQWdCLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxLQUFLLHlCQUFRLElBQUksQ0FBQztJQUN2RCxnQkFBTSxDQUFDLFNBQVMsQ0FBQztRQUNmLFNBQVMsRUFBRTtZQUNULEdBQUcsRUFBRTtnQkFDSCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsR0FBRyxhQUFhLEVBQUM7YUFDckU7U0FDRjtRQUNELFVBQVUsRUFBRTtZQUNWLE9BQU8sRUFBRSxFQUFDLFNBQVMsRUFBRSxD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aUJBQWlCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRS9GLFNBQWdCLFlBQVk7SUFFMUIsMERBQTBEO0lBQzFELE1BQU0sU0FBUyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFFekQsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNwQixJQUFBLGVBQUcsRUFBQyxNQUFNLENBQUMsRUFBRTtRQUNYLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRTtZQUN6QiwrQ0FBK0M7U0FDaEQ7YUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7WUFDaEMsU0FBUyxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5Qzs7WUFDRSxVQUFVLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBZkQsb0NBZUM7QUFFRCxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDckI7Ozs7O0dBS0c7QUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO0lBQ2hDLElBQUksUUFBUTtRQUNWLE9BQU87SUFDVCxRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ2hCLGtCQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUM7QUFFSCx5Q0FBeUM7QUFDekMsMkNBQTJDO0FBQzNDLGlCQUFpQjtBQUNqQixnQkFBZ0I7QUFDaEIsaURBQWlEO0FBQ2pELGdFQUFnRTtBQUNoRSxnQ0FBZ0M7QUFDaEMsa0JBQWtCO0FBQ2xCLE1BQU07QUFDTixNQUFNIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge3RhcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7U3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb259IGZyb20gJy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc2VyaWFsaXplIGZyb20gJ3NlcmlhbGl6ZS1qYXZhc2NyaXB0JztcbmltcG9ydCB7ZW5hYmxlTWFwU2V0fSBmcm9tICdpbW1lcic7XG5pbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmltcG9ydCB7Y3JlYXRlUmVkdWNlcnMsIGFjdGlvbiRPZn0gZnJvbSAnLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvaGVscGVyJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9uLCBjcmVhdGVSZWR1Y2VycywgYWN0aW9uJE9mfTtcbmVuYWJsZU1hcFNldCgpO1xuY29uZmlnRGVmYXVsdExvZygpO1xuXG5jb25zdCBQUk9DRVNTX01TR19UWVBFID0gJ3J0ay1vYnNlcnZhYmxlOnN0YXRlJztcbmV4cG9ydCB0eXBlIFByb2Nlc3NTdGF0ZVN5bmNNc2cgPSB7XG4gIHR5cGU6IHR5cGVvZiBQUk9DRVNTX01TR19UWVBFO1xuICBkYXRhOiBzdHJpbmc7XG59O1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RhdGVTeW5jTXNnKG1zZzogdW5rbm93bik6IG1zZyBpcyBQcm9jZXNzU3RhdGVTeW5jTXNnIHtcbiAgcmV0dXJuIChtc2cgYXMgUHJvY2Vzc1N0YXRlU3luY01zZykudHlwZSA9PT0gUFJPQ0VTU19NU0dfVFlQRTtcbn1cblxuZnVuY3Rpb24gY29uZmlnRGVmYXVsdExvZygpIHtcbiAgbGV0IGxvZ1BhdHRlcm5QcmVmaXggPSAnJztcbiAgaWYgKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkKVxuICAgIGxvZ1BhdHRlcm5QcmVmaXggPSBgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dIGA7XG4gIGxvZzRqcy5jb25maWd1cmUoe1xuICAgIGFwcGVuZGVyczoge1xuICAgICAgb3V0OiB7XG4gICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICBsYXlvdXQ6IHt0eXBlOiAncGF0dGVybicsIHBhdHRlcm46IGxvZ1BhdHRlcm5QcmVmaXggKyAnJVslYyVdIC0gJW0nfVxuICAgICAgfVxuICAgIH0sXG4gICAgY2F0ZWdvcmllczoge1xuICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdpbmZvJ31cbiAgICB9XG4gIH0pO1xuICAvKipcbiAgIC0gJXIgdGltZSBpbiB0b0xvY2FsZVRpbWVTdHJpbmcgZm9ybWF0XG4gICAtICVwIGxvZyBsZXZlbFxuICAgLSAlYyBsb2cgY2F0ZWdvcnlcbiAgIC0gJWggaG9zdG5hbWVcbiAgIC0gJW0gbG9nIGRhdGFcbiAgIC0gJWQgZGF0ZSwgZm9ybWF0dGVkIC0gZGVmYXVsdCBpcyBJU084NjAxLCBmb3JtYXQgb3B0aW9ucyBhcmU6IElTTzg2MDEsIElTTzg2MDFfV0lUSF9UWl9PRkZTRVQsIEFCU09MVVRFLCBEQVRFLCBvciBhbnkgc3RyaW5nIGNvbXBhdGlibGUgd2l0aCB0aGUgZGF0ZS1mb3JtYXQgbGlicmFyeS4gZS5nLiAlZHtEQVRFfSwgJWR7eXl5eS9NTS9kZC1oaC5tbS5zc31cbiAgIC0gJSUgJSAtIGZvciB3aGVuIHlvdSB3YW50IGEgbGl0ZXJhbCAlIGluIHlvdXIgb3V0cHV0XG4gICAtICVuIG5ld2xpbmVcbiAgIC0gJXogcHJvY2VzcyBpZCAoZnJvbSBwcm9jZXNzLnBpZClcbiAgIC0gJWYgZnVsbCBwYXRoIG9mIGZpbGVuYW1lIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVme2RlcHRofSBwYXRo4oCZcyBkZXB0aCBsZXQgeW91IGNob3NlIHRvIGhhdmUgb25seSBmaWxlbmFtZSAoJWZ7MX0pIG9yIGEgY2hvc2VuIG51bWJlciBvZiBkaXJlY3Rvcmllc1xuICAgLSAlbCBsaW5lIG51bWJlciAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlbyBjb2x1bW4gcG9zdGlvbiAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlcyBjYWxsIHN0YWNrIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICV4ezx0b2tlbm5hbWU+fSBhZGQgZHluYW1pYyB0b2tlbnMgdG8geW91ciBsb2cuIFRva2VucyBhcmUgc3BlY2lmaWVkIGluIHRoZSB0b2tlbnMgcGFyYW1ldGVyLlxuICAgLSAlWHs8dG9rZW5uYW1lPn0gYWRkIHZhbHVlcyBmcm9tIHRoZSBMb2dnZXIgY29udGV4dC4gVG9rZW5zIGFyZSBrZXlzIGludG8gdGhlIGNvbnRleHQgdmFsdWVzLlxuICAgLSAlWyBzdGFydCBhIGNvbG91cmVkIGJsb2NrIChjb2xvdXIgd2lsbCBiZSB0YWtlbiBmcm9tIHRoZSBsb2cgbGV2ZWwsIHNpbWlsYXIgdG8gY29sb3VyZWRMYXlvdXQpXG4gICAtICVdIGVuZCBhIGNvbG91cmVkIGJsb2NrXG4gICAqL1xufVxuXG5cbmV4cG9ydCBjb25zdCBCRUZPUkVfU0FWRV9TVEFURSA9ICdCRUZPUkVfU0FWRV9TVEFURSc7XG5jb25zdCBJR05PUkVfU0xJQ0UgPSBbJ2NvbmZpZycsICdjb25maWdWaWV3JywgJ2NsaScsICdhbmFseXplJywgJ3N0b3JlU2V0dGluZyddO1xuY29uc3QgSUdOT1JFX0FDVElPTiA9IG5ldyBTZXQoWydwYWNrYWdlcy9zZXRJbkNoaW5hJywgJ3BhY2thZ2VzL3VwZGF0ZVBsaW5rUGFja2FnZUluZm8nXSk7XG5jb25zdCBpZ25vcmVTbGljZVNldCA9IG5ldyBTZXQoSUdOT1JFX1NMSUNFKTtcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKChKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudikuZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKTtcbi8qKlxuICogU2luY2UgUmVkdXgtdG9vbGtpdCBkb2VzIG5vdCByZWFkIGluaXRpYWwgc3RhdGUgd2l0aCBhbnkgbGF6eSBzbGljZSB0aGF0IGhhcyBub3QgZGVmaW5lZCBpbiByb290IHJlZHVjZXIsXG4gKiBlLmcuIFxuICogXCJVbmV4cGVjdGVkIGtleXMgXCJjbGVhblwiLCBcInBhY2thZ2VzXCIgZm91bmQgaW4gcHJlbG9hZGVkU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlLlxuICogRXhwZWN0ZWQgdG8gZmluZCBvbmUgb2YgdGhlIGtub3duIHJlZHVjZXIga2V5cyBpbnN0ZWFkOiBcIm1haW5cIi4gVW5leHBlY3RlZCBrZXlzIHdpbGwgYmUgaWdub3JlZC5cIlwiXG4gKiBcbiAqIEkgaGF2ZSB0byBleHBvcnQgc2F2ZWQgc3RhdGUsIHNvIHRoYXQgZWFjeSBsYXp5IHNsaWNlIGNhbiBpbml0aWFsaXplIGl0cyBvd24gc2xpY2Ugc3RhdGUgYnkgdGhlbXNlbGZcbiAqL1xuY29uc3Qgc2F2ZWRTdG9yZSA9IGZzLmV4aXN0c1N5bmMoc3RhdGVGaWxlKSA/IGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgOiBudWxsO1xuaWYgKHNhdmVkU3RvcmUgJiYgc2F2ZWRTdG9yZS5sZW5ndGggPT09IDApIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdFbXB0cnkgc3RvcmUgZmlsZSAnICsgc3RhdGVGaWxlICsgJywgZGVsZXRlIGl0IGFuZCBpbml0aWFsIG5ldyB3b3Jrc3BhY2VzJyk7XG59XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZXZhbFxuZXhwb3J0IGNvbnN0IGxhc3RTYXZlZFN0YXRlID0gc2F2ZWRTdG9yZSA/IGV2YWwoJygnICsgc2F2ZWRTdG9yZSArICcpJykgOiB7fTtcbmZvciAoY29uc3QgaWdub3JlU2xpY2VOYW1lIG9mIElHTk9SRV9TTElDRSkge1xuICBkZWxldGUgbGFzdFNhdmVkU3RhdGVbaWdub3JlU2xpY2VOYW1lXTtcbn1cblxuZXhwb3J0IGNvbnN0IHN0YXRlRmFjdG9yeSA9IG5ldyBTdGF0ZUZhY3RvcnkobGFzdFNhdmVkU3RhdGUpO1xuY29uc3QgZGVmYXVsdExvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnN0b3JlJyk7XG5cbnR5cGUgU3RvcmVTZXR0aW5nID0ge1xuICBhY3Rpb25PbkV4aXQ6ICdzYXZlJyB8ICdzZW5kJyB8ICdub25lJztcbiAgc3RhdGVDaGFuZ2VDb3VudDogbnVtYmVyO1xufTtcblxuY29uc3QgaW5pdGlhbFN0YXRlOiBTdG9yZVNldHRpbmcgPSB7XG4gIGFjdGlvbk9uRXhpdDogcHJvY2Vzcy5lbnYuX19wbGlua19zYXZlX3N0YXRlID09PSAnMScgPyAnc2F2ZScgOiBwcm9jZXNzLnNlbmQgJiYgaXNNYWluVGhyZWFkID8gJ3NlbmQnIDogJ25vbmUnLFxuICBzdGF0ZUNoYW5nZUNvdW50OiAwXG59O1xucHJvY2Vzcy5lbnYuX19wbGlua19zYXZlX3N0YXRlID0gJzAnO1xuXG5jb25zdCBzaW1wbGVSZWR1Y2VycyA9IHtcbiAgY2hhbmdlQWN0aW9uT25FeGl0KHM6IFN0b3JlU2V0dGluZywgbW9kZTogU3RvcmVTZXR0aW5nWydhY3Rpb25PbkV4aXQnXSkge1xuICAgIHMuYWN0aW9uT25FeGl0ID0gbW9kZTtcbiAgfSxcbiAgLyoqXG4gICAqIERpc3BhdGNoIHRoaXMgYWN0aW9uIGJlZm9yZSB5b3UgZXhwbGljaXRseSBydW4gcHJvY2Vzcy5leGl0KDApIHRvIHF1aXQsIGJlY2F1c2UgXCJiZWZvcmVFeGl0XCJcbiAgICogd29uJ3QgYmUgdHJpZ2dlcmVkIHByaW9yIHRvIHByb2Nlc3MuZXhpdCgwKVxuICAgKi9cbiAgcHJvY2Vzc0V4aXQoczogU3RvcmVTZXR0aW5nKSB7fSxcbiAgc3RvcmVTYXZlZChzOiBTdG9yZVNldHRpbmcpIHt9XG59O1xuXG5jb25zdCBzdG9yZVNldHRpbmdTbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdzdG9yZVNldHRpbmcnLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiBjcmVhdGVSZWR1Y2VyczxTdG9yZVNldHRpbmcsIHR5cGVvZiBzaW1wbGVSZWR1Y2Vycz4oc2ltcGxlUmVkdWNlcnMpXG59KTtcblxuZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzdG9yZVNldHRpbmdTbGljZSk7XG59XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzdG9yZVNldHRpbmdTbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPHR5cGVvZiBzdG9yZVNldHRpbmdTbGljZT4oKGFjdGlvbiQsIHN0b3JlJCkgPT4gcngubWVyZ2UoXG4gIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHN0b3JlU2V0dGluZ1NsaWNlKS5waXBlKFxuICAgIG9wLm1hcCgocykgPT4gcy5zdGF0ZUNoYW5nZUNvdW50KSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoY291bnQgPT4gY291bnQgPT09IDApLFxuICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xuICAgIH0pXG4gICksXG4gIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5wcm9jZXNzRXhpdCksXG4gICAgb3AudGFrZSgxKSxcbiAgICBvcC5zd2l0Y2hNYXAoYXN5bmMgYWN0aW9uID0+IHtcbiAgICAgIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnN0b3JlJyk7XG4gICAgICBjb25zdCB7YWN0aW9uT25FeGl0fSA9IGdldFN0YXRlKCk7XG5cbiAgICAgIGlmIChhY3Rpb25PbkV4aXQgPT09ICdzYXZlJykge1xuICAgICAgICBjb25zdCBzdG9yZSA9IGF3YWl0IHN0YXRlRmFjdG9yeS5yb290U3RvcmVSZWFkeTtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgICAgICBjb25zdCBtZXJnZWRTdGF0ZSA9IE9iamVjdC5hc3NpZ24obGFzdFNhdmVkU3RhdGUsIHN0b3JlLmdldFN0YXRlKCkpO1xuXG4gICAgICAgIGNvbnN0IGpzb25TdHIgPSBzZXJpYWxpemUobWVyZ2VkU3RhdGUsIHtzcGFjZTogJyAgJ30pO1xuICAgICAgICBmc2UubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoc3RhdGVGaWxlKSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgcmVsRmlsZSA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlKTtcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5ncmF5KGBzYXZpbmcgc3RhdGUgZmlsZSAke3JlbEZpbGV9YCkpO1xuICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLndyaXRlRmlsZShzdGF0ZUZpbGUsIGpzb25TdHIpO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoXG4gICAgICAgICAgICBgc3RhdGUgZmlsZSAke3JlbEZpbGV9IHNhdmVkICgke2dldFN0YXRlKCkuc3RhdGVDaGFuZ2VDb3VudH0pYCkpO1xuICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICBsb2cuZXJyb3IoY2hhbGsuZ3JheShgRmFpbGVkIHRvIHdyaXRlIHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSl9YCksIGVycik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoYWN0aW9uT25FeGl0ID09PSAnc2VuZCcgJiYgcHJvY2Vzcy5zZW5kKSB7XG4gICAgICAgIGNvbnN0IHN0b3JlID0gYXdhaXQgc3RhdGVGYWN0b3J5LnJvb3RTdG9yZVJlYWR5O1xuICAgICAgICBsb2cuaW5mbygnc2VuZCBzdGF0ZSBzeW5jIG1lc3NhZ2UnKTtcblxuICAgICAgICBwcm9jZXNzLnNlbmQoe1xuICAgICAgICAgIHR5cGU6IFBST0NFU1NfTVNHX1RZUEUsXG4gICAgICAgICAgZGF0YTogc2VyaWFsaXplKHN0b3JlLmdldFN0YXRlKCksIHtzcGFjZTogJyd9KVxuICAgICAgICB9IGFzIFByb2Nlc3NTdGF0ZVN5bmNNc2cpO1xuXG4gICAgICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoJ2luIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3MsIHNraXAgc2F2aW5nIHN0YXRlJykpO1xuICAgICAgfVxuICAgIH0pLFxuICAgIG9wLnRhcCgoKSA9PiBkaXNwYXRjaGVyLnN0b3JlU2F2ZWQoKSlcbiAgKSxcbiAgc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLnBpcGUoXG4gICAgZmlsdGVyKGFjdGlvbiA9PiAhYWN0aW9uLnR5cGUuZW5kc1dpdGgoJy9faW5pdCcpICYmXG4gICAgICAhSUdOT1JFX0FDVElPTi5oYXMoYWN0aW9uLnR5cGUpICYmXG4gICAgICAhaWdub3JlU2xpY2VTZXQuaGFzKGFjdGlvbi50eXBlLnNsaWNlKDAsIGFjdGlvbi50eXBlLmluZGV4T2YoJy8nKSkpXG4gICAgKSxcbiAgICBvcC50YWtlVW50aWwoYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzdG9yZVNldHRpbmdTbGljZS5hY3Rpb25zLnByb2Nlc3NFeGl0KSkpLFxuICAgIHRhcCgoYWN0aW9uKSA9PiB7XG4gICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnN0YXRlQ2hhbmdlQ291bnQgPSBzLnN0YXRlQ2hhbmdlQ291bnQgKyAxKTtcbiAgICB9KVxuICApXG4pLnBpcGUoXG4gIG9wLmlnbm9yZUVsZW1lbnRzKClcbikpO1xuXG5leHBvcnQgY29uc3QgcHJvY2Vzc0V4aXRBY3Rpb24kID0gYWN0aW9uJE9mKHN0YXRlRmFjdG9yeSwgc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5wcm9jZXNzRXhpdCkucGlwZShvcC50YWtlKDEpKTtcbmV4cG9ydCBjb25zdCBzdG9yZVNhdmVkQWN0aW9uJCA9IGFjdGlvbiRPZihzdGF0ZUZhY3RvcnksIHN0b3JlU2V0dGluZ1NsaWNlLmFjdGlvbnMuc3RvcmVTYXZlZCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydExvZ2dpbmcoKSB7XG5cbiAgLy8gY29uc3QgbG9nU3RhdGUgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZS5zdGF0ZScpO1xuICBjb25zdCBsb2dBY3Rpb24gPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZS5hY3Rpb24nKTtcblxuICBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJykge1xuICAgICAgICAvLyAobG9nU3RhdGUuZGVidWcgYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgfSBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIChsb2dBY3Rpb24uZGVidWcgYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgfSBlbHNlXG4gICAgICAgIChkZWZhdWx0TG9nLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5sZXQgc2lnbmFsZWQgPSBmYWxzZTtcbi8qKlxuICogYSBsaXN0ZW5lciByZWdpc3RlcmVkIG9uIHRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgY2FuIG1ha2UgYXN5bmNocm9ub3VzIGNhbGxzLCBcbiAqIGFuZCB0aGVyZWJ5IGNhdXNlIHRoZSBOb2RlLmpzIHByb2Nlc3MgdG8gY29udGludWUuXG4gKiBUaGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGlzIG5vdCBlbWl0dGVkIGZvciBjb25kaXRpb25zIGNhdXNpbmcgZXhwbGljaXQgdGVybWluYXRpb24sXG4gKiBzdWNoIGFzIGNhbGxpbmcgcHJvY2Vzcy5leGl0KCkgb3IgdW5jYXVnaHQgZXhjZXB0aW9ucy5cbiAqL1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIChjb2RlKSA9PiB7XG4gIGlmIChzaWduYWxlZClcbiAgICByZXR1cm47XG4gIHNpZ25hbGVkID0gdHJ1ZTtcbiAgZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpO1xufSk7XG5cbi8vIFRFU1QgYXN5bmMgYWN0aW9uIGZvciBUaHVuayBtaWRkbGV3YXJlXG4vLyBzdGF0ZUZhY3Rvcnkuc3RvcmUkLnN1YnNjcmliZShzdG9yZSA9PiB7XG4vLyAgIGlmIChzdG9yZSkge1xuLy8gICAgIGRlYnVnZ2VyO1xuLy8gICAgIHN0b3JlLmRpc3BhdGNoKChhc3luYyAoZGlzcGF0Y2g6IGFueSkgPT4ge1xuLy8gICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuLy8gICAgICAgZGlzcGF0Y2goe3R5cGU6ICdvayd9KTtcbi8vICAgICB9KSBhcyBhbnkpO1xuLy8gICB9XG4vLyB9KTtcbiJdfQ==