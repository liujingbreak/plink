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

//# sourceMappingURL=change-tsconfig.js.map
