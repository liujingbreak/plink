import '../node-path';
import log4js from 'log4js';
import config from '../config';
import logConfig from '../log-config';
import {GlobalOptions} from '../cmd/types';
import * as store from '../store';

process.on('uncaughtException', function(err) {
  log.error('Uncaught exception', err, err.stack);
  console.error('Uncaught exception: ', err);
  throw err; // let PM2 handle exception
});

process.on('unhandledRejection', err => {
  log.warn('unhandledRejection', err);
  console.error('unhandledRejection', err);
});

const log = log4js.getLogger('bootstrap');

export async function initConfigAsync(options: GlobalOptions, onShutdownSignal?: () => void | Promise<any>) {
  process.on('SIGINT', function() {
    // tslint:disable-next-line: no-console
    console.log('Recieve SIGINT, bye.');
    onShut();
  });
  process.on('message', function(msg) {
    if (msg === 'shutdown') {
      // tslint:disable-next-line: no-console
      console.log('Recieve shutdown message from PM2, bye.');
      onShut();
    }
  });

  async function onShut() {
    if (onShutdownSignal) {
      await Promise.resolve(onShutdownSignal);
      await saveState();
      process.exit(0);
    } else {
      await saveState();
      process.exit(0);
    }
  }

  const {stateFactory, saveState}: typeof store = require('../store');
  stateFactory.configureStore();


  await config.init(options);
  logConfig(config());
}
export {withGlobalOptions} from '../cmd/cli';
export {GlobalOptions};
