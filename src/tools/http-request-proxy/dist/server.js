"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProxy = exports.forEach = exports.forName = exports.ProxyInstance = exports.activate = void 0;
const __api_1 = __importDefault(require("__api"));
const _ = __importStar(require("lodash"));
const log4js = __importStar(require("log4js"));
var log = log4js.getLogger(__api_1.default.packageName);
const proxy_handler_1 = __importDefault(require("./proxy-handler"));
const proxy_instance_1 = require("../isom/proxy-instance");
__exportStar(require("../isom/proxy-instance"), exports);
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
class ProxyInstance extends proxy_instance_1.ProxyInstanceForBrowser {
    constructor(name, options = {}) {
        super(name, options);
    }
    useProxy(router, target) {
        useProxy(router, target, this.name);
    }
}
exports.ProxyInstance = ProxyInstance;
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
