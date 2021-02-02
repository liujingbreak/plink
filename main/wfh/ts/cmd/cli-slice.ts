import { PayloadAction } from '@reduxjs/toolkit';
import { from, merge, of } from 'rxjs';
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
import * as op from 'rxjs/operators';
import * as pkgMgr from '../package-mgr';
import { stateFactory } from '../store';
import {OurCommandMetadata} from './types';

export interface CliState {
  /** key is package name */
  extensions: Map<string, CliExtension>;
  /** key is package name, value is Command name and args */
  commandByPackage: Map<string, OurCommandMetadata['nameAndArgs'][]>;
  commandInfoByName: Map<OurCommandMetadata['nameAndArgs'], OurCommandMetadata>;
  version: string;
  osLang?: string;
  osCountry?: string;
  /** key: command name, value: file path */
  // loadedExtensionCmds: Map<string, string>;
}

export interface CliExtension {
  pkName: string;
  pkgFilePath: string;
  funcName?: string;
}

const initialState: CliState = {
  extensions: new Map(),
  commandByPackage: new Map(),
  commandInfoByName: new Map(),
  version: ''
  // loadedExtensionCmds: new Map()
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
    },
    updateLocale(d, {payload: [lang, country]}: PayloadAction<[string, string]>) {
      d.osLang = lang;
      d.osCountry = country;
    },
    addCommandMeta(d, {payload: {pkg, metas}}: PayloadAction<{pkg: string; metas: OurCommandMetadata[]}>) {
      const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.nameAndArgs)![1]);
      const existingMetas = d.commandByPackage.get(pkg);
      if (existingMetas) {
        existingMetas.push(...names);
      } else {
        d.commandByPackage.set(pkg, names);
      }
      for (let i = 0, l = names.length; i < l; i++) {
        d.commandInfoByName.set(names[i], metas[i]);
      }
    }
  }
});

export const cliActionDispatcher = stateFactory.bindActionCreators(cliSlice);



export function getState() {
  return stateFactory.sliceState(cliSlice);
}

export function getStore() {
  return stateFactory.sliceStore(cliSlice);
}

const getLocale: () => Promise<string> = require('os-locale');
const drcpPkJson = require('../../../package.json');


stateFactory.addEpic((action$, state$) => {

  return merge(
    getStore().pipe(op.map(s => s.version), op.distinctUntilChanged(),
      op.map(version => {
        // console.log('quick!!!!!!!!!!', getState());
        if (version !== drcpPkJson.version) {
          cliActionDispatcher.plinkUpgraded(drcpPkJson.version);
        }
      })
    ),
    // pkgMgr.getStore().pipe(
    //   map(s => s.srcPackages),
    //   distinctUntilChanged(),
    //   skip(1),
    //   debounceTime(200),
    //   map(srcPackages => {
    //     scanPackageJson(srcPackages.values());
    //   })
    // ),
    // action$.pipe(ofPayloadAction(pkgMgr.slice.actions._installWorkspace),
    //   map(action => action.payload.workspaceKey),
    //   mergeMap(ws => pkgMgr.getStore().pipe(
    //     map(s => s.workspaces.get(ws)!.installedComponents),
    //     distinctUntilChanged(),
    //     filter(installed => installed != null && installed.size > 0),
    //     map(installed => {
    //       scanPackageJson(installed!.values());
    //     })
    //   ))
    // ),
    // action$.pipe(ofPayloadAction(cliSlice.actions.plinkUpgraded),
    //   map(() => {
    //     scanPackageJson(allPackages());
    //   })
    // ),
    // ...Array.from(pkgMgr.getState().workspaces.keys()).map(key => {
    //   return pkgMgr.getStore().pipe(
    //     map(s => s.workspaces.get(key)!.installedComponents),
    //     distinctUntilChanged(),
    //     skip(1),
    //     filter(installed => installed != null && installed.size > 0),
    //     map(installed => {
    //       scanPackageJson(installed!.values());
    //     })
    //   );
    // }),
    from(getLocale()).pipe(
      op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
          cliActionDispatcher.updateLocale([lang, country]);
          pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
      })
    )
  ).pipe(
    op.catchError(ex => {
      // tslint:disable-next-line: no-console
      console.error(ex);
      return of<PayloadAction>();
    }),
    op.ignoreElements()
  );
});

// function scanPackageJson(pkgs: Iterable<pkgMgr.PackageInfo>) {
//   const extensions: CliExtension[] = [];
//   for (const pk of pkgs) {
//     const dr = pk.json.dr;
//     if (dr && dr.cli) {
//       const parts = (dr.cli as string).split('#');
//       extensions.push({pkName: pk.name, pkgFilePath: parts[0], funcName: parts[1]});
//     }
//   }
//   cliActionDispatcher.updateExtensions(extensions);
// }


export function availabeCliExtension() {
}

