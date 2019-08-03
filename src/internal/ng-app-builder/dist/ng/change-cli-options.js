"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const architect_1 = require("@angular-devkit/architect");
const utils_1 = require("dr-comp-package/wfh/dist/utils");
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
const { cyan, green, red } = require('chalk');
const { walkPackages } = require('dr-comp-package/wfh/dist/build-util/ts');
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
const currPackageName = require('../../package.json').name;
const cjson = require('comment-json');
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
            const parsedUrl = url_1.default.parse(browserOptions.deployUrl);
            if (parsedUrl.host == null) {
                parsedUrl.hostname = 'localhost';
                parsedUrl.port = devServerConfig.port + '';
                parsedUrl.protocol = 'http';
                rawBrowserOptions.deployUrl = url_1.default.format(parsedUrl);
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
    const oldJson = cjson.parse(content);
    const preserveSymlinks = browserOptions.preserveSymlinks;
    const pathMapping = preserveSymlinks ? undefined : {};
    const pkInfo = walkPackages(config, null, packageUtils, true);
    let ngPackages = pkInfo.allModules;
    // const excludePkSet = new Set<string>();
    const excludePackage = config.get(currPackageName + '.excludePackage') || [];
    let excludePath = config.get(currPackageName + '.excludePath') || [];
    ngPackages = ngPackages.filter(comp => !excludePackage.some(reg => _.isString(reg) ? comp.longName.includes(reg) : reg.test(comp.longName)) &&
        (comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk' ||
            hasIsomorphicDir(comp.json, comp.packagePath)));
    const tsInclude = oldJson.include || [];
    const tsExclude = oldJson.exclude || [];
    const appModuleFile = parse_app_module_1.findAppModuleFileFromMain(Path.resolve(browserOptions.main));
    const appPackageJson = lookupEntryPackage(appModuleFile);
    if (appPackageJson == null)
        throw new Error('Error, can not find package.json of ' + appModuleFile);
    // let hasAppPackage = false;
    ngPackages.forEach(pk => {
        // TODO: doc for dr.ngAppModule
        const isNgAppModule = pk.longName === appPackageJson.name;
        const dir = Path.relative(Path.dirname(file), isNgAppModule ? pk.realPackagePath : (preserveSymlinks ? pk.packagePath : pk.realPackagePath))
            .replace(/\\/g, '/');
        if (isNgAppModule) {
            // hasAppPackage = true;
            tsInclude.unshift(dir + '/**/*.ts');
            // entry package must be at first of TS include list, otherwise will encounter:
            // "Error: No NgModule metadata found for 'AppModule'
        }
        else {
            tsInclude.push(dir + '/**/*.ts');
        }
        tsExclude.push(dir + '/ts', dir + '/spec', dir + '/dist', dir + '/**/*.spec.ts');
        if (!preserveSymlinks) {
            const realDir = Path.relative(root, pk.realPackagePath).replace(/\\/g, '/');
            pathMapping[pk.longName] = [realDir];
            pathMapping[pk.longName + '/*'] = [realDir + '/*'];
        }
    });
    // if (!hasAppPackage) {
    // 	tsInclude.unshift(Path.dirname(browserOptions.main).replace(/\\/g, '/') + '/**/*.ts');
    // }
    tsInclude.push(Path.relative(Path.dirname(file), preserveSymlinks ?
        'node_modules/dr-comp-package/wfh/share' :
        fs.realpathSync('node_modules/dr-comp-package/wfh/share'))
        .replace(/\\/g, '/'));
    tsExclude.push('**/test.ts');
    excludePath = excludePath.map(expath => Path.relative(Path.dirname(file), expath).replace(/\\/g, '/'));
    console.log(excludePath);
    tsExclude.push(...excludePath);
    // Important! to make Angular & Typescript resolve correct real path of symlink lazy route module
    if (!preserveSymlinks) {
        const drcpDir = Path.relative(root, fs.realpathSync('node_modules/dr-comp-package')).replace(/\\/g, '/');
        pathMapping['dr-comp-package'] = [drcpDir];
        pathMapping['dr-comp-package/*'] = [drcpDir + '/*'];
        pathMapping['*'] = ['node_modules/*',
            'node_modules/@types/*'
        ];
    }
    var tsjson = {
        // extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
        include: tsInclude,
        exclude: tsExclude,
        compilerOptions: Object.assign({}, require('../../misc/tsconfig.app.json').compilerOptions, { baseUrl: root, strictNullChecks: false, typeRoots: [
                Path.resolve(root, 'node_modules/@types'),
                Path.resolve(root, 'node_modules/@dr-types'),
                Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
            ], 
            // module: 'esnext',
            preserveSymlinks, paths: pathMapping }),
        angularCompilerOptions: {
        // trace: true
        }
    };
    if (oldJson.extends) {
        tsjson.extends = oldJson.extends;
    }
    Object.assign(tsjson.compilerOptions, oldJson.compilerOptions);
    Object.assign(tsjson.angularCompilerOptions, oldJson.angularCompilerOptions);
    // console.log(green('change-cli-options - ') + `${file}:\n`, JSON.stringify(tsjson, null, '  '));
    log.info(`${file}:\n${JSON.stringify(tsjson, null, '  ')}`);
    return JSON.stringify(tsjson, null, '  ');
}
function hasIsomorphicDir(pkJson, packagePath) {
    const fullPath = Path.resolve(packagePath, utils_1.getTsDirsOfPackage(pkJson).isomDir);
    try {
        return fs.statSync(fullPath).isDirectory();
    }
    catch (e) {
        return false;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQXNCO0FBQ3RCLDJDQUFpQztBQUVqQyxnRUFBc0U7QUFDdEUsNkVBQThDO0FBQzlDLGlGQUFrRDtBQUVsRCw4RUFBd0M7QUFDeEMsb0VBQTRCO0FBSTVCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFZdEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQW9DLEVBQUUsT0FBdUI7O1FBQzdELE9BQU8sNkJBQTZCLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4RSxDQUFDO0NBQUE7QUFIRCwwRUFHQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBc0IsdUJBQXVCLENBQUMsTUFBa0IsRUFDOUQsT0FBdUIsRUFDdkIsYUFBc0M7O1FBRXRDLE1BQU0sYUFBYSxHQUFHLGtDQUFzQixDQUFDLGFBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBZ0MsQ0FBQztRQUN2RyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUM5QixpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBRXBDLE1BQU0sY0FBYyxHQUFHLE1BQU0sNkJBQTZCLENBQ3hELE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNELHlCQUF5QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDNUQsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBYkQsMERBYUM7QUFFRCxTQUFlLDZCQUE2QixDQUMxQyxNQUFrQixFQUNsQixpQkFBdUMsRUFDdkMsT0FBdUIsRUFDdkIsZUFBeUMsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFFdEQsT0FBTyxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sY0FBYyxHQUFHLGlCQUEwQyxDQUFDO1FBQ2xFLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ3hELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLGlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2xFO1NBQ0Y7UUFFRCxNQUFNLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBdUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25GLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksT0FBTyxDQUFDLFdBQVc7Z0JBQ3JCLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7O2dCQUU1RCxPQUFPLEdBQUcsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTO1lBQzNCLGNBQWMsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBQ2pDLHFHQUFxRztRQUVyRyxJQUFJLGVBQWUsRUFBRTtZQUNuQixNQUFNLFNBQVMsR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0RCxJQUFJLFNBQVMsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUMxQixTQUFTLENBQUMsUUFBUSxHQUFHLFdBQVcsQ0FBQztnQkFDakMsU0FBUyxDQUFDLElBQUksR0FBRyxlQUFlLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDM0MsU0FBUyxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUM7Z0JBQzVCLGlCQUFpQixDQUFDLFNBQVMsR0FBRyxhQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ3JEO1lBQ0QsZUFBZSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsMEVBQTBFO1NBQzNIO1FBRUQsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLEVBQUU7WUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztZQUM3QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDMUIsY0FBYyxDQUFDLGdCQUFnQjtpQkFDOUIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNaLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUM5QixNQUFNLEtBQUssR0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ2hDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTt3QkFDMUIsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO3FCQUN2QztnQkFDSCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLElBQUksTUFBTSxFQUFFO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxxQkFBcUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUMxRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNqRDtRQUNELHdDQUF3QztRQUN4QyxNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFDM0IsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdEMsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFELElBQUksR0FBRyxJQUFJLGVBQWUsRUFBRTtZQUMxQixlQUFlLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztZQUMzQixJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQjtnQkFDbEMsY0FBYyxDQUFDLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztZQUN2QyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO2dCQUNuQyxPQUFPLEVBQUUsY0FBYyxDQUFDLElBQUk7Z0JBQzVCLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUM7YUFDbEMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxJQUFJLGNBQWMsQ0FBQyxRQUFRLElBQUksSUFBSSxFQUFFO1lBQ25DLGNBQWMsQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO1NBQzlCO1FBRUQsY0FBYyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFFbkMsWUFBWSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNyQyxNQUFNLHdCQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFL0IsT0FBTyxDQUFDLFlBQVksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ2xELHdFQUF3RTtRQUN4RSxNQUFNLGdCQUFnQixHQUN0QixPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQyxvQkFBb0IsQ0FBQztRQUNoRixnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDNUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFCLGNBQWMsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO2FBQzVCO1lBQ0QsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN2RSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDMUIsS0FBSyxHQUFHLElBQUksR0FBRyxLQUFLLENBQUM7YUFDdEI7WUFDRCxjQUFjLENBQUMsTUFBTyxDQUFDLElBQUksQ0FBQztnQkFDMUIsS0FBSztnQkFDTCxJQUFJLEVBQUUsTUFBTTtnQkFDWixNQUFNLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLEdBQUcsR0FBRzthQUM5RCxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2xHLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUM7Q0FBQTtBQUVELFNBQVMsb0JBQW9CLENBQUMsUUFBZ0I7SUFDNUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNuQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUNqRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDMUIsT0FBTyxPQUFPLENBQUM7S0FDaEI7SUFDRCxNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvQyxJQUFJLE9BQU8sR0FBRyxxQkFBcUI7UUFDbkMsZ0VBQWdFLElBQUksRUFBRSxDQUFDO0lBQ3ZFLE1BQU0sS0FBSyxHQUFHLElBQUksc0JBQWEsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDeEQsb0JBQW9CO0lBRXBCLElBQUksV0FBb0IsQ0FBQztJQUN6QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUU7UUFDdEQsMkNBQTJDO1FBQzNDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLGlGQUFpRixFQUMxSCxDQUFDLEdBQWtCLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3BDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyx3QkFBd0I7Z0JBQ3hDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBc0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxpQkFBaUI7Z0JBQ2hHLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssb0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBYyxFQUFFO2dCQUM5RCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQzthQUNqQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsSUFBSSxRQUFRLEVBQUU7WUFDWixXQUFXLEdBQUcsUUFBUSxDQUFDO1lBQ3ZCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxTQUFTLElBQUksSUFBSTtRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsUUFBUSxHQUFHO1lBQzlCLHFGQUFxRixPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBRWxHLE9BQU8sR0FBRyxvQkFBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzlCLEtBQUssRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDO1lBQzFDLEdBQUcsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFO1lBQ3ZCLElBQUksRUFBRSxFQUFFO1NBQUMsQ0FBQyxDQUFDLENBQUM7SUFDZCxPQUFPLElBQUksMkJBQTJCLFdBQVksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDO0lBQ2xFLE9BQU8sSUFBSTs7Ozs7T0FLTixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFM0IsRUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDN0IsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsQixPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBRUQsdURBQXVEO0FBQ3ZELFNBQVMsWUFBWSxDQUFDLGNBQXFDLEVBQUUsTUFBa0I7SUFDN0UsTUFBTSxXQUFXLEdBQUcsZ0JBQUcsQ0FBQyxRQUFRLENBQUM7SUFDakMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFM0QsZ0JBQUcsQ0FBQyxRQUFRLEdBQUcsVUFBUyxJQUFZLEVBQUUsUUFBaUI7UUFDckQsTUFBTSxHQUFHLEdBQVcsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDckIsaUVBQWlFO1lBQ2pFLHdEQUF3RDtZQUN4RCwrREFBK0Q7WUFDL0QsdUNBQXVDO1lBQ3ZDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdEM7UUFDRCxJQUFJO1lBQ0YsSUFBSSxJQUFJLEtBQUssWUFBWTtnQkFDdkIsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQzs7Z0JBRTVELE9BQU8sR0FBRyxDQUFDO1NBQ2Q7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNuRTtRQUNELE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsU0FBaUI7SUFDM0MsT0FBTyxJQUFJLEVBQUU7UUFDWCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNoRCxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUU7WUFDckIsT0FBTyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDcEI7YUFBTSxJQUFJLFNBQVMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ2hELE1BQU07U0FDUDtRQUNELFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ3JDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDdEQ7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLElBQVksRUFBRSxPQUFlLEVBQ3JELGNBQXFDLEVBQUUsTUFBa0I7SUFFekQsTUFBTSxJQUFJLEdBQUcsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDO0lBQy9CLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDckMsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUM7SUFDekQsTUFBTSxXQUFXLEdBQTBDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUM3RixNQUFNLE1BQU0sR0FBZ0IsWUFBWSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBSzNFLElBQUksVUFBVSxHQUFxQixNQUFNLENBQUMsVUFBVSxDQUFDO0lBRXJELDBDQUEwQztJQUMxQyxNQUFNLGNBQWMsR0FBa0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsaUJBQWlCLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDNUcsSUFBSSxXQUFXLEdBQWEsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO0lBRS9FLFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ3BDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEtBQUssSUFBSTtZQUNuRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFcEQsTUFBTSxTQUFTLEdBQWEsT0FBTyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDbEQsTUFBTSxTQUFTLEdBQWEsT0FBTyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDbEQsTUFBTSxhQUFhLEdBQUcsNENBQXlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNuRixNQUFNLGNBQWMsR0FBRyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUN6RCxJQUFJLGNBQWMsSUFBSSxJQUFJO1FBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsc0NBQXNDLEdBQUcsYUFBYSxDQUFDLENBQUM7SUFFMUUsNkJBQTZCO0lBQzdCLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDdEIsK0JBQStCO1FBQy9CLE1BQU0sYUFBYSxHQUFZLEVBQUUsQ0FBQyxRQUFRLEtBQUssY0FBYyxDQUFDLElBQUksQ0FBQztRQUNuRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQzFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQSxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQzVGLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxhQUFhLEVBQUU7WUFDakIsd0JBQXdCO1lBQ3hCLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBQ3BDLCtFQUErRTtZQUMvRSxxREFBcUQ7U0FDdEQ7YUFBTTtZQUNMLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1NBQ2xDO1FBQ0QsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxFQUN4QixHQUFHLEdBQUcsT0FBTyxFQUNiLEdBQUcsR0FBRyxPQUFPLEVBQ2IsR0FBRyxHQUFHLGVBQWUsQ0FBQyxDQUFDO1FBRXpCLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM1RSxXQUFZLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdEMsV0FBWSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDckQ7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILHdCQUF3QjtJQUN4QiwwRkFBMEY7SUFDMUYsSUFBSTtJQUNKLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDL0Qsd0NBQXdDLENBQUMsQ0FBQztRQUMxQyxFQUFFLENBQUMsWUFBWSxDQUFDLHdDQUF3QyxDQUFDLENBQUM7U0FDM0QsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFFN0IsV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FDckMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNqRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3pCLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQztJQUUvQixpR0FBaUc7SUFDakcsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDekcsV0FBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxXQUFZLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNyRCxXQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0I7WUFDakMsdUJBQXVCO1NBQzFCLENBQUM7S0FDSDtJQUVELElBQUksTUFBTSxHQUE4RDtRQUN0RSwrRUFBK0U7UUFDL0UsT0FBTyxFQUFFLFNBQVM7UUFDbEIsT0FBTyxFQUFFLFNBQVM7UUFDbEIsZUFBZSxvQkFDVixPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxlQUFlLElBQzFELE9BQU8sRUFBRSxJQUFJLEVBQ2IsZ0JBQWdCLEVBQUUsS0FBSyxFQUN2QixTQUFTLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUM7Z0JBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHdCQUF3QixDQUFDO2dCQUM1QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSx3Q0FBd0MsQ0FBQzthQUM3RDtZQUNELG9CQUFvQjtZQUNwQixnQkFBZ0IsRUFDaEIsS0FBSyxFQUFFLFdBQVcsR0FDbkI7UUFDRCxzQkFBc0IsRUFBRTtRQUN0QixjQUFjO1NBQ2Y7S0FDRixDQUFDO0lBQ0YsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1FBQ25CLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztLQUNsQztJQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDN0Usa0dBQWtHO0lBQ2xHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFXLEVBQUUsV0FBbUI7SUFDeEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsMEJBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0UsSUFBSTtRQUNGLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztLQUM1QztJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQsIFRhcmdldCwgdGFyZ2V0RnJvbVRhcmdldFN0cmluZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgUGFja2FnZUluZm8gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cyc7XG5pbXBvcnQgeyBDb25maWdIYW5kbGVyLCBEcmNwQ29uZmlnIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7IGdldFRzRGlyc09mUGFja2FnZSB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgc3lzIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBEcmNwU2V0dGluZyB9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQgcmVwbGFjZUNvZGUgZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgVHNBc3RTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IGFwaVNldHVwIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHtwYWNrYWdlQXNzZXRzRm9sZGVyc30gZnJvbSAnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnO1xuXG5cbmNvbnN0IHtjeWFuLCBncmVlbiwgcmVkfSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCB7d2Fsa1BhY2thZ2VzfSA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJyk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3QgY3VyclBhY2thZ2VOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbmNvbnN0IGNqc29uID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyLmNoYW5nZS1jbGktb3B0aW9ucycpO1xuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ29uZmlnSGFuZGxlciBleHRlbmRzIENvbmZpZ0hhbmRsZXIge1xuICAvKipcblx0ICogWW91IG1heSBvdmVycmlkZSBhbmd1bGFyLmpzb24gaW4gdGhpcyBmdW5jdGlvblxuXHQgKiBAcGFyYW0gb3B0aW9ucyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+LmFyY2hpdGVjdC48Y29tbWFuZD4ub3B0aW9uc1xuXHQgKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+XG5cdCAqL1xuICBhbmd1bGFySnNvbihvcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gICAgYnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKVxuICA6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5mdW5jdGlvbiBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCB0YXJnZXROYW1lOiBzdHJpbmcsXG4gIHJlcGxhY2VkT3B0czogYW55KSB7XG4gIGNvbnN0IGdldFRhcmdldE9wdGlvbnMgPSBjb250ZXh0LmdldFRhcmdldE9wdGlvbnM7XG5cbiAgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zID0gYXN5bmMgZnVuY3Rpb24odGFyZ2V0OiBUYXJnZXQpIHtcbiAgICBpZiAodGFyZ2V0LnRhcmdldCA9PT0gdGFyZ2V0TmFtZSkge1xuICAgICAgLy8gbG9nLmluZm8oJ0FuZ3VsYXIgY2xpIGJ1aWxkIG9wdGlvbnMnLCByZXBsYWNlZE9wdHMpO1xuICAgICAgcmV0dXJuIHJlcGxhY2VkT3B0cztcbiAgICB9XG4gICAgY29uc3Qgb3JpZ09wdGlvbiA9IGF3YWl0IGdldFRhcmdldE9wdGlvbnMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gb3JpZ09wdGlvbjtcbiAgfTtcbn1cbi8qKlxuICogRm9yIGJ1aWxkIChuZyBidWlsZClcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc0ZvckJ1aWxkKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hLCBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCk6IFByb21pc2U8QW5ndWxhckJ1aWxkZXJPcHRpb25zPiB7XG4gIHJldHVybiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhjb25maWcsIGJyb3dzZXJPcHRpb25zLCBjb250ZXh0KTtcbn1cblxuLyoqXG4gKiBGb3IgZGV2IHNlcnZlciAobmcgc2VydmUpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGNvbnRleHQgXG4gKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGJ1aWxkZXJDb25maWc6IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG5cbiAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcoYnVpbGRlckNvbmZpZyEuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IHJhd0Jyb3dzZXJPcHRpb25zID0gYXdhaXQgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zKGJyb3dzZXJUYXJnZXQpIGFzIGFueSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYTtcbiAgaWYgKCFyYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuXG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gYXdhaXQgcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gICAgY29uZmlnLCByYXdCcm93c2VyT3B0aW9ucywgY29udGV4dCwgYnVpbGRlckNvbmZpZywgdHJ1ZSk7XG4gIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dCwgJ2J1aWxkJywgYnJvd3Nlck9wdGlvbnMpO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICBjb25maWc6IERyY3BDb25maWcsXG4gIHJhd0Jyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSxcbiAgY29udGV4dDogQnVpbGRlckNvbnRleHQsXG4gIGRldlNlcnZlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBobXIgPSBmYWxzZSkge1xuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdDaGFuZ2UgYnVpbGRlciBvcHRpb25zJyk7XG4gIGNvbnN0IGJyb3dzZXJPcHRpb25zID0gcmF3QnJvd3Nlck9wdGlvbnMgYXMgQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuICBmb3IgKGNvbnN0IHByb3Agb2YgWydkZXBsb3lVcmwnLCAnb3V0cHV0UGF0aCcsICdzdHlsZXMnXSkge1xuICAgIGNvbnN0IHZhbHVlID0gY29uZmlnLmdldChbY3VyclBhY2thZ2VOYW1lLCBwcm9wXSk7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIChyYXdCcm93c2VyT3B0aW9ucyBhcyBhbnkpW3Byb3BdID0gdmFsdWU7XG4gICAgICBjb25zb2xlLmxvZyhjdXJyUGFja2FnZU5hbWUgKyAnIC0gb3ZlcnJpZGUgJXM6ICVzJywgcHJvcCwgdmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIGF3YWl0IGNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxBbmd1bGFyQ29uZmlnSGFuZGxlcj4oKGZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG4gICAgaWYgKGhhbmRsZXIuYW5ndWxhckpzb24pXG4gICAgICByZXR1cm4gaGFuZGxlci5hbmd1bGFySnNvbihicm93c2VyT3B0aW9ucywgZGV2U2VydmVyQ29uZmlnKTtcbiAgICBlbHNlXG4gICAgICByZXR1cm4gb2JqO1xuICB9KTtcblxuICBpZiAoIWJyb3dzZXJPcHRpb25zLmRlcGxveVVybClcbiAgICBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSAnLyc7XG4gIC8vIGlmIHN0YXRpYyBhc3NldHMncyBVUkwgaXMgbm90IGxlZCBieSAnLycsIGl0IHdpbGwgYmUgY29uc2lkZXJlZCBhcyByZWxhdGl2ZSBwYXRoIGluIG5nLWh0bWwtbG9hZGVyXG5cbiAgaWYgKGRldlNlcnZlckNvbmZpZykge1xuICAgIGNvbnN0IHBhcnNlZFVybCA9IFVybC5wYXJzZShicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpO1xuICAgIGlmIChwYXJzZWRVcmwuaG9zdCA9PSBudWxsKSB7XG4gICAgICBwYXJzZWRVcmwuaG9zdG5hbWUgPSAnbG9jYWxob3N0JztcbiAgICAgIHBhcnNlZFVybC5wb3J0ID0gZGV2U2VydmVyQ29uZmlnLnBvcnQgKyAnJztcbiAgICAgIHBhcnNlZFVybC5wcm90b2NvbCA9ICdodHRwJztcbiAgICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9IFVybC5mb3JtYXQocGFyc2VkVXJsKTtcbiAgICB9XG4gICAgZGV2U2VydmVyQ29uZmlnLnNlcnZlUGF0aCA9IHBhcnNlZFVybC5wYXRobmFtZTsgLy8gSW4gY2FzZSBkZXBsb3lVcmwgaGFzIGhvc3QsIG5nIGNsaSB3aWxsIHJlcG9ydCBlcnJvciBmb3IgbnVsbCBzZXJ2ZVBhdGhcbiAgfVxuXG4gIGlmIChicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKSB7XG4gICAgY29uc29sZS5sb2coYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyk7XG4gICAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzXG4gICAgLmZvckVhY2goZnIgPT4ge1xuICAgICAgT2JqZWN0LmtleXMoZnIpLmZvckVhY2goZmllbGQgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZTogc3RyaW5nID0gZnJbZmllbGRdO1xuICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHZhbHVlKSkge1xuICAgICAgICAgIGZyW2ZpZWxkXSA9IFBhdGgucmVsYXRpdmUoY3dkLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgcGtKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGlmIChwa0pzb24pIHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgU2V0IGVudHJ5IHBhY2thZ2UgJHtjeWFuKHBrSnNvbi5uYW1lKX0ncyBvdXRwdXQgcGF0aCB0byAvYCk7XG4gICAgY29uZmlnLnNldChbJ291dHB1dFBhdGhNYXAnLCBwa0pzb24ubmFtZV0sICcvJyk7XG4gIH1cbiAgLy8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuICBjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuICAgIGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuICBpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcbiAgICBjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblxuICBjb25zdCBtYWluSG1yID0gY3JlYXRlTWFpbkZpbGVGb3JIbXIoYnJvd3Nlck9wdGlvbnMubWFpbik7XG4gIGlmIChobXIgJiYgZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgZGV2U2VydmVyQ29uZmlnLmhtciA9IHRydWU7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKVxuICAgICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cyA9IFtdO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMucHVzaCh7XG4gICAgICByZXBsYWNlOiBicm93c2VyT3B0aW9ucy5tYWluLFxuICAgICAgd2l0aDogUGF0aC5yZWxhdGl2ZSgnLicsIG1haW5IbXIpXG4gICAgfSk7XG4gIH1cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID09IG51bGwpIHtcbiAgICBicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9IHt9O1xuICB9XG5cbiAgYnJvd3Nlck9wdGlvbnMuY29tbW9uQ2h1bmsgPSBmYWxzZTtcblxuICBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG4gIGF3YWl0IGFwaVNldHVwKGJyb3dzZXJPcHRpb25zKTtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnc2V0dGluZyB1cCBhc3NldHMgb3B0aW9ucycpO1xuICAvLyBCZWNhdXNlIGRldi1zZXJ2ZS1hc3NldHMgZGVwZW5kcyBvbiBEUkNQIGFwaSwgSSBoYXZlIHRvIGxhenkgbG9hZCBpdC5cbiAgY29uc3QgZm9yRWFjaEFzc2V0c0RpcjogdHlwZW9mIHBhY2thZ2VBc3NldHNGb2xkZXJzID1cbiAgcmVxdWlyZSgnQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnKS5wYWNrYWdlQXNzZXRzRm9sZGVycztcbiAgZm9yRWFjaEFzc2V0c0RpcignLycsIChpbnB1dERpciwgb3V0cHV0RGlyKSA9PiB7XG4gICAgaWYgKCFicm93c2VyT3B0aW9ucy5hc3NldHMpIHtcbiAgICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyA9IFtdO1xuICAgIH1cbiAgICBsZXQgaW5wdXQgPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGlucHV0RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCFpbnB1dC5zdGFydHNXaXRoKCcuJykpIHtcbiAgICAgIGlucHV0ID0gJy4vJyArIGlucHV0O1xuICAgIH1cbiAgICBicm93c2VyT3B0aW9ucy5hc3NldHMhLnB1c2goe1xuICAgICAgaW5wdXQsXG4gICAgICBnbG9iOiAnKiovKicsXG4gICAgICBvdXRwdXQ6IG91dHB1dERpci5lbmRzV2l0aCgnLycpID8gb3V0cHV0RGlyIDogb3V0cHV0RGlyICsgJy8nXG4gICAgfSk7XG4gIH0pO1xuICBjb250ZXh0LmxvZ2dlci5pbmZvKCdicm93c2VyIGJ1aWxkZXIgb3B0aW9uczonICsgSlNPTi5zdHJpbmdpZnkoYnJvd3Nlck9wdGlvbnMsIHVuZGVmaW5lZCwgJyAgJykpO1xuICByZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1haW5GaWxlRm9ySG1yKG1haW5GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUobWFpbkZpbGUpO1xuICBjb25zdCB3cml0ZVRvID0gUGF0aC5yZXNvbHZlKGRpciwgJ21haW4taG1yLnRzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHdyaXRlVG8pKSB7XG4gICAgcmV0dXJuIHdyaXRlVG87XG4gIH1cbiAgY29uc3QgbWFpbiA9IGZzLnJlYWRGaWxlU3luYyhtYWluRmlsZSwgJ3V0ZjgnKTtcbiAgbGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcbiAgYGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWlufWA7XG4gIGNvbnN0IHF1ZXJ5ID0gbmV3IFRzQXN0U2VsZWN0b3IobWFpbkhtciwgJ21haW4taG1yLnRzJyk7XG4gIC8vIHF1ZXJ5LnByaW50QWxsKCk7XG5cbiAgbGV0IGJvb3RDYWxsQXN0OiB0cy5Ob2RlO1xuICBjb25zdCBzdGF0ZW1lbnQgPSBxdWVyeS5zcmMuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lLWxlbmd0aFxuICAgIGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZFdpdGgoc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG4gICAgICAoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG4gICAgICAgIGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG4gICAgICAgIChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuICAgICAgICBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuICAgICAgICAgIHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIGlmIChib290Q2FsbCkge1xuICAgICAgYm9vdENhbGxBc3QgPSBib290Q2FsbDtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGlmIChzdGF0ZW1lbnQgPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7bWFpbkZpbGV9LGAgK1xuICAgIGBjYW4gbm90IGZpbmQgc3RhdGVtZW50IGxpa2U6IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKVxcbiR7bWFpbkhtcn1gKTtcblxuICBtYWluSG1yID0gcmVwbGFjZUNvZGUobWFpbkhtciwgW3tcbiAgICBzdGFydDogc3RhdGVtZW50LmdldFN0YXJ0KHF1ZXJ5LnNyYywgdHJ1ZSksXG4gICAgZW5kOiBzdGF0ZW1lbnQuZ2V0RW5kKCksXG4gICAgdGV4dDogJyd9XSk7XG4gIG1haW5IbXIgKz0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QhLmdldFRleHQoKX07XFxuYDtcbiAgbWFpbkhtciArPSBgaWYgKG1vZHVsZVsgJ2hvdCcgXSkge1xuXHQgICAgaG1yQm9vdHN0cmFwKG1vZHVsZSwgYm9vdHN0cmFwKTtcblx0ICB9IGVsc2Uge1xuXHQgICAgY29uc29sZS5lcnJvcignSE1SIGlzIG5vdCBlbmFibGVkIGZvciB3ZWJwYWNrLWRldi1zZXJ2ZXIhJyk7XG5cdCAgICBjb25zb2xlLmxvZygnQXJlIHlvdSB1c2luZyB0aGUgLS1obXIgZmxhZyBmb3Igbmcgc2VydmU/Jyk7XG5cdCAgfVxcbmAucmVwbGFjZSgvXlxcdC9nbSwgJycpO1xuXG4gIGZzLndyaXRlRmlsZVN5bmMod3JpdGVUbywgbWFpbkhtcik7XG4gIGxvZy5pbmZvKCdXcml0ZSAnICsgd3JpdGVUbyk7XG4gIGxvZy5pbmZvKG1haW5IbXIpO1xuICByZXR1cm4gd3JpdGVUbztcbn1cblxuLy8gSGFjayB0cy5zeXMsIHNvIGZhciBpdCBpcyB1c2VkIHRvIHJlYWQgdHNjb25maWcuanNvblxuZnVuY3Rpb24gaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZykge1xuICBjb25zdCBvbGRSZWFkRmlsZSA9IHN5cy5yZWFkRmlsZTtcbiAgY29uc3QgdHNDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLnRzQ29uZmlnKTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuICAgICAgICByZXR1cm4gY2FjaGVkVHNDb25maWdGb3IocGF0aCwgcmVzLCBicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IocmVkKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBSZWFkICR7cGF0aH1gLCBlcnIpO1xuICAgIH1cbiAgICByZXR1cm4gJyc7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZShwayk7XG4gICAgfSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQW5ndWxhciBjbGkgd2lsbCByZWFkIHRzY29uZmlnLmpzb24gdHdpY2UgZHVlIHRvIHNvbWUganVuayBjb2RlLCBcbiAqIGxldCdzIG1lbW9pemUgdGhlIHJlc3VsdCBieSBmaWxlIHBhdGggYXMgY2FjaGUga2V5LlxuICovXG5jb25zdCBjYWNoZWRUc0NvbmZpZ0ZvciA9IF8ubWVtb2l6ZShvdmVycmlkZVRzQ29uZmlnKTtcbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKTogc3RyaW5nIHtcblxuICBjb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG4gIGNvbnN0IG9sZEpzb24gPSBjanNvbi5wYXJzZShjb250ZW50KTtcbiAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119IHwgdW5kZWZpbmVkID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgbnVsbCwgcGFja2FnZVV0aWxzLCB0cnVlKTtcbiAgLy8gdmFyIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdID0gY29uZmlnKCkucGFja2FnZVNjb3BlcztcbiAgLy8gdmFyIGNvbXBvbmVudHMgPSBwa0luZm8ubW9kdWxlTWFwO1xuXG4gIHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcbiAgbGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuICAvLyBjb25zdCBleGNsdWRlUGtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZXhjbHVkZVBhY2thZ2U6IERyY3BTZXR0aW5nWydleGNsdWRlUGFja2FnZSddID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYWNrYWdlJykgfHwgW107XG4gIGxldCBleGNsdWRlUGF0aDogc3RyaW5nW10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhdGgnKSB8fCBbXTtcblxuICBuZ1BhY2thZ2VzID0gbmdQYWNrYWdlcy5maWx0ZXIoY29tcCA9PlxuICAgICFleGNsdWRlUGFja2FnZS5zb21lKHJlZyA9PiBfLmlzU3RyaW5nKHJlZykgPyBjb21wLmxvbmdOYW1lLmluY2x1ZGVzKHJlZykgOiByZWcudGVzdChjb21wLmxvbmdOYW1lKSkgJiZcbiAgICAoY29tcC5kciAmJiBjb21wLmRyLmFuZ3VsYXJDb21waWxlciB8fCBjb21wLnBhcnNlZE5hbWUuc2NvcGUgPT09ICdiaycgfHxcbiAgICAgIGhhc0lzb21vcnBoaWNEaXIoY29tcC5qc29uLCBjb21wLnBhY2thZ2VQYXRoKSkpO1xuXG4gIGNvbnN0IHRzSW5jbHVkZTogc3RyaW5nW10gPSBvbGRKc29uLmluY2x1ZGUgfHwgW107XG4gIGNvbnN0IHRzRXhjbHVkZTogc3RyaW5nW10gPSBvbGRKc29uLmV4Y2x1ZGUgfHwgW107XG4gIGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGNvbnN0IGFwcFBhY2thZ2VKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKGFwcE1vZHVsZUZpbGUpO1xuICBpZiAoYXBwUGFja2FnZUpzb24gPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yLCBjYW4gbm90IGZpbmQgcGFja2FnZS5qc29uIG9mICcgKyBhcHBNb2R1bGVGaWxlKTtcblxuICAvLyBsZXQgaGFzQXBwUGFja2FnZSA9IGZhbHNlO1xuICBuZ1BhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuICAgIC8vIFRPRE86IGRvYyBmb3IgZHIubmdBcHBNb2R1bGVcbiAgICBjb25zdCBpc05nQXBwTW9kdWxlOiBib29sZWFuID0gcGsubG9uZ05hbWUgPT09IGFwcFBhY2thZ2VKc29uLm5hbWU7XG4gICAgY29uc3QgZGlyID0gUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksXG4gICAgICBpc05nQXBwTW9kdWxlID8gcGsucmVhbFBhY2thZ2VQYXRoIDogKHByZXNlcnZlU3ltbGlua3M/IHBrLnBhY2thZ2VQYXRoIDogcGsucmVhbFBhY2thZ2VQYXRoKSlcbiAgICAgIC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKGlzTmdBcHBNb2R1bGUpIHtcbiAgICAgIC8vIGhhc0FwcFBhY2thZ2UgPSB0cnVlO1xuICAgICAgdHNJbmNsdWRlLnVuc2hpZnQoZGlyICsgJy8qKi8qLnRzJyk7XG4gICAgICAvLyBlbnRyeSBwYWNrYWdlIG11c3QgYmUgYXQgZmlyc3Qgb2YgVFMgaW5jbHVkZSBsaXN0LCBvdGhlcndpc2Ugd2lsbCBlbmNvdW50ZXI6XG4gICAgICAvLyBcIkVycm9yOiBObyBOZ01vZHVsZSBtZXRhZGF0YSBmb3VuZCBmb3IgJ0FwcE1vZHVsZSdcbiAgICB9IGVsc2Uge1xuICAgICAgdHNJbmNsdWRlLnB1c2goZGlyICsgJy8qKi8qLnRzJyk7XG4gICAgfVxuICAgIHRzRXhjbHVkZS5wdXNoKGRpciArICcvdHMnLFxuICAgICAgZGlyICsgJy9zcGVjJyxcbiAgICAgIGRpciArICcvZGlzdCcsXG4gICAgICBkaXIgKyAnLyoqLyouc3BlYy50cycpO1xuXG4gICAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBway5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5sb25nTmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZyFbcGsubG9uZ05hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gICAgfVxuICB9KTtcbiAgLy8gaWYgKCFoYXNBcHBQYWNrYWdlKSB7XG4gIC8vIFx0dHNJbmNsdWRlLnVuc2hpZnQoUGF0aC5kaXJuYW1lKGJyb3dzZXJPcHRpb25zLm1haW4pLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKi50cycpO1xuICAvLyB9XG4gIHRzSW5jbHVkZS5wdXNoKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBwcmVzZXJ2ZVN5bWxpbmtzID9cbiAgICAgICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScgOlxuICAgICAgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScpKVxuICAgIC5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICB0c0V4Y2x1ZGUucHVzaCgnKiovdGVzdC50cycpO1xuXG4gIGV4Y2x1ZGVQYXRoID0gZXhjbHVkZVBhdGgubWFwKGV4cGF0aCA9PlxuICAgIFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBleHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIGNvbnNvbGUubG9nKGV4Y2x1ZGVQYXRoKTtcbiAgdHNFeGNsdWRlLnB1c2goLi4uZXhjbHVkZVBhdGgpO1xuXG4gIC8vIEltcG9ydGFudCEgdG8gbWFrZSBBbmd1bGFyICYgVHlwZXNjcmlwdCByZXNvbHZlIGNvcnJlY3QgcmVhbCBwYXRoIG9mIHN5bWxpbmsgbGF6eSByb3V0ZSBtb2R1bGVcbiAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgY29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZyFbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuICAgIHBhdGhNYXBwaW5nIVsnZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gICAgcGF0aE1hcHBpbmchWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJ1xuICAgICAgLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ1xuICAgIF07XG4gIH1cblxuICB2YXIgdHNqc29uOiB7Y29tcGlsZXJPcHRpb25zOiB0cy5Db21waWxlck9wdGlvbnMsIFtrZXk6IHN0cmluZ106IGFueX0gPSB7XG4gICAgLy8gZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuICAgIGluY2x1ZGU6IHRzSW5jbHVkZSxcbiAgICBleGNsdWRlOiB0c0V4Y2x1ZGUsXG4gICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAuLi5yZXF1aXJlKCcuLi8uLi9taXNjL3RzY29uZmlnLmFwcC5qc29uJykuY29tcGlsZXJPcHRpb25zLFxuICAgICAgYmFzZVVybDogcm9vdCxcbiAgICAgIHN0cmljdE51bGxDaGVja3M6IGZhbHNlLFxuICAgICAgdHlwZVJvb3RzOiBbXG4gICAgICAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgICAgICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcbiAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC90eXBlcycpXG4gICAgICBdLFxuICAgICAgLy8gbW9kdWxlOiAnZXNuZXh0JyxcbiAgICAgIHByZXNlcnZlU3ltbGlua3MsXG4gICAgICBwYXRoczogcGF0aE1hcHBpbmdcbiAgICB9LFxuICAgIGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC8vIHRyYWNlOiB0cnVlXG4gICAgfVxuICB9O1xuICBpZiAob2xkSnNvbi5leHRlbmRzKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSBvbGRKc29uLmV4dGVuZHM7XG4gIH1cbiAgT2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLCBvbGRKc29uLmNvbXBpbGVyT3B0aW9ucyk7XG4gIE9iamVjdC5hc3NpZ24odHNqc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnMsIG9sZEpzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucyk7XG4gIC8vIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGAke2ZpbGV9OlxcbmAsIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuICBsb2cuaW5mbyhgJHtmaWxlfTpcXG4ke0pTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyl9YCk7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpO1xufVxuXG5mdW5jdGlvbiBoYXNJc29tb3JwaGljRGlyKHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IGZ1bGxQYXRoID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBnZXRUc0RpcnNPZlBhY2thZ2UocGtKc29uKS5pc29tRGlyKTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gZnMuc3RhdFN5bmMoZnVsbFBhdGgpLmlzRGlyZWN0b3J5KCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cbiJdfQ==
