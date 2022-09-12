"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childProcessAppender = exports.clusterSlaveAppender = void 0;
/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
exports.clusterSlaveAppender = {
    configure(config, layouts) {
    }
};
exports.childProcessAppender = {
    configure(config, layouts) {
        // const layout = config.layout ? layouts.layout(config.layout.type, config.layout) : 
        if (process.send == null)
            throw new Error('Appender can not be used with process.send undefined (in master process)');
        return function (logEvent) {
            process.send({
                type: 'plinkLog4jsEvent',
                payload: logEvent
            });
        };
    }
};
//# sourceMappingURL=log4js-appenders.js.map