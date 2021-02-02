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
        const targetPkgs = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), [packageName]));
        if (targetPkgs.length === 0) {
            throw new Error(`Can not find package ${packageName}`);
        }
        const targetPkg = targetPkgs[0];
        const lowerCaseCmdName = cmdName.toLowerCase();
        const camelCaseCmd = lowerCaseCmdName.replace(/-([a-zA-Z])/g, (match, $1) => $1.toUpperCase());
        if (opts.dryRun) {
            __plink_1.default.logger.warn('Dryrun mode...');
        }
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, 'ts'), {
            fileMapping: [[/foobar/g, lowerCaseCmdName]],
            textMapping: {
                foobar: lowerCaseCmdName,
                foobarId: camelCaseCmd
            }
        }, { dryrun: opts.dryRun });
        const pkJsonFile = path_1.default.resolve(targetPkg.path, 'package.json');
        if (opts.dryRun) {
            __plink_1.default.logger.info(chalk_1.default.cyan(pkJsonFile) + ' will be changed.');
        }
        else {
            let text = fs_1.default.readFileSync(pkJsonFile, 'utf8');
            const objAst = json_sync_parser_1.default(text);
            const plinkProp = objAst.properties.find(prop => prop.name.text === '"dr"')
                || objAst.properties.find(prop => prop.name.text === '"plink"');
            if (plinkProp) {
                const drProp = plinkProp.value;
                if (drProp.properties.map(item => item.name.text).includes('"cli"')) {
                    throw new Error(`${pkJsonFile} has already defined a "cli" property as executable entry`);
                }
                const pkjsonText = patch_text_1.default(text, [{
                        text: '\n    "cli": "dist/cli/cli.js#default"' + (drProp.properties.length > 0 ? ',' : '\n  '),
                        start: drProp.start + 1,
                        end: drProp.start + 1
                    }]);
                fs_1.default.writeFileSync(pkJsonFile, pkjsonText);
                __plink_1.default.logger.info(chalk_1.default.cyan(pkJsonFile) + 'is changed.');
                if (package_mgr_1.isCwdWorkspace()) {
                    package_mgr_1.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: false, createHook: false, packageJsonFiles: [pkJsonFile] });
                    yield package_mgr_1.getStore().pipe(op.map(s => s.workspaceUpdateChecksum), op.distinctUntilChanged(), op.skip(1), op.take(1)).toPromise();
                    const { tsc } = require('@wfh/plink/wfh/dist/ts-cmd');
                    tsc({ package: [packageName], pathsJsons: [] });
                }
            }
            else {
                throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
            }
        }
    });
}
exports.generate = generate;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWdjbWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZ2NtZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0ZBQWlFO0FBQ2pFLHNGQUErRDtBQUMvRCx5REFBa0U7QUFDbEUsaUVBQXFHO0FBQ3JHLGtHQUE0RTtBQUM1RSxnREFBd0I7QUFDeEIsc0RBQTRCO0FBQzVCLDRDQUFvQjtBQUNwQixrREFBMEI7QUFDMUIsbURBQXFDO0FBU3JDLFNBQXNCLFFBQVEsQ0FBQyxXQUFtQixFQUFFLE9BQWUsRUFBRSxJQUFlOztRQUNsRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFdBQVcsRUFBRSxDQUFDLENBQUM7U0FDeEQ7UUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFFakMsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDL0MsTUFBTSxZQUFZLEdBQUcsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQ3JDO1FBQ0QsTUFBTSxzQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxFQUN0RSxjQUFJLENBQUMsT0FBTyxDQUFD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QUNkLE1BQU0sRUFBQyxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsNEJBQTRCLENBQWtCLENBQUM7b0JBQ3JFLEdBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUMsQ0FBQyxDQUFDO2lCQUMvQzthQUVGO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxVQUFVLGlFQUFpRSxDQUFDLENBQUM7YUFDakc7U0FDRjtJQUNILENBQUM7Q0FBQTtBQTdERCw0QkE2REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZ2VuZXJhdGVTdHJ1Y3R1cmUgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90ZW1wbGF0ZS1nZW4nO1xuaW1wb3J0IHJlcGxhY2VUZXh0IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kL3V0aWxzJztcbmltcG9ydCB7Z2V0U3RhdGUsIGdldFN0b3JlLCBhY3Rpb25EaXNwYXRjaGVyLCBpc0N3ZFdvcmtzcGFjZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncic7XG5pbXBvcnQgcGFyc2UsIHtPYmplY3RBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCAqIGFzIF90c2NtZCBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNtZCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ0JPcHRpb25zIGV4dGVuZHMgR2xvYmFsT3B0aW9ucyB7XG4gIGZvclRlbXBsYXRlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZW5lcmF0ZShwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcsIG9wdHM6IENCT3B0aW9ucykge1xuICBjb25zdCB0YXJnZXRQa2dzID0gQXJyYXkuZnJvbShmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIFtwYWNrYWdlTmFtZV0pKTtcblxuICBpZiAodGFyZ2V0UGtncy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENhbiBub3QgZmluZCBwYWNrYWdlICR7cGFja2FnZU5hbWV9YCk7XG4gIH1cbiAgY29uc3QgdGFyZ2V0UGtnID0gdGFyZ2V0UGtnc1swXSE7XG5cbiAgY29uc3QgbG93ZXJDYXNlQ21kTmFtZSA9IGNtZE5hbWUudG9Mb3dlckNhc2UoKTtcbiAgY29uc3QgY2FtZWxDYXNlQ21kID0gbG93ZXJDYXNlQ21kTmFtZS5yZXBsYWNlKC8tKFthLXpBLVpdKS9nLCAobWF0Y2gsICQxOiBzdHJpbmcpID0+ICQxLnRvVXBwZXJDYXNlKCkpO1xuICBpZiAob3B0cy5kcnlSdW4pIHtcbiAgICBwbGluay5sb2dnZXIud2FybignRHJ5cnVuIG1vZGUuLi4nKTtcbiAgfVxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY2xpZ2VuJyksXG4gICAgUGF0aC5yZXNvbHZlKHRhcmdldFBrZy5yZWFsUGF0aCwgJ3RzJyksXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFsgWy9mb29iYXIvZywgbG93ZXJDYXNlQ21kTmFtZV0gXSxcbiAgICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICAgIGZvb2JhcjogbG93ZXJDYXNlQ21kTmFtZSxcbiAgICAgICAgZm9vYmFySWQ6IGNhbWVsQ2FzZUNtZFxuICAgICAgfVxuICAgIH0sIHtkcnlydW46IG9wdHMuZHJ5UnVufSk7XG5cbiAgY29uc3QgcGtKc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh0YXJnZXRQa2cucGF0aCwgJ3BhY2thZ2UuanNvbicpO1xuXG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIHBsaW5rLmxvZ2dlci5pbmZvKGNoYWxrLmN5YW4ocGtKc29uRmlsZSkgKyAnIHdpbGwgYmUgY2hhbmdlZC4nKTtcbiAgfSBlbHNlIHtcbiAgICBsZXQgdGV4dCA9IGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IG9iakFzdCA9IHBhcnNlKHRleHQpO1xuICAgIGNvbnN0IHBsaW5rUHJvcCA9IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZHJcIicpXG4gICAgICB8fCBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcInBsaW5rXCInKTtcbiAgICBpZiAocGxpbmtQcm9wKSB7XG4gICAgICBjb25zdCBkclByb3AgPSBwbGlua1Byb3AudmFsdWUgYXMgT2JqZWN0QXN0O1xuICAgICAgaWYgKGRyUHJvcC5wcm9wZXJ0aWVzLm1hcChpdGVtID0+IGl0ZW0ubmFtZS50ZXh0KS5pbmNsdWRlcygnXCJjbGlcIicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwa0pzb25GaWxlfSBoYXMgYWxyZWFkeSBkZWZpbmVkIGEgXCJjbGlcIiBwcm9wZXJ0eSBhcyBleGVjdXRhYmxlIGVudHJ5YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2pzb25UZXh0ID0gcmVwbGFjZVRleHQodGV4dCwgW3tcbiAgICAgICAgdGV4dDogJ1xcbiAgICBcImNsaVwiOiBcImRpc3QvY2xpL2NsaS5qcyNkZWZhdWx0XCInICsgKGRyUHJvcC5wcm9wZXJ0aWVzLmxlbmd0aCA+IDAgPyAnLCcgOiAnXFxuICAnKSxcbiAgICAgICAgc3RhcnQ6IGRyUHJvcC5zdGFydCArIDEsXG4gICAgICAgIGVuZDogZHJQcm9wLnN0YXJ0ICsgMVxuICAgICAgfV0pO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyhwa0pzb25GaWxlLCBwa2pzb25UZXh0KTtcbiAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKGNoYWxrLmN5YW4ocGtKc29uRmlsZSkgKyAnaXMgY2hhbmdlZC4nKTtcblxuICAgICAgaWYgKGlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcHJvY2Vzcy5jd2QoKSwgaXNGb3JjZTogZmFsc2UsIGNyZWF0ZUhvb2s6IGZhbHNlLCBwYWNrYWdlSnNvbkZpbGVzOiBbcGtKc29uRmlsZV19KTtcbiAgICAgICAgYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG9wLm1hcChzID0+IHMud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0pLFxuICAgICAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgb3Auc2tpcCgxKSxcbiAgICAgICAgICBvcC50YWtlKDEpXG4gICAgICAgICkudG9Qcm9taXNlKCk7XG4gICAgICAgIGNvbnN0IHt0c2N9ID0gcmVxdWlyZSgnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jbWQnKSBhcyB0eXBlb2YgX3RzY21kO1xuICAgICAgICB0c2Moe3BhY2thZ2U6IFtwYWNrYWdlTmFtZV0sIHBhdGhzSnNvbnM6IFtdfSk7XG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3BrSnNvbkZpbGV9IGhhcyBubyBcImRyXCIgb3IgXCJwbGlua1wiIHByb3BlcnR5LCBpcyBpdCBhbiB2YWxpZCBQbGluayBwYWNrYWdlP2ApO1xuICAgIH1cbiAgfVxufVxuIl19