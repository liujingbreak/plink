import '../node-path';
import cluster from 'node:cluster';
import chrp from 'node:child_process';
import log4js from 'log4js';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import config from '../config';
// import logConfig from '../log-config';
import {GlobalOptions} from '../cmd/types';
import * as store from '../store';
import {childProcessAppender, doNothingAppender,
  emitChildProcessLogMsg} from './log4js-appenders';
// import inspector from 'inspector';


const log = log4js.getLogger('plink.bootstrap-process');
let processInitialized = false;

/** When process is on 'SIGINT' and "beforeExit", all functions will be executed */
export const exitHooks = [] as Array<() => (rx.ObservableInput<unknown> | void | number)>;

process.on('uncaughtException', function(err) {
  if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') {
    log.error('uncaughtException "ECONNRESET"', err);
  } else {
    log.error(`PID: ${process.pid} uncaughtException: `, err);
    throw err; // let PM2 handle exception
  }
});

process.on(`PID: ${process.pid} unhandledRejection`, err => {
  if ((err as NodeJS.ErrnoException).code === 'ECONNRESET') {
    log.error('unhandledRejection "ECONNRESET"', err);
  } else {
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
export function initConfig(options: GlobalOptions = {}) {
  config.initSync(options);
  // logConfig(config());
  return config;
}

/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 * 
 * DO NOT fork a child process on this function
 * @param _onShutdownSignal 
 */
export function initProcess(saveState: store.StoreSetting['actionOnExit'] = 'none') {
  if (processInitialized) {
    console.warn(new Error('Do not initialize process twice'));
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
  process.once('beforeExit', function(code) {
    log.info('pid ' + process.pid + ': bye');
    onShut(code, false);
  });
  process.once('SIGINT', () => {
    log.info('pid' + process.pid + ' recieves SIGINT');
    onShut(0, true);
  });

  configDefaultLog();

  const {dispatcher, storeSavedAction$, stateFactory, startLogging} = require('../store') as typeof store;

  startLogging();
  stateFactory.configureStore();

  dispatcher.changeActionOnExit(saveState);

  function onShut(_code: number, explicitlyExit: boolean) {
    let exitCode = 0;
    rx.concat(
      rx.from(exitHooks).pipe(
        op.mergeMap(hookFn => {
          try {
            const ret = hookFn();
            if (ret == null || typeof ret === 'number') {
              return rx.of(ret);
            } else {
              return rx.from(ret);
            }
          } catch (err) {
            log.error('Failed to execute shutdown hooks', err);
            exitCode = 1;
            return rx.EMPTY;
          }
        }),
        op.catchError(err => {
          log.error('Failed to execute shutdown hooks', err);
          exitCode = 1;
          return rx.EMPTY;
        }),
        op.map((ret) => {
          if (typeof ret === 'number' && ret !== 0) {
            exitCode = ret;
            log.info('Exit hook returns:', exitCode);
          }
        })
      ),
      rx.merge(
        // once "dispatcher.processExit() is executed, storeSavedAction$ will be emtted recusively.
        // Therefore storeSavedAction$ must be subscribed before dispatcher.processExit()
        storeSavedAction$.pipe(op.take(1)),
        // A defer() can make sure dispatcher.processExit() is called later than storeSavedAction$
        // being subscribed
        rx.defer(() => {
          dispatcher.processExit();
          return rx.EMPTY;
        })
      )
    ).pipe(
      op.finalize(() => {
        if (explicitlyExit) {
          // eslint-disable-next-line no-console
          console.log(`[bootstrap-process] Process ${process.pid} Exit with`, exitCode);
          process.exit(exitCode);
        } else if (exitCode !== 0) {
          // eslint-disable-next-line no-console
          console.log(`[bootstrap-process] Process ${process.pid} Exit with`, exitCode);
          process.exit(exitCode);
        }
      })
    ).subscribe();
  }
}

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
export function initAsChildProcess(saveState: store.StoreSetting['actionOnExit'] = 'none') {
  return initProcess(saveState);
}

function interceptFork() {
  const origFork = chrp.fork;
  const handler = (process.env.__plinkLogMainPid === process.pid + '' ||
    process.send == null) ?
    (msg: any) => emitChildProcessLogMsg(msg, false)
    : (msg: any) => emitChildProcessLogMsg(msg, true);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  chrp.fork = function(...args: Parameters<typeof origFork>) {
    const cp = origFork.apply(chrp, args);
    cp.on('message', handler);
    return cp;
  } as any;

  cluster.on('message', handler);
}

function configDefaultLog() {
  if (cluster.isWorker) {
    // https://github.dev/log4js-node/log4js-node/blob/master/lib/clustering.js
    // if `disableClustering` is not `true`, log4js will ignore configuration and
    // always use `process.send()`
    log4js.configure({
      appenders: {
        out: {type: doNothingAppender}
      },
      categories: {
        default: {appenders: ['out'], level: 'info'}
      }
      // disableClustering: true
    });
  } else if (process.env.__plinkLogMainPid === process.pid + '') {
    // eslint-disable-next-line no-console
    log4js.configure({
      appenders: {
        out: {
          type: 'stdout',
          layout: {type: 'pattern', pattern: '[P%z] %[%c%] - %m'}
        }
      },
      categories: {
        default: {appenders: ['out'], level: 'info'}
      }
    });
  } else if (process.send) {
    log4js.configure({
      appenders: {
        out: {type: childProcessAppender}
      },
      categories: {
        default: {appenders: ['out'], level: 'info'}
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
