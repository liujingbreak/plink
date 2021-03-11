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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFrQztBQUNsQyxzREFBNEI7QUFDNUIseUVBQXlFO0FBRXpFLE1BQU0sR0FBRyxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBRXBDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7U0FDL0MsV0FBVyxDQUFDLDJCQUEyQixDQUFDO1NBQ3hDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsUUFBUSxDQUFDO1NBQzFELE1BQU0sQ0FBQyxlQUFlLEVBQUUsaURBQWlELEVBQUUsS0FBSyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxFQUFFO1FBQzVCLENBQUMsd0RBQWEsV0FBVyxHQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hGLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxDQUFDO1NBQzFFLFdBQVcsQ0FBQyw0QkFBNEIsQ0FBQztTQUN6QyxNQUFNLENBQUMsZUFBZSxFQUFFLGlEQUFpRCxFQUFFLEtBQUssQ0FBQztTQUNqRixNQUFNLENBQUMsQ0FBTyxHQUFXLEVBQUUsU0FBbUIsRUFBRSxFQUFFO1FBQ2pELENBQUMsd0RBQWEsV0FBVyxHQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxD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O1FBQ3ZFLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQztRQUNuQix3QkFBd0I7UUFDeEIsMkJBQW1CLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM3QyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLElBQUksSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1lBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7UUFDckMscUVBQXFFO1FBQ3JFLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFFbEMsaUJBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkUsT0FBTztTQUNSO1FBQ0QsTUFBTSxPQUFPLEdBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCByZXBsYWNlUGF0Y2hlcywgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0Vudn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9pbml0SW5qZWN0b3JzJztcbi8vIGltcG9ydCB7aW5pdFRzY29uZmlnfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCAqIGFzIF9wcmVsb2FkIGZyb20gJy4uL3ByZWxvYWQnO1xuaW1wb3J0IHtjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuLy8gaW1wb3J0IHtPYmplY3RBc3R9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2RpIHN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuXG5jb25zdCBjbGk6IENsaUV4dGVuc2lvbiA9IChwcm9ncmFtKSA9PiB7XG5cbiAgY29uc3QgZ2VuQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuIDxwYXRoPicpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSBzYW1wbGUgcGFja2FnZScpXG4gIC5vcHRpb24oJy0tY29tcCA8bmFtZT4nLCAnU2FtcGxlIGNvbXBvbmVudCBuYW1lJywgJ1NhbXBsZScpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcpID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nZW4nKSkuZ2VuUGFja2FnZShkaXIsIGdlbkNtZC5vcHRzKCkuY29tcCwgZ2VuQ21kLm9wdHMoKS5kcnlSdW4pO1xuICB9KTtcblxuICBjb25zdCBnZW5Db21wQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLWNvbXAgPGRpcj4gPGNvbXBvbmVudE5hbWUuLi4+JylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBzYW1wbGUgY29tcG9uZW50cycpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIGNvbXBOYW1lczogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nZW4nKSkuZ2VuQ29tcG9uZW50cyhkaXIsIGNvbXBOYW1lcywgZ2VuQ29tcENtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgfSk7XG4gIGdlbkNvbXBDbWQudXNhZ2UoZ2VuQ29tcENtZC51c2FnZSgpICsgJ1xcbmUuZy5cXG4gIHBsaW5rIGNyYS1jb21wIC4uL3BhY2thZ2VzL2Zvb2Jhci9jb21wb25lbnRzIFRvb2xiYXIgTGF5b3V0IFByb2ZpbGUnKTtcblxuICBjb25zdCBnZW5TbGljZUNtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWdlbi1zbGljZSA8ZGlyPiA8c2xpY2VOYW1lLi4uPicpXG4gIC5kZXNjcmlwdGlvbignR2VuZXJhdGUgYSBzYW1wbGUgUmVkdXgtdG9vbGtpdCBTbGljZSBmaWxlICh3aXRoIFJlZHV4LW9ic2VydmFibGUgZXBpYyknKVxuICAub3B0aW9uKCctZCwgLS1kcnktcnVuJywgJ0RvIG5vdCBnZW5lcmF0ZSBmaWxlcywganVzdCBsaXN0IG5ldyBmaWxlIG5hbWVzJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKGRpcjogc3RyaW5nLCBzbGljZU5hbWU6IHN0cmluZ1tdKSA9PiB7XG4gICAgKGF3YWl0IGltcG9ydCgnLi9jbGktZ2VuJykpLmdlblNsaWNlKGRpciwgc2xpY2VOYW1lLCBnZW5TbGljZUNtZC5vcHRzKCkuZHJ5UnVuKTtcbiAgfSk7XG4gIC8vIHdpdGhHbG9iYWxPcHRpb25zKGdlblNsaWNlQ21kKTtcblxuICBjb25zdCBidWlsZENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkIDxhcHB8bGliPiA8cGFja2FnZS1uYW1lPicpXG4gIC5kZXNjcmlwdGlvbignQ29tcGlsZSByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5LCA8cGFja2FnZS1uYW1lPiBpcyB0aGUgdGFyZ2V0IHBhY2thZ2UgbmFtZSxcXG4nICtcbiAgICAnYXJndW1lbnQgXCJhcHBcIiBmb3IgYnVpbGRpbmcgYSBjb21wbGV0ZSBhcHBsaWNhdGlvbiBsaWtlIGNyZWF0ZS1yZWFjdC1hcHAsXFxuJyArXG4gICAgJ2FyZ3VtZW50IFwibGliXCIgZm9yIGJ1aWxkaW5nIGEgbGlicmFyeScpXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ1doZW4gYnVpbGQgYSBsaWJyYXJ5LCB3YXRjaCBmaWxlIGNoYW5nZXMgYW5kIGNvbXBpbGUnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLWksIC0taW5jbHVkZSA8bW9kdWxlLXBhdGgtcmVnZXg+JyxcbiAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgZXh0ZXJuYWwgcHJvcGVydHkgb2YgV2VicGFjayBjb25maWd1cmF0aW9uIGZvciBhbGwgcmVxdWVzdCBub3QgYmVnaW4gd2l0aCBcIi5cIiAoZXhjZXB0IFwiQGJhYmVsL3J1bnRpbWVyXCIpLCAnICtcbiAgJ21lYW5pbmcgYWxsIGV4dGVybmFsIG1vZHVsZXMgd2lsbCBub3QgYmUgaW5jbHVkZWQgaW4gdGhlIG91dHB1dCBidW5kbGUgZmlsZSwgeW91IG5lZWQgdG8gZXhwbGljaXRseSBwcm92aWRlIGEgbGlzdCBpbicgK1xuICAnIFJlZ3VsYXIgZXhwcmVzc2lvbiAoZS5nLiAtaSBcIl5zb21lTGliLz9cIiAtaSBcIl5zb21lTGliMi8/XCIgLWkgLi4uKSB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgLm9wdGlvbignLS1zb3VyY2UtbWFwJywgJ3NldCBlbnZpcm9ubWVudCB2YXJpYWJsZSBHRU5FUkFURV9TT1VSQ0VNQVAgdG8gXCJ0cnVlXCIgKHNlZSBodHRwczovL2NyZWF0ZS1yZWFjdC1hcHAuZGV2L2RvY3MvYWR2YW5jZWQtY29uZmlndXJhdGlvbicsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jICh0eXBlLCBwa2dOYW1lKSA9PiB7XG4gICAgYXdhaXQgaW5pdEV2ZXJ5dGhpbmcoYnVpbGRDbWQsIHR5cGUsIHBrZ05hbWUpO1xuICAgIGlmIChidWlsZENtZC5vcHRzKCkuc291cmNlTWFwKSB7XG4gICAgICBwbGluay5sb2dnZXIuaW5mbygnc291cmNlIG1hcCBpcyBlbmFibGVkJyk7XG4gICAgICBwcm9jZXNzLmVudi5HRU5FUkFURV9TT1VSQ0VNQVAgPSAndHJ1ZSc7XG4gICAgfVxuICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9idWlsZCcpO1xuICB9KTtcbiAgd2l0aENsaWNPcHQoYnVpbGRDbWQpO1xuXG4gIGNvbnN0IFN0YXJ0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtc3RhcnQgPHBhY2thZ2UtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5LCA8cGFja2FnZS1uYW1lPiBpcyB0aGUgdGFyZ2V0IHBhY2thZ2UgbmFtZScpXG4gIC5hY3Rpb24oYXN5bmMgKHBrZ05hbWUpID0+IHtcbiAgICBhd2FpdCBpbml0RXZlcnl0aGluZyhTdGFydENtZCwgJ2FwcCcsIHBrZ05hbWUpO1xuICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9zdGFydCcpO1xuICB9KTtcbiAgd2l0aENsaWNPcHQoU3RhcnRDbWQpO1xuXG4gIC8vIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1pbml0JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbml0aWFsIHdvcmtzcGFjZSBmaWxlcyBiYXNlZCBvbiBmaWxlcyB3aGljaCBhcmUgbmV3bHkgZ2VuZXJhdGVkIGJ5IGNyZWF0ZS1yZWFjdC1hcHAnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICBjb25zdCBvcHQ6IEdsb2JhbE9wdGlvbnMgPSB7cHJvcDogW10sIGNvbmZpZzogW119O1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyhvcHQpO1xuICAvLyAgIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICAvLyB9KTtcbiAgLy8gLy8gd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHlzZSBbd2VicGNrLW91dHB1dC1wYXRoXScpXG4gIC5kZXNjcmlwdGlvbignUnVuIHNvdXJjZS1tYXAtZXhwbG9yZXInKVxuICAuYWN0aW9uKGFzeW5jIChvdXRwdXRQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBzbWVQa2dEaXIgPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdzb3VyY2UtbWFwLWV4cGxvcmVyL3BhY2thZ2UuanNvbicpKTtcbiAgICBjb25zdCBzbWVCaW46IHN0cmluZyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHNtZVBrZ0RpciwgJ3BhY2thZ2UuanNvbicpKS5iaW5bJ3NvdXJjZS1tYXAtZXhwbG9yZXInXTtcblxuICAgIGF3YWl0IG5ldyBQcm9taXNlPGFueT4oKHJlc29sdmUsIHJlaikgPT4ge1xuICAgICAgY29uc3QgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsIHNtZUJpbiksIFtcbiAgICAgICAgJy0tZ3ppcCcsICctLW5vLXJvb3QnLFxuICAgICAgICBQYXRoLnJlc29sdmUoJ3N0YXRpY0RpcicsIG91dHB1dFBhdGggPyBvdXRwdXRQYXRoIDogJycsICdzdGF0aWMvanMvKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKHNpZ24sIGNvZGUpID0+IHtyZXNvbHZlKGNvZGUpO30pO1xuICAgIH0pO1xuICB9KTtcbiAgLy8gc21lQ21kLnVzYWdlKHNtZUNtZC51c2FnZSgpICsgJ1xcbiAgYXBwLWJhc2UtcGF0aDogJylcbn07XG5cbmZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsIHVuZGVmaW5lZCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5T3B0aW9uRm4oY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0RXZlcnl0aGluZyhidWlsZENtZDogY29tbWFuZGVyLkNvbW1hbmQsIHR5cGU6ICdhcHAnIHwgJ2xpYicsIHBrZ05hbWU6IHN0cmluZykge1xuICAvLyBjb25zdCBjZmcgPSBhd2FpdCBpbml0Q29uZmlnQXN5bmMoYnVpbGRDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICBjb25zdCBjZmcgPSBjb25maWc7XG4gIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICBzYXZlQ21kT3B0aW9uc1RvRW52KHBrZ05hbWUsIGJ1aWxkQ21kLCB0eXBlKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBPUlQgPT0gbnVsbCAmJiBjZmcoKS5wb3J0KVxuICAgIHByb2Nlc3MuZW52LlBPUlQgPSBjZmcoKS5wb3J0ICsgJyc7XG4gIC8vIGF3YWl0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IocHJvY2Vzcy5lbnYuUFVCTElDX1VSTCB8fCAnLycpO1xuICBpZiAoIVsnYXBwJywgJ2xpYiddLmluY2x1ZGVzKHR5cGUpKSB7XG5cbiAgICBwbGluay5sb2dnZXIuZXJyb3IoYHR5cGUgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgXCIke1snYXBwJywgJ2xpYiddfVwiYCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByZWxvYWQ6IHR5cGVvZiBfcHJlbG9hZCA9IHJlcXVpcmUoJy4uL3ByZWxvYWQnKTtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==