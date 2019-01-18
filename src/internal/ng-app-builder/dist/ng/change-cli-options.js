"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const parse_app_module_1 = require("../utils/parse-app-module");
const { cyan, green, red } = require('chalk');
const { walkPackages } = require('dr-comp-package/wfh/dist/build-util/ts');
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
const currPackageName = require('../../package.json').name;
const cjson = require('comment-json');
const log = require('log4js').getLogger('@dr-core/ng-app-builder.change-cli-options');
function changeAngularCliOptions(config, browserOptions, builderConfig) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        for (const prop of ['deployUrl', 'outputPath', 'styles']) {
            const value = config.get([currPackageName, prop]);
            if (value != null) {
                browserOptions[prop] = value;
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
        hackTsConfig(browserOptions, config);
    });
}
exports.default = changeAngularCliOptions;
const typescript_1 = require("typescript");
// import Path = require('path');
// const log = require('log4js').getLogger('hackTsConfig');
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
    // if (excludePackage)
    // 	excludePackage.forEach(pname => excludePkSet.add(pname));
    ngPackages = ngPackages.filter(comp => !excludePackage.some(reg => _.isString(reg) ? comp.longName.includes(reg) : reg.test(comp.longName)) &&
        (comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk'));
    const tsInclude = [];
    const tsExclude = [];
    const appModuleFile = parse_app_module_1.findAppModuleFileFromMain(Path.resolve(browserOptions.main));
    const appPackageJson = lookupEntryPackage(appModuleFile);
    if (appPackageJson == null)
        throw new Error('Error, can not find package.json of ' + appModuleFile);
    ngPackages.forEach(pk => {
        // TODO: doc for dr.ngAppModule
        const isNgAppModule = pk.longName === appPackageJson.name;
        const dir = Path.relative(Path.dirname(file), isNgAppModule ? pk.realPackagePath : (preserveSymlinks ? pk.packagePath : pk.realPackagePath))
            .replace(/\\/g, '/');
        if (isNgAppModule) {
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
        extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
        include: tsInclude,
        exclude: tsExclude,
        compilerOptions: {
            baseUrl: root,
            typeRoots: [
                Path.resolve(root, 'node_modules/@types'),
                Path.resolve(root, 'node_modules/@dr-types'),
                Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
            ],
            module: 'esnext',
            preserveSymlinks,
            paths: pathMapping
        },
        angularCompilerOptions: {
        // trace: true
        }
    };
    Object.assign(tsjson.compilerOptions, oldJson.compilerOptions);
    Object.assign(tsjson.angularCompilerOptions, oldJson.angularCompilerOptions);
    // console.log(green('change-cli-options - ') + `${file}:\n`, JSON.stringify(tsjson, null, '  '));
    log.info(`${file}:\n${JSON.stringify(tsjson, null, '  ')}`);
    return JSON.stringify(tsjson, null, '  ');
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBT0Esa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFHekIsZ0VBQW9FO0FBRXBFLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFZdEYsU0FBOEIsdUJBQXVCLENBQUMsTUFBa0IsRUFDdkUsY0FBcUMsRUFDckMsYUFBNkQ7O1FBRTdELEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ3pELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Z0JBQ2pCLGNBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDakU7U0FDRDtRQUNELE1BQU0sTUFBTSxD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QUMsT0FBTyxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsd0NBQXdDLENBQUM7YUFDNUQ7WUFDRCxNQUFNLEVBQUUsUUFBUTtZQUNoQixnQkFBZ0I7WUFDaEIsS0FBSyxFQUFFLFdBQVc7U0FDbEI7UUFDRCxzQkFBc0IsRUFBRTtRQUN2QixjQUFjO1NBQ2Q7S0FDRCxDQUFDO0lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM3RSxrR0FBa0c7SUFDbEcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHtBbmd1bGFyQnVpbGRlck9wdGlvbnN9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7XG5cdEJ1aWxkZXJDb25maWd1cmF0aW9uXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtEcmNwQ29uZmlnLCBDb25maWdIYW5kbGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnO1xuaW1wb3J0IHtmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWlufSBmcm9tICcuLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCB7RHJjcFNldHRpbmd9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qge3dhbGtQYWNrYWdlc30gPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cycpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBjanNvbiA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcblx0LyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cblx0YW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuXHRcdGJ1aWxkZXJDb25maWc/OiBCdWlsZGVyQ29uZmlndXJhdGlvbjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4pXG5cdDogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZyxcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcblx0YnVpbGRlckNvbmZpZz86IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPikge1xuXG5cdGZvciAoY29uc3QgcHJvcCBvZiBbJ2RlcGxveVVybCcsICdvdXRwdXRQYXRoJywgJ3N0eWxlcyddKSB7XG5cdFx0Y29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KFtjdXJyUGFja2FnZU5hbWUsIHByb3BdKTtcblx0XHRpZiAodmFsdWUgIT0gbnVsbCkge1xuXHRcdFx0KGJyb3dzZXJPcHRpb25zIGFzIGFueSlbcHJvcF0gPSB2YWx1ZTtcblx0XHRcdGNvbnNvbGUubG9nKGN1cnJQYWNrYWdlTmFtZSArICcgLSBvdmVycmlkZSAlczogJXMnLCBwcm9wLCB2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cdGF3YWl0IGNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxBbmd1bGFyQ29uZmlnSGFuZGxlcj4oKGZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuXHRcdGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG5cdFx0aWYgKGhhbmRsZXIuYW5ndWxhckpzb24pXG5cdFx0XHRyZXR1cm4gaGFuZGxlci5hbmd1bGFySnNvbihicm93c2VyT3B0aW9ucywgYnVpbGRlckNvbmZpZyk7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIG9iajtcblx0fSk7XG5cdGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRpZiAocGtKc29uKSB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuXHRcdGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpO1xuXHR9XG5cdC8vIEJlIGNvbXBhdGlibGUgdG8gb2xkIERSQ1AgYnVpbGQgdG9vbHNcblx0Y29uc3Qge2RlcGxveVVybH0gPSBicm93c2VyT3B0aW9ucztcblx0aWYgKCFjb25maWcuZ2V0KCdzdGF0aWNBc3NldHNVUkwnKSlcblx0XHRjb25maWcuc2V0KCdzdGF0aWNBc3NldHNVUkwnLCBfLnRyaW1FbmQoZGVwbG95VXJsLCAnLycpKTtcblx0aWYgKCFjb25maWcuZ2V0KCdwdWJsaWNQYXRoJykpXG5cdFx0Y29uZmlnLnNldCgncHVibGljUGF0aCcsIGRlcGxveVVybCk7XG5cdGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbn1cblxuaW1wb3J0IHtzeXN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuLy8gaW1wb3J0IFBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2hhY2tUc0NvbmZpZycpO1xuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5mdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKSB7XG5cdGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuXHRjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG5cdHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuXHRcdGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG5cdFx0XHQvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuXHRcdFx0Ly8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG5cdFx0XHQvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcblx0XHRcdC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuXHRcdFx0cGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG5cdFx0XHRcdHJldHVybiBjYWNoZWRUc0NvbmZpZ0ZvcihwYXRoLCByZXMsIGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG5cdFx0fVxuXHR9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuXHR3aGlsZSAodHJ1ZSkge1xuXHRcdGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuXHRcdGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuXHRcdFx0cmV0dXJuIHJlcXVpcmUocGspO1xuXHRcdH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuXHR9XG5cdHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY2xpIHdpbGwgcmVhZCB0c2NvbmZpZy5qc29uIHR3aWNlIGR1ZSB0byBzb21lIGp1bmsgY29kZSwgXG4gKiBsZXQncyBtZW1vaXplIHRoZSByZXN1bHQgYnkgZmlsZSBwYXRoIGFzIGNhY2hlIGtleS5cbiAqL1xuY29uc3QgY2FjaGVkVHNDb25maWdGb3IgPSBfLm1lbW9pemUob3ZlcnJpZGVUc0NvbmZpZyk7XG4vKipcbiAqIExldCdzIG92ZXJyaWRlIHRzY29uZmlnLmpzb24gZmlsZXMgZm9yIEFuZ3VsYXIgYXQgcnV0aW1lIDopXG4gKiAtIFJlYWQgaW50byBtZW1vcnlcbiAqIC0gRG8gbm90IG92ZXJyaWRlIHByb3BlcnRpZXMgb2YgY29tcGlsZXJPcHRpb25zLGFuZ3VsYXJDb21waWxlck9wdGlvbnMgdGhhdCBleGlzdHMgaW4gY3VycmVudCBmaWxlXG4gKiAtIFwiZXh0ZW5kc1wiIG11c3QgYmUgLi4uXG4gKiAtIFRyYXZlcnNlIHBhY2thZ2VzIHRvIGJ1aWxkIHByb3BlciBpbmNsdWRlcyBhbmQgZXhjbHVkZXMgbGlzdCBhbmQgLi4uXG4gKiAtIEZpbmQgZmlsZSB3aGVyZSBBcHBNb2R1bGUgaXMgaW4sIGZpbmQgaXRzIHBhY2thZ2UsIG1vdmUgaXRzIGRpcmVjdG9yeSB0byB0b3Agb2YgaW5jbHVkZXMgbGlzdCxcbiAqIFx0d2hpY2ggZml4ZXMgbmcgY2xpIHdpbmRvd3MgYnVnXG4gKi9cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsXG5cdGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyk6IHN0cmluZyB7XG5cblx0Y29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuXHRjb25zdCBvbGRKc29uID0gY2pzb24ucGFyc2UoY29udGVudCk7XG5cdGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuXHRjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcblx0Y29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIG51bGwsIHBhY2thZ2VVdGlscywgdHJ1ZSk7XG5cdC8vIHZhciBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXSA9IGNvbmZpZygpLnBhY2thZ2VTY29wZXM7XG5cdC8vIHZhciBjb21wb25lbnRzID0gcGtJbmZvLm1vZHVsZU1hcDtcblxuXHR0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG5cdGxldCBuZ1BhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VzID0gcGtJbmZvLmFsbE1vZHVsZXM7XG5cblx0Ly8gY29uc3QgZXhjbHVkZVBrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cdGNvbnN0IGV4Y2x1ZGVQYWNrYWdlOiBEcmNwU2V0dGluZ1snZXhjbHVkZVBhY2thZ2UnXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGFja2FnZScpIHx8IFtdO1xuXHRsZXQgZXhjbHVkZVBhdGg6IHN0cmluZ1tdID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYXRoJykgfHwgW107XG5cdC8vIGlmIChleGNsdWRlUGFja2FnZSlcblx0Ly8gXHRleGNsdWRlUGFja2FnZS5mb3JFYWNoKHBuYW1lID0+IGV4Y2x1ZGVQa1NldC5hZGQocG5hbWUpKTtcblxuXHRuZ1BhY2thZ2VzID0gbmdQYWNrYWdlcy5maWx0ZXIoY29tcCA9PlxuXHRcdCFleGNsdWRlUGFja2FnZS5zb21lKHJlZyA9PiBfLmlzU3RyaW5nKHJlZykgPyBjb21wLmxvbmdOYW1lLmluY2x1ZGVzKHJlZykgOiByZWcudGVzdChjb21wLmxvbmdOYW1lKSkgJiZcblx0XHQoY29tcC5kciAmJiBjb21wLmRyLmFuZ3VsYXJDb21waWxlciB8fCBjb21wLnBhcnNlZE5hbWUuc2NvcGUgPT09ICdiaycpKTtcblxuXHRjb25zdCB0c0luY2x1ZGU6IHN0cmluZ1tdID0gW107XG5cdGNvbnN0IHRzRXhjbHVkZTogc3RyaW5nW10gPSBbXTtcblx0Y29uc3QgYXBwTW9kdWxlRmlsZSA9IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4oUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcblx0Y29uc3QgYXBwUGFja2FnZUpzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoYXBwTW9kdWxlRmlsZSk7XG5cdGlmIChhcHBQYWNrYWdlSnNvbiA9PSBudWxsKVxuXHRcdHRocm93IG5ldyBFcnJvcignRXJyb3IsIGNhbiBub3QgZmluZCBwYWNrYWdlLmpzb24gb2YgJyArIGFwcE1vZHVsZUZpbGUpO1xuXG5cdG5nUGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG5cdFx0Ly8gVE9ETzogZG9jIGZvciBkci5uZ0FwcE1vZHVsZVxuXHRcdGNvbnN0IGlzTmdBcHBNb2R1bGU6IGJvb2xlYW4gPSBway5sb25nTmFtZSA9PT0gYXBwUGFja2FnZUpzb24ubmFtZTtcblx0XHRjb25zdCBkaXIgPSBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSxcblx0XHRcdGlzTmdBcHBNb2R1bGUgPyBway5yZWFsUGFja2FnZVBhdGggOiAocHJlc2VydmVTeW1saW5rcz8gcGsucGFja2FnZVBhdGggOiBway5yZWFsUGFja2FnZVBhdGgpKVxuXHRcdFx0LnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRpZiAoaXNOZ0FwcE1vZHVsZSkge1xuXHRcdFx0dHNJbmNsdWRlLnVuc2hpZnQoZGlyICsgJy8qKi8qLnRzJyk7XG5cdFx0XHQvLyBlbnRyeSBwYWNrYWdlIG11c3QgYmUgYXQgZmlyc3Qgb2YgVFMgaW5jbHVkZSBsaXN0LCBvdGhlcndpc2Ugd2lsbCBlbmNvdW50ZXI6XG5cdFx0XHQvLyBcIkVycm9yOiBObyBOZ01vZHVsZSBtZXRhZGF0YSBmb3VuZCBmb3IgJ0FwcE1vZHVsZSdcblx0XHR9IGVsc2Uge1xuXHRcdFx0dHNJbmNsdWRlLnB1c2goZGlyICsgJy8qKi8qLnRzJyk7XG5cdFx0fVxuXHRcdHRzRXhjbHVkZS5wdXNoKGRpciArICcvdHMnLFxuXHRcdFx0ZGlyICsgJy9zcGVjJyxcblx0XHRcdGRpciArICcvZGlzdCcsXG5cdFx0XHRkaXIgKyAnLyoqLyouc3BlYy50cycpO1xuXG5cdFx0aWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdFx0XHRjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBway5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdHBhdGhNYXBwaW5nW3BrLmxvbmdOYW1lXSA9IFtyZWFsRGlyXTtcblx0XHRcdHBhdGhNYXBwaW5nW3BrLmxvbmdOYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuXHRcdH1cblx0fSk7XG5cdHRzSW5jbHVkZS5wdXNoKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBwcmVzZXJ2ZVN5bWxpbmtzID9cblx0XHRcdCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScgOlxuXHRcdFx0ZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScpKVxuXHRcdC5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuXHR0c0V4Y2x1ZGUucHVzaCgnKiovdGVzdC50cycpO1xuXG5cdGV4Y2x1ZGVQYXRoID0gZXhjbHVkZVBhdGgubWFwKGV4cGF0aCA9PlxuXHRcdFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBleHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG5cdGNvbnNvbGUubG9nKGV4Y2x1ZGVQYXRoKTtcblx0dHNFeGNsdWRlLnB1c2goLi4uZXhjbHVkZVBhdGgpO1xuXG5cdC8vIEltcG9ydGFudCEgdG8gbWFrZSBBbmd1bGFyICYgVHlwZXNjcmlwdCByZXNvbHZlIGNvcnJlY3QgcmVhbCBwYXRoIG9mIHN5bWxpbmsgbGF6eSByb3V0ZSBtb2R1bGVcblx0aWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG5cdFx0Y29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG5cdFx0cGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuXHRcdHBhdGhNYXBwaW5nWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJ1xuXHRcdFx0LCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ1xuXHRcdF07XG5cdH1cblxuXHR2YXIgdHNqc29uOiBhbnkgPSB7XG5cdFx0ZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuXHRcdGluY2x1ZGU6IHRzSW5jbHVkZSxcblx0XHRleGNsdWRlOiB0c0V4Y2x1ZGUsXG5cdFx0Y29tcGlsZXJPcHRpb25zOiB7XG5cdFx0XHRiYXNlVXJsOiByb290LFxuXHRcdFx0dHlwZVJvb3RzOiBbXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC90eXBlcycpXG5cdFx0XHRdLFxuXHRcdFx0bW9kdWxlOiAnZXNuZXh0Jyxcblx0XHRcdHByZXNlcnZlU3ltbGlua3MsXG5cdFx0XHRwYXRoczogcGF0aE1hcHBpbmdcblx0XHR9LFxuXHRcdGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcblx0XHRcdC8vIHRyYWNlOiB0cnVlXG5cdFx0fVxuXHR9O1xuXHRPYmplY3QuYXNzaWduKHRzanNvbi5jb21waWxlck9wdGlvbnMsIG9sZEpzb24uY29tcGlsZXJPcHRpb25zKTtcblx0T2JqZWN0LmFzc2lnbih0c2pzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zKTtcblx0Ly8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG5cdGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcblx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG4iXX0=
