// import vm from 'vm';
import {LoaderDefinition} from 'webpack';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import _ from 'lodash';
// import {jsonToCompilerOptions, transpileSingleTs} from '@wfh/plink/wfh/dist/ts-compiler';
// import ts from 'typescript';
import {markdownToHtml} from './markdown-util';
// inspector.open(9222, 'localhost', true);

const markdownLoader: LoaderDefinition = function(source, sourceMap) {
  const cb = this.async();
  const importCode = [] as string[];
  let imgIdx = 0;
  markdownToHtml(source,
    // imgSrc => loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this))
    imgSrc => {
      const url = imgSrc.startsWith('.') ? imgSrc : './' + imgSrc;
      importCode.push(`import imgSrc${imgIdx} from '${url}';`);
      return Promise.resolve('${imgSrc' + (imgIdx++) + '}');
    })
    .pipe(
      op.take(1),
      op.map(result => {
        cb(null, importCode.join('\n') + '\nconst html = `' + result + '`; export default html;', sourceMap);
      }),
      op.catchError(err => {
        cb(err, JSON.stringify(err), sourceMap);
        return rx.EMPTY;
      })
    )
    .subscribe();
};

export default markdownLoader;

// const co = jsonToCompilerOptions({
//   baseUrl: '.',
//   outDir: 'dist',
//   declaration: false,
//   module: 'commonjs',
//   target: 'es2015',
//   noImplicitAny: true,
//   suppressImplicitAnyIndexErrors: true,
//   allowSyntheticDefaultImports: true,
//   esModuleInterop: true,
//   inlineSourceMap: false,
//   inlineSources: false,
//   moduleResolution: 'node',
//   experimentalDecorators: true,
//   emitDecoratorMetadata: true,
//   noUnusedLocals: true,
//   preserveSymlinks: false,
//   downlevelIteration: false,
//   strictNullChecks: true,
//   resolveJsonModule: true,
//   diagnostics: false,
//   newLine: 'lf',
//   lib: ['es2016',
//     'es2015',
//     'dom'
//   ],
//   pretty: true,
//   rootDir: 'ts'
// });

// function loadModuleInWebpack(request: string, ctx: LoaderContext<unknown>) {
//   return new rx.Observable<string>(subscriber => {
//     // Unlike extract-loader, we does not support embedded require statement in source code
//     ctx.loadModule(request, (err: Error | null, source: string | Buffer, _sourceMap, normalModule) => {
//       const __webpack_public_path__ = ctx._compiler!.options.output?.publicPath;
//       if (err)
//         return subscriber.error(err);
//       const _exports: {default?: string} = {};
//       const sandbox = {
//         __webpack_public_path__,
//         module: {
//           exports: _exports
//         },
//         exports: _exports
//       };
//       // console.log(`loadModuleInWebpack: ${request} source: ${Buffer.isBuffer(source) ? source.toString() : source}`);
//       if (Buffer.isBuffer(source)) {
//         subscriber.next('Error: Webpack loads a buffer ' + request);
//       } else {
//         source = transpileSingleTs(source, co, ts as any);
//         vm.runInNewContext(source, vm.createContext(sandbox));
//         subscriber.next(sandbox.exports.default);
//       }
//       subscriber.complete();
//     });
//   });
// }

