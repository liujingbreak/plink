import Path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import {tap, filter} from 'rxjs/operators';
import {StateFactory, ofPayloadAction} from '../../redux-toolkit-observable/dist/redux-toolkit-observable';
import log4js from 'log4js';
import serialize from 'serialize-javascript';
import {enableMapSet} from 'immer';
import {isMainThread} from 'worker_threads';
import {PlinkEnv} from './node-path';
import chalk from 'chalk';
// import chalk from 'chalk';

export {ofPayloadAction};

enableMapSet();

const stateFile = Path.resolve((JSON.parse(process.env.__plink!) as PlinkEnv).distDir, 'plink-state.json');
let actionCount = 0;
/**
 * Since Redux-toolkit does not read initial state with any lazy slice that has not defined in root reducer,
 * e.g. 
 * "Unexpected keys "clean", "packages" found in preloadedState argument passed to createStore.
 * Expected to find one of the known reducer keys instead: "main". Unexpected keys will be ignored.""
 * 
 * I have to export saved state, so that eacy lazy slice can initialize its own slice state by themself
 */
const savedStore = fs.existsSync(stateFile) ? fs.readFileSync(stateFile, 'utf8') : null;
if (savedStore && savedStore.length === 0) {
  throw new Error('Emptry store file ' + stateFile + ', delete it and initial new workspaces');
}
// tslint:disable-next-line: no-eval
export const lastSavedState = savedStore ? eval('(' + savedStore + ')') : {};

export const stateFactory = new StateFactory(lastSavedState);

stateFactory.actionsToDispatch.pipe(
  filter(action => !action.type.endsWith('/_init')),
  tap(() => actionCount++)
).subscribe();


export async function startLogging() {
  const defaultLog = log4js.getLogger('plink.store');
  // const logState = log4js.getLogger('plink.store.state');
  const logAction = log4js.getLogger('plink.store.action');

  stateFactory.log$.pipe(
    tap(params => {
      if (params[0] === 'state') {
        // (logState.debug as any)(...params.slice(1));
      } else if (params[0] === 'action') {
        (logAction.debug as any)(...params.slice(1));
      } else
        (defaultLog.debug as any)(...params);
    })
  ).subscribe();
}

let saved = false;
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls, 
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
process.on('beforeExit', async (code) => {
  if (saved)
    return;
  saveState();
  // // tslint:disable-next-line: no-console
  // console.log(chalk.green(`Done in ${new Date().getTime() - process.uptime()} s`));
});

/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
export async function saveState() {
  const log = log4js.getLogger('plink.store');
  saved = true;
  if (actionCount === 0) {
    // tslint:disable-next-line: no-console
    log.info(chalk.gray('state is not changed'));
    return;
  }
  if (!isMainThread) {
    // tslint:disable-next-line: no-console
    log.info(chalk.gray('not in main thread, skip saving state'));
    return;
  }
  if (process.send) {
    // tslint:disable-next-line: no-console
    log.info(chalk.gray('in a forked process, skip saving state'));
    return;
  }
  const store = await stateFactory.rootStoreReady;
  const mergedState = Object.assign(lastSavedState, store.getState());

  const jsonStr = serialize(mergedState, {space: '  '});
  fse.mkdirpSync(Path.dirname(stateFile!));
  try {
    await fs.promises.writeFile(stateFile!, jsonStr);
    // tslint:disable-next-line: no-console
    log.info(chalk.gray(
      `state file ${Path.relative(process.cwd(), stateFile!)} saved (${actionCount} actions)`));
  } catch (err) {
    // tslint:disable-next-line: no-console
    log.error(chalk.gray(`Failed to write state file ${Path.relative(process.cwd(), stateFile!)}`), err);
  }
}
