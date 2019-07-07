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
            source = yield transformHtml(source, (srcUrl) => {
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
function transformHtml(html, inlineReplace) {
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
            if (ast.name.toLowerCase() === 'script' && ast.attrs) {
                const srcUrl = _.get(ast.attrs.src || ast.attrs.SRC, 'value');
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
        }
        if (replacements.length > 0) {
            html = patch_text_1.default(html, replacements);
        }
        // log.warn(html);
        return html;
    });
}
exports.transformHtml = transformHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzNCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUVyQjtRQURBLGlCQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMsOEJBQThCO0lBQ2xDLENBQUM7SUFFaEIsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxD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dWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuLyoqXG4gKiBTYW1lIGZ1bmN0aW9uIGFzIHJlYWN0LWRldi11dGlscy9JbmxpbmVDaHVua0h0bWxQbHVnaW4sIGJ1dCBkb2VzIG5vdCByZWx5IG9uIEh0bWxXZWJwYWNrUGx1Z2luXG4gKi9cbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5jb25zdCB7IFJhd1NvdXJjZSB9ID0gcmVxdWlyZSgnd2VicGFjay1zb3VyY2VzJyk7XG5pbXBvcnQge1RlbXBsYXRlUGFyc2VyfSBmcm9tICcuLi91dGlscy9uZy1odG1sLXBhcnNlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgaHRtbExvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvbmctaHRtbC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4gIGNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuaW5kZXgtaHRtbC1wbHVnaW4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbmRleEh0bWxQbHVnaW5PcHRpb25zIHtcbiAgaW5kZXhGaWxlOiBzdHJpbmc7XG4gIGlubGluZUNodW5rTmFtZXM6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBNb2NrTG9hZGVyQ29udGV4dCB7XG4gIHJlc291cmNlUGF0aCA9ICcnOyAvLyBUbyBvdmVycmlkZSBzdXBlciBpbnRlcmZhY2VcbiAgY29uc3RydWN0b3IoKSB7fVxuXG4gIGxvYWRNb2R1bGUocGF0aDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogRXJyb3IsIHNvdXJjZT86IGFueSwgc291cmNlTWFwPzogYW55LCBtb2R1bGU/OiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihgaW5kZXguaHRtbCBkb2VzIG5vdCBzdXBwb3J0IHJlcXVlc3RpbmcgcmVsYXRpdmUgcmVzb3VyY2UgVVJMIGxpa2UgXCIke3BhdGh9XCIuYCArXG4gICAgICAgICdvbmx5IHN1cHBvcnRzIHJlc291cmNlIHVybCBpbiBmb3JtIG9mIDogPGFzc2V0c3xwYWdlPjovLzxwYWNrYWdlLW5hbWU+LzxyZXNvdXJjZT4nKSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW5kZXhIdG1sUGx1Z2luIHtcbiAgaW5saW5lQ2h1bmtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgaW5kZXhPdXRwdXRQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIG9wdGlvbnM6IEluZGV4SHRtbFBsdWdpbk9wdGlvbnMpIHtcbiAgICB0aGlzLmluZGV4T3V0cHV0UGF0aCA9IFBhdGguYmFzZW5hbWUodGhpcy5vcHRpb25zLmluZGV4RmlsZSk7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG9wdGlvbnMuaW5saW5lQ2h1bmtOYW1lcykge1xuICAgICAgdGhpcy5pbmxpbmVDaHVua1NldC5hZGQobmFtZSk7XG4gICAgfVxuICB9XG4gIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwUHJvbWlzZSgnZHJjcC1pbmRleC1odG1sLXBsdWdpbicsIGFzeW5jIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgIGNvbnN0IGh0bWxTcmMgPSBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdO1xuICAgICAgbGV0IHNvdXJjZTogc3RyaW5nID0gaHRtbFNyYy5zb3VyY2UoKTtcbiAgICAgIHNvdXJjZSA9IGF3YWl0IHRyYW5zZm9ybUh0bWwoc291cmNlLCAoc3JjVXJsKSA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybCk7XG4gICAgICAgIGlmIChtYXRjaCAmJiB0aGlzLmlubGluZUNodW5rU2V0LmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICByZXR1cm4gc21VcmwucmVtb3ZlRnJvbShjb21waWxhdGlvbi5hc3NldHNbbWF0Y2hbMF1dLnNvdXJjZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgICBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdID0gbmV3IFJhd1NvdXJjZShzb3VyY2UpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1IdG1sKHRoaXM6IHZvaWQsXG4gIGh0bWw6IHN0cmluZyxcbiAgaW5saW5lUmVwbGFjZTogKHNyY1VybDogc3RyaW5nKSA9PiBzdHJpbmcgfCBudWxsIHwgdm9pZCkge1xuXG4gIGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKGh0bWwpO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgaHRtbCA9IGNvbXBpbGUoe1xuICAgIGFwaSxcbiAgICByZXF1aXJlXG4gIH0pO1xuICAvLyBGb2xsb3dpbmcgbGluZSBtdXN0IGJlIHByaW9yIHRvIGBUZW1wbGF0ZVBhcnNlci5wYXJzZSgpYCwgVGVtcGxhdGVQYXJzZXJcbiAgLy8gaGFzIGxpbWl0YXRpb24gaW4gcGFyc2luZyBgPHNjcmlwdD5pbmxpbmUgY29kZSAuLi48L3NjcmlwdD5gXG4gIGh0bWwgPSBhd2FpdCBodG1sTG9hZGVyLmNvbXBpbGVIdG1sKGh0bWwsIG5ldyBNb2NrTG9hZGVyQ29udGV4dCgpKTtcblxuICBjb25zdCBhc3RzID0gbmV3IFRlbXBsYXRlUGFyc2VyKGh0bWwpLnBhcnNlKCk7XG4gIGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcbiAgICBpZiAoYXN0Lm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NjcmlwdCcgJiYgYXN0LmF0dHJzKSB7XG4gICAgICBjb25zdCBzcmNVcmwgPSBfLmdldChhc3QuYXR0cnMuc3JjIHx8IGFzdC5hdHRycy5TUkMsICd2YWx1ZScpO1xuICAgICAgaWYgKHNyY1VybCA9PSBudWxsKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlubGluZUNvbnRlbnQgPSBpbmxpbmVSZXBsYWNlKHNyY1VybC50ZXh0KTtcbiAgICAgIGlmIChpbmxpbmVDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIGlubGluZUNvbnRlbnRcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZy5pbmZvKGBJbmxpbmUgXCIke3NyY1VybC50ZXh0fVwiYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGh0bWwgPSByZXBsYWNlQ29kZShodG1sLCByZXBsYWNlbWVudHMpO1xuICB9XG4gIC8vIGxvZy53YXJuKGh0bWwpO1xuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==
