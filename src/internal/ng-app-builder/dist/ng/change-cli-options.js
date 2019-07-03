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
function processBrowserBuiliderOptions(config, rawBrowserOptions, devServerConfig, hmr = false) {
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
                return handler.angularJson(browserOptions, devServerConfig);
            else
                return obj;
        });
        if (!browserOptions.deployUrl)
            browserOptions.deployUrl = '/';
        // if static assets's URL is not led by '/', it will be considered as relative path in ng-html-loader
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQStCO0FBQy9CLHlEQUEyRjtBQUszRiwwREFBb0U7QUFDcEUsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1QixtREFBNkI7QUFDN0IsMkNBQWlDO0FBRWpDLGdFQUFzRTtBQUN0RSw2RUFBOEM7QUFDOUMsaUZBQWtEO0FBRWxELDhFQUF3QztBQUN4QyxvRUFBNEI7QUFFNUIsTUFBTSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzVDLE1BQU0sRUFBQyxZQUFZLEVBQUMsR0FBRyxPQUFPLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUN6RSxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQztBQUNoRixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDM0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztBQVl0RixTQUFTLHlCQUF5QixDQUFDLE9BQXVCLEVBQUUsVUFBa0IsRUFDNUUsWUFBaUI7SUFDakIsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFbEQsT0FBTyxDQUFDLGdCQUFnQixHQUFHLFVBQWUsTUFBYzs7WUFDdEQsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRTtnQkFDaEMsdURBQXVEO2dCQUN2RCxPQUFPLFlBQVksQ0FBQzthQUNyQjtZQUNELE1BQU0sVUFBVSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsS0FBSyxDQUFDLE9B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T0FBTyxDQUFDLFdBQVcsRUFBRSwwQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMvRSxJQUFJO1FBQ0YsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0tBQzVDO0lBQUMsT0FBTyxDQUFDLEVBQUU7UUFDVixPQUFPLEtBQUssQ0FBQztLQUNkO0FBQ0gsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgeyBCdWlsZGVyQ29udGV4dCwgVGFyZ2V0LCB0YXJnZXRGcm9tVGFyZ2V0U3RyaW5nIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCB7IFNjaGVtYSBhcyBCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBQYWNrYWdlSW5mbyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJztcbmltcG9ydCB7IENvbmZpZ0hhbmRsZXIsIERyY3BDb25maWcgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHsgZ2V0VHNEaXJzT2ZQYWNrYWdlIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzeXMgfSBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCB7IERyY3BTZXR0aW5nIH0gZnJvbSAnLi4vY29uZmlndXJhYmxlJztcbmltcG9ydCB7IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4gfSBmcm9tICcuLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCByZXBsYWNlQ29kZSBmcm9tICcuLi91dGlscy9wYXRjaC10ZXh0JztcbmltcG9ydCBUc0FzdFNlbGVjdG9yIGZyb20gJy4uL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQgYXBpU2V0dXAgZnJvbSAnLi9pbmplY3Rvci1zZXR1cCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmNvbnN0IHtjeWFuLCBncmVlbiwgcmVkfSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCB7d2Fsa1BhY2thZ2VzfSA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJyk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3QgY3VyclBhY2thZ2VOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbmNvbnN0IGNqc29uID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyLmNoYW5nZS1jbGktb3B0aW9ucycpO1xuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ29uZmlnSGFuZGxlciBleHRlbmRzIENvbmZpZ0hhbmRsZXIge1xuICAvKipcblx0ICogWW91IG1heSBvdmVycmlkZSBhbmd1bGFyLmpzb24gaW4gdGhpcyBmdW5jdGlvblxuXHQgKiBAcGFyYW0gb3B0aW9ucyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+LmFyY2hpdGVjdC48Y29tbWFuZD4ub3B0aW9uc1xuXHQgKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+XG5cdCAqL1xuICBhbmd1bGFySnNvbihvcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gICAgYnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKVxuICA6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5mdW5jdGlvbiBoYWNrQW5ndWxhckJ1aWxkZXJDb250ZXh0KGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LCB0YXJnZXROYW1lOiBzdHJpbmcsXG4gIHJlcGxhY2VkT3B0czogYW55KSB7XG4gIGNvbnN0IGdldFRhcmdldE9wdGlvbnMgPSBjb250ZXh0LmdldFRhcmdldE9wdGlvbnM7XG5cbiAgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zID0gYXN5bmMgZnVuY3Rpb24odGFyZ2V0OiBUYXJnZXQpIHtcbiAgICBpZiAodGFyZ2V0LnRhcmdldCA9PT0gdGFyZ2V0TmFtZSkge1xuICAgICAgLy8gbG9nLmluZm8oJ0FuZ3VsYXIgY2xpIGJ1aWxkIG9wdGlvbnMnLCByZXBsYWNlZE9wdHMpO1xuICAgICAgcmV0dXJuIHJlcGxhY2VkT3B0cztcbiAgICB9XG4gICAgY29uc3Qgb3JpZ09wdGlvbiA9IGF3YWl0IGdldFRhcmdldE9wdGlvbnMuYXBwbHkoY29udGV4dCwgYXJndW1lbnRzKTtcbiAgICByZXR1cm4gb3JpZ09wdGlvbjtcbiAgfTtcbn1cbi8qKlxuICogRm9yIGJ1aWxkIChuZyBidWlsZClcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gYnJvd3Nlck9wdGlvbnMgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9uc0ZvckJ1aWxkKGNvbmZpZzogRHJjcENvbmZpZyxcbiAgYnJvd3Nlck9wdGlvbnM6IEJyb3dzZXJCdWlsZGVyU2NoZW1hKTogUHJvbWlzZTxBbmd1bGFyQnVpbGRlck9wdGlvbnM+IHtcbiAgcmV0dXJuIHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKGNvbmZpZywgYnJvd3Nlck9wdGlvbnMpO1xufVxuXG4vKipcbiAqIEZvciBkZXYgc2VydmVyIChuZyBzZXJ2ZSlcbiAqIEBwYXJhbSBjb25maWcgXG4gKiBAcGFyYW0gY29udGV4dCBcbiAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgYnVpbGRlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zKSB7XG5cbiAgY29uc3QgYnJvd3NlclRhcmdldCA9IHRhcmdldEZyb21UYXJnZXRTdHJpbmcoYnVpbGRlckNvbmZpZyEuYnJvd3NlclRhcmdldCk7XG4gIGNvbnN0IHJhd0Jyb3dzZXJPcHRpb25zID0gYXdhaXQgY29udGV4dC5nZXRUYXJnZXRPcHRpb25zKGJyb3dzZXJUYXJnZXQpO1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IGF3YWl0IHByb2Nlc3NCcm93c2VyQnVpbGlkZXJPcHRpb25zKFxuICAgIGNvbmZpZywgcmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55IGFzIEJyb3dzZXJCdWlsZGVyU2NoZW1hLCBidWlsZGVyQ29uZmlnLCB0cnVlKTtcbiAgaGFja0FuZ3VsYXJCdWlsZGVyQ29udGV4dChjb250ZXh0LCAnYnVpbGQnLCBicm93c2VyT3B0aW9ucyk7XG4gIHJldHVybiBicm93c2VyT3B0aW9ucztcbn1cblxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0Jyb3dzZXJCdWlsaWRlck9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLCByYXdCcm93c2VyT3B0aW9uczogQnJvd3NlckJ1aWxkZXJTY2hlbWEsXG4gIGRldlNlcnZlckNvbmZpZz86IERldlNlcnZlckJ1aWxkZXJPcHRpb25zLCBobXIgPSBmYWxzZSkge1xuICBjb25zdCBicm93c2VyT3B0aW9ucyA9IHJhd0Jyb3dzZXJPcHRpb25zIGFzIEFuZ3VsYXJCdWlsZGVyT3B0aW9ucztcbiAgZm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAocmF3QnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuICAgICAgY29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGRldlNlcnZlckNvbmZpZyk7XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIG9iajtcbiAgfSk7XG5cbiAgaWYgKCFicm93c2VyT3B0aW9ucy5kZXBsb3lVcmwpXG4gICAgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsID0gJy8nO1xuICAgIC8vIGlmIHN0YXRpYyBhc3NldHMncyBVUkwgaXMgbm90IGxlZCBieSAnLycsIGl0IHdpbGwgYmUgY29uc2lkZXJlZCBhcyByZWxhdGl2ZSBwYXRoIGluIG5nLWh0bWwtbG9hZGVyXG5cbiAgaWYgKGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpIHtcbiAgICBjb25zb2xlLmxvZyhicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzKTtcbiAgICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHNcbiAgICAuZm9yRWFjaChmciA9PiB7XG4gICAgICBPYmplY3Qua2V5cyhmcikuZm9yRWFjaChmaWVsZCA9PiB7XG4gICAgICAgIGNvbnN0IHZhbHVlOiBzdHJpbmcgPSBmcltmaWVsZF07XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUodmFsdWUpKSB7XG4gICAgICAgICAgZnJbZmllbGRdID0gUGF0aC5yZWxhdGl2ZShjd2QsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgaWYgKHBrSnNvbikge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcbiAgICBjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTtcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuXG4gIGNvbnN0IG1haW5IbXIgPSBjcmVhdGVNYWluRmlsZUZvckhtcihicm93c2VyT3B0aW9ucy5tYWluKTtcbiAgaWYgKGhtciAmJiBkZXZTZXJ2ZXJDb25maWcpIHtcbiAgICBkZXZTZXJ2ZXJDb25maWcuaG1yID0gdHJ1ZTtcbiAgICBpZiAoIWJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMpXG4gICAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzID0gW107XG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cy5wdXNoKHtcbiAgICAgIHJlcGxhY2U6IGJyb3dzZXJPcHRpb25zLm1haW4sXG4gICAgICB3aXRoOiBQYXRoLnJlbGF0aXZlKCcuJywgbWFpbkhtcilcbiAgICB9KTtcbiAgfVxuICBpZiAoYnJvd3Nlck9wdGlvbnMuZHJjcEFyZ3MgPT0gbnVsbCkge1xuICAgIGJyb3dzZXJPcHRpb25zLmRyY3BBcmdzID0ge307XG4gIH1cblxuICBicm93c2VyT3B0aW9ucy5jb21tb25DaHVuayA9IGZhbHNlO1xuICBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG4gIGF3YWl0IGFwaVNldHVwKGJyb3dzZXJPcHRpb25zKTtcbiAgcmV0dXJuIGJyb3dzZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVNYWluRmlsZUZvckhtcihtYWluRmlsZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKG1haW5GaWxlKTtcbiAgY29uc3Qgd3JpdGVUbyA9IFBhdGgucmVzb2x2ZShkaXIsICdtYWluLWhtci50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh3cml0ZVRvKSkge1xuICAgIHJldHVybiB3cml0ZVRvO1xuICB9XG4gIGNvbnN0IG1haW4gPSBmcy5yZWFkRmlsZVN5bmMobWFpbkZpbGUsICd1dGY4Jyk7XG4gIGxldCBtYWluSG1yID0gJy8vIHRzbGludDpkaXNhYmxlXFxuJyArXG4gIGBpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9obXInO1xcbiR7bWFpbn1gO1xuICBjb25zdCBxdWVyeSA9IG5ldyBUc0FzdFNlbGVjdG9yKG1haW5IbXIsICdtYWluLWhtci50cycpO1xuICAvLyBxdWVyeS5wcmludEFsbCgpO1xuXG4gIGxldCBib290Q2FsbEFzdDogdHMuTm9kZTtcbiAgY29uc3Qgc3RhdGVtZW50ID0gcXVlcnkuc3JjLnN0YXRlbWVudHMuZmluZChzdGF0ZW1lbnQgPT4ge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBtYXgtbGluZS1sZW5ndGhcbiAgICBjb25zdCBib290Q2FsbCA9IHF1ZXJ5LmZpbmRXaXRoKHN0YXRlbWVudCwgJzpQcm9wZXJ0eUFjY2Vzc0V4cHJlc3Npb24gPiAuZXhwcmVzc2lvbjpDYWxsRXhwcmVzc2lvbiA+IC5leHByZXNzaW9uOklkZW50aWZpZXInLFxuICAgICAgKGFzdDogdHMuSWRlbnRpZmllciwgcGF0aCwgcGFyZW50cykgPT4ge1xuICAgICAgICBpZiAoYXN0LnRleHQgPT09ICdwbGF0Zm9ybUJyb3dzZXJEeW5hbWljJyAmJlxuICAgICAgICAoYXN0LnBhcmVudC5wYXJlbnQgYXMgdHMuUHJvcGVydHlBY2Nlc3NFeHByZXNzaW9uKS5uYW1lLmdldFRleHQocXVlcnkuc3JjKSA9PT0gJ2Jvb3RzdHJhcE1vZHVsZScgJiZcbiAgICAgICAgYXN0LnBhcmVudC5wYXJlbnQucGFyZW50LmtpbmQgPT09IHRzLlN5bnRheEtpbmQuQ2FsbEV4cHJlc3Npb24pIHtcbiAgICAgICAgICByZXR1cm4gYXN0LnBhcmVudC5wYXJlbnQucGFyZW50O1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICBpZiAoYm9vdENhbGwpIHtcbiAgICAgIGJvb3RDYWxsQXN0ID0gYm9vdENhbGw7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBpZiAoc3RhdGVtZW50ID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKGAke21haW5GaWxlfSxgICtcbiAgICBgY2FuIG5vdCBmaW5kIHN0YXRlbWVudCBsaWtlOiBwbGF0Zm9ybUJyb3dzZXJEeW5hbWljKCkuYm9vdHN0cmFwTW9kdWxlKEFwcE1vZHVsZSlcXG4ke21haW5IbXJ9YCk7XG5cbiAgbWFpbkhtciA9IHJlcGxhY2VDb2RlKG1haW5IbXIsIFt7XG4gICAgc3RhcnQ6IHN0YXRlbWVudC5nZXRTdGFydChxdWVyeS5zcmMsIHRydWUpLFxuICAgIGVuZDogc3RhdGVtZW50LmdldEVuZCgpLFxuICAgIHRleHQ6ICcnfV0pO1xuICBtYWluSG1yICs9IGBjb25zdCBib290c3RyYXAgPSAoKSA9PiAke2Jvb3RDYWxsQXN0IS5nZXRUZXh0KCl9O1xcbmA7XG4gIG1haW5IbXIgKz0gYGlmIChtb2R1bGVbICdob3QnIF0pIHtcblx0ICAgIGhtckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCk7XG5cdCAgfSBlbHNlIHtcblx0ICAgIGNvbnNvbGUuZXJyb3IoJ0hNUiBpcyBub3QgZW5hYmxlZCBmb3Igd2VicGFjay1kZXYtc2VydmVyIScpO1xuXHQgICAgY29uc29sZS5sb2coJ0FyZSB5b3UgdXNpbmcgdGhlIC0taG1yIGZsYWcgZm9yIG5nIHNlcnZlPycpO1xuXHQgIH1cXG5gLnJlcGxhY2UoL15cXHQvZ20sICcnKTtcblxuICBmcy53cml0ZUZpbGVTeW5jKHdyaXRlVG8sIG1haW5IbXIpO1xuICBsb2cuaW5mbygnV3JpdGUgJyArIHdyaXRlVG8pO1xuICBsb2cuaW5mbyhtYWluSG1yKTtcbiAgcmV0dXJuIHdyaXRlVG87XG59XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpIHtcbiAgY29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG4gIGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cbiAgc3lzLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgcmVzOiBzdHJpbmcgPSBvbGRSZWFkRmlsZS5hcHBseShzeXMsIGFyZ3VtZW50cyk7XG4gICAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcbiAgICAgIC8vIEFuZ3VsYXIgc29tZWhvdyByZWFkcyB0c2NvbmZpZy5qc29uIHR3aWNlIGFuZCBwYXNzZXMgaW4gYHBhdGhgXG4gICAgICAvLyB3aXRoIGRpZmZlcmVudCBwYXRoIHNlcGVyYXRvciBgXFxgIGFuZCBgL2AgaW4gV2luZG93cyBcbiAgICAgIC8vIGBjYWNoZWRUc0NvbmZpZ0ZvcmAgaXMgbG9kYXNoIG1lbW9pemUgZnVuY3Rpb24gd2hpY2ggbmVlZHMgYVxuICAgICAgLy8gY29uc2lzdGVudCBgcGF0aGAgdmFsdWUgYXMgY2FjaGUga2V5XG4gICAgICBwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgUGF0aC5zZXApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgaWYgKHBhdGggPT09IHRzQ29uZmlnRmlsZSlcbiAgICAgICAgcmV0dXJuIGNhY2hlZFRzQ29uZmlnRm9yKHBhdGgsIHJlcywgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG4gICAgICBlbHNlXG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUocGspO1xuICAgIH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY2xpIHdpbGwgcmVhZCB0c2NvbmZpZy5qc29uIHR3aWNlIGR1ZSB0byBzb21lIGp1bmsgY29kZSwgXG4gKiBsZXQncyBtZW1vaXplIHRoZSByZXN1bHQgYnkgZmlsZSBwYXRoIGFzIGNhY2hlIGtleS5cbiAqL1xuY29uc3QgY2FjaGVkVHNDb25maWdGb3IgPSBfLm1lbW9pemUob3ZlcnJpZGVUc0NvbmZpZyk7XG4vKipcbiAqIExldCdzIG92ZXJyaWRlIHRzY29uZmlnLmpzb24gZmlsZXMgZm9yIEFuZ3VsYXIgYXQgcnV0aW1lIDopXG4gKiAtIFJlYWQgaW50byBtZW1vcnlcbiAqIC0gRG8gbm90IG92ZXJyaWRlIHByb3BlcnRpZXMgb2YgY29tcGlsZXJPcHRpb25zLGFuZ3VsYXJDb21waWxlck9wdGlvbnMgdGhhdCBleGlzdHMgaW4gY3VycmVudCBmaWxlXG4gKiAtIFwiZXh0ZW5kc1wiIG11c3QgYmUgLi4uXG4gKiAtIFRyYXZlcnNlIHBhY2thZ2VzIHRvIGJ1aWxkIHByb3BlciBpbmNsdWRlcyBhbmQgZXhjbHVkZXMgbGlzdCBhbmQgLi4uXG4gKiAtIEZpbmQgZmlsZSB3aGVyZSBBcHBNb2R1bGUgaXMgaW4sIGZpbmQgaXRzIHBhY2thZ2UsIG1vdmUgaXRzIGRpcmVjdG9yeSB0byB0b3Agb2YgaW5jbHVkZXMgbGlzdCxcbiAqIFx0d2hpY2ggZml4ZXMgbmcgY2xpIHdpbmRvd3MgYnVnXG4gKi9cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyk6IHN0cmluZyB7XG5cbiAgY29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuICBjb25zdCBvbGRKc29uID0gY2pzb24ucGFyc2UoY29udGVudCk7XG4gIGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSB8IHVuZGVmaW5lZCA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIG51bGwsIHBhY2thZ2VVdGlscywgdHJ1ZSk7XG4gIC8vIHZhciBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXSA9IGNvbmZpZygpLnBhY2thZ2VTY29wZXM7XG4gIC8vIHZhciBjb21wb25lbnRzID0gcGtJbmZvLm1vZHVsZU1hcDtcblxuICB0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG4gIGxldCBuZ1BhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VzID0gcGtJbmZvLmFsbE1vZHVsZXM7XG5cbiAgLy8gY29uc3QgZXhjbHVkZVBrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGV4Y2x1ZGVQYWNrYWdlOiBEcmNwU2V0dGluZ1snZXhjbHVkZVBhY2thZ2UnXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGFja2FnZScpIHx8IFtdO1xuICBsZXQgZXhjbHVkZVBhdGg6IHN0cmluZ1tdID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYXRoJykgfHwgW107XG5cbiAgbmdQYWNrYWdlcyA9IG5nUGFja2FnZXMuZmlsdGVyKGNvbXAgPT5cbiAgICAhZXhjbHVkZVBhY2thZ2Uuc29tZShyZWcgPT4gXy5pc1N0cmluZyhyZWcpID8gY29tcC5sb25nTmFtZS5pbmNsdWRlcyhyZWcpIDogcmVnLnRlc3QoY29tcC5sb25nTmFtZSkpICYmXG4gICAgKGNvbXAuZHIgJiYgY29tcC5kci5hbmd1bGFyQ29tcGlsZXIgfHwgY29tcC5wYXJzZWROYW1lLnNjb3BlID09PSAnYmsnIHx8XG4gICAgICBoYXNJc29tb3JwaGljRGlyKGNvbXAuanNvbiwgY29tcC5wYWNrYWdlUGF0aCkpKTtcblxuICBjb25zdCB0c0luY2x1ZGU6IHN0cmluZ1tdID0gb2xkSnNvbi5pbmNsdWRlIHx8IFtdO1xuICBjb25zdCB0c0V4Y2x1ZGU6IHN0cmluZ1tdID0gb2xkSnNvbi5leGNsdWRlIHx8IFtdO1xuICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcbiAgaWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cbiAgLy8gbGV0IGhhc0FwcFBhY2thZ2UgPSBmYWxzZTtcbiAgbmdQYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcbiAgICAvLyBUT0RPOiBkb2MgZm9yIGRyLm5nQXBwTW9kdWxlXG4gICAgY29uc3QgaXNOZ0FwcE1vZHVsZTogYm9vbGVhbiA9IHBrLmxvbmdOYW1lID09PSBhcHBQYWNrYWdlSnNvbi5uYW1lO1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLFxuICAgICAgaXNOZ0FwcE1vZHVsZSA/IHBrLnJlYWxQYWNrYWdlUGF0aCA6IChwcmVzZXJ2ZVN5bWxpbmtzPyBway5wYWNrYWdlUGF0aCA6IHBrLnJlYWxQYWNrYWdlUGF0aCkpXG4gICAgICAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmIChpc05nQXBwTW9kdWxlKSB7XG4gICAgICAvLyBoYXNBcHBQYWNrYWdlID0gdHJ1ZTtcbiAgICAgIHRzSW5jbHVkZS51bnNoaWZ0KGRpciArICcvKiovKi50cycpO1xuICAgICAgLy8gZW50cnkgcGFja2FnZSBtdXN0IGJlIGF0IGZpcnN0IG9mIFRTIGluY2x1ZGUgbGlzdCwgb3RoZXJ3aXNlIHdpbGwgZW5jb3VudGVyOlxuICAgICAgLy8gXCJFcnJvcjogTm8gTmdNb2R1bGUgbWV0YWRhdGEgZm91bmQgZm9yICdBcHBNb2R1bGUnXG4gICAgfSBlbHNlIHtcbiAgICAgIHRzSW5jbHVkZS5wdXNoKGRpciArICcvKiovKi50cycpO1xuICAgIH1cbiAgICB0c0V4Y2x1ZGUucHVzaChkaXIgKyAnL3RzJyxcbiAgICAgIGRpciArICcvc3BlYycsXG4gICAgICBkaXIgKyAnL2Rpc3QnLFxuICAgICAgZGlyICsgJy8qKi8qLnNwZWMudHMnKTtcblxuICAgIGlmICghcHJlc2VydmVTeW1saW5rcykge1xuICAgICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgcGsucmVhbFBhY2thZ2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBwYXRoTWFwcGluZyFbcGsubG9uZ05hbWVdID0gW3JlYWxEaXJdO1xuICAgICAgcGF0aE1hcHBpbmchW3BrLmxvbmdOYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cbiAgfSk7XG4gIC8vIGlmICghaGFzQXBwUGFja2FnZSkge1xuICAvLyBcdHRzSW5jbHVkZS51bnNoaWZ0KFBhdGguZGlybmFtZShicm93c2VyT3B0aW9ucy5tYWluKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLyoqLyoudHMnKTtcbiAgLy8gfVxuICB0c0luY2x1ZGUucHVzaChQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgcHJlc2VydmVTeW1saW5rcyA/XG4gICAgICAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnIDpcbiAgICAgIGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnKSlcbiAgICAucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgdHNFeGNsdWRlLnB1c2goJyoqL3Rlc3QudHMnKTtcblxuICBleGNsdWRlUGF0aCA9IGV4Y2x1ZGVQYXRoLm1hcChleHBhdGggPT5cbiAgICBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgZXhwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICBjb25zb2xlLmxvZyhleGNsdWRlUGF0aCk7XG4gIHRzRXhjbHVkZS5wdXNoKC4uLmV4Y2x1ZGVQYXRoKTtcblxuICAvLyBJbXBvcnRhbnQhIHRvIG1ha2UgQW5ndWxhciAmIFR5cGVzY3JpcHQgcmVzb2x2ZSBjb3JyZWN0IHJlYWwgcGF0aCBvZiBzeW1saW5rIGxhenkgcm91dGUgbW9kdWxlXG4gIGlmICghcHJlc2VydmVTeW1saW5rcykge1xuICAgIGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmchWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcbiAgICBwYXRoTWFwcGluZyFbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICAgIHBhdGhNYXBwaW5nIVsnKiddID0gWydub2RlX21vZHVsZXMvKidcbiAgICAgICwgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKidcbiAgICBdO1xuICB9XG5cbiAgdmFyIHRzanNvbjoge2NvbXBpbGVyT3B0aW9uczogdHMuQ29tcGlsZXJPcHRpb25zLCBba2V5OiBzdHJpbmddOiBhbnl9ID0ge1xuICAgIC8vIGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL3RzY29uZmlnLmpzb24nKSxcbiAgICBpbmNsdWRlOiB0c0luY2x1ZGUsXG4gICAgZXhjbHVkZTogdHNFeGNsdWRlLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLi4ucmVxdWlyZSgnLi4vLi4vbWlzYy90c2NvbmZpZy5hcHAuanNvbicpLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGJhc2VVcmw6IHJvb3QsXG4gICAgICBzdHJpY3ROdWxsQ2hlY2tzOiBmYWxzZSxcbiAgICAgIHR5cGVSb290czogW1xuICAgICAgICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93ZmgvdHlwZXMnKVxuICAgICAgXSxcbiAgICAgIC8vIG1vZHVsZTogJ2VzbmV4dCcsXG4gICAgICBwcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgcGF0aHM6IHBhdGhNYXBwaW5nXG4gICAgfSxcbiAgICBhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAvLyB0cmFjZTogdHJ1ZVxuICAgIH1cbiAgfTtcbiAgaWYgKG9sZEpzb24uZXh0ZW5kcykge1xuICAgIHRzanNvbi5leHRlbmRzID0gb2xkSnNvbi5leHRlbmRzO1xuICB9XG4gIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5jb21waWxlck9wdGlvbnMpO1xuICBPYmplY3QuYXNzaWduKHRzanNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLCBvbGRKc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnMpO1xuICAvLyBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgJHtmaWxlfTpcXG5gLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcbiAgbG9nLmluZm8oYCR7ZmlsZX06XFxuJHtKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpfWApO1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKTtcbn1cblxuZnVuY3Rpb24gaGFzSXNvbW9ycGhpY0Rpcihwa0pzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuICBjb25zdCBmdWxsUGF0aCA9IFBhdGgucmVzb2x2ZShwYWNrYWdlUGF0aCwgZ2V0VHNEaXJzT2ZQYWNrYWdlKHBrSnNvbikuaXNvbURpcik7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGZzLnN0YXRTeW5jKGZ1bGxQYXRoKS5pc0RpcmVjdG9yeSgpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG4iXX0=
