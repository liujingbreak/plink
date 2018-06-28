import { Compiler } from 'webpack';
const { RawSource } = require('webpack-sources');
import {TemplateParser} from '../utils/ng-html-parser';
import * as _ from 'lodash';
import replaceCode, {ReplacementInf} from '../utils/patch-text';
const smUrl = require('source-map-url');
import api from '__api';
const log = require('log4js').getLogger(api.packageName + '.index-html-plugin');

export interface IndexHtmlPluginOptions {
	indexHtml: string;
	inlineChunkNames: string[];
}

export default class IndexHtmlPlugin {
	inlineChunkSet = new Set();
	replacements: ReplacementInf[];

	constructor(public options: IndexHtmlPluginOptions) {
		for (let name of options.inlineChunkNames) {
			this.inlineChunkSet.add(name);
		}
	}
	apply(compiler: Compiler) {
		compiler.hooks.emit.tapPromise('drcp-index-html-plugin', async compilation => {
			let htmlSrc = compilation.assets[this.options.indexHtml];
			let source = htmlSrc.source();
			let asts = new TemplateParser(source).parse();
			for (let ast of asts) {
				if (ast.name.toLowerCase() === 'script' && ast.attrs) {
					let srcUrl = _.get(ast.attrs.src || ast.attrs.SRC, 'text');
					if (srcUrl == null)
						continue;
					let match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
					if (match && this.inlineChunkSet.has(match[1])) {
						this.replaceScriptTag(smUrl.removeFrom(compilation.assets[match[0]].source()), ast.start, ast.end);
						log.info(`Inline chunk "${match[1]}" in :`, this.options.indexHtml);
					}
				}
			}
			if (this.replacements) {
				compilation.assets[this.options.indexHtml] = new RawSource(
					replaceCode(source, this.replacements));
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
