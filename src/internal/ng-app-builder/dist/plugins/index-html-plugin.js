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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC1odG1sLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS0EsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2pELDZFQUFnRDtBQUNoRCwwQ0FBNEI7QUFDNUIscUVBQWdFO0FBQ2hFLHdEQUF5RDtBQUN6RCwyQ0FBNkI7QUFDM0IsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUMsa0RBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO0FBUWhGLE1BQU0saUJBQWlCO0lBRXJCO1FBREEsaUJBQVksR0FBRyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7SUFDbEMsQ0FBQztJQUVoQixVQUFVLENBQUMsSUFBWSxFQUFFLFFBQTJFO1FBQ2hHLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxzRUFBc0UsSUFBSSxJQUFJO1lBQy9GLG1GQUFtRixDQUFDLENBQUMsQ0FBQztJQUM1RixDQUFDO0NBQ0Y7QUFFRCxNQUFxQixlQUFlO0lBSWxDLFlBQW1CLE9BQStCO1FBQS9CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBSGxELG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUlqQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3RCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FB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QUFDO0NBQUE7QUE1REQsc0NBNERDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgIG1heC1jbGFzc2VzLXBlci1maWxlICovXG4vKipcbiAqIFNhbWUgZnVuY3Rpb24gYXMgcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbiwgYnV0IGRvZXMgbm90IHJlbHkgb24gSHRtbFdlYnBhY2tQbHVnaW5cbiAqL1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IHsgUmF3U291cmNlIH0gPSByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKTtcbmltcG9ydCBwYXJzZUh0bWwgZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGh0bWxMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuICBjb25zdCBzbVVybCA9IHJlcXVpcmUoJ3NvdXJjZS1tYXAtdXJsJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmluZGV4LWh0bWwtcGx1Z2luJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5kZXhIdG1sUGx1Z2luT3B0aW9ucyB7XG4gIGluZGV4RmlsZTogc3RyaW5nO1xuICBpbmxpbmVDaHVua05hbWVzOiBzdHJpbmdbXTtcbiAgYmFzZUhyZWY/OiBzdHJpbmc7XG59XG5cbmNsYXNzIE1vY2tMb2FkZXJDb250ZXh0IHtcbiAgcmVzb3VyY2VQYXRoID0gJyc7IC8vIFRvIG92ZXJyaWRlIHN1cGVyIGludGVyZmFjZVxuICBjb25zdHJ1Y3RvcigpIHt9XG5cbiAgbG9hZE1vZHVsZShwYXRoOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgc291cmNlPzogYW55LCBzb3VyY2VNYXA/OiBhbnksIG1vZHVsZT86IGFueSkgPT4gdm9pZCkge1xuICAgICAgY2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSBcIiR7cGF0aH1cIi5gICtcbiAgICAgICAgJ29ubHkgc3VwcG9ydHMgcmVzb3VyY2UgdXJsIGluIGZvcm0gb2YgOiA8YXNzZXRzfHBhZ2U+Oi8vPHBhY2thZ2UtbmFtZT4vPHJlc291cmNlPicpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleEh0bWxQbHVnaW4ge1xuICBpbmxpbmVDaHVua1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBpbmRleE91dHB1dFBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgb3B0aW9uczogSW5kZXhIdG1sUGx1Z2luT3B0aW9ucykge1xuICAgIHRoaXMuaW5kZXhPdXRwdXRQYXRoID0gUGF0aC5iYXNlbmFtZSh0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3B0aW9ucy5pbmxpbmVDaHVua05hbWVzKSB7XG4gICAgICB0aGlzLmlubGluZUNodW5rU2V0LmFkZChuYW1lKTtcbiAgICB9XG4gIH1cbiAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWluZGV4LWh0bWwtcGx1Z2luJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgY29uc3QgaHRtbFNyYyA9IGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF07XG4gICAgICBsZXQgc291cmNlOiBzdHJpbmcgPSBodG1sU3JjLnNvdXJjZSgpO1xuICAgICAgc291cmNlID0gYXdhaXQgdHJhbnNmb3JtSHRtbChzb3VyY2UsIHtiYXNlSHJlZjogdGhpcy5vcHRpb25zLmJhc2VIcmVmfSwgKHNyY1VybCkgPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgdGhpcy5pbmxpbmVDaHVua1NldC5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgcmV0dXJuIHNtVXJsLnJlbW92ZUZyb20oY29tcGlsYXRpb24uYXNzZXRzW21hdGNoWzBdXS5zb3VyY2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KTtcblxuICAgICAgY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXSA9IG5ldyBSYXdTb3VyY2Uoc291cmNlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJhbnNmb3JtSHRtbCh0aGlzOiB2b2lkLFxuICBodG1sOiBzdHJpbmcsXG4gIGJ1aWxkT3B0aW9uczoge2Jhc2VIcmVmPzogc3RyaW5nfSxcbiAgaW5saW5lUmVwbGFjZTogKHNyY1VybDogc3RyaW5nKSA9PiBzdHJpbmcgfCBudWxsIHwgdm9pZCkge1xuXG4gIGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKGh0bWwpO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgaHRtbCA9IGNvbXBpbGUoe1xuICAgIGFwaSxcbiAgICByZXF1aXJlXG4gIH0pO1xuICAvLyBGb2xsb3dpbmcgbGluZSBtdXN0IGJlIHByaW9yIHRvIGBUZW1wbGF0ZVBhcnNlci5wYXJzZSgpYCwgVGVtcGxhdGVQYXJzZXJcbiAgLy8gaGFzIGxpbWl0YXRpb24gaW4gcGFyc2luZyBgPHNjcmlwdD5pbmxpbmUgY29kZSAuLi48L3NjcmlwdD5gXG4gIGh0bWwgPSBhd2FpdCBodG1sTG9hZGVyLmNvbXBpbGVIdG1sKGh0bWwsIG5ldyBNb2NrTG9hZGVyQ29udGV4dCgpKTtcbiAgbGV0IGhhc0Jhc2VIcmVmID0gZmFsc2U7XG4gIGNvbnN0IHBhcnNlZCA9IHBhcnNlSHRtbChodG1sKTtcbiAgZm9yIChjb25zdCBjb21tZW50IG9mIHBhcnNlZC5jb21tZW50cykge1xuICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHN0YXJ0OiBjb21tZW50LnBvcyxcbiAgICAgIGVuZDogY29tbWVudC5lbmQsXG4gICAgICB0ZXh0OiAnJ1xuICAgIH0pO1xuICB9XG4gIGZvciAoY29uc3QgYXN0IG9mIHBhcnNlZC50YWdzKSB7XG4gICAgY29uc3QgdGFnTmFtZSA9IGFzdC5uYW1lLnRvTG93ZXJDYXNlKCk7XG4gICAgY29uc3QgYXR0cnMgPSBhc3QuYXR0cnM7XG4gICAgaWYgKHRhZ05hbWUgPT09ICdzY3JpcHQnICYmIGF0dHJzKSB7XG4gICAgICBjb25zdCBzcmNVcmwgPSBfLmdldChhdHRycy5zcmMgfHwgYXR0cnMuU1JDLCAndmFsdWUnKTtcbiAgICAgIGlmIChzcmNVcmwgPT0gbnVsbClcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBpbmxpbmVDb250ZW50ID0gaW5saW5lUmVwbGFjZShzcmNVcmwudGV4dCk7XG4gICAgICBpZiAoaW5saW5lQ29udGVudCAhPSBudWxsKSB7XG4gICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICBzdGFydDogYXN0LnN0YXJ0LCBlbmQ6IGFzdC5lbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBpbmxpbmVDb250ZW50XG4gICAgICAgIH0pO1xuICAgICAgICBsb2cuaW5mbyhgSW5saW5lIFwiJHtzcmNVcmwudGV4dH1cImApO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodGFnTmFtZSA9PT0gJ2Jhc2UnKSB7XG4gICAgICBoYXNCYXNlSHJlZiA9IHRydWU7XG4gICAgICBpZiAoIWJ1aWxkT3B0aW9ucy5iYXNlSHJlZilcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBocmVmOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBfLmdldDxhbnksIGFueT4oYXR0cnMsICdocmVmLnZhbHVlLnRleHQnKTtcbiAgICAgIGlmIChocmVmICE9PSBidWlsZE9wdGlvbnMuYmFzZUhyZWYhKSB7XG4gICAgICAgIGNvbnN0IGJhc2VIcmVmSHRtbCA9IGh0bWwuc2xpY2UoYXN0LnN0YXJ0LCBhc3QuZW5kKTtcbiAgICAgICAgbG9nLmVycm9yKGBJbiB5b3VyIGluZGV4IEhUTUwsICR7YmFzZUhyZWZIdG1sfSBpcyBpbmNvbnNpc3RlbnQgdG8gQW5ndWxhciBjbGkgY29uZmlndXJhdGlvbiAnYmFzZUhyZWY9XCIke2J1aWxkT3B0aW9ucy5iYXNlSHJlZn1cIicsXFxuYCArXG4gICAgICAgICAgYHlvdSBuZWVkIHRvIHJlbW92ZSAke2Jhc2VIcmVmSHRtbH0gZnJvbSBpbmRleCBIVE1MIGZpbGUsIGxldCBBbmd1bGFyIGluc2VydCBmb3IgeW91LmApO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyh0YWdOYW1lLCBhdHRycyk7XG4gIH1cbiAgaWYgKCFoYXNCYXNlSHJlZiAmJiAhYnVpbGRPcHRpb25zLmJhc2VIcmVmKSB7XG4gICAgY29uc3QgbXNnID0gJ1RoZXJlIGlzIG5laXRoZXIgPGJhc2UgaHJlZj4gdGFnIGluIGluZGV4IEhUTUwsIG5vciBBbmd1bGFyIGNsaSBjb25maWd1cmF0aW9uIFwiYmFzZUhyZWZcIiBiZWluZyBzZXQnO1xuICAgIGxvZy5lcnJvcignRXJyb3I6JywgbXNnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgfVxuICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApIHtcbiAgICBodG1sID0gcmVwbGFjZUNvZGUoaHRtbCwgcmVwbGFjZW1lbnRzKTtcbiAgfVxuICAvLyBsb2cud2FybihodG1sKTtcbiAgcmV0dXJuIGh0bWw7XG59XG4iXX0=