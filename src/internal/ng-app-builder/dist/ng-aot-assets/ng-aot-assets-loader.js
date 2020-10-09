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
// import {RawSourceMap} from 'source-map';
const __api_1 = __importDefault(require("__api"));
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const index_1 = require("./index");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const vm = require("vm");
const _ = __importStar(require("lodash"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTJDO0FBQzNDLGtEQUF3QjtBQUN4QixxRUFBZ0U7QUFDaEUsbUNBQXFDO0FBRXJDLCtCQUE2QztBQUM3Qyw4Q0FBc0Q7QUFDdEQseUJBQTBCO0FBQzFCLDBDQUE0QjtBQUM1QiwyRUFBMkU7QUFFM0UsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsV0FBVyxvQkFBWSxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFJeEUsTUFBTSxNQUFNLEdBQW9CLFVBQVMsTUFBdUIsRUFBRSxTQUF3QjtJQUN4RixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7S0FDdEQ7SUFDRCxJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFDNUIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7UUFFeEIsR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUVmLE1BQU0sSUFBSSxHQUFHLElBQUksY0FBTyxFQUFrQixDQUFDO0lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN4QixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0RCxJQUFJLEtBQUssRUFBRTtZQUNULDJEQUEyRDtZQUMzRCwwQ0FBMEM7WUFDMUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRXRDLElBQUksQ0FBQyxRQUFRLEtBQUssR0FBRyxJQUFJLFFBQVEsS0FBSyxJQUFJLENBQUMsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFO2dCQUNwRSxvRUFBb0U7Z0JBQ3BFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLElBQUksR0FBRyxXQUFXLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQ3BELE9BQU8sU0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2pCO1NBQ0Y7UUFDRCxPQUFPLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFZLENBQUM7YUFDMUUsSUFBSSxDQUNILGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNiLElBQUksQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ3JCLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxFQUFFLG1CQUFPLEVBQUUsQ0FBQztTQUNiLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUN4QixJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzdCLE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDMUM7YUFBTTtZQUNMLE1BQU0sV0FBVyxHQUFHLG9CQUFXLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQ3hDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztJQUN0QixPQUFPLElBQUksRUFBRTtRQUNYLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixNQUFNO1NBQ1A7UUFDRCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7UUFDL0UsT0FBTyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7S0FDbkQ7QUFDSCxDQUFDLENBQUM7QUFFRixTQUFTLFVBQVUsQ0FBQyxNQUE4QixFQUFFLElBQVk7SUFDOUQsT0FBTyxJQUFJLGlCQUFVLENBQVMsVUFBVSxDQUFDLEVBQUU7UUFDekMsd0ZBQXdGO1FBQ3hGLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBVSxFQUFFLE1BQVcsRUFBRSxTQUFjLEVBQUUsTUFBVyxFQUFFLEVBQUU7WUFDL0UsSUFBSSxHQUFHO2dCQUNMLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixJQUFJLE9BQU8sR0FBRztnQkFDWix1QkFBdUIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxxQ0FBcUMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUN0RyxNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLEVBQUU7aUJBQ1o7YUFDRixDQUFDO1lBQ0YsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFpQixDQUFDLENBQUM7WUFDbEQsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6ImRpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
