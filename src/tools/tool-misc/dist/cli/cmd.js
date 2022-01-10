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
        .action(async (packageName, cmdName) => {
        await (0, cli_gcmd_1.generate)(packageName, cmdName, cmd.opts());
    });
    cmd.usage(cmd.usage() + '\ne.g.\n  plink gcmd my-package my-command');
    const settingCmd = program.command('gsetting <package-name...>').alias('gen-setting')
        .option('-d, --dry-run', 'Dryrun', false)
        .description('Bootstrap a package setting file', {
        'package-name': plink_1.cliPackageArgDesc
    })
        .action(async (packageNames) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-gsetting')))).generateSetting(packageNames, settingCmd.opts());
    });
    const cfgCmd = program.command('gcfg <file>').alias('gen-config')
        .option('-d, --dry-run', 'Dryrun', false)
        // .option('-t, --type <file-type>', 'Configuation file type, valid types are "ts", "yaml", "json"', 'ts')
        .description('Generate a workspace configuration file (Typescript file), used to override package settings', {
        file: 'Output configuration file path (with or without suffix name ".ts"), e.g. "conf/foobar.prod"'
    })
        .action(async (file) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-gcfg')))).generateConfig(file, cfgCmd.opts());
    });
    const genCraCmd = program.command('cra-gen-pkg <path>')
        .description('For create-react-app project, generate a sample package', { path: 'package directory in relative or absolute path' })
        .option('--comp <name>', 'Sample component name', 'sample')
        .option('--feature <name>', 'Sample feature directory and slice name', 'sampleFeature')
        .option('--output <dir-name>', 'This option changes "appBuild" values in config-override.ts,' +
        ' internally create-react-app changes Webpack configure property `output.path` according to this value (' +
        ' you may also use environment variable "BUILD_PATH" for create-react-app version above 4.0.3)')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action(async (dir) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genPackage(dir, genCraCmd.opts().comp, genCraCmd.opts().feature, genCraCmd.opts().output, genCraCmd.opts().dryRun);
    });
    const genCraCompCmd = program.command('cra-gen-comp <dir> <componentName...>')
        .description('For create-react-app project, generate sample components', {
        dir: 'directory'
    })
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .option('--conn <Redux-slice-file>', 'Connect component to Redux store via React-redux')
        // .option('--internal-slice,--is', 'Use a lightweiht Redux-toolkit + redux-observable like tool to manage component internal state,' +
        //   ' useful for implementing complex component which might have bigc state and async side effects')
        .action(async (dir, compNames) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genComponents(dir, compNames, {
            connectedToSlice: genCraCompCmd.opts().conn,
            dryrun: genCraCompCmd.opts().dryRun
        });
    });
    genCraCompCmd.usage(genCraCompCmd.usage() + '\ne.g.\n  plink cra-gen-comp --conn ../packages/foobar/components Toolbar Layout Profile');
    const genCraSliceCmd = program.command('cra-gen-slice <dir> <sliceName...>')
        .description('For create-react-app project, generate a sample Redux-toolkit Slice file (with Redux-observable epic)', {
        dir: 'directory'
    })
        .option('--internal', 'A Redux Slice for managing individual component internal state, useful for complicated component', false)
        .option('--tiny', 'A RxJS based tiny Slice for managing individual component internal state, useful for complicated component', false)
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action(async (dir, sliceName) => {
        await (await Promise.resolve().then(() => __importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts());
    });
    const htCmd = program.command('http-tunnel')
        .alias('ht')
        .description('Start forward proxy server')
        .argument('[port]', 'Port number', 14881)
        .option('-m <host-map>', '(multiple option) host mapping, e.g. -m www.google.com=localhost:8080', (value, map) => {
        const [host1, host2] = value.split('=');
        map.set(host1.trim(), host2.trim());
        return map;
    }, new Map())
        .action(async (port) => {
        (await Promise.resolve().then(() => __importStar(require('./cli-forward-proxy')))).start(port, htCmd.opts().m);
    });
    // program.command('install-eslint')
    // .description('Install eslint to current project')
    // .action(async () => {
    // });
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY21kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHNDQUEyRDtBQUMzRCw2QkFBNkI7QUFDN0IseUNBQStDO0FBRS9DLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLGtDQUFrQztJQUNsQyw0R0FBNEc7SUFDNUcseUJBQXlCO0lBQ3pCLG1EQUFtRDtJQUNuRCxNQUFNO0lBRU4sTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNoRSxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BCLFdBQVcsQ0FBQyxtRUFBbUUsQ0FBQztRQUNqRix5RkFBeUY7U0FDeEYsTUFBTSxDQUFDLGVBQWUsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDO1NBQ3hDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBbUIsRUFBRSxPQUFlLEVBQUUsRUFBRTtRQUNyRCxNQUFNLElBQUEsbUJBQVEsRUFBQyxXQUFXLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQWUsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsNENBQTRDLENBQUMsQ0FBQztJQUV0RSxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwRixNQUFNLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUM7U0FDeEMsV0FBVyxDQUFDLGtDQUFrQyxFQUFFO1FBQy9DLGNBQWMsRUFBRSx5QkFBaUI7S0FDbEMsQ0FBQztTQUNELE1BQU0sQ0FBQyxLQUFLLEVBQUUsWUFBc0IsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyx3REFBYSxnQkFBZ0IsR0FBQyxDQUFD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dCB7Q2xpRXh0ZW5zaW9uLCBjbGlQYWNrYWdlQXJnRGVzY30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQge2NsaVBhY2thZ2VBcmdEZXNjfVxuaW1wb3J0IHtDQk9wdGlvbnMsIGdlbmVyYXRlfSBmcm9tICcuL2NsaS1nY21kJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2VzbGludCA8ZGlyPicpXG4gIC8vIC5kZXNjcmlwdGlvbignUnVuIGVzbGludCBvbiB0cyBhbmQgdHN4IGZpbGVzIChleGNlcHQgLmQudHMgZmlsZSknLCB7ZGlyOiAndGFyZ2V0IHNvdXJjZSBjb2RlIGRpcmVjdG9yeSd9KVxuICAvLyAuYWN0aW9uKGFzeW5jIGRpciA9PiB7XG4gIC8vICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vZXNsaW50JykpLmVzbGludChkaXIpO1xuICAvLyB9KTtcblxuICBjb25zdCBjbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djbWQgPHBhY2thZ2UtbmFtZT4gPGNvbW1hbmQtbmFtZT4nKVxuICAuYWxpYXMoJ2dlbi1jb21tYW5kJylcbiAgLmRlc2NyaXB0aW9uKCdCb290c3RyYXAgYSBQbGluayBjb21tYW5kIGxpbmUgaW1wbGVtZW50YXRpb24gaW4gc3BlY2lmaWMgcGFja2FnZScpXG4gIC8vIC5vcHRpb24oJy0tZm9yLXRlbXBsYXRlIDx0ZW1wbGF0ZU5hbWU+JywgJ0NyZWF0ZSBhIHRlbXBsYXRlIGdlbmVyYXRvciBjb21tYW5kJywgZmFsc2UpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lOiBzdHJpbmcsIGNtZE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGdlbmVyYXRlKHBhY2thZ2VOYW1lLCBjbWROYW1lLCBjbWQub3B0cygpIGFzIENCT3B0aW9ucyk7XG4gIH0pO1xuICBjbWQudXNhZ2UoY21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgZ2NtZCBteS1wYWNrYWdlIG15LWNvbW1hbmQnKTtcblxuICBjb25zdCBzZXR0aW5nQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnc2V0dGluZyA8cGFja2FnZS1uYW1lLi4uPicpLmFsaWFzKCdnZW4tc2V0dGluZycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRHJ5cnVuJywgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignQm9vdHN0cmFwIGEgcGFja2FnZSBzZXR0aW5nIGZpbGUnLCB7XG4gICAgJ3BhY2thZ2UtbmFtZSc6IGNsaVBhY2thZ2VBcmdEZXNjXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKHBhY2thZ2VOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nc2V0dGluZycpKS5nZW5lcmF0ZVNldHRpbmcocGFja2FnZU5hbWVzLCBzZXR0aW5nQ21kLm9wdHMoKSBhcyBhbnkpO1xuICB9KTtcblxuICBjb25zdCBjZmdDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2djZmcgPGZpbGU+JykuYWxpYXMoJ2dlbi1jb25maWcnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RyeXJ1bicsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctdCwgLS10eXBlIDxmaWxlLXR5cGU+JywgJ0NvbmZpZ3VhdGlvbiBmaWxlIHR5cGUsIHZhbGlkIHR5cGVzIGFyZSBcInRzXCIsIFwieWFtbFwiLCBcImpzb25cIicsICd0cycpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSB3b3Jrc3BhY2UgY29uZmlndXJhdGlvbiBmaWxlIChUeXBlc2NyaXB0IGZpbGUpLCB1c2VkIHRvIG92ZXJyaWRlIHBhY2thZ2Ugc2V0dGluZ3MnLCB7XG4gICAgZmlsZTogJ091dHB1dCBjb25maWd1cmF0aW9uIGZpbGUgcGF0aCAod2l0aCBvciB3aXRob3V0IHN1ZmZpeCBuYW1lIFwiLnRzXCIpLCBlLmcuIFwiY29uZi9mb29iYXIucHJvZFwiJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChmaWxlOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nY2ZnJykpLmdlbmVyYXRlQ29uZmlnKGZpbGUsIGNmZ0NtZC5vcHRzKCkgYXMgYW55KTtcbiAgfSk7XG5cbiAgY29uc3QgZ2VuQ3JhQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXBrZyA8cGF0aD4nKVxuICAgIC5kZXNjcmlwdGlvbignRm9yIGNyZWF0ZS1yZWFjdC1hcHAgcHJvamVjdCwgZ2VuZXJhdGUgYSBzYW1wbGUgcGFja2FnZScsIHtwYXRoOiAncGFja2FnZSBkaXJlY3RvcnkgaW4gcmVsYXRpdmUgb3IgYWJzb2x1dGUgcGF0aCd9KVxuICAgIC5vcHRpb24oJy0tY29tcCA8bmFtZT4nLCAnU2FtcGxlIGNvbXBvbmVudCBuYW1lJywgJ3NhbXBsZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxuYW1lPicsICdTYW1wbGUgZmVhdHVyZSBkaXJlY3RvcnkgYW5kIHNsaWNlIG5hbWUnLCAnc2FtcGxlRmVhdHVyZScpXG4gICAgLm9wdGlvbignLS1vdXRwdXQgPGRpci1uYW1lPicsICdUaGlzIG9wdGlvbiBjaGFuZ2VzIFwiYXBwQnVpbGRcIiB2YWx1ZXMgaW4gY29uZmlnLW92ZXJyaWRlLnRzLCcgK1xuICAgICAgJyBpbnRlcm5hbGx5IGNyZWF0ZS1yZWFjdC1hcHAgY2hhbmdlcyBXZWJwYWNrIGNvbmZpZ3VyZSBwcm9wZXJ0eSBgb3V0cHV0LnBhdGhgIGFjY29yZGluZyB0byB0aGlzIHZhbHVlICgnICtcbiAgICAgICcgeW91IG1heSBhbHNvIHVzZSBlbnZpcm9ubWVudCB2YXJpYWJsZSBcIkJVSUxEX1BBVEhcIiBmb3IgY3JlYXRlLXJlYWN0LWFwcCB2ZXJzaW9uIGFib3ZlIDQuMC4zKScpXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlblBhY2thZ2UoZGlyLCBnZW5DcmFDbWQub3B0cygpLmNvbXAsXG4gICAgICAgIGdlbkNyYUNtZC5vcHRzKCkuZmVhdHVyZSwgZ2VuQ3JhQ21kLm9wdHMoKS5vdXRwdXQsIGdlbkNyYUNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgICB9KTtcblxuICBjb25zdCBnZW5DcmFDb21wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLWNvbXAgPGRpcj4gPGNvbXBvbmVudE5hbWUuLi4+JylcbiAgICAuZGVzY3JpcHRpb24oJ0ZvciBjcmVhdGUtcmVhY3QtYXBwIHByb2plY3QsIGdlbmVyYXRlIHNhbXBsZSBjb21wb25lbnRzJywge1xuICAgICAgZGlyOiAnZGlyZWN0b3J5J1xuICAgIH0pXG4gICAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAgIC5vcHRpb24oJy0tY29ubiA8UmVkdXgtc2xpY2UtZmlsZT4nLCAnQ29ubmVjdCBjb21wb25lbnQgdG8gUmVkdXggc3RvcmUgdmlhIFJlYWN0LXJlZHV4JylcbiAgICAvLyAub3B0aW9uKCctLWludGVybmFsLXNsaWNlLC0taXMnLCAnVXNlIGEgbGlnaHR3ZWlodCBSZWR1eC10b29sa2l0ICsgcmVkdXgtb2JzZXJ2YWJsZSBsaWtlIHRvb2wgdG8gbWFuYWdlIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwnICtcbiAgICAvLyAgICcgdXNlZnVsIGZvciBpbXBsZW1lbnRpbmcgY29tcGxleCBjb21wb25lbnQgd2hpY2ggbWlnaHQgaGF2ZSBiaWdjIHN0YXRlIGFuZCBhc3luYyBzaWRlIGVmZmVjdHMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1jcmEtZ2VuJykpLmdlbkNvbXBvbmVudHMoZGlyLCBjb21wTmFtZXMsIHtcbiAgICAgICAgY29ubmVjdGVkVG9TbGljZTogZ2VuQ3JhQ29tcENtZC5vcHRzKCkuY29ubiBhcyBzdHJpbmcsXG4gICAgICAgIGRyeXJ1bjogZ2VuQ3JhQ29tcENtZC5vcHRzKCkuZHJ5UnVuIGFzIGJvb2xlYW5cbiAgICAgIH0pO1xuICAgIH0pO1xuICBnZW5DcmFDb21wQ21kLnVzYWdlKGdlbkNyYUNvbXBDbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBjcmEtZ2VuLWNvbXAgLS1jb25uIC4uL3BhY2thZ2VzL2Zvb2Jhci9jb21wb25lbnRzIFRvb2xiYXIgTGF5b3V0IFByb2ZpbGUnKTtcblxuICBjb25zdCBnZW5DcmFTbGljZUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1zbGljZSA8ZGlyPiA8c2xpY2VOYW1lLi4uPicpXG4gICAgLmRlc2NyaXB0aW9uKCdGb3IgY3JlYXRlLXJlYWN0LWFwcCBwcm9qZWN0LCBnZW5lcmF0ZSBhIHNhbXBsZSBSZWR1eC10b29sa2l0IFNsaWNlIGZpbGUgKHdpdGggUmVkdXgtb2JzZXJ2YWJsZSBlcGljKScsIHtcbiAgICAgIGRpcjogJ2RpcmVjdG9yeSdcbiAgICB9KVxuICAgIC5vcHRpb24oJy0taW50ZXJuYWwnLCAnQSBSZWR1eCBTbGljZSBmb3IgbWFuYWdpbmcgaW5kaXZpZHVhbCBjb21wb25lbnQgaW50ZXJuYWwgc3RhdGUsIHVzZWZ1bCBmb3IgY29tcGxpY2F0ZWQgY29tcG9uZW50JywgZmFsc2UpXG4gICAgLm9wdGlvbignLS10aW55JywgJ0EgUnhKUyBiYXNlZCB0aW55IFNsaWNlIGZvciBtYW5hZ2luZyBpbmRpdmlkdWFsIGNvbXBvbmVudCBpbnRlcm5hbCBzdGF0ZSwgdXNlZnVsIGZvciBjb21wbGljYXRlZCBjb21wb25lbnQnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIHNsaWNlTmFtZTogc3RyaW5nW10pID0+IHtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4vY2xpLWNyYS1nZW4nKSkuZ2VuU2xpY2UoZGlyLCBzbGljZU5hbWUsIGdlbkNyYVNsaWNlQ21kLm9wdHMoKSApO1xuICAgIH0pO1xuXG4gIGNvbnN0IGh0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdodHRwLXR1bm5lbCcpXG4gICAgLmFsaWFzKCdodCcpXG4gICAgLmRlc2NyaXB0aW9uKCdTdGFydCBmb3J3YXJkIHByb3h5IHNlcnZlcicpXG4gICAgLmFyZ3VtZW50KCdbcG9ydF0nLCAnUG9ydCBudW1iZXInLCAxNDg4MSlcbiAgICAub3B0aW9uKCctbSA8aG9zdC1tYXA+JywgJyhtdWx0aXBsZSBvcHRpb24pIGhvc3QgbWFwcGluZywgZS5nLiAtbSB3d3cuZ29vZ2xlLmNvbT1sb2NhbGhvc3Q6ODA4MCcsXG4gICAgICAodmFsdWUsIG1hcCkgPT4ge1xuICAgICAgICBjb25zdCBbaG9zdDEsIGhvc3QyXSA9IHZhbHVlLnNwbGl0KCc9Jyk7XG4gICAgICAgIG1hcC5zZXQoaG9zdDEudHJpbSgpLCBob3N0Mi50cmltKCkpO1xuICAgICAgICByZXR1cm4gbWFwO1xuICAgICAgfSwgbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKSlcbiAgICAuYWN0aW9uKGFzeW5jIChwb3J0OiBudW1iZXIpID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWZvcndhcmQtcHJveHknKSkuc3RhcnQocG9ydCwgaHRDbWQub3B0cygpLm0pO1xuICAgIH0pO1xuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2luc3RhbGwtZXNsaW50JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbnN0YWxsIGVzbGludCB0byBjdXJyZW50IHByb2plY3QnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcblxuICAvLyB9KTtcblxufTtcblxuZXhwb3J0IGRlZmF1bHQgY2xpRXh0O1xuIl19