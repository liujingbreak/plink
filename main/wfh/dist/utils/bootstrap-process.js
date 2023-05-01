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
const node_cluster_1 = __importDefault(require("node:cluster"));
const node_child_process_1 = __importDefault(require("node:child_process"));
const worker_threads_1 = require("worker_threads");
const log4js_1 = __importDefault(require("log4js"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const config_1 = __importDefault(require("../config"));
const log4js_appenders_1 = require("./log4js-appenders");
// import inspector from 'inspector';
const log = log4js_1.default.getLogger('plink.bootstrap-process');
let processInitialized = false;
/** When process is on 'SIGINT' and "beforeExit", all functions will be executed */
exports.exitHooks = [];
process.on('uncaughtException', function (err) {
    if (err.code === 'ECONNRESET') {
        log.error('uncaughtException "ECONNRESET"', err);
    }
    else {
        log.error(`PID: ${process.pid} uncaughtException: `, err);
        throw err; // let PM2 handle exception
    }
});
process.on(`PID: ${process.pid} unhandledRejection`, err => {
    if (err.code === 'ECONNRESET') {
        log.error('unhandledRejection "ECONNRESET"', err);
    }
    else {
        log.error(`PID: ${process.pid} unhandledRejection: `, err);
        throw err; // let PM2 handle exception
    }
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
function initProcess(saveState = 'none') {
    if (processInitialized) {
        console.info(new Error('Current process has already been initialized, skip initialization'));
        return;
    }
    processInitialized = true;
    if (process.env.__plinkLogMainPid == null) {
        process.env.__plinkLogMainPid = process.pid + '';
    }
    // if (process.env.__plinkLogMainPid !== process.pid + '') {
    //   console.log('open inspector on 9222 of PID:', process.pid);
    //   inspector.open(9222);
    // }
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
                console.log(`[bootstrap-process] Process ${process.pid} Exit with`, exitCode);
                process.exit(exitCode);
            }
            else if (exitCode !== 0) {
                // eslint-disable-next-line no-console
                console.log(`[bootstrap-process] Process ${process.pid} Exit with`, exitCode);
                process.exit(exitCode);
            }
        })).subscribe();
    }
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
function initAsChildProcess(saveState = 'none') {
    return initProcess(saveState);
}
exports.initAsChildProcess = initAsChildProcess;
function interceptFork() {
    const origFork = node_child_process_1.default.fork;
    const handler = (process.env.__plinkLogMainPid === process.pid + '' ||
        process.send == null) ?
        (msg) => (0, log4js_appenders_1.emitChildProcessLogMsg)(msg, false)
        : (msg) => (0, log4js_appenders_1.emitChildProcessLogMsg)(msg, true);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    node_child_process_1.default.fork = function (...args) {
        const cp = origFork.apply(node_child_process_1.default, args);
        cp.on('message', handler);
        return cp;
    };
    node_cluster_1.default.on('message', handler);
}
function configDefaultLog() {
    if (node_cluster_1.default.isWorker) {
        // https://github.dev/log4js-node/log4js-node/blob/master/lib/clustering.js
        // if `disableClustering` is not `true`, log4js will ignore configuration and
        // always use `process.send()`
        log4js_1.default.configure({
            appenders: {
                out: { type: log4js_appenders_1.doNothingAppender }
            },
            categories: {
                default: { appenders: ['out'], level: 'info' }
            }
            // disableClustering: true
        });
    }
    else if (process.env.__plinkLogMainPid === process.pid + '') {
        if (worker_threads_1.isMainThread) {
            // eslint-disable-next-line no-console
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
            // log4jsThreadBroadcast.onmessage = msg => emitThreadLogMsg(msg as any);
            // log4jsThreadBroadcast.unref();
        }
        else {
            log4js_1.default.configure({
                appenders: {
                    out: { type: log4js_appenders_1.workerThreadAppender }
                },
                categories: {
                    default: { appenders: ['out'], level: 'info' }
                }
            });
        }
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