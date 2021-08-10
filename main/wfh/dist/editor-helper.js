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
        if (package_mgr_1.getState().linkedDrcp) {
            const file = path_1.default.resolve(package_mgr_1.getState().linkedDrcp.realPath, 'wfh/tsconfig.json');
            const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
            if (!getState().tsconfigByRelPath.has(relPath)) {
                process.nextTick(() => exports.dispatcher.hookTsconfig([file]));
            }
        }
        sub.complete();
    }), pkgActionByTypes.workspaceBatchChanged.pipe(op.concatMap(({ payload: wsKeys }) => __awaiter(void 0, void 0, void 0, function* () {
        const wsDir = package_mgr_1.isCwdWorkspace() ? workDir :
            package_mgr_1.getState().currWorkspace ? path_1.default.resolve(misc_1.getRootDir(), package_mgr_1.getState().currWorkspace)
                : undefined;
        yield writePackageSettingType();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRCQUE0QjtBQUM1Qiw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILHVFQUE0RTtBQUM1RSwrQ0FDd0M7QUFDeEMsbUNBQXdEO0FBRXhELHVDQUFrRTtBQUNsRSxxQ0FBZ0Q7QUFDaEQseUNBQTJCO0FBQzNCLG1EQUFxQztBQUVyQyx1Q0FBc0M7QUFFdEMsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFHcEMsK0NBQStDO0FBQy9DLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDcEQsTUFBTSxFQUFDLEtBQUssRUFBQyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUN4QyxNQUFNLFFBQVEsR0FBRyxpQkFBVSxFQUFFLENBQUM7QUFlOUIsTUFBTSxZQUFZLEdBQXNCO0lBQ3RDLGlCQUFpQixFQUFFLElBQUksR0FBRyxFQUFFO0NBQzdCLENBQUM7QUFFRixNQUFNLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUNsQyxJQUFJLEVBQUUsZUFBZTtJQUNyQixZQUFZO0lBQ1osUUFBUSxFQUFFO1FBQ1IsWUFBWSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEIsSUFBRyxDQUFDO1FBQ3RELGNBQWMsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQTBCO1lBQ2xELEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUMxQixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25DLENBQUMsQ0FBQyxpQkFBaUIs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QUNwQixNQUFNO0FBQ04sSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIG1heC1sZW4gKi9cbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCwgcGFja2FnZXM0V29ya3NwYWNlS2V5LCBDb21waWxlck9wdGlvbnMgfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICcuLi8uLi9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9oZWxwZXInO1xuaW1wb3J0IHsgZ2V0UHJvamVjdExpc3QsIHBhdGhUb1Byb2pLZXksIGdldFN0YXRlIGFzIGdldFBrZ1N0YXRlLCB1cGRhdGVHaXRJZ25vcmVzLCBzbGljZSBhcyBwa2dTbGljZSxcbiAgaXNDd2RXb3Jrc3BhY2UgfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi9zdG9yZSc7XG5pbXBvcnQgKiBhcyBfcmVjcCBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7IGNsb3Nlc3RDb21tb25QYXJlbnREaXIsIGdldFJvb3REaXIgfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzfSBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5cbmNvbnN0IHt3b3JrRGlyLCBkaXN0RGlyfSA9IHBsaW5rRW52O1xuXG5cbi8vIGltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5lZGl0b3ItaGVscGVyJyk7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5jb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbmludGVyZmFjZSBFZGl0b3JIZWxwZXJTdGF0ZSB7XG4gIC8qKiB0c2NvbmZpZyBmaWxlcyBzaG91bGQgYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gbGlua2VkIHBhY2thZ2VzIHN0YXRlICovXG4gIHRzY29uZmlnQnlSZWxQYXRoOiBNYXA8c3RyaW5nLCBIb29rZWRUc2NvbmZpZz47XG59XG5cbmludGVyZmFjZSBIb29rZWRUc2NvbmZpZyB7XG4gIC8qKiBhYnNvbHV0ZSBwYXRoIG9yIHBhdGggcmVsYXRpdmUgdG8gcm9vdCBwYXRoLCBhbnkgcGF0aCB0aGF0IGlzIHN0b3JlZCBpbiBSZWR1eCBzdG9yZSwgdGhlIGJldHRlciBpdCBpcyBpbiBmb3JtIG9mXG4gICAqIHJlbGF0aXZlIHBhdGggb2YgUm9vdCBwYXRoXG4gICAqL1xuICByZWxQYXRoOiBzdHJpbmc7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgb3JpZ2luSnNvbjogYW55O1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IEVkaXRvckhlbHBlclN0YXRlID0ge1xuICB0c2NvbmZpZ0J5UmVsUGF0aDogbmV3IE1hcCgpXG59O1xuXG5jb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdlZGl0b3ItaGVscGVyJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGhvb2tUc2NvbmZpZyhzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1bkhvb2tUc2NvbmZpZyhzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgcGF5bG9hZCkge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gcmVsYXRpdmVQYXRoKGZpbGUpO1xuICAgICAgICBzLnRzY29uZmlnQnlSZWxQYXRoLmRlbGV0ZShyZWxQYXRoKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHVuSG9va0FsbCgpIHt9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgZGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYzxFZGl0b3JIZWxwZXJTdGF0ZT4oKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICBjb25zdCBwa2dBY3Rpb25CeVR5cGVzID0gY2FzdEJ5QWN0aW9uVHlwZShwa2dTbGljZS5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgIG5ldyByeC5PYnNlcnZhYmxlKHN1YiA9PiB7XG4gICAgICBpZiAoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwKSB7XG4gICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUoZ2V0UGtnU3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCwgJ3dmaC90c2NvbmZpZy5qc29uJyk7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGlmICghZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5oYXMocmVsUGF0aCkpIHtcbiAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGRpc3BhdGNoZXIuaG9va1RzY29uZmlnKFtmaWxlXSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBzdWIuY29tcGxldGUoKTtcbiAgICB9KSxcbiAgICBwa2dBY3Rpb25CeVR5cGVzLndvcmtzcGFjZUJhdGNoQ2hhbmdlZC5waXBlKFxuICAgICAgb3AuY29uY2F0TWFwKGFzeW5jICh7cGF5bG9hZDogd3NLZXlzfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBhd2FpdCB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpO1xuICAgICAgICB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JQcm9qZWN0cyh3c0tleXNbd3NLZXlzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgZm9yIChjb25zdCBkYXRhIG9mIGdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGgudmFsdWVzKCkpIHtcbiAgICAgICAgICB2b2lkIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5ob29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkO1xuICAgICAgfSksXG4gICAgICBvcC5tZXJnZU1hcCgoZmlsZSkgPT4ge1xuICAgICAgICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290UGF0aCwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBjb25zdCBiYWNrdXBGaWxlID0gYmFja3VwVHNDb25maWdPZihmaWxlKTtcbiAgICAgICAgY29uc3QgaXNCYWNrdXBFeGlzdHMgPSBmcy5leGlzdHNTeW5jKGJhY2t1cEZpbGUpO1xuICAgICAgICBjb25zdCBmaWxlQ29udGVudCA9IGlzQmFja3VwRXhpc3RzID8gZnMucmVhZEZpbGVTeW5jKGJhY2t1cEZpbGUsICd1dGY4JykgOiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgY29uc3QganNvbjoge2NvbXBpbGVyT3B0aW9uczogQ29tcGlsZXJPcHRpb25zfSA9IEpTT04ucGFyc2UoZmlsZUNvbnRlbnQpO1xuICAgICAgICBjb25zdCBkYXRhOiBIb29rZWRUc2NvbmZpZyA9IHtcbiAgICAgICAgICByZWxQYXRoLFxuICAgICAgICAgIGJhc2VVcmw6IGpzb24uY29tcGlsZXJPcHRpb25zLmJhc2VVcmwsXG4gICAgICAgICAgb3JpZ2luSnNvbjoganNvblxuICAgICAgICB9O1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5zZXQocmVsUGF0aCwgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICghaXNCYWNrdXBFeGlzdHMpIHtcbiAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGJhY2t1cEZpbGUsIGZpbGVDb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyB3b3JrRGlyIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gdXBkYXRlSG9va2VkVHNjb25maWcoZGF0YSwgd3NEaXIpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51bkhvb2tUc2NvbmZpZyksXG4gICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiBwYXlsb2FkKSxcbiAgICAgIG9wLm1lcmdlTWFwKGZpbGUgPT4ge1xuICAgICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCBmaWxlKTtcbiAgICAgICAgY29uc3QgYmFja3VwID0gYmFja3VwVHNDb25maWdPZihhYnNGaWxlKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoYmFja3VwKSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdSb2xsIGJhY2s6JywgYWJzRmlsZSk7XG4gICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLmNvcHlGaWxlKGJhY2t1cCwgYWJzRmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51bkhvb2tBbGwpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgZGlzcGF0Y2hlci51bkhvb2tUc2NvbmZpZyhBcnJheS5mcm9tKGdldFN0YXRlKCkudHNjb25maWdCeVJlbFBhdGgua2V5cygpKSk7XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBjYXVnaHQpID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgcmV0dXJuIGNhdWdodDtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZVBhdGgoZmlsZTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVQcm9qZWN0Pzogc3RyaW5nKSB7XG4gIGNvbnN0IHdzID0gZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG4gIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzS2V5KTtcblxuICBjb25zdCByZWNpcGVNYW5hZ2VyID0gcmVxdWlyZSgnLi9yZWNpcGUtbWFuYWdlcicpIGFzIHR5cGVvZiBfcmVjcDtcblxuICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwcm9qZWN0RGlycyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qZWN0KSB7XG4gICAgd3JpdGVUc0NvbmZpZ0ZvclByb2ooaW5jbHVkZVByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgICAgd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvaik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvajogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcblxuICAgIGlmIChwYXRoVG9Qcm9qS2V5KHByb2opID09PSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3BQcm9qZWN0KSB7XG4gICAgICBpbmNsdWRlLnB1c2goJ21haW4vd2ZoLyoqLyoudHMnKTtcbiAgICB9XG4gICAgaW5jbHVkZS5wdXNoKCdkaXN0LyouZC50cycpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKHByb2osIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sXG4gICAgICAvLyB7J19wYWNrYWdlLXNldHRpbmdzJzogW1BhdGgucmVsYXRpdmUocHJvaiwgcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyKSlcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKV1cbiAgICAgIC8vIH0sXG4gICAgICBpbmNsdWRlXG4gICAgKTtcbiAgICBjb25zdCBwcm9qRGlyID0gUGF0aC5yZXNvbHZlKHByb2opO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGU6IFBhdGgucmVzb2x2ZShwcm9qLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCB0c2NvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgXVxuICAgIH0pO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe1xuICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyldXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKSB7XG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXk8UHJvbWlzZTx1bmtub3duPj4oZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLnNpemUpO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICBsZXQgYm9keSA9ICdleHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzQ29uZmlnIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMTogc3RyaW5nKSA9PiBnMS50b1VwcGVyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IHR5cGVOYW1lID0gdmFyTmFtZS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHZhck5hbWUuc2xpY2UoMSk7XG4gICAgICBoZWFkZXIgKz0gYGltcG9ydCB7JHt0eXBlRXhwb3J0fSBhcyAke3R5cGVOYW1lfX0gZnJvbSAnJHtwa2cubmFtZX0vJHt0eXBlRmlsZX0nO1xcbmA7XG4gICAgICBib2R5ICs9IGAgICcke3BrZy5uYW1lfSc6ICR7dHlwZU5hbWV9O1xcbmA7XG4gICAgfVxuICAgIGJvZHkgKz0gJ31cXG4nO1xuICAgIGNvbnN0IHdvcmtzcGFjZURpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzS2V5KTtcbiAgICBjb25zdCBmaWxlID0gUGF0aC5qb2luKGRpc3REaXIsIHdzS2V5ICsgJy5wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbiAgICBsb2cuaW5mbyhgd3JpdGUgZmlsZTogJHtmaWxlfWApO1xuICAgIGRvbmVbaSsrXSA9IGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBoZWFkZXIgKyBib2R5KTtcbiAgICBjb25zdCBkaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gICAgY29uc3Qgc3JjUm9vdERpciA9IGNsb3Nlc3RDb21tb25QYXJlbnREaXIoW1xuICAgICAgZGlyLFxuICAgICAgY2xvc2VzdENvbW1vblBhcmVudERpcihBcnJheS5mcm9tKHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpLm1hcChwa2cgPT4gcGtnLnJlYWxQYXRoKSlcbiAgICBdKTtcbiAgICBjcmVhdGVUc0NvbmZpZyhkaXIsIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sIFsnKi50cyddKTtcbiAgfVxuICByZXR1cm4gUHJvbWlzZS5hbGwoZG9uZSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtnTmFtZSBcbiAqIEBwYXJhbSBkaXIgXG4gKiBAcGFyYW0gd29ya3NwYWNlIFxuICogQHBhcmFtIGRyY3BEaXIgXG4gKiBAcGFyYW0gaW5jbHVkZSBcbiAqIEByZXR1cm4gdHNjb25maWcgZmlsZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVRzQ29uZmlnKHByb2o6IHN0cmluZywgc3JjUm9vdERpcjogc3RyaW5nLCB3b3Jrc3BhY2U6IHN0cmluZyxcbiAgZXh0cmFQYXRoTWFwcGluZzoge1twYXRoOiBzdHJpbmddOiBzdHJpbmdbXX0sXG4gIGluY2x1ZGUgPSBbJyoqLyoudHMnXSkge1xuICBjb25zdCB0c2pzb246IGFueSA9IHtcbiAgICBleHRlbmRzOiBudWxsLFxuICAgIGluY2x1ZGVcbiAgfTtcbiAgY29uc3QgZHJjcERpciA9IChnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0UGtnU3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG4gIC8vIHRzanNvbi5pbmNsdWRlID0gW107XG4gIHRzanNvbi5leHRlbmRzID0gUGF0aC5yZWxhdGl2ZShwcm9qLCBQYXRoLnJlc29sdmUoZHJjcERpciwgJ3dmaC90c2NvbmZpZy1iYXNlLmpzb24nKSk7XG4gIGlmICghUGF0aC5pc0Fic29sdXRlKHRzanNvbi5leHRlbmRzKSAmJiAhdHNqc29uLmV4dGVuZHMuc3RhcnRzV2l0aCgnLi4nKSkge1xuICAgIHRzanNvbi5leHRlbmRzID0gJy4vJyArIHRzanNvbi5leHRlbmRzO1xuICB9XG4gIHRzanNvbi5leHRlbmRzID0gdHNqc29uLmV4dGVuZHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBzdHJpY3Q6IHRydWUsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLCAvLyBJbXBvcnRhbnQ6IHRvIGF2b2lkIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC9pc3N1ZXMvMjk4MDgjaXNzdWVjb21tZW50LTQ4NzgxMTgzMlxuICAgIHBhdGhzOiBleHRyYVBhdGhNYXBwaW5nXG4gIH07XG4gIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChwcm9qLCBwcm9qLCB0c2pzb24uY29tcGlsZXJPcHRpb25zLCB7XG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UsXG4gICAgZW5hYmxlVHlwZVJvb3RzOiB0cnVlLFxuICAgIHJlYWxQYWNrYWdlUGF0aHM6IHRydWVcbiAgfSk7XG4gIGNvbnN0IHRzY29uZmlnRmlsZSA9IFBhdGgucmVzb2x2ZShwcm9qLCAndHNjb25maWcuanNvbicpO1xuICB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGUsIHRzanNvbik7XG4gIHJldHVybiB0c2NvbmZpZ0ZpbGU7XG59XG5cbmZ1bmN0aW9uIGJhY2t1cFRzQ29uZmlnT2YoZmlsZTogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICBjb25zdCBtID0gLyhbXi9cXFxcLl0rKShcXC5bXi9cXFxcLl0rKT8kLy5leGVjKGZpbGUpO1xuICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKGZpbGUuc2xpY2UoMCwgZmlsZS5sZW5ndGggLSBtIVswXS5sZW5ndGgpICsgbSFbMV0gKyAnLm9yaWcnICsgbSFbMl0pO1xuICByZXR1cm4gYmFja3VwRmlsZTtcbn1cblxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhOiBIb29rZWRUc2NvbmZpZywgd29ya3NwYWNlRGlyPzogc3RyaW5nKSB7XG4gIGNvbnN0IGZpbGUgPSBQYXRoLmlzQWJzb2x1dGUoZGF0YS5yZWxQYXRoKSA/IGRhdGEucmVsUGF0aCA6XG4gICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZGF0YS5yZWxQYXRoKTtcbiAgY29uc3QgdHNjb25maWdEaXIgPSBQYXRoLmRpcm5hbWUoZmlsZSk7XG4gIGNvbnN0IGJhY2t1cCA9IGJhY2t1cFRzQ29uZmlnT2YoZmlsZSk7XG5cbiAgY29uc3QganNvbiA9IChmcy5leGlzdHNTeW5jKGJhY2t1cCkgP1xuICAgIEpTT04ucGFyc2UoYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoYmFja3VwLCAndXRmOCcpKSA6IF8uY2xvbmVEZWVwKGRhdGEub3JpZ2luSnNvbikgKSBhcyAge2NvbXBpbGVyT3B0aW9ucz86IENvbXBpbGVyT3B0aW9uc307XG5cbiAgaWYgKGpzb24uY29tcGlsZXJPcHRpb25zPy5wYXRocyAmJiBqc29uLmNvbXBpbGVyT3B0aW9ucy5wYXRoc1snX3BhY2thZ2Utc2V0dGluZ3MnXSAhPSBudWxsKSB7XG4gICAgZGVsZXRlIGpzb24uY29tcGlsZXJPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddO1xuICB9XG4gIGNvbnN0IG5ld0NvID0gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHRzY29uZmlnRGlyLCBkYXRhLmJhc2VVcmwsXG4gICAganNvbi5jb21waWxlck9wdGlvbnMgYXMgYW55LCB7XG4gICAgICB3b3Jrc3BhY2VEaXIsIGVuYWJsZVR5cGVSb290czogdHJ1ZSwgcmVhbFBhY2thZ2VQYXRoczogdHJ1ZVxuICAgIH0pO1xuICBqc29uLmNvbXBpbGVyT3B0aW9ucyA9IG5ld0NvO1xuICBsb2cuaW5mbyhmaWxlLCAnaXMgdXBkYXRlZCcpO1xuICByZXR1cm4gZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUsIEpTT04uc3RyaW5naWZ5KGpzb24sIG51bGwsICcgICcpKTtcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVUc0NvbmZpZyhzcmM6IGFueSwgdGFyZ2V0OiBhbnkpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoc3JjKSkge1xuICAgIGlmIChrZXkgPT09ICdjb21waWxlck9wdGlvbnMnKSB7XG4gICAgICBpZiAodGFyZ2V0LmNvbXBpbGVyT3B0aW9ucylcbiAgICAgICAgT2JqZWN0LmFzc2lnbih0YXJnZXQuY29tcGlsZXJPcHRpb25zLCBzcmMuY29tcGlsZXJPcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzcmNba2V5XTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlOiBzdHJpbmcsIHRzY29uZmlnT3ZlcnJpZGVTcmM6IGFueSkge1xuICBpZiAoZnMuZXhpc3RzU3luYyh0c2NvbmZpZ0ZpbGUpKSB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBmcy5yZWFkRmlsZVN5bmModHNjb25maWdGaWxlLCAndXRmOCcpO1xuICAgIGNvbnN0IGV4aXN0aW5nSnNvbiA9IHBhcnNlKGV4aXN0aW5nKTtcbiAgICBvdmVycmlkZVRzQ29uZmlnKHRzY29uZmlnT3ZlcnJpZGVTcmMsIGV4aXN0aW5nSnNvbik7XG4gICAgY29uc3QgbmV3SnNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nSnNvbiwgbnVsbCwgJyAgJyk7XG4gICAgaWYgKG5ld0pzb25TdHIgIT09IGV4aXN0aW5nKSB7XG4gICAgICBsb2cuaW5mbygnV3JpdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgICBmcy53cml0ZUZpbGVTeW5jKHRzY29uZmlnRmlsZSwgSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGxvZy5kZWJ1ZyhgJHt0c2NvbmZpZ0ZpbGV9IGlzIG5vdCBjaGFuZ2VkLmApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbygnQ3JlYXRlICcgKyB0c2NvbmZpZ0ZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeSh0c2NvbmZpZ092ZXJyaWRlU3JjLCBudWxsLCAnICAnKSk7XG4gIH1cbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHdvcmtzcGFjZURpcjogc3RyaW5nLCBwa3M6IFBhY2thZ2VJbmZvW10sXG4vLyAgIG9uR2l0SWdub3JlRmlsZVVwZGF0ZTogKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG5cbi8vICAgY29uc3QgZHJjcERpciA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEucmVhbFBhdGggOlxuLy8gICAgIFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuXG4vLyAgIGNvbnN0IGlnQ29uZmlnRmlsZXMgPSBwa3MubWFwKHBrID0+IHtcbi8vICAgICAvLyBjb21tb25QYXRoc1swXSA9IFBhdGgucmVzb2x2ZShway5yZWFsUGF0aCwgJ25vZGVfbW9kdWxlcycpO1xuLy8gICAgIHJldHVybiBjcmVhdGVUc0NvbmZpZyhway5uYW1lLCBway5yZWFsUGF0aCwgd29ya3NwYWNlRGlyLCBkcmNwRGlyKTtcbi8vICAgfSk7XG5cbi8vICAgYXBwZW5kR2l0aWdub3JlKGlnQ29uZmlnRmlsZXMsIG9uR2l0SWdub3JlRmlsZVVwZGF0ZSk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGZpbmRHaXRJbmdvcmVGaWxlKHN0YXJ0RGlyOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbi8vICAgbGV0IGRpciA9IHN0YXJ0RGlyO1xuLy8gICB3aGlsZSAodHJ1ZSkge1xuLy8gICAgIGNvbnN0IHRlc3QgPSBQYXRoLnJlc29sdmUoc3RhcnREaXIsICcuZ2l0aWdub3JlJyk7XG4vLyAgICAgaWYgKGZzLmV4aXN0c1N5bmModGVzdCkpIHtcbi8vICAgICAgIHJldHVybiB0ZXN0O1xuLy8gICAgIH1cbi8vICAgICBjb25zdCBwYXJlbnQgPSBQYXRoLmRpcm5hbWUoZGlyKTtcbi8vICAgICBpZiAocGFyZW50ID09PSBkaXIpXG4vLyAgICAgICByZXR1cm4gbnVsbDtcbi8vICAgICBkaXIgPSBwYXJlbnQ7XG4vLyAgIH1cbi8vIH1cbiJdfQ==