import { PayloadAction } from '@reduxjs/toolkit';
import {ofPayloadAction } from '../../../redux-toolkit-abservable';
import {stateFactory} from '../store';
import {map, distinctUntilChanged, catchError, ignoreElements, mergeMap, debounceTime,
  skip, filter} from 'rxjs/operators';
import {of, merge} from 'rxjs';
import * as pkgMgr from '../package-mgr';
import {allPackages} from '../package-utils';
const drcpPkJson = require('../../../package.json');

export interface CliState {
  /** key is package name */
  extensions: Map<string, CliExtension>;
  version: string;
}

interface CliExtension {
  pkName: string;
  pkgFilePath: string;
  funcName?: string;
}

const initialState: CliState = {
  extensions: new Map(),
  version: ''
};

export const cliSlice = stateFactory.newSlice({
  name: 'cli',
  initialState,
  reducers: {
    updateExtensions(draft, {payload}: PayloadAction<CliExtension[]>) {
      draft.extensions = new Map(payload.map(ex => [ex.pkName, ex]));
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
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
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
    action$.pipe(ofPayloadAction(cliSlice.actions.plinkUpgraded),
      map(() => {
        scanPackageJson(allPackages());
      })
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
  const extensions: CliExtension[] = [];
  for (const pk of pkgs) {
    const dr = pk.json.dr;
    if (dr && dr.cli) {
      const parts = (dr.cli as string).split('#');
      extensions.push({pkName: pk.name, pkgFilePath: parts[0], funcName: parts[1]});
    }
  }
  cliActionDispatcher.updateExtensions(extensions);
}

export function availabeCliExtension() {
}

