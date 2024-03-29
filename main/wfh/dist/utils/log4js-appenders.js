"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitThreadLogMsg = exports.emitChildProcessLogMsg = exports.workerThreadAppender = exports.log4jsThreadBroadcast = exports.childProcessAppender = exports.doNothingAppender = void 0;
/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
const worker_threads_1 = require("worker_threads");
const { send: sendLoggingEvent } = require('log4js/lib/clustering');
const { deserialise } = require('log4js/lib/LoggingEvent');
/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
exports.doNothingAppender = {
    configure(_config, _layouts) {
        return function () { };
    }
};
exports.childProcessAppender = {
    configure(_config, _layouts, _findAppender) {
        // const layout = config.layout ? layouts.layout(config.layout.type, config.layout) : layouts.coloredLayout;
        if (process.send == null)
            throw new Error('Appender can not be used with process.send undefined (in master process)');
        return emitLogEventToParent;
    }
};
exports.log4jsThreadBroadcast = new worker_threads_1.BroadcastChannel('log4js:plink');
exports.log4jsThreadBroadcast.unref();
exports.workerThreadAppender = {
    configure(_config, _layouts, _findAppender) {
        return function (logEvent) {
            exports.log4jsThreadBroadcast === null || exports.log4jsThreadBroadcast === void 0 ? void 0 : exports.log4jsThreadBroadcast.postMessage({
                topic: 'log4js:message',
                data: typeof logEvent === 'string' ? logEvent : logEvent.serialise()
            });
        };
    }
};
function emitLogEventToParent(logEvent, _fromChildProcess = false) {
    try {
        // if (typeof logEvent !== 'string')
        //   console.log(`[debug log] ${fromChildProcess ? '<passthrough>' : ''} emit to parent from`, process.pid, logEvent.pid, logEvent.data);
        process.send({
            topic: 'log4js:message',
            data: typeof logEvent === 'string' ? logEvent : logEvent.serialise()
        });
    }
    catch (e) {
        console.error(`emit log error, PID: ${process.pid}`, e);
    }
}
/**
 * Emit log event to log4js appenders
 */
function emitChildProcessLogMsg(msg, toParent = false) {
    if (msg && msg.topic === 'log4js:message') {
        const logEvent = msg.data;
        if (toParent) {
            emitLogEventToParent(msg.data, true);
        }
        else {
            sendLoggingEvent(deserialise(logEvent));
        }
        return true;
    }
    return false;
}
exports.emitChildProcessLogMsg = emitChildProcessLogMsg;
function emitThreadLogMsg(msg) {
    var _a;
    if (((_a = msg.data) === null || _a === void 0 ? void 0 : _a.topic) === 'log4js:message') {
        const logEvent = msg.data.data;
        sendLoggingEvent(deserialise(logEvent));
        return true;
    }
    return false;
}
exports.emitThreadLogMsg = emitThreadLogMsg;
//# sourceMappingURL=log4js-appenders.js.map