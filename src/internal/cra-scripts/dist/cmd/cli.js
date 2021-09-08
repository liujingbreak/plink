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
            const cp = (0, child_process_1.fork)(require.resolve('@wfh/plink/wfh/dist/cmd-bootstrap'), process.argv.slice(2), { cwd: plink_1.plinkEnv.workDir });
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
            const cp = (0, child_process_1.fork)(require.resolve('@wfh/plink/wfh/dist/cmd-bootstrap'), process.argv.slice(2), { cwd: plink_1.plinkEnv.workDir });
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
            cp.on('exit', (sign, code) => { resolve(code); });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0EseUZBQXlGO0FBQ3pGLGdEQUF3QjtBQUV4QixvQ0FBNkM7QUFDN0MsaURBQW1DO0FBSW5DLHNDQUFzRDtBQUN0RCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsTUFBTSxHQUFHLEdBQWlCLENBQUMsT0FBTyxFQUFFLEVBQUU7SUFDcEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztTQUNuRSxXQUFXLENBQUMsMEVBQTBFLEVBQUU7UUFDdkYsU0FBUyxFQUFFLDJFQUEyRTtZQUNwRixxQ0FBcUM7UUFDdkMsY0FBYyxFQUFFLDJEQUEyRDtLQUM1RSxDQUFDO1NBQ0QsTUFBTSxDQUFDLGFBQWEsRUFBRSx3REFBd0QsRUFBRSxLQUFLLENBQUM7U0FDdEYsTUFBTSxDQUFDLG1DQUFtQyxFQUMzQyw2SkFBNko7UUFDN0osMkhBQTJIO1FBQzNILCtFQUErRTtRQUMvRSxtSEFBbUgsRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDO1NBQ3RJLE1BQU0sQ0FBQyxjQUFjLEVBQUUscUhBQXFILEVBQUUsS0FBSyxDQUFDO1NBQ3BKLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN4QixJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDcEQsTUFBTSxFQUFFLEdBQUcsSUFBQSxvQkFBSSxFQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsbUNBQW1DLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFDLEdBQUcsRUFBRSxnQkFBUSxDQUFDLE9BQU8sRUFBQyxDQUFDLENBQUM7WUFDdEgsR0FBRyxDQUFDLElBQUksQ0FBQyx5RUFBeUUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDNUYsT0FBTztTQUNSO1FBQ0QsY0FBYyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEMsSUFBSSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQztTQUN6QztRQUNELE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBRXRCLE9BQU8sQ0FBQyxPQUFPLENBQUMsOEJBQThCLENBQUM7U0FDNUMsV0FBVyxDQUFDLG1HQUFtRztRQUM5RywwRUFBMEUsRUFBRTtRQUMxRSxjQUFjLEVBQUUsMkRBQTJEO0tBQzVFLENBQUM7U0FDSCxNQUFNLENBQUMsQ0FBTSxPQUFPLEVBQUMsRUFBRTtRQUN0QixjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsd0RBQWEsaUJBQWlCLEdBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDOUQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUdMLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsMEJBQTBCLENBQUM7U0FDekQsV0FBVyxDQUFDLDJGQUEyRixFQUFFO1FBQ3hHLGNBQWMsRUFBRSwyREFBMkQ7S0FDNUUsQ0FBQztTQUNELE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ2xCLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxLQUFLLGNBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNwRCxNQUFNLEVBQUUsR0FBRyxJQUFBLG9CQUFJLEVBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUMsR0FBRyxFQUFFLGdCQUFRLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQztZQUN0SCxHQUFHLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM1RixPQUFPO1NBQ1I7UUFDRCxjQUFjLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQztJQUNMLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV0QixPQUFPLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDO1NBQzlCLFdBQVcsQ0FBQyxpQ0FBaUMsRUFBRSxFQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUMsQ0FBQztTQUM1RCxNQUFNLENBQUMsQ0FBTSxHQUFHLEVBQUMsRUFBRTtRQUNsQixDQUFDLHdEQUFhLHFCQUFxQixHQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDckQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUVMLDhDQUE4QztJQUM5Qyx1R0FBdUc7SUFDdkcsd0JBQXdCO0lBQ3hCLHVEQUF1RDtJQUN2RCxnQ0FBZ0M7SUFDaEMsNkJBQTZCO0lBQzdCLE1BQU07SUFDTixpQ0FBaUM7SUFFakMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQztTQUN0QyxLQUFLLENBQUMsYUFBYSxDQUFDO1NBQ3BCLFdBQVcsQ0FBQyx5QkFBeUIsRUFBRTtRQUN0QyxRQUFRLEVBQUUscUZBQXFGO0tBQ2hHLENBQUM7U0FDRCxNQUFNLENBQUMsQ0FBTyxVQUFrQixFQUFFLEVBQUU7UUFDbkMsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGtDQUFrQyxDQUFDLENBQUMsQ0FBQztRQUNwRixzRUFBc0U7UUFDdEUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFXLENBQUM7UUFFckcsTUFBTSxJQUFJLE9BQU8sQ0FBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN0QyxNQUFNLEVBQUUsR0FBRyxJQUFBLG9CQUFJLEVBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQy9DLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDO2FBQ25ELEVBQUUsRUFBQyxLQUFLLEVBQUUsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUM7WUFDdEQsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLEVBQUU7Z0JBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ25CLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsR0FBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFFSCxvREFBb0Q7SUFDcEQsNkNBQTZDO0lBQzdDLE1BQU07SUFDTix1REFBdUQ7QUFDekQsQ0FBQyxDQUFDO0FBMkJhLHNCQUFPO0FBekJ0QixTQUFTLFdBQVcsQ0FBQyxHQUFzQjtJQUN6QyxHQUFHLENBQUMsTUFBTSxDQUFDLDhCQUE4QixFQUFFLHVEQUF1RCxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ2pILENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFZLEVBQUUsSUFBMEI7SUFDN0QsSUFBSSxJQUFJO1FBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNsQixPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxRQUEyQixFQUFFLElBQW1CLEVBQUUsT0FBZTtJQUN2RixNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUM7SUFDbkIsSUFBQSwyQkFBbUIsRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDLElBQUk7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUVyQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBRWxDLEdBQUcsQ0FBQyxLQUFLLENBQUMsK0NBQStDLENBQUMsQ0FBQztRQUMzRCxPQUFPO0tBQ1I7SUFDRCxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFvQixDQUFDO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLy8gaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCByZXBsYWNlUGF0Y2hlcywgeyBSZXBsYWNlbWVudEluZiB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjb21tYW5kZXIgZnJvbSAnQ29tbWFuZGVyJztcbmltcG9ydCB7c2F2ZUNtZE9wdGlvbnNUb0Vudn0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbi8vIGltcG9ydCB3YWxrUGFja2FnZXNBbmRTZXR1cEluamVjdG9yIGZyb20gJ0B3Zmgvd2VicGFjay1jb21tb24vZGlzdC9pbml0SW5qZWN0b3JzJztcbi8vIGltcG9ydCB7aW5pdFRzY29uZmlnfSBmcm9tICcuL2NsaS1pbml0JztcbmltcG9ydCAqIGFzIF9wcmVsb2FkIGZyb20gJy4uL3ByZWxvYWQnO1xuaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlLCBwbGlua0Vudn0gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuY29uc3QgY2xpOiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBjb25zdCBidWlsZENtZCA9IHByb2dyYW0uY29tbWFuZCgnY3JhLWJ1aWxkIDxhcHB8bGliPiA8cGFja2FnZS1uYW1lPicpXG4gICAgLmRlc2NyaXB0aW9uKCdDb21waWxlIHJlYWN0IGFwcGxpY2F0aW9uIG9yIGxpYnJhcnkgKHdvcmsgd2l0aCBjcmVhdGUtcmVhY3QtYXBwIHY0LjAuMyknLCB7XG4gICAgICAnYXBwfGxpYic6ICdcImFwcFwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBjb21wbGV0ZSBhcHBsaWNhdGlvbiBsaWtlIGNyZWF0ZS1yZWFjdC1hcHAsXFxuJyArXG4gICAgICAgICdcImxpYlwiIHN0YW5kcyBmb3IgYnVpbGRpbmcgYSBsaWJyYXJ5JyxcbiAgICAgICdwYWNrYWdlLW5hbWUnOiAndGFyZ2V0IHBhY2thZ2UgbmFtZSwgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQnXG4gICAgfSlcbiAgICAub3B0aW9uKCctdywgLS13YXRjaCcsICd3aGVuIGFyZ3VtZW50IGlzIFwibGliXCIsIHdhdGNoIGZpbGUgY2hhbmdlcyBhbmQgY29tcGlsZScsIGZhbHNlKVxuICAgIC5vcHRpb24oJy1pLCAtLWluY2x1ZGUgPG1vZHVsZS1wYXRoLXJlZ2V4PicsXG4gICAgJyhtdWx0aXBsZSB2YWx1ZSksIHdoZW4gYXJndW1lbnQgaXMgXCJsaWJcIiwgd2Ugd2lsbCBzZXQgXCJleHRlcm5hbFwiIHByb3BlcnR5IG9mIFdlYnBhY2sgY29uZmlndXJhdGlvbiBmb3IgYWxsIHJlcXVlc3Qgbm90IGJlZ2luIHdpdGggXCIuXCIgKG5vdCByZWxhdGl2ZSBwYXRoKSwgJyArXG4gICAgJ21lYW5pbmcgYWxsIG5vbi1yZWxhdGl2ZSBtb2R1bGVzIHdpbGwgbm90IGJlIGluY2x1ZGVkIGluIHRoZSBvdXRwdXQgYnVuZGxlIGZpbGUsIHlvdSBuZWVkIHRvIGV4cGxpY2l0bHkgcHJvdmlkZSBhIGxpc3QgaW4nICtcbiAgICAnIFJlZ3VsYXIgZXhwcmVzc2lvbiAoZS5nLiAtaSBcXCdec29tZUxpYigvfCQpXFwnIC1pIFxcJ15zb21lTGliMigvfCQpXFwnIC1pIC4uLikgJyArXG4gICAgJyB0byBtYWtlIHRoZW0gYmUgaW5jbHVkZWQgaW4gYnVuZGxlIGZpbGUuIFRvIG1ha2Ugc3BlY2lmaWMgbW9kdWxlIChSZWFjdCkgZXh0ZXJuYWw6IC1pIFxcJ14oPyFyZWFjdCgtZG9tKT8oJHwvKSlcXCcnLCBhcnJheU9wdGlvbkZuLCBbXSlcbiAgICAub3B0aW9uKCctLXNvdXJjZS1tYXAnLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIEdFTkVSQVRFX1NPVVJDRU1BUCB0byBcInRydWVcIiAoc2VlIGh0dHBzOi8vY3JlYXRlLXJlYWN0LWFwcC5kZXYvZG9jcy9hZHZhbmNlZC1jb25maWd1cmF0aW9uJywgZmFsc2UpXG4gICAgLmFjdGlvbigodHlwZSwgcGtnTmFtZSkgPT4ge1xuICAgICAgaWYgKHByb2Nlc3MuY3dkKCkgIT09IFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyKSkge1xuICAgICAgICBjb25zdCBjcCA9IGZvcmsocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC1ib290c3RyYXAnKSwgcHJvY2Vzcy5hcmd2LnNsaWNlKDIpLCB7Y3dkOiBwbGlua0Vudi53b3JrRGlyfSk7XG4gICAgICAgIGxvZy5pbmZvKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgQ1JBIHByb2plY3QgZGlyZWN0b3J5LCBmb3JrIG5ldyBwcm9jZXNzLi4ucGlkOicsIGNwLnBpZCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGluaXRFdmVyeXRoaW5nKGJ1aWxkQ21kLCB0eXBlLCBwa2dOYW1lKTtcbiAgICAgIGlmIChidWlsZENtZC5vcHRzKCkuc291cmNlTWFwKSB7XG4gICAgICAgIGxvZy5pbmZvKCdzb3VyY2UgbWFwIGlzIGVuYWJsZWQnKTtcbiAgICAgICAgcHJvY2Vzcy5lbnYuR0VORVJBVEVfU09VUkNFTUFQID0gJ3RydWUnO1xuICAgICAgfVxuICAgICAgcmVxdWlyZSgncmVhY3Qtc2NyaXB0cy9zY3JpcHRzL2J1aWxkJyk7XG4gICAgfSk7XG4gIHdpdGhDbGljT3B0KGJ1aWxkQ21kKTtcblxuICBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1idWlsZC10c2QgPHBhY2thZ2UtbmFtZT4nKVxuICAgIC5kZXNjcmlwdGlvbignQ29tcGlsZSBwYWNrYWdlcyBmb3Igb25seSBnZW5lcmF0aW5nIFR5cGVzY3JpcHQgZGVmaW5pdGlvbiBmaWxlcy4gSWYgeW91IGFyZSBjcmVhdGluZyBhIGxpYnJhcnksICcgK1xuICAgICAgJ2NvbW1hbmQgXCJjcmEtYnVpbGRcIiB3aWxsIGFsc28gZ2VuZXJhdGUgdHNkIGZpbGUgYWxvbmcgd2l0aCBjbGllbnQgYnVuZGxlJywge1xuICAgICAgICAncGFja2FnZS1uYW1lJzogJ3RhcmdldCBwYWNrYWdlIG5hbWUsIHRoZSBcInNjb3BlXCIgbmFtZSBwYXJ0IGNhbiBiZSBvbWl0dGVkJ1xuICAgICAgfSlcbiAgICAuYWN0aW9uKGFzeW5jIHBrZ05hbWUgPT4ge1xuICAgICAgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdsaWInLCBwa2dOYW1lKTtcbiAgICAgIGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL3RzZC1nZW5lcmF0ZScpKS5idWlsZFRzZChbcGtnTmFtZV0pO1xuICAgIH0pO1xuXG5cbiAgY29uc3QgU3RhcnRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1zdGFydCA8cGFja2FnZS1uYW1lPicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gQ1JBIHN0YXJ0IHNjcmlwdCBmb3IgcmVhY3QgYXBwbGljYXRpb24gb3IgbGlicmFyeSAod29yayB3aXRoIGNyZWF0ZS1yZWFjdC1hcHAgdjQuMC4zKScsIHtcbiAgICAgICdwYWNrYWdlLW5hbWUnOiAndGFyZ2V0IHBhY2thZ2UgbmFtZSwgdGhlIFwic2NvcGVcIiBuYW1lIHBhcnQgY2FuIGJlIG9taXR0ZWQnXG4gICAgfSlcbiAgICAuYWN0aW9uKChwa2dOYW1lKSA9PiB7XG4gICAgICBpZiAocHJvY2Vzcy5jd2QoKSAhPT0gUGF0aC5yZXNvbHZlKHBsaW5rRW52LndvcmtEaXIpKSB7XG4gICAgICAgIGNvbnN0IGNwID0gZm9yayhyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcCcpLCBwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIHtjd2Q6IHBsaW5rRW52LndvcmtEaXJ9KTtcbiAgICAgICAgbG9nLmluZm8oJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBDUkEgcHJvamVjdCBkaXJlY3RvcnksIGZvcmsgbmV3IHByb2Nlc3MuLi5waWQ6JywgY3AucGlkKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaW5pdEV2ZXJ5dGhpbmcoU3RhcnRDbWQsICdhcHAnLCBwa2dOYW1lKTtcbiAgICAgIHJlcXVpcmUoJ3JlYWN0LXNjcmlwdHMvc2NyaXB0cy9zdGFydCcpO1xuICAgIH0pO1xuICB3aXRoQ2xpY09wdChTdGFydENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtb3BlbiA8dXJsPicpXG4gICAgLmRlc2NyaXB0aW9uKCdSdW4gcmVhY3QtZGV2LXV0aWxzL29wZW5Ccm93c2VyJywge3VybDogJ1VSTCd9KVxuICAgIC5hY3Rpb24oYXN5bmMgdXJsID0+IHtcbiAgICAgIChhd2FpdCBpbXBvcnQoJy4uL2NyYS1vcGVuLWJyb3dzZXInKSkuZGVmYXVsdCh1cmwpO1xuICAgIH0pO1xuXG4gIC8vIGNvbnN0IGluaXRDbWQgPSBwcm9ncmFtLmNvbW1hbmQoJ2NyYS1pbml0JylcbiAgLy8gLmRlc2NyaXB0aW9uKCdJbml0aWFsIHdvcmtzcGFjZSBmaWxlcyBiYXNlZCBvbiBmaWxlcyB3aGljaCBhcmUgbmV3bHkgZ2VuZXJhdGVkIGJ5IGNyZWF0ZS1yZWFjdC1hcHAnKVxuICAvLyAuYWN0aW9uKGFzeW5jICgpID0+IHtcbiAgLy8gICBjb25zdCBvcHQ6IEdsb2JhbE9wdGlvbnMgPSB7cHJvcDogW10sIGNvbmZpZzogW119O1xuICAvLyAgIGF3YWl0IGluaXRDb25maWdBc3luYyhvcHQpO1xuICAvLyAgIC8vIGF3YWl0IGluaXRUc2NvbmZpZygpO1xuICAvLyB9KTtcbiAgLy8gLy8gd2l0aEdsb2JhbE9wdGlvbnMoaW5pdENtZCk7XG5cbiAgcHJvZ3JhbS5jb21tYW5kKCdjcmEtYW5hbHl6ZSBbanMtZGlyXScpXG4gIC5hbGlhcygnY3JhLWFuYWx5c2UnKVxuICAuZGVzY3JpcHRpb24oJ1J1biBzb3VyY2UtbWFwLWV4cGxvcmVyJywge1xuICAgICdqcy1kaXInOiAnTm9ybWFsbHkgdGhpcyBwYXRoIHNob3VsZCBiZSA8cm9vdC1kaXI+ZGlzdC9zdGF0aWMvPG91dHB1dC1wYXRoLWJhc2VuYW1lPi9zdGF0aWMvanMnXG4gIH0pXG4gIC5hY3Rpb24oYXN5bmMgKG91dHB1dFBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHNtZVBrZ0RpciA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ3NvdXJjZS1tYXAtZXhwbG9yZXIvcGFja2FnZS5qc29uJykpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBjb25zdCBzbWVCaW4gPSByZXF1aXJlKFBhdGgucmVzb2x2ZShzbWVQa2dEaXIsICdwYWNrYWdlLmpzb24nKSkuYmluWydzb3VyY2UtbWFwLWV4cGxvcmVyJ10gYXMgc3RyaW5nO1xuXG4gICAgYXdhaXQgbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqKSA9PiB7XG4gICAgICBjb25zdCBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKHNtZVBrZ0Rpciwgc21lQmluKSwgW1xuICAgICAgICAnLS1nemlwJywgJy0tbm8tcm9vdCcsXG4gICAgICAgIFBhdGgucmVzb2x2ZShvdXRwdXRQYXRoID8gb3V0cHV0UGF0aCA6ICcnLCAnKi5qcycpXG4gICAgICBdLCB7c3RkaW86IFsnaW5oZXJpdCcsICdpbmhlcml0JywgJ2luaGVyaXQnLCAnaXBjJ119KTtcbiAgICAgIGNwLm9uKCdlcnJvcicsIGVyciA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcbiAgICAgICAgcmVqKGVycik7XG4gICAgICB9KTtcbiAgICAgIGNwLm9uKCdleGl0JywgKHNpZ24sIGNvZGUpID0+IHtyZXNvbHZlKGNvZGUpOyB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gcHJvZ3JhbS5jb21tYW5kKCdjcmEtZGVidWcnKS5hY3Rpb24oYXN5bmMgKCkgPT4ge1xuICAvLyAgIChhd2FpdCBpbXBvcnQoJy4vY2xpLWRlYnVnJykpLmRlZmF1bHQoKTtcbiAgLy8gfSk7XG4gIC8vIHNtZUNtZC51c2FnZShzbWVDbWQudXNhZ2UoKSArICdcXG4gIGFwcC1iYXNlLXBhdGg6ICcpXG59O1xuXG5mdW5jdGlvbiB3aXRoQ2xpY09wdChjbWQ6IGNvbW1hbmRlci5Db21tYW5kKSB7XG4gIGNtZC5vcHRpb24oJy0tcHVybCwgLS1wdWJsaWNVcmwgPHN0cmluZz4nLCAnc2V0IGVudmlyb25tZW50IHZhcmlhYmxlIFBVQkxJQ19VUkwgZm9yIHJlYWN0LXNjcmlwdHMnLCB1bmRlZmluZWQpO1xufVxuXG5mdW5jdGlvbiBhcnJheU9wdGlvbkZuKGN1cnI6IHN0cmluZywgcHJldjogc3RyaW5nW10gfCB1bmRlZmluZWQpIHtcbiAgaWYgKHByZXYpXG4gICAgcHJldi5wdXNoKGN1cnIpO1xuICByZXR1cm4gcHJldjtcbn1cblxuZnVuY3Rpb24gaW5pdEV2ZXJ5dGhpbmcoYnVpbGRDbWQ6IGNvbW1hbmRlci5Db21tYW5kLCB0eXBlOiAnYXBwJyB8ICdsaWInLCBwa2dOYW1lOiBzdHJpbmcpIHtcbiAgY29uc3QgY2ZnID0gY29uZmlnO1xuICBzYXZlQ21kT3B0aW9uc1RvRW52KHBrZ05hbWUsIGJ1aWxkQ21kLCB0eXBlKTtcbiAgaWYgKHByb2Nlc3MuZW52LlBPUlQgPT0gbnVsbCAmJiBjZmcoKS5wb3J0KVxuICAgIHByb2Nlc3MuZW52LlBPUlQgPSBjZmcoKS5wb3J0ICsgJyc7XG5cbiAgaWYgKCFbJ2FwcCcsICdsaWInXS5pbmNsdWRlcyh0eXBlKSkge1xuXG4gICAgbG9nLmVycm9yKCd0eXBlIGFyZ3VtZW50IG11c3QgYmUgb25lIG9mIFxcJ2FwcFxcJywgXFwnbGliXFwnJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHByZWxvYWQgPSByZXF1aXJlKCcuLi9wcmVsb2FkJykgYXMgdHlwZW9mIF9wcmVsb2FkO1xuICBwcmVsb2FkLnBvbygpO1xufVxuXG5leHBvcnQge2NsaSBhcyBkZWZhdWx0fTtcblxuIl19