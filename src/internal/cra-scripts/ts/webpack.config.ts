/* eslint-disable no-console,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment */
import Path from 'path';
// import util from 'node:util';
import {ConfigHandlerMgr} from '@wfh/plink/wfh/dist/config-handler';
import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import setupSplitChunks from '@wfh/webpack-common/dist/splitChunks';
import StatsPlugin from '@wfh/webpack-common/dist/webpack-stats-plugin';
import fs from 'fs-extra';
import _ from 'lodash';
import {logger, packageOfFileFactory, plinkEnv, config as plinkConfig, webInjector} from '@wfh/plink';
import memStats from '@wfh/plink/wfh/dist/utils/mem-stats';
import {Configuration, RuleSetRule, Compiler, ProgressPlugin} from 'webpack';
import api from '__plink';
import nodeResolve from 'resolve';
import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';
import {Options as HtmlWebpackPluginOptions} from 'html-webpack-plugin';
import {ReactScriptsHandler, ForkTsCheckerWebpackPluginOptions, ForkTsCheckerWebpackPluginTypescriptOpts} from './types';
import {drawPuppy, getCmdOptions, printConfig, getReportDir} from './utils';
import change4lib from './webpack-lib';
import * as _craPaths from './cra-scripts-paths';
import {changeTsConfigFile} from './change-tsconfig';
import * as webpackResolveCfg from './webpack-resolve';
import {TermuxWebpackPlugin} from './termux-issue-webpack-plugin';
// import inspector from 'node:inspector';
// inspector.open(9222, 'localhost', true);

