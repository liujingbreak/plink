import Path from 'path';
import fs from 'fs';
import {tap} from 'rxjs/operators';
import {StateFactory, ofPayloadAction} from '../../redux-toolkit-abservable/dist/redux-toolkit-observable';
import log4js from 'log4js';
import {getRootDir} from './utils';
import serialize from 'serialize-javascript';

export {ofPayloadAction};
// import './package-mgr'; 
// ensure slice and epic being initialized before create store, in which case not more lazy load

const stateFile = Path.resolve(getRootDir(), 'dist/dr-state.json');

/**
 * Since Redux-toolkit does not read initial state with any lazy slice that has not defined in root reducer,
 * e.g. 
 * "Unexpected keys "clean", "packages" found in preloadedState argument passed to createStore.
 * Expected to find one of the known reducer keys instead: "main". Unexpected keys will be ignored.""
 * 
 * I have to export saved state, so that eacy lazy slice can initialize its own slice state by themself
 */
export const lastSavedState = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8') || '{}') : {};

export const stateFactory = new StateFactory(lastSavedState);

export async function startLogging() {
  const defaultLog = log4js.getLogger('dr-comp-package.store');
  const logState = log4js.getLogger('dr-comp-package.store.state');
  const logAction = log4js.getLogger('dr-comp-package.store.action');

  stateFactory.log$.pipe(
    tap(params => {
      if (params[0] === 'state')
        (logState.debug as any)(...params.slice(1));
      else if (params[0] === 'action')
        (logAction.info as any)(...params.slice(1));
        // console.log(...params.slice(1));
      else
        (defaultLog.debug as any)(...params);
    })
  ).subscribe();
}

export async function saveState() {
  const store = await stateFactory.rootStoreReady;
  const mergedState = Object.assign(lastSavedState, store.getState());
  // const jsonStr = JSON.stringify(mergedState, null, '  ');
  const jsonStr = serialize(mergedState, {ignoreFunction: true});
  fs.writeFile(stateFile, jsonStr,
    () => {
      // tslint:disable-next-line: no-console
      console.log(`[package-mgr] state file ${Path.relative(process.cwd(), stateFile)} saved`);
    });
}
