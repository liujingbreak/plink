"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const architect_1 = require("@angular-devkit/architect");
// import { getTsDirsOfPackage } from 'dr-comp-package/wfh/dist/utils';
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const url_1 = tslib_1.__importDefault(require("url"));
const typescript_1 = require("typescript");
const parse_app_module_1 = require("../utils/parse-app-module");
const patch_text_1 = tslib_1.__importDefault(require("../utils/patch-text"));
const ts_ast_query_1 = tslib_1.__importDefault(require("../utils/ts-ast-query"));
const injector_setup_1 = tslib_1.__importDefault(require("./injector-setup"));
const typescript_2 = tslib_1.__importDefault(require("typescript"));
const tsconfig_app_json_1 = tslib_1.__importDefault(require("../../misc/tsconfig.app.json"));
const network_util_1 = require("dr-comp-package/wfh/dist/utils/network-util");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const { cyan, green, red } = chalk_1.default;
const { walkPackages } = require('dr-comp-package/wfh/dist/build-util/ts');
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
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
            config.set(['outputPathMap', pkJson.name], '/');
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
        hackTsConfig(browserOptions, config);
        yield injector_setup_1.default(browserOptions);
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
                ast.parent.parent.parent.kind === typescript_2.default.SyntaxKind.CallExpression) {
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
function hackTsConfig(browserOptions, config) {
    const oldReadFile = typescript_1.sys.readFile;
    const tsConfigFile = Path.resolve(browserOptions.tsConfig);
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
                return cachedTsConfigFor(path, res, browserOptions, config);
            else
                return res;
        }
        catch (err) {
            console.error(red('change-cli-options - ') + `Read ${path}`, err);
        }
        return '';
    };
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
/**
 * Angular cli will read tsconfig.json twice due to some junk code,
 * let's memoize the result by file path as cache key.
 */
const cachedTsConfigFor = _.memoize(overrideTsConfig);
/**
 * Let's override tsconfig.json files for Angular at rutime :)
 * - Read into memory
 * - Do not override properties of compilerOptions,angularCompilerOptions that exists in current file
 * - "extends" must be ...
 * - Traverse packages to build proper includes and excludes list and ...
 * - Find file where AppModule is in, find its package, move its directory to top of includes list,
 * 	which fixes ng cli windows bug
 */
