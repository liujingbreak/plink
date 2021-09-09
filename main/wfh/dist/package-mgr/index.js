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
                log.info('newDeps.length', newDeps.length, ' !== oldDeps.length', oldDeps.length);
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
    }), (0, operators_1.ignoreElements)()), action$.pipe((0, store_1.ofPayloadAction)(exports.slice.actions.addProject, exports.slice.actions.deleteProject), (0, operators_1.concatMap)(() => scanAndSyncPackages()))).pipe((0, operators_1.ignoreElements)(), (0, operators_1.catchError)(err => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCxrREFBMEI7QUFDMUIsd0RBQTZCO0FBQzdCLDRDQUFvQjtBQUNwQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFtRjtBQUNuRiw4Q0FDMkY7QUFDM0Ysc0VBQWlHO0FBQ2pHLG9EQUF1QztBQUN2QyxzREFBbUU7QUFDbkUsb0NBQXlEO0FBQ3pELG1GQUEyRztBQUMzRyw4Q0FBOEM7QUFDOUMsOERBQW1HO0FBQ25HLG9EQUFzRDtBQUN0RCwyQkFBeUI7QUFDekIsbUNBQWlDO0FBQ2pDLHdDQUF5QztBQUN6QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsbUJBQW1CLENBQUMsQ0FBQztBQXNEM0MsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFN0UsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0FBQ3RCLE1BQU0sYUFBYSxHQUFHLHVCQUF1QixDQUFDO0FBRTlDLE1BQU0sS0FBSyxHQUFrQjtJQUMzQixNQUFNLEVBQUUsS0FBSztJQUNiLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUNyQixnQkFBZ0IsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUMzQixlQUFlLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDMUIsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQixzQkFBc0IsRUFBRSxDQUFDO0lBQ3pCLGFBQWEsRUFBRSxFQUFDLE9BQU8sRUFBRSxLQUFLLEVBQUM7Q0FDaEMsQ0FBQztBQXVDVyxRQUFBLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUN6QyxJQUFJLEVBQUUsRUFBRTtJQUNSLFlBQVksRUFBRSxLQUFLO0lBQ25CLFFBQVEsRUFBRTtRQUNSLG1FQUFtRTtRQUNuRSxXQUFXLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUE0QjtZQUNqRCxDQUFDLENBQUMsYUFBYSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxhQUFhLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDOUMsQ0FBQztRQUVEOzs7Ozs7O1dBT0c7UUFDSCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUlaO1lBQ2IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztZQUN0QyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQzlDLENBQUM7UUFDRCxtQkFBbUIsQ0FBQyxDQUFnQixFQUFFLE1BQW9EO1FBQzFGLENBQUM7UUFFRCxTQUFTLEtBQUksQ0FBQztRQUNkLHVCQUF1QixDQUFDLENBQUM7WUFDdkIsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsY0FBYyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEYsSUFBSSxhQUFhLEVBQUU7Z0JBQ2pCLENBQUMsQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDO2dCQUN4QixDQUFDLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztnQkFDdkIsQ0FBQyxDQUFDLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzthQUMxRTtpQkFBTTtnQkFDTCxDQUFDLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztnQkFDcEIsQ0FBQyxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUM7Z0JBQzNCLENBQUMsQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUM7YUFDNUI7UUFDSCxDQUFDO1FBQ0QsbUJBQW1CLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFxRTtZQUNsRyxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztZQUNoQixJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDO1lBQ3hCLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sRUFBRTtnQkFDMUIsR0FBRyxHQUFHLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7YUFDdEQ7WUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDL0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQzlCO1FBQ0gsQ0FBQztRQUNELG9CQUFvQixDQUFDLENBQUMsRUFBRSxNQUErQixJQUFHLENBQUM7UUFDM0QsVUFBVSxDQUFDLENBQUMsRUFBRSxNQUErQjtZQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ2hDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNqQzthQUNGO1FBQ0gsQ0FBQztRQUNELGFBQWEsQ0FBQyxDQUFDLEVBQUUsTUFBK0I7WUFDOUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNuQyxNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDO1FBQ0QsVUFBVSxDQUFDLENBQUMsRUFBRSxNQUErQjtZQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUMvQixDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ2hDO2FBQ0Y7UUFDSCxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxNQUErQjtZQUM5QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDL0I7UUFDSCxDQUFDO1FBQ0QsMkVBQTJFO1FBQzNFLHNCQUFzQixDQUFDLENBQUMsRUFBRSxNQUErQixJQUFHLENBQUM7UUFDN0Qsd0lBQXdJO1FBQ3hJLGdCQUFnQixDQUFDLENBQUMsRUFBRSxNQUErQixJQUFHLENBQUM7UUFDdkQsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsSUFBSSxFQUFFLEtBQUssRUFBQyxFQUFpRDtZQUMxRixJQUFJLEdBQUcsR0FBRyxJQUFJLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQztZQUMzQixJQUFJLGNBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3pCLEdBQUcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUN2RCxHQUFHLEdBQUcsSUFBSSxDQUFDO2FBQ1o7aUJBQU07Z0JBQ0wsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ25DO1lBQ0QsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNyQixPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDMUI7WUFDRCxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNsRixDQUFDO1FBQ0QsZUFBZSxDQUFDLENBQUM7WUFDZixDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBQ0QsVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBeUI7WUFDN0MsQ0FBQyxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUM7UUFDeEIsQ0FBQztRQUNELG9CQUFvQixDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBRSxHQUFHLEVBQStCO1lBQ2xFLElBQUksR0FBRyxJQUFJLElBQUk7Z0JBQ2IsQ0FBQyxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7O2dCQUVwQyxDQUFDLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQztRQUMzQixDQUFDO1FBQ0QsOEJBQThCO1FBQzlCLHFCQUFxQixDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBd0I7WUFDdkQsQ0FBQyxDQUFDLHVCQUF1QixJQUFJLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsbUZBQW1GO1FBQ25GLG1CQUFtQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUErQjtZQUN2RSxJQUFJLEtBQUssQ0FBQyxXQUFXLElBQUksSUFBSSxFQUFFO2dCQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLHlEQUF5RCxDQUFDLENBQUM7YUFDNUU7WUFFRCxJQUFJLFNBQWlCLENBQUM7WUFDdEIsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDdEQsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUN6RCxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0VBQXdFLEdBQUcsV0FBVyxDQUFDLENBQUM7Z0JBQ2pHLFNBQVMsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDOUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQzthQUN6QjtpQkFBTTtnQkFDTCxTQUFTLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDbEQ7WUFDRCxNQUFNLE1BQU0sR0FBc0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN4RCxxR0FBcUc7WUFDckcsMEJBQTBCO1lBQzFCLElBQUk7WUFFSixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFTLE1BQU0sQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDLENBQUM7WUFFL0QsdURBQXVEO1lBQ3ZELE1BQU0sa0JBQWtCLEdBQWdCLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNqQixJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNqQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQzlCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFTLE1BQU0sQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUM7WUFDckUsNkRBQTZEO1lBQzdELE1BQU0scUJBQXFCLEdBQW1CLEVBQUUsQ0FBQztZQUNqRCxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNwQixJQUFJLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUNqQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2pDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFFSCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsTUFBTSxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLGdCQUFnQixFQUN6RCxVQUFVLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxtQkFBbUIsRUFDakUsR0FDQyxJQUFBLDJDQUFrQixFQUNoQixLQUFLLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZSxDQUM5RSxDQUFDO1lBR0YsTUFBTSxXQUFXLG1DQUNaLE1BQU0sS0FDVCxZQUFZLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7cUJBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7cUJBQy9FLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsYUFBYSxJQUFJLElBQUksS0FBSyxZQUFZLENBQUM7cUJBQzNELE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO29CQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQzNCLE9BQU8sR0FBRyxDQUFDO2dCQUNiLENBQUMsRUFBRSxFQUE2QixDQUFDLEVBRWpDLGVBQWUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztxQkFDcEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDbEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxhQUFhLElBQUksSUFBSSxLQUFLLFlBQVksQ0FBQztxQkFDM0QsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQzVCLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztvQkFDM0IsT0FBTyxHQUFHLENBQUM7Z0JBQ2IsQ0FBQyxFQUFFLEVBQTZCLENBQUMsR0FDbEMsQ0FBQztZQUVGLHdCQUF3QjtZQUN4QixvR0FBb0c7WUFFcEcsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFN0MsTUFBTSxnQkFBZ0IsR0FBdUM7Z0JBQzNELFlBQVksRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxjQUFjLEVBQUUsRUFBRTthQUN0RCxDQUFDO1lBRUYsS0FBSyxNQUFNLFFBQVEsSUFBSSxDQUFDLFdBQVcsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFO2dCQUN0RCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFO29CQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ2hCLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztxQkFDcEQ7b0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUNqQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUN6QztpQkFDRjthQUNGO1lBQ0QsS0FBSyxNQUFNLFFBQVEsSUFBSSxDQUFDLGNBQWMsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFO2dCQUM1RCxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFO29CQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7d0JBQ2hCLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztxQkFDdkQ7b0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO3dCQUNqQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO3FCQUN6QztpQkFDRjthQUNGO1lBRUQsTUFBTSxFQUFFLEdBQW1CO2dCQUN6QixFQUFFLEVBQUUsS0FBSztnQkFDVCxpQkFBaUIsRUFBRSxNQUFNO2dCQUN6QixvQkFBb0IsRUFBRSxTQUFTO2dCQUMvQixXQUFXO2dCQUNYLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUN2RCxrQkFBa0I7Z0JBQ2xCLHFCQUFxQjtnQkFDckIsU0FBUyxFQUFFLFdBQVc7Z0JBQ3RCLGdCQUFnQjtnQkFDaEIsWUFBWSxFQUFFLGNBQWM7Z0JBQzVCLG1CQUFtQixFQUFFLG1CQUFtQjtnQkFDeEMsZ0JBQWdCO2FBQ2pCLENBQUM7WUFDRixLQUFLLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1lBQ25DLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQ0QsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsWUFBWSxFQUFDLEVBQXdDLElBQUcsQ0FBQztRQUN6RixvRUFBb0U7UUFDcEUsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxFQUF1RDtZQUNwRyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUNELHlCQUF5QixDQUFDLENBQUMsRUFDekIsRUFBQyxPQUFPLEVBQUUsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLEVBQTJEO1lBQ3BGLENBQUMsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDN0UsQ0FBQztLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRVUsUUFBQSxnQkFBZ0IsR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLGFBQUssQ0FBQyxDQUFDO0FBQ3pELHdCQUFnQixHQUEwQix3QkFBZ0IsbUJBQXhDLDRCQUFvQixHQUFJLHdCQUFnQixzQkFBQztBQUV6RTs7R0FFRztBQUNILG9CQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO0lBQ3ZDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUM5QyxNQUFNLGdCQUFnQixHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7SUFFN0MsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRWhELElBQUksUUFBUSxFQUFFLENBQUMsZUFBZSxJQUFJLElBQUksRUFBRTtRQUN0QyxvRUFBb0U7UUFDcEUsOERBQThEO1FBQzlELHdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0tBQzlEO0lBQ0QsTUFBTSxhQUFhLEdBQUcsSUFBQSx5QkFBZ0IsRUFBQyxhQUFLLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQy9ELE9BQU8sSUFBQSxZQUFLO0lBQ1YsNkJBQTZCO0lBQzdCLDhGQUE4RjtJQUU5RixJQUFBLFlBQUssRUFBQyxHQUFHLEVBQUU7UUFDVCxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLHdCQUFnQixDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQztRQUNuRSxPQUFPLFlBQUssQ0FBQztJQUNmLENBQUMsQ0FBQyxFQUNGLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFBLGVBQUcsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMxQyxJQUFBLGdDQUFvQixHQUFFLEVBQ3RCLElBQUEsZUFBRyxFQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ1IsSUFBQSwrQkFBYyxFQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDakMsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDLENBQUMsRUFDRixJQUFBLDBCQUFjLEdBQUUsQ0FDakIsRUFFRCxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQ3pDLElBQUEsZ0NBQW9CLEdBQUUsRUFDdEIsSUFBQSxrQkFBTSxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxFQUN0QixJQUFBLGVBQUcsRUFBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1FBQ3JCLElBQUEsZ0NBQWUsRUFBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDLENBQUMsQ0FBQyxFQUVMLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFBLGVBQUcsRUFBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFDckMsSUFBQSxnQ0FBb0IsR0FBRSxFQUN0QixJQUFBLGdCQUFJLEVBQStCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFO1FBQ3RELGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixLQUFLLE1BQU0sRUFBRSxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMvQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDcEIsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQzNCO1NBQ0Y7UUFDRCxJQUFJLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQzdCLElBQUEsNEJBQW9CLEVBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN6QyxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDLENBQUMsQ0FDSDtJQUNELG1CQUFtQjtJQUNuQixhQUFhLENBQUMsZUFBZSxDQUFDLElBQUksQ0FDaEMsSUFBQSxxQkFBUyxFQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBQyxFQUFDLEVBQUUsRUFBRTtRQUNsRSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN4Qix3QkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMzQyxpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDM0csa0JBQWtCLEVBQUUsQ0FBQztRQUNyQixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxPQUFPLElBQUksUUFBUSxFQUFFO1lBQ2xELGtGQUFrRjtZQUNsRixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUNwQyx3QkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzNCLGtDQUFrQztvQkFDbEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUM7b0JBQ3BDLEVBQUUsQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO29CQUN2QixFQUFFLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7b0JBQ2pDLEVBQUUsQ0FBQyxXQUFXLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQztvQkFDcEMsc0NBQXNDO29CQUN0QyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxDQUFDLENBQUMsQ0FBQzthQUNKO1NBQ0Y7UUFDRCwrRkFBK0Y7UUFDL0YsZ0NBQWdDO1FBQ2hDLE9BQU8sSUFBQSxZQUFLLEVBQ1YsZ0JBQWdCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7WUFDaEUsSUFBQSxZQUFLLEVBQUMsR0FBRyxFQUFFLENBQUMsSUFBQSxTQUFFLEVBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLEVBQ3RDLE9BQU8sQ0FBQyxJQUFJLENBQ1YsSUFBQSx1QkFBZSxFQUFDLGFBQUssQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFDbEQsSUFBQSxnQkFBSSxFQUFDLENBQUMsQ0FBQyxFQUNQLElBQUEsZUFBRyxFQUFDLEdBQUcsRUFBRSxDQUFDLHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUN2RCxDQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FDSCxFQUNELGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQ3BDLElBQUEscUJBQVMsRUFBQyxDQUFDLEVBQUMsT0FBTyxFQUFDLEVBQUUsRUFBRTtRQUN0QixPQUFPLElBQUEsWUFBSyxFQUNWLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUM3QyxPQUFPLENBQUMsSUFBSSxDQUNWLElBQUEsdUJBQWUsRUFBQyxhQUFLLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLEVBQ2xELElBQUEsZ0JBQUksRUFBQyxDQUFDLENBQUMsRUFDUCxJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUU7WUFDUCxNQUFNLE1BQU0sR0FBRyxRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUM7WUFDeEMsS0FBSyxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ2hELElBQUksS0FBSyxLQUFLLE1BQU07b0JBQ2xCLHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUMsR0FBRyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxFQUFDLENBQUMsQ0FBQzthQUM3RTtZQUNELElBQUksTUFBTSxJQUFJLElBQUksRUFBRTtnQkFDbEIsNEZBQTRGO2dCQUM1Rix3QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFDLEdBQUcsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsRUFBQyxDQUFDLENBQUM7YUFDNUU7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FDSDtJQUVELGNBQWM7SUFDZCxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDNUIsSUFBQSxlQUFHLEVBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7UUFDaEIsa0JBQWtCLEVBQUUsQ0FBQztRQUNyQixJQUFJLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO1lBQzdELHdCQUFnQixDQUFDLGVBQWUsaUJBQUUsR0FBRyxFQUFFLGVBQVEsQ0FBQyxPQUFPLElBQ2xELE9BQU8sRUFBRSxDQUFDO1NBQ2hCO2FBQU07WUFDTCxNQUFNLElBQUksR0FBRyxRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUM7WUFDdEMsSUFBSSxJQUFJLElBQUksSUFBSSxFQUFFO2dCQUNoQixJQUFJLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ25DLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUN6Qyx3QkFBZ0IsQ0FBQyxlQUFlLGlCQUFFLEdBQUcsRUFBRSxJQUFJLElBQUssT0FBTyxFQUFFLENBQUM7aUJBQzNEO3FCQUFNO29CQUNMLHdCQUFnQixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDO2lCQUM3QzthQUNGO1NBQ0Y7SUFDSCxDQUFDLENBQUMsQ0FDSCxFQUVELGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQ3BDLElBQUEsZUFBRyxFQUFDLENBQUMsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFFO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMscURBQXFEO1FBQ3JELDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyx3QkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUNILEVBRUQsYUFBYSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQzFCLElBQUEsZUFBRyxFQUFDLEdBQUcsRUFBRSxDQUFDLHdCQUFnQixDQUFDLHVCQUF1QixFQUFFLENBQUMsRUFDckQsSUFBQSxxQkFBUyxFQUFDLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFDdEMsSUFBQSxlQUFHLEVBQUMsR0FBRyxFQUFFO1FBQ1AsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDOUMsa0NBQWtDLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDekM7SUFDSCxDQUFDLENBQUMsQ0FDSDtJQUNELCtCQUErQjtJQUMvQixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQ3BDLElBQUEsZ0NBQW9CLEdBQUUsRUFDdEIsSUFBQSxlQUFHLEVBQUMsRUFBRSxDQUFDLEVBQUU7UUFDUCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLEVBQ0YsSUFBQSxnQkFBSSxFQUFXLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzdCLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxzQ0FBc0M7WUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN0QyxLQUFLLE1BQU0sRUFBRSxJQUFJLFFBQVEsRUFBRTtnQkFDekIsd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxZQUFZLEVBQUUsRUFBRSxFQUFDLENBQUMsQ0FBQzthQUN4RDtTQUNGO1FBQ0QsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FDSDtJQUNELGtFQUFrRTtJQUNsRSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3BELE9BQU8sUUFBUSxFQUFFLENBQUMsSUFBSTtRQUNwQixzQ0FBc0M7UUFDdEMsSUFBQSxxQkFBUyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFDckMsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUUsQ0FBQyxFQUNoQyxJQUFBLGdDQUFvQixFQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQ25FLElBQUEsZ0JBQUksRUFBaUIsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDbEMsNEJBQTRCO1lBQzVCLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDO2lCQUNqRSxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQztpQkFDL0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7Z0JBQ3hCLDhFQUE4RTtnQkFDOUUsT0FBTyxLQUFLLENBQUM7YUFDZDtZQUNELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDO2lCQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQztpQkFDN0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRWxDLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsTUFBTSxFQUFFO2dCQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxNQUFNLEVBQUUscUJBQXFCLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsRix3QkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFDLFlBQVksRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO2dCQUN4RCxPQUFPLEtBQUssQ0FBQzthQUNkO1lBQ0QsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtnQkFDOUMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUM3Qix3QkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFDLFlBQVksRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO29CQUN4RCxNQUFNO2lCQUNQO2FBQ0Y7WUFDRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUM7SUFDRiw4R0FBOEc7SUFDOUcsb0RBQW9EO0lBQ3BELElBQUEsWUFBSyxFQUFDLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQy9FLElBQUEscUJBQVMsRUFBQyxNQUFNLENBQUMsRUFBRTtRQUNqQixJQUFJLElBQUEsMEJBQWlCLEVBQUMsTUFBTSxFQUFFLGFBQUssQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsRUFBRTtZQUM5RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztZQUMxQyxPQUFPLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDcEIsSUFBQSxlQUFHLEVBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUNqQyxJQUFBLGdDQUFvQixHQUFFLEVBQ3RCLElBQUEsa0JBQU0sRUFBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFDeEIsSUFBQSxnQkFBSSxFQUFDLENBQUMsQ0FBQyxFQUNQLElBQUEscUJBQVMsRUFBQyxFQUFFLENBQUMsRUFBRTtnQkFDYixPQUFPLGdCQUFnQixDQUFDLEVBQUcsRUFBRSxRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN6RCxDQUFDLENBQUMsRUFDRixJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUU7Z0JBQ1Asa0NBQWtDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsQ0FBQyxDQUFDLEVBQ0YsSUFBQSwwQkFBYyxHQUFFLENBQ2pCLENBQUM7U0FDSDthQUFNLElBQUksSUFBQSwwQkFBaUIsRUFBQyxNQUFNLEVBQUUsYUFBSyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFO1lBQzFFLE1BQU0sTUFBTSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDOUIsT0FBTyxJQUFBLFlBQUssRUFBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDM0QsSUFBQSxvQkFBUSxFQUFDLEdBQUcsRUFBRSxDQUFDLHdCQUFnQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQzFELENBQUM7U0FDSDthQUFNO1lBQ0wsT0FBTyxZQUFLLENBQUM7U0FDZDtJQUNILENBQUMsQ0FBQyxDQUNILEVBRUQsYUFBYSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FDdEMsSUFBQSxlQUFHLEVBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQ3RELElBQUEsd0JBQVksRUFBQyxHQUFHLENBQUMsRUFDakIsSUFBQSxlQUFHLEVBQUMsR0FBRyxFQUFFO1FBQ1Asd0JBQWdCLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEYsbUJBQW1CLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDNUIsbUNBQW1DO0lBQ3JDLENBQUMsQ0FBQyxFQUNGLElBQUEsZUFBRyxFQUFDLEdBQUcsRUFBRTtRQUNQLHdCQUFnQixDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxDQUNILEVBQ0QsYUFBYSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FDakMsSUFBQSxlQUFHLEVBQUMsTUFBTSxDQUFDLEVBQUU7UUFDWCxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztRQUM5QixJQUFJLGNBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDeEIsR0FBRyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdkQ7UUFDRCxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDakMsQ0FBQyxDQUFDLEVBQ0YsSUFBQSx3QkFBWSxFQUFDLEdBQUcsQ0FBQyxFQUNqQixJQUFBLGVBQUcsRUFBQyxHQUFHLEVBQUU7UUFDUCxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcscUJBQXFCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN6RCxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUM5QixPQUFPLFlBQVksQ0FBQztJQUN0QixDQUFDLENBQUMsRUFDRixJQUFBLHFCQUFTLEVBQUMsQ0FBQyxZQUFZLEVBQUUsRUFBRTtRQUN6QixPQUFPLElBQUEsWUFBSyxFQUFDLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFNLEdBQUcsRUFBQyxFQUFFO1lBQzNDLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hDLE1BQU0sS0FBSyxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sSUFBSSxHQUFHLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ3BELElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDO29CQUN2QixPQUFPO2dCQUNULFlBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksR0FBRyxRQUFHLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFHLENBQUMsRUFBRSxHQUFHLEVBQUU7b0JBQ3ZELHNDQUFzQztvQkFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzNCLENBQUMsQ0FBQyxDQUFDO2FBQ0o7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDLENBQUMsRUFDRixJQUFBLDBCQUFjLEdBQUUsQ0FDakIsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUEsdUJBQWUsRUFBQyxhQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxhQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUNqRixJQUFBLHFCQUFTLEVBQUMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUN2QyxDQUNGLENBQUMsSUFBSSxDQUNKLElBQUEsMEJBQWMsR0FBRSxFQUNoQixJQUFBLHNCQUFVLEVBQUMsR0FBRyxDQUFDLEVBQUU7UUFDZixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLE9BQU8sSUFBQSxpQkFBVSxFQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFLLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsYUFBSyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUZELDRCQUVDO0FBRUQsU0FBZ0IsYUFBYSxDQUFDLElBQVk7SUFDeEMsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDN0MsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDakUsQ0FBQztBQUhELHNDQUdDO0FBQ0QsU0FBZ0IsYUFBYSxDQUFDLEdBQVc7SUFDdkMsT0FBTyxjQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2pFLENBQUM7QUFGRCxzQ0FFQztBQUVELFNBQWdCLFlBQVksQ0FBQyxJQUFZO0lBQ3ZDLElBQUksR0FBRyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNyRCxJQUFJLGNBQUksQ0FBQyxHQUFHLEtBQUssSUFBSTtRQUNuQixHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDaEMsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBTEQsb0NBS0M7QUFFRCxTQUFnQixZQUFZLENBQUMsR0FBVztJQUN0QyxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFGRCxvQ0FFQztBQUVELFFBQWUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFFBQWtCO0lBQ3ZELEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFO1FBQzFCLE1BQU0sUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLFFBQVEsRUFBRTtZQUNaLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO2dCQUM5QixNQUFNLEVBQUUsR0FBRyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLEVBQUU7b0JBQ0osTUFBTSxFQUFFLENBQUM7YUFDWjtTQUNGO0tBQ0Y7QUFDSCxDQUFDO0FBWEQsc0RBV0M7QUFFRCxTQUFnQixjQUFjO0lBQzVCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDN0YsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBZ0IsY0FBYztJQUM1QixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsZUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLE1BQU0sRUFBRSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsSUFBSSxFQUFFLElBQUksSUFBSTtRQUNaLE9BQU8sS0FBSyxDQUFDO0lBQ2YsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBTkQsd0NBTUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0Isc0JBQXNCLENBQUMsR0FBVztJQUNoRCx3QkFBZ0IsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyx3QkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0QsQ0FBQztBQUhELHdEQUdDO0FBRUQsU0FBUyxrQ0FBa0MsQ0FBQyxLQUFhO0lBQ3ZELE1BQU0sUUFBUSxHQUFHLDhCQUE4QixDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRW5FLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQ2xDLEtBQUssTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO1lBQ3pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1NBQ3JCO0lBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ04sd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFFLENBQUMsbUJBQW1CLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFDeEYsd0JBQWdCLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDaEQsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxrQkFBa0I7SUFDekIsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7UUFDOUMsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdkIsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxHQUFHLDBCQUEwQixDQUFDLENBQUM7WUFDckQsd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztTQUN6RDtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQWUsaUJBQWlCOztRQUM5QixHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDL0IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3pCLGtCQUFLLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFCLHFJQUFxSTtRQUNySSxpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSwyQkFBMkIsQ0FBQyxFQUFFLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztRQUNqRyxpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsRUFDdkQsZUFBZSxDQUFDLEVBQUUsT0FBTyxHQUFHLGFBQWEsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sSUFBQSxrQkFBb0IsR0FBRSxDQUFDO1FBQzdCLE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztRQUM1Qix5RkFBeUY7SUFDM0YsQ0FBQztDQUFBO0FBRUQsU0FBZSxnQkFBZ0IsQ0FBQyxFQUFrQixFQUFFLE1BQWtCOztRQUNwRSxNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDekMsSUFBSTtZQUNGLE1BQU0sWUFBWSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUM3RTtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUMzQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFFLENBQUM7Z0JBQ3JDLEdBQUcsQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFDO2dCQUN4QixHQUFHLENBQUMsV0FBVyxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7Z0JBQ2xDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQztnQkFDckMsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUMzQixzQ0FBc0M7b0JBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxRQUFRLCtCQUErQixDQUFDLENBQUM7b0JBQ2pFLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3pCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLEVBQUUsQ0FBQztTQUNWO0lBQ0gsQ0FBQztDQUFBO0FBRUQsU0FBc0IsWUFBWSxDQUFDLEdBQVcsRUFBRSxNQUFrQixFQUFFLGdCQUF3QixFQUFFLG1CQUEyQjs7UUFDdkgsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDM0MsSUFBSTtZQUNGLE1BQU0sb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDakM7UUFBQyxPQUFPLENBQUMsRUFBRTtZQUNWLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDbEI7UUFDRCxNQUFNLG1CQUFtQixHQUFHLEVBQXVDLENBQUM7UUFFcEUsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDMUIsa0JBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDMUI7UUFFRCxzSEFBc0g7UUFDdEgsTUFBTSxvQkFBb0IsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN6RixJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsb0JBQW9CLENBQUMsRUFBRTtZQUN2QyxZQUFFLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUM7U0FDckM7UUFFRCxrRkFBa0Y7UUFDbEYsZ0NBQWdDO1FBQ2hDLE1BQU0sSUFBQSw2QkFBa0IsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNsQyxNQUFNLFdBQVcsR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUN2RCxPQUFPLElBQUEsc0JBQVcsRUFBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztRQUNILHVCQUF1QjtRQUN2QixNQUFNLGVBQWUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMxRCxzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDbkMsWUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDL0QseUhBQXlIO1FBQ3pILHdGQUF3RjtRQUN4RixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELEtBQUssWUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFdkQsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3BELDJEQUEyRDtRQUMzRCxJQUFJO1lBQ0YsTUFBTSxHQUFHLEdBQUcsZ0NBQ1AsT0FBTyxDQUFDLEdBQUcsS0FDZCxRQUFRLEVBQUUsYUFBYSxHQUNILENBQUM7WUFFdkIsSUFBSSxNQUFNLENBQUMsS0FBSztnQkFDZCxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQztZQUN0QyxJQUFJLE1BQU0sQ0FBQyxPQUFPO2dCQUNoQixHQUFHLENBQUMsa0JBQWtCLEdBQUcsTUFBTSxDQUFDO1lBRWxDLE1BQU0sT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVyRCxNQUFNLElBQUEsbUJBQUcsRUFBQyxLQUFLLEVBQUUsR0FBRyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ25ELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNwRCxNQUFNLElBQUEsbUJBQUcsRUFBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNoRCxvR0FBb0c7WUFDcEcsaUVBQWlFO1lBQ2pFLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNwRCxJQUFJO2dCQUNGLE1BQU0sSUFBQSxtQkFBRyxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2FBQ2xEO1lBQUMsT0FBTyxNQUFNLEVBQUU7Z0JBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNqRTtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixzQ0FBc0M7WUFDdEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsRUFBRyxDQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEUsTUFBTSxDQUFDLENBQUM7U0FDVDtnQkFBUztZQUNSLHNDQUFzQztZQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxlQUFlLENBQUMsQ0FBQztZQUN2QywwREFBMEQ7WUFDMUQsWUFBRSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDNUQsTUFBTSxlQUFlLEVBQUUsQ0FBQztZQUN4QixJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDO2dCQUN6QixNQUFNLFlBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ3RDO1FBRUQsU0FBUyxlQUFlO1lBQ3RCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMsRUFBRSxFQUFFO2dCQUM3RCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtvQkFDeEIsa0JBQUssQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNyQyxPQUFPLFlBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztpQkFDekU7Z0JBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNOLENBQUM7SUFDSCxDQUFDO0NBQUE7QUF4RkQsb0NBd0ZDO0FBRUQsU0FBZSxvQkFBb0IsQ0FBQyxZQUFvQjs7UUFDdEQsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEQsSUFBSSxZQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUN2QixPQUFPO1FBQ1QsTUFBTSxPQUFPLEdBQUcsTUFBTSxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ25DLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxFQUFFLElBQUEsZ0NBQW9CLEdBQUUsRUFDM0MsSUFBQSxrQkFBTSxFQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUN4QixJQUFBLGdCQUFJLEVBQUMsQ0FBQyxDQUFDLENBQ1IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVoQixJQUFJLE9BQU8sRUFBRTtZQUNYLHNDQUFzQztZQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3JDLFlBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsa0NBQWtDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztTQUN0RjtJQUNILENBQUM7Q0FBQTtBQUVELFNBQWUsbUJBQW1CLENBQUMsdUJBQWtDOztRQUNuRSxNQUFNLFVBQVUsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6RCxNQUFNLFNBQVMsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN4RCxJQUFJLE9BQXNCLENBQUM7UUFFM0IsSUFBSSx1QkFBdUIsRUFBRTtZQUMzQixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFDL0QsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzdELE9BQU8sR0FBRyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7Z0JBQy9DLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDaEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxjQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDbEYsSUFBSSxNQUFNLElBQUksQ0FBQyxFQUFFO29CQUNmLE1BQU0sZUFBZSxHQUFHLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUUsQ0FBQztvQkFDMUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO3dCQUN4Qyx3QkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQzs0QkFDdEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUM7NEJBQ3BCLElBQUksRUFBRSxDQUFDLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO3lCQUN2RCxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7cUJBQU07b0JBQ0wsTUFBTSxJQUFJLEdBQUcsQ0FBQyxHQUFHLFFBQVEsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO29CQUNwRCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQzFELE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLEdBQUcsSUFBSyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUcsY0FBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7b0JBQy9HLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTt3QkFDWixNQUFNLElBQUksR0FBRyxRQUFRLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBRSxDQUFDO3dCQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7NEJBQzdCLHdCQUFnQixDQUFDLHlCQUF5QixDQUFDO2dDQUN6QyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQztnQ0FDbEIsSUFBSSxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFDLElBQUksRUFBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7NkJBQzVDLENBQUMsQ0FBQzt5QkFDSjtxQkFDRjt5QkFBTTt3QkFDTCxNQUFNLElBQUksS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsK0NBQStDLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDNUg7aUJBQ0Y7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUNILHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7U0FDM0Q7YUFBTTtZQUNMLE1BQU0sRUFBRSxHQUFHLENBQUMsd0RBQWEsbUJBQW1CLEdBQUMsQ0FBQyxDQUFDO1lBQy9DLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDYixNQUFNLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxJQUFJLENBQzFCLElBQUEsZUFBRyxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUU7Z0JBQy9CLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7b0JBQy9CLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLElBQUksSUFBSSxJQUFJLElBQUksTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7b0JBQ2xELFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUU1QixNQUFNLElBQUksR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ2hELElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUU7b0JBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ25CLElBQUksSUFBSTt3QkFDTixVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt5QkFDOUIsSUFBSSxNQUFNO3dCQUNiLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzt3QkFFbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLFFBQVEsRUFBRSxDQUFDLENBQUM7aUJBQ25DO3FCQUFNO29CQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxRQUFRLGtEQUFrRCxDQUFDLENBQUM7aUJBQ3JGO1lBQ0gsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNkLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzlDLHdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7YUFDdEQ7WUFDRCxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNoRCx3QkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQyxFQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQzthQUNyRTtZQUVELHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDMUQ7SUFDSCxDQUFDO0NBQUE7QUFFRCxTQUFTLDJCQUEyQixDQUFDLEtBQWE7SUFDaEQsSUFBSSxjQUFjLEtBQUssUUFBUSxJQUFJLFlBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7UUFDeEYsa0JBQUssQ0FBQyxNQUFNLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ25ELEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztLQUM1QjtJQUNELE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxjQUFjLElBQUksY0FBYyxDQUFDLENBQUM7SUFDbEYsa0JBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0IsTUFBTSxFQUFFLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUUsQ0FBQztJQUU3QyxNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2RCxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVyQyxJQUFJLGNBQWMsS0FBSyxjQUFjLEVBQUU7UUFDckMsSUFBSSxFQUFFLENBQUMsbUJBQW1CLEVBQUU7WUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxFQUFFLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFO2dCQUMvQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1NBQ3pCO1FBQ0Qsd0JBQWdCLENBQUMsZ0JBQWdCLENBQUM7WUFDaEMsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQztZQUN6QyxLQUFLLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQUMsQ0FBQyxDQUFDO0tBQ3JFO0lBRUQsSUFBSSxnQkFBZ0IsR0FBRyxJQUFBLFdBQUksRUFBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7U0FDL0MsSUFBSSxDQUNILElBQUEsZUFBRyxFQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsbUJBQW9CLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLENBQ3BGLENBQUM7SUFDRixNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEMsSUFBSSxPQUFPLEtBQUssZUFBUSxDQUFDLE9BQU8sRUFBRTtRQUNoQyxnQkFBZ0IsR0FBRyxJQUFBLGFBQU0sRUFBQyxnQkFBZ0IsRUFBRSxJQUFBLFNBQUUsRUFBQyxRQUFRLEVBQUUsQ0FBQyxVQUFXLElBQUksUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztLQUNyRztJQUVELE9BQU8sSUFBQSxZQUFLLEVBQ1YsZ0JBQWdCLENBQUMsSUFBSSxDQUNuQixJQUFBLG9DQUFvQixFQUFDLFVBQVUsQ0FBQyxDQUNqQyxFQUNELHFCQUFxQixDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FDOUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFlLHFCQUFxQixDQUFDLFFBQWdCLEVBQUUsVUFBdUI7O1FBQzVFLE1BQU0sS0FBSyxHQUFvQixFQUFFLENBQUM7UUFDbEMsTUFBTSxRQUFRLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVSxJQUFJLFFBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztRQUNuRSxNQUFNLFFBQVEsR0FBRyxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUUsSUFBSSxDQUFDO1FBQ2hDLE1BQU0sS0FBSyxHQUFHLElBQUEsNkJBQWtCLEVBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ2hELE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEUsSUFBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxLQUFLLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDM0Usc0NBQXNDO2dCQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLDhCQUE4QixJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQyxLQUFLLENBQUMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDdEM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sS0FBSyxDQUFDO1FBQ1osTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzNCLENBQUM7Q0FBQTtBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLGlCQUFpQixDQUFDLFVBQWtCLEVBQUUsV0FBVyxHQUFHLEtBQUs7SUFDdkUsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdELE9BQU8seUJBQXlCLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBSEQsOENBR0M7QUFDRDs7OztHQUlHO0FBQ0gsUUFBUSxDQUFDLENBQUMsOEJBQThCLENBQUMsS0FBb0IsRUFBRSxZQUFvQjtJQUNqRixNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBRSxDQUFDLGlCQUFpQixDQUFDO0lBQ2hGLDZGQUE2RjtJQUM3Rix5RUFBeUU7SUFDekUsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsRUFBRTtRQUN0RixJQUFJLElBQUksSUFBSSxJQUFJO1lBQ2QsU0FBUztRQUNYLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLFlBQVksRUFBRTtnQkFDdkQsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7Z0JBQzVGLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDN0IsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQzFCLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLGNBQWMsQ0FBQyxFQUFFLElBQUksQ0FDL0UsQ0FBQztvQkFDRixJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFO3dCQUMvQixNQUFNLEVBQUUsQ0FBQztxQkFDVjtpQkFDRjthQUNGO1NBQ0Y7S0FDRjtBQUNILENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLHlCQUF5QixDQUFDLFVBQWtCLEVBQUUsSUFBUyxFQUFFLFdBQVcsR0FBRyxLQUFLO0lBQ25GLE1BQU0sQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sTUFBTSxHQUFnQjtRQUMxQixTQUFTLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUNoQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixLQUFLLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUNaLElBQUksRUFBRSxjQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQzFDLElBQUk7UUFDSixRQUFRLEVBQUUsWUFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELFdBQVc7S0FDWixDQUFDO0lBQ0YsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFVO0lBQ2xDLElBQUksZ0JBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQjtJQUNELGtCQUFLLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN6QiwwQkFBMEI7SUFDMUIsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuQixFQUFFLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjs7UUFFM0MsRUFBRSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsZUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztJQUMzQyxzQ0FBc0M7SUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxJQUFZLEVBQUUsRUFBVTtJQUNqRCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxFQUFFLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQUMsWUFBb0I7SUFDeEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUUsQ0FBQztJQUN6RCxNQUFNLFNBQVMsR0FBRyxHQUFHLEVBQUUsR0FBRSxDQUFDLENBQUM7SUFDM0IsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUU7UUFDakYsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN6RSxPQUFPLFlBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQzthQUM1QixJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUNiLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUU7Z0JBQzFCLHNDQUFzQztnQkFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsY0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLHNDQUFzQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRyxPQUFPLFlBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVW5mb3J0dW5hdGVseSwgdGhpcyBmaWxlIGlzIHZlcnkgbG9uZywgeW91IG5lZWQgdG8gZm9sZCBieSBpbmRlbnRpb24gZm9yIGJldHRlciB2aWV3IG9mIHNvdXJjZSBjb2RlIGluIEVkaXRvclxuICovXG5cbmltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnNleHQgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7ZnJvbSwgbWVyZ2UsIE9ic2VydmFibGUsIG9mLCBkZWZlciwgdGhyb3dFcnJvciwgRU1QVFksIGNvbmNhdH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIGRlYm91bmNlVGltZSwgdGFrZVdoaWxlLFxuICB0YWtlLCBjb25jYXRNYXAsIGlnbm9yZUVsZW1lbnRzLCBzY2FuLCBjYXRjaEVycm9yLCB0YXAsIGZpbmFsaXplIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiwgRGVwZW5kZW50SW5mbyB9IGZyb20gJy4uL3RyYW5zaXRpdmUtZGVwLWhvaXN0ZXInO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBzZXRQcm9qZWN0TGlzdCwgc2V0TGlua1BhdHRlcm5zfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7aXNBY3Rpb25PZkNyZWF0b3IsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L2hlbHBlcic7XG4vLyBpbXBvcnQgeyBnZXRSb290RGlyIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgY2xlYW5JbnZhbGlkU3ltbGlua3MsIHsgaXNXaW4zMiwgbGlzdE1vZHVsZVN5bWxpbmtzLCB1bmxpbmtBc3luYyB9IGZyb20gJy4uL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCB7c3ltYm9saWNMaW5rUGFja2FnZXN9IGZyb20gJy4uL3J3UGFja2FnZUpzb24nO1xuaW1wb3J0IHsgRU9MIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBwbGlua0VudiB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLW1ncicpO1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2NvcGU6IHN0cmluZztcbiAgc2hvcnROYW1lOiBzdHJpbmc7XG4gIGpzb246IHtcbiAgICBwbGluaz86IFBsaW5rSnNvblR5cGU7XG4gICAgZHI/OiBQbGlua0pzb25UeXBlO1xuICAgIFtwOiBzdHJpbmddOiBhbnk7XG4gIH0gJiBQYWNrYWdlSnNvbkludGVyZjtcbiAgLyoqIEJlIGF3YXJlOiBJZiB0aGlzIHByb3BlcnR5IGlzIG5vdCBzYW1lIGFzIFwicmVhbFBhdGhcIixcbiAgICogdGhlbiBpdCBpcyBhIHN5bWxpbmsgd2hvc2UgcGF0aCBpcyByZWxhdGl2ZSB0byB3b3Jrc3BhY2UgZGlyZWN0b3J5ICovXG4gIHBhdGg6IHN0cmluZztcbiAgcmVhbFBhdGg6IHN0cmluZztcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCB0eXBlIFBsaW5rSnNvblR5cGUgPSB7XG4gIHR5cGVSb290Pzogc3RyaW5nO1xuICB0eXBlPzogJ3NlcnZlcicgfCBzdHJpbmdbXSB8IHN0cmluZztcbiAgc2VydmVyUHJpb3JpdHk/OiBzdHJpbmcgfCBudW1iZXI7XG4gIHNlcnZlckVudHJ5Pzogc3RyaW5nO1xuICBzZXR0aW5nPzoge1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPHBhdGg+IzxleHBvcnQtbmFtZT5cIiAqL1xuICAgIHR5cGU6IHN0cmluZztcbiAgICAvKiogSW4gZm9ybSBvZiBcIjxtb2R1bGUtcGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdmFsdWU6IHN0cmluZztcbiAgfTtcbiAgW3A6IHN0cmluZ106IGFueTtcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIG5wbUluc3RhbGxPcHQ6IE5wbU9wdGlvbnM7XG4gIGluaXRlZDogYm9vbGVhbjtcbiAgc3JjUGFja2FnZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLyoqIEtleSBpcyByZWxhdGl2ZSBwYXRoIHRvIHJvb3Qgd29ya3NwYWNlICovXG4gIHdvcmtzcGFjZXM6IE1hcDxzdHJpbmcsIFdvcmtzcGFjZVN0YXRlPjtcbiAgLyoqIGtleSBvZiBjdXJyZW50IFwid29ya3NwYWNlc1wiICovXG4gIGN1cnJXb3Jrc3BhY2U/OiBzdHJpbmcgfCBudWxsO1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIHNyY0RpcjJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICAvKiogRHJjcCBpcyB0aGUgb3JpZ2luYWwgbmFtZSBvZiBQbGluayBwcm9qZWN0ICovXG4gIGxpbmtlZERyY3A/OiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGxpbmtlZERyY3BQcm9qZWN0Pzogc3RyaW5nIHwgbnVsbDtcbiAgaW5zdGFsbGVkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgZ2l0SWdub3Jlczoge1tmaWxlOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIGlzSW5DaGluYT86IGJvb2xlYW47XG4gIC8qKiBFdmVyeXRpbWUgYSBob2lzdCB3b3Jrc3BhY2Ugc3RhdGUgY2FsY3VsYXRpb24gaXMgYmFzaWNhbGx5IGRvbmUsIGl0IGlzIGluY3JlYXNlZCBieSAxICovXG4gIHdvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG4gIHBhY2thZ2VzVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgLyoqIHdvcmtzcGFjZSBrZXkgKi9cbiAgbGFzdENyZWF0ZWRXb3Jrc3BhY2U/OiBzdHJpbmc7XG59XG5cbmNvbnN0IHtkaXN0RGlyLCByb290RGlyLCBwbGlua0RpciwgaXNEcmNwU3ltbGluaywgc3ltbGlua0Rpck5hbWV9ID0gcGxpbmtFbnY7XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgaW5pdGVkOiBmYWxzZSxcbiAgd29ya3NwYWNlczogbmV3IE1hcCgpLFxuICBwcm9qZWN0MlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY0RpcjJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNQYWNrYWdlczogbmV3IE1hcCgpLFxuICBnaXRJZ25vcmVzOiB7fSxcbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IDAsXG4gIHBhY2thZ2VzVXBkYXRlQ2hlY2tzdW06IDAsXG4gIG5wbUluc3RhbGxPcHQ6IHtpc0ZvcmNlOiBmYWxzZX1cbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBpZDogc3RyaW5nO1xuICBvcmlnaW5JbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIG9yaWdpbkluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgaW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgLyoqIG5hbWVzIG9mIHRob3NlIGxpbmtlZCBzb3VyY2UgcGFja2FnZXMgKi9cbiAgbGlua2VkRGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBsaW5rZWQgc291cmNlIHBhY2thZ2VzICovXG4gIGxpbmtlZERldkRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuXG4gIC8qKiBpbnN0YWxsZWQgRFIgY29tcG9uZW50IHBhY2thZ2VzIFtuYW1lLCB2ZXJzaW9uXSovXG4gIGluc3RhbGxlZENvbXBvbmVudHM/OiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG5cbiAgaG9pc3RJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3RQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3REZXZJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3REZXZQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3RJbmZvU3VtbWFyeT86IHtcbiAgICAvKiogVXNlciBzaG91bGQgbWFudWxseSBhZGQgdGhlbSBhcyBkZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlICovXG4gICAgbWlzc2luZ0RlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgICAvKiogVXNlciBzaG91bGQgbWFudWxseSBhZGQgdGhlbSBhcyBkZXZEZXBlbmRlbmNpZXMgb2Ygd29ya3NwYWNlICovXG4gICAgbWlzc2luZ0RldkRlcHM6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgICAvKiogdmVyc2lvbnMgYXJlIGNvbmZsaWN0ICovXG4gICAgY29uZmxpY3REZXBzOiBzdHJpbmdbXTtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOcG1PcHRpb25zIHtcbiAgY2FjaGU/OiBzdHJpbmc7XG4gIGlzRm9yY2U6IGJvb2xlYW47XG4gIHVzZU5wbUNpPzogYm9vbGVhbjtcbiAgb2ZmbGluZT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6IE5TLFxuICBpbml0aWFsU3RhdGU6IHN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIC8qKiBEbyB0aGlzIGFjdGlvbiBhZnRlciBhbnkgbGlua2VkIHBhY2thZ2UgaXMgcmVtb3ZlZCBvciBhZGRlZCAgKi9cbiAgICBpbml0Um9vdERpcihkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248TnBtT3B0aW9ucz4pIHtcbiAgICAgIGQubnBtSW5zdGFsbE9wdC5jYWNoZSA9IHBheWxvYWQuY2FjaGU7XG4gICAgICBkLm5wbUluc3RhbGxPcHQudXNlTnBtQ2kgPSBwYXlsb2FkLnVzZU5wbUNpO1xuICAgIH0sXG5cbiAgICAvKiogXG4gICAgICogLSBDcmVhdGUgaW5pdGlhbCBmaWxlcyBpbiByb290IGRpcmVjdG9yeVxuICAgICAqIC0gU2NhbiBsaW5rZWQgcGFja2FnZXMgYW5kIGluc3RhbGwgdHJhbnNpdGl2ZSBkZXBlbmRlbmN5XG4gICAgICogLSBTd2l0Y2ggdG8gZGlmZmVyZW50IHdvcmtzcGFjZVxuICAgICAqIC0gRGVsZXRlIG5vbmV4aXN0aW5nIHdvcmtzcGFjZVxuICAgICAqIC0gSWYgXCJwYWNrYWdlSnNvbkZpbGVzXCIgaXMgcHJvdmlkZWQsIGl0IHNob3VsZCBza2lwIHN0ZXAgb2Ygc2Nhbm5pbmcgbGlua2VkIHBhY2thZ2VzXG4gICAgICogLSBUT0RPOiBpZiB0aGVyZSBpcyBsaW5rZWQgcGFja2FnZSB1c2VkIGluIG1vcmUgdGhhbiBvbmUgd29ya3NwYWNlLCBob2lzdCBhbmQgaW5zdGFsbCBmb3IgdGhlbSBhbGw/XG4gICAgICovXG4gICAgdXBkYXRlV29ya3NwYWNlKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7XG4gICAgICBkaXI6IHN0cmluZztcbiAgICAgIC8vIGNyZWF0ZUhvb2s6IGJvb2xlYW47XG4gICAgICBwYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW107XG4gICAgfSAmIE5wbU9wdGlvbnM+KSB7XG4gICAgICBkLm5wbUluc3RhbGxPcHQuY2FjaGUgPSBwYXlsb2FkLmNhY2hlO1xuICAgICAgZC5ucG1JbnN0YWxsT3B0LnVzZU5wbUNpID0gcGF5bG9hZC51c2VOcG1DaTtcbiAgICB9LFxuICAgIHNjYW5BbmRTeW5jUGFja2FnZXMoZDogUGFja2FnZXNTdGF0ZSwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtwYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW119Pikge1xuICAgIH0sXG5cbiAgICB1cGRhdGVEaXIoKSB7fSxcbiAgICBfdXBkYXRlUGxpbmtQYWNrYWdlSW5mbyhkKSB7XG4gICAgICBjb25zdCBwbGlua1BrZyA9IGNyZWF0ZVBhY2thZ2VJbmZvKFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3BhY2thZ2UuanNvbicpLCBmYWxzZSk7XG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICBkLmxpbmtlZERyY3AgPSBwbGlua1BrZztcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5saW5rZWREcmNwUHJvamVjdCA9IHBhdGhUb1Byb2pLZXkoUGF0aC5kaXJuYW1lKGQubGlua2VkRHJjcC5yZWFsUGF0aCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBudWxsO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3N5bmNMaW5rZWRQYWNrYWdlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248W3BrZ3M6IFBhY2thZ2VJbmZvW10sIG9wZXJhdG9yOiAndXBkYXRlJyB8ICdjbGVhbiddPikge1xuICAgICAgZC5pbml0ZWQgPSB0cnVlO1xuICAgICAgbGV0IG1hcCA9IGQuc3JjUGFja2FnZXM7XG4gICAgICBpZiAocGF5bG9hZFsxXSA9PT0gJ2NsZWFuJykge1xuICAgICAgICBtYXAgPSBkLnNyY1BhY2thZ2VzID0gbmV3IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPigpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZFswXSkge1xuICAgICAgICBtYXAuc2V0KHBrSW5mby5uYW1lLCBwa0luZm8pO1xuICAgICAgfVxuICAgIH0sXG4gICAgb25MaW5rZWRQYWNrYWdlQWRkZWQoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgYWRkUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGlmICghZC5wcm9qZWN0MlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5kZWxldGUoZGlyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFkZFNyY0RpcnMoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQuc3JjRGlyMlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5zcmNEaXIyUGFja2FnZXMuc2V0KGRpciwgW10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVTcmNEaXJzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgZC5zcmNEaXIyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICAvKiogcGF5bG9hZDogd29ya3NwYWNlIGtleXMsIGhhcHBlbnMgYXMgZGVib3VuY2VkIHdvcmtzcGFjZSBjaGFuZ2UgZXZlbnQgKi9cbiAgICBfd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIC8qKiB3b3Jrc3BhY2VDaGFuZ2VkIGlzIHNhZmUgZm9yIGV4dGVybmFsIG1vZHVsZSB0byB3YXRjaCwgaXQgc2VyaWFsaXplIGFjdGlvbnMgbGlrZSBcIl9pbnN0YWxsV29ya3NwYWNlXCIgYW5kIFwiX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZFwiICovXG4gICAgd29ya3NwYWNlQ2hhbmdlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1cGRhdGVHaXRJZ25vcmVzKGQsIHtwYXlsb2FkOiB7ZmlsZSwgbGluZXN9fTogUGF5bG9hZEFjdGlvbjx7ZmlsZTogc3RyaW5nOyBsaW5lczogc3RyaW5nW119Pikge1xuICAgICAgbGV0IHJlbCA9IGZpbGUsIGFicyA9IGZpbGU7XG4gICAgICBpZiAoUGF0aC5pc0Fic29sdXRlKGZpbGUpKSB7XG4gICAgICAgIHJlbCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgZmlsZSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBhYnMgPSBmaWxlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWJzID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGZpbGUpO1xuICAgICAgfVxuICAgICAgaWYgKGQuZ2l0SWdub3Jlc1thYnNdKSB7XG4gICAgICAgIGRlbGV0ZSBkLmdpdElnbm9yZXNbYWJzXTtcbiAgICAgIH1cbiAgICAgIGQuZ2l0SWdub3Jlc1tyZWxdID0gbGluZXMubWFwKGxpbmUgPT4gbGluZS5zdGFydHNXaXRoKCcvJykgPyBsaW5lIDogJy8nICsgbGluZSk7XG4gICAgfSxcbiAgICBwYWNrYWdlc1VwZGF0ZWQoZCkge1xuICAgICAgZC5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKys7XG4gICAgfSxcbiAgICBzZXRJbkNoaW5hKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxib29sZWFuPikge1xuICAgICAgZC5pc0luQ2hpbmEgPSBwYXlsb2FkO1xuICAgIH0sXG4gICAgX3NldEN1cnJlbnRXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IGRpcn06IFBheWxvYWRBY3Rpb248c3RyaW5nIHwgbnVsbD4pIHtcbiAgICAgIGlmIChkaXIgIT0gbnVsbClcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBlbHNlXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IG51bGw7XG4gICAgfSxcbiAgICAvKiogcGFyYW10ZXI6IHdvcmtzcGFjZSBrZXkgKi9cbiAgICB3b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHtcbiAgICAgIGQud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0gKz0gMTtcbiAgICB9LFxuICAgIC8vIG9uV29ya3NwYWNlUGFja2FnZVVwZGF0ZWQoZCwge3BheWxvYWQ6IHdvcmtzcGFjZUtleX06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgX2hvaXN0V29ya3NwYWNlRGVwcyhzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcInNyY1BhY2thZ2VzXCIgaXMgbnVsbCwgbmVlZCB0byBydW4gYGluaXRgIGNvbW1hbmQgZmlyc3QnKTtcbiAgICAgIH1cblxuICAgICAgbGV0IHBranNvblN0cjogc3RyaW5nO1xuICAgICAgY29uc3QgcGtnanNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwbGluay5pbnN0YWxsLmxvY2snKTtcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSkge1xuICAgICAgICBsb2cud2FybignUGxpbmsgaW5pdC9zeW5jIHByb2Nlc3Mgd2FzIGludGVycnVwdGVkIGxhc3QgdGltZSwgcmVjb3ZlciBjb250ZW50IG9mICcgKyBwa2dqc29uRmlsZSk7XG4gICAgICAgIHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhsb2NrRmlsZSwgJ3V0ZjgnKTtcbiAgICAgICAgZnMudW5saW5rU3luYyhsb2NrRmlsZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMocGtnanNvbkZpbGUsICd1dGY4Jyk7XG4gICAgICB9XG4gICAgICBjb25zdCBwa2pzb246IFBhY2thZ2VKc29uSW50ZXJmID0gSlNPTi5wYXJzZShwa2pzb25TdHIpO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXBzIG9mIFtwa2pzb24uZGVwZW5kZW5jaWVzLCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXSBhcyB7W25hbWU6IHN0cmluZ106IHN0cmluZ31bXSApIHtcbiAgICAgIC8vICAgT2JqZWN0LmVudHJpZXMoZGVwcyk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30pO1xuXG4gICAgICAvLyBjb25zdCB1cGRhdGluZ0RlcHMgPSB7Li4ucGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXBzID0gW107XG4gICAgICBkZXBzLmZvckVhY2goZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIC8vIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZm9yRWFjaChkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGVwcywgaG9pc3RlZFBlZXJzOiBob2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdGVkRGV2OiBob2lzdGVkRGV2RGVwcywgaG9pc3RlZERldlBlZXJzOiBkZXZIb2lzdFBlZXJEZXBJbmZvXG4gICAgICB9ID1cbiAgICAgICAgbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICAgIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSwgcGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSwgcGtqc29uLmRldkRlcGVuZGVuY2llc1xuICAgICAgKTtcblxuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLmZpbHRlcigoW25hbWVdKSA9PiAhaXNEcmNwU3ltbGluayB8fCBuYW1lICE9PSAnQHdmaC9wbGluaycpXG4gICAgICAgIC5yZWR1Y2UoKGRpYywgW25hbWUsIGluZm9dKSA9PiB7XG4gICAgICAgICAgZGljW25hbWVdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgcmV0dXJuIGRpYztcbiAgICAgICAgfSwge30gYXMge1trZXk6IHN0cmluZ106IHN0cmluZ30pLFxuXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGV2RGVwcy5lbnRyaWVzKCkpXG4gICAgICAgIC5jb25jYXQoQXJyYXkuZnJvbShkZXZIb2lzdFBlZXJEZXBJbmZvLmVudHJpZXMoKSkuZmlsdGVyKGl0ZW0gPT4gIWl0ZW1bMV0ubWlzc2luZykpXG4gICAgICAgIC5maWx0ZXIoKFtuYW1lXSkgPT4gIWlzRHJjcFN5bWxpbmsgfHwgbmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KVxuICAgICAgfTtcblxuICAgICAgLy8gbG9nLmluZm8oaW5zdGFsbEpzb24pXG4gICAgICAvLyBjb25zdCBpbnN0YWxsZWRDb21wID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKHN0YXRlLndvcmtzcGFjZXMsIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSk7XG5cbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gc3RhdGUud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuXG4gICAgICBjb25zdCBob2lzdEluZm9TdW1tYXJ5OiBXb3Jrc3BhY2VTdGF0ZVsnaG9pc3RJbmZvU3VtbWFyeSddID0ge1xuICAgICAgICBjb25mbGljdERlcHM6IFtdLCBtaXNzaW5nRGVwczoge30sIG1pc3NpbmdEZXZEZXBzOiB7fVxuICAgICAgfTtcblxuICAgICAgZm9yIChjb25zdCBkZXBzSW5mbyBvZiBbaG9pc3RlZERlcHMsIGhvaXN0UGVlckRlcEluZm9dKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2RlcCwgaW5mb10gb2YgZGVwc0luZm8uZW50cmllcygpKSB7XG4gICAgICAgICAgaWYgKGluZm8ubWlzc2luZykge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5taXNzaW5nRGVwc1tkZXBdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaW5mby5zYW1lVmVyICYmICFpbmZvLmRpcmVjdCkge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5jb25mbGljdERlcHMucHVzaChkZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBkZXBzSW5mbyBvZiBbaG9pc3RlZERldkRlcHMsIGRldkhvaXN0UGVlckRlcEluZm9dKSB7XG4gICAgICAgIGZvciAoY29uc3QgW2RlcCwgaW5mb10gb2YgZGVwc0luZm8uZW50cmllcygpKSB7XG4gICAgICAgICAgaWYgKGluZm8ubWlzc2luZykge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5taXNzaW5nRGV2RGVwc1tkZXBdID0gaW5mby5ieVswXS52ZXI7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghaW5mby5zYW1lVmVyICYmICFpbmZvLmRpcmVjdCkge1xuICAgICAgICAgICAgaG9pc3RJbmZvU3VtbWFyeS5jb25mbGljdERlcHMucHVzaChkZXApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBjb25zdCB3cDogV29ya3NwYWNlU3RhdGUgPSB7XG4gICAgICAgIGlkOiB3c0tleSxcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb246IHBranNvbixcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHBranNvblN0cixcbiAgICAgICAgaW5zdGFsbEpzb24sXG4gICAgICAgIGluc3RhbGxKc29uU3RyOiBKU09OLnN0cmluZ2lmeShpbnN0YWxsSnNvbiwgbnVsbCwgJyAgJyksXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcyxcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLFxuICAgICAgICBob2lzdEluZm86IGhvaXN0ZWREZXBzLFxuICAgICAgICBob2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdERldkluZm86IGhvaXN0ZWREZXZEZXBzLFxuICAgICAgICBob2lzdERldlBlZXJEZXBJbmZvOiBkZXZIb2lzdFBlZXJEZXBJbmZvLFxuICAgICAgICBob2lzdEluZm9TdW1tYXJ5XG4gICAgICB9O1xuICAgICAgc3RhdGUubGFzdENyZWF0ZWRXb3Jrc3BhY2UgPSB3c0tleTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXMuc2V0KHdzS2V5LCBleGlzdGluZyA/IE9iamVjdC5hc3NpZ24oZXhpc3RpbmcsIHdwKSA6IHdwKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKGQsIHtwYXlsb2FkOiB7d29ya3NwYWNlS2V5fX06IFBheWxvYWRBY3Rpb248e3dvcmtzcGFjZUtleTogc3RyaW5nfT4pIHt9LFxuICAgIC8vIF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1ByaihkLCB7cGF5bG9hZDoge3ByaiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwcmo6IHN0cmluZzsgcGtnczoge25hbWU6IHN0cmluZ31bXX0+KSB7XG4gICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocHJqKSwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9TcmNEaXIoZCxcbiAgICAgIHtwYXlsb2FkOiB7cGF0dGVybiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwYXR0ZXJuOiBzdHJpbmc7IHBrZ3M6IHtuYW1lOiBzdHJpbmd9W119Pikge1xuICAgICAgZC5zcmNEaXIyUGFja2FnZXMuc2V0KHBhdGhUb1Byb2pLZXkocGF0dGVybiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbmV4cG9ydCBjb25zdCB7dXBkYXRlR2l0SWdub3Jlcywgb25MaW5rZWRQYWNrYWdlQWRkZWR9ID0gYWN0aW9uRGlzcGF0Y2hlcjtcblxuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgY29uc3QgdXBkYXRlZFdvcmtzcGFjZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlQWRkZWRMaXN0ID0gbmV3IEFycmF5PHN0cmluZz4oKTtcblxuICBjb25zdCBnaXRJZ25vcmVGaWxlc1dhaXRpbmcgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICBpZiAoZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMgPT0gbnVsbCkge1xuICAgIC8vIEJlY2F1c2Ugc3JjRGlyMlBhY2thZ2VzIGlzIG5ld2x5IGFkZGVkLCB0byBhdm9pZCBleGlzdGluZyBwcm9qZWN0XG4gICAgLy8gYmVpbmcgYnJva2VuIGZvciBtaXNzaW5nIGl0IGluIHByZXZpb3VzbHkgc3RvcmVkIHN0YXRlIGZpbGVcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzLnNyY0RpcjJQYWNrYWdlcyA9IG5ldyBNYXAoKSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQnlUeXBlcyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gIHJldHVybiBtZXJnZShcbiAgICAvLyBUbyBvdmVycmlkZSBzdG9yZWQgc3RhdGUuIFxuICAgIC8vIERvIG5vdCBwdXQgZm9sbG93aW5nIGxvZ2ljIGluIGluaXRpYWxTdGF0ZSEgSXQgd2lsbCBiZSBvdmVycmlkZGVuIGJ5IHByZXZpb3VzbHkgc2F2ZWQgc3RhdGVcblxuICAgIGRlZmVyKCgpID0+IHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGxpbmtQYWNrYWdlSW5mbygpKTtcbiAgICAgIHJldHVybiBFTVBUWTtcbiAgICB9KSxcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdExpc3QoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICAgIHJldHVybiBwa3M7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuc3JjRGlyMlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIodiA9PiB2ICE9IG51bGwpLFxuICAgICAgbWFwKChsaW5rUGF0dGVybk1hcCkgPT4ge1xuICAgICAgICBzZXRMaW5rUGF0dGVybnMobGlua1BhdHRlcm5NYXAua2V5cygpKTtcbiAgICAgIH0pKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzY2FuPFBhY2thZ2VzU3RhdGVbJ3NyY1BhY2thZ2VzJ10+KChwcmV2TWFwLCBjdXJyTWFwKSA9PiB7XG4gICAgICAgIHBhY2thZ2VBZGRlZExpc3Quc3BsaWNlKDApO1xuICAgICAgICBmb3IgKGNvbnN0IG5tIG9mIGN1cnJNYXAua2V5cygpKSB7XG4gICAgICAgICAgaWYgKCFwcmV2TWFwLmhhcyhubSkpIHtcbiAgICAgICAgICAgIHBhY2thZ2VBZGRlZExpc3QucHVzaChubSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYWNrYWdlQWRkZWRMaXN0Lmxlbmd0aCA+IDApXG4gICAgICAgICAgb25MaW5rZWRQYWNrYWdlQWRkZWQocGFja2FnZUFkZGVkTGlzdCk7XG4gICAgICAgIHJldHVybiBjdXJyTWFwO1xuICAgICAgfSlcbiAgICApLFxuICAgIC8vICB1cGRhdGVXb3Jrc3BhY2VcbiAgICBhY3Rpb25CeVR5cGVzLnVwZGF0ZVdvcmtzcGFjZS5waXBlKFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZDoge2RpciwgaXNGb3JjZSwgdXNlTnBtQ2ksIHBhY2thZ2VKc29uRmlsZXN9fSkgPT4ge1xuICAgICAgICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICAgICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCBQYXRoLnJlc29sdmUoZGlyLCAnYXBwLmpzJykpO1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGxvY2tGaWxlKSB8fCBpc0ZvcmNlIHx8IHVzZU5wbUNpKSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgY29uc3Qgd3MgPSBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgbG9nLmRlYnVnKCdmb3JjZSBucG0gaW5zdGFsbCBpbicsIHdzS2V5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBjYWxsIGluaXRSb290RGlyZWN0b3J5KCkgYW5kIHdhaXQgZm9yIGl0IGZpbmlzaGVkIGJ5IG9ic2VydmluZyBhY3Rpb24gJ19zeW5jTGlua2VkUGFja2FnZXMnLFxuICAgICAgICAvLyB0aGVuIGNhbGwgX2hvaXN0V29ya3NwYWNlRGVwc1xuICAgICAgICByZXR1cm4gbWVyZ2UoXG4gICAgICAgICAgcGFja2FnZUpzb25GaWxlcyAhPSBudWxsID8gc2NhbkFuZFN5bmNQYWNrYWdlcyhwYWNrYWdlSnNvbkZpbGVzKSA6XG4gICAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeSgpKSksXG4gICAgICAgICAgYWN0aW9uJC5waXBlKFxuICAgICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX3N5bmNMaW5rZWRQYWNrYWdlcyksXG4gICAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgICAgbWFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSkpXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuICAgIGFjdGlvbkJ5VHlwZXMuc2NhbkFuZFN5bmNQYWNrYWdlcy5waXBlKFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHNjYW5BbmRTeW5jUGFja2FnZXMocGF5bG9hZC5wYWNrYWdlSnNvbkZpbGVzKSxcbiAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY0xpbmtlZFBhY2thZ2VzKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICB0YXAoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjdXJyV3MgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmICh3c0tleSAhPT0gY3VycldzKVxuICAgICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoY3VycldzICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgXCJjdXJyZW50IHdvcmtzcGFjZVwiIGlzIHRoZSBsYXN0IG9uZSBiZWluZyB1cGRhdGVkLCBzbyB0aGF0IGl0IHJlbWFpbnMgXCJjdXJyZW50XCJcbiAgICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2RpcjogUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnJXcyl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbkJ5VHlwZXMuaW5pdFJvb3REaXIucGlwZShcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNoZWNrQWxsV29ya3NwYWNlcygpO1xuICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpKSB7XG4gICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcGxpbmtFbnYud29ya0RpcixcbiAgICAgICAgICAgIC4uLnBheWxvYWR9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjdXJyID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgIGlmIChjdXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKGN1cnIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBQYXRoLnJlc29sdmUocm9vdERpciwgY3Vycik7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBhdGgsIC4uLnBheWxvYWR9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG5cbiAgICBhY3Rpb25CeVR5cGVzLl9ob2lzdFdvcmtzcGFjZURlcHMucGlwZShcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgLy8gYWN0aW9uRGlzcGF0Y2hlci5vbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKHdzS2V5KTtcbiAgICAgICAgZGVsZXRlRHVwbGljYXRlZEluc3RhbGxlZFBrZyh3c0tleSk7XG4gICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSkpO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgYWN0aW9uQnlUeXBlcy51cGRhdGVEaXIucGlwZShcbiAgICAgIHRhcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQbGlua1BhY2thZ2VJbmZvKCkpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSksXG4gICAgICB0YXAoKCkgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZShrZXkpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICksXG4gICAgLy8gSGFuZGxlIG5ld2x5IGFkZGVkIHdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKHdzLmtleXMoKSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSksXG4gICAgICBzY2FuPHN0cmluZ1tdPigocHJldiwgY3VycikgPT4ge1xuICAgICAgICBpZiAocHJldi5sZW5ndGggPCBjdXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgbG9nLmluZm8oJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdzIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IHdzfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyO1xuICAgICAgfSlcbiAgICApLFxuICAgIC8vIG9ic2VydmUgYWxsIGV4aXN0aW5nIFdvcmtzcGFjZXMgZm9yIGRlcGVuZGVuY3kgaG9pc3RpbmcgcmVzdWx0IFxuICAgIC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAvLyBmaWx0ZXIocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICB0YWtlV2hpbGUocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuaW5zdGFsbEpzb24gPT09IHMyLmluc3RhbGxKc29uKSxcbiAgICAgICAgc2NhbjxXb3Jrc3BhY2VTdGF0ZT4oKG9sZCwgbmV3V3MpID0+IHtcbiAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBtYXgtbGVuICovXG4gICAgICAgICAgY29uc3QgbmV3RGVwcyA9IE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBmb3JjaW5nIGluc3RhbGwgd29ya3NwYWNlLCB0aGVyZWZvcmUgZGVwZW5kZW5jaWVzIGlzIGNsZWFyZWQgYXQgdGhpcyBtb21lbnRcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgb2xkRGVwcyA9IE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcblxuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCAhPT0gb2xkRGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGxvZy5pbmZvKCduZXdEZXBzLmxlbmd0aCcsIG5ld0RlcHMubGVuZ3RoLCAnICE9PSBvbGREZXBzLmxlbmd0aCcsIG9sZERlcHMubGVuZ3RoKTtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleToga2V5fSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0RlcHMuc29ydCgpO1xuICAgICAgICAgIG9sZERlcHMuc29ydCgpO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gbmV3RGVwcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChuZXdEZXBzW2ldICE9PSBvbGREZXBzW2ldKSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleToga2V5fSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pLFxuICAgIC8vIF93b3Jrc3BhY2VCYXRjaENoYW5nZWQgd2lsbCB0cmlnZ2VyIGNyZWF0aW5nIHN5bWxpbmtzLCBidXQgbWVhbndoaWxlIF9pbnN0YWxsV29ya3NwYWNlIHdpbGwgZGVsZXRlIHN5bWxpbmtzXG4gICAgLy8gSSBkb24ndCB3YW50IHRvIHNlZW0gdGhlbSBydW5uaW5nIHNpbXVsdGFuZW91c2x5LlxuICAgIG1lcmdlKGFjdGlvbkJ5VHlwZXMuX3dvcmtzcGFjZUJhdGNoQ2hhbmdlZCwgYWN0aW9uQnlUeXBlcy5faW5zdGFsbFdvcmtzcGFjZSkucGlwZShcbiAgICAgIGNvbmNhdE1hcChhY3Rpb24gPT4ge1xuICAgICAgICBpZiAoaXNBY3Rpb25PZkNyZWF0b3IoYWN0aW9uLCBzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSkge1xuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5O1xuICAgICAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSksXG4gICAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgICAgZmlsdGVyKHdzID0+IHdzICE9IG51bGwpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIGNvbmNhdE1hcCh3cyA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiBpbnN0YWxsV29ya3NwYWNlKHdzISwgZ2V0U3RhdGUoKS5ucG1JbnN0YWxsT3B0KTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleSk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQWN0aW9uT2ZDcmVhdG9yKGFjdGlvbiwgc2xpY2UuYWN0aW9ucy5fd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKSkge1xuICAgICAgICAgIGNvbnN0IHdzS2V5cyA9IGFjdGlvbi5wYXlsb2FkO1xuICAgICAgICAgIHJldHVybiBtZXJnZSguLi53c0tleXMubWFwKF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZSkpLnBpcGUoXG4gICAgICAgICAgICBmaW5hbGl6ZSgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZUNoYW5nZWQod3NLZXlzKSlcbiAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBFTVBUWTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLFxuXG4gICAgYWN0aW9uQnlUeXBlcy53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQucGlwZShcbiAgICAgIG1hcChhY3Rpb24gPT4gdXBkYXRlZFdvcmtzcGFjZVNldC5hZGQoYWN0aW9uLnBheWxvYWQpKSxcbiAgICAgIGRlYm91bmNlVGltZSg4MDApLFxuICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKEFycmF5LmZyb20odXBkYXRlZFdvcmtzcGFjZVNldC52YWx1ZXMoKSkpO1xuICAgICAgICB1cGRhdGVkV29ya3NwYWNlU2V0LmNsZWFyKCk7XG4gICAgICAgIC8vIHJldHVybiBmcm9tKHdyaXRlQ29uZmlnRmlsZXMoKSk7XG4gICAgICB9KSxcbiAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIucGFja2FnZXNVcGRhdGVkKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgYWN0aW9uQnlUeXBlcy51cGRhdGVHaXRJZ25vcmVzLnBpcGUoXG4gICAgICB0YXAoYWN0aW9uID0+IHtcbiAgICAgICAgbGV0IHJlbCA9IGFjdGlvbi5wYXlsb2FkLmZpbGU7XG4gICAgICAgIGlmIChQYXRoLmlzQWJzb2x1dGUocmVsKSkge1xuICAgICAgICAgIHJlbCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgcmVsKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgZ2l0SWdub3JlRmlsZXNXYWl0aW5nLmFkZChyZWwpO1xuICAgICAgfSksXG4gICAgICBkZWJvdW5jZVRpbWUoNTAwKSxcbiAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGNoYW5nZWRGaWxlcyA9IFsuLi5naXRJZ25vcmVGaWxlc1dhaXRpbmcudmFsdWVzKCldO1xuICAgICAgICBnaXRJZ25vcmVGaWxlc1dhaXRpbmcuY2xlYXIoKTtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWRGaWxlcztcbiAgICAgIH0pLFxuICAgICAgY29uY2F0TWFwKChjaGFuZ2VkRmlsZXMpID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLmNoYW5nZWRGaWxlcy5tYXAoYXN5bmMgcmVsID0+IHtcbiAgICAgICAgICBjb25zdCBmaWxlID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHJlbCk7XG4gICAgICAgICAgY29uc3QgbGluZXMgPSBnZXRTdGF0ZSgpLmdpdElnbm9yZXNbZmlsZV07XG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShmaWxlLCAndXRmOCcpO1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdMaW5lcyA9IGRhdGEuc3BsaXQoL1xcblxccj8vKS5tYXAobGluZSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICAgICAgICBjb25zdCBuZXdMaW5lcyA9IF8uZGlmZmVyZW5jZShsaW5lcywgZXhpc3RpbmdMaW5lcyk7XG4gICAgICAgICAgICBpZiAobmV3TGluZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICBmcy53cml0ZUZpbGUoZmlsZSwgZGF0YSArIEVPTCArIG5ld0xpbmVzLmpvaW4oRU9MKSwgKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgICBsb2cuaW5mbygnTW9kaWZ5JywgZmlsZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFkZFByb2plY3QsIHNsaWNlLmFjdGlvbnMuZGVsZXRlUHJvamVjdCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gc2NhbkFuZFN5bmNQYWNrYWdlcygpKVxuICAgIClcbiAgKS5waXBlKFxuICAgIGlnbm9yZUVsZW1lbnRzKCksXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgbG9nLmVycm9yKGVyci5zdGFjayA/IGVyci5zdGFjayA6IGVycik7XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihlcnIpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQYWNrYWdlc1N0YXRlPiB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBwYXRoKTtcbiAgcmV0dXJuIHJlbFBhdGguc3RhcnRzV2l0aCgnLi4nKSA/IFBhdGgucmVzb2x2ZShwYXRoKSA6IHJlbFBhdGg7XG59XG5leHBvcnQgZnVuY3Rpb24gcHJvaktleVRvUGF0aChrZXk6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5pc0Fic29sdXRlKGtleSkgPyBrZXkgOiBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZUtleShwYXRoOiBzdHJpbmcpIHtcbiAgbGV0IHJlbCA9IFBhdGgucmVsYXRpdmUocm9vdERpciwgUGF0aC5yZXNvbHZlKHBhdGgpKTtcbiAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpXG4gICAgcmVsID0gcmVsLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcmV0dXJuIHJlbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZURpcihrZXk6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGtleSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3RzOiBzdHJpbmdbXSkge1xuICBmb3IgKGNvbnN0IHByaiBvZiBwcm9qZWN0cykge1xuICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwYXRoVG9Qcm9qS2V5KHByaikpO1xuICAgIGlmIChwa2dOYW1lcykge1xuICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgIGNvbnN0IHBrID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgIGlmIChwaylcbiAgICAgICAgICB5aWVsZCBwaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocGogPT4gUGF0aC5yZXNvbHZlKHJvb3REaXIsIHBqKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0N3ZFdvcmtzcGFjZSgpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0Rpcik7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICh3cyA9PSBudWxsKVxuICAgIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbi8qKlxuICogVGhpcyBtZXRob2QgaXMgbWVhbnQgdG8gdHJpZ2dlciBlZGl0b3ItaGVscGVyIHRvIHVwZGF0ZSB0c2NvbmZpZyBmaWxlcywgc29cbiAqIGVkaXRvci1oZWxwZXIgbXVzdCBiZSBpbXBvcnQgYXQgZmlyc3RcbiAqIEBwYXJhbSBkaXIgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzd2l0Y2hDdXJyZW50V29ya3NwYWNlKGRpcjogc3RyaW5nKSB7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UoZGlyKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fd29ya3NwYWNlQmF0Y2hDaGFuZ2VkKFt3b3Jrc3BhY2VLZXkoZGlyKV0pO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKHdzS2V5OiBzdHJpbmcpIHtcbiAgY29uc3QgcGtnRW50cnkgPSBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2UoZ2V0U3RhdGUoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAoKGZ1bmN0aW9uKigpOiBHZW5lcmF0b3I8W3N0cmluZywgUGFja2FnZUluZm9dPiB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dFbnRyeSkge1xuICAgICAgeWllbGQgW3BrLm5hbWUsIHBrXTtcbiAgICB9XG4gIH0pKCkpO1xuICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyA9IGluc3RhbGxlZCk7XG4gIGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlU3RhdGVVcGRhdGVkKHdzS2V5KTtcbn1cblxuLyoqXG4gKiBEZWxldGUgd29ya3NwYWNlIHN0YXRlIGlmIGl0cyBkaXJlY3RvcnkgZG9lcyBub3QgZXhpc3RcbiAqL1xuZnVuY3Rpb24gY2hlY2tBbGxXb3Jrc3BhY2VzKCkge1xuICBmb3IgKGNvbnN0IGtleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHJvb3REaXIsIGtleSk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgV29ya3NwYWNlICR7a2V5fSBkb2VzIG5vdCBleGlzdCBhbnltb3JlLmApO1xuICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4gZC53b3Jrc3BhY2VzLmRlbGV0ZShrZXkpKTtcbiAgICB9XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5pdFJvb3REaXJlY3RvcnkoKSB7XG4gIGxvZy5kZWJ1ZygnaW5pdFJvb3REaXJlY3RvcnknKTtcbiAgY29uc3Qgcm9vdFBhdGggPSByb290RGlyO1xuICBmc2V4dC5ta2RpcnBTeW5jKGRpc3REaXIpO1xuICAvLyBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2NvbmZpZy5sb2NhbC10ZW1wbGF0ZS55YW1sJyksIFBhdGguam9pbihkaXN0RGlyLCAnY29uZmlnLmxvY2FsLnlhbWwnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbG9nNGpzLmpzJyksIHJvb3RQYXRoICsgJy9sb2c0anMuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcycsXG4gICAgICAnZ2l0aWdub3JlLnR4dCcpLCByb290RGlyICsgJy8uZ2l0aWdub3JlJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGF3YWl0IHNjYW5BbmRTeW5jUGFja2FnZXMoKTtcbiAgLy8gYXdhaXQgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKFBhdGgucmVzb2x2ZShyb290RGlyLCAnbm9kZV9tb2R1bGVzJyksIG5ldyBTZXQ8c3RyaW5nPigpKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFdvcmtzcGFjZSh3czogV29ya3NwYWNlU3RhdGUsIG5wbU9wdDogTnBtT3B0aW9ucykge1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3MuaWQpO1xuICB0cnkge1xuICAgIGF3YWl0IGluc3RhbGxJbkRpcihkaXIsIG5wbU9wdCwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsIHdzLmluc3RhbGxKc29uU3RyKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICBjb25zdCB3c2QgPSBkLndvcmtzcGFjZXMuZ2V0KHdzLmlkKSE7XG4gICAgICB3c2QuaW5zdGFsbEpzb25TdHIgPSAnJztcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UtbG9jay5qc29uJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpIHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oYFByb2JsZW1hdGljICR7bG9ja0ZpbGV9IGlzIGRlbGV0ZWQsIHBsZWFzZSB0cnkgYWdhaW5gKTtcbiAgICAgICAgZnMudW5saW5rU3luYyhsb2NrRmlsZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgdGhyb3cgZXg7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluc3RhbGxJbkRpcihkaXI6IHN0cmluZywgbnBtT3B0OiBOcG1PcHRpb25zLCBvcmlnaW5Qa2dKc29uU3RyOiBzdHJpbmcsIHRvSW5zdGFsbFBrZ0pzb25TdHI6IHN0cmluZykge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbygnSW5zdGFsbCBkZXBlbmRlbmNpZXMgaW4gJyArIGRpcik7XG4gIHRyeSB7XG4gICAgYXdhaXQgY29weU5wbXJjVG9Xb3Jrc3BhY2UoZGlyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmc7IGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnNleHQubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgLy8gTlBNIHY3LjIwLnggY2FuIG5vdCBpbnN0YWxsIGRlcGVuZGVuY2llcyBpZiB0aGVyZSBpcyBhbnkgZmlsZSB3aXRoIG5hbWUgcHJlZml4ICdfJyBleGlzdHMgaW4gZGlyZWN0b3J5IG5vZGVfbW9kdWxlc1xuICBjb25zdCBsZWdhY3lQa2dTZXR0aW5nRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnLCAnX3BhY2thZ2Utc2V0dGluZ3MuZC50cycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhsZWdhY3lQa2dTZXR0aW5nRmlsZSkpIHtcbiAgICBmcy51bmxpbmtTeW5jKGxlZ2FjeVBrZ1NldHRpbmdGaWxlKTtcbiAgfVxuXG4gIC8vIDEuIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgLy8gYmFja3VwIHRoZW0gZm9yIGxhdGUgcmVjb3ZlcnlcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKHRhcmdldCwgbGluayA9PiB7XG4gICAgbG9nLmRlYnVnKCdSZW1vdmUgc3ltbGluaycsIGxpbmspO1xuICAgIGNvbnN0IGxpbmtDb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIHN5bWxpbmtzSW5Nb2R1bGVEaXIucHVzaCh7Y29udGVudDogbGlua0NvbnRlbnQsIGxpbmt9KTtcbiAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gIH0pO1xuICAvLyAyLiBSdW4gYG5wbSBpbnN0YWxsYFxuICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKCd3cml0ZScsIGluc3RhbGxKc29uRmlsZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCB0b0luc3RhbGxQa2dKc29uU3RyLCAndXRmOCcpO1xuICAvLyBzYXZlIGEgbG9jayBmaWxlIHRvIGluZGljYXRlIGluLXByb2Nlc3Mgb2YgaW5zdGFsbGluZywgb25jZSBpbnN0YWxsYXRpb24gaXMgY29tcGxldGVkIHdpdGhvdXQgaW50ZXJydXB0aW9uLCBkZWxldGUgaXQuXG4gIC8vIGNoZWNrIGlmIHRoZXJlIGlzIGV4aXN0aW5nIGxvY2sgZmlsZSwgbWVhbmluZyBhIHByZXZpb3VzIGluc3RhbGxhdGlvbiBpcyBpbnRlcnJ1cHRlZC5cbiAgY29uc3QgbG9ja0ZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGxpbmsuaW5zdGFsbC5sb2NrJyk7XG4gIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGxvY2tGaWxlLCBvcmlnaW5Qa2dKc29uU3RyKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDAwKSk7XG4gIHRyeSB7XG4gICAgY29uc3QgZW52ID0ge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICBOT0RFX0VOVjogJ2RldmVsb3BtZW50J1xuICAgIH0gYXMgTm9kZUpTLlByb2Nlc3NFbnY7XG5cbiAgICBpZiAobnBtT3B0LmNhY2hlKVxuICAgICAgZW52Lm5wbV9jb25maWdfY2FjaGUgPSBucG1PcHQuY2FjaGU7XG4gICAgaWYgKG5wbU9wdC5vZmZsaW5lKVxuICAgICAgZW52Lm5wbV9jb25maWdfb2ZmbGluZSA9ICd0cnVlJztcblxuICAgIGNvbnN0IGNtZEFyZ3MgPSBbbnBtT3B0LnVzZU5wbUNpID8gJ2NpJyA6ICdpbnN0YWxsJ107XG5cbiAgICBhd2FpdCBleGUoJ25wbScsIC4uLmNtZEFyZ3MsIHtjd2Q6IGRpciwgZW52fSkuZG9uZTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYXdhaXQgZXhlKCducG0nLCAncHJ1bmUnLCB7Y3dkOiBkaXIsIGVudn0pLmRvbmU7XG4gICAgLy8gXCJucG0gZGRwXCIgcmlnaHQgYWZ0ZXIgXCJucG0gaW5zdGFsbFwiIHdpbGwgY2F1c2UgZGV2RGVwZW5kZW5jaWVzIGJlaW5nIHJlbW92ZWQgc29tZWhvdywgZG9uJ3Qga25vd25cbiAgICAvLyB3aHksIEkgaGF2ZSB0byBhZGQgYSBzZXRJbW1lZGlhdGUoKSBiZXR3ZWVuIHRoZW0gdG8gd29ya2Fyb3VuZFxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0SW1tZWRpYXRlKHJlc29sdmUpKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnZGRwJywge2N3ZDogZGlyLCBlbnZ9KS5wcm9taXNlO1xuICAgIH0gY2F0Y2ggKGRkcEVycikge1xuICAgICAgbG9nLndhcm4oJ0ZhaWxlZCB0byBkZWR1cGUgZGVwZW5kZW5jaWVzLCBidXQgaXQgaXMgT0snLCBkZHBFcnIpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCAoZSBhcyBFcnJvcikuc3RhY2spO1xuICAgIHRocm93IGU7XG4gIH0gZmluYWxseSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnUmVjb3ZlciAnICsgaW5zdGFsbEpzb25GaWxlKTtcbiAgICAvLyAzLiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIG9yaWdpblBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKVxuICAgICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGxvY2tGaWxlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlY292ZXJTeW1saW5rcygpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3ltbGlua3NJbk1vZHVsZURpci5tYXAoKHtjb250ZW50LCBsaW5rfSkgPT4ge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxpbmspKSB7XG4gICAgICAgIGZzZXh0Lm1rZGlycFN5bmMoUGF0aC5kaXJuYW1lKGxpbmspKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnN5bWxpbmsoY29udGVudCwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gICAgfSkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvcHlOcG1yY1RvV29ya3NwYWNlKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICcubnBtcmMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0KSlcbiAgICByZXR1cm47XG4gIGNvbnN0IGlzQ2hpbmEgPSBhd2FpdCBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5pc0luQ2hpbmEpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZmlsdGVyKGNuID0+IGNuICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgaWYgKGlzQ2hpbmEpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdjcmVhdGUgLm5wbXJjIHRvJywgdGFyZ2V0KTtcbiAgICBmcy5jb3B5RmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9ucG1yYy1mb3ItY24udHh0JyksIHRhcmdldCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc2NhbkFuZFN5bmNQYWNrYWdlcyhpbmNsdWRlUGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBjb25zdCBzcmNQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBsZXQgcGtnTGlzdDogUGFja2FnZUluZm9bXTtcblxuICBpZiAoaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMpIHtcbiAgICBjb25zdCBwcmpLZXlzID0gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKTtcbiAgICBjb25zdCBwcmpEaXJzID0gcHJqS2V5cy5tYXAocHJqS2V5ID0+IHByb2pLZXlUb1BhdGgocHJqS2V5KSk7XG4gICAgcGtnTGlzdCA9IGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzLm1hcChqc29uRmlsZSA9PiB7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8oanNvbkZpbGUsIGZhbHNlKTtcbiAgICAgIGNvbnN0IHByaklkeCA9IHByakRpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgIGlmIChwcmpJZHggPj0gMCkge1xuICAgICAgICBjb25zdCBwcmpQYWNrYWdlTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByaktleXNbcHJqSWR4XSkhO1xuICAgICAgICBpZiAoIXByalBhY2thZ2VOYW1lcy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtcbiAgICAgICAgICAgIHByajogcHJqS2V5c1twcmpJZHhdLFxuICAgICAgICAgICAgcGtnczogWy4uLnByalBhY2thZ2VOYW1lcy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBbLi4uZ2V0U3RhdGUoKS5zcmNEaXIyUGFja2FnZXMua2V5cygpXTtcbiAgICAgICAgY29uc3QgbGlua2VkU3JjRGlycyA9IGtleXMubWFwKGtleSA9PiBwcm9qS2V5VG9QYXRoKGtleSkpO1xuICAgICAgICBjb25zdCBpZHggPSBsaW5rZWRTcmNEaXJzLmZpbmRJbmRleChkaXIgPT4gaW5mby5yZWFsUGF0aCA9PT0gZGlyIHx8ICBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgICAgY29uc3QgcGtncyA9IGdldFN0YXRlKCkuc3JjRGlyMlBhY2thZ2VzLmdldChrZXlzW2lkeF0pITtcbiAgICAgICAgICBpZiAoIXBrZ3MuaW5jbHVkZXMoaW5mby5uYW1lKSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtcbiAgICAgICAgICAgICAgcGF0dGVybjoga2V5c1tpZHhdLFxuICAgICAgICAgICAgICBwa2dzOiBbLi4ucGtncy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke2luZm8ucmVhbFBhdGh9IGlzIG5vdCB1bmRlciBhbnkga25vd24gUHJvamVjdCBkaXJlY3RvcnlzOiAke3ByakRpcnMuY29uY2F0KGxpbmtlZFNyY0RpcnMpLmpvaW4oJywgJyl9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBpbmZvO1xuICAgIH0pO1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNMaW5rZWRQYWNrYWdlcyhbcGtnTGlzdCwgJ3VwZGF0ZSddKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuICAgIHBrZ0xpc3QgPSBbXTtcbiAgICBhd2FpdCBybS5zY2FuUGFja2FnZXMoKS5waXBlKFxuICAgICAgdGFwKChbcHJvaiwganNvbkZpbGUsIHNyY0Rpcl0pID0+IHtcbiAgICAgICAgaWYgKHByb2ogJiYgIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAgICAgaWYgKHByb2ogPT0gbnVsbCAmJiBzcmNEaXIgJiYgIXNyY1BrZ01hcC5oYXMoc3JjRGlyKSlcbiAgICAgICAgICBzcmNQa2dNYXAuc2V0KHNyY0RpciwgW10pO1xuXG4gICAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgICBpZiAoaW5mby5qc29uLmRyIHx8IGluZm8uanNvbi5wbGluaykge1xuICAgICAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgICAgICBpZiAocHJvailcbiAgICAgICAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgICAgICAgIGVsc2UgaWYgKHNyY0RpcilcbiAgICAgICAgICAgIHNyY1BrZ01hcC5nZXQoc3JjRGlyKSEucHVzaChpbmZvKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBsb2cuZXJyb3IoYE9ycGhhbiAke2pzb25GaWxlfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgUGFja2FnZSBvZiAke2pzb25GaWxlfSBpcyBza2lwcGVkIChkdWUgdG8gbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSlgKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICAgIGZvciAoY29uc3QgW3ByaiwgcGtnc10gb2YgcHJvalBrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3NyY0RpciwgcGtnc10gb2Ygc3JjUGtnTWFwLmVudHJpZXMoKSkge1xuICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvU3JjRGlyKHtwYXR0ZXJuOiBzcmNEaXIsIHBrZ3N9KTtcbiAgICB9XG5cbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICdjbGVhbiddKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICcubGlua3MnICYmIGZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdzS2V5LCAnLmxpbmtzJykpKSB7XG4gICAgZnNleHQucmVtb3ZlKFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSwgJy5saW5rcycpKVxuICAgIC5jYXRjaChleCA9PiBsb2cuaW5mbyhleCkpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksIHN5bWxpbmtEaXJOYW1lIHx8ICdub2RlX21vZHVsZXMnKTtcbiAgZnNleHQubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcblxuICBpZiAoc3ltbGlua0Rpck5hbWUgIT09ICdub2RlX21vZHVsZXMnKSB7XG4gICAgaWYgKHdzLmluc3RhbGxlZENvbXBvbmVudHMpIHtcbiAgICAgIGZvciAoY29uc3QgcG5hbWUgb2Ygd3MuaW5zdGFsbGVkQ29tcG9uZW50cy5rZXlzKCkpXG4gICAgICAgIHBrZ05hbWVTZXQuYWRkKHBuYW1lKTtcbiAgICB9XG4gICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVHaXRJZ25vcmVzKHtcbiAgICAgIGZpbGU6IFBhdGgucmVzb2x2ZShyb290RGlyLCAnLmdpdGlnbm9yZScpLFxuICAgICAgbGluZXM6IFtQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHN5bWxpbmtEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV19KTtcbiAgfVxuXG4gIGxldCBzeW1saW5rc1RvQ3JlYXRlID0gZnJvbShwa2dOYW1lU2V0LnZhbHVlcygpKVxuICAucGlwZShcbiAgICBtYXAobmFtZSA9PiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSB8fCB3cy5pbnN0YWxsZWRDb21wb25lbnRzIS5nZXQobmFtZSkhKVxuICApO1xuICBjb25zdCB3b3JrRGlyID0gd29ya3NwYWNlRGlyKHdzS2V5KTtcbiAgaWYgKHdvcmtEaXIgIT09IHBsaW5rRW52LnJvb3REaXIpIHtcbiAgICBzeW1saW5rc1RvQ3JlYXRlID0gY29uY2F0KHN5bWxpbmtzVG9DcmVhdGUsIG9mKGdldFN0YXRlKCkubGlua2VkRHJjcCEgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwKSk7XG4gIH1cblxuICByZXR1cm4gbWVyZ2UoXG4gICAgc3ltbGlua3NUb0NyZWF0ZS5waXBlKFxuICAgICAgc3ltYm9saWNMaW5rUGFja2FnZXMoc3ltbGlua0RpcilcbiAgICApLFxuICAgIF9kZWxldGVVc2VsZXNzU3ltbGluayhzeW1saW5rRGlyLCBwa2dOYW1lU2V0KVxuICApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoY2hlY2tEaXI6IHN0cmluZywgZXhjbHVkZVNldDogU2V0PHN0cmluZz4pIHtcbiAgY29uc3QgZG9uZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICBjb25zdCBwbGlua1BrZyA9IGdldFN0YXRlKCkubGlua2VkRHJjcCB8fCBnZXRTdGF0ZSgpLmluc3RhbGxlZERyY3A7XG4gIGNvbnN0IGRyY3BOYW1lID0gcGxpbmtQa2c/Lm5hbWU7XG4gIGNvbnN0IGRvbmUxID0gbGlzdE1vZHVsZVN5bWxpbmtzKGNoZWNrRGlyLCBsaW5rID0+IHtcbiAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShjaGVja0RpciwgbGluaykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICggKGRyY3BOYW1lID09IG51bGwgfHwgZHJjcE5hbWUgIT09IHBrZ05hbWUpICYmICFleGNsdWRlU2V0Lmhhcyhwa2dOYW1lKSkge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBEZWxldGUgZXh0cmFuZW91cyBzeW1saW5rOiAke2xpbmt9YCk7XG4gICAgICBkb25lcy5wdXNoKGZzLnByb21pc2VzLnVubGluayhsaW5rKSk7XG4gICAgfVxuICB9KTtcbiAgYXdhaXQgZG9uZTE7XG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvKHBrSnNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQgPSBmYWxzZSk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICByZXR1cm4gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlLCBqc29uLCBpc0luc3RhbGxlZCk7XG59XG4vKipcbiAqIExpc3QgdGhvc2UgaW5zdGFsbGVkIHBhY2thZ2VzIHdoaWNoIGFyZSByZWZlcmVuY2VkIGJ5IHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZSxcbiAqIHRob3NlIHBhY2thZ2VzIG11c3QgaGF2ZSBcImRyXCIgcHJvcGVydHkgaW4gcGFja2FnZS5qc29uIFxuICogQHBhcmFtIHdvcmtzcGFjZUtleSBcbiAqL1xuZnVuY3Rpb24qIHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgd29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgb3JpZ2luSW5zdGFsbEpzb24gPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgLy8gY29uc3QgZGVwSnNvbiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgPyBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzXSA6XG4gIC8vICAgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXTtcbiAgZm9yIChjb25zdCBkZXBzIG9mIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc10pIHtcbiAgICBpZiAoZGVwcyA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgIGlmICghc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcCkgJiYgZGVwICE9PSAnQHdmaC9wbGluaycpIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uRmlsZSkpIHtcbiAgICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2VJbmZvKFxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpLCB0cnVlXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSB7XG4gICAgICAgICAgICB5aWVsZCBwaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlOiBzdHJpbmcsIGpzb246IGFueSwgaXNJbnN0YWxsZWQgPSBmYWxzZSk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBQYXRoLmpvaW4oc3ltbGlua0Rpck5hbWUsIGpzb24ubmFtZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSksXG4gICAgaXNJbnN0YWxsZWRcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChfLnN0YXJ0c1dpdGgoZnJvbSwgJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnNleHQuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocGxpbmtFbnYud29ya0RpciwgdG8pO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbygnQ29weSB0byAlcycsIGNoYWxrLmN5YW4odG8pKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBmcm9tIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0byByZWxhdGl2ZSB0byByb290UGF0aCBcbiAqL1xuZnVuY3Rpb24gbWF5YmVDb3B5VGVtcGxhdGUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUocm9vdERpciwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBkZWxldGVEdXBsaWNhdGVkSW5zdGFsbGVkUGtnKHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhO1xuICBjb25zdCBkb05vdGhpbmcgPSAoKSA9PiB7fTtcbiAgd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKS5tYXAoKFtwa2dOYW1lXSkgPT4ge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBwa2dOYW1lKTtcbiAgICByZXR1cm4gZnMucHJvbWlzZXMubHN0YXQoZGlyKVxuICAgIC50aGVuKChzdGF0KSA9PiB7XG4gICAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJldmlvdXMgaW5zdGFsbGVkICR7UGF0aC5yZWxhdGl2ZShyb290RGlyLCBkaXIpfSBpcyBkZWxldGVkLCBkdWUgdG8gbGlua2VkIHBhY2thZ2UgJHtwa2dOYW1lfWApO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMudW5saW5rKGRpcik7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goZG9Ob3RoaW5nKTtcbiAgfSk7XG59XG5cbiJdfQ==