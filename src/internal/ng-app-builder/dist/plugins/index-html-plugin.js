"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCxxRkFBZ0Q7QUFDaEQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzNCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQVFoRixNQUFNLGlCQUFpQjtJQUVyQjtRQURBLGlCQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMsOEJBQThCO0lBQ2xDLENBQUM7SUFFaEIsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxD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OiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbi8qKlxuICogU2FtZSBmdW5jdGlvbiBhcyByZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luLCBidXQgZG9lcyBub3QgcmVseSBvbiBIdG1sV2VicGFja1BsdWdpblxuICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHBhcnNlSHRtbCBmcm9tICcuLi91dGlscy9uZy1odG1sLXBhcnNlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgaHRtbExvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvbmctaHRtbC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4gIGNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuaW5kZXgtaHRtbC1wbHVnaW4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbmRleEh0bWxQbHVnaW5PcHRpb25zIHtcbiAgaW5kZXhGaWxlOiBzdHJpbmc7XG4gIGlubGluZUNodW5rTmFtZXM6IHN0cmluZ1tdO1xuICBiYXNlSHJlZj86IHN0cmluZztcbn1cblxuY2xhc3MgTW9ja0xvYWRlckNvbnRleHQge1xuICByZXNvdXJjZVBhdGggPSAnJzsgLy8gVG8gb3ZlcnJpZGUgc3VwZXIgaW50ZXJmYWNlXG4gIGNvbnN0cnVjdG9yKCkge31cblxuICBsb2FkTW9kdWxlKHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IEVycm9yLCBzb3VyY2U/OiBhbnksIHNvdXJjZU1hcD86IGFueSwgbW9kdWxlPzogYW55KSA9PiB2b2lkKSB7XG4gICAgICBjYWxsYmFjayhuZXcgRXJyb3IoYGluZGV4Lmh0bWwgZG9lcyBub3Qgc3VwcG9ydCByZXF1ZXN0aW5nIHJlbGF0aXZlIHJlc291cmNlIFVSTCBsaWtlIFwiJHtwYXRofVwiLmAgK1xuICAgICAgICAnb25seSBzdXBwb3J0cyByZXNvdXJjZSB1cmwgaW4gZm9ybSBvZiA6IDxhc3NldHN8cGFnZT46Ly88cGFja2FnZS1uYW1lPi88cmVzb3VyY2U+JykpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEluZGV4SHRtbFBsdWdpbiB7XG4gIGlubGluZUNodW5rU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGluZGV4T3V0cHV0UGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBvcHRpb25zOiBJbmRleEh0bWxQbHVnaW5PcHRpb25zKSB7XG4gICAgdGhpcy5pbmRleE91dHB1dFBhdGggPSBQYXRoLmJhc2VuYW1lKHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBvcHRpb25zLmlubGluZUNodW5rTmFtZXMpIHtcbiAgICAgIHRoaXMuaW5saW5lQ2h1bmtTZXQuYWRkKG5hbWUpO1xuICAgIH1cbiAgfVxuICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtaW5kZXgtaHRtbC1wbHVnaW4nLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG4gICAgICBjb25zdCBodG1sU3JjID0gY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXTtcbiAgICAgIGxldCBzb3VyY2U6IHN0cmluZyA9IGh0bWxTcmMuc291cmNlKCk7XG4gICAgICBzb3VyY2UgPSBhd2FpdCB0cmFuc2Zvcm1IdG1sKHNvdXJjZSwge2Jhc2VIcmVmOiB0aGlzLm9wdGlvbnMuYmFzZUhyZWZ9LCAoc3JjVXJsKSA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybCk7XG4gICAgICAgIGlmIChtYXRjaCAmJiB0aGlzLmlubGluZUNodW5rU2V0LmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICByZXR1cm4gc21VcmwucmVtb3ZlRnJvbShjb21waWxhdGlvbi5hc3NldHNbbWF0Y2hbMF1dLnNvdXJjZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgICBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdID0gbmV3IFJhd1NvdXJjZShzb3VyY2UpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1IdG1sKHRoaXM6IHZvaWQsXG4gIGh0bWw6IHN0cmluZyxcbiAgYnVpbGRPcHRpb25zOiB7YmFzZUhyZWY/OiBzdHJpbmd9LFxuICBpbmxpbmVSZXBsYWNlOiAoc3JjVXJsOiBzdHJpbmcpID0+IHN0cmluZyB8IG51bGwgfCB2b2lkKSB7XG5cbiAgY29uc3QgY29tcGlsZSA9IF8udGVtcGxhdGUoaHRtbCk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICBodG1sID0gY29tcGlsZSh7XG4gICAgYXBpLFxuICAgIHJlcXVpcmVcbiAgfSk7XG4gIC8vIEZvbGxvd2luZyBsaW5lIG11c3QgYmUgcHJpb3IgdG8gYFRlbXBsYXRlUGFyc2VyLnBhcnNlKClgLCBUZW1wbGF0ZVBhcnNlclxuICAvLyBoYXMgbGltaXRhdGlvbiBpbiBwYXJzaW5nIGA8c2NyaXB0PmlubGluZSBjb2RlIC4uLjwvc2NyaXB0PmBcbiAgaHRtbCA9IGF3YWl0IGh0bWxMb2FkZXIuY29tcGlsZUh0bWwoaHRtbCwgbmV3IE1vY2tMb2FkZXJDb250ZXh0KCkpO1xuICBsZXQgaGFzQmFzZUhyZWYgPSBmYWxzZTtcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VIdG1sKGh0bWwpO1xuICBmb3IgKGNvbnN0IGNvbW1lbnQgb2YgcGFyc2VkLmNvbW1lbnRzKSB7XG4gICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgc3RhcnQ6IGNvbW1lbnQucG9zLFxuICAgICAgZW5kOiBjb21tZW50LmVuZCxcbiAgICAgIHRleHQ6ICcnXG4gICAgfSk7XG4gIH1cbiAgZm9yIChjb25zdCBhc3Qgb2YgcGFyc2VkLnRhZ3MpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gYXN0Lm5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBhdHRycyA9IGFzdC5hdHRycztcbiAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcgJiYgYXR0cnMpIHtcbiAgICAgIGNvbnN0IHNyY1VybCA9IF8uZ2V0KGF0dHJzLnNyYyB8fCBhdHRycy5TUkMsICd2YWx1ZScpO1xuICAgICAgaWYgKHNyY1VybCA9PSBudWxsKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlubGluZUNvbnRlbnQgPSBpbmxpbmVSZXBsYWNlKHNyY1VybC50ZXh0KTtcbiAgICAgIGlmIChpbmxpbmVDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIGlubGluZUNvbnRlbnRcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZy5pbmZvKGBJbmxpbmUgXCIke3NyY1VybC50ZXh0fVwiYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0YWdOYW1lID09PSAnYmFzZScpIHtcbiAgICAgIGhhc0Jhc2VIcmVmID0gdHJ1ZTtcbiAgICAgIGlmICghYnVpbGRPcHRpb25zLmJhc2VIcmVmKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhyZWY6IHN0cmluZyB8IHVuZGVmaW5lZCA9IF8uZ2V0PGFueSwgYW55PihhdHRycywgJ2hyZWYudmFsdWUudGV4dCcpO1xuICAgICAgaWYgKGhyZWYgIT09IGJ1aWxkT3B0aW9ucy5iYXNlSHJlZiEpIHtcbiAgICAgICAgY29uc3QgYmFzZUhyZWZIdG1sID0gaHRtbC5zbGljZShhc3Quc3RhcnQsIGFzdC5lbmQpO1xuICAgICAgICBsb2cuZXJyb3IoYEluIHlvdXIgaW5kZXggSFRNTCwgJHtiYXNlSHJlZkh0bWx9IGlzIGluY29uc2lzdGVudCB0byBBbmd1bGFyIGNsaSBjb25maWd1cmF0aW9uICdiYXNlSHJlZj1cIiR7YnVpbGRPcHRpb25zLmJhc2VIcmVmfVwiJyxcXG5gICtcbiAgICAgICAgICBgeW91IG5lZWQgdG8gcmVtb3ZlICR7YmFzZUhyZWZIdG1sfSBmcm9tIGluZGV4IEhUTUwgZmlsZSwgbGV0IEFuZ3VsYXIgaW5zZXJ0IGZvciB5b3UuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKHRhZ05hbWUsIGF0dHJzKTtcbiAgfVxuICBpZiAoIWhhc0Jhc2VIcmVmICYmICFidWlsZE9wdGlvbnMuYmFzZUhyZWYpIHtcbiAgICBjb25zdCBtc2cgPSAnVGhlcmUgaXMgbmVpdGhlciA8YmFzZSBocmVmPiB0YWcgaW4gaW5kZXggSFRNTCwgbm9yIEFuZ3VsYXIgY2xpIGNvbmZpZ3VyYXRpb24gXCJiYXNlSHJlZlwiIGJlaW5nIHNldCc7XG4gICAgbG9nLmVycm9yKCdFcnJvcjonLCBtc2cpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGh0bWwgPSByZXBsYWNlQ29kZShodG1sLCByZXBsYWNlbWVudHMpO1xuICB9XG4gIC8vIGxvZy53YXJuKGh0bWwpO1xuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==
