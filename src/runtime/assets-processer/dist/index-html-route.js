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
            if (req.__goNext)
                return req.__goNext();
            return;
        }
        log.warn(err);
        if (req.__goNext)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgtaHRtbC1yb3V0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluZGV4LWh0bWwtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUVBQThFO0FBRTlFLG9EQUF1QjtBQUN2Qix5QkFBeUI7QUFDekIsc0NBQTZFO0FBQzdFLCtFQUE0RDtBQUM1RCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFJakMsU0FBZ0IsZ0JBQWdCLENBQUMsR0FBcUI7O0lBQ3BELDRFQUE0RTtJQUM1RSxJQUFJLE9BQU8sR0FBd0IsSUFBQSxxQ0FBVSxHQUFFLENBQUMsZ0JBQWdCLENBQUM7SUFDakUsSUFBSSxPQUFPLElBQUksSUFBSTtRQUNqQixPQUFPO0lBRVQsTUFBTSxNQUFNLEdBQVksZ0JBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsTUFBTSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7SUFDM0IsTUFBTSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFDakIsTUFBTSxDQUFDLFdBQVcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUM7SUFDL0IsTUFBTSxZQUFZLEdBQUcsSUFBQSxjQUFXLEdBQUUsQ0FBQztJQUNuQyxNQUFNLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxPQUFPLEtBQUksTUFBQSxZQUFZLENBQUMsVUFBVSwwQ0FBRSxPQUFPLENBQUEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7SUFDOUYsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7UUFDakMsSUFBSyxHQUE2QixDQUFDLElBQUksS0FBSyxjQUFjLEVBQUU7WUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQywyREFBMkQsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RixJQUFLLEdBQXFCLENBQUMsUUFBUTtnQkFDakMsT0FBUSxHQUFxQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQzNDLE9BQU87U0FDUjtRQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDZCxJQUFLLEdBQXFCLENBQUMsUUFBUTtZQUNoQyxHQUFxQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxJQUFBLDZDQUFLLEVBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3hDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDakMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDeEIsR0FBcUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ3ZDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBL0JELDRDQStCQztBQUVELFNBQWdCLGlCQUFpQixDQUFDLEdBQXFCO0lBQ3JELE1BQU0sT0FBTyxHQUE0QixJQUFBLHFDQUFVLEdBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUV4RSxNQUFNLEtBQUssR0FBbUQsRUFBRSxDQUFDO0lBRWpFLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDVCxHQUFHLEVBQUUsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ3BCLElBQUksRUFBRSxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUU7U0FDaEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7UUFDOUIsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLEtBQUs7WUFDdEIsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUNoQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtZQUN6QixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLO2dCQUNSLE9BQU8sS0FBSyxDQUFDO1lBQ2Ysc0ZBQXNGO1lBQ3RGLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsRUFBQyxLQUFLLEVBQUMsQ0FBQyxDQUFDO1lBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoRCw0RUFBNEU7WUFFNUUsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksRUFBRSxDQUFDO0lBQ1QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBOUJELDhDQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Y3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IGV4cHJlc3MgZnJvbSAnQHdmaC9leHByZXNzLWFwcC9kaXN0L2V4cHJlc3MnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZyBhcyBwbGlua0NvbmZpZywgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuaW50ZXJmYWNlIFJlcVdpdGhOZXh0Q2IgZXh0ZW5kcyBleHByZXNzLlJlcXVlc3Qge1xuICBfX2dvTmV4dDogZXhwcmVzcy5OZXh0RnVuY3Rpb247XG59XG5leHBvcnQgZnVuY3Rpb24gcHJveHlUb0RldlNlcnZlcihhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgLy8gY29uc3QgaHBtTG9nID0gbG9nNGpzLmdldExvZ2dlcignYXNzZXRzLXByb2Nlc3MuaW5kZXgtaHRtbC1yb3V0ZS5wcm94eScpO1xuICBsZXQgc2V0dGluZzogT3B0aW9ucyB8IHVuZGVmaW5lZCA9IGdldFNldHRpbmcoKS5wcm94eVRvRGV2U2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBjb25maWc6IE9wdGlvbnMgPSBfLmNsb25lRGVlcChzZXR0aW5nKTtcbiAgY29uZmlnLmNoYW5nZU9yaWdpbiA9IHRydWU7XG4gIGNvbmZpZy53cyA9IHRydWU7XG4gIGNvbmZpZy5sb2dQcm92aWRlciA9ICgpID0+IGxvZztcbiAgY29uc3QgcGxpbmtTZXR0aW5nID0gcGxpbmtDb25maWcoKTtcbiAgY29uZmlnLmxvZ0xldmVsID0gcGxpbmtTZXR0aW5nLmRldk1vZGUgfHwgcGxpbmtTZXR0aW5nLmNsaU9wdGlvbnM/LnZlcmJvc2UgPyAnZGVidWcnIDogJ2luZm8nO1xuICBjb25maWcub25FcnJvciA9IChlcnIsIHJlcSwgcmVzKSA9PiB7XG4gICAgaWYgKChlcnIgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlID09PSAnRUNPTk5SRUZVU0VEJykge1xuICAgICAgbG9nLmluZm8oJ0NhbiBub3QgY29ubmVjdCB0byAlcyVzLCBmYXJ3YXJkIHRvIGxvY2FsIHN0YXRpYyByZXNvdXJjZScsIGNvbmZpZy50YXJnZXQsIHJlcS51cmwpO1xuICAgICAgaWYgKChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQpXG4gICAgICAgIHJldHVybiAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvZy53YXJuKGVycik7XG4gICAgaWYgKChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQpXG4gICAgICAocmVxIGFzIFJlcVdpdGhOZXh0Q2IpLl9fZ29OZXh0KGVycik7XG4gIH07XG5cbiAgY29uc3QgcHJveHlIYW5kbGVyID0gcHJveHkoJy8nLCBjb25maWcpO1xuICBhcGkuZXhwcmVzc0FwcFVzZSgoYXBwLCBleHByZXNzKSA9PiB7XG4gICAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIChyZXEgYXMgUmVxV2l0aE5leHRDYikuX19nb05leHQgPSBuZXh0O1xuICAgICAgcHJveHlIYW5kbGVyKHJlcSwgcmVzLCBuZXh0KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmYWxsYmFja0luZGV4SHRtbChhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgY29uc3QgcnVsZU9iajoge1trZXk6IHN0cmluZ106IHN0cmluZ30gPSBnZXRTZXR0aW5nKCkuZmFsbGJhY2tJbmRleEh0bWw7XG5cbiAgY29uc3QgcnVsZXM6IEFycmF5PHtyZWc6IFJlZ0V4cDsgdG1wbDogXy5UZW1wbGF0ZUV4ZWN1dG9yfT4gPSBbXTtcblxuICBPYmplY3Qua2V5cyhydWxlT2JqKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgcnVsZXMucHVzaCh7XG4gICAgICByZWc6IG5ldyBSZWdFeHAoa2V5KSxcbiAgICAgIHRtcGw6IF8udGVtcGxhdGUocnVsZU9ialtrZXldIClcbiAgICB9KTtcbiAgfSk7XG5cbiAgYXBpLnVzZSgnLycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgIGlmIChyZXEubWV0aG9kICE9PSAnR0VUJylcbiAgICAgIHJldHVybiBuZXh0KCk7XG4gICAgbG9nLmRlYnVnKHJlcS51cmwpO1xuICAgIHJ1bGVzLnNvbWUoKHtyZWcsIHRtcGx9KSA9PiB7XG4gICAgICBjb25zdCBvcmlnID0gcmVxLnVybDtcbiAgICAgIGNvbnN0IG1hdGNoID0gcmVnLmV4ZWMocmVxLnVybCk7XG4gICAgICBpZiAoIW1hdGNoKVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAvLyBSZWZlcmVuY2UgdG8gaHR0cHM6Ly9naXRodWIuY29tL2thcG91ZXIvZXhwcmVzcy11cmxyZXdyaXRlL2Jsb2IvbWFzdGVyL2luZGV4LmpzI0w0NVxuICAgICAgcmVxLnVybCA9IHJlcS5vcmlnaW5hbFVybCA9IHRtcGwoe21hdGNofSk7XG4gICAgICBsb2cuaW5mbygncmV3cml0ZSB1cmwgJXMgdG8gJXMnLCBvcmlnLCByZXEudXJsKTtcbiAgICAgIC8vIGNvbnN0IHFwU2V0dGluZzogc3RyaW5nIHwgdW5kZWZpbmVkID0gYXBpLmV4cHJlc3NBcHAuZ2V0KCdxdWVyeSBwYXJzZXInKTtcblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gICAgbmV4dCgpO1xuICB9KTtcbn1cbiJdfQ==