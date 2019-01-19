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
    let src;
    if (typeof source !== 'string')
        src = source.toString();
    else
        src = source;
    pattern.lastIndex = 0;
    let toBeReplaced;
    const subj = new rxjs_1.Subject();
    subj.pipe(operators_1.mergeMap(repl => {
        return loadModule(this, repl.text)
            .pipe(operators_1.map(resolved => {
            repl.text = JSON.stringify(resolved).slice(1, resolved.length - 1);
            if (toBeReplaced == null)
                toBeReplaced = [];
            toBeReplaced.push(repl);
            return repl;
        }));
    })).subscribe(null, null, () => {
        if (toBeReplaced == null) {
            return callback(null, source, sourceMap);
        }
        else {
            const replacedSrc = patch_text_1.default(src, toBeReplaced);
            callback(null, replacedSrc, sourceMap);
        }
    });
    while (true) {
        const found = pattern.exec(src);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBQ3hCLDZFQUFnRTtBQUNoRSxtQ0FBcUM7QUFFckMsK0JBQXlDO0FBQ3pDLDhDQUE2QztBQUM3Qyx5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLDJFQUEyRTtBQUUzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLG9CQUFZLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV4RSxNQUFNLE1BQU0sR0FBb0IsVUFBUyxNQUF1QixFQUFFLFNBQXdCO0lBQ3pGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUNyRDtJQUNELElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDL0MsT0FBTyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMxQyxJQUFJLEdBQVcsQ0FBQztJQUNoQixJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFDN0IsR0FBRyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQzs7UUFFeEIsR0FBRyxHQUFHLE1BQU0sQ0FBQztJQUNkLE9BQU8sQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLElBQUksWUFBOEIsQ0FBQztJQUVuQyxNQUFNLElBQUksR0FBRyxJQUFJLGNBQU8sRUFBa0IsQ0FBQztJQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDekIs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LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtyYW5kb21OdW1TdHJ9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWVyZ2VNYXAsIG1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbmctYXBwLWJ1aWxkZXIubmctYW90LWFzc2V0cycpO1xuXG5jb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChgXFxcXFtkcmNwXyR7cmFuZG9tTnVtU3RyfTsoW15cXFxcXV0qKVxcXFxdYCwgJ2cnKTtcblxuY29uc3QgbG9hZGVyOiB3YkxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2U6IHN0cmluZyB8IEJ1ZmZlciwgc291cmNlTWFwPzogUmF3U291cmNlTWFwKSB7XG5cdGNvbnN0IGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuXHRpZiAoIWNhbGxiYWNrKSB7XG5cdFx0dGhpcy5lbWl0RXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuXHRcdHRocm93IG5ldyBFcnJvcignbG9hZGVyIGRvZXMgbm90IHN1cHBvcnQgc3luYyBtb2RlJyk7XG5cdH1cblx0aWYgKCF0aGlzLnJlc291cmNlUGF0aC5lbmRzV2l0aCgnLm5nZmFjdG9yeS5qcycpKVxuXHRcdHJldHVybiBjYWxsYmFjayhudWxsLCBzb3VyY2UsIHNvdXJjZU1hcCk7XG5cdGxldCBzcmM6IHN0cmluZztcblx0aWYgKHR5cGVvZiBzb3VyY2UgIT09ICdzdHJpbmcnKVxuXHRcdHNyYyA9IHNvdXJjZS50b1N0cmluZygpO1xuXHRlbHNlXG5cdFx0c3JjID0gc291cmNlO1xuXHRwYXR0ZXJuLmxhc3RJbmRleCA9IDA7XG5cdGxldCB0b0JlUmVwbGFjZWQ6IFJlcGxhY2VtZW50SW5mW107XG5cblx0Y29uc3Qgc3ViaiA9IG5ldyBTdWJqZWN0PFJlcGxhY2VtZW50SW5mPigpO1xuXHRzdWJqLnBpcGUobWVyZ2VNYXAocmVwbCA9PiB7XG5cdFx0cmV0dXJuIGxvYWRNb2R1bGUodGhpcywgcmVwbC50ZXh0KVxuXHRcdC5waXBlKG1hcChyZXNvbHZlZCA9PiB7XG5cdFx0XHRyZXBsLnRleHQgPSBKU09OLnN0cmluZ2lmeShyZXNvbHZlZCkuc2xpY2UoMSwgcmVzb2x2ZWQubGVuZ3RoIC0gMSk7XG5cdFx0XHRpZiAodG9CZVJlcGxhY2VkID09IG51bGwpXG5cdFx0XHRcdHRvQmVSZXBsYWNlZCA9IFtdO1xuXHRcdFx0dG9CZVJlcGxhY2VkLnB1c2gocmVwbCk7XG5cdFx0XHRyZXR1cm4gcmVwbDtcblx0XHR9KSk7XG5cdH0pKS5zdWJzY3JpYmUobnVsbCwgbnVsbCwgKCkgPT4ge1xuXHRcdGlmICh0b0JlUmVwbGFjZWQgPT0gbnVsbCkge1xuXHRcdFx0cmV0dXJuIGNhbGxiYWNrKG51bGwsIHNvdXJjZSwgc291cmNlTWFwKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc3QgcmVwbGFjZWRTcmMgPSByZXBsYWNlQ29kZShzcmMsIHRvQmVSZXBsYWNlZCk7XG5cdFx0XHRjYWxsYmFjayhudWxsLCByZXBsYWNlZFNyYywgc291cmNlTWFwKTtcblx0XHR9XG5cdH0pO1xuXHR3aGlsZSAodHJ1ZSkge1xuXHRcdGNvbnN0IGZvdW5kID0gcGF0dGVybi5leGVjKHNyYyk7XG5cdFx0aWYgKGZvdW5kID09IG51bGwpIHtcblx0XHRcdHN1YmouY29tcGxldGUoKTtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0XHRjb25zdCBrZXkgPSBmb3VuZFsxXTtcblx0XHRzdWJqLm5leHQoe3N0YXJ0OiBmb3VuZC5pbmRleCwgZW5kOiBmb3VuZC5pbmRleCArIGZvdW5kWzBdLmxlbmd0aCwgdGV4dDoga2V5fSk7XG5cdFx0cGF0dGVybi5sYXN0SW5kZXggPSBmb3VuZC5pbmRleCArIGZvdW5kWzBdLmxlbmd0aDtcblx0fVxufTtcblxuZnVuY3Rpb24gbG9hZE1vZHVsZShsb2FkZXI6IHdiTG9hZGVyLkxvYWRlckNvbnRleHQsIHRleHQ6IHN0cmluZykge1xuXHRyZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcblx0XHQvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG5cdFx0bG9hZGVyLmxvYWRNb2R1bGUodGV4dCwgKGVycjogRXJyb3IsIHNvdXJjZTogYW55LCBzb3VyY2VNYXA6IGFueSwgbW9kdWxlOiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnIpXG5cdFx0XHRcdHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG5cdFx0XHR2YXIgc2FuZGJveCA9IHtcblx0XHRcdFx0X193ZWJwYWNrX3B1YmxpY19wYXRoX186IF8uZ2V0KGxvYWRlciwgJ19jb21waWxlci5vcHRpb25zLm91dHB1dC5wdWJsaWNQYXRoJywgYXBpLmNvbmZpZygpLnB1YmxpY1BhdGgpLFxuXHRcdFx0XHRtb2R1bGU6IHtcblx0XHRcdFx0XHRleHBvcnRzOiB7fVxuXHRcdFx0XHR9XG5cdFx0XHR9O1xuXHRcdFx0dm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG5cdFx0XHRzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmcpO1xuXHRcdFx0c3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZXhwb3J0ID0gbG9hZGVyO1xuIl19
