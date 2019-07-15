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
        else if (!resolvedTo.startsWith('/') && !resolvedTo.startsWith('#') && resolvedTo.indexOf(':') < 0) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMERBQXdCO0FBRXhCLG9FQUE4RDtBQUM5RCxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw2RUFBOEQ7QUFDOUQsK0JBQW9DO0FBQ3BDLDhDQUE4QztBQUM5QyxvRUFBa0U7QUFDbEUsOENBQThDO0FBQzlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTdFLE1BQU0sU0FBUyxHQUFxQixVQUFTLE9BQWUsRUFBRSxHQUFHO0lBQy9ELElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM1QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO0lBRTFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSTtZQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUIsQ0FBQztRQUNELEtBQUssQ0FBQyxDQUFDO1lBQ0wsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2IsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2QsQ0FBQztRQUNELFFBQVE7WUFDTixNQUFNLFFBQVEsR0FBRyxvQkFBUyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNsRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdB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QUMsQ0FBQyxDQUFDO1lBQ3RELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBaUIsQ0FBQztZQUNoRCxhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzNCLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3pDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLEdBQVc7SUFDakQsSUFBSSxHQUFHLEdBQUcsZUFBRyxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDekIsT0FBTyxHQUFHLENBQUM7U0FDUixJQUFJLEdBQUcsQ0FBQyxPQUFPO1FBQ2xCLE9BQU8sSUFBSSxHQUFHLENBQUMsV0FBVyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQzs7UUFFekMsT0FBTyxzQkFBUyxDQUFDLEVBQUUsRUFBRSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0RixDQUFDO0FBM0RELGlCQUFTLFNBQVMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyB3YiBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7cHVibGljVXJsfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYXNzZXRzLXVybCc7XG4vLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHZtID0gcmVxdWlyZSgndm0nKTtcbmltcG9ydCBwYXRjaFRleHQsIHtSZXBsYWNlbWVudEluZn0gZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge09ic2VydmFibGUsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7Y29uY2F0TWFwLCBtYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7U2Nzc1BhcnNlciwgU2Nzc0xleGVyfSBmcm9tICcuLi91dGlscy9zaW1wbGUtc2Nzcy1wYXJzZXInO1xuLy8gaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcvY3NzLXVybC1sb2FkZXInKTtcblxuY29uc3QgdXJsTG9hZGVyOiB3Yi5sb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oY29udGVudDogc3RyaW5nLCBtYXApIHtcbiAgdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuICB2YXIgZmlsZSA9IHRoaXMucmVzb3VyY2VQYXRoO1xuICBjb25zdCBzZWxmID0gdGhpcztcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cbiAgcmVwbGFjZVVybCh0aGlzLCBjb250ZW50LCBmaWxlKS5zdWJzY3JpYmUoe1xuICAgIG5leHQocmVwbCkge1xuICAgICAgcmVwbGFjZW1lbnRzLnB1c2gocmVwbCk7XG4gICAgfSxcbiAgICBlcnJvcihlKSB7XG4gICAgICBzZWxmLmVtaXRFcnJvcihlKTtcbiAgICAgIGxvZy5lcnJvcihlKTtcbiAgICAgIGNhbGxiYWNrKGUpO1xuICAgIH0sXG4gICAgY29tcGxldGUoKSB7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IHBhdGNoVGV4dChjb250ZW50LCByZXBsYWNlbWVudHMpO1xuICAgICAgaWYgKHJlcGxhY2VtZW50cy5sZW5ndGggPiAwKVxuICAgICAgICBsb2cuZGVidWcoZmlsZSwgcmVwbGFjZWQpO1xuICAgICAgY2FsbGJhY2sobnVsbCwgcmVwbGFjZWQsIG1hcCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCA9IHVybExvYWRlcjtcblxuZnVuY3Rpb24gcmVwbGFjZVVybChsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCBjc3M6IHN0cmluZywgZmlsZTogc3RyaW5nKTogT2JzZXJ2YWJsZTxSZXBsYWNlbWVudEluZj4ge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8UmVwbGFjZW1lbnRJbmY+KHN1YnNjcmliZXIgPT4ge1xuICAgIGNvbnN0IGxleGVyID0gbmV3IFNjc3NMZXhlcihjc3MpO1xuICAgIGNvbnN0IHBhcnNlciA9IG5ldyBTY3NzUGFyc2VyKGxleGVyKTtcbiAgICBjb25zdCByZXNVcmxzID0gcGFyc2VyLmdldFJlc1VybChjc3MpO1xuICAgIGZvciAoY29uc3Qge3N0YXJ0LCBlbmQsIHRleHR9IG9mIHJlc1VybHMpIHtcbiAgICAgIHN1YnNjcmliZXIubmV4dCh7c3RhcnQsIGVuZCwgdGV4dH0gYXMgUmVwbGFjZW1lbnRJbmYpO1xuICAgIH1cbiAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gIH0pLnBpcGUoY29uY2F0TWFwKCByZXBsID0+IHtcbiAgICB2YXIgcmVzb2x2ZWRUbyA9IHJlcGxhY2VBc3NldHNVcmwoZmlsZSwgcmVwbC50ZXh0KTtcbiAgICBpZiAocmVzb2x2ZWRUby5zdGFydHNXaXRoKCd+JykpIHtcbiAgICAgIHJldHVybiBsb2FkTW9kdWxlKGxvYWRlckN0eCwgcmVwbC50ZXh0LnNsaWNlKDEpKS5waXBlKG1hcCh1cmwgPT4ge1xuICAgICAgICByZXBsLnRleHQgPSB1cmw7XG4gICAgICAgIHJldHVybiByZXBsO1xuICAgICAgfSkpO1xuICAgIH0gZWxzZSBpZiAoIXJlc29sdmVkVG8uc3RhcnRzV2l0aCgnLycpICYmICFyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJyMnKSAmJiByZXNvbHZlZFRvLmluZGV4T2YoJzonKSA8IDApIHtcbiAgICAgIHJldHVybiBsb2FkTW9kdWxlKGxvYWRlckN0eCwgcmVwbC50ZXh0KS5waXBlKG1hcCh1cmwgPT4ge1xuICAgICAgICByZXBsLnRleHQgPSB1cmw7XG4gICAgICAgIHJldHVybiByZXBsO1xuICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ3VybDogJXMgIC0+ICVzJywgcmVwbC50ZXh0LCByZXNvbHZlZFRvKTtcbiAgICAgIHJldHVybiBvZihyZXBsKTtcbiAgICB9XG4gIH0pKTtcbn1cblxuZnVuY3Rpb24gbG9hZE1vZHVsZShsb2FkZXJDdHg6IHdiLmxvYWRlci5Mb2FkZXJDb250ZXh0LCB1cmw6IHN0cmluZykge1xuICByZXR1cm4gbmV3IE9ic2VydmFibGU8c3RyaW5nPihsb2FkTW9kdWxlU3ViID0+IHtcbiAgICBsb2FkZXJDdHgubG9hZE1vZHVsZSh1cmwsIChlcnI6IEVycm9yLCBzb3VyY2U6IGFueSkgPT4ge1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIGxvYWRNb2R1bGVTdWIuZXJyb3IoZXJyKTtcbiAgICAgIHZhciBzYW5kYm94ID0ge1xuICAgICAgICAvLyBMYXRlciBvbiwgQW5ndWxhcidzIHBvc3Rjc3MgcGx1Z2luIHdpbGwgcHJlZml4IGBkZXBsb3lVcmwvcHVibGljUGF0aGAgdG8gdXJsIHN0cmluZ1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXzogJy8nLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiB7fVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBjb25zdCBuZXdVcmwgPSBzYW5kYm94Lm1vZHVsZS5leHBvcnRzIGFzIHN0cmluZztcbiAgICAgIGxvYWRNb2R1bGVTdWIubmV4dChuZXdVcmwpO1xuICAgICAgbG9nLmRlYnVnKCd1cmw6ICVzICAtPiAlcycsIHVybCwgbmV3VXJsKTtcbiAgICAgIGxvYWRNb2R1bGVTdWIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VBc3NldHNVcmwoZmlsZTogc3RyaW5nLCB1cmw6IHN0cmluZykge1xuICB2YXIgcmVzID0gYXBpLm5vcm1hbGl6ZUFzc2V0c1VybCh1cmwsIGZpbGUpO1xuICBpZiAodHlwZW9mIHJlcyA9PT0gJ3N0cmluZycpXG4gICAgcmV0dXJuIHJlcztcbiAgZWxzZSBpZiAocmVzLmlzVGlsZGUpXG4gICAgcmV0dXJuIGB+JHtyZXMucGFja2FnZU5hbWV9LyR7cmVzLnBhdGh9YDtcbiAgZWxzZVxuICAgIHJldHVybiBwdWJsaWNVcmwoJycsIGFwaS5jb25maWcoKS5vdXRwdXRQYXRoTWFwLCBudWxsLCByZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKTtcbn1cbiJdfQ==
