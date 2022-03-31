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
exports.initAsChildProcess = exports.initProcess = exports.initConfig = exports.exitHooks = void 0;
require("../node-path");
const log4js_1 = __importDefault(require("log4js"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const config_1 = __importDefault(require("../config"));
const log = log4js_1.default.getLogger('plink.bootstrap-process');
/** When process is on 'SIGINT' and "beforeExit", all functions will be executed */
exports.exitHooks = [];
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
function initProcess(saveState = 'none', onShutdownSignal, handleShutdownMsg = false) {
    // TODO: Not working when press ctrl + c, and no async operation can be finished on "SIGINT" event
    process.once('beforeExit', function (code) {
        log.info('pid ' + process.pid + ': bye');
        void onShut(code, false);
    });
    process.once('SIGINT', () => {
        log.info('pid' + process.pid + ' recieves SIGINT');
        void onShut(0, true);
    });
    if (handleShutdownMsg) {
        // Be aware this is why "initProcess" can not be "fork"ed in a child process, it will keep alive for parent process's 'message' event
        process.on('message', function (msg) {
            if (msg === 'shutdown') {
                // eslint-disable-next-line no-console
                log.info('Recieve shutdown message from PM2, bye.');
                void onShut(0, true);
            }
        });
    }
    const { dispatcher, storeSavedAction$, stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore();
    dispatcher.changeActionOnExit(saveState);
    async function onShut(code, explicitlyExit) {
        let exitCode = 0;
        await rx.merge(...exports.exitHooks.map(hookFn => rx.defer(() => hookFn()).pipe(op.catchError(err => {
            log.error('Failed to execute shutdown hooks', err);
            exitCode = 1;
            return rx.EMPTY;
        })))).toPromise();
        if (onShutdownSignal) {
            await Promise.resolve(onShutdownSignal(code))
                .catch(err => console.error(err));
        }
        const saved = storeSavedAction$.pipe(op.take(1)).toPromise();
        dispatcher.processExit();
        await saved;
        if (explicitlyExit) {
            setImmediate(() => process.exit(exitCode));
        }
    }
    return dispatcher;
}
exports.initProcess = initProcess;
/**
 * Initialize redux-store for Plink.
 *
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread of Plink.
 * So that plink won't listener to PM2's shutdown message in this case.
 * Be aware that Plink main process could be a child process of PM2 or any other Node.js process manager,
 * that's what initProcess() does to listener to PM2's message.

 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 * @param syncState send changed state back to main process
 */
function initAsChildProcess(saveState = 'none', onShutdownSignal) {
    return initProcess(saveState, onShutdownSignal, false);
}
exports.initAsChildProcess = initAsChildProcess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHVEQUErQjtBQUsvQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXhELG1GQUFtRjtBQUN0RSxRQUFBLFNBQVMsR0FBRyxFQUF1RCxDQUFDO0FBRWpGLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkMsTUFBTSxHQUFHLENBQUMsQ0FBQywyQkFBMkI7QUFDeEMsQ0FBQyxDQUFDLENBQUM7QUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxFQUFFO0lBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUM7QUFDSDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLFVBQXlCLEVBQUU7SUFDcEQsZ0JBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekIsdUJBQXVCO0lBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztBQUNoQixDQUFDO0FBSkQsZ0NBSUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixXQUFXLENBQUMsWUFBZ0QsTUFBTSxFQUFFLGdCQUF3RCxFQUFFLGlCQUFpQixHQUFHLEtBQUs7SUFDckssa0dBQWtHO0lBQ2xHLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVMsSUFBSTtRQUN0QyxH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ZGUtcGF0aCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbi8vIGltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmJvb3RzdHJhcC1wcm9jZXNzJyk7XG5cbi8qKiBXaGVuIHByb2Nlc3MgaXMgb24gJ1NJR0lOVCcgYW5kIFwiYmVmb3JlRXhpdFwiLCBhbGwgZnVuY3Rpb25zIHdpbGwgYmUgZXhlY3V0ZWQgKi9cbmV4cG9ydCBjb25zdCBleGl0SG9va3MgPSBbXSBhcyBBcnJheTwoKSA9PiAocnguT2JzZXJ2YWJsZUlucHV0PHVua25vd24+IHwgdm9pZCk+O1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyKTtcbiAgdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICBsb2cuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcbi8qKlxuICogTXVzdCBpbnZva2UgaW5pdFByb2Nlc3MoKSBvciBpbml0QXNDaGlsZFByb2Nlc3MoKSBiZWZvcmUgdGhpcyBmdW5jdGlvbi5cbiAqIElmIHRoaXMgZnVuY3Rpb24gaXMgY2FsbGVkIGZyb20gYSBjaGlsZCBwcm9jZXNzIG9yIHRocmVhZCB3b3JrZXIgb2YgUGxpbmssXG4gKiB5b3UgbWF5IHBhc3MgYEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMhKWAgYXMgcGFyYW1ldGVyIHNpbmNlXG4gKiBQbGluaydzIG1haW4gcHJvY2VzcyBzYXZlIGBHbG9iYWxPcHRpb25zYCBpbiBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIlBMSU5LX0NMSV9PUFRTXCIsXG4gKiBzbyB0aGF0IGNoaWxkIHByb2Nlc3MgZ2V0cyBzYW1lIEdsb2JhbE9wdGlvbnMgYXMgdGhlIG1haW4gcHJvY2VzcyBkb2VzLlxuICogQHBhcmFtIG9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0Q29uZmlnKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMgPSB7fSkge1xuICBjb25maWcuaW5pdFN5bmMob3B0aW9ucyk7XG4gIC8vIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHJldHVybiBjb25maWc7XG59XG5cbi8qKlxuICogLSBSZWdpc3RlciBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZFxuICogLSBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGlua1xuICogXG4gKiBETyBOT1QgZm9yayBhIGNoaWxkIHByb2Nlc3Mgb24gdGhpcyBmdW5jdGlvblxuICogQHBhcmFtIG9uU2h1dGRvd25TaWduYWwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHJvY2VzcyhzYXZlU3RhdGU6IHN0b3JlLlN0b3JlU2V0dGluZ1snYWN0aW9uT25FeGl0J10gPSAnbm9uZScsIG9uU2h1dGRvd25TaWduYWw/OiAoY29kZTogbnVtYmVyKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+LCBoYW5kbGVTaHV0ZG93bk1zZyA9IGZhbHNlKSB7XG4gIC8vIFRPRE86IE5vdCB3b3JraW5nIHdoZW4gcHJlc3MgY3RybCArIGMsIGFuZCBubyBhc3luYyBvcGVyYXRpb24gY2FuIGJlIGZpbmlzaGVkIG9uIFwiU0lHSU5UXCIgZXZlbnRcbiAgcHJvY2Vzcy5vbmNlKCdiZWZvcmVFeGl0JywgZnVuY3Rpb24oY29kZSkge1xuICAgIGxvZy5pbmZvKCdwaWQgJyArIHByb2Nlc3MucGlkICsgJzogYnllJyk7XG4gICAgdm9pZCBvblNodXQoY29kZSwgZmFsc2UpO1xuICB9KTtcbiAgcHJvY2Vzcy5vbmNlKCdTSUdJTlQnLCAoKSA9PiB7XG4gICAgbG9nLmluZm8oJ3BpZCcgKyBwcm9jZXNzLnBpZCArICcgcmVjaWV2ZXMgU0lHSU5UJyk7XG4gICAgdm9pZCBvblNodXQoMCwgdHJ1ZSk7XG4gIH0pO1xuXG4gIGlmIChoYW5kbGVTaHV0ZG93bk1zZykge1xuICAgIC8vIEJlIGF3YXJlIHRoaXMgaXMgd2h5IFwiaW5pdFByb2Nlc3NcIiBjYW4gbm90IGJlIFwiZm9ya1wiZWQgaW4gYSBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIGtlZXAgYWxpdmUgZm9yIHBhcmVudCBwcm9jZXNzJ3MgJ21lc3NhZ2UnIGV2ZW50XG4gICAgcHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICAgICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICAgIHZvaWQgb25TaHV0KDAsIHRydWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3Qge2Rpc3BhdGNoZXIsIHN0b3JlU2F2ZWRBY3Rpb24kLCBzdGF0ZUZhY3RvcnksIHN0YXJ0TG9nZ2luZ30gPSByZXF1aXJlKCcuLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcblxuICBzdGFydExvZ2dpbmcoKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIGRpc3BhdGNoZXIuY2hhbmdlQWN0aW9uT25FeGl0KHNhdmVTdGF0ZSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25TaHV0KGNvZGU6IG51bWJlciwgZXhwbGljaXRseUV4aXQ6IGJvb2xlYW4pIHtcbiAgICBsZXQgZXhpdENvZGUgPSAwO1xuICAgIGF3YWl0IHJ4Lm1lcmdlKFxuICAgICAgLi4uZXhpdEhvb2tzLm1hcChob29rRm4gPT4gcnguZGVmZXIoKCkgPT4gaG9va0ZuKCkpLnBpcGUoXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIHNodXRkb3duIGhvb2tzJywgZXJyKTtcbiAgICAgICAgICBleGl0Q29kZSA9IDE7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICAgIGlmIChvblNodXRkb3duU2lnbmFsKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbChjb2RlKSlcbiAgICAgICAgLmNhdGNoKGVyciA9PiBjb25zb2xlLmVycm9yKGVycikpO1xuICAgIH1cbiAgICBjb25zdCBzYXZlZCA9IHN0b3JlU2F2ZWRBY3Rpb24kLnBpcGUob3AudGFrZSgxKSkudG9Qcm9taXNlKCk7XG4gICAgZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpO1xuICAgIGF3YWl0IHNhdmVkO1xuICAgIGlmIChleHBsaWNpdGx5RXhpdCkge1xuICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHByb2Nlc3MuZXhpdChleGl0Q29kZSkpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGlzcGF0Y2hlcjtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGluay5cbiAqIFxuICogVXNlIHRoaXMgZnVuY3Rpb24gaW5zdGVhZCBvZiBpbml0UHJvY2VzcygpIGluIGNhc2UgaXQgaXMgaW4gYSBmb3JrZWQgY2hpbGQgcHJvY2VzcyBvciB3b3JrZXIgdGhyZWFkIG9mIFBsaW5rLlxuICogU28gdGhhdCBwbGluayB3b24ndCBsaXN0ZW5lciB0byBQTTIncyBzaHV0ZG93biBtZXNzYWdlIGluIHRoaXMgY2FzZS5cbiAqIEJlIGF3YXJlIHRoYXQgUGxpbmsgbWFpbiBwcm9jZXNzIGNvdWxkIGJlIGEgY2hpbGQgcHJvY2VzcyBvZiBQTTIgb3IgYW55IG90aGVyIE5vZGUuanMgcHJvY2VzcyBtYW5hZ2VyLFxuICogdGhhdCdzIHdoYXQgaW5pdFByb2Nlc3MoKSBkb2VzIHRvIGxpc3RlbmVyIHRvIFBNMidzIG1lc3NhZ2UuXG5cbiAqIFVubGluayBpbml0UHJvY2VzcygpIHdoaWNoIHJlZ2lzdGVycyBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZCxcbiAqIGluIGNhc2UgdGhpcyBpcyBydW5uaW5nIGFzIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwgc3RhbmQgYnkgdW50aWwgcGFyZW50IHByb2Nlc3MgZXhwbGljaXRseVxuICogIHNlbmRzIGEgc2lnbmFsIHRvIGV4aXRcbiAqIEBwYXJhbSBzeW5jU3RhdGUgc2VuZCBjaGFuZ2VkIHN0YXRlIGJhY2sgdG8gbWFpbiBwcm9jZXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0QXNDaGlsZFByb2Nlc3Moc2F2ZVN0YXRlOiBzdG9yZS5TdG9yZVNldHRpbmdbJ2FjdGlvbk9uRXhpdCddID0gJ25vbmUnLCBvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICByZXR1cm4gaW5pdFByb2Nlc3Moc2F2ZVN0YXRlLCBvblNodXRkb3duU2lnbmFsLCBmYWxzZSk7XG59XG4iXX0=