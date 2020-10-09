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
exports.initProcess = exports.initConfig = exports.initConfigAsync = void 0;
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
const log = log4js_1.default.getLogger('bootstrap-process');
function initConfigAsync(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // initProcess(onShutdownSignal);
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
    });
}
exports.initConfigAsync = initConfigAsync;
function initConfig(options) {
    // initProcess(onShutdownSignal);
    config_1.default.initSync(options);
    log_config_1.default(config_1.default());
}
exports.initConfig = initConfig;
function initProcess(onShutdownSignal) {
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
    const { saveState, stateFactory } = require('../store');
    process.nextTick(() => stateFactory.configureStore());
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
}
exports.initProcess = initProcess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3QkFBc0I7QUFDdEIsb0RBQTRCO0FBQzVCLHVEQUErQjtBQUMvQiwrREFBc0M7QUFJdEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ2hELE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0MsTUFBTSxHQUFHLENBQUMsQ0FBQywyQkFBMkI7QUFDeEMsQ0FBQyxDQUFDLENBQUM7QUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxFQUFFO0lBQ3JDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDcEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQztBQUVILE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFbEQsU0FBc0IsZUFBZSxDQUFDLE9BQXNCOztRQUMxRCxpQ0FBaUM7UUFDakMsTUFBTSxnQkFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLENBQUM7Q0FBQTtBQUpELDBDQUlDO0FBRUQsU0FBZ0IsVUFBVSxDQUFDLE9BQXNCO0lBQy9DLGlDQUFpQztJQUNqQyxnQkFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QixvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3RCLENBQUM7QUFKRCxnQ0FJQztBQUVELFNBQWdCLFdBQVcsQ0FBQyxnQkFBNEM7SUFDdEUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7UUFDbkIsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNwQyxNQUFNLEVBQUUsQ0FBQztJQUNYLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO1FBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtZQUN0Qix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBQ3ZELE1BQU0sRUFBRSxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFDLEdBQWlCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUVwRSxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBRXRELFNBQWUsTUFBTTs7WUFDbkIsSUFBSSxnQkFBZ0IsRUFBRTtnQkFDcEIsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ3hDLE1BQU0sU0FBUyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDakI7aUJBQU07Z0JBQ0wsTUFBTSxTQUFTLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNqQjtRQUNILENBQUM7S0FBQTtBQUNILENBQUM7QUE1QkQsa0NBNEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcblxucHJvY2Vzcy5vbigndW5jYXVnaHRFeGNlcHRpb24nLCBmdW5jdGlvbihlcnIpIHtcbiAgbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb24nLCBlcnIsIGVyci5zdGFjayk7XG4gIGNvbnNvbGUuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbjogJywgZXJyKTtcbiAgdGhyb3cgZXJyOyAvLyBsZXQgUE0yIGhhbmRsZSBleGNlcHRpb25cbn0pO1xuXG5wcm9jZXNzLm9uKCd1bmhhbmRsZWRSZWplY3Rpb24nLCBlcnIgPT4ge1xuICBsb2cud2FybigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbiAgY29uc29sZS5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbn0pO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdib290c3RyYXAtcHJvY2VzcycpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdENvbmZpZ0FzeW5jKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMpIHtcbiAgLy8gaW5pdFByb2Nlc3Mob25TaHV0ZG93blNpZ25hbCk7XG4gIGF3YWl0IGNvbmZpZy5pbml0KG9wdGlvbnMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdENvbmZpZyhvcHRpb25zOiBHbG9iYWxPcHRpb25zKSB7XG4gIC8vIGluaXRQcm9jZXNzKG9uU2h1dGRvd25TaWduYWwpO1xuICBjb25maWcuaW5pdFN5bmMob3B0aW9ucyk7XG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0UHJvY2VzcyhvblNodXRkb3duU2lnbmFsPzogKCkgPT4gdm9pZCB8IFByb21pc2U8YW55Pikge1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbigpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBTSUdJTlQsIGJ5ZS4nKTtcbiAgICBvblNodXQoKTtcbiAgfSk7XG4gIHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBmdW5jdGlvbihtc2cpIHtcbiAgICBpZiAobXNnID09PSAnc2h1dGRvd24nKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdSZWNpZXZlIHNodXRkb3duIG1lc3NhZ2UgZnJvbSBQTTIsIGJ5ZS4nKTtcbiAgICAgIG9uU2h1dCgpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3Qge3NhdmVTdGF0ZSwgc3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcblxuICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpKTtcblxuICBhc3luYyBmdW5jdGlvbiBvblNodXQoKSB7XG4gICAgaWYgKG9uU2h1dGRvd25TaWduYWwpIHtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShvblNodXRkb3duU2lnbmFsKTtcbiAgICAgIGF3YWl0IHNhdmVTdGF0ZSgpO1xuICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBzYXZlU3RhdGUoKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICB9XG4gIH1cbn1cblxuIl19