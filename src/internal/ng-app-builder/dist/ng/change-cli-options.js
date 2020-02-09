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
        context.logger.info('browser builder options:' + JSON.stringify(browserOptions, undefined, '  '));
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
    const reportFile = config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json');
    mem_stats_1.default();
    return new Promise((resolve, rej) => {
        const file = require.resolve('./change-tsconfig-worker.js');
        console.log('Call worker', file);
        const workerData = {
            tsconfigFile,
            reportFile,
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
        const worker = new worker_threads_1.Worker(file, { workerData });
        worker.on('error', rej);
        worker.once('message', (res) => {
            resolve(res);
            worker.off('error', rej);
        });
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUkzRiwwREFBMEI7QUFFMUIsOEVBQXlFO0FBQ3pFLHVFQUF1RTtBQUN2RSwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QixtREFBc0M7QUFDdEMsaUVBQXFDO0FBQ3JDLHNEQUFzQjtBQUN0Qiw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUE2QztBQUc3QyxpR0FBZ0U7QUFFaEUsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsZUFBSyxDQUFDO0FBQ2pDLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFldEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQW9D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QVUsRUFBQyxDQUFDLENBQUM7UUFDOUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDeEIsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUNyQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDYixNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0LCB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBwYWNrYWdlQXNzZXRzRm9sZGVycyB9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBDb25maWdIYW5kbGVyLCBEcmNwQ29uZmlnIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7IGdldExhbklQdjQgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbmV0d29yay11dGlsJztcbi8vIGltcG9ydCB7IGdldFRzRGlyc09mUGFja2FnZSB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtXb3JrZXJ9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCB0cywgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBUc0FzdFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgaW5qZWN0b3JTZXR1cCBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB7IERyY3BCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4uLy4uL2Rpc3Qvc2VydmVyJztcbmltcG9ydCB7RGF0YX0gZnJvbSAnLi9jaGFuZ2UtdHNjb25maWctd29ya2VyJztcbmltcG9ydCBtZW1zdGF0cyBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbWVtLXN0YXRzJztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gY2hhbGs7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcblxudHlwZSBFeHRyYWN0UHJvbWlzZTxQPiA9IFAgZXh0ZW5kcyBQcm9taXNlPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cbiAgYW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICAgIGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcbiAgOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuICByZXBsYWNlZE9wdHM6IGFueSkge1xuICBjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG4gIGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgIC8vIGxvZy5pbmZvKCdBbmd1bGFyIGNsaSBidWlsZCBvcHRpb25zJywgcmVwbGFjZWRPcHRzKTtcbiAgICAgIHJldHVybiByZXBsYWNlZE9wdHM7XG4gICAgfVxuICAgIGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9yaWdPcHRpb247XG4gIH07XG59XG4vKipcbiAqIEZvciBidWlsZCAobmcgYnVpbGQpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSwgY29udGV4dDogQnVpbGRlckNvbnRleHQpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuICByZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucywgY29udGV4dCk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBidWlsZGVyQ29uZmlnOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucykge1xuXG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKGJ1aWxkZXJDb25maWchLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICAgIGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICByYXdCcm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBkZXZTZXJ2ZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgaG1yID0gZmFsc2UpIHtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnQ2hhbmdlIGJ1aWxkZXIgb3B0aW9ucycpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG9iajtcbiAgfSk7XG5cbiAgaWYgKCFicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuICAvLyBpZiBzdGF0aWMgYXNzZXRzJ3MgVVJMIGlzIG5vdCBsZWQgYnkgJy8nLCBpdCB3aWxsIGJlIGNvbnNpZGVyZWQgYXMgcmVsYXRpdmUgcGF0aCBpbiBuZy1odG1sLWxvYWRlclxuXG4gIGlmIChkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UoYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsLCB0cnVlLCB0cnVlKTtcbiAgICBpZiAocGFyc2VkVXJsLmhvc3QgPT0gbnVsbCkge1xuICAgICAgcGFyc2VkVXJsLmhvc3RuYW1lID0gZ2V0TGFuSVB2NCgpO1xuICAgICAgcGFyc2VkVXJsLnBvcnQgPSBkZXZTZXJ2ZXJDb25maWcucG9ydCArICcnO1xuICAgICAgcGFyc2VkVXJsLnByb3RvY29sID0gJ2h0dHAnO1xuICAgICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gVXJsLmZvcm1hdChwYXJzZWRVcmwpO1xuICAgICAgLy8gVE9ETzogcHJpbnQgcmlnaHQgYWZ0ZXIgc2VydmVyIGlzIHN1Y2Nlc3NmdWxseSBzdGFydGVkXG4gICAgICBzZXRUaW1lb3V0KCgpID0+XG4gICAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnJlZChgQ3VycmVudCBkZXYgc2VydmVyIHJlc291cmNlIGlzIGhvc3RlZCBvbiAke3BhcnNlZFVybC5ob3N0bmFtZX0sXFxuaWYgeW91ciBuZXR3b3JrIGlzIHJlY29ubmVjdGVkIG9yIGxvY2FsIElQIGFkZHJlc3MgaXMgYCArXG4gICAgICAgICcgY2hhbmdlZCwgeW91IHdpbGwgbmVlZCB0byByZXN0YXJ0IHRoaXMgZGV2IHNlcnZlciEnKSksIDUwMDApO1xuICAgIH1cbiAgICBpZiAocGFyc2VkVXJsLnBhdGhuYW1lKVxuICAgICAgZGV2U2VydmVyQ29uZmlnLnNlcnZlUGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZTsgLy8gSW4gY2FzZSBkZXBsb3lVcmwgaGFzIGhvc3QsIG5nIGNsaSB3aWxsIHJlcG9ydCBlcnJvciBmb3IgbnVsbCBzZXJ2ZVBhdGhcbiAgfVxuXG4gIGlmIChicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSB7XG4gICAgY29uc29sZS5sb2coYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyk7XG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzXG4gICAgLmZvckVhY2goZnIgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZnIpLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZTogc3RyaW5nID0gZnJbZmllbGRdO1xuICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHZhbHVlKSkge1xuICAgICAgICAgIGZyW2ZpZWxkXSA9IFBhdGgucmVsYXRpdmUoY3dkLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcGtKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGlmIChwa0pzb24pIHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgU2V0IGVudHJ5IHBhY2thZ2UgJHtjeWFuKHBrSnNvbi5uYW1lKX0ncyBvdXRwdXQgcGF0aCB0byAvYCk7XG4gICAgY29uZmlnLnNldChbJ291dHB1dFBhdGhNYXAnLCBwa0pzb24ubmFtZV0sICcvJyk7IC8vIHN0YXRpYyBhc3NldHMgaW4gZW50cnkgcGFja2FnZSBzaG91bGQgYWx3YXlzIGJlIG91dHB1dCB0byByb290IHBhdGhcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG4gIGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcbiAgaWYgKGhtciAmJiBkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBkZXZTZXJ2ZXJDb25maWcuaG1yID0gdHJ1ZTtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG4gICAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICB3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcbiAgICB9KTtcbiAgfVxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuICAgIGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG4gIH1cblxuICBicm93c2VyT3B0aW9ucy5jb21tb25DaHVuayA9IGZhbHNlO1xuXG4gIGNvbnN0IHBhY2thZ2VzSW5mbyA9IGF3YWl0IGluamVjdG9yU2V0dXAoY29uZmlnLCBicm93c2VyT3B0aW9ucyk7XG4gIGF3YWl0IGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnLCBwYWNrYWdlc0luZm8pO1xuXG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ3NldHRpbmcgdXAgYXNzZXRzIG9wdGlvbnMnKTtcbiAgLy8gQmVjYXVzZSBkZXYtc2VydmUtYXNzZXRzIGRlcGVuZHMgb24gRFJDUCBhcGksIEkgaGF2ZSB0byBsYXp5IGxvYWQgaXQuXG4gIGNvbnN0IGZvckVhY2hBc3NldHNEaXI6IHR5cGVvZiBwYWNrYWdlQXNzZXRzRm9sZGVycyA9XG4gIHJlcXVpcmUoJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJykucGFja2FnZUFzc2V0c0ZvbGRlcnM7XG4gIGZvckVhY2hBc3NldHNEaXIoJy8nLCAoaW5wdXREaXIsIG91dHB1dERpcikgPT4ge1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuYXNzZXRzKSB7XG4gICAgICBicm93c2VyT3B0aW9ucy5hc3NldHMgPSBbXTtcbiAgICB9XG4gICAgbGV0IGlucHV0ID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBpbnB1dERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICghaW5wdXQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBpbnB1dCA9ICcuLycgKyBpbnB1dDtcbiAgICB9XG4gICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzIS5wdXNoKHtcbiAgICAgIGlucHV0LFxuICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgb3V0cHV0OiBvdXRwdXREaXIuZW5kc1dpdGgoJy8nKSA/IG91dHB1dERpciA6IG91dHB1dERpciArICcvJ1xuICAgIH0pO1xuICB9KTtcbiAgY29udGV4dC5sb2dnZXIuaW5mbygnYnJvd3NlciBidWlsZGVyIG9wdGlvbnM6JyArIEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLCB1bmRlZmluZWQsICcgICcpKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcbiAgY29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuICAgIHJldHVybiB3cml0ZVRvO1xuICB9XG4gIGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG4gIGxldCBtYWluSG1yID0gJy8vIHRzbGludDpkaXNhYmxlXFxuJyArXG4gIGBpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9obXInO1xcbiR7bWFpbn1gO1xuICBjb25zdCBxdWVyeSA9IG5ldyBUc0FzdFNlbGVjdG9yKG1haW5IbXIsICdtYWluLWhtci50cycpO1xuICAvLyBxdWVyeS5wcmludEFsbCgpO1xuXG4gIGxldCBib290Q2FsbEFzdDogdHMuTm9kZTtcbiAgY29uc3Qgc3RhdGVtZW50ID0gcXVlcnkuc3JjLnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZS1sZW5ndGhcbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRXaXRoKHN0YXRlbWVudCwgJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICBpZiAoYm9vdENhbGwpIHtcbiAgICAgIGJvb3RDYWxsQXN0ID0gYm9vdENhbGw7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBpZiAoc3RhdGVtZW50ID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21haW5GaWxlfSxgICtcbiAgICBgY2FuIG5vdCBmaW5kIHN0YXRlbWVudCBsaWtlOiBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcXG4ke21haW5IbXJ9YCk7XG5cbiAgbWFpbkhtciA9IHJlcGxhY2VDb2RlKG1haW5IbXIsIFt7XG4gICAgc3RhcnQ6IHN0YXRlbWVudC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpLFxuICAgIGVuZDogc3RhdGVtZW50LmdldEVuZCgpLFxuICAgIHRleHQ6ICcnfV0pO1xuICBtYWluSG1yICs9IGBjb25zdCBib290c3RyYXAgPSAoKSA9PiAke2Jvb3RDYWxsQXN0IS5nZXRUZXh0KCl9O1xcbmA7XG4gIG1haW5IbXIgKz0gYGlmIChtb2R1bGVbICdob3QnIF0pIHtcblx0ICAgIGhtckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuXHQgICAgY29uc29sZS5sb2coJ0FyZSB5b3UgdXNpbmcgdGhlIC0taG1yIGZsYWcgZm9yIG5nIHNlcnZlPycpO1xuXHQgIH1cXG5gLnJlcGxhY2UoL15cXHQvZ20sICcnKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKHdyaXRlVG8sIG1haW5IbXIpO1xuICBsb2cuaW5mbygnV3JpdGUgJyArIHdyaXRlVG8pO1xuICBsb2cuaW5mbyhtYWluSG1yKTtcbiAgcmV0dXJuIHdyaXRlVG87XG59XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmFzeW5jIGZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VzSW5mbzogRXh0cmFjdFByb21pc2U8UmV0dXJuVHlwZTx0eXBlb2YgaW5qZWN0b3JTZXR1cD4+KSB7XG5cbiAgY29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG4gIGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cbiAgY29uc3QgbmV3VHNDb25maWcgPSBhd2FpdCBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzQ29uZmlnRmlsZSwgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZywgcGFja2FnZXNJbmZvKTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuICAgICAgICByZXR1cm4gbmV3VHNDb25maWc7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUocGspO1xuICAgIH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZ0luV29ya2VyKHRzY29uZmlnRmlsZTogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHBhY2thZ2VJbmZvOiBFeHRyYWN0UHJvbWlzZTxSZXR1cm5UeXBlPHR5cGVvZiBpbmplY3RvclNldHVwPj4pIHtcblxuICBjb25zdCByZXBvcnRGaWxlID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ3RzY29uZmlnLmpzb24nKTtcblxuICBtZW1zdGF0cygpO1xuXG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlLCByZWopID0+IHtcbiAgICBjb25zdCBmaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuL2NoYW5nZS10c2NvbmZpZy13b3JrZXIuanMnKTtcbiAgICBjb25zb2xlLmxvZygnQ2FsbCB3b3JrZXInLCBmaWxlKTtcblxuICAgIGNvbnN0IHdvcmtlckRhdGE6IERhdGEgPSB7XG4gICAgICB0c2NvbmZpZ0ZpbGUsXG4gICAgICByZXBvcnRGaWxlLFxuICAgICAgY29uZmlnOiBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSksXG4gICAgICBuZ09wdGlvbnM6IHtcbiAgICAgICAgcHJlc2VydmVTeW1saW5rczogYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyxcbiAgICAgICAgbWFpbjogYnJvd3Nlck9wdGlvbnMubWFpbixcbiAgICAgICAgZmlsZVJlcGxhY2VtZW50czogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSlcbiAgICAgIH0sXG4gICAgICBwYWNrYWdlSW5mbyxcbiAgICAgIGRyY3BCdWlsZGVyT3B0aW9uczogSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSh7ZHJjcEFyZ3M6IGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzLCBkcmNwQ29uZmlnOiBicm93c2VyT3B0aW9ucy5kcmNwQ29uZmlnfSkpIGFzIERyY3BCdWlsZGVyT3B0aW9ucyxcbiAgICAgIGJhc2VIcmVmOiBicm93c2VyT3B0aW9ucy5iYXNlSHJlZixcbiAgICAgIGRlcGxveVVybDogYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsXG4gICAgfTtcbiAgICBjb25zdCB3b3JrZXIgPSBuZXcgV29ya2VyKGZpbGUsIHt3b3JrZXJEYXRhfSk7XG4gICAgd29ya2VyLm9uKCdlcnJvcicsIHJlaik7XG4gICAgd29ya2VyLm9uY2UoJ21lc3NhZ2UnLCAocmVzOiBzdHJpbmcpID0+IHtcbiAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgIHdvcmtlci5vZmYoJ2Vycm9yJywgcmVqKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cblxuIl19
