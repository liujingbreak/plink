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
    const reportFile = config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json');
    fs.writeFile(reportFile, JSON.stringify(tsjson, null, '  '), () => {
        log.info(`Compilation tsconfig.json file:\n  ${chalk_1.default.blueBright(reportFile)}`);
    });
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRix1RUFBdUU7QUFDdkUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQXNCO0FBQ3RCLDJDQUFpQztBQUVqQyxnRUFBc0U7QUFDdEUsNkVBQThDO0FBQzlDLGlGQUFrRDtBQUVsRCw4RUFBd0M7QUFDeEMsb0VBQTRCO0FBRTVCLDZGQUF1RDtBQUV2RCw4RUFBdUU7QUFDdkUsMERBQTBCO0FBRTFCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLGVBQUssQ0FBQztBQUNqQyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQVl0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDNUUsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQsT0FBTyxDQUFDLGdCQUFnQixHQUFHLFVBQWUsTUFBYzs7WUFDdEQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtnQkFDaEMsdURBQXVEO2dCQUN2RCxPQUFPLFlBQVksQ0FBQzthQUNyQjtZQUNELE1BQU0sVUFBVSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxT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QyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDckY7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxnRUFBZ0U7QUFDaEUsb0ZBQW9GO0FBQ3BGLFVBQVU7QUFDVixrREFBa0Q7QUFDbEQsa0JBQWtCO0FBQ2xCLG9CQUFvQjtBQUNwQixNQUFNO0FBQ04sSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0LCB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBQYWNrYWdlSW5mbyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJztcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXIsIERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuLy8gaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERyY3BTZXR0aW5nIGFzIE5nQXBwQnVpbGRlclNldHRpbmcgfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHsgZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbiB9IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCBhcGlTZXR1cCBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cGFja2FnZUFzc2V0c0ZvbGRlcnN9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcbmltcG9ydCBhcHBUc2NvbmZpZyBmcm9tICcuLi8uLi9taXNjL3RzY29uZmlnLmFwcC5qc29uJztcbmltcG9ydCB7YWRkU291cmNlRmlsZXN9IGZyb20gJy4vYWRkLXRzY29uZmlnLWZpbGUnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMvbmV0d29yay11dGlsJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmNvbnN0IHtjeWFuLCBncmVlbiwgcmVkfSA9IGNoYWxrO1xuY29uc3Qge3dhbGtQYWNrYWdlc30gPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cycpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyLmNoYW5nZS1jbGktb3B0aW9ucycpO1xuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ29uZmlnSGFuZGxlciBleHRlbmRzIENvbmZpZ0hhbmRsZXIge1xuICAvKipcblx0ICogWW91IG1heSBvdmVycmlkZSBhbmd1bGFyLmpzb24gaW4gdGhpcyBmdW5jdGlvblxuXHQgKiBAcGFyYW0gb3B0aW9ucyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+LmFyY2hpdGVjdC48Y29tbWFuZD4ub3B0aW9uc1xuXHQgKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+XG5cdCAqL1xuICBhbmd1bGFySnNvbihvcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gICAgYnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKVxuICA6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5mdW5jdGlvbiBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCB0YXJnZXROYW1lOiBzdHJpbmcsXG4gIHJlcGxhY2VkT3B0czogYW55KSB7XG4gIGNvbnN0IGdldFRhcmdldE9wdGlvbnMgPSBjb250ZXh0LmdldFRhcmdldE9wdGlvbnM7XG5cbiAgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zID0gYXN5bmMgZnVuY3Rpb24odGFyZ2V0OiBUYXJnZXQpIHtcbiAgICBpZiAodGFyZ2V0LnRhcmdldCA9PT0gdGFyZ2V0TmFtZSkge1xuICAgICAgLy8gbG9nLmluZm8oJ0FuZ3VsYXIgY2xpIGJ1aWxkIG9wdGlvbnMnLCByZXBsYWNlZE9wdHMpO1xuICAgICAgcmV0dXJuIHJlcGxhY2VkT3B0cztcbiAgICB9XG4gICAgY29uc3Qgb3JpZ09wdGlvbiA9IGF3YWl0IGdldFRhcmdldE9wdGlvbnMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gb3JpZ09wdGlvbjtcbiAgfTtcbn1cbi8qKlxuICogRm9yIGJ1aWxkIChuZyBidWlsZClcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc0ZvckJ1aWxkKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hLCBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCk6IFByb21pc2U8QW5ndWxhckJ1aWxkZXJPcHRpb25zPiB7XG4gIHJldHVybiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zLCBjb250ZXh0KTtcbn1cblxuLyoqXG4gKiBGb3IgZGV2IHNlcnZlciAobmcgc2VydmUpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGNvbnRleHQgXG4gKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGJ1aWxkZXJDb25maWc6IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG5cbiAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcoYnVpbGRlckNvbmZpZyEuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IHJhd0Jyb3dzZXJPcHRpb25zID0gYXdhaXQgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zKGJyb3dzZXJUYXJnZXQpIGFzIGFueSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYTtcbiAgaWYgKCFyYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuXG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gYXdhaXQgcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gICAgY29uZmlnLCByYXdCcm93c2VyT3B0aW9ucywgY29udGV4dCwgYnVpbGRlckNvbmZpZywgdHJ1ZSk7XG4gIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dCwgJ2J1aWxkJywgYnJvd3Nlck9wdGlvbnMpO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHJhd0Jyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGRldlNlcnZlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBobXIgPSBmYWxzZSkge1xuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdDaGFuZ2UgYnVpbGRlciBvcHRpb25zJyk7XG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gcmF3QnJvd3Nlck9wdGlvbnMgYXMgQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgWydkZXBsb3lVcmwnLCAnb3V0cHV0UGF0aCcsICdzdHlsZXMnXSkge1xuICAgIGNvbnN0IHZhbHVlID0gY29uZmlnLmdldChbY3VyclBhY2thZ2VOYW1lLCBwcm9wXSk7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIChyYXdCcm93c2VyT3B0aW9ucyBhcyBhbnkpW3Byb3BdID0gdmFsdWU7XG4gICAgICBjb25zb2xlLmxvZyhjdXJyUGFja2FnZU5hbWUgKyAnIC0gb3ZlcnJpZGUgJXM6ICVzJywgcHJvcCwgdmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxBbmd1bGFyQ29uZmlnSGFuZGxlcj4oKGZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgaWYgKGhhbmRsZXIuYW5ndWxhckpzb24pXG4gICAgICByZXR1cm4gaGFuZGxlci5hbmd1bGFySnNvbihicm93c2VyT3B0aW9ucywgZGV2U2VydmVyQ29uZmlnKTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gb2JqO1xuICB9KTtcblxuICBpZiAoIWJyb3dzZXJPcHRpb25zLmRlcGxveVVybClcbiAgICBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSAnLyc7XG4gIC8vIGlmIHN0YXRpYyBhc3NldHMncyBVUkwgaXMgbm90IGxlZCBieSAnLycsIGl0IHdpbGwgYmUgY29uc2lkZXJlZCBhcyByZWxhdGl2ZSBwYXRoIGluIG5nLWh0bWwtbG9hZGVyXG5cbiAgaWYgKGRldlNlcnZlckNvbmZpZykge1xuICAgIGNvbnN0IHBhcnNlZFVybCA9IFVybC5wYXJzZShicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwsIHRydWUsIHRydWUpO1xuICAgIGlmIChwYXJzZWRVcmwuaG9zdCA9PSBudWxsKSB7XG4gICAgICBwYXJzZWRVcmwuaG9zdG5hbWUgPSBnZXRMYW5JUHY0KCk7XG4gICAgICBwYXJzZWRVcmwucG9ydCA9IGRldlNlcnZlckNvbmZpZy5wb3J0ICsgJyc7XG4gICAgICBwYXJzZWRVcmwucHJvdG9jb2wgPSAnaHR0cCc7XG4gICAgICByYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSBVcmwuZm9ybWF0KHBhcnNlZFVybCk7XG4gICAgICAvLyBUT0RPOiBwcmludCByaWdodCBhZnRlciBzZXJ2ZXIgaXMgc3VjY2Vzc2Z1bGx5IHN0YXJ0ZWRcbiAgICAgIHNldFRpbWVvdXQoKCkgPT5cbiAgICAgICAgY29uc29sZS5sb2coY2hhbGsucmVkKGBDdXJyZW50IGRldiBzZXJ2ZXIgcmVzb3VyY2UgaXMgaG9zdGVkIG9uICR7cGFyc2VkVXJsLmhvc3RuYW1lfSxcXG5pZiB5b3VyIG5ldHdvcmsgaXMgcmVjb25uZWN0ZWQgb3IgbG9jYWwgSVAgYWRkcmVzcyBpcyBgICtcbiAgICAgICAgJyBjaGFuZ2VkLCB5b3Ugd2lsbCBuZWVkIHRvIHJlc3RhcnQgdGhpcyBkZXYgc2VydmVyIScpKSwgNTAwMCk7XG4gICAgfVxuICAgIGRldlNlcnZlckNvbmZpZy5zZXJ2ZVBhdGggPSBwYXJzZWRVcmwucGF0aG5hbWU7IC8vIEluIGNhc2UgZGVwbG95VXJsIGhhcyBob3N0LCBuZyBjbGkgd2lsbCByZXBvcnQgZXJyb3IgZm9yIG51bGwgc2VydmVQYXRoXG4gIH1cblxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykge1xuICAgIGNvbnNvbGUubG9nKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpO1xuICAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50c1xuICAgIC5mb3JFYWNoKGZyID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGZyKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWU6IHN0cmluZyA9IGZyW2ZpZWxkXTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICBmcltmaWVsZF0gPSBQYXRoLnJlbGF0aXZlKGN3ZCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBpZiAocGtKc29uKSB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuICAgIGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpOyAvLyBzdGF0aWMgYXNzZXRzIGluIGVudHJ5IHBhY2thZ2Ugc2hvdWxkIGFsd2F5cyBiZSBvdXRwdXQgdG8gcm9vdCBwYXRoXG4gIH1cbiAgLy8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuICBjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuICAgIGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcbiAgICBjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblxuICBjb25zdCBtYWluSG1yID0gY3JlYXRlTWFpbkZpbGVGb3JIbXIoYnJvd3Nlck9wdGlvbnMubWFpbik7XG4gIGlmIChobXIgJiYgZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgZGV2U2VydmVyQ29uZmlnLmhtciA9IHRydWU7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKVxuICAgICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyA9IFtdO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICByZXBsYWNlOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgd2l0aDogUGF0aC5yZWxhdGl2ZSgnLicsIG1haW5IbXIpXG4gICAgfSk7XG4gIH1cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID09IG51bGwpIHtcbiAgICBicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9IHt9O1xuICB9XG5cbiAgYnJvd3Nlck9wdGlvbnMuY29tbW9uQ2h1bmsgPSBmYWxzZTtcblxuICBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG4gIGF3YWl0IGFwaVNldHVwKGJyb3dzZXJPcHRpb25zKTtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnc2V0dGluZyB1cCBhc3NldHMgb3B0aW9ucycpO1xuICAvLyBCZWNhdXNlIGRldi1zZXJ2ZS1hc3NldHMgZGVwZW5kcyBvbiBEUkNQIGFwaSwgSSBoYXZlIHRvIGxhenkgbG9hZCBpdC5cbiAgY29uc3QgZm9yRWFjaEFzc2V0c0RpcjogdHlwZW9mIHBhY2thZ2VBc3NldHNGb2xkZXJzID1cbiAgcmVxdWlyZSgnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnKS5wYWNrYWdlQXNzZXRzRm9sZGVycztcbiAgZm9yRWFjaEFzc2V0c0RpcignLycsIChpbnB1dERpciwgb3V0cHV0RGlyKSA9PiB7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5hc3NldHMpIHtcbiAgICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyA9IFtdO1xuICAgIH1cbiAgICBsZXQgaW5wdXQgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGlucHV0RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCFpbnB1dC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGlucHV0ID0gJy4vJyArIGlucHV0O1xuICAgIH1cbiAgICBicm93c2VyT3B0aW9ucy5hc3NldHMhLnB1c2goe1xuICAgICAgaW5wdXQsXG4gICAgICBnbG9iOiAnKiovKicsXG4gICAgICBvdXRwdXQ6IG91dHB1dERpci5lbmRzV2l0aCgnLycpID8gb3V0cHV0RGlyIDogb3V0cHV0RGlyICsgJy8nXG4gICAgfSk7XG4gIH0pO1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdicm93c2VyIGJ1aWxkZXIgb3B0aW9uczonICsgSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMsIHVuZGVmaW5lZCwgJyAgJykpO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1haW5GaWxlRm9ySG1yKG1haW5GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUobWFpbkZpbGUpO1xuICBjb25zdCB3cml0ZVRvID0gUGF0aC5yZXNvbHZlKGRpciwgJ21haW4taG1yLnRzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHdyaXRlVG8pKSB7XG4gICAgcmV0dXJuIHdyaXRlVG87XG4gIH1cbiAgY29uc3QgbWFpbiA9IGZzLnJlYWRGaWxlU3luYyhtYWluRmlsZSwgJ3V0ZjgnKTtcbiAgbGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcbiAgYGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWlufWA7XG4gIGNvbnN0IHF1ZXJ5ID0gbmV3IFRzQXN0U2VsZWN0b3IobWFpbkhtciwgJ21haW4taG1yLnRzJyk7XG4gIC8vIHF1ZXJ5LnByaW50QWxsKCk7XG5cbiAgbGV0IGJvb3RDYWxsQXN0OiB0cy5Ob2RlO1xuICBjb25zdCBzdGF0ZW1lbnQgPSBxdWVyeS5zcmMuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lLWxlbmd0aFxuICAgIGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZFdpdGgoc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAgIGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG4gICAgICAgIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuICAgICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGlmIChib290Q2FsbCkge1xuICAgICAgYm9vdENhbGxBc3QgPSBib290Q2FsbDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGlmIChzdGF0ZW1lbnQgPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bWFpbkZpbGV9LGAgK1xuICAgIGBjYW4gbm90IGZpbmQgc3RhdGVtZW50IGxpa2U6IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKVxcbiR7bWFpbkhtcn1gKTtcblxuICBtYWluSG1yID0gcmVwbGFjZUNvZGUobWFpbkhtciwgW3tcbiAgICBzdGFydDogc3RhdGVtZW50LmdldFN0YXJ0KHF1ZXJ5LnNyYywgdHJ1ZSksXG4gICAgZW5kOiBzdGF0ZW1lbnQuZ2V0RW5kKCksXG4gICAgdGV4dDogJyd9XSk7XG4gIG1haW5IbXIgKz0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QhLmdldFRleHQoKX07XFxuYDtcbiAgbWFpbkhtciArPSBgaWYgKG1vZHVsZVsgJ2hvdCcgXSkge1xuXHQgICAgaG1yQm9vdHN0cmFwKG1vZHVsZSwgYm9vdHN0cmFwKTtcblx0ICB9IGVsc2Uge1xuXHQgICAgY29uc29sZS5lcnJvcignSE1SIGlzIG5vdCBlbmFibGVkIGZvciB3ZWJwYWNrLWRldi1zZXJ2ZXIhJyk7XG5cdCAgICBjb25zb2xlLmxvZygnQXJlIHlvdSB1c2luZyB0aGUgLS1obXIgZmxhZyBmb3Igbmcgc2VydmU/Jyk7XG5cdCAgfVxcbmAucmVwbGFjZSgvXlxcdC9nbSwgJycpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMod3JpdGVUbywgbWFpbkhtcik7XG4gIGxvZy5pbmZvKCdXcml0ZSAnICsgd3JpdGVUbyk7XG4gIGxvZy5pbmZvKG1haW5IbXIpO1xuICByZXR1cm4gd3JpdGVUbztcbn1cblxuLy8gSGFjayB0cy5zeXMsIHNvIGZhciBpdCBpcyB1c2VkIHRvIHJlYWQgdHNjb25maWcuanNvblxuZnVuY3Rpb24gaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZykge1xuICBjb25zdCBvbGRSZWFkRmlsZSA9IHN5cy5yZWFkRmlsZTtcbiAgY29uc3QgdHNDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLnRzQ29uZmlnKTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuICAgICAgICByZXR1cm4gY2FjaGVkVHNDb25maWdGb3IocGF0aCwgcmVzLCBicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IocmVkKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBSZWFkICR7cGF0aH1gLCBlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZShwayk7XG4gICAgfSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQW5ndWxhciBjbGkgd2lsbCByZWFkIHRzY29uZmlnLmpzb24gdHdpY2UgZHVlIHRvIHNvbWUganVuayBjb2RlLCBcbiAqIGxldCdzIG1lbW9pemUgdGhlIHJlc3VsdCBieSBmaWxlIHBhdGggYXMgY2FjaGUga2V5LlxuICovXG5jb25zdCBjYWNoZWRUc0NvbmZpZ0ZvciA9IF8ubWVtb2l6ZShvdmVycmlkZVRzQ29uZmlnKTtcbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKTogc3RyaW5nIHtcblxuICBjb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG4gIGNvbnN0IHJlc3VsdCA9IHRzLnBhcnNlQ29uZmlnRmlsZVRleHRUb0pzb24oZmlsZSwgY29udGVudCk7XG4gIGlmIChyZXN1bHQuZXJyb3IpIHtcbiAgICBsb2cuZXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7ZmlsZX0gY29udGFpbnMgaW5jb3JyZWN0IGNvbmZpZ3VyYXRpb25gKTtcbiAgfVxuICBjb25zdCBvbGRKc29uID0gcmVzdWx0LmNvbmZpZztcbiAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119IHwgdW5kZWZpbmVkID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgbnVsbCwgcGFja2FnZVV0aWxzLCB0cnVlKTtcblxuICB0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG4gIGxldCBuZ1BhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VzID0gcGtJbmZvLmFsbE1vZHVsZXM7XG5cbiAgY29uc3QgYXBwTW9kdWxlRmlsZSA9IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4oUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgY29uc3QgYXBwUGFja2FnZUpzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoYXBwTW9kdWxlRmlsZSk7XG4gIGlmIChhcHBQYWNrYWdlSnNvbiA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3IsIGNhbiBub3QgZmluZCBwYWNrYWdlLmpzb24gb2YgJyArIGFwcE1vZHVsZUZpbGUpO1xuXG4gIG5nUGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG5cbiAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIHBrLnJlYWxQYWNrYWdlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcGF0aE1hcHBpbmchW3BrLmxvbmdOYW1lXSA9IFtyZWFsRGlyXTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5sb25nTmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIEltcG9ydGFudCEgdG8gbWFrZSBBbmd1bGFyICYgVHlwZXNjcmlwdCByZXNvbHZlIGNvcnJlY3QgcmVhbCBwYXRoIG9mIHN5bWxpbmsgbGF6eSByb3V0ZSBtb2R1bGVcbiAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgY29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZyFbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuICAgIHBhdGhNYXBwaW5nIVsnZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIH1cblxuICB2YXIgdHNqc29uOiB7Y29tcGlsZXJPcHRpb25zOiBhbnksIFtrZXk6IHN0cmluZ106IGFueSwgZmlsZXM/OiBzdHJpbmdbXSwgaW5jbHVkZTogc3RyaW5nW119ID0ge1xuICAgIC8vIGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL3RzY29uZmlnLmpzb24nKSxcbiAgICBpbmNsdWRlOiAoY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUpIGFzIE5nQXBwQnVpbGRlclNldHRpbmcpXG4gICAgICAudHNjb25maWdJbmNsdWRlXG4gICAgICAubWFwKHByZXNlcnZlU3ltbGlua3MgPyBwID0+IHAgOiBnbG9iUmVhbFBhdGgpXG4gICAgICAubWFwKFxuICAgICAgICBwYXR0ZXJuID0+IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgICksXG4gICAgZXhjbHVkZTogW10sIC8vIHRzRXhjbHVkZSxcbiAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC4uLmFwcFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGJhc2VVcmw6IHJvb3QsXG4gICAgICAvLyB0eXBlUm9vdHM6IFtcbiAgICAgIC8vICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG4gICAgICAvLyAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpLFxuICAgICAgLy8gICAvLyBCZWxvdyBpcyBOb2RlSlMgb25seSwgd2hpY2ggd2lsbCBicmVhayBBbmd1bGFyIEl2eSBlbmdpbmVcbiAgICAgIC8vICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC90eXBlcycpXG4gICAgICAvLyBdLFxuICAgICAgLy8gbW9kdWxlOiAnZXNuZXh0JyxcbiAgICAgIHByZXNlcnZlU3ltbGlua3MsXG4gICAgICAuLi5vbGRKc29uLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHBhdGhzOiB7Li4uYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzLCAuLi5wYXRoTWFwcGluZ31cbiAgICB9LFxuICAgIGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC8vIHRyYWNlOiB0cnVlXG4gICAgICAuLi5vbGRKc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnNcbiAgICB9XG4gIH07XG4gIGlmIChvbGRKc29uLmV4dGVuZHMpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IG9sZEpzb24uZXh0ZW5kcztcbiAgfVxuXG4gIGlmIChvbGRKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocykge1xuICAgIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgb2xkSnNvbi5jb21waWxlck9wdGlvbnMucGF0aHMpO1xuICB9XG4gIGlmIChvbGRKc29uLmluY2x1ZGUpIHtcbiAgICB0c2pzb24uaW5jbHVkZSA9IF8udW5pb24oKHRzanNvbi5pbmNsdWRlIGFzIHN0cmluZ1tdKS5jb25jYXQob2xkSnNvbi5pbmNsdWRlKSk7XG4gIH1cbiAgaWYgKG9sZEpzb24uZXhjbHVkZSkge1xuICAgIHRzanNvbi5leGNsdWRlID0gXy51bmlvbigodHNqc29uLmV4Y2x1ZGUgYXMgc3RyaW5nW10pLmNvbmNhdChvbGRKc29uLmV4Y2x1ZGUpKTtcbiAgfVxuICBpZiAob2xkSnNvbi5maWxlcylcbiAgICB0c2pzb24uZmlsZXMgPSBvbGRKc29uLmZpbGVzO1xuXG4gIGNvbnN0IHNvdXJjZUZpbGVzOiB0eXBlb2YgYWRkU291cmNlRmlsZXMgPSByZXF1aXJlKCcuL2FkZC10c2NvbmZpZy1maWxlJykuYWRkU291cmNlRmlsZXM7XG5cbiAgaWYgKCF0c2pzb24uZmlsZXMpXG4gICAgdHNqc29uLmZpbGVzID0gW107XG4gIHRzanNvbi5maWxlcy5wdXNoKC4uLnNvdXJjZUZpbGVzKHRzanNvbi5jb21waWxlck9wdGlvbnMsIHRzanNvbi5maWxlcywgZmlsZSxcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSk7XG5cbiAgY29uc3QgcmVwb3J0RmlsZSA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd0c2NvbmZpZy5qc29uJyk7XG4gIGZzLndyaXRlRmlsZShyZXBvcnRGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpLCAoKSA9PiB7XG4gICAgbG9nLmluZm8oYENvbXBpbGF0aW9uIHRzY29uZmlnLmpzb24gZmlsZTpcXG4gICR7Y2hhbGsuYmx1ZUJyaWdodChyZXBvcnRGaWxlKX1gKTtcbiAgfSk7XG5cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGdsb2JSZWFsUGF0aChnbG9iOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gL14oW14qXSspXFwvW14vKl0qXFwqLy5leGVjKGdsb2IpO1xuICBpZiAocmVzKSB7XG4gICAgcmV0dXJuIGZzLnJlYWxwYXRoU3luYyhyZXNbMV0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlcy5pbnB1dC5zbGljZShyZXNbMV0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZ2xvYjtcbn1cblxuLy8gZnVuY3Rpb24gaGFzSXNvbW9ycGhpY0Rpcihwa0pzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuLy8gICBjb25zdCBmdWxsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZ2V0VHNEaXJzT2ZQYWNrYWdlKHBrSnNvbikuaXNvbURpcik7XG4vLyAgIHRyeSB7XG4vLyAgICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZ1bGxQYXRoKS5pc0RpcmVjdG9yeSgpO1xuLy8gICB9IGNhdGNoIChlKSB7XG4vLyAgICAgcmV0dXJuIGZhbHNlO1xuLy8gICB9XG4vLyB9XG4iXX0=
