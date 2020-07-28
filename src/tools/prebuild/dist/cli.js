#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
require('source-map-support/register');
const commander_1 = require("commander");
const package_json_1 = tslib_1.__importDefault(require("../package.json"));
const path_1 = tslib_1.__importDefault(require("path"));
const cfg = require('dr-comp-package/wfh/lib/config.js');
const logConfig = require('dr-comp-package/wfh/lib/logConfig.js');
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
// import * as astUtil from './cli-ts-ast-util';
const program = new commander_1.Command().name('prebuild');
program.version(package_json_1.default.version);
program.option('-c, --config <config-file>', 'Read config files, if there are multiple files, the latter one overrides previous one', (curr, prev) => prev.concat(curr), []);
program.option('--prop <property-path=value as JSON | literal>', '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n', (curr, prev) => prev.concat(curr), []);
program.option('--secret <credential code>', 'credential code for deploy to "prod" environment');
// ----------- deploy ----------
const deployCmd = program.command('deploy <app> [ts-scripts#function-or-shell]')
    .option('--static', 'as an static resource build', false)
    .option('--no-push-branch', 'push to release branch', false)
    // .option('--secret <secret>', 'credential word')
    .action((app, scriptsFile) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const opt = deployCmd.opts();
    yield cfg.init({
        c: program.opts().config.length === 0 ? undefined : program.opts().config,
        prop: program.opts().prop
    });
    logConfig(cfg());
    package_runner_1.prepareLazyNodeInjector({});
    const cliDeploy = require('./cli-deploy').default;
    yield cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, program.opts().secret || null, scriptsFile);
}));
createEnvOption(deployCmd);
// -------- githash ----------
const githashCmd = createEnvOption(program.command('githash'), false)
    .action(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const Artifacts = require('./artifacts');
    if (githashCmd.opts().env) {
        // tslint:disable-next-line: no-console
        console.log(yield Artifacts.stringifyListVersions(githashCmd.opts().env));
    }
    else {
        // tslint:disable-next-line: no-console
        console.log(yield Artifacts.stringifyListAllVersions());
    }
}));
// ------ send --------
const sendCmd = createEnvOption(program.command('send <app-name> <zip-file>'))
    .description('Send static resource to remote server')
    .action((appName, zip) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    yield cfg.init({
        c: program.opts().config.length === 0 ? undefined : program.opts().config,
        prop: program.opts().prop
    });
    logConfig(cfg());
    package_runner_1.prepareLazyNodeInjector({});
    yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, program.opts().secret);
}));
// ------ mockzip --------
const mockzipCmd = program.command('mockzip');
mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
mockzipCmd.action(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    yield cfg.init({
        c: program.opts().config.length === 0 ? undefined : program.opts().config,
        prop: program.opts().prop
    });
    logConfig(cfg());
    const Artifacts = require('./artifacts');
    const fileContent = '' + new Date().toUTCString();
    const file = mockzipCmd.opts().dir ? path_1.default.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : cfg.resolve('destDir', 'prebuild-mock.zip');
    fs_extra_1.default.mkdirpSync(path_1.default.dirname(file));
    yield Artifacts.writeMockZip(file, fileContent);
    const log = log4js_1.default.getLogger('prebuild');
    // tslint:disable-next-line: no-console
    log.info('Mock zip:', file);
}));
// ---------- keypair ------------
const keypairCmd = program.command('keypair [file-name]')
    .description('Generate a new asymmetric key pair')
    .action((fileName) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const genKeypair = require('./cli-keypair').default;
    yield genKeypair(fileName, keypairCmd.opts());
}));
const tsAstCmd = program.command('ts-ast <ts-file>')
    .option('--no-type', 'do not print AST type', false)
    .option('-q|--query <selector>', 'query selector', undefined)
    .description('Print Typescript AST structure')
    .action((filename) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const astQ = yield Promise.resolve().then(() => tslib_1.__importStar(require('./ts-ast-query')));
    // const printFile: (typeof tsAstQuery)['printFile'] = require('./ts-ast-query').printFile;
    astQ.printFile(filename, tsAstCmd.opts().query, tsAstCmd.opts().type);
}));
program.command('functions <file>')
    .description('List exported functions for *.ts, *.d.ts, *.js file')
    .action((file) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    (yield Promise.resolve().then(() => tslib_1.__importStar(require('./cli-ts-ast-util')))).listExportedFunction(file);
}));
// -------- listzip --------
program.command('listzip <file>')
    .description('List zip file content and size')
    .action((file) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const { listZip } = require('./cli-unzip');
    yield listZip(file);
}));
program.description(chalk_1.default.cyanBright('Prebuild and deploy static resource to file server and compile node server side TS files'));
program.parseAsync(process.argv)
    .catch(e => {
    console.error(e);
    process.exit(1);
});
function createEnvOption(cmd, required = true) {
    const func = required ? cmd.requiredOption : cmd.option;
    return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}

//# sourceMappingURL=cli.js.map
