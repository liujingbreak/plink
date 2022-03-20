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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCw0Q0FBb0I7QUFDcEIsZ0RBQXdCO0FBQ3hCLDJCQUF5QjtBQUV6QixrREFBMEI7QUFDMUIsd0RBQTZCO0FBQzdCLG9EQUF1QjtBQUN2QiwrQkFBMkU7QUFDM0UsOENBQzJGO0FBQzNGLG1DQUFpQztBQUNqQyxzRUFBaUc7QUFDakcsb0RBQXVDO0FBQ3ZDLHNEQUFtRTtBQUNuRSxvQ0FBeUQ7QUFDekQsbUZBQTJHO0FBQzNHLDhDQUE4QztBQUM5Qyw4REFBbUc7QUFDbkcsb0RBQXNEO0FBQ3RELHdDQUF5QztBQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsbUJBQW1CLENBQUMsQ0FBQztBQXNEM0MsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFN0UsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0FBQ3RCLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLE1BQU0sS0FBSyxHQUFrQjtJQUMzQixNQUFNLEVBQUUsS0FBSztJQUNiLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUNyQixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUMzQixlQUFlLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDMUIsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQixzQkFBc0IsRUFBRSxDQUFDO0lBQ3pCLGFBQWEsRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUM7Q0FDaEMsQ0FBQztBQTBDVyxRQUFBLEtBQUssR0FBRyxvQkFBWSxDQUFD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QUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVuZm9ydHVuYXRlbHksIHRoaXMgZmlsZSBpcyB2ZXJ5IGxvbmcsIHlvdSBuZWVkIHRvIGZvbGQgYnkgaW5kZW50aW9uIGZvciBiZXR0ZXIgdmlldyBvZiBzb3VyY2UgY29kZSBpbiBFZGl0b3JcbiAqL1xuXG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBFT0wgfSBmcm9tICdvcyc7XG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2Zyb20sIG1lcmdlLCBPYnNlcnZhYmxlLCBvZiwgZGVmZXIsIHRocm93RXJyb3IsIEVNUFRZfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgZGVib3VuY2VUaW1lLCB0YWtlV2hpbGUsXG4gIHRha2UsIGNvbmNhdE1hcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IsIHRhcCwgZmluYWxpemUgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7IGxpc3RDb21wRGVwZW5kZW5jeSwgUGFja2FnZUpzb25JbnRlcmYsIERlcGVuZGVudEluZm8gfSBmcm9tICcuLi90cmFuc2l0aXZlLWRlcC1ob2lzdGVyJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgc2V0UHJvamVjdExpc3QsIHNldExpbmtQYXR0ZXJuc30gZnJvbSAnLi4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge2lzQWN0aW9uT2ZDcmVhdG9yLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9oZWxwZXInO1xuLy8gaW1wb3J0IHsgZ2V0Um9vdERpciB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGNsZWFuSW52YWxpZFN5bWxpbmtzLCB7IGlzV2luMzIsIGxpc3RNb2R1bGVTeW1saW5rcywgdW5saW5rQXN5bmMgfSBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQge3N5bWJvbGljTGlua1BhY2thZ2VzfSBmcm9tICcuLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7IHBsaW5rRW52IH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyJyk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjoge1xuICAgIHBsaW5rPzogUGxpbmtKc29uVHlwZTtcbiAgICBkcj86IFBsaW5rSnNvblR5cGU7XG4gICAgW3A6IHN0cmluZ106IGFueTtcbiAgfSAmIFBhY2thZ2VKc29uSW50ZXJmO1xuICAvKiogQmUgYXdhcmU6IElmIHRoaXMgcHJvcGVydHkgaXMgbm90IHNhbWUgYXMgXCJyZWFsUGF0aFwiLFxuICAgKiB0aGVuIGl0IGlzIGEgc3ltbGluayB3aG9zZSBwYXRoIGlzIHJlbGF0aXZlIHRvIHdvcmtzcGFjZSBkaXJlY3RvcnkgKi9cbiAgcGF0aDogc3RyaW5nO1xuICByZWFsUGF0aDogc3RyaW5nO1xuICBpc0luc3RhbGxlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IHR5cGUgUGxpbmtKc29uVHlwZSA9IHtcbiAgdHlwZVJvb3Q/OiBzdHJpbmc7XG4gIHR5cGU/OiAnc2VydmVyJyB8IHN0cmluZ1tdIHwgc3RyaW5nO1xuICBzZXJ2ZXJQcmlvcml0eT86IHN0cmluZyB8IG51bWJlcjtcbiAgc2VydmVyRW50cnk/OiBzdHJpbmc7XG4gIHNldHRpbmc/OiB7XG4gICAgLyoqIEluIGZvcm0gb2YgXCI8cGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdHlwZTogc3RyaW5nO1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPG1vZHVsZS1wYXRoPiM8ZXhwb3J0LW5hbWU+XCIgKi9cbiAgICB2YWx1ZTogc3RyaW5nO1xuICB9O1xuICBbcDogc3RyaW5nXTogYW55O1xufTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc1N0YXRlIHtcbiAgbnBtSW5zdGFsbE9wdDogTnBtT3B0aW9ucztcbiAgaW5pdGVkOiBib29sZWFuO1xuICBzcmNQYWNrYWdlczogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuICAvKiogS2V5IGlzIHJlbGF0aXZlIHBhdGggdG8gcm9vdCB3b3Jrc3BhY2UgKi9cbiAgd29ya3NwYWNlczogTWFwPHN0cmluZywgV29ya3NwYWNlU3RhdGU+O1xuICAvKioga2V5IG9mIGN1cnJlbnQgXCJ3b3Jrc3BhY2VzXCIgKi9cbiAgY3VycldvcmtzcGFjZT86IHN0cmluZyB8IG51bGw7XG4gIHByb2plY3QyUGFja2FnZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgc3JjRGlyMlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIC8qKiBEcmNwIGlzIHRoZSBvcmlnaW5hbCBuYW1lIG9mIFBsaW5rIHByb2plY3QgKi9cbiAgbGlua2VkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbGlua2VkRHJjcFByb2plY3Q/OiBzdHJpbmcgfCBudWxsO1xuICBpbnN0YWxsZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgaXNJbkNoaW5hPzogYm9vbGVhbjtcbiAgLyoqIEV2ZXJ5dGltZSBhIGhvaXN0IHdvcmtzcGFjZSBzdGF0ZSBjYWxjdWxhdGlvbiBpcyBiYXNpY2FsbHkgZG9uZSwgaXQgaXMgaW5jcmVhc2VkIGJ5IDEgKi9cbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICAvKiogd29ya3NwYWNlIGtleSAqL1xuICBsYXN0Q3JlYXRlZFdvcmtzcGFjZT86IHN0cmluZztcbn1cblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXIsIHBsaW5rRGlyLCBpc0RyY3BTeW1saW5rLCBzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcblxuY29uc3QgTlMgPSAncGFja2FnZXMnO1xuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmNvbnN0IHN0YXRlOiBQYWNrYWdlc1N0YXRlID0ge1xuICBpbml0ZWQ6IGZhbHNlLFxuICB3b3Jrc3BhY2VzOiBuZXcgTWFwKCksXG4gIHByb2plY3QyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjRGlyMlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGdpdElnbm9yZXM6IHt9LFxuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogMCxcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogMCxcbiAgbnBtSW5zdGFsbE9wdDoge2lzRm9yY2U6IGZhbHNlfVxufTtcblxuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VTdGF0ZSB7XG4gIGlkOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2UgbGlua2VkIHNvdXJjZSBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLyoqIG5hbWVzIG9mIHRob3NlIGxpbmtlZCBzb3VyY2UgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG5cbiAgLyoqIGluc3RhbGxlZCBQbGluayBjb21wb25lbnQgcGFja2FnZXMgW25hbWUsIHZlcnNpb25dKi9cbiAgaW5zdGFsbGVkQ29tcG9uZW50cz86IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcblxuICBob2lzdEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdFBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdERldkluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdERldlBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdEluZm9TdW1tYXJ5Pzoge1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRldkRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGV2RGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiB2ZXJzaW9ucyBhcmUgY29uZmxpY3QgKi9cbiAgICBjb25mbGljdERlcHM6IHN0cmluZ1tdO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5wbU9wdGlvbnMge1xuICB1c2VZYXJuPzogYm9vbGVhbjtcbiAgY2FjaGU/OiBzdHJpbmc7XG4gIGlzRm9yY2U6IGJvb2xlYW47XG4gIHVzZU5wbUNpPzogYm9vbGVhbjtcbiAgcHJ1bmU/OiBib29sZWFuO1xuICBkZWR1cGU/OiBib29sZWFuO1xuICBvZmZsaW5lPzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgLyoqIERvIHRoaXMgYWN0aW9uIGFmdGVyIGFueSBsaW5rZWQgcGFja2FnZSBpcyByZW1vdmVkIG9yIGFkZGVkICAqL1xuICAgIGluaXRSb290RGlyKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxOcG1PcHRpb25zPikge1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LmNhY2hlID0gcGF5bG9hZC5jYWNoZTtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VOcG1DaSA9IHBheWxvYWQudXNlTnBtQ2k7XG4gICAgICBkLm5wbUluc3RhbGxPcHQudXNlWWFybiA9IHBheWxvYWQudXNlWWFybjtcbiAgICB9LFxuXG4gICAgLyoqIFxuICAgICAqIC0gQ3JlYXRlIGluaXRpYWwgZmlsZXMgaW4gcm9vdCBkaXJlY3RvcnlcbiAgICAgKiAtIFNjYW4gbGlua2VkIHBhY2thZ2VzIGFuZCBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgICAqIC0gU3dpdGNoIHRvIGRpZmZlcmVudCB3b3Jrc3BhY2VcbiAgICAgKiAtIERlbGV0ZSBub25leGlzdGluZyB3b3Jrc3BhY2VcbiAgICAgKiAtIElmIFwicGFja2FnZUpzb25GaWxlc1wiIGlzIHByb3ZpZGVkLCBpdCBzaG91bGQgc2tpcCBzdGVwIG9mIHNjYW5uaW5nIGxpbmtlZCBwYWNrYWdlc1xuICAgICAqIC0gVE9ETzogaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgaG9pc3QgYW5kIGluc3RhbGwgZm9yIHRoZW0gYWxsP1xuICAgICAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e1xuICAgICAgZGlyOiBzdHJpbmc7XG4gICAgICAvLyBjcmVhdGVIb29rOiBib29sZWFuO1xuICAgICAgcGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdO1xuICAgIH0gJiBOcG1PcHRpb25zPikge1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LmNhY2hlID0gcGF5bG9hZC5jYWNoZTtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VZYXJuID0gcGF5bG9hZC51c2VZYXJuO1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LnVzZU5wbUNpID0gcGF5bG9hZC51c2VOcG1DaTtcbiAgICB9LFxuICAgIHNjYW5BbmRTeW5jUGFja2FnZXMoZDogUGFja2FnZXNTdGF0ZSwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtwYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW119Pikge1xuICAgIH0sXG5cbiAgICB1cGRhdGVEaXIoKSB7fSxcbiAgICBfdXBkYXRlUGxpbmtQYWNrYWdlSW5mbyhkKSB7XG4gICAgICBjb25zdCBwbGlua1BrZyA9IGNyZWF0ZVBhY2thZ2VJbmZvKFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3BhY2thZ2UuanNvbicpLCBmYWxzZSk7XG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICBkLmxpbmtlZERyY3AgPSBwbGlua1BrZztcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5saW5rZWREcmNwUHJvamVjdCA9IHBhdGhUb1Byb2pLZXkoUGF0aC5kaXJuYW1lKGQubGlua2VkRHJjcC5yZWFsUGF0aCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBudWxsO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3N5bmNMaW5rZWRQYWNrYWdlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248W3BrZ3M6IFBhY2thZ2VJbmZvW10sIG9wZXJhdG9yOiAndXBkYXRlJyB8ICdjbGVhbiddPikge1xuICAgICAgZC5pbml0ZWQgPSB0cnVlO1xuICAgICAgbGV0IG1hcCA9IGQuc3JjUGFja2FnZXM7XG4gICAgICBpZiAocGF5bG9hZFsxXSA9PT0gJ2NsZWFuJykge1xuICAgICAgICBtYXAgPSBkLnNyY1BhY2thZ2VzID0gbmV3IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPigpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZFswXSkge1xuICAgICAgICBtYXAuc2V0KHBrSW5mby5uYW1lLCBwa0luZm8pO1xuICAgICAgfVxuICAgIH0sXG4gICAgb25MaW5rZWRQYWNrYWdlQWRkZWQoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgYWRkUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGlmICghZC5wcm9qZWN0MlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5kZWxldGUoZGlyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFkZFNyY0RpcnMoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQuc3JjRGlyMlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5zcmNEaXIyUGFja2FnZXMuc2V0KGRpciwgW10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVTcmNEaXJzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgZC5zcmNEaXIyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICAvKiogcGF5bG9hZDogd29ya3NwYWNlIGtleXMsIGhhcHBlbnMgYXMgZGVib3VuY2VkIHdvcmtzcGFjZSBjaGFuZ2UgZXZlbnQgKi9cbiAgICBfd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIC8qKiB3b3Jrc3BhY2VDaGFuZ2VkIGlzIHNhZmUgZm9yIGV4dGVybmFsIG1vZHVsZSB0byB3YXRjaCwgaXQgc2VyaWFsaXplIGFjdGlvbnMgbGlrZSBcIl9pbnN0YWxsV29ya3NwYWNlXCIgYW5kIFwiX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZFwiICovXG4gICAgd29ya3NwYWNlQ2hhbmdlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1cGRhdGVHaXRJZ25vcmVzKGQsIHtwYXlsb2FkOiB7ZmlsZSwgbGluZXN9fTogUGF5bG9hZEFjdGlvbjx7ZmlsZTogc3RyaW5nOyBsaW5lczogc3RyaW5nW119Pikge1xuICAgICAgbGV0IHJlbCA9IGZpbGUsIGFicyA9IGZpbGU7XG4gICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKGZpbGUpKSB7XG4gICAgICAgIHJlbCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBhYnMgPSBmaWxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWJzID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGZpbGUpO1xuICAgICAgfVxuICAgICAgaWYgKGQuZ2l0SWdub3Jlc1thYnNdKSB7XG4gICAgICAgIGRlbGV0ZSBkLmdpdElnbm9yZXNbYWJzXTtcbiAgICAgIH1cbiAgICAgIGQuZ2l0SWdub3Jlc1tyZWxdID0gbGluZXMubWFwKGxpbmUgPT4gbGluZS5zdGFydHNXaXRoKCcvJykgPyBsaW5lIDogJy8nICsgbGluZSk7XG4gICAgfSxcbiAgICBwYWNrYWdlc1VwZGF0ZWQoZCkge1xuICAgICAgZC5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKys7XG4gICAgfSxcbiAgICBzZXRJbkNoaW5hKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxib29sZWFuPikge1xuICAgICAgZC5pc0luQ2hpbmEgPSBwYXlsb2FkO1xuICAgIH0sXG4gICAgX3NldEN1cnJlbnRXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IGRpcn06IFBheWxvYWRBY3Rpb248c3RyaW5nIHwgbnVsbD4pIHtcbiAgICAgIGlmIChkaXIgIT0gbnVsbClcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBlbHNlXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IG51bGw7XG4gICAgfSxcbiAgICAvKiogcGFyYW10ZXI6IHdvcmtzcGFjZSBrZXkgKi9cbiAgICB3b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHtcbiAgICAgIGQud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0gKz0gMTtcbiAgICB9LFxuICAgIC8vIG9uV29ya3NwYWNlUGFja2FnZVVwZGF0ZWQoZCwge3BheWxvYWQ6IHdvcmtzcGFjZUtleX06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgX2hvaXN0V29ya3NwYWNlRGVwcyhzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcInNyY1BhY2thZ2VzXCIgaXMgbnVsbCwgbmVlZCB0byBydW4gYGluaXRgIGNvbW1hbmQgZmlyc3QnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHBranNvblN0cjogc3RyaW5nO1xuICAgICAgY29uc3QgcGtnanNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwbGluay5pbnN0YWxsLmxvY2snKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSkge1xuICAgICAgICBsb2cud2FybignUGxpbmsgaW5pdC9zeW5jIHByb2Nlc3Mgd2FzIGludGVycnVwdGVkIGxhc3QgdGltZSwgcmVjb3ZlciBjb250ZW50IG9mICcgKyBwa2dqc29uRmlsZSk7XG4gICAgICAgIHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhsb2NrRmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMudW5saW5rU3luYyhsb2NrRmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtnanNvbkZpbGUsICd1dGY4Jyk7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2pzb24gPSBKU09OLnBhcnNlKHBranNvblN0cikgYXMgUGFja2FnZUpzb25JbnRlcmY7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cbiAgICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30pO1xuXG4gICAgICAvLyBjb25zdCB1cGRhdGluZ0RlcHMgPSB7Li4ucGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXBzID0gW107XG4gICAgICBkZXBzLmZvckVhY2goZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIC8vIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGVwcywgaG9pc3RlZFBlZXJzOiBob2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdGVkRGV2OiBob2lzdGVkRGV2RGVwcywgaG9pc3RlZERldlBlZXJzOiBkZXZIb2lzdFBlZXJEZXBJbmZvXG4gICAgICB9ID1cbiAgICAgICAgbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICAgIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSwgcGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSwgcGtqc29uLmRldkRlcGVuZGVuY2llc1xuICAgICAgKTtcblxuICAgICAgY29uc3QgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuICAgICAgICAuLi5wa2pzb24sXG4gICAgICAgIGRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGVwcy5lbnRyaWVzKCkpXG4gICAgICAgIC5jb25jYXQoQXJyYXkuZnJvbShob2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkuZmlsdGVyKGl0ZW0gPT4gIWl0ZW1bMV0ubWlzc2luZykpXG4gICAgICAgIC5maWx0ZXIoKFtuYW1lXSkgPT4gIWlzRHJjcFN5bWxpbmsgfHwgbmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KSxcblxuICAgICAgICBkZXZEZXBlbmRlbmNpZXM6IEFycmF5LmZyb20oaG9pc3RlZERldkRlcHMuZW50cmllcygpKVxuICAgICAgICAuY29uY2F0KEFycmF5LmZyb20oZGV2SG9pc3RQZWVyRGVwSW5mby5lbnRyaWVzKCkpLmZpbHRlcihpdGVtID0+ICFpdGVtWzFdLm1pc3NpbmcpKVxuICAgICAgICAuZmlsdGVyKChbbmFtZV0pID0+ICFpc0RyY3BTeW1saW5rIHx8IG5hbWUgIT09ICdAd2ZoL3BsaW5rJylcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSlcbiAgICAgIH07XG5cbiAgICAgIC8vIGxvZy53YXJuKGluc3RhbGxKc29uKTtcbiAgICAgIC8vIGNvbnN0IGluc3RhbGxlZENvbXAgPSBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGUud29ya3NwYWNlcywgc3RhdGUuc3JjUGFja2FnZXMsIHdzS2V5KTtcblxuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG5cbiAgICAgIGNvbnN0IGhvaXN0SW5mb1N1bW1hcnk6IFdvcmtzcGFjZVN0YXRlWydob2lzdEluZm9TdW1tYXJ5J10gPSB7XG4gICAgICAgIGNvbmZsaWN0RGVwczogW10sIG1pc3NpbmdEZXBzOiB7fSwgbWlzc2luZ0RldkRlcHM6IHt9XG4gICAgICB9O1xuXG4gICAgICBmb3IgKGNvbnN0IGRlcHNJbmZvIG9mIFtob2lzdGVkRGVwcywgaG9pc3RQZWVyRGVwSW5mb10pIHtcbiAgICAgICAgZm9yIChjb25zdCBbZGVwLCBpbmZvXSBvZiBkZXBzSW5mby5lbnRyaWVzKCkpIHtcbiAgICAgICAgICBpZiAoaW5mby5taXNzaW5nKSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5Lm1pc3NpbmdEZXBzW2RlcF0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpbmZvLnNhbWVWZXIgJiYgIWluZm8uZGlyZWN0KSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5LmNvbmZsaWN0RGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKGNvbnN0IGRlcHNJbmZvIG9mIFtob2lzdGVkRGV2RGVwcywgZGV2SG9pc3RQZWVyRGVwSW5mb10pIHtcbiAgICAgICAgZm9yIChjb25zdCBbZGVwLCBpbmZvXSBvZiBkZXBzSW5mby5lbnRyaWVzKCkpIHtcbiAgICAgICAgICBpZiAoaW5mby5taXNzaW5nKSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5Lm1pc3NpbmdEZXZEZXBzW2RlcF0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFpbmZvLnNhbWVWZXIgJiYgIWluZm8uZGlyZWN0KSB7XG4gICAgICAgICAgICBob2lzdEluZm9TdW1tYXJ5LmNvbmZsaWN0RGVwcy5wdXNoKGRlcCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgaWQ6IHdzS2V5LFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIGhvaXN0SW5mbzogaG9pc3RlZERlcHMsXG4gICAgICAgIGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0RGV2SW5mbzogaG9pc3RlZERldkRlcHMsXG4gICAgICAgIGhvaXN0RGV2UGVlckRlcEluZm86IGRldkhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0SW5mb1N1bW1hcnlcbiAgICAgIH07XG4gICAgICBzdGF0ZS5sYXN0Q3JlYXRlZFdvcmtzcGFjZSA9IHdzS2V5O1xuICAgICAgc3RhdGUud29ya3NwYWNlcy5zZXQod3NLZXksIGV4aXN0aW5nID8gT2JqZWN0LmFzc2lnbihleGlzdGluZywgd3ApIDogd3ApO1xuICAgIH0sXG4gICAgX2luc3RhbGxXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IHt3b3Jrc3BhY2VLZXl9fTogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmd9Pikge30sXG4gICAgLy8gX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7fSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiB7bmFtZTogc3RyaW5nfVtdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH0sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1NyY0RpcihkLFxuICAgICAge3BheWxvYWQ6IHtwYXR0ZXJuLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3BhdHRlcm46IHN0cmluZzsgcGtnczoge25hbWU6IHN0cmluZ31bXX0+KSB7XG4gICAgICBkLnNyY0RpcjJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwYXR0ZXJuKSwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9LFxuICAgIF9jbGVhclByb2pBbmRTcmNEaXJQa2dzKGQpIHtcbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIGQucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpIHtcbiAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChrZXksIFtdKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3Qga2V5IG9mIGQuc3JjRGlyMlBhY2thZ2VzLmtleXMoKSkge1xuICAgICAgICBkLnNyY0RpcjJQYWNrYWdlcy5zZXQoa2V5LCBbXSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbmV4cG9ydCBjb25zdCB7dXBkYXRlR2l0SWdub3Jlcywgb25MaW5rZWRQYWNrYWdlQWRkZWR9ID0gYWN0aW9uRGlzcGF0Y2hlcjtcblxuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgY29uc3QgdXBkYXRlZFdvcmtzcGFjZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlQWRkZWRMaXN0ID0gbmV3IEFycmF5PHN0cmluZz4oKTtcblxuICBjb25zdCBnaXRJZ25vcmVGaWxlc1dhaXRpbmcgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBpZiAoZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMgPT0gbnVsbCkge1xuICAgIC8vIEJlY2F1c2Ugc3JjRGlyMlBhY2thZ2VzIGlzIG5ld2x5IGFkZGVkLCB0byBhdm9pZCBleGlzdGluZyBwcm9qZWN0XG4gICAgLy8gYmVpbmcgYnJva2VuIGZvciBtaXNzaW5nIGl0IGluIHByZXZpb3VzbHkgc3RvcmVkIHN0YXRlIGZpbGVcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnNyY0RpcjJQYWNrYWdlcyA9IG5ldyBNYXAoKSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQnlUeXBlcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICAvLyBUbyBvdmVycmlkZSBzdG9yZWQgc3RhdGUuIFxuICAgIC8vIERvIG5vdCBwdXQgZm9sbG93aW5nIGxvZ2ljIGluIGluaXRpYWxTdGF0ZSEgSXQgd2lsbCBiZSBvdmVycmlkZGVuIGJ5IHByZXZpb3VzbHkgc2F2ZWQgc3RhdGVcblxuICAgIGRlZmVyKCgpID0+IHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGxpbmtQYWNrYWdlSW5mbygpKTtcbiAgICAgIHJldHVybiBFTVBUWTtcbiAgICB9KSxcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdExpc3QoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICAgIHJldHVybiBwa3M7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuc3JjRGlyMlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIodiA9PiB2ICE9IG51bGwpLFxuICAgICAgbWFwKChsaW5rUGF0dGVybk1hcCkgPT4ge1xuICAgICAgICBzZXRMaW5rUGF0dGVybnMobGlua1BhdHRlcm5NYXAua2V5cygpKTtcbiAgICAgIH0pKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzY2FuPFBhY2thZ2VzU3RhdGVbJ3NyY1BhY2thZ2VzJ10+KChwcmV2TWFwLCBjdXJyTWFwKSA9PiB7XG4gICAgICAgIHBhY2thZ2VBZGRlZExpc3Quc3BsaWNlKDApO1xuICAgICAgICBmb3IgKGNvbnN0IG5tIG9mIGN1cnJNYXAua2V5cygpKSB7XG4gICAgICAgICAgaWYgKCFwcmV2TWFwLmhhcyhubSkpIHtcbiAgICAgICAgICAgIHBhY2thZ2VBZGRlZExpc3QucHVzaChubSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYWNrYWdlQWRkZWRMaXN0Lmxlbmd0aCA+IDApXG4gICAgICAgICAgb25MaW5rZWRQYWNrYWdlQWRkZWQocGFja2FnZUFkZGVkTGlzdCk7XG4gICAgICAgIHJldHVybiBjdXJyTWFwO1xuICAgICAgfSlcbiAgICApLFxuICAgIC8vICB1cGRhdGVXb3Jrc3BhY2VcbiAgICBhY3Rpb25CeVR5cGVzLnVwZGF0ZVdvcmtzcGFjZS5waXBlKFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZDoge2RpciwgaXNGb3JjZSwgdXNlTnBtQ2ksIHBhY2thZ2VKc29uRmlsZXN9fSkgPT4ge1xuICAgICAgICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICAgICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCBQYXRoLnJlc29sdmUoZGlyLCAnYXBwLmpzJykpO1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSB8fCBpc0ZvcmNlIHx8IHVzZU5wbUNpKSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgY29uc3Qgd3MgPSBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKCdmb3JjZSBucG0gaW5zdGFsbCBpbicsIHdzS2V5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjYWxsIGluaXRSb290RGlyZWN0b3J5KCkgYW5kIHdhaXQgZm9yIGl0IGZpbmlzaGVkIGJ5IG9ic2VydmluZyBhY3Rpb24gJ19zeW5jTGlua2VkUGFja2FnZXMnLFxuICAgICAgICAvLyB0aGVuIGNhbGwgX2hvaXN0V29ya3NwYWNlRGVwc1xuICAgICAgICByZXR1cm4gbWVyZ2UoXG4gICAgICAgICAgcGFja2FnZUpzb25GaWxlcyAhPSBudWxsID8gc2NhbkFuZFN5bmNQYWNrYWdlcyhwYWNrYWdlSnNvbkZpbGVzKSA6XG4gICAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeSgpKSksXG4gICAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX3N5bmNMaW5rZWRQYWNrYWdlcyksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgbWFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSkpXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbkJ5VHlwZXMuc2NhbkFuZFN5bmNQYWNrYWdlcy5waXBlKFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHNjYW5BbmRTeW5jUGFja2FnZXMocGF5bG9hZC5wYWNrYWdlSnNvbkZpbGVzKSxcbiAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY0xpbmtlZFBhY2thZ2VzKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICB0YXAoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjdXJyV3MgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmICh3c0tleSAhPT0gY3VycldzKVxuICAgICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoY3VycldzICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgXCJjdXJyZW50IHdvcmtzcGFjZVwiIGlzIHRoZSBsYXN0IG9uZSBiZWluZyB1cGRhdGVkLCBzbyB0aGF0IGl0IHJlbWFpbnMgXCJjdXJyZW50XCJcbiAgICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2RpcjogUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnJXcyl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbkJ5VHlwZXMuaW5pdFJvb3REaXIucGlwZShcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNoZWNrQWxsV29ya3NwYWNlcygpO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpKSB7XG4gICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcGxpbmtFbnYud29ya0RpcixcbiAgICAgICAgICAgIC4uLnBheWxvYWR9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjdXJyID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgIGlmIChjdXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKGN1cnIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBQYXRoLnJlc29sdmUocm9vdERpciwgY3Vycik7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBhdGgsIC4uLnBheWxvYWR9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG5cbiAgICBhY3Rpb25CeVR5cGVzLl9ob2lzdFdvcmtzcGFjZURlcHMucGlwZShcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgLy8gYWN0aW9uRGlzcGF0Y2hlci5vbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKHdzS2V5KTtcbiAgICAgICAgZGVsZXRlRHVwbGljYXRlZEluc3RhbGxlZFBrZyh3c0tleSk7XG4gICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSkpO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgYWN0aW9uQnlUeXBlcy51cGRhdGVEaXIucGlwZShcbiAgICAgIHRhcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQbGlua1BhY2thZ2VJbmZvKCkpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZShrZXkpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gSGFuZGxlIG5ld2x5IGFkZGVkIHdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKHdzLmtleXMoKSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSksXG4gICAgICBzY2FuPHN0cmluZ1tdPigocHJldiwgY3VycikgPT4ge1xuICAgICAgICBpZiAocHJldi5sZW5ndGggPCBjdXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgbG9nLmluZm8oJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdzIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IHdzfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyO1xuICAgICAgfSlcbiAgICApLFxuICAgIC8vIG9ic2VydmUgYWxsIGV4aXN0aW5nIFdvcmtzcGFjZXMgZm9yIGRlcGVuZGVuY3kgaG9pc3RpbmcgcmVzdWx0IFxuICAgIC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAvLyBmaWx0ZXIocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICB0YWtlV2hpbGUocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuaW5zdGFsbEpzb24gPT09IHMyLmluc3RhbGxKc29uKSxcbiAgICAgICAgc2NhbjxXb3Jrc3BhY2VTdGF0ZT4oKG9sZCwgbmV3V3MpID0+IHtcbiAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG4gICAgICAgICAgY29uc3QgbmV3RGVwcyA9IE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBmb3JjaW5nIGluc3RhbGwgd29ya3NwYWNlLCB0aGVyZWZvcmUgZGVwZW5kZW5jaWVzIGlzIGNsZWFyZWQgYXQgdGhpcyBtb21lbnRcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgb2xkRGVwcyA9IE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcblxuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCAhPT0gb2xkRGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvZy5kZWJ1ZygnbmV3RGVwcy5sZW5ndGgnLCBuZXdEZXBzLmxlbmd0aCwgJyAhPT0gb2xkRGVwcy5sZW5ndGgnLCBvbGREZXBzLmxlbmd0aCk7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IGtleX0pO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdEZXBzLnNvcnQoKTtcbiAgICAgICAgICBvbGREZXBzLnNvcnQoKTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IG5ld0RlcHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobmV3RGVwc1tpXSAhPT0gb2xkRGVwc1tpXSkge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IGtleX0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KSxcbiAgICAvLyBfd29ya3NwYWNlQmF0Y2hDaGFuZ2VkIHdpbGwgdHJpZ2dlciBjcmVhdGluZyBzeW1saW5rcywgYnV0IG1lYW53aGlsZSBfaW5zdGFsbFdvcmtzcGFjZSB3aWxsIGRlbGV0ZSBzeW1saW5rc1xuICAgIC8vIEkgZG9uJ3Qgd2FudCB0byBzZWVtIHRoZW0gcnVubmluZyBzaW11bHRhbmVvdXNseS5cbiAgICBtZXJnZShhY3Rpb25CeVR5cGVzLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQsIGFjdGlvbkJ5VHlwZXMuX2luc3RhbGxXb3Jrc3BhY2UpLnBpcGUoXG4gICAgICBjb25jYXRNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgaWYgKGlzQWN0aW9uT2ZDcmVhdG9yKGFjdGlvbiwgc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSkpIHtcbiAgICAgICAgICBjb25zdCB3c0tleSA9IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleTtcbiAgICAgICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3c0tleSkpLFxuICAgICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICBjb25jYXRNYXAod3MgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gaW5zdGFsbFdvcmtzcGFjZSh3cyEsIGdldFN0YXRlKCkubnBtSW5zdGFsbE9wdCk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgICAgIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uod3NLZXkpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0FjdGlvbk9mQ3JlYXRvcihhY3Rpb24sIHNsaWNlLmFjdGlvbnMuX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZCkpIHtcbiAgICAgICAgICBjb25zdCB3c0tleXMgPSBhY3Rpb24ucGF5bG9hZDtcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoLi4ud3NLZXlzLm1hcChfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UpKS5waXBlKFxuICAgICAgICAgICAgZmluYWxpemUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VDaGFuZ2VkKHdzS2V5cykpXG4gICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gRU1QVFk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBzb21ldGhpbmcgaXMgbmV3bHkgaW5zdGFsbGVkIG9yIGNoYW5nZWQgaW4gd29ya3NwYWNlIG5vZGVfbW9kdWxlc1xuICAgIGFjdGlvbkJ5VHlwZXMud29ya3NwYWNlU3RhdGVVcGRhdGVkLnBpcGUoXG4gICAgICBtYXAoYWN0aW9uID0+IHVwZGF0ZWRXb3Jrc3BhY2VTZXQuYWRkKGFjdGlvbi5wYXlsb2FkKSksXG4gICAgICBkZWJvdW5jZVRpbWUoODAwKSxcbiAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZChBcnJheS5mcm9tKHVwZGF0ZWRXb3Jrc3BhY2VTZXQudmFsdWVzKCkpKTtcbiAgICAgICAgdXBkYXRlZFdvcmtzcGFjZVNldC5jbGVhcigpO1xuICAgICAgfSksXG4gICAgICBtYXAoKCkgPT4ge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnBhY2thZ2VzVXBkYXRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbkJ5VHlwZXMudXBkYXRlR2l0SWdub3Jlcy5waXBlKFxuICAgICAgdGFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGxldCByZWwgPSBhY3Rpb24ucGF5bG9hZC5maWxlO1xuICAgICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKHJlbCkpIHtcbiAgICAgICAgICByZWwgPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHJlbCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICB9XG4gICAgICAgIGdpdElnbm9yZUZpbGVzV2FpdGluZy5hZGQocmVsKTtcbiAgICAgIH0pLFxuICAgICAgZGVib3VuY2VUaW1lKDUwMCksXG4gICAgICBtYXAoKCkgPT4ge1xuICAgICAgICBjb25zdCBjaGFuZ2VkRmlsZXMgPSBbLi4uZ2l0SWdub3JlRmlsZXNXYWl0aW5nLnZhbHVlcygpXTtcbiAgICAgICAgZ2l0SWdub3JlRmlsZXNXYWl0aW5nLmNsZWFyKCk7XG4gICAgICAgIHJldHVybiBjaGFuZ2VkRmlsZXM7XG4gICAgICB9KSxcbiAgICAgIGNvbmNhdE1hcCgoY2hhbmdlZEZpbGVzKSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZSguLi5jaGFuZ2VkRmlsZXMubWFwKGFzeW5jIHJlbCA9PiB7XG4gICAgICAgICAgY29uc3QgZmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCByZWwpO1xuICAgICAgICAgIGNvbnN0IGxpbmVzID0gZ2V0U3RhdGUoKS5naXRJZ25vcmVzW2ZpbGVdO1xuICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUpKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTGluZXMgPSBkYXRhLnNwbGl0KC9cXG5cXHI/LykubWFwKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSBfLmRpZmZlcmVuY2UobGluZXMsIGV4aXN0aW5nTGluZXMpO1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGRhdGEgKyBFT0wgKyBuZXdMaW5lcy5qb2luKEVPTCksICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgbG9nLmluZm8oJ01vZGlmeScsIGZpbGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hZGRQcm9qZWN0LCBzbGljZS5hY3Rpb25zLmRlbGV0ZVByb2plY3QpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSlcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hZGRTcmNEaXJzLCBzbGljZS5hY3Rpb25zLmRlbGV0ZVNyY0RpcnMpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSlcbiAgICApXG4gICkucGlwZShcbiAgICBpZ25vcmVFbGVtZW50cygpLFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIuc3RhY2sgPyBlcnIuc3RhY2sgOiBlcnIpO1xuICAgICAgcmV0dXJuIHRocm93RXJyb3IoZXJyKTtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCk6IE9ic2VydmFibGU8UGFja2FnZXNTdGF0ZT4ge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUHJvaktleShwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgcGF0aCk7XG4gIHJldHVybiByZWxQYXRoLnN0YXJ0c1dpdGgoJy4uJykgPyBQYXRoLnJlc29sdmUocGF0aCkgOiByZWxQYXRoO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHByb2pLZXlUb1BhdGgoa2V5OiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGguaXNBYnNvbHV0ZShrZXkpID8ga2V5IDogUGF0aC5yZXNvbHZlKHJvb3REaXIsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VLZXkocGF0aDogc3RyaW5nKSB7XG4gIGxldCByZWwgPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIFBhdGgucmVzb2x2ZShwYXRoKSk7XG4gIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKVxuICAgIHJlbCA9IHJlbC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHJldHVybiByZWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VEaXIoa2V5OiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwcmogb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocGF0aFRvUHJvaktleShwcmopKTtcbiAgICBpZiAocGtnTmFtZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwayA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgeWllbGQgcGs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0TGlzdCgpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkubWFwKHBqID0+IFBhdGgucmVzb2x2ZShyb290RGlyLCBwaikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNDd2RXb3Jrc3BhY2UoKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpO1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAod3MgPT0gbnVsbClcbiAgICByZXR1cm4gZmFsc2U7XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIFRoaXMgbWV0aG9kIGlzIG1lYW50IHRvIHRyaWdnZXIgZWRpdG9yLWhlbHBlciB0byB1cGRhdGUgdHNjb25maWcgZmlsZXMsIHNvXG4gKiBlZGl0b3ItaGVscGVyIG11c3QgYmUgaW1wb3J0IGF0IGZpcnN0XG4gKiBAcGFyYW0gZGlyIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc3dpdGNoQ3VycmVudFdvcmtzcGFjZShkaXI6IHN0cmluZykge1xuICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKGRpcik7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZChbd29ya3NwYWNlS2V5KGRpcildKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKGdldFN0YXRlKCksIHdzS2V5KTtcblxuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtnRW50cnkpIHtcbiAgICAgIHlpZWxkIFtway5uYW1lLCBwa107XG4gICAgfVxuICB9KSgpKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxlZENvbXBvbmVudHMgPSBpbnN0YWxsZWQpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSk7XG59XG5cbi8qKlxuICogRGVsZXRlIHdvcmtzcGFjZSBzdGF0ZSBpZiBpdHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0XG4gKi9cbmZ1bmN0aW9uIGNoZWNrQWxsV29ya3NwYWNlcygpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYFdvcmtzcGFjZSAke2tleX0gZG9lcyBub3QgZXhpc3QgYW55bW9yZS5gKTtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5kZWxldGUoa2V5KSk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBsb2cuZGVidWcoJ2luaXRSb290RGlyZWN0b3J5Jyk7XG4gIGNvbnN0IHJvb3RQYXRoID0gcm9vdERpcjtcbiAgZnNleHQubWtkaXJwU3luYyhkaXN0RGlyKTtcbiAgLy8gbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLFxuICAgICAgJ2dpdGlnbm9yZS50eHQnKSwgcm9vdERpciArICcvLmdpdGlnbm9yZScpO1xuICBhd2FpdCBjbGVhbkludmFsaWRTeW1saW5rcygpO1xuICBhd2FpdCBzY2FuQW5kU3luY1BhY2thZ2VzKCk7XG4gIC8vIGF3YWl0IF9kZWxldGVVc2VsZXNzU3ltbGluayhQYXRoLnJlc29sdmUocm9vdERpciwgJ25vZGVfbW9kdWxlcycpLCBuZXcgU2V0PHN0cmluZz4oKSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlLCBucG1PcHQ6IE5wbU9wdGlvbnMpIHtcbiAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzLmlkKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBpbnN0YWxsSW5EaXIoZGlyLCBucG1PcHQsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCB3cy5pbnN0YWxsSnNvblN0cik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgY29uc3Qgd3NkID0gZC53b3Jrc3BhY2VzLmdldCh3cy5pZCkhO1xuICAgICAgd3NkLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICB3c2QuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgICB3c2QuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLWxvY2suanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKGBQcm9ibGVtYXRpYyAke2xvY2tGaWxlfSBpcyBkZWxldGVkLCBwbGVhc2UgdHJ5IGFnYWluYCk7XG4gICAgICAgIGZzLnVubGlua1N5bmMobG9ja0ZpbGUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsSW5EaXIoZGlyOiBzdHJpbmcsIG5wbU9wdDogTnBtT3B0aW9ucywgb3JpZ2luUGtnSnNvblN0cjogc3RyaW5nLCB0b0luc3RhbGxQa2dKc29uU3RyOiBzdHJpbmcpIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyBkaXIpO1xuICB0cnkge1xuICAgIGF3YWl0IGNvcHlOcG1yY1RvV29ya3NwYWNlKGRpcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtzSW5Nb2R1bGVEaXIgPSBbXSBhcyB7Y29udGVudDogc3RyaW5nOyBsaW5rOiBzdHJpbmd9W107XG5cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgIGZzZXh0Lm1rZGlycFN5bmModGFyZ2V0KTtcbiAgfVxuXG4gIC8vIE5QTSB2Ny4yMC54IGNhbiBub3QgaW5zdGFsbCBkZXBlbmRlbmNpZXMgaWYgdGhlcmUgaXMgYW55IGZpbGUgd2l0aCBuYW1lIHByZWZpeCAnXycgZXhpc3RzIGluIGRpcmVjdG9yeSBub2RlX21vZHVsZXNcbiAgY29uc3QgbGVnYWN5UGtnU2V0dGluZ0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJywgJ19wYWNrYWdlLXNldHRpbmdzLmQudHMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMobGVnYWN5UGtnU2V0dGluZ0ZpbGUpKSB7XG4gICAgZnMudW5saW5rU3luYyhsZWdhY3lQa2dTZXR0aW5nRmlsZSk7XG4gIH1cblxuICAvLyAxLiBUZW1vcHJhcmlseSByZW1vdmUgYWxsIHN5bWxpbmtzIHVuZGVyIGBub2RlX21vZHVsZXMvYCBhbmQgYG5vZGVfbW9kdWxlcy9AKi9gXG4gIC8vIGJhY2t1cCB0aGVtIGZvciBsYXRlIHJlY292ZXJ5XG4gIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyh0YXJnZXQsIGxpbmsgPT4ge1xuICAgIGxvZy5kZWJ1ZygnUmVtb3ZlIHN5bWxpbmsnLCBsaW5rKTtcbiAgICBjb25zdCBsaW5rQ29udGVudCA9IGZzLnJlYWRsaW5rU3luYyhsaW5rKTtcbiAgICBzeW1saW5rc0luTW9kdWxlRGlyLnB1c2goe2NvbnRlbnQ6IGxpbmtDb250ZW50LCBsaW5rfSk7XG4gICAgcmV0dXJuIHVubGlua0FzeW5jKGxpbmspO1xuICB9KTtcbiAgLy8gMi4gUnVuIGBucG0gaW5zdGFsbGBcbiAgY29uc3QgaW5zdGFsbEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbygnd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgdG9JbnN0YWxsUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgLy8gc2F2ZSBhIGxvY2sgZmlsZSB0byBpbmRpY2F0ZSBpbi1wcm9jZXNzIG9mIGluc3RhbGxpbmcsIG9uY2UgaW5zdGFsbGF0aW9uIGlzIGNvbXBsZXRlZCB3aXRob3V0IGludGVycnVwdGlvbiwgZGVsZXRlIGl0LlxuICAvLyBjaGVjayBpZiB0aGVyZSBpcyBleGlzdGluZyBsb2NrIGZpbGUsIG1lYW5pbmcgYSBwcmV2aW91cyBpbnN0YWxsYXRpb24gaXMgaW50ZXJydXB0ZWQuXG4gIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShsb2NrRmlsZSwgb3JpZ2luUGtnSnNvblN0cik7XG5cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuICB0cnkge1xuICAgIGNvbnN0IGVudiA9IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgTk9ERV9FTlY6ICdkZXZlbG9wbWVudCdcbiAgICB9IGFzIE5vZGVKUy5Qcm9jZXNzRW52O1xuXG4gICAgaWYgKG5wbU9wdC5jYWNoZSlcbiAgICAgIGVudi5ucG1fY29uZmlnX2NhY2hlID0gbnBtT3B0LmNhY2hlO1xuICAgIGlmIChucG1PcHQub2ZmbGluZSlcbiAgICAgIGVudi5ucG1fY29uZmlnX29mZmxpbmUgPSAndHJ1ZSc7XG5cbiAgICBjb25zdCBleGVOYW1lID0gbnBtT3B0LnVzZVlhcm4gPyAneWFybicgOiAnbnBtJztcbiAgICBjb25zdCBjbWRBcmdzID0gW25wbU9wdC51c2VZYXJuICE9PSB0cnVlICYmIG5wbU9wdC51c2VOcG1DaSA/ICdjaScgOiAnaW5zdGFsbCddO1xuXG4gICAgYXdhaXQgZXhlKGV4ZU5hbWUsIC4uLmNtZEFyZ3MsIHtjd2Q6IGRpciwgZW52fSkuZG9uZTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgaWYgKG5wbU9wdC51c2VZYXJuICE9PSB0cnVlICYmIG5wbU9wdC5wcnVuZSkge1xuICAgICAgYXdhaXQgZXhlKGV4ZU5hbWUsICdwcnVuZScsIHtjd2Q6IGRpciwgZW52fSkuZG9uZTtcbiAgICAgIC8vIFwibnBtIGRkcFwiIHJpZ2h0IGFmdGVyIFwibnBtIGluc3RhbGxcIiB3aWxsIGNhdXNlIGRldkRlcGVuZGVuY2llcyBiZWluZyByZW1vdmVkIHNvbWVob3csIGRvbid0IGtub3duXG4gICAgICAvLyB3aHksIEkgaGF2ZSB0byBhZGQgYSBzZXRJbW1lZGlhdGUoKSBiZXR3ZWVuIHRoZW0gdG8gd29ya2Fyb3VuZFxuICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIH1cbiAgICBpZiAobnBtT3B0LmRlZHVwZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgZXhlKGV4ZU5hbWUsICdkZWR1cGUnLFxuICAgICAgICAgIC4uLltucG1PcHQudXNlWWFybiA9PT0gdHJ1ZSA/ICctLWltbXV0YWJsZScgOiAnJ10sXG4gICAgICAgICAge2N3ZDogZGlyLCBlbnZ9KS5wcm9taXNlO1xuICAgICAgfSBjYXRjaCAoZGRwRXJyKSB7XG4gICAgICAgIGxvZy53YXJuKCdGYWlsZWQgdG8gZGVkdXBlIGRlcGVuZGVuY2llcywgYnV0IGl0IGlzIE9LJywgZGRwRXJyKTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5lcnJvcignRmFpbGVkIHRvIGluc3RhbGwgZGVwZW5kZW5jaWVzJywgKGUgYXMgRXJyb3IpLnN0YWNrKTtcbiAgICB0aHJvdyBlO1xuICB9IGZpbmFsbHkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ1JlY292ZXIgJyArIGluc3RhbGxKc29uRmlsZSk7XG4gICAgLy8gMy4gUmVjb3ZlciBwYWNrYWdlLmpzb24gYW5kIHN5bWxpbmtzIGRlbGV0ZWQgaW4gU3RlcC4xLlxuICAgIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCBvcmlnaW5Qa2dKc29uU3RyLCAndXRmOCcpO1xuICAgIGF3YWl0IHJlY292ZXJTeW1saW5rcygpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSlcbiAgICAgIGF3YWl0IGZzLnByb21pc2VzLnVubGluayhsb2NrRmlsZSk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsaW5rKSkge1xuICAgICAgICBmc2V4dC5ta2RpcnBTeW5jKFBhdGguZGlybmFtZShsaW5rKSk7XG4gICAgICAgIHJldHVybiBmcy5wcm9taXNlcy5zeW1saW5rKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb3B5TnBtcmNUb1dvcmtzcGFjZSh3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnLm5wbXJjJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpXG4gICAgcmV0dXJuO1xuICBjb25zdCBpc0NoaW5hID0gYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMuaXNJbkNoaW5hKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGZpbHRlcihjbiA9PiBjbiAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmIChpc0NoaW5hKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnY3JlYXRlIC5ucG1yYyB0bycsIHRhcmdldCk7XG4gICAgZnMuY29weUZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbnBtcmMtZm9yLWNuLnR4dCcpLCB0YXJnZXQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNjYW5BbmRTeW5jUGFja2FnZXMoaW5jbHVkZVBhY2thZ2VKc29uRmlsZXM/OiBzdHJpbmdbXSkge1xuICBjb25zdCBwcm9qUGtnTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgY29uc3Qgc3JjUGtnTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgbGV0IHBrZ0xpc3Q6IFBhY2thZ2VJbmZvW107XG5cbiAgaWYgKGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzKSB7XG4gICAgY29uc3QgcHJqS2V5cyA9IEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSk7XG4gICAgY29uc3QgcHJqRGlycyA9IHByaktleXMubWFwKHByaktleSA9PiBwcm9qS2V5VG9QYXRoKHByaktleSkpO1xuICAgIHBrZ0xpc3QgPSBpbmNsdWRlUGFja2FnZUpzb25GaWxlcy5tYXAoanNvbkZpbGUgPT4ge1xuICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvKGpzb25GaWxlLCBmYWxzZSk7XG4gICAgICBjb25zdCBwcmpJZHggPSBwcmpEaXJzLmZpbmRJbmRleChkaXIgPT4gaW5mby5yZWFsUGF0aC5zdGFydHNXaXRoKGRpciArIFBhdGguc2VwKSk7XG4gICAgICBpZiAocHJqSWR4ID49IDApIHtcbiAgICAgICAgY29uc3QgcHJqUGFja2FnZU5hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcmpLZXlzW3ByaklkeF0pITtcbiAgICAgICAgaWYgKCFwcmpQYWNrYWdlTmFtZXMuaW5jbHVkZXMoaW5mby5uYW1lKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7XG4gICAgICAgICAgICBwcmo6IHByaktleXNbcHJqSWR4XSxcbiAgICAgICAgICAgIHBrZ3M6IFsuLi5wcmpQYWNrYWdlTmFtZXMubWFwKG5hbWUgPT4gKHtuYW1lfSkpLCBpbmZvXVxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBrZXlzID0gWy4uLmdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzLmtleXMoKV07XG4gICAgICAgIGNvbnN0IGxpbmtlZFNyY0RpcnMgPSBrZXlzLm1hcChrZXkgPT4gcHJvaktleVRvUGF0aChrZXkpKTtcbiAgICAgICAgY29uc3QgaWR4ID0gbGlua2VkU3JjRGlycy5maW5kSW5kZXgoZGlyID0+IGluZm8ucmVhbFBhdGggPT09IGRpciB8fCAgaW5mby5yZWFsUGF0aC5zdGFydHNXaXRoKGRpciArIFBhdGguc2VwKSk7XG4gICAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAgIGNvbnN0IHBrZ3MgPSBnZXRTdGF0ZSgpLnNyY0RpcjJQYWNrYWdlcy5nZXQoa2V5c1tpZHhdKSE7XG4gICAgICAgICAgaWYgKCFwa2dzLmluY2x1ZGVzKGluZm8ubmFtZSkpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1NyY0Rpcih7XG4gICAgICAgICAgICAgIHBhdHRlcm46IGtleXNbaWR4XSxcbiAgICAgICAgICAgICAgcGtnczogWy4uLnBrZ3MubWFwKG5hbWUgPT4gKHtuYW1lfSkpLCBpbmZvXVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtpbmZvLnJlYWxQYXRofSBpcyBub3QgdW5kZXIgYW55IGtub3duIFByb2plY3QgZGlyZWN0b3J5czogJHtwcmpEaXJzLmNvbmNhdChsaW5rZWRTcmNEaXJzKS5qb2luKCcsICcpfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9KTtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICd1cGRhdGUnXSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgcm0gPSAoYXdhaXQgaW1wb3J0KCcuLi9yZWNpcGUtbWFuYWdlcicpKTtcbiAgICBwa2dMaXN0ID0gW107XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2xlYXJQcm9qQW5kU3JjRGlyUGtncygpO1xuICAgIGF3YWl0IHJtLnNjYW5QYWNrYWdlcygpLnBpcGUoXG4gICAgICB0YXAoKFtwcm9qLCBqc29uRmlsZSwgc3JjRGlyXSkgPT4ge1xuICAgICAgICBpZiAocHJvaiAmJiAhcHJvalBrZ01hcC5oYXMocHJvaikpXG4gICAgICAgICAgcHJvalBrZ01hcC5zZXQocHJvaiwgW10pO1xuICAgICAgICBpZiAocHJvaiA9PSBudWxsICYmIHNyY0RpciAmJiAhc3JjUGtnTWFwLmhhcyhzcmNEaXIpKVxuICAgICAgICAgIHNyY1BrZ01hcC5zZXQoc3JjRGlyLCBbXSk7XG5cbiAgICAgICAgbG9nLmRlYnVnKCdzY2FuIHBhY2thZ2UuanNvbicsIGpzb25GaWxlKTtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvKGpzb25GaWxlLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbmZvLmpzb24uZHIgfHwgaW5mby5qc29uLnBsaW5rKSB7XG4gICAgICAgICAgcGtnTGlzdC5wdXNoKGluZm8pO1xuICAgICAgICAgIGlmIChwcm9qKVxuICAgICAgICAgICAgcHJvalBrZ01hcC5nZXQocHJvaikhLnB1c2goaW5mbyk7XG4gICAgICAgICAgZWxzZSBpZiAoc3JjRGlyKVxuICAgICAgICAgICAgc3JjUGtnTWFwLmdldChzcmNEaXIpIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxvZy5lcnJvcihgT3JwaGFuICR7anNvbkZpbGV9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nLmRlYnVnKGBQYWNrYWdlIG9mICR7anNvbkZpbGV9IGlzIHNraXBwZWQgKGR1ZSB0byBubyBcImRyXCIgb3IgXCJwbGlua1wiIHByb3BlcnR5KWAsIGluZm8uanNvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKS50b1Byb21pc2UoKTtcbiAgICAvLyBsb2cud2Fybihwcm9qUGtnTWFwLCBzcmNQa2dNYXApO1xuICAgIGZvciAoY29uc3QgW3ByaiwgcGtnc10gb2YgcHJvalBrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3NyY0RpciwgcGtnc10gb2Ygc3JjUGtnTWFwLmVudHJpZXMoKSkge1xuICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtwYXR0ZXJuOiBzcmNEaXIsIHBrZ3N9KTtcbiAgICB9XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICdjbGVhbiddKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICcubGlua3MnICYmIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCAnLmxpbmtzJykpKSB7XG4gICAgZnNleHQucmVtb3ZlKFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgJy5saW5rcycpKVxuICAgIC5jYXRjaChleCA9PiBsb2cuaW5mbyhleCkpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksIHN5bWxpbmtEaXJOYW1lIHx8ICdub2RlX21vZHVsZXMnKTtcbiAgZnNleHQubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcblxuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgaWYgKHdzLmluc3RhbGxlZENvbXBvbmVudHMpIHtcbiAgICAgIGZvciAoY29uc3QgcG5hbWUgb2Ygd3MuaW5zdGFsbGVkQ29tcG9uZW50cy5rZXlzKCkpXG4gICAgICAgIHBrZ05hbWVTZXQuYWRkKHBuYW1lKTtcbiAgICB9XG4gICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHN5bWxpbmtEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV19KTtcbiAgfVxuXG4gIGxldCBzeW1saW5rc1RvQ3JlYXRlID0gZnJvbShBcnJheS5mcm9tKHBrZ05hbWVTZXQudmFsdWVzKCkpKSAvLyBJbXBvcnRhbnQsIGRvIG5vdCB1c2UgcGtnTmFtZVNldCBpdGVyYWJsZSwgaXQgd2lsbCBiZSBjaGFuZ2VkIGJlZm9yZSBzdWJzY3JpcHRpb25cbiAgLnBpcGUoXG4gICAgbWFwKG5hbWUgPT4ge1xuICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkgfHwgd3MuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpITtcbiAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICBsb2cud2FybihgTWlzc2luZyBwYWNrYWdlIGluZm9ybWF0aW9uIG9mICR7bmFtZX0sIHBsZWFzZSBydW4gXCJQbGluayBzeW5jICR7d3NLZXl9XCIgYWdhaW4gdG8gc3luYyBQbGluayBzdGF0ZWApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHBrZztcbiAgICB9KSxcbiAgICBmaWx0ZXIocGtnID0+IHBrZyAhPSBudWxsKVxuICApO1xuXG4gIGlmIChyb290RGlyID09PSB3b3Jrc3BhY2VEaXIod3NLZXkpKSB7XG4gICAgY29uc3QgcGxpbmtQa2cgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwO1xuICAgIGlmIChwbGlua1BrZykge1xuICAgICAgcGtnTmFtZVNldC5hZGQocGxpbmtQa2cubmFtZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIHN5bWxpbmtzVG9DcmVhdGUucGlwZShcbiAgICAgIHN5bWJvbGljTGlua1BhY2thZ2VzKHN5bWxpbmtEaXIpXG4gICAgKSxcbiAgICBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoc3ltbGlua0RpciwgcGtnTmFtZVNldClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gX2RlbGV0ZVVzZWxlc3NTeW1saW5rKGNoZWNrRGlyOiBzdHJpbmcsIGV4Y2x1ZGVTZXQ6IFNldDxzdHJpbmc+KSB7XG4gIGNvbnN0IGRvbmVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgY29uc3QgZG9uZTEgPSBsaXN0TW9kdWxlU3ltbGlua3MoY2hlY2tEaXIsIGxpbmsgPT4ge1xuXG4gICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoY2hlY2tEaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIWV4Y2x1ZGVTZXQuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYERlbGV0ZSBleHRyYW5lb3VzIHN5bWxpbms6ICR7bGlua31gKTtcbiAgICAgIGRvbmVzLnB1c2goZnMucHJvbWlzZXMudW5saW5rKGxpbmspKTtcbiAgICB9XG4gIH0pO1xuICBhd2FpdCBkb25lMTtcbiAgYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm8ocGtKc29uRmlsZTogc3RyaW5nLCBpc0luc3RhbGxlZCA9IGZhbHNlKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSkgYXMgUGFja2FnZUluZm9bJ2pzb24nXTtcbiAgcmV0dXJuIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZSwganNvbiwgaXNJbnN0YWxsZWQpO1xufVxuLyoqXG4gKiBMaXN0IHRob3NlIGluc3RhbGxlZCBwYWNrYWdlcyB3aGljaCBhcmUgcmVmZXJlbmNlZCBieSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUsXG4gKiB0aG9zZSBwYWNrYWdlcyBtdXN0IGhhdmUgXCJkclwiIHByb3BlcnR5IGluIHBhY2thZ2UuanNvbiBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VLZXkgXG4gKi9cbmZ1bmN0aW9uKiBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IG9yaWdpbkluc3RhbGxKc29uID0gc3RhdGUud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSEub3JpZ2luSW5zdGFsbEpzb247XG4gIC8vIGNvbnN0IGRlcEpzb24gPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llc10gOlxuICAvLyAgIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc107XG4gIGZvciAoY29uc3QgZGVwcyBvZiBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdKSB7XG4gICAgaWYgKGRlcHMgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICBpZiAoIXN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXApICYmIGRlcCAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBranNvbkZpbGUpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlSW5mbyhcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKSwgdHJ1ZVxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaykge1xuICAgICAgICAgICAgeWllbGQgcGs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZTogc3RyaW5nLCBqc29uOiBQYWNrYWdlSW5mb1snanNvbiddLCBpc0luc3RhbGxlZCA9IGZhbHNlKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBtID0gbW9kdWxlTmFtZVJlZy5leGVjKGpzb24ubmFtZSk7XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgc2hvcnROYW1lOiBtIVsyXSxcbiAgICBuYW1lOiBqc29uLm5hbWUsXG4gICAgc2NvcGU6IG0hWzFdLFxuICAgIHBhdGg6IFBhdGguam9pbihzeW1saW5rRGlyTmFtZSwganNvbi5uYW1lKSxcbiAgICBqc29uLFxuICAgIHJlYWxQYXRoOiBmcy5yZWFscGF0aFN5bmMoUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpKSxcbiAgICBpc0luc3RhbGxlZFxuICB9O1xuICByZXR1cm4gcGtJbmZvO1xufVxuXG5mdW5jdGlvbiBjcChmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKGZyb20uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgZnJvbSA9IGFyZ3VtZW50c1sxXTtcbiAgICB0byA9IGFyZ3VtZW50c1syXTtcbiAgfVxuICBmc2V4dC5jb3B5U3luYyhmcm9tLCB0byk7XG4gIC8vIHNoZWxsLmNwKC4uLmFyZ3VtZW50cyk7XG4gIGlmICgvWy9cXFxcXSQvLnRlc3QodG8pKVxuICAgIHRvID0gUGF0aC5iYXNlbmFtZShmcm9tKTsgLy8gdG8gaXMgYSBmb2xkZXJcbiAgZWxzZVxuICAgIHRvID0gUGF0aC5yZWxhdGl2ZShwbGlua0Vudi53b3JrRGlyLCB0byk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdDb3B5IHRvICVzJywgY2hhbGsuY3lhbih0bykpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGZyb20gYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IHRvIHJlbGF0aXZlIHRvIHJvb3RQYXRoIFxuICovXG5mdW5jdGlvbiBtYXliZUNvcHlUZW1wbGF0ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCB0bykpKVxuICAgIGNwKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGZyb20pLCB0byk7XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NTdGF0ZSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSE7XG4gIGNvbnN0IGRvTm90aGluZyA9ICgpID0+IHt9O1xuICB3c1N0YXRlLmxpbmtlZERlcGVuZGVuY2llcy5jb25jYXQod3NTdGF0ZS5saW5rZWREZXZEZXBlbmRlbmNpZXMpLm1hcCgoW3BrZ05hbWVdKSA9PiB7XG4gICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIHBrZ05hbWUpO1xuICAgIHJldHVybiBmcy5wcm9taXNlcy5sc3RhdChkaXIpXG4gICAgLnRoZW4oKHN0YXQpID0+IHtcbiAgICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKGBQcmV2aW91cyBpbnN0YWxsZWQgJHtQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGRpcil9IGlzIGRlbGV0ZWQsIGR1ZSB0byBsaW5rZWQgcGFja2FnZSAke3BrZ05hbWV9YCk7XG4gICAgICAgIHJldHVybiBmcy5wcm9taXNlcy51bmxpbmsoZGlyKTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC5jYXRjaChkb05vdGhpbmcpO1xuICB9KTtcbn1cblxuIl19