// tslint:disable:no-console
import _ from 'lodash';
import Path from 'path';
import fs from 'fs-extra';
import {Configuration, RuleSetRule, Compiler, RuleSetUseItem, RuleSetLoader} from 'webpack';
import { RawSource } from 'webpack-sources';
import {drawPuppy, printConfig, getCmdOptions} from './utils';
import {createLazyPackageFileFinder} from 'dr-comp-package/wfh/dist/package-utils';
import change4lib from './webpack-lib';
import {findPackage} from './build-target-helper';
import {ConfigHandlerMgr} from 'dr-comp-package/wfh/dist/config-handler';
import {ConfigureHandler} from './types';
import type {PlinkEnv} from 'dr-comp-package/wfh/dist/node-path';
// import chalk from 'chalk';
// const ProgressPlugin = require('webpack/lib/ProgressPlugin');


const findPackageByFile = createLazyPackageFileFinder();


export = function(webpackEnv: string) {

  drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${Path.resolve('/logs')}`);

  const cmdOption = getCmdOptions();
  // console.log('webpackEnv=', webpackEnv);
  // `npm run build` by default is in production mode, below hacks the way react-scripts does
  if (cmdOption.devMode || cmdOption.watch) {
    webpackEnv = 'development';
    console.log('[cra-scripts] Development mode is on:', webpackEnv);
  } else {
    process.env.GENERATE_SOURCEMAP = 'false';
  }
  const origWebpackConfig = require('react-scripts/config/webpack.config');
  const config: Configuration = origWebpackConfig(webpackEnv);
  // fs.mkdirpSync('logs');
  // fs.writeFile('logs/webpack.config.origin.debug.js', printConfig(config), (err) => {
  //   console.error(err);
  // });
  console.log(`[cra-scripts] output.publicPath: ${config.output!.publicPath}`);
  // Make sure babel compiles source folder out side of current src directory
  findAndChangeRule(config.module!.rules);
  insertLessLoaderRule(config.module!.rules);

  const foundPkg = findPackage(cmdOption.buildTarget);
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
  }
  const {dir, packageJson} = foundPkg;
  
  if (cmdOption.buildType === 'app') {
    // TODO: do not hard code
    config.resolve!.alias!['alias:dr.cra-start-entry'] = packageJson.name + '/' + packageJson.dr['cra-start-entry'];
    console.log(`[cra-scripts] alias:dr.cra-start-entry: ${config.resolve!.alias!['alias:dr.cra-start-entry']}`);
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
  Object.assign(config.optimization!.splitChunks, {
    chunks: 'all',
    // name: false, default is false for production
    cacheGroups: {
      lazyVendor: {
        name: 'lazy-vendor',
        chunks: 'async',
        enforce: true,
        test: /[\\/]node_modules[\\/]/, // TODO: exclude Dr package source file
        priority: 1
      }
    }
  });
  config.plugins!.push(new (class {
    apply(compiler: Compiler) {
      compiler.hooks.emit.tap('drcp-cli-stats', compilation => {
        const stats = compilation.getStats();
        compilation.assets['stats.json'] = new RawSource(JSON.stringify(stats.toJson('verbose')));
        setTimeout(() => {
          console.log('[cra-scripts] stats:');
          console.log(stats.toString('normal'));
          console.log('');
        }, 0);
        // const data = JSON.stringify(compilation.getStats().toJson('normal'));
        // compilation.assets['stats.json'] = new RawSource(data);
      });
    }
  })());

  // config.plugins!.push(new ProgressPlugin({ profile: true }));

  config.stats = 'normal'; // Not working

  const ssrConfig = (global as any).__SSR;
  if (ssrConfig) {
    ssrConfig(config);
  }

  if (cmdOption.buildType === 'lib')
    change4lib(cmdOption.buildTarget, config, nodePath);

  const configFileInPackage = Path.resolve(dir, _.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));
  if (fs.existsSync(configFileInPackage)) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ConfigureHandler>((cfgFile, result, handler) => {
      handler.webpack(config, webpackEnv, cmdOption);
    });
  }

  fs.mkdirpSync('logs');
  fs.writeFile('logs/webpack.config.debug.js', printConfig(config), (err) => {
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
        // console.log(chalk.redBright('' + i));
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
              const pk = findPackageByFile(resourcePath);
              return `${(pk ? pk.shortName : 'external')}/${url}`;
            }
          }
        };
      } else if ((typeof (rule as RuleSetRule | RuleSetLoader).loader) === 'string' &&
        (((rule as RuleSetRule | RuleSetLoader).loader as string).indexOf('file-loader') >= 0 ||
        ((rule as RuleSetRule | RuleSetLoader).loader as string).indexOf('url-loader') >= 0
        )) {
        ((set[i] as RuleSetRule | RuleSetLoader).options as any)!.outputPath = (url: string, resourcePath: string, context: string) => {
          const pk = findPackageByFile(resourcePath);
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

function createRuleTestFunc4Src(origTest: RuleSetRule['test'], appSrc: string) {
  return function testOurSourceFile(file: string)  {
    const pk = findPackageByFile(file);
    const yes = ((pk && pk.dr) || file.startsWith(appSrc)) &&
      (origTest instanceof RegExp) ? origTest.test(file) :
        (origTest instanceof Function ? origTest(file) : origTest === file);
    // console.log(`[webpack.config] babel-loader: ${file}`, yes);
    return yes;
  };
}
