"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackIndexHtml = exports.proxyToDevServer = void 0;
const http_proxy_middleware_1 = __importDefault(require("http-proxy-middleware"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const url_1 = __importDefault(require("url"));
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger(__api_1.default.packageName);
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
function proxyToDevServer() {
    // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
    let setting = assets_processer_setting_1.getSetting().indexHtmlProxy;
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
    const proxyHandler = http_proxy_middleware_1.default(config);
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
            req.query = url_1.default.parse(req.url, true, true).query;
            return true;
        });
        next();
    });
}
exports.fallbackIndexHtml = fallbackIndexHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0ZBQTBDO0FBRTFDLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsOENBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUMsK0VBQTREO0FBSTVELFNBQWdCLGdCQUFnQjtJQUM5Qiw0RUFBNEU7SUFDNUUsSUFBSSxPQUFPLEdBQTZCLHFDQUFVLEVBQUUsQ0FBQyxjQUFjLENBQUM7SUFDcEUsSUFBSSxPQUFPLElBQUksSUFBSTtRQUNqQixPQUFPO0lBQ1QsTUFBTSxNQUFNLEdBQWlCLGdCQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xELE1BQU0sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLHFDQUFxQztJQUNyQyxNQUFNLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztJQUN6QixNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNqQyxJQUFLLEdBQTZCLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRTtZQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLElBQUssR0FBVyxDQUFDLFFBQVE7Z0JBQ3ZCLE9BQVEsR0FBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxPQUFPO1NBQ1I7UUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsSUFBSyxHQUFXLENBQUMsUUFBUTtZQUN0QixHQUFxQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRywrQkFBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25DLGVBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3hCLEdBQXFCLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUN2QyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUEzQkQsNENBMkJDO0FBRUQsU0FBZ0IsaUJBQWlCO0lBQy9CLE1BQU0sT0FBTyxHQUE0QixxQ0FBVSxFQUFFLENBQUMsaUJBQWlCLENBQUM7SUFFeEUsTUFBTSxLQUFLLEdBQW1ELEVBQUUsQ0FBQztJQUVqRSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNqQyxLQUFLLENBQUMsSUFBSSxDQUFDO1lBQ1QsR0FBRyxFQUFFLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQztZQUNwQixJQUFJLEVBQUUsZ0JBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBVyxDQUFDO1NBQ3pDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzlCLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxLQUFLO1lBQ3RCLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFFaEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxFQUFFLEVBQUU7WUFDekIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztZQUNyQixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsS0FBSztnQkFDUixPQUFPLEtBQUssQ0FBQztZQUNmLHNGQUFzRjtZQUN0RixHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEVBQUMsS0FBSyxFQUFDLENBQUMsQ0FBQztZQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakQsR0FBRyxDQUFDLEtBQUssR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNqRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxFQUFFLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE3QkQsOENBNkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHByb3h5IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge05leHRGdW5jdGlvbiwgUmVxdWVzdH0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nJztcbmludGVyZmFjZSBSZXFXaXRoTmV4dENiIGV4dGVuZHMgUmVxdWVzdCB7XG4gIF9fZ29OZXh0OiBOZXh0RnVuY3Rpb247XG59XG5leHBvcnQgZnVuY3Rpb24gcHJveHlUb0RldlNlcnZlcigpIHtcbiAgLy8gY29uc3QgaHBtTG9nID0gbG9nNGpzLmdldExvZ2dlcignYXNzZXRzLXByb2Nlc3MuaW5kZXgtaHRtbC1yb3V0ZS5wcm94eScpO1xuICBsZXQgc2V0dGluZzogcHJveHkuQ29uZmlnIHwgdW5kZWZpbmVkID0gZ2V0U2V0dGluZygpLmluZGV4SHRtbFByb3h5O1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgY29uZmlnOiBwcm94eS5Db25maWcgPSBfLmNsb25lRGVlcChzZXR0aW5nKTtcbiAgY29uZmlnLmNoYW5nZU9yaWdpbiA9IHRydWU7XG4gIGNvbmZpZy53cyA9IHRydWU7XG4gIC8vIGNvbmZpZy5sb2dQcm92aWRlciA9ICgpID0+IGhwbUxvZztcbiAgY29uZmlnLmxvZ0xldmVsID0gJ2luZm8nO1xuICBjb25maWcub25FcnJvciA9IChlcnIsIHJlcSwgcmVzKSA9PiB7XG4gICAgaWYgKChlcnIgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRUNPTk5SRUZVU0VEJykge1xuICAgICAgbG9nLmluZm8oJ0NhbiBub3QgY29ubmVjdCB0byAlcyVzLCBmYXJ3YXJkIHRvIGxvY2FsIHN0YXRpYyByZXNvdXJjZScsIGNvbmZpZy50YXJnZXQsIHJlcS51cmwpO1xuICAgICAgaWYgKChyZXEgYXMgYW55KS5fX2dvTmV4dClcbiAgICAgICAgcmV0dXJuIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nLndhcm4oZXJyKTtcbiAgICBpZiAoKHJlcSBhcyBhbnkpLl9fZ29OZXh0KVxuICAgICAgKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dChlcnIpO1xuICB9O1xuXG4gIGNvbnN0IHByb3h5SGFuZGxlciA9IHByb3h5KGNvbmZpZyk7XG4gIGFwaS51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dCA9IG5leHQ7XG4gICAgcHJveHlIYW5kbGVyKHJlcSwgcmVzLCBuZXh0KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWxsYmFja0luZGV4SHRtbCgpIHtcbiAgY29uc3QgcnVsZU9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBnZXRTZXR0aW5nKCkuZmFsbGJhY2tJbmRleEh0bWw7XG5cbiAgY29uc3QgcnVsZXM6IEFycmF5PHtyZWc6IFJlZ0V4cCwgdG1wbDogXy5UZW1wbGF0ZUV4ZWN1dG9yfT4gPSBbXTtcblxuICBPYmplY3Qua2V5cyhydWxlT2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICByZWc6IG5ldyBSZWdFeHAoa2V5KSxcbiAgICAgIHRtcGw6IF8udGVtcGxhdGUocnVsZU9ialtrZXldIGFzIHN0cmluZylcbiAgICB9KTtcbiAgfSk7XG5cbiAgYXBpLnVzZSgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIHJldHVybiBuZXh0KCk7XG5cbiAgICBydWxlcy5zb21lKCh7cmVnLCB0bXBsfSkgPT4ge1xuICAgICAgY29uc3Qgb3JpZyA9IHJlcS51cmw7XG4gICAgICBjb25zdCBtYXRjaCA9IHJlZy5leGVjKHJlcS51cmwpO1xuICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmVmZXJlbmNlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9rYXBvdWVyL2V4cHJlc3MtdXJscmV3cml0ZS9ibG9iL21hc3Rlci9pbmRleC5qcyNMNDVcbiAgICAgIHJlcS51cmwgPSByZXEub3JpZ2luYWxVcmwgPSB0bXBsKHttYXRjaH0pO1xuICAgICAgbG9nLmRlYnVnKCdyZXdyaXRlIHVybCAlcyB0byAlcycsIG9yaWcsIHJlcS51cmwpO1xuICAgICAgcmVxLnF1ZXJ5ID0gVXJsLnBhcnNlKHJlcS51cmwsIHRydWUsIHRydWUpLnF1ZXJ5O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgbmV4dCgpO1xuICB9KTtcbn1cbiJdfQ==