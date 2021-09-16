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
const config_1 = __importDefault(require("../config"));
const op = __importStar(require("rxjs/operators"));
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
    if (isChildProcess && saveState)
        dispatcher.changeActionOnExit('save');
    else if (!isChildProcess && !saveState) {
        dispatcher.changeActionOnExit('none');
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFJL0IsbURBQXFDO0FBRXJDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFFeEQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QyxNQUFNLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQjtBQUN4QyxDQUFDLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUNIOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixVQUFVLENBQUMsT0FBc0I7SUFDL0MsZ0JBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekIsdUJBQXVCO0lBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztBQUNoQixDQUFDO0FBSkQsZ0NBSUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixXQUFXLENBQUMsU0FBUyxHQUFHLElBQUksRUFBRSxnQkFBNEMsRUFBRSxjQUFjLEdBQUcsS0FBSztJQUNoSCxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNuQixzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6QyxLQUFLLE1BQU0sRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGNBQWMsRUFBRTtRQUNuQixxSUFBcUk7UUFDckksT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO1lBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtnQkFDdEIsc0NBQXNDO2dCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7Z0JBQ3BELEtBQUssTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxNQUFNLEVBQUMsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFpQixDQUFDO0lBRXhHLFlBQVksRUFBRSxDQUFDO0lBQ2YsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBRTlCLElBQUksY0FBYyxJQUFJLFNBQVM7UUFDN0IsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ25DLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDdEMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3ZDO0lBRUQsS0FBSyxVQUFVLE1BQU07UUFDbkIsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM3RCxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDekIsTUFBTSxLQUFLLENBQUM7UUFDWixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBdENELGtDQXNDQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxLQUFLLEVBQUUsZ0JBQTRDO0lBQ2hHLE9BQU8sV0FBVyxDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBRkQsZ0RBRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG4vLyBpbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5ib290c3RyYXAtcHJvY2VzcycpO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyKTtcbiAgdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICBsb2cuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcbi8qKlxuICogTXVzdCBpbnZva2UgaW5pdFByb2Nlc3MoKSBvciBpbml0QXNDaGlsZFByb2Nlc3MoKSBiZWZvcmUgdGhpcyBmdW5jdGlvbi5cbiAqIElmIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYSBjaGlsZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXIgb2YgUGxpbmssXG4gKiB5b3UgbWF5IHBhc3MgYEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKWAgYXMgcGFyYW1ldGVyIHNpbmNlXG4gKiBQbGluaydzIG1haW4gcHJvY2VzcyBzYXZlIGBHbG9iYWxPcHRpb25zYCBpbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIlBMSU5LX0NMSV9PUFRTXCIsXG4gKiBzbyB0aGF0IGNoaWxkIHByb2Nlc3MgZ2V0cyBzYW1lIEdsb2JhbE9wdGlvbnMgYXMgdGhlIG1haW4gcHJvY2VzcyBkb2VzLlxuICogQHBhcmFtIG9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0Q29uZmlnKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMpIHtcbiAgY29uZmlnLmluaXRTeW5jKG9wdGlvbnMpO1xuICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG4vKipcbiAqIC0gUmVnaXN0ZXIgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmRcbiAqIC0gSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmtcbiAqIFxuICogRE8gTk9UIGZvcmsgYSBjaGlsZCBwcm9jZXNzIG9uIHRoaXMgZnVuY3Rpb25cbiAqIEBwYXJhbSBvblNodXRkb3duU2lnbmFsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFByb2Nlc3Moc2F2ZVN0YXRlID0gdHJ1ZSwgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4sIGlzQ2hpbGRQcm9jZXNzID0gZmFsc2UpIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygncGlkICcgKyBwcm9jZXNzLnBpZCArICc6IGJ5ZScpO1xuICAgIHZvaWQgb25TaHV0KCk7XG4gIH0pO1xuICBpZiAoIWlzQ2hpbGRQcm9jZXNzKSB7XG4gICAgLy8gQmUgYXdhcmUgdGhpcyBpcyB3aHkgXCJpbml0UHJvY2Vzc1wiIGNhbiBub3QgYmUgXCJmb3JrXCJlZCBpbiBhIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwga2VlcCBhbGl2ZSBmb3IgcGFyZW50IHByb2Nlc3MncyAnbWVzc2FnZScgZXZlbnRcbiAgICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICAgICAgdm9pZCBvblNodXQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBzdG9yZVNhdmVkQWN0aW9uJCwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmd9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG4gIGlmIChpc0NoaWxkUHJvY2VzcyAmJiBzYXZlU3RhdGUpXG4gICAgZGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbiAgZWxzZSBpZiAoIWlzQ2hpbGRQcm9jZXNzICYmICFzYXZlU3RhdGUpIHtcbiAgICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25TaHV0KCkge1xuICAgIGlmIChvblNodXRkb3duU2lnbmFsKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbCgpKTtcbiAgICB9XG4gICAgY29uc3Qgc2F2ZWQgPSBzdG9yZVNhdmVkQWN0aW9uJC5waXBlKG9wLnRha2UoMSkpLnRvUHJvbWlzZSgpO1xuICAgIGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKTtcbiAgICBhd2FpdCBzYXZlZDtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgfVxuICByZXR1cm4gZGlzcGF0Y2hlcjtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGluay5cbiAqIFxuICogVXNlIHRoaXMgZnVuY3Rpb24gaW5zdGVhZCBvZiBpbml0UHJvY2VzcygpIGluIGNhc2UgaXQgaXMgaW4gYSBmb3JrZWQgY2hpbGQgcHJvY2VzcyBvciB3b3JrZXIgdGhyZWFkLlxuICogXG4gKiBVbmxpbmsgaW5pdFByb2Nlc3MoKSB3aGljaCByZWdpc3RlcnMgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmQsXG4gKiBpbiBjYXNlIHRoaXMgaXMgcnVubmluZyBhcyBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIHN0YW5kIGJ5IHVudGlsIHBhcmVudCBwcm9jZXNzIGV4cGxpY2l0bHlcbiAqICBzZW5kcyBhIHNpZ25hbCB0byBleGl0XG4gKiBAcGFyYW0gc3luY1N0YXRlIHNlbmQgY2hhbmdlZCBzdGF0ZSBiYWNrIHRvIG1haW4gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEFzQ2hpbGRQcm9jZXNzKHNhdmVTdGF0ZSA9IGZhbHNlLCBvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICByZXR1cm4gaW5pdFByb2Nlc3Moc2F2ZVN0YXRlLCBvblNodXRkb3duU2lnbmFsLCB0cnVlKTtcbn1cbiJdfQ==