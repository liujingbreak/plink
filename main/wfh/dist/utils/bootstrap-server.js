"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
        let saved = false;
        process.on('beforeExit', (code) => __awaiter(this, void 0, void 0, function* () {
            if (saved)
                return;
            saved = true;
            log4js_1.default.shutdown();
            (yield Promise.resolve().then(() => __importStar(require('../store')))).saveState();
        }));
        yield config_1.default.init(options);
        log_config_1.default(config_1.default());
    });
}
exports.initConfigAsync = initConfigAsync;
var cli_1 = require("../cmd/cli");
Object.defineProperty(exports, "withGlobalOptions", { enumerable: true, get: function () { return cli_1.withGlobalOptions; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3V0aWxzL2Jvb3RzdHJhcC1zZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdCQUFzQjtBQUN0QixvREFBNEI7QUFDNUIsdURBQStCO0FBQy9CLCtEQUFzQztBQUl0QyxPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLFVBQVMsR0FBRztJQUMxQyxHQUFHLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDaEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLDJCQUEyQjtBQUN4QyxDQUFDLENBQUMsQ0FBQztBQUVILE9BQU8sQ0FBQyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLEVBQUU7SUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNwQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFMUMsU0FBc0IsZUFBZSxDQUFDLE9BQXNCLEVBQUUsZ0JBQTRDOztRQUN4RyxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtZQUNuQix1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sRUFBRSxDQUFDO1FBQ1gsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxVQUFTLEdBQUc7WUFDaEMsSUFBSSxHQUFHLEtBQUssVUFBVSxFQUFFO2dCQUN0Qix1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztnQkFDdkQsTUFBTSxFQUFFLENBQUM7YUFDVjtRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxNQUFNO1lBQ2IsSUFBSSxnQkFBZ0I7Z0JBQ2xCLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7cUJBQ2hDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O2dCQUU3QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLENBQUM7UUFFRCxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQWlCLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6RCxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDOUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQU8sSUFBSSxFQUFFLEVBQUU7WUFDdEMsSUFBSSxLQUFLO2dCQUNQLE9BQU87WUFDVCxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2IsZ0JBQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQixDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDekMsQ0FBQyxDQUFBLENBQUMsQ0FBQztRQUVILE1BQU0sZ0JBQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0Isb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztJQUN0QixDQUFDO0NBQUE7QUFuQ0QsMENBbUNDO0FBQ0Qsa0NBQTZDO0FBQXJDLHdHQUFBLGlCQUFpQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB0eXBlIHtHbG9iYWxPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHR5cGUgKiBhcyBzdG9yZSBmcm9tICcuLi9zdG9yZSc7XG5cbnByb2Nlc3Mub24oJ3VuY2F1Z2h0RXhjZXB0aW9uJywgZnVuY3Rpb24oZXJyKSB7XG4gIGxvZy5lcnJvcignVW5jYXVnaHQgZXhjZXB0aW9uJywgZXJyLCBlcnIuc3RhY2spO1xuICBjb25zb2xlLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4gIGNvbnNvbGUuZXJyb3IoJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG59KTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignYm9vdHN0cmFwJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbml0Q29uZmlnQXN5bmMob3B0aW9uczogR2xvYmFsT3B0aW9ucywgb25TaHV0ZG93blNpZ25hbD86ICgpID0+IHZvaWQgfCBQcm9taXNlPGFueT4pIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgZnVuY3Rpb24oKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1JlY2lldmUgU0lHSU5ULCBieWUuJyk7XG4gICAgb25TaHV0KCk7XG4gIH0pO1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbClcbiAgICAgIFByb21pc2UucmVzb2x2ZShvblNodXRkb3duU2lnbmFsKVxuICAgICAgLnRoZW4oKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgICBlbHNlXG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH1cblxuICBjb25zdCB7c3RhdGVGYWN0b3J5fTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIGxldCBzYXZlZCA9IGZhbHNlO1xuICBwcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgYXN5bmMgKGNvZGUpID0+IHtcbiAgICBpZiAoc2F2ZWQpXG4gICAgICByZXR1cm47XG4gICAgc2F2ZWQgPSB0cnVlO1xuICAgIGxvZzRqcy5zaHV0ZG93bigpO1xuICAgIChhd2FpdCBpbXBvcnQoJy4uL3N0b3JlJykpLnNhdmVTdGF0ZSgpO1xuICB9KTtcblxuICBhd2FpdCBjb25maWcuaW5pdChvcHRpb25zKTtcbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbn1cbmV4cG9ydCB7d2l0aEdsb2JhbE9wdGlvbnN9IGZyb20gJy4uL2NtZC9jbGknO1xuZXhwb3J0IHtHbG9iYWxPcHRpb25zfTtcbiJdfQ==