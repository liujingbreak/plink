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
const initInjectors_1 = __importDefault(require("@wfh/webpack-common/dist/initInjectors"));
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
        yield initInjectors_1.default(process.env.PUBLIC_URL || '/');
        if (!['app', 'lib'].includes(type)) {
            log.error(`type argument must be one of "${['app', 'lib']}"`);
            return;
        }
        const preload = require('../preload');
        preload.poo();
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsOENBQW9EO0FBQ3BELGlEQUFtQztBQUNuQywyRkFBa0Y7QUFDbEYsb0RBQTRCO0FBSTVCLHdFQUF3RTtBQUN4RSxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVwQyxNQUFNLEdBQUcsR0FBaUIsQ0FBQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsRUFBRTtJQUV2RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1NBQy9DLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQztTQUN4QyxNQUFNLENBQUMsZUFBZSxFQUFFLHVCQUF1QixFQUFFLFFBQVEsQ0FBQztTQUMxRCxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsRUFBRTtRQUM1QixDQUFDLHdEQUFhLFdBQVcsR0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN4RixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1Q0FBdUMsQ0FBQztTQUMxRSxXQUFXLENBQUMsNEJBQTRCLENBQUM7U0FDekMsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLFNBQW1CLEVBQUUsRUFBRTtRQUNqRCxDQUFDLHdEQUFh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bi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBHbG9iYWxPcHRpb25zfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC90eXBlcyc7XG4vLyBpbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQge3NhdmVDbWRPcHRpb25zVG9FbnZ9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7aW5pdENvbmZpZ0FzeW5jfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvaW5pdEluamVjdG9ycyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQge2luaXRUc2NvbmZpZ30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcblxuLy8gaW1wb3J0IHtPYmplY3RBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvanNvbi1zeW5jLXBhcnNlcic7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdjcmEnKTtcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSwgd2l0aEdsb2JhbE9wdGlvbnMpID0+IHtcblxuICBjb25zdCBnZW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4gPHBhdGg+JylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIHNhbXBsZSBwYWNrYWdlJylcbiAgLm9wdGlvbignLS1jb21wIDxuYW1lPicsICdTYW1wbGUgY29tcG9uZW50IG5hbWUnLCAnU2FtcGxlJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZykgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbicpKS5nZW5QYWNrYWdlKGRpciwgZ2VuQ21kLm9wdHMoKS5jb21wLCBnZW5DbWQub3B0cygpLmRyeVJ1bik7XG4gIH0pO1xuXG4gIGNvbnN0IGdlbkNvbXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tY29tcCA8ZGlyPiA8Y29tcG9uZW50TmFtZS4uLj4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIHNhbXBsZSBjb21wb25lbnRzJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgY29tcE5hbWVzOiBzdHJpbmdbXSkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbicpKS5nZW5Db21wb25lbnRzKGRpciwgY29tcE5hbWVzLCBnZW5Db21wQ21kLm9wdHMoKS5kcnlSdW4pO1xuICB9KTtcbiAgZ2VuQ29tcENtZC51c2FnZShnZW5Db21wQ21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgY3JhLWNvbXAgLi4vcGFja2FnZXMvZm9vYmFyL2NvbXBvbmVudHMgVG9vbGJhciBMYXlvdXQgUHJvZmlsZScpO1xuXG4gIGNvbnN0IGdlblNsaWNlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXNsaWNlIDxkaXI+IDxzbGljZU5hbWUuLi4+JylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIHNhbXBsZSBSZWR1eC10b29sa2l0IFNsaWNlIGZpbGUgKHdpdGggUmVkdXgtb2JzZXJ2YWJsZSBlcGljKScpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIHNsaWNlTmFtZTogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nZW4nKSkuZ2VuU2xpY2UoZGlyLCBzbGljZU5hbWUsIGdlblNsaWNlQ21kLm9wdHMoKS5kcnlSdW4pO1xuICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoZ2VuU2xpY2VDbWQpO1xuXG4gIGNvbnN0IGJ1aWxkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQgPGFwcHxsaWI+IDxwYWNrYWdlLW5hbWU+JylcbiAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnksIDxwYWNrYWdlLW5hbWU+IGlzIHRoZSB0YXJnZXQgcGFja2FnZSBuYW1lLFxcbicgK1xuICAgICdhcmd1bWVudCBcImFwcFwiIGZvciBidWlsZGluZyBhIGNvbXBsZXRlIGFwcGxpY2F0aW9uIGxpa2UgY3JlYXRlLXJlYWN0LWFwcCxcXG4nICtcbiAgICAnYXJndW1lbnQgXCJsaWJcIiBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JylcbiAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnV2hlbiBidWlsZCBhIGxpYnJhcnksIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWRldicsICdzZXQgTk9ERV9FTlYgdG8gXCJkZXZlbG9wbWVudFwiLCBlbmFibGUgcmVhY3Qtc2NyaXB0cyBpbiBkZXYgbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctaSwgLS1pbmNsdWRlIDxtb2R1bGUtcGF0aC1yZWdleD4nLFxuICAnKG11bHRpcGxlIHZhbHVlKSwgd2hlbiBhcmd1bWVudCBpcyBcImxpYlwiLCB3ZSB3aWxsIHNldCBleHRlcm5hbCBwcm9wZXJ0eSBvZiBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gZm9yIGFsbCByZXF1ZXN0IG5vdCBiZWdpbiB3aXRoIFwiLlwiIChleGNlcHQgXCJAYmFiZWwvcnVudGltZXJcIiksICcgK1xuICAnbWVhbmluZyBhbGwgZXh0ZXJuYWwgbW9kdWxlcyB3aWxsIG5vdCBiZSBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IGJ1bmRsZSBmaWxlLCB5b3UgbmVlZCB0byBleHBsaWNpdGx5IHByb3ZpZGUgYSBsaXN0IGluJyArXG4gICcgUmVndWxhciBleHByZXNzaW9uIChlLmcuIC1pIFwiXnNvbWVMaWIvP1wiIC1pIFwiXnNvbWVMaWIyLz9cIiAtaSAuLi4pIHRvIG1ha2UgdGhlbSBiZSBpbmNsdWRlZCBpbiBidW5kbGUgZmlsZScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHR5cGUsIHBrZ05hbWUpID0+IHtcbiAgICBhd2FpdCBpbml0RXZlcnl0aGluZyhidWlsZENtZCwgdHlwZSwgcGtnTmFtZSk7XG4gICAgaWYgKGJ1aWxkQ21kLm9wdHMoKS5zb3VyY2VNYXApIHtcbiAgICAgIGxvZy5pbmZvKCdzb3VyY2UgbWFwIGlzIGVuYWJsZWQnKTtcbiAgICAgIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICd0cnVlJztcbiAgICB9XG4gICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gIH0pO1xuICB3aXRoQ2xpY09wdChidWlsZENtZCk7XG4gIHdpdGhHbG9iYWxPcHRpb25zKGJ1aWxkQ21kKTtcblxuICBjb25zdCBTdGFydENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLXN0YXJ0IDxwYWNrYWdlLW5hbWU+JylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gQ1JBIHN0YXJ0IHNjcmlwdCBmb3IgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSwgPHBhY2thZ2UtbmFtZT4gaXMgdGhlIHRhcmdldCBwYWNrYWdlIG5hbWUnKVxuICAuYWN0aW9uKGFzeW5jIChwa2dOYW1lKSA9PiB7XG4gICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICByZXF1aXJlKCdyZWFjdC1zY3JpcHRzL3NjcmlwdHMvc3RhcnQnKTtcbiAgfSk7XG4gIHdpdGhDbGljT3B0KFN0YXJ0Q21kKTtcbiAgd2l0aEdsb2JhbE9wdGlvbnMoU3RhcnRDbWQpO1xuXG4gIC8vIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1pbml0JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbml0aWFsIHdvcmtzcGFjZSBmaWxlcyBiYXNlZCBvbiBmaWxlcyB3aGljaCBhcmUgbmV3bHkgZ2VuZXJhdGVkIGJ5IGNyZWF0ZS1yZWFjdC1hcHAnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICBjb25zdCBvcHQ6IEdsb2JhbE9wdGlvbnMgPSB7cHJvcDogW10sIGNvbmZpZzogW119O1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyhvcHQpO1xuICAvLyAgIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICAvLyB9KTtcbiAgLy8gLy8gd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgY29uc3Qgc21lQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHlzZSBbd2VicGNrLW91dHB1dC1wYXRoXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIHNvdXJjZS1tYXAtZXhwbG9yZXInKVxuICAuYWN0aW9uKGFzeW5jIChvdXRwdXRQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCBpbml0Q29uZmlnQXN5bmMoc21lQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgICBjb25zdCBzbWVQa2dEaXIgPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdzb3VyY2UtbWFwLWV4cGxvcmVyL3BhY2thZ2UuanNvbicpKTtcbiAgICBjb25zdCBzbWVCaW46IHN0cmluZyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHNtZVBrZ0RpciwgJ3BhY2thZ2UuanNvbicpKS5iaW5bJ3NvdXJjZS1tYXAtZXhwbG9yZXInXTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgY29uc3QgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsIHNtZUJpbiksIFtcbiAgICAgICAgJy0tZ3ppcCcsICctLW5vLXJvb3QnLFxuICAgICAgICBQYXRoLnJlc29sdmUoJ3N0YXRpY0RpcicsIG91dHB1dFBhdGggPyBvdXRwdXRQYXRoIDogJycsICdzdGF0aWMvanMvKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKHNpZ24sIGNvZGUpID0+IHtyZXNvbHZlKGNvZGUpO30pO1xuICAgIH0pO1xuICB9KTtcbiAgLy8gc21lQ21kLnVzYWdlKHNtZUNtZC51c2FnZSgpICsgJ1xcbiAgYXBwLWJhc2UtcGF0aDogJylcbiAgd2l0aEdsb2JhbE9wdGlvbnMoc21lQ21kKTtcbn07XG5cbmZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kXG4gIC8vIC5vcHRpb24oJy0tZGV2JywgJ3NldCBOT0RFX0VOViB0byBcImRldmVsb3BtZW50XCIsIGVuYWJsZSByZWFjdC1zY3JpcHRzIGluIGRldiBtb2RlJywgZmFsc2UpXG4gIC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBhcnJheU9wdGlvbkZuKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdEV2ZXJ5dGhpbmcoYnVpbGRDbWQ6IGNvbW1hbmRlci5Db21tYW5kLCB0eXBlOiAnYXBwJyB8ICdsaWInLCBwa2dOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgY2ZnID0gYXdhaXQgaW5pdENvbmZpZ0FzeW5jKGJ1aWxkQ21kLm9wdHMoKSBhcyBHbG9iYWxPcHRpb25zKTtcbiAgLy8gYXdhaXQgaW5pdFRzY29uZmlnKCk7XG4gIHNhdmVDbWRPcHRpb25zVG9FbnYocGtnTmFtZSwgYnVpbGRDbWQsIHR5cGUpO1xuICBpZiAocHJvY2Vzcy5lbnYuUE9SVCA9PSBudWxsICYmIGNmZygpLnBvcnQpXG4gICAgcHJvY2Vzcy5lbnYuUE9SVCA9IGNmZygpLnBvcnQgKyAnJztcbiAgYXdhaXQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3Rvcihwcm9jZXNzLmVudi5QVUJMSUNfVVJMIHx8ICcvJyk7XG4gIGlmICghWydhcHAnLCAnbGliJ10uaW5jbHVkZXModHlwZSkpIHtcblxuICAgIGxvZy5lcnJvcihgdHlwZSBhcmd1bWVudCBtdXN0IGJlIG9uZSBvZiBcIiR7WydhcHAnLCAnbGliJ119XCJgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcHJlbG9hZDogdHlwZW9mIF9wcmVsb2FkID0gcmVxdWlyZSgnLi4vcHJlbG9hZCcpO1xuICBwcmVsb2FkLnBvbygpO1xufVxuXG5leHBvcnQge2NsaSBhcyBkZWZhdWx0fTtcblxuIl19