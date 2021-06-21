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
    packagesUpdateChecksum: 0,
    npmInstallOpt: { isForce: false }
};
exports.slice = store_1.stateFactory.newSlice({
    name: NS,
    initialState: state,
    reducers: {
        /** Do this action after any linked package is removed or added  */
        initRootDir(d, { payload }) {
            d.npmInstallOpt.cache = payload.cache;
            d.npmInstallOpt.useNpmCi = payload.useNpmCi;
        },
        /**
         * - Create initial files in root directory
         * - Scan linked packages and install transitive dependency
         * - Switch to different workspace
         * - Delete nonexisting workspace
         * - If "packageJsonFiles" is provided, it should skip step of scanning linked packages
         * - TODO: if there is linked package used in more than one workspace, hoist and install for them all?
         */
        updateWorkspace(d, { payload }) {
            d.npmInstallOpt.cache = payload.cache;
            d.npmInstallOpt.useNpmCi = payload.useNpmCi;
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
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateWorkspace), operators_1.concatMap(({ payload: { dir, isForce, createHook, useNpmCi, packageJsonFiles } }) => {
        dir = path_1.default.resolve(dir);
        exports.actionDispatcher._setCurrentWorkspace(dir);
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/app-template.js'), path_1.default.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        if (isForce || useNpmCi) {
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
            exports.actionDispatcher.updateWorkspace(Object.assign({ dir: misc_1.plinkEnv.workDir }, payload));
        }
        else {
            const curr = getState().currWorkspace;
            if (curr != null) {
                if (getState().workspaces.has(curr)) {
                    const path = path_1.default.resolve(rootDir, curr);
                    exports.actionDispatcher.updateWorkspace(Object.assign({ dir: path }, payload));
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
        return getStore().pipe(
        // filter(s => s.workspaces.has(key)),
        operators_1.takeWhile(s => s.workspaces.has(key)), operators_1.map(s => s.workspaces.get(key)), operators_1.distinctUntilChanged((s1, s2) => s1.installJson === s2.installJson), operators_1.scan((old, newWs) => {
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
            return getStore().pipe(operators_1.map(s => s.workspaces.get(wsKey)), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null), operators_1.take(1), operators_1.concatMap(ws => installWorkspace(ws, getState().npmInstallOpt)), operators_1.map(() => {
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
function installWorkspace(ws, npmOpt) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.resolve(rootDir, ws.id);
        try {
            yield installInDir(dir, npmOpt, ws.originInstallJsonStr, ws.installJsonStr);
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
function installInDir(dir, npmOpt, originPkgJsonStr, toInstallPkgJsonStr) {
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
            if (npmOpt.cache)
                env.npm_config_cache = npmOpt.cache;
            if (npmOpt.offline)
                env.npm_config_offline = 'true';
            const cmdArgs = [npmOpt.useNpmCi ? 'ci' : 'install'];
            yield process_utils_2.exe('npm', ...cmdArgs, { cwd: dir, env }).done;
            yield new Promise(resolve => setImmediate(resolve));
            yield process_utils_2.exe('npm', 'prune', { cwd: dir, env }).done;
            // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
            // why, I have to add a setImmediate() between them to workaround
            yield new Promise(resolve => setImmediate(resolve));
            try {
                yield process_utils_2.exe('npm', 'ddp', { cwd: dir, env }).promise;
            }
            catch (ddpErr) {
                log.warn('Failed to dedupe dependencies, but it is OK', ddpErr);
            }
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
                    fs_extra_1.default.mkdirpSync(path_1.default.dirname(link));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCxrREFBMEI7QUFDMUIsd0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFxRTtBQUNyRSw4Q0FDaUY7QUFDakYsc0VBQWlHO0FBQ2pHLG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQW1FO0FBQ25FLG9DQUF5RDtBQUN6RCw4Q0FBOEM7QUFDOUMsOERBQW1HO0FBQ25HLG9EQUFzRDtBQUN0RCwyQkFBeUI7QUFDekIsbUNBQWlDO0FBQ2pDLHdDQUF5QztBQUN6QyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFvQzNDLE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTdFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsTUFBTSxFQUFFLEtBQUs7SUFDYixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDM0IsZUFBZSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQzFCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztJQUN6QixhQUFhLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDO0NBQ2hDLENBQUM7QUF1Q1csUUFBQSxLQUFLLEdBQUcsb0JBQVks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R0FBNEc7QUFDNUcsOEdBQThHO0FBQzlHLDBCQUEwQjtBQUMxQixRQUFRO0FBQ1IsaUZBQWlGO0FBQ2pGLFFBQVE7QUFFUix1REFBdUQ7QUFDdkQsNkVBQTZFO0FBQzdFLDBDQUEwQztBQUMxQyxrQ0FBa0M7QUFDbEMsNEJBQTRCO0FBQzVCLHVCQUF1QjtBQUN2QixPQUFPO0FBQ1AsaURBQWlEO0FBQ2pELG9EQUFvRDtBQUNwRCw2Q0FBNkM7QUFDN0MsTUFBTTtBQUNOLHFCQUFxQjtBQUNyQixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbmZvcnR1bmF0ZWx5LCB0aGlzIGZpbGUgaXMgdmVyeSBsb25nLCB5b3UgbmVlZCB0byBmb2xkIGJ5IGluZGVudGlvbiBmb3IgYmV0dGVyIHZpZXcgb2Ygc291cmNlIGNvZGUgaW4gRWRpdG9yXG4gKi9cblxuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmc2V4dCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIE9ic2VydmFibGUsIG9mLCBkZWZlciwgdGhyb3dFcnJvcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIGRlYm91bmNlVGltZSwgdGFrZVdoaWxlLFxuICB0YWtlLCBjb25jYXRNYXAsIGlnbm9yZUVsZW1lbnRzLCBzY2FuLCBjYXRjaEVycm9yLCB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBsaXN0Q29tcERlcGVuZGVuY3ksIFBhY2thZ2VKc29uSW50ZXJmLCBEZXBlbmRlbnRJbmZvIH0gZnJvbSAnLi4vdHJhbnNpdGl2ZS1kZXAtaG9pc3Rlcic7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBzZXRQcm9qZWN0TGlzdCwgc2V0TGlua1BhdHRlcm5zfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQgeyBFT0wgfSBmcm9tICdvcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7IHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyJyk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICAvKiogQmUgYXdhcmU6IElmIHRoaXMgcHJvcGVydHkgaXMgbm90IHNhbWUgYXMgXCJyZWFsUGF0aFwiLFxuICAgKiB0aGVuIGl0IGlzIGEgc3ltbGluayB3aG9zZSBwYXRoIGlzIHJlbGF0aXZlIHRvIHdvcmtzcGFjZSBkaXJlY3RvcnkgKi9cbiAgcGF0aDogc3RyaW5nO1xuICByZWFsUGF0aDogc3RyaW5nO1xuICBpc0luc3RhbGxlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc1N0YXRlIHtcbiAgbnBtSW5zdGFsbE9wdDogTnBtT3B0aW9ucztcbiAgaW5pdGVkOiBib29sZWFuO1xuICBzcmNQYWNrYWdlczogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuICAvKiogS2V5IGlzIHJlbGF0aXZlIHBhdGggdG8gcm9vdCB3b3Jrc3BhY2UgKi9cbiAgd29ya3NwYWNlczogTWFwPHN0cmluZywgV29ya3NwYWNlU3RhdGU+O1xuICAvKioga2V5IG9mIGN1cnJlbnQgXCJ3b3Jrc3BhY2VzXCIgKi9cbiAgY3VycldvcmtzcGFjZT86IHN0cmluZyB8IG51bGw7XG4gIHByb2plY3QyUGFja2FnZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgc3JjRGlyMlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIC8qKiBEcmNwIGlzIHRoZSBvcmlnaW5hbCBuYW1lIG9mIFBsaW5rIHByb2plY3QgKi9cbiAgbGlua2VkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbGlua2VkRHJjcFByb2plY3Q/OiBzdHJpbmcgfCBudWxsO1xuICBpbnN0YWxsZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgaXNJbkNoaW5hPzogYm9vbGVhbjtcbiAgLyoqIEV2ZXJ5dGltZSBhIGhvaXN0IHdvcmtzcGFjZSBzdGF0ZSBjYWxjdWxhdGlvbiBpcyBiYXNpY2FsbHkgZG9uZSwgaXQgaXMgaW5jcmVhc2VkIGJ5IDEgKi9cbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICAvKiogd29ya3NwYWNlIGtleSAqL1xuICBsYXN0Q3JlYXRlZFdvcmtzcGFjZT86IHN0cmluZztcbn1cblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXIsIHBsaW5rRGlyLCBpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcblxuY29uc3QgTlMgPSAncGFja2FnZXMnO1xuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmNvbnN0IHN0YXRlOiBQYWNrYWdlc1N0YXRlID0ge1xuICBpbml0ZWQ6IGZhbHNlLFxuICB3b3Jrc3BhY2VzOiBuZXcgTWFwKCksXG4gIHByb2plY3QyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjRGlyMlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGdpdElnbm9yZXM6IHt9LFxuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogMCxcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogMCxcbiAgbnBtSW5zdGFsbE9wdDoge2lzRm9yY2U6IGZhbHNlfVxufTtcblxuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VTdGF0ZSB7XG4gIGlkOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2UgbGlua2VkIHNvdXJjZSBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLyoqIG5hbWVzIG9mIHRob3NlIGxpbmtlZCBzb3VyY2UgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG5cbiAgLyoqIGluc3RhbGxlZCBEUiBjb21wb25lbnQgcGFja2FnZXMgW25hbWUsIHZlcnNpb25dKi9cbiAgaW5zdGFsbGVkQ29tcG9uZW50cz86IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcblxuICBob2lzdEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdFBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdERldkluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdERldlBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdEluZm9TdW1tYXJ5Pzoge1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRldkRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGV2RGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiB2ZXJzaW9ucyBhcmUgY29uZmxpY3QgKi9cbiAgICBjb25mbGljdERlcHM6IHN0cmluZ1tdO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5wbU9wdGlvbnMge1xuICBjYWNoZT86IHN0cmluZztcbiAgaXNGb3JjZTogYm9vbGVhbjtcbiAgdXNlTnBtQ2k/OiBib29sZWFuO1xuICBvZmZsaW5lPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgLyoqIERvIHRoaXMgYWN0aW9uIGFmdGVyIGFueSBsaW5rZWQgcGFja2FnZSBpcyByZW1vdmVkIG9yIGFkZGVkICAqL1xuICAgIGluaXRSb290RGlyKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7Y3JlYXRlSG9vazogYm9vbGVhbn0gJiBOcG1PcHRpb25zPikge1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LmNhY2hlID0gcGF5bG9hZC5jYWNoZTtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VOcG1DaSA9IHBheWxvYWQudXNlTnBtQ2k7XG4gICAgfSxcblxuICAgIC8qKiBcbiAgICAgKiAtIENyZWF0ZSBpbml0aWFsIGZpbGVzIGluIHJvb3QgZGlyZWN0b3J5XG4gICAgICogLSBTY2FuIGxpbmtlZCBwYWNrYWdlcyBhbmQgaW5zdGFsbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3lcbiAgICAgKiAtIFN3aXRjaCB0byBkaWZmZXJlbnQgd29ya3NwYWNlXG4gICAgICogLSBEZWxldGUgbm9uZXhpc3Rpbmcgd29ya3NwYWNlXG4gICAgICogLSBJZiBcInBhY2thZ2VKc29uRmlsZXNcIiBpcyBwcm92aWRlZCwgaXQgc2hvdWxkIHNraXAgc3RlcCBvZiBzY2FubmluZyBsaW5rZWQgcGFja2FnZXNcbiAgICAgKiAtIFRPRE86IGlmIHRoZXJlIGlzIGxpbmtlZCBwYWNrYWdlIHVzZWQgaW4gbW9yZSB0aGFuIG9uZSB3b3Jrc3BhY2UsIGhvaXN0IGFuZCBpbnN0YWxsIGZvciB0aGVtIGFsbD9cbiAgICAgKi9cbiAgICB1cGRhdGVXb3Jrc3BhY2UoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZyxcbiAgICAgIGNyZWF0ZUhvb2s6IGJvb2xlYW4sIHBhY2thZ2VKc29uRmlsZXM/OiBzdHJpbmdbXX0gJiBOcG1PcHRpb25zPikge1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LmNhY2hlID0gcGF5bG9hZC5jYWNoZTtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VOcG1DaSA9IHBheWxvYWQudXNlTnBtQ2k7XG4gICAgfSxcbiAgICBzY2FuQW5kU3luY1BhY2thZ2VzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7cGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHt9LFxuXG4gICAgdXBkYXRlRGlyKCkge30sXG4gICAgX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oZCkge1xuICAgICAgY29uc3QgcGxpbmtQa2cgPSBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUocGxpbmtEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IG51bGw7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBwYXRoVG9Qcm9qS2V5KFBhdGguZGlybmFtZShkLmxpbmtlZERyY3AhLnJlYWxQYXRoKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkLmxpbmtlZERyY3AgPSBudWxsO1xuICAgICAgICBkLmluc3RhbGxlZERyY3AgPSBwbGlua1BrZztcbiAgICAgICAgZC5saW5rZWREcmNwUHJvamVjdCA9IG51bGw7XG4gICAgICB9XG4gICAgfSxcbiAgICBfc3luY0xpbmtlZFBhY2thZ2VzKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxbcGtnczogUGFja2FnZUluZm9bXSwgb3BlcmF0b3I6ICd1cGRhdGUnIHwgJ2NsZWFuJ10+KSB7XG4gICAgICBkLmluaXRlZCA9IHRydWU7XG4gICAgICBsZXQgbWFwID0gZC5zcmNQYWNrYWdlcztcbiAgICAgIGlmIChwYXlsb2FkWzFdID09PSAnY2xlYW4nKSB7XG4gICAgICAgIG1hcCA9IGQuc3JjUGFja2FnZXMgPSBuZXcgTWFwKCk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IHBrSW5mbyBvZiBwYXlsb2FkWzBdKSB7XG4gICAgICAgIG1hcC5zZXQocGtJbmZvLm5hbWUsIHBrSW5mbyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBvbkxpbmtlZFBhY2thZ2VBZGRlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICBhZGRQcm9qZWN0KGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnByb2plY3QyUGFja2FnZXMuaGFzKGRpcikpIHtcbiAgICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KGRpciwgW10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9qZWN0KGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYWRkU3JjRGlycyhkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGlmICghZC5zcmNEaXIyUGFja2FnZXMuaGFzKGRpcikpIHtcbiAgICAgICAgICBkLnNyY0RpcjJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVNyY0RpcnMoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnNyY0RpcjJQYWNrYWdlcy5kZWxldGUoZGlyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8qKiBwYXlsb2FkOiB3b3Jrc3BhY2Uga2V5cywgaGFwcGVucyBhcyBkZWJvdW5jZWQgd29ya3NwYWNlIGNoYW5nZSBldmVudCAqL1xuICAgIHdvcmtzcGFjZUJhdGNoQ2hhbmdlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1cGRhdGVHaXRJZ25vcmVzKGQsIHtwYXlsb2FkOiB7ZmlsZSwgbGluZXN9fTogUGF5bG9hZEFjdGlvbjx7ZmlsZTogc3RyaW5nLCBsaW5lczogc3RyaW5nW119Pikge1xuICAgICAgbGV0IHJlbCA9IGZpbGUsIGFicyA9IGZpbGU7XG4gICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKGZpbGUpKSB7XG4gICAgICAgIHJlbCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBhYnMgPSBmaWxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWJzID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGZpbGUpO1xuICAgICAgfVxuICAgICAgaWYgKGQuZ2l0SWdub3Jlc1thYnNdKSB7XG4gICAgICAgIGRlbGV0ZSBkLmdpdElnbm9yZXNbYWJzXTtcbiAgICAgIH1cbiAgICAgIGQuZ2l0SWdub3Jlc1tyZWxdID0gbGluZXMubWFwKGxpbmUgPT4gbGluZS5zdGFydHNXaXRoKCcvJykgPyBsaW5lIDogJy8nICsgbGluZSk7XG4gICAgfSxcbiAgICBwYWNrYWdlc1VwZGF0ZWQoZCkge1xuICAgICAgZC5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKys7XG4gICAgfSxcbiAgICBzZXRJbkNoaW5hKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxib29sZWFuPikge1xuICAgICAgZC5pc0luQ2hpbmEgPSBwYXlsb2FkO1xuICAgIH0sXG4gICAgX3NldEN1cnJlbnRXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IGRpcn06IFBheWxvYWRBY3Rpb248c3RyaW5nIHwgbnVsbD4pIHtcbiAgICAgIGlmIChkaXIgIT0gbnVsbClcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBlbHNlXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IG51bGw7XG4gICAgfSxcbiAgICAvKiogcGFyYW10ZXI6IHdvcmtzcGFjZSBrZXkgKi9cbiAgICB3b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHtcbiAgICAgIGQud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0gKz0gMTtcbiAgICB9LFxuICAgIC8vIG9uV29ya3NwYWNlUGFja2FnZVVwZGF0ZWQoZCwge3BheWxvYWQ6IHdvcmtzcGFjZUtleX06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgX2hvaXN0V29ya3NwYWNlRGVwcyhzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcInNyY1BhY2thZ2VzXCIgaXMgbnVsbCwgbmVlZCB0byBydW4gYGluaXRgIGNvbW1hbmQgZmlyc3QnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHBranNvblN0cjogc3RyaW5nO1xuICAgICAgY29uc3QgcGtnanNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwbGluay5pbnN0YWxsLmxvY2snKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSkge1xuICAgICAgICBsb2cud2FybignUGxpbmsgaW5pdC9zeW5jIHByb2Nlc3Mgd2FzIGludGVycnVwdGVkIGxhc3QgdGltZSwgcmVjb3ZlciBjb250ZW50IG9mICcgKyBwa2dqc29uRmlsZSk7XG4gICAgICAgIHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhsb2NrRmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMudW5saW5rU3luYyhsb2NrRmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtnanNvbkZpbGUsICd1dGY4Jyk7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2pzb246IFBhY2thZ2VKc29uSW50ZXJmID0gSlNPTi5wYXJzZShwa2pzb25TdHIpO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXBzIG9mIFtwa2pzb24uZGVwZW5kZW5jaWVzLCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXSBhcyB7W25hbWU6IHN0cmluZ106IHN0cmluZ31bXSApIHtcbiAgICAgIC8vICAgT2JqZWN0LmVudHJpZXMoZGVwcyk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30pO1xuXG4gICAgICAvLyBjb25zdCB1cGRhdGluZ0RlcHMgPSB7Li4ucGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXBzID0gW107XG4gICAgICBkZXBzLmZvckVhY2goZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIC8vIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGVwcywgaG9pc3RlZFBlZXJzOiBob2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdGVkRGV2OiBob2lzdGVkRGV2RGVwcywgaG9pc3RlZERldlBlZXJzOiBkZXZIb2lzdFBlZXJEZXBJbmZvXG4gICAgICB9ID1cbiAgICAgICAgbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXksIHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30sIHBranNvbi5kZXZEZXBlbmRlbmNpZXNcbiAgICAgICk7XG5cblxuICAgICAgY29uc3QgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuICAgICAgICAuLi5wa2pzb24sXG4gICAgICAgIGRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGVwcy5lbnRyaWVzKCkpXG4gICAgICAgIC5jb25jYXQoQXJyYXkuZnJvbShob2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkuZmlsdGVyKGl0ZW0gPT4gIWl0ZW1bMV0ubWlzc2luZykpXG4gICAgICAgIC5maWx0ZXIoKFtuYW1lXSkgPT4gIWlzRHJjcFN5bWxpbmsgfHwgbmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KSxcblxuICAgICAgICBkZXZEZXBlbmRlbmNpZXM6IEFycmF5LmZyb20oaG9pc3RlZERldkRlcHMuZW50cmllcygpKVxuICAgICAgICAuY29uY2F0KEFycmF5LmZyb20oZGV2SG9pc3RQZWVyRGVwSW5mby5lbnRyaWVzKCkpLmZpbHRlcihpdGVtID0+ICFpdGVtWzFdLm1pc3NpbmcpKVxuICAgICAgICAuZmlsdGVyKChbbmFtZV0pID0+ICFpc0RyY3BTeW1saW5rIHx8IG5hbWUgIT09ICdAd2ZoL3BsaW5rJylcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSlcbiAgICAgIH07XG5cbiAgICAgIC8vIGxvZy5pbmZvKGluc3RhbGxKc29uKVxuICAgICAgLy8gY29uc3QgaW5zdGFsbGVkQ29tcCA9IHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShzdGF0ZS53b3Jrc3BhY2VzLCBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXkpO1xuXG4gICAgICBjb25zdCBleGlzdGluZyA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcblxuICAgICAgY29uc3QgaG9pc3RJbmZvU3VtbWFyeTogV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mb1N1bW1hcnknXSA9IHtcbiAgICAgICAgY29uZmxpY3REZXBzOiBbXSwgbWlzc2luZ0RlcHM6IHt9LCBtaXNzaW5nRGV2RGVwczoge31cbiAgICAgIH07XG5cbiAgICAgIGZvciAoY29uc3QgZGVwc0luZm8gb2YgW2hvaXN0ZWREZXBzLCBob2lzdFBlZXJEZXBJbmZvXSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtkZXAsIGluZm9dIG9mIGRlcHNJbmZvLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChpbmZvLm1pc3NpbmcpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkubWlzc2luZ0RlcHNbZGVwXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWluZm8uc2FtZVZlciAmJiAhaW5mby5kaXJlY3QpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkuY29uZmxpY3REZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZGVwc0luZm8gb2YgW2hvaXN0ZWREZXZEZXBzLCBkZXZIb2lzdFBlZXJEZXBJbmZvXSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtkZXAsIGluZm9dIG9mIGRlcHNJbmZvLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChpbmZvLm1pc3NpbmcpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkubWlzc2luZ0RldkRlcHNbZGVwXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWluZm8uc2FtZVZlciAmJiAhaW5mby5kaXJlY3QpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkuY29uZmxpY3REZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBpZDogd3NLZXksXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcyxcbiAgICAgICAgaG9pc3RJbmZvOiBob2lzdGVkRGVwcyxcbiAgICAgICAgaG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3REZXZJbmZvOiBob2lzdGVkRGV2RGVwcyxcbiAgICAgICAgaG9pc3REZXZQZWVyRGVwSW5mbzogZGV2SG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3RJbmZvU3VtbWFyeVxuICAgICAgfTtcbiAgICAgIHN0YXRlLmxhc3RDcmVhdGVkV29ya3NwYWNlID0gd3NLZXk7XG4gICAgICBzdGF0ZS53b3Jrc3BhY2VzLnNldCh3c0tleSwgZXhpc3RpbmcgPyBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCB3cCkgOiB3cCk7XG4gICAgfSxcbiAgICBfaW5zdGFsbFdvcmtzcGFjZShkLCB7cGF5bG9hZDoge3dvcmtzcGFjZUtleX19OiBQYXlsb2FkQWN0aW9uPHt3b3Jrc3BhY2VLZXk6IHN0cmluZ30+KSB7fSxcbiAgICAvLyBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHt9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9QcmooZCwge3BheWxvYWQ6IHtwcmosIHBrZ3N9fTogUGF5bG9hZEFjdGlvbjx7cHJqOiBzdHJpbmc7IHBrZ3M6IHtuYW1lOiBzdHJpbmd9W119Pikge1xuICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChwYXRoVG9Qcm9qS2V5KHByaiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKGQsXG4gICAgICB7cGF5bG9hZDoge3BhdHRlcm4sIHBrZ3N9fTogUGF5bG9hZEFjdGlvbjx7cGF0dGVybjogc3RyaW5nOyBwa2dzOiB7bmFtZTogc3RyaW5nfVtdfT4pIHtcbiAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLnNldChwYXRoVG9Qcm9qS2V5KHBhdHRlcm4pLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5leHBvcnQgY29uc3Qge3VwZGF0ZUdpdElnbm9yZXMsIG9uTGlua2VkUGFja2FnZUFkZGVkfSA9IGFjdGlvbkRpc3BhdGNoZXI7XG5cbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIGNvbnN0IHVwZGF0ZWRXb3Jrc3BhY2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZUFkZGVkTGlzdCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG5cbiAgY29uc3QgZ2l0SWdub3JlRmlsZXNXYWl0aW5nID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKGdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzID09IG51bGwpIHtcbiAgICAvLyBCZWNhdXNlIHNyY0RpcjJQYWNrYWdlcyBpcyBuZXdseSBhZGRlZCwgdG8gYXZvaWQgZXhpc3RpbmcgcHJvamVjdFxuICAgIC8vIGJlaW5nIGJyb2tlbiBmb3IgbWlzc2luZyBpdCBpbiBwcmV2aW91c2x5IHN0b3JlZCBzdGF0ZSBmaWxlXG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5zcmNEaXIyUGFja2FnZXMgPSBuZXcgTWFwKCkpO1xuICB9XG4gIHJldHVybiBtZXJnZShcbiAgICAvLyBUbyBvdmVycmlkZSBzdG9yZWQgc3RhdGUuIFxuICAgIC8vIERvIG5vdCBwdXQgZm9sbG93aW5nIGxvZ2ljIGluIGluaXRpYWxTdGF0ZSEgSXQgd2lsbCBiZSBvdmVycmlkZGVuIGJ5IHByZXZpb3VzbHkgc2F2ZWQgc3RhdGVcblxuICAgIG9mKDEpLnBpcGUodGFwKCgpID0+IHByb2Nlc3MubmV4dFRpY2soKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGxpbmtQYWNrYWdlSW5mbygpKSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdExpc3QoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICAgIHJldHVybiBwa3M7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuc3JjRGlyMlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIodiA9PiB2ICE9IG51bGwpLFxuICAgICAgbWFwKChsaW5rUGF0dGVybk1hcCkgPT4ge1xuICAgICAgICBzZXRMaW5rUGF0dGVybnMobGlua1BhdHRlcm5NYXAua2V5cygpKTtcbiAgICAgIH0pKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzY2FuPFBhY2thZ2VzU3RhdGVbJ3NyY1BhY2thZ2VzJ10+KChwcmV2TWFwLCBjdXJyTWFwKSA9PiB7XG4gICAgICAgIHBhY2thZ2VBZGRlZExpc3Quc3BsaWNlKDApO1xuICAgICAgICBmb3IgKGNvbnN0IG5tIG9mIGN1cnJNYXAua2V5cygpKSB7XG4gICAgICAgICAgaWYgKCFwcmV2TWFwLmhhcyhubSkpIHtcbiAgICAgICAgICAgIHBhY2thZ2VBZGRlZExpc3QucHVzaChubSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYWNrYWdlQWRkZWRMaXN0Lmxlbmd0aCA+IDApXG4gICAgICAgICAgb25MaW5rZWRQYWNrYWdlQWRkZWQocGFja2FnZUFkZGVkTGlzdCk7XG4gICAgICAgIHJldHVybiBjdXJyTWFwO1xuICAgICAgfSlcbiAgICApLFxuICAgIC8vICB1cGRhdGVXb3Jrc3BhY2VcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudXBkYXRlV29ya3NwYWNlKSxcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWQ6IHtkaXIsIGlzRm9yY2UsIGNyZWF0ZUhvb2ssIHVzZU5wbUNpLCBwYWNrYWdlSnNvbkZpbGVzfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UoZGlyKTtcbiAgICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgUGF0aC5yZXNvbHZlKGRpciwgJ2FwcC5qcycpKTtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGlmIChpc0ZvcmNlIHx8IHVzZU5wbUNpKSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgY29uc3Qgd3MgPSBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZpbmcgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHBhY2thZ2VKc29uRmlsZXMgIT0gbnVsbCA/IHNjYW5BbmRTeW5jUGFja2FnZXMocGFja2FnZUpzb25GaWxlcyk6XG4gICAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnNjYW5BbmRTeW5jUGFja2FnZXMpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHNjYW5BbmRTeW5jUGFja2FnZXMocGF5bG9hZC5wYWNrYWdlSnNvbkZpbGVzKSxcbiAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY0xpbmtlZFBhY2thZ2VzKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICB0YXAoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjdXJyV3MgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmICh3c0tleSAhPT0gY3VycldzKVxuICAgICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoY3VycldzICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgXCJjdXJyZW50IHdvcmtzcGFjZVwiIGlzIHRoZSBsYXN0IG9uZSBiZWluZyB1cGRhdGVkLCBzbyB0aGF0IGl0IHJlbWFpbnMgXCJjdXJyZW50XCJcbiAgICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2RpcjogUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnJXcyl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBsaW5rRW52LndvcmtEaXIsXG4gICAgICAgICAgICAuLi5wYXlsb2FkfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY3VyciA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgICAgICBpZiAoY3VyciAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyhjdXJyKSkge1xuICAgICAgICAgICAgICBjb25zdCBwYXRoID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnIpO1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwYXRoLCAuLi5wYXlsb2FkfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faG9pc3RXb3Jrc3BhY2VEZXBzKSxcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgLy8gYWN0aW9uRGlzcGF0Y2hlci5vbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKHdzS2V5KTtcbiAgICAgICAgZGVsZXRlRHVwbGljYXRlZEluc3RhbGxlZFBrZyh3c0tleSk7XG4gICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVEaXIpLFxuICAgICAgdGFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gc2NhbkFuZFN5bmNQYWNrYWdlcygpKSxcbiAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMud29ya3NwYWNlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHdzID0+IHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20od3Mua2V5cygpKTtcbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9KSxcbiAgICAgIHNjYW48c3RyaW5nW10+KChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgIGlmIChwcmV2Lmxlbmd0aCA8IGN1cnIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbmV3QWRkZWQgPSBfLmRpZmZlcmVuY2UoY3VyciwgcHJldik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgbG9nLmluZm8oJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdzIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IHdzfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICAvLyBvYnNlcnZlIGFsbCBleGlzdGluZyBXb3Jrc3BhY2VzIGZvciBkZXBlbmRlbmN5IGhvaXN0aW5nIHJlc3VsdCBcbiAgICAuLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgLy8gZmlsdGVyKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgdGFrZVdoaWxlKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpISksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLmluc3RhbGxKc29uID09PSBzMi5pbnN0YWxsSnNvbiksXG4gICAgICAgIHNjYW48V29ya3NwYWNlU3RhdGU+KChvbGQsIG5ld1dzKSA9PiB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuICAgICAgICAgIGNvbnN0IG5ld0RlcHMgPSBPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gZm9yY2luZyBpbnN0YWxsIHdvcmtzcGFjZSwgdGhlcmVmb3JlIGRlcGVuZGVuY2llcyBpcyBjbGVhcmVkIGF0IHRoaXMgbW9tZW50XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG9sZERlcHMgPSBPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG5cbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggIT09IG9sZERlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IGtleX0pO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdEZXBzLnNvcnQoKTtcbiAgICAgICAgICBvbGREZXBzLnNvcnQoKTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IG5ld0RlcHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobmV3RGVwc1tpXSAhPT0gb2xkRGVwc1tpXSkge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IGtleX0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICB9KSxcbiAgICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UsIHNsaWNlLmFjdGlvbnMud29ya3NwYWNlQmF0Y2hDaGFuZ2VkKSxcbiAgICAgIGNvbmNhdE1hcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAoYWN0aW9uLnR5cGUgPT09IHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UudHlwZSkge1xuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gKGFjdGlvbi5wYXlsb2FkIGFzIFBhcmFtZXRlcnM8dHlwZW9mIHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2U+WzBdKS53b3Jrc3BhY2VLZXk7XG4gICAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3NLZXkpKSxcbiAgICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgY29uY2F0TWFwKHdzID0+IGluc3RhbGxXb3Jrc3BhY2Uod3MhLCBnZXRTdGF0ZSgpLm5wbUluc3RhbGxPcHQpKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgICAgIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uod3NLZXkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IHdzS2V5cyA9IGFjdGlvbi5wYXlsb2FkIGFzIFBhcmFtZXRlcnM8dHlwZW9mIHNsaWNlLmFjdGlvbnMud29ya3NwYWNlQmF0Y2hDaGFuZ2VkPlswXTtcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoLi4ud3NLZXlzLm1hcChfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UpKTsgXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLndvcmtzcGFjZVN0YXRlVXBkYXRlZCksXG4gICAgICBtYXAoYWN0aW9uID0+IHVwZGF0ZWRXb3Jrc3BhY2VTZXQuYWRkKGFjdGlvbi5wYXlsb2FkKSksXG4gICAgICBkZWJvdW5jZVRpbWUoODAwKSxcbiAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlQmF0Y2hDaGFuZ2VkKEFycmF5LmZyb20odXBkYXRlZFdvcmtzcGFjZVNldC52YWx1ZXMoKSkpO1xuICAgICAgICB1cGRhdGVkV29ya3NwYWNlU2V0LmNsZWFyKCk7XG4gICAgICAgIC8vIHJldHVybiBmcm9tKHdyaXRlQ29uZmlnRmlsZXMoKSk7XG4gICAgICB9KSxcbiAgICAgIG1hcChhc3luYyAoKSA9PiB7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIucGFja2FnZXNVcGRhdGVkKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZUdpdElnbm9yZXMpLFxuICAgICAgdGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGxldCByZWwgPSBhY3Rpb24ucGF5bG9hZC5maWxlO1xuICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHJlbCkpIHtcbiAgICAgICAgICByZWwgPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHJlbCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB9XG4gICAgICAgIGdpdElnbm9yZUZpbGVzV2FpdGluZy5hZGQocmVsKTtcbiAgICAgIH0pLFxuICAgICAgZGVib3VuY2VUaW1lKDUwMCksXG4gICAgICBtYXAoKCkgPT4ge1xuICAgICAgICBjb25zdCBjaGFuZ2VkRmlsZXMgPSBbLi4uZ2l0SWdub3JlRmlsZXNXYWl0aW5nLnZhbHVlcygpXTtcbiAgICAgICAgZ2l0SWdub3JlRmlsZXNXYWl0aW5nLmNsZWFyKCk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VkRmlsZXM7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcCgoY2hhbmdlZEZpbGVzKSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZSguLi5jaGFuZ2VkRmlsZXMubWFwKGFzeW5jIHJlbCA9PiB7XG4gICAgICAgICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCByZWwpO1xuICAgICAgICAgIGNvbnN0IGxpbmVzID0gZ2V0U3RhdGUoKS5naXRJZ25vcmVzW2ZpbGVdO1xuICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTGluZXMgPSBkYXRhLnNwbGl0KC9cXG5cXHI/LykubWFwKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSBfLmRpZmZlcmVuY2UobGluZXMsIGV4aXN0aW5nTGluZXMpO1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGRhdGEgKyBFT0wgKyBuZXdMaW5lcy5qb2luKEVPTCksICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdNb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyKTtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycik7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFBhY2thZ2VzU3RhdGU+IHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1Byb2pLZXkocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm9qS2V5VG9QYXRoKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLmlzQWJzb2x1dGUoa2V5KSA/IGtleSA6IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlRGlyKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdExpc3QoKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUocm9vdERpciwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBtZWFudCB0byB0cmlnZ2VyIGVkaXRvci1oZWxwZXIgdG8gdXBkYXRlIHRzY29uZmlnIGZpbGVzLCBzb1xuICogZWRpdG9yLWhlbHBlciBtdXN0IGJlIGltcG9ydCBhdCBmaXJzdFxuICogQHBhcmFtIGRpciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaEN1cnJlbnRXb3Jrc3BhY2UoZGlyOiBzdHJpbmcpIHtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZUJhdGNoQ2hhbmdlZChbd29ya3NwYWNlS2V5KGRpcildKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKGdldFN0YXRlKCksIHdzS2V5KTtcblxuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtnRW50cnkpIHtcbiAgICAgIHlpZWxkIFtway5uYW1lLCBwa107XG4gICAgfVxuICB9KSgpKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxlZENvbXBvbmVudHMgPSBpbnN0YWxsZWQpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSk7XG59XG5cbi8qKlxuICogRGVsZXRlIHdvcmtzcGFjZSBzdGF0ZSBpZiBpdHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0XG4gKi9cbmZ1bmN0aW9uIGNoZWNrQWxsV29ya3NwYWNlcygpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rID0gZmFsc2UpIHtcbiAgbG9nLmRlYnVnKCdpbml0Um9vdERpcmVjdG9yeScpO1xuICBjb25zdCByb290UGF0aCA9IHJvb3REaXI7XG4gIGZzZXh0Lm1rZGlycFN5bmMoZGlzdERpcik7XG4gIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvY29uZmlnLmxvY2FsLXRlbXBsYXRlLnlhbWwnKSwgUGF0aC5qb2luKGRpc3REaXIsICdjb25maWcubG9jYWwueWFtbCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9sb2c0anMuanMnKSwgcm9vdFBhdGggKyAnL2xvZzRqcy5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJyxcbiAgICAgICdnaXRpZ25vcmUudHh0JyksIHJvb3REaXIgKyAnLy5naXRpZ25vcmUnKTtcbiAgYXdhaXQgY2xlYW5JbnZhbGlkU3ltbGlua3MoKTtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG5cbiAgaWYgKGNyZWF0ZUhvb2spIHtcbiAgICBwcm9qZWN0RGlycy5mb3JFYWNoKHByamRpciA9PiB7XG4gICAgICBfd3JpdGVHaXRIb29rKHByamRpcik7XG4gICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNsaW50Lmpzb24nKSwgcHJqZGlyICsgJy90c2xpbnQuanNvbicpO1xuICAgIH0pO1xuICB9XG5cbiAgYXdhaXQgc2NhbkFuZFN5bmNQYWNrYWdlcygpO1xuICAvLyBhd2FpdCBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKSwgbmV3IFNldDxzdHJpbmc+KCkpO1xufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZUNvbmZpZ0ZpbGVzKCkge1xuLy8gICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbi8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgICBsb2cuaW5mbygnd3JpdGUgY29uZmlnIGZpbGU6JywgZmlsZSk7XG4vLyAgICAgd3JpdGVGaWxlKFBhdGguam9pbihkaXN0RGlyLCBmaWxlKSxcbi8vICAgICAgICdcXG4jIERPIE5PVCBNT0RJRklZIFRISVMgRklMRSFcXG4nICsgY29uZmlnQ29udGVudCk7XG4vLyAgIH0pO1xuLy8gfVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSwgbnBtT3B0OiBOcG1PcHRpb25zKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3cy5pZCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5zdGFsbEluRGlyKGRpciwgbnBtT3B0LCB3cy5vcmlnaW5JbnN0YWxsSnNvblN0ciwgd3MuaW5zdGFsbEpzb25TdHIpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgIGNvbnN0IHdzZCA9IGQud29ya3NwYWNlcy5nZXQod3MuaWQpITtcbiAgICAgIHdzZC5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgd3NkLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgd3NkLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS1sb2NrLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oYFByb2JsZW1hdGljICR7bG9ja0ZpbGV9IGlzIGRlbGV0ZWQsIHBsZWFzZSB0cnkgYWdhaW5gKTtcbiAgICAgICAgZnMudW5saW5rU3luYyhsb2NrRmlsZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxJbkRpcihkaXI6IHN0cmluZywgbnBtT3B0OiBOcG1PcHRpb25zLCBvcmlnaW5Qa2dKc29uU3RyOiBzdHJpbmcsIHRvSW5zdGFsbFBrZ0pzb25TdHI6IHN0cmluZykge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyBkaXIpO1xuICB0cnkge1xuICAgIGF3YWl0IGNvcHlOcG1yY1RvV29ya3NwYWNlKGRpcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtzSW5Nb2R1bGVEaXIgPSBbXSBhcyB7Y29udGVudDogc3RyaW5nLCBsaW5rOiBzdHJpbmd9W107XG5cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgIGZzZXh0Lm1rZGlycFN5bmModGFyZ2V0KTtcbiAgfVxuXG4gIC8vIDEuIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgLy8gYmFja3VwIHRoZW0gZm9yIGxhdGUgcmVjb3ZlcnlcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKHRhcmdldCwgbGluayA9PiB7XG4gICAgbG9nLmRlYnVnKCdSZW1vdmUgc3ltbGluaycsIGxpbmspO1xuICAgIGNvbnN0IGxpbmtDb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIHN5bWxpbmtzSW5Nb2R1bGVEaXIucHVzaCh7Y29udGVudDogbGlua0NvbnRlbnQsIGxpbmt9KTtcbiAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gIH0pO1xuICAvLyAyLiBSdW4gYG5wbSBpbnN0YWxsYFxuICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgdG9JbnN0YWxsUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgLy8gc2F2ZSBhIGxvY2sgZmlsZSB0byBpbmRpY2F0ZSBpbi1wcm9jZXNzIG9mIGluc3RhbGxpbmcsIG9uY2UgaW5zdGFsbGF0aW9uIGlzIGNvbXBsZXRlZCB3aXRob3V0IGludGVycnVwdGlvbiwgZGVsZXRlIGl0LlxuICAvLyBjaGVjayBpZiB0aGVyZSBpcyBleGlzdGluZyBsb2NrIGZpbGUsIG1lYW5pbmcgYSBwcmV2aW91cyBpbnN0YWxsYXRpb24gaXMgaW50ZXJydXB0ZWQuXG4gIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICBmcy5wcm9taXNlcy53cml0ZUZpbGUobG9ja0ZpbGUsIG9yaWdpblBrZ0pzb25TdHIpO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMDApKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnYgPSB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIE5PREVfRU5WOiAnZGV2ZWxvcG1lbnQnXG4gICAgfSBhcyBOb2RlSlMuUHJvY2Vzc0VudjtcblxuICAgIGlmIChucG1PcHQuY2FjaGUpXG4gICAgICBlbnYubnBtX2NvbmZpZ19jYWNoZSA9IG5wbU9wdC5jYWNoZTtcbiAgICBpZiAobnBtT3B0Lm9mZmxpbmUpXG4gICAgICBlbnYubnBtX2NvbmZpZ19vZmZsaW5lID0gJ3RydWUnO1xuXG4gICAgY29uc3QgY21kQXJncyA9IFtucG1PcHQudXNlTnBtQ2kgPyAnY2knIDogJ2luc3RhbGwnXTtcblxuICAgIGF3YWl0IGV4ZSgnbnBtJywgLi4uY21kQXJncywge2N3ZDogZGlyLCBlbnZ9KS5kb25lO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICBhd2FpdCBleGUoJ25wbScsICdwcnVuZScsIHtjd2Q6IGRpciwgZW52fSkuZG9uZTtcbiAgICAvLyBcIm5wbSBkZHBcIiByaWdodCBhZnRlciBcIm5wbSBpbnN0YWxsXCIgd2lsbCBjYXVzZSBkZXZEZXBlbmRlbmNpZXMgYmVpbmcgcmVtb3ZlZCBzb21laG93LCBkb24ndCBrbm93blxuICAgIC8vIHdoeSwgSSBoYXZlIHRvIGFkZCBhIHNldEltbWVkaWF0ZSgpIGJldHdlZW4gdGhlbSB0byB3b3JrYXJvdW5kXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGUoJ25wbScsICdkZHAnLCB7Y3dkOiBkaXIsIGVudn0pLnByb21pc2U7XG4gICAgfSBjYXRjaCAoZGRwRXJyKSB7XG4gICAgICBsb2cud2FybignRmFpbGVkIHRvIGRlZHVwZSBkZXBlbmRlbmNpZXMsIGJ1dCBpdCBpcyBPSycsIGRkcEVycik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBlLnN0YWNrKTtcbiAgICB0aHJvdyBlO1xuICB9IGZpbmFsbHkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdSZWNvdmVyICcgKyBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIC8vIDMuIFJlY292ZXIgcGFja2FnZS5qc29uIGFuZCBzeW1saW5rcyBkZWxldGVkIGluIFN0ZXAuMS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgb3JpZ2luUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBmcy5wcm9taXNlcy51bmxpbmsobG9ja0ZpbGUpO1xuICAgIGF3YWl0IHJlY292ZXJTeW1saW5rcygpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgZnNleHQubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuc3ltbGluayhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY29weU5wbXJjVG9Xb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJy5ucG1yYycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXQpKVxuICAgIHJldHVybjtcbiAgY29uc3QgaXNDaGluYSA9IGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLmlzSW5DaGluYSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIoY24gPT4gY24gIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKTtcblxuICBpZiAoaXNDaGluYSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdjcmVhdGUgLm5wbXJjIHRvJywgdGFyZ2V0KTtcbiAgICBmcy5jb3B5RmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9ucG1yYy1mb3ItY24udHh0JyksIHRhcmdldCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc2NhbkFuZFN5bmNQYWNrYWdlcyhpbmNsdWRlUGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBjb25zdCBzcmNQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBsZXQgcGtnTGlzdDogUGFja2FnZUluZm9bXTtcblxuICBpZiAoaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMpIHtcbiAgICBjb25zdCBwcmpLZXlzID0gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKTtcbiAgICBjb25zdCBwcmpEaXJzID0gcHJqS2V5cy5tYXAocHJqS2V5ID0+IHByb2pLZXlUb1BhdGgocHJqS2V5KSk7XG4gICAgcGtnTGlzdCA9IGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzLm1hcChqc29uRmlsZSA9PiB7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8oanNvbkZpbGUsIGZhbHNlKTtcbiAgICAgIGNvbnN0IHByaklkeCA9IHByakRpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgIGlmIChwcmpJZHggPj0gMCkge1xuICAgICAgICBjb25zdCBwcmpQYWNrYWdlTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByaktleXNbcHJqSWR4XSkhO1xuICAgICAgICBpZiAoIXByalBhY2thZ2VOYW1lcy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtcbiAgICAgICAgICAgIHByajogcHJqS2V5c1twcmpJZHhdLFxuICAgICAgICAgICAgcGtnczogWy4uLnByalBhY2thZ2VOYW1lcy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBbLi4uZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMua2V5cygpXTtcbiAgICAgICAgY29uc3QgbGlua2VkU3JjRGlycyA9IGtleXMubWFwKGtleSA9PiBwcm9qS2V5VG9QYXRoKGtleSkpO1xuICAgICAgICBjb25zdCBpZHggPSBsaW5rZWRTcmNEaXJzLmZpbmRJbmRleChkaXIgPT4gaW5mby5yZWFsUGF0aCA9PT0gZGlyIHx8ICBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgY29uc3QgcGtncyA9IGdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzLmdldChrZXlzW2lkeF0pITtcbiAgICAgICAgICBpZiAoIXBrZ3MuaW5jbHVkZXMoaW5mby5uYW1lKSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtcbiAgICAgICAgICAgICAgcGF0dGVybjoga2V5c1tpZHhdLFxuICAgICAgICAgICAgICBwa2dzOiBbLi4ucGtncy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2luZm8ucmVhbFBhdGh9IGlzIG5vdCB1bmRlciBhbnkga25vd24gUHJvamVjdCBkaXJlY3RvcnlzOiAke3ByakRpcnMuY29uY2F0KGxpbmtlZFNyY0RpcnMpLmpvaW4oJywgJyl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH0pO1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNMaW5rZWRQYWNrYWdlcyhbcGtnTGlzdCwgJ3VwZGF0ZSddKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuICAgIHBrZ0xpc3QgPSBbXTtcbiAgICBhd2FpdCBybS5zY2FuUGFja2FnZXMoKS5waXBlKFxuICAgICAgdGFwKChbcHJvaiwganNvbkZpbGUsIHNyY0Rpcl0pID0+IHtcbiAgICAgICAgaWYgKHByb2ogJiYgIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAgICAgaWYgKHByb2ogPT0gbnVsbCAmJiBzcmNEaXIgJiYgIXNyY1BrZ01hcC5oYXMoc3JjRGlyKSlcbiAgICAgICAgICBzcmNQa2dNYXAuc2V0KHNyY0RpciwgW10pO1xuXG4gICAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgICBpZiAoaW5mby5qc29uLmRyIHx8IGluZm8uanNvbi5wbGluaykge1xuICAgICAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgICAgICBpZiAocHJvailcbiAgICAgICAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2UgaWYgKHNyY0RpcilcbiAgICAgICAgICAgIHNyY1BrZ01hcC5nZXQoc3JjRGlyKSEucHVzaChpbmZvKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb2cuZXJyb3IoYE9ycGhhbiAke2pzb25GaWxlfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgUGFja2FnZSBvZiAke2pzb25GaWxlfSBpcyBza2lwcGVkIChkdWUgdG8gbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSlgKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICAgIGZvciAoY29uc3QgW3ByaiwgcGtnc10gb2YgcHJvalBrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3NyY0RpciwgcGtnc10gb2Ygc3JjUGtnTWFwLmVudHJpZXMoKSkge1xuICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtwYXR0ZXJuOiBzcmNEaXIsIHBrZ3N9KTtcbiAgICB9XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICdjbGVhbiddKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICcubGlua3MnICYmIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCAnLmxpbmtzJykpKSB7XG4gICAgZnNleHQucmVtb3ZlKFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgJy5saW5rcycpKVxuICAgIC5jYXRjaChleCA9PiBsb2cuaW5mbyhleCkpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksIHN5bWxpbmtEaXJOYW1lIHx8ICdub2RlX21vZHVsZXMnKTtcbiAgZnNleHQubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIGlmICh3cy5pbnN0YWxsZWRDb21wb25lbnRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgICBwa2dOYW1lU2V0LmFkZChwbmFtZSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShyb290RGlyLCBzeW1saW5rRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyldfSk7XG4gIH1cblxuICByZXR1cm4gbWVyZ2UoXG4gICAgZnJvbShwa2dOYW1lU2V0LnZhbHVlcygpKS5waXBlKFxuICAgICAgbWFwKG5hbWUgPT4gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkgfHwgd3MuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpISksXG4gICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhzeW1saW5rRGlyKVxuICAgICksXG4gICAgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKHN5bWxpbmtEaXIsIHBrZ05hbWVTZXQpXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9kZWxldGVVc2VsZXNzU3ltbGluayhjaGVja0Rpcjogc3RyaW5nLCBleGNsdWRlU2V0OiBTZXQ8c3RyaW5nPikge1xuICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGRyY3BOYW1lID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lIDogbnVsbDtcbiAgY29uc3QgZG9uZTEgPSBsaXN0TW9kdWxlU3ltbGlua3MoY2hlY2tEaXIsIGFzeW5jIGxpbmsgPT4ge1xuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGNoZWNrRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiAhZXhjbHVkZVNldC5oYXMocGtnTmFtZSkpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYERlbGV0ZSBleHRyYW5lb3VzIHN5bWxpbms6ICR7bGlua31gKTtcbiAgICAgIGRvbmVzLnB1c2goZnMucHJvbWlzZXMudW5saW5rKGxpbmspKTtcbiAgICB9XG4gIH0pO1xuICBhd2FpdCBkb25lMTtcbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm8ocGtKc29uRmlsZTogc3RyaW5nLCBpc0luc3RhbGxlZCA9IGZhbHNlKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSk7XG4gIHJldHVybiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGUsIGpzb24sIGlzSW5zdGFsbGVkKTtcbn1cbi8qKlxuICogTGlzdCB0aG9zZSBpbnN0YWxsZWQgcGFja2FnZXMgd2hpY2ggYXJlIHJlZmVyZW5jZWQgYnkgd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlLFxuICogdGhvc2UgcGFja2FnZXMgbXVzdCBoYXZlIFwiZHJcIiBwcm9wZXJ0eSBpbiBwYWNrYWdlLmpzb24gXG4gKiBAcGFyYW0gd29ya3NwYWNlS2V5IFxuICovXG5mdW5jdGlvbiogc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCB3b3Jrc3BhY2VLZXk6IHN0cmluZykge1xuICBjb25zdCBvcmlnaW5JbnN0YWxsSnNvbiA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhLm9yaWdpbkluc3RhbGxKc29uO1xuICAvLyBjb25zdCBkZXBKc29uID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXNdIDpcbiAgLy8gICBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdO1xuICBmb3IgKGNvbnN0IGRlcHMgb2YgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXSkge1xuICAgIGlmIChkZXBzID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgaWYgKCFzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwKSAmJiBkZXAgIT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBjb25zdCBwa2pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwa2pzb25GaWxlKSkge1xuICAgICAgICAgIGNvbnN0IHBrID0gY3JlYXRlUGFja2FnZUluZm8oXG4gICAgICAgICAgICBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyksIHRydWVcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspIHtcbiAgICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGU6IHN0cmluZywganNvbjogYW55LCBpc0luc3RhbGxlZCA9IGZhbHNlKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBtID0gbW9kdWxlTmFtZVJlZy5leGVjKGpzb24ubmFtZSk7XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgc2hvcnROYW1lOiBtIVsyXSxcbiAgICBuYW1lOiBqc29uLm5hbWUsXG4gICAgc2NvcGU6IG0hWzFdLFxuICAgIHBhdGg6IFBhdGguam9pbihzeW1saW5rRGlyTmFtZSwganNvbi5uYW1lKSxcbiAgICBqc29uLFxuICAgIHJlYWxQYXRoOiBmcy5yZWFscGF0aFN5bmMoUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpKSxcbiAgICBpc0luc3RhbGxlZFxuICB9O1xuICByZXR1cm4gcGtJbmZvO1xufVxuXG5mdW5jdGlvbiBjcChmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKF8uc3RhcnRzV2l0aChmcm9tLCAnLScpKSB7XG4gICAgZnJvbSA9IGFyZ3VtZW50c1sxXTtcbiAgICB0byA9IGFyZ3VtZW50c1syXTtcbiAgfVxuICBmc2V4dC5jb3B5U3luYyhmcm9tLCB0byk7XG4gIC8vIHNoZWxsLmNwKC4uLmFyZ3VtZW50cyk7XG4gIGlmICgvWy9cXFxcXSQvLnRlc3QodG8pKVxuICAgIHRvID0gUGF0aC5iYXNlbmFtZShmcm9tKTsgLy8gdG8gaXMgYSBmb2xkZXJcbiAgZWxzZVxuICAgIHRvID0gUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCB0byk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnQ29weSB0byAlcycsIGNoYWxrLmN5YW4odG8pKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBmcm9tIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0byByZWxhdGl2ZSB0byByb290UGF0aCBcbiAqL1xuZnVuY3Rpb24gbWF5YmVDb3B5VGVtcGxhdGUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBfd3JpdGVHaXRIb29rKHByb2plY3Q6IHN0cmluZykge1xuICAvLyBpZiAoIWlzV2luMzIpIHtcbiAgY29uc3QgZ2l0UGF0aCA9IFBhdGgucmVzb2x2ZShwcm9qZWN0LCAnLmdpdC9ob29rcycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoKSkge1xuICAgIGNvbnN0IGhvb2tTdHIgPSAnIyEvYmluL3NoXFxuJyArXG4gICAgICBgY2QgXCIke3Jvb3REaXJ9XCJcXG5gICtcbiAgICAgIC8vICdkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICducHggcHJldHR5LXF1aWNrIC0tc3RhZ2VkXFxuJyArIC8vIFVzZSBgdHNsaW50IC0tZml4YCBpbnN0ZWFkLlxuICAgICAgYHBsaW5rIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rU3luYyhnaXRQYXRoICsgJy9wcmUtY29tbWl0Jyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhnaXRQYXRoICsgJy9wcmUtcHVzaCcsIGhvb2tTdHIpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgZ2l0UGF0aCArICcvcHJlLXB1c2gnKTtcbiAgICBpZiAoIWlzV2luMzIpIHtcbiAgICAgIHNwYXduKCdjaG1vZCcsICctUicsICcreCcsIHByb2plY3QgKyAnLy5naXQvaG9va3MvcHJlLXB1c2gnKTtcbiAgICB9XG4gIH1cbiAgLy8gfVxufVxuXG5mdW5jdGlvbiBkZWxldGVEdXBsaWNhdGVkSW5zdGFsbGVkUGtnKHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhO1xuICBjb25zdCBkb05vdGhpbmcgPSAoKSA9PiB7fTtcbiAgd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKS5tYXAoKFtwa2dOYW1lXSkgPT4ge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBwa2dOYW1lKTtcbiAgICByZXR1cm4gZnMucHJvbWlzZXMubHN0YXQoZGlyKVxuICAgIC50aGVuKChzdGF0KSA9PiB7XG4gICAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oYFByZXZpb3VzIGluc3RhbGxlZCAke1BhdGgucmVsYXRpdmUocm9vdERpcixkaXIpfSBpcyBkZWxldGVkLCBkdWUgdG8gbGlua2VkIHBhY2thZ2UgJHtwa2dOYW1lfWApO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMudW5saW5rKGRpcik7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goZG9Ob3RoaW5nKTtcbiAgfSk7XG59XG5cbi8vIC8qKlxuLy8gICAgKiBJZiBhIHNvdXJjZSBjb2RlIHBhY2thZ2UgdXNlcyBQbGluaydzIF9fcGxpbmsgQVBJICggbGlrZSBgLmxvZ2dlcmApIG9yIGV4dGVuZHMgUGxpbmsncyBjb21tYW5kIGxpbmUsXG4vLyAgICAqIHRoZXkgbmVlZCBlbnN1cmUgc29tZSBQbGluaydzIGRlcGVuZGVuY2llcyBhcmUgaW5zdGFsbGVkIGFzIDFzdCBsZXZlbCBkZXBlbmRlbmN5IGluIHRoZWlyIHdvcmtzcGFjZSxcbi8vICAgICogb3RoZXJ3aXNlIFZpc3VhbCBDb2RlIEVkaXRvciBjYW4gbm90IGZpbmQgY29ycmVjdCB0eXBlIGRlZmluaXRpb25zIHdoaWxlIHJlZmVyZW5jaW5nIFBsaW5rJ3MgbG9nZ2VyIG9yXG4vLyAgICAqIENvbW1hbmQgaW50ZXJmYWNlLlxuLy8gICAgKiBcbi8vICAgICogU28gSSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGVzZSBkZXBlbmRlbmNpZXMgYXJlIGluc3RhbGxlZCBpbiBlYWNoIHdvcmtzcGFjZVxuLy8gICAgKi9cblxuLy8gZnVuY3Rpb24gcGxpbmtBcGlSZXF1aXJlZERlcHMoKTogUGFja2FnZUpzb25JbnRlcmYge1xuLy8gICBjb25zdCBwbGlua0pzb246IFBhY2thZ2VKc29uSW50ZXJmID0gcmVxdWlyZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKTtcbi8vICAgY29uc3QgZmFrZUpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuLy8gICAgIHZlcnNpb246IHBsaW5rSnNvbi52ZXJzaW9uLFxuLy8gICAgIG5hbWU6IHBsaW5rSnNvbi5uYW1lLFxuLy8gICAgIGRlcGVuZGVuY2llczoge31cbi8vICAgfTtcbi8vICAgZm9yIChjb25zdCBkZXAgb2YgWydjb21tYW5kZXInLCAnbG9nNGpzJ10pIHtcbi8vICAgICBjb25zdCB2ZXJzaW9uID0gcGxpbmtKc29uLmRlcGVuZGVuY2llcyFbZGVwXTtcbi8vICAgICBmYWtlSnNvbi5kZXBlbmRlbmNpZXMhW2RlcF0gPSB2ZXJzaW9uO1xuLy8gICB9XG4vLyAgIHJldHVybiBmYWtlSnNvbjtcbi8vIH1cbiJdfQ==