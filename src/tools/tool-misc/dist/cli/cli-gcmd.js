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
function generate(packageName, cmdName, opts) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, pkgTsDirInfo.srcDir), {
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
                    yield (0, package_mgr_1.getStore)().pipe(op.map(s => s.workspaceUpdateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1)).toPromise();
                    const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
                    yield tsc({ package: [packageName], pathsJsons: [] });
                }
            }
            else {
                throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
            }
        }
    });
}
exports.generate = generate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLHNGQUErRDtBQUMvRCx5REFBa0U7QUFDbEUsaUVBQXFHO0FBQ3JHLGtHQUE0RTtBQUM1RSxnREFBd0I7QUFDeEIsNENBQW9CO0FBQ3BCLGtEQUEwQjtBQUMxQixtREFBcUM7QUFDckMsc0NBQW1EO0FBQ25ELHlEQUFpRTtBQUdqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFNakMsU0FBc0IsUUFBUSxDQUFDLFdBQW1CLEVBQUUsT0FBZSxFQUFFLElBQWU7O1FBQ2xGLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBQSwyQkFBbUIsRUFBQyxJQUFBLHNCQUFRLEdBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFdBQVcsRUFBRSxDQUFDLENBQUM7U0FDeEQ7UUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFDakMsTUFBTSxZQUFZLEdBQUcsSUFBQSx3QkFBaUIsRUFBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdkQsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDL0MsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4RCxNQUFNLFlBQVksR0FBRyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxF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LEdBQUUsQ0FBQyxJQUFJLENBQ25CLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsRUFDdEMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDWCxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNkLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQWtCLENBQUM7b0JBQ3JFLE1BQU0sR0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7aUJBQ3JEO2FBRUY7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLFVBQVUsaUVBQWlFLENBQUMsQ0FBQzthQUNqRztTQUNGO0lBQ0gsQ0FBQztDQUFBO0FBaEVELDRCQWdFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQgcmVwbGFjZVRleHQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgZ2V0U3RvcmUsIGFjdGlvbkRpc3BhdGNoZXIsIGlzQ3dkV29ya3NwYWNlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCBwYXJzZSwge09iamVjdEFzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfdHNjbWQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbmV4cG9ydCBpbnRlcmZhY2UgQ0JPcHRpb25zIGV4dGVuZHMgR2xvYmFsT3B0aW9ucyB7XG4gIGZvclRlbXBsYXRlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcsIG9wdHM6IENCT3B0aW9ucykge1xuICBjb25zdCB0YXJnZXRQa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIFtwYWNrYWdlTmFtZV0pKTtcblxuICBpZiAodGFyZ2V0UGtncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlICR7cGFja2FnZU5hbWV9YCk7XG4gIH1cbiAgY29uc3QgdGFyZ2V0UGtnID0gdGFyZ2V0UGtnc1swXSE7XG4gIGNvbnN0IHBrZ1RzRGlySW5mbyA9IGdldFRzY0NvbmZpZ09mUGtnKHRhcmdldFBrZy5qc29uKTtcblxuICBjb25zdCBsb3dlckNhc2VDbWROYW1lID0gY21kTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBjbWRGaWxlTmFtZSA9IGxvd2VyQ2FzZUNtZE5hbWUucmVwbGFjZSgvOi9nLCAnLScpO1xuICBjb25zdCBjYW1lbENhc2VDbWQgPSBsb3dlckNhc2VDbWROYW1lLnJlcGxhY2UoL1stOl0oW2EtekEtWl0pL2csIChtYXRjaCwgJDE6IHN0cmluZykgPT4gJDEudG9VcHBlckNhc2UoKSk7XG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIGxvZy53YXJuKCdEcnlydW4gbW9kZS4uLicpO1xuICB9XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jbGlnZW4nKSxcbiAgICBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnJlYWxQYXRoLCBwa2dUc0RpckluZm8uc3JjRGlyKSxcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogWyBbL2Zvb2Jhci9nLCBjbWRGaWxlTmFtZV0gXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIGZvb2JhcjogbG93ZXJDYXNlQ21kTmFtZSxcbiAgICAgICAgZm9vYmFySWQ6IGNhbWVsQ2FzZUNtZCxcbiAgICAgICAgZm9vYmFyRmlsZTogY21kRmlsZU5hbWVcbiAgICAgIH1cbiAgICB9LCB7ZHJ5cnVuOiBvcHRzLmRyeVJ1bn0pO1xuXG4gIGNvbnN0IHBrSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgaWYgKG9wdHMuZHJ5UnVuKSB7XG4gICAgbG9nLmluZm8oY2hhbGsuY3lhbihwa0pzb25GaWxlKSArICcgd2lsbCBiZSBjaGFuZ2VkLicpO1xuICB9IGVsc2Uge1xuICAgIGxldCB0ZXh0ID0gZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3Qgb2JqQXN0ID0gcGFyc2UodGV4dCk7XG4gICAgY29uc3QgcGxpbmtQcm9wID0gb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkclwiJylcbiAgICAgIHx8IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wicGxpbmtcIicpO1xuICAgIGlmIChwbGlua1Byb3ApIHtcbiAgICAgIGNvbnN0IGRyUHJvcCA9IHBsaW5rUHJvcC52YWx1ZSBhcyBPYmplY3RBc3Q7XG4gICAgICBpZiAoZHJQcm9wLnByb3BlcnRpZXMubWFwKGl0ZW0gPT4gaXRlbS5uYW1lLnRleHQpLmluY2x1ZGVzKCdcImNsaVwiJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3BrSnNvbkZpbGV9IGhhcyBhbHJlYWR5IGRlZmluZWQgYSBcImNsaVwiIHByb3BlcnR5IGFzIGV4ZWN1dGFibGUgZW50cnlgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBranNvblRleHQgPSByZXBsYWNlVGV4dCh0ZXh0LCBbe1xuICAgICAgICB0ZXh0OiAnXFxuICAgIFwiY2xpXCI6IFwiZGlzdC9jbGkvY2xpLmpzI2RlZmF1bHRcIicgKyAoZHJQcm9wLnByb3BlcnRpZXMubGVuZ3RoID4gMCA/ICcsJyA6ICdcXG4gICcpLFxuICAgICAgICBzdGFydDogZHJQcm9wLnN0YXJ0ICsgMSxcbiAgICAgICAgZW5kOiBkclByb3Auc3RhcnQgKyAxXG4gICAgICB9XSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHBrSnNvbkZpbGUsIHBranNvblRleHQpO1xuICAgICAgbG9nLmluZm8oY2hhbGsuY3lhbihwa0pzb25GaWxlKSArICdpcyBjaGFuZ2VkLicpO1xuXG4gICAgICBpZiAoaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwcm9jZXNzLmN3ZCgpLCBpc0ZvcmNlOiBmYWxzZSwgcGFja2FnZUpzb25GaWxlczogW3BrSnNvbkZpbGVdfSk7XG4gICAgICAgIGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBvcC5tYXAocyA9PiBzLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtKSxcbiAgICAgICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIG9wLnNraXAoMSksXG4gICAgICAgICAgb3AudGFrZSgxKVxuICAgICAgICApLnRvUHJvbWlzZSgpO1xuICAgICAgICBjb25zdCB7dHNjfSA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJykgYXMgdHlwZW9mIF90c2NtZDtcbiAgICAgICAgYXdhaXQgdHNjKHtwYWNrYWdlOiBbcGFja2FnZU5hbWVdLCBwYXRoc0pzb25zOiBbXX0pO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwa0pzb25GaWxlfSBoYXMgbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSwgaXMgaXQgYW4gdmFsaWQgUGxpbmsgcGFja2FnZT9gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==