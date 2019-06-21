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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUN0QixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNuRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMscUVBQXFFLElBQUksR0FBRztZQUM5RixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztDQUNEO0FBRUQsTUFBcUIsZUFBZTtJQUluQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJbEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDOUI7SUFDRixDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQWtCO1FBQ3ZCLHVFQUF1RTtRQUN2RSw4QkFBOEI7UUFDOUIsTUFBTTtRQUNOLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFNLFdBQVcsRUFBQyxFQUFFO1lBQzVFLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxHQUFXLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7WUFDMUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztnQkFDaEIsR0FBRyxFQUFILGVBQUc7Z0JBQ0gsT0FBTzthQUNQLENBQUMsQ0FBQztZQUNILE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUMzQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFRLENBQUMsQ0FBQztZQUN2RCxNQUFNLElBQUksR0FBRyxJQUFJLCtCQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLEVBQUU7Z0JBQ3ZCLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtvQkFDckQsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDOUQsSUFBSSxNQUFNLElBQUksSUFBSTt3QkFDakIsU0FBUztvQkFDVixtQ0FBbUM7b0JBQ25DLE1BQU0sS0FBSyxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3pELElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUMvQyxZQUFZLENBQUMsSUFBSSxDQUFDOzRCQUNqQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQzt5QkFDMUcsQ0FBQyxDQUFDO3dCQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7cUJBQ3BFO2lCQUNEO2FBQ0Q7WUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO2dCQUM1QixXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FDdkQsb0JBQVcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQzthQUNwQztpQkFBTTtnQkFDTixXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNqRTtRQUNGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDO0NBT0Q7QUF2REQsa0NBdURDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L3BsdWdpbnMvaW5kZXgtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtY2xhc3Nlcy1wZXItZmlsZSAqL1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IHsgUmF3U291cmNlIH0gPSByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKTtcbmltcG9ydCB7VGVtcGxhdGVQYXJzZXJ9IGZyb20gJy4uL3V0aWxzL25nLWh0bWwtcGFyc2VyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBodG1sTG9hZGVyID0gcmVxdWlyZSgnLi4vbG9hZGVycy9uZy1odG1sLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuaW5kZXgtaHRtbC1wbHVnaW4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbmRleEh0bWxQbHVnaW5PcHRpb25zIHtcblx0aW5kZXhGaWxlOiBzdHJpbmc7XG5cdGlubGluZUNodW5rTmFtZXM6IHN0cmluZ1tdO1xufVxuXG5jbGFzcyBNb2NrTG9hZGVyQ29udGV4dCB7XG5cdGNvbnN0cnVjdG9yKHB1YmxpYyByZXNvdXJjZVBhdGg6IHN0cmluZykge31cblxuXHRsb2FkTW9kdWxlKHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IEVycm9yLCBzb3VyY2U/OiBhbnksIHNvdXJjZU1hcD86IGFueSwgbW9kdWxlPzogYW55KSA9PiB2b2lkKSB7XG5cdFx0Y2FsbGJhY2sobmV3IEVycm9yKGBpbmRleC5odG1sIGRvZXMgbm90IHN1cHBvcnQgcmVxdWVzdGluZyByZWxhdGl2ZSByZXNvdXJjZSBVUkwgbGlrZSAke3BhdGh9LmAgK1xuXHRcdFx0J29ubHkgc3VwcG9ydHMgcmVzb3VyY2UgdXJsIGluIGZvcm0gb2YgOiA8YXNzZXRzfHBhZ2U+Oi8vPHBhY2thZ2UtbmFtZT4vPHJlc291cmNlPicpKTtcblx0fVxufVxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBJbmRleEh0bWxQbHVnaW4ge1xuXHRpbmxpbmVDaHVua1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXHRpbmRleE91dHB1dFBhdGg6IHN0cmluZztcblxuXHRjb25zdHJ1Y3RvcihwdWJsaWMgb3B0aW9uczogSW5kZXhIdG1sUGx1Z2luT3B0aW9ucykge1xuXHRcdHRoaXMuaW5kZXhPdXRwdXRQYXRoID0gUGF0aC5iYXNlbmFtZSh0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcblx0XHRmb3IgKGNvbnN0IG5hbWUgb2Ygb3B0aW9ucy5pbmxpbmVDaHVua05hbWVzKSB7XG5cdFx0XHR0aGlzLmlubGluZUNodW5rU2V0LmFkZChuYW1lKTtcblx0XHR9XG5cdH1cblx0YXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKSB7XG5cdFx0Ly8gY29tcGlsZXIuaG9va3Mud2F0Y2hSdW4udGFwUHJvbWlzZSgnZHJjcC1kZWJ1ZycsIGFzeW5jIGNvbXBpbGVyID0+IHtcblx0XHQvLyBcdGNvbnNvbGUubG9nKCd3YXRjaCBydW4gJyk7XG5cdFx0Ly8gfSk7XG5cdFx0Y29tcGlsZXIuaG9va3MuZW1pdC50YXBQcm9taXNlKCdkcmNwLWluZGV4LWh0bWwtcGx1Z2luJywgYXN5bmMgY29tcGlsYXRpb24gPT4ge1xuXHRcdFx0Y29uc3QgaHRtbFNyYyA9IGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF07XG5cdFx0XHRsZXQgc291cmNlOiBzdHJpbmcgPSBodG1sU3JjLnNvdXJjZSgpO1xuXHRcdFx0Y29uc3QgY29tcGlsZSA9IF8udGVtcGxhdGUoc291cmNlKTtcblx0XHRcdGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXHRcdFx0c291cmNlID0gY29tcGlsZSh7XG5cdFx0XHRcdGFwaSxcblx0XHRcdFx0cmVxdWlyZVxuXHRcdFx0fSk7XG5cdFx0XHRzb3VyY2UgPSBhd2FpdCBodG1sTG9hZGVyLmNvbXBpbGVIdG1sKHNvdXJjZSxcblx0XHRcdFx0bmV3IE1vY2tMb2FkZXJDb250ZXh0KHRoaXMub3B0aW9ucy5pbmRleEZpbGUpIGFzIGFueSk7XG5cdFx0XHRjb25zdCBhc3RzID0gbmV3IFRlbXBsYXRlUGFyc2VyKHNvdXJjZSkucGFyc2UoKTtcblx0XHRcdGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcblx0XHRcdFx0aWYgKGFzdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICYmIGFzdC5hdHRycykge1xuXHRcdFx0XHRcdGNvbnN0IHNyY1VybCA9IF8uZ2V0KGFzdC5hdHRycy5zcmMgfHwgYXN0LmF0dHJzLlNSQywgJ3ZhbHVlJyk7XG5cdFx0XHRcdFx0aWYgKHNyY1VybCA9PSBudWxsKVxuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0Ly8gbG9nLndhcm4oJ3NyY1VybCcsIHNyY1VybC50ZXh0KTtcblx0XHRcdFx0XHRjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwudGV4dCk7XG5cdFx0XHRcdFx0aWYgKG1hdGNoICYmIHRoaXMuaW5saW5lQ2h1bmtTZXQuaGFzKG1hdGNoWzFdKSkge1xuXHRcdFx0XHRcdFx0cmVwbGFjZW1lbnRzLnB1c2goe1xuXHRcdFx0XHRcdFx0XHRzdGFydDogYXN0LnN0YXJ0LCBlbmQ6IGFzdC5lbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBzbVVybC5yZW1vdmVGcm9tKGNvbXBpbGF0aW9uLmFzc2V0c1ttYXRjaFswXV0uc291cmNlKCkpXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGxvZy5pbmZvKGBJbmxpbmUgY2h1bmsgXCIke21hdGNoWzFdfVwiIGluIDpgLCB0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdID0gbmV3IFJhd1NvdXJjZShcblx0XHRcdFx0XHRyZXBsYWNlQ29kZShzb3VyY2UsIHJlcGxhY2VtZW50cykpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Y29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXSA9IG5ldyBSYXdTb3VyY2Uoc291cmNlKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdC8vIHJlcGxhY2VTY3JpcHRUYWcocmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdLCBzcmM6IHN0cmluZywgc3RhcnQ6IG51bWJlciwgZW5kOiBudW1iZXIpIHtcblx0Ly8gXHRyZXBsYWNlbWVudHMucHVzaCh7XG5cdC8vIFx0XHRzdGFydCwgZW5kLCB0ZXh0OiAnPHNjcmlwdD4nICsgc3JjXG5cdC8vIFx0fSk7XG5cdC8vIH1cbn1cbiJdfQ==
