"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformIndexHtml = void 0;
/* tslint:disable no-console max-line-length max-classes-per-file */
const webpack_1 = require("@ngtools/webpack");
// import ts from 'typescript';
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const util_1 = require("util");
const __api_1 = __importDefault(require("__api"));
const ng_ts_replace_1 = __importDefault(require("./ng-ts-replace"));
const chunk_info_1 = __importDefault(require("./plugins/chunk-info"));
const gzip_size_1 = __importDefault(require("./plugins/gzip-size"));
const index_html_plugin_1 = require("./plugins/index-html-plugin");
const read_hook_vfshost_1 = __importDefault(require("./utils/read-hook-vfshost"));
const smUrl = require('source-map-url');
const log = require('log4js').getLogger('config-webpack');
const devServer_1 = __importDefault(require("@wfh/webpack-common/dist/devServer"));
const chalk_1 = __importDefault(require("chalk"));
const mem_stats_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
// import setupAssets from '@wfh/assets-processer/dist/dev-serve-assets';
function changeWebpackConfig(context, param, webpackConfig, drcpConfigSetting) {
    return __awaiter(this, void 0, void 0, function* () {
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
            devServer_1.default(webpackConfig);
        }
        if (_.get(param, 'builderConfig.options.drcpArgs.report') ||
            param.browserOptions.drcpArgs.report || (param.browserOptions.drcpArgs.openReport)) {
            webpackConfig.plugins.push(new chunk_info_1.default());
        }
        const resolveModules = process.env.NODE_PATH.split(Path.delimiter);
        if (webpackConfig.resolve == null)
            webpackConfig.resolve = { modules: resolveModules };
        else if (webpackConfig.resolve.modules == null)
            webpackConfig.resolve.modules = resolveModules;
        else
            webpackConfig.resolve.modules.unshift(...resolveModules);
        // webpackConfig.module.noParse = (file: string) => noParse.some(name => file.replace(/\\/g, '/').includes(name));
        // Change AngularCompilerPlugin's option
        const ngCompilerPlugin = webpackConfig.plugins.find((plugin) => {
            return (plugin instanceof webpack_1.AngularCompilerPlugin);
        });
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
        webpackConfig.plugins.unshift(new class {
            apply(compiler) {
                const hooker = new ng_ts_replace_1.default(param.browserOptions.tsConfig, param.browserOptions.preserveSymlinks);
                ngCompilerPlugin.options.host = new read_hook_vfshost_1.default(compiler.inputFileSystem, hooker.hookFunc);
                // Due to https://github.com/angular/angular-cli/pull/12969
                ngCompilerPlugin.options.directTemplateLoading = false;
                // TODO: Once Angular cli (v8.1.x) upgrades to allow changing directTemplateLoading, we should remove
                // below hack code.
                ngCompilerPlugin._transformers.splice(0);
                ngCompilerPlugin._makeTransformers();
                compiler.hooks.watchRun.tapPromise('ts-read-hook', () => __awaiter(this, void 0, void 0, function* () {
                    hooker.clear();
                }));
                compiler.hooks.done.tapPromise('ts-read-hook', () => __awaiter(this, void 0, void 0, function* () {
                    hooker.logFileCount();
                    mem_stats_1.default();
                }));
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
            webpackConfig.plugins.push(new gzip_size_1.default(), new (class {
                apply(compiler) {
                    compiler.hooks.emit.tap('angular-cli-stats', compilation => {
                        const data = JSON.stringify(compilation.getStats().toJson('verbose'));
                        const reportFile = __api_1.default.config.resolve('destDir', 'ng-app-builder.report', 'webpack-stats.json');
                        fs.writeFile(reportFile, data, (err) => {
                            if (err)
                                return log.error(err);
                            log.info(`Webpack compilation stats is written to ${reportFile}`);
                        });
                    });
                }
            })());
        }
        if (webpackConfig.target !== 'node') {
            // Since Angular 8.1.0, there is no indexHtmlPlugin used in Webpack configuration
            // webpackConfig.plugins.push(new IndexHtmlPlugin({
            //     indexFile: Path.resolve(param.browserOptions.index),
            //     inlineChunkNames: ['runtime']
            //   }));
            webpackConfig.plugins.push(new (class DrcpBuilderAssetsPlugin {
                apply(compiler) {
                    compiler.hooks.emit.tapPromise('drcp-builder-assets', (compilation) => __awaiter(this, void 0, void 0, function* () {
                        const assets = compilation.assets;
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
                    }));
                }
            })());
        }
        else {
            // This is condition of Server side rendering
            // Refer to angular-cli/packages/angular_devkit/build_angular/src/angular-cli-files/models/webpack-configs/server.ts
            if (param.browserOptions.bundleDependencies === 'none') {
                webpackConfig.externals = [
                    /^@angular/,
                    (_, request, callback) => {
                        // Absolute & Relative paths are not externals
                        if (/^\.{0,2}\//.test(request) || Path.isAbsolute(request)) {
                            return callback();
                        }
                        try {
                            // Attempt to resolve the module via Node
                            const resolvedRequest = require.resolve(request);
                            const comp = __api_1.default.findPackageByFile(resolvedRequest);
                            if (comp == null || comp.dr == null) {
                                // It's a node_module
                                callback(null, request);
                            }
                            else if (comp != null && comp.longName === __api_1.default.packageName &&
                                resolvedRequest.indexOf(Path.sep + 'prerender.di') >= 0) {
                                callback(null, request);
                            }
                            else {
                                // It's a system thing (.ie util, fs...)
                                callback();
                            }
                        }
                        catch (e) {
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
            Object.getPrototypeOf(__api_1.default).ssr = param.ssr;
        }
        yield __api_1.default.config.configHandlerMgr().runEach((file, lastResult, handler) => {
            if (handler.webpackConfig)
                return handler.webpackConfig(webpackConfig);
            return lastResult;
        });
        const wfname = __api_1.default.config.resolve('destDir', 'ng-app-builder.report', `webpack-${param.ssr ? 'ssr' : 'browser'}.config.${++context.webpackRunCount}.js`);
        fs.writeFileSync(wfname, printConfig(webpackConfig));
        console.log(`If you are wondering what kind of Webapck config file is used internally, checkout ${chalk_1.default.blueBright(wfname)}`);
        return webpackConfig;
    });
}
exports.default = changeWebpackConfig;
function changeLoaders(param, webpackConfig) {
    // const noParse = (api.config.get([api.packageName, 'buildOptimizerExclude'], []) as string[]);
    // noParse.push(...api.config.get([api.packageName, 'build-optimizer:exclude'], []) as string[]);
    // const devMode = webpackConfig.mode === 'development';
    if (webpackConfig.resolveLoader == null) {
        webpackConfig.resolveLoader = {};
    }
    if (webpackConfig.resolveLoader.modules == null) {
        webpackConfig.resolveLoader.modules = [];
    }
    webpackConfig.resolveLoader.modules.unshift(...process.env.NODE_PATH.split(Path.delimiter), Path.join(__dirname, 'loaders'));
    if (!webpackConfig.module) {
        webpackConfig.module = { rules: [] };
    }
    const rules = webpackConfig.module.rules;
    let hasUrlLoader = false;
    let hasHtmlLoader = false;
    let fileLoaderRuleIdx;
    const urlLoaderRule = {
        test: /\.(jpg|png|gif)$/,
        use: [{
                loader: 'url-loader',
                options: {
                    limit: 10000,
                    fallback: '@wfh/webpack2-builder/dist/loaders/dr-file-loader'
                }
            }]
    };
    const htmlLoaderRule = {
        test: /\.html$/,
        use: [
            { loader: 'raw-loader' }
        ]
    };
    rules.forEach((rule, ruleIdx) => {
        const test = rule.test;
        if (rule.use) {
            const idx = rule.use.findIndex(ruleSet => ruleSet.loader === 'postcss-loader');
            if (idx >= 0) {
                rule.use.splice(idx + 1, 0, {
                    loader: 'css-url-loader'
                });
                // (rule.use as webpack.RuleSetLoader[]).push({loader: 'css-url-loader'});
            }
        }
        // Angular 8 doesn't have loader for HTML
        if (test instanceof RegExp && test.toString() === '/\\.html$/') {
            hasHtmlLoader = true;
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, htmlLoaderRule);
        }
        else if (rule.loader === 'file-loader') {
            fileLoaderRuleIdx = ruleIdx;
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test: /\.(eot|svg|cur|webp|otf|ttf|woff|woff2|ani)$/,
                use: [{ loader: '@wfh/webpack2-builder/dist/loaders/dr-file-loader' }]
            });
        }
        else if (rule.loader === 'url-loader') {
            hasUrlLoader = true;
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, urlLoaderRule);
        }
        else if (test instanceof RegExp && test.toString().indexOf('\\.scss') >= 0 && rule.use) {
            const use = rule.use;
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
        }
        else if (test instanceof RegExp && test.toString() === '/\\.less$/' && rule.use) {
            for (const useItem of rule.use) {
                if (useItem.loader === 'less-loader' && _.has(useItem, 'options.paths')) {
                    delete useItem.options.paths;
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
            return !!__api_1.default.findPackageByFile(file);
        },
        use: [{ loader: '@wfh/ng-app-builder/dist/ng-aot-assets/ng-aot-assets-loader' }]
    });
    rules.unshift({
        oneOf: [
            {
                test: /\.jade$/,
                use: [
                    { loader: 'html-loader', options: { attrs: 'img:src' } },
                    { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
                    { loader: '@wfh/webpack2-builder/lib/jade-to-html-loader' }
                ]
            },
            {
                test: /\.md$/,
                use: [
                    { loader: 'html-loader', options: { attrs: 'img:src' } },
                    { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
                    { loader: '@wfh/webpack2-builder/lib/markdown-loader' }
                ]
            },
            {
                test: /\.txt$/,
                use: { loader: 'raw-loader' }
            }, {
                test: /\.(yaml|yml)$/,
                use: [
                    { loader: 'json-loader' },
                    { loader: 'yaml-loader' }
                ]
            }
        ]
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
function changeSplitChunks(param, webpackConfig) {
    if (webpackConfig.optimization == null)
        return; // SSR' Webpack config does not has this property
    const oldVendorTestFunc = _.get(webpackConfig, 'optimization.splitChunks.cacheGroups.vendor.test');
    if (oldVendorTestFunc) {
        const cacheGroups = webpackConfig.optimization.splitChunks.cacheGroups;
        cacheGroups.vendor.test = vendorTest;
        cacheGroups.lazyVendor = {
            name: 'lazy-vendor',
            chunks: 'async',
            enforce: true,
            test: vendorTest,
            priority: 1
        };
    }
    function vendorTest(module, chunks) {
        const maybeVendor = oldVendorTestFunc(module, chunks);
        if (!maybeVendor)
            return false;
        const resource = module.nameForCondition ? module.nameForCondition() : '';
        // console.log(`vendor test, resource: ${resource}, chunks: ${chunks.map( c => c.name)}`);
        const pk = __api_1.default.findPackageByFile(resource);
        return pk == null || pk.dr == null;
    }
}
function printConfig(c, level = 0) {
    var indent = _.repeat('  ', level);
    var out = '{\n';
    _.forOwn(c, (value, prop) => {
        out += indent + `  ${JSON.stringify(prop)}: ${printConfigValue(value, level)},\n`;
    });
    out += indent + '}';
    return out;
}
function printConfigValue(value, level) {
    var out = '';
    var indent = _.repeat('  ', level);
    if (_.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
        out += JSON.stringify(value) + '';
    }
    else if (Array.isArray(value)) {
        out += '[\n';
        value.forEach((row) => {
            out += indent + '    ' + printConfigValue(row, level + 1);
            out += ',\n';
        });
        out += indent + '  ]';
    }
    else if (_.isFunction(value)) {
        out += value.name + '()';
    }
    else if (util_1.isRegExp(value)) {
        out += `${value.toString()}`;
    }
    else if (_.isObject(value)) {
        const proto = Object.getPrototypeOf(value);
        if (proto && proto.constructor !== Object) {
            out += `new ${proto.constructor.name}()`;
        }
        else {
            out += printConfig(value, level + 1);
        }
    }
    else {
        out += ' unknown';
    }
    return out;
}
function transformIndexHtml(context, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return index_html_plugin_1.transformHtml(content, context.ngBuildOption.browserOptions, srcUrl => {
                const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
                if (match && context.inlineAssets.has(match[1])) {
                    const source = context.inlineAssets.get(match[1]);
                    return smUrl.removeFrom(source);
                }
                return null;
            });
        }
        catch (e) {
            log.error(e);
            throw e;
        }
    });
}
exports.transformIndexHtml = transformIndexHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXdlYnBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0VBQW9FO0FBQ3BFLDhDQUF5RDtBQUN6RCwrQkFBK0I7QUFDL0IsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsK0JBQWdDO0FBR2hDLGtEQUF3QjtBQUN4QixvRUFBMkM7QUFHM0Msc0VBQW1EO0FBQ25ELG9FQUEyQztBQUMzQyxtRUFBNEQ7QUFDNUQsa0ZBQXFEO0FBQ3JELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCxtRkFBaUU7QUFDakUsa0RBQTBCO0FBQzFCLG9GQUEyRDtBQUUzRCx5RUFBeUU7QUFHekUsU0FBOEIsbUJBQW1CLENBQUMsT0FBdUIsRUFBRSxLQUFzQixFQUFFLGFBQW9DLEVBQ3JJLGlCQUFxQzs7UUFDckMsdUdBQXVHO1FBQ3ZHLE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUM1RSxtQ0FBbUM7UUFDbkMsbUVBQW1FO1FBQ25FLHNFQUFzRTtRQUN0RSxJQUFJO1FBQ0osSUFBSSxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUNqQyxhQUFhLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUM1QjtRQUNELElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUMzQixtQkFBZSxDQUFDLGFBQTZFLENBQUMsQ0FBQztTQUNoRztRQUVELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsdUNBQXVDLENBQUM7WUFDekQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFB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QUNMLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0QztLQUNGO1NBQU07UUFDTCxHQUFHLElBQUksVUFBVSxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBc0Isa0JBQWtCLENBQUMsT0FBdUIsRUFBRSxPQUFlOztRQUMvRSxJQUFJO1lBQ0YsT0FBTyxpQ0FBYSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFBRTtnQkFDM0UsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLEtBQUssSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDL0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFPLENBQUMsQ0FBQztpQkFDbEM7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUM7Q0FBQTtBQWRELGdEQWNDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCB7IEFuZ3VsYXJDb21waWxlclBsdWdpbiB9IGZyb20gJ0BuZ3Rvb2xzL3dlYnBhY2snO1xuLy8gaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuL25nLXRzLXJlcGxhY2UnO1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQgfSBmcm9tICcuL25nL2J1aWxkZXItY29udGV4dCc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgQ2h1bmtJbmZvUGx1Z2luIGZyb20gJy4vcGx1Z2lucy9jaHVuay1pbmZvJztcbmltcG9ydCBnemlwU2l6ZSBmcm9tICcuL3BsdWdpbnMvZ3ppcC1zaXplJztcbmltcG9ydCB7IHRyYW5zZm9ybUh0bWwgfSBmcm9tICcuL3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IFJlYWRIb29rSG9zdCBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignY29uZmlnLXdlYnBhY2snKTtcbmltcG9ydCBjb25maWdEZXZTZXJ2ZXIgZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L2RldlNlcnZlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IG1lbXN0YXRzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCB7V2VwYWNrQ29uZmlnSGFuZGxlcn0gZnJvbSAnLi9jb25maWd1cmFibGUnO1xuLy8gaW1wb3J0IHNldHVwQXNzZXRzIGZyb20gJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZVdlYnBhY2tDb25maWcoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcbiAgZHJjcENvbmZpZ1NldHRpbmc6IHtkZXZNb2RlOiBib29sZWFufSkge1xuICAvLyBjb25zdCBhcGk6IHR5cGVvZiBfX2FwaSA9IHJlcXVpcmUoJ19fYXBpJyk7IC8vIGZvcmNlIHRvIGRlZmVyIGxvYWRpbmcgYXBpIHVudGlsIERSQ1AgY29uZmlnIGlzIHJlYWR5XG4gIGNvbnNvbGUubG9nKCc+Pj4+Pj4+Pj4+Pj4+Pj4+PiBjaGFuZ2VXZWJwYWNrQ29uZmlnID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4nKTtcbiAgLy8gd2VicGFja0NvbmZpZy5zdGF0cyA9ICd2ZXJib3NlJztcbiAgLy8gaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZSAmJiB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubWFpbkZpZWxkcykge1xuICAvLyAgIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tYWluRmllbGRzID0gWydicm93c2VyJywgJ21haW4nLCAnbW9kdWxlJ107XG4gIC8vIH1cbiAgaWYgKHdlYnBhY2tDb25maWcucGx1Z2lucyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zID0gW107XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcuZGV2U2VydmVyKSB7XG4gICAgY29uZmlnRGV2U2VydmVyKHdlYnBhY2tDb25maWcgYXMge2RldlNlcnZlcjogTm9uTnVsbGFibGU8d2VicGFjay5Db25maWd1cmF0aW9uPlsnZGV2U2VydmVyJ119KTtcbiAgfVxuXG4gIGlmIChfLmdldChwYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5kcmNwQXJncy5yZXBvcnQnKSB8fFxuICBwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5yZXBvcnQgfHwocGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3Mub3BlblJlcG9ydCkpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChcbiAgICAgIG5ldyBDaHVua0luZm9QbHVnaW4oKVxuICAgICk7XG4gIH1cblxuICBjb25zdCByZXNvbHZlTW9kdWxlcyA9IHByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpO1xuICBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlID09IG51bGwpXG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlPSB7bW9kdWxlczogcmVzb2x2ZU1vZHVsZXN9O1xuICBlbHNlIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmUubW9kdWxlcyA9PSBudWxsKVxuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tb2R1bGVzID0gcmVzb2x2ZU1vZHVsZXM7XG4gIGVsc2VcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubW9kdWxlcy51bnNoaWZ0KC4uLnJlc29sdmVNb2R1bGVzKTtcbiAgLy8gd2VicGFja0NvbmZpZy5tb2R1bGUubm9QYXJzZSA9IChmaWxlOiBzdHJpbmcpID0+IG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKTtcblxuICAvLyBDaGFuZ2UgQW5ndWxhckNvbXBpbGVyUGx1Z2luJ3Mgb3B0aW9uXG4gIGNvbnN0IG5nQ29tcGlsZXJQbHVnaW4gPSB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMuZmluZCgocGx1Z2luOiBhbnkpID0+IHtcbiAgICByZXR1cm4gKHBsdWdpbiBpbnN0YW5jZW9mIEFuZ3VsYXJDb21waWxlclBsdWdpbik7XG4gIH0pIGFzIEFuZ3VsYXJDb21waWxlclBsdWdpbjtcbiAgaWYgKG5nQ29tcGlsZXJQbHVnaW4gPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBBbmd1bGFyQ29tcGlsZXJQbHVnaW4nKTtcbiAgLy8gSGFjayBhbmd1bGFyL3BhY2thZ2VzL25ndG9vbHMvd2VicGFjay9zcmMvYW5ndWxhcl9jb21waWxlcl9wbHVnaW4udHMgISEhIVxuICAvLyBjb25zdCB0cmFuc2Zvcm1lcnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fdHJhbnNmb3JtZXJzO1xuICAvLyB0cmFuc2Zvcm1lcnMudW5zaGlmdCgoY29udGV4dCkgPT4ge1xuICAvLyAgIHJldHVybiAodHNTcmMpID0+IHtcbiAgLy8gICAgIGNvbnNvbGUubG9nKCdoZWxsb3c6JywgdHNTcmMuZmlsZU5hbWUpO1xuICAvLyAgICAgcmV0dXJuIHRzU3JjO1xuICAvLyAgIH07XG4gIC8vIH0pO1xuICAod2VicGFja0NvbmZpZy5wbHVnaW5zIGFzIGFueVtdKS51bnNoaWZ0KG5ldyBjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb25zdCBob29rZXIgPSBuZXcgVFNSZWFkSG9va2VyKHBhcmFtLmJyb3dzZXJPcHRpb25zLnRzQ29uZmlnLCBwYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzKTtcbiAgICAgIG5nQ29tcGlsZXJQbHVnaW4ub3B0aW9ucy5ob3N0ID0gbmV3IFJlYWRIb29rSG9zdCgoY29tcGlsZXIgYXMgYW55KS5pbnB1dEZpbGVTeXN0ZW0sIGhvb2tlci5ob29rRnVuYyk7XG4gICAgICAvLyBEdWUgdG8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvcHVsbC8xMjk2OVxuICAgICAgbmdDb21waWxlclBsdWdpbi5vcHRpb25zLmRpcmVjdFRlbXBsYXRlTG9hZGluZyA9IGZhbHNlO1xuICAgICAgLy8gVE9ETzogT25jZSBBbmd1bGFyIGNsaSAodjguMS54KSB1cGdyYWRlcyB0byBhbGxvdyBjaGFuZ2luZyBkaXJlY3RUZW1wbGF0ZUxvYWRpbmcsIHdlIHNob3VsZCByZW1vdmVcbiAgICAgIC8vIGJlbG93IGhhY2sgY29kZS5cbiAgICAgICgobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl90cmFuc2Zvcm1lcnMgYXMgYW55W10pLnNwbGljZSgwKTtcbiAgICAgIChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX21ha2VUcmFuc2Zvcm1lcnMoKTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmNsZWFyKCk7XG4gICAgICB9KTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBob29rZXIubG9nRmlsZUNvdW50KCk7XG4gICAgICAgIG1lbXN0YXRzKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0oKSk7XG5cbiAgLy8gd2VicGFja0NvbmZpZy5yZXNvbHZlLnN5bWxpbmtzID0gZmFsc2U7XG5cbiAgaWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLnN0YXRzSnNvbikge1xuICAgIGxvZy53YXJuKCdZb3UgaGF2ZSBlbmJhYmxlZCBcInN0YXRzSnNvbjogdHJ1ZVwiIGluIEFuZ3VsYXIuanNvbiBvciBDb21tYW5kIGxpbmUsIGl0IHdpbGwgZ2VuZXJhdGUgYSBiaWcgZmlsZSBpbiBvdXRwdXQgZGlyZWN0b3J5XFxuJyArXG4gICAgICAnU3VnZ2VzdCB5b3UgdG8gcmVtb3ZlIGl0IGJlZm9yZSBkZXBsb3kgdGhlIHdob2xlIG91dHB1dCByZXNvdXJjZSB0byBzb21ld2hlcmUsIG9yIHlvdSBzaG91bGQgZGlzYWJsZSB0aGlzIG9wdGlvbixcXG4nICtcbiAgICAgICdjdXpcXCcgbmctYXBwLWJ1aWxkZXIgd2lsbCBnZW5lcmF0ZSBhbm90aGVyIHN0YXRzLmpzb24gZmlsZSBpbiBpdHMgcmVwb3J0IGRpcmVjdG9yeSBmb3IgcHJvZHVjdGlvbiBtb2RlJyk7XG4gIH1cblxuICBpZiAoIWRyY3BDb25maWdTZXR0aW5nLmRldk1vZGUpIHtcbiAgICBjb25zb2xlLmxvZygnQnVpbGQgaW4gcHJvZHVjdGlvbiBtb2RlJyk7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2goXG4gICAgICBuZXcgZ3ppcFNpemUoKSxcbiAgICAgIG5ldyAoY2xhc3Mge1xuICAgICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnYW5ndWxhci1jbGktc3RhdHMnLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b0pzb24oJ3ZlcmJvc2UnKSk7XG4gICAgICAgICAgICBjb25zdCByZXBvcnRGaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd3ZWJwYWNrLXN0YXRzLmpzb24nKTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShyZXBvcnRGaWxlLCBkYXRhLFxuICAgICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIGxvZy5pbmZvKGBXZWJwYWNrIGNvbXBpbGF0aW9uIHN0YXRzIGlzIHdyaXR0ZW4gdG8gJHtyZXBvcnRGaWxlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9fSkoKVxuICAgICk7XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcudGFyZ2V0ICE9PSAnbm9kZScpIHtcbiAgICAvLyBTaW5jZSBBbmd1bGFyIDguMS4wLCB0aGVyZSBpcyBubyBpbmRleEh0bWxQbHVnaW4gdXNlZCBpbiBXZWJwYWNrIGNvbmZpZ3VyYXRpb25cbiAgICAvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgSW5kZXhIdG1sUGx1Z2luKHtcbiAgICAvLyAgICAgaW5kZXhGaWxlOiBQYXRoLnJlc29sdmUocGFyYW0uYnJvd3Nlck9wdGlvbnMuaW5kZXgpLFxuICAgIC8vICAgICBpbmxpbmVDaHVua05hbWVzOiBbJ3J1bnRpbWUnXVxuICAgIC8vICAgfSkpO1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyAoY2xhc3MgRHJjcEJ1aWxkZXJBc3NldHNQbHVnaW4ge1xuICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwUHJvbWlzZSgnZHJjcC1idWlsZGVyLWFzc2V0cycsIGFzeW5jIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBhc3NldHM6IHtbYXNzZXRzUGF0aDogc3RyaW5nXTogYW55fSA9IGNvbXBpbGF0aW9uLmFzc2V0cztcbiAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0c1BhdGggb2YgT2JqZWN0LmtleXMoYXNzZXRzKSkge1xuICAgICAgICAgICAgLy8gbG9nLndhcm4oJ2lzICcsIGFzc2V0c1BhdGgpO1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKihcXC5qcykkLy5leGVjKGFzc2V0c1BhdGgpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAvLyBsb2cud2FybignbG9va3VwIGFzc2V0cycsIG1hdGNoWzFdKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0LmlubGluZUFzc2V0cy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICAgIGNvbnRleHQuaW5saW5lQXNzZXRzLnNldChtYXRjaFsxXSwgYXNzZXRzW2Fzc2V0c1BhdGhdLnNvdXJjZSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKCkpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaXMgY29uZGl0aW9uIG9mIFNlcnZlciBzaWRlIHJlbmRlcmluZ1xuICAgIC8vIFJlZmVyIHRvIGFuZ3VsYXItY2xpL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3Mvc2VydmVyLnRzXG4gICAgaWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmJ1bmRsZURlcGVuZGVuY2llcyA9PT0gJ25vbmUnKSB7XG4gICAgICB3ZWJwYWNrQ29uZmlnLmV4dGVybmFscyA9IFtcbiAgICAgICAgL15AYW5ndWxhci8sXG4gICAgICAgIChfOiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkKSA9PiB7XG4gICAgICAgIC8vIEFic29sdXRlICYgUmVsYXRpdmUgcGF0aHMgYXJlIG5vdCBleHRlcm5hbHNcbiAgICAgICAgaWYgKC9eXFwuezAsMn1cXC8vLnRlc3QocmVxdWVzdCkgfHwgUGF0aC5pc0Fic29sdXRlKHJlcXVlc3QpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG1vZHVsZSB2aWEgTm9kZVxuICAgICAgICAgIGNvbnN0IHJlc29sdmVkUmVxdWVzdCA9IHJlcXVpcmUucmVzb2x2ZShyZXF1ZXN0KTtcbiAgICAgICAgICBjb25zdCBjb21wID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc29sdmVkUmVxdWVzdCk7XG4gICAgICAgICAgaWYgKGNvbXAgPT0gbnVsbCB8fCBjb21wLmRyID09IG51bGwgKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgbm9kZV9tb2R1bGVcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY29tcCAhPSBudWxsICYmIGNvbXAubG9uZ05hbWUgPT09IGFwaS5wYWNrYWdlTmFtZSAmJlxuICAgICAgICAgICAgcmVzb2x2ZWRSZXF1ZXN0LmluZGV4T2YoUGF0aC5zZXAgKyAncHJlcmVuZGVyLmRpJykgPj0gMCkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSXQncyBhIHN5c3RlbSB0aGluZyAoLmllIHV0aWwsIGZzLi4uKVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBOb2RlIGNvdWxkbid0IGZpbmQgaXQsIHNvIGl0IG11c3QgYmUgdXNlci1hbGlhc2VkXG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgfVxuICB9XG4gIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBDb21waWxlRG9uZVBsdWdpbigpKTtcblxuICBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG4gIGNoYW5nZUxvYWRlcnMocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXG4gIGlmIChwYXJhbS5zc3IpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkuc3NyID0gcGFyYW0uc3NyO1xuICB9XG5cbiAgYXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxXZXBhY2tDb25maWdIYW5kbGVyPigoZmlsZSwgbGFzdFJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLndlYnBhY2tDb25maWcpXG4gICAgICByZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuICAgIHJldHVybiBsYXN0UmVzdWx0O1xuICB9KTtcbiAgY29uc3Qgd2ZuYW1lID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsXG4gICAgYHdlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLiR7Kytjb250ZXh0LndlYnBhY2tSdW5Db3VudH0uanNgKTtcbiAgZnMud3JpdGVGaWxlU3luYyh3Zm5hbWUsIHByaW50Q29uZmlnKHdlYnBhY2tDb25maWcpKTtcbiAgY29uc29sZS5sb2coYElmIHlvdSBhcmUgd29uZGVyaW5nIHdoYXQga2luZCBvZiBXZWJhcGNrIGNvbmZpZyBmaWxlIGlzIHVzZWQgaW50ZXJuYWxseSwgY2hlY2tvdXQgJHtjaGFsay5ibHVlQnJpZ2h0KHdmbmFtZSl9YCk7XG4gIHJldHVybiB3ZWJwYWNrQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VMb2FkZXJzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbikge1xuICAvLyBjb25zdCBub1BhcnNlID0gKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZE9wdGltaXplckV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcbiAgLy8gbm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuXG4gIC8vIGNvbnN0IGRldk1vZGUgPSB3ZWJwYWNrQ29uZmlnLm1vZGUgPT09ICdkZXZlbG9wbWVudCc7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSBbXTtcbiAgfVxuICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcy51bnNoaWZ0KFxuICAgIC4uLnByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpLFxuICAgIFBhdGguam9pbihfX2Rpcm5hbWUsICdsb2FkZXJzJykpO1xuICBpZiAoIXdlYnBhY2tDb25maWcubW9kdWxlKSB7XG4gICAgd2VicGFja0NvbmZpZy5tb2R1bGUgPSB7cnVsZXM6IFtdfTtcbiAgfVxuICBjb25zdCBydWxlcyA9IHdlYnBhY2tDb25maWcubW9kdWxlLnJ1bGVzIGFzIHdlYnBhY2suUnVsZVtdO1xuICBsZXQgaGFzVXJsTG9hZGVyID0gZmFsc2U7XG4gIGxldCBoYXNIdG1sTG9hZGVyID0gZmFsc2U7XG4gIGxldCBmaWxlTG9hZGVyUnVsZUlkeDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHVybExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcbiAgICB1c2U6IFt7XG4gICAgICBsb2FkZXI6ICd1cmwtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuICAgICAgICBmYWxsYmFjazogJ0B3Zmgvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG4gICAgICB9XG4gICAgfV1cbiAgfTtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLmZvckVhY2goKHJ1bGUsIHJ1bGVJZHgpID0+IHtcbiAgICBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuICAgIGlmIChydWxlLnVzZSkge1xuICAgICAgY29uc3QgaWR4ID0gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5maW5kSW5kZXgocnVsZVNldCA9PiBydWxlU2V0LmxvYWRlciA9PT0gJ3Bvc3Rjc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5zcGxpY2UoaWR4ICsgMSwgMCwge1xuICAgICAgICAgIGxvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5wdXNoKHtsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcid9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbmd1bGFyIDggZG9lc24ndCBoYXZlIGxvYWRlciBmb3IgSFRNTFxuICAgIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcbiAgICAgIGhhc0h0bWxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCBodG1sTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ2ZpbGUtbG9hZGVyJykge1xuICAgICAgZmlsZUxvYWRlclJ1bGVJZHggPSBydWxlSWR4O1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB7XG4gICAgICAgIHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICB1c2U6IFt7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcid9XVxuICAgICAgfSk7XG5cbiAgICB9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAndXJsLWxvYWRlcicpIHtcbiAgICAgIGhhc1VybExvYWRlciA9IHRydWU7XG4gICAgICBPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKHJ1bGUsIHVybExvYWRlclJ1bGUpO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkuaW5kZXhPZignXFxcXC5zY3NzJykgPj0gMCAmJiBydWxlLnVzZSkge1xuICAgICAgY29uc3QgdXNlID0gKHJ1bGUudXNlIGFzIEFycmF5PHtba2V5OiBzdHJpbmddOiBhbnksIGxvYWRlcjogc3RyaW5nfT4pO1xuICAgICAgY29uc3QgaW5zZXJ0SWR4ID0gdXNlLmZpbmRJbmRleChpdGVtID0+IGl0ZW0ubG9hZGVyID09PSAnc2Fzcy1sb2FkZXInKTtcbiAgICAgIGlmIChpbnNlcnRJZHggPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc2Fzcy1sb2FkZXIgaXMgbm90IGZvdW5kJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZWVkU291cmNlTWFwID0gdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXA7XG4gICAgICAvLyByZXNvbHZlLXVybC1sb2FkZXI6IFwic291cmNlIG1hcHMgbXVzdCBiZSBlbmFibGVkIG9uIGFueSBwcmVjZWRpbmcgbG9hZGVyXCJcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaG9sbG93YXkvcmVzb2x2ZS11cmwtbG9hZGVyXG4gICAgICB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcCA9IHRydWU7XG4gICAgICB1c2Uuc3BsaWNlKGluc2VydElkeCwgMCwge1xuICAgICAgICBsb2FkZXI6ICdyZXNvbHZlLXVybC1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBuZWVkU291cmNlTWFwXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5sZXNzJC8nICYmIHJ1bGUudXNlKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZUl0ZW0gb2YgcnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pIHtcbiAgICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyID09PSAnbGVzcy1sb2FkZXInICYmIF8uaGFzKHVzZUl0ZW0sICdvcHRpb25zLnBhdGhzJykpIHtcbiAgICAgICAgICBkZWxldGUgKHVzZUl0ZW0ub3B0aW9ucyBhcyBhbnkpLnBhdGhzO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAd2ZoL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWhhc1VybExvYWRlcikge1xuICAgIGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuICAgIGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuICAgIHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHVybExvYWRlclJ1bGUpO1xuICB9XG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIC8vIHRlc3Q6IC9cXC4oPzpuZ2ZhY3RvcnlcXC5qc3xjb21wb25lbnRcXC5odG1sKSQvLFxuICAgIHRlc3Q6IGZpbGUgPT4ge1xuICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiAhIWFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICB9LFxuICAgIHVzZTogW3tsb2FkZXI6ICdAd2ZoL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlcid9XVxuICB9KTtcblxuICBydWxlcy51bnNoaWZ0KHtcbiAgICBvbmVPZjogW1xuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5qYWRlJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICB7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2xpYi9qYWRlLXRvLWh0bWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5tZCQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAge2xvYWRlcjogJ0B3Zmgvd2VicGFjazItYnVpbGRlci9saWIvbWFya2Rvd24tbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC50eHQkLyxcbiAgICAgIHVzZToge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIH0sIHtcbiAgICAgIHRlc3Q6IC9cXC4oeWFtbHx5bWwpJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2pzb24tbG9hZGVyJ30sXG4gICAgICAgIHtsb2FkZXI6ICd5YW1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfV1cbiAgfSk7XG5cbiAgaWYgKCFoYXNIdG1sTG9hZGVyKSB7XG4gICAgcnVsZXNbMF0ub25lT2YgJiYgcnVsZXNbMF0ub25lT2YucHVzaChodG1sTG9hZGVyUnVsZSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gbm90QW5ndWxhckpzKGZpbGU6IHN0cmluZykge1xuLy8gXHRpZiAoIWZpbGUuZW5kc1dpdGgoJy5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdzdHlsZS5qcycpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0aWYgKG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdC8vIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuLy8gXHQvLyBpZiAocGsgJiYgcGsuZHIpIHtcbi8vIFx0Ly8gXHRyZXR1cm4gdHJ1ZTtcbi8vIFx0Ly8gfVxuLy8gXHRjb25zb2xlLmxvZygnYmFiZWw6ICcsIGZpbGUpO1xuLy8gXHRyZXR1cm4gdHJ1ZTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlU3BsaXRDaHVua3MocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogYW55KSB7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbiA9PSBudWxsKVxuICAgIHJldHVybjsgLy8gU1NSJyBXZWJwYWNrIGNvbmZpZyBkb2VzIG5vdCBoYXMgdGhpcyBwcm9wZXJ0eVxuICBjb25zdCBvbGRWZW5kb3JUZXN0RnVuYyA9IF8uZ2V0KHdlYnBhY2tDb25maWcsICdvcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHMudmVuZG9yLnRlc3QnKTtcblxuICBpZiAob2xkVmVuZG9yVGVzdEZ1bmMpIHtcbiAgICBjb25zdCBjYWNoZUdyb3Vwczoge1trZXk6IHN0cmluZ106IHdlYnBhY2suT3B0aW9ucy5DYWNoZUdyb3Vwc09wdGlvbnN9ID0gd2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHM7XG4gICAgY2FjaGVHcm91cHMudmVuZG9yLnRlc3QgPSB2ZW5kb3JUZXN0O1xuICAgIGNhY2hlR3JvdXBzLmxhenlWZW5kb3IgPSB7XG4gICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgIHRlc3Q6IHZlbmRvclRlc3QsXG4gICAgICBwcmlvcml0eTogMVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB2ZW5kb3JUZXN0KG1vZHVsZTogYW55LCBjaHVua3M6IEFycmF5PHsgbmFtZTogc3RyaW5nIH0+KSB7XG4gICAgY29uc3QgbWF5YmVWZW5kb3IgPSBvbGRWZW5kb3JUZXN0RnVuYyhtb2R1bGUsIGNodW5rcyk7XG4gICAgaWYgKCFtYXliZVZlbmRvcilcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvdXJjZSA9IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uID8gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24oKSA6ICcnO1xuICAgIC8vIGNvbnNvbGUubG9nKGB2ZW5kb3IgdGVzdCwgcmVzb3VyY2U6ICR7cmVzb3VyY2V9LCBjaHVua3M6ICR7Y2h1bmtzLm1hcCggYyA9PiBjLm5hbWUpfWApO1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlKTtcbiAgICByZXR1cm4gcGsgPT0gbnVsbCB8fCBway5kciA9PSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgdmFyIG91dCA9ICd7XFxuJztcbiAgXy5mb3JPd24oYywgKHZhbHVlOiBhbnksIHByb3A6IHN0cmluZykgPT4ge1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH0pO1xuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICB2YXIgb3V0ID0gJyc7XG4gIHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG4gIGlmIChfLmlzU3RyaW5nKHZhbHVlKSB8fCBfLmlzTnVtYmVyKHZhbHVlKSB8fCBfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgICh2YWx1ZSBhcyBhbnlbXSkuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIG91dCArPSBpbmRlbnQgKyAnICAgICcgKyBwcmludENvbmZpZ1ZhbHVlKHJvdywgbGV2ZWwgKyAxKTtcbiAgICAgIG91dCArPSAnLFxcbic7XG4gICAgfSk7XG4gICAgb3V0ICs9IGluZGVudCArICcgIF0nO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lfSgpYDtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9IHByaW50Q29uZmlnKHZhbHVlLCBsZXZlbCArIDEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1bmtub3duJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJhbnNmb3JtSW5kZXhIdG1sKGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCBjb250ZW50OiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gdHJhbnNmb3JtSHRtbChjb250ZW50LCBjb250ZXh0Lm5nQnVpbGRPcHRpb24uYnJvd3Nlck9wdGlvbnMsIHNyY1VybCA9PiB7XG4gICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwpO1xuICAgICAgaWYgKG1hdGNoICYmIGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5pbmxpbmVBc3NldHMuZ2V0KG1hdGNoWzFdKTtcbiAgICAgICAgcmV0dXJuIHNtVXJsLnJlbW92ZUZyb20oc291cmNlISk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihlKTtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbiJdfQ==