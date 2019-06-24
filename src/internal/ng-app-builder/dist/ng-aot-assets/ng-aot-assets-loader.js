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
    if (!this.resourcePath.endsWith('.ngfactory.js'))
        return callback(null, source, sourceMap);
    let str;
    if (typeof source !== 'string')
        str = source.toString();
    else
        str = source;
    pattern.lastIndex = 0;
    // let toBeReplaced: ReplacementInf[];
    const subj = new rxjs_1.Subject();
    subj.pipe(operators_1.mergeMap(repl => {
        const beginChar = str.charAt(repl.start - 1);
        const endChar = str.charAt(repl.end);
        if ((beginChar === '"' || beginChar === '\'') && endChar === beginChar) {
            // a string literal
            repl.start--;
            repl.end++;
            repl.text = `require(${JSON.stringify(repl.text)})`;
            return rxjs_1.of(repl);
        }
        else {
            return loadModule(this, repl.text != null ? repl.text : repl.replacement)
                .pipe(operators_1.map(resolved => {
                repl.text = JSON.stringify(resolved).slice(1, resolved.length - 1);
                return repl;
            }));
        }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBQ3hCLDZFQUFnRTtBQUNoRSxtQ0FBcUM7QUFFckMsK0JBQTZDO0FBQzdDLDhDQUFzRDtBQUN0RCx5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLDJFQUEyRTtBQUUzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLG9CQUFZLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV4RSxNQUFNLE1BQU0sR0FBb0IsVUFBUyxNQUF1QixFQUFFLFNBQXdCO0lBQ3pGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUNyRDtJQUNELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDL0MsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFDN0IsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7UUFFeEIsR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUNkLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLHNDQUFzQztJQUV0QyxNQUFNLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBa0IsQ0FBQztJQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDekIsTUFBTSxTQUFT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TUFBTSxFQUFFLHFDQUFxQyxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxVQUFVLENBQUM7Z0JBQ3RHLE1BQU0sRUFBRTtvQkFDUCxPQUFPLEVBQUUsRUFBRTtpQkFDWDthQUNELENBQUM7WUFDRixFQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUMsQ0FBQztZQUNsRCxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtyYW5kb21OdW1TdHJ9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBvZiwgU3ViamVjdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwLCBtYXAsIHRvQXJyYXl9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLWFwcC1idWlsZGVyLm5nLWFvdC1hc3NldHMnKTtcblxuY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoYFxcXFxbZHJjcF8ke3JhbmRvbU51bVN0cn07KFteXFxcXF1dKilcXFxcXWAsICdnJyk7XG5cbmNvbnN0IGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlOiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCkge1xuXHRjb25zdCBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcblx0aWYgKCFjYWxsYmFjaykge1xuXHRcdHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuXHR9XG5cdGlmICghdGhpcy5yZXNvdXJjZVBhdGguZW5kc1dpdGgoJy5uZ2ZhY3RvcnkuanMnKSlcblx0XHRyZXR1cm4gY2FsbGJhY2sobnVsbCwgc291cmNlLCBzb3VyY2VNYXApO1xuXHRsZXQgc3RyOiBzdHJpbmc7XG5cdGlmICh0eXBlb2Ygc291cmNlICE9PSAnc3RyaW5nJylcblx0XHRzdHIgPSBzb3VyY2UudG9TdHJpbmcoKTtcblx0ZWxzZVxuXHRcdHN0ciA9IHNvdXJjZTtcblx0cGF0dGVybi5sYXN0SW5kZXggPSAwO1xuXHQvLyBsZXQgdG9CZVJlcGxhY2VkOiBSZXBsYWNlbWVudEluZltdO1xuXG5cdGNvbnN0IHN1YmogPSBuZXcgU3ViamVjdDxSZXBsYWNlbWVudEluZj4oKTtcblx0c3Viai5waXBlKG1lcmdlTWFwKHJlcGwgPT4ge1xuXHRcdGNvbnN0IGJlZ2luQ2hhciA9IHN0ci5jaGFyQXQocmVwbC5zdGFydC0xKTtcblx0XHRjb25zdCBlbmRDaGFyID0gc3RyLmNoYXJBdChyZXBsLmVuZCk7XG5cdFx0aWYgKChiZWdpbkNoYXIgPT09ICdcIicgfHwgYmVnaW5DaGFyID09PSAnXFwnJykgJiYgZW5kQ2hhciA9PT0gYmVnaW5DaGFyKSB7XG5cdFx0XHQvLyBhIHN0cmluZyBsaXRlcmFsXG5cdFx0XHRyZXBsLnN0YXJ0LS07XG5cdFx0XHRyZXBsLmVuZCsrO1xuXHRcdFx0cmVwbC50ZXh0ID0gYHJlcXVpcmUoJHtKU09OLnN0cmluZ2lmeShyZXBsLnRleHQpfSlgO1xuXHRcdFx0cmV0dXJuIG9mKHJlcGwpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gbG9hZE1vZHVsZSh0aGlzLCByZXBsLnRleHQgIT0gbnVsbCA/IHJlcGwudGV4dCEgOiByZXBsLnJlcGxhY2VtZW50ISlcblx0XHRcdC5waXBlKFxuXHRcdFx0XHRtYXAocmVzb2x2ZWQgPT4ge1xuXHRcdFx0XHRcdHJlcGwudGV4dCA9IEpTT04uc3RyaW5naWZ5KHJlc29sdmVkKS5zbGljZSgxLCByZXNvbHZlZC5sZW5ndGggLSAxKTtcblx0XHRcdFx0XHRyZXR1cm4gcmVwbDtcblx0XHRcdFx0fSlcblx0XHRcdCk7XG5cdFx0fVxuXHR9KSwgdG9BcnJheSgpKVxuXHQuc3Vic2NyaWJlKHJlcGxhY2VtZW50cyA9PiB7XG5cdFx0aWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IHJlcGxhY2VkU3JjID0gcmVwbGFjZUNvZGUoc3RyLCByZXBsYWNlbWVudHMpO1xuXHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVwbGFjZWRTcmMsIHNvdXJjZU1hcCk7XG5cdFx0fVxuXHR9KTtcblx0d2hpbGUgKHRydWUpIHtcblx0XHRjb25zdCBmb3VuZCA9IHBhdHRlcm4uZXhlYyhzdHIpO1xuXHRcdGlmIChmb3VuZCA9PSBudWxsKSB7XG5cdFx0XHRzdWJqLmNvbXBsZXRlKCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0Y29uc3Qga2V5ID0gZm91bmRbMV07XG5cdFx0c3Viai5uZXh0KHtzdGFydDogZm91bmQuaW5kZXgsIGVuZDogZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGgsIHRleHQ6IGtleX0pO1xuXHRcdHBhdHRlcm4ubGFzdEluZGV4ID0gZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGg7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyOiB3YkxvYWRlci5Mb2FkZXJDb250ZXh0LCB0ZXh0OiBzdHJpbmcpIHtcblx0cmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG5cdFx0Ly8gVW5saWtlIGV4dHJhY3QtbG9hZGVyLCB3ZSBkb2VzIG5vdCBzdXBwb3J0IGVtYmVkZGVkIHJlcXVpcmUgc3RhdGVtZW50IGluIHNvdXJjZSBjb2RlIFxuXHRcdGxvYWRlci5sb2FkTW9kdWxlKHRleHQsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSwgc291cmNlTWFwOiBhbnksIG1vZHVsZTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyKVxuXHRcdFx0XHRyZXR1cm4gc3Vic2NyaWJlci5lcnJvcihlcnIpO1xuXHRcdFx0dmFyIHNhbmRib3ggPSB7XG5cdFx0XHRcdF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiBfLmdldChsb2FkZXIsICdfY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucHVibGljUGF0aCcsIGFwaS5jb25maWcoKS5wdWJsaWNQYXRoKSxcblx0XHRcdFx0bW9kdWxlOiB7XG5cdFx0XHRcdFx0ZXhwb3J0czoge31cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuXHRcdFx0c3Vic2NyaWJlci5uZXh0KHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nKTtcblx0XHRcdHN1YnNjcmliZXIuY29tcGxldGUoKTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==
