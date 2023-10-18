"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackIndexHtml = exports.proxyToDevServer = void 0;
const tslib_1 = require("tslib");
const http_proxy_1 = tslib_1.__importDefault(require("http-proxy"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
// import Url from 'url';
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const utils_1 = require("./utils");
const log = (0, plink_1.log4File)(__filename);
function proxyToDevServer(api) {
    // const hpmLog = log4js.getLogger('assets-process.index-html-route.proxy');
    const setting = (0, assets_processer_setting_1.getSetting)().proxyToDevServer;
    if (setting == null)
        return;
    const config = lodash_1.default.cloneDeep(setting);
    config.changeOrigin = true;
    config.ws = true;
    // const plinkSetting = plinkConfig();
    // config.onProxyReq = fixRequestBody;
    // config.logLevel = plinkSetting.devMode || plinkSetting.cliOptions?.verbose ? 'debug' : 'info';
    // config.onError = (err, req, res) => {
    //   if ((err as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
    //     log.info('Can not connect to %s%s, farward to local static resource', config.target, req.url);
    //     if (isReqWithNextCb(req))
    //       return req.__goNext();
    //     return;
    //   }
    // log.warn(err);
    // if (isReqWithNextCb(req))
    //   req.__goNext(err);
    // };
    // const proxyHandler = proxy('/', config);
    const proxyHanlder = http_proxy_1.default.createProxyServer(config);
    api.use((req, res, next) => {
        const body = (0, utils_1.createBufferForHttpProxy)(req);
        proxyHanlder.web(req, res, {
            buffer: body === null || body === void 0 ? void 0 : body.readable,
            headers: body ? { 'content-length': (body === null || body === void 0 ? void 0 : body.length) + '' || '0' } : {}
        }, next);
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
//# sourceMappingURL=index-html-route.js.map