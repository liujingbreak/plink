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
        scanAndSyncPackages(d, action) {
        },
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
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateWorkspace), operators_1.concatMap(({ payload: { dir, isForce, useNpmCi, packageJsonFiles } }) => {
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
                    // eslint-disable-next-line no-console
                    log.debug('force npm install in', wsKey);
                });
            }
        }
        // call initRootDirectory() and wait for it finished by observing action '_syncLinkedPackages',
        // then call _hoistWorkspaceDeps
        return rxjs_1.merge(packageJsonFiles != null ? scanAndSyncPackages(packageJsonFiles) :
            rxjs_1.defer(() => rxjs_1.of(initRootDirectory())), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncLinkedPackages), operators_1.take(1), operators_1.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
    })), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.scanAndSyncPackages), operators_1.concatMap(({ payload }) => {
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
    })), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_1.map(({ payload }) => {
        const wsKey = workspaceKey(payload.dir);
        // actionDispatcher.onWorkspacePackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated(wsKey));
    })), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateDir), operators_1.tap(() => exports.actionDispatcher._updatePlinkPackageInfo()), operators_1.concatMap(() => scanAndSyncPackages()), operators_1.tap(() => {
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
            // eslint-disable-next-line no-console
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
            /* eslint-disable max-len */
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
    }), operators_1.map(() => {
        exports.actionDispatcher.packagesUpdated();
    })), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateGitIgnores), operators_1.tap(action => {
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
                    // eslint-disable-next-line no-console
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
            // eslint-disable-next-line no-console
            log.info(`Workspace ${key} does not exist anymore.`);
            exports.actionDispatcher._change(d => d.workspaces.delete(key));
        }
    }
}
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug('initRootDirectory');
        const rootPath = rootDir;
        fs_extra_1.default.mkdirpSync(distDir);
        // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), rootDir + '/.gitignore');
        yield symlinks_1.default();
        yield scanAndSyncPackages();
        // await _deleteUselessSymlink(Path.resolve(rootDir, 'node_modules'), new Set<string>());
    });
}
// async function writeConfigFiles() {
//   return (await import('../cmd/config-setup')).addupConfigs((file, configContent) => {
// eslint-disable-next-line , no-console
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
                    // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
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
        // eslint-disable-next-line no-console
        log.info('write', installJsonFile);
        fs_1.default.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
        // save a lock file to indicate in-process of installing, once installation is completed without interruption, delete it.
        // check if there is existing lock file, meaning a previous installation is interrupted.
        const lockFile = path_1.default.resolve(dir, 'plink.install.lock');
        void fs_1.default.promises.writeFile(lockFile, originPkgJsonStr);
        yield new Promise(resolve => setImmediate(resolve));
        // await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
            if (npmOpt.cache)
                env.npm_config_cache = npmOpt.cache;
            if (npmOpt.offline)
                env.npm_config_offline = 'true';
            const cmdArgs = [npmOpt.useNpmCi ? 'ci' : 'install'];
            yield process_utils_1.exe('npm', ...cmdArgs, { cwd: dir, env }).done;
            yield new Promise(resolve => setImmediate(resolve));
            yield process_utils_1.exe('npm', 'prune', { cwd: dir, env }).done;
            // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
            // why, I have to add a setImmediate() between them to workaround
            yield new Promise(resolve => setImmediate(resolve));
            try {
                yield process_utils_1.exe('npm', 'ddp', { cwd: dir, env }).promise;
            }
            catch (ddpErr) {
                log.warn('Failed to dedupe dependencies, but it is OK', ddpErr);
            }
        }
        catch (e) {
            // eslint-disable-next-line no-console
            log.error('Failed to install dependencies', e.stack);
            throw e;
        }
        finally {
            // eslint-disable-next-line no-console
            log.info('Recover ' + installJsonFile);
            // 3. Recover package.json and symlinks deleted in Step.1.
            fs_1.default.writeFileSync(installJsonFile, originPkgJsonStr, 'utf8');
            yield recoverSymlinks();
            if (fs_1.default.existsSync(lockFile))
                yield fs_1.default.promises.unlink(lockFile);
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
            // eslint-disable-next-line no-console
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
        const done1 = symlinks_1.listModuleSymlinks(checkDir, link => {
            const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
            if (drcpName !== pkgName && !excludeSet.has(pkgName)) {
                // eslint-disable-next-line no-console
                log.info(`Delete extraneous symlink: ${link}`);
                dones.push(fs_1.default.promises.unlink(link));
            }
        });
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
    // eslint-disable-next-line no-console
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
// function _writeGitHook(project: string) {
//   // if (!isWin32) {
//   const gitPath = Path.resolve(project, '.git/hooks');
//   if (fs.existsSync(gitPath)) {
//     const hookStr = '#!/bin/sh\n' +
//       `cd "${rootDir}"\n` +
//       // 'drcp init\n' +
//       // 'npx pretty-quick --staged\n' + // Use `tslint --fix` instead.
//       `plink lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
//     if (fs.existsSync(gitPath + '/pre-commit'))
//       fs.unlinkSync(gitPath + '/pre-commit');
//     fs.writeFileSync(gitPath + '/pre-push', hookStr);
//     // eslint-disable-next-line no-console
//     log.info('Write ' + gitPath + '/pre-push');
//     if (!isWin32) {
//       spawn('chmod', '-R', '+x', project + '/.git/hooks/pre-push');
//     }
//   }
// }
function deleteDuplicatedInstalledPkg(workspaceKey) {
    const wsState = getState().workspaces.get(workspaceKey);
    const doNothing = () => { };
    wsState.linkedDependencies.concat(wsState.linkedDevDependencies).map(([pkgName]) => {
        const dir = path_1.default.resolve(rootDir, workspaceKey, 'node_modules', pkgName);
        return fs_1.default.promises.lstat(dir)
            .then((stat) => {
            if (!stat.isSymbolicLink()) {
                // eslint-disable-next-line no-console
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCxrREFBMEI7QUFDMUIsd0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFxRTtBQUNyRSw4Q0FDaUY7QUFDakYsc0VBQWlHO0FBQ2pHLG9EQUF1QztBQUN2QyxzREFBbUU7QUFDbkUsb0NBQXlEO0FBQ3pELDhDQUE4QztBQUM5Qyw4REFBbUc7QUFDbkcsb0RBQXNEO0FBQ3RELDJCQUF5QjtBQUN6QixtQ0FBaUM7QUFDakMsd0NBQXlDO0FBQ3pDLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQW1EM0MsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFN0UsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0FBQ3RCLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLE1BQU0sS0FBSyxHQUFrQjtJQUMzQixNQUFNLEVBQUUsS0FBSztJQUNiLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUNyQixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUMzQixlQUFlLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDMUIsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQixzQkFBc0IsRUFBRSxDQUFDO0lBQ3pCLGFBQWEsRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUM7Q0FDaEMsQ0FBQztBQXVDVyxRQUFBLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FB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QUFDO2dCQUMzRyxPQUFPLFlBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELE1BQU07QUFDTiw0R0FBNEc7QUFDNUcsNEdBQTRHO0FBQzVHLDhHQUE4RztBQUM5RywwQkFBMEI7QUFDMUIsUUFBUTtBQUNSLGlGQUFpRjtBQUNqRixRQUFRO0FBRVIsdURBQXVEO0FBQ3ZELDZFQUE2RTtBQUM3RSwwQ0FBMEM7QUFDMUMsa0NBQWtDO0FBQ2xDLDRCQUE0QjtBQUM1Qix1QkFBdUI7QUFDdkIsT0FBTztBQUNQLGlEQUFpRDtBQUNqRCxvREFBb0Q7QUFDcEQsNkNBQTZDO0FBQzdDLE1BQU07QUFDTixxQkFBcUI7QUFDckIsSUFBSSIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5mb3J0dW5hdGVseSwgdGhpcyBmaWxlIGlzIHZlcnkgbG9uZywgeW91IG5lZWQgdG8gZm9sZCBieSBpbmRlbnRpb24gZm9yIGJldHRlciB2aWV3IG9mIHNvdXJjZSBjb2RlIGluIEVkaXRvclxuICovXG5cbmltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZyb20sIG1lcmdlLCBPYnNlcnZhYmxlLCBvZiwgZGVmZXIsIHRocm93RXJyb3J9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBkZWJvdW5jZVRpbWUsIHRha2VXaGlsZSxcbiAgdGFrZSwgY29uY2F0TWFwLCBpZ25vcmVFbGVtZW50cywgc2NhbiwgY2F0Y2hFcnJvciwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiwgRGVwZW5kZW50SW5mbyB9IGZyb20gJy4uL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXInO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBzZXRQcm9qZWN0TGlzdCwgc2V0TGlua1BhdHRlcm5zfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQgeyBFT0wgfSBmcm9tICdvcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7IHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyJyk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjoge1xuICAgIHBsaW5rPzogUGxpbmtKc29uVHlwZTtcbiAgICBkcj86IFBsaW5rSnNvblR5cGU7XG4gICAgW3A6IHN0cmluZ106IGFueTtcbiAgfSAmIFBhY2thZ2VKc29uSW50ZXJmO1xuICAvKiogQmUgYXdhcmU6IElmIHRoaXMgcHJvcGVydHkgaXMgbm90IHNhbWUgYXMgXCJyZWFsUGF0aFwiLFxuICAgKiB0aGVuIGl0IGlzIGEgc3ltbGluayB3aG9zZSBwYXRoIGlzIHJlbGF0aXZlIHRvIHdvcmtzcGFjZSBkaXJlY3RvcnkgKi9cbiAgcGF0aDogc3RyaW5nO1xuICByZWFsUGF0aDogc3RyaW5nO1xuICBpc0luc3RhbGxlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQbGlua0pzb25UeXBlIHtcbiAgdHlwZVJvb3Q/OiBzdHJpbmc7XG4gIHNldHRpbmc/OiB7XG4gICAgLyoqIEluIGZvcm0gb2YgXCI8cGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdHlwZTogc3RyaW5nO1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPG1vZHVsZS1wYXRoPiM8ZXhwb3J0LW5hbWU+XCIgKi9cbiAgICB2YWx1ZTogc3RyaW5nO1xuICB9O1xuICBbcDogc3RyaW5nXTogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBucG1JbnN0YWxsT3B0OiBOcG1PcHRpb25zO1xuICBpbml0ZWQ6IGJvb2xlYW47XG4gIHNyY1BhY2thZ2VzOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG4gIC8qKiBLZXkgaXMgcmVsYXRpdmUgcGF0aCB0byByb290IHdvcmtzcGFjZSAqL1xuICB3b3Jrc3BhY2VzOiBNYXA8c3RyaW5nLCBXb3Jrc3BhY2VTdGF0ZT47XG4gIC8qKiBrZXkgb2YgY3VycmVudCBcIndvcmtzcGFjZXNcIiAqL1xuICBjdXJyV29ya3NwYWNlPzogc3RyaW5nIHwgbnVsbDtcbiAgcHJvamVjdDJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICBzcmNEaXIyUGFja2FnZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgLyoqIERyY3AgaXMgdGhlIG9yaWdpbmFsIG5hbWUgb2YgUGxpbmsgcHJvamVjdCAqL1xuICBsaW5rZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBsaW5rZWREcmNwUHJvamVjdD86IHN0cmluZyB8IG51bGw7XG4gIGluc3RhbGxlZERyY3A/OiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGdpdElnbm9yZXM6IHtbZmlsZTogc3RyaW5nXTogc3RyaW5nW119O1xuICBpc0luQ2hpbmE/OiBib29sZWFuO1xuICAvKiogRXZlcnl0aW1lIGEgaG9pc3Qgd29ya3NwYWNlIHN0YXRlIGNhbGN1bGF0aW9uIGlzIGJhc2ljYWxseSBkb25lLCBpdCBpcyBpbmNyZWFzZWQgYnkgMSAqL1xuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICBwYWNrYWdlc1VwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG4gIC8qKiB3b3Jrc3BhY2Uga2V5ICovXG4gIGxhc3RDcmVhdGVkV29ya3NwYWNlPzogc3RyaW5nO1xufVxuXG5jb25zdCB7ZGlzdERpciwgcm9vdERpciwgcGxpbmtEaXIsIGlzRHJjcFN5bWxpbmssIHN5bWxpbmtEaXJOYW1lfSA9IHBsaW5rRW52O1xuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIGluaXRlZDogZmFsc2UsXG4gIHdvcmtzcGFjZXM6IG5ldyBNYXAoKSxcbiAgcHJvamVjdDJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNEaXIyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgZ2l0SWdub3Jlczoge30sXG4gIHdvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtOiAwLFxuICBwYWNrYWdlc1VwZGF0ZUNoZWNrc3VtOiAwLFxuICBucG1JbnN0YWxsT3B0OiB7aXNGb3JjZTogZmFsc2V9XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZVN0YXRlIHtcbiAgaWQ6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBsaW5rZWQgc291cmNlIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvKiogbmFtZXMgb2YgdGhvc2UgbGlua2VkIHNvdXJjZSBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvKiogaW5zdGFsbGVkIERSIGNvbXBvbmVudCBwYWNrYWdlcyBbbmFtZSwgdmVyc2lvbl0qL1xuICBpbnN0YWxsZWRDb21wb25lbnRzPzogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuXG4gIGhvaXN0SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGhvaXN0UGVlckRlcEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuXG4gIGhvaXN0RGV2SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGhvaXN0RGV2UGVlckRlcEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuXG4gIGhvaXN0SW5mb1N1bW1hcnk/OiB7XG4gICAgLyoqIFVzZXIgc2hvdWxkIG1hbnVsbHkgYWRkIHRoZW0gYXMgZGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZSAqL1xuICAgIG1pc3NpbmdEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgLyoqIFVzZXIgc2hvdWxkIG1hbnVsbHkgYWRkIHRoZW0gYXMgZGV2RGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZSAqL1xuICAgIG1pc3NpbmdEZXZEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgLyoqIHZlcnNpb25zIGFyZSBjb25mbGljdCAqL1xuICAgIGNvbmZsaWN0RGVwczogc3RyaW5nW107XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTnBtT3B0aW9ucyB7XG4gIGNhY2hlPzogc3RyaW5nO1xuICBpc0ZvcmNlOiBib29sZWFuO1xuICB1c2VOcG1DaT86IGJvb2xlYW47XG4gIG9mZmxpbmU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiBOUyxcbiAgaW5pdGlhbFN0YXRlOiBzdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogRG8gdGhpcyBhY3Rpb24gYWZ0ZXIgYW55IGxpbmtlZCBwYWNrYWdlIGlzIHJlbW92ZWQgb3IgYWRkZWQgICovXG4gICAgaW5pdFJvb3REaXIoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPE5wbU9wdGlvbnM+KSB7XG4gICAgICBkLm5wbUluc3RhbGxPcHQuY2FjaGUgPSBwYXlsb2FkLmNhY2hlO1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LnVzZU5wbUNpID0gcGF5bG9hZC51c2VOcG1DaTtcbiAgICB9LFxuXG4gICAgLyoqIFxuICAgICAqIC0gQ3JlYXRlIGluaXRpYWwgZmlsZXMgaW4gcm9vdCBkaXJlY3RvcnlcbiAgICAgKiAtIFNjYW4gbGlua2VkIHBhY2thZ2VzIGFuZCBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgICAqIC0gU3dpdGNoIHRvIGRpZmZlcmVudCB3b3Jrc3BhY2VcbiAgICAgKiAtIERlbGV0ZSBub25leGlzdGluZyB3b3Jrc3BhY2VcbiAgICAgKiAtIElmIFwicGFja2FnZUpzb25GaWxlc1wiIGlzIHByb3ZpZGVkLCBpdCBzaG91bGQgc2tpcCBzdGVwIG9mIHNjYW5uaW5nIGxpbmtlZCBwYWNrYWdlc1xuICAgICAqIC0gVE9ETzogaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgaG9pc3QgYW5kIGluc3RhbGwgZm9yIHRoZW0gYWxsP1xuICAgICAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e1xuICAgICAgZGlyOiBzdHJpbmc7XG4gICAgICAvLyBjcmVhdGVIb29rOiBib29sZWFuO1xuICAgICAgcGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdO1xuICAgIH0gJiBOcG1PcHRpb25zPikge1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LmNhY2hlID0gcGF5bG9hZC5jYWNoZTtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VOcG1DaSA9IHBheWxvYWQudXNlTnBtQ2k7XG4gICAgfSxcbiAgICBzY2FuQW5kU3luY1BhY2thZ2VzKGQ6IFBhY2thZ2VzU3RhdGUsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7cGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHtcbiAgICB9LFxuXG4gICAgdXBkYXRlRGlyKCkge30sXG4gICAgX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oZCkge1xuICAgICAgY29uc3QgcGxpbmtQa2cgPSBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUocGxpbmtEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IG51bGw7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBwYXRoVG9Qcm9qS2V5KFBhdGguZGlybmFtZShkLmxpbmtlZERyY3AucmVhbFBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQubGlua2VkRHJjcCA9IG51bGw7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IHBsaW5rUGtnO1xuICAgICAgICBkLmxpbmtlZERyY3BQcm9qZWN0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFtwa2dzOiBQYWNrYWdlSW5mb1tdLCBvcGVyYXRvcjogJ3VwZGF0ZScgfCAnY2xlYW4nXT4pIHtcbiAgICAgIGQuaW5pdGVkID0gdHJ1ZTtcbiAgICAgIGxldCBtYXAgPSBkLnNyY1BhY2thZ2VzO1xuICAgICAgaWYgKHBheWxvYWRbMV0gPT09ICdjbGVhbicpIHtcbiAgICAgICAgbWFwID0gZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4oKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWRbMF0pIHtcbiAgICAgICAgbWFwLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBhZGRTcmNEaXJzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnNyY0RpcjJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlU3JjRGlycyhkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLyoqIHBheWxvYWQ6IHdvcmtzcGFjZSBrZXlzLCBoYXBwZW5zIGFzIGRlYm91bmNlZCB3b3Jrc3BhY2UgY2hhbmdlIGV2ZW50ICovXG4gICAgd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIHVwZGF0ZUdpdElnbm9yZXMoZCwge3BheWxvYWQ6IHtmaWxlLCBsaW5lc319OiBQYXlsb2FkQWN0aW9uPHtmaWxlOiBzdHJpbmcsIGxpbmVzOiBzdHJpbmdbXX0+KSB7XG4gICAgICBsZXQgcmVsID0gZmlsZSwgYWJzID0gZmlsZTtcbiAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUoZmlsZSkpIHtcbiAgICAgICAgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBmaWxlKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGFicyA9IGZpbGU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhYnMgPSBQYXRoLnJlc29sdmUocm9vdERpciwgZmlsZSk7XG4gICAgICB9XG4gICAgICBpZiAoZC5naXRJZ25vcmVzW2Fic10pIHtcbiAgICAgICAgZGVsZXRlIGQuZ2l0SWdub3Jlc1thYnNdO1xuICAgICAgfVxuICAgICAgZC5naXRJZ25vcmVzW3JlbF0gPSBsaW5lcy5tYXAobGluZSA9PiBsaW5lLnN0YXJ0c1dpdGgoJy8nKSA/IGxpbmUgOiAnLycgKyBsaW5lKTtcbiAgICB9LFxuICAgIHBhY2thZ2VzVXBkYXRlZChkKSB7XG4gICAgICBkLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0rKztcbiAgICB9LFxuICAgIHNldEluQ2hpbmEoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGJvb2xlYW4+KSB7XG4gICAgICBkLmlzSW5DaGluYSA9IHBheWxvYWQ7XG4gICAgfSxcbiAgICBfc2V0Q3VycmVudFdvcmtzcGFjZShkLCB7cGF5bG9hZDogZGlyfTogUGF5bG9hZEFjdGlvbjxzdHJpbmcgfCBudWxsPikge1xuICAgICAgaWYgKGRpciAhPSBudWxsKVxuICAgICAgICBkLmN1cnJXb3Jrc3BhY2UgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gbnVsbDtcbiAgICB9LFxuICAgIC8qKiBwYXJhbXRlcjogd29ya3NwYWNlIGtleSAqL1xuICAgIHdvcmtzcGFjZVN0YXRlVXBkYXRlZChkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSArPSAxO1xuICAgIH0sXG4gICAgLy8gb25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZChkLCB7cGF5bG9hZDogd29ya3NwYWNlS2V5fTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7fSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuXG4gICAgICBsZXQgcGtqc29uU3RyOiBzdHJpbmc7XG4gICAgICBjb25zdCBwa2dqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKCdQbGluayBpbml0L3N5bmMgcHJvY2VzcyB3YXMgaW50ZXJydXB0ZWQgbGFzdCB0aW1lLCByZWNvdmVyIGNvbnRlbnQgb2YgJyArIHBrZ2pzb25GaWxlKTtcbiAgICAgICAgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKGxvY2tGaWxlLCAndXRmOCcpO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhwa2dqc29uRmlsZSwgJ3V0ZjgnKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIC8vIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRldkRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgICAgLy8gY29uc3QgdXBkYXRpbmdEZXZEZXBzID0gey4uLnBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiB0eXBlb2YgZGV2RGVwcyA9IFtdO1xuICAgICAgZGV2RGVwcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgY29uc3Qge2hvaXN0ZWQ6IGhvaXN0ZWREZXBzLCBob2lzdGVkUGVlcnM6IGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0ZWREZXY6IGhvaXN0ZWREZXZEZXBzLCBob2lzdGVkRGV2UGVlcnM6IGRldkhvaXN0UGVlckRlcEluZm9cbiAgICAgIH0gPVxuICAgICAgICBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgICAgc3RhdGUuc3JjUGFja2FnZXMsIHdzS2V5LCBwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9LCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXG4gICAgICApO1xuXG5cbiAgICAgIGNvbnN0IGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHtcbiAgICAgICAgLi4ucGtqc29uLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IEFycmF5LmZyb20oaG9pc3RlZERlcHMuZW50cmllcygpKVxuICAgICAgICAuY29uY2F0KEFycmF5LmZyb20oaG9pc3RQZWVyRGVwSW5mby5lbnRyaWVzKCkpLmZpbHRlcihpdGVtID0+ICFpdGVtWzFdLm1pc3NpbmcpKVxuICAgICAgICAuZmlsdGVyKChbbmFtZV0pID0+ICFpc0RyY3BTeW1saW5rIHx8IG5hbWUgIT09ICdAd2ZoL3BsaW5rJylcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSksXG5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXZEZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGRldkhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLmZpbHRlcigoW25hbWVdKSA9PiAhaXNEcmNwU3ltbGluayB8fCBuYW1lICE9PSAnQHdmaC9wbGluaycpXG4gICAgICAgIC5yZWR1Y2UoKGRpYywgW25hbWUsIGluZm9dKSA9PiB7XG4gICAgICAgICAgZGljW25hbWVdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgcmV0dXJuIGRpYztcbiAgICAgICAgfSwge30gYXMge1trZXk6IHN0cmluZ106IHN0cmluZ30pXG4gICAgICB9O1xuXG4gICAgICAvLyBsb2cuaW5mbyhpbnN0YWxsSnNvbilcbiAgICAgIC8vIGNvbnN0IGluc3RhbGxlZENvbXAgPSBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGUud29ya3NwYWNlcywgc3RhdGUuc3JjUGFja2FnZXMsIHdzS2V5KTtcblxuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG5cbiAgICAgIGNvbnN0IGhvaXN0SW5mb1N1bW1hcnk6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm9TdW1tYXJ5J10gPSB7XG4gICAgICAgIGNvbmZsaWN0RGVwczogW10sIG1pc3NpbmdEZXBzOiB7fSwgbWlzc2luZ0RldkRlcHM6IHt9XG4gICAgICB9O1xuXG4gICAgICBmb3IgKGNvbnN0IGRlcHNJbmZvIG9mIFtob2lzdGVkRGVwcywgaG9pc3RQZWVyRGVwSW5mb10pIHtcbiAgICAgICAgZm9yIChjb25zdCBbZGVwLCBpbmZvXSBvZiBkZXBzSW5mby5lbnRyaWVzKCkpIHtcbiAgICAgICAgICBpZiAoaW5mby5taXNzaW5nKSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5Lm1pc3NpbmdEZXBzW2RlcF0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpbmZvLnNhbWVWZXIgJiYgIWluZm8uZGlyZWN0KSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5LmNvbmZsaWN0RGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGRlcHNJbmZvIG9mIFtob2lzdGVkRGV2RGVwcywgZGV2SG9pc3RQZWVyRGVwSW5mb10pIHtcbiAgICAgICAgZm9yIChjb25zdCBbZGVwLCBpbmZvXSBvZiBkZXBzSW5mby5lbnRyaWVzKCkpIHtcbiAgICAgICAgICBpZiAoaW5mby5taXNzaW5nKSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5Lm1pc3NpbmdEZXZEZXBzW2RlcF0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpbmZvLnNhbWVWZXIgJiYgIWluZm8uZGlyZWN0KSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5LmNvbmZsaWN0RGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgaWQ6IHdzS2V5LFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIGhvaXN0SW5mbzogaG9pc3RlZERlcHMsXG4gICAgICAgIGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0RGV2SW5mbzogaG9pc3RlZERldkRlcHMsXG4gICAgICAgIGhvaXN0RGV2UGVlckRlcEluZm86IGRldkhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0SW5mb1N1bW1hcnlcbiAgICAgIH07XG4gICAgICBzdGF0ZS5sYXN0Q3JlYXRlZFdvcmtzcGFjZSA9IHdzS2V5O1xuICAgICAgc3RhdGUud29ya3NwYWNlcy5zZXQod3NLZXksIGV4aXN0aW5nID8gT2JqZWN0LmFzc2lnbihleGlzdGluZywgd3ApIDogd3ApO1xuICAgIH0sXG4gICAgX2luc3RhbGxXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IHt3b3Jrc3BhY2VLZXl9fTogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmd9Pikge30sXG4gICAgLy8gX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7fSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiB7bmFtZTogc3RyaW5nfVtdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH0sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1NyY0RpcihkLFxuICAgICAge3BheWxvYWQ6IHtwYXR0ZXJuLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3BhdHRlcm46IHN0cmluZzsgcGtnczoge25hbWU6IHN0cmluZ31bXX0+KSB7XG4gICAgICBkLnNyY0RpcjJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwYXR0ZXJuKSwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuZXhwb3J0IGNvbnN0IHt1cGRhdGVHaXRJZ25vcmVzLCBvbkxpbmtlZFBhY2thZ2VBZGRlZH0gPSBhY3Rpb25EaXNwYXRjaGVyO1xuXG4vKipcbiAqIENhcmVmdWxseSBhY2Nlc3MgYW55IHByb3BlcnR5IG9uIGNvbmZpZywgc2luY2UgY29uZmlnIHNldHRpbmcgcHJvYmFibHkgaGFzbid0IGJlZW4gc2V0IHlldCBhdCB0aGlzIG1vbW1lbnRcbiAqL1xuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICBjb25zdCB1cGRhdGVkV29ya3NwYWNlU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHBhY2thZ2VBZGRlZExpc3QgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuXG4gIGNvbnN0IGdpdElnbm9yZUZpbGVzV2FpdGluZyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGlmIChnZXRTdGF0ZSgpLnNyY0RpcjJQYWNrYWdlcyA9PSBudWxsKSB7XG4gICAgLy8gQmVjYXVzZSBzcmNEaXIyUGFja2FnZXMgaXMgbmV3bHkgYWRkZWQsIHRvIGF2b2lkIGV4aXN0aW5nIHByb2plY3RcbiAgICAvLyBiZWluZyBicm9rZW4gZm9yIG1pc3NpbmcgaXQgaW4gcHJldmlvdXNseSBzdG9yZWQgc3RhdGUgZmlsZVxuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHMuc3JjRGlyMlBhY2thZ2VzID0gbmV3IE1hcCgpKTtcbiAgfVxuICByZXR1cm4gbWVyZ2UoXG4gICAgLy8gVG8gb3ZlcnJpZGUgc3RvcmVkIHN0YXRlLiBcbiAgICAvLyBEbyBub3QgcHV0IGZvbGxvd2luZyBsb2dpYyBpbiBpbml0aWFsU3RhdGUhIEl0IHdpbGwgYmUgb3ZlcnJpZGRlbiBieSBwcmV2aW91c2x5IHNhdmVkIHN0YXRlXG5cbiAgICBvZigxKS5waXBlKHRhcCgoKSA9PiBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHBrcyA9PiB7XG4gICAgICAgIHNldFByb2plY3RMaXN0KGdldFByb2plY3RMaXN0KCkpO1xuICAgICAgICByZXR1cm4gcGtzO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY0RpcjJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZmlsdGVyKHYgPT4gdiAhPSBudWxsKSxcbiAgICAgIG1hcCgobGlua1BhdHRlcm5NYXApID0+IHtcbiAgICAgICAgc2V0TGlua1BhdHRlcm5zKGxpbmtQYXR0ZXJuTWFwLmtleXMoKSk7XG4gICAgICB9KSksXG5cbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2NhbjxQYWNrYWdlc1N0YXRlWydzcmNQYWNrYWdlcyddPigocHJldk1hcCwgY3Vyck1hcCkgPT4ge1xuICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnNwbGljZSgwKTtcbiAgICAgICAgZm9yIChjb25zdCBubSBvZiBjdXJyTWFwLmtleXMoKSkge1xuICAgICAgICAgIGlmICghcHJldk1hcC5oYXMobm0pKSB7XG4gICAgICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnB1c2gobm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocGFja2FnZUFkZGVkTGlzdC5sZW5ndGggPiAwKVxuICAgICAgICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKHBhY2thZ2VBZGRlZExpc3QpO1xuICAgICAgICByZXR1cm4gY3Vyck1hcDtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSksXG4gICAgICBjb25jYXRNYXAoKHtwYXlsb2FkOiB7ZGlyLCBpc0ZvcmNlLCB1c2VOcG1DaSwgcGFja2FnZUpzb25GaWxlc319KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKGRpcik7XG4gICAgICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvYXBwLXRlbXBsYXRlLmpzJyksIFBhdGgucmVzb2x2ZShkaXIsICdhcHAuanMnKSk7XG4gICAgICAgIGNoZWNrQWxsV29ya3NwYWNlcygpO1xuICAgICAgICBpZiAoaXNGb3JjZSB8fCB1c2VOcG1DaSkge1xuICAgICAgICAgIC8vIENoYW5pbmcgaW5zdGFsbEpzb25TdHIgdG8gZm9yY2UgYWN0aW9uIF9pbnN0YWxsV29ya3NwYWNlIGJlaW5nIGRpc3BhdGNoZWQgbGF0ZXJcbiAgICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICAvLyBjbGVhbiB0byB0cmlnZ2VyIGluc3RhbGwgYWN0aW9uXG4gICAgICAgICAgICAgIGNvbnN0IHdzID0gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgd3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZpbmcgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHBhY2thZ2VKc29uRmlsZXMgIT0gbnVsbCA/IHNjYW5BbmRTeW5jUGFja2FnZXMocGFja2FnZUpzb25GaWxlcykgOlxuICAgICAgICAgICAgZGVmZXIoKCkgPT4gb2YoaW5pdFJvb3REaXJlY3RvcnkoKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuc2NhbkFuZFN5bmNQYWNrYWdlcyksXG4gICAgICBjb25jYXRNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICByZXR1cm4gbWVyZ2UoXG4gICAgICAgICAgc2NhbkFuZFN5bmNQYWNrYWdlcyhwYXlsb2FkLnBhY2thZ2VKc29uRmlsZXMpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGN1cnJXcyA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCB3c0tleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHdzS2V5ICE9PSBjdXJyV3MpXG4gICAgICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2RpcjogUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5KX0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChjdXJyV3MgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIC8vIE1ha2Ugc3VyZSBcImN1cnJlbnQgd29ya3NwYWNlXCIgaXMgdGhlIGxhc3Qgb25lIGJlaW5nIHVwZGF0ZWQsIHNvIHRoYXQgaXQgcmVtYWlucyBcImN1cnJlbnRcIlxuICAgICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyOiBQYXRoLnJlc29sdmUocm9vdERpciwgY3VycldzKX0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSxcblxuICAgIC8vIGluaXRSb290RGlyXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmluaXRSb290RGlyKSxcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNoZWNrQWxsV29ya3NwYWNlcygpO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpKSB7XG4gICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcGxpbmtFbnYud29ya0RpcixcbiAgICAgICAgICAgIC4uLnBheWxvYWR9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjdXJyID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgIGlmIChjdXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKGN1cnIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBQYXRoLnJlc29sdmUocm9vdERpciwgY3Vycik7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBhdGgsIC4uLnBheWxvYWR9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gICAgICAgIC8vIGFjdGlvbkRpc3BhdGNoZXIub25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG4gICAgICAgIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod3NLZXkpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQod3NLZXkpKTtcbiAgICAgIH0pXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVEaXIpLFxuICAgICAgdGFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gc2NhbkFuZFN5bmNQYWNrYWdlcygpKSxcbiAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMud29ya3NwYWNlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHdzID0+IHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20od3Mua2V5cygpKTtcbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9KSxcbiAgICAgIHNjYW48c3RyaW5nW10+KChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgIGlmIChwcmV2Lmxlbmd0aCA8IGN1cnIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbmV3QWRkZWQgPSBfLmRpZmZlcmVuY2UoY3VyciwgcHJldik7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBsb2cuaW5mbygnTmV3IHdvcmtzcGFjZTogJywgbmV3QWRkZWQpO1xuICAgICAgICAgIGZvciAoY29uc3Qgd3Mgb2YgbmV3QWRkZWQpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleTogd3N9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnI7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC8vIG9ic2VydmUgYWxsIGV4aXN0aW5nIFdvcmtzcGFjZXMgZm9yIGRlcGVuZGVuY3kgaG9pc3RpbmcgcmVzdWx0IFxuICAgIC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAvLyBmaWx0ZXIocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICB0YWtlV2hpbGUocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuaW5zdGFsbEpzb24gPT09IHMyLmluc3RhbGxKc29uKSxcbiAgICAgICAgc2NhbjxXb3Jrc3BhY2VTdGF0ZT4oKG9sZCwgbmV3V3MpID0+IHtcbiAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG4gICAgICAgICAgY29uc3QgbmV3RGVwcyA9IE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBmb3JjaW5nIGluc3RhbGwgd29ya3NwYWNlLCB0aGVyZWZvcmUgZGVwZW5kZW5jaWVzIGlzIGNsZWFyZWQgYXQgdGhpcyBtb21lbnRcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgb2xkRGVwcyA9IE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcblxuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCAhPT0gb2xkRGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleToga2V5fSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0RlcHMuc29ydCgpO1xuICAgICAgICAgIG9sZERlcHMuc29ydCgpO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gbmV3RGVwcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChuZXdEZXBzW2ldICE9PSBvbGREZXBzW2ldKSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleToga2V5fSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgIH0pLFxuICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSwgc2xpY2UuYWN0aW9ucy53b3Jrc3BhY2VCYXRjaENoYW5nZWQpLFxuICAgICAgY29uY2F0TWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChhY3Rpb24udHlwZSA9PT0gc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZS50eXBlKSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXkgPSAoYWN0aW9uLnBheWxvYWQgYXMgUGFyYW1ldGVyczx0eXBlb2Ygc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZT5bMF0pLndvcmtzcGFjZUtleTtcbiAgICAgICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3c0tleSkpLFxuICAgICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICBjb25jYXRNYXAod3MgPT4gaW5zdGFsbFdvcmtzcGFjZSh3cyEsIGdldFN0YXRlKCkubnBtSW5zdGFsbE9wdCkpLFxuICAgICAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXlzID0gYWN0aW9uLnBheWxvYWQgYXMgUGFyYW1ldGVyczx0eXBlb2Ygc2xpY2UuYWN0aW9ucy53b3Jrc3BhY2VCYXRjaENoYW5nZWQ+WzBdO1xuICAgICAgICAgIHJldHVybiBtZXJnZSguLi53c0tleXMubWFwKF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZSkpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQpLFxuICAgICAgbWFwKGFjdGlvbiA9PiB1cGRhdGVkV29ya3NwYWNlU2V0LmFkZChhY3Rpb24ucGF5bG9hZCkpLFxuICAgICAgZGVib3VuY2VUaW1lKDgwMCksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZUJhdGNoQ2hhbmdlZChBcnJheS5mcm9tKHVwZGF0ZWRXb3Jrc3BhY2VTZXQudmFsdWVzKCkpKTtcbiAgICAgICAgdXBkYXRlZFdvcmtzcGFjZVNldC5jbGVhcigpO1xuICAgICAgICAvLyByZXR1cm4gZnJvbSh3cml0ZUNvbmZpZ0ZpbGVzKCkpO1xuICAgICAgfSksXG4gICAgICBtYXAoKCkgPT4ge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnBhY2thZ2VzVXBkYXRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVHaXRJZ25vcmVzKSxcbiAgICAgIHRhcChhY3Rpb24gPT4ge1xuICAgICAgICBsZXQgcmVsID0gYWN0aW9uLnBheWxvYWQuZmlsZTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShyZWwpKSB7XG4gICAgICAgICAgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCByZWwpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgfVxuICAgICAgICBnaXRJZ25vcmVGaWxlc1dhaXRpbmcuYWRkKHJlbCk7XG4gICAgICB9KSxcbiAgICAgIGRlYm91bmNlVGltZSg1MDApLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbmdlZEZpbGVzID0gWy4uLmdpdElnbm9yZUZpbGVzV2FpdGluZy52YWx1ZXMoKV07XG4gICAgICAgIGdpdElnbm9yZUZpbGVzV2FpdGluZy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZEZpbGVzO1xuICAgICAgfSksXG4gICAgICBjb25jYXRNYXAoKGNoYW5nZWRGaWxlcykgPT4ge1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uY2hhbmdlZEZpbGVzLm1hcChhc3luYyByZWwgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcmVsKTtcbiAgICAgICAgICBjb25zdCBsaW5lcyA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tmaWxlXTtcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmVzID0gZGF0YS5zcGxpdCgvXFxuXFxyPy8pLm1hcChsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xpbmVzID0gXy5kaWZmZXJlbmNlKGxpbmVzLCBleGlzdGluZ0xpbmVzKTtcbiAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlLCBkYXRhICsgRU9MICsgbmV3TGluZXMuam9pbihFT0wpLCAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdNb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyKTtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycik7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFBhY2thZ2VzU3RhdGU+IHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1Byb2pLZXkocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm9qS2V5VG9QYXRoKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLmlzQWJzb2x1dGUoa2V5KSA/IGtleSA6IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlRGlyKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdExpc3QoKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUocm9vdERpciwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBtZWFudCB0byB0cmlnZ2VyIGVkaXRvci1oZWxwZXIgdG8gdXBkYXRlIHRzY29uZmlnIGZpbGVzLCBzb1xuICogZWRpdG9yLWhlbHBlciBtdXN0IGJlIGltcG9ydCBhdCBmaXJzdFxuICogQHBhcmFtIGRpciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaEN1cnJlbnRXb3Jrc3BhY2UoZGlyOiBzdHJpbmcpIHtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZUJhdGNoQ2hhbmdlZChbd29ya3NwYWNlS2V5KGRpcildKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKGdldFN0YXRlKCksIHdzS2V5KTtcblxuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtnRW50cnkpIHtcbiAgICAgIHlpZWxkIFtway5uYW1lLCBwa107XG4gICAgfVxuICB9KSgpKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxlZENvbXBvbmVudHMgPSBpbnN0YWxsZWQpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSk7XG59XG5cbi8qKlxuICogRGVsZXRlIHdvcmtzcGFjZSBzdGF0ZSBpZiBpdHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0XG4gKi9cbmZ1bmN0aW9uIGNoZWNrQWxsV29ya3NwYWNlcygpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYFdvcmtzcGFjZSAke2tleX0gZG9lcyBub3QgZXhpc3QgYW55bW9yZS5gKTtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5kZWxldGUoa2V5KSk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBsb2cuZGVidWcoJ2luaXRSb290RGlyZWN0b3J5Jyk7XG4gIGNvbnN0IHJvb3RQYXRoID0gcm9vdERpcjtcbiAgZnNleHQubWtkaXJwU3luYyhkaXN0RGlyKTtcbiAgLy8gbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLFxuICAgICAgJ2dpdGlnbm9yZS50eHQnKSwgcm9vdERpciArICcvLmdpdGlnbm9yZScpO1xuICBhd2FpdCBjbGVhbkludmFsaWRTeW1saW5rcygpO1xuICBhd2FpdCBzY2FuQW5kU3luY1BhY2thZ2VzKCk7XG4gIC8vIGF3YWl0IF9kZWxldGVVc2VsZXNzU3ltbGluayhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpLCBuZXcgU2V0PHN0cmluZz4oKSk7XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHdyaXRlQ29uZmlnRmlsZXMoKSB7XG4vLyAgIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuLi9jbWQvY29uZmlnLXNldHVwJykpLmFkZHVwQ29uZmlncygoZmlsZSwgY29uZmlnQ29udGVudCkgPT4ge1xuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lICwgbm8tY29uc29sZVxuLy8gICAgIGxvZy5pbmZvKCd3cml0ZSBjb25maWcgZmlsZTonLCBmaWxlKTtcbi8vICAgICB3cml0ZUZpbGUoUGF0aC5qb2luKGRpc3REaXIsIGZpbGUpLFxuLy8gICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbi8vICAgfSk7XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlLCBucG1PcHQ6IE5wbU9wdGlvbnMpIHtcbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzLmlkKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBpbnN0YWxsSW5EaXIoZGlyLCBucG1PcHQsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCB3cy5pbnN0YWxsSnNvblN0cik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgY29uc3Qgd3NkID0gZC53b3Jrc3BhY2VzLmdldCh3cy5pZCkhO1xuICAgICAgd3NkLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICB3c2QuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgICB3c2QuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLWxvY2suanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKGBQcm9ibGVtYXRpYyAke2xvY2tGaWxlfSBpcyBkZWxldGVkLCBwbGVhc2UgdHJ5IGFnYWluYCk7XG4gICAgICAgIGZzLnVubGlua1N5bmMobG9ja0ZpbGUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsSW5EaXIoZGlyOiBzdHJpbmcsIG5wbU9wdDogTnBtT3B0aW9ucywgb3JpZ2luUGtnSnNvblN0cjogc3RyaW5nLCB0b0luc3RhbGxQa2dKc29uU3RyOiBzdHJpbmcpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyBkaXIpO1xuICB0cnkge1xuICAgIGF3YWl0IGNvcHlOcG1yY1RvV29ya3NwYWNlKGRpcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtzSW5Nb2R1bGVEaXIgPSBbXSBhcyB7Y29udGVudDogc3RyaW5nLCBsaW5rOiBzdHJpbmd9W107XG5cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgIGZzZXh0Lm1rZGlycFN5bmModGFyZ2V0KTtcbiAgfVxuXG4gIC8vIDEuIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgLy8gYmFja3VwIHRoZW0gZm9yIGxhdGUgcmVjb3ZlcnlcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKHRhcmdldCwgbGluayA9PiB7XG4gICAgbG9nLmRlYnVnKCdSZW1vdmUgc3ltbGluaycsIGxpbmspO1xuICAgIGNvbnN0IGxpbmtDb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIHN5bWxpbmtzSW5Nb2R1bGVEaXIucHVzaCh7Y29udGVudDogbGlua0NvbnRlbnQsIGxpbmt9KTtcbiAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gIH0pO1xuICAvLyAyLiBSdW4gYG5wbSBpbnN0YWxsYFxuICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCd3cml0ZScsIGluc3RhbGxKc29uRmlsZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCB0b0luc3RhbGxQa2dKc29uU3RyLCAndXRmOCcpO1xuICAvLyBzYXZlIGEgbG9jayBmaWxlIHRvIGluZGljYXRlIGluLXByb2Nlc3Mgb2YgaW5zdGFsbGluZywgb25jZSBpbnN0YWxsYXRpb24gaXMgY29tcGxldGVkIHdpdGhvdXQgaW50ZXJydXB0aW9uLCBkZWxldGUgaXQuXG4gIC8vIGNoZWNrIGlmIHRoZXJlIGlzIGV4aXN0aW5nIGxvY2sgZmlsZSwgbWVhbmluZyBhIHByZXZpb3VzIGluc3RhbGxhdGlvbiBpcyBpbnRlcnJ1cHRlZC5cbiAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGxvY2tGaWxlLCBvcmlnaW5Qa2dKc29uU3RyKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDAwKSk7XG4gIHRyeSB7XG4gICAgY29uc3QgZW52ID0ge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBOT0RFX0VOVjogJ2RldmVsb3BtZW50J1xuICAgIH0gYXMgTm9kZUpTLlByb2Nlc3NFbnY7XG5cbiAgICBpZiAobnBtT3B0LmNhY2hlKVxuICAgICAgZW52Lm5wbV9jb25maWdfY2FjaGUgPSBucG1PcHQuY2FjaGU7XG4gICAgaWYgKG5wbU9wdC5vZmZsaW5lKVxuICAgICAgZW52Lm5wbV9jb25maWdfb2ZmbGluZSA9ICd0cnVlJztcblxuICAgIGNvbnN0IGNtZEFyZ3MgPSBbbnBtT3B0LnVzZU5wbUNpID8gJ2NpJyA6ICdpbnN0YWxsJ107XG5cbiAgICBhd2FpdCBleGUoJ25wbScsIC4uLmNtZEFyZ3MsIHtjd2Q6IGRpciwgZW52fSkuZG9uZTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYXdhaXQgZXhlKCducG0nLCAncHJ1bmUnLCB7Y3dkOiBkaXIsIGVudn0pLmRvbmU7XG4gICAgLy8gXCJucG0gZGRwXCIgcmlnaHQgYWZ0ZXIgXCJucG0gaW5zdGFsbFwiIHdpbGwgY2F1c2UgZGV2RGVwZW5kZW5jaWVzIGJlaW5nIHJlbW92ZWQgc29tZWhvdywgZG9uJ3Qga25vd25cbiAgICAvLyB3aHksIEkgaGF2ZSB0byBhZGQgYSBzZXRJbW1lZGlhdGUoKSBiZXR3ZWVuIHRoZW0gdG8gd29ya2Fyb3VuZFxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnZGRwJywge2N3ZDogZGlyLCBlbnZ9KS5wcm9taXNlO1xuICAgIH0gY2F0Y2ggKGRkcEVycikge1xuICAgICAgbG9nLndhcm4oJ0ZhaWxlZCB0byBkZWR1cGUgZGVwZW5kZW5jaWVzLCBidXQgaXQgaXMgT0snLCBkZHBFcnIpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCAoZSBhcyBFcnJvcikuc3RhY2spO1xuICAgIHRocm93IGU7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnUmVjb3ZlciAnICsgaW5zdGFsbEpzb25GaWxlKTtcbiAgICAvLyAzLiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIG9yaWdpblBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKVxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGxvY2tGaWxlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlY292ZXJTeW1saW5rcygpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3ltbGlua3NJbk1vZHVsZURpci5tYXAoKHtjb250ZW50LCBsaW5rfSkgPT4ge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxpbmspKSB7XG4gICAgICAgIGZzZXh0Lm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnN5bWxpbmsoY29udGVudCwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfSkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvcHlOcG1yY1RvV29ya3NwYWNlKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICcubnBtcmMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0KSlcbiAgICByZXR1cm47XG4gIGNvbnN0IGlzQ2hpbmEgPSBhd2FpdCBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5pc0luQ2hpbmEpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZmlsdGVyKGNuID0+IGNuICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgaWYgKGlzQ2hpbmEpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdjcmVhdGUgLm5wbXJjIHRvJywgdGFyZ2V0KTtcbiAgICBmcy5jb3B5RmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9ucG1yYy1mb3ItY24udHh0JyksIHRhcmdldCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc2NhbkFuZFN5bmNQYWNrYWdlcyhpbmNsdWRlUGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBjb25zdCBzcmNQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBsZXQgcGtnTGlzdDogUGFja2FnZUluZm9bXTtcblxuICBpZiAoaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMpIHtcbiAgICBjb25zdCBwcmpLZXlzID0gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKTtcbiAgICBjb25zdCBwcmpEaXJzID0gcHJqS2V5cy5tYXAocHJqS2V5ID0+IHByb2pLZXlUb1BhdGgocHJqS2V5KSk7XG4gICAgcGtnTGlzdCA9IGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzLm1hcChqc29uRmlsZSA9PiB7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8oanNvbkZpbGUsIGZhbHNlKTtcbiAgICAgIGNvbnN0IHByaklkeCA9IHByakRpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgIGlmIChwcmpJZHggPj0gMCkge1xuICAgICAgICBjb25zdCBwcmpQYWNrYWdlTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByaktleXNbcHJqSWR4XSkhO1xuICAgICAgICBpZiAoIXByalBhY2thZ2VOYW1lcy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtcbiAgICAgICAgICAgIHByajogcHJqS2V5c1twcmpJZHhdLFxuICAgICAgICAgICAgcGtnczogWy4uLnByalBhY2thZ2VOYW1lcy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBbLi4uZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMua2V5cygpXTtcbiAgICAgICAgY29uc3QgbGlua2VkU3JjRGlycyA9IGtleXMubWFwKGtleSA9PiBwcm9qS2V5VG9QYXRoKGtleSkpO1xuICAgICAgICBjb25zdCBpZHggPSBsaW5rZWRTcmNEaXJzLmZpbmRJbmRleChkaXIgPT4gaW5mby5yZWFsUGF0aCA9PT0gZGlyIHx8ICBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgY29uc3QgcGtncyA9IGdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzLmdldChrZXlzW2lkeF0pITtcbiAgICAgICAgICBpZiAoIXBrZ3MuaW5jbHVkZXMoaW5mby5uYW1lKSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtcbiAgICAgICAgICAgICAgcGF0dGVybjoga2V5c1tpZHhdLFxuICAgICAgICAgICAgICBwa2dzOiBbLi4ucGtncy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2luZm8ucmVhbFBhdGh9IGlzIG5vdCB1bmRlciBhbnkga25vd24gUHJvamVjdCBkaXJlY3RvcnlzOiAke3ByakRpcnMuY29uY2F0KGxpbmtlZFNyY0RpcnMpLmpvaW4oJywgJyl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH0pO1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNMaW5rZWRQYWNrYWdlcyhbcGtnTGlzdCwgJ3VwZGF0ZSddKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuICAgIHBrZ0xpc3QgPSBbXTtcbiAgICBhd2FpdCBybS5zY2FuUGFja2FnZXMoKS5waXBlKFxuICAgICAgdGFwKChbcHJvaiwganNvbkZpbGUsIHNyY0Rpcl0pID0+IHtcbiAgICAgICAgaWYgKHByb2ogJiYgIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAgICAgaWYgKHByb2ogPT0gbnVsbCAmJiBzcmNEaXIgJiYgIXNyY1BrZ01hcC5oYXMoc3JjRGlyKSlcbiAgICAgICAgICBzcmNQa2dNYXAuc2V0KHNyY0RpciwgW10pO1xuXG4gICAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgICBpZiAoaW5mby5qc29uLmRyIHx8IGluZm8uanNvbi5wbGluaykge1xuICAgICAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgICAgICBpZiAocHJvailcbiAgICAgICAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2UgaWYgKHNyY0RpcilcbiAgICAgICAgICAgIHNyY1BrZ01hcC5nZXQoc3JjRGlyKSEucHVzaChpbmZvKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb2cuZXJyb3IoYE9ycGhhbiAke2pzb25GaWxlfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgUGFja2FnZSBvZiAke2pzb25GaWxlfSBpcyBza2lwcGVkIChkdWUgdG8gbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSlgKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICAgIGZvciAoY29uc3QgW3ByaiwgcGtnc10gb2YgcHJvalBrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3NyY0RpciwgcGtnc10gb2Ygc3JjUGtnTWFwLmVudHJpZXMoKSkge1xuICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtwYXR0ZXJuOiBzcmNEaXIsIHBrZ3N9KTtcbiAgICB9XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICdjbGVhbiddKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICcubGlua3MnICYmIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCAnLmxpbmtzJykpKSB7XG4gICAgZnNleHQucmVtb3ZlKFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgJy5saW5rcycpKVxuICAgIC5jYXRjaChleCA9PiBsb2cuaW5mbyhleCkpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksIHN5bWxpbmtEaXJOYW1lIHx8ICdub2RlX21vZHVsZXMnKTtcbiAgZnNleHQubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIGlmICh3cy5pbnN0YWxsZWRDb21wb25lbnRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgICBwa2dOYW1lU2V0LmFkZChwbmFtZSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShyb290RGlyLCBzeW1saW5rRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyldfSk7XG4gIH1cblxuICByZXR1cm4gbWVyZ2UoXG4gICAgZnJvbShwa2dOYW1lU2V0LnZhbHVlcygpKS5waXBlKFxuICAgICAgbWFwKG5hbWUgPT4gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkgfHwgd3MuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpISksXG4gICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhzeW1saW5rRGlyKVxuICAgICksXG4gICAgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKHN5bWxpbmtEaXIsIHBrZ05hbWVTZXQpXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9kZWxldGVVc2VsZXNzU3ltbGluayhjaGVja0Rpcjogc3RyaW5nLCBleGNsdWRlU2V0OiBTZXQ8c3RyaW5nPikge1xuICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGRyY3BOYW1lID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lIDogbnVsbDtcbiAgY29uc3QgZG9uZTEgPSBsaXN0TW9kdWxlU3ltbGlua3MoY2hlY2tEaXIsIGxpbmsgPT4ge1xuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGNoZWNrRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiAhZXhjbHVkZVNldC5oYXMocGtnTmFtZSkpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgRGVsZXRlIGV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApO1xuICAgICAgZG9uZXMucHVzaChmcy5wcm9taXNlcy51bmxpbmsobGluaykpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGRvbmUxO1xuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgcmV0dXJuIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZSwganNvbiwgaXNJbnN0YWxsZWQpO1xufVxuLyoqXG4gKiBMaXN0IHRob3NlIGluc3RhbGxlZCBwYWNrYWdlcyB3aGljaCBhcmUgcmVmZXJlbmNlZCBieSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUsXG4gKiB0aG9zZSBwYWNrYWdlcyBtdXN0IGhhdmUgXCJkclwiIHByb3BlcnR5IGluIHBhY2thZ2UuanNvbiBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VLZXkgXG4gKi9cbmZ1bmN0aW9uKiBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IG9yaWdpbkluc3RhbGxKc29uID0gc3RhdGUud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSEub3JpZ2luSW5zdGFsbEpzb247XG4gIC8vIGNvbnN0IGRlcEpzb24gPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llc10gOlxuICAvLyAgIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc107XG4gIGZvciAoY29uc3QgZGVwcyBvZiBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdKSB7XG4gICAgaWYgKGRlcHMgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICBpZiAoIXN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXApICYmIGRlcCAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBranNvbkZpbGUpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlSW5mbyhcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKSwgdHJ1ZVxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaykge1xuICAgICAgICAgICAgeWllbGQgcGs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZTogc3RyaW5nLCBqc29uOiBhbnksIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG0gPSBtb2R1bGVOYW1lUmVnLmV4ZWMoanNvbi5uYW1lKTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBzaG9ydE5hbWU6IG0hWzJdLFxuICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICBzY29wZTogbSFbMV0sXG4gICAgcGF0aDogUGF0aC5qb2luKHN5bWxpbmtEaXJOYW1lLCBqc29uLm5hbWUpLFxuICAgIGpzb24sXG4gICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGtKc29uRmlsZSkpLFxuICAgIGlzSW5zdGFsbGVkXG4gIH07XG4gIHJldHVybiBwa0luZm87XG59XG5cbmZ1bmN0aW9uIGNwKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoXy5zdGFydHNXaXRoKGZyb20sICctJykpIHtcbiAgICBmcm9tID0gYXJndW1lbnRzWzFdO1xuICAgIHRvID0gYXJndW1lbnRzWzJdO1xuICB9XG4gIGZzZXh0LmNvcHlTeW5jKGZyb20sIHRvKTtcbiAgLy8gc2hlbGwuY3AoLi4uYXJndW1lbnRzKTtcbiAgaWYgKC9bL1xcXFxdJC8udGVzdCh0bykpXG4gICAgdG8gPSBQYXRoLmJhc2VuYW1lKGZyb20pOyAvLyB0byBpcyBhIGZvbGRlclxuICBlbHNlXG4gICAgdG8gPSBQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIHRvKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gZnJvbSBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gdG8gcmVsYXRpdmUgdG8gcm9vdFBhdGggXG4gKi9cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuLy8gZnVuY3Rpb24gX3dyaXRlR2l0SG9vayhwcm9qZWN0OiBzdHJpbmcpIHtcbi8vICAgLy8gaWYgKCFpc1dpbjMyKSB7XG4vLyAgIGNvbnN0IGdpdFBhdGggPSBQYXRoLnJlc29sdmUocHJvamVjdCwgJy5naXQvaG9va3MnKTtcbi8vICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCkpIHtcbi8vICAgICBjb25zdCBob29rU3RyID0gJyMhL2Jpbi9zaFxcbicgK1xuLy8gICAgICAgYGNkIFwiJHtyb290RGlyfVwiXFxuYCArXG4vLyAgICAgICAvLyAnZHJjcCBpbml0XFxuJyArXG4vLyAgICAgICAvLyAnbnB4IHByZXR0eS1xdWljayAtLXN0YWdlZFxcbicgKyAvLyBVc2UgYHRzbGludCAtLWZpeGAgaW5zdGVhZC5cbi8vICAgICAgIGBwbGluayBsaW50IC0tcGogXCIke3Byb2plY3QucmVwbGFjZSgvWy9cXFxcXSQvLCAnJyl9XCIgLS1maXhcXG5gO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKSlcbi8vICAgICAgIGZzLnVubGlua1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpO1xuLy8gICAgIGZzLndyaXRlRmlsZVN5bmMoZ2l0UGF0aCArICcvcHJlLXB1c2gnLCBob29rU3RyKTtcbi8vICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuLy8gICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgZ2l0UGF0aCArICcvcHJlLXB1c2gnKTtcbi8vICAgICBpZiAoIWlzV2luMzIpIHtcbi8vICAgICAgIHNwYXduKCdjaG1vZCcsICctUicsICcreCcsIHByb2plY3QgKyAnLy5naXQvaG9va3MvcHJlLXB1c2gnKTtcbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuZnVuY3Rpb24gZGVsZXRlRHVwbGljYXRlZEluc3RhbGxlZFBrZyh3b3Jrc3BhY2VLZXk6IHN0cmluZykge1xuICBjb25zdCB3c1N0YXRlID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpITtcbiAgY29uc3QgZG9Ob3RoaW5nID0gKCkgPT4ge307XG4gIHdzU3RhdGUubGlua2VkRGVwZW5kZW5jaWVzLmNvbmNhdCh3c1N0YXRlLmxpbmtlZERldkRlcGVuZGVuY2llcykubWFwKChbcGtnTmFtZV0pID0+IHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgcGtnTmFtZSk7XG4gICAgcmV0dXJuIGZzLnByb21pc2VzLmxzdGF0KGRpcilcbiAgICAudGhlbigoc3RhdCkgPT4ge1xuICAgICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oYFByZXZpb3VzIGluc3RhbGxlZCAke1BhdGgucmVsYXRpdmUocm9vdERpciwgZGlyKX0gaXMgZGVsZXRlZCwgZHVlIHRvIGxpbmtlZCBwYWNrYWdlICR7cGtnTmFtZX1gKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnVubGluayhkaXIpO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKGRvTm90aGluZyk7XG4gIH0pO1xufVxuXG4vLyAvKipcbi8vICAgICogSWYgYSBzb3VyY2UgY29kZSBwYWNrYWdlIHVzZXMgUGxpbmsncyBfX3BsaW5rIEFQSSAoIGxpa2UgYC5sb2dnZXJgKSBvciBleHRlbmRzIFBsaW5rJ3MgY29tbWFuZCBsaW5lLFxuLy8gICAgKiB0aGV5IG5lZWQgZW5zdXJlIHNvbWUgUGxpbmsncyBkZXBlbmRlbmNpZXMgYXJlIGluc3RhbGxlZCBhcyAxc3QgbGV2ZWwgZGVwZW5kZW5jeSBpbiB0aGVpciB3b3Jrc3BhY2UsXG4vLyAgICAqIG90aGVyd2lzZSBWaXN1YWwgQ29kZSBFZGl0b3IgY2FuIG5vdCBmaW5kIGNvcnJlY3QgdHlwZSBkZWZpbml0aW9ucyB3aGlsZSByZWZlcmVuY2luZyBQbGluaydzIGxvZ2dlciBvclxuLy8gICAgKiBDb21tYW5kIGludGVyZmFjZS5cbi8vICAgICogXG4vLyAgICAqIFNvIEkgbmVlZCB0byBtYWtlIHN1cmUgdGhlc2UgZGVwZW5kZW5jaWVzIGFyZSBpbnN0YWxsZWQgaW4gZWFjaCB3b3Jrc3BhY2Vcbi8vICAgICovXG5cbi8vIGZ1bmN0aW9uIHBsaW5rQXBpUmVxdWlyZWREZXBzKCk6IFBhY2thZ2VKc29uSW50ZXJmIHtcbi8vICAgY29uc3QgcGxpbmtKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHJlcXVpcmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJyk7XG4vLyAgIGNvbnN0IGZha2VKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHtcbi8vICAgICB2ZXJzaW9uOiBwbGlua0pzb24udmVyc2lvbixcbi8vICAgICBuYW1lOiBwbGlua0pzb24ubmFtZSxcbi8vICAgICBkZXBlbmRlbmNpZXM6IHt9XG4vLyAgIH07XG4vLyAgIGZvciAoY29uc3QgZGVwIG9mIFsnY29tbWFuZGVyJywgJ2xvZzRqcyddKSB7XG4vLyAgICAgY29uc3QgdmVyc2lvbiA9IHBsaW5rSnNvbi5kZXBlbmRlbmNpZXMhW2RlcF07XG4vLyAgICAgZmFrZUpzb24uZGVwZW5kZW5jaWVzIVtkZXBdID0gdmVyc2lvbjtcbi8vICAgfVxuLy8gICByZXR1cm4gZmFrZUpzb247XG4vLyB9XG4iXX0=