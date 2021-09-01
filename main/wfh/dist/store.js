"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveState = exports.startLogging = exports.stateFactory = exports.lastSavedState = exports.BEFORE_SAVE_STATE = exports.isStateSyncMsg = exports.setSyncStateToMainProcess = exports.ofPayloadAction = exports.createReducers = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const operators_1 = require("rxjs/operators");
const redux_toolkit_observable_1 = require("../../redux-toolkit-observable/dist/redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const log4js_1 = __importDefault(require("log4js"));
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const immer_1 = require("immer");
const worker_threads_1 = require("worker_threads");
const chalk_1 = __importDefault(require("chalk"));
var helper_1 = require("../../redux-toolkit-observable/dist/helper");
Object.defineProperty(exports, "createReducers", { enumerable: true, get: function () { return helper_1.createReducers; } });
immer_1.enableMapSet();
configDefaultLog();
let syncStateToMainProcess = false;
function setSyncStateToMainProcess(enabled) {
    syncStateToMainProcess = enabled;
}
exports.setSyncStateToMainProcess = setSyncStateToMainProcess;
const PROCESS_MSG_TYPE = 'rtk-observable:state';
function isStateSyncMsg(msg) {
    return msg.type === PROCESS_MSG_TYPE;
}
exports.isStateSyncMsg = isStateSyncMsg;
function configDefaultLog() {
    let logPatternPrefix = '';
    if (process.send)
        logPatternPrefix = 'pid:%z ';
    else if (!worker_threads_1.isMainThread)
        logPatternPrefix = '[thread]';
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
const IGNORE_SLICE = ['config', 'configView', 'cli'];
const IGNORE_ACTION = new Set(['packages/setInChina', 'packages/updatePlinkPackageInfo']);
const ignoreSliceSet = new Set(IGNORE_SLICE);
const stateFile = path_1.default.resolve(JSON.parse(process.env.__plink).distDir, 'plink-state.json');
let stateChangeCount = 0;
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
exports.stateFactory.actionsToDispatch.pipe(operators_1.filter(action => !action.type.endsWith('/_init') &&
    !IGNORE_ACTION.has(action.type) &&
    !ignoreSliceSet.has(action.type.slice(0, action.type.indexOf('/')))), operators_1.takeWhile(action => action.type !== exports.BEFORE_SAVE_STATE), operators_1.tap((action) => {
    stateChangeCount++;
})).subscribe();
function startLogging() {
    // const logState = log4js.getLogger('plink.store.state');
    const logAction = log4js_1.default.getLogger('plink.store.action');
    exports.stateFactory.log$.pipe(operators_1.tap(params => {
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
let saved = false;
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls,
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
process.on('beforeExit', (code) => {
    if (saved)
        return;
    exports.stateFactory.dispatch({ type: 'BEFORE_SAVE_STATE', payload: null });
    process.nextTick(() => saveState());
});
/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
function saveState() {
    return __awaiter(this, void 0, void 0, function* () {
        const log = log4js_1.default.getLogger('plink.store');
        saved = true;
        if (stateChangeCount === 0) {
            // eslint-disable-next-line no-console
            log.info(chalk_1.default.gray('state is not changed'));
            return;
        }
        if (!worker_threads_1.isMainThread) {
            // eslint-disable-next-line no-console
            log.info(chalk_1.default.gray('not in main thread, skip saving state'));
            return;
        }
        if (process.send) {
            if (syncStateToMainProcess) {
                const store = yield exports.stateFactory.rootStoreReady;
                log.info('send state sync message');
                process.send({
                    type: 'rtk-observable:state',
                    data: serialize_javascript_1.default(store.getState(), { space: '' })
                });
            }
            // eslint-disable-next-line no-console
            log.info(chalk_1.default.gray('in a forked process, skip saving state'));
            return;
        }
        const store = yield exports.stateFactory.rootStoreReady;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        const jsonStr = serialize_javascript_1.default(mergedState, { space: '  ' });
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(stateFile));
        try {
            yield fs_1.default.promises.writeFile(stateFile, jsonStr);
            // eslint-disable-next-line no-console
            log.info(chalk_1.default.gray(`state file ${path_1.default.relative(process.cwd(), stateFile)} saved (${stateChangeCount})`));
        }
        catch (err) {
            // eslint-disable-next-line no-console
            log.error(chalk_1.default.gray(`Failed to write state file ${path_1.default.relative(process.cwd(), stateFile)}`), err);
        }
    });
}
exports.saveState = saveState;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUMzQiw4Q0FBc0Q7QUFDdEQsMkdBQTJHO0FBVW5HLGdHQVZjLDBDQUFlLE9BVWQ7QUFUdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQTRDO0FBRTVDLGtEQUEwQjtBQUMxQixxRUFBMEU7QUFBbEUsd0dBQUEsY0FBYyxPQUFBO0FBS3RCLG9CQUFZLEVBQUUsQ0FBQztBQUVmLGdCQUFnQixFQUFFLENBQUM7QUFFbkIsSUFBSSxzQkFBc0IsR0FBRyxLQUFLLENBQUM7QUFFbkMsU0FBZ0IseUJBQXlCLENBQUMsT0FBZ0I7SUFDeEQsc0JBQXNCLEdBQUcsT0FBTyxDQUFDO0FBQ25DLENBQUM7QUFGRCw4REFFQztBQUVELE1BQU0sZ0JBQWdCLEdBQUcsc0JBQXNCLENBQUM7QUFLaEQsU0FBZ0IsY0FBYyxDQUFDLEdBQVk7SUFDekMsT0FBUSxHQUEyQixDQUFDLElBQUksS0FBSyxnQkFBZ0IsQ0FBQztBQUNoRSxDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFTLGdCQUFnQjtJQUN2QixJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztJQUMxQixJQUFJLE9BQU8sQ0FBQyxJQUFJO1FBQ2QsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO1NBQzFCLElBQUksQ0FBQyw2QkFBWTtRQUNwQixnQkFBZ0IsR0FBRyxVQUFVLENBQUM7SUFDaEMsZ0JBQU0sQ0FBQyxTQUFTLENBQUM7UUFDZixTQUFTLEVBQUU7WUFDVCxHQUFHLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEdBQUcsYUFBYSxFQUFDO2FBQ3JFO1NBQ0Y7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c0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3JHO0lBQ0gsQ0FBQztDQUFBO0FBMUNELDhCQTBDQztBQUVELHlDQUF5QztBQUN6QywyQ0FBMkM7QUFDM0MsaUJBQWlCO0FBQ2pCLGdCQUFnQjtBQUNoQixpREFBaUQ7QUFDakQsZ0VBQWdFO0FBQ2hFLGdDQUFnQztBQUNoQyxrQkFBa0I7QUFDbEIsTUFBTTtBQUNOLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7dGFwLCBmaWx0ZXIsIHRha2VXaGlsZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnc2VyaWFsaXplLWphdmFzY3JpcHQnO1xuaW1wb3J0IHtlbmFibGVNYXBTZXR9IGZyb20gJ2ltbWVyJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuZXhwb3J0IHtjcmVhdGVSZWR1Y2Vyc30gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvaGVscGVyJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9ufTtcblxuZW5hYmxlTWFwU2V0KCk7XG5cbmNvbmZpZ0RlZmF1bHRMb2coKTtcblxubGV0IHN5bmNTdGF0ZVRvTWFpblByb2Nlc3MgPSBmYWxzZTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldFN5bmNTdGF0ZVRvTWFpblByb2Nlc3MoZW5hYmxlZDogYm9vbGVhbikge1xuICBzeW5jU3RhdGVUb01haW5Qcm9jZXNzID0gZW5hYmxlZDtcbn1cblxuY29uc3QgUFJPQ0VTU19NU0dfVFlQRSA9ICdydGstb2JzZXJ2YWJsZTpzdGF0ZSc7XG5leHBvcnQgdHlwZSBQcm9jZXNzU3RhdGVTeW5jTXNnID0ge1xuICB0eXBlOiB0eXBlb2YgUFJPQ0VTU19NU0dfVFlQRTtcbiAgZGF0YTogc3RyaW5nO1xufTtcbmV4cG9ydCBmdW5jdGlvbiBpc1N0YXRlU3luY01zZyhtc2c6IHVua25vd24pOiBtc2cgaXMgUHJvY2Vzc1N0YXRlU3luY01zZyB7XG4gIHJldHVybiAobXNnIGFzIFByb2Nlc3NTdGF0ZVN5bmNNc2cpLnR5cGUgPT09IFBST0NFU1NfTVNHX1RZUEU7XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ0RlZmF1bHRMb2coKSB7XG4gIGxldCBsb2dQYXR0ZXJuUHJlZml4ID0gJyc7XG4gIGlmIChwcm9jZXNzLnNlbmQpXG4gICAgbG9nUGF0dGVyblByZWZpeCA9ICdwaWQ6JXogJztcbiAgZWxzZSBpZiAoIWlzTWFpblRocmVhZClcbiAgICBsb2dQYXR0ZXJuUHJlZml4ID0gJ1t0aHJlYWRdJztcbiAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgYXBwZW5kZXJzOiB7XG4gICAgICBvdXQ6IHtcbiAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogbG9nUGF0dGVyblByZWZpeCArICclWyVjJV0gLSAlbSd9XG4gICAgICB9XG4gICAgfSxcbiAgICBjYXRlZ29yaWVzOiB7XG4gICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2luZm8nfVxuICAgIH1cbiAgfSk7XG4gIC8qKlxuICAgLSAlciB0aW1lIGluIHRvTG9jYWxlVGltZVN0cmluZyBmb3JtYXRcbiAgIC0gJXAgbG9nIGxldmVsXG4gICAtICVjIGxvZyBjYXRlZ29yeVxuICAgLSAlaCBob3N0bmFtZVxuICAgLSAlbSBsb2cgZGF0YVxuICAgLSAlZCBkYXRlLCBmb3JtYXR0ZWQgLSBkZWZhdWx0IGlzIElTTzg2MDEsIGZvcm1hdCBvcHRpb25zIGFyZTogSVNPODYwMSwgSVNPODYwMV9XSVRIX1RaX09GRlNFVCwgQUJTT0xVVEUsIERBVEUsIG9yIGFueSBzdHJpbmcgY29tcGF0aWJsZSB3aXRoIHRoZSBkYXRlLWZvcm1hdCBsaWJyYXJ5LiBlLmcuICVke0RBVEV9LCAlZHt5eXl5L01NL2RkLWhoLm1tLnNzfVxuICAgLSAlJSAlIC0gZm9yIHdoZW4geW91IHdhbnQgYSBsaXRlcmFsICUgaW4geW91ciBvdXRwdXRcbiAgIC0gJW4gbmV3bGluZVxuICAgLSAleiBwcm9jZXNzIGlkIChmcm9tIHByb2Nlc3MucGlkKVxuICAgLSAlZiBmdWxsIHBhdGggb2YgZmlsZW5hbWUgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJWZ7ZGVwdGh9IHBhdGjigJlzIGRlcHRoIGxldCB5b3UgY2hvc2UgdG8gaGF2ZSBvbmx5IGZpbGVuYW1lICglZnsxfSkgb3IgYSBjaG9zZW4gbnVtYmVyIG9mIGRpcmVjdG9yaWVzXG4gICAtICVsIGxpbmUgbnVtYmVyIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVvIGNvbHVtbiBwb3N0aW9uIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVzIGNhbGwgc3RhY2sgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJXh7PHRva2VubmFtZT59IGFkZCBkeW5hbWljIHRva2VucyB0byB5b3VyIGxvZy4gVG9rZW5zIGFyZSBzcGVjaWZpZWQgaW4gdGhlIHRva2VucyBwYXJhbWV0ZXIuXG4gICAtICVYezx0b2tlbm5hbWU+fSBhZGQgdmFsdWVzIGZyb20gdGhlIExvZ2dlciBjb250ZXh0LiBUb2tlbnMgYXJlIGtleXMgaW50byB0aGUgY29udGV4dCB2YWx1ZXMuXG4gICAtICVbIHN0YXJ0IGEgY29sb3VyZWQgYmxvY2sgKGNvbG91ciB3aWxsIGJlIHRha2VuIGZyb20gdGhlIGxvZyBsZXZlbCwgc2ltaWxhciB0byBjb2xvdXJlZExheW91dClcbiAgIC0gJV0gZW5kIGEgY29sb3VyZWQgYmxvY2tcbiAgICovXG59XG5cblxuZXhwb3J0IGNvbnN0IEJFRk9SRV9TQVZFX1NUQVRFID0gJ0JFRk9SRV9TQVZFX1NUQVRFJztcbmNvbnN0IElHTk9SRV9TTElDRSA9IFsnY29uZmlnJywgJ2NvbmZpZ1ZpZXcnLCAnY2xpJ107XG5jb25zdCBJR05PUkVfQUNUSU9OID0gbmV3IFNldChbJ3BhY2thZ2VzL3NldEluQ2hpbmEnLCAncGFja2FnZXMvdXBkYXRlUGxpbmtQYWNrYWdlSW5mbyddKTtcbmNvbnN0IGlnbm9yZVNsaWNlU2V0ID0gbmV3IFNldChJR05PUkVfU0xJQ0UpO1xuXG5jb25zdCBzdGF0ZUZpbGUgPSBQYXRoLnJlc29sdmUoKEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52KS5kaXN0RGlyLCAncGxpbmstc3RhdGUuanNvbicpO1xubGV0IHN0YXRlQ2hhbmdlQ291bnQgPSAwO1xuLyoqXG4gKiBTaW5jZSBSZWR1eC10b29sa2l0IGRvZXMgbm90IHJlYWQgaW5pdGlhbCBzdGF0ZSB3aXRoIGFueSBsYXp5IHNsaWNlIHRoYXQgaGFzIG5vdCBkZWZpbmVkIGluIHJvb3QgcmVkdWNlcixcbiAqIGUuZy4gXG4gKiBcIlVuZXhwZWN0ZWQga2V5cyBcImNsZWFuXCIsIFwicGFja2FnZXNcIiBmb3VuZCBpbiBwcmVsb2FkZWRTdGF0ZSBhcmd1bWVudCBwYXNzZWQgdG8gY3JlYXRlU3RvcmUuXG4gKiBFeHBlY3RlZCB0byBmaW5kIG9uZSBvZiB0aGUga25vd24gcmVkdWNlciBrZXlzIGluc3RlYWQ6IFwibWFpblwiLiBVbmV4cGVjdGVkIGtleXMgd2lsbCBiZSBpZ25vcmVkLlwiXCJcbiAqIFxuICogSSBoYXZlIHRvIGV4cG9ydCBzYXZlZCBzdGF0ZSwgc28gdGhhdCBlYWN5IGxhenkgc2xpY2UgY2FuIGluaXRpYWxpemUgaXRzIG93biBzbGljZSBzdGF0ZSBieSB0aGVtc2VsZlxuICovXG5jb25zdCBzYXZlZFN0b3JlID0gZnMuZXhpc3RzU3luYyhzdGF0ZUZpbGUpID8gZnMucmVhZEZpbGVTeW5jKHN0YXRlRmlsZSwgJ3V0ZjgnKSA6IG51bGw7XG5pZiAoc2F2ZWRTdG9yZSAmJiBzYXZlZFN0b3JlLmxlbmd0aCA9PT0gMCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ0VtcHRyeSBzdG9yZSBmaWxlICcgKyBzdGF0ZUZpbGUgKyAnLCBkZWxldGUgaXQgYW5kIGluaXRpYWwgbmV3IHdvcmtzcGFjZXMnKTtcbn1cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBzYXZlZFN0b3JlID8gZXZhbCgnKCcgKyBzYXZlZFN0b3JlICsgJyknKSA6IHt9O1xuZm9yIChjb25zdCBpZ25vcmVTbGljZU5hbWUgb2YgSUdOT1JFX1NMSUNFKSB7XG4gIGRlbGV0ZSBsYXN0U2F2ZWRTdGF0ZVtpZ25vcmVTbGljZU5hbWVdO1xufVxuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbmV3IFN0YXRlRmFjdG9yeShsYXN0U2F2ZWRTdGF0ZSk7XG5jb25zdCBkZWZhdWx0TG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUnKTtcblxuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLnBpcGUoXG4gIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSAmJlxuICAgICFJR05PUkVfQUNUSU9OLmhhcyhhY3Rpb24udHlwZSkgJiZcbiAgICAhaWdub3JlU2xpY2VTZXQuaGFzKGFjdGlvbi50eXBlLnNsaWNlKDAsIGFjdGlvbi50eXBlLmluZGV4T2YoJy8nKSkpXG4gICksXG4gIHRha2VXaGlsZShhY3Rpb24gPT4gYWN0aW9uLnR5cGUgIT09IEJFRk9SRV9TQVZFX1NUQVRFKSxcbiAgdGFwKChhY3Rpb24pID0+IHtcbiAgICBzdGF0ZUNoYW5nZUNvdW50Kys7XG4gIH0pXG4pLnN1YnNjcmliZSgpO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuXG4gIC8vIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuc3RhdGUnKTtcbiAgY29uc3QgbG9nQWN0aW9uID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpIHtcbiAgICAgICAgLy8gKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJykge1xuICAgICAgICAobG9nQWN0aW9uLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxubGV0IHNhdmVkID0gZmFsc2U7XG4vKipcbiAqIGEgbGlzdGVuZXIgcmVnaXN0ZXJlZCBvbiB0aGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGNhbiBtYWtlIGFzeW5jaHJvbm91cyBjYWxscywgXG4gKiBhbmQgdGhlcmVieSBjYXVzZSB0aGUgTm9kZS5qcyBwcm9jZXNzIHRvIGNvbnRpbnVlLlxuICogVGhlICdiZWZvcmVFeGl0JyBldmVudCBpcyBub3QgZW1pdHRlZCBmb3IgY29uZGl0aW9ucyBjYXVzaW5nIGV4cGxpY2l0IHRlcm1pbmF0aW9uLFxuICogc3VjaCBhcyBjYWxsaW5nIHByb2Nlc3MuZXhpdCgpIG9yIHVuY2F1Z2h0IGV4Y2VwdGlvbnMuXG4gKi9cbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCAoY29kZSkgPT4ge1xuICBpZiAoc2F2ZWQpXG4gICAgcmV0dXJuO1xuICBzdGF0ZUZhY3RvcnkuZGlzcGF0Y2goe3R5cGU6ICdCRUZPUkVfU0FWRV9TVEFURScsIHBheWxvYWQ6IG51bGx9KTtcbiAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBzYXZlU3RhdGUoKSk7XG59KTtcblxuLyoqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHlvdSBleHBsaWNpdGx5IHJ1biBwcm9jZXNzLmV4aXQoMCkgdG8gcXVpdCwgYmVjYXVzZSBcImJlZm9yZUV4aXRcIlxuICogd29uJ3QgYmUgdHJpZ2dlcmVkIHByaW9yIHRvIHByb2Nlc3MuZXhpdCgwKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVN0YXRlKCkge1xuICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZScpO1xuICBzYXZlZCA9IHRydWU7XG4gIGlmIChzdGF0ZUNoYW5nZUNvdW50ID09PSAwKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdzdGF0ZSBpcyBub3QgY2hhbmdlZCcpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoJ25vdCBpbiBtYWluIHRocmVhZCwgc2tpcCBzYXZpbmcgc3RhdGUnKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICBpZiAoc3luY1N0YXRlVG9NYWluUHJvY2Vzcykge1xuICAgICAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gICAgICBsb2cuaW5mbygnc2VuZCBzdGF0ZSBzeW5jIG1lc3NhZ2UnKTtcbiAgICAgIHByb2Nlc3Muc2VuZCh7XG4gICAgICAgIHR5cGU6ICdydGstb2JzZXJ2YWJsZTpzdGF0ZScsXG4gICAgICAgIGRhdGE6IHNlcmlhbGl6ZShzdG9yZS5nZXRTdGF0ZSgpLCB7c3BhY2U6ICcnfSlcbiAgICAgIH0gYXMgUHJvY2Vzc1N0YXRlU3luY01zZyk7XG4gICAgfVxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oY2hhbGsuZ3JheSgnaW4gYSBmb3JrZWQgcHJvY2Vzcywgc2tpcCBzYXZpbmcgc3RhdGUnKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgY29uc3QgbWVyZ2VkU3RhdGUgPSBPYmplY3QuYXNzaWduKGxhc3RTYXZlZFN0YXRlLCBzdG9yZS5nZXRTdGF0ZSgpKTtcblxuICBjb25zdCBqc29uU3RyID0gc2VyaWFsaXplKG1lcmdlZFN0YXRlLCB7c3BhY2U6ICcgICd9KTtcbiAgZnNlLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHN0YXRlRmlsZSkpO1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLndyaXRlRmlsZShzdGF0ZUZpbGUsIGpzb25TdHIpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oY2hhbGsuZ3JheShcbiAgICAgIGBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUpfSBzYXZlZCAoJHtzdGF0ZUNoYW5nZUNvdW50fSlgKSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKGNoYWxrLmdyYXkoYEZhaWxlZCB0byB3cml0ZSBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUpfWApLCBlcnIpO1xuICB9XG59XG5cbi8vIFRFU1QgYXN5bmMgYWN0aW9uIGZvciBUaHVuayBtaWRkbGV3YXJlXG4vLyBzdGF0ZUZhY3Rvcnkuc3RvcmUkLnN1YnNjcmliZShzdG9yZSA9PiB7XG4vLyAgIGlmIChzdG9yZSkge1xuLy8gICAgIGRlYnVnZ2VyO1xuLy8gICAgIHN0b3JlLmRpc3BhdGNoKChhc3luYyAoZGlzcGF0Y2g6IGFueSkgPT4ge1xuLy8gICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuLy8gICAgICAgZGlzcGF0Y2goe3R5cGU6ICdvayd9KTtcbi8vICAgICB9KSBhcyBhbnkpO1xuLy8gICB9XG4vLyB9KTtcbiJdfQ==