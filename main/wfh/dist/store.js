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
const utils_1 = require("./utils");
// import './package-mgr'; 
// ensure slice and epic being initialized before create store, in which case not more lazy load
const stateFile = path_1.default.resolve(utils_1.getRootDir(), 'dist/dr-state.json');
/**
 * Since Redux-toolkit does not read initial state with any lazy slice that has not defined in root reducer,
 * e.g.
 * "Unexpected keys "clean", "packages" found in preloadedState argument passed to createStore.
 * Expected to find one of the known reducer keys instead: "main". Unexpected keys will be ignored.""
 *
 * I have to export saved state, so that eacy lazy slice can initialize its own slice state by themself
 */
exports.lastSavedState = fs_1.default.existsSync(stateFile) ? JSON.parse(fs_1.default.readFileSync(stateFile, 'utf8') || '{}') : {};
exports.stateFactory = new redux_toolkit_observable_1.StateFactory(exports.lastSavedState);
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
        })).subscribe();
    });
}
exports.startLogging = startLogging;
function saveState() {
    return __awaiter(this, void 0, void 0, function* () {
        const store = yield exports.stateFactory.rootStoreReady;
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        const jsonStr = JSON.stringify(mergedState, null, '  ');
        fs_1.default.writeFile(stateFile, jsonStr, () => {
            // tslint:disable-next-line: no-console
            console.log(`[package-mgr] state file ${path_1.default.relative(process.cwd(), stateFile)} saved`);
        });
    });
}
exports.saveState = saveState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDhDQUFtQztBQUNuQywyR0FBMkc7QUFJbkcsZ0dBSmMsMENBQWUsT0FJZDtBQUh2QixvREFBNEI7QUFDNUIsbUNBQW1DO0FBR25DLDJCQUEyQjtBQUMzQixnR0FBZ0c7QUFFaEcsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBVSxFQUFFLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztBQUVuRTs7Ozs7OztHQU9HO0FBQ1UsUUFBQSxjQUFjLEdBQUcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRXhHLFFBQUEsWUFBWSxHQUFHLElBQUksdUNBQVksQ0FBQyxzQkFBYyxDQUFDLENBQUM7QUFFN0QsU0FBc0IsWUFBWTs7UUFDaEMsTUFBTSxVQUFVLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sU0FBUyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFFbkUsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNwQixlQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDWCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPO2dCQUN0QixRQUFRLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN6QyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO2dCQUM1QixTQUFTLENBQUMsSUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLG1DQUFtQzs7Z0JBRWxDLFVBQVUsQ0FBQyxLQUFhLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQWhCRCxvQ0FnQkM7QUFFRCxTQUFzQixTQUFTOztRQUM3QixNQUFNLEtBQUssR0FBRyxNQUFNLG9CQUFZLENBQUMsY0FBYyxDQUFDO1FBQ2hELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsc0JBQWMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNwRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDeEQsWUFBRSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUM3QixHQUFHLEVBQUU7WUFDSCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNGLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztDQUFBO0FBVEQsOEJBU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3RhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscyc7XG5cbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9ufTtcbi8vIGltcG9ydCAnLi9wYWNrYWdlLW1ncic7IFxuLy8gZW5zdXJlIHNsaWNlIGFuZCBlcGljIGJlaW5nIGluaXRpYWxpemVkIGJlZm9yZSBjcmVhdGUgc3RvcmUsIGluIHdoaWNoIGNhc2Ugbm90IG1vcmUgbGF6eSBsb2FkXG5cbmNvbnN0IHN0YXRlRmlsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdkaXN0L2RyLXN0YXRlLmpzb24nKTtcblxuLyoqXG4gKiBTaW5jZSBSZWR1eC10b29sa2l0IGRvZXMgbm90IHJlYWQgaW5pdGlhbCBzdGF0ZSB3aXRoIGFueSBsYXp5IHNsaWNlIHRoYXQgaGFzIG5vdCBkZWZpbmVkIGluIHJvb3QgcmVkdWNlcixcbiAqIGUuZy4gXG4gKiBcIlVuZXhwZWN0ZWQga2V5cyBcImNsZWFuXCIsIFwicGFja2FnZXNcIiBmb3VuZCBpbiBwcmVsb2FkZWRTdGF0ZSBhcmd1bWVudCBwYXNzZWQgdG8gY3JlYXRlU3RvcmUuXG4gKiBFeHBlY3RlZCB0byBmaW5kIG9uZSBvZiB0aGUga25vd24gcmVkdWNlciBrZXlzIGluc3RlYWQ6IFwibWFpblwiLiBVbmV4cGVjdGVkIGtleXMgd2lsbCBiZSBpZ25vcmVkLlwiXCJcbiAqIFxuICogSSBoYXZlIHRvIGV4cG9ydCBzYXZlZCBzdGF0ZSwgc28gdGhhdCBlYWN5IGxhenkgc2xpY2UgY2FuIGluaXRpYWxpemUgaXRzIG93biBzbGljZSBzdGF0ZSBieSB0aGVtc2VsZlxuICovXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgfHwgJ3t9JykgOiB7fTtcblxuZXhwb3J0IGNvbnN0IHN0YXRlRmFjdG9yeSA9IG5ldyBTdGF0ZUZhY3RvcnkobGFzdFNhdmVkU3RhdGUpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRMb2dnaW5nKCkge1xuICBjb25zdCBkZWZhdWx0TG9nID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlJyk7XG4gIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlLnN0YXRlJyk7XG4gIGNvbnN0IGxvZ0FjdGlvbiA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZS5hY3Rpb24nKTtcblxuICBzdGF0ZUZhY3RvcnkubG9nJC5waXBlKFxuICAgIHRhcChwYXJhbXMgPT4ge1xuICAgICAgaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJylcbiAgICAgICAgKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICAgIChsb2dBY3Rpb24uaW5mbyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlXG4gICAgICAgIChkZWZhdWx0TG9nLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVN0YXRlKCkge1xuICBjb25zdCBzdG9yZSA9IGF3YWl0IHN0YXRlRmFjdG9yeS5yb290U3RvcmVSZWFkeTtcbiAgY29uc3QgbWVyZ2VkU3RhdGUgPSBPYmplY3QuYXNzaWduKGxhc3RTYXZlZFN0YXRlLCBzdG9yZS5nZXRTdGF0ZSgpKTtcbiAgY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KG1lcmdlZFN0YXRlLCBudWxsLCAnICAnKTtcbiAgZnMud3JpdGVGaWxlKHN0YXRlRmlsZSwganNvblN0cixcbiAgICAoKSA9PiB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBbcGFja2FnZS1tZ3JdIHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSl9IHNhdmVkYCk7XG4gICAgfSk7XG59XG4iXX0=