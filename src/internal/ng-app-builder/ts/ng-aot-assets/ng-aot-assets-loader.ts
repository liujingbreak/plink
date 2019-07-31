import {RawSourceMap} from 'source-map';
import api from '__api';
import replaceCode, {ReplacementInf} from '../utils/patch-text';
import {randomNumStr} from './index';
import {loader as wbLoader} from 'webpack';
import {Observable, Subject, of} from 'rxjs';
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
  let str: string;
  if (typeof source !== 'string')
    str = source.toString();
  else
    str = source;

  const subj = new Subject<ReplacementInf>();
  subj.pipe(mergeMap(repl => {
    const match = /\.(?:t|j)sx?$/.exec(this.resourcePath);
    if (match) {
      // So far for Angular 8.1.x, all files are .component.html,
      // following logic will not be run at all.
      const prevChar = str.charAt(repl.start-1);
      const postChar = str.charAt(repl.end);

      if ((prevChar === '"' || prevChar === '\'') && postChar === prevChar) {
        // our placeholder is within a string literal, remove quotation mark
        repl.start--;
        repl.end++;
        repl.text = `require(${JSON.stringify(repl.text)})`;
        return of(repl);
      }
    }
    return loadModule(this, repl.text != null ? repl.text! : repl.replacement!)
    .pipe(
      map(resolved => {
        repl.text = resolved;
        return repl;
      })
    );
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
