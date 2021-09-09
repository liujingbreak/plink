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
const __plink_1 = __importDefault(require("__plink"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const op = __importStar(require("rxjs/operators"));
function generate(packageName, cmdName, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const targetPkgs = Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), [packageName]));
        if (targetPkgs.length === 0) {
            throw new Error(`Can not find package ${packageName}`);
        }
        const targetPkg = targetPkgs[0];
        const lowerCaseCmdName = cmdName.toLowerCase();
        const camelCaseCmd = lowerCaseCmdName.replace(/-([a-zA-Z])/g, (match, $1) => $1.toUpperCase());
        if (opts.dryRun) {
            __plink_1.default.logger.warn('Dryrun mode...');
        }
        yield (0, template_gen_1.default)(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, 'ts'), {
            fileMapping: [[/foobar/g, lowerCaseCmdName]],
            textMapping: {
                foobar: lowerCaseCmdName,
                foobarId: camelCaseCmd
            }
        }, { dryrun: opts.dryRun });
        const pkJsonFile = path_1.default.resolve(targetPkg.realPath, 'package.json');
        if (opts.dryRun) {
            __plink_1.default.logger.info(chalk_1.default.cyan(pkJsonFile) + ' will be changed.');
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
                __plink_1.default.logger.info(chalk_1.default.cyan(pkJsonFile) + 'is changed.');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLHNGQUErRDtBQUMvRCx5REFBa0U7QUFDbEUsaUVBQXFHO0FBQ3JHLGtHQUE0RTtBQUM1RSxnREFBd0I7QUFDeEIsc0RBQTRCO0FBQzVCLDRDQUFvQjtBQUNwQixrREFBMEI7QUFDMUIsbURBQXFDO0FBU3JDLFNBQXNCLFFBQVEsQ0FBQyxXQUFtQixFQUFFLE9BQWUsRUFBRSxJQUFlOztRQUNsRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsMkJBQW1CLEVBQUMsSUFBQSxzQkFBUSxHQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUUsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLHdCQUF3QixXQUFXLEVBQUUsQ0FBQyxDQUFDO1NBQ3hEO1FBQ0QsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBRSxDQUFDO1FBRWpDLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQy9DLE1BQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN2RyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztTQUNyQztRQUNELE1BQU0sSUFBQSxzQkFBaUIsRUFBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxFQUN0RSxjQUFJ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QVMsRUFBRSxDQUFDO29CQUNkLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQWtCLENBQUM7b0JBQ3JFLE1BQU0sR0FBRyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7aUJBQ3JEO2FBRUY7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLFVBQVUsaUVBQWlFLENBQUMsQ0FBQzthQUNqRztTQUNGO0lBQ0gsQ0FBQztDQUFBO0FBN0RELDRCQTZEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQgcmVwbGFjZVRleHQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZSwgZ2V0U3RvcmUsIGFjdGlvbkRpc3BhdGNoZXIsIGlzQ3dkV29ya3NwYWNlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbmltcG9ydCBwYXJzZSwge09iamVjdEFzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0ICogYXMgX3RzY21kIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY21kJztcblxuZXhwb3J0IGludGVyZmFjZSBDQk9wdGlvbnMgZXh0ZW5kcyBHbG9iYWxPcHRpb25zIHtcbiAgZm9yVGVtcGxhdGU6IGJvb2xlYW47XG4gIGRyeVJ1bjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdlbmVyYXRlKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZywgb3B0czogQ0JPcHRpb25zKSB7XG4gIGNvbnN0IHRhcmdldFBrZ3MgPSBBcnJheS5mcm9tKGZpbmRQYWNrYWdlc0J5TmFtZXMoZ2V0U3RhdGUoKSwgW3BhY2thZ2VOYW1lXSkpO1xuXG4gIGlmICh0YXJnZXRQa2dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgJHtwYWNrYWdlTmFtZX1gKTtcbiAgfVxuICBjb25zdCB0YXJnZXRQa2cgPSB0YXJnZXRQa2dzWzBdITtcblxuICBjb25zdCBsb3dlckNhc2VDbWROYW1lID0gY21kTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBjYW1lbENhc2VDbWQgPSBsb3dlckNhc2VDbWROYW1lLnJlcGxhY2UoLy0oW2EtekEtWl0pL2csIChtYXRjaCwgJDE6IHN0cmluZykgPT4gJDEudG9VcHBlckNhc2UoKSk7XG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIHBsaW5rLmxvZ2dlci53YXJuKCdEcnlydW4gbW9kZS4uLicpO1xuICB9XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jbGlnZW4nKSxcbiAgICBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnJlYWxQYXRoLCAndHMnKSxcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogWyBbL2Zvb2Jhci9nLCBsb3dlckNhc2VDbWROYW1lXSBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgZm9vYmFyOiBsb3dlckNhc2VDbWROYW1lLFxuICAgICAgICBmb29iYXJJZDogY2FtZWxDYXNlQ21kXG4gICAgICB9XG4gICAgfSwge2RyeXJ1bjogb3B0cy5kcnlSdW59KTtcblxuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHRhcmdldFBrZy5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuXG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIHBsaW5rLmxvZ2dlci5pbmZvKGNoYWxrLmN5YW4ocGtKc29uRmlsZSkgKyAnIHdpbGwgYmUgY2hhbmdlZC4nKTtcbiAgfSBlbHNlIHtcbiAgICBsZXQgdGV4dCA9IGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IG9iakFzdCA9IHBhcnNlKHRleHQpO1xuICAgIGNvbnN0IHBsaW5rUHJvcCA9IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZHJcIicpXG4gICAgICB8fCBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcInBsaW5rXCInKTtcbiAgICBpZiAocGxpbmtQcm9wKSB7XG4gICAgICBjb25zdCBkclByb3AgPSBwbGlua1Byb3AudmFsdWUgYXMgT2JqZWN0QXN0O1xuICAgICAgaWYgKGRyUHJvcC5wcm9wZXJ0aWVzLm1hcChpdGVtID0+IGl0ZW0ubmFtZS50ZXh0KS5pbmNsdWRlcygnXCJjbGlcIicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwa0pzb25GaWxlfSBoYXMgYWxyZWFkeSBkZWZpbmVkIGEgXCJjbGlcIiBwcm9wZXJ0eSBhcyBleGVjdXRhYmxlIGVudHJ5YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2pzb25UZXh0ID0gcmVwbGFjZVRleHQodGV4dCwgW3tcbiAgICAgICAgdGV4dDogJ1xcbiAgICBcImNsaVwiOiBcImRpc3QvY2xpL2NsaS5qcyNkZWZhdWx0XCInICsgKGRyUHJvcC5wcm9wZXJ0aWVzLmxlbmd0aCA+IDAgPyAnLCcgOiAnXFxuICAnKSxcbiAgICAgICAgc3RhcnQ6IGRyUHJvcC5zdGFydCArIDEsXG4gICAgICAgIGVuZDogZHJQcm9wLnN0YXJ0ICsgMVxuICAgICAgfV0pO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhwa0pzb25GaWxlLCBwa2pzb25UZXh0KTtcbiAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKGNoYWxrLmN5YW4ocGtKc29uRmlsZSkgKyAnaXMgY2hhbmdlZC4nKTtcblxuICAgICAgaWYgKGlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcHJvY2Vzcy5jd2QoKSwgaXNGb3JjZTogZmFsc2UsIHBhY2thZ2VKc29uRmlsZXM6IFtwa0pzb25GaWxlXX0pO1xuICAgICAgICBhd2FpdCBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgb3AubWFwKHMgPT4gcy53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSksXG4gICAgICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBvcC5za2lwKDEpLFxuICAgICAgICAgIG9wLnRha2UoMSlcbiAgICAgICAgKS50b1Byb21pc2UoKTtcbiAgICAgICAgY29uc3Qge3RzY30gPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCcpIGFzIHR5cGVvZiBfdHNjbWQ7XG4gICAgICAgIGF3YWl0IHRzYyh7cGFja2FnZTogW3BhY2thZ2VOYW1lXSwgcGF0aHNKc29uczogW119KTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cGtKc29uRmlsZX0gaGFzIG5vIFwiZHJcIiBvciBcInBsaW5rXCIgcHJvcGVydHksIGlzIGl0IGFuIHZhbGlkIFBsaW5rIHBhY2thZ2U/YCk7XG4gICAgfVxuICB9XG59XG4iXX0=