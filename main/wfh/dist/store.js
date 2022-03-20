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
exports.startLogging = exports.storeSavedAction$ = exports.processExitAction$ = exports.dispatcher = exports.stateFactory = exports.lastSavedState = exports.BEFORE_SAVE_STATE = exports.isStateSyncMsg = exports.castByActionType = exports.action$Of = exports.createReducers = exports.ofPayloadAction = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const worker_threads_1 = require("worker_threads");
const fs_extra_1 = __importDefault(require("fs-extra"));
const operators_1 = require("rxjs/operators");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = __importDefault(require("log4js"));
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const immer_1 = require("immer");
const redux_toolkit_observable_1 = require("../../packages/redux-toolkit-observable/dist/redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const helper_1 = require("../../packages/redux-toolkit-observable/dist/helper");
Object.defineProperty(exports, "createReducers", { enumerable: true, get: function () { return helper_1.createReducers; } });
Object.defineProperty(exports, "action$Of", { enumerable: true, get: function () { return helper_1.action$Of; } });
Object.defineProperty(exports, "castByActionType", { enumerable: true, get: function () { return helper_1.castByActionType; } });
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
/**
 * Before actuall using stateFactory, I must execute `stateFactory.configureStore();`,
 * and its better after most of the slices havee been defined
 */
exports.stateFactory = new redux_toolkit_observable_1.StateFactory(exports.lastSavedState);
const defaultLog = log4js_1.default.getLogger('plink.store');
const initialState = {
    actionOnExit: process.send && worker_threads_1.isMainThread ? 'send' : 'none',
    stateChangeCount: 0
};
const simpleReducers = {
    changeActionOnExit(s, mode) {
        s.actionOnExit = mode;
    },
    /**
     * Dispatch this action before you explicitly run process.exit(0) to quit, because "beforeExit"
     * won't be triggered prior to process.exit(0)
     */
    processExit() { },
    storeSaved() { }
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
exports.stateFactory.addEpic((action$) => rx.merge(exports.stateFactory.sliceStore(storeSettingSlice).pipe(op.map((s) => s.stateChangeCount), op.distinctUntilChanged(), op.filter(count => count === 0), op.tap(() => {
    exports.dispatcher.changeActionOnExit('none');
})), action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(storeSettingSlice.actions.processExit), op.take(1), op.switchMap(async () => {
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
    !ignoreSliceSet.has(action.type.slice(0, action.type.indexOf('/')))), op.takeUntil(action$.pipe((0, redux_toolkit_observable_1.ofPayloadAction)(storeSettingSlice.actions.processExit))), (0, operators_1.tap)(() => {
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
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls,
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
process.once('beforeExit', () => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQTBEO0FBQzFELGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsbURBQXNEO0FBQ3RELHdEQUEyQjtBQUMzQiw4Q0FBMkM7QUFDM0MseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxrREFBMEI7QUFDMUIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsb0hBQW9IO0FBSTVHLGdHQUpjLDBDQUFlLE9BSWQ7QUFIdkIsZ0ZBQWdIO0FBR3ZGLCtGQUhqQix1QkFBYyxPQUdpQjtBQUFFLDBGQUhqQixrQkFBUyxPQUdpQjtBQUFFLGlHQUhqQix5QkFBZ0IsT0FHaUI7QUFDcEUsSUFBQSxvQkFBWSxHQUFFLENBQUM7QUFDZixnQkFBZ0IsRUFBRSxDQUFDO0FBRW5CLE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUM7QUFLaEQsU0FBZ0IsY0FBYyxDQUFDLEdBQVk7SUFDekMsT0FBUSxHQUEyQixDQUFDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQztBQUNoRSxDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFTLGdCQUFnQjtJQUN2QixJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztJQUMxQixJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyw2QkFBWTtRQUMvQixnQkFBZ0IsR0FBRyxLQUFLLE9BQU8sQ0FBQyxHQUFHLEtBQUsseUJBQVEsSUFBSSxDQUFDO0lBQ3ZELGdCQUFNLENBQUMsU0FBUyxDQUFDO1FBQ2YsU0FBUyxFQUFFO1lBQ1QsR0FBRyxFQUFFO2dCQUNILElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixHQUFHLGFBQWEsRUFBQzthQUNyRTtTQUNGO1FBQ0QsVUFB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LENBQUM7SUFFekQsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNwQixJQUFBLGVBQUcsRUFBQyxNQUFNLENBQUMsRUFBRTtRQUNYLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRTtZQUN6QiwrQ0FBK0M7U0FDaEQ7YUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7WUFDaEMsU0FBUyxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5Qzs7WUFDRSxVQUFVLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBZkQsb0NBZUM7QUFFRDs7Ozs7R0FLRztBQUNILE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtJQUM5QixrQkFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDO0FBRUgseUNBQXlDO0FBQ3pDLDJDQUEyQztBQUMzQyxpQkFBaUI7QUFDakIsZ0JBQWdCO0FBQ2hCLGlEQUFpRDtBQUNqRCxnRUFBZ0U7QUFDaEUsZ0NBQWdDO0FBQ2hDLGtCQUFrQjtBQUNsQixNQUFNO0FBQ04sTUFBTSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnQgKi9cbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7aXNNYWluVGhyZWFkLCB0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge3RhcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgc2VyaWFsaXplIGZyb20gJ3NlcmlhbGl6ZS1qYXZhc2NyaXB0JztcbmltcG9ydCB7ZW5hYmxlTWFwU2V0fSBmcm9tICdpbW1lcic7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IHtjcmVhdGVSZWR1Y2VycywgYWN0aW9uJE9mLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICcuLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9oZWxwZXInO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuXG5leHBvcnQge29mUGF5bG9hZEFjdGlvbiwgY3JlYXRlUmVkdWNlcnMsIGFjdGlvbiRPZiwgY2FzdEJ5QWN0aW9uVHlwZX07XG5lbmFibGVNYXBTZXQoKTtcbmNvbmZpZ0RlZmF1bHRMb2coKTtcblxuY29uc3QgUFJPQ0VTU19NU0dfVFlQRSA9ICdydGstb2JzZXJ2YWJsZTpzdGF0ZSc7XG5leHBvcnQgdHlwZSBQcm9jZXNzU3RhdGVTeW5jTXNnID0ge1xuICB0eXBlOiB0eXBlb2YgUFJPQ0VTU19NU0dfVFlQRTtcbiAgZGF0YTogc3RyaW5nO1xufTtcbmV4cG9ydCBmdW5jdGlvbiBpc1N0YXRlU3luY01zZyhtc2c6IHVua25vd24pOiBtc2cgaXMgUHJvY2Vzc1N0YXRlU3luY01zZyB7XG4gIHJldHVybiAobXNnIGFzIFByb2Nlc3NTdGF0ZVN5bmNNc2cpLnR5cGUgPT09IFBST0NFU1NfTVNHX1RZUEU7XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ0RlZmF1bHRMb2coKSB7XG4gIGxldCBsb2dQYXR0ZXJuUHJlZml4ID0gJyc7XG4gIGlmIChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZClcbiAgICBsb2dQYXR0ZXJuUHJlZml4ID0gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgO1xuICBsb2c0anMuY29uZmlndXJlKHtcbiAgICBhcHBlbmRlcnM6IHtcbiAgICAgIG91dDoge1xuICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiBsb2dQYXR0ZXJuUHJlZml4ICsgJyVbJWMlXSAtICVtJ31cbiAgICAgIH1cbiAgICB9LFxuICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnaW5mbyd9XG4gICAgfVxuICB9KTtcbiAgLyoqXG4gICAtICVyIHRpbWUgaW4gdG9Mb2NhbGVUaW1lU3RyaW5nIGZvcm1hdFxuICAgLSAlcCBsb2cgbGV2ZWxcbiAgIC0gJWMgbG9nIGNhdGVnb3J5XG4gICAtICVoIGhvc3RuYW1lXG4gICAtICVtIGxvZyBkYXRhXG4gICAtICVkIGRhdGUsIGZvcm1hdHRlZCAtIGRlZmF1bHQgaXMgSVNPODYwMSwgZm9ybWF0IG9wdGlvbnMgYXJlOiBJU084NjAxLCBJU084NjAxX1dJVEhfVFpfT0ZGU0VULCBBQlNPTFVURSwgREFURSwgb3IgYW55IHN0cmluZyBjb21wYXRpYmxlIHdpdGggdGhlIGRhdGUtZm9ybWF0IGxpYnJhcnkuIGUuZy4gJWR7REFURX0sICVke3l5eXkvTU0vZGQtaGgubW0uc3N9XG4gICAtICUlICUgLSBmb3Igd2hlbiB5b3Ugd2FudCBhIGxpdGVyYWwgJSBpbiB5b3VyIG91dHB1dFxuICAgLSAlbiBuZXdsaW5lXG4gICAtICV6IHByb2Nlc3MgaWQgKGZyb20gcHJvY2Vzcy5waWQpXG4gICAtICVmIGZ1bGwgcGF0aCBvZiBmaWxlbmFtZSAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlZntkZXB0aH0gcGF0aOKAmXMgZGVwdGggbGV0IHlvdSBjaG9zZSB0byBoYXZlIG9ubHkgZmlsZW5hbWUgKCVmezF9KSBvciBhIGNob3NlbiBudW1iZXIgb2YgZGlyZWN0b3JpZXNcbiAgIC0gJWwgbGluZSBudW1iZXIgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJW8gY29sdW1uIHBvc3Rpb24gKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJXMgY2FsbCBzdGFjayAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAleHs8dG9rZW5uYW1lPn0gYWRkIGR5bmFtaWMgdG9rZW5zIHRvIHlvdXIgbG9nLiBUb2tlbnMgYXJlIHNwZWNpZmllZCBpbiB0aGUgdG9rZW5zIHBhcmFtZXRlci5cbiAgIC0gJVh7PHRva2VubmFtZT59IGFkZCB2YWx1ZXMgZnJvbSB0aGUgTG9nZ2VyIGNvbnRleHQuIFRva2VucyBhcmUga2V5cyBpbnRvIHRoZSBjb250ZXh0IHZhbHVlcy5cbiAgIC0gJVsgc3RhcnQgYSBjb2xvdXJlZCBibG9jayAoY29sb3VyIHdpbGwgYmUgdGFrZW4gZnJvbSB0aGUgbG9nIGxldmVsLCBzaW1pbGFyIHRvIGNvbG91cmVkTGF5b3V0KVxuICAgLSAlXSBlbmQgYSBjb2xvdXJlZCBibG9ja1xuICAgKi9cbn1cblxuXG5leHBvcnQgY29uc3QgQkVGT1JFX1NBVkVfU1RBVEUgPSAnQkVGT1JFX1NBVkVfU1RBVEUnO1xuY29uc3QgSUdOT1JFX1NMSUNFID0gWydjb25maWcnLCAnY29uZmlnVmlldycsICdjbGknLCAnYW5hbHl6ZScsICdzdG9yZVNldHRpbmcnXTtcbmNvbnN0IElHTk9SRV9BQ1RJT04gPSBuZXcgU2V0KFsncGFja2FnZXMvc2V0SW5DaGluYScsICdwYWNrYWdlcy91cGRhdGVQbGlua1BhY2thZ2VJbmZvJ10pO1xuY29uc3QgaWdub3JlU2xpY2VTZXQgPSBuZXcgU2V0KElHTk9SRV9TTElDRSk7XG5cbmNvbnN0IHN0YXRlRmlsZSA9IFBhdGgucmVzb2x2ZSgoSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnYpLmRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJyk7XG4vKipcbiAqIFNpbmNlIFJlZHV4LXRvb2xraXQgZG9lcyBub3QgcmVhZCBpbml0aWFsIHN0YXRlIHdpdGggYW55IGxhenkgc2xpY2UgdGhhdCBoYXMgbm90IGRlZmluZWQgaW4gcm9vdCByZWR1Y2VyLFxuICogZS5nLiBcbiAqIFwiVW5leHBlY3RlZCBrZXlzIFwiY2xlYW5cIiwgXCJwYWNrYWdlc1wiIGZvdW5kIGluIHByZWxvYWRlZFN0YXRlIGFyZ3VtZW50IHBhc3NlZCB0byBjcmVhdGVTdG9yZS5cbiAqIEV4cGVjdGVkIHRvIGZpbmQgb25lIG9mIHRoZSBrbm93biByZWR1Y2VyIGtleXMgaW5zdGVhZDogXCJtYWluXCIuIFVuZXhwZWN0ZWQga2V5cyB3aWxsIGJlIGlnbm9yZWQuXCJcIlxuICogXG4gKiBJIGhhdmUgdG8gZXhwb3J0IHNhdmVkIHN0YXRlLCBzbyB0aGF0IGVhY3kgbGF6eSBzbGljZSBjYW4gaW5pdGlhbGl6ZSBpdHMgb3duIHNsaWNlIHN0YXRlIGJ5IHRoZW1zZWxmXG4gKi9cbmNvbnN0IHNhdmVkU3RvcmUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBmcy5yZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmOCcpIDogbnVsbDtcbmlmIChzYXZlZFN0b3JlICYmIHNhdmVkU3RvcmUubGVuZ3RoID09PSAwKSB7XG4gIHRocm93IG5ldyBFcnJvcignRW1wdHJ5IHN0b3JlIGZpbGUgJyArIHN0YXRlRmlsZSArICcsIGRlbGV0ZSBpdCBhbmQgaW5pdGlhbCBuZXcgd29ya3NwYWNlcycpO1xufVxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWV2YWxcbmV4cG9ydCBjb25zdCBsYXN0U2F2ZWRTdGF0ZSA9IHNhdmVkU3RvcmUgPyBldmFsKCcoJyArIHNhdmVkU3RvcmUgKyAnKScpIDoge307XG5mb3IgKGNvbnN0IGlnbm9yZVNsaWNlTmFtZSBvZiBJR05PUkVfU0xJQ0UpIHtcbiAgZGVsZXRlIGxhc3RTYXZlZFN0YXRlW2lnbm9yZVNsaWNlTmFtZV07XG59XG5cbi8qKlxuICogQmVmb3JlIGFjdHVhbGwgdXNpbmcgc3RhdGVGYWN0b3J5LCBJIG11c3QgZXhlY3V0ZSBgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7YCxcbiAqIGFuZCBpdHMgYmV0dGVyIGFmdGVyIG1vc3Qgb2YgdGhlIHNsaWNlcyBoYXZlZSBiZWVuIGRlZmluZWRcbiAqL1xuZXhwb3J0IGNvbnN0IHN0YXRlRmFjdG9yeSA9IG5ldyBTdGF0ZUZhY3RvcnkobGFzdFNhdmVkU3RhdGUpO1xuXG5jb25zdCBkZWZhdWx0TG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUnKTtcblxuZXhwb3J0IHR5cGUgU3RvcmVTZXR0aW5nID0ge1xuICBhY3Rpb25PbkV4aXQ6ICdzYXZlJyB8ICdzZW5kJyB8ICdub25lJztcbiAgc3RhdGVDaGFuZ2VDb3VudDogbnVtYmVyO1xufTtcblxuY29uc3QgaW5pdGlhbFN0YXRlOiBTdG9yZVNldHRpbmcgPSB7XG4gIGFjdGlvbk9uRXhpdDogcHJvY2Vzcy5zZW5kICYmIGlzTWFpblRocmVhZCA/ICdzZW5kJyA6ICdub25lJyxcbiAgc3RhdGVDaGFuZ2VDb3VudDogMFxufTtcblxuY29uc3Qgc2ltcGxlUmVkdWNlcnMgPSB7XG4gIGNoYW5nZUFjdGlvbk9uRXhpdChzOiBTdG9yZVNldHRpbmcsIG1vZGU6IFN0b3JlU2V0dGluZ1snYWN0aW9uT25FeGl0J10pIHtcbiAgICBzLmFjdGlvbk9uRXhpdCA9IG1vZGU7XG4gIH0sXG4gIC8qKlxuICAgKiBEaXNwYXRjaCB0aGlzIGFjdGlvbiBiZWZvcmUgeW91IGV4cGxpY2l0bHkgcnVuIHByb2Nlc3MuZXhpdCgwKSB0byBxdWl0LCBiZWNhdXNlIFwiYmVmb3JlRXhpdFwiXG4gICAqIHdvbid0IGJlIHRyaWdnZXJlZCBwcmlvciB0byBwcm9jZXNzLmV4aXQoMClcbiAgICovXG4gIHByb2Nlc3NFeGl0KCkge30sXG4gIHN0b3JlU2F2ZWQoKSB7fVxufTtcblxuY29uc3Qgc3RvcmVTZXR0aW5nU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnc3RvcmVTZXR0aW5nJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2VyczogY3JlYXRlUmVkdWNlcnM8U3RvcmVTZXR0aW5nLCB0eXBlb2Ygc2ltcGxlUmVkdWNlcnM+KHNpbXBsZVJlZHVjZXJzKVxufSk7XG5cbmZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc3RvcmVTZXR0aW5nU2xpY2UpO1xufVxuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc3RvcmVTZXR0aW5nU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx0eXBlb2Ygc3RvcmVTZXR0aW5nU2xpY2U+KChhY3Rpb24kKSA9PiByeC5tZXJnZShcbiAgc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc3RvcmVTZXR0aW5nU2xpY2UpLnBpcGUoXG4gICAgb3AubWFwKChzKSA9PiBzLnN0YXRlQ2hhbmdlQ291bnQpLCBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihjb3VudCA9PiBjb3VudCA9PT0gMCksXG4gICAgb3AudGFwKCgpID0+IHtcbiAgICAgIGRpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdub25lJyk7XG4gICAgfSlcbiAgKSxcbiAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzdG9yZVNldHRpbmdTbGljZS5hY3Rpb25zLnByb2Nlc3NFeGl0KSxcbiAgICBvcC50YWtlKDEpLFxuICAgIG9wLnN3aXRjaE1hcChhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZScpO1xuICAgICAgY29uc3Qge2FjdGlvbk9uRXhpdH0gPSBnZXRTdGF0ZSgpO1xuXG4gICAgICBpZiAoYWN0aW9uT25FeGl0ID09PSAnc2F2ZScpIHtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgICAgY29uc3QgbWVyZ2VkU3RhdGUgPSBPYmplY3QuYXNzaWduKGxhc3RTYXZlZFN0YXRlLCBzdG9yZS5nZXRTdGF0ZSgpKTtcblxuICAgICAgICBjb25zdCBqc29uU3RyID0gc2VyaWFsaXplKG1lcmdlZFN0YXRlLCB7c3BhY2U6ICcgICd9KTtcbiAgICAgICAgZnNlLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHN0YXRlRmlsZSkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlbEZpbGUgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSk7XG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuZ3JheShgc2F2aW5nIHN0YXRlIGZpbGUgJHtyZWxGaWxlfWApKTtcbiAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy53cml0ZUZpbGUoc3RhdGVGaWxlLCBqc29uU3RyKTtcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5ncmF5KFxuICAgICAgICAgICAgYHN0YXRlIGZpbGUgJHtyZWxGaWxlfSBzYXZlZCAoJHtnZXRTdGF0ZSgpLnN0YXRlQ2hhbmdlQ291bnR9KWApKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgbG9nLmVycm9yKGNoYWxrLmdyYXkoYEZhaWxlZCB0byB3cml0ZSBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUpfWApLCBlcnIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbk9uRXhpdCA9PT0gJ3NlbmQnICYmIHByb2Nlc3Muc2VuZCkge1xuICAgICAgICBjb25zdCBzdG9yZSA9IGF3YWl0IHN0YXRlRmFjdG9yeS5yb290U3RvcmVSZWFkeTtcbiAgICAgICAgbG9nLmluZm8oJ3NlbmQgc3RhdGUgc3luYyBtZXNzYWdlJyk7XG5cbiAgICAgICAgcHJvY2Vzcy5zZW5kKHtcbiAgICAgICAgICB0eXBlOiBQUk9DRVNTX01TR19UWVBFLFxuICAgICAgICAgIGRhdGE6IHNlcmlhbGl6ZShzdG9yZS5nZXRTdGF0ZSgpLCB7c3BhY2U6ICcnfSlcbiAgICAgICAgfSBhcyBQcm9jZXNzU3RhdGVTeW5jTXNnKTtcblxuICAgICAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzLCBza2lwIHNhdmluZyBzdGF0ZScpKTtcbiAgICAgIH1cbiAgICB9KSxcbiAgICBvcC50YXAoKCkgPT4gZGlzcGF0Y2hlci5zdG9yZVNhdmVkKCkpXG4gICksXG4gIHN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICAgIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSAmJlxuICAgICAgIUlHTk9SRV9BQ1RJT04uaGFzKGFjdGlvbi50eXBlKSAmJlxuICAgICAgIWlnbm9yZVNsaWNlU2V0LmhhcyhhY3Rpb24udHlwZS5zbGljZSgwLCBhY3Rpb24udHlwZS5pbmRleE9mKCcvJykpKVxuICAgICksXG4gICAgb3AudGFrZVVudGlsKGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5wcm9jZXNzRXhpdCkpKSxcbiAgICB0YXAoKCkgPT4ge1xuICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5zdGF0ZUNoYW5nZUNvdW50ID0gcy5zdGF0ZUNoYW5nZUNvdW50ICsgMSk7XG4gICAgfSlcbiAgKVxuKS5waXBlKFxuICBvcC5pZ25vcmVFbGVtZW50cygpXG4pKTtcblxuZXhwb3J0IGNvbnN0IHByb2Nlc3NFeGl0QWN0aW9uJCA9IGFjdGlvbiRPZihzdGF0ZUZhY3RvcnksIHN0b3JlU2V0dGluZ1NsaWNlLmFjdGlvbnMucHJvY2Vzc0V4aXQpLnBpcGUob3AudGFrZSgxKSk7XG5leHBvcnQgY29uc3Qgc3RvcmVTYXZlZEFjdGlvbiQgPSBhY3Rpb24kT2Yoc3RhdGVGYWN0b3J5LCBzdG9yZVNldHRpbmdTbGljZS5hY3Rpb25zLnN0b3JlU2F2ZWQpO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuXG4gIC8vIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuc3RhdGUnKTtcbiAgY29uc3QgbG9nQWN0aW9uID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpIHtcbiAgICAgICAgLy8gKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJykge1xuICAgICAgICAobG9nQWN0aW9uLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuLyoqXG4gKiBhIGxpc3RlbmVyIHJlZ2lzdGVyZWQgb24gdGhlICdiZWZvcmVFeGl0JyBldmVudCBjYW4gbWFrZSBhc3luY2hyb25vdXMgY2FsbHMsIFxuICogYW5kIHRoZXJlYnkgY2F1c2UgdGhlIE5vZGUuanMgcHJvY2VzcyB0byBjb250aW51ZS5cbiAqIFRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgaXMgbm90IGVtaXR0ZWQgZm9yIGNvbmRpdGlvbnMgY2F1c2luZyBleHBsaWNpdCB0ZXJtaW5hdGlvbixcbiAqIHN1Y2ggYXMgY2FsbGluZyBwcm9jZXNzLmV4aXQoKSBvciB1bmNhdWdodCBleGNlcHRpb25zLlxuICovXG5wcm9jZXNzLm9uY2UoJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gIGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKTtcbn0pO1xuXG4vLyBURVNUIGFzeW5jIGFjdGlvbiBmb3IgVGh1bmsgbWlkZGxld2FyZVxuLy8gc3RhdGVGYWN0b3J5LnN0b3JlJC5zdWJzY3JpYmUoc3RvcmUgPT4ge1xuLy8gICBpZiAoc3RvcmUpIHtcbi8vICAgICBkZWJ1Z2dlcjtcbi8vICAgICBzdG9yZS5kaXNwYXRjaCgoYXN5bmMgKGRpc3BhdGNoOiBhbnkpID0+IHtcbi8vICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbi8vICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnb2snfSk7XG4vLyAgICAgfSkgYXMgYW55KTtcbi8vICAgfVxuLy8gfSk7XG4iXX0=