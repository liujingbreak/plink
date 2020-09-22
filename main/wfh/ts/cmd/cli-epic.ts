import * as pkgMgr from '../package-mgr';
import {stateFactory} from '../store';
import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
import {map, distinctUntilChanged, catchError, ignoreElements, mergeMap, debounceTime,
  skip, filter} from 'rxjs/operators';
import { PayloadAction } from '@reduxjs/toolkit';
import {of, merge} from 'rxjs';
import {ofPayloadAction } from '../../../redux-toolkit-observable';
import {allPackages} from '../package-utils';

const getLocale: () => Promise<string> = require('os-locale');
const drcpPkJson = require('../../../package.json');


stateFactory.addEpic((action$, state$) => {
  getLocale().then(locale => {
    cliActionDispatcher.updateLocale(locale);
    pkgMgr.actionDispatcher.setInChina(locale.split(/[-_]/)[1].toUpperCase() === 'CN');
  });

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
