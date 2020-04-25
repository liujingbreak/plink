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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBQ3JDLDJEQUFxRTtBQUNyRSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFMUcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsZUFBZSxHQUFHLEtBQUssRUFBRSxNQUFlOztRQUMvRixNQUFNLE9BQU8sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFaEQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRS9CLE1BQU0sYUFBYSxHQUFXLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQztRQUU1RCwyQkFBUyxFQUFFLENBQUM7UUFFWixNQUFNLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxJQUFJLE9BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDOUIsa0JBQUUsQ0FBQyxV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TSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pELHNDQUFzQztJQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLGtCQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUyxlQUFlO0lBQ3RCLElBQUksU0FBUyxHQUFHLGtCQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0RCxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRixrQkFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDNUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvcHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCB7IG1lcmdlQmFjaywgZ2V0Q3VyckJyYW5jaE5hbWUgfSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5pbXBvcnQgeyBkaWdlc3RJbnN0YWxsaW5nRmlsZXMsIGNoZWNrWmlwRmlsZSB9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95JztcbmltcG9ydCB7IHNlbmQgfSBmcm9tICcuL19zZW5kLXBhdGNoJztcbmltcG9ydCB7c3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zfSBmcm9tICdAYmsvcHJlYnVpbGQvZGlzdC9hcnRpZmFjdHMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2VuZC1wYXRjaCcpO1xuXG5sZXQgcGtKc29uOiB7bmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IGRldkRlcGVuZGVuY2llczogYW55fSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdwYWNrYWdlLmpzb24nKSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGJ1aWxkU3RhdGljT25seSA9IGZhbHNlLCBzZWNyZXQ/OiBzdHJpbmcpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cbiAgY29uc3Qgcm9vdERpciA9IFBhdGgucmVzb2x2ZSgpO1xuXG4gIGNvbnN0IHJlbGVhc2VCcmFuY2g6IHN0cmluZyA9IHNldHRpbmcucHJlYnVpbGRSZWxlYXNlQnJhbmNoO1xuXG4gIG1lcmdlQmFjaygpO1xuXG4gIGNvbnN0IHppcFNyYyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxldCB6aXBGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKGFwcE5hbWUgIT09ICdub2RlLXNlcnZlcicpIHtcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICB9XG4gICAgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZSh6aXBTcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUsIC9ec3RhdHNbXl0qXFwuanNvbiQvKTtcbiAgfVxuXG4gIGlmIChhcHBOYW1lID09PSAnbm9kZS1zZXJ2ZXInIHx8IGJ1aWxkU3RhdGljT25seSAhPT0gdHJ1ZSkge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICAgIGxvZy5pbmZvKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbG9nLmRlYnVnKGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCBjdXJyQnJhbmNoID0gYXdhaXQgZ2V0Q3VyckJyYW5jaE5hbWUoKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ICYmIHppcEZpbGUpIHtcbiAgICAvLyBEeW5hbWljYWxseSBwdXNoIHRvIE5vZGUgc2VydmVyXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmQoZW52LCBhcHBOYW1lLCB6aXBGaWxlLCBzZWNyZXQpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICAgICAgfSBjYXRjaCAoZXgpIHt9XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoLCByb290RGlyLCBlbnYsIGFwcE5hbWUpO1xuXG4gIGlmICghYnVpbGRTdGF0aWNPbmx5KSB7XG4gICAgYXdhaXQgYWRkVGFnKHJvb3REaXIpO1xuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZykge1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKS5wcmVidWlsZEdpdFJlbW90ZTtcblxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgJy1iJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgcmVtb3ZlRGV2RGVwcygpO1xuICBjaGFuZ2VHaXRJZ25vcmUoKTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdhZGQnLCAnLicsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIGNvbnN0IGhvb2tGaWxlcyA9IFtQYXRoLnJlc29sdmUoJy5naXQvaG9va3MvcHJlLXB1c2gnKSwgUGF0aC5yZXNvbHZlKCcuZ2l0L2hvb2tzL3ByZS1jb21taXQnKV07XG4gIGZvciAoY29uc3QgZ2l0SG9va3Mgb2YgaG9va0ZpbGVzKSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0SG9va3MpKSB7XG4gICAgICBmcy5yZW1vdmVTeW5jKGdpdEhvb2tzKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjb21taXQnLCAnLW0nLCBgUHJlYnVpbGQgbm9kZSBzZXJ2ZXIgJHtlbnZ9IC0gJHthcHBOYW1lfWAsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsICctZicsIHJlbGVhc2VSZW1vdGUsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZFRhZyhyb290RGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsZWFzZVJlbW90ZSA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkucHJlYnVpbGRHaXRSZW1vdGU7XG4gIGNvbnN0IGN1cnJlbnQgPSBtb21lbnQoKTtcbiAgY29uc3QgdGFnTmFtZSA9IGByZWxlYXNlLyR7cGtKc29uLnZlcnNpb259LSR7Y3VycmVudC5mb3JtYXQoJ0hIbW1zcycpfS0ke2N1cnJlbnQuZm9ybWF0KCdZWU1NREQnKX1gO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3RhZycsICctYScsIHRhZ05hbWUsICctbScsIGBQcmVidWlsZCBvbiAke2N1cnJlbnQuZm9ybWF0KCdZWVlZL01NL0REIEhIOm1tOnNzJyl9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgcmVsZWFzZVJlbW90ZSwgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRGV2RGVwcygpIHtcbiAgY29uc3QganNvbiA9IE9iamVjdC5hc3NpZ24oe30sIHBrSnNvbik7XG4gIGRlbGV0ZSBqc29uLmRldkRlcGVuZGVuY2llcztcbiAgY29uc3QgbmV3SnNvbiA9IEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICdcXHQnKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ2NoYW5nZSBwYWNrYWdlLmpzb24gdG86XFxuJywgbmV3SnNvbik7XG4gIGZzLndyaXRlRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsIG5ld0pzb24pO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VHaXRJZ25vcmUoKSB7XG4gIGxldCBnaXRpZ25vcmUgPSBmcy5yZWFkRmlsZVN5bmMoJy5naXRpZ25vcmUnLCAndXRmOCcpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2luc3RhbGxcXC0oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKSQvZ20sICcnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9jaGVja3N1bVxcLig/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpXFwuanNvbiQvZ20sICcnKTtcbiAgZnMud3JpdGVGaWxlU3luYygnLmdpdGlnbm9yZScsIGdpdGlnbm9yZSk7XG59XG4iXX0=
