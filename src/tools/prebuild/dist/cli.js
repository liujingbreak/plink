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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUEsZ0RBQXdCO0FBQ3hCLHdFQUE2QztBQUc3Qyx3REFBMEI7QUFJMUIsb0RBQTRCO0FBTzVCLGdEQUFnRDtBQUVoRCxNQUFNLE1BQU0sR0FBaUIsQ0FBQyxPQUFPLEVBQUUsRUFBRTtJQUV2QyxnQ0FBZ0M7SUFDaEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrREFBa0QsQ0FBQztTQUNwRixXQUFXLENBQUMsK0JBQStCLENBQUM7U0FDNUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLGtFQUFrRSxFQUFFLEtBQUssQ0FBQztTQUNwRyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsK0JBQStCLEVBQUUsS0FBSyxDQUFDO1FBQ25FLGtEQUFrRDtTQUNqRCxNQUFNLENBQUMsNEJBQTRCLEVBQUUsa0RBQWtELENBQUM7U0FDeEYsTUFBTSxDQUFDLHVCQUF1QixFQUFFLDZDQUE2QyxDQUFDO1NBQzlFLE1BQU0sQ0FBQyxTQUFTLEVBQUUsdUlBQXVJLEVBQ3hKLEtBQUssQ0FBQztTQUNQLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxXQUFvQixFQUFFLEVBQUU7UUFDbEQsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzdCLE1BQU0sU0FBUyxHQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUE2QixDQUFDO1FBQ3pFLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFD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RixJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFlLENBQUMsQ0FBQztJQUNuRixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQztTQUNsQyxXQUFXLENBQUMscURBQXFELENBQUM7U0FDbEUsTUFBTSxDQUFDLENBQU0sSUFBSSxFQUFDLEVBQUU7UUFDbkIsQ0FBQyx3REFBYSxtQkFBbUIsR0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakUsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVnQix5QkFBTztBQUd6QixTQUFTLGVBQWUsQ0FBQyxHQUFzQixFQUFFLFFBQVEsR0FBRyxJQUFJO0lBQzlELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztJQUN4RCxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLDJDQUEyQyxFQUFFLDhGQUE4RixDQUFDLENBQUM7QUFDckssQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNmZyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZyc7XG5pbXBvcnQgKiBhcyBfQXJ0aWZhY3RzIGZyb20gJy4vYXJ0aWZhY3RzJztcbmltcG9ydCAqIGFzIHNwIGZyb20gJy4vX3NlbmQtcGF0Y2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIF9wcmVidWlsZFBvc3QgZnJvbSAnLi9wcmVidWlsZC1wb3N0Jztcbi8vIGltcG9ydCB7c3Bhd259IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgX2NsaURlcGxveSBmcm9tICcuL2NsaS1kZXBsb3knO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF9nZW5LZXlwYWlyIGZyb20gJy4vY2xpLWtleXBhaXInO1xuaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHtwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcn0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLXJ1bm5lcic7XG5cbi8vIGltcG9ydCAqIGFzIHRzQXN0UXVlcnkgZnJvbSAnLi90cy1hc3QtcXVlcnknO1xuaW1wb3J0ICogYXMgX3VuemlwIGZyb20gJy4vY2xpLXVuemlwJztcbi8vIGltcG9ydCAqIGFzIGFzdFV0aWwgZnJvbSAnLi9jbGktdHMtYXN0LXV0aWwnO1xuXG5jb25zdCBjbGlFeHQ6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG5cbiAgLy8gLS0tLS0tLS0tLS0gZGVwbG95IC0tLS0tLS0tLS1cbiAgY29uc3QgZGVwbG95Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdkZXBsb3kgPGFwcC1uYW1lPiBbdHMtc2NyaXB0cyNmdW5jdGlvbi1vci1zaGVsbF0nKVxuICAuZGVzY3JpcHRpb24oJ0RlcGxveSAoZm9yIFBsaW5rIGludGVybmFsbHkpJylcbiAgLm9wdGlvbignLS1wdXNoLC0tc3RhdGljJywgJ3B1c2ggdG8gcmVtb3RlIGZpbGUgc2VydmVyIGFmdGVyIGJ1aWxkIHNjcmlwdCBleGVjdXRpb24gZmluaXNoZWQnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1uby1wdXNoLWJyYW5jaCcsICdEbyBub3QgcHVzaCB0byByZWxlYXNlIGJyYW5jaCcsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXNlY3JldCA8c2VjcmV0PicsICdjcmVkZW50aWFsIHdvcmQnKVxuICAub3B0aW9uKCctLXNlY3JldCA8Y3JlZGVudGlhbCBjb2RlPicsICdjcmVkZW50aWFsIGNvZGUgZm9yIGRlcGxveSB0byBcInByb2RcIiBlbnZpcm9ubWVudCcpXG4gIC5vcHRpb24oJy0tY2MgPGNvbW1pdCBjb21tZW50PicsICdUaGUgY29tbWl0IGNvbW1lbnQgb2YgdGhlIGRlcGxveW1lbnQgY29tbWl0JylcbiAgLm9wdGlvbignLS1mb3JjZScsICdGb3JjZSBvdmVyd3JpdGluZyByZW1vdGUgemlwIGFzc2V0cyB3aXRob3V0IFNIQTEgY2hlY2tzdW0gY29tcGFyaXNvbiwgYnkgZGVmYXVsdCByZW1vdGUgc2VydmVyIHdpbGwgcmVqZWN0IGZpbGUgb2YgZXhpc3Rpbmcgc2FtZSBTSEExJyxcbiAgICBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoYXBwOiBzdHJpbmcsIHNjcmlwdHNGaWxlPzogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgb3B0ID0gZGVwbG95Q21kLm9wdHMoKTtcbiAgICBjb25zdCBjbGlEZXBsb3kgPSAocmVxdWlyZSgnLi9jbGktZGVwbG95JykuZGVmYXVsdCBhcyB0eXBlb2YgX2NsaURlcGxveSk7XG4gICAgY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncHJlYnVpbGQnKTtcbiAgICBsb2cuaW5mbygnY29tbWl0IGNvbW1lbnQ6JywgZGVwbG95Q21kLm9wdHMoKS5jYyk7XG4gICAgYXdhaXQgY2xpRGVwbG95KG9wdC5zdGF0aWMsIG9wdC5lbnYsIGFwcCwgZGVwbG95Q21kLm9wdHMoKS5wdXNoQnJhbmNoLCBkZXBsb3lDbWQub3B0cygpLmZvcmNlICwgZGVwbG95Q21kLm9wdHMoKS5zZWNyZXQgfHwgbnVsbCwgc2NyaXB0c0ZpbGUsXG4gICAgICBkZXBsb3lDbWQub3B0cygpLmNjKTtcbiAgfSk7XG4gIGNyZWF0ZUVudk9wdGlvbihkZXBsb3lDbWQpO1xuICAvLyAtLS0tLS0tLSBnaXRoYXNoIC0tLS0tLS0tLS1cbiAgY29uc3QgZ2l0aGFzaENtZCA9IGNyZWF0ZUVudk9wdGlvbihwcm9ncmFtLmNvbW1hbmQoJ2dpdGhhc2gnKSwgZmFsc2UpXG4gIC5kZXNjcmlwdGlvbignTGlzdCBnaXQgaGFzaCBpbmZvcm1hdGlvbiBvZiBlYWNoIHN0YXRpYyByZXNvdXJjZSB6aXAgZmlsZSBpbiBkaXJlY3RvcnkgXCJpbnN0YWxsLTxlbnY+XCInKVxuICAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBBcnRpZmFjdHM6IHR5cGVvZiBfQXJ0aWZhY3RzID0gcmVxdWlyZSgnLi9hcnRpZmFjdHMnKTtcbiAgICBpZiAoZ2l0aGFzaENtZC5vcHRzKCkuZW52KSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGF3YWl0IEFydGlmYWN0cy5zdHJpbmdpZnlMaXN0VmVyc2lvbnMoZ2l0aGFzaENtZC5vcHRzKCkuZW52KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYXdhaXQgQXJ0aWZhY3RzLnN0cmluZ2lmeUxpc3RBbGxWZXJzaW9ucygpKTtcbiAgICB9XG4gIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhnaXRoYXNoQ21kKTtcblxuICAvLyAtLS0tLS0gc2VuZCAtLS0tLS0tLVxuICBjb25zdCBzZW5kQ21kID0gY3JlYXRlRW52T3B0aW9uKHByb2dyYW0uY29tbWFuZCgnc2VuZCA8YXBwLW5hbWU+IDx6aXBGaWxlT3JEaXI+JykpXG4gIC5kZXNjcmlwdGlvbignU2VuZCBzdGF0aWMgcmVzb3VyY2UgdG8gcmVtb3RlIHNlcnZlcicpXG4gIC5vcHRpb24oJy0tY29uIDxudW1iZXIgb2YgY29uY3VycmVudCByZXF1ZXN0PicsICdTZW5kIGZpbGUgd2l0aCBjb25jdXJyZW50IHByb2Nlc3MgZm9yIG11bHRpcGxlIHJlbW90ZSBzZXJ2ZXIgbm9kZXMnLCAnMScpXG4gIC5vcHRpb24oJy0tbm9kZXMgPG51bWJlciBvZiByZW1vdGUgbm9kZXM+JywgJ051bWJlciBvZiByZW1vdGUgc2VydmVyIG5vZGVzJywgJzEnKVxuICAub3B0aW9uKCctLXNlY3JldCA8Y3JlZGVudGlhbCBjb2RlPicsICdjcmVkZW50aWFsIGNvZGUgZm9yIGRlcGxveSB0byBcInByb2RcIiBlbnZpcm9ubWVudCcpXG4gIC5vcHRpb24oJy0tZm9yY2UnLCAnRm9yY2Ugb3ZlcndyaXRpbmcgcmVtb3RlIHppcCBhc3NldHMgd2l0aG91dCBTSEExIGNoZWNrc3VtIGNvbXBhcmlzb24sIGJ5IGRlZmF1bHQgcmVtb3RlIHNlcnZlciB3aWxsIHJlamVjdCBmaWxlIG9mIGV4aXN0aW5nIHNhbWUgU0hBMScsXG4gICAgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGFwcE5hbWU6IHN0cmluZywgemlwOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAocmVxdWlyZSgnLi9fc2VuZC1wYXRjaCcpIGFzIHR5cGVvZiBzcCkuc2VuZChzZW5kQ21kLm9wdHMoKS5lbnYsIGFwcE5hbWUsIHppcCxcbiAgICBwYXJzZUludChzZW5kQ21kLm9wdHMoKS5jb24sIDEwKSxcbiAgICBwYXJzZUludChzZW5kQ21kLm9wdHMoKS5ub2RlcywgMTApLFxuICAgIHNlbmRDbWQub3B0cygpLmZvcmNlLFxuICAgIHNlbmRDbWQub3B0cygpLnNlY3JldCk7XG4gIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhzZW5kQ21kKTtcblxuICAvLyAtLS0tLS0gbW9ja3ppcCAtLS0tLS0tLVxuICBjb25zdCBtb2NremlwQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdtb2NremlwJyk7XG4gIG1vY2t6aXBDbWQub3B0aW9uKCctZCwtLWRpciA8ZGlyPicsICdjcmVhdGUgYSBtb2NrIHppcCBmaWxlIGluIHNwZWNpZmljIGRpcmVjdG9yeScpO1xuICBtb2NremlwQ21kLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgQXJ0aWZhY3RzOiB0eXBlb2YgX0FydGlmYWN0cyA9IHJlcXVpcmUoJy4vYXJ0aWZhY3RzJyk7XG5cbiAgICBjb25zdCBmaWxlQ29udGVudCA9ICcnICsgbmV3IERhdGUoKS50b1VUQ1N0cmluZygpO1xuXG4gICAgY29uc3QgZmlsZSA9IG1vY2t6aXBDbWQub3B0cygpLmRpciA/IFBhdGgucmVzb2x2ZShtb2NremlwQ21kLm9wdHMoKS5kaXIsICdwcmVidWlsZC1tb2NrLnppcCcpIDogY2ZnLnJlc29sdmUoJ2Rlc3REaXInLCAncHJlYnVpbGQtbW9jay56aXAnKTtcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShmaWxlKSk7XG5cbiAgICBhd2FpdCBBcnRpZmFjdHMud3JpdGVNb2NrWmlwKGZpbGUsIGZpbGVDb250ZW50KTtcbiAgICBjb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwcmVidWlsZCcpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdNb2NrIHppcDonLCBmaWxlKTtcbiAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKG1vY2t6aXBDbWQpO1xuXG4gIC8vIC0tLS0tLS0tLS0ga2V5cGFpciAtLS0tLS0tLS0tLS1cbiAgY29uc3Qga2V5cGFpckNtZCA9IHByb2dyYW0uY29tbWFuZCgna2V5cGFpciBbZmlsZS1uYW1lXScpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSBuZXcgYXN5bW1ldHJpYyBrZXkgcGFpcicpXG4gIC5hY3Rpb24oYXN5bmMgKGZpbGVOYW1lKSA9PiB7XG4gICAgY29uc3QgZ2VuS2V5cGFpciA9IHJlcXVpcmUoJy4vY2xpLWtleXBhaXInKS5kZWZhdWx0IGFzIHR5cGVvZiBfZ2VuS2V5cGFpcjtcbiAgICBhd2FpdCBnZW5LZXlwYWlyKGZpbGVOYW1lLCBrZXlwYWlyQ21kLm9wdHMoKSk7XG4gIH0pO1xuXG4gIGNvbnN0IHRzQXN0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCd0cy1hc3QgPHRzLWZpbGU+JylcbiAgLm9wdGlvbignLS1uby10eXBlJywgJ2RvIG5vdCBwcmludCBBU1QgdHlwZScsIGZhbHNlKVxuICAub3B0aW9uKCctcXwtLXF1ZXJ5IDxzZWxlY3Rvcj4nLCAncXVlcnkgc2VsZWN0b3InLCB1bmRlZmluZWQpXG4gIC5kZXNjcmlwdGlvbignUHJpbnQgVHlwZXNjcmlwdCBBU1Qgc3RydWN0dXJlJylcbiAgLmFjdGlvbihhc3luYyBmaWxlbmFtZSA9PiB7XG4gICAgY29uc3QgYXN0USA9IGF3YWl0IGltcG9ydCgnLi90cy1hc3QtcXVlcnknKTtcbiAgICAvLyBjb25zdCBwcmludEZpbGU6ICh0eXBlb2YgdHNBc3RRdWVyeSlbJ3ByaW50RmlsZSddID0gcmVxdWlyZSgnLi90cy1hc3QtcXVlcnknKS5wcmludEZpbGU7XG4gICAgYXN0US5wcmludEZpbGUoZmlsZW5hbWUsIHRzQXN0Q21kLm9wdHMoKS5xdWVyeSwgdHNBc3RDbWQub3B0cygpLnR5cGUgYXMgYm9vbGVhbik7XG4gIH0pO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnZnVuY3Rpb25zIDxmaWxlPicpXG4gIC5kZXNjcmlwdGlvbignTGlzdCBleHBvcnRlZCBmdW5jdGlvbnMgZm9yICoudHMsICouZC50cywgKi5qcyBmaWxlJylcbiAgLmFjdGlvbihhc3luYyBmaWxlID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS10cy1hc3QtdXRpbCcpKS5saXN0RXhwb3J0ZWRGdW5jdGlvbihmaWxlKTtcbiAgfSk7XG59O1xuXG5leHBvcnQge2NsaUV4dCBhcyBkZWZhdWx0fTtcblxuXG5mdW5jdGlvbiBjcmVhdGVFbnZPcHRpb24oY21kOiBjb21tYW5kZXIuQ29tbWFuZCwgcmVxdWlyZWQgPSB0cnVlKTogUmV0dXJuVHlwZTxjb21tYW5kZXIuQ29tbWFuZFsncmVxdWlyZWRPcHRpb24nXT4ge1xuICBjb25zdCBmdW5jID0gcmVxdWlyZWQgPyBjbWQucmVxdWlyZWRPcHRpb24gOiBjbWQub3B0aW9uO1xuICByZXR1cm4gZnVuYy5jYWxsKGNtZCwgJy0tZW52IDxsb2NhbCB8IGRldiB8IHRlc3QgfCBzdGFnZSB8IHByb2Q+JywgJ3RhcmdldCBlbnZpcm9ubWVudCwgZS5nLiBcImxvY2FsXCIsIFwiZGV2XCIsIFwidGVzdFwiLCBcInN0YWdlXCIsIFwicHJvZFwiLCBkZWZhdWx0IGFzIGFsbCBlbnZpcm9ubWVudCcpO1xufVxuXG4iXX0=