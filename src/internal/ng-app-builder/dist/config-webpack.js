"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console max-line-length max-classes-per-file */
const webpack_1 = require("@ngtools/webpack");
// import ts from 'typescript';
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const util_1 = require("util");
const __api_1 = tslib_1.__importDefault(require("__api"));
const ng_ts_replace_1 = tslib_1.__importDefault(require("./ng-ts-replace"));
const chunk_info_1 = tslib_1.__importDefault(require("./plugins/chunk-info"));
const gzip_size_1 = tslib_1.__importDefault(require("./plugins/gzip-size"));
const index_html_plugin_1 = require("./plugins/index-html-plugin");
const read_hook_vfshost_1 = tslib_1.__importDefault(require("./utils/read-hook-vfshost"));
const smUrl = require('source-map-url');
const log = require('log4js').getLogger('config-webpack');
function changeWebpackConfig(context, param, webpackConfig, drcpConfigSetting) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const api: typeof __api = require('__api'); // force to defer loading api until DRCP config is ready
        console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
        // if (webpackConfig.resolve && webpackConfig.resolve.mainFields) {
        //   webpackConfig.resolve.mainFields = ['browser', 'main', 'module'];
        // }
        if (webpackConfig.plugins == null) {
            webpackConfig.plugins = [];
        }
        if (webpackConfig.devServer) {
            const devServer = webpackConfig.devServer;
            const origin = webpackConfig.devServer.before;
            devServer.before = function before(app) {
                // To elimiate HMR web socket issue:
                //   Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
                // at ServerResponse.setHeader (_http_outgoing.js:470:11)
                // at Array.write (/Users/liujing/bk/credit-appl/node_modules/finalhandler/index.js:285:9)
                // at listener (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:169:15)
                // at onFinish (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:100:5)
                // at callback (/Users/liujing/bk/credit-appl/node_modules/ee-first/index.js:55:10)
                app.use((req, res, next) => {
                    const old = res.setHeader;
                    // const oldEnd = res.end;
                    res.setHeader = function () {
                        try {
                            old.apply(res, arguments);
                        }
                        catch (e) {
                            if (e.code === 'ERR_HTTP_HEADERS_SENT') {
                                log.warn('Cannot set headers after they are sent to the client');
                            }
                            else {
                                throw e;
                            }
                        }
                    };
                    // res.end = function() {
                    //   if (res.finished) {
                    //     log.warn('Cannot call response.end() after they are sent to the client');
                    //     return;
                    //   }
                    // };
                    next();
                });
                if (origin)
                    origin.apply(this, arguments);
            };
            devServer.compress = true;
            if (devServer.headers == null)
                devServer.headers = {};
            // CORS enablement
            devServer.headers['Access-Control-Allow-Origin'] = '*';
            devServer.headers['Access-Control-Allow-Headers'] = '*';
        }
        if (_.get(param, 'builderConfig.options.drcpArgs.report') ||
            param.browserOptions.drcpArgs.report || (param.browserOptions.drcpArgs.openReport)) {
            webpackConfig.plugins.push(new chunk_info_1.default());
        }
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
                const hooker = new ng_ts_replace_1.default(param);
                ngCompilerPlugin.options.host = new read_hook_vfshost_1.default(compiler.inputFileSystem, hooker.hookFunc);
                // Due to https://github.com/angular/angular-cli/pull/12969
                ngCompilerPlugin.options.directTemplateLoading = false;
                // TODO: Once Angular cli (v8.1.x) upgrades to allow changing directTemplateLoading, we should remove
                // below hack code.
                ngCompilerPlugin._transformers.splice(0);
                ngCompilerPlugin._makeTransformers();
                compiler.hooks.watchRun.tapPromise('ts-read-hook', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    hooker.clear();
                }));
                compiler.hooks.done.tapPromise('ts-read-hook', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    hooker.logFileCount();
                }));
            }
        }());
        if (!drcpConfigSetting.devMode) {
            console.log('Build in production mode');
            webpackConfig.plugins.push(new gzip_size_1.default());
        }
        if (webpackConfig.target !== 'node') {
            // Since Angular 8.1.0, there is no indexHtmlPlugin used in Webpack configuration
            // webpackConfig.plugins.push(new IndexHtmlPlugin({
            //     indexFile: Path.resolve(param.browserOptions.index),
            //     inlineChunkNames: ['runtime']
            //   }));
            webpackConfig.plugins.push(new (class DrcpBuilderAssetsPlugin {
                apply(compiler) {
                    compiler.hooks.emit.tapPromise('drcp-builder-assets', (compilation) => tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                            const e = require.resolve(request);
                            const comp = __api_1.default.findPackageByFile(e);
                            if (comp == null || comp.dr == null) {
                                // It's a node_module
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
        }
        yield __api_1.default.config.configHandlerMgr().runEach((file, lastResult, handler) => {
            if (handler.webpackConfig)
                return handler.webpackConfig(webpackConfig);
            return lastResult;
        });
        const wfname = `dist/webpack-${param.ssr ? 'ssr' : 'browser'}.config.${++context.webpackRunCount}.js`;
        fs.writeFileSync(wfname, printConfig(webpackConfig));
        console.log(`If you are wondering what kind of Webapck config file is used internally, checkout ${wfname}`);
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
    webpackConfig.resolveLoader.modules.unshift(Path.join(__dirname, 'loaders'));
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
                    fallback: '@dr-core/webpack2-builder/dist/loaders/dr-file-loader'
                }
            }]
    };
    const htmlLoaderRule = {
        test: /\.html$/,
        use: [
            { loader: 'raw-loader' }
            // {loader: 'ng-html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
            // {loader: '@dr/translate-generator'},
            // {loader: '@dr/template-builder'}
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
        // if (test instanceof RegExp && test.toString() === '/\\.js$/' && rule.use &&
        //   (rule.use as webpack.RuleSetUseItem[]).some((item) =>
        //     /@angular-devkit[/\\]build-optimizer[/\\].*[/\\]webpack-loader/.test(
        //     (item as webpack.RuleSetLoader).loader!))) {
        //     let origTest: (p: string) => boolean;
        //     if (rule.test instanceof RegExp) {
        //       origTest = (path: string) => (rule.test as RegExp).test(path);
        //     } else if (typeof rule.test === 'function') {
        //       origTest = rule.test;
        //     } else {
        //       throw new Error('Does not support module.rule\'s test condition type for @angular-devkit/build-optimizer, inform the author to update config-webpack.ts');
        //     }
        //     rule.test = (path: string) => {
        //       if (origTest(path)) {
        //         const nPath = path.replace(/\\/g, '/');
        //         return noParse.every((exclude => !nPath.includes(exclude)));
        //       }
        //       return false;
        //     };
        // }
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
                use: [{ loader: '@dr-core/webpack2-builder/dist/loaders/dr-file-loader' }]
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
            // rule.use.push({loader: '@dr-core/webpack2-builder/lib/debug-loader', options: {id: 'less loaders'}});
        }
        else if (test instanceof RegExp && test.toString() === '/\\.less$/' && rule.use) {
            for (const useItem of rule.use) {
                if (useItem.loader === 'less-loader' && _.has(useItem, 'options.paths')) {
                    delete useItem.options.paths;
                    break;
                }
            }
            // rule.use.push({loader: '@dr-core/webpack2-builder/lib/debug-loader', options: {id: 'less loaders'}});
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
        use: [{ loader: '@dr-core/ng-app-builder/dist/ng-aot-assets/ng-aot-assets-loader' }]
    });
    rules.unshift({
        oneOf: [
            {
                test: /\.jade$/,
                use: [
                    { loader: 'html-loader', options: { attrs: 'img:src' } },
                    { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
                    // {loader: '@dr/translate-generator'},
                    { loader: '@dr-core/webpack2-builder/lib/jade-to-html-loader' }
                ]
            },
            {
                test: /\.md$/,
                use: [
                    { loader: 'html-loader', options: { attrs: 'img:src' } },
                    { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
                    { loader: '@dr-core/webpack2-builder/lib/markdown-loader' }
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtCQUErQjtBQUMvQiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQkFBZ0M7QUFHaEMsMERBQXdCO0FBQ3hCLDRFQUEyQztBQUczQyw4RUFBbUQ7QUFDbkQsNEVBQTJDO0FBQzNDLG1FQUE0RDtBQUM1RCwwRkFBcUQ7QUFDckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBUzFELFNBQThCLG1CQUFtQixDQUFDLE9BQXVCLEVBQUUsS0FBc0IsRUFBRSxhQUFvQyxFQUNySSxpQkFBcUM7O1FBQ3JDLHVHQUF1RztRQUN2RyxPQUFPLENBQUMsR0FBRyxDQUFDLDhEQUE4RCxDQUFDLENBQUM7UUFFNUUsbUVBQW1FO1FBQ25FLHNFQUFzRTtRQUN0RSxJQUFJO1FBQ0osSUFBSSxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUNqQyxhQUFhLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUM1QjtRQUNELElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUMzQixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO1lBQzFDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzlDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxNQUFNLENBQUMsR0FBZ0I7Z0JBQ2pELG9DQUFvQztnQkFDcEMsd0ZBQXdGO2dCQUN4Rix5REFBeUQ7Z0JBQ3pELDBGQUEwRjtnQkFDMUYsdUZBQXVGO2dCQUN2RixzRkFBc0Y7Z0JBQ3RG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d0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLEtBQUssSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDL0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFPLENBQUMsQ0FBQztpQkFDbEM7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUM7Q0FBQTtBQWRELGdEQWNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2NvbmZpZy13ZWJwYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCB7IEFuZ3VsYXJDb21waWxlclBsdWdpbiB9IGZyb20gJ0BuZ3Rvb2xzL3dlYnBhY2snO1xuLy8gaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuL25nLXRzLXJlcGxhY2UnO1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQgfSBmcm9tICcuL25nL2J1aWxkZXItY29udGV4dCc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgQ2h1bmtJbmZvUGx1Z2luIGZyb20gJy4vcGx1Z2lucy9jaHVuay1pbmZvJztcbmltcG9ydCBnemlwU2l6ZSBmcm9tICcuL3BsdWdpbnMvZ3ppcC1zaXplJztcbmltcG9ydCB7IHRyYW5zZm9ybUh0bWwgfSBmcm9tICcuL3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IFJlYWRIb29rSG9zdCBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignY29uZmlnLXdlYnBhY2snKTtcbmltcG9ydCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuLy8gaW1wb3J0IHNldHVwQXNzZXRzIGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcbmV4cG9ydCBpbnRlcmZhY2UgV2VwYWNrQ29uZmlnSGFuZGxlciB7XG4gIC8qKiBAcmV0dXJucyB3ZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3IgUHJvbWlzZSAqL1xuICB3ZWJwYWNrQ29uZmlnKG9yaWdpbmFsQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pOlxuICAgIFByb21pc2U8d2VicGFjay5Db25maWd1cmF0aW9uPiB8IHdlYnBhY2suQ29uZmlndXJhdGlvbiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZVdlYnBhY2tDb25maWcoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcbiAgZHJjcENvbmZpZ1NldHRpbmc6IHtkZXZNb2RlOiBib29sZWFufSkge1xuICAvLyBjb25zdCBhcGk6IHR5cGVvZiBfX2FwaSA9IHJlcXVpcmUoJ19fYXBpJyk7IC8vIGZvcmNlIHRvIGRlZmVyIGxvYWRpbmcgYXBpIHVudGlsIERSQ1AgY29uZmlnIGlzIHJlYWR5XG4gIGNvbnNvbGUubG9nKCc+Pj4+Pj4+Pj4+Pj4+Pj4+PiBjaGFuZ2VXZWJwYWNrQ29uZmlnID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4nKTtcblxuICAvLyBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlICYmIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tYWluRmllbGRzKSB7XG4gIC8vICAgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1haW5GaWVsZHMgPSBbJ2Jyb3dzZXInLCAnbWFpbicsICdtb2R1bGUnXTtcbiAgLy8gfVxuICBpZiAod2VicGFja0NvbmZpZy5wbHVnaW5zID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPSBbXTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIpIHtcbiAgICBjb25zdCBkZXZTZXJ2ZXIgPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcjtcbiAgICBjb25zdCBvcmlnaW4gPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlci5iZWZvcmU7XG4gICAgZGV2U2VydmVyLmJlZm9yZSA9IGZ1bmN0aW9uIGJlZm9yZShhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICAvLyBUbyBlbGltaWF0ZSBITVIgd2ViIHNvY2tldCBpc3N1ZTpcbiAgICAgIC8vICAgRXJyb3IgW0VSUl9IVFRQX0hFQURFUlNfU0VOVF06IENhbm5vdCBzZXQgaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnRcbiAgICAgIC8vIGF0IFNlcnZlclJlc3BvbnNlLnNldEhlYWRlciAoX2h0dHBfb3V0Z29pbmcuanM6NDcwOjExKVxuICAgICAgLy8gYXQgQXJyYXkud3JpdGUgKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9maW5hbGhhbmRsZXIvaW5kZXguanM6Mjg1OjkpXG4gICAgICAvLyBhdCBsaXN0ZW5lciAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL29uLWZpbmlzaGVkL2luZGV4LmpzOjE2OToxNSlcbiAgICAgIC8vIGF0IG9uRmluaXNoICgvVXNlcnMvbGl1amluZy9iay9jcmVkaXQtYXBwbC9ub2RlX21vZHVsZXMvb24tZmluaXNoZWQvaW5kZXguanM6MTAwOjUpXG4gICAgICAvLyBhdCBjYWxsYmFjayAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL2VlLWZpcnN0L2luZGV4LmpzOjU1OjEwKVxuXG4gICAgICBhcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBvbGQgPSByZXMuc2V0SGVhZGVyO1xuICAgICAgICAvLyBjb25zdCBvbGRFbmQgPSByZXMuZW5kO1xuICAgICAgICByZXMuc2V0SGVhZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9sZC5hcHBseShyZXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VSUl9IVFRQX0hFQURFUlNfU0VOVCcpIHtcbiAgICAgICAgICAgICAgbG9nLndhcm4oJ0Nhbm5vdCBzZXQgaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHJlcy5lbmQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gICBpZiAocmVzLmZpbmlzaGVkKSB7XG4gICAgICAgIC8vICAgICBsb2cud2FybignQ2Fubm90IGNhbGwgcmVzcG9uc2UuZW5kKCkgYWZ0ZXIgdGhleSBhcmUgc2VudCB0byB0aGUgY2xpZW50Jyk7XG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyB9O1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICAgIGlmIChvcmlnaW4pXG4gICAgICAgIG9yaWdpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgZGV2U2VydmVyLmNvbXByZXNzID0gdHJ1ZTtcbiAgICBpZiAoZGV2U2VydmVyLmhlYWRlcnMgPT0gbnVsbClcbiAgICAgIGRldlNlcnZlci5oZWFkZXJzID0ge307XG4gICAgLy8gQ09SUyBlbmFibGVtZW50XG4gICAgZGV2U2VydmVyLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgIGRldlNlcnZlci5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJ10gPSAnKic7XG4gIH1cblxuICBpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0JykgfHxcbiAgcGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0IHx8KHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLm9wZW5SZXBvcnQpKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2goXG4gICAgICBuZXcgQ2h1bmtJbmZvUGx1Z2luKClcbiAgICApO1xuICB9XG5cbiAgLy8gd2VicGFja0NvbmZpZy5tb2R1bGUubm9QYXJzZSA9IChmaWxlOiBzdHJpbmcpID0+IG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKTtcblxuICAvLyBDaGFuZ2UgQW5ndWxhckNvbXBpbGVyUGx1Z2luJ3Mgb3B0aW9uXG4gIGNvbnN0IG5nQ29tcGlsZXJQbHVnaW4gPSB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMuZmluZCgocGx1Z2luOiBhbnkpID0+IHtcbiAgICByZXR1cm4gKHBsdWdpbiBpbnN0YW5jZW9mIEFuZ3VsYXJDb21waWxlclBsdWdpbik7XG4gIH0pIGFzIEFuZ3VsYXJDb21waWxlclBsdWdpbjtcbiAgaWYgKG5nQ29tcGlsZXJQbHVnaW4gPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBBbmd1bGFyQ29tcGlsZXJQbHVnaW4nKTtcbiAgLy8gSGFjayBhbmd1bGFyL3BhY2thZ2VzL25ndG9vbHMvd2VicGFjay9zcmMvYW5ndWxhcl9jb21waWxlcl9wbHVnaW4udHMgISEhIVxuICAvLyBjb25zdCB0cmFuc2Zvcm1lcnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fdHJhbnNmb3JtZXJzO1xuICAvLyB0cmFuc2Zvcm1lcnMudW5zaGlmdCgoY29udGV4dCkgPT4ge1xuICAvLyAgIHJldHVybiAodHNTcmMpID0+IHtcbiAgLy8gICAgIGNvbnNvbGUubG9nKCdoZWxsb3c6JywgdHNTcmMuZmlsZU5hbWUpO1xuICAvLyAgICAgcmV0dXJuIHRzU3JjO1xuICAvLyAgIH07XG4gIC8vIH0pO1xuICAod2VicGFja0NvbmZpZy5wbHVnaW5zIGFzIGFueVtdKS51bnNoaWZ0KG5ldyBjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb25zdCBob29rZXIgPSBuZXcgVFNSZWFkSG9va2VyKHBhcmFtKTtcbiAgICAgIG5nQ29tcGlsZXJQbHVnaW4ub3B0aW9ucy5ob3N0ID0gbmV3IFJlYWRIb29rSG9zdCgoY29tcGlsZXIgYXMgYW55KS5pbnB1dEZpbGVTeXN0ZW0sIGhvb2tlci5ob29rRnVuYyk7XG4gICAgICAvLyBEdWUgdG8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvcHVsbC8xMjk2OVxuICAgICAgbmdDb21waWxlclBsdWdpbi5vcHRpb25zLmRpcmVjdFRlbXBsYXRlTG9hZGluZyA9IGZhbHNlO1xuICAgICAgLy8gVE9ETzogT25jZSBBbmd1bGFyIGNsaSAodjguMS54KSB1cGdyYWRlcyB0byBhbGxvdyBjaGFuZ2luZyBkaXJlY3RUZW1wbGF0ZUxvYWRpbmcsIHdlIHNob3VsZCByZW1vdmVcbiAgICAgIC8vIGJlbG93IGhhY2sgY29kZS5cbiAgICAgICgobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl90cmFuc2Zvcm1lcnMgYXMgYW55W10pLnNwbGljZSgwKTtcbiAgICAgIChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX21ha2VUcmFuc2Zvcm1lcnMoKTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmNsZWFyKCk7XG4gICAgICB9KTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBob29rZXIubG9nRmlsZUNvdW50KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0oKSk7XG5cbiAgaWYgKCFkcmNwQ29uZmlnU2V0dGluZy5kZXZNb2RlKSB7XG4gICAgY29uc29sZS5sb2coJ0J1aWxkIGluIHByb2R1Y3Rpb24gbW9kZScpO1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBnemlwU2l6ZSgpKTtcbiAgfVxuXG4gIGlmICh3ZWJwYWNrQ29uZmlnLnRhcmdldCAhPT0gJ25vZGUnKSB7XG4gICAgLy8gU2luY2UgQW5ndWxhciA4LjEuMCwgdGhlcmUgaXMgbm8gaW5kZXhIdG1sUGx1Z2luIHVzZWQgaW4gV2VicGFjayBjb25maWd1cmF0aW9uXG4gICAgLy8gd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IEluZGV4SHRtbFBsdWdpbih7XG4gICAgLy8gICAgIGluZGV4RmlsZTogUGF0aC5yZXNvbHZlKHBhcmFtLmJyb3dzZXJPcHRpb25zLmluZGV4KSxcbiAgICAvLyAgICAgaW5saW5lQ2h1bmtOYW1lczogWydydW50aW1lJ11cbiAgICAvLyAgIH0pKTtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgKGNsYXNzIERyY3BCdWlsZGVyQXNzZXRzUGx1Z2luIHtcbiAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtYnVpbGRlci1hc3NldHMnLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgICAgY29uc3QgYXNzZXRzOiB7W2Fzc2V0c1BhdGg6IHN0cmluZ106IGFueX0gPSBjb21waWxhdGlvbi5hc3NldHM7XG4gICAgICAgICAgZm9yIChjb25zdCBhc3NldHNQYXRoIG9mIE9iamVjdC5rZXlzKGFzc2V0cykpIHtcbiAgICAgICAgICAgIC8vIGxvZy53YXJuKCdpcyAnLCBhc3NldHNQYXRoKTtcbiAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSooXFwuanMpJC8uZXhlYyhhc3NldHNQYXRoKTtcbiAgICAgICAgICAgIGlmICghbWF0Y2gpXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgLy8gbG9nLndhcm4oJ2xvb2t1cCBhc3NldHMnLCBtYXRjaFsxXSk7XG4gICAgICAgICAgICBpZiAoY29udGV4dC5pbmxpbmVBc3NldHMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgICAgICBjb250ZXh0LmlubGluZUFzc2V0cy5zZXQobWF0Y2hbMV0sIGFzc2V0c1thc3NldHNQYXRoXS5zb3VyY2UoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KSgpKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIGlzIGNvbmRpdGlvbiBvZiBTZXJ2ZXIgc2lkZSByZW5kZXJpbmdcbiAgICAvLyBSZWZlciB0byBhbmd1bGFyLWNsaS9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF9hbmd1bGFyL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL3NlcnZlci50c1xuICAgIGlmIChwYXJhbS5icm93c2VyT3B0aW9ucy5idW5kbGVEZXBlbmRlbmNpZXMgPT09ICdub25lJykge1xuICAgICAgd2VicGFja0NvbmZpZy5leHRlcm5hbHMgPSBbXG4gICAgICAgIC9eQGFuZ3VsYXIvLFxuICAgICAgICAoXzogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAvLyBBYnNvbHV0ZSAmIFJlbGF0aXZlIHBhdGhzIGFyZSBub3QgZXh0ZXJuYWxzXG4gICAgICAgIGlmICgvXlxcLnswLDJ9XFwvLy50ZXN0KHJlcXVlc3QpIHx8IFBhdGguaXNBYnNvbHV0ZShyZXF1ZXN0KSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIHRoZSBtb2R1bGUgdmlhIE5vZGVcbiAgICAgICAgICBjb25zdCBlID0gcmVxdWlyZS5yZXNvbHZlKHJlcXVlc3QpO1xuICAgICAgICAgIGNvbnN0IGNvbXAgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZSk7XG4gICAgICAgICAgaWYgKGNvbXAgPT0gbnVsbCB8fCBjb21wLmRyID09IG51bGwgKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgbm9kZV9tb2R1bGVcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgc3lzdGVtIHRoaW5nICguaWUgdXRpbCwgZnMuLi4pXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIE5vZGUgY291bGRuJ3QgZmluZCBpdCwgc28gaXQgbXVzdCBiZSB1c2VyLWFsaWFzZWRcbiAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF07XG4gICAgICB9XG4gIH1cbiAgLy8gd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IENvbXBpbGVEb25lUGx1Z2luKCkpO1xuXG4gIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtLCB3ZWJwYWNrQ29uZmlnKTtcbiAgY2hhbmdlTG9hZGVycyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG5cbiAgaWYgKHBhcmFtLnNzcikge1xuICAgIHdlYnBhY2tDb25maWcuZGV2dG9vbCA9ICdzb3VyY2UtbWFwJztcbiAgfVxuXG4gIGF3YWl0IGFwaS5jb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8V2VwYWNrQ29uZmlnSGFuZGxlcj4oKGZpbGUsIGxhc3RSZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci53ZWJwYWNrQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIud2VicGFja0NvbmZpZyh3ZWJwYWNrQ29uZmlnKTtcbiAgICByZXR1cm4gbGFzdFJlc3VsdDtcbiAgfSk7XG5cbiAgY29uc3Qgd2ZuYW1lID0gYGRpc3Qvd2VicGFjay0ke3BhcmFtLnNzciA/ICdzc3InIDogJ2Jyb3dzZXInfS5jb25maWcuJHsrK2NvbnRleHQud2VicGFja1J1bkNvdW50fS5qc2A7XG4gIGZzLndyaXRlRmlsZVN5bmMod2ZuYW1lLCBwcmludENvbmZpZyh3ZWJwYWNrQ29uZmlnKSk7XG4gIGNvbnNvbGUubG9nKGBJZiB5b3UgYXJlIHdvbmRlcmluZyB3aGF0IGtpbmQgb2YgV2ViYXBjayBjb25maWcgZmlsZSBpcyB1c2VkIGludGVybmFsbHksIGNoZWNrb3V0ICR7d2ZuYW1lfWApO1xuICByZXR1cm4gd2VicGFja0NvbmZpZztcbn1cblxuZnVuY3Rpb24gY2hhbmdlTG9hZGVycyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pIHtcbiAgLy8gY29uc3Qgbm9QYXJzZSA9IChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnYnVpbGRPcHRpbWl6ZXJFeGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG4gIC8vIG5vUGFyc2UucHVzaCguLi5hcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnYnVpbGQtb3B0aW1pemVyOmV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcblxuICAvLyBjb25zdCBkZXZNb2RlID0gd2VicGFja0NvbmZpZy5tb2RlID09PSAnZGV2ZWxvcG1lbnQnO1xuICBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPSB7fTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gW107XG4gIH1cbiAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMudW5zaGlmdChQYXRoLmpvaW4oX19kaXJuYW1lLCAnbG9hZGVycycpKTtcbiAgaWYgKCF3ZWJwYWNrQ29uZmlnLm1vZHVsZSkge1xuICAgIHdlYnBhY2tDb25maWcubW9kdWxlID0ge3J1bGVzOiBbXX07XG4gIH1cbiAgY29uc3QgcnVsZXMgPSB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ydWxlcyBhcyB3ZWJwYWNrLlJ1bGVbXTtcbiAgbGV0IGhhc1VybExvYWRlciA9IGZhbHNlO1xuICBsZXQgaGFzSHRtbExvYWRlciA9IGZhbHNlO1xuICBsZXQgZmlsZUxvYWRlclJ1bGVJZHg6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICBjb25zdCB1cmxMb2FkZXJSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC4oanBnfHBuZ3xnaWYpJC8sXG4gICAgdXNlOiBbe1xuICAgICAgbG9hZGVyOiAndXJsLWxvYWRlcicsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGxpbWl0OiAxMDAwMCwgLy8gPDEwayAsdXNlIGJhc2U2NCBmb3JtYXRcbiAgICAgICAgZmFsbGJhY2s6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcidcbiAgICAgIH1cbiAgICB9XVxuICB9O1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgICAgLy8ge2xvYWRlcjogJ25nLWh0bWwtbG9hZGVyJ30sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgLy8ge2xvYWRlcjogJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJ30sXG4gICAgICAvLyB7bG9hZGVyOiAnQGRyL3RlbXBsYXRlLWJ1aWxkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMuZm9yRWFjaCgocnVsZSwgcnVsZUlkeCkgPT4ge1xuICAgIGNvbnN0IHRlc3QgPSBydWxlLnRlc3Q7XG4gICAgaWYgKHJ1bGUudXNlKSB7XG4gICAgICBjb25zdCBpZHggPSAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLmZpbmRJbmRleChydWxlU2V0ID0+IHJ1bGVTZXQubG9hZGVyID09PSAncG9zdGNzcy1sb2FkZXInKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnNwbGljZShpZHggKyAxLCAwLCB7XG4gICAgICAgICAgbG9hZGVyOiAnY3NzLXVybC1sb2FkZXInXG4gICAgICAgIH0pO1xuICAgICAgICAvLyAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnB1c2goe2xvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ30pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmpzJC8nICYmIHJ1bGUudXNlICYmXG4gICAgLy8gICAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0VXNlSXRlbVtdKS5zb21lKChpdGVtKSA9PlxuICAgIC8vICAgICAvQGFuZ3VsYXItZGV2a2l0Wy9cXFxcXWJ1aWxkLW9wdGltaXplclsvXFxcXF0uKlsvXFxcXF13ZWJwYWNrLWxvYWRlci8udGVzdChcbiAgICAvLyAgICAgKGl0ZW0gYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyKS5sb2FkZXIhKSkpIHtcblxuICAgIC8vICAgICBsZXQgb3JpZ1Rlc3Q6IChwOiBzdHJpbmcpID0+IGJvb2xlYW47XG4gICAgLy8gICAgIGlmIChydWxlLnRlc3QgaW5zdGFuY2VvZiBSZWdFeHApIHtcbiAgICAvLyAgICAgICBvcmlnVGVzdCA9IChwYXRoOiBzdHJpbmcpID0+IChydWxlLnRlc3QgYXMgUmVnRXhwKS50ZXN0KHBhdGgpO1xuICAgIC8vICAgICB9IGVsc2UgaWYgKHR5cGVvZiBydWxlLnRlc3QgPT09ICdmdW5jdGlvbicpIHtcbiAgICAvLyAgICAgICBvcmlnVGVzdCA9IHJ1bGUudGVzdDtcbiAgICAvLyAgICAgfSBlbHNlIHtcbiAgICAvLyAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvZXMgbm90IHN1cHBvcnQgbW9kdWxlLnJ1bGVcXCdzIHRlc3QgY29uZGl0aW9uIHR5cGUgZm9yIEBhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXIsIGluZm9ybSB0aGUgYXV0aG9yIHRvIHVwZGF0ZSBjb25maWctd2VicGFjay50cycpO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHJ1bGUudGVzdCA9IChwYXRoOiBzdHJpbmcpID0+IHtcbiAgICAvLyAgICAgICBpZiAob3JpZ1Rlc3QocGF0aCkpIHtcbiAgICAvLyAgICAgICAgIGNvbnN0IG5QYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgICAgICByZXR1cm4gbm9QYXJzZS5ldmVyeSgoZXhjbHVkZSA9PiAhblBhdGguaW5jbHVkZXMoZXhjbHVkZSkpKTtcbiAgICAvLyAgICAgICB9XG4gICAgLy8gICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIC8vICAgICB9O1xuICAgIC8vIH1cbiAgICAvLyBBbmd1bGFyIDggZG9lc24ndCBoYXZlIGxvYWRlciBmb3IgSFRNTFxuICAgIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcbiAgICAgIGhhc0h0bWxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCBodG1sTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ2ZpbGUtbG9hZGVyJykge1xuICAgICAgZmlsZUxvYWRlclJ1bGVJZHggPSBydWxlSWR4O1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB7XG4gICAgICAgIHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICB1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInfV1cbiAgICAgIH0pO1xuXG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ3VybC1sb2FkZXInKSB7XG4gICAgICBoYXNVcmxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB1cmxMb2FkZXJSdWxlKTtcbiAgICB9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpLmluZGV4T2YoJ1xcXFwuc2NzcycpID49IDAgJiYgcnVsZS51c2UpIHtcbiAgICAgIGNvbnN0IHVzZSA9IChydWxlLnVzZSBhcyBBcnJheTx7W2tleTogc3RyaW5nXTogYW55LCBsb2FkZXI6IHN0cmluZ30+KTtcbiAgICAgIGNvbnN0IGluc2VydElkeCA9IHVzZS5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLmxvYWRlciA9PT0gJ3Nhc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaW5zZXJ0SWR4IDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nhc3MtbG9hZGVyIGlzIG5vdCBmb3VuZCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgbmVlZFNvdXJjZU1hcCA9IHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwO1xuICAgICAgLy8gcmVzb2x2ZS11cmwtbG9hZGVyOiBcInNvdXJjZSBtYXBzIG11c3QgYmUgZW5hYmxlZCBvbiBhbnkgcHJlY2VkaW5nIGxvYWRlclwiXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYmhvbGxvd2F5L3Jlc29sdmUtdXJsLWxvYWRlclxuICAgICAgdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXAgPSB0cnVlO1xuICAgICAgdXNlLnNwbGljZShpbnNlcnRJZHgsIDAsIHtcbiAgICAgICAgbG9hZGVyOiAncmVzb2x2ZS11cmwtbG9hZGVyJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHNvdXJjZU1hcDogbmVlZFNvdXJjZU1hcFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmxlc3MkLycgJiYgcnVsZS51c2UpIHtcbiAgICAgIGZvciAoY29uc3QgdXNlSXRlbSBvZiBydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkge1xuICAgICAgICBpZiAodXNlSXRlbS5sb2FkZXIgPT09ICdsZXNzLWxvYWRlcicgJiYgXy5oYXModXNlSXRlbSwgJ29wdGlvbnMucGF0aHMnKSkge1xuICAgICAgICAgIGRlbGV0ZSAodXNlSXRlbS5vcHRpb25zIGFzIGFueSkucGF0aHM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWhhc1VybExvYWRlcikge1xuICAgIGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuICAgIGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuICAgIHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHVybExvYWRlclJ1bGUpO1xuICB9XG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIC8vIHRlc3Q6IC9cXC4oPzpuZ2ZhY3RvcnlcXC5qc3xjb21wb25lbnRcXC5odG1sKSQvLFxuICAgIHRlc3Q6IGZpbGUgPT4ge1xuICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiAhIWFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICB9LFxuICAgIHVzZTogW3tsb2FkZXI6ICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLWFvdC1hc3NldHMvbmctYW90LWFzc2V0cy1sb2FkZXInfV1cbiAgfSk7XG5cbiAgcnVsZXMudW5zaGlmdCh7XG4gICAgb25lT2Y6IFtcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwuamFkZSQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAgLy8ge2xvYWRlcjogJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJ30sXG4gICAgICAgIHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9qYWRlLXRvLWh0bWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5tZCQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAge2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL21hcmtkb3duLWxvYWRlcid9XG4gICAgICBdXG4gICAgfSxcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwudHh0JC8sXG4gICAgICB1c2U6IHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICB9LCB7XG4gICAgICB0ZXN0OiAvXFwuKHlhbWx8eW1sKSQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdqc29uLWxvYWRlcid9LFxuICAgICAgICB7bG9hZGVyOiAneWFtbC1sb2FkZXInfVxuICAgICAgXVxuICAgIH1dXG4gIH0pO1xuXG4gIGlmICghaGFzSHRtbExvYWRlcikge1xuICAgIHJ1bGVzWzBdLm9uZU9mICYmIHJ1bGVzWzBdLm9uZU9mLnB1c2goaHRtbExvYWRlclJ1bGUpO1xuICB9XG59XG5cbi8vIGZ1bmN0aW9uIG5vdEFuZ3VsYXJKcyhmaWxlOiBzdHJpbmcpIHtcbi8vIFx0aWYgKCFmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdmYWN0b3J5LmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nc3R5bGUuanMnKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdGlmIChub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSkpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHQvLyBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbi8vIFx0Ly8gaWYgKHBrICYmIHBrLmRyKSB7XG4vLyBcdC8vIFx0cmV0dXJuIHRydWU7XG4vLyBcdC8vIH1cbi8vIFx0Y29uc29sZS5sb2coJ2JhYmVsOiAnLCBmaWxlKTtcbi8vIFx0cmV0dXJuIHRydWU7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSkge1xuICBpZiAod2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24gPT0gbnVsbClcbiAgICByZXR1cm47IC8vIFNTUicgV2VicGFjayBjb25maWcgZG9lcyBub3QgaGFzIHRoaXMgcHJvcGVydHlcbiAgY29uc3Qgb2xkVmVuZG9yVGVzdEZ1bmMgPSBfLmdldCh3ZWJwYWNrQ29uZmlnLCAnb3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzLnZlbmRvci50ZXN0Jyk7XG5cbiAgaWYgKG9sZFZlbmRvclRlc3RGdW5jKSB7XG4gICAgY29uc3QgY2FjaGVHcm91cHM6IHtba2V5OiBzdHJpbmddOiB3ZWJwYWNrLk9wdGlvbnMuQ2FjaGVHcm91cHNPcHRpb25zfSA9IHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzO1xuICAgIGNhY2hlR3JvdXBzLnZlbmRvci50ZXN0ID0gdmVuZG9yVGVzdDtcbiAgICBjYWNoZUdyb3Vwcy5sYXp5VmVuZG9yID0ge1xuICAgICAgbmFtZTogJ2xhenktdmVuZG9yJyxcbiAgICAgIGNodW5rczogJ2FzeW5jJyxcbiAgICAgIGVuZm9yY2U6IHRydWUsXG4gICAgICB0ZXN0OiB2ZW5kb3JUZXN0LFxuICAgICAgcHJpb3JpdHk6IDFcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gdmVuZG9yVGVzdChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9Pikge1xuICAgIGNvbnN0IG1heWJlVmVuZG9yID0gb2xkVmVuZG9yVGVzdEZ1bmMobW9kdWxlLCBjaHVua3MpO1xuICAgIGlmICghbWF5YmVWZW5kb3IpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBtb2R1bGUubmFtZUZvckNvbmRpdGlvbiA/IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uKCkgOiAnJztcbiAgICAvLyBjb25zb2xlLmxvZyhgdmVuZG9yIHRlc3QsIHJlc291cmNlOiAke3Jlc291cmNlfSwgY2h1bmtzOiAke2NodW5rcy5tYXAoIGMgPT4gYy5uYW1lKX1gKTtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZSk7XG4gICAgcmV0dXJuIHBrID09IG51bGwgfHwgcGsuZHIgPT0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG4gIHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG4gIHZhciBvdXQgPSAne1xcbic7XG4gIF8uZm9yT3duKGMsICh2YWx1ZTogYW55LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICBvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuICB9KTtcbiAgb3V0ICs9IGluZGVudCArICd9JztcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcbiAgdmFyIG91dCA9ICcnO1xuICB2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuICBpZiAoXy5pc1N0cmluZyh2YWx1ZSkgfHwgXy5pc051bWJlcih2YWx1ZSkgfHwgXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgb3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgb3V0ICs9ICdbXFxuJztcbiAgICAodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG4gICAgICBvdXQgKz0gJyxcXG4nO1xuICAgIH0pO1xuICAgIG91dCArPSBpbmRlbnQgKyAnICBdJztcbiAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgb3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuICB9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG4gIH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICBjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gICAgaWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgIG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdW5rbm93bic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybUluZGV4SHRtbChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgY29udGVudDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHRyYW5zZm9ybUh0bWwoY29udGVudCwgY29udGV4dC5uZ0J1aWxkT3B0aW9uLmJyb3dzZXJPcHRpb25zLCBzcmNVcmwgPT4ge1xuICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKyQvLmV4ZWMoc3JjVXJsKTtcbiAgICAgIGlmIChtYXRjaCAmJiBjb250ZXh0LmlubGluZUFzc2V0cy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbnRleHQuaW5saW5lQXNzZXRzLmdldChtYXRjaFsxXSk7XG4gICAgICAgIHJldHVybiBzbVVybC5yZW1vdmVGcm9tKHNvdXJjZSEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoZSk7XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG4iXX0=
