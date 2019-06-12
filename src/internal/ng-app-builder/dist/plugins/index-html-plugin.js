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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUN0QixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNuRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMscUVBQXFFLElBQUksR0FBRztZQUM5RixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztDQUNEO0FBRUQsTUFBcUIsZUFBZTtJQUluQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFJMUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7SUFDRixDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQWtCO1FBQ3ZCLHVFQUF1RTtRQUN2RSw4QkFBOEI7UUFDOUIsTUFBTTtRQUNOLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFNLFdBQVcsRUFBQyxFQUFFO1lBQzVFLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxHQUFXLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7WUFDMUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztnQkFDaEIsR0FBRyxFQUFILGVBQUc7Z0JBQ0gsT0FBTzthQUNQLENBQUMsQ0FBQztZQUNILE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQVEsQ0FBQyxDQUFDO1lBQ3BHLE1BQU0sSUFBSSxHQUFHLElBQUksK0JBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDdkIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUNyRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM5RCxJQUFJLE1BQU0sSUFBSSxJQUFJO3dCQUNqQixTQUFTO29CQUNWLG1DQUFtQztvQkFDbkMsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDekQsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQy9DLFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2pCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO3lCQUMxRyxDQUFDLENBQUM7d0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDcEU7aUJBQ0Q7YUFDRDtZQUNELElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzVCLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUN2RCxvQkFBVyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNOLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2pFO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUM7Q0FPRDtBQXRERCxrQ0FzREMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG4vKipcbiAqIFNhbWUgZnVuY3Rpb24gYXMgcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbiwgYnV0IGRvZXMgbm90IHJlbHkgb24gSHRtbFdlYnBhY2tQbHVnaW5cbiAqL1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IHsgUmF3U291cmNlIH0gPSByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKTtcbmltcG9ydCB7VGVtcGxhdGVQYXJzZXJ9IGZyb20gJy4uL3V0aWxzL25nLWh0bWwtcGFyc2VyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBodG1sTG9hZGVyID0gcmVxdWlyZSgnLi4vbG9hZGVycy9uZy1odG1sLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuaW5kZXgtaHRtbC1wbHVnaW4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbmRleEh0bWxQbHVnaW5PcHRpb25zIHtcblx0aW5kZXhGaWxlOiBzdHJpbmc7XG5cdGlubGluZUNodW5rTmFtZXM6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBNb2NrTG9hZGVyQ29udGV4dCB7XG5cdGNvbnN0cnVjdG9yKHB1YmxpYyByZXNvdXJjZVBhdGg6IHN0cmluZykge31cblxuXHRsb2FkTW9kdWxlKHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IEVycm9yLCBzb3VyY2U/OiBhbnksIHNvdXJjZU1hcD86IGFueSwgbW9kdWxlPzogYW55KSA9PiB2b2lkKSB7XG5cdFx0Y2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSAke3BhdGh9LmAgK1xuXHRcdFx0J29ubHkgc3VwcG9ydHMgcmVzb3VyY2UgdXJsIGluIGZvcm0gb2YgOiA8YXNzZXRzfHBhZ2U+Oi8vPHBhY2thZ2UtbmFtZT4vPHJlc291cmNlPicpKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleEh0bWxQbHVnaW4ge1xuXHRpbmxpbmVDaHVua1NldCA9IG5ldyBTZXQoKTtcblx0aW5kZXhPdXRwdXRQYXRoOiBzdHJpbmc7XG5cblx0Y29uc3RydWN0b3IocHVibGljIG9wdGlvbnM6IEluZGV4SHRtbFBsdWdpbk9wdGlvbnMpIHtcblx0XHR0aGlzLmluZGV4T3V0cHV0UGF0aCA9IFBhdGguYmFzZW5hbWUodGhpcy5vcHRpb25zLmluZGV4RmlsZSk7XG5cdFx0Zm9yIChjb25zdCBuYW1lIG9mIG9wdGlvbnMuaW5saW5lQ2h1bmtOYW1lcykge1xuXHRcdFx0dGhpcy5pbmxpbmVDaHVua1NldC5hZGQobmFtZSk7XG5cdFx0fVxuXHR9XG5cdGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuXHRcdC8vIGNvbXBpbGVyLmhvb2tzLndhdGNoUnVuLnRhcFByb21pc2UoJ2RyY3AtZGVidWcnLCBhc3luYyBjb21waWxlciA9PiB7XG5cdFx0Ly8gXHRjb25zb2xlLmxvZygnd2F0Y2ggcnVuICcpO1xuXHRcdC8vIH0pO1xuXHRcdGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwUHJvbWlzZSgnZHJjcC1pbmRleC1odG1sLXBsdWdpbicsIGFzeW5jIGNvbXBpbGF0aW9uID0+IHtcblx0XHRcdGNvbnN0IGh0bWxTcmMgPSBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdO1xuXHRcdFx0bGV0IHNvdXJjZTogc3RyaW5nID0gaHRtbFNyYy5zb3VyY2UoKTtcblx0XHRcdGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKHNvdXJjZSk7XG5cdFx0XHRjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcblx0XHRcdHNvdXJjZSA9IGNvbXBpbGUoe1xuXHRcdFx0XHRhcGksXG5cdFx0XHRcdHJlcXVpcmVcblx0XHRcdH0pO1xuXHRcdFx0c291cmNlID0gYXdhaXQgaHRtbExvYWRlci5jb21waWxlSHRtbChzb3VyY2UsIG5ldyBNb2NrTG9hZGVyQ29udGV4dCh0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKSBhcyBhbnkpO1xuXHRcdFx0Y29uc3QgYXN0cyA9IG5ldyBUZW1wbGF0ZVBhcnNlcihzb3VyY2UpLnBhcnNlKCk7XG5cdFx0XHRmb3IgKGNvbnN0IGFzdCBvZiBhc3RzKSB7XG5cdFx0XHRcdGlmIChhc3QubmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc2NyaXB0JyAmJiBhc3QuYXR0cnMpIHtcblx0XHRcdFx0XHRjb25zdCBzcmNVcmwgPSBfLmdldChhc3QuYXR0cnMuc3JjIHx8IGFzdC5hdHRycy5TUkMsICd2YWx1ZScpO1xuXHRcdFx0XHRcdGlmIChzcmNVcmwgPT0gbnVsbClcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdC8vIGxvZy53YXJuKCdzcmNVcmwnLCBzcmNVcmwudGV4dCk7XG5cdFx0XHRcdFx0Y29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKyQvLmV4ZWMoc3JjVXJsLnRleHQpO1xuXHRcdFx0XHRcdGlmIChtYXRjaCAmJiB0aGlzLmlubGluZUNodW5rU2V0LmhhcyhtYXRjaFsxXSkpIHtcblx0XHRcdFx0XHRcdHJlcGxhY2VtZW50cy5wdXNoKHtcblx0XHRcdFx0XHRcdFx0c3RhcnQ6IGFzdC5zdGFydCwgZW5kOiBhc3QuZW5kLCB0ZXh0OiAnPHNjcmlwdD4nICsgc21VcmwucmVtb3ZlRnJvbShjb21waWxhdGlvbi5hc3NldHNbbWF0Y2hbMF1dLnNvdXJjZSgpKVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRsb2cuaW5mbyhgSW5saW5lIGNodW5rIFwiJHttYXRjaFsxXX1cIiBpbiA6YCwgdGhpcy5vcHRpb25zLmluZGV4RmlsZSk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0Y29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXSA9IG5ldyBSYXdTb3VyY2UoXG5cdFx0XHRcdFx0cmVwbGFjZUNvZGUoc291cmNlLCByZXBsYWNlbWVudHMpKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKHNvdXJjZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQvLyByZXBsYWNlU2NyaXB0VGFnKHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSwgc3JjOiBzdHJpbmcsIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKSB7XG5cdC8vIFx0cmVwbGFjZW1lbnRzLnB1c2goe1xuXHQvLyBcdFx0c3RhcnQsIGVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIHNyY1xuXHQvLyBcdH0pO1xuXHQvLyB9XG59XG4iXX0=
