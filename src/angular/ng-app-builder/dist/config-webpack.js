"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-console */
const chunk_info_1 = require("./plugins/chunk-info");
const gzip_size_1 = require("./plugins/gzip-size");
const _ = require("lodash");
const webpack = require('webpack');
function changeWebpackConfig(param, webpackConfig, drcpConfig) {
    // const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
    if (param.browserOptions.drcpArgs.report || (param.browserOptions.drcpArgs.openReport)) {
        // webpackConfig.plugins.unshift(new BundleAnalyzerPlugin({
        // 	analyzerMode: 'static',
        // 	reportFilename: 'bundle-report.html',
        // 	openAnalyzer: options.drcpArgs.openReport
        // }));
        webpackConfig.plugins.push(new chunk_info_1.default());
    }
    if (_.get(param, 'builderConfig.options.hmr'))
        webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
    if (!drcpConfig.devMode) {
        console.log('Build in production mode');
        webpackConfig.plugins.push(new gzip_size_1.default());
    }
    return webpackConfig;
}
exports.default = changeWebpackConfig;

//# sourceMappingURL=config-webpack.js.map
