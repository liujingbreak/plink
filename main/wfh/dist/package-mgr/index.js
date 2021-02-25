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
exports.createPackageInfo = exports.installInDir = exports.isCwdWorkspace = exports.getProjectList = exports.getPackagesOfProjects = exports.workspaceKey = exports.projKeyToPath = exports.pathToProjKey = exports.getStore = exports.getState = exports.onLinkedPackageAdded = exports.updateGitIgnores = exports.actionDispatcher = exports.slice = void 0;
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
const misc_1 = require("../utils/misc");
const symlinks_1 = __importStar(require("../utils/symlinks"));
const rwPackageJson_1 = require("../rwPackageJson");
const os_1 = require("os");
const log4js_1 = require("log4js");
const log = log4js_1.getLogger('plink.package-mgr');
const { distDir } = JSON.parse(process.env.__plink);
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
        updatePlinkPackageInfo(d) {
            const plinkPkg = createPackageInfo(require.resolve('@wfh/plink/package.json'), false);
            if (misc_1.isDrcpSymlink) {
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
        /** payload: workspace keys  */
        createSymlinksForWorkspace(d, action) { },
        updateGitIgnores(d, { payload }) {
            d.gitIgnores[payload.file] = payload.lines.map(line => line.startsWith('/') ? line : '/' + line);
        },
        packagesUpdated(d) {
            d.packagesUpdateChecksum++;
        },
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
        },
        onWorkspacePackageUpdated(d, { payload: workspaceKey }) { },
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
                log.debug('[_hoistWorkspaceDeps] @wfh/plink is symlink');
                delete updatingDeps['@wfh/plink'];
                delete updatingDevDeps['@wfh/plink'];
            }
            const wsKey = workspaceKey(dir);
            const { hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo } = transitive_dep_hoister_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages.get(entry[0]).json), wsKey, updatingDeps, state.srcPackages);
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
                hoistDevPeerDepInfo: devHoistPeerDepInfo
            };
            state.lastCreatedWorkspace = wsKey;
            state.workspaces.set(wsKey, existing ? Object.assign(existing, wp) : wp);
        },
        _installWorkspace(d, { payload: { workspaceKey } }) {
            // d._computed.workspaceKeys.push(workspaceKey);
        },
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
    rxjs_1.of(1).pipe(operators_1.tap(() => process.nextTick(() => exports.actionDispatcher.updatePlinkPackageInfo())), operators_1.ignoreElements()), getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(pks => {
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
        exports.actionDispatcher.setCurrentWorkspace(dir);
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
            for (const wsKey of getState().workspaces.keys()) {
                exports.actionDispatcher._hoistWorkspaceDeps({ dir: path_1.default.resolve(misc_1.getRootDir(), wsKey) });
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
                    const path = path_1.default.resolve(misc_1.getRootDir(), curr);
                    exports.actionDispatcher.updateWorkspace({ dir: path, isForce: payload.isForce, createHook: payload.createHook });
                }
                else {
                    exports.actionDispatcher.setCurrentWorkspace(null);
                }
            }
        }
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_1.map(({ payload }) => {
        const wsKey = workspaceKey(payload.dir);
        exports.actionDispatcher.onWorkspacePackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated());
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateDir), operators_1.tap(() => exports.actionDispatcher.updatePlinkPackageInfo()), operators_1.concatMap(() => rxjs_1.defer(() => rxjs_1.from(scanAndSyncPackages().then(() => {
        for (const key of getState().workspaces.keys()) {
            updateInstalledPackageForWorkspace(key);
        }
    }))))), 
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
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.onWorkspacePackageUpdated), operators_1.map(action => updatedWorkspaceSet.add(action.payload)), operators_1.debounceTime(800), operators_1.tap(() => {
        exports.actionDispatcher.createSymlinksForWorkspace(Array.from(updatedWorkspaceSet.values()));
        updatedWorkspaceSet.clear();
        // return from(writeConfigFiles());
    }), operators_1.map(() => __awaiter(void 0, void 0, void 0, function* () {
        exports.actionDispatcher.packagesUpdated();
    }))), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.createSymlinksForWorkspace), operators_1.concatMap(({ payload: wsKeys }) => {
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
    const relPath = path_1.default.relative(misc_1.getRootDir(), path);
    return relPath.startsWith('..') ? path_1.default.resolve(path) : relPath;
}
exports.pathToProjKey = pathToProjKey;
function projKeyToPath(key) {
    return path_1.default.isAbsolute(key) ? key : path_1.default.resolve(misc_1.getRootDir(), key);
}
exports.projKeyToPath = projKeyToPath;
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
function getProjectList() {
    return Array.from(getState().project2Packages.keys()).map(pj => path_1.default.resolve(misc_1.getRootDir(), pj));
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
function updateInstalledPackageForWorkspace(wsKey) {
    const pkgEntry = scanInstalledPackage4Workspace(getState(), wsKey);
    const installed = new Map((function* () {
        for (const pk of pkgEntry) {
            yield [pk.name, pk];
        }
    })());
    exports.actionDispatcher._change(d => d.workspaces.get(wsKey).installedComponents = installed);
    exports.actionDispatcher.onWorkspacePackageUpdated(wsKey);
}
/**
 * Delete workspace state if its directory does not exist
 */
function checkAllWorkspaces() {
    for (const key of getState().workspaces.keys()) {
        const dir = path_1.default.resolve(misc_1.getRootDir(), key);
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
        const rootPath = misc_1.getRootDir();
        fs_extra_1.default.mkdirpSync(distDir);
        // maybeCopyTemplate(Path.resolve(__dirname, '../../templates/config.local-template.yaml'), Path.join(distDir, 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), misc_1.getRootDir() + '/.gitignore');
        yield symlinks_1.default();
        const projectDirs = getProjectList();
        if (createHook) {
            projectDirs.forEach(prjdir => {
                _writeGitHook(prjdir);
                maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
            });
        }
        yield scanAndSyncPackages();
        yield _deleteUselessSymlink(path_1.default.resolve(misc_1.getRootDir(), 'node_modules'), new Set());
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
        const dir = path_1.default.resolve(misc_1.getRootDir(), ws.id);
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
        yield new Promise(resolve => setImmediate(resolve));
        // await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
            yield process_utils_2.exe('npm', 'install', {
                cwd: dir,
                env // Force development mode, otherwise "devDependencies" will not be installed
            }).promise;
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
    const symlinkDir = path_1.default.resolve(misc_1.getRootDir(), wsKey, '.links');
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
        file: path_1.default.resolve(misc_1.getRootDir(), '.gitignore'),
        lines: [path_1.default.relative(misc_1.getRootDir(), symlinkDir).replace(/\\/g, '/')]
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
                const pkjsonFile = path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json');
                if (fs_extra_1.default.existsSync(pkjsonFile)) {
                    const pk = createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true);
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
        const dir = path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', pkgName);
        return fs_extra_1.default.promises.lstat(dir)
            .then((stat) => {
            if (!stat.isSymbolicLink()) {
                // tslint:disable-next-line: no-console
                log.info(`Previous installed ${path_1.default.relative(misc_1.getRootDir(), dir)} is deleted, due to linked package ${pkgName}`);
                return fs_extra_1.default.promises.unlink(dir);
            }
        })
            .catch(doNothing);
    });
}
// function writeFile(file: string, content: string) {
//   fs.writeFileSync(file, content);
//   // tslint:disable-next-line: no-console
//   log.info('%s is written', chalk.cyan(Path.relative(process.cwd(), file)));
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFxRTtBQUNyRSw4Q0FDdUY7QUFDdkYsc0VBQWlHO0FBQ2pHLG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQWtEO0FBQ2xELG9DQUF5RDtBQUN6RCx3Q0FBMEQ7QUFDMUQsOERBQWtIO0FBQ2xILG9EQUFzRDtBQUV0RCwyQkFBeUI7QUFDekIsbUNBQWlDO0FBQ2pDLE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQWlDM0MsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUUvRCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUM7QUFDdEIsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsTUFBTSxLQUFLLEdBQWtCO0lBQzNCLE1BQU0sRUFBRSxLQUFLO0lBQ2IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztDQUMxQixDQUFDO0FBdUJXLFFBQUEsS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ3pDLElBQUksRUFBRSxFQUFFO0lBQ1IsWUFBWSxFQUFFLEtBQUs7SUFDbkIsUUFBUSxFQUFFO1FBQ1IsbUVBQW1FO1FBQ25FLFdBQVcsQ0FBQyxDQUFD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RUFBRTtnQkFDMUIsdUNBQXVDO2dCQUN2QyxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixjQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFVLEVBQUUsRUFBQyxHQUFHLENBQUMsc0NBQXNDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQy9HLE9BQU8sa0JBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUNELHNEQUFzRDtBQUN0RCxxQ0FBcUM7QUFDckMsNENBQTRDO0FBQzVDLCtFQUErRTtBQUMvRSxJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgT2JzZXJ2YWJsZSwgb2YsIGRlZmVyLCB0aHJvd0Vycm9yfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBkZWJvdW5jZVRpbWUsXG4gIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGxpc3RDb21wRGVwZW5kZW5jeSwgUGFja2FnZUpzb25JbnRlcmYsIERlcGVuZGVudEluZm8gfSBmcm9tICcuLi90cmFuc2l0aXZlLWRlcC1ob2lzdGVyJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IHNldFByb2plY3RMaXN0fSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGdldFJvb3REaXIsIGlzRHJjcFN5bWxpbmsgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IHsgRU9MIH0gZnJvbSAnb3MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbWdyJyk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICAvKiogSWYgdGhpcyBwcm9wZXJ0eSBpcyBub3Qgc2FtZSBhcyBcInJlYWxQYXRoXCIsIHRoZW4gaXQgaXMgYSBzeW1saW5rICovXG4gIHBhdGg6IHN0cmluZztcbiAgcmVhbFBhdGg6IHN0cmluZztcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIGluaXRlZDogYm9vbGVhbjtcbiAgc3JjUGFja2FnZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLyoqIEtleSBpcyByZWxhdGl2ZSBwYXRoIHRvIHJvb3Qgd29ya3NwYWNlICovXG4gIHdvcmtzcGFjZXM6IE1hcDxzdHJpbmcsIFdvcmtzcGFjZVN0YXRlPjtcbiAgLyoqIGtleSBvZiBjdXJyZW50IFwid29ya3NwYWNlc1wiICovXG4gIGN1cnJXb3Jrc3BhY2U/OiBzdHJpbmcgfCBudWxsO1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIC8qKiBEcmNwIGlzIHRoZSBvcmlnaW5hbCBuYW1lIG9mIFBsaW5rIHByb2plY3QgKi9cbiAgbGlua2VkRHJjcD86IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgbGlua2VkRHJjcFByb2plY3Q/OiBzdHJpbmcgfCBudWxsO1xuICBpbnN0YWxsZWREcmNwPzogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgaXNJbkNoaW5hPzogYm9vbGVhbjtcbiAgLyoqIEV2ZXJ5dGltZSBhIGhvaXN0IHdvcmtzcGFjZSBzdGF0ZSBjYWxjdWxhdGlvbiBpcyBiYXNpY2FsbHkgZG9uZSwgaXQgaXMgaW5jcmVhc2VkIGJ5IDEgKi9cbiAgd29ya3NwYWNlVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICAvKiogd29ya3NwYWNlIGtleSAqL1xuICBsYXN0Q3JlYXRlZFdvcmtzcGFjZT86IHN0cmluZztcbn1cblxuY29uc3Qge2Rpc3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgaW5pdGVkOiBmYWxzZSxcbiAgd29ya3NwYWNlczogbmV3IE1hcCgpLFxuICBwcm9qZWN0MlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGdpdElnbm9yZXM6IHt9LFxuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogMCxcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogMFxufTtcblxuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VTdGF0ZSB7XG4gIGlkOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG5hbWVzIG9mIHRob3NlIHN5bWxpbmsgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG5cbiAgLyoqIGluc3RhbGxlZCBEUiBjb21wb25lbnQgcGFja2FnZXMgW25hbWUsIHZlcnNpb25dKi9cbiAgaW5zdGFsbGVkQ29tcG9uZW50cz86IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcblxuICBob2lzdEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdFBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcblxuICBob2lzdERldkluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuICBob2lzdERldlBlZXJEZXBJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgLyoqIERvIHRoaXMgYWN0aW9uIGFmdGVyIGFueSBsaW5rZWQgcGFja2FnZSBpcyByZW1vdmVkIG9yIGFkZGVkICAqL1xuICAgIGluaXRSb290RGlyKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7aXNGb3JjZTogYm9vbGVhbiwgY3JlYXRlSG9vazogYm9vbGVhbn0+KSB7fSxcblxuICAgIC8qKiBcbiAgICAgKiAtIENyZWF0ZSBpbml0aWFsIGZpbGVzIGluIHJvb3QgZGlyZWN0b3J5XG4gICAgICogLSBTY2FuIGxpbmtlZCBwYWNrYWdlcyBhbmQgaW5zdGFsbCB0cmFuc2l0aXZlIGRlcGVuZGVuY3lcbiAgICAgKiAtIFN3aXRjaCB0byBkaWZmZXJlbnQgd29ya3NwYWNlXG4gICAgICogLSBEZWxldGUgbm9uZXhpc3Rpbmcgd29ya3NwYWNlXG4gICAgICogLSBJZiBcInBhY2thZ2VKc29uRmlsZXNcIiBpcyBwcm92aWRlZCwgaXQgc2hvdWxkIHNraXAgc3RlcCBvZiBzY2FubmluZyBsaW5rZWQgcGFja2FnZXNcbiAgICAgKiAtIFRPRE86IGlmIHRoZXJlIGlzIGxpbmtlZCBwYWNrYWdlIHVzZWQgaW4gbW9yZSB0aGFuIG9uZSB3b3Jrc3BhY2UsIGhvaXN0IGFuZCBpbnN0YWxsIGZvciB0aGVtIGFsbD9cbiAgICAgKi9cbiAgICB1cGRhdGVXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZyxcbiAgICAgIGlzRm9yY2U6IGJvb2xlYW4sIGNyZWF0ZUhvb2s6IGJvb2xlYW4sIHBhY2thZ2VKc29uRmlsZXM/OiBzdHJpbmdbXX0+KSB7XG4gICAgfSxcbiAgICBzY2FuQW5kU3luY1BhY2thZ2VzKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7cGFja2FnZUpzb25GaWxlcz86IHN0cmluZ1tdfT4pIHt9LFxuICAgIHVwZGF0ZURpcigpIHt9LFxuICAgIHVwZGF0ZVBsaW5rUGFja2FnZUluZm8oZCkge1xuICAgICAgY29uc3QgcGxpbmtQa2cgPSBjcmVhdGVQYWNrYWdlSW5mbyhyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJyksIGZhbHNlKTtcbiAgICAgIGlmIChpc0RyY3BTeW1saW5rKSB7XG4gICAgICAgIGQubGlua2VkRHJjcCA9IHBsaW5rUGtnO1xuICAgICAgICBkLmluc3RhbGxlZERyY3AgPSBudWxsO1xuICAgICAgICBkLmxpbmtlZERyY3BQcm9qZWN0ID0gcGF0aFRvUHJvaktleShQYXRoLmRpcm5hbWUoZC5saW5rZWREcmNwIS5yZWFsUGF0aCkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZC5saW5rZWREcmNwID0gbnVsbDtcbiAgICAgICAgZC5pbnN0YWxsZWREcmNwID0gcGxpbmtQa2c7XG4gICAgICAgIGQubGlua2VkRHJjcFByb2plY3QgPSBudWxsO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3N5bmNMaW5rZWRQYWNrYWdlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248W3BrZ3M6IFBhY2thZ2VJbmZvW10sIG9wZXJhdG9yOiAndXBkYXRlJyB8ICdjbGVhbiddPikge1xuICAgICAgZC5pbml0ZWQgPSB0cnVlO1xuICAgICAgbGV0IG1hcCA9IGQuc3JjUGFja2FnZXM7XG4gICAgICBpZiAocGF5bG9hZFsxXSA9PT0gJ2NsZWFuJykge1xuICAgICAgICBtYXAgPSBkLnNyY1BhY2thZ2VzID0gbmV3IE1hcCgpO1xuICAgICAgfVxuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZFswXSkge1xuICAgICAgICBtYXAuc2V0KHBrSW5mby5uYW1lLCBwa0luZm8pO1xuICAgICAgfVxuICAgIH0sXG4gICAgb25MaW5rZWRQYWNrYWdlQWRkZWQoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge30sXG4gICAgYWRkUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGlmICghZC5wcm9qZWN0MlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5kZWxldGUoZGlyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8qKiBwYXlsb2FkOiB3b3Jrc3BhY2Uga2V5cyAgKi9cbiAgICBjcmVhdGVTeW1saW5rc0ZvcldvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICB1cGRhdGVHaXRJZ25vcmVzKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7ZmlsZTogc3RyaW5nLCBsaW5lczogc3RyaW5nW119Pikge1xuICAgICAgZC5naXRJZ25vcmVzW3BheWxvYWQuZmlsZV0gPSBwYXlsb2FkLmxpbmVzLm1hcChsaW5lID0+IGxpbmUuc3RhcnRzV2l0aCgnLycpID8gbGluZSA6ICcvJyArIGxpbmUpO1xuICAgIH0sXG4gICAgcGFja2FnZXNVcGRhdGVkKGQpIHtcbiAgICAgIGQucGFja2FnZXNVcGRhdGVDaGVja3N1bSsrO1xuICAgIH0sXG4gICAgc2V0SW5DaGluYShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Ym9vbGVhbj4pIHtcbiAgICAgIGQuaXNJbkNoaW5hID0gcGF5bG9hZDtcbiAgICB9LFxuICAgIHNldEN1cnJlbnRXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IGRpcn06IFBheWxvYWRBY3Rpb248c3RyaW5nIHwgbnVsbD4pIHtcbiAgICAgIGlmIChkaXIgIT0gbnVsbClcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBlbHNlXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IG51bGw7XG4gICAgfSxcbiAgICB3b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHZvaWQ+KSB7XG4gICAgICBkLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtICs9IDE7XG4gICAgfSxcbiAgICBvbldvcmtzcGFjZVBhY2thZ2VVcGRhdGVkKGQsIHtwYXlsb2FkOiB3b3Jrc3BhY2VLZXl9OiBQYXlsb2FkQWN0aW9uPHN0cmluZz4pIHt9LFxuICAgIF9ob2lzdFdvcmtzcGFjZURlcHMoc3RhdGUsIHtwYXlsb2FkOiB7ZGlyfX06IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nfT4pIHtcbiAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCJzcmNQYWNrYWdlc1wiIGlzIG51bGwsIG5lZWQgdG8gcnVuIGBpbml0YCBjb21tYW5kIGZpcnN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG4gICAgICBjb25zdCBwa2pzb246IFBhY2thZ2VKc29uSW50ZXJmID0gSlNPTi5wYXJzZShwa2pzb25TdHIpO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXBzIG9mIFtwa2pzb24uZGVwZW5kZW5jaWVzLCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXSBhcyB7W25hbWU6IHN0cmluZ106IHN0cmluZ31bXSApIHtcbiAgICAgIC8vICAgT2JqZWN0LmVudHJpZXMoZGVwcyk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30pO1xuXG4gICAgICBjb25zdCB1cGRhdGluZ0RlcHMgPSB7Li4ucGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXBzID0gW107XG4gICAgICBkZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRldkRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgICAgY29uc3QgdXBkYXRpbmdEZXZEZXBzID0gey4uLnBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiB0eXBlb2YgZGV2RGVwcyA9IFtdO1xuICAgICAgZGV2RGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXZEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChpc0RyY3BTeW1saW5rKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBsb2cuZGVidWcoJ1tfaG9pc3RXb3Jrc3BhY2VEZXBzXSBAd2ZoL3BsaW5rIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snQHdmaC9wbGluayddO1xuICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXZEZXBzWydAd2ZoL3BsaW5rJ107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBjb25zdCB7aG9pc3RlZDogaG9pc3RlZERlcHMsIGhvaXN0ZWRQZWVyczogaG9pc3RQZWVyRGVwSW5mb30gPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIHdzS2V5LCB1cGRhdGluZ0RlcHMsIHN0YXRlLnNyY1BhY2thZ2VzXG4gICAgICApO1xuXG4gICAgICBjb25zdCB7aG9pc3RlZDogaG9pc3RlZERldkRlcHMsIGhvaXN0ZWRQZWVyczogZGV2SG9pc3RQZWVyRGVwSW5mb30gPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIHdzS2V5LCB1cGRhdGluZ0RldkRlcHMsIHN0YXRlLnNyY1BhY2thZ2VzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSksXG5cbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXZEZXBzLmVudHJpZXMoKSlcbiAgICAgICAgLmNvbmNhdChBcnJheS5mcm9tKGRldkhvaXN0UGVlckRlcEluZm8uZW50cmllcygpKS5maWx0ZXIoaXRlbSA9PiAhaXRlbVsxXS5taXNzaW5nKSlcbiAgICAgICAgLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSlcbiAgICAgIH07XG5cbiAgICAgIC8vIGxvZy5pbmZvKGluc3RhbGxKc29uKVxuICAgICAgLy8gY29uc3QgaW5zdGFsbGVkQ29tcCA9IHNjYW5JbnN0YWxsZWRQYWNrYWdlNFdvcmtzcGFjZShzdGF0ZS53b3Jrc3BhY2VzLCBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXkpO1xuXG4gICAgICBjb25zdCBleGlzdGluZyA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBpZDogd3NLZXksXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcyxcbiAgICAgICAgaG9pc3RJbmZvOiBob2lzdGVkRGVwcyxcbiAgICAgICAgaG9pc3RQZWVyRGVwSW5mbyxcbiAgICAgICAgaG9pc3REZXZJbmZvOiBob2lzdGVkRGV2RGVwcyxcbiAgICAgICAgaG9pc3REZXZQZWVyRGVwSW5mbzogZGV2SG9pc3RQZWVyRGVwSW5mb1xuICAgICAgfTtcbiAgICAgIHN0YXRlLmxhc3RDcmVhdGVkV29ya3NwYWNlID0gd3NLZXk7XG4gICAgICBzdGF0ZS53b3Jrc3BhY2VzLnNldCh3c0tleSwgZXhpc3RpbmcgPyBPYmplY3QuYXNzaWduKGV4aXN0aW5nLCB3cCkgOiB3cCk7XG4gICAgfSxcbiAgICBfaW5zdGFsbFdvcmtzcGFjZShkLCB7cGF5bG9hZDoge3dvcmtzcGFjZUtleX19OiBQYXlsb2FkQWN0aW9uPHt3b3Jrc3BhY2VLZXk6IHN0cmluZ30+KSB7XG4gICAgICAvLyBkLl9jb21wdXRlZC53b3Jrc3BhY2VLZXlzLnB1c2god29ya3NwYWNlS2V5KTtcbiAgICB9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9QcmooZCwge3BheWxvYWQ6IHtwcmosIHBrZ3N9fTogUGF5bG9hZEFjdGlvbjx7cHJqOiBzdHJpbmc7IHBrZ3M6IHtuYW1lOiBzdHJpbmd9W119Pikge1xuICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChwYXRoVG9Qcm9qS2V5KHByaiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbmV4cG9ydCBjb25zdCB7dXBkYXRlR2l0SWdub3Jlcywgb25MaW5rZWRQYWNrYWdlQWRkZWR9ID0gYWN0aW9uRGlzcGF0Y2hlcjtcblxuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgY29uc3QgdXBkYXRlZFdvcmtzcGFjZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYWNrYWdlQWRkZWRMaXN0ID0gbmV3IEFycmF5PHN0cmluZz4oKTtcblxuICByZXR1cm4gbWVyZ2UoXG4gICAgLy8gVG8gb3ZlcnJpZGUgc3RvcmVkIHN0YXRlLiBcbiAgLy8gRG8gbm90IHB1dCBmb2xsb3dpbmcgbG9naWMgaW4gaW5pdGlhbFN0YXRlISBJdCB3aWxsIGJlIG92ZXJyaWRkZW4gYnkgcHJldmlvdXNseSBzYXZlZCBzdGF0ZVxuXG4gICAgb2YoMSkucGlwZSh0YXAoKCkgPT4gcHJvY2Vzcy5uZXh0VGljaygoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVBsaW5rUGFja2FnZUluZm8oKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHBrcyA9PiB7XG4gICAgICAgIHNldFByb2plY3RMaXN0KGdldFByb2plY3RMaXN0KCkpO1xuICAgICAgICByZXR1cm4gcGtzO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnNyY1BhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzY2FuKChwcmV2TWFwLCBjdXJyTWFwKSA9PiB7XG4gICAgICAgIHBhY2thZ2VBZGRlZExpc3Quc3BsaWNlKDApO1xuICAgICAgICBmb3IgKGNvbnN0IG5tIG9mIGN1cnJNYXAua2V5cygpKSB7XG4gICAgICAgICAgaWYgKCFwcmV2TWFwLmhhcyhubSkpIHtcbiAgICAgICAgICAgIHBhY2thZ2VBZGRlZExpc3QucHVzaChubSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYWNrYWdlQWRkZWRMaXN0Lmxlbmd0aCA+IDApXG4gICAgICAgICAgb25MaW5rZWRQYWNrYWdlQWRkZWQocGFja2FnZUFkZGVkTGlzdCk7XG4gICAgICAgIHJldHVybiBjdXJyTWFwO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgLy8gIHVwZGF0ZVdvcmtzcGFjZVxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVXb3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZDoge2RpciwgaXNGb3JjZSwgY3JlYXRlSG9vaywgcGFja2FnZUpzb25GaWxlc319KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnNldEN1cnJlbnRXb3Jrc3BhY2UoZGlyKTtcbiAgICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgUGF0aC5yZXNvbHZlKGRpciwgJ2FwcC5qcycpKTtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGlmIChpc0ZvcmNlKSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgY29uc3Qgd3MgPSBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGxvZy5kZWJ1ZygnZm9yY2UgbnBtIGluc3RhbGwgaW4nLCB3c0tleSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpIGFuZCB3YWl0IGZvciBpdCBmaW5pc2hlZCBieSBvYnNlcnZpbmcgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgLy8gdGhlbiBjYWxsIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHBhY2thZ2VKc29uRmlsZXMgIT0gbnVsbCA/IHNjYW5BbmRTeW5jUGFja2FnZXMocGFja2FnZUpzb25GaWxlcyk6XG4gICAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnNjYW5BbmRTeW5jUGFja2FnZXMpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKFxuICAgICAgICAgIHNjYW5BbmRTeW5jUGFja2FnZXMocGF5bG9hZC5wYWNrYWdlSnNvbkZpbGVzKSxcbiAgICAgICAgICBhY3Rpb24kLnBpcGUoXG4gICAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY0xpbmtlZFBhY2thZ2VzKSxcbiAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICB0YXAoKCkgPT4ge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHdzS2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2RpcjogUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXkpfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKVxuICAgICAgICApO1xuICAgICAgfSlcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIpLFxuICAgICAgbWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY2hlY2tBbGxXb3Jrc3BhY2VzKCk7XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKSkpIHtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgICAgICAgaXNGb3JjZTogcGF5bG9hZC5pc0ZvcmNlLFxuICAgICAgICAgICAgY3JlYXRlSG9vazogcGF5bG9hZC5jcmVhdGVIb29rfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgY3VyciA9IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgICAgICAgICBpZiAoY3VyciAhPSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyhjdXJyKSkge1xuICAgICAgICAgICAgICBjb25zdCBwYXRoID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgY3Vycik7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHBhdGgsIGlzRm9yY2U6IHBheWxvYWQuaXNGb3JjZSwgY3JlYXRlSG9vazogcGF5bG9hZC5jcmVhdGVIb29rfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnNldEN1cnJlbnRXb3Jrc3BhY2UobnVsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9ob2lzdFdvcmtzcGFjZURlcHMpLFxuICAgICAgbWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkocGF5bG9hZC5kaXIpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLm9uV29ya3NwYWNlUGFja2FnZVVwZGF0ZWQod3NLZXkpO1xuICAgICAgICBkZWxldGVEdXBsaWNhdGVkSW5zdGFsbGVkUGtnKHdzS2V5KTtcbiAgICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIud29ya3NwYWNlU3RhdGVVcGRhdGVkKCkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy51cGRhdGVEaXIpLFxuICAgICAgdGFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlUGxpbmtQYWNrYWdlSW5mbygpKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBkZWZlcigoKSA9PiBmcm9tKFxuICAgICAgICBzY2FuQW5kU3luY1BhY2thZ2VzKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZShrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICkpKVxuICAgICksXG4gICAgLy8gSGFuZGxlIG5ld2x5IGFkZGVkIHdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKHdzLmtleXMoKSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSksXG4gICAgICBzY2FuPHN0cmluZ1tdPigocHJldiwgY3VycikgPT4ge1xuICAgICAgICBpZiAocHJldi5sZW5ndGggPCBjdXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGxvZy5pbmZvKCdOZXcgd29ya3NwYWNlOiAnLCBuZXdBZGRlZCk7XG4gICAgICAgICAgZm9yIChjb25zdCB3cyBvZiBuZXdBZGRlZCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiB3c30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLy8gb2JzZXJ2ZSBhbGwgZXhpc3RpbmcgV29ya3NwYWNlcyBmb3IgZGVwZW5kZW5jeSBob2lzdGluZyByZXN1bHQgXG4gICAgLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIGZpbHRlcihzID0+IHMud29ya3NwYWNlcy5oYXMoa2V5KSksXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5pbnN0YWxsSnNvbiA9PT0gczIuaW5zdGFsbEpzb24pLFxuICAgICAgICBzY2FuPFdvcmtzcGFjZVN0YXRlPigob2xkLCBuZXdXcykgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICBjb25zdCBuZXdEZXBzID0gT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIGZvcmNpbmcgaW5zdGFsbCB3b3Jrc3BhY2UsIHRoZXJlZm9yZSBkZXBlbmRlbmNpZXMgaXMgY2xlYXJlZCBhdCB0aGlzIG1vbWVudFxuICAgICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBvbGREZXBzID0gT2JqZWN0LmVudHJpZXMob2xkLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMob2xkLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuXG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoICE9PSBvbGREZXBzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RGVwcy5zb3J0KCk7XG4gICAgICAgICAgb2xkRGVwcy5zb3J0KCk7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuZXdEZXBzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5ld0RlcHNbaV0gIT09IG9sZERlcHNbaV0pIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgfSksXG4gICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIGNvbmNhdE1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleTtcbiAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzISkpKSxcbiAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLm9uV29ya3NwYWNlUGFja2FnZVVwZGF0ZWQpLFxuICAgICAgbWFwKGFjdGlvbiA9PiB1cGRhdGVkV29ya3NwYWNlU2V0LmFkZChhY3Rpb24ucGF5bG9hZCkpLFxuICAgICAgZGVib3VuY2VUaW1lKDgwMCksXG4gICAgICB0YXAoKCkgPT4ge1xuXG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UoQXJyYXkuZnJvbSh1cGRhdGVkV29ya3NwYWNlU2V0LnZhbHVlcygpKSk7XG4gICAgICAgIHVwZGF0ZWRXb3Jrc3BhY2VTZXQuY2xlYXIoKTtcbiAgICAgICAgLy8gcmV0dXJuIGZyb20od3JpdGVDb25maWdGaWxlcygpKTtcbiAgICAgIH0pLFxuICAgICAgbWFwKGFzeW5jICgpID0+IHtcbiAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5wYWNrYWdlc1VwZGF0ZWQoKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZDogd3NLZXlzfSkgPT4ge1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4ud3NLZXlzLm1hcChfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2UpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5naXRJZ25vcmVzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAoZ2l0SWdub3JlcyA9PiBPYmplY3Qua2V5cyhnaXRJZ25vcmVzKS5qb2luKCcsJykpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGRlYm91bmNlVGltZSg1MDApLFxuICAgICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLk9iamVjdC5rZXlzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKGZpbGUgPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG1hcChzID0+IHMuZ2l0SWdub3Jlc1tmaWxlXSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBza2lwKDEpLFxuICAgICAgICAgIG1hcChsaW5lcyA9PiB7XG4gICAgICAgICAgICBmcy5yZWFkRmlsZShmaWxlLCAndXRmOCcsIChlcnIsIGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byByZWFkIGdpdGlnbm9yZSBmaWxlJywgZmlsZSk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nTGluZXMgPSBkYXRhLnNwbGl0KC9cXG5cXHI/LykubWFwKGxpbmUgPT4gbGluZS50cmltKCkpO1xuICAgICAgICAgICAgICBjb25zdCBuZXdMaW5lcyA9IF8uZGlmZmVyZW5jZShsaW5lcywgZXhpc3RpbmdMaW5lcyk7XG4gICAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPT09IDApXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICBmcy53cml0ZUZpbGUoZmlsZSwgZGF0YSArIEVPTCArIG5ld0xpbmVzLmpvaW4oRU9MKSwgKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICAgIGxvZy5pbmZvKCdNb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICApKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hZGRQcm9qZWN0LCBzbGljZS5hY3Rpb25zLmRlbGV0ZVByb2plY3QpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHNjYW5BbmRTeW5jUGFja2FnZXMoKSlcbiAgICApXG4gICkucGlwZShcbiAgICBpZ25vcmVFbGVtZW50cygpLFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIuc3RhY2sgPyBlcnIuc3RhY2sgOiBlcnIpO1xuICAgICAgcmV0dXJuIHRocm93RXJyb3IoZXJyKTtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCk6IE9ic2VydmFibGU8UGFja2FnZXNTdGF0ZT4ge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUHJvaktleShwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbiAgcmV0dXJuIHJlbFBhdGguc3RhcnRzV2l0aCgnLi4nKSA/IFBhdGgucmVzb2x2ZShwYXRoKSA6IHJlbFBhdGg7XG59XG5leHBvcnQgZnVuY3Rpb24gcHJvaktleVRvUGF0aChrZXk6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5pc0Fic29sdXRlKGtleSkgPyBrZXkgOiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIFBhdGgucmVzb2x2ZShwYXRoKSk7XG4gIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKVxuICAgIHJlbCA9IHJlbC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHJldHVybiByZWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3RzOiBzdHJpbmdbXSkge1xuICBmb3IgKGNvbnN0IHByaiBvZiBwcm9qZWN0cykge1xuICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwYXRoVG9Qcm9qS2V5KHByaikpO1xuICAgIGlmIChwa2dOYW1lcykge1xuICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgIGNvbnN0IHBrID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgIGlmIChwaylcbiAgICAgICAgICB5aWVsZCBwaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocGogPT4gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gc2Nhbkluc3RhbGxlZFBhY2thZ2U0V29ya3NwYWNlKGdldFN0YXRlKCksIHdzS2V5KTtcblxuICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgIGZvciAoY29uc3QgcGsgb2YgcGtnRW50cnkpIHtcbiAgICAgIHlpZWxkIFtway5uYW1lLCBwa107XG4gICAgfVxuICB9KSgpKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4gZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxlZENvbXBvbmVudHMgPSBpbnN0YWxsZWQpO1xuICBhY3Rpb25EaXNwYXRjaGVyLm9uV29ya3NwYWNlUGFja2FnZVVwZGF0ZWQod3NLZXkpO1xufVxuXG4vKipcbiAqIERlbGV0ZSB3b3Jrc3BhY2Ugc3RhdGUgaWYgaXRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdFxuICovXG5mdW5jdGlvbiBjaGVja0FsbFdvcmtzcGFjZXMoKSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGxvZy5pbmZvKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rID0gZmFsc2UpIHtcbiAgbG9nLmRlYnVnKCdpbml0Um9vdERpcmVjdG9yeScpO1xuICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgZnMubWtkaXJwU3luYyhkaXN0RGlyKTtcbiAgLy8gbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLFxuICAgICAgJ2dpdGlnbm9yZS50eHQnKSwgZ2V0Um9vdERpcigpICsgJy8uZ2l0aWdub3JlJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuXG4gIGlmIChjcmVhdGVIb29rKSB7XG4gICAgcHJvamVjdERpcnMuZm9yRWFjaChwcmpkaXIgPT4ge1xuICAgICAgX3dyaXRlR2l0SG9vayhwcmpkaXIpO1xuICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzbGludC5qc29uJyksIHByamRpciArICcvdHNsaW50Lmpzb24nKTtcbiAgICB9KTtcbiAgfVxuXG4gIGF3YWl0IHNjYW5BbmRTeW5jUGFja2FnZXMoKTtcbiAgYXdhaXQgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKSwgbmV3IFNldDxzdHJpbmc+KCkpO1xufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB3cml0ZUNvbmZpZ0ZpbGVzKCkge1xuLy8gICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbi8vICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbi8vICAgICBsb2cuaW5mbygnd3JpdGUgY29uZmlnIGZpbGU6JywgZmlsZSk7XG4vLyAgICAgd3JpdGVGaWxlKFBhdGguam9pbihkaXN0RGlyLCBmaWxlKSxcbi8vICAgICAgICdcXG4jIERPIE5PVCBNT0RJRklZIFRISVMgRklMRSFcXG4nICsgY29uZmlnQ29udGVudCk7XG4vLyAgIH0pO1xuLy8gfVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3cy5pZCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5zdGFsbEluRGlyKGRpciwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsIHdzLmluc3RhbGxKc29uU3RyKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICBjb25zdCB3c2QgPSBkLndvcmtzcGFjZXMuZ2V0KHdzLmlkKSE7XG4gICAgICB3c2QuaW5zdGFsbEpzb25TdHIgPSAnJztcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UtbG9jay5qc29uJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGxvZy5pbmZvKGBQcm9ibGVtYXRpYyAke2xvY2tGaWxlfSBpcyBkZWxldGVkLCBwbGVhc2UgdHJ5IGFnYWluYCk7XG4gICAgICAgIGZzLnVubGlua1N5bmMobG9ja0ZpbGUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbnN0YWxsSW5EaXIoZGlyOiBzdHJpbmcsIG9yaWdpblBrZ0pzb25TdHI6IHN0cmluZywgdG9JbnN0YWxsUGtnSnNvblN0cjogc3RyaW5nKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnSW5zdGFsbCBkZXBlbmRlbmNpZXMgaW4gJyArIGRpcik7XG4gIHRyeSB7XG4gICAgYXdhaXQgY29weU5wbXJjVG9Xb3Jrc3BhY2UoZGlyKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gIH1cbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmcsIGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnMubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgLy8gMS4gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICBhd2FpdCBsaXN0TW9kdWxlU3ltbGlua3ModGFyZ2V0LCBsaW5rID0+IHtcbiAgICBjb25zdCBsaW5rQ29udGVudCA9IGZzLnJlYWRsaW5rU3luYyhsaW5rKTtcbiAgICBzeW1saW5rc0luTW9kdWxlRGlyLnB1c2goe2NvbnRlbnQ6IGxpbmtDb250ZW50LCBsaW5rfSk7XG4gICAgcmV0dXJuIHVubGlua0FzeW5jKGxpbmspO1xuICB9KTtcblxuICAvLyAyLiBSdW4gYG5wbSBpbnN0YWxsYFxuICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgdG9JbnN0YWxsUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuICB0cnkge1xuICAgIGNvbnN0IGVudiA9IHsuLi5wcm9jZXNzLmVudiwgTk9ERV9FTlY6ICdkZXZlbG9wbWVudCd9IGFzIE5vZGVKUy5Qcm9jZXNzRW52O1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7XG4gICAgICBjd2Q6IGRpcixcbiAgICAgIGVudiAvLyBGb3JjZSBkZXZlbG9wbWVudCBtb2RlLCBvdGhlcndpc2UgXCJkZXZEZXBlbmRlbmNpZXNcIiB3aWxsIG5vdCBiZSBpbnN0YWxsZWRcbiAgICB9KS5wcm9taXNlO1xuICAgIC8vIFwibnBtIGRkcFwiIHJpZ2h0IGFmdGVyIFwibnBtIGluc3RhbGxcIiB3aWxsIGNhdXNlIGRldkRlcGVuZGVuY2llcyBiZWluZyByZW1vdmVkIHNvbWVob3csIGRvbid0IGtub3duXG4gICAgLy8gd2h5LCBJIGhhdmUgdG8gYWRkIGEgc2V0SW1tZWRpYXRlKCkgYmV0d2VlbiB0aGVtIHRvIHdvcmthcm91bmRcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldEltbWVkaWF0ZShyZXNvbHZlKSk7XG4gICAgYXdhaXQgZXhlKCducG0nLCAnZGRwJywge2N3ZDogZGlyLCBlbnZ9KS5wcm9taXNlO1xuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmVycm9yKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBlLnN0YWNrKTtcbiAgICB0aHJvdyBlO1xuICB9IGZpbmFsbHkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdSZWNvdmVyICcgKyBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIC8vIDMuIFJlY292ZXIgcGFja2FnZS5qc29uIGFuZCBzeW1saW5rcyBkZWxldGVkIGluIFN0ZXAuMS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgb3JpZ2luUGtnSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBhd2FpdCByZWNvdmVyU3ltbGlua3MoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlY292ZXJTeW1saW5rcygpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5hbGwoc3ltbGlua3NJbk1vZHVsZURpci5tYXAoKHtjb250ZW50LCBsaW5rfSkgPT4ge1xuICAgICAgcmV0dXJuIF9zeW1saW5rQXN5bmMoY29udGVudCwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgfSkpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNvcHlOcG1yY1RvV29ya3NwYWNlKHdvcmtzcGFjZURpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICcubnBtcmMnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmModGFyZ2V0KSlcbiAgICByZXR1cm47XG4gIGNvbnN0IGlzQ2hpbmEgPSBhd2FpdCBnZXRTdG9yZSgpLnBpcGUoXG4gICAgbWFwKHMgPT4gcy5pc0luQ2hpbmEpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZmlsdGVyKGNuID0+IGNuICE9IG51bGwpLFxuICAgICAgdGFrZSgxKVxuICAgICkudG9Qcm9taXNlKCk7XG5cbiAgaWYgKGlzQ2hpbmEpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbygnY3JlYXRlIC5ucG1yYyB0bycsIHRhcmdldCk7XG4gICAgZnMuY29weUZpbGVTeW5jKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbnBtcmMtZm9yLWNuLnR4dCcpLCB0YXJnZXQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHNjYW5BbmRTeW5jUGFja2FnZXMoaW5jbHVkZVBhY2thZ2VKc29uRmlsZXM/OiBzdHJpbmdbXSkge1xuICBjb25zdCBwcm9qUGtnTWFwOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mb1tdPiA9IG5ldyBNYXAoKTtcbiAgbGV0IHBrZ0xpc3Q6IFBhY2thZ2VJbmZvW107XG5cbiAgaWYgKGluY2x1ZGVQYWNrYWdlSnNvbkZpbGVzKSB7XG4gICAgY29uc3QgcHJqS2V5cyA9IEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSk7XG4gICAgY29uc3QgcHJqRGlycyA9IEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkubWFwKHByaktleSA9PiBwcm9qS2V5VG9QYXRoKHByaktleSkpO1xuICAgIHBrZ0xpc3QgPSBpbmNsdWRlUGFja2FnZUpzb25GaWxlcy5tYXAoanNvbkZpbGUgPT4ge1xuICAgICAgY29uc3QgaW5mbyA9IGNyZWF0ZVBhY2thZ2VJbmZvKGpzb25GaWxlLCBmYWxzZSk7XG4gICAgICBjb25zdCBwcmpJZHggPSBwcmpEaXJzLmZpbmRJbmRleChkaXIgPT4gaW5mby5yZWFsUGF0aC5zdGFydHNXaXRoKGRpciArIFBhdGguc2VwKSk7XG4gICAgICBpZiAocHJqSWR4IDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYCR7anNvbkZpbGV9IGlzIG5vdCB1bmRlciBhbnkga25vd24gUHJvamVjdCBkaXJlY3RvcnlzOiAke3ByakRpcnMuam9pbignLCAnKX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHByalBhY2thZ2VOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJqS2V5c1twcmpJZHhdKSE7XG4gICAgICBpZiAoIXByalBhY2thZ2VOYW1lcy5pbmNsdWRlcyhpbmZvLm5hbWUpKSB7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7XG4gICAgICAgICAgcHJqOiBwcmpLZXlzW3ByaklkeF0sXG4gICAgICAgICAgcGtnczogWy4uLnByalBhY2thZ2VOYW1lcy5tYXAobmFtZSA9PiAoe25hbWV9KSksIGluZm9dXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfSk7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKFtwa2dMaXN0LCAndXBkYXRlJ10pO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHJtID0gKGF3YWl0IGltcG9ydCgnLi4vcmVjaXBlLW1hbmFnZXInKSk7XG4gICAgcGtnTGlzdCA9IFtdO1xuICAgIGF3YWl0IHJtLnNjYW5QYWNrYWdlcygpLnBpcGUoXG4gICAgICB0YXAoKFtwcm9qLCBqc29uRmlsZV0pID0+IHtcbiAgICAgICAgaWYgKCFwcm9qUGtnTWFwLmhhcyhwcm9qKSlcbiAgICAgICAgICBwcm9qUGtnTWFwLnNldChwcm9qLCBbXSk7XG4gICAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhqc29uRmlsZSwgZmFsc2UpO1xuICAgICAgICBpZiAoaW5mby5qc29uLmRyIHx8IGluZm8uanNvbi5wbGluaykge1xuICAgICAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgICAgICBwcm9qUGtnTWFwLmdldChwcm9qKSEucHVzaChpbmZvKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2cuZGVidWcoYFBhY2thZ2Ugb2YgJHtqc29uRmlsZX0gaXMgc2tpcHBlZCAoZHVlIHRvIG5vIFwiZHJcIiBvciBcInBsaW5rXCIgcHJvcGVydHkpYCk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKS50b1Byb21pc2UoKTtcbiAgICBmb3IgKGNvbnN0IFtwcmosIHBrZ3NdIG9mIHByb2pQa2dNYXAuZW50cmllcygpKSB7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe3ByaiwgcGtnc30pO1xuICAgIH1cbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jTGlua2VkUGFja2FnZXMoW3BrZ0xpc3QsICdjbGVhbiddKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXksICcubGlua3MnKTtcbiAgZnMubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcbiAgaWYgKHdzLmluc3RhbGxlZENvbXBvbmVudHMpIHtcbiAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgcGtnTmFtZVNldC5hZGQocG5hbWUpO1xuICB9XG5cbiAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVHaXRJZ25vcmVzKHtcbiAgICBmaWxlOiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnLmdpdGlnbm9yZScpLFxuICAgIGxpbmVzOiBbUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHN5bWxpbmtEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKV19KTtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGZyb20oQXJyYXkuZnJvbShwa2dOYW1lU2V0KS5tYXAoXG4gICAgICAgIG5hbWUgPT4gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQobmFtZSkgfHwgd3MuaW5zdGFsbGVkQ29tcG9uZW50cyEuZ2V0KG5hbWUpISlcbiAgICAgICkucGlwZShcbiAgICAgICAgc3ltYm9saWNMaW5rUGFja2FnZXMoc3ltbGlua0RpcilcbiAgICAgICksXG4gICAgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKHN5bWxpbmtEaXIsIHBrZ05hbWVTZXQpXG4gICk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9kZWxldGVVc2VsZXNzU3ltbGluayhjaGVja0Rpcjogc3RyaW5nLCBleGNsdWRlU2V0OiBTZXQ8c3RyaW5nPikge1xuICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGRyY3BOYW1lID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lIDogbnVsbDtcbiAgY29uc3QgZG9uZTEgPSBsaXN0TW9kdWxlU3ltbGlua3MoY2hlY2tEaXIsIGFzeW5jIGxpbmsgPT4ge1xuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGNoZWNrRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiAhZXhjbHVkZVNldC5oYXMocGtnTmFtZSkpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgbG9nLmluZm8oYERlbGV0ZSBleHRyYW5lb3VzIHN5bWxpbms6ICR7bGlua31gKTtcbiAgICAgIGNvbnN0IGRvbmUgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzLCByZWopID0+IHtcbiAgICAgICAgZnMudW5saW5rKGxpbmssIChlcnIpID0+IHsgaWYgKGVycikgcmV0dXJuIHJlaihlcnIpOyBlbHNlIHJlcygpO30pO1xuICAgICAgfSk7XG4gICAgICBkb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGRvbmUxO1xuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgcmV0dXJuIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZSwganNvbiwgaXNJbnN0YWxsZWQpO1xufVxuLyoqXG4gKiBMaXN0IHRob3NlIGluc3RhbGxlZCBwYWNrYWdlcyB3aGljaCBhcmUgcmVmZXJlbmNlZCBieSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUsXG4gKiB0aG9zZSBwYWNrYWdlcyBtdXN0IGhhdmUgXCJkclwiIHByb3BlcnR5IGluIHBhY2thZ2UuanNvbiBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VLZXkgXG4gKi9cbmZ1bmN0aW9uKiBzY2FuSW5zdGFsbGVkUGFja2FnZTRXb3Jrc3BhY2Uoc3RhdGU6IFBhY2thZ2VzU3RhdGUsIHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IG9yaWdpbkluc3RhbGxKc29uID0gc3RhdGUud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSEub3JpZ2luSW5zdGFsbEpzb247XG4gIC8vIGNvbnN0IGRlcEpzb24gPSBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llc10gOlxuICAvLyAgIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc107XG4gIGZvciAoY29uc3QgZGVwcyBvZiBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdKSB7XG4gICAgaWYgKGRlcHMgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGZvciAoY29uc3QgZGVwIG9mIE9iamVjdC5rZXlzKGRlcHMpKSB7XG4gICAgICBpZiAoIXN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXApICYmIGRlcCAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gICAgICAgIGNvbnN0IHBranNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMocGtqc29uRmlsZSkpIHtcbiAgICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2VJbmZvKFxuICAgICAgICAgICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyksIHRydWVcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChway5qc29uLmRyIHx8IHBrLmpzb24ucGxpbmspIHtcbiAgICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGU6IHN0cmluZywganNvbjogYW55LCBpc0luc3RhbGxlZCA9IGZhbHNlLFxuICBzeW1MaW5rUGFyZW50RGlyPzogc3RyaW5nKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBtID0gbW9kdWxlTmFtZVJlZy5leGVjKGpzb24ubmFtZSk7XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgc2hvcnROYW1lOiBtIVsyXSxcbiAgICBuYW1lOiBqc29uLm5hbWUsXG4gICAgc2NvcGU6IG0hWzFdLFxuICAgIHBhdGg6IHN5bUxpbmtQYXJlbnREaXIgPyBQYXRoLnJlc29sdmUoc3ltTGlua1BhcmVudERpciwganNvbi5uYW1lKSA6IFBhdGguZGlybmFtZShwa0pzb25GaWxlKSxcbiAgICBqc29uLFxuICAgIHJlYWxQYXRoOiBmcy5yZWFscGF0aFN5bmMoUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpKSxcbiAgICBpc0luc3RhbGxlZFxuICB9O1xuICByZXR1cm4gcGtJbmZvO1xufVxuXG5mdW5jdGlvbiBjcChmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKF8uc3RhcnRzV2l0aChmcm9tLCAnLScpKSB7XG4gICAgZnJvbSA9IGFyZ3VtZW50c1sxXTtcbiAgICB0byA9IGFyZ3VtZW50c1syXTtcbiAgfVxuICBmcy5jb3B5U3luYyhmcm9tLCB0byk7XG4gIC8vIHNoZWxsLmNwKC4uLmFyZ3VtZW50cyk7XG4gIGlmICgvWy9cXFxcXSQvLnRlc3QodG8pKVxuICAgIHRvID0gUGF0aC5iYXNlbmFtZShmcm9tKTsgLy8gdG8gaXMgYSBmb2xkZXJcbiAgZWxzZVxuICAgIHRvID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0byk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbygnQ29weSB0byAlcycsIGNoYWxrLmN5YW4odG8pKTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBmcm9tIGFic29sdXRlIHBhdGhcbiAqIEBwYXJhbSB7c3RyaW5nfSB0byByZWxhdGl2ZSB0byByb290UGF0aCBcbiAqL1xuZnVuY3Rpb24gbWF5YmVDb3B5VGVtcGxhdGUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB0bykpKVxuICAgIGNwKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGZyb20pLCB0byk7XG59XG5cbmZ1bmN0aW9uIF93cml0ZUdpdEhvb2socHJvamVjdDogc3RyaW5nKSB7XG4gIC8vIGlmICghaXNXaW4zMikge1xuICBjb25zdCBnaXRQYXRoID0gUGF0aC5yZXNvbHZlKHByb2plY3QsICcuZ2l0L2hvb2tzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGgpKSB7XG4gICAgY29uc3QgaG9va1N0ciA9ICcjIS9iaW4vc2hcXG4nICtcbiAgICAgIGBjZCBcIiR7Z2V0Um9vdERpcigpfVwiXFxuYCArXG4gICAgICAvLyAnZHJjcCBpbml0XFxuJyArXG4gICAgICAvLyAnbnB4IHByZXR0eS1xdWljayAtLXN0YWdlZFxcbicgKyAvLyBVc2UgYHRzbGludCAtLWZpeGAgaW5zdGVhZC5cbiAgICAgIGBwbGluayBsaW50IC0tcGogXCIke3Byb2plY3QucmVwbGFjZSgvWy9cXFxcXSQvLCAnJyl9XCIgLS1maXhcXG5gO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKSlcbiAgICAgIGZzLnVubGluayhnaXRQYXRoICsgJy9wcmUtY29tbWl0Jyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhnaXRQYXRoICsgJy9wcmUtcHVzaCcsIGhvb2tTdHIpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKCdXcml0ZSAnICsgZ2l0UGF0aCArICcvcHJlLXB1c2gnKTtcbiAgICBpZiAoIWlzV2luMzIpIHtcbiAgICAgIHNwYXduKCdjaG1vZCcsICctUicsICcreCcsIHByb2plY3QgKyAnLy5naXQvaG9va3MvcHJlLXB1c2gnKTtcbiAgICB9XG4gIH1cbiAgLy8gfVxufVxuXG5mdW5jdGlvbiBkZWxldGVEdXBsaWNhdGVkSW5zdGFsbGVkUGtnKHdvcmtzcGFjZUtleTogc3RyaW5nKSB7XG4gIGNvbnN0IHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhO1xuICBjb25zdCBkb05vdGhpbmcgPSAoKSA9PiB7fTtcbiAgd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKS5tYXAoKFtwa2dOYW1lXSkgPT4ge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIHBrZ05hbWUpO1xuICAgIHJldHVybiBmcy5wcm9taXNlcy5sc3RhdChkaXIpXG4gICAgLnRoZW4oKHN0YXQpID0+IHtcbiAgICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBsb2cuaW5mbyhgUHJldmlvdXMgaW5zdGFsbGVkICR7UGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksZGlyKX0gaXMgZGVsZXRlZCwgZHVlIHRvIGxpbmtlZCBwYWNrYWdlICR7cGtnTmFtZX1gKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnVubGluayhkaXIpO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKGRvTm90aGluZyk7XG4gIH0pO1xufVxuLy8gZnVuY3Rpb24gd3JpdGVGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7XG4vLyAgIGZzLndyaXRlRmlsZVN5bmMoZmlsZSwgY29udGVudCk7XG4vLyAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuLy8gICBsb2cuaW5mbygnJXMgaXMgd3JpdHRlbicsIGNoYWxrLmN5YW4oUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSkpO1xuLy8gfVxuIl19