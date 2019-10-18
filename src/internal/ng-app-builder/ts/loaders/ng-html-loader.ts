// import {RawSourceMap} from 'source-map';
import api from '__api';
import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger('ng-html-loader');
import * as _ from 'lodash';
import {Observable} from 'rxjs';
import vm = require('vm');
import {replaceForHtml} from '../ng-aot-assets/html-assets-resolver';

type RawSourceMap = Parameters<wbLoader.LoaderContext['callback']>[2];

interface LoaderContext {
  loadModule: wbLoader.LoaderContext['loadModule'];
  resourcePath: wbLoader.LoaderContext['resourcePath'];
}
const loader: wbLoader.Loader & {compileHtml: (content: string, loader: LoaderContext)=> Promise<string>} =
function(content: string, map?: RawSourceMap) {
  var callback = this.async();
  if (!callback) {
    this.emitError('loader does not support sync mode');
    throw new Error('loader does not support sync mode');
  }
  load(content, this)
  .then(result => this.callback(null, result, map))
  .catch(err => {
    this.callback(err);
    this.emitError(err);
    log.error(err);
  });
};

loader.compileHtml = load;

// namespace loader {
// 	export const compileHtml = load;
// }

export = loader;

async function load(
  content: string,
  loader: LoaderContext
  ): Promise<string> {

  return replaceForHtml(content, loader.resourcePath, (text: string) => {
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
  }).toPromise();
}





