///<reference path="./module-declare.d.ts" />
/* eslint-disable no-console,@typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-assignment */
import Path from 'path';
import {ConfigHandlerMgr} from '@wfh/plink/wfh/dist/config-handler';
import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import setupSplitChunks from '@wfh/webpack-common/dist/splitChunks';
import StatsPlugin from '@wfh/webpack-common/dist/webpack-stats-plugin';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import fs from 'fs-extra';
import _ from 'lodash';
import {logger, packageOfFileFactory, plinkEnv, config as plinkConfig/* , webInjector*/} from '@wfh/plink';
import memStats from '@wfh/plink/wfh/dist/utils/mem-stats';
import {FileCacheOptions, Configuration, RuleSetRule, Compiler, ProgressPlugin} from 'webpack';
import nodeResolve from 'resolve';
import {Options as HtmlWebpackPluginOptions} from 'html-webpack-plugin';
import {ReactScriptsHandler, ForkTsCheckerWebpackPluginOptions, ForkTsCheckerWebpackPluginTypescriptOpts} from './types';
import {drawPuppy, getCmdOptions, printConfig, getReportDir, createCliPrinter} from './utils';
import change4lib from './webpack-lib';
import {setupDllPlugin, setupDllReferencePlugin} from './webpack-dll';
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
  drawPuppy('Hack create-react-app', `If you want to know how Webpack is configured, check: ${plinkConfig.resolve('destDir', 'cra-scripts.report')}`);

  const printMsg = createCliPrinter('[Build Progress]');

  const cmdOption = getCmdOptions();
  if (cmdOption.cmd !== 'cra-start') {
    process.env.FAST_REFRESH = 'false';
  }
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

  // if (cmdOption.buildType === 'app') {
  //   config.output!.path = craPaths().appBuild;
  // }

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
  (config.cache as FileCacheOptions).buildDependencies!.plink = [getPkgOfFile(__filename)!.path.replace(/\\/g, '/') + '/'];

  const resolveModules = _.uniq(['node_modules', ...nodePath]);
  // config.resolve!.symlinks = false;
  config.resolve!.modules = _.uniq([...config.resolve?.modules ?? [], ...nodePath]);
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

  addProgressPlugin(config, (...s) => void printMsg(...s));
  if (config.infrastructureLogging)
    config.infrastructureLogging.level = 'warn';

  if (cmdOption.buildType === 'lib') {
    change4lib(cmdOption.buildTargets[0].pkg!, config);
  } else if (cmdOption.buildType === 'dll') {
    if (cmdOption.refDllManifest) {
      setupDllReferencePlugin(cmdOption.refDllManifest, config);
    }
    setupDllPlugin(cmdOption.buildTargets, config, getPluginConstructor);
  } else {
    let dllJsFiles = [] as string[];
    if (cmdOption.refDllManifest) {
      dllJsFiles = setupDllReferencePlugin(cmdOption.refDllManifest, config);
    }
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

    const htmlWebpackPluginConstrutor = getPluginConstructor('html-webpack-plugin'); // require(nodeResolve.sync('html-webpack-plugin', {basedir: reactScriptsInstalledDir}));
    const htmlWebpackPluginInstance = config.plugins!.find(plugin => plugin instanceof htmlWebpackPluginConstrutor) as unknown as {userOptions: HtmlWebpackPluginOptions};
    htmlWebpackPluginInstance.userOptions.templateParameters = {
      _config: plinkConfig(),
      _dllJsFiles: dllJsFiles.map(p => config.output!.publicPath + p)
    };
    setupSplitChunks(config, (mod) => {
      const file = mod.resource ?? null;
      if (file == null)
        return true;
      const pkg = getPkgOfFile(file);
      return pkg == null || (pkg.json.dr == null && pkg.json.plink == null);
    });
  }

  const now = new Date();
  const timeStr = now.getDate() + '_' + now.getHours() + '-' + now.getMinutes() + '-' + now.getSeconds() + '-' + now.getMilliseconds();
  config.plugins?.push( new TermuxWebpackPlugin());

  if (cmdOption.cmd === 'cra-build' && !cmdOption.watch) {
    const buildIdentifier = nameFromConfigEntry(config);
    config.plugins?.push(
      new TermuxWebpackPlugin(),
      new BundleAnalyzerPlugin({
        analyzerMode: 'disabled',
        generateStatsFile: true,
        statsFilename: Path.join(plinkEnv.distDir, `webpack-bundle-analyzer.stats.${typeof buildIdentifier === 'string' ? buildIdentifier : timeStr}.json`)
      })
    );
  }

  function getPluginConstructor(pluginPkgName: string) {
    return require(nodeResolve.sync(pluginPkgName, {basedir: reactScriptsInstalledDir}));
  }
  const rules = [...config.module?.rules ?? []]; // BFS array contains both RuleSetRule and RuleSetUseItem

  for (const rule of rules) {
    if (typeof rule !== 'string') {
      if (rule.oneOf) {
        rules.push(...rule.oneOf);
      } else if (Array.isArray(rule.use)) {
        rules.push(...rule.use as any); // In factor rule.use is RuleSetUseItem not RuleSetRule
      } else if (rule.loader) {
        const appSrc = Path.join(plinkEnv.workDir, 'src');
        if (/\bbabel-loader\b/.test(rule.loader) && rule.include) {
          delete rule.include;
          rule.test = createRuleTestFunc4Src(rule.test, appSrc);
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          (rule.options as Exclude<RuleSetRule['options'], string | undefined>).plugins.push([
            'formatjs',
            {
              idInterpolationPattern: '[sha512:contenthash:base64:6]',
              ast: true
            }
          ]);
        } else if (/\bsass-loader\b/.test(rule.loader)) {
          /** To support Material-component-web */
          rule.options = {
            implementation: require('sass'),
            webpackImporter: false,
            sourceMap: true,
            sassOptions: {
              // According to https://github.com/material-components/material-components-web/blob/master/docs/getting-started.md#appendix-configuring-a-sass-importer-for-nested-node_modules
              // it's better to implement a "importer" property here to help Sass resolve @matertial modules,
              // otherwise Sass will always load top level packages from "includePaths" (node_modules) instead of Node's module resolution algorithm
              includePaths: ['node_modules', ...nodePath]
            }
          };
        } else if (/\bsource-map-loader\b/.test(rule.loader)) {
          rule.test = createRuleTestFunc4Src(rule.test, appSrc);
        }
      }
    }
  }
  changeForkTsCheckerOptions(config, craPaths().appIndexJs, getPluginConstructor, cmdOption);

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

