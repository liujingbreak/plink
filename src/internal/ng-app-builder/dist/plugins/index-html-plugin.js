"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { RawSource } = require('webpack-sources');
const ng_html_parser_1 = require("../utils/ng-html-parser");
const _ = require("lodash");
const patch_text_1 = require("../utils/patch-text");
const smUrl = require('source-map-url');
const __api_1 = require("__api");
const log = require('log4js').getLogger(__api_1.default.packageName + '.index-html-plugin');
class IndexHtmlPlugin {
    constructor(options) {
        this.options = options;
        this.inlineChunkSet = new Set();
        for (const name of options.inlineChunkNames) {
            this.inlineChunkSet.add(name);
        }
    }
    apply(compiler) {
        compiler.hooks.emit.tapPromise('drcp-index-html-plugin', (compilation) => __awaiter(this, void 0, void 0, function* () {
            const htmlSrc = compilation.assets[this.options.indexHtml];
            const source = htmlSrc.source();
            const asts = new ng_html_parser_1.TemplateParser(source).parse();
            for (const ast of asts) {
                if (ast.name.toLowerCase() === 'script' && ast.attrs) {
                    const srcUrl = _.get(ast.attrs.src || ast.attrs.SRC, 'text');
                    if (srcUrl == null)
                        continue;
                    const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
                    if (match && this.inlineChunkSet.has(match[1])) {
                        this.replaceScriptTag(smUrl.removeFrom(compilation.assets[match[0]].source()), ast.start, ast.end);
                        log.info(`Inline chunk "${match[1]}" in :`, this.options.indexHtml);
                    }
                }
            }
            if (this.replacements) {
                compilation.assets[this.options.indexHtml] = new RawSource(patch_text_1.default(source, this.replacements));
            }
        }));
    }
    replaceScriptTag(src, start, end) {
        if (this.replacements == null)
            this.replacements = [];
        this.replacements.push({
            start, end, text: '<script>' + src
        });
    }
}
exports.default = IndexHtmlPlugin;

//# sourceMappingURL=index-html-plugin.js.map
