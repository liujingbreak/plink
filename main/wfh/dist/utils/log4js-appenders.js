"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childProcessMsgHandler = exports.childProcessAppender = exports.doNothingAppender = void 0;
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
        return function (logEvent) {
            emitLogEventToParent(logEvent);
        };
    }
};
function emitLogEventToParent(logEvent) {
    process.send({
        topic: 'log4js:message',
        data: typeof logEvent === 'string' ? logEvent : logEvent.serialise()
    });
}
function childProcessMsgHandler(msg) {
    if (msg && msg.topic === 'log4js:message') {
        const logEvent = msg.data;
        if (process.send) {
            emitLogEventToParent(logEvent);
        }
        else {
            sendLoggingEvent(deserialise(logEvent));
            // getLogger(logEvent.categoryName).log(logEvent.level, ...logEvent.data);
            // eslint-disable-next-line no-console
            // console.log(process.pid, logEvent);
        }
    }
}
exports.childProcessMsgHandler = childProcessMsgHandler;
//# sourceMappingURL=log4js-appenders.js.map