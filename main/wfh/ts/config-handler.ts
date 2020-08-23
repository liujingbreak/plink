/* tslint:disable no-console */
import * as Path from 'path';
import chalk from 'chalk';
import _ from 'lodash';
const {parse} = require('comment-json');
const {cyan, green} = chalk;
import {register as registerTsNode} from 'ts-node';
import {GlobalOptions as CliOptions} from './cmd/types';

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
  // log4jsReloadSeconds: number;
  logStat: boolean;
  packageScopes: string[];
  installedRecipes: string[];
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

      const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
      const {compilerOptions} = parse(
        fs.readFileSync(internalTscfgFile, 'utf8')
      );

      setTsCompilerOpt(process.cwd(), compilerOptions);

      compilerOptions.module = 'commonjs';
      compilerOptions.noUnusedLocals = false;
      compilerOptions.diagnostics = true;
      delete compilerOptions.rootDir;
      delete compilerOptions.typeRoots;

      // console.log(compilerOptions);
      registerTsNode({
        typeCheck: true,
        compilerOptions,
        /**
         * Important!! prevent ts-node looking for tsconfig.json from current working directory
         */
        skipProject: true
        ,transformers: {
          after: [
            context => (src) => {
              console.log('ts-node compiles:', src.fileName);
              // console.log(src.text);
              return src;
            }
          ]
        }
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

/**
 * Set "baseUrl", "paths" and "typeRoots" property based on Root path, process.cwd()
 * and process.env.NODE_PATHS
 * @param cwd project directory where tsconfig file is (virtual)
 * @param assigneeOptions 
 */
export function setTsCompilerOpt(cwd: string, assigneeOptions: {[key: string]: any},
  opts: {setTypeRoots: boolean; extraNodePath?: string[]} = {setTypeRoots: false}) {
  // pathsDirs = _.uniq(pathsDirs);
  let pathsDirs = process.env.NODE_PATH ? process.env.NODE_PATH.split(Path.delimiter) : [];
  if (opts.extraNodePath) {
    pathsDirs.unshift(...opts.extraNodePath);
    pathsDirs = _.uniq(pathsDirs);
  }

  assigneeOptions.baseUrl = '.';
  if (assigneeOptions.paths == null)
    assigneeOptions.paths = {};
  assigneeOptions.paths['*'] = [];
  for (const dir of pathsDirs) {
    const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
    // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
    assigneeOptions.paths['*'].push(relativeDir + '/@types/*');
    assigneeOptions.paths['*'].push(relativeDir + '/*');
  }

  if (opts.setTypeRoots) {
    assigneeOptions.typeRoots = pathsDirs.map(dir => {
      const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
      return relativeDir + '/@types';
    });
  }

  return assigneeOptions as {
    baseUrl: string;
    paths: {[key: string]: string[]};
    [key: string]: any;
  };
}
