import {loader} from 'webpack';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
import vm from 'vm';
import { jsonToCompilerOptions, transpileSingleTs } from '@wfh/plink/wfh/dist/ts-compiler';
import {markdownToHtml} from './markdown-util';

const markdownLoader: loader.Loader = function(source, sourceMap) {

  const cb = this.async();

  if (cb) {
    markdownToHtml(source as string,
      imgSrc => loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this))
      .pipe(
        op.take(1),
        op.map(result => {
          cb(null, JSON.stringify(result), sourceMap);
        }),
        op.catchError(err => {
          cb(err, JSON.stringify(err), sourceMap);
          return rx.EMPTY;
        })
      )
    .subscribe();
  }
};

export default markdownLoader;

const co = jsonToCompilerOptions({
    baseUrl: '.',
    outDir: 'dist',
    declaration: false,
    module: 'commonjs',
    target: 'es2015',
    noImplicitAny: true,
    suppressImplicitAnyIndexErrors: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    inlineSourceMap: false,
    inlineSources: false,
    moduleResolution: 'node',
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    noUnusedLocals: true,
    preserveSymlinks: false,
    downlevelIteration: false,
    strictNullChecks: true,
    resolveJsonModule: true,
    diagnostics: false,
    newLine: 'lf',
    lib: ['es2016',
      'es2015',
      'dom'
    ],
    pretty: true,
    rootDir: 'ts'
  }
);

function loadModuleInWebpack(request: string, ctx: loader.LoaderContext) {
  return new rx.Observable<string>(subscriber => {
    // Unlike extract-loader, we does not support embedded require statement in source code 
    ctx.loadModule(request, (err: Error | null, source) => {
      const __webpack_public_path__ = ctx._compiler.options.output?.publicPath;
      if (err)
        return subscriber.error(err);
      const _exports: {default?: string} = {};
      const sandbox = {
        __webpack_public_path__,
        module: {
          exports: _exports
        },
        exports: _exports
      };
      source = transpileSingleTs(source, co);
      vm.runInNewContext(source, vm.createContext(sandbox));
      subscriber.next(sandbox.exports.default);
      subscriber.complete();
    });
  });
}

