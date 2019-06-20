/* tslint:disable max-classes-per-file */
/**
 * Same function as react-dev-utils/InlineChunkHtmlPlugin, but does not rely on HtmlWebpackPlugin
 */
import { Compiler } from 'webpack';
const { RawSource } = require('webpack-sources');
import {TemplateParser} from '../utils/ng-html-parser';
import * as _ from 'lodash';
import replaceCode, {ReplacementInf} from '../utils/patch-text';
import htmlLoader = require('../loaders/ng-html-loader');
import * as Path from 'path';
const smUrl = require('source-map-url');
import api from '__api';
const log = require('log4js').getLogger(api.packageName + '.index-html-plugin');

export interface IndexHtmlPluginOptions {
	indexFile: string;
	inlineChunkNames: string[];
}

class MockLoaderContext {
	constructor(public resourcePath: string) {}

	loadModule(path: string, callback: (err: Error, source?: any, sourceMap?: any, module?: any) => void) {
		callback(new Error(`index.html does not support requesting relative resource URL like "${path}".` +
			'only supports resource url in form of : <assets|page>://<package-name>/<resource>'));
	}
}

export default class IndexHtmlPlugin {
	inlineChunkSet = new Set();
	indexOutputPath: string;

	constructor(public options: IndexHtmlPluginOptions) {
		this.indexOutputPath = Path.basename(this.options.indexFile);
		for (const name of options.inlineChunkNames) {
			this.inlineChunkSet.add(name);
		}
	}
	apply(compiler: Compiler) {
		// compiler.hooks.watchRun.tapPromise('drcp-debug', async compiler => {
		// 	console.log('watch run ');
		// });
		compiler.hooks.emit.tapPromise('drcp-index-html-plugin', async compilation => {
			const htmlSrc = compilation.assets[this.indexOutputPath];
			let source: string = htmlSrc.source();
			const compile = _.template(source);
			const replacements: ReplacementInf[] = [];
			source = compile({
				api,
				require
			});
			source = await htmlLoader.compileHtml(source, new MockLoaderContext(this.options.indexFile) as any);
			const asts = new TemplateParser(source).parse();
			for (const ast of asts) {
				if (ast.name.toLowerCase() === 'script' && ast.attrs) {
					const srcUrl = _.get(ast.attrs.src || ast.attrs.SRC, 'value');
					if (srcUrl == null)
						continue;
					// log.warn('srcUrl', srcUrl.text);
					const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl.text);
					if (match && this.inlineChunkSet.has(match[1])) {
						replacements.push({
							start: ast.start, end: ast.end, text: '<script>' + smUrl.removeFrom(compilation.assets[match[0]].source())
						});
						log.info(`Inline chunk "${match[1]}" in :`, this.options.indexFile);
					}
				}
			}
			if (replacements.length > 0) {
				compilation.assets[this.indexOutputPath] = new RawSource(
					replaceCode(source, replacements));
			} else {
				compilation.assets[this.indexOutputPath] = new RawSource(source);
			}
		});
	}

	// replaceScriptTag(replacements: ReplacementInf[], src: string, start: number, end: number) {
	// 	replacements.push({
	// 		start, end, text: '<script>' + src
	// 	});
	// }
}
