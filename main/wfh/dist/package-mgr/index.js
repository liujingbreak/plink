"use strict";
/**
 * Unfortunately, this file is very long, you need to fold by indention for better view of source code in Editor
 */
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
exports.createPackageInfo = exports.installInDir = exports.switchCurrentWorkspace = exports.isCwdWorkspace = exports.getProjectList = exports.getPackagesOfProjects = exports.workspaceDir = exports.workspaceKey = exports.projKeyToPath = exports.pathToProjKey = exports.getStore = exports.getState = exports.onLinkedPackageAdded = exports.updateGitIgnores = exports.actionDispatcher = exports.slice = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const fs_1 = __importDefault(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const transitive_dep_hoister_1 = require("../transitive-dep-hoister");
const process_utils_1 = require("../process-utils");
const process_utils_2 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
// import { getRootDir } from '../utils/misc';
const symlinks_1 = __importStar(require("../utils/symlinks"));
const rwPackageJson_1 = require("../rwPackageJson");
const os_1 = require("os");
const log4js_1 = require("log4js");
const misc_1 = require("../utils/misc");
const log = log4js_1.getLogger('plink.package-mgr');
const { distDir, rootDir, plinkDir, isDrcpSymlink, symlinkDirName } = misc_1.plinkEnv;
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    inited: false,
    workspaces: new Map(),
    project2Packages: new Map(),
    srcDir2Packages: new Map(),
    srcPackages: new Map(),
    gitIgnores: {},
    workspaceUpdateChecksum: 0,
    packagesUpdateChecksum: 0
};
exports.slice = store_1.stateFactory.newSlice({
    name: NS,
    initialState: state,
    reducers: {
        /** Do this action after any linked package is removed or added  */
        initRootDir(d, action) { },
        /**
         * - Create initial files in root directory
         * - Scan linked packages and install transitive dependency
         * - Switch to different workspace
         * - Delete nonexisting workspace
         * - If "packageJsonFiles" is provided, it should skip step of scanning linked packages
         * - TODO: if there is linked package used in more than one workspace, hoist and install for them all?
         */
        updateWorkspace(d, action) {
        },
        scanAndSyncPackages(d, action) { },
        updateDir() { },
        _updatePlinkPackageInfo(d) {
            const plinkPkg = createPackageInfo(path_1.default.resolve(plinkDir, 'package.json'), false);
            if (isDrcpSymlink) {
                d.linkedDrcp = plinkPkg;
                d.installedDrcp = null;
                d.linkedDrcpProject = pathToProjKey(path_1.default.dirname(d.linkedDrcp.realPath));
            }
            else {
                d.linkedDrcp = null;
                d.installedDrcp = plinkPkg;
                d.linkedDrcpProject = null;
            }
        },
        _syncLinkedPackages(d, { payload }) {
            d.inited = true;
            let map = d.srcPackages;
            if (payload[1] === 'clean') {
                map = d.srcPackages = new Map();
            }
            for (const pkInfo of payload[0]) {
                map.set(pkInfo.name, pkInfo);
            }
        },
        onLinkedPackageAdded(d, action) { },
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
        addSrcDirs(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathToProjKey(rawDir);
                if (!d.srcDir2Packages.has(dir)) {
                    d.srcDir2Packages.set(dir, []);
                }
            }
        },
        deleteSrcDirs(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathToProjKey(rawDir);
                d.srcDir2Packages.delete(dir);
            }
        },
        /** payload: workspace keys, happens as debounced workspace change event */
        workspaceBatchChanged(d, action) { },
        updateGitIgnores(d, { payload: { file, lines } }) {
            let rel = file, abs = file;
            if (path_1.default.isAbsolute(file)) {
                rel = path_1.default.relative(rootDir, file).replace(/\\/g, '/');
                abs = file;
            }
            else {
                abs = path_1.default.resolve(rootDir, file);
            }
            if (d.gitIgnores[abs]) {
                delete d.gitIgnores[abs];
            }
            d.gitIgnores[rel] = lines.map(line => line.startsWith('/') ? line : '/' + line);
        },
        packagesUpdated(d) {
            d.packagesUpdateChecksum++;
        },
        setInChina(d, { payload }) {
            d.isInChina = payload;
        },
        _setCurrentWorkspace(d, { payload: dir }) {
            if (dir != null)
                d.currWorkspace = workspaceKey(dir);
            else
                d.currWorkspace = null;
        },
        /** paramter: workspace key */
        workspaceStateUpdated(d, { payload }) {
            d.workspaceUpdateChecksum += 1;
        },
        // onWorkspacePackageUpdated(d, {payload: workspaceKey}: PayloadAction<string>) {},
        _hoistWorkspaceDeps(state, { payload: { dir } }) {
            if (state.srcPackages == null) {
                throw new Error('"srcPackages" is null, need to run `init` command first');
            }
            let pkjsonStr;
            const pkgjsonFile = path_1.default.resolve(dir, 'package.json');
            const lockFile = path_1.default.resolve(dir, 'plink.install.lock');
            if (fs_1.default.existsSync(lockFile)) {
                log.warn('Plink init/sync process was interrupted last time, recover content of ' + pkgjsonFile);
                pkjsonStr = fs_1.default.readFileSync(lockFile, 'utf8');
                fs_1.default.unlinkSync(lockFile);
            }
            else {
                pkjsonStr = fs_1.default.readFileSync(pkgjsonFile, 'utf8');
            }
            const pkjson = JSON.parse(pkjsonStr);
            // for (const deps of [pkjson.dependencies, pkjson.devDependencies] as {[name: string]: string}[] ) {
            //   Object.entries(deps);
            // }
            const deps = Object.entries(pkjson.dependencies || {});
            // const updatingDeps = {...pkjson.dependencies || {}};
            const linkedDependencies = [];
            deps.forEach(dep => {
                if (state.srcPackages.has(dep[0])) {
                    linkedDependencies.push(dep);
                }
            });
            const devDeps = Object.entries(pkjson.devDependencies || {});
            // const updatingDevDeps = {...pkjson.devDependencies || {}};
            const linkedDevDependencies = [];
            devDeps.forEach(dep => {
                if (state.srcPackages.has(dep[0])) {
                    linkedDevDependencies.push(dep);
                }
            });
            const wsKey = workspaceKey(dir);
            const { hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo, hoistedDev: hoistedDevDeps, hoistedDevPeers: devHoistPeerDepInfo } = transitive_dep_hoister_1.listCompDependency(state.srcPackages, wsKey, pkjson.dependencies || {}, pkjson.devDependencies);
            const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: Array.from(hoistedDeps.entries())
                    .concat(Array.from(hoistPeerDepInfo.entries()).filter(item => !item[1].missing))
                    .filter(([name]) => !isDrcpSymlink || name !== '@wfh/plink')
                    .reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}), devDependencies: Array.from(hoistedDevDeps.entries())
                    .concat(Array.from(devHoistPeerDepInfo.entries()).filter(item => !item[1].missing))
                    .filter(([name]) => !isDrcpSymlink || name !== '@wfh/plink')
                    .reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}) });
            // log.info(installJson)
            // const installedComp = scanInstalledPackage4Workspace(state.workspaces, state.srcPackages, wsKey);
            const existing = state.workspaces.get(wsKey);
            const hoistInfoSummary = {
                conflictDeps: [], missingDeps: {}, missingDevDeps: {}
            };
            for (const depsInfo of [hoistedDeps, hoistPeerDepInfo]) {
                for (const [dep, info] of depsInfo.entries()) {
                    if (info.missing) {
                        hoistInfoSummary.missingDeps[dep] = info.by[0].ver;
                    }
                    if (!info.sameVer && !info.direct) {
                        hoistInfoSummary.conflictDeps.push(dep);
                    }
                }
            }
            for (const depsInfo of [hoistedDevDeps, devHoistPeerDepInfo]) {
                for (const [dep, info] of depsInfo.entries()) {
                    if (info.missing) {
                        hoistInfoSummary.missingDevDeps[dep] = info.by[0].ver;
                    }
                    if (!info.sameVer && !info.direct) {
                        hoistInfoSummary.conflictDeps.push(dep);
                    }
                }
            }
            const wp = {
                id: wsKey,
                originInstallJson: pkjson,
                originInstallJsonStr: pkjsonStr,
                installJson,
                installJsonStr: JSON.stringify(installJson, null, '  '),
                linkedDependencies,
                linkedDevDependencies,
                hoistInfo: hoistedDeps,
                hoistPeerDepInfo,
                hoistDevInfo: hoistedDevDeps,
                hoistDevPeerDepInfo: devHoistPeerDepInfo,
                hoistInfoSummary
            };
            state.lastCreatedWorkspace = wsKey;
            state.workspaces.set(wsKey, existing ? Object.assign(existing, wp) : wp);
        },
        _installWorkspace(d, { payload: { workspaceKey } }) { },
        // _createSymlinksForWorkspace(d, action: PayloadAction<string>) {},
        _associatePackageToPrj(d, { payload: { prj, pkgs } }) {
            d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
        },
        _associatePackageToSrcDir(d, { payload: { pattern, pkgs } }) {
            d.srcDir2Packages.set(pathToProjKey(pattern), pkgs.map(pkgs => pkgs.name));
        }
    }
});
exports.actionDispatcher = store_1.stateFactory.bindActionCreators(exports.slice);
exports.updateGitIgnores = exports.actionDispatcher.updateGitIgnores, exports.onLinkedPackageAdded = exports.actionDispatcher.onLinkedPackageAdded;
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    const updatedWorkspaceSet = new Set();
    const packageAddedList = new Array();
    const gitIgnoreFilesWaiting = new Set();
    if (getState().srcDir2Packages == null) {
        // Because srcDir2Packages is newly added, to avoid existing project
        // being broken for missing it in previously stored state file
        exports.actionDispatcher._change(s => s.srcDir2Packages = new Map());
    }
    return rxjs_1.merge(
    // To override stored state. 
    // Do not put following logic in initialState! It will be overridden by previously saved state
    rxjs_1.of(1).pipe(operators_1.tap(() => process.nextTick(() => exports.actionDispatcher._updatePlinkPackageInfo())), operators_1.ignoreElements()), getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
        return pks;
    }), operators_1.ignoreElements()), getStore().pipe(operators_1.map(s => s.srcDir2Packages), operators_1.distinctUntilChanged(), operators_1.filter(v => v != null), operators_1.map((linkPatternMap) => {
        recipe_manager_1.setLinkPatterns(linkPatternMap.keys());
    })), getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.scan((prevMap, currMap) => {
        packageAddedList.splice(0);
        for (const nm of currMap.keys()) {
            if (!prevMap.has(nm)) {
                packageAddedList.push(nm);
            }
        }
        if (packageAddedList.length > 0)
            exports.onLinkedPackageAdded(packageAddedList);
        return currMap;
    })), 
    //  updateWorkspace
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateWorkspace), operators_1.concatMap(({ payload: { dir, isForce, createHook, packageJsonFiles } }) => {
        dir = path_1.default.resolve(dir);
        exports.actionDispatcher._setCurrentWorkspace(dir);
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/app-template.js'), path_1.default.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        if (isForce) {
            // Chaning installJsonStr to force action _installWorkspace being dispatched later
            const wsKey = workspaceKey(dir);
            if (getState().workspaces.has(wsKey)) {
                exports.actionDispatcher._change(d => {
                    // clean to trigger install action
                    const ws = d.workspaces.get(wsKey);
                    ws.installJsonStr = '';
                    ws.installJson.dependencies = {};
                    ws.installJson.devDependencies = {};
                    // tslint:disable-next-line: no-console
                    log.debug('force npm install in', wsKey);
                });
            }
        }
        // call initRootDirectory() and wait for it finished by observing action '_syncLinkedPackages',
        // then call _hoistWorkspaceDeps
        return rxjs_1.merge(packageJsonFiles != null ? scanAndSyncPackages(packageJsonFiles) :
            rxjs_1.defer(() => rxjs_1.of(initRootDirectory(createHook))), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncLinkedPackages), operators_1.take(1), operators_1.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.scanAndSyncPackages), operators_1.concatMap(({ payload }) => {
        return rxjs_1.merge(scanAndSyncPackages(payload.packageJsonFiles), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncLinkedPackages), operators_1.take(1), operators_1.tap(() => {
            const currWs = getState().currWorkspace;
            for (const wsKey of getState().workspaces.keys()) {
                if (wsKey !== currWs)
                    exports.actionDispatcher._hoistWorkspaceDeps({ dir: path_1.default.resolve(rootDir, wsKey) });
            }
            if (currWs != null) {
                // Make sure "current workspace" is the last one being updated, so that it remains "current"
                exports.actionDispatcher._hoistWorkspaceDeps({ dir: path_1.default.resolve(rootDir, currWs) });
            }
        })));
    })), 
    // initRootDir
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_1.map(({ payload }) => {
        checkAllWorkspaces();
        if (getState().workspaces.has(workspaceKey(misc_1.plinkEnv.workDir))) {
            exports.actionDispatcher.updateWorkspace({ dir: misc_1.plinkEnv.workDir,
                isForce: payload.isForce,
                createHook: payload.createHook });
        }
        else {
            const curr = getState().currWorkspace;
            if (curr != null) {
                if (getState().workspaces.has(curr)) {
                    const path = path_1.default.resolve(rootDir, curr);
                    exports.actionDispatcher.updateWorkspace({ dir: path, isForce: payload.isForce, createHook: payload.createHook });
                }
                else {
                    exports.actionDispatcher._setCurrentWorkspace(null);
                }
            }
        }
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_1.map(({ payload }) => {
        const wsKey = workspaceKey(payload.dir);
        // actionDispatcher.onWorkspacePackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated(wsKey));
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateDir), operators_1.tap(() => exports.actionDispatcher._updatePlinkPackageInfo()), operators_1.concatMap(() => scanAndSyncPackages()), operators_1.tap(() => {
        for (const key of getState().workspaces.keys()) {
            updateInstalledPackageForWorkspace(key);
        }
    })), 
    // Handle newly added workspace
    getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), operators_1.map(ws => {
        const keys = Array.from(ws.keys());
        return keys;
    }), operators_1.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            log.info('New workspace: ', newAdded);
            for (const ws of newAdded) {
                exports.actionDispatcher._installWorkspace({ workspaceKey: ws });
            }
        }
        return curr;
    }), operators_1.ignoreElements()), 
    // observe all existing Workspaces for dependency hoisting result 
    ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(operators_1.filter(s => s.workspaces.has(key)), operators_1.map(s => s.workspaces.get(key)), operators_1.distinctUntilChanged((s1, s2) => s1.installJson === s2.installJson), operators_1.scan((old, newWs) => {
            // tslint:disable: max-line-length
            const newDeps = Object.entries(newWs.installJson.dependencies || [])
                .concat(Object.entries(newWs.installJson.devDependencies || []))
                .map(entry => entry.join(': '));
            if (newDeps.length === 0) {
                // forcing install workspace, therefore dependencies is cleared at this moment
                return newWs;
            }
            const oldDeps = Object.entries(old.installJson.dependencies || [])
                .concat(Object.entries(old.installJson.devDependencies || []))
                .map(entry => entry.join(': '));
            if (newDeps.length !== oldDeps.length) {
                exports.actionDispatcher._installWorkspace({ workspaceKey: key });
                return newWs;
            }
            newDeps.sort();
            oldDeps.sort();
            for (let i = 0, l = newDeps.length; i < l; i++) {
                if (newDeps[i] !== oldDeps[i]) {
                    exports.actionDispatcher._installWorkspace({ workspaceKey: key });
                    break;
                }
            }
            return newWs;
        }), operators_1.ignoreElements());
    }), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace, exports.slice.actions.workspaceBatchChanged), operators_1.concatMap(action => {
        if (action.type === exports.slice.actions._installWorkspace.type) {
            const wsKey = action.payload.workspaceKey;
            return getStore().pipe(operators_1.map(s => s.workspaces.get(wsKey)), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null), operators_1.take(1), operators_1.concatMap(ws => installWorkspace(ws)), operators_1.map(() => {
                updateInstalledPackageForWorkspace(wsKey);
            }));
        }
        else {
            const wsKeys = action.payload;
            return rxjs_1.merge(...wsKeys.map(_createSymlinksForWorkspace));
        }
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.workspaceStateUpdated), operators_1.map(action => updatedWorkspaceSet.add(action.payload)), operators_1.debounceTime(800), operators_1.tap(() => {
        exports.actionDispatcher.workspaceBatchChanged(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
        // return from(writeConfigFiles());
    }), operators_1.map(() => __awaiter(void 0, void 0, void 0, function* () {
        exports.actionDispatcher.packagesUpdated();
    }))), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateGitIgnores), operators_1.tap(action => {
        let rel = action.payload.file;
        if (path_1.default.isAbsolute(rel)) {
            rel = path_1.default.relative(rootDir, rel).replace(/\\/g, '/');
        }
        gitIgnoreFilesWaiting.add(rel);
    }), operators_1.debounceTime(500), operators_1.map(() => {
        const changedFiles = [...gitIgnoreFilesWaiting.values()];
        gitIgnoreFilesWaiting.clear();
        return changedFiles;
    }), operators_1.concatMap((changedFiles) => {
        return rxjs_1.merge(...changedFiles.map((rel) => __awaiter(void 0, void 0, void 0, function* () {
            const file = path_1.default.resolve(rootDir, rel);
            const lines = getState().gitIgnores[file];
            if (fs_1.default.existsSync(file)) {
                const data = yield fs_1.default.promises.readFile(file, 'utf8');
                const existingLines = data.split(/\n\r?/).map(line => line.trim());
                const newLines = lodash_1.default.difference(lines, existingLines);
                if (newLines.length === 0)
                    return;
                fs_1.default.writeFile(file, data + os_1.EOL + newLines.join(os_1.EOL), () => {
                    // tslint:disable-next-line: no-console
                    log.info('Modify', file);
                });
            }
        })));
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_1.concatMap(() => scanAndSyncPackages()))).pipe(operators_1.ignoreElements(), operators_1.catchError(err => {
        log.error(err.stack ? err.stack : err);
        return rxjs_1.throwError(err);
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
    const relPath = path_1.default.relative(rootDir, path);
    return relPath.startsWith('..') ? path_1.default.resolve(path) : relPath;
}
exports.pathToProjKey = pathToProjKey;
function projKeyToPath(key) {
    return path_1.default.isAbsolute(key) ? key : path_1.default.resolve(rootDir, key);
}
exports.projKeyToPath = projKeyToPath;
function workspaceKey(path) {
    let rel = path_1.default.relative(rootDir, path_1.default.resolve(path));
    if (path_1.default.sep === '\\')
        rel = rel.replace(/\\/g, '/');
    return rel;
}
exports.workspaceKey = workspaceKey;
function workspaceDir(key) {
    return path_1.default.resolve(rootDir, key);
}
exports.workspaceDir = workspaceDir;
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
function getProjectList() {
    return Array.from(getState().project2Packages.keys()).map(pj => path_1.default.resolve(rootDir, pj));
}
exports.getProjectList = getProjectList;
function isCwdWorkspace() {
    const wsKey = workspaceKey(misc_1.plinkEnv.workDir);
    const ws = getState().workspaces.get(wsKey);
    if (ws == null)
        return false;
    return true;
}
exports.isCwdWorkspace = isCwdWorkspace;
/**
 * This method is meant to trigger editor-helper to update tsconfig files, so
 * editor-helper must be import at first
 * @param dir
 */
function switchCurrentWorkspace(dir) {
    exports.actionDispatcher._setCurrentWorkspace(dir);
    exports.actionDispatcher.workspaceBatchChanged([workspaceKey(dir)]);
}
exports.switchCurrentWorkspace = switchCurrentWorkspace;
function updateInstalledPackageForWorkspace(wsKey) {
    const pkgEntry = scanInstalledPackage4Workspace(getState(), wsKey);
    const installed = new Map((function* () {
        for (const pk of pkgEntry) {
            yield [pk.name, pk];
        }
    })());
    exports.actionDispatcher._change(d => d.workspaces.get(wsKey).installedComponents = installed);
    exports.actionDispatcher.workspaceStateUpdated(wsKey);
}
/**
 * Delete workspace state if its directory does not exist
 */
function checkAllWorkspaces() {
    for (const key of getState().workspaces.keys()) {
        const dir = path_1.default.resolve(rootDir, key);
        if (!fs_1.default.existsSync(dir)) {
            // tslint:disable-next-line: no-console
            log.info(`Workspace ${key} does not exist anymore.`);
            exports.actionDispatcher._change(d => d.workspaces.delete(key));
        }
    }
}
function initRootDirectory(createHook = false) {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug('initRootDirectory');
        const rootPath = rootDir;
        fs_extra_1.default.mkdirpSync(distDir);
        // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), rootDir + '/.gitignore');
        yield symlinks_1.default();
        const projectDirs = getProjectList();
        if (createHook) {
            projectDirs.forEach(prjdir => {
                _writeGitHook(prjdir);
                maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
            });
        }
        yield scanAndSyncPackages();
        // await _deleteUselessSymlink(Path.resolve(rootDir, 'node_modules'), new Set<string>());
    });
}
// async function writeConfigFiles() {
//   return (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
//     // tslint:disable-next-line: no-console
//     log.info('write config file:', file);
//     writeFile(Path.join(distDir, file),
//       '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
//   });
// }
function installWorkspace(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.resolve(rootDir, ws.id);
        try {
            yield installInDir(dir, ws.originInstallJsonStr, ws.installJsonStr);
        }
        catch (ex) {
            exports.actionDispatcher._change(d => {
                const wsd = d.workspaces.get(ws.id);
                wsd.installJsonStr = '';
                wsd.installJson.dependencies = {};
                wsd.installJson.devDependencies = {};
                const lockFile = path_1.default.resolve(dir, 'package-lock.json');
                if (fs_1.default.existsSync(lockFile)) {
                    // tslint:disable-next-line: no-console
                    log.info(`Problematic ${lockFile} is deleted, please try again`);
                    fs_1.default.unlinkSync(lockFile);
                }
            });
            throw ex;
        }
    });
}
function installInDir(dir, originPkgJsonStr, toInstallPkgJsonStr) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        log.info('Install dependencies in ' + dir);
        try {
            yield copyNpmrcToWorkspace(dir);
        }
        catch (e) {
            console.error(e);
        }
        const symlinksInModuleDir = [];
        const target = path_1.default.resolve(dir, 'node_modules');
        if (!fs_1.default.existsSync(target)) {
            fs_extra_1.default.mkdirpSync(target);
        }
        // 1. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
        // backup them for late recovery
        yield symlinks_1.listModuleSymlinks(target, link => {
            log.debug('Remove symlink', link);
            const linkContent = fs_1.default.readlinkSync(link);
            symlinksInModuleDir.push({ content: linkContent, link });
            return symlinks_1.unlinkAsync(link);
        });
        // 2. Run `npm install`
        const installJsonFile = path_1.default.resolve(dir, 'package.json');
        // tslint:disable-next-line: no-console
        log.info('write', installJsonFile);
        fs_1.default.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
        // save a lock file to indicate in-process of installing, once installation is completed without interruption, delete it.
        // check if there is existing lock file, meaning a previous installation is interrupted.
        const lockFile = path_1.default.resolve(dir, 'plink.install.lock');
        fs_1.default.promises.writeFile(lockFile, originPkgJsonStr);
        yield new Promise(resolve => setImmediate(resolve));
        // await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
            yield process_utils_2.exe('npm', 'install', {
                cwd: dir,
                env // Force development mode, otherwise "devDependencies" will not be installed
            }).promise;
            yield new Promise(resolve => setImmediate(resolve));
            yield process_utils_2.exe('npm', 'prune', { cwd: dir, env }).promise;
            // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
            // why, I have to add a setImmediate() between them to workaround
            yield new Promise(resolve => setImmediate(resolve));
            yield process_utils_2.exe('npm', 'ddp', { cwd: dir, env }).promise;
        }
        catch (e) {
            // tslint:disable-next-line: no-console
            log.error('Failed to install dependencies', e.stack);
            throw e;
        }
        finally {
            // tslint:disable-next-line: no-console
            log.info('Recover ' + installJsonFile);
            // 3. Recover package.json and symlinks deleted in Step.1.
            fs_1.default.writeFileSync(installJsonFile, originPkgJsonStr, 'utf8');
            fs_1.default.promises.unlink(lockFile);
            yield recoverSymlinks();
        }
        function recoverSymlinks() {
            return Promise.all(symlinksInModuleDir.map(({ content, link }) => {
                if (!fs_1.default.existsSync(link)) {
                    return fs_1.default.promises.symlink(content, link, symlinks_1.isWin32 ? 'junction' : 'dir');
                }
                return Promise.resolve();
            }));
        }
    });
}
exports.installInDir = installInDir;
function copyNpmrcToWorkspace(workspaceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const target = path_1.default.resolve(workspaceDir, '.npmrc');
        if (fs_1.default.existsSync(target))
            return;
        const isChina = yield getStore().pipe(operators_1.map(s => s.isInChina), operators_1.distinctUntilChanged(), operators_1.filter(cn => cn != null), operators_1.take(1)).toPromise();
        if (isChina) {
            // tslint:disable-next-line: no-console
            log.info('create .npmrc to', target);
            fs_1.default.copyFileSync(path_1.default.resolve(__dirname, '../../templates/npmrc-for-cn.txt'), target);
        }
    });
}
function scanAndSyncPackages(includePackageJsonFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const projPkgMap = new Map();
        const srcPkgMap = new Map();
        let pkgList;
        if (includePackageJsonFiles) {
            const prjKeys = Array.from(getState().project2Packages.keys());
            const prjDirs = prjKeys.map(prjKey => projKeyToPath(prjKey));
            pkgList = includePackageJsonFiles.map(jsonFile => {
                const info = createPackageInfo(jsonFile, false);
                const prjIdx = prjDirs.findIndex(dir => info.realPath.startsWith(dir + path_1.default.sep));
                if (prjIdx >= 0) {
                    const prjPackageNames = getState().project2Packages.get(prjKeys[prjIdx]);
                    if (!prjPackageNames.includes(info.name)) {
                        exports.actionDispatcher._associatePackageToPrj({
                            prj: prjKeys[prjIdx],
                            pkgs: [...prjPackageNames.map(name => ({ name })), info]
                        });
                    }
                }
                else {
                    const keys = [...getState().srcDir2Packages.keys()];
                    const linkedSrcDirs = keys.map(key => projKeyToPath(key));
                    const idx = linkedSrcDirs.findIndex(dir => info.realPath === dir || info.realPath.startsWith(dir + path_1.default.sep));
                    if (idx >= 0) {
                        const pkgs = getState().srcDir2Packages.get(keys[idx]);
                        if (!pkgs.includes(info.name)) {
                            exports.actionDispatcher._associatePackageToSrcDir({
                                pattern: keys[idx],
                                pkgs: [...pkgs.map(name => ({ name })), info]
                            });
                        }
                    }
                    else {
                        throw new Error(`${info.realPath} is not under any known Project directorys: ${prjDirs.concat(linkedSrcDirs).join(', ')}`);
                    }
                }
                return info;
            });
            exports.actionDispatcher._syncLinkedPackages([pkgList, 'update']);
        }
        else {
            const rm = (yield Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
            pkgList = [];
            yield rm.scanPackages().pipe(operators_1.tap(([proj, jsonFile, srcDir]) => {
                if (proj && !projPkgMap.has(proj))
                    projPkgMap.set(proj, []);
                if (proj == null && srcDir && !srcPkgMap.has(srcDir))
                    srcPkgMap.set(srcDir, []);
                const info = createPackageInfo(jsonFile, false);
                if (info.json.dr || info.json.plink) {
                    pkgList.push(info);
                    if (proj)
                        projPkgMap.get(proj).push(info);
                    else if (srcDir)
                        srcPkgMap.get(srcDir).push(info);
                    else
                        log.error(`Orphan ${jsonFile}`);
                }
                else {
                    log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`);
                }
            })).toPromise();
            for (const [prj, pkgs] of projPkgMap.entries()) {
                exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
            }
            for (const [srcDir, pkgs] of srcPkgMap.entries()) {
                exports.actionDispatcher._associatePackageToSrcDir({ pattern: srcDir, pkgs });
            }
            exports.actionDispatcher._syncLinkedPackages([pkgList, 'clean']);
        }
    });
}
function _createSymlinksForWorkspace(wsKey) {
    if (symlinkDirName !== '.links' && fs_1.default.existsSync(path_1.default.resolve(rootDir, wsKey, '.links'))) {
        fs_extra_1.default.remove(path_1.default.resolve(rootDir, wsKey, '.links'))
            .catch(ex => log.info(ex));
    }
    const symlinkDir = path_1.default.resolve(rootDir, wsKey, symlinkDirName || 'node_modules');
    fs_extra_1.default.mkdirpSync(symlinkDir);
    const ws = getState().workspaces.get(wsKey);
    const pkgNames = ws.linkedDependencies.map(item => item[0])
        .concat(ws.linkedDevDependencies.map(item => item[0]));
    const pkgNameSet = new Set(pkgNames);
    if (symlinkDirName !== 'node_modules') {
        if (ws.installedComponents) {
            for (const pname of ws.installedComponents.keys())
                pkgNameSet.add(pname);
        }
    }
    if (symlinkDirName !== 'node_modules') {
        exports.actionDispatcher.updateGitIgnores({
            file: path_1.default.resolve(rootDir, '.gitignore'),
            lines: [path_1.default.relative(rootDir, symlinkDir).replace(/\\/g, '/')]
        });
    }
    return rxjs_1.merge(rxjs_1.from(pkgNameSet.values()).pipe(operators_1.map(name => getState().srcPackages.get(name) || ws.installedComponents.get(name)), rwPackageJson_1.symbolicLinkPackages(symlinkDir)), _deleteUselessSymlink(symlinkDir, pkgNameSet));
}
function _deleteUselessSymlink(checkDir, excludeSet) {
    return __awaiter(this, void 0, void 0, function* () {
        const dones = [];
        const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
        const done1 = symlinks_1.listModuleSymlinks(checkDir, (link) => __awaiter(this, void 0, void 0, function* () {
            const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
            if (drcpName !== pkgName && !excludeSet.has(pkgName)) {
                // tslint:disable-next-line: no-console
                log.info(`Delete extraneous symlink: ${link}`);
                dones.push(fs_1.default.promises.unlink(link));
            }
        }));
        yield done1;
        yield Promise.all(dones);
    });
}
/**
 *
 * @param pkJsonFile package.json file path
 * @param isInstalled
 * @param symLink symlink path of package
 * @param realPath real path of package
 */
function createPackageInfo(pkJsonFile, isInstalled = false) {
    const json = JSON.parse(fs_1.default.readFileSync(pkJsonFile, 'utf8'));
    return createPackageInfoWithJson(pkJsonFile, json, isInstalled);
}
exports.createPackageInfo = createPackageInfo;
/**
 * List those installed packages which are referenced by workspace package.json file,
 * those packages must have "dr" property in package.json
 * @param workspaceKey
 */
function* scanInstalledPackage4Workspace(state, workspaceKey) {
    const originInstallJson = state.workspaces.get(workspaceKey).originInstallJson;
    // const depJson = process.env.NODE_ENV === 'production' ? [originInstallJson.dependencies] :
    //   [originInstallJson.dependencies, originInstallJson.devDependencies];
    for (const deps of [originInstallJson.dependencies, originInstallJson.devDependencies]) {
        if (deps == null)
            continue;
        for (const dep of Object.keys(deps)) {
            if (!state.srcPackages.has(dep) && dep !== '@wfh/plink') {
                const pkjsonFile = path_1.default.resolve(rootDir, workspaceKey, 'node_modules', dep, 'package.json');
                if (fs_1.default.existsSync(pkjsonFile)) {
                    const pk = createPackageInfo(path_1.default.resolve(rootDir, workspaceKey, 'node_modules', dep, 'package.json'), true);
                    if (pk.json.dr || pk.json.plink) {
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
function createPackageInfoWithJson(pkJsonFile, json, isInstalled = false) {
    const m = moduleNameReg.exec(json.name);
    const pkInfo = {
        shortName: m[2],
        name: json.name,
        scope: m[1],
        path: path_1.default.join(symlinkDirName, json.name),
        json,
        realPath: fs_1.default.realpathSync(path_1.default.dirname(pkJsonFile)),
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
        to = path_1.default.relative(misc_1.plinkEnv.workDir, to);
    // tslint:disable-next-line: no-console
    log.info('Copy to %s', chalk_1.default.cyan(to));
}
/**
 *
 * @param from absolute path
 * @param {string} to relative to rootPath
 */
function maybeCopyTemplate(from, to) {
    if (!fs_1.default.existsSync(path_1.default.resolve(rootDir, to)))
        cp(path_1.default.resolve(__dirname, from), to);
}
function _writeGitHook(project) {
    // if (!isWin32) {
    const gitPath = path_1.default.resolve(project, '.git/hooks');
    if (fs_1.default.existsSync(gitPath)) {
        const hookStr = '#!/bin/sh\n' +
            `cd "${rootDir}"\n` +
            // 'drcp init\n' +
            // 'npx pretty-quick --staged\n' + // Use `tslint --fix` instead.
            `plink lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
        if (fs_1.default.existsSync(gitPath + '/pre-commit'))
            fs_1.default.unlinkSync(gitPath + '/pre-commit');
        fs_1.default.writeFileSync(gitPath + '/pre-push', hookStr);
        // tslint:disable-next-line: no-console
        log.info('Write ' + gitPath + '/pre-push');
        if (!symlinks_1.isWin32) {
            process_utils_1.spawn('chmod', '-R', '+x', project + '/.git/hooks/pre-push');
        }
    }
    // }
}
function deleteDuplicatedInstalledPkg(workspaceKey) {
    const wsState = getState().workspaces.get(workspaceKey);
    const doNothing = () => { };
    wsState.linkedDependencies.concat(wsState.linkedDevDependencies).map(([pkgName]) => {
        const dir = path_1.default.resolve(rootDir, workspaceKey, 'node_modules', pkgName);
        return fs_1.default.promises.lstat(dir)
            .then((stat) => {
            if (!stat.isSymbolicLink()) {
                // tslint:disable-next-line: no-console
                log.info(`Previous installed ${path_1.default.relative(rootDir, dir)} is deleted, due to linked package ${pkgName}`);
                return fs_1.default.promises.unlink(dir);
            }
        })
            .catch(doNothing);
    });
}
// /**
//    * If a source code package uses Plink's __plink API ( like `.logger`) or extends Plink's command line,
//    * they need ensure some Plink's dependencies are installed as 1st level dependency in their workspace,
//    * otherwise Visual Code Editor can not find correct type definitions while referencing Plink's logger or
//    * Command interface.
//    * 
//    * So I need to make sure these dependencies are installed in each workspace
//    */
// function plinkApiRequiredDeps(): PackageJsonInterf {
//   const plinkJson: PackageJsonInterf = require('@wfh/plink/package.json');
//   const fakeJson: PackageJsonInterf = {
//     version: plinkJson.version,
//     name: plinkJson.name,
//     dependencies: {}
//   };
//   for (const dep of ['commander', 'log4js']) {
//     const version = plinkJson.dependencies![dep];
//     fakeJson.dependencies![dep] = version;
//   }
//   return fakeJson;
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCxrREFBMEI7QUFDMUIsd0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFxRTtBQUNyRSw4Q0FDaUY7QUFDakYsc0VBQWlHO0FBQ2pHLG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQW1FO0FBQ25FLG9DQUF5RDtBQUN6RCw4Q0FBOEM7QUFDOUMsOERBQW1HO0FBQ25HLG9EQUFzRDtBQUN0RCwyQkFBeUI7QUFDekIsbUNBQWlDO0FBQ2pDLHdDQUF5QztBQUN6QyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFtQzNDLE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTdFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsTUFBTSxFQUFFLEtBQUs7SUFDYixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDM0IsZUFBZSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQzFCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztDQUMxQixDQUFDO0FBZ0NXLFFBQUEsS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ3pDLElBQUksRUFBRSxFQUFFO0lBQ1Is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LEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDMUcsT0FBTyxZQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxNQUFNO0FBQ04sNEdBQTRHO0FBQzVHLDRHQUE0RztBQUM1Ryw4R0FBOEc7QUFDOUcsMEJBQTBCO0FBQzFCLFFBQVE7QUFDUixpRkFBaUY7QUFDakYsUUFBUTtBQUVSLHVEQUF1RDtBQUN2RCw2RUFBNkU7QUFDN0UsMENBQTBDO0FBQzFDLGtDQUFrQztBQUNsQyw0QkFBNEI7QUFDNUIsdUJBQXVCO0FBQ3ZCLE9BQU87QUFDUCxpREFBaUQ7QUFDakQsb0RBQW9EO0FBQ3BELDZDQUE2QztBQUM3QyxNQUFNO0FBQ04scUJBQXFCO0FBQ3JCLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVuZm9ydHVuYXRlbHksIHRoaXMgZmlsZSBpcyB2ZXJ5IGxvbmcsIHlvdSBuZWVkIHRvIGZvbGQgYnkgaW5kZW50aW9uIGZvciBiZXR0ZXIgdmlldyBvZiBzb3VyY2UgY29kZSBpbiBFZGl0b3JcbiAqL1xuXG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgT2JzZXJ2YWJsZSwgb2YsIGRlZmVyLCB0aHJvd0Vycm9yfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgZGVib3VuY2VUaW1lLFxuICB0YWtlLCBjb25jYXRNYXAsIGlnbm9yZUVsZW1lbnRzLCBzY2FuLCBjYXRjaEVycm9yLCB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBsaXN0Q29tcERlcGVuZGVuY3ksIFBhY2thZ2VKc29uSW50ZXJmLCBEZXBlbmRlbnRJbmZvIH0gZnJvbSAnLi4vdHJhbnNpdGl2ZS1kZXAtaG9pc3Rlcic7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBzZXRQcm9qZWN0TGlzdCwgc2V0TGlua1BhdHRlcm5zfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQgeyBFT0wgfSBmcm9tICdvcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7IHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyJyk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICAvKiogQmUgYXdhcmU6IElmIHRoaXMgcHJvcGVydHkgaXMgbm90IHNhbWUgYXMgXCJyZWFsUGF0aFwiLFxuICAgKiB0aGVuIGl0IGlzIGEgc3ltbGluayB3aG9zZSBwYXRoIGlzIHJlbGF0aXZlIHRvIHdvcmtzcGFjZSBkaXJlY3RvcnkgKi9cbiAgcGF0aDogc3RyaW5nO1xuICByZWFsUGF0aDogc3RyaW5nO1xuICBpc0luc3RhbGxlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc1N0YXRlIHtcbiAgaW5pdGVkOiBib29sZWFuO1xuICBzcmNQYWNrYWdlczogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuICAvKiogS2V5IGlzIHJlbGF0aXZlIHBhdGggdG8gcm9vdCB3b3Jrc3BhY2UgKi9cbiAgd29ya3NwYWNlczogTWFwPHN0cmluZywgV29ya3NwYWNlU3RhdGU+O1xuICAvKioga2V5IG9mIGN1cnJlbnQgXCJ3b3Jrc3BhY2VzXCIgKi9cbiAgY3VycldvcmtzcGFjZT86IHN0cmluZyB8IG51bGw7XG4gIHByb2plY3QyUGFja2FnZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgc3JjRGlyMlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIC8qKiBEcmNwIGlzIHRoZSBvcmlnaW5hbCBuYW1lIG9mIFBsaW5rIHByb2plY3QgKi9cbiAgbGlua2VkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbGlua2VkRHJjcFByb2plY3Q/OiBzdHJpbmcgfCBudWxsO1xuICBpbnN0YWxsZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgaXNJbkNoaW5hPzogYm9vbGVhbjtcbiAgLyoqIEV2ZXJ5dGltZSBhIGhvaXN0IHdvcmtzcGFjZSBzdGF0ZSBjYWxjdWxhdGlvbiBpcyBiYXNpY2FsbHkgZG9uZSwgaXQgaXMgaW5jcmVhc2VkIGJ5IDEgKi9cbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICAvKiogd29ya3NwYWNlIGtleSAqL1xuICBsYXN0Q3JlYXRlZFdvcmtzcGFjZT86IHN0cmluZztcbn1cblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXIsIHBsaW5rRGlyLCBpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcblxuY29uc3QgTlMgPSAncGFja2FnZXMnO1xuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmNvbnN0IHN0YXRlOiBQYWNrYWdlc1N0YXRlID0ge1xuICBpbml0ZWQ6IGZhbHNlLFxuICB3b3Jrc3BhY2VzOiBuZXcgTWFwKCksXG4gIHByb2plY3QyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjRGlyMlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGdpdElnbm9yZXM6IHt9LFxuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogMCxcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogMFxufTtcblxuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VTdGF0ZSB7XG4gIGlkOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2UgbGlua2VkIHNvdXJjZSBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLyoqIG5hbWVzIG9mIHRob3NlIGxpbmtlZCBzb3VyY2UgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG5cbiAgLyoqIGluc3RhbGxlZCBEUiBjb21wb25lbnQgcGFja2FnZXMgW25hbWUsIHZlcnNpb25dKi9cbiAgaW5zdGFsbGVkQ29tcG9uZW50cz86IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcblxuICBob2lzdEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdFBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdERldkluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdERldlBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdEluZm9TdW1tYXJ5Pzoge1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRldkRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGV2RGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiB2ZXJzaW9ucyBhcmUgY29uZmxpY3QgKi9cbiAgICBjb25mbGljdERlcHM6IHN0cmluZ1tdO1xuICB9O1xufVxuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiBOUyxcbiAgaW5pdGlhbFN0YXRlOiBzdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogRG8gdGhpcyBhY3Rpb24gYWZ0ZXIgYW55IGxpbmtlZCBwYWNrYWdlIGlzIHJlbW92ZWQgb3IgYWRkZWQgICovXG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtpc0ZvcmNlOiBib29sZWFuLCBjcmVhdGVIb29rOiBib29sZWFufT4pIHt9LFxuXG4gICAgLyoqIFxuICAgICAqIC0gQ3JlYXRlIGluaXRpYWwgZmlsZXMgaW4gcm9vdCBkaXJlY3RvcnlcbiAgICAgKiAtIFNjYW4gbGlua2VkIHBhY2thZ2VzIGFuZCBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgICAqIC0gU3dpdGNoIHRvIGRpZmZlcmVudCB3b3Jrc3BhY2VcbiAgICAgKiAtIERlbGV0ZSBub25leGlzdGluZyB3b3Jrc3BhY2VcbiAgICAgKiAtIElmIFwicGFja2FnZUpzb25GaWxlc1wiIGlzIHByb3ZpZGVkLCBpdCBzaG91bGQgc2tpcCBzdGVwIG9mIHNjYW5uaW5nIGxpbmtlZCBwYWNrYWdlc1xuICAgICAqIC0gVE9ETzogaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgaG9pc3QgYW5kIGluc3RhbGwgZm9yIHRoZW0gYWxsP1xuICAgICAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nLFxuICAgICAgaXNGb3JjZTogYm9vbGVhbiwgY3JlYXRlSG9vazogYm9vbGVhbiwgcGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHtcbiAgICB9LFxuICAgIHNjYW5BbmRTeW5jUGFja2FnZXMoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtwYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW119Pikge30sXG5cbiAgICB1cGRhdGVEaXIoKSB7fSxcbiAgICBfdXBkYXRlUGxpbmtQYWNrYWdlSW5mbyhkKSB7XG4gICAgICBjb25zdCBwbGlua1BrZyA9IGNyZWF0ZVBhY2thZ2VJbmZvKFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3BhY2thZ2UuanNvbicpLCBmYWxzZSk7XG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICBkLmxpbmtlZERyY3AgPSBwbGlua1BrZztcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5saW5rZWREcmNwUHJvamVjdCA9IHBhdGhUb1Byb2pLZXkoUGF0aC5kaXJuYW1lKGQubGlua2VkRHJjcCEucmVhbFBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQubGlua2VkRHJjcCA9IG51bGw7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IHBsaW5rUGtnO1xuICAgICAgICBkLmxpbmtlZERyY3BQcm9qZWN0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFtwa2dzOiBQYWNrYWdlSW5mb1tdLCBvcGVyYXRvcjogJ3VwZGF0ZScgfCAnY2xlYW4nXT4pIHtcbiAgICAgIGQuaW5pdGVkID0gdHJ1ZTtcbiAgICAgIGxldCBtYXAgPSBkLnNyY1BhY2thZ2VzO1xuICAgICAgaWYgKHBheWxvYWRbMV0gPT09ICdjbGVhbicpIHtcbiAgICAgICAgbWFwID0gZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXAoKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWRbMF0pIHtcbiAgICAgICAgbWFwLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBhZGRTcmNEaXJzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnNyY0RpcjJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlU3JjRGlycyhkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLyoqIHBheWxvYWQ6IHdvcmtzcGFjZSBrZXlzLCBoYXBwZW5zIGFzIGRlYm91bmNlZCB3b3Jrc3BhY2UgY2hhbmdlIGV2ZW50ICovXG4gICAgd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIHVwZGF0ZUdpdElnbm9yZXMoZCwge3BheWxvYWQ6IHtmaWxlLCBsaW5lc319OiBQYXlsb2FkQWN0aW9uPHtmaWxlOiBzdHJpbmcsIGxpbmVzOiBzdHJpbmdbXX0+KSB7XG4gICAgICBsZXQgcmVsID0gZmlsZSwgYWJzID0gZmlsZTtcbiAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUoZmlsZSkpIHtcbiAgICAgICAgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGFicyA9IGZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhYnMgPSBQYXRoLnJlc29sdmUocm9vdERpciwgZmlsZSk7XG4gICAgICB9XG4gICAgICBpZiAoZC5naXRJZ25vcmVzW2Fic10pIHtcbiAgICAgICAgZGVsZXRlIGQuZ2l0SWdub3Jlc1thYnNdO1xuICAgICAgfVxuICAgICAgZC5naXRJZ25vcmVzW3JlbF0gPSBsaW5lcy5tYXAobGluZSA9PiBsaW5lLnN0YXJ0c1dpdGgoJy8nKSA/IGxpbmUgOiAnLycgKyBsaW5lKTtcbiAgICB9LFxuICAgIHBhY2thZ2VzVXBkYXRlZChkKSB7XG4gICAgICBkLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0rKztcbiAgICB9LFxuICAgIHNldEluQ2hpbmEoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGJvb2xlYW4+KSB7XG4gICAgICBkLmlzSW5DaGluYSA9IHBheWxvYWQ7XG4gICAgfSxcbiAgICBfc2V0Q3VycmVudFdvcmtzcGFjZShkLCB7cGF5bG9hZDogZGlyfTogUGF5bG9hZEFjdGlvbjxzdHJpbmcgfCBudWxsPikge1xuICAgICAgaWYgKGRpciAhPSBudWxsKVxuICAgICAgICBkLmN1cnJXb3Jrc3BhY2UgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gbnVsbDtcbiAgICB9LFxuICAgIC8qKiBwYXJhbXRlcjogd29ya3NwYWNlIGtleSAqL1xuICAgIHdvcmtzcGFjZVN0YXRlVXBkYXRlZChkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSArPSAxO1xuICAgIH0sXG4gICAgLy8gb25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZChkLCB7cGF5bG9hZDogd29ya3NwYWNlS2V5fTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7fSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuXG4gICAgICBsZXQgcGtqc29uU3RyOiBzdHJpbmc7XG4gICAgICBjb25zdCBwa2dqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKCdQbGluayBpbml0L3N5bmMgcHJvY2VzcyB3YXMgaW50ZXJydXB0ZWQgbGFzdCB0aW1lLCByZWNvdmVyIGNvbnRlbnQgb2YgJyArIHBrZ2pzb25GaWxlKTtcbiAgICAgICAgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKGxvY2tGaWxlLCAndXRmOCcpO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhwa2dqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIC8vIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRldkRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgICAgLy8gY29uc3QgdXBkYXRpbmdEZXZEZXBzID0gey4uLnBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiB0eXBlb2YgZGV2RGVwcyA9IFtdO1xuICAgICAgZGV2RGVwcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgY29uc3Qge2hvaXN0ZWQ6IGhvaXN0ZWREZXBzLCBob2lzdGVkUGVlcnM6IGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0ZWREZXY6IGhvaXN0ZWREZXZEZXBzLCBob2lzdGVkRGV2UGVlcnM6IGRldkhvaXN0UGVlckRlcEluZm9cbiAgICAgIH0gPVxuICAgICAgICBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSwgcGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSwgcGtqc29uLmRldkRlcGVuZGVuY2llc1xuICAgICAgKTtcblxuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLmZpbHRlcigoW25hbWVdKSA9PiAhaXNEcmNwU3ltbGluayB8fCBuYW1lICE9PSAnQHdmaC9wbGluaycpXG4gICAgICAgIC5yZWR1Y2UoKGRpYywgW25hbWUsIGluZm9dKSA9PiB7XG4gICAgICAgICAgZGljW25hbWVdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgcmV0dXJuIGRpYztcbiAgICAgICAgfSwge30gYXMge1trZXk6IHN0cmluZ106IHN0cmluZ30pLFxuXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGV2RGVwcy5lbnRyaWVzKCkpXG4gICAgICAgIC5jb25jYXQoQXJyYXkuZnJvbShkZXZIb2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkuZmlsdGVyKGl0ZW0gPT4gIWl0ZW1bMV0ubWlzc2luZykpXG4gICAgICAgIC5maWx0ZXIoKFtuYW1lXSkgPT4gIWlzRHJjcFN5bWxpbmsgfHwgbmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KVxuICAgICAgfTtcblxuICAgICAgLy8gbG9nLmluZm8oaW5zdGFsbEpzb24pXG4gICAgICAvLyBjb25zdCBpbnN0YWxsZWRDb21wID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKHN0YXRlLndvcmtzcGFjZXMsIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSk7XG5cbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gc3RhdGUud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuXG4gICAgICBjb25zdCBob2lzdEluZm9TdW1tYXJ5OiBXb3Jrc3BhY2VTdGF0ZVsnaG9pc3RJbmZvU3VtbWFyeSddID0ge1xuICAgICAgICBjb25mbGljdERlcHM6IFtdLCBtaXNzaW5nRGVwczoge30sIG1pc3NpbmdEZXZEZXBzOiB7fVxuICAgICAgfTtcblxuICAgICAgZm9yIChjb25zdCBkZXBzSW5mbyBvZiBbaG9pc3RlZERlcHMsIGhvaXN0UGVlckRlcEluZm9dKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2RlcCwgaW5mb10gb2YgZGVwc0luZm8uZW50cmllcygpKSB7XG4gICAgICAgICAgaWYgKGluZm8ubWlzc2luZykge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5taXNzaW5nRGVwc1tkZXBdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaW5mby5zYW1lVmVyICYmICFpbmZvLmRpcmVjdCkge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5jb25mbGljdERlcHMucHVzaChkZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkZXBzSW5mbyBvZiBbaG9pc3RlZERldkRlcHMsIGRldkhvaXN0UGVlckRlcEluZm9dKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2RlcCwgaW5mb10gb2YgZGVwc0luZm8uZW50cmllcygpKSB7XG4gICAgICAgICAgaWYgKGluZm8ubWlzc2luZykge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5taXNzaW5nRGV2RGVwc1tkZXBdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaW5mby5zYW1lVmVyICYmICFpbmZvLmRpcmVjdCkge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5jb25mbGljdERlcHMucHVzaChkZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB3cDogV29ya3NwYWNlU3RhdGUgPSB7XG4gICAgICAgIGlkOiB3c0tleSxcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb246IHBranNvbixcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHBranNvblN0cixcbiAgICAgICAgaW5zdGFsbEpzb24sXG4gICAgICAgIGluc3RhbGxKc29uU3RyOiBKU09OLnN0cmluZ2lmeShpbnN0YWxsSnNvbiwgbnVsbCwgJyAgJyksXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcyxcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLFxuICAgICAgICBob2lzdEluZm86IGhvaXN0ZWREZXBzLFxuICAgICAgICBob2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdERldkluZm86IGhvaXN0ZWREZXZEZXBzLFxuICAgICAgICBob2lzdERldlBlZXJEZXBJbmZvOiBkZXZIb2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdEluZm9TdW1tYXJ5XG4gICAgICB9O1xuICAgICAgc3RhdGUubGFzdENyZWF0ZWRXb3Jrc3BhY2UgPSB3c0tleTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXMuc2V0KHdzS2V5LCBleGlzdGluZyA/IE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHdwKSA6IHdwKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKGQsIHtwYXlsb2FkOiB7d29ya3NwYWNlS2V5fX06IFBheWxvYWRBY3Rpb248e3dvcmtzcGFjZUtleTogc3RyaW5nfT4pIHt9LFxuICAgIC8vIF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1ByaihkLCB7cGF5bG9hZDoge3ByaiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwcmo6IHN0cmluZzsgcGtnczoge25hbWU6IHN0cmluZ31bXX0+KSB7XG4gICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocHJqKSwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoZCxcbiAgICAgIHtwYXlsb2FkOiB7cGF0dGVybiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwYXR0ZXJuOiBzdHJpbmc7IHBrZ3M6IHtuYW1lOiBzdHJpbmd9W119Pikge1xuICAgICAgZC5zcmNEaXIyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocGF0dGVybiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbmV4cG9ydCBjb25zdCB7dXBkYXRlR2l0SWdub3Jlcywgb25MaW5rZWRQYWNrYWdlQWRkZWR9ID0gYWN0aW9uRGlzcGF0Y2hlcjtcblxuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgY29uc3QgdXBkYXRlZFdvcmtzcGFjZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlQWRkZWRMaXN0ID0gbmV3IEFycmF5PHN0cmluZz4oKTtcblxuICBjb25zdCBnaXRJZ25vcmVGaWxlc1dhaXRpbmcgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBpZiAoZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMgPT0gbnVsbCkge1xuICAgIC8vIEJlY2F1c2Ugc3JjRGlyMlBhY2thZ2VzIGlzIG5ld2x5IGFkZGVkLCB0byBhdm9pZCBleGlzdGluZyBwcm9qZWN0XG4gICAgLy8gYmVpbmcgYnJva2VuIGZvciBtaXNzaW5nIGl0IGluIHByZXZpb3VzbHkgc3RvcmVkIHN0YXRlIGZpbGVcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnNyY0RpcjJQYWNrYWdlcyA9IG5ldyBNYXAoKSk7XG4gIH1cbiAgcmV0dXJuIG1lcmdlKFxuICAgIC8vIFRvIG92ZXJyaWRlIHN0b3JlZCBzdGF0ZS4gXG4gICAgLy8gRG8gbm90IHB1dCBmb2xsb3dpbmcgbG9naWMgaW4gaW5pdGlhbFN0YXRlISBJdCB3aWxsIGJlIG92ZXJyaWRkZW4gYnkgcHJldmlvdXNseSBzYXZlZCBzdGF0ZVxuXG4gICAgb2YoMSkucGlwZSh0YXAoKCkgPT4gcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQbGlua1BhY2thZ2VJbmZvKCkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChwa3MgPT4ge1xuICAgICAgICBzZXRQcm9qZWN0TGlzdChnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgICAgcmV0dXJuIHBrcztcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5zcmNEaXIyUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGZpbHRlcih2ID0+IHYgIT0gbnVsbCksXG4gICAgICBtYXAoKGxpbmtQYXR0ZXJuTWFwKSA9PiB7XG4gICAgICAgIHNldExpbmtQYXR0ZXJucyhsaW5rUGF0dGVybk1hcC5rZXlzKCkpO1xuICAgICAgfSkpLFxuXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNjYW48UGFja2FnZXNTdGF0ZVsnc3JjUGFja2FnZXMnXT4oKHByZXZNYXAsIGN1cnJNYXApID0+IHtcbiAgICAgICAgcGFja2FnZUFkZGVkTGlzdC5zcGxpY2UoMCk7XG4gICAgICAgIGZvciAoY29uc3Qgbm0gb2YgY3Vyck1hcC5rZXlzKCkpIHtcbiAgICAgICAgICBpZiAoIXByZXZNYXAuaGFzKG5tKSkge1xuICAgICAgICAgICAgcGFja2FnZUFkZGVkTGlzdC5wdXNoKG5tKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhY2thZ2VBZGRlZExpc3QubGVuZ3RoID4gMClcbiAgICAgICAgICBvbkxpbmtlZFBhY2thZ2VBZGRlZChwYWNrYWdlQWRkZWRMaXN0KTtcbiAgICAgICAgcmV0dXJuIGN1cnJNYXA7XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gIHVwZGF0ZVdvcmtzcGFjZVxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVXb3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZDoge2RpciwgaXNGb3JjZSwgY3JlYXRlSG9vaywgcGFja2FnZUpzb25GaWxlc319KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKGRpcik7XG4gICAgICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvYXBwLXRlbXBsYXRlLmpzJyksIFBhdGgucmVzb2x2ZShkaXIsICdhcHAuanMnKSk7XG4gICAgICAgIGNoZWNrQWxsV29ya3NwYWNlcygpO1xuICAgICAgICBpZiAoaXNGb3JjZSkge1xuICAgICAgICAgIC8vIENoYW5pbmcgaW5zdGFsbEpzb25TdHIgdG8gZm9yY2UgYWN0aW9uIF9pbnN0YWxsV29ya3NwYWNlIGJlaW5nIGRpc3BhdGNoZWQgbGF0ZXJcbiAgICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICAvLyBjbGVhbiB0byB0cmlnZ2VyIGluc3RhbGwgYWN0aW9uXG4gICAgICAgICAgICAgIGNvbnN0IHdzID0gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgd3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICBsb2cuZGVidWcoJ2ZvcmNlIG5wbSBpbnN0YWxsIGluJywgd3NLZXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNhbGwgaW5pdFJvb3REaXJlY3RvcnkoKSBhbmQgd2FpdCBmb3IgaXQgZmluaXNoZWQgYnkgb2JzZXJ2aW5nIGFjdGlvbiAnX3N5bmNMaW5rZWRQYWNrYWdlcycsXG4gICAgICAgIC8vIHRoZW4gY2FsbCBfaG9pc3RXb3Jrc3BhY2VEZXBzXG4gICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICBwYWNrYWdlSnNvbkZpbGVzICE9IG51bGwgPyBzY2FuQW5kU3luY1BhY2thZ2VzKHBhY2thZ2VKc29uRmlsZXMpOlxuICAgICAgICAgICAgZGVmZXIoKCkgPT4gb2YoaW5pdFJvb3REaXJlY3RvcnkoY3JlYXRlSG9vaykpKSxcbiAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY0xpbmtlZFBhY2thZ2VzKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICBtYXAoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXJ9KSlcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5zY2FuQW5kU3luY1BhY2thZ2VzKSxcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICBzY2FuQW5kU3luY1BhY2thZ2VzKHBheWxvYWQucGFja2FnZUpzb25GaWxlcyksXG4gICAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX3N5bmNMaW5rZWRQYWNrYWdlcyksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY3VycldzID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAod3NLZXkgIT09IGN1cnJXcylcbiAgICAgICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyOiBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXkpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGN1cnJXcyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIFwiY3VycmVudCB3b3Jrc3BhY2VcIiBpcyB0aGUgbGFzdCBvbmUgYmVpbmcgdXBkYXRlZCwgc28gdGhhdCBpdCByZW1haW5zIFwiY3VycmVudFwiXG4gICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCBjdXJyV3MpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIpLFxuICAgICAgbWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKSkpIHtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwbGlua0Vudi53b3JrRGlyLFxuICAgICAgICAgICAgaXNGb3JjZTogcGF5bG9hZC5pc0ZvcmNlLFxuICAgICAgICAgICAgY3JlYXRlSG9vazogcGF5bG9hZC5jcmVhdGVIb29rfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY3VyciA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgICAgICBpZiAoY3VyciAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyhjdXJyKSkge1xuICAgICAgICAgICAgICBjb25zdCBwYXRoID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnIpO1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwYXRoLCBpc0ZvcmNlOiBwYXlsb2FkLmlzRm9yY2UsIGNyZWF0ZUhvb2s6IHBheWxvYWQuY3JlYXRlSG9va30pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gICAgICAgIC8vIGFjdGlvbkRpc3BhdGNoZXIub25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG4gICAgICAgIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod3NLZXkpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQod3NLZXkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudXBkYXRlRGlyKSxcbiAgICAgIHRhcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQbGlua1BhY2thZ2VJbmZvKCkpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZShrZXkpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gSGFuZGxlIG5ld2x5IGFkZGVkIHdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKHdzLmtleXMoKSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSksXG4gICAgICBzY2FuPHN0cmluZ1tdPigocHJldiwgY3VycikgPT4ge1xuICAgICAgICBpZiAocHJldi5sZW5ndGggPCBjdXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGxvZy5pbmZvKCdOZXcgd29ya3NwYWNlOiAnLCBuZXdBZGRlZCk7XG4gICAgICAgICAgZm9yIChjb25zdCB3cyBvZiBuZXdBZGRlZCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiB3c30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLy8gb2JzZXJ2ZSBhbGwgZXhpc3RpbmcgV29ya3NwYWNlcyBmb3IgZGVwZW5kZW5jeSBob2lzdGluZyByZXN1bHQgXG4gICAgLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIGZpbHRlcihzID0+IHMud29ya3NwYWNlcy5oYXMoa2V5KSksXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5pbnN0YWxsSnNvbiA9PT0gczIuaW5zdGFsbEpzb24pLFxuICAgICAgICBzY2FuPFdvcmtzcGFjZVN0YXRlPigob2xkLCBuZXdXcykgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICBjb25zdCBuZXdEZXBzID0gT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIGZvcmNpbmcgaW5zdGFsbCB3b3Jrc3BhY2UsIHRoZXJlZm9yZSBkZXBlbmRlbmNpZXMgaXMgY2xlYXJlZCBhdCB0aGlzIG1vbWVudFxuICAgICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBvbGREZXBzID0gT2JqZWN0LmVudHJpZXMob2xkLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMob2xkLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuXG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoICE9PSBvbGREZXBzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RGVwcy5zb3J0KCk7XG4gICAgICAgICAgb2xkRGVwcy5zb3J0KCk7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuZXdEZXBzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5ld0RlcHNbaV0gIT09IG9sZERlcHNbaV0pIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgfSksXG4gICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlLCBzbGljZS5hY3Rpb25zLndvcmtzcGFjZUJhdGNoQ2hhbmdlZCksXG4gICAgICBjb25jYXRNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKGFjdGlvbi50eXBlID09PSBzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlLnR5cGUpIHtcbiAgICAgICAgICBjb25zdCB3c0tleSA9IChhY3Rpb24ucGF5bG9hZCBhcyBQYXJhbWV0ZXJzPHR5cGVvZiBzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlPlswXSkud29ya3NwYWNlS2V5O1xuICAgICAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSksXG4gICAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgICAgZmlsdGVyKHdzID0+IHdzICE9IG51bGwpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIGNvbmNhdE1hcCh3cyA9PiBpbnN0YWxsV29ya3NwYWNlKHdzISkpLFxuICAgICAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXlzID0gYWN0aW9uLnBheWxvYWQgYXMgUGFyYW1ldGVyczx0eXBlb2Ygc2xpY2UuYWN0aW9ucy53b3Jrc3BhY2VCYXRjaENoYW5nZWQ+WzBdO1xuICAgICAgICAgIHJldHVybiBtZXJnZSguLi53c0tleXMubWFwKF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZSkpOyBcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ya3NwYWNlU3RhdGVVcGRhdGVkKSxcbiAgICAgIG1hcChhY3Rpb24gPT4gdXBkYXRlZFdvcmtzcGFjZVNldC5hZGQoYWN0aW9uLnBheWxvYWQpKSxcbiAgICAgIGRlYm91bmNlVGltZSg4MDApLFxuICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VCYXRjaENoYW5nZWQoQXJyYXkuZnJvbSh1cGRhdGVkV29ya3NwYWNlU2V0LnZhbHVlcygpKSk7XG4gICAgICAgIHVwZGF0ZWRXb3Jrc3BhY2VTZXQuY2xlYXIoKTtcbiAgICAgICAgLy8gcmV0dXJuIGZyb20od3JpdGVDb25maWdGaWxlcygpKTtcbiAgICAgIH0pLFxuICAgICAgbWFwKGFzeW5jICgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5wYWNrYWdlc1VwZGF0ZWQoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudXBkYXRlR2l0SWdub3JlcyksXG4gICAgICB0YXAoYWN0aW9uID0+IHtcbiAgICAgICAgbGV0IHJlbCA9IGFjdGlvbi5wYXlsb2FkLmZpbGU7XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUocmVsKSkge1xuICAgICAgICAgIHJlbCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgcmVsKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgZ2l0SWdub3JlRmlsZXNXYWl0aW5nLmFkZChyZWwpO1xuICAgICAgfSksXG4gICAgICBkZWJvdW5jZVRpbWUoNTAwKSxcbiAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGNoYW5nZWRGaWxlcyA9IFsuLi5naXRJZ25vcmVGaWxlc1dhaXRpbmcudmFsdWVzKCldO1xuICAgICAgICBnaXRJZ25vcmVGaWxlc1dhaXRpbmcuY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWRGaWxlcztcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKChjaGFuZ2VkRmlsZXMpID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLmNoYW5nZWRGaWxlcy5tYXAoYXN5bmMgcmVsID0+IHtcbiAgICAgICAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHJlbCk7XG4gICAgICAgICAgY29uc3QgbGluZXMgPSBnZXRTdGF0ZSgpLmdpdElnbm9yZXNbZmlsZV07XG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShmaWxlLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdMaW5lcyA9IGRhdGEuc3BsaXQoL1xcblxccj8vKS5tYXAobGluZSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICAgICAgICBjb25zdCBuZXdMaW5lcyA9IF8uZGlmZmVyZW5jZShsaW5lcywgZXhpc3RpbmdMaW5lcyk7XG4gICAgICAgICAgICBpZiAobmV3TGluZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBmcy53cml0ZUZpbGUoZmlsZSwgZGF0YSArIEVPTCArIG5ld0xpbmVzLmpvaW4oRU9MKSwgKCkgPT4ge1xuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgbG9nLmluZm8oJ01vZGlmeScsIGZpbGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hZGRQcm9qZWN0LCBzbGljZS5hY3Rpb25zLmRlbGV0ZVByb2plY3QpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSlcbiAgICApXG4gICkucGlwZShcbiAgICBpZ25vcmVFbGVtZW50cygpLFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIuc3RhY2sgPyBlcnIuc3RhY2sgOiBlcnIpO1xuICAgICAgcmV0dXJuIHRocm93RXJyb3IoZXJyKTtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCk6IE9ic2VydmFibGU8UGFja2FnZXNTdGF0ZT4ge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUHJvaktleShwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgcGF0aCk7XG4gIHJldHVybiByZWxQYXRoLnN0YXJ0c1dpdGgoJy4uJykgPyBQYXRoLnJlc29sdmUocGF0aCkgOiByZWxQYXRoO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHByb2pLZXlUb1BhdGgoa2V5OiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGguaXNBYnNvbHV0ZShrZXkpID8ga2V5IDogUGF0aC5yZXNvbHZlKHJvb3REaXIsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VLZXkocGF0aDogc3RyaW5nKSB7XG4gIGxldCByZWwgPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIFBhdGgucmVzb2x2ZShwYXRoKSk7XG4gIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKVxuICAgIHJlbCA9IHJlbC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHJldHVybiByZWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VEaXIoa2V5OiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwcmogb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocGF0aFRvUHJvaktleShwcmopKTtcbiAgICBpZiAocGtnTmFtZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwayA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgeWllbGQgcGs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0TGlzdCgpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkubWFwKHBqID0+IFBhdGgucmVzb2x2ZShyb290RGlyLCBwaikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDd2RXb3Jrc3BhY2UoKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGlzIG1lYW50IHRvIHRyaWdnZXIgZWRpdG9yLWhlbHBlciB0byB1cGRhdGUgdHNjb25maWcgZmlsZXMsIHNvXG4gKiBlZGl0b3ItaGVscGVyIG11c3QgYmUgaW1wb3J0IGF0IGZpcnN0XG4gKiBAcGFyYW0gZGlyIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpdGNoQ3VycmVudFdvcmtzcGFjZShkaXI6IHN0cmluZykge1xuICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKGRpcik7XG4gIGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlQmF0Y2hDaGFuZ2VkKFt3b3Jrc3BhY2VLZXkoZGlyKV0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKHdzS2V5OiBzdHJpbmcpIHtcbiAgY29uc3QgcGtnRW50cnkgPSBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2UoZ2V0U3RhdGUoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAoKGZ1bmN0aW9uKigpOiBHZW5lcmF0b3I8W3N0cmluZywgUGFja2FnZUluZm9dPiB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dFbnRyeSkge1xuICAgICAgeWllbGQgW3BrLm5hbWUsIHBrXTtcbiAgICB9XG4gIH0pKCkpO1xuICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyA9IGluc3RhbGxlZCk7XG4gIGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlU3RhdGVVcGRhdGVkKHdzS2V5KTtcbn1cblxuLyoqXG4gKiBEZWxldGUgd29ya3NwYWNlIHN0YXRlIGlmIGl0cyBkaXJlY3RvcnkgZG9lcyBub3QgZXhpc3RcbiAqL1xuZnVuY3Rpb24gY2hlY2tBbGxXb3Jrc3BhY2VzKCkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGtleSk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYFdvcmtzcGFjZSAke2tleX0gZG9lcyBub3QgZXhpc3QgYW55bW9yZS5gKTtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5kZWxldGUoa2V5KSk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KGNyZWF0ZUhvb2sgPSBmYWxzZSkge1xuICBsb2cuZGVidWcoJ2luaXRSb290RGlyZWN0b3J5Jyk7XG4gIGNvbnN0IHJvb3RQYXRoID0gcm9vdERpcjtcbiAgZnNleHQubWtkaXJwU3luYyhkaXN0RGlyKTtcbiAgLy8gbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLFxuICAgICAgJ2dpdGlnbm9yZS50eHQnKSwgcm9vdERpciArICcvLmdpdGlnbm9yZScpO1xuICBhd2FpdCBjbGVhbkludmFsaWRTeW1saW5rcygpO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcblxuICBpZiAoY3JlYXRlSG9vaykge1xuICAgIHByb2plY3REaXJzLmZvckVhY2gocHJqZGlyID0+IHtcbiAgICAgIF93cml0ZUdpdEhvb2socHJqZGlyKTtcbiAgICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2xpbnQuanNvbicpLCBwcmpkaXIgKyAnL3RzbGludC5qc29uJyk7XG4gICAgfSk7XG4gIH1cblxuICBhd2FpdCBzY2FuQW5kU3luY1BhY2thZ2VzKCk7XG4gIC8vIGF3YWl0IF9kZWxldGVVc2VsZXNzU3ltbGluayhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpLCBuZXcgU2V0PHN0cmluZz4oKSk7XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlQ29uZmlnRmlsZXMoKSB7XG4vLyAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuLi9jbWQvY29uZmlnLXNldHVwJykpLmFkZHVwQ29uZmlncygoZmlsZSwgY29uZmlnQ29udGVudCkgPT4ge1xuLy8gICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICAgIGxvZy5pbmZvKCd3cml0ZSBjb25maWcgZmlsZTonLCBmaWxlKTtcbi8vICAgICB3cml0ZUZpbGUoUGF0aC5qb2luKGRpc3REaXIsIGZpbGUpLFxuLy8gICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbi8vICAgfSk7XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3cy5pZCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5zdGFsbEluRGlyKGRpciwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsIHdzLmluc3RhbGxKc29uU3RyKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICBjb25zdCB3c2QgPSBkLndvcmtzcGFjZXMuZ2V0KHdzLmlkKSE7XG4gICAgICB3c2QuaW5zdGFsbEpzb25TdHIgPSAnJztcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UtbG9jay5qc29uJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKGBQcm9ibGVtYXRpYyAke2xvY2tGaWxlfSBpcyBkZWxldGVkLCBwbGVhc2UgdHJ5IGFnYWluYCk7XG4gICAgICAgIGZzLnVubGlua1N5bmMobG9ja0ZpbGUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsSW5EaXIoZGlyOiBzdHJpbmcsIG9yaWdpblBrZ0pzb25TdHI6IHN0cmluZywgdG9JbnN0YWxsUGtnSnNvblN0cjogc3RyaW5nKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnSW5zdGFsbCBkZXBlbmRlbmNpZXMgaW4gJyArIGRpcik7XG4gIHRyeSB7XG4gICAgYXdhaXQgY29weU5wbXJjVG9Xb3Jrc3BhY2UoZGlyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmcsIGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnNleHQubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgLy8gMS4gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3ModGFyZ2V0LCBsaW5rID0+IHtcbiAgICBsb2cuZGVidWcoJ1JlbW92ZSBzeW1saW5rJywgbGluayk7XG4gICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgfSk7XG4gIC8vIDIuIFJ1biBgbnBtIGluc3RhbGxgXG4gIGNvbnN0IGluc3RhbGxKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCd3cml0ZScsIGluc3RhbGxKc29uRmlsZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCB0b0luc3RhbGxQa2dKc29uU3RyLCAndXRmOCcpO1xuICAvLyBzYXZlIGEgbG9jayBmaWxlIHRvIGluZGljYXRlIGluLXByb2Nlc3Mgb2YgaW5zdGFsbGluZywgb25jZSBpbnN0YWxsYXRpb24gaXMgY29tcGxldGVkIHdpdGhvdXQgaW50ZXJydXB0aW9uLCBkZWxldGUgaXQuXG4gIC8vIGNoZWNrIGlmIHRoZXJlIGlzIGV4aXN0aW5nIGxvY2sgZmlsZSwgbWVhbmluZyBhIHByZXZpb3VzIGluc3RhbGxhdGlvbiBpcyBpbnRlcnJ1cHRlZC5cbiAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gIGZzLnByb21pc2VzLndyaXRlRmlsZShsb2NrRmlsZSwgb3JpZ2luUGtnSnNvblN0cik7XG5cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuICB0cnkge1xuICAgIGNvbnN0IGVudiA9IHsuLi5wcm9jZXNzLmVudiwgTk9ERV9FTlY6ICdkZXZlbG9wbWVudCd9IGFzIE5vZGVKUy5Qcm9jZXNzRW52O1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7XG4gICAgICBjd2Q6IGRpcixcbiAgICAgIGVudiAvLyBGb3JjZSBkZXZlbG9wbWVudCBtb2RlLCBvdGhlcndpc2UgXCJkZXZEZXBlbmRlbmNpZXNcIiB3aWxsIG5vdCBiZSBpbnN0YWxsZWRcbiAgICB9KS5wcm9taXNlO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICBhd2FpdCBleGUoJ25wbScsICdwcnVuZScsIHtjd2Q6IGRpciwgZW52fSkucHJvbWlzZTtcbiAgICAvLyBcIm5wbSBkZHBcIiByaWdodCBhZnRlciBcIm5wbSBpbnN0YWxsXCIgd2lsbCBjYXVzZSBkZXZEZXBlbmRlbmNpZXMgYmVpbmcgcmVtb3ZlZCBzb21laG93LCBkb24ndCBrbm93blxuICAgIC8vIHdoeSwgSSBoYXZlIHRvIGFkZCBhIHNldEltbWVkaWF0ZSgpIGJldHdlZW4gdGhlbSB0byB3b3JrYXJvdW5kXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2RkcCcsIHtjd2Q6IGRpciwgZW52fSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzJywgZS5zdGFjayk7XG4gICAgdGhyb3cgZTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnUmVjb3ZlciAnICsgaW5zdGFsbEpzb25GaWxlKTtcbiAgICAvLyAzLiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIG9yaWdpblBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gICAgZnMucHJvbWlzZXMudW5saW5rKGxvY2tGaWxlKTtcbiAgICBhd2FpdCByZWNvdmVyU3ltbGlua3MoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlY292ZXJTeW1saW5rcygpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3ltbGlua3NJbk1vZHVsZURpci5tYXAoKHtjb250ZW50LCBsaW5rfSkgPT4ge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxpbmspKSB7XG4gICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5zeW1saW5rKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb3B5TnBtcmNUb1dvcmtzcGFjZSh3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnLm5wbXJjJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpXG4gICAgcmV0dXJuO1xuICBjb25zdCBpc0NoaW5hID0gYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMuaXNJbkNoaW5hKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGZpbHRlcihjbiA9PiBjbiAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmIChpc0NoaW5hKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ2NyZWF0ZSAubnBtcmMgdG8nLCB0YXJnZXQpO1xuICAgIGZzLmNvcHlGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL25wbXJjLWZvci1jbi50eHQnKSwgdGFyZ2V0KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzY2FuQW5kU3luY1BhY2thZ2VzKGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW10pIHtcbiAgY29uc3QgcHJvalBrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGNvbnN0IHNyY1BrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGxldCBwa2dMaXN0OiBQYWNrYWdlSW5mb1tdO1xuXG4gIGlmIChpbmNsdWRlUGFja2FnZUpzb25GaWxlcykge1xuICAgIGNvbnN0IHByaktleXMgPSBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpO1xuICAgIGNvbnN0IHByakRpcnMgPSBwcmpLZXlzLm1hcChwcmpLZXkgPT4gcHJvaktleVRvUGF0aChwcmpLZXkpKTtcbiAgICBwa2dMaXN0ID0gaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMubWFwKGpzb25GaWxlID0+IHtcbiAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgY29uc3QgcHJqSWR4ID0gcHJqRGlycy5maW5kSW5kZXgoZGlyID0+IGluZm8ucmVhbFBhdGguc3RhcnRzV2l0aChkaXIgKyBQYXRoLnNlcCkpO1xuICAgICAgaWYgKHByaklkeCA+PSAwKSB7XG4gICAgICAgIGNvbnN0IHByalBhY2thZ2VOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJqS2V5c1twcmpJZHhdKSE7XG4gICAgICAgIGlmICghcHJqUGFja2FnZU5hbWVzLmluY2x1ZGVzKGluZm8ubmFtZSkpIHtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe1xuICAgICAgICAgICAgcHJqOiBwcmpLZXlzW3ByaklkeF0sXG4gICAgICAgICAgICBwa2dzOiBbLi4ucHJqUGFja2FnZU5hbWVzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qga2V5cyA9IFsuLi5nZXRTdGF0ZSgpLnNyY0RpcjJQYWNrYWdlcy5rZXlzKCldO1xuICAgICAgICBjb25zdCBsaW5rZWRTcmNEaXJzID0ga2V5cy5tYXAoa2V5ID0+IHByb2pLZXlUb1BhdGgoa2V5KSk7XG4gICAgICAgIGNvbnN0IGlkeCA9IGxpbmtlZFNyY0RpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoID09PSBkaXIgfHwgIGluZm8ucmVhbFBhdGguc3RhcnRzV2l0aChkaXIgKyBQYXRoLnNlcCkpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICBjb25zdCBwa2dzID0gZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMuZ2V0KGtleXNbaWR4XSkhO1xuICAgICAgICAgIGlmICghcGtncy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoe1xuICAgICAgICAgICAgICBwYXR0ZXJuOiBrZXlzW2lkeF0sXG4gICAgICAgICAgICAgIHBrZ3M6IFsuLi5wa2dzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7aW5mby5yZWFsUGF0aH0gaXMgbm90IHVuZGVyIGFueSBrbm93biBQcm9qZWN0IGRpcmVjdG9yeXM6ICR7cHJqRGlycy5jb25jYXQobGlua2VkU3JjRGlycykuam9pbignLCAnKX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfSk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKFtwa2dMaXN0LCAndXBkYXRlJ10pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJtID0gKGF3YWl0IGltcG9ydCgnLi4vcmVjaXBlLW1hbmFnZXInKSk7XG4gICAgcGtnTGlzdCA9IFtdO1xuICAgIGF3YWl0IHJtLnNjYW5QYWNrYWdlcygpLnBpcGUoXG4gICAgICB0YXAoKFtwcm9qLCBqc29uRmlsZSwgc3JjRGlyXSkgPT4ge1xuICAgICAgICBpZiAocHJvaiAmJiAhcHJvalBrZ01hcC5oYXMocHJvaikpXG4gICAgICAgICAgcHJvalBrZ01hcC5zZXQocHJvaiwgW10pO1xuICAgICAgICBpZiAocHJvaiA9PSBudWxsICYmIHNyY0RpciAmJiAhc3JjUGtnTWFwLmhhcyhzcmNEaXIpKVxuICAgICAgICAgIHNyY1BrZ01hcC5zZXQoc3JjRGlyLCBbXSk7XG5cbiAgICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvKGpzb25GaWxlLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbmZvLmpzb24uZHIgfHwgaW5mby5qc29uLnBsaW5rKSB7XG4gICAgICAgICAgcGtnTGlzdC5wdXNoKGluZm8pO1xuICAgICAgICAgIGlmIChwcm9qKVxuICAgICAgICAgICAgcHJvalBrZ01hcC5nZXQocHJvaikhLnB1c2goaW5mbyk7XG4gICAgICAgICAgZWxzZSBpZiAoc3JjRGlyKVxuICAgICAgICAgICAgc3JjUGtnTWFwLmdldChzcmNEaXIpIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxvZy5lcnJvcihgT3JwaGFuICR7anNvbkZpbGV9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nLmRlYnVnKGBQYWNrYWdlIG9mICR7anNvbkZpbGV9IGlzIHNraXBwZWQgKGR1ZSB0byBubyBcImRyXCIgb3IgXCJwbGlua1wiIHByb3BlcnR5KWApO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICkudG9Qcm9taXNlKCk7XG4gICAgZm9yIChjb25zdCBbcHJqLCBwa2dzXSBvZiBwcm9qUGtnTWFwLmVudHJpZXMoKSkge1xuICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtwcmosIHBrZ3N9KTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBbc3JjRGlyLCBwa2dzXSBvZiBzcmNQa2dNYXAuZW50cmllcygpKSB7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoe3BhdHRlcm46IHNyY0RpciwgcGtnc30pO1xuICAgIH1cblxuICAgIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNMaW5rZWRQYWNrYWdlcyhbcGtnTGlzdCwgJ2NsZWFuJ10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGlmIChzeW1saW5rRGlyTmFtZSAhPT0gJy5saW5rcycgJiYgZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksICcubGlua3MnKSkpIHtcbiAgICBmc2V4dC5yZW1vdmUoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCAnLmxpbmtzJykpXG4gICAgLmNhdGNoKGV4ID0+IGxvZy5pbmZvKGV4KSk7XG4gIH1cbiAgY29uc3Qgc3ltbGlua0RpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgc3ltbGlua0Rpck5hbWUgfHwgJ25vZGVfbW9kdWxlcycpO1xuICBmc2V4dC5ta2RpcnBTeW5jKHN5bWxpbmtEaXIpO1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpITtcblxuICBjb25zdCBwa2dOYW1lcyA9IHdzLmxpbmtlZERlcGVuZGVuY2llcy5tYXAoaXRlbSA9PiBpdGVtWzBdKVxuICAuY29uY2F0KHdzLmxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoaXRlbSA9PiBpdGVtWzBdKSk7XG5cbiAgY29uc3QgcGtnTmFtZVNldCA9IG5ldyBTZXQocGtnTmFtZXMpO1xuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgaWYgKHdzLmluc3RhbGxlZENvbXBvbmVudHMpIHtcbiAgICAgIGZvciAoY29uc3QgcG5hbWUgb2Ygd3MuaW5zdGFsbGVkQ29tcG9uZW50cy5rZXlzKCkpXG4gICAgICAgIHBrZ05hbWVTZXQuYWRkKHBuYW1lKTtcbiAgICB9XG4gIH1cblxuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHN5bWxpbmtEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV19KTtcbiAgfVxuXG4gIHJldHVybiBtZXJnZShcbiAgICBmcm9tKHBrZ05hbWVTZXQudmFsdWVzKCkpLnBpcGUoXG4gICAgICBtYXAobmFtZSA9PiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSB8fCB3cy5pbnN0YWxsZWRDb21wb25lbnRzIS5nZXQobmFtZSkhKSxcbiAgICAgIHN5bWJvbGljTGlua1BhY2thZ2VzKHN5bWxpbmtEaXIpXG4gICAgKSxcbiAgICBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoc3ltbGlua0RpciwgcGtnTmFtZVNldClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gX2RlbGV0ZVVzZWxlc3NTeW1saW5rKGNoZWNrRGlyOiBzdHJpbmcsIGV4Y2x1ZGVTZXQ6IFNldDxzdHJpbmc+KSB7XG4gIGNvbnN0IGRvbmVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICBjb25zdCBkb25lMSA9IGxpc3RNb2R1bGVTeW1saW5rcyhjaGVja0RpciwgYXN5bmMgbGluayA9PiB7XG4gICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoY2hlY2tEaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIGRyY3BOYW1lICE9PSBwa2dOYW1lICYmICFleGNsdWRlU2V0Lmhhcyhwa2dOYW1lKSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgRGVsZXRlIGV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApO1xuICAgICAgZG9uZXMucHVzaChmcy5wcm9taXNlcy51bmxpbmsobGluaykpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGRvbmUxO1xuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgcmV0dXJuIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZSwganNvbiwgaXNJbnN0YWxsZWQpO1xufVxuLyoqXG4gKiBMaXN0IHRob3NlIGluc3RhbGxlZCBwYWNrYWdlcyB3aGljaCBhcmUgcmVmZXJlbmNlZCBieSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUsXG4gKiB0aG9zZSBwYWNrYWdlcyBtdXN0IGhhdmUgXCJkclwiIHByb3BlcnR5IGluIHBhY2thZ2UuanNvbiBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VLZXkgXG4gKi9cbmZ1bmN0aW9uKiBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IG9yaWdpbkluc3RhbGxKc29uID0gc3RhdGUud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSEub3JpZ2luSW5zdGFsbEpzb247XG4gIC8vIGNvbnN0IGRlcEpzb24gPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llc10gOlxuICAvLyAgIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc107XG4gIGZvciAoY29uc3QgZGVwcyBvZiBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdKSB7XG4gICAgaWYgKGRlcHMgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICBpZiAoIXN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXApICYmIGRlcCAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBranNvbkZpbGUpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlSW5mbyhcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKSwgdHJ1ZVxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaykge1xuICAgICAgICAgICAgeWllbGQgcGs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZTogc3RyaW5nLCBqc29uOiBhbnksIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG0gPSBtb2R1bGVOYW1lUmVnLmV4ZWMoanNvbi5uYW1lKTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBzaG9ydE5hbWU6IG0hWzJdLFxuICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICBzY29wZTogbSFbMV0sXG4gICAgcGF0aDogUGF0aC5qb2luKHN5bWxpbmtEaXJOYW1lLCBqc29uLm5hbWUpLFxuICAgIGpzb24sXG4gICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGtKc29uRmlsZSkpLFxuICAgIGlzSW5zdGFsbGVkXG4gIH07XG4gIHJldHVybiBwa0luZm87XG59XG5cbmZ1bmN0aW9uIGNwKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoXy5zdGFydHNXaXRoKGZyb20sICctJykpIHtcbiAgICBmcm9tID0gYXJndW1lbnRzWzFdO1xuICAgIHRvID0gYXJndW1lbnRzWzJdO1xuICB9XG4gIGZzZXh0LmNvcHlTeW5jKGZyb20sIHRvKTtcbiAgLy8gc2hlbGwuY3AoLi4uYXJndW1lbnRzKTtcbiAgaWYgKC9bL1xcXFxdJC8udGVzdCh0bykpXG4gICAgdG8gPSBQYXRoLmJhc2VuYW1lKGZyb20pOyAvLyB0byBpcyBhIGZvbGRlclxuICBlbHNlXG4gICAgdG8gPSBQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIHRvKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdDb3B5IHRvICVzJywgY2hhbGsuY3lhbih0bykpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGZyb20gYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IHRvIHJlbGF0aXZlIHRvIHJvb3RQYXRoIFxuICovXG5mdW5jdGlvbiBtYXliZUNvcHlUZW1wbGF0ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCB0bykpKVxuICAgIGNwKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGZyb20pLCB0byk7XG59XG5cbmZ1bmN0aW9uIF93cml0ZUdpdEhvb2socHJvamVjdDogc3RyaW5nKSB7XG4gIC8vIGlmICghaXNXaW4zMikge1xuICBjb25zdCBnaXRQYXRoID0gUGF0aC5yZXNvbHZlKHByb2plY3QsICcuZ2l0L2hvb2tzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGgpKSB7XG4gICAgY29uc3QgaG9va1N0ciA9ICcjIS9iaW4vc2hcXG4nICtcbiAgICAgIGBjZCBcIiR7cm9vdERpcn1cIlxcbmAgK1xuICAgICAgLy8gJ2RyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJ25weCBwcmV0dHktcXVpY2sgLS1zdGFnZWRcXG4nICsgLy8gVXNlIGB0c2xpbnQgLS1maXhgIGluc3RlYWQuXG4gICAgICBgcGxpbmsgbGludCAtLXBqIFwiJHtwcm9qZWN0LnJlcGxhY2UoL1svXFxcXF0kLywgJycpfVwiIC0tZml4XFxuYDtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoICsgJy9wcmUtY29tbWl0JykpXG4gICAgICBmcy51bmxpbmtTeW5jKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NTdGF0ZSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSE7XG4gIGNvbnN0IGRvTm90aGluZyA9ICgpID0+IHt9O1xuICB3c1N0YXRlLmxpbmtlZERlcGVuZGVuY2llcy5jb25jYXQod3NTdGF0ZS5saW5rZWREZXZEZXBlbmRlbmNpZXMpLm1hcCgoW3BrZ05hbWVdKSA9PiB7XG4gICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIHBrZ05hbWUpO1xuICAgIHJldHVybiBmcy5wcm9taXNlcy5sc3RhdChkaXIpXG4gICAgLnRoZW4oKHN0YXQpID0+IHtcbiAgICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJldmlvdXMgaW5zdGFsbGVkICR7UGF0aC5yZWxhdGl2ZShyb290RGlyLGRpcil9IGlzIGRlbGV0ZWQsIGR1ZSB0byBsaW5rZWQgcGFja2FnZSAke3BrZ05hbWV9YCk7XG4gICAgICAgIHJldHVybiBmcy5wcm9taXNlcy51bmxpbmsoZGlyKTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5jYXRjaChkb05vdGhpbmcpO1xuICB9KTtcbn1cblxuLy8gLyoqXG4vLyAgICAqIElmIGEgc291cmNlIGNvZGUgcGFja2FnZSB1c2VzIFBsaW5rJ3MgX19wbGluayBBUEkgKCBsaWtlIGAubG9nZ2VyYCkgb3IgZXh0ZW5kcyBQbGluaydzIGNvbW1hbmQgbGluZSxcbi8vICAgICogdGhleSBuZWVkIGVuc3VyZSBzb21lIFBsaW5rJ3MgZGVwZW5kZW5jaWVzIGFyZSBpbnN0YWxsZWQgYXMgMXN0IGxldmVsIGRlcGVuZGVuY3kgaW4gdGhlaXIgd29ya3NwYWNlLFxuLy8gICAgKiBvdGhlcndpc2UgVmlzdWFsIENvZGUgRWRpdG9yIGNhbiBub3QgZmluZCBjb3JyZWN0IHR5cGUgZGVmaW5pdGlvbnMgd2hpbGUgcmVmZXJlbmNpbmcgUGxpbmsncyBsb2dnZXIgb3Jcbi8vICAgICogQ29tbWFuZCBpbnRlcmZhY2UuXG4vLyAgICAqIFxuLy8gICAgKiBTbyBJIG5lZWQgdG8gbWFrZSBzdXJlIHRoZXNlIGRlcGVuZGVuY2llcyBhcmUgaW5zdGFsbGVkIGluIGVhY2ggd29ya3NwYWNlXG4vLyAgICAqL1xuXG4vLyBmdW5jdGlvbiBwbGlua0FwaVJlcXVpcmVkRGVwcygpOiBQYWNrYWdlSnNvbkludGVyZiB7XG4vLyAgIGNvbnN0IHBsaW5rSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSByZXF1aXJlKCdAd2ZoL3BsaW5rL3BhY2thZ2UuanNvbicpO1xuLy8gICBjb25zdCBmYWtlSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4vLyAgICAgdmVyc2lvbjogcGxpbmtKc29uLnZlcnNpb24sXG4vLyAgICAgbmFtZTogcGxpbmtKc29uLm5hbWUsXG4vLyAgICAgZGVwZW5kZW5jaWVzOiB7fVxuLy8gICB9O1xuLy8gICBmb3IgKGNvbnN0IGRlcCBvZiBbJ2NvbW1hbmRlcicsICdsb2c0anMnXSkge1xuLy8gICAgIGNvbnN0IHZlcnNpb24gPSBwbGlua0pzb24uZGVwZW5kZW5jaWVzIVtkZXBdO1xuLy8gICAgIGZha2VKc29uLmRlcGVuZGVuY2llcyFbZGVwXSA9IHZlcnNpb247XG4vLyAgIH1cbi8vICAgcmV0dXJuIGZha2VKc29uO1xuLy8gfVxuIl19