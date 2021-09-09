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
            const argv = process.argv.slice(2);
            const cp = (0, child_process_1.fork)(require.resolve('@wfh/plink/wfh/dist/cmd-bootstrap'), argv.map((arg, i) => {
                if (i > 0 && (argv[i - 1] === '-c' || argv[i - 1] === '--config') && !path_1.default.isAbsolute(arg)) {
                    return path_1.default.resolve(arg);
                }
                return arg;
            }), { cwd: plink_1.plinkEnv.workDir });
            log.info('Current directory is not CRA project directory, fork new process...pid:', cp.pid);
            return;
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
        .action((pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        initEverything(StartCmd, 'lib', pkgName);
        yield (yield Promise.resolve().then(() => __importStar(require('../tsd-generate')))).buildTsd([pkgName]);
    }));
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library (work with create-react-app v4.0.3)', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgName) => {
        if (process.cwd() !== path_1.default.resolve(plink_1.plinkEnv.workDir)) {
            const argv = process.argv.slice(2);
            const cp = (0, child_process_1.fork)(require.resolve('@wfh/plink/wfh/dist/cmd-bootstrap'), argv.map((arg, i) => {
                if (i > 0 && (argv[i - 1] === '-c' || argv[i - 1] === '--config') && !path_1.default.isAbsolute(arg)) {
                    return path_1.default.resolve(arg);
                }
                return arg;
            }), { cwd: plink_1.plinkEnv.workDir });
            log.info('Current directory is not CRA project directory, fork new process...pid:', cp.pid);
            return;
        }
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
            cp.on('exit', (_sign, code) => { resolve(code); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EsZ0RBQXdCO0FBQ3hCLHFDQUFxQztBQUNyQyxvQ0FBNkM7QUFDN0MsaURBQW1DO0FBRW5DLHNDQUFpRTtBQUNqRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNuRSxXQUFXLENBQUMsMEVBQTBFLEVBQUU7UUFDdkYsU0FBUyxFQUFFLDJFQUEyRTtZQUNwRixxQ0FBcUM7UUFDdkMsY0FBYyxFQUFFLDJEQUEyRDtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLGFBQWEsRUFBRSx3REFBd0QsRUFBRSxLQUFLLENBQUM7U0FDdEYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyw2SkFBNko7UUFDN0osMkhBQTJIO1FBQzNILCtFQUErRTtRQUMvRSxtSEFBbUgsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUhBQXFILEVBQUUsS0FBSyxDQUFDO1NBQ3BKLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN4QixJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsTUFBTSxFQUFFLEdBQUcsSUFBQSxvQkFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsRUFDcEUsSUFB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RUQsU0FBUyxjQUFjLENBQUMsUUFBMkIsRUFBRSxJQUFtQixFQUFFLE9BQWU7SUFDdkYsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDO0lBQ25CLElBQUEsMkJBQW1CLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM3QyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1FBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7SUFFckMsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUVsQyxHQUFHLENBQUMsS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDM0QsT0FBTztLQUNSO0lBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBb0IsQ0FBQztJQUN6RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0Vudn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCAqIGFzIF9wcmVsb2FkIGZyb20gJy4uL3ByZWxvYWQnO1xuaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlLCBwbGlua0VudiwgY29tbWFuZGVyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5jb25zdCBjbGk6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIGNvbnN0IGJ1aWxkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQgPGFwcHxsaWI+IDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSAod29yayB3aXRoIGNyZWF0ZS1yZWFjdC1hcHAgdjQuMC4zKScsIHtcbiAgICAgICdhcHB8bGliJzogJ1wiYXBwXCIgc3RhbmRzIGZvciBidWlsZGluZyBhIGNvbXBsZXRlIGFwcGxpY2F0aW9uIGxpa2UgY3JlYXRlLXJlYWN0LWFwcCxcXG4nICtcbiAgICAgICAgJ1wibGliXCIgc3RhbmRzIGZvciBidWlsZGluZyBhIGxpYnJhcnknLFxuICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICB9KVxuICAgIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ3doZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4gICAgLm9wdGlvbignLWksIC0taW5jbHVkZSA8bW9kdWxlLXBhdGgtcmVnZXg+JyxcbiAgICAnKG11bHRpcGxlIHZhbHVlKSwgd2hlbiBhcmd1bWVudCBpcyBcImxpYlwiLCB3ZSB3aWxsIHNldCBcImV4dGVybmFsXCIgcHJvcGVydHkgb2YgV2VicGFjayBjb25maWd1cmF0aW9uIGZvciBhbGwgcmVxdWVzdCBub3QgYmVnaW4gd2l0aCBcIi5cIiAobm90IHJlbGF0aXZlIHBhdGgpLCAnICtcbiAgICAnbWVhbmluZyBhbGwgbm9uLXJlbGF0aXZlIG1vZHVsZXMgd2lsbCBub3QgYmUgaW5jbHVkZWQgaW4gdGhlIG91dHB1dCBidW5kbGUgZmlsZSwgeW91IG5lZWQgdG8gZXhwbGljaXRseSBwcm92aWRlIGEgbGlzdCBpbicgK1xuICAgICcgUmVndWxhciBleHByZXNzaW9uIChlLmcuIC1pIFxcJ15zb21lTGliKC98JClcXCcgLWkgXFwnXnNvbWVMaWIyKC98JClcXCcgLWkgLi4uKSAnICtcbiAgICAnIHRvIG1ha2UgdGhlbSBiZSBpbmNsdWRlZCBpbiBidW5kbGUgZmlsZS4gVG8gbWFrZSBzcGVjaWZpYyBtb2R1bGUgKFJlYWN0KSBleHRlcm5hbDogLWkgXFwnXig/IXJlYWN0KC1kb20pPygkfC8pKVxcJycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAgIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgR0VORVJBVEVfU09VUkNFTUFQIHRvIFwidHJ1ZVwiIChzZWUgaHR0cHM6Ly9jcmVhdGUtcmVhY3QtYXBwLmRldi9kb2NzL2FkdmFuY2VkLWNvbmZpZ3VyYXRpb24nLCBmYWxzZSlcbiAgICAuYWN0aW9uKCh0eXBlLCBwa2dOYW1lKSA9PiB7XG4gICAgICBpZiAocHJvY2Vzcy5jd2QoKSAhPT0gUGF0aC5yZXNvbHZlKHBsaW5rRW52LndvcmtEaXIpKSB7XG4gICAgICAgIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gICAgICAgIGNvbnN0IGNwID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcCcpLFxuICAgICAgICBhcmd2Lm1hcCgoYXJnLCBpKSA9PiB7XG4gICAgICAgICAgaWYgKGkgPiAwICYmIChhcmd2W2kgLSAxXSA9PT0gJy1jJyB8fCBhcmd2W2kgLSAxXSA9PT0gJy0tY29uZmlnJykgJiYgIVBhdGguaXNBYnNvbHV0ZShhcmcpKSB7XG4gICAgICAgICAgICByZXR1cm4gUGF0aC5yZXNvbHZlKGFyZyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgIH0pLCB7Y3dkOiBwbGlua0Vudi53b3JrRGlyfSk7XG4gICAgICAgIGxvZy5pbmZvKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgQ1JBIHByb2plY3QgZGlyZWN0b3J5LCBmb3JrIG5ldyBwcm9jZXNzLi4ucGlkOicsIGNwLnBpZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kLCB0eXBlLCBwa2dOYW1lKTtcbiAgICAgIGlmIChidWlsZENtZC5vcHRzKCkuc291cmNlTWFwKSB7XG4gICAgICAgIGxvZy5pbmZvKCdzb3VyY2UgbWFwIGlzIGVuYWJsZWQnKTtcbiAgICAgICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICAgICAgfVxuICAgICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gICAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZC10c2QgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSBwYWNrYWdlcyBmb3Igb25seSBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgZGVmaW5pdGlvbiBmaWxlcy4gSWYgeW91IGFyZSBjcmVhdGluZyBhIGxpYnJhcnksICcgK1xuICAgICAgJ2NvbW1hbmQgXCJjcmEtYnVpbGRcIiB3aWxsIGFsc28gZ2VuZXJhdGUgdHNkIGZpbGUgYWxvbmcgd2l0aCBjbGllbnQgYnVuZGxlJywge1xuICAgICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgICBpbml0RXZlcnl0aGluZyhTdGFydENtZCwgJ2xpYicsIHBrZ05hbWUpO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vdHNkLWdlbmVyYXRlJykpLmJ1aWxkVHNkKFtwa2dOYW1lXSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBTdGFydENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLXN0YXJ0IDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJywge1xuICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICB9KVxuICAgIC5hY3Rpb24oKHBrZ05hbWUpID0+IHtcbiAgICAgIGlmIChwcm9jZXNzLmN3ZCgpICE9PSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpcikpIHtcbiAgICAgICAgY29uc3QgYXJndiA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgICAgICAgY29uc3QgY3AgPSBmb3JrKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay93ZmgvZGlzdC9jbWQtYm9vdHN0cmFwJyksXG4gICAgICAgICAgYXJndi5tYXAoKGFyZywgaSkgPT4ge1xuICAgICAgICAgICAgaWYgKGkgPiAwICYmIChhcmd2W2kgLSAxXSA9PT0gJy1jJyB8fCBhcmd2W2kgLSAxXSA9PT0gJy0tY29uZmlnJykgJiYgIVBhdGguaXNBYnNvbHV0ZShhcmcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBQYXRoLnJlc29sdmUoYXJnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBhcmc7XG4gICAgICAgICAgfSksIHtjd2Q6IHBsaW5rRW52LndvcmtEaXJ9KTtcbiAgICAgICAgbG9nLmluZm8oJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBDUkEgcHJvamVjdCBkaXJlY3RvcnksIGZvcmsgbmV3IHByb2Nlc3MuLi5waWQ6JywgY3AucGlkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9zdGFydCcpO1xuICAgIH0pO1xuICB3aXRoQ2xpY09wdChTdGFydENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtb3BlbiA8dXJsPicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gcmVhY3QtZGV2LXV0aWxzL29wZW5Ccm93c2VyJywge3VybDogJ1VSTCd9KVxuICAgIC5hY3Rpb24oYXN5bmMgdXJsID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4uL2NyYS1vcGVuLWJyb3dzZXInKSkuZGVmYXVsdCh1cmwpO1xuICAgIH0pO1xuXG4gIC8vIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1pbml0JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbml0aWFsIHdvcmtzcGFjZSBmaWxlcyBiYXNlZCBvbiBmaWxlcyB3aGljaCBhcmUgbmV3bHkgZ2VuZXJhdGVkIGJ5IGNyZWF0ZS1yZWFjdC1hcHAnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICBjb25zdCBvcHQ6IEdsb2JhbE9wdGlvbnMgPSB7cHJvcDogW10sIGNvbmZpZzogW119O1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyhvcHQpO1xuICAvLyAgIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICAvLyB9KTtcbiAgLy8gLy8gd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHl6ZSBbanMtZGlyXScpXG4gIC5hbGlhcygnY3JhLWFuYWx5c2UnKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJywge1xuICAgICdqcy1kaXInOiAnTm9ybWFsbHkgdGhpcyBwYXRoIHNob3VsZCBiZSA8cm9vdC1kaXI+ZGlzdC9zdGF0aWMvPG91dHB1dC1wYXRoLWJhc2VuYW1lPi9zdGF0aWMvanMnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBjb25zdCBzbWVCaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsICdwYWNrYWdlLmpzb24nKSkuYmluWydzb3VyY2UtbWFwLWV4cGxvcmVyJ10gYXMgc3RyaW5nO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZShvdXRwdXRQYXRoID8gb3V0cHV0UGF0aCA6ICcnLCAnKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKF9zaWduLCBjb2RlKSA9PiB7cmVzb2x2ZShjb2RlKTsgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIHByb2dyYW0uY29tbWFuZCgnY3JhLWRlYnVnJykuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1kZWJ1ZycpKS5kZWZhdWx0KCk7XG4gIC8vIH0pO1xuICAvLyBzbWVDbWQudXNhZ2Uoc21lQ21kLnVzYWdlKCkgKyAnXFxuICBhcHAtYmFzZS1wYXRoOiAnKVxufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG5cbmZ1bmN0aW9uIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kOiBjb21tYW5kZXIuQ29tbWFuZCwgdHlwZTogJ2FwcCcgfCAnbGliJywgcGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGNmZyA9IGNvbmZpZztcbiAgc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lLCBidWlsZENtZCwgdHlwZSk7XG4gIGlmIChwcm9jZXNzLmVudi5QT1JUID09IG51bGwgJiYgY2ZnKCkucG9ydClcbiAgICBwcm9jZXNzLmVudi5QT1JUID0gY2ZnKCkucG9ydCArICcnO1xuXG4gIGlmICghWydhcHAnLCAnbGliJ10uaW5jbHVkZXModHlwZSkpIHtcblxuICAgIGxvZy5lcnJvcigndHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcXCdhcHBcXCcsIFxcJ2xpYlxcJycpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpIGFzIHR5cGVvZiBfcHJlbG9hZDtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==