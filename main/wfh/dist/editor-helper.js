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
const fs = __importStar(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const package_list_helper_1 = require("./package-mgr/package-list-helper");
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
        const srcPkgSet = new Set(Array.from((0, package_list_helper_1.packages4Workspace)(wsKey, false)).map(pkg => pkg.realPath));
        const srcDirs = Array.from(_recp.allSrcDirs())
            .map(item => item.projDir ? path_1.default.resolve(item.projDir, item.srcDir) : item.srcDir);
        return rx.from(srcDirs).pipe(op.filter(dir => !noModuleSymlink.has(dir)), op.tap(destDir => {
            rx.of({ name: 'node_modules', realPath: path_1.default.join(currWorkspaceDir, 'node_modules') }).pipe((0, rwPackageJson_1.symbolicLinkPackages)(destDir)).subscribe();
        }), op.filter(dir => srcPkgSet.has(dir)), op.reduce((acc, item) => {
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
            }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLDJFQUFxSDtBQUNySCwrQ0FDc0Q7QUFDdEQsbUNBQW1FO0FBQ25FLHdEQUEwQztBQUMxQyxtREFBcUQ7QUFDckQscUNBQWdEO0FBQ2hELHlDQUEyQjtBQUMzQixtREFBcUM7QUFFckMsdUNBQThEO0FBQzlELDREQUE0QjtBQUM1QixNQUFNLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFHOUMsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUF1QnBELE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUM3QixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxFQUFFLGVBQWU7SUFDckIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLGFBQWEsQ0FBQyxDQUFDLElBQUcsQ0FBQztRQUNuQixZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQixJQUFHLENBQUM7UUFDdEQsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEI7WUFDbEQsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUU7Z0JBQzFCLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUNy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Uix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBDb21waWxlck9wdGlvbnMsIHBhY2thZ2VzNFdvcmtzcGFjZSB9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgeyBnZXRQcm9qZWN0TGlzdCwgcGF0aFRvUHJvaktleSwgZ2V0U3RhdGUgYXMgZ2V0UGtnU3RhdGUsIHVwZGF0ZUdpdElnbm9yZXMsIHNsaWNlIGFzIHBrZ1NsaWNlLFxuICBpc0N3ZFdvcmtzcGFjZSwgd29ya3NwYWNlRGlyIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiwgYWN0aW9uJE9mIH0gZnJvbSAnLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7c3ltYm9saWNMaW5rUGFja2FnZXN9IGZyb20gJy4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkLCBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3BsaW5rRW52LCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuY29uc3Qge3dvcmtEaXIsIHJvb3REaXI6IHJvb3RQYXRofSA9IHBsaW5rRW52O1xuXG5cbi8vIGltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5lZGl0b3ItaGVscGVyJyk7XG4vLyBjb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5cbmludGVyZmFjZSBFZGl0b3JIZWxwZXJTdGF0ZSB7XG4gIC8qKiB0c2NvbmZpZyBmaWxlcyBzaG91bGQgYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gbGlua2VkIHBhY2thZ2VzIHN0YXRlICovXG4gIHRzY29uZmlnQnlSZWxQYXRoOiBNYXA8c3RyaW5nLCBIb29rZWRUc2NvbmZpZz47XG4gIC8qKiBwcm9ibGVtYXRpYyBzeW1saW5rcyB3aGljaCBtdXN0IGJlIHJlbW92ZWQgYmVmb3JlIHJ1bm5pbmdcbiAgICogbm9kZV9tb2R1bGVzIHN5bWxpbmsgaXMgdW5kZXIgc291cmNlIHBhY2thZ2UgZGlyZWN0b3J5LCBpdCB3aWxsIG5vdCB3b3JrIHdpdGggXCItLXByZXNlcnZlLXN5bWxpbmtzXCIsXG4gICAqIGluIHdoaWNoIGNhc2UsIE5vZGUuanMgd2lsbCByZWdhcmQgYSB3b3Jrc3BhY2Ugbm9kZV9tb2R1bGUgYW5kIGl0cyBzeW1saW5rIGluc2lkZSBzb3VyY2UgcGFja2FnZSBhc1xuICAgKiB0d2UgZGlmZmVyZW50IGRpcmVjdG9yeSwgYW5kIGNhdXNlcyBwcm9ibGVtXG4gICAqL1xuICBub2RlTW9kdWxlU3ltbGlua3M/OiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIEhvb2tlZFRzY29uZmlnIHtcbiAgLyoqIGFic29sdXRlIHBhdGggb3IgcGF0aCByZWxhdGl2ZSB0byByb290IHBhdGgsIGFueSBwYXRoIHRoYXQgaXMgc3RvcmVkIGluIFJlZHV4IHN0b3JlLCB0aGUgYmV0dGVyIGl0IGlzIGluIGZvcm0gb2ZcbiAgICogcmVsYXRpdmUgcGF0aCBvZiBSb290IHBhdGhcbiAgICovXG4gIHJlbFBhdGg6IHN0cmluZztcbiAgYmFzZVVybDogc3RyaW5nO1xuICBvcmlnaW5Kc29uOiBhbnk7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogRWRpdG9ySGVscGVyU3RhdGUgPSB7XG4gIHRzY29uZmlnQnlSZWxQYXRoOiBuZXcgTWFwKClcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2VkaXRvci1oZWxwZXInLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgY2xlYXJTeW1saW5rcyhzKSB7fSxcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fSxcbiAgICBjbGVhclN5bWxpbmtzRG9uZShTKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgbGV0IG5vTW9kdWxlU3ltbGluazogU2V0PHN0cmluZz47XG5cbiAgZnVuY3Rpb24gdXBkYXRlTm9kZU1vZHVsZVN5bWxpbmtzKHdzS2V5OiBzdHJpbmcpIHtcbiAgICBpZiAobm9Nb2R1bGVTeW1saW5rID09IG51bGwpIHtcbiAgICAgIG5vTW9kdWxlU3ltbGluayA9IG5ldyBTZXQoKTtcbiAgICAgIGZvciAoY29uc3QgcHJvakRpciBvZiBnZXRQa2dTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKSB7XG4gICAgICAgIGNvbnN0IHJvb3RQa2dKc29uID0gcmVxdWlyZShQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgcHJvakRpciwgJ3BhY2thZ2UuanNvbicpKSBhcyB7cGxpbms/OiB7bm9Nb2R1bGVTeW1saW5rPzogc3RyaW5nW119fTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgKHJvb3RQa2dKc29uLnBsaW5rPy5ub01vZHVsZVN5bWxpbmsgfHwgW10pLm1hcChpdGVtID0+IFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCBwcm9qRGlyLCBpdGVtKSkpIHtcbiAgICAgICAgICBub01vZHVsZVN5bWxpbmsuYWRkKGRpcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjdXJyV29ya3NwYWNlRGlyID0gd29ya3NwYWNlRGlyKHdzS2V5KTtcbiAgICBjb25zdCBzcmNQa2dTZXQgPSBuZXcgU2V0KEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlKHdzS2V5LCBmYWxzZSkpLm1hcChwa2cgPT4gcGtnLnJlYWxQYXRoKSk7XG4gICAgY29uc3Qgc3JjRGlycyA9IEFycmF5LmZyb20oX3JlY3AuYWxsU3JjRGlycygpKVxuICAgICAgLm1hcChpdGVtID0+IGl0ZW0ucHJvakRpciA/IFBhdGgucmVzb2x2ZShpdGVtLnByb2pEaXIsIGl0ZW0uc3JjRGlyKSA6IGl0ZW0uc3JjRGlyKTtcblxuICAgIHJldHVybiByeC5mcm9tKHNyY0RpcnMpLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoZGlyID0+ICFub01vZHVsZVN5bWxpbmsuaGFzKGRpcikpLFxuICAgICAgb3AudGFwKGRlc3REaXIgPT4ge1xuICAgICAgICByeC5vZih7bmFtZTogJ25vZGVfbW9kdWxlcycsIHJlYWxQYXRoOiBQYXRoLmpvaW4oY3VycldvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpfSkucGlwZShcbiAgICAgICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhkZXN0RGlyKVxuICAgICAgICApLnN1YnNjcmliZSgpO1xuICAgICAgfSksXG4gICAgICBvcC5maWx0ZXIoZGlyID0+IHNyY1BrZ1NldC5oYXMoZGlyKSksXG4gICAgICBvcC5yZWR1Y2U8c3RyaW5nLCBzdHJpbmdbXT4oKGFjYywgaXRlbSkgPT4ge1xuICAgICAgICBhY2MucHVzaChpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFjYztcbiAgICAgIH0sIFtdKSxcbiAgICAgIG9wLm1lcmdlTWFwKGRpcnMgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgcy5ub2RlTW9kdWxlU3ltbGlua3MgPSBuZXcgU2V0KCk7XG4gICAgICAgICAgZm9yIChjb25zdCBkZXN0RGlyIG9mIGRpcnMpIHtcbiAgICAgICAgICAgIHMubm9kZU1vZHVsZVN5bWxpbmtzLmFkZChQYXRoLmpvaW4oZGVzdERpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZGlycztcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiByeC5tZXJnZShcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuY2xlYXJTeW1saW5rcyksXG4gICAgICBvcC5jb25jYXRNYXAoKCkgPT4ge1xuICAgICAgICByZXR1cm4gcnguZnJvbShfcmVjcC5hbGxTcmNEaXJzKCkpLnBpcGUoXG4gICAgICAgICAgb3AubWFwKGl0ZW0gPT4gaXRlbS5wcm9qRGlyID8gUGF0aC5yZXNvbHZlKGl0ZW0ucHJvakRpciwgaXRlbS5zcmNEaXIsICdub2RlX21vZHVsZXMnKSA6XG4gICAgICAgICAgICBQYXRoLnJlc29sdmUoaXRlbS5zcmNEaXIsICdub2RlX21vZHVsZXMnKSksXG4gICAgICAgICAgb3AubWVyZ2VNYXAoZGlyID0+IHtcbiAgICAgICAgICAgIHJldHVybiByeC5mcm9tKGZzLnByb21pc2VzLmxzdGF0KGRpcikpLnBpcGUoXG4gICAgICAgICAgICAgIG9wLmZpbHRlcihzdGF0ID0+IHN0YXQuaXNTeW1ib2xpY0xpbmsoKSksXG4gICAgICAgICAgICAgIG9wLm1lcmdlTWFwKHN0YXQgPT4ge1xuICAgICAgICAgICAgICAgIGxvZy5pbmZvKCdyZW1vdmUgc3ltbGluayAnICsgZGlyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMudW5saW5rKGRpcik7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIG9wLmZpbmFsaXplKCgpID0+IGRpc3BhdGNoZXIuY2xlYXJTeW1saW5rc0RvbmUoKSlcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ1NsaWNlLmFjdGlvbnMud29ya3NwYWNlQ2hhbmdlZCksXG4gICAgICBvcC5jb25jYXRNYXAoYXN5bmMgKHtwYXlsb2FkOiB3c0tleXN9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShyb290UGF0aCwgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlISlcbiAgICAgICAgICA6IHVuZGVmaW5lZDtcbiAgICAgICAgYXdhaXQgd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKTtcbiAgICAgICAgY29uc3QgbGFzdFdzS2V5ID0gd3NLZXlzW3dzS2V5cy5sZW5ndGggLSAxXTtcbiAgICAgICAgdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMobGFzdFdzS2V5KTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLnZhbHVlcygpKVxuICAgICAgICAgIC5tYXAoZGF0YSA9PiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0RpcikpKTtcbiAgICAgICAgYXdhaXQgdXBkYXRlTm9kZU1vZHVsZVN5bWxpbmtzKGxhc3RXc0tleSkudG9Qcm9taXNlKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhvb2tUc2NvbmZpZyksXG4gICAgICBvcC5tZXJnZU1hcChhY3Rpb24gPT4ge1xuICAgICAgICByZXR1cm4gYWN0aW9uLnBheWxvYWQ7XG4gICAgICB9KSxcbiAgICAgIG9wLm1lcmdlTWFwKChmaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbnN0IGJhY2t1cEZpbGUgPSBiYWNrdXBUc0NvbmZpZ09mKGZpbGUpO1xuICAgICAgICBjb25zdCBpc0JhY2t1cEV4aXN0cyA9IGZzLmV4aXN0c1N5bmMoYmFja3VwRmlsZSk7XG4gICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gaXNCYWNrdXBFeGlzdHMgPyBmcy5yZWFkRmlsZVN5bmMoYmFja3VwRmlsZSwgJ3V0ZjgnKSA6IGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmaWxlQ29udGVudCkgYXMge2NvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zfTtcbiAgICAgICAgY29uc3QgZGF0YTogSG9va2VkVHNjb25maWcgPSB7XG4gICAgICAgICAgcmVsUGF0aCxcbiAgICAgICAgICBiYXNlVXJsOiBqc29uLmNvbXBpbGVyT3B0aW9ucy5iYXNlVXJsLFxuICAgICAgICAgIG9yaWdpbkpzb246IGpzb25cbiAgICAgICAgfTtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICAgIHMudHNjb25maWdCeVJlbFBhdGguc2V0KHJlbFBhdGgsIGRhdGEpO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIWlzQmFja3VwRXhpc3RzKSB7XG4gICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhiYWNrdXBGaWxlLCBmaWxlQ29udGVudCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gd29ya0RpciA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YSwgd3NEaXIpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51bkhvb2tUc2NvbmZpZyksXG4gICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiBwYXlsb2FkKSxcbiAgICAgIG9wLm1lcmdlTWFwKGZpbGUgPT4ge1xuICAgICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBmaWxlKTtcbiAgICAgICAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihhYnNGaWxlKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYmFja3VwKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdSb2xsIGJhY2s6JywgYWJzRmlsZSk7XG4gICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLmNvcHlGaWxlKGJhY2t1cCwgYWJzRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51bkhvb2tBbGwpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci51bkhvb2tUc2NvbmZpZyhBcnJheS5mcm9tKGdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGgua2V5cygpKSk7XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBY3Rpb24kKHR5cGU6IGtleW9mICh0eXBlb2Ygc2xpY2UpWydjYXNlUmVkdWNlcnMnXSkge1xuICByZXR1cm4gYWN0aW9uJE9mKHN0YXRlRmFjdG9yeSwgc2xpY2UuYWN0aW9uc1t0eXBlXSBhcyBBY3Rpb25DcmVhdG9yV2l0aFBheWxvYWQ8YW55LCBhbnk+KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmZ1bmN0aW9uIHJlbGF0aXZlUGF0aChmaWxlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXk6IHN0cmluZywgaW5jbHVkZVByb2plY3Q/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3MgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCB3c0tleSk7XG5cbiAgY29uc3QgcmVjaXBlTWFuYWdlciA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKSBhcyB0eXBlb2YgX3JlY3A7XG5cbiAgY29uc3Qgc3JjUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIocHJvamVjdERpcnMpO1xuXG4gIGlmIChpbmNsdWRlUHJvamVjdCkge1xuICAgIHdyaXRlVHNDb25maWdGb3JQcm9qKGluY2x1ZGVQcm9qZWN0KTtcbiAgfSBlbHNlIHtcbiAgICBmb3IgKGNvbnN0IHByb2ogb2YgcHJvamVjdERpcnMpIHtcbiAgICAgIHdyaXRlVHNDb25maWdGb3JQcm9qKHByb2opO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHdyaXRlVHNDb25maWdGb3JQcm9qKHByb2o6IHN0cmluZykge1xuICAgIGNvbnN0IGluY2x1ZGU6IHN0cmluZ1tdID0gW107XG4gICAgcmVjaXBlTWFuYWdlci5lYWNoUmVjaXBlU3JjKHByb2osIChzcmNEaXI6IHN0cmluZykgPT4ge1xuICAgICAgbGV0IGluY2x1ZGVEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgaWYgKGluY2x1ZGVEaXIgJiYgaW5jbHVkZURpciAhPT0gJy8nKVxuICAgICAgICBpbmNsdWRlRGlyICs9ICcvJztcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHMnKTtcbiAgICAgIGluY2x1ZGUucHVzaChpbmNsdWRlRGlyICsgJyoqLyoudHN4Jyk7XG4gICAgfSk7XG5cbiAgICBpZiAocGF0aFRvUHJvaktleShwcm9qKSA9PT0gZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwUHJvamVjdCkge1xuICAgICAgaW5jbHVkZS5wdXNoKCdtYWluL3dmaC8qKi8qLnRzJyk7XG4gICAgfVxuICAgIC8vIGluY2x1ZGUucHVzaCgnZGlzdC8qLnBhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKHByb2osIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sXG4gICAgICAvLyB7J19wYWNrYWdlLXNldHRpbmdzJzogW1BhdGgucmVsYXRpdmUocHJvaiwgcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyKSlcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKV1cbiAgICAgIC8vIH0sXG4gICAgICBpbmNsdWRlXG4gICAgKTtcbiAgICBjb25zdCBwcm9qRGlyID0gUGF0aC5yZXNvbHZlKHByb2opO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGU6IFBhdGgucmVzb2x2ZShwcm9qLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCB0c2NvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgXVxuICAgIH0pO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe1xuICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAndHlwZXMnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCkge1xuICBjb25zdCBkb25lID0gbmV3IEFycmF5PFByb21pc2U8dW5rbm93bj4+KGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5zaXplKTtcbiAgbGV0IGkgPSAwO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBsZXQgaGVhZGVyID0gJyc7XG4gICAgLy8gbGV0IGJvZHkgPSAnZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc0NvbmZpZyB7XFxuJztcbiAgICBsZXQgaW50ZXJmYWNlQm9keSA9ICdkZWNsYXJlIG1vZHVsZSBcXCdAd2ZoL3BsaW5rXFwnIHtcXG4nO1xuICAgIGludGVyZmFjZUJvZHkgKz0gJyAgaW50ZXJmYWNlIFBsaW5rU2V0dGluZ3Mge1xcbic7XG4gICAgZm9yIChjb25zdCBbdHlwZUZpbGUsIHR5cGVFeHBvcnQsIF9kZWZhdWx0RmlsZSwgX2RlZmF1bHRFeHBvcnQsIHBrZ10gb2YgZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3c0tleSkpIHtcbiAgICAgIGNvbnN0IHZhck5hbWUgPSBwa2cuc2hvcnROYW1lLnJlcGxhY2UoLy0oW15dKS9nLCAobWF0Y2gsIGcxOiBzdHJpbmcpID0+IGcxLnRvVXBwZXJDYXNlKCkpO1xuICAgICAgY29uc3QgdHlwZU5hbWUgPSB2YXJOYW1lLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgdmFyTmFtZS5zbGljZSgxKTtcbiAgICAgIGhlYWRlciArPSBgaW1wb3J0IHske3R5cGVFeHBvcnR9IGFzICR7dHlwZU5hbWV9fSBmcm9tICcke3BrZy5uYW1lfS8ke3R5cGVGaWxlfSc7XFxuYDtcbiAgICAgIC8vIGJvZHkgKz0gYCAgJyR7cGtnLm5hbWV9JzogJHt0eXBlTmFtZX07XFxuYDtcbiAgICAgIGludGVyZmFjZUJvZHkgKz0gYCAgICAnJHtwa2cubmFtZX0nOiAke3R5cGVOYW1lfTtcXG5gO1xuICAgIH1cbiAgICAvLyBib2R5ICs9ICd9XFxuJztcbiAgICBpbnRlcmZhY2VCb2R5ICs9ICcgIH1cXG59XFxuJztcbiAgICBjb25zdCB0eXBlRmlsZSA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgd3NLZXksICdub2RlX21vZHVsZXMvQHR5cGVzL3BsaW5rLXNldHRpbmdzL2luZGV4LmQudHMnKTtcbiAgICBjb25zdCB0eXBlRmlsZUNvbnRlbnQgPSBoZWFkZXIgKyBpbnRlcmZhY2VCb2R5O1xuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKHR5cGVGaWxlKSk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKHR5cGVGaWxlKSB8fCBmcy5yZWFkRmlsZVN5bmModHlwZUZpbGUsICd1dGY4JykgIT09IHR5cGVGaWxlQ29udGVudCkge1xuICAgICAgZG9uZVtpKytdID0gZnMucHJvbWlzZXMud3JpdGVGaWxlKHR5cGVGaWxlLCB0eXBlRmlsZUNvbnRlbnQpO1xuICAgICAgbG9nLmluZm8oJ3dyaXRlIHBhY2thZ2Ugc2V0dGluZyBkZWZpbml0aW9uIGZpbGUnLCBjaGFsay5ibHVlKHR5cGVGaWxlKSk7XG4gICAgfVxuXG4gICAgLy8gY29uc3QgZmlsZSA9IFBhdGguam9pbihkaXN0RGlyLCB3c0tleSArICcucGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG4gICAgLy8gbG9nLmluZm8oYHdyaXRlIHNldHRpbmcgZmlsZTogJHtjaGFsay5ibHVlKGZpbGUpfWApO1xuICAgIC8vIGRvbmVbaSsrXSA9IGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBoZWFkZXIgKyBib2R5KTtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZG9uZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtnTmFtZSBcbiAqIEBwYXJhbSBkaXIgXG4gKiBAcGFyYW0gd29ya3NwYWNlIFxuICogQHBhcmFtIGRyY3BEaXIgXG4gKiBAcGFyYW0gaW5jbHVkZSBcbiAqIEByZXR1cm4gdHNjb25maWcgZmlsZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHByb2o6IHN0cmluZywgc3JjUm9vdERpcjogc3RyaW5nLCB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgZXh0cmFQYXRoTWFwcGluZzoge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX0sXG4gIGluY2x1ZGUgPSBbJyoqLyoudHMnXSkge1xuICBjb25zdCB0c2pzb246IHtleHRlbmRzPzogc3RyaW5nOyBpbmNsdWRlOiBzdHJpbmdbXTsgZXhjbHVkZTogc3RyaW5nW107IGNvbXBpbGVyT3B0aW9ucz86IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPn0gPSB7XG4gICAgZXh0ZW5kczogdW5kZWZpbmVkLFxuICAgIGluY2x1ZGUsXG4gICAgZXhjbHVkZTogWycqKi9ub2RlX21vZHVsZXMnLCAnKiovbm9kZV9tb2R1bGVzLionXVxuICB9O1xuICBjb25zdCBkcmNwRGlyID0gKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCB8fCBnZXRQa2dTdGF0ZSgpLmluc3RhbGxlZERyY3ApIS5yZWFsUGF0aDtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIFBhdGgucmVzb2x2ZShkcmNwRGlyLCAnd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpKTtcbiAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gIH1cbiAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgY29uc3Qgcm9vdERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjUm9vdERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpIHx8ICcuJztcbiAgdHNqc29uLmNvbXBpbGVyT3B0aW9ucyA9IHtcbiAgICByb290RGlyLFxuICAgICAgLy8gbm9SZXNvbHZlOiB0cnVlLCAvLyBEbyBub3QgYWRkIHRoaXMsIFZDIHdpbGwgbm90IGJlIGFibGUgdG8gdW5kZXJzdGFuZCByeGpzIG1vZHVsZVxuICAgIHNraXBMaWJDaGVjazogZmFsc2UsXG4gICAganN4OiAncHJlc2VydmUnLFxuICAgIHRhcmdldDogJ2VzMjAxNScsXG4gICAgbW9kdWxlOiAnY29tbW9uanMnLFxuICAgIHN0cmljdDogdHJ1ZSxcbiAgICBkZWNsYXJhdGlvbjogZmFsc2UsIC8vIEltcG9ydGFudDogdG8gYXZvaWQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yOTgwOCNpc3N1ZWNvbW1lbnQtNDg3ODExODMyXG4gICAgcGF0aHM6IGV4dHJhUGF0aE1hcHBpbmdcbiAgfTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2osIHByb2osIHRzanNvbi5jb21waWxlck9wdGlvbnMsIHtcbiAgICB3b3Jrc3BhY2VEaXI6IHdvcmtzcGFjZSxcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgcmVhbFBhY2thZ2VQYXRoczogdHJ1ZVxuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gYmFja3VwVHNDb25maWdPZihmaWxlOiBzdHJpbmcpIHtcbiAgLy8gY29uc3QgdHNjb25maWdEaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gIGNvbnN0IG0gPSAvKFteL1xcXFwuXSspKFxcLlteL1xcXFwuXSspPyQvLmV4ZWMoZmlsZSk7XG4gIGNvbnN0IGJhY2t1cEZpbGUgPSBQYXRoLnJlc29sdmUoZmlsZS5zbGljZSgwLCBmaWxlLmxlbmd0aCAtIG0hWzBdLmxlbmd0aCkgKyBtIVsxXSArICcub3JpZycgKyBtIVsyXSk7XG4gIHJldHVybiBiYWNrdXBGaWxlO1xufVxuXG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGE6IEhvb2tlZFRzY29uZmlnLCB3b3Jrc3BhY2VEaXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgZmlsZSA9IFBhdGguaXNBYnNvbHV0ZShkYXRhLnJlbFBhdGgpID8gZGF0YS5yZWxQYXRoIDpcbiAgICBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGRhdGEucmVsUGF0aCk7XG4gIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGZpbGUpO1xuXG4gIGNvbnN0IGpzb24gPSAoZnMuZXhpc3RzU3luYyhiYWNrdXApID9cbiAgICBKU09OLnBhcnNlKGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGJhY2t1cCwgJ3V0ZjgnKSkgOiBfLmNsb25lRGVlcChkYXRhLm9yaWdpbkpzb24pICkgYXMgIHtjb21waWxlck9wdGlvbnM/OiBDb21waWxlck9wdGlvbnN9O1xuXG4gIC8vIGlmIChqc29uLmNvbXBpbGVyT3B0aW9ucz8ucGF0aHMgJiYganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gIT0gbnVsbCkge1xuICAvLyAgIGRlbGV0ZSBqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1snX3BhY2thZ2Utc2V0dGluZ3MnXTtcbiAgLy8gfVxuICBjb25zdCBuZXdDbyA9IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCh0c2NvbmZpZ0RpciwgZGF0YS5iYXNlVXJsLFxuICAgIGpzb24uY29tcGlsZXJPcHRpb25zIGFzIGFueSwge1xuICAgICAgd29ya3NwYWNlRGlyLCBlbmFibGVUeXBlUm9vdHM6IHRydWUsIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgICB9KTtcbiAganNvbi5jb21waWxlck9wdGlvbnMgPSBuZXdDbztcbiAgbG9nLmluZm8oJ3VwZGF0ZTonLCBjaGFsay5ibHVlKGZpbGUpKTtcbiAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBKU09OLnN0cmluZ2lmeShqc29uLCBudWxsLCAnICAnKSk7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlVHNDb25maWcoc3JjOiBhbnksIHRhcmdldDogYW55KSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHNyYykpIHtcbiAgICBpZiAoa2V5ID09PSAnY29tcGlsZXJPcHRpb25zJykge1xuICAgICAgaWYgKHRhcmdldC5jb21waWxlck9wdGlvbnMpXG4gICAgICAgIE9iamVjdC5hc3NpZ24odGFyZ2V0LmNvbXBpbGVyT3B0aW9ucywgc3JjLmNvbXBpbGVyT3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZTogc3RyaW5nLCB0c2NvbmZpZ092ZXJyaWRlU3JjOiBhbnkpIHtcbiAgaWYgKGZzLmV4aXN0c1N5bmModHNjb25maWdGaWxlKSkge1xuICAgIGNvbnN0IGV4aXN0aW5nID0gZnMucmVhZEZpbGVTeW5jKHRzY29uZmlnRmlsZSwgJ3V0ZjgnKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gdHMucmVhZENvbmZpZ0ZpbGUodHNjb25maWdGaWxlLFxuICAgICAgKGZpbGUpID0+IHtcbiAgICAgICAgaWYgKFBhdGgucmVzb2x2ZShmaWxlKSA9PT0gdHNjb25maWdGaWxlKVxuICAgICAgICAgIHJldHVybiBleGlzdGluZztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0Zi04Jyk7XG4gICAgICB9KS5jb25maWc7XG4gICAgb3ZlcnJpZGVUc0NvbmZpZyh0c2NvbmZpZ092ZXJyaWRlU3JjLCBleGlzdGluZ0pzb24pO1xuICAgIGNvbnN0IG5ld0pzb25TdHIgPSBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpO1xuICAgIGlmIChuZXdKc29uU3RyICE9PSBleGlzdGluZykge1xuICAgICAgbG9nLmluZm8oJ1dyaXRlIHRzY29uZmlnOiAnICsgY2hhbGsuYmx1ZSh0c2NvbmZpZ0ZpbGUpKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgdHNjb25maWc6ICcgKyBjaGFsay5ibHVlKHRzY29uZmlnRmlsZSkpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ092ZXJyaWRlU3JjLCBudWxsLCAnICAnKSk7XG4gIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwa3M6IFBhY2thZ2VJbmZvW10sXG4vLyAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG5cbi8vICAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuLy8gICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4vLyAgIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbi8vICAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuLy8gICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhway5uYW1lLCBway5yZWFsUGF0aCwgd29ya3NwYWNlRGlyLCBkcmNwRGlyKTtcbi8vICAgfSk7XG5cbi8vICAgYXBwZW5kR2l0aWdub3JlKGlnQ29uZmlnRmlsZXMsIG9uR2l0SWdub3JlRmlsZVVwZGF0ZSk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGZpbmRHaXRJbmdvcmVGaWxlKHN0YXJ0RGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbi8vICAgbGV0IGRpciA9IHN0YXJ0RGlyO1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUoc3RhcnREaXIsICcuZ2l0aWdub3JlJyk7XG4vLyAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbi8vICAgICAgIHJldHVybiB0ZXN0O1xuLy8gICAgIH1cbi8vICAgICBjb25zdCBwYXJlbnQgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbi8vICAgICBpZiAocGFyZW50ID09PSBkaXIpXG4vLyAgICAgICByZXR1cm4gbnVsbDtcbi8vICAgICBkaXIgPSBwYXJlbnQ7XG4vLyAgIH1cbi8vIH1cbiJdfQ==