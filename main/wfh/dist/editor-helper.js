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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStore = exports.getState = exports.dispatcher = void 0;
// tslint:disable: max-line-length
const fs = __importStar(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const package_mgr_1 = require("./package-mgr");
const store_1 = require("./store");
const misc_1 = require("./utils/misc");
const config_1 = require("./config");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const { symlinkDirName, workDir } = JSON.parse(process.env.__plink);
// import Selector from './utils/ts-ast-query';
const log = log4js_1.default.getLogger('plink.editor-helper');
const { parse } = require('comment-json');
const rootPath = misc_1.getRootDir();
const initialState = {
    tsconfigByRelPath: new Map()
};
const slice = store_1.stateFactory.newSlice({
    name: 'editor-helper',
    initialState,
    reducers: {
        hookTsconfig(s, { payload }) { },
        unHookTsconfig(s, { payload }) {
            for (const file of payload) {
                const relPath = relativePath(file);
                s.tsconfigByRelPath.delete(relPath);
            }
        },
        unHookAll() { }
    }
});
exports.dispatcher = store_1.stateFactory.bindActionCreators(slice);
store_1.stateFactory.addEpic((action$, state$) => {
    return rx.merge(new rx.Observable(sub => {
        if (package_mgr_1.getState().linkedDrcp) {
            const file = path_1.default.resolve(package_mgr_1.getState().linkedDrcp.realPath, 'wfh/tsconfig.json');
            const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
            if (!getState().tsconfigByRelPath.has(relPath)) {
                process.nextTick(() => exports.dispatcher.hookTsconfig([file]));
            }
        }
        sub.complete();
    }), action$.pipe(store_1.ofPayloadAction(package_mgr_1.slice.actions.workspaceBatchChanged), op.tap(({ payload: wsKeys }) => {
        const wsDir = package_mgr_1.isCwdWorkspace() ? workDir :
            package_mgr_1.getState().currWorkspace ? path_1.default.resolve(misc_1.getRootDir(), package_mgr_1.getState().currWorkspace)
                : undefined;
        writePackageSettingType();
        // if (getPkgState().linkedDrcp) {
        //   const plinkTsconfig = Path.resolve(getPkgState().linkedDrcp!.realPath, 'wfh/tsconfig.json');
        //   updateHookedTsconfig({
        //     relPath: Path.resolve(getPkgState().linkedDrcp!.realPath, 'wfh/tsconfig.json'),
        //     baseUrl: '.',
        //     originJson: JSON.parse(fs.readFileSync(plinkTsconfig, 'utf8'))
        //   }, wsDir);
        // }
        updateTsconfigFileForProjects(wsKeys[wsKeys.length - 1]);
        for (const data of getState().tsconfigByRelPath.values()) {
            updateHookedTsconfig(data, wsDir);
        }
    })), action$.pipe(store_1.ofPayloadAction(slice.actions.hookTsconfig), op.mergeMap(action => {
        return action.payload;
    }), op.mergeMap((file) => {
        const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
        const backupFile = backupTsConfigOf(file);
        const isBackupExists = fs.existsSync(backupFile);
        const fileContent = isBackupExists ? fs.readFileSync(backupFile, 'utf8') : fs.readFileSync(file, 'utf8');
        const json = JSON.parse(fileContent);
        const data = {
            relPath,
            baseUrl: json.compilerOptions.baseUrl,
            originJson: json
        };
        exports.dispatcher._change(s => {
            s.tsconfigByRelPath.set(relPath, data);
        });
        if (!isBackupExists) {
            fs.writeFileSync(backupFile, fileContent);
        }
        const wsDir = package_mgr_1.isCwdWorkspace() ? workDir :
            package_mgr_1.getState().currWorkspace ? path_1.default.resolve(misc_1.getRootDir(), package_mgr_1.getState().currWorkspace)
                : undefined;
        return updateHookedTsconfig(data, wsDir);
    })), action$.pipe(store_1.ofPayloadAction(slice.actions.unHookTsconfig), op.mergeMap(({ payload }) => payload), op.mergeMap(file => {
        const absFile = path_1.default.resolve(rootPath, file);
        const backup = backupTsConfigOf(absFile);
        if (fs.existsSync(backup)) {
            log.info('Roll back:', absFile);
            return fs.promises.copyFile(backup, absFile);
        }
        return Promise.resolve();
    })), action$.pipe(store_1.ofPayloadAction(slice.actions.unHookAll), op.tap(() => {
        exports.dispatcher.unHookTsconfig(Array.from(getState().tsconfigByRelPath.keys()));
    }))).pipe(op.ignoreElements(), op.catchError((err, caught) => {
        log.error(err);
        return caught;
    }));
});
function getState() {
    return store_1.stateFactory.sliceState(slice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(slice);
}
exports.getStore = getStore;
function relativePath(file) {
    return path_1.default.relative(rootPath, file).replace(/\\/g, '/');
}
function updateTsconfigFileForProjects(wsKey, includeProject) {
    const ws = package_mgr_1.getState().workspaces.get(wsKey);
    if (ws == null)
        return;
    const projectDirs = package_mgr_1.getProjectList();
    const workspaceDir = path_1.default.resolve(misc_1.getRootDir(), wsKey);
    const recipeManager = require('./recipe-manager');
    const srcRootDir = misc_1.closestCommonParentDir(projectDirs);
    if (includeProject) {
        writeTsConfigForProj(includeProject);
    }
    else {
        for (const proj of projectDirs) {
            writeTsConfigForProj(proj);
        }
    }
    function writeTsConfigForProj(proj) {
        const include = [];
        recipeManager.eachRecipeSrc(proj, (srcDir) => {
            let includeDir = path_1.default.relative(proj, srcDir).replace(/\\/g, '/');
            if (includeDir && includeDir !== '/')
                includeDir += '/';
            include.push(includeDir + '**/*.ts');
            include.push(includeDir + '**/*.tsx');
        });
        if (package_mgr_1.pathToProjKey(proj) === package_mgr_1.getState().linkedDrcpProject) {
            include.push('main/wfh/**/*.ts');
        }
        include.push('dist/*.d.ts');
        const tsconfigFile = createTsConfig(proj, srcRootDir, workspaceDir, {}, 
        // {'_package-settings': [Path.relative(proj, packageSettingDtsFileOf(workspaceDir))
        //   .replace(/\\/g, '/')
        //   .replace(/\.d\.ts$/, '')]
        // },
        include);
        const projDir = path_1.default.resolve(proj);
        package_mgr_1.updateGitIgnores({ file: path_1.default.resolve(proj, '.gitignore'),
            lines: [
                path_1.default.relative(projDir, tsconfigFile).replace(/\\/g, '/')
            ]
        });
        package_mgr_1.updateGitIgnores({
            file: path_1.default.resolve(misc_1.getRootDir(), '.gitignore'),
            lines: [path_1.default.relative(misc_1.getRootDir(), path_1.default.resolve(workspaceDir, 'types')).replace(/\\/g, '/')]
        });
    }
}
function writePackageSettingType() {
    const done = new Array(package_mgr_1.getState().workspaces.size);
    let i = 0;
    for (const wsKey of package_mgr_1.getState().workspaces.keys()) {
        let header = '';
        let body = 'export interface PackagesConfig {\n';
        for (const [typeFile, typeExport, _defaultFile, _defaultExport, pkg] of config_1.getPackageSettingFiles(wsKey)) {
            const varName = pkg.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
            const typeName = varName.charAt(0).toUpperCase() + varName.slice(1);
            header += `import {${typeExport} as ${typeName}} from '${pkg.name}/${typeFile}';\n`;
            body += `  '${pkg.name}': ${typeName};\n`;
        }
        body += '}\n';
        const workspaceDir = path_1.default.resolve(misc_1.getRootDir(), wsKey);
        const file = packageSettingDtsFileOf(workspaceDir);
        log.info(`write file: ${file}`);
        done[i++] = fs.promises.writeFile(file, header + body);
        const dir = path_1.default.dirname(file);
        const srcRootDir = misc_1.closestCommonParentDir([
            dir,
            misc_1.closestCommonParentDir(Array.from(package_list_helper_1.packages4WorkspaceKey(wsKey)).map(pkg => pkg.realPath))
        ]);
        createTsConfig(dir, srcRootDir, workspaceDir, {}, ['*.ts']);
    }
}
function packageSettingDtsFileOf(workspaceDir) {
    return path_1.default.resolve(workspaceDir, symlinkDirName, '_package-settings.d.ts');
}
/**
 *
 * @param pkgName
 * @param dir
 * @param workspace
 * @param drcpDir
 * @param include
 * @return tsconfig file path
 */
function createTsConfig(proj, srcRootDir, workspace, extraPathMapping, include = ['**/*.ts']) {
    const tsjson = {
        extends: null,
        include
    };
    const drcpDir = (package_mgr_1.getState().linkedDrcp || package_mgr_1.getState().installedDrcp).realPath;
    // tsjson.include = [];
    tsjson.extends = path_1.default.relative(proj, path_1.default.resolve(drcpDir, 'wfh/tsconfig-base.json'));
    if (!path_1.default.isAbsolute(tsjson.extends) && !tsjson.extends.startsWith('..')) {
        tsjson.extends = './' + tsjson.extends;
    }
    tsjson.extends = tsjson.extends.replace(/\\/g, '/');
    const rootDir = path_1.default.relative(proj, srcRootDir).replace(/\\/g, '/') || '.';
    tsjson.compilerOptions = {
        rootDir,
        // noResolve: true, // Do not add this, VC will not be able to understand rxjs module
        skipLibCheck: false,
        jsx: 'preserve',
        target: 'es2015',
        module: 'commonjs',
        declaration: false,
        paths: extraPathMapping
    };
    package_list_helper_1.setTsCompilerOptForNodePath(proj, proj, tsjson.compilerOptions, {
        workspaceDir: workspace != null ? workspace : undefined,
        enableTypeRoots: true,
        realPackagePaths: true
    });
    const tsconfigFile = path_1.default.resolve(proj, 'tsconfig.json');
    writeTsConfigFile(tsconfigFile, tsjson);
    return tsconfigFile;
}
function backupTsConfigOf(file) {
    // const tsconfigDir = Path.dirname(file);
    const m = /([^/\\.]+)(\.[^/\\.]+)?$/.exec(file);
    const backupFile = path_1.default.resolve(file.slice(0, file.length - m[0].length) + m[1] + '.orig' + m[2]);
    return backupFile;
}
function updateHookedTsconfig(data, workspaceDir) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const file = path_1.default.isAbsolute(data.relPath) ? data.relPath :
            path_1.default.resolve(misc_1.getRootDir(), data.relPath);
        const tsconfigDir = path_1.default.dirname(file);
        const backup = backupTsConfigOf(file);
        const json = fs.existsSync(backup) ?
            JSON.parse(yield fs.promises.readFile(backup, 'utf8')) : lodash_1.default.cloneDeep(data.originJson);
        if (((_a = json.compilerOptions) === null || _a === void 0 ? void 0 : _a.paths) && json.compilerOptions.paths['_package-settings'] != null) {
            delete json.compilerOptions.paths['_package-settings'];
        }
        const newCo = package_list_helper_1.setTsCompilerOptForNodePath(tsconfigDir, data.baseUrl, json.compilerOptions, {
            workspaceDir, enableTypeRoots: true, realPackagePaths: true
        });
        json.compilerOptions = newCo;
        log.info(file, 'is updated');
        return fs.promises.writeFile(file, JSON.stringify(json, null, '  '));
    });
}
function overrideTsConfig(src, target) {
    for (const key of Object.keys(src)) {
        if (key === 'compilerOptions') {
            if (target.compilerOptions)
                Object.assign(target.compilerOptions, src.compilerOptions);
        }
        else {
            target[key] = src[key];
        }
    }
}
function writeTsConfigFile(tsconfigFile, tsconfigOverrideSrc) {
    if (fs.existsSync(tsconfigFile)) {
        const existing = fs.readFileSync(tsconfigFile, 'utf8');
        const existingJson = parse(existing);
        overrideTsConfig(tsconfigOverrideSrc, existingJson);
        const newJsonStr = JSON.stringify(existingJson, null, '  ');
        if (newJsonStr !== existing) {
            log.info('Write ' + tsconfigFile);
            fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
        }
        else {
            log.debug(`${tsconfigFile} is not changed.`);
        }
    }
    else {
        log.info('Create ' + tsconfigFile);
        fs.writeFileSync(tsconfigFile, JSON.stringify(tsconfigOverrideSrc, null, '  '));
    }
}
// async function writeTsconfigForEachPackage(workspaceDir: string, pks: PackageInfo[],
//   onGitIgnoreFileUpdate: (file: string, content: string) => void) {
//   const drcpDir = getState().linkedDrcp ? getState().linkedDrcp!.realPath :
//     Path.dirname(require.resolve('@wfh/plink/package.json'));
//   const igConfigFiles = pks.map(pk => {
//     // commonPaths[0] = Path.resolve(pk.realPath, 'node_modules');
//     return createTsConfig(pk.name, pk.realPath, workspaceDir, drcpDir);
//   });
//   appendGitignore(igConfigFiles, onGitIgnoreFileUpdate);
// }
// function findGitIngoreFile(startDir: string): string | null {
//   let dir = startDir;
//   while (true) {
//     const test = Path.resolve(startDir, '.gitignore');
//     if (fs.existsSync(test)) {
//       return test;
//     }
//     const parent = Path.dirname(dir);
//     if (parent === dir)
//       return null;
//     dir = parent;
//   }
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILCtDQUN3QztBQUN4QyxtQ0FBd0Q7QUFFeEQsdUNBQWtFO0FBQ2xFLHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBSXJDLE1BQU0sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRy9FLCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEMsTUFBTSxRQUFRLEdBQUcsaUJBQVUsRUFBRSxDQUFDO0FBZTlCLE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUM3QixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxFQUFFLGVBQWU7SUFDckIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCLElBQUcsQ0FBQztRQUN0RCxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQjtZQUNsRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtnQkFDMUIsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNu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O0FBQ3hCLG1CQUFtQjtBQUNuQix5REFBeUQ7QUFDekQsaUNBQWlDO0FBQ2pDLHFCQUFxQjtBQUNyQixRQUFRO0FBQ1Isd0NBQXdDO0FBQ3hDLDBCQUEwQjtBQUMxQixxQkFBcUI7QUFDckIsb0JBQW9CO0FBQ3BCLE1BQU07QUFDTixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBwYWNrYWdlczRXb3Jrc3BhY2VLZXksIENvbXBpbGVyT3B0aW9ucyB9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgeyBnZXRQcm9qZWN0TGlzdCwgcGF0aFRvUHJvaktleSwgZ2V0U3RhdGUgYXMgZ2V0UGtnU3RhdGUsIHVwZGF0ZUdpdElnbm9yZXMsIHNsaWNlIGFzIHBrZ1NsaWNlLFxuICBpc0N3ZFdvcmtzcGFjZSB9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuL3N0b3JlJztcbmltcG9ydCAqIGFzIF9yZWNwIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHsgY2xvc2VzdENvbW1vblBhcmVudERpciwgZ2V0Um9vdERpciB9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuXG5jb25zdCB7c3ltbGlua0Rpck5hbWUsIHdvcmtEaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cblxuLy8gaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmVkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuaW50ZXJmYWNlIEVkaXRvckhlbHBlclN0YXRlIHtcbiAgLyoqIHRzY29uZmlnIGZpbGVzIHNob3VsZCBiZSBjaGFuZ2VkIGFjY29yZGluZyB0byBsaW5rZWQgcGFja2FnZXMgc3RhdGUgKi9cbiAgdHNjb25maWdCeVJlbFBhdGg6IE1hcDxzdHJpbmcsIEhvb2tlZFRzY29uZmlnPjtcbn1cblxuaW50ZXJmYWNlIEhvb2tlZFRzY29uZmlnIHtcbiAgLyoqIGFic29sdXRlIHBhdGggb3IgcGF0aCByZWxhdGl2ZSB0byByb290IHBhdGgsIGFueSBwYXRoIHRoYXQgaXMgc3RvcmVkIGluIFJlZHV4IHN0b3JlLCB0aGUgYmV0dGVyIGl0IGlzIGluIGZvcm0gb2ZcbiAgICogcmVsYXRpdmUgcGF0aCBvZiBSb290IHBhdGhcbiAgICovXG4gIHJlbFBhdGg6IHN0cmluZztcbiAgYmFzZVVybDogc3RyaW5nO1xuICBvcmlnaW5Kc29uOiBhbnk7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogRWRpdG9ySGVscGVyU3RhdGUgPSB7XG4gIHRzY29uZmlnQnlSZWxQYXRoOiBuZXcgTWFwKClcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2VkaXRvci1oZWxwZXInLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgaG9va1RzY29uZmlnKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIHVuSG9va1RzY29uZmlnKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBwYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSByZWxhdGl2ZVBhdGgoZmlsZSk7XG4gICAgICAgIHMudHNjb25maWdCeVJlbFBhdGguZGVsZXRlKHJlbFBhdGgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdW5Ib29rQWxsKCkge31cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPEVkaXRvckhlbHBlclN0YXRlPigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBuZXcgcnguT2JzZXJ2YWJsZShzdWIgPT4ge1xuICAgICAgaWYgKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpO1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBpZiAoIWdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGguaGFzKHJlbFBhdGgpKSB7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBkaXNwYXRjaGVyLmhvb2tUc2NvbmZpZyhbZmlsZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dTbGljZS5hY3Rpb25zLndvcmtzcGFjZUJhdGNoQ2hhbmdlZCksXG4gICAgICBvcC50YXAoKHtwYXlsb2FkOiB3c0tleXN9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCk7XG4gICAgICAgIC8vIGlmIChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgLy8gICBjb25zdCBwbGlua1RzY29uZmlnID0gUGF0aC5yZXNvbHZlKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpO1xuICAgICAgICAvLyAgIHVwZGF0ZUhvb2tlZFRzY29uZmlnKHtcbiAgICAgICAgLy8gICAgIHJlbFBhdGg6IFBhdGgucmVzb2x2ZShnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoLCAnd2ZoL3RzY29uZmlnLmpzb24nKSxcbiAgICAgICAgLy8gICAgIGJhc2VVcmw6ICcuJyxcbiAgICAgICAgLy8gICAgIG9yaWdpbkpzb246IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBsaW5rVHNjb25maWcsICd1dGY4JykpXG4gICAgICAgIC8vICAgfSwgd3NEaXIpO1xuICAgICAgICAvLyB9XG4gICAgICAgIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5c1t3c0tleXMubGVuZ3RoIC0gMV0pO1xuICAgICAgICBmb3IgKGNvbnN0IGRhdGEgb2YgZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC52YWx1ZXMoKSkge1xuICAgICAgICAgIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5ob29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkO1xuICAgICAgfSksXG4gICAgICBvcC5tZXJnZU1hcCgoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb25zdCBiYWNrdXBGaWxlID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcbiAgICAgICAgY29uc3QgaXNCYWNrdXBFeGlzdHMgPSBmcy5leGlzdHNTeW5jKGJhY2t1cEZpbGUpO1xuICAgICAgICBjb25zdCBmaWxlQ29udGVudCA9IGlzQmFja3VwRXhpc3RzID8gZnMucmVhZEZpbGVTeW5jKGJhY2t1cEZpbGUsICd1dGY4JykgOiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3QganNvbjoge2NvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zfSA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnQpO1xuICAgICAgICBjb25zdCBkYXRhOiBIb29rZWRUc2NvbmZpZyA9IHtcbiAgICAgICAgICByZWxQYXRoLFxuICAgICAgICAgIGJhc2VVcmw6IGpzb24uY29tcGlsZXJPcHRpb25zLmJhc2VVcmwsXG4gICAgICAgICAgb3JpZ2luSnNvbjoganNvblxuICAgICAgICB9O1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5zZXQocmVsUGF0aCwgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghaXNCYWNrdXBFeGlzdHMpIHtcbiAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGZpbGVDb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YSwgd3NEaXIpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51bkhvb2tUc2NvbmZpZyksXG4gICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiBwYXlsb2FkKSxcbiAgICAgIG9wLm1lcmdlTWFwKGZpbGUgPT4ge1xuICAgICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBmaWxlKTtcbiAgICAgICAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihhYnNGaWxlKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYmFja3VwKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdSb2xsIGJhY2s6JywgYWJzRmlsZSk7XG4gICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLmNvcHlGaWxlKGJhY2t1cCwgYWJzRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51bkhvb2tBbGwpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci51bkhvb2tUc2NvbmZpZyhBcnJheS5mcm9tKGdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGgua2V5cygpKSk7XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVBhdGgoZmlsZTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVQcm9qZWN0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHdzID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzS2V5KTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyOiB0eXBlb2YgX3JlY3AgPSByZXF1aXJlKCcuL3JlY2lwZS1tYW5hZ2VyJyk7XG5cbiAgY29uc3Qgc3JjUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIocHJvamVjdERpcnMpO1xuXG4gIGlmIChpbmNsdWRlUHJvamVjdCkge1xuICAgIHdyaXRlVHNDb25maWdGb3JQcm9qKGluY2x1ZGVQcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICAgIHdyaXRlVHNDb25maWdGb3JQcm9qKHByb2opO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHdyaXRlVHNDb25maWdGb3JQcm9qKHByb2o6IHN0cmluZykge1xuICAgIGNvbnN0IGluY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgfSk7XG5cbiAgICBpZiAocGF0aFRvUHJvaktleShwcm9qKSA9PT0gZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwUHJvamVjdCkge1xuICAgICAgaW5jbHVkZS5wdXNoKCdtYWluL3dmaC8qKi8qLnRzJyk7XG4gICAgfVxuICAgIGluY2x1ZGUucHVzaCgnZGlzdC8qLmQudHMnKTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBjcmVhdGVUc0NvbmZpZyhwcm9qLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LFxuICAgICAgLy8geydfcGFja2FnZS1zZXR0aW5ncyc6IFtQYXRoLnJlbGF0aXZlKHByb2osIHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcikpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJyldXG4gICAgICAvLyB9LFxuICAgICAgaW5jbHVkZVxuICAgICk7XG4gICAgY29uc3QgcHJvakRpciA9IFBhdGgucmVzb2x2ZShwcm9qKTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlOiBQYXRoLnJlc29sdmUocHJvaiwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbXG4gICAgICAgIFBhdGgucmVsYXRpdmUocHJvakRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIF1cbiAgICB9KTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1BhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAndHlwZXMnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCkge1xuICBjb25zdCBkb25lID0gbmV3IEFycmF5KGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5zaXplKTtcbiAgbGV0IGkgPSAwO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBsZXQgaGVhZGVyID0gJyc7XG4gICAgbGV0IGJvZHkgPSAnZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc0NvbmZpZyB7XFxuJztcbiAgICBmb3IgKGNvbnN0IFt0eXBlRmlsZSwgdHlwZUV4cG9ydCwgX2RlZmF1bHRGaWxlLCBfZGVmYXVsdEV4cG9ydCwgcGtnXSBvZiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdzS2V5KSkge1xuICAgICAgY29uc3QgdmFyTmFtZSA9IHBrZy5zaG9ydE5hbWUucmVwbGFjZSgvLShbXl0pL2csIChtYXRjaCwgZzEpID0+IGcxLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgY29uc3QgdHlwZU5hbWUgPSB2YXJOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFyTmFtZS5zbGljZSgxKTtcbiAgICAgIGhlYWRlciArPSBgaW1wb3J0IHske3R5cGVFeHBvcnR9IGFzICR7dHlwZU5hbWV9fSBmcm9tICcke3BrZy5uYW1lfS8ke3R5cGVGaWxlfSc7XFxuYDtcbiAgICAgIGJvZHkgKz0gYCAgJyR7cGtnLm5hbWV9JzogJHt0eXBlTmFtZX07XFxuYDtcbiAgICB9XG4gICAgYm9keSArPSAnfVxcbic7XG4gICAgY29uc3Qgd29ya3NwYWNlRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuICAgIGNvbnN0IGZpbGUgPSBwYWNrYWdlU2V0dGluZ0R0c0ZpbGVPZih3b3Jrc3BhY2VEaXIpO1xuICAgIGxvZy5pbmZvKGB3cml0ZSBmaWxlOiAke2ZpbGV9YCk7XG4gICAgZG9uZVtpKytdID0gZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUsIGhlYWRlciArIGJvZHkpO1xuICAgIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihbXG4gICAgICBkaXIsXG4gICAgICBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KSkubWFwKHBrZyA9PiBwa2cucmVhbFBhdGgpKVxuICAgIF0pO1xuICAgIGNyZWF0ZVRzQ29uZmlnKGRpciwgc3JjUm9vdERpciwgd29ya3NwYWNlRGlyLCB7fSwgWycqLnRzJ10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCBzeW1saW5rRGlyTmFtZSwgJ19wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa2dOYW1lIFxuICogQHBhcmFtIGRpciBcbiAqIEBwYXJhbSB3b3Jrc3BhY2UgXG4gKiBAcGFyYW0gZHJjcERpciBcbiAqIEBwYXJhbSBpbmNsdWRlIFxuICogQHJldHVybiB0c2NvbmZpZyBmaWxlIHBhdGhcbiAqL1xuZnVuY3Rpb24gY3JlYXRlVHNDb25maWcocHJvajogc3RyaW5nLCBzcmNSb290RGlyOiBzdHJpbmcsIHdvcmtzcGFjZTogc3RyaW5nIHwgbnVsbCxcbiAgZXh0cmFQYXRoTWFwcGluZzoge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX0sXG4gIGluY2x1ZGUgPSBbJyoqLyoudHMnXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgY29uc3QgZHJjcERpciA9IChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBkZWNsYXJhdGlvbjogZmFsc2UsIC8vIEltcG9ydGFudDogdG8gYXZvaWQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yOTgwOCNpc3N1ZWNvbW1lbnQtNDg3ODExODMyXG4gICAgcGF0aHM6IGV4dHJhUGF0aE1hcHBpbmdcbiAgfTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2osIHByb2osIHRzanNvbi5jb21waWxlck9wdGlvbnMsIHtcbiAgICB3b3Jrc3BhY2VEaXI6IHdvcmtzcGFjZSAhPSBudWxsID8gd29ya3NwYWNlIDogdW5kZWZpbmVkLFxuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gIH0pO1xuICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCB0c2pzb24pO1xuICByZXR1cm4gdHNjb25maWdGaWxlO1xufVxuXG5mdW5jdGlvbiBiYWNrdXBUc0NvbmZpZ09mKGZpbGU6IHN0cmluZykge1xuICAvLyBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgbSA9IC8oW14vXFxcXC5dKykoXFwuW14vXFxcXC5dKyk/JC8uZXhlYyhmaWxlKTtcbiAgY29uc3QgYmFja3VwRmlsZSA9IFBhdGgucmVzb2x2ZShmaWxlLnNsaWNlKDAsIGZpbGUubGVuZ3RoIC0gbSFbMF0ubGVuZ3RoKSArIG0hWzFdICsgJy5vcmlnJyArIG0hWzJdKTtcbiAgcmV0dXJuIGJhY2t1cEZpbGU7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YTogSG9va2VkVHNjb25maWcsIHdvcmtzcGFjZURpcj86IHN0cmluZykge1xuICBjb25zdCBmaWxlID0gUGF0aC5pc0Fic29sdXRlKGRhdGEucmVsUGF0aCkgPyBkYXRhLnJlbFBhdGggOlxuICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGRhdGEucmVsUGF0aCk7XG4gIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGZpbGUpO1xuXG4gIGNvbnN0IGpzb246IHtjb21waWxlck9wdGlvbnM/OiBDb21waWxlck9wdGlvbnN9ID0gZnMuZXhpc3RzU3luYyhiYWNrdXApID9cbiAgICBKU09OLnBhcnNlKGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGJhY2t1cCwgJ3V0ZjgnKSkgOiBfLmNsb25lRGVlcChkYXRhLm9yaWdpbkpzb24pO1xuICBpZiAoanNvbi5jb21waWxlck9wdGlvbnM/LnBhdGhzICYmIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddICE9IG51bGwpIHtcbiAgICBkZWxldGUganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ107XG4gIH1cbiAgY29uc3QgbmV3Q28gPSBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNjb25maWdEaXIsIGRhdGEuYmFzZVVybCxcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucyBhcyBhbnksIHtcbiAgICAgIHdvcmtzcGFjZURpciwgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gICAgfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKGZpbGUsICdpcyB1cGRhdGVkJyk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbi8vICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcblxuLy8gICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4vLyAgICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbi8vICAgY29uc3QgaWdDb25maWdGaWxlcyA9IHBrcy5tYXAocGsgPT4ge1xuLy8gICAgIC8vIGNvbW1vblBhdGhzWzBdID0gUGF0aC5yZXNvbHZlKHBrLnJlYWxQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4vLyAgICAgcmV0dXJuIGNyZWF0ZVRzQ29uZmlnKHBrLm5hbWUsIHBrLnJlYWxQYXRoLCB3b3Jrc3BhY2VEaXIsIGRyY3BEaXIpO1xuLy8gICB9KTtcblxuLy8gICBhcHBlbmRHaXRpZ25vcmUoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmluZEdpdEluZ29yZUZpbGUoc3RhcnREaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuLy8gICBsZXQgZGlyID0gc3RhcnREaXI7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShzdGFydERpciwgJy5naXRpZ25vcmUnKTtcbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuLy8gICAgICAgcmV0dXJuIHRlc3Q7XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHBhcmVudCA9IFBhdGguZGlybmFtZShkaXIpO1xuLy8gICAgIGlmIChwYXJlbnQgPT09IGRpcilcbi8vICAgICAgIHJldHVybiBudWxsO1xuLy8gICAgIGRpciA9IHBhcmVudDtcbi8vICAgfVxuLy8gfVxuIl19