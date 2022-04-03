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
        onShut(code, false);
    });
    process.once('SIGINT', () => {
        log.info('pid' + process.pid + ' recieves SIGINT');
        onShut(0, true);
    });
    if (handleShutdownMsg) {
        // Be aware this is why "initProcess" can not be "fork"ed in a child process, it will keep alive for parent process's 'message' event
        process.on('message', function (msg) {
            if (msg === 'shutdown') {
                // eslint-disable-next-line no-console
                log.info('Recieve shutdown message from PM2, bye.');
                onShut(0, true);
            }
        });
    }
    const { dispatcher, storeSavedAction$, stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore();
    dispatcher.changeActionOnExit(saveState);
    function onShut(code, explicitlyExit) {
        let exitCode = 0;
        rx.concat(rx.from(exports.exitHooks).pipe(op.mergeMap(hookFn => {
            try {
                const ret = hookFn();
                if (ret == null || typeof ret === 'number') {
                    return rx.of(ret);
                }
                else {
                    return rx.from(ret);
                }
            }
            catch (err) {
                log.error('Failed to execute shutdown hooks', err);
                exitCode = 1;
                return rx.EMPTY;
            }
        }), op.catchError(err => {
            log.error('Failed to execute shutdown hooks', err);
            exitCode = 1;
            return rx.EMPTY;
        }), op.map((ret) => {
            if (typeof ret === 'number' && ret !== 0) {
                exitCode = ret;
                log.info('Exit hook returns:', exitCode);
            }
        })), rx.merge(
        // once "dispatcher.processExit() is executed, storeSavedAction$ will be emtted recusively.
        // Therefore storeSavedAction$ must be subscribed before dispatcher.processExit()
        storeSavedAction$.pipe(op.take(1)), 
        // A defer() can make sure dispatcher.processExit() is called later than storeSavedAction$
        // being subscribed
        rx.defer(() => {
            dispatcher.processExit();
            return rx.EMPTY;
        }))).pipe(op.finalize(() => {
            if (explicitlyExit) {
                // eslint-disable-next-line no-console
                console.log(`Process ${process.pid} Exit with`, exitCode);
                process.exit(exitCode);
            }
            else if (exitCode !== 0) {
                // eslint-disable-next-line no-console
                console.log(`Process ${process.pid} Exit with`, exitCode);
                process.exit(exitCode);
            }
        })).subscribe();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHVEQUErQjtBQUsvQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXhELG1GQUFtRjtBQUN0RSxRQUFBLFNBQVMsR0FBRyxFQUFnRSxDQUFDO0FBRTFGLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdkMsTUFBTSxHQUFHLENBQUMsQ0FBQywyQkFBMkI7QUFDeEMsQ0FBQyxDQUFDLENBQUM7QUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxFQUFFO0lBQ3JDLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUM7QUFDSDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLFVBQXlCLEVBQUU7SUFDcEQsZ0JBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekIsdUJBQXVCO0lBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztBQUNoQixDQUFDO0FBSkQsZ0NBSUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixXQUFXLENBQUMsWUFBZ0QsTUFBTSxFQUFFLGdCQUF3RCxFQUFFLGlCQUFpQixHQUFHLEtBQUs7SUFDckssa0dBQWtHO0lBQ2xHLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFVBQVMsSUFBSTtRQUN0QyxH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QyxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1osVUFBVSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FDSCxDQUNGLENBQUMsSUFBSSxDQUNKLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxjQUFjLEVBQUU7Z0JBQ2xCLHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUN4QjtpQkFBTSxJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUU7Z0JBQ3pCLHNDQUFzQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLE9BQU8sQ0FBQyxHQUFHLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDMUQsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUN4QjtRQUNILENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFwRkQsa0NBb0ZDO0FBRUQ7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQUMsWUFBZ0QsTUFBTSxFQUFFLGdCQUE0QztJQUNySSxPQUFPLFdBQVcsQ0FBQyxTQUFTLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDekQsQ0FBQztBQUZELGdEQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG4vLyBpbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi4vc3RvcmUnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5ib290c3RyYXAtcHJvY2VzcycpO1xuXG4vKiogV2hlbiBwcm9jZXNzIGlzIG9uICdTSUdJTlQnIGFuZCBcImJlZm9yZUV4aXRcIiwgYWxsIGZ1bmN0aW9ucyB3aWxsIGJlIGV4ZWN1dGVkICovXG5leHBvcnQgY29uc3QgZXhpdEhvb2tzID0gW10gYXMgQXJyYXk8KCkgPT4gKHJ4Lk9ic2VydmFibGVJbnB1dDx1bmtub3duPiB8IHZvaWQgfCBudW1iZXIpPjtcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbiAgbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgbG9nLmVycm9yKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xufSk7XG4vKipcbiAqIE11c3QgaW52b2tlIGluaXRQcm9jZXNzKCkgb3IgaW5pdEFzQ2hpbGRQcm9jZXNzKCkgYmVmb3JlIHRoaXMgZnVuY3Rpb24uXG4gKiBJZiB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tIGEgY2hpbGQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyIG9mIFBsaW5rLFxuICogeW91IG1heSBwYXNzIGBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTISlgIGFzIHBhcmFtZXRlciBzaW5jZVxuICogUGxpbmsncyBtYWluIHByb2Nlc3Mgc2F2ZSBgR2xvYmFsT3B0aW9uc2AgaW4gZW52aXJvbm1lbnQgdmFyaWFibGUgXCJQTElOS19DTElfT1BUU1wiLFxuICogc28gdGhhdCBjaGlsZCBwcm9jZXNzIGdldHMgc2FtZSBHbG9iYWxPcHRpb25zIGFzIHRoZSBtYWluIHByb2Nlc3MgZG9lcy5cbiAqIEBwYXJhbSBvcHRpb25zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdENvbmZpZyhvcHRpb25zOiBHbG9iYWxPcHRpb25zID0ge30pIHtcbiAgY29uZmlnLmluaXRTeW5jKG9wdGlvbnMpO1xuICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG4vKipcbiAqIC0gUmVnaXN0ZXIgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmRcbiAqIC0gSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmtcbiAqIFxuICogRE8gTk9UIGZvcmsgYSBjaGlsZCBwcm9jZXNzIG9uIHRoaXMgZnVuY3Rpb25cbiAqIEBwYXJhbSBvblNodXRkb3duU2lnbmFsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFByb2Nlc3Moc2F2ZVN0YXRlOiBzdG9yZS5TdG9yZVNldHRpbmdbJ2FjdGlvbk9uRXhpdCddID0gJ25vbmUnLCBvblNodXRkb3duU2lnbmFsPzogKGNvZGU6IG51bWJlcikgPT4gdm9pZCB8IFByb21pc2U8YW55PiwgaGFuZGxlU2h1dGRvd25Nc2cgPSBmYWxzZSkge1xuICAvLyBUT0RPOiBOb3Qgd29ya2luZyB3aGVuIHByZXNzIGN0cmwgKyBjLCBhbmQgbm8gYXN5bmMgb3BlcmF0aW9uIGNhbiBiZSBmaW5pc2hlZCBvbiBcIlNJR0lOVFwiIGV2ZW50XG4gIHByb2Nlc3Mub25jZSgnYmVmb3JlRXhpdCcsIGZ1bmN0aW9uKGNvZGUpIHtcbiAgICBsb2cuaW5mbygncGlkICcgKyBwcm9jZXNzLnBpZCArICc6IGJ5ZScpO1xuICAgIG9uU2h1dChjb2RlLCBmYWxzZSk7XG4gIH0pO1xuICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsICgpID0+IHtcbiAgICBsb2cuaW5mbygncGlkJyArIHByb2Nlc3MucGlkICsgJyByZWNpZXZlcyBTSUdJTlQnKTtcbiAgICBvblNodXQoMCwgdHJ1ZSk7XG4gIH0pO1xuXG4gIGlmIChoYW5kbGVTaHV0ZG93bk1zZykge1xuICAgIC8vIEJlIGF3YXJlIHRoaXMgaXMgd2h5IFwiaW5pdFByb2Nlc3NcIiBjYW4gbm90IGJlIFwiZm9ya1wiZWQgaW4gYSBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIGtlZXAgYWxpdmUgZm9yIHBhcmVudCBwcm9jZXNzJ3MgJ21lc3NhZ2UnIGV2ZW50XG4gICAgcHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICAgICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICAgIG9uU2h1dCgwLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBzdG9yZVNhdmVkQWN0aW9uJCwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmd9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdChzYXZlU3RhdGUpO1xuXG4gIGZ1bmN0aW9uIG9uU2h1dChjb2RlOiBudW1iZXIsIGV4cGxpY2l0bHlFeGl0OiBib29sZWFuKSB7XG4gICAgbGV0IGV4aXRDb2RlID0gMDtcbiAgICByeC5jb25jYXQoXG4gICAgICByeC5mcm9tKGV4aXRIb29rcykucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoaG9va0ZuID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmV0ID0gaG9va0ZuKCk7XG4gICAgICAgICAgICBpZiAocmV0ID09IG51bGwgfHwgdHlwZW9mIHJldCA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJ4Lm9mKHJldCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gcnguZnJvbShyZXQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gZXhlY3V0ZSBzaHV0ZG93biBob29rcycsIGVycik7XG4gICAgICAgICAgICBleGl0Q29kZSA9IDE7XG4gICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgc2h1dGRvd24gaG9va3MnLCBlcnIpO1xuICAgICAgICAgIGV4aXRDb2RlID0gMTtcbiAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgIH0pLFxuICAgICAgICBvcC5tYXAoKHJldCkgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgcmV0ID09PSAnbnVtYmVyJyAmJiByZXQgIT09IDApIHtcbiAgICAgICAgICAgIGV4aXRDb2RlID0gcmV0O1xuICAgICAgICAgICAgbG9nLmluZm8oJ0V4aXQgaG9vayByZXR1cm5zOicsIGV4aXRDb2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgcngubWVyZ2UoXG4gICAgICAgIC8vIG9uY2UgXCJkaXNwYXRjaGVyLnByb2Nlc3NFeGl0KCkgaXMgZXhlY3V0ZWQsIHN0b3JlU2F2ZWRBY3Rpb24kIHdpbGwgYmUgZW10dGVkIHJlY3VzaXZlbHkuXG4gICAgICAgIC8vIFRoZXJlZm9yZSBzdG9yZVNhdmVkQWN0aW9uJCBtdXN0IGJlIHN1YnNjcmliZWQgYmVmb3JlIGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKVxuICAgICAgICBzdG9yZVNhdmVkQWN0aW9uJC5waXBlKG9wLnRha2UoMSkpLFxuICAgICAgICAvLyBBIGRlZmVyKCkgY2FuIG1ha2Ugc3VyZSBkaXNwYXRjaGVyLnByb2Nlc3NFeGl0KCkgaXMgY2FsbGVkIGxhdGVyIHRoYW4gc3RvcmVTYXZlZEFjdGlvbiRcbiAgICAgICAgLy8gYmVpbmcgc3Vic2NyaWJlZFxuICAgICAgICByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgICAgZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpO1xuICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgIGlmIChleHBsaWNpdGx5RXhpdCkge1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coYFByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gRXhpdCB3aXRoYCwgZXhpdENvZGUpO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdChleGl0Q29kZSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZXhpdENvZGUgIT09IDApIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGBQcm9jZXNzICR7cHJvY2Vzcy5waWR9IEV4aXQgd2l0aGAsIGV4aXRDb2RlKTtcbiAgICAgICAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cbiAgcmV0dXJuIGRpc3BhdGNoZXI7XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmsuXG4gKiBcbiAqIFVzZSB0aGlzIGZ1bmN0aW9uIGluc3RlYWQgb2YgaW5pdFByb2Nlc3MoKSBpbiBjYXNlIGl0IGlzIGluIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3Mgb3Igd29ya2VyIHRocmVhZCBvZiBQbGluay5cbiAqIFNvIHRoYXQgcGxpbmsgd29uJ3QgbGlzdGVuZXIgdG8gUE0yJ3Mgc2h1dGRvd24gbWVzc2FnZSBpbiB0aGlzIGNhc2UuXG4gKiBCZSBhd2FyZSB0aGF0IFBsaW5rIG1haW4gcHJvY2VzcyBjb3VsZCBiZSBhIGNoaWxkIHByb2Nlc3Mgb2YgUE0yIG9yIGFueSBvdGhlciBOb2RlLmpzIHByb2Nlc3MgbWFuYWdlcixcbiAqIHRoYXQncyB3aGF0IGluaXRQcm9jZXNzKCkgZG9lcyB0byBsaXN0ZW5lciB0byBQTTIncyBtZXNzYWdlLlxuXG4gKiBVbmxpbmsgaW5pdFByb2Nlc3MoKSB3aGljaCByZWdpc3RlcnMgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmQsXG4gKiBpbiBjYXNlIHRoaXMgaXMgcnVubmluZyBhcyBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIHN0YW5kIGJ5IHVudGlsIHBhcmVudCBwcm9jZXNzIGV4cGxpY2l0bHlcbiAqICBzZW5kcyBhIHNpZ25hbCB0byBleGl0XG4gKiBAcGFyYW0gc3luY1N0YXRlIHNlbmQgY2hhbmdlZCBzdGF0ZSBiYWNrIHRvIG1haW4gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEFzQ2hpbGRQcm9jZXNzKHNhdmVTdGF0ZTogc3RvcmUuU3RvcmVTZXR0aW5nWydhY3Rpb25PbkV4aXQnXSA9ICdub25lJywgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgcmV0dXJuIGluaXRQcm9jZXNzKHNhdmVTdGF0ZSwgb25TaHV0ZG93blNpZ25hbCwgZmFsc2UpO1xufVxuIl19