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
exports.saveState = exports.startLogging = exports.stateFactory = exports.lastSavedState = exports.BEFORE_SAVE_STATE = exports.ofPayloadAction = void 0;
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
immer_1.enableMapSet();
configDefaultLog();
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
// tslint:disable-next-line: no-eval
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
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
exports.startLogging = startLogging;
let saved = false;
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls,
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
process.on('beforeExit', (code) => __awaiter(void 0, void 0, void 0, function* () {
    if (saved)
        return;
    exports.stateFactory.dispatch({ type: 'BEFORE_SAVE_STATE', payload: null });
    process.nextTick(() => saveState());
    // // tslint:disable-next-line: no-console
    // console.log(chalk.green(`Done in ${new Date().getTime() - process.uptime()} s`));
}));
/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
function saveState() {
    return __awaiter(this, void 0, void 0, function* () {
        const log = log4js_1.default.getLogger('plink.store');
        saved = true;
        if (stateChangeCount === 0) {
            // tslint:disable-next-line: no-console
            log.info(chalk_1.default.gray('state is not changed'));
            return;
        }
        if (!worker_threads_1.isMainThread) {
            // tslint:disable-next-line: no-console
            log.info(chalk_1.default.gray('not in main thread, skip saving state'));
            return;
        }
        if (process.send) {
            // tslint:disable-next-line: no-console
            log.info(chalk_1.default.gray('in a forked process, skip saving state'));
            return;
        }
        const store = yield exports.stateFactory.rootStoreReady;
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        const jsonStr = serialize_javascript_1.default(mergedState, { space: '  ' });
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(stateFile));
        try {
            yield fs_1.default.promises.writeFile(stateFile, jsonStr);
            // tslint:disable-next-line: no-console
            log.info(chalk_1.default.gray(`state file ${path_1.default.relative(process.cwd(), stateFile)} saved (${stateChangeCount})`));
        }
        catch (err) {
            // tslint:disable-next-line: no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUMzQiw4Q0FBc0Q7QUFDdEQsMkdBQTJHO0FBU25HLGdHQVRjLDBDQUFlLE9BU2Q7QUFSdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQTRDO0FBRTVDLGtEQUEwQjtBQUsxQixvQkFBWSxFQUFFLENBQUM7QUFFZixnQkFBZ0IsRUFBRSxDQUFDO0FBRW5CLFNBQVMsZ0JBQWdCO0lBQ3ZCLElBQUksZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO0lBQzFCLElBQUksT0FBTyxDQUFDLElBQUk7UUFDZCxnQkFBZ0IsR0FBRyxTQUFTLENBQUM7U0FDMUIsSUFBSSxDQUFDLDZCQUFZO1FBQ3BCLGdCQUFnQixHQUFHLFVBQVUsQ0FBQztJQUNoQyxnQkFBTSxDQUFDLFNBQVMsQ0FBQztRQUNmLFNBQVMsRUFBRTtZQUNULEdBQUcsRUFBRTtnQkFDSCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsRUFBQyxJQUFJLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsR0FBRyxhQUFhLEVBQUM7YUFDckU7U0FDRjtRQUNELFVBQVUsRUFBRTtZQUNWLE9BQU8sRUFBRSxFQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUM7U0FDN0M7S0FDRixDQUFDLENBQUM7SUFDSDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztPQW1CRztBQUNMLENBQUM7QUFHWSxRQUFBLGlCQUFpQixHQUFHLG1CQUFtQixDQUFDO0FBQ3JELE1BQU0sWUFBWSxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNyRCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FB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Ryw4QkFBUyxDQUFDLFdBQVcsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3RELGtCQUFHLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBVSxDQUFDLENBQUMsQ0FBQztRQUN6QyxJQUFJO1lBQ0YsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDakQsdUNBQXVDO1lBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBSyxDQUFDLElBQUksQ0FDakIsY0FBYyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFVLENBQUMsV0FBVyxnQkFBZ0IsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUMxRjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osdUNBQXVDO1lBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3RHO0lBQ0gsQ0FBQztDQUFBO0FBaENELDhCQWdDQztBQUVELHlDQUF5QztBQUN6QywyQ0FBMkM7QUFDM0MsaUJBQWlCO0FBQ2pCLGdCQUFnQjtBQUNoQixpREFBaUQ7QUFDakQsZ0VBQWdFO0FBQ2hFLGdDQUFnQztBQUNoQyxrQkFBa0I7QUFDbEIsTUFBTTtBQUNOLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7dGFwLCBmaWx0ZXIsIHRha2VXaGlsZX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnc2VyaWFsaXplLWphdmFzY3JpcHQnO1xuaW1wb3J0IHtlbmFibGVNYXBTZXR9IGZyb20gJ2ltbWVyJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5lbmFibGVNYXBTZXQoKTtcblxuY29uZmlnRGVmYXVsdExvZygpO1xuXG5mdW5jdGlvbiBjb25maWdEZWZhdWx0TG9nKCkge1xuICBsZXQgbG9nUGF0dGVyblByZWZpeCA9ICcnO1xuICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgIGxvZ1BhdHRlcm5QcmVmaXggPSAncGlkOiV6ICc7XG4gIGVsc2UgaWYgKCFpc01haW5UaHJlYWQpXG4gICAgbG9nUGF0dGVyblByZWZpeCA9ICdbdGhyZWFkXSc7XG4gIGxvZzRqcy5jb25maWd1cmUoe1xuICAgIGFwcGVuZGVyczoge1xuICAgICAgb3V0OiB7XG4gICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICBsYXlvdXQ6IHt0eXBlOiAncGF0dGVybicsIHBhdHRlcm46IGxvZ1BhdHRlcm5QcmVmaXggKyAnJVslYyVdIC0gJW0nfVxuICAgICAgfVxuICAgIH0sXG4gICAgY2F0ZWdvcmllczoge1xuICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdpbmZvJ31cbiAgICB9XG4gIH0pO1xuICAvKipcbiAgIC0gJXIgdGltZSBpbiB0b0xvY2FsZVRpbWVTdHJpbmcgZm9ybWF0XG4gICAtICVwIGxvZyBsZXZlbFxuICAgLSAlYyBsb2cgY2F0ZWdvcnlcbiAgIC0gJWggaG9zdG5hbWVcbiAgIC0gJW0gbG9nIGRhdGFcbiAgIC0gJWQgZGF0ZSwgZm9ybWF0dGVkIC0gZGVmYXVsdCBpcyBJU084NjAxLCBmb3JtYXQgb3B0aW9ucyBhcmU6IElTTzg2MDEsIElTTzg2MDFfV0lUSF9UWl9PRkZTRVQsIEFCU09MVVRFLCBEQVRFLCBvciBhbnkgc3RyaW5nIGNvbXBhdGlibGUgd2l0aCB0aGUgZGF0ZS1mb3JtYXQgbGlicmFyeS4gZS5nLiAlZHtEQVRFfSwgJWR7eXl5eS9NTS9kZC1oaC5tbS5zc31cbiAgIC0gJSUgJSAtIGZvciB3aGVuIHlvdSB3YW50IGEgbGl0ZXJhbCAlIGluIHlvdXIgb3V0cHV0XG4gICAtICVuIG5ld2xpbmVcbiAgIC0gJXogcHJvY2VzcyBpZCAoZnJvbSBwcm9jZXNzLnBpZClcbiAgIC0gJWYgZnVsbCBwYXRoIG9mIGZpbGVuYW1lIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVme2RlcHRofSBwYXRo4oCZcyBkZXB0aCBsZXQgeW91IGNob3NlIHRvIGhhdmUgb25seSBmaWxlbmFtZSAoJWZ7MX0pIG9yIGEgY2hvc2VuIG51bWJlciBvZiBkaXJlY3Rvcmllc1xuICAgLSAlbCBsaW5lIG51bWJlciAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlbyBjb2x1bW4gcG9zdGlvbiAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlcyBjYWxsIHN0YWNrIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICV4ezx0b2tlbm5hbWU+fSBhZGQgZHluYW1pYyB0b2tlbnMgdG8geW91ciBsb2cuIFRva2VucyBhcmUgc3BlY2lmaWVkIGluIHRoZSB0b2tlbnMgcGFyYW1ldGVyLlxuICAgLSAlWHs8dG9rZW5uYW1lPn0gYWRkIHZhbHVlcyBmcm9tIHRoZSBMb2dnZXIgY29udGV4dC4gVG9rZW5zIGFyZSBrZXlzIGludG8gdGhlIGNvbnRleHQgdmFsdWVzLlxuICAgLSAlWyBzdGFydCBhIGNvbG91cmVkIGJsb2NrIChjb2xvdXIgd2lsbCBiZSB0YWtlbiBmcm9tIHRoZSBsb2cgbGV2ZWwsIHNpbWlsYXIgdG8gY29sb3VyZWRMYXlvdXQpXG4gICAtICVdIGVuZCBhIGNvbG91cmVkIGJsb2NrXG4gICAqL1xufVxuXG5cbmV4cG9ydCBjb25zdCBCRUZPUkVfU0FWRV9TVEFURSA9ICdCRUZPUkVfU0FWRV9TVEFURSc7XG5jb25zdCBJR05PUkVfU0xJQ0UgPSBbJ2NvbmZpZycsICdjb25maWdWaWV3JywgJ2NsaSddO1xuY29uc3QgSUdOT1JFX0FDVElPTiA9IG5ldyBTZXQoWydwYWNrYWdlcy9zZXRJbkNoaW5hJywgJ3BhY2thZ2VzL3VwZGF0ZVBsaW5rUGFja2FnZUluZm8nXSk7XG5jb25zdCBpZ25vcmVTbGljZVNldCA9IG5ldyBTZXQoSUdOT1JFX1NMSUNFKTtcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKChKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudikuZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKTtcbmxldCBzdGF0ZUNoYW5nZUNvdW50ID0gMDtcbi8qKlxuICogU2luY2UgUmVkdXgtdG9vbGtpdCBkb2VzIG5vdCByZWFkIGluaXRpYWwgc3RhdGUgd2l0aCBhbnkgbGF6eSBzbGljZSB0aGF0IGhhcyBub3QgZGVmaW5lZCBpbiByb290IHJlZHVjZXIsXG4gKiBlLmcuIFxuICogXCJVbmV4cGVjdGVkIGtleXMgXCJjbGVhblwiLCBcInBhY2thZ2VzXCIgZm91bmQgaW4gcHJlbG9hZGVkU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlLlxuICogRXhwZWN0ZWQgdG8gZmluZCBvbmUgb2YgdGhlIGtub3duIHJlZHVjZXIga2V5cyBpbnN0ZWFkOiBcIm1haW5cIi4gVW5leHBlY3RlZCBrZXlzIHdpbGwgYmUgaWdub3JlZC5cIlwiXG4gKiBcbiAqIEkgaGF2ZSB0byBleHBvcnQgc2F2ZWQgc3RhdGUsIHNvIHRoYXQgZWFjeSBsYXp5IHNsaWNlIGNhbiBpbml0aWFsaXplIGl0cyBvd24gc2xpY2Ugc3RhdGUgYnkgdGhlbXNlbGZcbiAqL1xuY29uc3Qgc2F2ZWRTdG9yZSA9IGZzLmV4aXN0c1N5bmMoc3RhdGVGaWxlKSA/IGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgOiBudWxsO1xuaWYgKHNhdmVkU3RvcmUgJiYgc2F2ZWRTdG9yZS5sZW5ndGggPT09IDApIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdFbXB0cnkgc3RvcmUgZmlsZSAnICsgc3RhdGVGaWxlICsgJywgZGVsZXRlIGl0IGFuZCBpbml0aWFsIG5ldyB3b3Jrc3BhY2VzJyk7XG59XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWV2YWxcbmV4cG9ydCBjb25zdCBsYXN0U2F2ZWRTdGF0ZSA9IHNhdmVkU3RvcmUgPyBldmFsKCcoJyArIHNhdmVkU3RvcmUgKyAnKScpIDoge307XG5mb3IgKGNvbnN0IGlnbm9yZVNsaWNlTmFtZSBvZiBJR05PUkVfU0xJQ0UpIHtcbiAgZGVsZXRlIGxhc3RTYXZlZFN0YXRlW2lnbm9yZVNsaWNlTmFtZV07XG59XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcbmNvbnN0IGRlZmF1bHRMb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZScpO1xuXG5zdGF0ZUZhY3RvcnkuYWN0aW9uc1RvRGlzcGF0Y2gucGlwZShcbiAgZmlsdGVyKGFjdGlvbiA9PiAhYWN0aW9uLnR5cGUuZW5kc1dpdGgoJy9faW5pdCcpICYmXG4gICAgIUlHTk9SRV9BQ1RJT04uaGFzKGFjdGlvbi50eXBlKSAmJlxuICAgICFpZ25vcmVTbGljZVNldC5oYXMoYWN0aW9uLnR5cGUuc2xpY2UoMCwgYWN0aW9uLnR5cGUuaW5kZXhPZignLycpKSlcbiAgKSxcbiAgdGFrZVdoaWxlKGFjdGlvbiA9PiBhY3Rpb24udHlwZSAhPT0gQkVGT1JFX1NBVkVfU1RBVEUpLFxuICB0YXAoKGFjdGlvbikgPT4ge1xuICAgIHN0YXRlQ2hhbmdlQ291bnQrKztcbiAgfSlcbikuc3Vic2NyaWJlKCk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydExvZ2dpbmcoKSB7XG5cbiAgLy8gY29uc3QgbG9nU3RhdGUgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZS5zdGF0ZScpO1xuICBjb25zdCBsb2dBY3Rpb24gPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5zdG9yZS5hY3Rpb24nKTtcblxuICBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJykge1xuICAgICAgICAvLyAobG9nU3RhdGUuZGVidWcgYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgfSBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIChsb2dBY3Rpb24uZGVidWcgYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgfSBlbHNlXG4gICAgICAgIChkZWZhdWx0TG9nLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5sZXQgc2F2ZWQgPSBmYWxzZTtcbi8qKlxuICogYSBsaXN0ZW5lciByZWdpc3RlcmVkIG9uIHRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgY2FuIG1ha2UgYXN5bmNocm9ub3VzIGNhbGxzLCBcbiAqIGFuZCB0aGVyZWJ5IGNhdXNlIHRoZSBOb2RlLmpzIHByb2Nlc3MgdG8gY29udGludWUuXG4gKiBUaGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGlzIG5vdCBlbWl0dGVkIGZvciBjb25kaXRpb25zIGNhdXNpbmcgZXhwbGljaXQgdGVybWluYXRpb24sXG4gKiBzdWNoIGFzIGNhbGxpbmcgcHJvY2Vzcy5leGl0KCkgb3IgdW5jYXVnaHQgZXhjZXB0aW9ucy5cbiAqL1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gIGlmIChzYXZlZClcbiAgICByZXR1cm47XG4gIHN0YXRlRmFjdG9yeS5kaXNwYXRjaCh7dHlwZTogJ0JFRk9SRV9TQVZFX1NUQVRFJywgcGF5bG9hZDogbnVsbH0pO1xuICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHNhdmVTdGF0ZSgpKTtcbiAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBwcm9jZXNzLnVwdGltZSgpfSBzYCkpO1xufSk7XG5cbi8qKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB5b3UgZXhwbGljaXRseSBydW4gcHJvY2Vzcy5leGl0KDApIHRvIHF1aXQsIGJlY2F1c2UgXCJiZWZvcmVFeGl0XCJcbiAqIHdvbid0IGJlIHRyaWdnZXJlZCBwcmlvciB0byBwcm9jZXNzLmV4aXQoMClcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVTdGF0ZSgpIHtcbiAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUnKTtcbiAgc2F2ZWQgPSB0cnVlO1xuICBpZiAoc3RhdGVDaGFuZ2VDb3VudCA9PT0gMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoJ3N0YXRlIGlzIG5vdCBjaGFuZ2VkJykpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWlzTWFpblRocmVhZCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoJ25vdCBpbiBtYWluIHRocmVhZCwgc2tpcCBzYXZpbmcgc3RhdGUnKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdpbiBhIGZvcmtlZCBwcm9jZXNzLCBza2lwIHNhdmluZyBzdGF0ZScpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gIGNvbnN0IG1lcmdlZFN0YXRlID0gT2JqZWN0LmFzc2lnbihsYXN0U2F2ZWRTdGF0ZSwgc3RvcmUuZ2V0U3RhdGUoKSk7XG5cbiAgY29uc3QganNvblN0ciA9IHNlcmlhbGl6ZShtZXJnZWRTdGF0ZSwge3NwYWNlOiAnICAnfSk7XG4gIGZzZS5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShzdGF0ZUZpbGUhKSk7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKHN0YXRlRmlsZSEsIGpzb25TdHIpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLmdyYXkoXG4gICAgICBgc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlISl9IHNhdmVkICgke3N0YXRlQ2hhbmdlQ291bnR9KWApKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKGNoYWxrLmdyYXkoYEZhaWxlZCB0byB3cml0ZSBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUhKX1gKSwgZXJyKTtcbiAgfVxufVxuXG4vLyBURVNUIGFzeW5jIGFjdGlvbiBmb3IgVGh1bmsgbWlkZGxld2FyZVxuLy8gc3RhdGVGYWN0b3J5LnN0b3JlJC5zdWJzY3JpYmUoc3RvcmUgPT4ge1xuLy8gICBpZiAoc3RvcmUpIHtcbi8vICAgICBkZWJ1Z2dlcjtcbi8vICAgICBzdG9yZS5kaXNwYXRjaCgoYXN5bmMgKGRpc3BhdGNoOiBhbnkpID0+IHtcbi8vICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbi8vICAgICAgIGRpc3BhdGNoKHt0eXBlOiAnb2snfSk7XG4vLyAgICAgfSkgYXMgYW55KTtcbi8vICAgfVxuLy8gfSk7XG4iXX0=