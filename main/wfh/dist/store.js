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
exports.startLogging = exports.stateFactory = exports.lastSavedState = exports.ofPayloadAction = void 0;
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
exports.stateFactory.actionsToDispatch.pipe(operators_1.tap(() => actionCount++)).subscribe();
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
function saveState() {
    return __awaiter(this, void 0, void 0, function* () {
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
    saved = true;
    saveState();
    // // tslint:disable-next-line: no-console
    // console.log(chalk.green(`Done in ${new Date().getTime() - process.uptime()} s`));
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDhDQUFtQztBQUNuQywyR0FBMkc7QUFPbkcsZ0dBUGMsMENBQWUsT0FPZDtBQU52QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFLbkMsb0JBQVksRUFBRSxDQUFDO0FBRWYsMkJBQTJCO0FBQzNCLGdHQUFnRztBQUVoRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0FBQ3RFLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztBQUNwQjs7Ozs7OztHQU9HO0FBQ0gsb0NBQW9DO0FBQ3ZCLFFBQUEsY0FBYyxHQUFHLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUV0RyxRQUFBLFlBQVksR0FBRyxJQUFJLHVDQUFZLENBQUMsc0JBQWMsQ0FBQyxDQUFDO0FBRTdELG9CQUFZLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7QUFHMUUsU0FBc0IsWUFBWTs7UUFDaEMsTUFBTSxVQUFVLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sU0FBUyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFFbkUsb0JBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUNwQixlQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDWCxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxPQUFPO2dCQUN0QixRQUFRLENBQUMsS0FBYSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN6QyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRO2dCQUM1QixTQUFTLENBQUMsSUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVDLG1DQUFtQzs7Z0JBRWxDLFVBQVUsQ0FBQyxLQUFhLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQztZQUV2QywrQkFBK0I7WUFDL0Isc0RBQXNEO1lBQ3RELHFDQUFxQztZQUNyQyx1REFBdUQ7WUFDdkQsT0FBTztZQUNQLDRCQUE0QjtRQUM5QixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQXZCRCxvQ0F1QkM7QUFFRCxTQUFlLFNBQVM7O1FBQ3RCLElBQUksV0FBVyxLQUFLLENBQUMsRUFBRTtZQUNyQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1lBQ2xELE9BQU87U0FDUjtRQUNELE1BQU0sS0FBSyxHQUFHLE1BQU0sb0JBQVksQ0FBQyxjQUFjLENBQUM7UUFDaEQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxzQkFBYyxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLDJEQUEyRDtRQUMzRCxNQUFNLE9BQU8sR0FBRyw4QkFBUyxDQUFDLFdBQVcsRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ3RELFlBQUUsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFDN0IsR0FBRyxFQUFFO1lBQ0gsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsQ0FBQyxXQUFXLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDNUcsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQUE7QUFFRCxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDbEI7Ozs7O0dBS0c7QUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFPLElBQUksRUFBRSxFQUFFO0lBQ3RDLElBQUksS0FBSztRQUNQLE9BQU87SUFDVCxLQUFLLEdBQUcsSUFBSSxDQUFDO0lBQ2IsU0FBUyxFQUFFLENBQUM7SUFDWiwwQ0FBMEM7SUFDMUMsb0ZBQW9GO0FBQ3RGLENBQUMsQ0FBQSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge3RhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1hYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnc2VyaWFsaXplLWphdmFzY3JpcHQnO1xuaW1wb3J0IHtlbmFibGVNYXBTZXR9IGZyb20gJ2ltbWVyJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9ufTtcblxuZW5hYmxlTWFwU2V0KCk7XG5cbi8vIGltcG9ydCAnLi9wYWNrYWdlLW1ncic7IFxuLy8gZW5zdXJlIHNsaWNlIGFuZCBlcGljIGJlaW5nIGluaXRpYWxpemVkIGJlZm9yZSBjcmVhdGUgc3RvcmUsIGluIHdoaWNoIGNhc2Ugbm90IG1vcmUgbGF6eSBsb2FkXG5cbmNvbnN0IHN0YXRlRmlsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdkaXN0L3BsaW5rLXN0YXRlLmpzb24nKTtcbmxldCBhY3Rpb25Db3VudCA9IDA7XG4vKipcbiAqIFNpbmNlIFJlZHV4LXRvb2xraXQgZG9lcyBub3QgcmVhZCBpbml0aWFsIHN0YXRlIHdpdGggYW55IGxhenkgc2xpY2UgdGhhdCBoYXMgbm90IGRlZmluZWQgaW4gcm9vdCByZWR1Y2VyLFxuICogZS5nLiBcbiAqIFwiVW5leHBlY3RlZCBrZXlzIFwiY2xlYW5cIiwgXCJwYWNrYWdlc1wiIGZvdW5kIGluIHByZWxvYWRlZFN0YXRlIGFyZ3VtZW50IHBhc3NlZCB0byBjcmVhdGVTdG9yZS5cbiAqIEV4cGVjdGVkIHRvIGZpbmQgb25lIG9mIHRoZSBrbm93biByZWR1Y2VyIGtleXMgaW5zdGVhZDogXCJtYWluXCIuIFVuZXhwZWN0ZWQga2V5cyB3aWxsIGJlIGlnbm9yZWQuXCJcIlxuICogXG4gKiBJIGhhdmUgdG8gZXhwb3J0IHNhdmVkIHN0YXRlLCBzbyB0aGF0IGVhY3kgbGF6eSBzbGljZSBjYW4gaW5pdGlhbGl6ZSBpdHMgb3duIHNsaWNlIHN0YXRlIGJ5IHRoZW1zZWxmXG4gKi9cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tZXZhbFxuZXhwb3J0IGNvbnN0IGxhc3RTYXZlZFN0YXRlID0gZnMuZXhpc3RzU3luYyhzdGF0ZUZpbGUpID8gZXZhbCgnKCcgKyBmcy5yZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmOCcpICsgJyknKSA6IHt9O1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbmV3IFN0YXRlRmFjdG9yeShsYXN0U2F2ZWRTdGF0ZSk7XG5cbnN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKHRhcCgoKSA9PiBhY3Rpb25Db3VudCsrKSkuc3Vic2NyaWJlKCk7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0TG9nZ2luZygpIHtcbiAgY29uc3QgZGVmYXVsdExvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZScpO1xuICBjb25zdCBsb2dTdGF0ZSA9IGxvZzRqcy5nZXRMb2dnZXIoJ2RyLWNvbXAtcGFja2FnZS5zdG9yZS5zdGF0ZScpO1xuICBjb25zdCBsb2dBY3Rpb24gPSBsb2c0anMuZ2V0TG9nZ2VyKCdkci1jb21wLXBhY2thZ2Uuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIChsb2dTdGF0ZS5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKVxuICAgICAgICAobG9nQWN0aW9uLmluZm8gYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG5cbiAgICAgIC8vIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpIHtcbiAgICAgIC8vICAgY29uc29sZS5sb2coJ1tyZWR1eDpzdGF0ZV0nLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgLy8gfSBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKVxuICAgICAgLy8gICBjb25zb2xlLmxvZygnW3JlZHV4OmFjdGlvbl0nLCAuLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgLy8gZWxzZVxuICAgICAgLy8gICBjb25zb2xlLmxvZyguLi5wYXJhbXMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNhdmVTdGF0ZSgpIHtcbiAgaWYgKGFjdGlvbkNvdW50ID09PSAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1twYWNrYWdlLW1ncl0gc3RhdGUgaXMgbm90IGNoYW5nZWQnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gIGNvbnN0IG1lcmdlZFN0YXRlID0gT2JqZWN0LmFzc2lnbihsYXN0U2F2ZWRTdGF0ZSwgc3RvcmUuZ2V0U3RhdGUoKSk7XG4gIC8vIGNvbnN0IGpzb25TdHIgPSBKU09OLnN0cmluZ2lmeShtZXJnZWRTdGF0ZSwgbnVsbCwgJyAgJyk7XG4gIGNvbnN0IGpzb25TdHIgPSBzZXJpYWxpemUobWVyZ2VkU3RhdGUsIHtzcGFjZTogJyAgJ30pO1xuICBmcy53cml0ZUZpbGUoc3RhdGVGaWxlLCBqc29uU3RyLFxuICAgICgpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtwYWNrYWdlLW1ncl0gc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlKX0gc2F2ZWQgKCR7YWN0aW9uQ291bnR9KWApO1xuICAgIH0pO1xufVxuXG5sZXQgc2F2ZWQgPSBmYWxzZTtcbi8qKlxuICogYSBsaXN0ZW5lciByZWdpc3RlcmVkIG9uIHRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgY2FuIG1ha2UgYXN5bmNocm9ub3VzIGNhbGxzLCBcbiAqIGFuZCB0aGVyZWJ5IGNhdXNlIHRoZSBOb2RlLmpzIHByb2Nlc3MgdG8gY29udGludWUuXG4gKiBUaGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGlzIG5vdCBlbWl0dGVkIGZvciBjb25kaXRpb25zIGNhdXNpbmcgZXhwbGljaXQgdGVybWluYXRpb24sXG4gKiBzdWNoIGFzIGNhbGxpbmcgcHJvY2Vzcy5leGl0KCkgb3IgdW5jYXVnaHQgZXhjZXB0aW9ucy5cbiAqL1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gIGlmIChzYXZlZClcbiAgICByZXR1cm47XG4gIHNhdmVkID0gdHJ1ZTtcbiAgc2F2ZVN0YXRlKCk7XG4gIC8vIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyBjb25zb2xlLmxvZyhjaGFsay5ncmVlbihgRG9uZSBpbiAke25ldyBEYXRlKCkuZ2V0VGltZSgpIC0gcHJvY2Vzcy51cHRpbWUoKX0gc2ApKTtcbn0pO1xuIl19