const log = logger.getLogger('@wfh/cra-scripts.webpack-config');
const {nodePath, rootDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

export default function(webpackEnv: 'production' | 'development') {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const {addResolveAlias} = require('./webpack-resolve') as typeof webpackResolveCfg;
  drawPuppy('Hack create-react-app', `If you want to know how Webpack is configured, check: ${api.config.resolve('destDir', 'cra-scripts.report')}`);

  const progressMsg$ = new rx.Subject<any[]>();
  // rx.from(import('string-width'))
  //   .pipe(
  //     op.mergeMap(({default: strWidth}) => progressMsg$.pipe(
  //       op.map(msg => {
  //         let lines = 1;
  //         const str = util.format('[Progress]', ...msg);
  //         const width = strWidth(str);
  //         if (width > process.stdout.columns) {
  //           lines = Math.ceil(process.stdout.columns / width);
  //         }
  //         return {str, lines};
  //       }),
  //       op.concatMap(({str, lines}) => rx.concat(
  //         rx.concat(
  //           new Promise<void>(resolve => process.stdout.cursorTo(0, resolve)),
  //           lines > 1 ? new Promise<void>(resolve => process.stdout.moveCursor(0, -lines + 1, resolve)) : rx.EMPTY,
  //           new Promise<void>(resolve => process.stdout.clearLine(0, resolve))
  //         ),
  //         rx.defer(() => {
  //           return new Promise<void>(resolve => process.stdout.write(str, () => resolve()));
  //         })
  //       ))
  //     ))
  //   ).subscribe();

  const cmdOption = getCmdOptions();
  // `npm run build` by default is in production mode, below hacks the way react-scripts does
  if (cmdOption.devMode || cmdOption.watch) {
    webpackEnv = 'development';
    log.info('Development mode is on:', webpackEnv);
  } else {
    // process.env.GENERATE_SOURCEMAP = 'false';
  }
  log.info('webpackEnv :', webpackEnv);
  process.env.INLINE_RUNTIME_CHUNK = 'true';
  const origWebpackConfig = require('react-scripts/config/webpack.config');
  reviseNodePathEnv();

  const {default: craPaths}: typeof _craPaths = require('./cra-scripts-paths');
  const reactScriptsInstalledDir = Path.resolve(plinkEnv.workDir, 'node_modules/react-scripts');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const config: Configuration = origWebpackConfig(webpackEnv);
  if (webpackEnv === 'production') {
    // Try to workaround issue: default InlineChunkPlugin 's test property does not match
    // CRA's output chunk file name template,
    // when we set optimization.runtimeChunk to "single" instead of default CRA's value
    config.output!.filename = 'static/js/[name]-[contenthash:8].js';
    config.output!.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
    config.output!.devtoolModuleFilenameTemplate =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (info: {absoluteResourcePath: string}) => Path.relative(rootDir, info.absoluteResourcePath).replace(/\\/g, '/');
  } else {
    config.output!.filename = 'static/js/[name].js';
    config.output!.chunkFilename = 'static/js/[name].chunk.js';
  }
  config.stats = 'normal';
  addResolveAlias(config);

  const reportDir = getReportDir();
  fs.mkdirpSync(reportDir);
  fs.writeFile(Path.resolve(reportDir, 'webpack.config.cra.js'), printConfig(config), (err) => {
    if (err)
      log.error('Failed to write ' + Path.resolve(reportDir, 'webpack.config.cra.js'), err);
  });

  // Make sure babel compiles source folder out side of current src directory
  // changeFileLoader(config.module!.rules as RuleSetRule[]);
  // replaceSassLoader(config.module!.rules as RuleSetRule[]);
  // appendOurOwnTsLoader(config);
  // insertLessLoaderRule(config.module!.rules as RuleSetRule[]);
  // changeForkTsCheckerPlugin(config);

  if (cmdOption.buildType === 'app') {
    config.output!.path = craPaths().appBuild;
  }

  // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
  if (config.resolve?.plugins) {
    const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
    const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
    if (srcScopePluginIdx >= 0) {
      config.resolve.plugins.splice(srcScopePluginIdx, 1);
    }
  }

  // config.resolve!.symlinks = false;
  const {getPkgOfFile} = packageOfFileFactory();

  const resolveModules = ['node_modules', ...nodePath];
  // config.resolve!.symlinks = false;
  config.resolve!.modules = [...config.resolve?.modules ?? [], ...nodePath];
  if (config.resolveLoader == null)
    config.resolveLoader = {};
  config.resolveLoader.modules = resolveModules;
  // config.resolveLoader.symlinks = false;
  if (config.watchOptions == null)
    config.watchOptions = {};
  if (cmdOption.usePoll) {
    config.watchOptions.poll = 1000;
  }
  config.watchOptions.aggregateTimeout = 900;
  config.watchOptions.ignored = /(?:\bnode_modules\b|^(?:\/(?:data(?:\/data)?)?)$)/;
  // config.watchOptions.followSymlinks = false;

  // config.resolve!.plugins.unshift(new PlinkWebpackResolvePlugin());

  // Object.assign(config.resolve!.alias, require('rxjs/_esm2015/path-mapping')());

  if (cmdOption.cmd === 'cra-build')
    config.plugins!.push(new StatsPlugin());
  else
    addProgressPlugin(config, (...s) => progressMsg$.next(s));

  if (cmdOption.buildType === 'lib') {
    change4lib(cmdOption.buildTarget, config, nodePath);
  } else {
    config.plugins!.push(new (class {
      apply(compiler: Compiler) {
        compiler.hooks.done.tap('cra-scripts', _stats => {
          // if (/(^|\s)--expose-gc(\s|$)/.test(process.env.NODE_OPTIONS!) ||
          //   )
          if (global.gc)
            global.gc();
          memStats();
        });
      }
    })());

    const htmlWebpackPluginConstrutor = require(nodeResolve.sync('html-webpack-plugin', {basedir: reactScriptsInstalledDir}));
    const htmlWebpackPluginInstance = config.plugins!.find(plugin => plugin instanceof htmlWebpackPluginConstrutor) as unknown as {userOptions: HtmlWebpackPluginOptions};
    htmlWebpackPluginInstance.userOptions.templateParameters = {
      _config: plinkConfig(),
      __api: api
    };
    setupSplitChunks(config, (mod) => {
      const file = mod.resource ?? null;
      if (file == null)
        return true;
      const pkg = getPkgOfFile(file);
      return pkg == null || (pkg.json.dr == null && pkg.json.plink == null);
    });
  }
  config.plugins?.push(new TermuxWebpackPlugin());

  const rules = [...config.module?.rules ?? []]; // BFS array contains both RuleSetRule and RuleSetUseItem

  for (const rule of rules) {
    if (typeof rule !== 'string') {
      if (rule.oneOf) {
        rules.push(...rule.oneOf);
      } else if (Array.isArray(rule.use)) {
        rules.push(...rule.use as any); // In factor rule.use is RuleSetUseItem not RuleSetRule
      } else if (rule.loader) {
        if (/\bbabel-loader\b/.test(rule.loader)) {
          if (rule.include) {
            delete rule.include;
            rule.test = createRuleTestFunc4Src(rule.test);
          }
        } else if (/\bsass-loader\b/.test(rule.loader)) {
          rule.options = {
            implementation: require('sass'),
            webpackImporter: false,
            sourceMap: true,
            sassOptions: {
              includePaths: ['node_modules', ...nodePath]
            }
          };
        } else if (/\bsource-map-loader\b/.test(rule.loader)) {
          rule.test = createRuleTestFunc4Src(rule.test);
        }
      }
    }
  }
  config.module?.rules!.push({
    test: createRuleTestFunc4Src(/\.[mc]?[jt]sx?$/),
    loader: '@wfh/webpack-common/dist/ts-loader',
    options: {
      injector: webInjector,
      tsConfigFile: Path.join(plinkEnv.workDir, 'tsconfig.json')
    }
  });
  changeForkTsCheckerOptions(config, craPaths().appIndexJs, reactScriptsInstalledDir, cmdOption);

  runConfigHandlers(config, webpackEnv);
  log.info(`output.publicPath: ${config.output!.publicPath as string}`);
  fs.writeFileSync(Path.resolve(reportDir, 'webpack.config.plink.js'), printConfig(config));

  return config;
}

function addProgressPlugin(config: Configuration, send: (...msg: any[]) => void) {
  // let spinner: ReturnType<typeof _ora>;

  if (process.stdout.isTTY) {
    config.plugins!.push(new ProgressPlugin({
      activeModules: true,
      modules: true,
      modulesCount: 100,
      handler(percentage, msg, ...args) {
        send(Math.round(percentage * 100), '%', msg, ...args);
      }
    }));
  }
}

/**
 * fork-ts-checker does not work for files outside of workspace which is actually our linked source package
 */
// function changeForkTsCheckerPlugin(config: Configuration) {
//   const plugins = config.plugins!;
//   const cnst = require(nodeResolve.sync('react-dev-utils/ForkTsCheckerWebpackPlugin',
//     {basedir: Path.resolve('node_modules/react-scripts')}));
//   // let forkTsCheckIdx = -1;
//   for (let i = 0, l = plugins.length; i < l; i++) {
//     if (plugins[i] instanceof cnst) {
//       (plugins[i] ).reportFiles = [];
//       // forkTsCheckIdx = i;
//       break;
//     }
//   }
// }
/**
 * react-scripts/config/env.js filters NODE_PATH for only allowing relative path, this breaks
 * Plink's NODE_PATH setting.
 */
function reviseNodePathEnv() {
  const {nodePath} = JSON.parse(process.env.__plink!) as PlinkEnv;
  process.env.NODE_PATH = nodePath.join(Path.delimiter);
}

/**
 * Help to replace ts, js file by configuration
 */
// function appendOurOwnTsLoader(config: Configuration) {
//   const myTsLoaderOpts: TsLoaderOpts = {
//     tsConfigFile: Path.resolve('tsconfig.json'),
//     injector: api.browserInjector!,
//     compileExpContext: file => {
//       const pkg = api.findPackageByFile(file);
//       if (pkg) {
//         return {__api: api.getNodeApiForPackage!(pkg)};
//       } else {
//         return {};
//       }
//     }
//   };
//   config.module?.rules?.push({
//     test: createRuleTestFunc4Src(/\.[jt]sx?$/),
//     // enforce: 'pre',
//     use: {
//       options: myTsLoaderOpts,
//       loader: require.resolve('@wfh/webpack-common/dist/ts-loader')
//     }
//   });
// }

function runConfigHandlers(config: Configuration, webpackEnv: string) {
  const {getConfigFileInPackage}: typeof _craPaths = require('./cra-scripts-paths');
  const configFileInPackage = getConfigFileInPackage();
  const cmdOption = getCmdOptions();
  if (configFileInPackage) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, _result, handler) => {
      if (handler.webpack != null) {
        log.info('Execute Webpack configuration overrides from ', cfgFile);
        handler.webpack(config, webpackEnv, cmdOption);
      }
    }, 'create-react-app Webpack config');
  }
  api.config.configHandlerMgrChanged(mgr => mgr.runEachSync<ReactScriptsHandler>((cfgFile, _result, handler) => {
    if (handler.webpack != null) {
      log.info('Execute command line Webpack configuration overrides', cfgFile);
      handler.webpack(config, webpackEnv, cmdOption);
    }
  }, 'create-react-app Webpack config'));
}

