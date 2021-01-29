"use strict";
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
const dist_1 = require("@wfh/plink/wfh/dist");
const template_gen_1 = __importDefault(require("@wfh/plink/wfh/dist/template-gen"));
const patch_text_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const path_1 = __importDefault(require("path"));
const __plink_1 = __importDefault(require("__plink"));
const fs_1 = __importDefault(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const cliExt = (program) => {
    const cmd = program.command('gcmd <package> <command-name>')
        .alias('gen-command')
        .description('Generate a Plink command line implementation in specific package')
        // .option('--for-template <templateName>', 'Create a template generator command', false)
        .option('-d, --dry-run', 'Dryrun', false)
        .action((packageName, cmdName) => __awaiter(void 0, void 0, void 0, function* () {
        dist_1.initConfig(cmd.opts());
        dist_1.initProcess();
        generate(packageName, cmdName, cmd.opts());
    }));
};
exports.default = cliExt;
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
                        text: '\n    "cli": "dist/cli.js#default"' + (drProp.properties.length > 0 ? ',' : ''),
                        start: drProp.start + 1,
                        end: drProp.start + 1
                    }]);
                fs_1.default.writeFileSync(pkJsonFile, pkjsonText);
                __plink_1.default.logger.info(chalk_1.default.cyan(pkJsonFile) + 'is changed.');
            }
            else {
                throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOENBQXlGO0FBQ3pGLG9GQUFpRTtBQUNqRSxzRkFBK0Q7QUFDL0QseURBQWtFO0FBQ2xFLGlFQUF5RDtBQUN6RCxrR0FBNEU7QUFDNUUsZ0RBQXdCO0FBQ3hCLHNEQUE0QjtBQUM1Qiw0Q0FBb0I7QUFDcEIsa0RBQTBCO0FBTzFCLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUM7U0FDM0QsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsa0VBQWtFLENBQUM7UUFDaEYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELGlCQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO1FBQ3hDLGtCQUFXLEVBQUUsQ0FBQztRQUNkLFFBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQzFELENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUM7QUFFdEIsU0FBZSxRQUFRLENBQUMsV0FBbUIsRUFBRSxPQUFlLEVBQUUsSUFBZTs7UUFDM0UsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUUsSUFBSSxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLHdC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YUFBYSxDQUFDLENBQUM7YUFDM0Q7aUJBQU07Z0JBQ0wsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLFVBQVUsaUVBQWlFLENBQUMsQ0FBQzthQUNqRztTQUNGO0lBQ0gsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb24sIEdsb2JhbE9wdGlvbnMsIGluaXRDb25maWcsIGluaXRQcm9jZXNzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQgcmVwbGFjZVRleHQgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCB7ZmluZFBhY2thZ2VzQnlOYW1lc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jbWQvdXRpbHMnO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncic7XG5pbXBvcnQgcGFyc2UsIHtPYmplY3RBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5pbnRlcmZhY2UgQ0JPcHRpb25zIGV4dGVuZHMgR2xvYmFsT3B0aW9ucyB7XG4gIGZvclRlbXBsYXRlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG59XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY21kIDxwYWNrYWdlPiA8Y29tbWFuZC1uYW1lPicpXG4gIC5hbGlhcygnZ2VuLWNvbW1hbmQnKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgUGxpbmsgY29tbWFuZCBsaW5lIGltcGxlbWVudGF0aW9uIGluIHNwZWNpZmljIHBhY2thZ2UnKVxuICAvLyAub3B0aW9uKCctLWZvci10ZW1wbGF0ZSA8dGVtcGxhdGVOYW1lPicsICdDcmVhdGUgYSB0ZW1wbGF0ZSBnZW5lcmF0b3IgY29tbWFuZCcsIGZhbHNlKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpbml0Q29uZmlnKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgaW5pdFByb2Nlc3MoKTtcbiAgICBnZW5lcmF0ZShwYWNrYWdlTmFtZSwgY21kTmFtZSwgY21kLm9wdHMoKSBhcyBDQk9wdGlvbnMpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGUocGFja2FnZU5hbWU6IHN0cmluZywgY21kTmFtZTogc3RyaW5nLCBvcHRzOiBDQk9wdGlvbnMpIHtcbiAgY29uc3QgdGFyZ2V0UGtncyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBbcGFja2FnZU5hbWVdKSk7XG4gIGlmICh0YXJnZXRQa2dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgJHtwYWNrYWdlTmFtZX1gKTtcbiAgfVxuICBjb25zdCB0YXJnZXRQa2cgPSB0YXJnZXRQa2dzWzBdITtcblxuICBjb25zdCBsb3dlckNhc2VDbWROYW1lID0gY21kTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBjb25zdCBjYW1lbENhc2VDbWQgPSBsb3dlckNhc2VDbWROYW1lLnJlcGxhY2UoLy0oW2EtekEtWl0pL2csIChtYXRjaCwgJDE6IHN0cmluZykgPT4gJDEudG9VcHBlckNhc2UoKSk7XG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIHBsaW5rLmxvZ2dlci53YXJuKCdEcnlydW4gbW9kZS4uLicpO1xuICB9XG4gIGF3YWl0IGdlbmVyYXRlU3RydWN0dXJlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZS1jbGlnZW4nKSxcbiAgICBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnJlYWxQYXRoLCAndHMnKSxcbiAgICB7XG4gICAgICBmaWxlTWFwcGluZzogWyBbL2Zvb2Jhci9nLCBsb3dlckNhc2VDbWROYW1lXSBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgZm9vYmFyOiBsb3dlckNhc2VDbWROYW1lLFxuICAgICAgICBmb29iYXJJZDogY2FtZWxDYXNlQ21kXG4gICAgICB9XG4gICAgfSwge2RyeXJ1bjogb3B0cy5kcnlSdW59KTtcblxuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHRhcmdldFBrZy5wYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgaWYgKG9wdHMuZHJ5UnVuKSB7XG4gICAgcGxpbmsubG9nZ2VyLmluZm8oY2hhbGsuY3lhbihwa0pzb25GaWxlKSArICcgd2lsbCBiZSBjaGFuZ2VkLicpO1xuICB9IGVsc2Uge1xuICAgIGxldCB0ZXh0ID0gZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3Qgb2JqQXN0ID0gcGFyc2UodGV4dCk7XG4gICAgY29uc3QgcGxpbmtQcm9wID0gb2JqQXN0LnByb3BlcnRpZXMuZmluZChwcm9wID0+IHByb3AubmFtZS50ZXh0ID09PSAnXCJkclwiJylcbiAgICAgIHx8IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wicGxpbmtcIicpO1xuICAgIGlmIChwbGlua1Byb3ApIHtcbiAgICAgIGNvbnN0IGRyUHJvcCA9IHBsaW5rUHJvcC52YWx1ZSBhcyBPYmplY3RBc3Q7XG4gICAgICBpZiAoZHJQcm9wLnByb3BlcnRpZXMubWFwKGl0ZW0gPT4gaXRlbS5uYW1lLnRleHQpLmluY2x1ZGVzKCdcImNsaVwiJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke3BrSnNvbkZpbGV9IGhhcyBhbHJlYWR5IGRlZmluZWQgYSBcImNsaVwiIHByb3BlcnR5IGFzIGV4ZWN1dGFibGUgZW50cnlgKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBranNvblRleHQgPSByZXBsYWNlVGV4dCh0ZXh0LCBbe1xuICAgICAgICB0ZXh0OiAnXFxuICAgIFwiY2xpXCI6IFwiZGlzdC9jbGkuanMjZGVmYXVsdFwiJyArIChkclByb3AucHJvcGVydGllcy5sZW5ndGggPiAwID8gJywnIDogJycpLFxuICAgICAgICBzdGFydDogZHJQcm9wLnN0YXJ0ICsgMSxcbiAgICAgICAgZW5kOiBkclByb3Auc3RhcnQgKyAxXG4gICAgICB9XSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHBrSnNvbkZpbGUsIHBranNvblRleHQpO1xuICAgICAgcGxpbmsubG9nZ2VyLmluZm8oY2hhbGsuY3lhbihwa0pzb25GaWxlKSArICdpcyBjaGFuZ2VkLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7cGtKc29uRmlsZX0gaGFzIG5vIFwiZHJcIiBvciBcInBsaW5rXCIgcHJvcGVydHksIGlzIGl0IGFuIHZhbGlkIFBsaW5rIHBhY2thZ2U/YCk7XG4gICAgfVxuICB9XG59XG4iXX0=