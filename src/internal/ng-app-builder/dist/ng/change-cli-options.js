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
            const parsedUrl = url_1.default.parse(browserOptions.deployUrl, true, true);
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
    excludePath.push('**/*.d.ts');
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
                Path.resolve(root, 'node_modules/@dr-types')
                // Below is NodeJS only, which will break Angular Ivy engine
                // Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQXNCO0FBQ3RCLDJDQUFpQztBQUVqQyxnRUFBc0U7QUFDdEUsNkVBQThDO0FBQzlDLGlGQUFrRDtBQUVsRCw4RUFBd0M7QUFDeEMsb0VBQTRCO0FBSTVCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFZdEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDcEUsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztLQUFBLENBQUM7QUFDSixDQUFDO0FBQ0Q7Ozs7R0FJRztBQUNILFNBQXNCLCtCQUErQixDQUFDLE1BQWtCLEVBQ3RFLGNBQW9DLEVBQUUsT0FBdUI7O1FBQzdELE9BQU8sNkJBQTZCLENBQUMsTUFBTSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN4RSxDQUFDO0NBQUE7QUFIRCwwRUFHQztBQUVEOzs7OztHQUtHO0FBQ0gsU0FBc0IsdUJBQXVCLENBQUMsTUFBa0IsRUFDOUQsT0FBdUIsRUFDdkIsYUFBc0M7O1FBRXRDLE1BQU0sYUFBYSxHQUFHLGtDQUFzQixDQUFDLGFBQWMsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzRSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBZ0MsQ0FBQztRQUN2RyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUM5QixpQkFBaUIsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBRXBDLE1BQU0sY0FBYyxHQUFHLE1BQU0sNkJBQTZCLENBQ3hELE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzNELHlCQUF5QixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDNUQsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBYkQsMERBYUM7QUFFRCxTQUFlLDZCQUE2QixDQUMxQyxNQUFrQixFQUNsQixpQkFBdUMsRUFDdkMsT0FBdUIsRUFDdkIsZUFBeUMsRUFBRSxHQUFHLEdBQUcsS0FBSzs7UUFFdEQsT0FBTyxDQUFDLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sY0FBYyxHQUFHLGlCQUEwQyxDQUFDO1FBQ2xFLEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ3hELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLGlCQUF5QixDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2xFO1NBQ0Y7UUFFRCxNQUFNLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBdUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ25GLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksT0FBTyxDQUFDLFdBQVc7Z0JBQ3JCLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7O2dCQUU1RCxPQUFPLEdBQUcsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTO1lBQzNCLGNBQWMsQ0FBQyxTQUFTLEdBQUcsR0FBRyxDQUFDO1FBQ2pDLHFHQUFxRztRQUVyRyxJQUFJLGVBQWUsRUFBRTtZQUNuQixNQUFNLFNBQVMsR0FBRyxhQUFHLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2xFLElBQUksU0FBUyxDQUFDLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQzFCLFNBQVMsQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDO2dCQUNqQyxTQUFTLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUMzQyxTQUFTLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQztnQkFDNUIsaUJBQWlCLENBQUMsU0FBUyxHQUFHLGFBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDckQ7WUFDRCxlQUFlLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQywwRUFBMEU7U0FDM0g7UUFFRCxJQUFJLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNuQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUMxQixjQUFjLENBQUMsZ0JBQWdCO2lCQUM5QixPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ1osTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQzlCLE1BQU0sS0FBSyxHQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDaEMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO3dCQUMxQixFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7cUJBQ3ZDO2dCQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7U0FDSjtRQUVELE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckUsSUFBSSxNQUFNLEVBQUU7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLHFCQUFxQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ2pEO1FBQ0Qsd0NBQXdDO1FBQ3hDLE1BQU0sRUFBQyxTQUFTLEVBQUMsR0FBRyxjQUFjLENBQUM7UUFDbkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUM7WUFDaEMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztZQUMzQixNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUV0QyxNQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUQsSUFBSSxHQUFHLElBQUksZUFBZSxFQUFFO1lBQzFCLGVBQWUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDO1lBQzNCLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO2dCQUNsQyxjQUFjLENBQUMsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDO1lBQ3ZDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ25DLE9BQU8sRUFBRSxjQUFjLENBQUMsSUFBSTtnQkFDNUIsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQzthQUNsQyxDQUFDLENBQUM7U0FDSjtRQUNELElBQUksY0FBYyxDQUFDLFFBQVEsSUFBSSxJQUFJLEVBQUU7WUFDbkMsY0FBYyxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7U0FDOUI7UUFFRCxjQUFjLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUVuQyxZQUFZLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sd0JBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUvQixPQUFPLENBQUMsWUFBWSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDbEQsd0VBQXdFO1FBQ3hFLE1BQU0sZ0JBQWdCLEdBQ3RCLE9BQU8sQ0FBQyxpREFBaUQsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO1FBQ2hGLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUM1QyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRTtnQkFDMUIsY0FBYyxDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUM7YUFDNUI7WUFDRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZFLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUMxQixLQUFLLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FBQzthQUN0QjtZQUNELGNBQWMsQ0FBQyxNQUFPLENBQUMsSUFBSSxDQUFDO2dCQUMxQixLQUFLO2dCQUNMLElBQUksRUFBRSxNQUFNO2dCQUNaLE1BQU0sRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxHQUFHO2FBQzlELENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEcsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQztDQUFBO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxRQUFnQjtJQUM1QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ25DLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQ2pELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMxQixPQUFPLE9BQU8sQ0FBQztLQUNoQjtJQUNELE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLElBQUksT0FBTyxHQUFHLHFCQUFxQjtRQUNuQyxnRUFBZ0UsSUFBSSxFQUFFLENBQUM7SUFDdkUsTUFBTSxLQUFLLEdBQUcsSUFBSSxzQkFBYSxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztJQUN4RCxvQkFBb0I7SUFFcEIsSUFBSSxXQUFvQixDQUFDO0lBQ3pCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtRQUN0RCwyQ0FBMkM7UUFDM0MsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsaUZBQWlGLEVBQzFILENBQUMsR0FBa0IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDcEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLHdCQUF3QjtnQkFDeEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFzQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLGlCQUFpQjtnQkFDaEcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxvQkFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUU7Z0JBQzlELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO2FBQ2pDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxJQUFJLFFBQVEsRUFBRTtZQUNaLFdBQVcsR0FBRyxRQUFRLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLFNBQVMsSUFBSSxJQUFJO1FBQ25CLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxRQUFRLEdBQUc7WUFDOUIscUZBQXFGLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFFbEcsT0FBTyxHQUFHLG9CQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7WUFDMUMsR0FBRyxFQUFFLFNBQVMsQ0FBQyxNQUFNLEVBQUU7WUFDdkIsSUFBSSxFQUFFLEVBQUU7U0FBQyxDQUFDLENBQUMsQ0FBQztJQUNkLE9BQU8sSUFBSSwyQkFBMkIsV0FBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUM7SUFDbEUsT0FBTyxJQUFJOzs7OztPQUtOLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUUzQixFQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNuQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUM3QixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2xCLE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFFRCx1REFBdUQ7QUFDdkQsU0FBUyxZQUFZLENBQUMsY0FBcUMsRUFBRSxNQUFrQjtJQUM3RSxNQUFNLFdBQVcsR0FBRyxnQkFBRyxDQUFDLFFBQVEsQ0FBQztJQUNqQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUUzRCxnQkFBRyxDQUFDLFFBQVEsR0FBRyxVQUFTLElBQVksRUFBRSxRQUFpQjtRQUNyRCxNQUFNLEdBQUcsR0FBVyxXQUFXLENBQUMsS0FBSyxDQUFDLGdCQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdEQsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRTtZQUNyQixpRUFBaUU7WUFDakUsd0RBQXdEO1lBQ3hELCtEQUErRDtZQUMvRCx1Q0FBdUM7WUFDdkMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUN0QztRQUNELElBQUk7WUFDRixJQUFJLElBQUksS0FBSyxZQUFZO2dCQUN2QixPQUFPLGlCQUFpQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDOztnQkFFNUQsT0FBTyxHQUFHLENBQUM7U0FDZDtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsR0FBRyxRQUFRLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ25FO1FBQ0QsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxTQUFpQjtJQUMzQyxPQUFPLElBQUksRUFBRTtRQUNYLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNyQixPQUFPLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNwQjthQUFNLElBQUksU0FBUyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDaEQsTUFBTTtTQUNQO1FBQ0QsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDckM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN0RDs7Ozs7Ozs7R0FRRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsSUFBWSxFQUFFLE9BQWUsRUFDckQsY0FBcUMsRUFBRSxNQUFrQjtJQUV6RCxNQUFNLElBQUksR0FBRyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUM7SUFDL0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNyQyxNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQztJQUN6RCxNQUFNLFdBQVcsR0FBMEMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzdGLE1BQU0sTUFBTSxHQUFnQixZQUFZLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFLM0UsSUFBSSxVQUFVLEdBQXFCLE1BQU0sQ0FBQyxVQUFVLENBQUM7SUFFckQsMENBQTBDO0lBQzFDLE1BQU0sY0FBYyxHQUFrQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUM1RyxJQUFJLFdBQVcsR0FBYSxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7SUFFL0UsVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FDcEMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3BHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssS0FBSyxJQUFJO1lBQ25FLGdCQUFnQixDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVwRCxNQUFNLFNBQVMsR0FBYSxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUNsRCxNQUFNLFNBQVMsR0FBYSxPQUFPLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUNsRCxNQUFNLGFBQWEsR0FBRyw0Q0FBeUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25GLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELElBQUksY0FBYyxJQUFJLElBQUk7UUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsR0FBRyxhQUFhLENBQUMsQ0FBQztJQUUxRSw2QkFBNkI7SUFDN0IsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUN0QiwrQkFBK0I7UUFDL0IsTUFBTSxhQUFhLEdBQVksRUFBRSxDQUFDLFFBQVEsS0FBSyxjQUFjLENBQUMsSUFBSSxDQUFDO1FBQ25FLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFDMUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFBLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLENBQUM7YUFDNUYsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLGFBQWEsRUFBRTtZQUNqQix3QkFBd0I7WUFDeEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDcEMsK0VBQStFO1lBQy9FLHFEQUFxRDtTQUN0RDthQUFNO1lBQ0wsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLENBQUM7U0FDbEM7UUFDRCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLEVBQ3hCLEdBQUcsR0FBRyxPQUFPLEVBQ2IsR0FBRyxHQUFHLE9BQU8sRUFDYixHQUFHLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFFekIsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVFLFdBQVksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN0QyxXQUFZLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztTQUNyRDtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsd0JBQXdCO0lBQ3hCLDBGQUEwRjtJQUMxRixJQUFJO0lBQ0osU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUMvRCx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsd0NBQXdDLENBQUMsQ0FBQztTQUMzRCxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDeEIsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUU3QixXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUNyQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDOUIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN6QixTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUM7SUFFL0IsaUdBQWlHO0lBQ2pHLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUNyQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ3pHLFdBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsV0FBWSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDckQsV0FBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCO1lBQ2pDLHVCQUF1QjtTQUMxQixDQUFDO0tBQ0g7SUFFRCxJQUFJLE1BQU0sR0FBOEQ7UUFDdEUsK0VBQStFO1FBQy9FLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGVBQWUsb0JBQ1YsT0FBTyxDQUFDLDhCQUE4QixDQUFDLENBQUMsZUFBZSxJQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUNiLGdCQUFnQixFQUFFLEtBQUssRUFDdkIsU0FBUyxFQUFFO2dCQUNULElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDO2dCQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztnQkFDNUMsNERBQTREO2dCQUM1RCwrREFBK0Q7YUFDaEU7WUFDRCxvQkFBb0I7WUFDcEIsZ0JBQWdCLEVBQ2hCLEtBQUssRUFBRSxXQUFXLEdBQ25CO1FBQ0Qsc0JBQXNCLEVBQUU7UUFDdEIsY0FBYztTQUNmO0tBQ0YsQ0FBQztJQUNGLElBQUksT0FBTyxDQUFDLE9BQU8sRUFBRTtRQUNuQixNQUFNLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7S0FDbEM7SUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFzQixFQUFFLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0lBQzdFLGtHQUFrRztJQUNsRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsTUFBVyxFQUFFLFdBQW1CO0lBQ3hELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLDBCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQy9FLElBQUk7UUFDRixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDNUM7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFBhY2thZ2VJbmZvIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnO1xuaW1wb3J0IHsgQ29uZmlnSGFuZGxlciwgRHJjcENvbmZpZyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgeyBnZXRUc0RpcnNPZlBhY2thZ2UgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBVcmwgZnJvbSAndXJsJztcbmltcG9ydCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgRHJjcFNldHRpbmcgfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHsgZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbiB9IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCBhcGlTZXR1cCBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7cGFja2FnZUFzc2V0c0ZvbGRlcnN9IGZyb20gJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJztcblxuXG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qge3dhbGtQYWNrYWdlc30gPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cycpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBjanNvbiA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcbiAgLyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cbiAgYW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuICAgIGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcbiAgOiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuICByZXBsYWNlZE9wdHM6IGFueSkge1xuICBjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG4gIGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG4gICAgaWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcbiAgICAgIC8vIGxvZy5pbmZvKCdBbmd1bGFyIGNsaSBidWlsZCBvcHRpb25zJywgcmVwbGFjZWRPcHRzKTtcbiAgICAgIHJldHVybiByZXBsYWNlZE9wdHM7XG4gICAgfVxuICAgIGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG4gICAgcmV0dXJuIG9yaWdPcHRpb247XG4gIH07XG59XG4vKipcbiAqIEZvciBidWlsZCAobmcgYnVpbGQpXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIGJyb3dzZXJPcHRpb25zIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnNGb3JCdWlsZChjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSwgY29udGV4dDogQnVpbGRlckNvbnRleHQpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuICByZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucywgY29udGV4dCk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBidWlsZGVyQ29uZmlnOiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucykge1xuXG4gIGNvbnN0IGJyb3dzZXJUYXJnZXQgPSB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nKGJ1aWxkZXJDb25maWchLmJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KSBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG4gIGlmICghcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIHJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcblxuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICAgIGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMsIGNvbnRleHQsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuICBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgY29uZmlnOiBEcmNwQ29uZmlnLFxuICByYXdCcm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICBkZXZTZXJ2ZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucywgaG1yID0gZmFsc2UpIHtcblxuICBjb250ZXh0LnJlcG9ydFN0YXR1cygnQ2hhbmdlIGJ1aWxkZXIgb3B0aW9ucycpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG9iajtcbiAgfSk7XG5cbiAgaWYgKCFicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuICAvLyBpZiBzdGF0aWMgYXNzZXRzJ3MgVVJMIGlzIG5vdCBsZWQgYnkgJy8nLCBpdCB3aWxsIGJlIGNvbnNpZGVyZWQgYXMgcmVsYXRpdmUgcGF0aCBpbiBuZy1odG1sLWxvYWRlclxuXG4gIGlmIChkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBjb25zdCBwYXJzZWRVcmwgPSBVcmwucGFyc2UoYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsLCB0cnVlLCB0cnVlKTtcbiAgICBpZiAocGFyc2VkVXJsLmhvc3QgPT0gbnVsbCkge1xuICAgICAgcGFyc2VkVXJsLmhvc3RuYW1lID0gJ2xvY2FsaG9zdCc7XG4gICAgICBwYXJzZWRVcmwucG9ydCA9IGRldlNlcnZlckNvbmZpZy5wb3J0ICsgJyc7XG4gICAgICBwYXJzZWRVcmwucHJvdG9jb2wgPSAnaHR0cCc7XG4gICAgICByYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSBVcmwuZm9ybWF0KHBhcnNlZFVybCk7XG4gICAgfVxuICAgIGRldlNlcnZlckNvbmZpZy5zZXJ2ZVBhdGggPSBwYXJzZWRVcmwucGF0aG5hbWU7IC8vIEluIGNhc2UgZGVwbG95VXJsIGhhcyBob3N0LCBuZyBjbGkgd2lsbCByZXBvcnQgZXJyb3IgZm9yIG51bGwgc2VydmVQYXRoXG4gIH1cblxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykge1xuICAgIGNvbnNvbGUubG9nKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpO1xuICAgIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50c1xuICAgIC5mb3JFYWNoKGZyID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKGZyKS5mb3JFYWNoKGZpZWxkID0+IHtcbiAgICAgICAgY29uc3QgdmFsdWU6IHN0cmluZyA9IGZyW2ZpZWxkXTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZSh2YWx1ZSkpIHtcbiAgICAgICAgICBmcltmaWVsZF0gPSBQYXRoLnJlbGF0aXZlKGN3ZCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBpZiAocGtKc29uKSB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuICAgIGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpO1xuICB9XG4gIC8vIEJlIGNvbXBhdGlibGUgdG8gb2xkIERSQ1AgYnVpbGQgdG9vbHNcbiAgY29uc3Qge2RlcGxveVVybH0gPSBicm93c2VyT3B0aW9ucztcbiAgaWYgKCFjb25maWcuZ2V0KCdzdGF0aWNBc3NldHNVUkwnKSlcbiAgICBjb25maWcuc2V0KCdzdGF0aWNBc3NldHNVUkwnLCBfLnRyaW1FbmQoZGVwbG95VXJsLCAnLycpKTtcbiAgaWYgKCFjb25maWcuZ2V0KCdwdWJsaWNQYXRoJykpXG4gICAgY29uZmlnLnNldCgncHVibGljUGF0aCcsIGRlcGxveVVybCk7XG5cbiAgY29uc3QgbWFpbkhtciA9IGNyZWF0ZU1haW5GaWxlRm9ySG1yKGJyb3dzZXJPcHRpb25zLm1haW4pO1xuICBpZiAoaG1yICYmIGRldlNlcnZlckNvbmZpZykge1xuICAgIGRldlNlcnZlckNvbmZpZy5obXIgPSB0cnVlO1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cylcbiAgICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMgPSBbXTtcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLnB1c2goe1xuICAgICAgcmVwbGFjZTogYnJvd3Nlck9wdGlvbnMubWFpbixcbiAgICAgIHdpdGg6IFBhdGgucmVsYXRpdmUoJy4nLCBtYWluSG1yKVxuICAgIH0pO1xuICB9XG4gIGlmIChicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9PSBudWxsKSB7XG4gICAgYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPSB7fTtcbiAgfVxuXG4gIGJyb3dzZXJPcHRpb25zLmNvbW1vbkNodW5rID0gZmFsc2U7XG5cbiAgaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuICBhd2FpdCBhcGlTZXR1cChicm93c2VyT3B0aW9ucyk7XG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ3NldHRpbmcgdXAgYXNzZXRzIG9wdGlvbnMnKTtcbiAgLy8gQmVjYXVzZSBkZXYtc2VydmUtYXNzZXRzIGRlcGVuZHMgb24gRFJDUCBhcGksIEkgaGF2ZSB0byBsYXp5IGxvYWQgaXQuXG4gIGNvbnN0IGZvckVhY2hBc3NldHNEaXI6IHR5cGVvZiBwYWNrYWdlQXNzZXRzRm9sZGVycyA9XG4gIHJlcXVpcmUoJ0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9kZXYtc2VydmUtYXNzZXRzJykucGFja2FnZUFzc2V0c0ZvbGRlcnM7XG4gIGZvckVhY2hBc3NldHNEaXIoJy8nLCAoaW5wdXREaXIsIG91dHB1dERpcikgPT4ge1xuICAgIGlmICghYnJvd3Nlck9wdGlvbnMuYXNzZXRzKSB7XG4gICAgICBicm93c2VyT3B0aW9ucy5hc3NldHMgPSBbXTtcbiAgICB9XG4gICAgbGV0IGlucHV0ID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBpbnB1dERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICghaW5wdXQuc3RhcnRzV2l0aCgnLicpKSB7XG4gICAgICBpbnB1dCA9ICcuLycgKyBpbnB1dDtcbiAgICB9XG4gICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzIS5wdXNoKHtcbiAgICAgIGlucHV0LFxuICAgICAgZ2xvYjogJyoqLyonLFxuICAgICAgb3V0cHV0OiBvdXRwdXREaXIuZW5kc1dpdGgoJy8nKSA/IG91dHB1dERpciA6IG91dHB1dERpciArICcvJ1xuICAgIH0pO1xuICB9KTtcbiAgY29udGV4dC5sb2dnZXIuaW5mbygnYnJvd3NlciBidWlsZGVyIG9wdGlvbnM6JyArIEpTT04uc3RyaW5naWZ5KGJyb3dzZXJPcHRpb25zLCB1bmRlZmluZWQsICcgICcpKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcbiAgY29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuICAgIHJldHVybiB3cml0ZVRvO1xuICB9XG4gIGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG4gIGxldCBtYWluSG1yID0gJy8vIHRzbGludDpkaXNhYmxlXFxuJyArXG4gIGBpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9obXInO1xcbiR7bWFpbn1gO1xuICBjb25zdCBxdWVyeSA9IG5ldyBUc0FzdFNlbGVjdG9yKG1haW5IbXIsICdtYWluLWhtci50cycpO1xuICAvLyBxdWVyeS5wcmludEFsbCgpO1xuXG4gIGxldCBib290Q2FsbEFzdDogdHMuTm9kZTtcbiAgY29uc3Qgc3RhdGVtZW50ID0gcXVlcnkuc3JjLnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZS1sZW5ndGhcbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRXaXRoKHN0YXRlbWVudCwgJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICBpZiAoYm9vdENhbGwpIHtcbiAgICAgIGJvb3RDYWxsQXN0ID0gYm9vdENhbGw7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBpZiAoc3RhdGVtZW50ID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21haW5GaWxlfSxgICtcbiAgICBgY2FuIG5vdCBmaW5kIHN0YXRlbWVudCBsaWtlOiBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcXG4ke21haW5IbXJ9YCk7XG5cbiAgbWFpbkhtciA9IHJlcGxhY2VDb2RlKG1haW5IbXIsIFt7XG4gICAgc3RhcnQ6IHN0YXRlbWVudC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpLFxuICAgIGVuZDogc3RhdGVtZW50LmdldEVuZCgpLFxuICAgIHRleHQ6ICcnfV0pO1xuICBtYWluSG1yICs9IGBjb25zdCBib290c3RyYXAgPSAoKSA9PiAke2Jvb3RDYWxsQXN0IS5nZXRUZXh0KCl9O1xcbmA7XG4gIG1haW5IbXIgKz0gYGlmIChtb2R1bGVbICdob3QnIF0pIHtcblx0ICAgIGhtckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuXHQgICAgY29uc29sZS5sb2coJ0FyZSB5b3UgdXNpbmcgdGhlIC0taG1yIGZsYWcgZm9yIG5nIHNlcnZlPycpO1xuXHQgIH1cXG5gLnJlcGxhY2UoL15cXHQvZ20sICcnKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKHdyaXRlVG8sIG1haW5IbXIpO1xuICBsb2cuaW5mbygnV3JpdGUgJyArIHdyaXRlVG8pO1xuICBsb2cuaW5mbyhtYWluSG1yKTtcbiAgcmV0dXJuIHdyaXRlVG87XG59XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpIHtcbiAgY29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG4gIGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cbiAgc3lzLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVzOiBzdHJpbmcgPSBvbGRSZWFkRmlsZS5hcHBseShzeXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcbiAgICAgIC8vIEFuZ3VsYXIgc29tZWhvdyByZWFkcyB0c2NvbmZpZy5qc29uIHR3aWNlIGFuZCBwYXNzZXMgaW4gYHBhdGhgXG4gICAgICAvLyB3aXRoIGRpZmZlcmVudCBwYXRoIHNlcGVyYXRvciBgXFxgIGFuZCBgL2AgaW4gV2luZG93cyBcbiAgICAgIC8vIGBjYWNoZWRUc0NvbmZpZ0ZvcmAgaXMgbG9kYXNoIG1lbW9pemUgZnVuY3Rpb24gd2hpY2ggbmVlZHMgYVxuICAgICAgLy8gY29uc2lzdGVudCBgcGF0aGAgdmFsdWUgYXMgY2FjaGUga2V5XG4gICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgUGF0aC5zZXApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgaWYgKHBhdGggPT09IHRzQ29uZmlnRmlsZSlcbiAgICAgICAgcmV0dXJuIGNhY2hlZFRzQ29uZmlnRm9yKHBhdGgsIHJlcywgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUocGspO1xuICAgIH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY2xpIHdpbGwgcmVhZCB0c2NvbmZpZy5qc29uIHR3aWNlIGR1ZSB0byBzb21lIGp1bmsgY29kZSwgXG4gKiBsZXQncyBtZW1vaXplIHRoZSByZXN1bHQgYnkgZmlsZSBwYXRoIGFzIGNhY2hlIGtleS5cbiAqL1xuY29uc3QgY2FjaGVkVHNDb25maWdGb3IgPSBfLm1lbW9pemUob3ZlcnJpZGVUc0NvbmZpZyk7XG4vKipcbiAqIExldCdzIG92ZXJyaWRlIHRzY29uZmlnLmpzb24gZmlsZXMgZm9yIEFuZ3VsYXIgYXQgcnV0aW1lIDopXG4gKiAtIFJlYWQgaW50byBtZW1vcnlcbiAqIC0gRG8gbm90IG92ZXJyaWRlIHByb3BlcnRpZXMgb2YgY29tcGlsZXJPcHRpb25zLGFuZ3VsYXJDb21waWxlck9wdGlvbnMgdGhhdCBleGlzdHMgaW4gY3VycmVudCBmaWxlXG4gKiAtIFwiZXh0ZW5kc1wiIG11c3QgYmUgLi4uXG4gKiAtIFRyYXZlcnNlIHBhY2thZ2VzIHRvIGJ1aWxkIHByb3BlciBpbmNsdWRlcyBhbmQgZXhjbHVkZXMgbGlzdCBhbmQgLi4uXG4gKiAtIEZpbmQgZmlsZSB3aGVyZSBBcHBNb2R1bGUgaXMgaW4sIGZpbmQgaXRzIHBhY2thZ2UsIG1vdmUgaXRzIGRpcmVjdG9yeSB0byB0b3Agb2YgaW5jbHVkZXMgbGlzdCxcbiAqIFx0d2hpY2ggZml4ZXMgbmcgY2xpIHdpbmRvd3MgYnVnXG4gKi9cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyk6IHN0cmluZyB7XG5cbiAgY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuICBjb25zdCBvbGRKc29uID0gY2pzb24ucGFyc2UoY29udGVudCk7XG4gIGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSB8IHVuZGVmaW5lZCA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIG51bGwsIHBhY2thZ2VVdGlscywgdHJ1ZSk7XG4gIC8vIHZhciBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXSA9IGNvbmZpZygpLnBhY2thZ2VTY29wZXM7XG4gIC8vIHZhciBjb21wb25lbnRzID0gcGtJbmZvLm1vZHVsZU1hcDtcblxuICB0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG4gIGxldCBuZ1BhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VzID0gcGtJbmZvLmFsbE1vZHVsZXM7XG5cbiAgLy8gY29uc3QgZXhjbHVkZVBrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGV4Y2x1ZGVQYWNrYWdlOiBEcmNwU2V0dGluZ1snZXhjbHVkZVBhY2thZ2UnXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGFja2FnZScpIHx8IFtdO1xuICBsZXQgZXhjbHVkZVBhdGg6IHN0cmluZ1tdID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYXRoJykgfHwgW107XG5cbiAgbmdQYWNrYWdlcyA9IG5nUGFja2FnZXMuZmlsdGVyKGNvbXAgPT5cbiAgICAhZXhjbHVkZVBhY2thZ2Uuc29tZShyZWcgPT4gXy5pc1N0cmluZyhyZWcpID8gY29tcC5sb25nTmFtZS5pbmNsdWRlcyhyZWcpIDogcmVnLnRlc3QoY29tcC5sb25nTmFtZSkpICYmXG4gICAgKGNvbXAuZHIgJiYgY29tcC5kci5hbmd1bGFyQ29tcGlsZXIgfHwgY29tcC5wYXJzZWROYW1lLnNjb3BlID09PSAnYmsnIHx8XG4gICAgICBoYXNJc29tb3JwaGljRGlyKGNvbXAuanNvbiwgY29tcC5wYWNrYWdlUGF0aCkpKTtcblxuICBjb25zdCB0c0luY2x1ZGU6IHN0cmluZ1tdID0gb2xkSnNvbi5pbmNsdWRlIHx8IFtdO1xuICBjb25zdCB0c0V4Y2x1ZGU6IHN0cmluZ1tdID0gb2xkSnNvbi5leGNsdWRlIHx8IFtdO1xuICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcbiAgaWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cbiAgLy8gbGV0IGhhc0FwcFBhY2thZ2UgPSBmYWxzZTtcbiAgbmdQYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcbiAgICAvLyBUT0RPOiBkb2MgZm9yIGRyLm5nQXBwTW9kdWxlXG4gICAgY29uc3QgaXNOZ0FwcE1vZHVsZTogYm9vbGVhbiA9IHBrLmxvbmdOYW1lID09PSBhcHBQYWNrYWdlSnNvbi5uYW1lO1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLFxuICAgICAgaXNOZ0FwcE1vZHVsZSA/IHBrLnJlYWxQYWNrYWdlUGF0aCA6IChwcmVzZXJ2ZVN5bWxpbmtzPyBway5wYWNrYWdlUGF0aCA6IHBrLnJlYWxQYWNrYWdlUGF0aCkpXG4gICAgICAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmIChpc05nQXBwTW9kdWxlKSB7XG4gICAgICAvLyBoYXNBcHBQYWNrYWdlID0gdHJ1ZTtcbiAgICAgIHRzSW5jbHVkZS51bnNoaWZ0KGRpciArICcvKiovKi50cycpO1xuICAgICAgLy8gZW50cnkgcGFja2FnZSBtdXN0IGJlIGF0IGZpcnN0IG9mIFRTIGluY2x1ZGUgbGlzdCwgb3RoZXJ3aXNlIHdpbGwgZW5jb3VudGVyOlxuICAgICAgLy8gXCJFcnJvcjogTm8gTmdNb2R1bGUgbWV0YWRhdGEgZm91bmQgZm9yICdBcHBNb2R1bGUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRzSW5jbHVkZS5wdXNoKGRpciArICcvKiovKi50cycpO1xuICAgIH1cbiAgICB0c0V4Y2x1ZGUucHVzaChkaXIgKyAnL3RzJyxcbiAgICAgIGRpciArICcvc3BlYycsXG4gICAgICBkaXIgKyAnL2Rpc3QnLFxuICAgICAgZGlyICsgJy8qKi8qLnNwZWMudHMnKTtcblxuICAgIGlmICghcHJlc2VydmVTeW1saW5rcykge1xuICAgICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgcGsucmVhbFBhY2thZ2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBwYXRoTWFwcGluZyFbcGsubG9uZ05hbWVdID0gW3JlYWxEaXJdO1xuICAgICAgcGF0aE1hcHBpbmchW3BrLmxvbmdOYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cbiAgfSk7XG4gIC8vIGlmICghaGFzQXBwUGFja2FnZSkge1xuICAvLyBcdHRzSW5jbHVkZS51bnNoaWZ0KFBhdGguZGlybmFtZShicm93c2VyT3B0aW9ucy5tYWluKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyoqLyoudHMnKTtcbiAgLy8gfVxuICB0c0luY2x1ZGUucHVzaChQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgcHJlc2VydmVTeW1saW5rcyA/XG4gICAgICAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnIDpcbiAgICAgIGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnKSlcbiAgICAucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgdHNFeGNsdWRlLnB1c2goJyoqL3Rlc3QudHMnKTtcblxuICBleGNsdWRlUGF0aCA9IGV4Y2x1ZGVQYXRoLm1hcChleHBhdGggPT5cbiAgICBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgZXhwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICBleGNsdWRlUGF0aC5wdXNoKCcqKi8qLmQudHMnKTtcbiAgY29uc29sZS5sb2coZXhjbHVkZVBhdGgpO1xuICB0c0V4Y2x1ZGUucHVzaCguLi5leGNsdWRlUGF0aCk7XG5cbiAgLy8gSW1wb3J0YW50ISB0byBtYWtlIEFuZ3VsYXIgJiBUeXBlc2NyaXB0IHJlc29sdmUgY29ycmVjdCByZWFsIHBhdGggb2Ygc3ltbGluayBsYXp5IHJvdXRlIG1vZHVsZVxuICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICBjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nIVsnZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmchWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgICBwYXRoTWFwcGluZyFbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonXG4gICAgICAsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXG4gICAgXTtcbiAgfVxuXG4gIHZhciB0c2pzb246IHtjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgW2tleTogc3RyaW5nXTogYW55fSA9IHtcbiAgICAvLyBleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG4gICAgaW5jbHVkZTogdHNJbmNsdWRlLFxuICAgIGV4Y2x1ZGU6IHRzRXhjbHVkZSxcbiAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC4uLnJlcXVpcmUoJy4uLy4uL21pc2MvdHNjb25maWcuYXBwLmpzb24nKS5jb21waWxlck9wdGlvbnMsXG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgc3RyaWN0TnVsbENoZWNrczogZmFsc2UsXG4gICAgICB0eXBlUm9vdHM6IFtcbiAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpXG4gICAgICAgIC8vIEJlbG93IGlzIE5vZGVKUyBvbmx5LCB3aGljaCB3aWxsIGJyZWFrIEFuZ3VsYXIgSXZ5IGVuZ2luZVxuICAgICAgICAvLyBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3R5cGVzJylcbiAgICAgIF0sXG4gICAgICAvLyBtb2R1bGU6ICdlc25leHQnLFxuICAgICAgcHJlc2VydmVTeW1saW5rcyxcbiAgICAgIHBhdGhzOiBwYXRoTWFwcGluZ1xuICAgIH0sXG4gICAgYW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLy8gdHJhY2U6IHRydWVcbiAgICB9XG4gIH07XG4gIGlmIChvbGRKc29uLmV4dGVuZHMpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IG9sZEpzb24uZXh0ZW5kcztcbiAgfVxuICBPYmplY3QuYXNzaWduKHRzanNvbi5jb21waWxlck9wdGlvbnMsIG9sZEpzb24uY29tcGlsZXJPcHRpb25zKTtcbiAgT2JqZWN0LmFzc2lnbih0c2pzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zKTtcbiAgLy8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gIGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGhhc0lzb21vcnBoaWNEaXIocGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgZnVsbFBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGdldFRzRGlyc09mUGFja2FnZShwa0pzb24pLmlzb21EaXIpO1xuICB0cnkge1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhmdWxsUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19
