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
            // const origin = webpackConfig.devServer.before;
            // devServer.before = function after(app: Application) {
            //   setupAssets(devServer.publicPath || '/', app.use.bind(app));
            //   if (origin)
            //     origin.apply(this, arguments);
            // };
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtCQUErQjtBQUMvQiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQkFBZ0M7QUFHaEMsMERBQXdCO0FBQ3hCLDRFQUEyQztBQUczQyw4RUFBbUQ7QUFDbkQsNEVBQTJDO0FBQzNDLG1FQUE0RDtBQUM1RCwwRkFBcUQ7QUFDckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDeEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBUzFELFNBQThCLG1CQUFtQixDQUFDLE9BQXVCLEVBQUUsS0FBc0IsRUFBRSxhQUFvQyxFQUNySSxpQkFBcUM7O1FBQ3JDLHVHQUF1RztRQUN2RyxPQUFPLENBQUMsR0FBRyxDQUFDLDhEQUE4RCxDQUFDLENBQUM7UUFFNUUsbUVBQW1FO1FBQ25FLHNFQUFzRTtRQUN0RSxJQUFJO1FBQ0osSUFBSSxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUNqQyxhQUFhLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUM1QjtRQUNELElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUMzQixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO1lBQzFDLGlEQUFpRDtZQUNqRCx3REFBd0Q7WUFDeEQsaUVBQWlFO1lBQ2pFLGdCQUFnQjtZQUNoQixxQ0FBcUM7WUFDckMsS0FBSztZQUNMLFNBQVMsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQzFCLElBQUksU0FBUyxDQUFDLE9BQU8sSUFBSSxJQUFJO2dCQUMzQixTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUN6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LENBQUM7S0FDbkI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFFRCxTQUFzQixrQkFBa0IsQ0FBQyxPQUF1QixFQUFFLE9BQWU7O1FBQy9FLElBQUk7WUFDRixPQUFPLGlDQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUMzRSxNQUFNLEtBQUssR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BELElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUMvQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbEQsT0FBTyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU8sQ0FBQyxDQUFDO2lCQUNsQztnQkFDRCxPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDYixNQUFNLENBQUMsQ0FBQztTQUNUO0lBQ0gsQ0FBQztDQUFBO0FBZEQsZ0RBY0MiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvY29uZmlnLXdlYnBhY2suanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlIG1heC1saW5lLWxlbmd0aCBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuaW1wb3J0IHsgQW5ndWxhckNvbXBpbGVyUGx1Z2luIH0gZnJvbSAnQG5ndG9vbHMvd2VicGFjayc7XG4vLyBpbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgaXNSZWdFeHAgfSBmcm9tICd1dGlsJztcbmltcG9ydCAqIGFzIHdlYnBhY2sgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgVFNSZWFkSG9va2VyIGZyb20gJy4vbmctdHMtcmVwbGFjZSc7XG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCB9IGZyb20gJy4vbmcvYnVpbGRlci1jb250ZXh0JztcbmltcG9ydCB7IEFuZ3VsYXJDbGlQYXJhbSB9IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBDaHVua0luZm9QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL2NodW5rLWluZm8nO1xuaW1wb3J0IGd6aXBTaXplIGZyb20gJy4vcGx1Z2lucy9nemlwLXNpemUnO1xuaW1wb3J0IHsgdHJhbnNmb3JtSHRtbCB9IGZyb20gJy4vcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbic7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdjb25maWctd2VicGFjaycpO1xuLy8gaW1wb3J0IHtBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG4vLyBpbXBvcnQgc2V0dXBBc3NldHMgZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuZXhwb3J0IGludGVyZmFjZSBXZXBhY2tDb25maWdIYW5kbGVyIHtcbiAgLyoqIEByZXR1cm5zIHdlYnBhY2sgY29uZmlndXJhdGlvbiBvciBQcm9taXNlICovXG4gIHdlYnBhY2tDb25maWcob3JpZ2luYWxDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbik6XG4gICAgUHJvbWlzZTx3ZWJwYWNrLkNvbmZpZ3VyYXRpb24+IHwgd2VicGFjay5Db25maWd1cmF0aW9uIHwgdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlV2VicGFja0NvbmZpZyhjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgcGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uLFxuICBkcmNwQ29uZmlnU2V0dGluZzoge2Rldk1vZGU6IGJvb2xlYW59KSB7XG4gIC8vIGNvbnN0IGFwaTogdHlwZW9mIF9fYXBpID0gcmVxdWlyZSgnX19hcGknKTsgLy8gZm9yY2UgdG8gZGVmZXIgbG9hZGluZyBhcGkgdW50aWwgRFJDUCBjb25maWcgaXMgcmVhZHlcbiAgY29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IGNoYW5nZVdlYnBhY2tDb25maWcgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpO1xuXG4gIC8vIGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmUgJiYgd2VicGFja0NvbmZpZy5yZXNvbHZlLm1haW5GaWVsZHMpIHtcbiAgLy8gICB3ZWJwYWNrQ29uZmlnLnJlc29sdmUubWFpbkZpZWxkcyA9IFsnYnJvd3NlcicsICdtYWluJywgJ21vZHVsZSddO1xuICAvLyB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPT0gbnVsbCkge1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucyA9IFtdO1xuICB9XG4gIGlmICh3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcikge1xuICAgIGNvbnN0IGRldlNlcnZlciA9IHdlYnBhY2tDb25maWcuZGV2U2VydmVyO1xuICAgIC8vIGNvbnN0IG9yaWdpbiA9IHdlYnBhY2tDb25maWcuZGV2U2VydmVyLmJlZm9yZTtcbiAgICAvLyBkZXZTZXJ2ZXIuYmVmb3JlID0gZnVuY3Rpb24gYWZ0ZXIoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgIC8vICAgc2V0dXBBc3NldHMoZGV2U2VydmVyLnB1YmxpY1BhdGggfHwgJy8nLCBhcHAudXNlLmJpbmQoYXBwKSk7XG4gICAgLy8gICBpZiAob3JpZ2luKVxuICAgIC8vICAgICBvcmlnaW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAvLyB9O1xuICAgIGRldlNlcnZlci5jb21wcmVzcyA9IHRydWU7XG4gICAgaWYgKGRldlNlcnZlci5oZWFkZXJzID09IG51bGwpXG4gICAgICBkZXZTZXJ2ZXIuaGVhZGVycyA9IHt9O1xuICAgIC8vIENPUlMgZW5hYmxlbWVudFxuICAgIGRldlNlcnZlci5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSA9ICcqJztcbiAgICBkZXZTZXJ2ZXIuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyddID0gJyonO1xuICB9XG5cbiAgaWYgKF8uZ2V0KHBhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmRyY3BBcmdzLnJlcG9ydCcpIHx8XG4gIHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLnJlcG9ydCB8fChwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5vcGVuUmVwb3J0KSkge1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuICAgICAgbmV3IENodW5rSW5mb1BsdWdpbigpXG4gICAgKTtcbiAgfVxuXG4gIC8vIHdlYnBhY2tDb25maWcubW9kdWxlLm5vUGFyc2UgPSAoZmlsZTogc3RyaW5nKSA9PiBub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSk7XG5cbiAgLy8gQ2hhbmdlIEFuZ3VsYXJDb21waWxlclBsdWdpbidzIG9wdGlvblxuICBjb25zdCBuZ0NvbXBpbGVyUGx1Z2luID0gd2VicGFja0NvbmZpZy5wbHVnaW5zLmZpbmQoKHBsdWdpbjogYW55KSA9PiB7XG4gICAgcmV0dXJuIChwbHVnaW4gaW5zdGFuY2VvZiBBbmd1bGFyQ29tcGlsZXJQbHVnaW4pO1xuICB9KSBhcyBBbmd1bGFyQ29tcGlsZXJQbHVnaW47XG4gIGlmIChuZ0NvbXBpbGVyUGx1Z2luID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgQW5ndWxhckNvbXBpbGVyUGx1Z2luJyk7XG4gIC8vIEhhY2sgYW5ndWxhci9wYWNrYWdlcy9uZ3Rvb2xzL3dlYnBhY2svc3JjL2FuZ3VsYXJfY29tcGlsZXJfcGx1Z2luLnRzICEhISFcbiAgLy8gY29uc3QgdHJhbnNmb3JtZXJzOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX3RyYW5zZm9ybWVycztcbiAgLy8gdHJhbnNmb3JtZXJzLnVuc2hpZnQoKGNvbnRleHQpID0+IHtcbiAgLy8gICByZXR1cm4gKHRzU3JjKSA9PiB7XG4gIC8vICAgICBjb25zb2xlLmxvZygnaGVsbG93OicsIHRzU3JjLmZpbGVOYW1lKTtcbiAgLy8gICAgIHJldHVybiB0c1NyYztcbiAgLy8gICB9O1xuICAvLyB9KTtcbiAgKHdlYnBhY2tDb25maWcucGx1Z2lucyBhcyBhbnlbXSkudW5zaGlmdChuZXcgY2xhc3Mge1xuICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgY29uc3QgaG9va2VyID0gbmV3IFRTUmVhZEhvb2tlcihwYXJhbSk7XG4gICAgICBuZ0NvbXBpbGVyUGx1Z2luLm9wdGlvbnMuaG9zdCA9IG5ldyBSZWFkSG9va0hvc3QoKGNvbXBpbGVyIGFzIGFueSkuaW5wdXRGaWxlU3lzdGVtLCBob29rZXIuaG9va0Z1bmMpO1xuICAgICAgLy8gRHVlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9hbmd1bGFyL2FuZ3VsYXItY2xpL3B1bGwvMTI5NjlcbiAgICAgIG5nQ29tcGlsZXJQbHVnaW4ub3B0aW9ucy5kaXJlY3RUZW1wbGF0ZUxvYWRpbmcgPSBmYWxzZTtcbiAgICAgIC8vIFRPRE86IE9uY2UgQW5ndWxhciBjbGkgKHY4LjEueCkgdXBncmFkZXMgdG8gYWxsb3cgY2hhbmdpbmcgZGlyZWN0VGVtcGxhdGVMb2FkaW5nLCB3ZSBzaG91bGQgcmVtb3ZlXG4gICAgICAvLyBiZWxvdyBoYWNrIGNvZGUuXG4gICAgICAoKG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fdHJhbnNmb3JtZXJzIGFzIGFueVtdKS5zcGxpY2UoMCk7XG4gICAgICAobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl9tYWtlVHJhbnNmb3JtZXJzKCk7XG4gICAgICBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCd0cy1yZWFkLWhvb2snLCBhc3luYyAoKSA9PiB7XG4gICAgICAgIGhvb2tlci5jbGVhcigpO1xuICAgICAgfSk7XG4gICAgICBjb21waWxlci5ob29rcy5kb25lLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmxvZ0ZpbGVDb3VudCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KCkpO1xuXG4gIGlmICghZHJjcENvbmZpZ1NldHRpbmcuZGV2TW9kZSkge1xuICAgIGNvbnNvbGUubG9nKCdCdWlsZCBpbiBwcm9kdWN0aW9uIG1vZGUnKTtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgZ3ppcFNpemUoKSk7XG4gIH1cblxuICBpZiAod2VicGFja0NvbmZpZy50YXJnZXQgIT09ICdub2RlJykge1xuICAgIC8vIFNpbmNlIEFuZ3VsYXIgOC4xLjAsIHRoZXJlIGlzIG5vIGluZGV4SHRtbFBsdWdpbiB1c2VkIGluIFdlYnBhY2sgY29uZmlndXJhdGlvblxuICAgIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBJbmRleEh0bWxQbHVnaW4oe1xuICAgIC8vICAgICBpbmRleEZpbGU6IFBhdGgucmVzb2x2ZShwYXJhbS5icm93c2VyT3B0aW9ucy5pbmRleCksXG4gICAgLy8gICAgIGlubGluZUNodW5rTmFtZXM6IFsncnVudGltZSddXG4gICAgLy8gICB9KSk7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IChjbGFzcyBEcmNwQnVpbGRlckFzc2V0c1BsdWdpbiB7XG4gICAgICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAgICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWJ1aWxkZXItYXNzZXRzJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgICAgIGNvbnN0IGFzc2V0czoge1thc3NldHNQYXRoOiBzdHJpbmddOiBhbnl9ID0gY29tcGlsYXRpb24uYXNzZXRzO1xuICAgICAgICAgIGZvciAoY29uc3QgYXNzZXRzUGF0aCBvZiBPYmplY3Qua2V5cyhhc3NldHMpKSB7XG4gICAgICAgICAgICAvLyBsb2cud2FybignaXMgJywgYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykqKFxcLmpzKSQvLmV4ZWMoYXNzZXRzUGF0aCk7XG4gICAgICAgICAgICBpZiAoIW1hdGNoKVxuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIC8vIGxvZy53YXJuKCdsb29rdXAgYXNzZXRzJywgbWF0Y2hbMV0pO1xuICAgICAgICAgICAgaWYgKGNvbnRleHQuaW5saW5lQXNzZXRzLmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICAgICAgY29udGV4dC5pbmxpbmVBc3NldHMuc2V0KG1hdGNoWzFdLCBhc3NldHNbYXNzZXRzUGF0aF0uc291cmNlKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkoKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhpcyBpcyBjb25kaXRpb24gb2YgU2VydmVyIHNpZGUgcmVuZGVyaW5nXG4gICAgLy8gUmVmZXIgdG8gYW5ndWxhci1jbGkvcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9zZXJ2ZXIudHNcbiAgICBpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuYnVuZGxlRGVwZW5kZW5jaWVzID09PSAnbm9uZScpIHtcbiAgICAgIHdlYnBhY2tDb25maWcuZXh0ZXJuYWxzID0gW1xuICAgICAgICAvXkBhbmd1bGFyLyxcbiAgICAgICAgKF86IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQpID0+IHtcbiAgICAgICAgLy8gQWJzb2x1dGUgJiBSZWxhdGl2ZSBwYXRocyBhcmUgbm90IGV4dGVybmFsc1xuICAgICAgICBpZiAoL15cXC57MCwyfVxcLy8udGVzdChyZXF1ZXN0KSB8fCBQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgbW9kdWxlIHZpYSBOb2RlXG4gICAgICAgICAgY29uc3QgZSA9IHJlcXVpcmUucmVzb2x2ZShyZXF1ZXN0KTtcbiAgICAgICAgICBjb25zdCBjb21wID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGUpO1xuICAgICAgICAgIGlmIChjb21wID09IG51bGwgfHwgY29tcC5kciA9PSBudWxsICkge1xuICAgICAgICAgICAgLy8gSXQncyBhIG5vZGVfbW9kdWxlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSXQncyBhIHN5c3RlbSB0aGluZyAoLmllIHV0aWwsIGZzLi4uKVxuICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAvLyBOb2RlIGNvdWxkbid0IGZpbmQgaXQsIHNvIGl0IG11c3QgYmUgdXNlci1hbGlhc2VkXG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgICB9XG4gICAgICBdO1xuICAgICAgfVxuICB9XG4gIC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBDb21waWxlRG9uZVBsdWdpbigpKTtcblxuICBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG4gIGNoYW5nZUxvYWRlcnMocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXG4gIGlmIChwYXJhbS5zc3IpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG4gIH1cblxuICBhd2FpdCBhcGkuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPFdlcGFja0NvbmZpZ0hhbmRsZXI+KChmaWxlLCBsYXN0UmVzdWx0LCBoYW5kbGVyKSA9PiB7XG4gICAgaWYgKGhhbmRsZXIud2VicGFja0NvbmZpZylcbiAgICAgIHJldHVybiBoYW5kbGVyLndlYnBhY2tDb25maWcod2VicGFja0NvbmZpZyk7XG4gICAgcmV0dXJuIGxhc3RSZXN1bHQ7XG4gIH0pO1xuXG4gIGNvbnN0IHdmbmFtZSA9IGBkaXN0L3dlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLiR7Kytjb250ZXh0LndlYnBhY2tSdW5Db3VudH0uanNgO1xuICBmcy53cml0ZUZpbGVTeW5jKHdmbmFtZSwgcHJpbnRDb25maWcod2VicGFja0NvbmZpZykpO1xuICBjb25zb2xlLmxvZyhgSWYgeW91IGFyZSB3b25kZXJpbmcgd2hhdCBraW5kIG9mIFdlYmFwY2sgY29uZmlnIGZpbGUgaXMgdXNlZCBpbnRlcm5hbGx5LCBjaGVja291dCAke3dmbmFtZX1gKTtcbiAgcmV0dXJuIHdlYnBhY2tDb25maWc7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUxvYWRlcnMocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKSB7XG4gIC8vIGNvbnN0IG5vUGFyc2UgPSAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkT3B0aW1pemVyRXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuICAvLyBub1BhcnNlLnB1c2goLi4uYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkLW9wdGltaXplcjpleGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG5cbiAgLy8gY29uc3QgZGV2TW9kZSA9IHdlYnBhY2tDb25maWcubW9kZSA9PT0gJ2RldmVsb3BtZW50JztcbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID0ge307XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9IFtdO1xuICB9XG4gIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzLnVuc2hpZnQoUGF0aC5qb2luKF9fZGlybmFtZSwgJ2xvYWRlcnMnKSk7XG4gIGlmICghd2VicGFja0NvbmZpZy5tb2R1bGUpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLm1vZHVsZSA9IHtydWxlczogW119O1xuICB9XG4gIGNvbnN0IHJ1bGVzID0gd2VicGFja0NvbmZpZy5tb2R1bGUucnVsZXMgYXMgd2VicGFjay5SdWxlW107XG4gIGxldCBoYXNVcmxMb2FkZXIgPSBmYWxzZTtcbiAgbGV0IGhhc0h0bWxMb2FkZXIgPSBmYWxzZTtcbiAgbGV0IGZpbGVMb2FkZXJSdWxlSWR4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3QgdXJsTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuKGpwZ3xwbmd8Z2lmKSQvLFxuICAgIHVzZTogW3tcbiAgICAgIGxvYWRlcjogJ3VybC1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsaW1pdDogMTAwMDAsIC8vIDwxMGsgLHVzZSBiYXNlNjQgZm9ybWF0XG4gICAgICAgIGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG4gICAgICB9XG4gICAgfV1cbiAgfTtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcLmh0bWwkLyxcbiAgICB1c2U6IFtcbiAgICAgIHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cbiAgICAgIC8vIHtsb2FkZXI6ICduZy1odG1sLWxvYWRlcid9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgIC8vIHtsb2FkZXI6ICdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcid9LFxuICAgICAgLy8ge2xvYWRlcjogJ0Bkci90ZW1wbGF0ZS1idWlsZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLmZvckVhY2goKHJ1bGUsIHJ1bGVJZHgpID0+IHtcbiAgICBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuICAgIGlmIChydWxlLnVzZSkge1xuICAgICAgY29uc3QgaWR4ID0gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5maW5kSW5kZXgocnVsZVNldCA9PiBydWxlU2V0LmxvYWRlciA9PT0gJ3Bvc3Rjc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5zcGxpY2UoaWR4ICsgMSwgMCwge1xuICAgICAgICAgIGxvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5wdXNoKHtsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcid9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5qcyQvJyAmJiBydWxlLnVzZSAmJlxuICAgIC8vICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldFVzZUl0ZW1bXSkuc29tZSgoaXRlbSkgPT5cbiAgICAvLyAgICAgL0Bhbmd1bGFyLWRldmtpdFsvXFxcXF1idWlsZC1vcHRpbWl6ZXJbL1xcXFxdLipbL1xcXFxdd2VicGFjay1sb2FkZXIvLnRlc3QoXG4gICAgLy8gICAgIChpdGVtIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcikubG9hZGVyISkpKSB7XG5cbiAgICAvLyAgICAgbGV0IG9yaWdUZXN0OiAocDogc3RyaW5nKSA9PiBib29sZWFuO1xuICAgIC8vICAgICBpZiAocnVsZS50ZXN0IGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgLy8gICAgICAgb3JpZ1Rlc3QgPSAocGF0aDogc3RyaW5nKSA9PiAocnVsZS50ZXN0IGFzIFJlZ0V4cCkudGVzdChwYXRoKTtcbiAgICAvLyAgICAgfSBlbHNlIGlmICh0eXBlb2YgcnVsZS50ZXN0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gICAgICAgb3JpZ1Rlc3QgPSBydWxlLnRlc3Q7XG4gICAgLy8gICAgIH0gZWxzZSB7XG4gICAgLy8gICAgICAgdGhyb3cgbmV3IEVycm9yKCdEb2VzIG5vdCBzdXBwb3J0IG1vZHVsZS5ydWxlXFwncyB0ZXN0IGNvbmRpdGlvbiB0eXBlIGZvciBAYW5ndWxhci1kZXZraXQvYnVpbGQtb3B0aW1pemVyLCBpbmZvcm0gdGhlIGF1dGhvciB0byB1cGRhdGUgY29uZmlnLXdlYnBhY2sudHMnKTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBydWxlLnRlc3QgPSAocGF0aDogc3RyaW5nKSA9PiB7XG4gICAgLy8gICAgICAgaWYgKG9yaWdUZXN0KHBhdGgpKSB7XG4gICAgLy8gICAgICAgICBjb25zdCBuUGF0aCA9IHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vICAgICAgICAgcmV0dXJuIG5vUGFyc2UuZXZlcnkoKGV4Y2x1ZGUgPT4gIW5QYXRoLmluY2x1ZGVzKGV4Y2x1ZGUpKSk7XG4gICAgLy8gICAgICAgfVxuICAgIC8vICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAvLyAgICAgfTtcbiAgICAvLyB9XG4gICAgLy8gQW5ndWxhciA4IGRvZXNuJ3QgaGF2ZSBsb2FkZXIgZm9yIEhUTUxcbiAgICBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5odG1sJC8nKSB7XG4gICAgICBoYXNIdG1sTG9hZGVyID0gdHJ1ZTtcbiAgICAgIE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24ocnVsZSwgaHRtbExvYWRlclJ1bGUpO1xuICAgIH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICdmaWxlLWxvYWRlcicpIHtcbiAgICAgIGZpbGVMb2FkZXJSdWxlSWR4ID0gcnVsZUlkeDtcbiAgICAgIE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24ocnVsZSwge1xuICAgICAgICB0ZXN0OiAvXFwuKGVvdHxzdmd8Y3VyfHdlYnB8b3RmfHR0Znx3b2ZmfHdvZmYyfGFuaSkkLyxcbiAgICAgICAgdXNlOiBbe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2RyLWZpbGUtbG9hZGVyJ31dXG4gICAgICB9KTtcblxuICAgIH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICd1cmwtbG9hZGVyJykge1xuICAgICAgaGFzVXJsTG9hZGVyID0gdHJ1ZTtcbiAgICAgIE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcbiAgICAgIE9iamVjdC5hc3NpZ24ocnVsZSwgdXJsTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKS5pbmRleE9mKCdcXFxcLnNjc3MnKSA+PSAwICYmIHJ1bGUudXNlKSB7XG4gICAgICBjb25zdCB1c2UgPSAocnVsZS51c2UgYXMgQXJyYXk8e1trZXk6IHN0cmluZ106IGFueSwgbG9hZGVyOiBzdHJpbmd9Pik7XG4gICAgICBjb25zdCBpbnNlcnRJZHggPSB1c2UuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5sb2FkZXIgPT09ICdzYXNzLWxvYWRlcicpO1xuICAgICAgaWYgKGluc2VydElkeCA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzYXNzLWxvYWRlciBpcyBub3QgZm91bmQnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5lZWRTb3VyY2VNYXAgPSB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcDtcbiAgICAgIC8vIHJlc29sdmUtdXJsLWxvYWRlcjogXCJzb3VyY2UgbWFwcyBtdXN0IGJlIGVuYWJsZWQgb24gYW55IHByZWNlZGluZyBsb2FkZXJcIlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL2Job2xsb3dheS9yZXNvbHZlLXVybC1sb2FkZXJcbiAgICAgIHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwID0gdHJ1ZTtcbiAgICAgIHVzZS5zcGxpY2UoaW5zZXJ0SWR4LCAwLCB7XG4gICAgICAgIGxvYWRlcjogJ3Jlc29sdmUtdXJsLWxvYWRlcicsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBzb3VyY2VNYXA6IG5lZWRTb3VyY2VNYXBcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5sZXNzJC8nICYmIHJ1bGUudXNlKSB7XG4gICAgICBmb3IgKGNvbnN0IHVzZUl0ZW0gb2YgcnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pIHtcbiAgICAgICAgaWYgKHVzZUl0ZW0ubG9hZGVyID09PSAnbGVzcy1sb2FkZXInICYmIF8uaGFzKHVzZUl0ZW0sICdvcHRpb25zLnBhdGhzJykpIHtcbiAgICAgICAgICBkZWxldGUgKHVzZUl0ZW0ub3B0aW9ucyBhcyBhbnkpLnBhdGhzO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFoYXNVcmxMb2FkZXIpIHtcbiAgICBpZiAoZmlsZUxvYWRlclJ1bGVJZHggPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmaWxlLWxvYWRlciBydWxlIGZyb20gQW5ndWxhclxcJ3MgV2VicGFjayBjb25maWcnKTtcbiAgICBjb25zb2xlLmxvZygnSW5zZXJ0IHVybC1sb2FkZXInKTtcbiAgICBydWxlcy5zcGxpY2UoZmlsZUxvYWRlclJ1bGVJZHggKyAxLCAwLCB1cmxMb2FkZXJSdWxlKTtcbiAgfVxuICBydWxlcy51bnNoaWZ0KHtcbiAgICAvLyB0ZXN0OiAvXFwuKD86bmdmYWN0b3J5XFwuanN8Y29tcG9uZW50XFwuaHRtbCkkLyxcbiAgICB0ZXN0OiBmaWxlID0+IHtcbiAgICAgIGlmIChmaWxlLmVuZHNXaXRoKCcuY29tcG9uZW50Lmh0bWwnKSlcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICByZXR1cm4gISFhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgfSxcbiAgICB1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyJ31dXG4gIH0pO1xuXG4gIHJ1bGVzLnVuc2hpZnQoe1xuICAgIG9uZU9mOiBbXG4gICAge1xuICAgICAgdGVzdDogL1xcLmphZGUkLyxcbiAgICAgIHVzZTogW1xuICAgICAgICB7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuICAgICAgICB7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG4gICAgICAgIC8vIHtsb2FkZXI6ICdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcid9LFxuICAgICAgICB7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvamFkZS10by1odG1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfSxcbiAgICB7XG4gICAgICB0ZXN0OiAvXFwubWQkLyxcbiAgICAgIHVzZTogW1xuICAgICAgICB7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuICAgICAgICB7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG4gICAgICAgIHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9tYXJrZG93bi1sb2FkZXInfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgdGVzdDogL1xcLnR4dCQvLFxuICAgICAgdXNlOiB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG4gICAgfSwge1xuICAgICAgdGVzdDogL1xcLih5YW1sfHltbCkkLyxcbiAgICAgIHVzZTogW1xuICAgICAgICB7bG9hZGVyOiAnanNvbi1sb2FkZXInfSxcbiAgICAgICAge2xvYWRlcjogJ3lhbWwtbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9XVxuICB9KTtcblxuICBpZiAoIWhhc0h0bWxMb2FkZXIpIHtcbiAgICBydWxlc1swXS5vbmVPZiAmJiBydWxlc1swXS5vbmVPZi5wdXNoKGh0bWxMb2FkZXJSdWxlKTtcbiAgfVxufVxuXG4vLyBmdW5jdGlvbiBub3RBbmd1bGFySnMoZmlsZTogc3RyaW5nKSB7XG4vLyBcdGlmICghZmlsZS5lbmRzV2l0aCgnLmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nZmFjdG9yeS5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ3N0eWxlLmpzJykpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHRpZiAobm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0Ly8gY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4vLyBcdC8vIGlmIChwayAmJiBway5kcikge1xuLy8gXHQvLyBcdHJldHVybiB0cnVlO1xuLy8gXHQvLyB9XG4vLyBcdGNvbnNvbGUubG9nKCdiYWJlbDogJywgZmlsZSk7XG4vLyBcdHJldHVybiB0cnVlO1xuLy8gfVxuXG5mdW5jdGlvbiBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiBhbnkpIHtcbiAgaWYgKHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uID09IG51bGwpXG4gICAgcmV0dXJuOyAvLyBTU1InIFdlYnBhY2sgY29uZmlnIGRvZXMgbm90IGhhcyB0aGlzIHByb3BlcnR5XG4gIGNvbnN0IG9sZFZlbmRvclRlc3RGdW5jID0gXy5nZXQod2VicGFja0NvbmZpZywgJ29wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCcpO1xuXG4gIGlmIChvbGRWZW5kb3JUZXN0RnVuYykge1xuICAgIGNvbnN0IGNhY2hlR3JvdXBzOiB7W2tleTogc3RyaW5nXTogd2VicGFjay5PcHRpb25zLkNhY2hlR3JvdXBzT3B0aW9uc30gPSB3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3VwcztcbiAgICBjYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCA9IHZlbmRvclRlc3Q7XG4gICAgY2FjaGVHcm91cHMubGF6eVZlbmRvciA9IHtcbiAgICAgIG5hbWU6ICdsYXp5LXZlbmRvcicsXG4gICAgICBjaHVua3M6ICdhc3luYycsXG4gICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgdGVzdDogdmVuZG9yVGVzdCxcbiAgICAgIHByaW9yaXR5OiAxXG4gICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHZlbmRvclRlc3QobW9kdWxlOiBhbnksIGNodW5rczogQXJyYXk8eyBuYW1lOiBzdHJpbmcgfT4pIHtcbiAgICBjb25zdCBtYXliZVZlbmRvciA9IG9sZFZlbmRvclRlc3RGdW5jKG1vZHVsZSwgY2h1bmtzKTtcbiAgICBpZiAoIW1heWJlVmVuZG9yKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IHJlc291cmNlID0gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24gPyBtb2R1bGUubmFtZUZvckNvbmRpdGlvbigpIDogJyc7XG4gICAgLy8gY29uc29sZS5sb2coYHZlbmRvciB0ZXN0LCByZXNvdXJjZTogJHtyZXNvdXJjZX0sIGNodW5rczogJHtjaHVua3MubWFwKCBjID0+IGMubmFtZSl9YCk7XG4gICAgY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2UpO1xuICAgIHJldHVybiBwayA9PSBudWxsIHx8IHBrLmRyID09IG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuICB2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuICB2YXIgb3V0ID0gJ3tcXG4nO1xuICBfLmZvck93bihjLCAodmFsdWU6IGFueSwgcHJvcDogc3RyaW5nKSA9PiB7XG4gICAgb3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcbiAgfSk7XG4gIG91dCArPSBpbmRlbnQgKyAnfSc7XG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG4gIHZhciBvdXQgPSAnJztcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgaWYgKF8uaXNTdHJpbmcodmFsdWUpIHx8IF8uaXNOdW1iZXIodmFsdWUpIHx8IF8uaXNCb29sZWFuKHZhbHVlKSkge1xuICAgIG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgIG91dCArPSAnW1xcbic7XG4gICAgKHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuICAgICAgb3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuICAgICAgb3V0ICs9ICcsXFxuJztcbiAgICB9KTtcbiAgICBvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG4gIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcbiAgfSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuICB9IGVsc2UgaWYgKF8uaXNPYmplY3QodmFsdWUpKSB7XG4gICAgY29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuICAgIGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG4gICAgICBvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG91dCArPSAnIHVua25vd24nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1JbmRleEh0bWwoY29udGV4dDogQnVpbGRlckNvbnRleHQsIGNvbnRlbnQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIHJldHVybiB0cmFuc2Zvcm1IdG1sKGNvbnRlbnQsIGNvbnRleHQubmdCdWlsZE9wdGlvbi5icm93c2VyT3B0aW9ucywgc3JjVXJsID0+IHtcbiAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybCk7XG4gICAgICBpZiAobWF0Y2ggJiYgY29udGV4dC5pbmxpbmVBc3NldHMuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICBjb25zdCBzb3VyY2UgPSBjb250ZXh0LmlubGluZUFzc2V0cy5nZXQobWF0Y2hbMV0pO1xuICAgICAgICByZXR1cm4gc21VcmwucmVtb3ZlRnJvbShzb3VyY2UhKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmVycm9yKGUpO1xuICAgIHRocm93IGU7XG4gIH1cbn1cblxuIl19
