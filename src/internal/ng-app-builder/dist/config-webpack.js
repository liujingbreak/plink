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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtCQUErQjtBQUMvQiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQkFBZ0M7QUFHaEMsMERBQXdCO0FBQ3hCLDRFQUEyQztBQUczQyw4RUFBbUQ7QUFDbkQsNEVBQTJDO0FBQzNDLG1FQUE0RDtBQUM1RCwwRkFBcUQ7QUFDckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRTFELDBEQUEwQjtBQUMxQixpR0FBZ0U7QUFRaEUsU0FBOEIsbUJBQW1CLENBQUMsT0FBdUIsRUFBRSxLQUFzQixFQUFFLGFBQW9DLEVBQ3JJLGlCQUFxQzs7UUFDckMsdUdBQXVHO1FBQ3ZHLE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUU1RSxtRUFBbUU7UUFDbkUsc0VBQXNFO1FBQ3RFLElBQUk7UUFDSixJQUFJLGFBQWEsQ0FBQyxPQUFPLElBQUksSUFBSSxFQUFFO1lBQ2pDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1NBQzVCO1FBQ0QsSUFBSSxhQUFhLENBQUMsU0FBUyxFQUFFO1lBQzNCLE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDOUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLE1BQU0sQ0FBQyxHQUFnQjtnQkFDakQsb0NBQW9DO2dCQUNwQyx3RkFBd0Y7Z0JBQ3hGLHlEQUF5RDtnQkFDekQsMEZBQTBGO2dCQUMxRix1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Y2suanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aCBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuaW1wb3J0IHsgQW5ndWxhckNvbXBpbGVyUGx1Z2luIH0gZnJvbSAnQG5ndG9vbHMvd2VicGFjayc7XG4vLyBpbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgaXNSZWdFeHAgfSBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgVFNSZWFkSG9va2VyIGZyb20gJy4vbmctdHMtcmVwbGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCB9IGZyb20gJy4vbmcvYnVpbGRlci1jb250ZXh0JztcbmltcG9ydCB7IEFuZ3VsYXJDbGlQYXJhbSB9IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBDaHVua0luZm9QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL2NodW5rLWluZm8nO1xuaW1wb3J0IGd6aXBTaXplIGZyb20gJy4vcGx1Z2lucy9nemlwLXNpemUnO1xuaW1wb3J0IHsgdHJhbnNmb3JtSHRtbCB9IGZyb20gJy4vcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbic7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdjb25maWctd2VicGFjaycpO1xuaW1wb3J0IHtBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IG1lbXN0YXRzIGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuLy8gaW1wb3J0IHNldHVwQXNzZXRzIGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcbmV4cG9ydCBpbnRlcmZhY2UgV2VwYWNrQ29uZmlnSGFuZGxlciB7XG4gIC8qKiBAcmV0dXJucyB3ZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3IgUHJvbWlzZSAqL1xuICB3ZWJwYWNrQ29uZmlnKG9yaWdpbmFsQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pOlxuICAgIFByb21pc2U8d2VicGFjay5Db25maWd1cmF0aW9uPiB8IHdlYnBhY2suQ29uZmlndXJhdGlvbiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZVdlYnBhY2tDb25maWcoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcbiAgZHJjcENvbmZpZ1NldHRpbmc6IHtkZXZNb2RlOiBib29sZWFufSkge1xuICAvLyBjb25zdCBhcGk6IHR5cGVvZiBfX2FwaSA9IHJlcXVpcmUoJ19fYXBpJyk7IC8vIGZvcmNlIHRvIGRlZmVyIGxvYWRpbmcgYXBpIHVudGlsIERSQ1AgY29uZmlnIGlzIHJlYWR5XG4gIGNvbnNvbGUubG9nKCc+Pj4+Pj4+Pj4+Pj4+Pj4+PiBjaGFuZ2VXZWJwYWNrQ29uZmlnID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4nKTtcblxuICAvLyBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlICYmIHdlYnBhY2tDb25maWcucmVzb2x2ZS5tYWluRmllbGRzKSB7XG4gIC8vICAgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1haW5GaWVsZHMgPSBbJ2Jyb3dzZXInLCAnbWFpbicsICdtb2R1bGUnXTtcbiAgLy8gfVxuICBpZiAod2VicGFja0NvbmZpZy5wbHVnaW5zID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPSBbXTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIpIHtcbiAgICBjb25zdCBkZXZTZXJ2ZXIgPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcjtcbiAgICBjb25zdCBvcmlnaW4gPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlci5iZWZvcmU7XG4gICAgZGV2U2VydmVyLmJlZm9yZSA9IGZ1bmN0aW9uIGJlZm9yZShhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICAvLyBUbyBlbGltaWF0ZSBITVIgd2ViIHNvY2tldCBpc3N1ZTpcbiAgICAgIC8vICAgRXJyb3IgW0VSUl9IVFRQX0hFQURFUlNfU0VOVF06IENhbm5vdCBzZXQgaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnRcbiAgICAgIC8vIGF0IFNlcnZlclJlc3BvbnNlLnNldEhlYWRlciAoX2h0dHBfb3V0Z29pbmcuanM6NDcwOjExKVxuICAgICAgLy8gYXQgQXJyYXkud3JpdGUgKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9maW5hbGhhbmRsZXIvaW5kZXguanM6Mjg1OjkpXG4gICAgICAvLyBhdCBsaXN0ZW5lciAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL29uLWZpbmlzaGVkL2luZGV4LmpzOjE2OToxNSlcbiAgICAgIC8vIGF0IG9uRmluaXNoICgvVXNlcnMvbGl1amluZy9iay9jcmVkaXQtYXBwbC9ub2RlX21vZHVsZXMvb24tZmluaXNoZWQvaW5kZXguanM6MTAwOjUpXG4gICAgICAvLyBhdCBjYWxsYmFjayAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL2VlLWZpcnN0L2luZGV4LmpzOjU1OjEwKVxuXG4gICAgICBhcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBvbGQgPSByZXMuc2V0SGVhZGVyO1xuICAgICAgICAvLyBjb25zdCBvbGRFbmQgPSByZXMuZW5kO1xuICAgICAgICByZXMuc2V0SGVhZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIG9sZC5hcHBseShyZXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUuY29kZSA9PT0gJ0VSUl9IVFRQX0hFQURFUlNfU0VOVCcpIHtcbiAgICAgICAgICAgICAgbG9nLndhcm4oJ0Nhbm5vdCBzZXQgaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICBuZXh0KCk7XG4gICAgICB9KTtcbiAgICAgIGlmIChvcmlnaW4pXG4gICAgICAgIG9yaWdpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgZGV2U2VydmVyLmNvbXByZXNzID0gdHJ1ZTtcbiAgICBpZiAoZGV2U2VydmVyLmhlYWRlcnMgPT0gbnVsbClcbiAgICAgIGRldlNlcnZlci5oZWFkZXJzID0ge307XG4gICAgLy8gQ09SUyBlbmFibGVtZW50XG4gICAgZGV2U2VydmVyLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgIGRldlNlcnZlci5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJ10gPSAnKic7XG4gIH1cblxuICBpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0JykgfHxcbiAgcGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0IHx8KHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLm9wZW5SZXBvcnQpKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2goXG4gICAgICBuZXcgQ2h1bmtJbmZvUGx1Z2luKClcbiAgICApO1xuICB9XG5cbiAgLy8gd2VicGFja0NvbmZpZy5tb2R1bGUubm9QYXJzZSA9IChmaWxlOiBzdHJpbmcpID0+IG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKTtcblxuICAvLyBDaGFuZ2UgQW5ndWxhckNvbXBpbGVyUGx1Z2luJ3Mgb3B0aW9uXG4gIGNvbnN0IG5nQ29tcGlsZXJQbHVnaW4gPSB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMuZmluZCgocGx1Z2luOiBhbnkpID0+IHtcbiAgICByZXR1cm4gKHBsdWdpbiBpbnN0YW5jZW9mIEFuZ3VsYXJDb21waWxlclBsdWdpbik7XG4gIH0pIGFzIEFuZ3VsYXJDb21waWxlclBsdWdpbjtcbiAgaWYgKG5nQ29tcGlsZXJQbHVnaW4gPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBBbmd1bGFyQ29tcGlsZXJQbHVnaW4nKTtcbiAgLy8gSGFjayBhbmd1bGFyL3BhY2thZ2VzL25ndG9vbHMvd2VicGFjay9zcmMvYW5ndWxhcl9jb21waWxlcl9wbHVnaW4udHMgISEhIVxuICAvLyBjb25zdCB0cmFuc2Zvcm1lcnM6IHRzLlRyYW5zZm9ybWVyRmFjdG9yeTx0cy5Tb3VyY2VGaWxlPltdID0gKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fdHJhbnNmb3JtZXJzO1xuICAvLyB0cmFuc2Zvcm1lcnMudW5zaGlmdCgoY29udGV4dCkgPT4ge1xuICAvLyAgIHJldHVybiAodHNTcmMpID0+IHtcbiAgLy8gICAgIGNvbnNvbGUubG9nKCdoZWxsb3c6JywgdHNTcmMuZmlsZU5hbWUpO1xuICAvLyAgICAgcmV0dXJuIHRzU3JjO1xuICAvLyAgIH07XG4gIC8vIH0pO1xuICAod2VicGFja0NvbmZpZy5wbHVnaW5zIGFzIGFueVtdKS51bnNoaWZ0KG5ldyBjbGFzcyB7XG4gICAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgICBjb25zdCBob29rZXIgPSBuZXcgVFNSZWFkSG9va2VyKHBhcmFtKTtcbiAgICAgIG5nQ29tcGlsZXJQbHVnaW4ub3B0aW9ucy5ob3N0ID0gbmV3IFJlYWRIb29rSG9zdCgoY29tcGlsZXIgYXMgYW55KS5pbnB1dEZpbGVTeXN0ZW0sIGhvb2tlci5ob29rRnVuYyk7XG4gICAgICAvLyBEdWUgdG8gaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci1jbGkvcHVsbC8xMjk2OVxuICAgICAgbmdDb21waWxlclBsdWdpbi5vcHRpb25zLmRpcmVjdFRlbXBsYXRlTG9hZGluZyA9IGZhbHNlO1xuICAgICAgLy8gVE9ETzogT25jZSBBbmd1bGFyIGNsaSAodjguMS54KSB1cGdyYWRlcyB0byBhbGxvdyBjaGFuZ2luZyBkaXJlY3RUZW1wbGF0ZUxvYWRpbmcsIHdlIHNob3VsZCByZW1vdmVcbiAgICAgIC8vIGJlbG93IGhhY2sgY29kZS5cbiAgICAgICgobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl90cmFuc2Zvcm1lcnMgYXMgYW55W10pLnNwbGljZSgwKTtcbiAgICAgIChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX21ha2VUcmFuc2Zvcm1lcnMoKTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmNsZWFyKCk7XG4gICAgICB9KTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICBob29rZXIubG9nRmlsZUNvdW50KCk7XG4gICAgICAgIG1lbXN0YXRzKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0oKSk7XG5cbiAgaWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLnN0YXRzSnNvbikge1xuICAgIGxvZy53YXJuKCdZb3UgaGF2ZSBlbmJhYmxlZCBcInN0YXRzSnNvbjogdHJ1ZVwiIGluIEFuZ3VsYXIuanNvbiBvciBDb21tYW5kIGxpbmUsIGl0IHdpbGwgZ2VuZXJhdGUgYSBiaWcgZmlsZSBpbiBvdXRwdXQgZGlyZWN0b3J5XFxuJyArXG4gICAgICAnU3VnZ2VzdCB5b3UgdG8gcmVtb3ZlIGl0IGJlZm9yZSBkZXBsb3kgdGhlIHdob2xlIG91dHB1dCByZXNvdXJjZSB0byBzb21ld2hlcmUsIG9yIHlvdSBzaG91bGQgZGlzYWJsZSB0aGlzIG9wdGlvbixcXG4nICtcbiAgICAgICdjdXpcXCcgbmctYXBwLWJ1aWxkZXIgd2lsbCBnZW5lcmF0ZSBhbm90aGVyIHN0YXRzLmpzb24gZmlsZSBpbiBpdHMgcmVwb3J0IGRpcmVjdG9yeSBmb3IgcHJvZHVjdGlvbiBtb2RlJyk7XG4gIH1cblxuICBpZiAoIWRyY3BDb25maWdTZXR0aW5nLmRldk1vZGUpIHtcbiAgICBjb25zb2xlLmxvZygnQnVpbGQgaW4gcHJvZHVjdGlvbiBtb2RlJyk7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2goXG4gICAgICBuZXcgZ3ppcFNpemUoKSxcbiAgICAgIG5ldyAoY2xhc3Mge1xuICAgICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcCgnYW5ndWxhci1jbGktc3RhdHMnLCBjb21waWxhdGlvbiA9PiB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5zdHJpbmdpZnkoY29tcGlsYXRpb24uZ2V0U3RhdHMoKS50b0pzb24oJ3ZlcmJvc2UnKSk7XG4gICAgICAgICAgICBjb25zdCByZXBvcnRGaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd3ZWJwYWNrLXN0YXRzLmpzb24nKTtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShyZXBvcnRGaWxlLCBkYXRhLFxuICAgICAgICAgICAgICAoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikgcmV0dXJuIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgIGxvZy5pbmZvKGBXZWJwYWNrIGNvbXBpbGF0aW9uIHN0YXRzIGlzIHdyaXR0ZW4gdG8gJHtyZXBvcnRGaWxlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9fSkoKVxuICAgICk7XG4gIH1cblxuICBpZiAod2VicGFja0NvbmZpZy50YXJnZXQgIT09ICdub2RlJykge1xuICAgIC8vIFNpbmNlIEFuZ3VsYXIgOC4xLjAsIHRoZXJlIGlzIG5vIGluZGV4SHRtbFBsdWdpbiB1c2VkIGluIFdlYnBhY2sgY29uZmlndXJhdGlvblxuICAgIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBJbmRleEh0bWxQbHVnaW4oe1xuICAgIC8vICAgICBpbmRleEZpbGU6IFBhdGgucmVzb2x2ZShwYXJhbS5icm93c2VyT3B0aW9ucy5pbmRleCksXG4gICAgLy8gICAgIGlubGluZUNodW5rTmFtZXM6IFsncnVudGltZSddXG4gICAgLy8gICB9KSk7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IChjbGFzcyBEcmNwQnVpbGRlckFzc2V0c1BsdWdpbiB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWJ1aWxkZXItYXNzZXRzJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGFzc2V0czoge1thc3NldHNQYXRoOiBzdHJpbmddOiBhbnl9ID0gY29tcGlsYXRpb24uYXNzZXRzO1xuICAgICAgICAgIGZvciAoY29uc3QgYXNzZXRzUGF0aCBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG4gICAgICAgICAgICAvLyBsb2cud2FybignaXMgJywgYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykqKFxcLmpzKSQvLmV4ZWMoYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIC8vIGxvZy53YXJuKCdsb29rdXAgYXNzZXRzJywgbWF0Y2hbMV0pO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5pbmxpbmVBc3NldHMuc2V0KG1hdGNoWzFdLCBhc3NldHNbYXNzZXRzUGF0aF0uc291cmNlKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhpcyBpcyBjb25kaXRpb24gb2YgU2VydmVyIHNpZGUgcmVuZGVyaW5nXG4gICAgLy8gUmVmZXIgdG8gYW5ndWxhci1jbGkvcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9zZXJ2ZXIudHNcbiAgICBpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuYnVuZGxlRGVwZW5kZW5jaWVzID09PSAnbm9uZScpIHtcbiAgICAgIHdlYnBhY2tDb25maWcuZXh0ZXJuYWxzID0gW1xuICAgICAgICAvXkBhbmd1bGFyLyxcbiAgICAgICAgKF86IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQpID0+IHtcbiAgICAgICAgLy8gQWJzb2x1dGUgJiBSZWxhdGl2ZSBwYXRocyBhcmUgbm90IGV4dGVybmFsc1xuICAgICAgICBpZiAoL15cXC57MCwyfVxcLy8udGVzdChyZXF1ZXN0KSB8fCBQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgbW9kdWxlIHZpYSBOb2RlXG4gICAgICAgICAgY29uc3QgZSA9IHJlcXVpcmUucmVzb2x2ZShyZXF1ZXN0KTtcbiAgICAgICAgICBjb25zdCBjb21wID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGUpO1xuICAgICAgICAgIGlmIChjb21wID09IG51bGwgfHwgY29tcC5kciA9PSBudWxsICkge1xuICAgICAgICAgICAgLy8gSXQncyBhIG5vZGVfbW9kdWxlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSXQncyBhIHN5c3RlbSB0aGluZyAoLmllIHV0aWwsIGZzLi4uKVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBOb2RlIGNvdWxkbid0IGZpbmQgaXQsIHNvIGl0IG11c3QgYmUgdXNlci1hbGlhc2VkXG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgfVxuICB9XG4gIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBDb21waWxlRG9uZVBsdWdpbigpKTtcblxuICBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG4gIGNoYW5nZUxvYWRlcnMocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXG4gIGlmIChwYXJhbS5zc3IpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG4gIH1cblxuICBhd2FpdCBhcGkuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPFdlcGFja0NvbmZpZ0hhbmRsZXI+KChmaWxlLCBsYXN0UmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIud2VicGFja0NvbmZpZylcbiAgICAgIHJldHVybiBoYW5kbGVyLndlYnBhY2tDb25maWcod2VicGFja0NvbmZpZyk7XG4gICAgcmV0dXJuIGxhc3RSZXN1bHQ7XG4gIH0pO1xuXG4gIGNvbnN0IHdmbmFtZSA9IGFwaS5jb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLFxuICAgIGB3ZWJwYWNrLSR7cGFyYW0uc3NyID8gJ3NzcicgOiAnYnJvd3Nlcid9LmNvbmZpZy4keysrY29udGV4dC53ZWJwYWNrUnVuQ291bnR9LmpzYCk7XG4gIGZzLndyaXRlRmlsZVN5bmMod2ZuYW1lLCBwcmludENvbmZpZyh3ZWJwYWNrQ29uZmlnKSk7XG4gIGNvbnNvbGUubG9nKGBJZiB5b3UgYXJlIHdvbmRlcmluZyB3aGF0IGtpbmQgb2YgV2ViYXBjayBjb25maWcgZmlsZSBpcyB1c2VkIGludGVybmFsbHksIGNoZWNrb3V0ICR7Y2hhbGsuYmx1ZUJyaWdodCh3Zm5hbWUpfWApO1xuICByZXR1cm4gd2VicGFja0NvbmZpZztcbn1cblxuZnVuY3Rpb24gY2hhbmdlTG9hZGVycyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pIHtcbiAgLy8gY29uc3Qgbm9QYXJzZSA9IChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnYnVpbGRPcHRpbWl6ZXJFeGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG4gIC8vIG5vUGFyc2UucHVzaCguLi5hcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnYnVpbGQtb3B0aW1pemVyOmV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcblxuICAvLyBjb25zdCBkZXZNb2RlID0gd2VicGFja0NvbmZpZy5tb2RlID09PSAnZGV2ZWxvcG1lbnQnO1xuICBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPSB7fTtcbiAgfVxuICBpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gW107XG4gIH1cbiAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMudW5zaGlmdChQYXRoLmpvaW4oX19kaXJuYW1lLCAnbG9hZGVycycpKTtcbiAgaWYgKCF3ZWJwYWNrQ29uZmlnLm1vZHVsZSkge1xuICAgIHdlYnBhY2tDb25maWcubW9kdWxlID0ge3J1bGVzOiBbXX07XG4gIH1cbiAgY29uc3QgcnVsZXMgPSB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ydWxlcyBhcyB3ZWJwYWNrLlJ1bGVbXTtcbiAgbGV0IGhhc1VybExvYWRlciA9IGZhbHNlO1xuICBsZXQgaGFzSHRtbExvYWRlciA9IGZhbHNlO1xuICBsZXQgZmlsZUxvYWRlclJ1bGVJZHg6IG51bWJlciB8IHVuZGVmaW5lZDtcblxuICBjb25zdCB1cmxMb2FkZXJSdWxlID0ge1xuICAgIHRlc3Q6IC9cXC4oanBnfHBuZ3xnaWYpJC8sXG4gICAgdXNlOiBbe1xuICAgICAgbG9hZGVyOiAndXJsLWxvYWRlcicsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGxpbWl0OiAxMDAwMCwgLy8gPDEwayAsdXNlIGJhc2U2NCBmb3JtYXRcbiAgICAgICAgZmFsbGJhY2s6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcidcbiAgICAgIH1cbiAgICB9XVxuICB9O1xuICBjb25zdCBodG1sTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIF1cbiAgfTtcbiAgcnVsZXMuZm9yRWFjaCgocnVsZSwgcnVsZUlkeCkgPT4ge1xuICAgIGNvbnN0IHRlc3QgPSBydWxlLnRlc3Q7XG4gICAgaWYgKHJ1bGUudXNlKSB7XG4gICAgICBjb25zdCBpZHggPSAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLmZpbmRJbmRleChydWxlU2V0ID0+IHJ1bGVTZXQubG9hZGVyID09PSAncG9zdGNzcy1sb2FkZXInKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnNwbGljZShpZHggKyAxLCAwLCB7XG4gICAgICAgICAgbG9hZGVyOiAnY3NzLXVybC1sb2FkZXInXG4gICAgICAgIH0pO1xuICAgICAgICAvLyAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnB1c2goe2xvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ30pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEFuZ3VsYXIgOCBkb2Vzbid0IGhhdmUgbG9hZGVyIGZvciBIVE1MXG4gICAgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpID09PSAnL1xcXFwuaHRtbCQvJykge1xuICAgICAgaGFzSHRtbExvYWRlciA9IHRydWU7XG4gICAgICBPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKHJ1bGUsIGh0bWxMb2FkZXJSdWxlKTtcbiAgICB9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAnZmlsZS1sb2FkZXInKSB7XG4gICAgICBmaWxlTG9hZGVyUnVsZUlkeCA9IHJ1bGVJZHg7XG4gICAgICBPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKHJ1bGUsIHtcbiAgICAgICAgdGVzdDogL1xcLihlb3R8c3ZnfGN1cnx3ZWJwfG90Znx0dGZ8d29mZnx3b2ZmMnxhbmkpJC8sXG4gICAgICAgIHVzZTogW3tsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcid9XVxuICAgICAgfSk7XG5cbiAgICB9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAndXJsLWxvYWRlcicpIHtcbiAgICAgIGhhc1VybExvYWRlciA9IHRydWU7XG4gICAgICBPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG4gICAgICBPYmplY3QuYXNzaWduKHJ1bGUsIHVybExvYWRlclJ1bGUpO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkuaW5kZXhPZignXFxcXC5zY3NzJykgPj0gMCAmJiBydWxlLnVzZSkge1xuICAgICAgY29uc3QgdXNlID0gKHJ1bGUudXNlIGFzIEFycmF5PHtba2V5OiBzdHJpbmddOiBhbnksIGxvYWRlcjogc3RyaW5nfT4pO1xuICAgICAgY29uc3QgaW5zZXJ0SWR4ID0gdXNlLmZpbmRJbmRleChpdGVtID0+IGl0ZW0ubG9hZGVyID09PSAnc2Fzcy1sb2FkZXInKTtcbiAgICAgIGlmIChpbnNlcnRJZHggPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc2Fzcy1sb2FkZXIgaXMgbm90IGZvdW5kJyk7XG4gICAgICB9XG4gICAgICBjb25zdCBuZWVkU291cmNlTWFwID0gdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXA7XG4gICAgICAvLyByZXNvbHZlLXVybC1sb2FkZXI6IFwic291cmNlIG1hcHMgbXVzdCBiZSBlbmFibGVkIG9uIGFueSBwcmVjZWRpbmcgbG9hZGVyXCJcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaG9sbG93YXkvcmVzb2x2ZS11cmwtbG9hZGVyXG4gICAgICB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcCA9IHRydWU7XG4gICAgICB1c2Uuc3BsaWNlKGluc2VydElkeCwgMCwge1xuICAgICAgICBsb2FkZXI6ICdyZXNvbHZlLXVybC1sb2FkZXInLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgc291cmNlTWFwOiBuZWVkU291cmNlTWFwXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgLy8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvZGVidWctbG9hZGVyJywgb3B0aW9uczoge2lkOiAnbGVzcyBsb2FkZXJzJ319KTtcbiAgICB9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpID09PSAnL1xcXFwubGVzcyQvJyAmJiBydWxlLnVzZSkge1xuICAgICAgZm9yIChjb25zdCB1c2VJdGVtIG9mIHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKSB7XG4gICAgICAgIGlmICh1c2VJdGVtLmxvYWRlciA9PT0gJ2xlc3MtbG9hZGVyJyAmJiBfLmhhcyh1c2VJdGVtLCAnb3B0aW9ucy5wYXRocycpKSB7XG4gICAgICAgICAgZGVsZXRlICh1c2VJdGVtLm9wdGlvbnMgYXMgYW55KS5wYXRocztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvZGVidWctbG9hZGVyJywgb3B0aW9uczoge2lkOiAnbGVzcyBsb2FkZXJzJ319KTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmICghaGFzVXJsTG9hZGVyKSB7XG4gICAgaWYgKGZpbGVMb2FkZXJSdWxlSWR4ID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgZmlsZS1sb2FkZXIgcnVsZSBmcm9tIEFuZ3VsYXJcXCdzIFdlYnBhY2sgY29uZmlnJyk7XG4gICAgY29uc29sZS5sb2coJ0luc2VydCB1cmwtbG9hZGVyJyk7XG4gICAgcnVsZXMuc3BsaWNlKGZpbGVMb2FkZXJSdWxlSWR4ICsgMSwgMCwgdXJsTG9hZGVyUnVsZSk7XG4gIH1cbiAgcnVsZXMudW5zaGlmdCh7XG4gICAgLy8gdGVzdDogL1xcLig/Om5nZmFjdG9yeVxcLmpzfGNvbXBvbmVudFxcLmh0bWwpJC8sXG4gICAgdGVzdDogZmlsZSA9PiB7XG4gICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnLmNvbXBvbmVudC5odG1sJykpXG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgcmV0dXJuICEhYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgIH0sXG4gICAgdXNlOiBbe2xvYWRlcjogJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlcid9XVxuICB9KTtcblxuICBydWxlcy51bnNoaWZ0KHtcbiAgICBvbmVPZjogW1xuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5qYWRlJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICB7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvamFkZS10by1odG1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfSxcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwubWQkLyxcbiAgICAgIHVzZTogW1xuICAgICAgICB7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuICAgICAgICB7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG4gICAgICAgIHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9tYXJrZG93bi1sb2FkZXInfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgdGVzdDogL1xcLnR4dCQvLFxuICAgICAgdXNlOiB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG4gICAgfSwge1xuICAgICAgdGVzdDogL1xcLih5YW1sfHltbCkkLyxcbiAgICAgIHVzZTogW1xuICAgICAgICB7bG9hZGVyOiAnanNvbi1sb2FkZXInfSxcbiAgICAgICAge2xvYWRlcjogJ3lhbWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9XVxuICB9KTtcblxuICBpZiAoIWhhc0h0bWxMb2FkZXIpIHtcbiAgICBydWxlc1swXS5vbmVPZiAmJiBydWxlc1swXS5vbmVPZi5wdXNoKGh0bWxMb2FkZXJSdWxlKTtcbiAgfVxufVxuXG4vLyBmdW5jdGlvbiBub3RBbmd1bGFySnMoZmlsZTogc3RyaW5nKSB7XG4vLyBcdGlmICghZmlsZS5lbmRzV2l0aCgnLmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nZmFjdG9yeS5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ3N0eWxlLmpzJykpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHRpZiAobm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0Ly8gY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4vLyBcdC8vIGlmIChwayAmJiBway5kcikge1xuLy8gXHQvLyBcdHJldHVybiB0cnVlO1xuLy8gXHQvLyB9XG4vLyBcdGNvbnNvbGUubG9nKCdiYWJlbDogJywgZmlsZSk7XG4vLyBcdHJldHVybiB0cnVlO1xuLy8gfVxuXG5mdW5jdGlvbiBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiBhbnkpIHtcbiAgaWYgKHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uID09IG51bGwpXG4gICAgcmV0dXJuOyAvLyBTU1InIFdlYnBhY2sgY29uZmlnIGRvZXMgbm90IGhhcyB0aGlzIHByb3BlcnR5XG4gIGNvbnN0IG9sZFZlbmRvclRlc3RGdW5jID0gXy5nZXQod2VicGFja0NvbmZpZywgJ29wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCcpO1xuXG4gIGlmIChvbGRWZW5kb3JUZXN0RnVuYykge1xuICAgIGNvbnN0IGNhY2hlR3JvdXBzOiB7W2tleTogc3RyaW5nXTogd2VicGFjay5PcHRpb25zLkNhY2hlR3JvdXBzT3B0aW9uc30gPSB3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3VwcztcbiAgICBjYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCA9IHZlbmRvclRlc3Q7XG4gICAgY2FjaGVHcm91cHMubGF6eVZlbmRvciA9IHtcbiAgICAgIG5hbWU6ICdsYXp5LXZlbmRvcicsXG4gICAgICBjaHVua3M6ICdhc3luYycsXG4gICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgdGVzdDogdmVuZG9yVGVzdCxcbiAgICAgIHByaW9yaXR5OiAxXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZlbmRvclRlc3QobW9kdWxlOiBhbnksIGNodW5rczogQXJyYXk8eyBuYW1lOiBzdHJpbmcgfT4pIHtcbiAgICBjb25zdCBtYXliZVZlbmRvciA9IG9sZFZlbmRvclRlc3RGdW5jKG1vZHVsZSwgY2h1bmtzKTtcbiAgICBpZiAoIW1heWJlVmVuZG9yKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHJlc291cmNlID0gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24gPyBtb2R1bGUubmFtZUZvckNvbmRpdGlvbigpIDogJyc7XG4gICAgLy8gY29uc29sZS5sb2coYHZlbmRvciB0ZXN0LCByZXNvdXJjZTogJHtyZXNvdXJjZX0sIGNodW5rczogJHtjaHVua3MubWFwKCBjID0+IGMubmFtZSl9YCk7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2UpO1xuICAgIHJldHVybiBwayA9PSBudWxsIHx8IHBrLmRyID09IG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuICB2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuICB2YXIgb3V0ID0gJ3tcXG4nO1xuICBfLmZvck93bihjLCAodmFsdWU6IGFueSwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgb3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcbiAgfSk7XG4gIG91dCArPSBpbmRlbnQgKyAnfSc7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG4gIHZhciBvdXQgPSAnJztcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgaWYgKF8uaXNTdHJpbmcodmFsdWUpIHx8IF8uaXNOdW1iZXIodmFsdWUpIHx8IF8uaXNCb29sZWFuKHZhbHVlKSkge1xuICAgIG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIG91dCArPSAnW1xcbic7XG4gICAgKHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcbiAgfSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuICB9IGVsc2UgaWYgKF8uaXNPYmplY3QodmFsdWUpKSB7XG4gICAgY29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgIGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICBvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1JbmRleEh0bWwoY29udGV4dDogQnVpbGRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIHJldHVybiB0cmFuc2Zvcm1IdG1sKGNvbnRlbnQsIGNvbnRleHQubmdCdWlsZE9wdGlvbi5icm93c2VyT3B0aW9ucywgc3JjVXJsID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybCk7XG4gICAgICBpZiAobWF0Y2ggJiYgY29udGV4dC5pbmxpbmVBc3NldHMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBjb250ZXh0LmlubGluZUFzc2V0cy5nZXQobWF0Y2hbMV0pO1xuICAgICAgICByZXR1cm4gc21VcmwucmVtb3ZlRnJvbShzb3VyY2UhKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGUpO1xuICAgIHRocm93IGU7XG4gIH1cbn1cblxuIl19
