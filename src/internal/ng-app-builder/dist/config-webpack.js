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
const op = __importStar(require("rxjs/operators"));
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
        yield __api_1.default.config.configHandlerMgr.pipe(op.distinctUntilChanged(), op.filter(mgr => mgr != null), op.concatMap(mgr => {
            return mgr.runEach((file, lastResult, handler) => {
                if (handler.webpackConfig)
                    return handler.webpackConfig(webpackConfig);
                return lastResult;
            });
        }), op.take(1)).toPromise();
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
        return pk == null || (pk.json.dr == null && pk.json.plink == null);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXdlYnBhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0VBQW9FO0FBQ3BFLDhDQUF5RDtBQUN6RCwrQkFBK0I7QUFDL0IsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsK0JBQWdDO0FBR2hDLGtEQUF3QjtBQUN4QixvRUFBMkM7QUFHM0Msc0VBQW1EO0FBQ25ELG9FQUEyQztBQUMzQyxtRUFBNEQ7QUFDNUQsa0ZBQXFEO0FBQ3JELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxRCxtRkFBaUU7QUFDakUsa0RBQTBCO0FBQzFCLG9GQUEyRDtBQUUzRCxtREFBcUM7QUFDckMseUVBQXlFO0FBR3pFLFNBQThCLG1CQUFtQixDQUFDLE9BQXVCLEVBQUUsS0FBc0IsRUFBRSxhQUFvQyxFQUNySSxpQkFBcUM7O1FBQ3JDLHVHQUF1RztRQUN2RyxPQUFPLENBQUMsR0FBRyxDQUFDLDhEQUE4RCxDQUFDLENBQUM7UUFDNUUsbUNBQW1DO1FBQ25DLG1FQUFtRTtRQUNuRSxzRUFBc0U7UUFDdEUsSUFBSTtRQUNKLElBQUksYUFBYSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDakMsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDNUI7UUFDRCxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUU7WUFDM0IsbUJBQWUsQ0FBQyxhQUE2RSxDQUFDLENBQUM7U0FDaEc7UUFFRCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLHVDQUF1QyxDQUFDO1lBQ3pELEtBQUssQ0FBQyxjQUFjLENBQUMs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RCxPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLENBQUMsQ0FBQztTQUNUO0lBQ0gsQ0FBQztDQUFBO0FBZEQsZ0RBY0MiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aCBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuaW1wb3J0IHsgQW5ndWxhckNvbXBpbGVyUGx1Z2luIH0gZnJvbSAnQG5ndG9vbHMvd2VicGFjayc7XG4vLyBpbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgaXNSZWdFeHAgfSBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgVFNSZWFkSG9va2VyIGZyb20gJy4vbmctdHMtcmVwbGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCB9IGZyb20gJy4vbmcvYnVpbGRlci1jb250ZXh0JztcbmltcG9ydCB7IEFuZ3VsYXJDbGlQYXJhbSB9IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBDaHVua0luZm9QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL2NodW5rLWluZm8nO1xuaW1wb3J0IGd6aXBTaXplIGZyb20gJy4vcGx1Z2lucy9nemlwLXNpemUnO1xuaW1wb3J0IHsgdHJhbnNmb3JtSHRtbCB9IGZyb20gJy4vcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbic7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdjb25maWctd2VicGFjaycpO1xuaW1wb3J0IGNvbmZpZ0RldlNlcnZlciBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvZGV2U2VydmVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbWVtc3RhdHMgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IHtXZXBhY2tDb25maWdIYW5kbGVyfSBmcm9tICcuL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG4vLyBpbXBvcnQgc2V0dXBBc3NldHMgZnJvbSAnQHdmaC9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cyc7XG5cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlV2VicGFja0NvbmZpZyhjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgcGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uLFxuICBkcmNwQ29uZmlnU2V0dGluZzoge2Rldk1vZGU6IGJvb2xlYW59KSB7XG4gIC8vIGNvbnN0IGFwaTogdHlwZW9mIF9fYXBpID0gcmVxdWlyZSgnX19hcGknKTsgLy8gZm9yY2UgdG8gZGVmZXIgbG9hZGluZyBhcGkgdW50aWwgRFJDUCBjb25maWcgaXMgcmVhZHlcbiAgY29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IGNoYW5nZVdlYnBhY2tDb25maWcgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpO1xuICAvLyB3ZWJwYWNrQ29uZmlnLnN0YXRzID0gJ3ZlcmJvc2UnO1xuICAvLyBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlICYmIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tYWluRmllbGRzKSB7XG4gIC8vICAgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1haW5GaWVsZHMgPSBbJ2Jyb3dzZXInLCAnbWFpbicsICdtb2R1bGUnXTtcbiAgLy8gfVxuICBpZiAod2VicGFja0NvbmZpZy5wbHVnaW5zID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPSBbXTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIpIHtcbiAgICBjb25maWdEZXZTZXJ2ZXIod2VicGFja0NvbmZpZyBhcyB7ZGV2U2VydmVyOiBOb25OdWxsYWJsZTx3ZWJwYWNrLkNvbmZpZ3VyYXRpb24+WydkZXZTZXJ2ZXInXX0pO1xuICB9XG5cbiAgaWYgKF8uZ2V0KHBhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmRyY3BBcmdzLnJlcG9ydCcpIHx8XG4gIHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLnJlcG9ydCB8fChwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5vcGVuUmVwb3J0KSkge1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuICAgICAgbmV3IENodW5rSW5mb1BsdWdpbigpXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHJlc29sdmVNb2R1bGVzID0gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIIS5zcGxpdChQYXRoLmRlbGltaXRlcik7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmUgPT0gbnVsbClcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmU9IHttb2R1bGVzOiByZXNvbHZlTW9kdWxlc307XG4gIGVsc2UgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZS5tb2R1bGVzID09IG51bGwpXG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1vZHVsZXMgPSByZXNvbHZlTW9kdWxlcztcbiAgZWxzZVxuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tb2R1bGVzLnVuc2hpZnQoLi4ucmVzb2x2ZU1vZHVsZXMpO1xuICAvLyB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ub1BhcnNlID0gKGZpbGU6IHN0cmluZykgPT4gbm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpO1xuXG4gIC8vIENoYW5nZSBBbmd1bGFyQ29tcGlsZXJQbHVnaW4ncyBvcHRpb25cbiAgY29uc3QgbmdDb21waWxlclBsdWdpbiA9IHdlYnBhY2tDb25maWcucGx1Z2lucy5maW5kKChwbHVnaW46IGFueSkgPT4ge1xuICAgIHJldHVybiAocGx1Z2luIGluc3RhbmNlb2YgQW5ndWxhckNvbXBpbGVyUGx1Z2luKTtcbiAgfSkgYXMgQW5ndWxhckNvbXBpbGVyUGx1Z2luO1xuICBpZiAobmdDb21waWxlclBsdWdpbiA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmaW5kIEFuZ3VsYXJDb21waWxlclBsdWdpbicpO1xuICAvLyBIYWNrIGFuZ3VsYXIvcGFja2FnZXMvbmd0b29scy93ZWJwYWNrL3NyYy9hbmd1bGFyX2NvbXBpbGVyX3BsdWdpbi50cyAhISEhXG4gIC8vIGNvbnN0IHRyYW5zZm9ybWVyczogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W10gPSAobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl90cmFuc2Zvcm1lcnM7XG4gIC8vIHRyYW5zZm9ybWVycy51bnNoaWZ0KChjb250ZXh0KSA9PiB7XG4gIC8vICAgcmV0dXJuICh0c1NyYykgPT4ge1xuICAvLyAgICAgY29uc29sZS5sb2coJ2hlbGxvdzonLCB0c1NyYy5maWxlTmFtZSk7XG4gIC8vICAgICByZXR1cm4gdHNTcmM7XG4gIC8vICAgfTtcbiAgLy8gfSk7XG4gICh3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgYXMgYW55W10pLnVuc2hpZnQobmV3IGNsYXNzIHtcbiAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgIGNvbnN0IGhvb2tlciA9IG5ldyBUU1JlYWRIb29rZXIocGFyYW0uYnJvd3Nlck9wdGlvbnMudHNDb25maWcsIHBhcmFtLmJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MpO1xuICAgICAgbmdDb21waWxlclBsdWdpbi5vcHRpb25zLmhvc3QgPSBuZXcgUmVhZEhvb2tIb3N0KChjb21waWxlciBhcyBhbnkpLmlucHV0RmlsZVN5c3RlbSwgaG9va2VyLmhvb2tGdW5jKTtcbiAgICAgIC8vIER1ZSB0byBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9wdWxsLzEyOTY5XG4gICAgICBuZ0NvbXBpbGVyUGx1Z2luLm9wdGlvbnMuZGlyZWN0VGVtcGxhdGVMb2FkaW5nID0gZmFsc2U7XG4gICAgICAvLyBUT0RPOiBPbmNlIEFuZ3VsYXIgY2xpICh2OC4xLngpIHVwZ3JhZGVzIHRvIGFsbG93IGNoYW5naW5nIGRpcmVjdFRlbXBsYXRlTG9hZGluZywgd2Ugc2hvdWxkIHJlbW92ZVxuICAgICAgLy8gYmVsb3cgaGFjayBjb2RlLlxuICAgICAgKChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX3RyYW5zZm9ybWVycyBhcyBhbnlbXSkuc3BsaWNlKDApO1xuICAgICAgKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fbWFrZVRyYW5zZm9ybWVycygpO1xuICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBob29rZXIuY2xlYXIoKTtcbiAgICAgIH0pO1xuICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXBQcm9taXNlKCd0cy1yZWFkLWhvb2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGhvb2tlci5sb2dGaWxlQ291bnQoKTtcbiAgICAgICAgbWVtc3RhdHMoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSgpKTtcblxuICAvLyB3ZWJwYWNrQ29uZmlnLnJlc29sdmUuc3ltbGlua3MgPSBmYWxzZTtcblxuICBpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuc3RhdHNKc29uKSB7XG4gICAgbG9nLndhcm4oJ1lvdSBoYXZlIGVuYmFibGVkIFwic3RhdHNKc29uOiB0cnVlXCIgaW4gQW5ndWxhci5qc29uIG9yIENvbW1hbmQgbGluZSwgaXQgd2lsbCBnZW5lcmF0ZSBhIGJpZyBmaWxlIGluIG91dHB1dCBkaXJlY3RvcnlcXG4nICtcbiAgICAgICdTdWdnZXN0IHlvdSB0byByZW1vdmUgaXQgYmVmb3JlIGRlcGxveSB0aGUgd2hvbGUgb3V0cHV0IHJlc291cmNlIHRvIHNvbWV3aGVyZSwgb3IgeW91IHNob3VsZCBkaXNhYmxlIHRoaXMgb3B0aW9uLFxcbicgK1xuICAgICAgJ2N1elxcJyBuZy1hcHAtYnVpbGRlciB3aWxsIGdlbmVyYXRlIGFub3RoZXIgc3RhdHMuanNvbiBmaWxlIGluIGl0cyByZXBvcnQgZGlyZWN0b3J5IGZvciBwcm9kdWN0aW9uIG1vZGUnKTtcbiAgfVxuXG4gIGlmICghZHJjcENvbmZpZ1NldHRpbmcuZGV2TW9kZSkge1xuICAgIGNvbnNvbGUubG9nKCdCdWlsZCBpbiBwcm9kdWN0aW9uIG1vZGUnKTtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChcbiAgICAgIG5ldyBnemlwU2l6ZSgpLFxuICAgICAgbmV3IChjbGFzcyB7XG4gICAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdhbmd1bGFyLWNsaS1zdGF0cycsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeShjb21waWxhdGlvbi5nZXRTdGF0cygpLnRvSnNvbigndmVyYm9zZScpKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcG9ydEZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ3dlYnBhY2stc3RhdHMuanNvbicpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKHJlcG9ydEZpbGUsIGRhdGEsXG4gICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gbG9nLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oYFdlYnBhY2sgY29tcGlsYXRpb24gc3RhdHMgaXMgd3JpdHRlbiB0byAke3JlcG9ydEZpbGV9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH19KSgpXG4gICAgKTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy50YXJnZXQgIT09ICdub2RlJykge1xuICAgIC8vIFNpbmNlIEFuZ3VsYXIgOC4xLjAsIHRoZXJlIGlzIG5vIGluZGV4SHRtbFBsdWdpbiB1c2VkIGluIFdlYnBhY2sgY29uZmlndXJhdGlvblxuICAgIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBJbmRleEh0bWxQbHVnaW4oe1xuICAgIC8vICAgICBpbmRleEZpbGU6IFBhdGgucmVzb2x2ZShwYXJhbS5icm93c2VyT3B0aW9ucy5pbmRleCksXG4gICAgLy8gICAgIGlubGluZUNodW5rTmFtZXM6IFsncnVudGltZSddXG4gICAgLy8gICB9KSk7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IChjbGFzcyBEcmNwQnVpbGRlckFzc2V0c1BsdWdpbiB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWJ1aWxkZXItYXNzZXRzJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGFzc2V0czoge1thc3NldHNQYXRoOiBzdHJpbmddOiBhbnl9ID0gY29tcGlsYXRpb24uYXNzZXRzO1xuICAgICAgICAgIGZvciAoY29uc3QgYXNzZXRzUGF0aCBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG4gICAgICAgICAgICAvLyBsb2cud2FybignaXMgJywgYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykqKFxcLmpzKSQvLmV4ZWMoYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIC8vIGxvZy53YXJuKCdsb29rdXAgYXNzZXRzJywgbWF0Y2hbMV0pO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5pbmxpbmVBc3NldHMuc2V0KG1hdGNoWzFdLCBhc3NldHNbYXNzZXRzUGF0aF0uc291cmNlKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhpcyBpcyBjb25kaXRpb24gb2YgU2VydmVyIHNpZGUgcmVuZGVyaW5nXG4gICAgLy8gUmVmZXIgdG8gYW5ndWxhci1jbGkvcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9zZXJ2ZXIudHNcbiAgICBpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuYnVuZGxlRGVwZW5kZW5jaWVzID09PSAnbm9uZScpIHtcbiAgICAgIHdlYnBhY2tDb25maWcuZXh0ZXJuYWxzID0gW1xuICAgICAgICAvXkBhbmd1bGFyLyxcbiAgICAgICAgKF86IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQpID0+IHtcbiAgICAgICAgLy8gQWJzb2x1dGUgJiBSZWxhdGl2ZSBwYXRocyBhcmUgbm90IGV4dGVybmFsc1xuICAgICAgICBpZiAoL15cXC57MCwyfVxcLy8udGVzdChyZXF1ZXN0KSB8fCBQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgbW9kdWxlIHZpYSBOb2RlXG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWRSZXF1ZXN0ID0gcmVxdWlyZS5yZXNvbHZlKHJlcXVlc3QpO1xuICAgICAgICAgIGNvbnN0IGNvbXAgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb2x2ZWRSZXF1ZXN0KTtcbiAgICAgICAgICBpZiAoY29tcCA9PSBudWxsIHx8IGNvbXAuanNvbi5kciA9PSBudWxsIHx8IGNvbXAuanNvbi5wbGluayA9PSBudWxsICkge1xuICAgICAgICAgICAgLy8gSXQncyBhIG5vZGVfbW9kdWxlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGNvbXAgIT0gbnVsbCAmJiBjb21wLmxvbmdOYW1lID09PSBhcGkucGFja2FnZU5hbWUgJiZcbiAgICAgICAgICAgIHJlc29sdmVkUmVxdWVzdC5pbmRleE9mKFBhdGguc2VwICsgJ3ByZXJlbmRlci5kaScpID49IDApIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEl0J3MgYSBzeXN0ZW0gdGhpbmcgKC5pZSB1dGlsLCBmcy4uLilcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gTm9kZSBjb3VsZG4ndCBmaW5kIGl0LCBzbyBpdCBtdXN0IGJlIHVzZXItYWxpYXNlZFxuICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXTtcbiAgICAgIH1cbiAgfVxuICAvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgQ29tcGlsZURvbmVQbHVnaW4oKSk7XG5cbiAgY2hhbmdlU3BsaXRDaHVua3MocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuICBjaGFuZ2VMb2FkZXJzKHBhcmFtLCB3ZWJwYWNrQ29uZmlnKTtcblxuICBpZiAocGFyYW0uc3NyKSB7XG4gICAgd2VicGFja0NvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihhcGkpLnNzciA9IHBhcmFtLnNzcjtcbiAgfVxuXG5cbiAgYXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyLnBpcGUoXG4gICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIobWdyID0+IG1nciAhPSBudWxsKSxcbiAgICBvcC5jb25jYXRNYXAobWdyID0+IHtcbiAgICAgIHJldHVybiBtZ3IhLnJ1bkVhY2g8V2VwYWNrQ29uZmlnSGFuZGxlcj4oKGZpbGUsIGxhc3RSZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICAgICAgaWYgKGhhbmRsZXIud2VicGFja0NvbmZpZylcbiAgICAgICAgICByZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuICAgICAgICByZXR1cm4gbGFzdFJlc3VsdDtcbiAgICAgIH0pO1xuICAgIH0pLFxuICAgIG9wLnRha2UoMSlcbiAgKS50b1Byb21pc2UoKTtcbiAgY29uc3Qgd2ZuYW1lID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsXG4gICAgYHdlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLiR7Kytjb250ZXh0LndlYnBhY2tSdW5Db3VudH0uanNgKTtcbiAgZnMud3JpdGVGaWxlU3luYyh3Zm5hbWUsIHByaW50Q29uZmlnKHdlYnBhY2tDb25maWcpKTtcbiAgY29uc29sZS5sb2coYElmIHlvdSBhcmUgd29uZGVyaW5nIHdoYXQga2luZCBvZiBXZWJhcGNrIGNvbmZpZyBmaWxlIGlzIHVzZWQgaW50ZXJuYWxseSwgY2hlY2tvdXQgJHtjaGFsay5ibHVlQnJpZ2h0KHdmbmFtZSl9YCk7XG4gIHJldHVybiB3ZWJwYWNrQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VMb2FkZXJzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbikge1xuICAvLyBjb25zdCBub1BhcnNlID0gKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZE9wdGltaXplckV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcbiAgLy8gbm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuXG4gIC8vIGNvbnN0IGRldk1vZGUgPSB3ZWJwYWNrQ29uZmlnLm1vZGUgPT09ICdkZXZlbG9wbWVudCc7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSBbXTtcbiAgfVxuICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcy51bnNoaWZ0KFxuICAgIC4uLnByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpLFxuICAgIFBhdGguam9pbihfX2Rpcm5hbWUsICdsb2FkZXJzJykpO1xuICBpZiAoIXdlYnBhY2tDb25maWcubW9kdWxlKSB7XG4gICAgd2VicGFja0NvbmZpZy5tb2R1bGUgPSB7cnVsZXM6IFtdfTtcbiAgfVxuICBjb25zdCBydWxlcyA9IHdlYnBhY2tDb25maWcubW9kdWxlLnJ1bGVzIGFzIHdlYnBhY2suUnVsZVtdO1xuICBsZXQgaGFzVXJsTG9hZGVyID0gZmFsc2U7XG4gIGxldCBoYXNIdG1sTG9hZGVyID0gZmFsc2U7XG4gIGxldCBmaWxlTG9hZGVyUnVsZUlkeDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHVybExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcbiAgICB1c2U6IFt7XG4gICAgICBsb2FkZXI6ICd1cmwtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuICAgICAgICBmYWxsYmFjazogJ0B3Zmgvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG4gICAgICB9XG4gICAgfV1cbiAgfTtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLmZvckVhY2goKHJ1bGUsIHJ1bGVJZHgpID0+IHtcbiAgICBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuICAgIGlmIChydWxlLnVzZSkge1xuICAgICAgY29uc3QgaWR4ID0gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5maW5kSW5kZXgocnVsZVNldCA9PiBydWxlU2V0LmxvYWRlciA9PT0gJ3Bvc3Rjc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5zcGxpY2UoaWR4ICsgMSwgMCwge1xuICAgICAgICAgIGxvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5wdXNoKHtsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcid9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbmd1bGFyIDggZG9lc24ndCBoYXZlIGxvYWRlciBmb3IgSFRNTFxuICAgIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcbiAgICAgIGhhc0h0bWxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCBodG1sTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ2ZpbGUtbG9hZGVyJykge1xuICAgICAgZmlsZUxvYWRlclJ1bGVJZHggPSBydWxlSWR4O1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB7XG4gICAgICAgIHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICB1c2U6IFt7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcid9XVxuICAgICAgfSk7XG5cbiAgICB9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAndXJsLWxvYWRlcicpIHtcbiAgICAgIGhhc1VybExvYWRlciA9IHRydWU7XG4gICAgICBPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKHJ1bGUsIHVybExvYWRlclJ1bGUpO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkuaW5kZXhPZignXFxcXC5zY3NzJykgPj0gMCAmJiBydWxlLnVzZSkge1xuICAgICAgY29uc3QgdXNlID0gKHJ1bGUudXNlIGFzIEFycmF5PHtba2V5OiBzdHJpbmddOiBhbnksIGxvYWRlcjogc3RyaW5nfT4pO1xuICAgICAgY29uc3QgaW5zZXJ0SWR4ID0gdXNlLmZpbmRJbmRleChpdGVtID0+IGl0ZW0ubG9hZGVyID09PSAnc2Fzcy1sb2FkZXInKTtcbiAgICAgIGlmIChpbnNlcnRJZHggPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc2Fzcy1sb2FkZXIgaXMgbm90IGZvdW5kJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZWVkU291cmNlTWFwID0gdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXA7XG4gICAgICAvLyByZXNvbHZlLXVybC1sb2FkZXI6IFwic291cmNlIG1hcHMgbXVzdCBiZSBlbmFibGVkIG9uIGFueSBwcmVjZWRpbmcgbG9hZGVyXCJcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaG9sbG93YXkvcmVzb2x2ZS11cmwtbG9hZGVyXG4gICAgICB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcCA9IHRydWU7XG4gICAgICB1c2Uuc3BsaWNlKGluc2VydElkeCwgMCwge1xuICAgICAgICBsb2FkZXI6ICdyZXNvbHZlLXVybC1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBuZWVkU291cmNlTWFwXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5sZXNzJC8nICYmIHJ1bGUudXNlKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZUl0ZW0gb2YgcnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pIHtcbiAgICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyID09PSAnbGVzcy1sb2FkZXInICYmIF8uaGFzKHVzZUl0ZW0sICdvcHRpb25zLnBhdGhzJykpIHtcbiAgICAgICAgICBkZWxldGUgKHVzZUl0ZW0ub3B0aW9ucyBhcyBhbnkpLnBhdGhzO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAd2ZoL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWhhc1VybExvYWRlcikge1xuICAgIGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuICAgIGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuICAgIHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHVybExvYWRlclJ1bGUpO1xuICB9XG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIC8vIHRlc3Q6IC9cXC4oPzpuZ2ZhY3RvcnlcXC5qc3xjb21wb25lbnRcXC5odG1sKSQvLFxuICAgIHRlc3Q6IGZpbGUgPT4ge1xuICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiAhIWFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICB9LFxuICAgIHVzZTogW3tsb2FkZXI6ICdAd2ZoL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlcid9XVxuICB9KTtcblxuICBydWxlcy51bnNoaWZ0KHtcbiAgICBvbmVPZjogW1xuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5qYWRlJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICB7bG9hZGVyOiAnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2xpYi9qYWRlLXRvLWh0bWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5tZCQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAge2xvYWRlcjogJ0B3Zmgvd2VicGFjazItYnVpbGRlci9saWIvbWFya2Rvd24tbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC50eHQkLyxcbiAgICAgIHVzZToge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIH0sIHtcbiAgICAgIHRlc3Q6IC9cXC4oeWFtbHx5bWwpJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2pzb24tbG9hZGVyJ30sXG4gICAgICAgIHtsb2FkZXI6ICd5YW1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfV1cbiAgfSk7XG5cbiAgaWYgKCFoYXNIdG1sTG9hZGVyKSB7XG4gICAgcnVsZXNbMF0ub25lT2YgJiYgcnVsZXNbMF0ub25lT2YucHVzaChodG1sTG9hZGVyUnVsZSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gbm90QW5ndWxhckpzKGZpbGU6IHN0cmluZykge1xuLy8gXHRpZiAoIWZpbGUuZW5kc1dpdGgoJy5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdzdHlsZS5qcycpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0aWYgKG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdC8vIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuLy8gXHQvLyBpZiAocGsgJiYgcGsuZHIpIHtcbi8vIFx0Ly8gXHRyZXR1cm4gdHJ1ZTtcbi8vIFx0Ly8gfVxuLy8gXHRjb25zb2xlLmxvZygnYmFiZWw6ICcsIGZpbGUpO1xuLy8gXHRyZXR1cm4gdHJ1ZTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlU3BsaXRDaHVua3MocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogYW55KSB7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbiA9PSBudWxsKVxuICAgIHJldHVybjsgLy8gU1NSJyBXZWJwYWNrIGNvbmZpZyBkb2VzIG5vdCBoYXMgdGhpcyBwcm9wZXJ0eVxuICBjb25zdCBvbGRWZW5kb3JUZXN0RnVuYyA9IF8uZ2V0KHdlYnBhY2tDb25maWcsICdvcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHMudmVuZG9yLnRlc3QnKTtcblxuICBpZiAob2xkVmVuZG9yVGVzdEZ1bmMpIHtcbiAgICBjb25zdCBjYWNoZUdyb3Vwczoge1trZXk6IHN0cmluZ106IHdlYnBhY2suT3B0aW9ucy5DYWNoZUdyb3Vwc09wdGlvbnN9ID0gd2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHM7XG4gICAgY2FjaGVHcm91cHMudmVuZG9yLnRlc3QgPSB2ZW5kb3JUZXN0O1xuICAgIGNhY2hlR3JvdXBzLmxhenlWZW5kb3IgPSB7XG4gICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgIHRlc3Q6IHZlbmRvclRlc3QsXG4gICAgICBwcmlvcml0eTogMVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB2ZW5kb3JUZXN0KG1vZHVsZTogYW55LCBjaHVua3M6IEFycmF5PHsgbmFtZTogc3RyaW5nIH0+KSB7XG4gICAgY29uc3QgbWF5YmVWZW5kb3IgPSBvbGRWZW5kb3JUZXN0RnVuYyhtb2R1bGUsIGNodW5rcyk7XG4gICAgaWYgKCFtYXliZVZlbmRvcilcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvdXJjZSA9IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uID8gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24oKSA6ICcnO1xuICAgIC8vIGNvbnNvbGUubG9nKGB2ZW5kb3IgdGVzdCwgcmVzb3VyY2U6ICR7cmVzb3VyY2V9LCBjaHVua3M6ICR7Y2h1bmtzLm1hcCggYyA9PiBjLm5hbWUpfWApO1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlKTtcbiAgICByZXR1cm4gcGsgPT0gbnVsbCB8fCAocGsuanNvbi5kciA9PSBudWxsICYmIHBrLmpzb24ucGxpbmsgPT0gbnVsbCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuICB2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuICB2YXIgb3V0ID0gJ3tcXG4nO1xuICBfLmZvck93bihjLCAodmFsdWU6IGFueSwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgb3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcbiAgfSk7XG4gIG91dCArPSBpbmRlbnQgKyAnfSc7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG4gIHZhciBvdXQgPSAnJztcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgaWYgKF8uaXNTdHJpbmcodmFsdWUpIHx8IF8uaXNOdW1iZXIodmFsdWUpIHx8IF8uaXNCb29sZWFuKHZhbHVlKSkge1xuICAgIG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIG91dCArPSAnW1xcbic7XG4gICAgKHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcbiAgfSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuICB9IGVsc2UgaWYgKF8uaXNPYmplY3QodmFsdWUpKSB7XG4gICAgY29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgIGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICBvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1JbmRleEh0bWwoY29udGV4dDogQnVpbGRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIHJldHVybiB0cmFuc2Zvcm1IdG1sKGNvbnRlbnQsIGNvbnRleHQubmdCdWlsZE9wdGlvbi5icm93c2VyT3B0aW9ucywgc3JjVXJsID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybCk7XG4gICAgICBpZiAobWF0Y2ggJiYgY29udGV4dC5pbmxpbmVBc3NldHMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBjb250ZXh0LmlubGluZUFzc2V0cy5nZXQobWF0Y2hbMV0pO1xuICAgICAgICByZXR1cm4gc21VcmwucmVtb3ZlRnJvbShzb3VyY2UhKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGUpO1xuICAgIHRocm93IGU7XG4gIH1cbn1cblxuIl19