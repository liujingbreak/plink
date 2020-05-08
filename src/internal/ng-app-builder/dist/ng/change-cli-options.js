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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUkzRiwwREFBMEI7QUFFMUIsOEVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixtREFBc0M7QUFDdEMsaUVBQXFDO0FBQ3JDLHNEQUFzQjtBQUN0Qiw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUE2QztBQUc3QyxpR0FBZ0U7QUFHaEUsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFldEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQW9D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QyxNQUFNLENBQUMsQ0FBQzthQUNyQjtZQUNELDRCQUE0QjtRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IHBhY2thZ2VBc3NldHNGb2xkZXJzIH0gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXIsIERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0TGFuSVB2NCB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1dvcmtlcn0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IHRzLCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCBpbmplY3RvclNldHVwIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHsgRHJjcEJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi4vLi4vZGlzdC9zZXJ2ZXInO1xuaW1wb3J0IHtEYXRhfSBmcm9tICcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXInO1xuaW1wb3J0IG1lbXN0YXRzIGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscy9tZW0tc3RhdHMnO1xuaW1wb3J0IHtjcmVhdGVUc0NvbmZpZyBhcyBfY3JlYXRlVHNDb25maWd9IGZyb20gJy4vY2hhbmdlLXRzY29uZmlnJztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gY2hhbGs7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcblxudHlwZSBFeHRyYWN0UHJvbWlzZTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cbiAgYW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICAgIGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcbiAgOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuICByZXBsYWNlZE9wdHM6IGFueSkge1xuICBjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG4gIGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgIC8vIGxvZy5pbmZvKCdBbmd1bGFyIGNsaSBidWlsZCBvcHRpb25zJywgcmVwbGFjZWRPcHRzKTtcbiAgICAgIHJldHVybiByZXBsYWNlZE9wdHM7XG4gICAgfVxuICAgIGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9yaWdPcHRpb247XG4gIH07XG59XG4vKipcbiAqIEZvciBidWlsZCAobmcgYnVpbGQpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSwgY29udGV4dDogQnVpbGRlckNvbnRleHQpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuICByZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucywgY29udGV4dCk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBidWlsZGVyQ29uZmlnOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucykge1xuXG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKGJ1aWxkZXJDb25maWchLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICAgIGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICByYXdCcm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBkZXZTZXJ2ZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgaG1yID0gZmFsc2UpIHtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnQ2hhbmdlIGJ1aWxkZXIgb3B0aW9ucycpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG9iajtcbiAgfSk7XG5cbiAgaWYgKCFicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuICAvLyBpZiBzdGF0aWMgYXNzZXRzJ3MgVVJMIGlzIG5vdCBsZWQgYnkgJy8nLCBpdCB3aWxsIGJlIGNvbnNpZGVyZWQgYXMgcmVsYXRpdmUgcGF0aCBpbiBuZy1odG1sLWxvYWRlclxuXG4gIGlmIChkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UoYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsLCB0cnVlLCB0cnVlKTtcbiAgICBpZiAocGFyc2VkVXJsLmhvc3QgPT0gbnVsbCkge1xuICAgICAgcGFyc2VkVXJsLmhvc3RuYW1lID0gZ2V0TGFuSVB2NCgpO1xuICAgICAgcGFyc2VkVXJsLnBvcnQgPSBkZXZTZXJ2ZXJDb25maWcucG9ydCArICcnO1xuICAgICAgcGFyc2VkVXJsLnByb3RvY29sID0gZGV2U2VydmVyQ29uZmlnICYmIGRldlNlcnZlckNvbmZpZy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnO1xuICAgICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gVXJsLmZvcm1hdChwYXJzZWRVcmwpO1xuICAgICAgLy8gVE9ETzogcHJpbnQgcmlnaHQgYWZ0ZXIgc2VydmVyIGlzIHN1Y2Nlc3NmdWxseSBzdGFydGVkXG4gICAgICBzZXRUaW1lb3V0KCgpID0+XG4gICAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnJlZChgQ3VycmVudCBkZXYgc2VydmVyIHJlc291cmNlIGlzIGhvc3RlZCBvbiAke3BhcnNlZFVybC5ob3N0bmFtZX0sXFxuaWYgeW91ciBuZXR3b3JrIGlzIHJlY29ubmVjdGVkIG9yIGxvY2FsIElQIGFkZHJlc3MgaXMgYCArXG4gICAgICAgICcgY2hhbmdlZCwgeW91IHdpbGwgbmVlZCB0byByZXN0YXJ0IHRoaXMgZGV2IHNlcnZlciEnKSksIDUwMDApO1xuICAgIH1cbiAgICBpZiAocGFyc2VkVXJsLnBhdGhuYW1lKVxuICAgICAgZGV2U2VydmVyQ29uZmlnLnNlcnZlUGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZTsgLy8gSW4gY2FzZSBkZXBsb3lVcmwgaGFzIGhvc3QsIG5nIGNsaSB3aWxsIHJlcG9ydCBlcnJvciBmb3IgbnVsbCBzZXJ2ZVBhdGhcbiAgfVxuXG4gIGlmIChicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSB7XG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzXG4gICAgLmZvckVhY2goZnIgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZnIpLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZTogc3RyaW5nID0gZnJbZmllbGRdO1xuICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHZhbHVlKSkge1xuICAgICAgICAgIGZyW2ZpZWxkXSA9IFBhdGgucmVsYXRpdmUoY3dkLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcGtKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGlmIChwa0pzb24pIHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgU2V0IGVudHJ5IHBhY2thZ2UgJHtjeWFuKHBrSnNvbi5uYW1lKX0ncyBvdXRwdXQgcGF0aCB0byAvYCk7XG4gICAgY29uZmlnLnNldChbJ291dHB1dFBhdGhNYXAnLCBwa0pzb24ubmFtZV0sICcvJyk7IC8vIHN0YXRpYyBhc3NldHMgaW4gZW50cnkgcGFja2FnZSBzaG91bGQgYWx3YXlzIGJlIG91dHB1dCB0byByb290IHBhdGhcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG4gIGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcbiAgaWYgKGhtciAmJiBkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBkZXZTZXJ2ZXJDb25maWcuaG1yID0gdHJ1ZTtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG4gICAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICB3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcbiAgICB9KTtcbiAgfVxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuICAgIGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG4gIH1cblxuICBicm93c2VyT3B0aW9ucy5jb21tb25DaHVuayA9IGZhbHNlO1xuXG4gIGNvbnN0IHBhY2thZ2VzSW5mbyA9IGF3YWl0IGluamVjdG9yU2V0dXAoY29uZmlnLCBicm93c2VyT3B0aW9ucyk7XG4gIGF3YWl0IGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnLCBwYWNrYWdlc0luZm8pO1xuXG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ3NldHRpbmcgdXAgYXNzZXRzIG9wdGlvbnMnKTtcbiAgLy8gQmVjYXVzZSBkZXYtc2VydmUtYXNzZXRzIGRlcGVuZHMgb24gRFJDUCBhcGksIEkgaGF2ZSB0byBsYXp5IGxvYWQgaXQuXG4gIGNvbnN0IGZvckVhY2hBc3NldHNEaXI6IHR5cGVvZiBwYWNrYWdlQXNzZXRzRm9sZGVycyA9XG4gIHJlcXVpcmUoJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJykucGFja2FnZUFzc2V0c0ZvbGRlcnM7XG4gIGZvckVhY2hBc3NldHNEaXIoJy8nLCAoaW5wdXREaXIsIG91dHB1dERpcikgPT4ge1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuYXNzZXRzKSB7XG4gICAgICBicm93c2VyT3B0aW9ucy5hc3NldHMgPSBbXTtcbiAgICB9XG4gICAgbGV0IGlucHV0ID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBpbnB1dERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICghaW5wdXQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBpbnB1dCA9ICcuLycgKyBpbnB1dDtcbiAgICB9XG4gICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzIS5wdXNoKHtcbiAgICAgIGlucHV0LFxuICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgb3V0cHV0OiBvdXRwdXREaXIuZW5kc1dpdGgoJy8nKSA/IG91dHB1dERpciA6IG91dHB1dERpciArICcvJ1xuICAgIH0pO1xuICB9KTtcbiAgZnMud3JpdGVGaWxlKGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICdhbmd1bGFyLWNsaS1vcHRpb25zLmpzb24nKSxcbiAgSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMsIHVuZGVmaW5lZCwgJyAgJyksICgpID0+IHt9KTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcbiAgY29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuICAgIHJldHVybiB3cml0ZVRvO1xuICB9XG4gIGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG4gIGxldCBtYWluSG1yID0gJy8vIHRzbGludDpkaXNhYmxlXFxuJyArXG4gIGBpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9obXInO1xcbiR7bWFpbn1gO1xuICBjb25zdCBxdWVyeSA9IG5ldyBUc0FzdFNlbGVjdG9yKG1haW5IbXIsICdtYWluLWhtci50cycpO1xuICAvLyBxdWVyeS5wcmludEFsbCgpO1xuXG4gIGxldCBib290Q2FsbEFzdDogdHMuTm9kZTtcbiAgY29uc3Qgc3RhdGVtZW50ID0gcXVlcnkuc3JjLnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZS1sZW5ndGhcbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRNYXBUbyhzdGF0ZW1lbnQsICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgICAgIChhc3Q6IHRzLklkZW50aWZpZXIsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgaWYgKGJvb3RDYWxsKSB7XG4gICAgICBib290Q2FsbEFzdCA9IGJvb3RDYWxsO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgaWYgKHN0YXRlbWVudCA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcihgJHttYWluRmlsZX0sYCArXG4gICAgYGNhbiBub3QgZmluZCBzdGF0ZW1lbnQgbGlrZTogcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXFxuJHttYWluSG1yfWApO1xuXG4gIG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbe1xuICAgIHN0YXJ0OiBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKSxcbiAgICBlbmQ6IHN0YXRlbWVudC5nZXRFbmQoKSxcbiAgICB0ZXh0OiAnJ31dKTtcbiAgbWFpbkhtciArPSBgY29uc3QgYm9vdHN0cmFwID0gKCkgPT4gJHtib290Q2FsbEFzdCEuZ2V0VGV4dCgpfTtcXG5gO1xuICBtYWluSG1yICs9IGBpZiAobW9kdWxlWyAnaG90JyBdKSB7XG5cdCAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuXHQgIH0gZWxzZSB7XG5cdCAgICBjb25zb2xlLmVycm9yKCdITVIgaXMgbm90IGVuYWJsZWQgZm9yIHdlYnBhY2stZGV2LXNlcnZlciEnKTtcblx0ICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcblx0ICB9XFxuYC5yZXBsYWNlKC9eXFx0L2dtLCAnJyk7XG5cbiAgZnMud3JpdGVGaWxlU3luYyh3cml0ZVRvLCBtYWluSG1yKTtcbiAgbG9nLmluZm8oJ1dyaXRlICcgKyB3cml0ZVRvKTtcbiAgbG9nLmluZm8obWFpbkhtcik7XG4gIHJldHVybiB3cml0ZVRvO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5hc3luYyBmdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnLFxuICBwYWNrYWdlc0luZm86IEV4dHJhY3RQcm9taXNlPFJldHVyblR5cGU8dHlwZW9mIGluamVjdG9yU2V0dXA+Pikge1xuXG4gIGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuICBjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG4gIGNvbnN0IHVzZVRocmVhZCA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy51c2VUaHJlYWQnLCB0cnVlKTtcbiAgY29uc3QgbmV3VHNDb25maWcgPSB1c2VUaHJlYWQgP1xuICAgIGF3YWl0IGNyZWF0ZVRzQ29uZmlnSW5Xb3JrZXIodHNDb25maWdGaWxlLCBicm93c2VyT3B0aW9ucywgY29uZmlnLCBwYWNrYWdlc0luZm8pIDpcbiAgICBjcmVhdGVUc0NvbmZpZ1N5bmModHNDb25maWdGaWxlLCBicm93c2VyT3B0aW9ucywgY29uZmlnLCBwYWNrYWdlc0luZm8pO1xuICBmcy53cml0ZUZpbGUoY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ3RzY29uZmlnLmpzb24nKSwgbmV3VHNDb25maWcsICgpID0+IHtcbiAgfSk7XG5cbiAgc3lzLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVzOiBzdHJpbmcgPSBvbGRSZWFkRmlsZS5hcHBseShzeXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcbiAgICAgIC8vIEFuZ3VsYXIgc29tZWhvdyByZWFkcyB0c2NvbmZpZy5qc29uIHR3aWNlIGFuZCBwYXNzZXMgaW4gYHBhdGhgXG4gICAgICAvLyB3aXRoIGRpZmZlcmVudCBwYXRoIHNlcGVyYXRvciBgXFxgIGFuZCBgL2AgaW4gV2luZG93cyBcbiAgICAgIC8vIGBjYWNoZWRUc0NvbmZpZ0ZvcmAgaXMgbG9kYXNoIG1lbW9pemUgZnVuY3Rpb24gd2hpY2ggbmVlZHMgYVxuICAgICAgLy8gY29uc2lzdGVudCBgcGF0aGAgdmFsdWUgYXMgY2FjaGUga2V5XG4gICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgUGF0aC5zZXApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgaWYgKHBhdGggPT09IHRzQ29uZmlnRmlsZSlcbiAgICAgICAgcmV0dXJuIG5ld1RzQ29uZmlnO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVHNDb25maWdTeW5jKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPj4pIHtcbiAgY29uc3Qge2NyZWF0ZVRzQ29uZmlnfSA9IHJlcXVpcmUoJy4vY2hhbmdlLXRzY29uZmlnJykgYXMge2NyZWF0ZVRzQ29uZmlnOiB0eXBlb2YgX2NyZWF0ZVRzQ29uZmlnfTtcbiAgbWVtc3RhdHMoKTtcbiAgcmV0dXJuIGNyZWF0ZVRzQ29uZmlnKHRzY29uZmlnRmlsZSwgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lKSxcbiAgICBwYWNrYWdlSW5mbywgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JykpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPj4pIHtcblxuICBjb25zdCByZXBvcnREaXIgPSBjb25maWcucmVzb2x2ZSgnZGVzdERpcicsICduZy1hcHAtYnVpbGRlci5yZXBvcnQnKTtcblxuICBtZW1zdGF0cygpO1xuICBjb25zdCB3b3JrZXJMb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyLndvcmtlcicpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWopID0+IHtcblxuICAgIGNvbnN0IHdvcmtlckRhdGE6IERhdGEgPSB7XG4gICAgICB0c2NvbmZpZ0ZpbGUsXG4gICAgICByZXBvcnREaXIsXG4gICAgICBjb25maWc6IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lKSxcbiAgICAgIG5nT3B0aW9uczoge1xuICAgICAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgICBtYWluOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgICBmaWxlUmVwbGFjZW1lbnRzOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpKVxuICAgICAgfSxcbiAgICAgIHBhY2thZ2VJbmZvLFxuICAgICAgZHJjcEJ1aWxkZXJPcHRpb25zOiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHtkcmNwQXJnczogYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MsIGRyY3BDb25maWc6IGJyb3dzZXJPcHRpb25zLmRyY3BDb25maWd9KSkgYXMgRHJjcEJ1aWxkZXJPcHRpb25zLFxuICAgICAgYmFzZUhyZWY6IGJyb3dzZXJPcHRpb25zLmJhc2VIcmVmLFxuICAgICAgZGVwbG95VXJsOiBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmxcbiAgICB9O1xuICAgIGNvbnN0IHdvcmtlciA9IG5ldyBXb3JrZXIocmVxdWlyZS5yZXNvbHZlKCcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXIuanMnKSwge3dvcmtlckRhdGF9KTtcbiAgICB3b3JrZXIub24oJ2Vycm9yJywgcmVqKTtcbiAgICB3b3JrZXIub24oJ21lc3NhZ2UnLCAobXNnKSA9PiB7XG4gICAgICBpZiAobXNnLmxvZykge1xuICAgICAgICB3b3JrZXJMb2cuaW5mbyhtc2cubG9nKTtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cucmVzdWx0KSB7XG4gICAgICAgIHJlc29sdmUobXNnLnJlc3VsdCk7XG4gICAgICB9XG4gICAgICAvLyB3b3JrZXIub2ZmKCdlcnJvcicsIHJlaik7XG4gICAgfSk7XG4gICAgd29ya2VyLm9uKCdleGl0JywgKCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ3dvcmtlciBleGl0cycpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuXG4iXX0=