function changeForkTsCheckerOptions(
  config: Configuration, appIndexFile: string,
  moduleResolveBase: string,
  cmdOptions: ReturnType<typeof getCmdOptions>
) {
  const plugins = config.plugins!;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const cnst = require(nodeResolve.sync('react-dev-utils/ForkTsCheckerWebpackPlugin',
    {basedir: moduleResolveBase}));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const cnst2 = require(nodeResolve.sync('react-dev-utils/ForkTsCheckerWarningWebpackPlugin',
    {basedir: moduleResolveBase}));

  const plugin = plugins.find(p => p instanceof cnst || p instanceof cnst2);
  if (plugin == null) {
    throw new Error('Can not find fork-ts-checker-webpack-plugin in existing Webpack configuation');
  }
  const opts = (plugin as unknown as {options: ForkTsCheckerWebpackPluginOptions}).options;
  if (!cmdOptions.tsck) {
    log.warn('fork-ts-checker-webpack-plugin is disabled');
    // (opts.typescript as Exclude<ForkTsCheckerWebpackPluginOptions['typescript'], boolean | undefined>).enabled = false;
    config.plugins = config.plugins!.filter(p => p !== plugin);
    return;
  }
  const tsconfig = (opts.typescript as ForkTsCheckerWebpackPluginTypescriptOpts).configOverwrite!;
  const typescriptOpts = opts.typescript as ForkTsCheckerWebpackPluginTypescriptOpts;
  typescriptOpts.diagnosticOptions = {
    /**
     * If we set "declaration": true,
     * there will be Typescript compile error like "This is likely not portable, a type annotation is necessary"
     * https://github.com/microsoft/TypeScript/issues/30858

     * It usally happens when you are using a "monorepo", with a resolved symlink pointing to some directory which is not under "node_modules",
     * the alternative solution is, **try not to resolve symlinks** in compiler options, and don't use real file path in "file", "include" property in tsconfig.
     */
    declaration: false,
    global: true,
    syntactic: true,
    semantic: true
  };
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  delete opts.issue?.include;


  log.info('CRA fork-ts-checker configuration:', opts.typescript);

  const override = changeTsConfigFile(appIndexFile).tsconfigJson;

  for (const coProp of ['sourceMap', 'inlineSourceMap', 'declarationMap'] as const) {
    delete (override.compilerOptions as Record<string, any>)[coProp];
  }
  Object.assign(tsconfig.compilerOptions!, override.compilerOptions);
  for (const [prop, value] of Object.entries(override)) {
    if (prop !== 'compilerOptions')
      (tsconfig as Record<string, any>)[prop] = value;
  }
  const tsconfigReport = Path.resolve(getReportDir(), 'tsconfig.json');
  log.info('tsconfig for forked-ts-checker', tsconfigReport);
  void fs.promises.writeFile(tsconfigReport, JSON.stringify(tsconfig, null, '  '));
}

