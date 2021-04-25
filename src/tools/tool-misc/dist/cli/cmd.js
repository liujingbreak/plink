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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsbUVBQW1FLENBQUM7UUFDakYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxXQUFXLENBQUMsa0NBQWtDLEVBQUU7UUFDL0MsY0FBYyxFQUFFLHlCQUFpQjtLQUNsQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNqRyxD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LENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsY0FBYyxDQUFDLElBQUksRUFBUyxDQUFDLENBQUM7SUFDekYsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVQLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQge2NsaVBhY2thZ2VBcmdEZXNjfVxuaW1wb3J0IHtDQk9wdGlvbnMsIGdlbmVyYXRlfSBmcm9tICcuL2NsaS1nY21kJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBjbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djbWQgPHBhY2thZ2UtbmFtZT4gPGNvbW1hbmQtbmFtZT4nKVxuICAuYWxpYXMoJ2dlbi1jb21tYW5kJylcbiAgLmRlc2NyaXB0aW9uKCdCb290c3RyYXAgYSBQbGluayBjb21tYW5kIGxpbmUgaW1wbGVtZW50YXRpb24gaW4gc3BlY2lmaWMgcGFja2FnZScpXG4gIC8vIC5vcHRpb24oJy0tZm9yLXRlbXBsYXRlIDx0ZW1wbGF0ZU5hbWU+JywgJ0NyZWF0ZSBhIHRlbXBsYXRlIGdlbmVyYXRvciBjb21tYW5kJywgZmFsc2UpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGdlbmVyYXRlKHBhY2thZ2VOYW1lLCBjbWROYW1lLCBjbWQub3B0cygpIGFzIENCT3B0aW9ucyk7XG4gIH0pO1xuICBjbWQudXNhZ2UoY21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgZ2NtZCBteS1wYWNrYWdlIG15LWNvbW1hbmQnKTtcblxuICBjb25zdCBzZXR0aW5nQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnc2V0dGluZyA8cGFja2FnZS1uYW1lLi4uPicpLmFsaWFzKCdnZW4tc2V0dGluZycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgcGFja2FnZSBzZXR0aW5nIGZpbGUnLCB7XG4gICAgJ3BhY2thZ2UtbmFtZSc6IGNsaVBhY2thZ2VBcmdEZXNjXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nc2V0dGluZycpKS5nZW5lcmF0ZVNldHRpbmcocGFja2FnZU5hbWVzLCBzZXR0aW5nQ21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcblxuICBjb25zdCBjZmdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djZmcgPGZpbGU+JykuYWxpYXMoJ2dlbi1jb25maWcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctdCwgLS10eXBlIDxmaWxlLXR5cGU+JywgJ0NvbmZpZ3VhdGlvbiBmaWxlIHR5cGUsIHZhbGlkIHR5cGVzIGFyZSBcInRzXCIsIFwieWFtbFwiLCBcImpzb25cIicsICd0cycpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlIChUeXBlc2NyaXB0IGZpbGUpLCB1c2VkIHRvIG92ZXJyaWRlIHBhY2thZ2Ugc2V0dGluZ3MnLCB7XG4gICAgZmlsZTogJ091dHB1dCBjb25maWd1cmF0aW9uIGZpbGUgcGF0aCAod2l0aCBvciB3aXRob3V0IHN1ZmZpeCBuYW1lIFwiLnRzXCIpLCBlLmcuIFwiY29uZi9mb29iYXIucHJvZFwiJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChmaWxlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nY2ZnJykpLmdlbmVyYXRlQ29uZmlnKGZpbGUsIGNmZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbiAgY29uc3QgZ2VuQ3JhQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXBrZyA8cGF0aD4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgYSBzYW1wbGUgcGFja2FnZScpXG4gICAgLm9wdGlvbignLS1jb21wIDxuYW1lPicsICdTYW1wbGUgY29tcG9uZW50IG5hbWUnLCAnc2FtcGxlJylcbiAgICAub3B0aW9uKCctLWZlYXR1cmUgPG5hbWU+JywgJ1NhbXBsZSBmZWF0dXJlIGRpcmVjdG9yeSBhbmQgc2xpY2UgbmFtZScsICdzYW1wbGVGZWF0dXJlJylcbiAgICAub3B0aW9uKCctLW91dHB1dCA8ZGlyLW5hbWU+JywgJ1RoaXMgb3B0aW9uIGNoYW5nZXMgXCJhcHBCdWlsZFwiIHZhbHVlcyBpbiBjb25maWctb3ZlcnJpZGUudHMsJyArXG4gICAgICAnIGludGVybmFsbHkgY3JlYXRlLXJlYWN0LWFwcCBjaGFuZ2VzIFdlYnBhY2sgY29uZmlndXJlIHByb3BlcnR5IGBvdXRwdXQucGF0aGAgYWNjb3JkaW5nIHRvIHRoaXMgdmFsdWUnKVxuICAgIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZykgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktY3JhLWdlbicpKS5nZW5QYWNrYWdlKGRpciwgZ2VuQ3JhQ21kLm9wdHMoKS5jb21wLFxuICAgICAgICBnZW5DcmFDbWQub3B0cygpLmZlYXR1cmUsIGdlbkNyYUNtZC5vcHRzKCkub3V0cHV0LCBnZW5DcmFDbWQub3B0cygpLmRyeVJ1bik7XG4gICAgfSk7XG5cbiAgY29uc3QgZ2VuQ3JhQ29tcENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1jb21wIDxkaXI+IDxjb21wb25lbnROYW1lLi4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBzYW1wbGUgY29tcG9uZW50cycpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tY29ubiA8UmVkdXgtc2xpY2UtZmlsZT4nLCAnQ29ubmVjdCBjb21wb25lbnQgdG8gUmVkdXggc3RvcmUgdmlhIFJlYWN0LXJlZHV4JylcbiAgICAub3B0aW9uKCctLWludGVybmFsLXNsaWNlLC0taXMnLCAnVXNlIGEgbGlnaHR3ZWlodCBSZWR1eC10b29sa2l0ICsgcmVkdXgtb2JzZXJ2YWJsZSBsaWtlIHRvb2wgdG8gbWFuYWdlIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwnICtcbiAgICAgICcgdXNlZnVsIGZvciBpbXBsZW1lbnRpbmcgY29tcGxleCBjb21wb25lbnQgd2hpY2ggbWlnaHQgaGF2ZSBiaWdjIHN0YXRlIGFuZCBhc3luYyBzaWRlIGVmZmVjdHMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlbkNvbXBvbmVudHMoZGlyLCBjb21wTmFtZXMsIHtcbiAgICAgICAgY29ubmVjdGVkVG9TbGljZTogZ2VuQ3JhQ29tcENtZC5vcHRzKCkuY29ubixcbiAgICAgICAgZHJ5cnVuOiBnZW5DcmFDb21wQ21kLm9wdHMoKS5kcnlSdW4sXG4gICAgICAgIHVzZUludGVybmFsU2xpY2U6IGdlbkNyYUNvbXBDbWQub3B0cygpLmlzXG4gICAgICB9KTtcbiAgICB9KTtcbiAgZ2VuQ3JhQ29tcENtZC51c2FnZShnZW5DcmFDb21wQ21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgY3JhLWdlbi1jb21wIC0tY29ubiAuLi9wYWNrYWdlcy9mb29iYXIvY29tcG9uZW50cyBUb29sYmFyIExheW91dCBQcm9maWxlJyk7XG5cbiAgY29uc3QgZ2VuQ3JhU2xpY2VDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tc2xpY2UgPGRpcj4gPHNsaWNlTmFtZS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgYSBzYW1wbGUgUmVkdXgtdG9vbGtpdCBTbGljZSBmaWxlICh3aXRoIFJlZHV4LW9ic2VydmFibGUgZXBpYyknKVxuICAgIC5vcHRpb24oJy0taW50ZXJuYWwnLCAnQSBSZWR1eCBTbGljZSBmb3IgbWFuYWdpbmcgaW5kaXZpZHVhbCBjb21wb25lbnQgaW50ZXJuYWwgc3RhdGUsIHVzZWZ1bCBmb3IgY29tcGxpY2F0ZWQgY29tcG9uZW50JywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10aW55JywgJ0EgUnhKUyBiYXNlZCB0aW55IFNsaWNlIGZvciBtYW5hZ2luZyBpbmRpdmlkdWFsIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwgdXNlZnVsIGZvciBjb21wbGljYXRlZCBjb21wb25lbnQnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIHNsaWNlTmFtZTogc3RyaW5nW10pID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuU2xpY2UoZGlyLCBzbGljZU5hbWUsIGdlbkNyYVNsaWNlQ21kLm9wdHMoKSBhcyBhbnkpO1xuICAgIH0pO1xuXG59O1xuXG5leHBvcnQgZGVmYXVsdCBjbGlFeHQ7XG4iXX0=