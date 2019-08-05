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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0Isc0RBQXNCO0FBQ3RCLDJDQUFpQztBQUVqQyxnRUFBc0U7QUFDdEUsNkVBQThDO0FBQzlDLGlGQUFrRDtBQUVsRCw4RUFBd0M7QUFDeEMsb0VBQTRCO0FBSTVCLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFZdEYsU0FBUyx5QkFBeUIsQ0FBQyxPQUF1QixFQUFFLFVBQWtCLEVBQzVFLFlBQWlCO0lBQ2pCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWxELE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3RELElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLHVEQUF1RDtnQkFDdkQsT0FBTyxZQUFZLENBQUM7YUFDckI7WUFDRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGdCQUFnQixDQUFD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TUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO0tBQ2xDO0lBQ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM3RSxrR0FBa0c7SUFDbEcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE1BQVcsRUFBRSxXQUFtQjtJQUN4RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSwwQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvRSxJQUFJO1FBQ0YsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0tBQzVDO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0LCB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBQYWNrYWdlSW5mbyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJztcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXIsIERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERyY3BTZXR0aW5nIH0gZnJvbSAnLi4vY29uZmlndXJhYmxlJztcbmltcG9ydCB7IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4gfSBmcm9tICcuLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBUc0FzdFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgYXBpU2V0dXAgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQge3BhY2thZ2VBc3NldHNGb2xkZXJzfSBmcm9tICdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cyc7XG5cblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHt3YWxrUGFja2FnZXN9ID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgY2pzb24gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5leHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJDb25maWdIYW5kbGVyIGV4dGVuZHMgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBZb3UgbWF5IG92ZXJyaWRlIGFuZ3VsYXIuanNvbiBpbiB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBvcHRpb25zIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD4uYXJjaGl0ZWN0Ljxjb21tYW5kPi5vcHRpb25zXG5cdCAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD5cblx0ICovXG4gIGFuZ3VsYXJKc29uKG9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgICBidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpXG4gIDogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmZ1bmN0aW9uIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHRhcmdldE5hbWU6IHN0cmluZyxcbiAgcmVwbGFjZWRPcHRzOiBhbnkpIHtcbiAgY29uc3QgZ2V0VGFyZ2V0T3B0aW9ucyA9IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucztcblxuICBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMgPSBhc3luYyBmdW5jdGlvbih0YXJnZXQ6IFRhcmdldCkge1xuICAgIGlmICh0YXJnZXQudGFyZ2V0ID09PSB0YXJnZXROYW1lKSB7XG4gICAgICAvLyBsb2cuaW5mbygnQW5ndWxhciBjbGkgYnVpbGQgb3B0aW9ucycsIHJlcGxhY2VkT3B0cyk7XG4gICAgICByZXR1cm4gcmVwbGFjZWRPcHRzO1xuICAgIH1cbiAgICBjb25zdCBvcmlnT3B0aW9uID0gYXdhaXQgZ2V0VGFyZ2V0T3B0aW9ucy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBvcmlnT3B0aW9uO1xuICB9O1xufVxuLyoqXG4gKiBGb3IgYnVpbGQgKG5nIGJ1aWxkKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0KTogUHJvbWlzZTxBbmd1bGFyQnVpbGRlck9wdGlvbnM+IHtcbiAgcmV0dXJuIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMsIGNvbnRleHQpO1xufVxuXG4vKipcbiAqIEZvciBkZXYgc2VydmVyIChuZyBzZXJ2ZSlcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gY29udGV4dCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgYnVpbGRlckNvbmZpZzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpIHtcblxuICBjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhidWlsZGVyQ29uZmlnIS5icm93c2VyVGFyZ2V0KTtcbiAgY29uc3QgcmF3QnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMoYnJvd3NlclRhcmdldCkgYXMgYW55IGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hO1xuICBpZiAoIXJhd0Jyb3dzZXJPcHRpb25zLmRlcGxveVVybClcbiAgICByYXdCcm93c2VyT3B0aW9ucy5kZXBsb3lVcmwgPSAnLyc7XG5cbiAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcbiAgICBjb25maWcsIHJhd0Jyb3dzZXJPcHRpb25zLCBjb250ZXh0LCBidWlsZGVyQ29uZmlnLCB0cnVlKTtcbiAgaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0LCAnYnVpbGQnLCBicm93c2VyT3B0aW9ucyk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG4gIGNvbmZpZzogRHJjcENvbmZpZyxcbiAgcmF3QnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgZGV2U2VydmVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIGhtciA9IGZhbHNlKSB7XG5cbiAgY29udGV4dC5yZXBvcnRTdGF0dXMoJ0NoYW5nZSBidWlsZGVyIG9wdGlvbnMnKTtcbiAgY29uc3QgYnJvd3Nlck9wdGlvbnMgPSByYXdCcm93c2VyT3B0aW9ucyBhcyBBbmd1bGFyQnVpbGRlck9wdGlvbnM7XG4gIGZvciAoY29uc3QgcHJvcCBvZiBbJ2RlcGxveVVybCcsICdvdXRwdXRQYXRoJywgJ3N0eWxlcyddKSB7XG4gICAgY29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KFtjdXJyUGFja2FnZU5hbWUsIHByb3BdKTtcbiAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgKHJhd0Jyb3dzZXJPcHRpb25zIGFzIGFueSlbcHJvcF0gPSB2YWx1ZTtcbiAgICAgIGNvbnNvbGUubG9nKGN1cnJQYWNrYWdlTmFtZSArICcgLSBvdmVycmlkZSAlczogJXMnLCBwcm9wLCB2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgYXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcbiAgICBpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcbiAgICAgIHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBkZXZTZXJ2ZXJDb25maWcpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBvYmo7XG4gIH0pO1xuXG4gIGlmICghYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsKVxuICAgIGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCA9ICcvJztcbiAgLy8gaWYgc3RhdGljIGFzc2V0cydzIFVSTCBpcyBub3QgbGVkIGJ5ICcvJywgaXQgd2lsbCBiZSBjb25zaWRlcmVkIGFzIHJlbGF0aXZlIHBhdGggaW4gbmctaHRtbC1sb2FkZXJcblxuICBpZiAoZGV2U2VydmVyQ29uZmlnKSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gVXJsLnBhcnNlKGJyb3dzZXJPcHRpb25zLmRlcGxveVVybCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgaWYgKHBhcnNlZFVybC5ob3N0ID09IG51bGwpIHtcbiAgICAgIHBhcnNlZFVybC5ob3N0bmFtZSA9ICdsb2NhbGhvc3QnO1xuICAgICAgcGFyc2VkVXJsLnBvcnQgPSBkZXZTZXJ2ZXJDb25maWcucG9ydCArICcnO1xuICAgICAgcGFyc2VkVXJsLnByb3RvY29sID0gJ2h0dHAnO1xuICAgICAgcmF3QnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gVXJsLmZvcm1hdChwYXJzZWRVcmwpO1xuICAgIH1cbiAgICBkZXZTZXJ2ZXJDb25maWcuc2VydmVQYXRoID0gcGFyc2VkVXJsLnBhdGhuYW1lOyAvLyBJbiBjYXNlIGRlcGxveVVybCBoYXMgaG9zdCwgbmcgY2xpIHdpbGwgcmVwb3J0IGVycm9yIGZvciBudWxsIHNlcnZlUGF0aFxuICB9XG5cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpIHtcbiAgICBjb25zb2xlLmxvZyhicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKTtcbiAgICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHNcbiAgICAuZm9yRWFjaChmciA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhmcikuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlOiBzdHJpbmcgPSBmcltmaWVsZF07XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUodmFsdWUpKSB7XG4gICAgICAgICAgZnJbZmllbGRdID0gUGF0aC5yZWxhdGl2ZShjd2QsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgaWYgKHBrSnNvbikge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcbiAgICBjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTtcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG4gIGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcbiAgaWYgKGhtciAmJiBkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBkZXZTZXJ2ZXJDb25maWcuaG1yID0gdHJ1ZTtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG4gICAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICB3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcbiAgICB9KTtcbiAgfVxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuICAgIGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG4gIH1cblxuICBicm93c2VyT3B0aW9ucy5jb21tb25DaHVuayA9IGZhbHNlO1xuXG4gIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbiAgYXdhaXQgYXBpU2V0dXAoYnJvd3Nlck9wdGlvbnMpO1xuXG4gIGNvbnRleHQucmVwb3J0U3RhdHVzKCdzZXR0aW5nIHVwIGFzc2V0cyBvcHRpb25zJyk7XG4gIC8vIEJlY2F1c2UgZGV2LXNlcnZlLWFzc2V0cyBkZXBlbmRzIG9uIERSQ1AgYXBpLCBJIGhhdmUgdG8gbGF6eSBsb2FkIGl0LlxuICBjb25zdCBmb3JFYWNoQXNzZXRzRGlyOiB0eXBlb2YgcGFja2FnZUFzc2V0c0ZvbGRlcnMgPVxuICByZXF1aXJlKCdAZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLnBhY2thZ2VBc3NldHNGb2xkZXJzO1xuICBmb3JFYWNoQXNzZXRzRGlyKCcvJywgKGlucHV0RGlyLCBvdXRwdXREaXIpID0+IHtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmFzc2V0cykge1xuICAgICAgYnJvd3Nlck9wdGlvbnMuYXNzZXRzID0gW107XG4gICAgfVxuICAgIGxldCBpbnB1dCA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgaW5wdXREaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWlucHV0LnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgICAgaW5wdXQgPSAnLi8nICsgaW5wdXQ7XG4gICAgfVxuICAgIGJyb3dzZXJPcHRpb25zLmFzc2V0cyEucHVzaCh7XG4gICAgICBpbnB1dCxcbiAgICAgIGdsb2I6ICcqKi8qJyxcbiAgICAgIG91dHB1dDogb3V0cHV0RGlyLmVuZHNXaXRoKCcvJykgPyBvdXRwdXREaXIgOiBvdXRwdXREaXIgKyAnLydcbiAgICB9KTtcbiAgfSk7XG4gIGNvbnRleHQubG9nZ2VyLmluZm8oJ2Jyb3dzZXIgYnVpbGRlciBvcHRpb25zOicgKyBKU09OLnN0cmluZ2lmeShicm93c2VyT3B0aW9ucywgdW5kZWZpbmVkLCAnICAnKSk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuZnVuY3Rpb24gY3JlYXRlTWFpbkZpbGVGb3JIbXIobWFpbkZpbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShtYWluRmlsZSk7XG4gIGNvbnN0IHdyaXRlVG8gPSBQYXRoLnJlc29sdmUoZGlyLCAnbWFpbi1obXIudHMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMod3JpdGVUbykpIHtcbiAgICByZXR1cm4gd3JpdGVUbztcbiAgfVxuICBjb25zdCBtYWluID0gZnMucmVhZEZpbGVTeW5jKG1haW5GaWxlLCAndXRmOCcpO1xuICBsZXQgbWFpbkhtciA9ICcvLyB0c2xpbnQ6ZGlzYWJsZVxcbicgK1xuICBgaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tICdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvaG1yJztcXG4ke21haW59YDtcbiAgY29uc3QgcXVlcnkgPSBuZXcgVHNBc3RTZWxlY3RvcihtYWluSG1yLCAnbWFpbi1obXIudHMnKTtcbiAgLy8gcXVlcnkucHJpbnRBbGwoKTtcblxuICBsZXQgYm9vdENhbGxBc3Q6IHRzLk5vZGU7XG4gIGNvbnN0IHN0YXRlbWVudCA9IHF1ZXJ5LnNyYy5zdGF0ZW1lbnRzLmZpbmQoc3RhdGVtZW50ID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxpbmUtbGVuZ3RoXG4gICAgY29uc3QgYm9vdENhbGwgPSBxdWVyeS5maW5kV2l0aChzdGF0ZW1lbnQsICc6UHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uID4gLmV4cHJlc3Npb246Q2FsbEV4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpJZGVudGlmaWVyJyxcbiAgICAgIChhc3Q6IHRzLklkZW50aWZpZXIsIHBhdGgsIHBhcmVudHMpID0+IHtcbiAgICAgICAgaWYgKGFzdC50ZXh0ID09PSAncGxhdGZvcm1Ccm93c2VyRHluYW1pYycgJiZcbiAgICAgICAgKGFzdC5wYXJlbnQucGFyZW50IGFzIHRzLlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbikubmFtZS5nZXRUZXh0KHF1ZXJ5LnNyYykgPT09ICdib290c3RyYXBNb2R1bGUnICYmXG4gICAgICAgIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudC5raW5kID09PSB0cy5TeW50YXhLaW5kLkNhbGxFeHByZXNzaW9uKSB7XG4gICAgICAgICAgcmV0dXJuIGFzdC5wYXJlbnQucGFyZW50LnBhcmVudDtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgaWYgKGJvb3RDYWxsKSB7XG4gICAgICBib290Q2FsbEFzdCA9IGJvb3RDYWxsO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgaWYgKHN0YXRlbWVudCA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcihgJHttYWluRmlsZX0sYCArXG4gICAgYGNhbiBub3QgZmluZCBzdGF0ZW1lbnQgbGlrZTogcGxhdGZvcm1Ccm93c2VyRHluYW1pYygpLmJvb3RzdHJhcE1vZHVsZShBcHBNb2R1bGUpXFxuJHttYWluSG1yfWApO1xuXG4gIG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbe1xuICAgIHN0YXJ0OiBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKSxcbiAgICBlbmQ6IHN0YXRlbWVudC5nZXRFbmQoKSxcbiAgICB0ZXh0OiAnJ31dKTtcbiAgbWFpbkhtciArPSBgY29uc3QgYm9vdHN0cmFwID0gKCkgPT4gJHtib290Q2FsbEFzdCEuZ2V0VGV4dCgpfTtcXG5gO1xuICBtYWluSG1yICs9IGBpZiAobW9kdWxlWyAnaG90JyBdKSB7XG5cdCAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuXHQgIH0gZWxzZSB7XG5cdCAgICBjb25zb2xlLmVycm9yKCdITVIgaXMgbm90IGVuYWJsZWQgZm9yIHdlYnBhY2stZGV2LXNlcnZlciEnKTtcblx0ICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcblx0ICB9XFxuYC5yZXBsYWNlKC9eXFx0L2dtLCAnJyk7XG5cbiAgZnMud3JpdGVGaWxlU3luYyh3cml0ZVRvLCBtYWluSG1yKTtcbiAgbG9nLmluZm8oJ1dyaXRlICcgKyB3cml0ZVRvKTtcbiAgbG9nLmluZm8obWFpbkhtcik7XG4gIHJldHVybiB3cml0ZVRvO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5mdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKSB7XG4gIGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuICBjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG4gIHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuICAgIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG4gICAgICAvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuICAgICAgLy8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG4gICAgICAvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcbiAgICAgIC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuICAgICAgcGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG4gICAgICAgIHJldHVybiBjYWNoZWRUc0NvbmZpZ0ZvcihwYXRoLCByZXMsIGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuICAgICAgZWxzZVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG4gICAgfVxuICAgIHJldHVybiAnJztcbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNsaSB3aWxsIHJlYWQgdHNjb25maWcuanNvbiB0d2ljZSBkdWUgdG8gc29tZSBqdW5rIGNvZGUsIFxuICogbGV0J3MgbWVtb2l6ZSB0aGUgcmVzdWx0IGJ5IGZpbGUgcGF0aCBhcyBjYWNoZSBrZXkuXG4gKi9cbmNvbnN0IGNhY2hlZFRzQ29uZmlnRm9yID0gXy5tZW1vaXplKG92ZXJyaWRlVHNDb25maWcpO1xuLyoqXG4gKiBMZXQncyBvdmVycmlkZSB0c2NvbmZpZy5qc29uIGZpbGVzIGZvciBBbmd1bGFyIGF0IHJ1dGltZSA6KVxuICogLSBSZWFkIGludG8gbWVtb3J5XG4gKiAtIERvIG5vdCBvdmVycmlkZSBwcm9wZXJ0aWVzIG9mIGNvbXBpbGVyT3B0aW9ucyxhbmd1bGFyQ29tcGlsZXJPcHRpb25zIHRoYXQgZXhpc3RzIGluIGN1cnJlbnQgZmlsZVxuICogLSBcImV4dGVuZHNcIiBtdXN0IGJlIC4uLlxuICogLSBUcmF2ZXJzZSBwYWNrYWdlcyB0byBidWlsZCBwcm9wZXIgaW5jbHVkZXMgYW5kIGV4Y2x1ZGVzIGxpc3QgYW5kIC4uLlxuICogLSBGaW5kIGZpbGUgd2hlcmUgQXBwTW9kdWxlIGlzIGluLCBmaW5kIGl0cyBwYWNrYWdlLCBtb3ZlIGl0cyBkaXJlY3RvcnkgdG8gdG9wIG9mIGluY2x1ZGVzIGxpc3QsXG4gKiBcdHdoaWNoIGZpeGVzIG5nIGNsaSB3aW5kb3dzIGJ1Z1xuICovXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpOiBzdHJpbmcge1xuXG4gIGNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcbiAgY29uc3Qgb2xkSnNvbiA9IGNqc29uLnBhcnNlKGNvbnRlbnQpO1xuICBjb25zdCBwcmVzZXJ2ZVN5bWxpbmtzID0gYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcztcbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gfCB1bmRlZmluZWQgPSBwcmVzZXJ2ZVN5bWxpbmtzID8gdW5kZWZpbmVkIDoge307XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoY29uZmlnLCBudWxsLCBwYWNrYWdlVXRpbHMsIHRydWUpO1xuICAvLyB2YXIgcGFja2FnZVNjb3Blczogc3RyaW5nW10gPSBjb25maWcoKS5wYWNrYWdlU2NvcGVzO1xuICAvLyB2YXIgY29tcG9uZW50cyA9IHBrSW5mby5tb2R1bGVNYXA7XG5cbiAgdHlwZSBQYWNrYWdlSW5zdGFuY2VzID0gdHlwZW9mIHBrSW5mby5hbGxNb2R1bGVzO1xuICBsZXQgbmdQYWNrYWdlczogUGFja2FnZUluc3RhbmNlcyA9IHBrSW5mby5hbGxNb2R1bGVzO1xuXG4gIC8vIGNvbnN0IGV4Y2x1ZGVQa1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBleGNsdWRlUGFja2FnZTogRHJjcFNldHRpbmdbJ2V4Y2x1ZGVQYWNrYWdlJ10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhY2thZ2UnKSB8fCBbXTtcbiAgbGV0IGV4Y2x1ZGVQYXRoOiBzdHJpbmdbXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGF0aCcpIHx8IFtdO1xuXG4gIG5nUGFja2FnZXMgPSBuZ1BhY2thZ2VzLmZpbHRlcihjb21wID0+XG4gICAgIWV4Y2x1ZGVQYWNrYWdlLnNvbWUocmVnID0+IF8uaXNTdHJpbmcocmVnKSA/IGNvbXAubG9uZ05hbWUuaW5jbHVkZXMocmVnKSA6IHJlZy50ZXN0KGNvbXAubG9uZ05hbWUpKSAmJlxuICAgIChjb21wLmRyICYmIGNvbXAuZHIuYW5ndWxhckNvbXBpbGVyIHx8IGNvbXAucGFyc2VkTmFtZS5zY29wZSA9PT0gJ2JrJyB8fFxuICAgICAgaGFzSXNvbW9ycGhpY0Rpcihjb21wLmpzb24sIGNvbXAucGFja2FnZVBhdGgpKSk7XG5cbiAgY29uc3QgdHNJbmNsdWRlOiBzdHJpbmdbXSA9IG9sZEpzb24uaW5jbHVkZSB8fCBbXTtcbiAgY29uc3QgdHNFeGNsdWRlOiBzdHJpbmdbXSA9IG9sZEpzb24uZXhjbHVkZSB8fCBbXTtcbiAgY29uc3QgYXBwTW9kdWxlRmlsZSA9IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4oUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgY29uc3QgYXBwUGFja2FnZUpzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoYXBwTW9kdWxlRmlsZSk7XG4gIGlmIChhcHBQYWNrYWdlSnNvbiA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3IsIGNhbiBub3QgZmluZCBwYWNrYWdlLmpzb24gb2YgJyArIGFwcE1vZHVsZUZpbGUpO1xuXG4gIC8vIGxldCBoYXNBcHBQYWNrYWdlID0gZmFsc2U7XG4gIG5nUGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG4gICAgLy8gVE9ETzogZG9jIGZvciBkci5uZ0FwcE1vZHVsZVxuICAgIGNvbnN0IGlzTmdBcHBNb2R1bGU6IGJvb2xlYW4gPSBway5sb25nTmFtZSA9PT0gYXBwUGFja2FnZUpzb24ubmFtZTtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSxcbiAgICAgIGlzTmdBcHBNb2R1bGUgPyBway5yZWFsUGFja2FnZVBhdGggOiAocHJlc2VydmVTeW1saW5rcz8gcGsucGFja2FnZVBhdGggOiBway5yZWFsUGFja2FnZVBhdGgpKVxuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoaXNOZ0FwcE1vZHVsZSkge1xuICAgICAgLy8gaGFzQXBwUGFja2FnZSA9IHRydWU7XG4gICAgICB0c0luY2x1ZGUudW5zaGlmdChkaXIgKyAnLyoqLyoudHMnKTtcbiAgICAgIC8vIGVudHJ5IHBhY2thZ2UgbXVzdCBiZSBhdCBmaXJzdCBvZiBUUyBpbmNsdWRlIGxpc3QsIG90aGVyd2lzZSB3aWxsIGVuY291bnRlcjpcbiAgICAgIC8vIFwiRXJyb3I6IE5vIE5nTW9kdWxlIG1ldGFkYXRhIGZvdW5kIGZvciAnQXBwTW9kdWxlJ1xuICAgIH0gZWxzZSB7XG4gICAgICB0c0luY2x1ZGUucHVzaChkaXIgKyAnLyoqLyoudHMnKTtcbiAgICB9XG4gICAgdHNFeGNsdWRlLnB1c2goZGlyICsgJy90cycsXG4gICAgICBkaXIgKyAnL3NwZWMnLFxuICAgICAgZGlyICsgJy9kaXN0JyxcbiAgICAgIGRpciArICcvKiovKi5zcGVjLnRzJyk7XG5cbiAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIHBrLnJlYWxQYWNrYWdlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcGF0aE1hcHBpbmchW3BrLmxvbmdOYW1lXSA9IFtyZWFsRGlyXTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5sb25nTmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG4gIH0pO1xuICAvLyBpZiAoIWhhc0FwcFBhY2thZ2UpIHtcbiAgLy8gXHR0c0luY2x1ZGUudW5zaGlmdChQYXRoLmRpcm5hbWUoYnJvd3Nlck9wdGlvbnMubWFpbikucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qLnRzJyk7XG4gIC8vIH1cbiAgdHNJbmNsdWRlLnB1c2goUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIHByZXNlcnZlU3ltbGlua3MgP1xuICAgICAgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJyA6XG4gICAgICBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJykpXG4gICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIHRzRXhjbHVkZS5wdXNoKCcqKi90ZXN0LnRzJyk7XG5cbiAgZXhjbHVkZVBhdGggPSBleGNsdWRlUGF0aC5tYXAoZXhwYXRoID0+XG4gICAgUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGV4cGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgY29uc29sZS5sb2coZXhjbHVkZVBhdGgpO1xuICB0c0V4Y2x1ZGUucHVzaCguLi5leGNsdWRlUGF0aCk7XG5cbiAgLy8gSW1wb3J0YW50ISB0byBtYWtlIEFuZ3VsYXIgJiBUeXBlc2NyaXB0IHJlc29sdmUgY29ycmVjdCByZWFsIHBhdGggb2Ygc3ltbGluayBsYXp5IHJvdXRlIG1vZHVsZVxuICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICBjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nIVsnZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmchWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgICBwYXRoTWFwcGluZyFbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonXG4gICAgICAsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXG4gICAgXTtcbiAgfVxuXG4gIHZhciB0c2pzb246IHtjb21waWxlck9wdGlvbnM6IHRzLkNvbXBpbGVyT3B0aW9ucywgW2tleTogc3RyaW5nXTogYW55fSA9IHtcbiAgICAvLyBleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG4gICAgaW5jbHVkZTogdHNJbmNsdWRlLFxuICAgIGV4Y2x1ZGU6IHRzRXhjbHVkZSxcbiAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC4uLnJlcXVpcmUoJy4uLy4uL21pc2MvdHNjb25maWcuYXBwLmpzb24nKS5jb21waWxlck9wdGlvbnMsXG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgc3RyaWN0TnVsbENoZWNrczogZmFsc2UsXG4gICAgICB0eXBlUm9vdHM6IFtcbiAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpLFxuICAgICAgICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3R5cGVzJylcbiAgICAgIF0sXG4gICAgICAvLyBtb2R1bGU6ICdlc25leHQnLFxuICAgICAgcHJlc2VydmVTeW1saW5rcyxcbiAgICAgIHBhdGhzOiBwYXRoTWFwcGluZ1xuICAgIH0sXG4gICAgYW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLy8gdHJhY2U6IHRydWVcbiAgICB9XG4gIH07XG4gIGlmIChvbGRKc29uLmV4dGVuZHMpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IG9sZEpzb24uZXh0ZW5kcztcbiAgfVxuICBPYmplY3QuYXNzaWduKHRzanNvbi5jb21waWxlck9wdGlvbnMsIG9sZEpzb24uY29tcGlsZXJPcHRpb25zKTtcbiAgT2JqZWN0LmFzc2lnbih0c2pzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zKTtcbiAgLy8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gIGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGhhc0lzb21vcnBoaWNEaXIocGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgZnVsbFBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGdldFRzRGlyc09mUGFja2FnZShwa0pzb24pLmlzb21EaXIpO1xuICB0cnkge1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhmdWxsUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19
