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

export async function initConfigAsync(options: GlobalOptions) {
  // initProcess(onShutdownSignal);
  await config.init(options);
  // logConfig(config());
  return config;
}

export function initConfig(options: GlobalOptions) {
  // initProcess(onShutdownSignal);
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
    // tslint:disable-next-line: no-console
    log.info('pid ' + process.pid + ': bye');
    onShut();
  });
  process.on('message', function(msg) {
    if (msg === 'shutdown') {
      // tslint:disable-next-line: no-console
      log.info('Recieve shutdown message from PM2, bye.');
      onShut();
    }
  });

  const {saveState, stateFactory, startLogging}: typeof store = require('../store');
  startLogging();
  stateFactory.configureStore();
  // process.nextTick(() => stateFactory.configureStore());

  async function onShut() {
    if (onShutdownSignal) {
      await Promise.resolve(onShutdownSignal);
    }
    await saveState();
    process.nextTick(() => process.exit(0));
  }
}



