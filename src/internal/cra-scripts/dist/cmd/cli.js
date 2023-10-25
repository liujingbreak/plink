#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const child_process_1 = require("child_process");
const plink_1 = require("@wfh/plink");
const plink_2 = require("@wfh/plink");
const cra_scripts_setting_1 = require("../../isom/cra-scripts-setting");
const utils_1 = require("../utils");
// import inspector from 'inspector';
// inspector.open(9222, '0.0.0.0', true);
const log = (0, plink_2.log4File)(__filename);
const cli = (program) => {
    const buildCmd = program.command('cra-build')
        .description('Compile react application or library (work with create-react-app v5.0.1)')
        .argument('<app|lib|dll>', '"app" stands for building a complete application like create-react-app,\n' +
        '"lib" stands for building a library')
        .argument('[packages_or_entries...]', '(multiple) target packages, the "scope" name part can be omitted, or entry file path (for DLL), or module name (for DLL)')
        .option('-w, --watch', 'when argument is "lib", watch file changes and compile', false)
        .option('--ref-dll,--rd <manifest-file>', 'Reference to DLL manifest file, file can be absolute or relative path to "dist" directory', arrayOptionFn, [])
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set "external" property of Webpack configuration for all request not begin with "." (not relative path), ' +
        'meaning all non-relative modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i \'^someLib(/|$)\' -i \'^someLib2(/|$)\' -i ...) ' +
        ' to make them be included in bundle file. To make specific module (React) external: -i \'^(?!react(-dom)?($|/))\'', arrayOptionFn, [])
        .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
        .action((type, entries) => {
        if (process.cwd() !== path_1.default.resolve(plink_2.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_2.plinkEnv.workDir));
        }
        runReactScripts(buildCmd.name(), buildCmd.opts(), type, entries);
        require('react-scripts/scripts/build');
    });
    withClicOpt(buildCmd);
    program.command('cra-build-tsd <package-name>')
        .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
        'command "cra-build" will also generate tsd file along with client bundle')
        .argument('package-name', 'target package name, the "scope" name part can be omitted')
        .action(async (pkgName) => {
        runReactScripts(StartCmd.name(), StartCmd.opts(), 'lib', pkgName);
        await (await import('../tsd-generate.js')).buildTsd([pkgName]);
    });
    const StartCmd = program.command('cra-start')
        .argument('<packages_or_entries...>', '(multiple) target packages, the "scope" name part can be omitted, or entry file path').description('Run CRA start script for react application or library (work with create-react-app v5.0.1)')
        .option('--rd, --ref-dll <manifest-file>', 'Reference to DLL manifest file, file can be absolute or relative path to "dist" directory', (v, p) => { p.push(v); return p; }, [])
        .option('--use-poll, --poll', 'use Webpack watch option "poll"', false)
        .option('--no-ts-checker, --no-tsck', 'disable forked-ts-checker-webpack-plugin for Typescript', false)
        .action((entries) => {
        if (process.cwd() !== path_1.default.resolve(plink_2.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_2.plinkEnv.workDir));
        }
        runReactScripts(StartCmd.name(), StartCmd.opts(), 'app', entries);
        require('react-scripts/scripts/start');
    });
    withClicOpt(StartCmd);
    program.command('cra-open <url>')
        .argument('<url>', 'The URL')
        .description('Run react-dev-utils/openBrowser')
        .action(async (url) => {
        (await import('../cra-open-browser.cjs')).default.default(url);
    });
    program.command('cra-analyze')
        .alias('cra-analyse')
        .argument('[js-dir]', 'Normally this path should be <root-dir>dist/static/<output-path-basename>/static/js')
        .description('Run source-map-explorer')
        .action(async (outputPath) => {
        const smePkgDir = path_1.default.dirname(require.resolve('source-map-explorer/package.json'));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const smeBin = require(path_1.default.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'];
        await new Promise((resolve, rej) => {
            const cp = (0, child_process_1.fork)(path_1.default.resolve(smePkgDir, smeBin), [
                '--gzip', '--no-root',
                path_1.default.resolve(outputPath ? outputPath : '', '*.js')
            ], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
            cp.on('error', err => {
                console.error(err);
                rej(err);
            });
            cp.on('exit', (_sign, code) => { resolve(code); });
        });
    });
};
exports.default = cli;
function withClicOpt(cmd) {
    cmd.option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', undefined);
}
function arrayOptionFn(curr, prev) {
    if (prev)
        prev.push(curr);
    return prev;
}
function runReactScripts(cmdName, opts, type, entries) {
    var _a, _b;
    plink_2.dispatcher.changeActionOnExit('none');
    if (entries.length === 0 && ((_a = (0, cra_scripts_setting_1.getSetting)().entries) === null || _a === void 0 ? void 0 : _a.length) != null) {
        entries = (_b = (0, cra_scripts_setting_1.getSetting)().entries) !== null && _b !== void 0 ? _b : [];
    }
    if (entries.length == 0) {
        throw new Error('Specifiy at least one "[packages_or_entries]" argument in command line or respective property in "-c" setting file');
    }
    const packageLocator = (0, plink_1.packageOfFileFactory)();
    const cfg = plink_2.config;
    const targetEntries = entries.map(entry => {
        var _a;
        const pkg = [...(0, plink_1.findPackagesByNames)([entry])][0];
        if (pkg) {
            if (pkg.json.plink || pkg.json.dr) {
                // It is a Plink package
                return { pkg };
            }
            else {
                // It is a 3rd-party package
                return { file: entry };
            }
        }
        else {
            const file = path_1.default.resolve(entry);
            const pkg = (_a = packageLocator.getPkgOfFile(file)) === null || _a === void 0 ? void 0 : _a.orig;
            if (pkg && (pkg.json.plink || pkg.json.dr)) {
                return { pkg, file };
            }
            else {
                return { file };
            }
        }
    });
    (0, utils_1.saveCmdOptionsToEnv)(cmdName, opts, type, targetEntries);
    if (process.env.PORT == null && cfg().port)
        process.env.PORT = cfg().port + '';
    if (!['app', 'lib', 'dll'].includes(type)) {
        log.error('type argument must be one of \'app\', \'lib\', \'dll\'');
        return;
    }
    const preload = require('../preload');
    preload.poo();
}
//# sourceMappingURL=cli.js.map