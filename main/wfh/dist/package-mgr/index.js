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
const log = log4js_1.getLogger('plink.package-mgr');
const { distDir, rootDir, plinkDir, isDrcpSymlink } = JSON.parse(process.env.__plink);
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    inited: false,
    workspaces: new Map(),
    project2Packages: new Map(),
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
        /** payload: workspace keys, happens as debounced workspace change event */
        workspaceBatchChanged(d, action) { },
        updateGitIgnores(d, { payload }) {
            d.gitIgnores[payload.file] = payload.lines.map(line => line.startsWith('/') ? line : '/' + line);
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
            if (fs_extra_1.default.existsSync(lockFile)) {
                log.warn('Plink init/sync process was interrupted last time, recover content of ' + pkgjsonFile);
                pkjsonStr = fs_extra_1.default.readFileSync(lockFile, 'utf8');
                fs_extra_1.default.unlinkSync(lockFile);
            }
            pkjsonStr = fs_extra_1.default.readFileSync(pkgjsonFile, 'utf8');
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
            if (isDrcpSymlink) {
                // tslint:disable-next-line: no-console
                log.debug('[_hoistWorkspaceDeps] @wfh/plink is symlink');
                delete updatingDeps['@wfh/plink'];
                delete updatingDevDeps['@wfh/plink'];
            }
            const wsKey = workspaceKey(dir);
            const { hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo } = transitive_dep_hoister_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages.get(entry[0]).json), 
            // .concat(plinkApiRequiredDeps()),
            wsKey, updatingDeps, state.srcPackages);
            const { hoisted: hoistedDevDeps, hoistedPeers: devHoistPeerDepInfo } = transitive_dep_hoister_1.listCompDependency(linkedDevDependencies.map(entry => state.srcPackages.get(entry[0]).json), wsKey, updatingDevDeps, state.srcPackages);
            const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: Array.from(hoistedDeps.entries())
                    .concat(Array.from(hoistPeerDepInfo.entries()).filter(item => !item[1].missing))
                    .reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}), devDependencies: Array.from(hoistedDevDeps.entries())
                    .concat(Array.from(devHoistPeerDepInfo.entries()).filter(item => !item[1].missing))
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
        _associatePackageToPrj(d, { payload: { prj, pkgs } }) {
            d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
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
    return rxjs_1.merge(
    // To override stored state. 
    // Do not put following logic in initialState! It will be overridden by previously saved state
    rxjs_1.of(1).pipe(operators_1.tap(() => process.nextTick(() => exports.actionDispatcher._updatePlinkPackageInfo())), operators_1.ignoreElements()), getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
        return pks;
    }), operators_1.ignoreElements()), getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.scan((prevMap, currMap) => {
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
        if (getState().workspaces.has(workspaceKey(process.cwd()))) {
            exports.actionDispatcher.updateWorkspace({ dir: process.cwd(),
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
    }), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_1.concatMap(action => {
        const wsKey = action.payload.workspaceKey;
        return getStore().pipe(operators_1.map(s => s.workspaces.get(wsKey)), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null), operators_1.take(1), operators_1.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_1.map(() => {
            updateInstalledPackageForWorkspace(wsKey);
        }));
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.workspaceStateUpdated), operators_1.map(action => updatedWorkspaceSet.add(action.payload)), operators_1.debounceTime(800), operators_1.tap(() => {
        exports.actionDispatcher.workspaceBatchChanged(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
        // return from(writeConfigFiles());
    }), operators_1.map(() => __awaiter(void 0, void 0, void 0, function* () {
        exports.actionDispatcher.packagesUpdated();
    }))), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.workspaceBatchChanged), operators_1.concatMap(({ payload: wsKeys }) => {
        return rxjs_1.merge(...wsKeys.map(_createSymlinksForWorkspace));
    })), getStore().pipe(operators_1.map(s => s.gitIgnores), operators_1.distinctUntilChanged(), operators_1.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_1.distinctUntilChanged(), operators_1.debounceTime(500), operators_1.switchMap(() => {
        return rxjs_1.merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(operators_1.map(s => s.gitIgnores[file]), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.map(lines => {
            fs_extra_1.default.readFile(file, 'utf8', (err, data) => {
                if (err) {
                    console.error('Failed to read gitignore file', file);
                    throw err;
                }
                const existingLines = data.split(/\n\r?/).map(line => line.trim());
                const newLines = lodash_1.default.difference(lines, existingLines);
                if (newLines.length === 0)
                    return;
                fs_extra_1.default.writeFile(file, data + os_1.EOL + newLines.join(os_1.EOL), () => {
                    // tslint:disable-next-line: no-console
                    log.info('Modify', file);
                });
            });
        }))));
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
    const wsKey = workspaceKey(process.cwd());
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
        if (!fs_extra_1.default.existsSync(dir)) {
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
        yield _deleteUselessSymlink(path_1.default.resolve(rootDir, 'node_modules'), new Set());
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
                if (fs_extra_1.default.existsSync(lockFile)) {
                    // tslint:disable-next-line: no-console
                    log.info(`Problematic ${lockFile} is deleted, please try again`);
                    fs_extra_1.default.unlinkSync(lockFile);
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
        // 2. Run `npm install`
        const installJsonFile = path_1.default.resolve(dir, 'package.json');
        // tslint:disable-next-line: no-console
        log.info('write', installJsonFile);
        fs_extra_1.default.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
        // save a lock file to indicate in-process of installing, once installation is completed without interruption, delete it.
        // check if there is existing lock file, meaning a previous installation is interrupted.
        const lockFile = path_1.default.resolve(dir, 'plink.install.lock');
        fs_extra_1.default.promises.writeFile(lockFile, originPkgJsonStr);
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
            fs_extra_1.default.writeFileSync(installJsonFile, originPkgJsonStr, 'utf8');
            fs_extra_1.default.promises.unlink(lockFile);
            yield recoverSymlinks();
        }
        function recoverSymlinks() {
            return Promise.all(symlinksInModuleDir.map(({ content, link }) => {
                return symlinks_1._symlinkAsync(content, link, symlinks_1.isWin32 ? 'junction' : 'dir');
            }));
        }
    });
}
exports.installInDir = installInDir;
function copyNpmrcToWorkspace(workspaceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const target = path_1.default.resolve(workspaceDir, '.npmrc');
        if (fs_extra_1.default.existsSync(target))
            return;
        const isChina = yield getStore().pipe(operators_1.map(s => s.isInChina), operators_1.distinctUntilChanged(), operators_1.filter(cn => cn != null), operators_1.take(1)).toPromise();
        if (isChina) {
            // tslint:disable-next-line: no-console
            log.info('create .npmrc to', target);
            fs_extra_1.default.copyFileSync(path_1.default.resolve(__dirname, '../../templates/npmrc-for-cn.txt'), target);
        }
    });
}
function scanAndSyncPackages(includePackageJsonFiles) {
    return __awaiter(this, void 0, void 0, function* () {
        const projPkgMap = new Map();
        let pkgList;
        if (includePackageJsonFiles) {
            const prjKeys = Array.from(getState().project2Packages.keys());
            const prjDirs = Array.from(getState().project2Packages.keys()).map(prjKey => projKeyToPath(prjKey));
            pkgList = includePackageJsonFiles.map(jsonFile => {
                const info = createPackageInfo(jsonFile, false);
                const prjIdx = prjDirs.findIndex(dir => info.realPath.startsWith(dir + path_1.default.sep));
                if (prjIdx < 0) {
                    throw new Error(`${jsonFile} is not under any known Project directorys: ${prjDirs.join(', ')}`);
                }
                const prjPackageNames = getState().project2Packages.get(prjKeys[prjIdx]);
                if (!prjPackageNames.includes(info.name)) {
                    exports.actionDispatcher._associatePackageToPrj({
                        prj: prjKeys[prjIdx],
                        pkgs: [...prjPackageNames.map(name => ({ name })), info]
                    });
                }
                return info;
            });
            exports.actionDispatcher._syncLinkedPackages([pkgList, 'update']);
        }
        else {
            const rm = (yield Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
            pkgList = [];
            yield rm.scanPackages().pipe(operators_1.tap(([proj, jsonFile]) => {
                if (!projPkgMap.has(proj))
                    projPkgMap.set(proj, []);
                const info = createPackageInfo(jsonFile, false);
                if (info.json.dr || info.json.plink) {
                    pkgList.push(info);
                    projPkgMap.get(proj).push(info);
                }
                else {
                    log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`);
                }
            })).toPromise();
            for (const [prj, pkgs] of projPkgMap.entries()) {
                exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
            }
            exports.actionDispatcher._syncLinkedPackages([pkgList, 'clean']);
        }
    });
}
function _createSymlinksForWorkspace(wsKey) {
    const symlinkDir = path_1.default.resolve(rootDir, wsKey, '.links');
    fs_extra_1.default.mkdirpSync(symlinkDir);
    const ws = getState().workspaces.get(wsKey);
    const pkgNames = ws.linkedDependencies.map(item => item[0])
        .concat(ws.linkedDevDependencies.map(item => item[0]));
    const pkgNameSet = new Set(pkgNames);
    if (ws.installedComponents) {
        for (const pname of ws.installedComponents.keys())
            pkgNameSet.add(pname);
    }
    exports.actionDispatcher.updateGitIgnores({
        file: path_1.default.resolve(rootDir, '.gitignore'),
        lines: [path_1.default.relative(rootDir, symlinkDir).replace(/\\/g, '/')]
    });
    return rxjs_1.merge(rxjs_1.from(Array.from(pkgNameSet).map(name => getState().srcPackages.get(name) || ws.installedComponents.get(name))).pipe(rwPackageJson_1.symbolicLinkPackages(symlinkDir)), _deleteUselessSymlink(symlinkDir, pkgNameSet));
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
                const done = new Promise((res, rej) => {
                    fs_extra_1.default.unlink(link, (err) => { if (err)
                        return rej(err);
                    else
                        res(); });
                });
                dones.push(done);
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
    const json = JSON.parse(fs_extra_1.default.readFileSync(pkJsonFile, 'utf8'));
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
                if (fs_extra_1.default.existsSync(pkjsonFile)) {
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
    log.info('Copy to %s', chalk_1.default.cyan(to));
}
/**
 *
 * @param from absolute path
 * @param {string} to relative to rootPath
 */
function maybeCopyTemplate(from, to) {
    if (!fs_extra_1.default.existsSync(path_1.default.resolve(rootDir, to)))
        cp(path_1.default.resolve(__dirname, from), to);
}
function _writeGitHook(project) {
    // if (!isWin32) {
    const gitPath = path_1.default.resolve(project, '.git/hooks');
    if (fs_extra_1.default.existsSync(gitPath)) {
        const hookStr = '#!/bin/sh\n' +
            `cd "${rootDir}"\n` +
            // 'drcp init\n' +
            // 'npx pretty-quick --staged\n' + // Use `tslint --fix` instead.
            `plink lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
        if (fs_extra_1.default.existsSync(gitPath + '/pre-commit'))
            fs_extra_1.default.unlink(gitPath + '/pre-commit');
        fs_extra_1.default.writeFileSync(gitPath + '/pre-push', hookStr);
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
        return fs_extra_1.default.promises.lstat(dir)
            .then((stat) => {
            if (!stat.isSymbolicLink()) {
                // tslint:disable-next-line: no-console
                log.info(`Previous installed ${path_1.default.relative(rootDir, dir)} is deleted, due to linked package ${pkgName}`);
                return fs_extra_1.default.promises.unlink(dir);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCxrREFBMEI7QUFDMUIsd0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2QixnREFBd0I7QUFDeEIsK0JBQXFFO0FBQ3JFLDhDQUN1RjtBQUN2RixzRUFBaUc7QUFDakcsb0RBQXlDO0FBQ3pDLG9EQUF1QztBQUN2QyxzREFBa0Q7QUFDbEQsb0NBQXlEO0FBQ3pELDhDQUE4QztBQUM5Qyw4REFBa0g7QUFDbEgsb0RBQXNEO0FBRXRELDJCQUF5QjtBQUN6QixtQ0FBaUM7QUFDakMsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBaUMzQyxNQUFNLEVBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRWpHLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsTUFBTSxFQUFFLEtBQUs7SUFDYixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDckIsZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLEVBQUU7SUFDM0IsV0FBVyxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3RCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsdUJBQXVCLEVBQUUsQ0FBQztJQUMxQixzQkFBc0IsRUFBRSxDQUFDO0NBQzFCLENBQUM7QUFnQ1csUUFBQSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDekMsSUFBSSxFQUFFLEVBQUU7SUFDUixZQUFZLEVBQUUsS0FBSztJQUNuQixR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LENBQUMsQ0FBQztRQUN6RSxPQUFPLGtCQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUM7YUFDNUIsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFO2dCQUMxQix1Q0FBdUM7Z0JBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsT0FBTyxFQUFFLENBQUMsQ0FBQztnQkFDMUcsT0FBTyxrQkFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDcEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsTUFBTTtBQUNOLDRHQUE0RztBQUM1Ryw0R0FBNEc7QUFDNUcsOEdBQThHO0FBQzlHLDBCQUEwQjtBQUMxQixRQUFRO0FBQ1IsaUZBQWlGO0FBQ2pGLFFBQVE7QUFFUix1REFBdUQ7QUFDdkQsNkVBQTZFO0FBQzdFLDBDQUEwQztBQUMxQyxrQ0FBa0M7QUFDbEMsNEJBQTRCO0FBQzVCLHVCQUF1QjtBQUN2QixPQUFPO0FBQ1AsaURBQWlEO0FBQ2pELG9EQUFvRDtBQUNwRCw2Q0FBNkM7QUFDN0MsTUFBTTtBQUNOLHFCQUFxQjtBQUNyQixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVbmZvcnR1bmF0ZWx5LCB0aGlzIGZpbGUgaXMgdmVyeSBsb25nLCB5b3UgbmVlZCB0byBmb2xkIGJ5IGluZGVudGlvbiBmb3IgYmV0dGVyIHZpZXcgb2Ygc291cmNlIGNvZGUgaW4gRWRpdG9yXG4gKi9cblxuaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgT2JzZXJ2YWJsZSwgb2YsIGRlZmVyLCB0aHJvd0Vycm9yfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBkZWJvdW5jZVRpbWUsXG4gIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGxpc3RDb21wRGVwZW5kZW5jeSwgUGFja2FnZUpzb25JbnRlcmYsIERlcGVuZGVudEluZm8gfSBmcm9tICcuLi90cmFuc2l0aXZlLWRlcC1ob2lzdGVyJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IHNldFByb2plY3RMaXN0fSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbi8vIGltcG9ydCB7IGdldFJvb3REaXIgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IHsgRU9MIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyJyk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICAvKiogSWYgdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc2FtZSBhcyBcInJlYWxQYXRoXCIsIHRoZW4gaXQgaXMgYSBzeW1saW5rICovXG4gIHBhdGg6IHN0cmluZztcbiAgcmVhbFBhdGg6IHN0cmluZztcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIGluaXRlZDogYm9vbGVhbjtcbiAgc3JjUGFja2FnZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLyoqIEtleSBpcyByZWxhdGl2ZSBwYXRoIHRvIHJvb3Qgd29ya3NwYWNlICovXG4gIHdvcmtzcGFjZXM6IE1hcDxzdHJpbmcsIFdvcmtzcGFjZVN0YXRlPjtcbiAgLyoqIGtleSBvZiBjdXJyZW50IFwid29ya3NwYWNlc1wiICovXG4gIGN1cnJXb3Jrc3BhY2U/OiBzdHJpbmcgfCBudWxsO1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIC8qKiBEcmNwIGlzIHRoZSBvcmlnaW5hbCBuYW1lIG9mIFBsaW5rIHByb2plY3QgKi9cbiAgbGlua2VkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbGlua2VkRHJjcFByb2plY3Q/OiBzdHJpbmcgfCBudWxsO1xuICBpbnN0YWxsZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgaXNJbkNoaW5hPzogYm9vbGVhbjtcbiAgLyoqIEV2ZXJ5dGltZSBhIGhvaXN0IHdvcmtzcGFjZSBzdGF0ZSBjYWxjdWxhdGlvbiBpcyBiYXNpY2FsbHkgZG9uZSwgaXQgaXMgaW5jcmVhc2VkIGJ5IDEgKi9cbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICAvKiogd29ya3NwYWNlIGtleSAqL1xuICBsYXN0Q3JlYXRlZFdvcmtzcGFjZT86IHN0cmluZztcbn1cblxuY29uc3Qge2Rpc3REaXIsIHJvb3REaXIsIHBsaW5rRGlyLCBpc0RyY3BTeW1saW5rfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIGluaXRlZDogZmFsc2UsXG4gIHdvcmtzcGFjZXM6IG5ldyBNYXAoKSxcbiAgcHJvamVjdDJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNQYWNrYWdlczogbmV3IE1hcCgpLFxuICBnaXRJZ25vcmVzOiB7fSxcbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IDAsXG4gIHBhY2thZ2VzVXBkYXRlQ2hlY2tzdW06IDBcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBpZDogc3RyaW5nO1xuICBvcmlnaW5JbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIG9yaWdpbkluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgaW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgLyoqIG5hbWVzIG9mIHRob3NlIGxpbmtlZCBzb3VyY2UgcGFja2FnZXMgKi9cbiAgbGlua2VkRGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBsaW5rZWQgc291cmNlIHBhY2thZ2VzICovXG4gIGxpbmtlZERldkRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuXG4gIC8qKiBpbnN0YWxsZWQgRFIgY29tcG9uZW50IHBhY2thZ2VzIFtuYW1lLCB2ZXJzaW9uXSovXG4gIGluc3RhbGxlZENvbXBvbmVudHM/OiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG5cbiAgaG9pc3RJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3RQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3REZXZJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3REZXZQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3RJbmZvU3VtbWFyeToge1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiBVc2VyIHNob3VsZCBtYW51bGx5IGFkZCB0aGVtIGFzIGRldkRlcGVuZGVuY2llcyBvZiB3b3Jrc3BhY2UgKi9cbiAgICBtaXNzaW5nRGV2RGVwczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICAgIC8qKiB2ZXJzaW9ucyBhcmUgY29uZmxpY3QgKi9cbiAgICBjb25mbGljdERlcHM6IHN0cmluZ1tdO1xuICB9O1xufVxuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiBOUyxcbiAgaW5pdGlhbFN0YXRlOiBzdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogRG8gdGhpcyBhY3Rpb24gYWZ0ZXIgYW55IGxpbmtlZCBwYWNrYWdlIGlzIHJlbW92ZWQgb3IgYWRkZWQgICovXG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtpc0ZvcmNlOiBib29sZWFuLCBjcmVhdGVIb29rOiBib29sZWFufT4pIHt9LFxuXG4gICAgLyoqIFxuICAgICAqIC0gQ3JlYXRlIGluaXRpYWwgZmlsZXMgaW4gcm9vdCBkaXJlY3RvcnlcbiAgICAgKiAtIFNjYW4gbGlua2VkIHBhY2thZ2VzIGFuZCBpbnN0YWxsIHRyYW5zaXRpdmUgZGVwZW5kZW5jeVxuICAgICAqIC0gU3dpdGNoIHRvIGRpZmZlcmVudCB3b3Jrc3BhY2VcbiAgICAgKiAtIERlbGV0ZSBub25leGlzdGluZyB3b3Jrc3BhY2VcbiAgICAgKiAtIElmIFwicGFja2FnZUpzb25GaWxlc1wiIGlzIHByb3ZpZGVkLCBpdCBzaG91bGQgc2tpcCBzdGVwIG9mIHNjYW5uaW5nIGxpbmtlZCBwYWNrYWdlc1xuICAgICAqIC0gVE9ETzogaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgaG9pc3QgYW5kIGluc3RhbGwgZm9yIHRoZW0gYWxsP1xuICAgICAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nLFxuICAgICAgaXNGb3JjZTogYm9vbGVhbiwgY3JlYXRlSG9vazogYm9vbGVhbiwgcGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHtcbiAgICB9LFxuICAgIHNjYW5BbmRTeW5jUGFja2FnZXMoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtwYWNrYWdlSnNvbkZpbGVzPzogc3RyaW5nW119Pikge30sXG5cbiAgICB1cGRhdGVEaXIoKSB7fSxcbiAgICBfdXBkYXRlUGxpbmtQYWNrYWdlSW5mbyhkKSB7XG4gICAgICBjb25zdCBwbGlua1BrZyA9IGNyZWF0ZVBhY2thZ2VJbmZvKFBhdGgucmVzb2x2ZShwbGlua0RpciwgJ3BhY2thZ2UuanNvbicpLCBmYWxzZSk7XG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICBkLmxpbmtlZERyY3AgPSBwbGlua1BrZztcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5saW5rZWREcmNwUHJvamVjdCA9IHBhdGhUb1Byb2pLZXkoUGF0aC5kaXJuYW1lKGQubGlua2VkRHJjcCEucmVhbFBhdGgpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGQubGlua2VkRHJjcCA9IG51bGw7XG4gICAgICAgIGQuaW5zdGFsbGVkRHJjcCA9IHBsaW5rUGtnO1xuICAgICAgICBkLmxpbmtlZERyY3BQcm9qZWN0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFtwa2dzOiBQYWNrYWdlSW5mb1tdLCBvcGVyYXRvcjogJ3VwZGF0ZScgfCAnY2xlYW4nXT4pIHtcbiAgICAgIGQuaW5pdGVkID0gdHJ1ZTtcbiAgICAgIGxldCBtYXAgPSBkLnNyY1BhY2thZ2VzO1xuICAgICAgaWYgKHBheWxvYWRbMV0gPT09ICdjbGVhbicpIHtcbiAgICAgICAgbWFwID0gZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXAoKTtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWRbMF0pIHtcbiAgICAgICAgbWFwLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICAvKiogcGF5bG9hZDogd29ya3NwYWNlIGtleXMsIGhhcHBlbnMgYXMgZGVib3VuY2VkIHdvcmtzcGFjZSBjaGFuZ2UgZXZlbnQgKi9cbiAgICB3b3Jrc3BhY2VCYXRjaENoYW5nZWQoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgdXBkYXRlR2l0SWdub3JlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e2ZpbGU6IHN0cmluZywgbGluZXM6IHN0cmluZ1tdfT4pIHtcbiAgICAgIGQuZ2l0SWdub3Jlc1twYXlsb2FkLmZpbGVdID0gcGF5bG9hZC5saW5lcy5tYXAobGluZSA9PiBsaW5lLnN0YXJ0c1dpdGgoJy8nKSA/IGxpbmUgOiAnLycgKyBsaW5lKTtcbiAgICB9LFxuICAgIHBhY2thZ2VzVXBkYXRlZChkKSB7XG4gICAgICBkLnBhY2thZ2VzVXBkYXRlQ2hlY2tzdW0rKztcbiAgICB9LFxuICAgIHNldEluQ2hpbmEoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPGJvb2xlYW4+KSB7XG4gICAgICBkLmlzSW5DaGluYSA9IHBheWxvYWQ7XG4gICAgfSxcbiAgICBfc2V0Q3VycmVudFdvcmtzcGFjZShkLCB7cGF5bG9hZDogZGlyfTogUGF5bG9hZEFjdGlvbjxzdHJpbmcgfCBudWxsPikge1xuICAgICAgaWYgKGRpciAhPSBudWxsKVxuICAgICAgICBkLmN1cnJXb3Jrc3BhY2UgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gbnVsbDtcbiAgICB9LFxuICAgIC8qKiBwYXJhbXRlcjogd29ya3NwYWNlIGtleSAqL1xuICAgIHdvcmtzcGFjZVN0YXRlVXBkYXRlZChkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge1xuICAgICAgZC53b3Jrc3BhY2VVcGRhdGVDaGVja3N1bSArPSAxO1xuICAgIH0sXG4gICAgLy8gb25Xb3Jrc3BhY2VQYWNrYWdlVXBkYXRlZChkLCB7cGF5bG9hZDogd29ya3NwYWNlS2V5fTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7fSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuXG4gICAgICBsZXQgcGtqc29uU3RyOiBzdHJpbmc7XG4gICAgICBjb25zdCBwa2dqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BsaW5rLmluc3RhbGwubG9jaycpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKCdQbGluayBpbml0L3N5bmMgcHJvY2VzcyB3YXMgaW50ZXJydXB0ZWQgbGFzdCB0aW1lLCByZWNvdmVyIGNvbnRlbnQgb2YgJyArIHBrZ2pzb25GaWxlKTtcbiAgICAgICAgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKGxvY2tGaWxlLCAndXRmOCcpO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH1cblxuICAgICAgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKHBrZ2pzb25GaWxlLCAndXRmOCcpO1xuICAgICAgY29uc3QgcGtqc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IEpTT04ucGFyc2UocGtqc29uU3RyKTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwcyBvZiBbcGtqc29uLmRlcGVuZGVuY2llcywgcGtqc29uLmRldkRlcGVuZGVuY2llc10gYXMge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9W10gKSB7XG4gICAgICAvLyAgIE9iamVjdC5lbnRyaWVzKGRlcHMpO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9KTtcblxuICAgICAgY29uc3QgdXBkYXRpbmdEZXBzID0gey4uLnBranNvbi5kZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGVwZW5kZW5jaWVzOiB0eXBlb2YgZGVwcyA9IFtdO1xuICAgICAgZGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmRlYnVnKCdbX2hvaXN0V29ya3NwYWNlRGVwc10gQHdmaC9wbGluayBpcyBzeW1saW5rJyk7XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RlcHNbJ0B3ZmgvcGxpbmsnXTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1snQHdmaC9wbGluayddO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgY29uc3Qge2hvaXN0ZWQ6IGhvaXN0ZWREZXBzLCBob2lzdGVkUGVlcnM6IGhvaXN0UGVlckRlcEluZm99ID0gbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMubWFwKGVudHJ5ID0+IHN0YXRlLnNyY1BhY2thZ2VzLmdldChlbnRyeVswXSkhLmpzb24pLFxuICAgICAgICAgIC8vIC5jb25jYXQocGxpbmtBcGlSZXF1aXJlZERlcHMoKSksXG4gICAgICAgIHdzS2V5LCB1cGRhdGluZ0RlcHMsIHN0YXRlLnNyY1BhY2thZ2VzXG4gICAgICApO1xuXG4gICAgICBjb25zdCB7aG9pc3RlZDogaG9pc3RlZERldkRlcHMsIGhvaXN0ZWRQZWVyczogZGV2SG9pc3RQZWVyRGVwSW5mb30gPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIHdzS2V5LCB1cGRhdGluZ0RldkRlcHMsIHN0YXRlLnNyY1BhY2thZ2VzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSksXG5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXZEZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGRldkhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSlcbiAgICAgIH07XG5cbiAgICAgIC8vIGxvZy5pbmZvKGluc3RhbGxKc29uKVxuICAgICAgLy8gY29uc3QgaW5zdGFsbGVkQ29tcCA9IHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShzdGF0ZS53b3Jrc3BhY2VzLCBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXkpO1xuXG4gICAgICBjb25zdCBleGlzdGluZyA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcblxuICAgICAgY29uc3QgaG9pc3RJbmZvU3VtbWFyeTogV29ya3NwYWNlU3RhdGVbJ2hvaXN0SW5mb1N1bW1hcnknXSA9IHtcbiAgICAgICAgY29uZmxpY3REZXBzOiBbXSwgbWlzc2luZ0RlcHM6IHt9LCBtaXNzaW5nRGV2RGVwczoge31cbiAgICAgIH07XG5cbiAgICAgIGZvciAoY29uc3QgZGVwc0luZm8gb2YgW2hvaXN0ZWREZXBzLCBob2lzdFBlZXJEZXBJbmZvXSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtkZXAsIGluZm9dIG9mIGRlcHNJbmZvLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChpbmZvLm1pc3NpbmcpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkubWlzc2luZ0RlcHNbZGVwXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWluZm8uc2FtZVZlciAmJiAhaW5mby5kaXJlY3QpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkuY29uZmxpY3REZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgZGVwc0luZm8gb2YgW2hvaXN0ZWREZXZEZXBzLCBkZXZIb2lzdFBlZXJEZXBJbmZvXSkge1xuICAgICAgICBmb3IgKGNvbnN0IFtkZXAsIGluZm9dIG9mIGRlcHNJbmZvLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChpbmZvLm1pc3NpbmcpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkubWlzc2luZ0RldkRlcHNbZGVwXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoIWluZm8uc2FtZVZlciAmJiAhaW5mby5kaXJlY3QpIHtcbiAgICAgICAgICAgIGhvaXN0SW5mb1N1bW1hcnkuY29uZmxpY3REZXBzLnB1c2goZGVwKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBpZDogd3NLZXksXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcyxcbiAgICAgICAgaG9pc3RJbmZvOiBob2lzdGVkRGVwcyxcbiAgICAgICAgaG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3REZXZJbmZvOiBob2lzdGVkRGV2RGVwcyxcbiAgICAgICAgaG9pc3REZXZQZWVyRGVwSW5mbzogZGV2SG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3RJbmZvU3VtbWFyeVxuICAgICAgfTtcbiAgICAgIHN0YXRlLmxhc3RDcmVhdGVkV29ya3NwYWNlID0gd3NLZXk7XG4gICAgICBzdGF0ZS53b3Jrc3BhY2VzLnNldCh3c0tleSwgZXhpc3RpbmcgPyBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCB3cCkgOiB3cCk7XG4gICAgfSxcbiAgICBfaW5zdGFsbFdvcmtzcGFjZShkLCB7cGF5bG9hZDoge3dvcmtzcGFjZUtleX19OiBQYXlsb2FkQWN0aW9uPHt3b3Jrc3BhY2VLZXk6IHN0cmluZ30+KSB7fSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiB7bmFtZTogc3RyaW5nfVtdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5leHBvcnQgY29uc3Qge3VwZGF0ZUdpdElnbm9yZXMsIG9uTGlua2VkUGFja2FnZUFkZGVkfSA9IGFjdGlvbkRpc3BhdGNoZXI7XG5cbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIGNvbnN0IHVwZGF0ZWRXb3Jrc3BhY2VTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgcGFja2FnZUFkZGVkTGlzdCA9IG5ldyBBcnJheTxzdHJpbmc+KCk7XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIC8vIFRvIG92ZXJyaWRlIHN0b3JlZCBzdGF0ZS4gXG4gICAgLy8gRG8gbm90IHB1dCBmb2xsb3dpbmcgbG9naWMgaW4gaW5pdGlhbFN0YXRlISBJdCB3aWxsIGJlIG92ZXJyaWRkZW4gYnkgcHJldmlvdXNseSBzYXZlZCBzdGF0ZVxuXG4gICAgb2YoMSkucGlwZSh0YXAoKCkgPT4gcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQbGlua1BhY2thZ2VJbmZvKCkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChwa3MgPT4ge1xuICAgICAgICBzZXRQcm9qZWN0TGlzdChnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgICAgcmV0dXJuIHBrcztcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc2NhbigocHJldk1hcCwgY3Vyck1hcCkgPT4ge1xuICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnNwbGljZSgwKTtcbiAgICAgICAgZm9yIChjb25zdCBubSBvZiBjdXJyTWFwLmtleXMoKSkge1xuICAgICAgICAgIGlmICghcHJldk1hcC5oYXMobm0pKSB7XG4gICAgICAgICAgICBwYWNrYWdlQWRkZWRMaXN0LnB1c2gobm0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocGFja2FnZUFkZGVkTGlzdC5sZW5ndGggPiAwKVxuICAgICAgICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKHBhY2thZ2VBZGRlZExpc3QpO1xuICAgICAgICByZXR1cm4gY3Vyck1hcDtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSksXG4gICAgICBjb25jYXRNYXAoKHtwYXlsb2FkOiB7ZGlyLCBpc0ZvcmNlLCBjcmVhdGVIb29rLCBwYWNrYWdlSnNvbkZpbGVzfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3NldEN1cnJlbnRXb3Jrc3BhY2UoZGlyKTtcbiAgICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgUGF0aC5yZXNvbHZlKGRpciwgJ2FwcC5qcycpKTtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGlmIChpc0ZvcmNlKSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgY29uc3Qgd3MgPSBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZpbmcgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHBhY2thZ2VKc29uRmlsZXMgIT0gbnVsbCA/IHNjYW5BbmRTeW5jUGFja2FnZXMocGFja2FnZUpzb25GaWxlcyk6XG4gICAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnNjYW5BbmRTeW5jUGFja2FnZXMpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHNjYW5BbmRTeW5jUGFja2FnZXMocGF5bG9hZC5wYWNrYWdlSnNvbkZpbGVzKSxcbiAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY0xpbmtlZFBhY2thZ2VzKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICB0YXAoKCkgPT4ge1xuICAgICAgICAgICAgICBjb25zdCBjdXJyV3MgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gICAgICAgICAgICAgIGZvciAoY29uc3Qgd3NLZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGlmICh3c0tleSAhPT0gY3VycldzKVxuICAgICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXI6IFBhdGgucmVzb2x2ZShyb290RGlyLCB3c0tleSl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAoY3VycldzICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICAvLyBNYWtlIHN1cmUgXCJjdXJyZW50IHdvcmtzcGFjZVwiIGlzIHRoZSBsYXN0IG9uZSBiZWluZyB1cGRhdGVkLCBzbyB0aGF0IGl0IHJlbWFpbnMgXCJjdXJyZW50XCJcbiAgICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2RpcjogUGF0aC5yZXNvbHZlKHJvb3REaXIsIGN1cnJXcyl9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgICAgICBpc0ZvcmNlOiBwYXlsb2FkLmlzRm9yY2UsXG4gICAgICAgICAgICBjcmVhdGVIb29rOiBwYXlsb2FkLmNyZWF0ZUhvb2t9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjdXJyID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgIGlmIChjdXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKGN1cnIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBQYXRoLnJlc29sdmUocm9vdERpciwgY3Vycik7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBhdGgsIGlzRm9yY2U6IHBheWxvYWQuaXNGb3JjZSwgY3JlYXRlSG9vazogcGF5bG9hZC5jcmVhdGVIb29rfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9zZXRDdXJyZW50V29ya3NwYWNlKG51bGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faG9pc3RXb3Jrc3BhY2VEZXBzKSxcbiAgICAgIG1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgLy8gYWN0aW9uRGlzcGF0Y2hlci5vbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKHdzS2V5KTtcbiAgICAgICAgZGVsZXRlRHVwbGljYXRlZEluc3RhbGxlZFBrZyh3c0tleSk7XG4gICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVEaXIpLFxuICAgICAgdGFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gc2NhbkFuZFN5bmNQYWNrYWdlcygpKSxcbiAgICAgIHRhcCgoKSA9PiB7XG4gICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMud29ya3NwYWNlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHdzID0+IHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20od3Mua2V5cygpKTtcbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9KSxcbiAgICAgIHNjYW48c3RyaW5nW10+KChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgIGlmIChwcmV2Lmxlbmd0aCA8IGN1cnIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbmV3QWRkZWQgPSBfLmRpZmZlcmVuY2UoY3VyciwgcHJldik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgbG9nLmluZm8oJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdzIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IHdzfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICAvLyBvYnNlcnZlIGFsbCBleGlzdGluZyBXb3Jrc3BhY2VzIGZvciBkZXBlbmRlbmN5IGhvaXN0aW5nIHJlc3VsdCBcbiAgICAuLi5BcnJheS5mcm9tKGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpLm1hcChrZXkgPT4ge1xuICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgZmlsdGVyKHMgPT4gcy53b3Jrc3BhY2VzLmhhcyhrZXkpKSxcbiAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldChrZXkpISksXG4gICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLmluc3RhbGxKc29uID09PSBzMi5pbnN0YWxsSnNvbiksXG4gICAgICAgIHNjYW48V29ya3NwYWNlU3RhdGU+KChvbGQsIG5ld1dzKSA9PiB7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGU6IG1heC1saW5lLWxlbmd0aFxuICAgICAgICAgIGNvbnN0IG5ld0RlcHMgPSBPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gZm9yY2luZyBpbnN0YWxsIHdvcmtzcGFjZSwgdGhlcmVmb3JlIGRlcGVuZGVuY2llcyBpcyBjbGVhcmVkIGF0IHRoaXMgbW9tZW50XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IG9sZERlcHMgPSBPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhvbGQuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG5cbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggIT09IG9sZERlcHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IGtleX0pO1xuICAgICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBuZXdEZXBzLnNvcnQoKTtcbiAgICAgICAgICBvbGREZXBzLnNvcnQoKTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMCwgbCA9IG5ld0RlcHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAobmV3RGVwc1tpXSAhPT0gb2xkRGVwc1tpXSkge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IGtleX0pO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICB9KSxcbiAgICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICAgKTtcbiAgICB9KSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5O1xuICAgICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3NLZXkpKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKSxcbiAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgIGNvbmNhdE1hcCh3cyA9PiBmcm9tKGluc3RhbGxXb3Jrc3BhY2Uod3MhKSkpLFxuICAgICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgICB1cGRhdGVJbnN0YWxsZWRQYWNrYWdlRm9yV29ya3NwYWNlKHdzS2V5KTtcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ya3NwYWNlU3RhdGVVcGRhdGVkKSxcbiAgICAgIG1hcChhY3Rpb24gPT4gdXBkYXRlZFdvcmtzcGFjZVNldC5hZGQoYWN0aW9uLnBheWxvYWQpKSxcbiAgICAgIGRlYm91bmNlVGltZSg4MDApLFxuICAgICAgdGFwKCgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VCYXRjaENoYW5nZWQoQXJyYXkuZnJvbSh1cGRhdGVkV29ya3NwYWNlU2V0LnZhbHVlcygpKSk7XG4gICAgICAgIHVwZGF0ZWRXb3Jrc3BhY2VTZXQuY2xlYXIoKTtcbiAgICAgICAgLy8gcmV0dXJuIGZyb20od3JpdGVDb25maWdGaWxlcygpKTtcbiAgICAgIH0pLFxuICAgICAgbWFwKGFzeW5jICgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5wYWNrYWdlc1VwZGF0ZWQoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMud29ya3NwYWNlQmF0Y2hDaGFuZ2VkKSxcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWQ6IHdzS2V5c30pID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLndzS2V5cy5tYXAoX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKSk7XG4gICAgICB9KVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuZ2l0SWdub3JlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKGdpdElnbm9yZXMgPT4gT2JqZWN0LmtleXMoZ2l0SWdub3Jlcykuam9pbignLCcpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBkZWJvdW5jZVRpbWUoNTAwKSxcbiAgICAgIHN3aXRjaE1hcCgoKSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZSguLi5PYmplY3Qua2V5cyhnZXRTdGF0ZSgpLmdpdElnbm9yZXMpLm1hcChmaWxlID0+IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLmdpdElnbm9yZXNbZmlsZV0pLFxuICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgICBtYXAobGluZXMgPT4ge1xuICAgICAgICAgICAgZnMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVhZCBnaXRpZ25vcmUgZmlsZScsIGZpbGUpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmVzID0gZGF0YS5zcGxpdCgvXFxuXFxyPy8pLm1hcChsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSBfLmRpZmZlcmVuY2UobGluZXMsIGV4aXN0aW5nTGluZXMpO1xuICAgICAgICAgICAgICBpZiAobmV3TGluZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGRhdGEgKyBFT0wgKyBuZXdMaW5lcy5qb2luKEVPTCksICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBsb2cuaW5mbygnTW9kaWZ5JywgZmlsZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBzY2FuQW5kU3luY1BhY2thZ2VzKCkpXG4gICAgKVxuICApLnBpcGUoXG4gICAgaWdub3JlRWxlbWVudHMoKSxcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBsb2cuZXJyb3IoZXJyLnN0YWNrID8gZXJyLnN0YWNrIDogZXJyKTtcbiAgICAgIHJldHVybiB0aHJvd0Vycm9yKGVycik7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFBhY2thZ2VzU3RhdGU+IHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1Byb2pLZXkocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKHJvb3REaXIsIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cbmV4cG9ydCBmdW5jdGlvbiBwcm9qS2V5VG9QYXRoKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLmlzQWJzb2x1dGUoa2V5KSA/IGtleSA6IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShyb290RGlyLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlRGlyKGtleTogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlc29sdmUocm9vdERpciwga2V5KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdExpc3QoKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUocm9vdERpciwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLyoqXG4gKiBUaGlzIG1ldGhvZCBpcyBtZWFudCB0byB0cmlnZ2VyIGVkaXRvci1oZWxwZXIgdG8gdXBkYXRlIHRzY29uZmlnIGZpbGVzLCBzb1xuICogZWRpdG9yLWhlbHBlciBtdXN0IGJlIGltcG9ydCBhdCBmaXJzdFxuICogQHBhcmFtIGRpciBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaEN1cnJlbnRXb3Jrc3BhY2UoZGlyOiBzdHJpbmcpIHtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZUJhdGNoQ2hhbmdlZChbd29ya3NwYWNlS2V5KGRpcildKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKGdldFN0YXRlKCksIHdzS2V5KTtcblxuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtnRW50cnkpIHtcbiAgICAgIHlpZWxkIFtway5uYW1lLCBwa107XG4gICAgfVxuICB9KSgpKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxlZENvbXBvbmVudHMgPSBpbnN0YWxsZWQpO1xuICBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCh3c0tleSk7XG59XG5cbi8qKlxuICogRGVsZXRlIHdvcmtzcGFjZSBzdGF0ZSBpZiBpdHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0XG4gKi9cbmZ1bmN0aW9uIGNoZWNrQWxsV29ya3NwYWNlcygpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rID0gZmFsc2UpIHtcbiAgbG9nLmRlYnVnKCdpbml0Um9vdERpcmVjdG9yeScpO1xuICBjb25zdCByb290UGF0aCA9IHJvb3REaXI7XG4gIGZzLm1rZGlycFN5bmMoZGlzdERpcik7XG4gIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvY29uZmlnLmxvY2FsLXRlbXBsYXRlLnlhbWwnKSwgUGF0aC5qb2luKGRpc3REaXIsICdjb25maWcubG9jYWwueWFtbCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9sb2c0anMuanMnKSwgcm9vdFBhdGggKyAnL2xvZzRqcy5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJyxcbiAgICAgICdnaXRpZ25vcmUudHh0JyksIHJvb3REaXIgKyAnLy5naXRpZ25vcmUnKTtcbiAgYXdhaXQgY2xlYW5JbnZhbGlkU3ltbGlua3MoKTtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG5cbiAgaWYgKGNyZWF0ZUhvb2spIHtcbiAgICBwcm9qZWN0RGlycy5mb3JFYWNoKHByamRpciA9PiB7XG4gICAgICBfd3JpdGVHaXRIb29rKHByamRpcik7XG4gICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNsaW50Lmpzb24nKSwgcHJqZGlyICsgJy90c2xpbnQuanNvbicpO1xuICAgIH0pO1xuICB9XG5cbiAgYXdhaXQgc2NhbkFuZFN5bmNQYWNrYWdlcygpO1xuICBhd2FpdCBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoUGF0aC5yZXNvbHZlKHJvb3REaXIsICdub2RlX21vZHVsZXMnKSwgbmV3IFNldDxzdHJpbmc+KCkpO1xufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZUNvbmZpZ0ZpbGVzKCkge1xuLy8gICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbi8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgICBsb2cuaW5mbygnd3JpdGUgY29uZmlnIGZpbGU6JywgZmlsZSk7XG4vLyAgICAgd3JpdGVGaWxlKFBhdGguam9pbihkaXN0RGlyLCBmaWxlKSxcbi8vICAgICAgICdcXG4jIERPIE5PVCBNT0RJRklZIFRISVMgRklMRSFcXG4nICsgY29uZmlnQ29udGVudCk7XG4vLyAgIH0pO1xuLy8gfVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3MuaWQpO1xuICB0cnkge1xuICAgIGF3YWl0IGluc3RhbGxJbkRpcihkaXIsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCB3cy5pbnN0YWxsSnNvblN0cik7XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgY29uc3Qgd3NkID0gZC53b3Jrc3BhY2VzLmdldCh3cy5pZCkhO1xuICAgICAgd3NkLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICB3c2QuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgICB3c2QuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzID0ge307XG4gICAgICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLWxvY2suanNvbicpO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobG9ja0ZpbGUpKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJvYmxlbWF0aWMgJHtsb2NrRmlsZX0gaXMgZGVsZXRlZCwgcGxlYXNlIHRyeSBhZ2FpbmApO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEluRGlyKGRpcjogc3RyaW5nLCBvcmlnaW5Qa2dKc29uU3RyOiBzdHJpbmcsIHRvSW5zdGFsbFBrZ0pzb25TdHI6IHN0cmluZykge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyBkaXIpO1xuICB0cnkge1xuICAgIGF3YWl0IGNvcHlOcG1yY1RvV29ya3NwYWNlKGRpcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtzSW5Nb2R1bGVEaXIgPSBbXSBhcyB7Y29udGVudDogc3RyaW5nLCBsaW5rOiBzdHJpbmd9W107XG5cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgIGZzLm1rZGlycFN5bmModGFyZ2V0KTtcbiAgfVxuXG4gIC8vIDEuIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgLy8gYmFja3VwIHRoZW0gZm9yIGxhdGUgcmVjb3ZlcnlcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKHRhcmdldCwgbGluayA9PiB7XG4gICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgfSk7XG5cbiAgLy8gMi4gUnVuIGBucG0gaW5zdGFsbGBcbiAgY29uc3QgaW5zdGFsbEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ3dyaXRlJywgaW5zdGFsbEpzb25GaWxlKTtcbiAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIHRvSW5zdGFsbFBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gIC8vIHNhdmUgYSBsb2NrIGZpbGUgdG8gaW5kaWNhdGUgaW4tcHJvY2VzcyBvZiBpbnN0YWxsaW5nLCBvbmNlIGluc3RhbGxhdGlvbiBpcyBjb21wbGV0ZWQgd2l0aG91dCBpbnRlcnJ1cHRpb24sIGRlbGV0ZSBpdC5cbiAgLy8gY2hlY2sgaWYgdGhlcmUgaXMgZXhpc3RpbmcgbG9jayBmaWxlLCBtZWFuaW5nIGEgcHJldmlvdXMgaW5zdGFsbGF0aW9uIGlzIGludGVycnVwdGVkLlxuICBjb25zdCBsb2NrRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwbGluay5pbnN0YWxsLmxvY2snKTtcbiAgZnMucHJvbWlzZXMud3JpdGVGaWxlKGxvY2tGaWxlLCBvcmlnaW5Qa2dKc29uU3RyKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDAwKSk7XG4gIHRyeSB7XG4gICAgY29uc3QgZW52ID0gey4uLnByb2Nlc3MuZW52LCBOT0RFX0VOVjogJ2RldmVsb3BtZW50J30gYXMgTm9kZUpTLlByb2Nlc3NFbnY7XG4gICAgYXdhaXQgZXhlKCducG0nLCAnaW5zdGFsbCcsIHtcbiAgICAgIGN3ZDogZGlyLFxuICAgICAgZW52IC8vIEZvcmNlIGRldmVsb3BtZW50IG1vZGUsIG90aGVyd2lzZSBcImRldkRlcGVuZGVuY2llc1wiIHdpbGwgbm90IGJlIGluc3RhbGxlZFxuICAgIH0pLnByb21pc2U7XG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ3BydW5lJywge2N3ZDogZGlyLCBlbnZ9KS5wcm9taXNlO1xuICAgIC8vIFwibnBtIGRkcFwiIHJpZ2h0IGFmdGVyIFwibnBtIGluc3RhbGxcIiB3aWxsIGNhdXNlIGRldkRlcGVuZGVuY2llcyBiZWluZyByZW1vdmVkIHNvbWVob3csIGRvbid0IGtub3duXG4gICAgLy8gd2h5LCBJIGhhdmUgdG8gYWRkIGEgc2V0SW1tZWRpYXRlKCkgYmV0d2VlbiB0aGVtIHRvIHdvcmthcm91bmRcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYXdhaXQgZXhlKCducG0nLCAnZGRwJywge2N3ZDogZGlyLCBlbnZ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBlLnN0YWNrKTtcbiAgICB0aHJvdyBlO1xuICB9IGZpbmFsbHkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdSZWNvdmVyICcgKyBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIC8vIDMuIFJlY292ZXIgcGFja2FnZS5qc29uIGFuZCBzeW1saW5rcyBkZWxldGVkIGluIFN0ZXAuMS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgb3JpZ2luUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBmcy5wcm9taXNlcy51bmxpbmsobG9ja0ZpbGUpO1xuICAgIGF3YWl0IHJlY292ZXJTeW1saW5rcygpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICByZXR1cm4gX3N5bWxpbmtBc3luYyhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY29weU5wbXJjVG9Xb3Jrc3BhY2Uod29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKHdvcmtzcGFjZURpciwgJy5ucG1yYycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXQpKVxuICAgIHJldHVybjtcbiAgY29uc3QgaXNDaGluYSA9IGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLmlzSW5DaGluYSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIoY24gPT4gY24gIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKTtcblxuICBpZiAoaXNDaGluYSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdjcmVhdGUgLm5wbXJjIHRvJywgdGFyZ2V0KTtcbiAgICBmcy5jb3B5RmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9ucG1yYy1mb3ItY24udHh0JyksIHRhcmdldCk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gc2NhbkFuZFN5bmNQYWNrYWdlcyhpbmNsdWRlUGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdKSB7XG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBsZXQgcGtnTGlzdDogUGFja2FnZUluZm9bXTtcblxuICBpZiAoaW5jbHVkZVBhY2thZ2VKc29uRmlsZXMpIHtcbiAgICBjb25zdCBwcmpLZXlzID0gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKTtcbiAgICBjb25zdCBwcmpEaXJzID0gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocHJqS2V5ID0+IHByb2pLZXlUb1BhdGgocHJqS2V5KSk7XG4gICAgcGtnTGlzdCA9IGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzLm1hcChqc29uRmlsZSA9PiB7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8oanNvbkZpbGUsIGZhbHNlKTtcbiAgICAgIGNvbnN0IHByaklkeCA9IHByakRpcnMuZmluZEluZGV4KGRpciA9PiBpbmZvLnJlYWxQYXRoLnN0YXJ0c1dpdGgoZGlyICsgUGF0aC5zZXApKTtcbiAgICAgIGlmIChwcmpJZHggPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgJHtqc29uRmlsZX0gaXMgbm90IHVuZGVyIGFueSBrbm93biBQcm9qZWN0IGRpcmVjdG9yeXM6ICR7cHJqRGlycy5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgcHJqUGFja2FnZU5hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcmpLZXlzW3ByaklkeF0pITtcbiAgICAgIGlmICghcHJqUGFja2FnZU5hbWVzLmluY2x1ZGVzKGluZm8ubmFtZSkpIHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtcbiAgICAgICAgICBwcmo6IHByaktleXNbcHJqSWR4XSxcbiAgICAgICAgICBwa2dzOiBbLi4ucHJqUGFja2FnZU5hbWVzLm1hcChuYW1lID0+ICh7bmFtZX0pKSwgaW5mb11cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaW5mbztcbiAgICB9KTtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICd1cGRhdGUnXSk7XG4gIH0gZWxzZSB7XG4gICAgY29uc3Qgcm0gPSAoYXdhaXQgaW1wb3J0KCcuLi9yZWNpcGUtbWFuYWdlcicpKTtcbiAgICBwa2dMaXN0ID0gW107XG4gICAgYXdhaXQgcm0uc2NhblBhY2thZ2VzKCkucGlwZShcbiAgICAgIHRhcCgoW3Byb2osIGpzb25GaWxlXSkgPT4ge1xuICAgICAgICBpZiAoIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvKGpzb25GaWxlLCBmYWxzZSk7XG4gICAgICAgIGlmIChpbmZvLmpzb24uZHIgfHwgaW5mby5qc29uLnBsaW5rKSB7XG4gICAgICAgICAgcGtnTGlzdC5wdXNoKGluZm8pO1xuICAgICAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZy5kZWJ1ZyhgUGFja2FnZSBvZiAke2pzb25GaWxlfSBpcyBza2lwcGVkIChkdWUgdG8gbm8gXCJkclwiIG9yIFwicGxpbmtcIiBwcm9wZXJ0eSlgKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApLnRvUHJvbWlzZSgpO1xuICAgIGZvciAoY29uc3QgW3ByaiwgcGtnc10gb2YgcHJvalBrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgfVxuICAgIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNMaW5rZWRQYWNrYWdlcyhbcGtnTGlzdCwgJ2NsZWFuJ10pO1xuICB9XG59XG5cbmZ1bmN0aW9uIF9jcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBQYXRoLnJlc29sdmUocm9vdERpciwgd3NLZXksICcubGlua3MnKTtcbiAgZnMubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcbiAgaWYgKHdzLmluc3RhbGxlZENvbXBvbmVudHMpIHtcbiAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgcGtnTmFtZVNldC5hZGQocG5hbWUpO1xuICB9XG5cbiAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVHaXRJZ25vcmVzKHtcbiAgICBmaWxlOiBQYXRoLnJlc29sdmUocm9vdERpciwgJy5naXRpZ25vcmUnKSxcbiAgICBsaW5lczogW1BhdGgucmVsYXRpdmUocm9vdERpciwgc3ltbGlua0RpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpXX0pO1xuICByZXR1cm4gbWVyZ2UoXG4gICAgZnJvbShBcnJheS5mcm9tKHBrZ05hbWVTZXQpLm1hcChcbiAgICAgICAgbmFtZSA9PiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChuYW1lKSB8fCB3cy5pbnN0YWxsZWRDb21wb25lbnRzIS5nZXQobmFtZSkhKVxuICAgICAgKS5waXBlKFxuICAgICAgICBzeW1ib2xpY0xpbmtQYWNrYWdlcyhzeW1saW5rRGlyKVxuICAgICAgKSxcbiAgICBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoc3ltbGlua0RpciwgcGtnTmFtZVNldClcbiAgKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gX2RlbGV0ZVVzZWxlc3NTeW1saW5rKGNoZWNrRGlyOiBzdHJpbmcsIGV4Y2x1ZGVTZXQ6IFNldDxzdHJpbmc+KSB7XG4gIGNvbnN0IGRvbmVzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICBjb25zdCBkb25lMSA9IGxpc3RNb2R1bGVTeW1saW5rcyhjaGVja0RpciwgYXN5bmMgbGluayA9PiB7XG4gICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoY2hlY2tEaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIGRyY3BOYW1lICE9PSBwa2dOYW1lICYmICFleGNsdWRlU2V0Lmhhcyhwa2dOYW1lKSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBsb2cuaW5mbyhgRGVsZXRlIGV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApO1xuICAgICAgY29uc3QgZG9uZSA9IG5ldyBQcm9taXNlPHZvaWQ+KChyZXMsIHJlaikgPT4ge1xuICAgICAgICBmcy51bmxpbmsobGluaywgKGVycikgPT4geyBpZiAoZXJyKSByZXR1cm4gcmVqKGVycik7IGVsc2UgcmVzKCk7fSk7XG4gICAgICB9KTtcbiAgICAgIGRvbmVzLnB1c2goZG9uZSk7XG4gICAgfVxuICB9KTtcbiAgYXdhaXQgZG9uZTE7XG4gIGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvKHBrSnNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQgPSBmYWxzZSk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICByZXR1cm4gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlLCBqc29uLCBpc0luc3RhbGxlZCk7XG59XG4vKipcbiAqIExpc3QgdGhvc2UgaW5zdGFsbGVkIHBhY2thZ2VzIHdoaWNoIGFyZSByZWZlcmVuY2VkIGJ5IHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZSxcbiAqIHRob3NlIHBhY2thZ2VzIG11c3QgaGF2ZSBcImRyXCIgcHJvcGVydHkgaW4gcGFja2FnZS5qc29uIFxuICogQHBhcmFtIHdvcmtzcGFjZUtleSBcbiAqL1xuZnVuY3Rpb24qIHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgd29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgb3JpZ2luSW5zdGFsbEpzb24gPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgLy8gY29uc3QgZGVwSnNvbiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgPyBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzXSA6XG4gIC8vICAgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXTtcbiAgZm9yIChjb25zdCBkZXBzIG9mIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc10pIHtcbiAgICBpZiAoZGVwcyA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgIGlmICghc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcCkgJiYgZGVwICE9PSAnQHdmaC9wbGluaycpIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uRmlsZSkpIHtcbiAgICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2VJbmZvKFxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKHJvb3REaXIsIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpLCB0cnVlXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAocGsuanNvbi5kciB8fCBway5qc29uLnBsaW5rKSB7XG4gICAgICAgICAgICB5aWVsZCBwaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlOiBzdHJpbmcsIGpzb246IGFueSwgaXNJbnN0YWxsZWQgPSBmYWxzZSxcbiAgc3ltTGlua1BhcmVudERpcj86IHN0cmluZyk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBzeW1MaW5rUGFyZW50RGlyID8gUGF0aC5yZXNvbHZlKHN5bUxpbmtQYXJlbnREaXIsIGpzb24ubmFtZSkgOiBQYXRoLmRpcm5hbWUocGtKc29uRmlsZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSksXG4gICAgaXNJbnN0YWxsZWRcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChfLnN0YXJ0c1dpdGgoZnJvbSwgJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnMuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgdG8pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oJ0NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gZnJvbSBhYnNvbHV0ZSBwYXRoXG4gKiBAcGFyYW0ge3N0cmluZ30gdG8gcmVsYXRpdmUgdG8gcm9vdFBhdGggXG4gKi9cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKHJvb3REaXIsIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuZnVuY3Rpb24gX3dyaXRlR2l0SG9vayhwcm9qZWN0OiBzdHJpbmcpIHtcbiAgLy8gaWYgKCFpc1dpbjMyKSB7XG4gIGNvbnN0IGdpdFBhdGggPSBQYXRoLnJlc29sdmUocHJvamVjdCwgJy5naXQvaG9va3MnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCkpIHtcbiAgICBjb25zdCBob29rU3RyID0gJyMhL2Jpbi9zaFxcbicgK1xuICAgICAgYGNkIFwiJHtyb290RGlyfVwiXFxuYCArXG4gICAgICAvLyAnZHJjcCBpbml0XFxuJyArXG4gICAgICAvLyAnbnB4IHByZXR0eS1xdWljayAtLXN0YWdlZFxcbicgKyAvLyBVc2UgYHRzbGludCAtLWZpeGAgaW5zdGVhZC5cbiAgICAgIGBwbGluayBsaW50IC0tcGogXCIke3Byb2plY3QucmVwbGFjZSgvWy9cXFxcXSQvLCAnJyl9XCIgLS1maXhcXG5gO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKSlcbiAgICAgIGZzLnVubGluayhnaXRQYXRoICsgJy9wcmUtY29tbWl0Jyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhnaXRQYXRoICsgJy9wcmUtcHVzaCcsIGhvb2tTdHIpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgZ2l0UGF0aCArICcvcHJlLXB1c2gnKTtcbiAgICBpZiAoIWlzV2luMzIpIHtcbiAgICAgIHNwYXduKCdjaG1vZCcsICctUicsICcreCcsIHByb2plY3QgKyAnLy5naXQvaG9va3MvcHJlLXB1c2gnKTtcbiAgICB9XG4gIH1cbiAgLy8gfVxufVxuXG5mdW5jdGlvbiBkZWxldGVEdXBsaWNhdGVkSW5zdGFsbGVkUGtnKHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhO1xuICBjb25zdCBkb05vdGhpbmcgPSAoKSA9PiB7fTtcbiAgd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKS5tYXAoKFtwa2dOYW1lXSkgPT4ge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShyb290RGlyLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBwa2dOYW1lKTtcbiAgICByZXR1cm4gZnMucHJvbWlzZXMubHN0YXQoZGlyKVxuICAgIC50aGVuKChzdGF0KSA9PiB7XG4gICAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgbG9nLmluZm8oYFByZXZpb3VzIGluc3RhbGxlZCAke1BhdGgucmVsYXRpdmUocm9vdERpcixkaXIpfSBpcyBkZWxldGVkLCBkdWUgdG8gbGlua2VkIHBhY2thZ2UgJHtwa2dOYW1lfWApO1xuICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMudW5saW5rKGRpcik7XG4gICAgICB9XG4gICAgfSlcbiAgICAuY2F0Y2goZG9Ob3RoaW5nKTtcbiAgfSk7XG59XG5cbi8vIC8qKlxuLy8gICAgKiBJZiBhIHNvdXJjZSBjb2RlIHBhY2thZ2UgdXNlcyBQbGluaydzIF9fcGxpbmsgQVBJICggbGlrZSBgLmxvZ2dlcmApIG9yIGV4dGVuZHMgUGxpbmsncyBjb21tYW5kIGxpbmUsXG4vLyAgICAqIHRoZXkgbmVlZCBlbnN1cmUgc29tZSBQbGluaydzIGRlcGVuZGVuY2llcyBhcmUgaW5zdGFsbGVkIGFzIDFzdCBsZXZlbCBkZXBlbmRlbmN5IGluIHRoZWlyIHdvcmtzcGFjZSxcbi8vICAgICogb3RoZXJ3aXNlIFZpc3VhbCBDb2RlIEVkaXRvciBjYW4gbm90IGZpbmQgY29ycmVjdCB0eXBlIGRlZmluaXRpb25zIHdoaWxlIHJlZmVyZW5jaW5nIFBsaW5rJ3MgbG9nZ2VyIG9yXG4vLyAgICAqIENvbW1hbmQgaW50ZXJmYWNlLlxuLy8gICAgKiBcbi8vICAgICogU28gSSBuZWVkIHRvIG1ha2Ugc3VyZSB0aGVzZSBkZXBlbmRlbmNpZXMgYXJlIGluc3RhbGxlZCBpbiBlYWNoIHdvcmtzcGFjZVxuLy8gICAgKi9cblxuLy8gZnVuY3Rpb24gcGxpbmtBcGlSZXF1aXJlZERlcHMoKTogUGFja2FnZUpzb25JbnRlcmYge1xuLy8gICBjb25zdCBwbGlua0pzb246IFBhY2thZ2VKc29uSW50ZXJmID0gcmVxdWlyZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKTtcbi8vICAgY29uc3QgZmFrZUpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuLy8gICAgIHZlcnNpb246IHBsaW5rSnNvbi52ZXJzaW9uLFxuLy8gICAgIG5hbWU6IHBsaW5rSnNvbi5uYW1lLFxuLy8gICAgIGRlcGVuZGVuY2llczoge31cbi8vICAgfTtcbi8vICAgZm9yIChjb25zdCBkZXAgb2YgWydjb21tYW5kZXInLCAnbG9nNGpzJ10pIHtcbi8vICAgICBjb25zdCB2ZXJzaW9uID0gcGxpbmtKc29uLmRlcGVuZGVuY2llcyFbZGVwXTtcbi8vICAgICBmYWtlSnNvbi5kZXBlbmRlbmNpZXMhW2RlcF0gPSB2ZXJzaW9uO1xuLy8gICB9XG4vLyAgIHJldHVybiBmYWtlSnNvbjtcbi8vIH1cbiJdfQ==