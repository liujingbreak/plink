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
function transformHtml(source, inlineReplace) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const compile = _.template(source);
        const replacements = [];
        source = compile({
            api: __api_1.default,
            require
        });
        const asts = new ng_html_parser_1.TemplateParser(source).parse();
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
                    log.info(`Inline "${srcUrl.text}" in :`, this.options.indexFile);
                }
            }
        }
        if (replacements.length > 0) {
            source = patch_text_1.default(source, replacements);
        }
        // log.warn(source);
        source = yield htmlLoader.compileHtml(source, new MockLoaderContext(this.options.indexFile));
        return source;
    });
}
exports.transformHtml = transformHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUNyQixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxD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O0NBQUE7QUFuQ0Qsc0NBbUNDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuLyoqXG4gKiBTYW1lIGZ1bmN0aW9uIGFzIHJlYWN0LWRldi11dGlscy9JbmxpbmVDaHVua0h0bWxQbHVnaW4sIGJ1dCBkb2VzIG5vdCByZWx5IG9uIEh0bWxXZWJwYWNrUGx1Z2luXG4gKi9cbmltcG9ydCB7IENvbXBpbGVyIH0gZnJvbSAnd2VicGFjayc7XG5jb25zdCB7IFJhd1NvdXJjZSB9ID0gcmVxdWlyZSgnd2VicGFjay1zb3VyY2VzJyk7XG5pbXBvcnQge1RlbXBsYXRlUGFyc2VyfSBmcm9tICcuLi91dGlscy9uZy1odG1sLXBhcnNlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgaHRtbExvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvbmctaHRtbC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5jb25zdCBzbVVybCA9IHJlcXVpcmUoJ3NvdXJjZS1tYXAtdXJsJyk7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmluZGV4LWh0bWwtcGx1Z2luJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5kZXhIdG1sUGx1Z2luT3B0aW9ucyB7XG4gIGluZGV4RmlsZTogc3RyaW5nO1xuICBpbmxpbmVDaHVua05hbWVzOiBzdHJpbmdbXTtcbn1cblxuY2xhc3MgTW9ja0xvYWRlckNvbnRleHQge1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVzb3VyY2VQYXRoOiBzdHJpbmcpIHt9XG5cbiAgbG9hZE1vZHVsZShwYXRoOiBzdHJpbmcsIGNhbGxiYWNrOiAoZXJyOiBFcnJvciwgc291cmNlPzogYW55LCBzb3VyY2VNYXA/OiBhbnksIG1vZHVsZT86IGFueSkgPT4gdm9pZCkge1xuICAgICAgY2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSBcIiR7cGF0aH1cIi5gICtcbiAgICAgICAgJ29ubHkgc3VwcG9ydHMgcmVzb3VyY2UgdXJsIGluIGZvcm0gb2YgOiA8YXNzZXRzfHBhZ2U+Oi8vPHBhY2thZ2UtbmFtZT4vPHJlc291cmNlPicpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleEh0bWxQbHVnaW4ge1xuICBpbmxpbmVDaHVua1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBpbmRleE91dHB1dFBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihwdWJsaWMgb3B0aW9uczogSW5kZXhIdG1sUGx1Z2luT3B0aW9ucykge1xuICAgIHRoaXMuaW5kZXhPdXRwdXRQYXRoID0gUGF0aC5iYXNlbmFtZSh0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2Ygb3B0aW9ucy5pbmxpbmVDaHVua05hbWVzKSB7XG4gICAgICB0aGlzLmlubGluZUNodW5rU2V0LmFkZChuYW1lKTtcbiAgICB9XG4gIH1cbiAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG4gICAgY29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWluZGV4LWh0bWwtcGx1Z2luJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuICAgICAgY29uc3QgaHRtbFNyYyA9IGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF07XG4gICAgICBsZXQgc291cmNlOiBzdHJpbmcgPSBodG1sU3JjLnNvdXJjZSgpO1xuICAgICAgc291cmNlID0gYXdhaXQgdHJhbnNmb3JtSHRtbChzb3VyY2UsIChzcmNVcmwpID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKyQvLmV4ZWMoc3JjVXJsKTtcbiAgICAgICAgaWYgKG1hdGNoICYmIHRoaXMuaW5saW5lQ2h1bmtTZXQuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgIHJldHVybiBzbVVybC5yZW1vdmVGcm9tKGNvbXBpbGF0aW9uLmFzc2V0c1ttYXRjaFswXV0uc291cmNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKHNvdXJjZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybUh0bWwoXG4gIHNvdXJjZTogc3RyaW5nLFxuICBpbmxpbmVSZXBsYWNlOiAoc3JjVXJsOiBzdHJpbmcpID0+IHN0cmluZyB8IG51bGwgfCB2b2lkKSB7XG5cbiAgY29uc3QgY29tcGlsZSA9IF8udGVtcGxhdGUoc291cmNlKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gIHNvdXJjZSA9IGNvbXBpbGUoe1xuICAgIGFwaSxcbiAgICByZXF1aXJlXG4gIH0pO1xuXG4gIGNvbnN0IGFzdHMgPSBuZXcgVGVtcGxhdGVQYXJzZXIoc291cmNlKS5wYXJzZSgpO1xuICBmb3IgKGNvbnN0IGFzdCBvZiBhc3RzKSB7XG4gICAgaWYgKGFzdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICYmIGFzdC5hdHRycykge1xuICAgICAgY29uc3Qgc3JjVXJsID0gXy5nZXQoYXN0LmF0dHJzLnNyYyB8fCBhc3QuYXR0cnMuU1JDLCAndmFsdWUnKTtcbiAgICAgIGlmIChzcmNVcmwgPT0gbnVsbClcbiAgICAgICAgY29udGludWU7XG4gICAgICBjb25zdCBpbmxpbmVDb250ZW50ID0gaW5saW5lUmVwbGFjZShzcmNVcmwudGV4dCk7XG4gICAgICBpZiAoaW5saW5lQ29udGVudCAhPSBudWxsKSB7XG4gICAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgICAgICBzdGFydDogYXN0LnN0YXJ0LCBlbmQ6IGFzdC5lbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBpbmxpbmVDb250ZW50XG4gICAgICAgIH0pO1xuICAgICAgICBsb2cuaW5mbyhgSW5saW5lIFwiJHtzcmNVcmwudGV4dH1cIiBpbiA6YCwgdGhpcy5vcHRpb25zLmluZGV4RmlsZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIHNvdXJjZSA9IHJlcGxhY2VDb2RlKHNvdXJjZSwgcmVwbGFjZW1lbnRzKTtcbiAgfVxuXG4gIC8vIGxvZy53YXJuKHNvdXJjZSk7XG5cbiAgc291cmNlID0gYXdhaXQgaHRtbExvYWRlci5jb21waWxlSHRtbChzb3VyY2UsXG4gICAgbmV3IE1vY2tMb2FkZXJDb250ZXh0KHRoaXMub3B0aW9ucy5pbmRleEZpbGUpIGFzIGFueSk7XG4gIHJldHVybiBzb3VyY2U7XG59XG4iXX0=
