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
        // if (buildCmd.opts().tsdOnly) {
        //   await (await import('../tsd-generate')).buildTsd();
        // } else {
        //   require('react-scripts/scripts/build');
        // }
    }));
    withClicOpt(buildCmd);
    program.command('cra-build-tsd <package-name...>')
        .description('Compile packages for only generating Typescript definition files. If you are creating a library, ' +
        'command "cra-build" will also generate tsd file along with client bundle', {
        'package-name': 'target package name, the "scope" name part can be omitted'
    })
        .action((pkgNames) => __awaiter(void 0, void 0, void 0, function* () {
        // console.log(pkgNames);
        yield (yield Promise.resolve().then(() => __importStar(require('../tsd-generate')))).buildTsd(pkgNames);
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
    // const initCmd = program.command('cra-init')
    // .description('Initial workspace files based on files which are newly generated by create-react-app')
    // .action(async () => {
    //   const opt: GlobalOptions = {prop: [], config: []};
    //   await initConfigAsync(opt);
    //   // await initTsconfig();
    // });
    // // withGlobalOptions(initCmd);
    program.command('cra-analyze [webpck-output-path]')
        .alias('cra-analyse')
        .description('Run source-map-explorer', {
        'webpck-output-path': 'Normally this path should be <root-dir>dist/static/<output-path-basename>, under which there are files matches subpath "static/js/*.js"'
    })
        .action((outputPath) => __awaiter(void 0, void 0, void 0, function* () {
        const smePkgDir = path_1.default.dirname(require.resolve('source-map-explorer/package.json'));
        const smeBin = require(path_1.default.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'];
        yield new Promise((resolve, rej) => {
            const cp = child_process_1.fork(path_1.default.resolve(smePkgDir, smeBin), [
                '--gzip', '--no-root',
                path_1.default.resolve(outputPath ? outputPath : '', 'static/js/*.js')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFrQztBQUNsQyxzREFBNEI7QUFDNUIseUVBQXlFO0FBRXpFLE1BQU0sR0FBRyxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDckUsV0FBVyxDQUFDLDBFQUEwRSxFQUFDO1FBQ3RGLFNBQVMsRUFBRSwyRUFBMkU7WUFDcEYscUNBQXFDO1FBQ3ZDLGNBQWMsRUFBRSwyREFBMkQ7S0FDNUUsQ0FBQztTQUNELE1BQU0sQ0FBQyxhQUFhLEVBQUUsc0RBQXNELEVBQUUsS0FBSyxDQUFDO1FBQ3JGLGtHQUFrRztRQUNsRyw2RkFBNkY7U0FDNUYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyxrS0FBa0s7UUFDbEssdUhBQXVIO1FBQ3ZILDRHQUE0RyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDL0gsTUFBTSxDQUFDLGNBQWMsRUFBRSxxSEFBcUgsRUFBRSxLQUFLLENBQUM7U0FDcEosTUFBTSxDQUFDLENBQU8sSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzlCLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQzdCLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENB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QUEzQnRCLFNBQVMsV0FBVyxDQUFDLEdBQXNCO0lBQ3pDLEdBQUcsQ0FBQyxNQUFNLENBQUMsOEJBQThCLEVBQUUsdURBQXVELEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDakgsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxJQUEwQjtJQUM3RCxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQWUsY0FBYyxDQUFDLFFBQTJCLEVBQUUsSUFBbUIsRUFBRSxPQUFlOztRQUM3Rix1RUFBdUU7UUFDdkUsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDO1FBQ25CLHdCQUF3QjtRQUN4QiwyQkFBbUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUk7WUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNyQyxxRUFBcUU7UUFDckUsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUVsQyxpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2RSxPQUFPO1NBQ1I7UUFDRCxNQUFNLE9BQU8sR0FBb0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNoQixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtDbGlFeHRlbnNpb259IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHJlcGxhY2VQYXRjaGVzLCB7IFJlcGxhY2VtZW50SW5mIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNvbW1hbmRlciBmcm9tICdDb21tYW5kZXInO1xuaW1wb3J0IHtzYXZlQ21kT3B0aW9uc1RvRW52fSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge2Zvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuLy8gaW1wb3J0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IgZnJvbSAnQHdmaC93ZWJwYWNrLWNvbW1vbi9kaXN0L2luaXRJbmplY3RvcnMnO1xuLy8gaW1wb3J0IHtpbml0VHNjb25maWd9IGZyb20gJy4vY2xpLWluaXQnO1xuaW1wb3J0ICogYXMgX3ByZWxvYWQgZnJvbSAnLi4vcHJlbG9hZCc7XG5pbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgcGxpbmsgZnJvbSAnX19wbGluayc7XG4vLyBpbXBvcnQge09iamVjdEFzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGkgc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5cbmNvbnN0IGNsaTogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcbiAgY29uc3QgYnVpbGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZCA8YXBwfGxpYj4gPHBhY2thZ2UtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSAod29yayB3aXRoIGNyZWF0ZS1yZWFjdC1hcHAgdjQuMC4zKScse1xuICAgICdhcHB8bGliJzogJ1wiYXBwXCIgc3RhbmRzIGZvciBidWlsZGluZyBhIGNvbXBsZXRlIGFwcGxpY2F0aW9uIGxpa2UgY3JlYXRlLXJlYWN0LWFwcCxcXG4nICtcbiAgICAgICdcImxpYlwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JyxcbiAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICB9KVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdXaGVuIGJ1aWxkIGEgbGlicmFyeSwgd2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0tdHNkLW9ubHknLCAnSW4gXCJsaWJcIiBtb2RlIChidWlsZGluZyBhIGxpYnJhcnkpLCBvbmx5IGJ1aWxkIG91dCBUeXBlc2NyaXB0IHRzZCBmaWxlJylcbiAgLy8gLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLWksIC0taW5jbHVkZSA8bW9kdWxlLXBhdGgtcmVnZXg+JyxcbiAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgZXh0ZXJuYWwgcHJvcGVydHkgb2YgV2VicGFjayBjb25maWd1cmF0aW9uIGZvciBhbGwgcmVxdWVzdCBub3QgYmVnaW4gd2l0aCBcIi5cIiAoZXhjZXB0IFwiQGJhYmVsL3J1bnRpbWVyXCIpLCAnICtcbiAgJ21lYW5pbmcgYWxsIGV4dGVybmFsIG1vZHVsZXMgd2lsbCBub3QgYmUgaW5jbHVkZWQgaW4gdGhlIG91dHB1dCBidW5kbGUgZmlsZSwgeW91IG5lZWQgdG8gZXhwbGljaXRseSBwcm92aWRlIGEgbGlzdCBpbicgK1xuICAnIFJlZ3VsYXIgZXhwcmVzc2lvbiAoZS5nLiAtaSBcIl5zb21lTGliLz9cIiAtaSBcIl5zb21lTGliMi8/XCIgLWkgLi4uKSB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLm9wdGlvbignLS1zb3VyY2UtbWFwJywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBHRU5FUkFURV9TT1VSQ0VNQVAgdG8gXCJ0cnVlXCIgKHNlZSBodHRwczovL2NyZWF0ZS1yZWFjdC1hcHAuZGV2L2RvY3MvYWR2YW5jZWQtY29uZmlndXJhdGlvbicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICh0eXBlLCBwa2dOYW1lKSA9PiB7XG4gICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoYnVpbGRDbWQsIHR5cGUsIHBrZ05hbWUpO1xuICAgIGlmIChidWlsZENtZC5vcHRzKCkuc291cmNlTWFwKSB7XG4gICAgICBwbGluay5sb2dnZXIuaW5mbygnc291cmNlIG1hcCBpcyBlbmFibGVkJyk7XG4gICAgICBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAndHJ1ZSc7XG4gICAgfVxuICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9idWlsZCcpO1xuICAgIC8vIGlmIChidWlsZENtZC5vcHRzKCkudHNkT25seSkge1xuICAgIC8vICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vdHNkLWdlbmVyYXRlJykpLmJ1aWxkVHNkKCk7XG4gICAgLy8gfSBlbHNlIHtcbiAgICAvLyAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9idWlsZCcpO1xuICAgIC8vIH1cbiAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZC10c2QgPHBhY2thZ2UtbmFtZS4uLj4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSBwYWNrYWdlcyBmb3Igb25seSBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgZGVmaW5pdGlvbiBmaWxlcy4gSWYgeW91IGFyZSBjcmVhdGluZyBhIGxpYnJhcnksICcgK1xuICAgICAgJ2NvbW1hbmQgXCJjcmEtYnVpbGRcIiB3aWxsIGFsc28gZ2VuZXJhdGUgdHNkIGZpbGUgYWxvbmcgd2l0aCBjbGllbnQgYnVuZGxlJywge1xuICAgICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIHBrZ05hbWVzID0+IHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKHBrZ05hbWVzKTtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3RzZC1nZW5lcmF0ZScpKS5idWlsZFRzZChwa2dOYW1lcyk7XG4gICAgfSk7XG5cbiAgY29uc3QgU3RhcnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1zdGFydCA8cGFja2FnZS1uYW1lPicpXG4gIC5kZXNjcmlwdGlvbignUnVuIENSQSBzdGFydCBzY3JpcHQgZm9yIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLHtcbiAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKSA9PiB7XG4gICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvc3RhcnQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KFN0YXJ0Q21kKTtcblxuICAvLyBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtaW5pdCcpXG4gIC8vIC5kZXNjcmlwdGlvbignSW5pdGlhbCB3b3Jrc3BhY2UgZmlsZXMgYmFzZWQgb24gZmlsZXMgd2hpY2ggYXJlIG5ld2x5IGdlbmVyYXRlZCBieSBjcmVhdGUtcmVhY3QtYXBwJylcbiAgLy8gLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gIC8vICAgY29uc3Qgb3B0OiBHbG9iYWxPcHRpb25zID0ge3Byb3A6IFtdLCBjb25maWc6IFtdfTtcbiAgLy8gICBhd2FpdCBpbml0Q29uZmlnQXN5bmMob3B0KTtcbiAgLy8gICAvLyBhd2FpdCBpbml0VHNjb25maWcoKTtcbiAgLy8gfSk7XG4gIC8vIC8vIHdpdGhHbG9iYWxPcHRpb25zKGluaXRDbWQpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY3JhLWFuYWx5emUgW3dlYnBjay1vdXRwdXQtcGF0aF0nKVxuICAuYWxpYXMoJ2NyYS1hbmFseXNlJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc291cmNlLW1hcC1leHBsb3JlcicsIHtcbiAgICAnd2VicGNrLW91dHB1dC1wYXRoJzogJ05vcm1hbGx5IHRoaXMgcGF0aCBzaG91bGQgYmUgPHJvb3QtZGlyPmRpc3Qvc3RhdGljLzxvdXRwdXQtcGF0aC1iYXNlbmFtZT4sIHVuZGVyIHdoaWNoIHRoZXJlIGFyZSBmaWxlcyBtYXRjaGVzIHN1YnBhdGggXCJzdGF0aWMvanMvKi5qc1wiJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChvdXRwdXRQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBzbWVQa2dEaXIgPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdzb3VyY2UtbWFwLWV4cGxvcmVyL3BhY2thZ2UuanNvbicpKTtcbiAgICBjb25zdCBzbWVCaW46IHN0cmluZyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHNtZVBrZ0RpciwgJ3BhY2thZ2UuanNvbicpKS5iaW5bJ3NvdXJjZS1tYXAtZXhwbG9yZXInXTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgY29uc3QgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsIHNtZUJpbiksIFtcbiAgICAgICAgJy0tZ3ppcCcsICctLW5vLXJvb3QnLFxuICAgICAgICBQYXRoLnJlc29sdmUob3V0cHV0UGF0aCA/IG91dHB1dFBhdGggOiAnJywgJ3N0YXRpYy9qcy8qLmpzJylcbiAgICAgIF0sIHtzdGRpbzogWydpbmhlcml0JywgJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpcGMnXX0pO1xuICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZWooZXJyKTtcbiAgICAgIH0pO1xuICAgICAgY3Aub24oJ2V4aXQnLCAoc2lnbiwgY29kZSkgPT4ge3Jlc29sdmUoY29kZSk7fSk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBzbWVDbWQudXNhZ2Uoc21lQ21kLnVzYWdlKCkgKyAnXFxuICBhcHAtYmFzZS1wYXRoOiAnKVxufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kOiBjb21tYW5kZXIuQ29tbWFuZCwgdHlwZTogJ2FwcCcgfCAnbGliJywgcGtnTmFtZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IGNmZyA9IGF3YWl0IGluaXRDb25maWdBc3luYyhidWlsZENtZC5vcHRzKCkgYXMgR2xvYmFsT3B0aW9ucyk7XG4gIGNvbnN0IGNmZyA9IGNvbmZpZztcbiAgLy8gYXdhaXQgaW5pdFRzY29uZmlnKCk7XG4gIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZSwgYnVpbGRDbWQsIHR5cGUpO1xuICBpZiAocHJvY2Vzcy5lbnYuUE9SVCA9PSBudWxsICYmIGNmZygpLnBvcnQpXG4gICAgcHJvY2Vzcy5lbnYuUE9SVCA9IGNmZygpLnBvcnQgKyAnJztcbiAgLy8gYXdhaXQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3Rvcihwcm9jZXNzLmVudi5QVUJMSUNfVVJMIHx8ICcvJyk7XG4gIGlmICghWydhcHAnLCAnbGliJ10uaW5jbHVkZXModHlwZSkpIHtcblxuICAgIHBsaW5rLmxvZ2dlci5lcnJvcihgdHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcIiR7WydhcHAnLCAnbGliJ119XCJgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcHJlbG9hZDogdHlwZW9mIF9wcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpO1xuICBwcmVsb2FkLnBvbygpO1xufVxuXG5leHBvcnQge2NsaSBhcyBkZWZhdWx0fTtcblxuIl19