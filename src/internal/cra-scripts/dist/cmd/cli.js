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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
const path_1 = __importDefault(require("path"));
// import commander from 'Commander';
const utils_1 = require("../utils");
const child_process_1 = require("child_process");
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
const cli = (program) => {
    const buildCmd = program.command('cra-build <app|lib> <package-name>')
        .description('Compile react application or library (work with create-react-app v4.0.3)', {
        'app|lib': '"app" stands for building a complete application like create-react-app,\n' +
            '"lib" stands for building a library',
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .option('-w, --watch', 'when argument is "lib", watch file changes and compile', false)
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set "external" property of Webpack configuration for all request not begin with "." (not relative path), ' +
        'meaning all non-relative modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i \'^someLib(/|$)\' -i \'^someLib2(/|$)\' -i ...) ' +
        ' to make them be included in bundle file. To make specific module (React) external: -i \'^(?!react(-dom)?($|/))\'', arrayOptionFn, [])
        .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
        .action((type, pkgName) => {
        if (process.cwd() !== path_1.default.resolve(plink_1.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_1.plinkEnv.workDir));
        }
        runReactScripts(buildCmd.name(), buildCmd.opts(), type, pkgName);
        require('react-scripts/scripts/build');
    });
    withClicOpt(buildCmd);
    program.command('cra-build-tsd <package-name>')
        .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
        'command "cra-build" will also generate tsd file along with client bundle', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action(async (pkgName) => {
        runReactScripts(StartCmd.name(), StartCmd.opts(), 'lib', pkgName);
        await (await Promise.resolve().then(() => __importStar(require('../tsd-generate')))).buildTsd([pkgName]);
    });
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library (work with create-react-app v4.0.3)', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgName) => {
        if (process.cwd() !== path_1.default.resolve(plink_1.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_1.plinkEnv.workDir));
        }
        runReactScripts(StartCmd.name(), StartCmd.opts(), 'app', pkgName);
        require('react-scripts/scripts/start');
    });
    withClicOpt(StartCmd);
    program.command('cra-open <url>')
        .description('Run react-dev-utils/openBrowser', { url: 'URL' })
        .action(async (url) => {
        (await Promise.resolve().then(() => __importStar(require('../cra-open-browser')))).default(url);
    });
    program.command('cra-analyze [js-dir]')
        .alias('cra-analyse')
        .description('Run source-map-explorer', {
        'js-dir': 'Normally this path should be <root-dir>dist/static/<output-path-basename>/static/js'
    })
        .action(async (outputPath) => {
        const smePkgDir = path_1.default.dirname(require.resolve('source-map-explorer/package.json'));
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const smeBin = require(path_1.default.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'];
        await new Promise((resolve, rej) => {
            const cp = (0, child_process_1.fork)(path_1.default.resolve(smePkgDir, smeBin), [
                '--gzip', '--no-root',
                path_1.default.resolve(outputPath ? outputPath : '', '*.js')
            ], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
            cp.on('error', err => {
                console.error(err);
                rej(err);
            });
            cp.on('exit', (_sign, code) => { resolve(code); });
        });
    });
};
exports.default = cli;
function withClicOpt(cmd) {
    cmd.option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', undefined);
}
function arrayOptionFn(curr, prev) {
    if (prev)
        prev.push(curr);
    return prev;
}
function runReactScripts(cmdName, opts, type, pkgName) {
    const cfg = plink_1.config;
    (0, utils_1.saveCmdOptionsToEnv)(pkgName, cmdName, opts, type);
    if (process.env.PORT == null && cfg().port)
        process.env.PORT = cfg().port + '';
    if (!['app', 'lib'].includes(type)) {
        log.error('type argument must be one of \'app\', \'lib\'');
        return;
    }
    const preload = require('../preload');
    preload.poo();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EsZ0RBQXdCO0FBQ3hCLHFDQUFxQztBQUNyQyxvQ0FBMkQ7QUFDM0QsaURBQW1DO0FBRW5DLHNDQUFpRTtBQUNqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNuRSxXQUFXLENBQUMsMEVBQTBFLEVBQUU7UUFDdkYsU0FBUyxFQUFFLDJFQUEyRTtZQUNwRixxQ0FBcUM7UUFDdkMsY0FBYyxFQUFFLDJEQUEyRDtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLGFBQWEsRUFBRSx3REFBd0QsRUFBRSxLQUFLLENBQUM7U0FDdEYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyw2SkFBNko7UUFDN0osMkhBQTJIO1FBQzNILCtFQUErRTtRQUMvRSxtSEFBbUgsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUhBQXFILEVBQUUsS0FBSyxDQUFDO1NBQ3BKLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN4QixJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMvQztRQUNELGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBa0IsRUFBRSxJQUFJ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QUksR0FBRyxFQUFFLENBQUM7SUFFckMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNsQyxHQUFHLENBQUMsS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDM0QsT0FBTztLQUNSO0lBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBb0IsQ0FBQztJQUN6RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0VudiwgQnVpbGRDbGlPcHRzfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge2Zvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0ICogYXMgX3ByZWxvYWQgZnJvbSAnLi4vcHJlbG9hZCc7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIHBsaW5rRW52LCBjb21tYW5kZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmNvbnN0IGNsaTogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgYnVpbGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZCA8YXBwfGxpYj4gPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJywge1xuICAgICAgJ2FwcHxsaWInOiAnXCJhcHBcIiBzdGFuZHMgZm9yIGJ1aWxkaW5nIGEgY29tcGxldGUgYXBwbGljYXRpb24gbGlrZSBjcmVhdGUtcmVhY3QtYXBwLFxcbicgK1xuICAgICAgICAnXCJsaWJcIiBzdGFuZHMgZm9yIGJ1aWxkaW5nIGEgbGlicmFyeScsXG4gICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgIH0pXG4gICAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnd2hlbiBhcmd1bWVudCBpcyBcImxpYlwiLCB3YXRjaCBmaWxlIGNoYW5nZXMgYW5kIGNvbXBpbGUnLCBmYWxzZSlcbiAgICAub3B0aW9uKCctaSwgLS1pbmNsdWRlIDxtb2R1bGUtcGF0aC1yZWdleD4nLFxuICAgICcobXVsdGlwbGUgdmFsdWUpLCB3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdlIHdpbGwgc2V0IFwiZXh0ZXJuYWxcIiBwcm9wZXJ0eSBvZiBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gZm9yIGFsbCByZXF1ZXN0IG5vdCBiZWdpbiB3aXRoIFwiLlwiIChub3QgcmVsYXRpdmUgcGF0aCksICcgK1xuICAgICdtZWFuaW5nIGFsbCBub24tcmVsYXRpdmUgbW9kdWxlcyB3aWxsIG5vdCBiZSBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IGJ1bmRsZSBmaWxlLCB5b3UgbmVlZCB0byBleHBsaWNpdGx5IHByb3ZpZGUgYSBsaXN0IGluJyArXG4gICAgJyBSZWd1bGFyIGV4cHJlc3Npb24gKGUuZy4gLWkgXFwnXnNvbWVMaWIoL3wkKVxcJyAtaSBcXCdec29tZUxpYjIoL3wkKVxcJyAtaSAuLi4pICcgK1xuICAgICcgdG8gbWFrZSB0aGVtIGJlIGluY2x1ZGVkIGluIGJ1bmRsZSBmaWxlLiBUbyBtYWtlIHNwZWNpZmljIG1vZHVsZSAoUmVhY3QpIGV4dGVybmFsOiAtaSBcXCdeKD8hcmVhY3QoLWRvbSk/KCR8LykpXFwnJywgYXJyYXlPcHRpb25GbiwgW10pXG4gICAgLm9wdGlvbignLS1zb3VyY2UtbWFwJywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBHRU5FUkFURV9TT1VSQ0VNQVAgdG8gXCJ0cnVlXCIgKHNlZSBodHRwczovL2NyZWF0ZS1yZWFjdC1hcHAuZGV2L2RvY3MvYWR2YW5jZWQtY29uZmlndXJhdGlvbicsIGZhbHNlKVxuICAgIC5hY3Rpb24oKHR5cGUsIHBrZ05hbWUpID0+IHtcbiAgICAgIGlmIChwcm9jZXNzLmN3ZCgpICE9PSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpIHtcbiAgICAgICAgcHJvY2Vzcy5jaGRpcihQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpO1xuICAgICAgfVxuICAgICAgcnVuUmVhY3RTY3JpcHRzKGJ1aWxkQ21kLm5hbWUoKSwgYnVpbGRDbWQub3B0cygpIGFzIEJ1aWxkQ2xpT3B0cywgdHlwZSwgcGtnTmFtZSk7XG5cbiAgICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9idWlsZCcpO1xuICAgIH0pO1xuICB3aXRoQ2xpY09wdChidWlsZENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQtdHNkIDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcGFja2FnZXMgZm9yIG9ubHkgZ2VuZXJhdGluZyBUeXBlc2NyaXB0IGRlZmluaXRpb24gZmlsZXMuIElmIHlvdSBhcmUgY3JlYXRpbmcgYSBsaWJyYXJ5LCAnICtcbiAgICAgICdjb21tYW5kIFwiY3JhLWJ1aWxkXCIgd2lsbCBhbHNvIGdlbmVyYXRlIHRzZCBmaWxlIGFsb25nIHdpdGggY2xpZW50IGJ1bmRsZScsIHtcbiAgICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyAocGtnTmFtZSk6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgICAgcnVuUmVhY3RTY3JpcHRzKFN0YXJ0Q21kLm5hbWUoKSwgU3RhcnRDbWQub3B0cygpIGFzIEJ1aWxkQ2xpT3B0cywgJ2xpYicsIHBrZ05hbWUpO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vdHNkLWdlbmVyYXRlJykpLmJ1aWxkVHNkKFtwa2dOYW1lXSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBTdGFydENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLXN0YXJ0IDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJywge1xuICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICB9KVxuICAgIC5hY3Rpb24oKHBrZ05hbWUpID0+IHtcbiAgICAgIGlmIChwcm9jZXNzLmN3ZCgpICE9PSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpIHtcbiAgICAgICAgcHJvY2Vzcy5jaGRpcihQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpO1xuICAgICAgfVxuICAgICAgcnVuUmVhY3RTY3JpcHRzKFN0YXJ0Q21kLm5hbWUoKSwgU3RhcnRDbWQub3B0cygpIGFzIEJ1aWxkQ2xpT3B0cywgJ2FwcCcsIHBrZ05hbWUpO1xuICAgICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL3N0YXJ0Jyk7XG4gICAgfSk7XG4gIHdpdGhDbGljT3B0KFN0YXJ0Q21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1vcGVuIDx1cmw+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biByZWFjdC1kZXYtdXRpbHMvb3BlbkJyb3dzZXInLCB7dXJsOiAnVVJMJ30pXG4gICAgLmFjdGlvbihhc3luYyB1cmwgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi4vY3JhLW9wZW4tYnJvd3NlcicpKS5kZWZhdWx0KHVybCk7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHl6ZSBbanMtZGlyXScpXG4gIC5hbGlhcygnY3JhLWFuYWx5c2UnKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJywge1xuICAgICdqcy1kaXInOiAnTm9ybWFsbHkgdGhpcyBwYXRoIHNob3VsZCBiZSA8cm9vdC1kaXI+ZGlzdC9zdGF0aWMvPG91dHB1dC1wYXRoLWJhc2VuYW1lPi9zdGF0aWMvanMnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBjb25zdCBzbWVCaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsICdwYWNrYWdlLmpzb24nKSkuYmluWydzb3VyY2UtbWFwLWV4cGxvcmVyJ10gYXMgc3RyaW5nO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZShvdXRwdXRQYXRoID8gb3V0cHV0UGF0aCA6ICcnLCAnKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKF9zaWduLCBjb2RlKSA9PiB7cmVzb2x2ZShjb2RlKTsgfSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG5cbmZ1bmN0aW9uIHJ1blJlYWN0U2NyaXB0cyhjbWROYW1lOiBzdHJpbmcsIG9wdHM6IEJ1aWxkQ2xpT3B0cywgdHlwZTogJ2FwcCcgfCAnbGliJywgcGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGNmZyA9IGNvbmZpZztcbiAgc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lLCBjbWROYW1lLCBvcHRzLCB0eXBlKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBPUlQgPT0gbnVsbCAmJiBjZmcoKS5wb3J0KVxuICAgIHByb2Nlc3MuZW52LlBPUlQgPSBjZmcoKS5wb3J0ICsgJyc7XG5cbiAgaWYgKCFbJ2FwcCcsICdsaWInXS5pbmNsdWRlcyh0eXBlKSkge1xuICAgIGxvZy5lcnJvcigndHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcXCdhcHBcXCcsIFxcJ2xpYlxcJycpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpIGFzIHR5cGVvZiBfcHJlbG9hZDtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==