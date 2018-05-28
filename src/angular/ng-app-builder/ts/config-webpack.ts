/* tslint:disable no-console */
import ChunkInfoPlugin from './plugins/chunk-info';
/* tslint:disable max-line-length */
import gzipSize from './plugins/gzip-size';
import {AngularCliParam} from './ng/common';
import * as _ from 'lodash';
import * as fs from 'fs';
import { isRegExp } from 'util';
import * as Path from 'path';
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

	changeLoaders(webpackConfig);
	fs.writeFileSync('dist/ng-webpack-config.js', printConfig(webpackConfig));
	console.log('If you are wondering what kind of Webapck config file is used internally, checkout dist/ng-webpack-config.js');
	return webpackConfig;
}

function changeLoaders(webpackConfig: any) {
	let devMode = webpackConfig.mode === 'development';
	webpackConfig.resolveLoader = {
		modules: [Path.dirname(require.resolve('@dr-core/webpack2-builder/package.json')), 'node_modules']
	};
	webpackConfig.module.rules.forEach((rule: any) => {
		let test = rule.test;
		if (rule.test instanceof RegExp && rule.test.toString() === '/\\.html$/') {
			Object.keys(rule).forEach((key: string) => delete rule[key]);
			Object.assign(rule, {
				test,
				use: [
					{loader: 'raw-loader'},
					// {loader: 'html-loader', options: {attrs: 'img:src'}},
					{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
					// {loader: '@dr/translate-generator'},
					{loader: '@dr/template-builder'}
				]
			});
		} else if (rule.loader === 'file-loader') {
			Object.keys(rule).forEach((key: string) => delete rule[key]);
			Object.assign(rule, {
				test: /\.(eot|woff2|woff|ttf|svg|cur)$/,
				use: [{loader: 'lib/dr-file-loader'}]
			});
		} else if (rule.loader === 'url-loader') {
			Object.keys(rule).forEach((key: string) => delete rule[key]);
			Object.assign(rule, {
				test,
				use: [{
						loader: 'url-loader',
						options: {
							limit: !devMode ? 10000 : 1 // <10k ,use base64 format, dev mode only use url for speed
						}
					}
				]
			});
		}
	});
	webpackConfig.module.rules.unshift({
			test: /\.jade$/,
			use: [
				{loader: 'html-loader', options: {attrs: 'img:src'}},
				{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
				// {loader: '@dr/translate-generator'},
				{loader: 'lib/jade-to-html-loader'}
			]
		},
		{
			test: /\.md$/,
			use: [
				{loader: 'html-loader', options: {attrs: 'img:src'}},
				{loader: 'lib/html-loader'}, // Replace keyward assets:// in *[src|href|srcset|ng-src]
				{loader: 'lib/markdown-loader'}
			]
		},
		{
			test: /\.txt$/,
			use: {loader: 'raw-loader'}
		}, {
			test: /\.(yaml|yml)$/,
			use: [
				{loader: 'json-loader'},
				{loader: 'yaml-loader'}
			]
		}
	);
}

function printConfig(c: any, level = 0): string {
	var indent = _.repeat('  ', level);
	var out = '{\n';
	_.forOwn(c, (value: any, prop: string) => {
		out += indent + `  ${JSON.stringify(prop)}: ${printConfigValue(value, level)},\n`;
	});
	out += indent + '}';
	return out;
}

function printConfigValue(value: any, level: number): string {
	var out = '';
	var indent = _.repeat('  ', level);
	if (_.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
		out += JSON.stringify(value) + '';
	} else if (Array.isArray(value)) {
		out += '[\n';
		(value as any[]).forEach((row: any) => {
			out += indent + '    ' + printConfigValue(row, level + 1);
			out += ',\n';
		});
		out += indent + '  ]';
	} else if (_.isFunction(value)) {
		out += value.name + '()';
	} else if (isRegExp(value)) {
		out += `${value.toString()}`;
	} else if (_.isObject(value)) {
		let proto = Object.getPrototypeOf(value);
		if (proto && proto.constructor !== Object) {
			out += `new ${proto.constructor.name}()`;
		} else {
			out += printConfig(value, level + 1);
		}
	} else {
		out += ' unknown';
	}
	return out;
}
