"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const plink_1 = require("@wfh/plink");
// import inspector from 'inspector';
// import fs from 'fs';
const http_proxy_middleware_1 = require("http-proxy-middleware");
// inspector.open(9222, 'localhost', true);
const logTime = plink_1.logger.getLogger(__api_1.default.packageName + '.timestamp');
/**
 * Middleware for printing each response process duration time to log
 * @param req
 * @param res
 * @param next
 */
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
/**
 * This function uses http-proxy-middleware internally.
 *
 * Be aware with command line option "--verbose", once enable "verbose", this function will
 * read (pipe) remote server response body into a string buffer for any message with content-type is "text" or "json" based
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
function setupHttpProxy(proxyPath, targetUrl, opts = {}) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const { protocol, host, pathname } = new URL(targetUrl);
    const patPath = new RegExp('^' + lodash_1.default.escapeRegExp(proxyPath) + '(/|$)');
    const hpmLog = plink_1.logger.getLogger('HPM.' + proxyPath);
    const proxyMidOpt = {
        // eslint-disable-next-line max-len
        target: protocol + '//' + host,
        changeOrigin: true,
        ws: false,
        secure: false,
        cookieDomainRewrite: { '*': '' },
        pathRewrite: opts.pathRewrite ? opts.pathRewrite : (path, req) => {
            // hpmLog.warn('patPath=', patPath, 'path=', path);
            const ret = path && path.replace(patPath, lodash_1.default.trimEnd(pathname, '/') + '/');
            // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
            return ret;
        },
        logLevel: 'debug',
        logProvider: provider => hpmLog,
        proxyTimeout: opts.proxyTimeout != null ? opts.proxyTimeout : 10000,
        onProxyReq(proxyReq, req, res) {
            if (opts.deleteOrigin)
                proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
            const referer = proxyReq.getHeader('referer');
            if (referer) {
                proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
            }
            if (opts.onProxyReq) {
                opts.onProxyReq(proxyReq, req, res);
            }
            hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
            // if (api.config().devMode)
            //   hpmLog.info('on proxy request headers: ', JSON.stringify(proxyReq.getHeaders(), null, '  '));
        },
        onProxyRes(incoming, req, res) {
            var _a;
            incoming.headers['Access-Control-Allow-Origin'] = '*';
            if (__api_1.default.config().devMode) {
                hpmLog.info(`Proxy recieve ${req.url}, status: ${incoming.statusCode}\n`, JSON.stringify(incoming.headers, null, '  '));
            }
            else {
                hpmLog.info(`Proxy recieve ${req.url}, status: ${incoming.statusCode}`);
            }
            if (__api_1.default.config().devMode || ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)) {
                const ct = incoming.headers['content-type'];
                hpmLog.info(`Response ${req.url} headers:\n`, incoming.rawHeaders);
                const isText = (ct && /\b(json|text)\b/i.test(ct));
                if (isText) {
                    const bufs = [];
                    incoming.pipe(new stream_1.default.Writable({
                        write(chunk, enc, cb) {
                            bufs.push((chunk.toString()));
                            cb();
                        },
                        final(cb) {
                            hpmLog.info(`Response ${req.url} text body:\n`, bufs.join(''));
                        }
                    }));
                }
            }
            if (opts.onProxyRes) {
                opts.onProxyRes(incoming, req, res);
            }
        },
        onError(err, req, res) {
            hpmLog.warn(err);
            if (opts.onError) {
                opts.onError(err, req, res);
            }
        }
    };
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, (0, http_proxy_middleware_1.createProxyMiddleware)(proxyMidOpt));
    });
}
exports.setupHttpProxy = setupHttpProxy;
// export function proxyAndRecordResponse(proxyPath: string, targetUrl: string) {
//   setupHttpProxy(proxyPath, targetUrl, {
//     deleteOrigin: true,
//     onProxyRes(incoming, req, res) {
//       const filePath = req.url;
//       incoming.pipe();
//     }
//   });
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxvREFBNEI7QUFDNUIsa0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixzQ0FBMEM7QUFDMUMscUNBQXFDO0FBQ3JDLHVCQUF1QjtBQUN2QixpRUFBK0Y7QUFFL0YsMkNBQTJDO0FBQzNDLE1BQU0sT0FBTyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUVqRTs7Ozs7R0FLRztBQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDckYsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLGNBQWMsR0FBRyxDQUFDLFVBQVUseUJBQXlCLEdBQUcsR0FBRyxTQUFTLElBQUk7WUFDNUgsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxTQUFTLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBUyxLQUFXLEVBQUUsUUFBZ0MsRUFBRSxFQUFlO1FBQy9FLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7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O1lBQ2pCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtnQkFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2FBQzdCO1FBQ0gsQ0FBQztLQUNGLENBQUM7SUFDRixlQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUEsNkNBQUssRUFBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXpGRCx3Q0F5RkM7QUFFRCxpRkFBaUY7QUFDakYsMkNBQTJDO0FBQzNDLDBCQUEwQjtBQUMxQix1Q0FBdUM7QUFDdkMsa0NBQWtDO0FBQ2xDLHlCQUF5QjtBQUN6QixRQUFRO0FBQ1IsUUFBUTtBQUNSLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtjb25maWcsIGxvZ2dlcn0gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQgaW5zcGVjdG9yIGZyb20gJ2luc3BlY3Rvcic7XG4vLyBpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zIGFzIFByb3h5T3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcblxuLy8gaW5zcGVjdG9yLm9wZW4oOTIyMiwgJ2xvY2FsaG9zdCcsIHRydWUpO1xuY29uc3QgbG9nVGltZSA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50aW1lc3RhbXAnKTtcblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gdXNlcyBodHRwLXByb3h5LW1pZGRsZXdhcmUgaW50ZXJuYWxseS5cbiAqIFxuICogQmUgYXdhcmUgd2l0aCBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLS12ZXJib3NlXCIsIG9uY2UgZW5hYmxlIFwidmVyYm9zZVwiLCB0aGlzIGZ1bmN0aW9uIHdpbGxcbiAqIHJlYWQgKHBpcGUpIHJlbW90ZSBzZXJ2ZXIgcmVzcG9uc2UgYm9keSBpbnRvIGEgc3RyaW5nIGJ1ZmZlciBmb3IgYW55IG1lc3NhZ2Ugd2l0aCBjb250ZW50LXR5cGUgaXMgXCJ0ZXh0XCIgb3IgXCJqc29uXCIgYmFzZWRcbiAqIENyZWF0ZSBhbmQgdXNlIGFuIEhUVFAgcmVxdWVzdCBwcm94eSBmb3Igc3BlY2lmaWMgcmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0gcHJveHlQYXRoIFxuICogQHBhcmFtIHRhcmdldFVybCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZyxcbiAgb3B0czoge1xuICAgIC8qKiBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwodGFyZ2V0VXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0hQTS4nICsgcHJveHlQYXRoKTtcbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyA9IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIHRhcmdldDogcHJvdG9jb2wgKyAnLy8nICsgaG9zdCxcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgcGF0aFJld3JpdGU6IG9wdHMucGF0aFJld3JpdGUgPyAgb3B0cy5wYXRoUmV3cml0ZSA6IChwYXRoLCByZXEpID0+IHtcbiAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgXy50cmltRW5kKHBhdGhuYW1lLCAnLycpICsgJy8nKTtcbiAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IG9wdHMucHJveHlUaW1lb3V0ICE9IG51bGwgPyBvcHRzLnByb3h5VGltZW91dCA6IDEwMDAwLFxuICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzKSB7XG4gICAgICBpZiAob3B0cy5kZWxldGVPcmlnaW4pXG4gICAgICAgIHByb3h5UmVxLnJlbW92ZUhlYWRlcignT3JpZ2luJyk7IC8vIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXJcbiAgICAgIGNvbnN0IHJlZmVyZXIgPSBwcm94eVJlcS5nZXRIZWFkZXIoJ3JlZmVyZXInKTtcbiAgICAgIGlmIChyZWZlcmVyKSB7XG4gICAgICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7bmV3IFVSTChyZWZlcmVyIGFzIHN0cmluZykucGF0aG5hbWV9YCk7XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVxKSB7XG4gICAgICAgIG9wdHMub25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMpO1xuICAgICAgfVxuICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kfSwgJHtKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgICAgLy8gaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKVxuICAgICAgLy8gICBocG1Mb2cuaW5mbygnb24gcHJveHkgcmVxdWVzdCBoZWFkZXJzOiAnLCBKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpKTtcbiAgICB9LFxuICAgIG9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgcmVzKSB7XG4gICAgICBpbmNvbWluZy5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSA9ICcqJztcbiAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS51cmx9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9XFxuYCxcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShpbmNvbWluZy5oZWFkZXJzLCBudWxsLCAnICAnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS51cmx9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9YCk7XG4gICAgICB9XG4gICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUgfHwgY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZSkge1xuXG4gICAgICAgIGNvbnN0IGN0ID0gaW5jb21pbmcuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmx9IGhlYWRlcnM6XFxuYCwgaW5jb21pbmcucmF3SGVhZGVycyk7XG4gICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgIGlmIChpc1RleHQpIHtcbiAgICAgICAgICBjb25zdCBidWZzID0gW10gYXMgc3RyaW5nW107XG4gICAgICAgICAgaW5jb21pbmcucGlwZShuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIGVuYywgY2IpIHtcbiAgICAgICAgICAgICAgYnVmcy5wdXNoKChjaHVuay50b1N0cmluZygpKSk7XG4gICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmluYWwoY2IpIHtcbiAgICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybH0gdGV4dCBib2R5OlxcbmAsIGJ1ZnMuam9pbignJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG9wdHMub25Qcm94eVJlcykge1xuICAgICAgICBvcHRzLm9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgcmVzKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uRXJyb3IoZXJyLCByZXEsIHJlcykge1xuICAgICAgaHBtTG9nLndhcm4oZXJyKTtcbiAgICAgIGlmIChvcHRzLm9uRXJyb3IpIHtcbiAgICAgICAgb3B0cy5vbkVycm9yKGVyciwgcmVxLCByZXMpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICBhcHAudXNlKHByb3h5UGF0aCwgcHJveHkocHJveHlNaWRPcHQpKTtcbiAgfSk7XG59XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBwcm94eUFuZFJlY29yZFJlc3BvbnNlKHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZykge1xuLy8gICBzZXR1cEh0dHBQcm94eShwcm94eVBhdGgsIHRhcmdldFVybCwge1xuLy8gICAgIGRlbGV0ZU9yaWdpbjogdHJ1ZSxcbi8vICAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcykge1xuLy8gICAgICAgY29uc3QgZmlsZVBhdGggPSByZXEudXJsO1xuLy8gICAgICAgaW5jb21pbmcucGlwZSgpO1xuLy8gICAgIH1cbi8vICAgfSk7XG4vLyB9XG4iXX0=