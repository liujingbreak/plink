import Path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import {tap, filter} from 'rxjs/operators';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {StateFactory, ofPayloadAction} from '../../packages/redux-toolkit-observable/dist/redux-toolkit-observable';
import log4js from 'log4js';
import serialize from 'serialize-javascript';
import {enableMapSet} from 'immer';
import {isMainThread, threadId} from 'worker_threads';
import {PlinkEnv} from './node-path';
import chalk from 'chalk';

import {createReducers, action$Of} from '../../packages/redux-toolkit-observable/dist/helper';
// import chalk from 'chalk';

export {ofPayloadAction, createReducers, action$Of};
enableMapSet();
configDefaultLog();

const PROCESS_MSG_TYPE = 'rtk-observable:state';
export type ProcessStateSyncMsg = {
  type: typeof PROCESS_MSG_TYPE;
  data: string;
};
export function isStateSyncMsg(msg: unknown): msg is ProcessStateSyncMsg {
  return (msg as ProcessStateSyncMsg).type === PROCESS_MSG_TYPE;
}

function configDefaultLog() {
  let logPatternPrefix = '';
  if (process.send || !isMainThread)
    logPatternPrefix = `[P${process.pid}.T${threadId}] `;
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
const IGNORE_SLICE = ['config', 'configView', 'cli', 'analyze', 'storeSetting'];
const IGNORE_ACTION = new Set(['packages/setInChina', 'packages/updatePlinkPackageInfo']);
const ignoreSliceSet = new Set(IGNORE_SLICE);

const stateFile = Path.resolve((JSON.parse(process.env.__plink!) as PlinkEnv).distDir, 'plink-state.json');
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

type StoreSetting = {
  actionOnExit: 'save' | 'send' | 'none';
  stateChangeCount: number;
};

const initialState: StoreSetting = {
  actionOnExit: process.env.__plink_save_state === '1' ? 'save' : process.send && isMainThread ? 'send' : 'none',
  stateChangeCount: 0
};
process.env.__plink_save_state = '0';

const simpleReducers = {
  changeActionOnExit(s: StoreSetting, mode: StoreSetting['actionOnExit']) {
    s.actionOnExit = mode;
  },
  /**
   * Dispatch this action before you explicitly run process.exit(0) to quit, because "beforeExit"
   * won't be triggered prior to process.exit(0)
   */
  processExit(s: StoreSetting) {},
  storeSaved(s: StoreSetting) {}
};

const storeSettingSlice = stateFactory.newSlice({
  name: 'storeSetting',
  initialState,
  reducers: createReducers<StoreSetting, typeof simpleReducers>(simpleReducers)
});

function getState() {
  return stateFactory.sliceState(storeSettingSlice);
}

export const dispatcher = stateFactory.bindActionCreators(storeSettingSlice);

stateFactory.addEpic<typeof storeSettingSlice>((action$, store$) => rx.merge(
  stateFactory.sliceStore(storeSettingSlice).pipe(
    op.map((s) => s.stateChangeCount), op.distinctUntilChanged(),
    op.filter(count => count === 0),
    op.tap(() => {
      dispatcher.changeActionOnExit('none');
    })
  ),
  action$.pipe(ofPayloadAction(storeSettingSlice.actions.processExit),
    op.take(1),
    op.switchMap(async action => {
      const log = log4js.getLogger('plink.store');
      const {actionOnExit} = getState();

      if (actionOnExit === 'save') {
        const store = await stateFactory.rootStoreReady;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const mergedState = Object.assign(lastSavedState, store.getState());

        const jsonStr = serialize(mergedState, {space: '  '});
        fse.mkdirpSync(Path.dirname(stateFile));
        try {
          await fs.promises.writeFile(stateFile, jsonStr);
          log.info(chalk.gray(
            `state file ${Path.relative(process.cwd(), stateFile)} saved (${getState().stateChangeCount})`));
        } catch (err) {
          log.error(chalk.gray(`Failed to write state file ${Path.relative(process.cwd(), stateFile)}`), err);
        }
      } else if (actionOnExit === 'send' && process.send) {
        const store = await stateFactory.rootStoreReady;
        log.info('send state sync message');

        process.send({
          type: PROCESS_MSG_TYPE,
          data: serialize(store.getState(), {space: ''})
        } as ProcessStateSyncMsg);

        log.info(chalk.gray('in a forked child process, skip saving state'));
      }
    }),
    op.tap(() => dispatcher.storeSaved())
  ),
  stateFactory.actionsToDispatch.pipe(
    filter(action => !action.type.endsWith('/_init') &&
      !IGNORE_ACTION.has(action.type) &&
      !ignoreSliceSet.has(action.type.slice(0, action.type.indexOf('/')))
    ),
    op.takeUntil(action$.pipe(ofPayloadAction(storeSettingSlice.actions.processExit))),
    tap((action) => {
      dispatcher._change(s => s.stateChangeCount = s.stateChangeCount + 1);
    })
  )
).pipe(
  op.ignoreElements()
));

export const processExitAction$ = action$Of(stateFactory, storeSettingSlice.actions.processExit);
export const storeSavedAction$ = action$Of(stateFactory, storeSettingSlice.actions.storeSaved);

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

let signaled = false;
/**
 * a listener registered on the 'beforeExit' event can make asynchronous calls, 
 * and thereby cause the Node.js process to continue.
 * The 'beforeExit' event is not emitted for conditions causing explicit termination,
 * such as calling process.exit() or uncaught exceptions.
 */
process.on('beforeExit', (code) => {
  if (signaled)
    return;
  signaled = true;
  dispatcher.processExit();
});

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
