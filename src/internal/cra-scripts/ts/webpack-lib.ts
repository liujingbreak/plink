import {Configuration, Compiler, RuleSetRule, RuleSetUseItem} from 'webpack';
import {findPackage} from './build-target-helper';
// import type {PlinkEnv} from 'dr-comp-package/wfh/dist/node-path';
import childProc from 'child_process';
// import fs from 'fs-extra';
import Path from 'path';
// import {findDrcpProjectDir} from './utils';
import { getCmdOptions } from './utils';
// import type {PlinkEnv} from 'dr-comp-package/wfh/dist/node-path';
// const {symlinkDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
const plinkDir = Path.dirname(require.resolve('dr-comp-package/package.json'));

const MiniCssExtractPlugin = require(Path.resolve('node_modules/mini-css-extract-plugin'));

export default function change(buildPackage: string, config: Configuration, nodePath: string[]) {
  const foundPkg = findPackage(buildPackage);
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${buildPackage}`);
  }
  const {dir: pkDir, packageJson: pkJson} = foundPkg;

  config.entry = Path.resolve(pkDir, 'public_api.ts');

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


  const reqSet = new Set<string>();

  if (config.externals == null)
    config.externals = [];
  (config.externals as Extract<Configuration['externals'], Array<any>>)
  .push(
    (context: any, request: any, callback: (error?: any, result?: any) => void ) => {
      // TODO: Should be configurable
      if ((!request.startsWith('.') && request !== config.entry &&
        !/[?!]/.test(request)) && (!/[\\/]@babel[\\/]runtime[\\/]/.test(request))
         ||
        request.indexOf('/bklib.min') >= 0) {
        // console.log('external request:', request, `(${context})`);
        reqSet.add(request);
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  );

  config.plugins!.push(
    // new EsmWebpackPlugin(),
    new (class {
      forkDone: Promise<any> = Promise.resolve();

      apply(compiler: Compiler) {
        this.forkDone = this.forkDone.then(() => forkTsc(pkJson.name, nodePath));
        compiler.hooks.done.tap('cra-scripts', stats => {
          // tslint:disable-next-line: no-console
          console.log('external request:\n  ', Array.from(reqSet.values()).join(', '));
        });
      }
    })()
  );
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

function forkTsc(targetPackage: string, nodePath: string[]) {

  const forkArgs = ['tsc', '--ed', '--jsx', targetPackage];
  if (getCmdOptions().watch)
    forkArgs.push('-w');

  // console.log('webpack-lib: ', Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs);
  const cp = childProc.fork(Path.resolve(plinkDir, 'wfh/dist/cmd-bootstrap.js'), forkArgs,
    {
      env: {
        NODE_OPTIONS: '-r dr-comp-package/register',
        NODE_PATH: nodePath.join(Path.delimiter)
      },
      cwd: process.cwd()
      // execArgv: [], // Not working, don't know why
      // stdio: [0, 1, 2, 'ipc']
    });
  // cp.unref();
  return new Promise<void>((resolve, rej) => {
    cp.on('message', msg => {
      if (msg === 'plink-tsc compiled')
        cp.kill('SIGINT');
    });
    if (cp.stdout) {
      cp.stdout.setEncoding('utf8');
      // tslint:disable-next-line: no-console
      cp.stdout.on('data', (data: string) => console.log(data));
      cp.stdout.resume();
    }
    if (cp.stderr)
      cp.stderr.resume();
    cp.on('exit', (code, signal) => {
      if (code !== 0) {
        rej(new Error(`Failed to generate tsd files, due to process exit with code: ${code} ${signal}`));
      } else {
        resolve();
      }
    });
    cp.on('error', err => {
      console.error(err);
      resolve();
    });

  });
}