// function insertLessLoaderRule(origRules: RuleSetRule[]): void {
//   const oneOf = origRules.find(rule => rule.oneOf)?.oneOf!;
//   // 1. let's take rules for css as a template
//   const cssRuleUse = oneOf.find(subRule => subRule.test instanceof RegExp &&
//     (subRule.test as RegExp).source === '\\.css$')?.use as RuleSetUseItem[];

//   const cssModuleRuleUse = oneOf.find(subRule => subRule.test instanceof RegExp &&
//     (subRule.test as RegExp).source === '\\.module\\.css$')?.use as RuleSetUseItem[];

//   const lessModuleRule: RuleSetRule = {
//     test: /\.module\.less$/,
//     use: createLessRuleUse(cssModuleRuleUse),
//     sideEffects: true
//   };

//   const lessRule: RuleSetRule = {
//     test: /\.less$/,
//     // exclude: /\.module\.less$/,
//     use: createLessRuleUse(cssRuleUse),
//     sideEffects: true
//   };

//   // Insert at last 2nd position, right before file-loader
//   oneOf.splice(oneOf.length - 2, 0, lessModuleRule, lessRule);

//   function createLessRuleUse(useItems: RuleSetUseItem[]) {
//     return useItems.map(useItem => {
//       if (typeof useItem === 'string' || typeof useItem === 'function') {
//         return useItem;
//       }
//       const newUseItem = {...useItem};
//       if (useItem.loader && /[\\/]css-loader[\\/]/.test(useItem.loader)) {
//         newUseItem.options = {
//           ...(newUseItem.options as any || {}),
//           importLoaders: 2
//         };
//       }
//       return newUseItem;
//     }).concat({
//       loader: 'less-loader',
//       options: {
//         lessOptions: {
//           javascriptEnabled: true,
//           ...getSetting().lessLoaderOtherOptions
//         },
//         additionalData: getSetting().lessLoaderAdditionalData
//       }
//     });
//   }
// }

