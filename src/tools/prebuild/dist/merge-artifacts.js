"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
// export async function checkRemote() {
//   const releaseRemote = api.config.get(api.packageName).prebuildGitRemote;
//   const remoteList = await spawn('git', 'remote', '-v', {cwd: rootDir, silent: true}).promise;
//   const lines = remoteList.split('\n');
//   const remoteMap = new Map<string, string>();
//   for (const line of lines) {
//     if (line.trim().length === 0) {
//       continue;
//     }
//     const cols = line.split(/\s+/);
//     remoteMap.set(cols[0], cols[1]);
//   }
//   // tslint:disable-next-line: no-console
//   console.log('Your git remotes are: ', Array.from(remoteMap.keys()).map(key => `${key}: ${remoteMap.get(key)}`));
//   const officeGitUrl = '.bkjk-inc.com/';
//   if (!remoteMap.has(releaseRemote) || remoteMap.get(releaseRemote)!.indexOf(officeGitUrl) < 0) {
//     // tslint:disable-next-line: no-console
//     console.log(`Your git remote must have a "${releaseRemote}" pointing to `, officeGitUrl);
//     throw new Error(`Your git remote must have a "${releaseRemote}" pointing to ` + officeGitUrl);
//   }
// }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvbWVyZ2UtYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdCQUF3QjtBQUN4QiwwRUFBNkQ7QUFDN0QsK0JBQXVDO0FBQ3ZDLGdFQUEwQjtBQUMxQiwwREFBd0I7QUFFeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTNELE1BQU0sT0FBTyxHQUFHLGNBQU8sRUFBRSxDQUFDO0FBQzFCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUVwRCxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUV2RCxTQUFzQixPQUFPOztRQUMzQixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEQsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1FBQ2xELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztRQUVoRCx1QkFBdUI7UUFFdkIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRW5FLE1BQU0sVUFBVSxHQUFHLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLFVBQVUsS0FBSyxhQUFhLEVBQUU7WUFDaEMsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0hBQStILENBQUMsQ0FBQztZQUM3SSxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDL0Q7UUFFRCxJQUFJO1lBQ0YsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztTQUMzRTtRQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUU7UUFDZCxNQUFNLFdBQVcsRUFBRSxDQUFDO1FBRXBCLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsYUFBYSxHQUFHLEdBQUcsR0FBRyxhQUFhLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDakgsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUMxQixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN4QjtRQUNELGtCQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1lBQ3RCLE1BQU0sR0FBRyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQy9DLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3RCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3RDLGtCQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQzthQUM3QjtZQUVELE1BQU0sWUFBWSxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxHQUFHLE9BQU8sQ0FBQyxDQUFDO1lBQzlELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLEVBQUU7Z0JBQy9CLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsZUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELGtCQUFFLENBQUMsVUFBVSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQzthQUN0QztTQUNGO1FBQ0QsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3JFLENBQUM7Q0FBQTtBQTFDRCwwQkEwQ0M7QUFFRCxTQUFlLFdBQVc7O1FBQ3hCLElBQUk7WUFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQ3ZFO1FBQUMsT0FBTyxDQUFDLEVBQUU7U0FDWDtRQUNELElBQUk7WUFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQ2pFO1FBQUMsT0FBTyxDQUFDLEVBQUU7U0FDWDtJQUNILENBQUM7Q0FBQTtBQUVELFNBQWdCLFNBQVM7SUFDdkIsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQzVCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFO1FBQ3RCLE1BQU0sR0FBRyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEIsTUFBTSxTQUFTLEdBQUcsa0JBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEMsTUFBTSxVQUFVLEdBQUcsY0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDdEQsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUIsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUU7Z0JBQzVCLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFO29CQUM1QyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztvQkFDeEQsa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUMxQztnQkFDRCxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFPLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLGNBQU8sQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLGNBQU8sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sY0FBTyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDeEU7U0FDRjtLQUNGO0lBRUQsTUFBTSxLQUFLLEdBQUcsa0JBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7UUFDeEIsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN6QyxTQUFTO1NBQ1Y7UUFDRCxNQUFNLFFBQVEsR0FBRyxjQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ3pCLGtCQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDakQ7QUFDSCxDQUFDO0FBN0JELDhCQTZCQztBQUVELHdDQUF3QztBQUN4Qyw2RUFBNkU7QUFDN0UsaUdBQWlHO0FBQ2pHLDBDQUEwQztBQUMxQyxpREFBaUQ7QUFDakQsZ0NBQWdDO0FBQ2hDLHNDQUFzQztBQUN0QyxrQkFBa0I7QUFDbEIsUUFBUTtBQUNSLHNDQUFzQztBQUN0Qyx1Q0FBdUM7QUFDdkMsTUFBTTtBQUNOLDRDQUE0QztBQUM1QyxxSEFBcUg7QUFDckgsMkNBQTJDO0FBQzNDLG9HQUFvRztBQUNwRyw4Q0FBOEM7QUFDOUMsZ0dBQWdHO0FBQ2hHLHFHQUFxRztBQUNyRyxNQUFNO0FBQ04sSUFBSTtBQUVKLFNBQXNCLGlCQUFpQjs7UUFDckMsTUFBTSxHQUFHLEdBQUcsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMvRSxJQUFJLFVBQThCLENBQUM7UUFDbkMsQ0FBQyxtQkFBbUIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1RCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxFQUFFO2dCQUNMLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDekU7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQUE7QUFmRCw4Q0FlQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvbWVyZ2UtYXJ0aWZhY3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IGN1cmx5XG5pbXBvcnQge3NwYXdufSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge3Jlc29sdmUsIGJhc2VuYW1lfSBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdtZXJnZS1hcnRpZmFjdHMnKTtcblxuY29uc3Qgcm9vdERpciA9IHJlc29sdmUoKTtcbmNvbnN0IHRlbXBEaXIgPSByZXNvbHZlKHJvb3REaXIsICdkaXN0L21lcmdlLXRlbXAnKTtcblxuY29uc3QgZW52cyA9IFsnbG9jYWwnLCAnZGV2JywgJ3Rlc3QnLCAnc3RhZ2UnLCAncHJvZCddO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlcGFyZSgpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG4gIGxldCByZWxlYXNlQnJhbmNoID0gc2V0dGluZy5wcmVidWlsZFJlbGVhc2VCcmFuY2g7XG4gIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBzZXR0aW5nLnByZWJ1aWxkR2l0UmVtb3RlO1xuXG4gIC8vIGF3YWl0IGNoZWNrUmVtb3RlKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdmZXRjaCcsIHJlbGVhc2VSZW1vdGUsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChjdXJyQnJhbmNoID09PSByZWxlYXNlQnJhbmNoKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0N1cnJlbnQgYnJhbmNoIGlzIHJlbGVhc2Utc2VydmVyIHdoaWNoIHNob3VsZCBub3QgYmUgeW91ciBidWlsZCB0YXJnZXRpbmcgYnJhbmNoLFxcbnBsZWFzZSBjaGVja291dCBhbm90aGVyIGJyYW5jaCB0byBwcm9jZWRlIScpO1xuICAgIHRocm93IG5ldyBFcnJvcigncGxlYXNlIGNoZWNrb3V0IGFub3RoZXIgYnJhbmNoIHRvIHByb2NlZGUhJyk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIGF3YWl0IGNsZWFudXBSZXBvKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsIHJlbGVhc2VSZW1vdGUgKyAnLycgKyByZWxlYXNlQnJhbmNoLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModGVtcERpcikpIHtcbiAgICBmcy5yZW1vdmVTeW5jKHRlbXBEaXIpO1xuICB9XG4gIGZzLm1rZGlycFN5bmModGVtcERpcik7XG4gIGZvciAoY29uc3QgZW52IG9mIGVudnMpIHtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHJvb3REaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIGNvbnN0IG5ld05hbWUgPSByZXNvbHZlKHRlbXBEaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgICAgbG9nLmluZm8oYG1vdmUgJHtkaXJ9IHRvICR7bmV3TmFtZX1gKTtcbiAgICAgIGZzLnJlbmFtZVN5bmMoZGlyLCBuZXdOYW1lKTtcbiAgICB9XG5cbiAgICBjb25zdCBjaGVja3N1bUZpbGUgPSByZXNvbHZlKHJvb3REaXIsIGBjaGVja3N1bS4ke2Vudn0uanNvbmApO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICAgIGNvbnN0IG5ld05hbWUgPSByZXNvbHZlKHRlbXBEaXIsIGJhc2VuYW1lKGNoZWNrc3VtRmlsZSkpO1xuICAgICAgZnMucmVuYW1lU3luYyhjaGVja3N1bUZpbGUsIG5ld05hbWUpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBSZXBvKCkge1xuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncmVzZXQnLCAnLS1oYXJkJywgJ0hFQUQnLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICB9XG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjbGVhbicsICctZicsICctZCcsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlQmFjaygpIHtcbiAgbG9nLmluZm8oJ21lcmdlIGFydGlmYWN0cycpO1xuICBmb3IgKGNvbnN0IGVudiBvZiBlbnZzKSB7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZSh0ZW1wRGlyLCAnaW5zdGFsbC0nICsgZW52KTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICBjb25zdCB0ZW1wRmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICAgICAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUocm9vdERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHRlbXBGaWxlcykge1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAke3Jlc29sdmUoaW5zdGFsbERpciwgZmlsZSl9IGV4aXN0cywgZGVsZXRlYCk7XG4gICAgICAgICAgZnMucmVtb3ZlU3luYyhyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKTtcbiAgICAgICAgfVxuICAgICAgICBmcy5yZW5hbWVTeW5jKHJlc29sdmUoZGlyLCBmaWxlKSwgcmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKSk7XG4gICAgICAgIGxvZy5pbmZvKGBtb3ZlICR7cmVzb2x2ZShkaXIsIGZpbGUpfSB0byAke3Jlc29sdmUoaW5zdGFsbERpciwgZmlsZSl9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyh0ZW1wRGlyKTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCEvXmNoZWNrc3VtXFwuW14uXStcXC5qc29uJC8udGVzdChmaWxlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGV4aXN0aW5nID0gcmVzb2x2ZShyb290RGlyLCBmaWxlKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhleGlzdGluZykpXG4gICAgICBmcy5yZW1vdmVTeW5jKGV4aXN0aW5nKTtcbiAgICBmcy5yZW5hbWVTeW5jKHJlc29sdmUodGVtcERpciwgZmlsZSksIGV4aXN0aW5nKTtcbiAgfVxufVxuXG4vLyBleHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hlY2tSZW1vdGUoKSB7XG4vLyAgIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpLnByZWJ1aWxkR2l0UmVtb3RlO1xuLy8gICBjb25zdCByZW1vdGVMaXN0ID0gYXdhaXQgc3Bhd24oJ2dpdCcsICdyZW1vdGUnLCAnLXYnLCB7Y3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWV9KS5wcm9taXNlO1xuLy8gICBjb25zdCBsaW5lcyA9IHJlbW90ZUxpc3Quc3BsaXQoJ1xcbicpO1xuLy8gICBjb25zdCByZW1vdGVNYXAgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuLy8gICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbi8vICAgICBpZiAobGluZS50cmltKCkubGVuZ3RoID09PSAwKSB7XG4vLyAgICAgICBjb250aW51ZTtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgY29scyA9IGxpbmUuc3BsaXQoL1xccysvKTtcbi8vICAgICByZW1vdGVNYXAuc2V0KGNvbHNbMF0sIGNvbHNbMV0pO1xuLy8gICB9XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICBjb25zb2xlLmxvZygnWW91ciBnaXQgcmVtb3RlcyBhcmU6ICcsIEFycmF5LmZyb20ocmVtb3RlTWFwLmtleXMoKSkubWFwKGtleSA9PiBgJHtrZXl9OiAke3JlbW90ZU1hcC5nZXQoa2V5KX1gKSk7XG4vLyAgIGNvbnN0IG9mZmljZUdpdFVybCA9ICcuYmtqay1pbmMuY29tLyc7XG4vLyAgIGlmICghcmVtb3RlTWFwLmhhcyhyZWxlYXNlUmVtb3RlKSB8fCByZW1vdGVNYXAuZ2V0KHJlbGVhc2VSZW1vdGUpIS5pbmRleE9mKG9mZmljZUdpdFVybCkgPCAwKSB7XG4vLyAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4vLyAgICAgY29uc29sZS5sb2coYFlvdXIgZ2l0IHJlbW90ZSBtdXN0IGhhdmUgYSBcIiR7cmVsZWFzZVJlbW90ZX1cIiBwb2ludGluZyB0byBgLCBvZmZpY2VHaXRVcmwpO1xuLy8gICAgIHRocm93IG5ldyBFcnJvcihgWW91ciBnaXQgcmVtb3RlIG11c3QgaGF2ZSBhIFwiJHtyZWxlYXNlUmVtb3RlfVwiIHBvaW50aW5nIHRvIGAgKyBvZmZpY2VHaXRVcmwpO1xuLy8gICB9XG4vLyB9XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyQnJhbmNoTmFtZSgpIHtcbiAgY29uc3QgcmVzID0gYXdhaXQgc3Bhd24oJ2dpdCcsICdzdGF0dXMnLCB7Y3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWV9KS5wcm9taXNlO1xuICBsZXQgY3VyckJyYW5jaDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBbL15PbiBicmFuY2ggKC4qKSQvbSwgL15IRUFEIGRldGFjaGVkIGF0IChcXFMrKSQvbV0uc29tZShyZWcgPT4ge1xuICAgIGNvbnN0IG0gPSByZWcuZXhlYyhyZXMpO1xuICAgIGlmIChtKSB7XG4gICAgICBjdXJyQnJhbmNoID0gbVsxXTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBpZiAoY3VyckJyYW5jaCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHVuZGVyc3RhbmQgd2hpY2ggaXMgY3VycmVudCBicmFuY2g6XFxuICR7cmVzfWApO1xuICB9XG4gIHJldHVybiBjdXJyQnJhbmNoO1xufVxuIl19
