"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterSlaveAppender = void 0;
exports.clusterSlaveAppender = {
    configure(config, layouts) {
        // const layout = config.layout ? layouts.layout(config.layout.type, config.layout) : 
        if (process.send == null)
            throw new Error('Cluster slave appender can not be used with process.send undefined (in master process)');
        return function (logEvent) {
            process.send({
                type: 'plinkSlaveLog',
                payload: logEvent
            });
        };
    }
};
//# sourceMappingURL=log4js-appenders.js.map