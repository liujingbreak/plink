"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initConfigAsync = void 0;
require("../node-path");
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
process.on('uncaughtException', function (err) {
    log.error('Uncaught exception', err, err.stack);
    console.error('Uncaught exception: ', err);
    throw err; // let PM2 handle exception
});
process.on('unhandledRejection', err => {
    log.warn('unhandledRejection', err);
    console.error('unhandledRejection', err);
});
const log = log4js_1.default.getLogger('bootstrap');
function initConfigAsync(options, onShutdownSignal) {
    return __awaiter(this, void 0, void 0, function* () {
        process.on('SIGINT', function () {
            // tslint:disable-next-line: no-console
            console.log('Recieve SIGINT, bye.');
            onShut();
        });
        process.on('message', function (msg) {
            if (msg === 'shutdown') {
                // tslint:disable-next-line: no-console
                console.log('Recieve shutdown message from PM2, bye.');
                onShut();
            }
        });
        function onShut() {
            return __awaiter(this, void 0, void 0, function* () {
                if (onShutdownSignal) {
                    yield Promise.resolve(onShutdownSignal);
                    yield saveState();
                    process.exit(0);
                }
                else {
                    yield saveState();
                    process.exit(0);
                }
            });
        }
        const { stateFactory, saveState } = require('../store');
        stateFactory.configureStore();
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
    });
}
exports.initConfigAsync = initConfigAsync;
var cli_1 = require("../cmd/cli");
Object.defineProperty(exports, "withGlobalOptions", { enumerable: true, get: function () { return cli_1.withGlobalOptions; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2Jvb3RzdHJhcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFDL0IsK0RBQXNDO0FBSXRDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUUxQyxTQUFzQixlQUFlLENBQUMsT0FBc0IsRUFBRSxnQkFBNEM7O1FBQ3hHLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ25CLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDcEMsTUFBTSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztZQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7Z0JBQ3RCLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNLEVBQUUsQ0FBQzthQUNWO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFlLE1BQU07O2dCQUNuQixJQUFJLGdCQUFnQixFQUFFO29CQUNwQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxTQUFTLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakI7cUJBQU07b0JBQ0wsTUFBTSxTQUFTLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakI7WUFDSCxDQUFDO1NBQUE7UUFFRCxNQUFNLEVBQUMsWUFBWSxFQUFFLFNBQVMsRUFBQyxHQUFpQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEUsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRzlCLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0Isb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQUE7QUEvQkQsMENBK0JDO0FBQ0Qsa0NBQTZDO0FBQXJDLHdHQUFBLGlCQUFpQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbiAgbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb24nLCBlcnIsIGVyci5zdGFjayk7XG4gIGNvbnNvbGUuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyKTtcbiAgdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICBsb2cud2FybigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbiAgY29uc29sZS5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbn0pO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdib290c3RyYXAnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRDb25maWdBc3luYyhvcHRpb25zOiBHbG9iYWxPcHRpb25zLCBvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBTSUdJTlQsIGJ5ZS4nKTtcbiAgICBvblNodXQoKTtcbiAgfSk7XG4gIHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICAgIG9uU2h1dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gb25TaHV0KCkge1xuICAgIGlmIChvblNodXRkb3duU2lnbmFsKSB7XG4gICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUob25TaHV0ZG93blNpZ25hbCk7XG4gICAgICBhd2FpdCBzYXZlU3RhdGUoKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgc2F2ZVN0YXRlKCk7XG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qge3N0YXRlRmFjdG9yeSwgc2F2ZVN0YXRlfTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG5cblxuICBhd2FpdCBjb25maWcuaW5pdChvcHRpb25zKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbn1cbmV4cG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC9jbGknO1xuZXhwb3J0IHtHbG9iYWxPcHRpb25zfTtcbiJdfQ==