/* tslint:disable no-console max-line-length max-classes-per-file */
import { AngularCompilerPlugin } from '@ngtools/webpack';
// import ts from 'typescript';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as Path from 'path';
import { isRegExp } from 'util';
import * as webpack from 'webpack';
import { Compiler } from 'webpack';
import api from '__api';
import TSReadHooker from './ng-ts-replace';
import { BuilderContext } from './ng/builder-context';
import { AngularCliParam } from './ng/common';
import ChunkInfoPlugin from './plugins/chunk-info';
import gzipSize from './plugins/gzip-size';
import { transformHtml } from './plugins/index-html-plugin';
import ReadHookHost from './utils/read-hook-vfshost';
const smUrl = require('source-map-url');
const log = require('log4js').getLogger('config-webpack');
import configDevServer from '@wfh/webpack-common/dist/devServer';
import chalk from 'chalk';
import memstats from '@wfh/plink/wfh/dist/utils/mem-stats';
import {WepackConfigHandler} from './configurable';
// import setupAssets from '@wfh/assets-processer/dist/dev-serve-assets';


export default async function changeWebpackConfig(context: BuilderContext, param: AngularCliParam, webpackConfig: webpack.Configuration,
  drcpConfigSetting: {devMode: boolean}) {
  // const api: typeof __api = require('__api'); // force to defer loading api until DRCP config is ready
  console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
  // webpackConfig.stats = 'verbose';
  // if (webpackConfig.resolve && webpackConfig.resolve.mainFields) {
  //   webpackConfig.resolve.mainFields = ['browser', 'main', 'module'];
  // }
  if (webpackConfig.plugins == null) {
    webpackConfig.plugins = [];
  }
  if (webpackConfig.devServer) {
    configDevServer(webpackConfig as {devServer: NonNullable<webpack.Configuration>['devServer']});
  }

  if (_.get(param, 'builderConfig.options.drcpArgs.report') ||
  param.browserOptions.drcpArgs.report ||(param.browserOptions.drcpArgs.openReport)) {
    webpackConfig.plugins.push(
      new ChunkInfoPlugin()
    );
  }

  const resolveModules = process.env.NODE_PATH!.split(Path.delimiter);
  if (webpackConfig.resolve == null)
    webpackConfig.resolve= {modules: resolveModules};
  else if (webpackConfig.resolve.modules == null)
    webpackConfig.resolve.modules = resolveModules;
  else
    webpackConfig.resolve.modules.unshift(...resolveModules);
  // webpackConfig.module.noParse = (file: string) => noParse.some(name => file.replace(/\\/g, '/').includes(name));

  // Change AngularCompilerPlugin's option
  const ngCompilerPlugin = webpackConfig.plugins.find((plugin: any) => {
    return (plugin instanceof AngularCompilerPlugin);
  }) as AngularCompilerPlugin;
  if (ngCompilerPlugin == null)
    throw new Error('Can not find AngularCompilerPlugin');
  // Hack angular/packages/ngtools/webpack/src/angular_compiler_plugin.ts !!!!
  // const transformers: ts.TransformerFactory<ts.SourceFile>[] = (ngCompilerPlugin as any)._transformers;
  // transformers.unshift((context) => {
  //   return (tsSrc) => {
  //     console.log('hellow:', tsSrc.fileName);
  //     return tsSrc;
  //   };
  // });
  (webpackConfig.plugins as any[]).unshift(new class {
    apply(compiler: Compiler) {
      const hooker = new TSReadHooker(param.browserOptions.tsConfig, param.browserOptions.preserveSymlinks);
      ngCompilerPlugin.options.host = new ReadHookHost((compiler as any).inputFileSystem, hooker.hookFunc);
      // Due to https://github.com/angular/angular-cli/pull/12969
      ngCompilerPlugin.options.directTemplateLoading = false;
      // TODO: Once Angular cli (v8.1.x) upgrades to allow changing directTemplateLoading, we should remove
      // below hack code.
      ((ngCompilerPlugin as any)._transformers as any[]).splice(0);
      (ngCompilerPlugin as any)._makeTransformers();
      compiler.hooks.watchRun.tapPromise('ts-read-hook', async () => {
        hooker.clear();
      });
      compiler.hooks.done.tapPromise('ts-read-hook', async () => {
        hooker.logFileCount();
        memstats();
      });
    }
  }());

  // webpackConfig.resolve.symlinks = false;

  if (param.browserOptions.statsJson) {
    log.warn('You have enbabled "statsJson: true" in Angular.json or Command line, it will generate a big file in output directory\n' +
      'Suggest you to remove it before deploy the whole output resource to somewhere, or you should disable this option,\n' +
      'cuz\' ng-app-builder will generate another stats.json file in its report directory for production mode');
  }

  if (!drcpConfigSetting.devMode) {
    console.log('Build in production mode');
    webpackConfig.plugins.push(
      new gzipSize(),
      new (class {
        apply(compiler: Compiler) {
          compiler.hooks.emit.tap('angular-cli-stats', compilation => {
            const data = JSON.stringify(compilation.getStats().toJson('verbose'));
            const reportFile = api.config.resolve('destDir', 'ng-app-builder.report', 'webpack-stats.json');
            fs.writeFile(reportFile, data,
              (err) => {
                if (err) return log.error(err);
                log.info(`Webpack compilation stats is written to ${reportFile}`);
            });
          });
      }})()
    );
  }
  if (webpackConfig.target !== 'node') {
    // Since Angular 8.1.0, there is no indexHtmlPlugin used in Webpack configuration
    // webpackConfig.plugins.push(new IndexHtmlPlugin({
    //     indexFile: Path.resolve(param.browserOptions.index),
    //     inlineChunkNames: ['runtime']
    //   }));
    webpackConfig.plugins.push(new (class DrcpBuilderAssetsPlugin {
      apply(compiler: Compiler) {
        compiler.hooks.emit.tapPromise('drcp-builder-assets', async compilation => {
          const assets: {[assetsPath: string]: any} = compilation.assets;
          for (const assetsPath of Object.keys(assets)) {
            // log.warn('is ', assetsPath);
            const match = /([^/.]+)(?:\.[^/.]+)*(\.js)$/.exec(assetsPath);
            if (!match)
              continue;
            // log.warn('lookup assets', match[1]);
            if (context.inlineAssets.has(match[1])) {
              context.inlineAssets.set(match[1], assets[assetsPath].source());
            }
          }
        });
      }
    })());
  } else {
    // This is condition of Server side rendering
    // Refer to angular-cli/packages/angular_devkit/build_angular/src/angular-cli-files/models/webpack-configs/server.ts
    if (param.browserOptions.bundleDependencies === 'none') {
      webpackConfig.externals = [
        /^@angular/,
        (_: any, request: any, callback: (error?: any, result?: any) => void) => {
        // Absolute & Relative paths are not externals
        if (/^\.{0,2}\//.test(request) || Path.isAbsolute(request)) {
          return callback();
        }
        try {
          // Attempt to resolve the module via Node
          const resolvedRequest = require.resolve(request);
          const comp = api.findPackageByFile(resolvedRequest);
          if (comp == null || comp.json.dr == null || comp.json.plink == null ) {
            // It's a node_module
            callback(null, request);
          } else if (comp != null && comp.longName === api.packageName &&
            resolvedRequest.indexOf(Path.sep + 'prerender.di') >= 0) {
              callback(null, request);
          } else {
            // It's a system thing (.ie util, fs...)
            callback();
          }
        } catch (e) {
          // Node couldn't find it, so it must be user-aliased
          callback();
        }
        }
      ];
      }
  }
  // webpackConfig.plugins.push(new CompileDonePlugin());

  changeSplitChunks(param, webpackConfig);
  changeLoaders(param, webpackConfig);

  if (param.ssr) {
    webpackConfig.devtool = 'source-map';
    Object.getPrototypeOf(api).ssr = param.ssr;
  }

  await api.config.configHandlerMgr().runEach<WepackConfigHandler>((file, lastResult, handler) => {
    if (handler.webpackConfig)
      return handler.webpackConfig(webpackConfig);
    return lastResult;
  });
  const wfname = api.config.resolve('destDir', 'ng-app-builder.report',
    `webpack-${param.ssr ? 'ssr' : 'browser'}.config.${++context.webpackRunCount}.js`);
  fs.writeFileSync(wfname, printConfig(webpackConfig));
  console.log(`If you are wondering what kind of Webapck config file is used internally, checkout ${chalk.blueBright(wfname)}`);
  return webpackConfig;
}

