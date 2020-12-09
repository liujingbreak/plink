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

//# sourceMappingURL=html-assets-resolver.js.map
