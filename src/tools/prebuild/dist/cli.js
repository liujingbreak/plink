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
        .option('--push,--static', 'push to remote file server after build script execution finished', false)
        .option('--no-push-branch', 'Do not push to release branch', false)
        // .option('--secret <secret>', 'credential word')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .option('--cc <commit comment>', 'The commit comment of the deployment commit')
        .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1', false)
        .action((app, scriptsFile) => __awaiter(void 0, void 0, void 0, function* () {
        const opt = deployCmd.opts();
        yield dist_1.initConfigAsync(deployCmd.opts());
        (yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
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
        (yield Promise.resolve().then(() => __importStar(require('@wfh/plink/wfh/dist/package-runner')))).prepareLazyNodeInjector({});
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsZ0RBQXdCO0FBQ3hCLHdFQUE2QztBQUc3Qyx3REFBMEI7QUFJMUIsb0RBQTRCO0FBRTVCLDhDQUFpRjtBQUtqRixnREFBZ0Q7QUFFaEQsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLEVBQUU7SUFFMUQsZ0NBQWdDO0lBQ2hDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0RBQWtELENBQUM7U0FDcEYsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGtFQUFrRSxFQUFFLEtBQUssQ0FBQztTQUNwRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDO1FBQ25FLGtEQUFrRDtTQUNqRCxNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUM7U0FDeEYsTUFBTSxDQUFDLHVCQUF1QixFQUFFLDZDQUE2QyxDQUFDO1NBQzlFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsdUlBQXVJLEVBQ3hKLEtBQUssQ0FBQztTQUNQLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxXQUFvQixFQUFFLEVBQUU7UUFDbEQsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzdCLE1BQU0sc0JBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDekQsQ0FBQyx3REFBYSxvQ0FBb0MsR0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFakYsTUFBTSxTQUFTLEdBQUksT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQTZCLENBQUM7UUFDekUsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDekMsR0FBRyxD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QkFBK0I7QUFDakMsQ0FBQyxDQUFDO0FBRWdCLHlCQUFPO0FBR3pCLFNBQVMsZUFBZSxDQUFDLEdBQXNCLEVBQUUsUUFBUSxHQUFHLElBQUk7SUFDOUQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3hELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsMkNBQTJDLEVBQUUsOEZBQThGLENBQUMsQ0FBQztBQUNySyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2ZnIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnJztcbmltcG9ydCAqIGFzIF9BcnRpZmFjdHMgZnJvbSAnLi9hcnRpZmFjdHMnO1xuaW1wb3J0ICogYXMgc3AgZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3ByZWJ1aWxkUG9zdCBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuLy8gaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBfY2xpRGVwbG95IGZyb20gJy4vY2xpLWRlcGxveSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgX2dlbktleXBhaXIgZnJvbSAnLi9jbGkta2V5cGFpcic7XG5pbXBvcnQge0NsaUV4dGVuc2lvbiwgR2xvYmFsT3B0aW9ucywgaW5pdENvbmZpZ0FzeW5jfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0Jztcbi8vIGltcG9ydCB7cHJlcGFyZUxhenlOb2RlSW5qZWN0b3J9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInO1xuXG4vLyBpbXBvcnQgKiBhcyB0c0FzdFF1ZXJ5IGZyb20gJy4vdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCAqIGFzIF91bnppcCBmcm9tICcuL2NsaS11bnppcCc7XG4vLyBpbXBvcnQgKiBhcyBhc3RVdGlsIGZyb20gJy4vY2xpLXRzLWFzdC11dGlsJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSwgd2l0aEdsb2JhbE9wdGlvbnMpID0+IHtcblxuICAvLyAtLS0tLS0tLS0tLSBkZXBsb3kgLS0tLS0tLS0tLVxuICBjb25zdCBkZXBsb3lDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2RlcGxveSA8YXBwLW5hbWU+IFt0cy1zY3JpcHRzI2Z1bmN0aW9uLW9yLXNoZWxsXScpXG4gIC5vcHRpb24oJy0tcHVzaCwtLXN0YXRpYycsICdwdXNoIHRvIHJlbW90ZSBmaWxlIHNlcnZlciBhZnRlciBidWlsZCBzY3JpcHQgZXhlY3V0aW9uIGZpbmlzaGVkJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tbm8tcHVzaC1icmFuY2gnLCAnRG8gbm90IHB1c2ggdG8gcmVsZWFzZSBicmFuY2gnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS1zZWNyZXQgPHNlY3JldD4nLCAnY3JlZGVudGlhbCB3b3JkJylcbiAgLm9wdGlvbignLS1zZWNyZXQgPGNyZWRlbnRpYWwgY29kZT4nLCAnY3JlZGVudGlhbCBjb2RlIGZvciBkZXBsb3kgdG8gXCJwcm9kXCIgZW52aXJvbm1lbnQnKVxuICAub3B0aW9uKCctLWNjIDxjb21taXQgY29tbWVudD4nLCAnVGhlIGNvbW1pdCBjb21tZW50IG9mIHRoZSBkZXBsb3ltZW50IGNvbW1pdCcpXG4gIC5vcHRpb24oJy0tZm9yY2UnLCAnRm9yY2Ugb3ZlcndyaXRpbmcgcmVtb3RlIHppcCBhc3NldHMgd2l0aG91dCBTSEExIGNoZWNrc3VtIGNvbXBhcmlzb24sIGJ5IGRlZmF1bHQgcmVtb3RlIHNlcnZlciB3aWxsIHJlamVjdCBmaWxlIG9mIGV4aXN0aW5nIHNhbWUgU0hBMScsXG4gICAgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGFwcDogc3RyaW5nLCBzY3JpcHRzRmlsZT86IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IG9wdCA9IGRlcGxveUNtZC5vcHRzKCk7XG4gICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKGRlcGxveUNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gICAgKGF3YWl0IGltcG9ydCgnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXJ1bm5lcicpKS5wcmVwYXJlTGF6eU5vZGVJbmplY3Rvcih7fSk7XG5cbiAgICBjb25zdCBjbGlEZXBsb3kgPSAocmVxdWlyZSgnLi9jbGktZGVwbG95JykuZGVmYXVsdCBhcyB0eXBlb2YgX2NsaURlcGxveSk7XG4gICAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncHJlYnVpbGQnKTtcbiAgICBsb2cuaW5mbygnY29tbWl0IGNvbW1lbnQ6JywgZGVwbG95Q21kLm9wdHMoKS5jYyk7XG4gICAgYXdhaXQgY2xpRGVwbG95KG9wdC5zdGF0aWMsIG9wdC5lbnYsIGFwcCwgZGVwbG95Q21kLm9wdHMoKS5wdXNoQnJhbmNoLCBkZXBsb3lDbWQub3B0cygpLmZvcmNlICwgZGVwbG95Q21kLm9wdHMoKS5zZWNyZXQgfHwgbnVsbCwgc2NyaXB0c0ZpbGUsXG4gICAgICBkZXBsb3lDbWQub3B0cygpLmNjKTtcbiAgfSk7XG4gIGNyZWF0ZUVudk9wdGlvbihkZXBsb3lDbWQpO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhkZXBsb3lDbWQpO1xuXG4gIC8vIC0tLS0tLS0tIGdpdGhhc2ggLS0tLS0tLS0tLVxuICBjb25zdCBnaXRoYXNoQ21kID0gY3JlYXRlRW52T3B0aW9uKHByb2dyYW0uY29tbWFuZCgnZ2l0aGFzaCcpLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgQXJ0aWZhY3RzOiB0eXBlb2YgX0FydGlmYWN0cyA9IHJlcXVpcmUoJy4vYXJ0aWZhY3RzJyk7XG4gICAgaWYgKGdpdGhhc2hDbWQub3B0cygpLmVudikge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhhd2FpdCBBcnRpZmFjdHMuc3RyaW5naWZ5TGlzdFZlcnNpb25zKGdpdGhhc2hDbWQub3B0cygpLmVudikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGF3YWl0IEFydGlmYWN0cy5zdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gICAgfVxuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoZ2l0aGFzaENtZCk7XG5cbiAgLy8gLS0tLS0tIHNlbmQgLS0tLS0tLS1cbiAgY29uc3Qgc2VuZENtZCA9IGNyZWF0ZUVudk9wdGlvbihwcm9ncmFtLmNvbW1hbmQoJ3NlbmQgPGFwcC1uYW1lPiA8emlwRmlsZU9yRGlyPicpKVxuICAuZGVzY3JpcHRpb24oJ1NlbmQgc3RhdGljIHJlc291cmNlIHRvIHJlbW90ZSBzZXJ2ZXInKVxuICAub3B0aW9uKCctLWNvbiA8bnVtYmVyIG9mIGNvbmN1cnJlbnQgcmVxdWVzdD4nLCAnU2VuZCBmaWxlIHdpdGggY29uY3VycmVudCBwcm9jZXNzIGZvciBtdWx0aXBsZSByZW1vdGUgc2VydmVyIG5vZGVzJywgJzEnKVxuICAub3B0aW9uKCctLW5vZGVzIDxudW1iZXIgb2YgcmVtb3RlIG5vZGVzPicsICdOdW1iZXIgb2YgcmVtb3RlIHNlcnZlciBub2RlcycsICcxJylcbiAgLm9wdGlvbignLS1zZWNyZXQgPGNyZWRlbnRpYWwgY29kZT4nLCAnY3JlZGVudGlhbCBjb2RlIGZvciBkZXBsb3kgdG8gXCJwcm9kXCIgZW52aXJvbm1lbnQnKVxuICAub3B0aW9uKCctLWZvcmNlJywgJ0ZvcmNlIG92ZXJ3cml0aW5nIHJlbW90ZSB6aXAgYXNzZXRzIHdpdGhvdXQgU0hBMSBjaGVja3N1bSBjb21wYXJpc29uLCBieSBkZWZhdWx0IHJlbW90ZSBzZXJ2ZXIgd2lsbCByZWplY3QgZmlsZSBvZiBleGlzdGluZyBzYW1lIFNIQTEnLFxuICAgIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChhcHBOYW1lOiBzdHJpbmcsIHppcDogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKHNlbmRDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIChhd2FpdCBpbXBvcnQoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1ydW5uZXInKSkucHJlcGFyZUxhenlOb2RlSW5qZWN0b3Ioe30pO1xuXG4gICAgYXdhaXQgKHJlcXVpcmUoJy4vX3NlbmQtcGF0Y2gnKSBhcyB0eXBlb2Ygc3ApLnNlbmQoc2VuZENtZC5vcHRzKCkuZW52LCBhcHBOYW1lLCB6aXAsXG4gICAgcGFyc2VJbnQoc2VuZENtZC5vcHRzKCkuY29uLCAxMCksXG4gICAgcGFyc2VJbnQoc2VuZENtZC5vcHRzKCkubm9kZXMsIDEwKSxcbiAgICBzZW5kQ21kLm9wdHMoKS5mb3JjZSxcbiAgICBzZW5kQ21kLm9wdHMoKS5zZWNyZXQpO1xuICB9KTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoc2VuZENtZCk7XG5cbiAgLy8gLS0tLS0tIG1vY2t6aXAgLS0tLS0tLS1cbiAgY29uc3QgbW9ja3ppcENtZCA9IHByb2dyYW0uY29tbWFuZCgnbW9ja3ppcCcpO1xuICBtb2NremlwQ21kLm9wdGlvbignLWQsLS1kaXIgPGRpcj4nLCAnY3JlYXRlIGEgbW9jayB6aXAgZmlsZSBpbiBzcGVjaWZpYyBkaXJlY3RvcnknKTtcbiAgbW9ja3ppcENtZC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhtb2NremlwQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcblxuICAgIGNvbnN0IEFydGlmYWN0czogdHlwZW9mIF9BcnRpZmFjdHMgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpO1xuXG4gICAgY29uc3QgZmlsZUNvbnRlbnQgPSAnJyArIG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKTtcblxuICAgIGNvbnN0IGZpbGUgPSBtb2NremlwQ21kLm9wdHMoKS5kaXIgPyBQYXRoLnJlc29sdmUobW9ja3ppcENtZC5vcHRzKCkuZGlyLCAncHJlYnVpbGQtbW9jay56aXAnKSA6IGNmZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3ByZWJ1aWxkLW1vY2suemlwJyk7XG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZmlsZSkpO1xuXG4gICAgYXdhaXQgQXJ0aWZhY3RzLndyaXRlTW9ja1ppcChmaWxlLCBmaWxlQ29udGVudCk7XG4gICAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncHJlYnVpbGQnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnTW9jayB6aXA6JywgZmlsZSk7XG4gIH0pO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhtb2NremlwQ21kKTtcblxuICAvLyAtLS0tLS0tLS0tIGtleXBhaXIgLS0tLS0tLS0tLS0tXG4gIGNvbnN0IGtleXBhaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2tleXBhaXIgW2ZpbGUtbmFtZV0nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgbmV3IGFzeW1tZXRyaWMga2V5IHBhaXInKVxuICAuYWN0aW9uKGFzeW5jIChmaWxlTmFtZSkgPT4ge1xuICAgIGNvbnN0IGdlbktleXBhaXIgPSByZXF1aXJlKCcuL2NsaS1rZXlwYWlyJykuZGVmYXVsdCBhcyB0eXBlb2YgX2dlbktleXBhaXI7XG4gICAgYXdhaXQgZ2VuS2V5cGFpcihmaWxlTmFtZSwga2V5cGFpckNtZC5vcHRzKCkpO1xuICB9KTtcblxuICBjb25zdCB0c0FzdENtZCA9IHByb2dyYW0uY29tbWFuZCgndHMtYXN0IDx0cy1maWxlPicpXG4gIC5vcHRpb24oJy0tbm8tdHlwZScsICdkbyBub3QgcHJpbnQgQVNUIHR5cGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLXF8LS1xdWVyeSA8c2VsZWN0b3I+JywgJ3F1ZXJ5IHNlbGVjdG9yJywgdW5kZWZpbmVkKVxuICAuZGVzY3JpcHRpb24oJ1ByaW50IFR5cGVzY3JpcHQgQVNUIHN0cnVjdHVyZScpXG4gIC5hY3Rpb24oYXN5bmMgZmlsZW5hbWUgPT4ge1xuICAgIGNvbnN0IGFzdFEgPSBhd2FpdCBpbXBvcnQoJy4vdHMtYXN0LXF1ZXJ5Jyk7XG4gICAgLy8gY29uc3QgcHJpbnRGaWxlOiAodHlwZW9mIHRzQXN0UXVlcnkpWydwcmludEZpbGUnXSA9IHJlcXVpcmUoJy4vdHMtYXN0LXF1ZXJ5JykucHJpbnRGaWxlO1xuICAgIGFzdFEucHJpbnRGaWxlKGZpbGVuYW1lLCB0c0FzdENtZC5vcHRzKCkucXVlcnksIHRzQXN0Q21kLm9wdHMoKS50eXBlIGFzIGJvb2xlYW4pO1xuICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2Z1bmN0aW9ucyA8ZmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ0xpc3QgZXhwb3J0ZWQgZnVuY3Rpb25zIGZvciAqLnRzLCAqLmQudHMsICouanMgZmlsZScpXG4gIC5hY3Rpb24oYXN5bmMgZmlsZSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHMtYXN0LXV0aWwnKSkubGlzdEV4cG9ydGVkRnVuY3Rpb24oZmlsZSk7XG4gIH0pO1xuXG4gIC8vIC8vIC0tLS0tLS0tIGxpc3R6aXAgLS0tLS0tLS1cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdsaXN0emlwIDxmaWxlPicpXG4gIC8vIC5kZXNjcmlwdGlvbignTGlzdCB6aXAgZmlsZSBjb250ZW50IGFuZCBzaXplJylcbiAgLy8gLmFjdGlvbihhc3luYyBmaWxlID0+IHtcbiAgLy8gICBjb25zdCB7bGlzdFppcH06IHR5cGVvZiBfdW56aXAgPSByZXF1aXJlKCcuL2NsaS11bnppcCcpO1xuICAvLyAgIGF3YWl0IGxpc3RaaXAoZmlsZSk7XG4gIC8vIH0pO1xuXG4gIC8vIC8vIC0tLS0tLS0tIHVuemlwIC0tLS0tLS0tXG4gIC8vIGNvbnN0IHVuemlwQ21kID0gcHJvZ3JhbS5jb21tYW5kKCd1bnppcCA8emlwRmlsZURpcmVjdG9yeT4nKVxuICAvLyAuZGVzY3JpcHRpb24oJ0V4dHJhY3QgYWxsIHppcCBmaWxlcyBmcm9tIHNwZWNpZmljIGRpcmVjdG9yeScpXG4gIC8vIC5yZXF1aXJlZE9wdGlvbignLWQsLS1kZXN0IDxkaXI+JywgJ2Rlc3RpbmF0aW9uIGRpcmVjdG9yeScpXG4gIC8vIC5hY3Rpb24oYXN5bmMgKHppcEZpbGVEaXJlY3Rvcnk6IHN0cmluZykgPT4ge1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyh1bnppcENtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIC8vICAgcHJlcGFyZUxhenlOb2RlSW5qZWN0b3Ioe30pO1xuICAvLyAgIGNvbnN0IHtmb3JrRXh0cmFjdEV4c3RpbmdaaXB9ID0gYXdhaXQgaW1wb3J0KCdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9mZXRjaC1yZW1vdGUnKTtcbiAgLy8gICBhd2FpdCBmb3JrRXh0cmFjdEV4c3RpbmdaaXAoemlwRmlsZURpcmVjdG9yeSwgUGF0aC5yZXNvbHZlKHVuemlwQ21kLm9wdHMoKS5kZXN0KSwgdHJ1ZSk7XG4gIC8vIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyh1bnppcENtZCk7XG59O1xuXG5leHBvcnQge2NsaUV4dCBhcyBkZWZhdWx0fTtcblxuXG5mdW5jdGlvbiBjcmVhdGVFbnZPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgcmVxdWlyZWQgPSB0cnVlKTogUmV0dXJuVHlwZTxjb21tYW5kZXIuQ29tbWFuZFsncmVxdWlyZWRPcHRpb24nXT4ge1xuICBjb25zdCBmdW5jID0gcmVxdWlyZWQgPyBjbWQucmVxdWlyZWRPcHRpb24gOiBjbWQub3B0aW9uO1xuICByZXR1cm4gZnVuYy5jYWxsKGNtZCwgJy0tZW52IDxsb2NhbCB8IGRldiB8IHRlc3QgfCBzdGFnZSB8IHByb2Q+JywgJ3RhcmdldCBlbnZpcm9ubWVudCwgZS5nLiBcImxvY2FsXCIsIFwiZGV2XCIsIFwidGVzdFwiLCBcInN0YWdlXCIsIFwicHJvZFwiLCBkZWZhdWx0IGFzIGFsbCBlbnZpcm9ubWVudCcpO1xufVxuXG4iXX0=