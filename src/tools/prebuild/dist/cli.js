#!/usr/bin/env node
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("dr-comp-package/wfh/dist/config"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const log4js_1 = __importDefault(require("log4js"));
const bootstrap_server_1 = require("dr-comp-package/wfh/dist/utils/bootstrap-server");
const package_runner_1 = require("dr-comp-package/wfh/dist/package-runner");
// import * as astUtil from './cli-ts-ast-util';
const cliExt = (program, withGlobalOptions) => {
    // ----------- deploy ----------
    const deployCmd = program.command('deploy <app> [ts-scripts#function-or-shell]')
        .option('--static', 'as an static resource build', false)
        .option('--no-push-branch', 'push to release branch', false)
        // .option('--secret <secret>', 'credential word')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .action((app, scriptsFile) => __awaiter(void 0, void 0, void 0, function* () {
        const opt = deployCmd.opts();
        yield bootstrap_server_1.initConfigAsync(deployCmd.opts());
        (yield Promise.resolve().then(() => __importStar(require('dr-comp-package/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
        const cliDeploy = require('./cli-deploy').default;
        yield cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, deployCmd.opts().secret || null, scriptsFile);
    }));
    createEnvOption(deployCmd);
    withGlobalOptions(deployCmd);
    // -------- githash ----------
    const githashCmd = createEnvOption(program.command('githash'), false)
        .action(() => __awaiter(void 0, void 0, void 0, function* () {
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
    withGlobalOptions(githashCmd);
    // ------ send --------
    const sendCmd = createEnvOption(program.command('send <app-name> <zip-file>'))
        .description('Send static resource to remote server')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .action((appName, zip) => __awaiter(void 0, void 0, void 0, function* () {
        yield bootstrap_server_1.initConfigAsync(sendCmd.opts());
        (yield Promise.resolve().then(() => __importStar(require('dr-comp-package/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
        yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, sendCmd.opts().secret);
    }));
    withGlobalOptions(sendCmd);
    // ------ mockzip --------
    const mockzipCmd = program.command('mockzip');
    mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
    mockzipCmd.action(() => __awaiter(void 0, void 0, void 0, function* () {
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
    withGlobalOptions(mockzipCmd);
    // ---------- keypair ------------
    const keypairCmd = program.command('keypair [file-name]')
        .description('Generate a new asymmetric key pair')
        .action((fileName) => __awaiter(void 0, void 0, void 0, function* () {
        const genKeypair = require('./cli-keypair').default;
        yield genKeypair(fileName, keypairCmd.opts());
    }));
    const tsAstCmd = program.command('ts-ast <ts-file>')
        .option('--no-type', 'do not print AST type', false)
        .option('-q|--query <selector>', 'query selector', undefined)
        .description('Print Typescript AST structure')
        .action((filename) => __awaiter(void 0, void 0, void 0, function* () {
        const astQ = yield Promise.resolve().then(() => __importStar(require('./ts-ast-query')));
        // const printFile: (typeof tsAstQuery)['printFile'] = require('./ts-ast-query').printFile;
        astQ.printFile(filename, tsAstCmd.opts().query, tsAstCmd.opts().type);
    }));
    program.command('functions <file>')
        .description('List exported functions for *.ts, *.d.ts, *.js file')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-ts-ast-util')))).listExportedFunction(file);
    }));
    // -------- listzip --------
    program.command('listzip <file>')
        .description('List zip file content and size')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        const { listZip } = require('./cli-unzip');
        yield listZip(file);
    }));
    const unzipCmd = program.command('unzip <zipFileDirectory>')
        .description('Extract all zip files from specific directory')
        .requiredOption('-d,--dest <dir>', 'destination directory')
        .action((zipFileDirectory) => __awaiter(void 0, void 0, void 0, function* () {
        yield bootstrap_server_1.initConfigAsync(unzipCmd.opts());
        package_runner_1.prepareLazyNodeInjector({});
        const { forkExtractExstingZip } = yield Promise.resolve().then(() => __importStar(require('@dr-core/assets-processer/dist/fetch-remote')));
        yield forkExtractExstingZip(zipFileDirectory, path_1.default.resolve(unzipCmd.opts().dest), true);
    }));
    withGlobalOptions(unzipCmd);
};
exports.default = cliExt;
function createEnvOption(cmd, required = true) {
    const func = required ? cmd.requiredOption : cmd.option;
    return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}

//# sourceMappingURL=cli.js.map
