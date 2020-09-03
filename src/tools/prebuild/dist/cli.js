#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const commander_1 = require("commander");
const package_json_1 = tslib_1.__importDefault(require("../package.json"));
const path_1 = tslib_1.__importDefault(require("path"));
const config_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/config"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const bootstrap_server_1 = require("dr-comp-package/wfh/dist/utils/bootstrap-server");
// import * as astUtil from './cli-ts-ast-util';
const program = new commander_1.Command().name('prebuild');
program.version(package_json_1.default.version);
// program.option('-c, --config <config-file>',
//   'Read config files, if there are multiple files, the latter one overrides previous one',
//   (curr, prev) => prev.concat(curr), [] as string[]);
// program.option('--prop <property-path=value as JSON | literal>',
//   '<property-path>=<value as JSON | literal> ... directly set configuration properties, property name is lodash.set() path-like string\n e.g.\n',
//   (curr, prev) => prev.concat(curr), [] as string[]);
program.option('--secret <credential code>', 'credential code for deploy to "prod" environment');
// ----------- deploy ----------
const deployCmd = program.command('deploy <app> [ts-scripts#function-or-shell]')
    .option('--static', 'as an static resource build', false)
    .option('--no-push-branch', 'push to release branch', false)
    // .option('--secret <secret>', 'credential word')
    .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
    .action((app, scriptsFile) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const opt = deployCmd.opts();
    yield bootstrap_server_1.initConfigAsync(deployCmd.opts());
    (yield Promise.resolve().then(() => tslib_1.__importStar(require('dr-comp-package/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
    const cliDeploy = require('./cli-deploy').default;
    yield cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, deployCmd.opts().secret || null, scriptsFile);
}));
createEnvOption(deployCmd);
bootstrap_server_1.withGlobalOptions(deployCmd);
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
bootstrap_server_1.withGlobalOptions(githashCmd);
// ------ send --------
const sendCmd = createEnvOption(program.command('send <app-name> <zip-file>'))
    .description('Send static resource to remote server')
    .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
    .action((appName, zip) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    yield bootstrap_server_1.initConfigAsync(sendCmd.opts());
    (yield Promise.resolve().then(() => tslib_1.__importStar(require('dr-comp-package/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
    yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, sendCmd.opts().secret);
}));
bootstrap_server_1.withGlobalOptions(sendCmd);
// ------ mockzip --------
const mockzipCmd = program.command('mockzip');
mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
mockzipCmd.action(() => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    yield bootstrap_server_1.initConfigAsync(mockzipCmd.opts());
    const Artifacts = require('./artifacts');
    const fileContent = '' + new Date().toUTCString();
    const file = mockzipCmd.opts().dir ? path_1.default.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : config_1.default.resolve('destDir', 'prebuild-mock.zip');
    fs_extra_1.default.mkdirpSync(path_1.default.dirname(file));
    yield Artifacts.writeMockZip(file, fileContent);
    const log = log4js_1.default.getLogger('prebuild');
    // tslint:disable-next-line: no-console
    log.info('Mock zip:', file);
}));
bootstrap_server_1.withGlobalOptions(mockzipCmd);
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
