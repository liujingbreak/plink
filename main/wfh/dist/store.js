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
    else {
        log.info(chalk_1.default.gray('skip saving state'));
    }
    exports.dispatcher.storeSaved();
})), exports.stateFactory.actionsToDispatch.pipe((0, operators_1.filter)(action => !action.type.endsWith('/_init') &&
    !IGNORE_ACTION.has(action.type) &&
    !ignoreSliceSet.has(action.type.slice(0, action.type.indexOf('/')))), 
// op.takeUntil(action$.pipe(ofPayloadAction(storeSettingSlice.actions.processExit))),
(0, operators_1.tap)(() => {
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
// process.once('beforeExit', () => {
// dispatcher.processExit();
// });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMERBQTBEO0FBQzFELGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFDcEIsbURBQXNEO0FBQ3RELHdEQUEyQjtBQUMzQiw4Q0FBMkM7QUFDM0MseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxrREFBMEI7QUFDMUIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsb0hBQW9IO0FBSTVHLGdHQUpjLDBDQUFlLE9BSWQ7QUFIdkIsZ0ZBQWdIO0FBR3ZGLCtGQUhqQix1QkFBYyxPQUdpQjtBQUFFLDBGQUhqQixrQkFBUyxPQUdpQjtBQUFFLGlHQUhqQix5QkFBZ0IsT0FHaUI7QUFDcEUsSUFBQSxvQkFBWSxHQUFFLENBQUM7QUFDZixnQkFBZ0IsRUFBRSxDQUFDO0FBRW5CLE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUM7QUFLaEQsU0FBZ0IsY0FBYyxDQUFDLEdBQVk7SUFDekMsT0FBUSxHQUEyQixDQUFDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQztBQUNoRSxDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFTLGdCQUFnQjtJQUN2QixJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztJQUMxQixJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyw2QkFBWTtRQUMvQixnQkFBZ0IsR0FBRyxLQUFLLE9BQU8sQ0FBQyxHQUFHLEtBQUsseUJBQVEsSUFBSSxDQUFDO0lBQ3ZELGdCQUFNLENBQUMsU0FBUyxDQUFDO1FBQ2YsU0FBUyxFQUFFO1lBQ1QsR0FBRyxFQUFFO2dCQUNILElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixHQUFHLGFBQWEsRUFBQzthQUNyRTtTQUNGO1FBQ0QsVUFB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LGVBQUcsRUFBQyxNQUFNLENBQUMsRUFBRTtRQUNYLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRTtZQUN6QiwrQ0FBK0M7U0FDaEQ7YUFBTSxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7WUFDaEMsU0FBUyxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM5Qzs7WUFDRSxVQUFVLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBZkQsb0NBZUM7QUFFRDs7Ozs7R0FLRztBQUNILHFDQUFxQztBQUNuQyw0QkFBNEI7QUFDOUIsTUFBTTtBQUVOLHlDQUF5QztBQUN6QywyQ0FBMkM7QUFDM0MsaUJBQWlCO0FBQ2pCLGdCQUFnQjtBQUNoQixpREFBaUQ7QUFDakQsZ0VBQWdFO0FBQ2hFLGdDQUFnQztBQUNoQyxrQkFBa0I7QUFDbEIsTUFBTTtBQUNOLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50ICovXG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2lzTWFpblRocmVhZCwgdGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHt0YXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdzZXJpYWxpemUtamF2YXNjcmlwdCc7XG5pbXBvcnQge2VuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCB7Y3JlYXRlUmVkdWNlcnMsIGFjdGlvbiRPZiwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvaGVscGVyJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb24sIGNyZWF0ZVJlZHVjZXJzLCBhY3Rpb24kT2YsIGNhc3RCeUFjdGlvblR5cGV9O1xuZW5hYmxlTWFwU2V0KCk7XG5jb25maWdEZWZhdWx0TG9nKCk7XG5cbmNvbnN0IFBST0NFU1NfTVNHX1RZUEUgPSAncnRrLW9ic2VydmFibGU6c3RhdGUnO1xuZXhwb3J0IHR5cGUgUHJvY2Vzc1N0YXRlU3luY01zZyA9IHtcbiAgdHlwZTogdHlwZW9mIFBST0NFU1NfTVNHX1RZUEU7XG4gIGRhdGE6IHN0cmluZztcbn07XG5leHBvcnQgZnVuY3Rpb24gaXNTdGF0ZVN5bmNNc2cobXNnOiB1bmtub3duKTogbXNnIGlzIFByb2Nlc3NTdGF0ZVN5bmNNc2cge1xuICByZXR1cm4gKG1zZyBhcyBQcm9jZXNzU3RhdGVTeW5jTXNnKS50eXBlID09PSBQUk9DRVNTX01TR19UWVBFO1xufVxuXG5mdW5jdGlvbiBjb25maWdEZWZhdWx0TG9nKCkge1xuICBsZXQgbG9nUGF0dGVyblByZWZpeCA9ICcnO1xuICBpZiAocHJvY2Vzcy5zZW5kIHx8ICFpc01haW5UaHJlYWQpXG4gICAgbG9nUGF0dGVyblByZWZpeCA9IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYDtcbiAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgYXBwZW5kZXJzOiB7XG4gICAgICBvdXQ6IHtcbiAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogbG9nUGF0dGVyblByZWZpeCArICclWyVjJV0gLSAlbSd9XG4gICAgICB9XG4gICAgfSxcbiAgICBjYXRlZ29yaWVzOiB7XG4gICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2luZm8nfVxuICAgIH1cbiAgfSk7XG4gIC8qKlxuICAgLSAlciB0aW1lIGluIHRvTG9jYWxlVGltZVN0cmluZyBmb3JtYXRcbiAgIC0gJXAgbG9nIGxldmVsXG4gICAtICVjIGxvZyBjYXRlZ29yeVxuICAgLSAlaCBob3N0bmFtZVxuICAgLSAlbSBsb2cgZGF0YVxuICAgLSAlZCBkYXRlLCBmb3JtYXR0ZWQgLSBkZWZhdWx0IGlzIElTTzg2MDEsIGZvcm1hdCBvcHRpb25zIGFyZTogSVNPODYwMSwgSVNPODYwMV9XSVRIX1RaX09GRlNFVCwgQUJTT0xVVEUsIERBVEUsIG9yIGFueSBzdHJpbmcgY29tcGF0aWJsZSB3aXRoIHRoZSBkYXRlLWZvcm1hdCBsaWJyYXJ5LiBlLmcuICVke0RBVEV9LCAlZHt5eXl5L01NL2RkLWhoLm1tLnNzfVxuICAgLSAlJSAlIC0gZm9yIHdoZW4geW91IHdhbnQgYSBsaXRlcmFsICUgaW4geW91ciBvdXRwdXRcbiAgIC0gJW4gbmV3bGluZVxuICAgLSAleiBwcm9jZXNzIGlkIChmcm9tIHByb2Nlc3MucGlkKVxuICAgLSAlZiBmdWxsIHBhdGggb2YgZmlsZW5hbWUgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJWZ7ZGVwdGh9IHBhdGjigJlzIGRlcHRoIGxldCB5b3UgY2hvc2UgdG8gaGF2ZSBvbmx5IGZpbGVuYW1lICglZnsxfSkgb3IgYSBjaG9zZW4gbnVtYmVyIG9mIGRpcmVjdG9yaWVzXG4gICAtICVsIGxpbmUgbnVtYmVyIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVvIGNvbHVtbiBwb3N0aW9uIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVzIGNhbGwgc3RhY2sgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJXh7PHRva2VubmFtZT59IGFkZCBkeW5hbWljIHRva2VucyB0byB5b3VyIGxvZy4gVG9rZW5zIGFyZSBzcGVjaWZpZWQgaW4gdGhlIHRva2VucyBwYXJhbWV0ZXIuXG4gICAtICVYezx0b2tlbm5hbWU+fSBhZGQgdmFsdWVzIGZyb20gdGhlIExvZ2dlciBjb250ZXh0LiBUb2tlbnMgYXJlIGtleXMgaW50byB0aGUgY29udGV4dCB2YWx1ZXMuXG4gICAtICVbIHN0YXJ0IGEgY29sb3VyZWQgYmxvY2sgKGNvbG91ciB3aWxsIGJlIHRha2VuIGZyb20gdGhlIGxvZyBsZXZlbCwgc2ltaWxhciB0byBjb2xvdXJlZExheW91dClcbiAgIC0gJV0gZW5kIGEgY29sb3VyZWQgYmxvY2tcbiAgICovXG59XG5cblxuZXhwb3J0IGNvbnN0IEJFRk9SRV9TQVZFX1NUQVRFID0gJ0JFRk9SRV9TQVZFX1NUQVRFJztcbmNvbnN0IElHTk9SRV9TTElDRSA9IFsnY29uZmlnJywgJ2NvbmZpZ1ZpZXcnLCAnY2xpJywgJ2FuYWx5emUnLCAnc3RvcmVTZXR0aW5nJ107XG5jb25zdCBJR05PUkVfQUNUSU9OID0gbmV3IFNldChbJ3BhY2thZ2VzL3NldEluQ2hpbmEnLCAncGFja2FnZXMvdXBkYXRlUGxpbmtQYWNrYWdlSW5mbyddKTtcbmNvbnN0IGlnbm9yZVNsaWNlU2V0ID0gbmV3IFNldChJR05PUkVfU0xJQ0UpO1xuXG5jb25zdCBzdGF0ZUZpbGUgPSBQYXRoLnJlc29sdmUoKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52KS5kaXN0RGlyLCAncGxpbmstc3RhdGUuanNvbicpO1xuLyoqXG4gKiBTaW5jZSBSZWR1eC10b29sa2l0IGRvZXMgbm90IHJlYWQgaW5pdGlhbCBzdGF0ZSB3aXRoIGFueSBsYXp5IHNsaWNlIHRoYXQgaGFzIG5vdCBkZWZpbmVkIGluIHJvb3QgcmVkdWNlcixcbiAqIGUuZy4gXG4gKiBcIlVuZXhwZWN0ZWQga2V5cyBcImNsZWFuXCIsIFwicGFja2FnZXNcIiBmb3VuZCBpbiBwcmVsb2FkZWRTdGF0ZSBhcmd1bWVudCBwYXNzZWQgdG8gY3JlYXRlU3RvcmUuXG4gKiBFeHBlY3RlZCB0byBmaW5kIG9uZSBvZiB0aGUga25vd24gcmVkdWNlciBrZXlzIGluc3RlYWQ6IFwibWFpblwiLiBVbmV4cGVjdGVkIGtleXMgd2lsbCBiZSBpZ25vcmVkLlwiXCJcbiAqIFxuICogSSBoYXZlIHRvIGV4cG9ydCBzYXZlZCBzdGF0ZSwgc28gdGhhdCBlYWN5IGxhenkgc2xpY2UgY2FuIGluaXRpYWxpemUgaXRzIG93biBzbGljZSBzdGF0ZSBieSB0aGVtc2VsZlxuICovXG5jb25zdCBzYXZlZFN0b3JlID0gZnMuZXhpc3RzU3luYyhzdGF0ZUZpbGUpID8gZnMucmVhZEZpbGVTeW5jKHN0YXRlRmlsZSwgJ3V0ZjgnKSA6IG51bGw7XG5pZiAoc2F2ZWRTdG9yZSAmJiBzYXZlZFN0b3JlLmxlbmd0aCA9PT0gMCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ0VtcHRyeSBzdG9yZSBmaWxlICcgKyBzdGF0ZUZpbGUgKyAnLCBkZWxldGUgaXQgYW5kIGluaXRpYWwgbmV3IHdvcmtzcGFjZXMnKTtcbn1cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBzYXZlZFN0b3JlID8gZXZhbCgnKCcgKyBzYXZlZFN0b3JlICsgJyknKSA6IHt9O1xuZm9yIChjb25zdCBpZ25vcmVTbGljZU5hbWUgb2YgSUdOT1JFX1NMSUNFKSB7XG4gIGRlbGV0ZSBsYXN0U2F2ZWRTdGF0ZVtpZ25vcmVTbGljZU5hbWVdO1xufVxuXG4vKipcbiAqIEJlZm9yZSBhY3R1YWxsIHVzaW5nIHN0YXRlRmFjdG9yeSwgSSBtdXN0IGV4ZWN1dGUgYHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO2AsXG4gKiBhbmQgaXRzIGJldHRlciBhZnRlciBtb3N0IG9mIHRoZSBzbGljZXMgaGF2ZWUgYmVlbiBkZWZpbmVkXG4gKi9cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcblxuY29uc3QgZGVmYXVsdExvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnN0b3JlJyk7XG5cbmV4cG9ydCB0eXBlIFN0b3JlU2V0dGluZyA9IHtcbiAgYWN0aW9uT25FeGl0OiAnc2F2ZScgfCAnc2VuZCcgfCAnbm9uZSc7XG4gIHN0YXRlQ2hhbmdlQ291bnQ6IG51bWJlcjtcbn07XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogU3RvcmVTZXR0aW5nID0ge1xuICBhY3Rpb25PbkV4aXQ6IHByb2Nlc3Muc2VuZCAmJiBpc01haW5UaHJlYWQgPyAnc2VuZCcgOiAnbm9uZScsXG4gIHN0YXRlQ2hhbmdlQ291bnQ6IDBcbn07XG5cbmNvbnN0IHNpbXBsZVJlZHVjZXJzID0ge1xuICBjaGFuZ2VBY3Rpb25PbkV4aXQoczogU3RvcmVTZXR0aW5nLCBtb2RlOiBTdG9yZVNldHRpbmdbJ2FjdGlvbk9uRXhpdCddKSB7XG4gICAgcy5hY3Rpb25PbkV4aXQgPSBtb2RlO1xuICB9LFxuICAvKipcbiAgICogRGlzcGF0Y2ggdGhpcyBhY3Rpb24gYmVmb3JlIHlvdSBleHBsaWNpdGx5IHJ1biBwcm9jZXNzLmV4aXQoMCkgdG8gcXVpdCwgYmVjYXVzZSBcImJlZm9yZUV4aXRcIlxuICAgKiB3b24ndCBiZSB0cmlnZ2VyZWQgcHJpb3IgdG8gcHJvY2Vzcy5leGl0KDApXG4gICAqL1xuICBwcm9jZXNzRXhpdCgpIHt9LFxuICBzdG9yZVNhdmVkKCkge31cbn07XG5cbmNvbnN0IHN0b3JlU2V0dGluZ1NsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ3N0b3JlU2V0dGluZycsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IGNyZWF0ZVJlZHVjZXJzPFN0b3JlU2V0dGluZywgdHlwZW9mIHNpbXBsZVJlZHVjZXJzPihzaW1wbGVSZWR1Y2Vycylcbn0pO1xuXG5mdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHN0b3JlU2V0dGluZ1NsaWNlKTtcbn1cblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHN0b3JlU2V0dGluZ1NsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8dHlwZW9mIHN0b3JlU2V0dGluZ1NsaWNlPigoYWN0aW9uJCkgPT4gcngubWVyZ2UoXG4gIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHN0b3JlU2V0dGluZ1NsaWNlKS5waXBlKFxuICAgIG9wLm1hcCgocykgPT4gcy5zdGF0ZUNoYW5nZUNvdW50KSwgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoY291bnQgPT4gY291bnQgPT09IDApLFxuICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xuICAgIH0pXG4gICksXG4gIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5wcm9jZXNzRXhpdCksXG4gICAgb3AudGFrZSgxKSxcbiAgICBvcC5zd2l0Y2hNYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUnKTtcbiAgICAgIGNvbnN0IHthY3Rpb25PbkV4aXR9ID0gZ2V0U3RhdGUoKTtcblxuICAgICAgaWYgKGFjdGlvbk9uRXhpdCA9PT0gJ3NhdmUnKSB7XG4gICAgICAgIGNvbnN0IHN0b3JlID0gYXdhaXQgc3RhdGVGYWN0b3J5LnJvb3RTdG9yZVJlYWR5O1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgICAgIGNvbnN0IG1lcmdlZFN0YXRlID0gT2JqZWN0LmFzc2lnbihsYXN0U2F2ZWRTdGF0ZSwgc3RvcmUuZ2V0U3RhdGUoKSk7XG5cbiAgICAgICAgY29uc3QganNvblN0ciA9IHNlcmlhbGl6ZShtZXJnZWRTdGF0ZSwge3NwYWNlOiAnICAnfSk7XG4gICAgICAgIGZzZS5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShzdGF0ZUZpbGUpKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCByZWxGaWxlID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUpO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoYHNhdmluZyBzdGF0ZSBmaWxlICR7cmVsRmlsZX1gKSk7XG4gICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKHN0YXRlRmlsZSwganNvblN0cik7XG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuZ3JheShcbiAgICAgICAgICAgIGBzdGF0ZSBmaWxlICR7cmVsRmlsZX0gc2F2ZWQgKCR7Z2V0U3RhdGUoKS5zdGF0ZUNoYW5nZUNvdW50fSlgKSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgIGxvZy5lcnJvcihjaGFsay5ncmF5KGBGYWlsZWQgdG8gd3JpdGUgc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlKX1gKSwgZXJyKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChhY3Rpb25PbkV4aXQgPT09ICdzZW5kJyAmJiBwcm9jZXNzLnNlbmQpIHtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gICAgICAgIGxvZy5pbmZvKCdzZW5kIHN0YXRlIHN5bmMgbWVzc2FnZScpO1xuXG4gICAgICAgIHByb2Nlc3Muc2VuZCh7XG4gICAgICAgICAgdHlwZTogUFJPQ0VTU19NU0dfVFlQRSxcbiAgICAgICAgICBkYXRhOiBzZXJpYWxpemUoc3RvcmUuZ2V0U3RhdGUoKSwge3NwYWNlOiAnJ30pXG4gICAgICAgIH0gYXMgUHJvY2Vzc1N0YXRlU3luY01zZyk7XG5cbiAgICAgICAgbG9nLmluZm8oY2hhbGsuZ3JheSgnaW4gYSBmb3JrZWQgY2hpbGQgcHJvY2Vzcywgc2tpcCBzYXZpbmcgc3RhdGUnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdza2lwIHNhdmluZyBzdGF0ZScpKTtcbiAgICAgIH1cbiAgICAgIGRpc3BhdGNoZXIuc3RvcmVTYXZlZCgpO1xuICAgIH0pXG4gICksXG4gIHN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICAgIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSAmJlxuICAgICAgIUlHTk9SRV9BQ1RJT04uaGFzKGFjdGlvbi50eXBlKSAmJlxuICAgICAgIWlnbm9yZVNsaWNlU2V0LmhhcyhhY3Rpb24udHlwZS5zbGljZSgwLCBhY3Rpb24udHlwZS5pbmRleE9mKCcvJykpKVxuICAgICksXG4gICAgLy8gb3AudGFrZVVudGlsKGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5wcm9jZXNzRXhpdCkpKSxcbiAgICB0YXAoKCkgPT4ge1xuICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5zdGF0ZUNoYW5nZUNvdW50ID0gcy5zdGF0ZUNoYW5nZUNvdW50ICsgMSk7XG4gICAgfSlcbiAgKVxuKS5waXBlKFxuICBvcC5pZ25vcmVFbGVtZW50cygpXG4pKTtcblxuZXhwb3J0IGNvbnN0IHByb2Nlc3NFeGl0QWN0aW9uJCA9IGFjdGlvbiRPZihzdGF0ZUZhY3RvcnksIHN0b3JlU2V0dGluZ1NsaWNlLmFjdGlvbnMucHJvY2Vzc0V4aXQpLnBpcGUob3AudGFrZSgxKSk7XG5leHBvcnQgY29uc3Qgc3RvcmVTYXZlZEFjdGlvbiQgPSBhY3Rpb24kT2Yoc3RhdGVGYWN0b3J5LCBzdG9yZVNldHRpbmdTbGljZS5hY3Rpb25zLnN0b3JlU2F2ZWQpO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuXG4gIC8vIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuc3RhdGUnKTtcbiAgY29uc3QgbG9nQWN0aW9uID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpIHtcbiAgICAgICAgLy8gKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJykge1xuICAgICAgICAobG9nQWN0aW9uLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuLyoqXG4gKiBhIGxpc3RlbmVyIHJlZ2lzdGVyZWQgb24gdGhlICdiZWZvcmVFeGl0JyBldmVudCBjYW4gbWFrZSBhc3luY2hyb25vdXMgY2FsbHMsIFxuICogYW5kIHRoZXJlYnkgY2F1c2UgdGhlIE5vZGUuanMgcHJvY2VzcyB0byBjb250aW51ZS5cbiAqIFRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgaXMgbm90IGVtaXR0ZWQgZm9yIGNvbmRpdGlvbnMgY2F1c2luZyBleHBsaWNpdCB0ZXJtaW5hdGlvbixcbiAqIHN1Y2ggYXMgY2FsbGluZyBwcm9jZXNzLmV4aXQoKSBvciB1bmNhdWdodCBleGNlcHRpb25zLlxuICovXG4vLyBwcm9jZXNzLm9uY2UoJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gIC8vIGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKTtcbi8vIH0pO1xuXG4vLyBURVNUIGFzeW5jIGFjdGlvbiBmb3IgVGh1bmsgbWlkZGxld2FyZVxuLy8gc3RhdGVGYWN0b3J5LnN0b3JlJC5zdWJzY3JpYmUoc3RvcmUgPT4ge1xuLy8gICBpZiAoc3RvcmUpIHtcbi8vICAgICBkZWJ1Z2dlcjtcbi8vICAgICBzdG9yZS5kaXNwYXRjaCgoYXN5bmMgKGRpc3BhdGNoOiBhbnkpID0+IHtcbi8vICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbi8vICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnb2snfSk7XG4vLyAgICAgfSkgYXMgYW55KTtcbi8vICAgfVxuLy8gfSk7XG4iXX0=