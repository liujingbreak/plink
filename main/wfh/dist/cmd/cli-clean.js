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
const cliExt = (program, withGlobalOptions) => {
    const cmd = program.command('upgrade [package...]')
        .description('Hellow command description')
        .option('-f, --file <spec>', 'run single file')
        .action((packages) => __awaiter(void 0, void 0, void 0, function* () {
        yield index_1.initConfigAsync(cmd.opts());
        // TODO
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWNsZWFuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NsaS1jbGVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLG9DQUFzRTtBQUV0RSxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsRUFBRTtJQUMxRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDO1NBQ2xELFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQztTQUN6QyxNQUFNLENBQUMsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUM7U0FDOUMsTUFBTSxDQUFDLENBQU8sUUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sdUJBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDbkQsT0FBTztJQUNULENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgR2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jfSBmcm9tICcuLi9pbmRleCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0sIHdpdGhHbG9iYWxPcHRpb25zKSA9PiB7XG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgndXBncmFkZSBbcGFja2FnZS4uLl0nKVxuICAuZGVzY3JpcHRpb24oJ0hlbGxvdyBjb21tYW5kIGRlc2NyaXB0aW9uJylcbiAgLm9wdGlvbignLWYsIC0tZmlsZSA8c3BlYz4nLCAncnVuIHNpbmdsZSBmaWxlJylcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKGNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgLy8gVE9ET1xuICB9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==