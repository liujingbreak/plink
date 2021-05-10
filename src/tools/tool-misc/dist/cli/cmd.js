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
        .option('--output <dir-name>', 'This option changes "appBuild" values in config-override.ts,' +
        ' internally create-react-app changes Webpack configure property `output.path` according to this value (' +
        ' you may also use environment variable "BUILD_PATH" for create-react-app version above 4.0.3)')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genPackage(dir, genCraCmd.opts().comp, genCraCmd.opts().feature, genCraCmd.opts().output, genCraCmd.opts().dryRun);
    }));
    const genCraCompCmd = program.command('cra-gen-comp <dir> <componentName...>')
        .description('For create-react-app project, generate sample components')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .option('--conn <Redux-slice-file>', 'Connect component to Redux store via React-redux')
        .option('--internal-slice,--is', 'Use a lightweiht Redux-toolkit + redux-observable like tool to manage component internal state,' +
        ' useful for implementing complex component which might have bigc state and async side effects')
        .action((dir, compNames) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genComponents(dir, compNames, {
            connectedToSlice: genCraCompCmd.opts().conn,
            dryrun: genCraCompCmd.opts().dryRun,
            useInternalSlice: genCraCompCmd.opts().is
        });
    }));
    genCraCompCmd.usage(genCraCompCmd.usage() + '\ne.g.\n  plink cra-gen-comp --conn ../packages/foobar/components Toolbar Layout Profile');
    const genCraSliceCmd = program.command('cra-gen-slice <dir> <sliceName...>')
        .description('For create-react-app project, generate a sample Redux-toolkit Slice file (with Redux-observable epic)')
        .option('--internal', 'A Redux Slice for managing individual component internal state, useful for complicated component', false)
        .option('--tiny', 'A RxJS based tiny Slice for managing individual component internal state, useful for complicated component', false)
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, sliceName) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts());
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsbUVBQW1FLENBQUM7UUFDakYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxXQUFXLENBQUMsa0NBQWtDLEVBQUU7UUFDL0MsY0FBYyxFQUFFLHlCQUFpQjtLQUNsQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNqRyxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDO1NBQ2hFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztRQUN6QywwR0FBMEc7U0FDekcsV0FBVyxDQUFDLDhGQUE4RixFQUFFO1FBQzNHLElBQUksRUFBRSw2RkFBNkY7S0FDcEcsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFPLElBQVksRUFBRSxFQUFFO1FBQzdCLE1BQU0sQ0FBQyx3REFBYSxZQUFZLEdBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7SUFDaEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7U0FDcEQsV0FBVyxDQUFDLHlEQUF5RCxDQUFDO1NBQ3RFLE1BQU0sQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxDQUFDO1NBQzFELE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSx5Q0FBeUMsRUFBRSxlQUFlLENBQUM7U0FDdEYsTUFBTSxDQUFDLHFCQUFxQixFQUFFLDhEQUE4RDtRQUMzRix5R0FBeUc7UUFDekcsK0ZBQStGLENBQUM7U0FDakcsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLEVBQUU7UUFDNUIsQ0FBQyx3REFBYSxlQUFlLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFDbkUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNoRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUwsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUMzRSxXQUFXLENBQUMsMERBQTBELENBQUM7U0FDdkUsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLDJCQUEyQixFQUFFLGtEQUFrRCxDQUFDO1NBQ3ZGLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxpR0FBaUc7UUFDaEksK0ZBQStGLENBQUM7U0FDakcsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxDQUFDLHdEQUFhLGVBQWUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUU7WUFDNUQsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUk7WUFDM0MsTUFBTSxFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNO1lBQ25DLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFO1NBQzFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxhQUFhLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsR0FBRywwRkFBMEYsQ0FBQyxDQUFDO0lBRXhJLE1BQU0sY0FBYyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDekUsV0FBVyxDQUFDLHVHQUF1RyxDQUFDO1NBQ3BILE1BQU0sQ0FBQyxZQUFZLEVBQUUsa0dBQWtHLEVBQUUsS0FBSyxDQUFDO1NBQy9ILE1BQU0sQ0FBQyxRQUFRLEVBQUUsNEdBQTRHLEVBQUUsS0FBSyxDQUFDO1NBQ3JJLE1BQU0sQ0FBQyxlQUFlLEVBQUUsaURBQWlELEVBQUUsS0FBSyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxTQUFtQixFQUFFLEVBQUU7UUFDakQsQ0FBQyx3REFBYSxlQUFlLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQVMsQ0FBQyxDQUFDO0lBQ3pGLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFFUCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgY2xpUGFja2FnZUFyZ0Rlc2N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHtjbGlQYWNrYWdlQXJnRGVzY31cbmltcG9ydCB7Q0JPcHRpb25zLCBnZW5lcmF0ZX0gZnJvbSAnLi9jbGktZ2NtZCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY21kIDxwYWNrYWdlLW5hbWU+IDxjb21tYW5kLW5hbWU+JylcbiAgLmFsaWFzKCdnZW4tY29tbWFuZCcpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgUGxpbmsgY29tbWFuZCBsaW5lIGltcGxlbWVudGF0aW9uIGluIHNwZWNpZmljIHBhY2thZ2UnKVxuICAvLyAub3B0aW9uKCctLWZvci10ZW1wbGF0ZSA8dGVtcGxhdGVOYW1lPicsICdDcmVhdGUgYSB0ZW1wbGF0ZSBnZW5lcmF0b3IgY29tbWFuZCcsIGZhbHNlKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCBnZW5lcmF0ZShwYWNrYWdlTmFtZSwgY21kTmFtZSwgY21kLm9wdHMoKSBhcyBDQk9wdGlvbnMpO1xuICB9KTtcbiAgY21kLnVzYWdlKGNtZC51c2FnZSgpICsgJ1xcbmUuZy5cXG4gIHBsaW5rIGdjbWQgbXktcGFja2FnZSBteS1jb21tYW5kJyk7XG5cbiAgY29uc3Qgc2V0dGluZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgnZ3NldHRpbmcgPHBhY2thZ2UtbmFtZS4uLj4nKS5hbGlhcygnZ2VuLXNldHRpbmcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuZGVzY3JpcHRpb24oJ0Jvb3RzdHJhcCBhIHBhY2thZ2Ugc2V0dGluZyBmaWxlJywge1xuICAgICdwYWNrYWdlLW5hbWUnOiBjbGlQYWNrYWdlQXJnRGVzY1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktZ3NldHRpbmcnKSkuZ2VuZXJhdGVTZXR0aW5nKHBhY2thZ2VOYW1lcywgc2V0dGluZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbiAgY29uc3QgY2ZnQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY2ZnIDxmaWxlPicpLmFsaWFzKCdnZW4tY29uZmlnJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLXQsIC0tdHlwZSA8ZmlsZS10eXBlPicsICdDb25maWd1YXRpb24gZmlsZSB0eXBlLCB2YWxpZCB0eXBlcyBhcmUgXCJ0c1wiLCBcInlhbWxcIiwgXCJqc29uXCInLCAndHMnKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24gZmlsZSAoVHlwZXNjcmlwdCBmaWxlKSwgdXNlZCB0byBvdmVycmlkZSBwYWNrYWdlIHNldHRpbmdzJywge1xuICAgIGZpbGU6ICdPdXRwdXQgY29uZmlndXJhdGlvbiBmaWxlIHBhdGggKHdpdGggb3Igd2l0aG91dCBzdWZmaXggbmFtZSBcIi50c1wiKSwgZS5nLiBcImNvbmYvZm9vYmFyLnByb2RcIidcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAoZmlsZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2NmZycpKS5nZW5lcmF0ZUNvbmZpZyhmaWxlLCBjZmdDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuXG4gIGNvbnN0IGdlbkNyYUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1wa2cgPHBhdGg+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIGEgc2FtcGxlIHBhY2thZ2UnKVxuICAgIC5vcHRpb24oJy0tY29tcCA8bmFtZT4nLCAnU2FtcGxlIGNvbXBvbmVudCBuYW1lJywgJ3NhbXBsZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxuYW1lPicsICdTYW1wbGUgZmVhdHVyZSBkaXJlY3RvcnkgYW5kIHNsaWNlIG5hbWUnLCAnc2FtcGxlRmVhdHVyZScpXG4gICAgLm9wdGlvbignLS1vdXRwdXQgPGRpci1uYW1lPicsICdUaGlzIG9wdGlvbiBjaGFuZ2VzIFwiYXBwQnVpbGRcIiB2YWx1ZXMgaW4gY29uZmlnLW92ZXJyaWRlLnRzLCcgK1xuICAgICAgJyBpbnRlcm5hbGx5IGNyZWF0ZS1yZWFjdC1hcHAgY2hhbmdlcyBXZWJwYWNrIGNvbmZpZ3VyZSBwcm9wZXJ0eSBgb3V0cHV0LnBhdGhgIGFjY29yZGluZyB0byB0aGlzIHZhbHVlICgnICtcbiAgICAgICcgeW91IG1heSBhbHNvIHVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIkJVSUxEX1BBVEhcIiBmb3IgY3JlYXRlLXJlYWN0LWFwcCB2ZXJzaW9uIGFib3ZlIDQuMC4zKScpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblBhY2thZ2UoZGlyLCBnZW5DcmFDbWQub3B0cygpLmNvbXAsXG4gICAgICAgIGdlbkNyYUNtZC5vcHRzKCkuZmVhdHVyZSwgZ2VuQ3JhQ21kLm9wdHMoKS5vdXRwdXQsIGdlbkNyYUNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgICB9KTtcblxuICBjb25zdCBnZW5DcmFDb21wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLWNvbXAgPGRpcj4gPGNvbXBvbmVudE5hbWUuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIHNhbXBsZSBjb21wb25lbnRzJylcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1jb25uIDxSZWR1eC1zbGljZS1maWxlPicsICdDb25uZWN0IGNvbXBvbmVudCB0byBSZWR1eCBzdG9yZSB2aWEgUmVhY3QtcmVkdXgnKVxuICAgIC5vcHRpb24oJy0taW50ZXJuYWwtc2xpY2UsLS1pcycsICdVc2UgYSBsaWdodHdlaWh0IFJlZHV4LXRvb2xraXQgKyByZWR1eC1vYnNlcnZhYmxlIGxpa2UgdG9vbCB0byBtYW5hZ2UgY29tcG9uZW50IGludGVybmFsIHN0YXRlLCcgK1xuICAgICAgJyB1c2VmdWwgZm9yIGltcGxlbWVudGluZyBjb21wbGV4IGNvbXBvbmVudCB3aGljaCBtaWdodCBoYXZlIGJpZ2Mgc3RhdGUgYW5kIGFzeW5jIHNpZGUgZWZmZWN0cycpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIGNvbXBOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuQ29tcG9uZW50cyhkaXIsIGNvbXBOYW1lcywge1xuICAgICAgICBjb25uZWN0ZWRUb1NsaWNlOiBnZW5DcmFDb21wQ21kLm9wdHMoKS5jb25uLFxuICAgICAgICBkcnlydW46IGdlbkNyYUNvbXBDbWQub3B0cygpLmRyeVJ1bixcbiAgICAgICAgdXNlSW50ZXJuYWxTbGljZTogZ2VuQ3JhQ29tcENtZC5vcHRzKCkuaXNcbiAgICAgIH0pO1xuICAgIH0pO1xuICBnZW5DcmFDb21wQ21kLnVzYWdlKGdlbkNyYUNvbXBDbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBjcmEtZ2VuLWNvbXAgLS1jb25uIC4uL3BhY2thZ2VzL2Zvb2Jhci9jb21wb25lbnRzIFRvb2xiYXIgTGF5b3V0IFByb2ZpbGUnKTtcblxuICBjb25zdCBnZW5DcmFTbGljZUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1zbGljZSA8ZGlyPiA8c2xpY2VOYW1lLi4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBhIHNhbXBsZSBSZWR1eC10b29sa2l0IFNsaWNlIGZpbGUgKHdpdGggUmVkdXgtb2JzZXJ2YWJsZSBlcGljKScpXG4gICAgLm9wdGlvbignLS1pbnRlcm5hbCcsICdBIFJlZHV4IFNsaWNlIGZvciBtYW5hZ2luZyBpbmRpdmlkdWFsIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwgdXNlZnVsIGZvciBjb21wbGljYXRlZCBjb21wb25lbnQnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXRpbnknLCAnQSBSeEpTIGJhc2VkIHRpbnkgU2xpY2UgZm9yIG1hbmFnaW5nIGluZGl2aWR1YWwgY29tcG9uZW50IGludGVybmFsIHN0YXRlLCB1c2VmdWwgZm9yIGNvbXBsaWNhdGVkIGNvbXBvbmVudCcsIGZhbHNlKVxuICAgIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgc2xpY2VOYW1lOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktY3JhLWdlbicpKS5nZW5TbGljZShkaXIsIHNsaWNlTmFtZSwgZ2VuQ3JhU2xpY2VDbWQub3B0cygpIGFzIGFueSk7XG4gICAgfSk7XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==