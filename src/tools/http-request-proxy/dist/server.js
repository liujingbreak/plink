"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const __api_1 = tslib_1.__importDefault(require("__api"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
var log = log4js.getLogger(__api_1.default.packageName);
const proxy_handler_1 = tslib_1.__importDefault(require("./proxy-handler"));
const proxy_instance_1 = require("../isom/proxy-instance");
tslib_1.__exportStar(require("../isom/proxy-instance"), exports);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L3RzL3NlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwwREFBd0I7QUFDeEIsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUVqQyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1Qyw0RUFBc0M7QUFDdEMsMkRBQStEO0FBQy9ELGlFQUF1QztBQUV2QyxTQUFnQixRQUFRO0lBQ3ZCLHFDQUFxQztJQUNyQyxVQUFVLEVBQUUsQ0FBQztJQUNiLElBQUksWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLElBQUksWUFBWSxFQUFFO1FBQ2pCLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztLQUM3RTtTQUFNO1FBQ04sSUFBSSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUMzRCxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7WUFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxlQUFHLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQzVFLE9BQU87U0FDUDtRQUNELFFBQVEsQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQ3BDO0FBQ0YsQ0FBQztBQWRELDRCQWNDO0FBRUQsTUFBYSxhQUFjLFNBQVEsd0NBQXVCO0lBQ3pELFlBQVksSUFBWSxF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QUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLFNBQVM7Z0JBQzFELE9BQU87WUFDUixJQUFJO2dCQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDdkIsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUM7YUFDeEM7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3pDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHIvaHR0cC1yZXF1ZXN0LXByb3h5L2Rpc3Qvc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIGV4cHJlc3MgZnJvbSAnZXhwcmVzcyc7XG52YXIgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuaW1wb3J0IGRvUHJveHkgZnJvbSAnLi9wcm94eS1oYW5kbGVyJztcbmltcG9ydCB7UHJveHlJbnN0YW5jZUZvckJyb3dzZXJ9IGZyb20gJy4uL2lzb20vcHJveHktaW5zdGFuY2UnO1xuZXhwb3J0ICogZnJvbSAnLi4vaXNvbS9wcm94eS1pbnN0YW5jZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcblx0Ly8gYXBpLnJvdXRlcigpLnVzZSgnLycsIGFwaS5jb3JzKCkpO1xuXHR0ZXN0Um91dGVyKCk7XG5cdHZhciBtdWx0aVByb3hpZXMgPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAncHJveGllcyddKTtcblx0aWYgKG11bHRpUHJveGllcykge1xuXHRcdF8uZWFjaChtdWx0aVByb3hpZXMsICh0YXJnZXQsIG5hbWUpID0+IHVzZVByb3h5KGFwaS5yb3V0ZXIoKSwgdGFyZ2V0LCBuYW1lKSk7XG5cdH0gZWxzZSB7XG5cdFx0dmFyIHByb3h5VG8gPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLnByb3h5VG8nKTtcblx0XHRpZiAocHJveHlUbyA9PSBudWxsKSB7XG5cdFx0XHRsb2cud2FybignTm8gcHJveHkgY29uZmlndXJhdGlvbiBcIiVzXCIgZm91bmQnLCBhcGkucGFja2FnZU5hbWUgKyAnLnByb3hpZXMnKTtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXNlUHJveHkoYXBpLnJvdXRlcigpLCBwcm94eVRvLCAnJyk7XG5cdH1cbn1cblxuZXhwb3J0IGNsYXNzIFByb3h5SW5zdGFuY2UgZXh0ZW5kcyBQcm94eUluc3RhbmNlRm9yQnJvd3NlciB7XG5cdGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgb3B0aW9uczoge1trOiBzdHJpbmddOiBhbnl9ID0ge30pIHtcblx0XHRzdXBlcihuYW1lLCBvcHRpb25zKTtcblx0fVxuXG5cdHVzZVByb3h5KHJvdXRlcjogYW55LCB0YXJnZXQ6IHN0cmluZykge1xuXHRcdHVzZVByb3h5KHJvdXRlciwgdGFyZ2V0LCB0aGlzLm5hbWUpO1xuXHR9XG59XG5cbnZhciBwcm94eUluc3RhbmNlczoge1trOiBzdHJpbmddOiBQcm94eUluc3RhbmNlfSA9IHt9O1xuZXhwb3J0IGZ1bmN0aW9uIGZvck5hbWUobmFtZTogc3RyaW5nLCBvcHRzPzoge1trOiBzdHJpbmddOiBhbnl9KTogUHJveHlJbnN0YW5jZSB7XG5cdGlmIChwcm94eUluc3RhbmNlc1tuYW1lXSlcblx0XHRyZXR1cm4gcHJveHlJbnN0YW5jZXNbbmFtZV07XG5cdHZhciBwID0gbmV3IFByb3h5SW5zdGFuY2UobmFtZSwgb3B0cyk7XG5cdHByb3h5SW5zdGFuY2VzW25hbWVdID0gcDtcblx0cmV0dXJuIHA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBmb3JFYWNoKGNhbGxiYWNrOiAocHJveHlJbnN0YW5jZTogUHJveHlJbnN0YW5jZSkgPT4gdm9pZCk6IHZvaWQge1xuXHR2YXIgbXVsdGlQcm94aWVzID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3Byb3hpZXMnXSk7XG5cdGlmIChtdWx0aVByb3hpZXMpIHtcblx0XHRfLmVhY2gobXVsdGlQcm94aWVzLCAodGFyZ2V0LCBuYW1lKSA9PiBjYWxsYmFjayhmb3JOYW1lKG5hbWUpKSk7XG5cdH0gZWxzZSB7XG5cdFx0Y2FsbGJhY2soZm9yTmFtZSgnJykpO1xuXHR9XG59XG5cbi8qKlxuICogQWRkIHByb3h5IG1pZGRsZXdhcmVzIHRvIGEgc3BlY2lmaWMgcm91dGVyIHBhdGhcblx0KiBAcGFyYW0ge1JvdXRlfSByb3V0ZXIgRXhwcmVzcyByb3V0ZXIgaW5zdGFuY2UsIGNvdWxkIGJlIGBhcGkucm91dGVyKClgXG5cdCogQHBhcmFtIHtzdHJpbmd9IHRhcmdldCBhIGZ1bGwgaHR0cCBVUkwsIGUuZy4gaHR0cHM6Ly93d3ctZGVtby5mb29iYXIuY29tXG5cdCogQHBhcmFtIHtzdHJpbmd9IHByb3h5UGF0aCBzdWIgcGF0aCB0aGUgcHJveHkgbWlkZGxld2FyZSB3aWxsIGJlIGhhbmRsaW5nIG9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1c2VQcm94eShyb3V0ZXI6IGV4cHJlc3MuUm91dGVyLCB0YXJnZXQ6IHN0cmluZywgcHJveHlQYXRoOiBzdHJpbmcpOiB2b2lkIHtcblx0aWYgKHByb3h5UGF0aCA9PSBudWxsKVxuXHRcdHByb3h5UGF0aCA9ICcvJztcblx0aWYgKCFwcm94eVBhdGguc3RhcnRzV2l0aCgnLycpKVxuXHRcdHByb3h5UGF0aCA9ICcvJyArIHByb3h5UGF0aDtcblx0dGFyZ2V0ID0gXy50cmltRW5kKHRhcmdldCwgJy8nKTtcblx0dmFyIHByb3h5TmFtZSA9IF8udHJpbVN0YXJ0KHByb3h5UGF0aCwgJy8nKTtcblxuXHRyb3V0ZXIudXNlKHByb3h5UGF0aCwgYXBpLmNvcnMoKSk7XG5cdHJvdXRlci51c2UocHJveHlQYXRoLCAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuXHRcdGRvUHJveHkodGFyZ2V0LCByZXEsIHJlcywgZm9yTmFtZShwcm94eU5hbWUpLCBwcm94eU5hbWUpO1xuXHR9KTtcblx0bG9nLmluZm8oJ1Byb3h5ICVzIHRvICVzJywgcHJveHlQYXRoLCB0YXJnZXQpO1xufVxuXG5mdW5jdGlvbiB0ZXN0Um91dGVyKCk6IHZvaWQge1xuXHRhcGkucm91dGVyKCkudXNlKCcvX3Rlc3QnLCAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuXHRcdHZhciBzID0gJzxwcmU+Jztcblx0XHRzICs9IEpTT04uc3RyaW5naWZ5KHJlcS5oZWFkZXJzLCBudWxsLCAnXFx0JykgKyAnPC9wcmU+Jztcblx0XHRfLmZvckluKHJlcSwgKHYsIGspID0+IHtcblx0XHRcdGlmIChrLnN0YXJ0c1dpdGgoJ18nKSB8fCBfLmlzRnVuY3Rpb24odikgfHwgayA9PT0gJ2hlYWRlcnMnKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsb2cuaW5mbyhrICsgJzogJyArIHYpO1xuXHRcdFx0XHRzICs9ICc8Yj4nICsgayArICc8L2I+OiAnICsgdiArICc8YnIvPic7XG5cdFx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHRcdGxvZy5lcnJvcignY2FudCByZXNvbHZlIHByb3BlcnR5ICVzJywgayk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmVzLnNlbmQocyk7XG5cdH0pO1xufVxuIl19
