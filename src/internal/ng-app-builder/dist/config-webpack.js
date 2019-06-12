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
function changeWebpackConfig(param, webpackConfig, drcpConfigSetting) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // const api: typeof __api = require('__api'); // force to defer loading api until DRCP config is ready
        console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
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
        // if (_.get(param, 'builderConfig.options.hmr'))
        // 	webpackConfig.plugins.push(new HotModuleReplacementPlugin());
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
    const devMode = webpackConfig.mode === 'development';
    if (webpackConfig.resolveLoader == null) {
        webpackConfig.resolveLoader = {};
    }
    if (webpackConfig.resolveLoader.modules == null) {
        webpackConfig.resolveLoader.modules = [];
    }
    webpackConfig.resolveLoader.modules.unshift(Path.join(__dirname, 'loaders'));
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
// class CompileDonePlugin {
// 	apply(compiler: Compiler) {
// 		compiler.hooks.done.tap('drcp-devserver-build-webpack', (stats) => {
// 			api.eventBus.emit('webpackDone', {success: true});
// 		});
// 	}
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9jb25maWctd2VicGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxvRUFBb0U7QUFDcEUsOENBQXlEO0FBQ3pELCtDQUF5QjtBQUN6QixrREFBNEI7QUFDNUIsbURBQTZCO0FBQzdCLCtCQUFnQztBQUdoQywwREFBd0I7QUFDeEIsNEVBQTJDO0FBRTNDLDhFQUFtRDtBQUNuRCw0RUFBMkM7QUFDM0MsNEZBQTBEO0FBQzFELDBGQUFxRDtBQU9yRCxTQUE4QixtQkFBbUIsQ0FBQyxLQUFzQixFQUFFLGFBQW9DLEVBQzdHLGlCQUFxQzs7UUFDckMsdUdBQXVHO1FBQ3ZHLE9BQU8sQ0FBQyxHQUFHLENBQUMsOERBQThELENBQUMsQ0FBQztRQUU1RSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLHVDQUF1QyxDQUFDO1lBQ3pELEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2xGLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUN6QixJQUFJLG9CQUFlLEVBQUUsQ0FDckIsQ0FBQztTQUNGO1FBRUQsa0hBQWtIO1FBRWxILE1BQU0sZ0JBQWdCLEdBQVEsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFXLEVBQUUsRUFBRTtZQUN4RSxPQUFPLENBQUMsTUFBTSxZQUFZLCtCQUFxQixDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLGdCQUFnQixJQUFJLElBQUk7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ3ZELHlHQUF5RztRQUN4RyxhQUFhLENBQUMsT0FBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSTtZQUM1QyxLQUFLLENBQUMsUUFBa0I7Z0JBQ3ZCLE1B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LEdBQUcsSUFBSSxLQUFLLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztLQUN6QjtTQUFNLElBQUksZUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzNCLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO0tBQzdCO1NBQU0sSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFO1FBQzdCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0MsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxNQUFNLEVBQUU7WUFDMUMsR0FBRyxJQUFJLE9BQU8sS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksQ0FBQztTQUN6QzthQUFNO1lBQ04sR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1NBQ3JDO0tBQ0Q7U0FBTTtRQUNOLEdBQUcsSUFBSSxVQUFVLENBQUM7S0FDbEI7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRCw0QkFBNEI7QUFFNUIsK0JBQStCO0FBQy9CLHlFQUF5RTtBQUN6RSx3REFBd0Q7QUFDeEQsUUFBUTtBQUNSLEtBQUs7QUFDTCxJQUFJIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2NvbmZpZy13ZWJwYWNrLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSBtYXgtbGluZS1sZW5ndGggbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbmltcG9ydCB7IEFuZ3VsYXJDb21waWxlclBsdWdpbiB9IGZyb20gJ0BuZ3Rvb2xzL3dlYnBhY2snO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGlzUmVnRXhwIH0gZnJvbSAndXRpbCc7XG5pbXBvcnQgKiBhcyB3ZWJwYWNrIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IFRTUmVhZEhvb2tlciBmcm9tICcuL25nLXRzLXJlcGxhY2UnO1xuaW1wb3J0IHsgQW5ndWxhckNsaVBhcmFtIH0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IENodW5rSW5mb1BsdWdpbiBmcm9tICcuL3BsdWdpbnMvY2h1bmstaW5mbyc7XG5pbXBvcnQgZ3ppcFNpemUgZnJvbSAnLi9wbHVnaW5zL2d6aXAtc2l6ZSc7XG5pbXBvcnQgSW5kZXhIdG1sUGx1Z2luIGZyb20gJy4vcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbic7XG5pbXBvcnQgUmVhZEhvb2tIb3N0IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdlcGFja0NvbmZpZ0hhbmRsZXIge1xuXHQvKiogQHJldHVybnMgd2VicGFjayBjb25maWd1cmF0aW9uIG9yIFByb21pc2UgKi9cblx0d2VicGFja0NvbmZpZyhvcmlnaW5hbENvbmZpZzogYW55KTogUHJvbWlzZTx7W25hbWU6IHN0cmluZ106IGFueX0gfCB2b2lkPiB8IHtbbmFtZTogc3RyaW5nXTogYW55fSB8IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZVdlYnBhY2tDb25maWcocGFyYW06IEFuZ3VsYXJDbGlQYXJhbSwgd2VicGFja0NvbmZpZzogd2VicGFjay5Db25maWd1cmF0aW9uLFxuXHRkcmNwQ29uZmlnU2V0dGluZzoge2Rldk1vZGU6IGJvb2xlYW59KSB7XG5cdC8vIGNvbnN0IGFwaTogdHlwZW9mIF9fYXBpID0gcmVxdWlyZSgnX19hcGknKTsgLy8gZm9yY2UgdG8gZGVmZXIgbG9hZGluZyBhcGkgdW50aWwgRFJDUCBjb25maWcgaXMgcmVhZHlcblx0Y29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+IGNoYW5nZVdlYnBhY2tDb25maWcgPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpO1xuXG5cdGlmIChfLmdldChwYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5kcmNwQXJncy5yZXBvcnQnKSB8fFxuXHRwYXJhbS5icm93c2VyT3B0aW9ucy5kcmNwQXJncy5yZXBvcnQgfHwocGFyYW0uYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3Mub3BlblJlcG9ydCkpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChcblx0XHRcdG5ldyBDaHVua0luZm9QbHVnaW4oKVxuXHRcdCk7XG5cdH1cblxuXHQvLyB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ub1BhcnNlID0gKGZpbGU6IHN0cmluZykgPT4gbm9QYXJzZS5zb21lKG5hbWUgPT4gZmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMobmFtZSkpO1xuXG5cdGNvbnN0IG5nQ29tcGlsZXJQbHVnaW46IGFueSA9IHdlYnBhY2tDb25maWcucGx1Z2lucy5maW5kKChwbHVnaW46IGFueSkgPT4ge1xuXHRcdHJldHVybiAocGx1Z2luIGluc3RhbmNlb2YgQW5ndWxhckNvbXBpbGVyUGx1Z2luKTtcblx0fSk7XG5cdGlmIChuZ0NvbXBpbGVyUGx1Z2luID09IG51bGwpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdDYW4gbm90IGZpbmQgQW5ndWxhckNvbXBpbGVyUGx1Z2luJyk7XG5cdC8vIGhhY2sgX29wdGlvbnMuaG9zdCBiZWZvcmUgYW5ndWxhci9wYWNrYWdlcy9uZ3Rvb2xzL3dlYnBhY2svc3JjL2FuZ3VsYXJfY29tcGlsZXJfcGx1Z2luLnRzIGFwcGx5KCkgcnVuc1xuXHQod2VicGFja0NvbmZpZy5wbHVnaW5zIGFzIGFueVtdKS51bnNoaWZ0KG5ldyBjbGFzcyB7XG5cdFx0YXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG5cdFx0XHRjb25zdCBob29rZXIgPSBuZXcgVFNSZWFkSG9va2VyKHBhcmFtKTtcblx0XHRcdChuZ0NvbXBpbGVyUGx1Z2luIGFzIGFueSkuX29wdGlvbnMuaG9zdCA9IG5ldyBSZWFkSG9va0hvc3QoKGNvbXBpbGVyIGFzIGFueSkuaW5wdXRGaWxlU3lzdGVtLCBob29rZXIuaG9va0Z1bmMpO1xuXHRcdFx0Y29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwUHJvbWlzZSgndHMtcmVhZC1ob29rJywgYXN5bmMgKCkgPT4ge1xuXHRcdFx0XHRob29rZXIuY2xlYXIoKTtcblx0XHRcdH0pO1xuXHRcdH1cblx0fSgpKTtcblxuXHQvLyBpZiAoXy5nZXQocGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG1yJykpXG5cdC8vIFx0d2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IEhvdE1vZHVsZVJlcGxhY2VtZW50UGx1Z2luKCkpO1xuXHRpZiAoIWRyY3BDb25maWdTZXR0aW5nLmRldk1vZGUpIHtcblx0XHRjb25zb2xlLmxvZygnQnVpbGQgaW4gcHJvZHVjdGlvbiBtb2RlJyk7XG5cdFx0d2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2gobmV3IGd6aXBTaXplKCkpO1xuXHR9XG5cblx0aWYgKHdlYnBhY2tDb25maWcudGFyZ2V0ICE9PSAnbm9kZScpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgSW5kZXhIdG1sUGx1Z2luKHtcblx0XHRcdFx0aW5kZXhGaWxlOiBQYXRoLnJlc29sdmUocGFyYW0uYnJvd3Nlck9wdGlvbnMuaW5kZXgpLFxuXHRcdFx0XHRpbmxpbmVDaHVua05hbWVzOiBbJ3J1bnRpbWUnXVxuXHRcdFx0fSkpO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFRoaXMgaXMgY29uZGl0aW9uIG9mIFNlcnZlciBzaWRlIHJlbmRlcmluZ1xuXHRcdC8vIFJlZmVyIHRvIGFuZ3VsYXItY2xpL3BhY2thZ2VzL2FuZ3VsYXJfZGV2a2l0L2J1aWxkX2FuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL21vZGVscy93ZWJwYWNrLWNvbmZpZ3Mvc2VydmVyLnRzXG5cdFx0aWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmJ1bmRsZURlcGVuZGVuY2llcyA9PT0gJ25vbmUnKSB7XG5cdFx0XHR3ZWJwYWNrQ29uZmlnLmV4dGVybmFscyA9IFtcblx0XHRcdCAgL15AYW5ndWxhci8sXG5cdFx0XHQgIChfOiBhbnksIHJlcXVlc3Q6IGFueSwgY2FsbGJhY2s6IChlcnJvcj86IGFueSwgcmVzdWx0PzogYW55KSA9PiB2b2lkKSA9PiB7XG5cdFx0XHRcdC8vIEFic29sdXRlICYgUmVsYXRpdmUgcGF0aHMgYXJlIG5vdCBleHRlcm5hbHNcblx0XHRcdFx0aWYgKC9eXFwuezAsMn1cXC8vLnRlc3QocmVxdWVzdCkgfHwgUGF0aC5pc0Fic29sdXRlKHJlcXVlc3QpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIGNhbGxiYWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHQvLyBBdHRlbXB0IHRvIHJlc29sdmUgdGhlIG1vZHVsZSB2aWEgTm9kZVxuXHRcdFx0XHRcdGNvbnN0IGUgPSByZXF1aXJlLnJlc29sdmUocmVxdWVzdCk7XG5cdFx0XHRcdFx0Y29uc3QgY29tcCA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShlKTtcblx0XHRcdFx0XHRpZiAoY29tcCA9PSBudWxsIHx8IGNvbXAuZHIgPT0gbnVsbCApIHtcblx0XHRcdFx0XHRcdC8vIEl0J3MgYSBub2RlX21vZHVsZVxuXHRcdFx0XHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVxdWVzdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIEl0J3MgYSBzeXN0ZW0gdGhpbmcgKC5pZSB1dGlsLCBmcy4uLilcblx0XHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdFx0Ly8gTm9kZSBjb3VsZG4ndCBmaW5kIGl0LCBzbyBpdCBtdXN0IGJlIHVzZXItYWxpYXNlZFxuXHRcdFx0XHRcdGNhbGxiYWNrKCk7XG5cdFx0XHRcdH1cblx0XHRcdCAgfVxuXHRcdFx0XTtcblx0XHQgIH1cblx0fVxuXHQvLyB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMucHVzaChuZXcgQ29tcGlsZURvbmVQbHVnaW4oKSk7XG5cblx0Y2hhbmdlU3BsaXRDaHVua3MocGFyYW0sIHdlYnBhY2tDb25maWcpO1xuXHRjaGFuZ2VMb2FkZXJzKHBhcmFtLCB3ZWJwYWNrQ29uZmlnKTtcblxuXHRpZiAocGFyYW0uc3NyKSB7XG5cdFx0d2VicGFja0NvbmZpZy5kZXZ0b29sID0gJ3NvdXJjZS1tYXAnO1xuXHR9XG5cblx0YXdhaXQgYXBpLmNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxXZXBhY2tDb25maWdIYW5kbGVyPigoZmlsZSwgbGFzdFJlc3VsdCwgaGFuZGxlcikgPT4ge1xuXHRcdGlmIChoYW5kbGVyLndlYnBhY2tDb25maWcpXG5cdFx0XHRyZXR1cm4gaGFuZGxlci53ZWJwYWNrQ29uZmlnKHdlYnBhY2tDb25maWcpO1xuXHRcdHJldHVybiBsYXN0UmVzdWx0O1xuXHR9KTtcblxuXHRjb25zdCB3Zm5hbWUgPSBgZGlzdC93ZWJwYWNrLSR7cGFyYW0uc3NyID8gJ3NzcicgOiAnYnJvd3Nlcid9LmNvbmZpZy5qc2A7XG5cdGZzLndyaXRlRmlsZVN5bmMod2ZuYW1lLCBwcmludENvbmZpZyh3ZWJwYWNrQ29uZmlnKSk7XG5cdGNvbnNvbGUubG9nKCdJZiB5b3UgYXJlIHdvbmRlcmluZyB3aGF0IGtpbmQgb2YgV2ViYXBjayBjb25maWcgZmlsZSBpcyB1c2VkIGludGVybmFsbHksIGNoZWNrb3V0ICcgKyB3Zm5hbWUpO1xuXHRyZXR1cm4gd2VicGFja0NvbmZpZztcbn1cblxuZnVuY3Rpb24gY2hhbmdlTG9hZGVycyhwYXJhbTogQW5ndWxhckNsaVBhcmFtLCB3ZWJwYWNrQ29uZmlnOiB3ZWJwYWNrLkNvbmZpZ3VyYXRpb24pIHtcblx0Y29uc3Qgbm9QYXJzZSA9IChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnYnVpbGRPcHRpbWl6ZXJFeGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG5ub1BhcnNlLnB1c2goLi4uYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2J1aWxkLW9wdGltaXplcjpleGNsdWRlJ10sIFtdKSBhcyBzdHJpbmdbXSk7XG5cblxuXHRjb25zdCBkZXZNb2RlID0gd2VicGFja0NvbmZpZy5tb2RlID09PSAnZGV2ZWxvcG1lbnQnO1xuXHRpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyID09IG51bGwpIHtcblx0XHR3ZWJwYWNrQ29uZmlnLnJlc29sdmVMb2FkZXIgPSB7fTtcblx0fVxuXHRpZiAod2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMgPT0gbnVsbCkge1xuXHRcdHdlYnBhY2tDb25maWcucmVzb2x2ZUxvYWRlci5tb2R1bGVzID0gW107XG5cdH1cblx0d2VicGFja0NvbmZpZy5yZXNvbHZlTG9hZGVyLm1vZHVsZXMudW5zaGlmdChQYXRoLmpvaW4oX19kaXJuYW1lLCAnbG9hZGVycycpKTtcblx0Y29uc3QgcnVsZXMgPSB3ZWJwYWNrQ29uZmlnLm1vZHVsZS5ydWxlcyBhcyB3ZWJwYWNrLlJ1bGVbXTtcblx0bGV0IGhhc1VybExvYWRlciA9IGZhbHNlO1xuXHRsZXQgZmlsZUxvYWRlclJ1bGVJZHg6IG51bWJlcjtcblx0cnVsZXMuZm9yRWFjaCgocnVsZSwgcnVsZUlkeCkgPT4ge1xuXHRcdGNvbnN0IHRlc3QgPSBydWxlLnRlc3Q7XG5cdFx0aWYgKHJ1bGUudXNlKSB7XG5cdFx0XHRjb25zdCBpZHggPSAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLmZpbmRJbmRleChydWxlU2V0ID0+IHJ1bGVTZXQubG9hZGVyID09PSAncG9zdGNzcy1sb2FkZXInKTtcblx0XHRcdGlmIChpZHggPj0gMCkge1xuXHRcdFx0XHQocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnNwbGljZShpZHggKyAxLCAwLCB7XG5cdFx0XHRcdFx0bG9hZGVyOiAnY3NzLXVybC1sb2FkZXInXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQvLyAocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0TG9hZGVyW10pLnB1c2goe2xvYWRlcjogJ2Nzcy11cmwtbG9hZGVyJ30pO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmpzJC8nICYmIHJ1bGUudXNlICYmXG5cdFx0XHQocnVsZS51c2UgYXMgd2VicGFjay5SdWxlU2V0VXNlSXRlbVtdKS5zb21lKChpdGVtKSA9PiAoaXRlbSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXIpLmxvYWRlciA9PT0gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1vcHRpbWl6ZXIvd2VicGFjay1sb2FkZXInKSkge1xuXHRcdFx0cnVsZS50ZXN0ID0gKHBhdGg6IHN0cmluZykgPT4ge1xuXHRcdFx0XHRpZiAoIS9cXC5qcyQvLnRlc3QocGF0aCkpXG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRyZXR1cm4gbm9QYXJzZS5ldmVyeSgoZXhjbHVkZSA9PiAhcGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJykuaW5jbHVkZXMoZXhjbHVkZSkpKTtcblx0XHRcdH07XG5cdFx0fVxuXHRcdGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmh0bWwkLycpIHtcblx0XHRcdE9iamVjdC5rZXlzKHJ1bGUpLmZvckVhY2goKGtleTogc3RyaW5nKSA9PiBkZWxldGUgKHJ1bGUgYXMgYW55KVtrZXldKTtcblx0XHRcdE9iamVjdC5hc3NpZ24ocnVsZSwge1xuXHRcdFx0XHR0ZXN0LFxuXHRcdFx0XHR1c2U6IFtcblx0XHRcdFx0XHR7bG9hZGVyOiAncmF3LWxvYWRlcid9LFxuXHRcdFx0XHRcdHtsb2FkZXI6ICduZy1odG1sLWxvYWRlcid9LCAvLyBSZXBsYWNlIGtleXdhcmQgYXNzZXRzOi8vIGluICpbc3JjfGhyZWZ8c3Jjc2V0fG5nLXNyY11cblx0XHRcdFx0XHQvLyB7bG9hZGVyOiAnQGRyL3RyYW5zbGF0ZS1nZW5lcmF0b3InfSxcblx0XHRcdFx0XHR7bG9hZGVyOiAnQGRyL3RlbXBsYXRlLWJ1aWxkZXInfVxuXHRcdFx0XHRdXG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKHJ1bGUubG9hZGVyID09PSAnZmlsZS1sb2FkZXInKSB7XG5cdFx0XHRmaWxlTG9hZGVyUnVsZUlkeCA9IHJ1bGVJZHg7XG5cdFx0XHQvLyBjb25zdCB0ZXN0ID0gcnVsZS50ZXN0O1xuXHRcdFx0Ly8gZmlsZUxvYWRlclRlc3QgPSB0ZXN0O1xuXHRcdFx0T2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCB7XG5cdFx0XHRcdHRlc3Q6IC9cXC4oZW90fHN2Z3xjdXJ8d2VicHxvdGZ8dHRmfHdvZmZ8d29mZjJ8YW5pKSQvLFxuXHRcdFx0XHR1c2U6IFt7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInfV1cblx0XHRcdH0pO1xuXG5cdFx0fSBlbHNlIGlmIChydWxlLmxvYWRlciA9PT0gJ3VybC1sb2FkZXInKSB7XG5cdFx0XHRoYXNVcmxMb2FkZXIgPSB0cnVlO1xuXHRcdFx0T2JqZWN0LmtleXMocnVsZSkuZm9yRWFjaCgoa2V5OiBzdHJpbmcpID0+IGRlbGV0ZSAocnVsZSBhcyBhbnkpW2tleV0pO1xuXHRcdFx0T2JqZWN0LmFzc2lnbihydWxlLCB7XG5cdFx0XHRcdHRlc3Q6IC9cXC4oanBnfHBuZ3xnaWYpJC8sXG5cdFx0XHRcdHVzZTogW3tcblx0XHRcdFx0XHRcdGxvYWRlcjogJ3VybC1sb2FkZXInLFxuXHRcdFx0XHRcdFx0b3B0aW9uczoge1xuXHRcdFx0XHRcdFx0XHRsaW1pdDogIWRldk1vZGUgPyAxMDAwMCA6IDEsIC8vIDwxMGsgLHVzZSBiYXNlNjQgZm9ybWF0LCBkZXYgbW9kZSBvbmx5IHVzZSB1cmwgZm9yIHNwZWVkXG5cdFx0XHRcdFx0XHRcdGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRdXG5cdFx0XHR9KTtcblx0XHR9IGVsc2UgaWYgKHRlc3QgaW5zdGFuY2VvZiBSZWdFeHAgJiYgdGVzdC50b1N0cmluZygpLmluZGV4T2YoJ1xcXFwuc2NzcycpID49IDAgJiYgcnVsZS51c2UpIHtcblx0XHRcdGNvbnN0IHVzZSA9IChydWxlLnVzZSBhcyBBcnJheTx7W2tleTogc3RyaW5nXTogYW55LCBsb2FkZXI6IHN0cmluZ30+KTtcblx0XHRcdGNvbnN0IGluc2VydElkeCA9IHVzZS5maW5kSW5kZXgoaXRlbSA9PiBpdGVtLmxvYWRlciA9PT0gJ3Nhc3MtbG9hZGVyJyk7XG5cdFx0XHRpZiAoaW5zZXJ0SWR4IDwgMCkge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3Nhc3MtbG9hZGVyIGlzIG5vdCBmb3VuZCcpO1xuXHRcdFx0fVxuXHRcdFx0Y29uc3QgbmVlZFNvdXJjZU1hcCA9IHVzZVtpbnNlcnRJZHhdLm9wdGlvbnMuc291cmNlTWFwO1xuXHRcdFx0Ly8gcmVzb2x2ZS11cmwtbG9hZGVyOiBcInNvdXJjZSBtYXBzIG11c3QgYmUgZW5hYmxlZCBvbiBhbnkgcHJlY2VkaW5nIGxvYWRlclwiXG5cdFx0XHQvLyBodHRwczovL2dpdGh1Yi5jb20vYmhvbGxvd2F5L3Jlc29sdmUtdXJsLWxvYWRlclxuXHRcdFx0dXNlW2luc2VydElkeF0ub3B0aW9ucy5zb3VyY2VNYXAgPSB0cnVlO1xuXHRcdFx0dXNlLnNwbGljZShpbnNlcnRJZHgsIDAsIHtcblx0XHRcdFx0bG9hZGVyOiAncmVzb2x2ZS11cmwtbG9hZGVyJyxcblx0XHRcdFx0b3B0aW9uczoge1xuXHRcdFx0XHRcdHNvdXJjZU1hcDogbmVlZFNvdXJjZU1hcFxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRcdC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG5cdFx0fSBlbHNlIGlmICh0ZXN0IGluc3RhbmNlb2YgUmVnRXhwICYmIHRlc3QudG9TdHJpbmcoKSA9PT0gJy9cXFxcLmxlc3MkLycgJiYgcnVsZS51c2UpIHtcblx0XHRcdGZvciAoY29uc3QgdXNlSXRlbSBvZiBydWxlLnVzZSBhcyB3ZWJwYWNrLlJ1bGVTZXRMb2FkZXJbXSkge1xuXHRcdFx0XHRpZiAodXNlSXRlbS5sb2FkZXIgPT09ICdsZXNzLWxvYWRlcicgJiYgXy5oYXModXNlSXRlbSwgJ29wdGlvbnMucGF0aHMnKSkge1xuXHRcdFx0XHRcdGRlbGV0ZSAodXNlSXRlbS5vcHRpb25zIGFzIGFueSkucGF0aHM7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdC8vIHJ1bGUudXNlLnB1c2goe2xvYWRlcjogJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvbGliL2RlYnVnLWxvYWRlcicsIG9wdGlvbnM6IHtpZDogJ2xlc3MgbG9hZGVycyd9fSk7XG5cdFx0fVxuXHR9KTtcblxuXHRpZiAoIWhhc1VybExvYWRlcikge1xuXHRcdGlmIChmaWxlTG9hZGVyUnVsZUlkeCA9PSBudWxsKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIGZpbGUtbG9hZGVyIHJ1bGUgZnJvbSBBbmd1bGFyXFwncyBXZWJwYWNrIGNvbmZpZycpO1xuXHRcdGNvbnNvbGUubG9nKCdJbnNlcnQgdXJsLWxvYWRlcicpO1xuXHRcdHJ1bGVzLnNwbGljZShmaWxlTG9hZGVyUnVsZUlkeCArIDEsIDAsIHtcblx0XHRcdHRlc3Q6IC9cXC4oanBnfHBuZ3xnaWYpJC8sXG5cdFx0XHR1c2U6IFt7XG5cdFx0XHRcdGxvYWRlcjogJ3VybC1sb2FkZXInLFxuXHRcdFx0XHRvcHRpb25zOiB7XG5cdFx0XHRcdFx0bGltaXQ6IDEwMDAwLCAvLyA8MTBrICx1c2UgYmFzZTY0IGZvcm1hdFxuXHRcdFx0XHRcdGZhbGxiYWNrOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9kaXN0L2xvYWRlcnMvZHItZmlsZS1sb2FkZXInXG5cdFx0XHRcdH1cblx0XHRcdH1dXG5cdFx0fSk7XG5cdH1cblx0aWYgKHBhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuXHRcdHJ1bGVzLnVuc2hpZnQoe1xuXHRcdFx0dGVzdDogL1xcLm5nZmFjdG9yeS5qcyQvLFxuXHRcdFx0dXNlOiBbe2xvYWRlcjogJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlcid9XVxuXHRcdH0pO1xuXHR9XG5cdHJ1bGVzLnVuc2hpZnQoXG5cdFx0e1xuXHRcdFx0dGVzdDogL1xcLmphZGUkLyxcblx0XHRcdHVzZTogW1xuXHRcdFx0XHR7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuXHRcdFx0XHR7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG5cdFx0XHRcdC8vIHtsb2FkZXI6ICdAZHIvdHJhbnNsYXRlLWdlbmVyYXRvcid9LFxuXHRcdFx0XHR7bG9hZGVyOiAnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9saWIvamFkZS10by1odG1sLWxvYWRlcid9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHR7XG5cdFx0XHR0ZXN0OiAvXFwubWQkLyxcblx0XHRcdHVzZTogW1xuXHRcdFx0XHR7bG9hZGVyOiAnaHRtbC1sb2FkZXInLCBvcHRpb25zOiB7YXR0cnM6ICdpbWc6c3JjJ319LFxuXHRcdFx0XHR7bG9hZGVyOiBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbG9hZGVycycsICduZy1odG1sLWxvYWRlcicpfSwgLy8gUmVwbGFjZSBrZXl3YXJkIGFzc2V0czovLyBpbiAqW3NyY3xocmVmfHNyY3NldHxuZy1zcmNdXG5cdFx0XHRcdHtsb2FkZXI6ICdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2xpYi9tYXJrZG93bi1sb2FkZXInfVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0dGVzdDogL1xcLnR4dCQvLFxuXHRcdFx0dXNlOiB7bG9hZGVyOiAncmF3LWxvYWRlcid9XG5cdFx0fSwge1xuXHRcdFx0dGVzdDogL1xcLih5YW1sfHltbCkkLyxcblx0XHRcdHVzZTogW1xuXHRcdFx0XHR7bG9hZGVyOiAnanNvbi1sb2FkZXInfSxcblx0XHRcdFx0e2xvYWRlcjogJ3lhbWwtbG9hZGVyJ31cblx0XHRcdF1cblx0XHR9XG5cdFx0Ly8ge1xuXHRcdC8vIFx0dGVzdDogbm90QW5ndWxhckpzLFxuXHRcdC8vIFx0dXNlOiBbYmFiZWwoKV1cblx0XHQvLyB9XG5cdCk7XG59XG5cbi8vIGZ1bmN0aW9uIG5vdEFuZ3VsYXJKcyhmaWxlOiBzdHJpbmcpIHtcbi8vIFx0aWYgKCFmaWxlLmVuZHNXaXRoKCcuanMnKSB8fCBmaWxlLmVuZHNXaXRoKCcubmdmYWN0b3J5LmpzJykgfHwgZmlsZS5lbmRzV2l0aCgnLm5nc3R5bGUuanMnKSlcbi8vIFx0XHRyZXR1cm4gZmFsc2U7XG4vLyBcdGlmIChub1BhcnNlLnNvbWUobmFtZSA9PiBmaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5pbmNsdWRlcyhuYW1lKSkpXG4vLyBcdFx0cmV0dXJuIGZhbHNlO1xuLy8gXHQvLyBjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcbi8vIFx0Ly8gaWYgKHBrICYmIHBrLmRyKSB7XG4vLyBcdC8vIFx0cmV0dXJuIHRydWU7XG4vLyBcdC8vIH1cbi8vIFx0Y29uc29sZS5sb2coJ2JhYmVsOiAnLCBmaWxlKTtcbi8vIFx0cmV0dXJuIHRydWU7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoYW5nZVNwbGl0Q2h1bmtzKHBhcmFtOiBBbmd1bGFyQ2xpUGFyYW0sIHdlYnBhY2tDb25maWc6IGFueSkge1xuXHRpZiAod2VicGFja0NvbmZpZy5vcHRpbWl6YXRpb24gPT0gbnVsbClcblx0XHRyZXR1cm47IC8vIFNTUicgV2VicGFjayBjb25maWcgZG9lcyBub3QgaGFzIHRoaXMgcHJvcGVydHlcblx0Y29uc3Qgb2xkVmVuZG9yVGVzdEZ1bmMgPSBfLmdldCh3ZWJwYWNrQ29uZmlnLCAnb3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzLnZlbmRvci50ZXN0Jyk7XG5cblx0aWYgKG9sZFZlbmRvclRlc3RGdW5jKSB7XG5cdFx0Y29uc3QgY2FjaGVHcm91cHM6IHtba2V5OiBzdHJpbmddOiB3ZWJwYWNrLk9wdGlvbnMuQ2FjaGVHcm91cHNPcHRpb25zfSA9IHdlYnBhY2tDb25maWcub3B0aW1pemF0aW9uLnNwbGl0Q2h1bmtzLmNhY2hlR3JvdXBzO1xuXHRcdGNhY2hlR3JvdXBzLnZlbmRvci50ZXN0ID0gdmVuZG9yVGVzdDtcblx0XHRjYWNoZUdyb3Vwcy5sYXp5VmVuZG9yID0ge1xuXHRcdFx0bmFtZTogJ2xhenktdmVuZG9yJyxcblx0XHRcdGNodW5rczogJ2FzeW5jJyxcblx0XHRcdGVuZm9yY2U6IHRydWUsXG5cdFx0XHR0ZXN0OiB2ZW5kb3JUZXN0LFxuXHRcdFx0cHJpb3JpdHk6IDFcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gdmVuZG9yVGVzdChtb2R1bGU6IGFueSwgY2h1bmtzOiBBcnJheTx7IG5hbWU6IHN0cmluZyB9Pikge1xuXHRcdGNvbnN0IG1heWJlVmVuZG9yID0gb2xkVmVuZG9yVGVzdEZ1bmMobW9kdWxlLCBjaHVua3MpO1xuXHRcdGlmICghbWF5YmVWZW5kb3IpXG5cdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0Y29uc3QgcmVzb3VyY2UgPSBtb2R1bGUubmFtZUZvckNvbmRpdGlvbiA/IG1vZHVsZS5uYW1lRm9yQ29uZGl0aW9uKCkgOiAnJztcblx0XHQvLyBjb25zb2xlLmxvZyhgdmVuZG9yIHRlc3QsIHJlc291cmNlOiAke3Jlc291cmNlfSwgY2h1bmtzOiAke2NodW5rcy5tYXAoIGMgPT4gYy5uYW1lKX1gKTtcblx0XHRjb25zdCBwayA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShyZXNvdXJjZSk7XG5cdFx0cmV0dXJuIHBrID09IG51bGwgfHwgcGsuZHIgPT0gbnVsbDtcblx0fVxufVxuXG5mdW5jdGlvbiBwcmludENvbmZpZyhjOiBhbnksIGxldmVsID0gMCk6IHN0cmluZyB7XG5cdHZhciBpbmRlbnQgPSBfLnJlcGVhdCgnICAnLCBsZXZlbCk7XG5cdHZhciBvdXQgPSAne1xcbic7XG5cdF8uZm9yT3duKGMsICh2YWx1ZTogYW55LCBwcm9wOiBzdHJpbmcpID0+IHtcblx0XHRvdXQgKz0gaW5kZW50ICsgYCAgJHtKU09OLnN0cmluZ2lmeShwcm9wKX06ICR7cHJpbnRDb25maWdWYWx1ZSh2YWx1ZSwgbGV2ZWwpfSxcXG5gO1xuXHR9KTtcblx0b3V0ICs9IGluZGVudCArICd9Jztcblx0cmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcHJpbnRDb25maWdWYWx1ZSh2YWx1ZTogYW55LCBsZXZlbDogbnVtYmVyKTogc3RyaW5nIHtcblx0dmFyIG91dCA9ICcnO1xuXHR2YXIgaW5kZW50ID0gXy5yZXBlYXQoJyAgJywgbGV2ZWwpO1xuXHRpZiAoXy5pc1N0cmluZyh2YWx1ZSkgfHwgXy5pc051bWJlcih2YWx1ZSkgfHwgXy5pc0Jvb2xlYW4odmFsdWUpKSB7XG5cdFx0b3V0ICs9IEpTT04uc3RyaW5naWZ5KHZhbHVlKSArICcnO1xuXHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG5cdFx0b3V0ICs9ICdbXFxuJztcblx0XHQodmFsdWUgYXMgYW55W10pLmZvckVhY2goKHJvdzogYW55KSA9PiB7XG5cdFx0XHRvdXQgKz0gaW5kZW50ICsgJyAgICAnICsgcHJpbnRDb25maWdWYWx1ZShyb3csIGxldmVsICsgMSk7XG5cdFx0XHRvdXQgKz0gJyxcXG4nO1xuXHRcdH0pO1xuXHRcdG91dCArPSBpbmRlbnQgKyAnICBdJztcblx0fSBlbHNlIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG5cdFx0b3V0ICs9IHZhbHVlLm5hbWUgKyAnKCknO1xuXHR9IGVsc2UgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuXHRcdG91dCArPSBgJHt2YWx1ZS50b1N0cmluZygpfWA7XG5cdH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkpIHtcblx0XHRjb25zdCBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih2YWx1ZSk7XG5cdFx0aWYgKHByb3RvICYmIHByb3RvLmNvbnN0cnVjdG9yICE9PSBPYmplY3QpIHtcblx0XHRcdG91dCArPSBgbmV3ICR7cHJvdG8uY29uc3RydWN0b3IubmFtZX0oKWA7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG91dCArPSBwcmludENvbmZpZyh2YWx1ZSwgbGV2ZWwgKyAxKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0b3V0ICs9ICcgdW5rbm93bic7XG5cdH1cblx0cmV0dXJuIG91dDtcbn1cblxuLy8gY2xhc3MgQ29tcGlsZURvbmVQbHVnaW4ge1xuXG4vLyBcdGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuLy8gXHRcdGNvbXBpbGVyLmhvb2tzLmRvbmUudGFwKCdkcmNwLWRldnNlcnZlci1idWlsZC13ZWJwYWNrJywgKHN0YXRzKSA9PiB7XG4vLyBcdFx0XHRhcGkuZXZlbnRCdXMuZW1pdCgnd2VicGFja0RvbmUnLCB7c3VjY2VzczogdHJ1ZX0pO1xuLy8gXHRcdH0pO1xuLy8gXHR9XG4vLyB9XG4iXX0=
