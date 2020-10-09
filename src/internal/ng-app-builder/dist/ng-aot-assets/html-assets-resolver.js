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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL2h0bWwtYXNzZXRzLXJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw2RUFBaUY7QUFDakYsa0VBQWtFO0FBQ2xFLGtEQUF3QjtBQUN4Qiw4Q0FBc0I7QUFDdEIsMENBQTRCO0FBQzVCLCtCQUE4QztBQUM5Qyw4Q0FBbUM7QUFDbkMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQy9CLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMscUNBQXFDLENBQUMsQ0FBQztBQUUvRSw0QkFBNEI7QUFDNUIsdUJBQXVCO0FBQ3ZCLElBQUk7QUFDSixNQUFNLFlBQVksR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFFbEYsU0FBZ0IsY0FBYyxDQUFDLE9BQWUsRUFBRSxZQUFvQixFQUNsRSxRQUE4QztJQUM5QyxJQUFJLEdBQWlCLENBQUM7SUFDdEIsSUFBSTtRQUNGLEdBQUcsR0FBRyx3QkFBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQztLQUMvQjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLFlBQVksOEJBQThCLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7SUFDRCw2Q0FBNkM7SUFDN0MsTUFBTSxLQUFLLEdBQXNCLEVBQUUsQ0FBQztJQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNuRSxLQUFLLE1BQU0sRUFBRSxJQUFJ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LENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO2dCQUNsRixLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sUUFBUSxDQUFDO1NBQ2pCO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU8sWUFBWSxDQUFDLEdBQVc7UUFDOUIsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDNUQsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDcEUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFO2dCQUM1QixNQUFNLEdBQUcsR0FBRyxZQUFtQixDQUFDO2dCQUNoQyxPQUFPLFNBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BCLGVBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUN6RCxlQUFHLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDN0M7U0FDRjtRQUVELElBQUkseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUNyQyxPQUFPLFNBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqQixJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRztZQUN2QixPQUFPLFNBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ2hJLEdBQUcsR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDO1FBRW5CLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QixDQUFDO0NBQ0YiLCJmaWxlIjoiZGlzdC9uZy1hb3QtYXNzZXRzL2h0bWwtYXNzZXRzLXJlc29sdmVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
