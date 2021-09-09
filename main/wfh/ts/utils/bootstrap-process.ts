import '../node-path';
import log4js from 'log4js';
import config from '../config';
// import logConfig from '../log-config';
import {GlobalOptions} from '../cmd/types';
import * as store from '../store';
import * as op from 'rxjs/operators';

const log = log4js.getLogger('plink.bootstrap-process');

process.on('uncaughtException', function(err) {
  log.error('Uncaught exception: ', err);
  throw err; // let PM2 handle exception
});

process.on('unhandledRejection', err => {
  log.error('unhandledRejection', err);
});
/**
 * Must invoke initProcess() or initAsChildProcess() before this function.
 * If this function is called from a child process or thread worker of Plink,
 * you may pass `JSON.parse(process.env.PLINK_CLI_OPTS!)` as parameter since
 * Plink's main process save `GlobalOptions` in environment variable "PLINK_CLI_OPTS",
 * so that child process gets same GlobalOptions as the main process does.
 * @param options 
 */
export function initConfig(options: GlobalOptions) {
  config.initSync(options);
  // logConfig(config());
  return config;
}

/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 * 
 * DO NOT fork a child process on this function
 * @param onShutdownSignal 
 */
export function initProcess(saveState = true, onShutdownSignal?: () => void | Promise<any>) {
  process.on('SIGINT', function() {
    // eslint-disable-next-line no-console
    log.info('pid ' + process.pid + ': bye');
    void onShut();
  });
  // Be aware this is why "initProcess" can not be "fork"ed in a child process, it will keep alive for parent process's 'message' event
  process.on('message', function(msg) {
    if (msg === 'shutdown') {
      // eslint-disable-next-line no-console
      log.info('Recieve shutdown message from PM2, bye.');
      void onShut();
    }
  });

  const {dispatcher, storeSavedAction$, stateFactory, startLogging} = require('../store') as typeof store;

  startLogging();
  stateFactory.configureStore();

  if (!saveState) {
    dispatcher.changeActionOnExit('none');
  }

  async function onShut() {
    if (onShutdownSignal) {
      await Promise.resolve(onShutdownSignal);
    }
    const saved = storeSavedAction$.pipe(op.take(1)).toPromise();
    dispatcher.processExit();
    await saved;
    setImmediate(() => process.exit(0));
  }
  return dispatcher;
}

/**
 * Initialize redux-store for Plink.
 * 
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread.
 * 
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 * @param syncState send changed state back to main process
 */
export function initAsChildProcess(saveState = false, onShutdownSignal?: () => void | Promise<any>) {
  const {stateFactory, startLogging, dispatcher} = require('../store') as typeof store;
  process.on('SIGINT', function() {
    // eslint-disable-next-line no-console
    if (onShutdownSignal) {
      void Promise.resolve(onShutdownSignal)
      .then(() => dispatcher.processExit())
      .finally(() => {
        log.info('bye');
        setImmediate(() => process.exit(0));
      });
    } else {
      log.info('bye');
      process.exit(0);
    }
  });

  startLogging();
  stateFactory.configureStore();
  if (saveState)
    dispatcher.changeActionOnExit('save');
}
