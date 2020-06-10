"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const architect_1 = require("@angular-devkit/architect");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const network_util_1 = require("dr-comp-package/wfh/dist/utils/network-util");
// import { getTsDirsOfPackage } from 'dr-comp-package/wfh/dist/utils';
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const worker_threads_1 = require("worker_threads");
const typescript_1 = require("typescript");
const url_1 = tslib_1.__importDefault(require("url"));
const injector_setup_1 = tslib_1.__importDefault(require("./injector-setup"));
const mem_stats_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/utils/mem-stats"));
const for_hmr_1 = require("./for-hmr");
const { cyan, green, red } = chalk_1.default;
const currPackageName = require('../../package.json').name;
const log = require('log4js').getLogger('@dr-core/ng-app-builder.change-cli-options');
function hackAngularBuilderContext(context, targetName, replacedOpts) {
    const getTargetOptions = context.getTargetOptions;
    context.getTargetOptions = function (target) {
        return tslib_1.__awaiter(this, arguments, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
        const packagesInfo = yield injector_setup_1.default(config, browserOptions);
        yield hackTsConfig(browserOptions, config, packagesInfo);
        context.reportStatus('setting up assets options');
        // Because dev-serve-assets depends on DRCP api, I have to lazy load it.
        const forEachAssetsDir = require('@dr-core/assets-processer/dist/dev-serve-assets').packageAssetsFolders;
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
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    const workerLog = require('log4js').getLogger('@dr-core/ng-app-builder.worker');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBMEI7QUFFMUIsOEVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixtREFBc0M7QUFDdEMsMkNBQWlDO0FBQ2pDLHNEQUFzQjtBQUV0Qiw4RUFBNkM7QUFHN0MsaUdBQWdFO0FBR2hFLHVDQUErQztBQUUvQyxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxlQUFLLENBQUM7QUFDakMsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQUt0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDNUUsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQsT0FBTyxDQUFDLGdCQUFnQixHQUFHLFVBQWUsTUFBYzs7WUFDdEQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtnQkFDaEMsdURBQXVEO2dCQUN2RCxPQUFPLFlBQVksQ0FBQzthQUNyQjtZQUNELE1BQU0sVUFBVSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNwRSxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDO0tBQUEsQ0FBQztBQUNKLENBQUM7QUFDRDs7OztHQUlHO0FBQ0gsU0FBc0IsK0JBQStCLENBQUMsTUFBa0IsRUFDdEUsY0FBMkQsRUFBRSxPQUF1Qjs7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QUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMzQixJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUU7Z0JBQ1gsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDekI7WUFDRCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEVBQUU7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQzthQUNyQjtZQUNELDRCQUE0QjtRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7IHBhY2thZ2VBc3NldHNGb2xkZXJzIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0TGFuSVB2NCB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1dvcmtlcn0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHsgc3lzIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgaW5qZWN0b3JTZXR1cCBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB7IERyY3BCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4uLy4uL2Rpc3Qvc2VydmVyJztcbmltcG9ydCB7RGF0YX0gZnJvbSAnLi9jaGFuZ2UtdHNjb25maWctd29ya2VyJztcbmltcG9ydCBtZW1zdGF0cyBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcbmltcG9ydCB7Y3JlYXRlVHNDb25maWcgYXMgX2NyZWF0ZVRzQ29uZmlnfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZyc7XG5pbXBvcnQge0FuZ3VsYXJDb25maWdIYW5kbGVyfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHtjcmVhdGVNYWluRmlsZUZvckhtcn0gZnJvbSAnLi9mb3ItaG1yJztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gY2hhbGs7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcblxudHlwZSBFeHRyYWN0UHJvbWlzZTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuICByZXBsYWNlZE9wdHM6IGFueSkge1xuICBjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG4gIGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgIC8vIGxvZy5pbmZvKCdBbmd1bGFyIGNsaSBidWlsZCBvcHRpb25zJywgcmVwbGFjZWRPcHRzKTtcbiAgICAgIHJldHVybiByZXBsYWNlZE9wdHM7XG4gICAgfVxuICAgIGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9yaWdPcHRpb247XG4gIH07XG59XG4vKipcbiAqIEZvciBidWlsZCAobmcgYnVpbGQpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSB8IFNlcnZlckJ1aWxkZXJPcHRpb25zLCBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCk6IFByb21pc2U8QW5ndWxhckJ1aWxkZXJPcHRpb25zPiB7XG4gIHJldHVybiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zLCBjb250ZXh0KTtcbn1cblxuLyoqXG4gKiBGb3IgZGV2IHNlcnZlciAobmcgc2VydmUpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGNvbnRleHQgXG4gKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGJ1aWxkZXJDb25maWc6IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG5cbiAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcoYnVpbGRlckNvbmZpZyEuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IHJhd0Jyb3dzZXJPcHRpb25zID0gYXdhaXQgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zKGJyb3dzZXJUYXJnZXQpIGFzIGFueSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYTtcbiAgaWYgKCFyYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuXG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gYXdhaXQgcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gICAgY29uZmlnLCByYXdCcm93c2VyT3B0aW9ucywgY29udGV4dCwgYnVpbGRlckNvbmZpZywgdHJ1ZSk7XG4gIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dCwgJ2J1aWxkJywgYnJvd3Nlck9wdGlvbnMpO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHJhd0Jyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSB8IFNlcnZlckJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgZGV2U2VydmVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIGhtciA9IGZhbHNlKSB7XG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ0NoYW5nZSBidWlsZGVyIG9wdGlvbnMnKTtcbiAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSByYXdCcm93c2VyT3B0aW9ucyBhcyBBbmd1bGFyQnVpbGRlck9wdGlvbnM7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBbJ2RlcGxveVVybCcsICdvdXRwdXRQYXRoJywgJ3N0eWxlcyddKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KFtjdXJyUGFja2FnZU5hbWUsIHByb3BdKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgKHJhd0Jyb3dzZXJPcHRpb25zIGFzIGFueSlbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIGNvbnNvbGUubG9nKGN1cnJQYWNrYWdlTmFtZSArICcgLSBvdmVycmlkZSAlczogJXMnLCBwcm9wLCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICBpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcbiAgICAgIHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBkZXZTZXJ2ZXJDb25maWcpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBvYmo7XG4gIH0pO1xuXG4gIGlmICghYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcbiAgLy8gaWYgc3RhdGljIGFzc2V0cydzIFVSTCBpcyBub3QgbGVkIGJ5ICcvJywgaXQgd2lsbCBiZSBjb25zaWRlcmVkIGFzIHJlbGF0aXZlIHBhdGggaW4gbmctaHRtbC1sb2FkZXJcblxuICBpZiAoZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gVXJsLnBhcnNlKGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgaWYgKHBhcnNlZFVybC5ob3N0ID09IG51bGwpIHtcbiAgICAgIHBhcnNlZFVybC5ob3N0bmFtZSA9IGdldExhbklQdjQoKTtcbiAgICAgIHBhcnNlZFVybC5wb3J0ID0gZGV2U2VydmVyQ29uZmlnLnBvcnQgKyAnJztcbiAgICAgIHBhcnNlZFVybC5wcm90b2NvbCA9IGRldlNlcnZlckNvbmZpZyAmJiBkZXZTZXJ2ZXJDb25maWcuc3NsID8gJ2h0dHBzJyA6ICdodHRwJztcbiAgICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9IFVybC5mb3JtYXQocGFyc2VkVXJsKTtcbiAgICAgIC8vIFRPRE86IHByaW50IHJpZ2h0IGFmdGVyIHNlcnZlciBpcyBzdWNjZXNzZnVsbHkgc3RhcnRlZFxuICAgICAgc2V0VGltZW91dCgoKSA9PlxuICAgICAgICBjb25zb2xlLmxvZyhjaGFsay5yZWQoYEN1cnJlbnQgZGV2IHNlcnZlciByZXNvdXJjZSBpcyBob3N0ZWQgb24gJHtwYXJzZWRVcmwuaG9zdG5hbWV9LFxcbmlmIHlvdXIgbmV0d29yayBpcyByZWNvbm5lY3RlZCBvciBsb2NhbCBJUCBhZGRyZXNzIGlzIGAgK1xuICAgICAgICAnIGNoYW5nZWQsIHlvdSB3aWxsIG5lZWQgdG8gcmVzdGFydCB0aGlzIGRldiBzZXJ2ZXIhJykpLCA1MDAwKTtcbiAgICB9XG4gICAgaWYgKHBhcnNlZFVybC5wYXRobmFtZSlcbiAgICAgIGRldlNlcnZlckNvbmZpZy5zZXJ2ZVBhdGggPSBwYXJzZWRVcmwucGF0aG5hbWU7IC8vIEluIGNhc2UgZGVwbG95VXJsIGhhcyBob3N0LCBuZyBjbGkgd2lsbCByZXBvcnQgZXJyb3IgZm9yIG51bGwgc2VydmVQYXRoXG4gIH1cblxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykge1xuICAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50c1xuICAgIC5mb3JFYWNoKGZyID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGZyKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWU6IHN0cmluZyA9IGZyW2ZpZWxkXTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICBmcltmaWVsZF0gPSBQYXRoLnJlbGF0aXZlKGN3ZCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBpZiAocGtKc29uKSB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuICAgIGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpOyAvLyBzdGF0aWMgYXNzZXRzIGluIGVudHJ5IHBhY2thZ2Ugc2hvdWxkIGFsd2F5cyBiZSBvdXRwdXQgdG8gcm9vdCBwYXRoXG4gIH1cbiAgLy8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuICBjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuICAgIGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcbiAgICBjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblxuICBjb25zdCBtYWluSG1yID0gY3JlYXRlTWFpbkZpbGVGb3JIbXIoYnJvd3Nlck9wdGlvbnMubWFpbik7XG4gIGlmIChobXIgJiYgZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgZGV2U2VydmVyQ29uZmlnLmhtciA9IHRydWU7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKVxuICAgICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyA9IFtdO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICByZXBsYWNlOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgd2l0aDogUGF0aC5yZWxhdGl2ZSgnLicsIG1haW5IbXIpXG4gICAgfSk7XG4gIH1cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID09IG51bGwpIHtcbiAgICBicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9IHt9O1xuICB9XG5cbiAgYnJvd3Nlck9wdGlvbnMuY29tbW9uQ2h1bmsgPSBmYWxzZTtcblxuICBjb25zdCBwYWNrYWdlc0luZm8gPSBhd2FpdCBpbmplY3RvclNldHVwKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMpO1xuICBhd2FpdCBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcblxuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdzZXR0aW5nIHVwIGFzc2V0cyBvcHRpb25zJyk7XG4gIC8vIEJlY2F1c2UgZGV2LXNlcnZlLWFzc2V0cyBkZXBlbmRzIG9uIERSQ1AgYXBpLCBJIGhhdmUgdG8gbGF6eSBsb2FkIGl0LlxuICBjb25zdCBmb3JFYWNoQXNzZXRzRGlyOiB0eXBlb2YgcGFja2FnZUFzc2V0c0ZvbGRlcnMgPVxuICByZXF1aXJlKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLnBhY2thZ2VBc3NldHNGb2xkZXJzO1xuICBmb3JFYWNoQXNzZXRzRGlyKCcvJywgKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmFzc2V0cykge1xuICAgICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzID0gW107XG4gICAgfVxuICAgIGxldCBpbnB1dCA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5wdXREaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWlucHV0LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgaW5wdXQgPSAnLi8nICsgaW5wdXQ7XG4gICAgfVxuICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyEucHVzaCh7XG4gICAgICBpbnB1dCxcbiAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgIG91dHB1dDogb3V0cHV0RGlyLmVuZHNXaXRoKCcvJykgPyBvdXRwdXREaXIgOiBvdXRwdXREaXIgKyAnLydcbiAgICB9KTtcbiAgfSk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAnYW5ndWxhci1jbGktb3B0aW9ucy5qc29uJyksXG4gIEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLCB1bmRlZmluZWQsICcgICcpLCAoKSA9PiB7fSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuLy8gSGFjayB0cy5zeXMsIHNvIGZhciBpdCBpcyB1c2VkIHRvIHJlYWQgdHNjb25maWcuanNvblxuYXN5bmMgZnVuY3Rpb24gaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcGFja2FnZXNJbmZvOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPj4pIHtcblxuICBjb25zdCBvbGRSZWFkRmlsZSA9IHN5cy5yZWFkRmlsZTtcbiAgY29uc3QgdHNDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLnRzQ29uZmlnKTtcblxuICBjb25zdCB1c2VUaHJlYWQgPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcudXNlVGhyZWFkJywgdHJ1ZSk7XG4gIGNvbnN0IG5ld1RzQ29uZmlnID0gdXNlVGhyZWFkID9cbiAgICBhd2FpdCBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzQ29uZmlnRmlsZSwgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKSA6XG4gICAgY3JlYXRlVHNDb25maWdTeW5jKHRzQ29uZmlnRmlsZSwgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcbiAgZnMud3JpdGVGaWxlKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd0c2NvbmZpZy5qc29uJyksIG5ld1RzQ29uZmlnLCAoKSA9PiB7XG4gIH0pO1xuXG4gIHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICAvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuICAgICAgLy8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG4gICAgICAvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcbiAgICAgIC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG4gICAgICAgIHJldHVybiBuZXdUc0NvbmZpZztcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IocmVkKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBSZWFkICR7cGF0aH1gLCBlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZShwayk7XG4gICAgfSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnU3luYyh0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlSW5mbzogRXh0cmFjdFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgaW5qZWN0b3JTZXR1cD4+KSB7XG4gIGNvbnN0IHtjcmVhdGVUc0NvbmZpZ30gPSByZXF1aXJlKCcuL2NoYW5nZS10c2NvbmZpZycpIGFzIHtjcmVhdGVUc0NvbmZpZzogdHlwZW9mIF9jcmVhdGVUc0NvbmZpZ307XG4gIG1lbXN0YXRzKCk7XG4gIHJldHVybiBjcmVhdGVUc0NvbmZpZyh0c2NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSksXG4gICAgcGFja2FnZUluZm8sIGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcpKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHNDb25maWdJbldvcmtlcih0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlSW5mbzogRXh0cmFjdFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgaW5qZWN0b3JTZXR1cD4+KSB7XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0Jyk7XG5cbiAgbWVtc3RhdHMoKTtcbiAgY29uc3Qgd29ya2VyTG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci53b3JrZXInKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqKSA9PiB7XG5cbiAgICBjb25zdCB3b3JrZXJEYXRhOiBEYXRhID0ge1xuICAgICAgdHNjb25maWdGaWxlLFxuICAgICAgcmVwb3J0RGlyLFxuICAgICAgY29uZmlnOiBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSksXG4gICAgICBuZ09wdGlvbnM6IHtcbiAgICAgICAgcHJlc2VydmVTeW1saW5rczogYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgbWFpbjogYnJvd3Nlck9wdGlvbnMubWFpbixcbiAgICAgICAgZmlsZVJlcGxhY2VtZW50czogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSlcbiAgICAgIH0sXG4gICAgICBwYWNrYWdlSW5mbyxcbiAgICAgIGRyY3BCdWlsZGVyT3B0aW9uczogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh7ZHJjcEFyZ3M6IGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnOiBicm93c2VyT3B0aW9ucy5kcmNwQ29uZmlnfSkpIGFzIERyY3BCdWlsZGVyT3B0aW9ucyxcbiAgICAgIGJhc2VIcmVmOiBicm93c2VyT3B0aW9ucy5iYXNlSHJlZixcbiAgICAgIGRlcGxveVVybDogYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsXG4gICAgfTtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi9jaGFuZ2UtdHNjb25maWctd29ya2VyLmpzJyksIHt3b3JrZXJEYXRhfSk7XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIHJlaik7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuICAgICAgaWYgKG1zZy5sb2cpIHtcbiAgICAgICAgd29ya2VyTG9nLmluZm8obXNnLmxvZyk7XG4gICAgICB9XG4gICAgICBpZiAobXNnLnJlc3VsdCkge1xuICAgICAgICByZXNvbHZlKG1zZy5yZXN1bHQpO1xuICAgICAgfVxuICAgICAgLy8gd29ya2VyLm9mZignZXJyb3InLCByZWopO1xuICAgIH0pO1xuICAgIHdvcmtlci5vbignZXhpdCcsICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCd3b3JrZXIgZXhpdHMnKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cblxuIl19
