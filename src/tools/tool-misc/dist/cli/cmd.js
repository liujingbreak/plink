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
const utils_1 = require("@wfh/plink/wfh/dist/cmd/utils");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const json_sync_parser_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/json-sync-parser"));
const path_1 = __importDefault(require("path"));
const __api_1 = __importDefault(require("__api"));
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('gen-command-builder <package> <command-name>')
        .description('Generate a Plink command line implementation in specific package')
        .option('--for-template <templateName>', 'Create a command for generating template', false)
        .option('-d', 'Dryrun', false)
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
        yield template_gen_1.default(path_1.default.resolve(__dirname, '../../template-cligen'), path_1.default.resolve(targetPkg.realPath, 'ts'), {
            fileMapping: [[/-foobar$/, lowerCaseCmdName]],
            textMapping: {
                foobar: lowerCaseCmdName
            }
        }, { dryrun: opts.dryRun });
        const pkJsonFile = path_1.default.resolve(targetPkg.path, 'package.json');
        const objAst = json_sync_parser_1.default(pkJsonFile);
        const plinkProp = objAst.properties.find(prop => prop.name.text === '"dr"');
        if (plinkProp) {
            __api_1.default.logger.info('found "dr"');
        }
        else {
        }
        if (opts.dryRun) {
            __api_1.default.logger.info(pkJsonFile + ' will be changed.');
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOENBQXlGO0FBQ3pGLG9GQUFpRTtBQUNqRSx5REFBa0U7QUFDbEUsaUVBQXlEO0FBQ3pELGtHQUErRDtBQUMvRCxnREFBd0I7QUFDeEIsa0RBQXdCO0FBT3hCLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxFQUFFO0lBQzFELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsOENBQThDLENBQUM7U0FDMUUsV0FBVyxDQUFDLGtFQUFrRSxDQUFDO1NBQy9FLE1BQU0sQ0FBQywrQkFBK0IsRUFBRSwwQ0FBMEMsRUFBRSxLQUFLLENBQUM7U0FDMUYsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO1NBQzdCLE1BQU0sQ0FBQyxDQUFPLFdBQW1CLEVBQUUsT0FBZSxFQUFFLEVBQUU7UUFDckQsaUJBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDeEMsa0JBQVcsRUFBRSxDQUFDO1FBQ2QsUUFBUSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBZSxDQUFDLENBQUM7SUFDMUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQztBQUV0QixTQUFlLFFBQVEsQ0FBQyxXQUFtQixFQUFFLE9BQWUsRUFBRSxJQUFlOztRQUMzRSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUFtQixDQUFDLHNCQUFRLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RSxJQUFJLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLFdBQVcsRUFBRSxDQUFDLENBQUM7U0FDeEQ7UUFDRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFFLENBQUM7UUFFakMsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDL0MsTUFBTSxzQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSx1QkFBdUIsQ0FBQyxFQUN0RSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQ3RDO1lBQ0UsV0FBVyxFQUFFLENBQUUsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsQ0FBRTtZQUMvQyxXQUFXLEVBQUU7Z0JBQ1gsTUFBTSxFQUFFLGdCQUFnQjthQUN6QjtTQUNGLEVBQUUsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBQyxDQUFDLENBQUM7UUFFNUIsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sTUFBTSxHQUFHLDBCQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDakMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLENBQUMsQ0FBQztRQUM1RSxJQUFJLFNBQVMsRUFBRTtZQUNiLGVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1NBQy9CO2FBQU07U0FFTjtRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNmLGVBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxtQkFBbUIsQ0FBQyxDQUFDO1NBQ25EO0lBQ0gsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb24sIEdsb2JhbE9wdGlvbnMsIGluaXRDb25maWcsIGluaXRQcm9jZXNzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCBnZW5lcmF0ZVN0cnVjdHVyZSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RlbXBsYXRlLWdlbic7XG5pbXBvcnQge2ZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kL3V0aWxzJztcbmltcG9ydCB7Z2V0U3RhdGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuaW1wb3J0IHBhcnNlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuXG5pbnRlcmZhY2UgQ0JPcHRpb25zIGV4dGVuZHMgR2xvYmFsT3B0aW9ucyB7XG4gIGZvclRlbXBsYXRlOiBib29sZWFuO1xuICBkcnlSdW46IGJvb2xlYW47XG59XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0sIHdpdGhHbG9iYWxPcHRpb25zKSA9PiB7XG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2VuLWNvbW1hbmQtYnVpbGRlciA8cGFja2FnZT4gPGNvbW1hbmQtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgUGxpbmsgY29tbWFuZCBsaW5lIGltcGxlbWVudGF0aW9uIGluIHNwZWNpZmljIHBhY2thZ2UnKVxuICAub3B0aW9uKCctLWZvci10ZW1wbGF0ZSA8dGVtcGxhdGVOYW1lPicsICdDcmVhdGUgYSBjb21tYW5kIGZvciBnZW5lcmF0aW5nIHRlbXBsYXRlJywgZmFsc2UpXG4gIC5vcHRpb24oJy1kJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBpbml0Q29uZmlnKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgaW5pdFByb2Nlc3MoKTtcbiAgICBnZW5lcmF0ZShwYWNrYWdlTmFtZSwgY21kTmFtZSwgY21kLm9wdHMoKSBhcyBDQk9wdGlvbnMpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGUocGFja2FnZU5hbWU6IHN0cmluZywgY21kTmFtZTogc3RyaW5nLCBvcHRzOiBDQk9wdGlvbnMpIHtcbiAgY29uc3QgdGFyZ2V0UGtncyA9IEFycmF5LmZyb20oZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBbcGFja2FnZU5hbWVdKSk7XG4gIGlmICh0YXJnZXRQa2dzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ2FuIG5vdCBmaW5kIHBhY2thZ2UgJHtwYWNrYWdlTmFtZX1gKTtcbiAgfVxuICBjb25zdCB0YXJnZXRQa2cgPSB0YXJnZXRQa2dzWzBdITtcblxuICBjb25zdCBsb3dlckNhc2VDbWROYW1lID0gY21kTmFtZS50b0xvd2VyQ2FzZSgpO1xuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGUtY2xpZ2VuJyksXG4gICAgUGF0aC5yZXNvbHZlKHRhcmdldFBrZy5yZWFsUGF0aCwgJ3RzJyksXG4gICAge1xuICAgICAgZmlsZU1hcHBpbmc6IFsgWy8tZm9vYmFyJC8sIGxvd2VyQ2FzZUNtZE5hbWVdIF0sXG4gICAgICB0ZXh0TWFwcGluZzoge1xuICAgICAgICBmb29iYXI6IGxvd2VyQ2FzZUNtZE5hbWVcbiAgICAgIH1cbiAgICB9LCB7ZHJ5cnVuOiBvcHRzLmRyeVJ1bn0pO1xuXG4gIGNvbnN0IHBrSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUodGFyZ2V0UGtnLnBhdGgsICdwYWNrYWdlLmpzb24nKTtcbiAgY29uc3Qgb2JqQXN0ID0gcGFyc2UocGtKc29uRmlsZSk7XG4gIGNvbnN0IHBsaW5rUHJvcCA9IG9iakFzdC5wcm9wZXJ0aWVzLmZpbmQocHJvcCA9PiBwcm9wLm5hbWUudGV4dCA9PT0gJ1wiZHJcIicpO1xuICBpZiAocGxpbmtQcm9wKSB7XG4gICAgYXBpLmxvZ2dlci5pbmZvKCdmb3VuZCBcImRyXCInKTtcbiAgfSBlbHNlIHtcblxuICB9XG4gIGlmIChvcHRzLmRyeVJ1bikge1xuICAgIGFwaS5sb2dnZXIuaW5mbyhwa0pzb25GaWxlICsgJyB3aWxsIGJlIGNoYW5nZWQuJyk7XG4gIH1cbn1cbiJdfQ==