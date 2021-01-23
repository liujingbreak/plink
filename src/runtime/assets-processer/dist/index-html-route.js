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
function proxyToDevServer() {
    // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
    const config = __api_1.default.config.get(__api_1.default.packageName).indexHtmlProxy;
    if (config == null)
        return;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0ZBQTBDO0FBRTFDLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsOENBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFLOUMsU0FBZ0IsZ0JBQWdCO0lBQzlCLDRFQUE0RTtJQUM1RSxNQUFNLE1BQU0sR0FBNkIsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGNBQWMsQ0FBQztJQUN4RixJQUFJLE1BQU0sSUFBSSxJQUFJO1FBQ2hCLE9BQU87SUFDVCxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUMzQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUNqQixxQ0FBcUM7SUFDckMsTUFBTSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7SUFDekIsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakMsSUFBSyxHQUE2QixDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7WUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQywyREFBMkQsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RixJQUFLLEdBQVcsQ0FBQyxRQUFRO2dCQUN2QixPQUFRLEdBQXFCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTztTQUNSO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUssR0FBVyxDQUFDLFFBQVE7WUFDdEIsR0FBcUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQUcsK0JBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNuQyxlQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN4QixHQUFxQixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDdkMsWUFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBMUJELDRDQTBCQztBQUVELFNBQWdCLGlCQUFpQjtJQUMvQixNQUFNLE9BQU8sR0FBNEIsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO0lBRTNGLE1BQU0sS0FBSyxHQUFtRCxFQUFFLENBQUM7SUFFakUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNULEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDcEIsSUFBSSxFQUFFLGdCQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQVcsQ0FBQztTQUN6QyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM5QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSztZQUN0QixPQUFPLElBQUksRUFBRSxDQUFDO1FBRWhCLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsRUFBRSxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDckIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLEtBQUs7Z0JBQ1IsT0FBTyxLQUFLLENBQUM7WUFDZixzRkFBc0Y7WUFDdEYsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7WUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2pELEdBQUcsQ0FBQyxLQUFLLEdBQUcsYUFBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDakQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBN0JELDhDQTZCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwcm94eSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtOZXh0RnVuY3Rpb24sIFJlcXVlc3R9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5pbnRlcmZhY2UgUmVxV2l0aE5leHRDYiBleHRlbmRzIFJlcXVlc3Qge1xuICBfX2dvTmV4dDogTmV4dEZ1bmN0aW9uO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHByb3h5VG9EZXZTZXJ2ZXIoKSB7XG4gIC8vIGNvbnN0IGhwbUxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2Fzc2V0cy1wcm9jZXNzLmluZGV4LWh0bWwtcm91dGUucHJveHknKTtcbiAgY29uc3QgY29uZmlnOiBwcm94eS5Db25maWcgfCB1bmRlZmluZWQgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpLmluZGV4SHRtbFByb3h5O1xuICBpZiAoY29uZmlnID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25maWcuY2hhbmdlT3JpZ2luID0gdHJ1ZTtcbiAgY29uZmlnLndzID0gdHJ1ZTtcbiAgLy8gY29uZmlnLmxvZ1Byb3ZpZGVyID0gKCkgPT4gaHBtTG9nO1xuICBjb25maWcubG9nTGV2ZWwgPSAnaW5mbyc7XG4gIGNvbmZpZy5vbkVycm9yID0gKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICBpZiAoKGVyciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnKSB7XG4gICAgICBsb2cuaW5mbygnQ2FuIG5vdCBjb25uZWN0IHRvICVzJXMsIGZhcndhcmQgdG8gbG9jYWwgc3RhdGljIHJlc291cmNlJywgY29uZmlnLnRhcmdldCwgcmVxLnVybCk7XG4gICAgICBpZiAoKHJlcSBhcyBhbnkpLl9fZ29OZXh0KVxuICAgICAgICByZXR1cm4gKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2cud2FybihlcnIpO1xuICAgIGlmICgocmVxIGFzIGFueSkuX19nb05leHQpXG4gICAgICAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0KGVycik7XG4gIH07XG5cbiAgY29uc3QgcHJveHlIYW5kbGVyID0gcHJveHkoY29uZmlnKTtcbiAgYXBpLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0ID0gbmV4dDtcbiAgICBwcm94eUhhbmRsZXIocmVxLCByZXMsIG5leHQpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrSW5kZXhIdG1sKCkge1xuICBjb25zdCBydWxlT2JqOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkuZmFsbGJhY2tJbmRleEh0bWw7XG5cbiAgY29uc3QgcnVsZXM6IEFycmF5PHtyZWc6IFJlZ0V4cCwgdG1wbDogXy5UZW1wbGF0ZUV4ZWN1dG9yfT4gPSBbXTtcblxuICBPYmplY3Qua2V5cyhydWxlT2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICByZWc6IG5ldyBSZWdFeHAoa2V5KSxcbiAgICAgIHRtcGw6IF8udGVtcGxhdGUocnVsZU9ialtrZXldIGFzIHN0cmluZylcbiAgICB9KTtcbiAgfSk7XG5cbiAgYXBpLnVzZSgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIHJldHVybiBuZXh0KCk7XG5cbiAgICBydWxlcy5zb21lKCh7cmVnLCB0bXBsfSkgPT4ge1xuICAgICAgY29uc3Qgb3JpZyA9IHJlcS51cmw7XG4gICAgICBjb25zdCBtYXRjaCA9IHJlZy5leGVjKHJlcS51cmwpO1xuICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmVmZXJlbmNlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9rYXBvdWVyL2V4cHJlc3MtdXJscmV3cml0ZS9ibG9iL21hc3Rlci9pbmRleC5qcyNMNDVcbiAgICAgIHJlcS51cmwgPSByZXEub3JpZ2luYWxVcmwgPSB0bXBsKHttYXRjaH0pO1xuICAgICAgbG9nLmRlYnVnKCdyZXdyaXRlIHVybCAlcyB0byAlcycsIG9yaWcsIHJlcS51cmwpO1xuICAgICAgcmVxLnF1ZXJ5ID0gVXJsLnBhcnNlKHJlcS51cmwsIHRydWUsIHRydWUpLnF1ZXJ5O1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgbmV4dCgpO1xuICB9KTtcbn1cbiJdfQ==