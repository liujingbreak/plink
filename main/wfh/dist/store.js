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
exports.processExitAction$ = (0, helper_1.action$Of)(exports.stateFactory, storeSettingSlice.actions.processExit);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQix3REFBMkI7QUFDM0IsOENBQTJDO0FBQzNDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0hBQW9IO0FBVzVHLGdHQVhjLDBDQUFlLE9BV2Q7QUFWdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQXNEO0FBRXRELGtEQUEwQjtBQUUxQixnRkFBOEY7QUFHckUsK0ZBSGpCLHVCQUFjLE9BR2lCO0FBQUUsMEZBSGpCLGtCQUFTLE9BR2lCO0FBQ2xELElBQUEsb0JBQVksR0FBRSxDQUFDO0FBQ2YsZ0JBQWdCLEVBQUUsQ0FBQztBQUVuQixNQUFNLGdCQUFnQixHQUFHLHNCQUFzQixDQUFDO0FBS2hELFNBQWdCLGNBQWMsQ0FBQyxHQUFZO0lBQ3pDLE9BQVEsR0FBMkIsQ0FBQyxJQUFJLEtBQUssZ0JBQWdCLENBQUM7QUFDaEUsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBUyxnQkFBZ0I7SUFDdkIsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7SUFDMUIsSUFBSSxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsNkJBQVk7UUFDL0IsZ0JBQWdCLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxLQUFLLHlCQUFRLElBQUksQ0FBQztJQUN2RCxnQkFBTSxDQUFDLFNBQVMsQ0FBQztRQUNmLFNBQVMsRUFBRTtZQUNULEdBQUcsRUFBRTtnQkFDSCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsR0FBRyxhQUFhLEVBQUM7YUFDckU7U0FDRjtRQUNELFVBQVUsRUFBRTtZQUNWLE9BQU8sRUFBRSxFQUFDLFNBQVMsRUFBRSxD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QUFZO0lBRTFCLDBEQUEwRDtJQUMxRCxNQUFNLFNBQVMsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBRXpELG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDcEIsSUFBQSxlQUFHLEVBQUMsTUFBTSxDQUFDLEVBQUU7UUFDWCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPLEVBQUU7WUFDekIsK0NBQStDO1NBQ2hEO2FBQU0sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFO1lBQ2hDLFNBQVMsQ0FBQyxLQUFhLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDOUM7O1lBQ0UsVUFBVSxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQWZELG9DQWVDO0FBRUQsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ3JCOzs7OztHQUtHO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtJQUNoQyxJQUFJLFFBQVE7UUFDVixPQUFPO0lBQ1QsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNoQixrQkFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDO0FBRUgseUNBQXlDO0FBQ3pDLDJDQUEyQztBQUMzQyxpQkFBaUI7QUFDakIsZ0JBQWdCO0FBQ2hCLGlEQUFpRDtBQUNqRCxnRUFBZ0U7QUFDaEUsZ0NBQWdDO0FBQ2hDLGtCQUFrQjtBQUNsQixNQUFNO0FBQ04sTUFBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHt0YXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdzZXJpYWxpemUtamF2YXNjcmlwdCc7XG5pbXBvcnQge2VuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5pbXBvcnQge2NyZWF0ZVJlZHVjZXJzLCBhY3Rpb24kT2Z9IGZyb20gJy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L2hlbHBlcic7XG4vLyBpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5leHBvcnQge29mUGF5bG9hZEFjdGlvbiwgY3JlYXRlUmVkdWNlcnMsIGFjdGlvbiRPZn07XG5lbmFibGVNYXBTZXQoKTtcbmNvbmZpZ0RlZmF1bHRMb2coKTtcblxuY29uc3QgUFJPQ0VTU19NU0dfVFlQRSA9ICdydGstb2JzZXJ2YWJsZTpzdGF0ZSc7XG5leHBvcnQgdHlwZSBQcm9jZXNzU3RhdGVTeW5jTXNnID0ge1xuICB0eXBlOiB0eXBlb2YgUFJPQ0VTU19NU0dfVFlQRTtcbiAgZGF0YTogc3RyaW5nO1xufTtcbmV4cG9ydCBmdW5jdGlvbiBpc1N0YXRlU3luY01zZyhtc2c6IHVua25vd24pOiBtc2cgaXMgUHJvY2Vzc1N0YXRlU3luY01zZyB7XG4gIHJldHVybiAobXNnIGFzIFByb2Nlc3NTdGF0ZVN5bmNNc2cpLnR5cGUgPT09IFBST0NFU1NfTVNHX1RZUEU7XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ0RlZmF1bHRMb2coKSB7XG4gIGxldCBsb2dQYXR0ZXJuUHJlZml4ID0gJyc7XG4gIGlmIChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZClcbiAgICBsb2dQYXR0ZXJuUHJlZml4ID0gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgO1xuICBsb2c0anMuY29uZmlndXJlKHtcbiAgICBhcHBlbmRlcnM6IHtcbiAgICAgIG91dDoge1xuICAgICAgICB0eXBlOiAnc3Rkb3V0JyxcbiAgICAgICAgbGF5b3V0OiB7dHlwZTogJ3BhdHRlcm4nLCBwYXR0ZXJuOiBsb2dQYXR0ZXJuUHJlZml4ICsgJyVbJWMlXSAtICVtJ31cbiAgICAgIH1cbiAgICB9LFxuICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnaW5mbyd9XG4gICAgfVxuICB9KTtcbiAgLyoqXG4gICAtICVyIHRpbWUgaW4gdG9Mb2NhbGVUaW1lU3RyaW5nIGZvcm1hdFxuICAgLSAlcCBsb2cgbGV2ZWxcbiAgIC0gJWMgbG9nIGNhdGVnb3J5XG4gICAtICVoIGhvc3RuYW1lXG4gICAtICVtIGxvZyBkYXRhXG4gICAtICVkIGRhdGUsIGZvcm1hdHRlZCAtIGRlZmF1bHQgaXMgSVNPODYwMSwgZm9ybWF0IG9wdGlvbnMgYXJlOiBJU084NjAxLCBJU084NjAxX1dJVEhfVFpfT0ZGU0VULCBBQlNPTFVURSwgREFURSwgb3IgYW55IHN0cmluZyBjb21wYXRpYmxlIHdpdGggdGhlIGRhdGUtZm9ybWF0IGxpYnJhcnkuIGUuZy4gJWR7REFURX0sICVke3l5eXkvTU0vZGQtaGgubW0uc3N9XG4gICAtICUlICUgLSBmb3Igd2hlbiB5b3Ugd2FudCBhIGxpdGVyYWwgJSBpbiB5b3VyIG91dHB1dFxuICAgLSAlbiBuZXdsaW5lXG4gICAtICV6IHByb2Nlc3MgaWQgKGZyb20gcHJvY2Vzcy5waWQpXG4gICAtICVmIGZ1bGwgcGF0aCBvZiBmaWxlbmFtZSAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlZntkZXB0aH0gcGF0aOKAmXMgZGVwdGggbGV0IHlvdSBjaG9zZSB0byBoYXZlIG9ubHkgZmlsZW5hbWUgKCVmezF9KSBvciBhIGNob3NlbiBudW1iZXIgb2YgZGlyZWN0b3JpZXNcbiAgIC0gJWwgbGluZSBudW1iZXIgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJW8gY29sdW1uIHBvc3Rpb24gKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJXMgY2FsbCBzdGFjayAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAleHs8dG9rZW5uYW1lPn0gYWRkIGR5bmFtaWMgdG9rZW5zIHRvIHlvdXIgbG9nLiBUb2tlbnMgYXJlIHNwZWNpZmllZCBpbiB0aGUgdG9rZW5zIHBhcmFtZXRlci5cbiAgIC0gJVh7PHRva2VubmFtZT59IGFkZCB2YWx1ZXMgZnJvbSB0aGUgTG9nZ2VyIGNvbnRleHQuIFRva2VucyBhcmUga2V5cyBpbnRvIHRoZSBjb250ZXh0IHZhbHVlcy5cbiAgIC0gJVsgc3RhcnQgYSBjb2xvdXJlZCBibG9jayAoY29sb3VyIHdpbGwgYmUgdGFrZW4gZnJvbSB0aGUgbG9nIGxldmVsLCBzaW1pbGFyIHRvIGNvbG91cmVkTGF5b3V0KVxuICAgLSAlXSBlbmQgYSBjb2xvdXJlZCBibG9ja1xuICAgKi9cbn1cblxuXG5leHBvcnQgY29uc3QgQkVGT1JFX1NBVkVfU1RBVEUgPSAnQkVGT1JFX1NBVkVfU1RBVEUnO1xuY29uc3QgSUdOT1JFX1NMSUNFID0gWydjb25maWcnLCAnY29uZmlnVmlldycsICdjbGknLCAnYW5hbHl6ZScsICdzdG9yZVNldHRpbmcnXTtcbmNvbnN0IElHTk9SRV9BQ1RJT04gPSBuZXcgU2V0KFsncGFja2FnZXMvc2V0SW5DaGluYScsICdwYWNrYWdlcy91cGRhdGVQbGlua1BhY2thZ2VJbmZvJ10pO1xuY29uc3QgaWdub3JlU2xpY2VTZXQgPSBuZXcgU2V0KElHTk9SRV9TTElDRSk7XG5cbmNvbnN0IHN0YXRlRmlsZSA9IFBhdGgucmVzb2x2ZSgoSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnYpLmRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJyk7XG4vKipcbiAqIFNpbmNlIFJlZHV4LXRvb2xraXQgZG9lcyBub3QgcmVhZCBpbml0aWFsIHN0YXRlIHdpdGggYW55IGxhenkgc2xpY2UgdGhhdCBoYXMgbm90IGRlZmluZWQgaW4gcm9vdCByZWR1Y2VyLFxuICogZS5nLiBcbiAqIFwiVW5leHBlY3RlZCBrZXlzIFwiY2xlYW5cIiwgXCJwYWNrYWdlc1wiIGZvdW5kIGluIHByZWxvYWRlZFN0YXRlIGFyZ3VtZW50IHBhc3NlZCB0byBjcmVhdGVTdG9yZS5cbiAqIEV4cGVjdGVkIHRvIGZpbmQgb25lIG9mIHRoZSBrbm93biByZWR1Y2VyIGtleXMgaW5zdGVhZDogXCJtYWluXCIuIFVuZXhwZWN0ZWQga2V5cyB3aWxsIGJlIGlnbm9yZWQuXCJcIlxuICogXG4gKiBJIGhhdmUgdG8gZXhwb3J0IHNhdmVkIHN0YXRlLCBzbyB0aGF0IGVhY3kgbGF6eSBzbGljZSBjYW4gaW5pdGlhbGl6ZSBpdHMgb3duIHNsaWNlIHN0YXRlIGJ5IHRoZW1zZWxmXG4gKi9cbmNvbnN0IHNhdmVkU3RvcmUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBmcy5yZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmOCcpIDogbnVsbDtcbmlmIChzYXZlZFN0b3JlICYmIHNhdmVkU3RvcmUubGVuZ3RoID09PSAwKSB7XG4gIHRocm93IG5ldyBFcnJvcignRW1wdHJ5IHN0b3JlIGZpbGUgJyArIHN0YXRlRmlsZSArICcsIGRlbGV0ZSBpdCBhbmQgaW5pdGlhbCBuZXcgd29ya3NwYWNlcycpO1xufVxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWV2YWxcbmV4cG9ydCBjb25zdCBsYXN0U2F2ZWRTdGF0ZSA9IHNhdmVkU3RvcmUgPyBldmFsKCcoJyArIHNhdmVkU3RvcmUgKyAnKScpIDoge307XG5mb3IgKGNvbnN0IGlnbm9yZVNsaWNlTmFtZSBvZiBJR05PUkVfU0xJQ0UpIHtcbiAgZGVsZXRlIGxhc3RTYXZlZFN0YXRlW2lnbm9yZVNsaWNlTmFtZV07XG59XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcbmNvbnN0IGRlZmF1bHRMb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZScpO1xuXG50eXBlIFN0b3JlU2V0dGluZyA9IHtcbiAgYWN0aW9uT25FeGl0OiAnc2F2ZScgfCAnc2VuZCcgfCAnbm9uZSc7XG4gIHN0YXRlQ2hhbmdlQ291bnQ6IG51bWJlcjtcbn07XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogU3RvcmVTZXR0aW5nID0ge1xuICBhY3Rpb25PbkV4aXQ6IHByb2Nlc3MuZW52Ll9fcGxpbmtfc2F2ZV9zdGF0ZSA9PT0gJzEnID8gJ3NhdmUnIDogcHJvY2Vzcy5zZW5kICYmIGlzTWFpblRocmVhZCA/ICdzZW5kJyA6ICdub25lJyxcbiAgc3RhdGVDaGFuZ2VDb3VudDogMFxufTtcbnByb2Nlc3MuZW52Ll9fcGxpbmtfc2F2ZV9zdGF0ZSA9ICcwJztcblxuY29uc3Qgc2ltcGxlUmVkdWNlcnMgPSB7XG4gIGNoYW5nZUFjdGlvbk9uRXhpdChzOiBTdG9yZVNldHRpbmcsIG1vZGU6IFN0b3JlU2V0dGluZ1snYWN0aW9uT25FeGl0J10pIHtcbiAgICBzLmFjdGlvbk9uRXhpdCA9IG1vZGU7XG4gIH0sXG4gIC8qKlxuICAgKiBEaXNwYXRjaCB0aGlzIGFjdGlvbiBiZWZvcmUgeW91IGV4cGxpY2l0bHkgcnVuIHByb2Nlc3MuZXhpdCgwKSB0byBxdWl0LCBiZWNhdXNlIFwiYmVmb3JlRXhpdFwiXG4gICAqIHdvbid0IGJlIHRyaWdnZXJlZCBwcmlvciB0byBwcm9jZXNzLmV4aXQoMClcbiAgICovXG4gIHByb2Nlc3NFeGl0KHM6IFN0b3JlU2V0dGluZykge30sXG4gIHN0b3JlU2F2ZWQoczogU3RvcmVTZXR0aW5nKSB7fVxufTtcblxuY29uc3Qgc3RvcmVTZXR0aW5nU2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnc3RvcmVTZXR0aW5nJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2VyczogY3JlYXRlUmVkdWNlcnM8U3RvcmVTZXR0aW5nLCB0eXBlb2Ygc2ltcGxlUmVkdWNlcnM+KHNpbXBsZVJlZHVjZXJzKVxufSk7XG5cbmZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc3RvcmVTZXR0aW5nU2xpY2UpO1xufVxuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc3RvcmVTZXR0aW5nU2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzx0eXBlb2Ygc3RvcmVTZXR0aW5nU2xpY2U+KChhY3Rpb24kLCBzdG9yZSQpID0+IHJ4Lm1lcmdlKFxuICBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzdG9yZVNldHRpbmdTbGljZSkucGlwZShcbiAgICBvcC5tYXAoKHMpID0+IHMuc3RhdGVDaGFuZ2VDb3VudCksIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3AuZmlsdGVyKGNvdW50ID0+IGNvdW50ID09PSAwKSxcbiAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgZGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgICB9KVxuICApLFxuICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHN0b3JlU2V0dGluZ1NsaWNlLmFjdGlvbnMucHJvY2Vzc0V4aXQpLFxuICAgIG9wLnRha2UoMSksXG4gICAgb3Auc3dpdGNoTWFwKGFzeW5jIGFjdGlvbiA9PiB7XG4gICAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZScpO1xuICAgICAgY29uc3Qge2FjdGlvbk9uRXhpdH0gPSBnZXRTdGF0ZSgpO1xuXG4gICAgICBpZiAoYWN0aW9uT25FeGl0ID09PSAnc2F2ZScpIHtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICAgICAgY29uc3QgbWVyZ2VkU3RhdGUgPSBPYmplY3QuYXNzaWduKGxhc3RTYXZlZFN0YXRlLCBzdG9yZS5nZXRTdGF0ZSgpKTtcblxuICAgICAgICBjb25zdCBqc29uU3RyID0gc2VyaWFsaXplKG1lcmdlZFN0YXRlLCB7c3BhY2U6ICcgICd9KTtcbiAgICAgICAgZnNlLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHN0YXRlRmlsZSkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHJlbEZpbGUgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSk7XG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuZ3JheShgc2F2aW5nIHN0YXRlIGZpbGUgJHtyZWxGaWxlfWApKTtcbiAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy53cml0ZUZpbGUoc3RhdGVGaWxlLCBqc29uU3RyKTtcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5ncmF5KFxuICAgICAgICAgICAgYHN0YXRlIGZpbGUgJHtyZWxGaWxlfSBzYXZlZCAoJHtnZXRTdGF0ZSgpLnN0YXRlQ2hhbmdlQ291bnR9KWApKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgbG9nLmVycm9yKGNoYWxrLmdyYXkoYEZhaWxlZCB0byB3cml0ZSBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUpfWApLCBlcnIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGFjdGlvbk9uRXhpdCA9PT0gJ3NlbmQnICYmIHByb2Nlc3Muc2VuZCkge1xuICAgICAgICBjb25zdCBzdG9yZSA9IGF3YWl0IHN0YXRlRmFjdG9yeS5yb290U3RvcmVSZWFkeTtcbiAgICAgICAgbG9nLmluZm8oJ3NlbmQgc3RhdGUgc3luYyBtZXNzYWdlJyk7XG5cbiAgICAgICAgcHJvY2Vzcy5zZW5kKHtcbiAgICAgICAgICB0eXBlOiBQUk9DRVNTX01TR19UWVBFLFxuICAgICAgICAgIGRhdGE6IHNlcmlhbGl6ZShzdG9yZS5nZXRTdGF0ZSgpLCB7c3BhY2U6ICcnfSlcbiAgICAgICAgfSBhcyBQcm9jZXNzU3RhdGVTeW5jTXNnKTtcblxuICAgICAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzLCBza2lwIHNhdmluZyBzdGF0ZScpKTtcbiAgICAgIH1cbiAgICB9KSxcbiAgICBvcC50YXAoKCkgPT4gZGlzcGF0Y2hlci5zdG9yZVNhdmVkKCkpXG4gICksXG4gIHN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICAgIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSAmJlxuICAgICAgIUlHTk9SRV9BQ1RJT04uaGFzKGFjdGlvbi50eXBlKSAmJlxuICAgICAgIWlnbm9yZVNsaWNlU2V0LmhhcyhhY3Rpb24udHlwZS5zbGljZSgwLCBhY3Rpb24udHlwZS5pbmRleE9mKCcvJykpKVxuICAgICksXG4gICAgb3AudGFrZVVudGlsKGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5wcm9jZXNzRXhpdCkpKSxcbiAgICB0YXAoKGFjdGlvbikgPT4ge1xuICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5zdGF0ZUNoYW5nZUNvdW50ID0gcy5zdGF0ZUNoYW5nZUNvdW50ICsgMSk7XG4gICAgfSlcbiAgKVxuKS5waXBlKFxuICBvcC5pZ25vcmVFbGVtZW50cygpXG4pKTtcblxuZXhwb3J0IGNvbnN0IHByb2Nlc3NFeGl0QWN0aW9uJCA9IGFjdGlvbiRPZihzdGF0ZUZhY3RvcnksIHN0b3JlU2V0dGluZ1NsaWNlLmFjdGlvbnMucHJvY2Vzc0V4aXQpO1xuZXhwb3J0IGNvbnN0IHN0b3JlU2F2ZWRBY3Rpb24kID0gYWN0aW9uJE9mKHN0YXRlRmFjdG9yeSwgc3RvcmVTZXR0aW5nU2xpY2UuYWN0aW9ucy5zdG9yZVNhdmVkKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0TG9nZ2luZygpIHtcblxuICAvLyBjb25zdCBsb2dTdGF0ZSA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnN0b3JlLnN0YXRlJyk7XG4gIGNvbnN0IGxvZ0FjdGlvbiA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnN0b3JlLmFjdGlvbicpO1xuXG4gIHN0YXRlRmFjdG9yeS5sb2ckLnBpcGUoXG4gICAgdGFwKHBhcmFtcyA9PiB7XG4gICAgICBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKSB7XG4gICAgICAgIC8vIChsb2dTdGF0ZS5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICB9IGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgICAgKGxvZ0FjdGlvbi5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICB9IGVsc2VcbiAgICAgICAgKGRlZmF1bHRMb2cuZGVidWcgYXMgYW55KSguLi5wYXJhbXMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmxldCBzaWduYWxlZCA9IGZhbHNlO1xuLyoqXG4gKiBhIGxpc3RlbmVyIHJlZ2lzdGVyZWQgb24gdGhlICdiZWZvcmVFeGl0JyBldmVudCBjYW4gbWFrZSBhc3luY2hyb25vdXMgY2FsbHMsIFxuICogYW5kIHRoZXJlYnkgY2F1c2UgdGhlIE5vZGUuanMgcHJvY2VzcyB0byBjb250aW51ZS5cbiAqIFRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgaXMgbm90IGVtaXR0ZWQgZm9yIGNvbmRpdGlvbnMgY2F1c2luZyBleHBsaWNpdCB0ZXJtaW5hdGlvbixcbiAqIHN1Y2ggYXMgY2FsbGluZyBwcm9jZXNzLmV4aXQoKSBvciB1bmNhdWdodCBleGNlcHRpb25zLlxuICovXG5wcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKGNvZGUpID0+IHtcbiAgaWYgKHNpZ25hbGVkKVxuICAgIHJldHVybjtcbiAgc2lnbmFsZWQgPSB0cnVlO1xuICBkaXNwYXRjaGVyLnByb2Nlc3NFeGl0KCk7XG59KTtcblxuLy8gVEVTVCBhc3luYyBhY3Rpb24gZm9yIFRodW5rIG1pZGRsZXdhcmVcbi8vIHN0YXRlRmFjdG9yeS5zdG9yZSQuc3Vic2NyaWJlKHN0b3JlID0+IHtcbi8vICAgaWYgKHN0b3JlKSB7XG4vLyAgICAgZGVidWdnZXI7XG4vLyAgICAgc3RvcmUuZGlzcGF0Y2goKGFzeW5jIChkaXNwYXRjaDogYW55KSA9PiB7XG4vLyAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4vLyAgICAgICBkaXNwYXRjaCh7dHlwZTogJ29rJ30pO1xuLy8gICAgIH0pIGFzIGFueSk7XG4vLyAgIH1cbi8vIH0pO1xuIl19