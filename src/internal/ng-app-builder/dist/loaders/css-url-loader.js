"use strict";
const __api_1 = require("__api");
const assets_url_1 = require("dr-comp-package/wfh/dist/assets-url");
// import * as Path from 'path';
// import * as _ from 'lodash';
const vm = require("vm");
const patch_text_1 = require("../utils/patch-text");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
// import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger(__api_1.default.packageName + '/css-url-loader');
const urlLoader = function (content, map) {
    var callback = this.async();
    var file = this.resourcePath;
    const self = this;
    const replacements = [];
    replaceUrl(this, content, file).subscribe({
        next(repl) {
            replacements.push(repl);
        },
        error(e) {
            self.emitError(e);
            log.error(e);
            callback(e);
        },
        complete() {
            const replaced = patch_text_1.default(content, replacements);
            if (replacements.length > 0)
                log.debug(file, replaced);
            callback(null, replaced, map);
        }
    });
};
function replaceUrl(loaderCtx, css, file) {
    return new rxjs_1.Observable(subscriber => {
        const pattern = /(\W)url\s*\(\s*['"]?\s*([^'")]*)['"]?\s*\)/mg;
        while (true) {
            const result = pattern.exec(css);
            if (result == null) {
                subscriber.complete();
                break;
            }
            // look behind for "@import"
            let matchStart = result.index - 1;
            while (matchStart >= 0 && /\s/.test(css[matchStart])) {
                matchStart--;
            }
            if (matchStart >= 6 && css.slice(matchStart - 6, matchStart + 1) === '@import')
                continue;
            subscriber.next({ start: result.index + 5,
                end: result.index + result[0].length - 1,
                text: result[2]
            });
        }
    }).pipe(operators_1.mergeMap(repl => {
        var resolvedTo = replaceAssetsUrl(file, repl.text);
        if (resolvedTo.startsWith('~')) {
            return loadModule(loaderCtx, repl.text.slice(1)).pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else if (!resolvedTo.startsWith('/') && resolvedTo.indexOf(':') < 0) {
            return loadModule(loaderCtx, repl.text).pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else {
            log.debug('url: %s  -> %s', repl.text, resolvedTo);
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
                // Later on, Angular's postcss plugin will prefix `deployUrl/publicPath` to url string
                __webpack_public_path__: '/',
                module: {
                    exports: {}
                }
            };
            vm.runInNewContext(source, vm.createContext(sandbox));
            const newUrl = sandbox.module.exports;
            loadModuleSub.next(newUrl);
            log.info('url: %s  -> %s', url, newUrl);
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
        return assets_url_1.publicUrl('', __api_1.default.config().outputPathMap, null, res.packageName, res.path);
}
module.exports = urlLoader;

//# sourceMappingURL=css-url-loader.js.map
