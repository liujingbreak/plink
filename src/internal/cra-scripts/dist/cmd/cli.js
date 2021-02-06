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
    const genCmd = program.command('cra-gen <path>')
        .description('Generate a sample package')
        .option('--comp <name>', 'Sample component name', 'Sample')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-gen')))).genPackage(dir, genCmd.opts().comp, genCmd.opts().dryRun);
    }));
    const genCompCmd = program.command('cra-gen-comp <dir> <componentName...>')
        .description('Generate sample components')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, compNames) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-gen')))).genComponents(dir, compNames, genCompCmd.opts().dryRun);
    }));
    genCompCmd.usage(genCompCmd.usage() + '\ne.g.\n  plink cra-comp ../packages/foobar/components Toolbar Layout Profile');
    const genSliceCmd = program.command('cra-gen-slice <dir> <sliceName...>')
        .description('Generate a sample Redux-toolkit Slice file (with Redux-observable epic)')
        .option('-d, --dry-run', 'Do not generate files, just list new file names', false)
        .action((dir, sliceName) => __awaiter(void 0, void 0, void 0, function* () {
        (yield Promise.resolve().then(() => __importStar(require('./cli-gen')))).genSlice(dir, sliceName, genSliceCmd.opts().dryRun);
    }));
    // withGlobalOptions(genSliceCmd);
    const buildCmd = program.command('cra-build <app|lib> <package-name>')
        .description('Compile react application or library, <package-name> is the target package name,\n' +
        'argument "app" for building a complete application like create-react-app,\n' +
        'argument "lib" for building a library')
        .option('-w, --watch', 'When build a library, watch file changes and compile', false)
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
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library, <package-name> is the target package name')
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
    program.command('cra-analyse [webpck-output-path]')
        .description('Run source-map-explorer')
        .action((outputPath) => __awaiter(void 0, void 0, void 0, function* () {
        const smePkgDir = path_1.default.dirname(require.resolve('source-map-explorer/package.json'));
        const smeBin = require(path_1.default.resolve(smePkgDir, 'package.json')).bin['source-map-explorer'];
        yield new Promise((resolve, rej) => {
            const cp = child_process_1.fork(path_1.default.resolve(smePkgDir, smeBin), [
                '--gzip', '--no-root',
                path_1.default.resolve('staticDir', outputPath ? outputPath : '', 'static/js/*.js')
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFrQztBQUNsQyxzREFBNEI7QUFDNUIseUVBQXlFO0FBRXpFLE1BQU0sR0FBRyxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBRXBDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7U0FDL0MsV0FBVyxDQUFDLDJCQUEyQixDQUFDO1NBQ3hDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxDQUFDO1NBQzFELE1BQU0sQ0FBQyxlQUFlLEVBQUUsaURBQWlELEVBQUUsS0FBSyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxFQUFFO1FBQzVCLENBQUMsd0RBQWEsV0FBVyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO1NBQzFFLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQztTQUN6QyxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsU0FBbUIsRUFBRSxFQUFFO1FBQ2pELENBQUMsd0RBQWEsV0FBVyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLCtFQUErRSxDQUFDLENBQUM7SUFFdkgsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUN4RSxXQUFXLENBQUMseUVBQXlFLENBQUM7U0FDdEYsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxDQUFDLHdEQUFhLFdBQVcsR0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxrQ0FBa0M7SUFFbEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNyRSxXQUFXLENBQUMsb0ZBQW9GO1FBQy9GLDZFQUE2RTtRQUM3RSx1Q0FBdUMsQ0FBQztTQUN6QyxNQUFNLENBQUMsYUFBYSxFQUFFLHNEQUFzRCxFQUFFLEtBQUssQ0FBQztRQUNyRiw2RkFBNkY7U0FDNUYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyxrS0FBa0s7UUFDbEssdUhBQXVIO1FBQ3ZILDRHQUE0RyxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUM7U0FDL0gsTUFBTSxDQUFDLGNBQWMsRUFBRSxxSEFBcUgsRUFBRSxLQUFLLENBQUM7U0FDcEosTUFBTSxDQUFDLENBQU8sSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQzlCLE1BQU0sY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQzdCLGlCQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO1NBQ3pDO1FBQ0QsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNILFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV0QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDO1NBQzNELFdBQVcsQ0FBQyxrR0FBa0csQ0FBQztTQUMvRyxNQUFNLENBQUMsQ0FBTyxPQUFPLEVBQUUsRUFBRTtRQUN4QixNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFdEIsOENBQThDO0lBQzlDLHVHQUF1RztJQUN2Ryx3QkFBd0I7SUFDeEIsdURBQXVEO0lBQ3ZELGdDQUFnQztJQUNoQyw2QkFBNkI7SUFDN0IsTUFBTTtJQUNOLGlDQUFpQztJQUVqQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxDQUFDO1NBQ2xELFdBQVcsQ0FBQyx5QkFBeUIsQ0FBQztTQUN0QyxNQUFNLENBQUMsQ0FBTyxVQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQztRQUNwRixNQUFNLE1BQU0sR0FBVyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVuRyxNQUFNLElBQUksT0FBTyxDQUFNLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3RDLE1BQU0sRUFBRSxHQUFHLG9CQUFJLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQy9DLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixjQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDO2FBQzFFLEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUM7WUFDdEQsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQSxDQUFDLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSCx1REFBdUQ7QUFDekQsQ0FBQyxDQUFDO0FBNkJhLHNCQUFPO0FBM0J0QixTQUFTLFdBQVcsQ0FBQyxHQUFzQjtJQUN6QyxHQUFHLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUFFLHVEQUF1RCxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2pILENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFZLEVBQUUsSUFBMEI7SUFDN0QsSUFBSSxJQUFJO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFlLGNBQWMsQ0FBQyxRQUEyQixFQUFFLElBQW1CLEVBQUUsT0FBZTs7UUFDN0YsdUVBQXVFO1FBQ3ZFLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQztRQUNuQix3QkFBd0I7UUFDeEIsMkJBQW1CLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1lBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDckMscUVBQXFFO1FBQ3JFLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFFbEMsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkUsT0FBTztTQUNSO1FBQ0QsTUFBTSxPQUFPLEdBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC90eXBlcyc7XG4vLyBpbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQge3NhdmVDbWRPcHRpb25zVG9FbnZ9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvaW5pdEluamVjdG9ycyc7XG4vLyBpbXBvcnQge2luaXRUc2NvbmZpZ30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCB7T2JqZWN0QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaSBzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuXG4gIGNvbnN0IGdlbkNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbiA8cGF0aD4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgc2FtcGxlIHBhY2thZ2UnKVxuICAub3B0aW9uKCctLWNvbXAgPG5hbWU+JywgJ1NhbXBsZSBjb21wb25lbnQgbmFtZScsICdTYW1wbGUnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2VuJykpLmdlblBhY2thZ2UoZGlyLCBnZW5DbWQub3B0cygpLmNvbXAsIGdlbkNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgfSk7XG5cbiAgY29uc3QgZ2VuQ29tcENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1jb21wIDxkaXI+IDxjb21wb25lbnROYW1lLi4uPicpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgc2FtcGxlIGNvbXBvbmVudHMnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2VuJykpLmdlbkNvbXBvbmVudHMoZGlyLCBjb21wTmFtZXMsIGdlbkNvbXBDbWQub3B0cygpLmRyeVJ1bik7XG4gIH0pO1xuICBnZW5Db21wQ21kLnVzYWdlKGdlbkNvbXBDbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBjcmEtY29tcCAuLi9wYWNrYWdlcy9mb29iYXIvY29tcG9uZW50cyBUb29sYmFyIExheW91dCBQcm9maWxlJyk7XG5cbiAgY29uc3QgZ2VuU2xpY2VDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tc2xpY2UgPGRpcj4gPHNsaWNlTmFtZS4uLj4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgc2FtcGxlIFJlZHV4LXRvb2xraXQgU2xpY2UgZmlsZSAod2l0aCBSZWR1eC1vYnNlcnZhYmxlIGVwaWMpJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgc2xpY2VOYW1lOiBzdHJpbmdbXSkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbicpKS5nZW5TbGljZShkaXIsIHNsaWNlTmFtZSwgZ2VuU2xpY2VDbWQub3B0cygpLmRyeVJ1bik7XG4gIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhnZW5TbGljZUNtZCk7XG5cbiAgY29uc3QgYnVpbGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZCA8YXBwfGxpYj4gPHBhY2thZ2UtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSwgPHBhY2thZ2UtbmFtZT4gaXMgdGhlIHRhcmdldCBwYWNrYWdlIG5hbWUsXFxuJyArXG4gICAgJ2FyZ3VtZW50IFwiYXBwXCIgZm9yIGJ1aWxkaW5nIGEgY29tcGxldGUgYXBwbGljYXRpb24gbGlrZSBjcmVhdGUtcmVhY3QtYXBwLFxcbicgK1xuICAgICdhcmd1bWVudCBcImxpYlwiIGZvciBidWlsZGluZyBhIGxpYnJhcnknKVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdXaGVuIGJ1aWxkIGEgbGlicmFyeSwgd2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4gIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICcobXVsdGlwbGUgdmFsdWUpLCB3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdlIHdpbGwgc2V0IGV4dGVybmFsIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKGV4Y2VwdCBcIkBiYWJlbC9ydW50aW1lclwiKSwgJyArXG4gICdtZWFuaW5nIGFsbCBleHRlcm5hbCBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgJyBSZWd1bGFyIGV4cHJlc3Npb24gKGUuZy4gLWkgXCJec29tZUxpYi8/XCIgLWkgXCJec29tZUxpYjIvP1wiIC1pIC4uLikgdG8gbWFrZSB0aGVtIGJlIGluY2x1ZGVkIGluIGJ1bmRsZSBmaWxlJywgYXJyYXlPcHRpb25GbiwgW10pXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgR0VORVJBVEVfU09VUkNFTUFQIHRvIFwidHJ1ZVwiIChzZWUgaHR0cHM6Ly9jcmVhdGUtcmVhY3QtYXBwLmRldi9kb2NzL2FkdmFuY2VkLWNvbmZpZ3VyYXRpb24nLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgIGF3YWl0IGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kLCB0eXBlLCBwa2dOYW1lKTtcbiAgICBpZiAoYnVpbGRDbWQub3B0cygpLnNvdXJjZU1hcCkge1xuICAgICAgcGxpbmsubG9nZ2VyLmluZm8oJ3NvdXJjZSBtYXAgaXMgZW5hYmxlZCcpO1xuICAgICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICAgIH1cbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvYnVpbGQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBjb25zdCBTdGFydENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLXN0YXJ0IDxwYWNrYWdlLW5hbWU+JylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gQ1JBIHN0YXJ0IHNjcmlwdCBmb3IgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSwgPHBhY2thZ2UtbmFtZT4gaXMgdGhlIHRhcmdldCBwYWNrYWdlIG5hbWUnKVxuICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKSA9PiB7XG4gICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvc3RhcnQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KFN0YXJ0Q21kKTtcblxuICAvLyBjb25zdCBpbml0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtaW5pdCcpXG4gIC8vIC5kZXNjcmlwdGlvbignSW5pdGlhbCB3b3Jrc3BhY2UgZmlsZXMgYmFzZWQgb24gZmlsZXMgd2hpY2ggYXJlIG5ld2x5IGdlbmVyYXRlZCBieSBjcmVhdGUtcmVhY3QtYXBwJylcbiAgLy8gLmFjdGlvbihhc3luYyAoKSA9PiB7XG4gIC8vICAgY29uc3Qgb3B0OiBHbG9iYWxPcHRpb25zID0ge3Byb3A6IFtdLCBjb25maWc6IFtdfTtcbiAgLy8gICBhd2FpdCBpbml0Q29uZmlnQXN5bmMob3B0KTtcbiAgLy8gICAvLyBhd2FpdCBpbml0VHNjb25maWcoKTtcbiAgLy8gfSk7XG4gIC8vIC8vIHdpdGhHbG9iYWxPcHRpb25zKGluaXRDbWQpO1xuXG4gIHByb2dyYW0uY29tbWFuZCgnY3JhLWFuYWx5c2UgW3dlYnBjay1vdXRwdXQtcGF0aF0nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJylcbiAgLmFjdGlvbihhc3luYyAob3V0cHV0UGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3Qgc21lUGtnRGlyID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnc291cmNlLW1hcC1leHBsb3Jlci9wYWNrYWdlLmpzb24nKSk7XG4gICAgY29uc3Qgc21lQmluOiBzdHJpbmcgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsICdwYWNrYWdlLmpzb24nKSkuYmluWydzb3VyY2UtbWFwLWV4cGxvcmVyJ107XG5cbiAgICBhd2FpdCBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICAgIGNvbnN0IGNwID0gZm9yayhQYXRoLnJlc29sdmUoc21lUGtnRGlyLCBzbWVCaW4pLCBbXG4gICAgICAgICctLWd6aXAnLCAnLS1uby1yb290JyxcbiAgICAgICAgUGF0aC5yZXNvbHZlKCdzdGF0aWNEaXInLCBvdXRwdXRQYXRoID8gb3V0cHV0UGF0aCA6ICcnLCAnc3RhdGljL2pzLyouanMnKVxuICAgICAgXSwge3N0ZGlvOiBbJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpbmhlcml0JywgJ2lwYyddfSk7XG4gICAgICBjcC5vbignZXJyb3InLCBlcnIgPT4ge1xuICAgICAgICBjb25zb2xlLmVycm9yKGVycik7XG4gICAgICAgIHJlaihlcnIpO1xuICAgICAgfSk7XG4gICAgICBjcC5vbignZXhpdCcsIChzaWduLCBjb2RlKSA9PiB7cmVzb2x2ZShjb2RlKTt9KTtcbiAgICB9KTtcbiAgfSk7XG4gIC8vIHNtZUNtZC51c2FnZShzbWVDbWQudXNhZ2UoKSArICdcXG4gIGFwcC1iYXNlLXBhdGg6ICcpXG59O1xuXG5mdW5jdGlvbiB3aXRoQ2xpY09wdChjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIGNtZC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBhcnJheU9wdGlvbkZuKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdEV2ZXJ5dGhpbmcoYnVpbGRDbWQ6IGNvbW1hbmRlci5Db21tYW5kLCB0eXBlOiAnYXBwJyB8ICdsaWInLCBwa2dOYW1lOiBzdHJpbmcpIHtcbiAgLy8gY29uc3QgY2ZnID0gYXdhaXQgaW5pdENvbmZpZ0FzeW5jKGJ1aWxkQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgY29uc3QgY2ZnID0gY29uZmlnO1xuICAvLyBhd2FpdCBpbml0VHNjb25maWcoKTtcbiAgc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lLCBidWlsZENtZCwgdHlwZSk7XG4gIGlmIChwcm9jZXNzLmVudi5QT1JUID09IG51bGwgJiYgY2ZnKCkucG9ydClcbiAgICBwcm9jZXNzLmVudi5QT1JUID0gY2ZnKCkucG9ydCArICcnO1xuICAvLyBhd2FpdCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yKHByb2Nlc3MuZW52LlBVQkxJQ19VUkwgfHwgJy8nKTtcbiAgaWYgKCFbJ2FwcCcsICdsaWInXS5pbmNsdWRlcyh0eXBlKSkge1xuXG4gICAgcGxpbmsubG9nZ2VyLmVycm9yKGB0eXBlIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIFwiJHtbJ2FwcCcsICdsaWInXX1cImApO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcmVsb2FkOiB0eXBlb2YgX3ByZWxvYWQgPSByZXF1aXJlKCcuLi9wcmVsb2FkJyk7XG4gIHByZWxvYWQucG9vKCk7XG59XG5cbmV4cG9ydCB7Y2xpIGFzIGRlZmF1bHR9O1xuXG4iXX0=