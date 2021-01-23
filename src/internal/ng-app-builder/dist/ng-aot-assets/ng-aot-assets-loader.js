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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYW90LWFzc2V0cy1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuZy1hb3QtYXNzZXRzLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUEyQztBQUMzQyxrREFBd0I7QUFDeEIscUVBQWdFO0FBQ2hFLG1DQUFxQztBQUVyQywrQkFBNkM7QUFDN0MsOENBQXNEO0FBQ3RELHlCQUEwQjtBQUMxQiwwQ0FBNEI7QUFDNUIsMkVBQTJFO0FBRTNFLE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLFdBQVcsb0JBQVksZUFBZSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBSXhFLE1BQU0sTUFBTSxHQUFvQixVQUFTLE1BQXVCLEVBQUUsU0FBd0I7SUFDeEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzlCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixJQUFJLENBQUMsU0FBUyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0tBQ3REO0lBQ0QsSUFBSSxHQUFXLENBQUM7SUFDaEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRO1FBQzVCLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7O1FBRXhCLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFFZixNQUFNLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBa0IsQ0FBQztJQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDeEIsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEQsSUFBSSxLQUFLLEVBQUU7WUFDVCwyREFBMkQ7WUFDM0QsMENBQTBDO1lBQzFDLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFN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TSxFQUFFO29CQUNOLE9BQU8sRUFBRSxFQUFFO2lCQUNaO2FBQ0YsQ0FBQztZQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBaUIsQ0FBQyxDQUFDO1lBQ2xELFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELGlCQUFTLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIGltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtyYW5kb21OdW1TdHJ9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0LCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwLCBtYXAsIHRvQXJyYXl9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLWFwcC1idWlsZGVyLm5nLWFvdC1hc3NldHMnKTtcblxuY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoYFxcXFxbZHJjcF8ke3JhbmRvbU51bVN0cn07KFteXFxcXF1dKilcXFxcXWAsICdnJyk7XG5cbnR5cGUgUmF3U291cmNlTWFwID0gUGFyYW1ldGVyczx3YkxvYWRlci5Mb2FkZXJDb250ZXh0WydjYWxsYmFjayddPlsyXTtcblxuY29uc3QgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2U6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKSB7XG4gIGNvbnN0IGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgdGhpcy5lbWl0RXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICAgIHRocm93IG5ldyBFcnJvcignbG9hZGVyIGRvZXMgbm90IHN1cHBvcnQgc3luYyBtb2RlJyk7XG4gIH1cbiAgbGV0IHN0cjogc3RyaW5nO1xuICBpZiAodHlwZW9mIHNvdXJjZSAhPT0gJ3N0cmluZycpXG4gICAgc3RyID0gc291cmNlLnRvU3RyaW5nKCk7XG4gIGVsc2VcbiAgICBzdHIgPSBzb3VyY2U7XG5cbiAgY29uc3Qgc3ViaiA9IG5ldyBTdWJqZWN0PFJlcGxhY2VtZW50SW5mPigpO1xuICBzdWJqLnBpcGUobWVyZ2VNYXAocmVwbCA9PiB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXFwuKD86dHxqKXN4PyQvLmV4ZWModGhpcy5yZXNvdXJjZVBhdGgpO1xuICAgIGlmIChtYXRjaCkge1xuICAgICAgLy8gU28gZmFyIGZvciBBbmd1bGFyIDguMS54LCBhbGwgZmlsZXMgYXJlIC5jb21wb25lbnQuaHRtbCxcbiAgICAgIC8vIGZvbGxvd2luZyBsb2dpYyB3aWxsIG5vdCBiZSBydW4gYXQgYWxsLlxuICAgICAgY29uc3QgcHJldkNoYXIgPSBzdHIuY2hhckF0KHJlcGwuc3RhcnQtMSk7XG4gICAgICBjb25zdCBwb3N0Q2hhciA9IHN0ci5jaGFyQXQocmVwbC5lbmQpO1xuXG4gICAgICBpZiAoKHByZXZDaGFyID09PSAnXCInIHx8IHByZXZDaGFyID09PSAnXFwnJykgJiYgcG9zdENoYXIgPT09IHByZXZDaGFyKSB7XG4gICAgICAgIC8vIG91ciBwbGFjZWhvbGRlciBpcyB3aXRoaW4gYSBzdHJpbmcgbGl0ZXJhbCwgcmVtb3ZlIHF1b3RhdGlvbiBtYXJrXG4gICAgICAgIHJlcGwuc3RhcnQtLTtcbiAgICAgICAgcmVwbC5lbmQrKztcbiAgICAgICAgcmVwbC50ZXh0ID0gYHJlcXVpcmUoJHtKU09OLnN0cmluZ2lmeShyZXBsLnRleHQpfSlgO1xuICAgICAgICByZXR1cm4gb2YocmVwbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBsb2FkTW9kdWxlKHRoaXMsIHJlcGwudGV4dCAhPSBudWxsID8gcmVwbC50ZXh0ISA6IHJlcGwucmVwbGFjZW1lbnQhKVxuICAgIC5waXBlKFxuICAgICAgbWFwKHJlc29sdmVkID0+IHtcbiAgICAgICAgcmVwbC50ZXh0ID0gcmVzb2x2ZWQ7XG4gICAgICAgIHJldHVybiByZXBsO1xuICAgICAgfSlcbiAgICApO1xuICB9KSwgdG9BcnJheSgpKVxuICAuc3Vic2NyaWJlKHJlcGxhY2VtZW50cyA9PiB7XG4gICAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHJlcGxhY2VkU3JjID0gcmVwbGFjZUNvZGUoc3RyLCByZXBsYWNlbWVudHMpO1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVwbGFjZWRTcmMsIHNvdXJjZU1hcCk7XG4gICAgfVxuICB9KTtcbiAgcGF0dGVybi5sYXN0SW5kZXggPSAwO1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IGZvdW5kID0gcGF0dGVybi5leGVjKHN0cik7XG4gICAgaWYgKGZvdW5kID09IG51bGwpIHtcbiAgICAgIHN1YmouY29tcGxldGUoKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBjb25zdCBrZXkgPSBmb3VuZFsxXTtcbiAgICBzdWJqLm5leHQoe3N0YXJ0OiBmb3VuZC5pbmRleCwgZW5kOiBmb3VuZC5pbmRleCArIGZvdW5kWzBdLmxlbmd0aCwgdGV4dDoga2V5fSk7XG4gICAgcGF0dGVybi5sYXN0SW5kZXggPSBmb3VuZC5pbmRleCArIGZvdW5kWzBdLmxlbmd0aDtcbiAgfVxufTtcblxuZnVuY3Rpb24gbG9hZE1vZHVsZShsb2FkZXI6IHdiTG9hZGVyLkxvYWRlckNvbnRleHQsIHRleHQ6IHN0cmluZykge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgbG9hZGVyLmxvYWRNb2R1bGUodGV4dCwgKGVycjogRXJyb3IsIHNvdXJjZTogYW55LCBzb3VyY2VNYXA6IGFueSwgbW9kdWxlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICB2YXIgc2FuZGJveCA9IHtcbiAgICAgICAgX193ZWJwYWNrX3B1YmxpY19wYXRoX186IF8uZ2V0KGxvYWRlciwgJ19jb21waWxlci5vcHRpb25zLm91dHB1dC5wdWJsaWNQYXRoJywgYXBpLmNvbmZpZygpLnB1YmxpY1BhdGgpLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiB7fVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmcpO1xuICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0ID0gbG9hZGVyO1xuIl19