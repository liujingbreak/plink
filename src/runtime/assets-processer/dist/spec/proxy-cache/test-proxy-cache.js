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
exports.cleanTest = exports.test = exports.npmInstall = void 0;
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const isWin = os_1.default.platform() === 'win32';
async function runNpmInstall(clean) {
    if (clean) {
        const serverCache = path_1.default.resolve((0, plink_1.config)().destDir, 'npm-server-cache');
        if (fs_extra_1.default.existsSync(serverCache))
            await fs_extra_1.default.remove(serverCache);
    }
    plink_1.config.change(setting => {
        setting['@wfh/assets-processer'].npmRegistryCacheServer = {
            path: '/npm',
            cacheDir: setting.destDir + '/npm-server-cache',
            // registry: 'https://registry.npm.taobao.org/'
            registry: 'https://registry.npmjs.org/'
        };
    });
    const { started, shutdown } = (0, plink_1.runServer)();
    await started;
    await rx.of('node_modules', 'package-lock.json', 'npm-cache').pipe(op.mergeMap(dir => {
        const target = path_1.default.resolve(__dirname, dir);
        if (fs_extra_1.default.existsSync(target)) {
            return fs_extra_1.default.remove(target);
        }
        return rx.EMPTY;
    })).toPromise();
    const cp = (0, child_process_1.spawn)(isWin ? 'npm.cmd' : 'npm', ['install', '--ddd'], {
        cwd: __dirname, stdio: 'inherit',
        timeout: 65000
    });
    const error$ = rx.fromEventPattern(h => cp.on('error', h), h => cp.off('error', h)).pipe(op.switchMap(err => rx.throwError(err)));
    const exit$ = rx.fromEventPattern(h => cp.on('exit', h), h => cp.off('exit', h));
    return rx.merge(error$, exit$, rx.timer(3 * 60000)).pipe(op.take(1), op.catchError(err => {
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
async function npmInstall() {
    await rx.of('node_modules', 'package-lock.json', 'npm-cache').pipe(op.mergeMap(dir => {
        const target = path_1.default.resolve(__dirname, dir);
        if (fs_extra_1.default.existsSync(target)) {
            return fs_extra_1.default.remove(target);
        }
        return rx.EMPTY;
    })).toPromise();
    const cp = (0, child_process_1.spawn)(isWin ? 'npm.cmd' : 'npm', ['install', '--ddd'], {
        cwd: __dirname, stdio: 'inherit',
        timeout: 65000
    });
    const error$ = rx.fromEventPattern(h => cp.on('error', h), h => cp.off('error', h)).pipe(op.switchMap(err => rx.throwError(err)));
    const exit$ = rx.fromEventPattern(h => cp.on('exit', h), h => cp.off('exit', h));
    return rx.merge(error$, exit$, rx.timer(3 * 60000)).pipe(op.take(1), op.catchError(err => {
        // eslint-disable-next-line no-console
        console.log('test npm install failed:', err);
        return rx.of(1);
    }), op.tap(() => {
        // eslint-disable-next-line no-console
        console.log('kill: ', cp.kill('SIGINT'));
        // await shutdown();
        // eslint-disable-next-line no-console
        console.log('------- shutdown http server done ---------');
    })).toPromise();
}
exports.npmInstall = npmInstall;
function test() {
    return runNpmInstall(false);
}
exports.test = test;
function cleanTest() {
    return runNpmInstall(true);
}
exports.cleanTest = cleanTest;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1wcm94eS1jYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtcHJveHktY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFvQztBQUNwQyw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsd0RBQTBCO0FBQzFCLHNDQUE2QztBQUM3QyxNQUFNLEtBQUssR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLEtBQUssT0FBTyxDQUFDO0FBRXhDLEtBQUssVUFBVSxhQUFhLENBQUMsS0FBYztJQUN6QyxJQUFJLEtBQUssRUFBRTtRQUNULE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBQSxjQUFNLEdBQUUsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUN2RSxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUM1QixNQUFNLGtCQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQ2hDO0lBRUQsY0FBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN0QixPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxzQkFBc0IsR0FBRztZQUN4RCxJQUFJLEVBQUUsTUFBTTtZQUNaLFFBQVEsRUFBRSxPQUFPLENBQUMsT0FBTyxHQUFHLG1CQUFtQjtZQUMvQywrQ0FBK0M7WUFDL0MsUUFBUSxFQUFFLDZCQUE2QjtTQUN4QyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBQyxHQUFHLElBQUEsaUJBQVMsR0FBRSxDQUFDO0lBQ3hDLE1BQU0sT0FBTyxDQUFDO0lBQ2QsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQ2hFLEVBQUUs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QUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNsQixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM3QyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUU7UUFDVixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLG9CQUFvQjtRQUNwQixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQzdELENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQXZDRCxnQ0F1Q0M7QUFFRCxTQUFnQixJQUFJO0lBQ2xCLE9BQU8sYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlCLENBQUM7QUFGRCxvQkFFQztBQUVELFNBQWdCLFNBQVM7SUFDdkIsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0IsQ0FBQztBQUZELDhCQUVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtzcGF3bn0gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQge2NvbmZpZywgcnVuU2VydmVyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGlzV2luID0gb3MucGxhdGZvcm0oKSA9PT0gJ3dpbjMyJztcblxuYXN5bmMgZnVuY3Rpb24gcnVuTnBtSW5zdGFsbChjbGVhbjogYm9vbGVhbikge1xuICBpZiAoY2xlYW4pIHtcbiAgICBjb25zdCBzZXJ2ZXJDYWNoZSA9IFBhdGgucmVzb2x2ZShjb25maWcoKS5kZXN0RGlyLCAnbnBtLXNlcnZlci1jYWNoZScpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHNlcnZlckNhY2hlKSlcbiAgICAgIGF3YWl0IGZzLnJlbW92ZShzZXJ2ZXJDYWNoZSk7XG4gIH1cblxuICBjb25maWcuY2hhbmdlKHNldHRpbmcgPT4ge1xuICAgIHNldHRpbmdbJ0B3ZmgvYXNzZXRzLXByb2Nlc3NlciddLm5wbVJlZ2lzdHJ5Q2FjaGVTZXJ2ZXIgPSB7XG4gICAgICBwYXRoOiAnL25wbScsXG4gICAgICBjYWNoZURpcjogc2V0dGluZy5kZXN0RGlyICsgJy9ucG0tc2VydmVyLWNhY2hlJyxcbiAgICAgIC8vIHJlZ2lzdHJ5OiAnaHR0cHM6Ly9yZWdpc3RyeS5ucG0udGFvYmFvLm9yZy8nXG4gICAgICByZWdpc3RyeTogJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnLydcbiAgICB9O1xuICB9KTtcblxuICBjb25zdCB7c3RhcnRlZCwgc2h1dGRvd259ID0gcnVuU2VydmVyKCk7XG4gIGF3YWl0IHN0YXJ0ZWQ7XG4gIGF3YWl0IHJ4Lm9mKCdub2RlX21vZHVsZXMnLCAncGFja2FnZS1sb2NrLmpzb24nLCAnbnBtLWNhY2hlJykucGlwZShcbiAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZGlyKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuIGZzLnJlbW92ZSh0YXJnZXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgY29uc3QgY3AgPSBzcGF3bihpc1dpbiA/ICducG0uY21kJyA6ICducG0nLCBbJ2luc3RhbGwnLCAnLS1kZGQnXSwge1xuICAgIGN3ZDogX19kaXJuYW1lLCBzdGRpbzogJ2luaGVyaXQnLFxuICAgIHRpbWVvdXQ6IDY1MDAwXG4gIH0pO1xuXG4gIGNvbnN0IGVycm9yJCA9IHJ4LmZyb21FdmVudFBhdHRlcm48RXJyb3I+KFxuICAgIGggPT4gY3Aub24oJ2Vycm9yJywgaCksIGggPT4gY3Aub2ZmKCdlcnJvcicsIGgpXG4gICkucGlwZShcbiAgICBvcC5zd2l0Y2hNYXAoZXJyID0+IHJ4LnRocm93RXJyb3IoZXJyKSlcbiAgKTtcblxuICBjb25zdCBleGl0JCA9IHJ4LmZyb21FdmVudFBhdHRlcm4oaCA9PiBjcC5vbignZXhpdCcsIGgpLCBoID0+IGNwLm9mZignZXhpdCcsIGgpKTtcblxuICByZXR1cm4gcngubWVyZ2UoZXJyb3IkLCBleGl0JCwgcngudGltZXIoMyAqIDYwMDAwKSkucGlwZShcbiAgICBvcC50YWtlKDEpLFxuICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygndGVzdCBucG0gaW5zdGFsbCBmYWlsZWQ6JywgZXJyKTtcbiAgICAgIHJldHVybiByeC5vZigxKTtcbiAgICB9KSxcbiAgICBvcC5jb25jYXRNYXAoYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdraWxsOiAnLCBjcC5raWxsKCdTSUdJTlQnKSk7XG4gICAgICBhd2FpdCBzaHV0ZG93bigpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tIHNodXRkb3duIGh0dHAgc2VydmVyIGRvbmUgLS0tLS0tLS0tJyk7XG4gICAgfSksXG4gICAgb3AudGFwKCgpID0+IHByb2Nlc3MuZXhpdCgwKSlcbiAgKS50b1Byb21pc2UoKTtcblxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbnBtSW5zdGFsbCgpIHtcbiAgYXdhaXQgcngub2YoJ25vZGVfbW9kdWxlcycsICdwYWNrYWdlLWxvY2suanNvbicsICducG0tY2FjaGUnKS5waXBlKFxuICAgIG9wLm1lcmdlTWFwKGRpciA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBkaXIpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgICAgICByZXR1cm4gZnMucmVtb3ZlKHRhcmdldCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBjb25zdCBjcCA9IHNwYXduKGlzV2luID8gJ25wbS5jbWQnIDogJ25wbScsIFsnaW5zdGFsbCcsICctLWRkZCddLCB7XG4gICAgY3dkOiBfX2Rpcm5hbWUsIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgdGltZW91dDogNjUwMDBcbiAgfSk7XG5cbiAgY29uc3QgZXJyb3IkID0gcnguZnJvbUV2ZW50UGF0dGVybjxFcnJvcj4oXG4gICAgaCA9PiBjcC5vbignZXJyb3InLCBoKSwgaCA9PiBjcC5vZmYoJ2Vycm9yJywgaClcbiAgKS5waXBlKFxuICAgIG9wLnN3aXRjaE1hcChlcnIgPT4gcngudGhyb3dFcnJvcihlcnIpKVxuICApO1xuXG4gIGNvbnN0IGV4aXQkID0gcnguZnJvbUV2ZW50UGF0dGVybihoID0+IGNwLm9uKCdleGl0JywgaCksIGggPT4gY3Aub2ZmKCdleGl0JywgaCkpO1xuXG4gIHJldHVybiByeC5tZXJnZShlcnJvciQsIGV4aXQkLCByeC50aW1lcigzICogNjAwMDApKS5waXBlKFxuICAgIG9wLnRha2UoMSksXG4gICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCd0ZXN0IG5wbSBpbnN0YWxsIGZhaWxlZDonLCBlcnIpO1xuICAgICAgcmV0dXJuIHJ4Lm9mKDEpO1xuICAgIH0pLFxuICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ2tpbGw6ICcsIGNwLmtpbGwoJ1NJR0lOVCcpKTtcbiAgICAgIC8vIGF3YWl0IHNodXRkb3duKCk7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJy0tLS0tLS0gc2h1dGRvd24gaHR0cCBzZXJ2ZXIgZG9uZSAtLS0tLS0tLS0nKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVzdCgpIHtcbiAgcmV0dXJuIHJ1bk5wbUluc3RhbGwoZmFsc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYW5UZXN0KCkge1xuICByZXR1cm4gcnVuTnBtSW5zdGFsbCh0cnVlKTtcbn1cblxuIl19