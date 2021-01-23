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
    const sourceFiles = require('./add-tsconfig-file').addSourceFiles;
    if (!tsjson.files)
        tsjson.files = [];
    // We should not use "include" due to we have multiple projects in same source directory, it
    // will cause problem if unused file is included in TS compilation, not only about cpu/memory cost,
    // but also having problem like same component might be declared in multiple modules which is
    // consider as error in Angular compiler. 
    tsjson.files.push(...(sourceFiles(tsjson.compilerOptions, tsjson.files, file, browserOptions.fileReplacements, reportDir).map(p => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlLXRzY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hhbmdlLXRzY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxtRUFBbUU7QUFDbkUsdUNBQXlCO0FBQ3pCLDBDQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsNERBQTRCO0FBQzVCLHFGQUF1RDtBQUV2RCxnRUFBc0U7QUFHdEUsdUVBQStFO0FBQy9FLGlFQUF5RDtBQU16RCxTQUFnQixjQUFjLENBQUMsSUFBWSxFQUN6QyxjQUFvQyxFQUNwQyxNQUEyQixFQUMzQixXQUF3QixFQUN4QixTQUFpQjtJQUVqQiwwRkFBMEY7SUFDMUYsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFDdkQsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUM7QUFURCx3Q0FTQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsTUFBbUIsRUFDekQsY0FBb0MsRUFDcEMsTUFBMkIsRUFBRSxTQUFpQjtJQUU5QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDMUIsTUFBTSxNQUFNLEdBQUcsb0JBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNqRixJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDaEIsMkJBQTJCO1FBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLHVDQUF1QyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztLQUMvRTtJQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDOUIsTUFBTSxnQkFBZ0IsR0FBRyxjQUFjLENBQUMsZ0JBQWdCLENBQUM7SUFDekQsTUFBTSxXQUFXLEdBQTBDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUU3RixvREFBb0Q7SUFFcEQsd0RBQXdEO0lBRXhELE1BQU0sYUFBYSxHQUFHLDRDQUF5QixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkYsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDekQsSUFBSSxjQUFjLElBQUksSUFBSTtRQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO0lBRTFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtRQUNyQixLQUFLLE1BQU0sRUFBRSxJQUFJLHNCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDaEQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDcEUsV0FBWSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ2xDLFdBQVksQ0FBQyxFQUFFLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1NBQ2pEO1FBQ0QsTUFBTSxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQztRQUNwQyxJQUFJLEtBQUssRUFBRTtZQUNULFdBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsV0FBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxDQUFDO1NBQzNEO0tBQ0Y7SUFFRCxNQUFNLGVBQWUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRTNDLElBQUksTUFBTSxHQUFvRjtRQUM1RiwyRUFBMkU7UUFDM0UsT0FBTyxFQUFFLE1BQU07YUFDWixlQUFlO2FBQ2YsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO2FBQzdDLEdBQUcsQ0FDRixPQUFPLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQ3ZFLENBQUMsTUFBTSxDQUNOLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FDekU7UUFDSCxPQUFPLEVBQUUsRUFBRTtRQUNYLGVBQWUsOERBQ1YsMkJBQVcsQ0FBQyxlQUFlLEtBQzlCLE9BQU8sRUFBRSxHQUFHO1lBQ1osZUFBZTtZQUNmLCtDQUErQztZQUMvQyxrREFBa0Q7WUFDbEQsaUVBQWlFO1lBQ2pFLDREQUE0RDtZQUM1RCxLQUFLO1lBQ0wsb0JBQW9CO1lBQ3BCLGdCQUFnQixLQUNiLE9BQU8sQ0FBQyxlQUFlLEtBQzFCLEtBQUssa0NBQU0sMkJBQVcsQ0FBQyxlQUFlLENBQUMsS0FBSyxHQUFLLFdBQVcsSUFDN0Q7UUFDRCxzQkFBc0Isb0JBRWpCLE9BQU8sQ0FBQyxzQkFBc0IsQ0FDbEM7S0FDRixDQUFDO0lBRUYsNENBQTJCLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFLEVBQUMsZUFBZSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFDLENBQUMsQ0FBQztJQUMxSSwrRkFBK0Y7SUFFL0YsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1FBQ25CLE1BQU0sQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztLQUNsQztJQUVELElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEVBQUU7UUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFDO0tBQzVFO0lBQ0QsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFO1FBQ25CLE1BQU0sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBRSxNQUFNLENBQUMsT0FBb0IsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDaEY7SUFDRCxJQUFJLE9BQU8sQ0FBQyxPQUFPLEVBQUU7UUFDbkIsTUFBTSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFFLE1BQU0sQ0FBQyxPQUFvQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUNoRjtJQUNELElBQUksT0FBTyxDQUFDLEtBQUs7UUFDZixNQUFNLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFFL0IsTUFBTSxXQUFXLEdBQTBCLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQztJQUV6RixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUs7UUFDZixNQUFNLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNwQiw0RkFBNEY7SUFDNUYsbUdBQW1HO0lBQ25HLDZGQUE2RjtJQUM3RiwwQ0FBMEM7SUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUMxRSxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQ2xELElBQUksY0FBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0QixPQUFPLGNBQUksQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDOUQ7YUFBTTtZQUNMLE9BQU8sQ0FBQyxDQUFDO1NBQ1Y7SUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFUCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsSUFBWTtJQUNoQyxNQUFNLEdBQUcsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxHQUFHLEVBQUU7UUFDUCxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDckY7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFNBQWlCO0lBQzNDLE9BQU8sSUFBSSxFQUFFO1FBQ1gsTUFBTSxFQUFFLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3BCO2FBQU0sSUFBSSxTQUFTLEtBQUssY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNoRCxNQUFNO1NBQ1A7UUFDRCxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNyQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBhY2thZ2VJbmZvIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbi8vIGltcG9ydCB7IERyY3BDb25maWcgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwcFRzY29uZmlnIGZyb20gJy4uLy4uL21pc2MvdHNjb25maWcuYXBwLmpzb24nO1xuaW1wb3J0IHsgRHJjcFNldHRpbmcgYXMgTmdBcHBCdWlsZGVyU2V0dGluZyB9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRTb3VyY2VGaWxlcyB9IGZyb20gJy4vYWRkLXRzY29uZmlnLWZpbGUnO1xuaW1wb3J0IHsgQW5ndWxhckJ1aWxkZXJPcHRpb25zIH0gZnJvbSAnLi9jb21tb24nO1xuaW1wb3J0IHtzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGh9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncic7XG4vLyBjb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuXG5leHBvcnQgdHlwZSBQYXJpYWxCcm93c2VyT3B0aW9ucyA9IFBpY2s8QW5ndWxhckJ1aWxkZXJPcHRpb25zLCAncHJlc2VydmVTeW1saW5rcycgfCAnbWFpbicgfCAnZmlsZVJlcGxhY2VtZW50cyc+O1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsXG4gIGJyb3dzZXJPcHRpb25zOiBQYXJpYWxCcm93c2VyT3B0aW9ucyxcbiAgY29uZmlnOiBOZ0FwcEJ1aWxkZXJTZXR0aW5nLFxuICBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8sXG4gIHJlcG9ydERpcjogc3RyaW5nKSB7XG5cbiAgLy8gY29uc3QgcmVwb3J0RmlsZSA9IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJywgJ25nLWFwcC1idWlsZGVyLnJlcG9ydCcsICd0c2NvbmZpZy5qc29uJyk7XG4gIHJldHVybiBvdmVycmlkZVRzQ29uZmlnKGZpbGUsIHBhY2thZ2VJbmZvLCBicm93c2VyT3B0aW9ucyxcbiAgICBjb25maWcsIHJlcG9ydERpcik7XG59XG5cbi8qKlxuICogTGV0J3Mgb3ZlcnJpZGUgdHNjb25maWcuanNvbiBmaWxlcyBmb3IgQW5ndWxhciBhdCBydXRpbWUgOilcbiAqIC0gUmVhZCBpbnRvIG1lbW9yeVxuICogLSBEbyBub3Qgb3ZlcnJpZGUgcHJvcGVydGllcyBvZiBjb21waWxlck9wdGlvbnMsYW5ndWxhckNvbXBpbGVyT3B0aW9ucyB0aGF0IGV4aXN0cyBpbiBjdXJyZW50IGZpbGVcbiAqIC0gXCJleHRlbmRzXCIgbXVzdCBiZSAuLi5cbiAqIC0gVHJhdmVyc2UgcGFja2FnZXMgdG8gYnVpbGQgcHJvcGVyIGluY2x1ZGVzIGFuZCBleGNsdWRlcyBsaXN0IGFuZCAuLi5cbiAqIC0gRmluZCBmaWxlIHdoZXJlIEFwcE1vZHVsZSBpcyBpbiwgZmluZCBpdHMgcGFja2FnZSwgbW92ZSBpdHMgZGlyZWN0b3J5IHRvIHRvcCBvZiBpbmNsdWRlcyBsaXN0LFxuICogXHR3aGljaCBmaXhlcyBuZyBjbGkgd2luZG93cyBidWdcbiAqL1xuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIHBrSW5mbzogUGFja2FnZUluZm8sXG4gIGJyb3dzZXJPcHRpb25zOiBQYXJpYWxCcm93c2VyT3B0aW9ucyxcbiAgY29uZmlnOiBOZ0FwcEJ1aWxkZXJTZXR0aW5nLCByZXBvcnREaXI6IHN0cmluZyk6IHN0cmluZyB7XG5cbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgcmVzdWx0ID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihmaWxlLCBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSk7XG4gIGlmIChyZXN1bHQuZXJyb3IpIHtcbiAgICAvLyBsb2cuZXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7ZmlsZX0gY29udGFpbnMgaW5jb3JyZWN0IGNvbmZpZ3VyYXRpb246XFxuJHtyZXN1bHQuZXJyb3J9YCk7XG4gIH1cbiAgY29uc3Qgb2xkSnNvbiA9IHJlc3VsdC5jb25maWc7XG4gIGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSB8IHVuZGVmaW5lZCA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcblxuICAvLyB0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG5cbiAgLy8gbGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcbiAgaWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cbiAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgZm9yIChjb25zdCBwayBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBwYXRoTWFwcGluZyFbcGsubmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZyFbcGsubmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG4gICAgY29uc3QgcGxpbmsgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3A7XG4gICAgaWYgKHBsaW5rKSB7XG4gICAgICBwYXRoTWFwcGluZyFbcGxpbmsubmFtZV0gPSBbcGxpbmsucmVhbFBhdGhdO1xuICAgICAgcGF0aE1hcHBpbmchW3BsaW5rLm5hbWUgKyAnLyonXSA9IFtwbGluay5yZWFsUGF0aCArICcvKiddO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHRzQ29uZmlnRmlsZURpciA9IFBhdGguZGlybmFtZShmaWxlKTtcblxuICB2YXIgdHNqc29uOiB7Y29tcGlsZXJPcHRpb25zOiBhbnksIFtrZXk6IHN0cmluZ106IGFueSwgZmlsZXM/OiBzdHJpbmdbXSwgaW5jbHVkZTogc3RyaW5nW119ID0ge1xuICAgIC8vIGV4dGVuZHM6IHJlcXVpcmUucmVzb2x2ZSgnQHdmaC93ZWJwYWNrMi1idWlsZGVyL2NvbmZpZ3MvdHNjb25maWcuanNvbicpLFxuICAgIGluY2x1ZGU6IGNvbmZpZ1xuICAgICAgLnRzY29uZmlnSW5jbHVkZVxuICAgICAgLm1hcChwcmVzZXJ2ZVN5bWxpbmtzID8gcCA9PiBwIDogZ2xvYlJlYWxQYXRoKVxuICAgICAgLm1hcChcbiAgICAgICAgcGF0dGVybiA9PiBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnRmlsZURpciwgcGF0dGVybikucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICApLmNvbmNhdChcbiAgICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJykucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy9zcmMvKiovKi50cydcbiAgICAgICksXG4gICAgZXhjbHVkZTogW10sIC8vIHRzRXhjbHVkZSxcbiAgICBjb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC4uLmFwcFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIGJhc2VVcmw6IGN3ZCxcbiAgICAgIC8vIHR5cGVSb290czogW1xuICAgICAgLy8gICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9AdHlwZXMnKSxcbiAgICAgIC8vICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQGRyLXR5cGVzJyksXG4gICAgICAvLyAgIC8vIEJlbG93IGlzIE5vZGVKUyBvbmx5LCB3aGljaCB3aWxsIGJyZWFrIEFuZ3VsYXIgSXZ5IGVuZ2luZVxuICAgICAgLy8gICBQYXRoLnJlc29sdmUocm9vdCwgJ25vZGVfbW9kdWxlcy9Ad2ZoL3BsaW5rL3dmaC90eXBlcycpXG4gICAgICAvLyBdLFxuICAgICAgLy8gbW9kdWxlOiAnZXNuZXh0JyxcbiAgICAgIHByZXNlcnZlU3ltbGlua3MsXG4gICAgICAuLi5vbGRKc29uLmNvbXBpbGVyT3B0aW9ucyxcbiAgICAgIHBhdGhzOiB7Li4uYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzLCAuLi5wYXRoTWFwcGluZ31cbiAgICB9LFxuICAgIGFuZ3VsYXJDb21waWxlck9wdGlvbnM6IHtcbiAgICAgIC8vIHRyYWNlOiB0cnVlXG4gICAgICAuLi5vbGRKc29uLmFuZ3VsYXJDb21waWxlck9wdGlvbnNcbiAgICB9XG4gIH07XG5cbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzQ29uZmlnRmlsZURpciwgcHJvY2Vzcy5jd2QoKSwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge2VuYWJsZVR5cGVSb290czogdHJ1ZSwgd29ya3NwYWNlRGlyOiBwcm9jZXNzLmN3ZCgpfSk7XG4gIC8vIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZyk7XG5cbiAgaWYgKG9sZEpzb24uZXh0ZW5kcykge1xuICAgIHRzanNvbi5leHRlbmRzID0gb2xkSnNvbi5leHRlbmRzO1xuICB9XG5cbiAgaWYgKG9sZEpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvbGRKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gIH1cbiAgaWYgKG9sZEpzb24uaW5jbHVkZSkge1xuICAgIHRzanNvbi5pbmNsdWRlID0gXy51bmlvbigodHNqc29uLmluY2x1ZGUgYXMgc3RyaW5nW10pLmNvbmNhdChvbGRKc29uLmluY2x1ZGUpKTtcbiAgfVxuICBpZiAob2xkSnNvbi5leGNsdWRlKSB7XG4gICAgdHNqc29uLmV4Y2x1ZGUgPSBfLnVuaW9uKCh0c2pzb24uZXhjbHVkZSBhcyBzdHJpbmdbXSkuY29uY2F0KG9sZEpzb24uZXhjbHVkZSkpO1xuICB9XG4gIGlmIChvbGRKc29uLmZpbGVzKVxuICAgIHRzanNvbi5maWxlcyA9IG9sZEpzb24uZmlsZXM7XG5cbiAgY29uc3Qgc291cmNlRmlsZXM6IHR5cGVvZiBhZGRTb3VyY2VGaWxlcyA9IHJlcXVpcmUoJy4vYWRkLXRzY29uZmlnLWZpbGUnKS5hZGRTb3VyY2VGaWxlcztcblxuICBpZiAoIXRzanNvbi5maWxlcylcbiAgICB0c2pzb24uZmlsZXMgPSBbXTtcbiAgLy8gV2Ugc2hvdWxkIG5vdCB1c2UgXCJpbmNsdWRlXCIgZHVlIHRvIHdlIGhhdmUgbXVsdGlwbGUgcHJvamVjdHMgaW4gc2FtZSBzb3VyY2UgZGlyZWN0b3J5LCBpdFxuICAvLyB3aWxsIGNhdXNlIHByb2JsZW0gaWYgdW51c2VkIGZpbGUgaXMgaW5jbHVkZWQgaW4gVFMgY29tcGlsYXRpb24sIG5vdCBvbmx5IGFib3V0IGNwdS9tZW1vcnkgY29zdCxcbiAgLy8gYnV0IGFsc28gaGF2aW5nIHByb2JsZW0gbGlrZSBzYW1lIGNvbXBvbmVudCBtaWdodCBiZSBkZWNsYXJlZCBpbiBtdWx0aXBsZSBtb2R1bGVzIHdoaWNoIGlzXG4gIC8vIGNvbnNpZGVyIGFzIGVycm9yIGluIEFuZ3VsYXIgY29tcGlsZXIuIFxuICB0c2pzb24uZmlsZXMucHVzaCguLi4oc291cmNlRmlsZXModHNqc29uLmNvbXBpbGVyT3B0aW9ucywgdHNqc29uLmZpbGVzLCBmaWxlLFxuICAgIGJyb3dzZXJPcHRpb25zLmZpbGVSZXBsYWNlbWVudHMsIHJlcG9ydERpcikubWFwKHAgPT4ge1xuICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShwKSkge1xuICAgICAgICByZXR1cm4gUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ0ZpbGVEaXIsIHApLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwO1xuICAgICAgfVxuICAgIH0pKSk7XG5cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRzanNvbiwgbnVsbCwgJyAgJyk7XG59XG5cbmZ1bmN0aW9uIGdsb2JSZWFsUGF0aChnbG9iOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVzID0gL14oW14qXSspXFwvW14vKl0qXFwqLy5leGVjKGdsb2IpO1xuICBpZiAocmVzKSB7XG4gICAgcmV0dXJuIGZzLnJlYWxwYXRoU3luYyhyZXNbMV0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArIHJlcy5pbnB1dC5zbGljZShyZXNbMV0ubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZ2xvYjtcbn1cblxuZnVuY3Rpb24gbG9va3VwRW50cnlQYWNrYWdlKGxvb2t1cERpcjogc3RyaW5nKTogYW55IHtcbiAgd2hpbGUgKHRydWUpIHtcbiAgICBjb25zdCBwayA9IFBhdGguam9pbihsb29rdXBEaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhwaykpIHtcbiAgICAgIHJldHVybiByZXF1aXJlKHBrKTtcbiAgICB9IGVsc2UgaWYgKGxvb2t1cERpciA9PT0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcikpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsb29rdXBEaXIgPSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cbiJdfQ==