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
        .option('--internal', 'A Slice for managing individual component internal state, useful for complicated component')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, sliceName) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts());
    }));
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDaEUsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMsbUVBQW1FLENBQUM7UUFDakYseUZBQXlGO1NBQ3hGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxNQUFNLENBQUMsQ0FBTyxXQUFtQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3JELE1BQU0sbUJBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyw0Q0FBNEMsQ0FBQyxDQUFDO0lBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BGLE1BQU0sQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQztTQUN4QyxXQUFXLENBQUMsa0NBQWtDLEVBQUU7UUFDL0MsY0FBYyxFQUFFLHlCQUFpQjtLQUNsQyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFTLENBQUMsQ0FBQztJQUNqRyxD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ICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCB7Y2xpUGFja2FnZUFyZ0Rlc2N9XG5pbXBvcnQge0NCT3B0aW9ucywgZ2VuZXJhdGV9IGZyb20gJy4vY2xpLWdjbWQnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIGNvbnN0IGNtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2NtZCA8cGFja2FnZS1uYW1lPiA8Y29tbWFuZC1uYW1lPicpXG4gIC5hbGlhcygnZ2VuLWNvbW1hbmQnKVxuICAuZGVzY3JpcHRpb24oJ0Jvb3RzdHJhcCBhIFBsaW5rIGNvbW1hbmQgbGluZSBpbXBsZW1lbnRhdGlvbiBpbiBzcGVjaWZpYyBwYWNrYWdlJylcbiAgLy8gLm9wdGlvbignLS1mb3ItdGVtcGxhdGUgPHRlbXBsYXRlTmFtZT4nLCAnQ3JlYXRlIGEgdGVtcGxhdGUgZ2VuZXJhdG9yIGNvbW1hbmQnLCBmYWxzZSlcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZU5hbWU6IHN0cmluZywgY21kTmFtZTogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgZ2VuZXJhdGUocGFja2FnZU5hbWUsIGNtZE5hbWUsIGNtZC5vcHRzKCkgYXMgQ0JPcHRpb25zKTtcbiAgfSk7XG4gIGNtZC51c2FnZShjbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBnY21kIG15LXBhY2thZ2UgbXktY29tbWFuZCcpO1xuXG4gIGNvbnN0IHNldHRpbmdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2dzZXR0aW5nIDxwYWNrYWdlLW5hbWUuLi4+JykuYWxpYXMoJ2dlbi1zZXR0aW5nJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEcnlydW4nLCBmYWxzZSlcbiAgLmRlc2NyaXB0aW9uKCdCb290c3RyYXAgYSBwYWNrYWdlIHNldHRpbmcgZmlsZScsIHtcbiAgICAncGFja2FnZS1uYW1lJzogY2xpUGFja2FnZUFyZ0Rlc2NcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAocGFja2FnZU5hbWVzOiBzdHJpbmdbXSkgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWdzZXR0aW5nJykpLmdlbmVyYXRlU2V0dGluZyhwYWNrYWdlTmFtZXMsIHNldHRpbmdDbWQub3B0cygpIGFzIGFueSk7XG4gIH0pO1xuXG4gIGNvbnN0IGNmZ0NtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2NmZyA8ZmlsZT4nKS5hbGlhcygnZ2VuLWNvbmZpZycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy10LCAtLXR5cGUgPGZpbGUtdHlwZT4nLCAnQ29uZmlndWF0aW9uIGZpbGUgdHlwZSwgdmFsaWQgdHlwZXMgYXJlIFwidHNcIiwgXCJ5YW1sXCIsIFwianNvblwiJywgJ3RzJylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIHdvcmtzcGFjZSBjb25maWd1cmF0aW9uIGZpbGUgKFR5cGVzY3JpcHQgZmlsZSksIHVzZWQgdG8gb3ZlcnJpZGUgcGFja2FnZSBzZXR0aW5ncycsIHtcbiAgICBmaWxlOiAnT3V0cHV0IGNvbmZpZ3VyYXRpb24gZmlsZSBwYXRoICh3aXRoIG9yIHdpdGhvdXQgc3VmZml4IG5hbWUgXCIudHNcIiksIGUuZy4gXCJjb25mL2Zvb2Jhci5wcm9kXCInXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWdjZmcnKSkuZ2VuZXJhdGVDb25maWcoZmlsZSwgY2ZnQ21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcblxuICBjb25zdCBnZW5DcmFDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tcGtnIDxwYXRoPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBhIHNhbXBsZSBwYWNrYWdlJylcbiAgICAub3B0aW9uKCctLWNvbXAgPG5hbWU+JywgJ1NhbXBsZSBjb21wb25lbnQgbmFtZScsICdzYW1wbGUnKVxuICAgIC5vcHRpb24oJy0tZmVhdHVyZSA8bmFtZT4nLCAnU2FtcGxlIGZlYXR1cmUgZGlyZWN0b3J5IGFuZCBzbGljZSBuYW1lJywgJ3NhbXBsZUZlYXR1cmUnKVxuICAgIC5vcHRpb24oJy0tb3V0cHV0IDxkaXItbmFtZT4nLCAnVGhpcyBvcHRpb24gY2hhbmdlcyBcImFwcEJ1aWxkXCIgdmFsdWVzIGluIGNvbmZpZy1vdmVycmlkZS50cywnICtcbiAgICAgICcgaW50ZXJuYWxseSBjcmVhdGUtcmVhY3QtYXBwIGNoYW5nZXMgV2VicGFjayBjb25maWd1cmUgcHJvcGVydHkgYG91dHB1dC5wYXRoYCBhY2NvcmRpbmcgdG8gdGhpcyB2YWx1ZScpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblBhY2thZ2UoZGlyLCBnZW5DcmFDbWQub3B0cygpLmNvbXAsXG4gICAgICAgIGdlbkNyYUNtZC5vcHRzKCkuZmVhdHVyZSwgZ2VuQ3JhQ21kLm9wdHMoKS5vdXRwdXQsIGdlbkNyYUNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgICB9KTtcblxuICBjb25zdCBnZW5DcmFDb21wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLWNvbXAgPGRpcj4gPGNvbXBvbmVudE5hbWUuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIHNhbXBsZSBjb21wb25lbnRzJylcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLm9wdGlvbignLS1jb25uIDxSZWR1eC1zbGljZS1maWxlPicsICdDb25uZWN0IGNvbXBvbmVudCB0byBSZWR1eCBzdG9yZSB2aWEgUmVhY3QtcmVkdXgnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlbkNvbXBvbmVudHMoZGlyLCBjb21wTmFtZXMsIGdlbkNyYUNvbXBDbWQub3B0cygpLmNvbm4sIGdlbkNyYUNvbXBDbWQub3B0cygpLmRyeVJ1bik7XG4gICAgfSk7XG4gIGdlbkNyYUNvbXBDbWQudXNhZ2UoZ2VuQ3JhQ29tcENtZC51c2FnZSgpICsgJ1xcbmUuZy5cXG4gIHBsaW5rIGNyYS1nZW4tY29tcCAtLWNvbm4gLi4vcGFja2FnZXMvZm9vYmFyL2NvbXBvbmVudHMgVG9vbGJhciBMYXlvdXQgUHJvZmlsZScpO1xuXG4gIGNvbnN0IGdlbkNyYVNsaWNlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXNsaWNlIDxkaXI+IDxzbGljZU5hbWUuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIGEgc2FtcGxlIFJlZHV4LXRvb2xraXQgU2xpY2UgZmlsZSAod2l0aCBSZWR1eC1vYnNlcnZhYmxlIGVwaWMpJylcbiAgICAub3B0aW9uKCctLWludGVybmFsJywgJ0EgU2xpY2UgZm9yIG1hbmFnaW5nIGluZGl2aWR1YWwgY29tcG9uZW50IGludGVybmFsIHN0YXRlLCB1c2VmdWwgZm9yIGNvbXBsaWNhdGVkIGNvbXBvbmVudCcpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBzbGljZU5hbWU6IHN0cmluZ1tdKSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblNsaWNlKGRpciwgc2xpY2VOYW1lLCBnZW5DcmFTbGljZUNtZC5vcHRzKCkgYXMgYW55KTtcbiAgICB9KTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19