import Path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import {tap, filter, takeWhile} from 'rxjs/operators';
import {StateFactory, ofPayloadAction} from '../../redux-toolkit-observable/dist/redux-toolkit-observable';
import log4js from 'log4js';
import serialize from 'serialize-javascript';
import {enableMapSet} from 'immer';
import {isMainThread} from 'worker_threads';
import {PlinkEnv} from './node-path';
import chalk from 'chalk';
export {createReducers} from '../../redux-toolkit-observable/dist/helper';
// import chalk from 'chalk';

export {ofPayloadAction};

enableMapSet();

configDefaultLog();

function configDefaultLog() {
  let logPatternPrefix = '';
  if (process.send)
    logPatternPrefix = 'pid:%z ';
  else if (!isMainThread)
    logPatternPrefix = '[thread]';
  log4js.configure({
    appenders: {
      out: {
        type: 'stdout',
        layout: {type: 'pattern', pattern: logPatternPrefix + '%[%c%] - %m'}
      }
    },
    categories: {
      default: {appenders: ['out'], level: 'info'}
    }
  });
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


export const BEFORE_SAVE_STATE = 'BEFORE_SAVE_STATE';
const IGNORE_SLICE = ['config', 'configView', 'cli'];
const IGNORE_ACTION = new Set(['packages/setInChina', 'packages/updatePlinkPackageInfo']);
const ignoreSliceSet = new Set(IGNORE_SLICE);

const stateFile = Path.resolve((JSON.parse(process.env.__plink!) as PlinkEnv).distDir, 'plink-state.json');
let stateChangeCount = 0;
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
// eslint-disable-next-line no-eval
export const lastSavedState = savedStore ? eval('(' + savedStore + ')') : {};
for (const ignoreSliceName of IGNORE_SLICE) {
  delete lastSavedState[ignoreSliceName];
}

export const stateFactory = new StateFactory(lastSavedState);
const defaultLog = log4js.getLogger('plink.store');

stateFactory.actionsToDispatch.pipe(
  filter(action => !action.type.endsWith('/_init') &&
    !IGNORE_ACTION.has(action.type) &&
    !ignoreSliceSet.has(action.type.slice(0, action.type.indexOf('/')))
  ),
  takeWhile(action => action.type !== BEFORE_SAVE_STATE),
  tap((action) => {
    stateChangeCount++;
  })
).subscribe();

export function startLogging() {

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
process.on('beforeExit', (code) => {
  if (saved)
    return;
  stateFactory.dispatch({type: 'BEFORE_SAVE_STATE', payload: null});
  process.nextTick(() => saveState());
  // eslint-disable-next-line , no-console
  // console.log(chalk.green(`Done in ${new Date().getTime() - process.uptime()} s`));
});

/**
 * Call this function before you explicitly run process.exit(0) to quit, because "beforeExit"
 * won't be triggered prior to process.exit(0)
 */
export async function saveState() {
  const log = log4js.getLogger('plink.store');
  saved = true;
  if (stateChangeCount === 0) {
    // eslint-disable-next-line no-console
    log.info(chalk.gray('state is not changed'));
    return;
  }
  if (!isMainThread) {
    // eslint-disable-next-line no-console
    log.info(chalk.gray('not in main thread, skip saving state'));
    return;
  }
  if (process.send) {
    // eslint-disable-next-line no-console
    log.info(chalk.gray('in a forked process, skip saving state'));
    return;
  }
  const store = await stateFactory.rootStoreReady;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mergedState = Object.assign(lastSavedState, store.getState());

  const jsonStr = serialize(mergedState, {space: '  '});
  fse.mkdirpSync(Path.dirname(stateFile));
  try {
    await fs.promises.writeFile(stateFile, jsonStr);
    // eslint-disable-next-line no-console
    log.info(chalk.gray(
      `state file ${Path.relative(process.cwd(), stateFile)} saved (${stateChangeCount})`));
  } catch (err) {
    // eslint-disable-next-line no-console
    log.error(chalk.gray(`Failed to write state file ${Path.relative(process.cwd(), stateFile)}`), err);
  }
}

// TEST async action for Thunk middleware
// stateFactory.store$.subscribe(store => {
//   if (store) {
//     debugger;
//     store.dispatch((async (dispatch: any) => {
//       await new Promise(resolve => setTimeout(resolve, 500));
//       dispatch({type: 'ok'});
//     }) as any);
//   }
// });
