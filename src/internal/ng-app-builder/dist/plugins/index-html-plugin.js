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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUN0QixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNuRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMscUVBQXFFLElBQUksR0FBRztZQUM5RixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztDQUNEO0FBRUQsTUFBcUIsZUFBZTtJQUtuQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUpsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFLMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7SUFDRixDQUFDO0lBQ0QsS0FBSyxD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ZGVyL2Rpc3QvcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHtUZW1wbGF0ZVBhcnNlcn0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGh0bWxMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5pbmRleC1odG1sLXBsdWdpbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4SHRtbFBsdWdpbk9wdGlvbnMge1xuXHRpbmRleEZpbGU6IHN0cmluZztcblx0aW5saW5lQ2h1bmtOYW1lczogc3RyaW5nW107XG59XG5cbmNsYXNzIE1vY2tMb2FkZXJDb250ZXh0IHtcblx0Y29uc3RydWN0b3IocHVibGljIHJlc291cmNlUGF0aDogc3RyaW5nKSB7fVxuXG5cdGxvYWRNb2R1bGUocGF0aDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogRXJyb3IsIHNvdXJjZT86IGFueSwgc291cmNlTWFwPzogYW55LCBtb2R1bGU/OiBhbnkpID0+IHZvaWQpIHtcblx0XHRjYWxsYmFjayhuZXcgRXJyb3IoYGluZGV4Lmh0bWwgZG9lcyBub3Qgc3VwcG9ydCByZXF1ZXN0aW5nIHJlbGF0aXZlIHJlc291cmNlIFVSTCBsaWtlICR7cGF0aH0uYCArXG5cdFx0XHQnb25seSBzdXBwb3J0cyByZXNvdXJjZSB1cmwgaW4gZm9ybSBvZiA6IDxhc3NldHN8cGFnZT46Ly88cGFja2FnZS1uYW1lPi88cmVzb3VyY2U+JykpO1xuXHR9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEluZGV4SHRtbFBsdWdpbiB7XG5cdGlubGluZUNodW5rU2V0ID0gbmV3IFNldCgpO1xuXHRyZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW107XG5cdGluZGV4T3V0cHV0UGF0aDogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKHB1YmxpYyBvcHRpb25zOiBJbmRleEh0bWxQbHVnaW5PcHRpb25zKSB7XG5cdFx0dGhpcy5pbmRleE91dHB1dFBhdGggPSBQYXRoLmJhc2VuYW1lKHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBvcHRpb25zLmlubGluZUNodW5rTmFtZXMpIHtcblx0XHRcdHRoaXMuaW5saW5lQ2h1bmtTZXQuYWRkKG5hbWUpO1xuXHRcdH1cblx0fVxuXHRhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcblx0XHQvLyBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCdkcmNwLWRlYnVnJywgYXN5bmMgY29tcGlsZXIgPT4ge1xuXHRcdC8vIFx0Y29uc29sZS5sb2coJ3dhdGNoIHJ1biAnKTtcblx0XHQvLyB9KTtcblx0XHRjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtaW5kZXgtaHRtbC1wbHVnaW4nLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG5cdFx0XHRjb25zdCBodG1sU3JjID0gY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXTtcblx0XHRcdGxldCBzb3VyY2U6IHN0cmluZyA9IGh0bWxTcmMuc291cmNlKCk7XG5cdFx0XHRjb25zdCBjb21waWxlID0gXy50ZW1wbGF0ZShzb3VyY2UpO1xuXHRcdFx0c291cmNlID0gY29tcGlsZSh7XG5cdFx0XHRcdGFwaSxcblx0XHRcdFx0cmVxdWlyZVxuXHRcdFx0fSk7XG5cdFx0XHRzb3VyY2UgPSBhd2FpdCBodG1sTG9hZGVyLmNvbXBpbGVIdG1sKHNvdXJjZSwgbmV3IE1vY2tMb2FkZXJDb250ZXh0KHRoaXMub3B0aW9ucy5pbmRleEZpbGUpIGFzIGFueSk7XG5cdFx0XHRjb25zdCBhc3RzID0gbmV3IFRlbXBsYXRlUGFyc2VyKHNvdXJjZSkucGFyc2UoKTtcblx0XHRcdGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcblx0XHRcdFx0aWYgKGFzdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICYmIGFzdC5hdHRycykge1xuXHRcdFx0XHRcdGNvbnN0IHNyY1VybCA9IF8uZ2V0KGFzdC5hdHRycy5zcmMgfHwgYXN0LmF0dHJzLlNSQywgJ3RleHQnKTtcblx0XHRcdFx0XHRpZiAoc3JjVXJsID09IG51bGwpXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwpO1xuXHRcdFx0XHRcdGlmIChtYXRjaCAmJiB0aGlzLmlubGluZUNodW5rU2V0LmhhcyhtYXRjaFsxXSkpIHtcblx0XHRcdFx0XHRcdHRoaXMucmVwbGFjZVNjcmlwdFRhZyhzbVVybC5yZW1vdmVGcm9tKGNvbXBpbGF0aW9uLmFzc2V0c1ttYXRjaFswXV0uc291cmNlKCkpLCBhc3Quc3RhcnQsIGFzdC5lbmQpO1xuXHRcdFx0XHRcdFx0bG9nLmluZm8oYElubGluZSBjaHVuayBcIiR7bWF0Y2hbMV19XCIgaW4gOmAsIHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMucmVwbGFjZW1lbnRzKSB7XG5cdFx0XHRcdGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKFxuXHRcdFx0XHRcdHJlcGxhY2VDb2RlKHNvdXJjZSwgdGhpcy5yZXBsYWNlbWVudHMpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKHNvdXJjZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHRyZXBsYWNlU2NyaXB0VGFnKHNyYzogc3RyaW5nLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikge1xuXHRcdGlmICh0aGlzLnJlcGxhY2VtZW50cyA9PSBudWxsKVxuXHRcdFx0dGhpcy5yZXBsYWNlbWVudHMgPSBbXTtcblx0XHR0aGlzLnJlcGxhY2VtZW50cy5wdXNoKHtcblx0XHRcdHN0YXJ0LCBlbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBzcmNcblx0XHR9KTtcblx0fVxufVxuIl19
