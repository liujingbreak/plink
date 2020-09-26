/* tslint:disable max-line-length */
import { readTsConfig, transpileSingleTs } from 'dr-comp-package/wfh/dist/ts-compiler';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import { Observable, of, throwError } from 'rxjs';
import {map} from 'rxjs/operators';
import * as ts from 'typescript';
import api, {DrcpApi} from '__api';
import { replaceHtml } from './ng-aot-assets';
import { AngularCliParam } from './ng/common';
import { HookReadFunc } from './utils/read-hook-vfshost';
import Selector from './utils/ts-ast-query';
import ApiAotCompiler from './utils/ts-before-aot';
import {transform as transformViewChild} from './utils/upgrade-viewchild-ng8';
import LRU from 'lru-cache';
const chalk = require('chalk');

const log = log4js.getLogger(api.packageName + '.ng-ts-replace');

const apiTmplTs = _.template('import __DrApi from \'@wfh/ng-app-builder/src/app/api\';\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
__api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');

(Object.getPrototypeOf(api) as DrcpApi).browserApiConfig = browserLegoConfig;

export default class TSReadHooker {
  hookFunc: HookReadFunc;
  templateFileCount = 0;
  tsFileCount = 0;
  private realFileCache = new LRU<string, string>({max: 100, maxAge: 20000});
  private tsCache = new LRU<string, ArrayBuffer>({max: 100, maxAge: 20000});


  constructor(ngParam: AngularCliParam) {
    this.hookFunc = this.createTsReadHook(ngParam);
  }

  clear() {
    this.tsCache = new LRU<string, ArrayBuffer>({max: 100, maxAge: 20000});
    this.templateFileCount = 0;
    this.tsFileCount = 0;
  }

  logFileCount() {
    log.info(`Read template files: ${this.templateFileCount}, Typescript files: ${this.tsFileCount}`);
  }

  private realFile(file: string, preserveSymlinks: boolean): string {
    const realFile = this.realFileCache.get(file);
    if (realFile !== undefined)
      return realFile;
    if (fs.lstatSync(file).isSymbolicLink()) {
      if (!preserveSymlinks)
        log.warn(`Reading a symlink: ${file}, but "preserveSymlinks" is false.`);
      const rf = fs.realpathSync(file);
      this.realFileCache.set(file, rf);
      return rf;
    } else
      return file;
  }

  private createTsReadHook(ngParam: AngularCliParam): HookReadFunc {
    // let drcpIncludeBuf: ArrayBuffer;
    const tsconfigFile = ngParam.browserOptions.tsConfig;

    // const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || api.argv.hmr;
    const preserveSymlinks = ngParam.browserOptions.preserveSymlinks != null ? ngParam.browserOptions.preserveSymlinks :
      false;
    const tsCompilerOptions = readTsConfig(tsconfigFile);
    const ng8Compliant = api.config.get(api.packageName + '.ng8Compliant', true);

    return (file: string, buf: ArrayBuffer): Observable<ArrayBuffer> => {
      try {
        if (file.endsWith('.component.html')) {
          const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
          if (cached != null)
            return of(cached);
          this.templateFileCount++;
          return replaceHtml(file, Buffer.from(buf).toString())
            .pipe(map(output => string2buffer(output)));

        } else if (!file.endsWith('.ts') || file.endsWith('.d.ts')) {
          return of(buf);
        }

        const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
        if (cached != null)
          return of(cached);

        this.tsFileCount++;

        const compPkg = api.findPackageByFile(file);
        let content = Buffer.from(buf).toString();
        let needLogFile = false;

        const tsSelector = new Selector(content, file);
        const hasImportApi = tsSelector.findAll(':ImportDeclaration>.moduleSpecifier:StringLiteral').some(ast => {
          return (ast as ts.StringLiteral).text === '__api';
        });
        let changed = api.browserInjector.injectToFile(file, content);

        if (ng8Compliant)
          changed = transformViewChild(changed, file);

        changed = new ApiAotCompiler(file, changed).parse(source => transpileSingleTs(source, tsCompilerOptions));
        if (hasImportApi && compPkg) {
          changed = apiTmplTs({packageName: compPkg.longName}) + '\n' + changed;
          log.warn('Deprecated usage: import ... from "__api" in ', file);
        }

        if (needLogFile)
          log.info(chalk.cyan(file) + ':\n' + changed);
        const bf = string2buffer(changed);
        this.tsCache.set(this.realFile(file, preserveSymlinks), bf);
        return of(bf);
      } catch (ex) {
        log.error(ex);
        return throwError(ex);
      }
    };
  }

}

export function string2buffer(input: string): ArrayBuffer {
  const nodeBuf = Buffer.from(input);
  const len = nodeBuf.byteLength;
  const newBuf = new ArrayBuffer(len);
  const dataView = new DataView(newBuf);
  for (let i = 0; i < len; i++) {
    dataView.setUint8(i, nodeBuf.readUInt8(i));
  }
  return newBuf;
}

function browserLegoConfig() {
  var browserPropSet: any = {};
  var legoConfig: any = {}; // legoConfig is global configuration properties which apply to all entries and modules
  _.each([
    'staticAssetsURL', 'serverURL', 'packageContextPathMapping',
    'locales', 'devMode', 'outputPathMap'
  ], prop => browserPropSet[prop] = 1);
  _.each(api.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
  _.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(api.config(), propPath)));
  // var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
  // legoConfig.outputPathMap = compressedInfo.diffMap;
  // legoConfig._outputAsNames = compressedInfo.sames;
  return legoConfig;
}

// function compressOutputPathMap(pathMap: any) {
//   var newMap: any = {};
//   var sameAsNames: string[] = [];
//   _.each(pathMap, (value, key) => {
//     var parsed = api.packageUtils.parseName(key);
//     if (parsed.name !== value) {
//       newMap[key] = value;
//     } else {
//       sameAsNames.push(key);
//     }
//   });
//   return {
//     sames: sameAsNames,
//     diffMap: newMap
//   };
// }
