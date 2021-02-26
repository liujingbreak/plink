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
exports.updateTsconfigFileForProjects = exports.getStore = exports.getState = exports.dispatcher = void 0;
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
// import Selector from './utils/ts-ast-query';
const log = log4js_1.default.getLogger('plink.editor-helper');
const { parse } = require('comment-json');
const initialState = { tsconfigByRelPath: new Map() };
const slice = store_1.stateFactory.newSlice({
    name: 'editor-helper',
    initialState,
    reducers: {
        hookTsconfig(s, { payload }) { },
        unHookTsconfig(s, { payload }) {
            const rootPath = misc_1.getRootDir();
            for (const file of payload) {
                const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
                s.tsconfigByRelPath.delete(relPath);
            }
        },
        unHookAll() { }
    }
});
store_1.stateFactory.addEpic((action$, state$) => {
    return rx.merge(action$.pipe(store_1.ofPayloadAction(package_mgr_1.slice.actions.createSymlinksForWorkspace), op.tap(({ payload: wsKeys }) => {
        writePackageSettingType();
        for (const wsKey of wsKeys) {
            updateTsconfigFileForProjects(wsKey);
        }
        const wsDir = package_mgr_1.isCwdWorkspace() ? process.cwd() :
            package_mgr_1.getState().currWorkspace ? path_1.default.resolve(misc_1.getRootDir(), package_mgr_1.getState().currWorkspace)
                : undefined;
        for (const data of getState().tsconfigByRelPath.values()) {
            updateHookedTsconfig(data, wsDir);
        }
    })), action$.pipe(store_1.ofPayloadAction(slice.actions.hookTsconfig), op.mergeMap(action => {
        const rootDir = misc_1.getRootDir();
        return action.payload.map(file => [file, rootDir]);
    }), op.mergeMap(([file, rootPath]) => {
        const relPath = path_1.default.relative(rootPath, file).replace(/\\/g, '/');
        const fileContent = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(fileContent);
        const data = {
            relPath,
            baseUrl: json.compilerOptions.baseUrl,
            originJson: json
        };
        exports.dispatcher._change(s => {
            s.tsconfigByRelPath.set(relPath, data);
        });
        const tsconfigDir = path_1.default.dirname(file);
        const backupFile = path_1.default.resolve(tsconfigDir, 'tsconfig.orig.json');
        if (!fs.existsSync(backupFile)) {
            fs.writeFileSync(backupFile, fileContent);
        }
        const wsDir = package_mgr_1.isCwdWorkspace() ? process.cwd() :
            package_mgr_1.getState().currWorkspace ? path_1.default.resolve(misc_1.getRootDir(), package_mgr_1.getState().currWorkspace)
                : undefined;
        return updateHookedTsconfig(data, wsDir);
    })), action$.pipe(store_1.ofPayloadAction(slice.actions.unHookTsconfig), op.mergeMap(({ payload }) => payload), op.mergeMap(file => {
        const tsconfigDir = path_1.default.dirname(file);
        const backupFile = path_1.default.resolve(tsconfigDir, 'tsconfig.orig.json');
        if (fs.existsSync(backupFile)) {
            const fileContent = fs.readFileSync(backupFile, 'utf8');
            return fs.promises.writeFile(file, fileContent);
        }
        return Promise.resolve();
    })), action$.pipe(store_1.ofPayloadAction(slice.actions.unHookAll), op.tap(() => {
        exports.dispatcher.unHookTsconfig(Array.from(getState().tsconfigByRelPath.keys()));
    }))).pipe(op.ignoreElements(), op.catchError((err, caught) => {
        log.error(err);
        return caught;
    }));
});
exports.dispatcher = store_1.stateFactory.bindActionCreators(slice);
function getState() {
    return store_1.stateFactory.sliceState(slice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(slice);
}
exports.getStore = getStore;
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
exports.updateTsconfigFileForProjects = updateTsconfigFileForProjects;
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
        // log.info(header + body);
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
    return path_1.default.resolve(workspaceDir, '.links/_package-settings.d.ts');
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
    // const pathMapping: {[key: string]: string[]} = {};
    // for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    //   const realDir = Path.relative(proj, realPath).replace(/\\/g, '/');
    //   pathMapping[name] = [realDir];
    //   pathMapping[name + '/*'] = [realDir + '/*'];
    // }
    // // if (pkgName !== '@wfh/plink') {
    // drcpDir = Path.relative(proj, drcpDir).replace(/\\/g, '/');
    // pathMapping['@wfh/plink'] = [drcpDir];
    // pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
    // // }
    // Object.assign(pathMapping, extraPathMapping);
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
        enableTypeRoots: true,
        workspaceDir: workspace != null ? workspace : undefined,
        realPackagePaths: true
    });
    const tsconfigFile = path_1.default.resolve(proj, 'tsconfig.json');
    writeTsConfigFile(tsconfigFile, tsjson);
    return tsconfigFile;
}
function updateHookedTsconfig(data, workspaceDir) {
    const file = path_1.default.resolve(misc_1.getRootDir(), data.relPath);
    const tsconfigDir = path_1.default.dirname(file);
    const json = lodash_1.default.cloneDeep(data.originJson);
    const newCo = package_list_helper_1.setTsCompilerOptForNodePath(tsconfigDir, data.baseUrl, json.compilerOptions, { workspaceDir, realPackagePaths: true });
    json.compilerOptions = newCo;
    log.info(file, 'is updated');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2VkaXRvci1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtDQUFrQztBQUNsQyw2Q0FBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLG9EQUE0QjtBQUM1QixnREFBd0I7QUFDeEIsMkVBQXdIO0FBQ3hILCtDQUN3QztBQUN4QyxtQ0FBd0Q7QUFFeEQsdUNBQWtFO0FBQ2xFLHFDQUFnRDtBQUNoRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBR3JDLCtDQUErQztBQUMvQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sRUFBQyxLQUFLLEVBQUMsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFjeEMsTUFBTSxZQUFZLEdBQXNCLEVBQUMsaUJBQWlCLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBQyxDQUFDO0FBRXZFLE1BQU0sS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ2xDLElBQUksRUFBRSxlQUFlO0lBQ3JCLFlBQVk7SUFDWixRQUFRLEVBQUU7UUFDUixZQUFZLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUEwQixJQUFHLENBQUM7UUFDdEQsY0FBYyxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBMEI7WUFDbEQsTUFBTSxRQUFRLEdBQUcsaUJBQVUsRUFBRSxDQUFDO1lBQzlCLEtBQUssTUFBTSxJQUFJLElBQUksT0FBTyxFQUFFO2dCQUMxQixNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FB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SSxVQUFVLEtBQUssUUFBUSxFQUFFO1lBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO1lBQ2xDLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQzFFO2FBQU07WUFDTCxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsWUFBWSxrQkFBa0IsQ0FBQyxDQUFDO1NBQzlDO0tBQ0Y7U0FBTTtRQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ25DLEVBQUUsQ0FBQyxhQUFhLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7S0FDakY7QUFDSCxDQUFDO0FBRUQsdUZBQXVGO0FBQ3ZGLHNFQUFzRTtBQUV0RSw4RUFBOEU7QUFDOUUsZ0VBQWdFO0FBRWhFLDBDQUEwQztBQUMxQyxxRUFBcUU7QUFDckUsMEVBQTBFO0FBQzFFLFFBQVE7QUFFUiwyREFBMkQ7QUFDM0QsSUFBSTtBQUVKLGdFQUFnRTtBQUNoRSx3QkFBd0I7QUFDeEIsbUJBQW1CO0FBQ25CLHlEQUF5RDtBQUN6RCxpQ0FBaUM7QUFDakMscUJBQXFCO0FBQ3JCLFFBQVE7QUFDUix3Q0FBd0M7QUFDeEMsMEJBQTBCO0FBQzFCLHFCQUFxQjtBQUNyQixvQkFBb0I7QUFDcEIsTUFBTTtBQUNOLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgsIHBhY2thZ2VzNFdvcmtzcGFjZUtleSwgQ29tcGlsZXJPcHRpb25zIH0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IGdldFByb2plY3RMaXN0LCBwYXRoVG9Qcm9qS2V5LCBnZXRTdGF0ZSBhcyBnZXRQa2dTdGF0ZSwgdXBkYXRlR2l0SWdub3Jlcywgc2xpY2UgYXMgcGtnU2xpY2UsXG4gIGlzQ3dkV29ya3NwYWNlIH0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4vc3RvcmUnO1xuaW1wb3J0ICogYXMgX3JlY3AgZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBjbG9zZXN0Q29tbW9uUGFyZW50RGlyLCBnZXRSb290RGlyIH0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCB7Z2V0UGFja2FnZVNldHRpbmdGaWxlc30gZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5cbi8vIGltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5lZGl0b3ItaGVscGVyJyk7XG5jb25zdCB7cGFyc2V9ID0gcmVxdWlyZSgnY29tbWVudC1qc29uJyk7XG5cbmludGVyZmFjZSBFZGl0b3JIZWxwZXJTdGF0ZSB7XG4gIC8qKiB0c2NvbmZpZyBmaWxlcyBzaG91bGQgYmUgY2hhbmdlZCBhY2NvcmRpbmcgdG8gbGlua2VkIHBhY2thZ2VzIHN0YXRlICovXG4gIHRzY29uZmlnQnlSZWxQYXRoOiBNYXA8c3RyaW5nLCBIb29rZWRUc2NvbmZpZz47XG59XG5cbmludGVyZmFjZSBIb29rZWRUc2NvbmZpZyB7XG4gIC8qKiBQYXRoIHJlbGF0aXZlIHRvIHJvb3QgcGF0aCAqL1xuICByZWxQYXRoOiBzdHJpbmc7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgb3JpZ2luSnNvbjogYW55O1xufVxuXG5jb25zdCBpbml0aWFsU3RhdGU6IEVkaXRvckhlbHBlclN0YXRlID0ge3RzY29uZmlnQnlSZWxQYXRoOiBuZXcgTWFwKCl9O1xuXG5jb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6ICdlZGl0b3ItaGVscGVyJyxcbiAgaW5pdGlhbFN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGhvb2tUc2NvbmZpZyhzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1bkhvb2tUc2NvbmZpZyhzLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBwYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIHMudHNjb25maWdCeVJlbFBhdGguZGVsZXRlKHJlbFBhdGgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgdW5Ib29rQWxsKCkge31cbiAgfVxufSk7XG5cbnN0YXRlRmFjdG9yeS5hZGRFcGljPEVkaXRvckhlbHBlclN0YXRlPigoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiByeC5tZXJnZShcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHBrZ1NsaWNlLmFjdGlvbnMuY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UpLFxuICAgICAgb3AudGFwKCh7cGF5bG9hZDogd3NLZXlzfSkgPT4ge1xuICAgICAgICB3cml0ZVBhY2thZ2VTZXR0aW5nVHlwZSgpO1xuICAgICAgICBmb3IgKGNvbnN0IHdzS2V5IG9mIHdzS2V5cykge1xuICAgICAgICAgIHVwZGF0ZVRzY29uZmlnRmlsZUZvclByb2plY3RzKHdzS2V5KTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB3c0RpciA9IGlzQ3dkV29ya3NwYWNlKCkgPyBwcm9jZXNzLmN3ZCgpIDpcbiAgICAgICAgICBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UgPyBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBnZXRQa2dTdGF0ZSgpLmN1cnJXb3Jrc3BhY2UhKVxuICAgICAgICAgIDogdW5kZWZpbmVkO1xuICAgICAgICBmb3IgKGNvbnN0IGRhdGEgb2YgZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC52YWx1ZXMoKSkge1xuICAgICAgICAgIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGEsIHdzRGlyKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5ob29rVHNjb25maWcpLFxuICAgICAgb3AubWVyZ2VNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3Qgcm9vdERpciA9IGdldFJvb3REaXIoKTtcbiAgICAgICAgcmV0dXJuIGFjdGlvbi5wYXlsb2FkLm1hcChmaWxlID0+IFtmaWxlLCByb290RGlyXSk7XG4gICAgICB9KSxcbiAgICAgIG9wLm1lcmdlTWFwKChbZmlsZSwgcm9vdFBhdGhdKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3RQYXRoLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGNvbnN0IGZpbGVDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGNvbnN0IGpzb246IHtjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9uc30gPSBKU09OLnBhcnNlKGZpbGVDb250ZW50KTtcblxuICAgICAgICBjb25zdCBkYXRhOiBIb29rZWRUc2NvbmZpZyA9IHtcbiAgICAgICAgICByZWxQYXRoLFxuICAgICAgICAgIGJhc2VVcmw6IGpzb24uY29tcGlsZXJPcHRpb25zLmJhc2VVcmwsXG4gICAgICAgICAgb3JpZ2luSnNvbjoganNvblxuICAgICAgICB9O1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgICAgICAgcy50c2NvbmZpZ0J5UmVsUGF0aC5zZXQocmVsUGF0aCwgZGF0YSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKHRzY29uZmlnRGlyLCAndHNjb25maWcub3JpZy5qc29uJyk7XG4gICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhiYWNrdXBGaWxlKSkge1xuICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoYmFja3VwRmlsZSwgZmlsZUNvbnRlbnQpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHdzRGlyID0gaXNDd2RXb3Jrc3BhY2UoKSA/IHByb2Nlc3MuY3dkKCkgOlxuICAgICAgICAgIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSA/IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGdldFBrZ1N0YXRlKCkuY3VycldvcmtzcGFjZSEpXG4gICAgICAgICAgOiB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiB1cGRhdGVIb29rZWRUc2NvbmZpZyhkYXRhLCB3c0Rpcik7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va1RzY29uZmlnKSxcbiAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHBheWxvYWQpLFxuICAgICAgb3AubWVyZ2VNYXAoZmlsZSA9PiB7XG4gICAgICAgIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgICAgICBjb25zdCBiYWNrdXBGaWxlID0gUGF0aC5yZXNvbHZlKHRzY29uZmlnRGlyLCAndHNjb25maWcub3JpZy5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGJhY2t1cEZpbGUpKSB7XG4gICAgICAgICAgY29uc3QgZmlsZUNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoYmFja3VwRmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGUsIGZpbGVDb250ZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVuSG9va0FsbCksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBkaXNwYXRjaGVyLnVuSG9va1RzY29uZmlnKEFycmF5LmZyb20oZ2V0U3RhdGUoKS50c2NvbmZpZ0J5UmVsUGF0aC5rZXlzKCkpKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIGNhdWdodCkgPT4ge1xuICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gY2F1Z2h0O1xuICAgIH0pXG4gICk7XG59KTtcbmV4cG9ydCBjb25zdCBkaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlVHNjb25maWdGaWxlRm9yUHJvamVjdHMod3NLZXk6IHN0cmluZywgaW5jbHVkZVByb2plY3Q/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3MgPSBnZXRQa2dTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcbiAgY29uc3Qgd29ya3NwYWNlRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IHJlY2lwZU1hbmFnZXI6IHR5cGVvZiBfcmVjcCA9IHJlcXVpcmUoJy4vcmVjaXBlLW1hbmFnZXInKTtcblxuICBjb25zdCBzcmNSb290RGlyID0gY2xvc2VzdENvbW1vblBhcmVudERpcihwcm9qZWN0RGlycyk7XG5cbiAgaWYgKGluY2x1ZGVQcm9qZWN0KSB7XG4gICAgd3JpdGVUc0NvbmZpZ0ZvclByb2ooaW5jbHVkZVByb2plY3QpO1xuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcHJvaiBvZiBwcm9qZWN0RGlycykge1xuICAgICAgd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvaik7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gd3JpdGVUc0NvbmZpZ0ZvclByb2oocHJvajogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5jbHVkZTogc3RyaW5nW10gPSBbXTtcbiAgICByZWNpcGVNYW5hZ2VyLmVhY2hSZWNpcGVTcmMocHJvaiwgKHNyY0Rpcjogc3RyaW5nKSA9PiB7XG4gICAgICBsZXQgaW5jbHVkZURpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgc3JjRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICBpZiAoaW5jbHVkZURpciAmJiBpbmNsdWRlRGlyICE9PSAnLycpXG4gICAgICAgIGluY2x1ZGVEaXIgKz0gJy8nO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50cycpO1xuICAgICAgaW5jbHVkZS5wdXNoKGluY2x1ZGVEaXIgKyAnKiovKi50c3gnKTtcbiAgICB9KTtcblxuICAgIGlmIChwYXRoVG9Qcm9qS2V5KHByb2opID09PSBnZXRQa2dTdGF0ZSgpLmxpbmtlZERyY3BQcm9qZWN0KSB7XG4gICAgICBpbmNsdWRlLnB1c2goJ21haW4vd2ZoLyoqLyoudHMnKTtcbiAgICB9XG4gICAgaW5jbHVkZS5wdXNoKCdkaXN0LyouZC50cycpO1xuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IGNyZWF0ZVRzQ29uZmlnKHByb2osIHNyY1Jvb3REaXIsIHdvcmtzcGFjZURpciwge30sXG4gICAgICAvLyB7J19wYWNrYWdlLXNldHRpbmdzJzogW1BhdGgucmVsYXRpdmUocHJvaiwgcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyKSlcbiAgICAgIC8vICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgLy8gICAucmVwbGFjZSgvXFwuZFxcLnRzJC8sICcnKV1cbiAgICAgIC8vIH0sXG4gICAgICBpbmNsdWRlXG4gICAgKTtcbiAgICBjb25zdCBwcm9qRGlyID0gUGF0aC5yZXNvbHZlKHByb2opO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe2ZpbGU6IFBhdGgucmVzb2x2ZShwcm9qLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtcbiAgICAgICAgUGF0aC5yZWxhdGl2ZShwcm9qRGlyLCB0c2NvbmZpZ0ZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgICAgXVxuICAgIH0pO1xuICAgIHVwZGF0ZUdpdElnbm9yZXMoe1xuICAgICAgZmlsZTogUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICd0eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyldXG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gd3JpdGVQYWNrYWdlU2V0dGluZ1R5cGUoKSB7XG4gIGNvbnN0IGRvbmUgPSBuZXcgQXJyYXkoZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLnNpemUpO1xuICBsZXQgaSA9IDA7XG4gIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0UGtnU3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGxldCBoZWFkZXIgPSAnJztcbiAgICBsZXQgYm9keSA9ICdleHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzQ29uZmlnIHtcXG4nO1xuICAgIGZvciAoY29uc3QgW3R5cGVGaWxlLCB0eXBlRXhwb3J0LCBfZGVmYXVsdEZpbGUsIF9kZWZhdWx0RXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod3NLZXkpKSB7XG4gICAgICBjb25zdCB2YXJOYW1lID0gcGtnLnNob3J0TmFtZS5yZXBsYWNlKC8tKFteXSkvZywgKG1hdGNoLCBnMSkgPT4gZzEudG9VcHBlckNhc2UoKSk7XG4gICAgICBjb25zdCB0eXBlTmFtZSA9IHZhck5hbWUuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB2YXJOYW1lLnNsaWNlKDEpO1xuICAgICAgaGVhZGVyICs9IGBpbXBvcnQgeyR7dHlwZUV4cG9ydH0gYXMgJHt0eXBlTmFtZX19IGZyb20gJyR7cGtnLm5hbWV9LyR7dHlwZUZpbGV9JztcXG5gO1xuICAgICAgYm9keSArPSBgICAnJHtwa2cubmFtZX0nOiAke3R5cGVOYW1lfTtcXG5gO1xuICAgIH1cbiAgICBib2R5ICs9ICd9XFxuJztcbiAgICAvLyBsb2cuaW5mbyhoZWFkZXIgKyBib2R5KTtcbiAgICBjb25zdCB3b3Jrc3BhY2VEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSk7XG4gICAgY29uc3QgZmlsZSA9IHBhY2thZ2VTZXR0aW5nRHRzRmlsZU9mKHdvcmtzcGFjZURpcik7XG4gICAgbG9nLmluZm8oYHdyaXRlIGZpbGU6ICR7ZmlsZX1gKTtcbiAgICBkb25lW2krK10gPSBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgaGVhZGVyICsgYm9keSk7XG4gICAgY29uc3QgZGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuICAgIGNvbnN0IHNyY1Jvb3REaXIgPSBjbG9zZXN0Q29tbW9uUGFyZW50RGlyKFtcbiAgICAgIGRpcixcbiAgICAgIGNsb3Nlc3RDb21tb25QYXJlbnREaXIoQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKS5tYXAocGtnID0+IHBrZy5yZWFsUGF0aCkpXG4gICAgXSk7XG4gICAgY3JlYXRlVHNDb25maWcoZGlyLCBzcmNSb290RGlyLCB3b3Jrc3BhY2VEaXIsIHt9LCBbJyoudHMnXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFja2FnZVNldHRpbmdEdHNGaWxlT2Yod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICcubGlua3MvX3BhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrZ05hbWUgXG4gKiBAcGFyYW0gZGlyIFxuICogQHBhcmFtIHdvcmtzcGFjZSBcbiAqIEBwYXJhbSBkcmNwRGlyIFxuICogQHBhcmFtIGluY2x1ZGUgXG4gKiBAcmV0dXJuIHRzY29uZmlnIGZpbGUgcGF0aFxuICovXG5mdW5jdGlvbiBjcmVhdGVUc0NvbmZpZyhwcm9qOiBzdHJpbmcsIHNyY1Jvb3REaXI6IHN0cmluZywgd29ya3NwYWNlOiBzdHJpbmcgfCBudWxsLFxuICBleHRyYVBhdGhNYXBwaW5nOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfSxcbiAgaW5jbHVkZSA9IFsnKiovKi50cyddKSB7XG4gIGNvbnN0IHRzanNvbjogYW55ID0ge1xuICAgIGV4dGVuZHM6IG51bGwsXG4gICAgaW5jbHVkZVxuICB9O1xuICBjb25zdCBkcmNwRGlyID0gKGdldFBrZ1N0YXRlKCkubGlua2VkRHJjcCB8fCBnZXRQa2dTdGF0ZSgpLmluc3RhbGxlZERyY3ApIS5yZWFsUGF0aDtcbiAgLy8gdHNqc29uLmluY2x1ZGUgPSBbXTtcbiAgdHNqc29uLmV4dGVuZHMgPSBQYXRoLnJlbGF0aXZlKHByb2osIFBhdGgucmVzb2x2ZShkcmNwRGlyLCAnd2ZoL3RzY29uZmlnLWJhc2UuanNvbicpKTtcbiAgaWYgKCFQYXRoLmlzQWJzb2x1dGUodHNqc29uLmV4dGVuZHMpICYmICF0c2pzb24uZXh0ZW5kcy5zdGFydHNXaXRoKCcuLicpKSB7XG4gICAgdHNqc29uLmV4dGVuZHMgPSAnLi8nICsgdHNqc29uLmV4dGVuZHM7XG4gIH1cbiAgdHNqc29uLmV4dGVuZHMgPSB0c2pzb24uZXh0ZW5kcy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLy8gY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblxuICAvLyBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAvLyAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIC8vICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gIC8vICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgLy8gfVxuXG4gIC8vIC8vIGlmIChwa2dOYW1lICE9PSAnQHdmaC9wbGluaycpIHtcbiAgLy8gZHJjcERpciA9IFBhdGgucmVsYXRpdmUocHJvaiwgZHJjcERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyBwYXRoTWFwcGluZ1snQHdmaC9wbGluayddID0gW2RyY3BEaXJdO1xuICAvLyBwYXRoTWFwcGluZ1snQHdmaC9wbGluay8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICAvLyAvLyB9XG4gIC8vIE9iamVjdC5hc3NpZ24ocGF0aE1hcHBpbmcsIGV4dHJhUGF0aE1hcHBpbmcpO1xuXG4gIGNvbnN0IHJvb3REaXIgPSBQYXRoLnJlbGF0aXZlKHByb2osIHNyY1Jvb3REaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSB8fCAnLic7XG4gIHRzanNvbi5jb21waWxlck9wdGlvbnMgPSB7XG4gICAgcm9vdERpcixcbiAgICAgIC8vIG5vUmVzb2x2ZTogdHJ1ZSwgLy8gRG8gbm90IGFkZCB0aGlzLCBWQyB3aWxsIG5vdCBiZSBhYmxlIHRvIHVuZGVyc3RhbmQgcnhqcyBtb2R1bGVcbiAgICBza2lwTGliQ2hlY2s6IGZhbHNlLFxuICAgIGpzeDogJ3ByZXNlcnZlJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICBkZWNsYXJhdGlvbjogZmFsc2UsIC8vIEltcG9ydGFudDogdG8gYXZvaWQgaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L2lzc3Vlcy8yOTgwOCNpc3N1ZWNvbW1lbnQtNDg3ODExODMyXG4gICAgcGF0aHM6IGV4dHJhUGF0aE1hcHBpbmdcbiAgfTtcbiAgc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKHByb2osIHByb2osIHRzanNvbi5jb21waWxlck9wdGlvbnMsIHtcbiAgICBlbmFibGVUeXBlUm9vdHM6IHRydWUsXG4gICAgd29ya3NwYWNlRGlyOiB3b3Jrc3BhY2UgIT0gbnVsbCA/IHdvcmtzcGFjZSA6IHVuZGVmaW5lZCxcbiAgICByZWFsUGFja2FnZVBhdGhzOiB0cnVlXG4gIH0pO1xuICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBQYXRoLnJlc29sdmUocHJvaiwgJ3RzY29uZmlnLmpzb24nKTtcbiAgd3JpdGVUc0NvbmZpZ0ZpbGUodHNjb25maWdGaWxlLCB0c2pzb24pO1xuICByZXR1cm4gdHNjb25maWdGaWxlO1xufVxuXG5cbmZ1bmN0aW9uIHVwZGF0ZUhvb2tlZFRzY29uZmlnKGRhdGE6IEhvb2tlZFRzY29uZmlnLCB3b3Jrc3BhY2VEaXI/OiBzdHJpbmcpIHtcbiAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGRhdGEucmVsUGF0aCk7XG4gIGNvbnN0IHRzY29uZmlnRGlyID0gUGF0aC5kaXJuYW1lKGZpbGUpO1xuXG4gIGNvbnN0IGpzb24gPSBfLmNsb25lRGVlcChkYXRhLm9yaWdpbkpzb24pO1xuICBjb25zdCBuZXdDbyA9IHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aCh0c2NvbmZpZ0RpciwgZGF0YS5iYXNlVXJsLFxuICAgIGpzb24uY29tcGlsZXJPcHRpb25zLCB7d29ya3NwYWNlRGlyLCByZWFsUGFja2FnZVBhdGhzOiB0cnVlfSk7XG4gIGpzb24uY29tcGlsZXJPcHRpb25zID0gbmV3Q287XG4gIGxvZy5pbmZvKGZpbGUsICdpcyB1cGRhdGVkJyk7XG4gIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZSwgSlNPTi5zdHJpbmdpZnkoanNvbiwgbnVsbCwgJyAgJykpO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZVRzQ29uZmlnKHNyYzogYW55LCB0YXJnZXQ6IGFueSkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhzcmMpKSB7XG4gICAgaWYgKGtleSA9PT0gJ2NvbXBpbGVyT3B0aW9ucycpIHtcbiAgICAgIGlmICh0YXJnZXQuY29tcGlsZXJPcHRpb25zKVxuICAgICAgICBPYmplY3QuYXNzaWduKHRhcmdldC5jb21waWxlck9wdGlvbnMsIHNyYy5jb21waWxlck9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB3cml0ZVRzQ29uZmlnRmlsZSh0c2NvbmZpZ0ZpbGU6IHN0cmluZywgdHNjb25maWdPdmVycmlkZVNyYzogYW55KSB7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRzY29uZmlnRmlsZSkpIHtcbiAgICBjb25zdCBleGlzdGluZyA9IGZzLnJlYWRGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsICd1dGY4Jyk7XG4gICAgY29uc3QgZXhpc3RpbmdKc29uID0gcGFyc2UoZXhpc3RpbmcpO1xuICAgIG92ZXJyaWRlVHNDb25maWcodHNjb25maWdPdmVycmlkZVNyYywgZXhpc3RpbmdKc29uKTtcbiAgICBjb25zdCBuZXdKc29uU3RyID0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdKc29uLCBudWxsLCAnICAnKTtcbiAgICBpZiAobmV3SnNvblN0ciAhPT0gZXhpc3RpbmcpIHtcbiAgICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgdHNjb25maWdGaWxlKTtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmModHNjb25maWdGaWxlLCBKU09OLnN0cmluZ2lmeShleGlzdGluZ0pzb24sIG51bGwsICcgICcpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9nLmRlYnVnKGAke3RzY29uZmlnRmlsZX0gaXMgbm90IGNoYW5nZWQuYCk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKCdDcmVhdGUgJyArIHRzY29uZmlnRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlU3luYyh0c2NvbmZpZ0ZpbGUsIEpTT04uc3RyaW5naWZ5KHRzY29uZmlnT3ZlcnJpZGVTcmMsIG51bGwsICcgICcpKTtcbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2Uod29ya3NwYWNlRGlyOiBzdHJpbmcsIHBrczogUGFja2FnZUluZm9bXSxcbi8vICAgb25HaXRJZ25vcmVGaWxlVXBkYXRlOiAoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcblxuLy8gICBjb25zdCBkcmNwRGlyID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5yZWFsUGF0aCA6XG4vLyAgICAgUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG5cbi8vICAgY29uc3QgaWdDb25maWdGaWxlcyA9IHBrcy5tYXAocGsgPT4ge1xuLy8gICAgIC8vIGNvbW1vblBhdGhzWzBdID0gUGF0aC5yZXNvbHZlKHBrLnJlYWxQYXRoLCAnbm9kZV9tb2R1bGVzJyk7XG4vLyAgICAgcmV0dXJuIGNyZWF0ZVRzQ29uZmlnKHBrLm5hbWUsIHBrLnJlYWxQYXRoLCB3b3Jrc3BhY2VEaXIsIGRyY3BEaXIpO1xuLy8gICB9KTtcblxuLy8gICBhcHBlbmRHaXRpZ25vcmUoaWdDb25maWdGaWxlcywgb25HaXRJZ25vcmVGaWxlVXBkYXRlKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZmluZEdpdEluZ29yZUZpbGUoc3RhcnREaXI6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuLy8gICBsZXQgZGlyID0gc3RhcnREaXI7XG4vLyAgIHdoaWxlICh0cnVlKSB7XG4vLyAgICAgY29uc3QgdGVzdCA9IFBhdGgucmVzb2x2ZShzdGFydERpciwgJy5naXRpZ25vcmUnKTtcbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyh0ZXN0KSkge1xuLy8gICAgICAgcmV0dXJuIHRlc3Q7XG4vLyAgICAgfVxuLy8gICAgIGNvbnN0IHBhcmVudCA9IFBhdGguZGlybmFtZShkaXIpO1xuLy8gICAgIGlmIChwYXJlbnQgPT09IGRpcilcbi8vICAgICAgIHJldHVybiBudWxsO1xuLy8gICAgIGRpciA9IHBhcmVudDtcbi8vICAgfVxuLy8gfVxuIl19