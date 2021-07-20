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
exports.getCurrBranchName = exports.mergeBack = exports.prepare = void 0;
/* eslint-disable curly */
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const dist_1 = require("@wfh/plink/wfh/dist");
const path_1 = require("path");
const fs_extra_1 = __importDefault(require("fs-extra"));
const __api_1 = __importDefault(require("__api"));
const log = __api_1.default.logger;
const rootDir = dist_1.getRootDir();
const tempDir = path_1.resolve(rootDir, 'dist/merge-temp');
const envs = ['local', 'dev', 'test', 'stage', 'prod'];
function prepare() {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = __api_1.default.config()['@wfh/prebuild'];
        let releaseBranch = setting.prebuildDeployBranch;
        const releaseRemote = setting.prebuildDeployRemote;
        // await checkRemote();
        yield process_utils_1.spawn('git', 'fetch', releaseRemote, { cwd: rootDir }).promise;
        const currBranch = yield getCurrBranchName();
        if (currBranch === releaseBranch) {
            // eslint-disable-next-line no-console
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
    return __awaiter(this, void 0, void 0, function* () {
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
    log.info('---- merge artifacts ------');
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
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2UtYXJ0aWZhY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWVyZ2UtYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBCQUEwQjtBQUMxQixxRUFBd0Q7QUFDeEQsOENBQStDO0FBQy9DLCtCQUF1QztBQUN2Qyx3REFBMEI7QUFDMUIsa0RBQXdCO0FBRXhCLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFdkIsTUFBTSxPQUFPLEdBQUcsaUJBQVUsRUFBRSxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUVwRCxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUV2RCxTQUFzQixPQUFPOztRQUMzQixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDOUMsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDO1FBQ2pELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztRQUVuRCx1QkFBdUI7UUFFdkIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRW5FLE1BQU0sVUFBVSxHQUFHLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLFVBQVUsS0FBSyxhQUFhLEVBQUU7WUFDaEMsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0hBQStILENBQUMsQ0FBQztZQUM3SSxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDL0Q7UUFFRCxJQUFJO1lBQ0YsTUFBTSxxQkFB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LEdBQUcsY0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUN6QixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ2pEO0FBQ0gsQ0FBQztBQWxDRCw4QkFrQ0M7QUFFRCxTQUFzQixpQkFBaUI7O1FBQ3JDLE1BQU0sR0FBRyxHQUFHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDL0UsSUFBSSxVQUE4QixDQUFDO1FBQ25DLENBQUMsbUJBQW1CLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDNUQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsRUFBRTtnQkFDTCxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksVUFBVSxJQUFJLElBQUksRUFBRTtZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3pFO1FBQ0QsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBZkQsOENBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBjdXJseSAqL1xuaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5pbXBvcnQge3Jlc29sdmUsIGJhc2VuYW1lfSBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxuY29uc3QgbG9nID0gYXBpLmxvZ2dlcjtcblxuY29uc3Qgcm9vdERpciA9IGdldFJvb3REaXIoKTtcbmNvbnN0IHRlbXBEaXIgPSByZXNvbHZlKHJvb3REaXIsICdkaXN0L21lcmdlLXRlbXAnKTtcblxuY29uc3QgZW52cyA9IFsnbG9jYWwnLCAnZGV2JywgJ3Rlc3QnLCAnc3RhZ2UnLCAncHJvZCddO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlcGFyZSgpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcoKVsnQHdmaC9wcmVidWlsZCddO1xuICBsZXQgcmVsZWFzZUJyYW5jaCA9IHNldHRpbmcucHJlYnVpbGREZXBsb3lCcmFuY2g7XG4gIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBzZXR0aW5nLnByZWJ1aWxkRGVwbG95UmVtb3RlO1xuXG4gIC8vIGF3YWl0IGNoZWNrUmVtb3RlKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdmZXRjaCcsIHJlbGVhc2VSZW1vdGUsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChjdXJyQnJhbmNoID09PSByZWxlYXNlQnJhbmNoKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnQ3VycmVudCBicmFuY2ggaXMgcmVsZWFzZS1zZXJ2ZXIgd2hpY2ggc2hvdWxkIG5vdCBiZSB5b3VyIGJ1aWxkIHRhcmdldGluZyBicmFuY2gsXFxucGxlYXNlIGNoZWNrb3V0IGFub3RoZXIgYnJhbmNoIHRvIHByb2NlZGUhJyk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwbGVhc2UgY2hlY2tvdXQgYW5vdGhlciBicmFuY2ggdG8gcHJvY2VkZSEnKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdicmFuY2gnLCAnLUQnLCByZWxlYXNlQnJhbmNoLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge31cbiAgYXdhaXQgY2xlYW51cFJlcG8oKTtcblxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgJy1iJywgcmVsZWFzZUJyYW5jaCwgcmVsZWFzZVJlbW90ZSArICcvJyArIHJlbGVhc2VCcmFuY2gsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0ZW1wRGlyKSkge1xuICAgIGZzLnJlbW92ZVN5bmModGVtcERpcik7XG4gIH1cbiAgZnMubWtkaXJwU3luYyh0ZW1wRGlyKTtcbiAgZm9yIChjb25zdCBlbnYgb2YgZW52cykge1xuICAgIG12RGlyKCdpbnN0YWxsLScgKyBlbnYpO1xuICAgIG12RGlyKCdzZXJ2ZXItY29udGVudC0nICsgZW52KTtcblxuICAgIGNvbnN0IGNoZWNrc3VtRmlsZSA9IHJlc29sdmUocm9vdERpciwgYGNoZWNrc3VtLiR7ZW52fS5qc29uYCk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoY2hlY2tzdW1GaWxlKSkge1xuICAgICAgY29uc3QgbmV3TmFtZSA9IHJlc29sdmUodGVtcERpciwgYmFzZW5hbWUoY2hlY2tzdW1GaWxlKSk7XG4gICAgICBmcy5yZW5hbWVTeW5jKGNoZWNrc3VtRmlsZSwgbmV3TmFtZSk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gbXZEaXIodGFyZ2V0RGlyTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZShyb290RGlyLCB0YXJnZXREaXJOYW1lKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICBjb25zdCBuZXdOYW1lID0gcmVzb2x2ZSh0ZW1wRGlyLCB0YXJnZXREaXJOYW1lKTtcbiAgICAgIGxvZy5pbmZvKGBtb3ZlICR7ZGlyfSB0byAke25ld05hbWV9YCk7XG4gICAgICBmcy5yZW5hbWVTeW5jKGRpciwgbmV3TmFtZSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY2xlYW51cFJlcG8oKSB7XG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdyZXNldCcsICctLWhhcmQnLCAnSEVBRCcsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2NsZWFuJywgJy1mJywgJy1kJywge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VCYWNrKCkge1xuICBsb2cuaW5mbygnLS0tLSBtZXJnZSBhcnRpZmFjdHMgLS0tLS0tJyk7XG4gIGZvciAoY29uc3QgZW52IG9mIGVudnMpIHtcbiAgICBtZXJnZURpcignaW5zdGFsbC0nICsgZW52KTtcbiAgICBtZXJnZURpcignc2VydmVyLWNvbnRlbnQtJyArIGVudik7XG4gIH1cblxuICBmdW5jdGlvbiBtZXJnZURpcih0YXJnZXREaXJOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHRlbXBEaXIsIHRhcmdldERpck5hbWUpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIGNvbnN0IHRlbXBGaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGRpcik7XG4gICAgICBjb25zdCBpbnN0YWxsRGlyID0gcmVzb2x2ZShyb290RGlyLCB0YXJnZXREaXJOYW1lKTtcbiAgICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgdGVtcEZpbGVzKSB7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHJlc29sdmUoaW5zdGFsbERpciwgZmlsZSkpKSB7XG4gICAgICAgICAgbG9nLmluZm8oYCR7cmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKX0gZXhpc3RzLCBkZWxldGVgKTtcbiAgICAgICAgICBmcy5yZW1vdmVTeW5jKHJlc29sdmUoaW5zdGFsbERpciwgZmlsZSkpO1xuICAgICAgICB9XG4gICAgICAgIGZzLnJlbmFtZVN5bmMocmVzb2x2ZShkaXIsIGZpbGUpLCByZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKTtcbiAgICAgICAgbG9nLmluZm8oYG1vdmUgJHtyZXNvbHZlKGRpciwgZmlsZSl9IHRvICR7cmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKX1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKHRlbXBEaXIpO1xuICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICBpZiAoIS9eY2hlY2tzdW1cXC5bXi5dK1xcLmpzb24kLy50ZXN0KGZpbGUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgZXhpc3RpbmcgPSByZXNvbHZlKHJvb3REaXIsIGZpbGUpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGV4aXN0aW5nKSlcbiAgICAgIGZzLnJlbW92ZVN5bmMoZXhpc3RpbmcpO1xuICAgIGZzLnJlbmFtZVN5bmMocmVzb2x2ZSh0ZW1wRGlyLCBmaWxlKSwgZXhpc3RpbmcpO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRDdXJyQnJhbmNoTmFtZSgpIHtcbiAgY29uc3QgcmVzID0gYXdhaXQgc3Bhd24oJ2dpdCcsICdzdGF0dXMnLCB7Y3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWV9KS5wcm9taXNlO1xuICBsZXQgY3VyckJyYW5jaDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBbL15PbiBicmFuY2ggKC4qKSQvbSwgL15IRUFEIGRldGFjaGVkIGF0IChcXFMrKSQvbV0uc29tZShyZWcgPT4ge1xuICAgIGNvbnN0IG0gPSByZWcuZXhlYyhyZXMpO1xuICAgIGlmIChtKSB7XG4gICAgICBjdXJyQnJhbmNoID0gbVsxXTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBpZiAoY3VyckJyYW5jaCA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDYW4gbm90IHVuZGVyc3RhbmQgd2hpY2ggaXMgY3VycmVudCBicmFuY2g6XFxuICR7cmVzfWApO1xuICB9XG4gIHJldHVybiBjdXJyQnJhbmNoO1xufVxuIl19