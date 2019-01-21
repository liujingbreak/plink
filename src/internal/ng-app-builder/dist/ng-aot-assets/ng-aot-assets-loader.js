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
            return loadModule(this, repl.text)
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBQ3hCLDZFQUFnRTtBQUNoRSxtQ0FBcUM7QUFFckMsK0JBQTZDO0FBQzdDLDhDQUFzRDtBQUN0RCx5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLDJFQUEyRTtBQUUzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLG9CQUFZLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV4RSxNQUFNLE1BQU0sR0FBb0IsVUFBUyxNQUF1QixFQUFFLFNBQXdCO0lBQ3pGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUNyRDtJQUNELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDL0MsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFDN0IsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7UUFFeEIsR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUNkLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLHNDQUFzQztJQUV0QyxNQUFNLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBa0IsQ0FBQztJQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDekIsTUFBTSxTQUFT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QUFFO29CQUNQLE9BQU8sRUFBRSxFQUFFO2lCQUNYO2FBQ0QsQ0FBQztZQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBaUIsQ0FBQyxDQUFDO1lBQ2xELFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELGlCQUFTLE1BQU0sQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSYXdTb3VyY2VNYXB9IGZyb20gJ3NvdXJjZS1tYXAnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgcmVwbGFjZUNvZGUsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge3JhbmRvbU51bVN0cn0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQge2xvYWRlciBhcyB3YkxvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge09ic2VydmFibGUsIG9mLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWVyZ2VNYXAsIG1hcCwgdG9BcnJheX0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctYXBwLWJ1aWxkZXIubmctYW90LWFzc2V0cycpO1xuXG5jb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChgXFxcXFtkcmNwXyR7cmFuZG9tTnVtU3RyfTsoW15cXFxcXV0qKVxcXFxdYCwgJ2cnKTtcblxuY29uc3QgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2U6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKSB7XG5cdGNvbnN0IGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuXHRpZiAoIWNhbGxiYWNrKSB7XG5cdFx0dGhpcy5lbWl0RXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuXHRcdHRocm93IG5ldyBFcnJvcignbG9hZGVyIGRvZXMgbm90IHN1cHBvcnQgc3luYyBtb2RlJyk7XG5cdH1cblx0aWYgKCF0aGlzLnJlc291cmNlUGF0aC5lbmRzV2l0aCgnLm5nZmFjdG9yeS5qcycpKVxuXHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG5cdGxldCBzdHI6IHN0cmluZztcblx0aWYgKHR5cGVvZiBzb3VyY2UgIT09ICdzdHJpbmcnKVxuXHRcdHN0ciA9IHNvdXJjZS50b1N0cmluZygpO1xuXHRlbHNlXG5cdFx0c3RyID0gc291cmNlO1xuXHRwYXR0ZXJuLmxhc3RJbmRleCA9IDA7XG5cdC8vIGxldCB0b0JlUmVwbGFjZWQ6IFJlcGxhY2VtZW50SW5mW107XG5cblx0Y29uc3Qgc3ViaiA9IG5ldyBTdWJqZWN0PFJlcGxhY2VtZW50SW5mPigpO1xuXHRzdWJqLnBpcGUobWVyZ2VNYXAocmVwbCA9PiB7XG5cdFx0Y29uc3QgYmVnaW5DaGFyID0gc3RyLmNoYXJBdChyZXBsLnN0YXJ0LTEpO1xuXHRcdGNvbnN0IGVuZENoYXIgPSBzdHIuY2hhckF0KHJlcGwuZW5kKTtcblx0XHRpZiAoKGJlZ2luQ2hhciA9PT0gJ1wiJyB8fCBiZWdpbkNoYXIgPT09ICdcXCcnKSAmJiBlbmRDaGFyID09PSBiZWdpbkNoYXIpIHtcblx0XHRcdC8vIGEgc3RyaW5nIGxpdGVyYWxcblx0XHRcdHJlcGwuc3RhcnQtLTtcblx0XHRcdHJlcGwuZW5kKys7XG5cdFx0XHRyZXBsLnRleHQgPSBgcmVxdWlyZSgke0pTT04uc3RyaW5naWZ5KHJlcGwudGV4dCl9KWA7XG5cdFx0XHRyZXR1cm4gb2YocmVwbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBsb2FkTW9kdWxlKHRoaXMsIHJlcGwudGV4dClcblx0XHRcdC5waXBlKFxuXHRcdFx0XHRtYXAocmVzb2x2ZWQgPT4ge1xuXHRcdFx0XHRcdHJlcGwudGV4dCA9IEpTT04uc3RyaW5naWZ5KHJlc29sdmVkKS5zbGljZSgxLCByZXNvbHZlZC5sZW5ndGggLSAxKTtcblx0XHRcdFx0XHRyZXR1cm4gcmVwbDtcblx0XHRcdFx0fSlcblx0XHRcdCk7XG5cdFx0fVxuXHR9KSwgdG9BcnJheSgpKVxuXHQuc3Vic2NyaWJlKHJlcGxhY2VtZW50cyA9PiB7XG5cdFx0aWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPT09IDApIHtcblx0XHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGNvbnN0IHJlcGxhY2VkU3JjID0gcmVwbGFjZUNvZGUoc3RyLCByZXBsYWNlbWVudHMpO1xuXHRcdFx0Y2FsbGJhY2sobnVsbCwgcmVwbGFjZWRTcmMsIHNvdXJjZU1hcCk7XG5cdFx0fVxuXHR9KTtcblx0d2hpbGUgKHRydWUpIHtcblx0XHRjb25zdCBmb3VuZCA9IHBhdHRlcm4uZXhlYyhzdHIpO1xuXHRcdGlmIChmb3VuZCA9PSBudWxsKSB7XG5cdFx0XHRzdWJqLmNvbXBsZXRlKCk7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0Y29uc3Qga2V5ID0gZm91bmRbMV07XG5cdFx0c3Viai5uZXh0KHtzdGFydDogZm91bmQuaW5kZXgsIGVuZDogZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGgsIHRleHQ6IGtleX0pO1xuXHRcdHBhdHRlcm4ubGFzdEluZGV4ID0gZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGg7XG5cdH1cbn07XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyOiB3YkxvYWRlci5Mb2FkZXJDb250ZXh0LCB0ZXh0OiBzdHJpbmcpIHtcblx0cmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG5cdFx0Ly8gVW5saWtlIGV4dHJhY3QtbG9hZGVyLCB3ZSBkb2VzIG5vdCBzdXBwb3J0IGVtYmVkZGVkIHJlcXVpcmUgc3RhdGVtZW50IGluIHNvdXJjZSBjb2RlIFxuXHRcdGxvYWRlci5sb2FkTW9kdWxlKHRleHQsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSwgc291cmNlTWFwOiBhbnksIG1vZHVsZTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyKVxuXHRcdFx0XHRyZXR1cm4gc3Vic2NyaWJlci5lcnJvcihlcnIpO1xuXHRcdFx0dmFyIHNhbmRib3ggPSB7XG5cdFx0XHRcdF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiBfLmdldChsb2FkZXIsICdfY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucHVibGljUGF0aCcsIGFwaS5jb25maWcoKS5wdWJsaWNQYXRoKSxcblx0XHRcdFx0bW9kdWxlOiB7XG5cdFx0XHRcdFx0ZXhwb3J0czoge31cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuXHRcdFx0c3Vic2NyaWJlci5uZXh0KHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nKTtcblx0XHRcdHN1YnNjcmliZXIuY29tcGxldGUoKTtcblx0XHR9KTtcblx0fSk7XG59XG5cbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==
