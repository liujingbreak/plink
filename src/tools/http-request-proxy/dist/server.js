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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL2h0dHAtcmVxdWVzdC1wcm94eS90cy9zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUF3QjtBQUN4QiwwQ0FBNEI7QUFDNUIsK0NBQWlDO0FBRWpDLElBQUksR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVDLG9FQUFzQztBQUN0QywyREFBK0Q7QUFDL0QseURBQXVDO0FBRXZDLFNBQWdCLFFBQVE7SUFDdEIscUNBQXFDO0lBQ3JDLFVBQVUsRUFBRSxDQUFDO0lBQ2IsSUFBSSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsSUFBSSxZQUFZLEVBQUU7UUFDaEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQzlFO1NBQU07UUFDTCxJQUFJLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQzNELElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLGVBQUcsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDNUUsT0FBTztTQUNSO1FBQ0QsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDckM7QUFDSCxDQUFDO0FBZEQsNEJBY0M7QUFFRCxNQUFh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QUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUztnQkFDekQsT0FBTztZQUNULElBQUk7Z0JBQ0YsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQzthQUN6QztZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDMUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoidG9vbHMvaHR0cC1yZXF1ZXN0LXByb3h5L2Rpc3Qvc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
