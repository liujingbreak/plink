"use strict";
const tslib_1 = require("tslib");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = tslib_1.__importDefault(require("__api"));
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
// import * as Path from 'path';
// import * as _ from 'lodash';
const vm = require("vm");
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
            log.error(file, e);
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
                // Since Angular 8.0, postcss plugin will no longer add `deployUrl/publicPath` to url string
                __webpack_public_path__: loaderCtx._compiler.options.output.publicPath,
                module: {
                    exports: {}
                }
            };
            vm.runInNewContext(source, vm.createContext(sandbox));
            const newUrl = sandbox.module.exports;
            loadModuleSub.next(newUrl);
            // log.warn('url: %s  -> %s', url, newUrl);
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
        return __api_1.default.assetsUrl(res.packageName, res.path);
    // return publicUrl('', api.config().outputPathMap, null, res.packageName, res.path);
}
module.exports = urlLoader;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQXNDO0FBQ3RDLDhDQUFnRDtBQUVoRCwwREFBd0I7QUFDeEIsNkVBQWdFO0FBQ2hFLG9FQUFvRTtBQUNwRSxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw4Q0FBOEM7QUFDOUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFFN0UsTUFBTSxTQUFTLEdBQXFCLFVBQVMsT0FBZSxFQUFFLEdBQUc7SUFDL0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7S0FDM0U7SUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO0lBRTFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSTtZQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELEtBQUssQ0FBQyxDQUFDO1lBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuQixRQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDZixDQUFDO1FBQ0QsUUFBUTtZQUNOLE1BQU0sUUFBUSxHQUFHLG9CQUFTLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBQ2xELElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDO2dCQUN6QixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1QixRQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqQyxDQUFDO0tBQ0YsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBSUYsU0FBUyxVQUFVLENBQUMsU0FBa0MsRUFBRSxHQUFXLEVBQUUsSUFBWTtJQUMvRSxPQUFPLElBQUksaUJBQVUsQ0FBaUIsVUFBVSxDQUFDLEVBQUU7UUFDakQsTUFBTSxLQUFLLEdBQUcsSUFBSSw4QkFBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLElBQUksK0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3RDLEtBQUssTUFBTSxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLElBQUksT0FBTyxFQUFFO1lBQ3hDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBbUIsQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBUyxDQUFFLElBQUksQ0FBQyxFQUFFO1FBQ3hCLElBQUksVUFBVSxHQUFHLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSyxDQUFDLENBQUM7UUFDcEQsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQzlCLE9BQU8sVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDaEQsSUFBSSxDQUFDLGVBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDZCxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDaEIsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ0w7YUFBTSxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEcsT0FBTyxVQUFVLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBWSxDQUFDO2lCQUMvRSxJQUFJLENBQUMsZUFBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO2dCQUNoQixPQUFPLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDTDthQUFNO1lBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1lBQ25ELE9BQU8sU0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2pCO0lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxTQUFrQyxFQUFFLEdBQVc7SUFDakUsT0FBTyxJQUFJLGlCQUFVLENBQVMsYUFBYSxDQUFDLEVBQUU7UUFDNUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFVLEVBQUUsTUFBVyxFQUFFLEVBQUU7WUFDcEQsSUFBSSxHQUFHO2dCQUNMLE9BQU8sYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNsQyxJQUFJLE9BQU8sR0FBRztnQkFDWiw0RkFBNEY7Z0JBQzVGLHVCQUF1QixFQUFFLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU8sQ0FBQyxVQUFVO2dCQUN2RSxNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLEVBQUU7aUJBQ1o7YUFDRixDQUFDO1lBQ0YsRUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBaUIsQ0FBQztZQUNoRCxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNCLDJDQUEyQztZQUMzQyxhQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQVksRUFBRSxHQUFXO0lBQ2pELElBQUksR0FBRyxHQUFHLGVBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRO1FBQ3pCLE9BQU8sR0FBRyxDQUFDO1NBQ1IsSUFBSSxHQUFHLENBQUMsT0FBTztRQUNsQixPQUFPLElBQUksR0FBRyxDQUFDLFdBQVcsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7O1FBRXpDLE9BQU8sZUFBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNoRCxxRkFBcUY7QUFDekYsQ0FBQztBQTlERCxpQkFBUyxTQUFTLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbG9hZGVycy9jc3MtdXJsLWxvYWRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUsIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHdiIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgcGF0Y2hUZXh0LCB7IFJlcGxhY2VtZW50SW5mIH0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgeyBTY3NzTGV4ZXIsIFNjc3NQYXJzZXIgfSBmcm9tICcuLi91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXInO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG4vLyBpbXBvcnQge2xvYWRlciBhcyB3YkxvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy9jc3MtdXJsLWxvYWRlcicpO1xuXG5jb25zdCB1cmxMb2FkZXI6IHdiLmxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihjb250ZW50OiBzdHJpbmcsIG1hcCkge1xuICB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvZXMgbm90IHN1cHBvcnQgV2VicGFjayB3aXRob3V0IGFzeW5jIGxvYWRlciBmdW5jdGlvbicpO1xuICB9XG4gIHZhciBmaWxlID0gdGhpcy5yZXNvdXJjZVBhdGg7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcblxuICByZXBsYWNlVXJsKHRoaXMsIGNvbnRlbnQsIGZpbGUpLnN1YnNjcmliZSh7XG4gICAgbmV4dChyZXBsKSB7XG4gICAgICByZXBsYWNlbWVudHMucHVzaChyZXBsKTtcbiAgICB9LFxuICAgIGVycm9yKGUpIHtcbiAgICAgIHNlbGYuZW1pdEVycm9yKGUpO1xuICAgICAgbG9nLmVycm9yKGZpbGUsIGUpO1xuICAgICAgY2FsbGJhY2shKGUpO1xuICAgIH0sXG4gICAgY29tcGxldGUoKSB7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IHBhdGNoVGV4dChjb250ZW50LCByZXBsYWNlbWVudHMpO1xuICAgICAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKVxuICAgICAgICBsb2cuZGVidWcoZmlsZSwgcmVwbGFjZWQpO1xuICAgICAgY2FsbGJhY2shKG51bGwsIHJlcGxhY2VkLCBtYXApO1xuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnQgPSB1cmxMb2FkZXI7XG5cbmZ1bmN0aW9uIHJlcGxhY2VVcmwobG9hZGVyQ3R4OiB3Yi5sb2FkZXIuTG9hZGVyQ29udGV4dCwgY3NzOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IE9ic2VydmFibGU8UmVwbGFjZW1lbnRJbmY+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFJlcGxhY2VtZW50SW5mPihzdWJzY3JpYmVyID0+IHtcbiAgICBjb25zdCBsZXhlciA9IG5ldyBTY3NzTGV4ZXIoY3NzKTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgU2Nzc1BhcnNlcihsZXhlcik7XG4gICAgY29uc3QgcmVzVXJscyA9IHBhcnNlci5nZXRSZXNVcmwoY3NzKTtcbiAgICBmb3IgKGNvbnN0IHtzdGFydCwgZW5kLCB0ZXh0fSBvZiByZXNVcmxzKSB7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoe3N0YXJ0LCBlbmQsIHRleHR9IGFzIFJlcGxhY2VtZW50SW5mKTtcbiAgICB9XG4gICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICB9KS5waXBlKGNvbmNhdE1hcCggcmVwbCA9PiB7XG4gICAgdmFyIHJlc29sdmVkVG8gPSByZXBsYWNlQXNzZXRzVXJsKGZpbGUsIHJlcGwudGV4dCEpO1xuICAgIGlmIChyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJ34nKSkge1xuICAgICAgcmV0dXJuIGxvYWRNb2R1bGUobG9hZGVyQ3R4LCByZXBsLnRleHQhLnNsaWNlKDEpKVxuICAgICAgLnBpcGUobWFwKHVybCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHVybDtcbiAgICAgICAgcmV0dXJuIHJlcGw7XG4gICAgICB9KSk7XG4gICAgfSBlbHNlIGlmICghcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcvJykgJiYgIXJlc29sdmVkVG8uc3RhcnRzV2l0aCgnIycpICYmIHJlc29sdmVkVG8uaW5kZXhPZignOicpIDwgMCkge1xuICAgICAgcmV0dXJuIGxvYWRNb2R1bGUobG9hZGVyQ3R4LCByZXBsLnRleHQgIT0gbnVsbCA/IHJlcGwudGV4dCEgOiByZXBsLnJlcGxhY2VtZW50ISlcbiAgICAgIC5waXBlKG1hcCh1cmwgPT4ge1xuICAgICAgICByZXBsLnRleHQgPSB1cmw7XG4gICAgICAgIHJldHVybiByZXBsO1xuICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ3VybDogJXMgIC0+ICVzJywgcmVwbC50ZXh0LCByZXNvbHZlZFRvKTtcbiAgICAgIHJldHVybiBvZihyZXBsKTtcbiAgICB9XG4gIH0pKTtcbn1cblxuZnVuY3Rpb24gbG9hZE1vZHVsZShsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCB1cmw6IHN0cmluZykge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihsb2FkTW9kdWxlU3ViID0+IHtcbiAgICBsb2FkZXJDdHgubG9hZE1vZHVsZSh1cmwsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSkgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIGxvYWRNb2R1bGVTdWIuZXJyb3IoZXJyKTtcbiAgICAgIHZhciBzYW5kYm94ID0ge1xuICAgICAgICAvLyBTaW5jZSBBbmd1bGFyIDguMCwgcG9zdGNzcyBwbHVnaW4gd2lsbCBubyBsb25nZXIgYWRkIGBkZXBsb3lVcmwvcHVibGljUGF0aGAgdG8gdXJsIHN0cmluZ1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXzogbG9hZGVyQ3R4Ll9jb21waWxlci5vcHRpb25zLm91dHB1dCEucHVibGljUGF0aCxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czoge31cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgY29uc3QgbmV3VXJsID0gc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmc7XG4gICAgICBsb2FkTW9kdWxlU3ViLm5leHQobmV3VXJsKTtcbiAgICAgIC8vIGxvZy53YXJuKCd1cmw6ICVzICAtPiAlcycsIHVybCwgbmV3VXJsKTtcbiAgICAgIGxvYWRNb2R1bGVTdWIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VBc3NldHNVcmwoZmlsZTogc3RyaW5nLCB1cmw6IHN0cmluZykge1xuICB2YXIgcmVzID0gYXBpLm5vcm1hbGl6ZUFzc2V0c1VybCh1cmwsIGZpbGUpO1xuICBpZiAodHlwZW9mIHJlcyA9PT0gJ3N0cmluZycpXG4gICAgcmV0dXJuIHJlcztcbiAgZWxzZSBpZiAocmVzLmlzVGlsZGUpXG4gICAgcmV0dXJuIGB+JHtyZXMucGFja2FnZU5hbWV9LyR7cmVzLnBhdGh9YDtcbiAgZWxzZVxuICAgIHJldHVybiBhcGkuYXNzZXRzVXJsKHJlcy5wYWNrYWdlTmFtZSwgcmVzLnBhdGgpO1xuICAgIC8vIHJldHVybiBwdWJsaWNVcmwoJycsIGFwaS5jb25maWcoKS5vdXRwdXRQYXRoTWFwLCBudWxsLCByZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKTtcbn1cbiJdfQ==
