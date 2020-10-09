"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = __importDefault(require("log4js"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL2RldlNlcnZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUVBLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBRS9DOzs7O0dBSUc7QUFDSCxtQkFBd0IsYUFBK0I7SUFDckQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUU7UUFDNUIsT0FBTztLQUNSO0lBQ0QsTUFBTSxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztJQUMxQyxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztJQUM5QyxTQUFTLENBQUMsTUFBTSxHQUFHLFNBQVMsTUFBTSxDQUFDLEdBQWdCO1FBQ2pELG9DQUFvQztRQUNwQyx3RkFBd0Y7UUFDeEYseURBQXlEO1FBQ3pELDBGQUEwRjtRQUMxRix1RkFBdUY7UUFDdkYsc0ZBQXNGO1FBQ3RGLG1GQUFtRjtRQUVuRixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN6QixNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQzFCLDBCQUEwQjtZQUMxQixHQUFHLENBQUMsU0FBUyxHQUFHO2dCQUNkLElBQUk7b0JBQ0YsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7aUJBQzNCO2dCQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNWLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyx1QkFBdUIsRUFBRTt3QkFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO3FCQUNsRTt5QkFBTTt3QkFDTCxNQUFNLENBQUMsQ0FBQztxQkFDVDtpQkFDRjtZQUNILENBQUMsQ0FBQztZQUNGLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLE1BQU07WUFDUixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNsQyxDQUFDLENBQUM7SUFDRixTQUFTLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztJQUMxQixJQUFJLFNBQVMsQ0FBQyxPQUFPLElBQUksSUFBSTtRQUMzQixTQUFTLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUN6QixrQkFBa0I7SUFDbEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUN2RCxTQUFTLENBQUMsT0FBTyxDQUFDLDhCQUE4QixDQUFDLEdBQUcsR0FBRyxDQUFDO0FBRTFELENBQUM7QUF6Q0QsNEJBeUNDIiwiZmlsZSI6ImludGVybmFsL3dlYnBhY2stY29tbW9uL2Rpc3QvZGV2U2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
