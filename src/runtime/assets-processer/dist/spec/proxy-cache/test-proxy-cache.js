"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTest = exports.test = exports.npmInstall = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const os_1 = tslib_1.__importDefault(require("os"));
const path_1 = tslib_1.__importDefault(require("path"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
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
//# sourceMappingURL=test-proxy-cache.js.map