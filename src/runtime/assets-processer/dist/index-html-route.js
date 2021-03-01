"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackIndexHtml = exports.proxyToDevServer = void 0;
const http_proxy_middleware_1 = __importDefault(require("http-proxy-middleware"));
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
            // const qpSetting: string | undefined = api.expressApp.get('query parser');
            return true;
        });
        next();
    });
}
exports.fallbackIndexHtml = fallbackIndexHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsa0ZBQTBDO0FBRTFDLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIseUJBQXlCO0FBQ3pCLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDOUMsK0VBQTREO0FBSTVELFNBQWdCLGdCQUFnQjtJQUM5Qiw0RUFBNEU7SUFDNUUsSUFBSSxPQUFPLEdBQTZCLHFDQUFVLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztJQUN0RSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFDVCxNQUFNLE1BQU0sR0FBaUIsZ0JBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsTUFBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7SUFDM0IsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDakIscUNBQXFDO0lBQ3JDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDO0lBQ3pCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1FBQ2pDLElBQUssR0FBNkIsQ0FBQyxJQUFJLEtBQUssY0FBYyxFQUFFO1lBQzFELEdBQUcsQ0FBQyxJQUFJLENBQUMsMkRBQTJELEVBQUUsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUYsSUFBSyxHQUFXLENBQUMsUUFBUTtnQkFDdkIsT0FBUSxHQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU87U0FDUjtRQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFLLEdBQVcsQ0FBQyxRQUFRO1lBQ3RCLEdBQXFCLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQztJQUVGLE1BQU0sWUFBWSxHQUFHLCtCQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkMsZUFBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDeEIsR0FBcUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTNCRCw0Q0EyQkM7QUFFRCxTQUFnQixpQkFBaUI7SUFDL0IsTUFBTSxPQUFPLEdBQTRCLHFDQUFVLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUV4RSxNQUFNLEtBQUssR0FBbUQsRUFBRSxDQUFDO0lBRWpFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVCxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3BCLElBQUksRUFBRSxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFXLENBQUM7U0FDekMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUVoQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDO1lBQ2Ysc0ZBQXNGO1lBQ3RGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqRCw0RUFBNEU7WUFFNUUsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUJELDhDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBwcm94eSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtOZXh0RnVuY3Rpb24sIFJlcXVlc3R9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2Fzc2V0cy1wcm9jZXNzZXItc2V0dGluZyc7XG5pbnRlcmZhY2UgUmVxV2l0aE5leHRDYiBleHRlbmRzIFJlcXVlc3Qge1xuICBfX2dvTmV4dDogTmV4dEZ1bmN0aW9uO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHByb3h5VG9EZXZTZXJ2ZXIoKSB7XG4gIC8vIGNvbnN0IGhwbUxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2Fzc2V0cy1wcm9jZXNzLmluZGV4LWh0bWwtcm91dGUucHJveHknKTtcbiAgbGV0IHNldHRpbmc6IHByb3h5LkNvbmZpZyB8IHVuZGVmaW5lZCA9IGdldFNldHRpbmcoKS5wcm94eVRvRGV2U2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgY29uZmlnOiBwcm94eS5Db25maWcgPSBfLmNsb25lRGVlcChzZXR0aW5nKTtcbiAgY29uZmlnLmNoYW5nZU9yaWdpbiA9IHRydWU7XG4gIGNvbmZpZy53cyA9IHRydWU7XG4gIC8vIGNvbmZpZy5sb2dQcm92aWRlciA9ICgpID0+IGhwbUxvZztcbiAgY29uZmlnLmxvZ0xldmVsID0gJ2luZm8nO1xuICBjb25maWcub25FcnJvciA9IChlcnIsIHJlcSwgcmVzKSA9PiB7XG4gICAgaWYgKChlcnIgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRUNPTk5SRUZVU0VEJykge1xuICAgICAgbG9nLmluZm8oJ0NhbiBub3QgY29ubmVjdCB0byAlcyVzLCBmYXJ3YXJkIHRvIGxvY2FsIHN0YXRpYyByZXNvdXJjZScsIGNvbmZpZy50YXJnZXQsIHJlcS51cmwpO1xuICAgICAgaWYgKChyZXEgYXMgYW55KS5fX2dvTmV4dClcbiAgICAgICAgcmV0dXJuIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nLndhcm4oZXJyKTtcbiAgICBpZiAoKHJlcSBhcyBhbnkpLl9fZ29OZXh0KVxuICAgICAgKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dChlcnIpO1xuICB9O1xuXG4gIGNvbnN0IHByb3h5SGFuZGxlciA9IHByb3h5KGNvbmZpZyk7XG4gIGFwaS51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dCA9IG5leHQ7XG4gICAgcHJveHlIYW5kbGVyKHJlcSwgcmVzLCBuZXh0KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWxsYmFja0luZGV4SHRtbCgpIHtcbiAgY29uc3QgcnVsZU9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBnZXRTZXR0aW5nKCkuZmFsbGJhY2tJbmRleEh0bWw7XG5cbiAgY29uc3QgcnVsZXM6IEFycmF5PHtyZWc6IFJlZ0V4cCwgdG1wbDogXy5UZW1wbGF0ZUV4ZWN1dG9yfT4gPSBbXTtcblxuICBPYmplY3Qua2V5cyhydWxlT2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICByZWc6IG5ldyBSZWdFeHAoa2V5KSxcbiAgICAgIHRtcGw6IF8udGVtcGxhdGUocnVsZU9ialtrZXldIGFzIHN0cmluZylcbiAgICB9KTtcbiAgfSk7XG5cbiAgYXBpLnVzZSgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIHJldHVybiBuZXh0KCk7XG5cbiAgICBydWxlcy5zb21lKCh7cmVnLCB0bXBsfSkgPT4ge1xuICAgICAgY29uc3Qgb3JpZyA9IHJlcS51cmw7XG4gICAgICBjb25zdCBtYXRjaCA9IHJlZy5leGVjKHJlcS51cmwpO1xuICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmVmZXJlbmNlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9rYXBvdWVyL2V4cHJlc3MtdXJscmV3cml0ZS9ibG9iL21hc3Rlci9pbmRleC5qcyNMNDVcbiAgICAgIHJlcS51cmwgPSByZXEub3JpZ2luYWxVcmwgPSB0bXBsKHttYXRjaH0pO1xuICAgICAgbG9nLmRlYnVnKCdyZXdyaXRlIHVybCAlcyB0byAlcycsIG9yaWcsIHJlcS51cmwpO1xuICAgICAgLy8gY29uc3QgcXBTZXR0aW5nOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBhcGkuZXhwcmVzc0FwcC5nZXQoJ3F1ZXJ5IHBhcnNlcicpO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBuZXh0KCk7XG4gIH0pO1xufVxuIl19