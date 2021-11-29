"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAsChildProcess = exports.initProcess = exports.initConfig = void 0;
require("../node-path");
const log4js_1 = __importDefault(require("log4js"));
const op = __importStar(require("rxjs/operators"));
const config_1 = __importDefault(require("../config"));
const log = log4js_1.default.getLogger('plink.bootstrap-process');
process.on('uncaughtException', function (err) {
    log.error('Uncaught exception: ', err);
    throw err; // let PM2 handle exception
});
process.on('unhandledRejection', err => {
    log.error('unhandledRejection', err);
});
/**
 * Must invoke initProcess() or initAsChildProcess() before this function.
 * If this function is called from a child process or thread worker of Plink,
 * you may pass `JSON.parse(process.env.PLINK_CLI_OPTS!)` as parameter since
 * Plink's main process save `GlobalOptions` in environment variable "PLINK_CLI_OPTS",
 * so that child process gets same GlobalOptions as the main process does.
 * @param options
 */
function initConfig(options = {}) {
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
function initProcess(saveState = true, onShutdownSignal, isChildProcess = false) {
    process.on('SIGINT', function () {
        // eslint-disable-next-line no-console
        log.info('pid ' + process.pid + ': bye');
        void onShut();
    });
    if (!isChildProcess) {
        // Be aware this is why "initProcess" can not be "fork"ed in a child process, it will keep alive for parent process's 'message' event
        process.on('message', function (msg) {
            if (msg === 'shutdown') {
                // eslint-disable-next-line no-console
                log.info('Recieve shutdown message from PM2, bye.');
                void onShut();
            }
        });
    }
    const { dispatcher, storeSavedAction$, stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore();
    dispatcher.changeActionOnExit('none');
    // if (isChildProcess && saveState)
    //   dispatcher.changeActionOnExit('save');
    // else if (!isChildProcess && !saveState) {
    //   dispatcher.changeActionOnExit('none');
    // }
    async function onShut() {
        if (onShutdownSignal) {
            await Promise.resolve(onShutdownSignal());
        }
        const saved = storeSavedAction$.pipe(op.take(1)).toPromise();
        dispatcher.processExit();
        await saved;
        setImmediate(() => process.exit(0));
    }
    return dispatcher;
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
function initAsChildProcess(saveState = false, onShutdownSignal) {
    return initProcess(saveState, onShutdownSignal, true);
}
exports.initAsChildProcess = initAsChildProcess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1QixtREFBcUM7QUFDckMsdURBQStCO0FBSy9CLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFFeEQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QyxNQUFNLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQjtBQUN4QyxDQUFDLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUNIOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixVQUFVLENBQUMsVUFBeUIsRUFBRTtJQUNwRCxnQkFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6Qix1QkFBdUI7SUFDdkIsT0FBTyxnQkFBTSxDQUFDO0FBQ2hCLENBQUM7QUFKRCxnQ0FJQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxFQUFFLGdCQUE0QyxFQUFFLGNBQWMsR0FBRyxLQUFLO0lBQ2hILE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO1FBQ25CLHNDQUFzQztRQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLEtBQUssTUFBTSxFQUFFLENBQUM7SUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLENBQUMsY0FBYyxFQUFFO1FBQ25CLHFJQUFxSTtRQUNySSxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7WUFDaEMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO2dCQUN0QixzQ0FBc0M7Z0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQztnQkFDcEQsS0FBSyxNQUFNLEVBQUUsQ0FBQzthQUNmO1FBQ0gsQ0FBQyxDQUFDLENBQUM7S0FDSjtJQUVELE1BQU0sRUFBQyxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQWlCLENBQUM7SUFFeEcsWUFBWSxFQUFFLENBQUM7SUFDZixZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFDOUIsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLG1DQUFtQztJQUNuQywyQ0FBMkM7SUFDM0MsNENBQTRDO0lBQzVDLDJDQUEyQztJQUMzQyxJQUFJO0lBRUosS0FBSyxVQUFVLE1BQU07UUFDbkIsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM3RCxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekIsTUFBTSxLQUFLLENBQUM7UUFDWixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBdENELGtDQXNDQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxLQUFLLEVBQUUsZ0JBQTRDO0lBQ2hHLE9BQU8sV0FBVyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRkQsZ0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG4vLyBpbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5ib290c3RyYXAtcHJvY2VzcycpO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyKTtcbiAgdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICBsb2cuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcbi8qKlxuICogTXVzdCBpbnZva2UgaW5pdFByb2Nlc3MoKSBvciBpbml0QXNDaGlsZFByb2Nlc3MoKSBiZWZvcmUgdGhpcyBmdW5jdGlvbi5cbiAqIElmIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYSBjaGlsZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXIgb2YgUGxpbmssXG4gKiB5b3UgbWF5IHBhc3MgYEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKWAgYXMgcGFyYW1ldGVyIHNpbmNlXG4gKiBQbGluaydzIG1haW4gcHJvY2VzcyBzYXZlIGBHbG9iYWxPcHRpb25zYCBpbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIlBMSU5LX0NMSV9PUFRTXCIsXG4gKiBzbyB0aGF0IGNoaWxkIHByb2Nlc3MgZ2V0cyBzYW1lIEdsb2JhbE9wdGlvbnMgYXMgdGhlIG1haW4gcHJvY2VzcyBkb2VzLlxuICogQHBhcmFtIG9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0Q29uZmlnKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMgPSB7fSkge1xuICBjb25maWcuaW5pdFN5bmMob3B0aW9ucyk7XG4gIC8vIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHJldHVybiBjb25maWc7XG59XG5cbi8qKlxuICogLSBSZWdpc3RlciBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZFxuICogLSBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGlua1xuICogXG4gKiBETyBOT1QgZm9yayBhIGNoaWxkIHByb2Nlc3Mgb24gdGhpcyBmdW5jdGlvblxuICogQHBhcmFtIG9uU2h1dGRvd25TaWduYWwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHJvY2VzcyhzYXZlU3RhdGUgPSB0cnVlLCBvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55PiwgaXNDaGlsZFByb2Nlc3MgPSBmYWxzZSkge1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdwaWQgJyArIHByb2Nlc3MucGlkICsgJzogYnllJyk7XG4gICAgdm9pZCBvblNodXQoKTtcbiAgfSk7XG4gIGlmICghaXNDaGlsZFByb2Nlc3MpIHtcbiAgICAvLyBCZSBhd2FyZSB0aGlzIGlzIHdoeSBcImluaXRQcm9jZXNzXCIgY2FuIG5vdCBiZSBcImZvcmtcImVkIGluIGEgY2hpbGQgcHJvY2VzcywgaXQgd2lsbCBrZWVwIGFsaXZlIGZvciBwYXJlbnQgcHJvY2VzcydzICdtZXNzYWdlJyBldmVudFxuICAgIHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgICAgIGlmIChtc2cgPT09ICdzaHV0ZG93bicpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMiwgYnllLicpO1xuICAgICAgICB2b2lkIG9uU2h1dCgpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qge2Rpc3BhdGNoZXIsIHN0b3JlU2F2ZWRBY3Rpb24kLCBzdGF0ZUZhY3RvcnksIHN0YXJ0TG9nZ2luZ30gPSByZXF1aXJlKCcuLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcblxuICBzdGFydExvZ2dpbmcoKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIGRpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdub25lJyk7XG4gIC8vIGlmIChpc0NoaWxkUHJvY2VzcyAmJiBzYXZlU3RhdGUpXG4gIC8vICAgZGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgLy8gZWxzZSBpZiAoIWlzQ2hpbGRQcm9jZXNzICYmICFzYXZlU3RhdGUpIHtcbiAgLy8gICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xuICAvLyB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25TaHV0KCkge1xuICAgIGlmIChvblNodXRkb3duU2lnbmFsKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbCgpKTtcbiAgICB9XG4gICAgY29uc3Qgc2F2ZWQgPSBzdG9yZVNhdmVkQWN0aW9uJC5waXBlKG9wLnRha2UoMSkpLnRvUHJvbWlzZSgpO1xuICAgIGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKTtcbiAgICBhd2FpdCBzYXZlZDtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgfVxuICByZXR1cm4gZGlzcGF0Y2hlcjtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGluay5cbiAqIFxuICogVXNlIHRoaXMgZnVuY3Rpb24gaW5zdGVhZCBvZiBpbml0UHJvY2VzcygpIGluIGNhc2UgaXQgaXMgaW4gYSBmb3JrZWQgY2hpbGQgcHJvY2VzcyBvciB3b3JrZXIgdGhyZWFkLlxuICogXG4gKiBVbmxpbmsgaW5pdFByb2Nlc3MoKSB3aGljaCByZWdpc3RlcnMgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmQsXG4gKiBpbiBjYXNlIHRoaXMgaXMgcnVubmluZyBhcyBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIHN0YW5kIGJ5IHVudGlsIHBhcmVudCBwcm9jZXNzIGV4cGxpY2l0bHlcbiAqICBzZW5kcyBhIHNpZ25hbCB0byBleGl0XG4gKiBAcGFyYW0gc3luY1N0YXRlIHNlbmQgY2hhbmdlZCBzdGF0ZSBiYWNrIHRvIG1haW4gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEFzQ2hpbGRQcm9jZXNzKHNhdmVTdGF0ZSA9IGZhbHNlLCBvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICByZXR1cm4gaW5pdFByb2Nlc3Moc2F2ZVN0YXRlLCBvblNodXRkb3duU2lnbmFsLCB0cnVlKTtcbn1cbiJdfQ==