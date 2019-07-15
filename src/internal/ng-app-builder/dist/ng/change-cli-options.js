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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBT0Esa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFHekIsZ0VBQW9FO0FBRXBFLDBEQUFrRTtBQUVsRSxNQUFNLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDNUMsTUFBTSxFQUFDLFlBQVksRUFBQyxHQUFHLE9BQU8sQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBQ3pFLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO0FBQ2hGLE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO0FBWXRGLFNBQThCLHVCQUF1QixDQUFDLE1BQWtCLEVBQ3RFLGNBQXFDLEVBQ3JDLGFBQTZEOztRQUU3RCxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsRUFBRTtZQUN4RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO2dCQUNoQixjQUFzQixDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztnQkFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ2xFO1NBQ0Y7UUFD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LWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHtBbmd1bGFyQnVpbGRlck9wdGlvbnN9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7XG4gIEJ1aWxkZXJDb25maWd1cmF0aW9uXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHtEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtEcmNwQ29uZmlnLCBDb25maWdIYW5kbGVyfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mb30gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnO1xuaW1wb3J0IHtmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWlufSBmcm9tICcuLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCB7RHJjcFNldHRpbmd9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQge2dldFRzRGlyc09mUGFja2FnZX0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3V0aWxzJztcblxuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHt3YWxrUGFja2FnZXN9ID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgY2pzb24gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5leHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJDb25maWdIYW5kbGVyIGV4dGVuZHMgQ29uZmlnSGFuZGxlciB7XG4gIC8qKlxuXHQgKiBZb3UgbWF5IG92ZXJyaWRlIGFuZ3VsYXIuanNvbiBpbiB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBvcHRpb25zIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD4uYXJjaGl0ZWN0Ljxjb21tYW5kPi5vcHRpb25zXG5cdCAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD5cblx0ICovXG4gIGFuZ3VsYXJKc29uKG9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcbiAgICBidWlsZGVyQ29uZmlnPzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+KVxuICA6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG4gIGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG4gIGJ1aWxkZXJDb25maWc/OiBCdWlsZGVyQ29uZmlndXJhdGlvbjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4pIHtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgWydkZXBsb3lVcmwnLCAnb3V0cHV0UGF0aCcsICdzdHlsZXMnXSkge1xuICAgIGNvbnN0IHZhbHVlID0gY29uZmlnLmdldChbY3VyclBhY2thZ2VOYW1lLCBwcm9wXSk7XG4gICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgIChicm93c2VyT3B0aW9ucyBhcyBhbnkpW3Byb3BdID0gdmFsdWU7XG4gICAgICBjb25zb2xlLmxvZyhjdXJyUGFja2FnZU5hbWUgKyAnIC0gb3ZlcnJpZGUgJXM6ICVzJywgcHJvcCwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBhd2FpdCBjb25maWcuY29uZmlnSGFuZGxlck1ncigpLnJ1bkVhY2g8QW5ndWxhckNvbmZpZ0hhbmRsZXI+KChmaWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyAnIHJ1bicsIGN5YW4oZmlsZSkpO1xuICAgIGlmIChoYW5kbGVyLmFuZ3VsYXJKc29uKVxuICAgICAgcmV0dXJuIGhhbmRsZXIuYW5ndWxhckpzb24oYnJvd3Nlck9wdGlvbnMsIGJ1aWxkZXJDb25maWcpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBvYmo7XG4gIH0pO1xuICBjb25zdCBwa0pzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgaWYgKHBrSnNvbikge1xuICAgIGNvbnNvbGUubG9nKGdyZWVuKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBTZXQgZW50cnkgcGFja2FnZSAke2N5YW4ocGtKc29uLm5hbWUpfSdzIG91dHB1dCBwYXRoIHRvIC9gKTtcbiAgICBjb25maWcuc2V0KFsnb3V0cHV0UGF0aE1hcCcsIHBrSnNvbi5uYW1lXSwgJy8nKTtcbiAgfVxuICAvLyBCZSBjb21wYXRpYmxlIHRvIG9sZCBEUkNQIGJ1aWxkIHRvb2xzXG4gIGNvbnN0IHtkZXBsb3lVcmx9ID0gYnJvd3Nlck9wdGlvbnM7XG4gIGlmICghY29uZmlnLmdldCgnc3RhdGljQXNzZXRzVVJMJykpXG4gICAgY29uZmlnLnNldCgnc3RhdGljQXNzZXRzVVJMJywgXy50cmltRW5kKGRlcGxveVVybCwgJy8nKSk7XG4gIGlmICghY29uZmlnLmdldCgncHVibGljUGF0aCcpKVxuICAgIGNvbmZpZy5zZXQoJ3B1YmxpY1BhdGgnLCBkZXBsb3lVcmwpO1xuICBoYWNrVHNDb25maWcoYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG59XG5cbmltcG9ydCB7c3lzfSBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGltcG9ydCBQYXRoID0gcmVxdWlyZSgncGF0aCcpO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdoYWNrVHNDb25maWcnKTtcblxuLy8gSGFjayB0cy5zeXMsIHNvIGZhciBpdCBpcyB1c2VkIHRvIHJlYWQgdHNjb25maWcuanNvblxuZnVuY3Rpb24gaGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsIGNvbmZpZzogRHJjcENvbmZpZykge1xuICBjb25zdCBvbGRSZWFkRmlsZSA9IHN5cy5yZWFkRmlsZTtcbiAgY29uc3QgdHNDb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLnRzQ29uZmlnKTtcblxuICBzeXMucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCByZXM6IHN0cmluZyA9IG9sZFJlYWRGaWxlLmFwcGx5KHN5cywgYXJndW1lbnRzKTtcbiAgICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJykge1xuICAgICAgLy8gQW5ndWxhciBzb21laG93IHJlYWRzIHRzY29uZmlnLmpzb24gdHdpY2UgYW5kIHBhc3NlcyBpbiBgcGF0aGBcbiAgICAgIC8vIHdpdGggZGlmZmVyZW50IHBhdGggc2VwZXJhdG9yIGBcXGAgYW5kIGAvYCBpbiBXaW5kb3dzIFxuICAgICAgLy8gYGNhY2hlZFRzQ29uZmlnRm9yYCBpcyBsb2Rhc2ggbWVtb2l6ZSBmdW5jdGlvbiB3aGljaCBuZWVkcyBhXG4gICAgICAvLyBjb25zaXN0ZW50IGBwYXRoYCB2YWx1ZSBhcyBjYWNoZSBrZXlcbiAgICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoL1xcLy9nLCBQYXRoLnNlcCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICBpZiAocGF0aCA9PT0gdHNDb25maWdGaWxlKVxuICAgICAgICByZXR1cm4gY2FjaGVkVHNDb25maWdGb3IocGF0aCwgcmVzLCBicm93c2VyT3B0aW9ucywgY29uZmlnKTtcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IocmVkKCdjaGFuZ2UtY2xpLW9wdGlvbnMgLSAnKSArIGBSZWFkICR7cGF0aH1gLCBlcnIpO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBBbmd1bGFyIGNsaSB3aWxsIHJlYWQgdHNjb25maWcuanNvbiB0d2ljZSBkdWUgdG8gc29tZSBqdW5rIGNvZGUsIFxuICogbGV0J3MgbWVtb2l6ZSB0aGUgcmVzdWx0IGJ5IGZpbGUgcGF0aCBhcyBjYWNoZSBrZXkuXG4gKi9cbmNvbnN0IGNhY2hlZFRzQ29uZmlnRm9yID0gXy5tZW1vaXplKG92ZXJyaWRlVHNDb25maWcpO1xuLyoqXG4gKiBMZXQncyBvdmVycmlkZSB0c2NvbmZpZy5qc29uIGZpbGVzIGZvciBBbmd1bGFyIGF0IHJ1dGltZSA6KVxuICogLSBSZWFkIGludG8gbWVtb3J5XG4gKiAtIERvIG5vdCBvdmVycmlkZSBwcm9wZXJ0aWVzIG9mIGNvbXBpbGVyT3B0aW9ucyxhbmd1bGFyQ29tcGlsZXJPcHRpb25zIHRoYXQgZXhpc3RzIGluIGN1cnJlbnQgZmlsZVxuICogLSBcImV4dGVuZHNcIiBtdXN0IGJlIC4uLlxuICogLSBUcmF2ZXJzZSBwYWNrYWdlcyB0byBidWlsZCBwcm9wZXIgaW5jbHVkZXMgYW5kIGV4Y2x1ZGVzIGxpc3QgYW5kIC4uLlxuICogLSBGaW5kIGZpbGUgd2hlcmUgQXBwTW9kdWxlIGlzIGluLCBmaW5kIGl0cyBwYWNrYWdlLCBtb3ZlIGl0cyBkaXJlY3RvcnkgdG8gdG9wIG9mIGluY2x1ZGVzIGxpc3QsXG4gKiBcdHdoaWNoIGZpeGVzIG5nIGNsaSB3aW5kb3dzIGJ1Z1xuICovXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLFxuICBicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpOiBzdHJpbmcge1xuXG4gIGNvbnN0IHJvb3QgPSBjb25maWcoKS5yb290UGF0aDtcbiAgY29uc3Qgb2xkSnNvbiA9IGNqc29uLnBhcnNlKGNvbnRlbnQpO1xuICBjb25zdCBwcmVzZXJ2ZVN5bWxpbmtzID0gYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcztcbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSBwcmVzZXJ2ZVN5bWxpbmtzID8gdW5kZWZpbmVkIDoge307XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoY29uZmlnLCBudWxsLCBwYWNrYWdlVXRpbHMsIHRydWUpO1xuICAvLyB2YXIgcGFja2FnZVNjb3Blczogc3RyaW5nW10gPSBjb25maWcoKS5wYWNrYWdlU2NvcGVzO1xuICAvLyB2YXIgY29tcG9uZW50cyA9IHBrSW5mby5tb2R1bGVNYXA7XG5cbiAgdHlwZSBQYWNrYWdlSW5zdGFuY2VzID0gdHlwZW9mIHBrSW5mby5hbGxNb2R1bGVzO1xuICBsZXQgbmdQYWNrYWdlczogUGFja2FnZUluc3RhbmNlcyA9IHBrSW5mby5hbGxNb2R1bGVzO1xuXG4gIC8vIGNvbnN0IGV4Y2x1ZGVQa1NldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBleGNsdWRlUGFja2FnZTogRHJjcFNldHRpbmdbJ2V4Y2x1ZGVQYWNrYWdlJ10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhY2thZ2UnKSB8fCBbXTtcbiAgbGV0IGV4Y2x1ZGVQYXRoOiBzdHJpbmdbXSA9IGNvbmZpZy5nZXQoY3VyclBhY2thZ2VOYW1lICsgJy5leGNsdWRlUGF0aCcpIHx8IFtdO1xuICAvLyBpZiAoZXhjbHVkZVBhY2thZ2UpXG4gIC8vIFx0ZXhjbHVkZVBhY2thZ2UuZm9yRWFjaChwbmFtZSA9PiBleGNsdWRlUGtTZXQuYWRkKHBuYW1lKSk7XG5cbiAgbmdQYWNrYWdlcyA9IG5nUGFja2FnZXMuZmlsdGVyKGNvbXAgPT5cbiAgICAhZXhjbHVkZVBhY2thZ2Uuc29tZShyZWcgPT4gXy5pc1N0cmluZyhyZWcpID8gY29tcC5sb25nTmFtZS5pbmNsdWRlcyhyZWcpIDogcmVnLnRlc3QoY29tcC5sb25nTmFtZSkpICYmXG4gICAgKGNvbXAuZHIgJiYgY29tcC5kci5hbmd1bGFyQ29tcGlsZXIgfHwgY29tcC5wYXJzZWROYW1lLnNjb3BlID09PSAnYmsnIHx8XG4gICAgICBoYXNJc29tb3JwaGljRGlyKGNvbXAuanNvbiwgY29tcC5wYWNrYWdlUGF0aCkpKTtcblxuICBjb25zdCB0c0luY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHRzRXhjbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgYXBwTW9kdWxlRmlsZSA9IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4oUGF0aC5yZXNvbHZlKGJyb3dzZXJPcHRpb25zLm1haW4pKTtcbiAgY29uc3QgYXBwUGFja2FnZUpzb24gPSBsb29rdXBFbnRyeVBhY2thZ2UoYXBwTW9kdWxlRmlsZSk7XG4gIGlmIChhcHBQYWNrYWdlSnNvbiA9PSBudWxsKVxuICAgIHRocm93IG5ldyBFcnJvcignRXJyb3IsIGNhbiBub3QgZmluZCBwYWNrYWdlLmpzb24gb2YgJyArIGFwcE1vZHVsZUZpbGUpO1xuXG4gIG5nUGFja2FnZXMuZm9yRWFjaChwayA9PiB7XG4gICAgLy8gVE9ETzogZG9jIGZvciBkci5uZ0FwcE1vZHVsZVxuICAgIGNvbnN0IGlzTmdBcHBNb2R1bGU6IGJvb2xlYW4gPSBway5sb25nTmFtZSA9PT0gYXBwUGFja2FnZUpzb24ubmFtZTtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlbGF0aXZlKFBhdGguZGlybmFtZShmaWxlKSxcbiAgICAgIGlzTmdBcHBNb2R1bGUgPyBway5yZWFsUGFja2FnZVBhdGggOiAocHJlc2VydmVTeW1saW5rcz8gcGsucGFja2FnZVBhdGggOiBway5yZWFsUGFja2FnZVBhdGgpKVxuICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoaXNOZ0FwcE1vZHVsZSkge1xuICAgICAgdHNJbmNsdWRlLnVuc2hpZnQoZGlyICsgJy8qKi8qLnRzJyk7XG4gICAgICAvLyBlbnRyeSBwYWNrYWdlIG11c3QgYmUgYXQgZmlyc3Qgb2YgVFMgaW5jbHVkZSBsaXN0LCBvdGhlcndpc2Ugd2lsbCBlbmNvdW50ZXI6XG4gICAgICAvLyBcIkVycm9yOiBObyBOZ01vZHVsZSBtZXRhZGF0YSBmb3VuZCBmb3IgJ0FwcE1vZHVsZSdcbiAgICB9IGVsc2Uge1xuICAgICAgdHNJbmNsdWRlLnB1c2goZGlyICsgJy8qKi8qLnRzJyk7XG4gICAgfVxuICAgIHRzRXhjbHVkZS5wdXNoKGRpciArICcvdHMnLFxuICAgICAgZGlyICsgJy9zcGVjJyxcbiAgICAgIGRpciArICcvZGlzdCcsXG4gICAgICBkaXIgKyAnLyoqLyouc3BlYy50cycpO1xuXG4gICAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBway5yZWFsUGFja2FnZVBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nW3BrLmxvbmdOYW1lXSA9IFtyZWFsRGlyXTtcbiAgICAgIHBhdGhNYXBwaW5nW3BrLmxvbmdOYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cbiAgfSk7XG4gIHRzSW5jbHVkZS5wdXNoKFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBwcmVzZXJ2ZVN5bWxpbmtzID9cbiAgICAgICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScgOlxuICAgICAgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC9zaGFyZScpKVxuICAgIC5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICB0c0V4Y2x1ZGUucHVzaCgnKiovdGVzdC50cycpO1xuXG4gIGV4Y2x1ZGVQYXRoID0gZXhjbHVkZVBhdGgubWFwKGV4cGF0aCA9PlxuICAgIFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLCBleHBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIGNvbnNvbGUubG9nKGV4Y2x1ZGVQYXRoKTtcbiAgdHNFeGNsdWRlLnB1c2goLi4uZXhjbHVkZVBhdGgpO1xuXG4gIC8vIEltcG9ydGFudCEgdG8gbWFrZSBBbmd1bGFyICYgVHlwZXNjcmlwdCByZXNvbHZlIGNvcnJlY3QgcmVhbCBwYXRoIG9mIHN5bWxpbmsgbGF6eSByb3V0ZSBtb2R1bGVcbiAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgY29uc3QgZHJjcERpciA9IFBhdGgucmVsYXRpdmUocm9vdCwgZnMucmVhbHBhdGhTeW5jKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlJ10gPSBbZHJjcERpcl07XG4gICAgcGF0aE1hcHBpbmdbJ2RyLWNvbXAtcGFja2FnZS8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICAgIHBhdGhNYXBwaW5nWycqJ10gPSBbJ25vZGVfbW9kdWxlcy8qJ1xuICAgICAgLCAnbm9kZV9tb2R1bGVzL0B0eXBlcy8qJ1xuICAgIF07XG4gIH1cblxuICB2YXIgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuICAgIGluY2x1ZGU6IHRzSW5jbHVkZSxcbiAgICBleGNsdWRlOiB0c0V4Y2x1ZGUsXG4gICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICBiYXNlVXJsOiByb290LFxuICAgICAgdHlwZVJvb3RzOiBbXG4gICAgICAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgICAgICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcbiAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3dmaC90eXBlcycpXG4gICAgICBdLFxuICAgICAgbW9kdWxlOiAnZXNuZXh0JyxcbiAgICAgIHByZXNlcnZlU3ltbGlua3MsXG4gICAgICBwYXRoczogcGF0aE1hcHBpbmdcbiAgICB9LFxuICAgIGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC8vIHRyYWNlOiB0cnVlXG4gICAgfVxuICB9O1xuICBPYmplY3QuYXNzaWduKHRzanNvbi5jb21waWxlck9wdGlvbnMsIG9sZEpzb24uY29tcGlsZXJPcHRpb25zKTtcbiAgT2JqZWN0LmFzc2lnbih0c2pzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zKTtcbiAgLy8gY29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgYCR7ZmlsZX06XFxuYCwgSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKSk7XG4gIGxvZy5pbmZvKGAke2ZpbGV9OlxcbiR7SlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKX1gKTtcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGhhc0lzb21vcnBoaWNEaXIocGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgZnVsbFBhdGggPSBQYXRoLnJlc29sdmUocGFja2FnZVBhdGgsIGdldFRzRGlyc09mUGFja2FnZShwa0pzb24pLmlzb21EaXIpO1xuICB0cnkge1xuICAgIHJldHVybiBmcy5zdGF0U3luYyhmdWxsUGF0aCkuaXNEaXJlY3RvcnkoKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuIl19
