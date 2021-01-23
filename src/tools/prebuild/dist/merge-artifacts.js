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
// tslint:disable: curly
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const dist_1 = require("@wfh/plink/wfh/dist");
const path_1 = require("path");
const fs_extra_1 = __importDefault(require("fs-extra"));
const __api_1 = __importDefault(require("__api"));
const log = require('log4js').getLogger('merge-artifacts');
const rootDir = dist_1.getRootDir();
const tempDir = path_1.resolve(rootDir, 'dist/merge-temp');
const envs = ['local', 'dev', 'test', 'stage', 'prod'];
function prepare() {
    return __awaiter(this, void 0, void 0, function* () {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2UtYXJ0aWZhY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWVyZ2UtYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdCQUF3QjtBQUN4QixxRUFBd0Q7QUFDeEQsOENBQStDO0FBQy9DLCtCQUF1QztBQUN2Qyx3REFBMEI7QUFDMUIsa0RBQXdCO0FBRXhCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUUzRCxNQUFNLE9BQU8sR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFDN0IsTUFBTSxPQUFPLEdBQUcsY0FBTyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBRXBELE1BQU0sSUFBSSxHQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBRXZELFNBQXNCLE9BQU87O1FBQzNCLE1BQU0sT0FBTyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoRCxJQUFJLGFBQWEsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUM7UUFDbEQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDO1FBRWhELHVCQUF1QjtRQUV2QixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFbkUsTUFBTSxVQUFVLEdBQUcsTUFBTSxpQkFBaUIsRUFBRSxDQUFDO1FBRTdDLElBQUksVUFBVSxLQUFLLGFBQWEsRUFBRTtZQUNoQyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrSEFBK0gsQ0FBQyxDQUFDO1lBQzdJLE1BQU0sSUFBSSxLQUFLLENBQUMs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QyxJQUFJLENBQUMsRUFBRTtZQUN6QyxTQUFTO1NBQ1Y7UUFDRCxNQUFNLFFBQVEsR0FBRyxjQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3hDLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ3pCLGtCQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzFCLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7S0FDakQ7QUFDSCxDQUFDO0FBbENELDhCQWtDQztBQUVELFNBQXNCLGlCQUFpQjs7UUFDckMsTUFBTSxHQUFHLEdBQUcsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMvRSxJQUFJLFVBQThCLENBQUM7UUFDbkMsQ0FBQyxtQkFBbUIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUM1RCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxFQUFFO2dCQUNMLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xCLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELEdBQUcsRUFBRSxDQUFDLENBQUM7U0FDekU7UUFDRCxPQUFPLFVBQVUsQ0FBQztJQUNwQixDQUFDO0NBQUE7QUFmRCw4Q0FlQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBjdXJseVxuaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5pbXBvcnQge3Jlc29sdmUsIGJhc2VuYW1lfSBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdtZXJnZS1hcnRpZmFjdHMnKTtcblxuY29uc3Qgcm9vdERpciA9IGdldFJvb3REaXIoKTtcbmNvbnN0IHRlbXBEaXIgPSByZXNvbHZlKHJvb3REaXIsICdkaXN0L21lcmdlLXRlbXAnKTtcblxuY29uc3QgZW52cyA9IFsnbG9jYWwnLCAnZGV2JywgJ3Rlc3QnLCAnc3RhZ2UnLCAncHJvZCddO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcHJlcGFyZSgpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG4gIGxldCByZWxlYXNlQnJhbmNoID0gc2V0dGluZy5wcmVidWlsZFJlbGVhc2VCcmFuY2g7XG4gIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBzZXR0aW5nLnByZWJ1aWxkR2l0UmVtb3RlO1xuXG4gIC8vIGF3YWl0IGNoZWNrUmVtb3RlKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdmZXRjaCcsIHJlbGVhc2VSZW1vdGUsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChjdXJyQnJhbmNoID09PSByZWxlYXNlQnJhbmNoKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ0N1cnJlbnQgYnJhbmNoIGlzIHJlbGVhc2Utc2VydmVyIHdoaWNoIHNob3VsZCBub3QgYmUgeW91ciBidWlsZCB0YXJnZXRpbmcgYnJhbmNoLFxcbnBsZWFzZSBjaGVja291dCBhbm90aGVyIGJyYW5jaCB0byBwcm9jZWRlIScpO1xuICAgIHRocm93IG5ldyBFcnJvcigncGxlYXNlIGNoZWNrb3V0IGFub3RoZXIgYnJhbmNoIHRvIHByb2NlZGUhJyk7XG4gIH1cblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIGF3YWl0IGNsZWFudXBSZXBvKCk7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsIHJlbGVhc2VSZW1vdGUgKyAnLycgKyByZWxlYXNlQnJhbmNoLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModGVtcERpcikpIHtcbiAgICBmcy5yZW1vdmVTeW5jKHRlbXBEaXIpO1xuICB9XG4gIGZzLm1rZGlycFN5bmModGVtcERpcik7XG4gIGZvciAoY29uc3QgZW52IG9mIGVudnMpIHtcbiAgICBtdkRpcignaW5zdGFsbC0nICsgZW52KTtcbiAgICBtdkRpcignc2VydmVyLWNvbnRlbnQtJyArIGVudik7XG5cbiAgICBjb25zdCBjaGVja3N1bUZpbGUgPSByZXNvbHZlKHJvb3REaXIsIGBjaGVja3N1bS4ke2Vudn0uanNvbmApO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNoZWNrc3VtRmlsZSkpIHtcbiAgICAgIGNvbnN0IG5ld05hbWUgPSByZXNvbHZlKHRlbXBEaXIsIGJhc2VuYW1lKGNoZWNrc3VtRmlsZSkpO1xuICAgICAgZnMucmVuYW1lU3luYyhjaGVja3N1bUZpbGUsIG5ld05hbWUpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG12RGlyKHRhcmdldERpck5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IGRpciA9IHJlc29sdmUocm9vdERpciwgdGFyZ2V0RGlyTmFtZSk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgY29uc3QgbmV3TmFtZSA9IHJlc29sdmUodGVtcERpciwgdGFyZ2V0RGlyTmFtZSk7XG4gICAgICBsb2cuaW5mbyhgbW92ZSAke2Rpcn0gdG8gJHtuZXdOYW1lfWApO1xuICAgICAgZnMucmVuYW1lU3luYyhkaXIsIG5ld05hbWUpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXBSZXBvKCkge1xuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncmVzZXQnLCAnLS1oYXJkJywgJ0hFQUQnLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICB9XG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjbGVhbicsICctZicsICctZCcsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlQmFjaygpIHtcbiAgbG9nLmluZm8oJ21lcmdlIGFydGlmYWN0cycpO1xuICBmb3IgKGNvbnN0IGVudiBvZiBlbnZzKSB7XG4gICAgbWVyZ2VEaXIoJ2luc3RhbGwtJyArIGVudik7XG4gICAgbWVyZ2VEaXIoJ3NlcnZlci1jb250ZW50LScgKyBlbnYpO1xuICB9XG5cbiAgZnVuY3Rpb24gbWVyZ2VEaXIodGFyZ2V0RGlyTmFtZTogc3RyaW5nKSB7XG4gICAgY29uc3QgZGlyID0gcmVzb2x2ZSh0ZW1wRGlyLCB0YXJnZXREaXJOYW1lKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICBjb25zdCB0ZW1wRmlsZXMgPSBmcy5yZWFkZGlyU3luYyhkaXIpO1xuICAgICAgY29uc3QgaW5zdGFsbERpciA9IHJlc29sdmUocm9vdERpciwgdGFyZ2V0RGlyTmFtZSk7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHRlbXBGaWxlcykge1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKSkge1xuICAgICAgICAgIGxvZy5pbmZvKGAke3Jlc29sdmUoaW5zdGFsbERpciwgZmlsZSl9IGV4aXN0cywgZGVsZXRlYCk7XG4gICAgICAgICAgZnMucmVtb3ZlU3luYyhyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpKTtcbiAgICAgICAgfVxuICAgICAgICBmcy5yZW5hbWVTeW5jKHJlc29sdmUoZGlyLCBmaWxlKSwgcmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKSk7XG4gICAgICAgIGxvZy5pbmZvKGBtb3ZlICR7cmVzb2x2ZShkaXIsIGZpbGUpfSB0byAke3Jlc29sdmUoaW5zdGFsbERpciwgZmlsZSl9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyh0ZW1wRGlyKTtcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XG4gICAgaWYgKCEvXmNoZWNrc3VtXFwuW14uXStcXC5qc29uJC8udGVzdChmaWxlKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IGV4aXN0aW5nID0gcmVzb2x2ZShyb290RGlyLCBmaWxlKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhleGlzdGluZykpXG4gICAgICBmcy5yZW1vdmVTeW5jKGV4aXN0aW5nKTtcbiAgICBmcy5yZW5hbWVTeW5jKHJlc29sdmUodGVtcERpciwgZmlsZSksIGV4aXN0aW5nKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0Q3VyckJyYW5jaE5hbWUoKSB7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IHNwYXduKCdnaXQnLCAnc3RhdHVzJywge2N3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlfSkucHJvbWlzZTtcbiAgbGV0IGN1cnJCcmFuY2g6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgWy9eT24gYnJhbmNoICguKikkL20sIC9eSEVBRCBkZXRhY2hlZCBhdCAoXFxTKykkL21dLnNvbWUocmVnID0+IHtcbiAgICBjb25zdCBtID0gcmVnLmV4ZWMocmVzKTtcbiAgICBpZiAobSkge1xuICAgICAgY3VyckJyYW5jaCA9IG1bMV07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgaWYgKGN1cnJCcmFuY2ggPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCB1bmRlcnN0YW5kIHdoaWNoIGlzIGN1cnJlbnQgYnJhbmNoOlxcbiAke3Jlc31gKTtcbiAgfVxuICByZXR1cm4gY3VyckJyYW5jaDtcbn1cbiJdfQ==