import _ts from 'typescript';
import fs from 'fs';
import Path from 'path';
import {CompilerOptions as RequiredCompilerOptions} from './package-mgr/package-list-helper';
export {RequiredCompilerOptions};

/**
 * 
 * @param ts 
 * @param fromTsconfigFile 
 * @param mergeToTsconfigDir 
 * @param mergeTo 
 * @return json of fromTsconfigFile
 */
export function mergeBaseUrlAndPaths(ts: typeof _ts, fromTsconfigFile: string,
  mergeToTsconfigDir: string,
  mergeTo: RequiredCompilerOptions): {compilerOptions: RequiredCompilerOptions} {
  const mergingTsCfg = ts.parseConfigFileTextToJson(fromTsconfigFile, fs.readFileSync(fromTsconfigFile, 'utf8')).config;
  const mergingTsCo = mergingTsCfg.compilerOptions as RequiredCompilerOptions;

  if (mergeTo.paths == null) {
    if (mergeTo.baseUrl == null)
      mergeTo.baseUrl = './';
    mergeTo.paths = {};
  }
  if (mergingTsCo.paths) {
    const absBaseUrl = mergingTsCo.baseUrl ?
      Path.resolve(Path.dirname(fromTsconfigFile), mergingTsCo.baseUrl) :
      Path.dirname(fromTsconfigFile);
    for (const [key, plist] of Object.entries(mergingTsCo.paths as {[key: string]: string[]}) ) {
      mergeTo.paths[key] = plist.map(item => {
        return Path.relative(Path.resolve(mergeToTsconfigDir, mergeTo.baseUrl), Path.resolve(absBaseUrl, item)).replace(/\\/g, '/');
      });
    }
  }
  return mergingTsCfg;
}
