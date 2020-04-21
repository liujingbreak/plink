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
        let releaseBranch = setting.prebuildReleaseBranch;
        merge_artifacts_1.mergeBack();
        const zipSrc = __api_1.default.config.resolve('staticDir');
        let zipFile;
        if (appName !== 'node-server') {
            const installDir = path_1.default.resolve('install-' + env);
            if (!fs_extra_1.default.existsSync(installDir)) {
                fs_extra_1.default.mkdirpSync(installDir);
            }
            zipFile = yield remote_deploy_1.checkZipFile(zipSrc, installDir, appName, /^stats[^]*\.json$/);
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
        if (!buildStaticOnly) {
            yield addTag(rootDir);
        }
        yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
    });
}
exports.main = main;
function pushReleaseBranch(releaseBranch, rootDir, env, appName) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        yield process_utils_1.spawn('git', 'push', '-f', 'origin', releaseBranch, { cwd: rootDir }).promise;
    });
}
function addTag(rootDir) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const current = moment_1.default();
        const tagName = `release/${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
        yield process_utils_1.spawn('git', 'tag', '-a', tagName, '-m', `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`, { cwd: rootDir }).promise;
        yield process_utils_1.spawn('git', 'push', 'origin', tagName, { cwd: rootDir }).promise;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBQ3JDLDJEQUFxRTtBQUNyRSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFMUcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsZUFBZSxHQUFHLEtBQUssRUFBRSxNQUFlOztRQUMvRixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFaEQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRS9CLElBQUksYUFBYSxHQUFHLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztRQUVsRCwyQkFBUyxFQUFFLENBQUM7UUFFWixNQUFNLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxJQUFJLE9BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsa0JBQUUsQ0FBQyxV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QUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsZUFBZTtJQUN0QixJQUFJLFNBQVMsR0FBRyxrQkFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsK0NBQStDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsa0JBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzVDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L3ByZWJ1aWxkLXBvc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgeyBtZXJnZUJhY2ssIGdldEN1cnJCcmFuY2hOYW1lIH0gZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuaW1wb3J0IHsgZGlnZXN0SW5zdGFsbGluZ0ZpbGVzLCBjaGVja1ppcEZpbGUgfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveSc7XG5pbXBvcnQgeyBzZW5kIH0gZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5pbXBvcnQge3N0cmluZ2lmeUxpc3RBbGxWZXJzaW9uc30gZnJvbSAnQGJrL3ByZWJ1aWxkL2Rpc3QvYXJ0aWZhY3RzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnNlbmQtcGF0Y2gnKTtcblxubGV0IHBrSnNvbjoge25hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBkZXZEZXBlbmRlbmNpZXM6IGFueX0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nLCBidWlsZFN0YXRpY09ubHkgPSBmYWxzZSwgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlc29sdmUoKTtcblxuICBsZXQgcmVsZWFzZUJyYW5jaCA9IHNldHRpbmcucHJlYnVpbGRSZWxlYXNlQnJhbmNoO1xuXG4gIG1lcmdlQmFjaygpO1xuXG4gIGNvbnN0IHppcFNyYyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxldCB6aXBGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKGFwcE5hbWUgIT09ICdub2RlLXNlcnZlcicpIHtcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICB9XG4gICAgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZSh6aXBTcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUsIC9ec3RhdHNbXl0qXFwuanNvbiQvKTtcbiAgfVxuXG4gIGlmIChhcHBOYW1lID09PSAnbm9kZS1zZXJ2ZXInIHx8IGJ1aWxkU3RhdGljT25seSAhPT0gdHJ1ZSkge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICAgIGxvZy5pbmZvKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmRlYnVnKGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCBjdXJyQnJhbmNoID0gYXdhaXQgZ2V0Q3VyckJyYW5jaE5hbWUoKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ICYmIHppcEZpbGUpIHtcbiAgICAvLyBEeW5hbWljYWxseSBwdXNoIHRvIE5vZGUgc2VydmVyXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmQoZW52LCBhcHBOYW1lLCB6aXBGaWxlLCBzZWNyZXQpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICAgICAgfSBjYXRjaCAoZXgpIHt9XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoLCByb290RGlyLCBlbnYsIGFwcE5hbWUpO1xuXG4gIGlmICghYnVpbGRTdGF0aWNPbmx5KSB7XG4gICAgYXdhaXQgYWRkVGFnKHJvb3REaXIpO1xuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZykge1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgJy1iJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgcmVtb3ZlRGV2RGVwcygpO1xuICBjaGFuZ2VHaXRJZ25vcmUoKTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdhZGQnLCAnLicsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIGNvbnN0IGhvb2tGaWxlcyA9IFtQYXRoLnJlc29sdmUoJy5naXQvaG9va3MvcHJlLXB1c2gnKSwgUGF0aC5yZXNvbHZlKCcuZ2l0L2hvb2tzL3ByZS1jb21taXQnKV07XG4gIGZvciAoY29uc3QgZ2l0SG9va3Mgb2YgaG9va0ZpbGVzKSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0SG9va3MpKSB7XG4gICAgICBmcy5yZW1vdmVTeW5jKGdpdEhvb2tzKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjb21taXQnLCAnLW0nLCBgUHJlYnVpbGQgbm9kZSBzZXJ2ZXIgJHtlbnZ9IC0gJHthcHBOYW1lfWAsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsICctZicsICdvcmlnaW4nLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRUYWcocm9vdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGN1cnJlbnQgPSBtb21lbnQoKTtcbiAgY29uc3QgdGFnTmFtZSA9IGByZWxlYXNlLyR7cGtKc29uLnZlcnNpb259LSR7Y3VycmVudC5mb3JtYXQoJ0hIbW1zcycpfS0ke2N1cnJlbnQuZm9ybWF0KCdZWU1NREQnKX1gO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3RhZycsICctYScsIHRhZ05hbWUsICctbScsIGBQcmVidWlsZCBvbiAke2N1cnJlbnQuZm9ybWF0KCdZWVlZL01NL0REIEhIOm1tOnNzJyl9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJ29yaWdpbicsIHRhZ05hbWUsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZURldkRlcHMoKSB7XG4gIGNvbnN0IGpzb24gPSBPYmplY3QuYXNzaWduKHt9LCBwa0pzb24pO1xuICBkZWxldGUganNvbi5kZXZEZXBlbmRlbmNpZXM7XG4gIGNvbnN0IG5ld0pzb24gPSBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnXFx0Jyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdjaGFuZ2UgcGFja2FnZS5qc29uIHRvOlxcbicsIG5ld0pzb24pO1xuICBmcy53cml0ZUZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCBuZXdKc29uKTtcbn1cblxuZnVuY3Rpb24gY2hhbmdlR2l0SWdub3JlKCkge1xuICBsZXQgZ2l0aWdub3JlID0gZnMucmVhZEZpbGVTeW5jKCcuZ2l0aWdub3JlJywgJ3V0ZjgnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9pbnN0YWxsXFwtKD86dGVzdHxzdGFnZXxkZXZ8cHJvZCkkL2dtLCAnJyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvY2hlY2tzdW1cXC4oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKVxcLmpzb24kL2dtLCAnJyk7XG4gIGZzLndyaXRlRmlsZVN5bmMoJy5naXRpZ25vcmUnLCBnaXRpZ25vcmUpO1xufVxuIl19
