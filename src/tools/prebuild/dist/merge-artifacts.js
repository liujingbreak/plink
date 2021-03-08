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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2UtYXJ0aWZhY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWVyZ2UtYXJ0aWZhY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdCQUF3QjtBQUN4QixxRUFBd0Q7QUFDeEQsOENBQStDO0FBQy9DLCtCQUF1QztBQUN2Qyx3REFBMEI7QUFDMUIsa0RBQXdCO0FBRXhCLE1BQU0sR0FBRyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFdkIsTUFBTSxPQUFPLEdBQUcsaUJBQVUsRUFBRSxDQUFDO0FBQzdCLE1BQU0sT0FBTyxHQUFHLGNBQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUVwRCxNQUFNLElBQUksR0FBRyxDQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztBQUV2RCxTQUFzQixPQUFPOztRQUMzQixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDOUMsSUFBSSxhQUFhLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDO1FBQ2pELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztRQUVuRCx1QkFBdUI7UUFFdkIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRW5FLE1BQU0sVUFBVSxHQUFHLE1BQU0saUJBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLFVBQVUsS0FBSyxhQUFhLEVBQUU7WUFDaEMsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0hBQStILENBQUMsQ0FBQztZQUM3SSxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDL0Q7UUFFRCxJQUFJO1lBQ0YsTUFBTSxxQkFB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LEdBQUcsY0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN4QyxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQztZQUN6QixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ2pEO0FBQ0gsQ0FBQztBQWxDRCw4QkFrQ0M7QUFFRCxTQUFzQixpQkFBaUI7O1FBQ3JDLE1BQU0sR0FBRyxHQUFHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDL0UsSUFBSSxVQUE4QixDQUFDO1FBQ25DLENBQUMsbUJBQW1CLEVBQUUsMkJBQTJCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDNUQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsRUFBRTtnQkFDTCxVQUFVLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixPQUFPLElBQUksQ0FBQzthQUNiO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksVUFBVSxJQUFJLElBQUksRUFBRTtZQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLGlEQUFpRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1NBQ3pFO1FBQ0QsT0FBTyxVQUFVLENBQUM7SUFDcEIsQ0FBQztDQUFBO0FBZkQsOENBZUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogY3VybHlcbmltcG9ydCB7c3Bhd259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuaW1wb3J0IHtyZXNvbHZlLCBiYXNlbmFtZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5cbmNvbnN0IGxvZyA9IGFwaS5sb2dnZXI7XG5cbmNvbnN0IHJvb3REaXIgPSBnZXRSb290RGlyKCk7XG5jb25zdCB0ZW1wRGlyID0gcmVzb2x2ZShyb290RGlyLCAnZGlzdC9tZXJnZS10ZW1wJyk7XG5cbmNvbnN0IGVudnMgPSBbJ2xvY2FsJywgJ2RldicsICd0ZXN0JywgJ3N0YWdlJywgJ3Byb2QnXTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByZXBhcmUoKSB7XG4gIGNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnKClbJ0B3ZmgvcHJlYnVpbGQnXTtcbiAgbGV0IHJlbGVhc2VCcmFuY2ggPSBzZXR0aW5nLnByZWJ1aWxkRGVwbG95QnJhbmNoO1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZTtcblxuICAvLyBhd2FpdCBjaGVja1JlbW90ZSgpO1xuXG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnZmV0Y2gnLCByZWxlYXNlUmVtb3RlLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcblxuICBjb25zdCBjdXJyQnJhbmNoID0gYXdhaXQgZ2V0Q3VyckJyYW5jaE5hbWUoKTtcblxuICBpZiAoY3VyckJyYW5jaCA9PT0gcmVsZWFzZUJyYW5jaCkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdDdXJyZW50IGJyYW5jaCBpcyByZWxlYXNlLXNlcnZlciB3aGljaCBzaG91bGQgbm90IGJlIHlvdXIgYnVpbGQgdGFyZ2V0aW5nIGJyYW5jaCxcXG5wbGVhc2UgY2hlY2tvdXQgYW5vdGhlciBicmFuY2ggdG8gcHJvY2VkZSEnKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3BsZWFzZSBjaGVja291dCBhbm90aGVyIGJyYW5jaCB0byBwcm9jZWRlIScpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2JyYW5jaCcsICctRCcsIHJlbGVhc2VCcmFuY2gsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7fVxuICBhd2FpdCBjbGVhbnVwUmVwbygpO1xuXG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCAnLWInLCByZWxlYXNlQnJhbmNoLCByZWxlYXNlUmVtb3RlICsgJy8nICsgcmVsZWFzZUJyYW5jaCwge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRlbXBEaXIpKSB7XG4gICAgZnMucmVtb3ZlU3luYyh0ZW1wRGlyKTtcbiAgfVxuICBmcy5ta2RpcnBTeW5jKHRlbXBEaXIpO1xuICBmb3IgKGNvbnN0IGVudiBvZiBlbnZzKSB7XG4gICAgbXZEaXIoJ2luc3RhbGwtJyArIGVudik7XG4gICAgbXZEaXIoJ3NlcnZlci1jb250ZW50LScgKyBlbnYpO1xuXG4gICAgY29uc3QgY2hlY2tzdW1GaWxlID0gcmVzb2x2ZShyb290RGlyLCBgY2hlY2tzdW0uJHtlbnZ9Lmpzb25gKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhjaGVja3N1bUZpbGUpKSB7XG4gICAgICBjb25zdCBuZXdOYW1lID0gcmVzb2x2ZSh0ZW1wRGlyLCBiYXNlbmFtZShjaGVja3N1bUZpbGUpKTtcbiAgICAgIGZzLnJlbmFtZVN5bmMoY2hlY2tzdW1GaWxlLCBuZXdOYW1lKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtdkRpcih0YXJnZXREaXJOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBkaXIgPSByZXNvbHZlKHJvb3REaXIsIHRhcmdldERpck5hbWUpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIGNvbnN0IG5ld05hbWUgPSByZXNvbHZlKHRlbXBEaXIsIHRhcmdldERpck5hbWUpO1xuICAgICAgbG9nLmluZm8oYG1vdmUgJHtkaXJ9IHRvICR7bmV3TmFtZX1gKTtcbiAgICAgIGZzLnJlbmFtZVN5bmMoZGlyLCBuZXdOYW1lKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBjbGVhbnVwUmVwbygpIHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ3Jlc2V0JywgJy0taGFyZCcsICdIRUFEJywge2N3ZDogcm9vdERpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgfVxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnY2xlYW4nLCAnLWYnLCAnLWQnLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtZXJnZUJhY2soKSB7XG4gIGxvZy5pbmZvKCctLS0tIG1lcmdlIGFydGlmYWN0cyAtLS0tLS0nKTtcbiAgZm9yIChjb25zdCBlbnYgb2YgZW52cykge1xuICAgIG1lcmdlRGlyKCdpbnN0YWxsLScgKyBlbnYpO1xuICAgIG1lcmdlRGlyKCdzZXJ2ZXItY29udGVudC0nICsgZW52KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG1lcmdlRGlyKHRhcmdldERpck5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IGRpciA9IHJlc29sdmUodGVtcERpciwgdGFyZ2V0RGlyTmFtZSk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgY29uc3QgdGVtcEZpbGVzID0gZnMucmVhZGRpclN5bmMoZGlyKTtcbiAgICAgIGNvbnN0IGluc3RhbGxEaXIgPSByZXNvbHZlKHJvb3REaXIsIHRhcmdldERpck5hbWUpO1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiB0ZW1wRmlsZXMpIHtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKSkpIHtcbiAgICAgICAgICBsb2cuaW5mbyhgJHtyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpfSBleGlzdHMsIGRlbGV0ZWApO1xuICAgICAgICAgIGZzLnJlbW92ZVN5bmMocmVzb2x2ZShpbnN0YWxsRGlyLCBmaWxlKSk7XG4gICAgICAgIH1cbiAgICAgICAgZnMucmVuYW1lU3luYyhyZXNvbHZlKGRpciwgZmlsZSksIHJlc29sdmUoaW5zdGFsbERpciwgZmlsZSkpO1xuICAgICAgICBsb2cuaW5mbyhgbW92ZSAke3Jlc29sdmUoZGlyLCBmaWxlKX0gdG8gJHtyZXNvbHZlKGluc3RhbGxEaXIsIGZpbGUpfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGZpbGVzID0gZnMucmVhZGRpclN5bmModGVtcERpcik7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xuICAgIGlmICghL15jaGVja3N1bVxcLlteLl0rXFwuanNvbiQvLnRlc3QoZmlsZSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBleGlzdGluZyA9IHJlc29sdmUocm9vdERpciwgZmlsZSk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZXhpc3RpbmcpKVxuICAgICAgZnMucmVtb3ZlU3luYyhleGlzdGluZyk7XG4gICAgZnMucmVuYW1lU3luYyhyZXNvbHZlKHRlbXBEaXIsIGZpbGUpLCBleGlzdGluZyk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldEN1cnJCcmFuY2hOYW1lKCkge1xuICBjb25zdCByZXMgPSBhd2FpdCBzcGF3bignZ2l0JywgJ3N0YXR1cycsIHtjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZX0pLnByb21pc2U7XG4gIGxldCBjdXJyQnJhbmNoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIFsvXk9uIGJyYW5jaCAoLiopJC9tLCAvXkhFQUQgZGV0YWNoZWQgYXQgKFxcUyspJC9tXS5zb21lKHJlZyA9PiB7XG4gICAgY29uc3QgbSA9IHJlZy5leGVjKHJlcyk7XG4gICAgaWYgKG0pIHtcbiAgICAgIGN1cnJCcmFuY2ggPSBtWzFdO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIGlmIChjdXJyQnJhbmNoID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgdW5kZXJzdGFuZCB3aGljaCBpcyBjdXJyZW50IGJyYW5jaDpcXG4gJHtyZXN9YCk7XG4gIH1cbiAgcmV0dXJuIGN1cnJCcmFuY2g7XG59XG4iXX0=