// const fileLoaderOptions = {
//   // esModule: false,
//   outputPath(url: string, resourcePath: string, _context: string) {
//     const pk = api.findPackageByFile(resourcePath);
//     return `${(pk ? pk.shortName : 'external')}/${url}`;
//   }
// };

/**
 *
 * @param rules
 */
// function changeFileLoader(rules: RuleSetRule[]): void {
//   const craPaths = require('react-scripts/config/paths');
//   // TODO: check in case CRA will use Rule.use instead of "loader"
//   checkSet(rules);
//   for (const rule of rules) {
//     if (Array.isArray(rule.use)) {
//       checkSet(rule.use);

//     } else if (Array.isArray(rule.loader)) {
//       checkSet(rule.loader);
//     } else if (rule.oneOf) {
//       insertRawLoader(rule.oneOf);
//       return changeFileLoader(rule.oneOf);
//     }
//   }

function createRuleTestFunc4Src(origTest: RuleSetRule['test'], appSrc?: string) {
  return function testOurSourceFile(file: string)  {
    const pk = api.findPackageByFile(file);

    const yes = ((pk && (pk.json.dr || pk.json.plink)) || (appSrc && file.startsWith(appSrc))) &&
      (origTest instanceof RegExp)
      ? origTest.test(file) :
      (origTest instanceof Function ? origTest(file) : origTest === file);
    // if (yes)
    //   log.warn(`[webpack.config] testOurSourceFile: ${file}`, yes);
    return yes;
  };
}

// function insertRawLoader(rules: RuleSetRule[]) {
//   const htmlLoaderRule = {
//     test: /\.html$/,
//     use: [{loader: 'raw-loader'}]
//   };
//   rules.push(htmlLoaderRule);
// }

/** To support Material-component-web */
// function replaceSassLoader(rules: RuleSetRule[]) {

//   const oneOf = rules.find(rule => rule.oneOf)?.oneOf;
//   oneOf?.filter(subRule => Array.isArray(subRule.use))
//     .forEach(subRule => {
//       const useItem = (subRule.use as RuleSetLoader[])
//         .find(useItem => useItem.loader && /sass-loader/.test(useItem.loader));
//       if (useItem != null) {
//         useItem.options = {
//           implementation: require('sass'),
//           webpackImporter: false,
//           sourceMap: true,
//           sassOptions: {
//             includePaths: ['node_modules', ...nodePath]
//           }
//         };
//       }
//     });
// }
