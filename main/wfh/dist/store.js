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
const serialize_javascript_1 = __importDefault(require("serialize-javascript"));
const immer_1 = require("immer");
const worker_threads_1 = require("worker_threads");
immer_1.enableMapSet();
const stateFile = path_1.default.resolve(JSON.parse(process.env.__plink).distDir, 'plink-state.json');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUMzQiw4Q0FBMkM7QUFDM0MsMkdBQTJHO0FBUW5HLGdHQVJjLDBDQUFlLE9BUWQ7QUFQdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQTRDO0FBTTVDLG9CQUFZLEVBQUUsQ0FBQztBQUVmLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYyxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO0FBQzNHLElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQztBQUNwQjs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxVQUFVLEdBQUcsWUFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBRSxDQUFDLFlBQVksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN4RixJQUFJLFVBQVUsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtJQUN6QyxNQUFNLElBQUksS0FBSyxDQUFDLG9CQUFvQixHQUFHLFNBQVMsR0FBRyx3Q0FBd0MsQ0FBQyxDQUFDO0NBQzlGO0FBQ0Qsb0NBQW9DO0FBQ3ZCLFFBQUEsY0FBYyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUVoRSxRQUFBLFlBQVksR0FBRyxJQUFJLHVDQUFZLENBQUMsc0JBQWMsQ0FBQyxDQUFDO0FBRTdELG9CQUFZLENBQUMsaUJBQWlCLENBQUMsSUFB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QUFDLEdBQUcsQ0FBQyw4QkFBOEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBVSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDM0YsT0FBTzthQUNSO1lBQ0QsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNEJBQTRCLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVUsQ0FBQyxXQUFXLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFDN0csQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQUE7QUFoQ0QsOEJBZ0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGZzZSBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge3RhcCwgZmlsdGVyfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9ufSBmcm9tICcuLi8uLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdzZXJpYWxpemUtamF2YXNjcmlwdCc7XG5pbXBvcnQge2VuYWJsZU1hcFNldH0gZnJvbSAnaW1tZXInO1xuaW1wb3J0IHtpc01haW5UaHJlYWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCB7b2ZQYXlsb2FkQWN0aW9ufTtcblxuZW5hYmxlTWFwU2V0KCk7XG5cbmNvbnN0IHN0YXRlRmlsZSA9IFBhdGgucmVzb2x2ZSgoSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnYpLmRpc3REaXIsICdwbGluay1zdGF0ZS5qc29uJyk7XG5sZXQgYWN0aW9uQ291bnQgPSAwO1xuLyoqXG4gKiBTaW5jZSBSZWR1eC10b29sa2l0IGRvZXMgbm90IHJlYWQgaW5pdGlhbCBzdGF0ZSB3aXRoIGFueSBsYXp5IHNsaWNlIHRoYXQgaGFzIG5vdCBkZWZpbmVkIGluIHJvb3QgcmVkdWNlcixcbiAqIGUuZy4gXG4gKiBcIlVuZXhwZWN0ZWQga2V5cyBcImNsZWFuXCIsIFwicGFja2FnZXNcIiBmb3VuZCBpbiBwcmVsb2FkZWRTdGF0ZSBhcmd1bWVudCBwYXNzZWQgdG8gY3JlYXRlU3RvcmUuXG4gKiBFeHBlY3RlZCB0byBmaW5kIG9uZSBvZiB0aGUga25vd24gcmVkdWNlciBrZXlzIGluc3RlYWQ6IFwibWFpblwiLiBVbmV4cGVjdGVkIGtleXMgd2lsbCBiZSBpZ25vcmVkLlwiXCJcbiAqIFxuICogSSBoYXZlIHRvIGV4cG9ydCBzYXZlZCBzdGF0ZSwgc28gdGhhdCBlYWN5IGxhenkgc2xpY2UgY2FuIGluaXRpYWxpemUgaXRzIG93biBzbGljZSBzdGF0ZSBieSB0aGVtc2VsZlxuICovXG5jb25zdCBzYXZlZFN0b3JlID0gZnMuZXhpc3RzU3luYyhzdGF0ZUZpbGUpID8gZnMucmVhZEZpbGVTeW5jKHN0YXRlRmlsZSwgJ3V0ZjgnKSA6IG51bGw7XG5pZiAoc2F2ZWRTdG9yZSAmJiBzYXZlZFN0b3JlLmxlbmd0aCA9PT0gMCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ0VtcHRyeSBzdG9yZSBmaWxlICcgKyBzdGF0ZUZpbGUgKyAnLCBkZWxldGUgaXQgYW5kIGluaXRpYWwgbmV3IHdvcmtzcGFjZXMnKTtcbn1cbi8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tZXZhbFxuZXhwb3J0IGNvbnN0IGxhc3RTYXZlZFN0YXRlID0gc2F2ZWRTdG9yZSA/IGV2YWwoJygnICsgc2F2ZWRTdG9yZSArICcpJykgOiB7fTtcblxuZXhwb3J0IGNvbnN0IHN0YXRlRmFjdG9yeSA9IG5ldyBTdGF0ZUZhY3RvcnkobGFzdFNhdmVkU3RhdGUpO1xuXG5zdGF0ZUZhY3RvcnkuYWN0aW9uc1RvRGlzcGF0Y2gucGlwZShcbiAgZmlsdGVyKGFjdGlvbiA9PiAhYWN0aW9uLnR5cGUuZW5kc1dpdGgoJy9faW5pdCcpKSxcbiAgdGFwKCgpID0+IGFjdGlvbkNvdW50KyspXG4pLnN1YnNjcmliZSgpO1xuXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydExvZ2dpbmcoKSB7XG4gIGNvbnN0IGRlZmF1bHRMb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL3BsaW5rLnN0b3JlJyk7XG4gIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcignQHdmaC9wbGluay5zdG9yZS5zdGF0ZScpO1xuICBjb25zdCBsb2dBY3Rpb24gPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL3BsaW5rLnN0b3JlLmFjdGlvbicpO1xuXG4gIHN0YXRlRmFjdG9yeS5sb2ckLnBpcGUoXG4gICAgdGFwKHBhcmFtcyA9PiB7XG4gICAgICBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKVxuICAgICAgICAobG9nU3RhdGUuZGVidWcgYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJykge1xuICAgICAgICAobG9nQWN0aW9uLmluZm8gYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgICAvLyBjb25zb2xlLmxvZyguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgfSBlbHNlXG4gICAgICAgIChkZWZhdWx0TG9nLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zKTtcblxuICAgICAgLy8gaWYgKHBhcmFtc1swXSA9PT0gJ3N0YXRlJykge1xuICAgICAgLy8gICBjb25zb2xlLmxvZygnW3JlZHV4OnN0YXRlXScsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAvLyB9IGVsc2UgaWYgKHBhcmFtc1swXSA9PT0gJ2FjdGlvbicpXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKCdbcmVkdXg6YWN0aW9uXScsIC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAvLyBlbHNlXG4gICAgICAvLyAgIGNvbnNvbGUubG9nKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxubGV0IHNhdmVkID0gZmFsc2U7XG4vKipcbiAqIGEgbGlzdGVuZXIgcmVnaXN0ZXJlZCBvbiB0aGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGNhbiBtYWtlIGFzeW5jaHJvbm91cyBjYWxscywgXG4gKiBhbmQgdGhlcmVieSBjYXVzZSB0aGUgTm9kZS5qcyBwcm9jZXNzIHRvIGNvbnRpbnVlLlxuICogVGhlICdiZWZvcmVFeGl0JyBldmVudCBpcyBub3QgZW1pdHRlZCBmb3IgY29uZGl0aW9ucyBjYXVzaW5nIGV4cGxpY2l0IHRlcm1pbmF0aW9uLFxuICogc3VjaCBhcyBjYWxsaW5nIHByb2Nlc3MuZXhpdCgpIG9yIHVuY2F1Z2h0IGV4Y2VwdGlvbnMuXG4gKi9cbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCBhc3luYyAoY29kZSkgPT4ge1xuICBpZiAoc2F2ZWQpXG4gICAgcmV0dXJuO1xuICBzYXZlU3RhdGUoKTtcbiAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBwcm9jZXNzLnVwdGltZSgpfSBzYCkpO1xufSk7XG5cbi8qKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB5b3UgZXhwbGljaXRseSBydW4gcHJvY2Vzcy5leGl0KDApIHRvIHF1aXQsIGJlY2F1c2UgXCJiZWZvcmVFeGl0XCJcbiAqIHdvbid0IGJlIHRyaWdnZXJlZCBwcmlvciB0byBwcm9jZXNzLmV4aXQoMClcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVTdGF0ZSgpIHtcbiAgc2F2ZWQgPSB0cnVlO1xuICBpZiAoYWN0aW9uQ291bnQgPT09IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW3BhY2thZ2UtbWdyXSBzdGF0ZSBpcyBub3QgY2hhbmdlZCcpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWlzTWFpblRocmVhZCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbcGFja2FnZS1tZ3JdIG5vdCBpbiBtYWluIHRocmVhZCwgc2tpcCBzYXZpbmcgc3RhdGUnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKHByb2Nlc3Muc2VuZCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbcGFja2FnZS1tZ3JdIGluIGEgZm9ya2VkIHByb2Nlc3MsIHNraXAgc2F2aW5nIHN0YXRlJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHN0b3JlID0gYXdhaXQgc3RhdGVGYWN0b3J5LnJvb3RTdG9yZVJlYWR5O1xuICBjb25zdCBtZXJnZWRTdGF0ZSA9IE9iamVjdC5hc3NpZ24obGFzdFNhdmVkU3RhdGUsIHN0b3JlLmdldFN0YXRlKCkpO1xuXG4gIGNvbnN0IGpzb25TdHIgPSBzZXJpYWxpemUobWVyZ2VkU3RhdGUsIHtzcGFjZTogJyAgJ30pO1xuICBmc2UubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoc3RhdGVGaWxlISkpO1xuICBmcy53cml0ZUZpbGUoc3RhdGVGaWxlISwganNvblN0cixcbiAgICAoZXJyKSA9PiB7XG4gICAgICBpZiAoZXJyKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhgRmFpbGVkIHRvIHdyaXRlIHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSEpfWAsIGVycik7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtwYWNrYWdlLW1ncl0gc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlISl9IHNhdmVkICgke2FjdGlvbkNvdW50fSlgKTtcbiAgICB9KTtcbn1cbiJdfQ==