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
            return loadModule(loaderCtx, repl.text.slice(1)).pipe(operators_1.map(url => {
                repl.text = url;
                return repl;
            }));
        }
        else if (!resolvedTo.startsWith('/') && resolvedTo.indexOf(':') < 0) {
            return loadModule(loaderCtx, repl.text).pipe(operators_1.map(url => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMERBQXdCO0FBRXhCLG9FQUE4RDtBQUM5RCxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw2RUFBOEQ7QUFDOUQsK0JBQW9DO0FBQ3BDLDhDQUE4QztBQUM5QyxvRUFBa0U7QUFDbEUsOENBQThDO0FBQzlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTdFLE1BQU0sU0FBUyxHQUFxQixVQUFTLE9BQWUsRUFBRSxHQUFHO0lBQ2hFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO0lBRTFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN6QyxJQUFJLENBQUMsSUFBSTtZQUNSLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUNELEtBQUssQ0FBQyxDQUFDO1lBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2IsQ0FBQztRQUNELFFBQVE7WUFDUCxNQUFNLFFBQVEsR0FBRyxvQkFBUyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNsRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdB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QUFDLE1BQU0sQ0FBQyxPQUFpQixDQUFDO1lBQ2hELGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDM0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDekMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsR0FBVztJQUNsRCxJQUFJLEdBQUcsR0FBRyxlQUFHLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUTtRQUMxQixPQUFPLEdBQUcsQ0FBQztTQUNQLElBQUksR0FBRyxDQUFDLE9BQU87UUFDbkIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDOztRQUV6QyxPQUFPLHNCQUFTLENBQUMsRUFBRSxFQUFFLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3BGLENBQUM7QUEzREQsaUJBQVMsU0FBUyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2xvYWRlcnMvY3NzLXVybC1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIHdiIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtwdWJsaWNVcmx9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9hc3NldHMtdXJsJztcbi8vIGltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdm0gPSByZXF1aXJlKCd2bScpO1xuaW1wb3J0IHBhdGNoVGV4dCwge1JlcGxhY2VtZW50SW5mfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7T2JzZXJ2YWJsZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtjb25jYXRNYXAsIG1hcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtTY3NzUGFyc2VyLCBTY3NzTGV4ZXJ9IGZyb20gJy4uL3V0aWxzL3NpbXBsZS1zY3NzLXBhcnNlcic7XG4vLyBpbXBvcnQge2xvYWRlciBhcyB3YkxvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy9jc3MtdXJsLWxvYWRlcicpO1xuXG5jb25zdCB1cmxMb2FkZXI6IHdiLmxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihjb250ZW50OiBzdHJpbmcsIG1hcCkge1xuXHR2YXIgY2FsbGJhY2sgPSB0aGlzLmFzeW5jKCk7XG5cdHZhciBmaWxlID0gdGhpcy5yZXNvdXJjZVBhdGg7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXHRjb25zdCByZXBsYWNlbWVudHM6IFJlcGxhY2VtZW50SW5mW10gPSBbXTtcblxuXHRyZXBsYWNlVXJsKHRoaXMsIGNvbnRlbnQsIGZpbGUpLnN1YnNjcmliZSh7XG5cdFx0bmV4dChyZXBsKSB7XG5cdFx0XHRyZXBsYWNlbWVudHMucHVzaChyZXBsKTtcblx0XHR9LFxuXHRcdGVycm9yKGUpIHtcblx0XHRcdHNlbGYuZW1pdEVycm9yKGUpO1xuXHRcdFx0bG9nLmVycm9yKGUpO1xuXHRcdFx0Y2FsbGJhY2soZSk7XG5cdFx0fSxcblx0XHRjb21wbGV0ZSgpIHtcblx0XHRcdGNvbnN0IHJlcGxhY2VkID0gcGF0Y2hUZXh0KGNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG5cdFx0XHRpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApXG5cdFx0XHRcdGxvZy5kZWJ1ZyhmaWxlLCByZXBsYWNlZCk7XG5cdFx0XHRjYWxsYmFjayhudWxsLCByZXBsYWNlZCwgbWFwKTtcblx0XHR9XG5cdH0pO1xufTtcblxuZXhwb3J0ID0gdXJsTG9hZGVyO1xuXG5mdW5jdGlvbiByZXBsYWNlVXJsKGxvYWRlckN0eDogd2IubG9hZGVyLkxvYWRlckNvbnRleHQsIGNzczogc3RyaW5nLCBmaWxlOiBzdHJpbmcpOiBPYnNlcnZhYmxlPFJlcGxhY2VtZW50SW5mPiB7XG5cdHJldHVybiBuZXcgT2JzZXJ2YWJsZTxSZXBsYWNlbWVudEluZj4oc3Vic2NyaWJlciA9PiB7XG5cdFx0Y29uc3QgbGV4ZXIgPSBuZXcgU2Nzc0xleGVyKGNzcyk7XG5cdFx0Y29uc3QgcGFyc2VyID0gbmV3IFNjc3NQYXJzZXIobGV4ZXIpO1xuXHRcdGNvbnN0IHJlc1VybHMgPSBwYXJzZXIuZ2V0UmVzVXJsKGNzcyk7XG5cdFx0Zm9yIChjb25zdCB7c3RhcnQsIGVuZCwgdGV4dH0gb2YgcmVzVXJscykge1xuXHRcdFx0c3Vic2NyaWJlci5uZXh0KHtzdGFydCwgZW5kLCB0ZXh0fSBhcyBSZXBsYWNlbWVudEluZik7XG5cdFx0fVxuXHRcdHN1YnNjcmliZXIuY29tcGxldGUoKTtcblx0fSkucGlwZShjb25jYXRNYXAoIHJlcGwgPT4ge1xuXHRcdHZhciByZXNvbHZlZFRvID0gcmVwbGFjZUFzc2V0c1VybChmaWxlLCByZXBsLnRleHQpO1xuXHRcdGlmIChyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJ34nKSkge1xuXHRcdFx0cmV0dXJuIGxvYWRNb2R1bGUobG9hZGVyQ3R4LCByZXBsLnRleHQuc2xpY2UoMSkpLnBpcGUobWFwKHVybCA9PiB7XG5cdFx0XHRcdHJlcGwudGV4dCA9IHVybDtcblx0XHRcdFx0cmV0dXJuIHJlcGw7XG5cdFx0XHR9KSk7XG5cdFx0fSBlbHNlIGlmICghcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcvJykgJiYgcmVzb2x2ZWRUby5pbmRleE9mKCc6JykgPCAwKSB7XG5cdFx0XHRyZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlcGwudGV4dCkucGlwZShtYXAodXJsID0+IHtcblx0XHRcdFx0cmVwbC50ZXh0ID0gdXJsO1xuXHRcdFx0XHRyZXR1cm4gcmVwbDtcblx0XHRcdH0pKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bG9nLmRlYnVnKCd1cmw6ICVzICAtPiAlcycsIHJlcGwudGV4dCwgcmVzb2x2ZWRUbyk7XG5cdFx0XHRyZXR1cm4gb2YocmVwbCk7XG5cdFx0fVxuXHR9KSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyQ3R4OiB3Yi5sb2FkZXIuTG9hZGVyQ29udGV4dCwgdXJsOiBzdHJpbmcpIHtcblx0cmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4obG9hZE1vZHVsZVN1YiA9PiB7XG5cdFx0bG9hZGVyQ3R4LmxvYWRNb2R1bGUodXJsLCAoZXJyOiBFcnJvciwgc291cmNlOiBhbnkpID0+IHtcblx0XHRcdGlmIChlcnIpXG5cdFx0XHRcdHJldHVybiBsb2FkTW9kdWxlU3ViLmVycm9yKGVycik7XG5cdFx0XHR2YXIgc2FuZGJveCA9IHtcblx0XHRcdFx0Ly8gTGF0ZXIgb24sIEFuZ3VsYXIncyBwb3N0Y3NzIHBsdWdpbiB3aWxsIHByZWZpeCBgZGVwbG95VXJsL3B1YmxpY1BhdGhgIHRvIHVybCBzdHJpbmdcblx0XHRcdFx0X193ZWJwYWNrX3B1YmxpY19wYXRoX186ICcvJyxcblx0XHRcdFx0bW9kdWxlOiB7XG5cdFx0XHRcdFx0ZXhwb3J0czoge31cblx0XHRcdFx0fVxuXHRcdFx0fTtcblx0XHRcdHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuXHRcdFx0Y29uc3QgbmV3VXJsID0gc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmc7XG5cdFx0XHRsb2FkTW9kdWxlU3ViLm5leHQobmV3VXJsKTtcblx0XHRcdGxvZy5kZWJ1ZygndXJsOiAlcyAgLT4gJXMnLCB1cmwsIG5ld1VybCk7XG5cdFx0XHRsb2FkTW9kdWxlU3ViLmNvbXBsZXRlKCk7XG5cdFx0fSk7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlQXNzZXRzVXJsKGZpbGU6IHN0cmluZywgdXJsOiBzdHJpbmcpIHtcblx0dmFyIHJlcyA9IGFwaS5ub3JtYWxpemVBc3NldHNVcmwodXJsLCBmaWxlKTtcblx0aWYgKHR5cGVvZiByZXMgPT09ICdzdHJpbmcnKVxuXHRcdHJldHVybiByZXM7XG5cdGVsc2UgaWYgKHJlcy5pc1RpbGRlKVxuXHRcdHJldHVybiBgfiR7cmVzLnBhY2thZ2VOYW1lfS8ke3Jlcy5wYXRofWA7XG5cdGVsc2Vcblx0XHRyZXR1cm4gcHVibGljVXJsKCcnLCBhcGkuY29uZmlnKCkub3V0cHV0UGF0aE1hcCwgbnVsbCwgcmVzLnBhY2thZ2VOYW1lLCByZXMucGF0aCk7XG59XG4iXX0=
