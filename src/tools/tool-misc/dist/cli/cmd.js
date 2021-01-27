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
const __api_1 = __importDefault(require("__api"));
const fs_1 = __importDefault(require("fs"));
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('gen-command-builder <package> <command-name>')
        .description('Generate a Plink command line implementation in specific package')
        .option('--for-template <templateName>', 'Create a template generator command', false)
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
        if (opts.dryRun) {
            __api_1.default.logger.info('Dryrun mode');
        }
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, 'ts'), {
            fileMapping: [[/-foobar$/, lowerCaseCmdName]],
            textMapping: {
                foobar: lowerCaseCmdName
            }
        }, { dryrun: opts.dryRun });
        const pkJsonFile = path_1.default.resolve(targetPkg.path, 'package.json');
        if (opts.dryRun) {
            __api_1.default.logger.info(pkJsonFile + ' will be changed.');
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
                patch_text_1.default(text, [{
                        text: '\n    "cli": "dist/cli.js#default"' + (drProp.properties.length > 0 ? ',' : ''),
                        start: drProp.start + 1,
                        end: drProp.start + 1
                    }]);
            }
            else {
                throw new Error(`${pkJsonFile} has no "dr" or "plink" property, is it an valid Plink package?`);
            }
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOENBQXlGO0FBQ3pGLG9GQUFpRTtBQUNqRSxzRkFBK0Q7QUFDL0QseURBQWtFO0FBQ2xFLGlFQUF5RDtBQUN6RCxrR0FBNEU7QUFDNUUsZ0RBQXdCO0FBQ3hCLGtEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFNcEIsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUU7SUFDMUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4Q0FBOEMsQ0FBQztTQUMxRSxXQUFXLENBQUMsa0VBQWtFLENBQUM7U0FDL0UsTUFBTSxDQUFDLCtCQUErQixFQUFFLHFDQUFxQyxFQUFFLEtBQUssQ0FBQztTQUNyRixNQUFNLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUM7U0FDeEMsTUFBTSxDQUFDLENBQU8sV0FBbUIsRUFBRSxPQUFlLEVBQUUsRUFBRTtRQUNyRCxpQkFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUN4QyxrQkFBVyxFQUFFLENBQUM7UUFDZCxRQUFRLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFlLENBQUMsQ0FBQztJQUMxRCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDO0FBRXRCLFNBQWUsUUFBUSxDQUFDLFdBQW1CLEVBQUUsT0FBZSxFQUFFLElBQWU7O1FBQzNFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlFLElBQUksVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsV0FBVyxFQUFFLENBQUMsQ0FBQztTQUN4RDtRQUNELE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUUsQ0FBQztRQUVqQyxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUMvQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixlQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztTQUNoQztRQUNELE1BQU0sc0JBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsdUJBQXVCLENBQUMsRUFDdEUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUN0QztZQUNFLFdBQVcsRUFBRSxDQUFFLENBQUMsVUFBVSxFQUFFLGdCQUFnQixDQUFDLENBQUU7WUFDL0MsV0FBVyxFQUFFO2dCQUNYLE1BQU0sRUFBRSxnQkFBZ0I7YUFDekI7U0FDRixFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO1FBRTVCLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVoRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7WUFDZixlQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsbUJBQW1CLENBQUMsQ0FBQztTQUNuRDthQUFNO1lBQ0wsSUFBSSxJQUFJLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDL0MsTUFBTSxNQUFNLEdBQUcsMEJBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQzttQkFDdEUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxTQUFTLENBQUMsQ0FBQztZQUNsRSxJQUFJLFNBQVMsRUFBRTtnQkFDYixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBa0IsQ0FBQztnQkFDNUMsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUNuRSxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsVUFBVSwyREFBMkQsQ0FBQyxDQUFDO2lCQUMzRjtnQkFDRCxvQkFBVyxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNqQixJQUFJLEVBQUUsb0NBQW9DLEdBQUcsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO3dCQUN0RixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDO3dCQUN2QixHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDO3FCQUN0QixDQUFDLENBQUMsQ0FBQzthQUNMO2lCQUFNO2dCQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxVQUFVLGlFQUFpRSxDQUFDLENBQUM7YUFDakc7U0FDRjtJQUNILENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnLCBpbml0UHJvY2Vzc30gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdCc7XG5pbXBvcnQgZ2VuZXJhdGVTdHJ1Y3R1cmUgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90ZW1wbGF0ZS1nZW4nO1xuaW1wb3J0IHJlcGxhY2VUZXh0IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kL3V0aWxzJztcbmltcG9ydCB7Z2V0U3RhdGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuaW1wb3J0IHBhcnNlLCB7T2JqZWN0QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbnRlcmZhY2UgQ0JPcHRpb25zIGV4dGVuZHMgR2xvYmFsT3B0aW9ucyB7XG4gIGZvclRlbXBsYXRlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG59XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0sIHdpdGhHbG9iYWxPcHRpb25zKSA9PiB7XG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2VuLWNvbW1hbmQtYnVpbGRlciA8cGFja2FnZT4gPGNvbW1hbmQtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgUGxpbmsgY29tbWFuZCBsaW5lIGltcGxlbWVudGF0aW9uIGluIHNwZWNpZmljIHBhY2thZ2UnKVxuICAub3B0aW9uKCctLWZvci10ZW1wbGF0ZSA8dGVtcGxhdGVOYW1lPicsICdDcmVhdGUgYSB0ZW1wbGF0ZSBnZW5lcmF0b3IgY29tbWFuZCcsIGZhbHNlKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpbml0Q29uZmlnKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgaW5pdFByb2Nlc3MoKTtcbiAgICBnZW5lcmF0ZShwYWNrYWdlTmFtZSwgY21kTmFtZSwgY21kLm9wdHMoKSBhcyBDQk9wdGlvbnMpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGUocGFja2FnZU5hbWU6IHN0cmluZywgY21kTmFtZTogc3RyaW5nLCBvcHRzOiBDQk9wdGlvbnMpIHtcbiAgY29uc3QgdGFyZ2V0UGtncyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBbcGFja2FnZU5hbWVdKSk7XG4gIGlmICh0YXJnZXRQa2dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgJHtwYWNrYWdlTmFtZX1gKTtcbiAgfVxuICBjb25zdCB0YXJnZXRQa2cgPSB0YXJnZXRQa2dzWzBdITtcblxuICBjb25zdCBsb3dlckNhc2VDbWROYW1lID0gY21kTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBpZiAob3B0cy5kcnlSdW4pIHtcbiAgICBhcGkubG9nZ2VyLmluZm8oJ0RyeXJ1biBtb2RlJyk7XG4gIH1cbiAgYXdhaXQgZ2VuZXJhdGVTdHJ1Y3R1cmUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlLWNsaWdlbicpLFxuICAgIFBhdGgucmVzb2x2ZSh0YXJnZXRQa2cucmVhbFBhdGgsICd0cycpLFxuICAgIHtcbiAgICAgIGZpbGVNYXBwaW5nOiBbIFsvLWZvb2JhciQvLCBsb3dlckNhc2VDbWROYW1lXSBdLFxuICAgICAgdGV4dE1hcHBpbmc6IHtcbiAgICAgICAgZm9vYmFyOiBsb3dlckNhc2VDbWROYW1lXG4gICAgICB9XG4gICAgfSwge2RyeXJ1bjogb3B0cy5kcnlSdW59KTtcblxuICBjb25zdCBwa0pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHRhcmdldFBrZy5wYXRoLCAncGFja2FnZS5qc29uJyk7XG5cbiAgaWYgKG9wdHMuZHJ5UnVuKSB7XG4gICAgYXBpLmxvZ2dlci5pbmZvKHBrSnNvbkZpbGUgKyAnIHdpbGwgYmUgY2hhbmdlZC4nKTtcbiAgfSBlbHNlIHtcbiAgICBsZXQgdGV4dCA9IGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IG9iakFzdCA9IHBhcnNlKHRleHQpO1xuICAgIGNvbnN0IHBsaW5rUHJvcCA9IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZHJcIicpXG4gICAgICB8fCBvYmpBc3QucHJvcGVydGllcy5maW5kKHByb3AgPT4gcHJvcC5uYW1lLnRleHQgPT09ICdcInBsaW5rXCInKTtcbiAgICBpZiAocGxpbmtQcm9wKSB7XG4gICAgICBjb25zdCBkclByb3AgPSBwbGlua1Byb3AudmFsdWUgYXMgT2JqZWN0QXN0O1xuICAgICAgaWYgKGRyUHJvcC5wcm9wZXJ0aWVzLm1hcChpdGVtID0+IGl0ZW0ubmFtZS50ZXh0KS5pbmNsdWRlcygnXCJjbGlcIicpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwa0pzb25GaWxlfSBoYXMgYWxyZWFkeSBkZWZpbmVkIGEgXCJjbGlcIiBwcm9wZXJ0eSBhcyBleGVjdXRhYmxlIGVudHJ5YCk7XG4gICAgICB9XG4gICAgICByZXBsYWNlVGV4dCh0ZXh0LCBbe1xuICAgICAgICB0ZXh0OiAnXFxuICAgIFwiY2xpXCI6IFwiZGlzdC9jbGkuanMjZGVmYXVsdFwiJyArIChkclByb3AucHJvcGVydGllcy5sZW5ndGggPiAwID8gJywnIDogJycpLFxuICAgICAgICBzdGFydDogZHJQcm9wLnN0YXJ0ICsgMSxcbiAgICAgICAgZW5kOiBkclByb3Auc3RhcnQgKyAxXG4gICAgICB9XSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgJHtwa0pzb25GaWxlfSBoYXMgbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSwgaXMgaXQgYW4gdmFsaWQgUGxpbmsgcGFja2FnZT9gKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==