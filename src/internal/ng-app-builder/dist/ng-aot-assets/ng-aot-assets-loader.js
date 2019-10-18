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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkNBQTJDO0FBQzNDLDBEQUF3QjtBQUN4Qiw2RUFBZ0U7QUFDaEUsbUNBQXFDO0FBRXJDLCtCQUE2QztBQUM3Qyw4Q0FBc0Q7QUFDdEQseUJBQTBCO0FBQzFCLGtEQUE0QjtBQUM1QiwyRUFBMkU7QUFFM0UsTUFBTSxPQUFPLEdBQUcsSUFBSSxNQUFNLENBQUMsV0FBVyxvQkFBWSxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFJeEUsTUFBTSxNQUFNLEdBQW9CLFVBQVMsTUFBdUIsRUFBRSxTQUF3QjtJQUN4RixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUIsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLElBQUksQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7S0FDdEQ7SUFDRCxJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFDNUIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7UUFFeEIsR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUVmLE1BQU0sSUFBSSxHQUFHLElBQUksY0FBTyxFQUFrQixDQUFDO0lBQzNDLElBQUksQ0FBQyxJQUFJLENBQUMsb0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN4QixNQUFNLEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0RCxJQUFJLEtBQUssRUFBRTtZQUNULDJEQUEyRDtZQUMzRCwwQ0FBMEM7WUFDMUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMs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TyxFQUFFLEVBQUU7aUJBQ1o7YUFDRixDQUFDO1lBQ0YsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFpQixDQUFDLENBQUM7WUFDbEQsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLWFvdC1hc3NldHMvbmctYW90LWFzc2V0cy1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBpbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7cmFuZG9tTnVtU3RyfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7bG9hZGVyIGFzIHdiTG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgU3ViamVjdCwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttZXJnZU1hcCwgbWFwLCB0b0FycmF5fSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgdm0gPSByZXF1aXJlKCd2bScpO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCduZy1hcHAtYnVpbGRlci5uZy1hb3QtYXNzZXRzJyk7XG5cbmNvbnN0IHBhdHRlcm4gPSBuZXcgUmVnRXhwKGBcXFxcW2RyY3BfJHtyYW5kb21OdW1TdHJ9OyhbXlxcXFxdXSopXFxcXF1gLCAnZycpO1xuXG50eXBlIFJhd1NvdXJjZU1hcCA9IFBhcmFtZXRlcnM8d2JMb2FkZXIuTG9hZGVyQ29udGV4dFsnY2FsbGJhY2snXT5bMl07XG5cbmNvbnN0IGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlOiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCkge1xuICBjb25zdCBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICB9XG4gIGxldCBzdHI6IHN0cmluZztcbiAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdzdHJpbmcnKVxuICAgIHN0ciA9IHNvdXJjZS50b1N0cmluZygpO1xuICBlbHNlXG4gICAgc3RyID0gc291cmNlO1xuXG4gIGNvbnN0IHN1YmogPSBuZXcgU3ViamVjdDxSZXBsYWNlbWVudEluZj4oKTtcbiAgc3Viai5waXBlKG1lcmdlTWFwKHJlcGwgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL1xcLig/OnR8ailzeD8kLy5leGVjKHRoaXMucmVzb3VyY2VQYXRoKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIC8vIFNvIGZhciBmb3IgQW5ndWxhciA4LjEueCwgYWxsIGZpbGVzIGFyZSAuY29tcG9uZW50Lmh0bWwsXG4gICAgICAvLyBmb2xsb3dpbmcgbG9naWMgd2lsbCBub3QgYmUgcnVuIGF0IGFsbC5cbiAgICAgIGNvbnN0IHByZXZDaGFyID0gc3RyLmNoYXJBdChyZXBsLnN0YXJ0LTEpO1xuICAgICAgY29uc3QgcG9zdENoYXIgPSBzdHIuY2hhckF0KHJlcGwuZW5kKTtcblxuICAgICAgaWYgKChwcmV2Q2hhciA9PT0gJ1wiJyB8fCBwcmV2Q2hhciA9PT0gJ1xcJycpICYmIHBvc3RDaGFyID09PSBwcmV2Q2hhcikge1xuICAgICAgICAvLyBvdXIgcGxhY2Vob2xkZXIgaXMgd2l0aGluIGEgc3RyaW5nIGxpdGVyYWwsIHJlbW92ZSBxdW90YXRpb24gbWFya1xuICAgICAgICByZXBsLnN0YXJ0LS07XG4gICAgICAgIHJlcGwuZW5kKys7XG4gICAgICAgIHJlcGwudGV4dCA9IGByZXF1aXJlKCR7SlNPTi5zdHJpbmdpZnkocmVwbC50ZXh0KX0pYDtcbiAgICAgICAgcmV0dXJuIG9mKHJlcGwpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9hZE1vZHVsZSh0aGlzLCByZXBsLnRleHQgIT0gbnVsbCA/IHJlcGwudGV4dCEgOiByZXBsLnJlcGxhY2VtZW50ISlcbiAgICAucGlwZShcbiAgICAgIG1hcChyZXNvbHZlZCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHJlc29sdmVkO1xuICAgICAgICByZXR1cm4gcmVwbDtcbiAgICAgIH0pXG4gICAgKTtcbiAgfSksIHRvQXJyYXkoKSlcbiAgLnN1YnNjcmliZShyZXBsYWNlbWVudHMgPT4ge1xuICAgIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgc291cmNlLCBzb3VyY2VNYXApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZXBsYWNlZFNyYyA9IHJlcGxhY2VDb2RlKHN0ciwgcmVwbGFjZW1lbnRzKTtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlcGxhY2VkU3JjLCBzb3VyY2VNYXApO1xuICAgIH1cbiAgfSk7XG4gIHBhdHRlcm4ubGFzdEluZGV4ID0gMDtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBmb3VuZCA9IHBhdHRlcm4uZXhlYyhzdHIpO1xuICAgIGlmIChmb3VuZCA9PSBudWxsKSB7XG4gICAgICBzdWJqLmNvbXBsZXRlKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3Qga2V5ID0gZm91bmRbMV07XG4gICAgc3Viai5uZXh0KHtzdGFydDogZm91bmQuaW5kZXgsIGVuZDogZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGgsIHRleHQ6IGtleX0pO1xuICAgIHBhdHRlcm4ubGFzdEluZGV4ID0gZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGg7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyOiB3YkxvYWRlci5Mb2FkZXJDb250ZXh0LCB0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG4gICAgLy8gVW5saWtlIGV4dHJhY3QtbG9hZGVyLCB3ZSBkb2VzIG5vdCBzdXBwb3J0IGVtYmVkZGVkIHJlcXVpcmUgc3RhdGVtZW50IGluIHNvdXJjZSBjb2RlIFxuICAgIGxvYWRlci5sb2FkTW9kdWxlKHRleHQsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSwgc291cmNlTWFwOiBhbnksIG1vZHVsZTogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gc3Vic2NyaWJlci5lcnJvcihlcnIpO1xuICAgICAgdmFyIHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiBfLmdldChsb2FkZXIsICdfY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucHVibGljUGF0aCcsIGFwaS5jb25maWcoKS5wdWJsaWNQYXRoKSxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czoge31cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nKTtcbiAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==
