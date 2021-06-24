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
    // program.command('eslint <dir>')
    // .description('Run eslint on ts and tsx files (except .d.ts file)', {dir: 'target source code directory'})
    // .action(async dir => {
    //   await (await import('../eslint')).eslint(dir);
    // });
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
    const genCraCmd = program.command('cra-gen-pkg <path>')
        .description('For create-react-app project, generate a sample package', { path: 'package directory in relative or absolute path' })
        .option('--comp <name>', 'Sample component name', 'sample')
        .option('--feature <name>', 'Sample feature directory and slice name', 'sampleFeature')
        .option('--output <dir-name>', 'This option changes "appBuild" values in config-override.ts,' +
        ' internally create-react-app changes Webpack configure property `output.path` according to this value (' +
        ' you may also use environment variable "BUILD_PATH" for create-react-app version above 4.0.3)')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genPackage(dir, genCraCmd.opts().comp, genCraCmd.opts().feature, genCraCmd.opts().output, genCraCmd.opts().dryRun);
    }));
    const genCraCompCmd = program.command('cra-gen-comp <dir> <componentName...>')
        .description('For create-react-app project, generate sample components', {
        dir: 'directory'
    })
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .option('--conn <Redux-slice-file>', 'Connect component to Redux store via React-redux')
        // .option('--internal-slice,--is', 'Use a lightweiht Redux-toolkit + redux-observable like tool to manage component internal state,' +
        //   ' useful for implementing complex component which might have bigc state and async side effects')
        .action((dir, compNames) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genComponents(dir, compNames, {
            connectedToSlice: genCraCompCmd.opts().conn,
            dryrun: genCraCompCmd.opts().dryRun
        });
    }));
    genCraCompCmd.usage(genCraCompCmd.usage() + '\ne.g.\n  plink cra-gen-comp --conn ../packages/foobar/components Toolbar Layout Profile');
    const genCraSliceCmd = program.command('cra-gen-slice <dir> <sliceName...>')
        .description('For create-react-app project, generate a sample Redux-toolkit Slice file (with Redux-observable epic)', {
        dir: 'directory'
    })
        .option('--internal', 'A Redux Slice for managing individual component internal state, useful for complicated component', false)
        .option('--tiny', 'A RxJS based tiny Slice for managing individual component internal state, useful for complicated component', false)
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, sliceName) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts());
    }));
    // program.command('install-eslint')
    // .description('Install eslint to current project')
    // .action(async () => {
    // });
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLGtDQUFrQztJQUNsQyw0R0FBNEc7SUFDNUcseUJBQXlCO0lBQ3pCLG1EQUFtRDtJQUNuRCxNQUFNO0lBRU4sTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNoRSxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BCLFdBQVcsQ0FBQyxtRUFBbUUsQ0FBQztRQUNqRix5RkFBeUY7U0FDeEYsTUFBTSxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO1NBQ3hDLE1BQU0sQ0FBQyxDQUFPLFdBQW1CLEVBQUUsT0FBZSxFQUFFLEVBQUU7UUFDckQsTUFBTSxtQkFBUSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBZSxDQUFDLENBQUM7SUFDaEUsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxHQUFHLDRDQUE0QyxDQUFDLENBQUM7SUFFdEUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUM7U0FDcEYsTUFBTSxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO1NBQ3hDLFdBQVcsQ0FBQyxrQ0FBa0MsRUFBRTtRQUMvQyxjQUFjLEVBQUUseUJBQWlCO0tBQ2xDLENBQUM7U0FDRCxNQUFNLENBQUMsQ0FBTyxZQUFzQixFQUFFLEVBQUU7UUFDdkMsTUFBTSxDQUFDLHdEQUFhLGdCQUFnQixHQUFDLENBQUMs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RUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxNQUFNLENBQUMsd0RBQWEsZUFBZSxHQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxjQUFjLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUMvRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUwsb0NBQW9DO0lBQ3BDLG9EQUFvRDtJQUNwRCx3QkFBd0I7SUFFeEIsTUFBTTtBQUVSLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQge2NsaVBhY2thZ2VBcmdEZXNjfVxuaW1wb3J0IHtDQk9wdGlvbnMsIGdlbmVyYXRlfSBmcm9tICcuL2NsaS1nY21kJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2VzbGludCA8ZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbignUnVuIGVzbGludCBvbiB0cyBhbmQgdHN4IGZpbGVzIChleGNlcHQgLmQudHMgZmlsZSknLCB7ZGlyOiAndGFyZ2V0IHNvdXJjZSBjb2RlIGRpcmVjdG9yeSd9KVxuICAvLyAuYWN0aW9uKGFzeW5jIGRpciA9PiB7XG4gIC8vICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vZXNsaW50JykpLmVzbGludChkaXIpO1xuICAvLyB9KTtcblxuICBjb25zdCBjbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djbWQgPHBhY2thZ2UtbmFtZT4gPGNvbW1hbmQtbmFtZT4nKVxuICAuYWxpYXMoJ2dlbi1jb21tYW5kJylcbiAgLmRlc2NyaXB0aW9uKCdCb290c3RyYXAgYSBQbGluayBjb21tYW5kIGxpbmUgaW1wbGVtZW50YXRpb24gaW4gc3BlY2lmaWMgcGFja2FnZScpXG4gIC8vIC5vcHRpb24oJy0tZm9yLXRlbXBsYXRlIDx0ZW1wbGF0ZU5hbWU+JywgJ0NyZWF0ZSBhIHRlbXBsYXRlIGdlbmVyYXRvciBjb21tYW5kJywgZmFsc2UpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGdlbmVyYXRlKHBhY2thZ2VOYW1lLCBjbWROYW1lLCBjbWQub3B0cygpIGFzIENCT3B0aW9ucyk7XG4gIH0pO1xuICBjbWQudXNhZ2UoY21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgZ2NtZCBteS1wYWNrYWdlIG15LWNvbW1hbmQnKTtcblxuICBjb25zdCBzZXR0aW5nQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnc2V0dGluZyA8cGFja2FnZS1uYW1lLi4uPicpLmFsaWFzKCdnZW4tc2V0dGluZycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgcGFja2FnZSBzZXR0aW5nIGZpbGUnLCB7XG4gICAgJ3BhY2thZ2UtbmFtZSc6IGNsaVBhY2thZ2VBcmdEZXNjXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nc2V0dGluZycpKS5nZW5lcmF0ZVNldHRpbmcocGFja2FnZU5hbWVzLCBzZXR0aW5nQ21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcblxuICBjb25zdCBjZmdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djZmcgPGZpbGU+JykuYWxpYXMoJ2dlbi1jb25maWcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctdCwgLS10eXBlIDxmaWxlLXR5cGU+JywgJ0NvbmZpZ3VhdGlvbiBmaWxlIHR5cGUsIHZhbGlkIHR5cGVzIGFyZSBcInRzXCIsIFwieWFtbFwiLCBcImpzb25cIicsICd0cycpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlIChUeXBlc2NyaXB0IGZpbGUpLCB1c2VkIHRvIG92ZXJyaWRlIHBhY2thZ2Ugc2V0dGluZ3MnLCB7XG4gICAgZmlsZTogJ091dHB1dCBjb25maWd1cmF0aW9uIGZpbGUgcGF0aCAod2l0aCBvciB3aXRob3V0IHN1ZmZpeCBuYW1lIFwiLnRzXCIpLCBlLmcuIFwiY29uZi9mb29iYXIucHJvZFwiJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChmaWxlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nY2ZnJykpLmdlbmVyYXRlQ29uZmlnKGZpbGUsIGNmZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbiAgY29uc3QgZ2VuQ3JhQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXBrZyA8cGF0aD4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgYSBzYW1wbGUgcGFja2FnZScsIHtwYXRoOiAncGFja2FnZSBkaXJlY3RvcnkgaW4gcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aCd9KVxuICAgIC5vcHRpb24oJy0tY29tcCA8bmFtZT4nLCAnU2FtcGxlIGNvbXBvbmVudCBuYW1lJywgJ3NhbXBsZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxuYW1lPicsICdTYW1wbGUgZmVhdHVyZSBkaXJlY3RvcnkgYW5kIHNsaWNlIG5hbWUnLCAnc2FtcGxlRmVhdHVyZScpXG4gICAgLm9wdGlvbignLS1vdXRwdXQgPGRpci1uYW1lPicsICdUaGlzIG9wdGlvbiBjaGFuZ2VzIFwiYXBwQnVpbGRcIiB2YWx1ZXMgaW4gY29uZmlnLW92ZXJyaWRlLnRzLCcgK1xuICAgICAgJyBpbnRlcm5hbGx5IGNyZWF0ZS1yZWFjdC1hcHAgY2hhbmdlcyBXZWJwYWNrIGNvbmZpZ3VyZSBwcm9wZXJ0eSBgb3V0cHV0LnBhdGhgIGFjY29yZGluZyB0byB0aGlzIHZhbHVlICgnICtcbiAgICAgICcgeW91IG1heSBhbHNvIHVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIkJVSUxEX1BBVEhcIiBmb3IgY3JlYXRlLXJlYWN0LWFwcCB2ZXJzaW9uIGFib3ZlIDQuMC4zKScpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblBhY2thZ2UoZGlyLCBnZW5DcmFDbWQub3B0cygpLmNvbXAsXG4gICAgICAgIGdlbkNyYUNtZC5vcHRzKCkuZmVhdHVyZSwgZ2VuQ3JhQ21kLm9wdHMoKS5vdXRwdXQsIGdlbkNyYUNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgICB9KTtcblxuICBjb25zdCBnZW5DcmFDb21wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLWNvbXAgPGRpcj4gPGNvbXBvbmVudE5hbWUuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIHNhbXBsZSBjb21wb25lbnRzJywge1xuICAgICAgZGlyOiAnZGlyZWN0b3J5J1xuICAgIH0pXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tY29ubiA8UmVkdXgtc2xpY2UtZmlsZT4nLCAnQ29ubmVjdCBjb21wb25lbnQgdG8gUmVkdXggc3RvcmUgdmlhIFJlYWN0LXJlZHV4JylcbiAgICAvLyAub3B0aW9uKCctLWludGVybmFsLXNsaWNlLC0taXMnLCAnVXNlIGEgbGlnaHR3ZWlodCBSZWR1eC10b29sa2l0ICsgcmVkdXgtb2JzZXJ2YWJsZSBsaWtlIHRvb2wgdG8gbWFuYWdlIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwnICtcbiAgICAvLyAgICcgdXNlZnVsIGZvciBpbXBsZW1lbnRpbmcgY29tcGxleCBjb21wb25lbnQgd2hpY2ggbWlnaHQgaGF2ZSBiaWdjIHN0YXRlIGFuZCBhc3luYyBzaWRlIGVmZmVjdHMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlbkNvbXBvbmVudHMoZGlyLCBjb21wTmFtZXMsIHtcbiAgICAgICAgY29ubmVjdGVkVG9TbGljZTogZ2VuQ3JhQ29tcENtZC5vcHRzKCkuY29ubiBhcyBzdHJpbmcsXG4gICAgICAgIGRyeXJ1bjogZ2VuQ3JhQ29tcENtZC5vcHRzKCkuZHJ5UnVuIGFzIGJvb2xlYW5cbiAgICAgIH0pO1xuICAgIH0pO1xuICBnZW5DcmFDb21wQ21kLnVzYWdlKGdlbkNyYUNvbXBDbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBjcmEtZ2VuLWNvbXAgLS1jb25uIC4uL3BhY2thZ2VzL2Zvb2Jhci9jb21wb25lbnRzIFRvb2xiYXIgTGF5b3V0IFByb2ZpbGUnKTtcblxuICBjb25zdCBnZW5DcmFTbGljZUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1zbGljZSA8ZGlyPiA8c2xpY2VOYW1lLi4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBhIHNhbXBsZSBSZWR1eC10b29sa2l0IFNsaWNlIGZpbGUgKHdpdGggUmVkdXgtb2JzZXJ2YWJsZSBlcGljKScsIHtcbiAgICAgIGRpcjogJ2RpcmVjdG9yeSdcbiAgICB9KVxuICAgIC5vcHRpb24oJy0taW50ZXJuYWwnLCAnQSBSZWR1eCBTbGljZSBmb3IgbWFuYWdpbmcgaW5kaXZpZHVhbCBjb21wb25lbnQgaW50ZXJuYWwgc3RhdGUsIHVzZWZ1bCBmb3IgY29tcGxpY2F0ZWQgY29tcG9uZW50JywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10aW55JywgJ0EgUnhKUyBiYXNlZCB0aW55IFNsaWNlIGZvciBtYW5hZ2luZyBpbmRpdmlkdWFsIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwgdXNlZnVsIGZvciBjb21wbGljYXRlZCBjb21wb25lbnQnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIHNsaWNlTmFtZTogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuU2xpY2UoZGlyLCBzbGljZU5hbWUsIGdlbkNyYVNsaWNlQ21kLm9wdHMoKSBhcyBhbnkpO1xuICAgIH0pO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgnaW5zdGFsbC1lc2xpbnQnKVxuICAvLyAuZGVzY3JpcHRpb24oJ0luc3RhbGwgZXNsaW50IHRvIGN1cnJlbnQgcHJvamVjdCcpXG4gIC8vIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuXG4gIC8vIH0pO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=