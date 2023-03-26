#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const tslib_1 = require("tslib");
// import fs from 'fs';
const path_1 = tslib_1.__importDefault(require("path"));
const child_process_1 = require("child_process");
const plink_1 = require("@wfh/plink");
const utils_1 = require("../utils");
const log = (0, plink_1.log4File)(__filename);
const cli = (program) => {
    const buildCmd = program.command('cra-build')
        .description('Compile react application or library (work with create-react-app v5.0.1)')
        .argument('<app|lib>', '"app" stands for building a complete application like create-react-app,\n' +
        '"lib" stands for building a library')
        .argument('<package-name>', 'target package name, the "scope" name part can be omitted')
        .option('-w, --watch', 'when argument is "lib", watch file changes and compile', false)
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set "external" property of Webpack configuration for all request not begin with "." (not relative path), ' +
        'meaning all non-relative modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i \'^someLib(/|$)\' -i \'^someLib2(/|$)\' -i ...) ' +
        ' to make them be included in bundle file. To make specific module (React) external: -i \'^(?!react(-dom)?($|/))\'', arrayOptionFn, [])
        .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
        .action((type, pkgName) => {
        if (process.cwd() !== path_1.default.resolve(plink_1.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_1.plinkEnv.workDir));
        }
        runReactScripts(buildCmd.name(), buildCmd.opts(), type, pkgName);
        require('react-scripts/scripts/build');
    });
    withClicOpt(buildCmd);
    program.command('cra-build-tsd <package-name>')
        .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
        'command "cra-build" will also generate tsd file along with client bundle', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action(async (pkgName) => {
        runReactScripts(StartCmd.name(), StartCmd.opts(), 'lib', pkgName);
        await (await Promise.resolve().then(() => tslib_1.__importStar(require('../tsd-generate')))).buildTsd([pkgName]);
    });
    const StartCmd = program.command('cra-start')
        .argument('<package-name>', 'target package name, the "scope" name part can be omitted')
        .description('Run CRA start script for react application or library (work with create-react-app v5.0.1)')
        .action((pkgName) => {
        if (process.cwd() !== path_1.default.resolve(plink_1.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_1.plinkEnv.workDir));
        }
        runReactScripts(StartCmd.name(), StartCmd.opts(), 'app', pkgName);
        require('react-scripts/scripts/start');
    });
    withClicOpt(StartCmd);
    program.command('cra-open <url>')
        .description('Run react-dev-utils/openBrowser', { url: 'URL' })
        .action(async (url) => {
        (await Promise.resolve().then(() => tslib_1.__importStar(require('../cra-open-browser')))).default(url);
    });
    program.command('cra-analyze [js-dir]')
        .alias('cra-analyse')
        .description('Run source-map-explorer', {
        'js-dir': 'Normally this path should be <root-dir>dist/static/<output-path-basename>/static/js'
    })
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
function runReactScripts(cmdName, opts, type, pkgName) {
    const cfg = plink_1.config;
    (0, utils_1.saveCmdOptionsToEnv)(pkgName, cmdName, opts, type);
    if (process.env.PORT == null && cfg().port)
        process.env.PORT = cfg().port + '';
    if (!['app', 'lib'].includes(type)) {
        log.error('type argument must be one of \'app\', \'lib\'');
        return;
    }
    const preload = require('../preload');
    preload.poo();
}
//# sourceMappingURL=cli.js.map