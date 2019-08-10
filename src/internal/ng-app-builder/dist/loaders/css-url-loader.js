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
        log.info('%s -> %s (%s)', repl.text, resolvedTo, file);
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
            log.debug('loadModule', resolvedTo);
            return loadModule(loaderCtx, resolvedTo)
                .pipe(operators_1.map(url => {
                repl.text = url;
                log.debug('loadModule done', url);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9sb2FkZXJzL2Nzcy11cmwtbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQXNDO0FBQ3RDLDhDQUFnRDtBQUVoRCwwREFBd0I7QUFDeEIsNkVBQWdFO0FBQ2hFLG9FQUFvRTtBQUNwRSxnQ0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHlCQUEwQjtBQUMxQiw4Q0FBOEM7QUFDOUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGlCQUFpQixDQUFDLENBQUM7QUFFN0UsTUFBTSxTQUFTLEdBQXFCLFVBQVMsT0FBZSxFQUFFLEdBQUc7SUFDL0QsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxDQUFDLENBQUM7S0FDM0U7SUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixNQUFNLFlBQVksR0FBcUIsRUFBRSxDQUFDO0lBRTFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxJQUFJLENBQUMsSUFBSTtZQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDRCxLQUFLLENBQUMsQ0FBQztZQUNMLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbkIsUUFBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2YsQ0FBQztRQUNELFFBQVE7WUFDTixNQUFNLFFBQVEsR0FBRyxvQkFBUyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNsRCwrQkFBK0I7WUFDL0IsK0JBQStCO1lBQy9CLFFBQVMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFJRixTQUFTLFVBQVUsQ0FBQyxTQUFrQyxFQUFFLEdBQVcsRUFBRSxJQUFZO0lBQy9FLE9BQU8sSUFBSSxpQkFBVSxDQUFpQixVQUFVLENBQUMsRUFBRTtRQUNqRCxNQUFNLEtBQUssR0FBRyxJQUFJLDhCQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSwrQkFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdEMsS0FBSyxNQUFNLEVBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUMsSUFBSSxPQUFPLEVBQUU7WUFDeEMsVUFBVSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFtQixDQUFDLENBQUM7U0FDdkQ7UUFDRCxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFTLENBQUUsSUFBSSxDQUFDLEVBQUU7UUFDeEIsSUFBSSxVQUFVLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFLLENBQUMsQ0FBQztRQUNwRCxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2RCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDOUIsT0FBTyxVQUFVLENBQUMsU0FBUyxFQUFFLFVBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7aUJBQ2pELElBQUksQ0FBQyxlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ2QsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7Z0JBQ2hCLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNMO2FBQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3BHLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztnQkFDN0IsVUFBVSxHQUFHLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQyxnQ0FBZ0M7WUFDbEUsR0FBRyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDcEMsT0FBTyxVQUFVLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQztpQkFDdkMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDZCxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztnQkFDaEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDbEMsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ0w7YUFBTTtZQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNuRCxJQUFJLENBQUMsSUFBSSxHQUFHLFVBQVUsQ0FBQztZQUN2QixPQUFPLFNBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNqQjtJQUNILENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsU0FBa0MsRUFBRSxHQUFXO0lBQ2pFLE9BQU8sSUFBSSxpQkFBVSxDQUFTLGFBQWEsQ0FBQyxFQUFFO1FBQzVDLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBVSxFQUFFLE1BQVcsRUFBRSxFQUFFO1lBQ3BELElBQUksR0FBRztnQkFDTCxPQUFPLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDbEMsSUFBSSxPQUFPLEdBQUc7Z0JBQ1osNEZBQTRGO2dCQUM1Rix1QkFBdUIsRUFBRSxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFPLENBQUMsVUFBVTtnQkFDdkUsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRSxFQUFFO2lCQUNaO2FBQ0YsQ0FBQztZQUNGLEVBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQWlCLENBQUM7WUFDaEQsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUMzQiwyQ0FBMkM7WUFDM0MsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsR0FBVztJQUNqRCxJQUFJLEdBQUcsR0FBRyxlQUFHLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUTtRQUN6QixPQUFPLEdBQUcsQ0FBQztTQUNSLElBQUksR0FBRyxDQUFDLE9BQU87UUFDbEIsT0FBTyxJQUFJLEdBQUcsQ0FBQyxXQUFXLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDOztRQUV6QyxPQUFPLGVBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDaEQscUZBQXFGO0FBQ3pGLENBQUM7QUFwRUQsaUJBQVMsU0FBUyxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L2xvYWRlcnMvY3NzLXVybC1sb2FkZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY29uY2F0TWFwLCBtYXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB3YiBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHBhdGNoVGV4dCwgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHsgU2Nzc0xleGVyLCBTY3NzUGFyc2VyIH0gZnJvbSAnLi4vdXRpbHMvc2ltcGxlLXNjc3MtcGFyc2VyJztcbi8vIGltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdm0gPSByZXF1aXJlKCd2bScpO1xuLy8gaW1wb3J0IHtsb2FkZXIgYXMgd2JMb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY3NzLXVybC1sb2FkZXInKTtcblxuY29uc3QgdXJsTG9hZGVyOiB3Yi5sb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oY29udGVudDogc3RyaW5nLCBtYXApIHtcbiAgdmFyIGNhbGxiYWNrID0gdGhpcy5hc3luYygpO1xuICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdEb2VzIG5vdCBzdXBwb3J0IFdlYnBhY2sgd2l0aG91dCBhc3luYyBsb2FkZXIgZnVuY3Rpb24nKTtcbiAgfVxuICB2YXIgZmlsZSA9IHRoaXMucmVzb3VyY2VQYXRoO1xuICBjb25zdCBzZWxmID0gdGhpcztcbiAgY29uc3QgcmVwbGFjZW1lbnRzOiBSZXBsYWNlbWVudEluZltdID0gW107XG5cbiAgcmVwbGFjZVVybCh0aGlzLCBjb250ZW50LCBmaWxlKS5zdWJzY3JpYmUoe1xuICAgIG5leHQocmVwbCkge1xuICAgICAgcmVwbGFjZW1lbnRzLnB1c2gocmVwbCk7XG4gICAgICBsb2cuZGVidWcoJ2ZpbmFsIHVybCcsIHJlcGwudGV4dCk7XG4gICAgfSxcbiAgICBlcnJvcihlKSB7XG4gICAgICBzZWxmLmVtaXRFcnJvcihlKTtcbiAgICAgIGxvZy5lcnJvcihmaWxlLCBlKTtcbiAgICAgIGNhbGxiYWNrIShlKTtcbiAgICB9LFxuICAgIGNvbXBsZXRlKCkge1xuICAgICAgY29uc3QgcmVwbGFjZWQgPSBwYXRjaFRleHQoY29udGVudCwgcmVwbGFjZW1lbnRzKTtcbiAgICAgIC8vIGlmIChyZXBsYWNlbWVudHMubGVuZ3RoID4gMClcbiAgICAgIC8vICAgbG9nLmRlYnVnKGZpbGUsIHJlcGxhY2VkKTtcbiAgICAgIGNhbGxiYWNrIShudWxsLCByZXBsYWNlZCwgbWFwKTtcbiAgICB9XG4gIH0pO1xufTtcblxuZXhwb3J0ID0gdXJsTG9hZGVyO1xuXG5mdW5jdGlvbiByZXBsYWNlVXJsKGxvYWRlckN0eDogd2IubG9hZGVyLkxvYWRlckNvbnRleHQsIGNzczogc3RyaW5nLCBmaWxlOiBzdHJpbmcpOiBPYnNlcnZhYmxlPFJlcGxhY2VtZW50SW5mPiB7XG4gIHJldHVybiBuZXcgT2JzZXJ2YWJsZTxSZXBsYWNlbWVudEluZj4oc3Vic2NyaWJlciA9PiB7XG4gICAgY29uc3QgbGV4ZXIgPSBuZXcgU2Nzc0xleGVyKGNzcyk7XG4gICAgY29uc3QgcGFyc2VyID0gbmV3IFNjc3NQYXJzZXIobGV4ZXIpO1xuICAgIGNvbnN0IHJlc1VybHMgPSBwYXJzZXIuZ2V0UmVzVXJsKGNzcyk7XG4gICAgZm9yIChjb25zdCB7c3RhcnQsIGVuZCwgdGV4dH0gb2YgcmVzVXJscykge1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHtzdGFydCwgZW5kLCB0ZXh0fSBhcyBSZXBsYWNlbWVudEluZik7XG4gICAgfVxuICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgfSkucGlwZShjb25jYXRNYXAoIHJlcGwgPT4ge1xuICAgIHZhciByZXNvbHZlZFRvID0gcmVwbGFjZUFzc2V0c1VybChmaWxlLCByZXBsLnRleHQhKTtcbiAgICBsb2cuaW5mbygnJXMgLT4gJXMgKCVzKScsIHJlcGwudGV4dCwgcmVzb2x2ZWRUbywgZmlsZSk7XG4gICAgaWYgKHJlc29sdmVkVG8uc3RhcnRzV2l0aCgnficpKSB7XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlc29sdmVkVG8hLnNsaWNlKDEpKVxuICAgICAgLnBpcGUobWFwKHVybCA9PiB7XG4gICAgICAgIHJlcGwudGV4dCA9IHVybDtcbiAgICAgICAgcmV0dXJuIHJlcGw7XG4gICAgICB9KSk7XG4gICAgfSBlbHNlIGlmICghcmVzb2x2ZWRUby5zdGFydHNXaXRoKCcvJykgJiYgIXJlc29sdmVkVG8uc3RhcnRzV2l0aCgnIycpICYmIHJlc29sdmVkVG8uaW5kZXhPZignOicpIDwgMCkge1xuICAgICAgaWYgKCFyZXNvbHZlZFRvLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgICAgcmVzb2x2ZWRUbyA9ICcuLycgKyByZXNvbHZlZFRvOyAvLyBGaXggQU9UIG1vZGUgaW4gQW5ndWxhciA4LjIueFxuICAgICAgbG9nLmRlYnVnKCdsb2FkTW9kdWxlJywgcmVzb2x2ZWRUbyk7XG4gICAgICByZXR1cm4gbG9hZE1vZHVsZShsb2FkZXJDdHgsIHJlc29sdmVkVG8pXG4gICAgICAucGlwZShtYXAodXJsID0+IHtcbiAgICAgICAgcmVwbC50ZXh0ID0gdXJsO1xuICAgICAgICBsb2cuZGVidWcoJ2xvYWRNb2R1bGUgZG9uZScsIHVybCk7XG4gICAgICAgIHJldHVybiByZXBsO1xuICAgICAgfSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoJ3VybDogJXMgIC0+ICVzJywgcmVwbC50ZXh0LCByZXNvbHZlZFRvKTtcbiAgICAgIHJlcGwudGV4dCA9IHJlc29sdmVkVG87XG4gICAgICByZXR1cm4gb2YocmVwbCk7XG4gICAgfVxuICB9KSk7XG59XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGUobG9hZGVyQ3R4OiB3Yi5sb2FkZXIuTG9hZGVyQ29udGV4dCwgdXJsOiBzdHJpbmcpIHtcbiAgcmV0dXJuIG5ldyBPYnNlcnZhYmxlPHN0cmluZz4obG9hZE1vZHVsZVN1YiA9PiB7XG4gICAgbG9hZGVyQ3R4LmxvYWRNb2R1bGUodXJsLCAoZXJyOiBFcnJvciwgc291cmNlOiBhbnkpID0+IHtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBsb2FkTW9kdWxlU3ViLmVycm9yKGVycik7XG4gICAgICB2YXIgc2FuZGJveCA9IHtcbiAgICAgICAgLy8gU2luY2UgQW5ndWxhciA4LjAsIHBvc3Rjc3MgcGx1Z2luIHdpbGwgbm8gbG9uZ2VyIGFkZCBgZGVwbG95VXJsL3B1YmxpY1BhdGhgIHRvIHVybCBzdHJpbmdcbiAgICAgICAgX193ZWJwYWNrX3B1YmxpY19wYXRoX186IGxvYWRlckN0eC5fY29tcGlsZXIub3B0aW9ucy5vdXRwdXQhLnB1YmxpY1BhdGgsXG4gICAgICAgIG1vZHVsZToge1xuICAgICAgICAgIGV4cG9ydHM6IHt9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgIGNvbnN0IG5ld1VybCA9IHNhbmRib3gubW9kdWxlLmV4cG9ydHMgYXMgc3RyaW5nO1xuICAgICAgbG9hZE1vZHVsZVN1Yi5uZXh0KG5ld1VybCk7XG4gICAgICAvLyBsb2cud2FybigndXJsOiAlcyAgLT4gJXMnLCB1cmwsIG5ld1VybCk7XG4gICAgICBsb2FkTW9kdWxlU3ViLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlQXNzZXRzVXJsKGZpbGU6IHN0cmluZywgdXJsOiBzdHJpbmcpIHtcbiAgdmFyIHJlcyA9IGFwaS5ub3JtYWxpemVBc3NldHNVcmwodXJsLCBmaWxlKTtcbiAgaWYgKHR5cGVvZiByZXMgPT09ICdzdHJpbmcnKVxuICAgIHJldHVybiByZXM7XG4gIGVsc2UgaWYgKHJlcy5pc1RpbGRlKVxuICAgIHJldHVybiBgfiR7cmVzLnBhY2thZ2VOYW1lfS8ke3Jlcy5wYXRofWA7XG4gIGVsc2VcbiAgICByZXR1cm4gYXBpLmFzc2V0c1VybChyZXMucGFja2FnZU5hbWUsIHJlcy5wYXRoKTtcbiAgICAvLyByZXR1cm4gcHVibGljVXJsKCcnLCBhcGkuY29uZmlnKCkub3V0cHV0UGF0aE1hcCwgbnVsbCwgcmVzLnBhY2thZ2VOYW1lLCByZXMucGF0aCk7XG59XG4iXX0=
