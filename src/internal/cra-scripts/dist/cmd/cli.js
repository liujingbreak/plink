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
// import replacePatches, { ReplacementInf } from '@wfh/plink/wfh/dist/utils/patch-text';
const path_1 = __importDefault(require("path"));
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
        .action((pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        initEverything(StartCmd, 'lib', pkgName);
        yield (yield Promise.resolve().then(() => __importStar(require('../tsd-generate')))).buildTsd([pkgName]);
    }));
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library (work with create-react-app v4.0.3)', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgName) => {
        initEverything(StartCmd, 'app', pkgName);
        require('react-scripts/scripts/start');
    });
    withClicOpt(StartCmd);
    program.command('cra-open <url>')
        .description('Run react-dev-utils/openBrowser', { url: 'URL' })
        .action((url) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('../cra-open-browser')))).default(url);
    }));
    // const initCmd = program.command('cra-init')
    // .description('Initial workspace files based on files which are newly generated by create-react-app')
    // .action(async () => {
    //   const opt: GlobalOptions = {prop: [], config: []};
    //   await initConfigAsync(opt);
    //   // await initTsconfig();
    // });
    // // withGlobalOptions(initCmd);
    program.command('cra-analyze [js-dir]')
        .alias('cra-analyse')
        .description('Run source-map-explorer', {
        'js-dir': 'Normally this path should be <root-dir>dist/static/<output-path-basename>/static/js'
    })
        .action((outputPath) => __awaiter(void 0, void 0, void 0, function* () {
        const smePkgDir = path_1.default.dirname(require.resolve('source-map-explorer/package.json'));
        const smeBin = require(path_1.default.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'];
        yield new Promise((resolve, rej) => {
            const cp = (0, child_process_1.fork)(path_1.default.resolve(smePkgDir, smeBin), [
                '--gzip', '--no-root',
                path_1.default.resolve(outputPath ? outputPath : '', '*.js')
            ], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
            cp.on('error', err => {
                console.error(err);
                rej(err);
            });
            cp.on('exit', (sign, code) => { resolve(code); });
        });
    }));
    // program.command('cra-debug').action(async () => {
    //   (await import('./cli-debug')).default();
    // });
    // smeCmd.usage(smeCmd.usage() + '\n  app-base-path: ')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUE0QztBQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNuRSxXQUFXLENBQUMsMEVBQTBFLEVBQUU7UUFDdkYsU0FBUyxFQUFFLDJFQUEyRTtZQUNwRixxQ0FBcUM7UUFDdkMsY0FBYyxFQUFFLDJEQUEyRDtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLGFBQWEsRUFBRSx3REFBd0QsRUFBRSxLQUFLLENBQUM7U0FDdEYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyw2SkFBNko7UUFDN0osMkhBQTJIO1FBQzNILCtFQUErRTtRQUMvRSxtSEFBbUgsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUhBQXFILEVBQUUsS0FBSyxDQUFDO1NBQ3BKLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN4QixjQUFjLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN4QyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUU7WUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7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QUFvQixDQUFDO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCByZXBsYWNlUGF0Y2hlcywgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0Vudn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9pbml0SW5qZWN0b3JzJztcbi8vIGltcG9ydCB7aW5pdFRzY29uZmlnfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCAqIGFzIF9wcmVsb2FkIGZyb20gJy4uL3ByZWxvYWQnO1xuaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5jb25zdCBjbGk6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIGNvbnN0IGJ1aWxkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQgPGFwcHxsaWI+IDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSAod29yayB3aXRoIGNyZWF0ZS1yZWFjdC1hcHAgdjQuMC4zKScsIHtcbiAgICAgICdhcHB8bGliJzogJ1wiYXBwXCIgc3RhbmRzIGZvciBidWlsZGluZyBhIGNvbXBsZXRlIGFwcGxpY2F0aW9uIGxpa2UgY3JlYXRlLXJlYWN0LWFwcCxcXG4nICtcbiAgICAgICAgJ1wibGliXCIgc3RhbmRzIGZvciBidWlsZGluZyBhIGxpYnJhcnknLFxuICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICB9KVxuICAgIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ3doZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLWksIC0taW5jbHVkZSA8bW9kdWxlLXBhdGgtcmVnZXg+JyxcbiAgICAnKG11bHRpcGxlIHZhbHVlKSwgd2hlbiBhcmd1bWVudCBpcyBcImxpYlwiLCB3ZSB3aWxsIHNldCBcImV4dGVybmFsXCIgcHJvcGVydHkgb2YgV2VicGFjayBjb25maWd1cmF0aW9uIGZvciBhbGwgcmVxdWVzdCBub3QgYmVnaW4gd2l0aCBcIi5cIiAobm90IHJlbGF0aXZlIHBhdGgpLCAnICtcbiAgICAnbWVhbmluZyBhbGwgbm9uLXJlbGF0aXZlIG1vZHVsZXMgd2lsbCBub3QgYmUgaW5jbHVkZWQgaW4gdGhlIG91dHB1dCBidW5kbGUgZmlsZSwgeW91IG5lZWQgdG8gZXhwbGljaXRseSBwcm92aWRlIGEgbGlzdCBpbicgK1xuICAgICcgUmVndWxhciBleHByZXNzaW9uIChlLmcuIC1pIFxcJ15zb21lTGliKC98JClcXCcgLWkgXFwnXnNvbWVMaWIyKC98JClcXCcgLWkgLi4uKSAnICtcbiAgICAnIHRvIG1ha2UgdGhlbSBiZSBpbmNsdWRlZCBpbiBidW5kbGUgZmlsZS4gVG8gbWFrZSBzcGVjaWZpYyBtb2R1bGUgKFJlYWN0KSBleHRlcm5hbDogLWkgXFwnXig/IXJlYWN0KC1kb20pPygkfC8pKVxcJycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgR0VORVJBVEVfU09VUkNFTUFQIHRvIFwidHJ1ZVwiIChzZWUgaHR0cHM6Ly9jcmVhdGUtcmVhY3QtYXBwLmRldi9kb2NzL2FkdmFuY2VkLWNvbmZpZ3VyYXRpb24nLCBmYWxzZSlcbiAgICAuYWN0aW9uKCh0eXBlLCBwa2dOYW1lKSA9PiB7XG4gICAgICBpbml0RXZlcnl0aGluZyhidWlsZENtZCwgdHlwZSwgcGtnTmFtZSk7XG4gICAgICBpZiAoYnVpbGRDbWQub3B0cygpLnNvdXJjZU1hcCkge1xuICAgICAgICBsb2cuaW5mbygnc291cmNlIG1hcCBpcyBlbmFibGVkJyk7XG4gICAgICAgIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICd0cnVlJztcbiAgICAgIH1cbiAgICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9idWlsZCcpO1xuICAgIH0pO1xuICB3aXRoQ2xpY09wdChidWlsZENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQtdHNkIDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcGFja2FnZXMgZm9yIG9ubHkgZ2VuZXJhdGluZyBUeXBlc2NyaXB0IGRlZmluaXRpb24gZmlsZXMuIElmIHlvdSBhcmUgY3JlYXRpbmcgYSBsaWJyYXJ5LCAnICtcbiAgICAgICdjb21tYW5kIFwiY3JhLWJ1aWxkXCIgd2lsbCBhbHNvIGdlbmVyYXRlIHRzZCBmaWxlIGFsb25nIHdpdGggY2xpZW50IGJ1bmRsZScsIHtcbiAgICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyBwa2dOYW1lID0+IHtcbiAgICAgIGluaXRFdmVyeXRoaW5nKFN0YXJ0Q21kLCAnbGliJywgcGtnTmFtZSk7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi90c2QtZ2VuZXJhdGUnKSkuYnVpbGRUc2QoW3BrZ05hbWVdKTtcbiAgICB9KTtcblxuXG4gIGNvbnN0IFN0YXJ0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtc3RhcnQgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIENSQSBzdGFydCBzY3JpcHQgZm9yIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLCB7XG4gICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgIH0pXG4gICAgLmFjdGlvbigocGtnTmFtZSkgPT4ge1xuICAgICAgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9zdGFydCcpO1xuICAgIH0pO1xuICB3aXRoQ2xpY09wdChTdGFydENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtb3BlbiA8dXJsPicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gcmVhY3QtZGV2LXV0aWxzL29wZW5Ccm93c2VyJywge3VybDogJ1VSTCd9KVxuICAgIC5hY3Rpb24oYXN5bmMgdXJsID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4uL2NyYS1vcGVuLWJyb3dzZXInKSkuZGVmYXVsdCh1cmwpO1xuICAgIH0pO1xuXG4gIC8vIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1pbml0JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbml0aWFsIHdvcmtzcGFjZSBmaWxlcyBiYXNlZCBvbiBmaWxlcyB3aGljaCBhcmUgbmV3bHkgZ2VuZXJhdGVkIGJ5IGNyZWF0ZS1yZWFjdC1hcHAnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICBjb25zdCBvcHQ6IEdsb2JhbE9wdGlvbnMgPSB7cHJvcDogW10sIGNvbmZpZzogW119O1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyhvcHQpO1xuICAvLyAgIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICAvLyB9KTtcbiAgLy8gLy8gd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHl6ZSBbanMtZGlyXScpXG4gIC5hbGlhcygnY3JhLWFuYWx5c2UnKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJywge1xuICAgICdqcy1kaXInOiAnTm9ybWFsbHkgdGhpcyBwYXRoIHNob3VsZCBiZSA8cm9vdC1kaXI+ZGlzdC9zdGF0aWMvPG91dHB1dC1wYXRoLWJhc2VuYW1lPi9zdGF0aWMvanMnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIGNvbnN0IHNtZUJpbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHNtZVBrZ0RpciwgJ3BhY2thZ2UuanNvbicpKS5iaW5bJ3NvdXJjZS1tYXAtZXhwbG9yZXInXSBhcyBzdHJpbmc7XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgIGNvbnN0IGNwID0gZm9yayhQYXRoLnJlc29sdmUoc21lUGtnRGlyLCBzbWVCaW4pLCBbXG4gICAgICAgICctLWd6aXAnLCAnLS1uby1yb290JyxcbiAgICAgICAgUGF0aC5yZXNvbHZlKG91dHB1dFBhdGggPyBvdXRwdXRQYXRoIDogJycsICcqLmpzJylcbiAgICAgIF0sIHtzdGRpbzogWydpbmhlcml0JywgJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpcGMnXX0pO1xuICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZWooZXJyKTtcbiAgICAgIH0pO1xuICAgICAgY3Aub24oJ2V4aXQnLCAoc2lnbiwgY29kZSkgPT4ge3Jlc29sdmUoY29kZSk7IH0pO1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1kZWJ1ZycpLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gIC8vICAgKGF3YWl0IGltcG9ydCgnLi9jbGktZGVidWcnKSkuZGVmYXVsdCgpO1xuICAvLyB9KTtcbiAgLy8gc21lQ21kLnVzYWdlKHNtZUNtZC51c2FnZSgpICsgJ1xcbiAgYXBwLWJhc2UtcGF0aDogJylcbn07XG5cbmZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsIHVuZGVmaW5lZCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5T3B0aW9uRm4oY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufVxuXG5mdW5jdGlvbiBpbml0RXZlcnl0aGluZyhidWlsZENtZDogY29tbWFuZGVyLkNvbW1hbmQsIHR5cGU6ICdhcHAnIHwgJ2xpYicsIHBrZ05hbWU6IHN0cmluZykge1xuICBjb25zdCBjZmcgPSBjb25maWc7XG4gIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZSwgYnVpbGRDbWQsIHR5cGUpO1xuICBpZiAocHJvY2Vzcy5lbnYuUE9SVCA9PSBudWxsICYmIGNmZygpLnBvcnQpXG4gICAgcHJvY2Vzcy5lbnYuUE9SVCA9IGNmZygpLnBvcnQgKyAnJztcblxuICBpZiAoIVsnYXBwJywgJ2xpYiddLmluY2x1ZGVzKHR5cGUpKSB7XG5cbiAgICBsb2cuZXJyb3IoJ3R5cGUgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgXFwnYXBwXFwnLCBcXCdsaWJcXCcnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcHJlbG9hZCA9IHJlcXVpcmUoJy4uL3ByZWxvYWQnKSBhcyB0eXBlb2YgX3ByZWxvYWQ7XG4gIHByZWxvYWQucG9vKCk7XG59XG5cbmV4cG9ydCB7Y2xpIGFzIGRlZmF1bHR9O1xuXG4iXX0=