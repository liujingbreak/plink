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
        // .option('--tsd-only', 'In "lib" mode (building a library), only build out Typescript tsd file')
        // .option('--dev', 'set NODE_ENV to "development", enable react-scripts in dev mode', false)
        // .option('-e, --external <module-path-regex>',
        // '(multiple value), when argument is "lib", by default we will set "external" property of Webpack configuration for ' +
        //   'all request that does not begin with "." (not relative path) or contains "?!" character,' +
        //   ' meaning all non-relative modules will not be included in the output bundle file. ' +
        //   'To change this behavior, you can explicitly provide a list of "external" module name with this option, in form of regular expression, ' +
        //   '(e.g. -e "^react(/|$)" -e "^react-dom(/|$)"),  to make nothing "external": -e "^$" (any RegExp that never matches)', (value, prev) => { prev.push(value); return prev;}, [] as string[])
        .option('-i, --include <module-path-regex>', '(multiple value), when argument is "lib", we will set "external" property of Webpack configuration for all request not begin with "." (not relative path), ' +
        'meaning all non-relative modules will not be included in the output bundle file, you need to explicitly provide a list in' +
        ' Regular expression (e.g. -i \'^someLib(/|$)\' -i \'^someLib2(/|$)\' -i ...) ' +
        ' to make them be included in bundle file. To make specific module (React) external: -i \'^(?!react(-dom)?($|\/))\'', arrayOptionFn, [])
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFrQztBQUNsQyxzREFBNEI7QUFDNUIseUVBQXlFO0FBRXpFLE1BQU0sR0FBRyxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7U0FDckUsV0FBVyxDQUFDLDBFQUEwRSxFQUFDO1FBQ3RGLFNBQVMsRUFBRSwyRUFBMkU7WUFDcEYscUNBQXFDO1FBQ3ZDLGNBQWMsRUFBRSwyREFBMkQ7S0FDNUUsQ0FBQztTQUNELE1BQU0sQ0FBQyxhQUFhLEVBQUUsd0RBQXdELEVBQUUsS0FBSyxDQUFDO1FBQ3ZGLGtHQUFrRztRQUNsRyw2RkFBNkY7UUFDN0YsZ0RBQWdEO1FBQ2hELHlIQUF5SDtRQUN6SCxpR0FBaUc7UUFDakcsMkZBQTJGO1FBQzNGLCtJQUErSTtRQUMvSSw4TEFBOEw7U0FDN0wsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyw2SkFBNko7UUFDN0osMkhBQTJIO1FBQzNILCtFQUErRTtRQUMvRSxvSEFBb0gsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3ZJLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUhBQXFILEVBQUUsS0FBSyxDQUFDO1NBQ3BKLE1BQU0sQ0FBQyxDQUFPLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUM5QixNQUFNLGNBQWMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLElBQUksUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRTtZQUM3QixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENB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QUksQ0FBQyxFQUFFO1lBRWxDLGlCQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZFLE9BQU87U0FDUjtRQUNELE1BQU0sT0FBTyxHQUFvQixPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdkQsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FBQSIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQge0NsaUV4dGVuc2lvbn0gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQgcmVwbGFjZVBhdGNoZXMsIHsgUmVwbGFjZW1lbnRJbmYgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY29tbWFuZGVyIGZyb20gJ0NvbW1hbmRlcic7XG5pbXBvcnQge3NhdmVDbWRPcHRpb25zVG9FbnZ9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG4vLyBpbXBvcnQgd2Fsa1BhY2thZ2VzQW5kU2V0dXBJbmplY3RvciBmcm9tICdAd2ZoL3dlYnBhY2stY29tbW9uL2Rpc3QvaW5pdEluamVjdG9ycyc7XG4vLyBpbXBvcnQge2luaXRUc2NvbmZpZ30gZnJvbSAnLi9jbGktaW5pdCc7XG5pbXBvcnQgKiBhcyBfcHJlbG9hZCBmcm9tICcuLi9wcmVsb2FkJztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCBwbGluayBmcm9tICdfX3BsaW5rJztcbi8vIGltcG9ydCB7T2JqZWN0QXN0fSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaSBzdC91dGlscy9qc29uLXN5bmMtcGFyc2VyJztcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBidWlsZENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkIDxhcHB8bGliPiA8cGFja2FnZS1uYW1lPicpXG4gIC5kZXNjcmlwdGlvbignQ29tcGlsZSByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJyx7XG4gICAgJ2FwcHxsaWInOiAnXCJhcHBcIiBzdGFuZHMgZm9yIGJ1aWxkaW5nIGEgY29tcGxldGUgYXBwbGljYXRpb24gbGlrZSBjcmVhdGUtcmVhY3QtYXBwLFxcbicgK1xuICAgICAgJ1wibGliXCIgc3RhbmRzIGZvciBidWlsZGluZyBhIGxpYnJhcnknLFxuICAgICdwYWNrYWdlLW5hbWUnOiAndGFyZ2V0IHBhY2thZ2UgbmFtZSwgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQnXG4gIH0pXG4gIC5vcHRpb24oJy13LCAtLXdhdGNoJywgJ3doZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2F0Y2ggZmlsZSBjaGFuZ2VzIGFuZCBjb21waWxlJywgZmFsc2UpXG4gIC8vIC5vcHRpb24oJy0tdHNkLW9ubHknLCAnSW4gXCJsaWJcIiBtb2RlIChidWlsZGluZyBhIGxpYnJhcnkpLCBvbmx5IGJ1aWxkIG91dCBUeXBlc2NyaXB0IHRzZCBmaWxlJylcbiAgLy8gLm9wdGlvbignLS1kZXYnLCAnc2V0IE5PREVfRU5WIHRvIFwiZGV2ZWxvcG1lbnRcIiwgZW5hYmxlIHJlYWN0LXNjcmlwdHMgaW4gZGV2IG1vZGUnLCBmYWxzZSlcbiAgLy8gLm9wdGlvbignLWUsIC0tZXh0ZXJuYWwgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gIC8vICcobXVsdGlwbGUgdmFsdWUpLCB3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIGJ5IGRlZmF1bHQgd2Ugd2lsbCBzZXQgXCJleHRlcm5hbFwiIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgJyArXG4gIC8vICAgJ2FsbCByZXF1ZXN0IHRoYXQgZG9lcyBub3QgYmVnaW4gd2l0aCBcIi5cIiAobm90IHJlbGF0aXZlIHBhdGgpIG9yIGNvbnRhaW5zIFwiPyFcIiBjaGFyYWN0ZXIsJyArXG4gIC8vICAgJyBtZWFuaW5nIGFsbCBub24tcmVsYXRpdmUgbW9kdWxlcyB3aWxsIG5vdCBiZSBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IGJ1bmRsZSBmaWxlLiAnICtcbiAgLy8gICAnVG8gY2hhbmdlIHRoaXMgYmVoYXZpb3IsIHlvdSBjYW4gZXhwbGljaXRseSBwcm92aWRlIGEgbGlzdCBvZiBcImV4dGVybmFsXCIgbW9kdWxlIG5hbWUgd2l0aCB0aGlzIG9wdGlvbiwgaW4gZm9ybSBvZiByZWd1bGFyIGV4cHJlc3Npb24sICcgK1xuICAvLyAgICcoZS5nLiAtZSBcIl5yZWFjdCgvfCQpXCIgLWUgXCJecmVhY3QtZG9tKC98JClcIiksICB0byBtYWtlIG5vdGhpbmcgXCJleHRlcm5hbFwiOiAtZSBcIl4kXCIgKGFueSBSZWdFeHAgdGhhdCBuZXZlciBtYXRjaGVzKScsICh2YWx1ZSwgcHJldikgPT4geyBwcmV2LnB1c2godmFsdWUpOyByZXR1cm4gcHJldjt9LCBbXSBhcyBzdHJpbmdbXSlcbiAgLm9wdGlvbignLWksIC0taW5jbHVkZSA8bW9kdWxlLXBhdGgtcmVnZXg+JyxcbiAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgXCJleHRlcm5hbFwiIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKG5vdCByZWxhdGl2ZSBwYXRoKSwgJyArXG4gICdtZWFuaW5nIGFsbCBub24tcmVsYXRpdmUgbW9kdWxlcyB3aWxsIG5vdCBiZSBpbmNsdWRlZCBpbiB0aGUgb3V0cHV0IGJ1bmRsZSBmaWxlLCB5b3UgbmVlZCB0byBleHBsaWNpdGx5IHByb3ZpZGUgYSBsaXN0IGluJyArXG4gICcgUmVndWxhciBleHByZXNzaW9uIChlLmcuIC1pIFxcJ15zb21lTGliKC98JClcXCcgLWkgXFwnXnNvbWVMaWIyKC98JClcXCcgLWkgLi4uKSAnICtcbiAgJyB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUuIFRvIG1ha2Ugc3BlY2lmaWMgbW9kdWxlIChSZWFjdCkgZXh0ZXJuYWw6IC1pIFxcJ14oPyFyZWFjdCgtZG9tKT8oJHxcXC8pKVxcJycsIGFycmF5T3B0aW9uRm4sIFtdKVxuICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gIC5hY3Rpb24oYXN5bmMgKHR5cGUsIHBrZ05hbWUpID0+IHtcbiAgICBhd2FpdCBpbml0RXZlcnl0aGluZyhidWlsZENtZCwgdHlwZSwgcGtnTmFtZSk7XG4gICAgaWYgKGJ1aWxkQ21kLm9wdHMoKS5zb3VyY2VNYXApIHtcbiAgICAgIHBsaW5rLmxvZ2dlci5pbmZvKCdzb3VyY2UgbWFwIGlzIGVuYWJsZWQnKTtcbiAgICAgIHByb2Nlc3MuZW52LkdFTkVSQVRFX1NPVVJDRU1BUCA9ICd0cnVlJztcbiAgICB9XG4gICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gIH0pO1xuICB3aXRoQ2xpY09wdChidWlsZENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYnVpbGQtdHNkIDxwYWNrYWdlLW5hbWU+JylcbiAgICAuZGVzY3JpcHRpb24oJ0NvbXBpbGUgcGFja2FnZXMgZm9yIG9ubHkgZ2VuZXJhdGluZyBUeXBlc2NyaXB0IGRlZmluaXRpb24gZmlsZXMuIElmIHlvdSBhcmUgY3JlYXRpbmcgYSBsaWJyYXJ5LCAnICtcbiAgICAgICdjb21tYW5kIFwiY3JhLWJ1aWxkXCIgd2lsbCBhbHNvIGdlbmVyYXRlIHRzZCBmaWxlIGFsb25nIHdpdGggY2xpZW50IGJ1bmRsZScsIHtcbiAgICAgICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgICAgIH0pXG4gICAgLmFjdGlvbihhc3luYyBwa2dOYW1lID0+IHtcbiAgICAgIGF3YWl0IGluaXRFdmVyeXRoaW5nKFN0YXJ0Q21kLCAnbGliJywgcGtnTmFtZSk7XG4gICAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi90c2QtZ2VuZXJhdGUnKSkuYnVpbGRUc2QoW3BrZ05hbWVdKTtcbiAgICB9KTtcblxuXG4gIGNvbnN0IFN0YXJ0Q21kID0gcHJvZ3JhbS5jb21tYW5kKCdjcmEtc3RhcnQgPHBhY2thZ2UtbmFtZT4nKVxuICAuZGVzY3JpcHRpb24oJ1J1biBDUkEgc3RhcnQgc2NyaXB0IGZvciByZWFjdCBhcHBsaWNhdGlvbiBvciBsaWJyYXJ5ICh3b3JrIHdpdGggY3JlYXRlLXJlYWN0LWFwcCB2NC4wLjMpJyx7XG4gICAgJ3BhY2thZ2UtbmFtZSc6ICd0YXJnZXQgcGFja2FnZSBuYW1lLCB0aGUgXCJzY29wZVwiIG5hbWUgcGFydCBjYW4gYmUgb21pdHRlZCdcbiAgfSlcbiAgLmFjdGlvbihhc3luYyAocGtnTmFtZSkgPT4ge1xuICAgIGF3YWl0IGluaXRFdmVyeXRoaW5nKFN0YXJ0Q21kLCAnYXBwJywgcGtnTmFtZSk7XG4gICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL3N0YXJ0Jyk7XG4gIH0pO1xuICB3aXRoQ2xpY09wdChTdGFydENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtb3BlbiA8dXJsPicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gcmVhY3QtZGV2LXV0aWxzL29wZW5Ccm93c2VyJywge3VybDogJ1VSTCd9KVxuICAgIC5hY3Rpb24oYXN5bmMgdXJsID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4uL2NyYS1vcGVuLWJyb3dzZXInKSkuZGVmYXVsdCh1cmwpO1xuICAgIH0pO1xuXG4gIC8vIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1pbml0JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbml0aWFsIHdvcmtzcGFjZSBmaWxlcyBiYXNlZCBvbiBmaWxlcyB3aGljaCBhcmUgbmV3bHkgZ2VuZXJhdGVkIGJ5IGNyZWF0ZS1yZWFjdC1hcHAnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICBjb25zdCBvcHQ6IEdsb2JhbE9wdGlvbnMgPSB7cHJvcDogW10sIGNvbmZpZzogW119O1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyhvcHQpO1xuICAvLyAgIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICAvLyB9KTtcbiAgLy8gLy8gd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHl6ZSBbanMtZGlyXScpXG4gIC5hbGlhcygnY3JhLWFuYWx5c2UnKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJywge1xuICAgICdqcy1kaXInOiAnTm9ybWFsbHkgdGhpcyBwYXRoIHNob3VsZCBiZSA8cm9vdC1kaXI+ZGlzdC9zdGF0aWMvPG91dHB1dC1wYXRoLWJhc2VuYW1lPi9zdGF0aWMvanMnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIGNvbnN0IHNtZUJpbjogc3RyaW5nID0gcmVxdWlyZShQYXRoLnJlc29sdmUoc21lUGtnRGlyLCAncGFja2FnZS5qc29uJykpLmJpblsnc291cmNlLW1hcC1leHBsb3JlciddO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZShvdXRwdXRQYXRoID8gb3V0cHV0UGF0aCA6ICcnLCAnKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKHNpZ24sIGNvZGUpID0+IHtyZXNvbHZlKGNvZGUpO30pO1xuICAgIH0pO1xuICB9KTtcbiAgLy8gc21lQ21kLnVzYWdlKHNtZUNtZC51c2FnZSgpICsgJ1xcbiAgYXBwLWJhc2UtcGF0aDogJylcbn07XG5cbmZ1bmN0aW9uIHdpdGhDbGljT3B0KGNtZDogY29tbWFuZGVyLkNvbW1hbmQpIHtcbiAgY21kLm9wdGlvbignLS1wdXJsLCAtLXB1YmxpY1VybCA8c3RyaW5nPicsICdzZXQgZW52aXJvbm1lbnQgdmFyaWFibGUgUFVCTElDX1VSTCBmb3IgcmVhY3Qtc2NyaXB0cycsIHVuZGVmaW5lZCk7XG59XG5cbmZ1bmN0aW9uIGFycmF5T3B0aW9uRm4oY3Vycjogc3RyaW5nLCBwcmV2OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCkge1xuICBpZiAocHJldilcbiAgICBwcmV2LnB1c2goY3Vycik7XG4gIHJldHVybiBwcmV2O1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0RXZlcnl0aGluZyhidWlsZENtZDogY29tbWFuZGVyLkNvbW1hbmQsIHR5cGU6ICdhcHAnIHwgJ2xpYicsIHBrZ05hbWU6IHN0cmluZykge1xuICAvLyBjb25zdCBjZmcgPSBhd2FpdCBpbml0Q29uZmlnQXN5bmMoYnVpbGRDbWQub3B0cygpIGFzIEdsb2JhbE9wdGlvbnMpO1xuICBjb25zdCBjZmcgPSBjb25maWc7XG4gIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICBzYXZlQ21kT3B0aW9uc1RvRW52KHBrZ05hbWUsIGJ1aWxkQ21kLCB0eXBlKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBPUlQgPT0gbnVsbCAmJiBjZmcoKS5wb3J0KVxuICAgIHByb2Nlc3MuZW52LlBPUlQgPSBjZmcoKS5wb3J0ICsgJyc7XG4gIC8vIGF3YWl0IHdhbGtQYWNrYWdlc0FuZFNldHVwSW5qZWN0b3IocHJvY2Vzcy5lbnYuUFVCTElDX1VSTCB8fCAnLycpO1xuICBpZiAoIVsnYXBwJywgJ2xpYiddLmluY2x1ZGVzKHR5cGUpKSB7XG5cbiAgICBwbGluay5sb2dnZXIuZXJyb3IoYHR5cGUgYXJndW1lbnQgbXVzdCBiZSBvbmUgb2YgXCIke1snYXBwJywgJ2xpYiddfVwiYCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByZWxvYWQ6IHR5cGVvZiBfcHJlbG9hZCA9IHJlcXVpcmUoJy4uL3ByZWxvYWQnKTtcbiAgcHJlbG9hZC5wb28oKTtcbn1cblxuZXhwb3J0IHtjbGkgYXMgZGVmYXVsdH07XG5cbiJdfQ==