"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHtml = void 0;
const { RawSource } = require('webpack-sources');
const ng_html_parser_1 = __importDefault(require("../utils/ng-html-parser"));
const _ = __importStar(require("lodash"));
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const htmlLoader = require("../loaders/ng-html-loader");
const Path = __importStar(require("path"));
const smUrl = require('source-map-url');
const __api_1 = __importDefault(require("__api"));
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
        compiler.hooks.emit.tapPromise('drcp-index-html-plugin', (compilation) => __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFLQSxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDakQsNkVBQWdEO0FBQ2hELDBDQUE0QjtBQUM1QixxRUFBZ0U7QUFDaEUsd0RBQXlEO0FBQ3pELDJDQUE2QjtBQUMzQixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUMxQyxrREFBd0I7QUFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLG9CQUFvQixDQUFDLENBQUM7QUFRaEYsTUFBTSxpQkFBaUI7SUFFckI7UUFEQSxpQkFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDLDhCQUE4QjtJQUNsQyxDQUFDO0lBRWhCLFVBQVUsQ0FBQyxJQUFZLEVBQUUsUUFBMkU7UUFDaEcsUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLHNFQUFzRSxJQUFJLElBQUk7WUFDL0YsbUZBQW1GLENBQUMsQ0FBQyxDQUFDO0lBQzVGLENBQUM7Q0FDRjtBQUVELE1BQXFCLGVBQWU7SUFJbEMsWUFBbUIsT0FBK0I7UUFBL0IsWUFBTyxHQUFQLE9BQU8sQ0FBd0I7UUFIbEQsbUJBQWMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBSWpDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFO1lBQzNDLElBQUksQ0FBQyxjQUFjLENBQUMs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
