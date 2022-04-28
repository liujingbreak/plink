"use strict";
/**
 * Unfortunately, this file is very long, you need to fold by indention for better view of source code in Editor
 */
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
exports.createPackageInfo = exports.installInDir = exports.switchCurrentWorkspace = exports.isCwdWorkspace = exports.getProjectList = exports.getPackagesOfProjects = exports.workspaceDir = exports.workspaceKey = exports.projKeyToPath = exports.pathToProjKey = exports.getStore = exports.getState = exports.onLinkedPackageAdded = exports.updateGitIgnores = exports.actionDispatcher = exports.slice = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const log4js_1 = require("log4js");
const transitive_dep_hoister_1 = require("../transitive-dep-hoister");
const process_utils_1 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
const helper_1 = require("../../../packages/redux-toolkit-observable/dist/helper");
// import { getRootDir } from '../utils/misc';
const symlinks_1 = __importStar(require("../utils/symlinks"));
const rwPackageJson_1 = require("../rwPackageJson");
const misc_1 = require("../utils/misc");
const log = (0, log4js_1.getLogger)('plink.package-mgr');
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
            d.npmInstallOpt.useYarn = payload.useYarn;
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
            d.npmInstallOpt.useYarn = payload.useYarn;
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
        _workspaceBatchChanged(d, action) { },
        /** workspaceChanged is safe for external module to watch, it serialize actions like "_installWorkspace" and "_workspaceBatchChanged" */
        workspaceChanged(d, action) { },
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
            const { hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo, hoistedDev: hoistedDevDeps, hoistedDevPeers: devHoistPeerDepInfo } = (0, transitive_dep_hoister_1.listCompDependency)(state.srcPackages, wsKey, pkjson.dependencies || {}, pkjson.devDependencies);
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
            // log.warn(installJson);
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
        },
        _clearProjAndSrcDirPkgs(d) {
            for (const key of d.project2Packages.keys()) {
                d.project2Packages.set(key, []);
            }
            for (const key of d.srcDir2Packages.keys()) {
                d.srcDir2Packages.set(key, []);
            }
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
    const actionByTypes = (0, helper_1.castByActionType)(exports.slice.actions, action$);
    return (0, rxjs_1.merge)(
    // To override stored state. 
    // Do not put following logic in initialState! It will be overridden by previously saved state
    (0, rxjs_1.defer)(() => {
        process.nextTick(() => exports.actionDispatcher._updatePlinkPackageInfo());
        return rxjs_1.EMPTY;
    }), getStore().pipe((0, operators_1.map)(s => s.project2Packages), (0, operators_1.distinctUntilChanged)(), (0, operators_1.map)(pks => {
        (0, recipe_manager_1.setProjectList)(getProjectList());
        return pks;
    }), (0, operators_1.ignoreElements)()), getStore().pipe((0, operators_1.map)(s => s.srcDir2Packages), (0, operators_1.distinctUntilChanged)(), (0, operators_1.filter)(v => v != null), (0, operators_1.map)((linkPatternMap) => {
        (0, recipe_manager_1.setLinkPatterns)(linkPatternMap.keys());
    })), getStore().pipe((0, operators_1.map)(s => s.srcPackages), (0, operators_1.distinctUntilChanged)(), (0, operators_1.scan)((prevMap, currMap) => {
        packageAddedList.splice(0);
        for (const nm of currMap.keys()) {
            if (!prevMap.has(nm)) {
                packageAddedList.push(nm);
            }
        }
        if (packageAddedList.length > 0)
            (0, exports.onLinkedPackageAdded)(packageAddedList);
        return currMap;
    })), 
    //  updateWorkspace
    actionByTypes.updateWorkspace.pipe((0, operators_1.concatMap)(({ payload: { dir, isForce, useNpmCi, packageJsonFiles } }) => {
        dir = path_1.default.resolve(dir);
        exports.actionDispatcher._setCurrentWorkspace(dir);
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/app-template.js'), path_1.default.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        const lockFile = path_1.default.resolve(dir, 'plink.install.lock');
        if (fs_1.default.existsSync(lockFile) || isForce || useNpmCi) {
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
        return (0, rxjs_1.merge)(packageJsonFiles != null ? scanAndSyncPackages(packageJsonFiles) :
            (0, rxjs_1.defer)(() => (0, rxjs_1.of)(initRootDirectory())), action$.pipe((0, store_1.ofPayloadAction)(exports.slice.actions._syncLinkedPackages), (0, operators_1.take)(1), (0, operators_1.map)(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
    })), actionByTypes.scanAndSyncPackages.pipe((0, operators_1.concatMap)(({ payload }) => {
        return (0, rxjs_1.merge)(scanAndSyncPackages(payload.packageJsonFiles), action$.pipe((0, store_1.ofPayloadAction)(exports.slice.actions._syncLinkedPackages), (0, operators_1.take)(1), (0, operators_1.tap)(() => {
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
    actionByTypes.initRootDir.pipe((0, operators_1.map)(({ payload }) => {
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
    })), actionByTypes._hoistWorkspaceDeps.pipe((0, operators_1.map)(({ payload }) => {
        const wsKey = workspaceKey(payload.dir);
        // actionDispatcher.onWorkspacePackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated(wsKey));
    })), actionByTypes.updateDir.pipe((0, operators_1.tap)(() => exports.actionDispatcher._updatePlinkPackageInfo()), (0, operators_1.concatMap)(() => scanAndSyncPackages()), (0, operators_1.tap)(() => {
        for (const key of getState().workspaces.keys()) {
            updateInstalledPackageForWorkspace(key);
        }
    })), 
    // Handle newly added workspace
    getStore().pipe((0, operators_1.map)(s => s.workspaces), (0, operators_1.distinctUntilChanged)(), (0, operators_1.map)(ws => {
        const keys = Array.from(ws.keys());
        return keys;
    }), (0, operators_1.scan)((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // eslint-disable-next-line no-console
            log.info('New workspace: ', newAdded);
            for (const ws of newAdded) {
                exports.actionDispatcher._installWorkspace({ workspaceKey: ws });
            }
        }
        return curr;
    })), 
    // observe all existing Workspaces for dependency hoisting result 
    ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(
        // filter(s => s.workspaces.has(key)),
        (0, operators_1.takeWhile)(s => s.workspaces.has(key)), (0, operators_1.map)(s => s.workspaces.get(key)), (0, operators_1.distinctUntilChanged)((s1, s2) => s1.installJson === s2.installJson), (0, operators_1.scan)((old, newWs) => {
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
                log.debug('newDeps.length', newDeps.length, ' !== oldDeps.length', oldDeps.length);
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
        }));
    }), 
    // _workspaceBatchChanged will trigger creating symlinks, but meanwhile _installWorkspace will delete symlinks
    // I don't want to seem them running simultaneously.
    (0, rxjs_1.merge)(actionByTypes._workspaceBatchChanged, actionByTypes._installWorkspace).pipe((0, operators_1.concatMap)(action => {
        if ((0, helper_1.isActionOfCreator)(action, exports.slice.actions._installWorkspace)) {
            const wsKey = action.payload.workspaceKey;
            return getStore().pipe((0, operators_1.map)(s => s.workspaces.get(wsKey)), (0, operators_1.distinctUntilChanged)(), (0, operators_1.filter)(ws => ws != null), (0, operators_1.take)(1), (0, operators_1.concatMap)(ws => {
                return installWorkspace(ws, getState().npmInstallOpt);
            }), (0, operators_1.map)(() => {
                updateInstalledPackageForWorkspace(wsKey);
            }), (0, operators_1.ignoreElements)());
        }
        else if ((0, helper_1.isActionOfCreator)(action, exports.slice.actions._workspaceBatchChanged)) {
            const wsKeys = action.payload;
            return (0, rxjs_1.merge)(...wsKeys.map(_createSymlinksForWorkspace)).pipe((0, operators_1.finalize)(() => exports.actionDispatcher.workspaceChanged(wsKeys)));
        }
        else {
            return rxjs_1.EMPTY;
        }
    })), 
    // something is newly installed or changed in workspace node_modules
    actionByTypes.workspaceStateUpdated.pipe((0, operators_1.map)(action => updatedWorkspaceSet.add(action.payload)), (0, operators_1.debounceTime)(800), (0, operators_1.tap)(() => {
        exports.actionDispatcher._workspaceBatchChanged(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
    }), (0, operators_1.map)(() => {
        exports.actionDispatcher.packagesUpdated();
    })), actionByTypes.updateGitIgnores.pipe((0, operators_1.tap)(action => {
        let rel = action.payload.file;
        if (path_1.default.isAbsolute(rel)) {
            rel = path_1.default.relative(rootDir, rel).replace(/\\/g, '/');
        }
        gitIgnoreFilesWaiting.add(rel);
    }), (0, operators_1.debounceTime)(500), (0, operators_1.map)(() => {
        const changedFiles = [...gitIgnoreFilesWaiting.values()];
        gitIgnoreFilesWaiting.clear();
        return changedFiles;
    }), (0, operators_1.concatMap)((changedFiles) => {
        return (0, rxjs_1.merge)(...changedFiles.map(async (rel) => {
            const file = path_1.default.resolve(rootDir, rel);
            const lines = getState().gitIgnores[file];
            if (fs_1.default.existsSync(file)) {
                const data = await fs_1.default.promises.readFile(file, 'utf8');
                const existingLines = data.split(/\n\r?/).map(line => line.trim());
                const newLines = lodash_1.default.difference(lines, existingLines);
                if (newLines.length === 0)
                    return;
                fs_1.default.writeFile(file, data + os_1.EOL + newLines.join(os_1.EOL), () => {
                    // eslint-disable-next-line no-console
                    log.info('Modify', file);
                });
            }
        }));
    }), (0, operators_1.ignoreElements)()), action$.pipe((0, store_1.ofPayloadAction)(exports.slice.actions.addProject, exports.slice.actions.deleteProject), (0, operators_1.concatMap)(() => scanAndSyncPackages())), action$.pipe((0, store_1.ofPayloadAction)(exports.slice.actions.addSrcDirs, exports.slice.actions.deleteSrcDirs), (0, operators_1.concatMap)(() => scanAndSyncPackages()))).pipe((0, operators_1.ignoreElements)(), (0, operators_1.catchError)(err => {
        log.error(err.stack ? err.stack : err);
        return (0, rxjs_1.throwError)(err);
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
    exports.actionDispatcher._workspaceBatchChanged([workspaceKey(dir)]);
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
async function initRootDirectory() {
    log.debug('initRootDirectory');
    const rootPath = rootDir;
    fs_extra_1.default.mkdirpSync(distDir);
    // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
    maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
    maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), rootDir + '/.gitignore');
    await (0, symlinks_1.default)();
    await scanAndSyncPackages();
    // await _deleteUselessSymlink(Path.resolve(rootDir, 'node_modules'), new Set<string>());
}
async function installWorkspace(ws, npmOpt) {
    const dir = path_1.default.resolve(rootDir, ws.id);
    try {
        await installInDir(dir, npmOpt, ws.originInstallJsonStr, ws.installJsonStr);
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
}
async function installInDir(dir, npmOpt, originPkgJsonStr, toInstallPkgJsonStr) {
    // eslint-disable-next-line no-console
    log.info('Install dependencies in ' + dir);
    try {
        await copyNpmrcToWorkspace(dir);
    }
    catch (e) {
        console.error(e);
    }
    const symlinksInModuleDir = [];
    const target = path_1.default.resolve(dir, 'node_modules');
    if (!fs_1.default.existsSync(target)) {
        fs_extra_1.default.mkdirpSync(target);
    }
    // NPM v7.20.x can not install dependencies if there is any file with name prefix '_' exists in directory node_modules
    const legacyPkgSettingFile = path_1.default.resolve(dir, 'node_modules', '_package-settings.d.ts');
    if (fs_1.default.existsSync(legacyPkgSettingFile)) {
        fs_1.default.unlinkSync(legacyPkgSettingFile);
    }
    // 1. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
    // backup them for late recovery
    await (0, symlinks_1.listModuleSymlinks)(target, link => {
        log.debug('Remove symlink', link);
        const linkContent = fs_1.default.readlinkSync(link);
        symlinksInModuleDir.push({ content: linkContent, link });
        return (0, symlinks_1.unlinkAsync)(link);
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
    await new Promise(resolve => setImmediate(resolve));
    // await new Promise(resolve => setTimeout(resolve, 5000));
    try {
        const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
        if (npmOpt.cache)
            env.npm_config_cache = npmOpt.cache;
        if (npmOpt.offline)
            env.npm_config_offline = 'true';
        const exeName = npmOpt.useYarn ? 'yarn' : 'npm';
        const cmdArgs = [npmOpt.useYarn !== true && npmOpt.useNpmCi ? 'ci' : 'install'];
        await (0, process_utils_1.exe)(exeName, ...cmdArgs, { cwd: dir, env }).done;
        await new Promise(resolve => setImmediate(resolve));
        if (npmOpt.useYarn !== true && npmOpt.prune) {
            await (0, process_utils_1.exe)(exeName, 'prune', { cwd: dir, env }).done;
            // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
            // why, I have to add a setImmediate() between them to workaround
            await new Promise(resolve => setImmediate(resolve));
        }
        if (npmOpt.dedupe) {
            try {
                await (0, process_utils_1.exe)(exeName, 'dedupe', ...[npmOpt.useYarn === true ? '--immutable' : ''], { cwd: dir, env }).promise;
            }
            catch (ddpErr) {
                log.warn('Failed to dedupe dependencies, but it is OK', ddpErr);
            }
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
        await recoverSymlinks();
        if (fs_1.default.existsSync(lockFile))
            await fs_1.default.promises.unlink(lockFile);
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
}
exports.installInDir = installInDir;
async function copyNpmrcToWorkspace(workspaceDir) {
    const target = path_1.default.resolve(workspaceDir, '.npmrc');
    if (fs_1.default.existsSync(target))
        return;
    const isChina = await getStore().pipe((0, operators_1.map)(s => s.isInChina), (0, operators_1.distinctUntilChanged)(), (0, operators_1.filter)(cn => cn != null), (0, operators_1.take)(1)).toPromise();
    if (isChina) {
        // eslint-disable-next-line no-console
        log.info('create .npmrc to', target);
        fs_1.default.copyFileSync(path_1.default.resolve(__dirname, '../../templates/npmrc-for-cn.txt'), target);
    }
}
async function scanAndSyncPackages(includePackageJsonFiles) {
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
        const rm = (await Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
        pkgList = [];
        exports.actionDispatcher._clearProjAndSrcDirPkgs();
        await rm.scanPackages().pipe((0, operators_1.tap)(([proj, jsonFile, srcDir]) => {
            if (proj && !projPkgMap.has(proj))
                projPkgMap.set(proj, []);
            if (proj == null && srcDir && !srcPkgMap.has(srcDir))
                srcPkgMap.set(srcDir, []);
            log.debug('scan package.json', jsonFile);
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
                log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`, info.json);
            }
        })).toPromise();
        // log.warn(projPkgMap, srcPkgMap);
        for (const [prj, pkgs] of projPkgMap.entries()) {
            exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
        }
        for (const [srcDir, pkgs] of srcPkgMap.entries()) {
            exports.actionDispatcher._associatePackageToSrcDir({ pattern: srcDir, pkgs });
        }
        exports.actionDispatcher._syncLinkedPackages([pkgList, 'clean']);
    }
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
        exports.actionDispatcher.updateGitIgnores({
            file: path_1.default.resolve(rootDir, '.gitignore'),
            lines: [path_1.default.relative(rootDir, symlinkDir).replace(/\\/g, '/')]
        });
    }
    let symlinksToCreate = (0, rxjs_1.from)(Array.from(pkgNameSet.values())) // Important, do not use pkgNameSet iterable, it will be changed before subscription
        .pipe((0, operators_1.map)(name => {
        const pkg = getState().srcPackages.get(name) || ws.installedComponents.get(name);
        if (pkg == null) {
            log.warn(`Missing package information of ${name}, please run "Plink sync ${wsKey}" again to sync Plink state`);
        }
        return pkg;
    }), (0, operators_1.filter)(pkg => pkg != null));
    if (rootDir === workspaceDir(wsKey)) {
        const plinkPkg = getState().linkedDrcp || getState().installedDrcp;
        if (plinkPkg) {
            pkgNameSet.add(plinkPkg.name);
        }
    }
    return (0, rxjs_1.merge)(symlinksToCreate.pipe((0, rwPackageJson_1.symbolicLinkPackages)(symlinkDir)), _deleteUselessSymlink(symlinkDir, pkgNameSet));
}
async function _deleteUselessSymlink(checkDir, excludeSet) {
    const dones = [];
    const done1 = (0, symlinks_1.listModuleSymlinks)(checkDir, link => {
        const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
        if (!excludeSet.has(pkgName)) {
            // eslint-disable-next-line no-console
            log.info(`Delete extraneous symlink: ${link}`);
            dones.push(fs_1.default.promises.unlink(link));
        }
    });
    await done1;
    await Promise.all(dones);
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
    if (from.startsWith('-')) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwyQkFBeUI7QUFFekIsa0RBQTBCO0FBQzFCLHdEQUE2QjtBQUM3QixvREFBdUI7QUFDdkIsK0JBQTJFO0FBQzNFLDhDQUMyRjtBQUMzRixtQ0FBaUM7QUFDakMsc0VBQWlHO0FBQ2pHLG9EQUF1QztBQUN2QyxzREFBbUU7QUFDbkUsb0NBQXlEO0FBQ3pELG1GQUEyRztBQUMzRyw4Q0FBOEM7QUFDOUMsOERBQW1HO0FBQ25HLG9EQUFzRDtBQUN0RCx3Q0FBeUM7QUFDekMsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLG1CQUFtQixDQUFDLENBQUM7QUFzRDNDLE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTdFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsTUFBTSxFQUFFLEtBQUs7SUFDYixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDM0IsZUFBZSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQzFCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztJQUN6QixhQUFhLEVBQUUsRUFBQyxPQUFPLEVBQUUsS0FBSyxFQUFDO0NBQ2hDLENBQUM7QUEwQ1csUUFBQSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDekMsSUFBSSxFQUFFLEVBQUU7SUFDUixZQUFZLEVBQUUsS0FBSztJQUNuQixRQUFRLEVBQUU7UUFDUixtRUFBbUU7UUFDbkUsV0FBVyxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBNEI7WUFDakQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUN0QyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1lBQzVDLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7UUFDNUMsQ0FBQztRQUVEOzs7Ozs7O1dBT0c7UUFDSCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUlaO1lBQ2IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUN0QyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQzFDLENBQUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDOUMsQ0FBQztRQUNELG1CQUFtQixDQUFDLENBQWdCLEVBQUUsTUFBb0Q7UUFDMUYsQ0FBQztRQUVELFNBQVMsS0FBSSxDQUFDO1FBQ2QsdUJBQXVCLENBQUMsQ0FBQztZQUN2QixNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNsRixJQUFJLGFBQWEsRUFBRTtnQkFDakIsQ0FBQyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUM7Z0JBQ3hCLENBQUMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO2dCQUN2QixDQUFDLENBQUMsaUJBQWlCLEdBQUcsYUFBYSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2FBQzFFO2lCQUFNO2dCQUNMLENBQUMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixDQUFDLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQztnQkFDM0IsQ0FBQyxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQzthQUM1QjtRQUNILENBQUM7UUFDRCxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQXFFO1lBQ2xHLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUM7WUFDeEIsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxFQUFFO2dCQUMxQixHQUFHLEdBQUcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQzthQUN0RDtZQUNELEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUMvQixHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDOUI7UUFDSCxDQUFDO1FBQ0Qsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLE1BQStCLElBQUcsQ0FBQztRQUMzRCxVQUFVLENBQUMsQ0FBQyxFQUFFLE1BQStCO1lBQzNDLEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDbkMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtvQkFDaEMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ2pDO2FBQ0Y7UUFDSCxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxNQUErQjtZQUM5QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUM7UUFDRCxVQUFVLENBQUMsQ0FBQyxFQUFFLE1BQStCO1lBQzNDLEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDbkMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQy9CLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDaEM7YUFDRjtRQUNILENBQUM7UUFDRCxhQUFhLENBQUMsQ0FBQyxFQUFFLE1BQStCO1lBQzlDLEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDbkMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQyxDQUFDLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMvQjtRQUNILENBQUM7UUFDRCwyRUFBMkU7UUFDM0Usc0JBQXNCLENBQUMsQ0FBQyxFQUFFLE1BQStCLElBQUcsQ0FBQztRQUM3RCx3SUFBd0k7UUFDeEksZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLE1BQStCLElBQUcsQ0FBQztRQUN2RCxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxJQUFJLEVBQUUsS0FBSyxFQUFDLEVBQWlEO1lBQzFGLElBQUksR0FBRyxHQUFHLElBQUksRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDO1lBQzNCLElBQUksY0FBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtnQkFDekIsR0FBRyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3ZELEdBQUcsR0FBRyxJQUFJLENBQUM7YUFDWjtpQkFBTTtnQkFDTCxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDbkM7WUFDRCxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3JCLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMxQjtZQUNELENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQ2xGLENBQUM7UUFDRCxlQUFlLENBQUMsQ0FBQztZQUNmLENBQUMsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQzdCLENBQUM7UUFDRCxVQUFVLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUF5QjtZQUM3QyxDQUFDLENBQUMsU0FBUyxHQUFHLE9BQU8sQ0FBQztRQUN4QixDQUFDO1FBQ0Qsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLEdBQUcsRUFBK0I7WUFDbEUsSUFBSSxHQUFHLElBQUksSUFBSTtnQkFDYixDQUFDLENBQUMsYUFBYSxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQzs7Z0JBRXBDLENBQUMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO1FBQzNCLENBQUM7UUFDRCw4QkFBOEI7UUFDOUIscUJBQXFCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUF3QjtZQUN2RCxDQUFDLENBQUMsdUJBQXVCLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxtRkFBbUY7UUFDbkYsbUJBQW1CLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQStCO1lBQ3ZFLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQzthQUM1RTtZQUVELElBQUksU0FBaUIsQ0FBQztZQUN0QixNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUN0RCxNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1lBQ3pELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyx3RUFBd0UsR0FBRyxXQUFXLENBQUMsQ0FBQztnQkFDakcsU0FBUyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QyxZQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3pCO2lCQUFNO2dCQUNMLFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNsRDtZQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFzQixDQUFDO1lBQzFELHFHQUFxRztZQUNyRywwQkFBMEI7WUFDMUIsSUFBSTtZQUNKLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQVMsTUFBTSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQztZQUUvRCx1REFBdUQ7WUFDdkQsTUFBTSxrQkFBa0IsR0FBZ0IsRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ2pCLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ2pDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDOUI7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQVMsTUFBTSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNyRSw2REFBNkQ7WUFDN0QsTUFBTSxxQkFBcUIsR0FBbUIsRUFBRSxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ3BCLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ2pDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDakM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUVILE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQyxNQUFNLEVBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQ3pELFVBQVUsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUNqRSxHQUNDLElBQUEsMkNBQWtCLEVBQ2hCLEtBQUssQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUksRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlLENBQzlFLENBQUM7WUFFRixNQUFNLFdBQVcsbUNBQ1osTUFBTSxLQUNULFlBQVksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztxQkFDOUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDL0UsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxhQUFhLElBQUksSUFBSSxLQUFLLFlBQVksQ0FBQztxQkFDM0QsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDM0IsT0FBTyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQyxFQUFFLEVBQTZCLENBQUMsRUFFakMsZUFBZSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO3FCQUNwRCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3FCQUNsRixNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLGFBQWEsSUFBSSxJQUFJLEtBQUssWUFBWSxDQUFDO3FCQUMzRCxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtvQkFDNUIsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO29CQUMzQixPQUFPLEdBQUcsQ0FBQztnQkFDYixDQUFDLEVBQUUsRUFBNkIsQ0FBQyxHQUNsQyxDQUFDO1lBRUYseUJBQXlCO1lBQ3pCLG9HQUFvRztZQUVwRyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUU3QyxNQUFNLGdCQUFnQixHQUF1QztnQkFDM0QsWUFBWSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLGNBQWMsRUFBRSxFQUFFO2FBQ3RELENBQUM7WUFFRixLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUMsV0FBVyxFQUFFLGdCQUFnQixDQUFDLEVBQUU7Z0JBQ3RELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDaEIsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO3FCQUNwRDtvQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ2pDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ3pDO2lCQUNGO2FBQ0Y7WUFDRCxLQUFLLE1BQU0sUUFBUSxJQUFJLENBQUMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLEVBQUU7Z0JBQzVELEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUU7b0JBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDaEIsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO3FCQUN2RDtvQkFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7d0JBQ2pDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ3pDO2lCQUNGO2FBQ0Y7WUFFRCxNQUFNLEVBQUUsR0FBbUI7Z0JBQ3pCLEVBQUUsRUFBRSxLQUFLO2dCQUNULGlCQUFpQixFQUFFLE1BQU07Z0JBQ3pCLG9CQUFvQixFQUFFLFNBQVM7Z0JBQy9CLFdBQVc7Z0JBQ1gsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQ3ZELGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixTQUFTLEVBQUUsV0FBVztnQkFDdEIsZ0JBQWdCO2dCQUNoQixZQUFZLEVBQUUsY0FBYztnQkFDNUIsbUJBQW1CLEVBQUUsbUJBQW1CO2dCQUN4QyxnQkFBZ0I7YUFDakIsQ0FBQztZQUNGLEtBQUssQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7WUFDbkMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFDRCxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxZQUFZLEVBQUMsRUFBd0MsSUFBRyxDQUFDO1FBQ3pGLG9FQUFvRTtRQUNwRSxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQXVEO1lBQ3BHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QseUJBQXlCLENBQUMsQ0FBQyxFQUN6QixFQUFDLE9BQU8sRUFBRSxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsRUFBMkQ7WUFDcEYsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBQ0QsdUJBQXVCLENBQUMsQ0FBQztZQUN2QixLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDM0MsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDakM7WUFDRCxLQUFLLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzFDLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUM7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsZ0JBQWdCLEdBQUcsb0JBQVksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFLLENBQUMsQ0FBQztBQUN6RCx3QkFBZ0IsR0FBMEIsd0JBQWdCLG1CQUF4Qyw0QkFBb0IsR0FBSSx3QkFBZ0Isc0JBQUM7QUFFekU7O0dBRUc7QUFDSCxvQkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtJQUN2QyxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEtBQUssRUFBVSxDQUFDO0lBRTdDLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUVoRCxJQUFJLFFBQVEsRUFBRSxDQUFDLGVBQWUsSUFBSSxJQUFJLEVBQUU7UUFDdEMsb0VBQW9FO1FBQ3BFLDhEQUE4RDtRQUM5RCx3QkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztLQUM5RDtJQUNELE1BQU0sYUFBYSxHQUFHLElBQUEseUJBQWdCLEVBQUMsYUFBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvRCxPQUFPLElBQUEsWUFBSztJQUNWLDZCQUE2QjtJQUM3Qiw4RkFBOEY7SUFFOUYsSUFBQSxZQUFLLEVBQUMsR0FBRyxFQUFFO1FBQ1QsT0FBTyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyx3QkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDbkUsT0FBTyxZQUFLLENBQUM7SUFDZixDQUFDLENBQUMsRUFDRixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFDMUMsSUFBQSxnQ0FBb0IsR0FBRSxFQUN0QixJQUFBLGVBQUcsRUFBQyxHQUFHLENBQUMsRUFBRTtRQUNSLElBQUEsK0JBQWMsRUFBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDLEVBQ0YsSUFBQSwwQkFBYyxHQUFFLENBQ2pCLEVBRUQsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxFQUN6QyxJQUFBLGdDQUFvQixHQUFFLEVBQ3RCLElBQUEsa0JBQU0sRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsRUFDdEIsSUFBQSxlQUFHLEVBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtRQUNyQixJQUFBLGdDQUFlLEVBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQyxDQUFDLENBQUMsRUFFTCxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQ3JDLElBQUEsZ0NBQW9CLEdBQUUsRUFDdEIsSUFBQSxnQkFBSSxFQUErQixDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRTtRQUN0RCxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0IsS0FBSyxNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3BCLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUMzQjtTQUNGO1FBQ0QsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQztZQUM3QixJQUFBLDRCQUFvQixFQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDekMsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQ0g7SUFDRCxtQkFBbUI7SUFDbkIsYUFBYSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQ2hDLElBQUEscUJBQVMsRUFBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUMsRUFBQyxFQUFFLEVBQUU7UUFDbEUsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEIsd0JBQWdCLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDM0MsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzNHLGtCQUFrQixFQUFFLENBQUM7UUFDckIsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN6RCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksT0FBTyxJQUFJLFFBQVEsRUFBRTtZQUNsRCxrRkFBa0Y7WUFDbEYsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hDLElBQUksUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDcEMsd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUMzQixrQ0FBa0M7b0JBQ2xDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDO29CQUNwQyxFQUFFLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztvQkFDdkIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO29CQUNqQyxFQUFFLENBQUMsV0FBVyxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUM7b0JBQ3BDLHNDQUFzQztvQkFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDM0MsQ0FBQyxDQUFDLENBQUM7YUFDSjtTQUNGO1FBQ0QsK0ZBQStGO1FBQy9GLGdDQUFnQztRQUNoQyxPQUFPLElBQUEsWUFBSyxFQUNWLGdCQUFnQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLElBQUEsWUFBSyxFQUFDLEdBQUcsRUFBRSxDQUFDLElBQUEsU0FBRSxFQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxFQUN0QyxPQUFPLENBQUMsSUFBSSxDQUNWLElBQUEsdUJBQWUsRUFBQyxhQUFLLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQ2xELElBQUEsZ0JBQUksRUFBQyxDQUFDLENBQUMsRUFDUCxJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUUsQ0FBQyx3QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLEdBQUcsRUFBQyxDQUFDLENBQUMsQ0FDdkQsQ0FDRixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0gsRUFDRCxhQUFhLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUNwQyxJQUFBLHFCQUFTLEVBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7UUFDdEIsT0FBTyxJQUFBLFlBQUssRUFDVixtQkFBbUIsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsRUFDN0MsT0FBTyxDQUFDLElBQUksQ0FDVixJQUFBLHVCQUFlLEVBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUNsRCxJQUFBLGdCQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQ1AsSUFBQSxlQUFHLEVBQUMsR0FBRyxFQUFFO1lBQ1AsTUFBTSxNQUFNLEdBQUcsUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQ3hDLEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNoRCxJQUFJLEtBQUssS0FBSyxNQUFNO29CQUNsQix3QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLEdBQUcsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsRUFBQyxDQUFDLENBQUM7YUFDN0U7WUFDRCxJQUFJLE1BQU0sSUFBSSxJQUFJLEVBQUU7Z0JBQ2xCLDRGQUE0RjtnQkFDNUYsd0JBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBQyxHQUFHLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLEVBQUMsQ0FBQyxDQUFDO2FBQzVFO1FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQ0g7SUFFRCxjQUFjO0lBQ2QsYUFBYSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQzVCLElBQUEsZUFBRyxFQUFDLENBQUMsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFFO1FBQ2hCLGtCQUFrQixFQUFFLENBQUM7UUFDckIsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtZQUM3RCx3QkFBZ0IsQ0FBQyxlQUFlLGlCQUFFLEdBQUcsRUFBRSxlQUFRLENBQUMsT0FBTyxJQUNsRCxPQUFPLEVBQUUsQ0FBQztTQUNoQjthQUFNO1lBQ0wsTUFBTSxJQUFJLEdBQUcsUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO1lBQ3RDLElBQUksSUFBSSxJQUFJLElBQUksRUFBRTtnQkFDaEIsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUNuQyxNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDekMsd0JBQWdCLENBQUMsZUFBZSxpQkFBRSxHQUFHLEVBQUUsSUFBSSxJQUFLLE9BQU8sRUFBRSxDQUFDO2lCQUMzRDtxQkFBTTtvQkFDTCx3QkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztpQkFDN0M7YUFDRjtTQUNGO0lBQ0gsQ0FBQyxDQUFDLENBQ0gsRUFFRCxhQUFhLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUNwQyxJQUFBLGVBQUcsRUFBQyxDQUFDLEVBQUMsT0FBTyxFQUFDLEVBQUUsRUFBRTtRQUNoQixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLHFEQUFxRDtRQUNyRCw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNwQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsd0JBQWdCLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDLENBQUMsQ0FDSCxFQUVELGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUMxQixJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUUsQ0FBQyx3QkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLEVBQ3JELElBQUEscUJBQVMsRUFBQyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLEVBQ3RDLElBQUEsZUFBRyxFQUFDLEdBQUcsRUFBRTtRQUNQLEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxFQUFFO1lBQzlDLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3pDO0lBQ0gsQ0FBQyxDQUFDLENBQ0g7SUFDRCwrQkFBK0I7SUFDL0IsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUNwQyxJQUFBLGdDQUFvQixHQUFFLEVBQ3RCLElBQUEsZUFBRyxFQUFDLEVBQUUsQ0FBQyxFQUFFO1FBQ1AsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQyxFQUNGLElBQUEsZ0JBQUksRUFBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM3QixNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUMsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLEVBQUU7Z0JBQ3pCLHdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUMsWUFBWSxFQUFFLEVBQUUsRUFBQyxDQUFDLENBQUM7YUFDeEQ7U0FDRjtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQ0g7SUFDRCxrRUFBa0U7SUFDbEUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNwRCxPQUFPLFFBQVEsRUFBRSxDQUFDLElBQUk7UUFDcEIsc0NBQXNDO1FBQ3RDLElBQUEscUJBQVMsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ3JDLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsRUFDaEMsSUFBQSxnQ0FBb0IsRUFBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLEtBQUssRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUNuRSxJQUFBLGdCQUFJLEVBQWlCLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2xDLDRCQUE0QjtZQUM1QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztpQkFDakUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUM7aUJBQy9ELEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO2dCQUN4Qiw4RUFBOEU7Z0JBQzlFLE9BQU8sS0FBSyxDQUFDO2FBQ2Q7WUFDRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztpQkFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUM7aUJBQzdELEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUVsQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLE1BQU0sRUFBRTtnQkFDckMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLHFCQUFxQixFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkYsd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxZQUFZLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztnQkFDeEQsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7Z0JBQzlDLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDN0Isd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxZQUFZLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQztvQkFDeEQsTUFBTTtpQkFDUDthQUNGO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBQ0YsOEdBQThHO0lBQzlHLG9EQUFvRDtJQUNwRCxJQUFBLFlBQUssRUFBQyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUMvRSxJQUFBLHFCQUFTLEVBQUMsTUFBTSxDQUFDLEVBQUU7UUFDakIsSUFBSSxJQUFBLDBCQUFpQixFQUFDLE1BQU0sRUFBRSxhQUFLLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQUU7WUFDOUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUM7WUFDMUMsT0FBTyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ3BCLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsRUFDakMsSUFBQSxnQ0FBb0IsR0FBRSxFQUN0QixJQUFBLGtCQUFNLEVBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQ3hCLElBQUEsZ0JBQUksRUFBQyxDQUFDLENBQUMsRUFDUCxJQUFBLHFCQUFTLEVBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2IsT0FBTyxnQkFBZ0IsQ0FBQyxFQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDekQsQ0FBQyxDQUFDLEVBQ0YsSUFBQSxlQUFHLEVBQUMsR0FBRyxFQUFFO2dCQUNQLGtDQUFrQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzVDLENBQUMsQ0FBQyxFQUNGLElBQUEsMEJBQWMsR0FBRSxDQUNqQixDQUFDO1NBQ0g7YUFBTSxJQUFJLElBQUEsMEJBQWlCLEVBQUMsTUFBTSxFQUFFLGFBQUssQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsRUFBRTtZQUMxRSxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQzlCLE9BQU8sSUFBQSxZQUFLLEVBQUMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQzNELElBQUEsb0JBQVEsRUFBQyxHQUFHLEVBQUUsQ0FBQyx3QkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUMxRCxDQUFDO1NBQ0g7YUFBTTtZQUNMLE9BQU8sWUFBSyxDQUFDO1NBQ2Q7SUFDSCxDQUFDLENBQUMsQ0FDSDtJQUNELG9FQUFvRTtJQUNwRSxhQUFhLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUN0QyxJQUFBLGVBQUcsRUFBQyxNQUFNLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsRUFDdEQsSUFBQSx3QkFBWSxFQUFDLEdBQUcsQ0FBQyxFQUNqQixJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUU7UUFDUCx3QkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRixtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM5QixDQUFDLENBQUMsRUFDRixJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUU7UUFDUCx3QkFBZ0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUNyQyxDQUFDLENBQUMsQ0FDSCxFQUNELGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQ2pDLElBQUEsZUFBRyxFQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ1gsSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7UUFDOUIsSUFBSSxjQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLEdBQUcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3ZEO1FBQ0QscUJBQXFCLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxFQUNGLElBQUEsd0JBQVksRUFBQyxHQUFHLENBQUMsRUFDakIsSUFBQSxlQUFHLEVBQUMsR0FBRyxFQUFFO1FBQ1AsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDekQscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDOUIsT0FBTyxZQUFZLENBQUM7SUFDdEIsQ0FBQyxDQUFDLEVBQ0YsSUFBQSxxQkFBUyxFQUFDLENBQUMsWUFBWSxFQUFFLEVBQUU7UUFDekIsT0FBTyxJQUFBLFlBQUssRUFBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLEdBQUcsRUFBQyxFQUFFO1lBQzNDLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sS0FBSyxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3BELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDO29CQUN2QixPQUFPO2dCQUNULFlBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFHLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQ3ZELHNDQUFzQztvQkFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzNCLENBQUMsQ0FBQyxDQUFDO2FBQ0o7UUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQyxDQUFDLEVBQ0YsSUFBQSwwQkFBYyxHQUFFLENBQ2pCLEVBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFBLHVCQUFlLEVBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsYUFBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFDakYsSUFBQSxxQkFBUyxFQUFDLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FDdkMsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUEsdUJBQWUsRUFBQyxhQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxhQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUNqRixJQUFBLHFCQUFTLEVBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUN2QyxDQUNGLENBQUMsSUFBSSxDQUNKLElBQUEsMEJBQWMsR0FBRSxFQUNoQixJQUFBLHNCQUFVLEVBQUMsR0FBRyxDQUFDLEVBQUU7UUFDZixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sSUFBQSxpQkFBVSxFQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFLLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsYUFBSyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBZ0IsYUFBYSxDQUFDLElBQVk7SUFDeEMsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDakUsQ0FBQztBQUhELHNDQUdDO0FBQ0QsU0FBZ0IsYUFBYSxDQUFDLEdBQVc7SUFDdkMsT0FBTyxjQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2pFLENBQUM7QUFGRCxzQ0FFQztBQUVELFNBQWdCLFlBQVksQ0FBQyxJQUFZO0lBQ3ZDLElBQUksR0FBRyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRCxJQUFJLGNBQUksQ0FBQyxHQUFHLEtBQUssSUFBSTtRQUNuQixHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDaEMsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBTEQsb0NBS0M7QUFFRCxTQUFnQixZQUFZLENBQUMsR0FBVztJQUN0QyxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFGRCxvQ0FFQztBQUVELFFBQWUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFFBQWtCO0lBQ3ZELEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFO1FBQzFCLE1BQU0sUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLFFBQVEsRUFBRTtZQUNaLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO2dCQUM5QixNQUFNLEVBQUUsR0FBRyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLEVBQUU7b0JBQ0osTUFBTSxFQUFFLENBQUM7YUFDWjtTQUNGO0tBQ0Y7QUFDSCxDQUFDO0FBWEQsc0RBV0M7QUFFRCxTQUFnQixjQUFjO0lBQzVCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBZ0IsY0FBYztJQUM1QixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLE1BQU0sRUFBRSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsSUFBSSxFQUFFLElBQUksSUFBSTtRQUNaLE9BQU8sS0FBSyxDQUFDO0lBQ2YsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBTkQsd0NBTUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0Isc0JBQXNCLENBQUMsR0FBVztJQUNoRCx3QkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyx3QkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQztBQUhELHdEQUdDO0FBRUQsU0FBUyxrQ0FBa0MsQ0FBQyxLQUFhO0lBQ3ZELE1BQU0sUUFBUSxHQUFHLDhCQUE4QixDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRW5FLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ2xDLEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO1lBQ3pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ04sd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFDeEYsd0JBQWdCLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxrQkFBa0I7SUFDekIsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDOUMsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdkIsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLDBCQUEwQixDQUFDLENBQUM7WUFDckQsd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN6RDtLQUNGO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxpQkFBaUI7SUFDOUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQy9CLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQztJQUN6QixrQkFBSyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQixxSUFBcUk7SUFDckksaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFDakcsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQ3ZELGVBQWUsQ0FBQyxFQUFFLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztJQUMvQyxNQUFNLElBQUEsa0JBQW9CLEdBQUUsQ0FBQztJQUM3QixNQUFNLG1CQUFtQixFQUFFLENBQUM7SUFDNUIseUZBQXlGO0FBQzNGLENBQUM7QUFFRCxLQUFLLFVBQVUsZ0JBQWdCLENBQUMsRUFBa0IsRUFBRSxNQUFrQjtJQUNwRSxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDekMsSUFBSTtRQUNGLE1BQU0sWUFBWSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztLQUM3RTtJQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ1gsd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzNCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUUsQ0FBQztZQUNyQyxHQUFHLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQztZQUN4QixHQUFHLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7WUFDbEMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1lBQ3JDLE1BQU0sUUFBUSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLG1CQUFtQixDQUFDLENBQUM7WUFDeEQsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMzQixzQ0FBc0M7Z0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxRQUFRLCtCQUErQixDQUFDLENBQUM7Z0JBQ2pFLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7YUFDekI7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sRUFBRSxDQUFDO0tBQ1Y7QUFDSCxDQUFDO0FBRU0sS0FBSyxVQUFVLFlBQVksQ0FBQyxHQUFXLEVBQUUsTUFBa0IsRUFBRSxnQkFBd0IsRUFBRSxtQkFBMkI7SUFDdkgsc0NBQXNDO0lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDM0MsSUFBSTtRQUNGLE1BQU0sb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7S0FDakM7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDbEI7SUFDRCxNQUFNLG1CQUFtQixHQUFHLEVBQXVDLENBQUM7SUFFcEUsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7SUFDakQsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7UUFDMUIsa0JBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7S0FDMUI7SUFFRCxzSEFBc0g7SUFDdEgsTUFBTSxvQkFBb0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztJQUN6RixJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsRUFBRTtRQUN2QyxZQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUM7S0FDckM7SUFFRCxrRkFBa0Y7SUFDbEYsZ0NBQWdDO0lBQ2hDLE1BQU0sSUFBQSw2QkFBa0IsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLFdBQVcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztRQUN2RCxPQUFPLElBQUEsc0JBQVcsRUFBQyxJQUFJLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUNILHVCQUF1QjtJQUN2QixNQUFNLGVBQWUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztJQUMxRCxzQ0FBc0M7SUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFDbkMsWUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0QseUhBQXlIO0lBQ3pILHdGQUF3RjtJQUN4RixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3pELEtBQUssWUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLENBQUM7SUFFdkQsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3BELDJEQUEyRDtJQUMzRCxJQUFJO1FBQ0YsTUFBTSxHQUFHLEdBQUcsZ0NBQ1AsT0FBTyxDQUFDLEdBQUcsS0FDZCxRQUFRLEVBQUUsYUFBYSxHQUNILENBQUM7UUFFdkIsSUFBSSxNQUFNLENBQUMsS0FBSztZQUNkLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ3RDLElBQUksTUFBTSxDQUFDLE9BQU87WUFDaEIsR0FBRyxDQUFDLGtCQUFrQixHQUFHLE1BQU0sQ0FBQztRQUVsQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztRQUNoRCxNQUFNLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssSUFBSSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFaEYsTUFBTSxJQUFBLG1CQUFHLEVBQUMsT0FBTyxFQUFFLEdBQUcsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNyRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDcEQsSUFBSSxNQUFNLENBQUMsT0FBTyxLQUFLLElBQUksSUFBSSxNQUFNLENBQUMsS0FBSyxFQUFFO1lBQzNDLE1BQU0sSUFBQSxtQkFBRyxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ2xELG9HQUFvRztZQUNwRyxpRUFBaUU7WUFDakUsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1NBQ3JEO1FBQ0QsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO1lBQ2pCLElBQUk7Z0JBQ0YsTUFBTSxJQUFBLG1CQUFHLEVBQUMsT0FBTyxFQUFFLFFBQVEsRUFDekIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUNqRCxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDNUI7WUFBQyxPQUFPLE1BQU0sRUFBRTtnQkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ2pFO1NBQ0Y7S0FDRjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1Ysc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUcsQ0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2hFLE1BQU0sQ0FBQyxDQUFDO0tBQ1Q7WUFBUztRQUNSLHNDQUFzQztRQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUMsQ0FBQztRQUN2QywwREFBMEQ7UUFDMUQsWUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDNUQsTUFBTSxlQUFlLEVBQUUsQ0FBQztRQUN4QixJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO1lBQ3pCLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdEM7SUFFRCxTQUFTLGVBQWU7UUFDdEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxFQUFFLEVBQUU7WUFDN0QsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3hCLGtCQUFLLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDckMsT0FBTyxZQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGtCQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7YUFDekU7WUFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQztBQUNILENBQUM7QUEvRkQsb0NBK0ZDO0FBRUQsS0FBSyxVQUFVLG9CQUFvQixDQUFDLFlBQW9CO0lBQ3RELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQ3BELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDdkIsT0FBTztJQUNULE1BQU0sT0FBTyxHQUFHLE1BQU0sUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNuQyxJQUFBLGVBQUcsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxJQUFBLGdDQUFvQixHQUFFLEVBQzNDLElBQUEsa0JBQU0sRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFDeEIsSUFBQSxnQkFBSSxFQUFDLENBQUMsQ0FBQyxDQUNSLENBQUMsU0FBUyxFQUFFLENBQUM7SUFFaEIsSUFBSSxPQUFPLEVBQUU7UUFDWCxzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNyQyxZQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGtDQUFrQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7S0FDdEY7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLG1CQUFtQixDQUFDLHVCQUFrQztJQUNuRSxNQUFNLFVBQVUsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN6RCxNQUFNLFNBQVMsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUN4RCxJQUFJLE9BQXNCLENBQUM7SUFFM0IsSUFBSSx1QkFBdUIsRUFBRTtRQUMzQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDL0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzdELE9BQU8sR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0MsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsY0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEYsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFO2dCQUNmLE1BQU0sZUFBZSxHQUFHLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUUsQ0FBQztnQkFDMUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO29CQUN4Qyx3QkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQzt3QkFDdEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUM7d0JBQ3BCLElBQUksRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO3FCQUN2RCxDQUFDLENBQUM7aUJBQ0o7YUFDRjtpQkFBTTtnQkFDTCxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsUUFBUSxFQUFFLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3BELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDMUQsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssR0FBRyxJQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDL0csSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO29CQUNaLE1BQU0sSUFBSSxHQUFHLFFBQVEsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFFLENBQUM7b0JBQ3hELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTt3QkFDN0Isd0JBQWdCLENBQUMseUJBQXlCLENBQUM7NEJBQ3pDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDOzRCQUNsQixJQUFJLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQzt5QkFDNUMsQ0FBQyxDQUFDO3FCQUNKO2lCQUNGO3FCQUFNO29CQUNMLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSwrQ0FBK0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUM1SDthQUNGO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FBQztRQUNILHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7S0FDM0Q7U0FBTTtRQUNMLE1BQU0sRUFBRSxHQUFHLENBQUMsd0RBQWEsbUJBQW1CLEdBQUMsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYix3QkFBZ0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1FBQzNDLE1BQU0sRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLElBQUksQ0FDMUIsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRTtZQUMvQixJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUMvQixVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMzQixJQUFJLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0JBQ2xELFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBRTVCLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDekMsTUFBTSxJQUFJLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2hELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7Z0JBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ25CLElBQUksSUFBSTtvQkFDTixVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztxQkFDOUIsSUFBSSxNQUFNO29CQUNiLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOztvQkFFbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLFFBQVEsRUFBRSxDQUFDLENBQUM7YUFDbkM7aUJBQU07Z0JBQ0wsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLFFBQVEsa0RBQWtELEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hHO1FBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLG1DQUFtQztRQUNuQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzlDLHdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7U0FDdEQ7UUFDRCxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ2hELHdCQUFnQixDQUFDLHlCQUF5QixDQUFDLEVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1NBQ3JFO1FBRUQsd0JBQWdCLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztLQUMxRDtBQUNILENBQUM7QUFFRCxTQUFTLDJCQUEyQixDQUFDLEtBQWE7SUFDaEQsSUFBSSxjQUFjLEtBQUssUUFBUSxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7UUFDeEYsa0JBQUssQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ25ELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM1QjtJQUNELE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUFjLElBQUksY0FBYyxDQUFDLENBQUM7SUFDbEYsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0IsTUFBTSxFQUFFLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQztJQUU3QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVyQyxJQUFJLGNBQWMsS0FBSyxjQUFjLEVBQUU7UUFDckMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLEVBQUU7WUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFO2dCQUMvQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3pCO1FBQ0Qsd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDaEMsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQztZQUN6QyxLQUFLLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQUMsQ0FBQyxDQUFDO0tBQ3JFO0lBRUQsSUFBSSxnQkFBZ0IsR0FBRyxJQUFBLFdBQUksRUFBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsb0ZBQW9GO1NBQ2hKLElBQUksQ0FDSCxJQUFBLGVBQUcsRUFBQyxJQUFJLENBQUMsRUFBRTtRQUNULE1BQU0sR0FBRyxHQUFHLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLG1CQUFvQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQztRQUNuRixJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUU7WUFDZixHQUFHLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxJQUFJLDRCQUE0QixLQUFLLDZCQUE2QixDQUFDLENBQUM7U0FDaEg7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQyxFQUNGLElBQUEsa0JBQU0sRUFBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FDM0IsQ0FBQztJQUVGLElBQUksT0FBTyxLQUFLLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUNuQyxNQUFNLFFBQVEsR0FBRyxRQUFRLEVBQUUsQ0FBQyxVQUFVLElBQUksUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDO1FBQ25FLElBQUksUUFBUSxFQUFFO1lBQ1osVUFBVSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDL0I7S0FDRjtJQUVELE9BQU8sSUFBQSxZQUFLLEVBQ1YsZ0JBQWdCLENBQUMsSUFBSSxDQUNuQixJQUFBLG9DQUFvQixFQUFDLFVBQVUsQ0FBQyxDQUNqQyxFQUNELHFCQUFxQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FDOUMsQ0FBQztBQUNKLENBQUM7QUFFRCxLQUFLLFVBQVUscUJBQXFCLENBQUMsUUFBZ0IsRUFBRSxVQUF1QjtJQUM1RSxNQUFNLEtBQUssR0FBb0IsRUFBRSxDQUFDO0lBQ2xDLE1BQU0sS0FBSyxHQUFHLElBQUEsNkJBQWtCLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFO1FBRWhELE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDNUIsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsOEJBQThCLElBQUksRUFBRSxDQUFDLENBQUM7WUFDL0MsS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ3RDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLEtBQUssQ0FBQztJQUNaLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0IsRUFBRSxXQUFXLEdBQUcsS0FBSztJQUN2RSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQUUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUF3QixDQUFDO0lBQ3BGLE9BQU8seUJBQXlCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBSEQsOENBR0M7QUFDRDs7OztHQUlHO0FBQ0gsUUFBUSxDQUFDLENBQUMsOEJBQThCLENBQUMsS0FBb0IsRUFBRSxZQUFvQjtJQUNqRixNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBRSxDQUFDLGlCQUFpQixDQUFDO0lBQ2hGLDZGQUE2RjtJQUM3Rix5RUFBeUU7SUFDekUsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsRUFBRTtRQUN0RixJQUFJLElBQUksSUFBSSxJQUFJO1lBQ2QsU0FBUztRQUNYLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLFlBQVksRUFBRTtnQkFDdkQsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQzVGLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDN0IsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQzFCLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FDL0UsQ0FBQztvQkFDRixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO3dCQUMvQixNQUFNLEVBQUUsQ0FBQztxQkFDVjtpQkFDRjthQUNGO1NBQ0Y7S0FDRjtBQUNILENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLFVBQWtCLEVBQUUsSUFBeUIsRUFBRSxXQUFXLEdBQUcsS0FBSztJQUNuRyxNQUFNLENBQUMsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxNQUFNLE1BQU0sR0FBZ0I7UUFDMUIsU0FBUyxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUM7UUFDaEIsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1FBQ2YsS0FBSyxFQUFFLENBQUUsQ0FBQyxDQUFDLENBQUM7UUFDWixJQUFJLEVBQUUsY0FBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQztRQUMxQyxJQUFJO1FBQ0osUUFBUSxFQUFFLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNuRCxXQUFXO0tBQ1osQ0FBQztJQUNGLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxTQUFTLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBVTtJQUNsQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDeEIsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQixFQUFFLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25CO0lBQ0Qsa0JBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLDBCQUEwQjtJQUMxQixJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ25CLEVBQUUsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsaUJBQWlCOztRQUUzQyxFQUFFLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzNDLHNDQUFzQztJQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLElBQVksRUFBRSxFQUFVO0lBQ2pELElBQUksQ0FBQyxZQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FBQyxZQUFvQjtJQUN4RCxNQUFNLE9BQU8sR0FBRyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBRSxDQUFDO0lBQ3pELE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQztJQUMzQixPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEVBQUUsRUFBRTtRQUNqRixNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pFLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2FBQzVCLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDMUIsc0NBQXNDO2dCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsc0NBQXNDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQzNHLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbmZvcnR1bmF0ZWx5LCB0aGlzIGZpbGUgaXMgdmVyeSBsb25nLCB5b3UgbmVlZCB0byBmb2xkIGJ5IGluZGVudGlvbiBmb3IgYmV0dGVyIHZpZXcgb2Ygc291cmNlIGNvZGUgaW4gRWRpdG9yXG4gKi9cblxuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgRU9MIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmc2V4dCBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtmcm9tLCBtZXJnZSwgT2JzZXJ2YWJsZSwgb2YsIGRlZmVyLCB0aHJvd0Vycm9yLCBFTVBUWX0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIGRlYm91bmNlVGltZSwgdGFrZVdoaWxlLFxuICB0YWtlLCBjb25jYXRNYXAsIGlnbm9yZUVsZW1lbnRzLCBzY2FuLCBjYXRjaEVycm9yLCB0YXAsIGZpbmFsaXplIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBsaXN0Q29tcERlcGVuZGVuY3ksIFBhY2thZ2VKc29uSW50ZXJmLCBEZXBlbmRlbnRJbmZvIH0gZnJvbSAnLi4vdHJhbnNpdGl2ZS1kZXAtaG9pc3Rlcic7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IHNldFByb2plY3RMaXN0LCBzZXRMaW5rUGF0dGVybnN9IGZyb20gJy4uL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHtpc0FjdGlvbk9mQ3JlYXRvciwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvaGVscGVyJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQgeyBwbGlua0VudiB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLW1ncicpO1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2NvcGU6IHN0cmluZztcbiAgc2hvcnROYW1lOiBzdHJpbmc7XG4gIGpzb246IHtcbiAgICBwbGluaz86IFBsaW5rSnNvblR5cGU7XG4gICAgZHI/OiBQbGlua0pzb25UeXBlO1xuICAgIFtwOiBzdHJpbmddOiBhbnk7XG4gIH0gJiBQYWNrYWdlSnNvbkludGVyZjtcbiAgLyoqIEJlIGF3YXJlOiBJZiB0aGlzIHByb3BlcnR5IGlzIG5vdCBzYW1lIGFzIFwicmVhbFBhdGhcIixcbiAgICogdGhlbiBpdCBpcyBhIHN5bWxpbmsgd2hvc2UgcGF0aCBpcyByZWxhdGl2ZSB0byB3b3Jrc3BhY2UgZGlyZWN0b3J5ICovXG4gIHBhdGg6IHN0cmluZztcbiAgcmVhbFBhdGg6IHN0cmluZztcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFBsaW5rSnNvblR5cGUgPSB7XG4gIHR5cGVSb290Pzogc3RyaW5nO1xuICB0eXBlPzogJ3NlcnZlcicgfCBzdHJpbmdbXSB8IHN0cmluZztcbiAgc2VydmVyUHJpb3JpdHk/OiBzdHJpbmcgfCBudW1iZXI7XG4gIHNlcnZlckVudHJ5Pzogc3RyaW5nO1xuICBzZXR0aW5nPzoge1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPHBhdGg+IzxleHBvcnQtbmFtZT5cIiAqL1xuICAgIHR5cGU6IHN0cmluZztcbiAgICAvKiogSW4gZm9ybSBvZiBcIjxtb2R1bGUtcGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdmFsdWU6IHN0cmluZztcbiAgfTtcbiAgW3A6IHN0cmluZ106IGFueTtcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIG5wbUluc3RhbGxPcHQ6IE5wbU9wdGlvbnM7XG4gIGluaXRlZDogYm9vbGVhbjtcbiAgc3JjUGFja2FnZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLyoqIEtleSBpcyByZWxhdGl2ZSBwYXRoIHRvIHJvb3Qgd29ya3NwYWNlICovXG4gIHdvcmtzcGFjZXM6IE1hcDxzdHJpbmcsIFdvcmtzcGFjZVN0YXRlPjtcbiAgLyoqIGtleSBvZiBjdXJyZW50IFwid29ya3NwYWNlc1wiICovXG4gIGN1cnJXb3Jrc3BhY2U/OiBzdHJpbmcgfCBudWxsO1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIHNyY0RpcjJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAvKiogRHJjcCBpcyB0aGUgb3JpZ2luYWwgbmFtZSBvZiBQbGluayBwcm9qZWN0ICovXG4gIGxpbmtlZERyY3A/OiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGxpbmtlZERyY3BQcm9qZWN0Pzogc3RyaW5nIHwgbnVsbDtcbiAgaW5zdGFsbGVkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgZ2l0SWdub3Jlczoge1tmaWxlOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIGlzSW5DaGluYT86IGJvb2xlYW47XG4gIC8qKiBFdmVyeXRpbWUgYSBob2lzdCB3b3Jrc3BhY2Ugc3RhdGUgY2FsY3VsYXRpb24gaXMgYmFzaWNhbGx5IGRvbmUsIGl0IGlzIGluY3JlYXNlZCBieSAxICovXG4gIHdvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG4gIHBhY2thZ2VzVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgLyoqIHdvcmtzcGFjZSBrZXkgKi9cbiAgbGFzdENyZWF0ZWRXb3Jrc3BhY2U/OiBzdHJpbmc7XG59XG5cbmNvbnN0IHtkaXN0RGlyLCByb290RGlyLCBwbGlua0RpciwgaXNEcmNwU3ltbGluaywgc3ltbGlua0Rpck5hbWV9ID0gcGxpbmtFbnY7XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgaW5pdGVkOiBmYWxzZSxcbiAgd29ya3NwYWNlczogbmV3IE1hcCgpLFxuICBwcm9qZWN0MlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY0RpcjJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNQYWNrYWdlczogbmV3IE1hcCgpLFxuICBnaXRJZ25vcmVzOiB7fSxcbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IDAsXG4gIHBhY2thZ2VzVXBkYXRlQ2hlY2tzdW06IDAsXG4gIG5wbUluc3RhbGxPcHQ6IHtpc0ZvcmNlOiBmYWxzZX1cbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBpZDogc3RyaW5nO1xuICBvcmlnaW5JbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIG9yaWdpbkluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgaW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgLyoqIG5hbWVzIG9mIHRob3NlIGxpbmtlZCBzb3VyY2UgcGFja2FnZXMgKi9cbiAgbGlua2VkRGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBsaW5rZWQgc291cmNlIHBhY2thZ2VzICovXG4gIGxpbmtlZERldkRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuXG4gIC8qKiBpbnN0YWxsZWQgUGxpbmsgY29tcG9uZW50IHBhY2thZ2VzIFtuYW1lLCB2ZXJzaW9uXSovXG4gIGluc3RhbGxlZENvbXBvbmVudHM/OiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG5cbiAgaG9pc3RJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3RQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3REZXZJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3REZXZQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3RJbmZvU3VtbWFyeT86IHtcbiAgICAvKiogVXNlciBzaG91bGQgbWFudWxseSBhZGQgdGhlbSBhcyBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlICovXG4gICAgbWlzc2luZ0RlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgICAvKiogVXNlciBzaG91bGQgbWFudWxseSBhZGQgdGhlbSBhcyBkZXZEZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlICovXG4gICAgbWlzc2luZ0RldkRlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgICAvKiogdmVyc2lvbnMgYXJlIGNvbmZsaWN0ICovXG4gICAgY29uZmxpY3REZXBzOiBzdHJpbmdbXTtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOcG1PcHRpb25zIHtcbiAgdXNlWWFybj86IGJvb2xlYW47XG4gIGNhY2hlPzogc3RyaW5nO1xuICBpc0ZvcmNlOiBib29sZWFuO1xuICB1c2VOcG1DaT86IGJvb2xlYW47XG4gIHBydW5lPzogYm9vbGVhbjtcbiAgZGVkdXBlPzogYm9vbGVhbjtcbiAgb2ZmbGluZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6IE5TLFxuICBpbml0aWFsU3RhdGU6IHN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIC8qKiBEbyB0aGlzIGFjdGlvbiBhZnRlciBhbnkgbGlua2VkIHBhY2thZ2UgaXMgcmVtb3ZlZCBvciBhZGRlZCAgKi9cbiAgICBpbml0Um9vdERpcihkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248TnBtT3B0aW9ucz4pIHtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC5jYWNoZSA9IHBheWxvYWQuY2FjaGU7XG4gICAgICBkLm5wbUluc3RhbGxPcHQudXNlTnBtQ2kgPSBwYXlsb2FkLnVzZU5wbUNpO1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LnVzZVlhcm4gPSBwYXlsb2FkLnVzZVlhcm47XG4gICAgfSxcblxuICAgIC8qKiBcbiAgICAgKiAtIENyZWF0ZSBpbml0aWFsIGZpbGVzIGluIHJvb3QgZGlyZWN0b3J5XG4gICAgICogLSBTY2FuIGxpbmtlZCBwYWNrYWdlcyBhbmQgaW5zdGFsbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3lcbiAgICAgKiAtIFN3aXRjaCB0byBkaWZmZXJlbnQgd29ya3NwYWNlXG4gICAgICogLSBEZWxldGUgbm9uZXhpc3Rpbmcgd29ya3NwYWNlXG4gICAgICogLSBJZiBcInBhY2thZ2VKc29uRmlsZXNcIiBpcyBwcm92aWRlZCwgaXQgc2hvdWxkIHNraXAgc3RlcCBvZiBzY2FubmluZyBsaW5rZWQgcGFja2FnZXNcbiAgICAgKiAtIFRPRE86IGlmIHRoZXJlIGlzIGxpbmtlZCBwYWNrYWdlIHVzZWQgaW4gbW9yZSB0aGFuIG9uZSB3b3Jrc3BhY2UsIGhvaXN0IGFuZCBpbnN0YWxsIGZvciB0aGVtIGFsbD9cbiAgICAgKi9cbiAgICB1cGRhdGVXb3Jrc3BhY2UoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtcbiAgICAgIGRpcjogc3RyaW5nO1xuICAgICAgLy8gY3JlYXRlSG9vazogYm9vbGVhbjtcbiAgICAgIHBhY2thZ2VKc29uRmlsZXM/OiBzdHJpbmdbXTtcbiAgICB9ICYgTnBtT3B0aW9ucz4pIHtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC5jYWNoZSA9IHBheWxvYWQuY2FjaGU7XG4gICAgICBkLm5wbUluc3RhbGxPcHQudXNlWWFybiA9IHBheWxvYWQudXNlWWFybjtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VOcG1DaSA9IHBheWxvYWQudXNlTnBtQ2k7XG4gICAgfSxcbiAgICBzY2FuQW5kU3luY1BhY2thZ2VzKGQ6IFBhY2thZ2VzU3RhdGUsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7cGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHtcbiAgICB9LFxuXG4gICAgdXBkYXRlRGlyKCkge30sXG4gICAgX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oZCkge1xuICAgICAgY29uc3QgcGxpbmtQa2cgPSBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUocGxpbmtEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IG51bGw7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBwYXRoVG9Qcm9qS2V5KFBhdGguZGlybmFtZShkLmxpbmtlZERyY3AucmVhbFBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQubGlua2VkRHJjcCA9IG51bGw7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IHBsaW5rUGtnO1xuICAgICAgICBkLmxpbmtlZERyY3BQcm9qZWN0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFtwa2dzOiBQYWNrYWdlSW5mb1tdLCBvcGVyYXRvcjogJ3VwZGF0ZScgfCAnY2xlYW4nXT4pIHtcbiAgICAgIGQuaW5pdGVkID0gdHJ1ZTtcbiAgICAgIGxldCBtYXAgPSBkLnNyY1BhY2thZ2VzO1xuICAgICAgaWYgKHBheWxvYWRbMV0gPT09ICdjbGVhbicpIHtcbiAgICAgICAgbWFwID0gZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4oKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWRbMF0pIHtcbiAgICAgICAgbWFwLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBhZGRTcmNEaXJzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnNyY0RpcjJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlU3JjRGlycyhkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLyoqIHBheWxvYWQ6IHdvcmtzcGFjZSBrZXlzLCBoYXBwZW5zIGFzIGRlYm91bmNlZCB3b3Jrc3BhY2UgY2hhbmdlIGV2ZW50ICovXG4gICAgX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICAvKiogd29ya3NwYWNlQ2hhbmdlZCBpcyBzYWZlIGZvciBleHRlcm5hbCBtb2R1bGUgdG8gd2F0Y2gsIGl0IHNlcmlhbGl6ZSBhY3Rpb25zIGxpa2UgXCJfaW5zdGFsbFdvcmtzcGFjZVwiIGFuZCBcIl93b3Jrc3BhY2VCYXRjaENoYW5nZWRcIiAqL1xuICAgIHdvcmtzcGFjZUNoYW5nZWQoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdXBkYXRlR2l0SWdub3JlcyhkLCB7cGF5bG9hZDoge2ZpbGUsIGxpbmVzfX06IFBheWxvYWRBY3Rpb248e2ZpbGU6IHN0cmluZzsgbGluZXM6IHN0cmluZ1tdfT4pIHtcbiAgICAgIGxldCByZWwgPSBmaWxlLCBhYnMgPSBmaWxlO1xuICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShmaWxlKSkge1xuICAgICAgICByZWwgPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgYWJzID0gZmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFicyA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBmaWxlKTtcbiAgICAgIH1cbiAgICAgIGlmIChkLmdpdElnbm9yZXNbYWJzXSkge1xuICAgICAgICBkZWxldGUgZC5naXRJZ25vcmVzW2Fic107XG4gICAgICB9XG4gICAgICBkLmdpdElnbm9yZXNbcmVsXSA9IGxpbmVzLm1hcChsaW5lID0+IGxpbmUuc3RhcnRzV2l0aCgnLycpID8gbGluZSA6ICcvJyArIGxpbmUpO1xuICAgIH0sXG4gICAgcGFja2FnZXNVcGRhdGVkKGQpIHtcbiAgICAgIGQucGFja2FnZXNVcGRhdGVDaGVja3N1bSsrO1xuICAgIH0sXG4gICAgc2V0SW5DaGluYShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Ym9vbGVhbj4pIHtcbiAgICAgIGQuaXNJbkNoaW5hID0gcGF5bG9hZDtcbiAgICB9LFxuICAgIF9zZXRDdXJyZW50V29ya3NwYWNlKGQsIHtwYXlsb2FkOiBkaXJ9OiBQYXlsb2FkQWN0aW9uPHN0cmluZyB8IG51bGw+KSB7XG4gICAgICBpZiAoZGlyICE9IG51bGwpXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgZWxzZVxuICAgICAgICBkLmN1cnJXb3Jrc3BhY2UgPSBudWxsO1xuICAgIH0sXG4gICAgLyoqIHBhcmFtdGVyOiB3b3Jrc3BhY2Uga2V5ICovXG4gICAgd29ya3NwYWNlU3RhdGVVcGRhdGVkKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7XG4gICAgICBkLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtICs9IDE7XG4gICAgfSxcbiAgICAvLyBvbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKGQsIHtwYXlsb2FkOiB3b3Jrc3BhY2VLZXl9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHt9LFxuICAgIF9ob2lzdFdvcmtzcGFjZURlcHMoc3RhdGUsIHtwYXlsb2FkOiB7ZGlyfX06IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nfT4pIHtcbiAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCJzcmNQYWNrYWdlc1wiIGlzIG51bGwsIG5lZWQgdG8gcnVuIGBpbml0YCBjb21tYW5kIGZpcnN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBwa2pzb25TdHI6IHN0cmluZztcbiAgICAgIGNvbnN0IHBrZ2pzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oJ1BsaW5rIGluaXQvc3luYyBwcm9jZXNzIHdhcyBpbnRlcnJ1cHRlZCBsYXN0IHRpbWUsIHJlY292ZXIgY29udGVudCBvZiAnICsgcGtnanNvbkZpbGUpO1xuICAgICAgICBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMobG9ja0ZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGZzLnVubGlua1N5bmMobG9ja0ZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHBrZ2pzb25GaWxlLCAndXRmOCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtqc29uID0gSlNPTi5wYXJzZShwa2pzb25TdHIpIGFzIFBhY2thZ2VKc29uSW50ZXJmO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXBzIG9mIFtwa2pzb24uZGVwZW5kZW5jaWVzLCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXSBhcyB7W25hbWU6IHN0cmluZ106IHN0cmluZ31bXSApIHtcbiAgICAgIC8vICAgT2JqZWN0LmVudHJpZXMoZGVwcyk7XG4gICAgICAvLyB9XG4gICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9KTtcblxuICAgICAgLy8gY29uc3QgdXBkYXRpbmdEZXBzID0gey4uLnBranNvbi5kZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGVwZW5kZW5jaWVzOiB0eXBlb2YgZGVwcyA9IFtdO1xuICAgICAgZGVwcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGV2RGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgICAvLyBjb25zdCB1cGRhdGluZ0RldkRlcHMgPSB7Li4ucGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXZEZXBzID0gW107XG4gICAgICBkZXZEZXBzLmZvckVhY2goZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBjb25zdCB7aG9pc3RlZDogaG9pc3RlZERlcHMsIGhvaXN0ZWRQZWVyczogaG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3RlZERldjogaG9pc3RlZERldkRlcHMsIGhvaXN0ZWREZXZQZWVyczogZGV2SG9pc3RQZWVyRGVwSW5mb1xuICAgICAgfSA9XG4gICAgICAgIGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgICBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXksIHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30sIHBranNvbi5kZXZEZXBlbmRlbmNpZXNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHtcbiAgICAgICAgLi4ucGtqc29uLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IEFycmF5LmZyb20oaG9pc3RlZERlcHMuZW50cmllcygpKVxuICAgICAgICAuY29uY2F0KEFycmF5LmZyb20oaG9pc3RQZWVyRGVwSW5mby5lbnRyaWVzKCkpLmZpbHRlcihpdGVtID0+ICFpdGVtWzFdLm1pc3NpbmcpKVxuICAgICAgICAuZmlsdGVyKChbbmFtZV0pID0+ICFpc0RyY3BTeW1saW5rIHx8IG5hbWUgIT09ICdAd2ZoL3BsaW5rJylcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSksXG5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXZEZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGRldkhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLmZpbHRlcigoW25hbWVdKSA9PiAhaXNEcmNwU3ltbGluayB8fCBuYW1lICE9PSAnQHdmaC9wbGluaycpXG4gICAgICAgIC5yZWR1Y2UoKGRpYywgW25hbWUsIGluZm9dKSA9PiB7XG4gICAgICAgICAgZGljW25hbWVdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgcmV0dXJuIGRpYztcbiAgICAgICAgfSwge30gYXMge1trZXk6IHN0cmluZ106IHN0cmluZ30pXG4gICAgICB9O1xuXG4gICAgICAvLyBsb2cud2FybihpbnN0YWxsSnNvbik7XG4gICAgICAvLyBjb25zdCBpbnN0YWxsZWRDb21wID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKHN0YXRlLndvcmtzcGFjZXMsIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSk7XG5cbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gc3RhdGUud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuXG4gICAgICBjb25zdCBob2lzdEluZm9TdW1tYXJ5OiBXb3Jrc3BhY2VTdGF0ZVsnaG9pc3RJbmZvU3VtbWFyeSddID0ge1xuICAgICAgICBjb25mbGljdERlcHM6IFtdLCBtaXNzaW5nRGVwczoge30sIG1pc3NpbmdEZXZEZXBzOiB7fVxuICAgICAgfTtcblxuICAgICAgZm9yIChjb25zdCBkZXBzSW5mbyBvZiBbaG9pc3RlZERlcHMsIGhvaXN0UGVlckRlcEluZm9dKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2RlcCwgaW5mb10gb2YgZGVwc0luZm8uZW50cmllcygpKSB7XG4gICAgICAgICAgaWYgKGluZm8ubWlzc2luZykge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5taXNzaW5nRGVwc1tkZXBdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaW5mby5zYW1lVmVyICYmICFpbmZvLmRpcmVjdCkge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5jb25mbGljdERlcHMucHVzaChkZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkZXBzSW5mbyBvZiBbaG9pc3RlZERldkRlcHMsIGRldkhvaXN0UGVlckRlcEluZm9dKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2RlcCwgaW5mb10gb2YgZGVwc0luZm8uZW50cmllcygpKSB7XG4gICAgICAgICAgaWYgKGluZm8ubWlzc2luZykge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5taXNzaW5nRGV2RGVwc1tkZXBdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaW5mby5zYW1lVmVyICYmICFpbmZvLmRpcmVjdCkge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5jb25mbGljdERlcHMucHVzaChkZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB3cDogV29ya3NwYWNlU3RhdGUgPSB7XG4gICAgICAgIGlkOiB3c0tleSxcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb246IHBranNvbixcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHBranNvblN0cixcbiAgICAgICAgaW5zdGFsbEpzb24sXG4gICAgICAgIGluc3RhbGxKc29uU3RyOiBKU09OLnN0cmluZ2lmeShpbnN0YWxsSnNvbiwgbnVsbCwgJyAgJyksXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcyxcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLFxuICAgICAgICBob2lzdEluZm86IGhvaXN0ZWREZXBzLFxuICAgICAgICBob2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdERldkluZm86IGhvaXN0ZWREZXZEZXBzLFxuICAgICAgICBob2lzdERldlBlZXJEZXBJbmZvOiBkZXZIb2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdEluZm9TdW1tYXJ5XG4gICAgICB9O1xuICAgICAgc3RhdGUubGFzdENyZWF0ZWRXb3Jrc3BhY2UgPSB3c0tleTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXMuc2V0KHdzS2V5LCBleGlzdGluZyA/IE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHdwKSA6IHdwKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKGQsIHtwYXlsb2FkOiB7d29ya3NwYWNlS2V5fX06IFBheWxvYWRBY3Rpb248e3dvcmtzcGFjZUtleTogc3RyaW5nfT4pIHt9LFxuICAgIC8vIF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1ByaihkLCB7cGF5bG9hZDoge3ByaiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwcmo6IHN0cmluZzsgcGtnczoge25hbWU6IHN0cmluZ31bXX0+KSB7XG4gICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocHJqKSwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoZCxcbiAgICAgIHtwYXlsb2FkOiB7cGF0dGVybiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwYXR0ZXJuOiBzdHJpbmc7IHBrZ3M6IHtuYW1lOiBzdHJpbmd9W119Pikge1xuICAgICAgZC5zcmNEaXIyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocGF0dGVybiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfSxcbiAgICBfY2xlYXJQcm9qQW5kU3JjRGlyUGtncyhkKSB7XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBkLnByb2plY3QyUGFja2FnZXMua2V5cygpKSB7XG4gICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoa2V5LCBbXSk7XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBkLnNyY0RpcjJQYWNrYWdlcy5rZXlzKCkpIHtcbiAgICAgICAgZC5zcmNEaXIyUGFja2FnZXMuc2V0KGtleSwgW10pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5leHBvcnQgY29uc3Qge3VwZGF0ZUdpdElnbm9yZXMsIG9uTGlua2VkUGFja2FnZUFkZGVkfSA9IGFjdGlvbkRpc3BhdGNoZXI7XG5cbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIGNvbnN0IHVwZGF0ZWRXb3Jrc3BhY2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZUFkZGVkTGlzdCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG5cbiAgY29uc3QgZ2l0SWdub3JlRmlsZXNXYWl0aW5nID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKGdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzID09IG51bGwpIHtcbiAgICAvLyBCZWNhdXNlIHNyY0RpcjJQYWNrYWdlcyBpcyBuZXdseSBhZGRlZCwgdG8gYXZvaWQgZXhpc3RpbmcgcHJvamVjdFxuICAgIC8vIGJlaW5nIGJyb2tlbiBmb3IgbWlzc2luZyBpdCBpbiBwcmV2aW91c2x5IHN0b3JlZCBzdGF0ZSBmaWxlXG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5zcmNEaXIyUGFja2FnZXMgPSBuZXcgTWFwKCkpO1xuICB9XG4gIGNvbnN0IGFjdGlvbkJ5VHlwZXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgLy8gVG8gb3ZlcnJpZGUgc3RvcmVkIHN0YXRlLiBcbiAgICAvLyBEbyBub3QgcHV0IGZvbGxvd2luZyBsb2dpYyBpbiBpbml0aWFsU3RhdGUhIEl0IHdpbGwgYmUgb3ZlcnJpZGRlbiBieSBwcmV2aW91c2x5IHNhdmVkIHN0YXRlXG5cbiAgICBkZWZlcigoKSA9PiB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSk7XG4gICAgICByZXR1cm4gRU1QVFk7XG4gICAgfSksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHBrcyA9PiB7XG4gICAgICAgIHNldFByb2plY3RMaXN0KGdldFByb2plY3RMaXN0KCkpO1xuICAgICAgICByZXR1cm4gcGtzO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY0RpcjJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZmlsdGVyKHYgPT4gdiAhPSBudWxsKSxcbiAgICAgIG1hcCgobGlua1BhdHRlcm5NYXApID0+IHtcbiAgICAgICAgc2V0TGlua1BhdHRlcm5zKGxpbmtQYXR0ZXJuTWFwLmtleXMoKSk7XG4gICAgICB9KSksXG5cbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2NhbjxQYWNrYWdlc1N0YXRlWydzcmNQYWNrYWdlcyddPigocHJldk1hcCwgY3Vyck1hcCkgPT4ge1xuICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnNwbGljZSgwKTtcbiAgICAgICAgZm9yIChjb25zdCBubSBvZiBjdXJyTWFwLmtleXMoKSkge1xuICAgICAgICAgIGlmICghcHJldk1hcC5oYXMobm0pKSB7XG4gICAgICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnB1c2gobm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocGFja2FnZUFkZGVkTGlzdC5sZW5ndGggPiAwKVxuICAgICAgICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKHBhY2thZ2VBZGRlZExpc3QpO1xuICAgICAgICByZXR1cm4gY3Vyck1hcDtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uQnlUeXBlcy51cGRhdGVXb3Jrc3BhY2UucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWQ6IHtkaXIsIGlzRm9yY2UsIHVzZU5wbUNpLCBwYWNrYWdlSnNvbkZpbGVzfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UoZGlyKTtcbiAgICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgUGF0aC5yZXNvbHZlKGRpciwgJ2FwcC5qcycpKTtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkgfHwgaXNGb3JjZSB8fCB1c2VOcG1DaSkge1xuICAgICAgICAgIC8vIENoYW5pbmcgaW5zdGFsbEpzb25TdHIgdG8gZm9yY2UgYWN0aW9uIF9pbnN0YWxsV29ya3NwYWNlIGJlaW5nIGRpc3BhdGNoZWQgbGF0ZXJcbiAgICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICAvLyBjbGVhbiB0byB0cmlnZ2VyIGluc3RhbGwgYWN0aW9uXG4gICAgICAgICAgICAgIGNvbnN0IHdzID0gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgd3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZpbmcgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHBhY2thZ2VKc29uRmlsZXMgIT0gbnVsbCA/IHNjYW5BbmRTeW5jUGFja2FnZXMocGFja2FnZUpzb25GaWxlcykgOlxuICAgICAgICAgICAgZGVmZXIoKCkgPT4gb2YoaW5pdFJvb3REaXJlY3RvcnkoKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb25CeVR5cGVzLnNjYW5BbmRTeW5jUGFja2FnZXMucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICBzY2FuQW5kU3luY1BhY2thZ2VzKHBheWxvYWQucGFja2FnZUpzb25GaWxlcyksXG4gICAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX3N5bmNMaW5rZWRQYWNrYWdlcyksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY3VycldzID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAod3NLZXkgIT09IGN1cnJXcylcbiAgICAgICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyOiBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXkpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGN1cnJXcyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIFwiY3VycmVudCB3b3Jrc3BhY2VcIiBpcyB0aGUgbGFzdCBvbmUgYmVpbmcgdXBkYXRlZCwgc28gdGhhdCBpdCByZW1haW5zIFwiY3VycmVudFwiXG4gICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCBjdXJyV3MpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb25CeVR5cGVzLmluaXRSb290RGlyLnBpcGUoXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBsaW5rRW52LndvcmtEaXIsXG4gICAgICAgICAgICAuLi5wYXlsb2FkfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY3VyciA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgICAgICBpZiAoY3VyciAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyhjdXJyKSkge1xuICAgICAgICAgICAgICBjb25zdCBwYXRoID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnIpO1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwYXRoLCAuLi5wYXlsb2FkfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuXG4gICAgYWN0aW9uQnlUeXBlcy5faG9pc3RXb3Jrc3BhY2VEZXBzLnBpcGUoXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gICAgICAgIC8vIGFjdGlvbkRpc3BhdGNoZXIub25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG4gICAgICAgIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod3NLZXkpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQod3NLZXkpKTtcbiAgICAgIH0pXG4gICAgKSxcblxuICAgIGFjdGlvbkJ5VHlwZXMudXBkYXRlRGlyLnBpcGUoXG4gICAgICB0YXAoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGxpbmtQYWNrYWdlSW5mbygpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpLFxuICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uoa2V5KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIC8vIEhhbmRsZSBuZXdseSBhZGRlZCB3b3Jrc3BhY2VcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAod3MgPT4ge1xuICAgICAgICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbSh3cy5rZXlzKCkpO1xuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0pLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGxvZy5pbmZvKCdOZXcgd29ya3NwYWNlOiAnLCBuZXdBZGRlZCk7XG4gICAgICAgICAgZm9yIChjb25zdCB3cyBvZiBuZXdBZGRlZCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiB3c30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBvYnNlcnZlIGFsbCBleGlzdGluZyBXb3Jrc3BhY2VzIGZvciBkZXBlbmRlbmN5IGhvaXN0aW5nIHJlc3VsdCBcbiAgICAuLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgLy8gZmlsdGVyKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgdGFrZVdoaWxlKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpISksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLmluc3RhbGxKc29uID09PSBzMi5pbnN0YWxsSnNvbiksXG4gICAgICAgIHNjYW48V29ya3NwYWNlU3RhdGU+KChvbGQsIG5ld1dzKSA9PiB7XG4gICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuICAgICAgICAgIGNvbnN0IG5ld0RlcHMgPSBPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gZm9yY2luZyBpbnN0YWxsIHdvcmtzcGFjZSwgdGhlcmVmb3JlIGRlcGVuZGVuY2llcyBpcyBjbGVhcmVkIGF0IHRoaXMgbW9tZW50XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG9sZERlcHMgPSBPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG5cbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggIT09IG9sZERlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoJ25ld0RlcHMubGVuZ3RoJywgbmV3RGVwcy5sZW5ndGgsICcgIT09IG9sZERlcHMubGVuZ3RoJywgb2xkRGVwcy5sZW5ndGgpO1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RGVwcy5zb3J0KCk7XG4gICAgICAgICAgb2xkRGVwcy5zb3J0KCk7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuZXdEZXBzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5ld0RlcHNbaV0gIT09IG9sZERlcHNbaV0pIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSksXG4gICAgLy8gX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZCB3aWxsIHRyaWdnZXIgY3JlYXRpbmcgc3ltbGlua3MsIGJ1dCBtZWFud2hpbGUgX2luc3RhbGxXb3Jrc3BhY2Ugd2lsbCBkZWxldGUgc3ltbGlua3NcbiAgICAvLyBJIGRvbid0IHdhbnQgdG8gc2VlbSB0aGVtIHJ1bm5pbmcgc2ltdWx0YW5lb3VzbHkuXG4gICAgbWVyZ2UoYWN0aW9uQnlUeXBlcy5fd29ya3NwYWNlQmF0Y2hDaGFuZ2VkLCBhY3Rpb25CeVR5cGVzLl9pbnN0YWxsV29ya3NwYWNlKS5waXBlKFxuICAgICAgY29uY2F0TWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChpc0FjdGlvbk9mQ3JlYXRvcihhY3Rpb24sIHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpKSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXkgPSBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXk7XG4gICAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3NLZXkpKSxcbiAgICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgY29uY2F0TWFwKHdzID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbGxXb3Jrc3BhY2Uod3MhLCBnZXRTdGF0ZSgpLm5wbUluc3RhbGxPcHQpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgICB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKHdzS2V5KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBY3Rpb25PZkNyZWF0b3IoYWN0aW9uLCBzbGljZS5hY3Rpb25zLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQpKSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXlzID0gYWN0aW9uLnBheWxvYWQ7XG4gICAgICAgICAgcmV0dXJuIG1lcmdlKC4uLndzS2V5cy5tYXAoX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKSkucGlwZShcbiAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlQ2hhbmdlZCh3c0tleXMpKVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gc29tZXRoaW5nIGlzIG5ld2x5IGluc3RhbGxlZCBvciBjaGFuZ2VkIGluIHdvcmtzcGFjZSBub2RlX21vZHVsZXNcbiAgICBhY3Rpb25CeVR5cGVzLndvcmtzcGFjZVN0YXRlVXBkYXRlZC5waXBlKFxuICAgICAgbWFwKGFjdGlvbiA9PiB1cGRhdGVkV29ya3NwYWNlU2V0LmFkZChhY3Rpb24ucGF5bG9hZCkpLFxuICAgICAgZGVib3VuY2VUaW1lKDgwMCksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQoQXJyYXkuZnJvbSh1cGRhdGVkV29ya3NwYWNlU2V0LnZhbHVlcygpKSk7XG4gICAgICAgIHVwZGF0ZWRXb3Jrc3BhY2VTZXQuY2xlYXIoKTtcbiAgICAgIH0pLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5wYWNrYWdlc1VwZGF0ZWQoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb25CeVR5cGVzLnVwZGF0ZUdpdElnbm9yZXMucGlwZShcbiAgICAgIHRhcChhY3Rpb24gPT4ge1xuICAgICAgICBsZXQgcmVsID0gYWN0aW9uLnBheWxvYWQuZmlsZTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShyZWwpKSB7XG4gICAgICAgICAgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCByZWwpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgfVxuICAgICAgICBnaXRJZ25vcmVGaWxlc1dhaXRpbmcuYWRkKHJlbCk7XG4gICAgICB9KSxcbiAgICAgIGRlYm91bmNlVGltZSg1MDApLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbmdlZEZpbGVzID0gWy4uLmdpdElnbm9yZUZpbGVzV2FpdGluZy52YWx1ZXMoKV07XG4gICAgICAgIGdpdElnbm9yZUZpbGVzV2FpdGluZy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZEZpbGVzO1xuICAgICAgfSksXG4gICAgICBjb25jYXRNYXAoKGNoYW5nZWRGaWxlcykgPT4ge1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uY2hhbmdlZEZpbGVzLm1hcChhc3luYyByZWwgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcmVsKTtcbiAgICAgICAgICBjb25zdCBsaW5lcyA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tmaWxlXTtcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmVzID0gZGF0YS5zcGxpdCgvXFxuXFxyPy8pLm1hcChsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xpbmVzID0gXy5kaWZmZXJlbmNlKGxpbmVzLCBleGlzdGluZ0xpbmVzKTtcbiAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlLCBkYXRhICsgRU9MICsgbmV3TGluZXMuam9pbihFT0wpLCAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdNb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkU3JjRGlycywgc2xpY2UuYWN0aW9ucy5kZWxldGVTcmNEaXJzKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyKTtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycik7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFBhY2thZ2VzU3RhdGU+IHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1Byb2pLZXkocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm9qS2V5VG9QYXRoKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLmlzQWJzb2x1dGUoa2V5KSA/IGtleSA6IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlRGlyKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdExpc3QoKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUocm9vdERpciwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBtZWFudCB0byB0cmlnZ2VyIGVkaXRvci1oZWxwZXIgdG8gdXBkYXRlIHRzY29uZmlnIGZpbGVzLCBzb1xuICogZWRpdG9yLWhlbHBlciBtdXN0IGJlIGltcG9ydCBhdCBmaXJzdFxuICogQHBhcmFtIGRpciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaEN1cnJlbnRXb3Jrc3BhY2UoZGlyOiBzdHJpbmcpIHtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICBhY3Rpb25EaXNwYXRjaGVyLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQoW3dvcmtzcGFjZUtleShkaXIpXSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBjb25zdCBwa2dFbnRyeSA9IHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShnZXRTdGF0ZSgpLCB3c0tleSk7XG5cbiAgY29uc3QgaW5zdGFsbGVkID0gbmV3IE1hcCgoZnVuY3Rpb24qKCk6IEdlbmVyYXRvcjxbc3RyaW5nLCBQYWNrYWdlSW5mb10+IHtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ0VudHJ5KSB7XG4gICAgICB5aWVsZCBbcGsubmFtZSwgcGtdO1xuICAgIH1cbiAgfSkoKSk7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5nZXQod3NLZXkpIS5pbnN0YWxsZWRDb21wb25lbnRzID0gaW5zdGFsbGVkKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQod3NLZXkpO1xufVxuXG4vKipcbiAqIERlbGV0ZSB3b3Jrc3BhY2Ugc3RhdGUgaWYgaXRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdFxuICovXG5mdW5jdGlvbiBjaGVja0FsbFdvcmtzcGFjZXMoKSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeSgpIHtcbiAgbG9nLmRlYnVnKCdpbml0Um9vdERpcmVjdG9yeScpO1xuICBjb25zdCByb290UGF0aCA9IHJvb3REaXI7XG4gIGZzZXh0Lm1rZGlycFN5bmMoZGlzdERpcik7XG4gIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvY29uZmlnLmxvY2FsLXRlbXBsYXRlLnlhbWwnKSwgUGF0aC5qb2luKGRpc3REaXIsICdjb25maWcubG9jYWwueWFtbCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9sb2c0anMuanMnKSwgcm9vdFBhdGggKyAnL2xvZzRqcy5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJyxcbiAgICAgICdnaXRpZ25vcmUudHh0JyksIHJvb3REaXIgKyAnLy5naXRpZ25vcmUnKTtcbiAgYXdhaXQgY2xlYW5JbnZhbGlkU3ltbGlua3MoKTtcbiAgYXdhaXQgc2NhbkFuZFN5bmNQYWNrYWdlcygpO1xuICAvLyBhd2FpdCBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKSwgbmV3IFNldDxzdHJpbmc+KCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSwgbnBtT3B0OiBOcG1PcHRpb25zKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3cy5pZCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5zdGFsbEluRGlyKGRpciwgbnBtT3B0LCB3cy5vcmlnaW5JbnN0YWxsSnNvblN0ciwgd3MuaW5zdGFsbEpzb25TdHIpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgIGNvbnN0IHdzZCA9IGQud29ya3NwYWNlcy5nZXQod3MuaWQpITtcbiAgICAgIHdzZC5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgd3NkLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgd3NkLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS1sb2NrLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJvYmxlbWF0aWMgJHtsb2NrRmlsZX0gaXMgZGVsZXRlZCwgcGxlYXNlIHRyeSBhZ2FpbmApO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEluRGlyKGRpcjogc3RyaW5nLCBucG1PcHQ6IE5wbU9wdGlvbnMsIG9yaWdpblBrZ0pzb25TdHI6IHN0cmluZywgdG9JbnN0YWxsUGtnSnNvblN0cjogc3RyaW5nKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdJbnN0YWxsIGRlcGVuZGVuY2llcyBpbiAnICsgZGlyKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBjb3B5TnBtcmNUb1dvcmtzcGFjZShkaXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlKTtcbiAgfVxuICBjb25zdCBzeW1saW5rc0luTW9kdWxlRGlyID0gW10gYXMge2NvbnRlbnQ6IHN0cmluZzsgbGluazogc3RyaW5nfVtdO1xuXG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICBmc2V4dC5ta2RpcnBTeW5jKHRhcmdldCk7XG4gIH1cblxuICAvLyBOUE0gdjcuMjAueCBjYW4gbm90IGluc3RhbGwgZGVwZW5kZW5jaWVzIGlmIHRoZXJlIGlzIGFueSBmaWxlIHdpdGggbmFtZSBwcmVmaXggJ18nIGV4aXN0cyBpbiBkaXJlY3Rvcnkgbm9kZV9tb2R1bGVzXG4gIGNvbnN0IGxlZ2FjeVBrZ1NldHRpbmdGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycsICdfcGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGxlZ2FjeVBrZ1NldHRpbmdGaWxlKSkge1xuICAgIGZzLnVubGlua1N5bmMobGVnYWN5UGtnU2V0dGluZ0ZpbGUpO1xuICB9XG5cbiAgLy8gMS4gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3ModGFyZ2V0LCBsaW5rID0+IHtcbiAgICBsb2cuZGVidWcoJ1JlbW92ZSBzeW1saW5rJywgbGluayk7XG4gICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgfSk7XG4gIC8vIDIuIFJ1biBgbnBtIGluc3RhbGxgXG4gIGNvbnN0IGluc3RhbGxKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ3dyaXRlJywgaW5zdGFsbEpzb25GaWxlKTtcbiAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIHRvSW5zdGFsbFBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gIC8vIHNhdmUgYSBsb2NrIGZpbGUgdG8gaW5kaWNhdGUgaW4tcHJvY2VzcyBvZiBpbnN0YWxsaW5nLCBvbmNlIGluc3RhbGxhdGlvbiBpcyBjb21wbGV0ZWQgd2l0aG91dCBpbnRlcnJ1cHRpb24sIGRlbGV0ZSBpdC5cbiAgLy8gY2hlY2sgaWYgdGhlcmUgaXMgZXhpc3RpbmcgbG9jayBmaWxlLCBtZWFuaW5nIGEgcHJldmlvdXMgaW5zdGFsbGF0aW9uIGlzIGludGVycnVwdGVkLlxuICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwbGluay5pbnN0YWxsLmxvY2snKTtcbiAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUobG9ja0ZpbGUsIG9yaWdpblBrZ0pzb25TdHIpO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMDApKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnYgPSB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIE5PREVfRU5WOiAnZGV2ZWxvcG1lbnQnXG4gICAgfSBhcyBOb2RlSlMuUHJvY2Vzc0VudjtcblxuICAgIGlmIChucG1PcHQuY2FjaGUpXG4gICAgICBlbnYubnBtX2NvbmZpZ19jYWNoZSA9IG5wbU9wdC5jYWNoZTtcbiAgICBpZiAobnBtT3B0Lm9mZmxpbmUpXG4gICAgICBlbnYubnBtX2NvbmZpZ19vZmZsaW5lID0gJ3RydWUnO1xuXG4gICAgY29uc3QgZXhlTmFtZSA9IG5wbU9wdC51c2VZYXJuID8gJ3lhcm4nIDogJ25wbSc7XG4gICAgY29uc3QgY21kQXJncyA9IFtucG1PcHQudXNlWWFybiAhPT0gdHJ1ZSAmJiBucG1PcHQudXNlTnBtQ2kgPyAnY2knIDogJ2luc3RhbGwnXTtcblxuICAgIGF3YWl0IGV4ZShleGVOYW1lLCAuLi5jbWRBcmdzLCB7Y3dkOiBkaXIsIGVudn0pLmRvbmU7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGlmIChucG1PcHQudXNlWWFybiAhPT0gdHJ1ZSAmJiBucG1PcHQucHJ1bmUpIHtcbiAgICAgIGF3YWl0IGV4ZShleGVOYW1lLCAncHJ1bmUnLCB7Y3dkOiBkaXIsIGVudn0pLmRvbmU7XG4gICAgICAvLyBcIm5wbSBkZHBcIiByaWdodCBhZnRlciBcIm5wbSBpbnN0YWxsXCIgd2lsbCBjYXVzZSBkZXZEZXBlbmRlbmNpZXMgYmVpbmcgcmVtb3ZlZCBzb21laG93LCBkb24ndCBrbm93blxuICAgICAgLy8gd2h5LCBJIGhhdmUgdG8gYWRkIGEgc2V0SW1tZWRpYXRlKCkgYmV0d2VlbiB0aGVtIHRvIHdvcmthcm91bmRcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICB9XG4gICAgaWYgKG5wbU9wdC5kZWR1cGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGV4ZShleGVOYW1lLCAnZGVkdXBlJyxcbiAgICAgICAgICAuLi5bbnBtT3B0LnVzZVlhcm4gPT09IHRydWUgPyAnLS1pbW11dGFibGUnIDogJyddLFxuICAgICAgICAgIHtjd2Q6IGRpciwgZW52fSkucHJvbWlzZTtcbiAgICAgIH0gY2F0Y2ggKGRkcEVycikge1xuICAgICAgICBsb2cud2FybignRmFpbGVkIHRvIGRlZHVwZSBkZXBlbmRlbmNpZXMsIGJ1dCBpdCBpcyBPSycsIGRkcEVycik7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBpbnN0YWxsIGRlcGVuZGVuY2llcycsIChlIGFzIEVycm9yKS5zdGFjayk7XG4gICAgdGhyb3cgZTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdSZWNvdmVyICcgKyBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIC8vIDMuIFJlY292ZXIgcGFja2FnZS5qc29uIGFuZCBzeW1saW5rcyBkZWxldGVkIGluIFN0ZXAuMS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgb3JpZ2luUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBhd2FpdCByZWNvdmVyU3ltbGlua3MoKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpXG4gICAgICBhd2FpdCBmcy5wcm9taXNlcy51bmxpbmsobG9ja0ZpbGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgZnNleHQubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuc3ltbGluayhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY29weU5wbXJjVG9Xb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJy5ucG1yYycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXQpKVxuICAgIHJldHVybjtcbiAgY29uc3QgaXNDaGluYSA9IGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLmlzSW5DaGluYSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIoY24gPT4gY24gIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKTtcblxuICBpZiAoaXNDaGluYSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ2NyZWF0ZSAubnBtcmMgdG8nLCB0YXJnZXQpO1xuICAgIGZzLmNvcHlGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL25wbXJjLWZvci1jbi50eHQnKSwgdGFyZ2V0KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzY2FuQW5kU3luY1BhY2thZ2VzKGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW10pIHtcbiAgY29uc3QgcHJvalBrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGNvbnN0IHNyY1BrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGxldCBwa2dMaXN0OiBQYWNrYWdlSW5mb1tdO1xuXG4gIGlmIChpbmNsdWRlUGFja2FnZUpzb25GaWxlcykge1xuICAgIGNvbnN0IHByaktleXMgPSBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpO1xuICAgIGNvbnN0IHByakRpcnMgPSBwcmpLZXlzLm1hcChwcmpLZXkgPT4gcHJvaktleVRvUGF0aChwcmpLZXkpKTtcbiAgICBwa2dMaXN0ID0gaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMubWFwKGpzb25GaWxlID0+IHtcbiAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgY29uc3QgcHJqSWR4ID0gcHJqRGlycy5maW5kSW5kZXgoZGlyID0+IGluZm8ucmVhbFBhdGguc3RhcnRzV2l0aChkaXIgKyBQYXRoLnNlcCkpO1xuICAgICAgaWYgKHByaklkeCA+PSAwKSB7XG4gICAgICAgIGNvbnN0IHByalBhY2thZ2VOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJqS2V5c1twcmpJZHhdKSE7XG4gICAgICAgIGlmICghcHJqUGFja2FnZU5hbWVzLmluY2x1ZGVzKGluZm8ubmFtZSkpIHtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe1xuICAgICAgICAgICAgcHJqOiBwcmpLZXlzW3ByaklkeF0sXG4gICAgICAgICAgICBwa2dzOiBbLi4ucHJqUGFja2FnZU5hbWVzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qga2V5cyA9IFsuLi5nZXRTdGF0ZSgpLnNyY0RpcjJQYWNrYWdlcy5rZXlzKCldO1xuICAgICAgICBjb25zdCBsaW5rZWRTcmNEaXJzID0ga2V5cy5tYXAoa2V5ID0+IHByb2pLZXlUb1BhdGgoa2V5KSk7XG4gICAgICAgIGNvbnN0IGlkeCA9IGxpbmtlZFNyY0RpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoID09PSBkaXIgfHwgIGluZm8ucmVhbFBhdGguc3RhcnRzV2l0aChkaXIgKyBQYXRoLnNlcCkpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICBjb25zdCBwa2dzID0gZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMuZ2V0KGtleXNbaWR4XSkhO1xuICAgICAgICAgIGlmICghcGtncy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoe1xuICAgICAgICAgICAgICBwYXR0ZXJuOiBrZXlzW2lkeF0sXG4gICAgICAgICAgICAgIHBrZ3M6IFsuLi5wa2dzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7aW5mby5yZWFsUGF0aH0gaXMgbm90IHVuZGVyIGFueSBrbm93biBQcm9qZWN0IGRpcmVjdG9yeXM6ICR7cHJqRGlycy5jb25jYXQobGlua2VkU3JjRGlycykuam9pbignLCAnKX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfSk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKFtwa2dMaXN0LCAndXBkYXRlJ10pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJtID0gKGF3YWl0IGltcG9ydCgnLi4vcmVjaXBlLW1hbmFnZXInKSk7XG4gICAgcGtnTGlzdCA9IFtdO1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NsZWFyUHJvakFuZFNyY0RpclBrZ3MoKTtcbiAgICBhd2FpdCBybS5zY2FuUGFja2FnZXMoKS5waXBlKFxuICAgICAgdGFwKChbcHJvaiwganNvbkZpbGUsIHNyY0Rpcl0pID0+IHtcbiAgICAgICAgaWYgKHByb2ogJiYgIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAgICAgaWYgKHByb2ogPT0gbnVsbCAmJiBzcmNEaXIgJiYgIXNyY1BrZ01hcC5oYXMoc3JjRGlyKSlcbiAgICAgICAgICBzcmNQa2dNYXAuc2V0KHNyY0RpciwgW10pO1xuXG4gICAgICAgIGxvZy5kZWJ1Zygnc2NhbiBwYWNrYWdlLmpzb24nLCBqc29uRmlsZSk7XG4gICAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgICBpZiAoaW5mby5qc29uLmRyIHx8IGluZm8uanNvbi5wbGluaykge1xuICAgICAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgICAgICBpZiAocHJvailcbiAgICAgICAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2UgaWYgKHNyY0RpcilcbiAgICAgICAgICAgIHNyY1BrZ01hcC5nZXQoc3JjRGlyKSEucHVzaChpbmZvKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb2cuZXJyb3IoYE9ycGhhbiAke2pzb25GaWxlfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgUGFja2FnZSBvZiAke2pzb25GaWxlfSBpcyBza2lwcGVkIChkdWUgdG8gbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSlgLCBpbmZvLmpzb24pO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICkudG9Qcm9taXNlKCk7XG4gICAgLy8gbG9nLndhcm4ocHJvalBrZ01hcCwgc3JjUGtnTWFwKTtcbiAgICBmb3IgKGNvbnN0IFtwcmosIHBrZ3NdIG9mIHByb2pQa2dNYXAuZW50cmllcygpKSB7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe3ByaiwgcGtnc30pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtzcmNEaXIsIHBrZ3NdIG9mIHNyY1BrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1NyY0Rpcih7cGF0dGVybjogc3JjRGlyLCBwa2dzfSk7XG4gICAgfVxuXG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKFtwa2dMaXN0LCAnY2xlYW4nXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKHdzS2V5OiBzdHJpbmcpIHtcbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnLmxpbmtzJyAmJiBmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgJy5saW5rcycpKSkge1xuICAgIGZzZXh0LnJlbW92ZShQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksICcubGlua3MnKSlcbiAgICAuY2F0Y2goZXggPT4gbG9nLmluZm8oZXgpKTtcbiAgfVxuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCBzeW1saW5rRGlyTmFtZSB8fCAnbm9kZV9tb2R1bGVzJyk7XG4gIGZzZXh0Lm1rZGlycFN5bmMoc3ltbGlua0Rpcik7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuXG4gIGNvbnN0IHBrZ05hbWVzID0gd3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcChpdGVtID0+IGl0ZW1bMF0pXG4gIC5jb25jYXQod3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcChpdGVtID0+IGl0ZW1bMF0pKTtcblxuICBjb25zdCBwa2dOYW1lU2V0ID0gbmV3IFNldChwa2dOYW1lcyk7XG5cbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIGlmICh3cy5pbnN0YWxsZWRDb21wb25lbnRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgICBwa2dOYW1lU2V0LmFkZChwbmFtZSk7XG4gICAgfVxuICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShyb290RGlyLCBzeW1saW5rRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyldfSk7XG4gIH1cblxuICBsZXQgc3ltbGlua3NUb0NyZWF0ZSA9IGZyb20oQXJyYXkuZnJvbShwa2dOYW1lU2V0LnZhbHVlcygpKSkgLy8gSW1wb3J0YW50LCBkbyBub3QgdXNlIHBrZ05hbWVTZXQgaXRlcmFibGUsIGl0IHdpbGwgYmUgY2hhbmdlZCBiZWZvcmUgc3Vic2NyaXB0aW9uXG4gIC5waXBlKFxuICAgIG1hcChuYW1lID0+IHtcbiAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpIHx8IHdzLmluc3RhbGxlZENvbXBvbmVudHMhLmdldChuYW1lKSE7XG4gICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgICAgbG9nLndhcm4oYE1pc3NpbmcgcGFja2FnZSBpbmZvcm1hdGlvbiBvZiAke25hbWV9LCBwbGVhc2UgcnVuIFwiUGxpbmsgc3luYyAke3dzS2V5fVwiIGFnYWluIHRvIHN5bmMgUGxpbmsgc3RhdGVgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwa2c7XG4gICAgfSksXG4gICAgZmlsdGVyKHBrZyA9PiBwa2cgIT0gbnVsbClcbiAgKTtcblxuICBpZiAocm9vdERpciA9PT0gd29ya3NwYWNlRGlyKHdzS2V5KSkge1xuICAgIGNvbnN0IHBsaW5rUGtnID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFN0YXRlKCkuaW5zdGFsbGVkRHJjcDtcbiAgICBpZiAocGxpbmtQa2cpIHtcbiAgICAgIHBrZ05hbWVTZXQuYWRkKHBsaW5rUGtnLm5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXJnZShcbiAgICBzeW1saW5rc1RvQ3JlYXRlLnBpcGUoXG4gICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhzeW1saW5rRGlyKVxuICAgICksXG4gICAgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKHN5bWxpbmtEaXIsIHBrZ05hbWVTZXQpXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9kZWxldGVVc2VsZXNzU3ltbGluayhjaGVja0Rpcjogc3RyaW5nLCBleGNsdWRlU2V0OiBTZXQ8c3RyaW5nPikge1xuICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGRvbmUxID0gbGlzdE1vZHVsZVN5bWxpbmtzKGNoZWNrRGlyLCBsaW5rID0+IHtcblxuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGNoZWNrRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCFleGNsdWRlU2V0Lmhhcyhwa2dOYW1lKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBEZWxldGUgZXh0cmFuZW91cyBzeW1saW5rOiAke2xpbmt9YCk7XG4gICAgICBkb25lcy5wdXNoKGZzLnByb21pc2VzLnVubGluayhsaW5rKSk7XG4gICAgfVxuICB9KTtcbiAgYXdhaXQgZG9uZTE7XG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvKHBrSnNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQgPSBmYWxzZSk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpIGFzIFBhY2thZ2VJbmZvWydqc29uJ107XG4gIHJldHVybiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGUsIGpzb24sIGlzSW5zdGFsbGVkKTtcbn1cbi8qKlxuICogTGlzdCB0aG9zZSBpbnN0YWxsZWQgcGFja2FnZXMgd2hpY2ggYXJlIHJlZmVyZW5jZWQgYnkgd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlLFxuICogdGhvc2UgcGFja2FnZXMgbXVzdCBoYXZlIFwiZHJcIiBwcm9wZXJ0eSBpbiBwYWNrYWdlLmpzb24gXG4gKiBAcGFyYW0gd29ya3NwYWNlS2V5IFxuICovXG5mdW5jdGlvbiogc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCB3b3Jrc3BhY2VLZXk6IHN0cmluZykge1xuICBjb25zdCBvcmlnaW5JbnN0YWxsSnNvbiA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhLm9yaWdpbkluc3RhbGxKc29uO1xuICAvLyBjb25zdCBkZXBKc29uID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXNdIDpcbiAgLy8gICBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdO1xuICBmb3IgKGNvbnN0IGRlcHMgb2YgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXSkge1xuICAgIGlmIChkZXBzID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgaWYgKCFzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwKSAmJiBkZXAgIT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBjb25zdCBwa2pzb25GaWxlID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwa2pzb25GaWxlKSkge1xuICAgICAgICAgIGNvbnN0IHBrID0gY3JlYXRlUGFja2FnZUluZm8oXG4gICAgICAgICAgICBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyksIHRydWVcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspIHtcbiAgICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGU6IHN0cmluZywganNvbjogUGFja2FnZUluZm9bJ2pzb24nXSwgaXNJbnN0YWxsZWQgPSBmYWxzZSk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBQYXRoLmpvaW4oc3ltbGlua0Rpck5hbWUsIGpzb24ubmFtZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSksXG4gICAgaXNJbnN0YWxsZWRcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChmcm9tLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnNleHQuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgdG8pO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbygnQ29weSB0byAlcycsIGNoYWxrLmN5YW4odG8pKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBmcm9tIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0byByZWxhdGl2ZSB0byByb290UGF0aCBcbiAqL1xuZnVuY3Rpb24gbWF5YmVDb3B5VGVtcGxhdGUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBkZWxldGVEdXBsaWNhdGVkSW5zdGFsbGVkUGtnKHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhO1xuICBjb25zdCBkb05vdGhpbmcgPSAoKSA9PiB7fTtcbiAgd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKS5tYXAoKFtwa2dOYW1lXSkgPT4ge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBwa2dOYW1lKTtcbiAgICByZXR1cm4gZnMucHJvbWlzZXMubHN0YXQoZGlyKVxuICAgIC50aGVuKChzdGF0KSA9PiB7XG4gICAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJldmlvdXMgaW5zdGFsbGVkICR7UGF0aC5yZWxhdGl2ZShyb290RGlyLCBkaXIpfSBpcyBkZWxldGVkLCBkdWUgdG8gbGlua2VkIHBhY2thZ2UgJHtwa2dOYW1lfWApO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMudW5saW5rKGRpcik7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goZG9Ob3RoaW5nKTtcbiAgfSk7XG59XG5cbiJdfQ==