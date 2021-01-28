"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTsConfig = void 0;
// import { DrcpConfig } from '@wfh/plink/wfh/dist/config-handler';
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const tsconfig_app_json_1 = __importDefault(require("../../misc/tsconfig.app.json"));
const parse_app_module_1 = require("../utils/parse-app-module");
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
function createTsConfig(file, browserOptions, config, packageInfo, reportDir) {
    // const reportFile = config.resolve('destDir', 'ng-app-builder.report', 'tsconfig.json');
    return overrideTsConfig(file, packageInfo, browserOptions, config, reportDir);
}
exports.createTsConfig = createTsConfig;
/**
 * Let's override tsconfig.json files for Angular at rutime :)
 * - Read into memory
 * - Do not override properties of compilerOptions,angularCompilerOptions that exists in current file
 * - "extends" must be ...
 * - Traverse packages to build proper includes and excludes list and ...
 * - Find file where AppModule is in, find its package, move its directory to top of includes list,
 * 	which fixes ng cli windows bug
 */
function overrideTsConfig(file, pkInfo, browserOptions, config, reportDir) {
    const cwd = process.cwd();
    const result = typescript_1.default.parseConfigFileTextToJson(file, fs.readFileSync(file, 'utf8'));
    if (result.error) {
        // log.error(result.error);
        throw new Error(`${file} contains incorrect configuration:\n${result.error}`);
    }
    const oldJson = result.config;
    const preserveSymlinks = browserOptions.preserveSymlinks;
    const pathMapping = preserveSymlinks ? undefined : {};
    // type PackageInstances = typeof pkInfo.allModules;
    // let ngPackages: PackageInstances = pkInfo.allModules;
    const appModuleFile = parse_app_module_1.findAppModuleFileFromMain(path_1.default.resolve(browserOptions.main));
    const appPackageJson = lookupEntryPackage(appModuleFile);
    if (appPackageJson == null)
        throw new Error('Error, can not find package.json of ' + appModuleFile);
    if (!preserveSymlinks) {
        for (const pk of package_mgr_1.getState().srcPackages.values()) {
            const realDir = path_1.default.relative(cwd, pk.realPath).replace(/\\/g, '/');
            pathMapping[pk.name] = [realDir];
            pathMapping[pk.name + '/*'] = [realDir + '/*'];
        }
        const plink = package_mgr_1.getState().linkedDrcp;
        if (plink) {
            pathMapping[plink.name] = [plink.realPath];
            pathMapping[plink.name + '/*'] = [plink.realPath + '/*'];
        }
    }
    const tsConfigFileDir = path_1.default.dirname(file);
    var tsjson = {
        // extends: require.resolve('@wfh/webpack2-builder/configs/tsconfig.json'),
        include: config
            .tsconfigInclude
            .map(preserveSymlinks ? p => p : globRealPath)
            .map(pattern => path_1.default.relative(tsConfigFileDir, pattern).replace(/\\/g, '/')).concat(path_1.default.resolve(__dirname, '..', '..').replace(/\\/g, '/') + '/src/**/*.ts'),
        exclude: [],
        compilerOptions: Object.assign(Object.assign(Object.assign(Object.assign({}, tsconfig_app_json_1.default.compilerOptions), { baseUrl: cwd, 
            // typeRoots: [
            //   Path.resolve(root, 'node_modules/@types'),
            //   Path.resolve(root, 'node_modules/@dr-types'),
            //   // Below is NodeJS only, which will break Angular Ivy engine
            //   Path.resolve(root, 'node_modules/@wfh/plink/wfh/types')
            // ],
            // module: 'esnext',
            preserveSymlinks }), oldJson.compilerOptions), { paths: Object.assign(Object.assign({}, tsconfig_app_json_1.default.compilerOptions.paths), pathMapping) }),
        angularCompilerOptions: Object.assign({}, oldJson.angularCompilerOptions)
    };
    config_handler_1.setTsCompilerOptForNodePath(tsConfigFileDir, process.cwd(), tsjson.compilerOptions, { enableTypeRoots: true, workspaceDir: process.cwd() });
    // Object.assign(tsjson.compilerOptions.paths, appTsconfig.compilerOptions.paths, pathMapping);
    if (oldJson.extends) {
        tsjson.extends = oldJson.extends;
    }
    if (oldJson.compilerOptions.paths) {
        Object.assign(tsjson.compilerOptions.paths, oldJson.compilerOptions.paths);
    }
    if (oldJson.include) {
        tsjson.include = _.union(tsjson.include.concat(oldJson.include));
    }
    if (oldJson.exclude) {
        tsjson.exclude = _.union(tsjson.exclude.concat(oldJson.exclude));
    }
    if (oldJson.files)
        tsjson.files = oldJson.files;
    // console.log(tsjson.compilerOptions);
    const addSourceFiles = require('./add-tsconfig-file').addSourceFiles;
    if (!tsjson.files)
        tsjson.files = [];
    // We should not use "include" due to we have multiple projects in same source directory, it
    // will cause problem if unused file is included in TS compilation, not only about cpu/memory cost,
    // but also having problem like same component might be declared in multiple modules which is
    // consider as error in Angular compiler. 
    tsjson.files.push(...(addSourceFiles(tsjson.compilerOptions, tsjson.files, file, browserOptions.fileReplacements, reportDir).map(p => {
        if (path_1.default.isAbsolute(p)) {
            return path_1.default.relative(tsConfigFileDir, p).replace(/\\/g, '/');
        }
        else {
            return p;
        }
    })));
    return JSON.stringify(tsjson, null, '  ');
}
function globRealPath(glob) {
    const res = /^([^*]+)\/[^/*]*\*/.exec(glob);
    if (res) {
        return fs.realpathSync(res[1]).replace(/\\/g, '/') + res.input.slice(res[1].length);
    }
    return glob;
}
function lookupEntryPackage(lookupDir) {
    while (true) {
        const pk = path_1.default.join(lookupDir, 'package.json');
        if (fs.existsSync(pk)) {
            return require(pk);
        }
        else if (lookupDir === path_1.default.dirname(lookupDir)) {
            break;
        }
        lookupDir = path_1.default.dirname(lookupDir);
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlLXRzY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hhbmdlLXRzY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxtRUFBbUU7QUFDbkUsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLHFGQUF1RDtBQUV2RCxnRUFBc0U7QUFHdEUsdUVBQStFO0FBQy9FLGlFQUF5RDtBQU16RCxTQUFnQixjQUFjLENBQUMsSUFBWSxFQUN6QyxjQUFvQyxFQUNwQyxNQUEyQixFQUMzQixXQUF3QixFQUN4QixTQUFpQjtJQUVqQiwwRkFBMEY7SUFDMUYsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFDdkQsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFURCx3Q0FTQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsTUFBbUIsRUFDekQsY0FBb0MsRUFDcEMsTUFBMkIsRUFBRSxTQUFpQjtJQUU5QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDMUIsTUFBTSxNQUFNLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNqRixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDaEIsMkJBQTJCO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLHVDQUF1QyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztLQUMvRTtJQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDOUIsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUM7SUFDekQsTUFBTSxXQUFXLEdBQTBDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUU3RixvREFBb0Q7SUFFcEQsd0RBQXdEO0lBRXhELE1BQU0sYUFBYSxHQUFHLDRDQUF5QixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkYsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDekQsSUFBSSxjQUFjLElBQUksSUFBSTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0lBRTFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUNyQixLQUFLLE1BQU0sRUFBRSxJQUFJLHNCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEUsV0FBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLFdBQVksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsTUFBTSxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQztRQUNwQyxJQUFJLEtBQUssRUFBRTtZQUNULFdBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsV0FBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO1NBQzNEO0tBQ0Y7SUFFRCxNQUFNLGVBQWUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTNDLElBQUksTUFBTSxHQUFvRjtRQUM1RiwyRUFBMkU7UUFDM0UsT0FBTyxFQUFFLE1BQU07YUFDWixlQUFlO2FBQ2YsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO2FBQzdDLEdBQUcsQ0FDRixPQUFPLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQ3ZFLENBQUMsTUFBTSxDQUNOLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FDekU7UUFDSCxPQUFPLEVBQUUsRUFBRTtRQUNYLGVBQWUsOERBQ1YsMkJBQVcsQ0FBQyxlQUFlLEtBQzlCLE9BQU8sRUFBRSxHQUFHO1lBQ1osZUFBZTtZQUNmLCtDQUErQztZQUMvQyxrREFBa0Q7WUFDbEQsaUVBQWlFO1lBQ2pFLDREQUE0RDtZQUM1RCxLQUFLO1lBQ0wsb0JBQW9CO1lBQ3BCLGdCQUFnQixLQUNiLE9BQU8sQ0FBQyxlQUFlLEtBQzFCLEtBQUssa0NBQU0sMkJBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxHQUFLLFdBQVcsSUFDN0Q7UUFDRCxzQkFBc0Isb0JBRWpCLE9BQU8sQ0FBQyxzQkFBc0IsQ0FDbEM7S0FDRixDQUFDO0lBQ0YsNENBQTJCLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLEVBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFDLENBQUMsQ0FBQztJQUMxSSwrRkFBK0Y7SUFDL0YsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1FBQ25CLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztLQUNsQztJQUVELElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUU7UUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzVFO0lBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1FBQ25CLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBRSxNQUFNLENBQUMsT0FBb0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDaEY7SUFDRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDbkIsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFFLE1BQU0sQ0FBQyxPQUFvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUNoRjtJQUNELElBQUksT0FBTyxDQUFDLEtBQUs7UUFDZixNQUFNLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFFL0IsdUNBQXVDO0lBQ3ZDLE1BQU0sY0FBYyxHQUEyQixPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxjQUFjLENBQUM7SUFFN0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1FBQ2YsTUFBTSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7SUFDcEIsNEZBQTRGO0lBQzVGLG1HQUFtRztJQUNuRyw2RkFBNkY7SUFDN0YsMENBQTBDO0lBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksRUFDN0UsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNsRCxJQUFJLGNBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDdEIsT0FBTyxjQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzlEO2FBQU07WUFDTCxPQUFPLENBQUMsQ0FBQztTQUNWO0lBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRVAsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsWUFBWSxDQUFDLElBQVk7SUFDaEMsTUFBTSxHQUFHLEdBQUcsb0JBQW9CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzVDLElBQUksR0FBRyxFQUFFO1FBQ1AsT0FBTyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0tBQ3JGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBQyxTQUFpQjtJQUMzQyxPQUFPLElBQUksRUFBRTtRQUNYLE1BQU0sRUFBRSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2hELElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRTtZQUNyQixPQUFPLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztTQUNwQjthQUFNLElBQUksU0FBUyxLQUFLLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDaEQsTUFBTTtTQUNQO1FBQ0QsU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDckM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQYWNrYWdlSW5mbyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3IvcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG4vLyBpbXBvcnQgeyBEcmNwQ29uZmlnIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcHBUc2NvbmZpZyBmcm9tICcuLi8uLi9taXNjL3RzY29uZmlnLmFwcC5qc29uJztcbmltcG9ydCB7IERyY3BTZXR0aW5nIGFzIE5nQXBwQnVpbGRlclNldHRpbmcgfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHsgZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbiB9IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkU291cmNlRmlsZXMgYXMgX2FkZFNvdXJjZUZpbGVzIH0gZnJvbSAnLi9hZGQtdHNjb25maWctZmlsZSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge2dldFN0YXRlfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyJztcbi8vIGNvbnN0IGN1cnJQYWNrYWdlTmFtZSA9IHJlcXVpcmUoJy4uLy4uL3BhY2thZ2UuanNvbicpLm5hbWU7XG5cbmV4cG9ydCB0eXBlIFBhcmlhbEJyb3dzZXJPcHRpb25zID0gUGljazxBbmd1bGFyQnVpbGRlck9wdGlvbnMsICdwcmVzZXJ2ZVN5bWxpbmtzJyB8ICdtYWluJyB8ICdmaWxlUmVwbGFjZW1lbnRzJz47XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKGZpbGU6IHN0cmluZyxcbiAgYnJvd3Nlck9wdGlvbnM6IFBhcmlhbEJyb3dzZXJPcHRpb25zLFxuICBjb25maWc6IE5nQXBwQnVpbGRlclNldHRpbmcsXG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyxcbiAgcmVwb3J0RGlyOiBzdHJpbmcpIHtcblxuICAvLyBjb25zdCByZXBvcnRGaWxlID0gY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInLCAnbmctYXBwLWJ1aWxkZXIucmVwb3J0JywgJ3RzY29uZmlnLmpzb24nKTtcbiAgcmV0dXJuIG92ZXJyaWRlVHNDb25maWcoZmlsZSwgcGFja2FnZUluZm8sIGJyb3dzZXJPcHRpb25zLFxuICAgIGNvbmZpZywgcmVwb3J0RGlyKTtcbn1cblxuLyoqXG4gKiBMZXQncyBvdmVycmlkZSB0c2NvbmZpZy5qc29uIGZpbGVzIGZvciBBbmd1bGFyIGF0IHJ1dGltZSA6KVxuICogLSBSZWFkIGludG8gbWVtb3J5XG4gKiAtIERvIG5vdCBvdmVycmlkZSBwcm9wZXJ0aWVzIG9mIGNvbXBpbGVyT3B0aW9ucyxhbmd1bGFyQ29tcGlsZXJPcHRpb25zIHRoYXQgZXhpc3RzIGluIGN1cnJlbnQgZmlsZVxuICogLSBcImV4dGVuZHNcIiBtdXN0IGJlIC4uLlxuICogLSBUcmF2ZXJzZSBwYWNrYWdlcyB0byBidWlsZCBwcm9wZXIgaW5jbHVkZXMgYW5kIGV4Y2x1ZGVzIGxpc3QgYW5kIC4uLlxuICogLSBGaW5kIGZpbGUgd2hlcmUgQXBwTW9kdWxlIGlzIGluLCBmaW5kIGl0cyBwYWNrYWdlLCBtb3ZlIGl0cyBkaXJlY3RvcnkgdG8gdG9wIG9mIGluY2x1ZGVzIGxpc3QsXG4gKiBcdHdoaWNoIGZpeGVzIG5nIGNsaSB3aW5kb3dzIGJ1Z1xuICovXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKGZpbGU6IHN0cmluZywgcGtJbmZvOiBQYWNrYWdlSW5mbyxcbiAgYnJvd3Nlck9wdGlvbnM6IFBhcmlhbEJyb3dzZXJPcHRpb25zLFxuICBjb25maWc6IE5nQXBwQnVpbGRlclNldHRpbmcsIHJlcG9ydERpcjogc3RyaW5nKTogc3RyaW5nIHtcblxuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCByZXN1bHQgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGZpbGUsIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcbiAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgIC8vIGxvZy5lcnJvcihyZXN1bHQuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtmaWxlfSBjb250YWlucyBpbmNvcnJlY3QgY29uZmlndXJhdGlvbjpcXG4ke3Jlc3VsdC5lcnJvcn1gKTtcbiAgfVxuICBjb25zdCBvbGRKc29uID0gcmVzdWx0LmNvbmZpZztcbiAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119IHwgdW5kZWZpbmVkID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuXG4gIC8vIHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcblxuICAvLyBsZXQgbmdQYWNrYWdlczogUGFja2FnZUluc3RhbmNlcyA9IHBrSW5mby5hbGxNb2R1bGVzO1xuXG4gIGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGNvbnN0IGFwcFBhY2thZ2VKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKGFwcE1vZHVsZUZpbGUpO1xuICBpZiAoYXBwUGFja2FnZUpzb24gPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yLCBjYW4gbm90IGZpbmQgcGFja2FnZS5qc29uIG9mICcgKyBhcHBNb2R1bGVGaWxlKTtcblxuICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5uYW1lXSA9IFtyZWFsRGlyXTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5uYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cbiAgICBjb25zdCBwbGluayA9IGdldFN0YXRlKCkubGlua2VkRHJjcDtcbiAgICBpZiAocGxpbmspIHtcbiAgICAgIHBhdGhNYXBwaW5nIVtwbGluay5uYW1lXSA9IFtwbGluay5yZWFsUGF0aF07XG4gICAgICBwYXRoTWFwcGluZyFbcGxpbmsubmFtZSArICcvKiddID0gW3BsaW5rLnJlYWxQYXRoICsgJy8qJ107XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdHNDb25maWdGaWxlRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuXG4gIHZhciB0c2pzb246IHtjb21waWxlck9wdGlvbnM6IGFueSwgW2tleTogc3RyaW5nXTogYW55LCBmaWxlcz86IHN0cmluZ1tdLCBpbmNsdWRlOiBzdHJpbmdbXX0gPSB7XG4gICAgLy8gZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG4gICAgaW5jbHVkZTogY29uZmlnXG4gICAgICAudHNjb25maWdJbmNsdWRlXG4gICAgICAubWFwKHByZXNlcnZlU3ltbGlua3MgPyBwID0+IHAgOiBnbG9iUmVhbFBhdGgpXG4gICAgICAubWFwKFxuICAgICAgICBwYXR0ZXJuID0+IFBhdGgucmVsYXRpdmUodHNDb25maWdGaWxlRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgICkuY29uY2F0KFxuICAgICAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL3NyYy8qKi8qLnRzJ1xuICAgICAgKSxcbiAgICBleGNsdWRlOiBbXSwgLy8gdHNFeGNsdWRlLFxuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLi4uYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLFxuICAgICAgYmFzZVVybDogY3dkLFxuICAgICAgLy8gdHlwZVJvb3RzOiBbXG4gICAgICAvLyAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B0eXBlcycpLFxuICAgICAgLy8gICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AZHItdHlwZXMnKSxcbiAgICAgIC8vICAgLy8gQmVsb3cgaXMgTm9kZUpTIG9ubHksIHdoaWNoIHdpbGwgYnJlYWsgQW5ndWxhciBJdnkgZW5naW5lXG4gICAgICAvLyAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsvd2ZoL3R5cGVzJylcbiAgICAgIC8vIF0sXG4gICAgICAvLyBtb2R1bGU6ICdlc25leHQnLFxuICAgICAgcHJlc2VydmVTeW1saW5rcyxcbiAgICAgIC4uLm9sZEpzb24uY29tcGlsZXJPcHRpb25zLFxuICAgICAgcGF0aHM6IHsuLi5hcHBUc2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMsIC4uLnBhdGhNYXBwaW5nfVxuICAgIH0sXG4gICAgYW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLy8gdHJhY2U6IHRydWVcbiAgICAgIC4uLm9sZEpzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9uc1xuICAgIH1cbiAgfTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzQ29uZmlnRmlsZURpciwgcHJvY2Vzcy5jd2QoKSwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge2VuYWJsZVR5cGVSb290czogdHJ1ZSwgd29ya3NwYWNlRGlyOiBwcm9jZXNzLmN3ZCgpfSk7XG4gIC8vIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZyk7XG4gIGlmIChvbGRKc29uLmV4dGVuZHMpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IG9sZEpzb24uZXh0ZW5kcztcbiAgfVxuXG4gIGlmIChvbGRKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocykge1xuICAgIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgb2xkSnNvbi5jb21waWxlck9wdGlvbnMucGF0aHMpO1xuICB9XG4gIGlmIChvbGRKc29uLmluY2x1ZGUpIHtcbiAgICB0c2pzb24uaW5jbHVkZSA9IF8udW5pb24oKHRzanNvbi5pbmNsdWRlIGFzIHN0cmluZ1tdKS5jb25jYXQob2xkSnNvbi5pbmNsdWRlKSk7XG4gIH1cbiAgaWYgKG9sZEpzb24uZXhjbHVkZSkge1xuICAgIHRzanNvbi5leGNsdWRlID0gXy51bmlvbigodHNqc29uLmV4Y2x1ZGUgYXMgc3RyaW5nW10pLmNvbmNhdChvbGRKc29uLmV4Y2x1ZGUpKTtcbiAgfVxuICBpZiAob2xkSnNvbi5maWxlcylcbiAgICB0c2pzb24uZmlsZXMgPSBvbGRKc29uLmZpbGVzO1xuXG4gIC8vIGNvbnNvbGUubG9nKHRzanNvbi5jb21waWxlck9wdGlvbnMpO1xuICBjb25zdCBhZGRTb3VyY2VGaWxlczogdHlwZW9mIF9hZGRTb3VyY2VGaWxlcyA9IHJlcXVpcmUoJy4vYWRkLXRzY29uZmlnLWZpbGUnKS5hZGRTb3VyY2VGaWxlcztcblxuICBpZiAoIXRzanNvbi5maWxlcylcbiAgICB0c2pzb24uZmlsZXMgPSBbXTtcbiAgLy8gV2Ugc2hvdWxkIG5vdCB1c2UgXCJpbmNsdWRlXCIgZHVlIHRvIHdlIGhhdmUgbXVsdGlwbGUgcHJvamVjdHMgaW4gc2FtZSBzb3VyY2UgZGlyZWN0b3J5LCBpdFxuICAvLyB3aWxsIGNhdXNlIHByb2JsZW0gaWYgdW51c2VkIGZpbGUgaXMgaW5jbHVkZWQgaW4gVFMgY29tcGlsYXRpb24sIG5vdCBvbmx5IGFib3V0IGNwdS9tZW1vcnkgY29zdCxcbiAgLy8gYnV0IGFsc28gaGF2aW5nIHByb2JsZW0gbGlrZSBzYW1lIGNvbXBvbmVudCBtaWdodCBiZSBkZWNsYXJlZCBpbiBtdWx0aXBsZSBtb2R1bGVzIHdoaWNoIGlzXG4gIC8vIGNvbnNpZGVyIGFzIGVycm9yIGluIEFuZ3VsYXIgY29tcGlsZXIuIFxuICB0c2pzb24uZmlsZXMucHVzaCguLi4oYWRkU291cmNlRmlsZXModHNqc29uLmNvbXBpbGVyT3B0aW9ucywgdHNqc29uLmZpbGVzLCBmaWxlLFxuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMsIHJlcG9ydERpcikubWFwKHAgPT4ge1xuICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShwKSkge1xuICAgICAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ0ZpbGVEaXIsIHApLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfVxuICAgIH0pKSk7XG5cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGdsb2JSZWFsUGF0aChnbG9iOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gL14oW14qXSspXFwvW14vKl0qXFwqLy5leGVjKGdsb2IpO1xuICBpZiAocmVzKSB7XG4gICAgcmV0dXJuIGZzLnJlYWxwYXRoU3luYyhyZXNbMV0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlcy5pbnB1dC5zbGljZShyZXNbMV0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZ2xvYjtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==