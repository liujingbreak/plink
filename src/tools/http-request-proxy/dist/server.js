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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProxy = exports.forEach = exports.forName = exports.ProxyInstance = exports.activate = void 0;
const __api_1 = __importDefault(require("__api"));
const _ = __importStar(require("lodash"));
const proxy_handler_1 = __importDefault(require("./proxy-handler"));
const proxy_instance_1 = require("../isom/proxy-instance");
const http_request_proxy_setting_1 = require("../isom/http-request-proxy-setting");
__exportStar(require("../isom/proxy-instance"), exports);
const hpm_setup_1 = require("./hpm-setup");
const log = __api_1.default.logger;
function activate() {
    // api.router().use('/', api.cors());
    testRouter();
    hpm_setup_1.npmRegistryProxy();
    var multiProxies = __api_1.default.config.get([__api_1.default.packageName, 'proxies']);
    if (multiProxies) {
        _.each(multiProxies, (target, name) => useProxy(__api_1.default.router(), target, name));
    }
    else {
        var proxyTo = http_request_proxy_setting_1.getSetting().proxyTo;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBd0I7QUFDeEIsMENBQTRCO0FBRTVCLG9FQUFzQztBQUN0QywyREFBK0Q7QUFDL0QsbUZBQThEO0FBQzlELHlEQUF1QztBQUN2QywyQ0FBNkM7QUFFN0MsTUFBTSxHQUFHLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQztBQUV2QixTQUFnQixRQUFRO0lBQ3RCLHFDQUFxQztJQUNyQyxVQUFVLEVBQUUsQ0FBQztJQUNiLDRCQUFnQixFQUFFLENBQUM7SUFDbkIsSUFBSSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDaEUsSUFBSSxZQUFZLEVBQUU7UUFDaEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQzlFO1NBQU07UUFDTCxJQUFJLE9BQU8sR0FBRyx1Q0FBVSxFQUFFLENBQUMsT0FBTyxDQUFDO1FBQ25DLElBQUksT0FBTyxJQUFJLElBQUksRUFBRTtZQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLGVBQUcsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDNUUsT0FBTztTQUNSO1FBQ0QsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDckM7QUFDSCxDQUFDO0FBZkQsNEJBZUM7QUFFRCxNQUFhLGFBQWMsU0FBUSx3Q0FBdUI7SUFDeEQsWUFBWSxJQUFZLEVBQUUsVUFB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QyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssU0FBUztnQkFDekQsT0FBTztZQUNULElBQUk7Z0JBQ0YsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixDQUFDLElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxRQUFRLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQzthQUN6QztZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDMUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgZG9Qcm94eSBmcm9tICcuL3Byb3h5LWhhbmRsZXInO1xuaW1wb3J0IHtQcm94eUluc3RhbmNlRm9yQnJvd3Nlcn0gZnJvbSAnLi4vaXNvbS9wcm94eS1pbnN0YW5jZSc7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vaHR0cC1yZXF1ZXN0LXByb3h5LXNldHRpbmcnO1xuZXhwb3J0ICogZnJvbSAnLi4vaXNvbS9wcm94eS1pbnN0YW5jZSc7XG5pbXBvcnQge25wbVJlZ2lzdHJ5UHJveHl9IGZyb20gJy4vaHBtLXNldHVwJztcblxuY29uc3QgbG9nID0gYXBpLmxvZ2dlcjtcblxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICAvLyBhcGkucm91dGVyKCkudXNlKCcvJywgYXBpLmNvcnMoKSk7XG4gIHRlc3RSb3V0ZXIoKTtcbiAgbnBtUmVnaXN0cnlQcm94eSgpO1xuICB2YXIgbXVsdGlQcm94aWVzID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3Byb3hpZXMnXSk7XG4gIGlmIChtdWx0aVByb3hpZXMpIHtcbiAgICBfLmVhY2gobXVsdGlQcm94aWVzLCAodGFyZ2V0LCBuYW1lKSA9PiB1c2VQcm94eShhcGkucm91dGVyKCksIHRhcmdldCwgbmFtZSkpO1xuICB9IGVsc2Uge1xuICAgIHZhciBwcm94eVRvID0gZ2V0U2V0dGluZygpLnByb3h5VG87XG4gICAgaWYgKHByb3h5VG8gPT0gbnVsbCkge1xuICAgICAgbG9nLndhcm4oJ05vIHByb3h5IGNvbmZpZ3VyYXRpb24gXCIlc1wiIGZvdW5kJywgYXBpLnBhY2thZ2VOYW1lICsgJy5wcm94aWVzJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHVzZVByb3h5KGFwaS5yb3V0ZXIoKSwgcHJveHlUbywgJycpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQcm94eUluc3RhbmNlIGV4dGVuZHMgUHJveHlJbnN0YW5jZUZvckJyb3dzZXIge1xuICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIG9wdGlvbnM6IHtbazogc3RyaW5nXTogYW55fSA9IHt9KSB7XG4gICAgc3VwZXIobmFtZSwgb3B0aW9ucyk7XG4gIH1cblxuICB1c2VQcm94eShyb3V0ZXI6IGFueSwgdGFyZ2V0OiBzdHJpbmcpIHtcbiAgICB1c2VQcm94eShyb3V0ZXIsIHRhcmdldCwgdGhpcy5uYW1lKTtcbiAgfVxufVxuXG52YXIgcHJveHlJbnN0YW5jZXM6IHtbazogc3RyaW5nXTogUHJveHlJbnN0YW5jZX0gPSB7fTtcbmV4cG9ydCBmdW5jdGlvbiBmb3JOYW1lKG5hbWU6IHN0cmluZywgb3B0cz86IHtbazogc3RyaW5nXTogYW55fSk6IFByb3h5SW5zdGFuY2Uge1xuICBpZiAocHJveHlJbnN0YW5jZXNbbmFtZV0pXG4gICAgcmV0dXJuIHByb3h5SW5zdGFuY2VzW25hbWVdO1xuICB2YXIgcCA9IG5ldyBQcm94eUluc3RhbmNlKG5hbWUsIG9wdHMpO1xuICBwcm94eUluc3RhbmNlc1tuYW1lXSA9IHA7XG4gIHJldHVybiBwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yRWFjaChjYWxsYmFjazogKHByb3h5SW5zdGFuY2U6IFByb3h5SW5zdGFuY2UpID0+IHZvaWQpOiB2b2lkIHtcbiAgdmFyIG11bHRpUHJveGllcyA9IGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdwcm94aWVzJ10pO1xuICBpZiAobXVsdGlQcm94aWVzKSB7XG4gICAgXy5lYWNoKG11bHRpUHJveGllcywgKHRhcmdldCwgbmFtZSkgPT4gY2FsbGJhY2soZm9yTmFtZShuYW1lKSkpO1xuICB9IGVsc2Uge1xuICAgIGNhbGxiYWNrKGZvck5hbWUoJycpKTtcbiAgfVxufVxuXG4vKipcbiAqIEFkZCBwcm94eSBtaWRkbGV3YXJlcyB0byBhIHNwZWNpZmljIHJvdXRlciBwYXRoXG5cdCogQHBhcmFtIHtSb3V0ZX0gcm91dGVyIEV4cHJlc3Mgcm91dGVyIGluc3RhbmNlLCBjb3VsZCBiZSBgYXBpLnJvdXRlcigpYFxuXHQqIEBwYXJhbSB7c3RyaW5nfSB0YXJnZXQgYSBmdWxsIGh0dHAgVVJMLCBlLmcuIGh0dHBzOi8vd3d3LWRlbW8uZm9vYmFyLmNvbVxuXHQqIEBwYXJhbSB7c3RyaW5nfSBwcm94eVBhdGggc3ViIHBhdGggdGhlIHByb3h5IG1pZGRsZXdhcmUgd2lsbCBiZSBoYW5kbGluZyBvblxuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlUHJveHkocm91dGVyOiBleHByZXNzLlJvdXRlciwgdGFyZ2V0OiBzdHJpbmcsIHByb3h5UGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGlmIChwcm94eVBhdGggPT0gbnVsbClcbiAgICBwcm94eVBhdGggPSAnLyc7XG4gIGlmICghcHJveHlQYXRoLnN0YXJ0c1dpdGgoJy8nKSlcbiAgICBwcm94eVBhdGggPSAnLycgKyBwcm94eVBhdGg7XG4gIHRhcmdldCA9IF8udHJpbUVuZCh0YXJnZXQsICcvJyk7XG4gIHZhciBwcm94eU5hbWUgPSBfLnRyaW1TdGFydChwcm94eVBhdGgsICcvJyk7XG5cbiAgcm91dGVyLnVzZShwcm94eVBhdGgsIGFwaS5jb3JzKCkpO1xuICByb3V0ZXIudXNlKHByb3h5UGF0aCwgKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UpID0+IHtcbiAgICBkb1Byb3h5KHRhcmdldCwgcmVxLCByZXMsIGZvck5hbWUocHJveHlOYW1lKSwgcHJveHlOYW1lKTtcbiAgfSk7XG4gIGxvZy5pbmZvKCdQcm94eSAlcyB0byAlcycsIHByb3h5UGF0aCwgdGFyZ2V0KTtcbn1cblxuZnVuY3Rpb24gdGVzdFJvdXRlcigpOiB2b2lkIHtcbiAgYXBpLnJvdXRlcigpLnVzZSgnL190ZXN0JywgKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UpID0+IHtcbiAgICB2YXIgcyA9ICc8cHJlPic7XG4gICAgcyArPSBKU09OLnN0cmluZ2lmeShyZXEuaGVhZGVycywgbnVsbCwgJ1xcdCcpICsgJzwvcHJlPic7XG4gICAgXy5mb3JJbihyZXEsICh2LCBrKSA9PiB7XG4gICAgICBpZiAoay5zdGFydHNXaXRoKCdfJykgfHwgXy5pc0Z1bmN0aW9uKHYpIHx8IGsgPT09ICdoZWFkZXJzJylcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgbG9nLmluZm8oayArICc6ICcgKyB2KTtcbiAgICAgICAgcyArPSAnPGI+JyArIGsgKyAnPC9iPjogJyArIHYgKyAnPGJyLz4nO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBsb2cuZXJyb3IoJ2NhbnQgcmVzb2x2ZSBwcm9wZXJ0eSAlcycsIGspO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJlcy5zZW5kKHMpO1xuICB9KTtcbn1cbiJdfQ==