import {RawSourceMap} from 'source-map';
import api from '__api';
import replaceCode, {ReplacementInf} from '../utils/patch-text';
import {randomNumStr} from './index';
import {loader as wbLoader} from 'webpack';
import {Observable, Subject} from 'rxjs';
import {mergeMap, map, toArray} from 'rxjs/operators';
import vm = require('vm');
import * as _ from 'lodash';
// const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');

const pattern = new RegExp(`\\[drcp_${randomNumStr};([^\\]]*)\\]`, 'g');

const loader: wbLoader.Loader = function(source: string | Buffer, sourceMap?: RawSourceMap) {
  const callback = this.async();
  if (!callback) {
    this.emitError('loader does not support sync mode');
    throw new Error('loader does not support sync mode');
  }
  // if (!this.resourcePath.endsWith('.ngfactory.js'))
  //   return callback(null, source, sourceMap);
  let str: string;
  if (typeof source !== 'string')
    str = source.toString();
  else
    str = source;

  // let toBeReplaced: ReplacementInf[];
  const subj = new Subject<ReplacementInf>();
  subj.pipe(mergeMap(repl => {
    // const beginChar = str.charAt(repl.start-1);
    // const endChar = str.charAt(repl.end);

    // if ((beginChar === '"' || beginChar === '\'') && endChar === beginChar) {
    //   // a string literal
    //   repl.start--;
    //   repl.end++;
    //   repl.text = `require(${JSON.stringify(repl.text)})`;
    //   return of(repl);
    // } else {
      return loadModule(this, repl.text != null ? repl.text! : repl.replacement!)
      .pipe(
        map(resolved => {
          repl.text = resolved;
          return repl;
        })
      );
    // }
  }), toArray())
  .subscribe(replacements => {
    if (replacements.length === 0) {
      return callback(null, source, sourceMap);
    } else {
      const replacedSrc = replaceCode(str, replacements);
      callback(null, replacedSrc, sourceMap);
    }
  });
  pattern.lastIndex = 0;
  while (true) {
    const found = pattern.exec(str);
    if (found == null) {
      subj.complete();
      break;
    }
    const key = found[1];
    subj.next({start: found.index, end: found.index + found[0].length, text: key});
    pattern.lastIndex = found.index + found[0].length;
  }
};

function loadModule(loader: wbLoader.LoaderContext, text: string) {
  return new Observable<string>(subscriber => {
    // Unlike extract-loader, we does not support embedded require statement in source code 
    loader.loadModule(text, (err: Error, source: any, sourceMap: any, module: any) => {
      if (err)
        return subscriber.error(err);
      var sandbox = {
        __webpack_public_path__: _.get(loader, '_compiler.options.output.publicPath', api.config().publicPath),
        module: {
          exports: {}
        }
      };
      vm.runInNewContext(source, vm.createContext(sandbox));
      subscriber.next(sandbox.module.exports as string);
      subscriber.complete();
    });
  });
}

export = loader;
