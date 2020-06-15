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
            const generatedServerFileDir = path_1.default.resolve('dist/server');
            if (fs_extra_1.default.existsSync(path_1.default.resolve(generatedServerFileDir, appName))) {
                const serverZip = yield remote_deploy_1.checkZipFile(generatedServerFileDir, path_1.default.resolve('server-content-' + env), appName);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBQ3JDLDJEQUFxRTtBQUNyRSwwREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsYUFBYSxDQUFDLENBQUM7QUFFOUQsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFMUcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUFlLEVBQUUsZUFBZSxHQUFHLEtBQUssRUFBRSxVQUFVLEdBQUcsSUFBSSxFQUFFLE1BQWU7O1FBQ2xILE1BQU0sT0FBTyxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVoRCxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFL0IsTUFBTSxhQUFhLEdBQVcsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1FBRTVELDJCQUFTLEVBQUUsQ0FBQztRQUVaLE1BQU0sTUFBTSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQy9DLElBQUksT0FBMkIsQ0FBQztRQUVoQyxJQUFJLE9BQU8sS0FBSyxhQUFhLEVBQUU7WUFDN0IsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDbEQsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxFQUFF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b3N0LmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG5vLWNvbnNvbGVcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IG1vbWVudCBmcm9tICdtb21lbnQnO1xuaW1wb3J0IHsgbWVyZ2VCYWNrLCBnZXRDdXJyQnJhbmNoTmFtZSB9IGZyb20gJy4vbWVyZ2UtYXJ0aWZhY3RzJztcbmltcG9ydCB7IGRpZ2VzdEluc3RhbGxpbmdGaWxlcywgY2hlY2taaXBGaWxlIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3JlbW90ZS1kZXBsb3knO1xuaW1wb3J0IHsgc2VuZCB9IGZyb20gJy4vX3NlbmQtcGF0Y2gnO1xuaW1wb3J0IHtzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnN9IGZyb20gJ0Biay9wcmVidWlsZC9kaXN0L2FydGlmYWN0cyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5zZW5kLXBhdGNoJyk7XG5cbmxldCBwa0pzb246IHtuYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZzsgZGV2RGVwZW5kZW5jaWVzOiBhbnl9ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ3BhY2thZ2UuanNvbicpKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgYnVpbGRTdGF0aWNPbmx5ID0gZmFsc2UsIHB1c2hCcmFuY2ggPSB0cnVlLCBzZWNyZXQ/OiBzdHJpbmcpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSk7XG5cbiAgY29uc3Qgcm9vdERpciA9IFBhdGgucmVzb2x2ZSgpO1xuXG4gIGNvbnN0IHJlbGVhc2VCcmFuY2g6IHN0cmluZyA9IHNldHRpbmcucHJlYnVpbGRSZWxlYXNlQnJhbmNoO1xuXG4gIG1lcmdlQmFjaygpO1xuXG4gIGNvbnN0IHppcFNyYyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxldCB6aXBGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKGFwcE5hbWUgIT09ICdub2RlLXNlcnZlcicpIHtcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICB9XG4gICAgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZSh6aXBTcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUsIC8oW1xcXFwvXXN0YXRzW15dKlxcLmpzb258XFwubWFwKSQvKTtcblxuICAgIGNvbnN0IGdlbmVyYXRlZFNlcnZlckZpbGVEaXIgPSBQYXRoLnJlc29sdmUoJ2Rpc3Qvc2VydmVyJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdlbmVyYXRlZFNlcnZlckZpbGVEaXIsIGFwcE5hbWUpKSkge1xuICAgICAgY29uc3Qgc2VydmVyWmlwID0gYXdhaXQgY2hlY2taaXBGaWxlKGdlbmVyYXRlZFNlcnZlckZpbGVEaXIsIFBhdGgucmVzb2x2ZSgnc2VydmVyLWNvbnRlbnQtJyArIGVudiksIGFwcE5hbWUpO1xuICAgICAgbG9nLmluZm8oYFBhY2sgJHtnZW5lcmF0ZWRTZXJ2ZXJGaWxlRGlyfSB0byAke3NlcnZlclppcH1gKTtcbiAgICB9XG4gIH1cblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09IHRydWUpIHtcbiAgICBhd2FpdCBkaWdlc3RJbnN0YWxsaW5nRmlsZXMoKTtcbiAgICBsb2cuaW5mbyhhd2FpdCBzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gIH1cblxuICAvLyBjb25zdCB6aXBEaXIgPSBQYXRoLnJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG5cbiAgdHJ5IHtcbiAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2JyYW5jaCcsICctRCcsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5kZWJ1ZyhlLm1lc3NhZ2UpO1xuICB9XG5cbiAgY29uc3QgY3VyckJyYW5jaCA9IGF3YWl0IGdldEN1cnJCcmFuY2hOYW1lKCk7XG5cbiAgaWYgKGJ1aWxkU3RhdGljT25seSAmJiB6aXBGaWxlKSB7XG4gICAgLy8gRHluYW1pY2FsbHkgcHVzaCB0byBOb2RlIHNlcnZlclxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kKGVudiwgYXBwTmFtZSwgemlwRmlsZSwgc2VjcmV0KTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7fVxuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgaWYgKHB1c2hCcmFuY2gpXG4gICAgYXdhaXQgcHVzaFJlbGVhc2VCcmFuY2gocmVsZWFzZUJyYW5jaCwgcm9vdERpciwgZW52LCBhcHBOYW1lKTtcblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09IHRydWUpIHtcbiAgICBhd2FpdCBhZGRUYWcocm9vdERpcik7XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hSZWxlYXNlQnJhbmNoKHJlbGVhc2VCcmFuY2g6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbGVhc2VSZW1vdGUgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpLnByZWJ1aWxkR2l0UmVtb3RlO1xuXG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCAnLWInLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICByZW1vdmVEZXZEZXBzKCk7XG4gIGNoYW5nZUdpdElnbm9yZSgpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2FkZCcsICcuJywgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgY29uc3QgaG9va0ZpbGVzID0gW1BhdGgucmVzb2x2ZSgnLmdpdC9ob29rcy9wcmUtcHVzaCcpLCBQYXRoLnJlc29sdmUoJy5naXQvaG9va3MvcHJlLWNvbW1pdCcpXTtcbiAgZm9yIChjb25zdCBnaXRIb29rcyBvZiBob29rRmlsZXMpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRIb29rcykpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmMoZ2l0SG9va3MpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NvbW1pdCcsICctbScsIGBQcmVidWlsZCBub2RlIHNlcnZlciAke2Vudn0gLSAke2FwcE5hbWV9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgcmVsZWFzZVJlbW90ZSwgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gYWRkVGFnKHJvb3REaXI6IHN0cmluZykge1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKS5wcmVidWlsZEdpdFJlbW90ZTtcbiAgY29uc3QgY3VycmVudCA9IG1vbWVudCgpO1xuICBjb25zdCB0YWdOYW1lID0gYHJlbGVhc2UvJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAndGFnJywgJy1hJywgdGFnTmFtZSwgJy1tJywgYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCByZWxlYXNlUmVtb3RlLCB0YWdOYW1lLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5mdW5jdGlvbiByZW1vdmVEZXZEZXBzKCkge1xuICBjb25zdCBqc29uID0gT2JqZWN0LmFzc2lnbih7fSwgcGtKc29uKTtcbiAgZGVsZXRlIGpzb24uZGV2RGVwZW5kZW5jaWVzO1xuICBjb25zdCBuZXdKc29uID0gSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJ1xcdCcpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tY29uc29sZVxuICBsb2cuaW5mbygnY2hhbmdlIHBhY2thZ2UuanNvbiB0bzpcXG4nLCBuZXdKc29uKTtcbiAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgbmV3SnNvbik7XG59XG5cbmZ1bmN0aW9uIGNoYW5nZUdpdElnbm9yZSgpIHtcbiAgbGV0IGdpdGlnbm9yZSA9IGZzLnJlYWRGaWxlU3luYygnLmdpdGlnbm9yZScsICd1dGY4Jyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvaW5zdGFsbFxcLSg/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpJC9nbSwgJycpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2NoZWNrc3VtXFwuKD86dGVzdHxzdGFnZXxkZXZ8cHJvZClcXC5qc29uJC9nbSwgJycpO1xuICBmcy53cml0ZUZpbGVTeW5jKCcuZ2l0aWdub3JlJywgZ2l0aWdub3JlKTtcbn1cbiJdfQ==
