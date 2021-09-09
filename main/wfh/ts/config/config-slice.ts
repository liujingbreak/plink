import {PlinkEnv} from '../node-path';
import Path from 'path';
import {stateFactory, processExitAction$} from '../store';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import { GlobalOptions } from '../cmd/types';
import {PayloadAction} from '@reduxjs/toolkit';
import log4js from 'log4js';
import {isMainThread, threadId} from 'worker_threads';
import {getLanIPv4} from '../utils/network-util';
import {PackagesConfig} from 'package-settings';

const {distDir, rootDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
export type BasePlinkSettings = {
  /** Node.js server port number */
  port: number | string;
  publicPath: string;
  localIP: string;
  /**
   * process.env.NODE_ENV will be automatically
   * updated to 'developement' or 'production corresponding to this property
   * */
  devMode: boolean;
  /** default directory is <rootDir>/dist */
  destDir: string;
  /** default directory is <rootDir>/dist/static */
  staticDir: string;
  /** default directory is <rootDir>/dist/server server side render resource directory */
  serverDir: string;
  /** Repository directory */
  rootPath: string;
  /** Node package scope names, omit leading "@" and tailing "/" character,
   * when we type package names in command line, we can omit scope name part,
   * Plink can guess complete package name based on this property
   */
  packageScopes: string[];
  /** Plink command line options */
  cliOptions?: GlobalOptions;
  logger?: {
    noFileLimit: boolean;
    onlyFileOut: boolean;
  };
  /** command line "--prop <json-path>=<json-value>" arguments */
  [cliProp: string]: unknown;
  /** @deprecated */
  outputPathMap: {[pkgName: string]: string};
  /** default is '/' */
  nodeRoutePath: string;
  /** @deprecated */
  staticAssetsURL: string;
  /** @deprecated */
  packageContextPathMapping: {[path: string]: string};
  browserSideConfigProp: string[];
  /** @deprecated */
  enableSourceMaps: boolean;
};

export type DrcpSettings = BasePlinkSettings & PackagesConfig;

const initialState: BasePlinkSettings = {
  port: 14333,
  localIP: getLanIPv4(),
  publicPath: '/',
  devMode: false,
  destDir: distDir,
  staticDir: Path.resolve(distDir, 'static'),
  serverDir: Path.resolve(distDir, 'server'),
  rootPath: rootDir,
  packageScopes: ['wfh', 'bk', 'bk-core', 'dr', 'dr-core', 'types'],
  nodeRoutePath: '/',
  staticAssetsURL: '',
  packageContextPathMapping: {},
  browserSideConfigProp: [],
  enableSourceMaps: true,
  outputPathMap: {},
  __filename
};

export const configSlice = stateFactory.newSlice({
  name: 'config',
  initialState: initialState as DrcpSettings,
  reducers: {
    saveCliOption(s, {payload}: PayloadAction<GlobalOptions>) {
      s.cliOptions = payload;
      s.devMode = payload.dev === true;
    }
  }
});

export const dispatcher = stateFactory.bindActionCreators(configSlice);

stateFactory.addEpic<{config: BasePlinkSettings}>((action$, state$) => {
  return rx.merge(
    getStore().pipe(
      op.map(s => s.devMode), op.distinctUntilChanged(),
      op.map(devMode => {
        process.env.NODE_ENV = devMode ? 'development' : 'production';
      })
    ),
    getStore().pipe(op.map(s => s.cliOptions?.verbose), op.distinctUntilChanged(),
      op.filter(verbose => !!verbose),
      op.map(() => {
        // initial log configure is in store.ts
        let logPatternPrefix = '';
        if (process.send || !isMainThread)
          logPatternPrefix += `[P${process.pid}.T${threadId}] `;
        log4js.configure({
          appenders: {
            out: {
              type: 'stdout',
              layout: {type: 'pattern', pattern: logPatternPrefix + '%[[%p] %c%] - %m'}
            }
          },
          categories: {
            default: {appenders: ['out'], level: 'debug'},
            plink: {appenders: ['out'], level: 'debug'}
          }
        });
      }),
      op.take(1)
    ),
    processExitAction$.pipe(
      op.tap(() => dispatcher._change(s => {
        s.cliOptions = undefined;
        s.view = undefined;
      }))
    )
  ).pipe(
    op.catchError((ex, src) => {
      // eslint-disable-next-line no-console
      console.error(ex);
      return src;
    }),
    op.ignoreElements()
  );
});

export function getState() {
  return stateFactory.sliceState(configSlice);
}

export function getStore() {
  return stateFactory.sliceStore(configSlice);
}
