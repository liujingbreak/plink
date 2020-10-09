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
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const log4js_1 = __importDefault(require("log4js"));
const dist_1 = require("@wfh/plink/wfh/dist");
const package_runner_1 = require("@wfh/plink/wfh/dist/package-runner");
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
        yield dist_1.initConfigAsync(deployCmd.opts());
        (yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
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
        yield dist_1.initConfigAsync(sendCmd.opts());
        (yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
        yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, sendCmd.opts().secret);
    }));
    withGlobalOptions(sendCmd);
    // ------ mockzip --------
    const mockzipCmd = program.command('mockzip');
    mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
    mockzipCmd.action(() => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(mockzipCmd.opts());
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
        yield dist_1.initConfigAsync(unzipCmd.opts());
        package_runner_1.prepareLazyNodeInjector({});
        const { forkExtractExstingZip } = yield Promise.resolve().then(() => __importStar(require('@wfh/assets-processer/dist/fetch-remote')));
        yield forkExtractExstingZip(zipFileDirectory, path_1.default.resolve(unzipCmd.opts().dest), true);
    }));
    withGlobalOptions(unzipCmd);
};
exports.default = cliExt;
function createEnvOption(cmd, required = true) {
    const func = required ? cmd.requiredOption : cmd.option;
    return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3Rvb2xzL3ByZWJ1aWxkL3RzL2NsaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLGdEQUF3QjtBQUN4Qix3RUFBNkM7QUFHN0Msd0RBQTBCO0FBSTFCLG9EQUE0QjtBQUU1Qiw4Q0FBaUY7QUFDakYsdUVBQTJFO0FBSTNFLGdEQUFnRDtBQUVoRCxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsRUFBRTtJQUUxRCxnQ0FBZ0M7SUFDaEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2Q0FBNkMsQ0FBQztTQUMvRSxNQUFNLENBQUMsVUFBVSxFQUFFLDZCQUE2QixFQUFFLEtBQUssQ0FBQztTQUN4RCxNQUFNLENBQUMsa0JBQWtCLEVBQUUsd0JBQXdCLEVBQUUsS0FBSyxDQUFDO1FBQzVELGtEQUFrRDtTQUNqRCxNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUM7U0FDeEYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFdBQW9CLEVBQUUsRUFBRTtRQUNsRCxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0IsTUFBTSxzQkFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQW1CLENBQUMsQ0FBQztRQUN6RCxDQUFDLHdEQUFhLG9DQUFvQyxHQUFDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVqRixNQUFNLFNBQVMsR0FBSSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBNkIsQ0FBQztRQUN6RSxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sSUFB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QUFFO1FBQ25CLENBQUMsd0RBQWEsbUJBQW1CLEdBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCw0QkFBNEI7SUFDNUIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztTQUNoQyxXQUFXLENBQUMsZ0NBQWdDLENBQUM7U0FDN0MsTUFBTSxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUU7UUFDbkIsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFrQixPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDeEQsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDdEIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUM7U0FDM0QsV0FBVyxDQUFDLCtDQUErQyxDQUFDO1NBQzVELGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSx1QkFBdUIsQ0FBQztTQUMxRCxNQUFNLENBQUMsQ0FBTyxnQkFBd0IsRUFBRSxFQUFFO1FBQ3pDLE1BQU0sc0JBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDeEQsd0NBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUIsTUFBTSxFQUFDLHFCQUFxQixFQUFDLEdBQUcsd0RBQWEseUNBQXlDLEdBQUMsQ0FBQztRQUN4RixNQUFNLHFCQUFxQixDQUFDLGdCQUFnQixFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUM7QUFFZ0IseUJBQU87QUFHekIsU0FBUyxlQUFlLENBQUMsR0FBc0IsRUFBRSxRQUFRLEdBQUcsSUFBSTtJQUM5RCxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7SUFDeEQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSwyQ0FBMkMsRUFBRSw4RkFBOEYsQ0FBQyxDQUFDO0FBQ3JLLENBQUMiLCJmaWxlIjoidG9vbHMvcHJlYnVpbGQvZGlzdC9jbGkuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
