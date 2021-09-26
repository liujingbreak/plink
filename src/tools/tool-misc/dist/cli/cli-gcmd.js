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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const op = __importStar(require("rxjs/operators"));
const plink_1 = require("@wfh/plink");
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const log = (0, plink_1.log4File)(__filename);
async function generate(packageName, cmdName, opts) {
    const targetPkgs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), [packageName]));
    if (targetPkgs.length === 0) {
        throw new Error(`Can not find package ${packageName}`);
    }
    const targetPkg = targetPkgs[0];
    const pkgTsDirInfo = (0, misc_1.getTscConfigOfPkg)(targetPkg.json);
    const lowerCaseCmdName = cmdName.toLowerCase();
    const cmdFileName = lowerCaseCmdName.replace(/:/g, '-');
    const camelCaseCmd = lowerCaseCmdName.replace(/[-:]([a-zA-Z])/g, (match, $1) => $1.toUpperCase());
    if (opts.dryRun) {
        log.warn('Dryrun mode...');
    }
    await (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, pkgTsDirInfo.srcDir), {
        fileMapping: [[/foobar/g, cmdFileName]],
        textMapping: {
            foobar: lowerCaseCmdName,
            foobarId: camelCaseCmd,
            foobarFile: cmdFileName
        }
    }, { dryrun: opts.dryRun });
    const pkJsonFile = path_1.default.resolve(targetPkg.realPath, 'package.json');
    if (opts.dryRun) {
        log.info(chalk_1.default.cyan(pkJsonFile) + ' will be changed.');
    }
    else {
        let text = fs_1.default.readFileSync(pkJsonFile, 'utf8');
        const objAst = (0, json_sync_parser_1.default)(text);
        const plinkProp = objAst.properties.find(prop => prop.name.text === '"dr"')
            || objAst.properties.find(prop => prop.name.text === '"plink"');
        if (plinkProp) {
            const drProp = plinkProp.value;
            if (drProp.properties.map(item => item.name.text).includes('"cli"')) {
                throw new Error(`${pkJsonFile} has already defined a "cli" property as executable entry`);
            }
            const pkjsonText = (0, patch_text_1.default)(text, [{
                    text: '\n    "cli": "dist/cli/cli.js#default"' + (drProp.properties.length > 0 ? ',' : '\n  '),
                    start: drProp.start + 1,
                    end: drProp.start + 1
                }]);
            fs_1.default.writeFileSync(pkJsonFile, pkjsonText);
            log.info(chalk_1.default.cyan(pkJsonFile) + 'is changed.');
            if ((0, package_mgr_1.isCwdWorkspace)()) {
                package_mgr_1.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: false, packageJsonFiles: [pkJsonFile] });
                await (0, package_mgr_1.getStore)().pipe(op.map(s => s.workspaceUpdateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1)).toPromise();
                const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
                await tsc({ package: [packageName], pathsJsons: [] });
            }
        }
        else {
            throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
        }
    }
}
exports.generate = generate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLHNGQUErRDtBQUMvRCx5REFBa0U7QUFDbEUsaUVBQXFHO0FBQ3JHLGtHQUE0RTtBQUM1RSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLGtEQUEwQjtBQUMxQixtREFBcUM7QUFDckMsc0NBQW1EO0FBQ25ELHlEQUFpRTtBQUdqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFNMUIsS0FBSyxVQUFVLFFBQVEsQ0FBQyxXQUFtQixFQUFFLE9BQWUsRUFBRSxJQUFlO0lBQ2xGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxJQUFBLHNCQUFRLEdBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5RSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDeEQ7SUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFFLENBQUM7SUFDakMsTUFBTSxZQUFZLEdBQUcsSUFBQSx3QkFBaUIsRUFBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdkQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDL0MsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4RCxNQUFNLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENB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QUNuQixFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLEVBQ3RDLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDZCxNQUFNLEVBQUMsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLDRCQUE0QixDQUFrQixDQUFDO2dCQUNyRSxNQUFNLEdBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO2FBQ3JEO1NBRUY7YUFBTTtZQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxVQUFVLGlFQUFpRSxDQUFDLENBQUM7U0FDakc7S0FDRjtBQUNILENBQUM7QUFoRUQsNEJBZ0VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcbmltcG9ydCByZXBsYWNlVGV4dCBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IHtmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC91dGlscyc7XG5pbXBvcnQge2dldFN0YXRlLCBnZXRTdG9yZSwgYWN0aW9uRGlzcGF0Y2hlciwgaXNDd2RXb3Jrc3BhY2V9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuaW1wb3J0IHBhcnNlLCB7T2JqZWN0QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucywgbG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtnZXRUc2NDb25maWdPZlBrZ30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF90c2NtZCBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuZXhwb3J0IGludGVyZmFjZSBDQk9wdGlvbnMgZXh0ZW5kcyBHbG9iYWxPcHRpb25zIHtcbiAgZm9yVGVtcGxhdGU6IGJvb2xlYW47XG4gIGRyeVJ1bjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZywgb3B0czogQ0JPcHRpb25zKSB7XG4gIGNvbnN0IHRhcmdldFBrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgW3BhY2thZ2VOYW1lXSkpO1xuXG4gIGlmICh0YXJnZXRQa2dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgJHtwYWNrYWdlTmFtZX1gKTtcbiAgfVxuICBjb25zdCB0YXJnZXRQa2cgPSB0YXJnZXRQa2dzWzBdITtcbiAgY29uc3QgcGtnVHNEaXJJbmZvID0gZ2V0VHNjQ29uZmlnT2ZQa2codGFyZ2V0UGtnLmpzb24pO1xuXG4gIGNvbnN0IGxvd2VyQ2FzZUNtZE5hbWUgPSBjbWROYW1lLnRvTG93ZXJDYXNlKCk7XG4gIGNvbnN0IGNtZEZpbGVOYW1lID0gbG93ZXJDYXNlQ21kTmFtZS5yZXBsYWNlKC86L2csICctJyk7XG4gIGNvbnN0IGNhbWVsQ2FzZUNtZCA9IGxvd2VyQ2FzZUNtZE5hbWUucmVwbGFjZSgvWy06XShbYS16QS1aXSkvZywgKG1hdGNoLCAkMTogc3RyaW5nKSA9PiAkMS50b1VwcGVyQ2FzZSgpKTtcbiAgaWYgKG9wdHMuZHJ5UnVuKSB7XG4gICAgbG9nLndhcm4oJ0RyeXJ1biBtb2RlLi4uJyk7XG4gIH1cbiAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNsaWdlbicpLFxuICAgIFBhdGgucmVzb2x2ZSh0YXJnZXRQa2cucmVhbFBhdGgsIHBrZ1RzRGlySW5mby5zcmNEaXIpLFxuICAgIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbIFsvZm9vYmFyL2csIGNtZEZpbGVOYW1lXSBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgZm9vYmFyOiBsb3dlckNhc2VDbWROYW1lLFxuICAgICAgICBmb29iYXJJZDogY2FtZWxDYXNlQ21kLFxuICAgICAgICBmb29iYXJGaWxlOiBjbWRGaWxlTmFtZVxuICAgICAgfVxuICAgIH0sIHtkcnlydW46IG9wdHMuZHJ5UnVufSk7XG5cbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh0YXJnZXRQa2cucmVhbFBhdGgsICdwYWNrYWdlLmpzb24nKTtcblxuICBpZiAob3B0cy5kcnlSdW4pIHtcbiAgICBsb2cuaW5mbyhjaGFsay5jeWFuKHBrSnNvbkZpbGUpICsgJyB3aWxsIGJlIGNoYW5nZWQuJyk7XG4gIH0gZWxzZSB7XG4gICAgbGV0IHRleHQgPSBmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBvYmpBc3QgPSBwYXJzZSh0ZXh0KTtcbiAgICBjb25zdCBwbGlua1Byb3AgPSBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcImRyXCInKVxuICAgICAgfHwgb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJwbGlua1wiJyk7XG4gICAgaWYgKHBsaW5rUHJvcCkge1xuICAgICAgY29uc3QgZHJQcm9wID0gcGxpbmtQcm9wLnZhbHVlIGFzIE9iamVjdEFzdDtcbiAgICAgIGlmIChkclByb3AucHJvcGVydGllcy5tYXAoaXRlbSA9PiBpdGVtLm5hbWUudGV4dCkuaW5jbHVkZXMoJ1wiY2xpXCInKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cGtKc29uRmlsZX0gaGFzIGFscmVhZHkgZGVmaW5lZCBhIFwiY2xpXCIgcHJvcGVydHkgYXMgZXhlY3V0YWJsZSBlbnRyeWApO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtqc29uVGV4dCA9IHJlcGxhY2VUZXh0KHRleHQsIFt7XG4gICAgICAgIHRleHQ6ICdcXG4gICAgXCJjbGlcIjogXCJkaXN0L2NsaS9jbGkuanMjZGVmYXVsdFwiJyArIChkclByb3AucHJvcGVydGllcy5sZW5ndGggPiAwID8gJywnIDogJ1xcbiAgJyksXG4gICAgICAgIHN0YXJ0OiBkclByb3Auc3RhcnQgKyAxLFxuICAgICAgICBlbmQ6IGRyUHJvcC5zdGFydCArIDFcbiAgICAgIH1dKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMocGtKc29uRmlsZSwgcGtqc29uVGV4dCk7XG4gICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKHBrSnNvbkZpbGUpICsgJ2lzIGNoYW5nZWQuJyk7XG5cbiAgICAgIGlmIChpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHByb2Nlc3MuY3dkKCksIGlzRm9yY2U6IGZhbHNlLCBwYWNrYWdlSnNvbkZpbGVzOiBbcGtKc29uRmlsZV19KTtcbiAgICAgICAgYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG9wLm1hcChzID0+IHMud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0pLFxuICAgICAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgb3Auc2tpcCgxKSxcbiAgICAgICAgICBvcC50YWtlKDEpXG4gICAgICAgICkudG9Qcm9taXNlKCk7XG4gICAgICAgIGNvbnN0IHt0c2N9ID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnKSBhcyB0eXBlb2YgX3RzY21kO1xuICAgICAgICBhd2FpdCB0c2Moe3BhY2thZ2U6IFtwYWNrYWdlTmFtZV0sIHBhdGhzSnNvbnM6IFtdfSk7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3BrSnNvbkZpbGV9IGhhcyBubyBcImRyXCIgb3IgXCJwbGlua1wiIHByb3BlcnR5LCBpcyBpdCBhbiB2YWxpZCBQbGluayBwYWNrYWdlP2ApO1xuICAgIH1cbiAgfVxufVxuIl19