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
                    log.info(`Inline "${srcUrl.text}" in :`);
                }
            }
        }
        if (replacements.length > 0) {
            html = patch_text_1.default(html, replacements);
        }
        // log.warn(html);
        html = yield htmlLoader.compileHtml(html, new MockLoaderContext());
        return html;
    });
}
exports.transformHtml = transformHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUVyQjtRQURBLGlCQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMsOEJBQThCO0lBQ2xDLENBQUM7SUFFaEIsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxD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ZXIvZGlzdC9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbi8qKlxuICogU2FtZSBmdW5jdGlvbiBhcyByZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luLCBidXQgZG9lcyBub3QgcmVseSBvbiBIdG1sV2VicGFja1BsdWdpblxuICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHtUZW1wbGF0ZVBhcnNlcn0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGh0bWxMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5pbmRleC1odG1sLXBsdWdpbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4SHRtbFBsdWdpbk9wdGlvbnMge1xuICBpbmRleEZpbGU6IHN0cmluZztcbiAgaW5saW5lQ2h1bmtOYW1lczogc3RyaW5nW107XG59XG5cbmNsYXNzIE1vY2tMb2FkZXJDb250ZXh0IHtcbiAgcmVzb3VyY2VQYXRoID0gJyc7IC8vIFRvIG92ZXJyaWRlIHN1cGVyIGludGVyZmFjZVxuICBjb25zdHJ1Y3RvcigpIHt9XG5cbiAgbG9hZE1vZHVsZShwYXRoOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgc291cmNlPzogYW55LCBzb3VyY2VNYXA/OiBhbnksIG1vZHVsZT86IGFueSkgPT4gdm9pZCkge1xuICAgICAgY2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSBcIiR7cGF0aH1cIi5gICtcbiAgICAgICAgJ29ubHkgc3VwcG9ydHMgcmVzb3VyY2UgdXJsIGluIGZvcm0gb2YgOiA8YXNzZXRzfHBhZ2U+Oi8vPHBhY2thZ2UtbmFtZT4vPHJlc291cmNlPicpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleEh0bWxQbHVnaW4ge1xuICBpbmxpbmVDaHVua1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBpbmRleE91dHB1dFBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgb3B0aW9uczogSW5kZXhIdG1sUGx1Z2luT3B0aW9ucykge1xuICAgIHRoaXMuaW5kZXhPdXRwdXRQYXRoID0gUGF0aC5iYXNlbmFtZSh0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3B0aW9ucy5pbmxpbmVDaHVua05hbWVzKSB7XG4gICAgICB0aGlzLmlubGluZUNodW5rU2V0LmFkZChuYW1lKTtcbiAgICB9XG4gIH1cbiAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWluZGV4LWh0bWwtcGx1Z2luJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgY29uc3QgaHRtbFNyYyA9IGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF07XG4gICAgICBsZXQgc291cmNlOiBzdHJpbmcgPSBodG1sU3JjLnNvdXJjZSgpO1xuICAgICAgc291cmNlID0gYXdhaXQgdHJhbnNmb3JtSHRtbChzb3VyY2UsIChzcmNVcmwpID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKyQvLmV4ZWMoc3JjVXJsKTtcbiAgICAgICAgaWYgKG1hdGNoICYmIHRoaXMuaW5saW5lQ2h1bmtTZXQuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgIHJldHVybiBzbVVybC5yZW1vdmVGcm9tKGNvbXBpbGF0aW9uLmFzc2V0c1ttYXRjaFswXV0uc291cmNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKHNvdXJjZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybUh0bWwodGhpczogdm9pZCxcbiAgaHRtbDogc3RyaW5nLFxuICBpbmxpbmVSZXBsYWNlOiAoc3JjVXJsOiBzdHJpbmcpID0+IHN0cmluZyB8IG51bGwgfCB2b2lkKSB7XG5cbiAgY29uc3QgY29tcGlsZSA9IF8udGVtcGxhdGUoaHRtbCk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICBodG1sID0gY29tcGlsZSh7XG4gICAgYXBpLFxuICAgIHJlcXVpcmVcbiAgfSk7XG5cbiAgY29uc3QgYXN0cyA9IG5ldyBUZW1wbGF0ZVBhcnNlcihodG1sKS5wYXJzZSgpO1xuICBmb3IgKGNvbnN0IGFzdCBvZiBhc3RzKSB7XG4gICAgaWYgKGFzdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICYmIGFzdC5hdHRycykge1xuICAgICAgY29uc3Qgc3JjVXJsID0gXy5nZXQoYXN0LmF0dHJzLnNyYyB8fCBhc3QuYXR0cnMuU1JDLCAndmFsdWUnKTtcbiAgICAgIGlmIChzcmNVcmwgPT0gbnVsbClcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBpbmxpbmVDb250ZW50ID0gaW5saW5lUmVwbGFjZShzcmNVcmwudGV4dCk7XG4gICAgICBpZiAoaW5saW5lQ29udGVudCAhPSBudWxsKSB7XG4gICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICBzdGFydDogYXN0LnN0YXJ0LCBlbmQ6IGFzdC5lbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBpbmxpbmVDb250ZW50XG4gICAgICAgIH0pO1xuICAgICAgICBsb2cuaW5mbyhgSW5saW5lIFwiJHtzcmNVcmwudGV4dH1cIiBpbiA6YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGh0bWwgPSByZXBsYWNlQ29kZShodG1sLCByZXBsYWNlbWVudHMpO1xuICB9XG5cbiAgLy8gbG9nLndhcm4oaHRtbCk7XG5cbiAgaHRtbCA9IGF3YWl0IGh0bWxMb2FkZXIuY29tcGlsZUh0bWwoaHRtbCwgbmV3IE1vY2tMb2FkZXJDb250ZXh0KCkpO1xuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==
