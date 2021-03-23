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
const { symlinkDirName } = JSON.parse(process.env.__plink);
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
        const wsDir = package_mgr_1.isCwdWorkspace() ? process.cwd() :
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
        const wsDir = package_mgr_1.isCwdWorkspace() ? process.cwd() :
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILCtDQUN3QztBQUN4QyxtQ0FBd0Q7QUFFeEQsdUNBQWtFO0FBQ2xFLHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBSXJDLE1BQU0sRUFBQyxjQUFjLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7QUFHdEUsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDcEQsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFlOUIsTUFBTSxZQUFZLEdBQXNCO0lBQ3RDLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0NBQzdCLENBQUM7QUFFRixNQUFNLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUNsQyxJQUFJLEVBQUUsZUFBZTtJQUNyQixZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEIsSUFBRyxDQUFDO1FBQ3RELGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCO1lBQ2xELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUMxQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLENBQUMsQ0FB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LGdFQUFnRTtBQUNoRSx3QkFBd0I7QUFDeEIsbUJBQW1CO0FBQ25CLHlEQUF5RDtBQUN6RCxpQ0FBaUM7QUFDakMscUJBQXFCO0FBQ3JCLFFBQVE7QUFDUix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIHBhY2thZ2VzNFdvcmtzcGFjZUtleSwgQ29tcGlsZXJPcHRpb25zIH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgdXBkYXRlR2l0SWdub3Jlcywgc2xpY2UgYXMgcGtnU2xpY2UsXG4gIGlzQ3dkV29ya3NwYWNlIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4vc3RvcmUnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBnZXRSb290RGlyIH0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5cbmNvbnN0IHtzeW1saW5rRGlyTmFtZX0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuXG4vLyBpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZWRpdG9yLWhlbHBlcicpO1xuY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5pbnRlcmZhY2UgRWRpdG9ySGVscGVyU3RhdGUge1xuICAvKiogdHNjb25maWcgZmlsZXMgc2hvdWxkIGJlIGNoYW5nZWQgYWNjb3JkaW5nIHRvIGxpbmtlZCBwYWNrYWdlcyBzdGF0ZSAqL1xuICB0c2NvbmZpZ0J5UmVsUGF0aDogTWFwPHN0cmluZywgSG9va2VkVHNjb25maWc+O1xufVxuXG5pbnRlcmZhY2UgSG9va2VkVHNjb25maWcge1xuICAvKiogYWJzb2x1dGUgcGF0aCBvciBwYXRoIHJlbGF0aXZlIHRvIHJvb3QgcGF0aCwgYW55IHBhdGggdGhhdCBpcyBzdG9yZWQgaW4gUmVkdXggc3RvcmUsIHRoZSBiZXR0ZXIgaXQgaXMgaW4gZm9ybSBvZlxuICAgKiByZWxhdGl2ZSBwYXRoIG9mIFJvb3QgcGF0aFxuICAgKi9cbiAgcmVsUGF0aDogc3RyaW5nO1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIG9yaWdpbkpzb246IGFueTtcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBFZGl0b3JIZWxwZXJTdGF0ZSA9IHtcbiAgdHNjb25maWdCeVJlbFBhdGg6IG5ldyBNYXAoKVxufTtcblxuY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnZWRpdG9yLWhlbHBlcicsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIG5ldyByeC5PYnNlcnZhYmxlKHN1YiA9PiB7XG4gICAgICBpZiAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCwgJ3dmaC90c2NvbmZpZy5qc29uJyk7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGlmICghZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5oYXMocmVsUGF0aCkpIHtcbiAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGRpc3BhdGNoZXIuaG9va1RzY29uZmlnKFtmaWxlXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdWIuY29tcGxldGUoKTtcbiAgICB9KSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ1NsaWNlLmFjdGlvbnMud29ya3NwYWNlQmF0Y2hDaGFuZ2VkKSxcbiAgICAgIG9wLnRhcCgoe3BheWxvYWQ6IHdzS2V5c30pID0+IHtcbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gcHJvY2Vzcy5jd2QoKSA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKTtcbiAgICAgICAgLy8gaWYgKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgICAvLyAgIGNvbnN0IHBsaW5rVHNjb25maWcgPSBQYXRoLnJlc29sdmUoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCwgJ3dmaC90c2NvbmZpZy5qc29uJyk7XG4gICAgICAgIC8vICAgdXBkYXRlSG9va2VkVHNjb25maWcoe1xuICAgICAgICAvLyAgICAgcmVsUGF0aDogUGF0aC5yZXNvbHZlKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpLFxuICAgICAgICAvLyAgICAgYmFzZVVybDogJy4nLFxuICAgICAgICAvLyAgICAgb3JpZ2luSnNvbjogSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGxpbmtUc2NvbmZpZywgJ3V0ZjgnKSlcbiAgICAgICAgLy8gICB9LCB3c0Rpcik7XG4gICAgICAgIC8vIH1cbiAgICAgICAgdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXlzW3dzS2V5cy5sZW5ndGggLSAxXSk7XG4gICAgICAgIGZvciAoY29uc3QgZGF0YSBvZiBnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLnZhbHVlcygpKSB7XG4gICAgICAgICAgdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YSwgd3NEaXIpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhvb2tUc2NvbmZpZyksXG4gICAgICBvcC5tZXJnZU1hcChhY3Rpb24gPT4ge1xuICAgICAgICByZXR1cm4gYWN0aW9uLnBheWxvYWQ7XG4gICAgICB9KSxcbiAgICAgIG9wLm1lcmdlTWFwKChmaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbnN0IGJhY2t1cEZpbGUgPSBiYWNrdXBUc0NvbmZpZ09mKGZpbGUpO1xuICAgICAgICBjb25zdCBpc0JhY2t1cEV4aXN0cyA9IGZzLmV4aXN0c1N5bmMoYmFja3VwRmlsZSk7XG4gICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gaXNCYWNrdXBFeGlzdHMgPyBmcy5yZWFkRmlsZVN5bmMoYmFja3VwRmlsZSwgJ3V0ZjgnKSA6IGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgICBjb25zdCBqc29uOiB7Y29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnN9ID0gSlNPTi5wYXJzZShmaWxlQ29udGVudCk7XG4gICAgICAgIGNvbnN0IGRhdGE6IEhvb2tlZFRzY29uZmlnID0ge1xuICAgICAgICAgIHJlbFBhdGgsXG4gICAgICAgICAgYmFzZVVybDoganNvbi5jb21waWxlck9wdGlvbnMuYmFzZVVybCxcbiAgICAgICAgICBvcmlnaW5Kc29uOiBqc29uXG4gICAgICAgIH07XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgICBzLnRzY29uZmlnQnlSZWxQYXRoLnNldChyZWxQYXRoLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFpc0JhY2t1cEV4aXN0cykge1xuICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgZmlsZUNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHByb2Nlc3MuY3dkKCkgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHBheWxvYWQpLFxuICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGZpbGUpO1xuICAgICAgICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGFic0ZpbGUpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhiYWNrdXApKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ1JvbGwgYmFjazonLCBhYnNGaWxlKTtcbiAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuY29weUZpbGUoYmFja3VwLCBhYnNGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va0FsbCksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKEFycmF5LmZyb20oZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5rZXlzKCkpKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gY2F1Z2h0O1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmZ1bmN0aW9uIHJlbGF0aXZlUGF0aChmaWxlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXk6IHN0cmluZywgaW5jbHVkZVByb2plY3Q/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3MgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwcm9qZWN0RGlycyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qZWN0KSB7XG4gICAgd3JpdGVUc0NvbmZpZ0ZvclByb2ooaW5jbHVkZVByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgICAgd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvaik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvajogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcblxuICAgIGlmIChwYXRoVG9Qcm9qS2V5KHByb2opID09PSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3BQcm9qZWN0KSB7XG4gICAgICBpbmNsdWRlLnB1c2goJ21haW4vd2ZoLyoqLyoudHMnKTtcbiAgICB9XG4gICAgaW5jbHVkZS5wdXNoKCdkaXN0LyouZC50cycpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKHByb2osIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sXG4gICAgICAvLyB7J19wYWNrYWdlLXNldHRpbmdzJzogW1BhdGgucmVsYXRpdmUocHJvaiwgcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyKSlcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKV1cbiAgICAgIC8vIH0sXG4gICAgICBpbmNsdWRlXG4gICAgKTtcbiAgICBjb25zdCBwcm9qRGlyID0gUGF0aC5yZXNvbHZlKHByb2opO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGU6IFBhdGgucmVzb2x2ZShwcm9qLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCB0c2NvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgXVxuICAgIH0pO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe1xuICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyldXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKSB7XG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXkoZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLnNpemUpO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICBsZXQgYm9keSA9ICdleHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzQ29uZmlnIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMSkgPT4gZzEudG9VcHBlckNhc2UoKSk7XG4gICAgICBjb25zdCB0eXBlTmFtZSA9IHZhck5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YXJOYW1lLnNsaWNlKDEpO1xuICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyR7dHlwZUV4cG9ydH0gYXMgJHt0eXBlTmFtZX19IGZyb20gJyR7cGtnLm5hbWV9LyR7dHlwZUZpbGV9JztcXG5gO1xuICAgICAgYm9keSArPSBgICAnJHtwa2cubmFtZX0nOiAke3R5cGVOYW1lfTtcXG5gO1xuICAgIH1cbiAgICBib2R5ICs9ICd9XFxuJztcbiAgICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG4gICAgY29uc3QgZmlsZSA9IHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcik7XG4gICAgbG9nLmluZm8oYHdyaXRlIGZpbGU6ICR7ZmlsZX1gKTtcbiAgICBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgaGVhZGVyICsgYm9keSk7XG4gICAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKFtcbiAgICAgIGRpcixcbiAgICAgIGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKS5tYXAocGtnID0+IHBrZy5yZWFsUGF0aCkpXG4gICAgXSk7XG4gICAgY3JlYXRlVHNDb25maWcoZGlyLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LCBbJyoudHMnXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsIHN5bWxpbmtEaXJOYW1lLCAnX3BhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLFxuICBleHRyYVBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfSxcbiAgaW5jbHVkZSA9IFsnKiovKi50cyddKSB7XG4gIGNvbnN0IHRzanNvbjogYW55ID0ge1xuICAgIGV4dGVuZHM6IG51bGwsXG4gICAgaW5jbHVkZVxuICB9O1xuICBjb25zdCBkcmNwRGlyID0gKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCB8fCBnZXRQa2dTdGF0ZSgpLmluc3RhbGxlZERyY3ApIS5yZWFsUGF0aDtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIFBhdGgucmVzb2x2ZShkcmNwRGlyLCAnd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpKTtcbiAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gIH1cbiAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgY29uc3Qgcm9vdERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjUm9vdERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpIHx8ICcuJztcbiAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICByb290RGlyLFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgIHNraXBMaWJDaGVjazogZmFsc2UsXG4gICAganN4OiAncHJlc2VydmUnLFxuICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgbW9kdWxlOiAnY29tbW9uanMnLFxuICAgIGRlY2xhcmF0aW9uOiBmYWxzZSwgLy8gSW1wb3J0YW50OiB0byBhdm9pZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI5ODA4I2lzc3VlY29tbWVudC00ODc4MTE4MzJcbiAgICBwYXRoczogZXh0cmFQYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgcHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIHdvcmtzcGFjZURpcjogd29ya3NwYWNlICE9IG51bGwgPyB3b3Jrc3BhY2UgOiB1bmRlZmluZWQsXG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIGJhY2t1cFRzQ29uZmlnT2YoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBtID0gLyhbXi9cXFxcLl0rKShcXC5bXi9cXFxcLl0rKT8kLy5leGVjKGZpbGUpO1xuICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKGZpbGUuc2xpY2UoMCwgZmlsZS5sZW5ndGggLSBtIVswXS5sZW5ndGgpICsgbSFbMV0gKyAnLm9yaWcnICsgbSFbMl0pO1xuICByZXR1cm4gYmFja3VwRmlsZTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhOiBIb29rZWRUc2NvbmZpZywgd29ya3NwYWNlRGlyPzogc3RyaW5nKSB7XG4gIGNvbnN0IGZpbGUgPSBQYXRoLmlzQWJzb2x1dGUoZGF0YS5yZWxQYXRoKSA/IGRhdGEucmVsUGF0aCA6XG4gICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZGF0YS5yZWxQYXRoKTtcbiAgY29uc3QgdHNjb25maWdEaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG5cbiAgY29uc3QganNvbjoge2NvbXBpbGVyT3B0aW9ucz86IENvbXBpbGVyT3B0aW9uc30gPSBmcy5leGlzdHNTeW5jKGJhY2t1cCkgP1xuICAgIEpTT04ucGFyc2UoYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoYmFja3VwLCAndXRmOCcpKSA6IF8uY2xvbmVEZWVwKGRhdGEub3JpZ2luSnNvbik7XG4gIGlmIChqc29uLmNvbXBpbGVyT3B0aW9ucz8ucGF0aHMgJiYganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gIT0gbnVsbCkge1xuICAgIGRlbGV0ZSBqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1snX3BhY2thZ2Utc2V0dGluZ3MnXTtcbiAgfVxuICBjb25zdCBuZXdDbyA9IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCh0c2NvbmZpZ0RpciwgZGF0YS5iYXNlVXJsLFxuICAgIGpzb24uY29tcGlsZXJPcHRpb25zIGFzIGFueSwge1xuICAgICAgd29ya3NwYWNlRGlyLCBlbmFibGVUeXBlUm9vdHM6IHRydWUsIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgICB9KTtcbiAganNvbi5jb21waWxlck9wdGlvbnMgPSBuZXdDbztcbiAgbG9nLmluZm8oZmlsZSwgJ2lzIHVwZGF0ZWQnKTtcbiAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnICAnKSk7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoc3JjOiBhbnksIHRhcmdldDogYW55KSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICBpZiAoa2V5ID09PSAnY29tcGlsZXJPcHRpb25zJykge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlck9wdGlvbnMpXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LmNvbXBpbGVyT3B0aW9ucywgc3JjLmNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZTogc3RyaW5nLCB0c2NvbmZpZ092ZXJyaWRlU3JjOiBhbnkpIHtcbiAgaWYgKGZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKTtcbiAgICBjb25zdCBleGlzdGluZ0pzb24gPSBwYXJzZShleGlzdGluZyk7XG4gICAgb3ZlcnJpZGVUc0NvbmZpZyh0c2NvbmZpZ092ZXJyaWRlU3JjLCBleGlzdGluZ0pzb24pO1xuICAgIGNvbnN0IG5ld0pzb25TdHIgPSBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpO1xuICAgIGlmIChuZXdKc29uU3RyICE9PSBleGlzdGluZykge1xuICAgICAgbG9nLmluZm8oJ1dyaXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoYCR7dHNjb25maWdGaWxlfSBpcyBub3QgY2hhbmdlZC5gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oJ0NyZWF0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLFxuLy8gICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuXG4vLyAgIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbi8vICAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuLy8gICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4vLyAgICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbi8vICAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4vLyAgIH0pO1xuXG4vLyAgIGFwcGVuZEdpdGlnbm9yZShpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4vLyAgIGxldCBkaXIgPSBzdGFydERpcjtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4vLyAgICAgICByZXR1cm4gdGVzdDtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4vLyAgICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuLy8gICAgICAgcmV0dXJuIG51bGw7XG4vLyAgICAgZGlyID0gcGFyZW50O1xuLy8gICB9XG4vLyB9XG4iXX0=