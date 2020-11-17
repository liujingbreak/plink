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
exports.saveState = exports.startLogging = exports.stateFactory = exports.lastSavedState = exports.ofPayloadAction = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const operators_1 = require("rxjs/operators");
const redux_toolkit_observable_1 = require("../../redux-toolkit-observable/dist/redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const log4js_1 = __importDefault(require("log4js"));
const misc_1 = require("./utils/misc");
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const immer_1 = require("immer");
const worker_threads_1 = require("worker_threads");
immer_1.enableMapSet();
// import './package-mgr'; 
// ensure slice and epic being initialized before create store, in which case not more lazy load
const stateFile = path_1.default.resolve(misc_1.getRootDir(), 'dist/plink-state.json');
let actionCount = 0;
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
exports.stateFactory = new redux_toolkit_observable_1.StateFactory(exports.lastSavedState);
exports.stateFactory.actionsToDispatch.pipe(operators_1.filter(action => !action.type.endsWith('/_init')), operators_1.tap(() => actionCount++)).subscribe();
function startLogging() {
    return __awaiter(this, void 0, void 0, function* () {
        const defaultLog = log4js_1.default.getLogger('@wfh/plink.store');
        const logState = log4js_1.default.getLogger('@wfh/plink.store.state');
        const logAction = log4js_1.default.getLogger('@wfh/plink.store.action');
        exports.stateFactory.log$.pipe(operators_1.tap(params => {
            if (params[0] === 'state')
                logState.debug(...params.slice(1));
            else if (params[0] === 'action') {
                logAction.info(...params.slice(1));
                // console.log(...params.slice(1));
            }
            else
                defaultLog.debug(...params);
            // if (params[0] === 'state') {
            //   console.log('[redux:state]', ...params.slice(1));
            // } else if (params[0] === 'action')
            //   console.log('[redux:action]', ...params.slice(1));
            // else
            //   console.log(...params);
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
    saveState();
    // // tslint:disable-next-line: no-console
    // console.log(chalk.green(`Done in ${new Date().getTime() - process.uptime()} s`));
}));
/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
function saveState() {
    return __awaiter(this, void 0, void 0, function* () {
        saved = true;
        if (actionCount === 0) {
            // tslint:disable-next-line: no-console
            console.log('[package-mgr] state is not changed');
            return;
        }
        if (!worker_threads_1.isMainThread) {
            // tslint:disable-next-line: no-console
            console.log('[package-mgr] not in main thread, skip saving state');
            return;
        }
        if (process.send) {
            // tslint:disable-next-line: no-console
            console.log('[package-mgr] in a forked process, skip saving state');
            return;
        }
        const store = yield exports.stateFactory.rootStoreReady;
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        const jsonStr = serialize_javascript_1.default(mergedState, { space: '  ' });
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(stateFile));
        fs_1.default.writeFile(stateFile, jsonStr, (err) => {
            if (err) {
                // tslint:disable-next-line: no-console
                console.log(`Failed to write state file ${path_1.default.relative(process.cwd(), stateFile)}`, err);
                return;
            }
            // tslint:disable-next-line: no-console
            console.log(`[package-mgr] state file ${path_1.default.relative(process.cwd(), stateFile)} saved (${actionCount})`);
        });
    });
}
exports.saveState = saveState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUMzQiw4Q0FBMkM7QUFDM0MsMkdBQTJHO0FBUW5HLGdHQVJjLDBDQUFlLE9BUWQ7QUFQdkIsb0RBQTRCO0FBQzVCLHVDQUF3QztBQUN4QyxnRkFBNkM7QUFDN0MsaUNBQW1DO0FBQ25DLG1EQUE0QztBQUs1QyxvQkFBWSxFQUFFLENBQUM7QUFFZiwyQkFBMkI7QUFDM0IsZ0dBQWdHO0FBRWhHLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLHVCQUF1QixDQUFDLENBQUM7QUFDdEUsSUFBSSxXQUFXLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLFVBQVUsR0FBRyxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3hGLElBQUksVUFBVSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0lBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsb0JBQW9CLEdBQUcsU0FBUyxHQUFHLHdDQUF3QyxDQUFDLENBQUM7Q0FDOUY7QUFDRCxvQ0FBb0M7QUFDdkIsUUFBQSxjQUFjLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLFVBQVUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRWhFLFFBQUEsWUFBWSxHQUFHLElBQUksdUNBQVksQ0FBQyxzQkFBYyxDQUFDLENBQUM7QUFFN0Qsb0JBQVksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQ2pDLGtC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QUFDLDhCQUE4QixjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUMxRixPQUFPO2FBQ1I7WUFDRCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLFdBQVcsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUM1RyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FBQTtBQWhDRCw4QkFnQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgZnNlIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCB7dGFwLCBmaWx0ZXJ9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7U3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb259IGZyb20gJy4uLy4uL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgc2VyaWFsaXplIGZyb20gJ3NlcmlhbGl6ZS1qYXZhc2NyaXB0JztcbmltcG9ydCB7ZW5hYmxlTWFwU2V0fSBmcm9tICdpbW1lcic7XG5pbXBvcnQge2lzTWFpblRocmVhZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5lbmFibGVNYXBTZXQoKTtcblxuLy8gaW1wb3J0ICcuL3BhY2thZ2UtbWdyJzsgXG4vLyBlbnN1cmUgc2xpY2UgYW5kIGVwaWMgYmVpbmcgaW5pdGlhbGl6ZWQgYmVmb3JlIGNyZWF0ZSBzdG9yZSwgaW4gd2hpY2ggY2FzZSBub3QgbW9yZSBsYXp5IGxvYWRcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ2Rpc3QvcGxpbmstc3RhdGUuanNvbicpO1xubGV0IGFjdGlvbkNvdW50ID0gMDtcbi8qKlxuICogU2luY2UgUmVkdXgtdG9vbGtpdCBkb2VzIG5vdCByZWFkIGluaXRpYWwgc3RhdGUgd2l0aCBhbnkgbGF6eSBzbGljZSB0aGF0IGhhcyBub3QgZGVmaW5lZCBpbiByb290IHJlZHVjZXIsXG4gKiBlLmcuIFxuICogXCJVbmV4cGVjdGVkIGtleXMgXCJjbGVhblwiLCBcInBhY2thZ2VzXCIgZm91bmQgaW4gcHJlbG9hZGVkU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlLlxuICogRXhwZWN0ZWQgdG8gZmluZCBvbmUgb2YgdGhlIGtub3duIHJlZHVjZXIga2V5cyBpbnN0ZWFkOiBcIm1haW5cIi4gVW5leHBlY3RlZCBrZXlzIHdpbGwgYmUgaWdub3JlZC5cIlwiXG4gKiBcbiAqIEkgaGF2ZSB0byBleHBvcnQgc2F2ZWQgc3RhdGUsIHNvIHRoYXQgZWFjeSBsYXp5IHNsaWNlIGNhbiBpbml0aWFsaXplIGl0cyBvd24gc2xpY2Ugc3RhdGUgYnkgdGhlbXNlbGZcbiAqL1xuY29uc3Qgc2F2ZWRTdG9yZSA9IGZzLmV4aXN0c1N5bmMoc3RhdGVGaWxlKSA/IGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgOiBudWxsO1xuaWYgKHNhdmVkU3RvcmUgJiYgc2F2ZWRTdG9yZS5sZW5ndGggPT09IDApIHtcbiAgdGhyb3cgbmV3IEVycm9yKCdFbXB0cnkgc3RvcmUgZmlsZSAnICsgc3RhdGVGaWxlICsgJywgZGVsZXRlIGl0IGFuZCBpbml0aWFsIG5ldyB3b3Jrc3BhY2VzJyk7XG59XG4vLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWV2YWxcbmV4cG9ydCBjb25zdCBsYXN0U2F2ZWRTdGF0ZSA9IHNhdmVkU3RvcmUgPyBldmFsKCcoJyArIHNhdmVkU3RvcmUgKyAnKScpIDoge307XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcblxuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLnBpcGUoXG4gIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSksXG4gIHRhcCgoKSA9PiBhY3Rpb25Db3VudCsrKVxuKS5zdWJzY3JpYmUoKTtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuICBjb25zdCBkZWZhdWx0TG9nID0gbG9nNGpzLmdldExvZ2dlcignQHdmaC9wbGluay5zdG9yZScpO1xuICBjb25zdCBsb2dTdGF0ZSA9IGxvZzRqcy5nZXRMb2dnZXIoJ0B3ZmgvcGxpbmsuc3RvcmUuc3RhdGUnKTtcbiAgY29uc3QgbG9nQWN0aW9uID0gbG9nNGpzLmdldExvZ2dlcignQHdmaC9wbGluay5zdG9yZS5hY3Rpb24nKTtcblxuICBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJylcbiAgICAgICAgKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpIHtcbiAgICAgICAgKGxvZ0FjdGlvbi5pbmZvIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG5cbiAgICAgIC8vIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpIHtcbiAgICAgIC8vICAgY29uc29sZS5sb2coJ1tyZWR1eDpzdGF0ZV0nLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgLy8gfSBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKVxuICAgICAgLy8gICBjb25zb2xlLmxvZygnW3JlZHV4OmFjdGlvbl0nLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgLy8gZWxzZVxuICAgICAgLy8gICBjb25zb2xlLmxvZyguLi5wYXJhbXMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmxldCBzYXZlZCA9IGZhbHNlO1xuLyoqXG4gKiBhIGxpc3RlbmVyIHJlZ2lzdGVyZWQgb24gdGhlICdiZWZvcmVFeGl0JyBldmVudCBjYW4gbWFrZSBhc3luY2hyb25vdXMgY2FsbHMsIFxuICogYW5kIHRoZXJlYnkgY2F1c2UgdGhlIE5vZGUuanMgcHJvY2VzcyB0byBjb250aW51ZS5cbiAqIFRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgaXMgbm90IGVtaXR0ZWQgZm9yIGNvbmRpdGlvbnMgY2F1c2luZyBleHBsaWNpdCB0ZXJtaW5hdGlvbixcbiAqIHN1Y2ggYXMgY2FsbGluZyBwcm9jZXNzLmV4aXQoKSBvciB1bmNhdWdodCBleGNlcHRpb25zLlxuICovXG5wcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgYXN5bmMgKGNvZGUpID0+IHtcbiAgaWYgKHNhdmVkKVxuICAgIHJldHVybjtcbiAgc2F2ZVN0YXRlKCk7XG4gIC8vIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyBjb25zb2xlLmxvZyhjaGFsay5ncmVlbihgRG9uZSBpbiAke25ldyBEYXRlKCkuZ2V0VGltZSgpIC0gcHJvY2Vzcy51cHRpbWUoKX0gc2ApKTtcbn0pO1xuXG4vKipcbiAqIENhbGwgdGhpcyBmdW5jdGlvbiBiZWZvcmUgeW91IGV4cGxpY2l0bHkgcnVuIHByb2Nlc3MuZXhpdCgwKSB0byBxdWl0LCBiZWNhdXNlIFwiYmVmb3JlRXhpdFwiXG4gKiB3b24ndCBiZSB0cmlnZ2VyZWQgcHJpb3IgdG8gcHJvY2Vzcy5leGl0KDApXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzYXZlU3RhdGUoKSB7XG4gIHNhdmVkID0gdHJ1ZTtcbiAgaWYgKGFjdGlvbkNvdW50ID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1twYWNrYWdlLW1ncl0gc3RhdGUgaXMgbm90IGNoYW5nZWQnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW3BhY2thZ2UtbWdyXSBub3QgaW4gbWFpbiB0aHJlYWQsIHNraXAgc2F2aW5nIHN0YXRlJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW3BhY2thZ2UtbWdyXSBpbiBhIGZvcmtlZCBwcm9jZXNzLCBza2lwIHNhdmluZyBzdGF0ZScpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBzdG9yZSA9IGF3YWl0IHN0YXRlRmFjdG9yeS5yb290U3RvcmVSZWFkeTtcbiAgY29uc3QgbWVyZ2VkU3RhdGUgPSBPYmplY3QuYXNzaWduKGxhc3RTYXZlZFN0YXRlLCBzdG9yZS5nZXRTdGF0ZSgpKTtcblxuICBjb25zdCBqc29uU3RyID0gc2VyaWFsaXplKG1lcmdlZFN0YXRlLCB7c3BhY2U6ICcgICd9KTtcbiAgZnNlLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHN0YXRlRmlsZSkpO1xuICBmcy53cml0ZUZpbGUoc3RhdGVGaWxlLCBqc29uU3RyLFxuICAgIChlcnIpID0+IHtcbiAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGBGYWlsZWQgdG8gd3JpdGUgc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlKX1gLCBlcnIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbcGFja2FnZS1tZ3JdIHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSl9IHNhdmVkICgke2FjdGlvbkNvdW50fSlgKTtcbiAgICB9KTtcbn1cbiJdfQ==