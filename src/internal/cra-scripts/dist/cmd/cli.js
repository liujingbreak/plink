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
const __plink_1 = __importDefault(require("__plink"));
// import {ObjectAst} from '@wfh/plink/wfh/di st/utils/json-sync-parser';
const cli = (program) => {
    const buildCmd = program.command('cra-build <app|lib> <package-name>')
        .description('Compile react application or library (work with create-react-app v4.0.3)', {
        'app|lib': '"app" stands for building a complete application like create-react-app,\n' +
            '"lib" stands for building a library',
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .option('-w, --watch', 'When build a library, watch file changes and compile', false)
        // .option('--tsd-only', 'In "lib" mode (building a library), only build out Typescript tsd file')
        // .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set external property of Webpack configuration for all request not begin with "." (except "@babel/runtimer"), ' +
        'meaning all external modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i "^someLib/?" -i "^someLib2/?" -i ...) to make them be included in bundle file', arrayOptionFn, [])
        .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
        .action((type, pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        yield initEverything(buildCmd, type, pkgName);
        if (buildCmd.opts().sourceMap) {
            __plink_1.default.logger.info('source map is enabled');
            process.env.GENERATE_SOURCEMAP = 'true';
        }
        require('react-scripts/scripts/build');
    }));
    withClicOpt(buildCmd);
    program.command('cra-build-tsd <package-name>')
        .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
        'command "cra-build" will also generate tsd file along with client bundle', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        yield initEverything(StartCmd, 'lib', pkgName);
        yield (yield Promise.resolve().then(() => __importStar(require('../tsd-generate')))).buildTsd([pkgName]);
    }));
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library (work with create-react-app v4.0.3)', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        yield initEverything(StartCmd, 'app', pkgName);
        require('react-scripts/scripts/start');
    }));
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
            const cp = child_process_1.fork(path_1.default.resolve(smePkgDir, smeBin), [
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
    return __awaiter(this, void 0, void 0, function* () {
        // const cfg = await initConfigAsync(buildCmd.opts() as GlobalOptions);
        const cfg = plink_1.config;
        // await initTsconfig();
        utils_1.saveCmdOptionsToEnv(pkgName, buildCmd, type);
        if (process.env.PORT == null && cfg().port)
            process.env.PORT = cfg().port + '';
        // await walkPackagesAndSetupInjector(process.env.PUBLIC_URL || '/');
        if (!['app', 'lib'].includes(type)) {
            __plink_1.default.logger.error(`type argument must be one of "${['app', 'lib']}"`);
            return;
        }
        const preload = require('../preload');
        preload.poo();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFrQztBQUNsQyxzREFBNEI7QUFDNUIseUVBQXlFO0FBRXpFLE1BQU0sR0FBRyxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDckUsV0FBVyxDQUFDLDBFQUEwRSxFQUFDO1FBQ3RGLFNBQVMsRUFBRSwyRUFBMkU7WUFDcEYscUNBQXFDO1FBQ3ZDLGNBQWMsRUFBRSwyREFBMkQ7S0FDNUUsQ0FBQztTQUNELE1BQU0sQ0FBQyxhQUFhLEVBQUUsc0RBQXNELEVBQUUsS0FBSyxDQUFDO1FBQ3JGLGtHQUFrRztRQUNsRyw2RkFBNkY7U0FDNUYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyxrS0FBa0s7UUFDbEssdUhBQXVIO1FBQ3ZILDRHQUE0RyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDL0gsTUFBTSxDQUFDLGNBQWMsRUFBRSxxSEFBcUgsRUFBRSxLQUFLLENBQUM7U0FDcEosTUFBTSxDQUFDLENBQU8sSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzlCLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQzdCLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENB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LENBQUM7WUFDdkUsT0FBTztTQUNSO1FBQ0QsTUFBTSxPQUFPLEdBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCByZXBsYWNlUGF0Y2hlcywgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0Vudn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9pbml0SW5qZWN0b3JzJztcbi8vIGltcG9ydCB7aW5pdFRzY29uZmlnfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCAqIGFzIF9wcmVsb2FkIGZyb20gJy4uL3ByZWxvYWQnO1xuaW1wb3J0IHtjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuLy8gaW1wb3J0IHtPYmplY3RBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2RpIHN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuXG5jb25zdCBjbGk6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG4gIGNvbnN0IGJ1aWxkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQgPGFwcHxsaWI+IDxwYWNrYWdlLW5hbWU+JylcbiAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLHtcbiAgICAnYXBwfGxpYic6ICdcImFwcFwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBjb21wbGV0ZSBhcHBsaWNhdGlvbiBsaWtlIGNyZWF0ZS1yZWFjdC1hcHAsXFxuJyArXG4gICAgICAnXCJsaWJcIiBzdGFuZHMgZm9yIGJ1aWxkaW5nIGEgbGlicmFyeScsXG4gICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgfSlcbiAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnV2hlbiBidWlsZCBhIGxpYnJhcnksIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAvLyAub3B0aW9uKCctLXRzZC1vbmx5JywgJ0luIFwibGliXCIgbW9kZSAoYnVpbGRpbmcgYSBsaWJyYXJ5KSwgb25seSBidWlsZCBvdXQgVHlwZXNjcmlwdCB0c2QgZmlsZScpXG4gIC8vIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4gIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICcobXVsdGlwbGUgdmFsdWUpLCB3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdlIHdpbGwgc2V0IGV4dGVybmFsIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKGV4Y2VwdCBcIkBiYWJlbC9ydW50aW1lclwiKSwgJyArXG4gICdtZWFuaW5nIGFsbCBleHRlcm5hbCBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgJyBSZWd1bGFyIGV4cHJlc3Npb24gKGUuZy4gLWkgXCJec29tZUxpYi8/XCIgLWkgXCJec29tZUxpYjIvP1wiIC1pIC4uLikgdG8gbWFrZSB0aGVtIGJlIGluY2x1ZGVkIGluIGJ1bmRsZSBmaWxlJywgYXJyYXlPcHRpb25GbiwgW10pXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgR0VORVJBVEVfU09VUkNFTUFQIHRvIFwidHJ1ZVwiIChzZWUgaHR0cHM6Ly9jcmVhdGUtcmVhY3QtYXBwLmRldi9kb2NzL2FkdmFuY2VkLWNvbmZpZ3VyYXRpb24nLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgIGF3YWl0IGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kLCB0eXBlLCBwa2dOYW1lKTtcbiAgICBpZiAoYnVpbGRDbWQub3B0cygpLnNvdXJjZU1hcCkge1xuICAgICAgcGxpbmsubG9nZ2VyLmluZm8oJ3NvdXJjZSBtYXAgaXMgZW5hYmxlZCcpO1xuICAgICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICAgIH1cbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvYnVpbGQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZC10c2QgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSBwYWNrYWdlcyBmb3Igb25seSBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgZGVmaW5pdGlvbiBmaWxlcy4gSWYgeW91IGFyZSBjcmVhdGluZyBhIGxpYnJhcnksICcgK1xuICAgICAgJ2NvbW1hbmQgXCJjcmEtYnVpbGRcIiB3aWxsIGFsc28gZ2VuZXJhdGUgdHNkIGZpbGUgYWxvbmcgd2l0aCBjbGllbnQgYnVuZGxlJywge1xuICAgICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIHBrZ05hbWUgPT4ge1xuICAgICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdsaWInLCBwa2dOYW1lKTtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3RzZC1nZW5lcmF0ZScpKS5idWlsZFRzZChbcGtnTmFtZV0pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgU3RhcnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1zdGFydCA8cGFja2FnZS1uYW1lPicpXG4gIC5kZXNjcmlwdGlvbignUnVuIENSQSBzdGFydCBzY3JpcHQgZm9yIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLHtcbiAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKSA9PiB7XG4gICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvc3RhcnQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KFN0YXJ0Q21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1vcGVuIDx1cmw+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biByZWFjdC1kZXYtdXRpbHMvb3BlbkJyb3dzZXInLCB7dXJsOiAnVVJMJ30pXG4gICAgLmFjdGlvbihhc3luYyB1cmwgPT4ge1xuICAgICAgKGF3YWl0IGltcG9ydCgnLi4vY3JhLW9wZW4tYnJvd3NlcicpKS5kZWZhdWx0KHVybCk7XG4gICAgfSk7XG5cbiAgLy8gY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWluaXQnKVxuICAvLyAuZGVzY3JpcHRpb24oJ0luaXRpYWwgd29ya3NwYWNlIGZpbGVzIGJhc2VkIG9uIGZpbGVzIHdoaWNoIGFyZSBuZXdseSBnZW5lcmF0ZWQgYnkgY3JlYXRlLXJlYWN0LWFwcCcpXG4gIC8vIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAvLyAgIGNvbnN0IG9wdDogR2xvYmFsT3B0aW9ucyA9IHtwcm9wOiBbXSwgY29uZmlnOiBbXX07XG4gIC8vICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKG9wdCk7XG4gIC8vICAgLy8gYXdhaXQgaW5pdFRzY29uZmlnKCk7XG4gIC8vIH0pO1xuICAvLyAvLyB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1hbmFseXplIFtqcy1kaXJdJylcbiAgLmFsaWFzKCdjcmEtYW5hbHlzZScpXG4gIC5kZXNjcmlwdGlvbignUnVuIHNvdXJjZS1tYXAtZXhwbG9yZXInLCB7XG4gICAgJ2pzLWRpcic6ICdOb3JtYWxseSB0aGlzIHBhdGggc2hvdWxkIGJlIDxyb290LWRpcj5kaXN0L3N0YXRpYy88b3V0cHV0LXBhdGgtYmFzZW5hbWU+L3N0YXRpYy9qcydcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAob3V0cHV0UGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgc21lUGtnRGlyID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnc291cmNlLW1hcC1leHBsb3Jlci9wYWNrYWdlLmpzb24nKSk7XG4gICAgY29uc3Qgc21lQmluOiBzdHJpbmcgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsICdwYWNrYWdlLmpzb24nKSkuYmluWydzb3VyY2UtbWFwLWV4cGxvcmVyJ107XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgIGNvbnN0IGNwID0gZm9yayhQYXRoLnJlc29sdmUoc21lUGtnRGlyLCBzbWVCaW4pLCBbXG4gICAgICAgICctLWd6aXAnLCAnLS1uby1yb290JyxcbiAgICAgICAgUGF0aC5yZXNvbHZlKG91dHB1dFBhdGggPyBvdXRwdXRQYXRoIDogJycsICcqLmpzJylcbiAgICAgIF0sIHtzdGRpbzogWydpbmhlcml0JywgJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpcGMnXX0pO1xuICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZWooZXJyKTtcbiAgICAgIH0pO1xuICAgICAgY3Aub24oJ2V4aXQnLCAoc2lnbiwgY29kZSkgPT4ge3Jlc29sdmUoY29kZSk7fSk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBzbWVDbWQudXNhZ2Uoc21lQ21kLnVzYWdlKCkgKyAnXFxuICBhcHAtYmFzZS1wYXRoOiAnKVxufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kOiBjb21tYW5kZXIuQ29tbWFuZCwgdHlwZTogJ2FwcCcgfCAnbGliJywgcGtnTmFtZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IGNmZyA9IGF3YWl0IGluaXRDb25maWdBc3luYyhidWlsZENtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIGNvbnN0IGNmZyA9IGNvbmZpZztcbiAgLy8gYXdhaXQgaW5pdFRzY29uZmlnKCk7XG4gIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZSwgYnVpbGRDbWQsIHR5cGUpO1xuICBpZiAocHJvY2Vzcy5lbnYuUE9SVCA9PSBudWxsICYmIGNmZygpLnBvcnQpXG4gICAgcHJvY2Vzcy5lbnYuUE9SVCA9IGNmZygpLnBvcnQgKyAnJztcbiAgLy8gYXdhaXQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3Rvcihwcm9jZXNzLmVudi5QVUJMSUNfVVJMIHx8ICcvJyk7XG4gIGlmICghWydhcHAnLCAnbGliJ10uaW5jbHVkZXModHlwZSkpIHtcblxuICAgIHBsaW5rLmxvZ2dlci5lcnJvcihgdHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcIiR7WydhcHAnLCAnbGliJ119XCJgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcHJlbG9hZDogdHlwZW9mIF9wcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpO1xuICBwcmVsb2FkLnBvbygpO1xufVxuXG5leHBvcnQge2NsaSBhcyBkZWZhdWx0fTtcblxuIl19