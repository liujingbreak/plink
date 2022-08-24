/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
import {AppenderModule, CustomLayout, LoggingEvent} from 'log4js';

type Config = {
  type: string;
  layout?: {
    type: string;
  };
};

type Layouts = {
  layout(type: NonNullable<Config['layout']>['type'], layoutOpt: NonNullable<Config['layout']>): CustomLayout;
};

export const clusterSlaveAppender: AppenderModule = {
  configure(config: Config, layouts: Layouts) {
    // const layout = config.layout ? layouts.layout(config.layout.type, config.layout) : 
    if (process.send == null)
      throw new Error('Cluster slave appender can not be used with process.send undefined (in master process)');

    return function(logEvent: LoggingEvent) {
      process.send!({
        type: 'plinkSlaveLog',
        payload: logEvent
      });
    };
  }
};

