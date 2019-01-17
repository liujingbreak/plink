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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtY2xpLW9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBS0Esa0RBQTRCO0FBQzVCLG1EQUE2QjtBQUM3QiwrQ0FBeUI7QUFHekIsZ0VBQW9FO0FBRXBFLE1BQU0sRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM1QyxNQUFNLEVBQUMsWUFBWSxFQUFDLEdBQUcsT0FBTyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDekUsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGlEQUFpRCxDQUFDLENBQUM7QUFDaEYsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN0QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7QUFZdEYsU0FBOEIsdUJBQXVCLENBQUMsTUFBa0IsRUFDdkUsY0FBcUMsRUFDckMsYUFBMkQ7O1FBRTNELEtBQUssTUFBTSxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ3pELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUU7Z0JBQ2pCLGNBQXNCLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO2dCQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxvQkFBb0IsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7YUFDakU7U0FDRDtRQUNELE1BQU0sTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxDQUF1QixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEVBQUU7WUFDcEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakUsSUFBSSxPQUFPLENBQUMsV0FBVztnQkFDdEIsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQzs7Z0JBRTFELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JFLElBQUksTUFBTSxFQUFFO1lBQ1gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxxQkFBcUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUMxRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNoRDtRQUNELHdDQUF3QztRQUN4QyxNQUFNLEVBQUMsU0FBUyxFQUFDLEdBQUcsY0FBYyxDQUFDO1FBQ25DLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDO1lBQ2pDLE1BQU0sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7WUFDNUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDckMsWUFBWSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0NBQUE7QUE5QkQsMENBOEJDO0FBRUQsMkNBQStCO0FBQy9CLGlDQUFpQztBQUNqQywyREFBMkQ7QUFFM0QsdURBQXVEO0FBQ3ZELFNBQVMsWUFBWSxDQUFDLGNBQXFDLEVBQUUsTUFBa0I7SUFDOUUsTUFBTSxXQUFXLEdBQUcsZ0JBQUcsQ0FBQyxRQUFRLENBQUM7SUFDakMsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFM0QsZ0JBQUcsQ0FBQyxRQUFRLEdBQUcsVUFBUyxJQUFZLEVBQUUsUUFBaUI7UUFDdEQsTUFBTSxHQUFHLEdBQVcsV0FBVyxDQUFDLEtBQUssQ0FBQyxnQkFBRyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDdEIsaUVBQWlFO1lBQ2pFLHdEQUF3RDtZQUN4RCwrREFBK0Q7WUFDL0QsdUNBQXVDO1lBQ3ZDLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDckM7UUFDRCxJQUFJO1lBQ0gsSUFBSSxJQUFJLEtBQUssWUFBWTtnQkFDeEIsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLGNBQWMsRUFBRSxNQUFNLENBQUMsQ0FBQzs7Z0JBRTVELE9BQU8sR0FBRyxDQUFDO1NBQ1o7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsUUFBUSxJQUFJLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUNsRTtJQUNGLENBQUMsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFNBQWlCO0lBQzVDLE9BQU8sSUFBSSxFQUFFO1FBQ1osTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3RCLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ25CO2FBQU0sSUFBSSxTQUFTLEtBQUssSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNqRCxNQUFNO1NBQ047UUFDRCxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNwQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2IsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3REOzs7Ozs7OztHQVFHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsT0FBZSxFQUN0RCxjQUFxQyxFQUFFLE1BQWtCO0lBRXpELE1BQU0sSUFBSSxHQUFHLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQztJQUMvQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDO0lBQ3pELE1BQU0sV0FBVyxHQUE4QixnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDakYsTUFBTSxNQUFNLEdBQWdCLFlBQVksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztJQUszRSxJQUFJLFVBQVUsR0FBcUIsTUFBTSxDQUFDLFVBQVUsQ0FBQztJQUVyRCwwQ0FBMEM7SUFDMUMsTUFBTSxjQUFjLEdBQWtDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQzVHLElBQUksV0FBVyxHQUFhLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxHQUFHLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMvRSxzQkFBc0I7SUFDdEIsNkRBQTZEO0lBRTdELFVBQVUsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQ3JDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNwRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztJQUV6RSxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDL0IsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO0lBQy9CLE1BQU0sYUFBYSxHQUFHLDRDQUF5QixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkYsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDekQsSUFBSSxjQUFjLElBQUksSUFBSTtRQUN6QixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0lBRXpFLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUU7UUFDdkIsK0JBQStCO1FBQy9CLE1BQU0sYUFBYSxHQUFZLEVBQUUsQ0FBQyxRQUFRLEtBQUssY0FBYyxDQUFDLElBQUksQ0FBQztRQUNuRSxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQzNDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQSxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2FBQzVGLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdEIsSUFBSSxhQUFhLEVBQUU7WUFDbEIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLENBQUM7WUFDcEMsK0VBQStFO1lBQy9FLHFEQUFxRDtTQUNyRDthQUFNO1lBQ04sU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsVUFBVSxDQUFDLENBQUM7U0FDakM7UUFDRCxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLEVBQ3pCLEdBQUcsR0FBRyxPQUFPLEVBQ2IsR0FBRyxHQUFHLE9BQU8sRUFDYixHQUFHLEdBQUcsZUFBZSxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3RCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzVFLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztTQUNuRDtJQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0gsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNqRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsd0NBQXdDLENBQUMsQ0FBQztTQUMxRCxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDdkIsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUU3QixXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUN0QyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ2hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDekIsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDO0lBRS9CLGlHQUFpRztJQUNqRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7UUFDdEIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN6RyxXQUFXLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3BELFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLGdCQUFnQjtZQUNqQyx1QkFBdUI7U0FDekIsQ0FBQztLQUNGO0lBRUQsSUFBSSxNQUFNLEdBQVE7UUFDakIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsaURBQWlELENBQUM7UUFDM0UsT0FBTyxFQUFFLFNBQVM7UUFDbEIsT0FBTyxFQUFFLFNBQVM7UUFDbEIsZUFBZSxFQUFFO1lBQ2hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsU0FBUyxFQUFFO2dCQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHFCQUFxQixDQUFDO2dCQUN6QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSx3QkFBd0IsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsd0NBQXdDLENBQUM7YUFDNUQ7WUFDRCxNQUFNLEVBQUUsUUFBUTtZQUNoQixnQkFBZ0I7WUFDaEIsS0FBSyxFQUFFLFdBQVc7U0FDbEI7UUFDRCxzQkFBc0IsRUFBRTtRQUN2QixjQUFjO1NBQ2Q7S0FDRCxDQUFDO0lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUM3RSxrR0FBa0c7SUFDbEcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmcvY2hhbmdlLWNsaS1vcHRpb25zLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0IHtBbmd1bGFyQnVpbGRlck9wdGlvbnN9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7XG5cdEJ1aWxkZXJDb25maWd1cmF0aW9uXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7RHJjcENvbmZpZywgQ29uZmlnSGFuZGxlcn0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7UGFja2FnZUluZm99IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzJztcbmltcG9ydCB7ZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbn0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQge0RyY3BTZXR0aW5nfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuY29uc3Qge2N5YW4sIGdyZWVuLCByZWR9ID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IHt3YWxrUGFja2FnZXN9ID0gcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS93ZmgvbGliL3BhY2thZ2VNZ3IvcGFja2FnZVV0aWxzJyk7XG5jb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuY29uc3QgY2pzb24gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIuY2hhbmdlLWNsaS1vcHRpb25zJyk7XG5leHBvcnQgaW50ZXJmYWNlIEFuZ3VsYXJDb25maWdIYW5kbGVyIGV4dGVuZHMgQ29uZmlnSGFuZGxlciB7XG5cdC8qKlxuXHQgKiBZb3UgbWF5IG92ZXJyaWRlIGFuZ3VsYXIuanNvbiBpbiB0aGlzIGZ1bmN0aW9uXG5cdCAqIEBwYXJhbSBvcHRpb25zIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD4uYXJjaGl0ZWN0Ljxjb21tYW5kPi5vcHRpb25zXG5cdCAqIEBwYXJhbSBidWlsZGVyQ29uZmlnIEFuZ3VsYXIgYW5ndWxhci5qc29uIHByb3BlcnRpZXMgdW5kZXIgcGF0aCA8cHJvamVjdD5cblx0ICovXG5cdGFuZ3VsYXJKc29uKG9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyxcblx0XHRidWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxBbmd1bGFyQnVpbGRlck9wdGlvbnM+KVxuXHQ6IFByb21pc2U8dm9pZD4gfCB2b2lkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBhc3luYyBmdW5jdGlvbiBjaGFuZ2VBbmd1bGFyQ2xpT3B0aW9ucyhjb25maWc6IERyY3BDb25maWcsXG5cdGJyb3dzZXJPcHRpb25zOiBBbmd1bGFyQnVpbGRlck9wdGlvbnMsXG5cdGJ1aWxkZXJDb25maWc/OiBCdWlsZGVyQ29uZmlndXJhdGlvbjxBbmd1bGFyQnVpbGRlck9wdGlvbnM+KSB7XG5cblx0Zm9yIChjb25zdCBwcm9wIG9mIFsnZGVwbG95VXJsJywgJ291dHB1dFBhdGgnLCAnc3R5bGVzJ10pIHtcblx0XHRjb25zdCB2YWx1ZSA9IGNvbmZpZy5nZXQoW2N1cnJQYWNrYWdlTmFtZSwgcHJvcF0pO1xuXHRcdGlmICh2YWx1ZSAhPSBudWxsKSB7XG5cdFx0XHQoYnJvd3Nlck9wdGlvbnMgYXMgYW55KVtwcm9wXSA9IHZhbHVlO1xuXHRcdFx0Y29uc29sZS5sb2coY3VyclBhY2thZ2VOYW1lICsgJyAtIG92ZXJyaWRlICVzOiAlcycsIHByb3AsIHZhbHVlKTtcblx0XHR9XG5cdH1cblx0YXdhaXQgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IoKS5ydW5FYWNoPEFuZ3VsYXJDb25maWdIYW5kbGVyPigoZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG5cdFx0Y29uc29sZS5sb2coZ3JlZW4oJ2NoYW5nZS1jbGktb3B0aW9ucyAtICcpICsgJyBydW4nLCBjeWFuKGZpbGUpKTtcblx0XHRpZiAoaGFuZGxlci5hbmd1bGFySnNvbilcblx0XHRcdHJldHVybiBoYW5kbGVyLmFuZ3VsYXJKc29uKGJyb3dzZXJPcHRpb25zLCBidWlsZGVyQ29uZmlnKTtcblx0XHRlbHNlXG5cdFx0XHRyZXR1cm4gb2JqO1xuXHR9KTtcblx0Y29uc3QgcGtKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG5cdGlmIChwa0pzb24pIHtcblx0XHRjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgU2V0IGVudHJ5IHBhY2thZ2UgJHtjeWFuKHBrSnNvbi5uYW1lKX0ncyBvdXRwdXQgcGF0aCB0byAvYCk7XG5cdFx0Y29uZmlnLnNldChbJ291dHB1dFBhdGhNYXAnLCBwa0pzb24ubmFtZV0sICcvJyk7XG5cdH1cblx0Ly8gQmUgY29tcGF0aWJsZSB0byBvbGQgRFJDUCBidWlsZCB0b29sc1xuXHRjb25zdCB7ZGVwbG95VXJsfSA9IGJyb3dzZXJPcHRpb25zO1xuXHRpZiAoIWNvbmZpZy5nZXQoJ3N0YXRpY0Fzc2V0c1VSTCcpKVxuXHRcdGNvbmZpZy5zZXQoJ3N0YXRpY0Fzc2V0c1VSTCcsIF8udHJpbUVuZChkZXBsb3lVcmwsICcvJykpO1xuXHRpZiAoIWNvbmZpZy5nZXQoJ3B1YmxpY1BhdGgnKSlcblx0XHRjb25maWcuc2V0KCdwdWJsaWNQYXRoJywgZGVwbG95VXJsKTtcblx0aGFja1RzQ29uZmlnKGJyb3dzZXJPcHRpb25zLCBjb25maWcpO1xufVxuXG5pbXBvcnQge3N5c30gZnJvbSAndHlwZXNjcmlwdCc7XG4vLyBpbXBvcnQgUGF0aCA9IHJlcXVpcmUoJ3BhdGgnKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignaGFja1RzQ29uZmlnJyk7XG5cbi8vIEhhY2sgdHMuc3lzLCBzbyBmYXIgaXQgaXMgdXNlZCB0byByZWFkIHRzY29uZmlnLmpzb25cbmZ1bmN0aW9uIGhhY2tUc0NvbmZpZyhicm93c2VyT3B0aW9uczogQW5ndWxhckJ1aWxkZXJPcHRpb25zLCBjb25maWc6IERyY3BDb25maWcpIHtcblx0Y29uc3Qgb2xkUmVhZEZpbGUgPSBzeXMucmVhZEZpbGU7XG5cdGNvbnN0IHRzQ29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy50c0NvbmZpZyk7XG5cblx0c3lzLnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB7XG5cdFx0Y29uc3QgcmVzOiBzdHJpbmcgPSBvbGRSZWFkRmlsZS5hcHBseShzeXMsIGFyZ3VtZW50cyk7XG5cdFx0aWYgKFBhdGguc2VwID09PSAnXFxcXCcpIHtcblx0XHRcdC8vIEFuZ3VsYXIgc29tZWhvdyByZWFkcyB0c2NvbmZpZy5qc29uIHR3aWNlIGFuZCBwYXNzZXMgaW4gYHBhdGhgXG5cdFx0XHQvLyB3aXRoIGRpZmZlcmVudCBwYXRoIHNlcGVyYXRvciBgXFxgIGFuZCBgL2AgaW4gV2luZG93cyBcblx0XHRcdC8vIGBjYWNoZWRUc0NvbmZpZ0ZvcmAgaXMgbG9kYXNoIG1lbW9pemUgZnVuY3Rpb24gd2hpY2ggbmVlZHMgYVxuXHRcdFx0Ly8gY29uc2lzdGVudCBgcGF0aGAgdmFsdWUgYXMgY2FjaGUga2V5XG5cdFx0XHRwYXRoID0gcGF0aC5yZXBsYWNlKC9cXC8vZywgUGF0aC5zZXApO1xuXHRcdH1cblx0XHR0cnkge1xuXHRcdFx0aWYgKHBhdGggPT09IHRzQ29uZmlnRmlsZSlcblx0XHRcdFx0cmV0dXJuIGNhY2hlZFRzQ29uZmlnRm9yKHBhdGgsIHJlcywgYnJvd3Nlck9wdGlvbnMsIGNvbmZpZyk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdHJldHVybiByZXM7XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRjb25zb2xlLmVycm9yKHJlZCgnY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgUmVhZCAke3BhdGh9YCwgZXJyKTtcblx0XHR9XG5cdH07XG59XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG5cdHdoaWxlICh0cnVlKSB7XG5cdFx0Y29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG5cdFx0aWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG5cdFx0XHRyZXR1cm4gcmVxdWlyZShwayk7XG5cdFx0fSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG5cdFx0XHRicmVhaztcblx0XHR9XG5cdFx0bG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG5cdH1cblx0cmV0dXJuIG51bGw7XG59XG5cbi8qKlxuICogQW5ndWxhciBjbGkgd2lsbCByZWFkIHRzY29uZmlnLmpzb24gdHdpY2UgZHVlIHRvIHNvbWUganVuayBjb2RlLCBcbiAqIGxldCdzIG1lbW9pemUgdGhlIHJlc3VsdCBieSBmaWxlIHBhdGggYXMgY2FjaGUga2V5LlxuICovXG5jb25zdCBjYWNoZWRUc0NvbmZpZ0ZvciA9IF8ubWVtb2l6ZShvdmVycmlkZVRzQ29uZmlnKTtcbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyxcblx0YnJvd3Nlck9wdGlvbnM6IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgY29uZmlnOiBEcmNwQ29uZmlnKTogc3RyaW5nIHtcblxuXHRjb25zdCByb290ID0gY29uZmlnKCkucm9vdFBhdGg7XG5cdGNvbnN0IG9sZEpzb24gPSBjanNvbi5wYXJzZShjb250ZW50KTtcblx0Y29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG5cdGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuXHRjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgbnVsbCwgcGFja2FnZVV0aWxzLCB0cnVlKTtcblx0Ly8gdmFyIHBhY2thZ2VTY29wZXM6IHN0cmluZ1tdID0gY29uZmlnKCkucGFja2FnZVNjb3Blcztcblx0Ly8gdmFyIGNvbXBvbmVudHMgPSBwa0luZm8ubW9kdWxlTWFwO1xuXG5cdHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcblx0bGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuXHQvLyBjb25zdCBleGNsdWRlUGtTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblx0Y29uc3QgZXhjbHVkZVBhY2thZ2U6IERyY3BTZXR0aW5nWydleGNsdWRlUGFja2FnZSddID0gY29uZmlnLmdldChjdXJyUGFja2FnZU5hbWUgKyAnLmV4Y2x1ZGVQYWNrYWdlJykgfHwgW107XG5cdGxldCBleGNsdWRlUGF0aDogc3RyaW5nW10gPSBjb25maWcuZ2V0KGN1cnJQYWNrYWdlTmFtZSArICcuZXhjbHVkZVBhdGgnKSB8fCBbXTtcblx0Ly8gaWYgKGV4Y2x1ZGVQYWNrYWdlKVxuXHQvLyBcdGV4Y2x1ZGVQYWNrYWdlLmZvckVhY2gocG5hbWUgPT4gZXhjbHVkZVBrU2V0LmFkZChwbmFtZSkpO1xuXG5cdG5nUGFja2FnZXMgPSBuZ1BhY2thZ2VzLmZpbHRlcihjb21wID0+XG5cdFx0IWV4Y2x1ZGVQYWNrYWdlLnNvbWUocmVnID0+IF8uaXNTdHJpbmcocmVnKSA/IGNvbXAubG9uZ05hbWUuaW5jbHVkZXMocmVnKSA6IHJlZy50ZXN0KGNvbXAubG9uZ05hbWUpKSAmJlxuXHRcdChjb21wLmRyICYmIGNvbXAuZHIuYW5ndWxhckNvbXBpbGVyIHx8IGNvbXAucGFyc2VkTmFtZS5zY29wZSA9PT0gJ2JrJykpO1xuXG5cdGNvbnN0IHRzSW5jbHVkZTogc3RyaW5nW10gPSBbXTtcblx0Y29uc3QgdHNFeGNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuXHRjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcblx0aWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG5cdFx0dGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cblx0bmdQYWNrYWdlcy5mb3JFYWNoKHBrID0+IHtcblx0XHQvLyBUT0RPOiBkb2MgZm9yIGRyLm5nQXBwTW9kdWxlXG5cdFx0Y29uc3QgaXNOZ0FwcE1vZHVsZTogYm9vbGVhbiA9IHBrLmxvbmdOYW1lID09PSBhcHBQYWNrYWdlSnNvbi5uYW1lO1xuXHRcdGNvbnN0IGRpciA9IFBhdGgucmVsYXRpdmUoUGF0aC5kaXJuYW1lKGZpbGUpLFxuXHRcdFx0aXNOZ0FwcE1vZHVsZSA/IHBrLnJlYWxQYWNrYWdlUGF0aCA6IChwcmVzZXJ2ZVN5bWxpbmtzPyBway5wYWNrYWdlUGF0aCA6IHBrLnJlYWxQYWNrYWdlUGF0aCkpXG5cdFx0XHQucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdGlmIChpc05nQXBwTW9kdWxlKSB7XG5cdFx0XHR0c0luY2x1ZGUudW5zaGlmdChkaXIgKyAnLyoqLyoudHMnKTtcblx0XHRcdC8vIGVudHJ5IHBhY2thZ2UgbXVzdCBiZSBhdCBmaXJzdCBvZiBUUyBpbmNsdWRlIGxpc3QsIG90aGVyd2lzZSB3aWxsIGVuY291bnRlcjpcblx0XHRcdC8vIFwiRXJyb3I6IE5vIE5nTW9kdWxlIG1ldGFkYXRhIGZvdW5kIGZvciAnQXBwTW9kdWxlJ1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0c0luY2x1ZGUucHVzaChkaXIgKyAnLyoqLyoudHMnKTtcblx0XHR9XG5cdFx0dHNFeGNsdWRlLnB1c2goZGlyICsgJy90cycsXG5cdFx0XHRkaXIgKyAnL3NwZWMnLFxuXHRcdFx0ZGlyICsgJy9kaXN0Jyxcblx0XHRcdGRpciArICcvKiovKi5zcGVjLnRzJyk7XG5cblx0XHRpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcblx0XHRcdGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHJvb3QsIHBrLnJlYWxQYWNrYWdlUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0cGF0aE1hcHBpbmdbcGsubG9uZ05hbWVdID0gW3JlYWxEaXJdO1xuXHRcdFx0cGF0aE1hcHBpbmdbcGsubG9uZ05hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG5cdFx0fVxuXHR9KTtcblx0dHNJbmNsdWRlLnB1c2goUGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIHByZXNlcnZlU3ltbGlua3MgP1xuXHRcdFx0J25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJyA6XG5cdFx0XHRmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3NoYXJlJykpXG5cdFx0LnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG5cdHRzRXhjbHVkZS5wdXNoKCcqKi90ZXN0LnRzJyk7XG5cblx0ZXhjbHVkZVBhdGggPSBleGNsdWRlUGF0aC5tYXAoZXhwYXRoID0+XG5cdFx0UGF0aC5yZWxhdGl2ZShQYXRoLmRpcm5hbWUoZmlsZSksIGV4cGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcblx0Y29uc29sZS5sb2coZXhjbHVkZVBhdGgpO1xuXHR0c0V4Y2x1ZGUucHVzaCguLi5leGNsdWRlUGF0aCk7XG5cblx0Ly8gSW1wb3J0YW50ISB0byBtYWtlIEFuZ3VsYXIgJiBUeXBlc2NyaXB0IHJlc29sdmUgY29ycmVjdCByZWFsIHBhdGggb2Ygc3ltbGluayBsYXp5IHJvdXRlIG1vZHVsZVxuXHRpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcblx0XHRjb25zdCBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShyb290LCBmcy5yZWFscGF0aFN5bmMoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdHBhdGhNYXBwaW5nWydkci1jb21wLXBhY2thZ2UnXSA9IFtkcmNwRGlyXTtcblx0XHRwYXRoTWFwcGluZ1snZHItY29tcC1wYWNrYWdlLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG5cdFx0cGF0aE1hcHBpbmdbJyonXSA9IFsnbm9kZV9tb2R1bGVzLyonXG5cdFx0XHQsICdub2RlX21vZHVsZXMvQHR5cGVzLyonXG5cdFx0XTtcblx0fVxuXG5cdHZhciB0c2pzb246IGFueSA9IHtcblx0XHRleHRlbmRzOiByZXF1aXJlLnJlc29sdmUoJ0Bkci1jb3JlL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG5cdFx0aW5jbHVkZTogdHNJbmNsdWRlLFxuXHRcdGV4Y2x1ZGU6IHRzRXhjbHVkZSxcblx0XHRjb21waWxlck9wdGlvbnM6IHtcblx0XHRcdGJhc2VVcmw6IHJvb3QsXG5cdFx0XHR0eXBlUm9vdHM6IFtcblx0XHRcdFx0UGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG5cdFx0XHRcdFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpLFxuXHRcdFx0XHRQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2Uvd2ZoL3R5cGVzJylcblx0XHRcdF0sXG5cdFx0XHRtb2R1bGU6ICdlc25leHQnLFxuXHRcdFx0cHJlc2VydmVTeW1saW5rcyxcblx0XHRcdHBhdGhzOiBwYXRoTWFwcGluZ1xuXHRcdH0sXG5cdFx0YW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuXHRcdFx0Ly8gdHJhY2U6IHRydWVcblx0XHR9XG5cdH07XG5cdE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucywgb2xkSnNvbi5jb21waWxlck9wdGlvbnMpO1xuXHRPYmplY3QuYXNzaWduKHRzanNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zLCBvbGRKc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnMpO1xuXHQvLyBjb25zb2xlLmxvZyhncmVlbignY2hhbmdlLWNsaS1vcHRpb25zIC0gJykgKyBgJHtmaWxlfTpcXG5gLCBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpKTtcblx0bG9nLmluZm8oYCR7ZmlsZX06XFxuJHtKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpfWApO1xuXHRyZXR1cm4gSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKTtcbn1cbiJdfQ==
