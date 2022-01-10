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
    // TODO: Not working when press ctrl + c, and no async operation can be finished on "SIGINT" event
    process.on('exit', function () {
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
            await Promise.resolve(onShutdownSignal())
                .catch(err => console.error(err));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1QixtREFBcUM7QUFDckMsdURBQStCO0FBSy9CLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFFeEQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QyxNQUFNLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQjtBQUN4QyxDQUFDLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUNIOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixVQUFVLENBQUMsVUFBeUIsRUFBRTtJQUNwRCxnQkFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6Qix1QkFBdUI7SUFDdkIsT0FBTyxnQkFBTSxDQUFDO0FBQ2hCLENBQUM7QUFKRCxnQ0FJQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLFdBQVcsQ0FBQyxTQUFTLEdBQUcsSUFBSSxFQUFFLGdCQUE0QyxFQUFFLGNBQWMsR0FBRyxLQUFLO0lBQ2hILGtHQUFrRztJQUNsRyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTtRQUNqQixzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6QyxLQUFLLE1BQU0sRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxDQUFDLGNBQWMsRUFBRTtRQUNuQixxSUFBcUk7UUFDckksT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO1lBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtnQkFDdEIsc0NBQXNDO2dCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7Z0JBQ3BELEtBQUssTUFBTSxFQUFFLENBQUM7YUFDZjtRQUNILENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFFRCxNQUFNLEVBQUMsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFpQixDQUFDO0lBRXhHLFlBQVksRUFBRSxDQUFDO0lBQ2YsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzlCLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxtQ0FBbUM7SUFDbkMsMkNBQTJDO0lBQzNDLDRDQUE0QztJQUM1QywyQ0FBMkM7SUFDM0MsSUFBSTtJQUVKLEtBQUssVUFBVSxNQUFNO1FBQ25CLElBQUksZ0JBQWdCLEVBQUU7WUFDcEIsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7aUJBQ3RDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNyQztRQUNELE1BQU0sS0FBSyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDN0QsVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sS0FBSyxDQUFDO1FBQ1osWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQXhDRCxrQ0F3Q0M7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxTQUFTLEdBQUcsS0FBSyxFQUFFLGdCQUE0QztJQUNoRyxPQUFPLFdBQVcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDeEQsQ0FBQztBQUZELGdEQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuLy8gaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuYm9vdHN0cmFwLXByb2Nlc3MnKTtcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbiAgbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgbG9nLmVycm9yKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xufSk7XG4vKipcbiAqIE11c3QgaW52b2tlIGluaXRQcm9jZXNzKCkgb3IgaW5pdEFzQ2hpbGRQcm9jZXNzKCkgYmVmb3JlIHRoaXMgZnVuY3Rpb24uXG4gKiBJZiB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tIGEgY2hpbGQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyIG9mIFBsaW5rLFxuICogeW91IG1heSBwYXNzIGBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTISlgIGFzIHBhcmFtZXRlciBzaW5jZVxuICogUGxpbmsncyBtYWluIHByb2Nlc3Mgc2F2ZSBgR2xvYmFsT3B0aW9uc2AgaW4gZW52aXJvbm1lbnQgdmFyaWFibGUgXCJQTElOS19DTElfT1BUU1wiLFxuICogc28gdGhhdCBjaGlsZCBwcm9jZXNzIGdldHMgc2FtZSBHbG9iYWxPcHRpb25zIGFzIHRoZSBtYWluIHByb2Nlc3MgZG9lcy5cbiAqIEBwYXJhbSBvcHRpb25zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdENvbmZpZyhvcHRpb25zOiBHbG9iYWxPcHRpb25zID0ge30pIHtcbiAgY29uZmlnLmluaXRTeW5jKG9wdGlvbnMpO1xuICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG4vKipcbiAqIC0gUmVnaXN0ZXIgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmRcbiAqIC0gSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmtcbiAqIFxuICogRE8gTk9UIGZvcmsgYSBjaGlsZCBwcm9jZXNzIG9uIHRoaXMgZnVuY3Rpb25cbiAqIEBwYXJhbSBvblNodXRkb3duU2lnbmFsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFByb2Nlc3Moc2F2ZVN0YXRlID0gdHJ1ZSwgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4sIGlzQ2hpbGRQcm9jZXNzID0gZmFsc2UpIHtcbiAgLy8gVE9ETzogTm90IHdvcmtpbmcgd2hlbiBwcmVzcyBjdHJsICsgYywgYW5kIG5vIGFzeW5jIG9wZXJhdGlvbiBjYW4gYmUgZmluaXNoZWQgb24gXCJTSUdJTlRcIiBldmVudFxuICBwcm9jZXNzLm9uKCdleGl0JywgZnVuY3Rpb24oKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygncGlkICcgKyBwcm9jZXNzLnBpZCArICc6IGJ5ZScpO1xuICAgIHZvaWQgb25TaHV0KCk7XG4gIH0pO1xuICBpZiAoIWlzQ2hpbGRQcm9jZXNzKSB7XG4gICAgLy8gQmUgYXdhcmUgdGhpcyBpcyB3aHkgXCJpbml0UHJvY2Vzc1wiIGNhbiBub3QgYmUgXCJmb3JrXCJlZCBpbiBhIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwga2VlcCBhbGl2ZSBmb3IgcGFyZW50IHByb2Nlc3MncyAnbWVzc2FnZScgZXZlbnRcbiAgICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICAgICAgdm9pZCBvblNodXQoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBzdG9yZVNhdmVkQWN0aW9uJCwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmd9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdCgnbm9uZScpO1xuICAvLyBpZiAoaXNDaGlsZFByb2Nlc3MgJiYgc2F2ZVN0YXRlKVxuICAvLyAgIGRpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KCdzYXZlJyk7XG4gIC8vIGVsc2UgaWYgKCFpc0NoaWxkUHJvY2VzcyAmJiAhc2F2ZVN0YXRlKSB7XG4gIC8vICAgZGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgLy8gfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKG9uU2h1dGRvd25TaWduYWwoKSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgIH1cbiAgICBjb25zdCBzYXZlZCA9IHN0b3JlU2F2ZWRBY3Rpb24kLnBpcGUob3AudGFrZSgxKSkudG9Qcm9taXNlKCk7XG4gICAgZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpO1xuICAgIGF3YWl0IHNhdmVkO1xuICAgIHNldEltbWVkaWF0ZSgoKSA9PiBwcm9jZXNzLmV4aXQoMCkpO1xuICB9XG4gIHJldHVybiBkaXNwYXRjaGVyO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rLlxuICogXG4gKiBVc2UgdGhpcyBmdW5jdGlvbiBpbnN0ZWFkIG9mIGluaXRQcm9jZXNzKCkgaW4gY2FzZSBpdCBpcyBpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzIG9yIHdvcmtlciB0aHJlYWQuXG4gKiBcbiAqIFVubGluayBpbml0UHJvY2VzcygpIHdoaWNoIHJlZ2lzdGVycyBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZCxcbiAqIGluIGNhc2UgdGhpcyBpcyBydW5uaW5nIGFzIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwgc3RhbmQgYnkgdW50aWwgcGFyZW50IHByb2Nlc3MgZXhwbGljaXRseVxuICogIHNlbmRzIGEgc2lnbmFsIHRvIGV4aXRcbiAqIEBwYXJhbSBzeW5jU3RhdGUgc2VuZCBjaGFuZ2VkIHN0YXRlIGJhY2sgdG8gbWFpbiBwcm9jZXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0QXNDaGlsZFByb2Nlc3Moc2F2ZVN0YXRlID0gZmFsc2UsIG9uU2h1dGRvd25TaWduYWw/OiAoKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+KSB7XG4gIHJldHVybiBpbml0UHJvY2VzcyhzYXZlU3RhdGUsIG9uU2h1dGRvd25TaWduYWwsIHRydWUpO1xufVxuIl19