import { PayloadAction } from '@reduxjs/toolkit';
import { from, merge, of } from 'rxjs';
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
import * as op from 'rxjs/operators';
import * as pkgMgr from '../package-mgr';
import { stateFactory } from '../store';
import {OurCommandMetadata} from './types';
export interface CliState {
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
  commandByPackage: new Map(),
  commandInfoByName: new Map(),
  version: ''
  // loadedExtensionCmds: new Map()
};

export const cliSlice = stateFactory.newSlice({
  name: 'cli',
  initialState,
  reducers: {
    plinkUpgraded(d, {payload: newVersion}: PayloadAction<string>) {
      d.version = newVersion;
    },
    updateLocale(d, {payload: [lang, country]}: PayloadAction<[string, string]>) {
      d.osLang = lang;
      d.osCountry = country;
    },
    addCommandMeta(d, {payload: {pkg, metas}}: PayloadAction<{pkg: string; metas: OurCommandMetadata[]}>) {
      const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.nameAndArgs)![1]);
      // const existingMetas = d.commandByPackage.get(pkg);
      d.commandByPackage.set(pkg, names);
      // if (existingMetas) {
      //   existingMetas.push(...names);
      // } else {
      //   d.commandByPackage.set(pkg, names);
      // }
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
    from(getLocale()).pipe(
      op.map(locale => {
        const [lang, country] = locale.split(/[_-]/);
        if (getState().osLang !== lang || getState().osCountry !== country) {
          cliActionDispatcher.updateLocale([lang, country]);
          pkgMgr.actionDispatcher.setInChina(country ? country.toUpperCase() === 'CN' : false);
        }
      })
    ),
    action$.pipe(op.filter(action => action.type === 'BEFORE_SAVE_STATE'),
      op.tap(() => cliActionDispatcher._change(s => {
        s.commandByPackage.clear();
        s.commandInfoByName.clear();
      }))
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

export function availabeCliExtension() {
}

