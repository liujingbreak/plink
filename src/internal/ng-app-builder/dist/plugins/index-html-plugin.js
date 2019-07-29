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
        const asts = new ng_html_parser_1.TemplateParser(html).parse();
        for (const ast of asts) {
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
            else if (buildOptions.baseHref && tagName === 'base') {
                const href = _.get(attrs, 'href.value.text');
                if (href !== buildOptions.baseHref) {
                    const baseHrefHtml = html.slice(ast.start, ast.end);
                    log.error(`In your index HTML, ${baseHrefHtml} is inconsistent to Angular cli configuration 'baseHref="${buildOptions.baseHref}"',\n` +
                        `you need to remove ${baseHrefHtml} from index HTML file, let Angular insert for you.`);
                }
            }
            // console.log(tagName, attrs);
        }
        if (replacements.length > 0) {
            html = patch_text_1.default(html, replacements);
        }
        // log.warn(html);
        return html;
    });
}
exports.transformHtml = transformHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzNCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQVFoRixNQUFNLGlCQUFpQjtJQUVyQjtRQURBLGlCQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMsOEJBQThCO0lBQ2xDLENBQUM7SUFFaEIsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxD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QyxDQUFDLEdBQUcsQ0FBVyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDM0UsSUFBSSxJQUFJLEtBQUssWUFBWSxDQUFDLFFBQVMsRUFBRTtvQkFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEQsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsWUFBWSw0REFBNEQsWUFBWSxDQUFDLFFBQVEsT0FBTzt3QkFDbkksc0JBQXNCLFlBQVksb0RBQW9ELENBQUMsQ0FBQztpQkFDM0Y7YUFDRjtZQUNELCtCQUErQjtTQUNoQztRQUNELElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDM0IsSUFBSSxHQUFHLG9CQUFXLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1NBQ3hDO1FBQ0Qsa0JBQWtCO1FBQ2xCLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUFBO0FBN0NELHNDQTZDQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbi8qKlxuICogU2FtZSBmdW5jdGlvbiBhcyByZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luLCBidXQgZG9lcyBub3QgcmVseSBvbiBIdG1sV2VicGFja1BsdWdpblxuICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHtUZW1wbGF0ZVBhcnNlcn0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGh0bWxMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuICBjb25zdCBzbVVybCA9IHJlcXVpcmUoJ3NvdXJjZS1tYXAtdXJsJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmluZGV4LWh0bWwtcGx1Z2luJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5kZXhIdG1sUGx1Z2luT3B0aW9ucyB7XG4gIGluZGV4RmlsZTogc3RyaW5nO1xuICBpbmxpbmVDaHVua05hbWVzOiBzdHJpbmdbXTtcbiAgYmFzZUhyZWY/OiBzdHJpbmc7XG59XG5cbmNsYXNzIE1vY2tMb2FkZXJDb250ZXh0IHtcbiAgcmVzb3VyY2VQYXRoID0gJyc7IC8vIFRvIG92ZXJyaWRlIHN1cGVyIGludGVyZmFjZVxuICBjb25zdHJ1Y3RvcigpIHt9XG5cbiAgbG9hZE1vZHVsZShwYXRoOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgc291cmNlPzogYW55LCBzb3VyY2VNYXA/OiBhbnksIG1vZHVsZT86IGFueSkgPT4gdm9pZCkge1xuICAgICAgY2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSBcIiR7cGF0aH1cIi5gICtcbiAgICAgICAgJ29ubHkgc3VwcG9ydHMgcmVzb3VyY2UgdXJsIGluIGZvcm0gb2YgOiA8YXNzZXRzfHBhZ2U+Oi8vPHBhY2thZ2UtbmFtZT4vPHJlc291cmNlPicpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleEh0bWxQbHVnaW4ge1xuICBpbmxpbmVDaHVua1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBpbmRleE91dHB1dFBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgb3B0aW9uczogSW5kZXhIdG1sUGx1Z2luT3B0aW9ucykge1xuICAgIHRoaXMuaW5kZXhPdXRwdXRQYXRoID0gUGF0aC5iYXNlbmFtZSh0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3B0aW9ucy5pbmxpbmVDaHVua05hbWVzKSB7XG4gICAgICB0aGlzLmlubGluZUNodW5rU2V0LmFkZChuYW1lKTtcbiAgICB9XG4gIH1cbiAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWluZGV4LWh0bWwtcGx1Z2luJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgY29uc3QgaHRtbFNyYyA9IGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF07XG4gICAgICBsZXQgc291cmNlOiBzdHJpbmcgPSBodG1sU3JjLnNvdXJjZSgpO1xuICAgICAgc291cmNlID0gYXdhaXQgdHJhbnNmb3JtSHRtbChzb3VyY2UsIHtiYXNlSHJlZjogdGhpcy5vcHRpb25zLmJhc2VIcmVmfSwgKHNyY1VybCkgPT4ge1xuICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwpO1xuICAgICAgICBpZiAobWF0Y2ggJiYgdGhpcy5pbmxpbmVDaHVua1NldC5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgcmV0dXJuIHNtVXJsLnJlbW92ZUZyb20oY29tcGlsYXRpb24uYXNzZXRzW21hdGNoWzBdXS5zb3VyY2UoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9KTtcblxuICAgICAgY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXSA9IG5ldyBSYXdTb3VyY2Uoc291cmNlKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdHJhbnNmb3JtSHRtbCh0aGlzOiB2b2lkLFxuICBodG1sOiBzdHJpbmcsXG4gIGJ1aWxkT3B0aW9uczoge2Jhc2VIcmVmPzogc3RyaW5nfSxcbiAgaW5saW5lUmVwbGFjZTogKHNyY1VybDogc3RyaW5nKSA9PiBzdHJpbmcgfCBudWxsIHwgdm9pZCkge1xuXG4gIGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKGh0bWwpO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgaHRtbCA9IGNvbXBpbGUoe1xuICAgIGFwaSxcbiAgICByZXF1aXJlXG4gIH0pO1xuICAvLyBGb2xsb3dpbmcgbGluZSBtdXN0IGJlIHByaW9yIHRvIGBUZW1wbGF0ZVBhcnNlci5wYXJzZSgpYCwgVGVtcGxhdGVQYXJzZXJcbiAgLy8gaGFzIGxpbWl0YXRpb24gaW4gcGFyc2luZyBgPHNjcmlwdD5pbmxpbmUgY29kZSAuLi48L3NjcmlwdD5gXG4gIGh0bWwgPSBhd2FpdCBodG1sTG9hZGVyLmNvbXBpbGVIdG1sKGh0bWwsIG5ldyBNb2NrTG9hZGVyQ29udGV4dCgpKTtcblxuICBjb25zdCBhc3RzID0gbmV3IFRlbXBsYXRlUGFyc2VyKGh0bWwpLnBhcnNlKCk7XG4gIGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gYXN0Lm5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBhdHRycyA9IGFzdC5hdHRycztcbiAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcgJiYgYXR0cnMpIHtcbiAgICAgIGNvbnN0IHNyY1VybCA9IF8uZ2V0KGF0dHJzLnNyYyB8fCBhdHRycy5TUkMsICd2YWx1ZScpO1xuICAgICAgaWYgKHNyY1VybCA9PSBudWxsKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlubGluZUNvbnRlbnQgPSBpbmxpbmVSZXBsYWNlKHNyY1VybC50ZXh0KTtcbiAgICAgIGlmIChpbmxpbmVDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIGlubGluZUNvbnRlbnRcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZy5pbmZvKGBJbmxpbmUgXCIke3NyY1VybC50ZXh0fVwiYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChidWlsZE9wdGlvbnMuYmFzZUhyZWYgJiYgdGFnTmFtZSA9PT0gJ2Jhc2UnKSB7XG4gICAgICBjb25zdCBocmVmOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBfLmdldDxhbnksIGFueT4oYXR0cnMsICdocmVmLnZhbHVlLnRleHQnKTtcbiAgICAgIGlmIChocmVmICE9PSBidWlsZE9wdGlvbnMuYmFzZUhyZWYhKSB7XG4gICAgICAgIGNvbnN0IGJhc2VIcmVmSHRtbCA9IGh0bWwuc2xpY2UoYXN0LnN0YXJ0LCBhc3QuZW5kKTtcbiAgICAgICAgbG9nLmVycm9yKGBJbiB5b3VyIGluZGV4IEhUTUwsICR7YmFzZUhyZWZIdG1sfSBpcyBpbmNvbnNpc3RlbnQgdG8gQW5ndWxhciBjbGkgY29uZmlndXJhdGlvbiAnYmFzZUhyZWY9XCIke2J1aWxkT3B0aW9ucy5iYXNlSHJlZn1cIicsXFxuYCArXG4gICAgICAgICAgYHlvdSBuZWVkIHRvIHJlbW92ZSAke2Jhc2VIcmVmSHRtbH0gZnJvbSBpbmRleCBIVE1MIGZpbGUsIGxldCBBbmd1bGFyIGluc2VydCBmb3IgeW91LmApO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBjb25zb2xlLmxvZyh0YWdOYW1lLCBhdHRycyk7XG4gIH1cbiAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgaHRtbCA9IHJlcGxhY2VDb2RlKGh0bWwsIHJlcGxhY2VtZW50cyk7XG4gIH1cbiAgLy8gbG9nLndhcm4oaHRtbCk7XG4gIHJldHVybiBodG1sO1xufVxuIl19
