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
// import * as astUtil from './cli-ts-ast-util';
const cliExt = (program) => {
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
        const cliDeploy = require('./cli-deploy').default;
        const log = log4js_1.default.getLogger('prebuild');
        log.info('commit comment:', deployCmd.opts().cc);
        yield cliDeploy(opt.static, opt.env, app, deployCmd.opts().pushBranch, deployCmd.opts().force, deployCmd.opts().secret || null, scriptsFile, deployCmd.opts().cc);
    }));
    createEnvOption(deployCmd);
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
    // withGlobalOptions(githashCmd);
    // ------ send --------
    const sendCmd = createEnvOption(program.command('send <app-name> <zipFileOrDir>'))
        .description('Send static resource to remote server')
        .option('--con <number of concurrent request>', 'Send file with concurrent process for multiple remote server nodes', '1')
        .option('--nodes <number of remote nodes>', 'Number of remote server nodes', '1')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1', false)
        .action((appName, zip) => __awaiter(void 0, void 0, void 0, function* () {
        yield require('./_send-patch').send(sendCmd.opts().env, appName, zip, parseInt(sendCmd.opts().con, 10), parseInt(sendCmd.opts().nodes, 10), sendCmd.opts().force, sendCmd.opts().secret);
    }));
    // withGlobalOptions(sendCmd);
    // ------ mockzip --------
    const mockzipCmd = program.command('mockzip');
    mockzipCmd.option('-d,--dir <dir>', 'create a mock zip file in specific directory');
    mockzipCmd.action(() => __awaiter(void 0, void 0, void 0, function* () {
        const Artifacts = require('./artifacts');
        const fileContent = '' + new Date().toUTCString();
        const file = mockzipCmd.opts().dir ? path_1.default.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : config_1.default.resolve('destDir', 'prebuild-mock.zip');
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(file));
        yield Artifacts.writeMockZip(file, fileContent);
        const log = log4js_1.default.getLogger('prebuild');
        // tslint:disable-next-line: no-console
        log.info('Mock zip:', file);
    }));
    // withGlobalOptions(mockzipCmd);
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
};
exports.default = cliExt;
function createEnvOption(cmd, required = true) {
    const func = required ? cmd.requiredOption : cmd.option;
    return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsZ0RBQXdCO0FBQ3hCLHdFQUE2QztBQUc3Qyx3REFBMEI7QUFJMUIsb0RBQTRCO0FBTzVCLGdEQUFnRDtBQUVoRCxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUV2QyxnQ0FBZ0M7SUFDaEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrREFBa0QsQ0FBQztTQUNwRixXQUFXLENBQUMsK0JBQStCLENBQUM7U0FDNUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGtFQUFrRSxFQUFFLEtBQUssQ0FBQztTQUNwRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDO1FBQ25FLGtEQUFrRDtTQUNqRCxNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUM7U0FDeEYsTUFBTSxDQUFDLHVCQUF1QixFQUFFLDZDQUE2QyxDQUFDO1NBQzlFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsdUlBQXVJLEVBQ3hKLEtBQUssQ0FBQztTQUNQLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxXQUFvQixFQUFFLEVBQUU7UUFDbEQsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzdCLE1BQU0sU0FBUyxHQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUE2QixDQUFDO1FBQ3pFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFD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QUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElBQWUsQ0FBQyxDQUFDO0lBQ25GLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1NBQ2xDLFdBQVcsQ0FBQyxxREFBcUQsQ0FBQztTQUNsRSxNQUFNLENBQUMsQ0FBTSxJQUFJLEVBQUMsRUFBRTtRQUNuQixDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBRWdCLHlCQUFPO0FBR3pCLFNBQVMsZUFBZSxDQUFDLEdBQXNCLEVBQUUsUUFBUSxHQUFHLElBQUk7SUFDOUQsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3hELE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsMkNBQTJDLEVBQUUsOEZBQThGLENBQUMsQ0FBQztBQUNySyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2ZnIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnJztcbmltcG9ydCAqIGFzIF9BcnRpZmFjdHMgZnJvbSAnLi9hcnRpZmFjdHMnO1xuaW1wb3J0ICogYXMgc3AgZnJvbSAnLi9fc2VuZC1wYXRjaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgX3ByZWJ1aWxkUG9zdCBmcm9tICcuL3ByZWJ1aWxkLXBvc3QnO1xuLy8gaW1wb3J0IHtzcGF3bn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCBfY2xpRGVwbG95IGZyb20gJy4vY2xpLWRlcGxveSc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgX2dlbktleXBhaXIgZnJvbSAnLi9jbGkta2V5cGFpcic7XG5pbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQge3ByZXBhcmVMYXp5Tm9kZUluamVjdG9yfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtcnVubmVyJztcblxuLy8gaW1wb3J0ICogYXMgdHNBc3RRdWVyeSBmcm9tICcuL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgKiBhcyBfdW56aXAgZnJvbSAnLi9jbGktdW56aXAnO1xuLy8gaW1wb3J0ICogYXMgYXN0VXRpbCBmcm9tICcuL2NsaS10cy1hc3QtdXRpbCc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcblxuICAvLyAtLS0tLS0tLS0tLSBkZXBsb3kgLS0tLS0tLS0tLVxuICBjb25zdCBkZXBsb3lDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2RlcGxveSA8YXBwLW5hbWU+IFt0cy1zY3JpcHRzI2Z1bmN0aW9uLW9yLXNoZWxsXScpXG4gIC5kZXNjcmlwdGlvbignRGVwbG95IChmb3IgUGxpbmsgaW50ZXJuYWxseSknKVxuICAub3B0aW9uKCctLXB1c2gsLS1zdGF0aWMnLCAncHVzaCB0byByZW1vdGUgZmlsZSBzZXJ2ZXIgYWZ0ZXIgYnVpbGQgc2NyaXB0IGV4ZWN1dGlvbiBmaW5pc2hlZCcsIGZhbHNlKVxuICAub3B0aW9uKCctLW5vLXB1c2gtYnJhbmNoJywgJ0RvIG5vdCBwdXNoIHRvIHJlbGVhc2UgYnJhbmNoJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0tc2VjcmV0IDxzZWNyZXQ+JywgJ2NyZWRlbnRpYWwgd29yZCcpXG4gIC5vcHRpb24oJy0tc2VjcmV0IDxjcmVkZW50aWFsIGNvZGU+JywgJ2NyZWRlbnRpYWwgY29kZSBmb3IgZGVwbG95IHRvIFwicHJvZFwiIGVudmlyb25tZW50JylcbiAgLm9wdGlvbignLS1jYyA8Y29tbWl0IGNvbW1lbnQ+JywgJ1RoZSBjb21taXQgY29tbWVudCBvZiB0aGUgZGVwbG95bWVudCBjb21taXQnKVxuICAub3B0aW9uKCctLWZvcmNlJywgJ0ZvcmNlIG92ZXJ3cml0aW5nIHJlbW90ZSB6aXAgYXNzZXRzIHdpdGhvdXQgU0hBMSBjaGVja3N1bSBjb21wYXJpc29uLCBieSBkZWZhdWx0IHJlbW90ZSBzZXJ2ZXIgd2lsbCByZWplY3QgZmlsZSBvZiBleGlzdGluZyBzYW1lIFNIQTEnLFxuICAgIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChhcHA6IHN0cmluZywgc2NyaXB0c0ZpbGU/OiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBvcHQgPSBkZXBsb3lDbWQub3B0cygpO1xuICAgIGNvbnN0IGNsaURlcGxveSA9IChyZXF1aXJlKCcuL2NsaS1kZXBsb3knKS5kZWZhdWx0IGFzIHR5cGVvZiBfY2xpRGVwbG95KTtcbiAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwcmVidWlsZCcpO1xuICAgIGxvZy5pbmZvKCdjb21taXQgY29tbWVudDonLCBkZXBsb3lDbWQub3B0cygpLmNjKTtcbiAgICBhd2FpdCBjbGlEZXBsb3kob3B0LnN0YXRpYywgb3B0LmVudiwgYXBwLCBkZXBsb3lDbWQub3B0cygpLnB1c2hCcmFuY2gsIGRlcGxveUNtZC5vcHRzKCkuZm9yY2UgLCBkZXBsb3lDbWQub3B0cygpLnNlY3JldCB8fCBudWxsLCBzY3JpcHRzRmlsZSxcbiAgICAgIGRlcGxveUNtZC5vcHRzKCkuY2MpO1xuICB9KTtcbiAgY3JlYXRlRW52T3B0aW9uKGRlcGxveUNtZCk7XG4gIC8vIC0tLS0tLS0tIGdpdGhhc2ggLS0tLS0tLS0tLVxuICBjb25zdCBnaXRoYXNoQ21kID0gY3JlYXRlRW52T3B0aW9uKHByb2dyYW0uY29tbWFuZCgnZ2l0aGFzaCcpLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgQXJ0aWZhY3RzOiB0eXBlb2YgX0FydGlmYWN0cyA9IHJlcXVpcmUoJy4vYXJ0aWZhY3RzJyk7XG4gICAgaWYgKGdpdGhhc2hDbWQub3B0cygpLmVudikge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhhd2FpdCBBcnRpZmFjdHMuc3RyaW5naWZ5TGlzdFZlcnNpb25zKGdpdGhhc2hDbWQub3B0cygpLmVudikpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGF3YWl0IEFydGlmYWN0cy5zdHJpbmdpZnlMaXN0QWxsVmVyc2lvbnMoKSk7XG4gICAgfVxuICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoZ2l0aGFzaENtZCk7XG5cbiAgLy8gLS0tLS0tIHNlbmQgLS0tLS0tLS1cbiAgY29uc3Qgc2VuZENtZCA9IGNyZWF0ZUVudk9wdGlvbihwcm9ncmFtLmNvbW1hbmQoJ3NlbmQgPGFwcC1uYW1lPiA8emlwRmlsZU9yRGlyPicpKVxuICAuZGVzY3JpcHRpb24oJ1NlbmQgc3RhdGljIHJlc291cmNlIHRvIHJlbW90ZSBzZXJ2ZXInKVxuICAub3B0aW9uKCctLWNvbiA8bnVtYmVyIG9mIGNvbmN1cnJlbnQgcmVxdWVzdD4nLCAnU2VuZCBmaWxlIHdpdGggY29uY3VycmVudCBwcm9jZXNzIGZvciBtdWx0aXBsZSByZW1vdGUgc2VydmVyIG5vZGVzJywgJzEnKVxuICAub3B0aW9uKCctLW5vZGVzIDxudW1iZXIgb2YgcmVtb3RlIG5vZGVzPicsICdOdW1iZXIgb2YgcmVtb3RlIHNlcnZlciBub2RlcycsICcxJylcbiAgLm9wdGlvbignLS1zZWNyZXQgPGNyZWRlbnRpYWwgY29kZT4nLCAnY3JlZGVudGlhbCBjb2RlIGZvciBkZXBsb3kgdG8gXCJwcm9kXCIgZW52aXJvbm1lbnQnKVxuICAub3B0aW9uKCctLWZvcmNlJywgJ0ZvcmNlIG92ZXJ3cml0aW5nIHJlbW90ZSB6aXAgYXNzZXRzIHdpdGhvdXQgU0hBMSBjaGVja3N1bSBjb21wYXJpc29uLCBieSBkZWZhdWx0IHJlbW90ZSBzZXJ2ZXIgd2lsbCByZWplY3QgZmlsZSBvZiBleGlzdGluZyBzYW1lIFNIQTEnLFxuICAgIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChhcHBOYW1lOiBzdHJpbmcsIHppcDogc3RyaW5nKSA9PiB7XG4gICAgYXdhaXQgKHJlcXVpcmUoJy4vX3NlbmQtcGF0Y2gnKSBhcyB0eXBlb2Ygc3ApLnNlbmQoc2VuZENtZC5vcHRzKCkuZW52LCBhcHBOYW1lLCB6aXAsXG4gICAgcGFyc2VJbnQoc2VuZENtZC5vcHRzKCkuY29uLCAxMCksXG4gICAgcGFyc2VJbnQoc2VuZENtZC5vcHRzKCkubm9kZXMsIDEwKSxcbiAgICBzZW5kQ21kLm9wdHMoKS5mb3JjZSxcbiAgICBzZW5kQ21kLm9wdHMoKS5zZWNyZXQpO1xuICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoc2VuZENtZCk7XG5cbiAgLy8gLS0tLS0tIG1vY2t6aXAgLS0tLS0tLS1cbiAgY29uc3QgbW9ja3ppcENtZCA9IHByb2dyYW0uY29tbWFuZCgnbW9ja3ppcCcpO1xuICBtb2NremlwQ21kLm9wdGlvbignLWQsLS1kaXIgPGRpcj4nLCAnY3JlYXRlIGEgbW9jayB6aXAgZmlsZSBpbiBzcGVjaWZpYyBkaXJlY3RvcnknKTtcbiAgbW9ja3ppcENtZC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IEFydGlmYWN0czogdHlwZW9mIF9BcnRpZmFjdHMgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpO1xuXG4gICAgY29uc3QgZmlsZUNvbnRlbnQgPSAnJyArIG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKTtcblxuICAgIGNvbnN0IGZpbGUgPSBtb2NremlwQ21kLm9wdHMoKS5kaXIgPyBQYXRoLnJlc29sdmUobW9ja3ppcENtZC5vcHRzKCkuZGlyLCAncHJlYnVpbGQtbW9jay56aXAnKSA6IGNmZy5yZXNvbHZlKCdkZXN0RGlyJywgJ3ByZWJ1aWxkLW1vY2suemlwJyk7XG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUoZmlsZSkpO1xuXG4gICAgYXdhaXQgQXJ0aWZhY3RzLndyaXRlTW9ja1ppcChmaWxlLCBmaWxlQ29udGVudCk7XG4gICAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncHJlYnVpbGQnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnTW9jayB6aXA6JywgZmlsZSk7XG4gIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhtb2NremlwQ21kKTtcblxuICAvLyAtLS0tLS0tLS0tIGtleXBhaXIgLS0tLS0tLS0tLS0tXG4gIGNvbnN0IGtleXBhaXJDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2tleXBhaXIgW2ZpbGUtbmFtZV0nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgbmV3IGFzeW1tZXRyaWMga2V5IHBhaXInKVxuICAuYWN0aW9uKGFzeW5jIChmaWxlTmFtZSkgPT4ge1xuICAgIGNvbnN0IGdlbktleXBhaXIgPSByZXF1aXJlKCcuL2NsaS1rZXlwYWlyJykuZGVmYXVsdCBhcyB0eXBlb2YgX2dlbktleXBhaXI7XG4gICAgYXdhaXQgZ2VuS2V5cGFpcihmaWxlTmFtZSwga2V5cGFpckNtZC5vcHRzKCkpO1xuICB9KTtcblxuICBjb25zdCB0c0FzdENtZCA9IHByb2dyYW0uY29tbWFuZCgndHMtYXN0IDx0cy1maWxlPicpXG4gIC5vcHRpb24oJy0tbm8tdHlwZScsICdkbyBub3QgcHJpbnQgQVNUIHR5cGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLXF8LS1xdWVyeSA8c2VsZWN0b3I+JywgJ3F1ZXJ5IHNlbGVjdG9yJywgdW5kZWZpbmVkKVxuICAuZGVzY3JpcHRpb24oJ1ByaW50IFR5cGVzY3JpcHQgQVNUIHN0cnVjdHVyZScpXG4gIC5hY3Rpb24oYXN5bmMgZmlsZW5hbWUgPT4ge1xuICAgIGNvbnN0IGFzdFEgPSBhd2FpdCBpbXBvcnQoJy4vdHMtYXN0LXF1ZXJ5Jyk7XG4gICAgLy8gY29uc3QgcHJpbnRGaWxlOiAodHlwZW9mIHRzQXN0UXVlcnkpWydwcmludEZpbGUnXSA9IHJlcXVpcmUoJy4vdHMtYXN0LXF1ZXJ5JykucHJpbnRGaWxlO1xuICAgIGFzdFEucHJpbnRGaWxlKGZpbGVuYW1lLCB0c0FzdENtZC5vcHRzKCkucXVlcnksIHRzQXN0Q21kLm9wdHMoKS50eXBlIGFzIGJvb2xlYW4pO1xuICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2Z1bmN0aW9ucyA8ZmlsZT4nKVxuICAuZGVzY3JpcHRpb24oJ0xpc3QgZXhwb3J0ZWQgZnVuY3Rpb25zIGZvciAqLnRzLCAqLmQudHMsICouanMgZmlsZScpXG4gIC5hY3Rpb24oYXN5bmMgZmlsZSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHMtYXN0LXV0aWwnKSkubGlzdEV4cG9ydGVkRnVuY3Rpb24oZmlsZSk7XG4gIH0pO1xufTtcblxuZXhwb3J0IHtjbGlFeHQgYXMgZGVmYXVsdH07XG5cblxuZnVuY3Rpb24gY3JlYXRlRW52T3B0aW9uKGNtZDogY29tbWFuZGVyLkNvbW1hbmQsIHJlcXVpcmVkID0gdHJ1ZSk6IFJldHVyblR5cGU8Y29tbWFuZGVyLkNvbW1hbmRbJ3JlcXVpcmVkT3B0aW9uJ10+IHtcbiAgY29uc3QgZnVuYyA9IHJlcXVpcmVkID8gY21kLnJlcXVpcmVkT3B0aW9uIDogY21kLm9wdGlvbjtcbiAgcmV0dXJuIGZ1bmMuY2FsbChjbWQsICctLWVudiA8bG9jYWwgfCBkZXYgfCB0ZXN0IHwgc3RhZ2UgfCBwcm9kPicsICd0YXJnZXQgZW52aXJvbm1lbnQsIGUuZy4gXCJsb2NhbFwiLCBcImRldlwiLCBcInRlc3RcIiwgXCJzdGFnZVwiLCBcInByb2RcIiwgZGVmYXVsdCBhcyBhbGwgZW52aXJvbm1lbnQnKTtcbn1cblxuIl19