function overrideTsConfig(file, content, browserOptions, config) {
    const root = config().rootPath;
    const result = typescript_2.default.parseConfigFileTextToJson(file, content);
    if (result.error) {
        log.error(result.error);
        throw new Error(`${file} contains incorrect configuration`);
    }
    const oldJson = result.config;
    const preserveSymlinks = browserOptions.preserveSymlinks;
    const pathMapping = preserveSymlinks ? undefined : {};
    const pkInfo = walkPackages(config, null, packageUtils, true);
    let ngPackages = pkInfo.allModules;
    const appModuleFile = parse_app_module_1.findAppModuleFileFromMain(Path.resolve(browserOptions.main));
    const appPackageJson = lookupEntryPackage(appModuleFile);
    if (appPackageJson == null)
        throw new Error('Error, can not find package.json of ' + appModuleFile);
    ngPackages.forEach(pk => {
        if (!preserveSymlinks) {
            const realDir = Path.relative(root, pk.realPackagePath).replace(/\\/g, '/');
            pathMapping[pk.longName] = [realDir];
            pathMapping[pk.longName + '/*'] = [realDir + '/*'];
        }
    });
    // Important! to make Angular & Typescript resolve correct real path of symlink lazy route module
    if (!preserveSymlinks) {
        const drcpDir = Path.relative(root, fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
        pathMapping['dr-comp-package'] = [drcpDir];
        pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
    }
    var tsjson = {
        // extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
        include: config.get(currPackageName)
            .tsconfigInclude
            .map(preserveSymlinks ? p => p : globRealPath)
            .map(pattern => Path.relative(Path.dirname(file), pattern).replace(/\\/g, '/')),
        exclude: [],
        compilerOptions: Object.assign({}, tsconfig_app_json_1.default.compilerOptions, { baseUrl: root, 
            // typeRoots: [
            //   Path.resolve(root, 'node_modules/@types'),
            //   Path.resolve(root, 'node_modules/@dr-types'),
            //   // Below is NodeJS only, which will break Angular Ivy engine
            //   Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
            // ],
            // module: 'esnext',
            preserveSymlinks }, oldJson.compilerOptions, { paths: Object.assign({}, tsconfig_app_json_1.default.compilerOptions.paths, pathMapping) }),
        angularCompilerOptions: Object.assign({}, oldJson.angularCompilerOptions)
    };
    if (oldJson.extends) {
        tsjson.extends = oldJson.extends;
    }
    if (oldJson.compilerOptions.paths) {
        Object.assign(tsjson.compilerOptions.paths, oldJson.compilerOptions.paths);
    }
    if (oldJson.include) {
        tsjson.include = _.union(tsjson.include.concat(oldJson.include));
    }
    if (oldJson.exclude) {
        tsjson.exclude = _.union(tsjson.exclude.concat(oldJson.exclude));
    }
    if (oldJson.files)
        tsjson.files = oldJson.files;
    const sourceFiles = require('./add-tsconfig-file').addSourceFiles;
    if (!tsjson.files)
        tsjson.files = [];
    tsjson.files.push(...sourceFiles(tsjson.compilerOptions, tsjson.files, file, browserOptions.fileReplacements));
    // console.log(green('change-cli-options - ') + `${file}:\n`, JSON.stringify(tsjson, null, '  '));
    log.info(`${file}:\n${JSON.stringify(tsjson, null, '  ')}`);
    return JSON.stringify(tsjson, null, '  ');
}
function globRealPath(glob) {
    const res = /^([^*]+)\/[^/*]*\*/.exec(glob);
    if (res) {
        return fs.realpathSync(res[1]).replace(/\\/g, '/') + res.input.slice(res[1].length);
    }
    return glob;
}
// function hasIsomorphicDir(pkJson: any, packagePath: string) {
//   const fullPath = Path.resolve(packagePath, getTsDirsOfPackage(pkJson).isomDir);
//   try {
//     return fs.statSync(fullPath).isDirectory();
//   } catch (e) {
//     return false;
//   }
// }

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRix1RUFBdUU7QUFDdkUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQXNCO0FBQ3RCLDJDQUFpQztBQUVqQyxnRUFBc0U7QUFDdEUsNkVBQThDO0FBQzlDLGlGQUFrRDtBQUVsRCw4RUFBd0M7QUFDeEMsb0VBQTRCO0FBRTVCLDZGQUF1RDtBQUV2RCw4RUFBdUU7QUFDdkUsMERBQTBCO0FBRTFCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLGVBQUssQ0FBQztBQUNqQyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQVl0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDNUUsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQsT0FBTyxDQUFDLGdCQUFnQixHQUFHLFVBQWUsTUFBYzs7WUFDdEQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtnQkFDaEMsdURBQXVEO2dCQUN2RCxPQUFPLFlBQVksQ0FBQzthQUNyQjtZQUNELE1BQU0sVUFBVSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxT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QUkiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQsIFRhcmdldCwgdGFyZ2V0RnJvbVRhcmdldFN0cmluZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgUGFja2FnZUluZm8gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cyc7XG5pbXBvcnQgeyBDb25maWdIYW5kbGVyLCBEcmNwQ29uZmlnIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbi8vIGltcG9ydCB7IGdldFRzRGlyc09mUGFja2FnZSB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgc3lzIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBEcmNwU2V0dGluZyBhcyBOZ0FwcEJ1aWxkZXJTZXR0aW5nIH0gZnJvbSAnLi4vY29uZmlndXJhYmxlJztcbmltcG9ydCB7IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4gfSBmcm9tICcuLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBUc0FzdFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgYXBpU2V0dXAgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3BhY2thZ2VBc3NldHNGb2xkZXJzfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cyc7XG5pbXBvcnQgYXBwVHNjb25maWcgZnJvbSAnLi4vLi4vbWlzYy90c2NvbmZpZy5hcHAuanNvbic7XG5pbXBvcnQge2FkZFNvdXJjZUZpbGVzfSBmcm9tICcuL2FkZC10c2NvbmZpZy1maWxlJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSBjaGFsaztcbmNvbnN0IHt3YWxrUGFja2FnZXN9ID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cbiAgYW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICAgIGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcbiAgOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuICByZXBsYWNlZE9wdHM6IGFueSkge1xuICBjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG4gIGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgIC8vIGxvZy5pbmZvKCdBbmd1bGFyIGNsaSBidWlsZCBvcHRpb25zJywgcmVwbGFjZWRPcHRzKTtcbiAgICAgIHJldHVybiByZXBsYWNlZE9wdHM7XG4gICAgfVxuICAgIGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9yaWdPcHRpb247XG4gIH07XG59XG4vKipcbiAqIEZvciBidWlsZCAobmcgYnVpbGQpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSwgY29udGV4dDogQnVpbGRlckNvbnRleHQpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuICByZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucywgY29udGV4dCk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBidWlsZGVyQ29uZmlnOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucykge1xuXG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKGJ1aWxkZXJDb25maWchLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICAgIGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICByYXdCcm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBkZXZTZXJ2ZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgaG1yID0gZmFsc2UpIHtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnQ2hhbmdlIGJ1aWxkZXIgb3B0aW9ucycpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG9iajtcbiAgfSk7XG5cbiAgaWYgKCFicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuICAvLyBpZiBzdGF0aWMgYXNzZXRzJ3MgVVJMIGlzIG5vdCBsZWQgYnkgJy8nLCBpdCB3aWxsIGJlIGNvbnNpZGVyZWQgYXMgcmVsYXRpdmUgcGF0aCBpbiBuZy1odG1sLWxvYWRlclxuXG4gIGlmIChkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UoYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsLCB0cnVlLCB0cnVlKTtcbiAgICBpZiAocGFyc2VkVXJsLmhvc3QgPT0gbnVsbCkge1xuICAgICAgcGFyc2VkVXJsLmhvc3RuYW1lID0gZ2V0TGFuSVB2NCgpO1xuICAgICAgcGFyc2VkVXJsLnBvcnQgPSBkZXZTZXJ2ZXJDb25maWcucG9ydCArICcnO1xuICAgICAgcGFyc2VkVXJsLnByb3RvY29sID0gJ2h0dHAnO1xuICAgICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gVXJsLmZvcm1hdChwYXJzZWRVcmwpO1xuICAgICAgLy8gVE9ETzogcHJpbnQgcmlnaHQgYWZ0ZXIgc2VydmVyIGlzIHN1Y2Nlc3NmdWxseSBzdGFydGVkXG4gICAgICBzZXRUaW1lb3V0KCgpID0+XG4gICAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnJlZChgQ3VycmVudCBkZXYgc2VydmVyIHJlc291cmNlIGlzIGhvc3RlZCBvbiAke3BhcnNlZFVybC5ob3N0bmFtZX0sXFxuaWYgeW91ciBuZXR3b3JrIGlzIHJlY29ubmVjdGVkIG9yIGxvY2FsIElQIGFkZHJlc3MgaXMgYCArXG4gICAgICAgICcgY2hhbmdlZCwgeW91IHdpbGwgbmVlZCB0byByZXN0YXJ0IHRoaXMgZGV2IHNlcnZlciEnKSksIDUwMDApO1xuICAgIH1cbiAgICBkZXZTZXJ2ZXJDb25maWcuc2VydmVQYXRoID0gcGFyc2VkVXJsLnBhdGhuYW1lOyAvLyBJbiBjYXNlIGRlcGxveVVybCBoYXMgaG9zdCwgbmcgY2xpIHdpbGwgcmVwb3J0IGVycm9yIGZvciBudWxsIHNlcnZlUGF0aFxuICB9XG5cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpIHtcbiAgICBjb25zb2xlLmxvZyhicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKTtcbiAgICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHNcbiAgICAuZm9yRWFjaChmciA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhmcikuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlOiBzdHJpbmcgPSBmcltmaWVsZF07XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUodmFsdWUpKSB7XG4gICAgICAgICAgZnJbZmllbGRdID0gUGF0aC5yZWxhdGl2ZShjd2QsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgaWYgKHBrSnNvbikge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcbiAgICBjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTtcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG4gIGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcbiAgaWYgKGhtciAmJiBkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBkZXZTZXJ2ZXJDb25maWcuaG1yID0gdHJ1ZTtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG4gICAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICB3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcbiAgICB9KTtcbiAgfVxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuICAgIGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG4gIH1cblxuICBicm93c2VyT3B0aW9ucy5jb21tb25DaHVuayA9IGZhbHNlO1xuXG4gIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbiAgYXdhaXQgYXBpU2V0dXAoYnJvd3Nlck9wdGlvbnMpO1xuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdzZXR0aW5nIHVwIGFzc2V0cyBvcHRpb25zJyk7XG4gIC8vIEJlY2F1c2UgZGV2LXNlcnZlLWFzc2V0cyBkZXBlbmRzIG9uIERSQ1AgYXBpLCBJIGhhdmUgdG8gbGF6eSBsb2FkIGl0LlxuICBjb25zdCBmb3JFYWNoQXNzZXRzRGlyOiB0eXBlb2YgcGFja2FnZUFzc2V0c0ZvbGRlcnMgPVxuICByZXF1aXJlKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLnBhY2thZ2VBc3NldHNGb2xkZXJzO1xuICBmb3JFYWNoQXNzZXRzRGlyKCcvJywgKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmFzc2V0cykge1xuICAgICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzID0gW107XG4gICAgfVxuICAgIGxldCBpbnB1dCA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5wdXREaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWlucHV0LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgaW5wdXQgPSAnLi8nICsgaW5wdXQ7XG4gICAgfVxuICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyEucHVzaCh7XG4gICAgICBpbnB1dCxcbiAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgIG91dHB1dDogb3V0cHV0RGlyLmVuZHNXaXRoKCcvJykgPyBvdXRwdXREaXIgOiBvdXRwdXREaXIgKyAnLydcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnRleHQubG9nZ2VyLmluZm8oJ2Jyb3dzZXIgYnVpbGRlciBvcHRpb25zOicgKyBKU09OLnN0cmluZ2lmeShicm93c2VyT3B0aW9ucywgdW5kZWZpbmVkLCAnICAnKSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFpbkZpbGVGb3JIbXIobWFpbkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShtYWluRmlsZSk7XG4gIGNvbnN0IHdyaXRlVG8gPSBQYXRoLnJlc29sdmUoZGlyLCAnbWFpbi1obXIudHMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMod3JpdGVUbykpIHtcbiAgICByZXR1cm4gd3JpdGVUbztcbiAgfVxuICBjb25zdCBtYWluID0gZnMucmVhZEZpbGVTeW5jKG1haW5GaWxlLCAndXRmOCcpO1xuICBsZXQgbWFpbkhtciA9ICcvLyB0c2xpbnQ6ZGlzYWJsZVxcbicgK1xuICBgaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvaG1yJztcXG4ke21haW59YDtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVHNBc3RTZWxlY3RvcihtYWluSG1yLCAnbWFpbi1obXIudHMnKTtcbiAgLy8gcXVlcnkucHJpbnRBbGwoKTtcblxuICBsZXQgYm9vdENhbGxBc3Q6IHRzLk5vZGU7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmUtbGVuZ3RoXG4gICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kV2l0aChzdGF0ZW1lbnQsICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgICAgIChhc3Q6IHRzLklkZW50aWZpZXIsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgaWYgKGJvb3RDYWxsKSB7XG4gICAgICBib290Q2FsbEFzdCA9IGJvb3RDYWxsO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgaWYgKHN0YXRlbWVudCA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcihgJHttYWluRmlsZX0sYCArXG4gICAgYGNhbiBub3QgZmluZCBzdGF0ZW1lbnQgbGlrZTogcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXFxuJHttYWluSG1yfWApO1xuXG4gIG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbe1xuICAgIHN0YXJ0OiBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKSxcbiAgICBlbmQ6IHN0YXRlbWVudC5nZXRFbmQoKSxcbiAgICB0ZXh0OiAnJ31dKTtcbiAgbWFpbkhtciArPSBgY29uc3QgYm9vdHN0cmFwID0gKCkgPT4gJHtib290Q2FsbEFzdCEuZ2V0VGV4dCgpfTtcXG5gO1xuICBtYWluSG1yICs9IGBpZiAobW9kdWxlWyAnaG90JyBdKSB7XG5cdCAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuXHQgIH0gZWxzZSB7XG5cdCAgICBjb25zb2xlLmVycm9yKCdITVIgaXMgbm90IGVuYWJsZWQgZm9yIHdlYnBhY2stZGV2LXNlcnZlciEnKTtcblx0ICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcblx0ICB9XFxuYC5yZXBsYWNlKC9eXFx0L2dtLCAnJyk7XG5cbiAgZnMud3JpdGVGaWxlU3luYyh3cml0ZVRvLCBtYWluSG1yKTtcbiAgbG9nLmluZm8oJ1dyaXRlICcgKyB3cml0ZVRvKTtcbiAgbG9nLmluZm8obWFpbkhtcik7XG4gIHJldHVybiB3cml0ZVRvO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5mdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKSB7XG4gIGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuICBjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG4gIHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICAvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuICAgICAgLy8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG4gICAgICAvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcbiAgICAgIC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG4gICAgICAgIHJldHVybiBjYWNoZWRUc0NvbmZpZ0ZvcihwYXRoLCByZXMsIGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNsaSB3aWxsIHJlYWQgdHNjb25maWcuanNvbiB0d2ljZSBkdWUgdG8gc29tZSBqdW5rIGNvZGUsIFxuICogbGV0J3MgbWVtb2l6ZSB0aGUgcmVzdWx0IGJ5IGZpbGUgcGF0aCBhcyBjYWNoZSBrZXkuXG4gKi9cbmNvbnN0IGNhY2hlZFRzQ29uZmlnRm9yID0gXy5tZW1vaXplKG92ZXJyaWRlVHNDb25maWcpO1xuLyoqXG4gKiBMZXQncyBvdmVycmlkZSB0c2NvbmZpZy5qc29uIGZpbGVzIGZvciBBbmd1bGFyIGF0IHJ1dGltZSA6KVxuICogLSBSZWFkIGludG8gbWVtb3J5XG4gKiAtIERvIG5vdCBvdmVycmlkZSBwcm9wZXJ0aWVzIG9mIGNvbXBpbGVyT3B0aW9ucyxhbmd1bGFyQ29tcGlsZXJPcHRpb25zIHRoYXQgZXhpc3RzIGluIGN1cnJlbnQgZmlsZVxuICogLSBcImV4dGVuZHNcIiBtdXN0IGJlIC4uLlxuICogLSBUcmF2ZXJzZSBwYWNrYWdlcyB0byBidWlsZCBwcm9wZXIgaW5jbHVkZXMgYW5kIGV4Y2x1ZGVzIGxpc3QgYW5kIC4uLlxuICogLSBGaW5kIGZpbGUgd2hlcmUgQXBwTW9kdWxlIGlzIGluLCBmaW5kIGl0cyBwYWNrYWdlLCBtb3ZlIGl0cyBkaXJlY3RvcnkgdG8gdG9wIG9mIGluY2x1ZGVzIGxpc3QsXG4gKiBcdHdoaWNoIGZpeGVzIG5nIGNsaSB3aW5kb3dzIGJ1Z1xuICovXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpOiBzdHJpbmcge1xuXG4gIGNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcbiAgY29uc3QgcmVzdWx0ID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihmaWxlLCBjb250ZW50KTtcbiAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgIGxvZy5lcnJvcihyZXN1bHQuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtmaWxlfSBjb250YWlucyBpbmNvcnJlY3QgY29uZmlndXJhdGlvbmApO1xuICB9XG4gIGNvbnN0IG9sZEpzb24gPSByZXN1bHQuY29uZmlnO1xuICBjb25zdCBwcmVzZXJ2ZVN5bWxpbmtzID0gYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcztcbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gfCB1bmRlZmluZWQgPSBwcmVzZXJ2ZVN5bWxpbmtzID8gdW5kZWZpbmVkIDoge307XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoY29uZmlnLCBudWxsLCBwYWNrYWdlVXRpbHMsIHRydWUpO1xuXG4gIHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcbiAgbGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcbiAgaWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cbiAgbmdQYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcblxuICAgIGlmICghcHJlc2VydmVTeW1saW5rcykge1xuICAgICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgcGsucmVhbFBhY2thZ2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBwYXRoTWFwcGluZyFbcGsubG9uZ05hbWVdID0gW3JlYWxEaXJdO1xuICAgICAgcGF0aE1hcHBpbmchW3BrLmxvbmdOYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gSW1wb3J0YW50ISB0byBtYWtlIEFuZ3VsYXIgJiBUeXBlc2NyaXB0IHJlc29sdmUgY29ycmVjdCByZWFsIHBhdGggb2Ygc3ltbGluayBsYXp5IHJvdXRlIG1vZHVsZVxuICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICBjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nIVsnZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmchWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgfVxuXG4gIHZhciB0c2pzb246IHtjb21waWxlck9wdGlvbnM6IGFueSwgW2tleTogc3RyaW5nXTogYW55LCBmaWxlcz86IHN0cmluZ1tdLCBpbmNsdWRlOiBzdHJpbmdbXX0gPSB7XG4gICAgLy8gZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuICAgIGluY2x1ZGU6IChjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSkgYXMgTmdBcHBCdWlsZGVyU2V0dGluZylcbiAgICAgIC50c2NvbmZpZ0luY2x1ZGVcbiAgICAgIC5tYXAocHJlc2VydmVTeW1saW5rcyA/IHAgPT4gcCA6IGdsb2JSZWFsUGF0aClcbiAgICAgIC5tYXAoXG4gICAgICAgIHBhdHRlcm4gPT4gUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIHBhdHRlcm4pLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgKSxcbiAgICBleGNsdWRlOiBbXSwgLy8gdHNFeGNsdWRlLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLi4uYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLFxuICAgICAgYmFzZVVybDogcm9vdCxcbiAgICAgIC8vIHR5cGVSb290czogW1xuICAgICAgLy8gICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgIC8vICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAvLyAgIC8vIEJlbG93IGlzIE5vZGVKUyBvbmx5LCB3aGljaCB3aWxsIGJyZWFrIEFuZ3VsYXIgSXZ5IGVuZ2luZVxuICAgICAgLy8gICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3R5cGVzJylcbiAgICAgIC8vIF0sXG4gICAgICAvLyBtb2R1bGU6ICdlc25leHQnLFxuICAgICAgcHJlc2VydmVTeW1saW5rcyxcbiAgICAgIC4uLm9sZEpzb24uY29tcGlsZXJPcHRpb25zLFxuICAgICAgcGF0aHM6IHsuLi5hcHBUc2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMsIC4uLnBhdGhNYXBwaW5nfVxuICAgIH0sXG4gICAgYW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLy8gdHJhY2U6IHRydWVcbiAgICAgIC4uLm9sZEpzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9uc1xuICAgIH1cbiAgfTtcbiAgaWYgKG9sZEpzb24uZXh0ZW5kcykge1xuICAgIHRzanNvbi5leHRlbmRzID0gb2xkSnNvbi5leHRlbmRzO1xuICB9XG5cbiAgaWYgKG9sZEpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvbGRKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gIH1cbiAgaWYgKG9sZEpzb24uaW5jbHVkZSkge1xuICAgIHRzanNvbi5pbmNsdWRlID0gXy51bmlvbigodHNqc29uLmluY2x1ZGUgYXMgc3RyaW5nW10pLmNvbmNhdChvbGRKc29uLmluY2x1ZGUpKTtcbiAgfVxuICBpZiAob2xkSnNvbi5leGNsdWRlKSB7XG4gICAgdHNqc29uLmV4Y2x1ZGUgPSBfLnVuaW9uKCh0c2pzb24uZXhjbHVkZSBhcyBzdHJpbmdbXSkuY29uY2F0KG9sZEpzb24uZXhjbHVkZSkpO1xuICB9XG4gIGlmIChvbGRKc29uLmZpbGVzKVxuICAgIHRzanNvbi5maWxlcyA9IG9sZEpzb24uZmlsZXM7XG5cbiAgY29uc3Qgc291cmNlRmlsZXM6IHR5cGVvZiBhZGRTb3VyY2VGaWxlcyA9IHJlcXVpcmUoJy4vYWRkLXRzY29uZmlnLWZpbGUnKS5hZGRTb3VyY2VGaWxlcztcblxuICBpZiAoIXRzanNvbi5maWxlcylcbiAgICB0c2pzb24uZmlsZXMgPSBbXTtcbiAgdHNqc29uLmZpbGVzLnB1c2goLi4uc291cmNlRmlsZXModHNqc29uLmNvbXBpbGVyT3B0aW9ucywgdHNqc29uLmZpbGVzLCBmaWxlLFxuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpKTtcbiAgLy8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gIGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGdsb2JSZWFsUGF0aChnbG9iOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gL14oW14qXSspXFwvW14vKl0qXFwqLy5leGVjKGdsb2IpO1xuICBpZiAocmVzKSB7XG4gICAgcmV0dXJuIGZzLnJlYWxwYXRoU3luYyhyZXNbMV0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlcy5pbnB1dC5zbGljZShyZXNbMV0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZ2xvYjtcbn1cblxuLy8gZnVuY3Rpb24gaGFzSXNvbW9ycGhpY0Rpcihwa0pzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuLy8gICBjb25zdCBmdWxsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZ2V0VHNEaXJzT2ZQYWNrYWdlKHBrSnNvbikuaXNvbURpcik7XG4vLyAgIHRyeSB7XG4vLyAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZ1bGxQYXRoKS5pc0RpcmVjdG9yeSgpO1xuLy8gICB9IGNhdGNoIChlKSB7XG4vLyAgICAgcmV0dXJuIGZhbHNlO1xuLy8gICB9XG4vLyB9XG4iXX0=
