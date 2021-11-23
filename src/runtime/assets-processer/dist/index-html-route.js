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
    config.onProxyReq = http_proxy_middleware_1.fixRequestBody;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUVBQThGO0FBRTlGLG9EQUF1QjtBQUN2Qix5QkFBeUI7QUFDekIsc0NBQTZFO0FBQzdFLCtFQUE0RDtBQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFJakMsU0FBUyxlQUFlLENBQUMsR0FBUTtJQUMvQixPQUFPLEdBQUcsQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDO0FBQzlCLENBQUM7QUFFRCxTQUFnQixnQkFBZ0IsQ0FBQyxHQUFxQjs7SUFDcEQsNEVBQTRFO0lBQzVFLElBQUksT0FBTyxHQUF3QixJQUFBLHFDQUFVLEdBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztJQUNqRSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFFVCxNQUFNLE1BQU0sR0FBWSxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QyxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUMzQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUNqQixNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUMvQixNQUFNLFlBQVksR0FBRyxJQUFBLGNBQVcsR0FBRSxDQUFDO0lBQ25DLE1BQU0sQ0FBQyxVQUFVLEdBQUcsc0NBQWMsQ0FBQztJQUNuQyxNQUFNLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxPQUFPLEtBQUksTUFBQSxZQUFZLENBQUMsVUFBVSwwQ0FBRSxPQUFPLENBQUEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDOUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakMsSUFBSyxHQUE2QixDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7WUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQywyREFBMkQsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RixJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUM7Z0JBQ3RCLE9BQU8sR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hCLE9BQU87U0FDUjtRQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFJLGVBQWUsQ0FBQyxHQUFHLENBQUM7WUFDdEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QixDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxJQUFBLDZDQUFLLEVBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDakMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDeEIsR0FBcUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ3ZDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBaENELDRDQWdDQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLEdBQXFCO0lBQ3JELE1BQU0sT0FBTyxHQUE0QixJQUFBLHFDQUFVLEdBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUV4RSxNQUFNLEtBQUssR0FBbUQsRUFBRSxDQUFDO0lBRWpFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVCxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3BCLElBQUksRUFBRSxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUU7U0FDaEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUNoQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDO1lBQ2Ysc0ZBQXNGO1lBQ3RGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRCw0RUFBNEU7WUFFNUUsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUJELDhDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zLCBmaXhSZXF1ZXN0Qm9keX0gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcbmltcG9ydCBleHByZXNzIGZyb20gJ0B3ZmgvZXhwcmVzcy1hcHAvZGlzdC9leHByZXNzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWcgYXMgcGxpbmtDb25maWcsIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2Fzc2V0cy1wcm9jZXNzZXItc2V0dGluZyc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbmludGVyZmFjZSBSZXFXaXRoTmV4dENiIGV4dGVuZHMgZXhwcmVzcy5SZXF1ZXN0IHtcbiAgX19nb05leHQ6IGV4cHJlc3MuTmV4dEZ1bmN0aW9uO1xufVxuZnVuY3Rpb24gaXNSZXFXaXRoTmV4dENiKG9iajogYW55KTogb2JqIGlzIFJlcVdpdGhOZXh0Q2Ige1xuICByZXR1cm4gb2JqLl9fZ29OZXh0ICE9IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcm94eVRvRGV2U2VydmVyKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICAvLyBjb25zdCBocG1Mb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdhc3NldHMtcHJvY2Vzcy5pbmRleC1odG1sLXJvdXRlLnByb3h5Jyk7XG4gIGxldCBzZXR0aW5nOiBPcHRpb25zIHwgdW5kZWZpbmVkID0gZ2V0U2V0dGluZygpLnByb3h5VG9EZXZTZXJ2ZXI7XG4gIGlmIChzZXR0aW5nID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGNvbmZpZzogT3B0aW9ucyA9IF8uY2xvbmVEZWVwKHNldHRpbmcpO1xuICBjb25maWcuY2hhbmdlT3JpZ2luID0gdHJ1ZTtcbiAgY29uZmlnLndzID0gdHJ1ZTtcbiAgY29uZmlnLmxvZ1Byb3ZpZGVyID0gKCkgPT4gbG9nO1xuICBjb25zdCBwbGlua1NldHRpbmcgPSBwbGlua0NvbmZpZygpO1xuICBjb25maWcub25Qcm94eVJlcSA9IGZpeFJlcXVlc3RCb2R5O1xuICBjb25maWcubG9nTGV2ZWwgPSBwbGlua1NldHRpbmcuZGV2TW9kZSB8fCBwbGlua1NldHRpbmcuY2xpT3B0aW9ucz8udmVyYm9zZSA/ICdkZWJ1ZycgOiAnaW5mbyc7XG4gIGNvbmZpZy5vbkVycm9yID0gKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICBpZiAoKGVyciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnKSB7XG4gICAgICBsb2cuaW5mbygnQ2FuIG5vdCBjb25uZWN0IHRvICVzJXMsIGZhcndhcmQgdG8gbG9jYWwgc3RhdGljIHJlc291cmNlJywgY29uZmlnLnRhcmdldCwgcmVxLnVybCk7XG4gICAgICBpZiAoaXNSZXFXaXRoTmV4dENiKHJlcSkpXG4gICAgICAgIHJldHVybiByZXEuX19nb05leHQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9nLndhcm4oZXJyKTtcbiAgICBpZiAoaXNSZXFXaXRoTmV4dENiKHJlcSkpXG4gICAgICByZXEuX19nb05leHQoZXJyKTtcbiAgfTtcblxuICBjb25zdCBwcm94eUhhbmRsZXIgPSBwcm94eSgnLycsIGNvbmZpZyk7XG4gIGFwaS5leHByZXNzQXBwVXNlKChhcHAsIGV4cHJlc3MpID0+IHtcbiAgICBhcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dCA9IG5leHQ7XG4gICAgICBwcm94eUhhbmRsZXIocmVxLCByZXMsIG5leHQpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGZhbGxiYWNrSW5kZXhIdG1sKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICBjb25zdCBydWxlT2JqOiB7W2tleTogc3RyaW5nXTogc3RyaW5nfSA9IGdldFNldHRpbmcoKS5mYWxsYmFja0luZGV4SHRtbDtcblxuICBjb25zdCBydWxlczogQXJyYXk8e3JlZzogUmVnRXhwOyB0bXBsOiBfLlRlbXBsYXRlRXhlY3V0b3J9PiA9IFtdO1xuXG4gIE9iamVjdC5rZXlzKHJ1bGVPYmopLmZvckVhY2goa2V5ID0+IHtcbiAgICBydWxlcy5wdXNoKHtcbiAgICAgIHJlZzogbmV3IFJlZ0V4cChrZXkpLFxuICAgICAgdG1wbDogXy50ZW1wbGF0ZShydWxlT2JqW2tleV0gKVxuICAgIH0pO1xuICB9KTtcblxuICBhcGkudXNlKCcvJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgaWYgKHJlcS5tZXRob2QgIT09ICdHRVQnKVxuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICBsb2cuZGVidWcocmVxLnVybCk7XG4gICAgcnVsZXMuc29tZSgoe3JlZywgdG1wbH0pID0+IHtcbiAgICAgIGNvbnN0IG9yaWcgPSByZXEudXJsO1xuICAgICAgY29uc3QgbWF0Y2ggPSByZWcuZXhlYyhyZXEudXJsKTtcbiAgICAgIGlmICghbWF0Y2gpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJlZmVyZW5jZSB0byBodHRwczovL2dpdGh1Yi5jb20va2Fwb3Vlci9leHByZXNzLXVybHJld3JpdGUvYmxvYi9tYXN0ZXIvaW5kZXguanMjTDQ1XG4gICAgICByZXEudXJsID0gcmVxLm9yaWdpbmFsVXJsID0gdG1wbCh7bWF0Y2h9KTtcbiAgICAgIGxvZy5pbmZvKCdyZXdyaXRlIHVybCAlcyB0byAlcycsIG9yaWcsIHJlcS51cmwpO1xuICAgICAgLy8gY29uc3QgcXBTZXR0aW5nOiBzdHJpbmcgfCB1bmRlZmluZWQgPSBhcGkuZXhwcmVzc0FwcC5nZXQoJ3F1ZXJ5IHBhcnNlcicpO1xuXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgICBuZXh0KCk7XG4gIH0pO1xufVxuIl19