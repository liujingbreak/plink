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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMERBQXdCO0FBRXhCLG9FQUE4RDtBQUM5RCxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw2RUFBOEQ7QUFDOUQsK0JBQW9DO0FBQ3BDLDhDQUE4QztBQUM5QyxvRUFBa0U7QUFDbEUsOENBQThDO0FBQzlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTdFLE1BQU0sU0FBUyxHQUFxQixVQUFTLE9BQWUsRUFBRSxHQUFHO0lBQy9ELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2IsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO0tBQzNFO0lBQ0QsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUM3QixNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7SUFDbEIsTUFBTSxZQUFZLEdBQXFCLEVBQUUsQ0FBQztJQUUxQyxVQUFVLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDeEMsSUFBSSxDQUFDLElBQUk7WUFDUCxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFDRCxLQUFLLENBQUMsQ0FBQztZQUNMLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNiLFFBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNmLENBQUM7UUFDRCxRQUFRO1lBQ04sTUFBTSxR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QUFzRjtnQkFDdEYsdUJBQXVCLEVBQUUsR0FBRztnQkFDNUIsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRSxFQUFFO2lCQUNaO2FBQ0YsQ0FBQztZQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUM7WUFDaEQsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzQixHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6QyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVksRUFBRSxHQUFXO0lBQ2pELElBQUksR0FBRyxHQUFHLGVBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRO1FBQ3pCLE9BQU8sR0FBRyxDQUFDO1NBQ1IsSUFBSSxHQUFHLENBQUMsT0FBTztRQUNsQixPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7O1FBRXpDLE9BQU8sc0JBQVMsQ0FBQyxFQUFFLEVBQUUsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEYsQ0FBQztBQTdERCxpQkFBUyxTQUFTLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbG9hZGVycy9jc3MtdXJsLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgd2IgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge3B1YmxpY1VybH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2Fzc2V0cy11cmwnO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG5pbXBvcnQgcGF0Y2hUZXh0LCB7UmVwbGFjZW1lbnRJbmZ9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtPYnNlcnZhYmxlLCBvZn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge2NvbmNhdE1hcCwgbWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge1Njc3NQYXJzZXIsIFNjc3NMZXhlcn0gZnJvbSAnLi4vdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyJztcbi8vIGltcG9ydCB7bG9hZGVyIGFzIHdiTG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnL2Nzcy11cmwtbG9hZGVyJyk7XG5cbmNvbnN0IHVybExvYWRlcjogd2IubG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwKSB7XG4gIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignRG9lcyBub3Qgc3VwcG9ydCBXZWJwYWNrIHdpdGhvdXQgYXN5bmMgbG9hZGVyIGZ1bmN0aW9uJyk7XG4gIH1cbiAgdmFyIGZpbGUgPSB0aGlzLnJlc291cmNlUGF0aDtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG4gIHJlcGxhY2VVcmwodGhpcywgY29udGVudCwgZmlsZSkuc3Vic2NyaWJlKHtcbiAgICBuZXh0KHJlcGwpIHtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHJlcGwpO1xuICAgIH0sXG4gICAgZXJyb3IoZSkge1xuICAgICAgc2VsZi5lbWl0RXJyb3IoZSk7XG4gICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICBjYWxsYmFjayEoZSk7XG4gICAgfSxcbiAgICBjb21wbGV0ZSgpIHtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gcGF0Y2hUZXh0KGNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG4gICAgICBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApXG4gICAgICAgIGxvZy5kZWJ1ZyhmaWxlLCByZXBsYWNlZCk7XG4gICAgICBjYWxsYmFjayEobnVsbCwgcmVwbGFjZWQsIG1hcCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCA9IHVybExvYWRlcjtcblxuZnVuY3Rpb24gcmVwbGFjZVVybChsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCBjc3M6IHN0cmluZywgZmlsZTogc3RyaW5nKTogT2JzZXJ2YWJsZTxSZXBsYWNlbWVudEluZj4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8UmVwbGFjZW1lbnRJbmY+KHN1YnNjcmliZXIgPT4ge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcihjc3MpO1xuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBTY3NzUGFyc2VyKGxleGVyKTtcbiAgICBjb25zdCByZXNVcmxzID0gcGFyc2VyLmdldFJlc1VybChjc3MpO1xuICAgIGZvciAoY29uc3Qge3N0YXJ0LCBlbmQsIHRleHR9IG9mIHJlc1VybHMpIHtcbiAgICAgIHN1YnNjcmliZXIubmV4dCh7c3RhcnQsIGVuZCwgdGV4dH0gYXMgUmVwbGFjZW1lbnRJbmYpO1xuICAgIH1cbiAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gIH0pLnBpcGUoY29uY2F0TWFwKCByZXBsID0+IHtcbiAgICB2YXIgcmVzb2x2ZWRUbyA9IHJlcGxhY2VBc3NldHNVcmwoZmlsZSwgcmVwbC50ZXh0ISk7XG4gICAgaWYgKHJlc29sdmVkVG8uc3RhcnRzV2l0aCgnficpKSB7XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlcGwudGV4dCEuc2xpY2UoMSkpXG4gICAgICAucGlwZShtYXAodXJsID0+IHtcbiAgICAgICAgcmVwbC50ZXh0ID0gdXJsO1xuICAgICAgICByZXR1cm4gcmVwbDtcbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKCFyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJy8nKSAmJiAhcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcjJykgJiYgcmVzb2x2ZWRUby5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlcGwudGV4dCAhPSBudWxsID8gcmVwbC50ZXh0ISA6IHJlcGwucmVwbGFjZW1lbnQhKVxuICAgICAgLnBpcGUobWFwKHVybCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHVybDtcbiAgICAgICAgcmV0dXJuIHJlcGw7XG4gICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZygndXJsOiAlcyAgLT4gJXMnLCByZXBsLnRleHQsIHJlc29sdmVkVG8pO1xuICAgICAgcmV0dXJuIG9mKHJlcGwpO1xuICAgIH1cbiAgfSkpO1xufVxuXG5mdW5jdGlvbiBsb2FkTW9kdWxlKGxvYWRlckN0eDogd2IubG9hZGVyLkxvYWRlckNvbnRleHQsIHVybDogc3RyaW5nKSB7XG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxzdHJpbmc+KGxvYWRNb2R1bGVTdWIgPT4ge1xuICAgIGxvYWRlckN0eC5sb2FkTW9kdWxlKHVybCwgKGVycjogRXJyb3IsIHNvdXJjZTogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gbG9hZE1vZHVsZVN1Yi5lcnJvcihlcnIpO1xuICAgICAgdmFyIHNhbmRib3ggPSB7XG4gICAgICAgIC8vIExhdGVyIG9uLCBBbmd1bGFyJ3MgcG9zdGNzcyBwbHVnaW4gd2lsbCBwcmVmaXggYGRlcGxveVVybC9wdWJsaWNQYXRoYCB0byB1cmwgc3RyaW5nXG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fOiAnLycsXG4gICAgICAgIG1vZHVsZToge1xuICAgICAgICAgIGV4cG9ydHM6IHt9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgIGNvbnN0IG5ld1VybCA9IHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nO1xuICAgICAgbG9hZE1vZHVsZVN1Yi5uZXh0KG5ld1VybCk7XG4gICAgICBsb2cuZGVidWcoJ3VybDogJXMgIC0+ICVzJywgdXJsLCBuZXdVcmwpO1xuICAgICAgbG9hZE1vZHVsZVN1Yi5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZUFzc2V0c1VybChmaWxlOiBzdHJpbmcsIHVybDogc3RyaW5nKSB7XG4gIHZhciByZXMgPSBhcGkubm9ybWFsaXplQXNzZXRzVXJsKHVybCwgZmlsZSk7XG4gIGlmICh0eXBlb2YgcmVzID09PSAnc3RyaW5nJylcbiAgICByZXR1cm4gcmVzO1xuICBlbHNlIGlmIChyZXMuaXNUaWxkZSlcbiAgICByZXR1cm4gYH4ke3Jlcy5wYWNrYWdlTmFtZX0vJHtyZXMucGF0aH1gO1xuICBlbHNlXG4gICAgcmV0dXJuIHB1YmxpY1VybCgnJywgYXBpLmNvbmZpZygpLm91dHB1dFBhdGhNYXAsIG51bGwsIHJlcy5wYWNrYWdlTmFtZSwgcmVzLnBhdGgpO1xufVxuIl19
