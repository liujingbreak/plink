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
                source = patch_text_1.default(source, replacements);
            }
            // log.warn(source);
            source = yield htmlLoader.compileHtml(source, new MockLoaderContext(this.options.indexFile));
            compilation.assets[this.indexOutputPath] = new RawSource(source);
        }));
    }
}
exports.default = IndexHtmlPlugin;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzdCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQU9oRixNQUFNLGlCQUFpQjtJQUNyQixZQUFtQixZQUFvQjtRQUFwQixpQkFBWSxHQUFaLFlBQVksQ0FBUTtJQUFHLENBQUM7SUFFM0MsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxDQUFDLFFBQWtCO1FBQ3RCLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFNLFdBQVcsRUFBQyxFQUFFO1lBQzNFLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3pELElBQUksTUFBTSxHQUFXLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ25DLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7WUFDMUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztnQkFDZixHQUFHLEVBQUgsZUFBRztnQkFDSCxPQUFPO2FBQ1IsQ0FBQyxDQUFDO1lBRUgsTUFBTSxJQUFJLEdBQUcsSUFBSSwrQkFBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2hELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO2dCQUN0QixJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxLQUFLLEVBQUU7b0JBQ3BELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzlELElBQUksTUFBTSxJQUFJLElBQUk7d0JBQ2hCLFNBQVM7b0JBQ1gsbUNBQW1DO29CQUNuQyxNQUFNLEtBQUssR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN6RCxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTt3QkFDOUMsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFDaEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7eUJBQzNHLENBQUMsQ0FBQzt3QkFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO3FCQUNyRTtpQkFDRjthQUNGO1lBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtnQkFDM0IsTUFBTSxHQUFHLG9CQUFXLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFDO2FBQzVDO1lBRUQsb0JBQW9CO1lBRXBCLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUMxQyxJQUFJLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFRLENBQUMsQ0FBQztZQUV4RCxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBakRELGtDQWlEQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbi8qKlxuICogU2FtZSBmdW5jdGlvbiBhcyByZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luLCBidXQgZG9lcyBub3QgcmVseSBvbiBIdG1sV2VicGFja1BsdWdpblxuICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHtUZW1wbGF0ZVBhcnNlcn0gZnJvbSAnLi4vdXRpbHMvbmctaHRtbC1wYXJzZXInO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGh0bWxMb2FkZXIgPSByZXF1aXJlKCcuLi9sb2FkZXJzL25nLWh0bWwtbG9hZGVyJyk7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5pbmRleC1odG1sLXBsdWdpbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4SHRtbFBsdWdpbk9wdGlvbnMge1xuICBpbmRleEZpbGU6IHN0cmluZztcbiAgaW5saW5lQ2h1bmtOYW1lczogc3RyaW5nW107XG59XG5cbmNsYXNzIE1vY2tMb2FkZXJDb250ZXh0IHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlc291cmNlUGF0aDogc3RyaW5nKSB7fVxuXG4gIGxvYWRNb2R1bGUocGF0aDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogRXJyb3IsIHNvdXJjZT86IGFueSwgc291cmNlTWFwPzogYW55LCBtb2R1bGU/OiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihgaW5kZXguaHRtbCBkb2VzIG5vdCBzdXBwb3J0IHJlcXVlc3RpbmcgcmVsYXRpdmUgcmVzb3VyY2UgVVJMIGxpa2UgXCIke3BhdGh9XCIuYCArXG4gICAgICAgICdvbmx5IHN1cHBvcnRzIHJlc291cmNlIHVybCBpbiBmb3JtIG9mIDogPGFzc2V0c3xwYWdlPjovLzxwYWNrYWdlLW5hbWU+LzxyZXNvdXJjZT4nKSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW5kZXhIdG1sUGx1Z2luIHtcbiAgaW5saW5lQ2h1bmtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgaW5kZXhPdXRwdXRQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIG9wdGlvbnM6IEluZGV4SHRtbFBsdWdpbk9wdGlvbnMpIHtcbiAgICB0aGlzLmluZGV4T3V0cHV0UGF0aCA9IFBhdGguYmFzZW5hbWUodGhpcy5vcHRpb25zLmluZGV4RmlsZSk7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG9wdGlvbnMuaW5saW5lQ2h1bmtOYW1lcykge1xuICAgICAgdGhpcy5pbmxpbmVDaHVua1NldC5hZGQobmFtZSk7XG4gICAgfVxuICB9XG4gIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwUHJvbWlzZSgnZHJjcC1pbmRleC1odG1sLXBsdWdpbicsIGFzeW5jIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgIGNvbnN0IGh0bWxTcmMgPSBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdO1xuICAgICAgbGV0IHNvdXJjZTogc3RyaW5nID0gaHRtbFNyYy5zb3VyY2UoKTtcbiAgICAgIGNvbnN0IGNvbXBpbGUgPSBfLnRlbXBsYXRlKHNvdXJjZSk7XG4gICAgICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcbiAgICAgIHNvdXJjZSA9IGNvbXBpbGUoe1xuICAgICAgICBhcGksXG4gICAgICAgIHJlcXVpcmVcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBhc3RzID0gbmV3IFRlbXBsYXRlUGFyc2VyKHNvdXJjZSkucGFyc2UoKTtcbiAgICAgIGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcbiAgICAgICAgaWYgKGFzdC5uYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzY3JpcHQnICYmIGFzdC5hdHRycykge1xuICAgICAgICAgIGNvbnN0IHNyY1VybCA9IF8uZ2V0KGFzdC5hdHRycy5zcmMgfHwgYXN0LmF0dHJzLlNSQywgJ3ZhbHVlJyk7XG4gICAgICAgICAgaWYgKHNyY1VybCA9PSBudWxsKVxuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgLy8gbG9nLndhcm4oJ3NyY1VybCcsIHNyY1VybC50ZXh0KTtcbiAgICAgICAgICBjb25zdCBtYXRjaCA9IC8oW14vLl0rKSg/OlxcLlteLy5dKykrJC8uZXhlYyhzcmNVcmwudGV4dCk7XG4gICAgICAgICAgaWYgKG1hdGNoICYmIHRoaXMuaW5saW5lQ2h1bmtTZXQuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgICAgICBzdGFydDogYXN0LnN0YXJ0LCBlbmQ6IGFzdC5lbmQsIHRleHQ6ICc8c2NyaXB0PicgKyBzbVVybC5yZW1vdmVGcm9tKGNvbXBpbGF0aW9uLmFzc2V0c1ttYXRjaFswXV0uc291cmNlKCkpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxvZy5pbmZvKGBJbmxpbmUgY2h1bmsgXCIke21hdGNoWzFdfVwiIGluIDpgLCB0aGlzLm9wdGlvbnMuaW5kZXhGaWxlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICBzb3VyY2UgPSByZXBsYWNlQ29kZShzb3VyY2UsIHJlcGxhY2VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGxvZy53YXJuKHNvdXJjZSk7XG5cbiAgICAgIHNvdXJjZSA9IGF3YWl0IGh0bWxMb2FkZXIuY29tcGlsZUh0bWwoc291cmNlLFxuICAgICAgICBuZXcgTW9ja0xvYWRlckNvbnRleHQodGhpcy5vcHRpb25zLmluZGV4RmlsZSkgYXMgYW55KTtcblxuICAgICAgY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXSA9IG5ldyBSYXdTb3VyY2Uoc291cmNlKTtcbiAgICB9KTtcbiAgfVxufVxuIl19
