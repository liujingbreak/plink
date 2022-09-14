/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
import {AppenderModule, LoggingEvent} from 'log4js';
const {send: sendLoggingEvent} = require('log4js/lib/clustering') as {send(msg: LoggingEvent): void};
const {deserialise} = require('log4js/lib/LoggingEvent') as {deserialise: (msg: string) => LoggingEvent};

/**
 * Log4js can handle cluster worker configuration, it will most likely ignore appenders, so it could be empty appender
 */
export const doNothingAppender: AppenderModule = {
  configure(_config, _layouts) {
    return function() {};
  }
};

export const childProcessAppender: AppenderModule = {
  configure(_config, _layouts, _findAppender) {
    // const layout = config.layout ? layouts.layout(config.layout.type, config.layout) : layouts.coloredLayout;
    if (process.send == null)
      throw new Error('Appender can not be used with process.send undefined (in master process)');

    return function(logEvent: LoggingEvent) {
      emitLogEventToParent(logEvent);
    };
  }
};

function emitLogEventToParent(logEvent: LoggingEvent | string) {
  process.send!({
    topic: 'log4js:message',
    data: typeof logEvent === 'string' ? logEvent : logEvent.serialise()
  });
}

export function childProcessMsgHandler(msg: {topic?: string, data: string}) {
  if (msg && msg.topic === 'log4js:message') {
    const logEvent = msg.data;
    if (process.send) {
      emitLogEventToParent(logEvent);
      return true;
    } else {
      sendLoggingEvent(deserialise(logEvent));
      // getLogger(logEvent.categoryName).log(logEvent.level, ...logEvent.data);
      // eslint-disable-next-line no-console
      // console.log(process.pid, logEvent);
      return true;
    }
  }
  return false;
}

