"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const Path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const parse_app_module_1 = require("../utils/parse-app-module");
const utils_1 = require("dr-comp-package/wfh/dist/utils");
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
        (comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk' ||
            hasIsomorphicDir(comp.json, comp.packagePath)));
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
function hasIsomorphicDir(pkJson, packagePath) {
    const fullPath = Path.resolve(packagePath, utils_1.getTsDirsOfPackage(pkJson).isomDir);
    try {
        return fs.statSync(fullPath).isDirectory();
    }
    catch (e) {
        return false;
    }
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBT0Esa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFHekIsZ0VBQW9FO0FBRXBFLDBEQUFrRTtBQUVsRSxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUMsTUFBTSxFQUFDLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBQ3pFLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0FBQ2hGLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0FBWXRGLFNBQThCLHVCQUF1QixDQUFDLE1BQWtCLEVBQ3ZFLGNBQXFDLEVBQ3JDLGFBQTZEOztRQUU3RCxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsRUFBRTtZQUN6RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO2dCQUNqQixjQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2pFO1NBQ0Q7UUFD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Zy1hcHAtYnVpbGRlci9kaXN0L25nL2NoYW5nZS1jbGktb3B0aW9ucy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG5vLWNvbnNvbGUgKi9cbmltcG9ydCB7QW5ndWxhckJ1aWxkZXJPcHRpb25zfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge1xuXHRCdWlsZGVyQ29uZmlndXJhdGlvblxufSBmcm9tICdAYW5ndWxhci1kZXZraXQvYXJjaGl0ZWN0JztcbmltcG9ydCB7RGV2U2VydmVyQnVpbGRlck9wdGlvbnN9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7RHJjcENvbmZpZywgQ29uZmlnSGFuZGxlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7UGFja2FnZUluZm99IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJztcbmltcG9ydCB7ZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbn0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQge0RyY3BTZXR0aW5nfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHtnZXRUc0RpcnNPZlBhY2thZ2V9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC91dGlscyc7XG5cbmNvbnN0IHtjeWFuLCBncmVlbiwgcmVkfSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCB7d2Fsa1BhY2thZ2VzfSA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJyk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuY29uc3QgY3VyclBhY2thZ2VOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcbmNvbnN0IGNqc29uID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyLmNoYW5nZS1jbGktb3B0aW9ucycpO1xuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyQ29uZmlnSGFuZGxlciBleHRlbmRzIENvbmZpZ0hhbmRsZXIge1xuXHQvKipcblx0ICogWW91IG1heSBvdmVycmlkZSBhbmd1bGFyLmpzb24gaW4gdGhpcyBmdW5jdGlvblxuXHQgKiBAcGFyYW0gb3B0aW9ucyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+LmFyY2hpdGVjdC48Y29tbWFuZD4ub3B0aW9uc1xuXHQgKiBAcGFyYW0gYnVpbGRlckNvbmZpZyBBbmd1bGFyIGFuZ3VsYXIuanNvbiBwcm9wZXJ0aWVzIHVuZGVyIHBhdGggPHByb2plY3Q+XG5cdCAqL1xuXHRhbmd1bGFySnNvbihvcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG5cdFx0YnVpbGRlckNvbmZpZz86IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPilcblx0OiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbn1cblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gY2hhbmdlQW5ndWxhckNsaU9wdGlvbnMoY29uZmlnOiBEcmNwQ29uZmlnLFxuXHRicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuXHRidWlsZGVyQ29uZmlnPzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+KSB7XG5cblx0Zm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcblx0XHRjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuXHRcdGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHQoYnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuXHRcdFx0Y29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcblx0XHR9XG5cdH1cblx0YXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcblx0XHRpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcblx0XHRcdHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBidWlsZGVyQ29uZmlnKTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHR9KTtcblx0Y29uc3QgcGtKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG5cdGlmIChwa0pzb24pIHtcblx0XHRjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgU2V0IGVudHJ5IHBhY2thZ2UgJHtjeWFuKHBrSnNvbi5uYW1lKX0ncyBvdXRwdXQgcGF0aCB0byAvYCk7XG5cdFx0Y29uZmlnLnNldChbJ291dHB1dFBhdGhNYXAnLCBwa0pzb24ubmFtZV0sICcvJyk7XG5cdH1cblx0Ly8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuXHRjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuXHRpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuXHRcdGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuXHRpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcblx0XHRjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblx0aGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xufVxuXG5pbXBvcnQge3N5c30gZnJvbSAndHlwZXNjcmlwdCc7XG4vLyBpbXBvcnQgUGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignaGFja1RzQ29uZmlnJyk7XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpIHtcblx0Y29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG5cdGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cblx0c3lzLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3QgcmVzOiBzdHJpbmcgPSBvbGRSZWFkRmlsZS5hcHBseShzeXMsIGFyZ3VtZW50cyk7XG5cdFx0aWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcblx0XHRcdC8vIEFuZ3VsYXIgc29tZWhvdyByZWFkcyB0c2NvbmZpZy5qc29uIHR3aWNlIGFuZCBwYXNzZXMgaW4gYHBhdGhgXG5cdFx0XHQvLyB3aXRoIGRpZmZlcmVudCBwYXRoIHNlcGVyYXRvciBgXFxgIGFuZCBgL2AgaW4gV2luZG93cyBcblx0XHRcdC8vIGBjYWNoZWRUc0NvbmZpZ0ZvcmAgaXMgbG9kYXNoIG1lbW9pemUgZnVuY3Rpb24gd2hpY2ggbmVlZHMgYVxuXHRcdFx0Ly8gY29uc2lzdGVudCBgcGF0aGAgdmFsdWUgYXMgY2FjaGUga2V5XG5cdFx0XHRwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgUGF0aC5zZXApO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0aWYgKHBhdGggPT09IHRzQ29uZmlnRmlsZSlcblx0XHRcdFx0cmV0dXJuIGNhY2hlZFRzQ29uZmlnRm9yKHBhdGgsIHJlcywgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHJldHVybiByZXM7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcblx0XHR9XG5cdH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG5cdHdoaWxlICh0cnVlKSB7XG5cdFx0Y29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG5cdFx0XHRyZXR1cm4gcmVxdWlyZShwayk7XG5cdFx0fSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0bG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQW5ndWxhciBjbGkgd2lsbCByZWFkIHRzY29uZmlnLmpzb24gdHdpY2UgZHVlIHRvIHNvbWUganVuayBjb2RlLCBcbiAqIGxldCdzIG1lbW9pemUgdGhlIHJlc3VsdCBieSBmaWxlIHBhdGggYXMgY2FjaGUga2V5LlxuICovXG5jb25zdCBjYWNoZWRUc0NvbmZpZ0ZvciA9IF8ubWVtb2l6ZShvdmVycmlkZVRzQ29uZmlnKTtcbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyxcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKTogc3RyaW5nIHtcblxuXHRjb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5cdGNvbnN0IG9sZEpzb24gPSBjanNvbi5wYXJzZShjb250ZW50KTtcblx0Y29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG5cdGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuXHRjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgbnVsbCwgcGFja2FnZVV0aWxzLCB0cnVlKTtcblx0Ly8gdmFyIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdID0gY29uZmlnKCkucGFja2FnZVNjb3Blcztcblx0Ly8gdmFyIGNvbXBvbmVudHMgPSBwa0luZm8ubW9kdWxlTWFwO1xuXG5cdHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcblx0bGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuXHQvLyBjb25zdCBleGNsdWRlUGtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Y29uc3QgZXhjbHVkZVBhY2thZ2U6IERyY3BTZXR0aW5nWydleGNsdWRlUGFja2FnZSddID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYWNrYWdlJykgfHwgW107XG5cdGxldCBleGNsdWRlUGF0aDogc3RyaW5nW10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhdGgnKSB8fCBbXTtcblx0Ly8gaWYgKGV4Y2x1ZGVQYWNrYWdlKVxuXHQvLyBcdGV4Y2x1ZGVQYWNrYWdlLmZvckVhY2gocG5hbWUgPT4gZXhjbHVkZVBrU2V0LmFkZChwbmFtZSkpO1xuXG5cdG5nUGFja2FnZXMgPSBuZ1BhY2thZ2VzLmZpbHRlcihjb21wID0+XG5cdFx0IWV4Y2x1ZGVQYWNrYWdlLnNvbWUocmVnID0+IF8uaXNTdHJpbmcocmVnKSA/IGNvbXAubG9uZ05hbWUuaW5jbHVkZXMocmVnKSA6IHJlZy50ZXN0KGNvbXAubG9uZ05hbWUpKSAmJlxuXHRcdChjb21wLmRyICYmIGNvbXAuZHIuYW5ndWxhckNvbXBpbGVyIHx8IGNvbXAucGFyc2VkTmFtZS5zY29wZSA9PT0gJ2JrJyB8fFxuXHRcdFx0aGFzSXNvbW9ycGhpY0Rpcihjb21wLmpzb24sIGNvbXAucGFja2FnZVBhdGgpKSk7XG5cblx0Y29uc3QgdHNJbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuXHRjb25zdCB0c0V4Y2x1ZGU6IHN0cmluZ1tdID0gW107XG5cdGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG5cdGNvbnN0IGFwcFBhY2thZ2VKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKGFwcE1vZHVsZUZpbGUpO1xuXHRpZiAoYXBwUGFja2FnZUpzb24gPT0gbnVsbClcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yLCBjYW4gbm90IGZpbmQgcGFja2FnZS5qc29uIG9mICcgKyBhcHBNb2R1bGVGaWxlKTtcblxuXHRuZ1BhY2thZ2VzLmZvckVhY2gocGsgPT4ge1xuXHRcdC8vIFRPRE86IGRvYyBmb3IgZHIubmdBcHBNb2R1bGVcblx0XHRjb25zdCBpc05nQXBwTW9kdWxlOiBib29sZWFuID0gcGsubG9uZ05hbWUgPT09IGFwcFBhY2thZ2VKc29uLm5hbWU7XG5cdFx0Y29uc3QgZGlyID0gUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksXG5cdFx0XHRpc05nQXBwTW9kdWxlID8gcGsucmVhbFBhY2thZ2VQYXRoIDogKHByZXNlcnZlU3ltbGlua3M/IHBrLnBhY2thZ2VQYXRoIDogcGsucmVhbFBhY2thZ2VQYXRoKSlcblx0XHRcdC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0aWYgKGlzTmdBcHBNb2R1bGUpIHtcblx0XHRcdHRzSW5jbHVkZS51bnNoaWZ0KGRpciArICcvKiovKi50cycpO1xuXHRcdFx0Ly8gZW50cnkgcGFja2FnZSBtdXN0IGJlIGF0IGZpcnN0IG9mIFRTIGluY2x1ZGUgbGlzdCwgb3RoZXJ3aXNlIHdpbGwgZW5jb3VudGVyOlxuXHRcdFx0Ly8gXCJFcnJvcjogTm8gTmdNb2R1bGUgbWV0YWRhdGEgZm91bmQgZm9yICdBcHBNb2R1bGUnXG5cdFx0fSBlbHNlIHtcblx0XHRcdHRzSW5jbHVkZS5wdXNoKGRpciArICcvKiovKi50cycpO1xuXHRcdH1cblx0XHR0c0V4Y2x1ZGUucHVzaChkaXIgKyAnL3RzJyxcblx0XHRcdGRpciArICcvc3BlYycsXG5cdFx0XHRkaXIgKyAnL2Rpc3QnLFxuXHRcdFx0ZGlyICsgJy8qKi8qLnNwZWMudHMnKTtcblxuXHRcdGlmICghcHJlc2VydmVTeW1saW5rcykge1xuXHRcdFx0Y29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgcGsucmVhbFBhY2thZ2VQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRwYXRoTWFwcGluZ1tway5sb25nTmFtZV0gPSBbcmVhbERpcl07XG5cdFx0XHRwYXRoTWFwcGluZ1tway5sb25nTmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcblx0XHR9XG5cdH0pO1xuXHR0c0luY2x1ZGUucHVzaChQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgcHJlc2VydmVTeW1saW5rcyA/XG5cdFx0XHQnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnIDpcblx0XHRcdGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93Zmgvc2hhcmUnKSlcblx0XHQucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcblx0dHNFeGNsdWRlLnB1c2goJyoqL3Rlc3QudHMnKTtcblxuXHRleGNsdWRlUGF0aCA9IGV4Y2x1ZGVQYXRoLm1hcChleHBhdGggPT5cblx0XHRQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSwgZXhwYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuXHRjb25zb2xlLmxvZyhleGNsdWRlUGF0aCk7XG5cdHRzRXhjbHVkZS5wdXNoKC4uLmV4Y2x1ZGVQYXRoKTtcblxuXHQvLyBJbXBvcnRhbnQhIHRvIG1ha2UgQW5ndWxhciAmIFR5cGVzY3JpcHQgcmVzb2x2ZSBjb3JyZWN0IHJlYWwgcGF0aCBvZiBzeW1saW5rIGxhenkgcm91dGUgbW9kdWxlXG5cdGlmICghcHJlc2VydmVTeW1saW5rcykge1xuXHRcdGNvbnN0IGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIGZzLnJlYWxwYXRoU3luYygnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0cGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZSddID0gW2RyY3BEaXJdO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcblx0XHRwYXRoTWFwcGluZ1snKiddID0gWydub2RlX21vZHVsZXMvKidcblx0XHRcdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMvKidcblx0XHRdO1xuXHR9XG5cblx0dmFyIHRzanNvbjogYW55ID0ge1xuXHRcdGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnQGRyLWNvcmUvd2VicGFjazItYnVpbGRlci9jb25maWdzL3RzY29uZmlnLmpzb24nKSxcblx0XHRpbmNsdWRlOiB0c0luY2x1ZGUsXG5cdFx0ZXhjbHVkZTogdHNFeGNsdWRlLFxuXHRcdGNvbXBpbGVyT3B0aW9uczoge1xuXHRcdFx0YmFzZVVybDogcm9vdCxcblx0XHRcdHR5cGVSb290czogW1xuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS93ZmgvdHlwZXMnKVxuXHRcdFx0XSxcblx0XHRcdG1vZHVsZTogJ2VzbmV4dCcsXG5cdFx0XHRwcmVzZXJ2ZVN5bWxpbmtzLFxuXHRcdFx0cGF0aHM6IHBhdGhNYXBwaW5nXG5cdFx0fSxcblx0XHRhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB7XG5cdFx0XHQvLyB0cmFjZTogdHJ1ZVxuXHRcdH1cblx0fTtcblx0T2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLCBvbGRKc29uLmNvbXBpbGVyT3B0aW9ucyk7XG5cdE9iamVjdC5hc3NpZ24odHNqc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnMsIG9sZEpzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucyk7XG5cdC8vIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGAke2ZpbGV9OlxcbmAsIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJykpO1xuXHRsb2cuaW5mbyhgJHtmaWxlfTpcXG4ke0pTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyl9YCk7XG5cdHJldHVybiBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpO1xufVxuXG5mdW5jdGlvbiBoYXNJc29tb3JwaGljRGlyKHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG5cdGNvbnN0IGZ1bGxQYXRoID0gUGF0aC5yZXNvbHZlKHBhY2thZ2VQYXRoLCBnZXRUc0RpcnNPZlBhY2thZ2UocGtKc29uKS5pc29tRGlyKTtcblx0dHJ5IHtcblx0XHRyZXR1cm4gZnMuc3RhdFN5bmMoZnVsbFBhdGgpLmlzRGlyZWN0b3J5KCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRyZXR1cm4gZmFsc2U7XG5cdH1cbn1cbiJdfQ==
