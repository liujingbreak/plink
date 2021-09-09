import { PayloadAction } from '@reduxjs/toolkit';
import {createReducers} from '../../../packages/redux-toolkit-observable/dist/helper';
import { from, merge, of } from 'rxjs';
// import {cliActionDispatcher, getStore, cliSlice, CliExtension} from './cli-slice';
import * as op from 'rxjs/operators';
import * as pkgMgr from '../package-mgr';
import { stateFactory, processExitAction$ } from '../store';
import {OurCommandMetadata} from './types';
export interface CliState {
  /** key is package name, value is Command name and args */
  commandByPackage: Map<string, OurCommandMetadata['name'][]>;
  commandInfoByName: Map<OurCommandMetadata['name'], OurCommandMetadata>;
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

const simpleReduces = {
  plinkUpgraded(d: CliState, newVersion: string) {
    d.version = newVersion;
  },
  updateLocale(d: CliState, [lang, country]: [string, string]) {
    d.osLang = lang;
    d.osCountry = country;
  },
  addCommandMeta(d: CliState, {pkg, metas}: {pkg: string; metas: OurCommandMetadata[]}) {
    const names = metas.map(meta => /^\s*?(\S+)/.exec(meta.name)![1]);
    d.commandByPackage.set(pkg, names);
    for (let i = 0, l = names.length; i < l; i++) {
      d.commandInfoByName.set(names[i], metas[i]);
    }
  }
};

export const cliSlice = stateFactory.newSlice({
  name: 'cli',
  initialState,
  reducers: createReducers<CliState, typeof simpleReduces>(simpleReduces)
});

export const cliActionDispatcher = stateFactory.bindActionCreators(cliSlice);



export function getState() {
  return stateFactory.sliceState(cliSlice);
}

export function getStore() {
  return stateFactory.sliceStore(cliSlice);
}

const getLocale: () => Promise<string> = require('os-locale');
const drcpPkJson = require('../../../package.json') as {version: string};


stateFactory.addEpic((action$, state$) => {
  // const actionStreams = castByActionType(cliSlice.actions, action$);
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
    processExitAction$.pipe(
      op.tap(() => cliActionDispatcher._change(s => {
        s.commandByPackage.clear();
        s.commandInfoByName.clear();
      }))
    )
  ).pipe(
    op.catchError(ex => {
      // eslint-disable-next-line no-console
      console.error(ex);
      return of<PayloadAction>();
    }),
    op.ignoreElements()
  );
});

export function availabeCliExtension() {
}

