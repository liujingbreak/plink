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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILCtDQUN3QztBQUN4QyxtQ0FBd0Q7QUFFeEQsdUNBQWtFO0FBQ2xFLHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBSXJDLE1BQU0sRUFBQyxjQUFjLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRy9FLCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDeEMsTUFBTSxRQUFRLEdBQUcsaUJBQVUsRUFBRSxDQUFDO0FBZTlCLE1BQU0sWUFBWSxHQUFzQjtJQUN0QyxpQkFBaUIsRUFBRSxJQUFJLEdBQUcsRUFBRTtDQUM3QixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDbEMsSUFBSSxFQUFFLGVBQWU7SUFDckIsWUFBWTtJQUNaLFFBQVEsRUFBRTtRQUNSLFlBQVksQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCLElBQUcsQ0FBQztRQUN0RCxjQUFjLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQjtZQUNsRCxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtnQkFDMUIsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQztRQUNELFNBQVMsS0FBSSxDQUFDO0tBQ2Y7Q0FDRixDQUFDLENBQUM7QUFFVSxRQUFBLFVBQVUsR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRWpFLG9CQUFZLENBQUMsT0FBTyxDQUFvQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUMxRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3RCLElBQUksc0JBQVcsRUFBRSxDQUFDLFVBQVUsRUFBRTtZQUM1QixNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFXLEVBQUUsQ0FBQyxVQUFXLENBQUMsUUFBUSxFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDbkYsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUM5QyxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO1NBQ0Y7UUFDRCxHQUFHLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLEVBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBZSxDQUFDLG1CQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEVBQ2xFLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUMsRUFBRSxFQUFFO1FBQzNCLE1BQU0sS0FBSyxHQUFHLDRCQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDeEMsc0JBQVcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsc0JBQVcsRUFBRSxDQUFDLGFBQWMsQ0FBQztnQkFDdEYsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNkLHVCQUF1QixFQUFFLENBQUM7UUFDMUIsa0NBQWtDO1FBQ2xDLGlHQUFpRztRQUNqRywyQkFBMkI7UUFDM0Isc0ZBQXNGO1FBQ3RGLG9CQUFvQjtRQUNwQixxRUFBcUU7UUFDckUsZUFBZTtRQUNmLElBQUk7UUFDSiw2QkFBNkIsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELEtBQUssTUFBTSxJQUFJLElBQUksUUFBUSxFQUFFLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDeEQsS0FBSyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEM7SUFDSCxDQUFDLENBQUMsQ0FDSCxFQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsdUJBQWUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUN0RCxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ25CLE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUN4QixDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDbkIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsRSxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sV0FBVyxHQUFHLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3pHLE1BQU0sSUFBSSxHQUF1QyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sSUFBSSxHQUFtQjtZQUMzQixPQUFPO1lBQ1AsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTztZQUNyQyxVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUFDO1FBQ0Ysa0JBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckIsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQ25CLEVBQUUsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1NBQzNDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsNEJBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN4QyxzQkFBVyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxzQkFBVyxFQUFFLENBQUMsYUFBYyxDQUFDO2dCQUN0RixDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ2QsT0FBTyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQ0gsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUFlLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFDeEQsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUNuQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2pCLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUN6QixHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNoQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztTQUM5QztRQUNELE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNCLENBQUMsQ0FBQyxDQUNILEVBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBZSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQ25ELEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1FBQ1Ysa0JBQVUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsY0FBYyxFQUFFLEVBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDNUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNmLE9BQU8sTUFBTSxDQUFDO0lBQ2hCLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBUyxZQUFZLENBQUMsSUFBWTtJQUNoQyxPQUFPLGNBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDM0QsQ0FBQztBQUVELFNBQVMsNkJBQTZCLENBQUMsS0FBYSxFQUFFLGNBQXVCO0lBQzNFLE1BQU0sRUFBRSxHQUFHLHNCQUFXLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9DLElBQUksRUFBRSxJQUFJLElBQUk7UUFDWixPQUFPO0lBRVQsTUFBTSxXQUFXLEdBQUcsNEJBQWMsRUFBRSxDQUFDO0lBQ3JDLE1BQU0sWUFBWSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRXZELE1BQU0sYUFBYSxHQUFpQixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUVoRSxNQUFNLFVBQVUsR0FBRyw2QkFBc0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUV2RCxJQUFJLGNBQWMsRUFBRTtRQUNsQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztLQUN0QztTQUFNO1FBQ0wsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUU7WUFDOUIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDNUI7S0FDRjtJQUVELFNBQVMsb0JBQW9CLENBQUMsSUFBWTtRQUN4QyxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsYUFBYSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtZQUNuRCxJQUFJLFVBQVUsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ2pFLElBQUksVUFBVSxJQUFJLFVBQVUsS0FBSyxHQUFHO2dCQUNsQyxVQUFVLElBQUksR0FBRyxDQUFDO1lBQ3BCLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQ3hDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSwyQkFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLHNCQUFXLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRTtZQUMzRCxPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7U0FDbEM7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzVCLE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxFQUFFO1FBQ3BFLG9GQUFvRjtRQUNwRix5QkFBeUI7UUFDekIsOEJBQThCO1FBQzlCLEtBQUs7UUFDTCxPQUFPLENBQ1IsQ0FBQztRQUNGLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsOEJBQWdCLENBQUMsRUFBQyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDO1lBQ3RELEtBQUssRUFBRTtnQkFDTCxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQzthQUN6RDtTQUNGLENBQUMsQ0FBQztRQUNILDhCQUFnQixDQUFDO1lBQ2YsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLFlBQVksQ0FBQztZQUM5QyxLQUFLLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFVLEVBQUUsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDOUYsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUM7QUFFRCxTQUFTLHVCQUF1QjtJQUM5QixNQUFNLElBQUksR0FBRyxJQUFJLEtBQUssQ0FBQyxzQkFBVyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RELElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLEtBQUssTUFBTSxLQUFLLElBQUksc0JBQVcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUNuRCxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7UUFDaEIsSUFBSSxJQUFJLEdBQUcscUNBQXFDLENBQUM7UUFDakQsS0FBSyxNQUFNLENBQUMsUUFBUSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxJQUFJLCtCQUFzQixDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3JHLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQzFGLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRSxNQUFNLElBQUksV0FBVyxVQUFVLE9BQU8sUUFBUSxXQUFXLEdBQUcsQ0FBQyxJQUFJLElBQUksUUFBUSxNQUFNLENBQUM7WUFDcEYsSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxRQUFRLEtBQUssQ0FBQztTQUMzQztRQUNELElBQUksSUFBSSxLQUFLLENBQUM7UUFDZCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLElBQUksR0FBRyx1QkFBdUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNuRCxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsTUFBTSxVQUFVLEdBQUcsNkJBQXNCLENBQUM7WUFDeEMsR0FBRztZQUNILDZCQUFzQixDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsMkNBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7U0FDMUYsQ0FBQyxDQUFDO1FBQ0gsY0FBYyxDQUFDLEdBQUcsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDN0Q7QUFDSCxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxZQUFvQjtJQUNuRCxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLGNBQWMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0FBQzlFLENBQUM7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILFNBQVMsY0FBYyxDQUFDLElBQVksRUFBRSxVQUFrQixFQUFFLFNBQXdCLEVBQ2hGLGdCQUE0QyxFQUM1QyxPQUFPLEdBQUcsQ0FBQyxTQUFTLENBQUM7SUFDckIsTUFBTSxNQUFNLEdBQVE7UUFDbEIsT0FBTyxFQUFFLElBQUk7UUFDYixPQUFPO0tBQ1IsQ0FBQztJQUNGLE1BQU0sT0FBTyxHQUFHLENBQUMsc0JBQVcsRUFBRSxDQUFDLFVBQVUsSUFBSSxzQkFBVyxFQUFFLENBQUMsYUFBYSxDQUFFLENBQUMsUUFBUSxDQUFDO0lBQ3BGLHVCQUF1QjtJQUN2QixNQUFNLENBQUMsT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUN0RixJQUFJLENBQUMsY0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN4RSxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO0tBQ3hDO0lBQ0QsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFFcEQsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7SUFDM0UsTUFBTSxDQUFDLGVBQWUsR0FBRztRQUN2QixPQUFPO1FBQ0wscUZBQXFGO1FBQ3ZGLFlBQVksRUFBRSxLQUFLO1FBQ25CLEdBQUcsRUFBRSxVQUFVO1FBQ2YsTUFBTSxFQUFFLFFBQVE7UUFDaEIsTUFBTSxFQUFFLFVBQVU7UUFDbEIsV0FBVyxFQUFFLEtBQUs7UUFDbEIsS0FBSyxFQUFFLGdCQUFnQjtLQUN4QixDQUFDO0lBQ0YsaURBQTJCLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsZUFBZSxFQUFFO1FBQzlELFlBQVksRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVM7UUFDdkQsZUFBZSxFQUFFLElBQUk7UUFDckIsZ0JBQWdCLEVBQUUsSUFBSTtLQUN2QixDQUFDLENBQUM7SUFDSCxNQUFNLFlBQVksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztJQUN6RCxpQkFBaUIsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEMsT0FBTyxZQUFZLENBQUM7QUFDdEIsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBWTtJQUNwQywwQ0FBMEM7SUFDMUMsTUFBTSxDQUFDLEdBQUcsMEJBQTBCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hELE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLE9BQU8sR0FBRyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNyRyxPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDO0FBR0QsU0FBZSxvQkFBb0IsQ0FBQyxJQUFvQixFQUFFLFlBQXFCOzs7UUFDN0UsTUFBTSxJQUFJLEdBQUcsY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6RCxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QyxNQUFNLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBMEMsQ0FBQztRQUVsSSxJQUFJLE9BQUEsSUFBSSxDQUFDLGVBQWUsMENBQUUsS0FBSyxLQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLElBQUksSUFBSSxFQUFFO1lBQzFGLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztTQUN4RDtRQUNELE1BQU0sS0FBSyxHQUFHLGlEQUEyQixDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUNqRSxJQUFJLENBQUMsZUFBc0IsRUFBRTtZQUMzQixZQUFZLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJO1NBQzVELENBQUMsQ0FBQztRQUNMLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO1FBQzdCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzdCLE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDOztDQUN0RTtBQUVELFNBQVMsZ0JBQWdCLENBQUMsR0FBUSxFQUFFLE1BQVc7SUFDN0MsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2xDLElBQUksR0FBRyxLQUFLLGlCQUFpQixFQUFFO1lBQzdCLElBQUksTUFBTSxDQUFDLGVBQWU7Z0JBQ3hCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUM7U0FDOUQ7YUFBTTtZQUNMLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDeEI7S0FDRjtBQUNILENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLFlBQW9CLEVBQUUsbUJBQXdCO0lBQ3ZFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUMvQixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN2RCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsZ0JBQWdCLENBQUMsbUJBQW1CLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDcEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzVELElBQUksVUFBVSxLQUFLLFFBQVEsRUFBRTtZQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztZQUNsQyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztTQUMxRTthQUFNO1lBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLFlBQVksa0JBQWtCLENBQUMsQ0FBQztTQUM5QztLQUNGO1NBQU07UUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUNuQyxFQUFFLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQ2pGO0FBQ0gsQ0FBQztBQUVELHVGQUF1RjtBQUN2RixzRUFBc0U7QUFFdEUsOEVBQThFO0FBQzlFLGdFQUFnRTtBQUVoRSwwQ0FBMEM7QUFDMUMscUVBQXFFO0FBQ3JFLDBFQUEwRTtBQUMxRSxRQUFRO0FBRVIsMkRBQTJEO0FBQzNELElBQUk7QUFFSixnRUFBZ0U7QUFDaEUsd0JBQXdCO0FBQ3hCLG1CQUFtQjtBQUNuQix5REFBeUQ7QUFDekQsaUNBQWlDO0FBQ2pDLHFCQUFxQjtBQUNyQixRQUFRO0FBQ1Isd0NBQXdDO0FBQ3hDLDBCQUEwQjtBQUMxQixxQkFBcUI7QUFDckIsb0JBQW9CO0FBQ3BCLE1BQU07QUFDTixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoLCBwYWNrYWdlczRXb3Jrc3BhY2VLZXksIENvbXBpbGVyT3B0aW9ucyB9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgeyBnZXRQcm9qZWN0TGlzdCwgcGF0aFRvUHJvaktleSwgZ2V0U3RhdGUgYXMgZ2V0UGtnU3RhdGUsIHVwZGF0ZUdpdElnbm9yZXMsIHNsaWNlIGFzIHBrZ1NsaWNlLFxuICBpc0N3ZFdvcmtzcGFjZSB9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuL3N0b3JlJztcbmltcG9ydCAqIGFzIF9yZWNwIGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHsgY2xvc2VzdENvbW1vblBhcmVudERpciwgZ2V0Um9vdERpciB9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2dldFBhY2thZ2VTZXR0aW5nRmlsZXN9IGZyb20gJy4vY29uZmlnJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi9ub2RlLXBhdGgnO1xuXG5jb25zdCB7c3ltbGlua0Rpck5hbWUsIHdvcmtEaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cblxuLy8gaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmVkaXRvci1oZWxwZXInKTtcbmNvbnN0IHtwYXJzZX0gPSByZXF1aXJlKCdjb21tZW50LWpzb24nKTtcbmNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuaW50ZXJmYWNlIEVkaXRvckhlbHBlclN0YXRlIHtcbiAgLyoqIHRzY29uZmlnIGZpbGVzIHNob3VsZCBiZSBjaGFuZ2VkIGFjY29yZGluZyB0byBsaW5rZWQgcGFja2FnZXMgc3RhdGUgKi9cbiAgdHNjb25maWdCeVJlbFBhdGg6IE1hcDxzdHJpbmcsIEhvb2tlZFRzY29uZmlnPjtcbn1cblxuaW50ZXJmYWNlIEhvb2tlZFRzY29uZmlnIHtcbiAgLyoqIGFic29sdXRlIHBhdGggb3IgcGF0aCByZWxhdGl2ZSB0byByb290IHBhdGgsIGFueSBwYXRoIHRoYXQgaXMgc3RvcmVkIGluIFJlZHV4IHN0b3JlLCB0aGUgYmV0dGVyIGl0IGlzIGluIGZvcm0gb2ZcbiAgICogcmVsYXRpdmUgcGF0aCBvZiBSb290IHBhdGhcbiAgICovXG4gIHJlbFBhdGg6IHN0cmluZztcbiAgYmFzZVVybDogc3RyaW5nO1xuICBvcmlnaW5Kc29uOiBhbnk7XG59XG5cbmNvbnN0IGluaXRpYWxTdGF0ZTogRWRpdG9ySGVscGVyU3RhdGUgPSB7XG4gIHRzY29uZmlnQnlSZWxQYXRoOiBuZXcgTWFwKClcbn07XG5cbmNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogJ2VkaXRvci1oZWxwZXInLFxuICBpbml0aWFsU3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgaG9va1RzY29uZmlnKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIHVuSG9va1RzY29uZmlnKHMsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBwYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSByZWxhdGl2ZVBhdGgoZmlsZSk7XG4gICAgICAgIHMudHNjb25maWdCeVJlbFBhdGguZGVsZXRlKHJlbFBhdGgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdW5Ib29rQWxsKCkge31cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPEVkaXRvckhlbHBlclN0YXRlPigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBuZXcgcnguT2JzZXJ2YWJsZShzdWIgPT4ge1xuICAgICAgaWYgKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpO1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBpZiAoIWdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGguaGFzKHJlbFBhdGgpKSB7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBkaXNwYXRjaGVyLmhvb2tUc2NvbmZpZyhbZmlsZV0pKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihwa2dTbGljZS5hY3Rpb25zLndvcmtzcGFjZUJhdGNoQ2hhbmdlZCksXG4gICAgICBvcC50YXAoKHtwYXlsb2FkOiB3c0tleXN9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHdyaXRlUGFja2FnZVNldHRpbmdUeXBlKCk7XG4gICAgICAgIC8vIGlmIChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgLy8gICBjb25zdCBwbGlua1RzY29uZmlnID0gUGF0aC5yZXNvbHZlKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGgsICd3ZmgvdHNjb25maWcuanNvbicpO1xuICAgICAgICAvLyAgIHVwZGF0ZUhvb2tlZFRzY29uZmlnKHtcbiAgICAgICAgLy8gICAgIHJlbFBhdGg6IFBhdGgucmVzb2x2ZShnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AhLnJlYWxQYXRoLCAnd2ZoL3RzY29uZmlnLmpzb24nKSxcbiAgICAgICAgLy8gICAgIGJhc2VVcmw6ICcuJyxcbiAgICAgICAgLy8gICAgIG9yaWdpbkpzb246IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBsaW5rVHNjb25maWcsICd1dGY4JykpXG4gICAgICAgIC8vICAgfSwgd3NEaXIpO1xuICAgICAgICAvLyB9XG4gICAgICAgIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5c1t3c0tleXMubGVuZ3RoIC0gMV0pO1xuICAgICAgICBmb3IgKGNvbnN0IGRhdGEgb2YgZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC52YWx1ZXMoKSkge1xuICAgICAgICAgIHZvaWQgdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YSwgd3NEaXIpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmhvb2tUc2NvbmZpZyksXG4gICAgICBvcC5tZXJnZU1hcChhY3Rpb24gPT4ge1xuICAgICAgICByZXR1cm4gYWN0aW9uLnBheWxvYWQ7XG4gICAgICB9KSxcbiAgICAgIG9wLm1lcmdlTWFwKChmaWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbnN0IGJhY2t1cEZpbGUgPSBiYWNrdXBUc0NvbmZpZ09mKGZpbGUpO1xuICAgICAgICBjb25zdCBpc0JhY2t1cEV4aXN0cyA9IGZzLmV4aXN0c1N5bmMoYmFja3VwRmlsZSk7XG4gICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gaXNCYWNrdXBFeGlzdHMgPyBmcy5yZWFkRmlsZVN5bmMoYmFja3VwRmlsZSwgJ3V0ZjgnKSA6IGZzLnJlYWRGaWxlU3luYyhmaWxlLCAndXRmOCcpO1xuICAgICAgICBjb25zdCBqc29uOiB7Y29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnN9ID0gSlNPTi5wYXJzZShmaWxlQ29udGVudCk7XG4gICAgICAgIGNvbnN0IGRhdGE6IEhvb2tlZFRzY29uZmlnID0ge1xuICAgICAgICAgIHJlbFBhdGgsXG4gICAgICAgICAgYmFzZVVybDoganNvbi5jb21waWxlck9wdGlvbnMuYmFzZVVybCxcbiAgICAgICAgICBvcmlnaW5Kc29uOiBqc29uXG4gICAgICAgIH07XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICAgICAgICBzLnRzY29uZmlnQnlSZWxQYXRoLnNldChyZWxQYXRoLCBkYXRhKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKCFpc0JhY2t1cEV4aXN0cykge1xuICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgZmlsZUNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHdvcmtEaXIgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHBheWxvYWQpLFxuICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIGZpbGUpO1xuICAgICAgICBjb25zdCBiYWNrdXAgPSBiYWNrdXBUc0NvbmZpZ09mKGFic0ZpbGUpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhiYWNrdXApKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ1JvbGwgYmFjazonLCBhYnNGaWxlKTtcbiAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuY29weUZpbGUoYmFja3VwLCBhYnNGaWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va0FsbCksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKEFycmF5LmZyb20oZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5rZXlzKCkpKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gY2F1Z2h0O1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmZ1bmN0aW9uIHJlbGF0aXZlUGF0aChmaWxlOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVsYXRpdmUocm9vdFBhdGgsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXk6IHN0cmluZywgaW5jbHVkZVByb2plY3Q/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3MgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwcm9qZWN0RGlycyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qZWN0KSB7XG4gICAgd3JpdGVUc0NvbmZpZ0ZvclByb2ooaW5jbHVkZVByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgICAgd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvaik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvajogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcblxuICAgIGlmIChwYXRoVG9Qcm9qS2V5KHByb2opID09PSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3BQcm9qZWN0KSB7XG4gICAgICBpbmNsdWRlLnB1c2goJ21haW4vd2ZoLyoqLyoudHMnKTtcbiAgICB9XG4gICAgaW5jbHVkZS5wdXNoKCdkaXN0LyouZC50cycpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKHByb2osIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sXG4gICAgICAvLyB7J19wYWNrYWdlLXNldHRpbmdzJzogW1BhdGgucmVsYXRpdmUocHJvaiwgcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyKSlcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKV1cbiAgICAgIC8vIH0sXG4gICAgICBpbmNsdWRlXG4gICAgKTtcbiAgICBjb25zdCBwcm9qRGlyID0gUGF0aC5yZXNvbHZlKHByb2opO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGU6IFBhdGgucmVzb2x2ZShwcm9qLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCB0c2NvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgXVxuICAgIH0pO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe1xuICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyldXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKSB7XG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXkoZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLnNpemUpO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICBsZXQgYm9keSA9ICdleHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzQ29uZmlnIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMTogc3RyaW5nKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gdmFyTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhck5hbWUuc2xpY2UoMSk7XG4gICAgICBoZWFkZXIgKz0gYGltcG9ydCB7JHt0eXBlRXhwb3J0fSBhcyAke3R5cGVOYW1lfX0gZnJvbSAnJHtwa2cubmFtZX0vJHt0eXBlRmlsZX0nO1xcbmA7XG4gICAgICBib2R5ICs9IGAgICcke3BrZy5uYW1lfSc6ICR7dHlwZU5hbWV9O1xcbmA7XG4gICAgfVxuICAgIGJvZHkgKz0gJ31cXG4nO1xuICAgIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzS2V5KTtcbiAgICBjb25zdCBmaWxlID0gcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyKTtcbiAgICBsb2cuaW5mbyhgd3JpdGUgZmlsZTogJHtmaWxlfWApO1xuICAgIGRvbmVbaSsrXSA9IGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBoZWFkZXIgKyBib2R5KTtcbiAgICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgY29uc3Qgc3JjUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoW1xuICAgICAgZGlyLFxuICAgICAgY2xvc2VzdENvbW1vblBhcmVudERpcihBcnJheS5mcm9tKHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpLm1hcChwa2cgPT4gcGtnLnJlYWxQYXRoKSlcbiAgICBdKTtcbiAgICBjcmVhdGVUc0NvbmZpZyhkaXIsIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sIFsnKi50cyddKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYWNrYWdlU2V0dGluZ0R0c0ZpbGVPZih3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgc3ltbGlua0Rpck5hbWUsICdfcGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtnTmFtZSBcbiAqIEBwYXJhbSBkaXIgXG4gKiBAcGFyYW0gd29ya3NwYWNlIFxuICogQHBhcmFtIGRyY3BEaXIgXG4gKiBAcGFyYW0gaW5jbHVkZSBcbiAqIEByZXR1cm4gdHNjb25maWcgZmlsZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHByb2o6IHN0cmluZywgc3JjUm9vdERpcjogc3RyaW5nLCB3b3Jrc3BhY2U6IHN0cmluZyB8IG51bGwsXG4gIGV4dHJhUGF0aE1hcHBpbmc6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119LFxuICBpbmNsdWRlID0gWycqKi8qLnRzJ10pIHtcbiAgY29uc3QgdHNqc29uOiBhbnkgPSB7XG4gICAgZXh0ZW5kczogbnVsbCxcbiAgICBpbmNsdWRlXG4gIH07XG4gIGNvbnN0IGRyY3BEaXIgPSAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFBrZ1N0YXRlKCkuaW5zdGFsbGVkRHJjcCkhLnJlYWxQYXRoO1xuICAvLyB0c2pzb24uaW5jbHVkZSA9IFtdO1xuICB0c2pzb24uZXh0ZW5kcyA9IFBhdGgucmVsYXRpdmUocHJvaiwgUGF0aC5yZXNvbHZlKGRyY3BEaXIsICd3ZmgvdHNjb25maWctYmFzZS5qc29uJykpO1xuICBpZiAoIVBhdGguaXNBYnNvbHV0ZSh0c2pzb24uZXh0ZW5kcykgJiYgIXRzanNvbi5leHRlbmRzLnN0YXJ0c1dpdGgoJy4uJykpIHtcbiAgICB0c2pzb24uZXh0ZW5kcyA9ICcuLycgKyB0c2pzb24uZXh0ZW5kcztcbiAgfVxuICB0c2pzb24uZXh0ZW5kcyA9IHRzanNvbi5leHRlbmRzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBjb25zdCByb290RGlyID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBzcmNSb290RGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgfHwgJy4nO1xuICB0c2pzb24uY29tcGlsZXJPcHRpb25zID0ge1xuICAgIHJvb3REaXIsXG4gICAgICAvLyBub1Jlc29sdmU6IHRydWUsIC8vIERvIG5vdCBhZGQgdGhpcywgVkMgd2lsbCBub3QgYmUgYWJsZSB0byB1bmRlcnN0YW5kIHJ4anMgbW9kdWxlXG4gICAgc2tpcExpYkNoZWNrOiBmYWxzZSxcbiAgICBqc3g6ICdwcmVzZXJ2ZScsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBleHRyYVBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UgIT0gbnVsbCA/IHdvcmtzcGFjZSA6IHVuZGVmaW5lZCxcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgcmVhbFBhY2thZ2VQYXRoczogdHJ1ZVxuICB9KTtcbiAgY29uc3QgdHNjb25maWdGaWxlID0gUGF0aC5yZXNvbHZlKHByb2osICd0c2NvbmZpZy5qc29uJyk7XG4gIHdyaXRlVHNDb25maWdGaWxlKHRzY29uZmlnRmlsZSwgdHNqc29uKTtcbiAgcmV0dXJuIHRzY29uZmlnRmlsZTtcbn1cblxuZnVuY3Rpb24gYmFja3VwVHNDb25maWdPZihmaWxlOiBzdHJpbmcpIHtcbiAgLy8gY29uc3QgdHNjb25maWdEaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gIGNvbnN0IG0gPSAvKFteL1xcXFwuXSspKFxcLlteL1xcXFwuXSspPyQvLmV4ZWMoZmlsZSk7XG4gIGNvbnN0IGJhY2t1cEZpbGUgPSBQYXRoLnJlc29sdmUoZmlsZS5zbGljZSgwLCBmaWxlLmxlbmd0aCAtIG0hWzBdLmxlbmd0aCkgKyBtIVsxXSArICcub3JpZycgKyBtIVsyXSk7XG4gIHJldHVybiBiYWNrdXBGaWxlO1xufVxuXG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGE6IEhvb2tlZFRzY29uZmlnLCB3b3Jrc3BhY2VEaXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgZmlsZSA9IFBhdGguaXNBYnNvbHV0ZShkYXRhLnJlbFBhdGgpID8gZGF0YS5yZWxQYXRoIDpcbiAgICBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBkYXRhLnJlbFBhdGgpO1xuICBjb25zdCB0c2NvbmZpZ0RpciA9IFBhdGguZGlybmFtZShmaWxlKTtcbiAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcblxuICBjb25zdCBqc29uID0gKGZzLmV4aXN0c1N5bmMoYmFja3VwKSA/XG4gICAgSlNPTi5wYXJzZShhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShiYWNrdXAsICd1dGY4JykpIDogXy5jbG9uZURlZXAoZGF0YS5vcmlnaW5Kc29uKSApIGFzICB7Y29tcGlsZXJPcHRpb25zPzogQ29tcGlsZXJPcHRpb25zfTtcblxuICBpZiAoanNvbi5jb21waWxlck9wdGlvbnM/LnBhdGhzICYmIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddICE9IG51bGwpIHtcbiAgICBkZWxldGUganNvbi5jb21waWxlck9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ107XG4gIH1cbiAgY29uc3QgbmV3Q28gPSBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgodHNjb25maWdEaXIsIGRhdGEuYmFzZVVybCxcbiAgICBqc29uLmNvbXBpbGVyT3B0aW9ucyBhcyBhbnksIHtcbiAgICAgIHdvcmtzcGFjZURpciwgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gICAgfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKGZpbGUsICdpcyB1cGRhdGVkJyk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbi8vICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcblxuLy8gICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4vLyAgICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbi8vICAgY29uc3QgaWdDb25maWdGaWxlcyA9IHBrcy5tYXAocGsgPT4ge1xuLy8gICAgIC8vIGNvbW1vblBhdGhzWzBdID0gUGF0aC5yZXNvbHZlKHBrLnJlYWxQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4vLyAgICAgcmV0dXJuIGNyZWF0ZVRzQ29uZmlnKHBrLm5hbWUsIHBrLnJlYWxQYXRoLCB3b3Jrc3BhY2VEaXIsIGRyY3BEaXIpO1xuLy8gICB9KTtcblxuLy8gICBhcHBlbmRHaXRpZ25vcmUoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmluZEdpdEluZ29yZUZpbGUoc3RhcnREaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuLy8gICBsZXQgZGlyID0gc3RhcnREaXI7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShzdGFydERpciwgJy5naXRpZ25vcmUnKTtcbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuLy8gICAgICAgcmV0dXJuIHRlc3Q7XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHBhcmVudCA9IFBhdGguZGlybmFtZShkaXIpO1xuLy8gICAgIGlmIChwYXJlbnQgPT09IGRpcilcbi8vICAgICAgIHJldHVybiBudWxsO1xuLy8gICAgIGRpciA9IHBhcmVudDtcbi8vICAgfVxuLy8gfVxuIl19