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
exports.initAsChildProcess = exports.initProcess = exports.initConfig = void 0;
require("../node-path");
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("../config"));
const log = log4js_1.default.getLogger('plink.bootstrap-process');
process.on('uncaughtException', function (err) {
    // log.error('Uncaught exception', err, err.stack);
    log.error('Uncaught exception: ', err);
    throw err; // let PM2 handle exception
});
process.on('unhandledRejection', err => {
    // log.warn('unhandledRejection', err);
    log.error('unhandledRejection', err);
});
// const log = log4js.getLogger('bootstrap-process');
// export async function initConfigAsync(options: GlobalOptions) {
//   // initProcess(onShutdownSignal);
//   await config.init(options);
//   // logConfig(config());
//   return config;
// }
/**
 * Must invoke initProcess() or initAsChildProcess() before this function.
 * If this function is called from a child process or thread worker of Plink,
 * you may pass `JSON.parse(process.env.PLINK_CLI_OPTS!)` as parameter since
 * Plink's main process save `GlobalOptions` in environment variable "PLINK_CLI_OPTS",
 * so that child process gets same GlobalOptions as the main process does.
 * @param options
 */
function initConfig(options) {
    config_1.default.initSync(options);
    // logConfig(config());
    return config_1.default;
}
exports.initConfig = initConfig;
/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 *
 * DO NOT fork a child process on this function
 * @param onShutdownSignal
 */
