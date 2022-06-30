"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const tslib_1 = require("tslib");
const template_gen_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const patch_text_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const op = tslib_1.__importStar(require("rxjs/operators"));
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
                    text: `\n    "cli": "${pkgTsDirInfo.destDir}/cli/cli.js#default"` + (drProp.properties.length > 0 ? ',' : '\n  '),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsNEZBQWlFO0FBQ2pFLDhGQUErRDtBQUMvRCx5REFBa0U7QUFDbEUsaUVBQXFHO0FBQ3JHLDBHQUE0RTtBQUM1RSx3REFBd0I7QUFDeEIsb0RBQW9CO0FBQ3BCLDBEQUEwQjtBQUMxQiwyREFBcUM7QUFDckMsc0NBQW1EO0FBQ25ELHlEQUFpRTtBQUdqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFNMUIsS0FBSyxVQUFVLFFBQVEsQ0FBQyxXQUFtQixFQUFFLE9BQWUsRUFBRSxJQUFlO0lBQ2xGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxJQUFBLHNCQUFRLEdBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5RSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFdBQVcsRUFBRSxDQUFDLENBQUM7S0FDeEQ7SUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFFLENBQUM7SUFDakMsTUFBTSxZQUFZLEdBQUcsSUFBQSx3QkFBaUIsRUFBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFdkQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDL0MsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN4RCxNQUFNLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FB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Q0FDbkIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUN0QyxFQUFFLENBQUMsb0JBQW9CLEVBQUUsRUFDekIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNYLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxFQUFDLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBa0IsQ0FBQztnQkFDckUsTUFBTSxHQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQzthQUNyRDtTQUVGO2FBQU07WUFDTCxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsVUFBVSxpRUFBaUUsQ0FBQyxDQUFDO1NBQ2pHO0tBQ0Y7QUFDSCxDQUFDO0FBaEVELDRCQWdFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQgcmVwbGFjZVRleHQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgZ2V0U3RvcmUsIGFjdGlvbkRpc3BhdGNoZXIsIGlzQ3dkV29ya3NwYWNlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCBwYXJzZSwge09iamVjdEFzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfdHNjbWQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbmV4cG9ydCBpbnRlcmZhY2UgQ0JPcHRpb25zIGV4dGVuZHMgR2xvYmFsT3B0aW9ucyB7XG4gIGZvclRlbXBsYXRlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcsIG9wdHM6IENCT3B0aW9ucykge1xuICBjb25zdCB0YXJnZXRQa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIFtwYWNrYWdlTmFtZV0pKTtcblxuICBpZiAodGFyZ2V0UGtncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlICR7cGFja2FnZU5hbWV9YCk7XG4gIH1cbiAgY29uc3QgdGFyZ2V0UGtnID0gdGFyZ2V0UGtnc1swXSE7XG4gIGNvbnN0IHBrZ1RzRGlySW5mbyA9IGdldFRzY0NvbmZpZ09mUGtnKHRhcmdldFBrZy5qc29uKTtcblxuICBjb25zdCBsb3dlckNhc2VDbWROYW1lID0gY21kTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBjbWRGaWxlTmFtZSA9IGxvd2VyQ2FzZUNtZE5hbWUucmVwbGFjZSgvOi9nLCAnLScpO1xuICBjb25zdCBjYW1lbENhc2VDbWQgPSBsb3dlckNhc2VDbWROYW1lLnJlcGxhY2UoL1stOl0oW2EtekEtWl0pL2csIChtYXRjaCwgJDE6IHN0cmluZykgPT4gJDEudG9VcHBlckNhc2UoKSk7XG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIGxvZy53YXJuKCdEcnlydW4gbW9kZS4uLicpO1xuICB9XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jbGlnZW4nKSxcbiAgICBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnJlYWxQYXRoLCBwa2dUc0RpckluZm8uc3JjRGlyKSxcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogWyBbL2Zvb2Jhci9nLCBjbWRGaWxlTmFtZV0gXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIGZvb2JhcjogbG93ZXJDYXNlQ21kTmFtZSxcbiAgICAgICAgZm9vYmFySWQ6IGNhbWVsQ2FzZUNtZCxcbiAgICAgICAgZm9vYmFyRmlsZTogY21kRmlsZU5hbWVcbiAgICAgIH1cbiAgICB9LCB7ZHJ5cnVuOiBvcHRzLmRyeVJ1bn0pO1xuXG4gIGNvbnN0IHBrSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgaWYgKG9wdHMuZHJ5UnVuKSB7XG4gICAgbG9nLmluZm8oY2hhbGsuY3lhbihwa0pzb25GaWxlKSArICcgd2lsbCBiZSBjaGFuZ2VkLicpO1xuICB9IGVsc2Uge1xuICAgIGxldCB0ZXh0ID0gZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3Qgb2JqQXN0ID0gcGFyc2UodGV4dCk7XG4gICAgY29uc3QgcGxpbmtQcm9wID0gb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkclwiJylcbiAgICAgIHx8IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wicGxpbmtcIicpO1xuICAgIGlmIChwbGlua1Byb3ApIHtcbiAgICAgIGNvbnN0IGRyUHJvcCA9IHBsaW5rUHJvcC52YWx1ZSBhcyBPYmplY3RBc3Q7XG4gICAgICBpZiAoZHJQcm9wLnByb3BlcnRpZXMubWFwKGl0ZW0gPT4gaXRlbS5uYW1lLnRleHQpLmluY2x1ZGVzKCdcImNsaVwiJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3BrSnNvbkZpbGV9IGhhcyBhbHJlYWR5IGRlZmluZWQgYSBcImNsaVwiIHByb3BlcnR5IGFzIGV4ZWN1dGFibGUgZW50cnlgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBranNvblRleHQgPSByZXBsYWNlVGV4dCh0ZXh0LCBbe1xuICAgICAgICB0ZXh0OiBgXFxuICAgIFwiY2xpXCI6IFwiJHtwa2dUc0RpckluZm8uZGVzdERpcn0vY2xpL2NsaS5qcyNkZWZhdWx0XCJgICsgKGRyUHJvcC5wcm9wZXJ0aWVzLmxlbmd0aCA+IDAgPyAnLCcgOiAnXFxuICAnKSxcbiAgICAgICAgc3RhcnQ6IGRyUHJvcC5zdGFydCArIDEsXG4gICAgICAgIGVuZDogZHJQcm9wLnN0YXJ0ICsgMVxuICAgICAgfV0pO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhwa0pzb25GaWxlLCBwa2pzb25UZXh0KTtcbiAgICAgIGxvZy5pbmZvKGNoYWxrLmN5YW4ocGtKc29uRmlsZSkgKyAnaXMgY2hhbmdlZC4nKTtcblxuICAgICAgaWYgKGlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcHJvY2Vzcy5jd2QoKSwgaXNGb3JjZTogZmFsc2UsIHBhY2thZ2VKc29uRmlsZXM6IFtwa0pzb25GaWxlXX0pO1xuICAgICAgICBhd2FpdCBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgb3AubWFwKHMgPT4gcy53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSksXG4gICAgICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBvcC5za2lwKDEpLFxuICAgICAgICAgIG9wLnRha2UoMSlcbiAgICAgICAgKS50b1Byb21pc2UoKTtcbiAgICAgICAgY29uc3Qge3RzY30gPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCcpIGFzIHR5cGVvZiBfdHNjbWQ7XG4gICAgICAgIGF3YWl0IHRzYyh7cGFja2FnZTogW3BhY2thZ2VOYW1lXSwgcGF0aHNKc29uczogW119KTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cGtKc29uRmlsZX0gaGFzIG5vIFwiZHJcIiBvciBcInBsaW5rXCIgcHJvcGVydHksIGlzIGl0IGFuIHZhbGlkIFBsaW5rIHBhY2thZ2U/YCk7XG4gICAgfVxuICB9XG59XG4iXX0=