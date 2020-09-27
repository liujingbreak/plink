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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
exports.createPackageInfo = exports.listPackagesByProjects = exports.getProjectList = exports.listPackages = exports.getPackagesOfProjects = exports.workspaceKey = exports.pathToProjKey = exports.getStore = exports.getState = exports.actionDispatcher = exports.slice = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const operators_2 = require("rxjs/operators");
const utils_1 = require("../cmd/utils");
const config_1 = __importDefault(require("../config"));
const dependency_hoister_1 = require("../dependency-hoister");
const editor_helper_1 = require("../editor-helper");
const log_config_1 = __importDefault(require("../log-config"));
const package_utils_1 = require("../package-utils");
const process_utils_1 = require("../process-utils");
const process_utils_2 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
const misc_1 = require("../utils/misc");
const symlinks_1 = __importStar(require("../utils/symlinks"));
const { symlinkDir } = JSON.parse(process.env.__plink);
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    inited: false,
    workspaces: new Map(),
    project2Packages: new Map(),
    srcPackages: new Map(),
    gitIgnores: {},
    linkedDrcp: misc_1.isDrcpSymlink ?
        createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), 'node_modules/dr-comp-package/package.json'), false, misc_1.getRootDir())
        : null,
    workspaceUpdateChecksum: 0
};
exports.slice = store_1.stateFactory.newSlice({
    name: NS,
    initialState: state,
    reducers: {
        /** Do this action after any linked package is removed or added  */
        initRootDir(d, action) {
        },
        /** Check and install dependency, if there is linked package used in more than one workspace,
         * to switch between different workspace */
        updateWorkspace(d, action) {
        },
        _syncLinkedPackages(d, { payload }) {
            d.inited = true;
            d.srcPackages = new Map();
            for (const pkInfo of payload) {
                d.srcPackages.set(pkInfo.name, pkInfo);
            }
        },
        // _updatePackageState(d, {payload: jsons}: PayloadAction<any[]>) {
        //   for (const json of jsons) {
        //     const pkg = d.srcPackages.get(json.name);
        //     if (pkg == null) {
        //       console.error(
        //         `[package-mgr.index] package name "${json.name}" in package.json is changed since last time,\n` +
        //         'please do "init" again on workspace root directory');
        //       continue;
        //     }
        //     pkg.json = json;
        //   }
        // },
        addProject(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathToProjKey(rawDir);
                if (!d.project2Packages.has(dir)) {
                    d.project2Packages.set(dir, []);
                }
            }
        },
        deleteProject(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathToProjKey(rawDir);
                d.project2Packages.delete(dir);
            }
        },
        _hoistWorkspaceDeps(state, { payload: { dir } }) {
            if (state.srcPackages == null) {
                throw new Error('"srcPackages" is null, need to run `init` command first');
            }
            const pkjsonStr = fs_extra_1.default.readFileSync(path_1.default.resolve(dir, 'package.json'), 'utf8');
            const pkjson = JSON.parse(pkjsonStr);
            // for (const deps of [pkjson.dependencies, pkjson.devDependencies] as {[name: string]: string}[] ) {
            //   Object.entries(deps);
            // }
            const deps = Object.entries(pkjson.dependencies || {});
            const updatingDeps = Object.assign({}, pkjson.dependencies || {});
            const linkedDependencies = [];
            deps.filter(dep => {
                if (state.srcPackages.has(dep[0])) {
                    linkedDependencies.push(dep);
                    delete updatingDeps[dep[0]];
                    return false;
                }
                return true;
            });
            const devDeps = Object.entries(pkjson.devDependencies || {});
            const updatingDevDeps = Object.assign({}, pkjson.devDependencies || {});
            const linkedDevDependencies = [];
            devDeps.filter(dep => {
                if (state.srcPackages.has(dep[0])) {
                    linkedDevDependencies.push(dep);
                    delete updatingDevDeps[dep[0]];
                    return false;
                }
                return true;
            });
            if (misc_1.isDrcpSymlink) {
                // tslint:disable-next-line: no-console
                console.log('[_hoistWorkspaceDeps] dr-comp-package is symlink');
                delete updatingDeps['dr-comp-package'];
                delete updatingDevDeps['dr-comp-package'];
            }
            // pkjsonList.push(updatingJson);
            const { hoisted: hoistedDeps, msg } = dependency_hoister_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages.get(entry[0]).json), dir, updatingDeps);
            const { hoisted: hoistedDevDeps, msg: msgDev } = dependency_hoister_1.listCompDependency(linkedDevDependencies.map(entry => state.srcPackages.get(entry[0]).json), dir, updatingDevDeps);
            // tslint:disable-next-line: no-console
            if (msg())
                console.log(`Workspace "${dir}" dependencies:\n`, msg());
            // tslint:disable-next-line: no-console
            if (msgDev())
                console.log(`Workspace "${dir}" devDependencies:\n`, msgDev());
            // In case some packages have peer dependencies of other packages
            // remove them from dependencies
            for (const key of hoistedDeps.keys()) {
                if (state.srcPackages.has(key))
                    hoistedDeps.delete(key);
            }
            for (const key of hoistedDevDeps.keys()) {
                if (state.srcPackages.has(key))
                    hoistedDevDeps.delete(key);
            }
            const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: Array.from(hoistedDeps.entries()).reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}), devDependencies: Array.from(hoistedDevDeps.entries()).reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}) });
            // console.log(installJson)
            const wsKey = workspaceKey(dir);
            // const installedComp = listInstalledComp4Workspace(state.workspaces, state.srcPackages, wsKey);
            const existing = state.workspaces.get(wsKey);
            const wp = {
                id: wsKey,
                originInstallJson: pkjson,
                originInstallJsonStr: pkjsonStr,
                installJson,
                installJsonStr: JSON.stringify(installJson, null, '  '),
                linkedDependencies,
                linkedDevDependencies
            };
            state.workspaces.set(wsKey, existing ? Object.assign(existing, wp) : wp);
            // console.log('-----------------', dir);
        },
        _installWorkspace(state, { payload: { workspaceKey } }) {
        },
        _associatePackageToPrj(d, { payload: { prj, pkgs } }) {
            d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
        },
        _updateGitIgnores(d, { payload }) {
            d.gitIgnores[payload.file] = payload.content;
        },
        _updateTsConfigForEditor(d, { payload: workspaceKey }) { },
        setInChina(d, { payload }) {
            d.isInChina = payload;
        },
        setCurrentWorkspace(d, { payload: dir }) {
            if (dir != null)
                d.currWorkspace = workspaceKey(dir);
            else
                d.currWorkspace = null;
        },
        workspaceStateUpdated(d, { payload }) {
            d.workspaceUpdateChecksum += 1;
        }
    }
});
exports.actionDispatcher = store_1.stateFactory.bindActionCreators(exports.slice);
// const readFileAsync = promisify<string, string, string>(fs.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    const pkgTsconfigForEditorRequestMap = new Set();
    return rxjs_1.merge(getStore().pipe(operators_2.map(s => s.project2Packages), operators_2.distinctUntilChanged(), operators_2.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
    }), operators_2.ignoreElements()), 
    //  updateWorkspace
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateWorkspace), operators_2.switchMap(({ payload: { dir, isForce } }) => {
        dir = path_1.default.resolve(dir);
        exports.actionDispatcher.setCurrentWorkspace(dir);
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/app-template.js'), path_1.default.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        if (!isForce) {
            // call initRootDirectory(),
            // only call _hoistWorkspaceDeps when "srcPackages" state is changed by action `_syncLinkedPackages`
            return rxjs_1.merge(rxjs_1.defer(() => rxjs_1.of(initRootDirectory())), 
            // wait for _syncLinkedPackages finish
            getStore().pipe(operators_2.distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages), operators_2.skip(1), operators_2.take(1), operators_2.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
        }
        else {
            // Chaning installJsonStr to force action _installWorkspace being dispatched later
            const wsKey = workspaceKey(dir);
            if (getState().workspaces.has(wsKey)) {
                exports.actionDispatcher._change(d => {
                    // clean to trigger install action
                    d.workspaces.get(wsKey).installJsonStr = '';
                    // tslint:disable-next-line: no-console
                    console.log('force npm install in', wsKey);
                });
            }
            // call initRootDirectory() and wait for it finished by observe action '_syncLinkedPackages',
            // then call _hoistWorkspaceDeps
            return rxjs_1.merge(rxjs_1.defer(() => rxjs_1.of(initRootDirectory())), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncLinkedPackages), operators_2.take(1), operators_2.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
        }
    }), operators_2.ignoreElements()), 
    // initRootDir
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_2.map(() => {
        checkAllWorkspaces();
        if (getState().workspaces.has(workspaceKey(process.cwd()))) {
            exports.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: false });
        }
        else {
            const curr = getState().currWorkspace;
            if (curr != null) {
                if (getState().workspaces.has(curr)) {
                    const path = path_1.default.resolve(misc_1.getRootDir(), curr);
                    exports.actionDispatcher.updateWorkspace({ dir: path, isForce: false });
                }
                else {
                    exports.actionDispatcher.setCurrentWorkspace(null);
                }
            }
        }
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_2.map(({ payload }) => {
        const wsKey = workspaceKey(payload.dir);
        exports.actionDispatcher._updateTsConfigForEditor(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated());
    }), operators_2.ignoreElements()), 
    // Handle newly added workspace
    getStore().pipe(operators_2.map(s => s.workspaces), operators_2.distinctUntilChanged(), operators_2.map(ws => {
        const keys = Array.from(ws.keys());
        return keys;
    }), operators_2.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            console.log('New workspace: ', newAdded);
            for (const ws of newAdded) {
                exports.actionDispatcher._installWorkspace({ workspaceKey: ws });
            }
            writeConfigFiles();
        }
        return curr;
    }), operators_2.ignoreElements()), ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(operators_2.filter(s => s.workspaces.has(key)), operators_2.map(s => s.workspaces.get(key).installJsonStr), operators_2.distinctUntilChanged(), 
        // tap((installJsonStr) => console.log('installJsonStr length',key, installJsonStr.length)),
        operators_2.filter(installJsonStr => installJsonStr.length > 0), operators_2.skip(1), operators_2.take(1), operators_2.map(() => {
            return exports.actionDispatcher._installWorkspace({ workspaceKey: key });
        }), operators_2.ignoreElements());
    }), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_2.concatMap(action => {
        const wsKey = action.payload.workspaceKey;
        return getStore().pipe(operators_2.map(s => s.workspaces.get(wsKey)), operators_2.distinctUntilChanged(), operators_2.filter(ws => ws != null), operators_2.take(1), operators_2.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_2.map(() => {
            const pkgEntry = listInstalledComp4Workspace(getState(), wsKey);
            const installed = new Map((function* () {
                for (const pk of pkgEntry) {
                    yield [pk.name, pk];
                }
            })());
            exports.actionDispatcher._change(d => d.workspaces.get(wsKey).installedComponents = installed);
            exports.actionDispatcher._updateTsConfigForEditor(wsKey);
        }));
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._updateTsConfigForEditor), operators_2.map(action => pkgTsconfigForEditorRequestMap.add(action.payload)), operators_2.debounceTime(800), operators_2.map(() => {
        for (const wsKey of pkgTsconfigForEditorRequestMap.values()) {
            editor_helper_1.updateTsconfigFileForEditor(wsKey);
        }
        pkgTsconfigForEditorRequestMap.clear();
    })), getStore().pipe(operators_2.map(s => s.gitIgnores), operators_2.distinctUntilChanged(), operators_2.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_2.distinctUntilChanged(), operators_2.switchMap(() => {
        // console.log('$$$$$$$$$', files);
        return rxjs_1.merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(operators_2.map(s => s.gitIgnores[file]), operators_2.distinctUntilChanged(), operators_2.skip(1), operators_2.map(content => {
            fs_extra_1.default.writeFile(file, content, () => {
                // tslint:disable-next-line: no-console
                console.log('modify', file);
            });
        }))));
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_2.concatMap(() => rxjs_1.from(_scanPackageAndLink())), operators_2.ignoreElements())).pipe(operators_2.ignoreElements(), operators_2.catchError(err => {
        console.error('[package-mgr.index]', err);
        return rxjs_1.of();
    }));
});
function getState() {
    return store_1.stateFactory.sliceState(exports.slice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.slice);
}
exports.getStore = getStore;
function pathToProjKey(path) {
    const relPath = path_1.default.relative(misc_1.getRootDir(), path);
    return relPath.startsWith('..') ? path_1.default.resolve(path) : relPath;
}
exports.pathToProjKey = pathToProjKey;
function workspaceKey(path) {
    let rel = path_1.default.relative(misc_1.getRootDir(), path_1.default.resolve(path));
    if (path_1.default.sep === '\\')
        rel = rel.replace(/\\/g, '/');
    return rel;
}
exports.workspaceKey = workspaceKey;
function* getPackagesOfProjects(projects) {
    for (const prj of projects) {
        const pkgNames = getState().project2Packages.get(pathToProjKey(prj));
        if (pkgNames) {
            for (const pkgName of pkgNames) {
                const pk = getState().srcPackages.get(pkgName);
                if (pk)
                    yield pk;
            }
        }
    }
}
exports.getPackagesOfProjects = getPackagesOfProjects;
function listPackages() {
    let out = '';
    let i = 0;
    package_utils_1.findAllPackages((name) => {
        out += `${i++}. ${name}`;
        out += '\n';
    }, 'src');
    return out;
}
exports.listPackages = listPackages;
function getProjectList() {
    return Array.from(getState().project2Packages.keys()).map(pj => path_1.default.resolve(misc_1.getRootDir(), pj));
}
exports.getProjectList = getProjectList;
function listPackagesByProjects() {
    const cwd = process.cwd();
    const linkedPkgs = getState().srcPackages;
    let out = '';
    for (const [prj, pkgNames] of getState().project2Packages.entries()) {
        out += `Project ${prj || '.'}\n`;
        const pkgs = pkgNames.map(name => linkedPkgs.get(name));
        const maxWidth = pkgs.reduce((maxWidth, pk) => {
            const width = pk.name.length + pk.json.version.length + 1;
            return width > maxWidth ? width : maxWidth;
        }, 0);
        for (const pk of pkgs) {
            const width = pk.name.length + pk.json.version.length + 1;
            out += `  |- ${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
                ` ${path_1.default.relative(cwd, pk.realPath)}\n`;
        }
        out += '\n';
    }
    return out;
}
exports.listPackagesByProjects = listPackagesByProjects;
/**
 * Delete workspace state if its directory does not exist
 */
function checkAllWorkspaces() {
    for (const key of getState().workspaces.keys()) {
        const dir = path_1.default.resolve(misc_1.getRootDir(), key);
        if (!fs_extra_1.default.existsSync(dir)) {
            // tslint:disable-next-line: no-console
            console.log(`Workspace ${key} does not exist anymore.`);
            exports.actionDispatcher._change(d => d.workspaces.delete(key));
        }
    }
}
// async function updateLinkedPackageState() {
//   const jsonStrs = await Promise.all(
//     Array.from(getState().srcPackages.entries())
//     .map(([name, pkInfo]) => {
//       return readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8');
//     })
//   );
//   warnUselessSymlink();
//   actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
// }
function warnUselessSymlink() {
    const checkDir = path_1.default.resolve(misc_1.getRootDir(), 'node_modules');
    const srcPackages = getState().srcPackages;
    const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
    const done1 = symlinks_1.listModuleSymlinks(checkDir, (link) => __awaiter(this, void 0, void 0, function* () {
        const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
        if (drcpName !== pkgName && !srcPackages.has(pkgName)) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.yellow(`Extraneous symlink: ${link}`));
        }
    }));
    // const pwd = process.cwd();
    // const forbidDir = Path.join(getRootDir(), 'node_modules');
    // if (symlinkDir !== forbidDir) {
    //   const removed: Promise<any>[] = [];
    //   const done2 = listModuleSymlinks(forbidDir, async link => {
    //     const pkgName = Path.relative(forbidDir, link).replace(/\\/g, '/');
    //     if (srcPackages.has(pkgName)) {
    //       removed.push(unlinkAsync(link));
    //       // tslint:disable-next-line: no-console
    //       console.log(`Redundant symlink "${Path.relative(pwd, link)}" removed.`);
    //     }
    //   });
    //   return Promise.all([done1, done2, ...removed]);
    // }
    return done1;
}
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = misc_1.getRootDir();
        fs_extra_1.default.mkdirpSync(path_1.default.join(rootPath, 'dist'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/config.local-template.yaml'), path_1.default.join(rootPath, 'dist', 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'module-resolve.server.tmpl.ts'), rootPath + '/module-resolve.server.ts');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), misc_1.getRootDir() + '/.gitignore');
        yield symlinks_1.default();
        if (!fs_extra_1.default.existsSync(path_1.default.join(rootPath, 'logs')))
            fs_extra_1.default.mkdirpSync(path_1.default.join(rootPath, 'logs'));
        fs_extra_1.default.mkdirpSync(symlinkDir);
        log_config_1.default(config_1.default());
        const projectDirs = getProjectList();
        projectDirs.forEach(prjdir => {
            _writeGitHook(prjdir);
            maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
        });
        yield _scanPackageAndLink();
        warnUselessSymlink();
        yield writeConfigFiles();
    });
}
function writeConfigFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            utils_1.writeFile(path_1.default.resolve(misc_1.getRootDir(), 'dist', file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
    });
}
function installWorkspace(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.resolve(misc_1.getRootDir(), ws.id);
        // tslint:disable-next-line: no-console
        console.log('Install dependencies in ' + dir);
        try {
            yield copyNpmrcToWorkspace(dir);
        }
        catch (e) {
            console.error(e);
        }
        const symlinksInModuleDir = [];
        const target = path_1.default.resolve(dir, 'node_modules');
        if (!fs_extra_1.default.existsSync(target)) {
            fs_extra_1.default.mkdirpSync(target);
        }
        // 1. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
        // backup them for late recovery
        yield symlinks_1.listModuleSymlinks(target, link => {
            const linkContent = fs_extra_1.default.readlinkSync(link);
            symlinksInModuleDir.push({ content: linkContent, link });
            return symlinks_1.unlinkAsync(link);
        });
        // _cleanActions.addWorkspaceFile(links);
        // 2. Run `npm install`
        const installJsonFile = path_1.default.resolve(dir, 'package.json');
        // tslint:disable-next-line: no-console
        console.log('[init] write', installJsonFile);
        fs_extra_1.default.writeFileSync(installJsonFile, ws.installJsonStr, 'utf8');
        yield new Promise(resolve => setTimeout(resolve, 5000));
        try {
            yield process_utils_2.exe('npm', 'install', { cwd: dir }).promise;
            yield process_utils_2.exe('npm', 'dedupe', { cwd: dir }).promise;
        }
        catch (e) {
            // tslint:disable-next-line: no-console
            console.log(e, e.stack);
        }
        // 3. Recover package.json and symlinks deleted in Step.1.
        fs_extra_1.default.writeFile(installJsonFile, ws.originInstallJsonStr, 'utf8');
        yield recoverSymlinks();
        // }
        function recoverSymlinks() {
            return Promise.all(symlinksInModuleDir.map(({ content, link }) => {
                return symlinks_1._symlinkAsync(content, link, symlinks_1.isWin32 ? 'junction' : 'dir');
            }));
        }
    });
}
function copyNpmrcToWorkspace(wsdir) {
    return __awaiter(this, void 0, void 0, function* () {
        const target = path_1.default.resolve(wsdir, '.npmrc');
        if (fs_extra_1.default.existsSync(target))
            return;
        const isChina = yield getStore().pipe(operators_2.map(s => s.isInChina), operators_2.distinctUntilChanged(), operators_2.filter(cn => cn != null), operators_2.take(1)).toPromise();
        if (isChina) {
            // tslint:disable-next-line: no-console
            console.log('create .npmrc to', target);
            fs_extra_1.default.copyFileSync(path_1.default.resolve(__dirname, '../../../.npmrc'), target);
        }
    });
}
function _scanPackageAndLink() {
    return __awaiter(this, void 0, void 0, function* () {
        const rm = (yield Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
        const projPkgMap = new Map();
        const pkgList = [];
        // const symlinksDir = Path.resolve(getRootDir(), 'node_modules');
        yield rm.linkComponentsAsync(symlinkDir).pipe(operators_1.tap(({ proj, jsonFile, json }) => {
            if (!projPkgMap.has(proj))
                projPkgMap.set(proj, []);
            const info = createPackageInfoWithJson(jsonFile, json, false, symlinkDir);
            pkgList.push(info);
            projPkgMap.get(proj).push(info);
        })).toPromise();
        for (const [prj, pkgs] of projPkgMap.entries()) {
            exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
        }
        exports.actionDispatcher._syncLinkedPackages(pkgList);
    });
}
/**
 *
 * @param pkJsonFile package.json file path
 * @param isInstalled
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
function createPackageInfo(pkJsonFile, isInstalled = false, symLinkParentDir) {
    const json = JSON.parse(fs_extra_1.default.readFileSync(pkJsonFile, 'utf8'));
    return createPackageInfoWithJson(pkJsonFile, json, isInstalled, symLinkParentDir);
}
exports.createPackageInfo = createPackageInfo;
/**
 * List those installed packages which are referenced by workspace package.json file,
 * those packages must have "dr" property in package.json
 * @param workspaceKey
 */
function* listInstalledComp4Workspace(state, workspaceKey) {
    const originInstallJson = state.workspaces.get(workspaceKey).originInstallJson;
    const depJson = process.env.NODE_ENV === 'production' ? [originInstallJson.dependencies] :
        [originInstallJson.dependencies, originInstallJson.devDependencies];
    for (const deps of depJson) {
        if (deps == null)
            continue;
        for (const dep of Object.keys(deps)) {
            if (!state.srcPackages.has(dep) && dep !== 'dr-comp-package') {
                const pkjsonFile = path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json');
                if (fs_extra_1.default.existsSync(pkjsonFile)) {
                    const pk = createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true);
                    if (pk.json.dr) {
                        yield pk;
                    }
                }
            }
        }
    }
}
/**
 *
 * @param pkJsonFile package.json file path
 * @param isInstalled
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
function createPackageInfoWithJson(pkJsonFile, json, isInstalled = false, symLinkParentDir) {
    const m = moduleNameReg.exec(json.name);
    const pkInfo = {
        shortName: m[2],
        name: json.name,
        scope: m[1],
        path: symLinkParentDir ? path_1.default.resolve(symLinkParentDir, json.name) : path_1.default.dirname(pkJsonFile),
        json,
        realPath: fs_extra_1.default.realpathSync(path_1.default.dirname(pkJsonFile)),
        isInstalled
    };
    return pkInfo;
}
function cp(from, to) {
    if (lodash_1.default.startsWith(from, '-')) {
        from = arguments[1];
        to = arguments[2];
    }
    fs_extra_1.default.copySync(from, to);
    // shell.cp(...arguments);
    if (/[/\\]$/.test(to))
        to = path_1.default.basename(from); // to is a folder
    else
        to = path_1.default.relative(process.cwd(), to);
    // tslint:disable-next-line: no-console
    console.log('copy to %s', chalk_1.default.cyan(to));
}
/**
 *
 * @param from absolute path
 * @param {string} to relative to rootPath
 */
function maybeCopyTemplate(from, to) {
    if (!fs_extra_1.default.existsSync(path_1.default.resolve(misc_1.getRootDir(), to)))
        cp(path_1.default.resolve(__dirname, from), to);
}
function _writeGitHook(project) {
    // if (!isWin32) {
    const gitPath = path_1.default.resolve(project, '.git/hooks');
    if (fs_extra_1.default.existsSync(gitPath)) {
        const hookStr = '#!/bin/sh\n' +
            `cd "${misc_1.getRootDir()}"\n` +
            // 'drcp init\n' +
            // 'npx pretty-quick --staged\n' + // Use `tslint --fix` instead.
            `node node_modules/dr-comp-package/bin/drcp.js lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
        if (fs_extra_1.default.existsSync(gitPath + '/pre-commit'))
            fs_extra_1.default.unlink(gitPath + '/pre-commit');
        fs_extra_1.default.writeFileSync(gitPath + '/pre-push', hookStr);
        // tslint:disable-next-line: no-console
        console.log('Write ' + gitPath + '/pre-push');
        if (!symlinks_1.isWin32) {
            process_utils_1.spawn('chmod', '-R', '+x', project + '/.git/hooks/pre-push');
        }
    }
    // }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUE2QztBQUU3Qyw4Q0FBbUM7QUFDbkMsOENBQ2tGO0FBQ2xGLHdDQUF5QztBQUN6Qyx1REFBK0I7QUFDL0IsOERBQThFO0FBQzlFLG9EQUErRDtBQUMvRCwrREFBc0M7QUFDdEMsb0RBQW1EO0FBQ25ELG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQWtEO0FBQ2xELG9DQUF5RDtBQUN6RCx3Q0FBMEQ7QUFDMUQsOERBQWtIO0FBNkJsSCxNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRWxFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsTUFBTSxFQUFFLEtBQUs7SUFDYixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDM0IsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsVUFBVSxFQUFFLG9CQUFhLENBQUMsQ0FBQztRQUN6QixpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUM1QixpQkFBVSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQVUsRUFBRSxDQUFDO1FBQ2xGLENBQUMsQ0FBQyxJQUFJO0lBQ1IsdUJBQXVCLEVBQUUsQ0FBQztDQUMzQixDQUFDO0FBZ0JXLFFBQUEsS0FB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QU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlEO0tBQ0Y7SUFDRCxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mLCBkZWZlcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBkZWJvdW5jZVRpbWUsXG4gIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9jbWQvdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiB9IGZyb20gJy4uL2RlcGVuZGVuY3ktaG9pc3Rlcic7XG5pbXBvcnQgeyB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JFZGl0b3IgfSBmcm9tICcuLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgeyBmaW5kQWxsUGFja2FnZXMgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IHNldFByb2plY3RMaXN0fSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGdldFJvb3REaXIsIGlzRHJjcFN5bWxpbmsgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHsgYWN0aW9ucyBhcyBfY2xlYW5BY3Rpb25zIH0gZnJvbSAnLi4vY21kL2NsaS1jbGVhbic7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG4gIGlzSW5zdGFsbGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBpbml0ZWQ6IGJvb2xlYW47XG4gIHNyY1BhY2thZ2VzOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG4gIC8qKiBLZXkgaXMgcmVsYXRpdmUgcGF0aCB0byByb290IHdvcmtzcGFjZSAqL1xuICB3b3Jrc3BhY2VzOiBNYXA8c3RyaW5nLCBXb3Jrc3BhY2VTdGF0ZT47XG4gIC8qKiBrZXkgb2YgY3VycmVudCBcIndvcmtzcGFjZXNcIiAqL1xuICBjdXJyV29ya3NwYWNlPzogc3RyaW5nIHwgbnVsbDtcbiAgcHJvamVjdDJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICBsaW5rZWREcmNwOiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGdpdElnbm9yZXM6IHtbZmlsZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgaXNJbkNoaW5hPzogYm9vbGVhbjtcbiAgLyoqIEV2ZXJ5dGltZSBhIGhvaXN0IHdvcmtzcGFjZSBzdGF0ZSBjYWxjdWxhdGlvbiBpcyBiYXNpY2FsbHkgZG9uZSwgaXQgaXMgaW5jcmVhc2VkIGJ5IDEgKi9cbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbn1cblxuY29uc3Qge3N5bWxpbmtEaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgaW5pdGVkOiBmYWxzZSxcbiAgd29ya3NwYWNlczogbmV3IE1hcCgpLFxuICBwcm9qZWN0MlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGdpdElnbm9yZXM6IHt9LFxuICBsaW5rZWREcmNwOiBpc0RyY3BTeW1saW5rID9cbiAgICBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUoXG4gICAgICBnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpLCBmYWxzZSwgZ2V0Um9vdERpcigpKVxuICAgIDogbnVsbCxcbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IDBcbn07XG5cbmludGVyZmFjZSBXb3Jrc3BhY2VTdGF0ZSB7XG4gIGlkOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG5hbWVzIG9mIHRob3NlIHN5bWxpbmsgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8qKiBpbnN0YWxsZWQgRFIgY29tcG9uZW50IHBhY2thZ2VzIFtuYW1lLCB2ZXJzaW9uXSovXG4gIGluc3RhbGxlZENvbXBvbmVudHM/OiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG59XG5cbmV4cG9ydCBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6IE5TLFxuICBpbml0aWFsU3RhdGU6IHN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIC8qKiBEbyB0aGlzIGFjdGlvbiBhZnRlciBhbnkgbGlua2VkIHBhY2thZ2UgaXMgcmVtb3ZlZCBvciBhZGRlZCAgKi9cbiAgICBpbml0Um9vdERpcihkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2hvaXN0ZWREaXI6IHN0cmluZ30gfCB1bmRlZmluZWQgfCBudWxsPikge1xuICAgIH0sXG5cbiAgICAvKiogQ2hlY2sgYW5kIGluc3RhbGwgZGVwZW5kZW5jeSwgaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgXG4gICAgICogdG8gc3dpdGNoIGJldHdlZW4gZGlmZmVyZW50IHdvcmtzcGFjZSAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nLCBpc0ZvcmNlOiBib29sZWFufT4pIHtcbiAgICB9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFBhY2thZ2VJbmZvW10+KSB7XG4gICAgICBkLmluaXRlZCA9IHRydWU7XG4gICAgICBkLnNyY1BhY2thZ2VzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZCkge1xuICAgICAgICBkLnNyY1BhY2thZ2VzLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIF91cGRhdGVQYWNrYWdlU3RhdGUoZCwge3BheWxvYWQ6IGpzb25zfTogUGF5bG9hZEFjdGlvbjxhbnlbXT4pIHtcbiAgICAvLyAgIGZvciAoY29uc3QganNvbiBvZiBqc29ucykge1xuICAgIC8vICAgICBjb25zdCBwa2cgPSBkLnNyY1BhY2thZ2VzLmdldChqc29uLm5hbWUpO1xuICAgIC8vICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAvLyAgICAgICBjb25zb2xlLmVycm9yKFxuICAgIC8vICAgICAgICAgYFtwYWNrYWdlLW1nci5pbmRleF0gcGFja2FnZSBuYW1lIFwiJHtqc29uLm5hbWV9XCIgaW4gcGFja2FnZS5qc29uIGlzIGNoYW5nZWQgc2luY2UgbGFzdCB0aW1lLFxcbmAgK1xuICAgIC8vICAgICAgICAgJ3BsZWFzZSBkbyBcImluaXRcIiBhZ2FpbiBvbiB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnknKTtcbiAgICAvLyAgICAgICBjb250aW51ZTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBwa2cuanNvbiA9IGpzb247XG4gICAgLy8gICB9XG4gICAgLy8gfSxcbiAgICBhZGRQcm9qZWN0KGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnByb2plY3QyUGFja2FnZXMuaGFzKGRpcikpIHtcbiAgICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KGRpciwgW10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9qZWN0KGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgX2hvaXN0V29ya3NwYWNlRGVwcyhzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcInNyY1BhY2thZ2VzXCIgaXMgbnVsbCwgbmVlZCB0byBydW4gYGluaXRgIGNvbW1hbmQgZmlyc3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKTtcbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGV2RGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgICBjb25zdCB1cGRhdGluZ0RldkRlcHMgPSB7Li4ucGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXZEZXBzID0gW107XG4gICAgICBkZXZEZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcblxuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbX2hvaXN0V29ya3NwYWNlRGVwc10gZHItY29tcC1wYWNrYWdlIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuXG4gICAgICAvLyBwa2pzb25MaXN0LnB1c2godXBkYXRpbmdKc29uKTtcbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGVwcywgbXNnfSA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcy5nZXQoZW50cnlbMF0pIS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RlcHNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGV2RGVwcywgbXNnOiBtc2dEZXZ9ID0gbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGVudHJ5ID0+IHN0YXRlLnNyY1BhY2thZ2VzLmdldChlbnRyeVswXSkhLmpzb24pLFxuICAgICAgICBkaXIsIHVwZGF0aW5nRGV2RGVwc1xuICAgICAgKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgaWYgKG1zZygpKSBjb25zb2xlLmxvZyhgV29ya3NwYWNlIFwiJHtkaXJ9XCIgZGVwZW5kZW5jaWVzOlxcbmAsIG1zZygpKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgaWYgKG1zZ0RldigpKSBjb25zb2xlLmxvZyhgV29ya3NwYWNlIFwiJHtkaXJ9XCIgZGV2RGVwZW5kZW5jaWVzOlxcbmAsIG1zZ0RldigpKTtcbiAgICAgIC8vIEluIGNhc2Ugc29tZSBwYWNrYWdlcyBoYXZlIHBlZXIgZGVwZW5kZW5jaWVzIG9mIG90aGVyIHBhY2thZ2VzXG4gICAgICAvLyByZW1vdmUgdGhlbSBmcm9tIGRlcGVuZGVuY2llc1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgaG9pc3RlZERlcHMua2V5cygpKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoa2V5KSlcbiAgICAgICAgICBob2lzdGVkRGVwcy5kZWxldGUoa2V5KTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBrZXkgb2YgaG9pc3RlZERldkRlcHMua2V5cygpKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoa2V5KSlcbiAgICAgICAgICBob2lzdGVkRGV2RGVwcy5kZWxldGUoa2V5KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuICAgICAgICAuLi5wa2pzb24sXG4gICAgICAgIGRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGVwcy5lbnRyaWVzKCkpLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSksXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGV2RGVwcy5lbnRyaWVzKCkpLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSlcbiAgICAgIH07XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKGluc3RhbGxKc29uKVxuXG4gICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgLy8gY29uc3QgaW5zdGFsbGVkQ29tcCA9IGxpc3RJbnN0YWxsZWRDb21wNFdvcmtzcGFjZShzdGF0ZS53b3Jrc3BhY2VzLCBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXkpO1xuXG4gICAgICBjb25zdCBleGlzdGluZyA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBpZDogd3NLZXksXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llc1xuICAgICAgfTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXMuc2V0KHdzS2V5LCBleGlzdGluZyA/IE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHdwKSA6IHdwKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLScsIGRpcik7XG4gICAgfSxcbiAgICBfaW5zdGFsbFdvcmtzcGFjZShzdGF0ZSwge3BheWxvYWQ6IHt3b3Jrc3BhY2VLZXl9fTogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmd9Pikge1xuICAgIH0sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1ByaihkLCB7cGF5bG9hZDoge3ByaiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwcmo6IHN0cmluZzsgcGtnczogUGFja2FnZUluZm9bXX0+KSB7XG4gICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocHJqKSwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9LFxuICAgIF91cGRhdGVHaXRJZ25vcmVzKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7ZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmd9Pikge1xuICAgICAgZC5naXRJZ25vcmVzW3BheWxvYWQuZmlsZV0gPSBwYXlsb2FkLmNvbnRlbnQ7XG4gICAgfSxcbiAgICBfdXBkYXRlVHNDb25maWdGb3JFZGl0b3IoZCwge3BheWxvYWQ6IHdvcmtzcGFjZUtleX06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgc2V0SW5DaGluYShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Ym9vbGVhbj4pIHtcbiAgICAgIGQuaXNJbkNoaW5hID0gcGF5bG9hZDtcbiAgICB9LFxuICAgIHNldEN1cnJlbnRXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IGRpcn06IFBheWxvYWRBY3Rpb248c3RyaW5nIHwgbnVsbD4pIHtcbiAgICAgIGlmIChkaXIgIT0gbnVsbClcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBlbHNlXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IG51bGw7XG4gICAgfSxcbiAgICB3b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHZvaWQ+KSB7XG4gICAgICBkLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtICs9IDE7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuLy8gY29uc3QgcmVhZEZpbGVBc3luYyA9IHByb21pc2lmeTxzdHJpbmcsIHN0cmluZywgc3RyaW5nPihmcy5yZWFkRmlsZSk7XG4vKipcbiAqIENhcmVmdWxseSBhY2Nlc3MgYW55IHByb3BlcnR5IG9uIGNvbmZpZywgc2luY2UgY29uZmlnIHNldHRpbmcgcHJvYmFibHkgaGFzbid0IGJlZW4gc2V0IHlldCBhdCB0aGlzIG1vbW1lbnRcbiAqL1xuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICBjb25zdCBwa2dUc2NvbmZpZ0ZvckVkaXRvclJlcXVlc3RNYXAgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChwa3MgPT4ge1xuICAgICAgICBzZXRQcm9qZWN0TGlzdChnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSksXG4gICAgICBzd2l0Y2hNYXAoKHtwYXlsb2FkOiB7ZGlyLCBpc0ZvcmNlfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICAgICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCBQYXRoLnJlc29sdmUoZGlyLCAnYXBwLmpzJykpO1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKCFpc0ZvcmNlKSB7XG4gICAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpLFxuICAgICAgICAgIC8vIG9ubHkgY2FsbCBfaG9pc3RXb3Jrc3BhY2VEZXBzIHdoZW4gXCJzcmNQYWNrYWdlc1wiIHN0YXRlIGlzIGNoYW5nZWQgYnkgYWN0aW9uIGBfc3luY0xpbmtlZFBhY2thZ2VzYFxuICAgICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICAgIGRlZmVyKCgpID0+IG9mKGluaXRSb290RGlyZWN0b3J5KCkpKSxcbiAgICAgICAgICAgIC8vIHdhaXQgZm9yIF9zeW5jTGlua2VkUGFja2FnZXMgZmluaXNoXG4gICAgICAgICAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLnNyY1BhY2thZ2VzID09PSBzMi5zcmNQYWNrYWdlcyksXG4gICAgICAgICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZlIGFjdGlvbiAnX3N5bmNMaW5rZWRQYWNrYWdlcycsXG4gICAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoXG4gICAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeSgpKSksXG4gICAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgICBtYXAoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXJ9KSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIpLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSkpIHtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwcm9jZXNzLmN3ZCgpLCBpc0ZvcmNlOiBmYWxzZX0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGN1cnIgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gICAgICAgICAgaWYgKGN1cnIgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMoY3VycikpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGN1cnIpO1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwYXRoLCBpc0ZvcmNlOiBmYWxzZX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5zZXRDdXJyZW50V29ya3NwYWNlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faG9pc3RXb3Jrc3BhY2VEZXBzKSxcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlVHNDb25maWdGb3JFZGl0b3Iod3NLZXkpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC8vIEhhbmRsZSBuZXdseSBhZGRlZCB3b3Jrc3BhY2VcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAod3MgPT4ge1xuICAgICAgICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbSh3cy5rZXlzKCkpO1xuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0pLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnTmV3IHdvcmtzcGFjZTogJywgbmV3QWRkZWQpO1xuICAgICAgICAgIGZvciAoY29uc3Qgd3Mgb2YgbmV3QWRkZWQpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleTogd3N9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgd3JpdGVDb25maWdGaWxlcygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICAuLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgZmlsdGVyKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpIS5pbnN0YWxsSnNvblN0ciksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIC8vIHRhcCgoaW5zdGFsbEpzb25TdHIpID0+IGNvbnNvbGUubG9nKCdpbnN0YWxsSnNvblN0ciBsZW5ndGgnLGtleSwgaW5zdGFsbEpzb25TdHIubGVuZ3RoKSksXG4gICAgICAgIGZpbHRlcihpbnN0YWxsSnNvblN0ciA9PiBpbnN0YWxsSnNvblN0ci5sZW5ndGggPiAwKSxcbiAgICAgICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICByZXR1cm4gYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgfSksXG4gICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIGNvbmNhdE1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleTtcbiAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzISkpKSxcbiAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGtnRW50cnkgPSBsaXN0SW5zdGFsbGVkQ29tcDRXb3Jrc3BhY2UoZ2V0U3RhdGUoKSwgd3NLZXkpO1xuXG4gICAgICAgICAgICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ0VudHJ5KSB7XG4gICAgICAgICAgICAgICAgeWllbGQgW3BrLm5hbWUsIHBrXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKSk7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyA9IGluc3RhbGxlZCk7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVUc0NvbmZpZ0ZvckVkaXRvcih3c0tleSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl91cGRhdGVUc0NvbmZpZ0ZvckVkaXRvciksXG4gICAgICBtYXAoYWN0aW9uID0+IHBrZ1RzY29uZmlnRm9yRWRpdG9yUmVxdWVzdE1hcC5hZGQoYWN0aW9uLnBheWxvYWQpKSxcbiAgICAgIGRlYm91bmNlVGltZSg4MDApLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCB3c0tleSBvZiBwa2dUc2NvbmZpZ0ZvckVkaXRvclJlcXVlc3RNYXAudmFsdWVzKCkpIHtcbiAgICAgICAgICB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JFZGl0b3Iod3NLZXkpO1xuICAgICAgICB9XG4gICAgICAgIHBrZ1RzY29uZmlnRm9yRWRpdG9yUmVxdWVzdE1hcC5jbGVhcigpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLmdpdElnbm9yZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChnaXRJZ25vcmVzID0+IE9iamVjdC5rZXlzKGdpdElnbm9yZXMpLmpvaW4oJywnKSksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyQkJCQkJCQkJCcsIGZpbGVzKTtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLk9iamVjdC5rZXlzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKGZpbGUgPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG1hcChzID0+IHMuZ2l0SWdub3Jlc1tmaWxlXSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBza2lwKDEpLFxuICAgICAgICAgIG1hcChjb250ZW50ID0+IHtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlLCBjb250ZW50LCAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbW9kaWZ5JywgZmlsZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICApKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hZGRQcm9qZWN0LCBzbGljZS5hY3Rpb25zLmRlbGV0ZVByb2plY3QpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IGZyb20oX3NjYW5QYWNrYWdlQW5kTGluaygpKSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKVxuICApLnBpcGUoXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbcGFja2FnZS1tZ3IuaW5kZXhdJywgZXJyKTtcbiAgICAgIHJldHVybiBvZigpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQYWNrYWdlc1N0YXRlPiB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZUtleShwYXRoOiBzdHJpbmcpIHtcbiAgbGV0IHJlbCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwcmogb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocGF0aFRvUHJvaktleShwcmopKTtcbiAgICBpZiAocGtnTmFtZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwayA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgeWllbGQgcGs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXMoKTogc3RyaW5nIHtcbiAgbGV0IG91dCA9ICcnO1xuICBsZXQgaSA9IDA7XG4gIGZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgb3V0ICs9IGAke2krK30uICR7bmFtZX1gO1xuICAgIG91dCArPSAnXFxuJztcbiAgfSwgJ3NyYycpO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0TGlzdCgpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkubWFwKHBqID0+IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHBqKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBjb25zdCBjd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBsaW5rZWRQa2dzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgbGV0IG91dCA9ICcnO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ05hbWVzXSBvZiBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZW50cmllcygpKSB7XG4gICAgb3V0ICs9IGBQcm9qZWN0ICR7cHJqIHx8ICcuJ31cXG5gO1xuICAgIGNvbnN0IHBrZ3MgPSBwa2dOYW1lcy5tYXAobmFtZSA9PiBsaW5rZWRQa2dzLmdldChuYW1lKSEpO1xuICAgIGNvbnN0IG1heFdpZHRoID0gcGtncy5yZWR1Y2UoKG1heFdpZHRoLCBwaykgPT4ge1xuICAgICAgY29uc3Qgd2lkdGggPSBway5uYW1lLmxlbmd0aCArIHBrLmpzb24udmVyc2lvbi5sZW5ndGggKyAxO1xuICAgICAgcmV0dXJuIHdpZHRoID4gbWF4V2lkdGggPyB3aWR0aCA6IG1heFdpZHRoO1xuICAgIH0sIDApO1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtncykge1xuICAgICAgY29uc3Qgd2lkdGggPSBway5uYW1lLmxlbmd0aCArIHBrLmpzb24udmVyc2lvbi5sZW5ndGggKyAxO1xuICAgICAgb3V0ICs9IGAgIHwtICR7Y2hhbGsuY3lhbihway5uYW1lKX1AJHtjaGFsay5ncmVlbihway5qc29uLnZlcnNpb24pfSR7JyAnLnJlcGVhdChtYXhXaWR0aCAtIHdpZHRoKX1gICtcbiAgICAgIGAgJHtQYXRoLnJlbGF0aXZlKGN3ZCwgcGsucmVhbFBhdGgpfVxcbmA7XG4gICAgfVxuICAgIG91dCArPSAnXFxuJztcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vKipcbiAqIERlbGV0ZSB3b3Jrc3BhY2Ugc3RhdGUgaWYgaXRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdFxuICovXG5mdW5jdGlvbiBjaGVja0FsbFdvcmtzcGFjZXMoKSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKSB7XG4vLyAgIGNvbnN0IGpzb25TdHJzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4vLyAgICAgQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSlcbi8vICAgICAubWFwKChbbmFtZSwgcGtJbmZvXSkgPT4ge1xuLy8gICAgICAgcmV0dXJuIHJlYWRGaWxlQXN5bmMoUGF0aC5yZXNvbHZlKHBrSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuLy8gICAgIH0pXG4vLyAgICk7XG5cbi8vICAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG4vLyAgIGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBhY2thZ2VTdGF0ZShqc29uU3Rycy5tYXAoc3RyID0+IEpTT04ucGFyc2Uoc3RyKSkpO1xuLy8gfVxuXG5mdW5jdGlvbiB3YXJuVXNlbGVzc1N5bWxpbmsoKSB7XG4gIGNvbnN0IGNoZWNrRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBzcmNQYWNrYWdlcyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGRyY3BOYW1lID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lIDogbnVsbDtcbiAgY29uc3QgZG9uZTEgPSBsaXN0TW9kdWxlU3ltbGlua3MoY2hlY2tEaXIsIGFzeW5jIGxpbmsgPT4ge1xuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGNoZWNrRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiAhc3JjUGFja2FnZXMuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdyhgRXh0cmFuZW91cyBzeW1saW5rOiAke2xpbmt9YCkpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gY29uc3QgcHdkID0gcHJvY2Vzcy5jd2QoKTtcbiAgLy8gY29uc3QgZm9yYmlkRGlyID0gUGF0aC5qb2luKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpO1xuICAvLyBpZiAoc3ltbGlua0RpciAhPT0gZm9yYmlkRGlyKSB7XG4gIC8vICAgY29uc3QgcmVtb3ZlZDogUHJvbWlzZTxhbnk+W10gPSBbXTtcbiAgLy8gICBjb25zdCBkb25lMiA9IGxpc3RNb2R1bGVTeW1saW5rcyhmb3JiaWREaXIsIGFzeW5jIGxpbmsgPT4ge1xuICAvLyAgICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoZm9yYmlkRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIC8vICAgICBpZiAoc3JjUGFja2FnZXMuaGFzKHBrZ05hbWUpKSB7XG4gIC8vICAgICAgIHJlbW92ZWQucHVzaCh1bmxpbmtBc3luYyhsaW5rKSk7XG4gIC8vICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAvLyAgICAgICBjb25zb2xlLmxvZyhgUmVkdW5kYW50IHN5bWxpbmsgXCIke1BhdGgucmVsYXRpdmUocHdkLCBsaW5rKX1cIiByZW1vdmVkLmApO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyAgIHJldHVybiBQcm9taXNlLmFsbChbZG9uZTEsIGRvbmUyLCAuLi5yZW1vdmVkXSk7XG4gIC8vIH1cbiAgcmV0dXJuIGRvbmUxO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeSgpIHtcbiAgY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnZGlzdCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JywgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuc2VydmVyLnRtcGwudHMnKSwgcm9vdFBhdGggKyAnL21vZHVsZS1yZXNvbHZlLnNlcnZlci50cycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJyxcbiAgICAgICdnaXRpZ25vcmUudHh0JyksIGdldFJvb3REaXIoKSArICcvLmdpdGlnbm9yZScpO1xuICBhd2FpdCBjbGVhbkludmFsaWRTeW1saW5rcygpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKSlcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguam9pbihyb290UGF0aCwgJ2xvZ3MnKSk7XG5cbiAgZnMubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcblxuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcblxuICBwcm9qZWN0RGlycy5mb3JFYWNoKHByamRpciA9PiB7XG4gICAgX3dyaXRlR2l0SG9vayhwcmpkaXIpO1xuICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2xpbnQuanNvbicpLCBwcmpkaXIgKyAnL3RzbGludC5qc29uJyk7XG4gIH0pO1xuXG4gIGF3YWl0IF9zY2FuUGFja2FnZUFuZExpbmsoKTtcbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG5cbiAgYXdhaXQgd3JpdGVDb25maWdGaWxlcygpO1xufVxuXG5hc3luYyBmdW5jdGlvbiB3cml0ZUNvbmZpZ0ZpbGVzKCkge1xuICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbiAgICB3cml0ZUZpbGUoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ2Rpc3QnLCBmaWxlKSxcbiAgICAgICdcXG4jIERPIE5PVCBNT0RJRklZIFRISVMgRklMRSFcXG4nICsgY29uZmlnQ29udGVudCk7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3cy5pZCk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnSW5zdGFsbCBkZXBlbmRlbmNpZXMgaW4gJyArIGRpcik7XG4gIHRyeSB7XG4gICAgYXdhaXQgY29weU5wbXJjVG9Xb3Jrc3BhY2UoZGlyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmcsIGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnMubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgLy8gMS4gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3ModGFyZ2V0LCBsaW5rID0+IHtcbiAgICBjb25zdCBsaW5rQ29udGVudCA9IGZzLnJlYWRsaW5rU3luYyhsaW5rKTtcbiAgICBzeW1saW5rc0luTW9kdWxlRGlyLnB1c2goe2NvbnRlbnQ6IGxpbmtDb250ZW50LCBsaW5rfSk7XG4gICAgcmV0dXJuIHVubGlua0FzeW5jKGxpbmspO1xuICB9KTtcbiAgLy8gX2NsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGxpbmtzKTtcblxuICAvLyAyLiBSdW4gYG5wbSBpbnN0YWxsYFxuICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnW2luaXRdIHdyaXRlJywgaW5zdGFsbEpzb25GaWxlKTtcbiAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIHdzLmluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuICB0cnkge1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7Y3dkOiBkaXJ9KS5wcm9taXNlO1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2RlZHVwZScsIHtjd2Q6IGRpcn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhlLCBlLnN0YWNrKTtcbiAgfVxuICAvLyAzLiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gIGZzLndyaXRlRmlsZShpbnN0YWxsSnNvbkZpbGUsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICBhd2FpdCByZWNvdmVyU3ltbGlua3MoKTtcbiAgLy8gfVxuXG4gIGZ1bmN0aW9uIHJlY292ZXJTeW1saW5rcygpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3ltbGlua3NJbk1vZHVsZURpci5tYXAoKHtjb250ZW50LCBsaW5rfSkgPT4ge1xuICAgICAgcmV0dXJuIF9zeW1saW5rQXN5bmMoY29udGVudCwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgfSkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvcHlOcG1yY1RvV29ya3NwYWNlKHdzZGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKHdzZGlyLCAnLm5wbXJjJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpXG4gICAgcmV0dXJuO1xuICBjb25zdCBpc0NoaW5hID0gYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMuaXNJbkNoaW5hKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGZpbHRlcihjbiA9PiBjbiAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmIChpc0NoaW5hKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ2NyZWF0ZSAubnBtcmMgdG8nLCB0YXJnZXQpO1xuICAgIGZzLmNvcHlGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4vLm5wbXJjJyksIHRhcmdldCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gX3NjYW5QYWNrYWdlQW5kTGluaygpIHtcbiAgY29uc3Qgcm0gPSAoYXdhaXQgaW1wb3J0KCcuLi9yZWNpcGUtbWFuYWdlcicpKTtcblxuICBjb25zdCBwcm9qUGtnTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgY29uc3QgcGtnTGlzdDogUGFja2FnZUluZm9bXSA9IFtdO1xuICAvLyBjb25zdCBzeW1saW5rc0RpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKTtcbiAgYXdhaXQgcm0ubGlua0NvbXBvbmVudHNBc3luYyhzeW1saW5rRGlyKS5waXBlKFxuICAgIHRhcCgoe3Byb2osIGpzb25GaWxlLCBqc29ufSkgPT4ge1xuICAgICAgaWYgKCFwcm9qUGtnTWFwLmhhcyhwcm9qKSlcbiAgICAgICAgcHJvalBrZ01hcC5zZXQocHJvaiwgW10pO1xuICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24oanNvbkZpbGUsIGpzb24sIGZhbHNlLCBzeW1saW5rRGlyKTtcbiAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgZm9yIChjb25zdCBbcHJqLCBwa2dzXSBvZiBwcm9qUGtnTWFwLmVudHJpZXMoKSkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gIH1cbiAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKHBrZ0xpc3QpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm8ocGtKc29uRmlsZTogc3RyaW5nLCBpc0luc3RhbGxlZCA9IGZhbHNlLFxuICBzeW1MaW5rUGFyZW50RGlyPzogc3RyaW5nKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSk7XG4gIHJldHVybiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGUsIGpzb24sIGlzSW5zdGFsbGVkLCBzeW1MaW5rUGFyZW50RGlyKTtcbn1cbi8qKlxuICogTGlzdCB0aG9zZSBpbnN0YWxsZWQgcGFja2FnZXMgd2hpY2ggYXJlIHJlZmVyZW5jZWQgYnkgd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlLFxuICogdGhvc2UgcGFja2FnZXMgbXVzdCBoYXZlIFwiZHJcIiBwcm9wZXJ0eSBpbiBwYWNrYWdlLmpzb24gXG4gKiBAcGFyYW0gd29ya3NwYWNlS2V5IFxuICovXG5mdW5jdGlvbiogbGlzdEluc3RhbGxlZENvbXA0V29ya3NwYWNlKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCB3b3Jrc3BhY2VLZXk6IHN0cmluZykge1xuICBjb25zdCBvcmlnaW5JbnN0YWxsSnNvbiA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhLm9yaWdpbkluc3RhbGxKc29uO1xuICBjb25zdCBkZXBKc29uID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXNdIDpcbiAgICBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdO1xuICBmb3IgKGNvbnN0IGRlcHMgb2YgZGVwSnNvbikge1xuICAgIGlmIChkZXBzID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgaWYgKCFzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwKSAmJiBkZXAgIT09ICdkci1jb21wLXBhY2thZ2UnKSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uRmlsZSkpIHtcbiAgICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2VJbmZvKFxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyksIHRydWUpO1xuICAgICAgICAgIGlmIChway5qc29uLmRyKSB7XG4gICAgICAgICAgICB5aWVsZCBwaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlOiBzdHJpbmcsIGpzb246IGFueSwgaXNJbnN0YWxsZWQgPSBmYWxzZSxcbiAgc3ltTGlua1BhcmVudERpcj86IHN0cmluZyk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBzeW1MaW5rUGFyZW50RGlyID8gUGF0aC5yZXNvbHZlKHN5bUxpbmtQYXJlbnREaXIsIGpzb24ubmFtZSkgOiBQYXRoLmRpcm5hbWUocGtKc29uRmlsZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSksXG4gICAgaXNJbnN0YWxsZWRcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChfLnN0YXJ0c1dpdGgoZnJvbSwgJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnMuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgdG8pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ2NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gZnJvbSBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gdG8gcmVsYXRpdmUgdG8gcm9vdFBhdGggXG4gKi9cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBfd3JpdGVHaXRIb29rKHByb2plY3Q6IHN0cmluZykge1xuICAvLyBpZiAoIWlzV2luMzIpIHtcbiAgY29uc3QgZ2l0UGF0aCA9IFBhdGgucmVzb2x2ZShwcm9qZWN0LCAnLmdpdC9ob29rcycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoKSkge1xuICAgIGNvbnN0IGhvb2tTdHIgPSAnIyEvYmluL3NoXFxuJyArXG4gICAgICBgY2QgXCIke2dldFJvb3REaXIoKX1cIlxcbmAgK1xuICAgICAgLy8gJ2RyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJ25weCBwcmV0dHktcXVpY2sgLS1zdGFnZWRcXG4nICsgLy8gVXNlIGB0c2xpbnQgLS1maXhgIGluc3RlYWQuXG4gICAgICBgbm9kZSBub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL2Jpbi9kcmNwLmpzIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG4iXX0=