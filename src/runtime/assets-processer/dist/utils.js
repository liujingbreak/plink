"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const log4js_1 = require("log4js");
const __api_1 = tslib_1.__importDefault(require("__api"));
const Url = tslib_1.__importStar(require("url"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const http_proxy_middleware_1 = tslib_1.__importDefault(require("http-proxy-middleware"));
const hpmLog = log4js_1.getLogger(__api_1.default.packageName + '.commandProxy');
const logTime = log4js_1.getLogger(__api_1.default.packageName + '.timestamp');
function createResponseTimestamp(req, res, next) {
    const date = new Date();
    const startTime = date.getTime();
    const end = res.end;
    function print() {
        const now = new Date().getTime();
        logTime.info(`request: ${req.method} ${req.originalUrl} | status: ${res.statusCode}, [response duration: ${now - startTime}ms` +
            `] (since ${date.toLocaleTimeString()} ${startTime}) [${req.header('user-agent')}]`);
    }
    res.end = function (chunk, encoding, cb) {
        const argv = Array.prototype.slice.call(arguments, 0);
        const lastArg = arguments[arguments.length - 1];
        if (typeof lastArg === 'function') {
            const originCb = arguments[arguments.length - 1];
            argv[argv.length - 1] = () => {
                originCb();
                print();
            };
        }
        else if (argv.length === 0) {
            argv.push(null, print);
        }
        else if (argv.length === 1) {
            argv.push(print);
        }
        const ret = end.apply(res, argv);
        return ret;
    };
    next();
}
exports.createResponseTimestamp = createResponseTimestamp;
function commandProxy(proxyPath, targetUrl) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const { protocol, host, pathname } = Url.parse(targetUrl, false, true);
    const patPath = new RegExp(`^${proxyPath}/`);
    // http proxy middleware must be used without any body-parser middleware, so `api.expressAppSet` can put it above other
    // middlewares
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, http_proxy_middleware_1.default({
            // tslint:disable-next-line: max-line-length
            target: protocol + '//' + host,
            changeOrigin: true,
            ws: false,
            cookieDomainRewrite: { '*': '' },
            pathRewrite: (path, req) => {
                const ret = path.replace(patPath, pathname == null ? '' : pathname);
                hpmLog.info(`proxy to path: ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
                return ret;
            },
            logLevel: 'debug',
            logProvider: provider => hpmLog,
            proxyTimeout: 15000
            // onProxyReq(proxyReq, req, res) {
            //   const referer = proxyReq.getHeader('referer');
            //   if (referer) {
            //     proxyReq.setHeader('referer', `${protocol}//${host}${Url.parse(referer as string).pathname}`);
            //   }
            // },
            // onProxyRes(incoming) {
            //   log.info('Proxy recieve ' + incoming.statusCode + '\n');
            // }
        }));
    });
}
exports.commandProxy = commandProxy;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL3V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUFpQztBQUNqQywwREFBd0I7QUFDeEIsaURBQTJCO0FBQzNCLDREQUF1QjtBQUN2QiwwRkFBMEM7QUFDMUMsTUFBTSxNQUFNLEdBQUcsa0JBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGVBQWUsQ0FBQyxDQUFDO0FBRTVELE1BQU0sT0FBTyxHQUFHLGtCQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUUxRCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtRQUMvRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMs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cm9jZXNzZXIvZGlzdC91dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHByb3h5IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5jb25zdCBocG1Mb2cgPSBnZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jb21tYW5kUHJveHknKTtcblxuY29uc3QgbG9nVGltZSA9IGdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRpbWVzdGFtcCcpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IGRhdGUuZ2V0VGltZSgpO1xuXG4gIGNvbnN0IGVuZCA9IHJlcy5lbmQ7XG5cbiAgZnVuY3Rpb24gcHJpbnQoKSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgbG9nVGltZS5pbmZvKGByZXF1ZXN0OiAke3JlcS5tZXRob2R9ICR7cmVxLm9yaWdpbmFsVXJsfSB8IHN0YXR1czogJHtyZXMuc3RhdHVzQ29kZX0sIFtyZXNwb25zZSBkdXJhdGlvbjogJHtub3cgLSBzdGFydFRpbWV9bXNgICtcbiAgICAgIGBdIChzaW5jZSAke2RhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9ICR7c3RhcnRUaW1lfSkgWyR7cmVxLmhlYWRlcigndXNlci1hZ2VudCcpfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBjb21tYW5kUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nKSB7XG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG4gIGNvbnN0IHtwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWV9ID0gVXJsLnBhcnNlKHRhcmdldFVybCwgZmFsc2UsIHRydWUpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKGBeJHtwcm94eVBhdGh9L2ApO1xuXG4gIC8vIGh0dHAgcHJveHkgbWlkZGxld2FyZSBtdXN0IGJlIHVzZWQgd2l0aG91dCBhbnkgYm9keS1wYXJzZXIgbWlkZGxld2FyZSwgc28gYGFwaS5leHByZXNzQXBwU2V0YCBjYW4gcHV0IGl0IGFib3ZlIG90aGVyXG4gIC8vIG1pZGRsZXdhcmVzXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIHByb3h5KHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB3czogZmFsc2UsXG4gICAgICBjb29raWVEb21haW5SZXdyaXRlOiB7JyonOiAnJ30sXG4gICAgICBwYXRoUmV3cml0ZTogKHBhdGgsIHJlcSkgPT4ge1xuICAgICAgICBjb25zdCByZXQgPSBwYXRoLnJlcGxhY2UocGF0UGF0aCwgcGF0aG5hbWUgPT0gbnVsbCA/ICcnIDogcGF0aG5hbWUgKTtcbiAgICAgICAgaHBtTG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgICBsb2dQcm92aWRlcjogcHJvdmlkZXIgPT4gaHBtTG9nLFxuICAgICAgcHJveHlUaW1lb3V0OiAxNTAwMFxuICAgICAgLy8gb25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMpIHtcbiAgICAgIC8vICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgLy8gICBpZiAocmVmZXJlcikge1xuICAgICAgLy8gICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7VXJsLnBhcnNlKHJlZmVyZXIgYXMgc3RyaW5nKS5wYXRobmFtZX1gKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfSxcbiAgICAgIC8vIG9uUHJveHlSZXMoaW5jb21pbmcpIHtcbiAgICAgIC8vICAgbG9nLmluZm8oJ1Byb3h5IHJlY2lldmUgJyArIGluY29taW5nLnN0YXR1c0NvZGUgKyAnXFxuJyk7XG4gICAgICAvLyB9XG4gICAgfSkpO1xuICB9KTtcbn1cblxuIl19
