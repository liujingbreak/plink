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
        // compiler.hooks.watchRun.tapPromise('drcp-debug', async compiler => {
        // 	console.log('watch run ');
        // });
        compiler.hooks.emit.tapPromise('drcp-index-html-plugin', (compilation) => tslib_1.__awaiter(this, void 0, void 0, function* () {
            const htmlSrc = compilation.assets[this.indexOutputPath];
            let source = htmlSrc.source();
            const compile = _.template(source);
            const replacements = [];
            source = compile({
                api: __api_1.default,
                require
            });
            source = yield htmlLoader.compileHtml(source, new MockLoaderContext(this.options.indexFile));
            const asts = new ng_html_parser_1.TemplateParser(source).parse();
            for (const ast of asts) {
                if (ast.name.toLowerCase() === 'script' && ast.attrs) {
                    const srcUrl = _.get(ast.attrs.src || ast.attrs.SRC, 'value');
                    if (srcUrl == null)
                        continue;
                    // log.warn('srcUrl', srcUrl.text);
                    const match = /([^/.]+)(?:\.[^/.]+)+$/.exec(srcUrl.text);
                    if (match && this.inlineChunkSet.has(match[1])) {
                        replacements.push({
                            start: ast.start, end: ast.end, text: '<script>' + smUrl.removeFrom(compilation.assets[match[0]].source())
                        });
                        log.info(`Inline chunk "${match[1]}" in :`, this.options.indexFile);
                    }
                }
            }
            if (replacements.length > 0) {
                compilation.assets[this.indexOutputPath] = new RawSource(patch_text_1.default(source, replacements));
            }
            else {
                compilation.assets[this.indexOutputPath] = new RawSource(source);
            }
        }));
    }
}
exports.default = IndexHtmlPlugin;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUN0QixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNuRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUNoRyxtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztDQUNEO0FBRUQsTUFBcUIsZUFBZTtJQUluQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFJMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7SUFDRixDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQWtCO1FBQ3ZCLHVFQUF1RTtRQUN2RSw4QkFBOEI7UUFDOUIsTUFBTTtRQUNOLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFNLFdBQVcsRUFBQyxFQUFFO1lBQzVFLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxHQUFXLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7WUFDMUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztnQkFDaEIsR0FBRyxFQUFILGVBQUc7Z0JBQ0gsT0FBTzthQUNQLENBQUMsQ0FBQztZQUNILE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQVEsQ0FBQyxDQUFDO1lBQ3BHLE1BQU0sSUFBSSxHQUFHLElBQUksK0JBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUNyRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM5RCxJQUFJLE1BQU0sSUFBSSxJQUFJO3dCQUNqQixTQUFTO29CQUNWLG1DQUFtQztvQkFDbkMsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDekQsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQy9DLFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO3lCQUMxRyxDQUFDLENBQUM7d0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDcEU7aUJBQ0Q7YUFDRDtZQUNELElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzVCLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUN2RCxvQkFBVyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNOLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2pFO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FPRDtBQXRERCxrQ0FzREMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG4vKipcbiAqIFNhbWUgZnVuY3Rpb24gYXMgcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbiwgYnV0IGRvZXMgbm90IHJlbHkgb24gSHRtbFdlYnBhY2tQbHVnaW5cbiAqL1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IHsgUmF3U291cmNlIH0gPSByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKTtcbmltcG9ydCB7VGVtcGxhdGVQYXJzZXJ9IGZyb20gJy4uL3V0aWxzL25nLWh0bWwtcGFyc2VyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBodG1sTG9hZGVyID0gcmVxdWlyZSgnLi4vbG9hZGVycy9uZy1odG1sLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuaW5kZXgtaHRtbC1wbHVnaW4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbmRleEh0bWxQbHVnaW5PcHRpb25zIHtcblx0aW5kZXhGaWxlOiBzdHJpbmc7XG5cdGlubGluZUNodW5rTmFtZXM6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBNb2NrTG9hZGVyQ29udGV4dCB7XG5cdGNvbnN0cnVjdG9yKHB1YmxpYyByZXNvdXJjZVBhdGg6IHN0cmluZykge31cblxuXHRsb2FkTW9kdWxlKHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IEVycm9yLCBzb3VyY2U/OiBhbnksIHNvdXJjZU1hcD86IGFueSwgbW9kdWxlPzogYW55KSA9PiB2b2lkKSB7XG5cdFx0Y2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSBcIiR7cGF0aH1cIi5gICtcblx0XHRcdCdvbmx5IHN1cHBvcnRzIHJlc291cmNlIHVybCBpbiBmb3JtIG9mIDogPGFzc2V0c3xwYWdlPjovLzxwYWNrYWdlLW5hbWU+LzxyZXNvdXJjZT4nKSk7XG5cdH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW5kZXhIdG1sUGx1Z2luIHtcblx0aW5saW5lQ2h1bmtTZXQgPSBuZXcgU2V0KCk7XG5cdGluZGV4T3V0cHV0UGF0aDogc3RyaW5nO1xuXG5cdGNvbnN0cnVjdG9yKHB1YmxpYyBvcHRpb25zOiBJbmRleEh0bWxQbHVnaW5PcHRpb25zKSB7XG5cdFx0dGhpcy5pbmRleE91dHB1dFBhdGggPSBQYXRoLmJhc2VuYW1lKHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBvcHRpb25zLmlubGluZUNodW5rTmFtZXMpIHtcblx0XHRcdHRoaXMuaW5saW5lQ2h1bmtTZXQuYWRkKG5hbWUpO1xuXHRcdH1cblx0fVxuXHRhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcblx0XHQvLyBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCdkcmNwLWRlYnVnJywgYXN5bmMgY29tcGlsZXIgPT4ge1xuXHRcdC8vIFx0Y29uc29sZS5sb2coJ3dhdGNoIHJ1biAnKTtcblx0XHQvLyB9KTtcblx0XHRjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtaW5kZXgtaHRtbC1wbHVnaW4nLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG5cdFx0XHRjb25zdCBodG1sU3JjID0gY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXTtcblx0XHRcdGxldCBzb3VyY2U6IHN0cmluZyA9IGh0bWxTcmMuc291cmNlKCk7XG5cdFx0XHRjb25zdCBjb21waWxlID0gXy50ZW1wbGF0ZShzb3VyY2UpO1xuXHRcdFx0Y29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cdFx0XHRzb3VyY2UgPSBjb21waWxlKHtcblx0XHRcdFx0YXBpLFxuXHRcdFx0XHRyZXF1aXJlXG5cdFx0XHR9KTtcblx0XHRcdHNvdXJjZSA9IGF3YWl0IGh0bWxMb2FkZXIuY29tcGlsZUh0bWwoc291cmNlLCBuZXcgTW9ja0xvYWRlckNvbnRleHQodGhpcy5vcHRpb25zLmluZGV4RmlsZSkgYXMgYW55KTtcblx0XHRcdGNvbnN0IGFzdHMgPSBuZXcgVGVtcGxhdGVQYXJzZXIoc291cmNlKS5wYXJzZSgpO1xuXHRcdFx0Zm9yIChjb25zdCBhc3Qgb2YgYXN0cykge1xuXHRcdFx0XHRpZiAoYXN0Lm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NjcmlwdCcgJiYgYXN0LmF0dHJzKSB7XG5cdFx0XHRcdFx0Y29uc3Qgc3JjVXJsID0gXy5nZXQoYXN0LmF0dHJzLnNyYyB8fCBhc3QuYXR0cnMuU1JDLCAndmFsdWUnKTtcblx0XHRcdFx0XHRpZiAoc3JjVXJsID09IG51bGwpXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHQvLyBsb2cud2Fybignc3JjVXJsJywgc3JjVXJsLnRleHQpO1xuXHRcdFx0XHRcdGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybC50ZXh0KTtcblx0XHRcdFx0XHRpZiAobWF0Y2ggJiYgdGhpcy5pbmxpbmVDaHVua1NldC5oYXMobWF0Y2hbMV0pKSB7XG5cdFx0XHRcdFx0XHRyZXBsYWNlbWVudHMucHVzaCh7XG5cdFx0XHRcdFx0XHRcdHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIHNtVXJsLnJlbW92ZUZyb20oY29tcGlsYXRpb24uYXNzZXRzW21hdGNoWzBdXS5zb3VyY2UoKSlcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0bG9nLmluZm8oYElubGluZSBjaHVuayBcIiR7bWF0Y2hbMV19XCIgaW4gOmAsIHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0aWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKSB7XG5cdFx0XHRcdGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKFxuXHRcdFx0XHRcdHJlcGxhY2VDb2RlKHNvdXJjZSwgcmVwbGFjZW1lbnRzKSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdID0gbmV3IFJhd1NvdXJjZShzb3VyY2UpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0Ly8gcmVwbGFjZVNjcmlwdFRhZyhyZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10sIHNyYzogc3RyaW5nLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikge1xuXHQvLyBcdHJlcGxhY2VtZW50cy5wdXNoKHtcblx0Ly8gXHRcdHN0YXJ0LCBlbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBzcmNcblx0Ly8gXHR9KTtcblx0Ly8gfVxufVxuIl19
