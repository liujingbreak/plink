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
exports.initAsChildProcess = exports.initProcess = exports.initConfig = void 0;
require("../node-path");
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("../config"));
const log = log4js_1.default.getLogger('plink.bootstrap-process');
process.on('uncaughtException', function (err) {
    // log.error('Uncaught exception', err, err.stack);
    log.error('Uncaught exception: ', err);
    throw err; // let PM2 handle exception
});
process.on('unhandledRejection', err => {
    // log.warn('unhandledRejection', err);
    log.error('unhandledRejection', err);
});
// const log = log4js.getLogger('bootstrap-process');
// export async function initConfigAsync(options: GlobalOptions) {
//   // initProcess(onShutdownSignal);
//   await config.init(options);
//   // logConfig(config());
//   return config;
// }
/**
 * Must invoke initProcess() before this function
 * @param options
 */
function initConfig(options) {
    config_1.default.initSync(options);
    // logConfig(config());
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
        log.info('pid ' + process.pid + ': bye');
        onShut();
    });
    process.on('message', function (msg) {
        if (msg === 'shutdown') {
            // tslint:disable-next-line: no-console
            log.info('Recieve shutdown message from PM2, bye.');
            onShut();
        }
    });
    const { saveState, stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore({
        devTools: false
    });
    function onShut() {
        return __awaiter(this, void 0, void 0, function* () {
            if (onShutdownSignal) {
                yield Promise.resolve(onShutdownSignal);
            }
            yield saveState();
            setImmediate(() => process.exit(0));
        });
    }
}
exports.initProcess = initProcess;
/**
 * Initialize redux-store for Plink.
 *
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread.
 *
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 */
function initAsChildProcess() {
    const { stateFactory, startLogging } = require('../store');
    startLogging();
    stateFactory.configureStore();
}
exports.initAsChildProcess = initAsChildProcess;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLXByb2Nlc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy9ib290c3RyYXAtcHJvY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3QkFBc0I7QUFDdEIsb0RBQTRCO0FBQzVCLHVEQUErQjtBQUkvQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBQ3hELE9BQU8sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsVUFBUyxHQUFHO0lBQzFDLG1EQUFtRDtJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sR0FBRyxDQUFDLENBQUMsMkJBQTJCO0FBQ3hDLENBQUMsQ0FBQyxDQUFDO0FBRUgsT0FBTyxDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsRUFBRTtJQUNyQyx1Q0FBdUM7SUFDdkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQztBQUVILHFEQUFxRDtBQUVyRCxrRUFBa0U7QUFDbEUsc0NBQXNDO0FBQ3RDLGdDQUFnQztBQUNoQyw0QkFBNEI7QUFDNUIsbUJBQW1CO0FBQ25CLElBQUk7QUFFSjs7O0dBR0c7QUFDSCxTQUFnQixVQUFVLENBQUMsT0FBc0I7SUFDL0MsZ0JBQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekIsdUJBQXVCO0lBQ3ZCLE9BQU8sZ0JBQU0sQ0FBQztBQUNoQixDQUFDO0FBSkQsZ0NBSUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsV0FBVyxDQUFDLGdCQUE0QztJQUN0RSxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtRQUNuQix1Q0FBdUM7UUFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLEVBQUUsQ0FBQztJQUNYLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsVUFBUyxHQUFHO1FBQ2hDLElBQUksR0FBRyxLQUFLLFVBQVUsRUFBRTtZQUN0Qix1Q0FBdUM7WUFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sRUFBRSxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sRUFBQyxTQUFTLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBQyxHQUFpQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDbEYsWUFBWSxFQUFFLENBQUM7SUFDZixZQUFZLENBQUMsY0FBYyxDQUFDO1FBQzFCLFFBQVEsRUFBRSxLQUFLO0tBQ2hCLENBQUMsQ0FBQztJQUVILFNBQWUsTUFBTTs7WUFDbkIsSUFBSSxnQkFBZ0IsRUFBRTtnQkFDcEIsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7YUFDekM7WUFDRCxNQUFNLFNBQVMsRUFBRSxDQUFDO1lBQ2xCLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsQ0FBQztLQUFBO0FBQ0gsQ0FBQztBQTNCRCxrQ0EyQkM7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILFNBQWdCLGtCQUFrQjtJQUNoQyxNQUFNLEVBQUMsWUFBWSxFQUFFLFlBQVksRUFBQyxHQUFpQixPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDdkUsWUFBWSxFQUFFLENBQUM7SUFDZixZQUFZLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDaEMsQ0FBQztBQUpELGdEQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuLy8gaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7R2xvYmFsT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4uL3N0b3JlJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmJvb3RzdHJhcC1wcm9jZXNzJyk7XG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uKGVycikge1xuICAvLyBsb2cuZXJyb3IoJ1VuY2F1Z2h0IGV4Y2VwdGlvbicsIGVyciwgZXJyLnN0YWNrKTtcbiAgbG9nLmVycm9yKCdVbmNhdWdodCBleGNlcHRpb246ICcsIGVycik7XG4gIHRocm93IGVycjsgLy8gbGV0IFBNMiBoYW5kbGUgZXhjZXB0aW9uXG59KTtcblxucHJvY2Vzcy5vbigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyID0+IHtcbiAgLy8gbG9nLndhcm4oJ3VuaGFuZGxlZFJlamVjdGlvbicsIGVycik7XG4gIGxvZy5lcnJvcigndW5oYW5kbGVkUmVqZWN0aW9uJywgZXJyKTtcbn0pO1xuXG4vLyBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdib290c3RyYXAtcHJvY2VzcycpO1xuXG4vLyBleHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5pdENvbmZpZ0FzeW5jKG9wdGlvbnM6IEdsb2JhbE9wdGlvbnMpIHtcbi8vICAgLy8gaW5pdFByb2Nlc3Mob25TaHV0ZG93blNpZ25hbCk7XG4vLyAgIGF3YWl0IGNvbmZpZy5pbml0KG9wdGlvbnMpO1xuLy8gICAvLyBsb2dDb25maWcoY29uZmlnKCkpO1xuLy8gICByZXR1cm4gY29uZmlnO1xuLy8gfVxuXG4vKipcbiAqIE11c3QgaW52b2tlIGluaXRQcm9jZXNzKCkgYmVmb3JlIHRoaXMgZnVuY3Rpb25cbiAqIEBwYXJhbSBvcHRpb25zIFxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdENvbmZpZyhvcHRpb25zOiBHbG9iYWxPcHRpb25zKSB7XG4gIGNvbmZpZy5pbml0U3luYyhvcHRpb25zKTtcbiAgLy8gbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cblxuLyoqXG4gKiAtIFJlZ2lzdGVyIHByb2Nlc3MgZXZlbnQgaGFuZGxlciBmb3IgU0lHSU5UIGFuZCBzaHV0ZG93biBjb21tYW5kXG4gKiAtIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rXG4gKiBAcGFyYW0gb25TaHV0ZG93blNpZ25hbCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRQcm9jZXNzKG9uU2h1dGRvd25TaWduYWw/OiAoKSA9PiB2b2lkIHwgUHJvbWlzZTxhbnk+KSB7XG4gIHByb2Nlc3Mub24oJ1NJR0lOVCcsIGZ1bmN0aW9uKCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdwaWQgJyArIHByb2Nlc3MucGlkICsgJzogYnllJyk7XG4gICAgb25TaHV0KCk7XG4gIH0pO1xuICBwcm9jZXNzLm9uKCdtZXNzYWdlJywgZnVuY3Rpb24obXNnKSB7XG4gICAgaWYgKG1zZyA9PT0gJ3NodXRkb3duJykge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbygnUmVjaWV2ZSBzaHV0ZG93biBtZXNzYWdlIGZyb20gUE0yLCBieWUuJyk7XG4gICAgICBvblNodXQoKTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHtzYXZlU3RhdGUsIHN0YXRlRmFjdG9yeSwgc3RhcnRMb2dnaW5nfTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSh7XG4gICAgZGV2VG9vbHM6IGZhbHNlXG4gIH0pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIG9uU2h1dCgpIHtcbiAgICBpZiAob25TaHV0ZG93blNpZ25hbCkge1xuICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKG9uU2h1dGRvd25TaWduYWwpO1xuICAgIH1cbiAgICBhd2FpdCBzYXZlU3RhdGUoKTtcbiAgICBzZXRJbW1lZGlhdGUoKCkgPT4gcHJvY2Vzcy5leGl0KDApKTtcbiAgfVxufVxuXG4vKipcbiAqIEluaXRpYWxpemUgcmVkdXgtc3RvcmUgZm9yIFBsaW5rLlxuICogXG4gKiBVc2UgdGhpcyBmdW5jdGlvbiBpbnN0ZWFkIG9mIGluaXRQcm9jZXNzKCkgaW4gY2FzZSBpdCBpcyBpbiBhIGZvcmtlZCBjaGlsZCBwcm9jZXNzIG9yIHdvcmtlciB0aHJlYWQuXG4gKiBcbiAqIFVubGluayBpbml0UHJvY2VzcygpIHdoaWNoIHJlZ2lzdGVycyBwcm9jZXNzIGV2ZW50IGhhbmRsZXIgZm9yIFNJR0lOVCBhbmQgc2h1dGRvd24gY29tbWFuZCxcbiAqIGluIGNhc2UgdGhpcyBpcyBydW5uaW5nIGFzIGEgZm9ya2VkIGNoaWxkIHByb2Nlc3MsIGl0IHdpbGwgc3RhbmQgYnkgdW50aWwgcGFyZW50IHByb2Nlc3MgZXhwbGljaXRseVxuICogIHNlbmRzIGEgc2lnbmFsIHRvIGV4aXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRBc0NoaWxkUHJvY2VzcygpIHtcbiAgY29uc3Qge3N0YXRlRmFjdG9yeSwgc3RhcnRMb2dnaW5nfTogdHlwZW9mIHN0b3JlID0gcmVxdWlyZSgnLi4vc3RvcmUnKTtcbiAgc3RhcnRMb2dnaW5nKCk7XG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xufVxuXG5cblxuIl19