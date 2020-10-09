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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const typescript_1 = require("typescript");
const url_1 = __importDefault(require("url"));
const injector_setup_1 = __importDefault(require("./injector-setup"));
const mem_stats_1 = __importDefault(require("@wfh/plink/wfh/dist/utils/mem-stats"));
const for_hmr_1 = require("./for-hmr");
const { cyan, green, red } = chalk_1.default;
const currPackageName = require('../../package.json').name;
const log = require('log4js').getLogger('@wfh/ng-app-builder.change-cli-options');
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
        hackAngularBuilderContext(context, 'build', browserOptions);
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
        const packagesInfo = yield injector_setup_1.default(browserOptions);
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
        const oldReadFile = typescript_1.sys.readFile;
        const tsConfigFile = Path.resolve(browserOptions.tsConfig);
        const useThread = config.get(currPackageName + '.useThread', true);
        const newTsConfig = useThread ?
            yield createTsConfigInWorker(tsConfigFile, browserOptions, config, packagesInfo) :
            createTsConfigSync(tsConfigFile, browserOptions, config, packagesInfo);
        fs.writeFile(config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json'), newTsConfig, () => {
        });
        typescript_1.sys.readFile = function (path, encoding) {
            const res = oldReadFile.apply(typescript_1.sys, arguments);
            if (Path.sep === '\\') {
                // Angular somehow reads tsconfig.json twice and passes in `path`
                // with different path seperator `\` and `/` in Windows 
                // `cachedTsConfigFor` is lodash memoize function which needs a
                // consistent `path` value as cache key
                path = path.replace(/\//g, Path.sep);
            }
            try {
                if (path === tsConfigFile)
                    return newTsConfig;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQix5REFBMkY7QUFLM0Ysa0RBQTBCO0FBRTFCLHlFQUFvRTtBQUNwRSxrRUFBa0U7QUFDbEUsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QiwyQ0FBNkI7QUFDN0IsbURBQXNDO0FBQ3RDLDJDQUFpQztBQUNqQyw4Q0FBc0I7QUFFdEIsc0VBQTZDO0FBRzdDLG9GQUEyRDtBQUczRCx1Q0FBK0M7QUFFL0MsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFLbEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztB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R0FBRyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMzQixJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ1gsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDekI7WUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNyQjtZQUNELDRCQUE0QjtRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6ImRpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOltudWxsXX0=
