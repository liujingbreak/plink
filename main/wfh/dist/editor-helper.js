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
        const srcPkgs = (0, package_list_helper_1.packages4Workspace)(wsKey, false);
        const srcDirSet = new Set(Array.from(_recp.allSrcDirs())
            .map(item => item.projDir ? path_1.default.resolve(item.projDir, item.srcDir) : item.srcDir));
        return rx.from(srcPkgs).pipe(op.map(pkg => pkg.realPath), op.filter(dir => srcDirSet.has(dir) && !noModuleSymlink.has(dir)), op.reduce((acc, item) => {
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
        }), op.mergeMap(destDir => {
            return rx.of({ name: 'node_modules', realPath: path_1.default.join(currWorkspaceDir, 'node_modules') }).pipe((0, rwPackageJson_1.symbolicLinkPackages)(destDir));
        }));
    }
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
    action$.pipe((0, store_1.ofPayloadAction)(slice.actions.clearSymlinks), op.concatMap(() => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLDJFQUFxSDtBQUNySCxzRkFBc0Y7QUFDdEYsK0NBQ3NEO0FBQ3RELG1DQUFtRTtBQUNuRSx3REFBMEM7QUFDMUMsbURBQXFEO0FBQ3JELHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBRXJDLHVDQUE4RDtBQUM5RCw0REFBNEI7QUFDNUIsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRzlDLCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBdUJwRCxNQUFNLFlBQVksR0FBc0I7SUFDdEMsaUJBQWlCLEVBQUUsSUFBSSxHQUFHLEVBQUU7Q0FDN0IsQ0FBQztBQUVGLE1BQU0sS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ2xDLElBQUksRUFBRSxlQUFlO0lBQ3JCLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixhQUFhLENBQUMsQ0FBQyxJQUFHLENBQUM7UUFDbkIsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEIsSUFBRyxDQUFDO1FBQ3RELGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCO1lBQ2xELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUMxQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxD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UTtBQUVSLDJEQUEyRDtBQUMzRCxJQUFJO0FBRUosZ0VBQWdFO0FBQ2hFLHdCQUF3QjtBQUN4QixtQkFBbUI7QUFDbkIseURBQXlEO0FBQ3pELGlDQUFpQztBQUNqQyxxQkFBcUI7QUFDckIsUUFBUTtBQUNSLHdDQUF3QztBQUN4QywwQkFBMEI7QUFDMUIscUJBQXFCO0FBQ3JCLG9CQUFvQjtBQUNwQixNQUFNO0FBQ04sSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIENvbXBpbGVyT3B0aW9ucywgcGFja2FnZXM0V29ya3NwYWNlIH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbi8vIGltcG9ydCB7ZmlsdGVyRWZmZWN0fSBmcm9tICcuLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9yeC11dGlscyc7XG5pbXBvcnQgeyBnZXRQcm9qZWN0TGlzdCwgcGF0aFRvUHJvaktleSwgZ2V0U3RhdGUgYXMgZ2V0UGtnU3RhdGUsIHVwZGF0ZUdpdElnbm9yZXMsIHNsaWNlIGFzIHBrZ1NsaWNlLFxuICBpc0N3ZFdvcmtzcGFjZSwgd29ya3NwYWNlRGlyIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiwgYWN0aW9uJE9mIH0gZnJvbSAnLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7c3ltYm9saWNMaW5rUGFja2FnZXN9IGZyb20gJy4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgQWN0aW9uQ3JlYXRvcldpdGhQYXlsb2FkLCBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQge3BsaW5rRW52LCBjbG9zZXN0Q29tbW9uUGFyZW50RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuY29uc3Qge3dvcmtEaXIsIHJvb3REaXI6IHJvb3RQYXRofSA9IHBsaW5rRW52O1xuXG5cbi8vIGltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5lZGl0b3ItaGVscGVyJyk7XG4vLyBjb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5cbmludGVyZmFjZSBFZGl0b3JIZWxwZXJTdGF0ZSB7XG4gIC8qKiB0c2NvbmZpZyBmaWxlcyBzaG91bGQgYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gbGlua2VkIHBhY2thZ2VzIHN0YXRlICovXG4gIHRzY29uZmlnQnlSZWxQYXRoOiBNYXA8c3RyaW5nLCBIb29rZWRUc2NvbmZpZz47XG4gIC8qKiBwcm9ibGVtYXRpYyBzeW1saW5rcyB3aGljaCBtdXN0IGJlIHJlbW92ZWQgYmVmb3JlIHJ1bm5pbmdcbiAgICogbm9kZV9tb2R1bGVzIHN5bWxpbmsgaXMgdW5kZXIgc291cmNlIHBhY2thZ2UgZGlyZWN0b3J5LCBpdCB3aWxsIG5vdCB3b3JrIHdpdGggXCItLXByZXNlcnZlLXN5bWxpbmtzXCIsXG4gICAqIGluIHdoaWNoIGNhc2UsIE5vZGUuanMgd2lsbCByZWdhcmQgYSB3b3Jrc3BhY2Ugbm9kZV9tb2R1bGUgYW5kIGl0cyBzeW1saW5rIGluc2lkZSBzb3VyY2UgcGFja2FnZSBhc1xuICAgKiB0d2UgZGlmZmVyZW50IGRpcmVjdG9yeSwgYW5kIGNhdXNlcyBwcm9ibGVtXG4gICAqL1xuICBub2RlTW9kdWxlU3ltbGlua3M/OiBTZXQ8c3RyaW5nPjtcbn1cblxuaW50ZXJmYWNlIEhvb2tlZFRzY29uZmlnIHtcbiAgLyoqIGFic29sdXRlIHBhdGggb3IgcGF0aCByZWxhdGl2ZSB0byByb290IHBhdGgsIGFueSBwYXRoIHRoYXQgaXMgc3RvcmVkIGluIFJlZHV4IHN0b3JlLCB0aGUgYmV0dGVyIGl0IGlzIGluIGZvcm0gb2ZcbiAgICogcmVsYXRpdmUgcGF0aCBvZiBSb290IHBhdGhcbiAgICovXG4gIHJlbFBhdGg6IHN0cmluZztcbiAgYmFzZVVybDogc3RyaW5nO1xuICBvcmlnaW5Kc29uOiBhbnk7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogRWRpdG9ySGVscGVyU3RhdGUgPSB7XG4gIHRzY29uZmlnQnlSZWxQYXRoOiBuZXcgTWFwKClcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2VkaXRvci1oZWxwZXInLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgY2xlYXJTeW1saW5rcyhzKSB7fSxcbiAgICBob29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdW5Ib29rVHNjb25maWcocywge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IHJlbGF0aXZlUGF0aChmaWxlKTtcbiAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5kZWxldGUocmVsUGF0aCk7XG4gICAgICB9XG4gICAgfSxcbiAgICB1bkhvb2tBbGwoKSB7fSxcbiAgICBjbGVhclN5bWxpbmtzRG9uZShTKSB7fVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuc3RhdGVGYWN0b3J5LmFkZEVwaWM8RWRpdG9ySGVscGVyU3RhdGU+KChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgbGV0IG5vTW9kdWxlU3ltbGluazogU2V0PHN0cmluZz47XG5cbiAgZnVuY3Rpb24gdXBkYXRlTm9kZU1vZHVsZVN5bWxpbmtzKHdzS2V5OiBzdHJpbmcpIHtcbiAgICBpZiAobm9Nb2R1bGVTeW1saW5rID09IG51bGwpIHtcbiAgICAgIG5vTW9kdWxlU3ltbGluayA9IG5ldyBTZXQoKTtcbiAgICAgIGZvciAoY29uc3QgcHJvakRpciBvZiBnZXRQa2dTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKSB7XG4gICAgICAgIGNvbnN0IHJvb3RQa2dKc29uID0gcmVxdWlyZShQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgcHJvakRpciwgJ3BhY2thZ2UuanNvbicpKSBhcyB7cGxpbms/OiB7bm9Nb2R1bGVTeW1saW5rPzogc3RyaW5nW119fTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgKHJvb3RQa2dKc29uLnBsaW5rPy5ub01vZHVsZVN5bWxpbmsgfHwgW10pLm1hcChpdGVtID0+IFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCBwcm9qRGlyLCBpdGVtKSkpIHtcbiAgICAgICAgICBub01vZHVsZVN5bWxpbmsuYWRkKGRpcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjdXJyV29ya3NwYWNlRGlyID0gd29ya3NwYWNlRGlyKHdzS2V5KTtcbiAgICBjb25zdCBzcmNQa2dzID0gcGFja2FnZXM0V29ya3NwYWNlKHdzS2V5LCBmYWxzZSk7XG4gICAgY29uc3Qgc3JjRGlyU2V0ID0gbmV3IFNldChBcnJheS5mcm9tKF9yZWNwLmFsbFNyY0RpcnMoKSlcbiAgICAgIC5tYXAoaXRlbSA9PiBpdGVtLnByb2pEaXIgPyBQYXRoLnJlc29sdmUoaXRlbS5wcm9qRGlyLCBpdGVtLnNyY0RpcikgOiBpdGVtLnNyY0RpcikpO1xuXG4gICAgcmV0dXJuIHJ4LmZyb20oc3JjUGtncykucGlwZShcbiAgICAgIG9wLm1hcChwa2cgPT4gcGtnLnJlYWxQYXRoKSxcbiAgICAgIG9wLmZpbHRlcihkaXIgPT4gc3JjRGlyU2V0LmhhcyhkaXIpICYmICFub01vZHVsZVN5bWxpbmsuaGFzKGRpcikpLFxuICAgICAgb3AucmVkdWNlPHN0cmluZywgc3RyaW5nW10+KChhY2MsIGl0ZW0pID0+IHtcbiAgICAgICAgYWNjLnB1c2goaXRlbSk7XG4gICAgICAgIHJldHVybiBhY2M7XG4gICAgICB9LCBbXSksXG4gICAgICBvcC5tZXJnZU1hcChkaXJzID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgICAgICAgIHMubm9kZU1vZHVsZVN5bWxpbmtzID0gbmV3IFNldCgpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGVzdERpciBvZiBkaXJzKSB7XG4gICAgICAgICAgICBzLm5vZGVNb2R1bGVTeW1saW5rcy5hZGQoUGF0aC5qb2luKGRlc3REaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGRpcnM7XG4gICAgICB9KSxcbiAgICAgIG9wLm1lcmdlTWFwKGRlc3REaXIgPT4ge1xuICAgICAgICByZXR1cm4gcngub2Yoe25hbWU6ICdub2RlX21vZHVsZXMnLCByZWFsUGF0aDogUGF0aC5qb2luKGN1cnJXb3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKX0pLnBpcGUoXG4gICAgICAgICAgc3ltYm9saWNMaW5rUGFja2FnZXMoZGVzdERpcilcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiByeC5tZXJnZShcbiAgICAvLyBwa2dTdG9yZSgpLnBpcGUoXG4gICAgLy8gICBmaWx0ZXJFZmZlY3QocyA9PiBbcy5saW5rZWREcmNwLCBzLmluc3RhbGxlZERyY3BdKSxcbiAgICAvLyAgIG9wLmZpbHRlcigoW2xpbmtlZERyY3AsIGluc3RhbGxlZERyY3BdKSA9PiBsaW5rZWREcmNwICE9IG51bGwgfHwgaW5zdGFsbGVkRHJjcCAhPSBudWxsKSxcbiAgICAvLyAgIG9wLm1hcCgoW2xpbmtlZERyY3AsIGluc3RhbGxlZERyY3BdKSA9PiB7XG4gICAgLy8gICAgIC8vIGlmIChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAvLyAgICAgY29uc3QgcGxpbmtEaXIgPSBsaW5rZWREcmNwIHx8IGluc3RhbGxlZERyY3AhO1xuICAgIC8vICAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKHBsaW5rRGlyLnJlYWxQYXRoLCAnd2ZoL3RzY29uZmlnLmpzb24nKTtcbiAgICAvLyAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyAgICAgaWYgKCFnZXRTdGF0ZSgpLnRzY29uZmlnQnlSZWxQYXRoLmhhcyhyZWxQYXRoKSkge1xuICAgIC8vICAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gZGlzcGF0Y2hlci5ob29rVHNjb25maWcoW2ZpbGVdKSk7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgIC8vICAgfSlcbiAgICAvLyApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5jbGVhclN5bWxpbmtzKSxcbiAgICAgIG9wLmNvbmNhdE1hcCgoKSA9PiB7XG4gICAgICAgIHJldHVybiByeC5mcm9tKF9yZWNwLmFsbFNyY0RpcnMoKSkucGlwZShcbiAgICAgICAgICBvcC5tYXAoaXRlbSA9PiBpdGVtLnByb2pEaXIgPyBQYXRoLnJlc29sdmUoaXRlbS5wcm9qRGlyLCBpdGVtLnNyY0RpciwgJ25vZGVfbW9kdWxlcycpIDpcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShpdGVtLnNyY0RpciwgJ25vZGVfbW9kdWxlcycpKSxcbiAgICAgICAgICBvcC5tZXJnZU1hcChkaXIgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHJ4LmZyb20oZnMucHJvbWlzZXMubHN0YXQoZGlyKSkucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKHN0YXQgPT4gc3RhdC5pc1N5bWJvbGljTGluaygpKSxcbiAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoc3RhdCA9PiB7XG4gICAgICAgICAgICAgICAgbG9nLmluZm8oJ3JlbW92ZSBzeW1saW5rICcgKyBkaXIpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmcy5wcm9taXNlcy51bmxpbmsoZGlyKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgb3AuZmluYWxpemUoKCkgPT4gZGlzcGF0Y2hlci5jbGVhclN5bWxpbmtzRG9uZSgpKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24ocGtnU2xpY2UuYWN0aW9ucy53b3Jrc3BhY2VDaGFuZ2VkKSxcbiAgICAgIG9wLmNvbmNhdE1hcChhc3luYyAoe3BheWxvYWQ6IHdzS2V5c30pID0+IHtcbiAgICAgICAgY29uc3Qgd3NEaXIgPSBpc0N3ZFdvcmtzcGFjZSgpID8gd29ya0RpciA6XG4gICAgICAgICAgZ2V0UGtnU3RhdGUoKS5jdXJyV29ya3NwYWNlID8gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBhd2FpdCB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpO1xuICAgICAgICBjb25zdCBsYXN0V3NLZXkgPSB3c0tleXNbd3NLZXlzLmxlbmd0aCAtIDFdO1xuICAgICAgICB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyhsYXN0V3NLZXkpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChBcnJheS5mcm9tKGdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGgudmFsdWVzKCkpXG4gICAgICAgICAgLm1hcChkYXRhID0+IHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKSkpO1xuICAgICAgICBhd2FpdCB1cGRhdGVOb2RlTW9kdWxlU3ltbGlua3MobGFzdFdzS2V5KS50b1Byb21pc2UoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIHJldHVybiBhY3Rpb24ucGF5bG9hZDtcbiAgICAgIH0pLFxuICAgICAgb3AubWVyZ2VNYXAoKGZpbGUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgY29uc3QgYmFja3VwRmlsZSA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG4gICAgICAgIGNvbnN0IGlzQmFja3VwRXhpc3RzID0gZnMuZXhpc3RzU3luYyhiYWNrdXBGaWxlKTtcbiAgICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSBpc0JhY2t1cEV4aXN0cyA/IGZzLnJlYWRGaWxlU3luYyhiYWNrdXBGaWxlLCAndXRmOCcpIDogZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZpbGVDb250ZW50KSBhcyB7Y29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnN9O1xuICAgICAgICBjb25zdCBkYXRhOiBIb29rZWRUc2NvbmZpZyA9IHtcbiAgICAgICAgICByZWxQYXRoLFxuICAgICAgICAgIGJhc2VVcmw6IGpzb24uY29tcGlsZXJPcHRpb25zLmJhc2VVcmwsXG4gICAgICAgICAgb3JpZ2luSnNvbjoganNvblxuICAgICAgICB9O1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5zZXQocmVsUGF0aCwgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghaXNCYWNrdXBFeGlzdHMpIHtcbiAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGZpbGVDb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHBheWxvYWQpLFxuICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGZpbGUpO1xuICAgICAgICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGFic0ZpbGUpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhiYWNrdXApKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ1JvbGwgYmFjazonLCBhYnNGaWxlKTtcbiAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuY29weUZpbGUoYmFja3VwLCBhYnNGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va0FsbCksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKEFycmF5LmZyb20oZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5rZXlzKCkpKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gY2F1Z2h0O1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGlvbiQodHlwZToga2V5b2YgKHR5cGVvZiBzbGljZSlbJ2Nhc2VSZWR1Y2VycyddKSB7XG4gIHJldHVybiBhY3Rpb24kT2Yoc3RhdGVGYWN0b3J5LCBzbGljZS5hY3Rpb25zW3R5cGVdIGFzIEFjdGlvbkNyZWF0b3JXaXRoUGF5bG9hZDxhbnksIGFueT4pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZnVuY3Rpb24gcmVsYXRpdmVQYXRoKGZpbGU6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyh3c0tleTogc3RyaW5nLCBpbmNsdWRlUHJvamVjdD86IHN0cmluZykge1xuICBjb25zdCB3cyA9IGdldFBrZ1N0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHdzS2V5KTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpIGFzIHR5cGVvZiBfcmVjcDtcblxuICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwcm9qZWN0RGlycyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qZWN0KSB7XG4gICAgd3JpdGVUc0NvbmZpZ0ZvclByb2ooaW5jbHVkZVByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgICAgd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvaik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvajogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcblxuICAgIGlmIChwYXRoVG9Qcm9qS2V5KHByb2opID09PSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3BQcm9qZWN0KSB7XG4gICAgICBpbmNsdWRlLnB1c2goJ21haW4vd2ZoLyoqLyoudHMnKTtcbiAgICB9XG4gICAgLy8gaW5jbHVkZS5wdXNoKCdkaXN0LyoucGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gY3JlYXRlVHNDb25maWcocHJvaiwgc3JjUm9vdERpciwgd29ya3NwYWNlRGlyLCB7fSxcbiAgICAgIC8vIHsnX3BhY2thZ2Utc2V0dGluZ3MnOiBbUGF0aC5yZWxhdGl2ZShwcm9qLCBwYWNrYWdlU2V0dGluZ0R0c0ZpbGVPZih3b3Jrc3BhY2VEaXIpKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICAvLyAgIC5yZXBsYWNlKC9cXC5kXFwudHMkLywgJycpXVxuICAgICAgLy8gfSxcbiAgICAgIGluY2x1ZGVcbiAgICApO1xuICAgIGNvbnN0IHByb2pEaXIgPSBQYXRoLnJlc29sdmUocHJvaik7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZTogUGF0aC5yZXNvbHZlKHByb2osICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1xuICAgICAgICBQYXRoLnJlbGF0aXZlKHByb2pEaXIsIHRzY29uZmlnRmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgICBdXG4gICAgfSk7XG4gICAgdXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdFBhdGgsICcuZ2l0aWdub3JlJyksXG4gICAgICBsaW5lczogW1BhdGgucmVsYXRpdmUocm9vdFBhdGgsIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyldXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKSB7XG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXk8UHJvbWlzZTx1bmtub3duPj4oZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLnNpemUpO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICAvLyBsZXQgYm9keSA9ICdleHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzQ29uZmlnIHtcXG4nO1xuICAgIGxldCBpbnRlcmZhY2VCb2R5ID0gJ2RlY2xhcmUgbW9kdWxlIFxcJ0B3ZmgvcGxpbmtcXCcge1xcbic7XG4gICAgaW50ZXJmYWNlQm9keSArPSAnICBpbnRlcmZhY2UgUGxpbmtTZXR0aW5ncyB7XFxuJztcbiAgICBmb3IgKGNvbnN0IFt0eXBlRmlsZSwgdHlwZUV4cG9ydCwgX2RlZmF1bHRGaWxlLCBfZGVmYXVsdEV4cG9ydCwgcGtnXSBvZiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdzS2V5KSkge1xuICAgICAgY29uc3QgdmFyTmFtZSA9IHBrZy5zaG9ydE5hbWUucmVwbGFjZSgvLShbXl0pL2csIChtYXRjaCwgZzE6IHN0cmluZykgPT4gZzEudG9VcHBlckNhc2UoKSk7XG4gICAgICBjb25zdCB0eXBlTmFtZSA9IHZhck5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YXJOYW1lLnNsaWNlKDEpO1xuICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyR7dHlwZUV4cG9ydH0gYXMgJHt0eXBlTmFtZX19IGZyb20gJyR7cGtnLm5hbWV9LyR7dHlwZUZpbGV9JztcXG5gO1xuICAgICAgLy8gYm9keSArPSBgICAnJHtwa2cubmFtZX0nOiAke3R5cGVOYW1lfTtcXG5gO1xuICAgICAgaW50ZXJmYWNlQm9keSArPSBgICAgICcke3BrZy5uYW1lfSc6ICR7dHlwZU5hbWV9O1xcbmA7XG4gICAgfVxuICAgIC8vIGJvZHkgKz0gJ31cXG4nO1xuICAgIGludGVyZmFjZUJvZHkgKz0gJyAgfVxcbn1cXG4nO1xuICAgIGNvbnN0IHR5cGVGaWxlID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCB3c0tleSwgJ25vZGVfbW9kdWxlcy9AdHlwZXMvcGxpbmstc2V0dGluZ3MvaW5kZXguZC50cycpO1xuICAgIGNvbnN0IHR5cGVGaWxlQ29udGVudCA9IGhlYWRlciArIGludGVyZmFjZUJvZHk7XG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUodHlwZUZpbGUpKTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmModHlwZUZpbGUpIHx8IGZzLnJlYWRGaWxlU3luYyh0eXBlRmlsZSwgJ3V0ZjgnKSAhPT0gdHlwZUZpbGVDb250ZW50KSB7XG4gICAgICBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUodHlwZUZpbGUsIHR5cGVGaWxlQ29udGVudCk7XG4gICAgICBsb2cuaW5mbygnd3JpdGUgcGFja2FnZSBzZXR0aW5nIGRlZmluaXRpb24gZmlsZScsIGNoYWxrLmJsdWUodHlwZUZpbGUpKTtcbiAgICB9XG5cbiAgICAvLyBjb25zdCBmaWxlID0gUGF0aC5qb2luKGRpc3REaXIsIHdzS2V5ICsgJy5wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbiAgICAvLyBsb2cuaW5mbyhgd3JpdGUgc2V0dGluZyBmaWxlOiAke2NoYWxrLmJsdWUoZmlsZSl9YCk7XG4gICAgLy8gZG9uZVtpKytdID0gZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUsIGhlYWRlciArIGJvZHkpO1xuICB9XG4gIHJldHVybiBQcm9taXNlLmFsbChkb25lKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa2dOYW1lIFxuICogQHBhcmFtIGRpciBcbiAqIEBwYXJhbSB3b3Jrc3BhY2UgXG4gKiBAcGFyYW0gZHJjcERpciBcbiAqIEBwYXJhbSBpbmNsdWRlIFxuICogQHJldHVybiB0c2NvbmZpZyBmaWxlIHBhdGhcbiAqL1xuZnVuY3Rpb24gY3JlYXRlVHNDb25maWcocHJvajogc3RyaW5nLCBzcmNSb290RGlyOiBzdHJpbmcsIHdvcmtzcGFjZTogc3RyaW5nLFxuICBleHRyYVBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfSxcbiAgaW5jbHVkZSA9IFsnKiovKi50cyddKSB7XG4gIGNvbnN0IHRzanNvbjoge2V4dGVuZHM/OiBzdHJpbmc7IGluY2x1ZGU6IHN0cmluZ1tdOyBleGNsdWRlOiBzdHJpbmdbXTsgY29tcGlsZXJPcHRpb25zPzogUGFydGlhbDxDb21waWxlck9wdGlvbnM+fSA9IHtcbiAgICBleHRlbmRzOiB1bmRlZmluZWQsXG4gICAgaW5jbHVkZSxcbiAgICBleGNsdWRlOiBbJyoqL25vZGVfbW9kdWxlcycsICcqKi9ub2RlX21vZHVsZXMuKiddXG4gIH07XG4gIGNvbnN0IGRyY3BEaXIgPSAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFBrZ1N0YXRlKCkuaW5zdGFsbGVkRHJjcCkhLnJlYWxQYXRoO1xuICAvLyB0c2pzb24uaW5jbHVkZSA9IFtdO1xuICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgUGF0aC5yZXNvbHZlKGRyY3BEaXIsICd3ZmgvdHNjb25maWctYmFzZS5qc29uJykpO1xuICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgfVxuICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBjb25zdCByb290RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNSb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgfHwgJy4nO1xuICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgIHJvb3REaXIsXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgc3RyaWN0OiB0cnVlLFxuICAgIGRlY2xhcmF0aW9uOiBmYWxzZSwgLy8gSW1wb3J0YW50OiB0byBhdm9pZCBodHRwczovL2dpdGh1Yi5jb20vbWljcm9zb2Z0L1R5cGVTY3JpcHQvaXNzdWVzLzI5ODA4I2lzc3VlY29tbWVudC00ODc4MTE4MzJcbiAgICBwYXRoczogZXh0cmFQYXRoTWFwcGluZ1xuICB9O1xuICBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgocHJvaiwgcHJvaiwgdHNqc29uLmNvbXBpbGVyT3B0aW9ucywge1xuICAgIHdvcmtzcGFjZURpcjogd29ya3NwYWNlLFxuICAgIGVuYWJsZVR5cGVSb290czogdHJ1ZSxcbiAgICByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gIH0pO1xuICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCB0c2pzb24pO1xuICByZXR1cm4gdHNjb25maWdGaWxlO1xufVxuXG5mdW5jdGlvbiBiYWNrdXBUc0NvbmZpZ09mKGZpbGU6IHN0cmluZykge1xuICAvLyBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgbSA9IC8oW14vXFxcXC5dKykoXFwuW14vXFxcXC5dKyk/JC8uZXhlYyhmaWxlKTtcbiAgY29uc3QgYmFja3VwRmlsZSA9IFBhdGgucmVzb2x2ZShmaWxlLnNsaWNlKDAsIGZpbGUubGVuZ3RoIC0gbSFbMF0ubGVuZ3RoKSArIG0hWzFdICsgJy5vcmlnJyArIG0hWzJdKTtcbiAgcmV0dXJuIGJhY2t1cEZpbGU7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YTogSG9va2VkVHNjb25maWcsIHdvcmtzcGFjZURpcj86IHN0cmluZykge1xuICBjb25zdCBmaWxlID0gUGF0aC5pc0Fic29sdXRlKGRhdGEucmVsUGF0aCkgPyBkYXRhLnJlbFBhdGggOlxuICAgIFBhdGgucmVzb2x2ZShyb290UGF0aCwgZGF0YS5yZWxQYXRoKTtcbiAgY29uc3QgdHNjb25maWdEaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG5cbiAgY29uc3QganNvbiA9IChmcy5leGlzdHNTeW5jKGJhY2t1cCkgP1xuICAgIEpTT04ucGFyc2UoYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoYmFja3VwLCAndXRmOCcpKSA6IF8uY2xvbmVEZWVwKGRhdGEub3JpZ2luSnNvbikgKSBhcyAge2NvbXBpbGVyT3B0aW9ucz86IENvbXBpbGVyT3B0aW9uc307XG5cbiAgLy8gaWYgKGpzb24uY29tcGlsZXJPcHRpb25zPy5wYXRocyAmJiBqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1snX3BhY2thZ2Utc2V0dGluZ3MnXSAhPSBudWxsKSB7XG4gIC8vICAgZGVsZXRlIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddO1xuICAvLyB9XG4gIGNvbnN0IG5ld0NvID0gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzY29uZmlnRGlyLCBkYXRhLmJhc2VVcmwsXG4gICAganNvbi5jb21waWxlck9wdGlvbnMgYXMgYW55LCB7XG4gICAgICB3b3Jrc3BhY2VEaXIsIGVuYWJsZVR5cGVSb290czogdHJ1ZSwgcmVhbFBhY2thZ2VQYXRoczogdHJ1ZVxuICAgIH0pO1xuICBqc29uLmNvbXBpbGVyT3B0aW9ucyA9IG5ld0NvO1xuICBsb2cuaW5mbygndXBkYXRlOicsIGNoYWxrLmJsdWUoZmlsZSkpO1xuICByZXR1cm4gZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICcgICcpKTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhzcmM6IGFueSwgdGFyZ2V0OiBhbnkpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgIGlmIChrZXkgPT09ICdjb21waWxlck9wdGlvbnMnKSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVyT3B0aW9ucylcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0YXJnZXQuY29tcGlsZXJPcHRpb25zLCBzcmMuY29tcGlsZXJPcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlOiBzdHJpbmcsIHRzY29uZmlnT3ZlcnJpZGVTcmM6IGFueSkge1xuICBpZiAoZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgICBjb25zdCBleGlzdGluZ0pzb24gPSB0cy5yZWFkQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsXG4gICAgICAoZmlsZSkgPT4ge1xuICAgICAgICBpZiAoUGF0aC5yZXNvbHZlKGZpbGUpID09PSB0c2NvbmZpZ0ZpbGUpXG4gICAgICAgICAgcmV0dXJuIGV4aXN0aW5nO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmV0dXJuIGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmLTgnKTtcbiAgICAgIH0pLmNvbmZpZztcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgdHNjb25maWc6ICcgKyBjaGFsay5ibHVlKHRzY29uZmlnRmlsZSkpO1xuICAgICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICBsb2cuZGVidWcoYCR7dHNjb25maWdGaWxlfSBpcyBub3QgY2hhbmdlZC5gKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oJ0NyZWF0ZSB0c2NvbmZpZzogJyArIGNoYWxrLmJsdWUodHNjb25maWdGaWxlKSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbi8vICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcblxuLy8gICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4vLyAgICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbi8vICAgY29uc3QgaWdDb25maWdGaWxlcyA9IHBrcy5tYXAocGsgPT4ge1xuLy8gICAgIC8vIGNvbW1vblBhdGhzWzBdID0gUGF0aC5yZXNvbHZlKHBrLnJlYWxQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4vLyAgICAgcmV0dXJuIGNyZWF0ZVRzQ29uZmlnKHBrLm5hbWUsIHBrLnJlYWxQYXRoLCB3b3Jrc3BhY2VEaXIsIGRyY3BEaXIpO1xuLy8gICB9KTtcblxuLy8gICBhcHBlbmRHaXRpZ25vcmUoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmluZEdpdEluZ29yZUZpbGUoc3RhcnREaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuLy8gICBsZXQgZGlyID0gc3RhcnREaXI7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShzdGFydERpciwgJy5naXRpZ25vcmUnKTtcbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuLy8gICAgICAgcmV0dXJuIHRlc3Q7XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHBhcmVudCA9IFBhdGguZGlybmFtZShkaXIpO1xuLy8gICAgIGlmIChwYXJlbnQgPT09IGRpcilcbi8vICAgICAgIHJldHVybiBudWxsO1xuLy8gICAgIGRpciA9IHBhcmVudDtcbi8vICAgfVxuLy8gfVxuIl19