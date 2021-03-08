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
const __plink_1 = __importDefault(require("__plink"));
const prebuild_setting_1 = require("../isom/prebuild-setting");
const log = __plink_1.default.logger;
let pkJson = require(path_1.default.resolve('package.json'));
function main(env, appName, buildStaticOnly = false, pushBranch = true, isForce = false, secret, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = prebuild_setting_1.getSetting();
        const rootDir = __plink_1.default.config().rootPath;
        const deployBranch = setting.prebuildDeployBranch;
        // if (pushBranch)
        merge_artifacts_1.mergeBack();
        const zipSrc = __plink_1.default.config.resolve('staticDir');
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
        if (appName === 'node-server') {
            yield remote_deploy_1.digestInstallingFiles();
            log.info(yield artifacts_1.stringifyListAllVersions());
        }
        // const zipDir = Path.resolve('install-' + env);
        try {
            yield process_utils_1.spawn('git', 'branch', '-D', deployBranch, { cwd: rootDir, silent: true }).promise;
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
        log.info('------- push to deployment remote -------');
        yield pushDeployBranch(deployBranch, rootDir, env, appName, commitComment);
        log.info('------- create tag and new release branch -------');
        yield pushTagAndReleaseBranch(rootDir, pushBranch, commitComment);
        yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
    });
}
exports.main = main;
function pushDeployBranch(releaseBranch, rootDir, env, appName, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployRemote = __plink_1.default.config()['@wfh/prebuild'].prebuildDeployRemote;
        yield process_utils_1.spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir, silent: true }).promise;
        // removeDevDeps();
        changeGitIgnore();
        yield process_utils_1.spawn('git', 'add', '.', { cwd: rootDir, silent: true }).promise;
        const hookFiles = [path_1.default.resolve(rootDir, '.git/hooks/pre-push'),
            path_1.default.resolve(rootDir, '.git/hooks/pre-commit')];
        for (const gitHooks of hookFiles) {
            if (fs_extra_1.default.existsSync(gitHooks)) {
                fs_extra_1.default.removeSync(gitHooks);
            }
        }
        log.info('commitComment', commitComment);
        yield process_utils_1.spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}`, { cwd: rootDir, silent: true }).promise;
        yield process_utils_1.spawn('git', 'push', '-f', deployRemote, releaseBranch, { cwd: rootDir }).promise;
    });
}
function pushTagAndReleaseBranch(rootDir, pushBranch, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = prebuild_setting_1.getSetting();
        const releaseRemote = setting.tagPushRemote;
        const current = dayjs_1.default();
        const tagName = `${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
        yield process_utils_1.spawn('git', 'tag', '-a', 'v' + tagName, '-m', commitComment ? commitComment : `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`, { cwd: rootDir }).promise;
        yield process_utils_1.spawn('git', 'push', setting.prebuildDeployRemote, 'v' + tagName, { cwd: rootDir }).promise;
        if (pushBranch && releaseRemote && releaseRemote !== setting.prebuildDeployRemote) {
            yield process_utils_1.spawn('git', 'push', releaseRemote, 'HEAD:release/' + tagName, { cwd: rootDir }).promise;
            yield process_utils_1.spawn('git', 'push', releaseRemote, 'v' + tagName, { cwd: rootDir }).promise;
        }
        else {
            log.info('Skip pushing ' + pushBranch);
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
    const gitignoreFile = __plink_1.default.config.resolve('rootPath', '.gitignore');
    let gitignore = fs_extra_1.default.readFileSync(gitignoreFile, 'utf8');
    gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
    gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
    fs_extra_1.default.writeFileSync(gitignoreFile, gitignore);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXBvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkJBQTZCO0FBQzdCLHFFQUEwRDtBQUMxRCxnREFBd0I7QUFDeEIsd0RBQTBCO0FBQzFCLGtEQUEwQjtBQUMxQix1REFBaUU7QUFDakUsNEVBQStGO0FBQy9GLCtDQUFxQztBQUNyQywyQ0FBcUQ7QUFDckQsc0RBQTBCO0FBQzFCLCtEQUFvRDtBQUNwRCxNQUFNLEdBQUcsR0FBRyxpQkFBRyxDQUFDLE1BQU0sQ0FBQztBQUV2QixJQUFJLE1BQU0sR0FBMEQsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUUxRyxTQUFzQixJQUFJLENBQUMsR0FBVyxFQUFFLE9BQStCLEVBQUUsZUFBZSxHQUFHLEtBQUssRUFDOUYsVUFBVSxHQUFHLElBQUksRUFBRSxPQUFPLEdBQUcsS0FBSyxFQUFFLE1BQWUsRUFBRSxhQUFzQjs7UUFFM0UsTUFBTSxPQUFPLEdBQUcsNkJBQVUsRUFBRSxDQUFDO1FBQzdCLE1BQU0sT0FBTyxHQUFHLGlCQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO1FBQ3RDLE1BQU0sWUFBWSxHQUFXLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQztRQUUxRCxrQkFBa0I7UUFDbEIsMkJBQVMsRUFBRSxDQUFDO1FBRVosTUFBTSxNQUFNLEdBQUcsaUJBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLElBQUksT0FBMkIsQ0FBQztRQUVoQyxJQUFJLE9BQU8sS0FBSyxhQUFhLEVBQUU7WUFDN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0I7WUFDRCxPQUFPLEdBQUcsTUFBTSw0QkFBWSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLCtCQUErQixDQUFDLENBQUM7WUFFM0YsTUFBTSxzQkFBc0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNwRSxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTtnQkFDaEUsTUFBTSxTQUFTLEdBQUcsTUFBTSw0QkFBWSxDQUFDLHNCQUFzQixFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN0SCxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsc0JBQXNCLE9BQU8sU0FBUyxFQUFFLENBQUMsQ0FBQzthQUM1RDtTQUNGO1FBRUQsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLE1BQU0scUNBQXFCLEVBQUUsQ0FBQztZQUM5QixHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sb0NBQXdCLEVBQUUsQ0FBQyxDQUFDO1NBQzVDO1FBRUQsaURBQWlEO1FBRWpELElBQUk7WUFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDMUY7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3RCO1FBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxtQ0FBaUIsRUFBRSxDQUFDO1FBRTdDLElBQUksZUFBZSxJQUFJLE9BQU8sRUFBRTtZQUM5QixrQ0FBa0M7WUFDbEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7Z0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELEdBQUcsTUFBTTtvQkFDakYsNEZBQTRGLEdBQUcsS0FBSyxDQUFDLENBQUM7YUFDdkc7WUFDRCxJQUFJO2dCQUNGLE1BQU0sa0JBQUksQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDdkg7WUFBQyxPQUFPLEVBQUUsRUFBRTtnQkFDWCxJQUFJO29CQUNGLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO2lCQUNwRjtnQkFBQyxPQUFPLEVBQUUsRUFBRSxHQUFFO2dCQUNmLE1BQU0sRUFBRSxDQUFDO2FBQ1Y7U0FDRjtRQUVELEdBQUcsQ0FBQyxJQUFJLENBQUMsMkNBQTJDLENBQUMsQ0FBQztRQUN0RCxNQUFNLGdCQUFnQixDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztRQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1EQUFtRCxDQUFDLENBQUM7UUFDOUQsTUFBTSx1QkFBdUIsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUN2RSxDQUFDO0NBQUE7QUFoRUQsb0JBZ0VDO0FBRUQsU0FBZSxnQkFBZ0IsQ0FBQyxhQUFxQixFQUFFLE9BQWUsRUFBRSxHQUFXLEVBQUUsT0FBZSxFQUFFLGFBQXNCOztRQUMxSCxNQUFNLFlBQVksR0FBRyxpQkFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO1FBRXhFLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUM1RixtQkFBbUI7UUFDbkIsZUFBZSxFQUFFLENBQUM7UUFDbEIsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDdkUsTUFBTSxTQUFTLEdBQUcsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQztZQUM3RCxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDbEQsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDaEMsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0Isa0JBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDekI7U0FDRjtRQUNELEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxPQUFPLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3ZKLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3pGLENBQUM7Q0FBQTtBQUVELFNBQWUsdUJBQXVCLENBQUMsT0FBZSxFQUFFLFVBQW1CLEVBQUUsYUFBc0I7O1FBQ2pHLE1BQU0sT0FBTyxHQUFHLDZCQUFVLEVBQUUsQ0FBQztRQUM3QixNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzVDLE1BQU0sT0FBTyxHQUFHLGVBQUssRUFBRSxDQUFDO1FBQ3hCLE1BQU0sT0FBTyxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUM1RixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLE9BQU8sRUFBRSxJQUFJLEVBQ2pELGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxlQUFlLE9BQU8sQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsRUFBRSxFQUN0RixFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUMzQixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxHQUFHLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUVqRyxJQUFJLFVBQVUsSUFBSSxhQUFhLElBQUksYUFBYSxLQUFLLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRTtZQUNqRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsZUFBZSxHQUFHLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUMvRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxHQUFHLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztTQUNwRjthQUFNO1lBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsVUFBVSxDQUFDLENBQUM7U0FDeEM7SUFDSCxDQUFDO0NBQUE7QUFFRCw2QkFBNkI7QUFDN0IsNkNBQTZDO0FBQzdDLGlDQUFpQztBQUNqQyxzREFBc0Q7QUFDdEQsMkNBQTJDO0FBQzNDLG9EQUFvRDtBQUNwRCwrQ0FBK0M7QUFDL0MsSUFBSTtBQUVKLFNBQVMsZUFBZTtJQUN0QixNQUFNLGFBQWEsR0FBRyxpQkFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ25FLElBQUksU0FBUyxHQUFHLGtCQUFFLENBQUMsWUFBWSxDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2RCxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRixrQkFBRSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDN0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgZGF5anMgZnJvbSAnZGF5anMnO1xuaW1wb3J0IHsgbWVyZ2VCYWNrLCBnZXRDdXJyQnJhbmNoTmFtZSB9IGZyb20gJy4vbWVyZ2UtYXJ0aWZhY3RzJztcbmltcG9ydCB7IGRpZ2VzdEluc3RhbGxpbmdGaWxlcywgY2hlY2taaXBGaWxlIH0gZnJvbSAnQHdmaC9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveSc7XG5pbXBvcnQgeyBzZW5kIH0gZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5pbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnLi9hcnRpZmFjdHMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9wcmVidWlsZC1zZXR0aW5nJztcbmNvbnN0IGxvZyA9IGFwaS5sb2dnZXI7XG5cbmxldCBwa0pzb246IHtuYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZzsgZGV2RGVwZW5kZW5jaWVzOiBhbnl9ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ3BhY2thZ2UuanNvbicpKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oZW52OiBzdHJpbmcsIGFwcE5hbWU6ICdub2RlLXNlcnZlcicgfCBzdHJpbmcsIGJ1aWxkU3RhdGljT25seSA9IGZhbHNlLFxuICBwdXNoQnJhbmNoID0gdHJ1ZSwgaXNGb3JjZSA9IGZhbHNlLCBzZWNyZXQ/OiBzdHJpbmcsIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcblxuICBjb25zdCBzZXR0aW5nID0gZ2V0U2V0dGluZygpO1xuICBjb25zdCByb290RGlyID0gYXBpLmNvbmZpZygpLnJvb3RQYXRoO1xuICBjb25zdCBkZXBsb3lCcmFuY2g6IHN0cmluZyA9IHNldHRpbmcucHJlYnVpbGREZXBsb3lCcmFuY2g7XG5cbiAgLy8gaWYgKHB1c2hCcmFuY2gpXG4gIG1lcmdlQmFjaygpO1xuXG4gIGNvbnN0IHppcFNyYyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxldCB6aXBGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKGFwcE5hbWUgIT09ICdub2RlLXNlcnZlcicpIHtcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICB9XG4gICAgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZSh6aXBTcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUsIC8oW1xcXFwvXXN0YXRzW15dKlxcLmpzb258XFwubWFwKSQvKTtcblxuICAgIGNvbnN0IGdlbmVyYXRlZFNlcnZlckZpbGVEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2Rpc3Qvc2VydmVyJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdlbmVyYXRlZFNlcnZlckZpbGVEaXIsIGFwcE5hbWUpKSkge1xuICAgICAgY29uc3Qgc2VydmVyWmlwID0gYXdhaXQgY2hlY2taaXBGaWxlKGdlbmVyYXRlZFNlcnZlckZpbGVEaXIsIFBhdGgucmVzb2x2ZShyb290RGlyLCAnc2VydmVyLWNvbnRlbnQtJyArIGVudiksIGFwcE5hbWUpO1xuICAgICAgbG9nLmluZm8oYFBhY2sgJHtnZW5lcmF0ZWRTZXJ2ZXJGaWxlRGlyfSB0byAke3NlcnZlclppcH1gKTtcbiAgICB9XG4gIH1cblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJykge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICAgIGxvZy5pbmZvKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgZGVwbG95QnJhbmNoLCB7IGN3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlIH0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZGVidWcoZS5tZXNzYWdlKTtcbiAgfVxuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChidWlsZFN0YXRpY09ubHkgJiYgemlwRmlsZSkge1xuICAgIC8vIER5bmFtaWNhbGx5IHB1c2ggdG8gTm9kZSBzZXJ2ZXJcbiAgICBjb25zdCBjZmdCeUVudiA9IHNldHRpbmcuYnlFbnZbZW52XTtcbiAgICBpZiAoY2ZnQnlFbnYgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgJ0B3ZmgvcHJlYnVpbGQuYnlFbnZbXCIke2Vudn1cIl0nLGAgK1xuICAgICAgYGFkZCB0aGlzIHByb3BlcnR5IHdpdGggY29tbWFuZCBsaW5lIGFyZ3VtZW50ICctYyA8ZmlsZT4nIG9yICctLXByb3AgQHdmaC9wcmVidWlsZC5ieUVudltcIiR7ZW52fVwiXSdgKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmQoZW52LCBhcHBOYW1lLCB6aXBGaWxlLCBzZXR0aW5nLmJ5RW52W2Vudl0uc2VuZENvbmN1cnJlbmN5ICwgc2V0dGluZy5ieUVudltlbnZdLnNlbmROb2RlcywgaXNGb3JjZSwgc2VjcmV0KTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7fVxuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgbG9nLmluZm8oJy0tLS0tLS0gcHVzaCB0byBkZXBsb3ltZW50IHJlbW90ZSAtLS0tLS0tJyk7XG4gIGF3YWl0IHB1c2hEZXBsb3lCcmFuY2goZGVwbG95QnJhbmNoLCByb290RGlyLCBlbnYsIGFwcE5hbWUsIGNvbW1pdENvbW1lbnQpO1xuICBsb2cuaW5mbygnLS0tLS0tLSBjcmVhdGUgdGFnIGFuZCBuZXcgcmVsZWFzZSBicmFuY2ggLS0tLS0tLScpO1xuICBhd2FpdCBwdXNoVGFnQW5kUmVsZWFzZUJyYW5jaChyb290RGlyLCBwdXNoQnJhbmNoLCBjb21taXRDb21tZW50KTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hEZXBsb3lCcmFuY2gocmVsZWFzZUJyYW5jaDogc3RyaW5nLCByb290RGlyOiBzdHJpbmcsIGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcbiAgY29uc3QgZGVwbG95UmVtb3RlID0gYXBpLmNvbmZpZygpWydAd2ZoL3ByZWJ1aWxkJ10ucHJlYnVpbGREZXBsb3lSZW1vdGU7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgLy8gcmVtb3ZlRGV2RGVwcygpO1xuICBjaGFuZ2VHaXRJZ25vcmUoKTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdhZGQnLCAnLicsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgY29uc3QgaG9va0ZpbGVzID0gW1BhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdC9ob29rcy9wcmUtcHVzaCcpLFxuICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdC9ob29rcy9wcmUtY29tbWl0JyldO1xuICBmb3IgKGNvbnN0IGdpdEhvb2tzIG9mIGhvb2tGaWxlcykge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGdpdEhvb2tzKSkge1xuICAgICAgZnMucmVtb3ZlU3luYyhnaXRIb29rcyk7XG4gICAgfVxuICB9XG4gIGxvZy5pbmZvKCdjb21taXRDb21tZW50JywgY29tbWl0Q29tbWVudCk7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY29tbWl0JywgJy1tJywgY29tbWl0Q29tbWVudCA/IGNvbW1pdENvbW1lbnQgOiBgUHJlYnVpbGQgbm9kZSBzZXJ2ZXIgJHtlbnZ9IC0gJHthcHBOYW1lfWAsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgZGVwbG95UmVtb3RlLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpcn0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hUYWdBbmRSZWxlYXNlQnJhbmNoKHJvb3REaXI6IHN0cmluZywgcHVzaEJyYW5jaDogYm9vbGVhbiwgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCBzZXR0aW5nID0gZ2V0U2V0dGluZygpO1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gc2V0dGluZy50YWdQdXNoUmVtb3RlO1xuICBjb25zdCBjdXJyZW50ID0gZGF5anMoKTtcbiAgY29uc3QgdGFnTmFtZSA9IGAke3BrSnNvbi52ZXJzaW9ufS0ke2N1cnJlbnQuZm9ybWF0KCdISG1tc3MnKX0tJHtjdXJyZW50LmZvcm1hdCgnWVlNTUREJyl9YDtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICd0YWcnLCAnLWEnLCAndicgKyB0YWdOYW1lLCAnLW0nLFxuICAgIGNvbW1pdENvbW1lbnQgPyBjb21taXRDb21tZW50IDogYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLFxuICAgIHsgY3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZSwgJ3YnICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGlmIChwdXNoQnJhbmNoICYmIHJlbGVhc2VSZW1vdGUgJiYgcmVsZWFzZVJlbW90ZSAhPT0gc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZSkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsIHJlbGVhc2VSZW1vdGUsICdIRUFEOnJlbGVhc2UvJyArIHRhZ05hbWUsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgcmVsZWFzZVJlbW90ZSwgJ3YnICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnU2tpcCBwdXNoaW5nICcgKyBwdXNoQnJhbmNoKTtcbiAgfVxufVxuXG4vLyBmdW5jdGlvbiByZW1vdmVEZXZEZXBzKCkge1xuLy8gICBjb25zdCBqc29uID0gT2JiamVjdC5hc3NpZ24oe30sIHBrSnNvbik7XG4vLyAgIGRlbGV0ZSBqc29uLmRldkRlcGVuZGVuY2llcztcbi8vICAgY29uc3QgbmV3SnNvbiA9IEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICdcXHQnKTtcbi8vICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbi8vICAgbG9nLmluZm8oJ2NoYW5nZSBwYWNrYWdlLmpzb24gdG86XFxuJywgbmV3SnNvbik7XG4vLyAgIGZzLndyaXRlRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsIG5ld0pzb24pO1xuLy8gfVxuXG5mdW5jdGlvbiBjaGFuZ2VHaXRJZ25vcmUoKSB7XG4gIGNvbnN0IGdpdGlnbm9yZUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgJy5naXRpZ25vcmUnKTtcbiAgbGV0IGdpdGlnbm9yZSA9IGZzLnJlYWRGaWxlU3luYyhnaXRpZ25vcmVGaWxlLCAndXRmOCcpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2luc3RhbGxcXC0oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKSQvZ20sICcnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9jaGVja3N1bVxcLig/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpXFwuanNvbiQvZ20sICcnKTtcbiAgZnMud3JpdGVGaWxlU3luYyhnaXRpZ25vcmVGaWxlLCBnaXRpZ25vcmUpO1xufVxuIl19