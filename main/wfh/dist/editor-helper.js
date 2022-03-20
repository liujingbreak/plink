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
exports.getStore = exports.getState = exports.getAction$ = exports.dispatcher = void 0;
/* eslint-disable max-len */
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const chalk_1 = __importDefault(require("chalk"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const typescript_1 = __importDefault(require("typescript"));
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const package_mgr_1 = require("./package-mgr");
const store_1 = require("./store");
const _recp = __importStar(require("./recipe-manager"));
const rwPackageJson_1 = require("./rwPackageJson");
const config_1 = require("./config");
const misc_1 = require("./utils/misc");
// import isp from 'inspector';
// if (process.send)
//   isp.open(9222, '0.0.0.0', true);
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
        clearSymlinks() { },
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
    function updateNodeModuleSymlinks(wsKey) {
        var _a;
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
        const srcPkgSet = new Set(Array.from((0, package_list_helper_1.packages4WorkspaceKey)(wsKey, false)).map(pkg => pkg.realPath));
        const srcDirs = Array.from(_recp.allSrcDirs())
            .map(item => item.projDir ? path_1.default.resolve(item.projDir, item.srcDir) : item.srcDir);
        return rx.from(srcDirs).pipe(op.filter(dir => !noModuleSymlink.has(dir)), op.tap(srcDir => {
            rx.of({ name: 'node_modules', realPath: path_1.default.join(currWorkspaceDir, 'node_modules') }).pipe((0, rwPackageJson_1.symbolicLinkPackages)(srcDir)).subscribe();
        }), 
        // only those "node_modules" symlink which are inside source package need to be remove
        // otherwise it will mess up Node.js module lookup algorithm
        op.filter(srcDir => srcPkgSet.has(srcDir)), op.reduce((acc, item) => {
            acc.push(item);
            return acc;
        }, []), op.mergeMap(dirs => {
            exports.dispatcher._change(s => {
                s.nodeModuleSymlinks = new Set();
                for (const destDir of dirs) {
                    s.nodeModuleSymlinks.add(path_1.default.join(destDir, 'node_modules'));
                }
            });
            return dirs;
        }));
    }
    return rx.merge(action$.pipe((0, store_1.ofPayloadAction)(slice.actions.clearSymlinks), op.concatMap(() => {
        return rx.from(_recp.allSrcDirs()).pipe(op.map(item => item.projDir ? path_1.default.resolve(item.projDir, item.srcDir, 'node_modules') :
            path_1.default.resolve(item.srcDir, 'node_modules')), op.mergeMap(dir => {
            return rx.from(fs.promises.lstat(dir)).pipe(op.filter(stat => stat.isSymbolicLink()), op.mergeMap(stat => {
                log.info('remove symlink ' + dir);
                return fs.promises.unlink(dir);
            }), op.catchError((err, src) => rx.EMPTY));
        }), op.finalize(() => exports.dispatcher.clearSymlinksDone()));
    })), action$.pipe((0, store_1.ofPayloadAction)(package_mgr_1.slice.actions.workspaceChanged), op.concatMap(async ({ payload: wsKeys }) => {
        const wsDir = (0, package_mgr_1.isCwdWorkspace)() ? workDir :
            (0, package_mgr_1.getState)().currWorkspace ? path_1.default.resolve(rootPath, (0, package_mgr_1.getState)().currWorkspace)
                : undefined;
        await writePackageSettingType();
        const lastWsKey = wsKeys[wsKeys.length - 1];
        updateTsconfigFileForProjects(lastWsKey);
        await Promise.all(Array.from(getState().tsconfigByRelPath.values())
            .map(data => updateHookedTsconfig(data, wsDir)));
        await updateNodeModuleSymlinks(lastWsKey).toPromise();
    })), action$.pipe((0, store_1.ofPayloadAction)(slice.actions.hookTsconfig), op.mergeMap(action => {
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
async function updateHookedTsconfig(data, workspaceDir) {
    const file = path_1.default.isAbsolute(data.relPath) ? data.relPath :
        path_1.default.resolve(rootPath, data.relPath);
    const tsconfigDir = path_1.default.dirname(file);
    const backup = backupTsConfigOf(file);
    const json = (fs.existsSync(backup) ?
        JSON.parse(await fs.promises.readFile(backup, 'utf8')) : lodash_1.default.cloneDeep(data.originJson));
    // if (json.compilerOptions?.paths && json.compilerOptions.paths['_package-settings'] != null) {
    //   delete json.compilerOptions.paths['_package-settings'];
    // }
    const newCo = (0, package_list_helper_1.setTsCompilerOptForNodePath)(tsconfigDir, data.baseUrl, json.compilerOptions, {
        workspaceDir, enableTypeRoots: true, realPackagePaths: true
    });
    json.compilerOptions = newCo;
    log.info('update:', chalk_1.default.blue(file));
    return fs.promises.writeFile(file, JSON.stringify(json, null, '  '));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsNkNBQStCO0FBQy9CLG9EQUF1QjtBQUN2QixvREFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFFckMsNERBQTRCO0FBQzVCLDJFQUF3SDtBQUN4SCwrQ0FDc0Q7QUFDdEQsbUNBQW1FO0FBQ25FLHdEQUEwQztBQUMxQyxtREFBcUQ7QUFDckQscUNBQWdEO0FBQ2hELHVDQUE4RDtBQUM5RCwrQkFBK0I7QUFDL0Isb0JBQW9CO0FBQ3BCLHFDQUFxQztBQUVyQyxNQUFNLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFHOUMsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUF1QnBELE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUM3QixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxFQUFFLGVBQWU7SUFDckIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGFBQWEsS0FBSSxDQUFDO1FBQ2xCLFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCLElBQUcsQ0FBQztRQUN0RCxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQjtZQUNsRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtnQkFDMUIsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxDQUFDLENBQUMsaUJBQWlCLENBQUMs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Q3JFLDBFQUEwRTtBQUMxRSxRQUFRO0FBRVIsMkRBQTJEO0FBQzNELElBQUk7QUFFSixnRUFBZ0U7QUFDaEUsd0JBQXdCO0FBQ3hCLG1CQUFtQjtBQUNuQix5REFBeUQ7QUFDekQsaUNBQWlDO0FBQ2pDLHFCQUFxQjtBQUNyQixRQUFRO0FBQ1Isd0NBQXdDO0FBQ3hDLDBCQUEwQjtBQUMxQixxQkFBcUI7QUFDckIsb0JBQW9CO0FBQ3BCLE1BQU07QUFDTixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkLCBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucywgcGFja2FnZXM0V29ya3NwYWNlS2V5IH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgdXBkYXRlR2l0SWdub3Jlcywgc2xpY2UgYXMgcGtnU2xpY2UsXG4gIGlzQ3dkV29ya3NwYWNlLCB3b3Jrc3BhY2VEaXIgfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uLCBhY3Rpb24kT2YgfSBmcm9tICcuL3N0b3JlJztcbmltcG9ydCAqIGFzIF9yZWNwIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtwbGlua0VudiwgY2xvc2VzdENvbW1vblBhcmVudERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbi8vIGltcG9ydCBpc3AgZnJvbSAnaW5zcGVjdG9yJztcbi8vIGlmIChwcm9jZXNzLnNlbmQpXG4vLyAgIGlzcC5vcGVuKDkyMjIsICcwLjAuMC4wJywgdHJ1ZSk7XG5cbmNvbnN0IHt3b3JrRGlyLCByb290RGlyOiByb290UGF0aH0gPSBwbGlua0VudjtcblxuXG4vLyBpbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZWRpdG9yLWhlbHBlcicpO1xuLy8gY29uc3Qge3BhcnNlfSA9IHJlcXVpcmUoJ2NvbW1lbnQtanNvbicpO1xuXG5pbnRlcmZhY2UgRWRpdG9ySGVscGVyU3RhdGUge1xuICAvKiogdHNjb25maWcgZmlsZXMgc2hvdWxkIGJlIGNoYW5nZWQgYWNjb3JkaW5nIHRvIGxpbmtlZCBwYWNrYWdlcyBzdGF0ZSAqL1xuICB0c2NvbmZpZ0J5UmVsUGF0aDogTWFwPHN0cmluZywgSG9va2VkVHNjb25maWc+O1xuICAvKiogcHJvYmxlbWF0aWMgc3ltbGlua3Mgd2hpY2ggbXVzdCBiZSByZW1vdmVkIGJlZm9yZSBydW5uaW5nXG4gICAqIG5vZGVfbW9kdWxlcyBzeW1saW5rIGlzIHVuZGVyIHNvdXJjZSBwYWNrYWdlIGRpcmVjdG9yeSwgaXQgd2lsbCBub3Qgd29yayB3aXRoIFwiLS1wcmVzZXJ2ZS1zeW1saW5rc1wiLFxuICAgKiBpbiB3aGljaCBjYXNlLCBOb2RlLmpzIHdpbGwgcmVnYXJkIGEgd29ya3NwYWNlIG5vZGVfbW9kdWxlIGFuZCBpdHMgc3ltbGluayBpbnNpZGUgc291cmNlIHBhY2thZ2UgYXNcbiAgICogdHdlIGRpZmZlcmVudCBkaXJlY3RvcnksIGFuZCBjYXVzZXMgcHJvYmxlbVxuICAgKi9cbiAgbm9kZU1vZHVsZVN5bWxpbmtzPzogU2V0PHN0cmluZz47XG59XG5cbmludGVyZmFjZSBIb29rZWRUc2NvbmZpZyB7XG4gIC8qKiBhYnNvbHV0ZSBwYXRoIG9yIHBhdGggcmVsYXRpdmUgdG8gcm9vdCBwYXRoLCBhbnkgcGF0aCB0aGF0IGlzIHN0b3JlZCBpbiBSZWR1eCBzdG9yZSwgdGhlIGJldHRlciBpdCBpcyBpbiBmb3JtIG9mXG4gICAqIHJlbGF0aXZlIHBhdGggb2YgUm9vdCBwYXRoXG4gICAqL1xuICByZWxQYXRoOiBzdHJpbmc7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgb3JpZ2luSnNvbjogYW55O1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IEVkaXRvckhlbHBlclN0YXRlID0ge1xuICB0c2NvbmZpZ0J5UmVsUGF0aDogbmV3IE1hcCgpXG59O1xuXG5jb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdlZGl0b3ItaGVscGVyJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGNsZWFyU3ltbGlua3MoKSB7fSxcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fSxcbiAgICBjbGVhclN5bWxpbmtzRG9uZShTKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgbGV0IG5vTW9kdWxlU3ltbGluazogU2V0PHN0cmluZz47XG5cbiAgZnVuY3Rpb24gdXBkYXRlTm9kZU1vZHVsZVN5bWxpbmtzKHdzS2V5OiBzdHJpbmcpIHtcbiAgICBpZiAobm9Nb2R1bGVTeW1saW5rID09IG51bGwpIHtcbiAgICAgIG5vTW9kdWxlU3ltbGluayA9IG5ldyBTZXQoKTtcbiAgICAgIGZvciAoY29uc3QgcHJvakRpciBvZiBnZXRQa2dTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKSB7XG4gICAgICAgIGNvbnN0IHJvb3RQa2dKc29uID0gcmVxdWlyZShQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgcHJvakRpciwgJ3BhY2thZ2UuanNvbicpKSBhcyB7cGxpbms/OiB7bm9Nb2R1bGVTeW1saW5rPzogc3RyaW5nW119fTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgKHJvb3RQa2dKc29uLnBsaW5rPy5ub01vZHVsZVN5bWxpbmsgfHwgW10pLm1hcChpdGVtID0+IFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCBwcm9qRGlyLCBpdGVtKSkpIHtcbiAgICAgICAgICBub01vZHVsZVN5bWxpbmsuYWRkKGRpcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjdXJyV29ya3NwYWNlRGlyID0gd29ya3NwYWNlRGlyKHdzS2V5KTtcbiAgICBjb25zdCBzcmNQa2dTZXQgPSBuZXcgU2V0KEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCBmYWxzZSkpLm1hcChwa2cgPT4gcGtnLnJlYWxQYXRoKSk7XG4gICAgY29uc3Qgc3JjRGlycyA9IEFycmF5LmZyb20oX3JlY3AuYWxsU3JjRGlycygpKVxuICAgICAgLm1hcChpdGVtID0+IGl0ZW0ucHJvakRpciA/IFBhdGgucmVzb2x2ZShpdGVtLnByb2pEaXIsIGl0ZW0uc3JjRGlyKSA6IGl0ZW0uc3JjRGlyKTtcbiAgICByZXR1cm4gcnguZnJvbShzcmNEaXJzKS5waXBlKFxuICAgICAgb3AuZmlsdGVyKGRpciA9PiAhbm9Nb2R1bGVTeW1saW5rLmhhcyhkaXIpKSxcbiAgICAgIG9wLnRhcChzcmNEaXIgPT4ge1xuICAgICAgICByeC5vZih7bmFtZTogJ25vZGVfbW9kdWxlcycsIHJlYWxQYXRoOiBQYXRoLmpvaW4oY3VycldvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpfSkucGlwZShcbiAgICAgICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhzcmNEaXIpXG4gICAgICAgICkuc3Vic2NyaWJlKCk7XG4gICAgICB9KSxcbiAgICAgIC8vIG9ubHkgdGhvc2UgXCJub2RlX21vZHVsZXNcIiBzeW1saW5rIHdoaWNoIGFyZSBpbnNpZGUgc291cmNlIHBhY2thZ2UgbmVlZCB0byBiZSByZW1vdmVcbiAgICAgIC8vIG90aGVyd2lzZSBpdCB3aWxsIG1lc3MgdXAgTm9kZS5qcyBtb2R1bGUgbG9va3VwIGFsZ29yaXRobVxuICAgICAgb3AuZmlsdGVyKHNyY0RpciA9PiBzcmNQa2dTZXQuaGFzKHNyY0RpcikpLFxuICAgICAgb3AucmVkdWNlPHN0cmluZywgc3RyaW5nW10+KChhY2MsIGl0ZW0pID0+IHtcbiAgICAgICAgYWNjLnB1c2goaXRlbSk7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCBbXSksXG4gICAgICBvcC5tZXJnZU1hcChkaXJzID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICAgIHMubm9kZU1vZHVsZVN5bWxpbmtzID0gbmV3IFNldCgpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGVzdERpciBvZiBkaXJzKSB7XG4gICAgICAgICAgICBzLm5vZGVNb2R1bGVTeW1saW5rcy5hZGQoUGF0aC5qb2luKGRlc3REaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRpcnM7XG4gICAgICB9KVxuICAgICk7XG4gIH1cblxuICByZXR1cm4gcngubWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmNsZWFyU3ltbGlua3MpLFxuICAgICAgb3AuY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIHJ4LmZyb20oX3JlY3AuYWxsU3JjRGlycygpKS5waXBlKFxuICAgICAgICAgIG9wLm1hcChpdGVtID0+IGl0ZW0ucHJvakRpciA/IFBhdGgucmVzb2x2ZShpdGVtLnByb2pEaXIsIGl0ZW0uc3JjRGlyLCAnbm9kZV9tb2R1bGVzJykgOlxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKGl0ZW0uc3JjRGlyLCAnbm9kZV9tb2R1bGVzJykpLFxuICAgICAgICAgIG9wLm1lcmdlTWFwKGRpciA9PiB7XG4gICAgICAgICAgICByZXR1cm4gcnguZnJvbShmcy5wcm9taXNlcy5sc3RhdChkaXIpKS5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoc3RhdCA9PiBzdGF0LmlzU3ltYm9saWNMaW5rKCkpLFxuICAgICAgICAgICAgICBvcC5tZXJnZU1hcChzdGF0ID0+IHtcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygncmVtb3ZlIHN5bWxpbmsgJyArIGRpcik7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnVubGluayhkaXIpO1xuICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHJ4LkVNUFRZKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9KSxcbiAgICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiBkaXNwYXRjaGVyLmNsZWFyU3ltbGlua3NEb25lKCkpXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dTbGljZS5hY3Rpb25zLndvcmtzcGFjZUNoYW5nZWQpLFxuICAgICAgb3AuY29uY2F0TWFwKGFzeW5jICh7cGF5bG9hZDogd3NLZXlzfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIGF3YWl0IHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCk7XG4gICAgICAgIGNvbnN0IGxhc3RXc0tleSA9IHdzS2V5c1t3c0tleXMubGVuZ3RoIC0gMV07XG4gICAgICAgIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKGxhc3RXc0tleSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UuYWxsKEFycmF5LmZyb20oZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC52YWx1ZXMoKSlcbiAgICAgICAgICAubWFwKGRhdGEgPT4gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YSwgd3NEaXIpKSk7XG4gICAgICAgIGF3YWl0IHVwZGF0ZU5vZGVNb2R1bGVTeW1saW5rcyhsYXN0V3NLZXkpLnRvUHJvbWlzZSgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5ob29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkO1xuICAgICAgfSksXG4gICAgICBvcC5tZXJnZU1hcCgoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb25zdCBiYWNrdXBGaWxlID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcbiAgICAgICAgY29uc3QgaXNCYWNrdXBFeGlzdHMgPSBmcy5leGlzdHNTeW5jKGJhY2t1cEZpbGUpO1xuICAgICAgICBjb25zdCBmaWxlQ29udGVudCA9IGlzQmFja3VwRXhpc3RzID8gZnMucmVhZEZpbGVTeW5jKGJhY2t1cEZpbGUsICd1dGY4JykgOiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnQpIGFzIHtjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc307XG4gICAgICAgIGNvbnN0IGRhdGE6IEhvb2tlZFRzY29uZmlnID0ge1xuICAgICAgICAgIHJlbFBhdGgsXG4gICAgICAgICAgYmFzZVVybDoganNvbi5jb21waWxlck9wdGlvbnMuYmFzZVVybCxcbiAgICAgICAgICBvcmlnaW5Kc29uOiBqc29uXG4gICAgICAgIH07XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgICBzLnRzY29uZmlnQnlSZWxQYXRoLnNldChyZWxQYXRoLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFpc0JhY2t1cEV4aXN0cykge1xuICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgZmlsZUNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gcGF5bG9hZCksXG4gICAgICBvcC5tZXJnZU1hcChmaWxlID0+IHtcbiAgICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoYWJzRmlsZSk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGJhY2t1cCkpIHtcbiAgICAgICAgICBsb2cuaW5mbygnUm9sbCBiYWNrOicsIGFic0ZpbGUpO1xuICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5jb3B5RmlsZShiYWNrdXAsIGFic0ZpbGUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudW5Ib29rQWxsKSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGRpc3BhdGNoZXIudW5Ib29rVHNjb25maWcoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLmtleXMoKSkpO1xuICAgICAgfSlcbiAgICApXG4gICkucGlwZShcbiAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgY2F1Z2h0KSA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgIHJldHVybiBjYXVnaHQ7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWN0aW9uJCh0eXBlOiBrZXlvZiAodHlwZW9mIHNsaWNlKVsnY2FzZVJlZHVjZXJzJ10pIHtcbiAgcmV0dXJuIGFjdGlvbiRPZihzdGF0ZUZhY3RvcnksIHNsaWNlLmFjdGlvbnNbdHlwZV0gYXMgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkPGFueSwgYW55Pik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVBhdGgoZmlsZTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVQcm9qZWN0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHdzID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgd3NLZXkpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXIgPSByZXF1aXJlKCcuL3JlY2lwZS1tYW5hZ2VyJykgYXMgdHlwZW9mIF9yZWNwO1xuXG4gIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKHByb2plY3REaXJzKTtcblxuICBpZiAoaW5jbHVkZVByb2plY3QpIHtcbiAgICB3cml0ZVRzQ29uZmlnRm9yUHJvaihpbmNsdWRlUHJvamVjdCk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChjb25zdCBwcm9qIG9mIHByb2plY3REaXJzKSB7XG4gICAgICB3cml0ZVRzQ29uZmlnRm9yUHJvaihwcm9qKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB3cml0ZVRzQ29uZmlnRm9yUHJvaihwcm9qOiBzdHJpbmcpIHtcbiAgICBjb25zdCBpbmNsdWRlOiBzdHJpbmdbXSA9IFtdO1xuICAgIHJlY2lwZU1hbmFnZXIuZWFjaFJlY2lwZVNyYyhwcm9qLCAoc3JjRGlyOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCBpbmNsdWRlRGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChpbmNsdWRlRGlyICYmIGluY2x1ZGVEaXIgIT09ICcvJylcbiAgICAgICAgaW5jbHVkZURpciArPSAnLyc7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzJyk7XG4gICAgICBpbmNsdWRlLnB1c2goaW5jbHVkZURpciArICcqKi8qLnRzeCcpO1xuICAgIH0pO1xuXG4gICAgaWYgKHBhdGhUb1Byb2pLZXkocHJvaikgPT09IGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcFByb2plY3QpIHtcbiAgICAgIGluY2x1ZGUucHVzaCgnbWFpbi93ZmgvKiovKi50cycpO1xuICAgIH1cbiAgICAvLyBpbmNsdWRlLnB1c2goJ2Rpc3QvKi5wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBjcmVhdGVUc0NvbmZpZyhwcm9qLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LFxuICAgICAgLy8geydfcGFja2FnZS1zZXR0aW5ncyc6IFtQYXRoLnJlbGF0aXZlKHByb2osIHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcikpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcLmRcXC50cyQvLCAnJyldXG4gICAgICAvLyB9LFxuICAgICAgaW5jbHVkZVxuICAgICk7XG4gICAgY29uc3QgcHJvakRpciA9IFBhdGgucmVzb2x2ZShwcm9qKTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtmaWxlOiBQYXRoLnJlc29sdmUocHJvaiwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbXG4gICAgICAgIFBhdGgucmVsYXRpdmUocHJvakRpciwgdHNjb25maWdGaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgICAgIF1cbiAgICB9KTtcbiAgICB1cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShyb290UGF0aCwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJ3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpIHtcbiAgY29uc3QgZG9uZSA9IG5ldyBBcnJheTxQcm9taXNlPHVua25vd24+PihnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuc2l6ZSk7XG4gIGxldCBpID0gMDtcbiAgZm9yIChjb25zdCB3c0tleSBvZiBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgbGV0IGhlYWRlciA9ICcnO1xuICAgIC8vIGxldCBib2R5ID0gJ2V4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNDb25maWcge1xcbic7XG4gICAgbGV0IGludGVyZmFjZUJvZHkgPSAnZGVjbGFyZSBtb2R1bGUgXFwnQHdmaC9wbGlua1xcJyB7XFxuJztcbiAgICBpbnRlcmZhY2VCb2R5ICs9ICcgIGludGVyZmFjZSBQbGlua1NldHRpbmdzIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMTogc3RyaW5nKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gdmFyTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhck5hbWUuc2xpY2UoMSk7XG4gICAgICBoZWFkZXIgKz0gYGltcG9ydCB7JHt0eXBlRXhwb3J0fSBhcyAke3R5cGVOYW1lfX0gZnJvbSAnJHtwa2cubmFtZX0vJHt0eXBlRmlsZX0nO1xcbmA7XG4gICAgICAvLyBib2R5ICs9IGAgICcke3BrZy5uYW1lfSc6ICR7dHlwZU5hbWV9O1xcbmA7XG4gICAgICBpbnRlcmZhY2VCb2R5ICs9IGAgICAgJyR7cGtnLm5hbWV9JzogJHt0eXBlTmFtZX07XFxuYDtcbiAgICB9XG4gICAgLy8gYm9keSArPSAnfVxcbic7XG4gICAgaW50ZXJmYWNlQm9keSArPSAnICB9XFxufVxcbic7XG4gICAgY29uc3QgdHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHdzS2V5LCAnbm9kZV9tb2R1bGVzL0B0eXBlcy9wbGluay1zZXR0aW5ncy9pbmRleC5kLnRzJyk7XG4gICAgY29uc3QgdHlwZUZpbGVDb250ZW50ID0gaGVhZGVyICsgaW50ZXJmYWNlQm9keTtcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguZGlybmFtZSh0eXBlRmlsZSkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyh0eXBlRmlsZSkgfHwgZnMucmVhZEZpbGVTeW5jKHR5cGVGaWxlLCAndXRmOCcpICE9PSB0eXBlRmlsZUNvbnRlbnQpIHtcbiAgICAgIGRvbmVbaSsrXSA9IGZzLnByb21pc2VzLndyaXRlRmlsZSh0eXBlRmlsZSwgdHlwZUZpbGVDb250ZW50KTtcbiAgICAgIGxvZy5pbmZvKCd3cml0ZSBwYWNrYWdlIHNldHRpbmcgZGVmaW5pdGlvbiBmaWxlJywgY2hhbGsuYmx1ZSh0eXBlRmlsZSkpO1xuICAgIH1cblxuICAgIC8vIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlzdERpciwgd3NLZXkgKyAnLnBhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xuICAgIC8vIGxvZy5pbmZvKGB3cml0ZSBzZXR0aW5nIGZpbGU6ICR7Y2hhbGsuYmx1ZShmaWxlKX1gKTtcbiAgICAvLyBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgaGVhZGVyICsgYm9keSk7XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRvbmUpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcsXG4gIGV4dHJhUGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119LFxuICBpbmNsdWRlID0gWycqKi8qLnRzJ10pIHtcbiAgY29uc3QgdHNqc29uOiB7ZXh0ZW5kcz86IHN0cmluZzsgaW5jbHVkZTogc3RyaW5nW107IGV4Y2x1ZGU6IHN0cmluZ1tdOyBjb21waWxlck9wdGlvbnM/OiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz59ID0ge1xuICAgIGV4dGVuZHM6IHVuZGVmaW5lZCxcbiAgICBpbmNsdWRlLFxuICAgIGV4Y2x1ZGU6IFsnKiovbm9kZV9tb2R1bGVzJywgJyoqL25vZGVfbW9kdWxlcy4qJ11cbiAgfTtcbiAgY29uc3QgZHJjcERpciA9IChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBzdHJpY3Q6IHRydWUsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBleHRyYVBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UsXG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIGJhY2t1cFRzQ29uZmlnT2YoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBtID0gLyhbXi9cXFxcLl0rKShcXC5bXi9cXFxcLl0rKT8kLy5leGVjKGZpbGUpO1xuICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKGZpbGUuc2xpY2UoMCwgZmlsZS5sZW5ndGggLSBtIVswXS5sZW5ndGgpICsgbSFbMV0gKyAnLm9yaWcnICsgbSFbMl0pO1xuICByZXR1cm4gYmFja3VwRmlsZTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhOiBIb29rZWRUc2NvbmZpZywgd29ya3NwYWNlRGlyPzogc3RyaW5nKSB7XG4gIGNvbnN0IGZpbGUgPSBQYXRoLmlzQWJzb2x1dGUoZGF0YS5yZWxQYXRoKSA/IGRhdGEucmVsUGF0aCA6XG4gICAgUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBkYXRhLnJlbFBhdGgpO1xuICBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcblxuICBjb25zdCBqc29uID0gKGZzLmV4aXN0c1N5bmMoYmFja3VwKSA/XG4gICAgSlNPTi5wYXJzZShhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShiYWNrdXAsICd1dGY4JykpIDogXy5jbG9uZURlZXAoZGF0YS5vcmlnaW5Kc29uKSApIGFzICB7Y29tcGlsZXJPcHRpb25zPzogQ29tcGlsZXJPcHRpb25zfTtcblxuICAvLyBpZiAoanNvbi5jb21waWxlck9wdGlvbnM/LnBhdGhzICYmIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddICE9IG51bGwpIHtcbiAgLy8gICBkZWxldGUganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ107XG4gIC8vIH1cbiAgY29uc3QgbmV3Q28gPSBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNjb25maWdEaXIsIGRhdGEuYmFzZVVybCxcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucyBhcyBhbnksIHtcbiAgICAgIHdvcmtzcGFjZURpciwgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gICAgfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKCd1cGRhdGU6JywgY2hhbGsuYmx1ZShmaWxlKSk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHRzLnJlYWRDb25maWdGaWxlKHRzY29uZmlnRmlsZSxcbiAgICAgIChmaWxlKSA9PiB7XG4gICAgICAgIGlmIChQYXRoLnJlc29sdmUoZmlsZSkgPT09IHRzY29uZmlnRmlsZSlcbiAgICAgICAgICByZXR1cm4gZXhpc3Rpbmc7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGYtOCcpO1xuICAgICAgfSkuY29uZmlnO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSB0c2NvbmZpZzogJyArIGNoYWxrLmJsdWUodHNjb25maWdGaWxlKSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlIHRzY29uZmlnOiAnICsgY2hhbGsuYmx1ZSh0c2NvbmZpZ0ZpbGUpKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkodHNjb25maWdPdmVycmlkZVNyYywgbnVsbCwgJyAgJykpO1xuICB9XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSh3b3Jrc3BhY2VEaXI6IHN0cmluZywgcGtzOiBQYWNrYWdlSW5mb1tdLFxuLy8gICBvbkdpdElnbm9yZUZpbGVVcGRhdGU6IChmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuXG4vLyAgIGNvbnN0IGRyY3BEaXIgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoIDpcbi8vICAgICBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpKTtcblxuLy8gICBjb25zdCBpZ0NvbmZpZ0ZpbGVzID0gcGtzLm1hcChwayA9PiB7XG4vLyAgICAgLy8gY29tbW9uUGF0aHNbMF0gPSBQYXRoLnJlc29sdmUocGsucmVhbFBhdGgsICdub2RlX21vZHVsZXMnKTtcbi8vICAgICByZXR1cm4gY3JlYXRlVHNDb25maWcocGsubmFtZSwgcGsucmVhbFBhdGgsIHdvcmtzcGFjZURpciwgZHJjcERpcik7XG4vLyAgIH0pO1xuXG4vLyAgIGFwcGVuZEdpdGlnbm9yZShpZ0NvbmZpZ0ZpbGVzLCBvbkdpdElnbm9yZUZpbGVVcGRhdGUpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBmaW5kR2l0SW5nb3JlRmlsZShzdGFydERpcjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4vLyAgIGxldCBkaXIgPSBzdGFydERpcjtcbi8vICAgd2hpbGUgKHRydWUpIHtcbi8vICAgICBjb25zdCB0ZXN0ID0gUGF0aC5yZXNvbHZlKHN0YXJ0RGlyLCAnLmdpdGlnbm9yZScpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKHRlc3QpKSB7XG4vLyAgICAgICByZXR1cm4gdGVzdDtcbi8vICAgICB9XG4vLyAgICAgY29uc3QgcGFyZW50ID0gUGF0aC5kaXJuYW1lKGRpcik7XG4vLyAgICAgaWYgKHBhcmVudCA9PT0gZGlyKVxuLy8gICAgICAgcmV0dXJuIG51bGw7XG4vLyAgICAgZGlyID0gcGFyZW50O1xuLy8gICB9XG4vLyB9XG4iXX0=