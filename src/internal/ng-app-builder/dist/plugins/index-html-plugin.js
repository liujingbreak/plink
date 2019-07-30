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
        const asts = new ng_html_parser_1.TemplateParser(html).parse();
        for (const ast of asts) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9wbHVnaW5zL2luZGV4LWh0bWwtcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUtBLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUNqRCw0REFBdUQ7QUFDdkQsa0RBQTRCO0FBQzVCLDZFQUFnRTtBQUNoRSx3REFBeUQ7QUFDekQsbURBQTZCO0FBQzNCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzFDLDBEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsb0JBQW9CLENBQUMsQ0FBQztBQVFoRixNQUFNLGlCQUFpQjtJQUVyQjtRQURBLGlCQUFZLEdBQUcsRUFBRSxDQUFDLENBQUMsOEJBQThCO0lBQ2xDLENBQUM7SUFFaEIsVUFBVSxDQUFDLElBQVksRUFBRSxRQUEyRTtRQUNoRyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsc0VBQXNFLElBQUksSUFBSTtZQUMvRixtRkFBbUYsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztDQUNGO0FBRUQsTUFBcUIsZUFBZTtJQUlsQyxZQUFtQixPQUErQjtRQUEvQixZQUFPLEdBQVAsT0FBTyxDQUF3QjtRQUhsRCxtQkFBYyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJakMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDN0QsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLENBQUMsZ0JBQWdCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7SUFDSCxDQUFDO0lBQ0QsS0FBSyxD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RyxJQUFJLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUTtvQkFDeEIsU0FBUztnQkFDWCxNQUFNLElBQUksR0FBdUIsQ0FBQyxDQUFDLEdBQUcsQ0FBVyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDM0UsSUFBSSxJQUFJLEtBQUssWUFBWSxDQUFDLFFBQVMsRUFBRTtvQkFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEQsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsWUFBWSw0REFBNEQsWUFBWSxDQUFDLFFBQVEsT0FBTzt3QkFDbkksc0JBQXNCLFlBQVksb0RBQW9ELENBQUMsQ0FBQztpQkFDM0Y7YUFDRjtZQUNELCtCQUErQjtTQUNoQztRQUNELElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQzFDLE1BQU0sR0FBRyxHQUFHLG9HQUFvRyxDQUFDO1lBQ2pILEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdEI7UUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQzNCLElBQUksR0FBRyxvQkFBVyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztTQUN4QztRQUNELGtCQUFrQjtRQUNsQixPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FBQTtBQXJERCxzQ0FxREMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvcGx1Z2lucy9pbmRleC1odG1sLXBsdWdpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1jbGFzc2VzLXBlci1maWxlICovXG4vKipcbiAqIFNhbWUgZnVuY3Rpb24gYXMgcmVhY3QtZGV2LXV0aWxzL0lubGluZUNodW5rSHRtbFBsdWdpbiwgYnV0IGRvZXMgbm90IHJlbHkgb24gSHRtbFdlYnBhY2tQbHVnaW5cbiAqL1xuaW1wb3J0IHsgQ29tcGlsZXIgfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IHsgUmF3U291cmNlIH0gPSByZXF1aXJlKCd3ZWJwYWNrLXNvdXJjZXMnKTtcbmltcG9ydCB7VGVtcGxhdGVQYXJzZXJ9IGZyb20gJy4uL3V0aWxzL25nLWh0bWwtcGFyc2VyJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBodG1sTG9hZGVyID0gcmVxdWlyZSgnLi4vbG9hZGVycy9uZy1odG1sLWxvYWRlcicpO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbiAgY29uc3Qgc21VcmwgPSByZXF1aXJlKCdzb3VyY2UtbWFwLXVybCcpO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5pbmRleC1odG1sLXBsdWdpbicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluZGV4SHRtbFBsdWdpbk9wdGlvbnMge1xuICBpbmRleEZpbGU6IHN0cmluZztcbiAgaW5saW5lQ2h1bmtOYW1lczogc3RyaW5nW107XG4gIGJhc2VIcmVmPzogc3RyaW5nO1xufVxuXG5jbGFzcyBNb2NrTG9hZGVyQ29udGV4dCB7XG4gIHJlc291cmNlUGF0aCA9ICcnOyAvLyBUbyBvdmVycmlkZSBzdXBlciBpbnRlcmZhY2VcbiAgY29uc3RydWN0b3IoKSB7fVxuXG4gIGxvYWRNb2R1bGUocGF0aDogc3RyaW5nLCBjYWxsYmFjazogKGVycjogRXJyb3IsIHNvdXJjZT86IGFueSwgc291cmNlTWFwPzogYW55LCBtb2R1bGU/OiBhbnkpID0+IHZvaWQpIHtcbiAgICAgIGNhbGxiYWNrKG5ldyBFcnJvcihgaW5kZXguaHRtbCBkb2VzIG5vdCBzdXBwb3J0IHJlcXVlc3RpbmcgcmVsYXRpdmUgcmVzb3VyY2UgVVJMIGxpa2UgXCIke3BhdGh9XCIuYCArXG4gICAgICAgICdvbmx5IHN1cHBvcnRzIHJlc291cmNlIHVybCBpbiBmb3JtIG9mIDogPGFzc2V0c3xwYWdlPjovLzxwYWNrYWdlLW5hbWU+LzxyZXNvdXJjZT4nKSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW5kZXhIdG1sUGx1Z2luIHtcbiAgaW5saW5lQ2h1bmtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgaW5kZXhPdXRwdXRQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IocHVibGljIG9wdGlvbnM6IEluZGV4SHRtbFBsdWdpbk9wdGlvbnMpIHtcbiAgICB0aGlzLmluZGV4T3V0cHV0UGF0aCA9IFBhdGguYmFzZW5hbWUodGhpcy5vcHRpb25zLmluZGV4RmlsZSk7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIG9wdGlvbnMuaW5saW5lQ2h1bmtOYW1lcykge1xuICAgICAgdGhpcy5pbmxpbmVDaHVua1NldC5hZGQobmFtZSk7XG4gICAgfVxuICB9XG4gIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcikge1xuICAgIGNvbXBpbGVyLmhvb2tzLmVtaXQudGFwUHJvbWlzZSgnZHJjcC1pbmRleC1odG1sLXBsdWdpbicsIGFzeW5jIGNvbXBpbGF0aW9uID0+IHtcbiAgICAgIGNvbnN0IGh0bWxTcmMgPSBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdO1xuICAgICAgbGV0IHNvdXJjZTogc3RyaW5nID0gaHRtbFNyYy5zb3VyY2UoKTtcbiAgICAgIHNvdXJjZSA9IGF3YWl0IHRyYW5zZm9ybUh0bWwoc291cmNlLCB7YmFzZUhyZWY6IHRoaXMub3B0aW9ucy5iYXNlSHJlZn0sIChzcmNVcmwpID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSAvKFteLy5dKykoPzpcXC5bXi8uXSspKyQvLmV4ZWMoc3JjVXJsKTtcbiAgICAgICAgaWYgKG1hdGNoICYmIHRoaXMuaW5saW5lQ2h1bmtTZXQuaGFzKG1hdGNoWzFdKSkge1xuICAgICAgICAgIHJldHVybiBzbVVybC5yZW1vdmVGcm9tKGNvbXBpbGF0aW9uLmFzc2V0c1ttYXRjaFswXV0uc291cmNlKCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSk7XG5cbiAgICAgIGNvbXBpbGF0aW9uLmFzc2V0c1t0aGlzLmluZGV4T3V0cHV0UGF0aF0gPSBuZXcgUmF3U291cmNlKHNvdXJjZSk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYW5zZm9ybUh0bWwodGhpczogdm9pZCxcbiAgaHRtbDogc3RyaW5nLFxuICBidWlsZE9wdGlvbnM6IHtiYXNlSHJlZj86IHN0cmluZ30sXG4gIGlubGluZVJlcGxhY2U6IChzcmNVcmw6IHN0cmluZykgPT4gc3RyaW5nIHwgbnVsbCB8IHZvaWQpIHtcblxuICBjb25zdCBjb21waWxlID0gXy50ZW1wbGF0ZShodG1sKTtcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG4gIGh0bWwgPSBjb21waWxlKHtcbiAgICBhcGksXG4gICAgcmVxdWlyZVxuICB9KTtcbiAgLy8gRm9sbG93aW5nIGxpbmUgbXVzdCBiZSBwcmlvciB0byBgVGVtcGxhdGVQYXJzZXIucGFyc2UoKWAsIFRlbXBsYXRlUGFyc2VyXG4gIC8vIGhhcyBsaW1pdGF0aW9uIGluIHBhcnNpbmcgYDxzY3JpcHQ+aW5saW5lIGNvZGUgLi4uPC9zY3JpcHQ+YFxuICBodG1sID0gYXdhaXQgaHRtbExvYWRlci5jb21waWxlSHRtbChodG1sLCBuZXcgTW9ja0xvYWRlckNvbnRleHQoKSk7XG4gIGxldCBoYXNCYXNlSHJlZiA9IGZhbHNlO1xuICBjb25zdCBhc3RzID0gbmV3IFRlbXBsYXRlUGFyc2VyKGh0bWwpLnBhcnNlKCk7XG4gIGZvciAoY29uc3QgYXN0IG9mIGFzdHMpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gYXN0Lm5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBhdHRycyA9IGFzdC5hdHRycztcbiAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcgJiYgYXR0cnMpIHtcbiAgICAgIGNvbnN0IHNyY1VybCA9IF8uZ2V0KGF0dHJzLnNyYyB8fCBhdHRycy5TUkMsICd2YWx1ZScpO1xuICAgICAgaWYgKHNyY1VybCA9PSBudWxsKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlubGluZUNvbnRlbnQgPSBpbmxpbmVSZXBsYWNlKHNyY1VybC50ZXh0KTtcbiAgICAgIGlmIChpbmxpbmVDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIGlubGluZUNvbnRlbnRcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZy5pbmZvKGBJbmxpbmUgXCIke3NyY1VybC50ZXh0fVwiYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0YWdOYW1lID09PSAnYmFzZScpIHtcbiAgICAgIGhhc0Jhc2VIcmVmID0gdHJ1ZTtcbiAgICAgIGlmICghYnVpbGRPcHRpb25zLmJhc2VIcmVmKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhyZWY6IHN0cmluZyB8IHVuZGVmaW5lZCA9IF8uZ2V0PGFueSwgYW55PihhdHRycywgJ2hyZWYudmFsdWUudGV4dCcpO1xuICAgICAgaWYgKGhyZWYgIT09IGJ1aWxkT3B0aW9ucy5iYXNlSHJlZiEpIHtcbiAgICAgICAgY29uc3QgYmFzZUhyZWZIdG1sID0gaHRtbC5zbGljZShhc3Quc3RhcnQsIGFzdC5lbmQpO1xuICAgICAgICBsb2cuZXJyb3IoYEluIHlvdXIgaW5kZXggSFRNTCwgJHtiYXNlSHJlZkh0bWx9IGlzIGluY29uc2lzdGVudCB0byBBbmd1bGFyIGNsaSBjb25maWd1cmF0aW9uICdiYXNlSHJlZj1cIiR7YnVpbGRPcHRpb25zLmJhc2VIcmVmfVwiJyxcXG5gICtcbiAgICAgICAgICBgeW91IG5lZWQgdG8gcmVtb3ZlICR7YmFzZUhyZWZIdG1sfSBmcm9tIGluZGV4IEhUTUwgZmlsZSwgbGV0IEFuZ3VsYXIgaW5zZXJ0IGZvciB5b3UuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKHRhZ05hbWUsIGF0dHJzKTtcbiAgfVxuICBpZiAoIWhhc0Jhc2VIcmVmICYmICFidWlsZE9wdGlvbnMuYmFzZUhyZWYpIHtcbiAgICBjb25zdCBtc2cgPSAnVGhlcmUgaXMgbmVpdGhlciA8YmFzZSBocmVmPiB0YWcgaW4gaW5kZXggSFRNTCwgbm9yIEFuZ3VsYXIgY2xpIGNvbmZpZ3VyYXRpb24gXCJiYXNlSHJlZlwiIGJlaW5nIHNldCc7XG4gICAgbG9nLmVycm9yKCdFcnJvcjonLCBtc2cpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGh0bWwgPSByZXBsYWNlQ29kZShodG1sLCByZXBsYWNlbWVudHMpO1xuICB9XG4gIC8vIGxvZy53YXJuKGh0bWwpO1xuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==
