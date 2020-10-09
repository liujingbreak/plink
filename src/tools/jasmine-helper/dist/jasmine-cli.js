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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL2phc21pbmUtaGVscGVyL3RzL2phc21pbmUtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsOENBQWlGO0FBRWpGLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxFQUFFO0lBQzFELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUM7U0FDbEQsV0FBVyxDQUFDLDhDQUE4QyxDQUFDO1NBQzNELE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQztTQUM5QyxNQUFNLENBQUMsQ0FBTyxRQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxzQkFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUNuRCxPQUFPO0lBQ1QsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsImZpbGUiOiJ0b29scy9qYXNtaW5lLWhlbHBlci9kaXN0L2phc21pbmUtY2xpLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
