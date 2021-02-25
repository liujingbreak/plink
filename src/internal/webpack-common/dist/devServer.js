"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = __importDefault(require("log4js"));
// import {getLanIPv4} from '@wfh/plink/wfh/dist/utils/network-util';
const log = log4js_1.default.getLogger('config-webpack');
/**
 * Avoid process exit when encountering Error like ERR_HTTP_HEADERS_SENT
 * Allow CORS
 * @param webpackConfig
 */
function default_1(webpackConfig) {
    if (!webpackConfig.devServer) {
        return;
    }
    const devServer = webpackConfig.devServer;
    const origin = webpackConfig.devServer.before;
    devServer.host = '0.0.0.0';
    devServer.before = function before(app) {
        // To elimiate HMR web socket issue:
        //   Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
        // at ServerResponse.setHeader (_http_outgoing.js:470:11)
        // at Array.write (/Users/liujing/bk/credit-appl/node_modules/finalhandler/index.js:285:9)
        // at listener (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:169:15)
        // at onFinish (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:100:5)
        // at callback (/Users/liujing/bk/credit-appl/node_modules/ee-first/index.js:55:10)
        app.use((req, res, next) => {
            const old = res.setHeader;
            // const oldEnd = res.end;
            res.setHeader = function () {
                try {
                    old.apply(res, arguments);
                }
                catch (e) {
                    if (e.code === 'ERR_HTTP_HEADERS_SENT') {
                        log.warn('Cannot set headers after they are sent to the client');
                    }
                    else {
                        throw e;
                    }
                }
            };
            next();
        });
        if (origin)
            origin.apply(this, arguments);
    };
    devServer.compress = true;
    if (devServer.headers == null)
        devServer.headers = {};
    // CORS enablement
    devServer.headers['Access-Control-Allow-Origin'] = '*';
    devServer.headers['Access-Control-Allow-Headers'] = '*';
}
exports.default = default_1;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2U2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGV2U2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBRUEsb0RBQTRCO0FBQzVCLHFFQUFxRTtBQUNyRSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRS9DOzs7O0dBSUc7QUFDSCxtQkFBd0IsYUFBeUQ7SUFDL0UsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUU7UUFDNUIsT0FBTztLQUNSO0lBQ0QsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztJQUMxQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztJQUM5QyxTQUFTLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztJQUUzQixTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsTUFBTSxDQUFDLEdBQWdCO1FBQ2pELG9DQUFvQztRQUNwQyx3RkFBd0Y7UUFDeEYseURBQXlEO1FBQ3pELDBGQUEwRjtRQUMxRix1RkFBdUY7UUFDdkYsc0ZBQXNGO1FBQ3RGLG1GQUFtRjtRQUVuRixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN6QixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQzFCLDBCQUEwQjtZQUMxQixHQUFHLENBQUMsU0FBUyxHQUFHO2dCQUNkLElBQUk7b0JBQ0YsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7aUJBQzNCO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyx1QkFBdUIsRUFBRTt3QkFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO3FCQUNsRTt5QkFBTTt3QkFDTCxNQUFNLENBQUMsQ0FBQztxQkFDVDtpQkFDRjtZQUNILENBQUMsQ0FBQztZQUNGLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE1BQU07WUFDUixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUM7SUFDRixTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUMxQixJQUFJLFNBQVMsQ0FBQyxPQUFPLElBQUksSUFBSTtRQUMzQixTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUN6QixrQkFBa0I7SUFDbEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUN2RCxTQUFTLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLEdBQUcsR0FBRyxDQUFDO0FBRTFELENBQUM7QUEzQ0QsNEJBMkNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgd3AgZnJvbSAnd2VicGFjayc7XG5pbXBvcnQge0FwcGxpY2F0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignY29uZmlnLXdlYnBhY2snKTtcblxuLyoqXG4gKiBBdm9pZCBwcm9jZXNzIGV4aXQgd2hlbiBlbmNvdW50ZXJpbmcgRXJyb3IgbGlrZSBFUlJfSFRUUF9IRUFERVJTX1NFTlRcbiAqIEFsbG93IENPUlNcbiAqIEBwYXJhbSB3ZWJwYWNrQ29uZmlnIFxuICovXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbih3ZWJwYWNrQ29uZmlnOiB7ZGV2U2VydmVyOiB3cC5Db25maWd1cmF0aW9uWydkZXZTZXJ2ZXInXX0pIHtcbiAgaWYgKCF3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcikge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBkZXZTZXJ2ZXIgPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlcjtcbiAgY29uc3Qgb3JpZ2luID0gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIuYmVmb3JlO1xuICBkZXZTZXJ2ZXIuaG9zdCA9ICcwLjAuMC4wJztcblxuICBkZXZTZXJ2ZXIuYmVmb3JlID0gZnVuY3Rpb24gYmVmb3JlKGFwcDogQXBwbGljYXRpb24pIHtcbiAgICAvLyBUbyBlbGltaWF0ZSBITVIgd2ViIHNvY2tldCBpc3N1ZTpcbiAgICAvLyAgIEVycm9yIFtFUlJfSFRUUF9IRUFERVJTX1NFTlRdOiBDYW5ub3Qgc2V0IGhlYWRlcnMgYWZ0ZXIgdGhleSBhcmUgc2VudCB0byB0aGUgY2xpZW50XG4gICAgLy8gYXQgU2VydmVyUmVzcG9uc2Uuc2V0SGVhZGVyIChfaHR0cF9vdXRnb2luZy5qczo0NzA6MTEpXG4gICAgLy8gYXQgQXJyYXkud3JpdGUgKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9maW5hbGhhbmRsZXIvaW5kZXguanM6Mjg1OjkpXG4gICAgLy8gYXQgbGlzdGVuZXIgKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9vbi1maW5pc2hlZC9pbmRleC5qczoxNjk6MTUpXG4gICAgLy8gYXQgb25GaW5pc2ggKC9Vc2Vycy9saXVqaW5nL2JrL2NyZWRpdC1hcHBsL25vZGVfbW9kdWxlcy9vbi1maW5pc2hlZC9pbmRleC5qczoxMDA6NSlcbiAgICAvLyBhdCBjYWxsYmFjayAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL2VlLWZpcnN0L2luZGV4LmpzOjU1OjEwKVxuXG4gICAgYXBwLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgIGNvbnN0IG9sZCA9IHJlcy5zZXRIZWFkZXI7XG4gICAgICAvLyBjb25zdCBvbGRFbmQgPSByZXMuZW5kO1xuICAgICAgcmVzLnNldEhlYWRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIG9sZC5hcHBseShyZXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBpZiAoZS5jb2RlID09PSAnRVJSX0hUVFBfSEVBREVSU19TRU5UJykge1xuICAgICAgICAgICAgbG9nLndhcm4oJ0Nhbm5vdCBzZXQgaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnQnKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBuZXh0KCk7XG4gICAgfSk7XG4gICAgaWYgKG9yaWdpbilcbiAgICAgIG9yaWdpbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9O1xuICBkZXZTZXJ2ZXIuY29tcHJlc3MgPSB0cnVlO1xuICBpZiAoZGV2U2VydmVyLmhlYWRlcnMgPT0gbnVsbClcbiAgICBkZXZTZXJ2ZXIuaGVhZGVycyA9IHt9O1xuICAvLyBDT1JTIGVuYWJsZW1lbnRcbiAgZGV2U2VydmVyLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICBkZXZTZXJ2ZXIuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyddID0gJyonO1xuXG59XG4iXX0=