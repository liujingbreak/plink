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
exports.createPackageInfo = exports.installInDir = exports.isCwdWorkspace = exports.getProjectList = exports.listPackages = exports.getPackagesOfProjects = exports.workspaceKey = exports.pathToProjKey = exports.getStore = exports.getState = exports.onLinkedPackageAdded = exports.updateGitIgnores = exports.actionDispatcher = exports.slice = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const utils_1 = require("../cmd/utils");
const config_1 = __importDefault(require("../config"));
const transitive_dep_hoister_1 = require("../transitive-dep-hoister");
const editor_helper_1 = require("../editor-helper");
const log_config_1 = __importDefault(require("../log-config"));
const package_list_helper_1 = require("./package-list-helper");
const process_utils_1 = require("../process-utils");
const process_utils_2 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
const misc_1 = require("../utils/misc");
const symlinks_1 = __importStar(require("../utils/symlinks"));
const rwPackageJson_1 = require("../rwPackageJson");
const os_1 = require("os");
const { distDir } = JSON.parse(process.env.__plink);
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    inited: false,
    workspaces: new Map(),
    project2Packages: new Map(),
    srcPackages: new Map(),
    gitIgnores: {},
    linkedDrcp: null,
    workspaceUpdateChecksum: 0,
    packagesUpdateChecksum: 0
    // _computed: {
    //   workspaceKeys: []
    // }
};
exports.slice = store_1.stateFactory.newSlice({
    name: NS,
    initialState: state,
    reducers: {
        /** Do this action after any linked package is removed or added  */
        initRootDir(d, action) { },
        /** Check and install dependency, if there is linked package used in more than one workspace,
         * to switch between different workspace */
        updateWorkspace(d, action) {
        },
        updateDir() { },
        _syncLinkedPackages(d, { payload }) {
            d.inited = true;
            d.srcPackages = new Map();
            for (const pkInfo of payload) {
                d.srcPackages.set(pkInfo.name, pkInfo);
            }
        },
        onLinkedPackageAdded(d, action) { },
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
                console.log('[_hoistWorkspaceDeps] @wfh/plink is symlink');
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
            // console.log(installJson)
            // const installedComp = doListInstalledComp4Workspace(state.workspaces, state.srcPackages, wsKey);
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
        },
        updateGitIgnores(d, { payload }) {
            d.gitIgnores[payload.file] = payload.lines.map(line => line.startsWith('/') ? line : '/' + line);
        },
        _onRelatedPackageUpdated(d, { payload: workspaceKey }) { },
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
        }
    }
});
exports.actionDispatcher = store_1.stateFactory.bindActionCreators(exports.slice);
exports.updateGitIgnores = exports.actionDispatcher.updateGitIgnores, exports.onLinkedPackageAdded = exports.actionDispatcher.onLinkedPackageAdded;
const { _onRelatedPackageUpdated } = exports.actionDispatcher;
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    const updatedWorkspaceSet = new Set();
    const packageAddedList = new Array();
    exports.actionDispatcher._change(d => {
        d.linkedDrcp = misc_1.isDrcpSymlink ?
            createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), 'node_modules/@wfh/plink/package.json'), false, misc_1.getRootDir())
            : null;
    });
    return rxjs_1.merge(getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(pks => {
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
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateWorkspace), operators_1.switchMap(({ payload: { dir, isForce, createHook } }) => {
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
                    console.log('force npm install in', wsKey);
                });
            }
        }
        // call initRootDirectory() and wait for it finished by observing action '_syncLinkedPackages',
        // then call _hoistWorkspaceDeps
        return rxjs_1.merge(rxjs_1.defer(() => rxjs_1.of(initRootDirectory(createHook))), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncLinkedPackages), operators_1.take(1), operators_1.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
    }), operators_1.ignoreElements()), 
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
        _onRelatedPackageUpdated(wsKey);
        deleteDuplicatedInstalledPkg(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated());
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateDir), operators_1.concatMap(() => rxjs_1.defer(() => rxjs_1.from(_scanPackageAndLink().then(() => {
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
            console.log('New workspace: ', newAdded);
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
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._onRelatedPackageUpdated), operators_1.map(action => updatedWorkspaceSet.add(action.payload)), operators_1.debounceTime(800), operators_1.concatMap(() => {
        const dones = Array.from(updatedWorkspaceSet.values()).map(wsKey => {
            editor_helper_1.updateTsconfigFileForEditor(wsKey);
            return _createSymlinksForWorkspace(wsKey);
        });
        return rxjs_1.merge(...dones);
    }), operators_1.count(), operators_1.map(() => __awaiter(void 0, void 0, void 0, function* () {
        updatedWorkspaceSet.clear();
        yield writeConfigFiles();
        exports.actionDispatcher.packagesUpdated();
    }))), getStore().pipe(operators_1.map(s => s.gitIgnores), operators_1.distinctUntilChanged(), operators_1.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_1.distinctUntilChanged(), operators_1.debounceTime(500), operators_1.switchMap(() => {
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
                    console.log('modify', file);
                });
            });
        }))));
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_1.concatMap(() => rxjs_1.from(_scanPackageAndLink())))).pipe(operators_1.ignoreElements(), operators_1.catchError(err => {
        console.error('[package-mgr.index]', err.stack ? err.stack : err);
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
/**
 * List linked packages
 */
function listPackages() {
    let out = '';
    let i = 0;
    for (const { name } of package_list_helper_1.allPackages('*', 'src')) {
        out += `${i++}. ${name}`;
        out += '\n';
    }
    return out;
}
exports.listPackages = listPackages;
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
    const pkgEntry = doListInstalledComp4Workspace(getState(), wsKey);
    const installed = new Map((function* () {
        for (const pk of pkgEntry) {
            yield [pk.name, pk];
        }
    })());
    exports.actionDispatcher._change(d => d.workspaces.get(wsKey).installedComponents = installed);
    _onRelatedPackageUpdated(wsKey);
}
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
function initRootDirectory(createHook = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = misc_1.getRootDir();
        fs_extra_1.default.mkdirpSync(distDir);
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/config.local-template.yaml'), path_1.default.join(distDir, 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), misc_1.getRootDir() + '/.gitignore');
        yield symlinks_1.default();
        if (!fs_extra_1.default.existsSync(path_1.default.join(rootPath, 'logs')))
            fs_extra_1.default.mkdirpSync(path_1.default.join(rootPath, 'logs'));
        // fs.mkdirpSync(symlinkDir);
        log_config_1.default(config_1.default());
        const projectDirs = getProjectList();
        if (createHook) {
            projectDirs.forEach(prjdir => {
                _writeGitHook(prjdir);
                maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
            });
        }
        yield _scanPackageAndLink();
        yield _deleteUselessSymlink(path_1.default.resolve(misc_1.getRootDir(), 'node_modules'), new Set());
    });
}
function writeConfigFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            // tslint:disable-next-line: no-console
            console.log('write config file:', file);
            utils_1.writeFile(path_1.default.join(distDir, file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
    });
}
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
                    console.log(`[init] problematic ${lockFile} is deleted, please try again`);
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
        // 2. Run `npm install`
        const installJsonFile = path_1.default.resolve(dir, 'package.json');
        // tslint:disable-next-line: no-console
        console.log('[init] write', installJsonFile);
        fs_extra_1.default.writeFileSync(installJsonFile, toInstallPkgJsonStr, 'utf8');
        yield new Promise(resolve => process.nextTick(resolve));
        // await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            const env = Object.assign(Object.assign({}, process.env), { NODE_ENV: 'development' });
            yield process_utils_2.exe('npm', 'install', {
                cwd: dir,
                env // Force development mode, otherwise "devDependencies" will not be installed
            }).promise;
            // "npm ddp" right after "npm install" will cause devDependencies being removed somehow, don't known
            // why, I have to add a process.nextTick() between them to workaround
            yield new Promise(resolve => process.nextTick(resolve));
            yield process_utils_2.exe('npm', 'ddp', { cwd: dir, env }).promise;
        }
        catch (e) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.red('[init] Failed to install dependencies'), e.stack);
            throw e;
        }
        finally {
            // tslint:disable-next-line: no-console
            console.log('Recover ' + installJsonFile);
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
            console.log('create .npmrc to', target);
            fs_extra_1.default.copyFileSync(path_1.default.resolve(__dirname, '../../templates/npmrc-for-cn.txt'), target);
        }
    });
}
function _scanPackageAndLink() {
    return __awaiter(this, void 0, void 0, function* () {
        const rm = (yield Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
        const projPkgMap = new Map();
        const pkgList = [];
        yield rm.scanPackages().pipe(operators_1.tap(([proj, jsonFile]) => {
            if (!projPkgMap.has(proj))
                projPkgMap.set(proj, []);
            const info = createPackageInfo(jsonFile, false);
            pkgList.push(info);
            projPkgMap.get(proj).push(info);
        })).toPromise();
        for (const [prj, pkgs] of projPkgMap.entries()) {
            exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
        }
        exports.actionDispatcher._syncLinkedPackages(pkgList);
        // _createSymlinks();
    });
}
// function _createSymlinks$() {
//   const obsList: Observable<void>[] = [];
//   for (const key of getState().workspaces.keys()) {
//     obsList.push(_createSymlinksForWorkspace(key));
//   }
//   return merge(...obsList).pipe(count());
// }
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
    return rxjs_1.merge(rxjs_1.from(pkgNames.map(name => getState().srcPackages.get(name) || ws.installedComponents.get(name)))
        .pipe(rwPackageJson_1.symbolicLinkPackages(symlinkDir)), rxjs_1.from(_deleteUselessSymlink(symlinkDir, pkgNameSet)));
}
function _deleteUselessSymlink(checkDir, excludeSet) {
    return __awaiter(this, void 0, void 0, function* () {
        const dones = [];
        const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
        const done1 = symlinks_1.listModuleSymlinks(checkDir, (link) => __awaiter(this, void 0, void 0, function* () {
            const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
            if (drcpName !== pkgName && !excludeSet.has(pkgName)) {
                // tslint:disable-next-line: no-console
                console.log(chalk_1.default.yellow(`Delete extraneous symlink: ${link}`));
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
function* doListInstalledComp4Workspace(state, workspaceKey) {
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
                    const pk = createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true, path_1.default.resolve(misc_1.getRootDir(), workspaceKey, '.links'));
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
            `plink lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
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
function deleteDuplicatedInstalledPkg(workspaceKey) {
    const wsState = getState().workspaces.get(workspaceKey);
    const doNothing = () => { };
    wsState.linkedDependencies.concat(wsState.linkedDevDependencies).map(([pkgName]) => {
        const dir = path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', pkgName);
        return fs_extra_1.default.promises.lstat(dir)
            .then((stat) => {
            if (!stat.isSymbolicLink()) {
                // tslint:disable-next-line: no-console
                console.log(`[init] Previous installed ${path_1.default.relative(misc_1.getRootDir(), dir)} is deleted, due to linked package ${pkgName}`);
                return fs_extra_1.default.promises.unlink(dir);
            }
        })
            .catch(doNothing);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFxRTtBQUNyRSw4Q0FDOEY7QUFDOUYsd0NBQXlDO0FBQ3pDLHVEQUErQjtBQUMvQixzRUFBaUc7QUFDakcsb0RBQStEO0FBQy9ELCtEQUFzQztBQUN0QywrREFBb0Q7QUFDcEQsb0RBQXlDO0FBQ3pDLG9EQUF1QztBQUN2QyxzREFBa0Q7QUFDbEQsb0NBQXlEO0FBQ3pELHdDQUEwRDtBQUMxRCw4REFBa0g7QUFDbEgsb0RBQXNEO0FBR3RELDJCQUF5QjtBQTZCekIsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUUvRCxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUM7QUFDdEIsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsTUFBTSxLQUFLLEdBQWtCO0lBQzNCLE1BQU0sRUFBRSxLQUFLO0lBQ2IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsc0JBQXNCLEVBQUUsQ0FBQztJQUN6QixlQUFlO0lBQ2Ysc0JBQXNCO0lBQ3RCLElBQUk7Q0FDTCxDQUFDO0FBdUJXLFFBQUEsS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ3pDLElBQUksRUFBRSxFQUFFO0lBQ1IsWUFBWSxF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RUFBRSxFQUFFO1FBQ2pGLE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLFlBQVksRUFBRSxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDOUUsT0FBTyxrQkFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2FBQzVCLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTtnQkFDMUIsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixjQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFVLEVBQUUsRUFBQyxHQUFHLENBQUMsc0NBQXNDLE9BQU8sRUFBRSxDQUFDLENBQUM7Z0JBQ3pILE9BQU8sa0JBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hDO1FBQ0gsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3BCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIE9ic2VydmFibGUsIG9mLCBkZWZlciwgdGhyb3dFcnJvcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIHN3aXRjaE1hcCwgZGVib3VuY2VUaW1lLFxuICB0YWtlLCBjb25jYXRNYXAsIHNraXAsIGlnbm9yZUVsZW1lbnRzLCBzY2FuLCBjYXRjaEVycm9yLCB0YXAsIGNvdW50IH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi4vY21kL3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7IGxpc3RDb21wRGVwZW5kZW5jeSwgUGFja2FnZUpzb25JbnRlcmYsIERlcGVuZGVudEluZm8gfSBmcm9tICcuLi90cmFuc2l0aXZlLWRlcC1ob2lzdGVyJztcbmltcG9ydCB7IHVwZGF0ZVRzY29uZmlnRmlsZUZvckVkaXRvciB9IGZyb20gJy4uL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7IGFsbFBhY2thZ2VzIH0gZnJvbSAnLi9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IHNldFByb2plY3RMaXN0fSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGdldFJvb3REaXIsIGlzRHJjcFN5bWxpbmsgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0IHtzeW1ib2xpY0xpbmtQYWNrYWdlc30gZnJvbSAnLi4vcndQYWNrYWdlSnNvbic7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuXG5pbXBvcnQgeyBFT0wgfSBmcm9tICdvcyc7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG4gIGlzSW5zdGFsbGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBpbml0ZWQ6IGJvb2xlYW47XG4gIHNyY1BhY2thZ2VzOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG4gIC8qKiBLZXkgaXMgcmVsYXRpdmUgcGF0aCB0byByb290IHdvcmtzcGFjZSAqL1xuICB3b3Jrc3BhY2VzOiBNYXA8c3RyaW5nLCBXb3Jrc3BhY2VTdGF0ZT47XG4gIC8qKiBrZXkgb2YgY3VycmVudCBcIndvcmtzcGFjZXNcIiAqL1xuICBjdXJyV29ya3NwYWNlPzogc3RyaW5nIHwgbnVsbDtcbiAgcHJvamVjdDJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICBsaW5rZWREcmNwOiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGdpdElnbm9yZXM6IHtbZmlsZTogc3RyaW5nXTogc3RyaW5nW119O1xuICBpc0luQ2hpbmE/OiBib29sZWFuO1xuICAvKiogRXZlcnl0aW1lIGEgaG9pc3Qgd29ya3NwYWNlIHN0YXRlIGNhbGN1bGF0aW9uIGlzIGJhc2ljYWxseSBkb25lLCBpdCBpcyBpbmNyZWFzZWQgYnkgMSAqL1xuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogbnVtYmVyO1xuICBwYWNrYWdlc1VwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG4gIC8qKiB3b3Jrc3BhY2Uga2V5ICovXG4gIGxhc3RDcmVhdGVkV29ya3NwYWNlPzogc3RyaW5nO1xufVxuXG5jb25zdCB7ZGlzdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuY29uc3QgTlMgPSAncGFja2FnZXMnO1xuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmNvbnN0IHN0YXRlOiBQYWNrYWdlc1N0YXRlID0ge1xuICBpbml0ZWQ6IGZhbHNlLFxuICB3b3Jrc3BhY2VzOiBuZXcgTWFwKCksXG4gIHByb2plY3QyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgZ2l0SWdub3Jlczoge30sXG4gIGxpbmtlZERyY3A6IG51bGwsXG4gIHdvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtOiAwLFxuICBwYWNrYWdlc1VwZGF0ZUNoZWNrc3VtOiAwXG4gIC8vIF9jb21wdXRlZDoge1xuICAvLyAgIHdvcmtzcGFjZUtleXM6IFtdXG4gIC8vIH1cbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBpZDogc3RyaW5nO1xuICBvcmlnaW5JbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIG9yaWdpbkluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgaW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgLyoqIG5hbWVzIG9mIHRob3NlIHN5bWxpbmsgcGFja2FnZXMgKi9cbiAgbGlua2VkRGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8vIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERldkRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuXG4gIC8qKiBpbnN0YWxsZWQgRFIgY29tcG9uZW50IHBhY2thZ2VzIFtuYW1lLCB2ZXJzaW9uXSovXG4gIGluc3RhbGxlZENvbXBvbmVudHM/OiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG5cbiAgaG9pc3RJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3RQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG5cbiAgaG9pc3REZXZJbmZvOiBNYXA8c3RyaW5nLCBEZXBlbmRlbnRJbmZvPjtcbiAgaG9pc3REZXZQZWVyRGVwSW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG59XG5cbmV4cG9ydCBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6IE5TLFxuICBpbml0aWFsU3RhdGU6IHN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIC8qKiBEbyB0aGlzIGFjdGlvbiBhZnRlciBhbnkgbGlua2VkIHBhY2thZ2UgaXMgcmVtb3ZlZCBvciBhZGRlZCAgKi9cbiAgICBpbml0Um9vdERpcihkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2lzRm9yY2U6IGJvb2xlYW4sIGNyZWF0ZUhvb2s6IGJvb2xlYW59Pikge30sXG5cbiAgICAvKiogQ2hlY2sgYW5kIGluc3RhbGwgZGVwZW5kZW5jeSwgaWYgdGhlcmUgaXMgbGlua2VkIHBhY2thZ2UgdXNlZCBpbiBtb3JlIHRoYW4gb25lIHdvcmtzcGFjZSwgXG4gICAgICogdG8gc3dpdGNoIGJldHdlZW4gZGlmZmVyZW50IHdvcmtzcGFjZSAqL1xuICAgIHVwZGF0ZVdvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nLCBpc0ZvcmNlOiBib29sZWFuLCBjcmVhdGVIb29rOiBib29sZWFufT4pIHtcbiAgICB9LFxuICAgIHVwZGF0ZURpcigpIHt9LFxuICAgIF9zeW5jTGlua2VkUGFja2FnZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFBhY2thZ2VJbmZvW10+KSB7XG4gICAgICBkLmluaXRlZCA9IHRydWU7XG4gICAgICBkLnNyY1BhY2thZ2VzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZCkge1xuICAgICAgICBkLnNyY1BhY2thZ2VzLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uTGlua2VkUGFja2FnZUFkZGVkKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHt9LFxuICAgIC8vIF91cGRhdGVQYWNrYWdlU3RhdGUoZCwge3BheWxvYWQ6IGpzb25zfTogUGF5bG9hZEFjdGlvbjxhbnlbXT4pIHtcbiAgICAgIC8vICAgZm9yIChjb25zdCBqc29uIG9mIGpzb25zKSB7XG4gICAgICAvLyAgICAgY29uc3QgcGtnID0gZC5zcmNQYWNrYWdlcy5nZXQoanNvbi5uYW1lKTtcbiAgICAgIC8vICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAgIC8vICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAvLyAgICAgICAgIGBbcGFja2FnZS1tZ3IuaW5kZXhdIHBhY2thZ2UgbmFtZSBcIiR7anNvbi5uYW1lfVwiIGluIHBhY2thZ2UuanNvbiBpcyBjaGFuZ2VkIHNpbmNlIGxhc3QgdGltZSxcXG5gICtcbiAgICAgIC8vICAgICAgICAgJ3BsZWFzZSBkbyBcImluaXRcIiBhZ2FpbiBvbiB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnknKTtcbiAgICAgIC8vICAgICAgIGNvbnRpbnVlO1xuICAgICAgLy8gICAgIH1cbiAgICAgIC8vICAgICBwa2cuanNvbiA9IGpzb247XG4gICAgICAvLyAgIH1cbiAgICAgIC8vIH0sXG4gICAgYWRkUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGlmICghZC5wcm9qZWN0MlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5kZWxldGUoZGlyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9ob2lzdFdvcmtzcGFjZURlcHMoc3RhdGUsIHtwYXlsb2FkOiB7ZGlyfX06IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nfT4pIHtcbiAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCJzcmNQYWNrYWdlc1wiIGlzIG51bGwsIG5lZWQgdG8gcnVuIGBpbml0YCBjb21tYW5kIGZpcnN0Jyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG4gICAgICBjb25zdCBwa2pzb246IFBhY2thZ2VKc29uSW50ZXJmID0gSlNPTi5wYXJzZShwa2pzb25TdHIpO1xuICAgICAgLy8gZm9yIChjb25zdCBkZXBzIG9mIFtwa2pzb24uZGVwZW5kZW5jaWVzLCBwa2pzb24uZGV2RGVwZW5kZW5jaWVzXSBhcyB7W25hbWU6IHN0cmluZ106IHN0cmluZ31bXSApIHtcbiAgICAgIC8vICAgT2JqZWN0LmVudHJpZXMoZGVwcyk7XG4gICAgICAvLyB9XG5cbiAgICAgIGNvbnN0IGRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXBlbmRlbmNpZXMgfHwge30pO1xuXG4gICAgICBjb25zdCB1cGRhdGluZ0RlcHMgPSB7Li4ucGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXBzID0gW107XG4gICAgICBkZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRldkRlcHMgPSBPYmplY3QuZW50cmllczxzdHJpbmc+KHBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge30pO1xuICAgICAgY29uc3QgdXBkYXRpbmdEZXZEZXBzID0gey4uLnBranNvbi5kZXZEZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiB0eXBlb2YgZGV2RGVwcyA9IFtdO1xuICAgICAgZGV2RGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXZEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG5cbiAgICAgIGlmIChpc0RyY3BTeW1saW5rKSB7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICBjb25zb2xlLmxvZygnW19ob2lzdFdvcmtzcGFjZURlcHNdIEB3ZmgvcGxpbmsgaXMgc3ltbGluaycpO1xuICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzWydAd2ZoL3BsaW5rJ107XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbJ0B3ZmgvcGxpbmsnXTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGVwcywgaG9pc3RlZFBlZXJzOiBob2lzdFBlZXJEZXBJbmZvfSA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcy5nZXQoZW50cnlbMF0pIS5qc29uKSxcbiAgICAgICAgd3NLZXksIHVwZGF0aW5nRGVwcywgc3RhdGUuc3JjUGFja2FnZXNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGV2RGVwcywgaG9pc3RlZFBlZXJzOiBkZXZIb2lzdFBlZXJEZXBJbmZvfSA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcy5nZXQoZW50cnlbMF0pIS5qc29uKSxcbiAgICAgICAgd3NLZXksIHVwZGF0aW5nRGV2RGVwcywgc3RhdGUuc3JjUGFja2FnZXNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHtcbiAgICAgICAgLi4ucGtqc29uLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IEFycmF5LmZyb20oaG9pc3RlZERlcHMuZW50cmllcygpKVxuICAgICAgICAuY29uY2F0KEFycmF5LmZyb20oaG9pc3RQZWVyRGVwSW5mby5lbnRyaWVzKCkpLmZpbHRlcihpdGVtID0+ICFpdGVtWzFdLm1pc3NpbmcpKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KSxcblxuICAgICAgICBkZXZEZXBlbmRlbmNpZXM6IEFycmF5LmZyb20oaG9pc3RlZERldkRlcHMuZW50cmllcygpKVxuICAgICAgICAuY29uY2F0KEFycmF5LmZyb20oZGV2SG9pc3RQZWVyRGVwSW5mby5lbnRyaWVzKCkpLmZpbHRlcihpdGVtID0+ICFpdGVtWzFdLm1pc3NpbmcpKVxuICAgICAgICAucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KVxuICAgICAgfTtcblxuICAgICAgLy8gY29uc29sZS5sb2coaW5zdGFsbEpzb24pXG4gICAgICAvLyBjb25zdCBpbnN0YWxsZWRDb21wID0gZG9MaXN0SW5zdGFsbGVkQ29tcDRXb3Jrc3BhY2Uoc3RhdGUud29ya3NwYWNlcywgc3RhdGUuc3JjUGFja2FnZXMsIHdzS2V5KTtcblxuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgaWQ6IHdzS2V5LFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIGhvaXN0SW5mbzogaG9pc3RlZERlcHMsXG4gICAgICAgIGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0RGV2SW5mbzogaG9pc3RlZERldkRlcHMsXG4gICAgICAgIGhvaXN0RGV2UGVlckRlcEluZm86IGRldkhvaXN0UGVlckRlcEluZm9cbiAgICAgIH07XG4gICAgICBzdGF0ZS5sYXN0Q3JlYXRlZFdvcmtzcGFjZSA9IHdzS2V5O1xuICAgICAgc3RhdGUud29ya3NwYWNlcy5zZXQod3NLZXksIGV4aXN0aW5nID8gT2JqZWN0LmFzc2lnbihleGlzdGluZywgd3ApIDogd3ApO1xuICAgIH0sXG4gICAgX2luc3RhbGxXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IHt3b3Jrc3BhY2VLZXl9fTogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmd9Pikge1xuICAgICAgLy8gZC5fY29tcHV0ZWQud29ya3NwYWNlS2V5cy5wdXNoKHdvcmtzcGFjZUtleSk7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiBQYWNrYWdlSW5mb1tdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH0sXG4gICAgdXBkYXRlR2l0SWdub3JlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e2ZpbGU6IHN0cmluZywgbGluZXM6IHN0cmluZ1tdfT4pIHtcbiAgICAgIGQuZ2l0SWdub3Jlc1twYXlsb2FkLmZpbGVdID0gcGF5bG9hZC5saW5lcy5tYXAobGluZSA9PiBsaW5lLnN0YXJ0c1dpdGgoJy8nKSA/IGxpbmUgOiAnLycgKyBsaW5lKTtcbiAgICB9LFxuICAgIF9vblJlbGF0ZWRQYWNrYWdlVXBkYXRlZChkLCB7cGF5bG9hZDogd29ya3NwYWNlS2V5fTogUGF5bG9hZEFjdGlvbjxzdHJpbmc+KSB7fSxcbiAgICBwYWNrYWdlc1VwZGF0ZWQoZCkge1xuICAgICAgZC5wYWNrYWdlc1VwZGF0ZUNoZWNrc3VtKys7XG4gICAgfSxcbiAgICBzZXRJbkNoaW5hKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxib29sZWFuPikge1xuICAgICAgZC5pc0luQ2hpbmEgPSBwYXlsb2FkO1xuICAgIH0sXG4gICAgc2V0Q3VycmVudFdvcmtzcGFjZShkLCB7cGF5bG9hZDogZGlyfTogUGF5bG9hZEFjdGlvbjxzdHJpbmcgfCBudWxsPikge1xuICAgICAgaWYgKGRpciAhPSBudWxsKVxuICAgICAgICBkLmN1cnJXb3Jrc3BhY2UgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gbnVsbDtcbiAgICB9LFxuICAgIHdvcmtzcGFjZVN0YXRlVXBkYXRlZChkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248dm9pZD4pIHtcbiAgICAgIGQud29ya3NwYWNlVXBkYXRlQ2hlY2tzdW0gKz0gMTtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuZXhwb3J0IGNvbnN0IHt1cGRhdGVHaXRJZ25vcmVzLCBvbkxpbmtlZFBhY2thZ2VBZGRlZH0gPSBhY3Rpb25EaXNwYXRjaGVyO1xuY29uc3Qge19vblJlbGF0ZWRQYWNrYWdlVXBkYXRlZH0gPSBhY3Rpb25EaXNwYXRjaGVyO1xuXG4vKipcbiAqIENhcmVmdWxseSBhY2Nlc3MgYW55IHByb3BlcnR5IG9uIGNvbmZpZywgc2luY2UgY29uZmlnIHNldHRpbmcgcHJvYmFibHkgaGFzbid0IGJlZW4gc2V0IHlldCBhdCB0aGlzIG1vbW1lbnRcbiAqL1xuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICBjb25zdCB1cGRhdGVkV29ya3NwYWNlU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHBhY2thZ2VBZGRlZExpc3QgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuXG4gIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICBkLmxpbmtlZERyY3AgPSBpc0RyY3BTeW1saW5rID9cbiAgICBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUoXG4gICAgICBnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMvQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSwgZmFsc2UsIGdldFJvb3REaXIoKSlcbiAgICA6IG51bGw7XG4gIH0pO1xuXG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdExpc3QoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICAgIHJldHVybiBwa3M7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNjYW4oKHByZXZNYXAsIGN1cnJNYXApID0+IHtcbiAgICAgICAgcGFja2FnZUFkZGVkTGlzdC5zcGxpY2UoMCk7XG4gICAgICAgIGZvciAoY29uc3Qgbm0gb2YgY3Vyck1hcC5rZXlzKCkpIHtcbiAgICAgICAgICBpZiAoIXByZXZNYXAuaGFzKG5tKSkge1xuICAgICAgICAgICAgcGFja2FnZUFkZGVkTGlzdC5wdXNoKG5tKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhY2thZ2VBZGRlZExpc3QubGVuZ3RoID4gMClcbiAgICAgICAgICBvbkxpbmtlZFBhY2thZ2VBZGRlZChwYWNrYWdlQWRkZWRMaXN0KTtcbiAgICAgICAgcmV0dXJuIGN1cnJNYXA7XG4gICAgICB9KVxuICAgICksXG5cbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSksXG4gICAgICBzd2l0Y2hNYXAoKHtwYXlsb2FkOiB7ZGlyLCBpc0ZvcmNlLCBjcmVhdGVIb29rfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICAgICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCBQYXRoLnJlc29sdmUoZGlyLCAnYXBwLmpzJykpO1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGlzRm9yY2UpIHtcbiAgICAgICAgICAvLyBDaGFuaW5nIGluc3RhbGxKc29uU3RyIHRvIGZvcmNlIGFjdGlvbiBfaW5zdGFsbFdvcmtzcGFjZSBiZWluZyBkaXNwYXRjaGVkIGxhdGVyXG4gICAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgICAgICBpZiAoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgICAgICAgICAgLy8gY2xlYW4gdG8gdHJpZ2dlciBpbnN0YWxsIGFjdGlvblxuICAgICAgICAgICAgICBjb25zdCB3cyA9IGQud29ya3NwYWNlcy5nZXQod3NLZXkpITtcbiAgICAgICAgICAgICAgd3MuaW5zdGFsbEpzb25TdHIgPSAnJztcbiAgICAgICAgICAgICAgd3MuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzID0ge307XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZvcmNlIG5wbSBpbnN0YWxsIGluJywgd3NLZXkpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIGNhbGwgaW5pdFJvb3REaXJlY3RvcnkoKSBhbmQgd2FpdCBmb3IgaXQgZmluaXNoZWQgYnkgb2JzZXJ2aW5nIGFjdGlvbiAnX3N5bmNMaW5rZWRQYWNrYWdlcycsXG4gICAgICAgIC8vIHRoZW4gY2FsbCBfaG9pc3RXb3Jrc3BhY2VEZXBzXG4gICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICBkZWZlcigoKSA9PiBvZihpbml0Um9vdERpcmVjdG9yeShjcmVhdGVIb29rKSkpLFxuICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jTGlua2VkUGFja2FnZXMpLFxuICAgICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgIClcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHByb2Nlc3MuY3dkKCksXG4gICAgICAgICAgICBpc0ZvcmNlOiBwYXlsb2FkLmlzRm9yY2UsXG4gICAgICAgICAgICBjcmVhdGVIb29rOiBwYXlsb2FkLmNyZWF0ZUhvb2t9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBjdXJyID0gZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICAgICAgICAgIGlmIChjdXJyICE9IG51bGwpIHtcbiAgICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKGN1cnIpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBjdXJyKTtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci51cGRhdGVXb3Jrc3BhY2Uoe2RpcjogcGF0aCwgaXNGb3JjZTogcGF5bG9hZC5pc0ZvcmNlLCBjcmVhdGVIb29rOiBwYXlsb2FkLmNyZWF0ZUhvb2t9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2V0Q3VycmVudFdvcmtzcGFjZShudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gICAgICAgIF9vblJlbGF0ZWRQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG4gICAgICAgIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod3NLZXkpO1xuICAgICAgICBzZXRJbW1lZGlhdGUoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci53b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZURpciksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gZGVmZXIoKCkgPT4gZnJvbShcbiAgICAgICAgX3NjYW5QYWNrYWdlQW5kTGluaygpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICAgICAgICAgIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uoa2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApKSlcbiAgICApLFxuICAgIC8vIEhhbmRsZSBuZXdseSBhZGRlZCB3b3Jrc3BhY2VcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy53b3Jrc3BhY2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAod3MgPT4ge1xuICAgICAgICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbSh3cy5rZXlzKCkpO1xuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0pLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnTmV3IHdvcmtzcGFjZTogJywgbmV3QWRkZWQpO1xuICAgICAgICAgIGZvciAoY29uc3Qgd3Mgb2YgbmV3QWRkZWQpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleTogd3N9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnI7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC8vIG9ic2VydmUgYWxsIGV4aXN0aW5nIFdvcmtzcGFjZXMgZm9yIGRlcGVuZGVuY3kgaG9pc3RpbmcgcmVzdWx0IFxuICAgIC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBmaWx0ZXIocyA9PiBzLndvcmtzcGFjZXMuaGFzKGtleSkpLFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuaW5zdGFsbEpzb24gPT09IHMyLmluc3RhbGxKc29uKSxcbiAgICAgICAgc2NhbjxXb3Jrc3BhY2VTdGF0ZT4oKG9sZCwgbmV3V3MpID0+IHtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgICAgY29uc3QgbmV3RGVwcyA9IE9iamVjdC5lbnRyaWVzKG5ld1dzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzIHx8IFtdKSlcbiAgICAgICAgICAgIC5tYXAoZW50cnkgPT4gZW50cnkuam9pbignOiAnKSk7XG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBmb3JjaW5nIGluc3RhbGwgd29ya3NwYWNlLCB0aGVyZWZvcmUgZGVwZW5kZW5jaWVzIGlzIGNsZWFyZWQgYXQgdGhpcyBtb21lbnRcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgb2xkRGVwcyA9IE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgfHwgW10pXG4gICAgICAgICAgICAuY29uY2F0KE9iamVjdC5lbnRyaWVzKG9sZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcblxuICAgICAgICAgIGlmIChuZXdEZXBzLmxlbmd0aCAhPT0gb2xkRGVwcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleToga2V5fSk7XG4gICAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5ld0RlcHMuc29ydCgpO1xuICAgICAgICAgIG9sZERlcHMuc29ydCgpO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwLCBsID0gbmV3RGVwcy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChuZXdEZXBzW2ldICE9PSBvbGREZXBzW2ldKSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe3dvcmtzcGFjZUtleToga2V5fSk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gbmV3V3M7XG4gICAgICAgIH0pLFxuICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgICBjb25jYXRNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3Qgd3NLZXkgPSBhY3Rpb24ucGF5bG9hZC53b3Jrc3BhY2VLZXk7XG4gICAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzLmdldCh3c0tleSkpLFxuICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgZmlsdGVyKHdzID0+IHdzICE9IG51bGwpLFxuICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgY29uY2F0TWFwKHdzID0+IGZyb20oaW5zdGFsbFdvcmtzcGFjZSh3cyEpKSksXG4gICAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICAgIHVwZGF0ZUluc3RhbGxlZFBhY2thZ2VGb3JXb3Jrc3BhY2Uod3NLZXkpO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fb25SZWxhdGVkUGFja2FnZVVwZGF0ZWQpLFxuICAgICAgbWFwKGFjdGlvbiA9PiB1cGRhdGVkV29ya3NwYWNlU2V0LmFkZChhY3Rpb24ucGF5bG9hZCkpLFxuICAgICAgZGVib3VuY2VUaW1lKDgwMCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4ge1xuICAgICAgICBjb25zdCBkb25lcyA9IEFycmF5LmZyb20odXBkYXRlZFdvcmtzcGFjZVNldC52YWx1ZXMoKSkubWFwKHdzS2V5ID0+IHtcbiAgICAgICAgICB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JFZGl0b3Iod3NLZXkpO1xuICAgICAgICAgIHJldHVybiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXkpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLmRvbmVzKTtcbiAgICAgIH0pLFxuICAgICAgY291bnQoKSxcbiAgICAgIG1hcChhc3luYyAoKSA9PiB7XG4gICAgICAgIHVwZGF0ZWRXb3Jrc3BhY2VTZXQuY2xlYXIoKTtcbiAgICAgICAgYXdhaXQgd3JpdGVDb25maWdGaWxlcygpO1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnBhY2thZ2VzVXBkYXRlZCgpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLmdpdElnbm9yZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChnaXRJZ25vcmVzID0+IE9iamVjdC5rZXlzKGdpdElnbm9yZXMpLmpvaW4oJywnKSksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgZGVib3VuY2VUaW1lKDUwMCksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS5naXRJZ25vcmVzKS5tYXAoZmlsZSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy5naXRJZ25vcmVzW2ZpbGVdKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIHNraXAoMSksXG4gICAgICAgICAgbWFwKGxpbmVzID0+IHtcbiAgICAgICAgICAgIGZzLnJlYWRGaWxlKGZpbGUsICd1dGY4JywgKGVyciwgZGF0YSkgPT4ge1xuICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgZ2l0aWdub3JlIGZpbGUnLCBmaWxlKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgZXhpc3RpbmdMaW5lcyA9IGRhdGEuc3BsaXQoL1xcblxccj8vKS5tYXAobGluZSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICAgICAgICAgIGNvbnN0IG5ld0xpbmVzID0gXy5kaWZmZXJlbmNlKGxpbmVzLCBleGlzdGluZ0xpbmVzKTtcbiAgICAgICAgICAgICAgaWYgKG5ld0xpbmVzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlLCBkYXRhICsgRU9MICsgbmV3TGluZXMuam9pbihFT0wpLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vZGlmeScsIGZpbGUpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFkZFByb2plY3QsIHNsaWNlLmFjdGlvbnMuZGVsZXRlUHJvamVjdCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gZnJvbShfc2NhblBhY2thZ2VBbmRMaW5rKCkpKVxuICAgIClcbiAgKS5waXBlKFxuICAgIGlnbm9yZUVsZW1lbnRzKCksXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW3BhY2thZ2UtbWdyLmluZGV4XScsIGVyci5zdGFjayA/IGVyci5zdGFjayA6IGVycik7XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihlcnIpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQYWNrYWdlc1N0YXRlPiB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZUtleShwYXRoOiBzdHJpbmcpIHtcbiAgbGV0IHJlbCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwcmogb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocGF0aFRvUHJvaktleShwcmopKTtcbiAgICBpZiAocGtnTmFtZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwayA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgeWllbGQgcGs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTGlzdCBsaW5rZWQgcGFja2FnZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlcygpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGxldCBpID0gMDtcbiAgZm9yIChjb25zdCB7bmFtZX0gb2YgYWxsUGFja2FnZXMoJyonLCAnc3JjJykpIHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocGogPT4gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gZG9MaXN0SW5zdGFsbGVkQ29tcDRXb3Jrc3BhY2UoZ2V0U3RhdGUoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAoKGZ1bmN0aW9uKigpOiBHZW5lcmF0b3I8W3N0cmluZywgUGFja2FnZUluZm9dPiB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dFbnRyeSkge1xuICAgICAgeWllbGQgW3BrLm5hbWUsIHBrXTtcbiAgICB9XG4gIH0pKCkpO1xuICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyA9IGluc3RhbGxlZCk7XG4gIF9vblJlbGF0ZWRQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG59XG5cbi8qKlxuICogRGVsZXRlIHdvcmtzcGFjZSBzdGF0ZSBpZiBpdHMgZGlyZWN0b3J5IGRvZXMgbm90IGV4aXN0XG4gKi9cbmZ1bmN0aW9uIGNoZWNrQWxsV29ya3NwYWNlcygpIHtcbiAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGtleSk7XG4gICAgaWYgKCFmcy5leGlzdHNTeW5jKGRpcikpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYFdvcmtzcGFjZSAke2tleX0gZG9lcyBub3QgZXhpc3QgYW55bW9yZS5gKTtcbiAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5kZWxldGUoa2V5KSk7XG4gICAgfVxuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KGNyZWF0ZUhvb2sgPSBmYWxzZSkge1xuICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgZnMubWtkaXJwU3luYyhkaXN0RGlyKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLFxuICAgICAgJ2dpdGlnbm9yZS50eHQnKSwgZ2V0Um9vdERpcigpICsgJy8uZ2l0aWdub3JlJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICAvLyBmcy5ta2RpcnBTeW5jKHN5bWxpbmtEaXIpO1xuXG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuXG4gIGlmIChjcmVhdGVIb29rKSB7XG4gICAgcHJvamVjdERpcnMuZm9yRWFjaChwcmpkaXIgPT4ge1xuICAgICAgX3dyaXRlR2l0SG9vayhwcmpkaXIpO1xuICAgICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzbGludC5qc29uJyksIHByamRpciArICcvdHNsaW50Lmpzb24nKTtcbiAgICB9KTtcbiAgfVxuXG4gIGF3YWl0IF9zY2FuUGFja2FnZUFuZExpbmsoKTtcbiAgYXdhaXQgX2RlbGV0ZVVzZWxlc3NTeW1saW5rKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKSwgbmV3IFNldDxzdHJpbmc+KCkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiB3cml0ZUNvbmZpZ0ZpbGVzKCkge1xuICByZXR1cm4gKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnd3JpdGUgY29uZmlnIGZpbGU6JywgZmlsZSk7XG4gICAgd3JpdGVGaWxlKFBhdGguam9pbihkaXN0RGlyLCBmaWxlKSxcbiAgICAgICdcXG4jIERPIE5PVCBNT0RJRklZIFRISVMgRklMRSFcXG4nICsgY29uZmlnQ29udGVudCk7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3cy5pZCk7XG4gIHRyeSB7XG4gICAgYXdhaXQgaW5zdGFsbEluRGlyKGRpciwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsIHdzLmluc3RhbGxKc29uU3RyKTtcbiAgfSBjYXRjaCAoZXgpIHtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICBjb25zdCB3c2QgPSBkLndvcmtzcGFjZXMuZ2V0KHdzLmlkKSE7XG4gICAgICB3c2QuaW5zdGFsbEpzb25TdHIgPSAnJztcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIHdzZC5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgIGNvbnN0IGxvY2tGaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UtbG9jay5qc29uJyk7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhsb2NrRmlsZSkpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGBbaW5pdF0gcHJvYmxlbWF0aWMgJHtsb2NrRmlsZX0gaXMgZGVsZXRlZCwgcGxlYXNlIHRyeSBhZ2FpbmApO1xuICAgICAgICBmcy51bmxpbmtTeW5jKGxvY2tGaWxlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEluRGlyKGRpcjogc3RyaW5nLCBvcmlnaW5Qa2dKc29uU3RyOiBzdHJpbmcsIHRvSW5zdGFsbFBrZ0pzb25TdHI6IHN0cmluZykge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyBkaXIpO1xuICB0cnkge1xuICAgIGF3YWl0IGNvcHlOcG1yY1RvV29ya3NwYWNlKGRpcik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKGUpO1xuICB9XG4gIGNvbnN0IHN5bWxpbmtzSW5Nb2R1bGVEaXIgPSBbXSBhcyB7Y29udGVudDogc3RyaW5nLCBsaW5rOiBzdHJpbmd9W107XG5cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgIGZzLm1rZGlycFN5bmModGFyZ2V0KTtcbiAgfVxuXG4gIC8vIDEuIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgLy8gYmFja3VwIHRoZW0gZm9yIGxhdGUgcmVjb3ZlcnlcbiAgYXdhaXQgbGlzdE1vZHVsZVN5bWxpbmtzKHRhcmdldCwgbGluayA9PiB7XG4gICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgfSk7XG5cbiAgLy8gMi4gUnVuIGBucG0gaW5zdGFsbGBcbiAgY29uc3QgaW5zdGFsbEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ1tpbml0XSB3cml0ZScsIGluc3RhbGxKc29uRmlsZSk7XG4gIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCB0b0luc3RhbGxQa2dKc29uU3RyLCAndXRmOCcpO1xuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHByb2Nlc3MubmV4dFRpY2socmVzb2x2ZSkpO1xuICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuICB0cnkge1xuICAgIGNvbnN0IGVudiA9IHsuLi5wcm9jZXNzLmVudiwgTk9ERV9FTlY6ICdkZXZlbG9wbWVudCd9O1xuICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7XG4gICAgICBjd2Q6IGRpcixcbiAgICAgIGVudiAvLyBGb3JjZSBkZXZlbG9wbWVudCBtb2RlLCBvdGhlcndpc2UgXCJkZXZEZXBlbmRlbmNpZXNcIiB3aWxsIG5vdCBiZSBpbnN0YWxsZWRcbiAgICB9KS5wcm9taXNlO1xuICAgIC8vIFwibnBtIGRkcFwiIHJpZ2h0IGFmdGVyIFwibnBtIGluc3RhbGxcIiB3aWxsIGNhdXNlIGRldkRlcGVuZGVuY2llcyBiZWluZyByZW1vdmVkIHNvbWVob3csIGRvbid0IGtub3duXG4gICAgLy8gd2h5LCBJIGhhdmUgdG8gYWRkIGEgcHJvY2Vzcy5uZXh0VGljaygpIGJldHdlZW4gdGhlbSB0byB3b3JrYXJvdW5kXG4gICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcbiAgICBhd2FpdCBleGUoJ25wbScsICdkZHAnLCB7Y3dkOiBkaXIsIGVudn0pLnByb21pc2U7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjaGFsay5yZWQoJ1tpbml0XSBGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnKSwgZS5zdGFjayk7XG4gICAgdGhyb3cgZTtcbiAgfSBmaW5hbGx5IHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnUmVjb3ZlciAnICsgaW5zdGFsbEpzb25GaWxlKTtcbiAgICAvLyAzLiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlU3luYyhpbnN0YWxsSnNvbkZpbGUsIG9yaWdpblBrZ0pzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIHJldHVybiBfc3ltbGlua0FzeW5jKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb3B5TnBtcmNUb1dvcmtzcGFjZSh3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnLm5wbXJjJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHRhcmdldCkpXG4gICAgcmV0dXJuO1xuICBjb25zdCBpc0NoaW5hID0gYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgIG1hcChzID0+IHMuaXNJbkNoaW5hKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIGZpbHRlcihjbiA9PiBjbiAhPSBudWxsKSxcbiAgICAgIHRha2UoMSlcbiAgICApLnRvUHJvbWlzZSgpO1xuXG4gIGlmIChpc0NoaW5hKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ2NyZWF0ZSAubnBtcmMgdG8nLCB0YXJnZXQpO1xuICAgIGZzLmNvcHlGaWxlU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL25wbXJjLWZvci1jbi50eHQnKSwgdGFyZ2V0KTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBfc2NhblBhY2thZ2VBbmRMaW5rKCkge1xuICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuXG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBjb25zdCBwa2dMaXN0OiBQYWNrYWdlSW5mb1tdID0gW107XG4gIGF3YWl0IHJtLnNjYW5QYWNrYWdlcygpLnBpcGUoXG4gICAgdGFwKChbcHJvaiwganNvbkZpbGVdKSA9PiB7XG4gICAgICBpZiAoIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICBwcm9qUGtnTWFwLnNldChwcm9qLCBbXSk7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8oanNvbkZpbGUsIGZhbHNlKTtcbiAgICAgIHBrZ0xpc3QucHVzaChpbmZvKTtcbiAgICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICAgIH0pXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgZm9yIChjb25zdCBbcHJqLCBwa2dzXSBvZiBwcm9qUGtnTWFwLmVudHJpZXMoKSkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gIH1cbiAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY0xpbmtlZFBhY2thZ2VzKHBrZ0xpc3QpO1xuICAvLyBfY3JlYXRlU3ltbGlua3MoKTtcbn1cblxuLy8gZnVuY3Rpb24gX2NyZWF0ZVN5bWxpbmtzJCgpIHtcbi8vICAgY29uc3Qgb2JzTGlzdDogT2JzZXJ2YWJsZTx2b2lkPltdID0gW107XG4vLyAgIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbi8vICAgICBvYnNMaXN0LnB1c2goX2NyZWF0ZVN5bWxpbmtzRm9yV29ya3NwYWNlKGtleSkpO1xuLy8gICB9XG4vLyAgIHJldHVybiBtZXJnZSguLi5vYnNMaXN0KS5waXBlKGNvdW50KCkpO1xuLy8gfVxuXG5mdW5jdGlvbiBfY3JlYXRlU3ltbGlua3NGb3JXb3Jrc3BhY2Uod3NLZXk6IHN0cmluZykge1xuICBjb25zdCBzeW1saW5rRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd3NLZXksICcubGlua3MnKTtcbiAgZnMubWtkaXJwU3luYyhzeW1saW5rRGlyKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSB3cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSlcbiAgLmNvbmNhdCh3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGl0ZW0gPT4gaXRlbVswXSkpO1xuXG4gIGNvbnN0IHBrZ05hbWVTZXQgPSBuZXcgU2V0KHBrZ05hbWVzKTtcbiAgaWYgKHdzLmluc3RhbGxlZENvbXBvbmVudHMpIHtcbiAgICBmb3IgKGNvbnN0IHBuYW1lIG9mIHdzLmluc3RhbGxlZENvbXBvbmVudHMua2V5cygpKVxuICAgICAgcGtnTmFtZVNldC5hZGQocG5hbWUpO1xuICB9XG4gIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlR2l0SWdub3Jlcyh7XG4gICAgZmlsZTogUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJy5naXRpZ25vcmUnKSxcbiAgICBsaW5lczogW1BhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBzeW1saW5rRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyldfSk7XG4gIHJldHVybiBtZXJnZShcbiAgICBmcm9tKHBrZ05hbWVzLm1hcChuYW1lID0+IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KG5hbWUpIHx8IHdzLmluc3RhbGxlZENvbXBvbmVudHMhLmdldChuYW1lKSEpKVxuICAgIC5waXBlKFxuICAgICAgc3ltYm9saWNMaW5rUGFja2FnZXMoc3ltbGlua0RpcilcbiAgICApLFxuICAgIGZyb20oX2RlbGV0ZVVzZWxlc3NTeW1saW5rKHN5bWxpbmtEaXIsIHBrZ05hbWVTZXQpKVxuICApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfZGVsZXRlVXNlbGVzc1N5bWxpbmsoY2hlY2tEaXI6IHN0cmluZywgZXhjbHVkZVNldDogU2V0PHN0cmluZz4pIHtcbiAgY29uc3QgZG9uZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuICBjb25zdCBkcmNwTmFtZSA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEubmFtZSA6IG51bGw7XG4gIGNvbnN0IGRvbmUxID0gbGlzdE1vZHVsZVN5bWxpbmtzKGNoZWNrRGlyLCBhc3luYyBsaW5rID0+IHtcbiAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShjaGVja0RpciwgbGluaykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIGlmICggZHJjcE5hbWUgIT09IHBrZ05hbWUgJiYgIWV4Y2x1ZGVTZXQuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdyhgRGVsZXRlIGV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApKTtcbiAgICAgIGNvbnN0IGRvbmUgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzLCByZWopID0+IHtcbiAgICAgICAgZnMudW5saW5rKGxpbmssIChlcnIpID0+IHsgaWYgKGVycikgcmV0dXJuIHJlaihlcnIpOyBlbHNlIHJlcygpO30pO1xuICAgICAgfSk7XG4gICAgICBkb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGRvbmUxO1xuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkID0gZmFsc2UsXG4gIHN5bUxpbmtQYXJlbnREaXI/OiBzdHJpbmcpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgcmV0dXJuIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZSwganNvbiwgaXNJbnN0YWxsZWQsIHN5bUxpbmtQYXJlbnREaXIpO1xufVxuLyoqXG4gKiBMaXN0IHRob3NlIGluc3RhbGxlZCBwYWNrYWdlcyB3aGljaCBhcmUgcmVmZXJlbmNlZCBieSB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGUsXG4gKiB0aG9zZSBwYWNrYWdlcyBtdXN0IGhhdmUgXCJkclwiIHByb3BlcnR5IGluIHBhY2thZ2UuanNvbiBcbiAqIEBwYXJhbSB3b3Jrc3BhY2VLZXkgXG4gKi9cbmZ1bmN0aW9uKiBkb0xpc3RJbnN0YWxsZWRDb21wNFdvcmtzcGFjZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgd29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgb3JpZ2luSW5zdGFsbEpzb24gPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgLy8gY29uc3QgZGVwSnNvbiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgPyBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzXSA6XG4gIC8vICAgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXTtcbiAgZm9yIChjb25zdCBkZXBzIG9mIFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIG9yaWdpbkluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llc10pIHtcbiAgICBpZiAoZGVwcyA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgIGlmICghc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcCkgJiYgZGVwICE9PSAnQHdmaC9wbGluaycpIHtcbiAgICAgICAgY29uc3QgcGtqc29uRmlsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwa2pzb25GaWxlKSkge1xuICAgICAgICAgIGNvbnN0IHBrID0gY3JlYXRlUGFja2FnZUluZm8oXG4gICAgICAgICAgICBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3b3Jrc3BhY2VLZXksICdub2RlX21vZHVsZXMnLCBkZXAsICdwYWNrYWdlLmpzb24nKSwgdHJ1ZSxcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdvcmtzcGFjZUtleSwgJy5saW5rcycpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAocGsuanNvbi5kcikge1xuICAgICAgICAgICAgeWllbGQgcGs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZTogc3RyaW5nLCBqc29uOiBhbnksIGlzSW5zdGFsbGVkID0gZmFsc2UsXG4gIHN5bUxpbmtQYXJlbnREaXI/OiBzdHJpbmcpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG0gPSBtb2R1bGVOYW1lUmVnLmV4ZWMoanNvbi5uYW1lKTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBzaG9ydE5hbWU6IG0hWzJdLFxuICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICBzY29wZTogbSFbMV0sXG4gICAgcGF0aDogc3ltTGlua1BhcmVudERpciA/IFBhdGgucmVzb2x2ZShzeW1MaW5rUGFyZW50RGlyLCBqc29uLm5hbWUpIDogUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpLFxuICAgIGpzb24sXG4gICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGtKc29uRmlsZSkpLFxuICAgIGlzSW5zdGFsbGVkXG4gIH07XG4gIHJldHVybiBwa0luZm87XG59XG5cbmZ1bmN0aW9uIGNwKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoXy5zdGFydHNXaXRoKGZyb20sICctJykpIHtcbiAgICBmcm9tID0gYXJndW1lbnRzWzFdO1xuICAgIHRvID0gYXJndW1lbnRzWzJdO1xuICB9XG4gIGZzLmNvcHlTeW5jKGZyb20sIHRvKTtcbiAgLy8gc2hlbGwuY3AoLi4uYXJndW1lbnRzKTtcbiAgaWYgKC9bL1xcXFxdJC8udGVzdCh0bykpXG4gICAgdG8gPSBQYXRoLmJhc2VuYW1lKGZyb20pOyAvLyB0byBpcyBhIGZvbGRlclxuICBlbHNlXG4gICAgdG8gPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRvKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdjb3B5IHRvICVzJywgY2hhbGsuY3lhbih0bykpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGZyb20gYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IHRvIHJlbGF0aXZlIHRvIHJvb3RQYXRoIFxuICovXG5mdW5jdGlvbiBtYXliZUNvcHlUZW1wbGF0ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuZnVuY3Rpb24gX3dyaXRlR2l0SG9vayhwcm9qZWN0OiBzdHJpbmcpIHtcbiAgLy8gaWYgKCFpc1dpbjMyKSB7XG4gIGNvbnN0IGdpdFBhdGggPSBQYXRoLnJlc29sdmUocHJvamVjdCwgJy5naXQvaG9va3MnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCkpIHtcbiAgICBjb25zdCBob29rU3RyID0gJyMhL2Jpbi9zaFxcbicgK1xuICAgICAgYGNkIFwiJHtnZXRSb290RGlyKCl9XCJcXG5gICtcbiAgICAgIC8vICdkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICducHggcHJldHR5LXF1aWNrIC0tc3RhZ2VkXFxuJyArIC8vIFVzZSBgdHNsaW50IC0tZml4YCBpbnN0ZWFkLlxuICAgICAgYHBsaW5rIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG5cbmZ1bmN0aW9uIGRlbGV0ZUR1cGxpY2F0ZWRJbnN0YWxsZWRQa2cod29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NTdGF0ZSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KSE7XG4gIGNvbnN0IGRvTm90aGluZyA9ICgpID0+IHt9O1xuICB3c1N0YXRlLmxpbmtlZERlcGVuZGVuY2llcy5jb25jYXQod3NTdGF0ZS5saW5rZWREZXZEZXBlbmRlbmNpZXMpLm1hcCgoW3BrZ05hbWVdKSA9PiB7XG4gICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgcGtnTmFtZSk7XG4gICAgcmV0dXJuIGZzLnByb21pc2VzLmxzdGF0KGRpcilcbiAgICAudGhlbigoc3RhdCkgPT4ge1xuICAgICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGBbaW5pdF0gUHJldmlvdXMgaW5zdGFsbGVkICR7UGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksZGlyKX0gaXMgZGVsZXRlZCwgZHVlIHRvIGxpbmtlZCBwYWNrYWdlICR7cGtnTmFtZX1gKTtcbiAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLnVubGluayhkaXIpO1xuICAgICAgfVxuICAgIH0pXG4gICAgLmNhdGNoKGRvTm90aGluZyk7XG4gIH0pO1xufVxuIl19