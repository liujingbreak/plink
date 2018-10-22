"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const ng_html_parser_1 = require("../utils/ng-html-parser");
const patch_text_1 = require("../utils/patch-text");
const __api_1 = require("__api");
const log = require('log4js').getLogger('ng-html-loader');
const _ = require("lodash");
const vm = require("vm");
const chalk = require('chalk');
function loader(content, map) {
    var callback = this.async();
    if (!callback) {
        this.emitError('loader does not support sync mode');
        throw new Error('loader does not support sync mode');
    }
    load(content, this)
        .then(result => this.callback(null, result, map))
        .catch(err => {
        this.callback(err);
        this.emitError(err);
        log.error(err);
    });
}
(function (loader) {
    loader.compileHtml = load;
})(loader || (loader = {}));
const toCheckNames = ['href', 'src', 'ng-src', 'ng-href', 'srcset', 'routerLink'];
function load(content, loader) {
    return __awaiter(this, void 0, void 0, function* () {
        const ast = new ng_html_parser_1.TemplateParser(content).parse();
        const proms = [];
        const replacements = [];
        for (const el of ast) {
            for (const name of toCheckNames) {
                if (_.has(el.attrs, name)) {
                    if (el.attrs[name].isNg || el.attrs[name].value == null)
                        continue;
                    proms.push(doAttrAssetsUrl(name, el.attrs[name].value, el, replacements, loader));
                }
            }
        }
        yield Promise.all(proms);
        const updated = patch_text_1.default(content, replacements);
        return updated;
    });
}
function doAttrAssetsUrl(attrName, valueToken, el, replacements, loader) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!valueToken)
            return;
        if (attrName === 'srcset') {
            // img srcset
            const value = yield doSrcSet(valueToken.text, loader);
            replacements.push(new patch_text_1.Replacement(valueToken.start, valueToken.end, value));
        }
        else if (attrName === 'src') {
            // img src
            const url = yield doLoadAssets(valueToken.text, loader);
            replacements.push(new patch_text_1.Replacement(valueToken.start, valueToken.end, url));
        }
        else { // href, ng-src, routerLink
            const url = yield resolveUrl(valueToken.text, loader);
            replacements.push(new patch_text_1.Replacement(valueToken.start, valueToken.end, url));
        }
    });
}
function doSrcSet(value, loader) {
    var prom = value.split(/\s*,\s*/).map(urlSet => {
        urlSet = _.trim(urlSet);
        const factors = urlSet.split(/\s+/);
        const image = factors[0];
        return doLoadAssets(image, loader)
            .then(url => {
            return url + ' ' + factors[1];
        });
    });
    return Promise.all(prom)
        .then(urlSets => urlSets.join(', '));
}
function resolveUrl(href, loader) {
    if (href === '')
        return Promise.resolve(href);
    var res = __api_1.default.normalizeAssetsUrl(href, loader.resourcePath);
    if (_.isObject(res)) {
        const resolved = res.isPage ?
            __api_1.default.entryPageUrl(res.packageName, res.path, res.locale) :
            __api_1.default.assetsUrl(res.packageName, res.path);
        log.info(`resolve URL/routePath ${chalk.yellow(href)} to ${chalk.cyan(resolved)},\n` +
            chalk.grey(loader.resourcePath));
        return Promise.resolve(resolved);
    }
    return Promise.resolve(href);
}
function doLoadAssets(src, loader) {
    if (src.startsWith('assets://') || src.startsWith('page://')) {
        const res = __api_1.default.normalizeAssetsUrl(src, loader.resourcePath);
        if (_.isObject(res)) {
            return Promise.resolve(res.isPage ?
                __api_1.default.entryPageUrl(res.packageName, res.path, res.locale) :
                __api_1.default.assetsUrl(res.packageName, res.path));
        }
    }
    if (/^(?:https?:|\/\/|data:)/.test(src))
        return Promise.resolve(src);
    if (src.charAt(0) === '/')
        return Promise.resolve(src);
    if (src.charAt(0) === '~') {
        src = src.substring(1);
    }
    else if (src.startsWith('npm://')) {
        src = src.substring('npm://'.length);
    }
    else if (src.charAt(0) !== '.' && src.trim().length > 0 && src.indexOf('{') < 0)
        src = './' + src;
    // console.log(api.packageName, loader.resourcePath, src);
    return new Promise((resolve, reject) => {
        // Unlike extract-loader, we does not support embedded require statement in source code 
        loader.loadModule(src, (err, source, sourceMap, module) => {
            if (err)
                return reject(err);
            var sandbox = {
                __webpack_public_path__: _.get(loader, '_compiler.options.output.publicPath', __api_1.default.config().publicPath),
                module: {
                    exports: {}
                }
            };
            vm.runInNewContext(source, vm.createContext(sandbox));
            resolve(sandbox.module.exports);
        });
    });
}
module.exports = loader;

//# sourceMappingURL=ng-html-loader.js.map
