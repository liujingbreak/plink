/* tslint:disable max-classes-per-file */
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
		callback(new Error(`index.html does not support requesting relative resource URL like ${path}.` +
			'only supports resource url in form of : <assets|page>://<package-name>/<resource>'));
	}
}

export default class IndexHtmlPlugin {
	inlineChunkSet = new Set();
	replacements: ReplacementInf[];
	indexOutputPath: string;

	constructor(public options: IndexHtmlPluginOptions) {
		this.indexOutputPath = Path.basename(this.options.indexFile);
		for (const name of options.inlineChunkNames) {
			this.inlineChunkSet.add(name);
		}
	}
	apply(compiler: Compiler) {
		compiler.hooks.emit.tapPromise('drcp-index-html-plugin', async compilation => {
			const htmlSrc = compilation.assets[this.indexOutputPath];
			let source: string = htmlSrc.source();
			const compile = _.template(source);
			source = compile({
				api,
				require
			});
			source = await htmlLoader.compileHtml(source, new MockLoaderContext(this.options.indexFile) as any);
			const asts = new TemplateParser(source).parse();
			for (const ast of asts) {
				if (ast.name.toLowerCase() === 'script' && ast.attrs) {
					const srcUrl = _.get(ast.attrs.src || ast.attrs.SRC, 'text');
					if (srcUrl == null)
						continue;
					const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
					if (match && this.inlineChunkSet.has(match[1])) {
						this.replaceScriptTag(smUrl.removeFrom(compilation.assets[match[0]].source()), ast.start, ast.end);
						log.info(`Inline chunk "${match[1]}" in :`, this.options.indexFile);
					}
				}
			}
			if (this.replacements) {
				compilation.assets[this.indexOutputPath] = new RawSource(
					replaceCode(source, this.replacements));
			} else {
				compilation.assets[this.indexOutputPath] = new RawSource(source);
			}
		});
	}

	replaceScriptTag(src: string, start: number, end: number) {
		if (this.replacements == null)
			this.replacements = [];
		this.replacements.push({
			start, end, text: '<script>' + src
		});
	}
}
