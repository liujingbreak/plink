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
exports.getStore = exports.getState = exports.getAction$ = exports.dispatcher = void 0;
/* eslint-disable max-len */
const fs = __importStar(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const rx_utils_1 = require("../../packages/redux-toolkit-observable/dist/rx-utils");
const package_mgr_1 = require("./package-mgr");
const store_1 = require("./store");
const _recp = __importStar(require("./recipe-manager"));
const rwPackageJson_1 = require("./rwPackageJson");
const config_1 = require("./config");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("./utils/misc");
const { workDir, distDir, rootDir: rootPath } = misc_1.plinkEnv;
// import Selector from './utils/ts-ast-query';
const log = log4js_1.default.getLogger('plink.editor-helper');
const { parse } = require('comment-json');
const initialState = {
    tsconfigByRelPath: new Map()
};
const slice = store_1.stateFactory.newSlice({
    name: 'editor-helper',
    initialState,
    reducers: {
        clearSymlinks(s) { },
        hookTsconfig(s, { payload }) { },
        unHookTsconfig(s, { payload }) {
            for (const file of payload) {
                const relPath = relativePath(file);
                s.tsconfigByRelPath.delete(relPath);
            }
        },
        unHookAll() { },
        clearSymlinksDone(S) { }
    }
});
exports.dispatcher = store_1.stateFactory.bindActionCreators(slice);
store_1.stateFactory.addEpic((action$, state$) => {
    let noModuleSymlink;
    return rx.merge((0, package_mgr_1.getStore)().pipe((0, rx_utils_1.filterEffect)(s => [s.linkedDrcp, s.installedDrcp]), op.filter(([linkedDrcp, installedDrcp]) => linkedDrcp != null || installedDrcp != null), op.map(([linkedDrcp, installedDrcp]) => {
        // if (getPkgState().linkedDrcp) {
        const plinkDir = linkedDrcp || installedDrcp;
        const file = path_1.default.resolve(plinkDir.realPath, 'wfh/tsconfig.json');
        const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
        if (!getState().tsconfigByRelPath.has(relPath)) {
            process.nextTick(() => exports.dispatcher.hookTsconfig([file]));
        }
        return rx.EMPTY;
    })), action$.pipe((0, store_1.ofPayloadAction)(package_mgr_1.slice.actions._setCurrentWorkspace), op.concatMap(({ payload: wsKey }) => {
        var _a;
        if (wsKey == null)
            return rx.EMPTY;
        if (noModuleSymlink == null) {
            noModuleSymlink = new Set();
            for (const projDir of (0, package_mgr_1.getState)().project2Packages.keys()) {
                const rootPkgJson = require(path_1.default.resolve(misc_1.plinkEnv.rootDir, projDir, 'package.json'));
                for (const dir of (((_a = rootPkgJson.plink) === null || _a === void 0 ? void 0 : _a.noModuleSymlink) || []).map(item => path_1.default.resolve(misc_1.plinkEnv.rootDir, projDir, item))) {
                    noModuleSymlink.add(dir);
                }
            }
        }
        const currWorkspaceDir = (0, package_mgr_1.workspaceDir)(wsKey);
        return rx.from(_recp.allSrcDirs()).pipe(op.map(item => item.projDir ? path_1.default.resolve(item.projDir, item.srcDir) : item.srcDir), op.filter(dir => !noModuleSymlink.has(dir)), op.mergeMap(destDir => {
            if (fs.existsSync(path_1.default.join(destDir, 'package.json'))) {
                exports.dispatcher._change(s => {
                    if (s.nodeModuleSymlinks == null)
                        s.nodeModuleSymlinks = new Set([path_1.default.join(destDir, 'node_modules')]);
                    else
                        s.nodeModuleSymlinks.add(path_1.default.join(destDir, 'node_modules'));
                });
            }
            return rx.of({ name: 'node_modules', realPath: path_1.default.join(currWorkspaceDir, 'node_modules') }).pipe((0, rwPackageJson_1.symbolicLinkPackages)(destDir));
        }));
    })), action$.pipe((0, store_1.ofPayloadAction)(slice.actions.clearSymlinks), op.concatMap(() => {
        return rx.from(_recp.allSrcDirs()).pipe(op.map(item => item.projDir ? path_1.default.resolve(item.projDir, item.srcDir, 'node_modules') :
            path_1.default.resolve(item.srcDir, 'node_modules')), op.mergeMap(dir => {
            return rx.from(fs.promises.lstat(dir)).pipe(op.filter(stat => stat.isSymbolicLink()), op.mergeMap(stat => {
                log.info('remove symlink ' + dir);
                return fs.promises.unlink(dir);
            }));
        }), op.finalize(() => exports.dispatcher.clearSymlinksDone()));
    })), action$.pipe((0, store_1.ofPayloadAction)(package_mgr_1.slice.actions.workspaceChanged), op.concatMap(({ payload: wsKeys }) => __awaiter(void 0, void 0, void 0, function* () {
        const wsDir = (0, package_mgr_1.isCwdWorkspace)() ? workDir :
            (0, package_mgr_1.getState)().currWorkspace ? path_1.default.resolve(rootPath, (0, package_mgr_1.getState)().currWorkspace)
                : undefined;
        yield writePackageSettingType();
        updateTsconfigFileForProjects(wsKeys[wsKeys.length - 1]);
        yield Promise.all(Array.from(getState().tsconfigByRelPath.values())
            .map(data => updateHookedTsconfig(data, wsDir)));
    }))), action$.pipe((0, store_1.ofPayloadAction)(slice.actions.hookTsconfig), op.mergeMap(action => {
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
        const wsDir = (0, package_mgr_1.isCwdWorkspace)() ? workDir :
            (0, package_mgr_1.getState)().currWorkspace ? path_1.default.resolve(rootPath, (0, package_mgr_1.getState)().currWorkspace)
                : undefined;
        return updateHookedTsconfig(data, wsDir);
    })), action$.pipe((0, store_1.ofPayloadAction)(slice.actions.unHookTsconfig), op.mergeMap(({ payload }) => payload), op.mergeMap(file => {
        const absFile = path_1.default.resolve(rootPath, file);
        const backup = backupTsConfigOf(absFile);
        if (fs.existsSync(backup)) {
            log.info('Roll back:', absFile);
            return fs.promises.copyFile(backup, absFile);
        }
        return Promise.resolve();
    })), action$.pipe((0, store_1.ofPayloadAction)(slice.actions.unHookAll), op.tap(() => {
        exports.dispatcher.unHookTsconfig(Array.from(getState().tsconfigByRelPath.keys()));
    }))).pipe(op.ignoreElements(), op.catchError((err, caught) => {
        log.error(err);
        return caught;
    }));
});
function getAction$(type) {
    return (0, store_1.action$Of)(store_1.stateFactory, slice.actions[type]);
}
exports.getAction$ = getAction$;
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
    const ws = (0, package_mgr_1.getState)().workspaces.get(wsKey);
    if (ws == null)
        return;
    const projectDirs = (0, package_mgr_1.getProjectList)();
    const workspaceDir = path_1.default.resolve(rootPath, wsKey);
    const recipeManager = require('./recipe-manager');
    const srcRootDir = (0, misc_1.closestCommonParentDir)(projectDirs);
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
        if ((0, package_mgr_1.pathToProjKey)(proj) === (0, package_mgr_1.getState)().linkedDrcpProject) {
            include.push('main/wfh/**/*.ts');
        }
        include.push('dist/*.package-settings.d.ts');
        const tsconfigFile = createTsConfig(proj, srcRootDir, workspaceDir, {}, 
        // {'_package-settings': [Path.relative(proj, packageSettingDtsFileOf(workspaceDir))
        //   .replace(/\\/g, '/')
        //   .replace(/\.d\.ts$/, '')]
        // },
        include);
        const projDir = path_1.default.resolve(proj);
        (0, package_mgr_1.updateGitIgnores)({ file: path_1.default.resolve(proj, '.gitignore'),
            lines: [
                path_1.default.relative(projDir, tsconfigFile).replace(/\\/g, '/')
            ]
        });
        (0, package_mgr_1.updateGitIgnores)({
            file: path_1.default.resolve(rootPath, '.gitignore'),
            lines: [path_1.default.relative(rootPath, path_1.default.resolve(workspaceDir, 'types')).replace(/\\/g, '/')]
        });
    }
}
function writePackageSettingType() {
    const done = new Array((0, package_mgr_1.getState)().workspaces.size);
    let i = 0;
    for (const wsKey of (0, package_mgr_1.getState)().workspaces.keys()) {
        let header = '';
        let body = 'export interface PackagesConfig {\n';
        for (const [typeFile, typeExport, _defaultFile, _defaultExport, pkg] of (0, config_1.getPackageSettingFiles)(wsKey)) {
            const varName = pkg.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
            const typeName = varName.charAt(0).toUpperCase() + varName.slice(1);
            header += `import {${typeExport} as ${typeName}} from '${pkg.name}/${typeFile}';\n`;
            body += `  '${pkg.name}': ${typeName};\n`;
        }
        body += '}\n';
        // const workspaceDir = Path.resolve(rootPath, wsKey);
        const file = path_1.default.join(distDir, wsKey + '.package-settings.d.ts');
        log.info(`write setting file: ${chalk_1.default.blue(file)}`);
        done[i++] = fs.promises.writeFile(file, header + body);
        // const dir = Path.dirname(file);
        // const srcRootDir = closestCommonParentDir([
        //   dir,
        //   closestCommonParentDir(Array.from(packages4WorkspaceKey(wsKey)).map(pkg => pkg.realPath))
        // ]);
        // createTsConfig(dir, srcRootDir, workspaceDir, {}, ['*.ts']);
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
        extends: undefined,
        include,
        exclude: ['**/node_modules', '**/node_modules.*']
    };
    const drcpDir = ((0, package_mgr_1.getState)().linkedDrcp || (0, package_mgr_1.getState)().installedDrcp).realPath;
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
    (0, package_list_helper_1.setTsCompilerOptForNodePath)(proj, proj, tsjson.compilerOptions, {
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
            path_1.default.resolve(rootPath, data.relPath);
        const tsconfigDir = path_1.default.dirname(file);
        const backup = backupTsConfigOf(file);
        const json = (fs.existsSync(backup) ?
            JSON.parse(yield fs.promises.readFile(backup, 'utf8')) : lodash_1.default.cloneDeep(data.originJson));
        if (((_a = json.compilerOptions) === null || _a === void 0 ? void 0 : _a.paths) && json.compilerOptions.paths['_package-settings'] != null) {
            delete json.compilerOptions.paths['_package-settings'];
        }
        const newCo = (0, package_list_helper_1.setTsCompilerOptForNodePath)(tsconfigDir, data.baseUrl, json.compilerOptions, {
            workspaceDir, enableTypeRoots: true, realPackagePaths: true
        });
        json.compilerOptions = newCo;
        log.info('update:', chalk_1.default.blue(file));
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
            log.info('Write tsconfig: ' + chalk_1.default.blue(tsconfigFile));
            fs.writeFileSync(tsconfigFile, JSON.stringify(existingJson, null, '  '));
        }
        else {
            log.debug(`${tsconfigFile} is not changed.`);
        }
    }
    else {
        log.info('Create tsconfig: ' + chalk_1.default.blue(tsconfigFile));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLDJFQUFpRztBQUNqRyxvRkFBbUY7QUFDbkYsK0NBQ3NEO0FBQ3RELG1DQUFtRTtBQUNuRSx3REFBMEM7QUFDMUMsbURBQXFEO0FBQ3JELHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBRXJDLHVDQUE4RDtBQUU5RCxNQUFNLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBR3ZELCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFxQnhDLE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUM3QixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxFQUFFLGVBQWU7SUFDckIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGFBQWEsQ0FBQyxDQUFDLElBQUcsQ0FBQztRQUNuQixZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQixJQUFHLENBQUM7UUFDdEQsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEI7WUFDbEQsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUU7Z0JBQzFCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FB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QW1CLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakY7QUFDSCxDQUFDO0FBRUQsdUZBQXVGO0FBQ3ZGLHNFQUFzRTtBQUV0RSw4RUFBOEU7QUFDOUUsZ0VBQWdFO0FBRWhFLDBDQUEwQztBQUMxQyxxRUFBcUU7QUFDckUsMEVBQTBFO0FBQzFFLFFBQVE7QUFFUiwyREFBMkQ7QUFDM0QsSUFBSTtBQUVKLGdFQUFnRTtBQUNoRSx3QkFBd0I7QUFDeEIsbUJBQW1CO0FBQ25CLHlEQUF5RDtBQUN6RCxpQ0FBaUM7QUFDakMscUJBQXFCO0FBQ3JCLFFBQVE7QUFDUix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBDb21waWxlck9wdGlvbnMgfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtmaWx0ZXJFZmZlY3R9IGZyb20gJy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3J4LXV0aWxzJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgZ2V0U3RvcmUgYXMgcGtnU3RvcmUsIHVwZGF0ZUdpdElnbm9yZXMsIHNsaWNlIGFzIHBrZ1NsaWNlLFxuICBpc0N3ZFdvcmtzcGFjZSwgd29ya3NwYWNlRGlyIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiwgYWN0aW9uJE9mIH0gZnJvbSAnLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7c3ltYm9saWNMaW5rUGFja2FnZXN9IGZyb20gJy4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkLCBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3BsaW5rRW52LCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuXG5jb25zdCB7d29ya0RpciwgZGlzdERpciwgcm9vdERpcjogcm9vdFBhdGh9ID0gcGxpbmtFbnY7XG5cblxuLy8gaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmVkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmludGVyZmFjZSBFZGl0b3JIZWxwZXJTdGF0ZSB7XG4gIC8qKiB0c2NvbmZpZyBmaWxlcyBzaG91bGQgYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gbGlua2VkIHBhY2thZ2VzIHN0YXRlICovXG4gIHRzY29uZmlnQnlSZWxQYXRoOiBNYXA8c3RyaW5nLCBIb29rZWRUc2NvbmZpZz47XG4gIC8qKiBwcm9ibGVtYXRpYyBzeW1saW5rcyB3aGljaCBtdXN0IGJlIHJlbW92ZWQgYmVmb3JlIHJ1bm5pbmdcbiAgICogbm9kZV9tb2R1bGVzIHN5bWxpbmsgaXMgdW5kZXIgc291cmNlIHBhY2thZ2UgZGlyZWN0b3J5LCBpdCB3aWxsIG5vdCB3b3JrIHdpdGggXCItLXByZXNlcnZlLXN5bWxpbmtzXCIsXG4gICAqIGluIHdoaWNoIGNhc2UsIE5vZGUuanMgd2lsbCByZWdhcmQgYSB3b3Jrc3BhY2Ugbm9kZV9tb2R1bGUgYW5kIGl0cyBzeW1saW5rIGluc2lkZSBzb3VyY2UgcGFja2FnZSBhc1xuICAgKiB0d2UgZGlmZmVyZW50IGRpcmVjdG9yeSwgYW5kIGNhdXNlcyBwcm9ibGVtXG4gICAqL1xuICBub2RlTW9kdWxlU3ltbGlua3M/OiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIEhvb2tlZFRzY29uZmlnIHtcbiAgLyoqIGFic29sdXRlIHBhdGggb3IgcGF0aCByZWxhdGl2ZSB0byByb290IHBhdGgsIGFueSBwYXRoIHRoYXQgaXMgc3RvcmVkIGluIFJlZHV4IHN0b3JlLCB0aGUgYmV0dGVyIGl0IGlzIGluIGZvcm0gb2ZcbiAgICogcmVsYXRpdmUgcGF0aCBvZiBSb290IHBhdGhcbiAgICovXG4gIHJlbFBhdGg6IHN0cmluZztcbiAgYmFzZVVybDogc3RyaW5nO1xuICBvcmlnaW5Kc29uOiBhbnk7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogRWRpdG9ySGVscGVyU3RhdGUgPSB7XG4gIHRzY29uZmlnQnlSZWxQYXRoOiBuZXcgTWFwKClcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2VkaXRvci1oZWxwZXInLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgY2xlYXJTeW1saW5rcyhzKSB7fSxcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fSxcbiAgICBjbGVhclN5bWxpbmtzRG9uZShTKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgbGV0IG5vTW9kdWxlU3ltbGluazogU2V0PHN0cmluZz47XG5cbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIHBrZ1N0b3JlKCkucGlwZShcbiAgICAgIGZpbHRlckVmZmVjdChzID0+IFtzLmxpbmtlZERyY3AsIHMuaW5zdGFsbGVkRHJjcF0pLFxuICAgICAgb3AuZmlsdGVyKChbbGlua2VkRHJjcCwgaW5zdGFsbGVkRHJjcF0pID0+IGxpbmtlZERyY3AgIT0gbnVsbCB8fCBpbnN0YWxsZWREcmNwICE9IG51bGwpLFxuICAgICAgb3AubWFwKChbbGlua2VkRHJjcCwgaW5zdGFsbGVkRHJjcF0pID0+IHtcbiAgICAgICAgLy8gaWYgKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgICBjb25zdCBwbGlua0RpciA9IGxpbmtlZERyY3AgfHwgaW5zdGFsbGVkRHJjcCE7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUocGxpbmtEaXIucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpO1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBpZiAoIWdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGguaGFzKHJlbFBhdGgpKSB7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBkaXNwYXRjaGVyLmhvb2tUc2NvbmZpZyhbZmlsZV0pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dTbGljZS5hY3Rpb25zLl9zZXRDdXJyZW50V29ya3NwYWNlKSxcbiAgICAgIG9wLmNvbmNhdE1hcCgoe3BheWxvYWQ6IHdzS2V5fSkgPT4ge1xuICAgICAgICBpZiAod3NLZXkgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgIGlmIChub01vZHVsZVN5bWxpbmsgPT0gbnVsbCkge1xuICAgICAgICAgIG5vTW9kdWxlU3ltbGluayA9IG5ldyBTZXQoKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHByb2pEaXIgb2YgZ2V0UGtnU3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkge1xuICAgICAgICAgICAgY29uc3Qgcm9vdFBrZ0pzb24gPSByZXF1aXJlKFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCBwcm9qRGlyLCAncGFja2FnZS5qc29uJykpIGFzIHtwbGluaz86IHtub01vZHVsZVN5bWxpbms/OiBzdHJpbmdbXX19O1xuICAgICAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgKHJvb3RQa2dKc29uLnBsaW5rPy5ub01vZHVsZVN5bWxpbmsgfHwgW10pLm1hcChpdGVtID0+IFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCBwcm9qRGlyLCBpdGVtKSkpIHtcbiAgICAgICAgICAgICAgbm9Nb2R1bGVTeW1saW5rLmFkZChkaXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN1cnJXb3Jrc3BhY2VEaXIgPSB3b3Jrc3BhY2VEaXIod3NLZXkpO1xuICAgICAgICByZXR1cm4gcnguZnJvbShfcmVjcC5hbGxTcmNEaXJzKCkpLnBpcGUoXG4gICAgICAgICAgb3AubWFwKGl0ZW0gPT4gaXRlbS5wcm9qRGlyID8gUGF0aC5yZXNvbHZlKGl0ZW0ucHJvakRpciwgaXRlbS5zcmNEaXIpIDogaXRlbS5zcmNEaXIpLFxuICAgICAgICAgIG9wLmZpbHRlcihkaXIgPT4gIW5vTW9kdWxlU3ltbGluay5oYXMoZGlyKSksXG4gICAgICAgICAgb3AubWVyZ2VNYXAoZGVzdERpciA9PiB7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4oZGVzdERpciwgJ3BhY2thZ2UuanNvbicpKSkge1xuICAgICAgICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHMubm9kZU1vZHVsZVN5bWxpbmtzID09IG51bGwpXG4gICAgICAgICAgICAgICAgICBzLm5vZGVNb2R1bGVTeW1saW5rcyA9IG5ldyBTZXQoW1BhdGguam9pbihkZXN0RGlyLCAnbm9kZV9tb2R1bGVzJyldKTtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICBzLm5vZGVNb2R1bGVTeW1saW5rcy5hZGQoUGF0aC5qb2luKGRlc3REaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJ4Lm9mKHtuYW1lOiAnbm9kZV9tb2R1bGVzJywgcmVhbFBhdGg6IFBhdGguam9pbihjdXJyV29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJyl9KS5waXBlKFxuICAgICAgICAgICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhkZXN0RGlyKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5jbGVhclN5bWxpbmtzKSxcbiAgICAgIG9wLmNvbmNhdE1hcCgoKSA9PiB7XG4gICAgICAgIHJldHVybiByeC5mcm9tKF9yZWNwLmFsbFNyY0RpcnMoKSkucGlwZShcbiAgICAgICAgICBvcC5tYXAoaXRlbSA9PiBpdGVtLnByb2pEaXIgPyBQYXRoLnJlc29sdmUoaXRlbS5wcm9qRGlyLCBpdGVtLnNyY0RpciwgJ25vZGVfbW9kdWxlcycpIDpcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShpdGVtLnNyY0RpciwgJ25vZGVfbW9kdWxlcycpKSxcbiAgICAgICAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHJ4LmZyb20oZnMucHJvbWlzZXMubHN0YXQoZGlyKSkucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKHN0YXQgPT4gc3RhdC5pc1N5bWJvbGljTGluaygpKSxcbiAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoc3RhdCA9PiB7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oJ3JlbW92ZSBzeW1saW5rICcgKyBkaXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy51bmxpbmsoZGlyKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgb3AuZmluYWxpemUoKCkgPT4gZGlzcGF0Y2hlci5jbGVhclN5bWxpbmtzRG9uZSgpKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24ocGtnU2xpY2UuYWN0aW9ucy53b3Jrc3BhY2VDaGFuZ2VkKSxcbiAgICAgIG9wLmNvbmNhdE1hcChhc3luYyAoe3BheWxvYWQ6IHdzS2V5c30pID0+IHtcbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gd29ya0RpciA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBhd2FpdCB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpO1xuICAgICAgICB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyh3c0tleXNbd3NLZXlzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLnZhbHVlcygpKVxuICAgICAgICAgIC5tYXAoZGF0YSA9PiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0RpcikpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiBhY3Rpb24ucGF5bG9hZDtcbiAgICAgIH0pLFxuICAgICAgb3AubWVyZ2VNYXAoKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgY29uc3QgYmFja3VwRmlsZSA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG4gICAgICAgIGNvbnN0IGlzQmFja3VwRXhpc3RzID0gZnMuZXhpc3RzU3luYyhiYWNrdXBGaWxlKTtcbiAgICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSBpc0JhY2t1cEV4aXN0cyA/IGZzLnJlYWRGaWxlU3luYyhiYWNrdXBGaWxlLCAndXRmOCcpIDogZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZpbGVDb250ZW50KSBhcyB7Y29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnN9O1xuICAgICAgICBjb25zdCBkYXRhOiBIb29rZWRUc2NvbmZpZyA9IHtcbiAgICAgICAgICByZWxQYXRoLFxuICAgICAgICAgIGJhc2VVcmw6IGpzb24uY29tcGlsZXJPcHRpb25zLmJhc2VVcmwsXG4gICAgICAgICAgb3JpZ2luSnNvbjoganNvblxuICAgICAgICB9O1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5zZXQocmVsUGF0aCwgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghaXNCYWNrdXBFeGlzdHMpIHtcbiAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGZpbGVDb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHBheWxvYWQpLFxuICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGZpbGUpO1xuICAgICAgICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGFic0ZpbGUpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhiYWNrdXApKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ1JvbGwgYmFjazonLCBhYnNGaWxlKTtcbiAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuY29weUZpbGUoYmFja3VwLCBhYnNGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va0FsbCksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKEFycmF5LmZyb20oZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5rZXlzKCkpKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gY2F1Z2h0O1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbiQodHlwZToga2V5b2YgKHR5cGVvZiBzbGljZSlbJ2Nhc2VSZWR1Y2VycyddKSB7XG4gIHJldHVybiBhY3Rpb24kT2Yoc3RhdGVGYWN0b3J5LCBzbGljZS5hY3Rpb25zW3R5cGVdIGFzIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxhbnksIGFueT4pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZnVuY3Rpb24gcmVsYXRpdmVQYXRoKGZpbGU6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyh3c0tleTogc3RyaW5nLCBpbmNsdWRlUHJvamVjdD86IHN0cmluZykge1xuICBjb25zdCB3cyA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHdzS2V5KTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpIGFzIHR5cGVvZiBfcmVjcDtcblxuICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwcm9qZWN0RGlycyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qZWN0KSB7XG4gICAgd3JpdGVUc0NvbmZpZ0ZvclByb2ooaW5jbHVkZVByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgICAgd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvaik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvajogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcblxuICAgIGlmIChwYXRoVG9Qcm9qS2V5KHByb2opID09PSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3BQcm9qZWN0KSB7XG4gICAgICBpbmNsdWRlLnB1c2goJ21haW4vd2ZoLyoqLyoudHMnKTtcbiAgICB9XG4gICAgaW5jbHVkZS5wdXNoKCdkaXN0LyoucGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gY3JlYXRlVHNDb25maWcocHJvaiwgc3JjUm9vdERpciwgd29ya3NwYWNlRGlyLCB7fSxcbiAgICAgIC8vIHsnX3BhY2thZ2Utc2V0dGluZ3MnOiBbUGF0aC5yZWxhdGl2ZShwcm9qLCBwYWNrYWdlU2V0dGluZ0R0c0ZpbGVPZih3b3Jrc3BhY2VEaXIpKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXC5kXFwudHMkLywgJycpXVxuICAgICAgLy8gfSxcbiAgICAgIGluY2x1ZGVcbiAgICApO1xuICAgIGNvbnN0IHByb2pEaXIgPSBQYXRoLnJlc29sdmUocHJvaik7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZTogUGF0aC5yZXNvbHZlKHByb2osICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1xuICAgICAgICBQYXRoLnJlbGF0aXZlKHByb2pEaXIsIHRzY29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICBdXG4gICAgfSk7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdFBhdGgsICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1BhdGgucmVsYXRpdmUocm9vdFBhdGgsIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyldXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKSB7XG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXk8UHJvbWlzZTx1bmtub3duPj4oZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLnNpemUpO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICBsZXQgYm9keSA9ICdleHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzQ29uZmlnIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMTogc3RyaW5nKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gdmFyTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhck5hbWUuc2xpY2UoMSk7XG4gICAgICBoZWFkZXIgKz0gYGltcG9ydCB7JHt0eXBlRXhwb3J0fSBhcyAke3R5cGVOYW1lfX0gZnJvbSAnJHtwa2cubmFtZX0vJHt0eXBlRmlsZX0nO1xcbmA7XG4gICAgICBib2R5ICs9IGAgICcke3BrZy5uYW1lfSc6ICR7dHlwZU5hbWV9O1xcbmA7XG4gICAgfVxuICAgIGJvZHkgKz0gJ31cXG4nO1xuICAgIC8vIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgd3NLZXkpO1xuICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlzdERpciwgd3NLZXkgKyAnLnBhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xuICAgIGxvZy5pbmZvKGB3cml0ZSBzZXR0aW5nIGZpbGU6ICR7Y2hhbGsuYmx1ZShmaWxlKX1gKTtcbiAgICBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgaGVhZGVyICsgYm9keSk7XG4gICAgLy8gY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgIC8vIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKFtcbiAgICAvLyAgIGRpcixcbiAgICAvLyAgIGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKS5tYXAocGtnID0+IHBrZy5yZWFsUGF0aCkpXG4gICAgLy8gXSk7XG4gICAgLy8gY3JlYXRlVHNDb25maWcoZGlyLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LCBbJyoudHMnXSk7XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRvbmUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcsXG4gIGV4dHJhUGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119LFxuICBpbmNsdWRlID0gWycqKi8qLnRzJ10pIHtcbiAgY29uc3QgdHNqc29uOiB7ZXh0ZW5kcz86IHN0cmluZzsgaW5jbHVkZTogc3RyaW5nW107IGV4Y2x1ZGU6IHN0cmluZ1tdOyBjb21waWxlck9wdGlvbnM/OiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz59ID0ge1xuICAgIGV4dGVuZHM6IHVuZGVmaW5lZCxcbiAgICBpbmNsdWRlLFxuICAgIGV4Y2x1ZGU6IFsnKiovbm9kZV9tb2R1bGVzJywgJyoqL25vZGVfbW9kdWxlcy4qJ11cbiAgfTtcbiAgY29uc3QgZHJjcERpciA9IChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBzdHJpY3Q6IHRydWUsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBleHRyYVBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UsXG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIGJhY2t1cFRzQ29uZmlnT2YoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBtID0gLyhbXi9cXFxcLl0rKShcXC5bXi9cXFxcLl0rKT8kLy5leGVjKGZpbGUpO1xuICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKGZpbGUuc2xpY2UoMCwgZmlsZS5sZW5ndGggLSBtIVswXS5sZW5ndGgpICsgbSFbMV0gKyAnLm9yaWcnICsgbSFbMl0pO1xuICByZXR1cm4gYmFja3VwRmlsZTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhOiBIb29rZWRUc2NvbmZpZywgd29ya3NwYWNlRGlyPzogc3RyaW5nKSB7XG4gIGNvbnN0IGZpbGUgPSBQYXRoLmlzQWJzb2x1dGUoZGF0YS5yZWxQYXRoKSA/IGRhdGEucmVsUGF0aCA6XG4gICAgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkYXRhLnJlbFBhdGgpO1xuICBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcblxuICBjb25zdCBqc29uID0gKGZzLmV4aXN0c1N5bmMoYmFja3VwKSA/XG4gICAgSlNPTi5wYXJzZShhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShiYWNrdXAsICd1dGY4JykpIDogXy5jbG9uZURlZXAoZGF0YS5vcmlnaW5Kc29uKSApIGFzICB7Y29tcGlsZXJPcHRpb25zPzogQ29tcGlsZXJPcHRpb25zfTtcblxuICBpZiAoanNvbi5jb21waWxlck9wdGlvbnM/LnBhdGhzICYmIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddICE9IG51bGwpIHtcbiAgICBkZWxldGUganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ107XG4gIH1cbiAgY29uc3QgbmV3Q28gPSBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNjb25maWdEaXIsIGRhdGEuYmFzZVVybCxcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucyBhcyBhbnksIHtcbiAgICAgIHdvcmtzcGFjZURpciwgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gICAgfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKCd1cGRhdGU6JywgY2hhbGsuYmx1ZShmaWxlKSk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSB0c2NvbmZpZzogJyArIGNoYWxrLmJsdWUodHNjb25maWdGaWxlKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlIHRzY29uZmlnOiAnICsgY2hhbGsuYmx1ZSh0c2NvbmZpZ0ZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLFxuLy8gICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuXG4vLyAgIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbi8vICAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuLy8gICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4vLyAgICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbi8vICAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4vLyAgIH0pO1xuXG4vLyAgIGFwcGVuZEdpdGlnbm9yZShpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4vLyAgIGxldCBkaXIgPSBzdGFydERpcjtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4vLyAgICAgICByZXR1cm4gdGVzdDtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4vLyAgICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuLy8gICAgICAgcmV0dXJuIG51bGw7XG4vLyAgICAgZGlyID0gcGFyZW50O1xuLy8gICB9XG4vLyB9XG4iXX0=