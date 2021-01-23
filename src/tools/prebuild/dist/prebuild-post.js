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
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
let pkJson = require(path_1.default.resolve('package.json'));
function main(env, appName, buildStaticOnly = false, pushBranch = true, isForce = false, secret, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = __api_1.default.config.get(__api_1.default.packageName);
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
        const releaseRemote = __api_1.default.config.get(__api_1.default.packageName).prebuildGitRemote;
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
        const setting = __api_1.default.config.get(__api_1.default.packageName);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXBvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHFFQUEwRDtBQUMxRCxnREFBd0I7QUFDeEIsd0RBQTBCO0FBQzFCLGtEQUEwQjtBQUMxQix1REFBaUU7QUFDakUsNEVBQStGO0FBQy9GLCtDQUFxQztBQUNyQywyQ0FBcUQ7QUFDckQsa0RBQXdCO0FBQ3hCLG9EQUE0QjtBQUU1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0FBRTlELElBQUksTUFBTSxHQUEwRCxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBRTFHLFNBQXNCLElBQUksQ0FBQyxHQUFXLEVBQUUsT0FBZSxFQUFFLGVBQWUsR0FBRyxLQUFLLEVBQzlFLFVBQVUsR0FBRyxJQUFJLEVBQUUsT0FBTyxHQUFHLEtBQUssRUFBRSxNQUFlLEVBQUUsYUFBc0I7O1FBRTNFLE1BQU0sT0FBTyxHQUFrQixlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0QsTUFBTSxPQUFPLEdBQUcsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztRQUN0QyxNQUFNLGFBQWEsR0FBVyxPQUFPLENBQUMscUJBQXFCLENBQUM7UUFFNUQsSUFBSSxVQUFVO1lBQ1osMkJBQVMsRUFBRSxDQUFDO1FBRWQsTUFBTSxNQUFNLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDL0MsSUFBSSxPQUEyQixDQUFDO1FBRWhDLElBQUksT0FBTyxLQUFLLGFBQWEsRUFBRTtZQUM3QixNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFFO2dCQUM5QixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUMzQjtZQUNELE9BQU8sR0FBRyxNQUFNLDRCQUFZLENBQUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsK0JBQStCLENBQUMsQ0FBQztZQUUzRixNQUFNLHNCQUFzQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ3BFLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsQ0FBQyxFQUFFO2dCQUNoRSxNQUFNLFNBQVMsR0FBRyxNQUFNLDRCQUFZLENBQUMsc0JBQXNCLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEdBQUcsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQ3RILEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxzQkFBc0IsT0FBTyxTQUFTLEVBQUUsQ0FBQyxDQUFDO2FBQzVEO1NBQ0Y7UUFFRCxJQUFJLE9BQU8sS0FBSyxhQUFhLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUN6RCxNQUFNLHFDQUFxQixFQUFFLENBQUM7WUFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLG9DQUF3QixFQUFFLENBQUMsQ0FBQztTQUM1QztRQUVELGlEQUFpRDtRQUVqRCxJQUFJO1lBQ0YsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQzNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN0QjtRQUVELE1BQU0sVUFBVSxHQUFHLE1BQU0sbUNBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLGVBQWUsSUFBSSxPQUFPLEVBQUU7WUFDOUIsa0NBQWtDO1lBQ2xDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEMsSUFBSSxRQUFRLElBQUksSUFBSSxFQUFFO2dCQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHdEQUF3RCxHQUFHLE1BQU07b0JBQ2pGLDRGQUE0RixHQUFHLEtBQUssQ0FBQyxDQUFDO2FBQ3ZHO1lBQ0QsSUFBSTtnQkFDRixNQUFNLGtCQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ3ZIO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsSUFBSTtvQkFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztpQkFDcEY7Z0JBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRTtnQkFDZixNQUFNLEVBQUUsQ0FBQzthQUNWO1NBQ0Y7UUFFRCxJQUFJLFVBQVU7WUFDWixNQUFNLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUUvRSxJQUFJLE9BQU8sS0FBSyxhQUFhLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUN6RCxNQUFNLE1BQU0sQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7U0FDdEM7UUFDRCxNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7SUFDdkUsQ0FBQztDQUFBO0FBbEVELG9CQWtFQztBQUVELFNBQWUsaUJBQWlCLENBQUMsYUFBcUIsRUFBRSxPQUFlLEVBQUUsR0FBVyxFQUFFLE9BQWUsRUFBRSxhQUFzQjs7UUFDM0gsTUFBTSxhQUFhLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBRXhFLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDOUUsbUJBQW1CO1FBQ25CLGVBQWUsRUFBRSxDQUFDO1FBQ2xCLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUN6RCxNQUFNLFNBQVMsR0FBRyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHFCQUFxQixDQUFDO1lBQzdELGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUNsRCxLQUFLLE1BQU0sUUFBUSxJQUFJLFNBQVMsRUFBRTtZQUNoQyxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMzQixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUN6QjtTQUNGO1FBQ0QsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDekMsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsR0FBRyxNQUFNLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3pJLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzNGLENBQUM7Q0FBQTtBQUVELFNBQWUsTUFBTSxDQUFDLE9BQWUsRUFBRSxhQUFzQjs7UUFDM0QsTUFBTSxPQUFPLEdBQWtCLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUM7UUFDaEQsTUFBTSxPQUFPLEdBQUcsZUFBSyxFQUFFLENBQUM7UUFDeEIsTUFBTSxPQUFPLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVGLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsT0FBTyxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsZUFBZSxPQUFPLENBQUMsTUFBTSxDQUFDLHFCQUFxQixDQUFDLEVBQUUsRUFDekksRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDNUIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLEdBQUcsR0FBRyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFFbkYsSUFBSSxPQUFPLENBQUMsYUFBYSxJQUFJLE9BQU8sQ0FBQyxhQUFhLEtBQUssT0FBTyxDQUFDLGlCQUFpQixFQUFFO1lBQ2hGLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxhQUFhLEVBQUUsZUFBZSxHQUFHLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUN2RyxNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsYUFBYSxFQUFFLEdBQUcsR0FBRyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDNUY7SUFDSCxDQUFDO0NBQUE7QUFFRCw2QkFBNkI7QUFDN0IsNkNBQTZDO0FBQzdDLGlDQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsMkNBQTJDO0FBQzNDLG9EQUFvRDtBQUNwRCwrQ0FBK0M7QUFDL0MsSUFBSTtBQUVKLFNBQVMsZUFBZTtJQUN0QixNQUFNLGFBQWEsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDbkUsSUFBSSxTQUFTLEdBQUcsa0JBQUUsQ0FBQyxZQUFZLENBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZELFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLHdDQUF3QyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLCtDQUErQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25GLGtCQUFFLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM3QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBkYXlqcyBmcm9tICdkYXlqcyc7XG5pbXBvcnQgeyBtZXJnZUJhY2ssIGdldEN1cnJCcmFuY2hOYW1lIH0gZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuaW1wb3J0IHsgZGlnZXN0SW5zdGFsbGluZ0ZpbGVzLCBjaGVja1ppcEZpbGUgfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95JztcbmltcG9ydCB7IHNlbmQgfSBmcm9tICcuL19zZW5kLXBhdGNoJztcbmltcG9ydCB7c3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zfSBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Q29uZmlndXJhdGlvbn0gZnJvbSAnLi90eXBlcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2VuZC1wYXRjaCcpO1xuXG5sZXQgcGtKc29uOiB7bmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IGRldkRlcGVuZGVuY2llczogYW55fSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdwYWNrYWdlLmpzb24nKSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGJ1aWxkU3RhdGljT25seSA9IGZhbHNlLFxuICBwdXNoQnJhbmNoID0gdHJ1ZSwgaXNGb3JjZSA9IGZhbHNlLCBzZWNyZXQ/OiBzdHJpbmcsIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcblxuICBjb25zdCBzZXR0aW5nOiBDb25maWd1cmF0aW9uID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKTtcbiAgY29uc3Qgcm9vdERpciA9IGFwaS5jb25maWcoKS5yb290UGF0aDtcbiAgY29uc3QgcmVsZWFzZUJyYW5jaDogc3RyaW5nID0gc2V0dGluZy5wcmVidWlsZFJlbGVhc2VCcmFuY2g7XG5cbiAgaWYgKHB1c2hCcmFuY2gpXG4gICAgbWVyZ2VCYWNrKCk7XG5cbiAgY29uc3QgemlwU3JjID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbGV0IHppcEZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBpZiAoYXBwTmFtZSAhPT0gJ25vZGUtc2VydmVyJykge1xuICAgIGNvbnN0IGluc3RhbGxEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKSB7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgIH1cbiAgICB6aXBGaWxlID0gYXdhaXQgY2hlY2taaXBGaWxlKHppcFNyYywgaW5zdGFsbERpciwgYXBwTmFtZSwgLyhbXFxcXC9dc3RhdHNbXl0qXFwuanNvbnxcXC5tYXApJC8pO1xuXG4gICAgY29uc3QgZ2VuZXJhdGVkU2VydmVyRmlsZURpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnZGlzdC9zZXJ2ZXInKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZ2VuZXJhdGVkU2VydmVyRmlsZURpciwgYXBwTmFtZSkpKSB7XG4gICAgICBjb25zdCBzZXJ2ZXJaaXAgPSBhd2FpdCBjaGVja1ppcEZpbGUoZ2VuZXJhdGVkU2VydmVyRmlsZURpciwgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdzZXJ2ZXItY29udGVudC0nICsgZW52KSwgYXBwTmFtZSk7XG4gICAgICBsb2cuaW5mbyhgUGFjayAke2dlbmVyYXRlZFNlcnZlckZpbGVEaXJ9IHRvICR7c2VydmVyWmlwfWApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChhcHBOYW1lID09PSAnbm9kZS1zZXJ2ZXInIHx8IGJ1aWxkU3RhdGljT25seSAhPT0gdHJ1ZSkge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICAgIGxvZy5pbmZvKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmRlYnVnKGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCBjdXJyQnJhbmNoID0gYXdhaXQgZ2V0Q3VyckJyYW5jaE5hbWUoKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ICYmIHppcEZpbGUpIHtcbiAgICAvLyBEeW5hbWljYWxseSBwdXNoIHRvIE5vZGUgc2VydmVyXG4gICAgY29uc3QgY2ZnQnlFbnYgPSBzZXR0aW5nLmJ5RW52W2Vudl07XG4gICAgaWYgKGNmZ0J5RW52ID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBjb25maWd1cmF0aW9uIHByb3BlcnR5ICdAd2ZoL3ByZWJ1aWxkLmJ5RW52W1wiJHtlbnZ9XCJdJyxgICtcbiAgICAgIGBhZGQgdGhpcyBwcm9wZXJ0eSB3aXRoIGNvbW1hbmQgbGluZSBhcmd1bWVudCAnLWMgPGZpbGU+JyBvciAnLS1wcm9wIEB3ZmgvcHJlYnVpbGQuYnlFbnZbXCIke2Vudn1cIl0nYCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kKGVudiwgYXBwTmFtZSwgemlwRmlsZSwgc2V0dGluZy5ieUVudltlbnZdLnNlbmRDb25jdXJyZW5jeSAsIHNldHRpbmcuYnlFbnZbZW52XS5zZW5kTm9kZXMsIGlzRm9yY2UsIHNlY3JldCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlIH0pLnByb21pc2U7XG4gICAgICB9IGNhdGNoIChleCkge31cbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfVxuXG4gIGlmIChwdXNoQnJhbmNoKVxuICAgIGF3YWl0IHB1c2hSZWxlYXNlQnJhbmNoKHJlbGVhc2VCcmFuY2gsIHJvb3REaXIsIGVudiwgYXBwTmFtZSwgY29tbWl0Q29tbWVudCk7XG5cbiAgaWYgKGFwcE5hbWUgPT09ICdub2RlLXNlcnZlcicgfHwgYnVpbGRTdGF0aWNPbmx5ICE9PSB0cnVlKSB7XG4gICAgYXdhaXQgYWRkVGFnKHJvb3REaXIsIGNvbW1pdENvbW1lbnQpO1xuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKS5wcmVidWlsZEdpdFJlbW90ZTtcblxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgJy1iJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgLy8gcmVtb3ZlRGV2RGVwcygpO1xuICBjaGFuZ2VHaXRJZ25vcmUoKTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdhZGQnLCAnLicsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIGNvbnN0IGhvb2tGaWxlcyA9IFtQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXQvaG9va3MvcHJlLXB1c2gnKSxcbiAgICBQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXQvaG9va3MvcHJlLWNvbW1pdCcpXTtcbiAgZm9yIChjb25zdCBnaXRIb29rcyBvZiBob29rRmlsZXMpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRIb29rcykpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmMoZ2l0SG9va3MpO1xuICAgIH1cbiAgfVxuICBsb2cuaW5mbygnY29tbWl0Q29tbWVudCcsIGNvbW1pdENvbW1lbnQpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NvbW1pdCcsICctbScsIGNvbW1pdENvbW1lbnQgPyBjb21taXRDb21tZW50IDogYFByZWJ1aWxkIG5vZGUgc2VydmVyICR7ZW52fSAtICR7YXBwTmFtZX1gLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCAnLWYnLCByZWxlYXNlUmVtb3RlLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRUYWcocm9vdERpcjogc3RyaW5nLCBjb21taXRDb21tZW50Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHNldHRpbmc6IENvbmZpZ3VyYXRpb24gPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gc2V0dGluZy5wcmVidWlsZEdpdFJlbW90ZTtcbiAgY29uc3QgY3VycmVudCA9IGRheWpzKCk7XG4gIGNvbnN0IHRhZ05hbWUgPSBgJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAndGFnJywgJy1hJywgJ3YnICsgdGFnTmFtZSwgJy1tJywgY29tbWl0Q29tbWVudCA/IGNvbW1pdENvbW1lbnQgOiBgUHJlYnVpbGQgb24gJHtjdXJyZW50LmZvcm1hdCgnWVlZWS9NTS9ERCBISDptbTpzcycpfWAsXG4gICAgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgcmVsZWFzZVJlbW90ZSwgJ3YnICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcblxuICBpZiAoc2V0dGluZy50YWdQdXNoUmVtb3RlICYmIHNldHRpbmcudGFnUHVzaFJlbW90ZSAhPT0gc2V0dGluZy5wcmVidWlsZEdpdFJlbW90ZSkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsIHNldHRpbmcudGFnUHVzaFJlbW90ZSwgJ0hFQUQ6cmVsZWFzZS8nICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCBzZXR0aW5nLnRhZ1B1c2hSZW1vdGUsICd2JyArIHRhZ05hbWUsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIH1cbn1cblxuLy8gZnVuY3Rpb24gcmVtb3ZlRGV2RGVwcygpIHtcbi8vICAgY29uc3QganNvbiA9IE9iYmplY3QuYXNzaWduKHt9LCBwa0pzb24pO1xuLy8gICBkZWxldGUganNvbi5kZXZEZXBlbmRlbmNpZXM7XG4vLyAgIGNvbnN0IG5ld0pzb24gPSBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnXFx0Jyk7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4vLyAgIGxvZy5pbmZvKCdjaGFuZ2UgcGFja2FnZS5qc29uIHRvOlxcbicsIG5ld0pzb24pO1xuLy8gICBmcy53cml0ZUZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCBuZXdKc29uKTtcbi8vIH1cblxuZnVuY3Rpb24gY2hhbmdlR2l0SWdub3JlKCkge1xuICBjb25zdCBnaXRpZ25vcmVGaWxlID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdyb290UGF0aCcsICcuZ2l0aWdub3JlJyk7XG4gIGxldCBnaXRpZ25vcmUgPSBmcy5yZWFkRmlsZVN5bmMoZ2l0aWdub3JlRmlsZSwgJ3V0ZjgnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9pbnN0YWxsXFwtKD86dGVzdHxzdGFnZXxkZXZ8cHJvZCkkL2dtLCAnJyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvY2hlY2tzdW1cXC4oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKVxcLmpzb24kL2dtLCAnJyk7XG4gIGZzLndyaXRlRmlsZVN5bmMoZ2l0aWdub3JlRmlsZSwgZ2l0aWdub3JlKTtcbn1cbiJdfQ==