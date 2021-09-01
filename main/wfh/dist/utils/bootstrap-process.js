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
exports.forkCli = exports.initAsChildProcess = exports.initProcess = exports.initConfig = void 0;
require("../node-path");
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("../config"));
const store = __importStar(require("../store"));
const child_process_1 = require("child_process");
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
function initAsChildProcess(syncState = false) {
    const { stateFactory, startLogging, setSyncStateToMainProcess } = require('../store');
    startLogging();
    if (syncState) {
        setSyncStateToMainProcess(true);
    }
    stateFactory.configureStore();
}
exports.initAsChildProcess = initAsChildProcess;
function forkCli(cliArgs, opts = {}) {
    const cp = child_process_1.fork(require.resolve('../cmd-bootstrap'), cliArgs, Object.assign(Object.assign({}, opts), { stdio: ['ignore', 'inherit', 'inherit', 'ipc'] }));
    cp.on('message', (msg) => {
        if (store.isStateSyncMsg(msg)) {
            log.info('Recieve state sync message from forked process');
            store.stateFactory.actionsToDispatch.next({ type: '::syncState', payload(state) {
                    return eval('(' + msg.data + ')');
                } });
        }
    });
    return cp;
}
exports.forkCli = forkCli;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFHL0IsZ0RBQWtDO0FBQ2xDLGlEQUFnRDtBQUVoRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXhELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLG1EQUFtRDtJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyx1Q0FBdUM7SUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUVILHFEQUFxRDtBQUVyRCxrRUFBa0U7QUFDbEUsc0NBQXNDO0FBQ3RDLGdDQUFnQztBQUNoQyw0QkFBNEI7QUFDNUIsbUJBQW1CO0FBQ25CLElBQUk7QUFFSjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLE9BQXNCO0lBQy9DLGdCQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLHVCQUF1QjtJQUN2QixPQUFPLGdCQUFNLENBQUM7QUFDaEIsQ0FBQztBQUpELGdDQUlDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLGdCQUE0QztJQUN0RSxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNuQixzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6QyxLQUFLLE1BQU0sRUFBRSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gscUlBQXFJO0lBQ3JJLE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztRQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7WUFDdEIsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUNBQXlDLENBQUMsQ0FBQztZQUNwRCxLQUFLLE1BQU0sRUFBRSxDQUFDO1NBQ2Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQWlCLENBQUM7SUFDcEYsWUFBWSxFQUFFLENBQUM7SUFDZixZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7SUFFOUIsU0FBZSxNQUFNOztZQUNuQixJQUFJLGdCQUFnQixFQUFFO2dCQUNwQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzthQUN6QztZQUNELE1BQU0sU0FBUyxFQUFFLENBQUM7WUFDbEIsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxDQUFDO0tBQUE7QUFDSCxDQUFDO0FBMUJELGtDQTBCQztBQUVEOzs7Ozs7Ozs7R0FTRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLFNBQVMsR0FBRyxLQUFLO0lBQ2xELE1BQU0sRUFBQyxZQUFZLEVBQUUsWUFBWSxFQUFFLHlCQUF5QixFQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBaUIsQ0FBQztJQUNwRyxZQUFZLEVBQUUsQ0FBQztJQUNmLElBQUksU0FBUyxFQUFFO1FBQ2IseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDakM7SUFDRCxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDaEMsQ0FBQztBQVBELGdEQU9DO0FBRUQsU0FBZ0IsT0FBTyxDQUFDLE9BQWlCLEVBQUUsT0FBb0IsRUFBRTtJQUMvRCxNQUFNLEVBQUUsR0FBRyxvQkFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRSxPQUFPLGtDQUFNLElBQUksS0FBRSxLQUFLLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBRSxDQUFDO0lBQ3pILEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7UUFDdkIsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0RBQWdELENBQUMsQ0FBQztZQUMzRCxLQUFLLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLEtBQVU7b0JBQ2hGLE9BQU8sSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1NBQ0w7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQztBQVhELDBCQVdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuLy8gaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7Zm9yaywgRm9ya09wdGlvbnN9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5ib290c3RyYXAtcHJvY2VzcycpO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICAvLyBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbicsIGVyciwgZXJyLnN0YWNrKTtcbiAgbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgLy8gbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4gIGxvZy5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbn0pO1xuXG4vLyBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdib290c3RyYXAtcHJvY2VzcycpO1xuXG4vLyBleHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdENvbmZpZ0FzeW5jKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMpIHtcbi8vICAgLy8gaW5pdFByb2Nlc3Mob25TaHV0ZG93blNpZ25hbCk7XG4vLyAgIGF3YWl0IGNvbmZpZy5pbml0KG9wdGlvbnMpO1xuLy8gICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuLy8gICByZXR1cm4gY29uZmlnO1xuLy8gfVxuXG4vKipcbiAqIE11c3QgaW52b2tlIGluaXRQcm9jZXNzKCkgb3IgaW5pdEFzQ2hpbGRQcm9jZXNzKCkgYmVmb3JlIHRoaXMgZnVuY3Rpb24uXG4gKiBJZiB0aGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBmcm9tIGEgY2hpbGQgcHJvY2VzcyBvciB0aHJlYWQgd29ya2VyIG9mIFBsaW5rLFxuICogeW91IG1heSBwYXNzIGBKU09OLnBhcnNlKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTISlgIGFzIHBhcmFtZXRlciBzaW5jZVxuICogUGxpbmsncyBtYWluIHByb2Nlc3Mgc2F2ZSBgR2xvYmFsT3B0aW9uc2AgaW4gZW52aXJvbm1lbnQgdmFyaWFibGUgXCJQTElOS19DTElfT1BUU1wiLFxuICogc28gdGhhdCBjaGlsZCBwcm9jZXNzIGdldHMgc2FtZSBHbG9iYWxPcHRpb25zIGFzIHRoZSBtYWluIHByb2Nlc3MgZG9lcy5cbiAqIEBwYXJhbSBvcHRpb25zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdENvbmZpZyhvcHRpb25zOiBHbG9iYWxPcHRpb25zKSB7XG4gIGNvbmZpZy5pbml0U3luYyhvcHRpb25zKTtcbiAgLy8gbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cblxuLyoqXG4gKiAtIFJlZ2lzdGVyIHByb2Nlc3MgZXZlbnQgaGFuZGxlciBmb3IgU0lHSU5UIGFuZCBzaHV0ZG93biBjb21tYW5kXG4gKiAtIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rXG4gKiBcbiAqIERPIE5PVCBmb3JrIGEgY2hpbGQgcHJvY2VzcyBvbiB0aGlzIGZ1bmN0aW9uXG4gKiBAcGFyYW0gb25TaHV0ZG93blNpZ25hbCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRQcm9jZXNzKG9uU2h1dGRvd25TaWduYWw/OiAoKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+KSB7XG4gIHByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ3BpZCAnICsgcHJvY2Vzcy5waWQgKyAnOiBieWUnKTtcbiAgICB2b2lkIG9uU2h1dCgpO1xuICB9KTtcbiAgLy8gQmUgYXdhcmUgdGhpcyBpcyB3aHkgXCJpbml0UHJvY2Vzc1wiIGNhbiBub3QgYmUgXCJmb3JrXCJlZCBpbiBhIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwga2VlcCBhbGl2ZSBmb3IgcGFyZW50IHByb2Nlc3MncyAnbWVzc2FnZScgZXZlbnRcbiAgcHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICAgIGlmIChtc2cgPT09ICdzaHV0ZG93bicpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICB2b2lkIG9uU2h1dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3Qge3NhdmVTdGF0ZSwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmd9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG4gIHN0YXJ0TG9nZ2luZygpO1xuICBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcblxuICBhc3luYyBmdW5jdGlvbiBvblNodXQoKSB7XG4gICAgaWYgKG9uU2h1dGRvd25TaWduYWwpIHtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShvblNodXRkb3duU2lnbmFsKTtcbiAgICB9XG4gICAgYXdhaXQgc2F2ZVN0YXRlKCk7XG4gICAgc2V0SW1tZWRpYXRlKCgpID0+IHByb2Nlc3MuZXhpdCgwKSk7XG4gIH1cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGluay5cbiAqIFxuICogVXNlIHRoaXMgZnVuY3Rpb24gaW5zdGVhZCBvZiBpbml0UHJvY2VzcygpIGluIGNhc2UgaXQgaXMgaW4gYSBmb3JrZWQgY2hpbGQgcHJvY2VzcyBvciB3b3JrZXIgdGhyZWFkLlxuICogXG4gKiBVbmxpbmsgaW5pdFByb2Nlc3MoKSB3aGljaCByZWdpc3RlcnMgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmQsXG4gKiBpbiBjYXNlIHRoaXMgaXMgcnVubmluZyBhcyBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIHN0YW5kIGJ5IHVudGlsIHBhcmVudCBwcm9jZXNzIGV4cGxpY2l0bHlcbiAqICBzZW5kcyBhIHNpZ25hbCB0byBleGl0XG4gKiBAcGFyYW0gc3luY1N0YXRlIHNlbmQgY2hhbmdlZCBzdGF0ZSBiYWNrIHRvIG1haW4gcHJvY2Vzc1xuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEFzQ2hpbGRQcm9jZXNzKHN5bmNTdGF0ZSA9IGZhbHNlKSB7XG4gIGNvbnN0IHtzdGF0ZUZhY3RvcnksIHN0YXJ0TG9nZ2luZywgc2V0U3luY1N0YXRlVG9NYWluUHJvY2Vzc30gPSByZXF1aXJlKCcuLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcbiAgc3RhcnRMb2dnaW5nKCk7XG4gIGlmIChzeW5jU3RhdGUpIHtcbiAgICBzZXRTeW5jU3RhdGVUb01haW5Qcm9jZXNzKHRydWUpO1xuICB9XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ya0NsaShjbGlBcmdzOiBzdHJpbmdbXSwgb3B0czogRm9ya09wdGlvbnMgPSB7fSkge1xuICBjb25zdCBjcCA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCcuLi9jbWQtYm9vdHN0cmFwJyksIGNsaUFyZ3MsIHsuLi5vcHRzLCBzdGRpbzogWydpZ25vcmUnLCAnaW5oZXJpdCcsICdpbmhlcml0JywgJ2lwYyddfSk7XG4gIGNwLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuICAgIGlmIChzdG9yZS5pc1N0YXRlU3luY01zZyhtc2cpKSB7XG4gICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzdGF0ZSBzeW5jIG1lc3NhZ2UgZnJvbSBmb3JrZWQgcHJvY2VzcycpO1xuICAgICAgc3RvcmUuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoe3R5cGU6ICc6OnN5bmNTdGF0ZScsIHBheWxvYWQoc3RhdGU6IGFueSkge1xuICAgICAgICByZXR1cm4gZXZhbCgnKCcgKyBtc2cuZGF0YSArICcpJyk7XG4gICAgICB9fSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGNwO1xufVxuXG4iXX0=