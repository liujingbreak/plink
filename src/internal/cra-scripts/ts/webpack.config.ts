// tslint:disable:no-console
import _ from 'lodash';
import Path from 'path';
import fs from 'fs-extra';
import {Configuration, RuleSetRule, Compiler, RuleSetUseItem, RuleSetLoader} from 'webpack';
import { RawSource } from 'webpack-sources';
import {drawPuppy, printConfig, getCmdOptions} from './utils';
// import {createLazyPackageFileFinder} from '@wfh/plink/wfh/dist/package-utils';
import change4lib from './webpack-lib';
import {findPackage} from './build-target-helper';
import {ConfigHandlerMgr} from '@wfh/plink/wfh/dist/config-handler';
import {ReactScriptsHandler} from './types';
import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import {Options as TsLoaderOpts} from '@wfh/webpack-common/dist/ts-loader';
import setupSplitChunks from '@wfh/webpack-common/dist/splitChunks';
// import walkPackagesAndSetupInjector from './injector-setup';
import log4js from 'log4js';
import api from '__api';

const log = log4js.getLogger('cra-scripts');
// import chalk from 'chalk';
// const ProgressPlugin = require('webpack/lib/ProgressPlugin');


// const findPackageByFile = createLazyPackageFileFinder();
// let api: ReturnType<typeof walkPackagesAndSetupInjector>;

export = function(webpackEnv: 'production' | 'development') {
  drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check: ${Path.resolve('/logs')}`);
  // api = walkPackagesAndSetupInjector(false);

  const cmdOption = getCmdOptions();
  log.info('webpackEnv=', webpackEnv);
  // `npm run build` by default is in production mode, below hacks the way react-scripts does
  if (cmdOption.devMode || cmdOption.watch) {
    webpackEnv = 'development';
    log.info('[cra-scripts] Development mode is on:', webpackEnv);
  } else {
    process.env.GENERATE_SOURCEMAP = 'false';
  }
  const origWebpackConfig = require('react-scripts/config/webpack.config');

  process.env.INLINE_RUNTIME_CHUNK = 'true';

  const config: Configuration = origWebpackConfig(webpackEnv);
  if (webpackEnv === 'production') {
    // Try to workaround create-react-app issue: default InlineChunkPlugin 's test property does not match 
    // runtime chunk file name
    config.output!.filename = 'static/js/[name]-[contenthash:8].js';
    config.output!.chunkFilename = 'static/js/[name]-[contenthash:8].chunk.js';
  }

  fs.mkdirpSync('logs');
  fs.writeFile('logs/webpack.config.cra.js', printConfig(config), (err) => {
    console.error(err);
  });

  log.info(`[cra-scripts] output.publicPath: ${config.output!.publicPath}`);
  // Make sure babel compiles source folder out side of current src directory
  findAndChangeRule(config.module!.rules);

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

  const foundPkg = findPackage(cmdOption.buildTarget);
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
  }
  const {dir, packageJson} = foundPkg;

  if (cmdOption.buildType === 'app') {
    // TODO: do not hard code
    config.resolve!.alias!['alias:dr.cra-start-entry'] = packageJson.name + '/' + packageJson.dr['cra-start-entry'];
    log.info(`[cra-scripts] alias:dr.cra-start-entry: ${config.resolve!.alias!['alias:dr.cra-start-entry']}`);
    config.output!.path = api.config.resolve('staticDir');
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

  const {nodePath} = JSON.parse(process.env.__plink!) as PlinkEnv;

  const resolveModules = ['node_modules', ...nodePath];
  config.resolve!.modules = resolveModules;

  Object.assign(config.resolve!.alias, require('rxjs/_esm2015/path-mapping')());
  config.plugins!.push(new (class {
    apply(compiler: Compiler) {
      compiler.hooks.emit.tap('drcp-cli-stats', compilation => {
        const stats = compilation.getStats();
        compilation.assets['stats.json'] = new RawSource(JSON.stringify(stats.toJson('verbose')));
        setTimeout(() => {
          log.info('[cra-scripts] stats:');
          log.info(stats.toString('normal'));
          log.info('');
        }, 0);
        // const data = JSON.stringify(compilation.getStats().toJson('normal'));
        // compilation.assets['stats.json'] = new RawSource(data);
      });
    }
  })());

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
    log.info('Execute command line Webpack configuration overrides', cfgFile);
    handler.webpack(config, webpackEnv, cmdOption);
  });
  const configFileInPackage = Path.resolve(dir, _.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));

  if (fs.existsSync(configFileInPackage)) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      log.info('Execute Webpack configuration overrides from ', cfgFile);
      handler.webpack(config, webpackEnv, cmdOption);
    });
  }

  fs.writeFile('logs/webpack.config.plink.js', printConfig(config), (err) => {
    if (err)
      console.error(err);
  });
  return config;
};

function insertLessLoaderRule(origRules: RuleSetRule[]): void {
  const rulesAndParents: [RuleSetRule, number, RuleSetRule[]][] = origRules.map((rule, idx, set) => [rule, idx, set]);

  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < rulesAndParents.length; i++) {
    const rule = rulesAndParents[i][0];
    const parentRules = rulesAndParents[i][2];
    const idx = rulesAndParents[i][1];
    if (rule.test) {
      if (rule.test.toString() === '/\\.(scss|sass)$/') {
        const use = rule.use as RuleSetLoader[];
        const postCss = use.find(item => item.loader && item.loader.indexOf('postcss-loader') >= 0);
        // log.info(chalk.redBright('' + i));
        parentRules.splice(idx, 0,
          createLessLoaderRule(postCss!));
        break;
      }
    } else if (rule.oneOf) {
      rule.oneOf.forEach((r, idx, list) => {
        rulesAndParents.push([r, idx, list]);
      });
    }
  }
}

function createLessLoaderRule(postCssLoaderRule: RuleSetUseItem): RuleSetRule {
  return {
    test: /\.less$/,
    use: [
      require.resolve('style-loader'),
      {
        loader: require.resolve('css-loader'),
        options: {
          importLoaders: 2,
          sourceMap: process.env.GENERATE_SOURCEMAP !== 'false'
        }
      },
      postCssLoaderRule,
      {
        loader: 'less-loader'
      }
    ]
  };
}

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
          options: {
            outputPath(url: string, resourcePath: string, context: string) {
              const pk = api.findPackageByFile(resourcePath);
              return `${(pk ? pk.shortName : 'external')}/${url}`;
            }
          }
        };
      } else if ((typeof (rule as RuleSetRule | RuleSetLoader).loader) === 'string' &&
        (((rule as RuleSetRule | RuleSetLoader).loader as string).indexOf('file-loader') >= 0 ||
        ((rule as RuleSetRule | RuleSetLoader).loader as string).indexOf('url-loader') >= 0
        )) {
        ((set[i] as RuleSetRule | RuleSetLoader).options as any)!.outputPath = (url: string, resourcePath: string, context: string) => {
          const pk = api.findPackageByFile(resourcePath);
          return `${(pk ? pk.shortName : 'external')}/${url}`;
        };
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
