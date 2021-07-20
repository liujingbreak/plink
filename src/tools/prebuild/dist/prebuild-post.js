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
        log.info('commitComment', commitComment);
        yield splitCommit4bigFiles(env, appName);
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
// eslint-disable-next-line
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
/**
 * Some git vendor has commit size limitation, let's try split to multiple commits for those non-source files
 */
function splitCommit4bigFiles(env, appName, commitComment) {
    const gitAddTargets = new rx.Subject();
    const res$ = gitAddTargets.pipe(op.concatMap((file) => __awaiter(this, void 0, void 0, function* () {
        yield process_utils_1.spawn('git', 'add', file, { cwd: plink_1.plinkEnv.rootDir, silent: true }).promise;
        yield process_utils_1.spawn('git', 'commit', '-m', commitComment ? commitComment : `Prebuild node server ${env} - ${appName}`, { cwd: plink_1.plinkEnv.rootDir, silent: true })
            .promise;
        yield new Promise(resolve => setImmediate(resolve));
    })));
    for (const env of Object.keys(prebuild_setting_1.getSetting().byEnv)) {
        for (const artifactDirPrefix of ['install-', 'server-content-']) {
            const dir = path_1.default.resolve(plink_1.plinkEnv.rootDir, artifactDirPrefix + env);
            if (fs_extra_1.default.existsSync(dir)) {
                glob_1.default(dir.replace(/\\/g, '/') + '/**/*', (err, matches) => {
                    for (const file of matches)
                        gitAddTargets.next(path_1.default.relative(plink_1.plinkEnv.rootDir, file).replace(/\\/g, '/'));
                });
            }
        }
    }
    return res$.toPromise();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlYnVpbGQtcG9zdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByZWJ1aWxkLXBvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQixxRUFBMEQ7QUFDMUQsZ0RBQXdCO0FBQ3hCLHdEQUEwQjtBQUMxQixrREFBMEI7QUFDMUIsdURBQWlFO0FBQ2pFLDRFQUErRjtBQUMvRiwrQ0FBcUM7QUFDckMsMkNBQXFEO0FBQ3JELHNEQUEwQjtBQUMxQiwrREFBb0Q7QUFDcEQseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxnREFBd0I7QUFDeEIsc0NBQThDO0FBRTlDLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxNQUFNLEdBQTBELE9BQU8sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFMUcsU0FBc0IsSUFBSSxDQUFDLEdBQVcsRUFBRSxPQUErQixFQUFFLGVBQWUsR0FBRyxLQUFLLEVBQzlGLFVBQVUsR0FBRyxJQUFJLEVBQUUsT0FBTyxHQUFHLEtBQUssRUFBRSxNQUFlLEVBQUUsYUFBc0I7O1FBRTNFLE1BQU0sT0FBTyxHQUFHLDZCQUFVLEVBQUUsQ0FBQztRQUM3QixNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsZ0JBQVEsQ0FBQztRQUMzQixNQUFNLFlBQVksR0FBVyxPQUFPLENBQUMsb0JBQW9CLENBQUM7UUFFMUQsa0JBQWtCO1FBQ2xCLDJCQUFTLEVBQUUsQ0FBQztRQUVaLE1BQU0sTUFBTSxHQUFHLGlCQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxJQUFJLE9BQTJCLENBQUM7UUFFaEMsSUFBSSxPQUFPLEtBQUssYUFBYSxFQUFFO1lBQzdCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxF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QUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7b0JBQ3ZELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTzt3QkFDeEIsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbEYsQ0FBQyxDQUFDLENBQUM7YUFDSjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGRheWpzIGZyb20gJ2RheWpzJztcbmltcG9ydCB7IG1lcmdlQmFjaywgZ2V0Q3VyckJyYW5jaE5hbWUgfSBmcm9tICcuL21lcmdlLWFydGlmYWN0cyc7XG5pbXBvcnQgeyBkaWdlc3RJbnN0YWxsaW5nRmlsZXMsIGNoZWNrWmlwRmlsZSB9IGZyb20gJ0B3ZmgvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L3JlbW90ZS1kZXBsb3knO1xuaW1wb3J0IHsgc2VuZCB9IGZyb20gJy4vX3NlbmQtcGF0Y2gnO1xuaW1wb3J0IHtzdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnN9IGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vcHJlYnVpbGQtc2V0dGluZyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBnbG9iIGZyb20gJ2dsb2InO1xuaW1wb3J0IHtsb2c0RmlsZSwgcGxpbmtFbnZ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxubGV0IHBrSnNvbjoge25hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBkZXZEZXBlbmRlbmNpZXM6IGFueX0gPSByZXF1aXJlKFBhdGgucmVzb2x2ZSgncGFja2FnZS5qc29uJykpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihlbnY6IHN0cmluZywgYXBwTmFtZTogJ25vZGUtc2VydmVyJyB8IHN0cmluZywgYnVpbGRTdGF0aWNPbmx5ID0gZmFsc2UsXG4gIHB1c2hCcmFuY2ggPSB0cnVlLCBpc0ZvcmNlID0gZmFsc2UsIHNlY3JldD86IHN0cmluZywgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuXG4gIGNvbnN0IHNldHRpbmcgPSBnZXRTZXR0aW5nKCk7XG4gIGNvbnN0IHtyb290RGlyfSA9IHBsaW5rRW52O1xuICBjb25zdCBkZXBsb3lCcmFuY2g6IHN0cmluZyA9IHNldHRpbmcucHJlYnVpbGREZXBsb3lCcmFuY2g7XG5cbiAgLy8gaWYgKHB1c2hCcmFuY2gpXG4gIG1lcmdlQmFjaygpO1xuXG4gIGNvbnN0IHppcFNyYyA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxldCB6aXBGaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgaWYgKGFwcE5hbWUgIT09ICdub2RlLXNlcnZlcicpIHtcbiAgICBjb25zdCBpbnN0YWxsRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsICdpbnN0YWxsLScgKyBlbnYpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhpbnN0YWxsRGlyKSkge1xuICAgICAgZnMubWtkaXJwU3luYyhpbnN0YWxsRGlyKTtcbiAgICB9XG4gICAgemlwRmlsZSA9IGF3YWl0IGNoZWNrWmlwRmlsZSh6aXBTcmMsIGluc3RhbGxEaXIsIGFwcE5hbWUsIC8oW1xcXFwvXXN0YXRzW15dKlxcLmpzb258XFwubWFwKSQvKTtcblxuICAgIGNvbnN0IGdlbmVyYXRlZFNlcnZlckZpbGVEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgJ2Rpc3Qvc2VydmVyJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdlbmVyYXRlZFNlcnZlckZpbGVEaXIsIGFwcE5hbWUpKSkge1xuICAgICAgY29uc3Qgc2VydmVyWmlwID0gYXdhaXQgY2hlY2taaXBGaWxlKGdlbmVyYXRlZFNlcnZlckZpbGVEaXIsIFBhdGgucmVzb2x2ZShyb290RGlyLCAnc2VydmVyLWNvbnRlbnQtJyArIGVudiksIGFwcE5hbWUpO1xuICAgICAgbG9nLmluZm8oYFBhY2sgJHtnZW5lcmF0ZWRTZXJ2ZXJGaWxlRGlyfSB0byAke3NlcnZlclppcH1gKTtcbiAgICB9XG4gIH1cblxuICBpZiAoYXBwTmFtZSA9PT0gJ25vZGUtc2VydmVyJykge1xuICAgIGF3YWl0IGRpZ2VzdEluc3RhbGxpbmdGaWxlcygpO1xuICAgIGxvZy5pbmZvKGF3YWl0IHN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgfVxuXG4gIC8vIGNvbnN0IHppcERpciA9IFBhdGgucmVzb2x2ZSgnaW5zdGFsbC0nICsgZW52KTtcblxuICB0cnkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAnYnJhbmNoJywgJy1EJywgZGVwbG95QnJhbmNoLCB7IGN3ZDogcm9vdERpciwgc2lsZW50OiB0cnVlIH0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsb2cuZGVidWcoZS5tZXNzYWdlKTtcbiAgfVxuXG4gIGNvbnN0IGN1cnJCcmFuY2ggPSBhd2FpdCBnZXRDdXJyQnJhbmNoTmFtZSgpO1xuXG4gIGlmIChidWlsZFN0YXRpY09ubHkgJiYgemlwRmlsZSkge1xuICAgIC8vIER5bmFtaWNhbGx5IHB1c2ggdG8gTm9kZSBzZXJ2ZXJcbiAgICBjb25zdCBjZmdCeUVudiA9IHNldHRpbmcuYnlFbnZbZW52XTtcbiAgICBpZiAoY2ZnQnlFbnYgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIGNvbmZpZ3VyYXRpb24gcHJvcGVydHkgJ0B3ZmgvcHJlYnVpbGQuYnlFbnZbXCIke2Vudn1cIl0nLGAgK1xuICAgICAgYGFkZCB0aGlzIHByb3BlcnR5IHdpdGggY29tbWFuZCBsaW5lIGFyZ3VtZW50ICctYyA8ZmlsZT4nIG9yICctLXByb3AgQHdmaC9wcmVidWlsZC5ieUVudltcIiR7ZW52fVwiXSdgKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHNlbmQoZW52LCBhcHBOYW1lLCB6aXBGaWxlLCBzZXR0aW5nLmJ5RW52W2Vudl0uc2VuZENvbmN1cnJlbmN5ICwgc2V0dGluZy5ieUVudltlbnZdLnNlbmROb2RlcywgaXNGb3JjZSwgc2VjcmV0KTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7fVxuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9XG5cbiAgbG9nLmluZm8oJy0tLS0tLS0gcHVzaCB0byBkZXBsb3ltZW50IHJlbW90ZSAtLS0tLS0tJyk7XG4gIGF3YWl0IHB1c2hEZXBsb3lCcmFuY2goZGVwbG95QnJhbmNoLCByb290RGlyLCBlbnYsIGFwcE5hbWUsIGNvbW1pdENvbW1lbnQpO1xuICBsb2cuaW5mbygnLS0tLS0tLSBjcmVhdGUgdGFnIGFuZCBuZXcgcmVsZWFzZSBicmFuY2ggLS0tLS0tLScpO1xuICBhd2FpdCBwdXNoVGFnQW5kUmVsZWFzZUJyYW5jaChyb290RGlyLCBwdXNoQnJhbmNoLCBjb21taXRDb21tZW50KTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsIGN1cnJCcmFuY2gsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hEZXBsb3lCcmFuY2gocmVsZWFzZUJyYW5jaDogc3RyaW5nLCByb290RGlyOiBzdHJpbmcsIGVudjogc3RyaW5nLCBhcHBOYW1lOiBzdHJpbmcsIGNvbW1pdENvbW1lbnQ/OiBzdHJpbmcpIHtcbiAgY29uc3QgZGVwbG95UmVtb3RlID0gYXBpLmNvbmZpZygpWydAd2ZoL3ByZWJ1aWxkJ10ucHJlYnVpbGREZXBsb3lSZW1vdGU7XG5cbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdjaGVja291dCcsICctYicsIHJlbGVhc2VCcmFuY2gsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgLy8gcmVtb3ZlRGV2RGVwcygpO1xuICBjaGFuZ2VHaXRJZ25vcmUoKTtcbiAgbG9nLmluZm8oJ2NvbW1pdENvbW1lbnQnLCBjb21taXRDb21tZW50KTtcbiAgYXdhaXQgc3BsaXRDb21taXQ0YmlnRmlsZXMoZW52LCBhcHBOYW1lKTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdhZGQnLCAnLicsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgY29uc3QgaG9va0ZpbGVzID0gW1BhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdC9ob29rcy9wcmUtcHVzaCcpLFxuICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdC9ob29rcy9wcmUtY29tbWl0JyldO1xuICBmb3IgKGNvbnN0IGdpdEhvb2tzIG9mIGhvb2tGaWxlcykge1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGdpdEhvb2tzKSkge1xuICAgICAgZnMucmVtb3ZlU3luYyhnaXRIb29rcyk7XG4gICAgfVxuICB9XG4gIGF3YWl0IHNwYXduKCdnaXQnLCAnY29tbWl0JywgJy1tJywgY29tbWl0Q29tbWVudCA/IGNvbW1pdENvbW1lbnQgOiBgUHJlYnVpbGQgbm9kZSBzZXJ2ZXIgJHtlbnZ9IC0gJHthcHBOYW1lfWAsIHsgY3dkOiByb290RGlyLCBzaWxlbnQ6IHRydWUgfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgJy1mJywgZGVwbG95UmVtb3RlLCByZWxlYXNlQnJhbmNoLCB7IGN3ZDogcm9vdERpcn0pLnByb21pc2U7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1c2hUYWdBbmRSZWxlYXNlQnJhbmNoKHJvb3REaXI6IHN0cmluZywgcHVzaEJyYW5jaDogYm9vbGVhbiwgY29tbWl0Q29tbWVudD86IHN0cmluZykge1xuICBjb25zdCBzZXR0aW5nID0gZ2V0U2V0dGluZygpO1xuICBjb25zdCByZWxlYXNlUmVtb3RlID0gc2V0dGluZy50YWdQdXNoUmVtb3RlO1xuICBjb25zdCBjdXJyZW50ID0gZGF5anMoKTtcbiAgY29uc3QgdGFnTmFtZSA9IGAke3BrSnNvbi52ZXJzaW9ufS0ke2N1cnJlbnQuZm9ybWF0KCdISG1tc3MnKX0tJHtjdXJyZW50LmZvcm1hdCgnWVlNTUREJyl9YDtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICd0YWcnLCAnLWEnLCAndicgKyB0YWdOYW1lLCAnLW0nLFxuICAgIGNvbW1pdENvbW1lbnQgPyBjb21taXRDb21tZW50IDogYFByZWJ1aWxkIG9uICR7Y3VycmVudC5mb3JtYXQoJ1lZWVkvTU0vREQgSEg6bW06c3MnKX1gLFxuICAgIHsgY3dkOiByb290RGlyfSkucHJvbWlzZTtcbiAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZSwgJ3YnICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXJ9KS5wcm9taXNlO1xuXG4gIGlmIChwdXNoQnJhbmNoICYmIHJlbGVhc2VSZW1vdGUgJiYgcmVsZWFzZVJlbW90ZSAhPT0gc2V0dGluZy5wcmVidWlsZERlcGxveVJlbW90ZSkge1xuICAgIGF3YWl0IHNwYXduKCdnaXQnLCAncHVzaCcsIHJlbGVhc2VSZW1vdGUsICdIRUFEOnJlbGVhc2UvJyArIHRhZ05hbWUsIHsgY3dkOiByb290RGlyIH0pLnByb21pc2U7XG4gICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdwdXNoJywgcmVsZWFzZVJlbW90ZSwgJ3YnICsgdGFnTmFtZSwgeyBjd2Q6IHJvb3REaXIgfSkucHJvbWlzZTtcbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnU2tpcCBwdXNoaW5nICcgKyBwdXNoQnJhbmNoKTtcbiAgfVxufVxuXG4vLyBmdW5jdGlvbiByZW1vdmVEZXZEZXBzKCkge1xuLy8gICBjb25zdCBqc29uID0gT2JiamVjdC5hc3NpZ24oe30sIHBrSnNvbik7XG4vLyAgIGRlbGV0ZSBqc29uLmRldkRlcGVuZGVuY2llcztcbi8vICAgY29uc3QgbmV3SnNvbiA9IEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICdcXHQnKTtcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZVxuLy8gICBsb2cuaW5mbygnY2hhbmdlIHBhY2thZ2UuanNvbiB0bzpcXG4nLCBuZXdKc29uKTtcbi8vICAgZnMud3JpdGVGaWxlU3luYygncGFja2FnZS5qc29uJywgbmV3SnNvbik7XG4vLyB9XG5cbmZ1bmN0aW9uIGNoYW5nZUdpdElnbm9yZSgpIHtcbiAgY29uc3QgZ2l0aWdub3JlRmlsZSA9IGFwaS5jb25maWcucmVzb2x2ZSgncm9vdFBhdGgnLCAnLmdpdGlnbm9yZScpO1xuICBsZXQgZ2l0aWdub3JlID0gZnMucmVhZEZpbGVTeW5jKGdpdGlnbm9yZUZpbGUsICd1dGY4Jyk7XG4gIGdpdGlnbm9yZSA9IGdpdGlnbm9yZS5yZXBsYWNlKC9eXFwvaW5zdGFsbFxcLSg/OnRlc3R8c3RhZ2V8ZGV2fHByb2QpJC9nbSwgJycpO1xuICBnaXRpZ25vcmUgPSBnaXRpZ25vcmUucmVwbGFjZSgvXlxcL2NoZWNrc3VtXFwuKD86dGVzdHxzdGFnZXxkZXZ8cHJvZClcXC5qc29uJC9nbSwgJycpO1xuICBmcy53cml0ZUZpbGVTeW5jKGdpdGlnbm9yZUZpbGUsIGdpdGlnbm9yZSk7XG59XG5cbi8qKlxuICogU29tZSBnaXQgdmVuZG9yIGhhcyBjb21taXQgc2l6ZSBsaW1pdGF0aW9uLCBsZXQncyB0cnkgc3BsaXQgdG8gbXVsdGlwbGUgY29tbWl0cyBmb3IgdGhvc2Ugbm9uLXNvdXJjZSBmaWxlc1xuICovXG5mdW5jdGlvbiBzcGxpdENvbW1pdDRiaWdGaWxlcyhlbnY6IHN0cmluZywgYXBwTmFtZTogc3RyaW5nLCBjb21taXRDb21tZW50Pzogc3RyaW5nKSB7XG4gIGNvbnN0IGdpdEFkZFRhcmdldHMgPSBuZXcgcnguU3ViamVjdDxzdHJpbmc+KCk7XG4gIGNvbnN0IHJlcyQgPSBnaXRBZGRUYXJnZXRzLnBpcGUoXG4gICAgb3AuY29uY2F0TWFwKGFzeW5jIGZpbGUgPT4ge1xuICAgICAgYXdhaXQgc3Bhd24oJ2dpdCcsICdhZGQnLCBmaWxlLCB7IGN3ZDogcGxpbmtFbnYucm9vdERpciwgc2lsZW50OiB0cnVlIH0pLnByb21pc2U7XG4gICAgICBhd2FpdCBzcGF3bignZ2l0JywgJ2NvbW1pdCcsICctbScsIGNvbW1pdENvbW1lbnQgPyBjb21taXRDb21tZW50IDogYFByZWJ1aWxkIG5vZGUgc2VydmVyICR7ZW52fSAtICR7YXBwTmFtZX1gLFxuICAgICAgICB7IGN3ZDogcGxpbmtFbnYucm9vdERpciwgc2lsZW50OiB0cnVlIH0pXG4gICAgICAgIC5wcm9taXNlO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIH0pXG4gICk7XG5cbiAgZm9yIChjb25zdCBlbnYgb2YgT2JqZWN0LmtleXMoZ2V0U2V0dGluZygpLmJ5RW52KSkge1xuICAgIGZvciAoY29uc3QgYXJ0aWZhY3REaXJQcmVmaXggb2YgWydpbnN0YWxsLScsICdzZXJ2ZXItY29udGVudC0nXSApIHtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCBhcnRpZmFjdERpclByZWZpeCArIGVudik7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAgIGdsb2IoZGlyLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKicsIChlcnIsIG1hdGNoZXMpID0+IHtcbiAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgbWF0Y2hlcylcbiAgICAgICAgICAgIGdpdEFkZFRhcmdldHMubmV4dChQYXRoLnJlbGF0aXZlKHBsaW5rRW52LnJvb3REaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gcmVzJC50b1Byb21pc2UoKTtcbn1cbiJdfQ==