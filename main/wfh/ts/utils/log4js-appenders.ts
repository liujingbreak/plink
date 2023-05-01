/**
 * https://log4js-node.github.io/log4js-node/writing-appenders.html
 */
// import {BroadcastChannel} from 'worker_threads';
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

    return emitLogEventToParent;
  }
};

// export const log4jsThreadBroadcast = new BroadcastChannel('log4js:plink');
export const workerThreadAppender: AppenderModule = {
  configure(_config, _layouts, _findAppender) {

    return function(logEvent: LoggingEvent | string) {
      // log4jsThreadBroadcast?.postMessage({
      //   topic: 'log4js:message',
      //   data: typeof logEvent === 'string' ? logEvent : logEvent.serialise()
      // });
    };
  }
};

function emitLogEventToParent(logEvent: LoggingEvent | string, _fromChildProcess = false) {
  try {
    // if (typeof logEvent !== 'string')
    //   console.log(`[debug log] ${fromChildProcess ? '<passthrough>' : ''} emit to parent from`, process.pid, logEvent.pid, logEvent.data);
    process.send!({
      topic: 'log4js:message',
      data: typeof logEvent === 'string' ? logEvent : logEvent.serialise()
    });
  } catch (e: any) {
    console.error(`emit log error, PID: ${process.pid}`, e);
  }
}

/**
 * Emit log event to log4js appenders
 */
export function emitChildProcessLogMsg(msg: {topic?: string, data: string}, toParent = false) {
  if (msg && msg.topic === 'log4js:message') {
    const logEvent = msg.data;
    if (toParent) {
      emitLogEventToParent(msg.data, true);
    } else {
      sendLoggingEvent(deserialise(logEvent));
    }
    return true;
  }
  return false;
}

export function emitThreadLogMsg(msg: {topic?: string, data: string}) {
  if (msg && msg.topic === 'log4js:message') {
    const logEvent = msg.data;
    sendLoggingEvent(deserialise(logEvent));
    return true;
  }
  return false;
}

