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
const mem_stats_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/utils/mem-stats"));
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
                    mem_stats_1.default();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtCQUErQjtBQUMvQiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQkFBZ0M7QUFHaEMsMERBQXdCO0FBQ3hCLDRFQUEyQztBQUczQyw4RUFBbUQ7QUFDbkQsNEVBQTJDO0FBQzNDLG1FQUE0RDtBQUM1RCwwRkFBcUQ7QUFDckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRTFELDBEQUEwQjtBQUMxQixpR0FBZ0U7QUFRaEUsU0FBOEIsbUJBQW1CLENBQUMsT0FBdUIsRUFBRSxLQUFzQixFQUFFLGFBQW9DLEVBQ3JJLGlCQUFxQzs7UUFDckMsdUdBQXVHO1FBQ3ZHLE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUU1RSxtRUFBbUU7UUFDbkUsc0VBQXNFO1FBQ3RFLElBQUk7UUFDSixJQUFJLGFBQWEsQ0FBQyxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ2pDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQzVCO1FBQ0QsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFO1lBQzNCLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDOUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLE1BQU0sQ0FBQyxHQUFnQjtnQkFDakQsb0NBQW9DO2dCQUNwQyx3RkFBd0Y7Z0JBQ3hGLHlEQUF5RDtnQkFDekQsMEZBQTBGO2dCQUMxRix1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RCxnREFjQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9jb25maWctd2VicGFjay5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgeyBBbmd1bGFyQ29tcGlsZXJQbHVnaW4gfSBmcm9tICdAbmd0b29scy93ZWJwYWNrJztcbi8vIGltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1JlZ0V4cCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBUU1JlYWRIb29rZXIgZnJvbSAnLi9uZy10cy1yZXBsYWNlJztcbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0IH0gZnJvbSAnLi9uZy9idWlsZGVyLWNvbnRleHQnO1xuaW1wb3J0IHsgQW5ndWxhckNsaVBhcmFtIH0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IENodW5rSW5mb1BsdWdpbiBmcm9tICcuL3BsdWdpbnMvY2h1bmstaW5mbyc7XG5pbXBvcnQgZ3ppcFNpemUgZnJvbSAnLi9wbHVnaW5zL2d6aXAtc2l6ZSc7XG5pbXBvcnQgeyB0cmFuc2Zvcm1IdG1sIH0gZnJvbSAnLi9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luJztcbmltcG9ydCBSZWFkSG9va0hvc3QgZnJvbSAnLi91dGlscy9yZWFkLWhvb2stdmZzaG9zdCc7XG5jb25zdCBzbVVybCA9IHJlcXVpcmUoJ3NvdXJjZS1tYXAtdXJsJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2NvbmZpZy13ZWJwYWNrJyk7XG5pbXBvcnQge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbWVtc3RhdHMgZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzL21lbS1zdGF0cyc7XG4vLyBpbXBvcnQgc2V0dXBBc3NldHMgZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuZXhwb3J0IGludGVyZmFjZSBXZXBhY2tDb25maWdIYW5kbGVyIHtcbiAgLyoqIEByZXR1cm5zIHdlYnBhY2sgY29uZmlndXJhdGlvbiBvciBQcm9taXNlICovXG4gIHdlYnBhY2tDb25maWcob3JpZ2luYWxDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbik6XG4gICAgUHJvbWlzZTx3ZWJwYWNrLkNvbmZpZ3VyYXRpb24+IHwgd2VicGFjay5Db25maWd1cmF0aW9uIHwgdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlV2VicGFja0NvbmZpZyhjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgcGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uLFxuICBkcmNwQ29uZmlnU2V0dGluZzoge2Rldk1vZGU6IGJvb2xlYW59KSB7XG4gIC8vIGNvbnN0IGFwaTogdHlwZW9mIF9fYXBpID0gcmVxdWlyZSgnX19hcGknKTsgLy8gZm9yY2UgdG8gZGVmZXIgbG9hZGluZyBhcGkgdW50aWwgRFJDUCBjb25maWcgaXMgcmVhZHlcbiAgY29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IGNoYW5nZVdlYnBhY2tDb25maWcgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpO1xuXG4gIC8vIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmUgJiYgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1haW5GaWVsZHMpIHtcbiAgLy8gICB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubWFpbkZpZWxkcyA9IFsnYnJvd3NlcicsICdtYWluJywgJ21vZHVsZSddO1xuICAvLyB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucyA9IFtdO1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcikge1xuICAgIGNvbnN0IGRldlNlcnZlciA9IHdlYnBhY2tDb25maWcuZGV2U2VydmVyO1xuICAgIGNvbnN0IG9yaWdpbiA9IHdlYnBhY2tDb25maWcuZGV2U2VydmVyLmJlZm9yZTtcbiAgICBkZXZTZXJ2ZXIuYmVmb3JlID0gZnVuY3Rpb24gYmVmb3JlKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAgIC8vIFRvIGVsaW1pYXRlIEhNUiB3ZWIgc29ja2V0IGlzc3VlOlxuICAgICAgLy8gICBFcnJvciBbRVJSX0hUVFBfSEVBREVSU19TRU5UXTogQ2Fubm90IHNldCBoZWFkZXJzIGFmdGVyIHRoZXkgYXJlIHNlbnQgdG8gdGhlIGNsaWVudFxuICAgICAgLy8gYXQgU2VydmVyUmVzcG9uc2Uuc2V0SGVhZGVyIChfaHR0cF9vdXRnb2luZy5qczo0NzA6MTEpXG4gICAgICAvLyBhdCBBcnJheS53cml0ZSAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL2ZpbmFsaGFuZGxlci9pbmRleC5qczoyODU6OSlcbiAgICAgIC8vIGF0IGxpc3RlbmVyICgvVXNlcnMvbGl1amluZy9iay9jcmVkaXQtYXBwbC9ub2RlX21vZHVsZXMvb24tZmluaXNoZWQvaW5kZXguanM6MTY5OjE1KVxuICAgICAgLy8gYXQgb25GaW5pc2ggKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9vbi1maW5pc2hlZC9pbmRleC5qczoxMDA6NSlcbiAgICAgIC8vIGF0IGNhbGxiYWNrICgvVXNlcnMvbGl1amluZy9iay9jcmVkaXQtYXBwbC9ub2RlX21vZHVsZXMvZWUtZmlyc3QvaW5kZXguanM6NTU6MTApXG5cbiAgICAgIGFwcC51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IG9sZCA9IHJlcy5zZXRIZWFkZXI7XG4gICAgICAgIC8vIGNvbnN0IG9sZEVuZCA9IHJlcy5lbmQ7XG4gICAgICAgIHJlcy5zZXRIZWFkZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgb2xkLmFwcGx5KHJlcywgYXJndW1lbnRzKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVJSX0hUVFBfSEVBREVSU19TRU5UJykge1xuICAgICAgICAgICAgICBsb2cud2FybignQ2Fubm90IHNldCBoZWFkZXJzIGFmdGVyIHRoZXkgYXJlIHNlbnQgdG8gdGhlIGNsaWVudCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIG5leHQoKTtcbiAgICAgIH0pO1xuICAgICAgaWYgKG9yaWdpbilcbiAgICAgICAgb3JpZ2luLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgICBkZXZTZXJ2ZXIuY29tcHJlc3MgPSB0cnVlO1xuICAgIGlmIChkZXZTZXJ2ZXIuaGVhZGVycyA9PSBudWxsKVxuICAgICAgZGV2U2VydmVyLmhlYWRlcnMgPSB7fTtcbiAgICAvLyBDT1JTIGVuYWJsZW1lbnRcbiAgICBkZXZTZXJ2ZXIuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgZGV2U2VydmVyLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnXSA9ICcqJztcbiAgfVxuXG4gIGlmIChfLmdldChwYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5kcmNwQXJncy5yZXBvcnQnKSB8fFxuICBwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5yZXBvcnQgfHwocGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3Mub3BlblJlcG9ydCkpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChcbiAgICAgIG5ldyBDaHVua0luZm9QbHVnaW4oKVxuICAgICk7XG4gIH1cblxuICAvLyB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ub1BhcnNlID0gKGZpbGU6IHN0cmluZykgPT4gbm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpO1xuXG4gIC8vIENoYW5nZSBBbmd1bGFyQ29tcGlsZXJQbHVnaW4ncyBvcHRpb25cbiAgY29uc3QgbmdDb21waWxlclBsdWdpbiA9IHdlYnBhY2tDb25maWcucGx1Z2lucy5maW5kKChwbHVnaW46IGFueSkgPT4ge1xuICAgIHJldHVybiAocGx1Z2luIGluc3RhbmNlb2YgQW5ndWxhckNvbXBpbGVyUGx1Z2luKTtcbiAgfSkgYXMgQW5ndWxhckNvbXBpbGVyUGx1Z2luO1xuICBpZiAobmdDb21waWxlclBsdWdpbiA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignQ2FuIG5vdCBmaW5kIEFuZ3VsYXJDb21waWxlclBsdWdpbicpO1xuICAvLyBIYWNrIGFuZ3VsYXIvcGFja2FnZXMvbmd0b29scy93ZWJwYWNrL3NyYy9hbmd1bGFyX2NvbXBpbGVyX3BsdWdpbi50cyAhISEhXG4gIC8vIGNvbnN0IHRyYW5zZm9ybWVyczogdHMuVHJhbnNmb3JtZXJGYWN0b3J5PHRzLlNvdXJjZUZpbGU+W10gPSAobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl90cmFuc2Zvcm1lcnM7XG4gIC8vIHRyYW5zZm9ybWVycy51bnNoaWZ0KChjb250ZXh0KSA9PiB7XG4gIC8vICAgcmV0dXJuICh0c1NyYykgPT4ge1xuICAvLyAgICAgY29uc29sZS5sb2coJ2hlbGxvdzonLCB0c1NyYy5maWxlTmFtZSk7XG4gIC8vICAgICByZXR1cm4gdHNTcmM7XG4gIC8vICAgfTtcbiAgLy8gfSk7XG4gICh3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgYXMgYW55W10pLnVuc2hpZnQobmV3IGNsYXNzIHtcbiAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgIGNvbnN0IGhvb2tlciA9IG5ldyBUU1JlYWRIb29rZXIocGFyYW0pO1xuICAgICAgbmdDb21waWxlclBsdWdpbi5vcHRpb25zLmhvc3QgPSBuZXcgUmVhZEhvb2tIb3N0KChjb21waWxlciBhcyBhbnkpLmlucHV0RmlsZVN5c3RlbSwgaG9va2VyLmhvb2tGdW5jKTtcbiAgICAgIC8vIER1ZSB0byBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9wdWxsLzEyOTY5XG4gICAgICBuZ0NvbXBpbGVyUGx1Z2luLm9wdGlvbnMuZGlyZWN0VGVtcGxhdGVMb2FkaW5nID0gZmFsc2U7XG4gICAgICAvLyBUT0RPOiBPbmNlIEFuZ3VsYXIgY2xpICh2OC4xLngpIHVwZ3JhZGVzIHRvIGFsbG93IGNoYW5naW5nIGRpcmVjdFRlbXBsYXRlTG9hZGluZywgd2Ugc2hvdWxkIHJlbW92ZVxuICAgICAgLy8gYmVsb3cgaGFjayBjb2RlLlxuICAgICAgKChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX3RyYW5zZm9ybWVycyBhcyBhbnlbXSkuc3BsaWNlKDApO1xuICAgICAgKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fbWFrZVRyYW5zZm9ybWVycygpO1xuICAgICAgY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBob29rZXIuY2xlYXIoKTtcbiAgICAgIH0pO1xuICAgICAgY29tcGlsZXIuaG9va3MuZG9uZS50YXBQcm9taXNlKCd0cy1yZWFkLWhvb2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGhvb2tlci5sb2dGaWxlQ291bnQoKTtcbiAgICAgICAgbWVtc3RhdHMoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSgpKTtcblxuICBpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuc3RhdHNKc29uKSB7XG4gICAgbG9nLndhcm4oJ1lvdSBoYXZlIGVuYmFibGVkIFwic3RhdHNKc29uOiB0cnVlXCIgaW4gQW5ndWxhci5qc29uIG9yIENvbW1hbmQgbGluZSwgaXQgd2lsbCBnZW5lcmF0ZSBhIGJpZyBmaWxlIGluIG91dHB1dCBkaXJlY3RvcnlcXG4nICtcbiAgICAgICdTdWdnZXN0IHlvdSB0byByZW1vdmUgaXQgYmVmb3JlIGRlcGxveSB0aGUgd2hvbGUgb3V0cHV0IHJlc291cmNlIHRvIHNvbWV3aGVyZSwgb3IgeW91IHNob3VsZCBkaXNhYmxlIHRoaXMgb3B0aW9uLFxcbicgK1xuICAgICAgJ2N1elxcJyBuZy1hcHAtYnVpbGRlciB3aWxsIGdlbmVyYXRlIGFub3RoZXIgc3RhdHMuanNvbiBmaWxlIGluIGl0cyByZXBvcnQgZGlyZWN0b3J5IGZvciBwcm9kdWN0aW9uIG1vZGUnKTtcbiAgfVxuXG4gIGlmICghZHJjcENvbmZpZ1NldHRpbmcuZGV2TW9kZSkge1xuICAgIGNvbnNvbGUubG9nKCdCdWlsZCBpbiBwcm9kdWN0aW9uIG1vZGUnKTtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChcbiAgICAgIG5ldyBnemlwU2l6ZSgpLFxuICAgICAgbmV3IChjbGFzcyB7XG4gICAgICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwKCdhbmd1bGFyLWNsaS1zdGF0cycsIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnN0cmluZ2lmeShjb21waWxhdGlvbi5nZXRTdGF0cygpLnRvSnNvbigndmVyYm9zZScpKTtcbiAgICAgICAgICAgIGNvbnN0IHJlcG9ydEZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ3dlYnBhY2stc3RhdHMuanNvbicpO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKHJlcG9ydEZpbGUsIGRhdGEsXG4gICAgICAgICAgICAgIChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gbG9nLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oYFdlYnBhY2sgY29tcGlsYXRpb24gc3RhdHMgaXMgd3JpdHRlbiB0byAke3JlcG9ydEZpbGV9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH19KSgpXG4gICAgKTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy50YXJnZXQgIT09ICdub2RlJykge1xuICAgIC8vIFNpbmNlIEFuZ3VsYXIgOC4xLjAsIHRoZXJlIGlzIG5vIGluZGV4SHRtbFBsdWdpbiB1c2VkIGluIFdlYnBhY2sgY29uZmlndXJhdGlvblxuICAgIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBJbmRleEh0bWxQbHVnaW4oe1xuICAgIC8vICAgICBpbmRleEZpbGU6IFBhdGgucmVzb2x2ZShwYXJhbS5icm93c2VyT3B0aW9ucy5pbmRleCksXG4gICAgLy8gICAgIGlubGluZUNodW5rTmFtZXM6IFsncnVudGltZSddXG4gICAgLy8gICB9KSk7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IChjbGFzcyBEcmNwQnVpbGRlckFzc2V0c1BsdWdpbiB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWJ1aWxkZXItYXNzZXRzJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGFzc2V0czoge1thc3NldHNQYXRoOiBzdHJpbmddOiBhbnl9ID0gY29tcGlsYXRpb24uYXNzZXRzO1xuICAgICAgICAgIGZvciAoY29uc3QgYXNzZXRzUGF0aCBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG4gICAgICAgICAgICAvLyBsb2cud2FybignaXMgJywgYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykqKFxcLmpzKSQvLmV4ZWMoYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIC8vIGxvZy53YXJuKCdsb29rdXAgYXNzZXRzJywgbWF0Y2hbMV0pO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5pbmxpbmVBc3NldHMuc2V0KG1hdGNoWzFdLCBhc3NldHNbYXNzZXRzUGF0aF0uc291cmNlKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhpcyBpcyBjb25kaXRpb24gb2YgU2VydmVyIHNpZGUgcmVuZGVyaW5nXG4gICAgLy8gUmVmZXIgdG8gYW5ndWxhci1jbGkvcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9zZXJ2ZXIudHNcbiAgICBpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuYnVuZGxlRGVwZW5kZW5jaWVzID09PSAnbm9uZScpIHtcbiAgICAgIHdlYnBhY2tDb25maWcuZXh0ZXJuYWxzID0gW1xuICAgICAgICAvXkBhbmd1bGFyLyxcbiAgICAgICAgKF86IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQpID0+IHtcbiAgICAgICAgLy8gQWJzb2x1dGUgJiBSZWxhdGl2ZSBwYXRocyBhcmUgbm90IGV4dGVybmFsc1xuICAgICAgICBpZiAoL15cXC57MCwyfVxcLy8udGVzdChyZXF1ZXN0KSB8fCBQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgbW9kdWxlIHZpYSBOb2RlXG4gICAgICAgICAgY29uc3QgZSA9IHJlcXVpcmUucmVzb2x2ZShyZXF1ZXN0KTtcbiAgICAgICAgICBjb25zdCBjb21wID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGUpO1xuICAgICAgICAgIGlmIChjb21wID09IG51bGwgfHwgY29tcC5kciA9PSBudWxsICkge1xuICAgICAgICAgICAgLy8gSXQncyBhIG5vZGVfbW9kdWxlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSXQncyBhIHN5c3RlbSB0aGluZyAoLmllIHV0aWwsIGZzLi4uKVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBOb2RlIGNvdWxkbid0IGZpbmQgaXQsIHNvIGl0IG11c3QgYmUgdXNlci1hbGlhc2VkXG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgfVxuICB9XG4gIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBDb21waWxlRG9uZVBsdWdpbigpKTtcblxuICBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG4gIGNoYW5nZUxvYWRlcnMocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXG4gIGlmIChwYXJhbS5zc3IpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG4gICAgT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkuc3NyID0gcGFyYW0uc3NyO1xuICB9XG5cbiAgYXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxXZXBhY2tDb25maWdIYW5kbGVyPigoZmlsZSwgbGFzdFJlc3VsdCwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLndlYnBhY2tDb25maWcpXG4gICAgICByZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuICAgIHJldHVybiBsYXN0UmVzdWx0O1xuICB9KTtcbiAgY29uc3Qgd2ZuYW1lID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsXG4gICAgYHdlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLiR7Kytjb250ZXh0LndlYnBhY2tSdW5Db3VudH0uanNgKTtcbiAgZnMud3JpdGVGaWxlU3luYyh3Zm5hbWUsIHByaW50Q29uZmlnKHdlYnBhY2tDb25maWcpKTtcbiAgY29uc29sZS5sb2coYElmIHlvdSBhcmUgd29uZGVyaW5nIHdoYXQga2luZCBvZiBXZWJhcGNrIGNvbmZpZyBmaWxlIGlzIHVzZWQgaW50ZXJuYWxseSwgY2hlY2tvdXQgJHtjaGFsay5ibHVlQnJpZ2h0KHdmbmFtZSl9YCk7XG4gIHJldHVybiB3ZWJwYWNrQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VMb2FkZXJzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbikge1xuICAvLyBjb25zdCBub1BhcnNlID0gKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZE9wdGltaXplckV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcbiAgLy8gbm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuXG4gIC8vIGNvbnN0IGRldk1vZGUgPSB3ZWJwYWNrQ29uZmlnLm1vZGUgPT09ICdkZXZlbG9wbWVudCc7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSBbXTtcbiAgfVxuICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcy51bnNoaWZ0KFBhdGguam9pbihfX2Rpcm5hbWUsICdsb2FkZXJzJykpO1xuICBpZiAoIXdlYnBhY2tDb25maWcubW9kdWxlKSB7XG4gICAgd2VicGFja0NvbmZpZy5tb2R1bGUgPSB7cnVsZXM6IFtdfTtcbiAgfVxuICBjb25zdCBydWxlcyA9IHdlYnBhY2tDb25maWcubW9kdWxlLnJ1bGVzIGFzIHdlYnBhY2suUnVsZVtdO1xuICBsZXQgaGFzVXJsTG9hZGVyID0gZmFsc2U7XG4gIGxldCBoYXNIdG1sTG9hZGVyID0gZmFsc2U7XG4gIGxldCBmaWxlTG9hZGVyUnVsZUlkeDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0IHVybExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcbiAgICB1c2U6IFt7XG4gICAgICBsb2FkZXI6ICd1cmwtbG9hZGVyJyxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgbGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuICAgICAgICBmYWxsYmFjazogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2RyLWZpbGUtbG9hZGVyJ1xuICAgICAgfVxuICAgIH1dXG4gIH07XG4gIGNvbnN0IGh0bWxMb2FkZXJSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC5odG1sJC8sXG4gICAgdXNlOiBbXG4gICAgICB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG4gICAgXVxuICB9O1xuICBydWxlcy5mb3JFYWNoKChydWxlLCBydWxlSWR4KSA9PiB7XG4gICAgY29uc3QgdGVzdCA9IHJ1bGUudGVzdDtcbiAgICBpZiAocnVsZS51c2UpIHtcbiAgICAgIGNvbnN0IGlkeCA9IChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkuZmluZEluZGV4KHJ1bGVTZXQgPT4gcnVsZVNldC5sb2FkZXIgPT09ICdwb3N0Y3NzLWxvYWRlcicpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkuc3BsaWNlKGlkeCArIDEsIDAsIHtcbiAgICAgICAgICBsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcidcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkucHVzaCh7bG9hZGVyOiAnY3NzLXVybC1sb2FkZXInfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQW5ndWxhciA4IGRvZXNuJ3QgaGF2ZSBsb2FkZXIgZm9yIEhUTUxcbiAgICBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5odG1sJC8nKSB7XG4gICAgICBoYXNIdG1sTG9hZGVyID0gdHJ1ZTtcbiAgICAgIE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24ocnVsZSwgaHRtbExvYWRlclJ1bGUpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICdmaWxlLWxvYWRlcicpIHtcbiAgICAgIGZpbGVMb2FkZXJSdWxlSWR4ID0gcnVsZUlkeDtcbiAgICAgIE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24ocnVsZSwge1xuICAgICAgICB0ZXN0OiAvXFwuKGVvdHxzdmd8Y3VyfHdlYnB8b3RmfHR0Znx3b2ZmfHdvZmYyfGFuaSkkLyxcbiAgICAgICAgdXNlOiBbe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2RyLWZpbGUtbG9hZGVyJ31dXG4gICAgICB9KTtcblxuICAgIH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICd1cmwtbG9hZGVyJykge1xuICAgICAgaGFzVXJsTG9hZGVyID0gdHJ1ZTtcbiAgICAgIE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24ocnVsZSwgdXJsTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKS5pbmRleE9mKCdcXFxcLnNjc3MnKSA+PSAwICYmIHJ1bGUudXNlKSB7XG4gICAgICBjb25zdCB1c2UgPSAocnVsZS51c2UgYXMgQXJyYXk8e1trZXk6IHN0cmluZ106IGFueSwgbG9hZGVyOiBzdHJpbmd9Pik7XG4gICAgICBjb25zdCBpbnNlcnRJZHggPSB1c2UuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5sb2FkZXIgPT09ICdzYXNzLWxvYWRlcicpO1xuICAgICAgaWYgKGluc2VydElkeCA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzYXNzLWxvYWRlciBpcyBub3QgZm91bmQnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5lZWRTb3VyY2VNYXAgPSB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcDtcbiAgICAgIC8vIHJlc29sdmUtdXJsLWxvYWRlcjogXCJzb3VyY2UgbWFwcyBtdXN0IGJlIGVuYWJsZWQgb24gYW55IHByZWNlZGluZyBsb2FkZXJcIlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2Job2xsb3dheS9yZXNvbHZlLXVybC1sb2FkZXJcbiAgICAgIHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwID0gdHJ1ZTtcbiAgICAgIHVzZS5zcGxpY2UoaW5zZXJ0SWR4LCAwLCB7XG4gICAgICAgIGxvYWRlcjogJ3Jlc29sdmUtdXJsLWxvYWRlcicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBzb3VyY2VNYXA6IG5lZWRTb3VyY2VNYXBcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5sZXNzJC8nICYmIHJ1bGUudXNlKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZUl0ZW0gb2YgcnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pIHtcbiAgICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyID09PSAnbGVzcy1sb2FkZXInICYmIF8uaGFzKHVzZUl0ZW0sICdvcHRpb25zLnBhdGhzJykpIHtcbiAgICAgICAgICBkZWxldGUgKHVzZUl0ZW0ub3B0aW9ucyBhcyBhbnkpLnBhdGhzO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFoYXNVcmxMb2FkZXIpIHtcbiAgICBpZiAoZmlsZUxvYWRlclJ1bGVJZHggPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmaWxlLWxvYWRlciBydWxlIGZyb20gQW5ndWxhclxcJ3MgV2VicGFjayBjb25maWcnKTtcbiAgICBjb25zb2xlLmxvZygnSW5zZXJ0IHVybC1sb2FkZXInKTtcbiAgICBydWxlcy5zcGxpY2UoZmlsZUxvYWRlclJ1bGVJZHggKyAxLCAwLCB1cmxMb2FkZXJSdWxlKTtcbiAgfVxuICBydWxlcy51bnNoaWZ0KHtcbiAgICAvLyB0ZXN0OiAvXFwuKD86bmdmYWN0b3J5XFwuanN8Y29tcG9uZW50XFwuaHRtbCkkLyxcbiAgICB0ZXN0OiBmaWxlID0+IHtcbiAgICAgIGlmIChmaWxlLmVuZHNXaXRoKCcuY29tcG9uZW50Lmh0bWwnKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gISFhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgfSxcbiAgICB1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyJ31dXG4gIH0pO1xuXG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIG9uZU9mOiBbXG4gICAge1xuICAgICAgdGVzdDogL1xcLmphZGUkLyxcbiAgICAgIHVzZTogW1xuICAgICAgICB7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuICAgICAgICB7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG4gICAgICAgIHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9qYWRlLXRvLWh0bWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5tZCQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG4gICAgICAgIHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgICAge2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL21hcmtkb3duLWxvYWRlcid9XG4gICAgICBdXG4gICAgfSxcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwudHh0JC8sXG4gICAgICB1c2U6IHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICB9LCB7XG4gICAgICB0ZXN0OiAvXFwuKHlhbWx8eW1sKSQvLFxuICAgICAgdXNlOiBbXG4gICAgICAgIHtsb2FkZXI6ICdqc29uLWxvYWRlcid9LFxuICAgICAgICB7bG9hZGVyOiAneWFtbC1sb2FkZXInfVxuICAgICAgXVxuICAgIH1dXG4gIH0pO1xuXG4gIGlmICghaGFzSHRtbExvYWRlcikge1xuICAgIHJ1bGVzWzBdLm9uZU9mICYmIHJ1bGVzWzBdLm9uZU9mLnB1c2goaHRtbExvYWRlclJ1bGUpO1xuICB9XG59XG5cbi8vIGZ1bmN0aW9uIG5vdEFuZ3VsYXJKcyhmaWxlOiBzdHJpbmcpIHtcbi8vIFx0aWYgKCFmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdmYWN0b3J5LmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nc3R5bGUuanMnKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdGlmIChub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSkpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHQvLyBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbi8vIFx0Ly8gaWYgKHBrICYmIHBrLmRyKSB7XG4vLyBcdC8vIFx0cmV0dXJuIHRydWU7XG4vLyBcdC8vIH1cbi8vIFx0Y29uc29sZS5sb2coJ2JhYmVsOiAnLCBmaWxlKTtcbi8vIFx0cmV0dXJuIHRydWU7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSkge1xuICBpZiAod2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24gPT0gbnVsbClcbiAgICByZXR1cm47IC8vIFNTUicgV2VicGFjayBjb25maWcgZG9lcyBub3QgaGFzIHRoaXMgcHJvcGVydHlcbiAgY29uc3Qgb2xkVmVuZG9yVGVzdEZ1bmMgPSBfLmdldCh3ZWJwYWNrQ29uZmlnLCAnb3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzLnZlbmRvci50ZXN0Jyk7XG5cbiAgaWYgKG9sZFZlbmRvclRlc3RGdW5jKSB7XG4gICAgY29uc3QgY2FjaGVHcm91cHM6IHtba2V5OiBzdHJpbmddOiB3ZWJwYWNrLk9wdGlvbnMuQ2FjaGVHcm91cHNPcHRpb25zfSA9IHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzO1xuICAgIGNhY2hlR3JvdXBzLnZlbmRvci50ZXN0ID0gdmVuZG9yVGVzdDtcbiAgICBjYWNoZUdyb3Vwcy5sYXp5VmVuZG9yID0ge1xuICAgICAgbmFtZTogJ2xhenktdmVuZG9yJyxcbiAgICAgIGNodW5rczogJ2FzeW5jJyxcbiAgICAgIGVuZm9yY2U6IHRydWUsXG4gICAgICB0ZXN0OiB2ZW5kb3JUZXN0LFxuICAgICAgcHJpb3JpdHk6IDFcbiAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gdmVuZG9yVGVzdChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9Pikge1xuICAgIGNvbnN0IG1heWJlVmVuZG9yID0gb2xkVmVuZG9yVGVzdEZ1bmMobW9kdWxlLCBjaHVua3MpO1xuICAgIGlmICghbWF5YmVWZW5kb3IpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgcmVzb3VyY2UgPSBtb2R1bGUubmFtZUZvckNvbmRpdGlvbiA/IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uKCkgOiAnJztcbiAgICAvLyBjb25zb2xlLmxvZyhgdmVuZG9yIHRlc3QsIHJlc291cmNlOiAke3Jlc291cmNlfSwgY2h1bmtzOiAke2NodW5rcy5tYXAoIGMgPT4gYy5uYW1lKX1gKTtcbiAgICBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZSk7XG4gICAgcmV0dXJuIHBrID09IG51bGwgfHwgcGsuZHIgPT0gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG4gIHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG4gIHZhciBvdXQgPSAne1xcbic7XG4gIF8uZm9yT3duKGMsICh2YWx1ZTogYW55LCBwcm9wOiBzdHJpbmcpID0+IHtcbiAgICBvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuICB9KTtcbiAgb3V0ICs9IGluZGVudCArICd9JztcbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcbiAgdmFyIG91dCA9ICcnO1xuICB2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuICBpZiAoXy5pc1N0cmluZyh2YWx1ZSkgfHwgXy5pc051bWJlcih2YWx1ZSkgfHwgXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgb3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgb3V0ICs9ICdbXFxuJztcbiAgICAodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG4gICAgICBvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG4gICAgICBvdXQgKz0gJyxcXG4nO1xuICAgIH0pO1xuICAgIG91dCArPSBpbmRlbnQgKyAnICBdJztcbiAgfSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgb3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuICB9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG4gIH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHtcbiAgICBjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG4gICAgaWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcbiAgICAgIG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgb3V0ICs9ICcgdW5rbm93bic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybUluZGV4SHRtbChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgY29udGVudDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHRyYW5zZm9ybUh0bWwoY29udGVudCwgY29udGV4dC5uZ0J1aWxkT3B0aW9uLmJyb3dzZXJPcHRpb25zLCBzcmNVcmwgPT4ge1xuICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKyQvLmV4ZWMoc3JjVXJsKTtcbiAgICAgIGlmIChtYXRjaCAmJiBjb250ZXh0LmlubGluZUFzc2V0cy5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbnRleHQuaW5saW5lQXNzZXRzLmdldChtYXRjaFsxXSk7XG4gICAgICAgIHJldHVybiBzbVVybC5yZW1vdmVGcm9tKHNvdXJjZSEpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoZSk7XG4gICAgdGhyb3cgZTtcbiAgfVxufVxuXG4iXX0=
