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
// import * as astUtil from './cli-ts-ast-util';
const cliExt = (program, withGlobalOptions) => {
    // ----------- deploy ----------
    const deployCmd = program.command('deploy <app-name> [ts-scripts#function-or-shell]')
        .description('Deploy (for Plink internally)')
        .option('--push,--static', 'push to remote file server after build script execution finished', false)
        .option('--no-push-branch', 'Do not push to release branch', false)
        // .option('--secret <secret>', 'credential word')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .option('--cc <commit comment>', 'The commit comment of the deployment commit')
        .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1', false)
        .action((app, scriptsFile) => __awaiter(void 0, void 0, void 0, function* () {
        const opt = deployCmd.opts();
        yield dist_1.initConfigAsync(deployCmd.opts());
        // (await import('@wfh/plink/wfh/dist/package-runner')).prepareLazyNodeInjector({});
        const cliDeploy = require('./cli-deploy').default;
        const log = log4js_1.default.getLogger('prebuild');
        log.info('commit comment:', deployCmd.opts().cc);
        yield cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, deployCmd.opts().force, deployCmd.opts().secret || null, scriptsFile, deployCmd.opts().cc);
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
    const sendCmd = createEnvOption(program.command('send <app-name> <zipFileOrDir>'))
        .description('Send static resource to remote server')
        .option('--con <number of concurrent request>', 'Send file with concurrent process for multiple remote server nodes', '1')
        .option('--nodes <number of remote nodes>', 'Number of remote server nodes', '1')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1', false)
        .action((appName, zip) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(sendCmd.opts());
        // (await import('@wfh/plink/wfh/dist/package-runner')).prepareLazyNodeInjector({});
        yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, parseInt(sendCmd.opts().con, 10), parseInt(sendCmd.opts().nodes, 10), sendCmd.opts().force, sendCmd.opts().secret);
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
    // // -------- listzip --------
    // program.command('listzip <file>')
    // .description('List zip file content and size')
    // .action(async file => {
    //   const {listZip}: typeof _unzip = require('./cli-unzip');
    //   await listZip(file);
    // });
    // // -------- unzip --------
    // const unzipCmd = program.command('unzip <zipFileDirectory>')
    // .description('Extract all zip files from specific directory')
    // .requiredOption('-d,--dest <dir>', 'destination directory')
    // .action(async (zipFileDirectory: string) => {
    //   await initConfigAsync(unzipCmd.opts() as GlobalOptions);
    //   prepareLazyNodeInjector({});
    //   const {forkExtractExstingZip} = await import('@wfh/assets-processer/dist/fetch-remote');
    //   await forkExtractExstingZip(zipFileDirectory, Path.resolve(unzipCmd.opts().dest), true);
    // });
    // withGlobalOptions(unzipCmd);
};
exports.default = cliExt;
function createEnvOption(cmd, required = true) {
    const func = required ? cmd.requiredOption : cmd.option;
    return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsZ0RBQXdCO0FBQ3hCLHdFQUE2QztBQUc3Qyx3REFBMEI7QUFJMUIsb0RBQTRCO0FBRTVCLDhDQUFpRjtBQUtqRixnREFBZ0Q7QUFFaEQsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUU7SUFFMUQsZ0NBQWdDO0lBQ2hDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0RBQWtELENBQUM7U0FDcEYsV0FBVyxDQUFDLCtCQUErQixDQUFDO1NBQzVDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxrRUFBa0UsRUFBRSxLQUFLLENBQUM7U0FDcEcsTUFBTSxDQUFDLGtCQUFrQixFQUFFLCtCQUErQixFQUFFLEtBQUssQ0FBQztRQUNuRSxrREFBa0Q7U0FDakQsTUFBTSxDQUFDLDRCQUE0QixFQUFFLGtEQUFrRCxDQUFDO1NBQ3hGLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSw2Q0FBNkMsQ0FBQztTQUM5RSxNQUFNLENBQUMsU0FBUyxFQUFFLHVJQUF1SSxFQUN4SixLQUFLLENBQUM7U0FDUCxNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsV0FBb0IsRUFBRSxFQUFFO1FBQ2xELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM3QixNQUFNLHNCQUFlLENBQUMsU0FBUyxDQUFDLElBQUksRUFBbUIsQ0FBQyxDQUFDO1FBQ3pELG9GQUFvRjtRQUVwRixNQUFNLFNBQVMsR0FBSSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBNkIsQ0FBQztRQUN6RSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN6QyxHQUFHLENBQUMsSUFBSSxDQUFDLGlCQUFpQixFQUFF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QUk7SUFDOUQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3hELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsMkNBQTJDLEVBQUUsOEZBQThGLENBQUMsQ0FBQztBQUNySyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2ZnIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnJztcbmltcG9ydCAqIGFzIF9BcnRpZmFjdHMgZnJvbSAnLi9hcnRpZmFjdHMnO1xuaW1wb3J0ICogYXMgc3AgZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3ByZWJ1aWxkUG9zdCBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuLy8gaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBfY2xpRGVwbG95IGZyb20gJy4vY2xpLWRlcGxveSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgX2dlbktleXBhaXIgZnJvbSAnLi9jbGkta2V5cGFpcic7XG5pbXBvcnQge0NsaUV4dGVuc2lvbiwgR2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0Jztcbi8vIGltcG9ydCB7cHJlcGFyZUxhenlOb2RlSW5qZWN0b3J9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInO1xuXG4vLyBpbXBvcnQgKiBhcyB0c0FzdFF1ZXJ5IGZyb20gJy4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIF91bnppcCBmcm9tICcuL2NsaS11bnppcCc7XG4vLyBpbXBvcnQgKiBhcyBhc3RVdGlsIGZyb20gJy4vY2xpLXRzLWFzdC11dGlsJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSwgd2l0aEdsb2JhbE9wdGlvbnMpID0+IHtcblxuICAvLyAtLS0tLS0tLS0tLSBkZXBsb3kgLS0tLS0tLS0tLVxuICBjb25zdCBkZXBsb3lDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2RlcGxveSA8YXBwLW5hbWU+IFt0cy1zY3JpcHRzI2Z1bmN0aW9uLW9yLXNoZWxsXScpXG4gIC5kZXNjcmlwdGlvbignRGVwbG95IChmb3IgUGxpbmsgaW50ZXJuYWxseSknKVxuICAub3B0aW9uKCctLXB1c2gsLS1zdGF0aWMnLCAncHVzaCB0byByZW1vdGUgZmlsZSBzZXJ2ZXIgYWZ0ZXIgYnVpbGQgc2NyaXB0IGV4ZWN1dGlvbiBmaW5pc2hlZCcsIGZhbHNlKVxuICAub3B0aW9uKCctLW5vLXB1c2gtYnJhbmNoJywgJ0RvIG5vdCBwdXNoIHRvIHJlbGVhc2UgYnJhbmNoJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0tc2VjcmV0IDxzZWNyZXQ+JywgJ2NyZWRlbnRpYWwgd29yZCcpXG4gIC5vcHRpb24oJy0tc2VjcmV0IDxjcmVkZW50aWFsIGNvZGU+JywgJ2NyZWRlbnRpYWwgY29kZSBmb3IgZGVwbG95IHRvIFwicHJvZFwiIGVudmlyb25tZW50JylcbiAgLm9wdGlvbignLS1jYyA8Y29tbWl0IGNvbW1lbnQ+JywgJ1RoZSBjb21taXQgY29tbWVudCBvZiB0aGUgZGVwbG95bWVudCBjb21taXQnKVxuICAub3B0aW9uKCctLWZvcmNlJywgJ0ZvcmNlIG92ZXJ3cml0aW5nIHJlbW90ZSB6aXAgYXNzZXRzIHdpdGhvdXQgU0hBMSBjaGVja3N1bSBjb21wYXJpc29uLCBieSBkZWZhdWx0IHJlbW90ZSBzZXJ2ZXIgd2lsbCByZWplY3QgZmlsZSBvZiBleGlzdGluZyBzYW1lIFNIQTEnLFxuICAgIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChhcHA6IHN0cmluZywgc2NyaXB0c0ZpbGU/OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBvcHQgPSBkZXBsb3lDbWQub3B0cygpO1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhkZXBsb3lDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIC8vIChhd2FpdCBpbXBvcnQoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInKSkucHJlcGFyZUxhenlOb2RlSW5qZWN0b3Ioe30pO1xuXG4gICAgY29uc3QgY2xpRGVwbG95ID0gKHJlcXVpcmUoJy4vY2xpLWRlcGxveScpLmRlZmF1bHQgYXMgdHlwZW9mIF9jbGlEZXBsb3kpO1xuICAgIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3ByZWJ1aWxkJyk7XG4gICAgbG9nLmluZm8oJ2NvbW1pdCBjb21tZW50OicsIGRlcGxveUNtZC5vcHRzKCkuY2MpO1xuICAgIGF3YWl0IGNsaURlcGxveShvcHQuc3RhdGljLCBvcHQuZW52LCBhcHAsIGRlcGxveUNtZC5vcHRzKCkucHVzaEJyYW5jaCwgZGVwbG95Q21kLm9wdHMoKS5mb3JjZSAsIGRlcGxveUNtZC5vcHRzKCkuc2VjcmV0IHx8IG51bGwsIHNjcmlwdHNGaWxlLFxuICAgICAgZGVwbG95Q21kLm9wdHMoKS5jYyk7XG4gIH0pO1xuICBjcmVhdGVFbnZPcHRpb24oZGVwbG95Q21kKTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoZGVwbG95Q21kKTtcblxuICAvLyAtLS0tLS0tLSBnaXRoYXNoIC0tLS0tLS0tLS1cbiAgY29uc3QgZ2l0aGFzaENtZCA9IGNyZWF0ZUVudk9wdGlvbihwcm9ncmFtLmNvbW1hbmQoJ2dpdGhhc2gnKSwgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IEFydGlmYWN0czogdHlwZW9mIF9BcnRpZmFjdHMgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpO1xuICAgIGlmIChnaXRoYXNoQ21kLm9wdHMoKS5lbnYpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYXdhaXQgQXJ0aWZhY3RzLnN0cmluZ2lmeUxpc3RWZXJzaW9ucyhnaXRoYXNoQ21kLm9wdHMoKS5lbnYpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhhd2FpdCBBcnRpZmFjdHMuc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICAgIH1cbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGdpdGhhc2hDbWQpO1xuXG4gIC8vIC0tLS0tLSBzZW5kIC0tLS0tLS0tXG4gIGNvbnN0IHNlbmRDbWQgPSBjcmVhdGVFbnZPcHRpb24ocHJvZ3JhbS5jb21tYW5kKCdzZW5kIDxhcHAtbmFtZT4gPHppcEZpbGVPckRpcj4nKSlcbiAgLmRlc2NyaXB0aW9uKCdTZW5kIHN0YXRpYyByZXNvdXJjZSB0byByZW1vdGUgc2VydmVyJylcbiAgLm9wdGlvbignLS1jb24gPG51bWJlciBvZiBjb25jdXJyZW50IHJlcXVlc3Q+JywgJ1NlbmQgZmlsZSB3aXRoIGNvbmN1cnJlbnQgcHJvY2VzcyBmb3IgbXVsdGlwbGUgcmVtb3RlIHNlcnZlciBub2RlcycsICcxJylcbiAgLm9wdGlvbignLS1ub2RlcyA8bnVtYmVyIG9mIHJlbW90ZSBub2Rlcz4nLCAnTnVtYmVyIG9mIHJlbW90ZSBzZXJ2ZXIgbm9kZXMnLCAnMScpXG4gIC5vcHRpb24oJy0tc2VjcmV0IDxjcmVkZW50aWFsIGNvZGU+JywgJ2NyZWRlbnRpYWwgY29kZSBmb3IgZGVwbG95IHRvIFwicHJvZFwiIGVudmlyb25tZW50JylcbiAgLm9wdGlvbignLS1mb3JjZScsICdGb3JjZSBvdmVyd3JpdGluZyByZW1vdGUgemlwIGFzc2V0cyB3aXRob3V0IFNIQTEgY2hlY2tzdW0gY29tcGFyaXNvbiwgYnkgZGVmYXVsdCByZW1vdGUgc2VydmVyIHdpbGwgcmVqZWN0IGZpbGUgb2YgZXhpc3Rpbmcgc2FtZSBTSEExJyxcbiAgICBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoYXBwTmFtZTogc3RyaW5nLCB6aXA6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhzZW5kQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICAvLyAoYXdhaXQgaW1wb3J0KCdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtcnVubmVyJykpLnByZXBhcmVMYXp5Tm9kZUluamVjdG9yKHt9KTtcblxuICAgIGF3YWl0IChyZXF1aXJlKCcuL19zZW5kLXBhdGNoJykgYXMgdHlwZW9mIHNwKS5zZW5kKHNlbmRDbWQub3B0cygpLmVudiwgYXBwTmFtZSwgemlwLFxuICAgIHBhcnNlSW50KHNlbmRDbWQub3B0cygpLmNvbiwgMTApLFxuICAgIHBhcnNlSW50KHNlbmRDbWQub3B0cygpLm5vZGVzLCAxMCksXG4gICAgc2VuZENtZC5vcHRzKCkuZm9yY2UsXG4gICAgc2VuZENtZC5vcHRzKCkuc2VjcmV0KTtcbiAgfSk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKHNlbmRDbWQpO1xuXG4gIC8vIC0tLS0tLSBtb2NremlwIC0tLS0tLS0tXG4gIGNvbnN0IG1vY2t6aXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ21vY2t6aXAnKTtcbiAgbW9ja3ppcENtZC5vcHRpb24oJy1kLC0tZGlyIDxkaXI+JywgJ2NyZWF0ZSBhIG1vY2sgemlwIGZpbGUgaW4gc3BlY2lmaWMgZGlyZWN0b3J5Jyk7XG4gIG1vY2t6aXBDbWQuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBpbml0Q29uZmlnQXN5bmMobW9ja3ppcENtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG5cbiAgICBjb25zdCBBcnRpZmFjdHM6IHR5cGVvZiBfQXJ0aWZhY3RzID0gcmVxdWlyZSgnLi9hcnRpZmFjdHMnKTtcblxuICAgIGNvbnN0IGZpbGVDb250ZW50ID0gJycgKyBuZXcgRGF0ZSgpLnRvVVRDU3RyaW5nKCk7XG5cbiAgICBjb25zdCBmaWxlID0gbW9ja3ppcENtZC5vcHRzKCkuZGlyID8gUGF0aC5yZXNvbHZlKG1vY2t6aXBDbWQub3B0cygpLmRpciwgJ3ByZWJ1aWxkLW1vY2suemlwJykgOiBjZmcucmVzb2x2ZSgnZGVzdERpcicsICdwcmVidWlsZC1tb2NrLnppcCcpO1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGZpbGUpKTtcblxuICAgIGF3YWl0IEFydGlmYWN0cy53cml0ZU1vY2taaXAoZmlsZSwgZmlsZUNvbnRlbnQpO1xuICAgIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3ByZWJ1aWxkJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ01vY2sgemlwOicsIGZpbGUpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMobW9ja3ppcENtZCk7XG5cbiAgLy8gLS0tLS0tLS0tLSBrZXlwYWlyIC0tLS0tLS0tLS0tLVxuICBjb25zdCBrZXlwYWlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdrZXlwYWlyIFtmaWxlLW5hbWVdJylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIG5ldyBhc3ltbWV0cmljIGtleSBwYWlyJylcbiAgLmFjdGlvbihhc3luYyAoZmlsZU5hbWUpID0+IHtcbiAgICBjb25zdCBnZW5LZXlwYWlyID0gcmVxdWlyZSgnLi9jbGkta2V5cGFpcicpLmRlZmF1bHQgYXMgdHlwZW9mIF9nZW5LZXlwYWlyO1xuICAgIGF3YWl0IGdlbktleXBhaXIoZmlsZU5hbWUsIGtleXBhaXJDbWQub3B0cygpKTtcbiAgfSk7XG5cbiAgY29uc3QgdHNBc3RDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RzLWFzdCA8dHMtZmlsZT4nKVxuICAub3B0aW9uKCctLW5vLXR5cGUnLCAnZG8gbm90IHByaW50IEFTVCB0eXBlJywgZmFsc2UpXG4gIC5vcHRpb24oJy1xfC0tcXVlcnkgPHNlbGVjdG9yPicsICdxdWVyeSBzZWxlY3RvcicsIHVuZGVmaW5lZClcbiAgLmRlc2NyaXB0aW9uKCdQcmludCBUeXBlc2NyaXB0IEFTVCBzdHJ1Y3R1cmUnKVxuICAuYWN0aW9uKGFzeW5jIGZpbGVuYW1lID0+IHtcbiAgICBjb25zdCBhc3RRID0gYXdhaXQgaW1wb3J0KCcuL3RzLWFzdC1xdWVyeScpO1xuICAgIC8vIGNvbnN0IHByaW50RmlsZTogKHR5cGVvZiB0c0FzdFF1ZXJ5KVsncHJpbnRGaWxlJ10gPSByZXF1aXJlKCcuL3RzLWFzdC1xdWVyeScpLnByaW50RmlsZTtcbiAgICBhc3RRLnByaW50RmlsZShmaWxlbmFtZSwgdHNBc3RDbWQub3B0cygpLnF1ZXJ5LCB0c0FzdENtZC5vcHRzKCkudHlwZSBhcyBib29sZWFuKTtcbiAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdmdW5jdGlvbnMgPGZpbGU+JylcbiAgLmRlc2NyaXB0aW9uKCdMaXN0IGV4cG9ydGVkIGZ1bmN0aW9ucyBmb3IgKi50cywgKi5kLnRzLCAqLmpzIGZpbGUnKVxuICAuYWN0aW9uKGFzeW5jIGZpbGUgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLXRzLWFzdC11dGlsJykpLmxpc3RFeHBvcnRlZEZ1bmN0aW9uKGZpbGUpO1xuICB9KTtcblxuICAvLyAvLyAtLS0tLS0tLSBsaXN0emlwIC0tLS0tLS0tXG4gIC8vIHByb2dyYW0uY29tbWFuZCgnbGlzdHppcCA8ZmlsZT4nKVxuICAvLyAuZGVzY3JpcHRpb24oJ0xpc3QgemlwIGZpbGUgY29udGVudCBhbmQgc2l6ZScpXG4gIC8vIC5hY3Rpb24oYXN5bmMgZmlsZSA9PiB7XG4gIC8vICAgY29uc3Qge2xpc3RaaXB9OiB0eXBlb2YgX3VuemlwID0gcmVxdWlyZSgnLi9jbGktdW56aXAnKTtcbiAgLy8gICBhd2FpdCBsaXN0WmlwKGZpbGUpO1xuICAvLyB9KTtcblxuICAvLyAvLyAtLS0tLS0tLSB1bnppcCAtLS0tLS0tLVxuICAvLyBjb25zdCB1bnppcENtZCA9IHByb2dyYW0uY29tbWFuZCgndW56aXAgPHppcEZpbGVEaXJlY3Rvcnk+JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdFeHRyYWN0IGFsbCB6aXAgZmlsZXMgZnJvbSBzcGVjaWZpYyBkaXJlY3RvcnknKVxuICAvLyAucmVxdWlyZWRPcHRpb24oJy1kLC0tZGVzdCA8ZGlyPicsICdkZXN0aW5hdGlvbiBkaXJlY3RvcnknKVxuICAvLyAuYWN0aW9uKGFzeW5jICh6aXBGaWxlRGlyZWN0b3J5OiBzdHJpbmcpID0+IHtcbiAgLy8gICBhd2FpdCBpbml0Q29uZmlnQXN5bmModW56aXBDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAvLyAgIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKHt9KTtcbiAgLy8gICBjb25zdCB7Zm9ya0V4dHJhY3RFeHN0aW5nWmlwfSA9IGF3YWl0IGltcG9ydCgnQHdmaC9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZmV0Y2gtcmVtb3RlJyk7XG4gIC8vICAgYXdhaXQgZm9ya0V4dHJhY3RFeHN0aW5nWmlwKHppcEZpbGVEaXJlY3RvcnksIFBhdGgucmVzb2x2ZSh1bnppcENtZC5vcHRzKCkuZGVzdCksIHRydWUpO1xuICAvLyB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnModW56aXBDbWQpO1xufTtcblxuZXhwb3J0IHtjbGlFeHQgYXMgZGVmYXVsdH07XG5cblxuZnVuY3Rpb24gY3JlYXRlRW52T3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIHJlcXVpcmVkID0gdHJ1ZSk6IFJldHVyblR5cGU8Y29tbWFuZGVyLkNvbW1hbmRbJ3JlcXVpcmVkT3B0aW9uJ10+IHtcbiAgY29uc3QgZnVuYyA9IHJlcXVpcmVkID8gY21kLnJlcXVpcmVkT3B0aW9uIDogY21kLm9wdGlvbjtcbiAgcmV0dXJuIGZ1bmMuY2FsbChjbWQsICctLWVudiA8bG9jYWwgfCBkZXYgfCB0ZXN0IHwgc3RhZ2UgfCBwcm9kPicsICd0YXJnZXQgZW52aXJvbm1lbnQsIGUuZy4gXCJsb2NhbFwiLCBcImRldlwiLCBcInRlc3RcIiwgXCJzdGFnZVwiLCBcInByb2RcIiwgZGVmYXVsdCBhcyBhbGwgZW52aXJvbm1lbnQnKTtcbn1cblxuIl19