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
    const genCraCmd = program.command('cra-gen-pkg <path>')
        .description('For create-react-app project, generate a sample package')
        .option('--comp <name>', 'Sample component name', 'sample')
        .option('--feature <name>', 'Sample feature directory and slice name', 'sampleFeature')
        .option('--app-build-dir,--output <dir-name>', 'This option changes "publicUrlOrPath" and "appBuild" values in config-override.ts,' +
        ' this has same effect of setting environment variable `PUBLIC_URL` and Webpack configure property `output.path`')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genPackage(dir, genCraCmd.opts().comp, genCraCmd.opts().feature, genCraCmd.opts().output, genCraCmd.opts().dryRun);
    }));
    const genCraCompCmd = program.command('cra-gen-comp <dir> <componentName...>')
        .description('For create-react-app project, generate sample components')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .option('--conn <Redux-slice-file>', 'Connect component to Redux store via React-redux')
        .action((dir, compNames) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genComponents(dir, compNames, genCraCompCmd.opts().conn, genCraCompCmd.opts().dryRun);
    }));
    genCraCompCmd.usage(genCraCompCmd.usage() + '\ne.g.\n  plink cra-gen-comp --conn ../packages/foobar/components Toolbar Layout Profile');
    const genCraSliceCmd = program.command('cra-gen-slice <dir> <sliceName...>')
        .description('For create-react-app project, generate a sample Redux-toolkit Slice file (with Redux-observable epic)')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, sliceName) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts().dryRun);
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsbUVBQW1FLENBQUM7UUFDakYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxXQUFXLENBQUMsa0NBQWtDLEVBQUU7UUFDL0MsY0FBYyxFQUFFLHlCQUFpQjtLQUNsQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNqRyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO1NBQ2hFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztRQUN6QywwR0FBMEc7U0FDekcsV0FBVyxDQUFDLDhGQUE4RixFQUFFO1FBQzNHLElBQUksRUFBRSw2RkFBNkY7S0FDcEcsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFPLElBQVksRUFBRSxFQUFFO1FBQzdCLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7U0FDcEQsV0FBVyxDQUFDLHlEQUF5RCxDQUFDO1NBQ3RFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxDQUFDO1NBQzFELE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSx5Q0FBeUMsRUFBRSxlQUFlLENBQUM7U0FDdEYsTUFBTSxDQUFDLHFDQUFxQyxFQUFFLG9GQUFvRjtRQUNqSSxpSEFBaUgsQ0FBQztTQUNuSCxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsRUFBRTtRQUM1QixDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUNuRSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2hGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO1NBQzNFLFdBQVcsQ0FBQywwREFBMEQsQ0FBQztTQUN2RSxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsMkJBQTJCLEVBQUUsa0RBQWtELENBQUM7U0FDdkYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEgsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLGFBQWEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssRUFBRSxHQUFHLDBGQUEwRixDQUFDLENBQUM7SUFFeEksTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUN6RSxXQUFXLENBQUMsdUdBQXVHLENBQUM7U0FDcEgsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pGLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFUCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgY2xpUGFja2FnZUFyZ0Rlc2N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHtjbGlQYWNrYWdlQXJnRGVzY31cbmltcG9ydCB7Q0JPcHRpb25zLCBnZW5lcmF0ZX0gZnJvbSAnLi9jbGktZ2NtZCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY21kIDxwYWNrYWdlLW5hbWU+IDxjb21tYW5kLW5hbWU+JylcbiAgLmFsaWFzKCdnZW4tY29tbWFuZCcpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgUGxpbmsgY29tbWFuZCBsaW5lIGltcGxlbWVudGF0aW9uIGluIHNwZWNpZmljIHBhY2thZ2UnKVxuICAvLyAub3B0aW9uKCctLWZvci10ZW1wbGF0ZSA8dGVtcGxhdGVOYW1lPicsICdDcmVhdGUgYSB0ZW1wbGF0ZSBnZW5lcmF0b3IgY29tbWFuZCcsIGZhbHNlKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCBnZW5lcmF0ZShwYWNrYWdlTmFtZSwgY21kTmFtZSwgY21kLm9wdHMoKSBhcyBDQk9wdGlvbnMpO1xuICB9KTtcbiAgY21kLnVzYWdlKGNtZC51c2FnZSgpICsgJ1xcbmUuZy5cXG4gIHBsaW5rIGdjbWQgbXktcGFja2FnZSBteS1jb21tYW5kJyk7XG5cbiAgY29uc3Qgc2V0dGluZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgnZ3NldHRpbmcgPHBhY2thZ2UtbmFtZS4uLj4nKS5hbGlhcygnZ2VuLXNldHRpbmcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuZGVzY3JpcHRpb24oJ0Jvb3RzdHJhcCBhIHBhY2thZ2Ugc2V0dGluZyBmaWxlJywge1xuICAgICdwYWNrYWdlLW5hbWUnOiBjbGlQYWNrYWdlQXJnRGVzY1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktZ3NldHRpbmcnKSkuZ2VuZXJhdGVTZXR0aW5nKHBhY2thZ2VOYW1lcywgc2V0dGluZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbiAgY29uc3QgY2ZnQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY2ZnIDxmaWxlPicpLmFsaWFzKCdnZW4tY29uZmlnJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLXQsIC0tdHlwZSA8ZmlsZS10eXBlPicsICdDb25maWd1YXRpb24gZmlsZSB0eXBlLCB2YWxpZCB0eXBlcyBhcmUgXCJ0c1wiLCBcInlhbWxcIiwgXCJqc29uXCInLCAndHMnKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24gZmlsZSAoVHlwZXNjcmlwdCBmaWxlKSwgdXNlZCB0byBvdmVycmlkZSBwYWNrYWdlIHNldHRpbmdzJywge1xuICAgIGZpbGU6ICdPdXRwdXQgY29uZmlndXJhdGlvbiBmaWxlIHBhdGggKHdpdGggb3Igd2l0aG91dCBzdWZmaXggbmFtZSBcIi50c1wiKSwgZS5nLiBcImNvbmYvZm9vYmFyLnByb2RcIidcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAoZmlsZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2NmZycpKS5nZW5lcmF0ZUNvbmZpZyhmaWxlLCBjZmdDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuXG4gIGNvbnN0IGdlbkNyYUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1wa2cgPHBhdGg+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIGEgc2FtcGxlIHBhY2thZ2UnKVxuICAgIC5vcHRpb24oJy0tY29tcCA8bmFtZT4nLCAnU2FtcGxlIGNvbXBvbmVudCBuYW1lJywgJ3NhbXBsZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxuYW1lPicsICdTYW1wbGUgZmVhdHVyZSBkaXJlY3RvcnkgYW5kIHNsaWNlIG5hbWUnLCAnc2FtcGxlRmVhdHVyZScpXG4gICAgLm9wdGlvbignLS1hcHAtYnVpbGQtZGlyLC0tb3V0cHV0IDxkaXItbmFtZT4nLCAnVGhpcyBvcHRpb24gY2hhbmdlcyBcInB1YmxpY1VybE9yUGF0aFwiIGFuZCBcImFwcEJ1aWxkXCIgdmFsdWVzIGluIGNvbmZpZy1vdmVycmlkZS50cywnICtcbiAgICAgICcgdGhpcyBoYXMgc2FtZSBlZmZlY3Qgb2Ygc2V0dGluZyBlbnZpcm9ubWVudCB2YXJpYWJsZSBgUFVCTElDX1VSTGAgYW5kIFdlYnBhY2sgY29uZmlndXJlIHByb3BlcnR5IGBvdXRwdXQucGF0aGAnKVxuICAgIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktY3JhLWdlbicpKS5nZW5QYWNrYWdlKGRpciwgZ2VuQ3JhQ21kLm9wdHMoKS5jb21wLFxuICAgICAgICBnZW5DcmFDbWQub3B0cygpLmZlYXR1cmUsIGdlbkNyYUNtZC5vcHRzKCkub3V0cHV0LCBnZW5DcmFDbWQub3B0cygpLmRyeVJ1bik7XG4gICAgfSk7XG5cbiAgY29uc3QgZ2VuQ3JhQ29tcENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1jb21wIDxkaXI+IDxjb21wb25lbnROYW1lLi4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBzYW1wbGUgY29tcG9uZW50cycpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tY29ubiA8UmVkdXgtc2xpY2UtZmlsZT4nLCAnQ29ubmVjdCBjb21wb25lbnQgdG8gUmVkdXggc3RvcmUgdmlhIFJlYWN0LXJlZHV4JylcbiAgICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgY29tcE5hbWVzOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktY3JhLWdlbicpKS5nZW5Db21wb25lbnRzKGRpciwgY29tcE5hbWVzLCBnZW5DcmFDb21wQ21kLm9wdHMoKS5jb25uLCBnZW5DcmFDb21wQ21kLm9wdHMoKS5kcnlSdW4pO1xuICAgIH0pO1xuICBnZW5DcmFDb21wQ21kLnVzYWdlKGdlbkNyYUNvbXBDbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBjcmEtZ2VuLWNvbXAgLS1jb25uIC4uL3BhY2thZ2VzL2Zvb2Jhci9jb21wb25lbnRzIFRvb2xiYXIgTGF5b3V0IFByb2ZpbGUnKTtcblxuICBjb25zdCBnZW5DcmFTbGljZUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1zbGljZSA8ZGlyPiA8c2xpY2VOYW1lLi4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBhIHNhbXBsZSBSZWR1eC10b29sa2l0IFNsaWNlIGZpbGUgKHdpdGggUmVkdXgtb2JzZXJ2YWJsZSBlcGljKScpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBzbGljZU5hbWU6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblNsaWNlKGRpciwgc2xpY2VOYW1lLCBnZW5DcmFTbGljZUNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgICB9KTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19