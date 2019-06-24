"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console max-line-length max-classes-per-file */
const webpack_1 = require("@ngtools/webpack");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const util_1 = require("util");
const __api_1 = tslib_1.__importDefault(require("__api"));
const ng_ts_replace_1 = tslib_1.__importDefault(require("./ng-ts-replace"));
const chunk_info_1 = tslib_1.__importDefault(require("./plugins/chunk-info"));
const gzip_size_1 = tslib_1.__importDefault(require("./plugins/gzip-size"));
const index_html_plugin_1 = tslib_1.__importDefault(require("./plugins/index-html-plugin"));
const read_hook_vfshost_1 = tslib_1.__importDefault(require("./utils/read-hook-vfshost"));
const dev_serve_assets_1 = tslib_1.__importDefault(require("@dr-core/assets-processer/dist/dev-serve-assets"));
function changeWebpackConfig(param, webpackConfig, drcpConfigSetting) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const api: typeof __api = require('__api'); // force to defer loading api until DRCP config is ready
        console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
        if (webpackConfig.plugins == null) {
            webpackConfig.plugins = [];
        }
        if (webpackConfig.devServer) {
            const devServer = webpackConfig.devServer;
            const origin = webpackConfig.devServer.before;
            webpackConfig.devServer.before = function after(app) {
                dev_serve_assets_1.default(devServer.publicPath || '/', app.use.bind(app));
                if (origin)
                    origin.apply(this, arguments);
            };
        }
        if (_.get(param, 'builderConfig.options.drcpArgs.report') ||
            param.browserOptions.drcpArgs.report || (param.browserOptions.drcpArgs.openReport)) {
            webpackConfig.plugins.push(new chunk_info_1.default());
        }
        // webpackConfig.module.noParse = (file: string) => noParse.some(name => file.replace(/\\/g, '/').includes(name));
        const ngCompilerPlugin = webpackConfig.plugins.find((plugin) => {
            return (plugin instanceof webpack_1.AngularCompilerPlugin);
        });
        if (ngCompilerPlugin == null)
            throw new Error('Can not find AngularCompilerPlugin');
        // hack _options.host before angular/packages/ngtools/webpack/src/angular_compiler_plugin.ts apply() runs
        webpackConfig.plugins.unshift(new class {
            apply(compiler) {
                const hooker = new ng_ts_replace_1.default(param);
                ngCompilerPlugin._options.host = new read_hook_vfshost_1.default(compiler.inputFileSystem, hooker.hookFunc);
                compiler.hooks.watchRun.tapPromise('ts-read-hook', () => tslib_1.__awaiter(this, void 0, void 0, function* () {
                    hooker.clear();
                }));
            }
        }());
        if (!drcpConfigSetting.devMode) {
            console.log('Build in production mode');
            webpackConfig.plugins.push(new gzip_size_1.default());
        }
        if (webpackConfig.target !== 'node') {
            webpackConfig.plugins.push(new index_html_plugin_1.default({
                indexFile: Path.resolve(param.browserOptions.index),
                inlineChunkNames: ['runtime']
            }));
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
        const wfname = `dist/webpack-${param.ssr ? 'ssr' : 'browser'}.config.js`;
        fs.writeFileSync(wfname, printConfig(webpackConfig));
        console.log('If you are wondering what kind of Webapck config file is used internally, checkout ' + wfname);
        return webpackConfig;
    });
}
exports.default = changeWebpackConfig;
function changeLoaders(param, webpackConfig) {
    const noParse = __api_1.default.config.get([__api_1.default.packageName, 'buildOptimizerExclude'], []);
    noParse.push(...__api_1.default.config.get([__api_1.default.packageName, 'build-optimizer:exclude'], []));
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
        test: /\\.html$/,
        use: [
            { loader: 'raw-loader' },
            { loader: 'ng-html-loader' },
            // {loader: '@dr/translate-generator'},
            { loader: '@dr/template-builder' }
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
        if (test instanceof RegExp && test.toString() === '/\\.js$/' && rule.use &&
            rule.use.some((item) => item.loader === '@angular-devkit/build-optimizer/webpack-loader')) {
            rule.test = (path) => {
                const nPath = path.replace(/\\/g, '/');
                return noParse.every((exclude => !nPath.includes(exclude)));
            };
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
    if (param.browserOptions.aot) {
        rules.unshift({
            test: /\.ngfactory.js$/,
            use: [{ loader: '@dr-core/ng-app-builder/dist/ng-aot-assets/ng-aot-assets-loader' }]
        });
    }
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
// class CompileDonePlugin {
// 	apply(compiler: Compiler) {
// 		compiler.hooks.done.tap('drcp-devserver-build-webpack', (stats) => {
// 			api.eventBus.emit('webpackDone', {success: true});
// 		});
// 	}
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtDQUF5QjtBQUN6QixrREFBNEI7QUFDNUIsbURBQTZCO0FBQzdCLCtCQUFnQztBQUdoQywwREFBd0I7QUFDeEIsNEVBQTJDO0FBRTNDLDhFQUFtRDtBQUNuRCw0RUFBMkM7QUFDM0MsNEZBQTBEO0FBQzFELDBGQUFxRDtBQUVyRCwrR0FBMEU7QUFNMUUsU0FBOEIsbUJBQW1CLENBQUMsS0FBc0IsRUFBRSxhQUFvQyxFQUM3RyxpQkFBcUM7O1FBQ3JDLHVHQUF1RztRQUN2RyxPQUFPLENBQUMsR0FBRyxDQUFDLDhEQUE4RCxDQUFDLENBQUM7UUFFNUUsSUFBSSxhQUFhLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtZQUNsQyxhQUFhLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztTQUMzQjtRQUNELElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRTtZQUM1QixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO1lBQzFDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1lBQzlDLGFBQWEsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsS0FBSyxDQUFDLEdBQWdCO2dCQUMvRCwwQkFBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLElBQUksR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzVELElBQUksTUFBTTtvQkFDVCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNoQyxDQUFDLENBQUM7U0FDRjtRQUVELElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsdUNBQXVDLENBQUM7WUFDekQsS0FB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Q0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3JDO0tBQ0Q7U0FBTTtRQUNOLEdBQUcsSUFBSSxVQUFVLENBQUM7S0FDbEI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRCw0QkFBNEI7QUFFNUIsK0JBQStCO0FBQy9CLHlFQUF5RTtBQUN6RSx3REFBd0Q7QUFDeEQsUUFBUTtBQUNSLEtBQUs7QUFDTCxJQUFJIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2NvbmZpZy13ZWJwYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCB7IEFuZ3VsYXJDb21waWxlclBsdWdpbiB9IGZyb20gJ0BuZ3Rvb2xzL3dlYnBhY2snO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuL25nLXRzLXJlcGxhY2UnO1xuaW1wb3J0IHsgQW5ndWxhckNsaVBhcmFtIH0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IENodW5rSW5mb1BsdWdpbiBmcm9tICcuL3BsdWdpbnMvY2h1bmstaW5mbyc7XG5pbXBvcnQgZ3ppcFNpemUgZnJvbSAnLi9wbHVnaW5zL2d6aXAtc2l6ZSc7XG5pbXBvcnQgSW5kZXhIdG1sUGx1Z2luIGZyb20gJy4vcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbic7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IHtBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgc2V0dXBBc3NldHMgZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuZXhwb3J0IGludGVyZmFjZSBXZXBhY2tDb25maWdIYW5kbGVyIHtcblx0LyoqIEByZXR1cm5zIHdlYnBhY2sgY29uZmlndXJhdGlvbiBvciBQcm9taXNlICovXG5cdHdlYnBhY2tDb25maWcob3JpZ2luYWxDb25maWc6IGFueSk6IFByb21pc2U8e1tuYW1lOiBzdHJpbmddOiBhbnl9IHwgdm9pZD4gfCB7W25hbWU6IHN0cmluZ106IGFueX0gfCB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VXZWJwYWNrQ29uZmlnKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbixcblx0ZHJjcENvbmZpZ1NldHRpbmc6IHtkZXZNb2RlOiBib29sZWFufSkge1xuXHQvLyBjb25zdCBhcGk6IHR5cGVvZiBfX2FwaSA9IHJlcXVpcmUoJ19fYXBpJyk7IC8vIGZvcmNlIHRvIGRlZmVyIGxvYWRpbmcgYXBpIHVudGlsIERSQ1AgY29uZmlnIGlzIHJlYWR5XG5cdGNvbnNvbGUubG9nKCc+Pj4+Pj4+Pj4+Pj4+Pj4+PiBjaGFuZ2VXZWJwYWNrQ29uZmlnID4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4nKTtcblxuXHRpZiAod2VicGFja0NvbmZpZy5wbHVnaW5zID09IG51bGwpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPSBbXTtcblx0fVxuXHRpZiAod2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIpIHtcblx0XHRjb25zdCBkZXZTZXJ2ZXIgPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcjtcblx0XHRjb25zdCBvcmlnaW4gPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlci5iZWZvcmU7XG5cdFx0d2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIuYmVmb3JlID0gZnVuY3Rpb24gYWZ0ZXIoYXBwOiBBcHBsaWNhdGlvbikge1xuXHRcdFx0c2V0dXBBc3NldHMoZGV2U2VydmVyLnB1YmxpY1BhdGggfHwgJy8nLCBhcHAudXNlLmJpbmQoYXBwKSk7XG5cdFx0XHRpZiAob3JpZ2luKVxuXHRcdFx0XHRvcmlnaW4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0XHR9O1xuXHR9XG5cblx0aWYgKF8uZ2V0KHBhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmRyY3BBcmdzLnJlcG9ydCcpIHx8XG5cdHBhcmFtLmJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLnJlcG9ydCB8fChwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5vcGVuUmVwb3J0KSkge1xuXHRcdHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuXHRcdFx0bmV3IENodW5rSW5mb1BsdWdpbigpXG5cdFx0KTtcblx0fVxuXG5cdC8vIHdlYnBhY2tDb25maWcubW9kdWxlLm5vUGFyc2UgPSAoZmlsZTogc3RyaW5nKSA9PiBub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSk7XG5cblx0Y29uc3QgbmdDb21waWxlclBsdWdpbjogYW55ID0gd2VicGFja0NvbmZpZy5wbHVnaW5zLmZpbmQoKHBsdWdpbjogYW55KSA9PiB7XG5cdFx0cmV0dXJuIChwbHVnaW4gaW5zdGFuY2VvZiBBbmd1bGFyQ29tcGlsZXJQbHVnaW4pO1xuXHR9KTtcblx0aWYgKG5nQ29tcGlsZXJQbHVnaW4gPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBBbmd1bGFyQ29tcGlsZXJQbHVnaW4nKTtcblx0Ly8gaGFjayBfb3B0aW9ucy5ob3N0IGJlZm9yZSBhbmd1bGFyL3BhY2thZ2VzL25ndG9vbHMvd2VicGFjay9zcmMvYW5ndWxhcl9jb21waWxlcl9wbHVnaW4udHMgYXBwbHkoKSBydW5zXG5cdCh3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgYXMgYW55W10pLnVuc2hpZnQobmV3IGNsYXNzIHtcblx0XHRhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcblx0XHRcdGNvbnN0IGhvb2tlciA9IG5ldyBUU1JlYWRIb29rZXIocGFyYW0pO1xuXHRcdFx0KG5nQ29tcGlsZXJQbHVnaW4gYXMgYW55KS5fb3B0aW9ucy5ob3N0ID0gbmV3IFJlYWRIb29rSG9zdCgoY29tcGlsZXIgYXMgYW55KS5pbnB1dEZpbGVTeXN0ZW0sIGhvb2tlci5ob29rRnVuYyk7XG5cdFx0XHRjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCd0cy1yZWFkLWhvb2snLCBhc3luYyAoKSA9PiB7XG5cdFx0XHRcdGhvb2tlci5jbGVhcigpO1xuXHRcdFx0fSk7XG5cdFx0fVxuXHR9KCkpO1xuXG5cdGlmICghZHJjcENvbmZpZ1NldHRpbmcuZGV2TW9kZSkge1xuXHRcdGNvbnNvbGUubG9nKCdCdWlsZCBpbiBwcm9kdWN0aW9uIG1vZGUnKTtcblx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgZ3ppcFNpemUoKSk7XG5cdH1cblxuXHRpZiAod2VicGFja0NvbmZpZy50YXJnZXQgIT09ICdub2RlJykge1xuXHRcdHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBJbmRleEh0bWxQbHVnaW4oe1xuXHRcdFx0XHRpbmRleEZpbGU6IFBhdGgucmVzb2x2ZShwYXJhbS5icm93c2VyT3B0aW9ucy5pbmRleCksXG5cdFx0XHRcdGlubGluZUNodW5rTmFtZXM6IFsncnVudGltZSddXG5cdFx0XHR9KSk7XG5cdH0gZWxzZSB7XG5cdFx0Ly8gVGhpcyBpcyBjb25kaXRpb24gb2YgU2VydmVyIHNpZGUgcmVuZGVyaW5nXG5cdFx0Ly8gUmVmZXIgdG8gYW5ndWxhci1jbGkvcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvbW9kZWxzL3dlYnBhY2stY29uZmlncy9zZXJ2ZXIudHNcblx0XHRpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuYnVuZGxlRGVwZW5kZW5jaWVzID09PSAnbm9uZScpIHtcblx0XHRcdHdlYnBhY2tDb25maWcuZXh0ZXJuYWxzID0gW1xuXHRcdFx0ICAvXkBhbmd1bGFyLyxcblx0XHRcdCAgKF86IGFueSwgcmVxdWVzdDogYW55LCBjYWxsYmFjazogKGVycm9yPzogYW55LCByZXN1bHQ/OiBhbnkpID0+IHZvaWQpID0+IHtcblx0XHRcdFx0Ly8gQWJzb2x1dGUgJiBSZWxhdGl2ZSBwYXRocyBhcmUgbm90IGV4dGVybmFsc1xuXHRcdFx0XHRpZiAoL15cXC57MCwyfVxcLy8udGVzdChyZXF1ZXN0KSB8fCBQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcblx0XHRcdFx0XHRyZXR1cm4gY2FsbGJhY2soKTtcblx0XHRcdFx0fVxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdC8vIEF0dGVtcHQgdG8gcmVzb2x2ZSB0aGUgbW9kdWxlIHZpYSBOb2RlXG5cdFx0XHRcdFx0Y29uc3QgZSA9IHJlcXVpcmUucmVzb2x2ZShyZXF1ZXN0KTtcblx0XHRcdFx0XHRjb25zdCBjb21wID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGUpO1xuXHRcdFx0XHRcdGlmIChjb21wID09IG51bGwgfHwgY29tcC5kciA9PSBudWxsICkge1xuXHRcdFx0XHRcdFx0Ly8gSXQncyBhIG5vZGVfbW9kdWxlXG5cdFx0XHRcdFx0XHRjYWxsYmFjayhudWxsLCByZXF1ZXN0KTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gSXQncyBhIHN5c3RlbSB0aGluZyAoLmllIHV0aWwsIGZzLi4uKVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcblx0XHRcdFx0XHQvLyBOb2RlIGNvdWxkbid0IGZpbmQgaXQsIHNvIGl0IG11c3QgYmUgdXNlci1hbGlhc2VkXG5cdFx0XHRcdFx0Y2FsbGJhY2soKTtcblx0XHRcdFx0fVxuXHRcdFx0ICB9XG5cdFx0XHRdO1xuXHRcdCAgfVxuXHR9XG5cdC8vIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBDb21waWxlRG9uZVBsdWdpbigpKTtcblxuXHRjaGFuZ2VTcGxpdENodW5rcyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG5cdGNoYW5nZUxvYWRlcnMocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXG5cdGlmIChwYXJhbS5zc3IpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG5cdH1cblxuXHRhd2FpdCBhcGkuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPFdlcGFja0NvbmZpZ0hhbmRsZXI+KChmaWxlLCBsYXN0UmVzdWx0LCBoYW5kbGVyKSA9PiB7XG5cdFx0aWYgKGhhbmRsZXIud2VicGFja0NvbmZpZylcblx0XHRcdHJldHVybiBoYW5kbGVyLndlYnBhY2tDb25maWcod2VicGFja0NvbmZpZyk7XG5cdFx0cmV0dXJuIGxhc3RSZXN1bHQ7XG5cdH0pO1xuXG5cdGNvbnN0IHdmbmFtZSA9IGBkaXN0L3dlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLmpzYDtcblx0ZnMud3JpdGVGaWxlU3luYyh3Zm5hbWUsIHByaW50Q29uZmlnKHdlYnBhY2tDb25maWcpKTtcblx0Y29uc29sZS5sb2coJ0lmIHlvdSBhcmUgd29uZGVyaW5nIHdoYXQga2luZCBvZiBXZWJhcGNrIGNvbmZpZyBmaWxlIGlzIHVzZWQgaW50ZXJuYWxseSwgY2hlY2tvdXQgJyArIHdmbmFtZSk7XG5cdHJldHVybiB3ZWJwYWNrQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VMb2FkZXJzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IHdlYnBhY2suQ29uZmlndXJhdGlvbikge1xuXHRjb25zdCBub1BhcnNlID0gKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZE9wdGltaXplckV4Y2x1ZGUnXSwgW10pIGFzIHN0cmluZ1tdKTtcblx0bm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuXG5cdC8vIGNvbnN0IGRldk1vZGUgPSB3ZWJwYWNrQ29uZmlnLm1vZGUgPT09ICdkZXZlbG9wbWVudCc7XG5cdGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPT0gbnVsbCkge1xuXHRcdHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9IHt9O1xuXHR9XG5cdGlmICh3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9PSBudWxsKSB7XG5cdFx0d2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPSBbXTtcblx0fVxuXHR3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcy51bnNoaWZ0KFBhdGguam9pbihfX2Rpcm5hbWUsICdsb2FkZXJzJykpO1xuXHRpZiAoIXdlYnBhY2tDb25maWcubW9kdWxlKSB7XG5cdFx0d2VicGFja0NvbmZpZy5tb2R1bGUgPSB7cnVsZXM6IFtdfTtcblx0fVxuXHRjb25zdCBydWxlcyA9IHdlYnBhY2tDb25maWcubW9kdWxlLnJ1bGVzIGFzIHdlYnBhY2suUnVsZVtdO1xuXHRsZXQgaGFzVXJsTG9hZGVyID0gZmFsc2U7XG5cdGxldCBoYXNIdG1sTG9hZGVyID0gZmFsc2U7XG5cdGxldCBmaWxlTG9hZGVyUnVsZUlkeDogbnVtYmVyIHwgdW5kZWZpbmVkO1xuXG5cdGNvbnN0IHVybExvYWRlclJ1bGUgPSB7XG5cdFx0dGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcblx0XHR1c2U6IFt7XG5cdFx0XHRsb2FkZXI6ICd1cmwtbG9hZGVyJyxcblx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0bGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuXHRcdFx0XHRmYWxsYmFjazogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2RyLWZpbGUtbG9hZGVyJ1xuXHRcdFx0fVxuXHRcdH1dXG5cdH07XG5cdGNvbnN0IGh0bWxMb2FkZXJSdWxlID0ge1xuXHRcdHRlc3Q6IC9cXFxcLmh0bWwkLyxcblx0XHR1c2U6IFtcblx0XHRcdHtsb2FkZXI6ICdyYXctbG9hZGVyJ30sXG5cdFx0XHR7bG9hZGVyOiAnbmctaHRtbC1sb2FkZXInfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG5cdFx0XHQvLyB7bG9hZGVyOiAnQGRyL3RyYW5zbGF0ZS1nZW5lcmF0b3InfSxcblx0XHRcdHtsb2FkZXI6ICdAZHIvdGVtcGxhdGUtYnVpbGRlcid9XG5cdFx0XVxuXHR9O1xuXHRydWxlcy5mb3JFYWNoKChydWxlLCBydWxlSWR4KSA9PiB7XG5cdFx0Y29uc3QgdGVzdCA9IHJ1bGUudGVzdDtcblx0XHRpZiAocnVsZS51c2UpIHtcblx0XHRcdGNvbnN0IGlkeCA9IChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkuZmluZEluZGV4KHJ1bGVTZXQgPT4gcnVsZVNldC5sb2FkZXIgPT09ICdwb3N0Y3NzLWxvYWRlcicpO1xuXHRcdFx0aWYgKGlkeCA+PSAwKSB7XG5cdFx0XHRcdChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkuc3BsaWNlKGlkeCArIDEsIDAsIHtcblx0XHRcdFx0XHRsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcidcblx0XHRcdFx0fSk7XG5cdFx0XHRcdC8vIChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkucHVzaCh7bG9hZGVyOiAnY3NzLXVybC1sb2FkZXInfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpID09PSAnL1xcXFwuanMkLycgJiYgcnVsZS51c2UgJiZcblx0XHRcdChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRVc2VJdGVtW10pLnNvbWUoKGl0ZW0pID0+XG5cdFx0XHRcdChpdGVtIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcikubG9hZGVyID09PSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLW9wdGltaXplci93ZWJwYWNrLWxvYWRlcicpKSB7XG5cdFx0XHRydWxlLnRlc3QgPSAocGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHRcdGNvbnN0IG5QYXRoID0gcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRcdHJldHVybiBub1BhcnNlLmV2ZXJ5KChleGNsdWRlID0+ICFuUGF0aC5pbmNsdWRlcyhleGNsdWRlKSkpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0Ly8gQW5ndWxhciA4IGRvZXNuJ3QgaGF2ZSBsb2FkZXIgZm9yIEhUTUxcblx0XHRpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5odG1sJC8nKSB7XG5cdFx0XHRoYXNIdG1sTG9hZGVyID0gdHJ1ZTtcblx0XHRcdE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgaHRtbExvYWRlclJ1bGUpO1xuXHRcdH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICdmaWxlLWxvYWRlcicpIHtcblx0XHRcdGZpbGVMb2FkZXJSdWxlSWR4ID0gcnVsZUlkeDtcblx0XHRcdE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwge1xuXHRcdFx0XHR0ZXN0OiAvXFwuKGVvdHxzdmd8Y3VyfHdlYnB8b3RmfHR0Znx3b2ZmfHdvZmYyfGFuaSkkLyxcblx0XHRcdFx0dXNlOiBbe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2RyLWZpbGUtbG9hZGVyJ31dXG5cdFx0XHR9KTtcblxuXHRcdH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICd1cmwtbG9hZGVyJykge1xuXHRcdFx0aGFzVXJsTG9hZGVyID0gdHJ1ZTtcblx0XHRcdE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwgdXJsTG9hZGVyUnVsZSk7XG5cdFx0fSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKS5pbmRleE9mKCdcXFxcLnNjc3MnKSA+PSAwICYmIHJ1bGUudXNlKSB7XG5cdFx0XHRjb25zdCB1c2UgPSAocnVsZS51c2UgYXMgQXJyYXk8e1trZXk6IHN0cmluZ106IGFueSwgbG9hZGVyOiBzdHJpbmd9Pik7XG5cdFx0XHRjb25zdCBpbnNlcnRJZHggPSB1c2UuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5sb2FkZXIgPT09ICdzYXNzLWxvYWRlcicpO1xuXHRcdFx0aWYgKGluc2VydElkeCA8IDApIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdzYXNzLWxvYWRlciBpcyBub3QgZm91bmQnKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IG5lZWRTb3VyY2VNYXAgPSB1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcDtcblx0XHRcdC8vIHJlc29sdmUtdXJsLWxvYWRlcjogXCJzb3VyY2UgbWFwcyBtdXN0IGJlIGVuYWJsZWQgb24gYW55IHByZWNlZGluZyBsb2FkZXJcIlxuXHRcdFx0Ly8gaHR0cHM6Ly9naXRodWIuY29tL2Job2xsb3dheS9yZXNvbHZlLXVybC1sb2FkZXJcblx0XHRcdHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwID0gdHJ1ZTtcblx0XHRcdHVzZS5zcGxpY2UoaW5zZXJ0SWR4LCAwLCB7XG5cdFx0XHRcdGxvYWRlcjogJ3Jlc29sdmUtdXJsLWxvYWRlcicsXG5cdFx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0XHRzb3VyY2VNYXA6IG5lZWRTb3VyY2VNYXBcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHQvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuXHRcdH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5sZXNzJC8nICYmIHJ1bGUudXNlKSB7XG5cdFx0XHRmb3IgKGNvbnN0IHVzZUl0ZW0gb2YgcnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pIHtcblx0XHRcdFx0aWYgKHVzZUl0ZW0ubG9hZGVyID09PSAnbGVzcy1sb2FkZXInICYmIF8uaGFzKHVzZUl0ZW0sICdvcHRpb25zLnBhdGhzJykpIHtcblx0XHRcdFx0XHRkZWxldGUgKHVzZUl0ZW0ub3B0aW9ucyBhcyBhbnkpLnBhdGhzO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHQvLyBydWxlLnVzZS5wdXNoKHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9kZWJ1Zy1sb2FkZXInLCBvcHRpb25zOiB7aWQ6ICdsZXNzIGxvYWRlcnMnfX0pO1xuXHRcdH1cblx0fSk7XG5cblx0aWYgKCFoYXNVcmxMb2FkZXIpIHtcblx0XHRpZiAoZmlsZUxvYWRlclJ1bGVJZHggPT0gbnVsbClcblx0XHRcdHRocm93IG5ldyBFcnJvcignTWlzc2luZyBmaWxlLWxvYWRlciBydWxlIGZyb20gQW5ndWxhclxcJ3MgV2VicGFjayBjb25maWcnKTtcblx0XHRjb25zb2xlLmxvZygnSW5zZXJ0IHVybC1sb2FkZXInKTtcblx0XHRydWxlcy5zcGxpY2UoZmlsZUxvYWRlclJ1bGVJZHggKyAxLCAwLCB1cmxMb2FkZXJSdWxlKTtcblx0fVxuXHRpZiAocGFyYW0uYnJvd3Nlck9wdGlvbnMuYW90KSB7XG5cdFx0cnVsZXMudW5zaGlmdCh7XG5cdFx0XHR0ZXN0OiAvXFwubmdmYWN0b3J5LmpzJC8sXG5cdFx0XHR1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyJ31dXG5cdFx0fSk7XG5cdH1cblx0cnVsZXMudW5zaGlmdCh7XG5cdFx0b25lT2Y6IFtcblx0XHR7XG5cdFx0XHR0ZXN0OiAvXFwuamFkZSQvLFxuXHRcdFx0dXNlOiBbXG5cdFx0XHRcdHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG5cdFx0XHRcdHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cblx0XHRcdFx0Ly8ge2xvYWRlcjogJ0Bkci90cmFuc2xhdGUtZ2VuZXJhdG9yJ30sXG5cdFx0XHRcdHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9qYWRlLXRvLWh0bWwtbG9hZGVyJ31cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdHRlc3Q6IC9cXC5tZCQvLFxuXHRcdFx0dXNlOiBbXG5cdFx0XHRcdHtsb2FkZXI6ICdodG1sLWxvYWRlcicsIG9wdGlvbnM6IHthdHRyczogJ2ltZzpzcmMnfX0sXG5cdFx0XHRcdHtsb2FkZXI6IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdsb2FkZXJzJywgJ25nLWh0bWwtbG9hZGVyJyl9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cblx0XHRcdFx0e2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL21hcmtkb3duLWxvYWRlcid9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0ZXN0OiAvXFwudHh0JC8sXG5cdFx0XHR1c2U6IHtsb2FkZXI6ICdyYXctbG9hZGVyJ31cblx0XHR9LCB7XG5cdFx0XHR0ZXN0OiAvXFwuKHlhbWx8eW1sKSQvLFxuXHRcdFx0dXNlOiBbXG5cdFx0XHRcdHtsb2FkZXI6ICdqc29uLWxvYWRlcid9LFxuXHRcdFx0XHR7bG9hZGVyOiAneWFtbC1sb2FkZXInfVxuXHRcdFx0XVxuXHRcdH1dXG5cdH0pO1xuXG5cdGlmICghaGFzSHRtbExvYWRlcikge1xuXHRcdHJ1bGVzWzBdLm9uZU9mICYmIHJ1bGVzWzBdLm9uZU9mLnB1c2goaHRtbExvYWRlclJ1bGUpO1xuXHR9XG59XG5cbi8vIGZ1bmN0aW9uIG5vdEFuZ3VsYXJKcyhmaWxlOiBzdHJpbmcpIHtcbi8vIFx0aWYgKCFmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdmYWN0b3J5LmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nc3R5bGUuanMnKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdGlmIChub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSkpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHQvLyBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbi8vIFx0Ly8gaWYgKHBrICYmIHBrLmRyKSB7XG4vLyBcdC8vIFx0cmV0dXJuIHRydWU7XG4vLyBcdC8vIH1cbi8vIFx0Y29uc29sZS5sb2coJ2JhYmVsOiAnLCBmaWxlKTtcbi8vIFx0cmV0dXJuIHRydWU7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSkge1xuXHRpZiAod2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24gPT0gbnVsbClcblx0XHRyZXR1cm47IC8vIFNTUicgV2VicGFjayBjb25maWcgZG9lcyBub3QgaGFzIHRoaXMgcHJvcGVydHlcblx0Y29uc3Qgb2xkVmVuZG9yVGVzdEZ1bmMgPSBfLmdldCh3ZWJwYWNrQ29uZmlnLCAnb3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzLnZlbmRvci50ZXN0Jyk7XG5cblx0aWYgKG9sZFZlbmRvclRlc3RGdW5jKSB7XG5cdFx0Y29uc3QgY2FjaGVHcm91cHM6IHtba2V5OiBzdHJpbmddOiB3ZWJwYWNrLk9wdGlvbnMuQ2FjaGVHcm91cHNPcHRpb25zfSA9IHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzO1xuXHRcdGNhY2hlR3JvdXBzLnZlbmRvci50ZXN0ID0gdmVuZG9yVGVzdDtcblx0XHRjYWNoZUdyb3Vwcy5sYXp5VmVuZG9yID0ge1xuXHRcdFx0bmFtZTogJ2xhenktdmVuZG9yJyxcblx0XHRcdGNodW5rczogJ2FzeW5jJyxcblx0XHRcdGVuZm9yY2U6IHRydWUsXG5cdFx0XHR0ZXN0OiB2ZW5kb3JUZXN0LFxuXHRcdFx0cHJpb3JpdHk6IDFcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gdmVuZG9yVGVzdChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9Pikge1xuXHRcdGNvbnN0IG1heWJlVmVuZG9yID0gb2xkVmVuZG9yVGVzdEZ1bmMobW9kdWxlLCBjaHVua3MpO1xuXHRcdGlmICghbWF5YmVWZW5kb3IpXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0Y29uc3QgcmVzb3VyY2UgPSBtb2R1bGUubmFtZUZvckNvbmRpdGlvbiA/IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uKCkgOiAnJztcblx0XHQvLyBjb25zb2xlLmxvZyhgdmVuZG9yIHRlc3QsIHJlc291cmNlOiAke3Jlc291cmNlfSwgY2h1bmtzOiAke2NodW5rcy5tYXAoIGMgPT4gYy5uYW1lKX1gKTtcblx0XHRjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZSk7XG5cdFx0cmV0dXJuIHBrID09IG51bGwgfHwgcGsuZHIgPT0gbnVsbDtcblx0fVxufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG5cdHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG5cdHZhciBvdXQgPSAne1xcbic7XG5cdF8uZm9yT3duKGMsICh2YWx1ZTogYW55LCBwcm9wOiBzdHJpbmcpID0+IHtcblx0XHRvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuXHR9KTtcblx0b3V0ICs9IGluZGVudCArICd9Jztcblx0cmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcblx0dmFyIG91dCA9ICcnO1xuXHR2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuXHRpZiAoXy5pc1N0cmluZyh2YWx1ZSkgfHwgXy5pc051bWJlcih2YWx1ZSkgfHwgXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG5cdFx0b3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuXHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0b3V0ICs9ICdbXFxuJztcblx0XHQodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG5cdFx0XHRvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG5cdFx0XHRvdXQgKz0gJyxcXG4nO1xuXHRcdH0pO1xuXHRcdG91dCArPSBpbmRlbnQgKyAnICBdJztcblx0fSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG5cdFx0b3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuXHR9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuXHRcdG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG5cdH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHtcblx0XHRjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG5cdFx0aWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcblx0XHRcdG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0b3V0ICs9ICcgdW5rbm93bic7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cblxuLy8gY2xhc3MgQ29tcGlsZURvbmVQbHVnaW4ge1xuXG4vLyBcdGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuLy8gXHRcdGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdkcmNwLWRldnNlcnZlci1idWlsZC13ZWJwYWNrJywgKHN0YXRzKSA9PiB7XG4vLyBcdFx0XHRhcGkuZXZlbnRCdXMuZW1pdCgnd2VicGFja0RvbmUnLCB7c3VjY2VzczogdHJ1ZX0pO1xuLy8gXHRcdH0pO1xuLy8gXHR9XG4vLyB9XG4iXX0=
