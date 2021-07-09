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
/* eslint-disable max-len */
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
            void updateHookedTsconfig(data, wsDir);
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
        strict: true,
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
        const json = (fs.existsSync(backup) ?
            JSON.parse(yield fs.promises.readFile(backup, 'utf8')) : lodash_1.default.cloneDeep(data.originJson));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILCtDQUN3QztBQUN4QyxtQ0FBd0Q7QUFFeEQsdUNBQWtFO0FBQ2xFLHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBSXJDLE1BQU0sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRy9FLCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEMsTUFBTSxRQUFRLEdBQUcsaUJBQVUsRUFBRSxDQUFDO0FBZTlCLE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUM3QixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxFQUFFLGVBQWU7SUFDckIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCLElBQUcsQ0FBQztRQUN0RCxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQjtZQUNsRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtnQkFDMUIsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNu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QUFDM0QsSUFBSTtBQUVKLGdFQUFnRTtBQUNoRSx3QkFBd0I7QUFDeEIsbUJBQW1CO0FBQ25CLHlEQUF5RDtBQUN6RCxpQ0FBaUM7QUFDakMscUJBQXFCO0FBQ3JCLFFBQVE7QUFDUix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIHBhY2thZ2VzNFdvcmtzcGFjZUtleSwgQ29tcGlsZXJPcHRpb25zIH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgdXBkYXRlR2l0SWdub3Jlcywgc2xpY2UgYXMgcGtnU2xpY2UsXG4gIGlzQ3dkV29ya3NwYWNlIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4vc3RvcmUnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBnZXRSb290RGlyIH0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5cbmNvbnN0IHtzeW1saW5rRGlyTmFtZSwgd29ya0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuXG4vLyBpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5pbnRlcmZhY2UgRWRpdG9ySGVscGVyU3RhdGUge1xuICAvKiogdHNjb25maWcgZmlsZXMgc2hvdWxkIGJlIGNoYW5nZWQgYWNjb3JkaW5nIHRvIGxpbmtlZCBwYWNrYWdlcyBzdGF0ZSAqL1xuICB0c2NvbmZpZ0J5UmVsUGF0aDogTWFwPHN0cmluZywgSG9va2VkVHNjb25maWc+O1xufVxuXG5pbnRlcmZhY2UgSG9va2VkVHNjb25maWcge1xuICAvKiogYWJzb2x1dGUgcGF0aCBvciBwYXRoIHJlbGF0aXZlIHRvIHJvb3QgcGF0aCwgYW55IHBhdGggdGhhdCBpcyBzdG9yZWQgaW4gUmVkdXggc3RvcmUsIHRoZSBiZXR0ZXIgaXQgaXMgaW4gZm9ybSBvZlxuICAgKiByZWxhdGl2ZSBwYXRoIG9mIFJvb3QgcGF0aFxuICAgKi9cbiAgcmVsUGF0aDogc3RyaW5nO1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIG9yaWdpbkpzb246IGFueTtcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBFZGl0b3JIZWxwZXJTdGF0ZSA9IHtcbiAgdHNjb25maWdCeVJlbFBhdGg6IG5ldyBNYXAoKVxufTtcblxuY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnZWRpdG9yLWhlbHBlcicsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIG5ldyByeC5PYnNlcnZhYmxlKHN1YiA9PiB7XG4gICAgICBpZiAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCwgJ3dmaC90c2NvbmZpZy5qc29uJyk7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGlmICghZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5oYXMocmVsUGF0aCkpIHtcbiAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGRpc3BhdGNoZXIuaG9va1RzY29uZmlnKFtmaWxlXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdWIuY29tcGxldGUoKTtcbiAgICB9KSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ1NsaWNlLmFjdGlvbnMud29ya3NwYWNlQmF0Y2hDaGFuZ2VkKSxcbiAgICAgIG9wLnRhcCgoe3BheWxvYWQ6IHdzS2V5c30pID0+IHtcbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gd29ya0RpciA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKTtcbiAgICAgICAgLy8gaWYgKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgICAvLyAgIGNvbnN0IHBsaW5rVHNjb25maWcgPSBQYXRoLnJlc29sdmUoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCwgJ3dmaC90c2NvbmZpZy5qc29uJyk7XG4gICAgICAgIC8vICAgdXBkYXRlSG9va2VkVHNjb25maWcoe1xuICAgICAgICAvLyAgICAgcmVsUGF0aDogUGF0aC5yZXNvbHZlKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpLFxuICAgICAgICAvLyAgICAgYmFzZVVybDogJy4nLFxuICAgICAgICAvLyAgICAgb3JpZ2luSnNvbjogSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGxpbmtUc2NvbmZpZywgJ3V0ZjgnKSlcbiAgICAgICAgLy8gICB9LCB3c0Rpcik7XG4gICAgICAgIC8vIH1cbiAgICAgICAgdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXlzW3dzS2V5cy5sZW5ndGggLSAxXSk7XG4gICAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLnZhbHVlcygpKSB7XG4gICAgICAgICAgdm9pZCB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiBhY3Rpb24ucGF5bG9hZDtcbiAgICAgIH0pLFxuICAgICAgb3AubWVyZ2VNYXAoKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgY29uc3QgYmFja3VwRmlsZSA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG4gICAgICAgIGNvbnN0IGlzQmFja3VwRXhpc3RzID0gZnMuZXhpc3RzU3luYyhiYWNrdXBGaWxlKTtcbiAgICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSBpc0JhY2t1cEV4aXN0cyA/IGZzLnJlYWRGaWxlU3luYyhiYWNrdXBGaWxlLCAndXRmOCcpIDogZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IGpzb246IHtjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc30gPSBKU09OLnBhcnNlKGZpbGVDb250ZW50KTtcbiAgICAgICAgY29uc3QgZGF0YTogSG9va2VkVHNjb25maWcgPSB7XG4gICAgICAgICAgcmVsUGF0aCxcbiAgICAgICAgICBiYXNlVXJsOiBqc29uLmNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsLFxuICAgICAgICAgIG9yaWdpbkpzb246IGpzb25cbiAgICAgICAgfTtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICAgIHMudHNjb25maWdCeVJlbFBhdGguc2V0KHJlbFBhdGgsIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWlzQmFja3VwRXhpc3RzKSB7XG4gICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhiYWNrdXBGaWxlLCBmaWxlQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gd29ya0RpciA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gcGF5bG9hZCksXG4gICAgICBvcC5tZXJnZU1hcChmaWxlID0+IHtcbiAgICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoYWJzRmlsZSk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGJhY2t1cCkpIHtcbiAgICAgICAgICBsb2cuaW5mbygnUm9sbCBiYWNrOicsIGFic0ZpbGUpO1xuICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShiYWNrdXAsIGFic0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rQWxsKSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIudW5Ib29rVHNjb25maWcoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLmtleXMoKSkpO1xuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZnVuY3Rpb24gcmVsYXRpdmVQYXRoKGZpbGU6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyh3c0tleTogc3RyaW5nLCBpbmNsdWRlUHJvamVjdD86IHN0cmluZykge1xuICBjb25zdCB3cyA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlcjogdHlwZW9mIF9yZWNwID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpO1xuXG4gIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKHByb2plY3REaXJzKTtcblxuICBpZiAoaW5jbHVkZVByb2plY3QpIHtcbiAgICB3cml0ZVRzQ29uZmlnRm9yUHJvaihpbmNsdWRlUHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwcm9qIG9mIHByb2plY3REaXJzKSB7XG4gICAgICB3cml0ZVRzQ29uZmlnRm9yUHJvaihwcm9qKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB3cml0ZVRzQ29uZmlnRm9yUHJvaihwcm9qOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuXG4gICAgaWYgKHBhdGhUb1Byb2pLZXkocHJvaikgPT09IGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcFByb2plY3QpIHtcbiAgICAgIGluY2x1ZGUucHVzaCgnbWFpbi93ZmgvKiovKi50cycpO1xuICAgIH1cbiAgICBpbmNsdWRlLnB1c2goJ2Rpc3QvKi5kLnRzJyk7XG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gY3JlYXRlVHNDb25maWcocHJvaiwgc3JjUm9vdERpciwgd29ya3NwYWNlRGlyLCB7fSxcbiAgICAgIC8vIHsnX3BhY2thZ2Utc2V0dGluZ3MnOiBbUGF0aC5yZWxhdGl2ZShwcm9qLCBwYWNrYWdlU2V0dGluZ0R0c0ZpbGVPZih3b3Jrc3BhY2VEaXIpKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXC5kXFwudHMkLywgJycpXVxuICAgICAgLy8gfSxcbiAgICAgIGluY2x1ZGVcbiAgICApO1xuICAgIGNvbnN0IHByb2pEaXIgPSBQYXRoLnJlc29sdmUocHJvaik7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZTogUGF0aC5yZXNvbHZlKHByb2osICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1xuICAgICAgICBQYXRoLnJlbGF0aXZlKHByb2pEaXIsIHRzY29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICBdXG4gICAgfSk7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtQYXRoLnJlbGF0aXZlKGdldFJvb3REaXIoKSwgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpIHtcbiAgY29uc3QgZG9uZSA9IG5ldyBBcnJheShnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuc2l6ZSk7XG4gIGxldCBpID0gMDtcbiAgZm9yIChjb25zdCB3c0tleSBvZiBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgbGV0IGhlYWRlciA9ICcnO1xuICAgIGxldCBib2R5ID0gJ2V4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNDb25maWcge1xcbic7XG4gICAgZm9yIChjb25zdCBbdHlwZUZpbGUsIHR5cGVFeHBvcnQsIF9kZWZhdWx0RmlsZSwgX2RlZmF1bHRFeHBvcnQsIHBrZ10gb2YgZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3c0tleSkpIHtcbiAgICAgIGNvbnN0IHZhck5hbWUgPSBwa2cuc2hvcnROYW1lLnJlcGxhY2UoLy0oW15dKS9nLCAobWF0Y2gsIGcxOiBzdHJpbmcpID0+IGcxLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgY29uc3QgdHlwZU5hbWUgPSB2YXJOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFyTmFtZS5zbGljZSgxKTtcbiAgICAgIGhlYWRlciArPSBgaW1wb3J0IHske3R5cGVFeHBvcnR9IGFzICR7dHlwZU5hbWV9fSBmcm9tICcke3BrZy5uYW1lfS8ke3R5cGVGaWxlfSc7XFxuYDtcbiAgICAgIGJvZHkgKz0gYCAgJyR7cGtnLm5hbWV9JzogJHt0eXBlTmFtZX07XFxuYDtcbiAgICB9XG4gICAgYm9keSArPSAnfVxcbic7XG4gICAgY29uc3Qgd29ya3NwYWNlRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuICAgIGNvbnN0IGZpbGUgPSBwYWNrYWdlU2V0dGluZ0R0c0ZpbGVPZih3b3Jrc3BhY2VEaXIpO1xuICAgIGxvZy5pbmZvKGB3cml0ZSBmaWxlOiAke2ZpbGV9YCk7XG4gICAgZG9uZVtpKytdID0gZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUsIGhlYWRlciArIGJvZHkpO1xuICAgIGNvbnN0IGRpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihbXG4gICAgICBkaXIsXG4gICAgICBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KSkubWFwKHBrZyA9PiBwa2cucmVhbFBhdGgpKVxuICAgIF0pO1xuICAgIGNyZWF0ZVRzQ29uZmlnKGRpciwgc3JjUm9vdERpciwgd29ya3NwYWNlRGlyLCB7fSwgWycqLnRzJ10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCBzeW1saW5rRGlyTmFtZSwgJ19wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa2dOYW1lIFxuICogQHBhcmFtIGRpciBcbiAqIEBwYXJhbSB3b3Jrc3BhY2UgXG4gKiBAcGFyYW0gZHJjcERpciBcbiAqIEBwYXJhbSBpbmNsdWRlIFxuICogQHJldHVybiB0c2NvbmZpZyBmaWxlIHBhdGhcbiAqL1xuZnVuY3Rpb24gY3JlYXRlVHNDb25maWcocHJvajogc3RyaW5nLCBzcmNSb290RGlyOiBzdHJpbmcsIHdvcmtzcGFjZTogc3RyaW5nIHwgbnVsbCxcbiAgZXh0cmFQYXRoTWFwcGluZzoge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX0sXG4gIGluY2x1ZGUgPSBbJyoqLyoudHMnXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgY29uc3QgZHJjcERpciA9IChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBzdHJpY3Q6IHRydWUsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBleHRyYVBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UgIT0gbnVsbCA/IHdvcmtzcGFjZSA6IHVuZGVmaW5lZCxcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgcmVhbFBhY2thZ2VQYXRoczogdHJ1ZVxuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gYmFja3VwVHNDb25maWdPZihmaWxlOiBzdHJpbmcpIHtcbiAgLy8gY29uc3QgdHNjb25maWdEaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gIGNvbnN0IG0gPSAvKFteL1xcXFwuXSspKFxcLlteL1xcXFwuXSspPyQvLmV4ZWMoZmlsZSk7XG4gIGNvbnN0IGJhY2t1cEZpbGUgPSBQYXRoLnJlc29sdmUoZmlsZS5zbGljZSgwLCBmaWxlLmxlbmd0aCAtIG0hWzBdLmxlbmd0aCkgKyBtIVsxXSArICcub3JpZycgKyBtIVsyXSk7XG4gIHJldHVybiBiYWNrdXBGaWxlO1xufVxuXG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGE6IEhvb2tlZFRzY29uZmlnLCB3b3Jrc3BhY2VEaXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgZmlsZSA9IFBhdGguaXNBYnNvbHV0ZShkYXRhLnJlbFBhdGgpID8gZGF0YS5yZWxQYXRoIDpcbiAgICBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBkYXRhLnJlbFBhdGgpO1xuICBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcblxuICBjb25zdCBqc29uID0gKGZzLmV4aXN0c1N5bmMoYmFja3VwKSA/XG4gICAgSlNPTi5wYXJzZShhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShiYWNrdXAsICd1dGY4JykpIDogXy5jbG9uZURlZXAoZGF0YS5vcmlnaW5Kc29uKSApIGFzICB7Y29tcGlsZXJPcHRpb25zPzogQ29tcGlsZXJPcHRpb25zfTtcblxuICBpZiAoanNvbi5jb21waWxlck9wdGlvbnM/LnBhdGhzICYmIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddICE9IG51bGwpIHtcbiAgICBkZWxldGUganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ107XG4gIH1cbiAgY29uc3QgbmV3Q28gPSBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNjb25maWdEaXIsIGRhdGEuYmFzZVVybCxcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucyBhcyBhbnksIHtcbiAgICAgIHdvcmtzcGFjZURpciwgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gICAgfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKGZpbGUsICdpcyB1cGRhdGVkJyk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbi8vICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcblxuLy8gICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4vLyAgICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbi8vICAgY29uc3QgaWdDb25maWdGaWxlcyA9IHBrcy5tYXAocGsgPT4ge1xuLy8gICAgIC8vIGNvbW1vblBhdGhzWzBdID0gUGF0aC5yZXNvbHZlKHBrLnJlYWxQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4vLyAgICAgcmV0dXJuIGNyZWF0ZVRzQ29uZmlnKHBrLm5hbWUsIHBrLnJlYWxQYXRoLCB3b3Jrc3BhY2VEaXIsIGRyY3BEaXIpO1xuLy8gICB9KTtcblxuLy8gICBhcHBlbmRHaXRpZ25vcmUoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmluZEdpdEluZ29yZUZpbGUoc3RhcnREaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuLy8gICBsZXQgZGlyID0gc3RhcnREaXI7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShzdGFydERpciwgJy5naXRpZ25vcmUnKTtcbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuLy8gICAgICAgcmV0dXJuIHRlc3Q7XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHBhcmVudCA9IFBhdGguZGlybmFtZShkaXIpO1xuLy8gICAgIGlmIChwYXJlbnQgPT09IGRpcilcbi8vICAgICAgIHJldHVybiBudWxsO1xuLy8gICAgIGRpciA9IHBhcmVudDtcbi8vICAgfVxuLy8gfVxuIl19