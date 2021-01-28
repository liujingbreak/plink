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
const dist_1 = require("@wfh/plink/wfh/dist");
const child_process_1 = require("child_process");
// import walkPackagesAndSetupInjector from '@wfh/webpack-common/dist/initInjectors';
const log4js_1 = __importDefault(require("log4js"));
// import {ObjectAst} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
const log = log4js_1.default.getLogger('cra');
const cli = (program, withGlobalOptions) => {
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
        .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set external property of Webpack configuration for all request not begin with "." (except "@babel/runtimer"), ' +
        'meaning all external modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i "^someLib/?" -i "^someLib2/?" -i ...) to make them be included in bundle file', arrayOptionFn, [])
        .option('--source-map', 'set environment variable GENERATE_SOURCEMAP to "true" (see https://create-react-app.dev/docs/advanced-configuration', false)
        .action((type, pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        yield initEverything(buildCmd, type, pkgName);
        if (buildCmd.opts().sourceMap) {
            log.info('source map is enabled');
            process.env.GENERATE_SOURCEMAP = 'true';
        }
        require('react-scripts/scripts/build');
    }));
    withClicOpt(buildCmd);
    withGlobalOptions(buildCmd);
    const StartCmd = program.command('cra-start <package-name>')
        .description('Run CRA start script for react application or library, <package-name> is the target package name')
        .action((pkgName) => __awaiter(void 0, void 0, void 0, function* () {
        yield initEverything(StartCmd, 'app', pkgName);
        require('react-scripts/scripts/start');
    }));
    withClicOpt(StartCmd);
    withGlobalOptions(StartCmd);
    // const initCmd = program.command('cra-init')
    // .description('Initial workspace files based on files which are newly generated by create-react-app')
    // .action(async () => {
    //   const opt: GlobalOptions = {prop: [], config: []};
    //   await initConfigAsync(opt);
    //   // await initTsconfig();
    // });
    // // withGlobalOptions(initCmd);
    const smeCmd = program.command('cra-analyse [webpck-output-path]')
        .description('Run source-map-explorer')
        .action((outputPath) => __awaiter(void 0, void 0, void 0, function* () {
        yield dist_1.initConfigAsync(smeCmd.opts());
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
    withGlobalOptions(smeCmd);
};
exports.default = cli;
function withClicOpt(cmd) {
    cmd
        // .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
        .option('--purl, --publicUrl <string>', 'set environment variable PUBLIC_URL for react-scripts', undefined);
}
function arrayOptionFn(curr, prev) {
    if (prev)
        prev.push(curr);
    return prev;
}
function initEverything(buildCmd, type, pkgName) {
    return __awaiter(this, void 0, void 0, function* () {
        const cfg = yield dist_1.initConfigAsync(buildCmd.opts());
        // await initTsconfig();
        utils_1.saveCmdOptionsToEnv(pkgName, buildCmd, type);
        if (process.env.PORT == null && cfg().port)
            process.env.PORT = cfg().port + '';
        // await walkPackagesAndSetupInjector(process.env.PUBLIC_URL || '/');
        if (!['app', 'lib'].includes(type)) {
            log.error(`type argument must be one of "${['app', 'lib']}"`);
            return;
        }
        const preload = require('../preload');
        preload.poo();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsOENBQW9EO0FBQ3BELGlEQUFtQztBQUNuQyxxRkFBcUY7QUFDckYsb0RBQTRCO0FBSTVCLHdFQUF3RTtBQUN4RSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVwQyxNQUFNLEdBQUcsR0FBaUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsRUFBRTtJQUV2RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1NBQy9DLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQztTQUN4QyxNQUFNLENBQUMsZUFBZSxFQUFFLHVCQUF1QixFQUFFLFFBQVEsQ0FBQztTQUMxRCxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsRUFBRTtRQUM1QixDQUFDLHdEQUFhLFdBQVcsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4RixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUMxRSxXQUFXLENBQUMsNEJBQTRCLENBQUM7U0FDekMsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxDQUFDLHdEQUFh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QVcsQ0FBQyxHQUFzQjtJQUN6QyxHQUFHO1FBQ0gsNkZBQTZGO1NBQzVGLE1BQU0sQ0FBQyw4QkFBOEIsRUFBRSx1REFBdUQsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUM5RyxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBWSxFQUFFLElBQTBCO0lBQzdELElBQUksSUFBSTtRQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBZSxjQUFjLENBQUMsUUFBMkIsRUFBRSxJQUFtQixFQUFFLE9BQWU7O1FBQzdGLE1BQU0sR0FBRyxHQUFHLE1BQU0sc0JBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFtQixDQUFDLENBQUM7UUFDcEUsd0JBQXdCO1FBQ3hCLDJCQUFtQixDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxJQUFJLElBQUksR0FBRyxFQUFFLENBQUMsSUFBSTtZQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3JDLHFFQUFxRTtRQUNyRSxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1lBRWxDLEdBQUcsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM5RCxPQUFPO1NBQ1I7UUFDRCxNQUFNLE9BQU8sR0FBb0IsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNoQixDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vLyBpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtDbGlFeHRlbnNpb24sIEdsb2JhbE9wdGlvbnN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kL3R5cGVzJztcbi8vIGltcG9ydCByZXBsYWNlUGF0Y2hlcywgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0Vudn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtpbml0Q29uZmlnQXN5bmN9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9pbml0SW5qZWN0b3JzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCB7aW5pdFRzY29uZmlnfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCAqIGFzIF9wcmVsb2FkIGZyb20gJy4uL3ByZWxvYWQnO1xuXG4vLyBpbXBvcnQge09iamVjdEFzdH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ2NyYScpO1xuXG5jb25zdCBjbGk6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtLCB3aXRoR2xvYmFsT3B0aW9ucykgPT4ge1xuXG4gIGNvbnN0IGdlbkNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbiA8cGF0aD4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgc2FtcGxlIHBhY2thZ2UnKVxuICAub3B0aW9uKCctLWNvbXAgPG5hbWU+JywgJ1NhbXBsZSBjb21wb25lbnQgbmFtZScsICdTYW1wbGUnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2VuJykpLmdlblBhY2thZ2UoZGlyLCBnZW5DbWQub3B0cygpLmNvbXAsIGdlbkNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgfSk7XG5cbiAgY29uc3QgZ2VuQ29tcENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1jb21wIDxkaXI+IDxjb21wb25lbnROYW1lLi4uPicpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgc2FtcGxlIGNvbXBvbmVudHMnKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBjb21wTmFtZXM6IHN0cmluZ1tdKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2VuJykpLmdlbkNvbXBvbmVudHMoZGlyLCBjb21wTmFtZXMsIGdlbkNvbXBDbWQub3B0cygpLmRyeVJ1bik7XG4gIH0pO1xuICBnZW5Db21wQ21kLnVzYWdlKGdlbkNvbXBDbWQudXNhZ2UoKSArICdcXG5lLmcuXFxuICBwbGluayBjcmEtY29tcCAuLi9wYWNrYWdlcy9mb29iYXIvY29tcG9uZW50cyBUb29sYmFyIExheW91dCBQcm9maWxlJyk7XG5cbiAgY29uc3QgZ2VuU2xpY2VDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tc2xpY2UgPGRpcj4gPHNsaWNlTmFtZS4uLj4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIGEgc2FtcGxlIFJlZHV4LXRvb2xraXQgU2xpY2UgZmlsZSAod2l0aCBSZWR1eC1vYnNlcnZhYmxlIGVwaWMpJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgc2xpY2VOYW1lOiBzdHJpbmdbXSkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbicpKS5nZW5TbGljZShkaXIsIHNsaWNlTmFtZSwgZ2VuU2xpY2VDbWQub3B0cygpLmRyeVJ1bik7XG4gIH0pO1xuICAvLyB3aXRoR2xvYmFsT3B0aW9ucyhnZW5TbGljZUNtZCk7XG5cbiAgY29uc3QgYnVpbGRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZCA8YXBwfGxpYj4gPHBhY2thZ2UtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSwgPHBhY2thZ2UtbmFtZT4gaXMgdGhlIHRhcmdldCBwYWNrYWdlIG5hbWUsXFxuJyArXG4gICAgJ2FyZ3VtZW50IFwiYXBwXCIgZm9yIGJ1aWxkaW5nIGEgY29tcGxldGUgYXBwbGljYXRpb24gbGlrZSBjcmVhdGUtcmVhY3QtYXBwLFxcbicgK1xuICAgICdhcmd1bWVudCBcImxpYlwiIGZvciBidWlsZGluZyBhIGxpYnJhcnknKVxuICAub3B0aW9uKCctdywgLS13YXRjaCcsICdXaGVuIGJ1aWxkIGEgbGlicmFyeSwgd2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4gIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICcobXVsdGlwbGUgdmFsdWUpLCB3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdlIHdpbGwgc2V0IGV4dGVybmFsIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKGV4Y2VwdCBcIkBiYWJlbC9ydW50aW1lclwiKSwgJyArXG4gICdtZWFuaW5nIGFsbCBleHRlcm5hbCBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgJyBSZWd1bGFyIGV4cHJlc3Npb24gKGUuZy4gLWkgXCJec29tZUxpYi8/XCIgLWkgXCJec29tZUxpYjIvP1wiIC1pIC4uLikgdG8gbWFrZSB0aGVtIGJlIGluY2x1ZGVkIGluIGJ1bmRsZSBmaWxlJywgYXJyYXlPcHRpb25GbiwgW10pXG4gIC5vcHRpb24oJy0tc291cmNlLW1hcCcsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgR0VORVJBVEVfU09VUkNFTUFQIHRvIFwidHJ1ZVwiIChzZWUgaHR0cHM6Ly9jcmVhdGUtcmVhY3QtYXBwLmRldi9kb2NzL2FkdmFuY2VkLWNvbmZpZ3VyYXRpb24nLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgIGF3YWl0IGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kLCB0eXBlLCBwa2dOYW1lKTtcbiAgICBpZiAoYnVpbGRDbWQub3B0cygpLnNvdXJjZU1hcCkge1xuICAgICAgbG9nLmluZm8oJ3NvdXJjZSBtYXAgaXMgZW5hYmxlZCcpO1xuICAgICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICAgIH1cbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvYnVpbGQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoYnVpbGRDbWQpO1xuXG4gIGNvbnN0IFN0YXJ0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtc3RhcnQgPHBhY2thZ2UtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5LCA8cGFja2FnZS1uYW1lPiBpcyB0aGUgdGFyZ2V0IHBhY2thZ2UgbmFtZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBrZ05hbWUpID0+IHtcbiAgICBhd2FpdCBpbml0RXZlcnl0aGluZyhTdGFydENtZCwgJ2FwcCcsIHBrZ05hbWUpO1xuICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9zdGFydCcpO1xuICB9KTtcbiAgd2l0aENsaWNPcHQoU3RhcnRDbWQpO1xuICB3aXRoR2xvYmFsT3B0aW9ucyhTdGFydENtZCk7XG5cbiAgLy8gY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWluaXQnKVxuICAvLyAuZGVzY3JpcHRpb24oJ0luaXRpYWwgd29ya3NwYWNlIGZpbGVzIGJhc2VkIG9uIGZpbGVzIHdoaWNoIGFyZSBuZXdseSBnZW5lcmF0ZWQgYnkgY3JlYXRlLXJlYWN0LWFwcCcpXG4gIC8vIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAvLyAgIGNvbnN0IG9wdDogR2xvYmFsT3B0aW9ucyA9IHtwcm9wOiBbXSwgY29uZmlnOiBbXX07XG4gIC8vICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKG9wdCk7XG4gIC8vICAgLy8gYXdhaXQgaW5pdFRzY29uZmlnKCk7XG4gIC8vIH0pO1xuICAvLyAvLyB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICBjb25zdCBzbWVDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1hbmFseXNlIFt3ZWJwY2stb3V0cHV0LXBhdGhdJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc291cmNlLW1hcC1leHBsb3JlcicpXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhzbWVDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIGNvbnN0IHNtZUJpbjogc3RyaW5nID0gcmVxdWlyZShQYXRoLnJlc29sdmUoc21lUGtnRGlyLCAncGFja2FnZS5qc29uJykpLmJpblsnc291cmNlLW1hcC1leHBsb3JlciddO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZSgnc3RhdGljRGlyJywgb3V0cHV0UGF0aCA/IG91dHB1dFBhdGggOiAnJywgJ3N0YXRpYy9qcy8qLmpzJylcbiAgICAgIF0sIHtzdGRpbzogWydpbmhlcml0JywgJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpcGMnXX0pO1xuICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZWooZXJyKTtcbiAgICAgIH0pO1xuICAgICAgY3Aub24oJ2V4aXQnLCAoc2lnbiwgY29kZSkgPT4ge3Jlc29sdmUoY29kZSk7fSk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBzbWVDbWQudXNhZ2Uoc21lQ21kLnVzYWdlKCkgKyAnXFxuICBhcHAtYmFzZS1wYXRoOiAnKVxuICB3aXRoR2xvYmFsT3B0aW9ucyhzbWVDbWQpO1xufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWRcbiAgLy8gLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsIHVuZGVmaW5lZCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5T3B0aW9uRm4oY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0RXZlcnl0aGluZyhidWlsZENtZDogY29tbWFuZGVyLkNvbW1hbmQsIHR5cGU6ICdhcHAnIHwgJ2xpYicsIHBrZ05hbWU6IHN0cmluZykge1xuICBjb25zdCBjZmcgPSBhd2FpdCBpbml0Q29uZmlnQXN5bmMoYnVpbGRDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAvLyBhd2FpdCBpbml0VHNjb25maWcoKTtcbiAgc2F2ZUNtZE9wdGlvbnNUb0Vudihwa2dOYW1lLCBidWlsZENtZCwgdHlwZSk7XG4gIGlmIChwcm9jZXNzLmVudi5QT1JUID09IG51bGwgJiYgY2ZnKCkucG9ydClcbiAgICBwcm9jZXNzLmVudi5QT1JUID0gY2ZnKCkucG9ydCArICcnO1xuICAvLyBhd2FpdCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yKHByb2Nlc3MuZW52LlBVQkxJQ19VUkwgfHwgJy8nKTtcbiAgaWYgKCFbJ2FwcCcsICdsaWInXS5pbmNsdWRlcyh0eXBlKSkge1xuXG4gICAgbG9nLmVycm9yKGB0eXBlIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIFwiJHtbJ2FwcCcsICdsaWInXX1cImApO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBwcmVsb2FkOiB0eXBlb2YgX3ByZWxvYWQgPSByZXF1aXJlKCcuLi9wcmVsb2FkJyk7XG4gIHByZWxvYWQucG9vKCk7XG59XG5cbmV4cG9ydCB7Y2xpIGFzIGRlZmF1bHR9O1xuXG4iXX0=