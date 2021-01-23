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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceForHtml = void 0;
const ng_html_parser_1 = __importDefault(require("../utils/ng-html-parser"));
const patch_text_1 = __importStar(require("../utils/patch-text"));
const __api_1 = __importDefault(require("__api"));
const url_1 = __importDefault(require("url"));
const _ = __importStar(require("lodash"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const chalk = require('chalk');
const log = require('log4js').getLogger('ng-app-builder.html-assets-resolver');
// export enum ReplaceType {
// 	resolveUrl, loadRes
// }
const toCheckNames = ['href', 'src', 'ng-src', 'ng-href', 'srcset', 'routerLink'];
function replaceForHtml(content, resourcePath, callback) {
    let ast;
    try {
        ast = ng_html_parser_1.default(content).tags;
    }
    catch (e) {
        log.error(`${resourcePath}: template parsing failed\n${content}`, e);
        throw e;
    }
    // const proms: Array<PromiseLike<any>> = [];
    const dones = [];
    const resolver = new AttrAssetsUrlResolver(resourcePath, callback);
    for (const el of ast) {
        // if (el.name === 'script')
        // 	continue;
        for (const name of toCheckNames) {
            if (_.has(el.attrs, name)) {
                const value = el.attrs[name].value;
                if (el.attrs[name].isNg || value == null || value.text.indexOf('{{') >= 0)
                    continue;
                const resolved$ = resolver.resolve(name, value, el);
                if (resolved$)
                    dones.push(resolved$);
            }
        }
    }
    if (dones.length > 0)
        return rxjs_1.forkJoin(dones).pipe(operators_1.map(replacements => patch_text_1.default(content, replacements)));
    else
        return rxjs_1.of(content);
}
exports.replaceForHtml = replaceForHtml;
class AttrAssetsUrlResolver {
    constructor(resourcePath, callback) {
        this.resourcePath = resourcePath;
        this.callback = callback;
        const pk = __api_1.default.findPackageByFile(resourcePath);
        if (pk)
            this.packagename = pk.longName;
    }
    resolve(attrName, valueToken, el) {
        if (!valueToken)
            return null;
        if (attrName === 'srcset') {
            // img srcset
            const value = this.doSrcSet(valueToken.text);
            return value.pipe(operators_1.map(value => new patch_text_1.Replacement(valueToken.start, valueToken.end, value)));
            // replacements.push(new Rep(valueToken.start, valueToken.end, value));
        }
        else if (attrName === 'src') {
            // img src
            const url = this.doLoadAssets(valueToken.text);
            return url.pipe(operators_1.map(url => new patch_text_1.Replacement(valueToken.start, valueToken.end, url)));
        }
        else if (attrName === 'routerLink') {
            if (valueToken.text.startsWith('assets://')) {
                const replWith = '/' + (this.packagename ?
                    __api_1.default.ngRouterPath(this.packagename, valueToken.text) :
                    __api_1.default.ngRouterPath(valueToken.text));
                log.warn(`Use "${replWith}" instead of "%s" in routerLink attribute (%s)`, valueToken.text, this.resourcePath);
                return rxjs_1.of(new patch_text_1.Replacement(valueToken.start, valueToken.end, replWith));
            }
            const url = this.resolveUrl(valueToken.text);
            const parsedUrl = url_1.default.parse(url, false, true);
            return rxjs_1.of(new patch_text_1.Replacement(valueToken.start, valueToken.end, parsedUrl.path + (parsedUrl.hash ? parsedUrl.hash : '')));
        }
        else { // href, ng-src, routerLink
            const url = this.resolveUrl(valueToken.text);
            return rxjs_1.of(new patch_text_1.Replacement(valueToken.start, valueToken.end, url));
        }
    }
    doSrcSet(value) {
        const urlSets$s = value.split(/\s*,\s*/).map(urlSet => {
            urlSet = _.trim(urlSet);
            const factors = urlSet.split(/\s+/);
            const image = factors[0];
            return this.doLoadAssets(image)
                .pipe(operators_1.map(url => url + factors[1]));
        });
        return rxjs_1.forkJoin(urlSets$s).pipe(operators_1.map(urlSets => urlSets.join(', ')));
    }
    resolveUrl(href) {
        if (href === '')
            return href;
        var normalUrlObj = __api_1.default.normalizeAssetsUrl(href, this.resourcePath);
        if (_.isObject(normalUrlObj)) {
            const res = normalUrlObj;
            const resolved = res.isPage ?
                __api_1.default.entryPageUrl(res.packageName, res.path, res.locale) :
                __api_1.default.assetsUrl(res.packageName, res.path);
            log.info(`resolve URL/routePath ${chalk.yellow(href)} to ${chalk.cyan(resolved)},\n` +
                chalk.grey(this.resourcePath));
            return resolved;
        }
        return href;
    }
    doLoadAssets(src) {
        if (src.startsWith('assets://') || src.startsWith('page://')) {
            const normalUrlObj = __api_1.default.normalizeAssetsUrl(src, this.resourcePath);
            if (_.isObject(normalUrlObj)) {
                const res = normalUrlObj;
                return rxjs_1.of(res.isPage ?
                    __api_1.default.entryPageUrl(res.packageName, res.path, res.locale) :
                    __api_1.default.assetsUrl(res.packageName, res.path));
            }
        }
        if (/^(?:https?:|\/\/|data:)/.test(src))
            return rxjs_1.of(src);
        if (src.charAt(0) === '/')
            return rxjs_1.of(src);
        if ((!src.startsWith('npm://')) && src.charAt(0) !== '~' && src.charAt(0) !== '.' && src.trim().length > 0 && src.indexOf('{') < 0)
            src = './' + src;
        return this.callback(src);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHRtbC1hc3NldHMtcmVzb2x2ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJodG1sLWFzc2V0cy1yZXNvbHZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNkVBQWlGO0FBQ2pGLGtFQUFrRTtBQUNsRSxrREFBd0I7QUFDeEIsOENBQXNCO0FBQ3RCLDBDQUE0QjtBQUM1QiwrQkFBOEM7QUFDOUMsOENBQW1DO0FBQ25DLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUMvQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7QUFFL0UsNEJBQTRCO0FBQzVCLHVCQUF1QjtBQUN2QixJQUFJO0FBQ0osTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBRWxGLFNBQWdCLGNBQWMsQ0FBQyxPQUFlLEVBQUUsWUFBb0IsRUFDbEUsUUFBOEM7SUFDOUMsSUFBSSxHQUFpQixDQUFDO0lBQ3RCLElBQUk7UUFDRixHQUFHLEdBQUcsd0JBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7S0FDL0I7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxZQUFZLDhCQUE4QixPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRSxNQUFNLENBQUMsQ0FBQztLQUNUO0lBQ0QsNkNBQTZDO0lBQzdDLE1BQU0sS0FBSyxHQUFzQixFQUFFLENBQUM7SUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDbkUsS0FBSyxNQUFNLEVBQUUsSUFBSSxHQUFHLEVBQUU7UUFDcEIsNEJBQTRCO1FBQzVCLGFBQWE7UUFDYixLQUFLLE1BQU0sSUFBSSxJQUFJLFlBQVksRUFBRTtZQUMvQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDekIsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLEtBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7Z0JBQ3BDLElBQUksRUFBRSxDQUFDLEtBQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO29CQUN4RSxTQUFTO2dCQUNYLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxTQUFTO29CQUNYLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDekI7U0FDRjtLQUNGO0lBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7UUFDbEIsT0FBTyxlQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLG9CQUFTLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQzs7UUFFbkYsT0FBTyxTQUFFLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQTlCRCx3Q0E4QkM7QUFFRCxNQUFNLHFCQUFxQjtJQUV6QixZQUFvQixZQUFvQixFQUFVLFFBQThDO1FBQTVFLGlCQUFZLEdBQVosWUFBWSxDQUFRO1FBQVUsYUFBUSxHQUFSLFFBQVEsQ0FBc0M7UUFDOUYsTUFBTSxFQUFFLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQy9DLElBQUksRUFBRTtZQUNKLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQztJQUNuQyxDQUFDO0lBQ0QsT0FBTyxDQUFDLFFBQWdCLEVBQUUsVUFBNkIsRUFDckQsRUFBYztRQUNkLElBQUksQ0FBQyxVQUFVO1lBQ2IsT0FBTyxJQUFJLENBQUM7UUFDZCxJQUFJLFFBQVEsS0FBSyxRQUFRLEVBQUU7WUFDekIsYUFBYTtZQUNiLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLHdCQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRix1RUFBdUU7U0FDeEU7YUFBTSxJQUFJLFFBQVEsS0FBSyxLQUFLLEVBQUU7WUFDN0IsVUFBVTtZQUNWLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQy9DLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLHdCQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUM3RTthQUFNLElBQUksUUFBUSxLQUFLLFlBQVksRUFBRTtZQUNwQyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFFO2dCQUMzQyxNQUFNLFFBQVEsR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7b0JBQ3RDLGVBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDckQsZUFBRyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLFFBQVEsZ0RBQWdELEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQy9HLE9BQU8sU0FBRSxDQUFFLElBQUksd0JBQUcsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUNqRTtZQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdDLE1BQU0sU0FBUyxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QyxPQUFPLFNBQUUsQ0FBQyxJQUFJLHdCQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0c7YUFBTSxFQUFFLDJCQUEyQjtZQUNsQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxPQUFPLFNBQUUsQ0FBQyxJQUFJLHdCQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7SUFDSCxDQUFDO0lBQ08sUUFBUSxDQUFDLEtBQWE7UUFDNUIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDcEQsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQyxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQztpQkFDOUIsSUFBSSxDQUFDLGVBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxlQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBWTtRQUM3QixJQUFJLElBQUksS0FBSyxFQUFFO1lBQ2IsT0FBTyxJQUFJLENBQUM7UUFDZCxJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDNUIsTUFBTSxHQUFHLEdBQUcsWUFBbUIsQ0FBQztZQUNoQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzNCLGVBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUN6RCxlQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNDLEdBQUcsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztnQkFDbEYsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNqQyxPQUFPLFFBQVEsQ0FBQztTQUNqQjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVPLFlBQVksQ0FBQyxHQUFXO1FBQzlCLElBQUksR0FBRyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQzVELE1BQU0sWUFBWSxHQUFHLGVBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BFLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBRTtnQkFDNUIsTUFBTSxHQUFHLEdBQUcsWUFBbUIsQ0FBQztnQkFDaEMsT0FBTyxTQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNwQixlQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDekQsZUFBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2FBQzdDO1NBQ0Y7UUFFRCxJQUFJLHlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDckMsT0FBTyxTQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakIsSUFBSSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUc7WUFDdkIsT0FBTyxTQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUNoSSxHQUFHLEdBQUcsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUVuQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDNUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiXG5pbXBvcnQgcGFyc2VIdG1sLCB7QXR0cmlidXRlVmFsdWVBc3QsIE9wZW5UYWdBc3R9IGZyb20gJy4uL3V0aWxzL25nLWh0bWwtcGFyc2VyJztcbmltcG9ydCBwYXRjaFRleHQsIHtSZXBsYWNlbWVudCBhcyBSZXB9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge09ic2VydmFibGUsIG9mLCBmb3JrSm9pbn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5odG1sLWFzc2V0cy1yZXNvbHZlcicpO1xuXG4vLyBleHBvcnQgZW51bSBSZXBsYWNlVHlwZSB7XG4vLyBcdHJlc29sdmVVcmwsIGxvYWRSZXNcbi8vIH1cbmNvbnN0IHRvQ2hlY2tOYW1lcyA9IFsnaHJlZicsICdzcmMnLCAnbmctc3JjJywgJ25nLWhyZWYnLCAnc3Jjc2V0JywgJ3JvdXRlckxpbmsnXTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlcGxhY2VGb3JIdG1sKGNvbnRlbnQ6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsXG4gIGNhbGxiYWNrOiAodGV4dDogc3RyaW5nKSA9PiBPYnNlcnZhYmxlPHN0cmluZz4pOiBPYnNlcnZhYmxlPHN0cmluZz4ge1xuICBsZXQgYXN0OiBPcGVuVGFnQXN0W107XG4gIHRyeSB7XG4gICAgYXN0ID0gcGFyc2VIdG1sKGNvbnRlbnQpLnRhZ3M7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZXJyb3IoYCR7cmVzb3VyY2VQYXRofTogdGVtcGxhdGUgcGFyc2luZyBmYWlsZWRcXG4ke2NvbnRlbnR9YCwgZSk7XG4gICAgdGhyb3cgZTtcbiAgfVxuICAvLyBjb25zdCBwcm9tczogQXJyYXk8UHJvbWlzZUxpa2U8YW55Pj4gPSBbXTtcbiAgY29uc3QgZG9uZXM6IE9ic2VydmFibGU8UmVwPltdID0gW107XG4gIGNvbnN0IHJlc29sdmVyID0gbmV3IEF0dHJBc3NldHNVcmxSZXNvbHZlcihyZXNvdXJjZVBhdGgsIGNhbGxiYWNrKTtcbiAgZm9yIChjb25zdCBlbCBvZiBhc3QpIHtcbiAgICAvLyBpZiAoZWwubmFtZSA9PT0gJ3NjcmlwdCcpXG4gICAgLy8gXHRjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IG5hbWUgb2YgdG9DaGVja05hbWVzKSB7XG4gICAgICBpZiAoXy5oYXMoZWwuYXR0cnMsIG5hbWUpKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZWwuYXR0cnMhW25hbWVdLnZhbHVlO1xuICAgICAgICBpZiAoZWwuYXR0cnMhW25hbWVdLmlzTmcgfHwgdmFsdWUgPT0gbnVsbCB8fCB2YWx1ZS50ZXh0LmluZGV4T2YoJ3t7JykgPj0gMCApXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkJCA9IHJlc29sdmVyLnJlc29sdmUobmFtZSwgdmFsdWUsIGVsKTtcbiAgICAgICAgaWYgKHJlc29sdmVkJClcbiAgICAgICAgICBkb25lcy5wdXNoKHJlc29sdmVkJCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChkb25lcy5sZW5ndGggPiAwKVxuICAgIHJldHVybiBmb3JrSm9pbihkb25lcykucGlwZShtYXAocmVwbGFjZW1lbnRzID0+IHBhdGNoVGV4dChjb250ZW50LCByZXBsYWNlbWVudHMpKSk7XG4gIGVsc2VcbiAgICByZXR1cm4gb2YoY29udGVudCk7XG59XG5cbmNsYXNzIEF0dHJBc3NldHNVcmxSZXNvbHZlciB7XG4gIHBhY2thZ2VuYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIHByaXZhdGUgY2FsbGJhY2s6ICh0ZXh0OiBzdHJpbmcpID0+IE9ic2VydmFibGU8c3RyaW5nPikge1xuICAgIGNvbnN0IHBrID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKHJlc291cmNlUGF0aCk7XG4gICAgaWYgKHBrKVxuICAgICAgdGhpcy5wYWNrYWdlbmFtZSA9IHBrLmxvbmdOYW1lO1xuICB9XG4gIHJlc29sdmUoYXR0ck5hbWU6IHN0cmluZywgdmFsdWVUb2tlbjogQXR0cmlidXRlVmFsdWVBc3QsXG4gICAgZWw6IE9wZW5UYWdBc3QpOiBPYnNlcnZhYmxlPFJlcD4gfCBudWxsIHtcbiAgICBpZiAoIXZhbHVlVG9rZW4pXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICBpZiAoYXR0ck5hbWUgPT09ICdzcmNzZXQnKSB7XG4gICAgICAvLyBpbWcgc3Jjc2V0XG4gICAgICBjb25zdCB2YWx1ZSA9IHRoaXMuZG9TcmNTZXQodmFsdWVUb2tlbi50ZXh0KTtcbiAgICAgIHJldHVybiB2YWx1ZS5waXBlKG1hcCh2YWx1ZSA9PiBuZXcgUmVwKHZhbHVlVG9rZW4uc3RhcnQsIHZhbHVlVG9rZW4uZW5kLCB2YWx1ZSkpKTtcbiAgICAgIC8vIHJlcGxhY2VtZW50cy5wdXNoKG5ldyBSZXAodmFsdWVUb2tlbi5zdGFydCwgdmFsdWVUb2tlbi5lbmQsIHZhbHVlKSk7XG4gICAgfSBlbHNlIGlmIChhdHRyTmFtZSA9PT0gJ3NyYycpIHtcbiAgICAgIC8vIGltZyBzcmNcbiAgICAgIGNvbnN0IHVybCA9IHRoaXMuZG9Mb2FkQXNzZXRzKHZhbHVlVG9rZW4udGV4dCk7XG4gICAgICByZXR1cm4gdXJsLnBpcGUobWFwKHVybCA9PiBuZXcgUmVwKHZhbHVlVG9rZW4uc3RhcnQsIHZhbHVlVG9rZW4uZW5kLCB1cmwpKSk7XG4gICAgfSBlbHNlIGlmIChhdHRyTmFtZSA9PT0gJ3JvdXRlckxpbmsnKSB7XG4gICAgICBpZiAodmFsdWVUb2tlbi50ZXh0LnN0YXJ0c1dpdGgoJ2Fzc2V0czovLycpKSB7XG4gICAgICAgIGNvbnN0IHJlcGxXaXRoID0gJy8nICsgKHRoaXMucGFja2FnZW5hbWUgP1xuICAgICAgICAgICAgYXBpLm5nUm91dGVyUGF0aCh0aGlzLnBhY2thZ2VuYW1lLCB2YWx1ZVRva2VuLnRleHQpIDpcbiAgICAgICAgICAgIGFwaS5uZ1JvdXRlclBhdGgodmFsdWVUb2tlbi50ZXh0KSk7XG4gICAgICAgIGxvZy53YXJuKGBVc2UgXCIke3JlcGxXaXRofVwiIGluc3RlYWQgb2YgXCIlc1wiIGluIHJvdXRlckxpbmsgYXR0cmlidXRlICglcylgLCB2YWx1ZVRva2VuLnRleHQsIHRoaXMucmVzb3VyY2VQYXRoKTtcbiAgICAgICAgcmV0dXJuIG9mIChuZXcgUmVwKHZhbHVlVG9rZW4uc3RhcnQsIHZhbHVlVG9rZW4uZW5kLCByZXBsV2l0aCkpO1xuICAgICAgfVxuICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKHZhbHVlVG9rZW4udGV4dCk7XG4gICAgICBjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UodXJsLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICByZXR1cm4gb2YobmV3IFJlcCh2YWx1ZVRva2VuLnN0YXJ0LCB2YWx1ZVRva2VuLmVuZCwgcGFyc2VkVXJsLnBhdGggKyAocGFyc2VkVXJsLmhhc2ggPyBwYXJzZWRVcmwuaGFzaCA6ICcnKSkpO1xuICAgIH0gZWxzZSB7IC8vIGhyZWYsIG5nLXNyYywgcm91dGVyTGlua1xuICAgICAgY29uc3QgdXJsID0gdGhpcy5yZXNvbHZlVXJsKHZhbHVlVG9rZW4udGV4dCk7XG4gICAgICByZXR1cm4gb2YobmV3IFJlcCh2YWx1ZVRva2VuLnN0YXJ0LCB2YWx1ZVRva2VuLmVuZCwgdXJsKSk7XG4gICAgfVxuICB9XG4gIHByaXZhdGUgZG9TcmNTZXQodmFsdWU6IHN0cmluZykge1xuICAgIGNvbnN0IHVybFNldHMkcyA9IHZhbHVlLnNwbGl0KC9cXHMqLFxccyovKS5tYXAodXJsU2V0ID0+IHtcbiAgICAgIHVybFNldCA9IF8udHJpbSh1cmxTZXQpO1xuICAgICAgY29uc3QgZmFjdG9ycyA9IHVybFNldC5zcGxpdCgvXFxzKy8pO1xuICAgICAgY29uc3QgaW1hZ2UgPSBmYWN0b3JzWzBdO1xuICAgICAgcmV0dXJuIHRoaXMuZG9Mb2FkQXNzZXRzKGltYWdlKVxuICAgICAgLnBpcGUobWFwKHVybCA9PiB1cmwgKyBmYWN0b3JzWzFdKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGZvcmtKb2luKHVybFNldHMkcykucGlwZShtYXAodXJsU2V0cyA9PiB1cmxTZXRzLmpvaW4oJywgJykpKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVVybChocmVmOiBzdHJpbmcpIHtcbiAgICBpZiAoaHJlZiA9PT0gJycpXG4gICAgICByZXR1cm4gaHJlZjtcbiAgICB2YXIgbm9ybWFsVXJsT2JqID0gYXBpLm5vcm1hbGl6ZUFzc2V0c1VybChocmVmLCB0aGlzLnJlc291cmNlUGF0aCk7XG4gICAgaWYgKF8uaXNPYmplY3Qobm9ybWFsVXJsT2JqKSkge1xuICAgICAgY29uc3QgcmVzID0gbm9ybWFsVXJsT2JqIGFzIGFueTtcbiAgICAgIGNvbnN0IHJlc29sdmVkID0gcmVzLmlzUGFnZSA/XG4gICAgICAgIGFwaS5lbnRyeVBhZ2VVcmwocmVzLnBhY2thZ2VOYW1lLCByZXMucGF0aCwgcmVzLmxvY2FsZSkgOlxuICAgICAgICBhcGkuYXNzZXRzVXJsKHJlcy5wYWNrYWdlTmFtZSwgcmVzLnBhdGgpO1xuICAgICAgbG9nLmluZm8oYHJlc29sdmUgVVJML3JvdXRlUGF0aCAke2NoYWxrLnllbGxvdyhocmVmKX0gdG8gJHtjaGFsay5jeWFuKHJlc29sdmVkKX0sXFxuYCArXG4gICAgICAgIGNoYWxrLmdyZXkodGhpcy5yZXNvdXJjZVBhdGgpKTtcbiAgICAgIHJldHVybiByZXNvbHZlZDtcbiAgICB9XG4gICAgcmV0dXJuIGhyZWY7XG4gIH1cblxuICBwcml2YXRlIGRvTG9hZEFzc2V0cyhzcmM6IHN0cmluZyk6IE9ic2VydmFibGU8c3RyaW5nPiB7XG4gICAgaWYgKHNyYy5zdGFydHNXaXRoKCdhc3NldHM6Ly8nKSB8fCBzcmMuc3RhcnRzV2l0aCgncGFnZTovLycpKSB7XG4gICAgICBjb25zdCBub3JtYWxVcmxPYmogPSBhcGkubm9ybWFsaXplQXNzZXRzVXJsKHNyYywgdGhpcy5yZXNvdXJjZVBhdGgpO1xuICAgICAgaWYgKF8uaXNPYmplY3Qobm9ybWFsVXJsT2JqKSkge1xuICAgICAgICBjb25zdCByZXMgPSBub3JtYWxVcmxPYmogYXMgYW55O1xuICAgICAgICByZXR1cm4gb2YocmVzLmlzUGFnZSA/XG4gICAgICAgICAgYXBpLmVudHJ5UGFnZVVybChyZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoLCByZXMubG9jYWxlKSA6XG4gICAgICAgICAgYXBpLmFzc2V0c1VybChyZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKC9eKD86aHR0cHM/OnxcXC9cXC98ZGF0YTopLy50ZXN0KHNyYykpXG4gICAgICByZXR1cm4gb2Yoc3JjKTtcbiAgICBpZiAoc3JjLmNoYXJBdCgwKSA9PT0gJy8nKVxuICAgICAgcmV0dXJuIG9mKHNyYyk7XG5cbiAgICBpZiAoKCFzcmMuc3RhcnRzV2l0aCgnbnBtOi8vJykpICYmIHNyYy5jaGFyQXQoMCkgIT09ICd+JyAmJiBzcmMuY2hhckF0KDApICE9PSAnLicgJiYgc3JjLnRyaW0oKS5sZW5ndGggPiAwICYmIHNyYy5pbmRleE9mKCd7JykgPCAwKVxuICAgICAgc3JjID0gJy4vJyArIHNyYztcblxuICAgIHJldHVybiB0aGlzLmNhbGxiYWNrKHNyYyk7XG4gIH1cbn1cbiJdfQ==