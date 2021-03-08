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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EscUNBQXFDO0FBQ3JDLGdEQUF3QjtBQUN4Qix3RUFBNkM7QUFHN0Msd0RBQTBCO0FBSTFCLG9EQUE0QjtBQUk1QixzREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFFdkMsZ0NBQWdDO0lBQ2hDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0RBQWtELENBQUM7U0FDcEYsV0FBVyxDQUFDLCtCQUErQixDQUFDO1NBQzVDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxrRUFBa0UsRUFBRSxLQUFLLENBQUM7U0FDcEcsTUFBTSxDQUFDLGtCQUFrQixFQUFFLDZDQUE2QyxFQUFFLEtBQUssQ0FBQztRQUNqRixrREFBa0Q7U0FDakQsTUFBTSxDQUFDLDRCQUE0QixFQUFFLGtEQUFrRCxDQUFDO1NBQ3hGLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSw2Q0FBNkMsQ0FBQztTQUM5RSxNQUFNLENBQUMsU0FBUyxFQUFFLHVJQUF1SSxFQUN4SixLQUFLLENBQUM7U0FDUCxNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsV0FBb0IsRUFBRSxFQUFFO1FBQ2xELE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxJQUFJLEVBQThGLENBQUM7UUFDekgsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLElBQUksRUFBRTtZQUNuQixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsc0VBQXNFLENBQUMsQ0FBQztZQUMzRixPQUFPO1NBQ1I7UUFDRCxNQUFNLFNBQVMsR0FBSSxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsT0FBNkIsQ0FBQztRQUN6RSxNQUFNLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksT0FBTyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsVUFBVSxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUcsR0FBRyxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUUsV0FBVyxFQUM5RyxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILDhCQUE4QjtJQUM5Qiw4QkFBOEI7SUFDOUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUM7U0FDMUMsV0FBVyxDQUFDLHlGQUF5RixDQUFDO1NBQ3RHLE1BQU0sQ0FBQyxHQUFTLEVBQUU7UUFDakIsTUFBTSxTQUFTLEdBQXNCLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM1RCxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLEVBQUU7WUFDekIsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxTQUFTLENBQUMscUJBQXFCLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDM0U7YUFBTTtZQUNMLHVDQUF1QztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sU0FBUyxDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQztTQUN6RDtJQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCxpQ0FBaUM7SUFFakMsdUJBQXVCO0lBQ3ZCLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0NBQWdDLENBQUM7U0FDOUQsV0FBVyxDQUFDLHVDQUF1QyxDQUFDO1NBQ3BELE1BQU0sQ0FBQyxzQ0FBc0MsRUFBRSxvRUFBb0UsRUFBRSxHQUFHLENBQUM7U0FDekgsTUFBTSxDQUFDLGtDQUFrQyxFQUFFLCtCQUErQixFQUFFLEdBQUcsQ0FBQztTQUNoRixNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUM7U0FDeEYsTUFBTSxDQUFDLFNBQVMsRUFBRSx1SUFBdUksRUFDeEosS0FBSyxDQUFDO1NBQ1AsTUFBTSxDQUFDLENBQU8sT0FBZSxFQUFFLEdBQVcsRUFBRSxFQUFFO1FBQzdDLE1BQU8sT0FBTyxDQUFDLGVBQWUsQ0FBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQ25GLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUNoQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsRUFDbEMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssRUFDcEIsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDTCw4QkFBOEI7SUFFOUIsMEJBQTBCO0lBQzFCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1NBQzFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSw4Q0FBOEMsQ0FBQztTQUN4RSxNQUFNLENBQUMsR0FBUyxFQUFFO1FBQ2pCLE1BQU0sU0FBUyxHQUFzQixPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFNUQsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFbEQsTUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzVJLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVsQyxNQUFNLFNBQVMsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ2hELE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLHVDQUF1QztRQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0wsaUNBQWlDO0lBRWpDLGtDQUFrQztJQUNsQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDO1NBQ3RELFdBQVcsQ0FBQyxvQ0FBb0MsQ0FBQztTQUNqRCxNQUFNLENBQUMsQ0FBTyxRQUFRLEVBQUUsRUFBRTtRQUN6QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBNkIsQ0FBQztRQUMxRSxNQUFNLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMLE9BQU8sQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUM7U0FDaEMsV0FBVyxDQUFDLHFEQUFxRCxDQUFDO1NBQ2xFLE1BQU0sQ0FBQyxDQUFNLElBQUksRUFBQyxFQUFFO1FBQ25CLENBQUMsd0RBQWEsbUJBQW1CLEdBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pFLENBQUMsQ0FBQSxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUM7QUFFZ0IseUJBQU87QUFHekIsdUhBQXVIO0FBQ3ZILDZEQUE2RDtBQUM3RCx3S0FBd0s7QUFDeEssSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNmZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5pbXBvcnQgKiBhcyBfQXJ0aWZhY3RzIGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCAqIGFzIHNwIGZyb20gJy4vX3NlbmQtcGF0Y2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF9wcmVidWlsZFBvc3QgZnJvbSAnLi9wcmVidWlsZC1wb3N0Jztcbi8vIGltcG9ydCB7c3Bhd259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgX2NsaURlcGxveSBmcm9tICcuL2NsaS1kZXBsb3knO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF9nZW5LZXlwYWlyIGZyb20gJy4vY2xpLWtleXBhaXInO1xuaW1wb3J0IHtDbGlFeHRlbnNpb24sIEdsb2JhbE9wdGlvbnN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0ICogYXMgX3VuemlwIGZyb20gJy4vY2xpLXVuemlwJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuXG4gIC8vIC0tLS0tLS0tLS0tIGRlcGxveSAtLS0tLS0tLS0tXG4gIGNvbnN0IGRlcGxveUNtZCA9IHByb2dyYW0uY29tbWFuZCgnZGVwbG95IDxhcHAtbmFtZT4gW3RzLXNjcmlwdHMjZnVuY3Rpb24tb3Itc2hlbGxdJylcbiAgLmRlc2NyaXB0aW9uKCdEZXBsb3kgKGZvciBQbGluayBpbnRlcm5hbGx5KScpXG4gIC5vcHRpb24oJy0tcHVzaCwtLXN0YXRpYycsICdwdXNoIHRvIHJlbW90ZSBmaWxlIHNlcnZlciBhZnRlciBidWlsZCBzY3JpcHQgZXhlY3V0aW9uIGZpbmlzaGVkJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tbm8tcHVzaC1icmFuY2gnLCAnRG8gbm90IHB1c2ggdG8gcmVsZWFzZSBicmFuY2ggb3IgY3JlYXRlIHRhZycsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXNlY3JldCA8c2VjcmV0PicsICdjcmVkZW50aWFsIHdvcmQnKVxuICAub3B0aW9uKCctLXNlY3JldCA8Y3JlZGVudGlhbCBjb2RlPicsICdjcmVkZW50aWFsIGNvZGUgZm9yIGRlcGxveSB0byBcInByb2RcIiBlbnZpcm9ubWVudCcpXG4gIC5vcHRpb24oJy0tY2MgPGNvbW1pdCBjb21tZW50PicsICdUaGUgY29tbWl0IGNvbW1lbnQgb2YgdGhlIGRlcGxveW1lbnQgY29tbWl0JylcbiAgLm9wdGlvbignLS1mb3JjZScsICdGb3JjZSBvdmVyd3JpdGluZyByZW1vdGUgemlwIGFzc2V0cyB3aXRob3V0IFNIQTEgY2hlY2tzdW0gY29tcGFyaXNvbiwgYnkgZGVmYXVsdCByZW1vdGUgc2VydmVyIHdpbGwgcmVqZWN0IGZpbGUgb2YgZXhpc3Rpbmcgc2FtZSBTSEExJyxcbiAgICBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoYXBwOiBzdHJpbmcsIHNjcmlwdHNGaWxlPzogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgb3B0ID0gZGVwbG95Q21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zICYge3N0YXRpYzogYm9vbGVhbjsgZm9yY2U6IGJvb2xlYW47IHNlY3JldD86IHN0cmluZzsgcHVzaEJyYW5jaDogYm9vbGVhbjt9O1xuICAgIGlmIChvcHQuZW52ID09IG51bGwpIHtcbiAgICAgIHBsaW5rLmxvZ2dlci5lcnJvcignIG9wdGlvbiBcIi0tZW52IDxsb2NhbCB8IGRldiB8IHRlc3QgfCBzdGFnZSB8IHByb2Q+XCIgbXVzdCBiZSBwcm92aWRlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBjbGlEZXBsb3kgPSAocmVxdWlyZSgnLi9jbGktZGVwbG95JykuZGVmYXVsdCBhcyB0eXBlb2YgX2NsaURlcGxveSk7XG4gICAgYXdhaXQgY2xpRGVwbG95KG9wdC5zdGF0aWMsIG9wdC5lbnYgfHwgJ2xvY2FsJywgYXBwLCBvcHQucHVzaEJyYW5jaCwgb3B0LmZvcmNlICwgb3B0LnNlY3JldCB8fCBudWxsLCBzY3JpcHRzRmlsZSxcbiAgICAgIGRlcGxveUNtZC5vcHRzKCkuY2MpO1xuICB9KTtcbiAgLy8gY3JlYXRlRW52T3B0aW9uKGRlcGxveUNtZCk7XG4gIC8vIC0tLS0tLS0tIGdpdGhhc2ggLS0tLS0tLS0tLVxuICBjb25zdCBnaXRoYXNoQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdnaXRoYXNoJylcbiAgICAuZGVzY3JpcHRpb24oJ0xpc3QgZ2l0IGhhc2ggaW5mb3JtYXRpb24gb2YgZWFjaCBzdGF0aWMgcmVzb3VyY2UgemlwIGZpbGUgaW4gZGlyZWN0b3J5IFwiaW5zdGFsbC08ZW52PlwiJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IEFydGlmYWN0czogdHlwZW9mIF9BcnRpZmFjdHMgPSByZXF1aXJlKCcuL2FydGlmYWN0cycpO1xuICAgICAgaWYgKGdpdGhhc2hDbWQub3B0cygpLmVudikge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coYXdhaXQgQXJ0aWZhY3RzLnN0cmluZ2lmeUxpc3RWZXJzaW9ucyhnaXRoYXNoQ21kLm9wdHMoKS5lbnYpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZyhhd2FpdCBBcnRpZmFjdHMuc3RyaW5naWZ5TGlzdEFsbFZlcnNpb25zKCkpO1xuICAgICAgfVxuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhnaXRoYXNoQ21kKTtcblxuICAvLyAtLS0tLS0gc2VuZCAtLS0tLS0tLVxuICBjb25zdCBzZW5kQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdzZW5kIDxhcHAtbmFtZT4gPHppcEZpbGVPckRpcj4nKVxuICAgIC5kZXNjcmlwdGlvbignU2VuZCBzdGF0aWMgcmVzb3VyY2UgdG8gcmVtb3RlIHNlcnZlcicpXG4gICAgLm9wdGlvbignLS1jb24gPG51bWJlciBvZiBjb25jdXJyZW50IHJlcXVlc3Q+JywgJ1NlbmQgZmlsZSB3aXRoIGNvbmN1cnJlbnQgcHJvY2VzcyBmb3IgbXVsdGlwbGUgcmVtb3RlIHNlcnZlciBub2RlcycsICcxJylcbiAgICAub3B0aW9uKCctLW5vZGVzIDxudW1iZXIgb2YgcmVtb3RlIG5vZGVzPicsICdOdW1iZXIgb2YgcmVtb3RlIHNlcnZlciBub2RlcycsICcxJylcbiAgICAub3B0aW9uKCctLXNlY3JldCA8Y3JlZGVudGlhbCBjb2RlPicsICdjcmVkZW50aWFsIGNvZGUgZm9yIGRlcGxveSB0byBcInByb2RcIiBlbnZpcm9ubWVudCcpXG4gICAgLm9wdGlvbignLS1mb3JjZScsICdGb3JjZSBvdmVyd3JpdGluZyByZW1vdGUgemlwIGFzc2V0cyB3aXRob3V0IFNIQTEgY2hlY2tzdW0gY29tcGFyaXNvbiwgYnkgZGVmYXVsdCByZW1vdGUgc2VydmVyIHdpbGwgcmVqZWN0IGZpbGUgb2YgZXhpc3Rpbmcgc2FtZSBTSEExJyxcbiAgICAgIGZhbHNlKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFwcE5hbWU6IHN0cmluZywgemlwOiBzdHJpbmcpID0+IHtcbiAgICAgIGF3YWl0IChyZXF1aXJlKCcuL19zZW5kLXBhdGNoJykgYXMgdHlwZW9mIHNwKS5zZW5kKHNlbmRDbWQub3B0cygpLmVudiwgYXBwTmFtZSwgemlwLFxuICAgICAgcGFyc2VJbnQoc2VuZENtZC5vcHRzKCkuY29uLCAxMCksXG4gICAgICBwYXJzZUludChzZW5kQ21kLm9wdHMoKS5ub2RlcywgMTApLFxuICAgICAgc2VuZENtZC5vcHRzKCkuZm9yY2UsXG4gICAgICBzZW5kQ21kLm9wdHMoKS5zZWNyZXQpO1xuICAgIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhzZW5kQ21kKTtcblxuICAvLyAtLS0tLS0gbW9ja3ppcCAtLS0tLS0tLVxuICBjb25zdCBtb2NremlwQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdtb2NremlwJylcbiAgICAub3B0aW9uKCctZCwtLWRpciA8ZGlyPicsICdjcmVhdGUgYSBtb2NrIHppcCBmaWxlIGluIHNwZWNpZmljIGRpcmVjdG9yeScpXG4gICAgLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBBcnRpZmFjdHM6IHR5cGVvZiBfQXJ0aWZhY3RzID0gcmVxdWlyZSgnLi9hcnRpZmFjdHMnKTtcblxuICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSAnJyArIG5ldyBEYXRlKCkudG9VVENTdHJpbmcoKTtcblxuICAgICAgY29uc3QgZmlsZSA9IG1vY2t6aXBDbWQub3B0cygpLmRpciA/IFBhdGgucmVzb2x2ZShtb2NremlwQ21kLm9wdHMoKS5kaXIsICdwcmVidWlsZC1tb2NrLnppcCcpIDogY2ZnLnJlc29sdmUoJ2Rlc3REaXInLCAncHJlYnVpbGQtbW9jay56aXAnKTtcbiAgICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGZpbGUpKTtcblxuICAgICAgYXdhaXQgQXJ0aWZhY3RzLndyaXRlTW9ja1ppcChmaWxlLCBmaWxlQ29udGVudCk7XG4gICAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwcmVidWlsZCcpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbygnTW9jayB6aXA6JywgZmlsZSk7XG4gICAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKG1vY2t6aXBDbWQpO1xuXG4gIC8vIC0tLS0tLS0tLS0ga2V5cGFpciAtLS0tLS0tLS0tLS1cbiAgY29uc3Qga2V5cGFpckNtZCA9IHByb2dyYW0uY29tbWFuZCgna2V5cGFpciBbZmlsZS1uYW1lXScpXG4gICAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIG5ldyBhc3ltbWV0cmljIGtleSBwYWlyJylcbiAgICAuYWN0aW9uKGFzeW5jIChmaWxlTmFtZSkgPT4ge1xuICAgICAgY29uc3QgZ2VuS2V5cGFpciA9IHJlcXVpcmUoJy4vY2xpLWtleXBhaXInKS5kZWZhdWx0IGFzIHR5cGVvZiBfZ2VuS2V5cGFpcjtcbiAgICAgIGF3YWl0IGdlbktleXBhaXIoZmlsZU5hbWUsIGtleXBhaXJDbWQub3B0cygpKTtcbiAgICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2Z1bmN0aW9ucyA8ZmlsZT4nKVxuICAgIC5kZXNjcmlwdGlvbignTGlzdCBleHBvcnRlZCBmdW5jdGlvbnMgZm9yICoudHMsICouZC50cywgKi5qcyBmaWxlJylcbiAgICAuYWN0aW9uKGFzeW5jIGZpbGUgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi9jbGktdHMtYXN0LXV0aWwnKSkubGlzdEV4cG9ydGVkRnVuY3Rpb24oZmlsZSk7XG4gICAgfSk7XG59O1xuXG5leHBvcnQge2NsaUV4dCBhcyBkZWZhdWx0fTtcblxuXG4vLyBmdW5jdGlvbiBjcmVhdGVFbnZPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgcmVxdWlyZWQgPSB0cnVlKTogUmV0dXJuVHlwZTxjb21tYW5kZXIuQ29tbWFuZFsncmVxdWlyZWRPcHRpb24nXT4ge1xuLy8gICBjb25zdCBmdW5jID0gcmVxdWlyZWQgPyBjbWQucmVxdWlyZWRPcHRpb24gOiBjbWQub3B0aW9uO1xuLy8gICByZXR1cm4gZnVuYy5jYWxsKGNtZCwgJy0tZW52IDxsb2NhbCB8IGRldiB8IHRlc3QgfCBzdGFnZSB8IHByb2Q+JywgJ3RhcmdldCBlbnZpcm9ubWVudCwgZS5nLiBcImxvY2FsXCIsIFwiZGV2XCIsIFwidGVzdFwiLCBcInN0YWdlXCIsIFwicHJvZFwiLCBkZWZhdWx0IGFzIGFsbCBlbnZpcm9ubWVudCcpO1xuLy8gfVxuXG4iXX0=