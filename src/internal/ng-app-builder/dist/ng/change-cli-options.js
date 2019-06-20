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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0IsMkNBQWlDO0FBRWpDLGdFQUFzRTtBQUN0RSw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUF3QztBQUN4QyxvRUFBNEI7QUFFNUIsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUN6RSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQztBQUNoRixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDM0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQVl0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDN0UsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQseUNBQXlDO0lBQ3pDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxVQUFlLE1BQWM7O1lBQ3ZELDBEQUEwRDtZQUMxRCw0REFBNEQ7WUFDNUQsSUFBSTtZQUNKLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2pDLE9BQU8sWUFBWSxDQUFDO2FBQ3BCO1lBQ0QsTUFBTSxVQUFV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QUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDNUQsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsTUFBVyxFQUFFLFdBQW1CO0lBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLDBCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQy9FLElBQUk7UUFDSCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7S0FDM0M7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNYLE9BQU8sS0FBSyxDQUFDO0tBQ2I7QUFDRixDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBUYXJnZXQsIHRhcmdldEZyb21UYXJnZXRTdHJpbmcgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7IERldlNlcnZlckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IFBhY2thZ2VJbmZvIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnO1xuaW1wb3J0IHsgQ29uZmlnSGFuZGxlciwgRHJjcENvbmZpZyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgeyBnZXRUc0RpcnNPZlBhY2thZ2UgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHN5cyB9IGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IHsgRHJjcFNldHRpbmcgfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHsgZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbiB9IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHJlcGxhY2VDb2RlIGZyb20gJy4uL3V0aWxzL3BhdGNoLXRleHQnO1xuaW1wb3J0IFRzQXN0U2VsZWN0b3IgZnJvbSAnLi4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCBhcGlTZXR1cCBmcm9tICcuL2luamVjdG9yLXNldHVwJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHt3YWxrUGFja2FnZXN9ID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgY2pzb24gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5leHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJDb25maWdIYW5kbGVyIGV4dGVuZHMgQ29uZmlnSGFuZGxlciB7XG5cdC8qKlxuXHQgKiBZb3UgbWF5IG92ZXJyaWRlIGFuZ3VsYXIuanNvbiBpbiB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBvcHRpb25zIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD4uYXJjaGl0ZWN0Ljxjb21tYW5kPi5vcHRpb25zXG5cdCAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD5cblx0ICovXG5cdGFuZ3VsYXJKc29uKG9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcblx0XHRidWlsZGVyQ29uZmlnPzogRGV2U2VydmVyQnVpbGRlck9wdGlvbnMpXG5cdDogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmZ1bmN0aW9uIGhhY2tBbmd1bGFyQnVpbGRlckNvbnRleHQoY29udGV4dDogQnVpbGRlckNvbnRleHQsIHRhcmdldE5hbWU6IHN0cmluZyxcblx0cmVwbGFjZWRPcHRzOiBhbnkpIHtcblx0Y29uc3QgZ2V0VGFyZ2V0T3B0aW9ucyA9IGNvbnRleHQuZ2V0VGFyZ2V0T3B0aW9ucztcblxuXHQvLyBjb25zdCBjYWNoZWQgPSBuZXcgTWFwPHN0cmluZywgYW55PigpO1xuXHRjb250ZXh0LmdldFRhcmdldE9wdGlvbnMgPSBhc3luYyBmdW5jdGlvbih0YXJnZXQ6IFRhcmdldCkge1xuXHRcdC8vIGlmIChjYWNoZWQuaGFzKHRhcmdldC5wcm9qZWN0ICsgJy4nICsgdGFyZ2V0LnRhcmdldCkpIHtcblx0XHQvLyBcdHJldHVybiBjYWNoZWQuZ2V0KHRhcmdldC5wcm9qZWN0ICsgJy4nICsgdGFyZ2V0LnRhcmdldCk7XG5cdFx0Ly8gfVxuXHRcdGlmICh0YXJnZXQudGFyZ2V0ID09PSB0YXJnZXROYW1lKSB7XG5cdFx0XHRyZXR1cm4gcmVwbGFjZWRPcHRzO1xuXHRcdH1cblx0XHRjb25zdCBvcmlnT3B0aW9uID0gYXdhaXQgZ2V0VGFyZ2V0T3B0aW9ucy5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuXHRcdC8vIGNhY2hlZC5zZXQodGFyZ2V0LnByb2plY3QgKyAnLicgKyB0YXJnZXQudGFyZ2V0LCBvcmlnT3B0aW9uKTtcblx0XHRyZXR1cm4gb3JpZ09wdGlvbjtcblx0fTtcbn1cbi8qKlxuICogRm9yIGJ1aWxkIChuZyBidWlsZClcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc0ZvckJ1aWxkKGNvbmZpZzogRHJjcENvbmZpZyxcblx0YnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hKTogUHJvbWlzZTxBbmd1bGFyQnVpbGRlck9wdGlvbnM+IHtcblx0cmV0dXJuIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEZvciBkZXYgc2VydmVyIChuZyBzZXJ2ZSlcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gY29udGV4dCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLFxuXHRjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcblx0YnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG5cblx0Y29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcoYnVpbGRlckNvbmZpZy5icm93c2VyVGFyZ2V0KTtcblx0Y29uc3QgcmF3QnJvd3Nlck9wdGlvbnMgPSBhd2FpdCBjb250ZXh0LmdldFRhcmdldE9wdGlvbnMoYnJvd3NlclRhcmdldCk7XG5cdGNvbnN0IGJyb3dzZXJPcHRpb25zID0gYXdhaXQgcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoXG5cdFx0Y29uZmlnLCByYXdCcm93c2VyT3B0aW9ucyBhcyBhbnkgYXMgQnJvd3NlckJ1aWxkZXJTY2hlbWEsIGJ1aWxkZXJDb25maWcsIHRydWUpO1xuXHRoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQsICdidWlsZCcsIGJyb3dzZXJPcHRpb25zKTtcblx0cmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQnJvd3NlckJ1aWxpZGVyT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsIHJhd0Jyb3dzZXJPcHRpb25zOiBCcm93c2VyQnVpbGRlclNjaGVtYSxcblx0YnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBobXIgPSBmYWxzZSkge1xuXHRjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcblx0Zm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcblx0XHRjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuXHRcdGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHQocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuXHRcdFx0Y29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcblx0XHR9XG5cdH1cblx0YXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcblx0XHRpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcblx0XHRcdHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBidWlsZGVyQ29uZmlnKTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHR9KTtcblxuXHRjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcblx0aWYgKHBrSnNvbikge1xuXHRcdGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcblx0XHRjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTtcblx0fVxuXHQvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG5cdGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG5cdGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG5cdFx0Y29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG5cdGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuXHRcdGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG5cdGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcblx0aWYgKGhtcikge1xuXHRcdGJ1aWxkZXJDb25maWcuaG1yID0gdHJ1ZTtcblx0XHRpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG5cdFx0XHRicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG5cdFx0YnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcblx0XHRcdHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG5cdFx0XHR3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcblx0XHR9KTtcblx0fVxuXHRpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuXHRcdGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG5cdH1cblx0aGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuXHRhd2FpdCBhcGlTZXR1cChicm93c2VyT3B0aW9ucyk7XG5cblx0cmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcblx0Y29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcblx0Y29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuXHRpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuXHRcdHJldHVybiB3cml0ZVRvO1xuXHR9XG5cdGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG5cdGxldCBtYWluSG1yID0gJy8vIHRzbGludDpkaXNhYmxlXFxuJyArXG5cdGBpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9obXInO1xcbiR7bWFpbn1gO1xuXHRjb25zdCBxdWVyeSA9IG5ldyBUc0FzdFNlbGVjdG9yKG1haW5IbXIsICdtYWluLWhtci50cycpO1xuXHQvLyBxdWVyeS5wcmludEFsbCgpO1xuXG5cdGxldCBib290Q2FsbEFzdDogdHMuTm9kZTtcblx0Y29uc3Qgc3RhdGVtZW50ID0gcXVlcnkuc3JjLnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4ge1xuXHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZS1sZW5ndGhcblx0XHRjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRXaXRoKHN0YXRlbWVudCwgJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuXHRcdFx0KGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuXHRcdFx0XHRpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuXHRcdFx0XHQoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcblx0XHRcdFx0YXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcblx0XHRcdFx0XHRyZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHRpZiAoYm9vdENhbGwpIHtcblx0XHRcdGJvb3RDYWxsQXN0ID0gYm9vdENhbGw7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0cmV0dXJuIGZhbHNlO1xuXHR9KTtcblxuXHRtYWluSG1yID0gcmVwbGFjZUNvZGUobWFpbkhtciwgW3tcblx0XHRzdGFydDogc3RhdGVtZW50LmdldFN0YXJ0KHF1ZXJ5LnNyYywgdHJ1ZSksXG5cdFx0ZW5kOiBzdGF0ZW1lbnQuZ2V0RW5kKCksXG5cdFx0dGV4dDogJyd9XSk7XG5cdG1haW5IbXIgKz0gYGNvbnN0IGJvb3RzdHJhcCA9ICgpID0+ICR7Ym9vdENhbGxBc3QuZ2V0VGV4dCgpfTtcXG5gO1xuXHRtYWluSG1yICs9IGBpZiAobW9kdWxlWyAnaG90JyBdKSB7XG5cdCAgICBobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApO1xuXHQgIH0gZWxzZSB7XG5cdCAgICBjb25zb2xlLmVycm9yKCdITVIgaXMgbm90IGVuYWJsZWQgZm9yIHdlYnBhY2stZGV2LXNlcnZlciEnKTtcblx0ICAgIGNvbnNvbGUubG9nKCdBcmUgeW91IHVzaW5nIHRoZSAtLWhtciBmbGFnIGZvciBuZyBzZXJ2ZT8nKTtcblx0ICB9XFxuYC5yZXBsYWNlKC9eXFx0L2dtLCAnJyk7XG5cblx0ZnMud3JpdGVGaWxlU3luYyh3cml0ZVRvLCBtYWluSG1yKTtcblx0bG9nLmluZm8oJ1dyaXRlICcgKyB3cml0ZVRvKTtcblx0bG9nLmluZm8obWFpbkhtcik7XG5cdHJldHVybiB3cml0ZVRvO1xufVxuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5mdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKSB7XG5cdGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuXHRjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG5cdHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuXHRcdGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG5cdFx0XHQvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuXHRcdFx0Ly8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG5cdFx0XHQvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcblx0XHRcdC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuXHRcdFx0cGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG5cdFx0XHRcdHJldHVybiBjYWNoZWRUc0NvbmZpZ0ZvcihwYXRoLCByZXMsIGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG5cdFx0fVxuXHR9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuXHR3aGlsZSAodHJ1ZSkge1xuXHRcdGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuXHRcdGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuXHRcdFx0cmV0dXJuIHJlcXVpcmUocGspO1xuXHRcdH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuXHR9XG5cdHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY2xpIHdpbGwgcmVhZCB0c2NvbmZpZy5qc29uIHR3aWNlIGR1ZSB0byBzb21lIGp1bmsgY29kZSwgXG4gKiBsZXQncyBtZW1vaXplIHRoZSByZXN1bHQgYnkgZmlsZSBwYXRoIGFzIGNhY2hlIGtleS5cbiAqL1xuY29uc3QgY2FjaGVkVHNDb25maWdGb3IgPSBfLm1lbW9pemUob3ZlcnJpZGVUc0NvbmZpZyk7XG4vKipcbiAqIExldCdzIG92ZXJyaWRlIHRzY29uZmlnLmpzb24gZmlsZXMgZm9yIEFuZ3VsYXIgYXQgcnV0aW1lIDopXG4gKiAtIFJlYWQgaW50byBtZW1vcnlcbiAqIC0gRG8gbm90IG92ZXJyaWRlIHByb3BlcnRpZXMgb2YgY29tcGlsZXJPcHRpb25zLGFuZ3VsYXJDb21waWxlck9wdGlvbnMgdGhhdCBleGlzdHMgaW4gY3VycmVudCBmaWxlXG4gKiAtIFwiZXh0ZW5kc1wiIG11c3QgYmUgLi4uXG4gKiAtIFRyYXZlcnNlIHBhY2thZ2VzIHRvIGJ1aWxkIHByb3BlciBpbmNsdWRlcyBhbmQgZXhjbHVkZXMgbGlzdCBhbmQgLi4uXG4gKiAtIEZpbmQgZmlsZSB3aGVyZSBBcHBNb2R1bGUgaXMgaW4sIGZpbmQgaXRzIHBhY2thZ2UsIG1vdmUgaXRzIGRpcmVjdG9yeSB0byB0b3Agb2YgaW5jbHVkZXMgbGlzdCxcbiAqIFx0d2hpY2ggZml4ZXMgbmcgY2xpIHdpbmRvd3MgYnVnXG4gKi9cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsXG5cdGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyk6IHN0cmluZyB7XG5cblx0Y29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuXHRjb25zdCBvbGRKc29uID0gY2pzb24ucGFyc2UoY29udGVudCk7XG5cdGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuXHRjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcblx0Y29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIG51bGwsIHBhY2thZ2VVdGlscywgdHJ1ZSk7XG5cdC8vIHZhciBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXSA9IGNvbmZpZygpLnBhY2thZ2VTY29wZXM7XG5cdC8vIHZhciBjb21wb25lbnRzID0gcGtJbmZvLm1vZHVsZU1hcDtcblxuXHR0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG5cdGxldCBuZ1BhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VzID0gcGtJbmZvLmFsbE1vZHVsZXM7XG5cblx0Ly8gY29uc3QgZXhjbHVkZVBrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cdGNvbnN0IGV4Y2x1ZGVQYWNrYWdlOiBEcmNwU2V0dGluZ1snZXhjbHVkZVBhY2thZ2UnXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGFja2FnZScpIHx8IFtdO1xuXHRsZXQgZXhjbHVkZVBhdGg6IHN0cmluZ1tdID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYXRoJykgfHwgW107XG5cblx0bmdQYWNrYWdlcyA9IG5nUGFja2FnZXMuZmlsdGVyKGNvbXAgPT5cblx0XHQhZXhjbHVkZVBhY2thZ2Uuc29tZShyZWcgPT4gXy5pc1N0cmluZyhyZWcpID8gY29tcC5sb25nTmFtZS5pbmNsdWRlcyhyZWcpIDogcmVnLnRlc3QoY29tcC5sb25nTmFtZSkpICYmXG5cdFx0KGNvbXAuZHIgJiYgY29tcC5kci5hbmd1bGFyQ29tcGlsZXIgfHwgY29tcC5wYXJzZWROYW1lLnNjb3BlID09PSAnYmsnIHx8XG5cdFx0XHRoYXNJc29tb3JwaGljRGlyKGNvbXAuanNvbiwgY29tcC5wYWNrYWdlUGF0aCkpKTtcblxuXHRjb25zdCB0c0luY2x1ZGU6IHN0cmluZ1tdID0gb2xkSnNvbi5pbmNsdWRlIHx8IFtdO1xuXHRjb25zdCB0c0V4Y2x1ZGU6IHN0cmluZ1tdID0gb2xkSnNvbi5leGNsdWRlIHx8IFtdO1xuXHRjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcblx0aWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cblx0Ly8gbGV0IGhhc0FwcFBhY2thZ2UgPSBmYWxzZTtcblx0bmdQYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcblx0XHQvLyBUT0RPOiBkb2MgZm9yIGRyLm5nQXBwTW9kdWxlXG5cdFx0Y29uc3QgaXNOZ0FwcE1vZHVsZTogYm9vbGVhbiA9IHBrLmxvbmdOYW1lID09PSBhcHBQYWNrYWdlSnNvbi5uYW1lO1xuXHRcdGNvbnN0IGRpciA9IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLFxuXHRcdFx0aXNOZ0FwcE1vZHVsZSA/IHBrLnJlYWxQYWNrYWdlUGF0aCA6IChwcmVzZXJ2ZVN5bWxpbmtzPyBway5wYWNrYWdlUGF0aCA6IHBrLnJlYWxQYWNrYWdlUGF0aCkpXG5cdFx0XHQucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdGlmIChpc05nQXBwTW9kdWxlKSB7XG5cdFx0XHQvLyBoYXNBcHBQYWNrYWdlID0gdHJ1ZTtcblx0XHRcdHRzSW5jbHVkZS51bnNoaWZ0KGRpciArICcvKiovKi50cycpO1xuXHRcdFx0Ly8gZW50cnkgcGFja2FnZSBtdXN0IGJlIGF0IGZpcnN0IG9mIFRTIGluY2x1ZGUgbGlzdCwgb3RoZXJ3aXNlIHdpbGwgZW5jb3VudGVyOlxuXHRcdFx0Ly8gXCJFcnJvcjogTm8gTmdNb2R1bGUgbWV0YWRhdGEgZm91bmQgZm9yICdBcHBNb2R1bGUnXG5cdFx0fSBlbHNlIHtcblx0XHRcdHRzSW5jbHVkZS5wdXNoKGRpciArICcvKiovKi50cycpO1xuXHRcdH1cblx0XHR0c0V4Y2x1ZGUucHVzaChkaXIgKyAnL3RzJyxcblx0XHRcdGRpciArICcvc3BlYycsXG5cdFx0XHRkaXIgKyAnL2Rpc3QnLFxuXHRcdFx0ZGlyICsgJy8qKi8qLnNwZWMudHMnKTtcblxuXHRcdGlmICghcHJlc2VydmVTeW1saW5rcykge1xuXHRcdFx0Y29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgcGsucmVhbFBhY2thZ2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRwYXRoTWFwcGluZ1tway5sb25nTmFtZV0gPSBbcmVhbERpcl07XG5cdFx0XHRwYXRoTWFwcGluZ1tway5sb25nTmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcblx0XHR9XG5cdH0pO1xuXHQvLyBpZiAoIWhhc0FwcFBhY2thZ2UpIHtcblx0Ly8gXHR0c0luY2x1ZGUudW5zaGlmdChQYXRoLmRpcm5hbWUoYnJvd3Nlck9wdGlvbnMubWFpbikucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8qKi8qLnRzJyk7XG5cdC8vIH1cblx0dHNJbmNsdWRlLnB1c2goUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIHByZXNlcnZlU3ltbGlua3MgP1xuXHRcdFx0J25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJyA6XG5cdFx0XHRmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJykpXG5cdFx0LnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG5cdHRzRXhjbHVkZS5wdXNoKCcqKi90ZXN0LnRzJyk7XG5cblx0ZXhjbHVkZVBhdGggPSBleGNsdWRlUGF0aC5tYXAoZXhwYXRoID0+XG5cdFx0UGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGV4cGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcblx0Y29uc29sZS5sb2coZXhjbHVkZVBhdGgpO1xuXHR0c0V4Y2x1ZGUucHVzaCguLi5leGNsdWRlUGF0aCk7XG5cblx0Ly8gSW1wb3J0YW50ISB0byBtYWtlIEFuZ3VsYXIgJiBUeXBlc2NyaXB0IHJlc29sdmUgY29ycmVjdCByZWFsIHBhdGggb2Ygc3ltbGluayBsYXp5IHJvdXRlIG1vZHVsZVxuXHRpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcblx0XHRjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcblx0XHRwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG5cdFx0cGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonXG5cdFx0XHQsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXG5cdFx0XTtcblx0fVxuXG5cdHZhciB0c2pzb246IGFueSA9IHtcblx0XHQvLyBleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG5cdFx0aW5jbHVkZTogdHNJbmNsdWRlLFxuXHRcdGV4Y2x1ZGU6IHRzRXhjbHVkZSxcblx0XHRjb21waWxlck9wdGlvbnM6IHtcblx0XHRcdC4uLnJlcXVpcmUoJy4uLy4uL21pc2MvdHNjb25maWcuYXBwLmpzb24nKS5jb21waWxlck9wdGlvbnMsXG5cdFx0XHRiYXNlVXJsOiByb290LFxuXHRcdFx0dHlwZVJvb3RzOiBbXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC90eXBlcycpXG5cdFx0XHRdLFxuXHRcdFx0Ly8gbW9kdWxlOiAnZXNuZXh0Jyxcblx0XHRcdHByZXNlcnZlU3ltbGlua3MsXG5cdFx0XHRwYXRoczogcGF0aE1hcHBpbmdcblx0XHR9LFxuXHRcdGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcblx0XHRcdC8vIHRyYWNlOiB0cnVlXG5cdFx0fVxuXHR9O1xuXHRpZiAob2xkSnNvbi5leHRlbmRzKSB7XG5cdFx0dHNqc29uLmV4dGVuZHMgPSBvbGRKc29uLmV4dGVuZHM7XG5cdH1cblx0T2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLCBvbGRKc29uLmNvbXBpbGVyT3B0aW9ucyk7XG5cdE9iamVjdC5hc3NpZ24odHNqc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnMsIG9sZEpzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucyk7XG5cdC8vIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGAke2ZpbGV9OlxcbmAsIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuXHRsb2cuaW5mbyhgJHtmaWxlfTpcXG4ke0pTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyl9YCk7XG5cdHJldHVybiBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpO1xufVxuXG5mdW5jdGlvbiBoYXNJc29tb3JwaGljRGlyKHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG5cdGNvbnN0IGZ1bGxQYXRoID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBnZXRUc0RpcnNPZlBhY2thZ2UocGtKc29uKS5pc29tRGlyKTtcblx0dHJ5IHtcblx0XHRyZXR1cm4gZnMuc3RhdFN5bmMoZnVsbFBhdGgpLmlzRGlyZWN0b3J5KCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cbiJdfQ==
