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
/* eslint-disable  no-console */
const architect_1 = require("@angular-devkit/architect");
const chalk_1 = __importDefault(require("chalk"));
const network_util_1 = require("@wfh/plink/wfh/dist/utils/network-util");
// import { getTsDirsOfPackage } from '@wfh/plink/wfh/dist/utils';
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const Path = __importStar(require("path"));
const worker_threads_1 = require("worker_threads");
const url_1 = __importDefault(require("url"));
const injector_setup_1 = require("./injector-setup");
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
        yield config.configHandlerMgrChanged(mgr => mgr.runEach((file, obj, handler) => {
            console.log(green('change-cli-options - ') + ' run', cyan(file));
            if (handler.angularJson)
                return handler.angularJson(browserOptions, devServerConfig);
            else
                return obj;
        }));
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
            // config.set(['outputPathMap', pkJson.name], '/'); // static assets in entry package should always be output to root path
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
        const packagesInfo = injector_setup_1.injectorSetup(browserOptions.deployUrl, browserOptions.baseHref);
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
    return createTsConfig(tsconfigFile, browserOptions, config.resolve('destDir', 'ng-app-builder.report'));
}
function createTsConfigInWorker(tsconfigFile, browserOptions, config, packageInfo) {
    const reportDir = config.resolve('destDir', 'ng-app-builder.report');
    mem_stats_1.default();
    const workerLog = require('log4js').getLogger('@wfh/ng-app-builder.worker');
    return new Promise((resolve, rej) => {
        const workerData = {
            tsconfigFile,
            reportDir,
            ngOptions: {
                preserveSymlinks: browserOptions.preserveSymlinks,
                main: browserOptions.main,
                fileReplacements: JSON.parse(JSON.stringify(browserOptions.fileReplacements))
            },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hhbmdlLWNsaS1vcHRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnQ0FBZ0M7QUFDaEMseURBQTJGO0FBSzNGLGtEQUEwQjtBQUUxQix5RUFBb0U7QUFDcEUsa0VBQWtFO0FBQ2xFLHVDQUF5QjtBQUN6QiwwQ0FBNEI7QUFDNUIsMkNBQTZCO0FBQzdCLG1EQUFzQztBQUV0Qyw4Q0FBc0I7QUFFdEIscURBQStDO0FBRy9DLG9GQUEyRDtBQUczRCx1Q0FBK0M7QUFFL0MsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFFbEYscUVBQXFFO0FBR3JFLFNBQVMseUJBQXlCLENBQUMsT0FBdUIsRUFBRSxVQUFrQixFQUM1RSxZQUFpQjtJQUNqQixNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztJQUVsRCxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsVUFBZSxNQUFjOztZQUN0RCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssVUFBVSxFQUFFO2dCQUNoQyx1REFBdUQ7Z0JBQ3ZELE9BQU8sWUFBWSxDQUFDO2FBQ3JCO1lBQ0QsTUFBTSxVQUFVLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sVUFBVSxDQUFDO1FBQ3BCLENBQUM7S0FBQSxDQUFDO0FBQ0osQ0FBQztBQUNEOzs7O0dBSUc7QUFDSCxTQUFzQiwrQkFBK0Is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QyxDQUF1QjtZQUNoSixRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVE7WUFDakMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxTQUFTO1NBQ3BDLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQztRQUN4RixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzNCLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDWCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN6QjtZQUNELElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtnQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3JCO1lBQ0QsNEJBQTRCO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSAgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQsIFRhcmdldCwgdGFyZ2V0RnJvbVRhcmdldFN0cmluZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIFNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3NlcnZlci9zY2hlbWEnO1xuaW1wb3J0IHsgcGFja2FnZUFzc2V0c0ZvbGRlcnMgfSBmcm9tICdAd2ZoL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBEcmNwQ29uZmlnIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgeyBnZXRMYW5JUHY0IH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7aW5qZWN0b3JTZXR1cH0gZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQgeyBEcmNwQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi9zZXJ2ZXInO1xuaW1wb3J0IHtEYXRhfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXInO1xuaW1wb3J0IG1lbXN0YXRzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCB7Y3JlYXRlVHNDb25maWcgYXMgX2NyZWF0ZVRzQ29uZmlnfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZyc7XG5pbXBvcnQge0FuZ3VsYXJDb25maWdIYW5kbGVyfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHtjcmVhdGVNYWluRmlsZUZvckhtcn0gZnJvbSAnLi9mb3ItaG1yJztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gY2hhbGs7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAd2ZoL25nLWFwcC1idWlsZGVyLmNoYW5nZS1jbGktb3B0aW9ucycpO1xuXG4vLyB0eXBlIEV4dHJhY3RQcm9taXNlPFA+ID0gUCBleHRlbmRzIFByb21pc2U8aW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuXG5mdW5jdGlvbiBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCB0YXJnZXROYW1lOiBzdHJpbmcsXG4gIHJlcGxhY2VkT3B0czogYW55KSB7XG4gIGNvbnN0IGdldFRhcmdldE9wdGlvbnMgPSBjb250ZXh0LmdldFRhcmdldE9wdGlvbnM7XG5cbiAgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zID0gYXN5bmMgZnVuY3Rpb24odGFyZ2V0OiBUYXJnZXQpIHtcbiAgICBpZiAodGFyZ2V0LnRhcmdldCA9PT0gdGFyZ2V0TmFtZSkge1xuICAgICAgLy8gbG9nLmluZm8oJ0FuZ3VsYXIgY2xpIGJ1aWxkIG9wdGlvbnMnLCByZXBsYWNlZE9wdHMpO1xuICAgICAgcmV0dXJuIHJlcGxhY2VkT3B0cztcbiAgICB9XG4gICAgY29uc3Qgb3JpZ09wdGlvbiA9IGF3YWl0IGdldFRhcmdldE9wdGlvbnMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gb3JpZ09wdGlvbjtcbiAgfTtcbn1cbi8qKlxuICogRm9yIGJ1aWxkIChuZyBidWlsZClcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc0ZvckJ1aWxkKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hIHwgU2VydmVyQnVpbGRlck9wdGlvbnMsIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KTogUHJvbWlzZTxBbmd1bGFyQnVpbGRlck9wdGlvbnM+IHtcbiAgcmV0dXJuIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIEZvciBkZXYgc2VydmVyIChuZyBzZXJ2ZSlcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gY29udGV4dCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgYnVpbGRlckNvbmZpZzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpIHtcblxuICBjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhidWlsZGVyQ29uZmlnLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBwcm9jZXNzLmVudi5OT0RFX09QVElPTlMgPSAnLXIgJyArIFBhdGgucmVzb2x2ZShQYXRoLmRpcm5hbWUoX19kaXJuYW1lKSwgJ2ZvcmstdHNjaGVjay9mb3JrLXRzY2hlY2stcmVnaXN0ZXInKTtcbiAgaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0LCAnYnVpbGQnLCBicm93c2VyT3B0aW9ucyk7XG5cbiAgcHJvY2Vzcy5lbnYuX25nY2xpX3BsaW5rX2NmZyA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICBkZXBsb3lVcmw6IGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCxcbiAgICBiYXNlSHJlZjogYnJvd3Nlck9wdGlvbnMuYmFzZUhyZWZcbiAgfSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcmF3QnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hIHwgU2VydmVyQnVpbGRlck9wdGlvbnMsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBkZXZTZXJ2ZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgaG1yID0gZmFsc2UpIHtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnQ2hhbmdlIGJ1aWxkZXIgb3B0aW9ucycpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQobWdyID0+IG1nci5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICBpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcbiAgICAgIHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBkZXZTZXJ2ZXJDb25maWcpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBvYmo7XG4gIH0pKTtcblxuICBpZiAoIWJyb3dzZXJPcHRpb25zLmRlcGxveVVybClcbiAgICBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSAnLyc7XG4gIC8vIGlmIHN0YXRpYyBhc3NldHMncyBVUkwgaXMgbm90IGxlZCBieSAnLycsIGl0IHdpbGwgYmUgY29uc2lkZXJlZCBhcyByZWxhdGl2ZSBwYXRoIGluIG5nLWh0bWwtbG9hZGVyXG5cbiAgaWYgKGRldlNlcnZlckNvbmZpZykge1xuICAgIGNvbnN0IHBhcnNlZFVybCA9IFVybC5wYXJzZShicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwsIHRydWUsIHRydWUpO1xuICAgIGlmIChwYXJzZWRVcmwuaG9zdCA9PSBudWxsKSB7XG4gICAgICBwYXJzZWRVcmwuaG9zdG5hbWUgPSBnZXRMYW5JUHY0KCk7XG4gICAgICBwYXJzZWRVcmwucG9ydCA9IGRldlNlcnZlckNvbmZpZy5wb3J0ICsgJyc7XG4gICAgICBwYXJzZWRVcmwucHJvdG9jb2wgPSBkZXZTZXJ2ZXJDb25maWcgJiYgZGV2U2VydmVyQ29uZmlnLnNzbCA/ICdodHRwcycgOiAnaHR0cCc7XG4gICAgICByYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSBVcmwuZm9ybWF0KHBhcnNlZFVybCk7XG4gICAgICAvLyBUT0RPOiBwcmludCByaWdodCBhZnRlciBzZXJ2ZXIgaXMgc3VjY2Vzc2Z1bGx5IHN0YXJ0ZWRcbiAgICAgIHNldFRpbWVvdXQoKCkgPT5cbiAgICAgICAgY29uc29sZS5sb2coY2hhbGsucmVkKGBDdXJyZW50IGRldiBzZXJ2ZXIgcmVzb3VyY2UgaXMgaG9zdGVkIG9uICR7cGFyc2VkVXJsLmhvc3RuYW1lfSxcXG5pZiB5b3VyIG5ldHdvcmsgaXMgcmVjb25uZWN0ZWQgb3IgbG9jYWwgSVAgYWRkcmVzcyBpcyBgICtcbiAgICAgICAgJyBjaGFuZ2VkLCB5b3Ugd2lsbCBuZWVkIHRvIHJlc3RhcnQgdGhpcyBkZXYgc2VydmVyIScpKSwgNTAwMCk7XG4gICAgfVxuICAgIGlmIChwYXJzZWRVcmwucGF0aG5hbWUpXG4gICAgICBkZXZTZXJ2ZXJDb25maWcuc2VydmVQYXRoID0gcGFyc2VkVXJsLnBhdGhuYW1lOyAvLyBJbiBjYXNlIGRlcGxveVVybCBoYXMgaG9zdCwgbmcgY2xpIHdpbGwgcmVwb3J0IGVycm9yIGZvciBudWxsIHNlcnZlUGF0aFxuICB9XG5cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpIHtcbiAgICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHNcbiAgICAuZm9yRWFjaChmciA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhmcikuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlOiBzdHJpbmcgPSBmcltmaWVsZF07XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUodmFsdWUpKSB7XG4gICAgICAgICAgZnJbZmllbGRdID0gUGF0aC5yZWxhdGl2ZShjd2QsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgaWYgKHBrSnNvbikge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcbiAgICAvLyBjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTsgLy8gc3RhdGljIGFzc2V0cyBpbiBlbnRyeSBwYWNrYWdlIHNob3VsZCBhbHdheXMgYmUgb3V0cHV0IHRvIHJvb3QgcGF0aFxuICB9XG4gIC8vIEJlIGNvbXBhdGlibGUgdG8gb2xkIERSQ1AgYnVpbGQgdG9vbHNcbiAgY29uc3Qge2RlcGxveVVybH0gPSBicm93c2VyT3B0aW9ucztcbiAgaWYgKCFjb25maWcuZ2V0KCdzdGF0aWNBc3NldHNVUkwnKSlcbiAgICBjb25maWcuc2V0KCdzdGF0aWNBc3NldHNVUkwnLCBfLnRyaW1FbmQoZGVwbG95VXJsLCAnLycpKTtcbiAgaWYgKCFjb25maWcuZ2V0KCdwdWJsaWNQYXRoJykpXG4gICAgY29uZmlnLnNldCgncHVibGljUGF0aCcsIGRlcGxveVVybCk7XG5cbiAgY29uc3QgbWFpbkhtciA9IGNyZWF0ZU1haW5GaWxlRm9ySG1yKGJyb3dzZXJPcHRpb25zLm1haW4pO1xuICBpZiAoaG1yICYmIGRldlNlcnZlckNvbmZpZykge1xuICAgIGRldlNlcnZlckNvbmZpZy5obXIgPSB0cnVlO1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cylcbiAgICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMgPSBbXTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgcmVwbGFjZTogYnJvd3Nlck9wdGlvbnMubWFpbixcbiAgICAgIHdpdGg6IFBhdGgucmVsYXRpdmUoJy4nLCBtYWluSG1yKVxuICAgIH0pO1xuICB9XG4gIGlmIChicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9PSBudWxsKSB7XG4gICAgYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPSB7fTtcbiAgfVxuXG4gIGJyb3dzZXJPcHRpb25zLmNvbW1vbkNodW5rID0gZmFsc2U7XG5cbiAgY29uc3QgcGFja2FnZXNJbmZvID0gaW5qZWN0b3JTZXR1cChicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwsIGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmKTtcbiAgYXdhaXQgaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbyk7XG5cblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnc2V0dGluZyB1cCBhc3NldHMgb3B0aW9ucycpO1xuICAvLyBCZWNhdXNlIGRldi1zZXJ2ZS1hc3NldHMgZGVwZW5kcyBvbiBEUkNQIGFwaSwgSSBoYXZlIHRvIGxhenkgbG9hZCBpdC5cbiAgY29uc3QgZm9yRWFjaEFzc2V0c0RpcjogdHlwZW9mIHBhY2thZ2VBc3NldHNGb2xkZXJzID1cbiAgcmVxdWlyZSgnQHdmaC9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLnBhY2thZ2VBc3NldHNGb2xkZXJzO1xuICBmb3JFYWNoQXNzZXRzRGlyKCcvJywgKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmFzc2V0cykge1xuICAgICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzID0gW107XG4gICAgfVxuICAgIGxldCBpbnB1dCA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5wdXREaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWlucHV0LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgaW5wdXQgPSAnLi8nICsgaW5wdXQ7XG4gICAgfVxuICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cy5wdXNoKHtcbiAgICAgIGlucHV0LFxuICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgb3V0cHV0OiBvdXRwdXREaXIuZW5kc1dpdGgoJy8nKSA/IG91dHB1dERpciA6IG91dHB1dERpciArICcvJ1xuICAgIH0pO1xuICB9KTtcbiAgZnMud3JpdGVGaWxlKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICdhbmd1bGFyLWNsaS1vcHRpb25zLmpzb24nKSxcbiAgSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMsIHVuZGVmaW5lZCwgJyAgJyksICgpID0+IHt9KTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5hc3luYyBmdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlc0luZm86IFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+KSB7XG5cbiAgLy8gV2Ugd2FudCB0byBoYWNrIHRoZSB0eXBlc2NyaXB0IHVzZWQgaW4gY3VycmVudCB3b3Jrc3BhY2UsIG5vdCB0aGUgb25lIGZyb20gUGxpbmsncyBkZXBlbmRlbmN5XG4gIGNvbnN0IHN5cyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvdHlwZXNjcmlwdCcpKS5zeXMgYXMgdHlwZW9mIHRzLnN5cztcbiAgY29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG4gIGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cbiAgY29uc3QgdXNlVGhyZWFkID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLnVzZVRocmVhZCcsIHRydWUpO1xuICBjb25zdCBuZXdUc0NvbmZpZyA9IHVzZVRocmVhZCA/XG4gICAgYXdhaXQgY3JlYXRlVHNDb25maWdJbldvcmtlcih0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbykgOlxuICAgIGNyZWF0ZVRzQ29uZmlnU3luYyh0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbyk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHNjb25maWcuanNvbicpLCBuZXdUc0NvbmZpZywgKCkgPT4ge1xuICB9KTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKSB7XG4gICAgICAgIHJldHVybiBuZXdUc0NvbmZpZztcbiAgICAgIH0gZWxzZVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHNDb25maWdTeW5jKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPikge1xuICBjb25zdCB7Y3JlYXRlVHNDb25maWd9ID0gcmVxdWlyZSgnLi9jaGFuZ2UtdHNjb25maWcnKSBhcyB7Y3JlYXRlVHNDb25maWc6IHR5cGVvZiBfY3JlYXRlVHNDb25maWd9O1xuICBtZW1zdGF0cygpO1xuICByZXR1cm4gY3JlYXRlVHNDb25maWcodHNjb25maWdGaWxlLCBicm93c2VyT3B0aW9ucywgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JykpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPikge1xuXG4gIGNvbnN0IHJlcG9ydERpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcpO1xuXG4gIG1lbXN0YXRzKCk7XG4gIGNvbnN0IHdvcmtlckxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQHdmaC9uZy1hcHAtYnVpbGRlci53b3JrZXInKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqKSA9PiB7XG5cbiAgICBjb25zdCB3b3JrZXJEYXRhOiBEYXRhID0ge1xuICAgICAgdHNjb25maWdGaWxlLFxuICAgICAgcmVwb3J0RGlyLFxuICAgICAgbmdPcHRpb25zOiB7XG4gICAgICAgIHByZXNlcnZlU3ltbGlua3M6IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MsXG4gICAgICAgIG1haW46IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykpXG4gICAgICB9LFxuICAgICAgZHJjcEJ1aWxkZXJPcHRpb25zOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHtkcmNwQXJnczogYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MsIGRyY3BDb25maWc6IGJyb3dzZXJPcHRpb25zLmRyY3BDb25maWd9KSkgYXMgRHJjcEJ1aWxkZXJPcHRpb25zLFxuICAgICAgYmFzZUhyZWY6IGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgZGVwbG95VXJsOiBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmxcbiAgICB9O1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXIuanMnKSwge3dvcmtlckRhdGF9KTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgcmVqKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCAobXNnKSA9PiB7XG4gICAgICBpZiAobXNnLmxvZykge1xuICAgICAgICB3b3JrZXJMb2cuaW5mbyhtc2cubG9nKTtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cucmVzdWx0KSB7XG4gICAgICAgIHJlc29sdmUobXNnLnJlc3VsdCk7XG4gICAgICB9XG4gICAgICAvLyB3b3JrZXIub2ZmKCdlcnJvcicsIHJlaik7XG4gICAgfSk7XG4gICAgd29ya2VyLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3dvcmtlciBleGl0cycpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuXG4iXX0=