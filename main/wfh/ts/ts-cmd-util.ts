import _ts from 'typescript';
import fs from 'fs';
import Path from 'path';
import {CompilerOptions as RequiredCompilerOptions} from './package-mgr/package-list-helper';
export {RequiredCompilerOptions};

export function mergeBaseUrlAndPaths(ts: typeof _ts, fromTsconfigFile: string,
  mergeToTsconfigDir: string,
  mergeTo: RequiredCompilerOptions) {
  const mergingTscfg = ts.parseConfigFileTextToJson(fromTsconfigFile, fs.readFileSync(fromTsconfigFile, 'utf8'))
    .config.compilerOptions;

  if (mergeTo.paths == null) {
    if (mergeTo.baseUrl == null)
      mergeTo.baseUrl = './';
    mergeTo.paths = {};
  }
  if (mergingTscfg.paths) {
    const absBaseUrl = mergingTscfg.baseUrl ?
      Path.resolve(Path.dirname(fromTsconfigFile), mergingTscfg.baseUrl) :
      Path.dirname(fromTsconfigFile);
    for (const [key, plist] of Object.entries(mergingTscfg.paths as {[key: string]: string[]}) ) {
      mergeTo.paths[key] = plist.map(item => {
        return Path.relative(Path.resolve(mergeToTsconfigDir, mergeTo.baseUrl), Path.resolve(absBaseUrl, item)).replace(/\\/g, '/');
      });
    }
  }
}
