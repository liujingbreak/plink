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
exports.changeAngularCliOptions = exports.changeAngularCliOptionsForBuild = void 0;
/* tslint:disable no-console */
const architect_1 = require("@angular-devkit/architect");
const chalk_1 = __importDefault(require("chalk"));
const network_util_1 = require("@wfh/plink/wfh/dist/utils/network-util");
// import { getTsDirsOfPackage } from '@wfh/plink/wfh/dist/utils';
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const worker_threads_1 = require("worker_threads");
const url_1 = __importDefault(require("url"));
const injector_setup_1 = __importDefault(require("./injector-setup"));
const mem_stats_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const for_hmr_1 = require("./for-hmr");
const { cyan, green, red } = chalk_1.default;
const currPackageName = require('../../package.json').name;
const log = require('log4js').getLogger('@wfh/ng-app-builder.change-cli-options');
// type ExtractPromise<P> = P extends Promise<infer T> ? T : unknown;
function hackAngularBuilderContext(context, targetName, replacedOpts) {
    const getTargetOptions = context.getTargetOptions;
    context.getTargetOptions = function (target) {
        return __awaiter(this, arguments, void 0, function* () {
            if (target.target === targetName) {
                // log.info('Angular cli build options', replacedOpts);
                return replacedOpts;
            }
            const origOption = yield getTargetOptions.apply(context, arguments);
            return origOption;
        });
    };
}
/**
 * For build (ng build)
 * @param config
 * @param browserOptions
 */
function changeAngularCliOptionsForBuild(config, browserOptions, context) {
    return __awaiter(this, void 0, void 0, function* () {
        return processBrowserBuiliderOptions(config, browserOptions, context);
    });
}
exports.changeAngularCliOptionsForBuild = changeAngularCliOptionsForBuild;
/**
 * For dev server (ng serve)
 * @param config
 * @param context
 * @param builderConfig
 */
