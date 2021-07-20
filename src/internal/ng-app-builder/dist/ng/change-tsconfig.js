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
const fs = __importStar(require("fs"));
const _ = __importStar(require("lodash"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const tsconfig_app_json_1 = __importDefault(require("../../misc/tsconfig.app.json"));
// import { DrcpSetting as NgAppBuilderSetting } from '../configurable';
const parse_app_module_1 = require("../utils/parse-app-module");
const package_list_helper_1 = require("@wfh/plink/wfh/dist/package-mgr/package-list-helper");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
function createTsConfig(file, browserOptions, reportDir) {
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
    const tsjson = {
        compilerOptions: Object.assign(Object.assign(Object.assign(Object.assign({}, tsconfig_app_json_1.default.compilerOptions), { baseUrl: cwd, preserveSymlinks }), oldJson.compilerOptions), { paths: Object.assign(Object.assign({}, tsconfig_app_json_1.default.compilerOptions.paths), pathMapping) }),
        angularCompilerOptions: Object.assign({}, oldJson.angularCompilerOptions)
    };
    package_list_helper_1.setTsCompilerOptForNodePath(tsConfigFileDir, process.cwd(), tsjson.compilerOptions, {
        noTypeRootsInPackages: true,
        workspaceDir: process.cwd()
    });
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
    })), path_1.default.relative(tsConfigFileDir, path_1.default.resolve(__dirname, '../../src/hmr.ts')).replace(/\\/g, '/'));
    return JSON.stringify(tsjson, null, '  ');
}
exports.createTsConfig = createTsConfig;
// function globRealPath(glob: string) {
//   const res = /^([^*]+)\/[^/*]*\*/.exec(glob);
//   if (res) {
//     return fs.realpathSync(res[1]).replace(/\\/g, '/') + res.input.slice(res[1].length);
//   }
//   return glob;
// }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlLXRzY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hhbmdlLXRzY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMENBQTRCO0FBQzVCLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFDNUIscUZBQXVEO0FBQ3ZELHdFQUF3RTtBQUN4RSxnRUFBc0U7QUFHdEUsNkZBQWdHO0FBQ2hHLGlFQUF5RDtBQU16RCxTQUFnQixjQUFjLENBQUMsSUFBWSxFQUFFLGNBQW9DLEVBQUUsU0FBaUI7SUFFbEcsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sTUFBTSxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDakYsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO1FBQ2hCLDJCQUEyQjtRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSx1Q0FBdUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDL0U7SUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDO0lBQ3pELE1BQU0sV0FBVyxHQUEwQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFN0Ysb0RBQW9EO0lBRXBELHdEQUF3RDtJQUV4RCxNQUFNLGFBQWEsR0FBRyw0Q0FBeUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25GLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELElB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Q0FBQyxFQUFFLENBQUMsQ0FBQztTQUNwQjthQUFNLElBQUksU0FBUyxLQUFLLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDaEQsTUFBTTtTQUNQO1FBQ0QsU0FBUyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7S0FDckM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcHBUc2NvbmZpZyBmcm9tICcuLi8uLi9taXNjL3RzY29uZmlnLmFwcC5qc29uJztcbi8vIGltcG9ydCB7IERyY3BTZXR0aW5nIGFzIE5nQXBwQnVpbGRlclNldHRpbmcgfSBmcm9tICcuLi9jb25maWd1cmFibGUnO1xuaW1wb3J0IHsgZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbiB9IGZyb20gJy4uL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHsgYWRkU291cmNlRmlsZXMgYXMgX2FkZFNvdXJjZUZpbGVzIH0gZnJvbSAnLi9hZGQtdHNjb25maWctZmlsZSc7XG5pbXBvcnQgeyBBbmd1bGFyQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL2NvbW1vbic7XG5pbXBvcnQge3NldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7Z2V0U3RhdGV9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS1tZ3InO1xuLy8gY29uc3QgY3VyclBhY2thZ2VOYW1lID0gcmVxdWlyZSgnLi4vLi4vcGFja2FnZS5qc29uJykubmFtZTtcblxuZXhwb3J0IHR5cGUgUGFyaWFsQnJvd3Nlck9wdGlvbnMgPSBQaWNrPEFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgJ3ByZXNlcnZlU3ltbGlua3MnIHwgJ21haW4nIHwgJ2ZpbGVSZXBsYWNlbWVudHMnPjtcblxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVHNDb25maWcoZmlsZTogc3RyaW5nLCBicm93c2VyT3B0aW9uczogUGFyaWFsQnJvd3Nlck9wdGlvbnMsIHJlcG9ydERpcjogc3RyaW5nKSB7XG5cbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgcmVzdWx0ID0gdHMucGFyc2VDb25maWdGaWxlVGV4dFRvSnNvbihmaWxlLCBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKSk7XG4gIGlmIChyZXN1bHQuZXJyb3IpIHtcbiAgICAvLyBsb2cuZXJyb3IocmVzdWx0LmVycm9yKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYCR7ZmlsZX0gY29udGFpbnMgaW5jb3JyZWN0IGNvbmZpZ3VyYXRpb246XFxuJHtyZXN1bHQuZXJyb3J9YCk7XG4gIH1cbiAgY29uc3Qgb2xkSnNvbiA9IHJlc3VsdC5jb25maWc7XG4gIGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBicm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSB8IHVuZGVmaW5lZCA9IHByZXNlcnZlU3ltbGlua3MgPyB1bmRlZmluZWQgOiB7fTtcblxuICAvLyB0eXBlIFBhY2thZ2VJbnN0YW5jZXMgPSB0eXBlb2YgcGtJbmZvLmFsbE1vZHVsZXM7XG5cbiAgLy8gbGV0IG5nUGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZXMgPSBwa0luZm8uYWxsTW9kdWxlcztcblxuICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihQYXRoLnJlc29sdmUoYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICBjb25zdCBhcHBQYWNrYWdlSnNvbiA9IGxvb2t1cEVudHJ5UGFja2FnZShhcHBNb2R1bGVGaWxlKTtcbiAgaWYgKGFwcFBhY2thZ2VKc29uID09IG51bGwpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciwgY2FuIG5vdCBmaW5kIHBhY2thZ2UuanNvbiBvZiAnICsgYXBwTW9kdWxlRmlsZSk7XG5cbiAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKSB7XG4gICAgZm9yIChjb25zdCBwayBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBwYXRoTWFwcGluZyFbcGsubmFtZV0gPSBbcmVhbERpcl07XG4gICAgICBwYXRoTWFwcGluZyFbcGsubmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgICB9XG4gICAgY29uc3QgcGxpbmsgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3A7XG4gICAgaWYgKHBsaW5rKSB7XG4gICAgICBwYXRoTWFwcGluZyFbcGxpbmsubmFtZV0gPSBbcGxpbmsucmVhbFBhdGhdO1xuICAgICAgcGF0aE1hcHBpbmchW3BsaW5rLm5hbWUgKyAnLyonXSA9IFtwbGluay5yZWFsUGF0aCArICcvKiddO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHRzQ29uZmlnRmlsZURpciA9IFBhdGguZGlybmFtZShmaWxlKTtcblxuICBjb25zdCB0c2pzb246IHtjb21waWxlck9wdGlvbnM6IGFueSwgW2tleTogc3RyaW5nXTogYW55LCBmaWxlcz86IHN0cmluZ1tdLCBpbmNsdWRlPzogc3RyaW5nW119ID0ge1xuICAgIGNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLi4uYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLFxuICAgICAgYmFzZVVybDogY3dkLFxuICAgICAgcHJlc2VydmVTeW1saW5rcyxcbiAgICAgIC4uLm9sZEpzb24uY29tcGlsZXJPcHRpb25zLFxuICAgICAgcGF0aHM6IHsuLi5hcHBUc2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMsIC4uLnBhdGhNYXBwaW5nfVxuICAgIH0sXG4gICAgYW5ndWxhckNvbXBpbGVyT3B0aW9uczoge1xuICAgICAgLy8gdHJhY2U6IHRydWVcbiAgICAgIC4uLm9sZEpzb24uYW5ndWxhckNvbXBpbGVyT3B0aW9uc1xuICAgIH1cbiAgfTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzQ29uZmlnRmlsZURpciwgcHJvY2Vzcy5jd2QoKSwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIG5vVHlwZVJvb3RzSW5QYWNrYWdlczogdHJ1ZSxcbiAgICB3b3Jrc3BhY2VEaXI6IHByb2Nlc3MuY3dkKClcbiAgfSk7XG4gIC8vIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgYXBwVHNjb25maWcuY29tcGlsZXJPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZyk7XG4gIGlmIChvbGRKc29uLmV4dGVuZHMpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9IG9sZEpzb24uZXh0ZW5kcztcbiAgfVxuXG4gIGlmIChvbGRKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocykge1xuICAgIE9iamVjdC5hc3NpZ24odHNqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgb2xkSnNvbi5jb21waWxlck9wdGlvbnMucGF0aHMpO1xuICB9XG4gIGlmIChvbGRKc29uLmluY2x1ZGUpIHtcbiAgICB0c2pzb24uaW5jbHVkZSA9IF8udW5pb24oKHRzanNvbi5pbmNsdWRlIGFzIHN0cmluZ1tdKS5jb25jYXQob2xkSnNvbi5pbmNsdWRlKSk7XG4gIH1cbiAgaWYgKG9sZEpzb24uZXhjbHVkZSkge1xuICAgIHRzanNvbi5leGNsdWRlID0gXy51bmlvbigodHNqc29uLmV4Y2x1ZGUgYXMgc3RyaW5nW10pLmNvbmNhdChvbGRKc29uLmV4Y2x1ZGUpKTtcbiAgfVxuICBpZiAob2xkSnNvbi5maWxlcylcbiAgICB0c2pzb24uZmlsZXMgPSBvbGRKc29uLmZpbGVzO1xuXG4gIC8vIGNvbnNvbGUubG9nKHRzanNvbi5jb21waWxlck9wdGlvbnMpO1xuICBjb25zdCBhZGRTb3VyY2VGaWxlcyA9IChyZXF1aXJlKCcuL2FkZC10c2NvbmZpZy1maWxlJykgYXMge2FkZFNvdXJjZUZpbGVzOiB0eXBlb2YgX2FkZFNvdXJjZUZpbGVzfSkuYWRkU291cmNlRmlsZXM7XG5cbiAgaWYgKCF0c2pzb24uZmlsZXMpXG4gICAgdHNqc29uLmZpbGVzID0gW107XG4gIC8vIFdlIHNob3VsZCBub3QgdXNlIFwiaW5jbHVkZVwiIGR1ZSB0byB3ZSBoYXZlIG11bHRpcGxlIHByb2plY3RzIGluIHNhbWUgc291cmNlIGRpcmVjdG9yeSwgaXRcbiAgLy8gd2lsbCBjYXVzZSBwcm9ibGVtIGlmIHVudXNlZCBmaWxlIGlzIGluY2x1ZGVkIGluIFRTIGNvbXBpbGF0aW9uLCBub3Qgb25seSBhYm91dCBjcHUvbWVtb3J5IGNvc3QsXG4gIC8vIGJ1dCBhbHNvIGhhdmluZyBwcm9ibGVtIGxpa2Ugc2FtZSBjb21wb25lbnQgbWlnaHQgYmUgZGVjbGFyZWQgaW4gbXVsdGlwbGUgbW9kdWxlcyB3aGljaCBpc1xuICAvLyBjb25zaWRlciBhcyBlcnJvciBpbiBBbmd1bGFyIGNvbXBpbGVyLiBcbiAgdHNqc29uLmZpbGVzLnB1c2goLi4uKGFkZFNvdXJjZUZpbGVzKHRzanNvbi5jb21waWxlck9wdGlvbnMsIHRzanNvbi5maWxlcywgZmlsZSxcbiAgICBicm93c2VyT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLCByZXBvcnREaXIpLm1hcChwID0+IHtcbiAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUocCkpIHtcbiAgICAgICAgcmV0dXJuIFBhdGgucmVsYXRpdmUodHNDb25maWdGaWxlRGlyLCBwKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcDtcbiAgICAgIH1cbiAgICB9KSksXG4gICAgUGF0aC5yZWxhdGl2ZSh0c0NvbmZpZ0ZpbGVEaXIsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9zcmMvaG1yLnRzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICApO1xuXG4gIHJldHVybiBKU09OLnN0cmluZ2lmeSh0c2pzb24sIG51bGwsICcgICcpO1xufVxuXG4vLyBmdW5jdGlvbiBnbG9iUmVhbFBhdGgoZ2xvYjogc3RyaW5nKSB7XG4vLyAgIGNvbnN0IHJlcyA9IC9eKFteKl0rKVxcL1teLypdKlxcKi8uZXhlYyhnbG9iKTtcbi8vICAgaWYgKHJlcykge1xuLy8gICAgIHJldHVybiBmcy5yZWFscGF0aFN5bmMocmVzWzFdKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyByZXMuaW5wdXQuc2xpY2UocmVzWzFdLmxlbmd0aCk7XG4vLyAgIH1cbi8vICAgcmV0dXJuIGdsb2I7XG4vLyB9XG5cbmZ1bmN0aW9uIGxvb2t1cEVudHJ5UGFja2FnZShsb29rdXBEaXI6IHN0cmluZyk6IGFueSB7XG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3QgcGsgPSBQYXRoLmpvaW4obG9va3VwRGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocGspKSB7XG4gICAgICByZXR1cm4gcmVxdWlyZShwayk7XG4gICAgfSBlbHNlIGlmIChsb29rdXBEaXIgPT09IFBhdGguZGlybmFtZShsb29rdXBEaXIpKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gICAgbG9va3VwRGlyID0gUGF0aC5kaXJuYW1lKGxvb2t1cERpcik7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iXX0=