function initProcess(onShutdownSignal) {
    process.on('SIGINT', function () {
        // eslint-disable-next-line no-console
        log.info('pid ' + process.pid + ': bye');
        void onShut();
    });
    // Be aware this is why "initProcess" can not be "fork"ed in a child process, it will keep alive for parent process's 'message' event
    process.on('message', function (msg) {
        if (msg === 'shutdown') {
            // eslint-disable-next-line no-console
            log.info('Recieve shutdown message from PM2, bye.');
            void onShut();
        }
    });
    const { saveState, stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore();
    function onShut() {
        return __awaiter(this, void 0, void 0, function* () {
            if (onShutdownSignal) {
                yield Promise.resolve(onShutdownSignal);
            }
            yield saveState();
            setImmediate(() => process.exit(0));
        });
    }
}
exports.initProcess = initProcess;
/**
 * Initialize redux-store for Plink.
 *
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread.
 *
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 * @param syncState send changed state back to main process
 */
function initAsChildProcess(syncState = false, onShutdownSignal) {
    const { saveState, stateFactory, startLogging, setSyncStateToMainProcess } = require('../store');
    process.on('SIGINT', function () {
        // eslint-disable-next-line no-console
        log.info('pid ' + process.pid + ': bye');
        if (onShutdownSignal) {
            void Promise.resolve(onShutdownSignal)
                .then(() => saveState())
                .then(() => {
                setImmediate(() => process.exit(0));
            });
        }
    });
    let needSaveState = process.env.__plink_save_state === '1';
    if (needSaveState) {
        process.env.__plink_save_state = '0';
    }
    startLogging();
    if (syncState && !needSaveState) {
        setSyncStateToMainProcess(true);
    }
    stateFactory.configureStore();
}
exports.initAsChildProcess = initAsChildProcess;
// export function forkCli(cliArgs: string[], opts: ForkOptions = {}) {
//   const cp = fork(require.resolve('../cmd-bootstrap'), cliArgs, {...opts, stdio: ['ignore', 'inherit', 'inherit', 'ipc']});
//   cp.on('message', (msg) => {
//     if (store.isStateSyncMsg(msg)) {
//       log.info('Recieve state sync message from forked process');
//       store.stateFactory.actionsToDispatch.next({type: '::syncState', payload(state: any) {
//         return eval('(' + msg.data + ')');
//       }});
//     }
//   });
//   return cp;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3QkFBc0I7QUFDdEIsb0RBQTRCO0FBQzVCLHVEQUErQjtBQUsvQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXhELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLG1EQUFtRDtJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyx1Q0FBdUM7SUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUVILHFEQUFxRDtBQUVyRCxrRUFBa0U7QUFDbEUsc0NBQXNDO0FBQ3RDLGdDQUFnQztBQUNoQyw0QkFBNEI7QUFDNUIsbUJBQW1CO0FBQ25CLElBQUk7QUFFSjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLE9BQXNCO0lBQy9DLGdCQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLHVCQUF1QjtJQUN2QixPQUFPLGdCQUFNLENBQUM7QUFDaEIsQ0FBQztBQUpELGdDQUlDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLGdCQUE0QztJQUN0RSxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNuQixzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6QyxLQUFLLE1BQU0sRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gscUlBQXFJO0lBQ3JJLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztRQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7WUFDdEIsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQztZQUNwRCxLQUFLLE1BQU0sRUFBRSxDQUFDO1NBQ2Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQWlCLENBQUM7SUFDcEYsWUFBWSxFQUFFLENBQUM7SUFDZixZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFFOUIsU0FBZSxNQUFNOztZQUNuQixJQUFJLGdCQUFnQixFQUFFO2dCQUNwQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzthQUN6QztZQUNELE1BQU0sU0FBUyxFQUFFLENBQUM7WUFDbEIsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDO0tBQUE7QUFDSCxDQUFDO0FBMUJELGtDQTBCQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxLQUFLLEVBQUUsZ0JBQTRDO0lBQ2hHLE1BQU0sRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSx5QkFBeUIsRUFBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQWlCLENBQUM7SUFDL0csT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7UUFDbkIsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDekMsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixLQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7aUJBQ3JDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQztpQkFDdkIsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDVCxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEtBQUssR0FBRyxDQUFDO0lBQzNELElBQUksYUFBYSxFQUFFO1FBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsR0FBRyxDQUFDO0tBQ3RDO0lBRUQsWUFBWSxFQUFFLENBQUM7SUFDZixJQUFJLFNBQVMsSUFBSSxDQUFDLGFBQWEsRUFBRTtRQUMvQix5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNqQztJQUNELFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztBQUNoQyxDQUFDO0FBeEJELGdEQXdCQztBQUVELHVFQUF1RTtBQUN2RSw4SEFBOEg7QUFDOUgsZ0NBQWdDO0FBQ2hDLHVDQUF1QztBQUN2QyxvRUFBb0U7QUFDcEUsOEZBQThGO0FBQzlGLDZDQUE2QztBQUM3QyxhQUFhO0FBQ2IsUUFBUTtBQUNSLFFBQVE7QUFDUixlQUFlO0FBQ2YsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbi8vIGltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmJvb3RzdHJhcC1wcm9jZXNzJyk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIC8vIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyKTtcbiAgdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICAvLyBsb2cud2FybigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbiAgbG9nLmVycm9yKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xufSk7XG5cbi8vIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2Jvb3RzdHJhcC1wcm9jZXNzJyk7XG5cbi8vIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0Q29uZmlnQXN5bmMob3B0aW9uczogR2xvYmFsT3B0aW9ucykge1xuLy8gICAvLyBpbml0UHJvY2VzcyhvblNodXRkb3duU2lnbmFsKTtcbi8vICAgYXdhaXQgY29uZmlnLmluaXQob3B0aW9ucyk7XG4vLyAgIC8vIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4vLyAgIHJldHVybiBjb25maWc7XG4vLyB9XG5cbi8qKlxuICogTXVzdCBpbnZva2UgaW5pdFByb2Nlc3MoKSBvciBpbml0QXNDaGlsZFByb2Nlc3MoKSBiZWZvcmUgdGhpcyBmdW5jdGlvbi5cbiAqIElmIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYSBjaGlsZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXIgb2YgUGxpbmssXG4gKiB5b3UgbWF5IHBhc3MgYEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKWAgYXMgcGFyYW1ldGVyIHNpbmNlXG4gKiBQbGluaydzIG1haW4gcHJvY2VzcyBzYXZlIGBHbG9iYWxPcHRpb25zYCBpbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIlBMSU5LX0NMSV9PUFRTXCIsXG4gKiBzbyB0aGF0IGNoaWxkIHByb2Nlc3MgZ2V0cyBzYW1lIEdsb2JhbE9wdGlvbnMgYXMgdGhlIG1haW4gcHJvY2VzcyBkb2VzLlxuICogQHBhcmFtIG9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0Q29uZmlnKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMpIHtcbiAgY29uZmlnLmluaXRTeW5jKG9wdGlvbnMpO1xuICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG4vKipcbiAqIC0gUmVnaXN0ZXIgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmRcbiAqIC0gSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmtcbiAqIFxuICogRE8gTk9UIGZvcmsgYSBjaGlsZCBwcm9jZXNzIG9uIHRoaXMgZnVuY3Rpb25cbiAqIEBwYXJhbSBvblNodXRkb3duU2lnbmFsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFByb2Nlc3Mob25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygncGlkICcgKyBwcm9jZXNzLnBpZCArICc6IGJ5ZScpO1xuICAgIHZvaWQgb25TaHV0KCk7XG4gIH0pO1xuICAvLyBCZSBhd2FyZSB0aGlzIGlzIHdoeSBcImluaXRQcm9jZXNzXCIgY2FuIG5vdCBiZSBcImZvcmtcImVkIGluIGEgY2hpbGQgcHJvY2VzcywgaXQgd2lsbCBrZWVwIGFsaXZlIGZvciBwYXJlbnQgcHJvY2VzcydzICdtZXNzYWdlJyBldmVudFxuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICAgIHZvaWQgb25TaHV0KCk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCB7c2F2ZVN0YXRlLCBzdGF0ZUZhY3RvcnksIHN0YXJ0TG9nZ2luZ30gPSByZXF1aXJlKCcuLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKG9uU2h1dGRvd25TaWduYWwpO1xuICAgIH1cbiAgICBhd2FpdCBzYXZlU3RhdGUoKTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rLlxuICogXG4gKiBVc2UgdGhpcyBmdW5jdGlvbiBpbnN0ZWFkIG9mIGluaXRQcm9jZXNzKCkgaW4gY2FzZSBpdCBpcyBpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzIG9yIHdvcmtlciB0aHJlYWQuXG4gKiBcbiAqIFVubGluayBpbml0UHJvY2VzcygpIHdoaWNoIHJlZ2lzdGVycyBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZCxcbiAqIGluIGNhc2UgdGhpcyBpcyBydW5uaW5nIGFzIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwgc3RhbmQgYnkgdW50aWwgcGFyZW50IHByb2Nlc3MgZXhwbGljaXRseVxuICogIHNlbmRzIGEgc2lnbmFsIHRvIGV4aXRcbiAqIEBwYXJhbSBzeW5jU3RhdGUgc2VuZCBjaGFuZ2VkIHN0YXRlIGJhY2sgdG8gbWFpbiBwcm9jZXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0QXNDaGlsZFByb2Nlc3Moc3luY1N0YXRlID0gZmFsc2UsIG9uU2h1dGRvd25TaWduYWw/OiAoKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+KSB7XG4gIGNvbnN0IHtzYXZlU3RhdGUsIHN0YXRlRmFjdG9yeSwgc3RhcnRMb2dnaW5nLCBzZXRTeW5jU3RhdGVUb01haW5Qcm9jZXNzfSA9IHJlcXVpcmUoJy4uL3N0b3JlJykgYXMgdHlwZW9mIHN0b3JlO1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdwaWQgJyArIHByb2Nlc3MucGlkICsgJzogYnllJyk7XG4gICAgaWYgKG9uU2h1dGRvd25TaWduYWwpIHtcbiAgICAgIHZvaWQgUHJvbWlzZS5yZXNvbHZlKG9uU2h1dGRvd25TaWduYWwpXG4gICAgICAudGhlbigoKSA9PiBzYXZlU3RhdGUoKSlcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHByb2Nlc3MuZXhpdCgwKSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCBuZWVkU2F2ZVN0YXRlID0gcHJvY2Vzcy5lbnYuX19wbGlua19zYXZlX3N0YXRlID09PSAnMSc7XG4gIGlmIChuZWVkU2F2ZVN0YXRlKSB7XG4gICAgcHJvY2Vzcy5lbnYuX19wbGlua19zYXZlX3N0YXRlID0gJzAnO1xuICB9XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIGlmIChzeW5jU3RhdGUgJiYgIW5lZWRTYXZlU3RhdGUpIHtcbiAgICBzZXRTeW5jU3RhdGVUb01haW5Qcm9jZXNzKHRydWUpO1xuICB9XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xufVxuXG4vLyBleHBvcnQgZnVuY3Rpb24gZm9ya0NsaShjbGlBcmdzOiBzdHJpbmdbXSwgb3B0czogRm9ya09wdGlvbnMgPSB7fSkge1xuLy8gICBjb25zdCBjcCA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCcuLi9jbWQtYm9vdHN0cmFwJyksIGNsaUFyZ3MsIHsuLi5vcHRzLCBzdGRpbzogWydpZ25vcmUnLCAnaW5oZXJpdCcsICdpbmhlcml0JywgJ2lwYyddfSk7XG4vLyAgIGNwLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuLy8gICAgIGlmIChzdG9yZS5pc1N0YXRlU3luY01zZyhtc2cpKSB7XG4vLyAgICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzdGF0ZSBzeW5jIG1lc3NhZ2UgZnJvbSBmb3JrZWQgcHJvY2VzcycpO1xuLy8gICAgICAgc3RvcmUuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoe3R5cGU6ICc6OnN5bmNTdGF0ZScsIHBheWxvYWQoc3RhdGU6IGFueSkge1xuLy8gICAgICAgICByZXR1cm4gZXZhbCgnKCcgKyBtc2cuZGF0YSArICcpJyk7XG4vLyAgICAgICB9fSk7XG4vLyAgICAgfVxuLy8gICB9KTtcbi8vICAgcmV0dXJuIGNwO1xuLy8gfVxuXG4iXX0=