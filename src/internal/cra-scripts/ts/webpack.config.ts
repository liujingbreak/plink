// tslint:disable:no-console
import { ConfigHandlerMgr } from '@wfh/plink/wfh/dist/config-handler';
import type { PlinkEnv } from '@wfh/plink/wfh/dist/node-path';
import setupSplitChunks from '@wfh/webpack-common/dist/splitChunks';
import { Options as TsLoaderOpts } from '@wfh/webpack-common/dist/ts-loader';
import fs from 'fs-extra';
import _ from 'lodash';
// import walkPackagesAndSetupInjector from './injector-setup';
import log4js from 'log4js';
import Path from 'path';
import { Configuration, RuleSetLoader, RuleSetRule, RuleSetUseItem } from 'webpack';
import api from '__api';
// import { findPackage } from './build-target-helper';
import { ReactScriptsHandler } from './types';
import { drawPuppy, getCmdOptions, printConfig } from './utils';
// import {createLazyPackageFileFinder} from '@wfh/plink/wfh/dist/package-utils';
import change4lib from './webpack-lib';
import * as _craPaths from './cra-scripts-paths';

const log = log4js.getLogger('cra-scripts');
const {nodePath, rootDir} = JSON.parse(process.env.__plink!) as PlinkEnv;

export = function(webpackEnv: 'production' | 'development') {
  drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check: ${api.config.resolve('destDir', 'cra-scripts.report')}`);
  console.log('process.env.PUBLIC_URL=', process.env.PUBLIC_URL);

  const cmdOption = getCmdOptions();
  log.info('webpackEnv =', webpackEnv);
  // `npm run build` by default is in production mode, below hacks the way react-scripts does
  // if (cmdOption.devMode || cmdOption.watch) {
  //   webpackEnv = 'development';
  //   log.info('[cra-scripts] Development mode is on:', webpackEnv);
  // } else {
  //   process.env.GENERATE_SOURCEMAP = 'false';
  // }
  const origWebpackConfig = require('react-scripts/config/webpack.config');

  process.env.INLINE_RUNTIME_CHUNK = 'true';

  const {default: craPaths, configFileInPackage}: typeof _craPaths = require('./cra-scripts-paths');

  const config: Configuration = origWebpackConfig(webpackEnv);
  if (webpackEnv === 'production') {
    // Try to workaround create-react-app issue: default InlineChunkPlugin 's test property does not match 
    // runtime chunk file name
    config.output!.filename = 'static/js/[name]-[contenthash:8].js';
    config.output!.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
    config.output!.devtoolModuleFilenameTemplate =
      info => Path.relative(rootDir, info.absoluteResourcePath).replace(/\\/g, '/');
  } else {
    config.output!.filename = 'static/js/[name].js';
    config.output!.chunkFilename = 'static/js/[name].chunk.js';
  }

  const reportDir = api.config.resolve('destDir', 'cra-scripts.report');
  fs.mkdirpSync(reportDir);
  fs.writeFile(Path.resolve(reportDir, 'webpack.config.cra.js'), printConfig(config), (err) => {
    if (err)
      log.error('Failed to write ' + Path.resolve(reportDir, 'webpack.config.cra.js'), err);
  });

  // Make sure babel compiles source folder out side of current src directory
  findAndChangeRule(config.module!.rules);
  replaceSassLoader(config.module!.rules);

  const myTsLoaderOpts: TsLoaderOpts = {
    tsConfigFile: Path.resolve('tsconfig.json'),
    injector: api.browserInjector,
    compileExpContex: file => {
      const pkg = api.findPackageByFile(file);
      if (pkg) {
        return {__api: api.getNodeApiForPackage(pkg)};
      } else {
        return {};
      }
    }
  };
  config.module!.rules.push({
    test: createRuleTestFunc4Src(/\.[jt]sx?$/),
    enforce: 'pre',
    use: {
      options: myTsLoaderOpts,
      loader: require.resolve('@wfh/webpack-common/dist/ts-loader')
    }
  });
  insertLessLoaderRule(config.module!.rules);

  // const foundPkg = findPackage(cmdOption.buildTarget);
  // if (foundPkg == null) {
  //   throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
  // }
  // const {dir, packageJson} = foundPkg;

  if (cmdOption.buildType === 'app') {
    // TODO: do not hard code
    // config.resolve!.alias!['alias:dr.cra-app-entry'] = packageJson.name + '/' + packageJson.dr['cra-app-entry'];
    // log.info(`[cra-scripts] alias:dr.cra-app-entry: ${config.resolve!.alias!['alias:dr.cra-app-entry']}`);
    config.output!.path = craPaths().appBuild;
    // config.devtool = 'source-map';
  }


  // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
  if (config.resolve && config.resolve.plugins) {
    const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
    const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
    if (srcScopePluginIdx >= 0) {
      config.resolve.plugins.splice(srcScopePluginIdx, 1);
    }
  }

  const resolveModules = ['node_modules', ...nodePath];
  config.resolve!.modules = resolveModules;

  Object.assign(config.resolve!.alias, require('rxjs/_esm2015/path-mapping')());
  // config.plugins!.push(new (class {
  //   apply(compiler: Compiler) {
  //     compiler.hooks.emit.tap('drcp-cli-stats', compilation => {
  //       const stats = compilation.getStats();
  //       compilation.assets['stats.json'] = new RawSource(JSON.stringify(stats.toJson('verbose')));
  //       setTimeout(() => {
  //         log.info('[cra-scripts] stats:');
  //         log.info(stats.toString('normal'));
  //         log.info('');
  //       }, 0);
  //     });
  //   }
  // })());

  // config.plugins!.push(new ProgressPlugin({ profile: true }));

  config.stats = 'normal'; // Not working

  if (cmdOption.buildType === 'lib') {
    change4lib(cmdOption.buildTarget, config, nodePath);
  } else {
    setupSplitChunks(config, (mod) => {
      const file = mod.nameForCondition ? mod.nameForCondition() : null;
      if (file == null)
        return true;
      const pkg = api.findPackageByFile(file);
      return pkg == null;
    });
  }

  api.config.configHandlerMgr().runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.webpack != null) {
      log.info('Execute command line Webpack configuration overrides', cfgFile);
      handler.webpack(config, webpackEnv, cmdOption);
    }
  });

  if (configFileInPackage) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.webpack != null) {
        log.info('Execute Webpack configuration overrides from ', cfgFile);
        handler.webpack(config, webpackEnv, cmdOption);
      }
    });
  }
  log.info(`[cra-scripts] output.publicPath: ${config.output!.publicPath}`);
  fs.writeFileSync(Path.resolve(reportDir, 'webpack.config.plink.js'), printConfig(config));
  return config;
};

function insertLessLoaderRule(origRules: RuleSetRule[]): void {
  const oneOf = origRules.find(rule => rule.oneOf)?.oneOf!;
  // 1. let's take rules for css as a template
  const cssRuleUse = oneOf.find(subRule => subRule.test instanceof RegExp &&
    (subRule.test as RegExp).source === '\\.css$')?.use as RuleSetUseItem[];

  const cssModuleRuleUse = oneOf.find(subRule => subRule.test instanceof RegExp &&
    (subRule.test as RegExp).source === '\\.module\\.css$')?.use as RuleSetUseItem[];

  const lessModuleRule: RuleSetRule = {
    test: /\.module\.less$/,
    use: createLessRuleUse(cssModuleRuleUse),
    sideEffects: true
  };

  const lessRule: RuleSetRule = {
    test: /\.less$/,
    // exclude: /\.module\.less$/,
    use: createLessRuleUse(cssRuleUse),
    sideEffects: true
  };

  // Insert at last 2nd position, right before file-loader
  oneOf.splice(oneOf.length -2, 0, lessModuleRule, lessRule);

  function createLessRuleUse(useItems: RuleSetUseItem[]) {
    return useItems.map(useItem => {
      if (typeof useItem === 'string' || typeof useItem === 'function') {
        return useItem;
      }
      let newUseItem: RuleSetLoader = {...useItem};
      if (useItem.loader && /[\\/]css\-loader[\\/]/.test(useItem.loader)) {
        newUseItem.options = {
          ...(newUseItem.options as any || {}),
          importLoaders: 2
        };
      }
      return newUseItem;
    }).concat('less-loader');
  }
}

const fileLoaderOptions = {
  // esModule: false,
  outputPath(url: string, resourcePath: string, context: string) {
    const pk = api.findPackageByFile(resourcePath);
    return `${(pk ? pk.shortName : 'external')}/${url}`;
  }
};

function findAndChangeRule(rules: RuleSetRule[]): void {
  const craPaths = require('react-scripts/config/paths');
  // TODO: check in case CRA will use Rule.use instead of "loader"
  checkSet(rules);
  for (const rule of rules) {
    if (Array.isArray(rule.use)) {
      checkSet(rule.use);

    } else if (Array.isArray(rule.loader)) {
        checkSet(rule.loader);
    } else if (rule.oneOf) {
      insertRawLoader(rule.oneOf);
      return findAndChangeRule(rule.oneOf);
    }
  }

  function checkSet(set: (RuleSetRule | RuleSetUseItem)[]) {
    for (let i = 0; i < set.length ; i++) {
      const rule = set[i];
      if (typeof rule === 'string' && (rule.indexOf('file-loader') >= 0 || rule.indexOf('url-loader') >= 0)) {
        set[i] = {
          loader: rule,
          options: fileLoaderOptions
        };
      } else if ((typeof (rule as RuleSetRule | RuleSetLoader).loader) === 'string' &&
        (((rule as RuleSetRule | RuleSetLoader).loader as string).indexOf('file-loader') >= 0 ||
        ((rule as RuleSetRule | RuleSetLoader).loader as string).indexOf('url-loader') >= 0
        )) {
          if ((rule as RuleSetRule | RuleSetLoader).options) {
            Object.assign((rule as RuleSetRule | RuleSetLoader).options, fileLoaderOptions);
          } else {
            (rule as RuleSetRule | RuleSetLoader).options = fileLoaderOptions;
          }
      }


      const _rule = rule as RuleSetRule;

      if (_rule.include && typeof _rule.loader === 'string' &&
        (rule as RuleSetLoader).loader!.indexOf(Path.sep + 'babel-loader' + Path.sep) >= 0) {
        delete _rule.include;
        _rule.test = createRuleTestFunc4Src(_rule.test, craPaths.appSrc);
      }
      if (_rule.test && _rule.test.toString() === '/\.(js|mjs|jsx|ts|tsx)$/' &&
        _rule.include) {
          delete _rule.include;
          _rule.test = createRuleTestFunc4Src(_rule.test, craPaths.appSrc);
      }
    }
  }
  return;
}

function createRuleTestFunc4Src(origTest: RuleSetRule['test'], appSrc?: string) {
  return function testOurSourceFile(file: string)  {
    const pk = api.findPackageByFile(file);
    const yes = ((pk && pk.dr) || (appSrc && file.startsWith(appSrc))) &&
      (origTest instanceof RegExp) ? origTest.test(file) :
        (origTest instanceof Function ? origTest(file) : origTest === file);
    // log.info(`[webpack.config] babel-loader: ${file}`, yes);
    return yes;
  };
}

function insertRawLoader(rules: RuleSetRule[]) {
  const htmlLoaderRule = {
    test: /\.html$/,
    use: [
      {loader: 'raw-loader'}
    ]
  };
  rules.push(htmlLoaderRule);
}

/** To support Material-component-web */
function replaceSassLoader(rules: RuleSetRule[]) {
  const oneOf = rules.find(rule => rule.oneOf)?.oneOf!;
  oneOf.filter(subRule => Array.isArray(subRule.use))
    .forEach(subRule => {
      const useItem = (subRule.use as RuleSetLoader[])
      .find(useItem => useItem.loader && /sass-loader/.test(useItem.loader));
      if (useItem != null) {
        useItem.options = {
          implementation: require('sass'),
          webpackImporter: false,
          sourceMap: true,
          sassOptions: {
            includePaths: ['node_modules', ...nodePath]
          }
        };
      }
    });
}
