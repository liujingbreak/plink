import { PayloadAction } from '@reduxjs/toolkit';
import {ofPayloadAction } from '../../../redux-toolkit-abservable';
import {stateFactory} from '../store';
import {map, distinctUntilChanged, catchError, ignoreElements, mergeMap, debounceTime,
  skip, filter} from 'rxjs/operators';
import {of, merge} from 'rxjs';
import * as pkgMgr from '../package-mgr';

export interface CliState {
  extensions: {pkgFilePath: string; funcName?: string}[];
}

const initialState: CliState = {
  extensions: []
};

export const cliSlice = stateFactory.newSlice({
  name: 'cli',
  initialState,
  reducers: {
    updateExtensions(draft, {payload}: PayloadAction<boolean>) {
      // modify state draft
      // draft.foo = payload;
    }
  }
});

export const exampleActionDispatcher = stateFactory.bindActionCreators(cliSlice);

const releaseEpic = stateFactory.addEpic((action$) => {
  // const gService = getModuleInjector().get(GlobalStateStore);

  return merge(
    pkgMgr.getStore().pipe(
      map(s => s.srcPackages),
      distinctUntilChanged(),
      skip(1),
      debounceTime(200),
      map(srcPackages => {
        scanPackageJson(srcPackages.values());
      })
    ),
    action$.pipe(ofPayloadAction(pkgMgr.slice.actions._installWorkspace),
      map(action => action.payload.workspaceKey),
      mergeMap(ws => pkgMgr.getStore().pipe(
        map(s => s.workspaces.get(ws)!.installedComponents),
        distinctUntilChanged(),
        filter(installed => installed != null && installed.size > 0),
        map(installed => {
          scanPackageJson(installed!.values());
        })
      ))
    ),
    ...Array.from(pkgMgr.getState().workspaces.keys()).map(key => {
      return pkgMgr.getStore().pipe(
        map(s => s.workspaces.get(key)!.installedComponents),
        distinctUntilChanged(),
        skip(1),
        filter(installed => installed != null && installed.size > 0),
        map(installed => {
          scanPackageJson(installed!.values());
        })
      );
    })
  ).pipe(
    catchError(ex => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      // gService.toastAction('网络错误\n' + ex.message);
      return of<PayloadAction>();
    }),
    ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState(cliSlice);
}

export function getStore() {
  return stateFactory.sliceStore(cliSlice);
}

if (module.hot) {
  module.hot.dispose(data => {
    stateFactory.removeSlice(cliSlice);
    releaseEpic();
  });
}

function scanPackageJson(pkgs: Iterable<pkgMgr.PackageInfo>) {
  console.log('scanPackageJson');
}
