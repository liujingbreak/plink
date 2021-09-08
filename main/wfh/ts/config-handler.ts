/* eslint-disable  no-console */
import * as Path from 'path';
import chalk from 'chalk';
import _ from 'lodash';
import {register as registerTsNode} from 'ts-node';
import {GlobalOptions as CliOptions} from './cmd/types';
import {getRootDir, getWorkDir} from './utils/misc';
import {getLogger} from 'log4js';
import {DrcpSettings} from './config/config-slice';
import {setTsCompilerOptForNodePath} from './package-mgr/package-list-helper';
import {BehaviorSubject} from 'rxjs';
import {Draft} from '@reduxjs/toolkit';
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
import fs from 'fs';
const {parse} = require('comment-json');
const {cyan} = chalk;
const log = getLogger('plink.config-handler');

export {DrcpSettings};
export interface DrcpConfig {
  /**
   * Used to run command line option "-c" specified TS/JS files one by one 
   */
  configHandlerMgr: BehaviorSubject<ConfigHandlerMgr | undefined>;
  /** lodash like get function, return specific setting property value
   * @return 
   */
  get<K extends keyof DrcpSettings>(path: K, defaultValue?: DrcpSettings[K]): DrcpSettings[K];
  get(path: string | string[], defaultValue?: any): any;
  set<K extends keyof DrcpSettings>(path: K, value: DrcpSettings[K] | any): void;
  set(path: string | string[], value: any): void;
  change(reducer: (setting: Draft<DrcpSettings>) => void): void;
  /**
   * Resolve a path based on `rootPath`
   * @name resolve
   * @memberof config
   * @param  {string} property name or property path, like "name", "name.childProp[1]"
   * @return {string}     absolute path
   */
  resolve(dir: 'rootPath' | 'destDir' | 'staticDir' | 'serverDir', ...path: string[]): string;
  resolve(...path: string[]): string;
  /** @return all settings in a big JSON object */
  (): DrcpSettings;
  reload(): DrcpSettings;
  // init(argv: CliOptions): Promise<DrcpSettings>;
  initSync(argv: CliOptions): DrcpSettings;
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
	 * 
	 * @param configSetting Override properties from dist/config.yaml, which is also you get from `api.config()`
	 * @param drcpCliArgv (deprecated) Override command line argumemnt for DRCP
	 */
  onConfig(configSetting: DrcpSettings, cliOpt: CliOptions): void;
}

export class ConfigHandlerMgr {
  static compilerOptions: any;
  private static _tsNodeRegistered = false;

  private static initConfigHandlers(fileAndExports: Iterable<[file: string, exportName: string]>, rootPath: string):
  Array<{file: string; handler: ConfigHandler}> {
    const exporteds: Array<{file: string; handler: ConfigHandler}> = [];

    if (!ConfigHandlerMgr._tsNodeRegistered) {
      ConfigHandlerMgr._tsNodeRegistered = true;

      const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
      const {compilerOptions} = parse(
        fs.readFileSync(internalTscfgFile, 'utf8')
      );
      ConfigHandlerMgr.compilerOptions = compilerOptions;

      setTsCompilerOptForNodePath(getWorkDir(), './', compilerOptions, {
        enableTypeRoots: true,
        workspaceDir: getWorkDir()
      });

      compilerOptions.module = 'commonjs';
      compilerOptions.noUnusedLocals = false;
      compilerOptions.diagnostics = true;
      compilerOptions.declaration = false;
      delete compilerOptions.rootDir;

      // console.log(compilerOptions);
      registerTsNode({
        typeCheck: true,
        compilerOptions,
        skipIgnore: true, // important, by "true" will skip files are under node_modules
        compiler: require.resolve('typescript'),
        /**
         * Important!! prevent ts-node looking for tsconfig.json from current working directory
         */
        skipProject: true
        , transformers: {
          before: [
            context => (src) => {
              // log.info('before ts-node compiles:', src.fileName);
              // console.log(src.text);
              return src;
            }
          ],
          after: [
            context => (src) => {
              // log.info('ts-node compiles:', src.fileName);
              // console.log(src.text);
              return src;
            }
          ]
        }
      });
    }
    for (const [file, exportName] of fileAndExports) {
      const exp = require(Path.resolve(file));
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


