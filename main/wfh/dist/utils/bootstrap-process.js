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
// import log4js from 'log4js';
const config_1 = __importDefault(require("../config"));
const log_config_1 = __importDefault(require("../log-config"));
process.on('uncaughtException', function (err) {
    // log.error('Uncaught exception', err, err.stack);
    console.error('Uncaught exception: ', err);
    throw err; // let PM2 handle exception
});
process.on('unhandledRejection', err => {
    // log.warn('unhandledRejection', err);
    console.error('unhandledRejection', err);
});
// const log = log4js.getLogger('bootstrap-process');
function initConfigAsync(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // initProcess(onShutdownSignal);
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
        return config_1.default;
    });
}
exports.initConfigAsync = initConfigAsync;
function initConfig(options) {
    // initProcess(onShutdownSignal);
    config_1.default.initSync(options);
    log_config_1.default(config_1.default());
    return config_1.default;
}
exports.initConfig = initConfig;
/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 * @param onShutdownSignal
 */
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
    stateFactory.configureStore();
    // process.nextTick(() => stateFactory.configureStore());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3QkFBc0I7QUFDdEIsK0JBQStCO0FBQy9CLHVEQUErQjtBQUMvQiwrREFBc0M7QUFJdEMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxVQUFTLEdBQUc7SUFDMUMsbURBQW1EO0lBQ25ELE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDM0MsTUFBTSxHQUFHLENBQUMsQ0FBQywyQkFBMkI7QUFDeEMsQ0FBQyxDQUFDLENBQUM7QUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxFQUFFO0lBQ3JDLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDO0FBRUgscURBQXFEO0FBRXJELFNBQXNCLGVBQWUsQ0FBQyxPQUFzQjs7UUFDMUQsaUNBQWlDO1FBQ2pDLE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0Isb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUNwQixPQUFPLGdCQUFNLENBQUM7SUFDaEIsQ0FBQztDQUFBO0FBTEQsMENBS0M7QUFFRCxTQUFnQixVQUFVLENBQUMsT0FBc0I7SUFDL0MsaUNBQWlDO0lBQ2pDLGdCQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pCLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7SUFDcEIsT0FBTyxnQkFBTSxDQUFDO0FBQ2hCLENBQUM7QUFMRCxnQ0FLQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFnQixXQUFXLENBQUMsZ0JBQTRDO0lBQ3RFLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFO1FBQ25CLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEMsTUFBTSxFQUFFLENBQUM7SUFDWCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVMsR0FBRztRQUNoQyxJQUFJLEdBQUcsS0FBSyxVQUFVLEVBQUU7WUFDdEIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztZQUN2RCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLEVBQUMsU0FBUyxFQUFFLFlBQVksRUFBQyxHQUFpQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDcEUsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzlCLHlEQUF5RDtJQUV6RCxTQUFlLE1BQU07O1lBQ25CLElBQUksZ0JBQWdCLEVBQUU7Z0JBQ3BCLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUN4QyxNQUFNLFNBQVMsRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2pCO2lCQUFNO2dCQUNMLE1BQU0sU0FBUyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDakI7UUFDSCxDQUFDO0tBQUE7QUFDSCxDQUFDO0FBNUJELGtDQTRCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAnLi4vbm9kZS1wYXRoJztcbi8vIGltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIC8vIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBjb25zb2xlLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgLy8gbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4gIGNvbnNvbGUuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcblxuLy8gY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYm9vdHN0cmFwLXByb2Nlc3MnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluaXRDb25maWdBc3luYyhvcHRpb25zOiBHbG9iYWxPcHRpb25zKSB7XG4gIC8vIGluaXRQcm9jZXNzKG9uU2h1dGRvd25TaWduYWwpO1xuICBhd2FpdCBjb25maWcuaW5pdChvcHRpb25zKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRDb25maWcob3B0aW9uczogR2xvYmFsT3B0aW9ucykge1xuICAvLyBpbml0UHJvY2VzcyhvblNodXRkb3duU2lnbmFsKTtcbiAgY29uZmlnLmluaXRTeW5jKG9wdGlvbnMpO1xuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICByZXR1cm4gY29uZmlnO1xufVxuXG4vKipcbiAqIC0gUmVnaXN0ZXIgcHJvY2VzcyBldmVudCBoYW5kbGVyIGZvciBTSUdJTlQgYW5kIHNodXRkb3duIGNvbW1hbmRcbiAqIC0gSW5pdGlhbGl6ZSByZWR1eC1zdG9yZSBmb3IgUGxpbmtcbiAqIEBwYXJhbSBvblNodXRkb3duU2lnbmFsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdFByb2Nlc3Mob25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gICAgb25TaHV0KCk7XG4gIH0pO1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHtzYXZlU3RhdGUsIHN0YXRlRmFjdG9yeX06IHR5cGVvZiBzdG9yZSA9IHJlcXVpcmUoJy4uL3N0b3JlJyk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICAvLyBwcm9jZXNzLm5leHRUaWNrKCgpID0+IHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpKTtcblxuICBhc3luYyBmdW5jdGlvbiBvblNodXQoKSB7XG4gICAgaWYgKG9uU2h1dGRvd25TaWduYWwpIHtcbiAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShvblNodXRkb3duU2lnbmFsKTtcbiAgICAgIGF3YWl0IHNhdmVTdGF0ZSgpO1xuICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBzYXZlU3RhdGUoKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgICB9XG4gIH1cbn1cblxuIl19