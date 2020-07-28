/* tslint:disable no-console */
import * as Path from 'path';
import chalk from 'chalk';
const {parse} = require('comment-json');
const {cyan, green} = chalk;
import {register as registerTsNode} from 'ts-node';
import {GlobalOptions as CliOptions} from './cmd/types';
// import * as pkmgr from './package-mgr';
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
import fs from 'fs';

export interface BaseDrcpSetting {
  port: number | string;
  publicPath: string;
  /** @deprecated use package-mgr/index#getProjectList() instead */
  projectList: undefined;
  localIP: string;
  devMode: boolean;
  destDir: string;
  staticDir: string;
  recipeFolder?: string;
  rootPath: string;
  log4jsReloadSeconds: number;
  logStat: boolean;
}
export interface DrcpSettings extends BaseDrcpSetting {
  [prop: string]: any;
}

export interface DrcpConfig {
  done: Promise<DrcpSettings>;
  configHandlerMgr(): ConfigHandlerMgr;
  get<K extends keyof BaseDrcpSetting>(path: K, defaultValue?: BaseDrcpSetting[K]): BaseDrcpSetting[K];
  get(path: string|string[], defaultValue?: any): any;
  set<K extends keyof BaseDrcpSetting>(path: K, value: BaseDrcpSetting[K] | any): void;
  set(path: string|string[], value: any): void;
  /**
   * Resolve a path based on `rootPath`
   * @name resolve
   * @memberof config
   * @param  {string} property name or property path, like "name", "name.childProp[1]"
   * @return {string}     absolute path
   */
  resolve(dir: 'destDir'|'staticDir'|'serverDir', ...path: string[]): string;
  resolve(...path: string[]): string;
  (): DrcpSettings;
  load(): Promise<DrcpSettings>;
  reload(): Promise<DrcpSettings>;
  init(argv: CliOptions): Promise<{[property: string]: any}>;
  wfhSrcPath(): string | false;
  setDefault(propPath: string, value: any): DrcpSettings;
}

export interface ConfigHandler {
  /**
	 * 
	 * @param configSetting Override properties from dist/config.yaml, which is also you get from `api.config()`
	 * @param drcpCliArgv Override command line argumemnt for DRCP
	 */
  onConfig(configSetting: {[prop: string]: any}, drcpCliArgv?: {[prop: string]: any}): Promise<void> | void;
}

export class ConfigHandlerMgr {
  private static _tsNodeRegistered = false;

  private static initConfigHandlers(files: string[], rootPath: string): Array<{file: string, handler: ConfigHandler}> {
    // const {getState: getPackageState} = require('./package-mgr') as typeof pkmgr;
    const exporteds: Array<{file: string, handler: ConfigHandler}> = [];

    if (!ConfigHandlerMgr._tsNodeRegistered) {
      ConfigHandlerMgr._tsNodeRegistered = true;

      const internalTscfgFile = Path.resolve(__dirname, '../tsconfig.json');
      const {compilerOptions} = parse(
        fs.readFileSync(internalTscfgFile, 'utf8')
      );

      compilerOptions.baseUrl = rootPath;
      compilerOptions.module = 'commonjs';
      compilerOptions.isolatedModules = true;
      compilerOptions.noUnusedLocals = false;
      compilerOptions.diagnostics = true;
      delete compilerOptions.rootDir;
      compilerOptions.typeRoots = [
        Path.resolve('node_modules/@types')
        // './node_modules/@dr-types'
      ];

      let relativeNm = Path.relative(process.cwd(), rootPath).replace(/\\/g, '/');
      if (relativeNm.length > 0 )
        relativeNm = relativeNm + '/';
      if (rootPath !== process.cwd()) {
        compilerOptions.typeRoots.push(Path.resolve(rootPath, 'node_modules'));
        compilerOptions.paths = {
          '*': [
            'node_modules/*',
            relativeNm + 'node_modules/*'
          ]
        };
      } else {
        compilerOptions.paths = {
          '*': [relativeNm + 'node_modules/*']
        };
      }
      // for (const pks of Object.values(getPackageState().srcPackages || [])) {

      // }
      // const co = jsonToCompilerOptions(compilerOptions);
      // registerExtension('.ts', co);
      // console.log(compilerOptions);
      registerTsNode({
        typeCheck: true,
        compilerOptions,
        /**
         * Important!! prevent ts-node looking for tsconfig.json from current working directory
         */
        skipProject: true
        // ,transformers: {
        //   after: [
        //     context => (src) => {
        //       console.log(compilerOptions);
        //       console.log('ts-node compiles:', src.fileName);
        //       console.log(src.text);
        //       return src;
        //     }
        //   ]
        // }
      });
      files.forEach(file => {
        const exp = require(Path.resolve(file));
        exporteds.push({file, handler: exp.default ? exp.default : exp});
      });
    }
    return exporteds;
  }
  protected configHandlers: Array<{file: string, handler: ConfigHandler}>;

  constructor(files: string[], rootPath: string) {
    this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files, rootPath);
  }

  /**
	 * 
	 * @param func parameters: (filePath, last returned result, handler function),
	 * returns the changed result, keep the last result, if resturns undefined
	 * @returns last result
	 */
  async runEach<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any) {
    let lastRes: any;
    for (const {file, handler} of this.configHandlers) {
      console.log(green(Path.basename(__filename, '.js') + ' - ') + ' run', cyan(file));
      const currRes = await func(file, lastRes, handler as any as H);
      if (currRes !== undefined)
        lastRes = currRes;
    }
    return lastRes;
  }

  runEachSync<H>(func: (file: string, lastResult: any, handler: H) => Promise<any> | any) {
    let lastRes: any;
    for (const {file, handler} of this.configHandlers) {
      console.log(green(Path.basename(__filename, '.js') + ' - ') + ' run', cyan(file));
      const currRes = func(file, lastRes, handler as any as H);
      if (currRes !== undefined)
        lastRes = currRes;
    }
    return lastRes;
  }
}
