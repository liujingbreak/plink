"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const plink_1 = require("@wfh/plink");
const run_cluster_1 = require("../run-cluster");
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
        await (await Promise.resolve().then(() => tslib_1.__importStar(require('./cli-gsetting')))).generateSetting(packageNames, settingCmd.opts());
    });
    const cfgCmd = program.command('gcfg <file>').alias('gen-config')
        .option('-d, --dry-run', 'Dryrun', false)
        // .option('-t, --type <file-type>', 'Configuation file type, valid types are "ts", "yaml", "json"', 'ts')
        .description('Generate a workspace configuration file (Typescript file), used to override package settings', {
        file: 'Output configuration file path (with or without suffix name ".ts"), e.g. "conf/foobar.prod"'
    })
        .action(async (file) => {
        await (await Promise.resolve().then(() => tslib_1.__importStar(require('./cli-gcfg')))).generateConfig(file, cfgCmd.opts());
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
        await (await Promise.resolve().then(() => tslib_1.__importStar(require('./cli-cra-gen')))).genPackage(dir, genCraCmd.opts().comp, genCraCmd.opts().feature, genCraCmd.opts().output, genCraCmd.opts().dryRun);
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
        await (await Promise.resolve().then(() => tslib_1.__importStar(require('./cli-cra-gen')))).genComponents(dir, compNames, {
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
        await (await Promise.resolve().then(() => tslib_1.__importStar(require('./cli-cra-gen')))).genSlice(dir, sliceName, genCraSliceCmd.opts());
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
        .option('-p,--fallback <fallback-proxy>', 'A fallback proxy server e.g. 172.29.8.195:8888')
        .option('--cluster <num>', 'enable cluster and fork "num" number of worker process, specify value greater than 0')
        .action(async (port) => {
        if (Number(htCmd.opts().cluster) > 0) {
            node_cluster_1.default.setupMaster({
                exec: node_path_1.default.resolve(__dirname, 'forward-proxy-worker.js'),
                args: [
                    port + '',
                    JSON.stringify([...htCmd.opts().m.entries()]),
                    JSON.stringify(htCmd.opts().fallback || '')
                ]
            });
            (0, run_cluster_1.startCluster)(htCmd.opts().cluster);
        }
        else {
            const fallbackOpt = htCmd.opts().fallback ? htCmd.opts().fallback.split(':') : undefined;
            (await Promise.resolve().then(() => tslib_1.__importStar(require('./cli-forward-proxy')))).start(port, htCmd.opts().m, fallbackOpt
                ? {
                    fallbackProxyHost: fallbackOpt[0],
                    fallbackproxyPort: fallbackOpt[1] != null ? Number(fallbackOpt[1]) : 80
                }
                : undefined);
        }
    });
    // program.command('install-eslint')
    // .description('Install eslint to current project')
    // .action(async () => {
    // });
};
exports.default = cliExt;
//# sourceMappingURL=cmd.js.map