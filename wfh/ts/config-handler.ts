/* tslint:disable no-console */
import * as Path from 'path';
const {parse} = require('comment-json');
const {cyan, green} = require('chalk');
import {register as registerTsNode} from 'ts-node';
// import {registerExtension, jsonToCompilerOptions} from './ts-compiler';
import fs from 'fs';

export interface DrcpConfig {
  done: Promise<void>;
  configHandlerMgr(): ConfigHandlerMgr;
  get(path: string|string[], defaultValue?: any): any;
  set(path: string|string[], value: any): void;
  resolve(dir: 'destDir'|'staticDir', ...path: string[]): string;
  resolve(...path: string[]): string;
  (): {[property: string]: any};
  load(): Promise<{[property: string]: any}>;
  reload(): Promise<{[property: string]: any}>;
  init(argv?: {[arg: string]: any}): Promise<{[property: string]: any}>;
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

  private static initConfigHandlers(files: string[]): Array<{file: string, handler: ConfigHandler}> {
    const exporteds: Array<{file: string, handler: ConfigHandler}> = [];

    if (!ConfigHandlerMgr._tsNodeRegistered) {
      ConfigHandlerMgr._tsNodeRegistered = true;

      const {compilerOptions} = parse(
        fs.readFileSync(require.resolve('dr-comp-package/wfh/tsconfig.json'), 'utf8')
      );

      compilerOptions.module = 'commonjs';
      compilerOptions.isolatedModules = true;
      compilerOptions.noUnusedLocals = false;

      // const co = jsonToCompilerOptions(compilerOptions);
      // registerExtension('.ts', co);
      registerTsNode({
        typeCheck: true,
        compilerOptions
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

  constructor(files: string[]) {
    this.configHandlers = ConfigHandlerMgr.initConfigHandlers(files);
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
