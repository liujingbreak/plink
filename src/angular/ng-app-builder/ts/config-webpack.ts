/* tslint:disable no-console */
import ChunkInfoPlugin from './plugins/chunk-info';
import gzipSize from './plugins/gzip-size';
import {AngularCliParam} from './ng/common';
import * as _ from 'lodash';
const webpack = require('webpack');

export default function changeWebpackConfig(param: AngularCliParam, webpackConfig: any, drcpConfig: any): any {
	// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
	console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
	if (param.browserOptions.drcpArgs.report ||(param.browserOptions.drcpArgs.openReport)) {
		// webpackConfig.plugins.unshift(new BundleAnalyzerPlugin({
		// 	analyzerMode: 'static',
		// 	reportFilename: 'bundle-report.html',
		// 	openAnalyzer: options.drcpArgs.openReport
		// }));
		webpackConfig.plugins.push(
			new ChunkInfoPlugin()
		);
	}
	if (_.get(param, 'builderConfig.options.hmr'))
		webpackConfig.plugins.push(new webpack.HotModuleReplacementPlugin());
	if (!drcpConfig.devMode) {
		console.log('Build in production mode');
		webpackConfig.plugins.push(new gzipSize());
	}
	return webpackConfig;
}
