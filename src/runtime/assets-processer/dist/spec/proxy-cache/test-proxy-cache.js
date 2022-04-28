"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1wcm94eS1jYWNoZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlc3QtcHJveHktY2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBb0M7QUFDcEMsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHdEQUEwQjtBQUMxQixzQ0FBNkM7QUFDN0MsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxLQUFLLE9BQU8sQ0FBQztBQUV4QyxLQUFLLFVBQVUsYUFBYSxDQUFDLEtBQWM7SUFDekMsSUFBSSxLQUFLLEVBQUU7UUFDVCxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUEsY0FBTSxHQUFFLENBQUMsT0FBTyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDdkUsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDNUIsTUFBTSxrQkFBRSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUNoQztJQUVELGNBQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDdEIsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsc0JBQXNCLEdBQUc7WUFDeEQsSUFBSSxFQUFFLE1BQU07WUFDWixRQUFRLEVBQUUsT0FBTyxDQUFDLE9BQU8sR0FBRyxtQkFBbUI7WUFDL0MsK0NBQStDO1lBQy9DLFFBQVEsRUFBRSw2QkFBNkI7U0FDeEMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUMsR0FBRyxJQUFBLGlCQUFTLEdBQUUsQ0FBQztJQUN4QyxNQUFNLE9BQU8sQ0FBQztJQUNkLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUNoRSxF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QUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDbEIsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDN0MsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1FBQ1Ysc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN6QyxvQkFBb0I7UUFDcEIsc0NBQXNDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUF2Q0QsZ0NBdUNDO0FBRUQsU0FBZ0IsSUFBSTtJQUNsQixPQUFPLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5QixDQUFDO0FBRkQsb0JBRUM7QUFFRCxTQUFnQixTQUFTO0lBQ3ZCLE9BQU8sYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzdCLENBQUM7QUFGRCw4QkFFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7c3Bhd259IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IHtjb25maWcsIHJ1blNlcnZlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBpc1dpbiA9IG9zLnBsYXRmb3JtKCkgPT09ICd3aW4zMic7XG5cbmFzeW5jIGZ1bmN0aW9uIHJ1bk5wbUluc3RhbGwoY2xlYW46IGJvb2xlYW4pIHtcbiAgaWYgKGNsZWFuKSB7XG4gICAgY29uc3Qgc2VydmVyQ2FjaGUgPSBQYXRoLnJlc29sdmUoY29uZmlnKCkuZGVzdERpciwgJ25wbS1zZXJ2ZXItY2FjaGUnKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhzZXJ2ZXJDYWNoZSkpXG4gICAgICBhd2FpdCBmcy5yZW1vdmUoc2VydmVyQ2FjaGUpO1xuICB9XG5cbiAgY29uZmlnLmNoYW5nZShzZXR0aW5nID0+IHtcbiAgICBzZXR0aW5nWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXS5ucG1SZWdpc3RyeUNhY2hlU2VydmVyID0ge1xuICAgICAgcGF0aDogJy9ucG0nLFxuICAgICAgY2FjaGVEaXI6IHNldHRpbmcuZGVzdERpciArICcvbnBtLXNlcnZlci1jYWNoZScsXG4gICAgICAvLyByZWdpc3RyeTogJ2h0dHBzOi8vcmVnaXN0cnkubnBtLnRhb2Jhby5vcmcvJ1xuICAgICAgcmVnaXN0cnk6ICdodHRwczovL3JlZ2lzdHJ5Lm5wbWpzLm9yZy8nXG4gICAgfTtcbiAgfSk7XG5cbiAgY29uc3Qge3N0YXJ0ZWQsIHNodXRkb3dufSA9IHJ1blNlcnZlcigpO1xuICBhd2FpdCBzdGFydGVkO1xuICBhd2FpdCByeC5vZignbm9kZV9tb2R1bGVzJywgJ3BhY2thZ2UtbG9jay5qc29uJywgJ25wbS1jYWNoZScpLnBpcGUoXG4gICAgb3AubWVyZ2VNYXAoZGlyID0+IHtcbiAgICAgIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGRpcik7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybiBmcy5yZW1vdmUodGFyZ2V0KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIGNvbnN0IGNwID0gc3Bhd24oaXNXaW4gPyAnbnBtLmNtZCcgOiAnbnBtJywgWydpbnN0YWxsJywgJy0tZGRkJ10sIHtcbiAgICBjd2Q6IF9fZGlybmFtZSwgc3RkaW86ICdpbmhlcml0JyxcbiAgICB0aW1lb3V0OiA2NTAwMFxuICB9KTtcblxuICBjb25zdCBlcnJvciQgPSByeC5mcm9tRXZlbnRQYXR0ZXJuPEVycm9yPihcbiAgICBoID0+IGNwLm9uKCdlcnJvcicsIGgpLCBoID0+IGNwLm9mZignZXJyb3InLCBoKVxuICApLnBpcGUoXG4gICAgb3Auc3dpdGNoTWFwKGVyciA9PiByeC50aHJvd0Vycm9yKGVycikpXG4gICk7XG5cbiAgY29uc3QgZXhpdCQgPSByeC5mcm9tRXZlbnRQYXR0ZXJuKGggPT4gY3Aub24oJ2V4aXQnLCBoKSwgaCA9PiBjcC5vZmYoJ2V4aXQnLCBoKSk7XG5cbiAgcmV0dXJuIHJ4Lm1lcmdlKGVycm9yJCwgZXhpdCQsIHJ4LnRpbWVyKDMgKiA2MDAwMCkpLnBpcGUoXG4gICAgb3AudGFrZSgxKSxcbiAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coJ3Rlc3QgbnBtIGluc3RhbGwgZmFpbGVkOicsIGVycik7XG4gICAgICByZXR1cm4gcngub2YoMSk7XG4gICAgfSksXG4gICAgb3AuY29uY2F0TWFwKGFzeW5jICgpID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygna2lsbDogJywgY3Aua2lsbCgnU0lHSU5UJykpO1xuICAgICAgYXdhaXQgc2h1dGRvd24oKTtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygnLS0tLS0tLSBzaHV0ZG93biBodHRwIHNlcnZlciBkb25lIC0tLS0tLS0tLScpO1xuICAgIH0pLFxuICAgIG9wLnRhcCgoKSA9PiBwcm9jZXNzLmV4aXQoMCkpXG4gICkudG9Qcm9taXNlKCk7XG5cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5wbUluc3RhbGwoKSB7XG4gIGF3YWl0IHJ4Lm9mKCdub2RlX21vZHVsZXMnLCAncGFja2FnZS1sb2NrLmpzb24nLCAnbnBtLWNhY2hlJykucGlwZShcbiAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZGlyKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuIGZzLnJlbW92ZSh0YXJnZXQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgY29uc3QgY3AgPSBzcGF3bihpc1dpbiA/ICducG0uY21kJyA6ICducG0nLCBbJ2luc3RhbGwnLCAnLS1kZGQnXSwge1xuICAgIGN3ZDogX19kaXJuYW1lLCBzdGRpbzogJ2luaGVyaXQnLFxuICAgIHRpbWVvdXQ6IDY1MDAwXG4gIH0pO1xuXG4gIGNvbnN0IGVycm9yJCA9IHJ4LmZyb21FdmVudFBhdHRlcm48RXJyb3I+KFxuICAgIGggPT4gY3Aub24oJ2Vycm9yJywgaCksIGggPT4gY3Aub2ZmKCdlcnJvcicsIGgpXG4gICkucGlwZShcbiAgICBvcC5zd2l0Y2hNYXAoZXJyID0+IHJ4LnRocm93RXJyb3IoZXJyKSlcbiAgKTtcblxuICBjb25zdCBleGl0JCA9IHJ4LmZyb21FdmVudFBhdHRlcm4oaCA9PiBjcC5vbignZXhpdCcsIGgpLCBoID0+IGNwLm9mZignZXhpdCcsIGgpKTtcblxuICByZXR1cm4gcngubWVyZ2UoZXJyb3IkLCBleGl0JCwgcngudGltZXIoMyAqIDYwMDAwKSkucGlwZShcbiAgICBvcC50YWtlKDEpLFxuICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZygndGVzdCBucG0gaW5zdGFsbCBmYWlsZWQ6JywgZXJyKTtcbiAgICAgIHJldHVybiByeC5vZigxKTtcbiAgICB9KSxcbiAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdraWxsOiAnLCBjcC5raWxsKCdTSUdJTlQnKSk7XG4gICAgICAvLyBhd2FpdCBzaHV0ZG93bigpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCctLS0tLS0tIHNodXRkb3duIGh0dHAgc2VydmVyIGRvbmUgLS0tLS0tLS0tJyk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRlc3QoKSB7XG4gIHJldHVybiBydW5OcG1JbnN0YWxsKGZhbHNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFuVGVzdCgpIHtcbiAgcmV0dXJuIHJ1bk5wbUluc3RhbGwodHJ1ZSk7XG59XG5cbiJdfQ==