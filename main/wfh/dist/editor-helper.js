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
// import {filterEffect} from '../../packages/redux-toolkit-observable/dist/rx-utils';
const package_mgr_1 = require("./package-mgr");
const store_1 = require("./store");
const _recp = __importStar(require("./recipe-manager"));
const rwPackageJson_1 = require("./rwPackageJson");
const config_1 = require("./config");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("./utils/misc");
const typescript_1 = __importDefault(require("typescript"));
const { workDir, rootDir: rootPath } = misc_1.plinkEnv;
// import Selector from './utils/ts-ast-query';
const log = log4js_1.default.getLogger('plink.editor-helper');
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
    return rx.merge(
    // pkgStore().pipe(
    //   filterEffect(s => [s.linkedDrcp, s.installedDrcp]),
    //   op.filter(([linkedDrcp, installedDrcp]) => linkedDrcp != null || installedDrcp != null),
    //   op.map(([linkedDrcp, installedDrcp]) => {
    //     // if (getPkgState().linkedDrcp) {
    //     const plinkDir = linkedDrcp || installedDrcp!;
    //     const file = Path.resolve(plinkDir.realPath, 'wfh/tsconfig.json');
    //     const relPath = Path.relative(rootPath, file).replace(/\\/g, '/');
    //     if (!getState().tsconfigByRelPath.has(relPath)) {
    //       process.nextTick(() => dispatcher.hookTsconfig([file]));
    //     }
    //     return rx.EMPTY;
    //   })
    // ),
    action$.pipe((0, store_1.ofPayloadAction)(package_mgr_1.slice.actions._setCurrentWorkspace), op.concatMap(({ payload: wsKey }) => {
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
        // include.push('dist/*.package-settings.d.ts');
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
        // let body = 'export interface PackagesConfig {\n';
        let interfaceBody = 'declare module \'@wfh/plink\' {\n';
        interfaceBody += '  interface PlinkSettings {\n';
        for (const [typeFile, typeExport, _defaultFile, _defaultExport, pkg] of (0, config_1.getPackageSettingFiles)(wsKey)) {
            const varName = pkg.shortName.replace(/-([^])/g, (match, g1) => g1.toUpperCase());
            const typeName = varName.charAt(0).toUpperCase() + varName.slice(1);
            header += `import {${typeExport} as ${typeName}} from '${pkg.name}/${typeFile}';\n`;
            // body += `  '${pkg.name}': ${typeName};\n`;
            interfaceBody += `    '${pkg.name}': ${typeName};\n`;
        }
        // body += '}\n';
        interfaceBody += '  }\n}\n';
        const typeFile = path_1.default.resolve(rootPath, wsKey, 'node_modules/@types/plink-settings/index.d.ts');
        const typeFileContent = header + interfaceBody;
        fs.mkdirpSync(path_1.default.dirname(typeFile));
        if (!fs.existsSync(typeFile) || fs.readFileSync(typeFile, 'utf8') !== typeFileContent) {
            done[i++] = fs.promises.writeFile(typeFile, typeFileContent);
            log.info('write package setting definition file', chalk_1.default.blue(typeFile));
        }
        // const file = Path.join(distDir, wsKey + '.package-settings.d.ts');
        // log.info(`write setting file: ${chalk.blue(file)}`);
        // done[i++] = fs.promises.writeFile(file, header + body);
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
    return __awaiter(this, void 0, void 0, function* () {
        const file = path_1.default.isAbsolute(data.relPath) ? data.relPath :
            path_1.default.resolve(rootPath, data.relPath);
        const tsconfigDir = path_1.default.dirname(file);
        const backup = backupTsConfigOf(file);
        const json = (fs.existsSync(backup) ?
            JSON.parse(yield fs.promises.readFile(backup, 'utf8')) : lodash_1.default.cloneDeep(data.originJson));
        // if (json.compilerOptions?.paths && json.compilerOptions.paths['_package-settings'] != null) {
        //   delete json.compilerOptions.paths['_package-settings'];
        // }
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const existingJson = typescript_1.default.readConfigFile(tsconfigFile, (file) => {
            if (path_1.default.resolve(file) === tsconfigFile)
                return existing;
            else
                return fs.readFileSync(file, 'utf-8');
        }).config;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLDJFQUFpRztBQUNqRyxzRkFBc0Y7QUFDdEYsK0NBQ3NEO0FBQ3RELG1DQUFtRTtBQUNuRSx3REFBMEM7QUFDMUMsbURBQXFEO0FBQ3JELHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBRXJDLHVDQUE4RDtBQUM5RCw0REFBNEI7QUFDNUIsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRzlDLCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBdUJwRCxNQUFNLFlBQVksR0FBc0I7SUFDdEMsaUJBQWlCLEVBQUUsSUFBSSxHQUFHLEVBQUU7Q0FDN0IsQ0FBQztBQUVGLE1BQU0sS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ2xDLElBQUksRUFBRSxlQUFlO0lBQ3JCLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixhQUFhLENBQUMsQ0FBQyxJQUFHLENBQUM7UUFDbkIsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEIsSUFBRyxDQUFDO1FBQ3RELGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCO1lBQ2xELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUMxQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENB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WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBDb21waWxlck9wdGlvbnMgfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuLy8gaW1wb3J0IHtmaWx0ZXJFZmZlY3R9IGZyb20gJy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3J4LXV0aWxzJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgdXBkYXRlR2l0SWdub3Jlcywgc2xpY2UgYXMgcGtnU2xpY2UsXG4gIGlzQ3dkV29ya3NwYWNlLCB3b3Jrc3BhY2VEaXIgfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uLCBhY3Rpb24kT2YgfSBmcm9tICcuL3N0b3JlJztcbmltcG9ydCAqIGFzIF9yZWNwIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQsIFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7cGxpbmtFbnYsIGNsb3Nlc3RDb21tb25QYXJlbnREaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5jb25zdCB7d29ya0Rpciwgcm9vdERpcjogcm9vdFBhdGh9ID0gcGxpbmtFbnY7XG5cblxuLy8gaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmVkaXRvci1oZWxwZXInKTtcbi8vIGNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcblxuaW50ZXJmYWNlIEVkaXRvckhlbHBlclN0YXRlIHtcbiAgLyoqIHRzY29uZmlnIGZpbGVzIHNob3VsZCBiZSBjaGFuZ2VkIGFjY29yZGluZyB0byBsaW5rZWQgcGFja2FnZXMgc3RhdGUgKi9cbiAgdHNjb25maWdCeVJlbFBhdGg6IE1hcDxzdHJpbmcsIEhvb2tlZFRzY29uZmlnPjtcbiAgLyoqIHByb2JsZW1hdGljIHN5bWxpbmtzIHdoaWNoIG11c3QgYmUgcmVtb3ZlZCBiZWZvcmUgcnVubmluZ1xuICAgKiBub2RlX21vZHVsZXMgc3ltbGluayBpcyB1bmRlciBzb3VyY2UgcGFja2FnZSBkaXJlY3RvcnksIGl0IHdpbGwgbm90IHdvcmsgd2l0aCBcIi0tcHJlc2VydmUtc3ltbGlua3NcIixcbiAgICogaW4gd2hpY2ggY2FzZSwgTm9kZS5qcyB3aWxsIHJlZ2FyZCBhIHdvcmtzcGFjZSBub2RlX21vZHVsZSBhbmQgaXRzIHN5bWxpbmsgaW5zaWRlIHNvdXJjZSBwYWNrYWdlIGFzXG4gICAqIHR3ZSBkaWZmZXJlbnQgZGlyZWN0b3J5LCBhbmQgY2F1c2VzIHByb2JsZW1cbiAgICovXG4gIG5vZGVNb2R1bGVTeW1saW5rcz86IFNldDxzdHJpbmc+O1xufVxuXG5pbnRlcmZhY2UgSG9va2VkVHNjb25maWcge1xuICAvKiogYWJzb2x1dGUgcGF0aCBvciBwYXRoIHJlbGF0aXZlIHRvIHJvb3QgcGF0aCwgYW55IHBhdGggdGhhdCBpcyBzdG9yZWQgaW4gUmVkdXggc3RvcmUsIHRoZSBiZXR0ZXIgaXQgaXMgaW4gZm9ybSBvZlxuICAgKiByZWxhdGl2ZSBwYXRoIG9mIFJvb3QgcGF0aFxuICAgKi9cbiAgcmVsUGF0aDogc3RyaW5nO1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIG9yaWdpbkpzb246IGFueTtcbn1cblxuY29uc3QgaW5pdGlhbFN0YXRlOiBFZGl0b3JIZWxwZXJTdGF0ZSA9IHtcbiAgdHNjb25maWdCeVJlbFBhdGg6IG5ldyBNYXAoKVxufTtcblxuY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiAnZWRpdG9yLWhlbHBlcicsXG4gIGluaXRpYWxTdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICBjbGVhclN5bWxpbmtzKHMpIHt9LFxuICAgIGhvb2tUc2NvbmZpZyhzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1bkhvb2tUc2NvbmZpZyhzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgcGF5bG9hZCkge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVsYXRpdmVQYXRoKGZpbGUpO1xuICAgICAgICBzLnRzY29uZmlnQnlSZWxQYXRoLmRlbGV0ZShyZWxQYXRoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHVuSG9va0FsbCgpIHt9LFxuICAgIGNsZWFyU3ltbGlua3NEb25lKFMpIHt9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzxFZGl0b3JIZWxwZXJTdGF0ZT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICBsZXQgbm9Nb2R1bGVTeW1saW5rOiBTZXQ8c3RyaW5nPjtcblxuICByZXR1cm4gcngubWVyZ2UoXG4gICAgLy8gcGtnU3RvcmUoKS5waXBlKFxuICAgIC8vICAgZmlsdGVyRWZmZWN0KHMgPT4gW3MubGlua2VkRHJjcCwgcy5pbnN0YWxsZWREcmNwXSksXG4gICAgLy8gICBvcC5maWx0ZXIoKFtsaW5rZWREcmNwLCBpbnN0YWxsZWREcmNwXSkgPT4gbGlua2VkRHJjcCAhPSBudWxsIHx8IGluc3RhbGxlZERyY3AgIT0gbnVsbCksXG4gICAgLy8gICBvcC5tYXAoKFtsaW5rZWREcmNwLCBpbnN0YWxsZWREcmNwXSkgPT4ge1xuICAgIC8vICAgICAvLyBpZiAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwKSB7XG4gICAgLy8gICAgIGNvbnN0IHBsaW5rRGlyID0gbGlua2VkRHJjcCB8fCBpbnN0YWxsZWREcmNwITtcbiAgICAvLyAgICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZShwbGlua0Rpci5yZWFsUGF0aCwgJ3dmaC90c2NvbmZpZy5qc29uJyk7XG4gICAgLy8gICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gICAgIGlmICghZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5oYXMocmVsUGF0aCkpIHtcbiAgICAvLyAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGRpc3BhdGNoZXIuaG9va1RzY29uZmlnKFtmaWxlXSkpO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAvLyAgIH0pXG4gICAgLy8gKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ1NsaWNlLmFjdGlvbnMuX3NldEN1cnJlbnRXb3Jrc3BhY2UpLFxuICAgICAgb3AuY29uY2F0TWFwKCh7cGF5bG9hZDogd3NLZXl9KSA9PiB7XG4gICAgICAgIGlmICh3c0tleSA9PSBudWxsKVxuICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgaWYgKG5vTW9kdWxlU3ltbGluayA9PSBudWxsKSB7XG4gICAgICAgICAgbm9Nb2R1bGVTeW1saW5rID0gbmV3IFNldCgpO1xuICAgICAgICAgIGZvciAoY29uc3QgcHJvakRpciBvZiBnZXRQa2dTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKSB7XG4gICAgICAgICAgICBjb25zdCByb290UGtnSnNvbiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsIHByb2pEaXIsICdwYWNrYWdlLmpzb24nKSkgYXMge3BsaW5rPzoge25vTW9kdWxlU3ltbGluaz86IHN0cmluZ1tdfX07XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiAocm9vdFBrZ0pzb24ucGxpbms/Lm5vTW9kdWxlU3ltbGluayB8fCBbXSkubWFwKGl0ZW0gPT4gUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsIHByb2pEaXIsIGl0ZW0pKSkge1xuICAgICAgICAgICAgICBub01vZHVsZVN5bWxpbmsuYWRkKGRpcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycldvcmtzcGFjZURpciA9IHdvcmtzcGFjZURpcih3c0tleSk7XG4gICAgICAgIHJldHVybiByeC5mcm9tKF9yZWNwLmFsbFNyY0RpcnMoKSkucGlwZShcbiAgICAgICAgICBvcC5tYXAoaXRlbSA9PiBpdGVtLnByb2pEaXIgPyBQYXRoLnJlc29sdmUoaXRlbS5wcm9qRGlyLCBpdGVtLnNyY0RpcikgOiBpdGVtLnNyY0RpciksXG4gICAgICAgICAgb3AuZmlsdGVyKGRpciA9PiAhbm9Nb2R1bGVTeW1saW5rLmhhcyhkaXIpKSxcbiAgICAgICAgICBvcC5tZXJnZU1hcChkZXN0RGlyID0+IHtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKFBhdGguam9pbihkZXN0RGlyLCAncGFja2FnZS5qc29uJykpKSB7XG4gICAgICAgICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocy5ub2RlTW9kdWxlU3ltbGlua3MgPT0gbnVsbClcbiAgICAgICAgICAgICAgICAgIHMubm9kZU1vZHVsZVN5bWxpbmtzID0gbmV3IFNldChbUGF0aC5qb2luKGRlc3REaXIsICdub2RlX21vZHVsZXMnKV0pO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgIHMubm9kZU1vZHVsZVN5bWxpbmtzLmFkZChQYXRoLmpvaW4oZGVzdERpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcngub2Yoe25hbWU6ICdub2RlX21vZHVsZXMnLCByZWFsUGF0aDogUGF0aC5qb2luKGN1cnJXb3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKX0pLnBpcGUoXG4gICAgICAgICAgICAgIHN5bWJvbGljTGlua1BhY2thZ2VzKGRlc3REaXIpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmNsZWFyU3ltbGlua3MpLFxuICAgICAgb3AuY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIHJ4LmZyb20oX3JlY3AuYWxsU3JjRGlycygpKS5waXBlKFxuICAgICAgICAgIG9wLm1hcChpdGVtID0+IGl0ZW0ucHJvakRpciA/IFBhdGgucmVzb2x2ZShpdGVtLnByb2pEaXIsIGl0ZW0uc3JjRGlyLCAnbm9kZV9tb2R1bGVzJykgOlxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKGl0ZW0uc3JjRGlyLCAnbm9kZV9tb2R1bGVzJykpLFxuICAgICAgICAgIG9wLm1lcmdlTWFwKGRpciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gcnguZnJvbShmcy5wcm9taXNlcy5sc3RhdChkaXIpKS5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoc3RhdCA9PiBzdGF0LmlzU3ltYm9saWNMaW5rKCkpLFxuICAgICAgICAgICAgICBvcC5tZXJnZU1hcChzdGF0ID0+IHtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygncmVtb3ZlIHN5bWxpbmsgJyArIGRpcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnVubGluayhkaXIpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiBkaXNwYXRjaGVyLmNsZWFyU3ltbGlua3NEb25lKCkpXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dTbGljZS5hY3Rpb25zLndvcmtzcGFjZUNoYW5nZWQpLFxuICAgICAgb3AuY29uY2F0TWFwKGFzeW5jICh7cGF5bG9hZDogd3NLZXlzfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGF3YWl0IHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCk7XG4gICAgICAgIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5c1t3c0tleXMubGVuZ3RoIC0gMV0pO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGgudmFsdWVzKCkpXG4gICAgICAgICAgLm1hcChkYXRhID0+IHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKSkpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5ob29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkO1xuICAgICAgfSksXG4gICAgICBvcC5tZXJnZU1hcCgoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb25zdCBiYWNrdXBGaWxlID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcbiAgICAgICAgY29uc3QgaXNCYWNrdXBFeGlzdHMgPSBmcy5leGlzdHNTeW5jKGJhY2t1cEZpbGUpO1xuICAgICAgICBjb25zdCBmaWxlQ29udGVudCA9IGlzQmFja3VwRXhpc3RzID8gZnMucmVhZEZpbGVTeW5jKGJhY2t1cEZpbGUsICd1dGY4JykgOiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnQpIGFzIHtjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc307XG4gICAgICAgIGNvbnN0IGRhdGE6IEhvb2tlZFRzY29uZmlnID0ge1xuICAgICAgICAgIHJlbFBhdGgsXG4gICAgICAgICAgYmFzZVVybDoganNvbi5jb21waWxlck9wdGlvbnMuYmFzZVVybCxcbiAgICAgICAgICBvcmlnaW5Kc29uOiBqc29uXG4gICAgICAgIH07XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgICBzLnRzY29uZmlnQnlSZWxQYXRoLnNldChyZWxQYXRoLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFpc0JhY2t1cEV4aXN0cykge1xuICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgZmlsZUNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gcGF5bG9hZCksXG4gICAgICBvcC5tZXJnZU1hcChmaWxlID0+IHtcbiAgICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoYWJzRmlsZSk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGJhY2t1cCkpIHtcbiAgICAgICAgICBsb2cuaW5mbygnUm9sbCBiYWNrOicsIGFic0ZpbGUpO1xuICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShiYWNrdXAsIGFic0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rQWxsKSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIudW5Ib29rVHNjb25maWcoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLmtleXMoKSkpO1xuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uJCh0eXBlOiBrZXlvZiAodHlwZW9mIHNsaWNlKVsnY2FzZVJlZHVjZXJzJ10pIHtcbiAgcmV0dXJuIGFjdGlvbiRPZihzdGF0ZUZhY3RvcnksIHNsaWNlLmFjdGlvbnNbdHlwZV0gYXMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPGFueSwgYW55Pik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVBhdGgoZmlsZTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVQcm9qZWN0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHdzID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgd3NLZXkpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCcuL3JlY2lwZS1tYW5hZ2VyJykgYXMgdHlwZW9mIF9yZWNwO1xuXG4gIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKHByb2plY3REaXJzKTtcblxuICBpZiAoaW5jbHVkZVByb2plY3QpIHtcbiAgICB3cml0ZVRzQ29uZmlnRm9yUHJvaihpbmNsdWRlUHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwcm9qIG9mIHByb2plY3REaXJzKSB7XG4gICAgICB3cml0ZVRzQ29uZmlnRm9yUHJvaihwcm9qKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB3cml0ZVRzQ29uZmlnRm9yUHJvaihwcm9qOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuXG4gICAgaWYgKHBhdGhUb1Byb2pLZXkocHJvaikgPT09IGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcFByb2plY3QpIHtcbiAgICAgIGluY2x1ZGUucHVzaCgnbWFpbi93ZmgvKiovKi50cycpO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlLnB1c2goJ2Rpc3QvKi5wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBjcmVhdGVUc0NvbmZpZyhwcm9qLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LFxuICAgICAgLy8geydfcGFja2FnZS1zZXR0aW5ncyc6IFtQYXRoLnJlbGF0aXZlKHByb2osIHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcikpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJyldXG4gICAgICAvLyB9LFxuICAgICAgaW5jbHVkZVxuICAgICk7XG4gICAgY29uc3QgcHJvakRpciA9IFBhdGgucmVzb2x2ZShwcm9qKTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlOiBQYXRoLnJlc29sdmUocHJvaiwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbXG4gICAgICAgIFBhdGgucmVsYXRpdmUocHJvakRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIF1cbiAgICB9KTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShyb290UGF0aCwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpIHtcbiAgY29uc3QgZG9uZSA9IG5ldyBBcnJheTxQcm9taXNlPHVua25vd24+PihnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuc2l6ZSk7XG4gIGxldCBpID0gMDtcbiAgZm9yIChjb25zdCB3c0tleSBvZiBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgbGV0IGhlYWRlciA9ICcnO1xuICAgIC8vIGxldCBib2R5ID0gJ2V4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNDb25maWcge1xcbic7XG4gICAgbGV0IGludGVyZmFjZUJvZHkgPSAnZGVjbGFyZSBtb2R1bGUgXFwnQHdmaC9wbGlua1xcJyB7XFxuJztcbiAgICBpbnRlcmZhY2VCb2R5ICs9ICcgIGludGVyZmFjZSBQbGlua1NldHRpbmdzIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMTogc3RyaW5nKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gdmFyTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhck5hbWUuc2xpY2UoMSk7XG4gICAgICBoZWFkZXIgKz0gYGltcG9ydCB7JHt0eXBlRXhwb3J0fSBhcyAke3R5cGVOYW1lfX0gZnJvbSAnJHtwa2cubmFtZX0vJHt0eXBlRmlsZX0nO1xcbmA7XG4gICAgICAvLyBib2R5ICs9IGAgICcke3BrZy5uYW1lfSc6ICR7dHlwZU5hbWV9O1xcbmA7XG4gICAgICBpbnRlcmZhY2VCb2R5ICs9IGAgICAgJyR7cGtnLm5hbWV9JzogJHt0eXBlTmFtZX07XFxuYDtcbiAgICB9XG4gICAgLy8gYm9keSArPSAnfVxcbic7XG4gICAgaW50ZXJmYWNlQm9keSArPSAnICB9XFxufVxcbic7XG4gICAgY29uc3QgdHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHdzS2V5LCAnbm9kZV9tb2R1bGVzL0B0eXBlcy9wbGluay1zZXR0aW5ncy9pbmRleC5kLnRzJyk7XG4gICAgY29uc3QgdHlwZUZpbGVDb250ZW50ID0gaGVhZGVyICsgaW50ZXJmYWNlQm9keTtcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0eXBlRmlsZSkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyh0eXBlRmlsZSkgfHwgZnMucmVhZEZpbGVTeW5jKHR5cGVGaWxlLCAndXRmOCcpICE9PSB0eXBlRmlsZUNvbnRlbnQpIHtcbiAgICAgIGRvbmVbaSsrXSA9IGZzLnByb21pc2VzLndyaXRlRmlsZSh0eXBlRmlsZSwgdHlwZUZpbGVDb250ZW50KTtcbiAgICAgIGxvZy5pbmZvKCd3cml0ZSBwYWNrYWdlIHNldHRpbmcgZGVmaW5pdGlvbiBmaWxlJywgY2hhbGsuYmx1ZSh0eXBlRmlsZSkpO1xuICAgIH1cblxuICAgIC8vIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlzdERpciwgd3NLZXkgKyAnLnBhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xuICAgIC8vIGxvZy5pbmZvKGB3cml0ZSBzZXR0aW5nIGZpbGU6ICR7Y2hhbGsuYmx1ZShmaWxlKX1gKTtcbiAgICAvLyBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgaGVhZGVyICsgYm9keSk7XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRvbmUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcsXG4gIGV4dHJhUGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119LFxuICBpbmNsdWRlID0gWycqKi8qLnRzJ10pIHtcbiAgY29uc3QgdHNqc29uOiB7ZXh0ZW5kcz86IHN0cmluZzsgaW5jbHVkZTogc3RyaW5nW107IGV4Y2x1ZGU6IHN0cmluZ1tdOyBjb21waWxlck9wdGlvbnM/OiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz59ID0ge1xuICAgIGV4dGVuZHM6IHVuZGVmaW5lZCxcbiAgICBpbmNsdWRlLFxuICAgIGV4Y2x1ZGU6IFsnKiovbm9kZV9tb2R1bGVzJywgJyoqL25vZGVfbW9kdWxlcy4qJ11cbiAgfTtcbiAgY29uc3QgZHJjcERpciA9IChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBzdHJpY3Q6IHRydWUsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBleHRyYVBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UsXG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIGJhY2t1cFRzQ29uZmlnT2YoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBtID0gLyhbXi9cXFxcLl0rKShcXC5bXi9cXFxcLl0rKT8kLy5leGVjKGZpbGUpO1xuICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKGZpbGUuc2xpY2UoMCwgZmlsZS5sZW5ndGggLSBtIVswXS5sZW5ndGgpICsgbSFbMV0gKyAnLm9yaWcnICsgbSFbMl0pO1xuICByZXR1cm4gYmFja3VwRmlsZTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhOiBIb29rZWRUc2NvbmZpZywgd29ya3NwYWNlRGlyPzogc3RyaW5nKSB7XG4gIGNvbnN0IGZpbGUgPSBQYXRoLmlzQWJzb2x1dGUoZGF0YS5yZWxQYXRoKSA/IGRhdGEucmVsUGF0aCA6XG4gICAgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkYXRhLnJlbFBhdGgpO1xuICBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcblxuICBjb25zdCBqc29uID0gKGZzLmV4aXN0c1N5bmMoYmFja3VwKSA/XG4gICAgSlNPTi5wYXJzZShhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShiYWNrdXAsICd1dGY4JykpIDogXy5jbG9uZURlZXAoZGF0YS5vcmlnaW5Kc29uKSApIGFzICB7Y29tcGlsZXJPcHRpb25zPzogQ29tcGlsZXJPcHRpb25zfTtcblxuICAvLyBpZiAoanNvbi5jb21waWxlck9wdGlvbnM/LnBhdGhzICYmIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddICE9IG51bGwpIHtcbiAgLy8gICBkZWxldGUganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ107XG4gIC8vIH1cbiAgY29uc3QgbmV3Q28gPSBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNjb25maWdEaXIsIGRhdGEuYmFzZVVybCxcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucyBhcyBhbnksIHtcbiAgICAgIHdvcmtzcGFjZURpciwgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gICAgfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKCd1cGRhdGU6JywgY2hhbGsuYmx1ZShmaWxlKSk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHRzLnJlYWRDb25maWdGaWxlKHRzY29uZmlnRmlsZSxcbiAgICAgIChmaWxlKSA9PiB7XG4gICAgICAgIGlmIChQYXRoLnJlc29sdmUoZmlsZSkgPT09IHRzY29uZmlnRmlsZSlcbiAgICAgICAgICByZXR1cm4gZXhpc3Rpbmc7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpO1xuICAgICAgfSkuY29uZmlnO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSB0c2NvbmZpZzogJyArIGNoYWxrLmJsdWUodHNjb25maWdGaWxlKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlIHRzY29uZmlnOiAnICsgY2hhbGsuYmx1ZSh0c2NvbmZpZ0ZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLFxuLy8gICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuXG4vLyAgIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbi8vICAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuLy8gICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4vLyAgICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbi8vICAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4vLyAgIH0pO1xuXG4vLyAgIGFwcGVuZEdpdGlnbm9yZShpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4vLyAgIGxldCBkaXIgPSBzdGFydERpcjtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4vLyAgICAgICByZXR1cm4gdGVzdDtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4vLyAgICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuLy8gICAgICAgcmV0dXJuIG51bGw7XG4vLyAgICAgZGlyID0gcGFyZW50O1xuLy8gICB9XG4vLyB9XG4iXX0=