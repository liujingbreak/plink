"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console max-line-length */
const chunk_info_1 = require("./plugins/chunk-info");
const gzip_size_1 = require("./plugins/gzip-size");
const index_html_plugin_1 = require("./plugins/index-html-plugin");
const _ = require("lodash");
const fs = require("fs");
const util_1 = require("util");
const Path = require("path");
const webpack_1 = require("webpack");
const __api_1 = require("__api");
const { babel } = require('@dr-core/webpack2-builder/configs/loader-config');
// const log = require('log4js').getLogger('ng-app-builder.config-webpack');
function changeWebpackConfig(param, webpackConfig, drcpConfig) {
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
    if (_.get(param, 'builderConfig.options.hmr'))
        webpackConfig.plugins.push(new webpack_1.HotModuleReplacementPlugin());
    if (!drcpConfig.devMode) {
        console.log('Build in production mode');
        webpackConfig.plugins.push(new gzip_size_1.default());
    }
    if (webpackConfig.target !== 'node') {
        webpackConfig.plugins.push(new index_html_plugin_1.default({
            indexHtml: Path.basename(param.browserOptions.index),
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
                        let comp = __api_1.default.findPackageByFile(e);
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
    let wfname = `dist/webpack-${param.ssr ? 'ssr' : 'browser'}.config.js`;
    fs.writeFileSync(wfname, printConfig(webpackConfig));
    console.log('If you are wondering what kind of Webapck config file is used internally, checkout ' + wfname);
    return webpackConfig;
}
exports.default = changeWebpackConfig;
function changeLoaders(webpackConfig) {
    const devMode = webpackConfig.mode === 'development';
    webpackConfig.resolveLoader = {
        modules: ['node_modules']
    };
    webpackConfig.module.rules.forEach((rule) => {
        const test = rule.test;
        if (test instanceof RegExp && test.toString() === '/\\.html$/') {
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test,
                use: [
                    { loader: 'raw-loader' },
                    { loader: Path.resolve(__dirname, 'loaders', 'ng-html-loader') },
                    // {loader: '@dr/translate-generator'},
                    { loader: '@dr/template-builder' }
                ]
            });
        }
        else if (rule.loader === 'file-loader') {
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test: /\.(eot|woff2|woff|ttf|svg|cur)$/,
                use: [{ loader: 'lib/dr-file-loader' }]
            });
        }
        else if (rule.loader === 'url-loader') {
            Object.keys(rule).forEach((key) => delete rule[key]);
            Object.assign(rule, {
                test,
                use: [{
                        loader: 'url-loader',
                        options: {
                            limit: !devMode ? 10000 : 1,
                            fallback: '@dr-core/webpack2-builder/lib/dr-file-loader'
                        }
                    }
                ]
            });
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
    webpackConfig.module.rules.unshift({
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
    }, {
        test: isDrJs,
        use: [babel()]
    });
}
function isDrJs(file) {
    if (!file.endsWith('.js') || file.endsWith('.ngfactory.js') || file.endsWith('.ngstyle.js'))
        return false;
    const pk = __api_1.default.findPackageByFile(file);
    if (pk && pk.dr) {
        // log.warn('js file', file);
        return true;
    }
    return false;
}
function changeSplitChunks(param, webpackConfig) {
    if (webpackConfig.optimization == null)
        return; // SSR' Webpack config does not has this property
    const oldVendorTestFunc = _.get(webpackConfig, 'optimization.splitChunks.cacheGroups.vendor.test');
    function vendorTest(module, chunks) {
        const maybeVendor = oldVendorTestFunc(module, chunks);
        if (!maybeVendor)
            return false;
        const resource = module.nameForCondition ? module.nameForCondition() : '';
        const pk = __api_1.default.findPackageByFile(resource);
        return pk == null || pk.dr == null;
    }
    if (oldVendorTestFunc) {
        webpackConfig.optimization.splitChunks.cacheGroups.vendor.test = vendorTest;
        webpackConfig.optimization.splitChunks.cacheGroups.lazyVendor = {
            name: 'lazy-vendor',
            chunks: 'async',
            enforce: true,
            test: vendorTest
        };
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

//# sourceMappingURL=config-webpack.js.map
