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
const api_setup_1 = tslib_1.__importDefault(require("./api-setup"));
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
        if (hmr) {
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
        hackTsConfig(browserOptions, config);
        api_setup_1.default(browserOptions);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0IsMkNBQWlDO0FBRWpDLGdFQUFzRTtBQUN0RSw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELG9FQUFtQztBQUNuQyxvRUFBNEI7QUFFNUIsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUN6RSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQztBQUNoRixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDM0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQVl0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDN0UsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQseUNBQXlDO0lBQ3pDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3ZELDBEQUEwRDtZQUMxRCw0REFBNEQ7WUFDNUQsSUFBSTtZQUNKLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2pDLE9BQU8sWUFBWSxDQUFDO2FBQ3BCO1lBQ0QsTUFBTSxVQUFV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QUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE1BQVcsRUFBRSxXQUFtQjtJQUN6RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSwwQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvRSxJQUFJO1FBQ0gsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0tBQzNDO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDWCxPQUFPLEtBQUssQ0FBQztLQUNiO0FBQ0YsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0LCB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBQYWNrYWdlSW5mbyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJztcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXIsIERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERyY3BTZXR0aW5nIH0gZnJvbSAnLi4vY29uZmlndXJhYmxlJztcbmltcG9ydCB7IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4gfSBmcm9tICcuLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBUc0FzdFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgYXBpU2V0dXAgZnJvbSAnLi9hcGktc2V0dXAnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qge3dhbGtQYWNrYWdlc30gPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cycpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBjanNvbiA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcblx0LyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cblx0YW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuXHRcdGJ1aWxkZXJDb25maWc/OiBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucylcblx0OiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZnVuY3Rpb24gaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0OiBCdWlsZGVyQ29udGV4dCwgdGFyZ2V0TmFtZTogc3RyaW5nLFxuXHRyZXBsYWNlZE9wdHM6IGFueSkge1xuXHRjb25zdCBnZXRUYXJnZXRPcHRpb25zID0gY29udGV4dC5nZXRUYXJnZXRPcHRpb25zO1xuXG5cdC8vIGNvbnN0IGNhY2hlZCA9IG5ldyBNYXA8c3RyaW5nLCBhbnk+KCk7XG5cdGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyA9IGFzeW5jIGZ1bmN0aW9uKHRhcmdldDogVGFyZ2V0KSB7XG5cdFx0Ly8gaWYgKGNhY2hlZC5oYXModGFyZ2V0LnByb2plY3QgKyAnLicgKyB0YXJnZXQudGFyZ2V0KSkge1xuXHRcdC8vIFx0cmV0dXJuIGNhY2hlZC5nZXQodGFyZ2V0LnByb2plY3QgKyAnLicgKyB0YXJnZXQudGFyZ2V0KTtcblx0XHQvLyB9XG5cdFx0aWYgKHRhcmdldC50YXJnZXQgPT09IHRhcmdldE5hbWUpIHtcblx0XHRcdHJldHVybiByZXBsYWNlZE9wdHM7XG5cdFx0fVxuXHRcdGNvbnN0IG9yaWdPcHRpb24gPSBhd2FpdCBnZXRUYXJnZXRPcHRpb25zLmFwcGx5KGNvbnRleHQsIGFyZ3VtZW50cyk7XG5cdFx0Ly8gY2FjaGVkLnNldCh0YXJnZXQucHJvamVjdCArICcuJyArIHRhcmdldC50YXJnZXQsIG9yaWdPcHRpb24pO1xuXHRcdHJldHVybiBvcmlnT3B0aW9uO1xuXHR9O1xufVxuLyoqXG4gKiBGb3IgYnVpbGQgKG5nIGJ1aWxkKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBicm93c2VyT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zRm9yQnVpbGQoY29uZmlnOiBEcmNwQ29uZmlnLFxuXHRicm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEpOiBQcm9taXNlPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucz4ge1xuXHRyZXR1cm4gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnLCBicm93c2VyT3B0aW9ucyk7XG59XG5cbi8qKlxuICogRm9yIGRldiBzZXJ2ZXIgKG5nIHNlcnZlKVxuICogQHBhcmFtIGNvbmZpZyBcbiAqIEBwYXJhbSBjb250ZXh0IFxuICogQHBhcmFtIGJ1aWxkZXJDb25maWcgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG5cdGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuXHRidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpIHtcblxuXHRjb25zdCBicm93c2VyVGFyZ2V0ID0gdGFyZ2V0RnJvbVRhcmdldFN0cmluZyhidWlsZGVyQ29uZmlnLmJyb3dzZXJUYXJnZXQpO1xuXHRjb25zdCByYXdCcm93c2VyT3B0aW9ucyA9IGF3YWl0IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucyhicm93c2VyVGFyZ2V0KTtcblx0Y29uc3QgYnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhcblx0XHRjb25maWcsIHJhd0Jyb3dzZXJPcHRpb25zIGFzIGFueSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSwgYnVpbGRlckNvbmZpZywgdHJ1ZSk7XG5cdGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dCwgJ2J1aWxkJywgYnJvd3Nlck9wdGlvbnMpO1xuXHRyZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hLFxuXHRidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMsIGhtciA9IGZhbHNlKSB7XG5cdGNvbnN0IGJyb3dzZXJPcHRpb25zID0gcmF3QnJvd3Nlck9wdGlvbnMgYXMgQW5ndWxhckJ1aWxkZXJPcHRpb25zO1xuXHRmb3IgKGNvbnN0IHByb3Agb2YgWydkZXBsb3lVcmwnLCAnb3V0cHV0UGF0aCcsICdzdHlsZXMnXSkge1xuXHRcdGNvbnN0IHZhbHVlID0gY29uZmlnLmdldChbY3VyclBhY2thZ2VOYW1lLCBwcm9wXSk7XG5cdFx0aWYgKHZhbHVlICE9IG51bGwpIHtcblx0XHRcdChyYXdCcm93c2VyT3B0aW9ucyBhcyBhbnkpW3Byb3BdID0gdmFsdWU7XG5cdFx0XHRjb25zb2xlLmxvZyhjdXJyUGFja2FnZU5hbWUgKyAnIC0gb3ZlcnJpZGUgJXM6ICVzJywgcHJvcCwgdmFsdWUpO1xuXHRcdH1cblx0fVxuXHRhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcblx0XHRjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuXHRcdGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuXHRcdFx0cmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGJ1aWxkZXJDb25maWcpO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiBvYmo7XG5cdH0pO1xuXG5cdGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRpZiAocGtKc29uKSB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuXHRcdGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpO1xuXHR9XG5cdC8vIEJlIGNvbXBhdGlibGUgdG8gb2xkIERSQ1AgYnVpbGQgdG9vbHNcblx0Y29uc3Qge2RlcGxveVVybH0gPSBicm93c2VyT3B0aW9ucztcblx0aWYgKCFjb25maWcuZ2V0KCdzdGF0aWNBc3NldHNVUkwnKSlcblx0XHRjb25maWcuc2V0KCdzdGF0aWNBc3NldHNVUkwnLCBfLnRyaW1FbmQoZGVwbG95VXJsLCAnLycpKTtcblx0aWYgKCFjb25maWcuZ2V0KCdwdWJsaWNQYXRoJykpXG5cdFx0Y29uZmlnLnNldCgncHVibGljUGF0aCcsIGRlcGxveVVybCk7XG5cblx0Y29uc3QgbWFpbkhtciA9IGNyZWF0ZU1haW5GaWxlRm9ySG1yKGJyb3dzZXJPcHRpb25zLm1haW4pO1xuXHRpZiAoaG1yKSB7XG5cdFx0YnVpbGRlckNvbmZpZy5obXIgPSB0cnVlO1xuXHRcdGlmICghYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cylcblx0XHRcdGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMgPSBbXTtcblx0XHRicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLnB1c2goe1xuXHRcdFx0cmVwbGFjZTogYnJvd3Nlck9wdGlvbnMubWFpbixcblx0XHRcdHdpdGg6IFBhdGgucmVsYXRpdmUoJy4nLCBtYWluSG1yKVxuXHRcdH0pO1xuXHR9XG5cdGlmIChicm93c2VyT3B0aW9ucy5kcmNwQXJncyA9PSBudWxsKSB7XG5cdFx0YnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPSB7fTtcblx0fVxuXHRoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG5cdGFwaVNldHVwKGJyb3dzZXJPcHRpb25zKTtcblxuXHRyZXR1cm4gYnJvd3Nlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU1haW5GaWxlRm9ySG1yKG1haW5GaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUobWFpbkZpbGUpO1xuXHRjb25zdCB3cml0ZVRvID0gUGF0aC5yZXNvbHZlKGRpciwgJ21haW4taG1yLnRzJyk7XG5cdGlmIChmcy5leGlzdHNTeW5jKHdyaXRlVG8pKSB7XG5cdFx0cmV0dXJuIHdyaXRlVG87XG5cdH1cblx0Y29uc3QgbWFpbiA9IGZzLnJlYWRGaWxlU3luYyhtYWluRmlsZSwgJ3V0ZjgnKTtcblx0bGV0IG1haW5IbXIgPSAnLy8gdHNsaW50OmRpc2FibGVcXG4nICtcblx0YGltcG9ydCBobXJCb290c3RyYXAgZnJvbSAnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2htcic7XFxuJHttYWlufWA7XG5cdGNvbnN0IHF1ZXJ5ID0gbmV3IFRzQXN0U2VsZWN0b3IobWFpbkhtciwgJ21haW4taG1yLnRzJyk7XG5cdC8vIHF1ZXJ5LnByaW50QWxsKCk7XG5cblx0bGV0IGJvb3RDYWxsQXN0OiB0cy5Ob2RlO1xuXHRjb25zdCBzdGF0ZW1lbnQgPSBxdWVyeS5zcmMuc3RhdGVtZW50cy5maW5kKHN0YXRlbWVudCA9PiB7XG5cdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lIG1heC1saW5lLWxlbmd0aFxuXHRcdGNvbnN0IGJvb3RDYWxsID0gcXVlcnkuZmluZFdpdGgoc3RhdGVtZW50LCAnOlByb3BlcnR5QWNjZXNzRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOkNhbGxFeHByZXNzaW9uID4gLmV4cHJlc3Npb246SWRlbnRpZmllcicsXG5cdFx0XHQoYXN0OiB0cy5JZGVudGlmaWVyLCBwYXRoLCBwYXJlbnRzKSA9PiB7XG5cdFx0XHRcdGlmIChhc3QudGV4dCA9PT0gJ3BsYXRmb3JtQnJvd3NlckR5bmFtaWMnICYmXG5cdFx0XHRcdChhc3QucGFyZW50LnBhcmVudCBhcyB0cy5Qcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24pLm5hbWUuZ2V0VGV4dChxdWVyeS5zcmMpID09PSAnYm9vdHN0cmFwTW9kdWxlJyAmJlxuXHRcdFx0XHRhc3QucGFyZW50LnBhcmVudC5wYXJlbnQua2luZCA9PT0gdHMuU3ludGF4S2luZC5DYWxsRXhwcmVzc2lvbikge1xuXHRcdFx0XHRcdHJldHVybiBhc3QucGFyZW50LnBhcmVudC5wYXJlbnQ7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdGlmIChib290Q2FsbCkge1xuXHRcdFx0Ym9vdENhbGxBc3QgPSBib290Q2FsbDtcblx0XHRcdHJldHVybiB0cnVlO1xuXHRcdH1cblx0XHRyZXR1cm4gZmFsc2U7XG5cdH0pO1xuXG5cdG1haW5IbXIgPSByZXBsYWNlQ29kZShtYWluSG1yLCBbe1xuXHRcdHN0YXJ0OiBzdGF0ZW1lbnQuZ2V0U3RhcnQocXVlcnkuc3JjLCB0cnVlKSxcblx0XHRlbmQ6IHN0YXRlbWVudC5nZXRFbmQoKSxcblx0XHR0ZXh0OiAnJ31dKTtcblx0bWFpbkhtciArPSBgY29uc3QgYm9vdHN0cmFwID0gKCkgPT4gJHtib290Q2FsbEFzdC5nZXRUZXh0KCl9O1xcbmA7XG5cdG1haW5IbXIgKz0gYGlmIChtb2R1bGVbICdob3QnIF0pIHtcblx0ICAgIGhtckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuXHQgICAgY29uc29sZS5sb2coJ0FyZSB5b3UgdXNpbmcgdGhlIC0taG1yIGZsYWcgZm9yIG5nIHNlcnZlPycpO1xuXHQgIH1cXG5gLnJlcGxhY2UoL15cXHQvZ20sICcnKTtcblxuXHRmcy53cml0ZUZpbGVTeW5jKHdyaXRlVG8sIG1haW5IbXIpO1xuXHRsb2cuaW5mbygnV3JpdGUgJyArIHdyaXRlVG8pO1xuXHRsb2cuaW5mbyhtYWluSG1yKTtcblx0cmV0dXJuIHdyaXRlVG87XG59XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpIHtcblx0Y29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG5cdGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cblx0c3lzLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3QgcmVzOiBzdHJpbmcgPSBvbGRSZWFkRmlsZS5hcHBseShzeXMsIGFyZ3VtZW50cyk7XG5cdFx0aWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcblx0XHRcdC8vIEFuZ3VsYXIgc29tZWhvdyByZWFkcyB0c2NvbmZpZy5qc29uIHR3aWNlIGFuZCBwYXNzZXMgaW4gYHBhdGhgXG5cdFx0XHQvLyB3aXRoIGRpZmZlcmVudCBwYXRoIHNlcGVyYXRvciBgXFxgIGFuZCBgL2AgaW4gV2luZG93cyBcblx0XHRcdC8vIGBjYWNoZWRUc0NvbmZpZ0ZvcmAgaXMgbG9kYXNoIG1lbW9pemUgZnVuY3Rpb24gd2hpY2ggbmVlZHMgYVxuXHRcdFx0Ly8gY29uc2lzdGVudCBgcGF0aGAgdmFsdWUgYXMgY2FjaGUga2V5XG5cdFx0XHRwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgUGF0aC5zZXApO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0aWYgKHBhdGggPT09IHRzQ29uZmlnRmlsZSlcblx0XHRcdFx0cmV0dXJuIGNhY2hlZFRzQ29uZmlnRm9yKHBhdGgsIHJlcywgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHJldHVybiByZXM7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcblx0XHR9XG5cdH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG5cdHdoaWxlICh0cnVlKSB7XG5cdFx0Y29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG5cdFx0XHRyZXR1cm4gcmVxdWlyZShwayk7XG5cdFx0fSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0bG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQW5ndWxhciBjbGkgd2lsbCByZWFkIHRzY29uZmlnLmpzb24gdHdpY2UgZHVlIHRvIHNvbWUganVuayBjb2RlLCBcbiAqIGxldCdzIG1lbW9pemUgdGhlIHJlc3VsdCBieSBmaWxlIHBhdGggYXMgY2FjaGUga2V5LlxuICovXG5jb25zdCBjYWNoZWRUc0NvbmZpZ0ZvciA9IF8ubWVtb2l6ZShvdmVycmlkZVRzQ29uZmlnKTtcbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyxcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKTogc3RyaW5nIHtcblxuXHRjb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5cdGNvbnN0IG9sZEpzb24gPSBjanNvbi5wYXJzZShjb250ZW50KTtcblx0Y29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG5cdGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuXHRjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgbnVsbCwgcGFja2FnZVV0aWxzLCB0cnVlKTtcblx0Ly8gdmFyIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdID0gY29uZmlnKCkucGFja2FnZVNjb3Blcztcblx0Ly8gdmFyIGNvbXBvbmVudHMgPSBwa0luZm8ubW9kdWxlTWFwO1xuXG5cdHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcblx0bGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuXHQvLyBjb25zdCBleGNsdWRlUGtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Y29uc3QgZXhjbHVkZVBhY2thZ2U6IERyY3BTZXR0aW5nWydleGNsdWRlUGFja2FnZSddID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYWNrYWdlJykgfHwgW107XG5cdGxldCBleGNsdWRlUGF0aDogc3RyaW5nW10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhdGgnKSB8fCBbXTtcblxuXHRuZ1BhY2thZ2VzID0gbmdQYWNrYWdlcy5maWx0ZXIoY29tcCA9PlxuXHRcdCFleGNsdWRlUGFja2FnZS5zb21lKHJlZyA9PiBfLmlzU3RyaW5nKHJlZykgPyBjb21wLmxvbmdOYW1lLmluY2x1ZGVzKHJlZykgOiByZWcudGVzdChjb21wLmxvbmdOYW1lKSkgJiZcblx0XHQoY29tcC5kciAmJiBjb21wLmRyLmFuZ3VsYXJDb21waWxlciB8fCBjb21wLnBhcnNlZE5hbWUuc2NvcGUgPT09ICdiaycgfHxcblx0XHRcdGhhc0lzb21vcnBoaWNEaXIoY29tcC5qc29uLCBjb21wLnBhY2thZ2VQYXRoKSkpO1xuXG5cdGNvbnN0IHRzSW5jbHVkZTogc3RyaW5nW10gPSBvbGRKc29uLmluY2x1ZGUgfHwgW107XG5cdGNvbnN0IHRzRXhjbHVkZTogc3RyaW5nW10gPSBvbGRKc29uLmV4Y2x1ZGUgfHwgW107XG5cdGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG5cdGNvbnN0IGFwcFBhY2thZ2VKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKGFwcE1vZHVsZUZpbGUpO1xuXHRpZiAoYXBwUGFja2FnZUpzb24gPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yLCBjYW4gbm90IGZpbmQgcGFja2FnZS5qc29uIG9mICcgKyBhcHBNb2R1bGVGaWxlKTtcblxuXHQvLyBsZXQgaGFzQXBwUGFja2FnZSA9IGZhbHNlO1xuXHRuZ1BhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuXHRcdC8vIFRPRE86IGRvYyBmb3IgZHIubmdBcHBNb2R1bGVcblx0XHRjb25zdCBpc05nQXBwTW9kdWxlOiBib29sZWFuID0gcGsubG9uZ05hbWUgPT09IGFwcFBhY2thZ2VKc29uLm5hbWU7XG5cdFx0Y29uc3QgZGlyID0gUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksXG5cdFx0XHRpc05nQXBwTW9kdWxlID8gcGsucmVhbFBhY2thZ2VQYXRoIDogKHByZXNlcnZlU3ltbGlua3M/IHBrLnBhY2thZ2VQYXRoIDogcGsucmVhbFBhY2thZ2VQYXRoKSlcblx0XHRcdC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0aWYgKGlzTmdBcHBNb2R1bGUpIHtcblx0XHRcdC8vIGhhc0FwcFBhY2thZ2UgPSB0cnVlO1xuXHRcdFx0dHNJbmNsdWRlLnVuc2hpZnQoZGlyICsgJy8qKi8qLnRzJyk7XG5cdFx0XHQvLyBlbnRyeSBwYWNrYWdlIG11c3QgYmUgYXQgZmlyc3Qgb2YgVFMgaW5jbHVkZSBsaXN0LCBvdGhlcndpc2Ugd2lsbCBlbmNvdW50ZXI6XG5cdFx0XHQvLyBcIkVycm9yOiBObyBOZ01vZHVsZSBtZXRhZGF0YSBmb3VuZCBmb3IgJ0FwcE1vZHVsZSdcblx0XHR9IGVsc2Uge1xuXHRcdFx0dHNJbmNsdWRlLnB1c2goZGlyICsgJy8qKi8qLnRzJyk7XG5cdFx0fVxuXHRcdHRzRXhjbHVkZS5wdXNoKGRpciArICcvdHMnLFxuXHRcdFx0ZGlyICsgJy9zcGVjJyxcblx0XHRcdGRpciArICcvZGlzdCcsXG5cdFx0XHRkaXIgKyAnLyoqLyouc3BlYy50cycpO1xuXG5cdFx0aWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdFx0XHRjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBway5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdHBhdGhNYXBwaW5nW3BrLmxvbmdOYW1lXSA9IFtyZWFsRGlyXTtcblx0XHRcdHBhdGhNYXBwaW5nW3BrLmxvbmdOYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuXHRcdH1cblx0fSk7XG5cdC8vIGlmICghaGFzQXBwUGFja2FnZSkge1xuXHQvLyBcdHRzSW5jbHVkZS51bnNoaWZ0KFBhdGguZGlybmFtZShicm93c2VyT3B0aW9ucy5tYWluKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyoqLyoudHMnKTtcblx0Ly8gfVxuXHR0c0luY2x1ZGUucHVzaChQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgcHJlc2VydmVTeW1saW5rcyA/XG5cdFx0XHQnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnIDpcblx0XHRcdGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnKSlcblx0XHQucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcblx0dHNFeGNsdWRlLnB1c2goJyoqL3Rlc3QudHMnKTtcblxuXHRleGNsdWRlUGF0aCA9IGV4Y2x1ZGVQYXRoLm1hcChleHBhdGggPT5cblx0XHRQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgZXhwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuXHRjb25zb2xlLmxvZyhleGNsdWRlUGF0aCk7XG5cdHRzRXhjbHVkZS5wdXNoKC4uLmV4Y2x1ZGVQYXRoKTtcblxuXHQvLyBJbXBvcnRhbnQhIHRvIG1ha2UgQW5ndWxhciAmIFR5cGVzY3JpcHQgcmVzb2x2ZSBjb3JyZWN0IHJlYWwgcGF0aCBvZiBzeW1saW5rIGxhenkgcm91dGUgbW9kdWxlXG5cdGlmICghcHJlc2VydmVTeW1saW5rcykge1xuXHRcdGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcblx0XHRwYXRoTWFwcGluZ1snKiddID0gWydub2RlX21vZHVsZXMvKidcblx0XHRcdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKidcblx0XHRdO1xuXHR9XG5cblx0dmFyIHRzanNvbjogYW55ID0ge1xuXHRcdC8vIGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL3RzY29uZmlnLmpzb24nKSxcblx0XHRpbmNsdWRlOiB0c0luY2x1ZGUsXG5cdFx0ZXhjbHVkZTogdHNFeGNsdWRlLFxuXHRcdGNvbXBpbGVyT3B0aW9uczoge1xuXHRcdFx0Li4ucmVxdWlyZSgnLi4vLi4vbWlzYy90c2NvbmZpZy5hcHAuanNvbicpLmNvbXBpbGVyT3B0aW9ucyxcblx0XHRcdGJhc2VVcmw6IHJvb3QsXG5cdFx0XHR0eXBlUm9vdHM6IFtcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpLFxuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3R5cGVzJylcblx0XHRcdF0sXG5cdFx0XHQvLyBtb2R1bGU6ICdlc25leHQnLFxuXHRcdFx0cHJlc2VydmVTeW1saW5rcyxcblx0XHRcdHBhdGhzOiBwYXRoTWFwcGluZ1xuXHRcdH0sXG5cdFx0YW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuXHRcdFx0Ly8gdHJhY2U6IHRydWVcblx0XHR9XG5cdH07XG5cdGlmIChvbGRKc29uLmV4dGVuZHMpIHtcblx0XHR0c2pzb24uZXh0ZW5kcyA9IG9sZEpzb24uZXh0ZW5kcztcblx0fVxuXHRPYmplY3QuYXNzaWduKHRzanNvbi5jb21waWxlck9wdGlvbnMsIG9sZEpzb24uY29tcGlsZXJPcHRpb25zKTtcblx0T2JqZWN0LmFzc2lnbih0c2pzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zKTtcblx0Ly8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG5cdGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcblx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGhhc0lzb21vcnBoaWNEaXIocGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcblx0Y29uc3QgZnVsbFBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGdldFRzRGlyc09mUGFja2FnZShwa0pzb24pLmlzb21EaXIpO1xuXHR0cnkge1xuXHRcdHJldHVybiBmcy5zdGF0U3luYyhmdWxsUGF0aCkuaXNEaXJlY3RvcnkoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuIl19
