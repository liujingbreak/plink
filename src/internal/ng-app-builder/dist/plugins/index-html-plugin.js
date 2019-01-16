"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const { RawSource } = require('webpack-sources');
const ng_html_parser_1 = require("../utils/ng-html-parser");
const _ = tslib_1.__importStar(require("lodash"));
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const htmlLoader = require("../loaders/ng-html-loader");
const Path = tslib_1.__importStar(require("path"));
const smUrl = require('source-map-url');
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.index-html-plugin');
class MockLoaderContext {
    constructor(resourcePath) {
        this.resourcePath = resourcePath;
    }
    loadModule(path, callback) {
        callback(new Error(`index.html does not support requesting relative resource URL like ${path}.` +
            'only supports resource url in form of : <assets|page>://<package-name>/<resource>'));
    }
}
class IndexHtmlPlugin {
    constructor(options) {
        this.options = options;
        this.inlineChunkSet = new Set();
        this.indexOutputPath = Path.basename(this.options.indexFile);
        for (const name of options.inlineChunkNames) {
            this.inlineChunkSet.add(name);
        }
    }
    apply(compiler) {
        // compiler.hooks.watchRun.tapPromise('drcp-debug', async compiler => {
        // 	console.log('watch run ');
        // });
        compiler.hooks.emit.tapPromise('drcp-index-html-plugin', (compilation) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const htmlSrc = compilation.assets[this.indexOutputPath];
            let source = htmlSrc.source();
            const compile = _.template(source);
            source = compile({
                api: __api_1.default,
                require
            });
            source = yield htmlLoader.compileHtml(source, new MockLoaderContext(this.options.indexFile));
            const asts = new ng_html_parser_1.TemplateParser(source).parse();
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
                compilation.assets[this.indexOutputPath] = new RawSource(patch_text_1.default(source, this.replacements));
            }
            else {
                compilation.assets[this.indexOutputPath] = new RawSource(source);
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
