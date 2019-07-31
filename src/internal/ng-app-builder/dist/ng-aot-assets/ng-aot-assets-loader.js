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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy1hb3QtYXNzZXRzL25nLWFvdC1hc3NldHMtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsMERBQXdCO0FBQ3hCLDZFQUFnRTtBQUNoRSxtQ0FBcUM7QUFFckMsK0JBQTZDO0FBQzdDLDhDQUFzRDtBQUN0RCx5QkFBMEI7QUFDMUIsa0RBQTRCO0FBQzVCLDJFQUEyRTtBQUUzRSxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxXQUFXLG9CQUFZLGVBQWUsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUV4RSxNQUFNLE1BQU0sR0FBb0IsVUFBUyxNQUF1QixFQUFFLFNBQXdCO0lBQ3hGLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztLQUN0RDtJQUNELElBQUksR0FBVyxDQUFDO0lBQ2hCLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUTtRQUM1QixHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDOztRQUV4QixHQUFHLEdBQUcsTUFBTSxDQUFDO0lBRWYsTUFBTSxJQUFJLEdBQUcsSUFBSSxjQUFPLEVBQWtCLENBQUM7SUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyxvQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ3hCLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3RELElBQUksS0FBSyxFQUFFO1lBQ1QsMkRBQTJEO1lBQzNELDBDQUEwQztZQUMxQyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUMsQ0FB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QkFDWjthQUNGLENBQUM7WUFDRixFQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUMsQ0FBQztZQUNsRCxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxpQkFBUyxNQUFNLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctYW90LWFzc2V0cy9uZy1hb3QtYXNzZXRzLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmF3U291cmNlTWFwfSBmcm9tICdzb3VyY2UtbWFwJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHJlcGxhY2VDb2RlLCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtyYW5kb21OdW1TdHJ9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBTdWJqZWN0LCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge21lcmdlTWFwLCBtYXAsIHRvQXJyYXl9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ25nLWFwcC1idWlsZGVyLm5nLWFvdC1hc3NldHMnKTtcblxuY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoYFxcXFxbZHJjcF8ke3JhbmRvbU51bVN0cn07KFteXFxcXF1dKilcXFxcXWAsICdnJyk7XG5cbmNvbnN0IGxvYWRlcjogd2JMb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlOiBzdHJpbmcgfCBCdWZmZXIsIHNvdXJjZU1hcD86IFJhd1NvdXJjZU1hcCkge1xuICBjb25zdCBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRoaXMuZW1pdEVycm9yKCdsb2FkZXIgZG9lcyBub3Qgc3VwcG9ydCBzeW5jIG1vZGUnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2xvYWRlciBkb2VzIG5vdCBzdXBwb3J0IHN5bmMgbW9kZScpO1xuICB9XG4gIGxldCBzdHI6IHN0cmluZztcbiAgaWYgKHR5cGVvZiBzb3VyY2UgIT09ICdzdHJpbmcnKVxuICAgIHN0ciA9IHNvdXJjZS50b1N0cmluZygpO1xuICBlbHNlXG4gICAgc3RyID0gc291cmNlO1xuXG4gIGNvbnN0IHN1YmogPSBuZXcgU3ViamVjdDxSZXBsYWNlbWVudEluZj4oKTtcbiAgc3Viai5waXBlKG1lcmdlTWFwKHJlcGwgPT4ge1xuICAgIGNvbnN0IG1hdGNoID0gL1xcLig/OnR8ailzeD8kLy5leGVjKHRoaXMucmVzb3VyY2VQYXRoKTtcbiAgICBpZiAobWF0Y2gpIHtcbiAgICAgIC8vIFNvIGZhciBmb3IgQW5ndWxhciA4LjEueCwgYWxsIGZpbGVzIGFyZSAuY29tcG9uZW50Lmh0bWwsXG4gICAgICAvLyBmb2xsb3dpbmcgbG9naWMgd2lsbCBub3QgYmUgcnVuIGF0IGFsbC5cbiAgICAgIGNvbnN0IHByZXZDaGFyID0gc3RyLmNoYXJBdChyZXBsLnN0YXJ0LTEpO1xuICAgICAgY29uc3QgcG9zdENoYXIgPSBzdHIuY2hhckF0KHJlcGwuZW5kKTtcblxuICAgICAgaWYgKChwcmV2Q2hhciA9PT0gJ1wiJyB8fCBwcmV2Q2hhciA9PT0gJ1xcJycpICYmIHBvc3RDaGFyID09PSBwcmV2Q2hhcikge1xuICAgICAgICAvLyBvdXIgcGxhY2Vob2xkZXIgaXMgd2l0aGluIGEgc3RyaW5nIGxpdGVyYWwsIHJlbW92ZSBxdW90YXRpb24gbWFya1xuICAgICAgICByZXBsLnN0YXJ0LS07XG4gICAgICAgIHJlcGwuZW5kKys7XG4gICAgICAgIHJlcGwudGV4dCA9IGByZXF1aXJlKCR7SlNPTi5zdHJpbmdpZnkocmVwbC50ZXh0KX0pYDtcbiAgICAgICAgcmV0dXJuIG9mKHJlcGwpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbG9hZE1vZHVsZSh0aGlzLCByZXBsLnRleHQgIT0gbnVsbCA/IHJlcGwudGV4dCEgOiByZXBsLnJlcGxhY2VtZW50ISlcbiAgICAucGlwZShcbiAgICAgIG1hcChyZXNvbHZlZCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHJlc29sdmVkO1xuICAgICAgICByZXR1cm4gcmVwbDtcbiAgICAgIH0pXG4gICAgKTtcbiAgfSksIHRvQXJyYXkoKSlcbiAgLnN1YnNjcmliZShyZXBsYWNlbWVudHMgPT4ge1xuICAgIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgc291cmNlLCBzb3VyY2VNYXApO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCByZXBsYWNlZFNyYyA9IHJlcGxhY2VDb2RlKHN0ciwgcmVwbGFjZW1lbnRzKTtcbiAgICAgIGNhbGxiYWNrKG51bGwsIHJlcGxhY2VkU3JjLCBzb3VyY2VNYXApO1xuICAgIH1cbiAgfSk7XG4gIHBhdHRlcm4ubGFzdEluZGV4ID0gMDtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBmb3VuZCA9IHBhdHRlcm4uZXhlYyhzdHIpO1xuICAgIGlmIChmb3VuZCA9PSBudWxsKSB7XG4gICAgICBzdWJqLmNvbXBsZXRlKCk7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgY29uc3Qga2V5ID0gZm91bmRbMV07XG4gICAgc3Viai5uZXh0KHtzdGFydDogZm91bmQuaW5kZXgsIGVuZDogZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGgsIHRleHQ6IGtleX0pO1xuICAgIHBhdHRlcm4ubGFzdEluZGV4ID0gZm91bmQuaW5kZXggKyBmb3VuZFswXS5sZW5ndGg7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyOiB3YkxvYWRlci5Mb2FkZXJDb250ZXh0LCB0ZXh0OiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG4gICAgLy8gVW5saWtlIGV4dHJhY3QtbG9hZGVyLCB3ZSBkb2VzIG5vdCBzdXBwb3J0IGVtYmVkZGVkIHJlcXVpcmUgc3RhdGVtZW50IGluIHNvdXJjZSBjb2RlIFxuICAgIGxvYWRlci5sb2FkTW9kdWxlKHRleHQsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSwgc291cmNlTWFwOiBhbnksIG1vZHVsZTogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gc3Vic2NyaWJlci5lcnJvcihlcnIpO1xuICAgICAgdmFyIHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiBfLmdldChsb2FkZXIsICdfY29tcGlsZXIub3B0aW9ucy5vdXRwdXQucHVibGljUGF0aCcsIGFwaS5jb25maWcoKS5wdWJsaWNQYXRoKSxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czoge31cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nKTtcbiAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCA9IGxvYWRlcjtcbiJdfQ==
