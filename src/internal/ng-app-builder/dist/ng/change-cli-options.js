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
                parsedUrl.protocol = 'http';
                rawBrowserOptions.deployUrl = url_1.default.format(parsedUrl);
                // TODO: print right after server is successfully started
                setTimeout(() => console.log(chalk_1.default.red(`Current dev server resource is hosted on ${parsedUrl.hostname},\nif your network is reconnected or local IP address is ` +
                    ' changed, you will need to restart this dev server!')), 5000);
            }
            if (parsedUrl.pathname)
                devServerConfig.servePath = parsedUrl.pathname; // In case deployUrl has host, ng cli will report error for null servePath
        }
        if (browserOptions.fileReplacements) {
            console.log(browserOptions.fileReplacements);
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
        const bootCall = query.findWith(statement, ':PropertyAccessExpression > .expression:CallExpression > .expression:Identifier', (ast, path, parents) => {
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
        const newTsConfig = yield createTsConfigInWorker(tsConfigFile, browserOptions, config, packagesInfo);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUkzRiwwREFBMEI7QUFFMUIsOEVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixtREFBc0M7QUFDdEMsaUVBQXFDO0FBQ3JDLHNEQUFzQjtBQUN0Qiw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUE2QztBQUc3QyxpR0FBZ0U7QUFFaEUsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFldEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQW9D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QUMsQ0FBQyxDQUF1QjtZQUNoSixRQUFRLEVBQUUsY0FBYyxDQUFDLFFBQVE7WUFDakMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxTQUFTO1NBQ3BDLENBQUM7UUFDRixNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUMsVUFBVSxFQUFDLENBQUMsQ0FBQztRQUN4RixNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN4QixNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzNCLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRTtnQkFDWCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN6QjtZQUNELElBQUksR0FBRyxDQUFDLE1BQU0sRUFBRTtnQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2FBQ3JCO1lBQ0QsNEJBQTRCO1FBQzlCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFO1lBQ3JCLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQsIFRhcmdldCwgdGFyZ2V0RnJvbVRhcmdldFN0cmluZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgcGFja2FnZUFzc2V0c0ZvbGRlcnMgfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgQ29uZmlnSGFuZGxlciwgRHJjcENvbmZpZyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgeyBnZXRMYW5JUHY0IH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzL25ldHdvcmstdXRpbCc7XG4vLyBpbXBvcnQgeyBnZXRUc0RpcnNPZlBhY2thZ2UgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7V29ya2VyfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgdHMsIHsgc3lzIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgcmVwbGFjZUNvZGUgZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgVHNBc3RTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IGluamVjdG9yU2V0dXAgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQgeyBEcmNwQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuLi8uLi9kaXN0L3NlcnZlcic7XG5pbXBvcnQge0RhdGF9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnLXdvcmtlcic7XG5pbXBvcnQgbWVtc3RhdHMgZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzL21lbS1zdGF0cyc7XG5cbmNvbnN0IHtjeWFuLCBncmVlbiwgcmVkfSA9IGNoYWxrO1xuY29uc3QgY3VyclBhY2thZ2VOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5cbnR5cGUgRXh0cmFjdFByb21pc2U8UD4gPSBQIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJDb25maWdIYW5kbGVyIGV4dGVuZHMgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBZb3UgbWF5IG92ZXJyaWRlIGFuZ3VsYXIuanNvbiBpbiB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBvcHRpb25zIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD4uYXJjaGl0ZWN0Ljxjb21tYW5kPi5vcHRpb25zXG5cdCAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD5cblx0ICovXG4gIGFuZ3VsYXJKc29uKG9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgICBidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpXG4gIDogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmZ1bmN0aW9uIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHRhcmdldE5hbWU6IHN0cmluZyxcbiAgcmVwbGFjZWRPcHRzOiBhbnkpIHtcbiAgY29uc3QgZ2V0VGFyZ2V0T3B0aW9ucyA9IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucztcblxuICBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMgPSBhc3luYyBmdW5jdGlvbih0YXJnZXQ6IFRhcmdldCkge1xuICAgIGlmICh0YXJnZXQudGFyZ2V0ID09PSB0YXJnZXROYW1lKSB7XG4gICAgICAvLyBsb2cuaW5mbygnQW5ndWxhciBjbGkgYnVpbGQgb3B0aW9ucycsIHJlcGxhY2VkT3B0cyk7XG4gICAgICByZXR1cm4gcmVwbGFjZWRPcHRzO1xuICAgIH1cbiAgICBjb25zdCBvcmlnT3B0aW9uID0gYXdhaXQgZ2V0VGFyZ2V0T3B0aW9ucy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBvcmlnT3B0aW9uO1xuICB9O1xufVxuLyoqXG4gKiBGb3IgYnVpbGQgKG5nIGJ1aWxkKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KTogUHJvbWlzZTxBbmd1bGFyQnVpbGRlck9wdGlvbnM+IHtcbiAgcmV0dXJuIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIEZvciBkZXYgc2VydmVyIChuZyBzZXJ2ZSlcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gY29udGV4dCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgYnVpbGRlckNvbmZpZzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpIHtcblxuICBjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhidWlsZGVyQ29uZmlnIS5icm93c2VyVGFyZ2V0KTtcbiAgY29uc3QgcmF3QnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMoYnJvd3NlclRhcmdldCkgYXMgYW55IGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hO1xuICBpZiAoIXJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybClcbiAgICByYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSAnLyc7XG5cbiAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgICBjb25maWcsIHJhd0Jyb3dzZXJPcHRpb25zLCBjb250ZXh0LCBidWlsZGVyQ29uZmlnLCB0cnVlKTtcbiAgaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0LCAnYnVpbGQnLCBicm93c2VyT3B0aW9ucyk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcmF3QnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgZGV2U2VydmVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIGhtciA9IGZhbHNlKSB7XG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ0NoYW5nZSBidWlsZGVyIG9wdGlvbnMnKTtcbiAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSByYXdCcm93c2VyT3B0aW9ucyBhcyBBbmd1bGFyQnVpbGRlck9wdGlvbnM7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBbJ2RlcGxveVVybCcsICdvdXRwdXRQYXRoJywgJ3N0eWxlcyddKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KFtjdXJyUGFja2FnZU5hbWUsIHByb3BdKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgKHJhd0Jyb3dzZXJPcHRpb25zIGFzIGFueSlbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIGNvbnNvbGUubG9nKGN1cnJQYWNrYWdlTmFtZSArICcgLSBvdmVycmlkZSAlczogJXMnLCBwcm9wLCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICBpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcbiAgICAgIHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBkZXZTZXJ2ZXJDb25maWcpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBvYmo7XG4gIH0pO1xuXG4gIGlmICghYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcbiAgLy8gaWYgc3RhdGljIGFzc2V0cydzIFVSTCBpcyBub3QgbGVkIGJ5ICcvJywgaXQgd2lsbCBiZSBjb25zaWRlcmVkIGFzIHJlbGF0aXZlIHBhdGggaW4gbmctaHRtbC1sb2FkZXJcblxuICBpZiAoZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gVXJsLnBhcnNlKGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgaWYgKHBhcnNlZFVybC5ob3N0ID09IG51bGwpIHtcbiAgICAgIHBhcnNlZFVybC5ob3N0bmFtZSA9IGdldExhbklQdjQoKTtcbiAgICAgIHBhcnNlZFVybC5wb3J0ID0gZGV2U2VydmVyQ29uZmlnLnBvcnQgKyAnJztcbiAgICAgIHBhcnNlZFVybC5wcm90b2NvbCA9ICdodHRwJztcbiAgICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9IFVybC5mb3JtYXQocGFyc2VkVXJsKTtcbiAgICAgIC8vIFRPRE86IHByaW50IHJpZ2h0IGFmdGVyIHNlcnZlciBpcyBzdWNjZXNzZnVsbHkgc3RhcnRlZFxuICAgICAgc2V0VGltZW91dCgoKSA9PlxuICAgICAgICBjb25zb2xlLmxvZyhjaGFsay5yZWQoYEN1cnJlbnQgZGV2IHNlcnZlciByZXNvdXJjZSBpcyBob3N0ZWQgb24gJHtwYXJzZWRVcmwuaG9zdG5hbWV9LFxcbmlmIHlvdXIgbmV0d29yayBpcyByZWNvbm5lY3RlZCBvciBsb2NhbCBJUCBhZGRyZXNzIGlzIGAgK1xuICAgICAgICAnIGNoYW5nZWQsIHlvdSB3aWxsIG5lZWQgdG8gcmVzdGFydCB0aGlzIGRldiBzZXJ2ZXIhJykpLCA1MDAwKTtcbiAgICB9XG4gICAgaWYgKHBhcnNlZFVybC5wYXRobmFtZSlcbiAgICAgIGRldlNlcnZlckNvbmZpZy5zZXJ2ZVBhdGggPSBwYXJzZWRVcmwucGF0aG5hbWU7IC8vIEluIGNhc2UgZGVwbG95VXJsIGhhcyBob3N0LCBuZyBjbGkgd2lsbCByZXBvcnQgZXJyb3IgZm9yIG51bGwgc2VydmVQYXRoXG4gIH1cblxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykge1xuICAgIGNvbnNvbGUubG9nKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpO1xuICAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50c1xuICAgIC5mb3JFYWNoKGZyID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGZyKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWU6IHN0cmluZyA9IGZyW2ZpZWxkXTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICBmcltmaWVsZF0gPSBQYXRoLnJlbGF0aXZlKGN3ZCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBpZiAocGtKc29uKSB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuICAgIGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpOyAvLyBzdGF0aWMgYXNzZXRzIGluIGVudHJ5IHBhY2thZ2Ugc2hvdWxkIGFsd2F5cyBiZSBvdXRwdXQgdG8gcm9vdCBwYXRoXG4gIH1cbiAgLy8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuICBjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuICAgIGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcbiAgICBjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblxuICBjb25zdCBtYWluSG1yID0gY3JlYXRlTWFpbkZpbGVGb3JIbXIoYnJvd3Nlck9wdGlvbnMubWFpbik7XG4gIGlmIChobXIgJiYgZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgZGV2U2VydmVyQ29uZmlnLmhtciA9IHRydWU7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKVxuICAgICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyA9IFtdO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICByZXBsYWNlOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgd2l0aDogUGF0aC5yZWxhdGl2ZSgnLicsIG1haW5IbXIpXG4gICAgfSk7XG4gIH1cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID09IG51bGwpIHtcbiAgICBicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9IHt9O1xuICB9XG5cbiAgYnJvd3Nlck9wdGlvbnMuY29tbW9uQ2h1bmsgPSBmYWxzZTtcblxuICBjb25zdCBwYWNrYWdlc0luZm8gPSBhd2FpdCBpbmplY3RvclNldHVwKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMpO1xuICBhd2FpdCBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcblxuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdzZXR0aW5nIHVwIGFzc2V0cyBvcHRpb25zJyk7XG4gIC8vIEJlY2F1c2UgZGV2LXNlcnZlLWFzc2V0cyBkZXBlbmRzIG9uIERSQ1AgYXBpLCBJIGhhdmUgdG8gbGF6eSBsb2FkIGl0LlxuICBjb25zdCBmb3JFYWNoQXNzZXRzRGlyOiB0eXBlb2YgcGFja2FnZUFzc2V0c0ZvbGRlcnMgPVxuICByZXF1aXJlKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLnBhY2thZ2VBc3NldHNGb2xkZXJzO1xuICBmb3JFYWNoQXNzZXRzRGlyKCcvJywgKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmFzc2V0cykge1xuICAgICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzID0gW107XG4gICAgfVxuICAgIGxldCBpbnB1dCA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5wdXREaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWlucHV0LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgaW5wdXQgPSAnLi8nICsgaW5wdXQ7XG4gICAgfVxuICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyEucHVzaCh7XG4gICAgICBpbnB1dCxcbiAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgIG91dHB1dDogb3V0cHV0RGlyLmVuZHNXaXRoKCcvJykgPyBvdXRwdXREaXIgOiBvdXRwdXREaXIgKyAnLydcbiAgICB9KTtcbiAgfSk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAnYW5ndWxhci1jbGktb3B0aW9ucy5qc29uJyksXG4gIEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLCB1bmRlZmluZWQsICcgICcpLCAoKSA9PiB7fSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFpbkZpbGVGb3JIbXIobWFpbkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShtYWluRmlsZSk7XG4gIGNvbnN0IHdyaXRlVG8gPSBQYXRoLnJlc29sdmUoZGlyLCAnbWFpbi1obXIudHMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMod3JpdGVUbykpIHtcbiAgICByZXR1cm4gd3JpdGVUbztcbiAgfVxuICBjb25zdCBtYWluID0gZnMucmVhZEZpbGVTeW5jKG1haW5GaWxlLCAndXRmOCcpO1xuICBsZXQgbWFpbkhtciA9ICcvLyB0c2xpbnQ6ZGlzYWJsZVxcbicgK1xuICBgaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvaG1yJztcXG4ke21haW59YDtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVHNBc3RTZWxlY3RvcihtYWluSG1yLCAnbWFpbi1obXIudHMnKTtcbiAgLy8gcXVlcnkucHJpbnRBbGwoKTtcblxuICBsZXQgYm9vdENhbGxBc3Q6IHRzLk5vZGU7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmUtbGVuZ3RoXG4gICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kV2l0aChzdGF0ZW1lbnQsICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgICAgIChhc3Q6IHRzLklkZW50aWZpZXIsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgaWYgKGJvb3RDYWxsKSB7XG4gICAgICBib290Q2FsbEFzdCA9IGJvb3RDYWxsO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgaWYgKHN0YXRlbWVudCA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcihgJHttYWluRmlsZX0sYCArXG4gICAgYGNhbiBub3QgZmluZCBzdGF0ZW1lbnQgbGlrZTogcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXFxuJHttYWluSG1yfWApO1xuXG4gIG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbe1xuICAgIHN0YXJ0OiBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKSxcbiAgICBlbmQ6IHN0YXRlbWVudC5nZXRFbmQoKSxcbiAgICB0ZXh0OiAnJ31dKTtcbiAgbWFpbkhtciArPSBgY29uc3QgYm9vdHN0cmFwID0gKCkgPT4gJHtib290Q2FsbEFzdCEuZ2V0VGV4dCgpfTtcXG5gO1xuICBtYWluSG1yICs9IGBpZiAobW9kdWxlWyAnaG90JyBdKSB7XG5cdCAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuXHQgIH0gZWxzZSB7XG5cdCAgICBjb25zb2xlLmVycm9yKCdITVIgaXMgbm90IGVuYWJsZWQgZm9yIHdlYnBhY2stZGV2LXNlcnZlciEnKTtcblx0ICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcblx0ICB9XFxuYC5yZXBsYWNlKC9eXFx0L2dtLCAnJyk7XG5cbiAgZnMud3JpdGVGaWxlU3luYyh3cml0ZVRvLCBtYWluSG1yKTtcbiAgbG9nLmluZm8oJ1dyaXRlICcgKyB3cml0ZVRvKTtcbiAgbG9nLmluZm8obWFpbkhtcik7XG4gIHJldHVybiB3cml0ZVRvO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5hc3luYyBmdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlc0luZm86IEV4dHJhY3RQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+Pikge1xuXG4gIGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuICBjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG4gIGNvbnN0IG5ld1RzQ29uZmlnID0gYXdhaXQgY3JlYXRlVHNDb25maWdJbldvcmtlcih0c0NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcsIHBhY2thZ2VzSW5mbyk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAndHNjb25maWcuanNvbicpLCBuZXdUc0NvbmZpZywgKCkgPT4ge1xuICB9KTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuICAgICAgICByZXR1cm4gbmV3VHNDb25maWc7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUocGspO1xuICAgIH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPj4pIHtcblxuICBjb25zdCByZXBvcnREaXIgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnKTtcblxuICBtZW1zdGF0cygpO1xuICBjb25zdCB3b3JrZXJMb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyLndvcmtlcicpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWopID0+IHtcblxuICAgIGNvbnN0IHdvcmtlckRhdGE6IERhdGEgPSB7XG4gICAgICB0c2NvbmZpZ0ZpbGUsXG4gICAgICByZXBvcnREaXIsXG4gICAgICBjb25maWc6IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lKSxcbiAgICAgIG5nT3B0aW9uczoge1xuICAgICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgICBtYWluOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpKVxuICAgICAgfSxcbiAgICAgIHBhY2thZ2VJbmZvLFxuICAgICAgZHJjcEJ1aWxkZXJPcHRpb25zOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHtkcmNwQXJnczogYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MsIGRyY3BDb25maWc6IGJyb3dzZXJPcHRpb25zLmRyY3BDb25maWd9KSkgYXMgRHJjcEJ1aWxkZXJPcHRpb25zLFxuICAgICAgYmFzZUhyZWY6IGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgZGVwbG95VXJsOiBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmxcbiAgICB9O1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXIuanMnKSwge3dvcmtlckRhdGF9KTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgcmVqKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCAobXNnKSA9PiB7XG4gICAgICBpZiAobXNnLmxvZykge1xuICAgICAgICB3b3JrZXJMb2cuaW5mbyhtc2cubG9nKTtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cucmVzdWx0KSB7XG4gICAgICAgIHJlc29sdmUobXNnLnJlc3VsdCk7XG4gICAgICB9XG4gICAgICAvLyB3b3JrZXIub2ZmKCdlcnJvcicsIHJlaik7XG4gICAgfSk7XG4gICAgd29ya2VyLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3dvcmtlciBleGl0cycpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuXG4iXX0=
