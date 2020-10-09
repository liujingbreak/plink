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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
    }
    // // Important! to make Angular & Typescript resolve correct real path of symlink lazy route module
    if (!preserveSymlinks) {
        const drcpDir = path_1.default.relative(cwd, fs.realpathSync('node_modules/@wfh/plink')).replace(/\\/g, '/');
        pathMapping['@wfh/plink'] = [drcpDir];
        pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
    }
    var tsjson = {
        // extends: require.resolve('@wfh/webpack2-builder/configs/tsconfig.json'),
        include: config
            .tsconfigInclude
            .map(preserveSymlinks ? p => p : globRealPath)
            .map(pattern => path_1.default.relative(path_1.default.dirname(file), pattern).replace(/\\/g, '/')),
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
    config_handler_1.setTsCompilerOptForNodePath(cwd, tsjson.compilerOptions, { enableTypeRoots: false });
    tsjson.compilerOptions.baseUrl = cwd;
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
    tsjson.files.push(...(sourceFiles(tsjson.compilerOptions, tsjson.files, file, browserOptions.fileReplacements, reportDir)));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpdWppbmcvYmsvZHItY29tcC1wYWNrYWdlL3NyYy9pbnRlcm5hbC9uZy1hcHAtYnVpbGRlci90cy9uZy9jaGFuZ2UtdHNjb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLG1FQUFtRTtBQUNuRSx1Q0FBeUI7QUFDekIsMENBQTRCO0FBQzVCLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFDNUIscUZBQXVEO0FBRXZELGdFQUFzRTtBQUd0RSx1RUFBK0U7QUFDL0UsaUVBQXlEO0FBTXpELFNBQWdCLGNBQWMsQ0FBQyxJQUFZLEVBQ3pDLGNBQW9DLEVBQ3BDLE1BQTJCLEVBQzNCLFdBQXdCLEVBQ3hCLFNBQWlCO0lBRWpCLDBGQUEwRjtJQUMxRixPQUFPLGdCQUFnQixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUN2RCxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDdkIsQ0FBQztBQVRELHdDQVNDO0FBRUQ7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLElBQVksRUFBRSxNQUFtQixFQUN6RCxjQUFvQyxFQUNwQyxNQUEyQixFQUFFLFNBQWlCO0lBRTlDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixNQUFNLE1BQU0sR0FBRyxvQkFBRSxDQUFDLHlCQUF5QixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLElBQUksTUFBTSxDQUFDLEtBQUssRUFBRTtRQUNoQiwyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLElBQUksdUNBQXVDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0tBQy9FO0lBQ0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM5QixNQUFNLGdCQUFnQixHQUFHLGNBQWMsQ0FBQyxn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LENBQUMsSUFBWTtJQUNoQyxNQUFNLEdBQUcsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsSUFBSSxHQUFHLEVBQUU7UUFDUCxPQUFPLEVBQUUsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDckY7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFNBQWlCO0lBQzNDLE9BQU8sSUFBSSxFQUFFO1FBQ1gsTUFBTSxFQUFFLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3BCO2FBQU0sSUFBSSxTQUFTLEtBQUssY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNoRCxNQUFNO1NBQ1A7UUFDRCxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNyQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsImZpbGUiOiJkaXN0L25nL2NoYW5nZS10c2NvbmZpZy5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
