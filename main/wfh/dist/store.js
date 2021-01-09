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
const chalk_1 = __importDefault(require("chalk"));
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
            console.log(chalk_1.default.gray('[package-mgr] state is not changed'));
            return;
        }
        if (!worker_threads_1.isMainThread) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.gray('[package-mgr] not in main thread, skip saving state'));
            return;
        }
        if (process.send) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.gray('[package-mgr] in a forked process, skip saving state'));
            return;
        }
        const store = yield exports.stateFactory.rootStoreReady;
        const mergedState = Object.assign(exports.lastSavedState, store.getState());
        const jsonStr = serialize_javascript_1.default(mergedState, { space: '  ' });
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(stateFile));
        try {
            yield fs_1.default.promises.writeFile(stateFile, jsonStr);
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.gray(`[package-mgr] state file ${path_1.default.relative(process.cwd(), stateFile)} saved (${actionCount})`));
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.gray(`Failed to write state file ${path_1.default.relative(process.cwd(), stateFile)}`), err);
        }
    });
}
exports.saveState = saveState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUMzQiw4Q0FBMkM7QUFDM0MsMkdBQTJHO0FBU25HLGdHQVRjLDBDQUFlLE9BU2Q7QUFSdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQTRDO0FBRTVDLGtEQUEwQjtBQUsxQixvQkFBWSxFQUFFLENBQUM7QUFFZixNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWMsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUMzRyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDcEI7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxHQUFHLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDeEYsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7SUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLEdBQUcsd0NBQXdDLENBQUMsQ0FBQztDQUM5RjtBQUNELG9DQUFvQztBQUN2QixRQUFBLGNBQWMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFaEUsUUFBQSxZQUFZLEdBQUcsSUFBSSx1Q0FBWSxDQUFDLHNCQUFjLENBQUMsQ0FBQztBQUU3RCxvQkFBWSxDQUFDLGlC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LENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDakQsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FDcEIsNEJBQTRCLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVUsQ0FBQyxXQUFXLFdBQVcsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNuRztRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3hHO0lBQ0gsQ0FBQztDQUFBO0FBL0JELDhCQStCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHt0YXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnc2VyaWFsaXplLWphdmFzY3JpcHQnO1xuaW1wb3J0IHtlbmFibGVNYXBTZXR9IGZyb20gJ2ltbWVyJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5lbmFibGVNYXBTZXQoKTtcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKChKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudikuZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKTtcbmxldCBhY3Rpb25Db3VudCA9IDA7XG4vKipcbiAqIFNpbmNlIFJlZHV4LXRvb2xraXQgZG9lcyBub3QgcmVhZCBpbml0aWFsIHN0YXRlIHdpdGggYW55IGxhenkgc2xpY2UgdGhhdCBoYXMgbm90IGRlZmluZWQgaW4gcm9vdCByZWR1Y2VyLFxuICogZS5nLiBcbiAqIFwiVW5leHBlY3RlZCBrZXlzIFwiY2xlYW5cIiwgXCJwYWNrYWdlc1wiIGZvdW5kIGluIHByZWxvYWRlZFN0YXRlIGFyZ3VtZW50IHBhc3NlZCB0byBjcmVhdGVTdG9yZS5cbiAqIEV4cGVjdGVkIHRvIGZpbmQgb25lIG9mIHRoZSBrbm93biByZWR1Y2VyIGtleXMgaW5zdGVhZDogXCJtYWluXCIuIFVuZXhwZWN0ZWQga2V5cyB3aWxsIGJlIGlnbm9yZWQuXCJcIlxuICogXG4gKiBJIGhhdmUgdG8gZXhwb3J0IHNhdmVkIHN0YXRlLCBzbyB0aGF0IGVhY3kgbGF6eSBzbGljZSBjYW4gaW5pdGlhbGl6ZSBpdHMgb3duIHNsaWNlIHN0YXRlIGJ5IHRoZW1zZWxmXG4gKi9cbmNvbnN0IHNhdmVkU3RvcmUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBmcy5yZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmOCcpIDogbnVsbDtcbmlmIChzYXZlZFN0b3JlICYmIHNhdmVkU3RvcmUubGVuZ3RoID09PSAwKSB7XG4gIHRocm93IG5ldyBFcnJvcignRW1wdHJ5IHN0b3JlIGZpbGUgJyArIHN0YXRlRmlsZSArICcsIGRlbGV0ZSBpdCBhbmQgaW5pdGlhbCBuZXcgd29ya3NwYWNlcycpO1xufVxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBzYXZlZFN0b3JlID8gZXZhbCgnKCcgKyBzYXZlZFN0b3JlICsgJyknKSA6IHt9O1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbmV3IFN0YXRlRmFjdG9yeShsYXN0U2F2ZWRTdGF0ZSk7XG5cbnN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICBmaWx0ZXIoYWN0aW9uID0+ICFhY3Rpb24udHlwZS5lbmRzV2l0aCgnL19pbml0JykpLFxuICB0YXAoKCkgPT4gYWN0aW9uQ291bnQrKylcbikuc3Vic2NyaWJlKCk7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0TG9nZ2luZygpIHtcbiAgY29uc3QgZGVmYXVsdExvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ0B3ZmgvcGxpbmsuc3RvcmUnKTtcbiAgY29uc3QgbG9nU3RhdGUgPSBsb2c0anMuZ2V0TG9nZ2VyKCdAd2ZoL3BsaW5rLnN0b3JlLnN0YXRlJyk7XG4gIGNvbnN0IGxvZ0FjdGlvbiA9IGxvZzRqcy5nZXRMb2dnZXIoJ0B3ZmgvcGxpbmsuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpXG4gICAgICAgIChsb2dTdGF0ZS5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICBlbHNlIGlmIChwYXJhbXNbMF0gPT09ICdhY3Rpb24nKSB7XG4gICAgICAgIChsb2dBY3Rpb24uaW5mbyBhcyBhbnkpKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKC4uLnBhcmFtcy5zbGljZSgxKSk7XG4gICAgICB9IGVsc2VcbiAgICAgICAgKGRlZmF1bHRMb2cuZGVidWcgYXMgYW55KSguLi5wYXJhbXMpO1xuXG4gICAgICAvLyBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKSB7XG4gICAgICAvLyAgIGNvbnNvbGUubG9nKCdbcmVkdXg6c3RhdGVdJywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIC8vIH0gZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJylcbiAgICAgIC8vICAgY29uc29sZS5sb2coJ1tyZWR1eDphY3Rpb25dJywgLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIC8vIGVsc2VcbiAgICAgIC8vICAgY29uc29sZS5sb2coLi4ucGFyYW1zKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xufVxuXG5sZXQgc2F2ZWQgPSBmYWxzZTtcbi8qKlxuICogYSBsaXN0ZW5lciByZWdpc3RlcmVkIG9uIHRoZSAnYmVmb3JlRXhpdCcgZXZlbnQgY2FuIG1ha2UgYXN5bmNocm9ub3VzIGNhbGxzLCBcbiAqIGFuZCB0aGVyZWJ5IGNhdXNlIHRoZSBOb2RlLmpzIHByb2Nlc3MgdG8gY29udGludWUuXG4gKiBUaGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGlzIG5vdCBlbWl0dGVkIGZvciBjb25kaXRpb25zIGNhdXNpbmcgZXhwbGljaXQgdGVybWluYXRpb24sXG4gKiBzdWNoIGFzIGNhbGxpbmcgcHJvY2Vzcy5leGl0KCkgb3IgdW5jYXVnaHQgZXhjZXB0aW9ucy5cbiAqL1xucHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsIGFzeW5jIChjb2RlKSA9PiB7XG4gIGlmIChzYXZlZClcbiAgICByZXR1cm47XG4gIHNhdmVTdGF0ZSgpO1xuICAvLyAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gY29uc29sZS5sb2coY2hhbGsuZ3JlZW4oYERvbmUgaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHByb2Nlc3MudXB0aW1lKCl9IHNgKSk7XG59KTtcblxuLyoqXG4gKiBDYWxsIHRoaXMgZnVuY3Rpb24gYmVmb3JlIHlvdSBleHBsaWNpdGx5IHJ1biBwcm9jZXNzLmV4aXQoMCkgdG8gcXVpdCwgYmVjYXVzZSBcImJlZm9yZUV4aXRcIlxuICogd29uJ3QgYmUgdHJpZ2dlcmVkIHByaW9yIHRvIHByb2Nlc3MuZXhpdCgwKVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2F2ZVN0YXRlKCkge1xuICBzYXZlZCA9IHRydWU7XG4gIGlmIChhY3Rpb25Db3VudCA9PT0gMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkoJ1twYWNrYWdlLW1ncl0gc3RhdGUgaXMgbm90IGNoYW5nZWQnKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghaXNNYWluVGhyZWFkKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW3BhY2thZ2UtbWdyXSBub3QgaW4gbWFpbiB0aHJlYWQsIHNraXAgc2F2aW5nIHN0YXRlJykpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAocHJvY2Vzcy5zZW5kKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheSgnW3BhY2thZ2UtbWdyXSBpbiBhIGZvcmtlZCBwcm9jZXNzLCBza2lwIHNhdmluZyBzdGF0ZScpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgc3RvcmUgPSBhd2FpdCBzdGF0ZUZhY3Rvcnkucm9vdFN0b3JlUmVhZHk7XG4gIGNvbnN0IG1lcmdlZFN0YXRlID0gT2JqZWN0LmFzc2lnbihsYXN0U2F2ZWRTdGF0ZSwgc3RvcmUuZ2V0U3RhdGUoKSk7XG5cbiAgY29uc3QganNvblN0ciA9IHNlcmlhbGl6ZShtZXJnZWRTdGF0ZSwge3NwYWNlOiAnICAnfSk7XG4gIGZzZS5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShzdGF0ZUZpbGUhKSk7XG4gIHRyeSB7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKHN0YXRlRmlsZSEsIGpzb25TdHIpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmdyYXkoXG4gICAgICBgW3BhY2thZ2UtbWdyXSBzdGF0ZSBmaWxlICR7UGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBzdGF0ZUZpbGUhKX0gc2F2ZWQgKCR7YWN0aW9uQ291bnR9KWApKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY2hhbGsuZ3JheShgRmFpbGVkIHRvIHdyaXRlIHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSEpfWApLCBlcnIpO1xuICB9XG59XG4iXX0=