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
        // extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
        include: tsInclude,
        exclude: tsExclude,
        compilerOptions: Object.assign({}, require('../../misc/tsconfig.app.json').compilerOptions, { baseUrl: root, typeRoots: [
                Path.resolve(root, 'node_modules/@types'),
                Path.resolve(root, 'node_modules/@dr-types'),
                Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
            ], module: 'esnext', preserveSymlinks, paths: pathMapping }),
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBT0Esa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFHekIsZ0VBQW9FO0FBRXBFLDBEQUFrRTtBQUVsRSxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUMsTUFBTSxFQUFDLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBQ3pFLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0FBQ2hGLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0FBWXRGLFNBQThCLHVCQUF1QixDQUFDLE1BQWtCLEVBQ3ZFLGNBQXFDLEVBQ3JDLGFBQTZEOztRQUU3RCxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsRUFBRTtZQUN6RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO2dCQUNqQixjQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2pFO1NBQ0Q7UUFD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YXBwLWJ1aWxkZXIvZGlzdC9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQge0FuZ3VsYXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtcblx0QnVpbGRlckNvbmZpZ3VyYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQge0RldlNlcnZlckJ1aWxkZXJPcHRpb25zfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge0RyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge1BhY2thZ2VJbmZvfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cyc7XG5pbXBvcnQge2ZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW59IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHtEcmNwU2V0dGluZ30gZnJvbSAnLi4vY29uZmlndXJhYmxlJztcbmltcG9ydCB7Z2V0VHNEaXJzT2ZQYWNrYWdlfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdXRpbHMnO1xuXG5jb25zdCB7Y3lhbiwgZ3JlZW4sIHJlZH0gPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3Qge3dhbGtQYWNrYWdlc30gPSByZXF1aXJlKCdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cycpO1xuY29uc3QgcGFja2FnZVV0aWxzID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcbmNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5jb25zdCBjanNvbiA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci5jaGFuZ2UtY2xpLW9wdGlvbnMnKTtcbmV4cG9ydCBpbnRlcmZhY2UgQW5ndWxhckNvbmZpZ0hhbmRsZXIgZXh0ZW5kcyBDb25maWdIYW5kbGVyIHtcblx0LyoqXG5cdCAqIFlvdSBtYXkgb3ZlcnJpZGUgYW5ndWxhci5qc29uIGluIHRoaXMgZnVuY3Rpb25cblx0ICogQHBhcmFtIG9wdGlvbnMgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0Pi5hcmNoaXRlY3QuPGNvbW1hbmQ+Lm9wdGlvbnNcblx0ICogQHBhcmFtIGJ1aWxkZXJDb25maWcgQW5ndWxhciBhbmd1bGFyLmpzb24gcHJvcGVydGllcyB1bmRlciBwYXRoIDxwcm9qZWN0PlxuXHQgKi9cblx0YW5ndWxhckpzb24ob3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLFxuXHRcdGJ1aWxkZXJDb25maWc/OiBCdWlsZGVyQ29uZmlndXJhdGlvbjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4pXG5cdDogUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFzeW5jIGZ1bmN0aW9uIGNoYW5nZUFuZ3VsYXJDbGlPcHRpb25zKGNvbmZpZzogRHJjcENvbmZpZyxcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcblx0YnVpbGRlckNvbmZpZz86IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPikge1xuXG5cdGZvciAoY29uc3QgcHJvcCBvZiBbJ2RlcGxveVVybCcsICdvdXRwdXRQYXRoJywgJ3N0eWxlcyddKSB7XG5cdFx0Y29uc3QgdmFsdWUgPSBjb25maWcuZ2V0KFtjdXJyUGFja2FnZU5hbWUsIHByb3BdKTtcblx0XHRpZiAodmFsdWUgIT0gbnVsbCkge1xuXHRcdFx0KGJyb3dzZXJPcHRpb25zIGFzIGFueSlbcHJvcF0gPSB2YWx1ZTtcblx0XHRcdGNvbnNvbGUubG9nKGN1cnJQYWNrYWdlTmFtZSArICcgLSBvdmVycmlkZSAlczogJXMnLCBwcm9wLCB2YWx1ZSk7XG5cdFx0fVxuXHR9XG5cdGF3YWl0IGNvbmZpZy5jb25maWdIYW5kbGVyTWdyKCkucnVuRWFjaDxBbmd1bGFyQ29uZmlnSGFuZGxlcj4oKGZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuXHRcdGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArICcgcnVuJywgY3lhbihmaWxlKSk7XG5cdFx0aWYgKGhhbmRsZXIuYW5ndWxhckpzb24pXG5cdFx0XHRyZXR1cm4gaGFuZGxlci5hbmd1bGFySnNvbihicm93c2VyT3B0aW9ucywgYnVpbGRlckNvbmZpZyk7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIG9iajtcblx0fSk7XG5cdGNvbnN0IHBrSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRpZiAocGtKc29uKSB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFNldCBlbnRyeSBwYWNrYWdlICR7Y3lhbihwa0pzb24ubmFtZSl9J3Mgb3V0cHV0IHBhdGggdG8gL2ApO1xuXHRcdGNvbmZpZy5zZXQoWydvdXRwdXRQYXRoTWFwJywgcGtKc29uLm5hbWVdLCAnLycpO1xuXHR9XG5cdC8vIEJlIGNvbXBhdGlibGUgdG8gb2xkIERSQ1AgYnVpbGQgdG9vbHNcblx0Y29uc3Qge2RlcGxveVVybH0gPSBicm93c2VyT3B0aW9ucztcblx0aWYgKCFjb25maWcuZ2V0KCdzdGF0aWNBc3NldHNVUkwnKSlcblx0XHRjb25maWcuc2V0KCdzdGF0aWNBc3NldHNVUkwnLCBfLnRyaW1FbmQoZGVwbG95VXJsLCAnLycpKTtcblx0aWYgKCFjb25maWcuZ2V0KCdwdWJsaWNQYXRoJykpXG5cdFx0Y29uZmlnLnNldCgncHVibGljUGF0aCcsIGRlcGxveVVybCk7XG5cdGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbn1cblxuaW1wb3J0IHtzeXN9IGZyb20gJ3R5cGVzY3JpcHQnO1xuLy8gaW1wb3J0IFBhdGggPSByZXF1aXJlKCdwYXRoJyk7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2hhY2tUc0NvbmZpZycpO1xuXG4vLyBIYWNrIHRzLnN5cywgc28gZmFyIGl0IGlzIHVzZWQgdG8gcmVhZCB0c2NvbmZpZy5qc29uXG5mdW5jdGlvbiBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKSB7XG5cdGNvbnN0IG9sZFJlYWRGaWxlID0gc3lzLnJlYWRGaWxlO1xuXHRjb25zdCB0c0NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMudHNDb25maWcpO1xuXG5cdHN5cy5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcge1xuXHRcdGNvbnN0IHJlczogc3RyaW5nID0gb2xkUmVhZEZpbGUuYXBwbHkoc3lzLCBhcmd1bWVudHMpO1xuXHRcdGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKSB7XG5cdFx0XHQvLyBBbmd1bGFyIHNvbWVob3cgcmVhZHMgdHNjb25maWcuanNvbiB0d2ljZSBhbmQgcGFzc2VzIGluIGBwYXRoYFxuXHRcdFx0Ly8gd2l0aCBkaWZmZXJlbnQgcGF0aCBzZXBlcmF0b3IgYFxcYCBhbmQgYC9gIGluIFdpbmRvd3MgXG5cdFx0XHQvLyBgY2FjaGVkVHNDb25maWdGb3JgIGlzIGxvZGFzaCBtZW1vaXplIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIGFcblx0XHRcdC8vIGNvbnNpc3RlbnQgYHBhdGhgIHZhbHVlIGFzIGNhY2hlIGtleVxuXHRcdFx0cGF0aCA9IHBhdGgucmVwbGFjZSgvXFwvL2csIFBhdGguc2VwKTtcblx0XHR9XG5cdFx0dHJ5IHtcblx0XHRcdGlmIChwYXRoID09PSB0c0NvbmZpZ0ZpbGUpXG5cdFx0XHRcdHJldHVybiBjYWNoZWRUc0NvbmZpZ0ZvcihwYXRoLCByZXMsIGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xuXHRcdFx0ZWxzZVxuXHRcdFx0XHRyZXR1cm4gcmVzO1xuXHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0Y29uc29sZS5lcnJvcihyZWQoJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYFJlYWQgJHtwYXRofWAsIGVycik7XG5cdFx0fVxuXHR9O1xufVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuXHR3aGlsZSAodHJ1ZSkge1xuXHRcdGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuXHRcdGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuXHRcdFx0cmV0dXJuIHJlcXVpcmUocGspO1xuXHRcdH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuXHRcdFx0YnJlYWs7XG5cdFx0fVxuXHRcdGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuXHR9XG5cdHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIEFuZ3VsYXIgY2xpIHdpbGwgcmVhZCB0c2NvbmZpZy5qc29uIHR3aWNlIGR1ZSB0byBzb21lIGp1bmsgY29kZSwgXG4gKiBsZXQncyBtZW1vaXplIHRoZSByZXN1bHQgYnkgZmlsZSBwYXRoIGFzIGNhY2hlIGtleS5cbiAqL1xuY29uc3QgY2FjaGVkVHNDb25maWdGb3IgPSBfLm1lbW9pemUob3ZlcnJpZGVUc0NvbmZpZyk7XG4vKipcbiAqIExldCdzIG92ZXJyaWRlIHRzY29uZmlnLmpzb24gZmlsZXMgZm9yIEFuZ3VsYXIgYXQgcnV0aW1lIDopXG4gKiAtIFJlYWQgaW50byBtZW1vcnlcbiAqIC0gRG8gbm90IG92ZXJyaWRlIHByb3BlcnRpZXMgb2YgY29tcGlsZXJPcHRpb25zLGFuZ3VsYXJDb21waWxlck9wdGlvbnMgdGhhdCBleGlzdHMgaW4gY3VycmVudCBmaWxlXG4gKiAtIFwiZXh0ZW5kc1wiIG11c3QgYmUgLi4uXG4gKiAtIFRyYXZlcnNlIHBhY2thZ2VzIHRvIGJ1aWxkIHByb3BlciBpbmNsdWRlcyBhbmQgZXhjbHVkZXMgbGlzdCBhbmQgLi4uXG4gKiAtIEZpbmQgZmlsZSB3aGVyZSBBcHBNb2R1bGUgaXMgaW4sIGZpbmQgaXRzIHBhY2thZ2UsIG1vdmUgaXRzIGRpcmVjdG9yeSB0byB0b3Agb2YgaW5jbHVkZXMgbGlzdCxcbiAqIFx0d2hpY2ggZml4ZXMgbmcgY2xpIHdpbmRvd3MgYnVnXG4gKi9cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsXG5cdGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZyk6IHN0cmluZyB7XG5cblx0Y29uc3Qgcm9vdCA9IGNvbmZpZygpLnJvb3RQYXRoO1xuXHRjb25zdCBvbGRKc29uID0gY2pzb24ucGFyc2UoY29udGVudCk7XG5cdGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuXHRjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcblx0Y29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIG51bGwsIHBhY2thZ2VVdGlscywgdHJ1ZSk7XG5cdC8vIHZhciBwYWNrYWdlU2NvcGVzOiBzdHJpbmdbXSA9IGNvbmZpZygpLnBhY2thZ2VTY29wZXM7XG5cdC8vIHZhciBjb21wb25lbnRzID0gcGtJbmZvLm1vZHVsZU1hcDtcblxuXHR0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG5cdGxldCBuZ1BhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VzID0gcGtJbmZvLmFsbE1vZHVsZXM7XG5cblx0Ly8gY29uc3QgZXhjbHVkZVBrU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cdGNvbnN0IGV4Y2x1ZGVQYWNrYWdlOiBEcmNwU2V0dGluZ1snZXhjbHVkZVBhY2thZ2UnXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGFja2FnZScpIHx8IFtdO1xuXHRsZXQgZXhjbHVkZVBhdGg6IHN0cmluZ1tdID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYXRoJykgfHwgW107XG5cdC8vIGlmIChleGNsdWRlUGFja2FnZSlcblx0Ly8gXHRleGNsdWRlUGFja2FnZS5mb3JFYWNoKHBuYW1lID0+IGV4Y2x1ZGVQa1NldC5hZGQocG5hbWUpKTtcblxuXHRuZ1BhY2thZ2VzID0gbmdQYWNrYWdlcy5maWx0ZXIoY29tcCA9PlxuXHRcdCFleGNsdWRlUGFja2FnZS5zb21lKHJlZyA9PiBfLmlzU3RyaW5nKHJlZykgPyBjb21wLmxvbmdOYW1lLmluY2x1ZGVzKHJlZykgOiByZWcudGVzdChjb21wLmxvbmdOYW1lKSkgJiZcblx0XHQoY29tcC5kciAmJiBjb21wLmRyLmFuZ3VsYXJDb21waWxlciB8fCBjb21wLnBhcnNlZE5hbWUuc2NvcGUgPT09ICdiaycgfHxcblx0XHRcdGhhc0lzb21vcnBoaWNEaXIoY29tcC5qc29uLCBjb21wLnBhY2thZ2VQYXRoKSkpO1xuXG5cdGNvbnN0IHRzSW5jbHVkZTogc3RyaW5nW10gPSBbXTtcblx0Y29uc3QgdHNFeGNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuXHRjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcblx0aWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cblx0bmdQYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcblx0XHQvLyBUT0RPOiBkb2MgZm9yIGRyLm5nQXBwTW9kdWxlXG5cdFx0Y29uc3QgaXNOZ0FwcE1vZHVsZTogYm9vbGVhbiA9IHBrLmxvbmdOYW1lID09PSBhcHBQYWNrYWdlSnNvbi5uYW1lO1xuXHRcdGNvbnN0IGRpciA9IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLFxuXHRcdFx0aXNOZ0FwcE1vZHVsZSA/IHBrLnJlYWxQYWNrYWdlUGF0aCA6IChwcmVzZXJ2ZVN5bWxpbmtzPyBway5wYWNrYWdlUGF0aCA6IHBrLnJlYWxQYWNrYWdlUGF0aCkpXG5cdFx0XHQucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdGlmIChpc05nQXBwTW9kdWxlKSB7XG5cdFx0XHR0c0luY2x1ZGUudW5zaGlmdChkaXIgKyAnLyoqLyoudHMnKTtcblx0XHRcdC8vIGVudHJ5IHBhY2thZ2UgbXVzdCBiZSBhdCBmaXJzdCBvZiBUUyBpbmNsdWRlIGxpc3QsIG90aGVyd2lzZSB3aWxsIGVuY291bnRlcjpcblx0XHRcdC8vIFwiRXJyb3I6IE5vIE5nTW9kdWxlIG1ldGFkYXRhIGZvdW5kIGZvciAnQXBwTW9kdWxlJ1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0c0luY2x1ZGUucHVzaChkaXIgKyAnLyoqLyoudHMnKTtcblx0XHR9XG5cdFx0dHNFeGNsdWRlLnB1c2goZGlyICsgJy90cycsXG5cdFx0XHRkaXIgKyAnL3NwZWMnLFxuXHRcdFx0ZGlyICsgJy9kaXN0Jyxcblx0XHRcdGRpciArICcvKiovKi5zcGVjLnRzJyk7XG5cblx0XHRpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcblx0XHRcdGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIHBrLnJlYWxQYWNrYWdlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0cGF0aE1hcHBpbmdbcGsubG9uZ05hbWVdID0gW3JlYWxEaXJdO1xuXHRcdFx0cGF0aE1hcHBpbmdbcGsubG9uZ05hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG5cdFx0fVxuXHR9KTtcblx0dHNJbmNsdWRlLnB1c2goUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIHByZXNlcnZlU3ltbGlua3MgP1xuXHRcdFx0J25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJyA6XG5cdFx0XHRmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJykpXG5cdFx0LnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG5cdHRzRXhjbHVkZS5wdXNoKCcqKi90ZXN0LnRzJyk7XG5cblx0ZXhjbHVkZVBhdGggPSBleGNsdWRlUGF0aC5tYXAoZXhwYXRoID0+XG5cdFx0UGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGV4cGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcblx0Y29uc29sZS5sb2coZXhjbHVkZVBhdGgpO1xuXHR0c0V4Y2x1ZGUucHVzaCguLi5leGNsdWRlUGF0aCk7XG5cblx0Ly8gSW1wb3J0YW50ISB0byBtYWtlIEFuZ3VsYXIgJiBUeXBlc2NyaXB0IHJlc29sdmUgY29ycmVjdCByZWFsIHBhdGggb2Ygc3ltbGluayBsYXp5IHJvdXRlIG1vZHVsZVxuXHRpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcblx0XHRjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcblx0XHRwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG5cdFx0cGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonXG5cdFx0XHQsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXG5cdFx0XTtcblx0fVxuXG5cdHZhciB0c2pzb246IGFueSA9IHtcblx0XHQvLyBleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG5cdFx0aW5jbHVkZTogdHNJbmNsdWRlLFxuXHRcdGV4Y2x1ZGU6IHRzRXhjbHVkZSxcblx0XHRjb21waWxlck9wdGlvbnM6IHtcblx0XHRcdC4uLnJlcXVpcmUoJy4uLy4uL21pc2MvdHNjb25maWcuYXBwLmpzb24nKS5jb21waWxlck9wdGlvbnMsXG5cdFx0XHRiYXNlVXJsOiByb290LFxuXHRcdFx0dHlwZVJvb3RzOiBbXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC90eXBlcycpXG5cdFx0XHRdLFxuXHRcdFx0bW9kdWxlOiAnZXNuZXh0Jyxcblx0XHRcdHByZXNlcnZlU3ltbGlua3MsXG5cdFx0XHRwYXRoczogcGF0aE1hcHBpbmdcblx0XHR9LFxuXHRcdGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcblx0XHRcdC8vIHRyYWNlOiB0cnVlXG5cdFx0fVxuXHR9O1xuXHRPYmplY3QuYXNzaWduKHRzanNvbi5jb21waWxlck9wdGlvbnMsIG9sZEpzb24uY29tcGlsZXJPcHRpb25zKTtcblx0T2JqZWN0LmFzc2lnbih0c2pzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zKTtcblx0Ly8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG5cdGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcblx0cmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGhhc0lzb21vcnBoaWNEaXIocGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcblx0Y29uc3QgZnVsbFBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGdldFRzRGlyc09mUGFja2FnZShwa0pzb24pLmlzb21EaXIpO1xuXHR0cnkge1xuXHRcdHJldHVybiBmcy5zdGF0U3luYyhmdWxsUGF0aCkuaXNEaXJlY3RvcnkoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxufVxuIl19
