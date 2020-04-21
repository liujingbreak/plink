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
        yield checkRemote();
        yield process_utils_1.spawn('git', 'fetch', 'origin', { cwd: rootDir }).promise;
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
        yield process_utils_1.spawn('git', 'checkout', '-b', releaseBranch, 'origin/' + releaseBranch, { cwd: rootDir }).promise;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvbWVyZ2UtYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHdCQUF3QjtBQUN4QiwwRUFBNkQ7QUFDN0QsK0JBQXVDO0FBQ3ZDLGdFQUEwQjtBQUMxQiwwREFBd0I7QUFFeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRTNELE1BQU0sT0FBTyxHQUFHLGNBQU8sRUFBRSxDQUFDO0FBQzFCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUVwRCxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUV2RCxTQUFzQixPQUFPOztRQUMzQixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDaEQsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1FBRWxELE1BQU0sV0FBVyxFQUFFLENBQUM7UUFFcEIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRTlELE1BQU0sVUFBVSxHQUFHLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLFVBQVUsS0FBSyxhQUFhLEVBQUU7WUFDaEMsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0hBQStILENBQUMsQ0FBQztZQUM3SSxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDL0Q7UUFFRCxJQUFJO1lBQ0YsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVB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QUMsQ0FBQztZQUMvRSxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxHQUFHLFlBQVksQ0FBQyxDQUFDO1NBQ3BGO0lBQ0gsQ0FBQztDQUFBO0FBbkJELGtDQW1CQztBQUVELFNBQXNCLGlCQUFpQjs7UUFDckMsTUFBTSxHQUFHLEdBQUcsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMvRSxJQUFJLFVBQThCLENBQUM7UUFDbkMsQ0FBQyxtQkFBbUIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1RCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxFQUFFO2dCQUNMLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDekU7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQUE7QUFmRCw4Q0FlQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvbWVyZ2UtYXJ0aWZhY3RzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IGN1cmx5XG5pbXBvcnQge3NwYXdufSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge3Jlc29sdmUsIGJhc2VuYW1lfSBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdtZXJnZS1hcnRpZmFjdHMnKTtcblxuY29uc3Qgcm9vdERpciA9IHJlc29sdmUoKTtcbmNvbnN0IHRlbXBEaXIgPSByZXNvbHZlKHJvb3REaXIsICdkaXN0L21lcmdlLXRlbXAnKTtcblxuY29uc3QgZW52cyA9IFsnbG9jYWwnLCAnZGV2JywgJ3Rlc3QnLCAnc3RhZ2UnLCAncHJvZCddO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlcGFyZSgpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG4gIGxldCByZWxlYXNlQnJhbmNoID0gc2V0dGluZy5wcmVidWlsZFJlbGVhc2VCcmFuY2g7XG5cbiAgYXdhaXQgY2hlY2tSZW1vdGUoKTtcblxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2ZldGNoJywgJ29yaWdpbicsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChjdXJyQnJhbmNoID09PSByZWxlYXNlQnJhbmNoKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0N1cnJlbnQgYnJhbmNoIGlzIHJlbGVhc2Utc2VydmVyIHdoaWNoIHNob3VsZCBub3QgYmUgeW91ciBidWlsZCB0YXJnZXRpbmcgYnJhbmNoLFxcbnBsZWFzZSBjaGVja291dCBhbm90aGVyIGJyYW5jaCB0byBwcm9jZWRlIScpO1xuICAgIHRocm93IG5ldyBFcnJvcigncGxlYXNlIGNoZWNrb3V0IGFub3RoZXIgYnJhbmNoIHRvIHByb2NlZGUhJyk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIGF3YWl0IGNsZWFudXBSZXBvKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsICdvcmlnaW4vJyArIHJlbGVhc2VCcmFuY2gsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0ZW1wRGlyKSkge1xuICAgIGZzLnJlbW92ZVN5bmModGVtcERpcik7XG4gIH1cbiAgZnMubWtkaXJwU3luYyh0ZW1wRGlyKTtcbiAgZm9yIChjb25zdCBlbnYgb2YgZW52cykge1xuICAgIGNvbnN0IGRpciA9IHJlc29sdmUocm9vdERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgY29uc3QgbmV3TmFtZSA9IHJlc29sdmUodGVtcERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgICBsb2cuaW5mbyhgbW92ZSAke2Rpcn0gdG8gJHtuZXdOYW1lfWApO1xuICAgICAgZnMucmVuYW1lU3luYyhkaXIsIG5ld05hbWUpO1xuICAgIH1cblxuICAgIGNvbnN0IGNoZWNrc3VtRmlsZSA9IHJlc29sdmUocm9vdERpciwgYGNoZWNrc3VtLiR7ZW52fS5qc29uYCk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2hlY2tzdW1GaWxlKSkge1xuICAgICAgY29uc3QgbmV3TmFtZSA9IHJlc29sdmUodGVtcERpciwgYmFzZW5hbWUoY2hlY2tzdW1GaWxlKSk7XG4gICAgICBmcy5yZW5hbWVTeW5jKGNoZWNrc3VtRmlsZSwgbmV3TmFtZSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2xlYW51cFJlcG8oKSB7XG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdyZXNldCcsICctLWhhcmQnLCAnSEVBRCcsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2NsZWFuJywgJy1mJywgJy1kJywge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VCYWNrKCkge1xuICBsb2cuaW5mbygnbWVyZ2UgYXJ0aWZhY3RzJyk7XG4gIGZvciAoY29uc3QgZW52IG9mIGVudnMpIHtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHRlbXBEaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIGNvbnN0IHRlbXBGaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGRpcik7XG4gICAgICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZShyb290RGlyLCAnaW5zdGFsbC0nICsgZW52KTtcbiAgICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdGVtcEZpbGVzKSB7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHJlc29sdmUoaW5zdGFsbERpciwgZmlsZSkpKSB7XG4gICAgICAgICAgbG9nLmluZm8oYCR7cmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKX0gZXhpc3RzLCBkZWxldGVgKTtcbiAgICAgICAgICBmcy5yZW1vdmVTeW5jKHJlc29sdmUoaW5zdGFsbERpciwgZmlsZSkpO1xuICAgICAgICB9XG4gICAgICAgIGZzLnJlbmFtZVN5bmMocmVzb2x2ZShkaXIsIGZpbGUpLCByZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKTtcbiAgICAgICAgbG9nLmluZm8oYG1vdmUgJHtyZXNvbHZlKGRpciwgZmlsZSl9IHRvICR7cmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRlbXBEaXIpO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBpZiAoIS9eY2hlY2tzdW1cXC5bXi5dK1xcLmpzb24kLy50ZXN0KGZpbGUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZXhpc3RpbmcgPSByZXNvbHZlKHJvb3REaXIsIGZpbGUpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGV4aXN0aW5nKSlcbiAgICAgIGZzLnJlbW92ZVN5bmMoZXhpc3RpbmcpO1xuICAgIGZzLnJlbmFtZVN5bmMocmVzb2x2ZSh0ZW1wRGlyLCBmaWxlKSwgZXhpc3RpbmcpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGVja1JlbW90ZSgpIHtcbiAgY29uc3QgcmVtb3RlTGlzdCA9IGF3YWl0IHNwYXduKCdnaXQnLCAncmVtb3RlJywgJy12Jywge2N3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlfSkucHJvbWlzZTtcbiAgY29uc3QgbGluZXMgPSByZW1vdGVMaXN0LnNwbGl0KCdcXG4nKTtcbiAgY29uc3QgcmVtb3RlTWFwID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgaWYgKGxpbmUudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGNvbHMgPSBsaW5lLnNwbGl0KC9cXHMrLyk7XG4gICAgcmVtb3RlTWFwLnNldChjb2xzWzBdLCBjb2xzWzFdKTtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1lvdXIgZ2l0IHJlbW90ZXMgYXJlOiAnLCBBcnJheS5mcm9tKHJlbW90ZU1hcC5rZXlzKCkpLm1hcChrZXkgPT4gYCR7a2V5fTogJHtyZW1vdGVNYXAuZ2V0KGtleSl9YCkpO1xuICBjb25zdCBvZmZpY2VHaXRVcmwgPSAnLmJramstaW5jLmNvbS8nO1xuICBpZiAoIXJlbW90ZU1hcC5oYXMoJ29yaWdpbicpIHx8IHJlbW90ZU1hcC5nZXQoJ29yaWdpbicpIS5pbmRleE9mKG9mZmljZUdpdFVybCkgPCAwKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1lvdXIgZ2l0IHJlbW90ZSBtdXN0IGhhdmUgYSBcIm9yaWdpblwiIHBvaW50aW5nIHRvICcsIG9mZmljZUdpdFVybCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdZb3VyIGdpdCByZW1vdGUgbXVzdCBoYXMgYSBcIm9yaWdpblwiIHBvaW50aW5nIHRvICcgKyBvZmZpY2VHaXRVcmwpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyQnJhbmNoTmFtZSgpIHtcbiAgY29uc3QgcmVzID0gYXdhaXQgc3Bhd24oJ2dpdCcsICdzdGF0dXMnLCB7Y3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWV9KS5wcm9taXNlO1xuICBsZXQgY3VyckJyYW5jaDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBbL15PbiBicmFuY2ggKC4qKSQvbSwgL15IRUFEIGRldGFjaGVkIGF0IChcXFMrKSQvbV0uc29tZShyZWcgPT4ge1xuICAgIGNvbnN0IG0gPSByZWcuZXhlYyhyZXMpO1xuICAgIGlmIChtKSB7XG4gICAgICBjdXJyQnJhbmNoID0gbVsxXTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBpZiAoY3VyckJyYW5jaCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHVuZGVyc3RhbmQgd2hpY2ggaXMgY3VycmVudCBicmFuY2g6XFxuICR7cmVzfWApO1xuICB9XG4gIHJldHVybiBjdXJyQnJhbmNoO1xufVxuIl19
