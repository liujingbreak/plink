"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
 * @param _onShutdownSignal
 */
function initProcess(saveState = 'none', _onShutdownSignal, handleShutdownMsg = false) {
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
    function onShut(_code, explicitlyExit) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdCQUFzQjtBQUN0QixvREFBNEI7QUFDNUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyx1REFBK0I7QUFLL0IsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztBQUV4RCxtRkFBbUY7QUFDdEUsUUFBQSxTQUFTLEdBQUcsRUFBZ0UsQ0FBQztBQUUxRixPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLFVBQVMsR0FBRztJQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDO0FBQ0g7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLFVBQVUsQ0FBQyxVQUF5QixFQUFFO0lBQ3BELGdCQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLHVCQUF1QjtJQUN2QixPQUFPLGdCQUFNLENBQUM7QUFDaEIsQ0FBQztBQUpELGdDQUlDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLFlBQWdELE1BQU0sRUFBRSxpQkFBeUQsRUFBRSxpQkFBaUIsR0FBRyxLQUFLO0lBQ3RLLGtHQUFrRztJQUNsRyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxVQUFTLElBQUk7UUFD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LENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtZQUNaLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN6QixPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksY0FBYyxFQUFFO2dCQUNsQixzQ0FBc0M7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxPQUFPLENBQUMsR0FBRyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzFELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDeEI7aUJBQU0sSUFBSSxRQUFRLEtBQUssQ0FBQyxFQUFFO2dCQUN6QixzQ0FBc0M7Z0JBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxPQUFPLENBQUMsR0FBRyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzFELE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDeEI7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFDRCxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBcEZELGtDQW9GQztBQUVEOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILFNBQWdCLGtCQUFrQixDQUFDLFlBQWdELE1BQU0sRUFBRSxnQkFBNEM7SUFDckksT0FBTyxXQUFXLENBQUMsU0FBUyxFQUFFLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFGRCxnREFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuLy8gaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuYm9vdHN0cmFwLXByb2Nlc3MnKTtcblxuLyoqIFdoZW4gcHJvY2VzcyBpcyBvbiAnU0lHSU5UJyBhbmQgXCJiZWZvcmVFeGl0XCIsIGFsbCBmdW5jdGlvbnMgd2lsbCBiZSBleGVjdXRlZCAqL1xuZXhwb3J0IGNvbnN0IGV4aXRIb29rcyA9IFtdIGFzIEFycmF5PCgpID0+IChyeC5PYnNlcnZhYmxlSW5wdXQ8dW5rbm93bj4gfCB2b2lkIHwgbnVtYmVyKT47XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uOiAnLCBlcnIpO1xuICB0aHJvdyBlcnI7IC8vIGxldCBQTTIgaGFuZGxlIGV4Y2VwdGlvblxufSk7XG5cbnByb2Nlc3Mub24oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVyciA9PiB7XG4gIGxvZy5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbn0pO1xuLyoqXG4gKiBNdXN0IGludm9rZSBpbml0UHJvY2VzcygpIG9yIGluaXRBc0NoaWxkUHJvY2VzcygpIGJlZm9yZSB0aGlzIGZ1bmN0aW9uLlxuICogSWYgdGhpcyBmdW5jdGlvbiBpcyBjYWxsZWQgZnJvbSBhIGNoaWxkIHByb2Nlc3Mgb3IgdGhyZWFkIHdvcmtlciBvZiBQbGluayxcbiAqIHlvdSBtYXkgcGFzcyBgSlNPTi5wYXJzZShwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyEpYCBhcyBwYXJhbWV0ZXIgc2luY2VcbiAqIFBsaW5rJ3MgbWFpbiBwcm9jZXNzIHNhdmUgYEdsb2JhbE9wdGlvbnNgIGluIGVudmlyb25tZW50IHZhcmlhYmxlIFwiUExJTktfQ0xJX09QVFNcIixcbiAqIHNvIHRoYXQgY2hpbGQgcHJvY2VzcyBnZXRzIHNhbWUgR2xvYmFsT3B0aW9ucyBhcyB0aGUgbWFpbiBwcm9jZXNzIGRvZXMuXG4gKiBAcGFyYW0gb3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRDb25maWcob3B0aW9uczogR2xvYmFsT3B0aW9ucyA9IHt9KSB7XG4gIGNvbmZpZy5pbml0U3luYyhvcHRpb25zKTtcbiAgLy8gbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cblxuLyoqXG4gKiAtIFJlZ2lzdGVyIHByb2Nlc3MgZXZlbnQgaGFuZGxlciBmb3IgU0lHSU5UIGFuZCBzaHV0ZG93biBjb21tYW5kXG4gKiAtIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rXG4gKiBcbiAqIERPIE5PVCBmb3JrIGEgY2hpbGQgcHJvY2VzcyBvbiB0aGlzIGZ1bmN0aW9uXG4gKiBAcGFyYW0gX29uU2h1dGRvd25TaWduYWwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHJvY2VzcyhzYXZlU3RhdGU6IHN0b3JlLlN0b3JlU2V0dGluZ1snYWN0aW9uT25FeGl0J10gPSAnbm9uZScsIF9vblNodXRkb3duU2lnbmFsPzogKGNvZGU6IG51bWJlcikgPT4gdm9pZCB8IFByb21pc2U8YW55PiwgaGFuZGxlU2h1dGRvd25Nc2cgPSBmYWxzZSkge1xuICAvLyBUT0RPOiBOb3Qgd29ya2luZyB3aGVuIHByZXNzIGN0cmwgKyBjLCBhbmQgbm8gYXN5bmMgb3BlcmF0aW9uIGNhbiBiZSBmaW5pc2hlZCBvbiBcIlNJR0lOVFwiIGV2ZW50XG4gIHByb2Nlc3Mub25jZSgnYmVmb3JlRXhpdCcsIGZ1bmN0aW9uKGNvZGUpIHtcbiAgICBsb2cuaW5mbygncGlkICcgKyBwcm9jZXNzLnBpZCArICc6IGJ5ZScpO1xuICAgIG9uU2h1dChjb2RlLCBmYWxzZSk7XG4gIH0pO1xuICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsICgpID0+IHtcbiAgICBsb2cuaW5mbygncGlkJyArIHByb2Nlc3MucGlkICsgJyByZWNpZXZlcyBTSUdJTlQnKTtcbiAgICBvblNodXQoMCwgdHJ1ZSk7XG4gIH0pO1xuXG4gIGlmIChoYW5kbGVTaHV0ZG93bk1zZykge1xuICAgIC8vIEJlIGF3YXJlIHRoaXMgaXMgd2h5IFwiaW5pdFByb2Nlc3NcIiBjYW4gbm90IGJlIFwiZm9ya1wiZWQgaW4gYSBjaGlsZCBwcm9jZXNzLCBpdCB3aWxsIGtlZXAgYWxpdmUgZm9yIHBhcmVudCBwcm9jZXNzJ3MgJ21lc3NhZ2UnIGV2ZW50XG4gICAgcHJvY2Vzcy5vbignbWVzc2FnZScsIGZ1bmN0aW9uKG1zZykge1xuICAgICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICAgIG9uU2h1dCgwLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBzdG9yZVNhdmVkQWN0aW9uJCwgc3RhdGVGYWN0b3J5LCBzdGFydExvZ2dpbmd9ID0gcmVxdWlyZSgnLi4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG5cbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBkaXNwYXRjaGVyLmNoYW5nZUFjdGlvbk9uRXhpdChzYXZlU3RhdGUpO1xuXG4gIGZ1bmN0aW9uIG9uU2h1dChfY29kZTogbnVtYmVyLCBleHBsaWNpdGx5RXhpdDogYm9vbGVhbikge1xuICAgIGxldCBleGl0Q29kZSA9IDA7XG4gICAgcnguY29uY2F0KFxuICAgICAgcnguZnJvbShleGl0SG9va3MpLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKGhvb2tGbiA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJldCA9IGhvb2tGbigpO1xuICAgICAgICAgICAgaWYgKHJldCA9PSBudWxsIHx8IHR5cGVvZiByZXQgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgIHJldHVybiByeC5vZihyZXQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJ4LmZyb20ocmV0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGV4ZWN1dGUgc2h1dGRvd24gaG9va3MnLCBlcnIpO1xuICAgICAgICAgICAgZXhpdENvZGUgPSAxO1xuICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBleGVjdXRlIHNodXRkb3duIGhvb2tzJywgZXJyKTtcbiAgICAgICAgICBleGl0Q29kZSA9IDE7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KSxcbiAgICAgICAgb3AubWFwKChyZXQpID0+IHtcbiAgICAgICAgICBpZiAodHlwZW9mIHJldCA9PT0gJ251bWJlcicgJiYgcmV0ICE9PSAwKSB7XG4gICAgICAgICAgICBleGl0Q29kZSA9IHJldDtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdFeGl0IGhvb2sgcmV0dXJuczonLCBleGl0Q29kZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIHJ4Lm1lcmdlKFxuICAgICAgICAvLyBvbmNlIFwiZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpIGlzIGV4ZWN1dGVkLCBzdG9yZVNhdmVkQWN0aW9uJCB3aWxsIGJlIGVtdHRlZCByZWN1c2l2ZWx5LlxuICAgICAgICAvLyBUaGVyZWZvcmUgc3RvcmVTYXZlZEFjdGlvbiQgbXVzdCBiZSBzdWJzY3JpYmVkIGJlZm9yZSBkaXNwYXRjaGVyLnByb2Nlc3NFeGl0KClcbiAgICAgICAgc3RvcmVTYXZlZEFjdGlvbiQucGlwZShvcC50YWtlKDEpKSxcbiAgICAgICAgLy8gQSBkZWZlcigpIGNhbiBtYWtlIHN1cmUgZGlzcGF0Y2hlci5wcm9jZXNzRXhpdCgpIGlzIGNhbGxlZCBsYXRlciB0aGFuIHN0b3JlU2F2ZWRBY3Rpb24kXG4gICAgICAgIC8vIGJlaW5nIHN1YnNjcmliZWRcbiAgICAgICAgcnguZGVmZXIoKCkgPT4ge1xuICAgICAgICAgIGRpc3BhdGNoZXIucHJvY2Vzc0V4aXQoKTtcbiAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICBpZiAoZXhwbGljaXRseUV4aXQpIHtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKGBQcm9jZXNzICR7cHJvY2Vzcy5waWR9IEV4aXQgd2l0aGAsIGV4aXRDb2RlKTtcbiAgICAgICAgICBwcm9jZXNzLmV4aXQoZXhpdENvZGUpO1xuICAgICAgICB9IGVsc2UgaWYgKGV4aXRDb2RlICE9PSAwKSB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZyhgUHJvY2VzcyAke3Byb2Nlc3MucGlkfSBFeGl0IHdpdGhgLCBleGl0Q29kZSk7XG4gICAgICAgICAgcHJvY2Vzcy5leGl0KGV4aXRDb2RlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG4gIHJldHVybiBkaXNwYXRjaGVyO1xufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rLlxuICogXG4gKiBVc2UgdGhpcyBmdW5jdGlvbiBpbnN0ZWFkIG9mIGluaXRQcm9jZXNzKCkgaW4gY2FzZSBpdCBpcyBpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzIG9yIHdvcmtlciB0aHJlYWQgb2YgUGxpbmsuXG4gKiBTbyB0aGF0IHBsaW5rIHdvbid0IGxpc3RlbmVyIHRvIFBNMidzIHNodXRkb3duIG1lc3NhZ2UgaW4gdGhpcyBjYXNlLlxuICogQmUgYXdhcmUgdGhhdCBQbGluayBtYWluIHByb2Nlc3MgY291bGQgYmUgYSBjaGlsZCBwcm9jZXNzIG9mIFBNMiBvciBhbnkgb3RoZXIgTm9kZS5qcyBwcm9jZXNzIG1hbmFnZXIsXG4gKiB0aGF0J3Mgd2hhdCBpbml0UHJvY2VzcygpIGRvZXMgdG8gbGlzdGVuZXIgdG8gUE0yJ3MgbWVzc2FnZS5cblxuICogVW5saW5rIGluaXRQcm9jZXNzKCkgd2hpY2ggcmVnaXN0ZXJzIHByb2Nlc3MgZXZlbnQgaGFuZGxlciBmb3IgU0lHSU5UIGFuZCBzaHV0ZG93biBjb21tYW5kLFxuICogaW4gY2FzZSB0aGlzIGlzIHJ1bm5pbmcgYXMgYSBmb3JrZWQgY2hpbGQgcHJvY2VzcywgaXQgd2lsbCBzdGFuZCBieSB1bnRpbCBwYXJlbnQgcHJvY2VzcyBleHBsaWNpdGx5XG4gKiAgc2VuZHMgYSBzaWduYWwgdG8gZXhpdFxuICogQHBhcmFtIHN5bmNTdGF0ZSBzZW5kIGNoYW5nZWQgc3RhdGUgYmFjayB0byBtYWluIHByb2Nlc3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRBc0NoaWxkUHJvY2VzcyhzYXZlU3RhdGU6IHN0b3JlLlN0b3JlU2V0dGluZ1snYWN0aW9uT25FeGl0J10gPSAnbm9uZScsIG9uU2h1dGRvd25TaWduYWw/OiAoKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+KSB7XG4gIHJldHVybiBpbml0UHJvY2VzcyhzYXZlU3RhdGUsIG9uU2h1dGRvd25TaWduYWwsIGZhbHNlKTtcbn1cbiJdfQ==