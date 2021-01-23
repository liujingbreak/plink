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
Object.defineProperty(exports, "__esModule", { value: true });
const dist_1 = require("@wfh/plink/wfh/dist");
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('jasmine [package...]')
        .description('run jasmine test spec from specific packages')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(cmd.opts());
        // TODO
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiamFzbWluZS1jbGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJqYXNtaW5lLWNsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLDhDQUFpRjtBQUVqRixNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsRUFBRTtJQUMxRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDO1NBQ2xELFdBQVcsQ0FBQyw4Q0FBOEMsQ0FBQztTQUMzRCxNQUFNLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sc0JBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDbkQsT0FBTztJQUNULENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgR2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSwgd2l0aEdsb2JhbE9wdGlvbnMpID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCdqYXNtaW5lIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbigncnVuIGphc21pbmUgdGVzdCBzcGVjIGZyb20gc3BlY2lmaWMgcGFja2FnZXMnKVxuICAub3B0aW9uKCctZiwgLS1maWxlIDxzcGVjPicsICdydW4gc2luZ2xlIGZpbGUnKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCBpbml0Q29uZmlnQXN5bmMoY21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAvLyBUT0RPXG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19