function createRuleTestFunc4Src(origTest: RuleSetRule['test'], appSrc: string) {
  const {getPkgOfFile} = packageOfFileFactory();
  const appSrcDir = appSrc + Path.sep;

  return function testOurSourceFile(file: string)  {
    const pk = getPkgOfFile(file);

    const yes = ((pk && (pk.json.dr || pk.json.plink)) || file.startsWith(appSrcDir)) &&
      (origTest instanceof RegExp)
      ? origTest.test(file) :
      (origTest instanceof Function ? origTest(file) : origTest === file);

    // if (file.indexOf('service-worker') >= 0)
    //   log.warn(`[webpack.config] testOurSourceFile: ${file} ${yes}, appSrc: ${appSrc}\n\n\n\n`);
    return yes;
  };
}

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
  plinkConfig.configHandlerMgrChanged(mgr => mgr.runEachSync<ReactScriptsHandler>((cfgFile, _result, handler) => {
    if (handler.webpack != null) {
      log.info('Execute command line Webpack configuration overrides', cfgFile);
      handler.webpack(config, webpackEnv, cmdOption);
    }
  }, 'create-react-app Webpack config'));
}

function changeForkTsCheckerOptions(
  config: Configuration, appIndexFile: string,
  pluginConstFinder: (moduleName: string) => any,
  cmdOptions: ReturnType<typeof getCmdOptions>
) {
  const plugins = config.plugins!;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const cnst = pluginConstFinder('react-dev-utils/ForkTsCheckerWebpackPlugin');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const cnst2 = pluginConstFinder('react-dev-utils/ForkTsCheckerWarningWebpackPlugin');

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

function nameFromConfigEntry(config: Configuration) {
  let entryFile = typeof config.entry! === 'string' ?
    config.entry : Array.isArray(config.entry) ?
      config.entry[0] :
      typeof config.entry === 'object' ? Object.values(config.entry)[0] : null;

  if (Array.isArray(entryFile))
    entryFile = entryFile[0]

  let buildIdentifier: undefined | string;
  if (typeof entryFile === 'string') {
    const {getPkgOfFile} = packageOfFileFactory();
    const pkg = getPkgOfFile(entryFile);
    if (pkg) {
      const path = Path.relative(config.resolve?.symlinks !== false ? pkg.realPath : pkg.path, entryFile);
      buildIdentifier = pkg.shortName + '_' + path.replace(/[\\/]/g, '_').replace(/\.[^.]*$/, '');
    }
  }
  log.info('entry', config.entry, 'buildIdentifier', buildIdentifier);
  return buildIdentifier;
}
