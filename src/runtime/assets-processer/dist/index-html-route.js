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
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const log = plink_1.log4File(__filename);
function proxyToDevServer() {
    var _a;
    // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
    let setting = assets_processer_setting_1.getSetting().proxyToDevServer;
    if (setting == null)
        return;
    const config = lodash_1.default.cloneDeep(setting);
    config.changeOrigin = true;
    config.ws = true;
    config.logProvider = () => log;
    const plinkSetting = plink_1.config();
    config.logLevel = plinkSetting.devMode || ((_a = plinkSetting.cliOptions) === null || _a === void 0 ? void 0 : _a.verbose) ? 'debug' : 'info';
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
    const proxyHandler = http_proxy_middleware_1.createProxyMiddleware('/', config);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUVBQThFO0FBRTlFLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIseUJBQXlCO0FBQ3pCLHNDQUEyRDtBQUMzRCwrRUFBNEQ7QUFDNUQsTUFBTSxHQUFHLEdBQUcsZ0JBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUlqQyxTQUFnQixnQkFBZ0I7O0lBQzlCLDRFQUE0RTtJQUM1RSxJQUFJLE9BQU8sR0FBd0IscUNBQVUsRUFBRSxDQUFDLGdCQUFnQixDQUFDO0lBQ2pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUVULE1BQU0sTUFBTSxHQUFZLGdCQUFDLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLE1BQU0sQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBQ2pCLE1BQU0sQ0FBQyxXQUFXLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDO0lBQy9CLE1BQU0sWUFBWSxHQUFHLGNBQVcsRUFBRSxDQUFDO0lBQ25DLE1BQU0sQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLE9BQU8sV0FBSSxZQUFZLENBQUMsVUFBVSwwQ0FBRSxPQUFPLENBQUEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDOUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakMsSUFBSyxHQUE2QixDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7WUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQywyREFBMkQsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RixJQUFLLEdBQVcsQ0FBQyxRQUFRO2dCQUN2QixPQUFRLEdBQXFCLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDM0MsT0FBTztTQUNSO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNkLElBQUssR0FBVyxDQUFDLFFBQVE7WUFDdEIsR0FBcUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDO0lBRUYsTUFBTSxZQUFZLEdBQUcsNkNBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEMsZUFBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDeEIsR0FBcUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3ZDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTdCRCw0Q0E2QkM7QUFFRCxTQUFnQixpQkFBaUI7SUFDL0IsTUFBTSxPQUFPLEdBQTRCLHFDQUFVLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUV4RSxNQUFNLEtBQUssR0FBbUQsRUFBRSxDQUFDO0lBRWpFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVCxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3BCLElBQUksRUFBRSxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUU7U0FDaEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUVoQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDO1lBQ2Ysc0ZBQXNGO1lBQ3RGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqRCw0RUFBNEU7WUFFNUUsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUJELDhDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtOZXh0RnVuY3Rpb24sIFJlcXVlc3R9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnIGFzIHBsaW5rQ29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5pbnRlcmZhY2UgUmVxV2l0aE5leHRDYiBleHRlbmRzIFJlcXVlc3Qge1xuICBfX2dvTmV4dDogTmV4dEZ1bmN0aW9uO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHByb3h5VG9EZXZTZXJ2ZXIoKSB7XG4gIC8vIGNvbnN0IGhwbUxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2Fzc2V0cy1wcm9jZXNzLmluZGV4LWh0bWwtcm91dGUucHJveHknKTtcbiAgbGV0IHNldHRpbmc6IE9wdGlvbnMgfCB1bmRlZmluZWQgPSBnZXRTZXR0aW5nKCkucHJveHlUb0RldlNlcnZlcjtcbiAgaWYgKHNldHRpbmcgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgY29uZmlnOiBPcHRpb25zID0gXy5jbG9uZURlZXAoc2V0dGluZyk7XG4gIGNvbmZpZy5jaGFuZ2VPcmlnaW4gPSB0cnVlO1xuICBjb25maWcud3MgPSB0cnVlO1xuICBjb25maWcubG9nUHJvdmlkZXIgPSAoKSA9PiBsb2c7XG4gIGNvbnN0IHBsaW5rU2V0dGluZyA9IHBsaW5rQ29uZmlnKCk7XG4gIGNvbmZpZy5sb2dMZXZlbCA9IHBsaW5rU2V0dGluZy5kZXZNb2RlIHx8IHBsaW5rU2V0dGluZy5jbGlPcHRpb25zPy52ZXJib3NlID8gJ2RlYnVnJyA6ICdpbmZvJztcbiAgY29uZmlnLm9uRXJyb3IgPSAoZXJyLCByZXEsIHJlcykgPT4ge1xuICAgIGlmICgoZXJyIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSA9PT0gJ0VDT05OUkVGVVNFRCcpIHtcbiAgICAgIGxvZy5pbmZvKCdDYW4gbm90IGNvbm5lY3QgdG8gJXMlcywgZmFyd2FyZCB0byBsb2NhbCBzdGF0aWMgcmVzb3VyY2UnLCBjb25maWcudGFyZ2V0LCByZXEudXJsKTtcbiAgICAgIGlmICgocmVxIGFzIGFueSkuX19nb05leHQpXG4gICAgICAgIHJldHVybiAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZy53YXJuKGVycik7XG4gICAgaWYgKChyZXEgYXMgYW55KS5fX2dvTmV4dClcbiAgICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQoZXJyKTtcbiAgfTtcblxuICBjb25zdCBwcm94eUhhbmRsZXIgPSBwcm94eSgnLycsIGNvbmZpZyk7XG4gIGFwaS51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dCA9IG5leHQ7XG4gICAgcHJveHlIYW5kbGVyKHJlcSwgcmVzLCBuZXh0KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWxsYmFja0luZGV4SHRtbCgpIHtcbiAgY29uc3QgcnVsZU9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBnZXRTZXR0aW5nKCkuZmFsbGJhY2tJbmRleEh0bWw7XG5cbiAgY29uc3QgcnVsZXM6IEFycmF5PHtyZWc6IFJlZ0V4cDsgdG1wbDogXy5UZW1wbGF0ZUV4ZWN1dG9yfT4gPSBbXTtcblxuICBPYmplY3Qua2V5cyhydWxlT2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICByZWc6IG5ldyBSZWdFeHAoa2V5KSxcbiAgICAgIHRtcGw6IF8udGVtcGxhdGUocnVsZU9ialtrZXldIClcbiAgICB9KTtcbiAgfSk7XG5cbiAgYXBpLnVzZSgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIHJldHVybiBuZXh0KCk7XG5cbiAgICBydWxlcy5zb21lKCh7cmVnLCB0bXBsfSkgPT4ge1xuICAgICAgY29uc3Qgb3JpZyA9IHJlcS51cmw7XG4gICAgICBjb25zdCBtYXRjaCA9IHJlZy5leGVjKHJlcS51cmwpO1xuICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgLy8gUmVmZXJlbmNlIHRvIGh0dHBzOi8vZ2l0aHViLmNvbS9rYXBvdWVyL2V4cHJlc3MtdXJscmV3cml0ZS9ibG9iL21hc3Rlci9pbmRleC5qcyNMNDVcbiAgICAgIHJlcS51cmwgPSByZXEub3JpZ2luYWxVcmwgPSB0bXBsKHttYXRjaH0pO1xuICAgICAgbG9nLmRlYnVnKCdyZXdyaXRlIHVybCAlcyB0byAlcycsIG9yaWcsIHJlcS51cmwpO1xuICAgICAgLy8gY29uc3QgcXBTZXR0aW5nOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBhcGkuZXhwcmVzc0FwcC5nZXQoJ3F1ZXJ5IHBhcnNlcicpO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBuZXh0KCk7XG4gIH0pO1xufVxuIl19