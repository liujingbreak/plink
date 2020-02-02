// tslint:disable:no-console
import _ from 'lodash';
import Path from 'path';
import fs from 'fs-extra';
import {Configuration, RuleSetRule, Compiler} from 'webpack';
// import { RawSource } from 'webpack-sources';
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
import {drawPuppy, printConfig} from './utils';
import {createLazyPackageFileFinder} from 'dr-comp-package/wfh/dist/package-utils';
// import chalk from 'chalk';

const origWebpackConfig = require('react-scripts/config/webpack.config');

const findPackageByFile = createLazyPackageFileFinder();

export = function(webpackEnv: string) {
  drawPuppy('Pooing on create-react-app', `If you want to know how Webpack is configured, check:\n  ${Path.resolve('/logs')}\n  ${__filename}`);
  const config: Configuration = origWebpackConfig(webpackEnv);
  // Make sure babel compiles source folder out side of current src directory
  changeBabelLoader(config);

  // Remove ModulesScopePlugin from resolve plugins, it stops us using source fold out side of project directory
  if (config.resolve && config.resolve.plugins) {
    const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin');
    const srcScopePluginIdx = config.resolve.plugins.findIndex(plugin => plugin instanceof ModuleScopePlugin);
    if (srcScopePluginIdx >= 0) {
      config.resolve.plugins.splice(srcScopePluginIdx, 1);
    }
  }

  // Move project node_modules to first position in resolve order
  if (config.resolve && config.resolve.modules) {
    const topModuleDir = Path.resolve('node_modules');
    const pwdIdx = config.resolve.modules.findIndex(m => m === topModuleDir);
    if (pwdIdx > 0) {
      config.resolve.modules.splice(pwdIdx, 1);
    }
    config.resolve.modules.unshift(topModuleDir);
  }

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
      compiler.hooks.emit.tap('angular-cli-stats', compilation => {
        setTimeout(() => {
          console.log('');
          console.log(compilation.getStats().toString('normal'));
          console.log('');
        }, 100);
        // const data = JSON.stringify(compilation.getStats().toJson('normal'));
        // compilation.assets['stats.json'] = new RawSource(data);
      });
    }
  })());

  config.plugins!.push(new ProgressPlugin({ profile: true }));

  config.stats = 'normal'; // Not working

  const ssrConfig = (global as any).__SSR;
  if (ssrConfig) {
    ssrConfig(config);
  }

  fs.mkdirpSync('logs');
  fs.writeFile('logs/webpack.config.debug.js', printConfig(config), (err) => {
    // just for debug
  });
  return config;
};

function changeBabelLoader(config: Configuration) {
  const craPaths = require('react-scripts/config/paths');
  config.module!.rules.some(findAndChangeRule);

  function findAndChangeRule(rule: RuleSetRule) {
    // TODO: check in case CRA will use Rule.use instead of "loader"
    if (rule.include && typeof rule.loader === 'string' && rule.loader.indexOf(Path.sep + 'babel-loader' + Path.sep)) {
      delete rule.include;
      const origTest = rule.test;
      rule.test = (file) => {
        const pk = findPackageByFile(file);

        const yes = ((pk && pk.dr) || file.startsWith(craPaths.appSrc)) &&
          (origTest instanceof RegExp) ? origTest.test(file) :
            (origTest instanceof Function ? origTest(file) : origTest === file);
        // console.log(file, yes);
        return yes;
      };
      return true;
    } else if (rule.oneOf) {
      return rule.oneOf.some(findAndChangeRule);
    }
    return false;
  }
}


