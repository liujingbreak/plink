"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformHtml = void 0;
const { RawSource } = require('webpack-sources');
const ng_html_parser_1 = __importDefault(require("../utils/ng-html-parser"));
const _ = __importStar(require("lodash"));
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const htmlLoader = require("../loaders/ng-html-loader");
const Path = __importStar(require("path"));
const smUrl = require('source-map-url');
const __api_1 = __importDefault(require("__api"));
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
        compiler.hooks.emit.tapPromise('drcp-index-html-plugin', (compilation) => __awaiter(this, void 0, void 0, function* () {
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
    return __awaiter(this, void 0, void 0, function* () {
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
        const parsed = ng_html_parser_1.default(html);
        for (const comment of parsed.comments) {
            replacements.push({
                start: comment.pos,
                end: comment.end,
                text: ''
            });
        }
        for (const ast of parsed.tags) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1wbHVnaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC1odG1sLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBS0EsTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQ2pELDZFQUFnRDtBQUNoRCwwQ0FBNEI7QUFDNUIscUVBQWdFO0FBQ2hFLHdEQUF5RDtBQUN6RCwyQ0FBNkI7QUFDM0IsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDMUMsa0RBQXdCO0FBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxvQkFBb0IsQ0FBQyxDQUFDO0FBUWhGLE1BQU0saUJBQWlCO0lBRXJCO1FBREEsaUJBQVksR0FBRyxFQUFFLENBQUMsQ0FBQyw4QkFBOEI7SUFDbEMsQ0FBQztJQUVoQixVQUFVLENBQUMsSUFBWSxFQUFFLFFBQTJFO1FBQ2hHLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyxzRUFBc0UsSUFBSSxJQUFJO1lBQy9GLG1GQUFtRixDQUFDLENBQUMsQ0FBQztJQUM1RixDQUFDO0NBQ0Y7QUFFRCxNQUFxQixlQUFlO0lBSWxDLFlBQW1CLE9BQStCO1FBQS9CLFlBQU8sR0FBUCxPQUFPLENBQXdCO1FBSGxELG1CQUFjLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUlqQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM3RCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUMvQjtJQUNILENBQUM7SUFDRCxLQUFLLENBQUMsUUFBa0I7UUFDdEIsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLHdCQUF3QixFQUFFLENBQU0sV0FBVyxFQUFDLEVBQUU7WUFDM0UsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDekQsSUFBSSxNQUFNLEdBQVcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3RDLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxNQUFNLEVBQUUsRUFBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRixNQUFNLEtBQUssR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BELElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUM5QyxPQUFPLEtBQUssQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO2lCQUNoRTtnQkFDRCxPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1lBRUgsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDbkUsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXpCRCxrQ0F5QkM7QUFFRCxTQUFzQixhQUFhLENBQ2pDLElBQVksRUFDWixZQUFpQyxFQUNqQyxhQUF1RDs7UUFFdkQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO1FBQzFDLElBQUksR0FBRyxPQUFPLENBQUM7WUFDYixHQUFHLEVBQUgsZUFBRztZQUNILE9BQU87U0FDUixDQUFDLENBQUM7UUFDSCwyRUFBMkU7UUFDM0UsK0RBQStEO1FBQy9ELElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztRQUN4QixNQUFNLE1BQU0sR0FBRyx3QkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLEtBQUssTUFBTSxPQUFPLElBQUksTUFBTSxDQUFDLFFBQVEsRUFBRTtZQUNyQyxZQUFZLENBQUMsSUFBSSxDQUFDO2dCQUNoQixLQUFLLEVBQUUsT0FBTyxDQUFDLEdBQUc7Z0JBQ2xCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztnQkFDaEIsSUFBSSxFQUFFLEVBQUU7YUFDVCxDQUFDLENBQUM7U0FDSjtRQUNELEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRTtZQUM3QixNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUM7WUFDeEIsSUFBSSxPQUFPLEtBQUssUUFBUSxJQUFJLEtBQUssRUFBRTtnQkFDakMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3RELElBQUksTUFBTSxJQUFJLElBQUk7b0JBQ2hCLFNBQVM7Z0JBQ1gsTUFBTSxhQUFhLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDakQsSUFBSSxhQUFhLElBQUksSUFBSSxFQUFFO29CQUN6QixZQUFZLENBQUMsSUFBSSxDQUFDO3dCQUNoQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsVUFBVSxHQUFHLGFBQWE7cUJBQ2pFLENBQUMsQ0FBQztvQkFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7aUJBQ3JDO2FBQ0Y7aUJBQU0sSUFBSSxPQUFPLEtBQUssTUFBTSxFQUFFO2dCQUM3QixXQUFXLEdBQUcsSUFBSSxDQUFDO2dCQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVE7b0JBQ3hCLFNBQVM7Z0JBQ1gsTUFBTSxJQUFJLEdBQXVCLENBQUMsQ0FBQyxHQUFHLENBQVcsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUM7Z0JBQzNFLElBQUksSUFBSSxLQUFLLFlBQVksQ0FBQyxRQUFTLEVBQUU7b0JBQ25DLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3BELEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLFlBQVksNERBQTRELFlBQVksQ0FBQyxRQUFRLE9BQU87d0JBQ25JLHNCQUFzQixZQUFZLG9EQUFvRCxDQUFDLENBQUM7aUJBQzNGO2FBQ0Y7WUFDRCwrQkFBK0I7U0FDaEM7UUFDRCxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRTtZQUMxQyxNQUFNLEdBQUcsR0FBRyxvR0FBb0csQ0FBQztZQUNqSCxHQUFHLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3RCO1FBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUMzQixJQUFJLEdBQUcsb0JBQVcsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7U0FDeEM7UUFDRCxrQkFBa0I7UUFDbEIsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQUE7QUE1REQsc0NBNERDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWNsYXNzZXMtcGVyLWZpbGUgKi9cbi8qKlxuICogU2FtZSBmdW5jdGlvbiBhcyByZWFjdC1kZXYtdXRpbHMvSW5saW5lQ2h1bmtIdG1sUGx1Z2luLCBidXQgZG9lcyBub3QgcmVseSBvbiBIdG1sV2VicGFja1BsdWdpblxuICovXG5pbXBvcnQgeyBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgeyBSYXdTb3VyY2UgfSA9IHJlcXVpcmUoJ3dlYnBhY2stc291cmNlcycpO1xuaW1wb3J0IHBhcnNlSHRtbCBmcm9tICcuLi91dGlscy9uZy1odG1sLXBhcnNlcic7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgaHRtbExvYWRlciA9IHJlcXVpcmUoJy4uL2xvYWRlcnMvbmctaHRtbC1sb2FkZXInKTtcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4gIGNvbnN0IHNtVXJsID0gcmVxdWlyZSgnc291cmNlLW1hcC11cmwnKTtcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuaW5kZXgtaHRtbC1wbHVnaW4nKTtcblxuZXhwb3J0IGludGVyZmFjZSBJbmRleEh0bWxQbHVnaW5PcHRpb25zIHtcbiAgaW5kZXhGaWxlOiBzdHJpbmc7XG4gIGlubGluZUNodW5rTmFtZXM6IHN0cmluZ1tdO1xuICBiYXNlSHJlZj86IHN0cmluZztcbn1cblxuY2xhc3MgTW9ja0xvYWRlckNvbnRleHQge1xuICByZXNvdXJjZVBhdGggPSAnJzsgLy8gVG8gb3ZlcnJpZGUgc3VwZXIgaW50ZXJmYWNlXG4gIGNvbnN0cnVjdG9yKCkge31cblxuICBsb2FkTW9kdWxlKHBhdGg6IHN0cmluZywgY2FsbGJhY2s6IChlcnI6IEVycm9yLCBzb3VyY2U/OiBhbnksIHNvdXJjZU1hcD86IGFueSwgbW9kdWxlPzogYW55KSA9PiB2b2lkKSB7XG4gICAgICBjYWxsYmFjayhuZXcgRXJyb3IoYGluZGV4Lmh0bWwgZG9lcyBub3Qgc3VwcG9ydCByZXF1ZXN0aW5nIHJlbGF0aXZlIHJlc291cmNlIFVSTCBsaWtlIFwiJHtwYXRofVwiLmAgK1xuICAgICAgICAnb25seSBzdXBwb3J0cyByZXNvdXJjZSB1cmwgaW4gZm9ybSBvZiA6IDxhc3NldHN8cGFnZT46Ly88cGFja2FnZS1uYW1lPi88cmVzb3VyY2U+JykpO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIEluZGV4SHRtbFBsdWdpbiB7XG4gIGlubGluZUNodW5rU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGluZGV4T3V0cHV0UGF0aDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKHB1YmxpYyBvcHRpb25zOiBJbmRleEh0bWxQbHVnaW5PcHRpb25zKSB7XG4gICAgdGhpcy5pbmRleE91dHB1dFBhdGggPSBQYXRoLmJhc2VuYW1lKHRoaXMub3B0aW9ucy5pbmRleEZpbGUpO1xuICAgIGZvciAoY29uc3QgbmFtZSBvZiBvcHRpb25zLmlubGluZUNodW5rTmFtZXMpIHtcbiAgICAgIHRoaXMuaW5saW5lQ2h1bmtTZXQuYWRkKG5hbWUpO1xuICAgIH1cbiAgfVxuICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICBjb21waWxlci5ob29rcy5lbWl0LnRhcFByb21pc2UoJ2RyY3AtaW5kZXgtaHRtbC1wbHVnaW4nLCBhc3luYyBjb21waWxhdGlvbiA9PiB7XG4gICAgICBjb25zdCBodG1sU3JjID0gY29tcGlsYXRpb24uYXNzZXRzW3RoaXMuaW5kZXhPdXRwdXRQYXRoXTtcbiAgICAgIGxldCBzb3VyY2U6IHN0cmluZyA9IGh0bWxTcmMuc291cmNlKCk7XG4gICAgICBzb3VyY2UgPSBhd2FpdCB0cmFuc2Zvcm1IdG1sKHNvdXJjZSwge2Jhc2VIcmVmOiB0aGlzLm9wdGlvbnMuYmFzZUhyZWZ9LCAoc3JjVXJsKSA9PiB7XG4gICAgICAgIGNvbnN0IG1hdGNoID0gLyhbXi8uXSspKD86XFwuW14vLl0rKSskLy5leGVjKHNyY1VybCk7XG4gICAgICAgIGlmIChtYXRjaCAmJiB0aGlzLmlubGluZUNodW5rU2V0LmhhcyhtYXRjaFsxXSkpIHtcbiAgICAgICAgICByZXR1cm4gc21VcmwucmVtb3ZlRnJvbShjb21waWxhdGlvbi5hc3NldHNbbWF0Y2hbMF1dLnNvdXJjZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgICBjb21waWxhdGlvbi5hc3NldHNbdGhpcy5pbmRleE91dHB1dFBhdGhdID0gbmV3IFJhd1NvdXJjZShzb3VyY2UpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB0cmFuc2Zvcm1IdG1sKHRoaXM6IHZvaWQsXG4gIGh0bWw6IHN0cmluZyxcbiAgYnVpbGRPcHRpb25zOiB7YmFzZUhyZWY/OiBzdHJpbmd9LFxuICBpbmxpbmVSZXBsYWNlOiAoc3JjVXJsOiBzdHJpbmcpID0+IHN0cmluZyB8IG51bGwgfCB2b2lkKSB7XG5cbiAgY29uc3QgY29tcGlsZSA9IF8udGVtcGxhdGUoaHRtbCk7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuICBodG1sID0gY29tcGlsZSh7XG4gICAgYXBpLFxuICAgIHJlcXVpcmVcbiAgfSk7XG4gIC8vIEZvbGxvd2luZyBsaW5lIG11c3QgYmUgcHJpb3IgdG8gYFRlbXBsYXRlUGFyc2VyLnBhcnNlKClgLCBUZW1wbGF0ZVBhcnNlclxuICAvLyBoYXMgbGltaXRhdGlvbiBpbiBwYXJzaW5nIGA8c2NyaXB0PmlubGluZSBjb2RlIC4uLjwvc2NyaXB0PmBcbiAgaHRtbCA9IGF3YWl0IGh0bWxMb2FkZXIuY29tcGlsZUh0bWwoaHRtbCwgbmV3IE1vY2tMb2FkZXJDb250ZXh0KCkpO1xuICBsZXQgaGFzQmFzZUhyZWYgPSBmYWxzZTtcbiAgY29uc3QgcGFyc2VkID0gcGFyc2VIdG1sKGh0bWwpO1xuICBmb3IgKGNvbnN0IGNvbW1lbnQgb2YgcGFyc2VkLmNvbW1lbnRzKSB7XG4gICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgc3RhcnQ6IGNvbW1lbnQucG9zLFxuICAgICAgZW5kOiBjb21tZW50LmVuZCxcbiAgICAgIHRleHQ6ICcnXG4gICAgfSk7XG4gIH1cbiAgZm9yIChjb25zdCBhc3Qgb2YgcGFyc2VkLnRhZ3MpIHtcbiAgICBjb25zdCB0YWdOYW1lID0gYXN0Lm5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBjb25zdCBhdHRycyA9IGFzdC5hdHRycztcbiAgICBpZiAodGFnTmFtZSA9PT0gJ3NjcmlwdCcgJiYgYXR0cnMpIHtcbiAgICAgIGNvbnN0IHNyY1VybCA9IF8uZ2V0KGF0dHJzLnNyYyB8fCBhdHRycy5TUkMsICd2YWx1ZScpO1xuICAgICAgaWYgKHNyY1VybCA9PSBudWxsKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlubGluZUNvbnRlbnQgPSBpbmxpbmVSZXBsYWNlKHNyY1VybC50ZXh0KTtcbiAgICAgIGlmIChpbmxpbmVDb250ZW50ICE9IG51bGwpIHtcbiAgICAgICAgcmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgICAgIHN0YXJ0OiBhc3Quc3RhcnQsIGVuZDogYXN0LmVuZCwgdGV4dDogJzxzY3JpcHQ+JyArIGlubGluZUNvbnRlbnRcbiAgICAgICAgfSk7XG4gICAgICAgIGxvZy5pbmZvKGBJbmxpbmUgXCIke3NyY1VybC50ZXh0fVwiYCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0YWdOYW1lID09PSAnYmFzZScpIHtcbiAgICAgIGhhc0Jhc2VIcmVmID0gdHJ1ZTtcbiAgICAgIGlmICghYnVpbGRPcHRpb25zLmJhc2VIcmVmKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGNvbnN0IGhyZWY6IHN0cmluZyB8IHVuZGVmaW5lZCA9IF8uZ2V0PGFueSwgYW55PihhdHRycywgJ2hyZWYudmFsdWUudGV4dCcpO1xuICAgICAgaWYgKGhyZWYgIT09IGJ1aWxkT3B0aW9ucy5iYXNlSHJlZiEpIHtcbiAgICAgICAgY29uc3QgYmFzZUhyZWZIdG1sID0gaHRtbC5zbGljZShhc3Quc3RhcnQsIGFzdC5lbmQpO1xuICAgICAgICBsb2cuZXJyb3IoYEluIHlvdXIgaW5kZXggSFRNTCwgJHtiYXNlSHJlZkh0bWx9IGlzIGluY29uc2lzdGVudCB0byBBbmd1bGFyIGNsaSBjb25maWd1cmF0aW9uICdiYXNlSHJlZj1cIiR7YnVpbGRPcHRpb25zLmJhc2VIcmVmfVwiJyxcXG5gICtcbiAgICAgICAgICBgeW91IG5lZWQgdG8gcmVtb3ZlICR7YmFzZUhyZWZIdG1sfSBmcm9tIGluZGV4IEhUTUwgZmlsZSwgbGV0IEFuZ3VsYXIgaW5zZXJ0IGZvciB5b3UuYCk7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIGNvbnNvbGUubG9nKHRhZ05hbWUsIGF0dHJzKTtcbiAgfVxuICBpZiAoIWhhc0Jhc2VIcmVmICYmICFidWlsZE9wdGlvbnMuYmFzZUhyZWYpIHtcbiAgICBjb25zdCBtc2cgPSAnVGhlcmUgaXMgbmVpdGhlciA8YmFzZSBocmVmPiB0YWcgaW4gaW5kZXggSFRNTCwgbm9yIEFuZ3VsYXIgY2xpIGNvbmZpZ3VyYXRpb24gXCJiYXNlSHJlZlwiIGJlaW5nIHNldCc7XG4gICAgbG9nLmVycm9yKCdFcnJvcjonLCBtc2cpO1xuICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICB9XG4gIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMCkge1xuICAgIGh0bWwgPSByZXBsYWNlQ29kZShodG1sLCByZXBsYWNlbWVudHMpO1xuICB9XG4gIC8vIGxvZy53YXJuKGh0bWwpO1xuICByZXR1cm4gaHRtbDtcbn1cbiJdfQ==