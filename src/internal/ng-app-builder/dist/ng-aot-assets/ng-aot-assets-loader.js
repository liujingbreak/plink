"use strict";
const tslib_1 = require("tslib");
// import {RawSourceMap} from 'source-map';
const __api_1 = tslib_1.__importDefault(require("__api"));
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const index_1 = require("./index");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const vm = require("vm");
const _ = tslib_1.__importStar(require("lodash"));
// const log = require('log4js').getLogger('ng-app-builder.ng-aot-assets');
const pattern = new RegExp(`\\[drcp_${index_1.randomNumStr};([^\\]]*)\\]`, 'g');
const loader = function (source, sourceMap) {
    const callback = this.async();
    if (!callback) {
        this.emitError('loader does not support sync mode');
        throw new Error('loader does not support sync mode');
    }
    let str;
    if (typeof source !== 'string')
        str = source.toString();
    else
        str = source;
    const subj = new rxjs_1.Subject();
    subj.pipe(operators_1.mergeMap(repl => {
        const match = /\.(?:t|j)sx?$/.exec(this.resourcePath);
        if (match) {
            // So far for Angular 8.1.x, all files are .component.html,
            // following logic will not be run at all.
            const prevChar = str.charAt(repl.start - 1);
            const postChar = str.charAt(repl.end);
            if ((prevChar === '"' || prevChar === '\'') && postChar === prevChar) {
                // our placeholder is within a string literal, remove quotation mark
                repl.start--;
                repl.end++;
                repl.text = `require(${JSON.stringify(repl.text)})`;
                return rxjs_1.of(repl);
            }
        }
        return loadModule(this, repl.text != null ? repl.text : repl.replacement)
            .pipe(operators_1.map(resolved => {
            repl.text = resolved;
            return repl;
        }));
    }), operators_1.toArray())
        .subscribe(replacements => {
        if (replacements.length === 0) {
            return callback(null, source, sourceMap);
        }
        else {
            const replacedSrc = patch_text_1.default(str, replacements);
            callback(null, replacedSrc, sourceMap);
        }
    });
    pattern.lastIndex = 0;
    while (true) {
        const found = pattern.exec(str);
        if (found == null) {
            subj.complete();
            break;
        }
        const key = found[1];
        subj.next({ start: found.index, end: found.index + found[0].length, text: key });
        pattern.lastIndex = found.index + found[0].length;
    }
};
function loadModule(loader, text) {
    return new rxjs_1.Observable(subscriber => {
        // Unlike extract-loader, we does not support embedded require statement in source code 
        loader.loadModule(text, (err, source, sourceMap, module) => {
            if (err)
                return subscriber.error(err);
            var sandbox = {
                __webpack_public_path__: _.get(loader, '_compiler.options.output.publicPath', __api_1.default.config().publicPath),
                module: {
                    exports: {}
                }
            };
            vm.runInNewContext(source, vm.createContext(sandbox));
            subscriber.next(sandbox.module.exports);
            subscriber.complete();
        });
    });
}
module.exports = loader;

//# sourceMappingURL=ng-aot-assets-loader.js.map
