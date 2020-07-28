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
exports.saveState = exports.startLogging = exports.stateFactory = exports.lastSavedState = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const operators_1 = require("rxjs/operators");
const redux_store_1 = require("./utils/redux-store");
const log4js_1 = __importDefault(require("log4js"));
// import './package-mgr'; 
// ensure slice and epic being initialized before create store, in which case not more lazy load
const stateFile = path_1.default.resolve('dist/dr-state.json');
/**
 * Since Redux-toolkit does not read initial state with any lazy slice that has not defined in root reducer,
 * e.g.
 * "Unexpected keys "clean", "packages" found in preloadedState argument passed to createStore.
 * Expected to find one of the known reducer keys instead: "main". Unexpected keys will be ignored.""
 *
 * I have to export saved state, so that eacy lazy slice can initialize its own slice state by themself
 */
exports.lastSavedState = fs_1.default.existsSync(stateFile) ? JSON.parse(fs_1.default.readFileSync(stateFile, 'utf8') || '{}') : {};
exports.stateFactory = new redux_store_1.StateFactory(exports.lastSavedState);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLDhDQUFtQztBQUNuQyxxREFBaUQ7QUFDakQsb0RBQTRCO0FBQzVCLDJCQUEyQjtBQUMzQixnR0FBZ0c7QUFFaEcsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBRXJEOzs7Ozs7O0dBT0c7QUFDVSxRQUFBLGNBQWMsR0FBRyxZQUFFLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFFeEcsUUFBQSxZQUFZLEdBQUcsSUFBSSwwQkFBWSxDQUFDLHNCQUFjLENBQUMsQ0FBQztBQUU3RCxTQUFzQixZQUFZOztRQUNoQyxNQUFNLFVBQVUsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzdELE1BQU0sUUFBUSxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakUsTUFBTSxTQUFTLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztRQUVuRSxvQkFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQ3BCLGVBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNYLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU87Z0JBQ3RCLFFBQVEsQ0FBQyxLQUFhLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ3pDLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVE7Z0JBQzVCLFNBQVMsQ0FBQyxJQUFZLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUMsbUNBQW1DOztnQkFFbEMsVUFBVSxDQUFDLEtBQWEsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBaEJELG9DQWdCQztBQUVELFNBQXNCLFNBQVM7O1FBQzdCLE1BQU0sS0FBSyxHQUFHLE1BQU0sb0JBQVksQ0FBQyxjQUFjLENBQUM7UUFDaEQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxzQkFBYyxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4RCxZQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQzdCLEdBQUcsRUFBRTtZQUNILHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDM0YsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDO0NBQUE7QUFURCw4QkFTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7dGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1N0YXRlRmFjdG9yeX0gZnJvbSAnLi91dGlscy9yZWR1eC1zdG9yZSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQgJy4vcGFja2FnZS1tZ3InOyBcbi8vIGVuc3VyZSBzbGljZSBhbmQgZXBpYyBiZWluZyBpbml0aWFsaXplZCBiZWZvcmUgY3JlYXRlIHN0b3JlLCBpbiB3aGljaCBjYXNlIG5vdCBtb3JlIGxhenkgbG9hZFxuXG5jb25zdCBzdGF0ZUZpbGUgPSBQYXRoLnJlc29sdmUoJ2Rpc3QvZHItc3RhdGUuanNvbicpO1xuXG4vKipcbiAqIFNpbmNlIFJlZHV4LXRvb2xraXQgZG9lcyBub3QgcmVhZCBpbml0aWFsIHN0YXRlIHdpdGggYW55IGxhenkgc2xpY2UgdGhhdCBoYXMgbm90IGRlZmluZWQgaW4gcm9vdCByZWR1Y2VyLFxuICogZS5nLiBcbiAqIFwiVW5leHBlY3RlZCBrZXlzIFwiY2xlYW5cIiwgXCJwYWNrYWdlc1wiIGZvdW5kIGluIHByZWxvYWRlZFN0YXRlIGFyZ3VtZW50IHBhc3NlZCB0byBjcmVhdGVTdG9yZS5cbiAqIEV4cGVjdGVkIHRvIGZpbmQgb25lIG9mIHRoZSBrbm93biByZWR1Y2VyIGtleXMgaW5zdGVhZDogXCJtYWluXCIuIFVuZXhwZWN0ZWQga2V5cyB3aWxsIGJlIGlnbm9yZWQuXCJcIlxuICogXG4gKiBJIGhhdmUgdG8gZXhwb3J0IHNhdmVkIHN0YXRlLCBzbyB0aGF0IGVhY3kgbGF6eSBzbGljZSBjYW4gaW5pdGlhbGl6ZSBpdHMgb3duIHNsaWNlIHN0YXRlIGJ5IHRoZW1zZWxmXG4gKi9cbmV4cG9ydCBjb25zdCBsYXN0U2F2ZWRTdGF0ZSA9IGZzLmV4aXN0c1N5bmMoc3RhdGVGaWxlKSA/IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHN0YXRlRmlsZSwgJ3V0ZjgnKSB8fCAne30nKSA6IHt9O1xuXG5leHBvcnQgY29uc3Qgc3RhdGVGYWN0b3J5ID0gbmV3IFN0YXRlRmFjdG9yeShsYXN0U2F2ZWRTdGF0ZSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydExvZ2dpbmcoKSB7XG4gIGNvbnN0IGRlZmF1bHRMb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdkci1jb21wLXBhY2thZ2Uuc3RvcmUnKTtcbiAgY29uc3QgbG9nU3RhdGUgPSBsb2c0anMuZ2V0TG9nZ2VyKCdkci1jb21wLXBhY2thZ2Uuc3RvcmUuc3RhdGUnKTtcbiAgY29uc3QgbG9nQWN0aW9uID0gbG9nNGpzLmdldExvZ2dlcignZHItY29tcC1wYWNrYWdlLnN0b3JlLmFjdGlvbicpO1xuXG4gIHN0YXRlRmFjdG9yeS5sb2ckLnBpcGUoXG4gICAgdGFwKHBhcmFtcyA9PiB7XG4gICAgICBpZiAocGFyYW1zWzBdID09PSAnc3RhdGUnKVxuICAgICAgICAobG9nU3RhdGUuZGVidWcgYXMgYW55KSguLi5wYXJhbXMuc2xpY2UoMSkpO1xuICAgICAgZWxzZSBpZiAocGFyYW1zWzBdID09PSAnYWN0aW9uJylcbiAgICAgICAgKGxvZ0FjdGlvbi5pbmZvIGFzIGFueSkoLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgICAgLy8gY29uc29sZS5sb2coLi4ucGFyYW1zLnNsaWNlKDEpKTtcbiAgICAgIGVsc2VcbiAgICAgICAgKGRlZmF1bHRMb2cuZGVidWcgYXMgYW55KSguLi5wYXJhbXMpO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzYXZlU3RhdGUoKSB7XG4gIGNvbnN0IHN0b3JlID0gYXdhaXQgc3RhdGVGYWN0b3J5LnJvb3RTdG9yZVJlYWR5O1xuICBjb25zdCBtZXJnZWRTdGF0ZSA9IE9iamVjdC5hc3NpZ24obGFzdFNhdmVkU3RhdGUsIHN0b3JlLmdldFN0YXRlKCkpO1xuICBjb25zdCBqc29uU3RyID0gSlNPTi5zdHJpbmdpZnkobWVyZ2VkU3RhdGUsIG51bGwsICcgICcpO1xuICBmcy53cml0ZUZpbGUoc3RhdGVGaWxlLCBqc29uU3RyLFxuICAgICgpID0+IHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFtwYWNrYWdlLW1ncl0gc3RhdGUgZmlsZSAke1BhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgc3RhdGVGaWxlKX0gc2F2ZWRgKTtcbiAgICB9KTtcbn1cbiJdfQ==