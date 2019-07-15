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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUNyQixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNsRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMscUVBQXFFLElBQUksR0FBRztZQUM3RixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDMUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQWtCO1FBQ3RCLHVFQUF1RTtRQUN2RSw4QkFBOEI7UUFDOUIsTUFBTTtRQUNOLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFNLFdBQVcsRUFBQyxFQUFFO1lBQzNFLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxHQUFXLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7WUFDMUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztnQkFDZixHQUFHLEVBQUgsZUFBRztnQkFDSCxPQUFPO2FBQ1IsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQzFDLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQVEsQ0FBQyxDQUFDO1lBQ3hELE1BQU0sSUFBSSxHQUFHLElBQUksK0JBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRTtnQkFDdEIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsS0FBSyxFQUFFO29CQUNwRCxNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM5RCxJQUFJLE1BQU0sSUFBSSxJQUFJO3dCQUNoQixTQUFTO29CQUNYLG1DQUFtQztvQkFDbkMsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDekQsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7d0JBQzlDLFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2hCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO3lCQUMzRyxDQUFDLENBQUM7d0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztxQkFDckU7aUJBQ0Y7YUFDRjtZQUNELElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7Z0JBQzNCLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUN0RCxvQkFBVyxDQUFDLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO2FBQ3RDO2lCQUFNO2dCQUNMLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ2xFO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FPRjtBQXZERCxrQ0F1REMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHtUZW1wbGF0ZVBhcnNlcn0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGh0bWxMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5pbmRleC1odG1sLXBsdWdpbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4SHRtbFBsdWdpbk9wdGlvbnMge1xuICBpbmRleEZpbGU6IHN0cmluZztcbiAgaW5saW5lQ2h1bmtOYW1lczogc3RyaW5nW107XG59XG5cbmNsYXNzIE1vY2tMb2FkZXJDb250ZXh0IHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlc291cmNlUGF0aDogc3RyaW5nKSB7fVxuXG4gIGxvYWRNb2R1bGUocGF0aDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogRXJyb3IsIHNvdXJjZT86IGFueSwgc291cmNlTWFwPzogYW55LCBtb2R1bGU/OiBhbnkpID0+IHZvaWQpIHtcbiAgICBjYWxsYmFjayhuZXcgRXJyb3IoYGluZGV4Lmh0bWwgZG9lcyBub3Qgc3VwcG9ydCByZXF1ZXN0aW5nIHJlbGF0aXZlIHJlc291cmNlIFVSTCBsaWtlICR7cGF0aH0uYCArXG4gICAgICAnb25seSBzdXBwb3J0cyByZXNvdXJjZSB1cmwgaW4gZm9ybSBvZiA6IDxhc3NldHN8cGFnZT46Ly88cGFja2FnZS1uYW1lPi88cmVzb3VyY2U+JykpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEluZGV4SHRtbFBsdWdpbiB7XG4gIGlubGluZUNodW5rU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGluZGV4T3V0cHV0UGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBvcHRpb25zOiBJbmRleEh0bWxQbHVnaW5PcHRpb25zKSB7XG4gICAgdGhpcy5pbmRleE91dHB1dFBhdGggPSBQYXRoLmJhc2VuYW1lKHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBvcHRpb25zLmlubGluZUNodW5rTmFtZXMpIHtcbiAgICAgIHRoaXMuaW5saW5lQ2h1bmtTZXQuYWRkKG5hbWUpO1xuICAgIH1cbiAgfVxuICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICAvLyBjb21waWxlci5ob29rcy53YXRjaFJ1bi50YXBQcm9taXNlKCdkcmNwLWRlYnVnJywgYXN5bmMgY29tcGlsZXIgPT4ge1xuICAgIC8vIFx0Y29uc29sZS5sb2coJ3dhdGNoIHJ1biAnKTtcbiAgICAvLyB9KTtcbiAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtaW5kZXgtaHRtbC1wbHVnaW4nLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG4gICAgICBjb25zdCBodG1sU3JjID0gY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXTtcbiAgICAgIGxldCBzb3VyY2U6IHN0cmluZyA9IGh0bWxTcmMuc291cmNlKCk7XG4gICAgICBjb25zdCBjb21waWxlID0gXy50ZW1wbGF0ZShzb3VyY2UpO1xuICAgICAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gICAgICBzb3VyY2UgPSBjb21waWxlKHtcbiAgICAgICAgYXBpLFxuICAgICAgICByZXF1aXJlXG4gICAgICB9KTtcbiAgICAgIHNvdXJjZSA9IGF3YWl0IGh0bWxMb2FkZXIuY29tcGlsZUh0bWwoc291cmNlLFxuICAgICAgICBuZXcgTW9ja0xvYWRlckNvbnRleHQodGhpcy5vcHRpb25zLmluZGV4RmlsZSkgYXMgYW55KTtcbiAgICAgIGNvbnN0IGFzdHMgPSBuZXcgVGVtcGxhdGVQYXJzZXIoc291cmNlKS5wYXJzZSgpO1xuICAgICAgZm9yIChjb25zdCBhc3Qgb2YgYXN0cykge1xuICAgICAgICBpZiAoYXN0Lm5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3NjcmlwdCcgJiYgYXN0LmF0dHJzKSB7XG4gICAgICAgICAgY29uc3Qgc3JjVXJsID0gXy5nZXQoYXN0LmF0dHJzLnNyYyB8fCBhc3QuYXR0cnMuU1JDLCAndmFsdWUnKTtcbiAgICAgICAgICBpZiAoc3JjVXJsID09IG51bGwpXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAvLyBsb2cud2Fybignc3JjVXJsJywgc3JjVXJsLnRleHQpO1xuICAgICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybC50ZXh0KTtcbiAgICAgICAgICBpZiAobWF0Y2ggJiYgdGhpcy5pbmxpbmVDaHVua1NldC5oYXMobWF0Y2hbMV0pKSB7XG4gICAgICAgICAgICByZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICAgICAgICAgIHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIHNtVXJsLnJlbW92ZUZyb20oY29tcGlsYXRpb24uYXNzZXRzW21hdGNoWzBdXS5zb3VyY2UoKSlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbG9nLmluZm8oYElubGluZSBjaHVuayBcIiR7bWF0Y2hbMV19XCIgaW4gOmAsIHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKFxuICAgICAgICAgIHJlcGxhY2VDb2RlKHNvdXJjZSwgcmVwbGFjZW1lbnRzKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdID0gbmV3IFJhd1NvdXJjZShzb3VyY2UpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLy8gcmVwbGFjZVNjcmlwdFRhZyhyZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10sIHNyYzogc3RyaW5nLCBzdGFydDogbnVtYmVyLCBlbmQ6IG51bWJlcikge1xuICAvLyBcdHJlcGxhY2VtZW50cy5wdXNoKHtcbiAgLy8gXHRcdHN0YXJ0LCBlbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBzcmNcbiAgLy8gXHR9KTtcbiAgLy8gfVxufVxuIl19
