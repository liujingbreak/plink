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
        // const jsonStr = JSON.stringify(mergedState, null, '  ');
        const jsonStr = serialize_javascript_1.default(mergedState, { space: '  ' });
        fs_1.default.writeFile(stateFile, jsonStr, () => {
            // tslint:disable-next-line: no-console
            console.log(`[package-mgr] state file ${path_1.default.relative(process.cwd(), stateFile)} saved`);
        });
    });
}
exports.saveState = saveState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDhDQUFtQztBQUNuQywyR0FBMkc7QUFNbkcsZ0dBTmMsMENBQWUsT0FNZDtBQUx2QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFJbkMsb0JBQVksRUFBRSxDQUFDO0FBRWYsMkJBQTJCO0FBQzNCLGdHQUFnRztBQUVoRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0FBRXRFOzs7Ozs7O0dBT0c7QUFDSCxvQ0FBb0M7QUFDdkIsUUFBQSxjQUFjLEdBQUcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBRXRHLFFBQUEsWUFBWSxHQUFHLElBQUksdUNBQVksQ0FBQyxzQkFBYyxDQUFDLENBQUM7QUFFN0QsU0FBc0IsWUFBWTs7UUFDaEMsTUFBTSxVQUFVLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sU0FBUyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFFbkUsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNwQixlQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDWCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPO2dCQUN0QixRQUFRLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN6QyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO2dCQUM1QixTQUFTLENBQUMsSUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLG1DQUFtQzs7Z0JBRWxDLFVBQVUsQ0FBQyxLQUFhLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQWhCRCxvQ0FnQkM7QUFFRCxTQUFzQixTQUFTOztRQUM3QixNQUFNLEtBQUssR0FBRyxNQUFNLG9CQUFZLENBQUMsY0FBYyxDQUFDO1FBQ2hELE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsc0JBQWMsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNwRSwyREFBMkQ7UUFDM0QsTUFBTSxPQUFPLEdBQUcsOEJBQVMsQ0FBQyxXQUFXLEVBQUUsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN0RCxZQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQzdCLEdBQUcsRUFBRTtZQUNILHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0YsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQUE7QUFWRCw4QkFVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7dGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuLi8uLi9yZWR1eC10b29sa2l0LWFic2VydmFibGUvZGlzdC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdzZXJpYWxpemUtamF2YXNjcmlwdCc7XG5pbXBvcnQge2VuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuXG5leHBvcnQge29mUGF5bG9hZEFjdGlvbn07XG5cbmVuYWJsZU1hcFNldCgpO1xuXG4vLyBpbXBvcnQgJy4vcGFja2FnZS1tZ3InOyBcbi8vIGVuc3VyZSBzbGljZSBhbmQgZXBpYyBiZWluZyBpbml0aWFsaXplZCBiZWZvcmUgY3JlYXRlIHN0b3JlLCBpbiB3aGljaCBjYXNlIG5vdCBtb3JlIGxhenkgbG9hZFxuXG5jb25zdCBzdGF0ZUZpbGUgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnZGlzdC9wbGluay1zdGF0ZS5qc29uJyk7XG5cbi8qKlxuICogU2luY2UgUmVkdXgtdG9vbGtpdCBkb2VzIG5vdCByZWFkIGluaXRpYWwgc3RhdGUgd2l0aCBhbnkgbGF6eSBzbGljZSB0aGF0IGhhcyBub3QgZGVmaW5lZCBpbiByb290IHJlZHVjZXIsXG4gKiBlLmcuIFxuICogXCJVbmV4cGVjdGVkIGtleXMgXCJjbGVhblwiLCBcInBhY2thZ2VzXCIgZm91bmQgaW4gcHJlbG9hZGVkU3RhdGUgYXJndW1lbnQgcGFzc2VkIHRvIGNyZWF0ZVN0b3JlLlxuICogRXhwZWN0ZWQgdG8gZmluZCBvbmUgb2YgdGhlIGtub3duIHJlZHVjZXIga2V5cyBpbnN0ZWFkOiBcIm1haW5cIi4gVW5leHBlY3RlZCBrZXlzIHdpbGwgYmUgaWdub3JlZC5cIlwiXG4gKiBcbiAqIEkgaGF2ZSB0byBleHBvcnQgc2F2ZWQgc3RhdGUsIHNvIHRoYXQgZWFjeSBsYXp5IHNsaWNlIGNhbiBpbml0aWFsaXplIGl0cyBvd24gc2xpY2Ugc3RhdGUgYnkgdGhlbXNlbGZcbiAqL1xuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBldmFsKCcoJyArIGZzLnJlYWRGaWxlU3luYyhzdGF0ZUZpbGUsICd1dGY4JykgKyAnKScpIDoge307XG5cbmV4cG9ydCBjb25zdCBzdGF0ZUZhY3RvcnkgPSBuZXcgU3RhdGVGYWN0b3J5KGxhc3RTYXZlZFN0YXRlKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0TG9nZ2luZygpIHtcbiAgY29uc3QgZGVmYXVsdExvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZScpO1xuICBjb25zdCBsb2dTdGF0ZSA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZS5zdGF0ZScpO1xuICBjb25zdCBsb2dBY3Rpb24gPSBsb2c0anMuZ2V0TG9nZ2VyKCdkci1jb21wLXBhY2thZ2Uuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIChsb2dTdGF0ZS5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKVxuICAgICAgICAobG9nQWN0aW9uLmluZm8gYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVTdGF0ZSgpIHtcbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gIGNvbnN0IG1lcmdlZFN0YXRlID0gT2JqZWN0LmFzc2lnbihsYXN0U2F2ZWRTdGF0ZSwgc3RvcmUuZ2V0U3RhdGUoKSk7XG4gIC8vIGNvbnN0IGpzb25TdHIgPSBKU09OLnN0cmluZ2lmeShtZXJnZWRTdGF0ZSwgbnVsbCwgJyAgJyk7XG4gIGNvbnN0IGpzb25TdHIgPSBzZXJpYWxpemUobWVyZ2VkU3RhdGUsIHtzcGFjZTogJyAgJ30pO1xuICBmcy53cml0ZUZpbGUoc3RhdGVGaWxlLCBqc29uU3RyLFxuICAgICgpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtwYWNrYWdlLW1ncl0gc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlKX0gc2F2ZWRgKTtcbiAgICB9KTtcbn1cbiJdfQ==