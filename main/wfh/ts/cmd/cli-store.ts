import { PayloadAction } from '@reduxjs/toolkit';
import {ofPayloadAction } from '../../../redux-toolkit-abservable';
import {stateFactory} from '../store';
import {map, distinctUntilChanged, catchError, ignoreElements, mergeMap, debounceTime,
  skip, filter} from 'rxjs/operators';
import {of, merge} from 'rxjs';
import * as pkgMgr from '../package-mgr';
const drcpPkJson = require('../../../package.json');

export interface CliState {
  extensions: {pkgFilePath: string; funcName?: string}[];
  version: string;
}

const initialState: CliState = {
  extensions: [],
  version: ''
};

export const cliSlice = stateFactory.newSlice({
  name: 'cli',
  initialState,
  reducers: {
    updateExtensions(draft, {payload}: PayloadAction<boolean>) {
      // modify state draft
      // draft.foo = payload;
    },
    plinkUpgraded(d, {payload: newVersion}: PayloadAction<string>) {
      d.version = newVersion;
    }
  }
});

export const cliActionDispatcher = stateFactory.bindActionCreators(cliSlice);

stateFactory.addEpic((action$) => {
  return merge(
    getStore().pipe(map(s => s.version), distinctUntilChanged(),
      map(version => {
        if (version !== drcpPkJson.version) {
          console.log('++++++++++++', version, drcpPkJson.version);
          cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
      })
    ),
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

function scanPackageJson(pkgs: Iterable<pkgMgr.PackageInfo>) {
  console.log('>>>>>>>>>>>>>>>>> scanPackageJson');
}
