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
            // const argv = process.argv.slice(2);
            // const cp = fork(require.resolve('@wfh/plink/wfh/dist/cmd-bootstrap'),
            //   argv.map((arg, i) => {
            //     if (i > 0 && (argv[i - 1] === '-c' || argv[i - 1] === '--config') && !Path.isAbsolute(arg)) {
            //       return Path.resolve(arg);
            //     }
            //     return arg;
            //   }), {cwd: plinkEnv.workDir});
            // log.info('Current directory is not CRA project directory, fork new process...pid:', cp.pid);
            // return;
        }
        initEverything(buildCmd, type, pkgName);
        if (buildCmd.opts().sourceMap) {
            log.info('source map is enabled');
            process.env.GENERATE_SOURCEMAP = 'true';
        }
        require('react-scripts/scripts/build');
    });
    withClicOpt(buildCmd);
    program.command('cra-build-tsd <package-name>')
        .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
        'command "cra-build" will also generate tsd file along with client bundle', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action(async (pkgName) => {
        initEverything(StartCmd, 'lib', pkgName);
        await (await Promise.resolve().then(() => __importStar(require('../tsd-generate')))).buildTsd([pkgName]);
    });
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library (work with create-react-app v4.0.3)', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgName) => {
        if (process.cwd() !== path_1.default.resolve(plink_1.plinkEnv.workDir)) {
            process.chdir(path_1.default.resolve(plink_1.plinkEnv.workDir));
            // const argv = process.argv.slice(2);
            // const cp = fork(require.resolve('@wfh/plink/wfh/dist/cmd-bootstrap'),
            //   argv.map((arg, i) => {
            //     if (i > 0 && (argv[i - 1] === '-c' || argv[i - 1] === '--config') && !Path.isAbsolute(arg)) {
            //       return Path.resolve(arg);
            //     }
            //     return arg;
            //   }), {cwd: plinkEnv.workDir});
            // log.info('Current directory is not CRA project directory, fork new process...pid:', cp.pid);
            // return;
        }
        initEverything(StartCmd, 'app', pkgName);
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
function initEverything(buildCmd, type, pkgName) {
    const cfg = plink_1.config;
    (0, utils_1.saveCmdOptionsToEnv)(pkgName, buildCmd, type);
    if (process.env.PORT == null && cfg().port)
        process.env.PORT = cfg().port + '';
    if (!['app', 'lib'].includes(type)) {
        log.error('type argument must be one of \'app\', \'lib\'');
        return;
    }
    const preload = require('../preload');
    preload.poo();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EsZ0RBQXdCO0FBQ3hCLHFDQUFxQztBQUNyQyxvQ0FBNkM7QUFDN0MsaURBQW1DO0FBRW5DLHNDQUFpRTtBQUNqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNuRSxXQUFXLENBQUMsMEVBQTBFLEVBQUU7UUFDdkYsU0FBUyxFQUFFLDJFQUEyRTtZQUNwRixxQ0FBcUM7UUFDdkMsY0FBYyxFQUFFLDJEQUEyRDtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLGFBQWEsRUFBRSx3REFBd0QsRUFBRSxLQUFLLENBQUM7U0FDdEYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyw2SkFBNko7UUFDN0osMkhBQTJIO1FBQzNILCtFQUErRTtRQUMvRSxtSEFBbUgsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUhBQXFILEVBQUUsS0FBSyxDQUFDO1NBQ3BKLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN4QixJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEQsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUM5QyxzQ0FBc0M7WUFDdEMsd0VBQXdFO1lBQ3hFLDJCQUEyQjtZQUMzQixvR0FBb0c7WUFDcEcsa0NBQWtDO1lBQ2xDLFFBQVE7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YyxDQUFDLFFBQTJCLEVBQUUsSUFBbUIsRUFBRSxPQUFlO0lBQ3ZGLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQztJQUNuQixJQUFBLDJCQUFtQixFQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSTtRQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBRXJDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFbEMsR0FBRyxDQUFDLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO1FBQzNELE9BQU87S0FDUjtJQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQW9CLENBQUM7SUFDekQsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ2hCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQge3NhdmVDbWRPcHRpb25zVG9FbnZ9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZSwgcGxpbmtFbnYsIGNvbW1hbmRlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBidWlsZENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkIDxhcHB8bGliPiA8cGFja2FnZS1uYW1lPicpXG4gICAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLCB7XG4gICAgICAnYXBwfGxpYic6ICdcImFwcFwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBjb21wbGV0ZSBhcHBsaWNhdGlvbiBsaWtlIGNyZWF0ZS1yZWFjdC1hcHAsXFxuJyArXG4gICAgICAgICdcImxpYlwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JyxcbiAgICAgICdwYWNrYWdlLW5hbWUnOiAndGFyZ2V0IHBhY2thZ2UgbmFtZSwgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQnXG4gICAgfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICd3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgXCJleHRlcm5hbFwiIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKG5vdCByZWxhdGl2ZSBwYXRoKSwgJyArXG4gICAgJ21lYW5pbmcgYWxsIG5vbi1yZWxhdGl2ZSBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgICAnIFJlZ3VsYXIgZXhwcmVzc2lvbiAoZS5nLiAtaSBcXCdec29tZUxpYigvfCQpXFwnIC1pIFxcJ15zb21lTGliMigvfCQpXFwnIC1pIC4uLikgJyArXG4gICAgJyB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUuIFRvIG1ha2Ugc3BlY2lmaWMgbW9kdWxlIChSZWFjdCkgZXh0ZXJuYWw6IC1pIFxcJ14oPyFyZWFjdCgtZG9tKT8oJHwvKSlcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gICAgLmFjdGlvbigodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgICAgaWYgKHByb2Nlc3MuY3dkKCkgIT09IFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSkge1xuICAgICAgICBwcm9jZXNzLmNoZGlyKFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgICAgIC8vIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gICAgICAgIC8vIGNvbnN0IGNwID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcCcpLFxuICAgICAgICAvLyAgIGFyZ3YubWFwKChhcmcsIGkpID0+IHtcbiAgICAgICAgLy8gICAgIGlmIChpID4gMCAmJiAoYXJndltpIC0gMV0gPT09ICctYycgfHwgYXJndltpIC0gMV0gPT09ICctLWNvbmZpZycpICYmICFQYXRoLmlzQWJzb2x1dGUoYXJnKSkge1xuICAgICAgICAvLyAgICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKGFyZyk7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgICByZXR1cm4gYXJnO1xuICAgICAgICAvLyAgIH0pLCB7Y3dkOiBwbGlua0Vudi53b3JrRGlyfSk7XG4gICAgICAgIC8vIGxvZy5pbmZvKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgQ1JBIHByb2plY3QgZGlyZWN0b3J5LCBmb3JrIG5ldyBwcm9jZXNzLi4ucGlkOicsIGNwLnBpZCk7XG4gICAgICAgIC8vIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kLCB0eXBlLCBwa2dOYW1lKTtcbiAgICAgIGlmIChidWlsZENtZC5vcHRzKCkuc291cmNlTWFwKSB7XG4gICAgICAgIGxvZy5pbmZvKCdzb3VyY2UgbWFwIGlzIGVuYWJsZWQnKTtcbiAgICAgICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICAgICAgfVxuICAgICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gICAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZC10c2QgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSBwYWNrYWdlcyBmb3Igb25seSBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgZGVmaW5pdGlvbiBmaWxlcy4gSWYgeW91IGFyZSBjcmVhdGluZyBhIGxpYnJhcnksICcgK1xuICAgICAgJ2NvbW1hbmQgXCJjcmEtYnVpbGRcIiB3aWxsIGFsc28gZ2VuZXJhdGUgdHNkIGZpbGUgYWxvbmcgd2l0aCBjbGllbnQgYnVuZGxlJywge1xuICAgICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBpbml0RXZlcnl0aGluZyhTdGFydENtZCwgJ2xpYicsIHBrZ05hbWUpO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vdHNkLWdlbmVyYXRlJykpLmJ1aWxkVHNkKFtwa2dOYW1lXSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBTdGFydENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLXN0YXJ0IDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJywge1xuICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICB9KVxuICAgIC5hY3Rpb24oKHBrZ05hbWUpID0+IHtcbiAgICAgIGlmIChwcm9jZXNzLmN3ZCgpICE9PSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpIHtcbiAgICAgICAgcHJvY2Vzcy5jaGRpcihQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpO1xuICAgICAgICAvLyBjb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICAgICAgICAvLyBjb25zdCBjcCA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC1ib290c3RyYXAnKSxcbiAgICAgICAgLy8gICBhcmd2Lm1hcCgoYXJnLCBpKSA9PiB7XG4gICAgICAgIC8vICAgICBpZiAoaSA+IDAgJiYgKGFyZ3ZbaSAtIDFdID09PSAnLWMnIHx8IGFyZ3ZbaSAtIDFdID09PSAnLS1jb25maWcnKSAmJiAhUGF0aC5pc0Fic29sdXRlKGFyZykpIHtcbiAgICAgICAgLy8gICAgICAgcmV0dXJuIFBhdGgucmVzb2x2ZShhcmcpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgcmV0dXJuIGFyZztcbiAgICAgICAgLy8gICB9KSwge2N3ZDogcGxpbmtFbnYud29ya0Rpcn0pO1xuICAgICAgICAvLyBsb2cuaW5mbygnQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IENSQSBwcm9qZWN0IGRpcmVjdG9yeSwgZm9yayBuZXcgcHJvY2Vzcy4uLnBpZDonLCBjcC5waWQpO1xuICAgICAgICAvLyByZXR1cm47XG4gICAgICB9XG4gICAgICBpbml0RXZlcnl0aGluZyhTdGFydENtZCwgJ2FwcCcsIHBrZ05hbWUpO1xuICAgICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL3N0YXJ0Jyk7XG4gICAgfSk7XG4gIHdpdGhDbGljT3B0KFN0YXJ0Q21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1vcGVuIDx1cmw+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biByZWFjdC1kZXYtdXRpbHMvb3BlbkJyb3dzZXInLCB7dXJsOiAnVVJMJ30pXG4gICAgLmFjdGlvbihhc3luYyB1cmwgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi4vY3JhLW9wZW4tYnJvd3NlcicpKS5kZWZhdWx0KHVybCk7XG4gICAgfSk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHl6ZSBbanMtZGlyXScpXG4gIC5hbGlhcygnY3JhLWFuYWx5c2UnKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJywge1xuICAgICdqcy1kaXInOiAnTm9ybWFsbHkgdGhpcyBwYXRoIHNob3VsZCBiZSA8cm9vdC1kaXI+ZGlzdC9zdGF0aWMvPG91dHB1dC1wYXRoLWJhc2VuYW1lPi9zdGF0aWMvanMnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBjb25zdCBzbWVCaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsICdwYWNrYWdlLmpzb24nKSkuYmluWydzb3VyY2UtbWFwLWV4cGxvcmVyJ10gYXMgc3RyaW5nO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZShvdXRwdXRQYXRoID8gb3V0cHV0UGF0aCA6ICcnLCAnKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKF9zaWduLCBjb2RlKSA9PiB7cmVzb2x2ZShjb2RlKTsgfSk7XG4gICAgfSk7XG4gIH0pO1xufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG5cbmZ1bmN0aW9uIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kOiBjb21tYW5kZXIuQ29tbWFuZCwgdHlwZTogJ2FwcCcgfCAnbGliJywgcGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGNmZyA9IGNvbmZpZztcbiAgc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lLCBidWlsZENtZCwgdHlwZSk7XG4gIGlmIChwcm9jZXNzLmVudi5QT1JUID09IG51bGwgJiYgY2ZnKCkucG9ydClcbiAgICBwcm9jZXNzLmVudi5QT1JUID0gY2ZnKCkucG9ydCArICcnO1xuXG4gIGlmICghWydhcHAnLCAnbGliJ10uaW5jbHVkZXModHlwZSkpIHtcblxuICAgIGxvZy5lcnJvcigndHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcXCdhcHBcXCcsIFxcJ2xpYlxcJycpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpIGFzIHR5cGVvZiBfcHJlbG9hZDtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==