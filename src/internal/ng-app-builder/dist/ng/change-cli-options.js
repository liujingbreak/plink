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
const typescript_1 = tslib_1.__importStar(require("typescript"));
const url_1 = tslib_1.__importDefault(require("url"));
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const ts_ast_query_1 = tslib_1.__importDefault(require("../utils/ts-ast-query"));
const injector_setup_1 = tslib_1.__importDefault(require("./injector-setup"));
const mem_stats_1 = tslib_1.__importDefault(require("dr-comp-package/wfh/dist/utils/mem-stats"));
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
        const mainHmr = createMainFileForHmr(browserOptions.main);
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
function createMainFileForHmr(mainFile) {
    const dir = Path.dirname(mainFile);
    const writeTo = Path.resolve(dir, 'main-hmr.ts');
    if (fs.existsSync(writeTo)) {
        return writeTo;
    }
    const main = fs.readFileSync(mainFile, 'utf8');
    let mainHmr = '// tslint:disable\n' +
        `import hmrBootstrap from '@dr-core/ng-app-builder/src/hmr';\n${main}`;
    const query = new ts_ast_query_1.default(mainHmr, 'main-hmr.ts');
    // query.printAll();
    let bootCallAst;
    const statement = query.src.statements.find(statement => {
        // tslint:disable-next-line max-line-length
        const bootCall = query.findMapTo(statement, ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
            if (ast.text === 'platformBrowserDynamic' &&
                ast.parent.parent.name.getText(query.src) === 'bootstrapModule' &&
                ast.parent.parent.parent.kind === typescript_1.default.SyntaxKind.CallExpression) {
                return ast.parent.parent.parent;
            }
        });
        if (bootCall) {
            bootCallAst = bootCall;
            return true;
        }
        return false;
    });
    if (statement == null)
        throw new Error(`${mainFile},` +
            `can not find statement like: platformBrowserDynamic().bootstrapModule(AppModule)\n${mainHmr}`);
    mainHmr = patch_text_1.default(mainHmr, [{
            start: statement.getStart(query.src, true),
            end: statement.getEnd(),
            text: ''
        }]);
    mainHmr += `const bootstrap = () => ${bootCallAst.getText()};\n`;
    mainHmr += `if (module[ 'hot' ]) {
	    hmrBootstrap(module, bootstrap);
	  } else {
	    console.error('HMR is not enabled for webpack-dev-server!');
	    console.log('Are you using the --hmr flag for ng serve?');
	  }\n`.replace(/^\t/gm, '');
    fs.writeFileSync(writeTo, mainHmr);
    log.info('Write ' + writeTo);
    log.info(mainHmr);
    return writeTo;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBMEI7QUFFMUIsOEVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixtREFBc0M7QUFDdEMsaUVBQXFDO0FBQ3JDLHNEQUFzQjtBQUN0Qiw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUE2QztBQUc3QyxpR0FBZ0U7QUFJaEUsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFLdEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQTJE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QyxNQUFNLENBQUMsQ0FBQzthQUNyQjtZQUNELDRCQUE0QjtRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7IHBhY2thZ2VBc3NldHNGb2xkZXJzIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0TGFuSVB2NCB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1dvcmtlcn0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHRzLCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCBpbmplY3RvclNldHVwIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHsgRHJjcEJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vLi4vZGlzdC9zZXJ2ZXInO1xuaW1wb3J0IHtEYXRhfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXInO1xuaW1wb3J0IG1lbXN0YXRzIGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IHtjcmVhdGVUc0NvbmZpZyBhcyBfY3JlYXRlVHNDb25maWd9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcbmltcG9ydCB7QW5ndWxhckNvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5cbmNvbnN0IHtjeWFuLCBncmVlbiwgcmVkfSA9IGNoYWxrO1xuY29uc3QgY3VyclBhY2thZ2VOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5cbnR5cGUgRXh0cmFjdFByb21pc2U8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5cbmZ1bmN0aW9uIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHRhcmdldE5hbWU6IHN0cmluZyxcbiAgcmVwbGFjZWRPcHRzOiBhbnkpIHtcbiAgY29uc3QgZ2V0VGFyZ2V0T3B0aW9ucyA9IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucztcblxuICBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMgPSBhc3luYyBmdW5jdGlvbih0YXJnZXQ6IFRhcmdldCkge1xuICAgIGlmICh0YXJnZXQudGFyZ2V0ID09PSB0YXJnZXROYW1lKSB7XG4gICAgICAvLyBsb2cuaW5mbygnQW5ndWxhciBjbGkgYnVpbGQgb3B0aW9ucycsIHJlcGxhY2VkT3B0cyk7XG4gICAgICByZXR1cm4gcmVwbGFjZWRPcHRzO1xuICAgIH1cbiAgICBjb25zdCBvcmlnT3B0aW9uID0gYXdhaXQgZ2V0VGFyZ2V0T3B0aW9ucy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBvcmlnT3B0aW9uO1xuICB9O1xufVxuLyoqXG4gKiBGb3IgYnVpbGQgKG5nIGJ1aWxkKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEgfCBTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgY29udGV4dDogQnVpbGRlckNvbnRleHQpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuICByZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucywgY29udGV4dCk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBidWlsZGVyQ29uZmlnOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucykge1xuXG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKGJ1aWxkZXJDb25maWchLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICAgIGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICByYXdCcm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEgfCBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGRldlNlcnZlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBobXIgPSBmYWxzZSkge1xuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdDaGFuZ2UgYnVpbGRlciBvcHRpb25zJyk7XG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gcmF3QnJvd3Nlck9wdGlvbnMgYXMgQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgWydkZXBsb3lVcmwnLCAnb3V0cHV0UGF0aCcsICdzdHlsZXMnXSkge1xuICAgIGNvbnN0IHZhbHVlID0gY29uZmlnLmdldChbY3VyclBhY2thZ2VOYW1lLCBwcm9wXSk7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIChyYXdCcm93c2VyT3B0aW9ucyBhcyBhbnkpW3Byb3BdID0gdmFsdWU7XG4gICAgICBjb25zb2xlLmxvZyhjdXJyUGFja2FnZU5hbWUgKyAnIC0gb3ZlcnJpZGUgJXM6ICVzJywgcHJvcCwgdmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxBbmd1bGFyQ29uZmlnSGFuZGxlcj4oKGZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgaWYgKGhhbmRsZXIuYW5ndWxhckpzb24pXG4gICAgICByZXR1cm4gaGFuZGxlci5hbmd1bGFySnNvbihicm93c2VyT3B0aW9ucywgZGV2U2VydmVyQ29uZmlnKTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gb2JqO1xuICB9KTtcblxuICBpZiAoIWJyb3dzZXJPcHRpb25zLmRlcGxveVVybClcbiAgICBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSAnLyc7XG4gIC8vIGlmIHN0YXRpYyBhc3NldHMncyBVUkwgaXMgbm90IGxlZCBieSAnLycsIGl0IHdpbGwgYmUgY29uc2lkZXJlZCBhcyByZWxhdGl2ZSBwYXRoIGluIG5nLWh0bWwtbG9hZGVyXG5cbiAgaWYgKGRldlNlcnZlckNvbmZpZykge1xuICAgIGNvbnN0IHBhcnNlZFVybCA9IFVybC5wYXJzZShicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwsIHRydWUsIHRydWUpO1xuICAgIGlmIChwYXJzZWRVcmwuaG9zdCA9PSBudWxsKSB7XG4gICAgICBwYXJzZWRVcmwuaG9zdG5hbWUgPSBnZXRMYW5JUHY0KCk7XG4gICAgICBwYXJzZWRVcmwucG9ydCA9IGRldlNlcnZlckNvbmZpZy5wb3J0ICsgJyc7XG4gICAgICBwYXJzZWRVcmwucHJvdG9jb2wgPSBkZXZTZXJ2ZXJDb25maWcgJiYgZGV2U2VydmVyQ29uZmlnLnNzbCA/ICdodHRwcycgOiAnaHR0cCc7XG4gICAgICByYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSBVcmwuZm9ybWF0KHBhcnNlZFVybCk7XG4gICAgICAvLyBUT0RPOiBwcmludCByaWdodCBhZnRlciBzZXJ2ZXIgaXMgc3VjY2Vzc2Z1bGx5IHN0YXJ0ZWRcbiAgICAgIHNldFRpbWVvdXQoKCkgPT5cbiAgICAgICAgY29uc29sZS5sb2coY2hhbGsucmVkKGBDdXJyZW50IGRldiBzZXJ2ZXIgcmVzb3VyY2UgaXMgaG9zdGVkIG9uICR7cGFyc2VkVXJsLmhvc3RuYW1lfSxcXG5pZiB5b3VyIG5ldHdvcmsgaXMgcmVjb25uZWN0ZWQgb3IgbG9jYWwgSVAgYWRkcmVzcyBpcyBgICtcbiAgICAgICAgJyBjaGFuZ2VkLCB5b3Ugd2lsbCBuZWVkIHRvIHJlc3RhcnQgdGhpcyBkZXYgc2VydmVyIScpKSwgNTAwMCk7XG4gICAgfVxuICAgIGlmIChwYXJzZWRVcmwucGF0aG5hbWUpXG4gICAgICBkZXZTZXJ2ZXJDb25maWcuc2VydmVQYXRoID0gcGFyc2VkVXJsLnBhdGhuYW1lOyAvLyBJbiBjYXNlIGRlcGxveVVybCBoYXMgaG9zdCwgbmcgY2xpIHdpbGwgcmVwb3J0IGVycm9yIGZvciBudWxsIHNlcnZlUGF0aFxuICB9XG5cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpIHtcbiAgICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHNcbiAgICAuZm9yRWFjaChmciA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhmcikuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlOiBzdHJpbmcgPSBmcltmaWVsZF07XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUodmFsdWUpKSB7XG4gICAgICAgICAgZnJbZmllbGRdID0gUGF0aC5yZWxhdGl2ZShjd2QsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgaWYgKHBrSnNvbikge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcbiAgICBjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTsgLy8gc3RhdGljIGFzc2V0cyBpbiBlbnRyeSBwYWNrYWdlIHNob3VsZCBhbHdheXMgYmUgb3V0cHV0IHRvIHJvb3QgcGF0aFxuICB9XG4gIC8vIEJlIGNvbXBhdGlibGUgdG8gb2xkIERSQ1AgYnVpbGQgdG9vbHNcbiAgY29uc3Qge2RlcGxveVVybH0gPSBicm93c2VyT3B0aW9ucztcbiAgaWYgKCFjb25maWcuZ2V0KCdzdGF0aWNBc3NldHNVUkwnKSlcbiAgICBjb25maWcuc2V0KCdzdGF0aWNBc3NldHNVUkwnLCBfLnRyaW1FbmQoZGVwbG95VXJsLCAnLycpKTtcbiAgaWYgKCFjb25maWcuZ2V0KCdwdWJsaWNQYXRoJykpXG4gICAgY29uZmlnLnNldCgncHVibGljUGF0aCcsIGRlcGxveVVybCk7XG5cbiAgY29uc3QgbWFpbkhtciA9IGNyZWF0ZU1haW5GaWxlRm9ySG1yKGJyb3dzZXJPcHRpb25zLm1haW4pO1xuICBpZiAoaG1yICYmIGRldlNlcnZlckNvbmZpZykge1xuICAgIGRldlNlcnZlckNvbmZpZy5obXIgPSB0cnVlO1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cylcbiAgICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMgPSBbXTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgcmVwbGFjZTogYnJvd3Nlck9wdGlvbnMubWFpbixcbiAgICAgIHdpdGg6IFBhdGgucmVsYXRpdmUoJy4nLCBtYWluSG1yKVxuICAgIH0pO1xuICB9XG4gIGlmIChicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9PSBudWxsKSB7XG4gICAgYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPSB7fTtcbiAgfVxuXG4gIGJyb3dzZXJPcHRpb25zLmNvbW1vbkNodW5rID0gZmFsc2U7XG5cbiAgY29uc3QgcGFja2FnZXNJbmZvID0gYXdhaXQgaW5qZWN0b3JTZXR1cChjb25maWcsIGJyb3dzZXJPcHRpb25zKTtcbiAgYXdhaXQgaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbyk7XG5cblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnc2V0dGluZyB1cCBhc3NldHMgb3B0aW9ucycpO1xuICAvLyBCZWNhdXNlIGRldi1zZXJ2ZS1hc3NldHMgZGVwZW5kcyBvbiBEUkNQIGFwaSwgSSBoYXZlIHRvIGxhenkgbG9hZCBpdC5cbiAgY29uc3QgZm9yRWFjaEFzc2V0c0RpcjogdHlwZW9mIHBhY2thZ2VBc3NldHNGb2xkZXJzID1cbiAgcmVxdWlyZSgnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnKS5wYWNrYWdlQXNzZXRzRm9sZGVycztcbiAgZm9yRWFjaEFzc2V0c0RpcignLycsIChpbnB1dERpciwgb3V0cHV0RGlyKSA9PiB7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5hc3NldHMpIHtcbiAgICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyA9IFtdO1xuICAgIH1cbiAgICBsZXQgaW5wdXQgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGlucHV0RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCFpbnB1dC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGlucHV0ID0gJy4vJyArIGlucHV0O1xuICAgIH1cbiAgICBicm93c2VyT3B0aW9ucy5hc3NldHMhLnB1c2goe1xuICAgICAgaW5wdXQsXG4gICAgICBnbG9iOiAnKiovKicsXG4gICAgICBvdXRwdXQ6IG91dHB1dERpci5lbmRzV2l0aCgnLycpID8gb3V0cHV0RGlyIDogb3V0cHV0RGlyICsgJy8nXG4gICAgfSk7XG4gIH0pO1xuICBmcy53cml0ZUZpbGUoY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ2FuZ3VsYXItY2xpLW9wdGlvbnMuanNvbicpLFxuICBKU09OLnN0cmluZ2lmeShicm93c2VyT3B0aW9ucywgdW5kZWZpbmVkLCAnICAnKSwgKCkgPT4ge30pO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1haW5GaWxlRm9ySG1yKG1haW5GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUobWFpbkZpbGUpO1xuICBjb25zdCB3cml0ZVRvID0gUGF0aC5yZXNvbHZlKGRpciwgJ21haW4taG1yLnRzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHdyaXRlVG8pKSB7XG4gICAgcmV0dXJuIHdyaXRlVG87XG4gIH1cbiAgY29uc3QgbWFpbiA9IGZzLnJlYWRGaWxlU3luYyhtYWluRmlsZSwgJ3V0ZjgnKTtcbiAgbGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcbiAgYGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWlufWA7XG4gIGNvbnN0IHF1ZXJ5ID0gbmV3IFRzQXN0U2VsZWN0b3IobWFpbkhtciwgJ21haW4taG1yLnRzJyk7XG4gIC8vIHF1ZXJ5LnByaW50QWxsKCk7XG5cbiAgbGV0IGJvb3RDYWxsQXN0OiB0cy5Ob2RlO1xuICBjb25zdCBzdGF0ZW1lbnQgPSBxdWVyeS5zcmMuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lLWxlbmd0aFxuICAgIGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZE1hcFRvKHN0YXRlbWVudCwgJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICBpZiAoYm9vdENhbGwpIHtcbiAgICAgIGJvb3RDYWxsQXN0ID0gYm9vdENhbGw7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBpZiAoc3RhdGVtZW50ID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21haW5GaWxlfSxgICtcbiAgICBgY2FuIG5vdCBmaW5kIHN0YXRlbWVudCBsaWtlOiBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcXG4ke21haW5IbXJ9YCk7XG5cbiAgbWFpbkhtciA9IHJlcGxhY2VDb2RlKG1haW5IbXIsIFt7XG4gICAgc3RhcnQ6IHN0YXRlbWVudC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpLFxuICAgIGVuZDogc3RhdGVtZW50LmdldEVuZCgpLFxuICAgIHRleHQ6ICcnfV0pO1xuICBtYWluSG1yICs9IGBjb25zdCBib290c3RyYXAgPSAoKSA9PiAke2Jvb3RDYWxsQXN0IS5nZXRUZXh0KCl9O1xcbmA7XG4gIG1haW5IbXIgKz0gYGlmIChtb2R1bGVbICdob3QnIF0pIHtcblx0ICAgIGhtckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuXHQgICAgY29uc29sZS5sb2coJ0FyZSB5b3UgdXNpbmcgdGhlIC0taG1yIGZsYWcgZm9yIG5nIHNlcnZlPycpO1xuXHQgIH1cXG5gLnJlcGxhY2UoL15cXHQvZ20sICcnKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKHdyaXRlVG8sIG1haW5IbXIpO1xuICBsb2cuaW5mbygnV3JpdGUgJyArIHdyaXRlVG8pO1xuICBsb2cuaW5mbyhtYWluSG1yKTtcbiAgcmV0dXJuIHdyaXRlVG87XG59XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmFzeW5jIGZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VzSW5mbzogRXh0cmFjdFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgaW5qZWN0b3JTZXR1cD4+KSB7XG5cbiAgY29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG4gIGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cbiAgY29uc3QgdXNlVGhyZWFkID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLnVzZVRocmVhZCcsIHRydWUpO1xuICBjb25zdCBuZXdUc0NvbmZpZyA9IHVzZVRocmVhZCA/XG4gICAgYXdhaXQgY3JlYXRlVHNDb25maWdJbldvcmtlcih0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbykgOlxuICAgIGNyZWF0ZVRzQ29uZmlnU3luYyh0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbyk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHNjb25maWcuanNvbicpLCBuZXdUc0NvbmZpZywgKCkgPT4ge1xuICB9KTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuICAgICAgICByZXR1cm4gbmV3VHNDb25maWc7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUocGspO1xuICAgIH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZ1N5bmModHNjb25maWdGaWxlOiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcGFja2FnZUluZm86IEV4dHJhY3RQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+Pikge1xuICBjb25zdCB7Y3JlYXRlVHNDb25maWd9ID0gcmVxdWlyZSgnLi9jaGFuZ2UtdHNjb25maWcnKSBhcyB7Y3JlYXRlVHNDb25maWc6IHR5cGVvZiBfY3JlYXRlVHNDb25maWd9O1xuICBtZW1zdGF0cygpO1xuICByZXR1cm4gY3JlYXRlVHNDb25maWcodHNjb25maWdGaWxlLCBicm93c2VyT3B0aW9ucywgY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUpLFxuICAgIHBhY2thZ2VJbmZvLCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnKSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnSW5Xb3JrZXIodHNjb25maWdGaWxlOiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcGFja2FnZUluZm86IEV4dHJhY3RQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+Pikge1xuXG4gIGNvbnN0IHJlcG9ydERpciA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcpO1xuXG4gIG1lbXN0YXRzKCk7XG4gIGNvbnN0IHdvcmtlckxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIud29ya2VyJyk7XG5cbiAgcmV0dXJuIG5ldyBQcm9taXNlPHN0cmluZz4oKHJlc29sdmUsIHJlaikgPT4ge1xuXG4gICAgY29uc3Qgd29ya2VyRGF0YTogRGF0YSA9IHtcbiAgICAgIHRzY29uZmlnRmlsZSxcbiAgICAgIHJlcG9ydERpcixcbiAgICAgIGNvbmZpZzogY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUpLFxuICAgICAgbmdPcHRpb25zOiB7XG4gICAgICAgIHByZXNlcnZlU3ltbGlua3M6IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MsXG4gICAgICAgIG1haW46IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICAgIGZpbGVSZXBsYWNlbWVudHM6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykpXG4gICAgICB9LFxuICAgICAgcGFja2FnZUluZm8sXG4gICAgICBkcmNwQnVpbGRlck9wdGlvbnM6IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoe2RyY3BBcmdzOiBicm93c2VyT3B0aW9ucy5kcmNwQXJncywgZHJjcENvbmZpZzogYnJvd3Nlck9wdGlvbnMuZHJjcENvbmZpZ30pKSBhcyBEcmNwQnVpbGRlck9wdGlvbnMsXG4gICAgICBiYXNlSHJlZjogYnJvd3Nlck9wdGlvbnMuYmFzZUhyZWYsXG4gICAgICBkZXBsb3lVcmw6IGJyb3dzZXJPcHRpb25zLmRlcGxveVVybFxuICAgIH07XG4gICAgY29uc3Qgd29ya2VyID0gbmV3IFdvcmtlcihyZXF1aXJlLnJlc29sdmUoJy4vY2hhbmdlLXRzY29uZmlnLXdvcmtlci5qcycpLCB7d29ya2VyRGF0YX0pO1xuICAgIHdvcmtlci5vbignZXJyb3InLCByZWopO1xuICAgIHdvcmtlci5vbignbWVzc2FnZScsIChtc2cpID0+IHtcbiAgICAgIGlmIChtc2cubG9nKSB7XG4gICAgICAgIHdvcmtlckxvZy5pbmZvKG1zZy5sb2cpO1xuICAgICAgfVxuICAgICAgaWYgKG1zZy5yZXN1bHQpIHtcbiAgICAgICAgcmVzb2x2ZShtc2cucmVzdWx0KTtcbiAgICAgIH1cbiAgICAgIC8vIHdvcmtlci5vZmYoJ2Vycm9yJywgcmVqKTtcbiAgICB9KTtcbiAgICB3b3JrZXIub24oJ2V4aXQnLCAoKSA9PiB7XG4gICAgICBsb2cuaW5mbygnd29ya2VyIGV4aXRzJyk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG5cbiJdfQ==
