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
        else {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AYmsvcHJlYnVpbGQvdHMvcHJlYnVpbGQtcG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsMEVBQStEO0FBQy9ELHdEQUF3QjtBQUN4QixnRUFBMEI7QUFDMUIsNERBQTRCO0FBQzVCLHVEQUFpRTtBQUNqRSxnRkFBbUc7QUFDbkcsK0NBQXFDO0FBRXJDLElBQUksTUFBTSxHQUEwRCxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBRTFHLFNBQXNCLElBQUksQ0FBQyxHQUFXLEVBQUUsT0FBZSxFQUFFLGVBQXVCLEVBQUUsTUFBYzs7UUFDOUYsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFakQsaUVBQWlFO1FBQ2pFLElBQUksR0FBRyxJQUFJLElBQUksSUFBSSxPQUFPLElBQUksSUFBSSxJQUFJLGVBQWUsSUFBSSxJQUFJLEVBQUU7WUFDN0QsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUVBQW1FLENBQUMsQ0FBQztZQUNqRixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE9BQU87U0FDUjtRQUVELElBQUksYUFBYSxHQUFHLGdCQUFnQixDQUFDO1FBQ3JDLElBQUksR0FBRyxLQUFLLE9BQU8sRUFBRTtZQUNuQixhQUFhLEdBQUcsc0JBQXNCLENBQUM7U0FDeEM7UUFFRCxxR0FBcUc7UUFDckcsMkJBQVMsRUFBRSxDQUFDO1FBRVosTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM1RCxJQUFJLE9BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLGdCQUFnQjtZQUNoQixvQkFBb0I7WUFDcEIsc0VBQXNFO1lBQ3RFLGtCQUFrQjtZ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RCxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsZUFBZTtJQUN0QixNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDekQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUM3QixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztLQUMzQjtJQUVELElBQUksU0FBUyxHQUFHLGtCQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0RCxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQyx3Q0FBd0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RSxTQUFTLEdBQUcsU0FBUyxDQUFDLE9BQU8sQ0FBQywrQ0FBK0MsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNuRixrQkFBRSxDQUFDLGFBQWEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDNUMsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGJrL3ByZWJ1aWxkL2Rpc3QvcHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBuby1jb25zb2xlXG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBtb21lbnQgZnJvbSAnbW9tZW50JztcbmltcG9ydCB7IG1lcmdlQmFjaywgZ2V0Q3VyckJyYW5jaE5hbWUgfSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5pbXBvcnQgeyBkaWdlc3RJbnN0YWxsaW5nRmlsZXMsIGNoZWNrWmlwRmlsZSB9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9yZW1vdGUtZGVwbG95JztcbmltcG9ydCB7IHNlbmQgfSBmcm9tICcuL19zZW5kLXBhdGNoJztcblxubGV0IHBrSnNvbjoge25hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBkZXZEZXBlbmRlbmNpZXM6IGFueX0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nLCBidWlsZFN0YXRpY09ubHk6IHN0cmluZywgc2VjcmV0OiBzdHJpbmcpIHtcbiAgY29uc3Qgcm9vdERpciA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLicpO1xuXG4gIC8vIGNvbnN0IFtlbnYsIGFwcE5hbWUsIGJ1aWxkU3RhdGljT25seV0gPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIGlmIChlbnYgPT0gbnVsbCB8fCBhcHBOYW1lID09IG51bGwgfHwgYnVpbGRTdGF0aWNPbmx5ID09IG51bGwpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnbWlzc2luZyBhcmd1bWVudCBmb3IgPGRldnxwcm9kfGxvY2FsfGRlbGw+IDxiY2x8YnlqPiA8dHJ1ZXxmYWxzZT4nKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgbGV0IHJlbGVhc2VCcmFuY2ggPSAncmVsZWFzZS1zZXJ2ZXInO1xuICBpZiAoZW52ID09PSAnbG9jYWwnKSB7XG4gICAgcmVsZWFzZUJyYW5jaCA9ICdyZWxlYXNlLXNlcnZlci1sb2NhbCc7XG4gIH1cblxuICAvLyBhd2FpdCBzcGF3bignbm9kZScsICdub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3ppcC5qcycsIHtjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuICBtZXJnZUJhY2soKTtcblxuICBjb25zdCB6aXBTcmMgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vZGlzdC9zdGF0aWMnKTtcbiAgbGV0IHppcEZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBpZiAoYXBwTmFtZSAhPT0gJ25vZGUtc2VydmVyJykge1xuICAgIC8vIC8vIHNlbmQgZW1haWxcbiAgICAvLyBjb25zdCBjbWRBcmdzID0gW1xuICAgIC8vICAgJy1jJywgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdjb25mJywgYHJlbW90ZS1kZXBsb3ktJHtlbnZ9LnlhbWxgKSxcbiAgICAvLyAgICctLWVudicsIGVudixcbiAgICAvLyAgIC8vICctLWFwcC1uYW1lJywgYXBwTmFtZSxcbiAgICAvLyAgICctLXNyYycsIHppcFNyYyxcbiAgICAvLyAgICctLWJ1aWxkLXN0YXRpYy1vbmx5JyxcbiAgICAvLyAgIGJ1aWxkU3RhdGljT25seVxuICAgIC8vIF07XG4gICAgY29uc3QgaW5zdGFsbERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoaW5zdGFsbERpcikpIHtcbiAgICAgIGZzLm1rZGlycFN5bmMoaW5zdGFsbERpcik7XG4gICAgfVxuICAgIHppcEZpbGUgPSBhd2FpdCBjaGVja1ppcEZpbGUoemlwU3JjLCBpbnN0YWxsRGlyLCBhcHBOYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBhd2FpdCBkaWdlc3RJbnN0YWxsaW5nRmlsZXMoKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUubG9nKGUubWVzc2FnZSk7XG4gIH1cblxuICBjb25zdCBjdXJyQnJhbmNoID0gYXdhaXQgZ2V0Q3VyckJyYW5jaE5hbWUoKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ID09PSAndHJ1ZScgJiYgemlwRmlsZSkge1xuICAgIC8vIER5bmFtaWNhbGx5IHB1c2ggdG8gTm9kZSBzZXJ2ZXJcbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZChlbnYsIGFwcE5hbWUsIHppcEZpbGUsIHNlY3JldCk7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCBjdXJyQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgcHVzaFJlbGVhc2VCcmFuY2gocmVsZWFzZUJyYW5jaCwgcm9vdERpciwgZW52LCBhcHBOYW1lKTtcblxuICBpZiAoYnVpbGRTdGF0aWNPbmx5ICE9PSAndHJ1ZScpIHtcbiAgICBhd2FpdCBhZGRUYWcocm9vdERpcik7XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hSZWxlYXNlQnJhbmNoKHJlbGVhc2VCcmFuY2g6IHN0cmluZywgcm9vdERpcjogc3RyaW5nLCBlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nKSB7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY2hlY2tvdXQnLCAnLWInLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xuICByZW1vdmVEZXZEZXBzKCk7XG4gIGNoYW5nZUdpdElnbm9yZSgpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2FkZCcsICcuJywgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgY29uc3QgaG9va0ZpbGVzID0gW1BhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi8uZ2l0L2hvb2tzL3ByZS1wdXNoJyksIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi8uZ2l0L2hvb2tzL3ByZS1jb21taXQnKV07XG4gIGZvciAoY29uc3QgZ2l0SG9va3Mgb2YgaG9va0ZpbGVzKSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0SG9va3MpKSB7XG4gICAgICBmcy5yZW1vdmVTeW5jKGdpdEhvb2tzKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjb21taXQnLCAnLW0nLCBgUHJlYnVpbGQgbm9kZSBzZXJ2ZXIgJHtlbnZ9IC0gJHthcHBOYW1lfWAsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsICctZicsICdvcmlnaW4nLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpciB9KS5wcm9taXNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBhZGRUYWcocm9vdERpcjogc3RyaW5nKSB7XG4gIGNvbnN0IGN1cnJlbnQgPSBtb21lbnQoKTtcbiAgY29uc3QgdGFnTmFtZSA9IGByZWxlYXNlLyR7cGtKc29uLnZlcnNpb259LSR7Y3VycmVudC5mb3JtYXQoJ0hIbW1zcycpfS0ke2N1cnJlbnQuZm9ybWF0KCdZWU1NREQnKX1gO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3RhZycsICctYScsIHRhZ05hbWUsICctbScsIGBQcmVidWlsZCBvbiAke2N1cnJlbnQuZm9ybWF0KCdZWVlZL01NL0REIEhIOm1tOnNzJyl9YCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJ29yaWdpbicsIHRhZ05hbWUsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZURldkRlcHMoKSB7XG4gIGNvbnN0IGpzb24gPSBPYmplY3QuYXNzaWduKHt9LCBwa0pzb24pO1xuICBkZWxldGUganNvbi5kZXZEZXBlbmRlbmNpZXM7XG4gIGNvbnN0IG5ld0pzb24gPSBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnXFx0Jyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdjaGFuZ2UgcGFja2FnZS5qc29uIHRvOlxcbicsIG5ld0pzb24pO1xuICBmcy53cml0ZUZpbGVTeW5jKCdwYWNrYWdlLmpzb24nLCBuZXdKc29uKTtcbn1cblxuZnVuY3Rpb24gY2hhbmdlR2l0SWdub3JlKCkge1xuICBjb25zdCBjb21taXRIb29rID0gUGF0aC5yZXNvbHZlKCcuZ2l0L2hvb2tzL3ByZS1jb21taXQnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoY29tbWl0SG9vaykpIHtcbiAgICBmcy51bmxpbmtTeW5jKGNvbW1pdEhvb2spO1xuICB9XG5cbiAgbGV0IGdpdGlnbm9yZSA9IGZzLnJlYWRGaWxlU3luYygnLmdpdGlnbm9yZScsICd1dGY4Jyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvaW5zdGFsbFxcLSg/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpJC9nbSwgJycpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2NoZWNrc3VtXFwuKD86dGVzdHxzdGFnZXxkZXZ8cHJvZClcXC5qc29uJC9nbSwgJycpO1xuICBmcy53cml0ZUZpbGVTeW5jKCcuZ2l0aWdub3JlJywgZ2l0aWdub3JlKTtcbn1cbiJdfQ==
