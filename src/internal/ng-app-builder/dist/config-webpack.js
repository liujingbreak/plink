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
        changeLoaders(webpackConfig);
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
function changeLoaders(webpackConfig) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOEVBQW1EO0FBQ25ELDRFQUEyQztBQUMzQyw0RkFBMEQ7QUFFMUQsa0RBQTRCO0FBQzVCLCtDQUF5QjtBQUN6QiwrQkFBZ0M7QUFDaEMsbURBQTZCO0FBQzdCLHFDQUE2RDtBQUM3RCwwREFBd0I7QUFDeEIsOENBQXVEO0FBQ3ZELDRFQUEyQztBQUMzQywwRkFBcUQ7QUFRckQsOEVBQThFO0FBQzlFLE1BQU0sT0FBTyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSx1QkFBdUIsQ0FBQyxFQUFFLEVBQUUsQ0FBYyxDQUFDO0FBQzdGLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUseUJBQXlCLENBQUMsRUFBRSxFQUFFLENBQWEsQ0FBQyxDQUFDO0FBQzlGLDRFQUE0RTtBQUU1RSxTQUE4QixtQkFBbUIsQ0FBQyxLQUFzQixFQUFFLGFBQWtCLEVBQUUsaUJBQXNCOztRQUNuSCxxRUFBcUU7UUFDckUsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsdUNBQXVDLENBQUM7WUFDeEQsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDbkYsMkRBQTJEO1lBQzNELDJCQUEyQjtZQUMzQix5Q0FBeUM7WUFDekMsNkNBQTZDO1lBQzdDLE9BQU87WUFDUCxhQUFhLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDekIsSUFBSSxv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QUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUM3QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNDLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO1lBQzFDLEdBQUcsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDekM7YUFBTTtZQUNOLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUNyQztLQUNEO1NBQU07UUFDTixHQUFHLElBQUksVUFBVSxDQUFDO0tBQ2xCO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDWixDQUFDO0FBRUQsTUFBTSxpQkFBaUI7SUFFdEIsS0FBSyxDQUFDLFFBQWtCO1FBQ3ZCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2pFLGVBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2NvbmZpZy13ZWJwYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCBDaHVua0luZm9QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL2NodW5rLWluZm8nO1xuaW1wb3J0IGd6aXBTaXplIGZyb20gJy4vcGx1Z2lucy9nemlwLXNpemUnO1xuaW1wb3J0IEluZGV4SHRtbFBsdWdpbiBmcm9tICcuL3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IHtBbmd1bGFyQ2xpUGFyYW19IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtDb21waWxlciwgSG90TW9kdWxlUmVwbGFjZW1lbnRQbHVnaW59IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQge0FuZ3VsYXJDb21waWxlclBsdWdpbn0gZnJvbSAnQG5ndG9vbHMvd2VicGFjayc7XG5pbXBvcnQgVFNSZWFkSG9va2VyIGZyb20gJy4vbmctdHMtcmVwbGFjZSc7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcblxuZXhwb3J0IGludGVyZmFjZSBXZXBhY2tDb25maWdIYW5kbGVyIHtcblx0LyoqIEByZXR1cm5zIHdlYnBhY2sgY29uZmlndXJhdGlvbiBvciBQcm9taXNlICovXG5cdHdlYnBhY2tDb25maWcob3JpZ2luYWxDb25maWc6IGFueSk6IFByb21pc2U8e1tuYW1lOiBzdHJpbmddOiBhbnl9IHwgdm9pZD4gfCB7W25hbWU6IHN0cmluZ106IGFueX0gfCB2b2lkO1xufVxuXG4vLyBjb25zdCB7YmFiZWx9ID0gcmVxdWlyZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL2xvYWRlci1jb25maWcnKTtcbmNvbnN0IG5vUGFyc2UgPSAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkT3B0aW1pemVyRXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xubm9QYXJzZS5wdXNoKC4uLmFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdidWlsZC1vcHRpbWl6ZXI6ZXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5jb25maWctd2VicGFjaycpO1xuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VXZWJwYWNrQ29uZmlnKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSwgZHJjcENvbmZpZ1NldHRpbmc6IGFueSkge1xuXHQvLyBjb25zdCB7QnVuZGxlQW5hbHl6ZXJQbHVnaW59ID0gcmVxdWlyZSgnd2VicGFjay1idW5kbGUtYW5hbHl6ZXInKTtcblx0Y29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IGNoYW5nZVdlYnBhY2tDb25maWcgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpO1xuXHRpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuZHJjcEFyZ3MucmVwb3J0JykgfHxcblx0XHRwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5yZXBvcnQgfHwocGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3Mub3BlblJlcG9ydCkpIHtcblx0XHQvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMudW5zaGlmdChuZXcgQnVuZGxlQW5hbHl6ZXJQbHVnaW4oe1xuXHRcdC8vIFx0YW5hbHl6ZXJNb2RlOiAnc3RhdGljJyxcblx0XHQvLyBcdHJlcG9ydEZpbGVuYW1lOiAnYnVuZGxlLXJlcG9ydC5odG1sJyxcblx0XHQvLyBcdG9wZW5BbmFseXplcjogb3B0aW9ucy5kcmNwQXJncy5vcGVuUmVwb3J0XG5cdFx0Ly8gfSkpO1xuXHRcdHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKFxuXHRcdFx0bmV3IENodW5rSW5mb1BsdWdpbigpXG5cdFx0KTtcblx0fVxuXG5cdC8vIHdlYnBhY2tDb25maWcubW9kdWxlLm5vUGFyc2UgPSAoZmlsZTogc3RyaW5nKSA9PiBub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSk7XG5cblx0Y29uc3QgbmdDb21waWxlclBsdWdpbjogQW5ndWxhckNvbXBpbGVyUGx1Z2luID0gd2VicGFja0NvbmZpZy5wbHVnaW5zLmZpbmQoKHBsdWdpbjogYW55KSA9PiB7XG5cdFx0cmV0dXJuIChwbHVnaW4gaW5zdGFuY2VvZiBBbmd1bGFyQ29tcGlsZXJQbHVnaW4pO1xuXHR9KTtcblx0aWYgKG5nQ29tcGlsZXJQbHVnaW4gPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0NhbiBub3QgZmluZCBBbmd1bGFyQ29tcGlsZXJQbHVnaW4nKTtcblx0Ly8gaGFjayBfb3B0aW9ucy5ob3N0IGJlZm9yZSBhbmd1bGFyL3BhY2thZ2VzL25ndG9vbHMvd2VicGFjay9zcmMvYW5ndWxhcl9jb21waWxlcl9wbHVnaW4udHMgYXBwbHkoKSBydW5zXG5cdHdlYnBhY2tDb25maWcucGx1Z2lucy51bnNoaWZ0KG5ldyBjbGFzcyB7XG5cdFx0YXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG5cdFx0XHRjb25zdCBob29rZXIgPSBuZXcgVFNSZWFkSG9va2VyKHBhcmFtKTtcblx0XHRcdChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX29wdGlvbnMuaG9zdCA9IG5ldyBSZWFkSG9va0hvc3QoKGNvbXBpbGVyIGFzIGFueSkuaW5wdXRGaWxlU3lzdGVtLCBob29rZXIuaG9va0Z1bmMpO1xuXHRcdFx0Y29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0XHRob29rZXIuY2xlYXIoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSgpKTtcblxuXHRpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG1yJykpXG5cdFx0d2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IEhvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2luKCkpO1xuXHRpZiAoIWRyY3BDb25maWdTZXR0aW5nLmRldk1vZGUpIHtcblx0XHRjb25zb2xlLmxvZygnQnVpbGQgaW4gcHJvZHVjdGlvbiBtb2RlJyk7XG5cdFx0d2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IGd6aXBTaXplKCkpO1xuXHR9XG5cblx0aWYgKHdlYnBhY2tDb25maWcudGFyZ2V0ICE9PSAnbm9kZScpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgSW5kZXhIdG1sUGx1Z2luKHtcblx0XHRcdFx0aW5kZXhGaWxlOiBQYXRoLnJlc29sdmUocGFyYW0uYnJvd3Nlck9wdGlvbnMuaW5kZXgpLFxuXHRcdFx0XHRpbmxpbmVDaHVua05hbWVzOiBbJ3J1bnRpbWUnXVxuXHRcdFx0fSkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFRoaXMgaXMgY29uZGl0aW9uIG9mIFNlcnZlciBzaWRlIHJlbmRlcmluZ1xuXHRcdC8vIFJlZmVyIHRvIGFuZ3VsYXItY2xpL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3Mvc2VydmVyLnRzXG5cdFx0aWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmJ1bmRsZURlcGVuZGVuY2llcyA9PT0gJ25vbmUnKSB7XG5cdFx0XHR3ZWJwYWNrQ29uZmlnLmV4dGVybmFscyA9IFtcblx0XHRcdCAgL15AYW5ndWxhci8sXG5cdFx0XHQgIChfOiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkKSA9PiB7XG5cdFx0XHRcdC8vIEFic29sdXRlICYgUmVsYXRpdmUgcGF0aHMgYXJlIG5vdCBleHRlcm5hbHNcblx0XHRcdFx0aWYgKHJlcXVlc3QubWF0Y2goL15cXC57MCwyfVxcLy8pKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHQvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG1vZHVsZSB2aWEgTm9kZVxuXHRcdFx0XHRcdGNvbnN0IGUgPSByZXF1aXJlLnJlc29sdmUocmVxdWVzdCk7XG5cdFx0XHRcdFx0Y29uc3QgY29tcCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShlKTtcblx0XHRcdFx0XHRpZiAoY29tcCA9PSBudWxsIHx8IGNvbXAuZHIgPT0gbnVsbCApIHtcblx0XHRcdFx0XHRcdC8vIEl0J3MgYSBub2RlX21vZHVsZVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIEl0J3MgYSBzeXN0ZW0gdGhpbmcgKC5pZSB1dGlsLCBmcy4uLilcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Ly8gTm9kZSBjb3VsZG4ndCBmaW5kIGl0LCBzbyBpdCBtdXN0IGJlIHVzZXItYWxpYXNlZFxuXHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdCAgfVxuXHRcdFx0XTtcblx0XHQgIH1cblx0fVxuXHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgQ29tcGlsZURvbmVQbHVnaW4oKSk7XG5cblx0Y2hhbmdlU3BsaXRDaHVua3MocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXHRjaGFuZ2VMb2FkZXJzKHdlYnBhY2tDb25maWcpO1xuXG5cdGlmIChwYXJhbS5zc3IpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLmRldnRvb2wgPSAnc291cmNlLW1hcCc7XG5cdH1cblxuXHRhd2FpdCBhcGkuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPFdlcGFja0NvbmZpZ0hhbmRsZXI+KChmaWxlLCBsYXN0UmVzdWx0LCBoYW5kbGVyKSA9PiB7XG5cdFx0aWYgKGhhbmRsZXIud2VicGFja0NvbmZpZylcblx0XHRcdHJldHVybiBoYW5kbGVyLndlYnBhY2tDb25maWcod2VicGFja0NvbmZpZyk7XG5cdFx0cmV0dXJuIGxhc3RSZXN1bHQ7XG5cdH0pO1xuXG5cdGNvbnN0IHdmbmFtZSA9IGBkaXN0L3dlYnBhY2stJHtwYXJhbS5zc3IgPyAnc3NyJyA6ICdicm93c2VyJ30uY29uZmlnLmpzYDtcblx0ZnMud3JpdGVGaWxlU3luYyh3Zm5hbWUsIHByaW50Q29uZmlnKHdlYnBhY2tDb25maWcpKTtcblx0Y29uc29sZS5sb2coJ0lmIHlvdSBhcmUgd29uZGVyaW5nIHdoYXQga2luZCBvZiBXZWJhcGNrIGNvbmZpZyBmaWxlIGlzIHVzZWQgaW50ZXJuYWxseSwgY2hlY2tvdXQgJyArIHdmbmFtZSk7XG5cdHJldHVybiB3ZWJwYWNrQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VMb2FkZXJzKHdlYnBhY2tDb25maWc6IGFueSkge1xuXHRjb25zdCBkZXZNb2RlID0gd2VicGFja0NvbmZpZy5tb2RlID09PSAnZGV2ZWxvcG1lbnQnO1xuXHR3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPSB7XG5cdFx0bW9kdWxlczogW1BhdGguam9pbihfX2Rpcm5hbWUsICdsb2FkZXJzJyksICdub2RlX21vZHVsZXMnXVxuXHR9O1xuXHRjb25zdCBydWxlcyA9IHdlYnBhY2tDb25maWcubW9kdWxlLnJ1bGVzIGFzIHdlYnBhY2suUnVsZVtdO1xuXHRsZXQgaGFzVXJsTG9hZGVyID0gZmFsc2U7XG5cdGxldCBmaWxlTG9hZGVyUnVsZUlkeDogbnVtYmVyO1xuXHRydWxlcy5mb3JFYWNoKChydWxlLCBydWxlSWR4KSA9PiB7XG5cdFx0Y29uc3QgdGVzdCA9IHJ1bGUudGVzdDtcblx0XHRpZiAocnVsZS51c2UpIHtcblx0XHRcdGNvbnN0IGlkeCA9IChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkuZmluZEluZGV4KHJ1bGVTZXQgPT4gcnVsZVNldC5sb2FkZXIgPT09ICdwb3N0Y3NzLWxvYWRlcicpO1xuXHRcdFx0aWYgKGlkeCA+PSAwKSB7XG5cdFx0XHRcdChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkuc3BsaWNlKGlkeCArIDEsIDAsIHtcblx0XHRcdFx0XHRsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcidcblx0XHRcdFx0fSk7XG5cdFx0XHRcdC8vIChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkucHVzaCh7bG9hZGVyOiAnY3NzLXVybC1sb2FkZXInfSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpID09PSAnL1xcXFwuanMkLycgJiYgcnVsZS51c2UgJiZcblx0XHRcdChydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRVc2VJdGVtW10pLnNvbWUoKGl0ZW0pID0+IChpdGVtIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcikubG9hZGVyID09PSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLW9wdGltaXplci93ZWJwYWNrLWxvYWRlcicpKSB7XG5cdFx0XHRydWxlLnRlc3QgPSAocGF0aDogc3RyaW5nKSA9PiB7XG5cdFx0XHRcdGlmICghL1xcLmpzJC8udGVzdChwYXRoKSlcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdHJldHVybiBub1BhcnNlLmV2ZXJ5KChleGNsdWRlID0+ICFwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhleGNsdWRlKSkpO1xuXHRcdFx0fTtcblx0XHR9XG5cdFx0aWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpID09PSAnL1xcXFwuaHRtbCQvJykge1xuXHRcdFx0T2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCB7XG5cdFx0XHRcdHRlc3QsXG5cdFx0XHRcdHVzZTogW1xuXHRcdFx0XHRcdHtsb2FkZXI6ICdyYXctbG9hZGVyJ30sXG5cdFx0XHRcdFx0e2xvYWRlcjogJ25nLWh0bWwtbG9hZGVyJ30sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuXHRcdFx0XHRcdC8vIHtsb2FkZXI6ICdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcid9LFxuXHRcdFx0XHRcdHtsb2FkZXI6ICdAZHIvdGVtcGxhdGUtYnVpbGRlcid9XG5cdFx0XHRcdF1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAocnVsZS5sb2FkZXIgPT09ICdmaWxlLWxvYWRlcicpIHtcblx0XHRcdGZpbGVMb2FkZXJSdWxlSWR4ID0gcnVsZUlkeDtcblx0XHRcdC8vIGNvbnN0IHRlc3QgPSBydWxlLnRlc3Q7XG5cdFx0XHQvLyBmaWxlTG9hZGVyVGVzdCA9IHRlc3Q7XG5cdFx0XHRPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHtcblx0XHRcdFx0dGVzdDogL1xcLihlb3R8c3ZnfGN1cnx3ZWJwfG90Znx0dGZ8d29mZnx3b2ZmMnxhbmkpJC8sXG5cdFx0XHRcdHVzZTogW3tsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcid9XVxuXHRcdFx0fSk7XG5cblx0XHR9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAndXJsLWxvYWRlcicpIHtcblx0XHRcdGhhc1VybExvYWRlciA9IHRydWU7XG5cdFx0XHRPYmplY3Qua2V5cyhydWxlKS5mb3JFYWNoKChrZXk6IHN0cmluZykgPT4gZGVsZXRlIChydWxlIGFzIGFueSlba2V5XSk7XG5cdFx0XHRPYmplY3QuYXNzaWduKHJ1bGUsIHtcblx0XHRcdFx0dGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcblx0XHRcdFx0dXNlOiBbe1xuXHRcdFx0XHRcdFx0bG9hZGVyOiAndXJsLWxvYWRlcicsXG5cdFx0XHRcdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdFx0XHRcdGxpbWl0OiAhZGV2TW9kZSA/IDEwMDAwIDogMSwgLy8gPDEwayAsdXNlIGJhc2U2NCBmb3JtYXQsIGRldiBtb2RlIG9ubHkgdXNlIHVybCBmb3Igc3BlZWRcblx0XHRcdFx0XHRcdFx0ZmFsbGJhY2s6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcidcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdF1cblx0XHRcdH0pO1xuXHRcdH0gZWxzZSBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkuaW5kZXhPZignXFxcXC5zY3NzJykgPj0gMCAmJiBydWxlLnVzZSkge1xuXHRcdFx0Y29uc3QgdXNlID0gKHJ1bGUudXNlIGFzIEFycmF5PHtba2V5OiBzdHJpbmddOiBhbnksIGxvYWRlcjogc3RyaW5nfT4pO1xuXHRcdFx0Y29uc3QgaW5zZXJ0SWR4ID0gdXNlLmZpbmRJbmRleChpdGVtID0+IGl0ZW0ubG9hZGVyID09PSAnc2Fzcy1sb2FkZXInKTtcblx0XHRcdGlmIChpbnNlcnRJZHggPCAwKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignc2Fzcy1sb2FkZXIgaXMgbm90IGZvdW5kJyk7XG5cdFx0XHR9XG5cdFx0XHRjb25zdCBuZWVkU291cmNlTWFwID0gdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXA7XG5cdFx0XHQvLyByZXNvbHZlLXVybC1sb2FkZXI6IFwic291cmNlIG1hcHMgbXVzdCBiZSBlbmFibGVkIG9uIGFueSBwcmVjZWRpbmcgbG9hZGVyXCJcblx0XHRcdC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9iaG9sbG93YXkvcmVzb2x2ZS11cmwtbG9hZGVyXG5cdFx0XHR1c2VbaW5zZXJ0SWR4XS5vcHRpb25zLnNvdXJjZU1hcCA9IHRydWU7XG5cdFx0XHR1c2Uuc3BsaWNlKGluc2VydElkeCwgMCwge1xuXHRcdFx0XHRsb2FkZXI6ICdyZXNvbHZlLXVybC1sb2FkZXInLFxuXHRcdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdFx0c291cmNlTWFwOiBuZWVkU291cmNlTWFwXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0Ly8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvZGVidWctbG9hZGVyJywgb3B0aW9uczoge2lkOiAnbGVzcyBsb2FkZXJzJ319KTtcblx0XHR9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpID09PSAnL1xcXFwubGVzcyQvJyAmJiBydWxlLnVzZSkge1xuXHRcdFx0Zm9yIChjb25zdCB1c2VJdGVtIG9mIHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKSB7XG5cdFx0XHRcdGlmICh1c2VJdGVtLmxvYWRlciA9PT0gJ2xlc3MtbG9hZGVyJyAmJiBfLmhhcyh1c2VJdGVtLCAnb3B0aW9ucy5wYXRocycpKSB7XG5cdFx0XHRcdFx0ZGVsZXRlICh1c2VJdGVtLm9wdGlvbnMgYXMgYW55KS5wYXRocztcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Ly8gcnVsZS51c2UucHVzaCh7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvZGVidWctbG9hZGVyJywgb3B0aW9uczoge2lkOiAnbGVzcyBsb2FkZXJzJ319KTtcblx0XHR9XG5cdH0pO1xuXG5cdGlmICghaGFzVXJsTG9hZGVyKSB7XG5cdFx0aWYgKGZpbGVMb2FkZXJSdWxlSWR4ID09IG51bGwpXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgZmlsZS1sb2FkZXIgcnVsZSBmcm9tIEFuZ3VsYXJcXCdzIFdlYnBhY2sgY29uZmlnJyk7XG5cdFx0Y29uc29sZS5sb2coJ0luc2VydCB1cmwtbG9hZGVyJyk7XG5cdFx0cnVsZXMuc3BsaWNlKGZpbGVMb2FkZXJSdWxlSWR4ICsgMSwgMCwge1xuXHRcdFx0dGVzdDogL1xcLihqcGd8cG5nfGdpZikkLyxcblx0XHRcdHVzZTogW3tcblx0XHRcdFx0bG9hZGVyOiAndXJsLWxvYWRlcicsXG5cdFx0XHRcdG9wdGlvbnM6IHtcblx0XHRcdFx0XHRsaW1pdDogMTAwMDAsIC8vIDwxMGsgLHVzZSBiYXNlNjQgZm9ybWF0XG5cdFx0XHRcdFx0ZmFsbGJhY2s6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Rpc3QvbG9hZGVycy9kci1maWxlLWxvYWRlcidcblx0XHRcdFx0fVxuXHRcdFx0fV1cblx0XHR9KTtcblx0fVxuXHRydWxlcy51bnNoaWZ0KHtcblx0XHRcdHRlc3Q6IC9cXC5qYWRlJC8sXG5cdFx0XHR1c2U6IFtcblx0XHRcdFx0e2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcblx0XHRcdFx0e2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuXHRcdFx0XHQvLyB7bG9hZGVyOiAnQGRyL3RyYW5zbGF0ZS1nZW5lcmF0b3InfSxcblx0XHRcdFx0e2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2phZGUtdG8taHRtbC1sb2FkZXInfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGVzdDogL1xcLm1kJC8sXG5cdFx0XHR1c2U6IFtcblx0XHRcdFx0e2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcblx0XHRcdFx0e2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuXHRcdFx0XHR7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvbWFya2Rvd24tbG9hZGVyJ31cblx0XHRcdF1cblx0XHR9LFxuXHRcdHtcblx0XHRcdHRlc3Q6IC9cXC50eHQkLyxcblx0XHRcdHVzZToge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuXHRcdH0sIHtcblx0XHRcdHRlc3Q6IC9cXC4oeWFtbHx5bWwpJC8sXG5cdFx0XHR1c2U6IFtcblx0XHRcdFx0e2xvYWRlcjogJ2pzb24tbG9hZGVyJ30sXG5cdFx0XHRcdHtsb2FkZXI6ICd5YW1sLWxvYWRlcid9XG5cdFx0XHRdXG5cdFx0fVxuXHRcdC8vIHtcblx0XHQvLyBcdHRlc3Q6IG5vdEFuZ3VsYXJKcyxcblx0XHQvLyBcdHVzZTogW2JhYmVsKCldXG5cdFx0Ly8gfVxuXHQpO1xufVxuXG4vLyBmdW5jdGlvbiBub3RBbmd1bGFySnMoZmlsZTogc3RyaW5nKSB7XG4vLyBcdGlmICghZmlsZS5lbmRzV2l0aCgnLmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nZmFjdG9yeS5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ3N0eWxlLmpzJykpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHRpZiAobm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0Ly8gY29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4vLyBcdC8vIGlmIChwayAmJiBway5kcikge1xuLy8gXHQvLyBcdHJldHVybiB0cnVlO1xuLy8gXHQvLyB9XG4vLyBcdGNvbnNvbGUubG9nKCdiYWJlbDogJywgZmlsZSk7XG4vLyBcdHJldHVybiB0cnVlO1xuLy8gfVxuXG5mdW5jdGlvbiBjaGFuZ2VTcGxpdENodW5rcyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiBhbnkpIHtcblx0aWYgKHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uID09IG51bGwpXG5cdFx0cmV0dXJuOyAvLyBTU1InIFdlYnBhY2sgY29uZmlnIGRvZXMgbm90IGhhcyB0aGlzIHByb3BlcnR5XG5cdGNvbnN0IG9sZFZlbmRvclRlc3RGdW5jID0gXy5nZXQod2VicGFja0NvbmZpZywgJ29wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCcpO1xuXG5cdGlmIChvbGRWZW5kb3JUZXN0RnVuYykge1xuXHRcdGNvbnN0IGNhY2hlR3JvdXBzOiB7W2tleTogc3RyaW5nXTogd2VicGFjay5PcHRpb25zLkNhY2hlR3JvdXBzT3B0aW9uc30gPSB3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3Vwcztcblx0XHRjYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCA9IHZlbmRvclRlc3Q7XG5cdFx0Y2FjaGVHcm91cHMubGF6eVZlbmRvciA9IHtcblx0XHRcdG5hbWU6ICdsYXp5LXZlbmRvcicsXG5cdFx0XHRjaHVua3M6ICdhc3luYycsXG5cdFx0XHRlbmZvcmNlOiB0cnVlLFxuXHRcdFx0dGVzdDogdmVuZG9yVGVzdCxcblx0XHRcdHByaW9yaXR5OiAxXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIHZlbmRvclRlc3QobW9kdWxlOiBhbnksIGNodW5rczogQXJyYXk8eyBuYW1lOiBzdHJpbmcgfT4pIHtcblx0XHRjb25zdCBtYXliZVZlbmRvciA9IG9sZFZlbmRvclRlc3RGdW5jKG1vZHVsZSwgY2h1bmtzKTtcblx0XHRpZiAoIW1heWJlVmVuZG9yKVxuXHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdGNvbnN0IHJlc291cmNlID0gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24gPyBtb2R1bGUubmFtZUZvckNvbmRpdGlvbigpIDogJyc7XG5cdFx0Ly8gY29uc29sZS5sb2coYHZlbmRvciB0ZXN0LCByZXNvdXJjZTogJHtyZXNvdXJjZX0sIGNodW5rczogJHtjaHVua3MubWFwKCBjID0+IGMubmFtZSl9YCk7XG5cdFx0Y29uc3QgcGsgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUocmVzb3VyY2UpO1xuXHRcdHJldHVybiBwayA9PSBudWxsIHx8IHBrLmRyID09IG51bGw7XG5cdH1cbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWcoYzogYW55LCBsZXZlbCA9IDApOiBzdHJpbmcge1xuXHR2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuXHR2YXIgb3V0ID0gJ3tcXG4nO1xuXHRfLmZvck93bihjLCAodmFsdWU6IGFueSwgcHJvcDogc3RyaW5nKSA9PiB7XG5cdFx0b3V0ICs9IGluZGVudCArIGAgICR7SlNPTi5zdHJpbmdpZnkocHJvcCl9OiAke3ByaW50Q29uZmlnVmFsdWUodmFsdWUsIGxldmVsKX0sXFxuYDtcblx0fSk7XG5cdG91dCArPSBpbmRlbnQgKyAnfSc7XG5cdHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnVmFsdWUodmFsdWU6IGFueSwgbGV2ZWw6IG51bWJlcik6IHN0cmluZyB7XG5cdHZhciBvdXQgPSAnJztcblx0dmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcblx0aWYgKF8uaXNTdHJpbmcodmFsdWUpIHx8IF8uaXNOdW1iZXIodmFsdWUpIHx8IF8uaXNCb29sZWFuKHZhbHVlKSkge1xuXHRcdG91dCArPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSkgKyAnJztcblx0fSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuXHRcdG91dCArPSAnW1xcbic7XG5cdFx0KHZhbHVlIGFzIGFueVtdKS5mb3JFYWNoKChyb3c6IGFueSkgPT4ge1xuXHRcdFx0b3V0ICs9IGluZGVudCArICcgICAgJyArIHByaW50Q29uZmlnVmFsdWUocm93LCBsZXZlbCArIDEpO1xuXHRcdFx0b3V0ICs9ICcsXFxuJztcblx0XHR9KTtcblx0XHRvdXQgKz0gaW5kZW50ICsgJyAgXSc7XG5cdH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuXHRcdG91dCArPSB2YWx1ZS5uYW1lICsgJygpJztcblx0fSBlbHNlIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcblx0XHRvdXQgKz0gYCR7dmFsdWUudG9TdHJpbmcoKX1gO1xuXHR9IGVsc2UgaWYgKF8uaXNPYmplY3QodmFsdWUpKSB7XG5cdFx0Y29uc3QgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodmFsdWUpO1xuXHRcdGlmIChwcm90byAmJiBwcm90by5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XG5cdFx0XHRvdXQgKz0gYG5ldyAke3Byb3RvLmNvbnN0cnVjdG9yLm5hbWV9KClgO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRvdXQgKz0gcHJpbnRDb25maWcodmFsdWUsIGxldmVsICsgMSk7XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdG91dCArPSAnIHVua25vd24nO1xuXHR9XG5cdHJldHVybiBvdXQ7XG59XG5cbmNsYXNzIENvbXBpbGVEb25lUGx1Z2luIHtcblxuXHRhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcblx0XHRjb21waWxlci5ob29rcy5kb25lLnRhcCgnZHJjcC1kZXZzZXJ2ZXItYnVpbGQtd2VicGFjaycsIChzdGF0cykgPT4ge1xuXHRcdFx0YXBpLmV2ZW50QnVzLmVtaXQoJ3dlYnBhY2tEb25lJywge3N1Y2Nlc3M6IHRydWV9KTtcblx0XHR9KTtcblx0fVxufVxuIl19
