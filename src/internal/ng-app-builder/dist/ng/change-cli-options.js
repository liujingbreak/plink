"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable no-console */
const architect_1 = require("@angular-devkit/architect");
const utils_1 = require("dr-comp-package/wfh/dist/utils");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
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
    // const cached = new Map<string, any>();
    context.getTargetOptions = function (target) {
        return tslib_1.__awaiter(this, arguments, void 0, function* () {
            // if (cached.has(target.project + '.' + target.target)) {
            // 	return cached.get(target.project + '.' + target.target);
            // }
            if (target.target === targetName) {
                return replacedOpts;
            }
            const origOption = yield getTargetOptions.apply(context, arguments);
            // cached.set(target.project + '.' + target.target, origOption);
            return origOption;
        });
    };
}
/**
 * For build (ng build)
 * @param config
 * @param browserOptions
 */
function changeAngularCliOptionsForBuild(config, browserOptions) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        return processBrowserBuiliderOptions(config, browserOptions);
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
        const browserOptions = yield processBrowserBuiliderOptions(config, rawBrowserOptions, builderConfig, true);
        hackAngularBuilderContext(context, 'build', browserOptions);
        return browserOptions;
    });
}
exports.changeAngularCliOptions = changeAngularCliOptions;
function processBrowserBuiliderOptions(config, rawBrowserOptions, builderConfig, hmr = false) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
                return handler.angularJson(browserOptions, builderConfig);
            else
                return obj;
        });
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
        if (hmr && builderConfig) {
            builderConfig.hmr = true;
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
        compilerOptions: Object.assign({}, require('../../misc/tsconfig.app.json').compilerOptions, { baseUrl: root, typeRoots: [
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0IsMkNBQWlDO0FBRWpDLGdFQUFzRTtBQUN0RSw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUF3QztBQUN4QyxvRUFBNEI7QUFFNUIsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUN6RSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQztBQUNoRixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDM0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQVl0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDN0UsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQseUNBQXlDO0lBQ3pDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3ZELDBEQUEwRDtZQUMxRCw0REFBNEQ7WUFDNUQsSUFBSTtZQUNKLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2pDLE9BQU8sWUFBWSxDQUFDO2FBQ3BCO1lBQ0QsTUFBTSxVQUFV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RSxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7SUFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDN0Usa0dBQWtHO0lBQ2xHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUM1RCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFXLEVBQUUsV0FBbUI7SUFDekQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsMEJBQWtCLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0UsSUFBSTtRQUNILE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztLQUMzQztJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1gsT0FBTyxLQUFLLENBQUM7S0FDYjtBQUNGLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHsgQnVpbGRlckNvbnRleHQsIFRhcmdldCwgdGFyZ2V0RnJvbVRhcmdldFN0cmluZyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgRGV2U2VydmVyQnVpbGRlck9wdGlvbnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgeyBTY2hlbWEgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgUGFja2FnZUluZm8gfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cyc7XG5pbXBvcnQgeyBDb25maWdIYW5kbGVyLCBEcmNwQ29uZmlnIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7IGdldFRzRGlyc09mUGFja2FnZSB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgc3lzIH0gZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBEcmNwU2V0dGluZyB9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQgcmVwbGFjZUNvZGUgZnJvbSAnLi4vdXRpbHMvcGF0Y2gtdGV4dCc7XG5pbXBvcnQgVHNBc3RTZWxlY3RvciBmcm9tICcuLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IGFwaVNldHVwIGZyb20gJy4vaW5qZWN0b3Itc2V0dXAnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qge3dhbGtQYWNrYWdlc30gPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cycpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBjanNvbiA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcblx0LyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cblx0YW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuXHRcdGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcblx0OiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuXHRyZXBsYWNlZE9wdHM6IGFueSkge1xuXHRjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG5cdC8vIGNvbnN0IGNhY2hlZCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG5cdGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG5cdFx0Ly8gaWYgKGNhY2hlZC5oYXModGFyZ2V0LnByb2plY3QgKyAnLicgKyB0YXJnZXQudGFyZ2V0KSkge1xuXHRcdC8vIFx0cmV0dXJuIGNhY2hlZC5nZXQodGFyZ2V0LnByb2plY3QgKyAnLicgKyB0YXJnZXQudGFyZ2V0KTtcblx0XHQvLyB9XG5cdFx0aWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcblx0XHRcdHJldHVybiByZXBsYWNlZE9wdHM7XG5cdFx0fVxuXHRcdGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG5cdFx0Ly8gY2FjaGVkLnNldCh0YXJnZXQucHJvamVjdCArICcuJyArIHRhcmdldC50YXJnZXQsIG9yaWdPcHRpb24pO1xuXHRcdHJldHVybiBvcmlnT3B0aW9uO1xuXHR9O1xufVxuLyoqXG4gKiBGb3IgYnVpbGQgKG5nIGJ1aWxkKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnOiBEcmNwQ29uZmlnLFxuXHRicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuXHRyZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucyk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG5cdGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuXHRidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpIHtcblxuXHRjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhidWlsZGVyQ29uZmlnIS5icm93c2VyVGFyZ2V0KTtcblx0Y29uc3QgcmF3QnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMoYnJvd3NlclRhcmdldCk7XG5cdGNvbnN0IGJyb3dzZXJPcHRpb25zID0gYXdhaXQgcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG5cdFx0Y29uZmlnLCByYXdCcm93c2VyT3B0aW9ucyBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuXHRoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcblx0cmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsIHJhd0Jyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSxcblx0YnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBobXIgPSBmYWxzZSkge1xuXHRjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcblx0Zm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcblx0XHRjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuXHRcdGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHQocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuXHRcdFx0Y29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcblx0XHR9XG5cdH1cblx0YXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcblx0XHRpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcblx0XHRcdHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBidWlsZGVyQ29uZmlnKTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHR9KTtcblxuXHRjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcblx0aWYgKHBrSnNvbikge1xuXHRcdGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcblx0XHRjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTtcblx0fVxuXHQvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG5cdGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG5cdGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG5cdFx0Y29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG5cdGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuXHRcdGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG5cdGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcblx0aWYgKGhtciAmJiBidWlsZGVyQ29uZmlnKSB7XG5cdFx0YnVpbGRlckNvbmZpZy5obXIgPSB0cnVlO1xuXHRcdGlmICghYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cylcblx0XHRcdGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMgPSBbXTtcblx0XHRicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLnB1c2goe1xuXHRcdFx0cmVwbGFjZTogYnJvd3Nlck9wdGlvbnMubWFpbixcblx0XHRcdHdpdGg6IFBhdGgucmVsYXRpdmUoJy4nLCBtYWluSG1yKVxuXHRcdH0pO1xuXHR9XG5cdGlmIChicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9PSBudWxsKSB7XG5cdFx0YnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPSB7fTtcblx0fVxuXG5cdGJyb3dzZXJPcHRpb25zLmNvbW1vbkNodW5rID0gZmFsc2U7XG5cdGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnKTtcblx0YXdhaXQgYXBpU2V0dXAoYnJvd3Nlck9wdGlvbnMpO1xuXHRyZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1haW5GaWxlRm9ySG1yKG1haW5GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUobWFpbkZpbGUpO1xuXHRjb25zdCB3cml0ZVRvID0gUGF0aC5yZXNvbHZlKGRpciwgJ21haW4taG1yLnRzJyk7XG5cdGlmIChmcy5leGlzdHNTeW5jKHdyaXRlVG8pKSB7XG5cdFx0cmV0dXJuIHdyaXRlVG87XG5cdH1cblx0Y29uc3QgbWFpbiA9IGZzLnJlYWRGaWxlU3luYyhtYWluRmlsZSwgJ3V0ZjgnKTtcblx0bGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcblx0YGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWlufWA7XG5cdGNvbnN0IHF1ZXJ5ID0gbmV3IFRzQXN0U2VsZWN0b3IobWFpbkhtciwgJ21haW4taG1yLnRzJyk7XG5cdC8vIHF1ZXJ5LnByaW50QWxsKCk7XG5cblx0bGV0IGJvb3RDYWxsQXN0OiB0cy5Ob2RlO1xuXHRjb25zdCBzdGF0ZW1lbnQgPSBxdWVyeS5zcmMuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB7XG5cdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lLWxlbmd0aFxuXHRcdGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZFdpdGgoc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG5cdFx0XHQoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG5cdFx0XHRcdGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG5cdFx0XHRcdChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuXHRcdFx0XHRhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuXHRcdFx0XHRcdHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdGlmIChib290Q2FsbCkge1xuXHRcdFx0Ym9vdENhbGxBc3QgPSBib290Q2FsbDtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pO1xuXG5cdGlmIChzdGF0ZW1lbnQgPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoYCR7bWFpbkZpbGV9LGAgK1xuXHRcdGBjYW4gbm90IGZpbmQgc3RhdGVtZW50IGxpa2U6IHBsYXRmb3JtQnJvd3NlckR5bmFtaWMoKS5ib290c3RyYXBNb2R1bGUoQXBwTW9kdWxlKVxcbiR7bWFpbkhtcn1gKTtcblxuXHRtYWluSG1yID0gcmVwbGFjZUNvZGUobWFpbkhtciwgW3tcblx0XHRzdGFydDogc3RhdGVtZW50LmdldFN0YXJ0KHF1ZXJ5LnNyYywgdHJ1ZSksXG5cdFx0ZW5kOiBzdGF0ZW1lbnQuZ2V0RW5kKCksXG5cdFx0dGV4dDogJyd9XSk7XG5cdG1haW5IbXIgKz0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QhLmdldFRleHQoKX07XFxuYDtcblx0bWFpbkhtciArPSBgaWYgKG1vZHVsZVsgJ2hvdCcgXSkge1xuXHQgICAgaG1yQm9vdHN0cmFwKG1vZHVsZSwgYm9vdHN0cmFwKTtcblx0ICB9IGVsc2Uge1xuXHQgICAgY29uc29sZS5lcnJvcignSE1SIGlzIG5vdCBlbmFibGVkIGZvciB3ZWJwYWNrLWRldi1zZXJ2ZXIhJyk7XG5cdCAgICBjb25zb2xlLmxvZygnQXJlIHlvdSB1c2luZyB0aGUgLS1obXIgZmxhZyBmb3Igbmcgc2VydmU/Jyk7XG5cdCAgfVxcbmAucmVwbGFjZSgvXlxcdC9nbSwgJycpO1xuXG5cdGZzLndyaXRlRmlsZVN5bmMod3JpdGVUbywgbWFpbkhtcik7XG5cdGxvZy5pbmZvKCdXcml0ZSAnICsgd3JpdGVUbyk7XG5cdGxvZy5pbmZvKG1haW5IbXIpO1xuXHRyZXR1cm4gd3JpdGVUbztcbn1cblxuLy8gSGFjayB0cy5zeXMsIHNvIGZhciBpdCBpcyB1c2VkIHRvIHJlYWQgdHNjb25maWcuanNvblxuZnVuY3Rpb24gaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZykge1xuXHRjb25zdCBvbGRSZWFkRmlsZSA9IHN5cy5yZWFkRmlsZTtcblx0Y29uc3QgdHNDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLnRzQ29uZmlnKTtcblxuXHRzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcblx0XHRjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcblx0XHRpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuXHRcdFx0Ly8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcblx0XHRcdC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuXHRcdFx0Ly8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG5cdFx0XHQvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcblx0XHRcdHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG5cdFx0fVxuXHRcdHRyeSB7XG5cdFx0XHRpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuXHRcdFx0XHRyZXR1cm4gY2FjaGVkVHNDb25maWdGb3IocGF0aCwgcmVzLCBicm93c2VyT3B0aW9ucywgY29uZmlnKTtcblx0XHRcdGVsc2Vcblx0XHRcdFx0cmV0dXJuIHJlcztcblx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdGNvbnNvbGUuZXJyb3IocmVkKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBSZWFkICR7cGF0aH1gLCBlcnIpO1xuXHRcdH1cblx0XHRyZXR1cm4gJyc7XG5cdH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG5cdHdoaWxlICh0cnVlKSB7XG5cdFx0Y29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG5cdFx0XHRyZXR1cm4gcmVxdWlyZShwayk7XG5cdFx0fSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0bG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQW5ndWxhciBjbGkgd2lsbCByZWFkIHRzY29uZmlnLmpzb24gdHdpY2UgZHVlIHRvIHNvbWUganVuayBjb2RlLCBcbiAqIGxldCdzIG1lbW9pemUgdGhlIHJlc3VsdCBieSBmaWxlIHBhdGggYXMgY2FjaGUga2V5LlxuICovXG5jb25zdCBjYWNoZWRUc0NvbmZpZ0ZvciA9IF8ubWVtb2l6ZShvdmVycmlkZVRzQ29uZmlnKTtcbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyxcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKTogc3RyaW5nIHtcblxuXHRjb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5cdGNvbnN0IG9sZEpzb24gPSBjanNvbi5wYXJzZShjb250ZW50KTtcblx0Y29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG5cdGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119IHwgdW5kZWZpbmVkID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuXHRjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgbnVsbCwgcGFja2FnZVV0aWxzLCB0cnVlKTtcblx0Ly8gdmFyIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdID0gY29uZmlnKCkucGFja2FnZVNjb3Blcztcblx0Ly8gdmFyIGNvbXBvbmVudHMgPSBwa0luZm8ubW9kdWxlTWFwO1xuXG5cdHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcblx0bGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuXHQvLyBjb25zdCBleGNsdWRlUGtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Y29uc3QgZXhjbHVkZVBhY2thZ2U6IERyY3BTZXR0aW5nWydleGNsdWRlUGFja2FnZSddID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYWNrYWdlJykgfHwgW107XG5cdGxldCBleGNsdWRlUGF0aDogc3RyaW5nW10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhdGgnKSB8fCBbXTtcblxuXHRuZ1BhY2thZ2VzID0gbmdQYWNrYWdlcy5maWx0ZXIoY29tcCA9PlxuXHRcdCFleGNsdWRlUGFja2FnZS5zb21lKHJlZyA9PiBfLmlzU3RyaW5nKHJlZykgPyBjb21wLmxvbmdOYW1lLmluY2x1ZGVzKHJlZykgOiByZWcudGVzdChjb21wLmxvbmdOYW1lKSkgJiZcblx0XHQoY29tcC5kciAmJiBjb21wLmRyLmFuZ3VsYXJDb21waWxlciB8fCBjb21wLnBhcnNlZE5hbWUuc2NvcGUgPT09ICdiaycgfHxcblx0XHRcdGhhc0lzb21vcnBoaWNEaXIoY29tcC5qc29uLCBjb21wLnBhY2thZ2VQYXRoKSkpO1xuXG5cdGNvbnN0IHRzSW5jbHVkZTogc3RyaW5nW10gPSBvbGRKc29uLmluY2x1ZGUgfHwgW107XG5cdGNvbnN0IHRzRXhjbHVkZTogc3RyaW5nW10gPSBvbGRKc29uLmV4Y2x1ZGUgfHwgW107XG5cdGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG5cdGNvbnN0IGFwcFBhY2thZ2VKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKGFwcE1vZHVsZUZpbGUpO1xuXHRpZiAoYXBwUGFja2FnZUpzb24gPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yLCBjYW4gbm90IGZpbmQgcGFja2FnZS5qc29uIG9mICcgKyBhcHBNb2R1bGVGaWxlKTtcblxuXHQvLyBsZXQgaGFzQXBwUGFja2FnZSA9IGZhbHNlO1xuXHRuZ1BhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuXHRcdC8vIFRPRE86IGRvYyBmb3IgZHIubmdBcHBNb2R1bGVcblx0XHRjb25zdCBpc05nQXBwTW9kdWxlOiBib29sZWFuID0gcGsubG9uZ05hbWUgPT09IGFwcFBhY2thZ2VKc29uLm5hbWU7XG5cdFx0Y29uc3QgZGlyID0gUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksXG5cdFx0XHRpc05nQXBwTW9kdWxlID8gcGsucmVhbFBhY2thZ2VQYXRoIDogKHByZXNlcnZlU3ltbGlua3M/IHBrLnBhY2thZ2VQYXRoIDogcGsucmVhbFBhY2thZ2VQYXRoKSlcblx0XHRcdC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0aWYgKGlzTmdBcHBNb2R1bGUpIHtcblx0XHRcdC8vIGhhc0FwcFBhY2thZ2UgPSB0cnVlO1xuXHRcdFx0dHNJbmNsdWRlLnVuc2hpZnQoZGlyICsgJy8qKi8qLnRzJyk7XG5cdFx0XHQvLyBlbnRyeSBwYWNrYWdlIG11c3QgYmUgYXQgZmlyc3Qgb2YgVFMgaW5jbHVkZSBsaXN0LCBvdGhlcndpc2Ugd2lsbCBlbmNvdW50ZXI6XG5cdFx0XHQvLyBcIkVycm9yOiBObyBOZ01vZHVsZSBtZXRhZGF0YSBmb3VuZCBmb3IgJ0FwcE1vZHVsZSdcblx0XHR9IGVsc2Uge1xuXHRcdFx0dHNJbmNsdWRlLnB1c2goZGlyICsgJy8qKi8qLnRzJyk7XG5cdFx0fVxuXHRcdHRzRXhjbHVkZS5wdXNoKGRpciArICcvdHMnLFxuXHRcdFx0ZGlyICsgJy9zcGVjJyxcblx0XHRcdGRpciArICcvZGlzdCcsXG5cdFx0XHRkaXIgKyAnLyoqLyouc3BlYy50cycpO1xuXG5cdFx0aWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdFx0XHRjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBway5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdHBhdGhNYXBwaW5nIVtway5sb25nTmFtZV0gPSBbcmVhbERpcl07XG5cdFx0XHRwYXRoTWFwcGluZyFbcGsubG9uZ05hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG5cdFx0fVxuXHR9KTtcblx0Ly8gaWYgKCFoYXNBcHBQYWNrYWdlKSB7XG5cdC8vIFx0dHNJbmNsdWRlLnVuc2hpZnQoUGF0aC5kaXJuYW1lKGJyb3dzZXJPcHRpb25zLm1haW4pLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvKiovKi50cycpO1xuXHQvLyB9XG5cdHRzSW5jbHVkZS5wdXNoKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBwcmVzZXJ2ZVN5bWxpbmtzID9cblx0XHRcdCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScgOlxuXHRcdFx0ZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScpKVxuXHRcdC5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuXHR0c0V4Y2x1ZGUucHVzaCgnKiovdGVzdC50cycpO1xuXG5cdGV4Y2x1ZGVQYXRoID0gZXhjbHVkZVBhdGgubWFwKGV4cGF0aCA9PlxuXHRcdFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBleHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG5cdGNvbnNvbGUubG9nKGV4Y2x1ZGVQYXRoKTtcblx0dHNFeGNsdWRlLnB1c2goLi4uZXhjbHVkZVBhdGgpO1xuXG5cdC8vIEltcG9ydGFudCEgdG8gbWFrZSBBbmd1bGFyICYgVHlwZXNjcmlwdCByZXNvbHZlIGNvcnJlY3QgcmVhbCBwYXRoIG9mIHN5bWxpbmsgbGF6eSByb3V0ZSBtb2R1bGVcblx0aWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdFx0Y29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRwYXRoTWFwcGluZyFbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuXHRcdHBhdGhNYXBwaW5nIVsnZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG5cdFx0cGF0aE1hcHBpbmchWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJ1xuXHRcdFx0LCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ1xuXHRcdF07XG5cdH1cblxuXHR2YXIgdHNqc29uOiBhbnkgPSB7XG5cdFx0Ly8gZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuXHRcdGluY2x1ZGU6IHRzSW5jbHVkZSxcblx0XHRleGNsdWRlOiB0c0V4Y2x1ZGUsXG5cdFx0Y29tcGlsZXJPcHRpb25zOiB7XG5cdFx0XHQuLi5yZXF1aXJlKCcuLi8uLi9taXNjL3RzY29uZmlnLmFwcC5qc29uJykuY29tcGlsZXJPcHRpb25zLFxuXHRcdFx0YmFzZVVybDogcm9vdCxcblx0XHRcdHR5cGVSb290czogW1xuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93ZmgvdHlwZXMnKVxuXHRcdFx0XSxcblx0XHRcdC8vIG1vZHVsZTogJ2VzbmV4dCcsXG5cdFx0XHRwcmVzZXJ2ZVN5bWxpbmtzLFxuXHRcdFx0cGF0aHM6IHBhdGhNYXBwaW5nXG5cdFx0fSxcblx0XHRhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB7XG5cdFx0XHQvLyB0cmFjZTogdHJ1ZVxuXHRcdH1cblx0fTtcblx0aWYgKG9sZEpzb24uZXh0ZW5kcykge1xuXHRcdHRzanNvbi5leHRlbmRzID0gb2xkSnNvbi5leHRlbmRzO1xuXHR9XG5cdE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5jb21waWxlck9wdGlvbnMpO1xuXHRPYmplY3QuYXNzaWduKHRzanNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLCBvbGRKc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnMpO1xuXHQvLyBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgJHtmaWxlfTpcXG5gLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcblx0bG9nLmluZm8oYCR7ZmlsZX06XFxuJHtKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpfWApO1xuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKTtcbn1cblxuZnVuY3Rpb24gaGFzSXNvbW9ycGhpY0Rpcihwa0pzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuXHRjb25zdCBmdWxsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZ2V0VHNEaXJzT2ZQYWNrYWdlKHBrSnNvbikuaXNvbURpcik7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIGZzLnN0YXRTeW5jKGZ1bGxQYXRoKS5pc0RpcmVjdG9yeSgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9XG59XG4iXX0=
