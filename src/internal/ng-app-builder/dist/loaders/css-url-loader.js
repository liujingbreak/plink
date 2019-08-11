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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQXNDO0FBQ3RDLDhDQUFnRDtBQUVoRCwwREFBd0I7QUFDeEIsNkVBQWdFO0FBQ2hFLG9FQUFvRTtBQUNwRSxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw4Q0FBOEM7QUFDOUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFFN0UsTUFBTSxTQUFTLEdBQXFCLFVBQVMsT0FBZSxFQUFFLEdBQUc7SUFDL0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7S0FDM0U7SUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO0lBRTFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSTtZQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDRCxLQUFLLENBQUMsQ0FBQztZQUNMLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFD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O0FBbkVELGlCQUFTLFNBQVMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgbWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgd2IgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBwYXRjaFRleHQsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7IFNjc3NMZXhlciwgU2Nzc1BhcnNlciB9IGZyb20gJy4uL3V0aWxzL3NpbXBsZS1zY3NzLXBhcnNlcic7XG4vLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbi8vIGltcG9ydCB7bG9hZGVyIGFzIHdiTG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNzcy11cmwtbG9hZGVyJyk7XG5cbmNvbnN0IHVybExvYWRlcjogd2IubG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKGNvbnRlbnQ6IHN0cmluZywgbWFwKSB7XG4gIHZhciBjYWxsYmFjayA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHRocm93IG5ldyBFcnJvcignRG9lcyBub3Qgc3VwcG9ydCBXZWJwYWNrIHdpdGhvdXQgYXN5bmMgbG9hZGVyIGZ1bmN0aW9uJyk7XG4gIH1cbiAgdmFyIGZpbGUgPSB0aGlzLnJlc291cmNlUGF0aDtcbiAgY29uc3Qgc2VsZiA9IHRoaXM7XG4gIGNvbnN0IHJlcGxhY2VtZW50czogUmVwbGFjZW1lbnRJbmZbXSA9IFtdO1xuXG4gIHJlcGxhY2VVcmwodGhpcywgY29udGVudCwgZmlsZSkuc3Vic2NyaWJlKHtcbiAgICBuZXh0KHJlcGwpIHtcbiAgICAgIHJlcGxhY2VtZW50cy5wdXNoKHJlcGwpO1xuICAgICAgbG9nLmRlYnVnKCdmaW5hbCB1cmwnLCByZXBsLnRleHQpO1xuICAgIH0sXG4gICAgZXJyb3IoZSkge1xuICAgICAgc2VsZi5lbWl0RXJyb3IoZSk7XG4gICAgICBsb2cuZXJyb3IoZmlsZSwgZSk7XG4gICAgICBjYWxsYmFjayEoZSk7XG4gICAgfSxcbiAgICBjb21wbGV0ZSgpIHtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gcGF0Y2hUZXh0KGNvbnRlbnQsIHJlcGxhY2VtZW50cyk7XG4gICAgICAvLyBpZiAocmVwbGFjZW1lbnRzLmxlbmd0aCA+IDApXG4gICAgICAvLyAgIGxvZy5kZWJ1ZyhmaWxlLCByZXBsYWNlZCk7XG4gICAgICBjYWxsYmFjayEobnVsbCwgcmVwbGFjZWQsIG1hcCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCA9IHVybExvYWRlcjtcblxuZnVuY3Rpb24gcmVwbGFjZVVybChsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCBjc3M6IHN0cmluZywgZmlsZTogc3RyaW5nKTogT2JzZXJ2YWJsZTxSZXBsYWNlbWVudEluZj4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8UmVwbGFjZW1lbnRJbmY+KHN1YnNjcmliZXIgPT4ge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcihjc3MpO1xuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBTY3NzUGFyc2VyKGxleGVyKTtcbiAgICBjb25zdCByZXNVcmxzID0gcGFyc2VyLmdldFJlc1VybChjc3MpO1xuICAgIGZvciAoY29uc3Qge3N0YXJ0LCBlbmQsIHRleHR9IG9mIHJlc1VybHMpIHtcbiAgICAgIHN1YnNjcmliZXIubmV4dCh7c3RhcnQsIGVuZCwgdGV4dH0gYXMgUmVwbGFjZW1lbnRJbmYpO1xuICAgIH1cbiAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gIH0pLnBpcGUoY29uY2F0TWFwKCByZXBsID0+IHtcbiAgICB2YXIgcmVzb2x2ZWRUbyA9IHJlcGxhY2VBc3NldHNVcmwoZmlsZSwgcmVwbC50ZXh0ISk7XG4gICAgbG9nLmRlYnVnKCclcyAtPiAlcyAoJXMpJywgcmVwbC50ZXh0LCByZXNvbHZlZFRvLCBmaWxlKTtcbiAgICBpZiAocmVzb2x2ZWRUby5zdGFydHNXaXRoKCd+JykpIHtcbiAgICAgIHJldHVybiBsb2FkTW9kdWxlKGxvYWRlckN0eCwgcmVzb2x2ZWRUbyEuc2xpY2UoMSkpXG4gICAgICAucGlwZShtYXAodXJsID0+IHtcbiAgICAgICAgcmVwbC50ZXh0ID0gdXJsO1xuICAgICAgICByZXR1cm4gcmVwbDtcbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKCFyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJy8nKSAmJiAhcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcjJykgJiYgcmVzb2x2ZWRUby5pbmRleE9mKCc6JykgPCAwKSB7XG4gICAgICBpZiAoIXJlc29sdmVkVG8uc3RhcnRzV2l0aCgnLicpKVxuICAgICAgICByZXNvbHZlZFRvID0gJy4vJyArIHJlc29sdmVkVG87IC8vIEZpeCBBT1QgbW9kZSBpbiBBbmd1bGFyIDguMi54XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlc29sdmVkVG8pXG4gICAgICAucGlwZShtYXAodXJsID0+IHtcbiAgICAgICAgcmVwbC50ZXh0ID0gdXJsO1xuICAgICAgICBsb2cuZGVidWcoJ2xvYWRNb2R1bGU6JywgdXJsKTtcbiAgICAgICAgcmV0dXJuIHJlcGw7XG4gICAgICB9KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZygndXJsOiAlcyAgLT4gJXMnLCByZXBsLnRleHQsIHJlc29sdmVkVG8pO1xuICAgICAgcmVwbC50ZXh0ID0gcmVzb2x2ZWRUbztcbiAgICAgIHJldHVybiBvZihyZXBsKTtcbiAgICB9XG4gIH0pKTtcbn1cblxuZnVuY3Rpb24gbG9hZE1vZHVsZShsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCB1cmw6IHN0cmluZykge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihsb2FkTW9kdWxlU3ViID0+IHtcbiAgICBsb2FkZXJDdHgubG9hZE1vZHVsZSh1cmwsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSkgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIGxvYWRNb2R1bGVTdWIuZXJyb3IoZXJyKTtcbiAgICAgIHZhciBzYW5kYm94ID0ge1xuICAgICAgICAvLyBTaW5jZSBBbmd1bGFyIDguMCwgcG9zdGNzcyBwbHVnaW4gd2lsbCBubyBsb25nZXIgYWRkIGBkZXBsb3lVcmwvcHVibGljUGF0aGAgdG8gdXJsIHN0cmluZ1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXzogbG9hZGVyQ3R4Ll9jb21waWxlci5vcHRpb25zLm91dHB1dCEucHVibGljUGF0aCxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czoge31cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgY29uc3QgbmV3VXJsID0gc2FuZGJveC5tb2R1bGUuZXhwb3J0cyBhcyBzdHJpbmc7XG4gICAgICBsb2FkTW9kdWxlU3ViLm5leHQobmV3VXJsKTtcbiAgICAgIC8vIGxvZy53YXJuKCd1cmw6ICVzICAtPiAlcycsIHVybCwgbmV3VXJsKTtcbiAgICAgIGxvYWRNb2R1bGVTdWIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VBc3NldHNVcmwoZmlsZTogc3RyaW5nLCB1cmw6IHN0cmluZykge1xuICB2YXIgcmVzID0gYXBpLm5vcm1hbGl6ZUFzc2V0c1VybCh1cmwsIGZpbGUpO1xuICBpZiAodHlwZW9mIHJlcyA9PT0gJ3N0cmluZycpXG4gICAgcmV0dXJuIHJlcztcbiAgZWxzZSBpZiAocmVzLmlzVGlsZGUpXG4gICAgcmV0dXJuIGB+JHtyZXMucGFja2FnZU5hbWV9LyR7cmVzLnBhdGh9YDtcbiAgZWxzZVxuICAgIHJldHVybiBhcGkuYXNzZXRzVXJsKHJlcy5wYWNrYWdlTmFtZSwgcmVzLnBhdGgpO1xuICAgIC8vIHJldHVybiBwdWJsaWNVcmwoJycsIGFwaS5jb25maWcoKS5vdXRwdXRQYXRoTWFwLCBudWxsLCByZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKTtcbn1cbiJdfQ==
