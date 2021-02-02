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
const cli_gcmd_1 = require("./cli-gcmd");
const cliExt = (program) => {
    const cmd = program.command('gcmd <package-name> <command-name>')
        .alias('gen-command')
        .description('Generate a Plink command line implementation in specific package')
        // .option('--for-template <templateName>', 'Create a template generator command', false)
        .option('-d, --dry-run', 'Dryrun', false)
        .action((packageName, cmdName) => __awaiter(void 0, void 0, void 0, function* () {
        yield cli_gcmd_1.generate(packageName, cmdName, cmd.opts());
    }));
    cmd.usage(cmd.usage() + '\ne.g.\n  plink gcmd my-package my-command');
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQ0EseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsa0VBQWtFLENBQUM7UUFDaEYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Q0JPcHRpb25zLCBnZW5lcmF0ZX0gZnJvbSAnLi9jbGktZ2NtZCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY21kIDxwYWNrYWdlLW5hbWU+IDxjb21tYW5kLW5hbWU+JylcbiAgLmFsaWFzKCdnZW4tY29tbWFuZCcpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSBQbGluayBjb21tYW5kIGxpbmUgaW1wbGVtZW50YXRpb24gaW4gc3BlY2lmaWMgcGFja2FnZScpXG4gIC8vIC5vcHRpb24oJy0tZm9yLXRlbXBsYXRlIDx0ZW1wbGF0ZU5hbWU+JywgJ0NyZWF0ZSBhIHRlbXBsYXRlIGdlbmVyYXRvciBjb21tYW5kJywgZmFsc2UpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGdlbmVyYXRlKHBhY2thZ2VOYW1lLCBjbWROYW1lLCBjbWQub3B0cygpIGFzIENCT3B0aW9ucyk7XG4gIH0pO1xuICBjbWQudXNhZ2UoY21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgZ2NtZCBteS1wYWNrYWdlIG15LWNvbW1hbmQnKTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==