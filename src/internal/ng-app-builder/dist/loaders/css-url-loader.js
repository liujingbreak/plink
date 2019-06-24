"use strict";
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const assets_url_1 = require("dr-comp-package/wfh/dist/assets-url");
// import * as Path from 'path';
// import * as _ from 'lodash';
const vm = require("vm");
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
// import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger(__api_1.default.packageName + '/css-url-loader');
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
        },
        error(e) {
            self.emitError(e);
            log.error(e);
            callback(e);
        },
        complete() {
            const replaced = patch_text_1.default(content, replacements);
            if (replacements.length > 0)
                log.debug(file, replaced);
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
        if (resolvedTo.startsWith('~')) {
            return loadModule(loaderCtx, repl.text.slice(1))
                .pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else if (!resolvedTo.startsWith('/') && !resolvedTo.startsWith('#') && resolvedTo.indexOf(':') < 0) {
            return loadModule(loaderCtx, repl.text != null ? repl.text : repl.replacement)
                .pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else {
            log.debug('url: %s  -> %s', repl.text, resolvedTo);
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
                // Later on, Angular's postcss plugin will prefix `deployUrl/publicPath` to url string
                __webpack_public_path__: '/',
                module: {
                    exports: {}
                }
            };
            vm.runInNewContext(source, vm.createContext(sandbox));
            const newUrl = sandbox.module.exports;
            loadModuleSub.next(newUrl);
            log.debug('url: %s  -> %s', url, newUrl);
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
        return assets_url_1.publicUrl('', __api_1.default.config().outputPathMap, null, res.packageName, res.path);
}
module.exports = urlLoader;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMERBQXdCO0FBRXhCLG9FQUE4RDtBQUM5RCxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw2RUFBOEQ7QUFDOUQsK0JBQW9DO0FBQ3BDLDhDQUE4QztBQUM5QyxvRUFBa0U7QUFDbEUsOENBQThDO0FBQzlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTdFLE1BQU0sU0FBUyxHQUFxQixVQUFTLE9BQWUsRUFBRSxHQUFHO0lBQ2hFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0tBQzFFO0lBQ0QsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsTUFBTSxZQUFZLEdBQXFCLEVBQUUsQ0FBQztJQUUxQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDekMsSUFBSSxDQUFDLElBQUk7WUFDUixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFDRCxLQUFLLENBQUMsQ0FBQztZQUNOLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLFFBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNkLENBQUM7UUFDRCxRQUFRO1lBQ1AsTUFBTSxR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QUFzRjtnQkFDdEYsdUJBQXVCLEVBQUUsR0FBRztnQkFDNUIsTUFBTSxFQUFFO29CQUNQLE9BQU8sRUFBRSxFQUFFO2lCQUNYO2FBQ0QsQ0FBQztZQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUM7WUFDaEQsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzQixHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6QyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVksRUFBRSxHQUFXO0lBQ2xELElBQUksR0FBRyxHQUFHLGVBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRO1FBQzFCLE9BQU8sR0FBRyxDQUFDO1NBQ1AsSUFBSSxHQUFHLENBQUMsT0FBTztRQUNuQixPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7O1FBRXpDLE9BQU8sc0JBQVMsQ0FBQyxFQUFFLEVBQUUsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEYsQ0FBQztBQTdERCxpQkFBUyxTQUFTLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbG9hZGVycy9jc3MtdXJsLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgd2IgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge3B1YmxpY1VybH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2Fzc2V0cy11cmwnO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQgcGF0Y2hUZXh0LCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1Njc3NQYXJzZXIsIFNjc3NMZXhlcn0gZnJvbSAnLi4vdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyJztcbi8vIGltcG9ydCB7bG9hZGVyIGFzIHdiTG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnL2Nzcy11cmwtbG9hZGVyJyk7XG5cbmNvbnN0IHVybExvYWRlcjogd2IubG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwKSB7XG5cdHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcblx0aWYgKCFjYWxsYmFjaykge1xuXHRcdHRocm93IG5ldyBFcnJvcignRG9lcyBub3Qgc3VwcG9ydCBXZWJwYWNrIHdpdGhvdXQgYXN5bmMgbG9hZGVyIGZ1bmN0aW9uJyk7XG5cdH1cblx0dmFyIGZpbGUgPSB0aGlzLnJlc291cmNlUGF0aDtcblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cdGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG5cdHJlcGxhY2VVcmwodGhpcywgY29udGVudCwgZmlsZSkuc3Vic2NyaWJlKHtcblx0XHRuZXh0KHJlcGwpIHtcblx0XHRcdHJlcGxhY2VtZW50cy5wdXNoKHJlcGwpO1xuXHRcdH0sXG5cdFx0ZXJyb3IoZSkge1xuXHRcdFx0c2VsZi5lbWl0RXJyb3IoZSk7XG5cdFx0XHRsb2cuZXJyb3IoZSk7XG5cdFx0XHRjYWxsYmFjayEoZSk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZSgpIHtcblx0XHRcdGNvbnN0IHJlcGxhY2VkID0gcGF0Y2hUZXh0KGNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG5cdFx0XHRpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApXG5cdFx0XHRcdGxvZy5kZWJ1ZyhmaWxlLCByZXBsYWNlZCk7XG5cdFx0XHRjYWxsYmFjayEobnVsbCwgcmVwbGFjZWQsIG1hcCk7XG5cdFx0fVxuXHR9KTtcbn07XG5cbmV4cG9ydCA9IHVybExvYWRlcjtcblxuZnVuY3Rpb24gcmVwbGFjZVVybChsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCBjc3M6IHN0cmluZywgZmlsZTogc3RyaW5nKTogT2JzZXJ2YWJsZTxSZXBsYWNlbWVudEluZj4ge1xuXHRyZXR1cm4gbmV3IE9ic2VydmFibGU8UmVwbGFjZW1lbnRJbmY+KHN1YnNjcmliZXIgPT4ge1xuXHRcdGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcihjc3MpO1xuXHRcdGNvbnN0IHBhcnNlciA9IG5ldyBTY3NzUGFyc2VyKGxleGVyKTtcblx0XHRjb25zdCByZXNVcmxzID0gcGFyc2VyLmdldFJlc1VybChjc3MpO1xuXHRcdGZvciAoY29uc3Qge3N0YXJ0LCBlbmQsIHRleHR9IG9mIHJlc1VybHMpIHtcblx0XHRcdHN1YnNjcmliZXIubmV4dCh7c3RhcnQsIGVuZCwgdGV4dH0gYXMgUmVwbGFjZW1lbnRJbmYpO1xuXHRcdH1cblx0XHRzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG5cdH0pLnBpcGUoY29uY2F0TWFwKCByZXBsID0+IHtcblx0XHR2YXIgcmVzb2x2ZWRUbyA9IHJlcGxhY2VBc3NldHNVcmwoZmlsZSwgcmVwbC50ZXh0ISk7XG5cdFx0aWYgKHJlc29sdmVkVG8uc3RhcnRzV2l0aCgnficpKSB7XG5cdFx0XHRyZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlcGwudGV4dCEuc2xpY2UoMSkpXG5cdFx0XHQucGlwZShtYXAodXJsID0+IHtcblx0XHRcdFx0cmVwbC50ZXh0ID0gdXJsO1xuXHRcdFx0XHRyZXR1cm4gcmVwbDtcblx0XHRcdH0pKTtcblx0XHR9IGVsc2UgaWYgKCFyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJy8nKSAmJiAhcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcjJykgJiYgcmVzb2x2ZWRUby5pbmRleE9mKCc6JykgPCAwKSB7XG5cdFx0XHRyZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlcGwudGV4dCAhPSBudWxsID8gcmVwbC50ZXh0ISA6IHJlcGwucmVwbGFjZW1lbnQhKVxuXHRcdFx0LnBpcGUobWFwKHVybCA9PiB7XG5cdFx0XHRcdHJlcGwudGV4dCA9IHVybDtcblx0XHRcdFx0cmV0dXJuIHJlcGw7XG5cdFx0XHR9KSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGxvZy5kZWJ1ZygndXJsOiAlcyAgLT4gJXMnLCByZXBsLnRleHQsIHJlc29sdmVkVG8pO1xuXHRcdFx0cmV0dXJuIG9mKHJlcGwpO1xuXHRcdH1cblx0fSkpO1xufVxuXG5mdW5jdGlvbiBsb2FkTW9kdWxlKGxvYWRlckN0eDogd2IubG9hZGVyLkxvYWRlckNvbnRleHQsIHVybDogc3RyaW5nKSB7XG5cdHJldHVybiBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KGxvYWRNb2R1bGVTdWIgPT4ge1xuXHRcdGxvYWRlckN0eC5sb2FkTW9kdWxlKHVybCwgKGVycjogRXJyb3IsIHNvdXJjZTogYW55KSA9PiB7XG5cdFx0XHRpZiAoZXJyKVxuXHRcdFx0XHRyZXR1cm4gbG9hZE1vZHVsZVN1Yi5lcnJvcihlcnIpO1xuXHRcdFx0dmFyIHNhbmRib3ggPSB7XG5cdFx0XHRcdC8vIExhdGVyIG9uLCBBbmd1bGFyJ3MgcG9zdGNzcyBwbHVnaW4gd2lsbCBwcmVmaXggYGRlcGxveVVybC9wdWJsaWNQYXRoYCB0byB1cmwgc3RyaW5nXG5cdFx0XHRcdF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiAnLycsXG5cdFx0XHRcdG1vZHVsZToge1xuXHRcdFx0XHRcdGV4cG9ydHM6IHt9XG5cdFx0XHRcdH1cblx0XHRcdH07XG5cdFx0XHR2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcblx0XHRcdGNvbnN0IG5ld1VybCA9IHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nO1xuXHRcdFx0bG9hZE1vZHVsZVN1Yi5uZXh0KG5ld1VybCk7XG5cdFx0XHRsb2cuZGVidWcoJ3VybDogJXMgIC0+ICVzJywgdXJsLCBuZXdVcmwpO1xuXHRcdFx0bG9hZE1vZHVsZVN1Yi5jb21wbGV0ZSgpO1xuXHRcdH0pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZUFzc2V0c1VybChmaWxlOiBzdHJpbmcsIHVybDogc3RyaW5nKSB7XG5cdHZhciByZXMgPSBhcGkubm9ybWFsaXplQXNzZXRzVXJsKHVybCwgZmlsZSk7XG5cdGlmICh0eXBlb2YgcmVzID09PSAnc3RyaW5nJylcblx0XHRyZXR1cm4gcmVzO1xuXHRlbHNlIGlmIChyZXMuaXNUaWxkZSlcblx0XHRyZXR1cm4gYH4ke3Jlcy5wYWNrYWdlTmFtZX0vJHtyZXMucGF0aH1gO1xuXHRlbHNlXG5cdFx0cmV0dXJuIHB1YmxpY1VybCgnJywgYXBpLmNvbmZpZygpLm91dHB1dFBhdGhNYXAsIG51bGwsIHJlcy5wYWNrYWdlTmFtZSwgcmVzLnBhdGgpO1xufVxuIl19
