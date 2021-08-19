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
const helper_1 = require("../../redux-toolkit-observable/dist/helper");
const package_mgr_1 = require("./package-mgr");
const store_1 = require("./store");
const misc_1 = require("./utils/misc");
const config_1 = require("./config");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const misc_2 = require("./utils/misc");
const { workDir, distDir } = misc_2.plinkEnv;
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
    const pkgActionByTypes = helper_1.castByActionType(package_mgr_1.slice.actions, action$);
    return rx.merge(new rx.Observable(sub => {
        // if (getPkgState().linkedDrcp) {
        const plinkDir = package_mgr_1.getState().linkedDrcp || package_mgr_1.getState().installedDrcp;
        const file = path_1.default.resolve(plinkDir.realPath, 'wfh/tsconfig.json');
        const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
        if (!getState().tsconfigByRelPath.has(relPath)) {
            process.nextTick(() => exports.dispatcher.hookTsconfig([file]));
        }
        // }
        sub.complete();
    }), pkgActionByTypes.workspaceBatchChanged.pipe(op.concatMap(({ payload: wsKeys }) => __awaiter(void 0, void 0, void 0, function* () {
        const wsDir = package_mgr_1.isCwdWorkspace() ? workDir :
            package_mgr_1.getState().currWorkspace ? path_1.default.resolve(misc_1.getRootDir(), package_mgr_1.getState().currWorkspace)
                : undefined;
        void writePackageSettingType();
        updateTsconfigFileForProjects(wsKeys[wsKeys.length - 1]);
        for (const data of getState().tsconfigByRelPath.values()) {
            void updateHookedTsconfig(data, wsDir);
        }
    }))), action$.pipe(store_1.ofPayloadAction(slice.actions.hookTsconfig), op.mergeMap(action => {
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
        const file = path_1.default.join(distDir, wsKey + '.package-settings.d.ts');
        log.info(`write file: ${file}`);
        done[i++] = fs.promises.writeFile(file, header + body);
        const dir = path_1.default.dirname(file);
        const srcRootDir = misc_1.closestCommonParentDir([
            dir,
            misc_1.closestCommonParentDir(Array.from(package_list_helper_1.packages4WorkspaceKey(wsKey)).map(pkg => pkg.realPath))
        ]);
        createTsConfig(dir, srcRootDir, workspaceDir, {}, ['*.ts']);
    }
    return Promise.all(done);
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
        workspaceDir: workspace,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILHVFQUE0RTtBQUM1RSwrQ0FDd0M7QUFDeEMsbUNBQXdEO0FBRXhELHVDQUFrRTtBQUNsRSxxQ0FBZ0Q7QUFDaEQseUNBQTJCO0FBQzNCLG1EQUFxQztBQUVyQyx1Q0FBc0M7QUFFdEMsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFHcEMsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDcEQsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFlOUIsTUFBTSxZQUFZLEdBQXNCO0lBQ3RDLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0NBQzdCLENBQUM7QUFFRixNQUFNLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUNsQyxJQUFJLEVBQUUsZUFBZTtJQUNyQixZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEIsSUFBRyxDQUFDO1FBQ3RELGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCO1lBQ2xELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUMxQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLENBQUMsQ0FBQyxpQkFBaUIs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eEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIHBhY2thZ2VzNFdvcmtzcGFjZUtleSwgQ29tcGlsZXJPcHRpb25zIH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7Y2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnLi4vLi4vcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvaGVscGVyJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgdXBkYXRlR2l0SWdub3Jlcywgc2xpY2UgYXMgcGtnU2xpY2UsXG4gIGlzQ3dkV29ya3NwYWNlIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4vc3RvcmUnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBnZXRSb290RGlyIH0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuXG5jb25zdCB7d29ya0RpciwgZGlzdERpcn0gPSBwbGlua0VudjtcblxuXG4vLyBpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5pbnRlcmZhY2UgRWRpdG9ySGVscGVyU3RhdGUge1xuICAvKiogdHNjb25maWcgZmlsZXMgc2hvdWxkIGJlIGNoYW5nZWQgYWNjb3JkaW5nIHRvIGxpbmtlZCBwYWNrYWdlcyBzdGF0ZSAqL1xuICB0c2NvbmZpZ0J5UmVsUGF0aDogTWFwPHN0cmluZywgSG9va2VkVHNjb25maWc+O1xufVxuXG5pbnRlcmZhY2UgSG9va2VkVHNjb25maWcge1xuICAvKiogYWJzb2x1dGUgcGF0aCBvciBwYXRoIHJlbGF0aXZlIHRvIHJvb3QgcGF0aCwgYW55IHBhdGggdGhhdCBpcyBzdG9yZWQgaW4gUmVkdXggc3RvcmUsIHRoZSBiZXR0ZXIgaXQgaXMgaW4gZm9ybSBvZlxuICAgKiByZWxhdGl2ZSBwYXRoIG9mIFJvb3QgcGF0aFxuICAgKi9cbiAgcmVsUGF0aDogc3RyaW5nO1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIG9yaWdpbkpzb246IGFueTtcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBFZGl0b3JIZWxwZXJTdGF0ZSA9IHtcbiAgdHNjb25maWdCeVJlbFBhdGg6IG5ldyBNYXAoKVxufTtcblxuY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnZWRpdG9yLWhlbHBlcicsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgY29uc3QgcGtnQWN0aW9uQnlUeXBlcyA9IGNhc3RCeUFjdGlvblR5cGUocGtnU2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBuZXcgcnguT2JzZXJ2YWJsZShzdWIgPT4ge1xuICAgICAgLy8gaWYgKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgY29uc3QgcGxpbmtEaXIgPSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwITtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUocGxpbmtEaXIucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpO1xuICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmICghZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5oYXMocmVsUGF0aCkpIHtcbiAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBkaXNwYXRjaGVyLmhvb2tUc2NvbmZpZyhbZmlsZV0pKTtcbiAgICAgIH1cbiAgICAgIC8vIH1cbiAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgIH0pLFxuICAgIHBrZ0FjdGlvbkJ5VHlwZXMud29ya3NwYWNlQmF0Y2hDaGFuZ2VkLnBpcGUoXG4gICAgICBvcC5jb25jYXRNYXAoYXN5bmMgKHtwYXlsb2FkOiB3c0tleXN9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHZvaWQgd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKTtcbiAgICAgICAgdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXlzW3dzS2V5cy5sZW5ndGggLSAxXSk7XG4gICAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLnZhbHVlcygpKSB7XG4gICAgICAgICAgdm9pZCB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiBhY3Rpb24ucGF5bG9hZDtcbiAgICAgIH0pLFxuICAgICAgb3AubWVyZ2VNYXAoKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgY29uc3QgYmFja3VwRmlsZSA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG4gICAgICAgIGNvbnN0IGlzQmFja3VwRXhpc3RzID0gZnMuZXhpc3RzU3luYyhiYWNrdXBGaWxlKTtcbiAgICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSBpc0JhY2t1cEV4aXN0cyA/IGZzLnJlYWRGaWxlU3luYyhiYWNrdXBGaWxlLCAndXRmOCcpIDogZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IGpzb246IHtjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc30gPSBKU09OLnBhcnNlKGZpbGVDb250ZW50KTtcbiAgICAgICAgY29uc3QgZGF0YTogSG9va2VkVHNjb25maWcgPSB7XG4gICAgICAgICAgcmVsUGF0aCxcbiAgICAgICAgICBiYXNlVXJsOiBqc29uLmNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsLFxuICAgICAgICAgIG9yaWdpbkpzb246IGpzb25cbiAgICAgICAgfTtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICAgIHMudHNjb25maWdCeVJlbFBhdGguc2V0KHJlbFBhdGgsIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWlzQmFja3VwRXhpc3RzKSB7XG4gICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhiYWNrdXBGaWxlLCBmaWxlQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gd29ya0RpciA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gcGF5bG9hZCksXG4gICAgICBvcC5tZXJnZU1hcChmaWxlID0+IHtcbiAgICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoYWJzRmlsZSk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGJhY2t1cCkpIHtcbiAgICAgICAgICBsb2cuaW5mbygnUm9sbCBiYWNrOicsIGFic0ZpbGUpO1xuICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShiYWNrdXAsIGFic0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rQWxsKSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIudW5Ib29rVHNjb25maWcoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLmtleXMoKSkpO1xuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZnVuY3Rpb24gcmVsYXRpdmVQYXRoKGZpbGU6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyh3c0tleTogc3RyaW5nLCBpbmNsdWRlUHJvamVjdD86IHN0cmluZykge1xuICBjb25zdCB3cyA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKSBhcyB0eXBlb2YgX3JlY3A7XG5cbiAgY29uc3Qgc3JjUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIocHJvamVjdERpcnMpO1xuXG4gIGlmIChpbmNsdWRlUHJvamVjdCkge1xuICAgIHdyaXRlVHNDb25maWdGb3JQcm9qKGluY2x1ZGVQcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICAgIHdyaXRlVHNDb25maWdGb3JQcm9qKHByb2opO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHdyaXRlVHNDb25maWdGb3JQcm9qKHByb2o6IHN0cmluZykge1xuICAgIGNvbnN0IGluY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgfSk7XG5cbiAgICBpZiAocGF0aFRvUHJvaktleShwcm9qKSA9PT0gZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwUHJvamVjdCkge1xuICAgICAgaW5jbHVkZS5wdXNoKCdtYWluL3dmaC8qKi8qLnRzJyk7XG4gICAgfVxuICAgIGluY2x1ZGUucHVzaCgnZGlzdC8qLmQudHMnKTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBjcmVhdGVUc0NvbmZpZyhwcm9qLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LFxuICAgICAgLy8geydfcGFja2FnZS1zZXR0aW5ncyc6IFtQYXRoLnJlbGF0aXZlKHByb2osIHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcikpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJyldXG4gICAgICAvLyB9LFxuICAgICAgaW5jbHVkZVxuICAgICk7XG4gICAgY29uc3QgcHJvakRpciA9IFBhdGgucmVzb2x2ZShwcm9qKTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlOiBQYXRoLnJlc29sdmUocHJvaiwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbXG4gICAgICAgIFBhdGgucmVsYXRpdmUocHJvakRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIF1cbiAgICB9KTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1BhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAndHlwZXMnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCkge1xuICBjb25zdCBkb25lID0gbmV3IEFycmF5PFByb21pc2U8dW5rbm93bj4+KGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5zaXplKTtcbiAgbGV0IGkgPSAwO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBsZXQgaGVhZGVyID0gJyc7XG4gICAgbGV0IGJvZHkgPSAnZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc0NvbmZpZyB7XFxuJztcbiAgICBmb3IgKGNvbnN0IFt0eXBlRmlsZSwgdHlwZUV4cG9ydCwgX2RlZmF1bHRGaWxlLCBfZGVmYXVsdEV4cG9ydCwgcGtnXSBvZiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdzS2V5KSkge1xuICAgICAgY29uc3QgdmFyTmFtZSA9IHBrZy5zaG9ydE5hbWUucmVwbGFjZSgvLShbXl0pL2csIChtYXRjaCwgZzE6IHN0cmluZykgPT4gZzEudG9VcHBlckNhc2UoKSk7XG4gICAgICBjb25zdCB0eXBlTmFtZSA9IHZhck5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YXJOYW1lLnNsaWNlKDEpO1xuICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyR7dHlwZUV4cG9ydH0gYXMgJHt0eXBlTmFtZX19IGZyb20gJyR7cGtnLm5hbWV9LyR7dHlwZUZpbGV9JztcXG5gO1xuICAgICAgYm9keSArPSBgICAnJHtwa2cubmFtZX0nOiAke3R5cGVOYW1lfTtcXG5gO1xuICAgIH1cbiAgICBib2R5ICs9ICd9XFxuJztcbiAgICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG4gICAgY29uc3QgZmlsZSA9IFBhdGguam9pbihkaXN0RGlyLCB3c0tleSArICcucGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG4gICAgbG9nLmluZm8oYHdyaXRlIGZpbGU6ICR7ZmlsZX1gKTtcbiAgICBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgaGVhZGVyICsgYm9keSk7XG4gICAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKFtcbiAgICAgIGRpcixcbiAgICAgIGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKS5tYXAocGtnID0+IHBrZy5yZWFsUGF0aCkpXG4gICAgXSk7XG4gICAgY3JlYXRlVHNDb25maWcoZGlyLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LCBbJyoudHMnXSk7XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRvbmUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcsXG4gIGV4dHJhUGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119LFxuICBpbmNsdWRlID0gWycqKi8qLnRzJ10pIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbCxcbiAgICBpbmNsdWRlXG4gIH07XG4gIGNvbnN0IGRyY3BEaXIgPSAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFBrZ1N0YXRlKCkuaW5zdGFsbGVkRHJjcCkhLnJlYWxQYXRoO1xuICAvLyB0c2pzb24uaW5jbHVkZSA9IFtdO1xuICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgUGF0aC5yZXNvbHZlKGRyY3BEaXIsICd3ZmgvdHNjb25maWctYmFzZS5qc29uJykpO1xuICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgfVxuICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBjb25zdCByb290RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNSb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgfHwgJy4nO1xuICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgIHJvb3REaXIsXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgc3RyaWN0OiB0cnVlLFxuICAgIGRlY2xhcmF0aW9uOiBmYWxzZSwgLy8gSW1wb3J0YW50OiB0byBhdm9pZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI5ODA4I2lzc3VlY29tbWVudC00ODc4MTE4MzJcbiAgICBwYXRoczogZXh0cmFQYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgcHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIHdvcmtzcGFjZURpcjogd29ya3NwYWNlLFxuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gIH0pO1xuICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCB0c2pzb24pO1xuICByZXR1cm4gdHNjb25maWdGaWxlO1xufVxuXG5mdW5jdGlvbiBiYWNrdXBUc0NvbmZpZ09mKGZpbGU6IHN0cmluZykge1xuICAvLyBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgbSA9IC8oW14vXFxcXC5dKykoXFwuW14vXFxcXC5dKyk/JC8uZXhlYyhmaWxlKTtcbiAgY29uc3QgYmFja3VwRmlsZSA9IFBhdGgucmVzb2x2ZShmaWxlLnNsaWNlKDAsIGZpbGUubGVuZ3RoIC0gbSFbMF0ubGVuZ3RoKSArIG0hWzFdICsgJy5vcmlnJyArIG0hWzJdKTtcbiAgcmV0dXJuIGJhY2t1cEZpbGU7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YTogSG9va2VkVHNjb25maWcsIHdvcmtzcGFjZURpcj86IHN0cmluZykge1xuICBjb25zdCBmaWxlID0gUGF0aC5pc0Fic29sdXRlKGRhdGEucmVsUGF0aCkgPyBkYXRhLnJlbFBhdGggOlxuICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGRhdGEucmVsUGF0aCk7XG4gIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGZpbGUpO1xuXG4gIGNvbnN0IGpzb24gPSAoZnMuZXhpc3RzU3luYyhiYWNrdXApID9cbiAgICBKU09OLnBhcnNlKGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGJhY2t1cCwgJ3V0ZjgnKSkgOiBfLmNsb25lRGVlcChkYXRhLm9yaWdpbkpzb24pICkgYXMgIHtjb21waWxlck9wdGlvbnM/OiBDb21waWxlck9wdGlvbnN9O1xuXG4gIGlmIChqc29uLmNvbXBpbGVyT3B0aW9ucz8ucGF0aHMgJiYganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gIT0gbnVsbCkge1xuICAgIGRlbGV0ZSBqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1snX3BhY2thZ2Utc2V0dGluZ3MnXTtcbiAgfVxuICBjb25zdCBuZXdDbyA9IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCh0c2NvbmZpZ0RpciwgZGF0YS5iYXNlVXJsLFxuICAgIGpzb24uY29tcGlsZXJPcHRpb25zIGFzIGFueSwge1xuICAgICAgd29ya3NwYWNlRGlyLCBlbmFibGVUeXBlUm9vdHM6IHRydWUsIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgICB9KTtcbiAganNvbi5jb21waWxlck9wdGlvbnMgPSBuZXdDbztcbiAgbG9nLmluZm8oZmlsZSwgJ2lzIHVwZGF0ZWQnKTtcbiAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnICAnKSk7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoc3JjOiBhbnksIHRhcmdldDogYW55KSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICBpZiAoa2V5ID09PSAnY29tcGlsZXJPcHRpb25zJykge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlck9wdGlvbnMpXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LmNvbXBpbGVyT3B0aW9ucywgc3JjLmNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZTogc3RyaW5nLCB0c2NvbmZpZ092ZXJyaWRlU3JjOiBhbnkpIHtcbiAgaWYgKGZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBleGlzdGluZ0pzb24gPSBwYXJzZShleGlzdGluZyk7XG4gICAgb3ZlcnJpZGVUc0NvbmZpZyh0c2NvbmZpZ092ZXJyaWRlU3JjLCBleGlzdGluZ0pzb24pO1xuICAgIGNvbnN0IG5ld0pzb25TdHIgPSBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpO1xuICAgIGlmIChuZXdKc29uU3RyICE9PSBleGlzdGluZykge1xuICAgICAgbG9nLmluZm8oJ1dyaXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoYCR7dHNjb25maWdGaWxlfSBpcyBub3QgY2hhbmdlZC5gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oJ0NyZWF0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLFxuLy8gICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuXG4vLyAgIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbi8vICAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuLy8gICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4vLyAgICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbi8vICAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4vLyAgIH0pO1xuXG4vLyAgIGFwcGVuZEdpdGlnbm9yZShpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4vLyAgIGxldCBkaXIgPSBzdGFydERpcjtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4vLyAgICAgICByZXR1cm4gdGVzdDtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4vLyAgICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuLy8gICAgICAgcmV0dXJuIG51bGw7XG4vLyAgICAgZGlyID0gcGFyZW50O1xuLy8gICB9XG4vLyB9XG4iXX0=