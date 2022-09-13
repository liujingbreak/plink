"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childProcessMsgHandler = exports.childProcessAppender = exports.doNothingAppender = void 0;
/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
const log4js_1 = require("log4js");
/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
exports.doNothingAppender = {
    configure(config, layouts) {
    }
};
exports.childProcessAppender = {
    configure(config, layouts, findAppender) {
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
        type: 'plinkLog4jsEvent',
        payload: logEvent
    });
}
function childProcessMsgHandler(msg) {
    if (msg && (msg).type === 'plinkLog4jsEvent') {
        const logEvent = msg.payload;
        if (process.send) {
            emitLogEventToParent(logEvent);
        }
        else {
            (0, log4js_1.getLogger)(logEvent.categoryName).log(logEvent.level, ...logEvent.data);
            // eslint-disable-next-line no-console
            // console.log(process.pid, logEvent);
        }
    }
}
exports.childProcessMsgHandler = childProcessMsgHandler;
//# sourceMappingURL=log4js-appenders.js.map