import {loader} from 'webpack';
import MarkdownIt from 'markdown-it';
import * as highlight from 'highlight.js';
import cheerio from 'cheerio';
import {logger} from '@wfh/plink';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import vm from 'vm';
import _ from 'lodash';
import util from 'util';
import { jsonToCompilerOptions, transpileSingleTs } from '@wfh/plink/wfh/dist/ts-compiler';
// import path from 'path';

const log = logger.getLogger('@wfh/doc-ui-common.markdown-loader');

const md = new MarkdownIt({
  html: true,
  highlight(str, lang, attrs) {
    if (lang) {
      try {
        return highlight.highlight(lang, str, true).value;
      } catch (e) {
        log.error(e);
      }
    }
    return str;
  }
});

const loader: loader.Loader = function(source, sourceMap) {
  const cb = this.async();
  if (cb) {
    const html = md.render(source as string);
    const $ = cheerio.load(html);
    log.debug(html);

    const done: (rx.Observable<string>|Promise<string>)[] = [];

    const imgs = $('img');
    imgs.each((idx, img) => {
      const imgQ = $(img);
      const imgSrc = imgQ.attr('src');
      log.info('found img src=' + imgQ.attr('src'));
      if (imgSrc) {
        done.push(load(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this)
          .pipe(
            op.tap(resolved => {
              imgQ.attr('src', resolved);
              log.info(`resolve ${imgSrc} to ${util.inspect(resolved)}`);
            })
          ));
      }
    });

    // const componentIds = $('div[id]');
    // componentIds.each((idx, div) => {
    //   const id = (div as unknown as HTMLDivElement).id;
    //   if (id.startsWith('component:')) {
    //   }
    // });

    rx.merge(...done).subscribe({
      error(err) {
        log.error(err);
      },
      complete() {
        cb(null, $.html(), sourceMap);
      }
    });
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

function load(request: string, ctx: loader.LoaderContext) {
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

