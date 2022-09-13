"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAsChildProcess = exports.initProcess = exports.initConfig = exports.exitHooks = void 0;
const tslib_1 = require("tslib");
require("../node-path");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const node_child_process_1 = tslib_1.__importDefault(require("node:child_process"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const config_1 = tslib_1.__importDefault(require("../config"));
const log4js_appenders_1 = require("./log4js-appenders");
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
    interceptFork();
    // TODO: Not working when press ctrl + c, and no async operation can be finished on "SIGINT" event
    process.once('beforeExit', function (code) {
        log.info('pid ' + process.pid + ': bye');
        onShut(code, false);
    });
    process.once('SIGINT', () => {
        log.info('pid' + process.pid + ' recieves SIGINT');
        onShut(0, true);
    });
    configDefaultLog();
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
function interceptFork() {
    const origFork = node_child_process_1.default.fork;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    node_child_process_1.default.fork = function (...args) {
        const cp = origFork.apply(node_child_process_1.default, args);
        cp.on('message', log4js_appenders_1.childProcessMsgHandler);
        return cp;
    };
    node_cluster_1.default.on('fork', worker => {
        worker.on('message', log4js_appenders_1.childProcessMsgHandler);
    });
}
function configDefaultLog() {
    if (node_cluster_1.default.isWorker) {
        log4js_1.default.configure({
            appenders: {
                out: { type: log4js_appenders_1.childProcessAppender }
            },
            categories: {
                default: { appenders: ['out'], level: 'info' }
            },
            disableClustering: true
        });
        return;
    }
    else if (process.send) {
        log4js_1.default.configure({
            appenders: {
                out: { type: log4js_appenders_1.childProcessAppender }
            },
            categories: {
                default: { appenders: ['out'], level: 'info' }
            }
        });
    }
    else {
        log4js_1.default.configure({
            appenders: {
                out: {
                    type: 'stdout',
                    layout: { type: 'pattern', pattern: '[P%z] %[%c%] - %m' }
                }
            },
            categories: {
                default: { appenders: ['out'], level: 'info' }
            }
        });
    }
    /**
     - %r time in toLocaleTimeString format
     - %p log level
     - %c log category
     - %h hostname
     - %m log data
     - %d date, formatted - default is ISO8601, format options are: ISO8601, ISO8601_WITH_TZ_OFFSET, ABSOLUTE, DATE, or any string compatible with the date-format library. e.g. %d{DATE}, %d{yyyy/MM/dd-hh.mm.ss}
     - %% % - for when you want a literal % in your output
     - %n newline
     - %z process id (from process.pid)
     - %f full path of filename (requires enableCallStack: true on the category, see configuration object)
     - %f{depth} path’s depth let you chose to have only filename (%f{1}) or a chosen number of directories
     - %l line number (requires enableCallStack: true on the category, see configuration object)
     - %o column postion (requires enableCallStack: true on the category, see configuration object)
     - %s call stack (requires enableCallStack: true on the category, see configuration object)
     - %x{<tokenname>} add dynamic tokens to your log. Tokens are specified in the tokens parameter.
     - %X{<tokenname>} add values from the Logger context. Tokens are keys into the context values.
     - %[ start a coloured block (colour will be taken from the log level, similar to colouredLayout)
     - %] end a coloured block
     */
}
//# sourceMappingURL=bootstrap-process.js.map