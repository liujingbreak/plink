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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBMEI7QUFFMUIsOEVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixtREFBc0M7QUFDdEMsaUVBQXFDO0FBQ3JDLHNEQUFzQjtBQUN0Qiw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUE2QztBQUc3QyxpR0FBZ0U7QUFHaEUsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFldEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQTJE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QyxNQUFNLENBQUMsQ0FBQzthQUNyQjtZQUNELDRCQUE0QjtRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFNjaGVtYSBhcyBTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9zZXJ2ZXIvc2NoZW1hJztcbmltcG9ydCB7IHBhY2thZ2VBc3NldHNGb2xkZXJzIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXIsIERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0TGFuSVB2NCB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1dvcmtlcn0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHRzLCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCBpbmplY3RvclNldHVwIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHsgRHJjcEJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vLi4vZGlzdC9zZXJ2ZXInO1xuaW1wb3J0IHtEYXRhfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXInO1xuaW1wb3J0IG1lbXN0YXRzIGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IHtjcmVhdGVUc0NvbmZpZyBhcyBfY3JlYXRlVHNDb25maWd9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gY2hhbGs7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcblxudHlwZSBFeHRyYWN0UHJvbWlzZTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cbiAgYW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICAgIGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcbiAgOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuICByZXBsYWNlZE9wdHM6IGFueSkge1xuICBjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG4gIGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgIC8vIGxvZy5pbmZvKCdBbmd1bGFyIGNsaSBidWlsZCBvcHRpb25zJywgcmVwbGFjZWRPcHRzKTtcbiAgICAgIHJldHVybiByZXBsYWNlZE9wdHM7XG4gICAgfVxuICAgIGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9yaWdPcHRpb247XG4gIH07XG59XG4vKipcbiAqIEZvciBidWlsZCAobmcgYnVpbGQpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSB8IFNlcnZlckJ1aWxkZXJPcHRpb25zLCBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCk6IFByb21pc2U8QW5ndWxhckJ1aWxkZXJPcHRpb25zPiB7XG4gIHJldHVybiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zLCBjb250ZXh0KTtcbn1cblxuLyoqXG4gKiBGb3IgZGV2IHNlcnZlciAobmcgc2VydmUpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGNvbnRleHQgXG4gKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGJ1aWxkZXJDb25maWc6IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG5cbiAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcoYnVpbGRlckNvbmZpZyEuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IHJhd0Jyb3dzZXJPcHRpb25zID0gYXdhaXQgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zKGJyb3dzZXJUYXJnZXQpIGFzIGFueSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYTtcbiAgaWYgKCFyYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuXG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gYXdhaXQgcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gICAgY29uZmlnLCByYXdCcm93c2VyT3B0aW9ucywgY29udGV4dCwgYnVpbGRlckNvbmZpZywgdHJ1ZSk7XG4gIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dCwgJ2J1aWxkJywgYnJvd3Nlck9wdGlvbnMpO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHJhd0Jyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSB8IFNlcnZlckJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgZGV2U2VydmVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIGhtciA9IGZhbHNlKSB7XG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ0NoYW5nZSBidWlsZGVyIG9wdGlvbnMnKTtcbiAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSByYXdCcm93c2VyT3B0aW9ucyBhcyBBbmd1bGFyQnVpbGRlck9wdGlvbnM7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBbJ2RlcGxveVVybCcsICdvdXRwdXRQYXRoJywgJ3N0eWxlcyddKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KFtjdXJyUGFja2FnZU5hbWUsIHByb3BdKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgKHJhd0Jyb3dzZXJPcHRpb25zIGFzIGFueSlbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIGNvbnNvbGUubG9nKGN1cnJQYWNrYWdlTmFtZSArICcgLSBvdmVycmlkZSAlczogJXMnLCBwcm9wLCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICBpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcbiAgICAgIHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBkZXZTZXJ2ZXJDb25maWcpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBvYmo7XG4gIH0pO1xuXG4gIGlmICghYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcbiAgLy8gaWYgc3RhdGljIGFzc2V0cydzIFVSTCBpcyBub3QgbGVkIGJ5ICcvJywgaXQgd2lsbCBiZSBjb25zaWRlcmVkIGFzIHJlbGF0aXZlIHBhdGggaW4gbmctaHRtbC1sb2FkZXJcblxuICBpZiAoZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gVXJsLnBhcnNlKGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgaWYgKHBhcnNlZFVybC5ob3N0ID09IG51bGwpIHtcbiAgICAgIHBhcnNlZFVybC5ob3N0bmFtZSA9IGdldExhbklQdjQoKTtcbiAgICAgIHBhcnNlZFVybC5wb3J0ID0gZGV2U2VydmVyQ29uZmlnLnBvcnQgKyAnJztcbiAgICAgIHBhcnNlZFVybC5wcm90b2NvbCA9IGRldlNlcnZlckNvbmZpZyAmJiBkZXZTZXJ2ZXJDb25maWcuc3NsID8gJ2h0dHBzJyA6ICdodHRwJztcbiAgICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9IFVybC5mb3JtYXQocGFyc2VkVXJsKTtcbiAgICAgIC8vIFRPRE86IHByaW50IHJpZ2h0IGFmdGVyIHNlcnZlciBpcyBzdWNjZXNzZnVsbHkgc3RhcnRlZFxuICAgICAgc2V0VGltZW91dCgoKSA9PlxuICAgICAgICBjb25zb2xlLmxvZyhjaGFsay5yZWQoYEN1cnJlbnQgZGV2IHNlcnZlciByZXNvdXJjZSBpcyBob3N0ZWQgb24gJHtwYXJzZWRVcmwuaG9zdG5hbWV9LFxcbmlmIHlvdXIgbmV0d29yayBpcyByZWNvbm5lY3RlZCBvciBsb2NhbCBJUCBhZGRyZXNzIGlzIGAgK1xuICAgICAgICAnIGNoYW5nZWQsIHlvdSB3aWxsIG5lZWQgdG8gcmVzdGFydCB0aGlzIGRldiBzZXJ2ZXIhJykpLCA1MDAwKTtcbiAgICB9XG4gICAgaWYgKHBhcnNlZFVybC5wYXRobmFtZSlcbiAgICAgIGRldlNlcnZlckNvbmZpZy5zZXJ2ZVBhdGggPSBwYXJzZWRVcmwucGF0aG5hbWU7IC8vIEluIGNhc2UgZGVwbG95VXJsIGhhcyBob3N0LCBuZyBjbGkgd2lsbCByZXBvcnQgZXJyb3IgZm9yIG51bGwgc2VydmVQYXRoXG4gIH1cblxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykge1xuICAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50c1xuICAgIC5mb3JFYWNoKGZyID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGZyKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWU6IHN0cmluZyA9IGZyW2ZpZWxkXTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICBmcltmaWVsZF0gPSBQYXRoLnJlbGF0aXZlKGN3ZCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBpZiAocGtKc29uKSB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuICAgIGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpOyAvLyBzdGF0aWMgYXNzZXRzIGluIGVudHJ5IHBhY2thZ2Ugc2hvdWxkIGFsd2F5cyBiZSBvdXRwdXQgdG8gcm9vdCBwYXRoXG4gIH1cbiAgLy8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuICBjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuICAgIGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcbiAgICBjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblxuICBjb25zdCBtYWluSG1yID0gY3JlYXRlTWFpbkZpbGVGb3JIbXIoYnJvd3Nlck9wdGlvbnMubWFpbik7XG4gIGlmIChobXIgJiYgZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgZGV2U2VydmVyQ29uZmlnLmhtciA9IHRydWU7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKVxuICAgICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyA9IFtdO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICByZXBsYWNlOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgd2l0aDogUGF0aC5yZWxhdGl2ZSgnLicsIG1haW5IbXIpXG4gICAgfSk7XG4gIH1cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID09IG51bGwpIHtcbiAgICBicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9IHt9O1xuICB9XG5cbiAgYnJvd3Nlck9wdGlvbnMuY29tbW9uQ2h1bmsgPSBmYWxzZTtcblxuICBjb25zdCBwYWNrYWdlc0luZm8gPSBhd2FpdCBpbmplY3RvclNldHVwKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMpO1xuICBhd2FpdCBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcblxuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdzZXR0aW5nIHVwIGFzc2V0cyBvcHRpb25zJyk7XG4gIC8vIEJlY2F1c2UgZGV2LXNlcnZlLWFzc2V0cyBkZXBlbmRzIG9uIERSQ1AgYXBpLCBJIGhhdmUgdG8gbGF6eSBsb2FkIGl0LlxuICBjb25zdCBmb3JFYWNoQXNzZXRzRGlyOiB0eXBlb2YgcGFja2FnZUFzc2V0c0ZvbGRlcnMgPVxuICByZXF1aXJlKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLnBhY2thZ2VBc3NldHNGb2xkZXJzO1xuICBmb3JFYWNoQXNzZXRzRGlyKCcvJywgKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmFzc2V0cykge1xuICAgICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzID0gW107XG4gICAgfVxuICAgIGxldCBpbnB1dCA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5wdXREaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWlucHV0LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgaW5wdXQgPSAnLi8nICsgaW5wdXQ7XG4gICAgfVxuICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyEucHVzaCh7XG4gICAgICBpbnB1dCxcbiAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgIG91dHB1dDogb3V0cHV0RGlyLmVuZHNXaXRoKCcvJykgPyBvdXRwdXREaXIgOiBvdXRwdXREaXIgKyAnLydcbiAgICB9KTtcbiAgfSk7XG4gIGZzLndyaXRlRmlsZShjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnLCAnYW5ndWxhci1jbGktb3B0aW9ucy5qc29uJyksXG4gIEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLCB1bmRlZmluZWQsICcgICcpLCAoKSA9PiB7fSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFpbkZpbGVGb3JIbXIobWFpbkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShtYWluRmlsZSk7XG4gIGNvbnN0IHdyaXRlVG8gPSBQYXRoLnJlc29sdmUoZGlyLCAnbWFpbi1obXIudHMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMod3JpdGVUbykpIHtcbiAgICByZXR1cm4gd3JpdGVUbztcbiAgfVxuICBjb25zdCBtYWluID0gZnMucmVhZEZpbGVTeW5jKG1haW5GaWxlLCAndXRmOCcpO1xuICBsZXQgbWFpbkhtciA9ICcvLyB0c2xpbnQ6ZGlzYWJsZVxcbicgK1xuICBgaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvaG1yJztcXG4ke21haW59YDtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVHNBc3RTZWxlY3RvcihtYWluSG1yLCAnbWFpbi1obXIudHMnKTtcbiAgLy8gcXVlcnkucHJpbnRBbGwoKTtcblxuICBsZXQgYm9vdENhbGxBc3Q6IHRzLk5vZGU7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmUtbGVuZ3RoXG4gICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kTWFwVG8oc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAgIGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG4gICAgICAgIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuICAgICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGlmIChib290Q2FsbCkge1xuICAgICAgYm9vdENhbGxBc3QgPSBib290Q2FsbDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGlmIChzdGF0ZW1lbnQgPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bWFpbkZpbGV9LGAgK1xuICAgIGBjYW4gbm90IGZpbmQgc3RhdGVtZW50IGxpa2U6IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKVxcbiR7bWFpbkhtcn1gKTtcblxuICBtYWluSG1yID0gcmVwbGFjZUNvZGUobWFpbkhtciwgW3tcbiAgICBzdGFydDogc3RhdGVtZW50LmdldFN0YXJ0KHF1ZXJ5LnNyYywgdHJ1ZSksXG4gICAgZW5kOiBzdGF0ZW1lbnQuZ2V0RW5kKCksXG4gICAgdGV4dDogJyd9XSk7XG4gIG1haW5IbXIgKz0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QhLmdldFRleHQoKX07XFxuYDtcbiAgbWFpbkhtciArPSBgaWYgKG1vZHVsZVsgJ2hvdCcgXSkge1xuXHQgICAgaG1yQm9vdHN0cmFwKG1vZHVsZSwgYm9vdHN0cmFwKTtcblx0ICB9IGVsc2Uge1xuXHQgICAgY29uc29sZS5lcnJvcignSE1SIGlzIG5vdCBlbmFibGVkIGZvciB3ZWJwYWNrLWRldi1zZXJ2ZXIhJyk7XG5cdCAgICBjb25zb2xlLmxvZygnQXJlIHlvdSB1c2luZyB0aGUgLS1obXIgZmxhZyBmb3Igbmcgc2VydmU/Jyk7XG5cdCAgfVxcbmAucmVwbGFjZSgvXlxcdC9nbSwgJycpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMod3JpdGVUbywgbWFpbkhtcik7XG4gIGxvZy5pbmZvKCdXcml0ZSAnICsgd3JpdGVUbyk7XG4gIGxvZy5pbmZvKG1haW5IbXIpO1xuICByZXR1cm4gd3JpdGVUbztcbn1cblxuLy8gSGFjayB0cy5zeXMsIHNvIGZhciBpdCBpcyB1c2VkIHRvIHJlYWQgdHNjb25maWcuanNvblxuYXN5bmMgZnVuY3Rpb24gaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcGFja2FnZXNJbmZvOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPj4pIHtcblxuICBjb25zdCBvbGRSZWFkRmlsZSA9IHN5cy5yZWFkRmlsZTtcbiAgY29uc3QgdHNDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLnRzQ29uZmlnKTtcblxuICBjb25zdCB1c2VUaHJlYWQgPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcudXNlVGhyZWFkJywgdHJ1ZSk7XG4gIGNvbnN0IG5ld1RzQ29uZmlnID0gdXNlVGhyZWFkID9cbiAgICBhd2FpdCBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzQ29uZmlnRmlsZSwgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKSA6XG4gICAgY3JlYXRlVHNDb25maWdTeW5jKHRzQ29uZmlnRmlsZSwgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcbiAgZnMud3JpdGVGaWxlKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd0c2NvbmZpZy5qc29uJyksIG5ld1RzQ29uZmlnLCAoKSA9PiB7XG4gIH0pO1xuXG4gIHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICAvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuICAgICAgLy8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG4gICAgICAvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcbiAgICAgIC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG4gICAgICAgIHJldHVybiBuZXdUc0NvbmZpZztcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IocmVkKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBSZWFkICR7cGF0aH1gLCBlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZShwayk7XG4gICAgfSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnU3luYyh0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlSW5mbzogRXh0cmFjdFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgaW5qZWN0b3JTZXR1cD4+KSB7XG4gIGNvbnN0IHtjcmVhdGVUc0NvbmZpZ30gPSByZXF1aXJlKCcuL2NoYW5nZS10c2NvbmZpZycpIGFzIHtjcmVhdGVUc0NvbmZpZzogdHlwZW9mIF9jcmVhdGVUc0NvbmZpZ307XG4gIG1lbXN0YXRzKCk7XG4gIHJldHVybiBjcmVhdGVUc0NvbmZpZyh0c2NvbmZpZ0ZpbGUsIGJyb3dzZXJPcHRpb25zLCBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSksXG4gICAgcGFja2FnZUluZm8sIGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcpKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHNDb25maWdJbldvcmtlcih0c2NvbmZpZ0ZpbGU6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlSW5mbzogRXh0cmFjdFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgaW5qZWN0b3JTZXR1cD4+KSB7XG5cbiAgY29uc3QgcmVwb3J0RGlyID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0Jyk7XG5cbiAgbWVtc3RhdHMoKTtcbiAgY29uc3Qgd29ya2VyTG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci53b3JrZXInKTtcblxuICByZXR1cm4gbmV3IFByb21pc2U8c3RyaW5nPigocmVzb2x2ZSwgcmVqKSA9PiB7XG5cbiAgICBjb25zdCB3b3JrZXJEYXRhOiBEYXRhID0ge1xuICAgICAgdHNjb25maWdGaWxlLFxuICAgICAgcmVwb3J0RGlyLFxuICAgICAgY29uZmlnOiBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSksXG4gICAgICBuZ09wdGlvbnM6IHtcbiAgICAgICAgcHJlc2VydmVTeW1saW5rczogYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgbWFpbjogYnJvd3Nlck9wdGlvbnMubWFpbixcbiAgICAgICAgZmlsZVJlcGxhY2VtZW50czogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSlcbiAgICAgIH0sXG4gICAgICBwYWNrYWdlSW5mbyxcbiAgICAgIGRyY3BCdWlsZGVyT3B0aW9uczogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh7ZHJjcEFyZ3M6IGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnOiBicm93c2VyT3B0aW9ucy5kcmNwQ29uZmlnfSkpIGFzIERyY3BCdWlsZGVyT3B0aW9ucyxcbiAgICAgIGJhc2VIcmVmOiBicm93c2VyT3B0aW9ucy5iYXNlSHJlZixcbiAgICAgIGRlcGxveVVybDogYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsXG4gICAgfTtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKHJlcXVpcmUucmVzb2x2ZSgnLi9jaGFuZ2UtdHNjb25maWctd29ya2VyLmpzJyksIHt3b3JrZXJEYXRhfSk7XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIHJlaik7XG4gICAgd29ya2VyLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuICAgICAgaWYgKG1zZy5sb2cpIHtcbiAgICAgICAgd29ya2VyTG9nLmluZm8obXNnLmxvZyk7XG4gICAgICB9XG4gICAgICBpZiAobXNnLnJlc3VsdCkge1xuICAgICAgICByZXNvbHZlKG1zZy5yZXN1bHQpO1xuICAgICAgfVxuICAgICAgLy8gd29ya2VyLm9mZignZXJyb3InLCByZWopO1xuICAgIH0pO1xuICAgIHdvcmtlci5vbignZXhpdCcsICgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCd3b3JrZXIgZXhpdHMnKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cblxuIl19
