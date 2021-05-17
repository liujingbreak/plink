import {Configuration, Compiler, RuleSetRule, RuleSetUseItem} from 'webpack';
// import {findPackage} from './build-target-helper';
// import childProc from 'child_process';
import Path from 'path';
import { getCmdOptions } from './utils';
import {logger as log4js, findPackagesByNames} from '@wfh/plink';
import chalk from 'chalk';
import {Worker} from 'worker_threads';
import _ from 'lodash';
const log = log4js.getLogger('@wfh/cra-scripts.webpack-lib');
// import {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
// const plinkDir = Path.dirname(require.resolve('@wfh/plink/package.json'));

const MiniCssExtractPlugin = require(Path.resolve('node_modules/mini-css-extract-plugin'));

export default function change(buildPackage: string, config: Configuration, nodePath: string[]) {
  const foundPkg = [...findPackagesByNames([buildPackage])][0];
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${buildPackage}`);
  }
  const {realPath: pkDir, json: pkJson} = foundPkg;

  if (Array.isArray(config.entry))
    config.entry = config.entry.filter(item => !/[\\/]react-dev-utils[\\/]webpackHotDevClient/.test(item));

  config.output!.path = Path.resolve(pkDir, 'build'); // Have to override it cuz' react-scripts assign `undefined` in non-production env
  config.output!.filename = 'lib-bundle.js';
  config.output!.libraryTarget = 'umd';
  config.optimization!.runtimeChunk = false;
  if (config.optimization && config.optimization.splitChunks) {
    config.optimization.splitChunks = {
      cacheGroups: {default: false}
    };
  }

  // ---- Plugins filter ----

  const InlineChunkHtmlPlugin = require(Path.resolve('node_modules/react-dev-utils/InlineChunkHtmlPlugin'));
  // const InterpolateHtmlPlugin = require(Path.resolve('node_modules/react-dev-utils/InterpolateHtmlPlugin'));
  const ForkTsCheckerWebpackPlugin = require(Path.resolve('node_modules/react-dev-utils/ForkTsCheckerWebpackPlugin'));
  // const HtmlWebpackPlugin = require(Path.resolve('node_modules/html-webpack-plugin'));
  const {HotModuleReplacementPlugin} = require(Path.resolve('node_modules/webpack'));

  config.plugins = config.plugins!.filter(plugin => {

    return [MiniCssExtractPlugin,
      ForkTsCheckerWebpackPlugin,
      InlineChunkHtmlPlugin,
      HotModuleReplacementPlugin
      // HtmlWebpackPlugin,
      // InterpolateHtmlPlugin
    ].every(cls => !(plugin instanceof cls));
  });

  findAndChangeRule(config.module!.rules);

  const cmdOpts = getCmdOptions();
  const externalRequestSet = new Set<string>();
  const includeModuleRe = (cmdOpts.includes || [])
    .map(mod => new RegExp(mod));
  includeModuleRe.push(new RegExp(_.escapeRegExp(cmdOpts.buildTarget)));

  if (config.externals == null) {
    config.externals = [];
  }

  let entrySet: Set<string>;

  (config.externals as Extract<Configuration['externals'], Array<any>>)
    .push(
      async (context: any, request: any, callback: (error?: any, result?: any) => void ) => {
        if (includeModuleRe.some(rg => rg.test(request))) {
          return callback();
        }
        if (entrySet == null && config.entry)
          entrySet = await createEntrySet(config.entry);

        // TODO: Should be configurable

        if ((!request.startsWith('.') && !entrySet.has(request) &&
          !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
          ||
          // TODO: why hard coe bklib ?
          request.indexOf('/bklib.min') >= 0) {
          // log.info('external request:', request, `(${context})`);
          externalRequestSet.add(request);
          return callback(null, request);
        }
        callback();
      }
    );

  config.plugins!.push(
    // new EsmWebpackPlugin(),
    new (class {
      forkDone: Promise<any> = Promise.resolve();

      apply(compiler: Compiler) {
        compiler.hooks.done.tap('cra-scripts', stats => {
          this.forkDone = this.forkDone.then(() => forkTsc(pkJson));
          log.warn(chalk.red('external request:\n  ' + Array.from(externalRequestSet.values()).join(', ')));
        });
      }
    })()
  );
}

async function createEntrySet(configEntry: NonNullable<Configuration['entry']>, entrySet?: Set<string>) {
  if (entrySet == null)
    entrySet = new Set<string>();

  if (Array.isArray(configEntry)) {
    for (const entry of configEntry) {
      entrySet.add(entry);
    }
  } else if (typeof configEntry === 'string') {
    entrySet.add(configEntry);
  } else if (typeof configEntry === 'function') {
    await Promise.resolve(configEntry()).then(entries => createEntrySet(entries));
  } else if (typeof configEntry === 'object') {
    for (const [_key, value] of Object.entries(configEntry)) {
      createEntrySet(value);
    }
  }
  return entrySet;
}


function findAndChangeRule(rules: RuleSetRule[]): void {
  // TODO: check in case CRA will use Rule.use instead of "loader"
  checkSet(rules);
  for (const rule of rules) {
    if (Array.isArray(rule.use)) {
      checkSet(rule.use);

    } else if (Array.isArray(rule.loader)) {
        checkSet(rule.loader);
    } else if (rule.oneOf) {
      return findAndChangeRule(rule.oneOf);
    }
  }

  function checkSet(set: (RuleSetRule | RuleSetUseItem)[]) {
    const found = set.findIndex(
      use => (use as any).loader && (use as any).loader.indexOf(MiniCssExtractPlugin.loader) >= 0);
    // const found = rule.use.findIndex(use => (use as any).loader && (use as any).loader.indexOf('mini-css-extract-plugin') >= 0);
    if (found >= 0) {
      set.splice(found, 1);
      set.unshift(require.resolve('style-loader'));
    }
  }
  return;
}

async function forkTsc(targetPackageJson: {name: string; plink?: any; dr?: any}) {
  const worker = new Worker(require.resolve('./tsd-generate-thread'));
  await new Promise<void>((resolve, rej) => {
    worker.on('exit', code => {
      if (code !== 0) {
        rej(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve();
      }
    });
    worker.on('message', rej);
    worker.on('error', rej);
  });

  // const forkArgs = ['tsc', '--ed', '--jsx', targetPackage];
  // if (getCmdOptions().watch)
  //   forkArgs.push('-w');

  // // console.log('webpack-lib: ', Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs);
  // const cp = childProc.fork(Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs,
  //   {
  //     // env: {
  //     //   NODE_OPTIONS: '-r @wfh/plink/register',
  //     //   NODE_PATH: nodePath.join(Path.delimiter)
  //     // },
  //     cwd: process.cwd()
  //     // execArgv: [], // Not working, don't know why
  //     // stdio: [0, 1, 2, 'ipc']
  //   });
  // // cp.unref();
  // return new Promise<void>((resolve, rej) => {
  //   cp.on('message', msg => {
  //     if (msg === 'plink-tsc compiled')
  //       cp.kill('SIGINT');
  //   });
  //   if (cp.stdout) {
  //     cp.stdout.setEncoding('utf8');
  //     // tslint:disable-next-line: no-console
  //     cp.stdout.on('data', (data: string) => console.log(data));
  //     cp.stdout.resume();
  //   }
  //   if (cp.stderr)
  //     cp.stderr.resume();
  //   cp.on('exit', (code, signal) => {
  //     if (code != null && code !== 0) {
  //       rej(new Error(`Failed to generate tsd files, due to process exit with code: ${code} ${signal}`));
  //     } else {
  //       resolve();
  //     }
  //   });
  //   cp.on('error', err => {
  //     console.error(err);
  //     resolve();
  //   });
  // });
}
