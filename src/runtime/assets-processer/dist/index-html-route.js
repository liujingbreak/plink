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
const log = (0, plink_1.log4File)(__filename);
function proxyToDevServer() {
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
            if (req.__goNext)
                return req.__goNext();
            return;
        }
        log.warn(err);
        if (req.__goNext)
            req.__goNext(err);
    };
    const proxyHandler = (0, http_proxy_middleware_1.createProxyMiddleware)('/', config);
    __api_1.default.use((req, res, next) => {
        req.__goNext = next;
        proxyHandler(req, res, next);
    });
}
exports.proxyToDevServer = proxyToDevServer;
function fallbackIndexHtml() {
    const ruleObj = (0, assets_processer_setting_1.getSetting)().fallbackIndexHtml;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUVBQThFO0FBRTlFLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIseUJBQXlCO0FBQ3pCLHNDQUEyRDtBQUMzRCwrRUFBNEQ7QUFDNUQsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBSWpDLFNBQWdCLGdCQUFnQjs7SUFDOUIsNEVBQTRFO0lBQzVFLElBQUksT0FBTyxHQUF3QixJQUFBLHFDQUFVLEdBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztJQUNqRSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFFVCxNQUFNLE1BQU0sR0FBWSxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3QyxNQUFNLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztJQUMzQixNQUFNLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztJQUNqQixNQUFNLENBQUMsV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQztJQUMvQixNQUFNLFlBQVksR0FBRyxJQUFBLGNBQVcsR0FBRSxDQUFDO0lBQ25DLE1BQU0sQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLE9BQU8sS0FBSSxNQUFBLFlBQVksQ0FBQyxVQUFVLDBDQUFFLE9BQU8sQ0FBQSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUM5RixNQUFNLENBQUMsT0FBTyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUNqQyxJQUFLLEdBQTZCLENBQUMsSUFBSSxLQUFLLGNBQWMsRUFBRTtZQUMxRCxHQUFHLENBQUMsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLElBQUssR0FBVyxDQUFDLFFBQVE7Z0JBQ3ZCLE9BQVEsR0FBcUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxPQUFPO1NBQ1I7UUFDRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2QsSUFBSyxHQUFXLENBQUMsUUFBUTtZQUN0QixHQUFxQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxJQUFBLDZDQUFLLEVBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLGVBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3hCLEdBQXFCLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUN2QyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUE3QkQsNENBNkJDO0FBRUQsU0FBZ0IsaUJBQWlCO0lBQy9CLE1BQU0sT0FBTyxHQUE0QixJQUFBLHFDQUFVLEdBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUV4RSxNQUFNLEtBQUssR0FBbUQsRUFBRSxDQUFDO0lBRWpFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVCxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3BCLElBQUksRUFBRSxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUU7U0FDaEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUVoQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDO1lBQ2Ysc0ZBQXNGO1lBQ3RGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNqRCw0RUFBNEU7WUFFNUUsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUJELDhDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnQHdmaC9leHByZXNzLWFwcC9kaXN0L2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuLy8gaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnIGFzIHBsaW5rQ29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5pbnRlcmZhY2UgUmVxV2l0aE5leHRDYiBleHRlbmRzIGV4cHJlc3MuUmVxdWVzdCB7XG4gIF9fZ29OZXh0OiBleHByZXNzLk5leHRGdW5jdGlvbjtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm94eVRvRGV2U2VydmVyKCkge1xuICAvLyBjb25zdCBocG1Mb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdhc3NldHMtcHJvY2Vzcy5pbmRleC1odG1sLXJvdXRlLnByb3h5Jyk7XG4gIGxldCBzZXR0aW5nOiBPcHRpb25zIHwgdW5kZWZpbmVkID0gZ2V0U2V0dGluZygpLnByb3h5VG9EZXZTZXJ2ZXI7XG4gIGlmIChzZXR0aW5nID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGNvbmZpZzogT3B0aW9ucyA9IF8uY2xvbmVEZWVwKHNldHRpbmcpO1xuICBjb25maWcuY2hhbmdlT3JpZ2luID0gdHJ1ZTtcbiAgY29uZmlnLndzID0gdHJ1ZTtcbiAgY29uZmlnLmxvZ1Byb3ZpZGVyID0gKCkgPT4gbG9nO1xuICBjb25zdCBwbGlua1NldHRpbmcgPSBwbGlua0NvbmZpZygpO1xuICBjb25maWcubG9nTGV2ZWwgPSBwbGlua1NldHRpbmcuZGV2TW9kZSB8fCBwbGlua1NldHRpbmcuY2xpT3B0aW9ucz8udmVyYm9zZSA/ICdkZWJ1ZycgOiAnaW5mbyc7XG4gIGNvbmZpZy5vbkVycm9yID0gKGVyciwgcmVxLCByZXMpID0+IHtcbiAgICBpZiAoKGVyciBhcyBOb2RlSlMuRXJybm9FeGNlcHRpb24pLmNvZGUgPT09ICdFQ09OTlJFRlVTRUQnKSB7XG4gICAgICBsb2cuaW5mbygnQ2FuIG5vdCBjb25uZWN0IHRvICVzJXMsIGZhcndhcmQgdG8gbG9jYWwgc3RhdGljIHJlc291cmNlJywgY29uZmlnLnRhcmdldCwgcmVxLnVybCk7XG4gICAgICBpZiAoKHJlcSBhcyBhbnkpLl9fZ29OZXh0KVxuICAgICAgICByZXR1cm4gKHJlcSBhcyBSZXFXaXRoTmV4dENiKS5fX2dvTmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsb2cud2FybihlcnIpO1xuICAgIGlmICgocmVxIGFzIGFueSkuX19nb05leHQpXG4gICAgICAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0KGVycik7XG4gIH07XG5cbiAgY29uc3QgcHJveHlIYW5kbGVyID0gcHJveHkoJy8nLCBjb25maWcpO1xuICBhcGkudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQgPSBuZXh0O1xuICAgIHByb3h5SGFuZGxlcihyZXEsIHJlcywgbmV4dCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZmFsbGJhY2tJbmRleEh0bWwoKSB7XG4gIGNvbnN0IHJ1bGVPYmo6IHtba2V5OiBzdHJpbmddOiBzdHJpbmd9ID0gZ2V0U2V0dGluZygpLmZhbGxiYWNrSW5kZXhIdG1sO1xuXG4gIGNvbnN0IHJ1bGVzOiBBcnJheTx7cmVnOiBSZWdFeHA7IHRtcGw6IF8uVGVtcGxhdGVFeGVjdXRvcn0+ID0gW107XG5cbiAgT2JqZWN0LmtleXMocnVsZU9iaikuZm9yRWFjaChrZXkgPT4ge1xuICAgIHJ1bGVzLnB1c2goe1xuICAgICAgcmVnOiBuZXcgUmVnRXhwKGtleSksXG4gICAgICB0bXBsOiBfLnRlbXBsYXRlKHJ1bGVPYmpba2V5XSApXG4gICAgfSk7XG4gIH0pO1xuXG4gIGFwaS51c2UoJy8nLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICBpZiAocmVxLm1ldGhvZCAhPT0gJ0dFVCcpXG4gICAgICByZXR1cm4gbmV4dCgpO1xuXG4gICAgcnVsZXMuc29tZSgoe3JlZywgdG1wbH0pID0+IHtcbiAgICAgIGNvbnN0IG9yaWcgPSByZXEudXJsO1xuICAgICAgY29uc3QgbWF0Y2ggPSByZWcuZXhlYyhyZXEudXJsKTtcbiAgICAgIGlmICghbWF0Y2gpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIC8vIFJlZmVyZW5jZSB0byBodHRwczovL2dpdGh1Yi5jb20va2Fwb3Vlci9leHByZXNzLXVybHJld3JpdGUvYmxvYi9tYXN0ZXIvaW5kZXguanMjTDQ1XG4gICAgICByZXEudXJsID0gcmVxLm9yaWdpbmFsVXJsID0gdG1wbCh7bWF0Y2h9KTtcbiAgICAgIGxvZy5kZWJ1ZygncmV3cml0ZSB1cmwgJXMgdG8gJXMnLCBvcmlnLCByZXEudXJsKTtcbiAgICAgIC8vIGNvbnN0IHFwU2V0dGluZzogc3RyaW5nIHwgdW5kZWZpbmVkID0gYXBpLmV4cHJlc3NBcHAuZ2V0KCdxdWVyeSBwYXJzZXInKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgbmV4dCgpO1xuICB9KTtcbn1cbiJdfQ==