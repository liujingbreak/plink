import '../node-path';
import log4js from 'log4js';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import config from '../config';
// import logConfig from '../log-config';
import {GlobalOptions} from '../cmd/types';
import * as store from '../store';

const log = log4js.getLogger('plink.bootstrap-process');

/** When process is on 'SIGINT' and "beforeExit", all functions will be executed */
export const exitHooks = [] as Array<() => (rx.ObservableInput<unknown> | void)>;

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
 * @param onShutdownSignal 
 */
export function initProcess(saveState: store.StoreSetting['actionOnExit'] = 'none', onShutdownSignal?: (code: number) => void | Promise<any>, handleShutdownMsg = false) {
  // TODO: Not working when press ctrl + c, and no async operation can be finished on "SIGINT" event
  process.once('beforeExit', function(code) {
    log.info('pid ' + process.pid + ': bye');
    void onShut(code, false);
  });
  process.once('SIGINT', () => {
    log.info('pid' + process.pid + ' recieves SIGINT');
    void onShut(0, true);
  });

  if (handleShutdownMsg) {
    // Be aware this is why "initProcess" can not be "fork"ed in a child process, it will keep alive for parent process's 'message' event
    process.on('message', function(msg) {
      if (msg === 'shutdown') {
        // eslint-disable-next-line no-console
        log.info('Recieve shutdown message from PM2, bye.');
        void onShut(0, true);
      }
    });
  }

  const {dispatcher, storeSavedAction$, stateFactory, startLogging} = require('../store') as typeof store;

  startLogging();
  stateFactory.configureStore();
  dispatcher.changeActionOnExit(saveState);

  async function onShut(code: number, explicitlyExit: boolean) {
    let exitCode = 0;
    await rx.merge(
      ...exitHooks.map(hookFn => rx.defer(() => hookFn()).pipe(
        op.catchError(err => {
          log.error('Failed to execute shutdown hooks', err);
          exitCode = 1;
          return rx.EMPTY;
        })
      ))
    ).toPromise();
    if (onShutdownSignal) {
      await Promise.resolve(onShutdownSignal(code))
        .catch(err => console.error(err));
    }
    const saved = storeSavedAction$.pipe(op.take(1)).toPromise();
    dispatcher.processExit();
    await saved;
    if (explicitlyExit) {
      setImmediate(() => process.exit(exitCode));
    }
  }
  return dispatcher;
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
export function initAsChildProcess(saveState: store.StoreSetting['actionOnExit'] = 'none', onShutdownSignal?: () => void | Promise<any>) {
  return initProcess(saveState, onShutdownSignal, false);
}
