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
        // extends: require.resolve('@wfh/webpack2-builder/configs/tsconfig.json'),
        // include: config
        //   .tsconfigInclude
        //   .map(preserveSymlinks ? p => p : globRealPath)
        //   .map(
        //     pattern => Path.relative(tsConfigFileDir, pattern).replace(/\\/g, '/')
        //   ).concat(
        //     Path.resolve(__dirname, '..', '..').replace(/\\/g, '/') + '/src/**/*.ts'
        //   ),
        // include: [Path.resolve(__dirname, '..', '..').replace(/\\/g, '/') + '/src/**/*.ts'],
        // exclude: [], // tsExclude,
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
    })));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlLXRzY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2hhbmdlLXRzY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFDekIsMENBQTRCO0FBQzVCLGdEQUF3QjtBQUN4Qiw0REFBNEI7QUFDNUIscUZBQXVEO0FBQ3ZELHdFQUF3RTtBQUN4RSxnRUFBc0U7QUFHdEUsNkZBQWdHO0FBQ2hHLGlFQUF5RDtBQU16RCxTQUFnQixjQUFjLENBQUMsSUFBWSxFQUFFLGNBQW9DLEVBQUUsU0FBaUI7SUFFbEcsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sTUFBTSxHQUFHLG9CQUFFLENBQUMseUJBQXlCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDakYsSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO1FBQ2hCLDJCQUEyQjtRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSx1Q0FBdUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7S0FDL0U7SUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzlCLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDO0lBQ3pELE1BQU0sV0FBVyxHQUEwQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFN0Ysb0RBQW9EO0lBRXBELHdEQUF3RDtJQUV4RCxNQUFNLGFBQWEsR0FBRyw0Q0FBeUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25GLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ3pELElB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QUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDaEQsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3JCLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1NBQ3BCO2FBQU0sSUFBSSxTQUFTLEtBQUssY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUNoRCxNQUFNO1NBQ1A7UUFDRCxTQUFTLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztLQUNyQztJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwcFRzY29uZmlnIGZyb20gJy4uLy4uL21pc2MvdHNjb25maWcuYXBwLmpzb24nO1xuLy8gaW1wb3J0IHsgRHJjcFNldHRpbmcgYXMgTmdBcHBCdWlsZGVyU2V0dGluZyB9IGZyb20gJy4uL2NvbmZpZ3VyYWJsZSc7XG5pbXBvcnQgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQgeyBhZGRTb3VyY2VGaWxlcyBhcyBfYWRkU291cmNlRmlsZXMgfSBmcm9tICcuL2FkZC10c2NvbmZpZy1maWxlJztcbmltcG9ydCB7IEFuZ3VsYXJCdWlsZGVyT3B0aW9ucyB9IGZyb20gJy4vY29tbW9uJztcbmltcG9ydCB7c2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRofSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtnZXRTdGF0ZX0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC9wYWNrYWdlLW1ncic7XG4vLyBjb25zdCBjdXJyUGFja2FnZU5hbWUgPSByZXF1aXJlKCcuLi8uLi9wYWNrYWdlLmpzb24nKS5uYW1lO1xuXG5leHBvcnQgdHlwZSBQYXJpYWxCcm93c2VyT3B0aW9ucyA9IFBpY2s8QW5ndWxhckJ1aWxkZXJPcHRpb25zLCAncHJlc2VydmVTeW1saW5rcycgfCAnbWFpbicgfCAnZmlsZVJlcGxhY2VtZW50cyc+O1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhmaWxlOiBzdHJpbmcsIGJyb3dzZXJPcHRpb25zOiBQYXJpYWxCcm93c2VyT3B0aW9ucywgcmVwb3J0RGlyOiBzdHJpbmcpIHtcblxuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCByZXN1bHQgPSB0cy5wYXJzZUNvbmZpZ0ZpbGVUZXh0VG9Kc29uKGZpbGUsIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpKTtcbiAgaWYgKHJlc3VsdC5lcnJvcikge1xuICAgIC8vIGxvZy5lcnJvcihyZXN1bHQuZXJyb3IpO1xuICAgIHRocm93IG5ldyBFcnJvcihgJHtmaWxlfSBjb250YWlucyBpbmNvcnJlY3QgY29uZmlndXJhdGlvbjpcXG4ke3Jlc3VsdC5lcnJvcn1gKTtcbiAgfVxuICBjb25zdCBvbGRKc29uID0gcmVzdWx0LmNvbmZpZztcbiAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IGJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119IHwgdW5kZWZpbmVkID0gcHJlc2VydmVTeW1saW5rcyA/IHVuZGVmaW5lZCA6IHt9O1xuXG4gIC8vIHR5cGUgUGFja2FnZUluc3RhbmNlcyA9IHR5cGVvZiBwa0luZm8uYWxsTW9kdWxlcztcblxuICAvLyBsZXQgbmdQYWNrYWdlczogUGFja2FnZUluc3RhbmNlcyA9IHBrSW5mby5hbGxNb2R1bGVzO1xuXG4gIGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKFBhdGgucmVzb2x2ZShicm93c2VyT3B0aW9ucy5tYWluKSk7XG4gIGNvbnN0IGFwcFBhY2thZ2VKc29uID0gbG9va3VwRW50cnlQYWNrYWdlKGFwcE1vZHVsZUZpbGUpO1xuICBpZiAoYXBwUGFja2FnZUpzb24gPT0gbnVsbClcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yLCBjYW4gbm90IGZpbmQgcGFja2FnZS5qc29uIG9mICcgKyBhcHBNb2R1bGVGaWxlKTtcblxuICBpZiAoIXByZXNlcnZlU3ltbGlua3MpIHtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5uYW1lXSA9IFtyZWFsRGlyXTtcbiAgICAgIHBhdGhNYXBwaW5nIVtway5uYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICAgIH1cbiAgICBjb25zdCBwbGluayA9IGdldFN0YXRlKCkubGlua2VkRHJjcDtcbiAgICBpZiAocGxpbmspIHtcbiAgICAgIHBhdGhNYXBwaW5nIVtwbGluay5uYW1lXSA9IFtwbGluay5yZWFsUGF0aF07XG4gICAgICBwYXRoTWFwcGluZyFbcGxpbmsubmFtZSArICcvKiddID0gW3BsaW5rLnJlYWxQYXRoICsgJy8qJ107XG4gICAgfVxuICB9XG5cbiAgY29uc3QgdHNDb25maWdGaWxlRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuXG4gIGNvbnN0IHRzanNvbjoge2NvbXBpbGVyT3B0aW9uczogYW55LCBba2V5OiBzdHJpbmddOiBhbnksIGZpbGVzPzogc3RyaW5nW10sIGluY2x1ZGU/OiBzdHJpbmdbXX0gPSB7XG4gICAgLy8gZXh0ZW5kczogcmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3dlYnBhY2syLWJ1aWxkZXIvY29uZmlncy90c2NvbmZpZy5qc29uJyksXG4gICAgLy8gaW5jbHVkZTogY29uZmlnXG4gICAgLy8gICAudHNjb25maWdJbmNsdWRlXG4gICAgLy8gICAubWFwKHByZXNlcnZlU3ltbGlua3MgPyBwID0+IHAgOiBnbG9iUmVhbFBhdGgpXG4gICAgLy8gICAubWFwKFxuICAgIC8vICAgICBwYXR0ZXJuID0+IFBhdGgucmVsYXRpdmUodHNDb25maWdGaWxlRGlyLCBwYXR0ZXJuKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAvLyAgICkuY29uY2F0KFxuICAgIC8vICAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL3NyYy8qKi8qLnRzJ1xuICAgIC8vICAgKSxcbiAgICAvLyBpbmNsdWRlOiBbUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJy4uJykucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy9zcmMvKiovKi50cyddLFxuICAgIC8vIGV4Y2x1ZGU6IFtdLCAvLyB0c0V4Y2x1ZGUsXG4gICAgY29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAuLi5hcHBUc2NvbmZpZy5jb21waWxlck9wdGlvbnMsXG4gICAgICBiYXNlVXJsOiBjd2QsXG4gICAgICAvLyB0eXBlUm9vdHM6IFtcbiAgICAgIC8vICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHR5cGVzJyksXG4gICAgICAvLyAgIFBhdGgucmVzb2x2ZShyb290LCAnbm9kZV9tb2R1bGVzL0Bkci10eXBlcycpLFxuICAgICAgLy8gICAvLyBCZWxvdyBpcyBOb2RlSlMgb25seSwgd2hpY2ggd2lsbCBicmVhayBBbmd1bGFyIEl2eSBlbmdpbmVcbiAgICAgIC8vICAgUGF0aC5yZXNvbHZlKHJvb3QsICdub2RlX21vZHVsZXMvQHdmaC9wbGluay93ZmgvdHlwZXMnKVxuICAgICAgLy8gXSxcbiAgICAgIC8vIG1vZHVsZTogJ2VzbmV4dCcsXG4gICAgICBwcmVzZXJ2ZVN5bWxpbmtzLFxuICAgICAgLi4ub2xkSnNvbi5jb21waWxlck9wdGlvbnMsXG4gICAgICBwYXRoczogey4uLmFwcFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5wYXRocywgLi4ucGF0aE1hcHBpbmd9XG4gICAgfSxcbiAgICBhbmd1bGFyQ29tcGlsZXJPcHRpb25zOiB7XG4gICAgICAvLyB0cmFjZTogdHJ1ZVxuICAgICAgLi4ub2xkSnNvbi5hbmd1bGFyQ29tcGlsZXJPcHRpb25zXG4gICAgfVxuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNDb25maWdGaWxlRGlyLCBwcm9jZXNzLmN3ZCgpLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgbm9UeXBlUm9vdHNJblBhY2thZ2VzOiB0cnVlLFxuICAgIHdvcmtzcGFjZURpcjogcHJvY2Vzcy5jd2QoKVxuICB9KTtcbiAgLy8gT2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzLCBhcHBUc2NvbmZpZy5jb21waWxlck9wdGlvbnMucGF0aHMsIHBhdGhNYXBwaW5nKTtcbiAgaWYgKG9sZEpzb24uZXh0ZW5kcykge1xuICAgIHRzanNvbi5leHRlbmRzID0gb2xkSnNvbi5leHRlbmRzO1xuICB9XG5cbiAgaWYgKG9sZEpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0c2pzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzLCBvbGRKc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRocyk7XG4gIH1cbiAgaWYgKG9sZEpzb24uaW5jbHVkZSkge1xuICAgIHRzanNvbi5pbmNsdWRlID0gXy51bmlvbigodHNqc29uLmluY2x1ZGUgYXMgc3RyaW5nW10pLmNvbmNhdChvbGRKc29uLmluY2x1ZGUpKTtcbiAgfVxuICBpZiAob2xkSnNvbi5leGNsdWRlKSB7XG4gICAgdHNqc29uLmV4Y2x1ZGUgPSBfLnVuaW9uKCh0c2pzb24uZXhjbHVkZSBhcyBzdHJpbmdbXSkuY29uY2F0KG9sZEpzb24uZXhjbHVkZSkpO1xuICB9XG4gIGlmIChvbGRKc29uLmZpbGVzKVxuICAgIHRzanNvbi5maWxlcyA9IG9sZEpzb24uZmlsZXM7XG5cbiAgLy8gY29uc29sZS5sb2codHNqc29uLmNvbXBpbGVyT3B0aW9ucyk7XG4gIGNvbnN0IGFkZFNvdXJjZUZpbGVzOiB0eXBlb2YgX2FkZFNvdXJjZUZpbGVzID0gcmVxdWlyZSgnLi9hZGQtdHNjb25maWctZmlsZScpLmFkZFNvdXJjZUZpbGVzO1xuXG4gIGlmICghdHNqc29uLmZpbGVzKVxuICAgIHRzanNvbi5maWxlcyA9IFtdO1xuICAvLyBXZSBzaG91bGQgbm90IHVzZSBcImluY2x1ZGVcIiBkdWUgdG8gd2UgaGF2ZSBtdWx0aXBsZSBwcm9qZWN0cyBpbiBzYW1lIHNvdXJjZSBkaXJlY3RvcnksIGl0XG4gIC8vIHdpbGwgY2F1c2UgcHJvYmxlbSBpZiB1bnVzZWQgZmlsZSBpcyBpbmNsdWRlZCBpbiBUUyBjb21waWxhdGlvbiwgbm90IG9ubHkgYWJvdXQgY3B1L21lbW9yeSBjb3N0LFxuICAvLyBidXQgYWxzbyBoYXZpbmcgcHJvYmxlbSBsaWtlIHNhbWUgY29tcG9uZW50IG1pZ2h0IGJlIGRlY2xhcmVkIGluIG11bHRpcGxlIG1vZHVsZXMgd2hpY2ggaXNcbiAgLy8gY29uc2lkZXIgYXMgZXJyb3IgaW4gQW5ndWxhciBjb21waWxlci4gXG4gIHRzanNvbi5maWxlcy5wdXNoKC4uLihhZGRTb3VyY2VGaWxlcyh0c2pzb24uY29tcGlsZXJPcHRpb25zLCB0c2pzb24uZmlsZXMsIGZpbGUsXG4gICAgYnJvd3Nlck9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cywgcmVwb3J0RGlyKS5tYXAocCA9PiB7XG4gICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHApKSB7XG4gICAgICAgIHJldHVybiBQYXRoLnJlbGF0aXZlKHRzQ29uZmlnRmlsZURpciwgcCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgICB9XG4gICAgfSkpKTtcblxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodHNqc29uLCBudWxsLCAnICAnKTtcbn1cblxuLy8gZnVuY3Rpb24gZ2xvYlJlYWxQYXRoKGdsb2I6IHN0cmluZykge1xuLy8gICBjb25zdCByZXMgPSAvXihbXipdKylcXC9bXi8qXSpcXCovLmV4ZWMoZ2xvYik7XG4vLyAgIGlmIChyZXMpIHtcbi8vICAgICByZXR1cm4gZnMucmVhbHBhdGhTeW5jKHJlc1sxXSkucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgcmVzLmlucHV0LnNsaWNlKHJlc1sxXS5sZW5ndGgpO1xuLy8gICB9XG4vLyAgIHJldHVybiBnbG9iO1xuLy8gfVxuXG5mdW5jdGlvbiBsb29rdXBFbnRyeVBhY2thZ2UobG9va3VwRGlyOiBzdHJpbmcpOiBhbnkge1xuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHBrID0gUGF0aC5qb2luKGxvb2t1cERpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHBrKSkge1xuICAgICAgcmV0dXJuIHJlcXVpcmUocGspO1xuICAgIH0gZWxzZSBpZiAobG9va3VwRGlyID09PSBQYXRoLmRpcm5hbWUobG9va3VwRGlyKSkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxvb2t1cERpciA9IFBhdGguZGlybmFtZShsb29rdXBEaXIpO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuIl19