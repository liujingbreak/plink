/* eslint-disable  no-console */
import * as Path from 'path';
import chalk from 'chalk';
import _ from 'lodash';
import {getLogger} from 'log4js';
import {BehaviorSubject, Observable} from 'rxjs';
import {Draft} from '@reduxjs/toolkit';
import {GlobalOptions as CliOptions} from './cmd/types';
import {getRootDir, getWorkDir} from './utils/misc';
import {PlinkSettings} from './config/config-slice';

// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const {cyan} = chalk;
const log = getLogger('plink.config-handler');

export {PlinkSettings};
export interface DrcpConfig {
  /**
   * Used to run command line option "-c" specified TS/JS files one by one 
   */
  configHandlerMgr: BehaviorSubject<ConfigHandlerMgr | undefined>;
  /** lodash like get function, return specific setting property value
   * @return 
   */
  get<K extends keyof PlinkSettings>(path: K, defaultValue?: PlinkSettings[K]): PlinkSettings[K];
  get(path: string | string[], defaultValue?: any): any;
  set<K extends keyof PlinkSettings>(path: K, value: PlinkSettings[K] | any): void;
  set(path: string | string[], value: any): void;
  change(reducer: (setting: Draft<PlinkSettings>) => void): void;
  /**
   * Resolve a path based on `rootPath`
   * @name resolve
   * @memberof config
   * @param {string} dir name or property path, like "name", "name.childProp[1]"
   * @return {string} absolute path
   */
  resolve(dir: 'rootPath' | 'destDir' | 'staticDir' | 'serverDir', ...path: string[]): string;
  resolve(...path: string[]): string;
  /** @return all settings in a big JSON object */
  (): PlinkSettings;
  reload(): PlinkSettings;
  // init(argv: CliOptions): Promise<PlinkSettings>;
  initSync(argv: CliOptions): PlinkSettings;
  getStore(): Observable<PlinkSettings>;
  /**
   * ConfigHandlerMgr changes everytime Plink settings are initialized or reloaded.
   * ConfigHandlerMgr is used to run command line option "-c" specified TS/JS files one by one.
   * 
   */
  configHandlerMgrChanged(cb: (handler: ConfigHandlerMgr) => void): void;
  // configHandlerMgrCreated(cb: (handler: ConfigHandlerMgr) => Promise<any> | void): Promise<void>;
}

export interface ConfigHandler {
  /**
   * @param configSetting Override properties from dist/config.yaml, which is also you get from `api.config()`
   * @param cliOpt (deprecated) Override command line argumemnt for DRCP
   */
  onConfig(configSetting: PlinkSettings, cliOpt: CliOptions): void;
}

export class ConfigHandlerMgr {
  private static _tsNodeRegistered = false;

  private static initConfigHandlers(fileAndExports: Iterable<[file: string, exportName: string]>, rootPath: string):
  Array<{file: string; handler: ConfigHandler}> {
    const exporteds: Array<{file: string; handler: ConfigHandler}> = [];

    if (!ConfigHandlerMgr._tsNodeRegistered) {
      ConfigHandlerMgr._tsNodeRegistered = true;
      require('./utils/ts-node-setup');
    }
    for (const [file, exportName] of fileAndExports) {
      const absFile = Path.isAbsolute(file) ? file : Path.resolve(file);
      const exp = require(absFile) as {[exportName: string]: any};
      exporteds.push({file, handler: exp[exportName] ? exp[exportName] : exp});
    }
    return exporteds;
  }
  protected configHandlers: Array<{file: string; handler: ConfigHandler}>;

  /**
   * 
   * @param files Array of string which is in form of "<file>[#<export name>]"
   */
  constructor(fileAndExports0: Iterable<string> | Iterable<[file: string, exportName: string]>) {
    const first = fileAndExports0[Symbol.iterator]().next();
    let fileAndExports: Iterable<[file: string, exportName: string]>;
    if (!first.done && typeof first.value === 'string') {
      fileAndExports = Array.from(fileAndExports0 as Iterable<string>).map(file => [file, 'default']);
    } else {
      fileAndExports = fileAndExports0 as Iterable<[file: string, exportName: string]>;
    }
    this.configHandlers = ConfigHandlerMgr.initConfigHandlers(fileAndExports, getRootDir());
  }

  /**
	 * 
	 * @param func parameters: (filePath, last returned result, handler function),
	 * returns the changed result, keep the last result, if resturns undefined
	 * @returns last result
	 */
  async runEach<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any, desc?: string) {
    let lastRes: any;
    for (const {file, handler} of this.configHandlers) {
      log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(file));
      const currRes = await func(file, lastRes, handler as any as H);
      if (currRes !== undefined)
        lastRes = currRes;
    }
    return lastRes;
  }

  runEachSync<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any, desc?: string) {
    let lastRes: any;
    const cwd = getWorkDir();
    for (const {file, handler} of this.configHandlers) {
      log.debug(`Read ${desc || 'settings'}:\n  ` + cyan(Path.relative(cwd, file)));
      const currRes = func(file, lastRes, handler as any as H);
      if (currRes !== undefined)
        lastRes = currRes;
    }
    return lastRes;
  }
}


