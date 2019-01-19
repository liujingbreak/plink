"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console max-line-length max-classes-per-file */
const chunk_info_1 = tslib_1.__importDefault(require("./plugins/chunk-info"));
const gzip_size_1 = tslib_1.__importDefault(require("./plugins/gzip-size"));
const index_html_plugin_1 = tslib_1.__importDefault(require("./plugins/index-html-plugin"));
const _ = tslib_1.__importStar(require("lodash"));
const fs = tslib_1.__importStar(require("fs"));
const util_1 = require("util");
const Path = tslib_1.__importStar(require("path"));
const webpack_1 = require("webpack");
const __api_1 = tslib_1.__importDefault(require("__api"));
const webpack_2 = require("@ngtools/webpack");
const ng_ts_replace_1 = tslib_1.__importDefault(require("./ng-ts-replace"));
const read_hook_vfshost_1 = tslib_1.__importDefault(require("./utils/read-hook-vfshost"));
// const {babel} = require('@dr-core/webpack2-builder/configs/loader-config');
const noParse = __api_1.default.config.get([__api_1.default.packageName, 'buildOptimizerExclude'], []);
noParse.push(...__api_1.default.config.get([__api_1.default.packageName, 'build-optimizer:exclude'], []));
// const log = require('log4js').getLogger('ng-app-builder.config-webpack');
function changeWebpackConfig(param, webpackConfig, drcpConfigSetting) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');
        console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
        if (_.get(param, 'builderConfig.options.drcpArgs.report') ||
            param.browserOptions.drcpArgs.report || (param.browserOptions.drcpArgs.openReport)) {
            // webpackConfig.plugins.unshift(new BundleAnalyzerPlugin({
            // 	analyzerMode: 'static',
            // 	reportFilename: 'bundle-report.html',
            // 	openAnalyzer: options.drcpArgs.openReport
            // }));
            webpackConfig.plugins.push(new chunk_info_1.default());
        }
        // webpackConfig.module.noParse = (file: string) => noParse.some(name => file.replace(/\\/g, '/').includes(name));
        const ngCompilerPlugin = webpackConfig.plugins.find((plugin) => {
            return (plugin instanceof webpack_2.AngularCompilerPlugin);
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
        if (_.get(param, 'builderConfig.options.hmr'))
            webpackConfig.plugins.push(new webpack_1.HotModuleReplacementPlugin());
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
                        if (request.match(/^\.{0,2}\//)) {
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
        webpackConfig.plugins.push(new CompileDonePlugin());
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
    const devMode = webpackConfig.mode === 'development';
    webpackConfig.resolveLoader = {
        modules: [Path.join(__dirname, 'loaders'), 'node_modules']
    };
    const rules = webpackConfig.module.rules;
    let hasUrlLoader = false;
    let fileLoaderRuleIdx;
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
                if (!/\.js$/.test(path))
                    return;
                return noParse.every((exclude => !path.replace(/\\/g, '/').includes(exclude)));
            };
        }
        if (test instanceof RegExp && test.toString() === '/\\.html$/') {
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test,
                use: [
                    { loader: 'raw-loader' },
                    { loader: 'ng-html-loader' },
                    // {loader: '@dr/translate-generator'},
                    { loader: '@dr/template-builder' }
                ]
            });
        }
        else if (rule.loader === 'file-loader') {
            fileLoaderRuleIdx = ruleIdx;
            // const test = rule.test;
            // fileLoaderTest = test;
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test: /\.(eot|svg|cur|webp|otf|ttf|woff|woff2|ani)$/,
                use: [{ loader: '@dr-core/webpack2-builder/dist/loaders/dr-file-loader' }]
            });
        }
        else if (rule.loader === 'url-loader') {
            hasUrlLoader = true;
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test: /\.(jpg|png|gif)$/,
                use: [{
                        loader: 'url-loader',
                        options: {
                            limit: !devMode ? 10000 : 1,
                            fallback: '@dr-core/webpack2-builder/dist/loaders/dr-file-loader'
                        }
                    }
                ]
            });
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
        rules.splice(fileLoaderRuleIdx + 1, 0, {
            test: /\.(jpg|png|gif)$/,
            use: [{
                    loader: 'url-loader',
                    options: {
                        limit: 10000,
                        fallback: '@dr-core/webpack2-builder/dist/loaders/dr-file-loader'
                    }
                }]
        });
    }
    if (param.browserOptions.aot) {
        rules.unshift({
            test: /\.ngfactory.js$/,
            use: [{ loader: '@dr-core/ng-app-builder/dist/ng-aot-assets/ng-aot-assets-loader' }]
        });
    }
    rules.unshift({
        test: /\.jade$/,
        use: [
            { loader: 'html-loader', options: { attrs: 'img:src' } },
            { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
            // {loader: '@dr/translate-generator'},
            { loader: '@dr-core/webpack2-builder/lib/jade-to-html-loader' }
        ]
    }, {
        test: /\.md$/,
        use: [
            { loader: 'html-loader', options: { attrs: 'img:src' } },
            { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
            { loader: '@dr-core/webpack2-builder/lib/markdown-loader' }
        ]
    }, {
        test: /\.txt$/,
        use: { loader: 'raw-loader' }
    }, {
        test: /\.(yaml|yml)$/,
        use: [
            { loader: 'json-loader' },
            { loader: 'yaml-loader' }
        ]
    }
    // {
    // 	test: notAngularJs,
    // 	use: [babel()]
    // }
    );
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
class CompileDonePlugin {
    apply(compiler) {
        compiler.hooks.done.tap('drcp-devserver-build-webpack', (stats) => {
            __api_1.default.eventBus.emit('webpackDone', { success: true });
        });
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOEVBQW1EO0FBQ25ELDRFQUEyQztBQUMzQyw0RkFBMEQ7QUFFMUQsa0RBQTRCO0FBQzVCLCtDQUF5QjtBQUN6QiwrQkFBZ0M7QUFDaEMsbURBQTZCO0FBQzdCLHFDQUE2RDtBQUM3RCwwREFBd0I7QUFDeEIsOENBQXVEO0FBQ3ZELDRFQUEyQztBQUMzQywwRkFBcUQ7QUFRckQsOEVBQThFO0FBQzlFLE1BQU0sT0FBTyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsQ0FBYyxDQUFDO0FBQzdGLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUseUJBQXlCLENBQUMsRUFBRSxFQUFFLENBQWEsQ0FBQyxDQUFDO0FBQzlGLDRFQUE0RTtBQUU1RSxTQUE4QixtQkFBbUIsQ0FBQyxLQUFzQixFQUFFLGFBQWtCLEVBQUUsaUJBQXNCOztRQUNuSCxxRUFBcUU7UUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsdUNBQXVDLENBQUM7WUFDeEQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbkYsMkRBQTJEO1lBQzNELDJCQUEyQjtZQUMzQix5Q0FBeUM7WUFDekMsNkNBQTZDO1lBQzdDLE9BQU87WUFDUCxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDekIsSUFBSSxv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QyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMvQixHQUFHLElBQUksS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7S0FDekI7U0FBTSxJQUFJLGVBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUMzQixHQUFHLElBQUksR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztLQUM3QjtTQUFNLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUM3QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO1lBQzFDLEdBQUcsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDekM7YUFBTTtZQUNOLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNyQztLQUNEO1NBQU07UUFDTixHQUFHLElBQUksVUFBVSxDQUFDO0tBQ2xCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBRUQsTUFBTSxpQkFBaUI7SUFFdEIsS0FBSyxDQUFDLFFBQWtCO1FBQ3ZCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2pFLGVBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2NvbmZpZy13ZWJwYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCBDaHVua0luZm9QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL2NodW5rLWluZm8nO1xuaW1wb3J0IGd6aXBTaXplIGZyb20gJy4vcGx1Z2lucy9nemlwLXNpemUnO1xuaW1wb3J0IEluZGV4SHRtbFBsdWdpbiBmcm9tICcuL3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IHtBbmd1bGFyQ2xpUGFyYW19IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDb21waWxlciwgSG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge0FuZ3VsYXJDb21waWxlclBsdWdpbn0gZnJvbSAnQG5ndG9vbHMvd2VicGFjayc7XG5pbXBvcnQgVFNSZWFkSG9va2VyIGZyb20gJy4vbmctdHMtcmVwbGFjZSc7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcblxuZXhwb3J0IGludGVyZmFjZSBXZXBhY2tDb25maWdIYW5kbGVyIHtcblx0LyoqIEByZXR1cm5zIHdlYnBhY2sgY29uZmlndXJhdGlvbiBvciBQcm9taXNlICovXG5cdHdlYnBhY2tDb25maWcob3JpZ2luYWxDb25maWc6IGFueSk6IFByb21pc2U8e1tuYW1lOiBzdHJpbmddOiBhbnl9IHwgdm9pZD4gfCB7W25hbWU6IHN0cmluZ106IGFueX0gfCB2b2lkO1xufVxuXG4vLyBjb25zdCB7YmFiZWx9ID0gcmVxdWlyZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL2xvYWRlci1jb25maWcnKTtcbmNvbnN0IG5vUGFyc2UgPSAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkT3B0aW1pemVyRXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xubm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5jb25maWctd2VicGFjaycpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VXZWJwYWNrQ29uZmlnKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSwgZHJjcENvbmZpZ1NldHRpbmc6IGFueSkge1xuXHQvLyBjb25zdCB7QnVuZGxlQW5hbHl6ZXJQbHVnaW59ID0gcmVxdWlyZSgnd2VicGFjay1idW5kbGUtYW5hbHl6ZXInKTtcblx0Y29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IGNoYW5nZVdlYnBhY2tDb25maWcgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpO1xuXHRpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0JykgfHxcblx0XHRwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5yZXBvcnQgfHwocGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3Mub3BlblJlcG9ydCkpIHtcblx0XHQvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMudW5zaGlmdChuZXcgQnVuZGxlQW5hbHl6ZXJQbHVnaW4oe1xuXHRcdC8vIFx0YW5hbHl6ZXJNb2RlOiAnc3RhdGljJyxcblx0XHQvLyBcdHJlcG9ydEZpbGVuYW1lOiAnYnVuZGxlLXJlcG9ydC5odG1sJyxcblx0XHQvLyBcdG9wZW5BbmFseXplcjogb3B0aW9ucy5kcmNwQXJncy5vcGVuUmVwb3J0XG5cdFx0Ly8gfSkpO1xuXHRcdHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuXHRcdFx0bmV3IENodW5rSW5mb1BsdWdpbigpXG5cdFx0KTtcblx0fVxuXG5cdC8vIHdlYnBhY2tDb25maWcubW9kdWxlLm5vUGFyc2UgPSAoZmlsZTogc3RyaW5nKSA9PiBub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSk7XG5cblx0Y29uc3QgbmdDb21waWxlclBsdWdpbjogQW5ndWxhckNvbXBpbGVyUGx1Z2luID0gd2VicGFja0NvbmZpZy5wbHVnaW5zLmZpbmQoKHBsdWdpbjogYW55KSA9PiB7XG5cdFx0cmV0dXJuIChwbHVnaW4gaW5zdGFuY2VvZiBBbmd1bGFyQ29tcGlsZXJQbHVnaW4pO1xuXHR9KTtcblx0aWYgKG5nQ29tcGlsZXJQbHVnaW4gPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBBbmd1bGFyQ29tcGlsZXJQbHVnaW4nKTtcblx0Ly8gaGFjayBfb3B0aW9ucy5ob3N0IGJlZm9yZSBhbmd1bGFyL3BhY2thZ2VzL25ndG9vbHMvd2VicGFjay9zcmMvYW5ndWxhcl9jb21waWxlcl9wbHVnaW4udHMgYXBwbHkoKSBydW5zXG5cdHdlYnBhY2tDb25maWcucGx1Z2lucy51bnNoaWZ0KG5ldyBjbGFzcyB7XG5cdFx0YXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG5cdFx0XHRjb25zdCBob29rZXIgPSBuZXcgVFNSZWFkSG9va2VyKHBhcmFtKTtcblx0XHRcdChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX29wdGlvbnMuaG9zdCA9IG5ldyBSZWFkSG9va0hvc3QoKGNvbXBpbGVyIGFzIGFueSkuaW5wdXRGaWxlU3lzdGVtLCBob29rZXIuaG9va0Z1bmMpO1xuXHRcdFx0Y29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0XHRob29rZXIuY2xlYXIoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSgpKTtcblxuXHRpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG1yJykpXG5cdFx0d2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IEhvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2luKCkpO1xuXHRpZiAoIWRyY3BDb25maWdTZXR0aW5nLmRldk1vZGUpIHtcblx0XHRjb25zb2xlLmxvZygnQnVpbGQgaW4gcHJvZHVjdGlvbiBtb2RlJyk7XG5cdFx0d2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IGd6aXBTaXplKCkpO1xuXHR9XG5cblx0aWYgKHdlYnBhY2tDb25maWcudGFyZ2V0ICE9PSAnbm9kZScpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgSW5kZXhIdG1sUGx1Z2luKHtcblx0XHRcdFx0aW5kZXhGaWxlOiBQYXRoLnJlc29sdmUocGFyYW0uYnJvd3Nlck9wdGlvbnMuaW5kZXgpLFxuXHRcdFx0XHRpbmxpbmVDaHVua05hbWVzOiBbJ3J1bnRpbWUnXVxuXHRcdFx0fSkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFRoaXMgaXMgY29uZGl0aW9uIG9mIFNlcnZlciBzaWRlIHJlbmRlcmluZ1xuXHRcdC8vIFJlZmVyIHRvIGFuZ3VsYXItY2xpL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3Mvc2VydmVyLnRzXG5cdFx0aWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmJ1bmRsZURlcGVuZGVuY2llcyA9PT0gJ25vbmUnKSB7XG5cdFx0XHR3ZWJwYWNrQ29uZmlnLmV4dGVybmFscyA9IFtcblx0XHRcdCAgL15AYW5ndWxhci8sXG5cdFx0XHQgIChfOiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkKSA9PiB7XG5cdFx0XHRcdC8vIEFic29sdXRlICYgUmVsYXRpdmUgcGF0aHMgYXJlIG5vdCBleHRlcm5hbHNcblx0XHRcdFx0aWYgKHJlcXVlc3QubWF0Y2goL15cXC57MCwyfVxcLy8pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHQvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG1vZHVsZSB2aWEgTm9kZVxuXHRcdFx0XHRcdGNvbnN0IGUgPSByZXF1aXJlLnJlc29sdmUocmVxdWVzdCk7XG5cdFx0XHRcdFx0Y29uc3QgY29tcCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShlKTtcblx0XHRcdFx0XHRpZiAoY29tcCA9PSBudWxsIHx8IGNvbXAuZHIgPT0gbnVsbCApIHtcblx0XHRcdFx0XHRcdC8vIEl0J3MgYSBub2RlX21vZHVsZVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIEl0J3MgYSBzeXN0ZW0gdGhpbmcgKC5pZSB1dGlsLCBmcy4uLilcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Ly8gTm9kZSBjb3VsZG4ndCBmaW5kIGl0LCBzbyBpdCBtdXN0IGJlIHVzZXItYWxpYXNlZFxuXHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdCAgfVxuXHRcdFx0XTtcblx0XHQgIH1cblx0fVxuXHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgQ29tcGlsZURvbmVQbHVnaW4oKSk7XG5cblx0Y2hhbmdlU3BsaXRDaHVua3MocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXHRjaGFuZ2VMb2FkZXJzKHBhcmFtLCB3ZWJwYWNrQ29uZmlnKTtcblxuXHRpZiAocGFyYW0uc3NyKSB7XG5cdFx0d2VicGFja0NvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuXHR9XG5cblx0YXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxXZXBhY2tDb25maWdIYW5kbGVyPigoZmlsZSwgbGFzdFJlc3VsdCwgaGFuZGxlcikgPT4ge1xuXHRcdGlmIChoYW5kbGVyLndlYnBhY2tDb25maWcpXG5cdFx0XHRyZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuXHRcdHJldHVybiBsYXN0UmVzdWx0O1xuXHR9KTtcblxuXHRjb25zdCB3Zm5hbWUgPSBgZGlzdC93ZWJwYWNrLSR7cGFyYW0uc3NyID8gJ3NzcicgOiAnYnJvd3Nlcid9LmNvbmZpZy5qc2A7XG5cdGZzLndyaXRlRmlsZVN5bmMod2ZuYW1lLCBwcmludENvbmZpZyh3ZWJwYWNrQ29uZmlnKSk7XG5cdGNvbnNvbGUubG9nKCdJZiB5b3UgYXJlIHdvbmRlcmluZyB3aGF0IGtpbmQgb2YgV2ViYXBjayBjb25maWcgZmlsZSBpcyB1c2VkIGludGVybmFsbHksIGNoZWNrb3V0ICcgKyB3Zm5hbWUpO1xuXHRyZXR1cm4gd2VicGFja0NvbmZpZztcbn1cblxuZnVuY3Rpb24gY2hhbmdlTG9hZGVycyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiBhbnkpIHtcblx0Y29uc3QgZGV2TW9kZSA9IHdlYnBhY2tDb25maWcubW9kZSA9PT0gJ2RldmVsb3BtZW50Jztcblx0d2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID0ge1xuXHRcdG1vZHVsZXM6IFtQYXRoLmpvaW4oX19kaXJuYW1lLCAnbG9hZGVycycpLCAnbm9kZV9tb2R1bGVzJ11cblx0fTtcblx0Y29uc3QgcnVsZXMgPSB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ydWxlcyBhcyB3ZWJwYWNrLlJ1bGVbXTtcblx0bGV0IGhhc1VybExvYWRlciA9IGZhbHNlO1xuXHRsZXQgZmlsZUxvYWRlclJ1bGVJZHg6IG51bWJlcjtcblx0cnVsZXMuZm9yRWFjaCgocnVsZSwgcnVsZUlkeCkgPT4ge1xuXHRcdGNvbnN0IHRlc3QgPSBydWxlLnRlc3Q7XG5cdFx0aWYgKHJ1bGUudXNlKSB7XG5cdFx0XHRjb25zdCBpZHggPSAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLmZpbmRJbmRleChydWxlU2V0ID0+IHJ1bGVTZXQubG9hZGVyID09PSAncG9zdGNzcy1sb2FkZXInKTtcblx0XHRcdGlmIChpZHggPj0gMCkge1xuXHRcdFx0XHQocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnNwbGljZShpZHggKyAxLCAwLCB7XG5cdFx0XHRcdFx0bG9hZGVyOiAnY3NzLXVybC1sb2FkZXInXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQvLyAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnB1c2goe2xvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ30pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmpzJC8nICYmIHJ1bGUudXNlICYmXG5cdFx0XHQocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0VXNlSXRlbVtdKS5zb21lKChpdGVtKSA9PiAoaXRlbSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXIpLmxvYWRlciA9PT0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXIvd2VicGFjay1sb2FkZXInKSkge1xuXHRcdFx0cnVsZS50ZXN0ID0gKHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRpZiAoIS9cXC5qcyQvLnRlc3QocGF0aCkpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRyZXR1cm4gbm9QYXJzZS5ldmVyeSgoZXhjbHVkZSA9PiAhcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMoZXhjbHVkZSkpKTtcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcblx0XHRcdE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwge1xuXHRcdFx0XHR0ZXN0LFxuXHRcdFx0XHR1c2U6IFtcblx0XHRcdFx0XHR7bG9hZGVyOiAncmF3LWxvYWRlcid9LFxuXHRcdFx0XHRcdHtsb2FkZXI6ICduZy1odG1sLWxvYWRlcid9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cblx0XHRcdFx0XHQvLyB7bG9hZGVyOiAnQGRyL3RyYW5zbGF0ZS1nZW5lcmF0b3InfSxcblx0XHRcdFx0XHR7bG9hZGVyOiAnQGRyL3RlbXBsYXRlLWJ1aWxkZXInfVxuXHRcdFx0XHRdXG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAnZmlsZS1sb2FkZXInKSB7XG5cdFx0XHRmaWxlTG9hZGVyUnVsZUlkeCA9IHJ1bGVJZHg7XG5cdFx0XHQvLyBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuXHRcdFx0Ly8gZmlsZUxvYWRlclRlc3QgPSB0ZXN0O1xuXHRcdFx0T2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCB7XG5cdFx0XHRcdHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuXHRcdFx0XHR1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInfV1cblx0XHRcdH0pO1xuXG5cdFx0fSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ3VybC1sb2FkZXInKSB7XG5cdFx0XHRoYXNVcmxMb2FkZXIgPSB0cnVlO1xuXHRcdFx0T2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCB7XG5cdFx0XHRcdHRlc3Q6IC9cXC4oanBnfHBuZ3xnaWYpJC8sXG5cdFx0XHRcdHVzZTogW3tcblx0XHRcdFx0XHRcdGxvYWRlcjogJ3VybC1sb2FkZXInLFxuXHRcdFx0XHRcdFx0b3B0aW9uczoge1xuXHRcdFx0XHRcdFx0XHRsaW1pdDogIWRldk1vZGUgPyAxMDAwMCA6IDEsIC8vIDwxMGsgLHVzZSBiYXNlNjQgZm9ybWF0LCBkZXYgbW9kZSBvbmx5IHVzZSB1cmwgZm9yIHNwZWVkXG5cdFx0XHRcdFx0XHRcdGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpLmluZGV4T2YoJ1xcXFwuc2NzcycpID49IDAgJiYgcnVsZS51c2UpIHtcblx0XHRcdGNvbnN0IHVzZSA9IChydWxlLnVzZSBhcyBBcnJheTx7W2tleTogc3RyaW5nXTogYW55LCBsb2FkZXI6IHN0cmluZ30+KTtcblx0XHRcdGNvbnN0IGluc2VydElkeCA9IHVzZS5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLmxvYWRlciA9PT0gJ3Nhc3MtbG9hZGVyJyk7XG5cdFx0XHRpZiAoaW5zZXJ0SWR4IDwgMCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Nhc3MtbG9hZGVyIGlzIG5vdCBmb3VuZCcpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgbmVlZFNvdXJjZU1hcCA9IHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwO1xuXHRcdFx0Ly8gcmVzb2x2ZS11cmwtbG9hZGVyOiBcInNvdXJjZSBtYXBzIG11c3QgYmUgZW5hYmxlZCBvbiBhbnkgcHJlY2VkaW5nIGxvYWRlclwiXG5cdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vYmhvbGxvd2F5L3Jlc29sdmUtdXJsLWxvYWRlclxuXHRcdFx0dXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXAgPSB0cnVlO1xuXHRcdFx0dXNlLnNwbGljZShpbnNlcnRJZHgsIDAsIHtcblx0XHRcdFx0bG9hZGVyOiAncmVzb2x2ZS11cmwtbG9hZGVyJyxcblx0XHRcdFx0b3B0aW9uczoge1xuXHRcdFx0XHRcdHNvdXJjZU1hcDogbmVlZFNvdXJjZU1hcFxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG5cdFx0fSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmxlc3MkLycgJiYgcnVsZS51c2UpIHtcblx0XHRcdGZvciAoY29uc3QgdXNlSXRlbSBvZiBydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkge1xuXHRcdFx0XHRpZiAodXNlSXRlbS5sb2FkZXIgPT09ICdsZXNzLWxvYWRlcicgJiYgXy5oYXModXNlSXRlbSwgJ29wdGlvbnMucGF0aHMnKSkge1xuXHRcdFx0XHRcdGRlbGV0ZSAodXNlSXRlbS5vcHRpb25zIGFzIGFueSkucGF0aHM7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG5cdFx0fVxuXHR9KTtcblxuXHRpZiAoIWhhc1VybExvYWRlcikge1xuXHRcdGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuXHRcdGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuXHRcdHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHtcblx0XHRcdHRlc3Q6IC9cXC4oanBnfHBuZ3xnaWYpJC8sXG5cdFx0XHR1c2U6IFt7XG5cdFx0XHRcdGxvYWRlcjogJ3VybC1sb2FkZXInLFxuXHRcdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdFx0bGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuXHRcdFx0XHRcdGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG5cdFx0XHRcdH1cblx0XHRcdH1dXG5cdFx0fSk7XG5cdH1cblx0aWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuXHRcdHJ1bGVzLnVuc2hpZnQoe1xuXHRcdFx0dGVzdDogL1xcLm5nZmFjdG9yeS5qcyQvLFxuXHRcdFx0dXNlOiBbe2xvYWRlcjogJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlcid9XVxuXHRcdH0pO1xuXHR9XG5cdHJ1bGVzLnVuc2hpZnQoXG5cdFx0e1xuXHRcdFx0dGVzdDogL1xcLmphZGUkLyxcblx0XHRcdHVzZTogW1xuXHRcdFx0XHR7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuXHRcdFx0XHR7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG5cdFx0XHRcdC8vIHtsb2FkZXI6ICdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcid9LFxuXHRcdFx0XHR7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvamFkZS10by1odG1sLWxvYWRlcid9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0ZXN0OiAvXFwubWQkLyxcblx0XHRcdHVzZTogW1xuXHRcdFx0XHR7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuXHRcdFx0XHR7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG5cdFx0XHRcdHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9tYXJrZG93bi1sb2FkZXInfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGVzdDogL1xcLnR4dCQvLFxuXHRcdFx0dXNlOiB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG5cdFx0fSwge1xuXHRcdFx0dGVzdDogL1xcLih5YW1sfHltbCkkLyxcblx0XHRcdHVzZTogW1xuXHRcdFx0XHR7bG9hZGVyOiAnanNvbi1sb2FkZXInfSxcblx0XHRcdFx0e2xvYWRlcjogJ3lhbWwtbG9hZGVyJ31cblx0XHRcdF1cblx0XHR9XG5cdFx0Ly8ge1xuXHRcdC8vIFx0dGVzdDogbm90QW5ndWxhckpzLFxuXHRcdC8vIFx0dXNlOiBbYmFiZWwoKV1cblx0XHQvLyB9XG5cdCk7XG59XG5cbi8vIGZ1bmN0aW9uIG5vdEFuZ3VsYXJKcyhmaWxlOiBzdHJpbmcpIHtcbi8vIFx0aWYgKCFmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdmYWN0b3J5LmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nc3R5bGUuanMnKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdGlmIChub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSkpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHQvLyBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbi8vIFx0Ly8gaWYgKHBrICYmIHBrLmRyKSB7XG4vLyBcdC8vIFx0cmV0dXJuIHRydWU7XG4vLyBcdC8vIH1cbi8vIFx0Y29uc29sZS5sb2coJ2JhYmVsOiAnLCBmaWxlKTtcbi8vIFx0cmV0dXJuIHRydWU7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSkge1xuXHRpZiAod2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24gPT0gbnVsbClcblx0XHRyZXR1cm47IC8vIFNTUicgV2VicGFjayBjb25maWcgZG9lcyBub3QgaGFzIHRoaXMgcHJvcGVydHlcblx0Y29uc3Qgb2xkVmVuZG9yVGVzdEZ1bmMgPSBfLmdldCh3ZWJwYWNrQ29uZmlnLCAnb3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzLnZlbmRvci50ZXN0Jyk7XG5cblx0aWYgKG9sZFZlbmRvclRlc3RGdW5jKSB7XG5cdFx0Y29uc3QgY2FjaGVHcm91cHM6IHtba2V5OiBzdHJpbmddOiB3ZWJwYWNrLk9wdGlvbnMuQ2FjaGVHcm91cHNPcHRpb25zfSA9IHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzO1xuXHRcdGNhY2hlR3JvdXBzLnZlbmRvci50ZXN0ID0gdmVuZG9yVGVzdDtcblx0XHRjYWNoZUdyb3Vwcy5sYXp5VmVuZG9yID0ge1xuXHRcdFx0bmFtZTogJ2xhenktdmVuZG9yJyxcblx0XHRcdGNodW5rczogJ2FzeW5jJyxcblx0XHRcdGVuZm9yY2U6IHRydWUsXG5cdFx0XHR0ZXN0OiB2ZW5kb3JUZXN0LFxuXHRcdFx0cHJpb3JpdHk6IDFcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gdmVuZG9yVGVzdChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9Pikge1xuXHRcdGNvbnN0IG1heWJlVmVuZG9yID0gb2xkVmVuZG9yVGVzdEZ1bmMobW9kdWxlLCBjaHVua3MpO1xuXHRcdGlmICghbWF5YmVWZW5kb3IpXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0Y29uc3QgcmVzb3VyY2UgPSBtb2R1bGUubmFtZUZvckNvbmRpdGlvbiA/IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uKCkgOiAnJztcblx0XHQvLyBjb25zb2xlLmxvZyhgdmVuZG9yIHRlc3QsIHJlc291cmNlOiAke3Jlc291cmNlfSwgY2h1bmtzOiAke2NodW5rcy5tYXAoIGMgPT4gYy5uYW1lKX1gKTtcblx0XHRjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZSk7XG5cdFx0cmV0dXJuIHBrID09IG51bGwgfHwgcGsuZHIgPT0gbnVsbDtcblx0fVxufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG5cdHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG5cdHZhciBvdXQgPSAne1xcbic7XG5cdF8uZm9yT3duKGMsICh2YWx1ZTogYW55LCBwcm9wOiBzdHJpbmcpID0+IHtcblx0XHRvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuXHR9KTtcblx0b3V0ICs9IGluZGVudCArICd9Jztcblx0cmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcblx0dmFyIG91dCA9ICcnO1xuXHR2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuXHRpZiAoXy5pc1N0cmluZyh2YWx1ZSkgfHwgXy5pc051bWJlcih2YWx1ZSkgfHwgXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG5cdFx0b3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuXHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0b3V0ICs9ICdbXFxuJztcblx0XHQodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG5cdFx0XHRvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG5cdFx0XHRvdXQgKz0gJyxcXG4nO1xuXHRcdH0pO1xuXHRcdG91dCArPSBpbmRlbnQgKyAnICBdJztcblx0fSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG5cdFx0b3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuXHR9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuXHRcdG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG5cdH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHtcblx0XHRjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG5cdFx0aWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcblx0XHRcdG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0b3V0ICs9ICcgdW5rbm93bic7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cblxuY2xhc3MgQ29tcGlsZURvbmVQbHVnaW4ge1xuXG5cdGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuXHRcdGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdkcmNwLWRldnNlcnZlci1idWlsZC13ZWJwYWNrJywgKHN0YXRzKSA9PiB7XG5cdFx0XHRhcGkuZXZlbnRCdXMuZW1pdCgnd2VicGFja0RvbmUnLCB7c3VjY2VzczogdHJ1ZX0pO1xuXHRcdH0pO1xuXHR9XG59XG4iXX0=
