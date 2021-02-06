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
exports.main = void 0;
// tslint:disable: no-console
const process_utils_1 = require("@wfh/plink/wfh/dist/process-utils");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const dayjs_1 = __importDefault(require("dayjs"));
const merge_artifacts_1 = require("./merge-artifacts");
const remote_deploy_1 = require("@wfh/assets-processer/dist/remote-deploy");
const _send_patch_1 = require("./_send-patch");
const artifacts_1 = require("./artifacts");
const __api_1 = __importDefault(require("__api"));
const log4js_1 = __importDefault(require("log4js"));
const prebuild_setting_1 = require("../isom/prebuild-setting");
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
let pkJson = require(path_1.default.resolve('package.json'));
function main(env, appName, buildStaticOnly = false, pushBranch = true, isForce = false, secret, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = prebuild_setting_1.getSetting();
        const rootDir = __api_1.default.config().rootPath;
        const releaseBranch = setting.prebuildReleaseBranch;
        if (pushBranch)
            merge_artifacts_1.mergeBack();
        const zipSrc = __api_1.default.config.resolve('staticDir');
        let zipFile;
        if (appName !== 'node-server') {
            const installDir = path_1.default.resolve(rootDir, 'install-' + env);
            if (!fs_extra_1.default.existsSync(installDir)) {
                fs_extra_1.default.mkdirpSync(installDir);
            }
            zipFile = yield remote_deploy_1.checkZipFile(zipSrc, installDir, appName, /([\\/]stats[^]*\.json|\.map)$/);
            const generatedServerFileDir = path_1.default.resolve(rootDir, 'dist/server');
            if (fs_extra_1.default.existsSync(path_1.default.resolve(generatedServerFileDir, appName))) {
                const serverZip = yield remote_deploy_1.checkZipFile(generatedServerFileDir, path_1.default.resolve(rootDir, 'server-content-' + env), appName);
                log.info(`Pack ${generatedServerFileDir} to ${serverZip}`);
            }
        }
        if (appName === 'node-server' || buildStaticOnly !== true) {
            yield remote_deploy_1.digestInstallingFiles();
            log.info(yield artifacts_1.stringifyListAllVersions());
        }
        // const zipDir = Path.resolve('install-' + env);
        try {
            yield process_utils_1.spawn('git', 'branch', '-D', releaseBranch, { cwd: rootDir, silent: true }).promise;
        }
        catch (e) {
            log.debug(e.message);
        }
        const currBranch = yield merge_artifacts_1.getCurrBranchName();
        if (buildStaticOnly && zipFile) {
            // Dynamically push to Node server
            const cfgByEnv = setting.byEnv[env];
            if (cfgByEnv == null) {
                throw new Error(`Missing configuration property '@wfh/prebuild.byEnv["${env}"]',` +
                    `add this property with command line argument '-c <file>' or '--prop @wfh/prebuild.byEnv["${env}"]'`);
            }
            try {
                yield _send_patch_1.send(env, appName, zipFile, setting.byEnv[env].sendConcurrency, setting.byEnv[env].sendNodes, isForce, secret);
            }
            catch (ex) {
                try {
                    yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir, silent: true }).promise;
                }
                catch (ex) { }
                throw ex;
            }
        }
        if (pushBranch)
            yield pushReleaseBranch(releaseBranch, rootDir, env, appName, commitComment);
        if (appName === 'node-server' || buildStaticOnly !== true) {
            yield addTag(rootDir, commitComment);
        }
        yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
    });
}
exports.main = main;
function pushReleaseBranch(releaseBranch, rootDir, env, appName, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const releaseRemote = __api_1.default.config()['@wfh/prebuild'].prebuildGitRemote;
        yield process_utils_1.spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir }).promise;
        // removeDevDeps();
        changeGitIgnore();
        yield process_utils_1.spawn('git', 'add', '.', { cwd: rootDir }).promise;
        const hookFiles = [path_1.default.resolve(rootDir, '.git/hooks/pre-push'),
            path_1.default.resolve(rootDir, '.git/hooks/pre-commit')];
        for (const gitHooks of hookFiles) {
            if (fs_extra_1.default.existsSync(gitHooks)) {
                fs_extra_1.default.removeSync(gitHooks);
            }
        }
        log.info('commitComment', commitComment);
        yield process_utils_1.spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}`, { cwd: rootDir }).promise;
        yield process_utils_1.spawn('git', 'push', '-f', releaseRemote, releaseBranch, { cwd: rootDir }).promise;
    });
}
function addTag(rootDir, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = prebuild_setting_1.getSetting();
        const releaseRemote = setting.prebuildGitRemote;
        const current = dayjs_1.default();
        const tagName = `${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
        yield process_utils_1.spawn('git', 'tag', '-a', 'v' + tagName, '-m', commitComment ? commitComment : `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`, { cwd: rootDir }).promise;
        yield process_utils_1.spawn('git', 'push', releaseRemote, 'v' + tagName, { cwd: rootDir }).promise;
        if (setting.tagPushRemote && setting.tagPushRemote !== setting.prebuildGitRemote) {
            yield process_utils_1.spawn('git', 'push', setting.tagPushRemote, 'HEAD:release/' + tagName, { cwd: rootDir }).promise;
            yield process_utils_1.spawn('git', 'push', setting.tagPushRemote, 'v' + tagName, { cwd: rootDir }).promise;
        }
    });
}
// function removeDevDeps() {
//   const json = Obbject.assign({}, pkJson);
//   delete json.devDependencies;
//   const newJson = JSON.stringify(json, null, '\t');
//   // tslint:disable-next-line:no-console
//   log.info('change package.json to:\n', newJson);
//   fs.writeFileSync('package.json', newJson);
// }
function changeGitIgnore() {
    const gitignoreFile = __api_1.default.config.resolve('rootPath', '.gitignore');
    let gitignore = fs_extra_1.default.readFileSync(gitignoreFile, 'utf8');
    gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
    gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
    fs_extra_1.default.writeFileSync(gitignoreFile, gitignore);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXBvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHFFQUEwRDtBQUMxRCxnREFBd0I7QUFDeEIsd0RBQTBCO0FBQzFCLGtEQUEwQjtBQUMxQix1REFBaUU7QUFDakUsNEVBQStGO0FBQy9GLCtDQUFxQztBQUNyQywyQ0FBcUQ7QUFDckQsa0RBQXdCO0FBQ3hCLG9EQUE0QjtBQUM1QiwrREFBb0Q7QUFDcEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxhQUFhLENBQUMsQ0FBQztBQUU5RCxJQUFJLE1BQU0sR0FBMEQsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUUxRyxTQUFzQixJQUFJLENBQUMsR0FBVyxFQUFFLE9BQWUsRUFBRSxlQUFlLEdBQUcsS0FBSyxFQUM5RSxVQUFVLEdBQUcsSUFBSSxFQUFFLE9BQU8sR0FBRyxLQUFLLEVBQUUsTUFBZSxFQUFFLGFBQXNCOztRQUUzRSxNQUFNLE9BQU8sR0FBRyw2QkFBVSxFQUFFLENBQUM7UUFDN0IsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztRQUN0QyxNQUFNLGFBQWEsR0FBVyxPQUFPLENBQUMscUJBQXFCLENBQUM7UUFFNUQsSUFBSSxVQUFVO1lBQ1osMkJBQVMsRUFBRSxDQUFDO1FBRWQsTUFBTSxNQUFNLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0MsSUFBSSxPQUEyQixDQUFDO1FBRWhDLElBQUksT0FBTyxLQUFLLGFBQWEsRUFBRTtZQUM3QixNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFVLEdBQUcs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T0FBTyxDQUFDLGFBQWEsRUFBRSxlQUFlLEdBQUcsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ3ZHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxHQUFHLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztTQUM1RjtJQUNILENBQUM7Q0FBQTtBQUVELDZCQUE2QjtBQUM3Qiw2Q0FBNkM7QUFDN0MsaUNBQWlDO0FBQ2pDLHNEQUFzRDtBQUN0RCwyQ0FBMkM7QUFDM0Msb0RBQW9EO0FBQ3BELCtDQUErQztBQUMvQyxJQUFJO0FBRUosU0FBUyxlQUFlO0lBQ3RCLE1BQU0sYUFBYSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUNuRSxJQUFJLFNBQVMsR0FBRyxrQkFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkQsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsK0NBQStDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsa0JBQUUsQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzdDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGRheWpzIGZyb20gJ2RheWpzJztcbmltcG9ydCB7IG1lcmdlQmFjaywgZ2V0Q3VyckJyYW5jaE5hbWUgfSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5pbXBvcnQgeyBkaWdlc3RJbnN0YWxsaW5nRmlsZXMsIGNoZWNrWmlwRmlsZSB9IGZyb20gJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3JlbW90ZS1kZXBsb3knO1xuaW1wb3J0IHsgc2VuZCB9IGZyb20gJy4vX3NlbmQtcGF0Y2gnO1xuaW1wb3J0IHtzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnN9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL3ByZWJ1aWxkLXNldHRpbmcnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnNlbmQtcGF0Y2gnKTtcblxubGV0IHBrSnNvbjoge25hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBkZXZEZXBlbmRlbmNpZXM6IGFueX0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nLCBidWlsZFN0YXRpY09ubHkgPSBmYWxzZSxcbiAgcHVzaEJyYW5jaCA9IHRydWUsIGlzRm9yY2UgPSBmYWxzZSwgc2VjcmV0Pzogc3RyaW5nLCBjb21taXRDb21tZW50Pzogc3RyaW5nKSB7XG5cbiAgY29uc3Qgc2V0dGluZyA9IGdldFNldHRpbmcoKTtcbiAgY29uc3Qgcm9vdERpciA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcbiAgY29uc3QgcmVsZWFzZUJyYW5jaDogc3RyaW5nID0gc2V0dGluZy5wcmVidWlsZFJlbGVhc2VCcmFuY2g7XG5cbiAgaWYgKHB1c2hCcmFuY2gpXG4gICAgbWVyZ2VCYWNrKCk7XG5cbiAgY29uc3QgemlwU3JjID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbGV0IHppcEZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBpZiAoYXBwTmFtZSAhPT0gJ25vZGUtc2VydmVyJykge1xuICAgIGNvbnN0IGluc3RhbGxEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKSB7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgIH1cbiAgICB6aXBGaWxlID0gYXdhaXQgY2hlY2taaXBGaWxlKHppcFNyYywgaW5zdGFsbERpciwgYXBwTmFtZSwgLyhbXFxcXC9dc3RhdHNbXl0qXFwuanNvbnxcXC5tYXApJC8pO1xuXG4gICAgY29uc3QgZ2VuZXJhdGVkU2VydmVyRmlsZURpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnZGlzdC9zZXJ2ZXInKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZ2VuZXJhdGVkU2VydmVyRmlsZURpciwgYXBwTmFtZSkpKSB7XG4gICAgICBjb25zdCBzZXJ2ZXJaaXAgPSBhd2FpdCBjaGVja1ppcEZpbGUoZ2VuZXJhdGVkU2VydmVyRmlsZURpciwgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdzZXJ2ZXItY29udGVudC0nICsgZW52KSwgYXBwTmFtZSk7XG4gICAgICBsb2cuaW5mbyhgUGFjayAke2dlbmVyYXRlZFNlcnZlckZpbGVEaXJ9IHRvICR7c2VydmVyWmlwfWApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChhcHBOYW1lID09PSAnbm9kZS1zZXJ2ZXInIHx8IGJ1aWxkU3RhdGljT25seSAhPT0gdHJ1ZSkge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICAgIGxvZy5pbmZvKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmRlYnVnKGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCBjdXJyQnJhbmNoID0gYXdhaXQgZ2V0Q3VyckJyYW5jaE5hbWUoKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ICYmIHppcEZpbGUpIHtcbiAgICAvLyBEeW5hbWljYWxseSBwdXNoIHRvIE5vZGUgc2VydmVyXG4gICAgY29uc3QgY2ZnQnlFbnYgPSBzZXR0aW5nLmJ5RW52W2Vudl07XG4gICAgaWYgKGNmZ0J5RW52ID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBjb25maWd1cmF0aW9uIHByb3BlcnR5ICdAd2ZoL3ByZWJ1aWxkLmJ5RW52W1wiJHtlbnZ9XCJdJyxgICtcbiAgICAgIGBhZGQgdGhpcyBwcm9wZXJ0eSB3aXRoIGNvbW1hbmQgbGluZSBhcmd1bWVudCAnLWMgPGZpbGU+JyBvciAnLS1wcm9wIEB3ZmgvcHJlYnVpbGQuYnlFbnZbXCIke2Vudn1cIl0nYCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kKGVudiwgYXBwTmFtZSwgemlwRmlsZSwgc2V0dGluZy5ieUVudltlbnZdLnNlbmRDb25jdXJyZW5jeSAsIHNldHRpbmcuYnlFbnZbZW52XS5zZW5kTm9kZXMsIGlzRm9yY2UsIHNlY3JldCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlIH0pLnByb21pc2U7XG4gICAgICB9IGNhdGNoIChleCkge31cbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGlmIChwdXNoQnJhbmNoKVxuICAgIGF3YWl0IHB1c2hSZWxlYXNlQnJhbmNoKHJlbGVhc2VCcmFuY2gsIHJvb3REaXIsIGVudiwgYXBwTmFtZSwgY29tbWl0Q29tbWVudCk7XG5cbiAgaWYgKGFwcE5hbWUgPT09ICdub2RlLXNlcnZlcicgfHwgYnVpbGRTdGF0aWNPbmx5ICE9PSB0cnVlKSB7XG4gICAgYXdhaXQgYWRkVGFnKHJvb3REaXIsIGNvbW1pdENvbW1lbnQpO1xuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gYXBpLmNvbmZpZygpWydAd2ZoL3ByZWJ1aWxkJ10ucHJlYnVpbGRHaXRSZW1vdGU7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIC8vIHJlbW92ZURldkRlcHMoKTtcbiAgY2hhbmdlR2l0SWdub3JlKCk7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnYWRkJywgJy4nLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBjb25zdCBob29rRmlsZXMgPSBbUGF0aC5yZXNvbHZlKHJvb3REaXIsICcuZ2l0L2hvb2tzL3ByZS1wdXNoJyksXG4gICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICcuZ2l0L2hvb2tzL3ByZS1jb21taXQnKV07XG4gIGZvciAoY29uc3QgZ2l0SG9va3Mgb2YgaG9va0ZpbGVzKSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0SG9va3MpKSB7XG4gICAgICBmcy5yZW1vdmVTeW5jKGdpdEhvb2tzKTtcbiAgICB9XG4gIH1cbiAgbG9nLmluZm8oJ2NvbW1pdENvbW1lbnQnLCBjb21taXRDb21tZW50KTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjb21taXQnLCAnLW0nLCBjb21taXRDb21tZW50ID8gY29tbWl0Q29tbWVudCA6IGBQcmVidWlsZCBub2RlIHNlcnZlciAke2Vudn0gLSAke2FwcE5hbWV9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgcmVsZWFzZVJlbW90ZSwgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkVGFnKHJvb3REaXI6IHN0cmluZywgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCBzZXR0aW5nID0gZ2V0U2V0dGluZygpO1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gc2V0dGluZy5wcmVidWlsZEdpdFJlbW90ZTtcbiAgY29uc3QgY3VycmVudCA9IGRheWpzKCk7XG4gIGNvbnN0IHRhZ05hbWUgPSBgJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAndGFnJywgJy1hJywgJ3YnICsgdGFnTmFtZSwgJy1tJywgY29tbWl0Q29tbWVudCA/IGNvbW1pdENvbW1lbnQgOiBgUHJlYnVpbGQgb24gJHtjdXJyZW50LmZvcm1hdCgnWVlZWS9NTS9ERCBISDptbTpzcycpfWAsXG4gICAgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgcmVsZWFzZVJlbW90ZSwgJ3YnICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcblxuICBpZiAoc2V0dGluZy50YWdQdXNoUmVtb3RlICYmIHNldHRpbmcudGFnUHVzaFJlbW90ZSAhPT0gc2V0dGluZy5wcmVidWlsZEdpdFJlbW90ZSkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsIHNldHRpbmcudGFnUHVzaFJlbW90ZSwgJ0hFQUQ6cmVsZWFzZS8nICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCBzZXR0aW5nLnRhZ1B1c2hSZW1vdGUsICd2JyArIHRhZ05hbWUsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gcmVtb3ZlRGV2RGVwcygpIHtcbi8vICAgY29uc3QganNvbiA9IE9iYmplY3QuYXNzaWduKHt9LCBwa0pzb24pO1xuLy8gICBkZWxldGUganNvbi5kZXZEZXBlbmRlbmNpZXM7XG4vLyAgIGNvbnN0IG5ld0pzb24gPSBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnXFx0Jyk7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4vLyAgIGxvZy5pbmZvKCdjaGFuZ2UgcGFja2FnZS5qc29uIHRvOlxcbicsIG5ld0pzb24pO1xuLy8gICBmcy53cml0ZUZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCBuZXdKc29uKTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlR2l0SWdub3JlKCkge1xuICBjb25zdCBnaXRpZ25vcmVGaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcsICcuZ2l0aWdub3JlJyk7XG4gIGxldCBnaXRpZ25vcmUgPSBmcy5yZWFkRmlsZVN5bmMoZ2l0aWdub3JlRmlsZSwgJ3V0ZjgnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9pbnN0YWxsXFwtKD86dGVzdHxzdGFnZXxkZXZ8cHJvZCkkL2dtLCAnJyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvY2hlY2tzdW1cXC4oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKVxcLmpzb24kL2dtLCAnJyk7XG4gIGZzLndyaXRlRmlsZVN5bmMoZ2l0aWdub3JlRmlsZSwgZ2l0aWdub3JlKTtcbn1cbiJdfQ==