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
const chalk_1 = tslib_1.__importDefault(require("chalk"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtCQUErQjtBQUMvQiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQkFBZ0M7QUFHaEMsMERBQXdCO0FBQ3hCLDRFQUEyQztBQUczQyw4RUFBbUQ7QUFDbkQsNEVBQTJDO0FBQzNDLG1FQUE0RDtBQUM1RCwwRkFBcUQ7QUFDckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRTFELDBEQUEwQjtBQVExQixTQUE4QixtQkFBbUIsQ0FBQyxPQUF1QixFQUFFLEtBQXNCLEVBQUUsYUFBb0MsRUFDckksaUJBQXFDOztRQUNyQyx1R0FBdUc7UUFDdkcsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBRTVFLG1FQUFtRTtRQUNuRSxzRUFBc0U7UUFDdEUsSUFBSTtRQUNKLElBQUksYUFBYSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDakMsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDNUI7UUFDRCxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUU7WUFDM0IsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztZQUMxQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUM5QyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsTUFBTSxDQUFDLEdBQWdCO2dCQUNqRCxvQ0FBb0M7Z0JBQ3BDLHdGQUF3RjtnQkFDeEYseURBQXlEO2dCQUN6RCwwRkFBMEY7Z0JBQzFGLHVGQUF1RjtnQkFDdkYs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SyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO1lBQ3pDLEdBQUcsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDMUM7YUFBTTtZQUNMLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0QztLQUNGO1NBQU07UUFDTCxHQUFHLElBQUksVUFBVSxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsU0FBc0Isa0JBQWtCLENBQUMsT0FBdUIsRUFBRSxPQUFlOztRQUMvRSxJQUFJO1lBQ0YsT0FBTyxpQ0FBYSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsRUFBRTtnQkFDM0UsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLEtBQUssSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDL0MsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELE9BQU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFPLENBQUMsQ0FBQztpQkFDbEM7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUM7Q0FBQTtBQWRELGdEQWNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2NvbmZpZy13ZWJwYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCB7IEFuZ3VsYXJDb21waWxlclBsdWdpbiB9IGZyb20gJ0BuZ3Rvb2xzL3dlYnBhY2snO1xuLy8gaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuL25nLXRzLXJlcGxhY2UnO1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQgfSBmcm9tICcuL25nL2J1aWxkZXItY29udGV4dCc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgQ2h1bmtJbmZvUGx1Z2luIGZyb20gJy4vcGx1Z2lucy9jaHVuay1pbmZvJztcbmltcG9ydCBnemlwU2l6ZSBmcm9tICcuL3BsdWdpbnMvZ3ppcC1zaXplJztcbmltcG9ydCB7IHRyYW5zZm9ybUh0bWwgfSBmcm9tICcuL3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IFJlYWRIb29rSG9zdCBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignY29uZmlnLXdlYnBhY2snKTtcbmltcG9ydCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbi8vIGltcG9ydCBzZXR1cEFzc2V0cyBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cyc7XG5leHBvcnQgaW50ZXJmYWNlIFdlcGFja0NvbmZpZ0hhbmRsZXIge1xuICAvKiogQHJldHVybnMgd2VicGFjayBjb25maWd1cmF0aW9uIG9yIFByb21pc2UgKi9cbiAgd2VicGFja0NvbmZpZyhvcmlnaW5hbENvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKTpcbiAgICBQcm9taXNlPHdlYnBhY2suQ29uZmlndXJhdGlvbj4gfCB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24gfCB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VXZWJwYWNrQ29uZmlnKGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCBwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGRyY3BDb25maWdTZXR0aW5nOiB7ZGV2TW9kZTogYm9vbGVhbn0pIHtcbiAgLy8gY29uc3QgYXBpOiB0eXBlb2YgX19hcGkgPSByZXF1aXJlKCdfX2FwaScpOyAvLyBmb3JjZSB0byBkZWZlciBsb2FkaW5nIGFwaSB1bnRpbCBEUkNQIGNvbmZpZyBpcyByZWFkeVxuICBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+Pj4+Pj4+Pj4gY2hhbmdlV2VicGFja0NvbmZpZyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Jyk7XG5cbiAgLy8gaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZSAmJiB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubWFpbkZpZWxkcykge1xuICAvLyAgIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tYWluRmllbGRzID0gWydicm93c2VyJywgJ21haW4nLCAnbW9kdWxlJ107XG4gIC8vIH1cbiAgaWYgKHdlYnBhY2tDb25maWcucGx1Z2lucyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zID0gW107XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcuZGV2U2VydmVyKSB7XG4gICAgY29uc3QgZGV2U2VydmVyID0gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXI7XG4gICAgY29uc3Qgb3JpZ2luID0gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIuYmVmb3JlO1xuICAgIGRldlNlcnZlci5iZWZvcmUgPSBmdW5jdGlvbiBiZWZvcmUoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgICAgLy8gVG8gZWxpbWlhdGUgSE1SIHdlYiBzb2NrZXQgaXNzdWU6XG4gICAgICAvLyAgIEVycm9yIFtFUlJfSFRUUF9IRUFERVJTX1NFTlRdOiBDYW5ub3Qgc2V0IGhlYWRlcnMgYWZ0ZXIgdGhleSBhcmUgc2VudCB0byB0aGUgY2xpZW50XG4gICAgICAvLyBhdCBTZXJ2ZXJSZXNwb25zZS5zZXRIZWFkZXIgKF9odHRwX291dGdvaW5nLmpzOjQ3MDoxMSlcbiAgICAgIC8vIGF0IEFycmF5LndyaXRlICgvVXNlcnMvbGl1amluZy9iay9jcmVkaXQtYXBwbC9ub2RlX21vZHVsZXMvZmluYWxoYW5kbGVyL2luZGV4LmpzOjI4NTo5KVxuICAgICAgLy8gYXQgbGlzdGVuZXIgKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9vbi1maW5pc2hlZC9pbmRleC5qczoxNjk6MTUpXG4gICAgICAvLyBhdCBvbkZpbmlzaCAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL29uLWZpbmlzaGVkL2luZGV4LmpzOjEwMDo1KVxuICAgICAgLy8gYXQgY2FsbGJhY2sgKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9lZS1maXJzdC9pbmRleC5qczo1NToxMClcblxuICAgICAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgY29uc3Qgb2xkID0gcmVzLnNldEhlYWRlcjtcbiAgICAgICAgLy8gY29uc3Qgb2xkRW5kID0gcmVzLmVuZDtcbiAgICAgICAgcmVzLnNldEhlYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBvbGQuYXBwbHkocmVzLCBhcmd1bWVudHMpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFUlJfSFRUUF9IRUFERVJTX1NFTlQnKSB7XG4gICAgICAgICAgICAgIGxvZy53YXJuKCdDYW5ub3Qgc2V0IGhlYWRlcnMgYWZ0ZXIgdGhleSBhcmUgc2VudCB0byB0aGUgY2xpZW50Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgbmV4dCgpO1xuICAgICAgfSk7XG4gICAgICBpZiAob3JpZ2luKVxuICAgICAgICBvcmlnaW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICAgIGRldlNlcnZlci5jb21wcmVzcyA9IHRydWU7XG4gICAgaWYgKGRldlNlcnZlci5oZWFkZXJzID09IG51bGwpXG4gICAgICBkZXZTZXJ2ZXIuaGVhZGVycyA9IHt9O1xuICAgIC8vIENPUlMgZW5hYmxlbWVudFxuICAgIGRldlNlcnZlci5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSA9ICcqJztcbiAgICBkZXZTZXJ2ZXIuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyddID0gJyonO1xuICB9XG5cbiAgaWYgKF8uZ2V0KHBhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmRyY3BBcmdzLnJlcG9ydCcpIHx8XG4gIHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLnJlcG9ydCB8fChwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5vcGVuUmVwb3J0KSkge1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuICAgICAgbmV3IENodW5rSW5mb1BsdWdpbigpXG4gICAgKTtcbiAgfVxuXG4gIC8vIHdlYnBhY2tDb25maWcubW9kdWxlLm5vUGFyc2UgPSAoZmlsZTogc3RyaW5nKSA9PiBub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSk7XG5cbiAgLy8gQ2hhbmdlIEFuZ3VsYXJDb21waWxlclBsdWdpbidzIG9wdGlvblxuICBjb25zdCBuZ0NvbXBpbGVyUGx1Z2luID0gd2VicGFja0NvbmZpZy5wbHVnaW5zLmZpbmQoKHBsdWdpbjogYW55KSA9PiB7XG4gICAgcmV0dXJuIChwbHVnaW4gaW5zdGFuY2VvZiBBbmd1bGFyQ29tcGlsZXJQbHVnaW4pO1xuICB9KSBhcyBBbmd1bGFyQ29tcGlsZXJQbHVnaW47XG4gIGlmIChuZ0NvbXBpbGVyUGx1Z2luID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgQW5ndWxhckNvbXBpbGVyUGx1Z2luJyk7XG4gIC8vIEhhY2sgYW5ndWxhci9wYWNrYWdlcy9uZ3Rvb2xzL3dlYnBhY2svc3JjL2FuZ3VsYXJfY29tcGlsZXJfcGx1Z2luLnRzICEhISFcbiAgLy8gY29uc3QgdHJhbnNmb3JtZXJzOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX3RyYW5zZm9ybWVycztcbiAgLy8gdHJhbnNmb3JtZXJzLnVuc2hpZnQoKGNvbnRleHQpID0+IHtcbiAgLy8gICByZXR1cm4gKHRzU3JjKSA9PiB7XG4gIC8vICAgICBjb25zb2xlLmxvZygnaGVsbG93OicsIHRzU3JjLmZpbGVOYW1lKTtcbiAgLy8gICAgIHJldHVybiB0c1NyYztcbiAgLy8gICB9O1xuICAvLyB9KTtcbiAgKHdlYnBhY2tDb25maWcucGx1Z2lucyBhcyBhbnlbXSkudW5zaGlmdChuZXcgY2xhc3Mge1xuICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgY29uc3QgaG9va2VyID0gbmV3IFRTUmVhZEhvb2tlcihwYXJhbSk7XG4gICAgICBuZ0NvbXBpbGVyUGx1Z2luLm9wdGlvbnMuaG9zdCA9IG5ldyBSZWFkSG9va0hvc3QoKGNvbXBpbGVyIGFzIGFueSkuaW5wdXRGaWxlU3lzdGVtLCBob29rZXIuaG9va0Z1bmMpO1xuICAgICAgLy8gRHVlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMTI5NjlcbiAgICAgIG5nQ29tcGlsZXJQbHVnaW4ub3B0aW9ucy5kaXJlY3RUZW1wbGF0ZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIC8vIFRPRE86IE9uY2UgQW5ndWxhciBjbGkgKHY4LjEueCkgdXBncmFkZXMgdG8gYWxsb3cgY2hhbmdpbmcgZGlyZWN0VGVtcGxhdGVMb2FkaW5nLCB3ZSBzaG91bGQgcmVtb3ZlXG4gICAgICAvLyBiZWxvdyBoYWNrIGNvZGUuXG4gICAgICAoKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fdHJhbnNmb3JtZXJzIGFzIGFueVtdKS5zcGxpY2UoMCk7XG4gICAgICAobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl9tYWtlVHJhbnNmb3JtZXJzKCk7XG4gICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCd0cy1yZWFkLWhvb2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGhvb2tlci5jbGVhcigpO1xuICAgICAgfSk7XG4gICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmxvZ0ZpbGVDb3VudCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KCkpO1xuXG4gIGlmIChwYXJhbS5icm93c2VyT3B0aW9ucy5zdGF0c0pzb24pIHtcbiAgICBsb2cud2FybignWW91IGhhdmUgZW5iYWJsZWQgXCJzdGF0c0pzb246IHRydWVcIiBpbiBBbmd1bGFyLmpzb24gb3IgQ29tbWFuZCBsaW5lLCBpdCB3aWxsIGdlbmVyYXRlIGEgYmlnIGZpbGUgaW4gb3V0cHV0IGRpcmVjdG9yeVxcbicgK1xuICAgICAgJ1N1Z2dlc3QgeW91IHRvIHJlbW92ZSBpdCBiZWZvcmUgZGVwbG95IHRoZSB3aG9sZSBvdXRwdXQgcmVzb3VyY2UgdG8gc29tZXdoZXJlLCBvciB5b3Ugc2hvdWxkIGRpc2FibGUgdGhpcyBvcHRpb24sXFxuJyArXG4gICAgICAnY3V6XFwnIG5nLWFwcC1idWlsZGVyIHdpbGwgZ2VuZXJhdGUgYW5vdGhlciBzdGF0cy5qc29uIGZpbGUgaW4gaXRzIHJlcG9ydCBkaXJlY3RvcnkgZm9yIHByb2R1Y3Rpb24gbW9kZScpO1xuICB9XG5cbiAgaWYgKCFkcmNwQ29uZmlnU2V0dGluZy5kZXZNb2RlKSB7XG4gICAgY29uc29sZS5sb2coJ0J1aWxkIGluIHByb2R1Y3Rpb24gbW9kZScpO1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuICAgICAgbmV3IGd6aXBTaXplKCksXG4gICAgICBuZXcgKGNsYXNzIHtcbiAgICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXAoJ2FuZ3VsYXItY2xpLXN0YXRzJywgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IEpTT04uc3RyaW5naWZ5KGNvbXBpbGF0aW9uLmdldFN0YXRzKCkudG9Kc29uKCd2ZXJib3NlJykpO1xuICAgICAgICAgICAgY29uc3QgcmVwb3J0RmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAnd2VicGFjay1zdGF0cy5qc29uJyk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGUocmVwb3J0RmlsZSwgZGF0YSxcbiAgICAgICAgICAgICAgKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHJldHVybiBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbyhgV2VicGFjayBjb21waWxhdGlvbiBzdGF0cyBpcyB3cml0dGVuIHRvICR7cmVwb3J0RmlsZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgfX0pKClcbiAgICApO1xuICB9XG5cbiAgaWYgKHdlYnBhY2tDb25maWcudGFyZ2V0ICE9PSAnbm9kZScpIHtcbiAgICAvLyBTaW5jZSBBbmd1bGFyIDguMS4wLCB0aGVyZSBpcyBubyBpbmRleEh0bWxQbHVnaW4gdXNlZCBpbiBXZWJwYWNrIGNvbmZpZ3VyYXRpb25cbiAgICAvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgSW5kZXhIdG1sUGx1Z2luKHtcbiAgICAvLyAgICAgaW5kZXhGaWxlOiBQYXRoLnJlc29sdmUocGFyYW0uYnJvd3Nlck9wdGlvbnMuaW5kZXgpLFxuICAgIC8vICAgICBpbmxpbmVDaHVua05hbWVzOiBbJ3J1bnRpbWUnXVxuICAgIC8vICAgfSkpO1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyAoY2xhc3MgRHJjcEJ1aWxkZXJBc3NldHNQbHVnaW4ge1xuICAgICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwUHJvbWlzZSgnZHJjcC1idWlsZGVyLWFzc2V0cycsIGFzeW5jIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgICBjb25zdCBhc3NldHM6IHtbYXNzZXRzUGF0aDogc3RyaW5nXTogYW55fSA9IGNvbXBpbGF0aW9uLmFzc2V0cztcbiAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0c1BhdGggb2YgT2JqZWN0LmtleXMoYXNzZXRzKSkge1xuICAgICAgICAgICAgLy8gbG9nLndhcm4oJ2lzICcsIGFzc2V0c1BhdGgpO1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKihcXC5qcykkLy5leGVjKGFzc2V0c1BhdGgpO1xuICAgICAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAvLyBsb2cud2FybignbG9va3VwIGFzc2V0cycsIG1hdGNoWzFdKTtcbiAgICAgICAgICAgIGlmIChjb250ZXh0LmlubGluZUFzc2V0cy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICAgIGNvbnRleHQuaW5saW5lQXNzZXRzLnNldChtYXRjaFsxXSwgYXNzZXRzW2Fzc2V0c1BhdGhdLnNvdXJjZSgpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pKCkpO1xuICB9IGVsc2Uge1xuICAgIC8vIFRoaXMgaXMgY29uZGl0aW9uIG9mIFNlcnZlciBzaWRlIHJlbmRlcmluZ1xuICAgIC8vIFJlZmVyIHRvIGFuZ3VsYXItY2xpL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3Mvc2VydmVyLnRzXG4gICAgaWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmJ1bmRsZURlcGVuZGVuY2llcyA9PT0gJ25vbmUnKSB7XG4gICAgICB3ZWJwYWNrQ29uZmlnLmV4dGVybmFscyA9IFtcbiAgICAgICAgL15AYW5ndWxhci8sXG4gICAgICAgIChfOiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkKSA9PiB7XG4gICAgICAgIC8vIEFic29sdXRlICYgUmVsYXRpdmUgcGF0aHMgYXJlIG5vdCBleHRlcm5hbHNcbiAgICAgICAgaWYgKC9eXFwuezAsMn1cXC8vLnRlc3QocmVxdWVzdCkgfHwgUGF0aC5pc0Fic29sdXRlKHJlcXVlc3QpKSB7XG4gICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG1vZHVsZSB2aWEgTm9kZVxuICAgICAgICAgIGNvbnN0IGUgPSByZXF1aXJlLnJlc29sdmUocmVxdWVzdCk7XG4gICAgICAgICAgY29uc3QgY29tcCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShlKTtcbiAgICAgICAgICBpZiAoY29tcCA9PSBudWxsIHx8IGNvbXAuZHIgPT0gbnVsbCApIHtcbiAgICAgICAgICAgIC8vIEl0J3MgYSBub2RlX21vZHVsZVxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEl0J3MgYSBzeXN0ZW0gdGhpbmcgKC5pZSB1dGlsLCBmcy4uLilcbiAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gTm9kZSBjb3VsZG4ndCBmaW5kIGl0LCBzbyBpdCBtdXN0IGJlIHVzZXItYWxpYXNlZFxuICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgXTtcbiAgICAgIH1cbiAgfVxuICAvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgQ29tcGlsZURvbmVQbHVnaW4oKSk7XG5cbiAgY2hhbmdlU3BsaXRDaHVua3MocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuICBjaGFuZ2VMb2FkZXJzKHBhcmFtLCB3ZWJwYWNrQ29uZmlnKTtcblxuICBpZiAocGFyYW0uc3NyKSB7XG4gICAgd2VicGFja0NvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuICB9XG5cbiAgYXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxXZXBhY2tDb25maWdIYW5kbGVyPigoZmlsZSwgbGFzdFJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLndlYnBhY2tDb25maWcpXG4gICAgICByZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuICAgIHJldHVybiBsYXN0UmVzdWx0O1xuICB9KTtcblxuICBjb25zdCB3Zm5hbWUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JyxcbiAgICBgd2VicGFjay0ke3BhcmFtLnNzciA/ICdzc3InIDogJ2Jyb3dzZXInfS5jb25maWcuJHsrK2NvbnRleHQud2VicGFja1J1bkNvdW50fS5qc2ApO1xuICBmcy53cml0ZUZpbGVTeW5jKHdmbmFtZSwgcHJpbnRDb25maWcod2VicGFja0NvbmZpZykpO1xuICBjb25zb2xlLmxvZyhgSWYgeW91IGFyZSB3b25kZXJpbmcgd2hhdCBraW5kIG9mIFdlYmFwY2sgY29uZmlnIGZpbGUgaXMgdXNlZCBpbnRlcm5hbGx5LCBjaGVja291dCAke2NoYWxrLmJsdWVCcmlnaHQod2ZuYW1lKX1gKTtcbiAgcmV0dXJuIHdlYnBhY2tDb25maWc7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUxvYWRlcnMocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKSB7XG4gIC8vIGNvbnN0IG5vUGFyc2UgPSAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkT3B0aW1pemVyRXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuICAvLyBub1BhcnNlLnB1c2goLi4uYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkLW9wdGltaXplcjpleGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG5cbiAgLy8gY29uc3QgZGV2TW9kZSA9IHdlYnBhY2tDb25maWcubW9kZSA9PT0gJ2RldmVsb3BtZW50JztcbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID0ge307XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9IFtdO1xuICB9XG4gIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzLnVuc2hpZnQoUGF0aC5qb2luKF9fZGlybmFtZSwgJ2xvYWRlcnMnKSk7XG4gIGlmICghd2VicGFja0NvbmZpZy5tb2R1bGUpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLm1vZHVsZSA9IHtydWxlczogW119O1xuICB9XG4gIGNvbnN0IHJ1bGVzID0gd2VicGFja0NvbmZpZy5tb2R1bGUucnVsZXMgYXMgd2VicGFjay5SdWxlW107XG4gIGxldCBoYXNVcmxMb2FkZXIgPSBmYWxzZTtcbiAgbGV0IGhhc0h0bWxMb2FkZXIgPSBmYWxzZTtcbiAgbGV0IGZpbGVMb2FkZXJSdWxlSWR4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3QgdXJsTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuKGpwZ3xwbmd8Z2lmKSQvLFxuICAgIHVzZTogW3tcbiAgICAgIGxvYWRlcjogJ3VybC1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsaW1pdDogMTAwMDAsIC8vIDwxMGsgLHVzZSBiYXNlNjQgZm9ybWF0XG4gICAgICAgIGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG4gICAgICB9XG4gICAgfV1cbiAgfTtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLmZvckVhY2goKHJ1bGUsIHJ1bGVJZHgpID0+IHtcbiAgICBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuICAgIGlmIChydWxlLnVzZSkge1xuICAgICAgY29uc3QgaWR4ID0gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5maW5kSW5kZXgocnVsZVNldCA9PiBydWxlU2V0LmxvYWRlciA9PT0gJ3Bvc3Rjc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5zcGxpY2UoaWR4ICsgMSwgMCwge1xuICAgICAgICAgIGxvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5wdXNoKHtsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcid9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBbmd1bGFyIDggZG9lc24ndCBoYXZlIGxvYWRlciBmb3IgSFRNTFxuICAgIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcbiAgICAgIGhhc0h0bWxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCBodG1sTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ2ZpbGUtbG9hZGVyJykge1xuICAgICAgZmlsZUxvYWRlclJ1bGVJZHggPSBydWxlSWR4O1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB7XG4gICAgICAgIHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICB1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInfV1cbiAgICAgIH0pO1xuXG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ3VybC1sb2FkZXInKSB7XG4gICAgICBoYXNVcmxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB1cmxMb2FkZXJSdWxlKTtcbiAgICB9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpLmluZGV4T2YoJ1xcXFwuc2NzcycpID49IDAgJiYgcnVsZS51c2UpIHtcbiAgICAgIGNvbnN0IHVzZSA9IChydWxlLnVzZSBhcyBBcnJheTx7W2tleTogc3RyaW5nXTogYW55LCBsb2FkZXI6IHN0cmluZ30+KTtcbiAgICAgIGNvbnN0IGluc2VydElkeCA9IHVzZS5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLmxvYWRlciA9PT0gJ3Nhc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaW5zZXJ0SWR4IDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nhc3MtbG9hZGVyIGlzIG5vdCBmb3VuZCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgbmVlZFNvdXJjZU1hcCA9IHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwO1xuICAgICAgLy8gcmVzb2x2ZS11cmwtbG9hZGVyOiBcInNvdXJjZSBtYXBzIG11c3QgYmUgZW5hYmxlZCBvbiBhbnkgcHJlY2VkaW5nIGxvYWRlclwiXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYmhvbGxvd2F5L3Jlc29sdmUtdXJsLWxvYWRlclxuICAgICAgdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXAgPSB0cnVlO1xuICAgICAgdXNlLnNwbGljZShpbnNlcnRJZHgsIDAsIHtcbiAgICAgICAgbG9hZGVyOiAncmVzb2x2ZS11cmwtbG9hZGVyJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHNvdXJjZU1hcDogbmVlZFNvdXJjZU1hcFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmxlc3MkLycgJiYgcnVsZS51c2UpIHtcbiAgICAgIGZvciAoY29uc3QgdXNlSXRlbSBvZiBydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkge1xuICAgICAgICBpZiAodXNlSXRlbS5sb2FkZXIgPT09ICdsZXNzLWxvYWRlcicgJiYgXy5oYXModXNlSXRlbSwgJ29wdGlvbnMucGF0aHMnKSkge1xuICAgICAgICAgIGRlbGV0ZSAodXNlSXRlbS5vcHRpb25zIGFzIGFueSkucGF0aHM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWhhc1VybExvYWRlcikge1xuICAgIGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuICAgIGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuICAgIHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHVybExvYWRlclJ1bGUpO1xuICB9XG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIC8vIHRlc3Q6IC9cXC4oPzpuZ2ZhY3RvcnlcXC5qc3xjb21wb25lbnRcXC5odG1sKSQvLFxuICAgIHRlc3Q6IGZpbGUgPT4ge1xuICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIHJldHVybiAhIWFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbiAgICB9LFxuICAgIHVzZTogW3tsb2FkZXI6ICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLWFvdC1hc3NldHMvbmctYW90LWFzc2V0cy1sb2FkZXInfV1cbiAgfSk7XG5cbiAgcnVsZXMudW5zaGlmdCh7XG4gICAgb25lT2Y6IFtcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwuamFkZSQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAge2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2phZGUtdG8taHRtbC1sb2FkZXInfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgdGVzdDogL1xcLm1kJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICB7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvbWFya2Rvd24tbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC50eHQkLyxcbiAgICAgIHVzZToge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIH0sIHtcbiAgICAgIHRlc3Q6IC9cXC4oeWFtbHx5bWwpJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2pzb24tbG9hZGVyJ30sXG4gICAgICAgIHtsb2FkZXI6ICd5YW1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfV1cbiAgfSk7XG5cbiAgaWYgKCFoYXNIdG1sTG9hZGVyKSB7XG4gICAgcnVsZXNbMF0ub25lT2YgJiYgcnVsZXNbMF0ub25lT2YucHVzaChodG1sTG9hZGVyUnVsZSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gbm90QW5ndWxhckpzKGZpbGU6IHN0cmluZykge1xuLy8gXHRpZiAoIWZpbGUuZW5kc1dpdGgoJy5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdzdHlsZS5qcycpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0aWYgKG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdC8vIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuLy8gXHQvLyBpZiAocGsgJiYgcGsuZHIpIHtcbi8vIFx0Ly8gXHRyZXR1cm4gdHJ1ZTtcbi8vIFx0Ly8gfVxuLy8gXHRjb25zb2xlLmxvZygnYmFiZWw6ICcsIGZpbGUpO1xuLy8gXHRyZXR1cm4gdHJ1ZTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlU3BsaXRDaHVua3MocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogYW55KSB7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbiA9PSBudWxsKVxuICAgIHJldHVybjsgLy8gU1NSJyBXZWJwYWNrIGNvbmZpZyBkb2VzIG5vdCBoYXMgdGhpcyBwcm9wZXJ0eVxuICBjb25zdCBvbGRWZW5kb3JUZXN0RnVuYyA9IF8uZ2V0KHdlYnBhY2tDb25maWcsICdvcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHMudmVuZG9yLnRlc3QnKTtcblxuICBpZiAob2xkVmVuZG9yVGVzdEZ1bmMpIHtcbiAgICBjb25zdCBjYWNoZUdyb3Vwczoge1trZXk6IHN0cmluZ106IHdlYnBhY2suT3B0aW9ucy5DYWNoZUdyb3Vwc09wdGlvbnN9ID0gd2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHM7XG4gICAgY2FjaGVHcm91cHMudmVuZG9yLnRlc3QgPSB2ZW5kb3JUZXN0O1xuICAgIGNhY2hlR3JvdXBzLmxhenlWZW5kb3IgPSB7XG4gICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgIHRlc3Q6IHZlbmRvclRlc3QsXG4gICAgICBwcmlvcml0eTogMVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB2ZW5kb3JUZXN0KG1vZHVsZTogYW55LCBjaHVua3M6IEFycmF5PHsgbmFtZTogc3RyaW5nIH0+KSB7XG4gICAgY29uc3QgbWF5YmVWZW5kb3IgPSBvbGRWZW5kb3JUZXN0RnVuYyhtb2R1bGUsIGNodW5rcyk7XG4gICAgaWYgKCFtYXliZVZlbmRvcilcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvdXJjZSA9IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uID8gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24oKSA6ICcnO1xuICAgIC8vIGNvbnNvbGUubG9nKGB2ZW5kb3IgdGVzdCwgcmVzb3VyY2U6ICR7cmVzb3VyY2V9LCBjaHVua3M6ICR7Y2h1bmtzLm1hcCggYyA9PiBjLm5hbWUpfWApO1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlKTtcbiAgICByZXR1cm4gcGsgPT0gbnVsbCB8fCBway5kciA9PSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgdmFyIG91dCA9ICd7XFxuJztcbiAgXy5mb3JPd24oYywgKHZhbHVlOiBhbnksIHByb3A6IHN0cmluZykgPT4ge1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH0pO1xuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICB2YXIgb3V0ID0gJyc7XG4gIHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG4gIGlmIChfLmlzU3RyaW5nKHZhbHVlKSB8fCBfLmlzTnVtYmVyKHZhbHVlKSB8fCBfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgICh2YWx1ZSBhcyBhbnlbXSkuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIG91dCArPSBpbmRlbnQgKyAnICAgICcgKyBwcmludENvbmZpZ1ZhbHVlKHJvdywgbGV2ZWwgKyAxKTtcbiAgICAgIG91dCArPSAnLFxcbic7XG4gICAgfSk7XG4gICAgb3V0ICs9IGluZGVudCArICcgIF0nO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lfSgpYDtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9IHByaW50Q29uZmlnKHZhbHVlLCBsZXZlbCArIDEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1bmtub3duJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJhbnNmb3JtSW5kZXhIdG1sKGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCBjb250ZW50OiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gdHJhbnNmb3JtSHRtbChjb250ZW50LCBjb250ZXh0Lm5nQnVpbGRPcHRpb24uYnJvd3Nlck9wdGlvbnMsIHNyY1VybCA9PiB7XG4gICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwpO1xuICAgICAgaWYgKG1hdGNoICYmIGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgY29uc3Qgc291cmNlID0gY29udGV4dC5pbmxpbmVBc3NldHMuZ2V0KG1hdGNoWzFdKTtcbiAgICAgICAgcmV0dXJuIHNtVXJsLnJlbW92ZUZyb20oc291cmNlISk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5lcnJvcihlKTtcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbiJdfQ==
