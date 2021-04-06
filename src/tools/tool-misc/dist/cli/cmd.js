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
        ' internally create-react-app changes Webpack configure property `output.path` according to this value')
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
        .option('--comp', 'A Slice for managing individual component internal state')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, sliceName) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts());
    }));
    program.command('color-info <color-string...>')
        .description('Show color information', { 'color-string': 'In form of CSS color string' })
        .action(function (colors) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const info of (yield Promise.resolve().then(() => __importStar(require('../color')))).colorInfo(colors)) {
                // tslint:disable-next-line: no-console
                console.log(info);
            }
        });
    });
    program.command('color-contrast <color-string1> <color-string2>')
        .description('Show color information', { 'color-string1': 'In form of CSS color string' })
        .action(function (...colors) {
        return __awaiter(this, void 0, void 0, function* () {
            (yield Promise.resolve().then(() => __importStar(require('../color')))).colorContrast(...colors);
        });
    });
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsbUVBQW1FLENBQUM7UUFDakYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxXQUFXLENBQUMsa0NBQWtDLEVBQUU7UUFDL0MsY0FBYyxFQUFFLHlCQUFpQjtLQUNsQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNqRyxD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RixNQUFNLENBQUMsVUFBZSxNQUFnQjs7WUFDckMsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUMvRCx1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDbkI7UUFDSCxDQUFDO0tBQUEsQ0FBQyxDQUFDO0lBRUwsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnREFBZ0QsQ0FBQztTQUM5RCxXQUFXLENBQUMsd0JBQXdCLEVBQUUsRUFBQyxlQUFlLEVBQUUsNkJBQTZCLEVBQUMsQ0FBQztTQUN2RixNQUFNLENBQUMsVUFBZSxHQUFHLE1BQWdCOztZQUN4QyxDQUFDLHdEQUFhLFVBQVUsR0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsTUFBMEIsQ0FBQyxDQUFDO1FBQzFFLENBQUM7S0FBQSxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NsaUV4dGVuc2lvbiwgY2xpUGFja2FnZUFyZ0Rlc2N9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHtjbGlQYWNrYWdlQXJnRGVzY31cbmltcG9ydCB7Q0JPcHRpb25zLCBnZW5lcmF0ZX0gZnJvbSAnLi9jbGktZ2NtZCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgY21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY21kIDxwYWNrYWdlLW5hbWU+IDxjb21tYW5kLW5hbWU+JylcbiAgLmFsaWFzKCdnZW4tY29tbWFuZCcpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgUGxpbmsgY29tbWFuZCBsaW5lIGltcGxlbWVudGF0aW9uIGluIHNwZWNpZmljIHBhY2thZ2UnKVxuICAvLyAub3B0aW9uKCctLWZvci10ZW1wbGF0ZSA8dGVtcGxhdGVOYW1lPicsICdDcmVhdGUgYSB0ZW1wbGF0ZSBnZW5lcmF0b3IgY29tbWFuZCcsIGZhbHNlKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjbWROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCBnZW5lcmF0ZShwYWNrYWdlTmFtZSwgY21kTmFtZSwgY21kLm9wdHMoKSBhcyBDQk9wdGlvbnMpO1xuICB9KTtcbiAgY21kLnVzYWdlKGNtZC51c2FnZSgpICsgJ1xcbmUuZy5cXG4gIHBsaW5rIGdjbWQgbXktcGFja2FnZSBteS1jb21tYW5kJyk7XG5cbiAgY29uc3Qgc2V0dGluZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgnZ3NldHRpbmcgPHBhY2thZ2UtbmFtZS4uLj4nKS5hbGlhcygnZ2VuLXNldHRpbmcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAuZGVzY3JpcHRpb24oJ0Jvb3RzdHJhcCBhIHBhY2thZ2Ugc2V0dGluZyBmaWxlJywge1xuICAgICdwYWNrYWdlLW5hbWUnOiBjbGlQYWNrYWdlQXJnRGVzY1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChwYWNrYWdlTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktZ3NldHRpbmcnKSkuZ2VuZXJhdGVTZXR0aW5nKHBhY2thZ2VOYW1lcywgc2V0dGluZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbiAgY29uc3QgY2ZnQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnY2ZnIDxmaWxlPicpLmFsaWFzKCdnZW4tY29uZmlnJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLXQsIC0tdHlwZSA8ZmlsZS10eXBlPicsICdDb25maWd1YXRpb24gZmlsZSB0eXBlLCB2YWxpZCB0eXBlcyBhcmUgXCJ0c1wiLCBcInlhbWxcIiwgXCJqc29uXCInLCAndHMnKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgd29ya3NwYWNlIGNvbmZpZ3VyYXRpb24gZmlsZSAoVHlwZXNjcmlwdCBmaWxlKSwgdXNlZCB0byBvdmVycmlkZSBwYWNrYWdlIHNldHRpbmdzJywge1xuICAgIGZpbGU6ICdPdXRwdXQgY29uZmlndXJhdGlvbiBmaWxlIHBhdGggKHdpdGggb3Igd2l0aG91dCBzdWZmaXggbmFtZSBcIi50c1wiKSwgZS5nLiBcImNvbmYvZm9vYmFyLnByb2RcIidcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAoZmlsZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2NmZycpKS5nZW5lcmF0ZUNvbmZpZyhmaWxlLCBjZmdDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuXG4gIGNvbnN0IGdlbkNyYUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1wa2cgPHBhdGg+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIGEgc2FtcGxlIHBhY2thZ2UnKVxuICAgIC5vcHRpb24oJy0tY29tcCA8bmFtZT4nLCAnU2FtcGxlIGNvbXBvbmVudCBuYW1lJywgJ3NhbXBsZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxuYW1lPicsICdTYW1wbGUgZmVhdHVyZSBkaXJlY3RvcnkgYW5kIHNsaWNlIG5hbWUnLCAnc2FtcGxlRmVhdHVyZScpXG4gICAgLm9wdGlvbignLS1vdXRwdXQgPGRpci1uYW1lPicsICdUaGlzIG9wdGlvbiBjaGFuZ2VzIFwiYXBwQnVpbGRcIiB2YWx1ZXMgaW4gY29uZmlnLW92ZXJyaWRlLnRzLCcgK1xuICAgICAgJyBpbnRlcm5hbGx5IGNyZWF0ZS1yZWFjdC1hcHAgY2hhbmdlcyBXZWJwYWNrIGNvbmZpZ3VyZSBwcm9wZXJ0eSBgb3V0cHV0LnBhdGhgIGFjY29yZGluZyB0byB0aGlzIHZhbHVlJylcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuUGFja2FnZShkaXIsIGdlbkNyYUNtZC5vcHRzKCkuY29tcCxcbiAgICAgICAgZ2VuQ3JhQ21kLm9wdHMoKS5mZWF0dXJlLCBnZW5DcmFDbWQub3B0cygpLm91dHB1dCwgZ2VuQ3JhQ21kLm9wdHMoKS5kcnlSdW4pO1xuICAgIH0pO1xuXG4gIGNvbnN0IGdlbkNyYUNvbXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tY29tcCA8ZGlyPiA8Y29tcG9uZW50TmFtZS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgc2FtcGxlIGNvbXBvbmVudHMnKVxuICAgIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLWNvbm4gPFJlZHV4LXNsaWNlLWZpbGU+JywgJ0Nvbm5lY3QgY29tcG9uZW50IHRvIFJlZHV4IHN0b3JlIHZpYSBSZWFjdC1yZWR1eCcpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIGNvbXBOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuQ29tcG9uZW50cyhkaXIsIGNvbXBOYW1lcywgZ2VuQ3JhQ29tcENtZC5vcHRzKCkuY29ubiwgZ2VuQ3JhQ29tcENtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgICB9KTtcbiAgZ2VuQ3JhQ29tcENtZC51c2FnZShnZW5DcmFDb21wQ21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgY3JhLWdlbi1jb21wIC0tY29ubiAuLi9wYWNrYWdlcy9mb29iYXIvY29tcG9uZW50cyBUb29sYmFyIExheW91dCBQcm9maWxlJyk7XG5cbiAgY29uc3QgZ2VuQ3JhU2xpY2VDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tc2xpY2UgPGRpcj4gPHNsaWNlTmFtZS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgYSBzYW1wbGUgUmVkdXgtdG9vbGtpdCBTbGljZSBmaWxlICh3aXRoIFJlZHV4LW9ic2VydmFibGUgZXBpYyknKVxuICAgIC5vcHRpb24oJy0tY29tcCcsICdBIFNsaWNlIGZvciBtYW5hZ2luZyBpbmRpdmlkdWFsIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZScpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBzbGljZU5hbWU6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblNsaWNlKGRpciwgc2xpY2VOYW1lLCBnZW5DcmFTbGljZUNtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NvbG9yLWluZm8gPGNvbG9yLXN0cmluZy4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignU2hvdyBjb2xvciBpbmZvcm1hdGlvbicsIHsnY29sb3Itc3RyaW5nJzogJ0luIGZvcm0gb2YgQ1NTIGNvbG9yIHN0cmluZyd9KVxuICAgIC5hY3Rpb24oYXN5bmMgZnVuY3Rpb24oY29sb3JzOiBzdHJpbmdbXSkge1xuICAgICAgZm9yIChjb25zdCBpbmZvIG9mIChhd2FpdCBpbXBvcnQoJy4uL2NvbG9yJykpLmNvbG9ySW5mbyhjb2xvcnMpKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhpbmZvKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NvbG9yLWNvbnRyYXN0IDxjb2xvci1zdHJpbmcxPiA8Y29sb3Itc3RyaW5nMj4nKVxuICAgIC5kZXNjcmlwdGlvbignU2hvdyBjb2xvciBpbmZvcm1hdGlvbicsIHsnY29sb3Itc3RyaW5nMSc6ICdJbiBmb3JtIG9mIENTUyBjb2xvciBzdHJpbmcnfSlcbiAgICAuYWN0aW9uKGFzeW5jIGZ1bmN0aW9uKC4uLmNvbG9yczogc3RyaW5nW10pIHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4uL2NvbG9yJykpLmNvbG9yQ29udHJhc3QoLi4uY29sb3JzIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xuICAgIH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19