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
const path_1 = __importDefault(require("path"));
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('gen-redux <path>')
        .description('Generate a Redux-toolkt & Redux-observable slice file')
        .option('--tsd', 'Support generating Typescript tsd file', false)
        .option('-d', 'Dryrun', false)
        .action((targetFile) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(cmd.opts());
        yield generateSlice(targetFile, cmd.opts());
    }));
};
exports.default = cliExt;
function generateSlice(filePath, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const basename = /^(.*?)(?:\.[^.])?$/.exec(path_1.default.basename(filePath))[1];
        yield template_gen_1.default(path_1.default.resolve(__dirname, 'template'), filePath, {
            fileMapping: [[/^slice\.ts$/, filePath]],
            textMapping: {
                SliceName: basename.charAt(0).toUpperCase + basename.slice(1),
                sliceName: basename
            }
        }, { dryrun: opts.dryRun });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsOENBQWlGO0FBQ2pGLG9GQUFpRTtBQUNqRSxnREFBd0I7QUFFeEIsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUU7SUFDMUQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztTQUM5QyxXQUFXLENBQUMsdURBQXVELENBQUM7U0FDcEUsTUFBTSxDQUFDLE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxLQUFLLENBQUM7U0FDaEUsTUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO1NBQzdCLE1BQU0sQ0FBQyxDQUFPLFVBQWtCLEVBQUUsRUFBRTtRQUNuQyxNQUFNLHNCQUFlLENBQUMsR0FBRyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNyRCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDO0FBRXRCLFNBQWUsYUFBYSxDQUFDLFFBQWdCLEVBQUUsSUFBcUM7O1FBQ2xGLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFeEUsTUFBTSxzQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsRUFBRSxRQUFRLEVBQUU7WUFDckUsV0FBVyxFQUFFLENBQUUsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUU7WUFDMUMsV0FBVyxFQUFFO2dCQUNYLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDN0QsU0FBUyxFQUFFLFFBQVE7YUFDcEI7U0FDRixFQUFFLEVBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUMsQ0FBQyxDQUFDO0lBQzVCLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBHbG9iYWxPcHRpb25zLCBpbml0Q29uZmlnQXN5bmN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuaW1wb3J0IGdlbmVyYXRlU3RydWN0dXJlIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdGVtcGxhdGUtZ2VuJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtLCB3aXRoR2xvYmFsT3B0aW9ucykgPT4ge1xuICBjb25zdCBjbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2dlbi1yZWR1eCA8cGF0aD4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgUmVkdXgtdG9vbGt0ICYgUmVkdXgtb2JzZXJ2YWJsZSBzbGljZSBmaWxlJylcbiAgLm9wdGlvbignLS10c2QnLCAnU3VwcG9ydCBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgdHNkIGZpbGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLWQnLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHRhcmdldEZpbGU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhjbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIGF3YWl0IGdlbmVyYXRlU2xpY2UodGFyZ2V0RmlsZSwgY21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcblxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVTbGljZShmaWxlUGF0aDogc3RyaW5nLCBvcHRzOiB7dHNkOiBib29sZWFuLCBkcnlSdW46IGJvb2xlYW59KSB7XG4gIGNvbnN0IGJhc2VuYW1lID0gL14oLio/KSg/OlxcLlteLl0pPyQvLmV4ZWMoUGF0aC5iYXNlbmFtZShmaWxlUGF0aCkpIVsxXTtcblxuICBhd2FpdCBnZW5lcmF0ZVN0cnVjdHVyZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndGVtcGxhdGUnKSwgZmlsZVBhdGgsIHtcbiAgICBmaWxlTWFwcGluZzogWyBbL15zbGljZVxcLnRzJC8sIGZpbGVQYXRoXSBdLFxuICAgIHRleHRNYXBwaW5nOiB7XG4gICAgICBTbGljZU5hbWU6IGJhc2VuYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSArIGJhc2VuYW1lLnNsaWNlKDEpLFxuICAgICAgc2xpY2VOYW1lOiBiYXNlbmFtZVxuICAgIH1cbiAgfSwge2RyeXJ1bjogb3B0cy5kcnlSdW59KTtcbn1cbiJdfQ==