"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHtml = void 0;
const tslib_1 = require("tslib");
const { RawSource } = require('webpack-sources');
const ng_html_parser_1 = tslib_1.__importDefault(require("../utils/ng-html-parser"));
const _ = tslib_1.__importStar(require("lodash"));
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const htmlLoader = require("../loaders/ng-html-loader");
const Path = tslib_1.__importStar(require("path"));
const smUrl = require('source-map-url');
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger(__api_1.default.packageName + '.index-html-plugin');
class MockLoaderContext {
    constructor() {
        this.resourcePath = ''; // To override super interface
    }
    loadModule(path, callback) {
        callback(new Error(`index.html does not support requesting relative resource URL like "${path}".` +
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
        compiler.hooks.emit.tapPromise('drcp-index-html-plugin', (compilation) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const htmlSrc = compilation.assets[this.indexOutputPath];
            let source = htmlSrc.source();
            source = yield transformHtml(source, { baseHref: this.options.baseHref }, (srcUrl) => {
                const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl);
                if (match && this.inlineChunkSet.has(match[1])) {
                    return smUrl.removeFrom(compilation.assets[match[0]].source());
                }
                return null;
            });
            compilation.assets[this.indexOutputPath] = new RawSource(source);
        }));
    }
}
exports.default = IndexHtmlPlugin;
function transformHtml(html, buildOptions, inlineReplace) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const compile = _.template(html);
        const replacements = [];
        html = compile({
            api: __api_1.default,
            require
        });
        // Following line must be prior to `TemplateParser.parse()`, TemplateParser
        // has limitation in parsing `<script>inline code ...</script>`
        html = yield htmlLoader.compileHtml(html, new MockLoaderContext());
        let hasBaseHref = false;
        const parsed = ng_html_parser_1.default(html);
        for (const comment of parsed.comments) {
            replacements.push({
                start: comment.pos,
                end: comment.end,
                text: ''
            });
        }
        for (const ast of parsed.tags) {
            const tagName = ast.name.toLowerCase();
            const attrs = ast.attrs;
            if (tagName === 'script' && attrs) {
                const srcUrl = _.get(attrs.src || attrs.SRC, 'value');
                if (srcUrl == null)
                    continue;
                const inlineContent = inlineReplace(srcUrl.text);
                if (inlineContent != null) {
                    replacements.push({
                        start: ast.start, end: ast.end, text: '<script>' + inlineContent
                    });
                    log.info(`Inline "${srcUrl.text}"`);
                }
            }
            else if (tagName === 'base') {
                hasBaseHref = true;
                if (!buildOptions.baseHref)
                    continue;
                const href = _.get(attrs, 'href.value.text');
                if (href !== buildOptions.baseHref) {
                    const baseHrefHtml = html.slice(ast.start, ast.end);
                    log.error(`In your index HTML, ${baseHrefHtml} is inconsistent to Angular cli configuration 'baseHref="${buildOptions.baseHref}"',\n` +
                        `you need to remove ${baseHrefHtml} from index HTML file, let Angular insert for you.`);
                }
            }
            // console.log(tagName, attrs);
        }
        if (!hasBaseHref && !buildOptions.baseHref) {
            const msg = 'There is neither <base href> tag in index HTML, nor Angular cli configuration "baseHref" being set';
            log.error('Error:', msg);
            throw new Error(msg);
        }
        if (replacements.length > 0) {
            html = patch_text_1.default(html, replacements);
        }
        // log.warn(html);
        return html;
    });
}
exports.transformHtml = transformHtml;

//# sourceMappingURL=index-html-plugin.js.map
