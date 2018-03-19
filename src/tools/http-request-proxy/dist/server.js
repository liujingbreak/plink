"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __api_1 = require("__api");
const _ = require("lodash");
const log4js = require("log4js");
var log = log4js.getLogger(__api_1.default.packageName);
const proxy_handler_1 = require("./proxy-handler");
function activate() {
    // api.router().use('/', api.cors());
    testRouter();
    var multiProxies = __api_1.default.config.get([__api_1.default.packageName, 'proxies']);
    if (multiProxies) {
        _.each(multiProxies, (target, name) => useProxy(__api_1.default.router(), target, name));
    }
    else {
        var proxyTo = __api_1.default.config.get(__api_1.default.packageName + '.proxyTo');
        if (proxyTo == null) {
            log.warn('No proxy configuration "%s" found', __api_1.default.packageName + '.proxies');
            return;
        }
        useProxy(__api_1.default.router(), proxyTo, '');
    }
}
exports.activate = activate;
var proxyInstances = {};
function forName(name, opts) {
    if (proxyInstances[name])
        return proxyInstances[name];
    var p = new ProxyInstance(name, opts);
    proxyInstances[name] = p;
    return p;
}
exports.forName = forName;
function forEach(callback) {
    var multiProxies = __api_1.default.config.get([__api_1.default.packageName, 'proxies']);
    if (multiProxies) {
        _.each(multiProxies, (target, name) => callback(forName(name)));
    }
    else {
        callback(forName(''));
    }
}
exports.forEach = forEach;
class ProxyInstance {
    constructor(name, options = {}) {
        this.options = options;
        this.resHandlers = {};
        this.reqHandlers = {};
        this.mockHandlers = {};
        this.resHeaderHandlers = {};
        this.name = name;
    }
    get isRemoveCookieDomain() {
        return !!this.options.removeCookieDomain;
    }
    addOptions(opt) {
        _.assign(this.options, opt);
        return this;
    }
    useProxy(router, target) {
        useProxy(router, target, this.name);
    }
    /**
     * @param {*} path sub path after '/http-request-proxy'
     * @param {*} handler (url: string, method:string,
     * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
     */
    interceptResponse(path, handler) {
        this.addHandler(path, handler, this.resHandlers);
    }
    interceptRequest(path, handler) {
        this.addHandler(path, handler, this.reqHandlers);
    }
    mockResponse(path, handler) {
        this.addHandler(path, handler, this.mockHandlers);
    }
    interceptResHeader(path, handler) {
        this.addHandler(path, handler, this.resHeaderHandlers);
    }
    addHandler(path, handler, to) {
        if (path !== '*' && !_.startsWith(path, '/'))
            path = '/' + path;
        var list = _.get(to, path);
        if (list == null) {
            list = new Set();
            to[path] = list;
        }
        list.add(handler);
    }
}
exports.ProxyInstance = ProxyInstance;
/**
 * Add proxy middlewares to a specific router path
    * @param {Route} router Express router instance, could be `api.router()`
    * @param {string} target a full http URL, e.g. https://www-demo.foobar.com
    * @param {string} proxyPath sub path the proxy middleware will be handling on
 */
function useProxy(router, target, proxyPath) {
    if (proxyPath == null)
        proxyPath = '/';
    if (!proxyPath.startsWith('/'))
        proxyPath = '/' + proxyPath;
    target = _.trimEnd(target, '/');
    var proxyName = _.trimStart(proxyPath, '/');
    router.use(proxyPath, __api_1.default.cors());
    router.use(proxyPath, (req, res) => {
        proxy_handler_1.default(target, req, res, forName(proxyName), proxyName);
    });
    log.info('Proxy %s to %s', proxyPath, target);
}
exports.useProxy = useProxy;
function testRouter() {
    __api_1.default.router().use('/_test', (req, res) => {
        var s = '<pre>';
        s += JSON.stringify(req.headers, null, '\t') + '</pre>';
        _.forIn(req, (v, k) => {
            if (k.startsWith('_') || _.isFunction(v) || k === 'headers')
                return;
            try {
                log.info(k + ': ' + v);
                s += '<b>' + k + '</b>: ' + v + '<br/>';
            }
            catch (e) {
                log.error('cant resolve property %s', k);
            }
        });
        res.send(s);
    });
}

//# sourceMappingURL=server.js.map
