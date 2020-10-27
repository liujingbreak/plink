/* tslint:disable no-console */
import * as Path from 'path';
import chalk from 'chalk';
import _ from 'lodash';
const {parse} = require('comment-json');
const {cyan, green} = chalk;
import {register as registerTsNode} from 'ts-node';
import {GlobalOptions as CliOptions} from './cmd/types';
import {PlinkEnv} from './node-path';
import {getRootDir} from './utils/misc';
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
  wfhSrcPath: string;
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
  resolve(dir: 'rootPath'|'destDir'|'staticDir'|'serverDir', ...path: string[]): string;
  resolve(...path: string[]): string;
  (): DrcpSettings;
  load(): Promise<DrcpSettings>;
  reload(): Promise<DrcpSettings>;
  loadSync(): DrcpSettings;
  init(argv: CliOptions): Promise<DrcpSettings>;
  initSync(argv: CliOptions): DrcpSettings;
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
    const exporteds: Array<{file: string, handler: ConfigHandler}> = [];

    if (!ConfigHandlerMgr._tsNodeRegistered) {
      ConfigHandlerMgr._tsNodeRegistered = true;

      const internalTscfgFile = Path.resolve(__dirname, '../tsconfig-base.json');
      const {compilerOptions} = parse(
        fs.readFileSync(internalTscfgFile, 'utf8')
      );

      setTsCompilerOptForNodePath(process.cwd(), './', compilerOptions);

      compilerOptions.module = 'commonjs';
      compilerOptions.noUnusedLocals = false;
      compilerOptions.diagnostics = true;
      delete compilerOptions.rootDir;

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

export interface CompilerOptionSetOpt {
  /** Will add typeRoots property for specific workspace */
  workspaceDir?: string;
  enableTypeRoots: boolean;
  /** Default false, Do not include linked package symlinks directory in path*/
  noSymlinks?: boolean;
  extraNodePath?: string[];
  extraTypeRoot?: string[];
}

export interface CompilerOptions {
  baseUrl: string;
  typeRoots: string[];
  paths: {[path: string]: string[]};
  [key: string]: any;
}
/**
 * Set "baseUrl", "paths" and "typeRoots" property based on Root path, process.cwd()
 * and process.env.NODE_PATHS
 * @param cwd project directory where tsconfig file is (virtual), "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions 
 */
export function setTsCompilerOptForNodePath(cwd: string, baseUrl = './', assigneeOptions: Partial<CompilerOptions>,
  opts: CompilerOptionSetOpt = {enableTypeRoots: false}) {

  let pathsDirs: string[] = [];
  // workspace node_modules should be the first
  if (opts.workspaceDir != null) {
    pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
  }
  if (opts.extraNodePath && opts.extraNodePath.length > 0) {
    pathsDirs.push(...opts.extraNodePath);
  }
  if (process.env.NODE_PATH) {
    pathsDirs.push(...process.env.NODE_PATH.split(Path.delimiter));
  }

  // console.log('temp..............', pathsDirs);
  // console.log('extraNodePath', opts.extraNodePath);

  pathsDirs = _.uniq(pathsDirs);

  if (opts.noSymlinks) {
    const {symlinkDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
    const idx = pathsDirs.indexOf(symlinkDir);
    if (idx >= 0) {
      pathsDirs.splice(idx, 1);
    }
  }

  if (Path.isAbsolute(baseUrl)) {
    let relBaseUrl = Path.relative(cwd, baseUrl);
    if (!relBaseUrl.startsWith('.'))
      relBaseUrl = './' + relBaseUrl;
    baseUrl = relBaseUrl;
  }
  // console.log('+++++++++', pathsDirs, opts.extraNodePath);
  assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
  if (assigneeOptions.paths == null)
    assigneeOptions.paths = {'*': []};
  else
    assigneeOptions.paths['*'] = [];

  // console.log('pathsDirs', pathsDirs);
  for (const dir of pathsDirs) {
    const relativeDir = Path.relative(Path.resolve(cwd, baseUrl), dir).replace(/\\/g, '/');
    // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
    assigneeOptions.paths['*'].push(relativeDir + '/@types/*');
    assigneeOptions.paths['*'].push(relativeDir + '/*');
  }

  assigneeOptions.typeRoots = [
    Path.relative(cwd, Path.resolve(__dirname, '..', 'types')).replace(/\\/g, '/')
  ];
  if (opts.workspaceDir != null) {
    assigneeOptions.typeRoots.push(
      Path.relative(cwd, Path.resolve(opts.workspaceDir, 'types')).replace(/\\/g, '/'));
  }
  if (opts.enableTypeRoots ) {
    assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
      const relativeDir = Path.relative(cwd, dir).replace(/\\/g, '/');
      return relativeDir + '/@types';
    }));
  }

  if (opts.extraTypeRoot) {
    assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(
      dir => Path.relative(cwd, dir).replace(/\\/g, '/')));
  }

  return assigneeOptions;
}

