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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSwrQkFBc0M7QUFDdEMsOENBQWdEO0FBRWhELGtEQUF3QjtBQUN4QixxRUFBZ0U7QUFDaEUsb0VBQW9FO0FBQ3BFLGdDQUFnQztBQUNoQywrQkFBK0I7QUFDL0IseUJBQTBCO0FBQzFCLDhDQUE4QztBQUM5QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztBQUU3RSxNQUFNLFNBQVMsR0FBcUIsVUFBUyxPQUFlLEVBQUUsR0FBRztJQUMvRCxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDNUIsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztLQUMzRTtJQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ2xCLE1BQU0sWUFBWSxHQUFxQixFQUFFLENBQUM7SUFFMUMsVUFBVSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxJQUFJO1lBQ1AsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4QixHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELEtBQUssQ0FBQyxDQUFDO1lBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUks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
