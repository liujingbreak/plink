"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackIndexHtml = exports.proxyToDevServer = void 0;
const http_proxy_middleware_1 = require("http-proxy-middleware");
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
// import Url from 'url';
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger(__api_1.default.packageName);
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
function proxyToDevServer() {
    // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
    let setting = assets_processer_setting_1.getSetting().proxyToDevServer;
    if (setting == null)
        return;
    const config = lodash_1.default.cloneDeep(setting);
    config.changeOrigin = true;
    config.ws = true;
    // config.logProvider = () => hpmLog;
    config.logLevel = 'info';
    config.onError = (err, req, res) => {
        if (err.code === 'ECONNREFUSED') {
            log.info('Can not connect to %s%s, farward to local static resource', config.target, req.url);
            if (req.__goNext)
                return req.__goNext();
            return;
        }
        log.warn(err);
        if (req.__goNext)
            req.__goNext(err);
    };
    const proxyHandler = http_proxy_middleware_1.createProxyMiddleware(config);
    __api_1.default.use((req, res, next) => {
        req.__goNext = next;
        proxyHandler(req, res, next);
    });
}
exports.proxyToDevServer = proxyToDevServer;
function fallbackIndexHtml() {
    const ruleObj = assets_processer_setting_1.getSetting().fallbackIndexHtml;
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
            // const qpSetting: string | undefined = api.expressApp.get('query parser');
            return true;
        });
        next();
    });
}
exports.fallbackIndexHtml = fallbackIndexHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUVBQThFO0FBRTlFLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIseUJBQXlCO0FBQ3pCLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUMsK0VBQTREO0FBSTVELFNBQWdCLGdCQUFnQjtJQUM5Qiw0RUFBNEU7SUFDNUUsSUFBSSxPQUFPLEdBQXdCLHFDQUFVLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztJQUNqRSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFDVCxNQUFNLE1BQU0sR0FBWSxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QyxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUMzQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUNqQixxQ0FBcUM7SUFDckMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7SUFDekIsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakMsSUFBSyxHQUE2QixDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7WUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQywyREFBMkQsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RixJQUFLLEdBQVcsQ0FBQyxRQUFRO2dCQUN2QixPQUFRLEdBQXFCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTztTQUNSO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUssR0FBVyxDQUFDLFFBQVE7WUFDdEIsR0FBcUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQUcsNkNBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuQyxlQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN4QixHQUFxQixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDdkMsWUFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBM0JELDRDQTJCQztBQUVELFNBQWdCLGlCQUFpQjtJQUMvQixNQUFNLE9BQU8sR0FBNEIscUNBQVUsRUFBRSxDQUFDLGlCQUFpQixDQUFDO0lBRXhFLE1BQU0sS0FBSyxHQUFtRCxFQUFFLENBQUM7SUFFakUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNULEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDcEIsSUFBSSxFQUFFLGdCQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQVcsQ0FBQztTQUN6QyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM5QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSztZQUN0QixPQUFPLElBQUksRUFBRSxDQUFDO1FBRWhCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsRUFBRSxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDckIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLEtBQUs7Z0JBQ1IsT0FBTyxLQUFLLENBQUM7WUFDZixzRkFBc0Y7WUFDdEYsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7WUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELDRFQUE0RTtZQUU1RSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxFQUFFLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE5QkQsOENBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge05leHRGdW5jdGlvbiwgUmVxdWVzdH0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nJztcbmludGVyZmFjZSBSZXFXaXRoTmV4dENiIGV4dGVuZHMgUmVxdWVzdCB7XG4gIF9fZ29OZXh0OiBOZXh0RnVuY3Rpb247XG59XG5leHBvcnQgZnVuY3Rpb24gcHJveHlUb0RldlNlcnZlcigpIHtcbiAgLy8gY29uc3QgaHBtTG9nID0gbG9nNGpzLmdldExvZ2dlcignYXNzZXRzLXByb2Nlc3MuaW5kZXgtaHRtbC1yb3V0ZS5wcm94eScpO1xuICBsZXQgc2V0dGluZzogT3B0aW9ucyB8IHVuZGVmaW5lZCA9IGdldFNldHRpbmcoKS5wcm94eVRvRGV2U2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgY29uZmlnOiBPcHRpb25zID0gXy5jbG9uZURlZXAoc2V0dGluZyk7XG4gIGNvbmZpZy5jaGFuZ2VPcmlnaW4gPSB0cnVlO1xuICBjb25maWcud3MgPSB0cnVlO1xuICAvLyBjb25maWcubG9nUHJvdmlkZXIgPSAoKSA9PiBocG1Mb2c7XG4gIGNvbmZpZy5sb2dMZXZlbCA9ICdpbmZvJztcbiAgY29uZmlnLm9uRXJyb3IgPSAoZXJyLCByZXEsIHJlcykgPT4ge1xuICAgIGlmICgoZXJyIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VDT05OUkVGVVNFRCcpIHtcbiAgICAgIGxvZy5pbmZvKCdDYW4gbm90IGNvbm5lY3QgdG8gJXMlcywgZmFyd2FyZCB0byBsb2NhbCBzdGF0aWMgcmVzb3VyY2UnLCBjb25maWcudGFyZ2V0LCByZXEudXJsKTtcbiAgICAgIGlmICgocmVxIGFzIGFueSkuX19nb05leHQpXG4gICAgICAgIHJldHVybiAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZy53YXJuKGVycik7XG4gICAgaWYgKChyZXEgYXMgYW55KS5fX2dvTmV4dClcbiAgICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQoZXJyKTtcbiAgfTtcblxuICBjb25zdCBwcm94eUhhbmRsZXIgPSBwcm94eShjb25maWcpO1xuICBhcGkudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQgPSBuZXh0O1xuICAgIHByb3h5SGFuZGxlcihyZXEsIHJlcywgbmV4dCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmFsbGJhY2tJbmRleEh0bWwoKSB7XG4gIGNvbnN0IHJ1bGVPYmo6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0gZ2V0U2V0dGluZygpLmZhbGxiYWNrSW5kZXhIdG1sO1xuXG4gIGNvbnN0IHJ1bGVzOiBBcnJheTx7cmVnOiBSZWdFeHAsIHRtcGw6IF8uVGVtcGxhdGVFeGVjdXRvcn0+ID0gW107XG5cbiAgT2JqZWN0LmtleXMocnVsZU9iaikuZm9yRWFjaChrZXkgPT4ge1xuICAgIHJ1bGVzLnB1c2goe1xuICAgICAgcmVnOiBuZXcgUmVnRXhwKGtleSksXG4gICAgICB0bXBsOiBfLnRlbXBsYXRlKHJ1bGVPYmpba2V5XSBhcyBzdHJpbmcpXG4gICAgfSk7XG4gIH0pO1xuXG4gIGFwaS51c2UoJy8nLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICByZXR1cm4gbmV4dCgpO1xuXG4gICAgcnVsZXMuc29tZSgoe3JlZywgdG1wbH0pID0+IHtcbiAgICAgIGNvbnN0IG9yaWcgPSByZXEudXJsO1xuICAgICAgY29uc3QgbWF0Y2ggPSByZWcuZXhlYyhyZXEudXJsKTtcbiAgICAgIGlmICghbWF0Y2gpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJlZmVyZW5jZSB0byBodHRwczovL2dpdGh1Yi5jb20va2Fwb3Vlci9leHByZXNzLXVybHJld3JpdGUvYmxvYi9tYXN0ZXIvaW5kZXguanMjTDQ1XG4gICAgICByZXEudXJsID0gcmVxLm9yaWdpbmFsVXJsID0gdG1wbCh7bWF0Y2h9KTtcbiAgICAgIGxvZy5kZWJ1ZygncmV3cml0ZSB1cmwgJXMgdG8gJXMnLCBvcmlnLCByZXEudXJsKTtcbiAgICAgIC8vIGNvbnN0IHFwU2V0dGluZzogc3RyaW5nIHwgdW5kZWZpbmVkID0gYXBpLmV4cHJlc3NBcHAuZ2V0KCdxdWVyeSBwYXJzZXInKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgbmV4dCgpO1xuICB9KTtcbn1cbiJdfQ==