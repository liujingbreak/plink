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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBd0I7QUFDeEIsMENBQTRCO0FBQzVCLCtDQUFpQztBQUVqQyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1QyxvRUFBc0M7QUFDdEMsMkRBQStEO0FBQy9ELHlEQUF1QztBQUV2QyxTQUFnQixRQUFRO0lBQ3RCLHFDQUFxQztJQUNyQyxVQUFVLEVBQUUsQ0FBQztJQUNiLElBQUksWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLElBQUksWUFBWSxFQUFFO1FBQ2hCLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUM5RTtTQUFNO1FBQ0wsSUFBSSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUMzRCxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDbkIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxlQUFHLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQzVFLE9BQU87U0FDUjtRQUNELFFBQVEsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ3JDO0FBQ0gsQ0FBQztBQWRELDRCQWNDO0FBRUQsTUFBYSxhQUFjLFNBQVEsd0NB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Q0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVM7Z0JBQ3pELE9BQU87WUFDVCxJQUFJO2dCQUNGLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUM7YUFDekM7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixHQUFHLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG52YXIgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuaW1wb3J0IGRvUHJveHkgZnJvbSAnLi9wcm94eS1oYW5kbGVyJztcbmltcG9ydCB7UHJveHlJbnN0YW5jZUZvckJyb3dzZXJ9IGZyb20gJy4uL2lzb20vcHJveHktaW5zdGFuY2UnO1xuZXhwb3J0ICogZnJvbSAnLi4vaXNvbS9wcm94eS1pbnN0YW5jZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgLy8gYXBpLnJvdXRlcigpLnVzZSgnLycsIGFwaS5jb3JzKCkpO1xuICB0ZXN0Um91dGVyKCk7XG4gIHZhciBtdWx0aVByb3hpZXMgPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAncHJveGllcyddKTtcbiAgaWYgKG11bHRpUHJveGllcykge1xuICAgIF8uZWFjaChtdWx0aVByb3hpZXMsICh0YXJnZXQsIG5hbWUpID0+IHVzZVByb3h5KGFwaS5yb3V0ZXIoKSwgdGFyZ2V0LCBuYW1lKSk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHByb3h5VG8gPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLnByb3h5VG8nKTtcbiAgICBpZiAocHJveHlUbyA9PSBudWxsKSB7XG4gICAgICBsb2cud2FybignTm8gcHJveHkgY29uZmlndXJhdGlvbiBcIiVzXCIgZm91bmQnLCBhcGkucGFja2FnZU5hbWUgKyAnLnByb3hpZXMnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdXNlUHJveHkoYXBpLnJvdXRlcigpLCBwcm94eVRvLCAnJyk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFByb3h5SW5zdGFuY2UgZXh0ZW5kcyBQcm94eUluc3RhbmNlRm9yQnJvd3NlciB7XG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgb3B0aW9uczoge1trOiBzdHJpbmddOiBhbnl9ID0ge30pIHtcbiAgICBzdXBlcihuYW1lLCBvcHRpb25zKTtcbiAgfVxuXG4gIHVzZVByb3h5KHJvdXRlcjogYW55LCB0YXJnZXQ6IHN0cmluZykge1xuICAgIHVzZVByb3h5KHJvdXRlciwgdGFyZ2V0LCB0aGlzLm5hbWUpO1xuICB9XG59XG5cbnZhciBwcm94eUluc3RhbmNlczoge1trOiBzdHJpbmddOiBQcm94eUluc3RhbmNlfSA9IHt9O1xuZXhwb3J0IGZ1bmN0aW9uIGZvck5hbWUobmFtZTogc3RyaW5nLCBvcHRzPzoge1trOiBzdHJpbmddOiBhbnl9KTogUHJveHlJbnN0YW5jZSB7XG4gIGlmIChwcm94eUluc3RhbmNlc1tuYW1lXSlcbiAgICByZXR1cm4gcHJveHlJbnN0YW5jZXNbbmFtZV07XG4gIHZhciBwID0gbmV3IFByb3h5SW5zdGFuY2UobmFtZSwgb3B0cyk7XG4gIHByb3h5SW5zdGFuY2VzW25hbWVdID0gcDtcbiAgcmV0dXJuIHA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrOiAocHJveHlJbnN0YW5jZTogUHJveHlJbnN0YW5jZSkgPT4gdm9pZCk6IHZvaWQge1xuICB2YXIgbXVsdGlQcm94aWVzID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3Byb3hpZXMnXSk7XG4gIGlmIChtdWx0aVByb3hpZXMpIHtcbiAgICBfLmVhY2gobXVsdGlQcm94aWVzLCAodGFyZ2V0LCBuYW1lKSA9PiBjYWxsYmFjayhmb3JOYW1lKG5hbWUpKSk7XG4gIH0gZWxzZSB7XG4gICAgY2FsbGJhY2soZm9yTmFtZSgnJykpO1xuICB9XG59XG5cbi8qKlxuICogQWRkIHByb3h5IG1pZGRsZXdhcmVzIHRvIGEgc3BlY2lmaWMgcm91dGVyIHBhdGhcblx0KiBAcGFyYW0ge1JvdXRlfSByb3V0ZXIgRXhwcmVzcyByb3V0ZXIgaW5zdGFuY2UsIGNvdWxkIGJlIGBhcGkucm91dGVyKClgXG5cdCogQHBhcmFtIHtzdHJpbmd9IHRhcmdldCBhIGZ1bGwgaHR0cCBVUkwsIGUuZy4gaHR0cHM6Ly93d3ctZGVtby5mb29iYXIuY29tXG5cdCogQHBhcmFtIHtzdHJpbmd9IHByb3h5UGF0aCBzdWIgcGF0aCB0aGUgcHJveHkgbWlkZGxld2FyZSB3aWxsIGJlIGhhbmRsaW5nIG9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VQcm94eShyb3V0ZXI6IGV4cHJlc3MuUm91dGVyLCB0YXJnZXQ6IHN0cmluZywgcHJveHlQYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKHByb3h5UGF0aCA9PSBudWxsKVxuICAgIHByb3h5UGF0aCA9ICcvJztcbiAgaWYgKCFwcm94eVBhdGguc3RhcnRzV2l0aCgnLycpKVxuICAgIHByb3h5UGF0aCA9ICcvJyArIHByb3h5UGF0aDtcbiAgdGFyZ2V0ID0gXy50cmltRW5kKHRhcmdldCwgJy8nKTtcbiAgdmFyIHByb3h5TmFtZSA9IF8udHJpbVN0YXJ0KHByb3h5UGF0aCwgJy8nKTtcblxuICByb3V0ZXIudXNlKHByb3h5UGF0aCwgYXBpLmNvcnMoKSk7XG4gIHJvdXRlci51c2UocHJveHlQYXRoLCAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuICAgIGRvUHJveHkodGFyZ2V0LCByZXEsIHJlcywgZm9yTmFtZShwcm94eU5hbWUpLCBwcm94eU5hbWUpO1xuICB9KTtcbiAgbG9nLmluZm8oJ1Byb3h5ICVzIHRvICVzJywgcHJveHlQYXRoLCB0YXJnZXQpO1xufVxuXG5mdW5jdGlvbiB0ZXN0Um91dGVyKCk6IHZvaWQge1xuICBhcGkucm91dGVyKCkudXNlKCcvX3Rlc3QnLCAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuICAgIHZhciBzID0gJzxwcmU+JztcbiAgICBzICs9IEpTT04uc3RyaW5naWZ5KHJlcS5oZWFkZXJzLCBudWxsLCAnXFx0JykgKyAnPC9wcmU+JztcbiAgICBfLmZvckluKHJlcSwgKHYsIGspID0+IHtcbiAgICAgIGlmIChrLnN0YXJ0c1dpdGgoJ18nKSB8fCBfLmlzRnVuY3Rpb24odikgfHwgayA9PT0gJ2hlYWRlcnMnKVxuICAgICAgICByZXR1cm47XG4gICAgICB0cnkge1xuICAgICAgICBsb2cuaW5mbyhrICsgJzogJyArIHYpO1xuICAgICAgICBzICs9ICc8Yj4nICsgayArICc8L2I+OiAnICsgdiArICc8YnIvPic7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGxvZy5lcnJvcignY2FudCByZXNvbHZlIHByb3BlcnR5ICVzJywgayk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmVzLnNlbmQocyk7XG4gIH0pO1xufVxuIl19