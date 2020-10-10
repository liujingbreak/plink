"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = __importDefault(require("__api"));
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
// import * as Path from 'path';
// import * as _ from 'lodash';
const vm = require("vm");
// import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger(__api_1.default.packageName + '.css-url-loader');
const urlLoader = function (content, map) {
    var callback = this.async();
    if (!callback) {
        throw new Error('Does not support Webpack without async loader function');
    }
    var file = this.resourcePath;
    const self = this;
    const replacements = [];
    replaceUrl(this, content, file).subscribe({
        next(repl) {
            replacements.push(repl);
            log.debug('final url', repl.text);
        },
        error(e) {
            self.emitError(e);
            log.error(file, e);
            callback(e);
        },
        complete() {
            const replaced = patch_text_1.default(content, replacements);
            // if (replacements.length > 0)
            //   log.debug(file, replaced);
            callback(null, replaced, map);
        }
    });
};
function replaceUrl(loaderCtx, css, file) {
    return new rxjs_1.Observable(subscriber => {
        const lexer = new simple_scss_parser_1.ScssLexer(css);
        const parser = new simple_scss_parser_1.ScssParser(lexer);
        const resUrls = parser.getResUrl(css);
        for (const { start, end, text } of resUrls) {
            subscriber.next({ start, end, text });
        }
        subscriber.complete();
    }).pipe(operators_1.concatMap(repl => {
        var resolvedTo = replaceAssetsUrl(file, repl.text);
        log.debug('%s -> %s (%s)', repl.text, resolvedTo, file);
        if (resolvedTo.startsWith('~')) {
            return loadModule(loaderCtx, resolvedTo.slice(1))
                .pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else if (!resolvedTo.startsWith('/') && !resolvedTo.startsWith('#') && resolvedTo.indexOf(':') < 0) {
            if (!resolvedTo.startsWith('.'))
                resolvedTo = './' + resolvedTo; // Fix AOT mode in Angular 8.2.x
            return loadModule(loaderCtx, resolvedTo)
                .pipe(operators_1.map(url => {
                repl.text = url;
                log.debug('loadModule:', url);
                return repl;
            }));
        }
        else {
            log.debug('url: %s  -> %s', repl.text, resolvedTo);
            repl.text = resolvedTo;
            return rxjs_1.of(repl);
        }
    }));
}
function loadModule(loaderCtx, url) {
    return new rxjs_1.Observable(loadModuleSub => {
        loaderCtx.loadModule(url, (err, source) => {
            if (err)
                return loadModuleSub.error(err);
            var sandbox = {
                // Since Angular 8.0, postcss plugin will no longer add `deployUrl/publicPath` to url string
                __webpack_public_path__: loaderCtx._compiler.options.output.publicPath,
                module: {
                    exports: {}
                }
            };
            vm.runInNewContext(source, vm.createContext(sandbox));
            const newUrl = sandbox.module.exports;
            loadModuleSub.next(newUrl);
            // log.warn('url: %s  -> %s', url, newUrl);
            loadModuleSub.complete();
        });
    });
}
function replaceAssetsUrl(file, url) {
    var res = __api_1.default.normalizeAssetsUrl(url, file);
    if (typeof res === 'string')
        return res;
    else if (res.isTilde)
        return `~${res.packageName}/${res.path}`;
    else
        return __api_1.default.assetsUrl(res.packageName, res.path);
    // return publicUrl('', api.config().outputPathMap, null, res.packageName, res.path);
}
module.exports = urlLoader;

//# sourceMappingURL=css-url-loader.js.map
