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
                            if (comp == null || comp.json.dr == null || comp.json.plink == null) {
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
        return pk == null || pk.json.dr == null || pk.json.plink == null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXdlYnBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0VBQW9FO0FBQ3BFLDhDQUF5RDtBQUN6RCwrQkFBK0I7QUFDL0IsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsK0JBQWdDO0FBR2hDLGtEQUF3QjtBQUN4QixvRUFBMkM7QUFHM0Msc0VBQW1EO0FBQ25ELG9FQUEyQztBQUMzQyxtRUFBNEQ7QUFDNUQsa0ZBQXFEO0FBQ3JELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCxtRkFBaUU7QUFDakUsa0RBQTBCO0FBQzFCLG9GQUEyRDtBQUUzRCx5RUFBeUU7QUFHekUsU0FBOEIsbUJBQW1CLENBQUMsT0FBdUIsRUFBRSxLQUFzQixFQUFFLGFBQW9DLEVBQ3JJLGlCQUFxQzs7UUFDckMsdUdBQXVHO1FBQ3ZHLE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUM1RSxtQ0FBbUM7UUFDbkMsbUVBQW1FO1FBQ25FLHNFQUFzRTtRQUN0RSxJQUFJO1FBQ0osSUFBSSxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUNqQyxhQUFhLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUM1QjtRQUNELElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUMzQixtQkFBZSxDQUFDLGFBQTZFLENBQUMsQ0FBQztTQUNoRztRQUVELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsdUNBQXVDLENBQUM7WUFDekQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFB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SSxLQUFLLENBQUMsV0FBVyxLQUFLLE1BQU0sRUFBRTtZQUN6QyxHQUFHLElBQUksT0FBTyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDO1NBQzFDO2FBQU07WUFDTCxHQUFHLElBQUksV0FBVyxDQUFDLEtBQUssRUFBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDdEM7S0FDRjtTQUFNO1FBQ0wsR0FBRyxJQUFJLFVBQVUsQ0FBQztLQUNuQjtJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVELFNBQXNCLGtCQUFrQixDQUFDLE9BQXVCLEVBQUUsT0FBZTs7UUFDL0UsSUFBSTtZQUNGLE9BQU8saUNBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQzNFLE1BQU0sS0FBSyxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQy9DLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNsRCxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTyxDQUFDLENBQUM7aUJBQ2xDO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLE1BQU0sQ0FBQyxDQUFDO1NBQ1Q7SUFDSCxDQUFDO0NBQUE7QUFkRCxnREFjQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgeyBBbmd1bGFyQ29tcGlsZXJQbHVnaW4gfSBmcm9tICdAbmd0b29scy93ZWJwYWNrJztcbi8vIGltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1JlZ0V4cCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBUU1JlYWRIb29rZXIgZnJvbSAnLi9uZy10cy1yZXBsYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0IH0gZnJvbSAnLi9uZy9idWlsZGVyLWNvbnRleHQnO1xuaW1wb3J0IHsgQW5ndWxhckNsaVBhcmFtIH0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IENodW5rSW5mb1BsdWdpbiBmcm9tICcuL3BsdWdpbnMvY2h1bmstaW5mbyc7XG5pbXBvcnQgZ3ppcFNpemUgZnJvbSAnLi9wbHVnaW5zL2d6aXAtc2l6ZSc7XG5pbXBvcnQgeyB0cmFuc2Zvcm1IdG1sIH0gZnJvbSAnLi9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luJztcbmltcG9ydCBSZWFkSG9va0hvc3QgZnJvbSAnLi91dGlscy9yZWFkLWhvb2stdmZzaG9zdCc7XG5jb25zdCBzbVVybCA9IHJlcXVpcmUoJ3NvdXJjZS1tYXAtdXJsJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2NvbmZpZy13ZWJwYWNrJyk7XG5pbXBvcnQgY29uZmlnRGV2U2VydmVyIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9kZXZTZXJ2ZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBtZW1zdGF0cyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL21lbS1zdGF0cyc7XG5pbXBvcnQge1dlcGFja0NvbmZpZ0hhbmRsZXJ9IGZyb20gJy4vY29uZmlndXJhYmxlJztcbi8vIGltcG9ydCBzZXR1cEFzc2V0cyBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcblxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VXZWJwYWNrQ29uZmlnKGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCBwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGRyY3BDb25maWdTZXR0aW5nOiB7ZGV2TW9kZTogYm9vbGVhbn0pIHtcbiAgLy8gY29uc3QgYXBpOiB0eXBlb2YgX19hcGkgPSByZXF1aXJlKCdfX2FwaScpOyAvLyBmb3JjZSB0byBkZWZlciBsb2FkaW5nIGFwaSB1bnRpbCBEUkNQIGNvbmZpZyBpcyByZWFkeVxuICBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+Pj4+Pj4+Pj4gY2hhbmdlV2VicGFja0NvbmZpZyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Jyk7XG4gIC8vIHdlYnBhY2tDb25maWcuc3RhdHMgPSAndmVyYm9zZSc7XG4gIC8vIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmUgJiYgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1haW5GaWVsZHMpIHtcbiAgLy8gICB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubWFpbkZpZWxkcyA9IFsnYnJvd3NlcicsICdtYWluJywgJ21vZHVsZSddO1xuICAvLyB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucyA9IFtdO1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcikge1xuICAgIGNvbmZpZ0RldlNlcnZlcih3ZWJwYWNrQ29uZmlnIGFzIHtkZXZTZXJ2ZXI6IE5vbk51bGxhYmxlPHdlYnBhY2suQ29uZmlndXJhdGlvbj5bJ2RldlNlcnZlciddfSk7XG4gIH1cblxuICBpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0JykgfHxcbiAgcGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0IHx8KHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLm9wZW5SZXBvcnQpKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2goXG4gICAgICBuZXcgQ2h1bmtJbmZvUGx1Z2luKClcbiAgICApO1xuICB9XG5cbiAgY29uc3QgcmVzb2x2ZU1vZHVsZXMgPSBwcm9jZXNzLmVudi5OT0RFX1BBVEghLnNwbGl0KFBhdGguZGVsaW1pdGVyKTtcbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZSA9PSBudWxsKVxuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZT0ge21vZHVsZXM6IHJlc29sdmVNb2R1bGVzfTtcbiAgZWxzZSBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlLm1vZHVsZXMgPT0gbnVsbClcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubW9kdWxlcyA9IHJlc29sdmVNb2R1bGVzO1xuICBlbHNlXG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1vZHVsZXMudW5zaGlmdCguLi5yZXNvbHZlTW9kdWxlcyk7XG4gIC8vIHdlYnBhY2tDb25maWcubW9kdWxlLm5vUGFyc2UgPSAoZmlsZTogc3RyaW5nKSA9PiBub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSk7XG5cbiAgLy8gQ2hhbmdlIEFuZ3VsYXJDb21waWxlclBsdWdpbidzIG9wdGlvblxuICBjb25zdCBuZ0NvbXBpbGVyUGx1Z2luID0gd2VicGFja0NvbmZpZy5wbHVnaW5zLmZpbmQoKHBsdWdpbjogYW55KSA9PiB7XG4gICAgcmV0dXJuIChwbHVnaW4gaW5zdGFuY2VvZiBBbmd1bGFyQ29tcGlsZXJQbHVnaW4pO1xuICB9KSBhcyBBbmd1bGFyQ29tcGlsZXJQbHVnaW47XG4gIGlmIChuZ0NvbXBpbGVyUGx1Z2luID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgQW5ndWxhckNvbXBpbGVyUGx1Z2luJyk7XG4gIC8vIEhhY2sgYW5ndWxhci9wYWNrYWdlcy9uZ3Rvb2xzL3dlYnBhY2svc3JjL2FuZ3VsYXJfY29tcGlsZXJfcGx1Z2luLnRzICEhISFcbiAgLy8gY29uc3QgdHJhbnNmb3JtZXJzOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX3RyYW5zZm9ybWVycztcbiAgLy8gdHJhbnNmb3JtZXJzLnVuc2hpZnQoKGNvbnRleHQpID0+IHtcbiAgLy8gICByZXR1cm4gKHRzU3JjKSA9PiB7XG4gIC8vICAgICBjb25zb2xlLmxvZygnaGVsbG93OicsIHRzU3JjLmZpbGVOYW1lKTtcbiAgLy8gICAgIHJldHVybiB0c1NyYztcbiAgLy8gICB9O1xuICAvLyB9KTtcbiAgKHdlYnBhY2tDb25maWcucGx1Z2lucyBhcyBhbnlbXSkudW5zaGlmdChuZXcgY2xhc3Mge1xuICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgY29uc3QgaG9va2VyID0gbmV3IFRTUmVhZEhvb2tlcihwYXJhbS5icm93c2VyT3B0aW9ucy50c0NvbmZpZywgcGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyk7XG4gICAgICBuZ0NvbXBpbGVyUGx1Z2luLm9wdGlvbnMuaG9zdCA9IG5ldyBSZWFkSG9va0hvc3QoKGNvbXBpbGVyIGFzIGFueSkuaW5wdXRGaWxlU3lzdGVtLCBob29rZXIuaG9va0Z1bmMpO1xuICAgICAgLy8gRHVlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMTI5NjlcbiAgICAgIG5nQ29tcGlsZXJQbHVnaW4ub3B0aW9ucy5kaXJlY3RUZW1wbGF0ZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIC8vIFRPRE86IE9uY2UgQW5ndWxhciBjbGkgKHY4LjEueCkgdXBncmFkZXMgdG8gYWxsb3cgY2hhbmdpbmcgZGlyZWN0VGVtcGxhdGVMb2FkaW5nLCB3ZSBzaG91bGQgcmVtb3ZlXG4gICAgICAvLyBiZWxvdyBoYWNrIGNvZGUuXG4gICAgICAoKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fdHJhbnNmb3JtZXJzIGFzIGFueVtdKS5zcGxpY2UoMCk7XG4gICAgICAobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl9tYWtlVHJhbnNmb3JtZXJzKCk7XG4gICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCd0cy1yZWFkLWhvb2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGhvb2tlci5jbGVhcigpO1xuICAgICAgfSk7XG4gICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmxvZ0ZpbGVDb3VudCgpO1xuICAgICAgICBtZW1zdGF0cygpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KCkpO1xuXG4gIC8vIHdlYnBhY2tDb25maWcucmVzb2x2ZS5zeW1saW5rcyA9IGZhbHNlO1xuXG4gIGlmIChwYXJhbS5icm93c2VyT3B0aW9ucy5zdGF0c0pzb24pIHtcbiAgICBsb2cud2FybignWW91IGhhdmUgZW5iYWJsZWQgXCJzdGF0c0pzb246IHRydWVcIiBpbiBBbmd1bGFyLmpzb24gb3IgQ29tbWFuZCBsaW5lLCBpdCB3aWxsIGdlbmVyYXRlIGEgYmlnIGZpbGUgaW4gb3V0cHV0IGRpcmVjdG9yeVxcbicgK1xuICAgICAgJ1N1Z2dlc3QgeW91IHRvIHJlbW92ZSBpdCBiZWZvcmUgZGVwbG95IHRoZSB3aG9sZSBvdXRwdXQgcmVzb3VyY2UgdG8gc29tZXdoZXJlLCBvciB5b3Ugc2hvdWxkIGRpc2FibGUgdGhpcyBvcHRpb24sXFxuJyArXG4gICAgICAnY3V6XFwnIG5nLWFwcC1idWlsZGVyIHdpbGwgZ2VuZXJhdGUgYW5vdGhlciBzdGF0cy5qc29uIGZpbGUgaW4gaXRzIHJlcG9ydCBkaXJlY3RvcnkgZm9yIHByb2R1Y3Rpb24gbW9kZScpO1xuICB9XG5cbiAgaWYgKCFkcmNwQ29uZmlnU2V0dGluZy5kZXZNb2RlKSB7XG4gICAgY29uc29sZS5sb2coJ0J1aWxkIGluIHByb2R1Y3Rpb24gbW9kZScpO1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuICAgICAgbmV3IGd6aXBTaXplKCksXG4gICAgICBuZXcgKGNsYXNzIHtcbiAgICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2FuZ3VsYXItY2xpLXN0YXRzJywgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9Kc29uKCd2ZXJib3NlJykpO1xuICAgICAgICAgICAgY29uc3QgcmVwb3J0RmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAnd2VicGFjay1zdGF0cy5qc29uJyk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGUocmVwb3J0RmlsZSwgZGF0YSxcbiAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbyhgV2VicGFjayBjb21waWxhdGlvbiBzdGF0cyBpcyB3cml0dGVuIHRvICR7cmVwb3J0RmlsZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgfX0pKClcbiAgICApO1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnRhcmdldCAhPT0gJ25vZGUnKSB7XG4gICAgLy8gU2luY2UgQW5ndWxhciA4LjEuMCwgdGhlcmUgaXMgbm8gaW5kZXhIdG1sUGx1Z2luIHVzZWQgaW4gV2VicGFjayBjb25maWd1cmF0aW9uXG4gICAgLy8gd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IEluZGV4SHRtbFBsdWdpbih7XG4gICAgLy8gICAgIGluZGV4RmlsZTogUGF0aC5yZXNvbHZlKHBhcmFtLmJyb3dzZXJPcHRpb25zLmluZGV4KSxcbiAgICAvLyAgICAgaW5saW5lQ2h1bmtOYW1lczogWydydW50aW1lJ11cbiAgICAvLyAgIH0pKTtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgKGNsYXNzIERyY3BCdWlsZGVyQXNzZXRzUGx1Z2luIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtYnVpbGRlci1hc3NldHMnLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgYXNzZXRzOiB7W2Fzc2V0c1BhdGg6IHN0cmluZ106IGFueX0gPSBjb21waWxhdGlvbi5hc3NldHM7XG4gICAgICAgICAgZm9yIChjb25zdCBhc3NldHNQYXRoIG9mIE9iamVjdC5rZXlzKGFzc2V0cykpIHtcbiAgICAgICAgICAgIC8vIGxvZy53YXJuKCdpcyAnLCBhc3NldHNQYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSooXFwuanMpJC8uZXhlYyhhc3NldHNQYXRoKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgLy8gbG9nLndhcm4oJ2xvb2t1cCBhc3NldHMnLCBtYXRjaFsxXSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dC5pbmxpbmVBc3NldHMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgICAgICBjb250ZXh0LmlubGluZUFzc2V0cy5zZXQobWF0Y2hbMV0sIGFzc2V0c1thc3NldHNQYXRoXS5zb3VyY2UoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIGlzIGNvbmRpdGlvbiBvZiBTZXJ2ZXIgc2lkZSByZW5kZXJpbmdcbiAgICAvLyBSZWZlciB0byBhbmd1bGFyLWNsaS9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF9hbmd1bGFyL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL3NlcnZlci50c1xuICAgIGlmIChwYXJhbS5icm93c2VyT3B0aW9ucy5idW5kbGVEZXBlbmRlbmNpZXMgPT09ICdub25lJykge1xuICAgICAgd2VicGFja0NvbmZpZy5leHRlcm5hbHMgPSBbXG4gICAgICAgIC9eQGFuZ3VsYXIvLFxuICAgICAgICAoXzogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAvLyBBYnNvbHV0ZSAmIFJlbGF0aXZlIHBhdGhzIGFyZSBub3QgZXh0ZXJuYWxzXG4gICAgICAgIGlmICgvXlxcLnswLDJ9XFwvLy50ZXN0KHJlcXVlc3QpIHx8IFBhdGguaXNBYnNvbHV0ZShyZXF1ZXN0KSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIHRoZSBtb2R1bGUgdmlhIE5vZGVcbiAgICAgICAgICBjb25zdCByZXNvbHZlZFJlcXVlc3QgPSByZXF1aXJlLnJlc29sdmUocmVxdWVzdCk7XG4gICAgICAgICAgY29uc3QgY29tcCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvbHZlZFJlcXVlc3QpO1xuICAgICAgICAgIGlmIChjb21wID09IG51bGwgfHwgY29tcC5qc29uLmRyID09IG51bGwgfHwgY29tcC5qc29uLnBsaW5rID09IG51bGwgKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgbm9kZV9tb2R1bGVcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY29tcCAhPSBudWxsICYmIGNvbXAubG9uZ05hbWUgPT09IGFwaS5wYWNrYWdlTmFtZSAmJlxuICAgICAgICAgICAgcmVzb2x2ZWRSZXF1ZXN0LmluZGV4T2YoUGF0aC5zZXAgKyAncHJlcmVuZGVyLmRpJykgPj0gMCkge1xuICAgICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSXQncyBhIHN5c3RlbSB0aGluZyAoLmllIHV0aWwsIGZzLi4uKVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBOb2RlIGNvdWxkbid0IGZpbmQgaXQsIHNvIGl0IG11c3QgYmUgdXNlci1hbGlhc2VkXG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgfVxuICB9XG4gIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBDb21waWxlRG9uZVBsdWdpbigpKTtcblxuICBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG4gIGNoYW5nZUxvYWRlcnMocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXG4gIGlmIChwYXJhbS5zc3IpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkuc3NyID0gcGFyYW0uc3NyO1xuICB9XG5cbiAgYXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxXZXBhY2tDb25maWdIYW5kbGVyPigoZmlsZSwgbGFzdFJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLndlYnBhY2tDb25maWcpXG4gICAgICByZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuICAgIHJldHVybiBsYXN0UmVzdWx0O1xuICB9KTtcbiAgY29uc3Qgd2ZuYW1lID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsXG4gICAgYHdlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLiR7Kytjb250ZXh0LndlYnBhY2tSdW5Db3VudH0uanNgKTtcbiAgZnMud3JpdGVGaWxlU3luYyh3Zm5hbWUsIHByaW50Q29uZmlnKHdlYnBhY2tDb25maWcpKTtcbiAgY29uc29sZS5sb2coYElmIHlvdSBhcmUgd29uZGVyaW5nIHdoYXQga2luZCBvZiBXZWJhcGNrIGNvbmZpZyBmaWxlIGlzIHVzZWQgaW50ZXJuYWxseSwgY2hlY2tvdXQgJHtjaGFsay5ibHVlQnJpZ2h0KHdmbmFtZSl9YCk7XG4gIHJldHVybiB3ZWJwYWNrQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VMb2FkZXJzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbikge1xuICAvLyBjb25zdCBub1BhcnNlID0gKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZE9wdGltaXplckV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcbiAgLy8gbm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuXG4gIC8vIGNvbnN0IGRldk1vZGUgPSB3ZWJwYWNrQ29uZmlnLm1vZGUgPT09ICdkZXZlbG9wbWVudCc7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSBbXTtcbiAgfVxuICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcy51bnNoaWZ0KFxuICAgIC4uLnByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpLFxuICAgIFBhdGguam9pbihfX2Rpcm5hbWUsICdsb2FkZXJzJykpO1xuICBpZiAoIXdlYnBhY2tDb25maWcubW9kdWxlKSB7XG4gICAgd2VicGFja0NvbmZpZy5tb2R1bGUgPSB7cnVsZXM6IFtdfTtcbiAgfVxuICBjb25zdCBydWxlcyA9IHdlYnBhY2tDb25maWcubW9kdWxlLnJ1bGVzIGFzIHdlYnBhY2suUnVsZVtdO1xuICBsZXQgaGFzVXJsTG9hZGVyID0gZmFsc2U7XG4gIGxldCBoYXNIdG1sTG9hZGVyID0gZmFsc2U7XG4gIGxldCBmaWxlTG9hZGVyUnVsZUlkeDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHVybExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcbiAgICB1c2U6IFt7XG4gICAgICBsb2FkZXI6ICd1cmwtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuICAgICAgICBmYWxsYmFjazogJ0B3Zmgvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG4gICAgICB9XG4gICAgfV1cbiAgfTtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLmZvckVhY2goKHJ1bGUsIHJ1bGVJZHgpID0+IHtcbiAgICBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuICAgIGlmIChydWxlLnVzZSkge1xuICAgICAgY29uc3QgaWR4ID0gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5maW5kSW5kZXgocnVsZVNldCA9PiBydWxlU2V0LmxvYWRlciA9PT0gJ3Bvc3Rjc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5zcGxpY2UoaWR4ICsgMSwgMCwge1xuICAgICAgICAgIGxvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5wdXNoKHtsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcid9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbmd1bGFyIDggZG9lc24ndCBoYXZlIGxvYWRlciBmb3IgSFRNTFxuICAgIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcbiAgICAgIGhhc0h0bWxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCBodG1sTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ2ZpbGUtbG9hZGVyJykge1xuICAgICAgZmlsZUxvYWRlclJ1bGVJZHggPSBydWxlSWR4O1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB7XG4gICAgICAgIHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICB1c2U6IFt7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcid9XVxuICAgICAgfSk7XG5cbiAgICB9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAndXJsLWxvYWRlcicpIHtcbiAgICAgIGhhc1VybExvYWRlciA9IHRydWU7XG4gICAgICBPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKHJ1bGUsIHVybExvYWRlclJ1bGUpO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkuaW5kZXhPZignXFxcXC5zY3NzJykgPj0gMCAmJiBydWxlLnVzZSkge1xuICAgICAgY29uc3QgdXNlID0gKHJ1bGUudXNlIGFzIEFycmF5PHtba2V5OiBzdHJpbmddOiBhbnksIGxvYWRlcjogc3RyaW5nfT4pO1xuICAgICAgY29uc3QgaW5zZXJ0SWR4ID0gdXNlLmZpbmRJbmRleChpdGVtID0+IGl0ZW0ubG9hZGVyID09PSAnc2Fzcy1sb2FkZXInKTtcbiAgICAgIGlmIChpbnNlcnRJZHggPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc2Fzcy1sb2FkZXIgaXMgbm90IGZvdW5kJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZWVkU291cmNlTWFwID0gdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXA7XG4gICAgICAvLyByZXNvbHZlLXVybC1sb2FkZXI6IFwic291cmNlIG1hcHMgbXVzdCBiZSBlbmFibGVkIG9uIGFueSBwcmVjZWRpbmcgbG9hZGVyXCJcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaG9sbG93YXkvcmVzb2x2ZS11cmwtbG9hZGVyXG4gICAgICB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcCA9IHRydWU7XG4gICAgICB1c2Uuc3BsaWNlKGluc2VydElkeCwgMCwge1xuICAgICAgICBsb2FkZXI6ICdyZXNvbHZlLXVybC1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBuZWVkU291cmNlTWFwXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5sZXNzJC8nICYmIHJ1bGUudXNlKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZUl0ZW0gb2YgcnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pIHtcbiAgICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyID09PSAnbGVzcy1sb2FkZXInICYmIF8uaGFzKHVzZUl0ZW0sICdvcHRpb25zLnBhdGhzJykpIHtcbiAgICAgICAgICBkZWxldGUgKHVzZUl0ZW0ub3B0aW9ucyBhcyBhbnkpLnBhdGhzO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAd2ZoL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWhhc1VybExvYWRlcikge1xuICAgIGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuICAgIGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuICAgIHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHVybExvYWRlclJ1bGUpO1xuICB9XG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIC8vIHRlc3Q6IC9cXC4oPzpuZ2ZhY3RvcnlcXC5qc3xjb21wb25lbnRcXC5odG1sKSQvLFxuICAgIHRlc3Q6IGZpbGUgPT4ge1xuICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiAhIWFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICB9LFxuICAgIHVzZTogW3tsb2FkZXI6ICdAd2ZoL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlcid9XVxuICB9KTtcblxuICBydWxlcy51bnNoaWZ0KHtcbiAgICBvbmVPZjogW1xuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5qYWRlJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICB7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2xpYi9qYWRlLXRvLWh0bWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5tZCQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAge2xvYWRlcjogJ0B3Zmgvd2VicGFjazItYnVpbGRlci9saWIvbWFya2Rvd24tbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC50eHQkLyxcbiAgICAgIHVzZToge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIH0sIHtcbiAgICAgIHRlc3Q6IC9cXC4oeWFtbHx5bWwpJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2pzb24tbG9hZGVyJ30sXG4gICAgICAgIHtsb2FkZXI6ICd5YW1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfV1cbiAgfSk7XG5cbiAgaWYgKCFoYXNIdG1sTG9hZGVyKSB7XG4gICAgcnVsZXNbMF0ub25lT2YgJiYgcnVsZXNbMF0ub25lT2YucHVzaChodG1sTG9hZGVyUnVsZSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gbm90QW5ndWxhckpzKGZpbGU6IHN0cmluZykge1xuLy8gXHRpZiAoIWZpbGUuZW5kc1dpdGgoJy5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdzdHlsZS5qcycpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0aWYgKG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdC8vIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuLy8gXHQvLyBpZiAocGsgJiYgcGsuZHIpIHtcbi8vIFx0Ly8gXHRyZXR1cm4gdHJ1ZTtcbi8vIFx0Ly8gfVxuLy8gXHRjb25zb2xlLmxvZygnYmFiZWw6ICcsIGZpbGUpO1xuLy8gXHRyZXR1cm4gdHJ1ZTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlU3BsaXRDaHVua3MocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogYW55KSB7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbiA9PSBudWxsKVxuICAgIHJldHVybjsgLy8gU1NSJyBXZWJwYWNrIGNvbmZpZyBkb2VzIG5vdCBoYXMgdGhpcyBwcm9wZXJ0eVxuICBjb25zdCBvbGRWZW5kb3JUZXN0RnVuYyA9IF8uZ2V0KHdlYnBhY2tDb25maWcsICdvcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHMudmVuZG9yLnRlc3QnKTtcblxuICBpZiAob2xkVmVuZG9yVGVzdEZ1bmMpIHtcbiAgICBjb25zdCBjYWNoZUdyb3Vwczoge1trZXk6IHN0cmluZ106IHdlYnBhY2suT3B0aW9ucy5DYWNoZUdyb3Vwc09wdGlvbnN9ID0gd2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHM7XG4gICAgY2FjaGVHcm91cHMudmVuZG9yLnRlc3QgPSB2ZW5kb3JUZXN0O1xuICAgIGNhY2hlR3JvdXBzLmxhenlWZW5kb3IgPSB7XG4gICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgIHRlc3Q6IHZlbmRvclRlc3QsXG4gICAgICBwcmlvcml0eTogMVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB2ZW5kb3JUZXN0KG1vZHVsZTogYW55LCBjaHVua3M6IEFycmF5PHsgbmFtZTogc3RyaW5nIH0+KSB7XG4gICAgY29uc3QgbWF5YmVWZW5kb3IgPSBvbGRWZW5kb3JUZXN0RnVuYyhtb2R1bGUsIGNodW5rcyk7XG4gICAgaWYgKCFtYXliZVZlbmRvcilcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvdXJjZSA9IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uID8gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24oKSA6ICcnO1xuICAgIC8vIGNvbnNvbGUubG9nKGB2ZW5kb3IgdGVzdCwgcmVzb3VyY2U6ICR7cmVzb3VyY2V9LCBjaHVua3M6ICR7Y2h1bmtzLm1hcCggYyA9PiBjLm5hbWUpfWApO1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlKTtcbiAgICByZXR1cm4gcGsgPT0gbnVsbCB8fCBway5qc29uLmRyID09IG51bGwgfHwgcGsuanNvbi5wbGluayA9PSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgdmFyIG91dCA9ICd7XFxuJztcbiAgXy5mb3JPd24oYywgKHZhbHVlOiBhbnksIHByb3A6IHN0cmluZykgPT4ge1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH0pO1xuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICB2YXIgb3V0ID0gJyc7XG4gIHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG4gIGlmIChfLmlzU3RyaW5nKHZhbHVlKSB8fCBfLmlzTnVtYmVyKHZhbHVlKSB8fCBfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgICh2YWx1ZSBhcyBhbnlbXSkuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIG91dCArPSBpbmRlbnQgKyAnICAgICcgKyBwcmludENvbmZpZ1ZhbHVlKHJvdywgbGV2ZWwgKyAxKTtcbiAgICAgIG91dCArPSAnLFxcbic7XG4gICAgfSk7XG4gICAgb3V0ICs9IGluZGVudCArICcgIF0nO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lfSgpYDtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9IHByaW50Q29uZmlnKHZhbHVlLCBsZXZlbCArIDEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1bmtub3duJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJhbnNmb3JtSW5kZXhIdG1sKGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCBjb250ZW50OiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gdHJhbnNmb3JtSHRtbChjb250ZW50LCBjb250ZXh0Lm5nQnVpbGRPcHRpb24uYnJvd3Nlck9wdGlvbnMsIHNyY1VybCA9PiB7XG4gICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwpO1xuICAgICAgaWYgKG1hdGNoICYmIGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5pbmxpbmVBc3NldHMuZ2V0KG1hdGNoWzFdKTtcbiAgICAgICAgcmV0dXJuIHNtVXJsLnJlbW92ZUZyb20oc291cmNlISk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihlKTtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbiJdfQ==