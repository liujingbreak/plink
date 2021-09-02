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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFHL0IsZ0RBQWtDO0FBQ2xDLGlEQUFnRDtBQUVoRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXhELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLG1EQUFtRDtJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyx1Q0FBdUM7SUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUVILHFEQUFxRDtBQUVyRCxrRUFBa0U7QUFDbEUsc0NBQXNDO0FBQ3RDLGdDQUFnQztBQUNoQyw0QkFBNEI7QUFDNUIsbUJBQW1CO0FBQ25CLElBQUk7QUFFSjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsVUFBVSxDQUFDLE9BQXNCO0lBQy9DLGdCQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLHVCQUF1QjtJQUN2QixPQUFPLGdCQUFNLENBQUM7QUFDaEIsQ0FBQztBQUpELGdDQUlDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLGdCQUE0QztJQUN0RSxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEs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QUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsQ0FBQyxFQUFDLENBQUMsQ0FBQztTQUNMO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLEVBQUUsQ0FBQztBQUNaLENBQUM7QUFYRCwwQkFXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbi8vIGltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge2ZvcmssIEZvcmtPcHRpb25zfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuYm9vdHN0cmFwLXByb2Nlc3MnKTtcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbiAgLy8gbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb24nLCBlcnIsIGVyci5zdGFjayk7XG4gIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uOiAnLCBlcnIpO1xuICB0aHJvdyBlcnI7IC8vIGxldCBQTTIgaGFuZGxlIGV4Y2VwdGlvblxufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4gIC8vIGxvZy53YXJuKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIpO1xuICBsb2cuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcblxuLy8gY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYm9vdHN0cmFwLXByb2Nlc3MnKTtcblxuLy8gZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRDb25maWdBc3luYyhvcHRpb25zOiBHbG9iYWxPcHRpb25zKSB7XG4vLyAgIC8vIGluaXRQcm9jZXNzKG9uU2h1dGRvd25TaWduYWwpO1xuLy8gICBhd2FpdCBjb25maWcuaW5pdChvcHRpb25zKTtcbi8vICAgLy8gbG9nQ29uZmlnKGNvbmZpZygpKTtcbi8vICAgcmV0dXJuIGNvbmZpZztcbi8vIH1cblxuLyoqXG4gKiBNdXN0IGludm9rZSBpbml0UHJvY2VzcygpIG9yIGluaXRBc0NoaWxkUHJvY2VzcygpIGJlZm9yZSB0aGlzIGZ1bmN0aW9uLlxuICogSWYgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZnJvbSBhIGNoaWxkIHByb2Nlc3Mgb3IgdGhyZWFkIHdvcmtlciBvZiBQbGluayxcbiAqIHlvdSBtYXkgcGFzcyBgSlNPTi5wYXJzZShwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyEpYCBhcyBwYXJhbWV0ZXIgc2luY2VcbiAqIFBsaW5rJ3MgbWFpbiBwcm9jZXNzIHNhdmUgYEdsb2JhbE9wdGlvbnNgIGluIGVudmlyb25tZW50IHZhcmlhYmxlIFwiUExJTktfQ0xJX09QVFNcIixcbiAqIHNvIHRoYXQgY2hpbGQgcHJvY2VzcyBnZXRzIHNhbWUgR2xvYmFsT3B0aW9ucyBhcyB0aGUgbWFpbiBwcm9jZXNzIGRvZXMuXG4gKiBAcGFyYW0gb3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRDb25maWcob3B0aW9uczogR2xvYmFsT3B0aW9ucykge1xuICBjb25maWcuaW5pdFN5bmMob3B0aW9ucyk7XG4gIC8vIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHJldHVybiBjb25maWc7XG59XG5cbi8qKlxuICogLSBSZWdpc3RlciBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZFxuICogLSBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGlua1xuICogXG4gKiBETyBOT1QgZm9yayBhIGNoaWxkIHByb2Nlc3Mgb24gdGhpcyBmdW5jdGlvblxuICogQHBhcmFtIG9uU2h1dGRvd25TaWduYWwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHJvY2VzcyhvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdwaWQgJyArIHByb2Nlc3MucGlkICsgJzogYnllJyk7XG4gICAgdm9pZCBvblNodXQoKTtcbiAgfSk7XG4gIC8vIEJlIGF3YXJlIHRoaXMgaXMgd2h5IFwiaW5pdFByb2Nlc3NcIiBjYW4gbm90IGJlIFwiZm9ya1wiZWQgaW4gYSBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIGtlZXAgYWxpdmUgZm9yIHBhcmVudCBwcm9jZXNzJ3MgJ21lc3NhZ2UnIGV2ZW50XG4gIHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMiwgYnllLicpO1xuICAgICAgdm9pZCBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHtzYXZlU3RhdGUsIHN0YXRlRmFjdG9yeSwgc3RhcnRMb2dnaW5nfSA9IHJlcXVpcmUoJy4uL3N0b3JlJykgYXMgdHlwZW9mIHN0b3JlO1xuICBzdGFydExvZ2dpbmcoKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25TaHV0KCkge1xuICAgIGlmIChvblNodXRkb3duU2lnbmFsKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbCk7XG4gICAgfVxuICAgIGF3YWl0IHNhdmVTdGF0ZSgpO1xuICAgIHNldEltbWVkaWF0ZSgoKSA9PiBwcm9jZXNzLmV4aXQoMCkpO1xuICB9XG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmsuXG4gKiBcbiAqIFVzZSB0aGlzIGZ1bmN0aW9uIGluc3RlYWQgb2YgaW5pdFByb2Nlc3MoKSBpbiBjYXNlIGl0IGlzIGluIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3Mgb3Igd29ya2VyIHRocmVhZC5cbiAqIFxuICogVW5saW5rIGluaXRQcm9jZXNzKCkgd2hpY2ggcmVnaXN0ZXJzIHByb2Nlc3MgZXZlbnQgaGFuZGxlciBmb3IgU0lHSU5UIGFuZCBzaHV0ZG93biBjb21tYW5kLFxuICogaW4gY2FzZSB0aGlzIGlzIHJ1bm5pbmcgYXMgYSBmb3JrZWQgY2hpbGQgcHJvY2VzcywgaXQgd2lsbCBzdGFuZCBieSB1bnRpbCBwYXJlbnQgcHJvY2VzcyBleHBsaWNpdGx5XG4gKiAgc2VuZHMgYSBzaWduYWwgdG8gZXhpdFxuICogQHBhcmFtIHN5bmNTdGF0ZSBzZW5kIGNoYW5nZWQgc3RhdGUgYmFjayB0byBtYWluIHByb2Nlc3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRBc0NoaWxkUHJvY2VzcyhzeW5jU3RhdGUgPSBmYWxzZSwgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgY29uc3Qge3NhdmVTdGF0ZSwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmcsIHNldFN5bmNTdGF0ZVRvTWFpblByb2Nlc3N9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG4gIHByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ3BpZCAnICsgcHJvY2Vzcy5waWQgKyAnOiBieWUnKTtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbClcbiAgICAgIC50aGVuKCgpID0+IHNhdmVTdGF0ZSgpKVxuICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIGlmIChzeW5jU3RhdGUpIHtcbiAgICBzZXRTeW5jU3RhdGVUb01haW5Qcm9jZXNzKHRydWUpO1xuICB9XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ya0NsaShjbGlBcmdzOiBzdHJpbmdbXSwgb3B0czogRm9ya09wdGlvbnMgPSB7fSkge1xuICBjb25zdCBjcCA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCcuLi9jbWQtYm9vdHN0cmFwJyksIGNsaUFyZ3MsIHsuLi5vcHRzLCBzdGRpbzogWydpZ25vcmUnLCAnaW5oZXJpdCcsICdpbmhlcml0JywgJ2lwYyddfSk7XG4gIGNwLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuICAgIGlmIChzdG9yZS5pc1N0YXRlU3luY01zZyhtc2cpKSB7XG4gICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzdGF0ZSBzeW5jIG1lc3NhZ2UgZnJvbSBmb3JrZWQgcHJvY2VzcycpO1xuICAgICAgc3RvcmUuc3RhdGVGYWN0b3J5LmFjdGlvbnNUb0Rpc3BhdGNoLm5leHQoe3R5cGU6ICc6OnN5bmNTdGF0ZScsIHBheWxvYWQoc3RhdGU6IGFueSkge1xuICAgICAgICByZXR1cm4gZXZhbCgnKCcgKyBtc2cuZGF0YSArICcpJyk7XG4gICAgICB9fSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGNwO1xufVxuXG4iXX0=