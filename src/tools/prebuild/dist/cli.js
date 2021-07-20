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
// import commander from 'commander';
const path_1 = __importDefault(require("path"));
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const log4js_1 = __importDefault(require("log4js"));
const __plink_1 = __importDefault(require("__plink"));
const cliExt = (program) => {
    // ----------- deploy ----------
    const deployCmd = program.command('deploy <app-name> [ts-scripts#function-or-shell]')
        .description('Deploy (for Plink internally)')
        .option('--push,--static', 'push to remote file server after build script execution finished', false)
        .option('--no-push-branch', 'Do not push to release branch or create tag', false)
        // .option('--secret <secret>', 'credential word')
        .option('--secret <credential code>', 'credential code for deploy to "prod" environment')
        .option('--cc <commit comment>', 'The commit comment of the deployment commit')
        .option('--force', 'Force overwriting remote zip assets without SHA1 checksum comparison, by default remote server will reject file of existing same SHA1', false)
        .action((app, scriptsFile) => __awaiter(void 0, void 0, void 0, function* () {
        const opt = deployCmd.opts();
        if (opt.env == null) {
            __plink_1.default.logger.error(' option "--env <local | dev | test | stage | prod>" must be provided');
            return;
        }
        const cliDeploy = require('./cli-deploy').default;
        yield cliDeploy(opt.static, opt.env || 'local', app, opt.pushBranch, opt.force, opt.secret || null, scriptsFile, deployCmd.opts().cc);
    }));
    // createEnvOption(deployCmd);
    // -------- githash ----------
    const githashCmd = program.command('githash')
        .description('List git hash information of each static resource zip file in directory "install-<env>"')
        .action(() => __awaiter(void 0, void 0, void 0, function* () {
        const Artifacts = require('./artifacts');
        if (githashCmd.opts().env) {
            // eslint-disable-next-line no-console
            console.log(yield Artifacts.stringifyListVersions(githashCmd.opts().env));
        }
        else {
            // eslint-disable-next-line no-console
            console.log(yield Artifacts.stringifyListAllVersions());
        }
    }));
    // withGlobalOptions(githashCmd);
    // ------ send --------
    const sendCmd = program.command('send <app-name> <zipFileOrDir>')
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
    const mockzipCmd = program.command('mockzip')
        .option('-d,--dir <dir>', 'create a mock zip file in specific directory')
        .action(() => __awaiter(void 0, void 0, void 0, function* () {
        const Artifacts = require('./artifacts');
        const fileContent = '' + new Date().toUTCString();
        const file = mockzipCmd.opts().dir ? path_1.default.resolve(mockzipCmd.opts().dir, 'prebuild-mock.zip') : config_1.default.resolve('destDir', 'prebuild-mock.zip');
        fs_extra_1.default.mkdirpSync(path_1.default.dirname(file));
        yield Artifacts.writeMockZip(file, fileContent);
        const log = log4js_1.default.getLogger('prebuild');
        // eslint-disable-next-line no-console
        log.info('Mock zip:', file);
    }));
    // withGlobalOptions(mockzipCmd);
    // ---------- keypair ------------
    const keypairCmd = program.command('keypair [file-name]')
        .description('Generate a new asymmetric key pair')
        .action((fileName) => __awaiter(void 0, void 0, void 0, function* () {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const genKeypair = require('./cli-keypair').default;
        yield genKeypair(fileName, keypairCmd.opts());
    }));
    program.command('functions <file>')
        .description('List exported functions for *.ts, *.d.ts, *.js file')
        .action((file) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-ts-ast-util')))).listExportedFunction(file);
    }));
};
exports.default = cliExt;
// function createEnvOption(cmd: commander.Command, required = true): ReturnType<commander.Command['requiredOption']> {
//   const func = required ? cmd.requiredOption : cmd.option;
//   return func.call(cmd, '--env <local | dev | test | stage | prod>', 'target environment, e.g. "local", "dev", "test", "stage", "prod", default as all environment');
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EscUNBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qix3RUFBNkM7QUFHN0Msd0RBQTBCO0FBSTFCLG9EQUE0QjtBQUk1QixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFFdkMsZ0NBQWdDO0lBQ2hDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0RBQWtELENBQUM7U0FDcEYsV0FBVyxDQUFDLCtCQUErQixDQUFDO1NBQzVDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxrRUFBa0UsRUFBRSxLQUFLLENBQUM7U0FDcEcsTUFBTSxDQUFDLGtCQUFrQixFQUFFLDZDQUE2QyxFQUFFLEtBQUssQ0FBQztRQUNqRixrREFBa0Q7U0FDakQsTUFBTSxDQUFDLDRCQUE0QixFQUFFLGtEQUFrRCxDQUFDO1NBQ3hGLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSw2Q0FBNkMsQ0FBQztTQUM5RSxNQUFNLENBQUMsU0FBUyxFQUFFLHVJQUF1SSxFQUN4SixLQUFLLENBQUM7U0FDUCxNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsV0FBb0IsRUFBRSxFQUFFO1FBQ2xELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQThGLENBQUM7UUFDekgsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRTtZQUNuQixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0VBQXNFLENBQUMsQ0FBQztZQUMzRixPQUFPO1NBQ1I7UUFDRCxNQUFNLFNBQVMsR0FBSSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBNkIsQ0FBQztRQUN6RSxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUcsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUUsV0FBVyxFQUM5RyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILDhCQUE4QjtJQUM5Qiw4QkFBOEI7SUFDOUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDMUMsV0FBVyxDQUFDLHlGQUF5RixDQUFDO1NBQ3RHLE1BQU0sQ0FBQyxHQUFTLEVBQUU7UUFDakIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBc0IsQ0FBQztRQUM5RCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUU7WUFDekIsc0NBQXNDO1lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxTQUFTLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDM0U7YUFBTTtZQUNMLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sU0FBUyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQztTQUN6RDtJQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxpQ0FBaUM7SUFFakMsdUJBQXVCO0lBQ3ZCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLENBQUM7U0FDOUQsV0FBVyxDQUFDLHVDQUF1QyxDQUFDO1NBQ3BELE1BQU0sQ0FBQyxzQ0FBc0MsRUFBRSxvRUFBb0UsRUFBRSxHQUFHLENBQUM7U0FDekgsTUFBTSxDQUFDLGtDQUFrQyxFQUFFLCtCQUErQixFQUFFLEdBQUcsQ0FBQztTQUNoRixNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUM7U0FDeEYsTUFBTSxDQUFDLFNBQVMsRUFBRSx1SUFBdUksRUFDeEosS0FBSyxDQUFDO1NBQ1AsTUFBTSxDQUFDLENBQU8sT0FBZSxFQUFFLEdBQVcsRUFBRSxFQUFFO1FBQzdDLE1BQU8sT0FBTyxDQUFDLGVBQWUsQ0FBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQ25GLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUNoQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFDbEMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFDcEIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCw4QkFBOEI7SUFFOUIsMEJBQTBCO0lBQzFCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQzFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSw4Q0FBOEMsQ0FBQztTQUN4RSxNQUFNLENBQUMsR0FBUyxFQUFFO1FBQ2pCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxhQUFhLENBQXNCLENBQUM7UUFFOUQsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFbEQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVJLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVsQyxNQUFNLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLHNDQUFzQztRQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsaUNBQWlDO0lBRWpDLGtDQUFrQztJQUNsQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1NBQ3RELFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQztTQUNqRCxNQUFNLENBQUMsQ0FBTyxRQUFRLEVBQUUsRUFBRTtRQUN6QixzRUFBc0U7UUFDdEUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQTZCLENBQUM7UUFDMUUsTUFBTSxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ2hELENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCxPQUFPLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1NBQ2hDLFdBQVcsQ0FBQyxxREFBcUQsQ0FBQztTQUNsRSxNQUFNLENBQUMsQ0FBTSxJQUFJLEVBQUMsRUFBRTtRQUNuQixDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNqRSxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDO0FBRWdCLHlCQUFPO0FBR3pCLHVIQUF1SDtBQUN2SCw2REFBNkQ7QUFDN0Qsd0tBQXdLO0FBQ3hLLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBpbXBvcnQgY29tbWFuZGVyIGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjZmcgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWcnO1xuaW1wb3J0ICogYXMgX0FydGlmYWN0cyBmcm9tICcuL2FydGlmYWN0cyc7XG5pbXBvcnQgKiBhcyBzcCBmcm9tICcuL19zZW5kLXBhdGNoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyBfcHJlYnVpbGRQb3N0IGZyb20gJy4vcHJlYnVpbGQtcG9zdCc7XG4vLyBpbXBvcnQge3NwYXdufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IF9jbGlEZXBsb3kgZnJvbSAnLi9jbGktZGVwbG95JztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfZ2VuS2V5cGFpciBmcm9tICcuL2NsaS1rZXlwYWlyJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBHbG9iYWxPcHRpb25zfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCAqIGFzIF91bnppcCBmcm9tICcuL2NsaS11bnppcCc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG5cbmNvbnN0IGNsaUV4dDogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcblxuICAvLyAtLS0tLS0tLS0tLSBkZXBsb3kgLS0tLS0tLS0tLVxuICBjb25zdCBkZXBsb3lDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2RlcGxveSA8YXBwLW5hbWU+IFt0cy1zY3JpcHRzI2Z1bmN0aW9uLW9yLXNoZWxsXScpXG4gIC5kZXNjcmlwdGlvbignRGVwbG95IChmb3IgUGxpbmsgaW50ZXJuYWxseSknKVxuICAub3B0aW9uKCctLXB1c2gsLS1zdGF0aWMnLCAncHVzaCB0byByZW1vdGUgZmlsZSBzZXJ2ZXIgYWZ0ZXIgYnVpbGQgc2NyaXB0IGV4ZWN1dGlvbiBmaW5pc2hlZCcsIGZhbHNlKVxuICAub3B0aW9uKCctLW5vLXB1c2gtYnJhbmNoJywgJ0RvIG5vdCBwdXNoIHRvIHJlbGVhc2UgYnJhbmNoIG9yIGNyZWF0ZSB0YWcnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS1zZWNyZXQgPHNlY3JldD4nLCAnY3JlZGVudGlhbCB3b3JkJylcbiAgLm9wdGlvbignLS1zZWNyZXQgPGNyZWRlbnRpYWwgY29kZT4nLCAnY3JlZGVudGlhbCBjb2RlIGZvciBkZXBsb3kgdG8gXCJwcm9kXCIgZW52aXJvbm1lbnQnKVxuICAub3B0aW9uKCctLWNjIDxjb21taXQgY29tbWVudD4nLCAnVGhlIGNvbW1pdCBjb21tZW50IG9mIHRoZSBkZXBsb3ltZW50IGNvbW1pdCcpXG4gIC5vcHRpb24oJy0tZm9yY2UnLCAnRm9yY2Ugb3ZlcndyaXRpbmcgcmVtb3RlIHppcCBhc3NldHMgd2l0aG91dCBTSEExIGNoZWNrc3VtIGNvbXBhcmlzb24sIGJ5IGRlZmF1bHQgcmVtb3RlIHNlcnZlciB3aWxsIHJlamVjdCBmaWxlIG9mIGV4aXN0aW5nIHNhbWUgU0hBMScsXG4gICAgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGFwcDogc3RyaW5nLCBzY3JpcHRzRmlsZT86IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IG9wdCA9IGRlcGxveUNtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyAmIHtzdGF0aWM6IGJvb2xlYW47IGZvcmNlOiBib29sZWFuOyBzZWNyZXQ/OiBzdHJpbmc7IHB1c2hCcmFuY2g6IGJvb2xlYW47fTtcbiAgICBpZiAob3B0LmVudiA9PSBudWxsKSB7XG4gICAgICBwbGluay5sb2dnZXIuZXJyb3IoJyBvcHRpb24gXCItLWVudiA8bG9jYWwgfCBkZXYgfCB0ZXN0IHwgc3RhZ2UgfCBwcm9kPlwiIG11c3QgYmUgcHJvdmlkZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2xpRGVwbG95ID0gKHJlcXVpcmUoJy4vY2xpLWRlcGxveScpLmRlZmF1bHQgYXMgdHlwZW9mIF9jbGlEZXBsb3kpO1xuICAgIGF3YWl0IGNsaURlcGxveShvcHQuc3RhdGljLCBvcHQuZW52IHx8ICdsb2NhbCcsIGFwcCwgb3B0LnB1c2hCcmFuY2gsIG9wdC5mb3JjZSAsIG9wdC5zZWNyZXQgfHwgbnVsbCwgc2NyaXB0c0ZpbGUsXG4gICAgICBkZXBsb3lDbWQub3B0cygpLmNjKTtcbiAgfSk7XG4gIC8vIGNyZWF0ZUVudk9wdGlvbihkZXBsb3lDbWQpO1xuICAvLyAtLS0tLS0tLSBnaXRoYXNoIC0tLS0tLS0tLS1cbiAgY29uc3QgZ2l0aGFzaENtZCA9IHByb2dyYW0uY29tbWFuZCgnZ2l0aGFzaCcpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IGdpdCBoYXNoIGluZm9ybWF0aW9uIG9mIGVhY2ggc3RhdGljIHJlc291cmNlIHppcCBmaWxlIGluIGRpcmVjdG9yeSBcImluc3RhbGwtPGVudj5cIicpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBBcnRpZmFjdHMgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpIGFzIHR5cGVvZiBfQXJ0aWZhY3RzO1xuICAgICAgaWYgKGdpdGhhc2hDbWQub3B0cygpLmVudikge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhhd2FpdCBBcnRpZmFjdHMuc3RyaW5naWZ5TGlzdFZlcnNpb25zKGdpdGhhc2hDbWQub3B0cygpLmVudikpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coYXdhaXQgQXJ0aWZhY3RzLnN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoZ2l0aGFzaENtZCk7XG5cbiAgLy8gLS0tLS0tIHNlbmQgLS0tLS0tLS1cbiAgY29uc3Qgc2VuZENtZCA9IHByb2dyYW0uY29tbWFuZCgnc2VuZCA8YXBwLW5hbWU+IDx6aXBGaWxlT3JEaXI+JylcbiAgICAuZGVzY3JpcHRpb24oJ1NlbmQgc3RhdGljIHJlc291cmNlIHRvIHJlbW90ZSBzZXJ2ZXInKVxuICAgIC5vcHRpb24oJy0tY29uIDxudW1iZXIgb2YgY29uY3VycmVudCByZXF1ZXN0PicsICdTZW5kIGZpbGUgd2l0aCBjb25jdXJyZW50IHByb2Nlc3MgZm9yIG11bHRpcGxlIHJlbW90ZSBzZXJ2ZXIgbm9kZXMnLCAnMScpXG4gICAgLm9wdGlvbignLS1ub2RlcyA8bnVtYmVyIG9mIHJlbW90ZSBub2Rlcz4nLCAnTnVtYmVyIG9mIHJlbW90ZSBzZXJ2ZXIgbm9kZXMnLCAnMScpXG4gICAgLm9wdGlvbignLS1zZWNyZXQgPGNyZWRlbnRpYWwgY29kZT4nLCAnY3JlZGVudGlhbCBjb2RlIGZvciBkZXBsb3kgdG8gXCJwcm9kXCIgZW52aXJvbm1lbnQnKVxuICAgIC5vcHRpb24oJy0tZm9yY2UnLCAnRm9yY2Ugb3ZlcndyaXRpbmcgcmVtb3RlIHppcCBhc3NldHMgd2l0aG91dCBTSEExIGNoZWNrc3VtIGNvbXBhcmlzb24sIGJ5IGRlZmF1bHQgcmVtb3RlIHNlcnZlciB3aWxsIHJlamVjdCBmaWxlIG9mIGV4aXN0aW5nIHNhbWUgU0hBMScsXG4gICAgICBmYWxzZSlcbiAgICAuYWN0aW9uKGFzeW5jIChhcHBOYW1lOiBzdHJpbmcsIHppcDogc3RyaW5nKSA9PiB7XG4gICAgICBhd2FpdCAocmVxdWlyZSgnLi9fc2VuZC1wYXRjaCcpIGFzIHR5cGVvZiBzcCkuc2VuZChzZW5kQ21kLm9wdHMoKS5lbnYsIGFwcE5hbWUsIHppcCxcbiAgICAgIHBhcnNlSW50KHNlbmRDbWQub3B0cygpLmNvbiwgMTApLFxuICAgICAgcGFyc2VJbnQoc2VuZENtZC5vcHRzKCkubm9kZXMsIDEwKSxcbiAgICAgIHNlbmRDbWQub3B0cygpLmZvcmNlLFxuICAgICAgc2VuZENtZC5vcHRzKCkuc2VjcmV0KTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoc2VuZENtZCk7XG5cbiAgLy8gLS0tLS0tIG1vY2t6aXAgLS0tLS0tLS1cbiAgY29uc3QgbW9ja3ppcENtZCA9IHByb2dyYW0uY29tbWFuZCgnbW9ja3ppcCcpXG4gICAgLm9wdGlvbignLWQsLS1kaXIgPGRpcj4nLCAnY3JlYXRlIGEgbW9jayB6aXAgZmlsZSBpbiBzcGVjaWZpYyBkaXJlY3RvcnknKVxuICAgIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgQXJ0aWZhY3RzID0gcmVxdWlyZSgnLi9hcnRpZmFjdHMnKSBhcyB0eXBlb2YgX0FydGlmYWN0cztcblxuICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSAnJyArIG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKTtcblxuICAgICAgY29uc3QgZmlsZSA9IG1vY2t6aXBDbWQub3B0cygpLmRpciA/IFBhdGgucmVzb2x2ZShtb2NremlwQ21kLm9wdHMoKS5kaXIsICdwcmVidWlsZC1tb2NrLnppcCcpIDogY2ZnLnJlc29sdmUoJ2Rlc3REaXInLCAncHJlYnVpbGQtbW9jay56aXAnKTtcbiAgICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGZpbGUpKTtcblxuICAgICAgYXdhaXQgQXJ0aWZhY3RzLndyaXRlTW9ja1ppcChmaWxlLCBmaWxlQ29udGVudCk7XG4gICAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwcmVidWlsZCcpO1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKCdNb2NrIHppcDonLCBmaWxlKTtcbiAgICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMobW9ja3ppcENtZCk7XG5cbiAgLy8gLS0tLS0tLS0tLSBrZXlwYWlyIC0tLS0tLS0tLS0tLVxuICBjb25zdCBrZXlwYWlyQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdrZXlwYWlyIFtmaWxlLW5hbWVdJylcbiAgICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgbmV3IGFzeW1tZXRyaWMga2V5IHBhaXInKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZpbGVOYW1lKSA9PiB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgICBjb25zdCBnZW5LZXlwYWlyID0gcmVxdWlyZSgnLi9jbGkta2V5cGFpcicpLmRlZmF1bHQgYXMgdHlwZW9mIF9nZW5LZXlwYWlyO1xuICAgICAgYXdhaXQgZ2VuS2V5cGFpcihmaWxlTmFtZSwga2V5cGFpckNtZC5vcHRzKCkpO1xuICAgIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnZnVuY3Rpb25zIDxmaWxlPicpXG4gICAgLmRlc2NyaXB0aW9uKCdMaXN0IGV4cG9ydGVkIGZ1bmN0aW9ucyBmb3IgKi50cywgKi5kLnRzLCAqLmpzIGZpbGUnKVxuICAgIC5hY3Rpb24oYXN5bmMgZmlsZSA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS10cy1hc3QtdXRpbCcpKS5saXN0RXhwb3J0ZWRGdW5jdGlvbihmaWxlKTtcbiAgICB9KTtcbn07XG5cbmV4cG9ydCB7Y2xpRXh0IGFzIGRlZmF1bHR9O1xuXG5cbi8vIGZ1bmN0aW9uIGNyZWF0ZUVudk9wdGlvbihjbWQ6IGNvbW1hbmRlci5Db21tYW5kLCByZXF1aXJlZCA9IHRydWUpOiBSZXR1cm5UeXBlPGNvbW1hbmRlci5Db21tYW5kWydyZXF1aXJlZE9wdGlvbiddPiB7XG4vLyAgIGNvbnN0IGZ1bmMgPSByZXF1aXJlZCA/IGNtZC5yZXF1aXJlZE9wdGlvbiA6IGNtZC5vcHRpb247XG4vLyAgIHJldHVybiBmdW5jLmNhbGwoY21kLCAnLS1lbnYgPGxvY2FsIHwgZGV2IHwgdGVzdCB8IHN0YWdlIHwgcHJvZD4nLCAndGFyZ2V0IGVudmlyb25tZW50LCBlLmcuIFwibG9jYWxcIiwgXCJkZXZcIiwgXCJ0ZXN0XCIsIFwic3RhZ2VcIiwgXCJwcm9kXCIsIGRlZmF1bHQgYXMgYWxsIGVudmlyb25tZW50Jyk7XG4vLyB9XG5cbiJdfQ==