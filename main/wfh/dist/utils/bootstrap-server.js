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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2Jvb3RzdHJhcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFDL0IsK0RBQXNDO0FBSXRDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUUxQyxTQUFzQixlQUFlLENBQUMsT0FBc0IsRUFBRSxnQkFBNEM7O1FBQ3hHLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ25CLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDcEMsTUFBTSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztZQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7Z0JBQ3RCLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNLEVBQUUsQ0FBQzthQUNWO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFlLE1BQU07O2dCQUNuQixJQUFJLGdCQUFnQixFQUFFO29CQUNwQixNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztvQkFDeEMsTUFBTSxTQUFTLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakI7cUJBQU07b0JBQ0wsTUFBTSxTQUFTLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDakI7WUFDSCxDQUFDO1NBQUE7UUFFRCxNQUFNLEVBQUMsWUFBWSxFQUFFLFNBQVMsRUFBQyxHQUFpQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDcEUsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBRzlCLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0Isb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQUE7QUEvQkQsMENBK0JDO0FBQ0Qsa0NBQTZDO0FBQXJDLHdHQUFBLGlCQUFpQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB0eXBlIHtHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHR5cGUgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBjb25zb2xlLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4gIGNvbnNvbGUuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYm9vdHN0cmFwJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0Q29uZmlnQXN5bmMob3B0aW9uczogR2xvYmFsT3B0aW9ucywgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gICAgb25TaHV0KCk7XG4gIH0pO1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKG9uU2h1dGRvd25TaWduYWwpO1xuICAgICAgYXdhaXQgc2F2ZVN0YXRlKCk7XG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHNhdmVTdGF0ZSgpO1xuICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHtzdGF0ZUZhY3RvcnksIHNhdmVTdGF0ZX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuXG5cbiAgYXdhaXQgY29uZmlnLmluaXQob3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG59XG5leHBvcnQge3dpdGhHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvY2xpJztcbmV4cG9ydCB7R2xvYmFsT3B0aW9uc307XG4iXX0=