import fs from 'fs';
import Path from 'path';
import _ts from 'typescript';
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

    const mergeToBaseUrlAbsPath = Path.resolve(mergeToTsconfigDir, mergeTo.baseUrl);

    for (const [key, plist] of Object.entries(mergingTsCo.paths as {[key: string]: string[]}) ) {
      mergeTo.paths[key] = plist.map(item => {
        return Path.relative(mergeToBaseUrlAbsPath, Path.resolve(absBaseUrl, item)).replace(/\\/g, '/');
      });
    }
  }
  return mergingTsCfg;
}

/**
 * typescript's parseConfigFileTextToJson() does not read "extends" property, I have to write my own implementation
 * @param ts 
 * @param file 
 */
export function parseConfigFileToJson(ts: typeof _ts, file: string) {
  const {config, error} = ts.parseConfigFileTextToJson(file, fs.readFileSync(file, 'utf8'));

  if (error) {
    console.error(error);
    throw new Error('Incorrect tsconfig file: ' + file);
  }
  const json = config as {compilerOptions: RequiredCompilerOptions; extends?: string};
  if (json.extends) {
    const extendsFile = Path.resolve(Path.dirname(file), json.extends);
    const pJson = parseConfigFileToJson(ts, extendsFile);
    for (const [prop, value] of Object.entries(pJson.compilerOptions)) {
      if (prop !== 'baseUrl' && prop !== 'paths' && !Object.prototype.hasOwnProperty.call(json.compilerOptions, prop)) {
        json.compilerOptions[prop] = value;
      }
    }

    if (pJson.compilerOptions.paths) {
      const absBaseUrl = pJson.compilerOptions.baseUrl ?
        Path.resolve(Path.dirname(extendsFile), pJson.compilerOptions.baseUrl) :
        Path.dirname(extendsFile);

      const mergeToBaseUrlAbsPath = Path.resolve(Path.dirname(file), json.compilerOptions.baseUrl);

      for (const [key, plist] of Object.entries(pJson.compilerOptions.paths as {[key: string]: string[]}) ) {
        if (json.compilerOptions.paths == null) {
          json.compilerOptions.paths = {};
        }
        json.compilerOptions.paths[key] = plist.map(item => {
          return Path.relative(mergeToBaseUrlAbsPath, Path.resolve(absBaseUrl, item))
            .replace(/\\/g, '/');
        });
      }
    }
  }
  return json;
}
