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
        .option('-w, --watch', 'when argument is "lib", watch file changes and compile', false)
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set "external" property of Webpack configuration for all request not begin with "." (not relative path), ' +
        'meaning all non-relative modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i \'^someLib(/|$)\' -i \'^someLib2(/|$)\' -i ...) ' +
        ' to make them be included in bundle file. To make specific module (React) external: -i \'^(?!react(-dom)?($|/))\'', arrayOptionFn, [])
        .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
        .action((type, pkgName) => {
        initEverything(buildCmd, type, pkgName);
        if (buildCmd.opts().sourceMap) {
            __plink_1.default.logger.info('source map is enabled');
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
    const cfg = plink_1.config;
    utils_1.saveCmdOptionsToEnv(pkgName, buildCmd, type);
    if (process.env.PORT == null && cfg().port)
        process.env.PORT = cfg().port + '';
    if (!['app', 'lib'].includes(type)) {
        __plink_1.default.logger.error('type argument must be one of \'app\', \'lib\'');
        return;
    }
    const preload = require('../preload');
    preload.poo();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFrQztBQUNsQyxzREFBNEI7QUFDNUIseUVBQXlFO0FBRXpFLE1BQU0sR0FBRyxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDbkUsV0FBVyxDQUFDLDBFQUEwRSxFQUFFO1FBQ3ZGLFNBQVMsRUFBRSwyRUFBMkU7WUFDcEYscUNBQXFDO1FBQ3ZDLGNBQWMsRUFBRSwyREFBMkQ7S0FDNUUsQ0FBQztTQUNELE1BQU0sQ0FBQyxhQUFhLEVBQUUsd0RBQXdELEVBQUUsS0FBSyxDQUFDO1NBQ3RGLE1BQU0sQ0FBQyxtQ0FBbUMsRUFDM0MsNkpBQTZKO1FBQzdKLDJIQUEySDtRQUMzSCwrRUFBK0U7UUFDL0UsbUhBQW1ILEVBQUUsYUFBYSxFQUFFLEVBQUUsQ0FBQztTQUN0SSxNQUFNLENBQUMsY0FBYyxFQUFFLHFIQUFxSCxFQUFFLEtBQUssQ0FBQztTQUNwSixNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7UUFDeEIsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQzdCLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDTCxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFdEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQztTQUM1QyxXQUFXLENBQUMsbUdBQW1HO1FBQzlHLDBFQUEwRSxFQUFFO1FBQzFFLGNBQWMsRUFBRSwyREFBMkQ7S0FDNUUsQ0FBQztTQUNILE1BQU0sQ0FBQyxDQUFNLE9BQU8sRUFBQyxFQUFFO1FBQ3RCLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyx3REFBYSxpQkFBaUIsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUM5RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBR0wsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQztTQUN6RCxXQUFXLENBQUMsMkZBQTJGLEVBQUU7UUFDeEcsY0FBYyxFQUFFLDJEQUEyRDtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDbEIsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUM7SUFDTCxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFdEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztTQUM5QixXQUFXLENBQUMsaUNBQWlDLEVBQUUsRUFBQyxHQUFHLEVBQUUsS0FBSyxFQUFDLENBQUM7U0FDNUQsTUFBTSxDQUFDLENBQU0sR0FBRyxFQUFDLEVBQUU7UUFDbEIsQ0FBQyx3REFBYSxxQkFBcUIsR0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFTCw4Q0FBOEM7SUFDOUMsdUdBQXVHO0lBQ3ZHLHdCQUF3QjtJQUN4Qix1REFBdUQ7SUFDdkQsZ0NBQWdDO0lBQ2hDLDZCQUE2QjtJQUM3QixNQUFNO0lBQ04saUNBQWlDO0lBRWpDLE9BQU8sQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUM7U0FDdEMsS0FBSyxDQUFDLGFBQWEsQ0FBQztTQUNwQixXQUFXLENBQUMseUJBQXlCLEVBQUU7UUFDdEMsUUFBUSxFQUFFLHFGQUFxRjtLQUNoRyxDQUFDO1NBQ0QsTUFBTSxDQUFDLENBQU8sVUFBa0IsRUFBRSxFQUFFO1FBQ25DLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUM7UUFDcEYsTUFBTSxNQUFNLEdBQVcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFbkcsTUFBTSxJQUFJLE9BQU8sQ0FBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxNQUFNLEVBQUUsR0FBRyxvQkFBSSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxFQUFFO2dCQUMvQyxRQUFRLEVBQUUsV0FBVztnQkFDckIsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQzthQUNuRCxFQUFFLEVBQUMsS0FBSyxFQUFFLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLEVBQUMsQ0FBQyxDQUFDO1lBQ3RELEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFO2dCQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNuQixHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDWCxDQUFDLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEdBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0gsdURBQXVEO0FBQ3pELENBQUMsQ0FBQztBQTJCYSxzQkFBTztBQXpCdEIsU0FBUyxXQUFXLENBQUMsR0FBc0I7SUFDekMsR0FBRyxDQUFDLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSx1REFBdUQsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUNqSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLElBQTBCO0lBQzdELElBQUksSUFBSTtRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsUUFBMkIsRUFBRSxJQUFtQixFQUFFLE9BQWU7SUFDdkYsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDO0lBQ25CLDJCQUFtQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSTtRQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBRXJDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFFbEMsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLCtDQUErQyxDQUFDLENBQUM7UUFDcEUsT0FBTztLQUNSO0lBQ0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBb0IsQ0FBQztJQUN6RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDaEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQge3NhdmVDbWRPcHRpb25zVG9FbnZ9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvaW5pdEluamVjdG9ycyc7XG4vLyBpbXBvcnQge2luaXRUc2NvbmZpZ30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCB7T2JqZWN0QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaSBzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBidWlsZENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkIDxhcHB8bGliPiA8cGFja2FnZS1uYW1lPicpXG4gICAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLCB7XG4gICAgICAnYXBwfGxpYic6ICdcImFwcFwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBjb21wbGV0ZSBhcHBsaWNhdGlvbiBsaWtlIGNyZWF0ZS1yZWFjdC1hcHAsXFxuJyArXG4gICAgICAgICdcImxpYlwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JyxcbiAgICAgICdwYWNrYWdlLW5hbWUnOiAndGFyZ2V0IHBhY2thZ2UgbmFtZSwgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQnXG4gICAgfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICd3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgXCJleHRlcm5hbFwiIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKG5vdCByZWxhdGl2ZSBwYXRoKSwgJyArXG4gICAgJ21lYW5pbmcgYWxsIG5vbi1yZWxhdGl2ZSBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgICAnIFJlZ3VsYXIgZXhwcmVzc2lvbiAoZS5nLiAtaSBcXCdec29tZUxpYigvfCQpXFwnIC1pIFxcJ15zb21lTGliMigvfCQpXFwnIC1pIC4uLikgJyArXG4gICAgJyB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUuIFRvIG1ha2Ugc3BlY2lmaWMgbW9kdWxlIChSZWFjdCkgZXh0ZXJuYWw6IC1pIFxcJ14oPyFyZWFjdCgtZG9tKT8oJHwvKSlcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gICAgLmFjdGlvbigodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgICAgaW5pdEV2ZXJ5dGhpbmcoYnVpbGRDbWQsIHR5cGUsIHBrZ05hbWUpO1xuICAgICAgaWYgKGJ1aWxkQ21kLm9wdHMoKS5zb3VyY2VNYXApIHtcbiAgICAgICAgcGxpbmsubG9nZ2VyLmluZm8oJ3NvdXJjZSBtYXAgaXMgZW5hYmxlZCcpO1xuICAgICAgICBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAndHJ1ZSc7XG4gICAgICB9XG4gICAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvYnVpbGQnKTtcbiAgICB9KTtcbiAgd2l0aENsaWNPcHQoYnVpbGRDbWQpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkLXRzZCA8cGFja2FnZS1uYW1lPicpXG4gICAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHBhY2thZ2VzIGZvciBvbmx5IGdlbmVyYXRpbmcgVHlwZXNjcmlwdCBkZWZpbml0aW9uIGZpbGVzLiBJZiB5b3UgYXJlIGNyZWF0aW5nIGEgbGlicmFyeSwgJyArXG4gICAgICAnY29tbWFuZCBcImNyYS1idWlsZFwiIHdpbGwgYWxzbyBnZW5lcmF0ZSB0c2QgZmlsZSBhbG9uZyB3aXRoIGNsaWVudCBidW5kbGUnLCB7XG4gICAgICAgICdwYWNrYWdlLW5hbWUnOiAndGFyZ2V0IHBhY2thZ2UgbmFtZSwgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQnXG4gICAgICB9KVxuICAgIC5hY3Rpb24oYXN5bmMgcGtnTmFtZSA9PiB7XG4gICAgICBpbml0RXZlcnl0aGluZyhTdGFydENtZCwgJ2xpYicsIHBrZ05hbWUpO1xuICAgICAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vdHNkLWdlbmVyYXRlJykpLmJ1aWxkVHNkKFtwa2dOYW1lXSk7XG4gICAgfSk7XG5cblxuICBjb25zdCBTdGFydENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLXN0YXJ0IDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJywge1xuICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICB9KVxuICAgIC5hY3Rpb24oKHBrZ05hbWUpID0+IHtcbiAgICAgIGluaXRFdmVyeXRoaW5nKFN0YXJ0Q21kLCAnYXBwJywgcGtnTmFtZSk7XG4gICAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvc3RhcnQnKTtcbiAgICB9KTtcbiAgd2l0aENsaWNPcHQoU3RhcnRDbWQpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY3JhLW9wZW4gPHVybD4nKVxuICAgIC5kZXNjcmlwdGlvbignUnVuIHJlYWN0LWRldi11dGlscy9vcGVuQnJvd3NlcicsIHt1cmw6ICdVUkwnfSlcbiAgICAuYWN0aW9uKGFzeW5jIHVybCA9PiB7XG4gICAgICAoYXdhaXQgaW1wb3J0KCcuLi9jcmEtb3Blbi1icm93c2VyJykpLmRlZmF1bHQodXJsKTtcbiAgICB9KTtcblxuICAvLyBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtaW5pdCcpXG4gIC8vIC5kZXNjcmlwdGlvbignSW5pdGlhbCB3b3Jrc3BhY2UgZmlsZXMgYmFzZWQgb24gZmlsZXMgd2hpY2ggYXJlIG5ld2x5IGdlbmVyYXRlZCBieSBjcmVhdGUtcmVhY3QtYXBwJylcbiAgLy8gLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gIC8vICAgY29uc3Qgb3B0OiBHbG9iYWxPcHRpb25zID0ge3Byb3A6IFtdLCBjb25maWc6IFtdfTtcbiAgLy8gICBhd2FpdCBpbml0Q29uZmlnQXN5bmMob3B0KTtcbiAgLy8gICAvLyBhd2FpdCBpbml0VHNjb25maWcoKTtcbiAgLy8gfSk7XG4gIC8vIC8vIHdpdGhHbG9iYWxPcHRpb25zKGluaXRDbWQpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY3JhLWFuYWx5emUgW2pzLWRpcl0nKVxuICAuYWxpYXMoJ2NyYS1hbmFseXNlJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc291cmNlLW1hcC1leHBsb3JlcicsIHtcbiAgICAnanMtZGlyJzogJ05vcm1hbGx5IHRoaXMgcGF0aCBzaG91bGQgYmUgPHJvb3QtZGlyPmRpc3Qvc3RhdGljLzxvdXRwdXQtcGF0aC1iYXNlbmFtZT4vc3RhdGljL2pzJ1xuICB9KVxuICAuYWN0aW9uKGFzeW5jIChvdXRwdXRQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBzbWVQa2dEaXIgPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdzb3VyY2UtbWFwLWV4cGxvcmVyL3BhY2thZ2UuanNvbicpKTtcbiAgICBjb25zdCBzbWVCaW46IHN0cmluZyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHNtZVBrZ0RpciwgJ3BhY2thZ2UuanNvbicpKS5iaW5bJ3NvdXJjZS1tYXAtZXhwbG9yZXInXTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgY29uc3QgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsIHNtZUJpbiksIFtcbiAgICAgICAgJy0tZ3ppcCcsICctLW5vLXJvb3QnLFxuICAgICAgICBQYXRoLnJlc29sdmUob3V0cHV0UGF0aCA/IG91dHB1dFBhdGggOiAnJywgJyouanMnKVxuICAgICAgXSwge3N0ZGlvOiBbJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpbmhlcml0JywgJ2lwYyddfSk7XG4gICAgICBjcC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHJlaihlcnIpO1xuICAgICAgfSk7XG4gICAgICBjcC5vbignZXhpdCcsIChzaWduLCBjb2RlKSA9PiB7cmVzb2x2ZShjb2RlKTsgfSk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBzbWVDbWQudXNhZ2Uoc21lQ21kLnVzYWdlKCkgKyAnXFxuICBhcHAtYmFzZS1wYXRoOiAnKVxufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWQub3B0aW9uKCctLXB1cmwsIC0tcHVibGljVXJsIDxzdHJpbmc+JywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBQVUJMSUNfVVJMIGZvciByZWFjdC1zY3JpcHRzJywgdW5kZWZpbmVkKTtcbn1cblxuZnVuY3Rpb24gYXJyYXlPcHRpb25GbihjdXJyOiBzdHJpbmcsIHByZXY6IHN0cmluZ1tdIHwgdW5kZWZpbmVkKSB7XG4gIGlmIChwcmV2KVxuICAgIHByZXYucHVzaChjdXJyKTtcbiAgcmV0dXJuIHByZXY7XG59XG5cbmZ1bmN0aW9uIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kOiBjb21tYW5kZXIuQ29tbWFuZCwgdHlwZTogJ2FwcCcgfCAnbGliJywgcGtnTmFtZTogc3RyaW5nKSB7XG4gIGNvbnN0IGNmZyA9IGNvbmZpZztcbiAgc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lLCBidWlsZENtZCwgdHlwZSk7XG4gIGlmIChwcm9jZXNzLmVudi5QT1JUID09IG51bGwgJiYgY2ZnKCkucG9ydClcbiAgICBwcm9jZXNzLmVudi5QT1JUID0gY2ZnKCkucG9ydCArICcnO1xuXG4gIGlmICghWydhcHAnLCAnbGliJ10uaW5jbHVkZXModHlwZSkpIHtcblxuICAgIHBsaW5rLmxvZ2dlci5lcnJvcigndHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcXCdhcHBcXCcsIFxcJ2xpYlxcJycpO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpIGFzIHR5cGVvZiBfcHJlbG9hZDtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==