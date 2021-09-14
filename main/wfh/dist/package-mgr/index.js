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
const helper_1 = require("../../../packages/redux-toolkit-observable/dist/helper");
// import { getRootDir } from '../utils/misc';
const symlinks_1 = __importStar(require("../utils/symlinks"));
const rwPackageJson_1 = require("../rwPackageJson");
const os_1 = require("os");
const log4js_1 = require("log4js");
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
    })), actionByTypes.workspaceStateUpdated.pipe((0, operators_1.map)(action => updatedWorkspaceSet.add(action.payload)), (0, operators_1.debounceTime)(800), (0, operators_1.tap)(() => {
        exports.actionDispatcher._workspaceBatchChanged(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
        // return from(writeConfigFiles());
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
        return (0, rxjs_1.merge)(...changedFiles.map((rel) => __awaiter(void 0, void 0, void 0, function* () {
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
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        log.debug('initRootDirectory');
        const rootPath = rootDir;
        fs_extra_1.default.mkdirpSync(distDir);
        // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), rootDir + '/.gitignore');
        yield (0, symlinks_1.default)();
        yield scanAndSyncPackages();
        // await _deleteUselessSymlink(Path.resolve(rootDir, 'node_modules'), new Set<string>());
    });
}
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
        // NPM v7.20.x can not install dependencies if there is any file with name prefix '_' exists in directory node_modules
        const legacyPkgSettingFile = path_1.default.resolve(dir, 'node_modules', '_package-settings.d.ts');
        if (fs_1.default.existsSync(legacyPkgSettingFile)) {
            fs_1.default.unlinkSync(legacyPkgSettingFile);
        }
        // 1. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
        // backup them for late recovery
        yield (0, symlinks_1.listModuleSymlinks)(target, link => {
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
        yield new Promise(resolve => setImmediate(resolve));
        // await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
            if (npmOpt.cache)
                env.npm_config_cache = npmOpt.cache;
            if (npmOpt.offline)
                env.npm_config_offline = 'true';
            const cmdArgs = [npmOpt.useNpmCi ? 'ci' : 'install'];
            yield (0, process_utils_1.exe)('npm', ...cmdArgs, { cwd: dir, env }).done;
            yield new Promise(resolve => setImmediate(resolve));
            yield (0, process_utils_1.exe)('npm', 'prune', { cwd: dir, env }).done;
            // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
            // why, I have to add a setImmediate() between them to workaround
            yield new Promise(resolve => setImmediate(resolve));
            try {
                yield (0, process_utils_1.exe)('npm', 'ddp', { cwd: dir, env }).promise;
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
        const isChina = yield getStore().pipe((0, operators_1.map)(s => s.isInChina), (0, operators_1.distinctUntilChanged)(), (0, operators_1.filter)(cn => cn != null), (0, operators_1.take)(1)).toPromise();
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
            yield rm.scanPackages().pipe((0, operators_1.tap)(([proj, jsonFile, srcDir]) => {
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
        exports.actionDispatcher.updateGitIgnores({
            file: path_1.default.resolve(rootDir, '.gitignore'),
            lines: [path_1.default.relative(rootDir, symlinkDir).replace(/\\/g, '/')]
        });
    }
    let symlinksToCreate = (0, rxjs_1.from)(pkgNameSet.values())
        .pipe((0, operators_1.map)(name => getState().srcPackages.get(name) || ws.installedComponents.get(name)));
    const workDir = workspaceDir(wsKey);
    if (workDir !== misc_1.plinkEnv.rootDir) {
        symlinksToCreate = (0, rxjs_1.concat)(symlinksToCreate, (0, rxjs_1.of)(getState().linkedDrcp || getState().installedDrcp));
    }
    return (0, rxjs_1.merge)(symlinksToCreate.pipe((0, rwPackageJson_1.symbolicLinkPackages)(symlinkDir)), _deleteUselessSymlink(symlinkDir, pkgNameSet));
}
function _deleteUselessSymlink(checkDir, excludeSet) {
    return __awaiter(this, void 0, void 0, function* () {
        const dones = [];
        const plinkPkg = getState().linkedDrcp || getState().installedDrcp;
        const drcpName = plinkPkg === null || plinkPkg === void 0 ? void 0 : plinkPkg.name;
        const done1 = (0, symlinks_1.listModuleSymlinks)(checkDir, link => {
            const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
            if ((drcpName == null || drcpName !== pkgName) && !excludeSet.has(pkgName)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCxrREFBMEI7QUFDMUIsd0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFtRjtBQUNuRiw4Q0FDMkY7QUFDM0Ysc0VBQWlHO0FBQ2pHLG9EQUF1QztBQUN2QyxzREFBbUU7QUFDbkUsb0NBQXlEO0FBQ3pELG1GQUEyRztBQUMzRyw4Q0FBOEM7QUFDOUMsOERBQW1HO0FBQ25HLG9EQUFzRDtBQUN0RCwyQkFBeUI7QUFDekIsbUNBQWlDO0FBQ2pDLHdDQUF5QztBQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsbUJBQW1CLENBQUMsQ0FBQztBQXNEM0MsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFN0UsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0FBQ3RCLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLE1BQU0sS0FBSyxHQUFrQjtJQUMzQixNQUFNLEVBQUUsS0FBSztJQUNiLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUNyQixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUMzQixlQUFlLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDMUIsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQixzQkFBc0IsRUFBRSxDQUFDO0lBQ3pCLGFBQWEsRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUM7Q0FDaEMsQ0FBQztBQXVDVyxRQUFBLEtBQUssR0FBRyxv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LGNBQWMsRUFBRSxFQUFFO2dCQUMxQixzQ0FBc0M7Z0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxzQ0FBc0MsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDM0csT0FBTyxZQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQzthQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNwQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVuZm9ydHVuYXRlbHksIHRoaXMgZmlsZSBpcyB2ZXJ5IGxvbmcsIHlvdSBuZWVkIHRvIGZvbGQgYnkgaW5kZW50aW9uIGZvciBiZXR0ZXIgdmlldyBvZiBzb3VyY2UgY29kZSBpbiBFZGl0b3JcbiAqL1xuXG5pbXBvcnQgeyBQYXlsb2FkQWN0aW9uIH0gZnJvbSAnQHJlZHV4anMvdG9vbGtpdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzZXh0IGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2Zyb20sIG1lcmdlLCBPYnNlcnZhYmxlLCBvZiwgZGVmZXIsIHRocm93RXJyb3IsIEVNUFRZLCBjb25jYXR9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBkZWJvdW5jZVRpbWUsIHRha2VXaGlsZSxcbiAgdGFrZSwgY29uY2F0TWFwLCBpZ25vcmVFbGVtZW50cywgc2NhbiwgY2F0Y2hFcnJvciwgdGFwLCBmaW5hbGl6ZSB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGxpc3RDb21wRGVwZW5kZW5jeSwgUGFja2FnZUpzb25JbnRlcmYsIERlcGVuZGVudEluZm8gfSBmcm9tICcuLi90cmFuc2l0aXZlLWRlcC1ob2lzdGVyJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgc2V0UHJvamVjdExpc3QsIHNldExpbmtQYXR0ZXJuc30gZnJvbSAnLi4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQge2lzQWN0aW9uT2ZDcmVhdG9yLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9oZWxwZXInO1xuLy8gaW1wb3J0IHsgZ2V0Um9vdERpciB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGNsZWFuSW52YWxpZFN5bWxpbmtzLCB7IGlzV2luMzIsIGxpc3RNb2R1bGVTeW1saW5rcywgdW5saW5rQXN5bmMgfSBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQge3N5bWJvbGljTGlua1BhY2thZ2VzfSBmcm9tICcuLi9yd1BhY2thZ2VKc29uJztcbmltcG9ydCB7IEVPTCB9IGZyb20gJ29zJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHsgcGxpbmtFbnYgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1tZ3InKTtcbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjb3BlOiBzdHJpbmc7XG4gIHNob3J0TmFtZTogc3RyaW5nO1xuICBqc29uOiB7XG4gICAgcGxpbms/OiBQbGlua0pzb25UeXBlO1xuICAgIGRyPzogUGxpbmtKc29uVHlwZTtcbiAgICBbcDogc3RyaW5nXTogYW55O1xuICB9ICYgUGFja2FnZUpzb25JbnRlcmY7XG4gIC8qKiBCZSBhd2FyZTogSWYgdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc2FtZSBhcyBcInJlYWxQYXRoXCIsXG4gICAqIHRoZW4gaXQgaXMgYSBzeW1saW5rIHdob3NlIHBhdGggaXMgcmVsYXRpdmUgdG8gd29ya3NwYWNlIGRpcmVjdG9yeSAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG4gIGlzSW5zdGFsbGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgdHlwZSBQbGlua0pzb25UeXBlID0ge1xuICB0eXBlUm9vdD86IHN0cmluZztcbiAgdHlwZT86ICdzZXJ2ZXInIHwgc3RyaW5nW10gfCBzdHJpbmc7XG4gIHNlcnZlclByaW9yaXR5Pzogc3RyaW5nIHwgbnVtYmVyO1xuICBzZXJ2ZXJFbnRyeT86IHN0cmluZztcbiAgc2V0dGluZz86IHtcbiAgICAvKiogSW4gZm9ybSBvZiBcIjxwYXRoPiM8ZXhwb3J0LW5hbWU+XCIgKi9cbiAgICB0eXBlOiBzdHJpbmc7XG4gICAgLyoqIEluIGZvcm0gb2YgXCI8bW9kdWxlLXBhdGg+IzxleHBvcnQtbmFtZT5cIiAqL1xuICAgIHZhbHVlOiBzdHJpbmc7XG4gIH07XG4gIFtwOiBzdHJpbmddOiBhbnk7XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBucG1JbnN0YWxsT3B0OiBOcG1PcHRpb25zO1xuICBpbml0ZWQ6IGJvb2xlYW47XG4gIHNyY1BhY2thZ2VzOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG4gIC8qKiBLZXkgaXMgcmVsYXRpdmUgcGF0aCB0byByb290IHdvcmtzcGFjZSAqL1xuICB3b3Jrc3BhY2VzOiBNYXA8c3RyaW5nLCBXb3Jrc3BhY2VTdGF0ZT47XG4gIC8qKiBrZXkgb2YgY3VycmVudCBcIndvcmtzcGFjZXNcIiAqL1xuICBjdXJyV29ya3NwYWNlPzogc3RyaW5nIHwgbnVsbDtcbiAgcHJvamVjdDJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICBzcmNEaXIyUGFja2FnZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgLyoqIERyY3AgaXMgdGhlIG9yaWdpbmFsIG5hbWUgb2YgUGxpbmsgcHJvamVjdCAqL1xuICBsaW5rZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBsaW5rZWREcmNwUHJvamVjdD86IHN0cmluZyB8IG51bGw7XG4gIGluc3RhbGxlZERyY3A/OiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGdpdElnbm9yZXM6IHtbZmlsZTogc3RyaW5nXTogc3RyaW5nW119O1xuICBpc0luQ2hpbmE/OiBib29sZWFuO1xuICAvKiogRXZlcnl0aW1lIGEgaG9pc3Qgd29ya3NwYWNlIHN0YXRlIGNhbGN1bGF0aW9uIGlzIGJhc2ljYWxseSBkb25lLCBpdCBpcyBpbmNyZWFzZWQgYnkgMSAqL1xuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICBwYWNrYWdlc1VwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG4gIC8qKiB3b3Jrc3BhY2Uga2V5ICovXG4gIGxhc3RDcmVhdGVkV29ya3NwYWNlPzogc3RyaW5nO1xufVxuXG5jb25zdCB7ZGlzdERpciwgcm9vdERpciwgcGxpbmtEaXIsIGlzRHJjcFN5bWxpbmssIHN5bWxpbmtEaXJOYW1lfSA9IHBsaW5rRW52O1xuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIGluaXRlZDogZmFsc2UsXG4gIHdvcmtzcGFjZXM6IG5ldyBNYXAoKSxcbiAgcHJvamVjdDJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNEaXIyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgZ2l0SWdub3Jlczoge30sXG4gIHdvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtOiAwLFxuICBwYWNrYWdlc1VwZGF0ZUNoZWNrc3VtOiAwLFxuICBucG1JbnN0YWxsT3B0OiB7aXNGb3JjZTogZmFsc2V9XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZVN0YXRlIHtcbiAgaWQ6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBsaW5rZWQgc291cmNlIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvKiogbmFtZXMgb2YgdGhvc2UgbGlua2VkIHNvdXJjZSBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvKiogaW5zdGFsbGVkIERSIGNvbXBvbmVudCBwYWNrYWdlcyBbbmFtZSwgdmVyc2lvbl0qL1xuICBpbnN0YWxsZWRDb21wb25lbnRzPzogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuXG4gIGhvaXN0SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGhvaXN0UGVlckRlcEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuXG4gIGhvaXN0RGV2SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGhvaXN0RGV2UGVlckRlcEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuXG4gIGhvaXN0SW5mb1N1bW1hcnk/OiB7XG4gICAgLyoqIFVzZXIgc2hvdWxkIG1hbnVsbHkgYWRkIHRoZW0gYXMgZGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZSAqL1xuICAgIG1pc3NpbmdEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgLyoqIFVzZXIgc2hvdWxkIG1hbnVsbHkgYWRkIHRoZW0gYXMgZGV2RGVwZW5kZW5jaWVzIG9mIHdvcmtzcGFjZSAqL1xuICAgIG1pc3NpbmdEZXZEZXBzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gICAgLyoqIHZlcnNpb25zIGFyZSBjb25mbGljdCAqL1xuICAgIGNvbmZsaWN0RGVwczogc3RyaW5nW107XG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTnBtT3B0aW9ucyB7XG4gIGNhY2hlPzogc3RyaW5nO1xuICBpc0ZvcmNlOiBib29sZWFuO1xuICB1c2VOcG1DaT86IGJvb2xlYW47XG4gIG9mZmxpbmU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiBOUyxcbiAgaW5pdGlhbFN0YXRlOiBzdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogRG8gdGhpcyBhY3Rpb24gYWZ0ZXIgYW55IGxpbmtlZCBwYWNrYWdlIGlzIHJlbW92ZWQgb3IgYWRkZWQgICovXG4gICAgaW5pdFJvb3REaXIoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPE5wbU9wdGlvbnM+KSB7XG4gICAgICBkLm5wbUluc3RhbGxPcHQuY2FjaGUgPSBwYXlsb2FkLmNhY2hlO1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LnVzZU5wbUNpID0gcGF5bG9hZC51c2VOcG1DaTtcbiAgICB9LFxuXG4gICAgLyoqIFxuICAgICAqIC0gQ3JlYXRlIGluaXRpYWwgZmlsZXMgaW4gcm9vdCBkaXJlY3RvcnlcbiAgICAgKiAtIFNjYW4gbGlua2VkIHBhY2thZ2VzIGFuZCBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgICAqIC0gU3dpdGNoIHRvIGRpZmZlcmVudCB3b3Jrc3BhY2VcbiAgICAgKiAtIERlbGV0ZSBub25leGlzdGluZyB3b3Jrc3BhY2VcbiAgICAgKiAtIElmIFwicGFja2FnZUpzb25GaWxlc1wiIGlzIHByb3ZpZGVkLCBpdCBzaG91bGQgc2tpcCBzdGVwIG9mIHNjYW5uaW5nIGxpbmtlZCBwYWNrYWdlc1xuICAgICAqIC0gVE9ETzogaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgaG9pc3QgYW5kIGluc3RhbGwgZm9yIHRoZW0gYWxsP1xuICAgICAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e1xuICAgICAgZGlyOiBzdHJpbmc7XG4gICAgICAvLyBjcmVhdGVIb29rOiBib29sZWFuO1xuICAgICAgcGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdO1xuICAgIH0gJiBOcG1PcHRpb25zPikge1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LmNhY2hlID0gcGF5bG9hZC5jYWNoZTtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC51c2VOcG1DaSA9IHBheWxvYWQudXNlTnBtQ2k7XG4gICAgfSxcbiAgICBzY2FuQW5kU3luY1BhY2thZ2VzKGQ6IFBhY2thZ2VzU3RhdGUsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7cGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHtcbiAgICB9LFxuXG4gICAgdXBkYXRlRGlyKCkge30sXG4gICAgX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oZCkge1xuICAgICAgY29uc3QgcGxpbmtQa2cgPSBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUocGxpbmtEaXIsICdwYWNrYWdlLmpzb24nKSwgZmFsc2UpO1xuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IG51bGw7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBwYXRoVG9Qcm9qS2V5KFBhdGguZGlybmFtZShkLmxpbmtlZERyY3AucmVhbFBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQubGlua2VkRHJjcCA9IG51bGw7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IHBsaW5rUGtnO1xuICAgICAgICBkLmxpbmtlZERyY3BQcm9qZWN0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFtwa2dzOiBQYWNrYWdlSW5mb1tdLCBvcGVyYXRvcjogJ3VwZGF0ZScgfCAnY2xlYW4nXT4pIHtcbiAgICAgIGQuaW5pdGVkID0gdHJ1ZTtcbiAgICAgIGxldCBtYXAgPSBkLnNyY1BhY2thZ2VzO1xuICAgICAgaWYgKHBheWxvYWRbMV0gPT09ICdjbGVhbicpIHtcbiAgICAgICAgbWFwID0gZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz4oKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWRbMF0pIHtcbiAgICAgICAgbWFwLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBhZGRTcmNEaXJzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnNyY0RpcjJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlU3JjRGlycyhkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgLyoqIHBheWxvYWQ6IHdvcmtzcGFjZSBrZXlzLCBoYXBwZW5zIGFzIGRlYm91bmNlZCB3b3Jrc3BhY2UgY2hhbmdlIGV2ZW50ICovXG4gICAgX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICAvKiogd29ya3NwYWNlQ2hhbmdlZCBpcyBzYWZlIGZvciBleHRlcm5hbCBtb2R1bGUgdG8gd2F0Y2gsIGl0IHNlcmlhbGl6ZSBhY3Rpb25zIGxpa2UgXCJfaW5zdGFsbFdvcmtzcGFjZVwiIGFuZCBcIl93b3Jrc3BhY2VCYXRjaENoYW5nZWRcIiAqL1xuICAgIHdvcmtzcGFjZUNoYW5nZWQoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdXBkYXRlR2l0SWdub3JlcyhkLCB7cGF5bG9hZDoge2ZpbGUsIGxpbmVzfX06IFBheWxvYWRBY3Rpb248e2ZpbGU6IHN0cmluZzsgbGluZXM6IHN0cmluZ1tdfT4pIHtcbiAgICAgIGxldCByZWwgPSBmaWxlLCBhYnMgPSBmaWxlO1xuICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShmaWxlKSkge1xuICAgICAgICByZWwgPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIGZpbGUpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgYWJzID0gZmlsZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFicyA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBmaWxlKTtcbiAgICAgIH1cbiAgICAgIGlmIChkLmdpdElnbm9yZXNbYWJzXSkge1xuICAgICAgICBkZWxldGUgZC5naXRJZ25vcmVzW2Fic107XG4gICAgICB9XG4gICAgICBkLmdpdElnbm9yZXNbcmVsXSA9IGxpbmVzLm1hcChsaW5lID0+IGxpbmUuc3RhcnRzV2l0aCgnLycpID8gbGluZSA6ICcvJyArIGxpbmUpO1xuICAgIH0sXG4gICAgcGFja2FnZXNVcGRhdGVkKGQpIHtcbiAgICAgIGQucGFja2FnZXNVcGRhdGVDaGVja3N1bSsrO1xuICAgIH0sXG4gICAgc2V0SW5DaGluYShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Ym9vbGVhbj4pIHtcbiAgICAgIGQuaXNJbkNoaW5hID0gcGF5bG9hZDtcbiAgICB9LFxuICAgIF9zZXRDdXJyZW50V29ya3NwYWNlKGQsIHtwYXlsb2FkOiBkaXJ9OiBQYXlsb2FkQWN0aW9uPHN0cmluZyB8IG51bGw+KSB7XG4gICAgICBpZiAoZGlyICE9IG51bGwpXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgZWxzZVxuICAgICAgICBkLmN1cnJXb3Jrc3BhY2UgPSBudWxsO1xuICAgIH0sXG4gICAgLyoqIHBhcmFtdGVyOiB3b3Jrc3BhY2Uga2V5ICovXG4gICAgd29ya3NwYWNlU3RhdGVVcGRhdGVkKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7XG4gICAgICBkLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtICs9IDE7XG4gICAgfSxcbiAgICAvLyBvbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKGQsIHtwYXlsb2FkOiB3b3Jrc3BhY2VLZXl9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHt9LFxuICAgIF9ob2lzdFdvcmtzcGFjZURlcHMoc3RhdGUsIHtwYXlsb2FkOiB7ZGlyfX06IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nfT4pIHtcbiAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCJzcmNQYWNrYWdlc1wiIGlzIG51bGwsIG5lZWQgdG8gcnVuIGBpbml0YCBjb21tYW5kIGZpcnN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGxldCBwa2pzb25TdHI6IHN0cmluZztcbiAgICAgIGNvbnN0IHBrZ2pzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oJ1BsaW5rIGluaXQvc3luYyBwcm9jZXNzIHdhcyBpbnRlcnJ1cHRlZCBsYXN0IHRpbWUsIHJlY292ZXIgY29udGVudCBvZiAnICsgcGtnanNvbkZpbGUpO1xuICAgICAgICBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMobG9ja0ZpbGUsICd1dGY4Jyk7XG4gICAgICAgIGZzLnVubGlua1N5bmMobG9ja0ZpbGUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHBrZ2pzb25GaWxlLCAndXRmOCcpO1xuICAgICAgfVxuICAgICAgY29uc3QgcGtqc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IEpTT04ucGFyc2UocGtqc29uU3RyKTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwcyBvZiBbcGtqc29uLmRlcGVuZGVuY2llcywgcGtqc29uLmRldkRlcGVuZGVuY2llc10gYXMge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9W10gKSB7XG4gICAgICAvLyAgIE9iamVjdC5lbnRyaWVzKGRlcHMpO1xuICAgICAgLy8gfVxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIC8vIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRldkRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgICAgLy8gY29uc3QgdXBkYXRpbmdEZXZEZXBzID0gey4uLnBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiB0eXBlb2YgZGV2RGVwcyA9IFtdO1xuICAgICAgZGV2RGVwcy5mb3JFYWNoKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgY29uc3Qge2hvaXN0ZWQ6IGhvaXN0ZWREZXBzLCBob2lzdGVkUGVlcnM6IGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0ZWREZXY6IGhvaXN0ZWREZXZEZXBzLCBob2lzdGVkRGV2UGVlcnM6IGRldkhvaXN0UGVlckRlcEluZm9cbiAgICAgIH0gPVxuICAgICAgICBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgICAgc3RhdGUuc3JjUGFja2FnZXMsIHdzS2V5LCBwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9LCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLmZpbHRlcigoW25hbWVdKSA9PiAhaXNEcmNwU3ltbGluayB8fCBuYW1lICE9PSAnQHdmaC9wbGluaycpXG4gICAgICAgIC5yZWR1Y2UoKGRpYywgW25hbWUsIGluZm9dKSA9PiB7XG4gICAgICAgICAgZGljW25hbWVdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgcmV0dXJuIGRpYztcbiAgICAgICAgfSwge30gYXMge1trZXk6IHN0cmluZ106IHN0cmluZ30pLFxuXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGV2RGVwcy5lbnRyaWVzKCkpXG4gICAgICAgIC5jb25jYXQoQXJyYXkuZnJvbShkZXZIb2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkuZmlsdGVyKGl0ZW0gPT4gIWl0ZW1bMV0ubWlzc2luZykpXG4gICAgICAgIC5maWx0ZXIoKFtuYW1lXSkgPT4gIWlzRHJjcFN5bWxpbmsgfHwgbmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KVxuICAgICAgfTtcblxuICAgICAgLy8gbG9nLndhcm4oaW5zdGFsbEpzb24pO1xuICAgICAgLy8gY29uc3QgaW5zdGFsbGVkQ29tcCA9IHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShzdGF0ZS53b3Jrc3BhY2VzLCBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXkpO1xuXG4gICAgICBjb25zdCBleGlzdGluZyA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcblxuICAgICAgY29uc3QgaG9pc3RJbmZvU3VtbWFyeTogV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mb1N1bW1hcnknXSA9IHtcbiAgICAgICAgY29uZmxpY3REZXBzOiBbXSwgbWlzc2luZ0RlcHM6IHt9LCBtaXNzaW5nRGV2RGVwczoge31cbiAgICAgIH07XG5cbiAgICAgIGZvciAoY29uc3QgZGVwc0luZm8gb2YgW2hvaXN0ZWREZXBzLCBob2lzdFBlZXJEZXBJbmZvXSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtkZXAsIGluZm9dIG9mIGRlcHNJbmZvLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChpbmZvLm1pc3NpbmcpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkubWlzc2luZ0RlcHNbZGVwXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWluZm8uc2FtZVZlciAmJiAhaW5mby5kaXJlY3QpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkuY29uZmxpY3REZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZGVwc0luZm8gb2YgW2hvaXN0ZWREZXZEZXBzLCBkZXZIb2lzdFBlZXJEZXBJbmZvXSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtkZXAsIGluZm9dIG9mIGRlcHNJbmZvLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChpbmZvLm1pc3NpbmcpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkubWlzc2luZ0RldkRlcHNbZGVwXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWluZm8uc2FtZVZlciAmJiAhaW5mby5kaXJlY3QpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkuY29uZmxpY3REZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBpZDogd3NLZXksXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcyxcbiAgICAgICAgaG9pc3RJbmZvOiBob2lzdGVkRGVwcyxcbiAgICAgICAgaG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3REZXZJbmZvOiBob2lzdGVkRGV2RGVwcyxcbiAgICAgICAgaG9pc3REZXZQZWVyRGVwSW5mbzogZGV2SG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3RJbmZvU3VtbWFyeVxuICAgICAgfTtcbiAgICAgIHN0YXRlLmxhc3RDcmVhdGVkV29ya3NwYWNlID0gd3NLZXk7XG4gICAgICBzdGF0ZS53b3Jrc3BhY2VzLnNldCh3c0tleSwgZXhpc3RpbmcgPyBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCB3cCkgOiB3cCk7XG4gICAgfSxcbiAgICBfaW5zdGFsbFdvcmtzcGFjZShkLCB7cGF5bG9hZDoge3dvcmtzcGFjZUtleX19OiBQYXlsb2FkQWN0aW9uPHt3b3Jrc3BhY2VLZXk6IHN0cmluZ30+KSB7fSxcbiAgICAvLyBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHt9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9QcmooZCwge3BheWxvYWQ6IHtwcmosIHBrZ3N9fTogUGF5bG9hZEFjdGlvbjx7cHJqOiBzdHJpbmc7IHBrZ3M6IHtuYW1lOiBzdHJpbmd9W119Pikge1xuICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChwYXRoVG9Qcm9qS2V5KHByaiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKGQsXG4gICAgICB7cGF5bG9hZDoge3BhdHRlcm4sIHBrZ3N9fTogUGF5bG9hZEFjdGlvbjx7cGF0dGVybjogc3RyaW5nOyBwa2dzOiB7bmFtZTogc3RyaW5nfVtdfT4pIHtcbiAgICAgIGQuc3JjRGlyMlBhY2thZ2VzLnNldChwYXRoVG9Qcm9qS2V5KHBhdHRlcm4pLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5leHBvcnQgY29uc3Qge3VwZGF0ZUdpdElnbm9yZXMsIG9uTGlua2VkUGFja2FnZUFkZGVkfSA9IGFjdGlvbkRpc3BhdGNoZXI7XG5cbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIGNvbnN0IHVwZGF0ZWRXb3Jrc3BhY2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZUFkZGVkTGlzdCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG5cbiAgY29uc3QgZ2l0SWdub3JlRmlsZXNXYWl0aW5nID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgaWYgKGdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzID09IG51bGwpIHtcbiAgICAvLyBCZWNhdXNlIHNyY0RpcjJQYWNrYWdlcyBpcyBuZXdseSBhZGRlZCwgdG8gYXZvaWQgZXhpc3RpbmcgcHJvamVjdFxuICAgIC8vIGJlaW5nIGJyb2tlbiBmb3IgbWlzc2luZyBpdCBpbiBwcmV2aW91c2x5IHN0b3JlZCBzdGF0ZSBmaWxlXG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gcy5zcmNEaXIyUGFja2FnZXMgPSBuZXcgTWFwKCkpO1xuICB9XG4gIGNvbnN0IGFjdGlvbkJ5VHlwZXMgPSBjYXN0QnlBY3Rpb25UeXBlKHNsaWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgLy8gVG8gb3ZlcnJpZGUgc3RvcmVkIHN0YXRlLiBcbiAgICAvLyBEbyBub3QgcHV0IGZvbGxvd2luZyBsb2dpYyBpbiBpbml0aWFsU3RhdGUhIEl0IHdpbGwgYmUgb3ZlcnJpZGRlbiBieSBwcmV2aW91c2x5IHNhdmVkIHN0YXRlXG5cbiAgICBkZWZlcigoKSA9PiB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSk7XG4gICAgICByZXR1cm4gRU1QVFk7XG4gICAgfSksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHBrcyA9PiB7XG4gICAgICAgIHNldFByb2plY3RMaXN0KGdldFByb2plY3RMaXN0KCkpO1xuICAgICAgICByZXR1cm4gcGtzO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY0RpcjJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZmlsdGVyKHYgPT4gdiAhPSBudWxsKSxcbiAgICAgIG1hcCgobGlua1BhdHRlcm5NYXApID0+IHtcbiAgICAgICAgc2V0TGlua1BhdHRlcm5zKGxpbmtQYXR0ZXJuTWFwLmtleXMoKSk7XG4gICAgICB9KSksXG5cbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2NhbjxQYWNrYWdlc1N0YXRlWydzcmNQYWNrYWdlcyddPigocHJldk1hcCwgY3Vyck1hcCkgPT4ge1xuICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnNwbGljZSgwKTtcbiAgICAgICAgZm9yIChjb25zdCBubSBvZiBjdXJyTWFwLmtleXMoKSkge1xuICAgICAgICAgIGlmICghcHJldk1hcC5oYXMobm0pKSB7XG4gICAgICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnB1c2gobm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocGFja2FnZUFkZGVkTGlzdC5sZW5ndGggPiAwKVxuICAgICAgICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKHBhY2thZ2VBZGRlZExpc3QpO1xuICAgICAgICByZXR1cm4gY3Vyck1hcDtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uQnlUeXBlcy51cGRhdGVXb3Jrc3BhY2UucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWQ6IHtkaXIsIGlzRm9yY2UsIHVzZU5wbUNpLCBwYWNrYWdlSnNvbkZpbGVzfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UoZGlyKTtcbiAgICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgUGF0aC5yZXNvbHZlKGRpciwgJ2FwcC5qcycpKTtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkgfHwgaXNGb3JjZSB8fCB1c2VOcG1DaSkge1xuICAgICAgICAgIC8vIENoYW5pbmcgaW5zdGFsbEpzb25TdHIgdG8gZm9yY2UgYWN0aW9uIF9pbnN0YWxsV29ya3NwYWNlIGJlaW5nIGRpc3BhdGNoZWQgbGF0ZXJcbiAgICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICAvLyBjbGVhbiB0byB0cmlnZ2VyIGluc3RhbGwgYWN0aW9uXG4gICAgICAgICAgICAgIGNvbnN0IHdzID0gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgd3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZpbmcgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHBhY2thZ2VKc29uRmlsZXMgIT0gbnVsbCA/IHNjYW5BbmRTeW5jUGFja2FnZXMocGFja2FnZUpzb25GaWxlcykgOlxuICAgICAgICAgICAgZGVmZXIoKCkgPT4gb2YoaW5pdFJvb3REaXJlY3RvcnkoKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb25CeVR5cGVzLnNjYW5BbmRTeW5jUGFja2FnZXMucGlwZShcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICBzY2FuQW5kU3luY1BhY2thZ2VzKHBheWxvYWQucGFja2FnZUpzb25GaWxlcyksXG4gICAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX3N5bmNMaW5rZWRQYWNrYWdlcyksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgY3VycldzID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBpZiAod3NLZXkgIT09IGN1cnJXcylcbiAgICAgICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyOiBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXkpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGN1cnJXcyAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIFwiY3VycmVudCB3b3Jrc3BhY2VcIiBpcyB0aGUgbGFzdCBvbmUgYmVpbmcgdXBkYXRlZCwgc28gdGhhdCBpdCByZW1haW5zIFwiY3VycmVudFwiXG4gICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCBjdXJyV3MpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb25CeVR5cGVzLmluaXRSb290RGlyLnBpcGUoXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBsaW5rRW52LndvcmtEaXIsXG4gICAgICAgICAgICAuLi5wYXlsb2FkfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY3VyciA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgICAgICBpZiAoY3VyciAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyhjdXJyKSkge1xuICAgICAgICAgICAgICBjb25zdCBwYXRoID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnIpO1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwYXRoLCAuLi5wYXlsb2FkfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuXG4gICAgYWN0aW9uQnlUeXBlcy5faG9pc3RXb3Jrc3BhY2VEZXBzLnBpcGUoXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gICAgICAgIC8vIGFjdGlvbkRpc3BhdGNoZXIub25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG4gICAgICAgIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod3NLZXkpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQod3NLZXkpKTtcbiAgICAgIH0pXG4gICAgKSxcblxuICAgIGFjdGlvbkJ5VHlwZXMudXBkYXRlRGlyLnBpcGUoXG4gICAgICB0YXAoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGxpbmtQYWNrYWdlSW5mbygpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpLFxuICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uoa2V5KTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuICAgIC8vIEhhbmRsZSBuZXdseSBhZGRlZCB3b3Jrc3BhY2VcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAod3MgPT4ge1xuICAgICAgICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbSh3cy5rZXlzKCkpO1xuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0pLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgIGxvZy5pbmZvKCdOZXcgd29ya3NwYWNlOiAnLCBuZXdBZGRlZCk7XG4gICAgICAgICAgZm9yIChjb25zdCB3cyBvZiBuZXdBZGRlZCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiB3c30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBvYnNlcnZlIGFsbCBleGlzdGluZyBXb3Jrc3BhY2VzIGZvciBkZXBlbmRlbmN5IGhvaXN0aW5nIHJlc3VsdCBcbiAgICAuLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgLy8gZmlsdGVyKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgdGFrZVdoaWxlKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpISksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLmluc3RhbGxKc29uID09PSBzMi5pbnN0YWxsSnNvbiksXG4gICAgICAgIHNjYW48V29ya3NwYWNlU3RhdGU+KChvbGQsIG5ld1dzKSA9PiB7XG4gICAgICAgICAgLyogZXNsaW50LWRpc2FibGUgbWF4LWxlbiAqL1xuICAgICAgICAgIGNvbnN0IG5ld0RlcHMgPSBPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gZm9yY2luZyBpbnN0YWxsIHdvcmtzcGFjZSwgdGhlcmVmb3JlIGRlcGVuZGVuY2llcyBpcyBjbGVhcmVkIGF0IHRoaXMgbW9tZW50XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG9sZERlcHMgPSBPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG5cbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggIT09IG9sZERlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBsb2cuZGVidWcoJ25ld0RlcHMubGVuZ3RoJywgbmV3RGVwcy5sZW5ndGgsICcgIT09IG9sZERlcHMubGVuZ3RoJywgb2xkRGVwcy5sZW5ndGgpO1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RGVwcy5zb3J0KCk7XG4gICAgICAgICAgb2xkRGVwcy5zb3J0KCk7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuZXdEZXBzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5ld0RlcHNbaV0gIT09IG9sZERlcHNbaV0pIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSksXG4gICAgLy8gX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZCB3aWxsIHRyaWdnZXIgY3JlYXRpbmcgc3ltbGlua3MsIGJ1dCBtZWFud2hpbGUgX2luc3RhbGxXb3Jrc3BhY2Ugd2lsbCBkZWxldGUgc3ltbGlua3NcbiAgICAvLyBJIGRvbid0IHdhbnQgdG8gc2VlbSB0aGVtIHJ1bm5pbmcgc2ltdWx0YW5lb3VzbHkuXG4gICAgbWVyZ2UoYWN0aW9uQnlUeXBlcy5fd29ya3NwYWNlQmF0Y2hDaGFuZ2VkLCBhY3Rpb25CeVR5cGVzLl9pbnN0YWxsV29ya3NwYWNlKS5waXBlKFxuICAgICAgY29uY2F0TWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGlmIChpc0FjdGlvbk9mQ3JlYXRvcihhY3Rpb24sIHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpKSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXkgPSBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXk7XG4gICAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3NLZXkpKSxcbiAgICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgY29uY2F0TWFwKHdzID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbGxXb3Jrc3BhY2Uod3MhLCBnZXRTdGF0ZSgpLm5wbUluc3RhbGxPcHQpO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgICB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKHdzS2V5KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNBY3Rpb25PZkNyZWF0b3IoYWN0aW9uLCBzbGljZS5hY3Rpb25zLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQpKSB7XG4gICAgICAgICAgY29uc3Qgd3NLZXlzID0gYWN0aW9uLnBheWxvYWQ7XG4gICAgICAgICAgcmV0dXJuIG1lcmdlKC4uLndzS2V5cy5tYXAoX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKSkucGlwZShcbiAgICAgICAgICAgIGZpbmFsaXplKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlQ2hhbmdlZCh3c0tleXMpKVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIEVNUFRZO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG5cbiAgICBhY3Rpb25CeVR5cGVzLndvcmtzcGFjZVN0YXRlVXBkYXRlZC5waXBlKFxuICAgICAgbWFwKGFjdGlvbiA9PiB1cGRhdGVkV29ya3NwYWNlU2V0LmFkZChhY3Rpb24ucGF5bG9hZCkpLFxuICAgICAgZGVib3VuY2VUaW1lKDgwMCksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQoQXJyYXkuZnJvbSh1cGRhdGVkV29ya3NwYWNlU2V0LnZhbHVlcygpKSk7XG4gICAgICAgIHVwZGF0ZWRXb3Jrc3BhY2VTZXQuY2xlYXIoKTtcbiAgICAgICAgLy8gcmV0dXJuIGZyb20od3JpdGVDb25maWdGaWxlcygpKTtcbiAgICAgIH0pLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5wYWNrYWdlc1VwZGF0ZWQoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb25CeVR5cGVzLnVwZGF0ZUdpdElnbm9yZXMucGlwZShcbiAgICAgIHRhcChhY3Rpb24gPT4ge1xuICAgICAgICBsZXQgcmVsID0gYWN0aW9uLnBheWxvYWQuZmlsZTtcbiAgICAgICAgaWYgKFBhdGguaXNBYnNvbHV0ZShyZWwpKSB7XG4gICAgICAgICAgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCByZWwpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgfVxuICAgICAgICBnaXRJZ25vcmVGaWxlc1dhaXRpbmcuYWRkKHJlbCk7XG4gICAgICB9KSxcbiAgICAgIGRlYm91bmNlVGltZSg1MDApLFxuICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbmdlZEZpbGVzID0gWy4uLmdpdElnbm9yZUZpbGVzV2FpdGluZy52YWx1ZXMoKV07XG4gICAgICAgIGdpdElnbm9yZUZpbGVzV2FpdGluZy5jbGVhcigpO1xuICAgICAgICByZXR1cm4gY2hhbmdlZEZpbGVzO1xuICAgICAgfSksXG4gICAgICBjb25jYXRNYXAoKGNoYW5nZWRGaWxlcykgPT4ge1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uY2hhbmdlZEZpbGVzLm1hcChhc3luYyByZWwgPT4ge1xuICAgICAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgcmVsKTtcbiAgICAgICAgICBjb25zdCBsaW5lcyA9IGdldFN0YXRlKCkuZ2l0SWdub3Jlc1tmaWxlXTtcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlKSkge1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZpbGUsICd1dGY4Jyk7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmVzID0gZGF0YS5zcGxpdCgvXFxuXFxyPy8pLm1hcChsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld0xpbmVzID0gXy5kaWZmZXJlbmNlKGxpbmVzLCBleGlzdGluZ0xpbmVzKTtcbiAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlLCBkYXRhICsgRU9MICsgbmV3TGluZXMuam9pbihFT0wpLCAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdNb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkU3JjRGlycywgc2xpY2UuYWN0aW9ucy5kZWxldGVTcmNEaXJzKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyKTtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycik7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFBhY2thZ2VzU3RhdGU+IHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1Byb2pLZXkocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm9qS2V5VG9QYXRoKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLmlzQWJzb2x1dGUoa2V5KSA/IGtleSA6IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlRGlyKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdExpc3QoKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUocm9vdERpciwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBtZWFudCB0byB0cmlnZ2VyIGVkaXRvci1oZWxwZXIgdG8gdXBkYXRlIHRzY29uZmlnIGZpbGVzLCBzb1xuICogZWRpdG9yLWhlbHBlciBtdXN0IGJlIGltcG9ydCBhdCBmaXJzdFxuICogQHBhcmFtIGRpciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaEN1cnJlbnRXb3Jrc3BhY2UoZGlyOiBzdHJpbmcpIHtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICBhY3Rpb25EaXNwYXRjaGVyLl93b3Jrc3BhY2VCYXRjaENoYW5nZWQoW3dvcmtzcGFjZUtleShkaXIpXSk7XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBjb25zdCBwa2dFbnRyeSA9IHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShnZXRTdGF0ZSgpLCB3c0tleSk7XG5cbiAgY29uc3QgaW5zdGFsbGVkID0gbmV3IE1hcCgoZnVuY3Rpb24qKCk6IEdlbmVyYXRvcjxbc3RyaW5nLCBQYWNrYWdlSW5mb10+IHtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ0VudHJ5KSB7XG4gICAgICB5aWVsZCBbcGsubmFtZSwgcGtdO1xuICAgIH1cbiAgfSkoKSk7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5nZXQod3NLZXkpIS5pbnN0YWxsZWRDb21wb25lbnRzID0gaW5zdGFsbGVkKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQod3NLZXkpO1xufVxuXG4vKipcbiAqIERlbGV0ZSB3b3Jrc3BhY2Ugc3RhdGUgaWYgaXRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdFxuICovXG5mdW5jdGlvbiBjaGVja0FsbFdvcmtzcGFjZXMoKSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbiAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeSgpIHtcbiAgbG9nLmRlYnVnKCdpbml0Um9vdERpcmVjdG9yeScpO1xuICBjb25zdCByb290UGF0aCA9IHJvb3REaXI7XG4gIGZzZXh0Lm1rZGlycFN5bmMoZGlzdERpcik7XG4gIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvY29uZmlnLmxvY2FsLXRlbXBsYXRlLnlhbWwnKSwgUGF0aC5qb2luKGRpc3REaXIsICdjb25maWcubG9jYWwueWFtbCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9sb2c0anMuanMnKSwgcm9vdFBhdGggKyAnL2xvZzRqcy5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJyxcbiAgICAgICdnaXRpZ25vcmUudHh0JyksIHJvb3REaXIgKyAnLy5naXRpZ25vcmUnKTtcbiAgYXdhaXQgY2xlYW5JbnZhbGlkU3ltbGlua3MoKTtcbiAgYXdhaXQgc2NhbkFuZFN5bmNQYWNrYWdlcygpO1xuICAvLyBhd2FpdCBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKSwgbmV3IFNldDxzdHJpbmc+KCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSwgbnBtT3B0OiBOcG1PcHRpb25zKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3cy5pZCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5zdGFsbEluRGlyKGRpciwgbnBtT3B0LCB3cy5vcmlnaW5JbnN0YWxsSnNvblN0ciwgd3MuaW5zdGFsbEpzb25TdHIpO1xuICB9IGNhdGNoIChleCkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgIGNvbnN0IHdzZCA9IGQud29ya3NwYWNlcy5nZXQod3MuaWQpITtcbiAgICAgIHdzZC5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgd3NkLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgd3NkLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS1sb2NrLmpzb24nKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJvYmxlbWF0aWMgJHtsb2NrRmlsZX0gaXMgZGVsZXRlZCwgcGxlYXNlIHRyeSBhZ2FpbmApO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEluRGlyKGRpcjogc3RyaW5nLCBucG1PcHQ6IE5wbU9wdGlvbnMsIG9yaWdpblBrZ0pzb25TdHI6IHN0cmluZywgdG9JbnN0YWxsUGtnSnNvblN0cjogc3RyaW5nKSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCdJbnN0YWxsIGRlcGVuZGVuY2llcyBpbiAnICsgZGlyKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBjb3B5TnBtcmNUb1dvcmtzcGFjZShkaXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlKTtcbiAgfVxuICBjb25zdCBzeW1saW5rc0luTW9kdWxlRGlyID0gW10gYXMge2NvbnRlbnQ6IHN0cmluZzsgbGluazogc3RyaW5nfVtdO1xuXG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICBmc2V4dC5ta2RpcnBTeW5jKHRhcmdldCk7XG4gIH1cblxuICAvLyBOUE0gdjcuMjAueCBjYW4gbm90IGluc3RhbGwgZGVwZW5kZW5jaWVzIGlmIHRoZXJlIGlzIGFueSBmaWxlIHdpdGggbmFtZSBwcmVmaXggJ18nIGV4aXN0cyBpbiBkaXJlY3Rvcnkgbm9kZV9tb2R1bGVzXG4gIGNvbnN0IGxlZ2FjeVBrZ1NldHRpbmdGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycsICdfcGFja2FnZS1zZXR0aW5ncy5kLnRzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGxlZ2FjeVBrZ1NldHRpbmdGaWxlKSkge1xuICAgIGZzLnVubGlua1N5bmMobGVnYWN5UGtnU2V0dGluZ0ZpbGUpO1xuICB9XG5cbiAgLy8gMS4gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3ModGFyZ2V0LCBsaW5rID0+IHtcbiAgICBsb2cuZGVidWcoJ1JlbW92ZSBzeW1saW5rJywgbGluayk7XG4gICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgfSk7XG4gIC8vIDIuIFJ1biBgbnBtIGluc3RhbGxgXG4gIGNvbnN0IGluc3RhbGxKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ3dyaXRlJywgaW5zdGFsbEpzb25GaWxlKTtcbiAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIHRvSW5zdGFsbFBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gIC8vIHNhdmUgYSBsb2NrIGZpbGUgdG8gaW5kaWNhdGUgaW4tcHJvY2VzcyBvZiBpbnN0YWxsaW5nLCBvbmNlIGluc3RhbGxhdGlvbiBpcyBjb21wbGV0ZWQgd2l0aG91dCBpbnRlcnJ1cHRpb24sIGRlbGV0ZSBpdC5cbiAgLy8gY2hlY2sgaWYgdGhlcmUgaXMgZXhpc3RpbmcgbG9jayBmaWxlLCBtZWFuaW5nIGEgcHJldmlvdXMgaW5zdGFsbGF0aW9uIGlzIGludGVycnVwdGVkLlxuICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwbGluay5pbnN0YWxsLmxvY2snKTtcbiAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUobG9ja0ZpbGUsIG9yaWdpblBrZ0pzb25TdHIpO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMDApKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBlbnYgPSB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIE5PREVfRU5WOiAnZGV2ZWxvcG1lbnQnXG4gICAgfSBhcyBOb2RlSlMuUHJvY2Vzc0VudjtcblxuICAgIGlmIChucG1PcHQuY2FjaGUpXG4gICAgICBlbnYubnBtX2NvbmZpZ19jYWNoZSA9IG5wbU9wdC5jYWNoZTtcbiAgICBpZiAobnBtT3B0Lm9mZmxpbmUpXG4gICAgICBlbnYubnBtX2NvbmZpZ19vZmZsaW5lID0gJ3RydWUnO1xuXG4gICAgY29uc3QgY21kQXJncyA9IFtucG1PcHQudXNlTnBtQ2kgPyAnY2knIDogJ2luc3RhbGwnXTtcblxuICAgIGF3YWl0IGV4ZSgnbnBtJywgLi4uY21kQXJncywge2N3ZDogZGlyLCBlbnZ9KS5kb25lO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICBhd2FpdCBleGUoJ25wbScsICdwcnVuZScsIHtjd2Q6IGRpciwgZW52fSkuZG9uZTtcbiAgICAvLyBcIm5wbSBkZHBcIiByaWdodCBhZnRlciBcIm5wbSBpbnN0YWxsXCIgd2lsbCBjYXVzZSBkZXZEZXBlbmRlbmNpZXMgYmVpbmcgcmVtb3ZlZCBzb21laG93LCBkb24ndCBrbm93blxuICAgIC8vIHdoeSwgSSBoYXZlIHRvIGFkZCBhIHNldEltbWVkaWF0ZSgpIGJldHdlZW4gdGhlbSB0byB3b3JrYXJvdW5kXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGUoJ25wbScsICdkZHAnLCB7Y3dkOiBkaXIsIGVudn0pLnByb21pc2U7XG4gICAgfSBjYXRjaCAoZGRwRXJyKSB7XG4gICAgICBsb2cud2FybignRmFpbGVkIHRvIGRlZHVwZSBkZXBlbmRlbmNpZXMsIGJ1dCBpdCBpcyBPSycsIGRkcEVycik7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuZXJyb3IoJ0ZhaWxlZCB0byBpbnN0YWxsIGRlcGVuZGVuY2llcycsIChlIGFzIEVycm9yKS5zdGFjayk7XG4gICAgdGhyb3cgZTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdSZWNvdmVyICcgKyBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIC8vIDMuIFJlY292ZXIgcGFja2FnZS5qc29uIGFuZCBzeW1saW5rcyBkZWxldGVkIGluIFN0ZXAuMS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgb3JpZ2luUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBhd2FpdCByZWNvdmVyU3ltbGlua3MoKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpXG4gICAgICBhd2FpdCBmcy5wcm9taXNlcy51bmxpbmsobG9ja0ZpbGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgZnNleHQubWtkaXJwU3luYyhQYXRoLmRpcm5hbWUobGluaykpO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMuc3ltbGluayhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY29weU5wbXJjVG9Xb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJy5ucG1yYycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXQpKVxuICAgIHJldHVybjtcbiAgY29uc3QgaXNDaGluYSA9IGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLmlzSW5DaGluYSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIoY24gPT4gY24gIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKTtcblxuICBpZiAoaXNDaGluYSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJ2NyZWF0ZSAubnBtcmMgdG8nLCB0YXJnZXQpO1xuICAgIGZzLmNvcHlGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL25wbXJjLWZvci1jbi50eHQnKSwgdGFyZ2V0KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBzY2FuQW5kU3luY1BhY2thZ2VzKGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW10pIHtcbiAgY29uc3QgcHJvalBrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGNvbnN0IHNyY1BrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGxldCBwa2dMaXN0OiBQYWNrYWdlSW5mb1tdO1xuXG4gIGlmIChpbmNsdWRlUGFja2FnZUpzb25GaWxlcykge1xuICAgIGNvbnN0IHByaktleXMgPSBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpO1xuICAgIGNvbnN0IHByakRpcnMgPSBwcmpLZXlzLm1hcChwcmpLZXkgPT4gcHJvaktleVRvUGF0aChwcmpLZXkpKTtcbiAgICBwa2dMaXN0ID0gaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMubWFwKGpzb25GaWxlID0+IHtcbiAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgY29uc3QgcHJqSWR4ID0gcHJqRGlycy5maW5kSW5kZXgoZGlyID0+IGluZm8ucmVhbFBhdGguc3RhcnRzV2l0aChkaXIgKyBQYXRoLnNlcCkpO1xuICAgICAgaWYgKHByaklkeCA+PSAwKSB7XG4gICAgICAgIGNvbnN0IHByalBhY2thZ2VOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJqS2V5c1twcmpJZHhdKSE7XG4gICAgICAgIGlmICghcHJqUGFja2FnZU5hbWVzLmluY2x1ZGVzKGluZm8ubmFtZSkpIHtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe1xuICAgICAgICAgICAgcHJqOiBwcmpLZXlzW3ByaklkeF0sXG4gICAgICAgICAgICBwa2dzOiBbLi4ucHJqUGFja2FnZU5hbWVzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qga2V5cyA9IFsuLi5nZXRTdGF0ZSgpLnNyY0RpcjJQYWNrYWdlcy5rZXlzKCldO1xuICAgICAgICBjb25zdCBsaW5rZWRTcmNEaXJzID0ga2V5cy5tYXAoa2V5ID0+IHByb2pLZXlUb1BhdGgoa2V5KSk7XG4gICAgICAgIGNvbnN0IGlkeCA9IGxpbmtlZFNyY0RpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoID09PSBkaXIgfHwgIGluZm8ucmVhbFBhdGguc3RhcnRzV2l0aChkaXIgKyBQYXRoLnNlcCkpO1xuICAgICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgICBjb25zdCBwa2dzID0gZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMuZ2V0KGtleXNbaWR4XSkhO1xuICAgICAgICAgIGlmICghcGtncy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoe1xuICAgICAgICAgICAgICBwYXR0ZXJuOiBrZXlzW2lkeF0sXG4gICAgICAgICAgICAgIHBrZ3M6IFsuLi5wa2dzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7aW5mby5yZWFsUGF0aH0gaXMgbm90IHVuZGVyIGFueSBrbm93biBQcm9qZWN0IGRpcmVjdG9yeXM6ICR7cHJqRGlycy5jb25jYXQobGlua2VkU3JjRGlycykuam9pbignLCAnKX1gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfSk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKFtwa2dMaXN0LCAndXBkYXRlJ10pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJtID0gKGF3YWl0IGltcG9ydCgnLi4vcmVjaXBlLW1hbmFnZXInKSk7XG4gICAgcGtnTGlzdCA9IFtdO1xuICAgIGF3YWl0IHJtLnNjYW5QYWNrYWdlcygpLnBpcGUoXG4gICAgICB0YXAoKFtwcm9qLCBqc29uRmlsZSwgc3JjRGlyXSkgPT4ge1xuICAgICAgICBpZiAocHJvaiAmJiAhcHJvalBrZ01hcC5oYXMocHJvaikpXG4gICAgICAgICAgcHJvalBrZ01hcC5zZXQocHJvaiwgW10pO1xuICAgICAgICBpZiAocHJvaiA9PSBudWxsICYmIHNyY0RpciAmJiAhc3JjUGtnTWFwLmhhcyhzcmNEaXIpKVxuICAgICAgICAgIHNyY1BrZ01hcC5zZXQoc3JjRGlyLCBbXSk7XG5cbiAgICAgICAgbG9nLmRlYnVnKCdzY2FuIHBhY2thZ2UuanNvbicsIGpzb25GaWxlKTtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvKGpzb25GaWxlLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbmZvLmpzb24uZHIgfHwgaW5mby5qc29uLnBsaW5rKSB7XG4gICAgICAgICAgcGtnTGlzdC5wdXNoKGluZm8pO1xuICAgICAgICAgIGlmIChwcm9qKVxuICAgICAgICAgICAgcHJvalBrZ01hcC5nZXQocHJvaikhLnB1c2goaW5mbyk7XG4gICAgICAgICAgZWxzZSBpZiAoc3JjRGlyKVxuICAgICAgICAgICAgc3JjUGtnTWFwLmdldChzcmNEaXIpIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGxvZy5lcnJvcihgT3JwaGFuICR7anNvbkZpbGV9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbG9nLmRlYnVnKGBQYWNrYWdlIG9mICR7anNvbkZpbGV9IGlzIHNraXBwZWQgKGR1ZSB0byBubyBcImRyXCIgb3IgXCJwbGlua1wiIHByb3BlcnR5KWAsIGluZm8uanNvbik7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKS50b1Byb21pc2UoKTtcbiAgICBmb3IgKGNvbnN0IFtwcmosIHBrZ3NdIG9mIHByb2pQa2dNYXAuZW50cmllcygpKSB7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe3ByaiwgcGtnc30pO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtzcmNEaXIsIHBrZ3NdIG9mIHNyY1BrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1NyY0Rpcih7cGF0dGVybjogc3JjRGlyLCBwa2dzfSk7XG4gICAgfVxuXG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKFtwa2dMaXN0LCAnY2xlYW4nXSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKHdzS2V5OiBzdHJpbmcpIHtcbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnLmxpbmtzJyAmJiBmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgJy5saW5rcycpKSkge1xuICAgIGZzZXh0LnJlbW92ZShQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksICcubGlua3MnKSlcbiAgICAuY2F0Y2goZXggPT4gbG9nLmluZm8oZXgpKTtcbiAgfVxuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCBzeW1saW5rRGlyTmFtZSB8fCAnbm9kZV9tb2R1bGVzJyk7XG4gIGZzZXh0Lm1rZGlycFN5bmMoc3ltbGlua0Rpcik7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSkhO1xuXG4gIGNvbnN0IHBrZ05hbWVzID0gd3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcChpdGVtID0+IGl0ZW1bMF0pXG4gIC5jb25jYXQod3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcChpdGVtID0+IGl0ZW1bMF0pKTtcblxuICBjb25zdCBwa2dOYW1lU2V0ID0gbmV3IFNldChwa2dOYW1lcyk7XG5cbiAgaWYgKHN5bWxpbmtEaXJOYW1lICE9PSAnbm9kZV9tb2R1bGVzJykge1xuICAgIGlmICh3cy5pbnN0YWxsZWRDb21wb25lbnRzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgICBwa2dOYW1lU2V0LmFkZChwbmFtZSk7XG4gICAgfVxuICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXRpZ25vcmUnKSxcbiAgICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShyb290RGlyLCBzeW1saW5rRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyldfSk7XG4gIH1cblxuICBsZXQgc3ltbGlua3NUb0NyZWF0ZSA9IGZyb20ocGtnTmFtZVNldC52YWx1ZXMoKSlcbiAgLnBpcGUoXG4gICAgbWFwKG5hbWUgPT4gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkgfHwgd3MuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpISlcbiAgKTtcbiAgY29uc3Qgd29ya0RpciA9IHdvcmtzcGFjZURpcih3c0tleSk7XG4gIGlmICh3b3JrRGlyICE9PSBwbGlua0Vudi5yb290RGlyKSB7XG4gICAgc3ltbGlua3NUb0NyZWF0ZSA9IGNvbmNhdChzeW1saW5rc1RvQ3JlYXRlLCBvZihnZXRTdGF0ZSgpLmxpbmtlZERyY3AhIHx8IGdldFN0YXRlKCkuaW5zdGFsbGVkRHJjcCkpO1xuICB9XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIHN5bWxpbmtzVG9DcmVhdGUucGlwZShcbiAgICAgIHN5bWJvbGljTGlua1BhY2thZ2VzKHN5bWxpbmtEaXIpXG4gICAgKSxcbiAgICBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoc3ltbGlua0RpciwgcGtnTmFtZVNldClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gX2RlbGV0ZVVzZWxlc3NTeW1saW5rKGNoZWNrRGlyOiBzdHJpbmcsIGV4Y2x1ZGVTZXQ6IFNldDxzdHJpbmc+KSB7XG4gIGNvbnN0IGRvbmVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgY29uc3QgcGxpbmtQa2cgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwO1xuICBjb25zdCBkcmNwTmFtZSA9IHBsaW5rUGtnPy5uYW1lO1xuICBjb25zdCBkb25lMSA9IGxpc3RNb2R1bGVTeW1saW5rcyhjaGVja0RpciwgbGluayA9PiB7XG4gICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoY2hlY2tEaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIChkcmNwTmFtZSA9PSBudWxsIHx8IGRyY3BOYW1lICE9PSBwa2dOYW1lKSAmJiAhZXhjbHVkZVNldC5oYXMocGtnTmFtZSkpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgRGVsZXRlIGV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApO1xuICAgICAgZG9uZXMucHVzaChmcy5wcm9taXNlcy51bmxpbmsobGluaykpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGRvbmUxO1xuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgcmV0dXJuIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZSwganNvbiwgaXNJbnN0YWxsZWQpO1xufVxuLyoqXG4gKiBMaXN0IHRob3NlIGluc3RhbGxlZCBwYWNrYWdlcyB3aGljaCBhcmUgcmVmZXJlbmNlZCBieSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUsXG4gKiB0aG9zZSBwYWNrYWdlcyBtdXN0IGhhdmUgXCJkclwiIHByb3BlcnR5IGluIHBhY2thZ2UuanNvbiBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VLZXkgXG4gKi9cbmZ1bmN0aW9uKiBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IG9yaWdpbkluc3RhbGxKc29uID0gc3RhdGUud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSEub3JpZ2luSW5zdGFsbEpzb247XG4gIC8vIGNvbnN0IGRlcEpzb24gPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llc10gOlxuICAvLyAgIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc107XG4gIGZvciAoY29uc3QgZGVwcyBvZiBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdKSB7XG4gICAgaWYgKGRlcHMgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICBpZiAoIXN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXApICYmIGRlcCAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBranNvbkZpbGUpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlSW5mbyhcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKSwgdHJ1ZVxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKHBrLmpzb24uZHIgfHwgcGsuanNvbi5wbGluaykge1xuICAgICAgICAgICAgeWllbGQgcGs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZTogc3RyaW5nLCBqc29uOiBhbnksIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG0gPSBtb2R1bGVOYW1lUmVnLmV4ZWMoanNvbi5uYW1lKTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBzaG9ydE5hbWU6IG0hWzJdLFxuICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICBzY29wZTogbSFbMV0sXG4gICAgcGF0aDogUGF0aC5qb2luKHN5bWxpbmtEaXJOYW1lLCBqc29uLm5hbWUpLFxuICAgIGpzb24sXG4gICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGtKc29uRmlsZSkpLFxuICAgIGlzSW5zdGFsbGVkXG4gIH07XG4gIHJldHVybiBwa0luZm87XG59XG5cbmZ1bmN0aW9uIGNwKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoXy5zdGFydHNXaXRoKGZyb20sICctJykpIHtcbiAgICBmcm9tID0gYXJndW1lbnRzWzFdO1xuICAgIHRvID0gYXJndW1lbnRzWzJdO1xuICB9XG4gIGZzZXh0LmNvcHlTeW5jKGZyb20sIHRvKTtcbiAgLy8gc2hlbGwuY3AoLi4uYXJndW1lbnRzKTtcbiAgaWYgKC9bL1xcXFxdJC8udGVzdCh0bykpXG4gICAgdG8gPSBQYXRoLmJhc2VuYW1lKGZyb20pOyAvLyB0byBpcyBhIGZvbGRlclxuICBlbHNlXG4gICAgdG8gPSBQYXRoLnJlbGF0aXZlKHBsaW5rRW52LndvcmtEaXIsIHRvKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gZnJvbSBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gdG8gcmVsYXRpdmUgdG8gcm9vdFBhdGggXG4gKi9cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuZnVuY3Rpb24gZGVsZXRlRHVwbGljYXRlZEluc3RhbGxlZFBrZyh3b3Jrc3BhY2VLZXk6IHN0cmluZykge1xuICBjb25zdCB3c1N0YXRlID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpITtcbiAgY29uc3QgZG9Ob3RoaW5nID0gKCkgPT4ge307XG4gIHdzU3RhdGUubGlua2VkRGVwZW5kZW5jaWVzLmNvbmNhdCh3c1N0YXRlLmxpbmtlZERldkRlcGVuZGVuY2llcykubWFwKChbcGtnTmFtZV0pID0+IHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgcGtnTmFtZSk7XG4gICAgcmV0dXJuIGZzLnByb21pc2VzLmxzdGF0KGRpcilcbiAgICAudGhlbigoc3RhdCkgPT4ge1xuICAgICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oYFByZXZpb3VzIGluc3RhbGxlZCAke1BhdGgucmVsYXRpdmUocm9vdERpciwgZGlyKX0gaXMgZGVsZXRlZCwgZHVlIHRvIGxpbmtlZCBwYWNrYWdlICR7cGtnTmFtZX1gKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnVubGluayhkaXIpO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKGRvTm90aGluZyk7XG4gIH0pO1xufVxuXG4iXX0=