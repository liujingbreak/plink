import '../node-path';
import log4js from 'log4js';
import config from '../config';
// import logConfig from '../log-config';
import {GlobalOptions} from '../cmd/types';
import * as store from '../store';
const log = log4js.getLogger('plink.bootstrap-process');
process.on('uncaughtException', function(err) {
  // log.error('Uncaught exception', err, err.stack);
  log.error('Uncaught exception: ', err);
  throw err; // let PM2 handle exception
});

process.on('unhandledRejection', err => {
  // log.warn('unhandledRejection', err);
  log.error('unhandledRejection', err);
});

// const log = log4js.getLogger('bootstrap-process');

// export async function initConfigAsync(options: GlobalOptions) {
//   // initProcess(onShutdownSignal);
//   await config.init(options);
//   // logConfig(config());
//   return config;
// }

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
 * @param onShutdownSignal 
 */
export function initProcess(onShutdownSignal?: () => void | Promise<any>) {
  process.on('SIGINT', function() {
    // eslint-disable-next-line no-console
    log.info('pid ' + process.pid + ': bye');
    void onShut();
  });
  process.on('message', function(msg) {
    if (msg === 'shutdown') {
      // eslint-disable-next-line no-console
      log.info('Recieve shutdown message from PM2, bye.');
      void onShut();
    }
  });

  const {saveState, stateFactory, startLogging} = require('../store') as typeof store;
  startLogging();
  stateFactory.configureStore({
    devTools: false
  });

  async function onShut() {
    if (onShutdownSignal) {
      await Promise.resolve(onShutdownSignal);
    }
    await saveState();
    setImmediate(() => process.exit(0));
  }
}

/**
 * Initialize redux-store for Plink.
 * 
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread.
 * 
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 */
export function initAsChildProcess() {
  const {stateFactory, startLogging} = require('../store') as typeof store;
  startLogging();
  stateFactory.configureStore();
}



