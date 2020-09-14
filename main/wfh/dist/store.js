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
const operators_1 = require("rxjs/operators");
const redux_toolkit_observable_1 = require("../../redux-toolkit-observable/dist/redux-toolkit-observable");
Object.defineProperty(exports, "ofPayloadAction", { enumerable: true, get: function () { return redux_toolkit_observable_1.ofPayloadAction; } });
const log4js_1 = __importDefault(require("log4js"));
const misc_1 = require("./utils/misc");
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const immer_1 = require("immer");
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
// tslint:disable-next-line: no-eval
exports.lastSavedState = fs_1.default.existsSync(stateFile) ? eval('(' + fs_1.default.readFileSync(stateFile, 'utf8') + ')') : {};
exports.stateFactory = new redux_toolkit_observable_1.StateFactory(exports.lastSavedState);
exports.stateFactory.actionsToDispatch.pipe(operators_1.filter(action => !action.type.endsWith('/_init')), operators_1.tap(() => actionCount++)).subscribe();
function startLogging() {
    return __awaiter(this, void 0, void 0, function* () {
        const defaultLog = log4js_1.default.getLogger('dr-comp-package.store');
        const logState = log4js_1.default.getLogger('dr-comp-package.store.state');
        const logAction = log4js_1.default.getLogger('dr-comp-package.store.action');
        exports.stateFactory.log$.pipe(operators_1.tap(params => {
            if (params[0] === 'state')
                logState.debug(...params.slice(1));
            else if (params[0] === 'action')
                logAction.info(...params.slice(1));
            // console.log(...params.slice(1));
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
        const store = yield exports.stateFactory.rootStoreReady;
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        // const jsonStr = JSON.stringify(mergedState, null, '  ');
        const jsonStr = serialize_javascript_1.default(mergedState, { space: '  ' });
        fs_1.default.writeFile(stateFile, jsonStr, () => {
            // tslint:disable-next-line: no-console
            console.log(`[package-mgr] state file ${path_1.default.relative(process.cwd(), stateFile)} saved (${actionCount})`);
        });
    });
}
exports.saveState = saveState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDhDQUEyQztBQUMzQywyR0FBMkc7QUFPbkcsZ0dBUGMsMENBQWUsT0FPZDtBQU52QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFLbkMsb0JBQVksRUFBRSxDQUFDO0FBRWYsMkJBQTJCO0FBQzNCLGdHQUFnRztBQUVoRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3RFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztBQUNwQjs7Ozs7OztHQU9HO0FBQ0gsb0NBQW9DO0FBQ3ZCLFFBQUEsY0FBYyxHQUFHLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUV0RyxRQUFBLFlBQVksR0FBRyxJQUFJLHVDQUFZLENBQUMsc0JBQWMsQ0FBQyxDQUFDO0FBRTdELG9CQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUNqQyxrQkFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUNqRCxlQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDekIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUdkLFNBQXNCLFlBQVk7O1FBQ2hDLE1BQU0sVUFBVSxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUNqRSxNQUFNLFNBQVMsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBRW5FLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDcEIsZUFBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ1gsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTztnQkFDdEIsUUFBUSxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDekMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtnQkFDNUIsU0FBUyxDQUFDLElBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxtQ0FBbUM7O2dCQUVsQyxVQUFVLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7WUFFdkMsK0JBQStCO1lBQy9CLHNEQUFzRDtZQUN0RCxxQ0FBcUM7WUFDckMsdURBQXVEO1lBQ3ZELE9BQU87WUFDUCw0QkFBNEI7UUFDOUIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDO0NBQUE7QUF2QkQsb0NBdUJDO0FBRUQsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ2xCOzs7OztHQUtHO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBTyxJQUFJLEVBQUUsRUFBRTtJQUN0QyxJQUFJLEtBQUs7UUFDUCxPQUFPO0lBQ1QsU0FBUyxFQUFFLENBQUM7SUFDWiwwQ0FBMEM7SUFDMUMsb0ZBQW9GO0FBQ3RGLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFSDs7O0dBR0c7QUFDSCxTQUFzQixTQUFTOztRQUM3QixLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2IsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDbEQsT0FBTztTQUNSO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxvQkFBWSxDQUFDLGNBQWMsQ0FBQztRQUNoRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFjLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDcEUsMkRBQTJEO1FBQzNELE1BQU0sT0FBTyxHQUFHLDhCQUFTLENBQUMsV0FBVyxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDdEQsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUM3QixHQUFHLEVBQUU7WUFDSCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLFdBQVcsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUM1RyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FBQTtBQWhCRCw4QkFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3RhcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuLi8uLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdzZXJpYWxpemUtamF2YXNjcmlwdCc7XG5pbXBvcnQge2VuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5lbmFibGVNYXBTZXQoKTtcblxuLy8gaW1wb3J0ICcuL3BhY2thZ2UtbWdyJzsgXG4vLyBlbnN1cmUgc2xpY2UgYW5kIGVwaWMgYmVpbmcgaW5pdGlhbGl6ZWQgYmVmb3JlIGNyZWF0ZSBzdG9yZSwgaW4gd2hpY2ggY2FzZSBub3QgbW9yZSBsYXp5IGxvYWRcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ2Rpc3QvcGxpbmstc3RhdGUuanNvbicpO1xubGV0IGFjdGlvbkNvdW50ID0gMDtcbi8qKlxuICogU2luY2UgUmVkdXgtdG9vbGtpdCBkb2VzIG5vdCByZWFkIGluaXRpYWwgc3RhdGUgd2l0aCBhbnkgbGF6eSBzbGljZSB0aGF0IGhhcyBub3QgZGVmaW5lZCBpbiByb290IHJlZHVjZXIsXG4gKiBlLmcuIFxuICogXCJVbmV4cGVjdGVkIGtleXMgXCJjbGVhblwiLCBcInBhY2thZ2VzXCIgZm91bmQgaW4gcHJlbG9hZGVkU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlLlxuICogRXhwZWN0ZWQgdG8gZmluZCBvbmUgb2YgdGhlIGtub3duIHJlZHVjZXIga2V5cyBpbnN0ZWFkOiBcIm1haW5cIi4gVW5leHBlY3RlZCBrZXlzIHdpbGwgYmUgaWdub3JlZC5cIlwiXG4gKiBcbiAqIEkgaGF2ZSB0byBleHBvcnQgc2F2ZWQgc3RhdGUsIHNvIHRoYXQgZWFjeSBsYXp5IHNsaWNlIGNhbiBpbml0aWFsaXplIGl0cyBvd24gc2xpY2Ugc3RhdGUgYnkgdGhlbXNlbGZcbiAqL1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBldmFsKCcoJyArIGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgKyAnKScpIDoge307XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcblxuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLnBpcGUoXG4gIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSksXG4gIHRhcCgoKSA9PiBhY3Rpb25Db3VudCsrKVxuKS5zdWJzY3JpYmUoKTtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuICBjb25zdCBkZWZhdWx0TG9nID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlJyk7XG4gIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlLnN0YXRlJyk7XG4gIGNvbnN0IGxvZ0FjdGlvbiA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZS5hY3Rpb24nKTtcblxuICBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJylcbiAgICAgICAgKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICAgIChsb2dBY3Rpb24uaW5mbyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlXG4gICAgICAgIChkZWZhdWx0TG9nLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zKTtcblxuICAgICAgLy8gaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJykge1xuICAgICAgLy8gICBjb25zb2xlLmxvZygnW3JlZHV4OnN0YXRlXScsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAvLyB9IGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKCdbcmVkdXg6YWN0aW9uXScsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAvLyBlbHNlXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxubGV0IHNhdmVkID0gZmFsc2U7XG4vKipcbiAqIGEgbGlzdGVuZXIgcmVnaXN0ZXJlZCBvbiB0aGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGNhbiBtYWtlIGFzeW5jaHJvbm91cyBjYWxscywgXG4gKiBhbmQgdGhlcmVieSBjYXVzZSB0aGUgTm9kZS5qcyBwcm9jZXNzIHRvIGNvbnRpbnVlLlxuICogVGhlICdiZWZvcmVFeGl0JyBldmVudCBpcyBub3QgZW1pdHRlZCBmb3IgY29uZGl0aW9ucyBjYXVzaW5nIGV4cGxpY2l0IHRlcm1pbmF0aW9uLFxuICogc3VjaCBhcyBjYWxsaW5nIHByb2Nlc3MuZXhpdCgpIG9yIHVuY2F1Z2h0IGV4Y2VwdGlvbnMuXG4gKi9cbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCBhc3luYyAoY29kZSkgPT4ge1xuICBpZiAoc2F2ZWQpXG4gICAgcmV0dXJuO1xuICBzYXZlU3RhdGUoKTtcbiAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBwcm9jZXNzLnVwdGltZSgpfSBzYCkpO1xufSk7XG5cbi8qKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB5b3UgZXhwbGljaXRseSBydW4gcHJvY2Vzcy5leGl0KDApIHRvIHF1aXQsIGJlY2F1c2UgXCJiZWZvcmVFeGl0XCJcbiAqIHdvbid0IGJlIHRyaWdnZXJlZCBwcmlvciB0byBwcm9jZXNzLmV4aXQoMClcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVTdGF0ZSgpIHtcbiAgc2F2ZWQgPSB0cnVlO1xuICBpZiAoYWN0aW9uQ291bnQgPT09IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW3BhY2thZ2UtbWdyXSBzdGF0ZSBpcyBub3QgY2hhbmdlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBzdG9yZSA9IGF3YWl0IHN0YXRlRmFjdG9yeS5yb290U3RvcmVSZWFkeTtcbiAgY29uc3QgbWVyZ2VkU3RhdGUgPSBPYmplY3QuYXNzaWduKGxhc3RTYXZlZFN0YXRlLCBzdG9yZS5nZXRTdGF0ZSgpKTtcbiAgLy8gY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KG1lcmdlZFN0YXRlLCBudWxsLCAnICAnKTtcbiAgY29uc3QganNvblN0ciA9IHNlcmlhbGl6ZShtZXJnZWRTdGF0ZSwge3NwYWNlOiAnICAnfSk7XG4gIGZzLndyaXRlRmlsZShzdGF0ZUZpbGUsIGpzb25TdHIsXG4gICAgKCkgPT4ge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhgW3BhY2thZ2UtbWdyXSBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUpfSBzYXZlZCAoJHthY3Rpb25Db3VudH0pYCk7XG4gICAgfSk7XG59XG4iXX0=