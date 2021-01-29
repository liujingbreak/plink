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
const index_1 = require("../index");
const cliExt = (program) => {
    const cmd = program.command('upgrade [package...]')
        .description('Hellow command description')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        yield index_1.initConfigAsync(cmd.opts());
        // TODO
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNsZWFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1jbGVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLG9DQUFzRTtBQUV0RSxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUN2QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDO1NBQ2xELFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQztTQUN6QyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sdUJBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDbkQsT0FBTztJQUNULENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgR2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jfSBmcm9tICcuLi9pbmRleCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCd1cGdyYWRlIFtwYWNrYWdlLi4uXScpXG4gIC5kZXNjcmlwdGlvbignSGVsbG93IGNvbW1hbmQgZGVzY3JpcHRpb24nKVxuICAub3B0aW9uKCctZiwgLS1maWxlIDxzcGVjPicsICdydW4gc2luZ2xlIGZpbGUnKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlczogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCBpbml0Q29uZmlnQXN5bmMoY21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAvLyBUT0RPXG4gIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19