function changeAngularCliOptions(config, context, builderConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        const browserTarget = architect_1.targetFromTargetString(builderConfig.browserTarget);
        const rawBrowserOptions = yield context.getTargetOptions(browserTarget);
        if (!rawBrowserOptions.deployUrl)
            rawBrowserOptions.deployUrl = '/';
        const browserOptions = yield processBrowserBuiliderOptions(config, rawBrowserOptions, context, builderConfig, true);
        process.env.NODE_OPTIONS = '-r ' + Path.resolve(Path.dirname(__dirname), 'fork-tscheck/fork-tscheck-register');
        hackAngularBuilderContext(context, 'build', browserOptions);
        process.env._ngcli_plink_cfg = JSON.stringify({
            deployUrl: browserOptions.deployUrl,
            baseHref: browserOptions.baseHref
        });
        return browserOptions;
    });
}
exports.changeAngularCliOptions = changeAngularCliOptions;
function processBrowserBuiliderOptions(config, rawBrowserOptions, context, devServerConfig, hmr = false) {
    return __awaiter(this, void 0, void 0, function* () {
        context.reportStatus('Change builder options');
        const browserOptions = rawBrowserOptions;
        for (const prop of ['deployUrl', 'outputPath', 'styles']) {
            const value = config.get([currPackageName, prop]);
            if (value != null) {
                rawBrowserOptions[prop] = value;
                console.log(currPackageName + ' - override %s: %s', prop, value);
            }
        }
        yield config.configHandlerMgr().runEach((file, obj, handler) => {
            console.log(green('change-cli-options - ') + ' run', cyan(file));
            if (handler.angularJson)
                return handler.angularJson(browserOptions, devServerConfig);
            else
                return obj;
        });
        if (!browserOptions.deployUrl)
            browserOptions.deployUrl = '/';
        // if static assets's URL is not led by '/', it will be considered as relative path in ng-html-loader
        if (devServerConfig) {
            const parsedUrl = url_1.default.parse(browserOptions.deployUrl, true, true);
            if (parsedUrl.host == null) {
                parsedUrl.hostname = network_util_1.getLanIPv4();
                parsedUrl.port = devServerConfig.port + '';
                parsedUrl.protocol = devServerConfig && devServerConfig.ssl ? 'https' : 'http';
                rawBrowserOptions.deployUrl = url_1.default.format(parsedUrl);
                // TODO: print right after server is successfully started
                setTimeout(() => console.log(chalk_1.default.red(`Current dev server resource is hosted on ${parsedUrl.hostname},\nif your network is reconnected or local IP address is ` +
                    ' changed, you will need to restart this dev server!')), 5000);
            }
            if (parsedUrl.pathname)
                devServerConfig.servePath = parsedUrl.pathname; // In case deployUrl has host, ng cli will report error for null servePath
        }
        if (browserOptions.fileReplacements) {
            const cwd = process.cwd();
            browserOptions.fileReplacements
                .forEach(fr => {
                Object.keys(fr).forEach(field => {
                    const value = fr[field];
                    if (Path.isAbsolute(value)) {
                        fr[field] = Path.relative(cwd, value);
                    }
                });
            });
        }
        const pkJson = lookupEntryPackage(Path.resolve(browserOptions.main));
        if (pkJson) {
            console.log(green('change-cli-options - ') + `Set entry package ${cyan(pkJson.name)}'s output path to /`);
            config.set(['outputPathMap', pkJson.name], '/'); // static assets in entry package should always be output to root path
        }
        // Be compatible to old DRCP build tools
        const { deployUrl } = browserOptions;
        if (!config.get('staticAssetsURL'))
            config.set('staticAssetsURL', _.trimEnd(deployUrl, '/'));
        if (!config.get('publicPath'))
            config.set('publicPath', deployUrl);
        const mainHmr = for_hmr_1.createMainFileForHmr(browserOptions.main);
        if (hmr && devServerConfig) {
            devServerConfig.hmr = true;
            if (!browserOptions.fileReplacements)
                browserOptions.fileReplacements = [];
            browserOptions.fileReplacements.push({
                replace: browserOptions.main,
                with: Path.relative('.', mainHmr)
            });
        }
        if (browserOptions.drcpArgs == null) {
            browserOptions.drcpArgs = {};
        }
        browserOptions.commonChunk = false;
        const packagesInfo = injector_setup_1.default(browserOptions);
        yield hackTsConfig(browserOptions, config, packagesInfo);
        context.reportStatus('setting up assets options');
        // Because dev-serve-assets depends on DRCP api, I have to lazy load it.
        const forEachAssetsDir = require('@wfh/assets-processer/dist/dev-serve-assets').packageAssetsFolders;
        forEachAssetsDir('/', (inputDir, outputDir) => {
            if (!browserOptions.assets) {
                browserOptions.assets = [];
            }
            let input = Path.relative(process.cwd(), inputDir).replace(/\\/g, '/');
            if (!input.startsWith('.')) {
                input = './' + input;
            }
            browserOptions.assets.push({
                input,
                glob: '**/*',
                output: outputDir.endsWith('/') ? outputDir : outputDir + '/'
            });
        });
        fs.writeFile(config.resolve('destDir', 'ng-app-builder.report', 'angular-cli-options.json'), JSON.stringify(browserOptions, undefined, '  '), () => { });
        return browserOptions;
    });
}
// Hack ts.sys, so far it is used to read tsconfig.json
function hackTsConfig(browserOptions, config, packagesInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        // We want to hack the typescript used in current workspace, not the one from Plink's dependency
        const sys = require(Path.resolve('node_modules/typescript')).sys;
        const oldReadFile = sys.readFile;
        const tsConfigFile = Path.resolve(browserOptions.tsConfig);
        const useThread = config.get(currPackageName + '.useThread', true);
        const newTsConfig = useThread ?
            yield createTsConfigInWorker(tsConfigFile, browserOptions, config, packagesInfo) :
            createTsConfigSync(tsConfigFile, browserOptions, config, packagesInfo);
        fs.writeFile(config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json'), newTsConfig, () => {
        });
        sys.readFile = function (path, encoding) {
            const res = oldReadFile.apply(sys, arguments);
            if (Path.sep === '\\') {
                // Angular somehow reads tsconfig.json twice and passes in `path`
                // with different path seperator `\` and `/` in Windows 
                // `cachedTsConfigFor` is lodash memoize function which needs a
                // consistent `path` value as cache key
                path = path.replace(/\//g, Path.sep);
            }
            try {
                if (path === tsConfigFile) {
                    return newTsConfig;
                }
                else
                    return res;
            }
            catch (err) {
                console.error(red('change-cli-options - ') + `Read ${path}`, err);
            }
            return '';
        };
    });
}
function lookupEntryPackage(lookupDir) {
    while (true) {
        const pk = Path.join(lookupDir, 'package.json');
        if (fs.existsSync(pk)) {
            return require(pk);
        }
        else if (lookupDir === Path.dirname(lookupDir)) {
            break;
        }
        lookupDir = Path.dirname(lookupDir);
    }
    return null;
}
function createTsConfigSync(tsconfigFile, browserOptions, config, packageInfo) {
    const { createTsConfig } = require('./change-tsconfig');
    mem_stats_1.default();
    return createTsConfig(tsconfigFile, browserOptions, config.get(currPackageName), packageInfo, config.resolve('destDir', 'ng-app-builder.report'));
}
function createTsConfigInWorker(tsconfigFile, browserOptions, config, packageInfo) {
    const reportDir = config.resolve('destDir', 'ng-app-builder.report');
    mem_stats_1.default();
    const workerLog = require('log4js').getLogger('@wfh/ng-app-builder.worker');
    return new Promise((resolve, rej) => {
        const workerData = {
            tsconfigFile,
            reportDir,
            config: config.get(currPackageName),
            ngOptions: {
                preserveSymlinks: browserOptions.preserveSymlinks,
                main: browserOptions.main,
                fileReplacements: JSON.parse(JSON.stringify(browserOptions.fileReplacements))
            },
            packageInfo,
            drcpBuilderOptions: JSON.parse(JSON.stringify({ drcpArgs: browserOptions.drcpArgs, drcpConfig: browserOptions.drcpConfig })),
            baseHref: browserOptions.baseHref,
            deployUrl: browserOptions.deployUrl
        };
        const worker = new worker_threads_1.Worker(require.resolve('./change-tsconfig-worker.js'), { workerData });
        worker.on('error', rej);
        worker.on('message', (msg) => {
            if (msg.log) {
                workerLog.info(msg.log);
            }
            if (msg.result) {
                resolve(msg.result);
            }
            // worker.off('error', rej);
        });
        worker.on('exit', () => {
            log.info('worker exits');
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hhbmdlLWNsaS1vcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IseURBQTJGO0FBSzNGLGtEQUEwQjtBQUUxQix5RUFBb0U7QUFDcEUsa0VBQWtFO0FBQ2xFLHVDQUF5QjtBQUN6QiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLG1EQUFzQztBQUV0Qyw4Q0FBc0I7QUFFdEIsc0VBQTZDO0FBRzdDLG9GQUEyRDtBQUczRCx1Q0FBK0M7QUFFL0MsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFFbEYscUVBQXFFO0FBR3JFLFNBQVMseUJBQXlCLENBQUMsT0FBdUIsRUFBRSxVQUFrQixFQUM1RSxZQUFpQjtJQUNqQixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztJQUVsRCxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsVUFBZSxNQUFjOztZQUN0RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssVUFBVSxFQUFFO2dCQUNoQyx1REFBdUQ7Z0JBQ3ZELE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1lBQ0QsTUFBTSxVQUFVLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7S0FBQSxDQUFDO0FBQ0osQ0FBQztBQUNEOzs7O0dBSUc7QUFDSCxTQUFzQiwrQkFBK0Is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WCxrQkFBa0IsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVEsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLFVBQVUsRUFBQyxDQUFDLENBQXVCO1lBQ2hKLFFBQVEsRUFBRSxjQUFjLENBQUMsUUFBUTtZQUNqQyxTQUFTLEVBQUUsY0FBYyxDQUFDLFNBQVM7U0FDcEMsQ0FBQztRQUNGLE1BQU0sTUFBTSxHQUFHLElBQUksdUJBQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBQyxVQUFVLEVBQUMsQ0FBQyxDQUFDO1FBQ3hGLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDM0IsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFO2dCQUNYLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ3pCO1lBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxFQUFFO2dCQUNkLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7YUFDckI7WUFDRCw0QkFBNEI7UUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7WUFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7IHBhY2thZ2VBc3NldHNGb2xkZXJzIH0gZnJvbSAnQHdmaC9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgRHJjcENvbmZpZyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0TGFuSVB2NCB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbmV0d29yay11dGlsJztcbi8vIGltcG9ydCB7IGdldFRzRGlyc09mUGFja2FnZSB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7V29ya2VyfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgaW5qZWN0b3JTZXR1cCBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB7IERyY3BCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4uL3NlcnZlcic7XG5pbXBvcnQge0RhdGF9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnLXdvcmtlcic7XG5pbXBvcnQgbWVtc3RhdHMgZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IHtjcmVhdGVUc0NvbmZpZyBhcyBfY3JlYXRlVHNDb25maWd9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcbmltcG9ydCB7QW5ndWxhckNvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQge2NyZWF0ZU1haW5GaWxlRm9ySG1yfSBmcm9tICcuL2Zvci1obXInO1xuXG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSBjaGFsaztcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0B3ZmgvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5cbi8vIHR5cGUgRXh0cmFjdFByb21pc2U8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5cbmZ1bmN0aW9uIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHRhcmdldE5hbWU6IHN0cmluZyxcbiAgcmVwbGFjZWRPcHRzOiBhbnkpIHtcbiAgY29uc3QgZ2V0VGFyZ2V0T3B0aW9ucyA9IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucztcblxuICBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMgPSBhc3luYyBmdW5jdGlvbih0YXJnZXQ6IFRhcmdldCkge1xuICAgIGlmICh0YXJnZXQudGFyZ2V0ID09PSB0YXJnZXROYW1lKSB7XG4gICAgICAvLyBsb2cuaW5mbygnQW5ndWxhciBjbGkgYnVpbGQgb3B0aW9ucycsIHJlcGxhY2VkT3B0cyk7XG4gICAgICByZXR1cm4gcmVwbGFjZWRPcHRzO1xuICAgIH1cbiAgICBjb25zdCBvcmlnT3B0aW9uID0gYXdhaXQgZ2V0VGFyZ2V0T3B0aW9ucy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBvcmlnT3B0aW9uO1xuICB9O1xufVxuLyoqXG4gKiBGb3IgYnVpbGQgKG5nIGJ1aWxkKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEgfCBTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgY29udGV4dDogQnVpbGRlckNvbnRleHQpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuICByZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucywgY29udGV4dCk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBidWlsZGVyQ29uZmlnOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucykge1xuXG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKGJ1aWxkZXJDb25maWchLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPSAnLXIgJyArIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoX19kaXJuYW1lKSwgJ2ZvcmstdHNjaGVjay9mb3JrLXRzY2hlY2stcmVnaXN0ZXInKTtcbiAgaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0LCAnYnVpbGQnLCBicm93c2VyT3B0aW9ucyk7XG5cbiAgcHJvY2Vzcy5lbnYuX25nY2xpX3BsaW5rX2NmZyA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICBkZXBsb3lVcmw6IGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCxcbiAgICBiYXNlSHJlZjogYnJvd3Nlck9wdGlvbnMuYmFzZUhyZWZcbiAgfSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcmF3QnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hIHwgU2VydmVyQnVpbGRlck9wdGlvbnMsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBkZXZTZXJ2ZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgaG1yID0gZmFsc2UpIHtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnQ2hhbmdlIGJ1aWxkZXIgb3B0aW9ucycpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG9iajtcbiAgfSk7XG5cbiAgaWYgKCFicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuICAvLyBpZiBzdGF0aWMgYXNzZXRzJ3MgVVJMIGlzIG5vdCBsZWQgYnkgJy8nLCBpdCB3aWxsIGJlIGNvbnNpZGVyZWQgYXMgcmVsYXRpdmUgcGF0aCBpbiBuZy1odG1sLWxvYWRlclxuXG4gIGlmIChkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UoYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsLCB0cnVlLCB0cnVlKTtcbiAgICBpZiAocGFyc2VkVXJsLmhvc3QgPT0gbnVsbCkge1xuICAgICAgcGFyc2VkVXJsLmhvc3RuYW1lID0gZ2V0TGFuSVB2NCgpO1xuICAgICAgcGFyc2VkVXJsLnBvcnQgPSBkZXZTZXJ2ZXJDb25maWcucG9ydCArICcnO1xuICAgICAgcGFyc2VkVXJsLnByb3RvY29sID0gZGV2U2VydmVyQ29uZmlnICYmIGRldlNlcnZlckNvbmZpZy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnO1xuICAgICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gVXJsLmZvcm1hdChwYXJzZWRVcmwpO1xuICAgICAgLy8gVE9ETzogcHJpbnQgcmlnaHQgYWZ0ZXIgc2VydmVyIGlzIHN1Y2Nlc3NmdWxseSBzdGFydGVkXG4gICAgICBzZXRUaW1lb3V0KCgpID0+XG4gICAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnJlZChgQ3VycmVudCBkZXYgc2VydmVyIHJlc291cmNlIGlzIGhvc3RlZCBvbiAke3BhcnNlZFVybC5ob3N0bmFtZX0sXFxuaWYgeW91ciBuZXR3b3JrIGlzIHJlY29ubmVjdGVkIG9yIGxvY2FsIElQIGFkZHJlc3MgaXMgYCArXG4gICAgICAgICcgY2hhbmdlZCwgeW91IHdpbGwgbmVlZCB0byByZXN0YXJ0IHRoaXMgZGV2IHNlcnZlciEnKSksIDUwMDApO1xuICAgIH1cbiAgICBpZiAocGFyc2VkVXJsLnBhdGhuYW1lKVxuICAgICAgZGV2U2VydmVyQ29uZmlnLnNlcnZlUGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZTsgLy8gSW4gY2FzZSBkZXBsb3lVcmwgaGFzIGhvc3QsIG5nIGNsaSB3aWxsIHJlcG9ydCBlcnJvciBmb3IgbnVsbCBzZXJ2ZVBhdGhcbiAgfVxuXG4gIGlmIChicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSB7XG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzXG4gICAgLmZvckVhY2goZnIgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZnIpLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZTogc3RyaW5nID0gZnJbZmllbGRdO1xuICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHZhbHVlKSkge1xuICAgICAgICAgIGZyW2ZpZWxkXSA9IFBhdGgucmVsYXRpdmUoY3dkLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcGtKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGlmIChwa0pzb24pIHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgU2V0IGVudHJ5IHBhY2thZ2UgJHtjeWFuKHBrSnNvbi5uYW1lKX0ncyBvdXRwdXQgcGF0aCB0byAvYCk7XG4gICAgY29uZmlnLnNldChbJ291dHB1dFBhdGhNYXAnLCBwa0pzb24ubmFtZV0sICcvJyk7IC8vIHN0YXRpYyBhc3NldHMgaW4gZW50cnkgcGFja2FnZSBzaG91bGQgYWx3YXlzIGJlIG91dHB1dCB0byByb290IHBhdGhcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG4gIGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcbiAgaWYgKGhtciAmJiBkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBkZXZTZXJ2ZXJDb25maWcuaG1yID0gdHJ1ZTtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG4gICAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICB3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcbiAgICB9KTtcbiAgfVxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuICAgIGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG4gIH1cblxuICBicm93c2VyT3B0aW9ucy5jb21tb25DaHVuayA9IGZhbHNlO1xuXG4gIGNvbnN0IHBhY2thZ2VzSW5mbyA9IGluamVjdG9yU2V0dXAoYnJvd3Nlck9wdGlvbnMpO1xuICBhd2FpdCBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcblxuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdzZXR0aW5nIHVwIGFzc2V0cyBvcHRpb25zJyk7XG4gIC8vIEJlY2F1c2UgZGV2LXNlcnZlLWFzc2V0cyBkZXBlbmRzIG9uIERSQ1AgYXBpLCBJIGhhdmUgdG8gbGF6eSBsb2FkIGl0LlxuICBjb25zdCBmb3JFYWNoQXNzZXRzRGlyOiB0eXBlb2YgcGFja2FnZUFzc2V0c0ZvbGRlcnMgPVxuICByZXF1aXJlKCdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJykucGFja2FnZUFzc2V0c0ZvbGRlcnM7XG4gIGZvckVhY2hBc3NldHNEaXIoJy8nLCAoaW5wdXREaXIsIG91dHB1dERpcikgPT4ge1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuYXNzZXRzKSB7XG4gICAgICBicm93c2VyT3B0aW9ucy5hc3NldHMgPSBbXTtcbiAgICB9XG4gICAgbGV0IGlucHV0ID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBpbnB1dERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICghaW5wdXQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBpbnB1dCA9ICcuLycgKyBpbnB1dDtcbiAgICB9XG4gICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzIS5wdXNoKHtcbiAgICAgIGlucHV0LFxuICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgb3V0cHV0OiBvdXRwdXREaXIuZW5kc1dpdGgoJy8nKSA/IG91dHB1dERpciA6IG91dHB1dERpciArICcvJ1xuICAgIH0pO1xuICB9KTtcbiAgZnMud3JpdGVGaWxlKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICdhbmd1bGFyLWNsaS1vcHRpb25zLmpzb24nKSxcbiAgSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMsIHVuZGVmaW5lZCwgJyAgJyksICgpID0+IHt9KTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5hc3luYyBmdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlc0luZm86IFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+KSB7XG5cbiAgLy8gV2Ugd2FudCB0byBoYWNrIHRoZSB0eXBlc2NyaXB0IHVzZWQgaW4gY3VycmVudCB3b3Jrc3BhY2UsIG5vdCB0aGUgb25lIGZyb20gUGxpbmsncyBkZXBlbmRlbmN5XG4gIGNvbnN0IHN5cyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvdHlwZXNjcmlwdCcpKS5zeXMgYXMgdHlwZW9mIHRzLnN5cztcbiAgY29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG4gIGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cbiAgY29uc3QgdXNlVGhyZWFkID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLnVzZVRocmVhZCcsIHRydWUpO1xuICBjb25zdCBuZXdUc0NvbmZpZyA9IHVzZVRocmVhZCA/XG4gICAgYXdhaXQgY3JlYXRlVHNDb25maWdJbldvcmtlcih0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbykgOlxuICAgIGNyZWF0ZVRzQ29uZmlnU3luYyh0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbyk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHNjb25maWcuanNvbicpLCBuZXdUc0NvbmZpZywgKCkgPT4ge1xuICB9KTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKSB7XG4gICAgICAgIHJldHVybiBuZXdUc0NvbmZpZztcbiAgICAgIH0gZWxzZVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHNDb25maWdTeW5jKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPikge1xuICBjb25zdCB7Y3JlYXRlVHNDb25maWd9ID0gcmVxdWlyZSgnLi9jaGFuZ2UtdHNjb25maWcnKSBhcyB7Y3JlYXRlVHNDb25maWc6IHR5cGVvZiBfY3JlYXRlVHNDb25maWd9O1xuICBtZW1zdGF0cygpO1xuICByZXR1cm4gY3JlYXRlVHNDb25maWcodHNjb25maWdGaWxlLCBicm93c2VyT3B0aW9ucywgY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUpLFxuICAgIHBhY2thZ2VJbmZvLCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnKSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnSW5Xb3JrZXIodHNjb25maWdGaWxlOiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcGFja2FnZUluZm86IFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+KSB7XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0Jyk7XG5cbiAgbWVtc3RhdHMoKTtcbiAgY29uc3Qgd29ya2VyTG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAd2ZoL25nLWFwcC1idWlsZGVyLndvcmtlcicpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWopID0+IHtcblxuICAgIGNvbnN0IHdvcmtlckRhdGE6IERhdGEgPSB7XG4gICAgICB0c2NvbmZpZ0ZpbGUsXG4gICAgICByZXBvcnREaXIsXG4gICAgICBjb25maWc6IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lKSxcbiAgICAgIG5nT3B0aW9uczoge1xuICAgICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgICBtYWluOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpKVxuICAgICAgfSxcbiAgICAgIHBhY2thZ2VJbmZvLFxuICAgICAgZHJjcEJ1aWxkZXJPcHRpb25zOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHtkcmNwQXJnczogYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MsIGRyY3BDb25maWc6IGJyb3dzZXJPcHRpb25zLmRyY3BDb25maWd9KSkgYXMgRHJjcEJ1aWxkZXJPcHRpb25zLFxuICAgICAgYmFzZUhyZWY6IGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgZGVwbG95VXJsOiBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmxcbiAgICB9O1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXIuanMnKSwge3dvcmtlckRhdGF9KTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgcmVqKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCAobXNnKSA9PiB7XG4gICAgICBpZiAobXNnLmxvZykge1xuICAgICAgICB3b3JrZXJMb2cuaW5mbyhtc2cubG9nKTtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cucmVzdWx0KSB7XG4gICAgICAgIHJlc29sdmUobXNnLnJlc3VsdCk7XG4gICAgICB9XG4gICAgICAvLyB3b3JrZXIub2ZmKCdlcnJvcicsIHJlaik7XG4gICAgfSk7XG4gICAgd29ya2VyLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3dvcmtlciBleGl0cycpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuXG4iXX0=