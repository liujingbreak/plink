import {AnalyzeOptions} from './types';
import os from 'os';
import Path from 'path';
import glob from 'glob';
import _ from 'lodash';
// import { PayloadAction } from '@reduxjs/toolkit';
import { stateFactory, ofPayloadAction, createReducers } from '../store';
import { ignoreElements, catchError, map, mergeMap} from 'rxjs/operators';
import * as op from 'rxjs/operators';
import {merge} from 'rxjs';
import {Context} from './cli-analyse-worker';
import {createCliTable} from '../utils/misc';
import log4js from 'log4js';
import {Pool} from '../../../packages/thread-promise-pool/dist';
import chalk from 'chalk';
import {findPackagesByNames} from './utils';
import {getState} from '../package-mgr';
import {getTscConfigOfPkg} from '../utils/misc';
// import config from '../config';

const log = log4js.getLogger('plink.analyse');
const cpus = os.cpus().length;

export default function(packages: string[], opts: AnalyzeOptions) {
  const alias: [reg: string, replace: string][] =
    opts.alias.map(item => JSON.parse(item) as [reg: string, replace: string]);

  if (opts.file && opts.file.length > 0) {
    dispatcher.analyzeFile({
      files: opts.file,
      alias,
      tsconfig: opts.tsconfig,
      ignore: opts.x
    });
  } else if (opts.dir && opts.dir.length > 0) {
    dispatcher.analyzeFile({
      files: opts.dir.map(dir => dir.replace(/\\/g, '/') + '/**/*'),
      alias,
      tsconfig: opts.tsconfig,
      ignore: opts.x
    });
  } else {
    // log.warn('Sorry, not implemented yet, use with argument "-f" for now.');
    let i = 0;
    for (const pkg of findPackagesByNames(getState(), packages)) {
      if (pkg == null) {
        log.error(`Can not find package for name "${packages[i]}"`);
        continue;
      }
      const dirs = getTscConfigOfPkg(pkg.json);
      const patterns = [`${pkg.realPath.replace(/\\/g, '/')}/${dirs.srcDir}/**/*`];
      if (dirs.isomDir) {
        patterns.push(`${pkg.realPath.replace(/\\/g, '/')}/${dirs.srcDir}/**/*.ts`);
      }
      dispatcher.analyzeFile({files: patterns, alias, ignore: opts.x});
      i++;
    }
  }
  getStore().pipe(
    map(s => s.result), op.distinctUntilChanged(),
    op.skip(1),
    op.tap((result) => {
      printResult(result!, opts);
    }),
    op.take(1)
  ).subscribe();

}

export function printResult(result: NonNullable<AnalyzeState['result']>, opts: {j: AnalyzeOptions['j']}) {
  if (result.canNotResolve.length > 0) {
    const table = createCliTable({horizontalLines: false});
    table.push([{colSpan: 2, content: chalk.bold('Can not resolve dependecies'), hAlign: 'center'}]);
    table.push([{hAlign: 'right', content: '--'}, '--------']);
    let i = 1;
    for (const msg of result.canNotResolve) {
      // eslint-disable-next-line no-console
      table.push([{hAlign: 'right', content: i++}, JSON.stringify(msg, null, '  ')]);
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
  }

  if (result.cyclic.length > 0) {
    let i = 1;
    const table = createCliTable({horizontalLines: false});
    table.push([{colSpan: 2, content: chalk.bold('Cyclic dependecies'), hAlign: 'center'}]);
    table.push([{hAlign: 'right', content: '--'}, '--------']);
    for (const msg of result.cyclic) {
      table.push([{hAlign: 'right', content: i++}, msg]);
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
  }

  if (result.externalDeps.length > 0) {
    let i = 1;
    const table = createCliTable({horizontalLines: false});
    table.push([{colSpan: 2, content: chalk.bold('External dependecies'), hAlign: 'center'}]);
    if (!opts.j) {
      table.push([{hAlign: 'right', content: '--'}, '--------']);
      for (const msg of result.externalDeps) {
        table.push([{hAlign: 'right', content: i++}, msg]);
      }
      for (const msg of result.nodeModuleDeps) {
        table.push([{hAlign: 'right', content: i++}, msg + ' (Node.js)']);
      }
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
    if (opts.j) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result.externalDeps, null, '  '));
    }
  }

  if (result.relativeDepsOutSideDir.length > 0) {
    let i = 1;
    const table = createCliTable({horizontalLines: false});
    table.push([{
      colSpan: 2,
      content: chalk.bold(`Dependencies outside of ${result.commonDir}`),
      hAlign: 'center'
    }]);
    table.push([{hAlign: 'right', content: '--'}, '--------']);
    for (const msg of result.relativeDepsOutSideDir) {
      table.push([{hAlign: 'right', content: i++}, msg]);
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
  }

  if (result?.matchAlias && result.matchAlias.length > 0) {
    let i = 1;
    const table = createCliTable({horizontalLines: false});
    table.push([{
      colSpan: 2,
      content: chalk.bold('Alias resolved'),
      hAlign: 'center'
    }]);
    table.push([{hAlign: 'right', content: '--'}, '--------']);
    for (const msg of result.matchAlias) {
      table.push([{hAlign: 'right', content: i++}, msg]);
    }
    // eslint-disable-next-line no-console
    console.log(table.toString());
  }
}
interface AnalyzeState {
  inputFiles?: string[];
  result?: ReturnType<Context['toPlainObject']>;
}

const initState: AnalyzeState = {
};

const slice = stateFactory.newSlice({
  name: 'analyze',
  initialState: initState,
  reducers: createReducers({
    /** payload: glob patterns */
    analyzeFile(d: AnalyzeState, payload: {
      files: string[]; tsconfig?: string; alias: [pattern: string, replace: string][]; ignore?: string;
    }) {
      d.inputFiles = payload.files;
    }
  })
});

export function getStore() {
  return stateFactory.sliceStore(slice);
}

export const dispatcher = stateFactory.bindActionCreators(slice);

stateFactory.addEpic<{analyze: AnalyzeState}>((action$, state$) => {
  return merge(
    action$.pipe(ofPayloadAction(slice.actions.analyzeFile),
      mergeMap(({payload}) => analyseFiles(payload.files, payload.tsconfig, payload.alias, payload.ignore)),
      map(result => {
        dispatcher._change(s => s.result = result); // TODO merge result instead of 'assign' result
      })
    )
  ).pipe(
    catchError((err, src) => {
      console.error(err);
      return src;
    }),
    ignoreElements()
  );
});


export async function analyseFiles(files: string[],
  tsconfigFile: string | undefined,
  alias: [pattern: string, replace: string][],
  ignore?: string) {
  const matchDones = files.map(pattern => new Promise<string[]>((resolve, reject) => {
    glob(pattern, {nodir: true}, (err, matches) => {
      if (err) {
        return reject(err);
      }
      resolve(matches);
    });
  }));
  files = _.flatten((await Promise.all(matchDones)))

  .filter(f => /\.[jt]sx?$/.test(f));
  const threadPool = new Pool(cpus - 1, 0, {
    // initializer: {file: 'source-map-support/register'},
    verbose: false
  });

  // process.env.NODE_OPTIONS = '--inspect-brk';
  return await threadPool.submitProcess<ReturnType<Context['toPlainObject']>>({
    file: Path.resolve(__dirname, 'cli-analyse-worker.js'),
    exportFn: 'dfsTraverseFiles',
    args: [files.map(p => Path.resolve(p)), tsconfigFile, alias, ignore]
  });

}
