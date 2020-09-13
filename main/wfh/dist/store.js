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
const redux_toolkit_observable_1 = require("../../redux-toolkit-abservable/dist/redux-toolkit-observable");
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
                defaultLog.info(...params);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDhDQUEyQztBQUMzQywyR0FBMkc7QUFPbkcsZ0dBUGMsMENBQWUsT0FPZDtBQU52QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFLbkMsb0JBQVksRUFBRSxDQUFDO0FBRWYsMkJBQTJCO0FBQzNCLGdHQUFnRztBQUVoRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3RFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztBQUNwQjs7Ozs7OztHQU9HO0FBQ0gsb0NBQW9DO0FBQ3ZCLFFBQUEsY0FBYyxHQUFHLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUV0RyxRQUFBLFlBQVksR0FBRyxJQUFJLHVDQUFZLENBQUMsc0JBQWMsQ0FBQyxDQUFDO0FBRTdELG9CQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUNqQyxrQkFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUNqRCxlQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDekIsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUdkLFNBQXNCLFlBQVk7O1FBQ2hDLE1BQU0sVUFBVSxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUNqRSxNQUFNLFNBQVMsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBRW5FLG9CQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDcEIsZUFBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ1gsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTztnQkFDdEIsUUFBUSxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDekMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUTtnQkFDNUIsU0FBUyxDQUFDLElBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QyxtQ0FBbUM7O2dCQUVsQyxVQUFVLENBQUMsSUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7WUFFdEMsK0JBQStCO1lBQy9CLHNEQUFzRDtZQUN0RCxxQ0FBcUM7WUFDckMsdURBQXVEO1lBQ3ZELE9BQU87WUFDUCw0QkFBNEI7UUFDOUIsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNoQixDQUFDO0NBQUE7QUF2QkQsb0NBdUJDO0FBRUQsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO0FBQ2xCOzs7OztHQUtHO0FBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBTyxJQUFJLEVBQUUsRUFBRTtJQUN0QyxJQUFJLEtBQUs7UUFDUCxPQUFPO0lBQ1QsU0FBUyxFQUFFLENBQUM7SUFDWiwwQ0FBMEM7SUFDMUMsb0ZBQW9GO0FBQ3RGLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFSDs7O0dBR0c7QUFDSCxTQUFzQixTQUFTOztRQUM3QixLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2IsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFO1lBQ3JCLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDbEQsT0FBTztTQUNSO1FBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxvQkFBWSxDQUFDLGNBQWMsQ0FBQztRQUNoRCxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFjLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDcEUsMkRBQTJEO1FBQzNELE1BQU0sT0FBTyxHQUFHLDhCQUFTLENBQUMsV0FBVyxFQUFFLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7UUFDdEQsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUM3QixHQUFHLEVBQUU7WUFDSCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLFdBQVcsV0FBVyxHQUFHLENBQUMsQ0FBQztRQUM1RyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7Q0FBQTtBQWhCRCw4QkFnQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3RhcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuLi8uLi9yZWR1eC10b29sa2l0LWFic2VydmFibGUvZGlzdC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdzZXJpYWxpemUtamF2YXNjcmlwdCc7XG5pbXBvcnQge2VuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5lbmFibGVNYXBTZXQoKTtcblxuLy8gaW1wb3J0ICcuL3BhY2thZ2UtbWdyJzsgXG4vLyBlbnN1cmUgc2xpY2UgYW5kIGVwaWMgYmVpbmcgaW5pdGlhbGl6ZWQgYmVmb3JlIGNyZWF0ZSBzdG9yZSwgaW4gd2hpY2ggY2FzZSBub3QgbW9yZSBsYXp5IGxvYWRcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ2Rpc3QvcGxpbmstc3RhdGUuanNvbicpO1xubGV0IGFjdGlvbkNvdW50ID0gMDtcbi8qKlxuICogU2luY2UgUmVkdXgtdG9vbGtpdCBkb2VzIG5vdCByZWFkIGluaXRpYWwgc3RhdGUgd2l0aCBhbnkgbGF6eSBzbGljZSB0aGF0IGhhcyBub3QgZGVmaW5lZCBpbiByb290IHJlZHVjZXIsXG4gKiBlLmcuIFxuICogXCJVbmV4cGVjdGVkIGtleXMgXCJjbGVhblwiLCBcInBhY2thZ2VzXCIgZm91bmQgaW4gcHJlbG9hZGVkU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlLlxuICogRXhwZWN0ZWQgdG8gZmluZCBvbmUgb2YgdGhlIGtub3duIHJlZHVjZXIga2V5cyBpbnN0ZWFkOiBcIm1haW5cIi4gVW5leHBlY3RlZCBrZXlzIHdpbGwgYmUgaWdub3JlZC5cIlwiXG4gKiBcbiAqIEkgaGF2ZSB0byBleHBvcnQgc2F2ZWQgc3RhdGUsIHNvIHRoYXQgZWFjeSBsYXp5IHNsaWNlIGNhbiBpbml0aWFsaXplIGl0cyBvd24gc2xpY2Ugc3RhdGUgYnkgdGhlbXNlbGZcbiAqL1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBldmFsKCcoJyArIGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgKyAnKScpIDoge307XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcblxuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLnBpcGUoXG4gIGZpbHRlcihhY3Rpb24gPT4gIWFjdGlvbi50eXBlLmVuZHNXaXRoKCcvX2luaXQnKSksXG4gIHRhcCgoKSA9PiBhY3Rpb25Db3VudCsrKVxuKS5zdWJzY3JpYmUoKTtcblxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuICBjb25zdCBkZWZhdWx0TG9nID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlJyk7XG4gIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlLnN0YXRlJyk7XG4gIGNvbnN0IGxvZ0FjdGlvbiA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZS5hY3Rpb24nKTtcblxuICBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJylcbiAgICAgICAgKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICAgIChsb2dBY3Rpb24uaW5mbyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlXG4gICAgICAgIChkZWZhdWx0TG9nLmluZm8gYXMgYW55KSguLi5wYXJhbXMpO1xuXG4gICAgICAvLyBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKSB7XG4gICAgICAvLyAgIGNvbnNvbGUubG9nKCdbcmVkdXg6c3RhdGVdJywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIC8vIH0gZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJylcbiAgICAgIC8vICAgY29uc29sZS5sb2coJ1tyZWR1eDphY3Rpb25dJywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIC8vIGVsc2VcbiAgICAgIC8vICAgY29uc29sZS5sb2coLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5sZXQgc2F2ZWQgPSBmYWxzZTtcbi8qKlxuICogYSBsaXN0ZW5lciByZWdpc3RlcmVkIG9uIHRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgY2FuIG1ha2UgYXN5bmNocm9ub3VzIGNhbGxzLCBcbiAqIGFuZCB0aGVyZWJ5IGNhdXNlIHRoZSBOb2RlLmpzIHByb2Nlc3MgdG8gY29udGludWUuXG4gKiBUaGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGlzIG5vdCBlbWl0dGVkIGZvciBjb25kaXRpb25zIGNhdXNpbmcgZXhwbGljaXQgdGVybWluYXRpb24sXG4gKiBzdWNoIGFzIGNhbGxpbmcgcHJvY2Vzcy5leGl0KCkgb3IgdW5jYXVnaHQgZXhjZXB0aW9ucy5cbiAqL1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gIGlmIChzYXZlZClcbiAgICByZXR1cm47XG4gIHNhdmVTdGF0ZSgpO1xuICAvLyAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gY29uc29sZS5sb2coY2hhbGsuZ3JlZW4oYERvbmUgaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHByb2Nlc3MudXB0aW1lKCl9IHNgKSk7XG59KTtcblxuLyoqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHlvdSBleHBsaWNpdGx5IHJ1biBwcm9jZXNzLmV4aXQoMCkgdG8gcXVpdCwgYmVjYXVzZSBcImJlZm9yZUV4aXRcIlxuICogd29uJ3QgYmUgdHJpZ2dlcmVkIHByaW9yIHRvIHByb2Nlc3MuZXhpdCgwKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVN0YXRlKCkge1xuICBzYXZlZCA9IHRydWU7XG4gIGlmIChhY3Rpb25Db3VudCA9PT0gMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbcGFja2FnZS1tZ3JdIHN0YXRlIGlzIG5vdCBjaGFuZ2VkJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHN0b3JlID0gYXdhaXQgc3RhdGVGYWN0b3J5LnJvb3RTdG9yZVJlYWR5O1xuICBjb25zdCBtZXJnZWRTdGF0ZSA9IE9iamVjdC5hc3NpZ24obGFzdFNhdmVkU3RhdGUsIHN0b3JlLmdldFN0YXRlKCkpO1xuICAvLyBjb25zdCBqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkobWVyZ2VkU3RhdGUsIG51bGwsICcgICcpO1xuICBjb25zdCBqc29uU3RyID0gc2VyaWFsaXplKG1lcmdlZFN0YXRlLCB7c3BhY2U6ICcgICd9KTtcbiAgZnMud3JpdGVGaWxlKHN0YXRlRmlsZSwganNvblN0cixcbiAgICAoKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbcGFja2FnZS1tZ3JdIHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSl9IHNhdmVkICgke2FjdGlvbkNvdW50fSlgKTtcbiAgICB9KTtcbn1cbiJdfQ==