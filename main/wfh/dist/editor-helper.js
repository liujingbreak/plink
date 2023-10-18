"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
/* eslint-disable @typescript-eslint/no-unsafe-argument */
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
        const wsDir = (0, package_mgr_1.isCwdWorkspace)() ?
            workDir :
            (0, package_mgr_1.getState)().currWorkspace ?
                path_1.default.resolve(rootPath, (0, package_mgr_1.getState)().currWorkspace) :
                undefined;
        await writePackageSettingType();
        const lastWsKey = wsKeys[wsKeys.length - 1];
        updateTsconfigFileForProjects(lastWsKey);
        await Promise.all(Array.from(getState().tsconfigByRelPath.values())
            .map(data => updateHookedTsconfig(data, wsDir)));
        return updateNodeModuleSymlinks(lastWsKey);
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
        module: 'nodenext',
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
    const file = path_1.default.isAbsolute(data.relPath)
        ? data.relPath :
        path_1.default.resolve(rootPath, data.relPath);
    const tsconfigDir = path_1.default.dirname(file);
    const backup = backupTsConfigOf(file);
    const json = (fs.existsSync(backup) ?
        JSON.parse(await fs.promises.readFile(backup, 'utf8'))
        : lodash_1.default.cloneDeep(data.originJson));
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
//# sourceMappingURL=editor-helper.js.map