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
let pkJson = require(path_1.default.resolve('package.json'));
function main(env, appName, buildStaticOnly, secret) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const rootDir = path_1.default.resolve(__dirname, '../..');
        // const [env, appName, buildStaticOnly] = process.argv.slice(2);
        if (env == null || appName == null || buildStaticOnly == null) {
            // tslint:disable-next-line: no-console
            console.log('missing argument for <dev|prod|local|dell> <bcl|byj> <true|false>');
            process.exit(1);
            return;
        }
        let releaseBranch = 'release-server';
        if (env === 'local') {
            releaseBranch = 'release-server-local';
        }
        // await spawn('node', 'node_modules/@dr-core/assets-processer/dist/zip.js', {cwd: rootDir}).promise;
        merge_artifacts_1.mergeBack();
        const zipSrc = path_1.default.resolve(__dirname, '../../dist/static');
        let zipFile;
        if (appName !== 'node-server') {
            // // send email
            // const cmdArgs = [
            //   '-c', Path.resolve(rootDir, 'conf', `remote-deploy-${env}.yaml`),
            //   '--env', env,
            //   // '--app-name', appName,
            //   '--src', zipSrc,
            //   '--build-static-only',
            //   buildStaticOnly
            // ];
            const installDir = path_1.default.resolve('install-' + env);
            if (!fs_extra_1.default.existsSync(installDir)) {
                fs_extra_1.default.mkdirpSync(installDir);
            }
            zipFile = yield remote_deploy_1.checkZipFile(zipSrc, installDir, appName);
        }
        if (appName === 'node-server' || buildStaticOnly !== 'true') {
            yield remote_deploy_1.digestInstallingFiles();
        }
        // const zipDir = Path.resolve('install-' + env);
        try {
            yield process_utils_1.spawn('git', 'branch', '-D', releaseBranch, { cwd: rootDir }).promise;
        }
        catch (e) {
            console.log(e.message);
        }
        const currBranch = yield merge_artifacts_1.getCurrBranchName();
        if (buildStaticOnly === 'true' && zipFile) {
            // Dynamically push to Node server
            try {
                yield _send_patch_1.send(env, appName, zipFile, secret);
            }
            catch (ex) {
                yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
                throw ex;
            }
        }
        yield pushReleaseBranch(releaseBranch, rootDir, env, appName);
        if (buildStaticOnly !== 'true') {
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
        const hookFiles = [path_1.default.resolve(__dirname, '../../.git/hooks/pre-push'), path_1.default.resolve(__dirname, '../../.git/hooks/pre-commit')];
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
    console.log('change package.json to:\n', newJson);
    fs_extra_1.default.writeFileSync('package.json', newJson);
}
function changeGitIgnore() {
    const commitHook = path_1.default.resolve('.git/hooks/pre-commit');
    if (fs_extra_1.default.existsSync(commitHook)) {
        fs_extra_1.default.unlinkSync(commitHook);
    }
    let gitignore = fs_extra_1.default.readFileSync('.gitignore', 'utf8');
    gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
    gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
    fs_extra_1.default.writeFileSync('.gitignore', gitignore);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBRXJDLElBQUksTUFBTSxHQUEwRCxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBRTFHLFNBQXNCLElBQUksQ0FBQyxHQUFXLEVBQUUsT0FBZSxFQUFFLGVBQXVCLEVBQUUsTUFBYzs7UUFDOUYsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFakQsaUVBQWlFO1FBQ2pFLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxPQUFPLElBQUksSUFBSSxJQUFJLGVBQWUsSUFBSSxJQUFJLEVBQUU7WUFDN0QsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQztZQUNqRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU87U0FDUjtRQUVELElBQUksYUFBYSxHQUFHLGdCQUFnQixDQUFDO1FBQ3JDLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtZQUNuQixhQUFhLEdBQUcsc0JBQXNCLENBQUM7U0FDeEM7UUFFRCxxR0FBcUc7UUFDckcsMkJBQVMsRUFBRSxDQUFDO1FBRVosTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM1RCxJQUFJLE9BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLGdCQUFnQjtZQUNoQixvQkFBb0I7WUFDcEIsc0VBQXNFO1lBQ3RFLGtCQUFrQjtZ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Q0FBQyxHQUFHLENBQUMsMkJBQTJCLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbEQsa0JBQUUsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFFRCxTQUFTLGVBQWU7SUFDdEIsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3pELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDN0Isa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDM0I7SUFFRCxJQUFJLFNBQVMsR0FBRyxrQkFBRSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdEQsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUUsU0FBUyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsK0NBQStDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDbkYsa0JBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQzVDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Biay9wcmVidWlsZC9kaXN0L3ByZWJ1aWxkLXBvc3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbm8tY29uc29sZVxuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgbW9tZW50IGZyb20gJ21vbWVudCc7XG5pbXBvcnQgeyBtZXJnZUJhY2ssIGdldEN1cnJCcmFuY2hOYW1lIH0gZnJvbSAnLi9tZXJnZS1hcnRpZmFjdHMnO1xuaW1wb3J0IHsgZGlnZXN0SW5zdGFsbGluZ0ZpbGVzLCBjaGVja1ppcEZpbGUgfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvcmVtb3RlLWRlcGxveSc7XG5pbXBvcnQgeyBzZW5kIH0gZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5cbmxldCBwa0pzb246IHtuYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZzsgZGV2RGVwZW5kZW5jaWVzOiBhbnl9ID0gcmVxdWlyZShQYXRoLnJlc29sdmUoJ3BhY2thZ2UuanNvbicpKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgYnVpbGRTdGF0aWNPbmx5OiBzdHJpbmcsIHNlY3JldDogc3RyaW5nKSB7XG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4nKTtcblxuICAvLyBjb25zdCBbZW52LCBhcHBOYW1lLCBidWlsZFN0YXRpY09ubHldID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBpZiAoZW52ID09IG51bGwgfHwgYXBwTmFtZSA9PSBudWxsIHx8IGJ1aWxkU3RhdGljT25seSA9PSBudWxsKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ21pc3NpbmcgYXJndW1lbnQgZm9yIDxkZXZ8cHJvZHxsb2NhbHxkZWxsPiA8YmNsfGJ5aj4gPHRydWV8ZmFsc2U+Jyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGxldCByZWxlYXNlQnJhbmNoID0gJ3JlbGVhc2Utc2VydmVyJztcbiAgaWYgKGVudiA9PT0gJ2xvY2FsJykge1xuICAgIHJlbGVhc2VCcmFuY2ggPSAncmVsZWFzZS1zZXJ2ZXItbG9jYWwnO1xuICB9XG5cbiAgLy8gYXdhaXQgc3Bhd24oJ25vZGUnLCAnbm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC96aXAuanMnLCB7Y3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgbWVyZ2VCYWNrKCk7XG5cbiAgY29uc3QgemlwU3JjID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL2Rpc3Qvc3RhdGljJyk7XG4gIGxldCB6aXBGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKGFwcE5hbWUgIT09ICdub2RlLXNlcnZlcicpIHtcbiAgICAvLyAvLyBzZW5kIGVtYWlsXG4gICAgLy8gY29uc3QgY21kQXJncyA9IFtcbiAgICAvLyAgICctYycsIFBhdGgucmVzb2x2ZShyb290RGlyLCAnY29uZicsIGByZW1vdGUtZGVwbG95LSR7ZW52fS55YW1sYCksXG4gICAgLy8gICAnLS1lbnYnLCBlbnYsXG4gICAgLy8gICAvLyAnLS1hcHAtbmFtZScsIGFwcE5hbWUsXG4gICAgLy8gICAnLS1zcmMnLCB6aXBTcmMsXG4gICAgLy8gICAnLS1idWlsZC1zdGF0aWMtb25seScsXG4gICAgLy8gICBidWlsZFN0YXRpY09ubHlcbiAgICAvLyBdO1xuICAgIGNvbnN0IGluc3RhbGxEaXIgPSBQYXRoLnJlc29sdmUoJ2luc3RhbGwtJyArIGVudik7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKSB7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgIH1cbiAgICB6aXBGaWxlID0gYXdhaXQgY2hlY2taaXBGaWxlKHppcFNyYywgaW5zdGFsbERpciwgYXBwTmFtZSk7XG4gIH1cblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJyB8fCBidWlsZFN0YXRpY09ubHkgIT09ICd0cnVlJykge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICB9XG5cbiAgLy8gY29uc3QgemlwRGlyID0gUGF0aC5yZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdicmFuY2gnLCAnLUQnLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5sb2coZS5tZXNzYWdlKTtcbiAgfVxuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChidWlsZFN0YXRpY09ubHkgPT09ICd0cnVlJyAmJiB6aXBGaWxlKSB7XG4gICAgLy8gRHluYW1pY2FsbHkgcHVzaCB0byBOb2RlIHNlcnZlclxuICAgIHRyeSB7XG4gICAgICBhd2FpdCBzZW5kKGVudiwgYXBwTmFtZSwgemlwRmlsZSwgc2VjcmV0KTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBwdXNoUmVsZWFzZUJyYW5jaChyZWxlYXNlQnJhbmNoLCByb290RGlyLCBlbnYsIGFwcE5hbWUpO1xuXG4gIGlmIChidWlsZFN0YXRpY09ubHkgIT09ICd0cnVlJykge1xuICAgIGF3YWl0IGFkZFRhZyhyb290RGlyKTtcbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVzaFJlbGVhc2VCcmFuY2gocmVsZWFzZUJyYW5jaDogc3RyaW5nLCByb290RGlyOiBzdHJpbmcsIGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcpIHtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIHJlbW92ZURldkRlcHMoKTtcbiAgY2hhbmdlR2l0SWdub3JlKCk7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnYWRkJywgJy4nLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBjb25zdCBob29rRmlsZXMgPSBbUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy5naXQvaG9va3MvcHJlLXB1c2gnKSwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy5naXQvaG9va3MvcHJlLWNvbW1pdCcpXTtcbiAgZm9yIChjb25zdCBnaXRIb29rcyBvZiBob29rRmlsZXMpIHtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRIb29rcykpIHtcbiAgICAgIGZzLnJlbW92ZVN5bmMoZ2l0SG9va3MpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NvbW1pdCcsICctbScsIGBQcmVidWlsZCBub2RlIHNlcnZlciAke2Vudn0gLSAke2FwcE5hbWV9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgJ29yaWdpbicsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGFkZFRhZyhyb290RGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgY3VycmVudCA9IG1vbWVudCgpO1xuICBjb25zdCB0YWdOYW1lID0gYHJlbGVhc2UvJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAndGFnJywgJy1hJywgdGFnTmFtZSwgJy1tJywgYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCAnb3JpZ2luJywgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlRGV2RGVwcygpIHtcbiAgY29uc3QganNvbiA9IE9iamVjdC5hc3NpZ24oe30sIHBrSnNvbik7XG4gIGRlbGV0ZSBqc29uLmRldkRlcGVuZGVuY2llcztcbiAgY29uc3QgbmV3SnNvbiA9IEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICdcXHQnKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ2NoYW5nZSBwYWNrYWdlLmpzb24gdG86XFxuJywgbmV3SnNvbik7XG4gIGZzLndyaXRlRmlsZVN5bmMoJ3BhY2thZ2UuanNvbicsIG5ld0pzb24pO1xufVxuXG5mdW5jdGlvbiBjaGFuZ2VHaXRJZ25vcmUoKSB7XG4gIGNvbnN0IGNvbW1pdEhvb2sgPSBQYXRoLnJlc29sdmUoJy5naXQvaG9va3MvcHJlLWNvbW1pdCcpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhjb21taXRIb29rKSkge1xuICAgIGZzLnVubGlua1N5bmMoY29tbWl0SG9vayk7XG4gIH1cblxuICBsZXQgZ2l0aWdub3JlID0gZnMucmVhZEZpbGVTeW5jKCcuZ2l0aWdub3JlJywgJ3V0ZjgnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9pbnN0YWxsXFwtKD86dGVzdHxzdGFnZXxkZXZ8cHJvZCkkL2dtLCAnJyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvY2hlY2tzdW1cXC4oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKVxcLmpzb24kL2dtLCAnJyk7XG4gIGZzLndyaXRlRmlsZVN5bmMoJy5naXRpZ25vcmUnLCBnaXRpZ25vcmUpO1xufVxuIl19
