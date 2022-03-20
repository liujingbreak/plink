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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNpmInstall = void 0;
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const isWin = os_1.default.platform() === 'win32';
async function runNpmInstall() {
    const serverCache = path_1.default.resolve((0, plink_1.config)().destDir, 'npm-server-cache');
    if (fs_extra_1.default.existsSync(serverCache))
        await fs_extra_1.default.remove(serverCache);
    plink_1.config.change(setting => {
        setting['@wfh/assets-processer'].npmRegistryCacheServer = {
            path: '/npm',
            cacheDir: setting.destDir + '/npm-server-cache',
            registry: 'https://registry.npm.taobao.org/'
        };
    });
    const { started, shutdown } = (0, plink_1.runServer)();
    await started;
    await rx.of('node_modules', 'npm-cache').pipe(op.mergeMap(dir => {
        const target = path_1.default.resolve(__dirname, dir);
        if (fs_extra_1.default.existsSync(target)) {
            return fs_extra_1.default.remove(target);
        }
        return rx.EMPTY;
    })).toPromise();
    const cp = (0, child_process_1.spawn)(isWin ? 'npm.cmd' : 'npm', ['install', 'glob'], {
        cwd: __dirname, stdio: 'inherit',
        timeout: 45000
    });
    const error$ = rx.fromEventPattern(h => cp.on('error', h), h => cp.off('error', h)).pipe(op.switchMap(err => rx.throwError(err)));
    const exit$ = rx.fromEventPattern(h => cp.on('exit', h), h => cp.off('exit', h));
    return rx.merge(error$, exit$, rx.timer(46000)).pipe(op.take(1), op.catchError(err => {
        // eslint-disable-next-line no-console
        console.log('test npm install failed:', err);
        return rx.of(1);
    }), op.concatMap(async () => {
        // eslint-disable-next-line no-console
        console.log('kill: ', cp.kill('SIGINT'));
        await shutdown();
        // eslint-disable-next-line no-console
        console.log('------- shutdown http server done ---------');
    }), op.tap(() => process.exit(0))).toPromise();
}
exports.runNpmInstall = runNpmInstall;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1wcm94eS1jYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtcHJveHktY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFvQztBQUNwQyw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsd0RBQTBCO0FBQzFCLHNDQUE2QztBQUM3QyxNQUFNLEtBQUssR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssT0FBTyxDQUFDO0FBRWpDLEtBQUssVUFBVSxhQUFhO0lBQ2pDLE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBQSxjQUFNLEdBQUUsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUN2RSxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztRQUM1QixNQUFNLGtCQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBRS9CLGNBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDdEIsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsc0JBQXNCLEdBQUc7WUFDeEQsSUFBSSxFQUFFLE1BQU07WUFDWixRQUFRLEVBQUUsT0FBTyxDQUFDLE9BQU8sR0FBRyxtQkFBbUI7WUFDL0MsUUFBUSxFQUFFLGtDQUFrQztTQUM3QyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxHQUFHLElBQUEsaUJBQVMsR0FBRSxDQUFDO0lBQ3hDLE1BQU0sT0FBTyxDQUFDO0lBQ2QsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQzNDLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDaEIsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUMsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN6QixPQUFPLGtCQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQzFCO1FBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7SUFFZCxNQUFNLEVBQUUsR0FBRyxJQUFBLHFCQUFLLEVBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsRUFBRTtRQUMvRCxHQUFHLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxTQUFTO1FBQ2hDLE9BQU8sRUFBRSxLQUFLO0tBQ2YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUNoQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQ2hELENBQUMsSUFBSSxDQUNKLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQ3hDLENBQUM7SUFFRixNQUFNLEtBQUssR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFakYsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDbEQsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2xCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzdDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ3RCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDekMsTUFBTSxRQUFRLEVBQUUsQ0FBQztRQUNqQixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUM5QixDQUFDLFNBQVMsRUFBRSxDQUFDO0FBRWhCLENBQUM7QUF2REQsc0NBdURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtzcGF3bn0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2NvbmZpZywgcnVuU2VydmVyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGlzV2luID0gb3MucGxhdGZvcm0oKSA9PT0gJ3dpbjMyJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bk5wbUluc3RhbGwoKSB7XG4gIGNvbnN0IHNlcnZlckNhY2hlID0gUGF0aC5yZXNvbHZlKGNvbmZpZygpLmRlc3REaXIsICducG0tc2VydmVyLWNhY2hlJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHNlcnZlckNhY2hlKSlcbiAgICBhd2FpdCBmcy5yZW1vdmUoc2VydmVyQ2FjaGUpO1xuXG4gIGNvbmZpZy5jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgc2V0dGluZ1snQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ubnBtUmVnaXN0cnlDYWNoZVNlcnZlciA9IHtcbiAgICAgIHBhdGg6ICcvbnBtJyxcbiAgICAgIGNhY2hlRGlyOiBzZXR0aW5nLmRlc3REaXIgKyAnL25wbS1zZXJ2ZXItY2FjaGUnLFxuICAgICAgcmVnaXN0cnk6ICdodHRwczovL3JlZ2lzdHJ5Lm5wbS50YW9iYW8ub3JnLydcbiAgICB9O1xuICB9KTtcblxuICBjb25zdCB7c3RhcnRlZCwgc2h1dGRvd259ID0gcnVuU2VydmVyKCk7XG4gIGF3YWl0IHN0YXJ0ZWQ7XG4gIGF3YWl0IHJ4Lm9mKCdub2RlX21vZHVsZXMnLCAnbnBtLWNhY2hlJykucGlwZShcbiAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZGlyKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuIGZzLnJlbW92ZSh0YXJnZXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgY29uc3QgY3AgPSBzcGF3bihpc1dpbiA/ICducG0uY21kJyA6ICducG0nLCBbJ2luc3RhbGwnLCAnZ2xvYiddLCB7XG4gICAgY3dkOiBfX2Rpcm5hbWUsIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgdGltZW91dDogNDUwMDBcbiAgfSk7XG5cbiAgY29uc3QgZXJyb3IkID0gcnguZnJvbUV2ZW50UGF0dGVybjxFcnJvcj4oXG4gICAgaCA9PiBjcC5vbignZXJyb3InLCBoKSwgaCA9PiBjcC5vZmYoJ2Vycm9yJywgaClcbiAgKS5waXBlKFxuICAgIG9wLnN3aXRjaE1hcChlcnIgPT4gcngudGhyb3dFcnJvcihlcnIpKVxuICApO1xuXG4gIGNvbnN0IGV4aXQkID0gcnguZnJvbUV2ZW50UGF0dGVybihoID0+IGNwLm9uKCdleGl0JywgaCksIGggPT4gY3Aub2ZmKCdleGl0JywgaCkpO1xuXG4gIHJldHVybiByeC5tZXJnZShlcnJvciQsIGV4aXQkLCByeC50aW1lcig0NjAwMCkpLnBpcGUoXG4gICAgb3AudGFrZSgxKSxcbiAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ3Rlc3QgbnBtIGluc3RhbGwgZmFpbGVkOicsIGVycik7XG4gICAgICByZXR1cm4gcngub2YoMSk7XG4gICAgfSksXG4gICAgb3AuY29uY2F0TWFwKGFzeW5jICgpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygna2lsbDogJywgY3Aua2lsbCgnU0lHSU5UJykpO1xuICAgICAgYXdhaXQgc2h1dGRvd24oKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnLS0tLS0tLSBzaHV0ZG93biBodHRwIHNlcnZlciBkb25lIC0tLS0tLS0tLScpO1xuICAgIH0pLFxuICAgIG9wLnRhcCgoKSA9PiBwcm9jZXNzLmV4aXQoMCkpXG4gICkudG9Qcm9taXNlKCk7XG5cbn1cblxuIl19