"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const http_proxy_middleware_1 = tslib_1.__importDefault(require("http-proxy-middleware"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const url_1 = tslib_1.__importDefault(require("url"));
const log = require('log4js').getLogger(__api_1.default.packageName);
function proxyToDevServer() {
    const config = __api_1.default.config.get(__api_1.default.packageName).indexHtmlProxy;
    if (config == null)
        return;
    config.changeOrigin = true;
    config.ws = true;
    config.onError = (err, req, res) => {
        if (err.code === 'ECONNREFUSED') {
            log.warn('Can not connect to %s%s, farward to local static resource', config.target, req.url);
            if (req.__goNext)
                return req.__goNext();
            return;
        }
        log.warn(err);
        if (req.__goNext)
            req.__goNext(err);
    };
    const proxyHandler = http_proxy_middleware_1.default(config);
    __api_1.default.use((req, res, next) => {
        req.__goNext = next;
        proxyHandler(req, res, next);
    });
}
exports.proxyToDevServer = proxyToDevServer;
function fallbackIndexHtml() {
    const ruleObj = __api_1.default.config.get(__api_1.default.packageName).fallbackIndexHtml;
    const rules = [];
    Object.keys(ruleObj).forEach(key => {
        rules.push({
            reg: new RegExp(key),
            tmpl: lodash_1.default.template(ruleObj[key])
        });
    });
    __api_1.default.use('/', (req, res, next) => {
        if (req.method !== 'GET')
            return next();
        rules.some(({ reg, tmpl }) => {
            const orig = req.url;
            const match = reg.exec(req.url);
            if (!match)
                return false;
            // Reference to https://github.com/kapouer/express-urlrewrite/blob/master/index.js#L45
            req.url = req.originalUrl = tmpl({ match });
            log.debug('rewrite url %s to %s', orig, req.url);
            req.query = url_1.default.parse(req.url, true, true).query;
            return true;
        });
        next();
    });
}
exports.fallbackIndexHtml = fallbackIndexHtml;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2luZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsMEZBQTBDO0FBRTFDLDBEQUF3QjtBQUN4Qiw0REFBdUI7QUFDdkIsc0RBQXNCO0FBQ3RCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBS3pELFNBQWdCLGdCQUFnQjtJQUM5QixNQUFNLE1BQU0sR0FBNkIsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGNBQWMsQ0FBQztJQUN4RixJQUFJLE1BQU0sSUFBSSxJQUFJO1FBQ2hCLE9BQU87SUFDVCxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUMzQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUVqQixNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNqQyxJQUFLLEdBQTZCLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRTtZQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLElBQUssR0FBcUIsQ0FBQyxRQUFRO2dCQUNqQyxPQUFRLEdBQXFCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTztTQUNSO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUssR0FBcUIsQ0FBQyxRQUFRO1lBQ2hDLEdBQXFCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztJQUVGLE1BQU0sWUFBWSxHQUFHLCtCQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkMsZUFBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDeEIsR0FBcUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhCRCw0Q0F3QkM7QUFFRCxTQUFnQixpQkFBaUI7SUFDL0IsTUFBTSxPQUFPLEdBQTRCLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztJQUUzRixNQUFNLEtBQUssR0FBbUQsRUFBRSxDQUFDO0lBRWpFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVCxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3BCLElBQUksRUFBRSxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFXLENBQUM7U0FDekMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUVoQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDO1lBQ2Ysc0ZBQXNGO1lBQ3RGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqRCxHQUFHLENBQUMsS0FBSyxHQUFHLGFBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ2pELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLEVBQUUsQ0FBQztJQUNULENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTdCRCw4Q0E2QkMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9pbmRleC1odG1sLXJvdXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHByb3h5IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge05leHRGdW5jdGlvbiwgUmVxdWVzdH0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuaW50ZXJmYWNlIFJlcVdpdGhOZXh0Q2IgZXh0ZW5kcyBSZXF1ZXN0IHtcbiAgX19nb05leHQ6IE5leHRGdW5jdGlvbjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm94eVRvRGV2U2VydmVyKCkge1xuICBjb25zdCBjb25maWc6IHByb3h5LkNvbmZpZyB8IHVuZGVmaW5lZCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkuaW5kZXhIdG1sUHJveHk7XG4gIGlmIChjb25maWcgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGNvbmZpZy5jaGFuZ2VPcmlnaW4gPSB0cnVlO1xuICBjb25maWcud3MgPSB0cnVlO1xuXG4gIGNvbmZpZy5vbkVycm9yID0gKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICBpZiAoKGVyciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnKSB7XG4gICAgICBsb2cud2FybignQ2FuIG5vdCBjb25uZWN0IHRvICVzJXMsIGZhcndhcmQgdG8gbG9jYWwgc3RhdGljIHJlc291cmNlJywgY29uZmlnLnRhcmdldCwgcmVxLnVybCk7XG4gICAgICBpZiAoKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dClcbiAgICAgICAgcmV0dXJuIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nLndhcm4oZXJyKTtcbiAgICBpZiAoKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dClcbiAgICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQoZXJyKTtcbiAgfTtcblxuICBjb25zdCBwcm94eUhhbmRsZXIgPSBwcm94eShjb25maWcpO1xuICBhcGkudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQgPSBuZXh0O1xuICAgIHByb3h5SGFuZGxlcihyZXEsIHJlcywgbmV4dCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmFsbGJhY2tJbmRleEh0bWwoKSB7XG4gIGNvbnN0IHJ1bGVPYmo6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKS5mYWxsYmFja0luZGV4SHRtbDtcblxuICBjb25zdCBydWxlczogQXJyYXk8e3JlZzogUmVnRXhwLCB0bXBsOiBfLlRlbXBsYXRlRXhlY3V0b3J9PiA9IFtdO1xuXG4gIE9iamVjdC5rZXlzKHJ1bGVPYmopLmZvckVhY2goa2V5ID0+IHtcbiAgICBydWxlcy5wdXNoKHtcbiAgICAgIHJlZzogbmV3IFJlZ0V4cChrZXkpLFxuICAgICAgdG1wbDogXy50ZW1wbGF0ZShydWxlT2JqW2tleV0gYXMgc3RyaW5nKVxuICAgIH0pO1xuICB9KTtcblxuICBhcGkudXNlKCcvJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKVxuICAgICAgcmV0dXJuIG5leHQoKTtcblxuICAgIHJ1bGVzLnNvbWUoKHtyZWcsIHRtcGx9KSA9PiB7XG4gICAgICBjb25zdCBvcmlnID0gcmVxLnVybDtcbiAgICAgIGNvbnN0IG1hdGNoID0gcmVnLmV4ZWMocmVxLnVybCk7XG4gICAgICBpZiAoIW1hdGNoKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZWZlcmVuY2UgdG8gaHR0cHM6Ly9naXRodWIuY29tL2thcG91ZXIvZXhwcmVzcy11cmxyZXdyaXRlL2Jsb2IvbWFzdGVyL2luZGV4LmpzI0w0NVxuICAgICAgcmVxLnVybCA9IHJlcS5vcmlnaW5hbFVybCA9IHRtcGwoe21hdGNofSk7XG4gICAgICBsb2cuZGVidWcoJ3Jld3JpdGUgdXJsICVzIHRvICVzJywgb3JpZywgcmVxLnVybCk7XG4gICAgICByZXEucXVlcnkgPSBVcmwucGFyc2UocmVxLnVybCwgdHJ1ZSwgdHJ1ZSkucXVlcnk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBuZXh0KCk7XG4gIH0pO1xufVxuIl19
