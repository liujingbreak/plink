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
        yield (0, cli_gcmd_1.generate)(packageName, cmdName, cmd.opts());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLGtDQUFrQztJQUNsQyw0R0FBNEc7SUFDNUcseUJBQXlCO0lBQ3pCLG1EQUFtRDtJQUNuRCxNQUFNO0lBRU4sTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNoRSxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BCLFdBQVcsQ0FBQyxtRUFBbUUsQ0FBQztRQUNqRix5RkFBeUY7U0FDeEYsTUFBTSxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO1NBQ3hDLE1BQU0sQ0FBQyxDQUFPLFdBQW1CLEVBQUUsT0FBZSxFQUFFLEVBQUU7UUFDckQsTUFBTSxJQUFBLG1CQUFRLEVBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFlLENBQUMsQ0FBQztJQUNoRSxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsNENBQTRDLENBQUMsQ0FBQztJQUV0RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwRixNQUFNLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUM7U0FDeEMsV0FBVyxDQUFDLGtDQUFrQyxFQUFFO1FBQy9DLGNBQWMsRUFBRSx5QkFBaUI7S0FDbEMsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFPLFlBQXNCLEVBQUUsRUFBRTtRQUN2QyxNQUFNLENBQUMsd0RBQWEsZ0JBQWdCLEdBQUMs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ZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsU0FBbUIsRUFBRSxFQUFFO1FBQ2pELE1BQU0sQ0FBQyx3REFBYSxlQUFlLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQVMsQ0FBQyxDQUFDO0lBQy9GLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCxvQ0FBb0M7SUFDcEMsb0RBQW9EO0lBQ3BELHdCQUF3QjtJQUV4QixNQUFNO0FBRVIsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDbGlFeHRlbnNpb24sIGNsaVBhY2thZ2VBcmdEZXNjfSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCB7Y2xpUGFja2FnZUFyZ0Rlc2N9XG5pbXBvcnQge0NCT3B0aW9ucywgZ2VuZXJhdGV9IGZyb20gJy4vY2xpLWdjbWQnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIC8vIHByb2dyYW0uY29tbWFuZCgnZXNsaW50IDxkaXI+JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdSdW4gZXNsaW50IG9uIHRzIGFuZCB0c3ggZmlsZXMgKGV4Y2VwdCAuZC50cyBmaWxlKScsIHtkaXI6ICd0YXJnZXQgc291cmNlIGNvZGUgZGlyZWN0b3J5J30pXG4gIC8vIC5hY3Rpb24oYXN5bmMgZGlyID0+IHtcbiAgLy8gICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9lc2xpbnQnKSkuZXNsaW50KGRpcik7XG4gIC8vIH0pO1xuXG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2NtZCA8cGFja2FnZS1uYW1lPiA8Y29tbWFuZC1uYW1lPicpXG4gIC5hbGlhcygnZ2VuLWNvbW1hbmQnKVxuICAuZGVzY3JpcHRpb24oJ0Jvb3RzdHJhcCBhIFBsaW5rIGNvbW1hbmQgbGluZSBpbXBsZW1lbnRhdGlvbiBpbiBzcGVjaWZpYyBwYWNrYWdlJylcbiAgLy8gLm9wdGlvbignLS1mb3ItdGVtcGxhdGUgPHRlbXBsYXRlTmFtZT4nLCAnQ3JlYXRlIGEgdGVtcGxhdGUgZ2VuZXJhdG9yIGNvbW1hbmQnLCBmYWxzZSlcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZU5hbWU6IHN0cmluZywgY21kTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgZ2VuZXJhdGUocGFja2FnZU5hbWUsIGNtZE5hbWUsIGNtZC5vcHRzKCkgYXMgQ0JPcHRpb25zKTtcbiAgfSk7XG4gIGNtZC51c2FnZShjbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBnY21kIG15LXBhY2thZ2UgbXktY29tbWFuZCcpO1xuXG4gIGNvbnN0IHNldHRpbmdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2dzZXR0aW5nIDxwYWNrYWdlLW5hbWUuLi4+JykuYWxpYXMoJ2dlbi1zZXR0aW5nJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLmRlc2NyaXB0aW9uKCdCb290c3RyYXAgYSBwYWNrYWdlIHNldHRpbmcgZmlsZScsIHtcbiAgICAncGFja2FnZS1uYW1lJzogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZU5hbWVzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWdzZXR0aW5nJykpLmdlbmVyYXRlU2V0dGluZyhwYWNrYWdlTmFtZXMsIHNldHRpbmdDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuXG4gIGNvbnN0IGNmZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2NmZyA8ZmlsZT4nKS5hbGlhcygnZ2VuLWNvbmZpZycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy10LCAtLXR5cGUgPGZpbGUtdHlwZT4nLCAnQ29uZmlndWF0aW9uIGZpbGUgdHlwZSwgdmFsaWQgdHlwZXMgYXJlIFwidHNcIiwgXCJ5YW1sXCIsIFwianNvblwiJywgJ3RzJylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uIGZpbGUgKFR5cGVzY3JpcHQgZmlsZSksIHVzZWQgdG8gb3ZlcnJpZGUgcGFja2FnZSBzZXR0aW5ncycsIHtcbiAgICBmaWxlOiAnT3V0cHV0IGNvbmZpZ3VyYXRpb24gZmlsZSBwYXRoICh3aXRoIG9yIHdpdGhvdXQgc3VmZml4IG5hbWUgXCIudHNcIiksIGUuZy4gXCJjb25mL2Zvb2Jhci5wcm9kXCInXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWdjZmcnKSkuZ2VuZXJhdGVDb25maWcoZmlsZSwgY2ZnQ21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcblxuICBjb25zdCBnZW5DcmFDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tcGtnIDxwYXRoPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBhIHNhbXBsZSBwYWNrYWdlJywge3BhdGg6ICdwYWNrYWdlIGRpcmVjdG9yeSBpbiByZWxhdGl2ZSBvciBhYnNvbHV0ZSBwYXRoJ30pXG4gICAgLm9wdGlvbignLS1jb21wIDxuYW1lPicsICdTYW1wbGUgY29tcG9uZW50IG5hbWUnLCAnc2FtcGxlJylcbiAgICAub3B0aW9uKCctLWZlYXR1cmUgPG5hbWU+JywgJ1NhbXBsZSBmZWF0dXJlIGRpcmVjdG9yeSBhbmQgc2xpY2UgbmFtZScsICdzYW1wbGVGZWF0dXJlJylcbiAgICAub3B0aW9uKCctLW91dHB1dCA8ZGlyLW5hbWU+JywgJ1RoaXMgb3B0aW9uIGNoYW5nZXMgXCJhcHBCdWlsZFwiIHZhbHVlcyBpbiBjb25maWctb3ZlcnJpZGUudHMsJyArXG4gICAgICAnIGludGVybmFsbHkgY3JlYXRlLXJlYWN0LWFwcCBjaGFuZ2VzIFdlYnBhY2sgY29uZmlndXJlIHByb3BlcnR5IGBvdXRwdXQucGF0aGAgYWNjb3JkaW5nIHRvIHRoaXMgdmFsdWUgKCcgK1xuICAgICAgJyB5b3UgbWF5IGFsc28gdXNlIGVudmlyb25tZW50IHZhcmlhYmxlIFwiQlVJTERfUEFUSFwiIGZvciBjcmVhdGUtcmVhY3QtYXBwIHZlcnNpb24gYWJvdmUgNC4wLjMpJylcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuUGFja2FnZShkaXIsIGdlbkNyYUNtZC5vcHRzKCkuY29tcCxcbiAgICAgICAgZ2VuQ3JhQ21kLm9wdHMoKS5mZWF0dXJlLCBnZW5DcmFDbWQub3B0cygpLm91dHB1dCwgZ2VuQ3JhQ21kLm9wdHMoKS5kcnlSdW4pO1xuICAgIH0pO1xuXG4gIGNvbnN0IGdlbkNyYUNvbXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tY29tcCA8ZGlyPiA8Y29tcG9uZW50TmFtZS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgc2FtcGxlIGNvbXBvbmVudHMnLCB7XG4gICAgICBkaXI6ICdkaXJlY3RvcnknXG4gICAgfSlcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1jb25uIDxSZWR1eC1zbGljZS1maWxlPicsICdDb25uZWN0IGNvbXBvbmVudCB0byBSZWR1eCBzdG9yZSB2aWEgUmVhY3QtcmVkdXgnKVxuICAgIC8vIC5vcHRpb24oJy0taW50ZXJuYWwtc2xpY2UsLS1pcycsICdVc2UgYSBsaWdodHdlaWh0IFJlZHV4LXRvb2xraXQgKyByZWR1eC1vYnNlcnZhYmxlIGxpa2UgdG9vbCB0byBtYW5hZ2UgY29tcG9uZW50IGludGVybmFsIHN0YXRlLCcgK1xuICAgIC8vICAgJyB1c2VmdWwgZm9yIGltcGxlbWVudGluZyBjb21wbGV4IGNvbXBvbmVudCB3aGljaCBtaWdodCBoYXZlIGJpZ2Mgc3RhdGUgYW5kIGFzeW5jIHNpZGUgZWZmZWN0cycpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIGNvbXBOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuQ29tcG9uZW50cyhkaXIsIGNvbXBOYW1lcywge1xuICAgICAgICBjb25uZWN0ZWRUb1NsaWNlOiBnZW5DcmFDb21wQ21kLm9wdHMoKS5jb25uIGFzIHN0cmluZyxcbiAgICAgICAgZHJ5cnVuOiBnZW5DcmFDb21wQ21kLm9wdHMoKS5kcnlSdW4gYXMgYm9vbGVhblxuICAgICAgfSk7XG4gICAgfSk7XG4gIGdlbkNyYUNvbXBDbWQudXNhZ2UoZ2VuQ3JhQ29tcENtZC51c2FnZSgpICsgJ1xcbmUuZy5cXG4gIHBsaW5rIGNyYS1nZW4tY29tcCAtLWNvbm4gLi4vcGFja2FnZXMvZm9vYmFyL2NvbXBvbmVudHMgVG9vbGJhciBMYXlvdXQgUHJvZmlsZScpO1xuXG4gIGNvbnN0IGdlbkNyYVNsaWNlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXNsaWNlIDxkaXI+IDxzbGljZU5hbWUuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIGEgc2FtcGxlIFJlZHV4LXRvb2xraXQgU2xpY2UgZmlsZSAod2l0aCBSZWR1eC1vYnNlcnZhYmxlIGVwaWMpJywge1xuICAgICAgZGlyOiAnZGlyZWN0b3J5J1xuICAgIH0pXG4gICAgLm9wdGlvbignLS1pbnRlcm5hbCcsICdBIFJlZHV4IFNsaWNlIGZvciBtYW5hZ2luZyBpbmRpdmlkdWFsIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwgdXNlZnVsIGZvciBjb21wbGljYXRlZCBjb21wb25lbnQnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctLXRpbnknLCAnQSBSeEpTIGJhc2VkIHRpbnkgU2xpY2UgZm9yIG1hbmFnaW5nIGluZGl2aWR1YWwgY29tcG9uZW50IGludGVybmFsIHN0YXRlLCB1c2VmdWwgZm9yIGNvbXBsaWNhdGVkIGNvbXBvbmVudCcsIGZhbHNlKVxuICAgIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgc2xpY2VOYW1lOiBzdHJpbmdbXSkgPT4ge1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi9jbGktY3JhLWdlbicpKS5nZW5TbGljZShkaXIsIHNsaWNlTmFtZSwgZ2VuQ3JhU2xpY2VDbWQub3B0cygpIGFzIGFueSk7XG4gICAgfSk7XG5cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdpbnN0YWxsLWVzbGludCcpXG4gIC8vIC5kZXNjcmlwdGlvbignSW5zdGFsbCBlc2xpbnQgdG8gY3VycmVudCBwcm9qZWN0JylcbiAgLy8gLmFjdGlvbihhc3luYyAoKSA9PiB7XG5cbiAgLy8gfSk7XG5cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==