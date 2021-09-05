"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV2U2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGV2U2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsc0NBQW9DO0FBQ3BDLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQzs7OztHQUlHO0FBQ0gsbUJBQXdCLGFBQXlEO0lBQy9FLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFO1FBQzVCLE9BQU87S0FDUjtJQUNELE1BQU0sU0FBUyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUM7SUFDMUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7SUFDOUMsU0FBUyxDQUFDLElBQUksR0FBRyxTQUFTLENBQUM7SUFFM0IsU0FBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLE1BQU0sQ0FBQyxHQUFnQjtRQUNqRCxvQ0FBb0M7UUFDcEMsd0ZBQXdGO1FBQ3hGLHlEQUF5RDtRQUN6RCwwRkFBMEY7UUFDMUYsdUZBQXVGO1FBQ3ZGLHNGQUFzRjtRQUN0RixtRkFBbUY7UUFFbkYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUU7WUFDekIsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUMxQiwwQkFBMEI7WUFDMUIsR0FBRyxDQUFDLFNBQVMsR0FBRztnQkFDZCxJQUFJO29CQUNGLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO2lCQUMzQjtnQkFBQyxPQUFPLENBQUMsRUFBRTtvQkFDVixJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssdUJBQXVCLEVBQUU7d0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0RBQXNELENBQUMsQ0FBQztxQkFDbEU7eUJBQU07d0JBQ0wsTUFBTSxDQUFDLENBQUM7cUJBQ1Q7aUJBQ0Y7WUFDSCxDQUFDLENBQUM7WUFDRixJQUFJLEVBQUUsQ0FBQztRQUNULENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxNQUFNO1lBQ1IsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDbEMsQ0FBQyxDQUFDO0lBQ0YsU0FBUyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDMUIsSUFBSSxTQUFTLENBQUMsT0FBTyxJQUFJLElBQUk7UUFDM0IsU0FBUyxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7SUFDekIsa0JBQWtCO0lBQ2xCLFNBQVMsQ0FBQyxPQUFPLENBQUMsNkJBQTZCLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDdkQsU0FBUyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUUxRCxDQUFDO0FBM0NELDRCQTJDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHdwIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHtBcHBsaWNhdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG4vKipcbiAqIEF2b2lkIHByb2Nlc3MgZXhpdCB3aGVuIGVuY291bnRlcmluZyBFcnJvciBsaWtlIEVSUl9IVFRQX0hFQURFUlNfU0VOVFxuICogQWxsb3cgQ09SU1xuICogQHBhcmFtIHdlYnBhY2tDb25maWcgXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHdlYnBhY2tDb25maWc6IHtkZXZTZXJ2ZXI6IHdwLkNvbmZpZ3VyYXRpb25bJ2RldlNlcnZlciddfSkge1xuICBpZiAoIXdlYnBhY2tDb25maWcuZGV2U2VydmVyKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGRldlNlcnZlciA9IHdlYnBhY2tDb25maWcuZGV2U2VydmVyO1xuICBjb25zdCBvcmlnaW4gPSB3ZWJwYWNrQ29uZmlnLmRldlNlcnZlci5iZWZvcmU7XG4gIGRldlNlcnZlci5ob3N0ID0gJzAuMC4wLjAnO1xuXG4gIGRldlNlcnZlci5iZWZvcmUgPSBmdW5jdGlvbiBiZWZvcmUoYXBwOiBBcHBsaWNhdGlvbikge1xuICAgIC8vIFRvIGVsaW1pYXRlIEhNUiB3ZWIgc29ja2V0IGlzc3VlOlxuICAgIC8vICAgRXJyb3IgW0VSUl9IVFRQX0hFQURFUlNfU0VOVF06IENhbm5vdCBzZXQgaGVhZGVycyBhZnRlciB0aGV5IGFyZSBzZW50IHRvIHRoZSBjbGllbnRcbiAgICAvLyBhdCBTZXJ2ZXJSZXNwb25zZS5zZXRIZWFkZXIgKF9odHRwX291dGdvaW5nLmpzOjQ3MDoxMSlcbiAgICAvLyBhdCBBcnJheS53cml0ZSAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL2ZpbmFsaGFuZGxlci9pbmRleC5qczoyODU6OSlcbiAgICAvLyBhdCBsaXN0ZW5lciAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL29uLWZpbmlzaGVkL2luZGV4LmpzOjE2OToxNSlcbiAgICAvLyBhdCBvbkZpbmlzaCAoL1VzZXJzL2xpdWppbmcvYmsvY3JlZGl0LWFwcGwvbm9kZV9tb2R1bGVzL29uLWZpbmlzaGVkL2luZGV4LmpzOjEwMDo1KVxuICAgIC8vIGF0IGNhbGxiYWNrICgvVXNlcnMvbGl1amluZy9iay9jcmVkaXQtYXBwbC9ub2RlX21vZHVsZXMvZWUtZmlyc3QvaW5kZXguanM6NTU6MTApXG5cbiAgICBhcHAudXNlKChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3Qgb2xkID0gcmVzLnNldEhlYWRlcjtcbiAgICAgIC8vIGNvbnN0IG9sZEVuZCA9IHJlcy5lbmQ7XG4gICAgICByZXMuc2V0SGVhZGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgb2xkLmFwcGx5KHJlcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGlmIChlLmNvZGUgPT09ICdFUlJfSFRUUF9IRUFERVJTX1NFTlQnKSB7XG4gICAgICAgICAgICBsb2cud2FybignQ2Fubm90IHNldCBoZWFkZXJzIGFmdGVyIHRoZXkgYXJlIHNlbnQgdG8gdGhlIGNsaWVudCcpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIG5leHQoKTtcbiAgICB9KTtcbiAgICBpZiAob3JpZ2luKVxuICAgICAgb3JpZ2luLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG4gIGRldlNlcnZlci5jb21wcmVzcyA9IHRydWU7XG4gIGlmIChkZXZTZXJ2ZXIuaGVhZGVycyA9PSBudWxsKVxuICAgIGRldlNlcnZlci5oZWFkZXJzID0ge307XG4gIC8vIENPUlMgZW5hYmxlbWVudFxuICBkZXZTZXJ2ZXIuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gIGRldlNlcnZlci5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJ10gPSAnKic7XG5cbn1cbiJdfQ==