"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fallbackIndexHtml = exports.proxyToDevServer = void 0;
const tslib_1 = require("tslib");
const http_proxy_middleware_1 = tslib_1.__importDefault(require("http-proxy-middleware"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const url_1 = tslib_1.__importDefault(require("url"));
const log = require('log4js').getLogger(__api_1.default.packageName);
function proxyToDevServer() {
    const config = __api_1.default.config.get(__api_1.default.packageName).indexHtmlProxy;
    if (config == null)
        return;
    config.changeOrigin = true;
    config.ws = true;
    config.onError = (err, req, res) => {
        if (err.code === 'ECONNREFUSED') {
            log.warn('Can not connect to %s%s, farward to local static resource', config.target, req.url);
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

//# sourceMappingURL=index-html-route.js.map
