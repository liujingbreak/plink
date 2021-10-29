"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackIndexHtml = exports.proxyToDevServer = void 0;
const http_proxy_middleware_1 = require("http-proxy-middleware");
const lodash_1 = __importDefault(require("lodash"));
// import Url from 'url';
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const log = (0, plink_1.log4File)(__filename);
function isReqWithNextCb(obj) {
    return obj.__goNext != null;
}
function proxyToDevServer(api) {
    var _a;
    // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
    let setting = (0, assets_processer_setting_1.getSetting)().proxyToDevServer;
    if (setting == null)
        return;
    const config = lodash_1.default.cloneDeep(setting);
    config.changeOrigin = true;
    config.ws = true;
    config.logProvider = () => log;
    const plinkSetting = (0, plink_1.config)();
    config.logLevel = plinkSetting.devMode || ((_a = plinkSetting.cliOptions) === null || _a === void 0 ? void 0 : _a.verbose) ? 'debug' : 'info';
    config.onError = (err, req, res) => {
        if (err.code === 'ECONNREFUSED') {
            log.info('Can not connect to %s%s, farward to local static resource', config.target, req.url);
            if (isReqWithNextCb(req))
                return req.__goNext();
            return;
        }
        log.warn(err);
        if (isReqWithNextCb(req))
            req.__goNext(err);
    };
    const proxyHandler = (0, http_proxy_middleware_1.createProxyMiddleware)('/', config);
    api.expressAppUse((app, express) => {
        app.use((req, res, next) => {
            req.__goNext = next;
            proxyHandler(req, res, next);
        });
    });
}
exports.proxyToDevServer = proxyToDevServer;
function fallbackIndexHtml(api) {
    const ruleObj = (0, assets_processer_setting_1.getSetting)().fallbackIndexHtml;
    const rules = [];
    Object.keys(ruleObj).forEach(key => {
        rules.push({
            reg: new RegExp(key),
            tmpl: lodash_1.default.template(ruleObj[key])
        });
    });
    api.use('/', (req, res, next) => {
        if (req.method !== 'GET')
            return next();
        log.debug(req.url);
        rules.some(({ reg, tmpl }) => {
            const orig = req.url;
            const match = reg.exec(req.url);
            if (!match)
                return false;
            // Reference to https://github.com/kapouer/express-urlrewrite/blob/master/index.js#L45
            req.url = req.originalUrl = tmpl({ match });
            log.info('rewrite url %s to %s', orig, req.url);
            // const qpSetting: string | undefined = api.expressApp.get('query parser');
            return true;
        });
        next();
    });
}
exports.fallbackIndexHtml = fallbackIndexHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUVBQThFO0FBRTlFLG9EQUF1QjtBQUN2Qix5QkFBeUI7QUFDekIsc0NBQTZFO0FBQzdFLCtFQUE0RDtBQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFJakMsU0FBUyxlQUFlLENBQUMsR0FBUTtJQUMvQixPQUFPLEdBQUcsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDO0FBQzlCLENBQUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxHQUFxQjs7SUFDcEQsNEVBQTRFO0lBQzVFLElBQUksT0FBTyxHQUF3QixJQUFBLHFDQUFVLEdBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztJQUNqRSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFFVCxNQUFNLE1BQU0sR0FBWSxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QyxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUMzQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUNqQixNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUMvQixNQUFNLFlBQVksR0FBRyxJQUFBLGNBQVcsR0FBRSxDQUFDO0lBQ25DLE1BQU0sQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLE9BQU8sS0FBSSxNQUFBLFlBQVksQ0FBQyxVQUFVLDBDQUFFLE9BQU8sQ0FBQSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM5RixNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNqQyxJQUFLLEdBQTZCLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRTtZQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQztnQkFDdEIsT0FBTyxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDeEIsT0FBTztTQUNSO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUksZUFBZSxDQUFDLEdBQUcsQ0FBQztZQUN0QixHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQztJQUVGLE1BQU0sWUFBWSxHQUFHLElBQUEsNkNBQUssRUFBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUNqQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN4QixHQUFxQixDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7WUFDdkMsWUFBWSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUEvQkQsNENBK0JDO0FBRUQsU0FBZ0IsaUJBQWlCLENBQUMsR0FBcUI7SUFDckQsTUFBTSxPQUFPLEdBQTRCLElBQUEscUNBQVUsR0FBRSxDQUFDLGlCQUFpQixDQUFDO0lBRXhFLE1BQU0sS0FBSyxHQUFtRCxFQUFFLENBQUM7SUFFakUsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDakMsS0FBSyxDQUFDLElBQUksQ0FBQztZQUNULEdBQUcsRUFBRSxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDcEIsSUFBSSxFQUFFLGdCQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBRTtTQUNoQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM5QixJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssS0FBSztZQUN0QixPQUFPLElBQUksRUFBRSxDQUFDO1FBQ2hCLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsRUFBRSxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDckIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLEtBQUs7Z0JBQ1IsT0FBTyxLQUFLLENBQUM7WUFDZixzRkFBc0Y7WUFDdEYsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBQyxDQUFDLENBQUM7WUFDMUMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hELDRFQUE0RTtZQUU1RSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxFQUFFLENBQUM7SUFDVCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE5QkQsOENBOEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQgZXhwcmVzcyBmcm9tICdAd2ZoL2V4cHJlc3MtYXBwL2Rpc3QvZXhwcmVzcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnIGFzIHBsaW5rQ29uZmlnLCBFeHRlbnNpb25Db250ZXh0fSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5pbnRlcmZhY2UgUmVxV2l0aE5leHRDYiBleHRlbmRzIGV4cHJlc3MuUmVxdWVzdCB7XG4gIF9fZ29OZXh0OiBleHByZXNzLk5leHRGdW5jdGlvbjtcbn1cbmZ1bmN0aW9uIGlzUmVxV2l0aE5leHRDYihvYmo6IGFueSk6IG9iaiBpcyBSZXFXaXRoTmV4dENiIHtcbiAgcmV0dXJuIG9iai5fX2dvTmV4dCAhPSBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJveHlUb0RldlNlcnZlcihhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgLy8gY29uc3QgaHBtTG9nID0gbG9nNGpzLmdldExvZ2dlcignYXNzZXRzLXByb2Nlc3MuaW5kZXgtaHRtbC1yb3V0ZS5wcm94eScpO1xuICBsZXQgc2V0dGluZzogT3B0aW9ucyB8IHVuZGVmaW5lZCA9IGdldFNldHRpbmcoKS5wcm94eVRvRGV2U2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBjb25maWc6IE9wdGlvbnMgPSBfLmNsb25lRGVlcChzZXR0aW5nKTtcbiAgY29uZmlnLmNoYW5nZU9yaWdpbiA9IHRydWU7XG4gIGNvbmZpZy53cyA9IHRydWU7XG4gIGNvbmZpZy5sb2dQcm92aWRlciA9ICgpID0+IGxvZztcbiAgY29uc3QgcGxpbmtTZXR0aW5nID0gcGxpbmtDb25maWcoKTtcbiAgY29uZmlnLmxvZ0xldmVsID0gcGxpbmtTZXR0aW5nLmRldk1vZGUgfHwgcGxpbmtTZXR0aW5nLmNsaU9wdGlvbnM/LnZlcmJvc2UgPyAnZGVidWcnIDogJ2luZm8nO1xuICBjb25maWcub25FcnJvciA9IChlcnIsIHJlcSwgcmVzKSA9PiB7XG4gICAgaWYgKChlcnIgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRUNPTk5SRUZVU0VEJykge1xuICAgICAgbG9nLmluZm8oJ0NhbiBub3QgY29ubmVjdCB0byAlcyVzLCBmYXJ3YXJkIHRvIGxvY2FsIHN0YXRpYyByZXNvdXJjZScsIGNvbmZpZy50YXJnZXQsIHJlcS51cmwpO1xuICAgICAgaWYgKGlzUmVxV2l0aE5leHRDYihyZXEpKVxuICAgICAgICByZXR1cm4gcmVxLl9fZ29OZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZy53YXJuKGVycik7XG4gICAgaWYgKGlzUmVxV2l0aE5leHRDYihyZXEpKVxuICAgICAgcmVxLl9fZ29OZXh0KGVycik7XG4gIH07XG5cbiAgY29uc3QgcHJveHlIYW5kbGVyID0gcHJveHkoJy8nLCBjb25maWcpO1xuICBhcGkuZXhwcmVzc0FwcFVzZSgoYXBwLCBleHByZXNzKSA9PiB7XG4gICAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQgPSBuZXh0O1xuICAgICAgcHJveHlIYW5kbGVyKHJlcSwgcmVzLCBuZXh0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWxsYmFja0luZGV4SHRtbChhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgY29uc3QgcnVsZU9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBnZXRTZXR0aW5nKCkuZmFsbGJhY2tJbmRleEh0bWw7XG5cbiAgY29uc3QgcnVsZXM6IEFycmF5PHtyZWc6IFJlZ0V4cDsgdG1wbDogXy5UZW1wbGF0ZUV4ZWN1dG9yfT4gPSBbXTtcblxuICBPYmplY3Qua2V5cyhydWxlT2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICByZWc6IG5ldyBSZWdFeHAoa2V5KSxcbiAgICAgIHRtcGw6IF8udGVtcGxhdGUocnVsZU9ialtrZXldIClcbiAgICB9KTtcbiAgfSk7XG5cbiAgYXBpLnVzZSgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgbG9nLmRlYnVnKHJlcS51cmwpO1xuICAgIHJ1bGVzLnNvbWUoKHtyZWcsIHRtcGx9KSA9PiB7XG4gICAgICBjb25zdCBvcmlnID0gcmVxLnVybDtcbiAgICAgIGNvbnN0IG1hdGNoID0gcmVnLmV4ZWMocmVxLnVybCk7XG4gICAgICBpZiAoIW1hdGNoKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZWZlcmVuY2UgdG8gaHR0cHM6Ly9naXRodWIuY29tL2thcG91ZXIvZXhwcmVzcy11cmxyZXdyaXRlL2Jsb2IvbWFzdGVyL2luZGV4LmpzI0w0NVxuICAgICAgcmVxLnVybCA9IHJlcS5vcmlnaW5hbFVybCA9IHRtcGwoe21hdGNofSk7XG4gICAgICBsb2cuaW5mbygncmV3cml0ZSB1cmwgJXMgdG8gJXMnLCBvcmlnLCByZXEudXJsKTtcbiAgICAgIC8vIGNvbnN0IHFwU2V0dGluZzogc3RyaW5nIHwgdW5kZWZpbmVkID0gYXBpLmV4cHJlc3NBcHAuZ2V0KCdxdWVyeSBwYXJzZXInKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgbmV4dCgpO1xuICB9KTtcbn1cbiJdfQ==