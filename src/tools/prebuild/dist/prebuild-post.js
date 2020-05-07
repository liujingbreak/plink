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
function main(env, appName, buildStaticOnly = false, pushBranch = true, secret) {
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
            zipFile = yield remote_deploy_1.checkZipFile(zipSrc, installDir, appName, /([\\/]stats[^]*\.json|\.map)$/);
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
        if (pushBranch)
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBQ3JDLDJEQUFxRTtBQUNyRSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFMUcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsZUFBZSxHQUFHLEtBQUssRUFBRSxVQUFVLEdBQUcsSUFBSSxFQUFFLE1BQWU7O1FBQ2xILE1BQU0sT0FBTyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVoRCxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFL0IsTUFBTSxhQUFhLEdBQVcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1FBRTVELDJCQUFTLEVBQUUsQ0FBQztRQUVaLE1BQU0sTUFBTSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLElBQUksT0FBMkIsQ0FBQztRQUVoQyxJQUFJLE9BQU8sS0FBSyxhQUFhLEVBQUU7WUFDN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFF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RUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QyxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDNUIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pELHNDQUFzQztJQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9DLGtCQUFFLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUyxlQUFlO0lBQ3RCLElBQUksU0FBUyxHQUFHLGtCQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0RCxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRixrQkFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDNUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvcHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCB7IG1lcmdlQmFjaywgZ2V0Q3VyckJyYW5jaE5hbWUgfSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5pbXBvcnQgeyBkaWdlc3RJbnN0YWxsaW5nRmlsZXMsIGNoZWNrWmlwRmlsZSB9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95JztcbmltcG9ydCB7IHNlbmQgfSBmcm9tICcuL19zZW5kLXBhdGNoJztcbmltcG9ydCB7c3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zfSBmcm9tICdAYmsvcHJlYnVpbGQvZGlzdC9hcnRpZmFjdHMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuc2VuZC1wYXRjaCcpO1xuXG5sZXQgcGtKc29uOiB7bmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IGRldkRlcGVuZGVuY2llczogYW55fSA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdwYWNrYWdlLmpzb24nKSk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGJ1aWxkU3RhdGljT25seSA9IGZhbHNlLCBwdXNoQnJhbmNoID0gdHJ1ZSwgc2VjcmV0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHNldHRpbmcgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlc29sdmUoKTtcblxuICBjb25zdCByZWxlYXNlQnJhbmNoOiBzdHJpbmcgPSBzZXR0aW5nLnByZWJ1aWxkUmVsZWFzZUJyYW5jaDtcblxuICBtZXJnZUJhY2soKTtcblxuICBjb25zdCB6aXBTcmMgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuICBsZXQgemlwRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGlmIChhcHBOYW1lICE9PSAnbm9kZS1zZXJ2ZXInKSB7XG4gICAgY29uc3QgaW5zdGFsbERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gICAgfVxuICAgIHppcEZpbGUgPSBhd2FpdCBjaGVja1ppcEZpbGUoemlwU3JjLCBpbnN0YWxsRGlyLCBhcHBOYW1lLCAvKFtcXFxcL11zdGF0c1teXSpcXC5qc29ufFxcLm1hcCkkLyk7XG4gIH1cblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09IHRydWUpIHtcbiAgICBhd2FpdCBkaWdlc3RJbnN0YWxsaW5nRmlsZXMoKTtcbiAgICBsb2cuaW5mbyhhd2FpdCBzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gIH1cblxuICAvLyBjb25zdCB6aXBEaXIgPSBQYXRoLnJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2JyYW5jaCcsICctRCcsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5kZWJ1ZyhlLm1lc3NhZ2UpO1xuICB9XG5cbiAgY29uc3QgY3VyckJyYW5jaCA9IGF3YWl0IGdldEN1cnJCcmFuY2hOYW1lKCk7XG5cbiAgaWYgKGJ1aWxkU3RhdGljT25seSAmJiB6aXBGaWxlKSB7XG4gICAgLy8gRHluYW1pY2FsbHkgcHVzaCB0byBOb2RlIHNlcnZlclxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kKGVudiwgYXBwTmFtZSwgemlwRmlsZSwgc2VjcmV0KTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7fVxuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgaWYgKHB1c2hCcmFuY2gpXG4gICAgYXdhaXQgcHVzaFJlbGVhc2VCcmFuY2gocmVsZWFzZUJyYW5jaCwgcm9vdERpciwgZW52LCBhcHBOYW1lKTtcblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09IHRydWUpIHtcbiAgICBhd2FpdCBhZGRUYWcocm9vdERpcik7XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hSZWxlYXNlQnJhbmNoKHJlbGVhc2VCcmFuY2g6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpLnByZWJ1aWxkR2l0UmVtb3RlO1xuXG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCAnLWInLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICByZW1vdmVEZXZEZXBzKCk7XG4gIGNoYW5nZUdpdElnbm9yZSgpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2FkZCcsICcuJywgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgY29uc3QgaG9va0ZpbGVzID0gW1BhdGgucmVzb2x2ZSgnLmdpdC9ob29rcy9wcmUtcHVzaCcpLCBQYXRoLnJlc29sdmUoJy5naXQvaG9va3MvcHJlLWNvbW1pdCcpXTtcbiAgZm9yIChjb25zdCBnaXRIb29rcyBvZiBob29rRmlsZXMpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRIb29rcykpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmMoZ2l0SG9va3MpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NvbW1pdCcsICctbScsIGBQcmVidWlsZCBub2RlIHNlcnZlciAke2Vudn0gLSAke2FwcE5hbWV9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgcmVsZWFzZVJlbW90ZSwgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkVGFnKHJvb3REaXI6IHN0cmluZykge1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKS5wcmVidWlsZEdpdFJlbW90ZTtcbiAgY29uc3QgY3VycmVudCA9IG1vbWVudCgpO1xuICBjb25zdCB0YWdOYW1lID0gYHJlbGVhc2UvJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAndGFnJywgJy1hJywgdGFnTmFtZSwgJy1tJywgYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCByZWxlYXNlUmVtb3RlLCB0YWdOYW1lLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5mdW5jdGlvbiByZW1vdmVEZXZEZXBzKCkge1xuICBjb25zdCBqc29uID0gT2JqZWN0LmFzc2lnbih7fSwgcGtKc29uKTtcbiAgZGVsZXRlIGpzb24uZGV2RGVwZW5kZW5jaWVzO1xuICBjb25zdCBuZXdKc29uID0gSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJ1xcdCcpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICBsb2cuaW5mbygnY2hhbmdlIHBhY2thZ2UuanNvbiB0bzpcXG4nLCBuZXdKc29uKTtcbiAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgbmV3SnNvbik7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUdpdElnbm9yZSgpIHtcbiAgbGV0IGdpdGlnbm9yZSA9IGZzLnJlYWRGaWxlU3luYygnLmdpdGlnbm9yZScsICd1dGY4Jyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvaW5zdGFsbFxcLSg/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpJC9nbSwgJycpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2NoZWNrc3VtXFwuKD86dGVzdHxzdGFnZXxkZXZ8cHJvZClcXC5qc29uJC9nbSwgJycpO1xuICBmcy53cml0ZUZpbGVTeW5jKCcuZ2l0aWdub3JlJywgZ2l0aWdub3JlKTtcbn1cbiJdfQ==
