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
function initProcess(saveState = true, onShutdownSignal) {
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
    const { dispatcher, storeSavedAction$, stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore();
    if (!saveState) {
        dispatcher.changeActionOnExit('none');
    }
    function onShut() {
        return __awaiter(this, void 0, void 0, function* () {
            if (onShutdownSignal) {
                yield Promise.resolve(onShutdownSignal);
            }
            const saved = storeSavedAction$.pipe(op.take(1)).toPromise();
            dispatcher.processExit();
            yield saved;
            setImmediate(() => process.exit(0));
        });
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
    const { stateFactory, startLogging, dispatcher } = require('../store');
    process.on('SIGINT', function () {
        // eslint-disable-next-line no-console
        if (onShutdownSignal) {
            void Promise.resolve(onShutdownSignal)
                .then(() => dispatcher.processExit())
                .finally(() => {
                log.info('bye');
                setImmediate(() => process.exit(0));
            });
        }
        else {
            log.info('bye');
            process.exit(0);
        }
    });
    startLogging();
    stateFactory.configureStore();
    if (saveState)
        dispatcher.changeActionOnExit('save');
}
exports.initAsChildProcess = initAsChildProcess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFJL0IsbURBQXFDO0FBRXJDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFFeEQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN2QyxNQUFNLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQjtBQUN4QyxDQUFDLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUNIOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixVQUFVLENBQUMsT0FBc0I7SUFDL0MsZ0JBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekIsdUJBQXVCO0lBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztBQUNoQixDQUFDO0FBSkQsZ0NBSUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixXQUFXLENBQUMsU0FBUyxHQUFHLElBQUksRUFBRSxnQkFBNEM7SUFDeEYsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7UUFDbkIsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDLENBQUM7UUFDekMsS0FBSyxNQUFNLEVBQUUsQ0FBQztJQUNoQixDQUFDLENBQUMsQ0FBQztJQUNILHFJQUFxSTtJQUNySSxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7UUFDaEMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO1lBQ3RCLHNDQUFzQztZQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7WUFDcEQsS0FBSyxNQUFNLEVBQUUsQ0FBQztTQUNmO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLEVBQUMsVUFBVSxFQUFFLGlCQUFpQixFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFpQixDQUFDO0lBRXhHLFlBQVksRUFBRSxDQUFDO0lBQ2YsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBRTlCLElBQUksQ0FBQyxTQUFTLEVBQUU7UUFDZCxVQUFVLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDdkM7SUFFRCxTQUFlLE1BQU07O1lBQ25CLElBQUksZ0JBQWdCLEVBQUU7Z0JBQ3BCLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2FBQ3pDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM3RCxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekIsTUFBTSxLQUFLLENBQUM7WUFDWixZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7S0FBQTtJQUNELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFsQ0Qsa0NBa0NDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0gsU0FBZ0Isa0JBQWtCLENBQUMsU0FBUyxHQUFHLEtBQUssRUFBRSxnQkFBNEM7SUFDaEcsTUFBTSxFQUFDLFlBQVksRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBaUIsQ0FBQztJQUNyRixPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNuQixzQ0FBc0M7UUFDdEMsSUFBSSxnQkFBZ0IsRUFBRTtZQUNwQixLQUFLLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7aUJBQ3JDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsV0FBVyxFQUFFLENBQUM7aUJBQ3BDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDaEIsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN0QyxDQUFDLENBQUMsQ0FBQztTQUNKO2FBQU07WUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakI7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILFlBQVksRUFBRSxDQUFDO0lBQ2YsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzlCLElBQUksU0FBUztRQUNYLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBckJELGdEQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbi8vIGltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmJvb3RzdHJhcC1wcm9jZXNzJyk7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uOiAnLCBlcnIpO1xuICB0aHJvdyBlcnI7IC8vIGxldCBQTTIgaGFuZGxlIGV4Y2VwdGlvblxufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4gIGxvZy5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbn0pO1xuLyoqXG4gKiBNdXN0IGludm9rZSBpbml0UHJvY2VzcygpIG9yIGluaXRBc0NoaWxkUHJvY2VzcygpIGJlZm9yZSB0aGlzIGZ1bmN0aW9uLlxuICogSWYgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZnJvbSBhIGNoaWxkIHByb2Nlc3Mgb3IgdGhyZWFkIHdvcmtlciBvZiBQbGluayxcbiAqIHlvdSBtYXkgcGFzcyBgSlNPTi5wYXJzZShwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyEpYCBhcyBwYXJhbWV0ZXIgc2luY2VcbiAqIFBsaW5rJ3MgbWFpbiBwcm9jZXNzIHNhdmUgYEdsb2JhbE9wdGlvbnNgIGluIGVudmlyb25tZW50IHZhcmlhYmxlIFwiUExJTktfQ0xJX09QVFNcIixcbiAqIHNvIHRoYXQgY2hpbGQgcHJvY2VzcyBnZXRzIHNhbWUgR2xvYmFsT3B0aW9ucyBhcyB0aGUgbWFpbiBwcm9jZXNzIGRvZXMuXG4gKiBAcGFyYW0gb3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRDb25maWcob3B0aW9uczogR2xvYmFsT3B0aW9ucykge1xuICBjb25maWcuaW5pdFN5bmMob3B0aW9ucyk7XG4gIC8vIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gIHJldHVybiBjb25maWc7XG59XG5cbi8qKlxuICogLSBSZWdpc3RlciBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZFxuICogLSBJbml0aWFsaXplIHJlZHV4LXN0b3JlIGZvciBQbGlua1xuICogXG4gKiBETyBOT1QgZm9yayBhIGNoaWxkIHByb2Nlc3Mgb24gdGhpcyBmdW5jdGlvblxuICogQHBhcmFtIG9uU2h1dGRvd25TaWduYWwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHJvY2VzcyhzYXZlU3RhdGUgPSB0cnVlLCBvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdwaWQgJyArIHByb2Nlc3MucGlkICsgJzogYnllJyk7XG4gICAgdm9pZCBvblNodXQoKTtcbiAgfSk7XG4gIC8vIEJlIGF3YXJlIHRoaXMgaXMgd2h5IFwiaW5pdFByb2Nlc3NcIiBjYW4gbm90IGJlIFwiZm9ya1wiZWQgaW4gYSBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIGtlZXAgYWxpdmUgZm9yIHBhcmVudCBwcm9jZXNzJ3MgJ21lc3NhZ2UnIGV2ZW50XG4gIHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oJ1JlY2lldmUgc2h1dGRvd24gbWVzc2FnZSBmcm9tIFBNMiwgYnllLicpO1xuICAgICAgdm9pZCBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBzdG9yZVNhdmVkQWN0aW9uJCwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmd9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG4gIGlmICghc2F2ZVN0YXRlKSB7XG4gICAgZGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKG9uU2h1dGRvd25TaWduYWwpO1xuICAgIH1cbiAgICBjb25zdCBzYXZlZCA9IHN0b3JlU2F2ZWRBY3Rpb24kLnBpcGUob3AudGFrZSgxKSkudG9Qcm9taXNlKCk7XG4gICAgZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpO1xuICAgIGF3YWl0IHNhdmVkO1xuICAgIHNldEltbWVkaWF0ZSgoKSA9PiBwcm9jZXNzLmV4aXQoMCkpO1xuICB9XG4gIHJldHVybiBkaXNwYXRjaGVyO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rLlxuICogXG4gKiBVc2UgdGhpcyBmdW5jdGlvbiBpbnN0ZWFkIG9mIGluaXRQcm9jZXNzKCkgaW4gY2FzZSBpdCBpcyBpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzIG9yIHdvcmtlciB0aHJlYWQuXG4gKiBcbiAqIFVubGluayBpbml0UHJvY2VzcygpIHdoaWNoIHJlZ2lzdGVycyBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZCxcbiAqIGluIGNhc2UgdGhpcyBpcyBydW5uaW5nIGFzIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwgc3RhbmQgYnkgdW50aWwgcGFyZW50IHByb2Nlc3MgZXhwbGljaXRseVxuICogIHNlbmRzIGEgc2lnbmFsIHRvIGV4aXRcbiAqIEBwYXJhbSBzeW5jU3RhdGUgc2VuZCBjaGFuZ2VkIHN0YXRlIGJhY2sgdG8gbWFpbiBwcm9jZXNzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0QXNDaGlsZFByb2Nlc3Moc2F2ZVN0YXRlID0gZmFsc2UsIG9uU2h1dGRvd25TaWduYWw/OiAoKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+KSB7XG4gIGNvbnN0IHtzdGF0ZUZhY3RvcnksIHN0YXJ0TG9nZ2luZywgZGlzcGF0Y2hlcn0gPSByZXF1aXJlKCcuLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgdm9pZCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbClcbiAgICAgIC50aGVuKCgpID0+IGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKSlcbiAgICAgIC5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ2J5ZScpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuaW5mbygnYnllJyk7XG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfVxuICB9KTtcblxuICBzdGFydExvZ2dpbmcoKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIGlmIChzYXZlU3RhdGUpXG4gICAgZGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ3NhdmUnKTtcbn1cbiJdfQ==