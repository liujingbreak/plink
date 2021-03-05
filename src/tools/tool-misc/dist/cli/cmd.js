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
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
// import {cliPackageArgDesc}
const cli_gcmd_1 = require("./cli-gcmd");
const cliExt = (program) => {
    const cmd = program.command('gcmd <package-name> <command-name>')
        .alias('gen-command')
        .description('Bootstrap a Plink command line implementation in specific package')
        // .option('--for-template <templateName>', 'Create a template generator command', false)
        .option('-d, --dry-run', 'Dryrun', false)
        .action((packageName, cmdName) => __awaiter(void 0, void 0, void 0, function* () {
        yield cli_gcmd_1.generate(packageName, cmdName, cmd.opts());
    }));
    cmd.usage(cmd.usage() + '\ne.g.\n  plink gcmd my-package my-command');
    const settingCmd = program.command('gsetting <package-name...>').alias('gen-setting')
        .option('-d, --dry-run', 'Dryrun', false)
        .description('Bootstrap a package setting file', {
        'package-name': plink_1.cliPackageArgDesc
    })
        .action((packageNames) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-gsetting')))).generateSetting(packageNames, settingCmd.opts());
    }));
    const cfgCmd = program.command('gcfg <file>').alias('gen-config')
        .option('-d, --dry-run', 'Dryrun', false)
        // .option('-t, --type <file-type>', 'Configuation file type, valid types are "ts", "yaml", "json"', 'ts')
        .description('Generate a workspace configuration file (Typescript file), used to override package settings', {
        file: 'Output configuration file path (with or without suffix name ".ts"), e.g. "conf/foobar.prod"'
    })
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-gcfg')))).generateConfig(file, cfgCmd.opts());
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsbUVBQW1FLENBQUM7UUFDakYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxXQUFXLENBQUMsa0NBQWtDLEVBQUU7UUFDL0MsY0FBYyxFQUFFLHlCQUFpQjtLQUNsQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNqRyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO1NBQ2hFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztRQUN6QywwR0FBMEc7U0FDekcsV0FBVyxDQUFDLDhGQUE4RixFQUFFO1FBQzNHLElBQUksRUFBRSw2RkFBNkY7S0FDcEcsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFPLElBQVksRUFBRSxFQUFFO1FBQzdCLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVMLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQge2NsaVBhY2thZ2VBcmdEZXNjfVxuaW1wb3J0IHtDQk9wdGlvbnMsIGdlbmVyYXRlfSBmcm9tICcuL2NsaS1nY21kJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBjbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djbWQgPHBhY2thZ2UtbmFtZT4gPGNvbW1hbmQtbmFtZT4nKVxuICAuYWxpYXMoJ2dlbi1jb21tYW5kJylcbiAgLmRlc2NyaXB0aW9uKCdCb290c3RyYXAgYSBQbGluayBjb21tYW5kIGxpbmUgaW1wbGVtZW50YXRpb24gaW4gc3BlY2lmaWMgcGFja2FnZScpXG4gIC8vIC5vcHRpb24oJy0tZm9yLXRlbXBsYXRlIDx0ZW1wbGF0ZU5hbWU+JywgJ0NyZWF0ZSBhIHRlbXBsYXRlIGdlbmVyYXRvciBjb21tYW5kJywgZmFsc2UpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGdlbmVyYXRlKHBhY2thZ2VOYW1lLCBjbWROYW1lLCBjbWQub3B0cygpIGFzIENCT3B0aW9ucyk7XG4gIH0pO1xuICBjbWQudXNhZ2UoY21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgZ2NtZCBteS1wYWNrYWdlIG15LWNvbW1hbmQnKTtcblxuICBjb25zdCBzZXR0aW5nQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnc2V0dGluZyA8cGFja2FnZS1uYW1lLi4uPicpLmFsaWFzKCdnZW4tc2V0dGluZycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgcGFja2FnZSBzZXR0aW5nIGZpbGUnLCB7XG4gICAgJ3BhY2thZ2UtbmFtZSc6IGNsaVBhY2thZ2VBcmdEZXNjXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nc2V0dGluZycpKS5nZW5lcmF0ZVNldHRpbmcocGFja2FnZU5hbWVzLCBzZXR0aW5nQ21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcblxuICBjb25zdCBjZmdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djZmcgPGZpbGU+JykuYWxpYXMoJ2dlbi1jb25maWcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctdCwgLS10eXBlIDxmaWxlLXR5cGU+JywgJ0NvbmZpZ3VhdGlvbiBmaWxlIHR5cGUsIHZhbGlkIHR5cGVzIGFyZSBcInRzXCIsIFwieWFtbFwiLCBcImpzb25cIicsICd0cycpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlIChUeXBlc2NyaXB0IGZpbGUpLCB1c2VkIHRvIG92ZXJyaWRlIHBhY2thZ2Ugc2V0dGluZ3MnLCB7XG4gICAgZmlsZTogJ091dHB1dCBjb25maWd1cmF0aW9uIGZpbGUgcGF0aCAod2l0aCBvciB3aXRob3V0IHN1ZmZpeCBuYW1lIFwiLnRzXCIpLCBlLmcuIFwiY29uZi9mb29iYXIucHJvZFwiJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChmaWxlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nY2ZnJykpLmdlbmVyYXRlQ29uZmlnKGZpbGUsIGNmZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==