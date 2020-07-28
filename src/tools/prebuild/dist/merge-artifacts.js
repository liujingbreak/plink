"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrBranchName = exports.mergeBack = exports.prepare = void 0;
const tslib_1 = require("tslib");
// tslint:disable: curly
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const path_1 = require("path");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const log = require('log4js').getLogger('merge-artifacts');
const rootDir = path_1.resolve();
const tempDir = path_1.resolve(rootDir, 'dist/merge-temp');
const envs = ['local', 'dev', 'test', 'stage', 'prod'];
function prepare() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const setting = __api_1.default.config.get(__api_1.default.packageName);
        let releaseBranch = setting.prebuildReleaseBranch;
        const releaseRemote = setting.prebuildGitRemote;
        // await checkRemote();
        yield process_utils_1.spawn('git', 'fetch', releaseRemote, { cwd: rootDir }).promise;
        const currBranch = yield getCurrBranchName();
        if (currBranch === releaseBranch) {
            // tslint:disable-next-line: no-console
            console.log('Current branch is release-server which should not be your build targeting branch,\nplease checkout another branch to procede!');
            throw new Error('please checkout another branch to procede!');
        }
        try {
            yield process_utils_1.spawn('git', 'branch', '-D', releaseBranch, { cwd: rootDir }).promise;
        }
        catch (e) { }
        yield cleanupRepo();
        yield process_utils_1.spawn('git', 'checkout', '-b', releaseBranch, releaseRemote + '/' + releaseBranch, { cwd: rootDir }).promise;
        if (fs_extra_1.default.existsSync(tempDir)) {
            fs_extra_1.default.removeSync(tempDir);
        }
        fs_extra_1.default.mkdirpSync(tempDir);
        for (const env of envs) {
            mvDir('install-' + env);
            mvDir('server-content-' + env);
            const checksumFile = path_1.resolve(rootDir, `checksum.${env}.json`);
            if (fs_extra_1.default.existsSync(checksumFile)) {
                const newName = path_1.resolve(tempDir, path_1.basename(checksumFile));
                fs_extra_1.default.renameSync(checksumFile, newName);
            }
        }
        function mvDir(targetDirName) {
            const dir = path_1.resolve(rootDir, targetDirName);
            if (fs_extra_1.default.existsSync(dir)) {
                const newName = path_1.resolve(tempDir, targetDirName);
                log.info(`move ${dir} to ${newName}`);
                fs_extra_1.default.renameSync(dir, newName);
            }
        }
        yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
    });
}
exports.prepare = prepare;
function cleanupRepo() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        try {
            yield process_utils_1.spawn('git', 'reset', '--hard', 'HEAD', { cwd: rootDir }).promise;
        }
        catch (e) {
        }
        try {
            yield process_utils_1.spawn('git', 'clean', '-f', '-d', { cwd: rootDir }).promise;
        }
        catch (e) {
        }
    });
}
function mergeBack() {
    log.info('merge artifacts');
    for (const env of envs) {
        mergeDir('install-' + env);
        mergeDir('server-content-' + env);
    }
    function mergeDir(targetDirName) {
        const dir = path_1.resolve(tempDir, targetDirName);
        if (fs_extra_1.default.existsSync(dir)) {
            const tempFiles = fs_extra_1.default.readdirSync(dir);
            const installDir = path_1.resolve(rootDir, targetDirName);
            fs_extra_1.default.mkdirpSync(installDir);
            for (const file of tempFiles) {
                if (fs_extra_1.default.existsSync(path_1.resolve(installDir, file))) {
                    log.info(`${path_1.resolve(installDir, file)} exists, delete`);
                    fs_extra_1.default.removeSync(path_1.resolve(installDir, file));
                }
                fs_extra_1.default.renameSync(path_1.resolve(dir, file), path_1.resolve(installDir, file));
                log.info(`move ${path_1.resolve(dir, file)} to ${path_1.resolve(installDir, file)}`);
            }
        }
    }
    const files = fs_extra_1.default.readdirSync(tempDir);
    for (const file of files) {
        if (!/^checksum\.[^.]+\.json$/.test(file)) {
            continue;
        }
        const existing = path_1.resolve(rootDir, file);
        if (fs_extra_1.default.existsSync(existing))
            fs_extra_1.default.removeSync(existing);
        fs_extra_1.default.renameSync(path_1.resolve(tempDir, file), existing);
    }
}
exports.mergeBack = mergeBack;
function getCurrBranchName() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const res = yield process_utils_1.spawn('git', 'status', { cwd: rootDir, silent: true }).promise;
        let currBranch;
        [/^On branch (.*)$/m, /^HEAD detached at (\S+)$/m].some(reg => {
            const m = reg.exec(res);
            if (m) {
                currBranch = m[1];
                return true;
            }
            return false;
        });
        if (currBranch == null) {
            throw new Error(`Can not understand which is current branch:\n ${res}`);
        }
        return currBranch;
    });
}
exports.getCurrBranchName = getCurrBranchName;

//# sourceMappingURL=merge-artifacts.js.map
