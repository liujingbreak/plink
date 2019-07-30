"use strict";
const tslib_1 = require("tslib");
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
    // if (!this.resourcePath.endsWith('.ngfactory.js'))
    //   return callback(null, source, sourceMap);
    let str;
    if (typeof source !== 'string')
        str = source.toString();
    else
        str = source;
    // let toBeReplaced: ReplacementInf[];
    const subj = new rxjs_1.Subject();
    subj.pipe(operators_1.mergeMap(repl => {
        // const beginChar = str.charAt(repl.start-1);
        // const endChar = str.charAt(repl.end);
        // if ((beginChar === '"' || beginChar === '\'') && endChar === beginChar) {
        //   // a string literal
        //   repl.start--;
        //   repl.end++;
        //   repl.text = `require(${JSON.stringify(repl.text)})`;
        //   return of(repl);
        // } else {
        return loadModule(this, repl.text != null ? repl.text : repl.replacement)
            .pipe(operators_1.map(resolved => {
            repl.text = resolved;
            return repl;
        }));
        // }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBQ3hCLDZFQUFnRTtBQUNoRSxtQ0FBcUM7QUFFckMsK0JBQXlDO0FBQ3pDLDhDQUFzRDtBQUN0RCx5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLDJFQUEyRTtBQUUzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLG9CQUFZLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV4RSxNQUFNLE1BQU0sR0FBb0IsVUFBUyxNQUF1QixFQUFFLFNBQXdCO0lBQ3hGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUN0RDtJQUNELG9EQUFvRDtJQUNwRCw4Q0FBOEM7SUFDOUMsSUFBSSxHQUFXLENBQUM7SUFDaEIsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRO1FBQzVCLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7O1FBRXhCLEdBQUcsR0FBRyxNQUFNLENBQUM7SUFFZixzQ0FBc0M7SUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxjQUFPLEVBQWtCLENBQUM7SUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3hCLDhDQUE4QztRQUM5Qyx3Q0FBd0M7UUFFeEMsNEVBQTRFO1FBQzVFLHdCQUF3QjtRQUN4QixrQkFBa0I7UUFDbEIsZ0JBQWdCO1FBQ2hCLHlEQUF5RDtRQUN6RCxxQkFBcUI7UUFDckIsV0FBVztRQUNULE9BQU8sVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVksQ0FBQzthQUMxRSxJQUFJLENBQ0gsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQ2IsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUM7WUFDckIsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0osSUFBSTtJQUNOLENBQUMsQ0FBQyxFQUFFLG1CQUFPLEVBQUUsQ0FBQztTQUNiLFNBQVMsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUN4QixJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzdCLE9BQU8sUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDMUM7YUFBTTtZQUNMLE1BQU0sV0FBVyxHQUFHLG9CQUFXLENBQUMsR0FBRyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ25ELFFBQVEsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1NBQ3hDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztJQUN0QixPQUFPLElBQUksRUFBRTtRQUNYLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO1lBQ2pCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixNQUFNO1NBQ1A7UUFDRCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7UUFDL0UsT0FBTyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7S0FDbkQ7QUFDSCxDQUFDLENBQUM7QUFFRixTQUFTLFVBQVUsQ0FBQyxNQUE4QixFQUFFLElBQVk7SUFDOUQsT0FBTyxJQUFJLGlCQUFVLENBQVMsVUFBVSxDQUFDLEVBQUU7UUFDekMsd0ZBQXdGO1FBQ3hGLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBVSxFQUFFLE1BQVcsRUFBRSxTQUFjLEVBQUUsTUFBVyxFQUFFLEVBQUU7WUFDL0UsSUFBSSxHQUFHO2dCQUNMLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixJQUFJLE9BQU8sR0FBRztnQkFDWix1QkFBdUIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxxQ0FBcUMsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsVUFBVSxDQUFDO2dCQUN0RyxNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLEVBQUU7aUJBQ1o7YUFDRixDQUFDO1lBQ0YsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFpQixDQUFDLENBQUM7WUFDbEQsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsaUJBQVMsTUFBTSxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLWFvdC1hc3NldHMvbmctYW90LWFzc2V0cy1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1Jhd1NvdXJjZU1hcH0gZnJvbSAnc291cmNlLW1hcCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCByZXBsYWNlQ29kZSwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7cmFuZG9tTnVtU3RyfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7bG9hZGVyIGFzIHdiTG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwLCBtYXAsIHRvQXJyYXl9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLWFwcC1idWlsZGVyLm5nLWFvdC1hc3NldHMnKTtcblxuY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoYFxcXFxbZHJjcF8ke3JhbmRvbU51bVN0cn07KFteXFxcXF1dKilcXFxcXWAsICdnJyk7XG5cbmNvbnN0IGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlOiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCkge1xuICBjb25zdCBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICB9XG4gIC8vIGlmICghdGhpcy5yZXNvdXJjZVBhdGguZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSlcbiAgLy8gICByZXR1cm4gY2FsbGJhY2sobnVsbCwgc291cmNlLCBzb3VyY2VNYXApO1xuICBsZXQgc3RyOiBzdHJpbmc7XG4gIGlmICh0eXBlb2Ygc291cmNlICE9PSAnc3RyaW5nJylcbiAgICBzdHIgPSBzb3VyY2UudG9TdHJpbmcoKTtcbiAgZWxzZVxuICAgIHN0ciA9IHNvdXJjZTtcblxuICAvLyBsZXQgdG9CZVJlcGxhY2VkOiBSZXBsYWNlbWVudEluZltdO1xuICBjb25zdCBzdWJqID0gbmV3IFN1YmplY3Q8UmVwbGFjZW1lbnRJbmY+KCk7XG4gIHN1YmoucGlwZShtZXJnZU1hcChyZXBsID0+IHtcbiAgICAvLyBjb25zdCBiZWdpbkNoYXIgPSBzdHIuY2hhckF0KHJlcGwuc3RhcnQtMSk7XG4gICAgLy8gY29uc3QgZW5kQ2hhciA9IHN0ci5jaGFyQXQocmVwbC5lbmQpO1xuXG4gICAgLy8gaWYgKChiZWdpbkNoYXIgPT09ICdcIicgfHwgYmVnaW5DaGFyID09PSAnXFwnJykgJiYgZW5kQ2hhciA9PT0gYmVnaW5DaGFyKSB7XG4gICAgLy8gICAvLyBhIHN0cmluZyBsaXRlcmFsXG4gICAgLy8gICByZXBsLnN0YXJ0LS07XG4gICAgLy8gICByZXBsLmVuZCsrO1xuICAgIC8vICAgcmVwbC50ZXh0ID0gYHJlcXVpcmUoJHtKU09OLnN0cmluZ2lmeShyZXBsLnRleHQpfSlgO1xuICAgIC8vICAgcmV0dXJuIG9mKHJlcGwpO1xuICAgIC8vIH0gZWxzZSB7XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZSh0aGlzLCByZXBsLnRleHQgIT0gbnVsbCA/IHJlcGwudGV4dCEgOiByZXBsLnJlcGxhY2VtZW50ISlcbiAgICAgIC5waXBlKFxuICAgICAgICBtYXAocmVzb2x2ZWQgPT4ge1xuICAgICAgICAgIHJlcGwudGV4dCA9IHJlc29sdmVkO1xuICAgICAgICAgIHJldHVybiByZXBsO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAvLyB9XG4gIH0pLCB0b0FycmF5KCkpXG4gIC5zdWJzY3JpYmUocmVwbGFjZW1lbnRzID0+IHtcbiAgICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHNvdXJjZSwgc291cmNlTWFwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgcmVwbGFjZWRTcmMgPSByZXBsYWNlQ29kZShzdHIsIHJlcGxhY2VtZW50cyk7XG4gICAgICBjYWxsYmFjayhudWxsLCByZXBsYWNlZFNyYywgc291cmNlTWFwKTtcbiAgICB9XG4gIH0pO1xuICBwYXR0ZXJuLmxhc3RJbmRleCA9IDA7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgZm91bmQgPSBwYXR0ZXJuLmV4ZWMoc3RyKTtcbiAgICBpZiAoZm91bmQgPT0gbnVsbCkge1xuICAgICAgc3Viai5jb21wbGV0ZSgpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IGZvdW5kWzFdO1xuICAgIHN1YmoubmV4dCh7c3RhcnQ6IGZvdW5kLmluZGV4LCBlbmQ6IGZvdW5kLmluZGV4ICsgZm91bmRbMF0ubGVuZ3RoLCB0ZXh0OiBrZXl9KTtcbiAgICBwYXR0ZXJuLmxhc3RJbmRleCA9IGZvdW5kLmluZGV4ICsgZm91bmRbMF0ubGVuZ3RoO1xuICB9XG59O1xuXG5mdW5jdGlvbiBsb2FkTW9kdWxlKGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyQ29udGV4dCwgdGV4dDogc3RyaW5nKSB7XG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YnNjcmliZXIgPT4ge1xuICAgIC8vIFVubGlrZSBleHRyYWN0LWxvYWRlciwgd2UgZG9lcyBub3Qgc3VwcG9ydCBlbWJlZGRlZCByZXF1aXJlIHN0YXRlbWVudCBpbiBzb3VyY2UgY29kZSBcbiAgICBsb2FkZXIubG9hZE1vZHVsZSh0ZXh0LCAoZXJyOiBFcnJvciwgc291cmNlOiBhbnksIHNvdXJjZU1hcDogYW55LCBtb2R1bGU6IGFueSkgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgIHZhciBzYW5kYm94ID0ge1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXzogXy5nZXQobG9hZGVyLCAnX2NvbXBpbGVyLm9wdGlvbnMub3V0cHV0LnB1YmxpY1BhdGgnLCBhcGkuY29uZmlnKCkucHVibGljUGF0aCksXG4gICAgICAgIG1vZHVsZToge1xuICAgICAgICAgIGV4cG9ydHM6IHt9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgIHN1YnNjcmliZXIubmV4dChzYW5kYm94Lm1vZHVsZS5leHBvcnRzIGFzIHN0cmluZyk7XG4gICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5leHBvcnQgPSBsb2FkZXI7XG4iXX0=