function changeLoaders(param: AngularCliParam, webpackConfig: webpack.Configuration) {
  // const noParse = (api.config.get([api.packageName, 'buildOptimizerExclude'], []) as string[]);
  // noParse.push(...api.config.get([api.packageName, 'build-optimizer:exclude'], []) as string[]);

  // const devMode = webpackConfig.mode === 'development';
  if (webpackConfig.resolveLoader == null) {
    webpackConfig.resolveLoader = {};
  }
  if (webpackConfig.resolveLoader.modules == null) {
    webpackConfig.resolveLoader.modules = [];
  }
  webpackConfig.resolveLoader.modules.unshift(
    ...process.env.NODE_PATH!.split(Path.delimiter),
    Path.join(__dirname, 'loaders'));
  if (!webpackConfig.module) {
    webpackConfig.module = {rules: []};
  }
  const rules = webpackConfig.module.rules as webpack.Rule[];
  let hasUrlLoader = false;
  let hasHtmlLoader = false;
  let fileLoaderRuleIdx: number | undefined;

  const urlLoaderRule = {
    test: /\.(jpg|png|gif)$/,
    use: [{
      loader: 'url-loader',
      options: {
        limit: 10000, // <10k ,use base64 format
        fallback: '@wfh/webpack2-builder/dist/loaders/dr-file-loader'
      }
    }]
  };
  const htmlLoaderRule = {
    test: /\.html$/,
    use: [
      {loader: 'raw-loader'}
    ]
  };
  rules.forEach((rule, ruleIdx) => {
    const test = rule.test;
    if (rule.use) {
      const idx = (rule.use as webpack.RuleSetLoader[]).findIndex(ruleSet => ruleSet.loader === 'postcss-loader');
      if (idx >= 0) {
        (rule.use as webpack.RuleSetLoader[]).splice(idx + 1, 0, {
          loader: 'css-url-loader'
        });
        // (rule.use as webpack.RuleSetLoader[]).push({loader: 'css-url-loader'});
      }
    }

    // Angular 8 doesn't have loader for HTML
    if (test instanceof RegExp && test.toString() === '/\\.html$/') {
      hasHtmlLoader = true;
      Object.keys(rule).forEach((key: string) => delete (rule as any)[key]);
      Object.assign(rule, htmlLoaderRule);
    } else if (rule.loader === 'file-loader') {
      fileLoaderRuleIdx = ruleIdx;
      Object.keys(rule).forEach((key: string) => delete (rule as any)[key]);
      Object.assign(rule, {
        test: /\.(eot|svg|cur|webp|otf|ttf|woff|woff2|ani)$/,
        use: [{loader: '@wfh/webpack2-builder/dist/loaders/dr-file-loader'}]
      });

    } else if (rule.loader === 'url-loader') {
      hasUrlLoader = true;
      Object.keys(rule).forEach((key: string) => delete (rule as any)[key]);
      Object.assign(rule, urlLoaderRule);
    } else if (test instanceof RegExp && test.toString().indexOf('\\.scss') >= 0 && rule.use) {
      const use = (rule.use as Array<{[key: string]: any, loader: string}>);
      const insertIdx = use.findIndex(item => item.loader === 'sass-loader');
      if (insertIdx < 0) {
        throw new Error('sass-loader is not found');
      }
      const needSourceMap = use[insertIdx].options.sourceMap;
      // resolve-url-loader: "source maps must be enabled on any preceding loader"
      // https://github.com/bholloway/resolve-url-loader
      use[insertIdx].options.sourceMap = true;
      use.splice(insertIdx, 0, {
        loader: 'resolve-url-loader',
        options: {
          sourceMap: needSourceMap
        }
      });
      // rule.use.push({loader: '@wfh/webpack2-builder/lib/debug-loader', options: {id: 'less loaders'}});
    } else if (test instanceof RegExp && test.toString() === '/\\.less$/' && rule.use) {
      for (const useItem of rule.use as webpack.RuleSetLoader[]) {
        if (useItem.loader === 'less-loader' && _.has(useItem, 'options.paths')) {
          delete (useItem.options as any).paths;
          break;
        }
      }
      // rule.use.push({loader: '@wfh/webpack2-builder/lib/debug-loader', options: {id: 'less loaders'}});
    }
  });

  if (!hasUrlLoader) {
    if (fileLoaderRuleIdx == null)
      throw new Error('Missing file-loader rule from Angular\'s Webpack config');
    console.log('Insert url-loader');
    rules.splice(fileLoaderRuleIdx + 1, 0, urlLoaderRule);
  }
  rules.unshift({
    // test: /\.(?:ngfactory\.js|component\.html)$/,
    test: file => {
      if (file.endsWith('.component.html'))
        return true;
      return !!api.findPackageByFile(file);
    },
    use: [{loader: '@wfh/ng-app-builder/dist/ng-aot-assets/ng-aot-assets-loader'}]
  });

  rules.unshift({
    oneOf: [
    {
      test: /\.jade$/,
      use: [
        {loader: 'html-loader', options: {attrs: 'img:src'}},
        {loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader')}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
        {loader: '@wfh/webpack2-builder/lib/jade-to-html-loader'}
      ]
    },
    {
      test: /\.md$/,
      use: [
        {loader: 'html-loader', options: {attrs: 'img:src'}},
        {loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader')}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
        {loader: '@wfh/webpack2-builder/lib/markdown-loader'}
      ]
    },
    {
      test: /\.txt$/,
      use: {loader: 'raw-loader'}
    }, {
      test: /\.(yaml|yml)$/,
      use: [
        {loader: 'json-loader'},
        {loader: 'yaml-loader'}
      ]
    }]
  });

  if (!hasHtmlLoader) {
    rules[0].oneOf && rules[0].oneOf.push(htmlLoaderRule);
  }
}

// function notAngularJs(file: string) {
// 	if (!file.endsWith('.js') || file.endsWith('.ngfactory.js') || file.endsWith('.ngstyle.js'))
// 		return false;
// 	if (noParse.some(name => file.replace(/\\/g, '/').includes(name)))
// 		return false;
// 	// const pk = api.findPackageByFile(file);
// 	// if (pk && pk.dr) {
// 	// 	return true;
// 	// }
// 	console.log('babel: ', file);
// 	return true;
// }

function changeSplitChunks(param: AngularCliParam, webpackConfig: any) {
  if (webpackConfig.optimization == null)
    return; // SSR' Webpack config does not has this property
  const oldVendorTestFunc = _.get(webpackConfig, 'optimization.splitChunks.cacheGroups.vendor.test');

  if (oldVendorTestFunc) {
    const cacheGroups: {[key: string]: webpack.Options.CacheGroupsOptions} = webpackConfig.optimization.splitChunks.cacheGroups;
    cacheGroups.vendor.test = vendorTest;
    cacheGroups.lazyVendor = {
      name: 'lazy-vendor',
      chunks: 'async',
      enforce: true,
      test: vendorTest,
      priority: 1
    };
  }

  function vendorTest(module: any, chunks: Array<{ name: string }>) {
    const maybeVendor = oldVendorTestFunc(module, chunks);
    if (!maybeVendor)
      return false;
    const resource = module.nameForCondition ? module.nameForCondition() : '';
    // console.log(`vendor test, resource: ${resource}, chunks: ${chunks.map( c => c.name)}`);
    const pk = api.findPackageByFile(resource);
    return pk == null || pk.json.dr == null || pk.json.plink == null;
  }
}

function printConfig(c: any, level = 0): string {
  var indent = _.repeat('  ', level);
  var out = '{\n';
  _.forOwn(c, (value: any, prop: string) => {
    out += indent + `  ${JSON.stringify(prop)}: ${printConfigValue(value, level)},\n`;
  });
  out += indent + '}';
  return out;
}

function printConfigValue(value: any, level: number): string {
  var out = '';
  var indent = _.repeat('  ', level);
  if (_.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
    out += JSON.stringify(value) + '';
  } else if (Array.isArray(value)) {
    out += '[\n';
    (value as any[]).forEach((row: any) => {
      out += indent + '    ' + printConfigValue(row, level + 1);
      out += ',\n';
    });
    out += indent + '  ]';
  } else if (_.isFunction(value)) {
    out += value.name + '()';
  } else if (isRegExp(value)) {
    out += `${value.toString()}`;
  } else if (_.isObject(value)) {
    const proto = Object.getPrototypeOf(value);
    if (proto && proto.constructor !== Object) {
      out += `new ${proto.constructor.name}()`;
    } else {
      out += printConfig(value, level + 1);
    }
  } else {
    out += ' unknown';
  }
  return out;
}

export async function transformIndexHtml(context: BuilderContext, content: string) {
  try {
    return transformHtml(content, context.ngBuildOption.browserOptions, srcUrl => {
      const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
      if (match && context.inlineAssets.has(match[1])) {
        const source = context.inlineAssets.get(match[1]);
        return smUrl.removeFrom(source!);
      }
      return null;
    });
  } catch (e) {
    log.error(e);
    throw e;
  }
}

