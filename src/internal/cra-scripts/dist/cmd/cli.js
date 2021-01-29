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
const plink_1 = require("@wfh/plink");
// import {ObjectAst} from '@wfh/plink/wfh/dist/utils/json-sync-parser';
const log = log4js_1.default.getLogger('cra');
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
        // const cfg = await initConfigAsync(buildCmd.opts() as GlobalOptions);
        const cfg = plink_1.config;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsOENBQW9EO0FBQ3BELGlEQUFtQztBQUNuQyxxRkFBcUY7QUFDckYsb0RBQTRCO0FBRzVCLHNDQUFrQztBQUNsQyx3RUFBd0U7QUFDeEUsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFcEMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFFcEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztTQUMvQyxXQUFXLENBQUMsMkJBQTJCLENBQUM7U0FDeEMsTUFBTSxDQUFDLGVBQWUsRUFBRSx1QkFBdUIsRUFBRSxRQUFRLENBQUM7U0FDMUQsTUFBTSxDQUFDLGVBQWUsRUFBRSxpREFBaUQsRUFBRSxLQUFLLENBQUM7U0FDakYsTUFBTSxDQUFDLENBQU8sR0FBVyxFQUFFLEVBQUU7UUFDNUIsQ0FBQyx3REFBYSxXQUFXLEdBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDeEYsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVILE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsdUNBQXVDLENBQUM7U0FDMUUsV0FBVyxDQUFDLDRCQUE0QixDQUFDO1NBQ3pDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsaURBQWlELEVBQUUsS0FBSyxDQUFDO1NBQ2pGLE1BQU0sQ0FBQyxDQUFPLEdBQVcsRUFBRSxTQUFtQixFQUFFLEVBQUU7UUFDakQsQ0FBQyx3REFB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Q0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQVksRUFBRSxJQUEwQjtJQUM3RCxJQUFJLElBQUk7UUFDTixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQWUsY0FBYyxDQUFDLFFBQTJCLEVBQUUsSUFBbUIsRUFBRSxPQUFlOztRQUM3Rix1RUFBdUU7UUFDdkUsTUFBTSxHQUFHLEdBQUcsY0FBTSxDQUFDO1FBQ25CLHdCQUF3QjtRQUN4QiwyQkFBbUIsQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUk7WUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNyQyxxRUFBcUU7UUFDckUsSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUVsQyxHQUFHLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUQsT0FBTztTQUNSO1FBQ0QsTUFBTSxPQUFPLEdBQW9CLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN2RCxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDaEIsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9uLCBHbG9iYWxPcHRpb25zfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC90eXBlcyc7XG4vLyBpbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQge3NhdmVDbWRPcHRpb25zVG9FbnZ9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7aW5pdENvbmZpZ0FzeW5jfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvaW5pdEluamVjdG9ycyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQge2luaXRUc2NvbmZpZ30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCB7T2JqZWN0QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL2pzb24tc3luYy1wYXJzZXInO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignY3JhJyk7XG5cbmNvbnN0IGNsaTogQ2xpRXh0ZW5zaW9uID0gKHByb2dyYW0pID0+IHtcblxuICBjb25zdCBnZW5DbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4gPHBhdGg+JylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIHNhbXBsZSBwYWNrYWdlJylcbiAgLm9wdGlvbignLS1jb21wIDxuYW1lPicsICdTYW1wbGUgY29tcG9uZW50IG5hbWUnLCAnU2FtcGxlJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZykgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbicpKS5nZW5QYWNrYWdlKGRpciwgZ2VuQ21kLm9wdHMoKS5jb21wLCBnZW5DbWQub3B0cygpLmRyeVJ1bik7XG4gIH0pO1xuXG4gIGNvbnN0IGdlbkNvbXBDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1nZW4tY29tcCA8ZGlyPiA8Y29tcG9uZW50TmFtZS4uLj4nKVxuICAuZGVzY3JpcHRpb24oJ0dlbmVyYXRlIHNhbXBsZSBjb21wb25lbnRzJylcbiAgLm9wdGlvbignLWQsIC0tZHJ5LXJ1bicsICdEbyBub3QgZ2VuZXJhdGUgZmlsZXMsIGp1c3QgbGlzdCBuZXcgZmlsZSBuYW1lcycsIGZhbHNlKVxuICAuYWN0aW9uKGFzeW5jIChkaXI6IHN0cmluZywgY29tcE5hbWVzOiBzdHJpbmdbXSkgPT4ge1xuICAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWdlbicpKS5nZW5Db21wb25lbnRzKGRpciwgY29tcE5hbWVzLCBnZW5Db21wQ21kLm9wdHMoKS5kcnlSdW4pO1xuICB9KTtcbiAgZ2VuQ29tcENtZC51c2FnZShnZW5Db21wQ21kLnVzYWdlKCkgKyAnXFxuZS5nLlxcbiAgcGxpbmsgY3JhLWNvbXAgLi4vcGFja2FnZXMvZm9vYmFyL2NvbXBvbmVudHMgVG9vbGJhciBMYXlvdXQgUHJvZmlsZScpO1xuXG4gIGNvbnN0IGdlblNsaWNlQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZ2VuLXNsaWNlIDxkaXI+IDxzbGljZU5hbWUuLi4+JylcbiAgLmRlc2NyaXB0aW9uKCdHZW5lcmF0ZSBhIHNhbXBsZSBSZWR1eC10b29sa2l0IFNsaWNlIGZpbGUgKHdpdGggUmVkdXgtb2JzZXJ2YWJsZSBlcGljKScpXG4gIC5vcHRpb24oJy1kLCAtLWRyeS1ydW4nLCAnRG8gbm90IGdlbmVyYXRlIGZpbGVzLCBqdXN0IGxpc3QgbmV3IGZpbGUgbmFtZXMnLCBmYWxzZSlcbiAgLmFjdGlvbihhc3luYyAoZGlyOiBzdHJpbmcsIHNsaWNlTmFtZTogc3RyaW5nW10pID0+IHtcbiAgICAoYXdhaXQgaW1wb3J0KCcuL2NsaS1nZW4nKSkuZ2VuU2xpY2UoZGlyLCBzbGljZU5hbWUsIGdlblNsaWNlQ21kLm9wdHMoKS5kcnlSdW4pO1xuICB9KTtcbiAgLy8gd2l0aEdsb2JhbE9wdGlvbnMoZ2VuU2xpY2VDbWQpO1xuXG4gIGNvbnN0IGJ1aWxkQ21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQgPGFwcHxsaWI+IDxwYWNrYWdlLW5hbWU+JylcbiAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnksIDxwYWNrYWdlLW5hbWU+IGlzIHRoZSB0YXJnZXQgcGFja2FnZSBuYW1lLFxcbicgK1xuICAgICdhcmd1bWVudCBcImFwcFwiIGZvciBidWlsZGluZyBhIGNvbXBsZXRlIGFwcGxpY2F0aW9uIGxpa2UgY3JlYXRlLXJlYWN0LWFwcCxcXG4nICtcbiAgICAnYXJndW1lbnQgXCJsaWJcIiBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JylcbiAgLm9wdGlvbignLXcsIC0td2F0Y2gnLCAnV2hlbiBidWlsZCBhIGxpYnJhcnksIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAub3B0aW9uKCctLWRldicsICdzZXQgTk9ERV9FTlYgdG8gXCJkZXZlbG9wbWVudFwiLCBlbmFibGUgcmVhY3Qtc2NyaXB0cyBpbiBkZXYgbW9kZScsIGZhbHNlKVxuICAub3B0aW9uKCctaSwgLS1pbmNsdWRlIDxtb2R1bGUtcGF0aC1yZWdleD4nLFxuICAnKG11bHRpcGxlIHZhbHVlKSwgd2hlbiBhcmd1bWVudCBpcyBcImxpYlwiLCB3ZSB3aWxsIHNldCBleHRlcm5hbCBwcm9wZXJ0eSBvZiBXZWJwYWNrIGNvbmZpZ3VyYXRpb24gZm9yIGFsbCByZXF1ZXN0IG5vdCBiZWdpbiB3aXRoIFwiLlwiIChleGNlcHQgXCJAYmFiZWwvcnVudGltZXJcIiksICcgK1xuICAnbWVhbmluZyBhbGwgZXh0ZXJuYWwgbW9kdWxlcyB3aWxsIG5vdCBiZSBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IGJ1bmRsZSBmaWxlLCB5b3UgbmVlZCB0byBleHBsaWNpdGx5IHByb3ZpZGUgYSBsaXN0IGluJyArXG4gICcgUmVndWxhciBleHByZXNzaW9uIChlLmcuIC1pIFwiXnNvbWVMaWIvP1wiIC1pIFwiXnNvbWVMaWIyLz9cIiAtaSAuLi4pIHRvIG1ha2UgdGhlbSBiZSBpbmNsdWRlZCBpbiBidW5kbGUgZmlsZScsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHR5cGUsIHBrZ05hbWUpID0+IHtcbiAgICBhd2FpdCBpbml0RXZlcnl0aGluZyhidWlsZENtZCwgdHlwZSwgcGtnTmFtZSk7XG4gICAgaWYgKGJ1aWxkQ21kLm9wdHMoKS5zb3VyY2VNYXApIHtcbiAgICAgIGxvZy5pbmZvKCdzb3VyY2UgbWFwIGlzIGVuYWJsZWQnKTtcbiAgICAgIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICd0cnVlJztcbiAgICB9XG4gICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gIH0pO1xuICB3aXRoQ2xpY09wdChidWlsZENtZCk7XG5cbiAgY29uc3QgU3RhcnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1zdGFydCA8cGFja2FnZS1uYW1lPicpXG4gIC5kZXNjcmlwdGlvbignUnVuIENSQSBzdGFydCBzY3JpcHQgZm9yIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnksIDxwYWNrYWdlLW5hbWU+IGlzIHRoZSB0YXJnZXQgcGFja2FnZSBuYW1lJylcbiAgLmFjdGlvbihhc3luYyAocGtnTmFtZSkgPT4ge1xuICAgIGF3YWl0IGluaXRFdmVyeXRoaW5nKFN0YXJ0Q21kLCAnYXBwJywgcGtnTmFtZSk7XG4gICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL3N0YXJ0Jyk7XG4gIH0pO1xuICB3aXRoQ2xpY09wdChTdGFydENtZCk7XG5cbiAgLy8gY29uc3QgaW5pdENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWluaXQnKVxuICAvLyAuZGVzY3JpcHRpb24oJ0luaXRpYWwgd29ya3NwYWNlIGZpbGVzIGJhc2VkIG9uIGZpbGVzIHdoaWNoIGFyZSBuZXdseSBnZW5lcmF0ZWQgYnkgY3JlYXRlLXJlYWN0LWFwcCcpXG4gIC8vIC5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAvLyAgIGNvbnN0IG9wdDogR2xvYmFsT3B0aW9ucyA9IHtwcm9wOiBbXSwgY29uZmlnOiBbXX07XG4gIC8vICAgYXdhaXQgaW5pdENvbmZpZ0FzeW5jKG9wdCk7XG4gIC8vICAgLy8gYXdhaXQgaW5pdFRzY29uZmlnKCk7XG4gIC8vIH0pO1xuICAvLyAvLyB3aXRoR2xvYmFsT3B0aW9ucyhpbml0Q21kKTtcblxuICBjb25zdCBzbWVDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1hbmFseXNlIFt3ZWJwY2stb3V0cHV0LXBhdGhdJylcbiAgLmRlc2NyaXB0aW9uKCdSdW4gc291cmNlLW1hcC1leHBsb3JlcicpXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IGluaXRDb25maWdBc3luYyhzbWVDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIGNvbnN0IHNtZUJpbjogc3RyaW5nID0gcmVxdWlyZShQYXRoLnJlc29sdmUoc21lUGtnRGlyLCAncGFja2FnZS5qc29uJykpLmJpblsnc291cmNlLW1hcC1leHBsb3JlciddO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZSgnc3RhdGljRGlyJywgb3V0cHV0UGF0aCA/IG91dHB1dFBhdGggOiAnJywgJ3N0YXRpYy9qcy8qLmpzJylcbiAgICAgIF0sIHtzdGRpbzogWydpbmhlcml0JywgJ2luaGVyaXQnLCAnaW5oZXJpdCcsICdpcGMnXX0pO1xuICAgICAgY3Aub24oJ2Vycm9yJywgZXJyID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihlcnIpO1xuICAgICAgICByZWooZXJyKTtcbiAgICAgIH0pO1xuICAgICAgY3Aub24oJ2V4aXQnLCAoc2lnbiwgY29kZSkgPT4ge3Jlc29sdmUoY29kZSk7fSk7XG4gICAgfSk7XG4gIH0pO1xuICAvLyBzbWVDbWQudXNhZ2Uoc21lQ21kLnVzYWdlKCkgKyAnXFxuICBhcHAtYmFzZS1wYXRoOiAnKVxufTtcblxuZnVuY3Rpb24gd2l0aENsaWNPcHQoY21kOiBjb21tYW5kZXIuQ29tbWFuZCkge1xuICBjbWRcbiAgLy8gLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbiAgLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsIHVuZGVmaW5lZCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5T3B0aW9uRm4oY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0RXZlcnl0aGluZyhidWlsZENtZDogY29tbWFuZGVyLkNvbW1hbmQsIHR5cGU6ICdhcHAnIHwgJ2xpYicsIHBrZ05hbWU6IHN0cmluZykge1xuICAvLyBjb25zdCBjZmcgPSBhd2FpdCBpbml0Q29uZmlnQXN5bmMoYnVpbGRDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICBjb25zdCBjZmcgPSBjb25maWc7XG4gIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICBzYXZlQ21kT3B0aW9uc1RvRW52KHBrZ05hbWUsIGJ1aWxkQ21kLCB0eXBlKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBPUlQgPT0gbnVsbCAmJiBjZmcoKS5wb3J0KVxuICAgIHByb2Nlc3MuZW52LlBPUlQgPSBjZmcoKS5wb3J0ICsgJyc7XG4gIC8vIGF3YWl0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IocHJvY2Vzcy5lbnYuUFVCTElDX1VSTCB8fCAnLycpO1xuICBpZiAoIVsnYXBwJywgJ2xpYiddLmluY2x1ZGVzKHR5cGUpKSB7XG5cbiAgICBsb2cuZXJyb3IoYHR5cGUgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgXCIke1snYXBwJywgJ2xpYiddfVwiYCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByZWxvYWQ6IHR5cGVvZiBfcHJlbG9hZCA9IHJlcXVpcmUoJy4uL3ByZWxvYWQnKTtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==