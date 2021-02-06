/* tslint:disable no-console */
import * as Path from 'path';
import chalk from 'chalk';
import _ from 'lodash';
const {parse} = require('comment-json');
const {cyan} = chalk;
import {register as registerTsNode} from 'ts-node';
import {GlobalOptions as CliOptions} from './cmd/types';
import {getRootDir} from './utils/misc';
import {getLogger} from 'log4js';
import {DrcpSettings} from './config/config-slice';
import {setTsCompilerOptForNodePath} from './package-mgr/package-list-helper';
import {BehaviorSubject} from 'rxjs';
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
import fs from 'fs';
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
  get(path: string|string[], defaultValue?: any): any;
  set<K extends keyof DrcpSettings>(path: K, value: DrcpSettings[K] | any): void;
  set(path: string|string[], value: any): void;
  /**
   * Resolve a path based on `rootPath`
   * @name resolve
   * @memberof config
   * @param  {string} property name or property path, like "name", "name.childProp[1]"
   * @return {string}     absolute path
   */
  resolve(dir: 'rootPath' | 'destDir'|'staticDir'|'serverDir', ...path: string[]): string;
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
  configHandlerMgrCreated(cb: (handler: ConfigHandlerMgr) => Promise<any> | void): Promise<void>;
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

  private static initConfigHandlers(files: string[], rootPath: string): Array<{file: string, handler: ConfigHandler}> {
    const exporteds: Array<{file: string, handler: ConfigHandler}> = [];

    if (!ConfigHandlerMgr._tsNodeRegistered) {
      ConfigHandlerMgr._tsNodeRegistered = true;

      const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
      const {compilerOptions} = parse(
        fs.readFileSync(internalTscfgFile, 'utf8')
      );
      ConfigHandlerMgr.compilerOptions = compilerOptions;

      setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions);

      compilerOptions.module = 'commonjs';
      compilerOptions.noUnusedLocals = false;
      compilerOptions.diagnostics = true;
      compilerOptions.declaration = false;
      delete compilerOptions.rootDir;

      // console.log(compilerOptions);
      registerTsNode({
        typeCheck: true,
        compilerOptions,
        compiler: require.resolve('typescript'),
        /**
         * Important!! prevent ts-node looking for tsconfig.json from current working directory
         */
        skipProject: true
        ,transformers: {
          after: [
            context => (src) => {
              log.debug('ts-node compiles:', src.fileName);
              // console.log(src.text);
              return src;
            }
          ]
        }
      });
    }
    files.forEach(file => {
      const exp = require(Path.resolve(file));
      exporteds.push({file, handler: exp.default ? exp.default : exp});
    });
    return exporteds;
  }
  protected configHandlers: Array<{file: string, handler: ConfigHandler}>;

  constructor(files: string[]) {
    this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files, getRootDir());
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
      log.info(`Read ${desc || 'settings'}:\n  ` + cyan(file));
      const currRes = await func(file, lastRes, handler as any as H);
      if (currRes !== undefined)
        lastRes = currRes;
    }
    return lastRes;
  }

  runEachSync<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any, desc?: string) {
    let lastRes: any;
    const cwd = process.cwd();
    for (const {file, handler} of this.configHandlers) {
      log.info(`Read ${desc || 'settings'}:\n  ` + cyan(Path.relative(cwd, file)));
      const currRes = func(file, lastRes, handler as any as H);
      if (currRes !== undefined)
        lastRes = currRes;
    }
    return lastRes;
  }
}


