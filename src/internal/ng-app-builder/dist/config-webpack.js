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
            devServer.before = function after(app) {
                dev_serve_assets_1.default(devServer.publicPath || '/', app.use.bind(app));
                if (origin)
                    origin.apply(this, arguments);
            };
            devServer.compress = true;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtCQUErQjtBQUMvQiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQkFBZ0M7QUFHaEMsMERBQXdCO0FBQ3hCLDRFQUEyQztBQUUzQyw4RUFBbUQ7QUFDbkQsNEVBQTJDO0FBQzNDLDRGQUEwRDtBQUMxRCwwRkFBcUQ7QUFFckQsK0dBQTBFO0FBTTFFLFNBQThCLG1CQUFtQixDQUFDLEtBQXNCLEVBQUUsYUFBb0MsRUFDNUcsaUJBQXFDOztRQUNyQyx1R0FBdUc7UUFDdkcsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4REFBOEQsQ0FBQyxDQUFDO1FBRTVFLElBQUksYUFBYSxDQUFDLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDakMsYUFBYSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7U0FDNUI7UUFDRCxJQUFJLGFBQWEsQ0FBQyxTQUFTLEVBQUU7WUFDM0IsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztZQUMxQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztZQUM5QyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsS0FBSyxDQUFDLEdBQWdCO2dCQUNoRCwwQkFBVyxDQUFDLFNBQVMsQ0FBQyxVQUFVLElBQUksR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzVELElBQUksTUFBTTtvQkFDUixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNsQyxDQUFDLENBQUM7WUFDRixTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztTQUMzQjtRQUVELElBQUksQ0FBQyxDQUFDLEdB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SyxJQUFJLEtBQUssQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFO1lBQ3pDLEdBQUcsSUFBSSxPQUFPLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7U0FDMUM7YUFBTTtZQUNMLEdBQUcsSUFBSSxXQUFXLENBQUMsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN0QztLQUNGO1NBQU07UUFDTCxHQUFHLElBQUksVUFBVSxDQUFDO0tBQ25CO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQsNEJBQTRCO0FBRTVCLCtCQUErQjtBQUMvQix5RUFBeUU7QUFDekUsd0RBQXdEO0FBQ3hELFFBQVE7QUFDUixLQUFLO0FBQ0wsSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9jb25maWctd2VicGFjay5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgbWF4LWxpbmUtbGVuZ3RoIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgeyBBbmd1bGFyQ29tcGlsZXJQbHVnaW4gfSBmcm9tICdAbmd0b29scy93ZWJwYWNrJztcbi8vIGltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBpc1JlZ0V4cCB9IGZyb20gJ3V0aWwnO1xuaW1wb3J0ICogYXMgd2VicGFjayBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBUU1JlYWRIb29rZXIgZnJvbSAnLi9uZy10cy1yZXBsYWNlJztcbmltcG9ydCB7IEFuZ3VsYXJDbGlQYXJhbSB9IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBDaHVua0luZm9QbHVnaW4gZnJvbSAnLi9wbHVnaW5zL2NodW5rLWluZm8nO1xuaW1wb3J0IGd6aXBTaXplIGZyb20gJy4vcGx1Z2lucy9nemlwLXNpemUnO1xuaW1wb3J0IEluZGV4SHRtbFBsdWdpbiBmcm9tICcuL3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4nO1xuaW1wb3J0IFJlYWRIb29rSG9zdCBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmltcG9ydCB7QXBwbGljYXRpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHNldHVwQXNzZXRzIGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcbmV4cG9ydCBpbnRlcmZhY2UgV2VwYWNrQ29uZmlnSGFuZGxlciB7XG4gIC8qKiBAcmV0dXJucyB3ZWJwYWNrIGNvbmZpZ3VyYXRpb24gb3IgUHJvbWlzZSAqL1xuICB3ZWJwYWNrQ29uZmlnKG9yaWdpbmFsQ29uZmlnOiBhbnkpOiBQcm9taXNlPHtbbmFtZTogc3RyaW5nXTogYW55fSB8IHZvaWQ+IHwge1tuYW1lOiBzdHJpbmddOiBhbnl9IHwgdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlV2VicGFja0NvbmZpZyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24sXG4gIGRyY3BDb25maWdTZXR0aW5nOiB7ZGV2TW9kZTogYm9vbGVhbn0pIHtcbiAgLy8gY29uc3QgYXBpOiB0eXBlb2YgX19hcGkgPSByZXF1aXJlKCdfX2FwaScpOyAvLyBmb3JjZSB0byBkZWZlciBsb2FkaW5nIGFwaSB1bnRpbCBEUkNQIGNvbmZpZyBpcyByZWFkeVxuICBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+Pj4+Pj4+Pj4gY2hhbmdlV2VicGFja0NvbmZpZyA+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Jyk7XG5cbiAgaWYgKHdlYnBhY2tDb25maWcucGx1Z2lucyA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zID0gW107XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcuZGV2U2VydmVyKSB7XG4gICAgY29uc3QgZGV2U2VydmVyID0gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXI7XG4gICAgY29uc3Qgb3JpZ2luID0gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIuYmVmb3JlO1xuICAgIGRldlNlcnZlci5iZWZvcmUgPSBmdW5jdGlvbiBhZnRlcihhcHA6IEFwcGxpY2F0aW9uKSB7XG4gICAgICBzZXR1cEFzc2V0cyhkZXZTZXJ2ZXIucHVibGljUGF0aCB8fCAnLycsIGFwcC51c2UuYmluZChhcHApKTtcbiAgICAgIGlmIChvcmlnaW4pXG4gICAgICAgIG9yaWdpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gICAgZGV2U2VydmVyLmNvbXByZXNzID0gdHJ1ZTtcbiAgfVxuXG4gIGlmIChfLmdldChwYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5kcmNwQXJncy5yZXBvcnQnKSB8fFxuICBwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5yZXBvcnQgfHwocGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3Mub3BlblJlcG9ydCkpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChcbiAgICAgIG5ldyBDaHVua0luZm9QbHVnaW4oKVxuICAgICk7XG4gIH1cblxuICAvLyB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ub1BhcnNlID0gKGZpbGU6IHN0cmluZykgPT4gbm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpO1xuXG4gIGNvbnN0IG5nQ29tcGlsZXJQbHVnaW46IGFueSA9IHdlYnBhY2tDb25maWcucGx1Z2lucy5maW5kKChwbHVnaW46IGFueSkgPT4ge1xuICAgIHJldHVybiAocGx1Z2luIGluc3RhbmNlb2YgQW5ndWxhckNvbXBpbGVyUGx1Z2luKTtcbiAgfSk7XG4gIGlmIChuZ0NvbXBpbGVyUGx1Z2luID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgQW5ndWxhckNvbXBpbGVyUGx1Z2luJyk7XG4gIC8vIEhhY2sgYW5ndWxhci9wYWNrYWdlcy9uZ3Rvb2xzL3dlYnBhY2svc3JjL2FuZ3VsYXJfY29tcGlsZXJfcGx1Z2luLnRzICEhISFcbiAgLy8gY29uc3QgdHJhbnNmb3JtZXJzOiB0cy5UcmFuc2Zvcm1lckZhY3Rvcnk8dHMuU291cmNlRmlsZT5bXSA9IChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX3RyYW5zZm9ybWVycztcbiAgLy8gdHJhbnNmb3JtZXJzLnVuc2hpZnQoKGNvbnRleHQpID0+IHtcbiAgLy8gICByZXR1cm4gKHRzU3JjKSA9PiB7XG4gIC8vICAgICBjb25zb2xlLmxvZygnaGVsbG93OicsIHRzU3JjLmZpbGVOYW1lKTtcbiAgLy8gICAgIHJldHVybiB0c1NyYztcbiAgLy8gICB9O1xuICAvLyB9KTtcbiAgKHdlYnBhY2tDb25maWcucGx1Z2lucyBhcyBhbnlbXSkudW5zaGlmdChuZXcgY2xhc3Mge1xuICAgIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgICAgY29uc3QgaG9va2VyID0gbmV3IFRTUmVhZEhvb2tlcihwYXJhbSk7XG4gICAgICAobmdDb21waWxlclBsdWdpbiBhcyBhbnkpLl9vcHRpb25zLmhvc3QgPSBuZXcgUmVhZEhvb2tIb3N0KChjb21waWxlciBhcyBhbnkpLmlucHV0RmlsZVN5c3RlbSwgaG9va2VyLmhvb2tGdW5jKTtcbiAgICAgIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcFByb21pc2UoJ3RzLXJlYWQtaG9vaycsIGFzeW5jICgpID0+IHtcbiAgICAgICAgaG9va2VyLmNsZWFyKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0oKSk7XG5cbiAgaWYgKCFkcmNwQ29uZmlnU2V0dGluZy5kZXZNb2RlKSB7XG4gICAgY29uc29sZS5sb2coJ0J1aWxkIGluIHByb2R1Y3Rpb24gbW9kZScpO1xuICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy5wdXNoKG5ldyBnemlwU2l6ZSgpKTtcbiAgfVxuXG4gIGlmICh3ZWJwYWNrQ29uZmlnLnRhcmdldCAhPT0gJ25vZGUnKSB7XG4gICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IEluZGV4SHRtbFBsdWdpbih7XG4gICAgICAgIGluZGV4RmlsZTogUGF0aC5yZXNvbHZlKHBhcmFtLmJyb3dzZXJPcHRpb25zLmluZGV4KSxcbiAgICAgICAgaW5saW5lQ2h1bmtOYW1lczogWydydW50aW1lJ11cbiAgICAgIH0pKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGlzIGlzIGNvbmRpdGlvbiBvZiBTZXJ2ZXIgc2lkZSByZW5kZXJpbmdcbiAgICAvLyBSZWZlciB0byBhbmd1bGFyLWNsaS9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF9hbmd1bGFyL3NyYy9hbmd1bGFyLWNsaS1maWxlcy9tb2RlbHMvd2VicGFjay1jb25maWdzL3NlcnZlci50c1xuICAgIGlmIChwYXJhbS5icm93c2VyT3B0aW9ucy5idW5kbGVEZXBlbmRlbmNpZXMgPT09ICdub25lJykge1xuICAgICAgd2VicGFja0NvbmZpZy5leHRlcm5hbHMgPSBbXG4gICAgICAgIC9eQGFuZ3VsYXIvLFxuICAgICAgICAoXzogYW55LCByZXF1ZXN0OiBhbnksIGNhbGxiYWNrOiAoZXJyb3I/OiBhbnksIHJlc3VsdD86IGFueSkgPT4gdm9pZCkgPT4ge1xuICAgICAgICAvLyBBYnNvbHV0ZSAmIFJlbGF0aXZlIHBhdGhzIGFyZSBub3QgZXh0ZXJuYWxzXG4gICAgICAgIGlmICgvXlxcLnswLDJ9XFwvLy50ZXN0KHJlcXVlc3QpIHx8IFBhdGguaXNBYnNvbHV0ZShyZXF1ZXN0KSkge1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gQXR0ZW1wdCB0byByZXNvbHZlIHRoZSBtb2R1bGUgdmlhIE5vZGVcbiAgICAgICAgICBjb25zdCBlID0gcmVxdWlyZS5yZXNvbHZlKHJlcXVlc3QpO1xuICAgICAgICAgIGNvbnN0IGNvbXAgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZSk7XG4gICAgICAgICAgaWYgKGNvbXAgPT0gbnVsbCB8fCBjb21wLmRyID09IG51bGwgKSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgbm9kZV9tb2R1bGVcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHJlcXVlc3QpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBJdCdzIGEgc3lzdGVtIHRoaW5nICguaWUgdXRpbCwgZnMuLi4pXG4gICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIE5vZGUgY291bGRuJ3QgZmluZCBpdCwgc28gaXQgbXVzdCBiZSB1c2VyLWFsaWFzZWRcbiAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIF07XG4gICAgICB9XG4gIH1cbiAgLy8gd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IENvbXBpbGVEb25lUGx1Z2luKCkpO1xuXG4gIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtLCB3ZWJwYWNrQ29uZmlnKTtcbiAgY2hhbmdlTG9hZGVycyhwYXJhbSwgd2VicGFja0NvbmZpZyk7XG5cbiAgaWYgKHBhcmFtLnNzcikge1xuICAgIHdlYnBhY2tDb25maWcuZGV2dG9vbCA9ICdzb3VyY2UtbWFwJztcbiAgfVxuXG4gIGF3YWl0IGFwaS5jb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8V2VwYWNrQ29uZmlnSGFuZGxlcj4oKGZpbGUsIGxhc3RSZXN1bHQsIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci53ZWJwYWNrQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIud2VicGFja0NvbmZpZyh3ZWJwYWNrQ29uZmlnKTtcbiAgICByZXR1cm4gbGFzdFJlc3VsdDtcbiAgfSk7XG5cbiAgY29uc3Qgd2ZuYW1lID0gYGRpc3Qvd2VicGFjay0ke3BhcmFtLnNzciA/ICdzc3InIDogJ2Jyb3dzZXInfS5jb25maWcuanNgO1xuICBmcy53cml0ZUZpbGVTeW5jKHdmbmFtZSwgcHJpbnRDb25maWcod2VicGFja0NvbmZpZykpO1xuICBjb25zb2xlLmxvZygnSWYgeW91IGFyZSB3b25kZXJpbmcgd2hhdCBraW5kIG9mIFdlYmFwY2sgY29uZmlnIGZpbGUgaXMgdXNlZCBpbnRlcm5hbGx5LCBjaGVja291dCAnICsgd2ZuYW1lKTtcbiAgcmV0dXJuIHdlYnBhY2tDb25maWc7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUxvYWRlcnMocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uKSB7XG4gIGNvbnN0IG5vUGFyc2UgPSAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkT3B0aW1pemVyRXhjbHVkZSddLCBbXSkgYXMgc3RyaW5nW10pO1xuICBub1BhcnNlLnB1c2goLi4uYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkLW9wdGltaXplcjpleGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG5cbiAgLy8gY29uc3QgZGV2TW9kZSA9IHdlYnBhY2tDb25maWcubW9kZSA9PT0gJ2RldmVsb3BtZW50JztcbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlciA9PSBudWxsKSB7XG4gICAgd2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID0ge307XG4gIH1cbiAgaWYgKHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID09IG51bGwpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIubW9kdWxlcyA9IFtdO1xuICB9XG4gIHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzLnVuc2hpZnQoUGF0aC5qb2luKF9fZGlybmFtZSwgJ2xvYWRlcnMnKSk7XG4gIGlmICghd2VicGFja0NvbmZpZy5tb2R1bGUpIHtcbiAgICB3ZWJwYWNrQ29uZmlnLm1vZHVsZSA9IHtydWxlczogW119O1xuICB9XG4gIGNvbnN0IHJ1bGVzID0gd2VicGFja0NvbmZpZy5tb2R1bGUucnVsZXMgYXMgd2VicGFjay5SdWxlW107XG4gIGxldCBoYXNVcmxMb2FkZXIgPSBmYWxzZTtcbiAgbGV0IGhhc0h0bWxMb2FkZXIgPSBmYWxzZTtcbiAgbGV0IGZpbGVMb2FkZXJSdWxlSWR4OiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3QgdXJsTG9hZGVyUnVsZSA9IHtcbiAgICB0ZXN0OiAvXFwuKGpwZ3xwbmd8Z2lmKSQvLFxuICAgIHVzZTogW3tcbiAgICAgIGxvYWRlcjogJ3VybC1sb2FkZXInLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBsaW1pdDogMTAwMDAsIC8vIDwxMGsgLHVzZSBiYXNlNjQgZm9ybWF0XG4gICAgICAgIGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG4gICAgICB9XG4gICAgfV1cbiAgfTtcbiAgY29uc3QgaHRtbExvYWRlclJ1bGUgPSB7XG4gICAgdGVzdDogL1xcXFwuaHRtbCQvLFxuICAgIHVzZTogW1xuICAgICAge2xvYWRlcjogJ3Jhdy1sb2FkZXInfSxcbiAgICAgIHtsb2FkZXI6ICduZy1odG1sLWxvYWRlcid9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cbiAgICAgIC8vIHtsb2FkZXI6ICdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcid9LFxuICAgICAge2xvYWRlcjogJ0Bkci90ZW1wbGF0ZS1idWlsZGVyJ31cbiAgICBdXG4gIH07XG4gIHJ1bGVzLmZvckVhY2goKHJ1bGUsIHJ1bGVJZHgpID0+IHtcbiAgICBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuICAgIGlmIChydWxlLnVzZSkge1xuICAgICAgY29uc3QgaWR4ID0gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5maW5kSW5kZXgocnVsZVNldCA9PiBydWxlU2V0LmxvYWRlciA9PT0gJ3Bvc3Rjc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5zcGxpY2UoaWR4ICsgMSwgMCwge1xuICAgICAgICAgIGxvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldExvYWRlcltdKS5wdXNoKHtsb2FkZXI6ICdjc3MtdXJsLWxvYWRlcid9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGVzdCBpbnN0YW5jZW9mIFJlZ0V4cCAmJiB0ZXN0LnRvU3RyaW5nKCkgPT09ICcvXFxcXC5qcyQvJyAmJiBydWxlLnVzZSAmJlxuICAgICAgKHJ1bGUudXNlIGFzIHdlYnBhY2suUnVsZVNldFVzZUl0ZW1bXSkuc29tZSgoaXRlbSkgPT5cbiAgICAgICAgKGl0ZW0gYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyKS5sb2FkZXIgPT09ICdAYW5ndWxhci1kZXZraXQvYnVpbGQtb3B0aW1pemVyL3dlYnBhY2stbG9hZGVyJykpIHtcbiAgICAgIHJ1bGUudGVzdCA9IChwYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgblBhdGggPSBwYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgcmV0dXJuIG5vUGFyc2UuZXZlcnkoKGV4Y2x1ZGUgPT4gIW5QYXRoLmluY2x1ZGVzKGV4Y2x1ZGUpKSk7XG4gICAgICB9O1xuICAgIH1cbiAgICAvLyBBbmd1bGFyIDggZG9lc24ndCBoYXZlIGxvYWRlciBmb3IgSFRNTFxuICAgIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcbiAgICAgIGhhc0h0bWxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCBodG1sTG9hZGVyUnVsZSk7XG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ2ZpbGUtbG9hZGVyJykge1xuICAgICAgZmlsZUxvYWRlclJ1bGVJZHggPSBydWxlSWR4O1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB7XG4gICAgICAgIHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuICAgICAgICB1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInfV1cbiAgICAgIH0pO1xuXG4gICAgfSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ3VybC1sb2FkZXInKSB7XG4gICAgICBoYXNVcmxMb2FkZXIgPSB0cnVlO1xuICAgICAgT2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuICAgICAgT2JqZWN0LmFzc2lnbihydWxlLCB1cmxMb2FkZXJSdWxlKTtcbiAgICB9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpLmluZGV4T2YoJ1xcXFwuc2NzcycpID49IDAgJiYgcnVsZS51c2UpIHtcbiAgICAgIGNvbnN0IHVzZSA9IChydWxlLnVzZSBhcyBBcnJheTx7W2tleTogc3RyaW5nXTogYW55LCBsb2FkZXI6IHN0cmluZ30+KTtcbiAgICAgIGNvbnN0IGluc2VydElkeCA9IHVzZS5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLmxvYWRlciA9PT0gJ3Nhc3MtbG9hZGVyJyk7XG4gICAgICBpZiAoaW5zZXJ0SWR4IDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Nhc3MtbG9hZGVyIGlzIG5vdCBmb3VuZCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgbmVlZFNvdXJjZU1hcCA9IHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwO1xuICAgICAgLy8gcmVzb2x2ZS11cmwtbG9hZGVyOiBcInNvdXJjZSBtYXBzIG11c3QgYmUgZW5hYmxlZCBvbiBhbnkgcHJlY2VkaW5nIGxvYWRlclwiXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYmhvbGxvd2F5L3Jlc29sdmUtdXJsLWxvYWRlclxuICAgICAgdXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXAgPSB0cnVlO1xuICAgICAgdXNlLnNwbGljZShpbnNlcnRJZHgsIDAsIHtcbiAgICAgICAgbG9hZGVyOiAncmVzb2x2ZS11cmwtbG9hZGVyJyxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHNvdXJjZU1hcDogbmVlZFNvdXJjZU1hcFxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmxlc3MkLycgJiYgcnVsZS51c2UpIHtcbiAgICAgIGZvciAoY29uc3QgdXNlSXRlbSBvZiBydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkge1xuICAgICAgICBpZiAodXNlSXRlbS5sb2FkZXIgPT09ICdsZXNzLWxvYWRlcicgJiYgXy5oYXModXNlSXRlbSwgJ29wdGlvbnMucGF0aHMnKSkge1xuICAgICAgICAgIGRlbGV0ZSAodXNlSXRlbS5vcHRpb25zIGFzIGFueSkucGF0aHM7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWhhc1VybExvYWRlcikge1xuICAgIGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuICAgIGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuICAgIHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHVybExvYWRlclJ1bGUpO1xuICB9XG4gIGlmIChwYXJhbS5icm93c2VyT3B0aW9ucy5hb3QpIHtcbiAgICBydWxlcy51bnNoaWZ0KHtcbiAgICAgIHRlc3Q6IC9cXC5uZ2ZhY3RvcnkuanMkLyxcbiAgICAgIHVzZTogW3tsb2FkZXI6ICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLWFvdC1hc3NldHMvbmctYW90LWFzc2V0cy1sb2FkZXInfV1cbiAgICB9KTtcbiAgfVxuICBydWxlcy51bnNoaWZ0KHtcbiAgICBvbmVPZjogW1xuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC5qYWRlJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICAvLyB7bG9hZGVyOiAnQGRyL3RyYW5zbGF0ZS1nZW5lcmF0b3InfSxcbiAgICAgICAge2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2phZGUtdG8taHRtbC1sb2FkZXInfVxuICAgICAgXVxuICAgIH0sXG4gICAge1xuICAgICAgdGVzdDogL1xcLm1kJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2h0bWwtbG9hZGVyJywgb3B0aW9uczoge2F0dHJzOiAnaW1nOnNyYyd9fSxcbiAgICAgICAge2xvYWRlcjogUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2xvYWRlcnMnLCAnbmctaHRtbC1sb2FkZXInKX0sIC8vIFJlcGxhY2Uga2V5d2FyZCBhc3NldHM6Ly8gaW4gKltzcmN8aHJlZnxzcmNzZXR8bmctc3JjXVxuICAgICAgICB7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvbWFya2Rvd24tbG9hZGVyJ31cbiAgICAgIF1cbiAgICB9LFxuICAgIHtcbiAgICAgIHRlc3Q6IC9cXC50eHQkLyxcbiAgICAgIHVzZToge2xvYWRlcjogJ3Jhdy1sb2FkZXInfVxuICAgIH0sIHtcbiAgICAgIHRlc3Q6IC9cXC4oeWFtbHx5bWwpJC8sXG4gICAgICB1c2U6IFtcbiAgICAgICAge2xvYWRlcjogJ2pzb24tbG9hZGVyJ30sXG4gICAgICAgIHtsb2FkZXI6ICd5YW1sLWxvYWRlcid9XG4gICAgICBdXG4gICAgfV1cbiAgfSk7XG5cbiAgaWYgKCFoYXNIdG1sTG9hZGVyKSB7XG4gICAgcnVsZXNbMF0ub25lT2YgJiYgcnVsZXNbMF0ub25lT2YucHVzaChodG1sTG9hZGVyUnVsZSk7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gbm90QW5ndWxhckpzKGZpbGU6IHN0cmluZykge1xuLy8gXHRpZiAoIWZpbGUuZW5kc1dpdGgoJy5qcycpIHx8IGZpbGUuZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdzdHlsZS5qcycpKVxuLy8gXHRcdHJldHVybiBmYWxzZTtcbi8vIFx0aWYgKG5vUGFyc2Uuc29tZShuYW1lID0+IGZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpLmluY2x1ZGVzKG5hbWUpKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdC8vIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuLy8gXHQvLyBpZiAocGsgJiYgcGsuZHIpIHtcbi8vIFx0Ly8gXHRyZXR1cm4gdHJ1ZTtcbi8vIFx0Ly8gfVxuLy8gXHRjb25zb2xlLmxvZygnYmFiZWw6ICcsIGZpbGUpO1xuLy8gXHRyZXR1cm4gdHJ1ZTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlU3BsaXRDaHVua3MocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogYW55KSB7XG4gIGlmICh3ZWJwYWNrQ29uZmlnLm9wdGltaXphdGlvbiA9PSBudWxsKVxuICAgIHJldHVybjsgLy8gU1NSJyBXZWJwYWNrIGNvbmZpZyBkb2VzIG5vdCBoYXMgdGhpcyBwcm9wZXJ0eVxuICBjb25zdCBvbGRWZW5kb3JUZXN0RnVuYyA9IF8uZ2V0KHdlYnBhY2tDb25maWcsICdvcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHMudmVuZG9yLnRlc3QnKTtcblxuICBpZiAob2xkVmVuZG9yVGVzdEZ1bmMpIHtcbiAgICBjb25zdCBjYWNoZUdyb3Vwczoge1trZXk6IHN0cmluZ106IHdlYnBhY2suT3B0aW9ucy5DYWNoZUdyb3Vwc09wdGlvbnN9ID0gd2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHM7XG4gICAgY2FjaGVHcm91cHMudmVuZG9yLnRlc3QgPSB2ZW5kb3JUZXN0O1xuICAgIGNhY2hlR3JvdXBzLmxhenlWZW5kb3IgPSB7XG4gICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgY2h1bmtzOiAnYXN5bmMnLFxuICAgICAgZW5mb3JjZTogdHJ1ZSxcbiAgICAgIHRlc3Q6IHZlbmRvclRlc3QsXG4gICAgICBwcmlvcml0eTogMVxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiB2ZW5kb3JUZXN0KG1vZHVsZTogYW55LCBjaHVua3M6IEFycmF5PHsgbmFtZTogc3RyaW5nIH0+KSB7XG4gICAgY29uc3QgbWF5YmVWZW5kb3IgPSBvbGRWZW5kb3JUZXN0RnVuYyhtb2R1bGUsIGNodW5rcyk7XG4gICAgaWYgKCFtYXliZVZlbmRvcilcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCByZXNvdXJjZSA9IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uID8gbW9kdWxlLm5hbWVGb3JDb25kaXRpb24oKSA6ICcnO1xuICAgIC8vIGNvbnNvbGUubG9nKGB2ZW5kb3IgdGVzdCwgcmVzb3VyY2U6ICR7cmVzb3VyY2V9LCBjaHVua3M6ICR7Y2h1bmtzLm1hcCggYyA9PiBjLm5hbWUpfWApO1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlKTtcbiAgICByZXR1cm4gcGsgPT0gbnVsbCB8fCBway5kciA9PSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHByaW50Q29uZmlnKGM6IGFueSwgbGV2ZWwgPSAwKTogc3RyaW5nIHtcbiAgdmFyIGluZGVudCA9IF8ucmVwZWF0KCcgICcsIGxldmVsKTtcbiAgdmFyIG91dCA9ICd7XFxuJztcbiAgXy5mb3JPd24oYywgKHZhbHVlOiBhbnksIHByb3A6IHN0cmluZykgPT4ge1xuICAgIG91dCArPSBpbmRlbnQgKyBgICAke0pTT04uc3RyaW5naWZ5KHByb3ApfTogJHtwcmludENvbmZpZ1ZhbHVlKHZhbHVlLCBsZXZlbCl9LFxcbmA7XG4gIH0pO1xuICBvdXQgKz0gaW5kZW50ICsgJ30nO1xuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZ1ZhbHVlKHZhbHVlOiBhbnksIGxldmVsOiBudW1iZXIpOiBzdHJpbmcge1xuICB2YXIgb3V0ID0gJyc7XG4gIHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG4gIGlmIChfLmlzU3RyaW5nKHZhbHVlKSB8fCBfLmlzTnVtYmVyKHZhbHVlKSB8fCBfLmlzQm9vbGVhbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gSlNPTi5zdHJpbmdpZnkodmFsdWUpICsgJyc7XG4gIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBvdXQgKz0gJ1tcXG4nO1xuICAgICh2YWx1ZSBhcyBhbnlbXSkuZm9yRWFjaCgocm93OiBhbnkpID0+IHtcbiAgICAgIG91dCArPSBpbmRlbnQgKyAnICAgICcgKyBwcmludENvbmZpZ1ZhbHVlKHJvdywgbGV2ZWwgKyAxKTtcbiAgICAgIG91dCArPSAnLFxcbic7XG4gICAgfSk7XG4gICAgb3V0ICs9IGluZGVudCArICcgIF0nO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICBvdXQgKz0gdmFsdWUubmFtZSArICcoKSc7XG4gIH0gZWxzZSBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgb3V0ICs9IGAke3ZhbHVlLnRvU3RyaW5nKCl9YDtcbiAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KHZhbHVlKSkge1xuICAgIGNvbnN0IHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHZhbHVlKTtcbiAgICBpZiAocHJvdG8gJiYgcHJvdG8uY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgICAgb3V0ICs9IGBuZXcgJHtwcm90by5jb25zdHJ1Y3Rvci5uYW1lfSgpYDtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0ICs9IHByaW50Q29uZmlnKHZhbHVlLCBsZXZlbCArIDEpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBvdXQgKz0gJyB1bmtub3duJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vLyBjbGFzcyBDb21waWxlRG9uZVBsdWdpbiB7XG5cbi8vIFx0YXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4vLyBcdFx0Y29tcGlsZXIuaG9va3MuZG9uZS50YXAoJ2RyY3AtZGV2c2VydmVyLWJ1aWxkLXdlYnBhY2snLCAoc3RhdHMpID0+IHtcbi8vIFx0XHRcdGFwaS5ldmVudEJ1cy5lbWl0KCd3ZWJwYWNrRG9uZScsIHtzdWNjZXNzOiB0cnVlfSk7XG4vLyBcdFx0fSk7XG4vLyBcdH1cbi8vIH1cbiJdfQ==
