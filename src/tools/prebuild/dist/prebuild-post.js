"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable: no-console
const process_utils_1 = require("dr-comp-package/wfh/dist/process-utils");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const moment_1 = tslib_1.__importDefault(require("moment"));
const merge_artifacts_1 = require("./merge-artifacts");
const remote_deploy_1 = require("@dr-core/assets-processer/dist/remote-deploy");
const _send_patch_1 = require("./_send-patch");
const artifacts_1 = require("@bk/prebuild/dist/artifacts");
const __api_1 = tslib_1.__importDefault(require("__api"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const log = log4js_1.default.getLogger(__api_1.default.packageName + '.send-patch');
let pkJson = require(path_1.default.resolve('package.json'));
function main(env, appName, buildStaticOnly = false, secret) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const setting = __api_1.default.config.get(__api_1.default.packageName);
        const rootDir = path_1.default.resolve();
        const releaseBranch = setting.prebuildReleaseBranch;
        merge_artifacts_1.mergeBack();
        const zipSrc = __api_1.default.config.resolve('staticDir');
        let zipFile;
        if (appName !== 'node-server') {
            const installDir = path_1.default.resolve('install-' + env);
            if (!fs_extra_1.default.existsSync(installDir)) {
                fs_extra_1.default.mkdirpSync(installDir);
            }
            zipFile = yield remote_deploy_1.checkZipFile(zipSrc, installDir, appName, /[\\/]stats[^]*\.json$/);
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
            try {
                yield _send_patch_1.send(env, appName, zipFile, secret);
            }
            catch (ex) {
                try {
                    yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir, silent: true }).promise;
                }
                catch (ex) { }
                throw ex;
            }
        }
        yield pushReleaseBranch(releaseBranch, rootDir, env, appName);
        if (appName === 'node-server' || buildStaticOnly !== true) {
            yield addTag(rootDir);
        }
        yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
    });
}
exports.main = main;
function pushReleaseBranch(releaseBranch, rootDir, env, appName) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const releaseRemote = __api_1.default.config.get(__api_1.default.packageName).prebuildGitRemote;
        yield process_utils_1.spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir }).promise;
        removeDevDeps();
        changeGitIgnore();
        yield process_utils_1.spawn('git', 'add', '.', { cwd: rootDir }).promise;
        const hookFiles = [path_1.default.resolve('.git/hooks/pre-push'), path_1.default.resolve('.git/hooks/pre-commit')];
        for (const gitHooks of hookFiles) {
            if (fs_extra_1.default.existsSync(gitHooks)) {
                fs_extra_1.default.removeSync(gitHooks);
            }
        }
        yield process_utils_1.spawn('git', 'commit', '-m', `Prebuild node server ${env} - ${appName}`, { cwd: rootDir }).promise;
        yield process_utils_1.spawn('git', 'push', '-f', releaseRemote, releaseBranch, { cwd: rootDir }).promise;
    });
}
function addTag(rootDir) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const releaseRemote = __api_1.default.config.get(__api_1.default.packageName).prebuildGitRemote;
        const current = moment_1.default();
        const tagName = `release/${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
        yield process_utils_1.spawn('git', 'tag', '-a', tagName, '-m', `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`, { cwd: rootDir }).promise;
        yield process_utils_1.spawn('git', 'push', releaseRemote, tagName, { cwd: rootDir }).promise;
    });
}
function removeDevDeps() {
    const json = Object.assign({}, pkJson);
    delete json.devDependencies;
    const newJson = JSON.stringify(json, null, '\t');
    // tslint:disable-next-line:no-console
    log.info('change package.json to:\n', newJson);
    fs_extra_1.default.writeFileSync('package.json', newJson);
}
function changeGitIgnore() {
    let gitignore = fs_extra_1.default.readFileSync('.gitignore', 'utf8');
    gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
    gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
    fs_extra_1.default.writeFileSync('.gitignore', gitignore);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBQ3JDLDJEQUFxRTtBQUNyRSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFMUcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsZUFBZSxHQUFHLEtBQUssRUFBRSxNQUFlOztRQUMvRixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFaEQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRS9CLE1BQU0sYUFBYSxHQUFXLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztRQUU1RCwyQkFBUyxFQUFFLENBQUM7UUFFWixNQUFNLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxJQUFJLE9BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDM0I7WUFDRCxPQUFPLEdBQUcsTUFBTSw0QkFBWSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUM7U0FDcEY7UUFFRCxJQUFJLE9BQU8sS0FBSyxhQUFhLElBQUksZUFBZSxLQUFLLElBQUksRUFBRTtZQUN6RCxNQUFNLHFDQUFxQixFQUFFLENBQUM7WUFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLG9DQUF3QixFQUFFLENBQUMsQ0FBQztTQUM1QztRQUVELGlEQUFpRDtRQUVqRCxJQUFJO1lBQ0YsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1NBQzNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUN0QjtRQUVELE1BQU0sVUFBVSxHQUFHLE1BQU0sbUNBQWlCLEVBQUUsQ0FBQztRQUU3QyxJQUFJLGVBQWUsSUFBSSxPQUFPLEVBQUU7WUFDOUIsa0NBQWtDO1lBQ2xDLElBQUk7Z0JBQ0YsTUFBTSxrQkFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQzNDO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsSUFBSTtvQkFDRixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztpQkFDcEY7Z0JBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRTtnQkFDZixNQUFNLEVBQUUsQ0FBQzthQUNWO1NBQ0Y7UUFFRCxNQUFNLGlCQUFpQixDQUFDLGFBQWEsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTlELElBQUksT0FBTyxLQUFLLGFBQWEsSUFBSSxlQUFlLEtBQUssSUFBSSxFQUFFO1lBQ3pELE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0QsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsVUFBVSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ3ZFLENBQUM7Q0FBQTtBQXJERCxvQkFxREM7QUFFRCxTQUFlLGlCQUFpQixDQUFDLGFBQXFCLEVBQUUsT0FBZSxFQUFFLEdBQVcsRUFBRSxPQUFlOztRQUNuRyxNQUFNLGFBQWEsR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsaUJBQWlCLENBQUM7UUFFeEUsTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztRQUM5RSxhQUFhLEVBQUUsQ0FBQztRQUNoQixlQUFlLEVBQUUsQ0FBQztRQUNsQixNQUFNLHFCQUFLLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDekQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDL0YsS0FBSyxNQUFNLFFBQVEsSUFBSSxTQUFTLEVBQUU7WUFDaEMsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0Isa0JBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDekI7U0FDRjtRQUNELE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSx3QkFBd0IsR0FBRyxNQUFNLE9BQU8sRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ3pHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQzNGLENBQUM7Q0FBQTtBQUVELFNBQWUsTUFBTSxDQUFDLE9BQWU7O1FBQ25DLE1BQU0sYUFBYSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztRQUN4RSxNQUFNLE9BQU8sR0FBRyxnQkFBTSxFQUFFLENBQUM7UUFDekIsTUFBTSxPQUFPLEdBQUcsV0FBVyxNQUFNLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQ3BHLE1BQU0scUJBQUssQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGVBQWUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDakksTUFBTSxxQkFBSyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMvRSxDQUFDO0NBQUE7QUFFRCxTQUFTLGFBQWE7SUFDcEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzVCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNqRCxzQ0FBc0M7SUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvQyxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsZUFBZTtJQUN0QixJQUFJLFNBQVMsR0FBRyxrQkFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsK0NBQStDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsa0JBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzVDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L3ByZWJ1aWxkLXBvc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgeyBtZXJnZUJhY2ssIGdldEN1cnJCcmFuY2hOYW1lIH0gZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuaW1wb3J0IHsgZGlnZXN0SW5zdGFsbGluZ0ZpbGVzLCBjaGVja1ppcEZpbGUgfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveSc7XG5pbXBvcnQgeyBzZW5kIH0gZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5pbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnQGJrL3ByZWJ1aWxkL2Rpc3QvYXJ0aWZhY3RzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnNlbmQtcGF0Y2gnKTtcblxubGV0IHBrSnNvbjoge25hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBkZXZEZXBlbmRlbmNpZXM6IGFueX0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nLCBidWlsZFN0YXRpY09ubHkgPSBmYWxzZSwgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlc29sdmUoKTtcblxuICBjb25zdCByZWxlYXNlQnJhbmNoOiBzdHJpbmcgPSBzZXR0aW5nLnByZWJ1aWxkUmVsZWFzZUJyYW5jaDtcblxuICBtZXJnZUJhY2soKTtcblxuICBjb25zdCB6aXBTcmMgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuICBsZXQgemlwRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGlmIChhcHBOYW1lICE9PSAnbm9kZS1zZXJ2ZXInKSB7XG4gICAgY29uc3QgaW5zdGFsbERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gICAgfVxuICAgIHppcEZpbGUgPSBhd2FpdCBjaGVja1ppcEZpbGUoemlwU3JjLCBpbnN0YWxsRGlyLCBhcHBOYW1lLCAvW1xcXFwvXXN0YXRzW15dKlxcLmpzb24kLyk7XG4gIH1cblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09IHRydWUpIHtcbiAgICBhd2FpdCBkaWdlc3RJbnN0YWxsaW5nRmlsZXMoKTtcbiAgICBsb2cuaW5mbyhhd2FpdCBzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gIH1cblxuICAvLyBjb25zdCB6aXBEaXIgPSBQYXRoLnJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2JyYW5jaCcsICctRCcsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5kZWJ1ZyhlLm1lc3NhZ2UpO1xuICB9XG5cbiAgY29uc3QgY3VyckJyYW5jaCA9IGF3YWl0IGdldEN1cnJCcmFuY2hOYW1lKCk7XG5cbiAgaWYgKGJ1aWxkU3RhdGljT25seSAmJiB6aXBGaWxlKSB7XG4gICAgLy8gRHluYW1pY2FsbHkgcHVzaCB0byBOb2RlIHNlcnZlclxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kKGVudiwgYXBwTmFtZSwgemlwRmlsZSwgc2VjcmV0KTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7fVxuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgcHVzaFJlbGVhc2VCcmFuY2gocmVsZWFzZUJyYW5jaCwgcm9vdERpciwgZW52LCBhcHBOYW1lKTtcblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09IHRydWUpIHtcbiAgICBhd2FpdCBhZGRUYWcocm9vdERpcik7XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hSZWxlYXNlQnJhbmNoKHJlbGVhc2VCcmFuY2g6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpLnByZWJ1aWxkR2l0UmVtb3RlO1xuXG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCAnLWInLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICByZW1vdmVEZXZEZXBzKCk7XG4gIGNoYW5nZUdpdElnbm9yZSgpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2FkZCcsICcuJywgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgY29uc3QgaG9va0ZpbGVzID0gW1BhdGgucmVzb2x2ZSgnLmdpdC9ob29rcy9wcmUtcHVzaCcpLCBQYXRoLnJlc29sdmUoJy5naXQvaG9va3MvcHJlLWNvbW1pdCcpXTtcbiAgZm9yIChjb25zdCBnaXRIb29rcyBvZiBob29rRmlsZXMpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRIb29rcykpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmMoZ2l0SG9va3MpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NvbW1pdCcsICctbScsIGBQcmVidWlsZCBub2RlIHNlcnZlciAke2Vudn0gLSAke2FwcE5hbWV9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgcmVsZWFzZVJlbW90ZSwgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkVGFnKHJvb3REaXI6IHN0cmluZykge1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKS5wcmVidWlsZEdpdFJlbW90ZTtcbiAgY29uc3QgY3VycmVudCA9IG1vbWVudCgpO1xuICBjb25zdCB0YWdOYW1lID0gYHJlbGVhc2UvJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAndGFnJywgJy1hJywgdGFnTmFtZSwgJy1tJywgYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCByZWxlYXNlUmVtb3RlLCB0YWdOYW1lLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5mdW5jdGlvbiByZW1vdmVEZXZEZXBzKCkge1xuICBjb25zdCBqc29uID0gT2JqZWN0LmFzc2lnbih7fSwgcGtKc29uKTtcbiAgZGVsZXRlIGpzb24uZGV2RGVwZW5kZW5jaWVzO1xuICBjb25zdCBuZXdKc29uID0gSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJ1xcdCcpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICBsb2cuaW5mbygnY2hhbmdlIHBhY2thZ2UuanNvbiB0bzpcXG4nLCBuZXdKc29uKTtcbiAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgbmV3SnNvbik7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUdpdElnbm9yZSgpIHtcbiAgbGV0IGdpdGlnbm9yZSA9IGZzLnJlYWRGaWxlU3luYygnLmdpdGlnbm9yZScsICd1dGY4Jyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvaW5zdGFsbFxcLSg/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpJC9nbSwgJycpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2NoZWNrc3VtXFwuKD86dGVzdHxzdGFnZXxkZXZ8cHJvZClcXC5qc29uJC9nbSwgJycpO1xuICBmcy53cml0ZUZpbGVTeW5jKCcuZ2l0aWdub3JlJywgZ2l0aWdub3JlKTtcbn1cbiJdfQ==
