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
        const defaultLog = log4js_1.default.getLogger('plink.store');
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
        const log = log4js_1.default.getLogger('plink.store');
        saved = true;
        if (actionCount === 0) {
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
            log.info(chalk_1.default.gray(`state file ${path_1.default.relative(process.cwd(), stateFile)} saved (${actionCount} actions)`));
        }
        catch (err) {
            // tslint:disable-next-line: no-console
            log.error(chalk_1.default.gray(`Failed to write state file ${path_1.default.relative(process.cwd(), stateFile)}`), err);
        }
    });
}
exports.saveState = saveState;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLHdEQUEyQjtBQUMzQiw4Q0FBMkM7QUFDM0MsMkdBQTJHO0FBU25HLGdHQVRjLDBDQUFlLE9BU2Q7QUFSdkIsb0RBQTRCO0FBQzVCLGdGQUE2QztBQUM3QyxpQ0FBbUM7QUFDbkMsbURBQTRDO0FBRTVDLGtEQUEwQjtBQUsxQixvQkFBWSxFQUFFLENBQUM7QUFFZixNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWMsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztBQUMzRyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDcEI7Ozs7Ozs7R0FPRztBQUNILE1BQU0sVUFBVSxHQUFHLFlBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDeEYsSUFBSSxVQUFVLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7SUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxTQUFTLEdBQUcsd0NBQXdDLENBQUMsQ0FBQztDQUM5RjtBQUNELG9DQUFvQztBQUN2QixRQUFBLGNBQWMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFaEUsUUFBQSxZQUFZLEdBQUcsSUFBSSx1Q0FBWSxDQUFDLHNCQUFjLENBQUMsQ0FBQztBQUU3RCxvQkFBWSxDQUFDLGlC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LENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVUsQ0FBQyxXQUFXLFdBQVcsV0FBVyxDQUFDLENBQUMsQ0FBQztTQUM3RjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osdUNBQXVDO1lBQ3ZDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyw4QkFBOEIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsU0FBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3RHO0lBQ0gsQ0FBQztDQUFBO0FBaENELDhCQWdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBmc2UgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHt0YXAsIGZpbHRlcn0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbn0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnc2VyaWFsaXplLWphdmFzY3JpcHQnO1xuaW1wb3J0IHtlbmFibGVNYXBTZXR9IGZyb20gJ2ltbWVyJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuLy8gaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcblxuZXhwb3J0IHtvZlBheWxvYWRBY3Rpb259O1xuXG5lbmFibGVNYXBTZXQoKTtcblxuY29uc3Qgc3RhdGVGaWxlID0gUGF0aC5yZXNvbHZlKChKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudikuZGlzdERpciwgJ3BsaW5rLXN0YXRlLmpzb24nKTtcbmxldCBhY3Rpb25Db3VudCA9IDA7XG4vKipcbiAqIFNpbmNlIFJlZHV4LXRvb2xraXQgZG9lcyBub3QgcmVhZCBpbml0aWFsIHN0YXRlIHdpdGggYW55IGxhenkgc2xpY2UgdGhhdCBoYXMgbm90IGRlZmluZWQgaW4gcm9vdCByZWR1Y2VyLFxuICogZS5nLiBcbiAqIFwiVW5leHBlY3RlZCBrZXlzIFwiY2xlYW5cIiwgXCJwYWNrYWdlc1wiIGZvdW5kIGluIHByZWxvYWRlZFN0YXRlIGFyZ3VtZW50IHBhc3NlZCB0byBjcmVhdGVTdG9yZS5cbiAqIEV4cGVjdGVkIHRvIGZpbmQgb25lIG9mIHRoZSBrbm93biByZWR1Y2VyIGtleXMgaW5zdGVhZDogXCJtYWluXCIuIFVuZXhwZWN0ZWQga2V5cyB3aWxsIGJlIGlnbm9yZWQuXCJcIlxuICogXG4gKiBJIGhhdmUgdG8gZXhwb3J0IHNhdmVkIHN0YXRlLCBzbyB0aGF0IGVhY3kgbGF6eSBzbGljZSBjYW4gaW5pdGlhbGl6ZSBpdHMgb3duIHNsaWNlIHN0YXRlIGJ5IHRoZW1zZWxmXG4gKi9cbmNvbnN0IHNhdmVkU3RvcmUgPSBmcy5leGlzdHNTeW5jKHN0YXRlRmlsZSkgPyBmcy5yZWFkRmlsZVN5bmMoc3RhdGVGaWxlLCAndXRmOCcpIDogbnVsbDtcbmlmIChzYXZlZFN0b3JlICYmIHNhdmVkU3RvcmUubGVuZ3RoID09PSAwKSB7XG4gIHRocm93IG5ldyBFcnJvcignRW1wdHJ5IHN0b3JlIGZpbGUgJyArIHN0YXRlRmlsZSArICcsIGRlbGV0ZSBpdCBhbmQgaW5pdGlhbCBuZXcgd29ya3NwYWNlcycpO1xufVxuLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1ldmFsXG5leHBvcnQgY29uc3QgbGFzdFNhdmVkU3RhdGUgPSBzYXZlZFN0b3JlID8gZXZhbCgnKCcgKyBzYXZlZFN0b3JlICsgJyknKSA6IHt9O1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbmV3IFN0YXRlRmFjdG9yeShsYXN0U2F2ZWRTdGF0ZSk7XG5cbnN0YXRlRmFjdG9yeS5hY3Rpb25zVG9EaXNwYXRjaC5waXBlKFxuICBmaWx0ZXIoYWN0aW9uID0+ICFhY3Rpb24udHlwZS5lbmRzV2l0aCgnL19pbml0JykpLFxuICB0YXAoKCkgPT4gYWN0aW9uQ291bnQrKylcbikuc3Vic2NyaWJlKCk7XG5cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0TG9nZ2luZygpIHtcbiAgY29uc3QgZGVmYXVsdExvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnN0b3JlJyk7XG4gIC8vIGNvbnN0IGxvZ1N0YXRlID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuc3RhdGUnKTtcbiAgY29uc3QgbG9nQWN0aW9uID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUuYWN0aW9uJyk7XG5cbiAgc3RhdGVGYWN0b3J5LmxvZyQucGlwZShcbiAgICB0YXAocGFyYW1zID0+IHtcbiAgICAgIGlmIChwYXJhbXNbMF0gPT09ICdzdGF0ZScpIHtcbiAgICAgICAgLy8gKGxvZ1N0YXRlLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJykge1xuICAgICAgICAobG9nQWN0aW9uLmRlYnVnIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIH0gZWxzZVxuICAgICAgICAoZGVmYXVsdExvZy5kZWJ1ZyBhcyBhbnkpKC4uLnBhcmFtcyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbn1cblxubGV0IHNhdmVkID0gZmFsc2U7XG4vKipcbiAqIGEgbGlzdGVuZXIgcmVnaXN0ZXJlZCBvbiB0aGUgJ2JlZm9yZUV4aXQnIGV2ZW50IGNhbiBtYWtlIGFzeW5jaHJvbm91cyBjYWxscywgXG4gKiBhbmQgdGhlcmVieSBjYXVzZSB0aGUgTm9kZS5qcyBwcm9jZXNzIHRvIGNvbnRpbnVlLlxuICogVGhlICdiZWZvcmVFeGl0JyBldmVudCBpcyBub3QgZW1pdHRlZCBmb3IgY29uZGl0aW9ucyBjYXVzaW5nIGV4cGxpY2l0IHRlcm1pbmF0aW9uLFxuICogc3VjaCBhcyBjYWxsaW5nIHByb2Nlc3MuZXhpdCgpIG9yIHVuY2F1Z2h0IGV4Y2VwdGlvbnMuXG4gKi9cbnByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCBhc3luYyAoY29kZSkgPT4ge1xuICBpZiAoc2F2ZWQpXG4gICAgcmV0dXJuO1xuICBzYXZlU3RhdGUoKTtcbiAgLy8gLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBwcm9jZXNzLnVwdGltZSgpfSBzYCkpO1xufSk7XG5cbi8qKlxuICogQ2FsbCB0aGlzIGZ1bmN0aW9uIGJlZm9yZSB5b3UgZXhwbGljaXRseSBydW4gcHJvY2Vzcy5leGl0KDApIHRvIHF1aXQsIGJlY2F1c2UgXCJiZWZvcmVFeGl0XCJcbiAqIHdvbid0IGJlIHRyaWdnZXJlZCBwcmlvciB0byBwcm9jZXNzLmV4aXQoMClcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNhdmVTdGF0ZSgpIHtcbiAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuc3RvcmUnKTtcbiAgc2F2ZWQgPSB0cnVlO1xuICBpZiAoYWN0aW9uQ291bnQgPT09IDApIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdzdGF0ZSBpcyBub3QgY2hhbmdlZCcpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFpc01haW5UaHJlYWQpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay5ncmF5KCdub3QgaW4gbWFpbiB0aHJlYWQsIHNraXAgc2F2aW5nIHN0YXRlJykpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAocHJvY2Vzcy5zZW5kKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oY2hhbGsuZ3JheSgnaW4gYSBmb3JrZWQgcHJvY2Vzcywgc2tpcCBzYXZpbmcgc3RhdGUnKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHN0b3JlID0gYXdhaXQgc3RhdGVGYWN0b3J5LnJvb3RTdG9yZVJlYWR5O1xuICBjb25zdCBtZXJnZWRTdGF0ZSA9IE9iamVjdC5hc3NpZ24obGFzdFNhdmVkU3RhdGUsIHN0b3JlLmdldFN0YXRlKCkpO1xuXG4gIGNvbnN0IGpzb25TdHIgPSBzZXJpYWxpemUobWVyZ2VkU3RhdGUsIHtzcGFjZTogJyAgJ30pO1xuICBmc2UubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoc3RhdGVGaWxlISkpO1xuICB0cnkge1xuICAgIGF3YWl0IGZzLnByb21pc2VzLndyaXRlRmlsZShzdGF0ZUZpbGUhLCBqc29uU3RyKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay5ncmF5KFxuICAgICAgYHN0YXRlIGZpbGUgJHtQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHN0YXRlRmlsZSEpfSBzYXZlZCAoJHthY3Rpb25Db3VudH0gYWN0aW9ucylgKSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5lcnJvcihjaGFsay5ncmF5KGBGYWlsZWQgdG8gd3JpdGUgc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlISl9YCksIGVycik7XG4gIH1cbn1cbiJdfQ==