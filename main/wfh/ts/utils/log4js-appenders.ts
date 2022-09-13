/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
import {getLogger, AppenderModule, CustomLayout, ColoredLayout, BaseLayout, LoggingEvent} from 'log4js';

type Config = {
  type: string;
  layout?: {
    type: string;
  };
};

type Layouts = {
  layout(type: NonNullable<Config['layout']>['type'], layoutOpt: NonNullable<Config['layout']>): CustomLayout;
  coloredLayout: ColoredLayout;
  basicLayout: BaseLayout
};

/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
export const doNothingAppender: AppenderModule = {
  configure(config: Config, layouts: Layouts) {
  }
};

export const childProcessAppender: AppenderModule = {
  configure(config: Config, layouts: Layouts, findAppender: (name: string) => AppenderModule) {
    // const layout = config.layout ? layouts.layout(config.layout.type, config.layout) : layouts.coloredLayout;
    if (process.send == null)
      throw new Error('Appender can not be used with process.send undefined (in master process)');

    return function(logEvent: LoggingEvent) {
      emitLogEventToParent(logEvent);
    };
  }
};

function emitLogEventToParent(logEvent: LoggingEvent) {
  process.send!({
    type: 'plinkLog4jsEvent',
    payload: logEvent
  });
}

export function childProcessMsgHandler(msg: {type?: string}) {
  if (msg && (msg).type === 'plinkLog4jsEvent') {
    const logEvent = (msg as {payload: LoggingEvent}).payload;
    if (process.send) {
      emitLogEventToParent(logEvent);
    } else {
      getLogger(logEvent.categoryName).log(logEvent.level, ...logEvent.data);
      // eslint-disable-next-line no-console
      // console.log(process.pid, logEvent);
    }
  }
}

