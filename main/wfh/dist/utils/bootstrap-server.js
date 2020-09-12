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
            if (onShutdownSignal)
                Promise.resolve(onShutdownSignal)
                    .then(() => process.exit(0));
            else
                process.exit(0);
        }
        const { stateFactory } = require('../store');
        stateFactory.configureStore();
        // let saved = false;
        // process.on('beforeExit', async (code) => {
        //   if (saved)
        //     return;
        //   saved = true;
        //   log4js.shutdown();
        //   (await import('../store')).saveState();
        // });
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
    });
}
exports.initConfigAsync = initConfigAsync;
var cli_1 = require("../cmd/cli");
Object.defineProperty(exports, "withGlobalOptions", { enumerable: true, get: function () { return cli_1.withGlobalOptions; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2Jvb3RzdHJhcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsd0JBQXNCO0FBQ3RCLG9EQUE0QjtBQUM1Qix1REFBK0I7QUFDL0IsK0RBQXNDO0FBSXRDLE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNoRCxPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFFSCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUUxQyxTQUFzQixlQUFlLENBQUMsT0FBc0IsRUFBRSxnQkFBNEM7O1FBQ3hHLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO1lBQ25CLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDcEMsTUFBTSxFQUFFLENBQUM7UUFDWCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztZQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7Z0JBQ3RCLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO2dCQUN2RCxNQUFNLEVBQUUsQ0FBQzthQUNWO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxTQUFTLE1BQU07WUFDYixJQUFJLGdCQUFnQjtnQkFDbEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztxQkFDaEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7Z0JBRTdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsQ0FBQztRQUVELE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBaUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pELFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUM5QixxQkFBcUI7UUFDckIsNkNBQTZDO1FBQzdDLGVBQWU7UUFDZixjQUFjO1FBQ2Qsa0JBQWtCO1FBQ2xCLHVCQUF1QjtRQUN2Qiw0Q0FBNEM7UUFDNUMsTUFBTTtRQUVOLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0Isb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQUE7QUFuQ0QsMENBbUNDO0FBQ0Qsa0NBQTZDO0FBQXJDLHdHQUFBLGlCQUFpQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB0eXBlIHtHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHR5cGUgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBjb25zb2xlLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4gIGNvbnNvbGUuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYm9vdHN0cmFwJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0Q29uZmlnQXN5bmMob3B0aW9uczogR2xvYmFsT3B0aW9ucywgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gICAgb25TaHV0KCk7XG4gIH0pO1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbClcbiAgICAgIFByb21pc2UucmVzb2x2ZShvblNodXRkb3duU2lnbmFsKVxuICAgICAgLnRoZW4oKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgICBlbHNlXG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH1cblxuICBjb25zdCB7c3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIC8vIGxldCBzYXZlZCA9IGZhbHNlO1xuICAvLyBwcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgYXN5bmMgKGNvZGUpID0+IHtcbiAgLy8gICBpZiAoc2F2ZWQpXG4gIC8vICAgICByZXR1cm47XG4gIC8vICAgc2F2ZWQgPSB0cnVlO1xuICAvLyAgIGxvZzRqcy5zaHV0ZG93bigpO1xuICAvLyAgIChhd2FpdCBpbXBvcnQoJy4uL3N0b3JlJykpLnNhdmVTdGF0ZSgpO1xuICAvLyB9KTtcblxuICBhd2FpdCBjb25maWcuaW5pdChvcHRpb25zKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbn1cbmV4cG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC9jbGknO1xuZXhwb3J0IHtHbG9iYWxPcHRpb25zfTtcbiJdfQ==