// import {findPackage} from './build-target-helper';
// import childProc from 'child_process';
import Path from 'path';
import {Worker} from 'worker_threads';
import {logger as log4js, findPackagesByNames, plinkEnv} from '@wfh/plink';
import chalk from 'chalk';
import {Configuration, Compiler, RuleSetRule, RuleSetUseItem, EntryObject} from 'webpack';
import _ from 'lodash';
import {getCmdOptions} from './utils';
const log = log4js.getLogger('@wfh/cra-scripts.webpack-lib');

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const MiniCssExtractPlugin = require(Path.resolve('node_modules/mini-css-extract-plugin'));

const MODULE_NAME_PAT = /^((?:@[^\\/]+[\\/])?[^\\/]+)/;

export default function change(buildPackage: string, config: Configuration, nodePath: string[]) {
  const foundPkg = [...findPackagesByNames([buildPackage])][0];
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${buildPackage}`);
  }
  const {realPath: pkDir} = foundPkg;

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

    return [
      MiniCssExtractPlugin,
      ForkTsCheckerWebpackPlugin,
      InlineChunkHtmlPlugin,
      HotModuleReplacementPlugin
      // HtmlWebpackPlugin,
      // InterpolateHtmlPlugin
    ].every(cls => !(plugin instanceof cls));
  });

  findAndChangeRule(config.module!.rules!);

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
      async ({context, request}, callback: (error?: any, result?: any) => void ) => {
        if (request && includeModuleRe.some(rg => rg.test(request))) {
          return callback();
        }
        if (entrySet == null && config.entry)
          entrySet = await createEntrySet(config.entry);

        if (request && (!request.startsWith('.') && !entrySet.has(request) &&
          !/[?!]/.test(request)) // && (!/(?:^|[\\/])@babel[\\/]runtime[\\/]/.test(request))
        ) {
          if (Path.isAbsolute(request)) {
            log.info('request absolute path:', request);
            return callback();
          } else {
            log.debug('external request:', request, `(${context ?? ''})`);
            externalRequestSet.add(request);
            return callback(null, request);
          }
        }
        callback();
      }
    );

  config.plugins.push(
    // new EsmWebpackPlugin(),
    new (class {
      forkDone: Promise<any> = Promise.resolve();

      apply(compiler: Compiler) {
        compiler.hooks.done.tap('cra-scripts', stats => {
          this.forkDone = this.forkDone.then(() => forkTsc());
          const externalDeps: Set<string> = new Set<string>();
          const workspaceNodeDir = plinkEnv.workDir + Path.sep + 'node_modules' + Path.sep;
          for (const req of externalRequestSet.values()) {
            if (Path.isAbsolute(req) && Path.resolve(req).startsWith(workspaceNodeDir)) {
              const m = MODULE_NAME_PAT.exec(req.slice(workspaceNodeDir.length));
              externalDeps.add(m ? m[1] : req.slice(workspaceNodeDir.length));
            } else {
              const m = MODULE_NAME_PAT.exec(req);
              externalDeps.add(m ? m[1] : req);
            }
          }
          log.warn(chalk.red('external dependencies:\n  ' + [...externalDeps.values()].join(', ')));
        });
      }
    })()
  );
}

type EntryDescription = EntryObject extends {[index: string]: infer V} ? Exclude<V, string | string[]> : unknown;

async function createEntrySet(configEntry: NonNullable<Configuration['entry'] | EntryDescription>, entrySet?: Set<string>) {
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
    if (configEntry.import) {
      await createEntrySet(configEntry.import);
    } else {
      await Promise.all(Object.entries(configEntry).map(([_key, value]) => {
        return createEntrySet(value);
      }));
    }
  }
  return entrySet;
}

type RuleSetUseItemObj = Exclude<RuleSetUseItem, string | ((...a: any[]) => any)>;

function findAndChangeRule(rules: NonNullable<NonNullable<Configuration['module']>['rules']> | RuleSetUseItem[]): void {
  // TODO: check in case CRA will use Rule.use instead of "loader"
  if (!Array.isArray(rules))
    return;
  checkSet(rules);
  for (const rule of rules) {
    if (typeof rule === 'string')
      continue;
    if (Array.isArray((rule as RuleSetRule).use)) {
      checkSet((rule as RuleSetRule).use as RuleSetUseItem[]);
    } else if ((rule as RuleSetRule).oneOf) {
      return findAndChangeRule((rule as RuleSetRule).oneOf!);
    }
  }

  function checkSet(set: RuleSetUseItem[]) {
    const found = set.findIndex(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
      use => (use as RuleSetUseItemObj).loader && (use as RuleSetUseItemObj).loader!.indexOf(MiniCssExtractPlugin.loader) >= 0);
    // const found = rule.use.findIndex(use => (use as any).loader && (use as any).loader.indexOf('mini-css-extract-plugin') >= 0);
    if (found >= 0) {
      set.splice(found, 1);
      set.unshift(require.resolve('style-loader'));
    }
  }
  return;
}

async function forkTsc() {
  const worker = new Worker(require.resolve('./tsd-generate-thread'), {execArgv: ['--preserve-symlinks-main', '--preserve-symlinks']});
  log.warn('forkTsc, threadId:', worker.threadId);
  await new Promise<void>((resolve, rej) => {
    worker.on('exit', code => {
      if (code !== 0) {
        rej(new Error(`Worker stopped with exit code ${code}`));
      } else {
        resolve();
      }
      worker.off('message', rej);
      worker.off('error', rej);
    });
    worker.on('message', rej);
    worker.on('error', rej);
  });
}
