"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: curly
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const path_1 = require("path");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const log = require('log4js').getLogger('merge-artifacts');
const rootDir = path_1.resolve();
const tempDir = path_1.resolve(rootDir, 'dist/merge-temp');
const envs = ['local', 'dev', 'test', 'stage', 'prod'];
function prepare() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        yield checkRemote();
        yield process_utils_1.spawn('git', 'fetch', 'origin', { cwd: rootDir }).promise;
        const currBranch = yield getCurrBranchName();
        if (currBranch === 'release-server') {
            // tslint:disable-next-line: no-console
            console.log('Current branch is release-server which should not be your build targeting branch,\nplease checkout another branch to procede!');
            throw new Error('please checkout another branch to procede!');
        }
        try {
            yield process_utils_1.spawn('git', 'branch', '-D', 'release-server', { cwd: rootDir }).promise;
        }
        catch (e) { }
        yield cleanupRepo();
        yield process_utils_1.spawn('git', 'checkout', '-b', 'release-server', 'origin/release-server', { cwd: rootDir }).promise;
        if (fs_extra_1.default.existsSync(tempDir)) {
            fs_extra_1.default.removeSync(tempDir);
        }
        fs_extra_1.default.mkdirpSync(tempDir);
        for (const env of envs) {
            const dir = path_1.resolve(rootDir, 'install-' + env);
            if (fs_extra_1.default.existsSync(dir)) {
                const newName = path_1.resolve(tempDir, 'install-' + env);
                log.info(`move ${dir} to ${newName}`);
                fs_extra_1.default.renameSync(dir, newName);
            }
            const checksumFile = path_1.resolve(rootDir, `checksum.${env}.json`);
            if (fs_extra_1.default.existsSync(checksumFile)) {
                const newName = path_1.resolve(tempDir, path_1.basename(checksumFile));
                fs_extra_1.default.renameSync(checksumFile, newName);
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
        const dir = path_1.resolve(tempDir, 'install-' + env);
        if (fs_extra_1.default.existsSync(dir)) {
            const tempFiles = fs_extra_1.default.readdirSync(dir);
            const installDir = path_1.resolve(rootDir, 'install-' + env);
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
function checkRemote() {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const remoteList = yield process_utils_1.spawn('git', 'remote', '-v', { cwd: rootDir, silent: true }).promise;
        const lines = remoteList.split('\n');
        const remoteMap = new Map();
        for (const line of lines) {
            if (line.trim().length === 0) {
                continue;
            }
            const cols = line.split(/\s+/);
            remoteMap.set(cols[0], cols[1]);
        }
        // tslint:disable-next-line: no-console
        console.log('Your git remotes are: ', Array.from(remoteMap.keys()).map(key => `${key}: ${remoteMap.get(key)}`));
        const officeGitUrl = '.bkjk-inc.com/';
        if (!remoteMap.has('origin') || remoteMap.get('origin').indexOf(officeGitUrl) < 0) {
            // tslint:disable-next-line: no-console
            console.log('Your git remote must have a "origin" pointing to ', officeGitUrl);
            throw new Error('Your git remote must has a "origin" pointing to ' + officeGitUrl);
        }
    });
}
exports.checkRemote = checkRemote;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvbWVyZ2UtYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdCQUF3QjtBQUN4QiwwRUFBNkQ7QUFDN0QsK0JBQXVDO0FBQ3ZDLGdFQUEwQjtBQUMxQixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFFM0QsTUFBTSxPQUFPLEdBQUcsY0FBTyxFQUFFLENBQUM7QUFDMUIsTUFBTSxPQUFPLEdBQUcsY0FBTyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBRXBELE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBRXZELFNBQXNCLE9BQU87O1FBQzNCLE1BQU0sV0FBVyxFQUFFLENBQUM7UUFFcEIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRTlELE1BQU0sVUFBVSxHQUFHLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLFVBQVUsS0FBSyxnQkFBZ0IsRUFBRTtZQUNuQyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrSEFBK0gsQ0FBQyxDQUFDO1lBQzdJLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztTQUMvRDtRQUVELElBQUk7WUFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDOUU7UUFBQyxPQUFPLENBQUMsRUFBRSxHQUFFO1FBQ2QsTUFBTSxXQUFXLEVBQUUsQ0FBQztRQUVwQixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsdUJBQXVCLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDeEcsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMxQixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN4QjtRQUNELGtCQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ3RCLE1BQU0sR0FBRyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQy9DLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLGtCQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUM3QjtZQUVELE1BQU0sWUFBWSxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDO1lBQzlELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsZUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELGtCQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQzthQUN0QztTQUNGO1FBQ0QsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3JFLENBQUM7Q0FBQTtBQXRDRCwwQkFzQ0M7QUFFRCxTQUFlLFdBQVc7O1FBQ3hCLElBQUk7WUFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQ3ZFO1FBQUMsT0FBTyxDQUFDLEVBQUU7U0FDWDtRQUNELElBQUk7WUFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQ2pFO1FBQUMsT0FBTyxDQUFDLEVBQUU7U0FDWDtJQUNILENBQUM7Q0FBQTtBQUVELFNBQWdCLFNBQVM7SUFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1FBQ3RCLE1BQU0sR0FBRyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxTQUFTLEdBQUcsa0JBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEMsTUFBTSxVQUFVLEdBQUcsY0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDdEQsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUIsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUU7Z0JBQzVCLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDeEQsa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUMxQztnQkFDRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLGNBQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLGNBQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDeEU7U0FDRjtLQUNGO0lBRUQsTUFBTSxLQUFLLEdBQUcsa0JBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDeEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6QyxTQUFTO1NBQ1Y7UUFDRCxNQUFNLFFBQVEsR0FBRyxjQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ3pCLGtCQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDakQ7QUFDSCxDQUFDO0FBN0JELDhCQTZCQztBQUVELFNBQXNCLFdBQVc7O1FBQy9CLE1BQU0sVUFBVSxHQUFHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQzVGLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDNUMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7WUFDeEIsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtnQkFDNUIsU0FBUzthQUNWO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMvQixTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztTQUNqQztRQUNELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEtBQUssU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNoSCxNQUFNLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQztRQUN0QyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEYsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbURBQW1ELEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDL0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxrREFBa0QsR0FBRyxZQUFZLENBQUMsQ0FBQztTQUNwRjtJQUNILENBQUM7Q0FBQTtBQW5CRCxrQ0FtQkM7QUFFRCxTQUFzQixpQkFBaUI7O1FBQ3JDLE1BQU0sR0FBRyxHQUFHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDL0UsSUFBSSxVQUE4QixDQUFDO1FBQ25DLENBQUMsbUJBQW1CLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDNUQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsRUFBRTtnQkFDTCxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksVUFBVSxJQUFJLElBQUksRUFBRTtZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3pFO1FBQ0QsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBZkQsOENBZUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L21lcmdlLWFydGlmYWN0cy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBjdXJseVxuaW1wb3J0IHtzcGF3bn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHtyZXNvbHZlLCBiYXNlbmFtZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdtZXJnZS1hcnRpZmFjdHMnKTtcblxuY29uc3Qgcm9vdERpciA9IHJlc29sdmUoKTtcbmNvbnN0IHRlbXBEaXIgPSByZXNvbHZlKHJvb3REaXIsICdkaXN0L21lcmdlLXRlbXAnKTtcblxuY29uc3QgZW52cyA9IFsnbG9jYWwnLCAnZGV2JywgJ3Rlc3QnLCAnc3RhZ2UnLCAncHJvZCddO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlcGFyZSgpIHtcbiAgYXdhaXQgY2hlY2tSZW1vdGUoKTtcblxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2ZldGNoJywgJ29yaWdpbicsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChjdXJyQnJhbmNoID09PSAncmVsZWFzZS1zZXJ2ZXInKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0N1cnJlbnQgYnJhbmNoIGlzIHJlbGVhc2Utc2VydmVyIHdoaWNoIHNob3VsZCBub3QgYmUgeW91ciBidWlsZCB0YXJnZXRpbmcgYnJhbmNoLFxcbnBsZWFzZSBjaGVja291dCBhbm90aGVyIGJyYW5jaCB0byBwcm9jZWRlIScpO1xuICAgIHRocm93IG5ldyBFcnJvcigncGxlYXNlIGNoZWNrb3V0IGFub3RoZXIgYnJhbmNoIHRvIHByb2NlZGUhJyk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgJ3JlbGVhc2Utc2VydmVyJywge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIGF3YWl0IGNsZWFudXBSZXBvKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsICdyZWxlYXNlLXNlcnZlcicsICdvcmlnaW4vcmVsZWFzZS1zZXJ2ZXInLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModGVtcERpcikpIHtcbiAgICBmcy5yZW1vdmVTeW5jKHRlbXBEaXIpO1xuICB9XG4gIGZzLm1rZGlycFN5bmModGVtcERpcik7XG4gIGZvciAoY29uc3QgZW52IG9mIGVudnMpIHtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHJvb3REaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIGNvbnN0IG5ld05hbWUgPSByZXNvbHZlKHRlbXBEaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgICAgbG9nLmluZm8oYG1vdmUgJHtkaXJ9IHRvICR7bmV3TmFtZX1gKTtcbiAgICAgIGZzLnJlbmFtZVN5bmMoZGlyLCBuZXdOYW1lKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja3N1bUZpbGUgPSByZXNvbHZlKHJvb3REaXIsIGBjaGVja3N1bS4ke2Vudn0uanNvbmApO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICAgIGNvbnN0IG5ld05hbWUgPSByZXNvbHZlKHRlbXBEaXIsIGJhc2VuYW1lKGNoZWNrc3VtRmlsZSkpO1xuICAgICAgZnMucmVuYW1lU3luYyhjaGVja3N1bUZpbGUsIG5ld05hbWUpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBSZXBvKCkge1xuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncmVzZXQnLCAnLS1oYXJkJywgJ0hFQUQnLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICB9XG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjbGVhbicsICctZicsICctZCcsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlQmFjaygpIHtcbiAgbG9nLmluZm8oJ21lcmdlIGFydGlmYWN0cycpO1xuICBmb3IgKGNvbnN0IGVudiBvZiBlbnZzKSB7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZSh0ZW1wRGlyLCAnaW5zdGFsbC0nICsgZW52KTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICBjb25zdCB0ZW1wRmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICAgICAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUocm9vdERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHRlbXBGaWxlcykge1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAke3Jlc29sdmUoaW5zdGFsbERpciwgZmlsZSl9IGV4aXN0cywgZGVsZXRlYCk7XG4gICAgICAgICAgZnMucmVtb3ZlU3luYyhyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKTtcbiAgICAgICAgfVxuICAgICAgICBmcy5yZW5hbWVTeW5jKHJlc29sdmUoZGlyLCBmaWxlKSwgcmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKSk7XG4gICAgICAgIGxvZy5pbmZvKGBtb3ZlICR7cmVzb2x2ZShkaXIsIGZpbGUpfSB0byAke3Jlc29sdmUoaW5zdGFsbERpciwgZmlsZSl9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyh0ZW1wRGlyKTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCEvXmNoZWNrc3VtXFwuW14uXStcXC5qc29uJC8udGVzdChmaWxlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGV4aXN0aW5nID0gcmVzb2x2ZShyb290RGlyLCBmaWxlKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhleGlzdGluZykpXG4gICAgICBmcy5yZW1vdmVTeW5jKGV4aXN0aW5nKTtcbiAgICBmcy5yZW5hbWVTeW5jKHJlc29sdmUodGVtcERpciwgZmlsZSksIGV4aXN0aW5nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tSZW1vdGUoKSB7XG4gIGNvbnN0IHJlbW90ZUxpc3QgPSBhd2FpdCBzcGF3bignZ2l0JywgJ3JlbW90ZScsICctdicsIHtjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZX0pLnByb21pc2U7XG4gIGNvbnN0IGxpbmVzID0gcmVtb3RlTGlzdC5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IHJlbW90ZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgIGlmIChsaW5lLnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBjb2xzID0gbGluZS5zcGxpdCgvXFxzKy8pO1xuICAgIHJlbW90ZU1hcC5zZXQoY29sc1swXSwgY29sc1sxXSk7XG4gIH1cbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdZb3VyIGdpdCByZW1vdGVzIGFyZTogJywgQXJyYXkuZnJvbShyZW1vdGVNYXAua2V5cygpKS5tYXAoa2V5ID0+IGAke2tleX06ICR7cmVtb3RlTWFwLmdldChrZXkpfWApKTtcbiAgY29uc3Qgb2ZmaWNlR2l0VXJsID0gJy5ia2prLWluYy5jb20vJztcbiAgaWYgKCFyZW1vdGVNYXAuaGFzKCdvcmlnaW4nKSB8fCByZW1vdGVNYXAuZ2V0KCdvcmlnaW4nKSEuaW5kZXhPZihvZmZpY2VHaXRVcmwpIDwgMCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdZb3VyIGdpdCByZW1vdGUgbXVzdCBoYXZlIGEgXCJvcmlnaW5cIiBwb2ludGluZyB0byAnLCBvZmZpY2VHaXRVcmwpO1xuICAgIHRocm93IG5ldyBFcnJvcignWW91ciBnaXQgcmVtb3RlIG11c3QgaGFzIGEgXCJvcmlnaW5cIiBwb2ludGluZyB0byAnICsgb2ZmaWNlR2l0VXJsKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q3VyckJyYW5jaE5hbWUoKSB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IHNwYXduKCdnaXQnLCAnc3RhdHVzJywge2N3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlfSkucHJvbWlzZTtcbiAgbGV0IGN1cnJCcmFuY2g6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgWy9eT24gYnJhbmNoICguKikkL20sIC9eSEVBRCBkZXRhY2hlZCBhdCAoXFxTKykkL21dLnNvbWUocmVnID0+IHtcbiAgICBjb25zdCBtID0gcmVnLmV4ZWMocmVzKTtcbiAgICBpZiAobSkge1xuICAgICAgY3VyckJyYW5jaCA9IG1bMV07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgaWYgKGN1cnJCcmFuY2ggPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCB1bmRlcnN0YW5kIHdoaWNoIGlzIGN1cnJlbnQgYnJhbmNoOlxcbiAke3Jlc31gKTtcbiAgfVxuICByZXR1cm4gY3VyckJyYW5jaDtcbn1cbiJdfQ==
