import {loader} from 'webpack';
import cheerio from 'cheerio';
import {logger} from '@wfh/plink';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import vm from 'vm';
import _ from 'lodash';
import util from 'util';
import path from 'path';
import { jsonToCompilerOptions, transpileSingleTs } from '@wfh/plink/wfh/dist/ts-compiler';
import {Pool} from '@wfh/thread-promise-pool';

const log = logger.getLogger('@wfh/doc-ui-common.markdown-loader');


let threadPool: Pool;

const loader: loader.Loader = function(source, sourceMap) {
  if (threadPool == null) {
    threadPool = new Pool();
  }
  const cb = this.async();
  if (cb) {
    rx.from(threadPool.submit<string>({
      file: path.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
    })).pipe(
      op.mergeMap(html => {
        const $ = cheerio.load(html);
        log.debug(html);
        const done: (rx.Observable<string>|Promise<string>)[] = [];

        const imgs = $('img');
        imgs.each((idx, img) => {
          const imgQ = $(img);
          const imgSrc = imgQ.attr('src');
          log.info('found img src=' + imgQ.attr('src'));
          if (imgSrc) {
            done.push(loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this)
              .pipe(
                op.tap(resolved => {
                  imgQ.attr('src', resolved);
                  log.info(`resolve ${imgSrc} to ${util.inspect(resolved)}`);
                })
              ));
          }
        });
        return rx.merge(...done).pipe(
          op.catchError(err => {
            log.error(err);
            cb(err, source, sourceMap);
            return rx.of();
          }),
          op.finalize(() => {
            cb(null, $.html(), sourceMap);
          })
        );
      })
    ).subscribe();
  }
};

export default loader;

const co = jsonToCompilerOptions({
    baseUrl: '.',
    outDir: 'dist',
    declaration: false,
    module:'commonjs',
    target:'es2015',
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
    ctx.loadModule(request, (err: Error, source) => {
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

