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
    const buildCmd = program.command('cra-build')
        .description('Compile react application or library (work with create-react-app v4.0.3)')
        .argument('<app|lib>', '"app" stands for building a complete application like create-react-app,\n' +
        '"lib" stands for building a library')
        .argument('<package-name>', 'target package name, the "scope" name part can be omitted')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EsZ0RBQXdCO0FBQ3hCLHFDQUFxQztBQUNyQyxvQ0FBMkQ7QUFDM0QsaURBQW1DO0FBRW5DLHNDQUFpRTtBQUNqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDMUMsV0FBVyxDQUFDLDBFQUEwRSxDQUFDO1NBQ3ZGLFFBQVEsQ0FBQyxXQUFXLEVBQUUsMkVBQTJFO1FBQ2xHLHFDQUFxQyxDQUFDO1NBQ3JDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSwyREFBMkQsQ0FBQztTQUN2RixNQUFNLENBQUMsYUFBYSxFQUFFLHdEQUF3RCxFQUFFLEtBQUssQ0FBQztTQUN0RixNQUFNLENBQUMsbUNBQW1DLEVBQzNDLDZKQUE2SjtRQUM3SiwySEFBMkg7UUFDM0gsK0VBQStFO1FBQy9FLG1IQUFtSCxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDdEksTUFBTSxDQUFDLGNBQWMsRUFBRSxxSEFBcUgsRUFBRSxLQUFLLENBQUM7U0FDcEosTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQ3hCLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLGNBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNwRCxPQUFPLENBQUMsS0FBSyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQy9DO1FBQ0QsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxRQUFRLENBQUMs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R0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUVyQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztRQUMzRCxPQUFPO0tBQ1I7SUFDRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFvQixDQUFDO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuLy8gaW1wb3J0IGNvbW1hbmRlciBmcm9tICdDb21tYW5kZXInO1xuaW1wb3J0IHtzYXZlQ21kT3B0aW9uc1RvRW52LCBCdWlsZENsaU9wdHN9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZSwgcGxpbmtFbnYsIGNvbW1hbmRlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBidWlsZENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkJylcbiAgICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSAod29yayB3aXRoIGNyZWF0ZS1yZWFjdC1hcHAgdjQuMC4zKScpXG4gICAgLmFyZ3VtZW50KCc8YXBwfGxpYj4nLCAnXCJhcHBcIiBzdGFuZHMgZm9yIGJ1aWxkaW5nIGEgY29tcGxldGUgYXBwbGljYXRpb24gbGlrZSBjcmVhdGUtcmVhY3QtYXBwLFxcbicgK1xuICAgICdcImxpYlwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JylcbiAgICAuYXJndW1lbnQoJzxwYWNrYWdlLW5hbWU+JywgJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJylcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICd3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgXCJleHRlcm5hbFwiIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKG5vdCByZWxhdGl2ZSBwYXRoKSwgJyArXG4gICAgJ21lYW5pbmcgYWxsIG5vbi1yZWxhdGl2ZSBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgICAnIFJlZ3VsYXIgZXhwcmVzc2lvbiAoZS5nLiAtaSBcXCdec29tZUxpYigvfCQpXFwnIC1pIFxcJ15zb21lTGliMigvfCQpXFwnIC1pIC4uLikgJyArXG4gICAgJyB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUuIFRvIG1ha2Ugc3BlY2lmaWMgbW9kdWxlIChSZWFjdCkgZXh0ZXJuYWw6IC1pIFxcJ14oPyFyZWFjdCgtZG9tKT8oJHwvKSlcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gICAgLmFjdGlvbigodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgICAgaWYgKHByb2Nlc3MuY3dkKCkgIT09IFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSkge1xuICAgICAgICBwcm9jZXNzLmNoZGlyKFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgICB9XG4gICAgICBydW5SZWFjdFNjcmlwdHMoYnVpbGRDbWQubmFtZSgpLCBidWlsZENtZC5vcHRzKCkgLCB0eXBlLCBwa2dOYW1lKTtcblxuICAgICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gICAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZC10c2QgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSBwYWNrYWdlcyBmb3Igb25seSBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgZGVmaW5pdGlvbiBmaWxlcy4gSWYgeW91IGFyZSBjcmVhdGluZyBhIGxpYnJhcnksICcgK1xuICAgICAgJ2NvbW1hbmQgXCJjcmEtYnVpbGRcIiB3aWxsIGFsc28gZ2VuZXJhdGUgdHNkIGZpbGUgYWxvbmcgd2l0aCBjbGllbnQgYnVuZGxlJywge1xuICAgICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBydW5SZWFjdFNjcmlwdHMoU3RhcnRDbWQubmFtZSgpLCBTdGFydENtZC5vcHRzKCkgLCAnbGliJywgcGtnTmFtZSk7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi90c2QtZ2VuZXJhdGUnKSkuYnVpbGRUc2QoW3BrZ05hbWVdKTtcbiAgICB9KTtcblxuXG4gIGNvbnN0IFN0YXJ0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtc3RhcnQgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIENSQSBzdGFydCBzY3JpcHQgZm9yIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLCB7XG4gICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgIH0pXG4gICAgLmFjdGlvbigocGtnTmFtZSkgPT4ge1xuICAgICAgaWYgKHByb2Nlc3MuY3dkKCkgIT09IFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSkge1xuICAgICAgICBwcm9jZXNzLmNoZGlyKFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSk7XG4gICAgICB9XG4gICAgICBydW5SZWFjdFNjcmlwdHMoU3RhcnRDbWQubmFtZSgpLCBTdGFydENtZC5vcHRzKCkgLCAnYXBwJywgcGtnTmFtZSk7XG4gICAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvc3RhcnQnKTtcbiAgICB9KTtcbiAgd2l0aENsaWNPcHQoU3RhcnRDbWQpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY3JhLW9wZW4gPHVybD4nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHJlYWN0LWRldi11dGlscy9vcGVuQnJvd3NlcicsIHt1cmw6ICdVUkwnfSlcbiAgICAuYWN0aW9uKGFzeW5jIHVybCA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuLi9jcmEtb3Blbi1icm93c2VyJykpLmRlZmF1bHQodXJsKTtcbiAgICB9KTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1hbmFseXplIFtqcy1kaXJdJylcbiAgLmFsaWFzKCdjcmEtYW5hbHlzZScpXG4gIC5kZXNjcmlwdGlvbignUnVuIHNvdXJjZS1tYXAtZXhwbG9yZXInLCB7XG4gICAgJ2pzLWRpcic6ICdOb3JtYWxseSB0aGlzIHBhdGggc2hvdWxkIGJlIDxyb290LWRpcj5kaXN0L3N0YXRpYy88b3V0cHV0LXBhdGgtYmFzZW5hbWU+L3N0YXRpYy9qcydcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAob3V0cHV0UGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgc21lUGtnRGlyID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnc291cmNlLW1hcC1leHBsb3Jlci9wYWNrYWdlLmpzb24nKSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgIGNvbnN0IHNtZUJpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHNtZVBrZ0RpciwgJ3BhY2thZ2UuanNvbicpKS5iaW5bJ3NvdXJjZS1tYXAtZXhwbG9yZXInXSBhcyBzdHJpbmc7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgIGNvbnN0IGNwID0gZm9yayhQYXRoLnJlc29sdmUoc21lUGtnRGlyLCBzbWVCaW4pLCBbXG4gICAgICAgICctLWd6aXAnLCAnLS1uby1yb290JyxcbiAgICAgICAgUGF0aC5yZXNvbHZlKG91dHB1dFBhdGggPyBvdXRwdXRQYXRoIDogJycsICcqLmpzJylcbiAgICAgIF0sIHtzdGRpbzogWydpbmhlcml0JywgJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpcGMnXX0pO1xuICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZWooZXJyKTtcbiAgICAgIH0pO1xuICAgICAgY3Aub24oJ2V4aXQnLCAoX3NpZ24sIGNvZGUpID0+IHtyZXNvbHZlKGNvZGUpOyB9KTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiB3aXRoQ2xpY09wdChjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIGNtZC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBhcnJheU9wdGlvbkZuKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn1cblxuZnVuY3Rpb24gcnVuUmVhY3RTY3JpcHRzKGNtZE5hbWU6IHN0cmluZywgb3B0czogQnVpbGRDbGlPcHRzLCB0eXBlOiAnYXBwJyB8ICdsaWInLCBwa2dOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgY2ZnID0gY29uZmlnO1xuICBzYXZlQ21kT3B0aW9uc1RvRW52KHBrZ05hbWUsIGNtZE5hbWUsIG9wdHMsIHR5cGUpO1xuICBpZiAocHJvY2Vzcy5lbnYuUE9SVCA9PSBudWxsICYmIGNmZygpLnBvcnQpXG4gICAgcHJvY2Vzcy5lbnYuUE9SVCA9IGNmZygpLnBvcnQgKyAnJztcblxuICBpZiAoIVsnYXBwJywgJ2xpYiddLmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgbG9nLmVycm9yKCd0eXBlIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIFxcJ2FwcFxcJywgXFwnbGliXFwnJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByZWxvYWQgPSByZXF1aXJlKCcuLi9wcmVsb2FkJykgYXMgdHlwZW9mIF9wcmVsb2FkO1xuICBwcmVsb2FkLnBvbygpO1xufVxuXG5leHBvcnQge2NsaSBhcyBkZWZhdWx0fTtcblxuIl19