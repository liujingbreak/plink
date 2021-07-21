"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
/* eslint-disable no-console */
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
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const glob_1 = __importDefault(require("glob"));
const plink_1 = require("@wfh/plink");
const log = plink_1.log4File(__filename);
let pkJson = require(path_1.default.resolve('package.json'));
const setting = prebuild_setting_1.getSetting();
const releaseRemote = setting.tagPushRemote;
const current = dayjs_1.default();
const remoteBranchName = `${pkJson.version}-${current.format('HHmmss')}-${current.format('YYMMDD')}`;
function main(env, appName, buildStaticOnly = false, pushBranch = true, isForce = false, secret, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const setting = prebuild_setting_1.getSetting();
        const { rootDir } = plink_1.plinkEnv;
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
        yield pushDeployBranch(deployBranch, rootDir, env, appName, pushBranch, commitComment);
        log.info('------- create tag and new release branch -------');
        // await pushTagAndReleaseBranch(rootDir, pushBranch, commitComment);
        yield process_utils_1.spawn('git', 'checkout', currBranch, { cwd: rootDir }).promise;
    });
}
exports.main = main;
function pushDeployBranch(releaseBranch, rootDir, env, appName, pushBranch, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployRemote = __plink_1.default.config()['@wfh/prebuild'].prebuildDeployRemote;
        yield process_utils_1.spawn('git', 'checkout', '-b', releaseBranch, { cwd: rootDir, silent: true }).promise;
        // removeDevDeps();
        changeGitIgnore();
        log.info('commitComment', commitComment);
        yield splitCommit4bigFiles(env, appName, pushBranch, commitComment);
        yield process_utils_1.spawn('git', 'add', '.', { cwd: rootDir, silent: true }).promise;
        const hookFiles = [path_1.default.resolve(rootDir, '.git/hooks/pre-push'),
            path_1.default.resolve(rootDir, '.git/hooks/pre-commit')];
        for (const gitHooks of hookFiles) {
            if (fs_extra_1.default.existsSync(gitHooks)) {
                fs_extra_1.default.removeSync(gitHooks);
            }
        }
        yield process_utils_1.spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}`, { cwd: rootDir, silent: true }).promise;
        yield process_utils_1.spawn('git', 'push', '-f', deployRemote, releaseBranch, { cwd: rootDir }).promise;
        yield pushTagAndReleaseBranch(pushBranch, commitComment);
    });
}
function pushTagAndReleaseBranch(pushBranch, commitComment) {
    return __awaiter(this, void 0, void 0, function* () {
        // await spawn('git', 'tag', '-a', 'v' + remoteBranchName, '-m',
        //   commitComment ? commitComment : `Prebuild on ${current.format('YYYY/MM/DD HH:mm:ss')}`,
        //   { cwd: rootDir}).promise;
        // await spawn('git', 'push', setting.prebuildDeployRemote, 'v' + remoteBranchName, { cwd: rootDir}).promise;
        if (pushBranch && releaseRemote && releaseRemote !== setting.prebuildDeployRemote) {
            yield process_utils_1.spawn('git', 'push', releaseRemote, 'HEAD:release/' + remoteBranchName, { cwd: plink_1.plinkEnv.rootDir }).promise;
            // await spawn('git', 'push', releaseRemote, 'v' + remoteBranchName, { cwd: rootDir }).promise;
        }
        else {
            log.info('Skip pushing ' + pushBranch);
        }
    });
}
function changeGitIgnore() {
    const gitignoreFile = __plink_1.default.config.resolve('rootPath', '.gitignore');
    let gitignore = fs_extra_1.default.readFileSync(gitignoreFile, 'utf8');
    gitignore = gitignore.replace(/^\/install\-(?:test|stage|dev|prod)$/gm, '');
    gitignore = gitignore.replace(/^\/checksum\.(?:test|stage|dev|prod)\.json$/gm, '');
    fs_extra_1.default.writeFileSync(gitignoreFile, gitignore);
}
/**
 * Some git vendor has commit size limitation, let's try split to multiple commits for those non-source files
 */
function splitCommit4bigFiles(env, appName, pushBranch, commitComment) {
    const envs = Object.keys(prebuild_setting_1.getSetting().byEnv);
    const res$ = rx.of('install-', 'server-content-').pipe(op.mergeMap(artifactDirPrefix => {
        return envs.map(envName => path_1.default.resolve(plink_1.plinkEnv.rootDir, artifactDirPrefix + envName));
    }), op.mergeMap(dir => {
        if (fs_extra_1.default.existsSync(dir)) {
            return new rx.Observable(sub => {
                glob_1.default(dir.replace(/\\/g, '/') + '/**/*', (err, matches) => {
                    for (const file of matches) {
                        sub.next(path_1.default.relative(plink_1.plinkEnv.rootDir, file).replace(/\\/g, '/'));
                    }
                    sub.complete();
                });
            });
        }
        return rx.EMPTY;
    }), op.concatMap((file) => __awaiter(this, void 0, void 0, function* () {
        yield process_utils_1.spawn('git', 'add', file, { cwd: plink_1.plinkEnv.rootDir, silent: false }).promise;
        yield process_utils_1.spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}:\n${file}`, { cwd: plink_1.plinkEnv.rootDir, silent: false })
            .promise;
        yield new Promise(resolve => setImmediate(resolve));
        yield pushTagAndReleaseBranch(pushBranch, commitComment);
    })), op.catchError(err => {
        log.error(err);
        throw err;
    }), op.count(), op.tap(count => log.info(`${count} files are split into ${count} commits.`)));
    return res$.toPromise();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXBvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQixxRUFBMEQ7QUFDMUQsZ0RBQXdCO0FBQ3hCLHdEQUEwQjtBQUMxQixrREFBMEI7QUFDMUIsdURBQWlFO0FBQ2pFLDRFQUErRjtBQUMvRiwrQ0FBcUM7QUFDckMsMkNBQXFEO0FBQ3JELHNEQUEwQjtBQUMxQiwrREFBb0Q7QUFDcEQseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxnREFBd0I7QUFDeEIsc0NBQThDO0FBRTlDLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDMUcsTUFBTSxPQUFPLEdBQUcsNkJBQVUsRUFBRSxDQUFDO0FBQzdCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQUM7QUFDNUMsTUFBTSxPQUFPLEdBQUcsZUFBSyxFQUFFLENBQUM7QUFDeEIsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7QUFFckcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUErQixFQUFFLGVBQWUsR0FBRyxLQUFLLEVBQzlGLFVBQVUsR0FBRyxJQUFJLEVBQUUsT0FBTyxHQUFHLEtBQUssRUFBRSxNQUFlLEVBQUUsYUFBc0I7O1FBRTNFLE1BQU0sT0FBTyxHQUFHLDZCQUFVLEVBQUUsQ0FBQztRQUM3QixNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsZ0JBQVEsQ0FBQztRQUMzQixN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QyxDQUFDO1FBQ3BELE1BQU0sdUJBQXVCLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQSxDQUFDLEVBQ0YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2YsTUFBTSxHQUFHLENBQUM7SUFDWixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsS0FBSyxFQUFFLEVBQ1YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLHlCQUF5QixLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQzdFLENBQUM7SUFFRixPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGRheWpzIGZyb20gJ2RheWpzJztcbmltcG9ydCB7IG1lcmdlQmFjaywgZ2V0Q3VyckJyYW5jaE5hbWUgfSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5pbXBvcnQgeyBkaWdlc3RJbnN0YWxsaW5nRmlsZXMsIGNoZWNrWmlwRmlsZSB9IGZyb20gJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3JlbW90ZS1kZXBsb3knO1xuaW1wb3J0IHsgc2VuZCB9IGZyb20gJy4vX3NlbmQtcGF0Y2gnO1xuaW1wb3J0IHtzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnN9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vcHJlYnVpbGQtc2V0dGluZyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHtsb2c0RmlsZSwgcGxpbmtFbnZ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxubGV0IHBrSnNvbjoge25hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBkZXZEZXBlbmRlbmNpZXM6IGFueX0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpO1xuY29uc3Qgc2V0dGluZyA9IGdldFNldHRpbmcoKTtcbmNvbnN0IHJlbGVhc2VSZW1vdGUgPSBzZXR0aW5nLnRhZ1B1c2hSZW1vdGU7XG5jb25zdCBjdXJyZW50ID0gZGF5anMoKTtcbmNvbnN0IHJlbW90ZUJyYW5jaE5hbWUgPSBgJHtwa0pzb24udmVyc2lvbn0tJHtjdXJyZW50LmZvcm1hdCgnSEhtbXNzJyl9LSR7Y3VycmVudC5mb3JtYXQoJ1lZTU1ERCcpfWA7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGVudjogc3RyaW5nLCBhcHBOYW1lOiAnbm9kZS1zZXJ2ZXInIHwgc3RyaW5nLCBidWlsZFN0YXRpY09ubHkgPSBmYWxzZSxcbiAgcHVzaEJyYW5jaCA9IHRydWUsIGlzRm9yY2UgPSBmYWxzZSwgc2VjcmV0Pzogc3RyaW5nLCBjb21taXRDb21tZW50Pzogc3RyaW5nKSB7XG5cbiAgY29uc3Qgc2V0dGluZyA9IGdldFNldHRpbmcoKTtcbiAgY29uc3Qge3Jvb3REaXJ9ID0gcGxpbmtFbnY7XG4gIGNvbnN0IGRlcGxveUJyYW5jaDogc3RyaW5nID0gc2V0dGluZy5wcmVidWlsZERlcGxveUJyYW5jaDtcblxuICAvLyBpZiAocHVzaEJyYW5jaClcbiAgbWVyZ2VCYWNrKCk7XG5cbiAgY29uc3QgemlwU3JjID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbGV0IHppcEZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBpZiAoYXBwTmFtZSAhPT0gJ25vZGUtc2VydmVyJykge1xuICAgIGNvbnN0IGluc3RhbGxEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2luc3RhbGwtJyArIGVudik7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGluc3RhbGxEaXIpKSB7XG4gICAgICBmcy5ta2RpcnBTeW5jKGluc3RhbGxEaXIpO1xuICAgIH1cbiAgICB6aXBGaWxlID0gYXdhaXQgY2hlY2taaXBGaWxlKHppcFNyYywgaW5zdGFsbERpciwgYXBwTmFtZSwgLyhbXFxcXC9dc3RhdHNbXl0qXFwuanNvbnxcXC5tYXApJC8pO1xuXG4gICAgY29uc3QgZ2VuZXJhdGVkU2VydmVyRmlsZURpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCAnZGlzdC9zZXJ2ZXInKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZ2VuZXJhdGVkU2VydmVyRmlsZURpciwgYXBwTmFtZSkpKSB7XG4gICAgICBjb25zdCBzZXJ2ZXJaaXAgPSBhd2FpdCBjaGVja1ppcEZpbGUoZ2VuZXJhdGVkU2VydmVyRmlsZURpciwgUGF0aC5yZXNvbHZlKHJvb3REaXIsICdzZXJ2ZXItY29udGVudC0nICsgZW52KSwgYXBwTmFtZSk7XG4gICAgICBsb2cuaW5mbyhgUGFjayAke2dlbmVyYXRlZFNlcnZlckZpbGVEaXJ9IHRvICR7c2VydmVyWmlwfWApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChhcHBOYW1lID09PSAnbm9kZS1zZXJ2ZXInKSB7XG4gICAgYXdhaXQgZGlnZXN0SW5zdGFsbGluZ0ZpbGVzKCk7XG4gICAgbG9nLmluZm8oYXdhaXQgc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICB9XG5cbiAgLy8gY29uc3QgemlwRGlyID0gUGF0aC5yZXNvbHZlKCdpbnN0YWxsLScgKyBlbnYpO1xuXG4gIHRyeSB7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdicmFuY2gnLCAnLUQnLCBkZXBsb3lCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGxvZy5kZWJ1ZyhlLm1lc3NhZ2UpO1xuICB9XG5cbiAgY29uc3QgY3VyckJyYW5jaCA9IGF3YWl0IGdldEN1cnJCcmFuY2hOYW1lKCk7XG5cbiAgaWYgKGJ1aWxkU3RhdGljT25seSAmJiB6aXBGaWxlKSB7XG4gICAgLy8gRHluYW1pY2FsbHkgcHVzaCB0byBOb2RlIHNlcnZlclxuICAgIGNvbnN0IGNmZ0J5RW52ID0gc2V0dGluZy5ieUVudltlbnZdO1xuICAgIGlmIChjZmdCeUVudiA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgY29uZmlndXJhdGlvbiBwcm9wZXJ0eSAnQHdmaC9wcmVidWlsZC5ieUVudltcIiR7ZW52fVwiXScsYCArXG4gICAgICBgYWRkIHRoaXMgcHJvcGVydHkgd2l0aCBjb21tYW5kIGxpbmUgYXJndW1lbnQgJy1jIDxmaWxlPicgb3IgJy0tcHJvcCBAd2ZoL3ByZWJ1aWxkLmJ5RW52W1wiJHtlbnZ9XCJdJ2ApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgYXdhaXQgc2VuZChlbnYsIGFwcE5hbWUsIHppcEZpbGUsIHNldHRpbmcuYnlFbnZbZW52XS5zZW5kQ29uY3VycmVuY3kgLCBzZXR0aW5nLmJ5RW52W2Vudl0uc2VuZE5vZGVzLCBpc0ZvcmNlLCBzZWNyZXQpO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICB0cnkge1xuICAgICAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICAgICAgfSBjYXRjaCAoZXgpIHt9XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH1cblxuICBsb2cuaW5mbygnLS0tLS0tLSBwdXNoIHRvIGRlcGxveW1lbnQgcmVtb3RlIC0tLS0tLS0nKTtcbiAgYXdhaXQgcHVzaERlcGxveUJyYW5jaChkZXBsb3lCcmFuY2gsIHJvb3REaXIsIGVudiwgYXBwTmFtZSwgcHVzaEJyYW5jaCwgY29tbWl0Q29tbWVudCk7XG4gIGxvZy5pbmZvKCctLS0tLS0tIGNyZWF0ZSB0YWcgYW5kIG5ldyByZWxlYXNlIGJyYW5jaCAtLS0tLS0tJyk7XG4gIC8vIGF3YWl0IHB1c2hUYWdBbmRSZWxlYXNlQnJhbmNoKHJvb3REaXIsIHB1c2hCcmFuY2gsIGNvbW1pdENvbW1lbnQpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgY3VyckJyYW5jaCwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHVzaERlcGxveUJyYW5jaChyZWxlYXNlQnJhbmNoOiBzdHJpbmcsIHJvb3REaXI6IHN0cmluZywgZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgcHVzaEJyYW5jaDogYm9vbGVhbiwgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCBkZXBsb3lSZW1vdGUgPSBhcGkuY29uZmlnKClbJ0B3ZmgvcHJlYnVpbGQnXS5wcmVidWlsZERlcGxveVJlbW90ZTtcblxuICBhd2FpdCBzcGF3bignZ2l0JywgJ2NoZWNrb3V0JywgJy1iJywgcmVsZWFzZUJyYW5jaCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICAvLyByZW1vdmVEZXZEZXBzKCk7XG4gIGNoYW5nZUdpdElnbm9yZSgpO1xuICBsb2cuaW5mbygnY29tbWl0Q29tbWVudCcsIGNvbW1pdENvbW1lbnQpO1xuICBhd2FpdCBzcGxpdENvbW1pdDRiaWdGaWxlcyhlbnYsIGFwcE5hbWUsIHB1c2hCcmFuY2gsIGNvbW1pdENvbW1lbnQpO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ2FkZCcsICcuJywgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICBjb25zdCBob29rRmlsZXMgPSBbUGF0aC5yZXNvbHZlKHJvb3REaXIsICcuZ2l0L2hvb2tzL3ByZS1wdXNoJyksXG4gICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsICcuZ2l0L2hvb2tzL3ByZS1jb21taXQnKV07XG4gIGZvciAoY29uc3QgZ2l0SG9va3Mgb2YgaG9va0ZpbGVzKSB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0SG9va3MpKSB7XG4gICAgICBmcy5yZW1vdmVTeW5jKGdpdEhvb2tzKTtcbiAgICB9XG4gIH1cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjb21taXQnLCAnLW0nLCBjb21taXRDb21tZW50ID8gY29tbWl0Q29tbWVudCA6IGBQcmVidWlsZCBub2RlIHNlcnZlciAke2Vudn0gLSAke2FwcE5hbWV9YCwgeyBjd2Q6IHJvb3REaXIsIHNpbGVudDogdHJ1ZSB9KS5wcm9taXNlO1xuICBhd2FpdCBzcGF3bignZ2l0JywgJ3B1c2gnLCAnLWYnLCBkZXBsb3lSZW1vdGUsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgYXdhaXQgcHVzaFRhZ0FuZFJlbGVhc2VCcmFuY2gocHVzaEJyYW5jaCwgY29tbWl0Q29tbWVudCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hUYWdBbmRSZWxlYXNlQnJhbmNoKHB1c2hCcmFuY2g6IGJvb2xlYW4sIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcbiAgLy8gYXdhaXQgc3Bhd24oJ2dpdCcsICd0YWcnLCAnLWEnLCAndicgKyByZW1vdGVCcmFuY2hOYW1lLCAnLW0nLFxuICAvLyAgIGNvbW1pdENvbW1lbnQgPyBjb21taXRDb21tZW50IDogYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLFxuICAvLyAgIHsgY3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgLy8gYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZSwgJ3YnICsgcmVtb3RlQnJhbmNoTmFtZSwgeyBjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGlmIChwdXNoQnJhbmNoICYmIHJlbGVhc2VSZW1vdGUgJiYgcmVsZWFzZVJlbW90ZSAhPT0gc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZSkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsIHJlbGVhc2VSZW1vdGUsICdIRUFEOnJlbGVhc2UvJyArIHJlbW90ZUJyYW5jaE5hbWUsIHsgY3dkOiBwbGlua0Vudi5yb290RGlyIH0pLnByb21pc2U7XG4gICAgLy8gYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgcmVsZWFzZVJlbW90ZSwgJ3YnICsgcmVtb3RlQnJhbmNoTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnU2tpcCBwdXNoaW5nICcgKyBwdXNoQnJhbmNoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjaGFuZ2VHaXRJZ25vcmUoKSB7XG4gIGNvbnN0IGdpdGlnbm9yZUZpbGUgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3Jvb3RQYXRoJywgJy5naXRpZ25vcmUnKTtcbiAgbGV0IGdpdGlnbm9yZSA9IGZzLnJlYWRGaWxlU3luYyhnaXRpZ25vcmVGaWxlLCAndXRmOCcpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2luc3RhbGxcXC0oPzp0ZXN0fHN0YWdlfGRldnxwcm9kKSQvZ20sICcnKTtcbiAgZ2l0aWdub3JlID0gZ2l0aWdub3JlLnJlcGxhY2UoL15cXC9jaGVja3N1bVxcLig/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpXFwuanNvbiQvZ20sICcnKTtcbiAgZnMud3JpdGVGaWxlU3luYyhnaXRpZ25vcmVGaWxlLCBnaXRpZ25vcmUpO1xufVxuXG4vKipcbiAqIFNvbWUgZ2l0IHZlbmRvciBoYXMgY29tbWl0IHNpemUgbGltaXRhdGlvbiwgbGV0J3MgdHJ5IHNwbGl0IHRvIG11bHRpcGxlIGNvbW1pdHMgZm9yIHRob3NlIG5vbi1zb3VyY2UgZmlsZXNcbiAqL1xuZnVuY3Rpb24gc3BsaXRDb21taXQ0YmlnRmlsZXMoZW52OiBzdHJpbmcsIGFwcE5hbWU6IHN0cmluZywgcHVzaEJyYW5jaDogYm9vbGVhbiwgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCBlbnZzID0gT2JqZWN0LmtleXMoZ2V0U2V0dGluZygpLmJ5RW52KVxuICBjb25zdCByZXMkID0gcngub2YoJ2luc3RhbGwtJywgJ3NlcnZlci1jb250ZW50LScpLnBpcGUoXG4gICAgb3AubWVyZ2VNYXAoYXJ0aWZhY3REaXJQcmVmaXggPT4ge1xuICAgICAgcmV0dXJuIGVudnMubWFwKGVudk5hbWUgPT4gUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsIGFydGlmYWN0RGlyUHJlZml4ICsgZW52TmFtZSkpO1xuICAgIH0pLFxuICAgIG9wLm1lcmdlTWFwKGRpciA9PiB7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YiA9PiB7XG4gICAgICAgICAgZ2xvYihkaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qJywgKGVyciwgbWF0Y2hlcykgPT4ge1xuICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIG1hdGNoZXMpIHtcbiAgICAgICAgICAgICAgc3ViLm5leHQoUGF0aC5yZWxhdGl2ZShwbGlua0Vudi5yb290RGlyLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgIH0pLFxuICAgIG9wLmNvbmNhdE1hcChhc3luYyBmaWxlID0+IHtcbiAgICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYWRkJywgZmlsZSwgeyBjd2Q6IHBsaW5rRW52LnJvb3REaXIsIHNpbGVudDogZmFsc2UgfSkucHJvbWlzZTtcbiAgICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnY29tbWl0JywgJy1tJywgY29tbWl0Q29tbWVudCA/IGNvbW1pdENvbW1lbnQgOiBgUHJlYnVpbGQgbm9kZSBzZXJ2ZXIgJHtlbnZ9IC0gJHthcHBOYW1lfTpcXG4ke2ZpbGV9YCxcbiAgICAgICAgeyBjd2Q6IHBsaW5rRW52LnJvb3REaXIsIHNpbGVudDogZmFsc2UgfSlcbiAgICAgICAgLnByb21pc2U7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgICBhd2FpdCBwdXNoVGFnQW5kUmVsZWFzZUJyYW5jaChwdXNoQnJhbmNoLCBjb21taXRDb21tZW50KTtcbiAgICB9KSxcbiAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHRocm93IGVycjtcbiAgICB9KSxcbiAgICBvcC5jb3VudCgpLFxuICAgIG9wLnRhcChjb3VudCA9PiBsb2cuaW5mbyhgJHtjb3VudH0gZmlsZXMgYXJlIHNwbGl0IGludG8gJHtjb3VudH0gY29tbWl0cy5gKSlcbiAgKTtcblxuICByZXR1cm4gcmVzJC50b1Byb21pc2UoKTtcbn1cbiJdfQ==