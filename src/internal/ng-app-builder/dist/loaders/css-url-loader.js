"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = __importDefault(require("__api"));
const patch_text_1 = __importDefault(require("../utils/patch-text"));
const simple_scss_parser_1 = require("../utils/simple-scss-parser");
// import * as Path from 'path';
// import * as _ from 'lodash';
const vm = require("vm");
// import {loader as wbLoader} from 'webpack';
const log = require('log4js').getLogger(__api_1.default.packageName + '.css-url-loader');
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
            log.debug('final url', repl.text);
        },
        error(e) {
            self.emitError(e);
            log.error(file, e);
            callback(e);
        },
        complete() {
            const replaced = patch_text_1.default(content, replacements);
            // if (replacements.length > 0)
            //   log.debug(file, replaced);
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
        log.debug('%s -> %s (%s)', repl.text, resolvedTo, file);
        if (resolvedTo.startsWith('~')) {
            return loadModule(loaderCtx, resolvedTo.slice(1))
                .pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else if (!resolvedTo.startsWith('/') && !resolvedTo.startsWith('#') && resolvedTo.indexOf(':') < 0) {
            if (!resolvedTo.startsWith('.'))
                resolvedTo = './' + resolvedTo; // Fix AOT mode in Angular 8.2.x
            return loadModule(loaderCtx, resolvedTo)
                .pipe(operators_1.map(url => {
                repl.text = url;
                log.debug('loadModule:', url);
                return repl;
            }));
        }
        else {
            log.debug('url: %s  -> %s', repl.text, resolvedTo);
            repl.text = resolvedTo;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLXVybC1sb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjc3MtdXJsLWxvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsK0JBQXNDO0FBQ3RDLDhDQUFnRDtBQUVoRCxrREFBd0I7QUFDeEIscUVBQWdFO0FBQ2hFLG9FQUFvRTtBQUNwRSxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw4Q0FBOEM7QUFDOUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFFN0UsTUFBTSxTQUFTLEdBQXFCLFVBQVMsT0FBZSxFQUFFLEdBQUc7SUFDL0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7S0FDM0U7SUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO0lBRTFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSTtZQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDRCxLQUFLLENBQUMsQ0FBQztZQUNMLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkIs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bkVELGlCQUFTLFNBQVMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE9ic2VydmFibGUsIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHdiIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgcGF0Y2hUZXh0LCB7IFJlcGxhY2VtZW50SW5mIH0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgeyBTY3NzTGV4ZXIsIFNjc3NQYXJzZXIgfSBmcm9tICcuLi91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXInO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG4vLyBpbXBvcnQge2xvYWRlciBhcyB3YkxvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jc3MtdXJsLWxvYWRlcicpO1xuXG5jb25zdCB1cmxMb2FkZXI6IHdiLmxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihjb250ZW50OiBzdHJpbmcsIG1hcCkge1xuICB2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0RvZXMgbm90IHN1cHBvcnQgV2VicGFjayB3aXRob3V0IGFzeW5jIGxvYWRlciBmdW5jdGlvbicpO1xuICB9XG4gIHZhciBmaWxlID0gdGhpcy5yZXNvdXJjZVBhdGg7XG4gIGNvbnN0IHNlbGYgPSB0aGlzO1xuICBjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcblxuICByZXBsYWNlVXJsKHRoaXMsIGNvbnRlbnQsIGZpbGUpLnN1YnNjcmliZSh7XG4gICAgbmV4dChyZXBsKSB7XG4gICAgICByZXBsYWNlbWVudHMucHVzaChyZXBsKTtcbiAgICAgIGxvZy5kZWJ1ZygnZmluYWwgdXJsJywgcmVwbC50ZXh0KTtcbiAgICB9LFxuICAgIGVycm9yKGUpIHtcbiAgICAgIHNlbGYuZW1pdEVycm9yKGUpO1xuICAgICAgbG9nLmVycm9yKGZpbGUsIGUpO1xuICAgICAgY2FsbGJhY2shKGUpO1xuICAgIH0sXG4gICAgY29tcGxldGUoKSB7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IHBhdGNoVGV4dChjb250ZW50LCByZXBsYWNlbWVudHMpO1xuICAgICAgLy8gaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKVxuICAgICAgLy8gICBsb2cuZGVidWcoZmlsZSwgcmVwbGFjZWQpO1xuICAgICAgY2FsbGJhY2shKG51bGwsIHJlcGxhY2VkLCBtYXApO1xuICAgIH1cbiAgfSk7XG59O1xuXG5leHBvcnQgPSB1cmxMb2FkZXI7XG5cbmZ1bmN0aW9uIHJlcGxhY2VVcmwobG9hZGVyQ3R4OiB3Yi5sb2FkZXIuTG9hZGVyQ29udGV4dCwgY3NzOiBzdHJpbmcsIGZpbGU6IHN0cmluZyk6IE9ic2VydmFibGU8UmVwbGFjZW1lbnRJbmY+IHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPFJlcGxhY2VtZW50SW5mPihzdWJzY3JpYmVyID0+IHtcbiAgICBjb25zdCBsZXhlciA9IG5ldyBTY3NzTGV4ZXIoY3NzKTtcbiAgICBjb25zdCBwYXJzZXIgPSBuZXcgU2Nzc1BhcnNlcihsZXhlcik7XG4gICAgY29uc3QgcmVzVXJscyA9IHBhcnNlci5nZXRSZXNVcmwoY3NzKTtcbiAgICBmb3IgKGNvbnN0IHtzdGFydCwgZW5kLCB0ZXh0fSBvZiByZXNVcmxzKSB7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoe3N0YXJ0LCBlbmQsIHRleHR9IGFzIFJlcGxhY2VtZW50SW5mKTtcbiAgICB9XG4gICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICB9KS5waXBlKGNvbmNhdE1hcCggcmVwbCA9PiB7XG4gICAgdmFyIHJlc29sdmVkVG8gPSByZXBsYWNlQXNzZXRzVXJsKGZpbGUsIHJlcGwudGV4dCEpO1xuICAgIGxvZy5kZWJ1ZygnJXMgLT4gJXMgKCVzKScsIHJlcGwudGV4dCwgcmVzb2x2ZWRUbywgZmlsZSk7XG4gICAgaWYgKHJlc29sdmVkVG8uc3RhcnRzV2l0aCgnficpKSB7XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlc29sdmVkVG8hLnNsaWNlKDEpKVxuICAgICAgLnBpcGUobWFwKHVybCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHVybDtcbiAgICAgICAgcmV0dXJuIHJlcGw7XG4gICAgICB9KSk7XG4gICAgfSBlbHNlIGlmICghcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcvJykgJiYgIXJlc29sdmVkVG8uc3RhcnRzV2l0aCgnIycpICYmIHJlc29sdmVkVG8uaW5kZXhPZignOicpIDwgMCkge1xuICAgICAgaWYgKCFyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgcmVzb2x2ZWRUbyA9ICcuLycgKyByZXNvbHZlZFRvOyAvLyBGaXggQU9UIG1vZGUgaW4gQW5ndWxhciA4LjIueFxuICAgICAgcmV0dXJuIGxvYWRNb2R1bGUobG9hZGVyQ3R4LCByZXNvbHZlZFRvKVxuICAgICAgLnBpcGUobWFwKHVybCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHVybDtcbiAgICAgICAgbG9nLmRlYnVnKCdsb2FkTW9kdWxlOicsIHVybCk7XG4gICAgICAgIHJldHVybiByZXBsO1xuICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ3VybDogJXMgIC0+ICVzJywgcmVwbC50ZXh0LCByZXNvbHZlZFRvKTtcbiAgICAgIHJlcGwudGV4dCA9IHJlc29sdmVkVG87XG4gICAgICByZXR1cm4gb2YocmVwbCk7XG4gICAgfVxuICB9KSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyQ3R4OiB3Yi5sb2FkZXIuTG9hZGVyQ29udGV4dCwgdXJsOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4obG9hZE1vZHVsZVN1YiA9PiB7XG4gICAgbG9hZGVyQ3R4LmxvYWRNb2R1bGUodXJsLCAoZXJyOiBFcnJvciwgc291cmNlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBsb2FkTW9kdWxlU3ViLmVycm9yKGVycik7XG4gICAgICB2YXIgc2FuZGJveCA9IHtcbiAgICAgICAgLy8gU2luY2UgQW5ndWxhciA4LjAsIHBvc3Rjc3MgcGx1Z2luIHdpbGwgbm8gbG9uZ2VyIGFkZCBgZGVwbG95VXJsL3B1YmxpY1BhdGhgIHRvIHVybCBzdHJpbmdcbiAgICAgICAgX193ZWJwYWNrX3B1YmxpY19wYXRoX186IGxvYWRlckN0eC5fY29tcGlsZXIub3B0aW9ucy5vdXRwdXQhLnB1YmxpY1BhdGgsXG4gICAgICAgIG1vZHVsZToge1xuICAgICAgICAgIGV4cG9ydHM6IHt9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgIGNvbnN0IG5ld1VybCA9IHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nO1xuICAgICAgbG9hZE1vZHVsZVN1Yi5uZXh0KG5ld1VybCk7XG4gICAgICAvLyBsb2cud2FybigndXJsOiAlcyAgLT4gJXMnLCB1cmwsIG5ld1VybCk7XG4gICAgICBsb2FkTW9kdWxlU3ViLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlQXNzZXRzVXJsKGZpbGU6IHN0cmluZywgdXJsOiBzdHJpbmcpIHtcbiAgdmFyIHJlcyA9IGFwaS5ub3JtYWxpemVBc3NldHNVcmwodXJsLCBmaWxlKTtcbiAgaWYgKHR5cGVvZiByZXMgPT09ICdzdHJpbmcnKVxuICAgIHJldHVybiByZXM7XG4gIGVsc2UgaWYgKHJlcy5pc1RpbGRlKVxuICAgIHJldHVybiBgfiR7cmVzLnBhY2thZ2VOYW1lfS8ke3Jlcy5wYXRofWA7XG4gIGVsc2VcbiAgICByZXR1cm4gYXBpLmFzc2V0c1VybChyZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKTtcbiAgICAvLyByZXR1cm4gcHVibGljVXJsKCcnLCBhcGkuY29uZmlnKCkub3V0cHV0UGF0aE1hcCwgbnVsbCwgcmVzLnBhY2thZ2VOYW1lLCByZXMucGF0aCk7XG59XG4iXX0=