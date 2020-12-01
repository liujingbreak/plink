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
exports.createPackageInfo = exports.isCwdWorkspace = exports.getProjectList = exports.listPackages = exports.getPackagesOfProjects = exports.workspaceKey = exports.pathToProjKey = exports.getStore = exports.getState = exports.onLinkedPackageAdded = exports.updateGitIgnores = exports.actionDispatcher = exports.slice = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const operators_2 = require("rxjs/operators");
const utils_1 = require("../cmd/utils");
const config_1 = __importDefault(require("../config"));
const dependency_hoister_1 = require("../dependency-hoister");
const editor_helper_1 = require("../editor-helper");
const log_config_1 = __importDefault(require("../log-config"));
const package_list_helper_1 = require("./package-list-helper");
const process_utils_1 = require("../process-utils");
const process_utils_2 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
const misc_1 = require("../utils/misc");
const symlinks_1 = __importStar(require("../utils/symlinks"));
const os_1 = require("os");
const { symlinkDir } = JSON.parse(process.env.__plink);
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    inited: false,
    workspaces: new Map(),
    project2Packages: new Map(),
    srcPackages: new Map(),
    gitIgnores: {},
    linkedDrcp: misc_1.isDrcpSymlink ?
        createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), 'node_modules/@wfh/plink/package.json'), false, misc_1.getRootDir())
        : null,
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
            const { hoisted: hoistedDeps, hoistedPeers: hoistPeerDepInfo } = dependency_hoister_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages.get(entry[0]).json), wsKey, updatingDeps, state.srcPackages);
            const { hoisted: hoistedDevDeps, hoistedPeers: devHoistPeerDepInfo } = dependency_hoister_1.listCompDependency(linkedDevDependencies.map(entry => state.srcPackages.get(entry[0]).json), wsKey, updatingDevDeps, state.srcPackages);
            const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: Array.from(hoistedDeps.entries()).reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}), devDependencies: Array.from(hoistedDevDeps.entries()).reduce((dic, [name, info]) => {
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
        _relatedPackageUpdated(d, { payload: workspaceKey }) { },
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
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    const pkgTsconfigForEditorRequestMap = new Set();
    const packageAddedList = new Array();
    return rxjs_1.merge(getStore().pipe(operators_2.map(s => s.project2Packages), operators_2.distinctUntilChanged(), operators_2.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
        return pks;
    }), operators_2.ignoreElements()), getStore().pipe(operators_2.map(s => s.srcPackages), operators_2.distinctUntilChanged(), operators_2.scan((prevMap, currMap) => {
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
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateWorkspace), operators_2.switchMap(({ payload: { dir, isForce } }) => {
        dir = path_1.default.resolve(dir);
        exports.actionDispatcher.setCurrentWorkspace(dir);
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/app-template.js'), path_1.default.resolve(dir, 'app.js'));
        checkAllWorkspaces();
        if (!isForce) {
            // call initRootDirectory(),
            // only call _hoistWorkspaceDeps when "srcPackages" state is changed by action `_syncLinkedPackages`
            return rxjs_1.merge(rxjs_1.defer(() => rxjs_1.of(initRootDirectory())), 
            // wait for _syncLinkedPackages finish
            getStore().pipe(operators_2.distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages), operators_2.skip(1), operators_2.take(1), operators_2.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
        }
        else {
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
            // call initRootDirectory() and wait for it finished by observe action '_syncLinkedPackages',
            // then call _hoistWorkspaceDeps
            return rxjs_1.merge(rxjs_1.defer(() => rxjs_1.of(initRootDirectory())), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncLinkedPackages), operators_2.take(1), operators_2.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir }))));
        }
    }), operators_2.ignoreElements()), 
    // initRootDir
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_2.map(({ payload }) => {
        checkAllWorkspaces();
        if (getState().workspaces.has(workspaceKey(process.cwd()))) {
            exports.actionDispatcher.updateWorkspace({ dir: process.cwd(), isForce: payload.isForce });
        }
        else {
            const curr = getState().currWorkspace;
            if (curr != null) {
                if (getState().workspaces.has(curr)) {
                    const path = path_1.default.resolve(misc_1.getRootDir(), curr);
                    exports.actionDispatcher.updateWorkspace({ dir: path, isForce: payload.isForce });
                }
                else {
                    exports.actionDispatcher.setCurrentWorkspace(null);
                }
            }
        }
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_2.map(({ payload }) => {
        const wsKey = workspaceKey(payload.dir);
        exports.actionDispatcher._relatedPackageUpdated(wsKey);
        setImmediate(() => exports.actionDispatcher.workspaceStateUpdated());
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.updateDir), operators_2.concatMap(() => rxjs_1.defer(() => rxjs_1.from(_scanPackageAndLink().then(() => {
        for (const key of getState().workspaces.keys()) {
            updateInstalledPackageForWorkspace(key);
        }
    }))))), 
    // Handle newly added workspace
    getStore().pipe(operators_2.map(s => s.workspaces), operators_2.distinctUntilChanged(), operators_2.map(ws => {
        const keys = Array.from(ws.keys());
        return keys;
    }), operators_2.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            console.log('New workspace: ', newAdded);
            for (const ws of newAdded) {
                exports.actionDispatcher._installWorkspace({ workspaceKey: ws });
            }
        }
        return curr;
    }), operators_2.ignoreElements()), ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(operators_2.filter(s => s.workspaces.has(key)), operators_2.map(s => s.workspaces.get(key)), operators_2.distinctUntilChanged((s1, s2) => s1.installJson === s2.installJson), operators_2.scan((old, newWs) => {
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
        }), operators_2.ignoreElements());
    }), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_2.concatMap(action => {
        const wsKey = action.payload.workspaceKey;
        return getStore().pipe(operators_2.map(s => s.workspaces.get(wsKey)), operators_2.distinctUntilChanged(), operators_2.filter(ws => ws != null), operators_2.take(1), operators_2.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_2.map(() => {
            updateInstalledPackageForWorkspace(wsKey);
        }));
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._relatedPackageUpdated), operators_2.map(action => pkgTsconfigForEditorRequestMap.add(action.payload)), operators_2.debounceTime(800), operators_2.concatMap(() => {
        const dones = Array.from(pkgTsconfigForEditorRequestMap.values()).map(wsKey => {
            editor_helper_1.updateTsconfigFileForEditor(wsKey);
            return collectDtsFiles(wsKey);
        });
        return rxjs_1.from(Promise.all(dones));
    }), operators_2.map(() => __awaiter(void 0, void 0, void 0, function* () {
        pkgTsconfigForEditorRequestMap.clear();
        yield writeConfigFiles();
        exports.actionDispatcher.packagesUpdated();
    }))), getStore().pipe(operators_2.map(s => s.gitIgnores), operators_2.distinctUntilChanged(), operators_2.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_2.distinctUntilChanged(), operators_2.debounceTime(500), operators_2.switchMap(() => {
        return rxjs_1.merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(operators_2.map(s => s.gitIgnores[file]), operators_2.distinctUntilChanged(), operators_2.skip(1), operators_2.map(lines => {
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
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_2.concatMap(() => rxjs_1.from(_scanPackageAndLink())), operators_2.ignoreElements())).pipe(operators_2.ignoreElements(), operators_2.catchError(err => {
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
    exports.actionDispatcher._relatedPackageUpdated(wsKey);
}
/**
 * Create sub directory "types" under current workspace
 * @param wsKey
 */
function collectDtsFiles(wsKey) {
    const wsTypesDir = path_1.default.resolve(misc_1.getRootDir(), wsKey, 'types');
    fs_extra_1.default.mkdirpSync(wsTypesDir);
    const mergeTds = new Map();
    for (const pkg of package_list_helper_1.packages4WorkspaceKey(wsKey)) {
        if (pkg.json.dr.mergeTds) {
            const file = pkg.json.dr.mergeTds;
            if (typeof file === 'string') {
                mergeTds.set(pkg.shortName + '-' + path_1.default.basename(file), path_1.default.resolve(pkg.realPath, file));
            }
            else if (Array.isArray(file)) {
                for (const f of file)
                    mergeTds.set(pkg.shortName + '-' + path_1.default.basename(f), path_1.default.resolve(pkg.realPath, f));
            }
        }
    }
    // console.log(mergeTds);
    for (const chrFileName of fs_extra_1.default.readdirSync(wsTypesDir)) {
        if (!mergeTds.has(chrFileName)) {
            //   mergeTds.delete(chrFileName);
            // } else {
            const useless = path_1.default.resolve(wsTypesDir, chrFileName);
            fs_extra_1.default.unlink(useless);
            // tslint:disable-next-line: no-console
            console.log('Delete', useless);
        }
    }
    const done = new Array(mergeTds.size);
    let i = 0;
    for (const dts of mergeTds.keys()) {
        const target = mergeTds.get(dts);
        const absDts = path_1.default.resolve(wsTypesDir, dts);
        // tslint:disable-next-line: no-console
        // console.log(`Create symlink ${absDts} --> ${target}`);
        done[i++] = symlinks_1.symlinkAsync(target, absDts);
    }
    return Promise.all(done);
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
// async function updateLinkedPackageState() {
//   const jsonStrs = await Promise.all(
//     Array.from(getState().srcPackages.entries())
//     .map(([name, pkInfo]) => {
//       return readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8');
//     })
//   );
//   deleteUselessSymlink();
//   actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
// }
function deleteUselessSymlink() {
    return __awaiter(this, void 0, void 0, function* () {
        const dones = [];
        const checkDir = path_1.default.resolve(misc_1.getRootDir(), 'node_modules');
        const srcPackages = getState().srcPackages;
        const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
        const done1 = symlinks_1.listModuleSymlinks(checkDir, (link) => __awaiter(this, void 0, void 0, function* () {
            const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
            if (drcpName !== pkgName && !srcPackages.has(pkgName)) {
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
        // const pwd = process.cwd();
        // const forbidDir = Path.join(getRootDir(), 'node_modules');
        // if (symlinkDir !== forbidDir) {
        //   const removed: Promise<any>[] = [];
        //   const done2 = listModuleSymlinks(forbidDir, async link => {
        //     const pkgName = Path.relative(forbidDir, link).replace(/\\/g, '/');
        //     if (srcPackages.has(pkgName)) {
        //       removed.push(unlinkAsync(link));
        //       // tslint:disable-next-line: no-console
        //       console.log(`Redundant symlink "${Path.relative(pwd, link)}" removed.`);
        //     }
        //   });
        //   return Promise.all([done1, done2, ...removed]);
        // }
    });
}
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = misc_1.getRootDir();
        fs_extra_1.default.mkdirpSync(path_1.default.join(rootPath, 'dist'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/config.local-template.yaml'), path_1.default.join(rootPath, 'dist', 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'module-resolve.server.tmpl.ts'), rootPath + '/module-resolve.server.ts');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'gitignore.txt'), misc_1.getRootDir() + '/.gitignore');
        yield symlinks_1.default();
        if (!fs_extra_1.default.existsSync(path_1.default.join(rootPath, 'logs')))
            fs_extra_1.default.mkdirpSync(path_1.default.join(rootPath, 'logs'));
        fs_extra_1.default.mkdirpSync(symlinkDir);
        log_config_1.default(config_1.default());
        const projectDirs = getProjectList();
        projectDirs.forEach(prjdir => {
            _writeGitHook(prjdir);
            maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
        });
        yield _scanPackageAndLink();
        yield deleteUselessSymlink();
        // await writeConfigFiles();
    });
}
function writeConfigFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            // tslint:disable-next-line: no-console
            console.log('write config file:', file);
            utils_1.writeFile(path_1.default.resolve(misc_1.getRootDir(), 'dist', file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
    });
}
function installWorkspace(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.resolve(misc_1.getRootDir(), ws.id);
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
        fs_extra_1.default.writeFileSync(installJsonFile, ws.installJsonStr, 'utf8');
        yield new Promise(resolve => setTimeout(resolve, 5000));
        try {
            yield process_utils_2.exe('npm', 'install', { cwd: dir }).promise;
            yield process_utils_2.exe('npm', 'dedupe', { cwd: dir }).promise;
        }
        catch (e) {
            // tslint:disable-next-line: no-console
            console.log('Failed to install dependencies', e.stack);
            throw e;
        }
        finally {
            // tslint:disable-next-line: no-console
            console.log('Recover ' + installJsonFile);
            // 3. Recover package.json and symlinks deleted in Step.1.
            fs_extra_1.default.writeFileSync(installJsonFile, ws.originInstallJsonStr, 'utf8');
            yield recoverSymlinks();
        }
        function recoverSymlinks() {
            return Promise.all(symlinksInModuleDir.map(({ content, link }) => {
                return symlinks_1._symlinkAsync(content, link, symlinks_1.isWin32 ? 'junction' : 'dir');
            }));
        }
    });
}
function copyNpmrcToWorkspace(wsdir) {
    return __awaiter(this, void 0, void 0, function* () {
        const target = path_1.default.resolve(wsdir, '.npmrc');
        if (fs_extra_1.default.existsSync(target))
            return;
        const isChina = yield getStore().pipe(operators_2.map(s => s.isInChina), operators_2.distinctUntilChanged(), operators_2.filter(cn => cn != null), operators_2.take(1)).toPromise();
        if (isChina) {
            // tslint:disable-next-line: no-console
            console.log('create .npmrc to', target);
            fs_extra_1.default.copyFileSync(path_1.default.resolve(__dirname, '../../../.npmrc'), target);
        }
    });
}
function _scanPackageAndLink() {
    return __awaiter(this, void 0, void 0, function* () {
        const rm = (yield Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
        const projPkgMap = new Map();
        const pkgList = [];
        // const symlinksDir = Path.resolve(getRootDir(), 'node_modules');
        yield rm.linkComponentsAsync(symlinkDir).pipe(operators_1.tap(({ proj, jsonFile, json }) => {
            if (!projPkgMap.has(proj))
                projPkgMap.set(proj, []);
            const info = createPackageInfoWithJson(jsonFile, json, false, symlinkDir);
            pkgList.push(info);
            projPkgMap.get(proj).push(info);
        })).toPromise();
        for (const [prj, pkgs] of projPkgMap.entries()) {
            exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
        }
        exports.actionDispatcher._syncLinkedPackages(pkgList);
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
                    const pk = createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUF5RDtBQUV6RCw4Q0FBbUM7QUFDbkMsOENBQ2tGO0FBQ2xGLHdDQUF5QztBQUN6Qyx1REFBK0I7QUFDL0IsOERBQTZGO0FBQzdGLG9EQUErRDtBQUMvRCwrREFBc0M7QUFDdEMsK0RBQTJFO0FBQzNFLG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQWtEO0FBQ2xELG9DQUF5RDtBQUN6RCx3Q0FBMEQ7QUFDMUQsOERBQWdJO0FBSWhJLDJCQUF5QjtBQTZCekIsTUFBTSxFQUFDLFVBQVUsRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUVsRSxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUM7QUFDdEIsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsTUFBTSxLQUFLLEdBQWtCO0lBQzNCLE1BQU0sRUFBRSxLQUFLO0lBQ2IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLFVBQVUsRUFBRSxvQkFBYSxDQUFDLENBQUM7UUFDekIsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FDNUIsaUJBQVUsRUFBRSxFQUFFLHNDQUFzQyxDQUFDLEVBQUUsS0FBSyxFQUFFLGlCQUFVLEVBQUUsQ0FBQztRQUM3RSxDQUFDLENBQUMsSUFBSTtJQUNSLHVCQUF1QixFQUFFLENBQUM7SUFDMUIsc0JBQXNC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USxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDL0QsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDO1lBQ3hDLGtCQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztRQUNyQyxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGtCQUFPLEVBQUU7WUFDWixxQkFBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlEO0tBQ0Y7SUFDRCxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mLCBkZWZlciwgdGhyb3dFcnJvcn0gZnJvbSAncnhqcyc7XG5pbXBvcnQge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBkZWJvdW5jZVRpbWUsXG4gIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9jbWQvdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiwgRGVwZW5kZW50SW5mbyB9IGZyb20gJy4uL2RlcGVuZGVuY3ktaG9pc3Rlcic7XG5pbXBvcnQgeyB1cGRhdGVUc2NvbmZpZ0ZpbGVGb3JFZGl0b3IgfSBmcm9tICcuLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgeyBhbGxQYWNrYWdlcywgcGFja2FnZXM0V29ya3NwYWNlS2V5IH0gZnJvbSAnLi9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IHNldFByb2plY3RMaXN0fSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGdldFJvb3REaXIsIGlzRHJjcFN5bWxpbmsgfSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBsaXN0TW9kdWxlU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jLCBzeW1saW5rQXN5bmMgfSBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG4vLyBpbXBvcnQgeyBhY3Rpb25zIGFzIF9jbGVhbkFjdGlvbnMgfSBmcm9tICcuLi9jbWQvY2xpLWNsZWFuJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5cbmltcG9ydCB7IEVPTCB9IGZyb20gJ29zJztcbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjb3BlOiBzdHJpbmc7XG4gIHNob3J0TmFtZTogc3RyaW5nO1xuICBqc29uOiBhbnk7XG4gIHBhdGg6IHN0cmluZztcbiAgcmVhbFBhdGg6IHN0cmluZztcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIGluaXRlZDogYm9vbGVhbjtcbiAgc3JjUGFja2FnZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLyoqIEtleSBpcyByZWxhdGl2ZSBwYXRoIHRvIHJvb3Qgd29ya3NwYWNlICovXG4gIHdvcmtzcGFjZXM6IE1hcDxzdHJpbmcsIFdvcmtzcGFjZVN0YXRlPjtcbiAgLyoqIGtleSBvZiBjdXJyZW50IFwid29ya3NwYWNlc1wiICovXG4gIGN1cnJXb3Jrc3BhY2U/OiBzdHJpbmcgfCBudWxsO1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIGxpbmtlZERyY3A6IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgZ2l0SWdub3Jlczoge1tmaWxlOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIGlzSW5DaGluYT86IGJvb2xlYW47XG4gIC8qKiBFdmVyeXRpbWUgYSBob2lzdCB3b3Jrc3BhY2Ugc3RhdGUgY2FsY3VsYXRpb24gaXMgYmFzaWNhbGx5IGRvbmUsIGl0IGlzIGluY3JlYXNlZCBieSAxICovXG4gIHdvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtOiBudW1iZXI7XG4gIHBhY2thZ2VzVXBkYXRlQ2hlY2tzdW06IG51bWJlcjtcbiAgLyoqIHdvcmtzcGFjZSBrZXkgKi9cbiAgbGFzdENyZWF0ZWRXb3Jrc3BhY2U/OiBzdHJpbmc7XG59XG5cbmNvbnN0IHtzeW1saW5rRGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIGluaXRlZDogZmFsc2UsXG4gIHdvcmtzcGFjZXM6IG5ldyBNYXAoKSxcbiAgcHJvamVjdDJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNQYWNrYWdlczogbmV3IE1hcCgpLFxuICBnaXRJZ25vcmVzOiB7fSxcbiAgbGlua2VkRHJjcDogaXNEcmNwU3ltbGluayA/XG4gICAgY3JlYXRlUGFja2FnZUluZm8oUGF0aC5yZXNvbHZlKFxuICAgICAgZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzL0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJyksIGZhbHNlLCBnZXRSb290RGlyKCkpXG4gICAgOiBudWxsLFxuICB3b3Jrc3BhY2VVcGRhdGVDaGVja3N1bTogMCxcbiAgcGFja2FnZXNVcGRhdGVDaGVja3N1bTogMFxuICAvLyBfY29tcHV0ZWQ6IHtcbiAgLy8gICB3b3Jrc3BhY2VLZXlzOiBbXVxuICAvLyB9XG59O1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZVN0YXRlIHtcbiAgaWQ6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvKiogaW5zdGFsbGVkIERSIGNvbXBvbmVudCBwYWNrYWdlcyBbbmFtZSwgdmVyc2lvbl0qL1xuICBpbnN0YWxsZWRDb21wb25lbnRzPzogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuXG4gIGhvaXN0SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGhvaXN0UGVlckRlcEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xuXG4gIGhvaXN0RGV2SW5mbzogTWFwPHN0cmluZywgRGVwZW5kZW50SW5mbz47XG4gIGhvaXN0RGV2UGVlckRlcEluZm86IE1hcDxzdHJpbmcsIERlcGVuZGVudEluZm8+O1xufVxuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiBOUyxcbiAgaW5pdGlhbFN0YXRlOiBzdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogRG8gdGhpcyBhY3Rpb24gYWZ0ZXIgYW55IGxpbmtlZCBwYWNrYWdlIGlzIHJlbW92ZWQgb3IgYWRkZWQgICovXG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtpc0ZvcmNlOiBib29sZWFufT4pIHt9LFxuXG4gICAgLyoqIENoZWNrIGFuZCBpbnN0YWxsIGRlcGVuZGVuY3ksIGlmIHRoZXJlIGlzIGxpbmtlZCBwYWNrYWdlIHVzZWQgaW4gbW9yZSB0aGFuIG9uZSB3b3Jrc3BhY2UsIFxuICAgICAqIHRvIHN3aXRjaCBiZXR3ZWVuIGRpZmZlcmVudCB3b3Jrc3BhY2UgKi9cbiAgICB1cGRhdGVXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZywgaXNGb3JjZTogYm9vbGVhbn0+KSB7XG4gICAgfSxcbiAgICB1cGRhdGVEaXIoKSB7fSxcbiAgICBfc3luY0xpbmtlZFBhY2thZ2VzKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxQYWNrYWdlSW5mb1tdPikge1xuICAgICAgZC5pbml0ZWQgPSB0cnVlO1xuICAgICAgZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXAoKTtcbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWQpIHtcbiAgICAgICAgZC5zcmNQYWNrYWdlcy5zZXQocGtJbmZvLm5hbWUsIHBrSW5mbyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBvbkxpbmtlZFBhY2thZ2VBZGRlZChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7fSxcbiAgICAvLyBfdXBkYXRlUGFja2FnZVN0YXRlKGQsIHtwYXlsb2FkOiBqc29uc306IFBheWxvYWRBY3Rpb248YW55W10+KSB7XG4gICAgICAvLyAgIGZvciAoY29uc3QganNvbiBvZiBqc29ucykge1xuICAgICAgLy8gICAgIGNvbnN0IHBrZyA9IGQuc3JjUGFja2FnZXMuZ2V0KGpzb24ubmFtZSk7XG4gICAgICAvLyAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAvLyAgICAgICBjb25zb2xlLmVycm9yKFxuICAgICAgLy8gICAgICAgICBgW3BhY2thZ2UtbWdyLmluZGV4XSBwYWNrYWdlIG5hbWUgXCIke2pzb24ubmFtZX1cIiBpbiBwYWNrYWdlLmpzb24gaXMgY2hhbmdlZCBzaW5jZSBsYXN0IHRpbWUsXFxuYCArXG4gICAgICAvLyAgICAgICAgICdwbGVhc2UgZG8gXCJpbml0XCIgYWdhaW4gb24gd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5Jyk7XG4gICAgICAvLyAgICAgICBjb250aW51ZTtcbiAgICAgIC8vICAgICB9XG4gICAgICAvLyAgICAgcGtnLmpzb24gPSBqc29uO1xuICAgICAgLy8gICB9XG4gICAgICAvLyB9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuICAgICAgY29uc3QgcGtqc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IEpTT04ucGFyc2UocGtqc29uU3RyKTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwcyBvZiBbcGtqc29uLmRlcGVuZGVuY2llcywgcGtqc29uLmRldkRlcGVuZGVuY2llc10gYXMge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9W10gKSB7XG4gICAgICAvLyAgIE9iamVjdC5lbnRyaWVzKGRlcHMpO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9KTtcblxuICAgICAgY29uc3QgdXBkYXRpbmdEZXBzID0gey4uLnBranNvbi5kZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGVwZW5kZW5jaWVzOiB0eXBlb2YgZGVwcyA9IFtdO1xuICAgICAgZGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1tfaG9pc3RXb3Jrc3BhY2VEZXBzXSBAd2ZoL3BsaW5rIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snQHdmaC9wbGluayddO1xuICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXZEZXBzWydAd2ZoL3BsaW5rJ107XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBjb25zdCB7aG9pc3RlZDogaG9pc3RlZERlcHMsIGhvaXN0ZWRQZWVyczogaG9pc3RQZWVyRGVwSW5mb30gPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIHdzS2V5LCB1cGRhdGluZ0RlcHMsIHN0YXRlLnNyY1BhY2thZ2VzXG4gICAgICApO1xuXG4gICAgICBjb25zdCB7aG9pc3RlZDogaG9pc3RlZERldkRlcHMsIGhvaXN0ZWRQZWVyczogZGV2SG9pc3RQZWVyRGVwSW5mb30gPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIHdzS2V5LCB1cGRhdGluZ0RldkRlcHMsIHN0YXRlLnNyY1BhY2thZ2VzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSkucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KSxcbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXZEZXBzLmVudHJpZXMoKSkucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KVxuICAgICAgfTtcblxuICAgICAgLy8gY29uc29sZS5sb2coaW5zdGFsbEpzb24pXG4gICAgICAvLyBjb25zdCBpbnN0YWxsZWRDb21wID0gZG9MaXN0SW5zdGFsbGVkQ29tcDRXb3Jrc3BhY2Uoc3RhdGUud29ya3NwYWNlcywgc3RhdGUuc3JjUGFja2FnZXMsIHdzS2V5KTtcblxuICAgICAgY29uc3QgZXhpc3RpbmcgPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgaWQ6IHdzS2V5LFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIGhvaXN0SW5mbzogaG9pc3RlZERlcHMsXG4gICAgICAgIGhvaXN0UGVlckRlcEluZm8sXG4gICAgICAgIGhvaXN0RGV2SW5mbzogaG9pc3RlZERldkRlcHMsXG4gICAgICAgIGhvaXN0RGV2UGVlckRlcEluZm86IGRldkhvaXN0UGVlckRlcEluZm9cbiAgICAgIH07XG4gICAgICBzdGF0ZS5sYXN0Q3JlYXRlZFdvcmtzcGFjZSA9IHdzS2V5O1xuICAgICAgc3RhdGUud29ya3NwYWNlcy5zZXQod3NLZXksIGV4aXN0aW5nID8gT2JqZWN0LmFzc2lnbihleGlzdGluZywgd3ApIDogd3ApO1xuICAgIH0sXG4gICAgX2luc3RhbGxXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IHt3b3Jrc3BhY2VLZXl9fTogUGF5bG9hZEFjdGlvbjx7d29ya3NwYWNlS2V5OiBzdHJpbmd9Pikge1xuICAgICAgLy8gZC5fY29tcHV0ZWQud29ya3NwYWNlS2V5cy5wdXNoKHdvcmtzcGFjZUtleSk7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiBQYWNrYWdlSW5mb1tdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH0sXG4gICAgdXBkYXRlR2l0SWdub3JlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e2ZpbGU6IHN0cmluZywgbGluZXM6IHN0cmluZ1tdfT4pIHtcbiAgICAgIGQuZ2l0SWdub3Jlc1twYXlsb2FkLmZpbGVdID0gcGF5bG9hZC5saW5lcy5tYXAobGluZSA9PiBsaW5lLnN0YXJ0c1dpdGgoJy8nKSA/IGxpbmUgOiAnLycgKyBsaW5lKTtcbiAgICB9LFxuICAgIF9yZWxhdGVkUGFja2FnZVVwZGF0ZWQoZCwge3BheWxvYWQ6IHdvcmtzcGFjZUtleX06IFBheWxvYWRBY3Rpb248c3RyaW5nPikge30sXG4gICAgcGFja2FnZXNVcGRhdGVkKGQpIHtcbiAgICAgIGQucGFja2FnZXNVcGRhdGVDaGVja3N1bSsrO1xuICAgIH0sXG4gICAgc2V0SW5DaGluYShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248Ym9vbGVhbj4pIHtcbiAgICAgIGQuaXNJbkNoaW5hID0gcGF5bG9hZDtcbiAgICB9LFxuICAgIHNldEN1cnJlbnRXb3Jrc3BhY2UoZCwge3BheWxvYWQ6IGRpcn06IFBheWxvYWRBY3Rpb248c3RyaW5nIHwgbnVsbD4pIHtcbiAgICAgIGlmIChkaXIgIT0gbnVsbClcbiAgICAgICAgZC5jdXJyV29ya3NwYWNlID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICBlbHNlXG4gICAgICAgIGQuY3VycldvcmtzcGFjZSA9IG51bGw7XG4gICAgfSxcbiAgICB3b3Jrc3BhY2VTdGF0ZVVwZGF0ZWQoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHZvaWQ+KSB7XG4gICAgICBkLndvcmtzcGFjZVVwZGF0ZUNoZWNrc3VtICs9IDE7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcbmV4cG9ydCBjb25zdCB7dXBkYXRlR2l0SWdub3Jlcywgb25MaW5rZWRQYWNrYWdlQWRkZWR9ID0gYWN0aW9uRGlzcGF0Y2hlcjtcblxuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgY29uc3QgcGtnVHNjb25maWdGb3JFZGl0b3JSZXF1ZXN0TWFwID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHBhY2thZ2VBZGRlZExpc3QgPSBuZXcgQXJyYXk8c3RyaW5nPigpO1xuXG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdExpc3QoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICAgIHJldHVybiBwa3M7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuc3JjUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHNjYW4oKHByZXZNYXAsIGN1cnJNYXApID0+IHtcbiAgICAgICAgcGFja2FnZUFkZGVkTGlzdC5zcGxpY2UoMCk7XG4gICAgICAgIGZvciAoY29uc3Qgbm0gb2YgY3Vyck1hcC5rZXlzKCkpIHtcbiAgICAgICAgICBpZiAoIXByZXZNYXAuaGFzKG5tKSkge1xuICAgICAgICAgICAgcGFja2FnZUFkZGVkTGlzdC5wdXNoKG5tKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhY2thZ2VBZGRlZExpc3QubGVuZ3RoID4gMClcbiAgICAgICAgICBvbkxpbmtlZFBhY2thZ2VBZGRlZChwYWNrYWdlQWRkZWRMaXN0KTtcbiAgICAgICAgcmV0dXJuIGN1cnJNYXA7XG4gICAgICB9KVxuICAgICksXG5cbiAgICAvLyAgdXBkYXRlV29ya3NwYWNlXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLnVwZGF0ZVdvcmtzcGFjZSksXG4gICAgICBzd2l0Y2hNYXAoKHtwYXlsb2FkOiB7ZGlyLCBpc0ZvcmNlfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2V0Q3VycmVudFdvcmtzcGFjZShkaXIpO1xuICAgICAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCBQYXRoLnJlc29sdmUoZGlyLCAnYXBwLmpzJykpO1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKCFpc0ZvcmNlKSB7XG4gICAgICAgICAgLy8gY2FsbCBpbml0Um9vdERpcmVjdG9yeSgpLFxuICAgICAgICAgIC8vIG9ubHkgY2FsbCBfaG9pc3RXb3Jrc3BhY2VEZXBzIHdoZW4gXCJzcmNQYWNrYWdlc1wiIHN0YXRlIGlzIGNoYW5nZWQgYnkgYWN0aW9uIGBfc3luY0xpbmtlZFBhY2thZ2VzYFxuICAgICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICAgIGRlZmVyKCgpID0+IG9mKGluaXRSb290RGlyZWN0b3J5KCkpKSxcbiAgICAgICAgICAgIC8vIHdhaXQgZm9yIF9zeW5jTGlua2VkUGFja2FnZXMgZmluaXNoXG4gICAgICAgICAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLnNyY1BhY2thZ2VzID09PSBzMi5zcmNQYWNrYWdlcyksXG4gICAgICAgICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gQ2hhbmluZyBpbnN0YWxsSnNvblN0ciB0byBmb3JjZSBhY3Rpb24gX2luc3RhbGxXb3Jrc3BhY2UgYmVpbmcgZGlzcGF0Y2hlZCBsYXRlclxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgY29uc3Qgd3MgPSBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSE7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICAgIHdzLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyA9IHt9O1xuICAgICAgICAgICAgICB3cy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgPSB7fTtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmb3JjZSBucG0gaW5zdGFsbCBpbicsIHdzS2V5KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBjYWxsIGluaXRSb290RGlyZWN0b3J5KCkgYW5kIHdhaXQgZm9yIGl0IGZpbmlzaGVkIGJ5IG9ic2VydmUgYWN0aW9uICdfc3luY0xpbmtlZFBhY2thZ2VzJyxcbiAgICAgICAgICAvLyB0aGVuIGNhbGwgX2hvaXN0V29ya3NwYWNlRGVwc1xuICAgICAgICAgIHJldHVybiBtZXJnZShcbiAgICAgICAgICAgIGRlZmVyKCgpID0+IG9mKGluaXRSb290RGlyZWN0b3J5KCkpKSxcbiAgICAgICAgICAgIGFjdGlvbiQucGlwZShcbiAgICAgICAgICAgICAgb2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX3N5bmNMaW5rZWRQYWNrYWdlcyksXG4gICAgICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICAgICAgKVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjaGVja0FsbFdvcmtzcGFjZXMoKTtcbiAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKSkge1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIudXBkYXRlV29ya3NwYWNlKHtkaXI6IHByb2Nlc3MuY3dkKCksIGlzRm9yY2U6IHBheWxvYWQuaXNGb3JjZX0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGN1cnIgPSBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gICAgICAgICAgaWYgKGN1cnIgIT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMoY3VycikpIHtcbiAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGN1cnIpO1xuICAgICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLnVwZGF0ZVdvcmtzcGFjZSh7ZGlyOiBwYXRoLCBpc0ZvcmNlOiBwYXlsb2FkLmlzRm9yY2V9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuc2V0Q3VycmVudFdvcmtzcGFjZShudWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyksXG4gICAgICBtYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwYXlsb2FkLmRpcik7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX3JlbGF0ZWRQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG4gICAgICAgIHNldEltbWVkaWF0ZSgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLndvcmtzcGFjZVN0YXRlVXBkYXRlZCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMudXBkYXRlRGlyKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBkZWZlcigoKSA9PiBmcm9tKFxuICAgICAgICBfc2NhblBhY2thZ2VBbmRMaW5rKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZShrZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICkpKVxuICAgICksXG4gICAgLy8gSGFuZGxlIG5ld2x5IGFkZGVkIHdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLndvcmtzcGFjZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKHdzLmtleXMoKSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSksXG4gICAgICBzY2FuPHN0cmluZ1tdPigocHJldiwgY3VycikgPT4ge1xuICAgICAgICBpZiAocHJldi5sZW5ndGggPCBjdXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdOZXcgd29ya3NwYWNlOiAnLCBuZXdBZGRlZCk7XG4gICAgICAgICAgZm9yIChjb25zdCB3cyBvZiBuZXdBZGRlZCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiB3c30pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIGZpbHRlcihzID0+IHMud29ya3NwYWNlcy5oYXMoa2V5KSksXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5pbnN0YWxsSnNvbiA9PT0gczIuaW5zdGFsbEpzb24pLFxuICAgICAgICBzY2FuPFdvcmtzcGFjZVN0YXRlPigob2xkLCBuZXdXcykgPT4ge1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlOiBtYXgtbGluZS1sZW5ndGhcbiAgICAgICAgICBjb25zdCBuZXdEZXBzID0gT2JqZWN0LmVudHJpZXMobmV3V3MuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzIHx8IFtdKVxuICAgICAgICAgICAgLmNvbmNhdChPYmplY3QuZW50cmllcyhuZXdXcy5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMgfHwgW10pKVxuICAgICAgICAgICAgLm1hcChlbnRyeSA9PiBlbnRyeS5qb2luKCc6ICcpKTtcbiAgICAgICAgICBpZiAobmV3RGVwcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIGZvcmNpbmcgaW5zdGFsbCB3b3Jrc3BhY2UsIHRoZXJlZm9yZSBkZXBlbmRlbmNpZXMgaXMgY2xlYXJlZCBhdCB0aGlzIG1vbWVudFxuICAgICAgICAgICAgcmV0dXJuIG5ld1dzO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb25zdCBvbGREZXBzID0gT2JqZWN0LmVudHJpZXMob2xkLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcyB8fCBbXSlcbiAgICAgICAgICAgIC5jb25jYXQoT2JqZWN0LmVudHJpZXMob2xkLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcyB8fCBbXSkpXG4gICAgICAgICAgICAubWFwKGVudHJ5ID0+IGVudHJ5LmpvaW4oJzogJykpO1xuXG4gICAgICAgICAgaWYgKG5ld0RlcHMubGVuZ3RoICE9PSBvbGREZXBzLmxlbmd0aCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV3RGVwcy5zb3J0KCk7XG4gICAgICAgICAgb2xkRGVwcy5zb3J0KCk7XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDAsIGwgPSBuZXdEZXBzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgaWYgKG5ld0RlcHNbaV0gIT09IG9sZERlcHNbaV0pIHtcbiAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBuZXdXcztcbiAgICAgICAgfSksXG4gICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIGNvbmNhdE1hcChhY3Rpb24gPT4ge1xuICAgICAgICBjb25zdCB3c0tleSA9IGFjdGlvbi5wYXlsb2FkLndvcmtzcGFjZUtleTtcbiAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzISkpKSxcbiAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9yZWxhdGVkUGFja2FnZVVwZGF0ZWQpLFxuICAgICAgbWFwKGFjdGlvbiA9PiBwa2dUc2NvbmZpZ0ZvckVkaXRvclJlcXVlc3RNYXAuYWRkKGFjdGlvbi5wYXlsb2FkKSksXG4gICAgICBkZWJvdW5jZVRpbWUoODAwKSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGRvbmVzID0gQXJyYXkuZnJvbShwa2dUc2NvbmZpZ0ZvckVkaXRvclJlcXVlc3RNYXAudmFsdWVzKCkpLm1hcCh3c0tleSA9PiB7XG4gICAgICAgICAgdXBkYXRlVHNjb25maWdGaWxlRm9yRWRpdG9yKHdzS2V5KTtcbiAgICAgICAgICByZXR1cm4gY29sbGVjdER0c0ZpbGVzKHdzS2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmcm9tKFByb21pc2UuYWxsKGRvbmVzKSk7XG4gICAgICB9KSxcbiAgICAgIG1hcChhc3luYyAoKSA9PiB7XG4gICAgICAgIHBrZ1RzY29uZmlnRm9yRWRpdG9yUmVxdWVzdE1hcC5jbGVhcigpO1xuICAgICAgICBhd2FpdCB3cml0ZUNvbmZpZ0ZpbGVzKCk7XG4gICAgICAgIGFjdGlvbkRpc3BhdGNoZXIucGFja2FnZXNVcGRhdGVkKCk7XG4gICAgICB9KVxuICAgICksXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMuZ2l0SWdub3JlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKGdpdElnbm9yZXMgPT4gT2JqZWN0LmtleXMoZ2l0SWdub3Jlcykuam9pbignLCcpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBkZWJvdW5jZVRpbWUoNTAwKSxcbiAgICAgIHN3aXRjaE1hcCgoKSA9PiB7XG4gICAgICAgIHJldHVybiBtZXJnZSguLi5PYmplY3Qua2V5cyhnZXRTdGF0ZSgpLmdpdElnbm9yZXMpLm1hcChmaWxlID0+IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLmdpdElnbm9yZXNbZmlsZV0pLFxuICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgICBtYXAobGluZXMgPT4ge1xuICAgICAgICAgICAgZnMucmVhZEZpbGUoZmlsZSwgJ3V0ZjgnLCAoZXJyLCBkYXRhKSA9PiB7XG4gICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVhZCBnaXRpZ25vcmUgZmlsZScsIGZpbGUpO1xuICAgICAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBjb25zdCBleGlzdGluZ0xpbmVzID0gZGF0YS5zcGxpdCgvXFxuXFxyPy8pLm1hcChsaW5lID0+IGxpbmUudHJpbSgpKTtcbiAgICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSBfLmRpZmZlcmVuY2UobGluZXMsIGV4aXN0aW5nTGluZXMpO1xuICAgICAgICAgICAgICBpZiAobmV3TGluZXMubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGRhdGEgKyBFT0wgKyBuZXdMaW5lcy5qb2luKEVPTCksICgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbW9kaWZ5JywgZmlsZSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBmcm9tKF9zY2FuUGFja2FnZUFuZExpbmsoKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgIClcbiAgKS5waXBlKFxuICAgIGlnbm9yZUVsZW1lbnRzKCksXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW3BhY2thZ2UtbWdyLmluZGV4XScsIGVyci5zdGFjayA/IGVyci5zdGFjayA6IGVycik7XG4gICAgICByZXR1cm4gdGhyb3dFcnJvcihlcnIpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQYWNrYWdlc1N0YXRlPiB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZUtleShwYXRoOiBzdHJpbmcpIHtcbiAgbGV0IHJlbCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBQYXRoLnJlc29sdmUocGF0aCkpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwcmogb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocGF0aFRvUHJvaktleShwcmopKTtcbiAgICBpZiAocGtnTmFtZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwayA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgeWllbGQgcGs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogTGlzdCBsaW5rZWQgcGFja2FnZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlcygpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGxldCBpID0gMDtcbiAgZm9yIChjb25zdCB7bmFtZX0gb2YgYWxsUGFja2FnZXMoJyonLCAnc3JjJykpIHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocGogPT4gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzQ3dkV29ya3NwYWNlKCkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKHdzID09IG51bGwpXG4gICAgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlSW5zdGFsbGVkUGFja2FnZUZvcldvcmtzcGFjZSh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHBrZ0VudHJ5ID0gZG9MaXN0SW5zdGFsbGVkQ29tcDRXb3Jrc3BhY2UoZ2V0U3RhdGUoKSwgd3NLZXkpO1xuXG4gIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAoKGZ1bmN0aW9uKigpOiBHZW5lcmF0b3I8W3N0cmluZywgUGFja2FnZUluZm9dPiB7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dFbnRyeSkge1xuICAgICAgeWllbGQgW3BrLm5hbWUsIHBrXTtcbiAgICB9XG4gIH0pKCkpO1xuICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyA9IGluc3RhbGxlZCk7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3JlbGF0ZWRQYWNrYWdlVXBkYXRlZCh3c0tleSk7XG59XG5cbi8qKlxuICogQ3JlYXRlIHN1YiBkaXJlY3RvcnkgXCJ0eXBlc1wiIHVuZGVyIGN1cnJlbnQgd29ya3NwYWNlXG4gKiBAcGFyYW0gd3NLZXkgXG4gKi9cbmZ1bmN0aW9uIGNvbGxlY3REdHNGaWxlcyh3c0tleTogc3RyaW5nKSB7XG4gIGNvbnN0IHdzVHlwZXNEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB3c0tleSwgJ3R5cGVzJyk7XG4gIGZzLm1rZGlycFN5bmMod3NUeXBlc0Rpcik7XG4gIGNvbnN0IG1lcmdlVGRzOiBNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcCgpO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgaWYgKHBrZy5qc29uLmRyLm1lcmdlVGRzKSB7XG4gICAgICBjb25zdCBmaWxlID0gcGtnLmpzb24uZHIubWVyZ2VUZHM7XG4gICAgICBpZiAodHlwZW9mIGZpbGUgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIG1lcmdlVGRzLnNldChwa2cuc2hvcnROYW1lICsgJy0nICsgUGF0aC5iYXNlbmFtZShmaWxlKSwgUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgZmlsZSkpO1xuICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGZpbGUpKSB7XG4gICAgICAgIGZvciAoY29uc3QgZiBvZiBmaWxlIGFzIHN0cmluZ1tdKVxuICAgICAgICAgIG1lcmdlVGRzLnNldChwa2cuc2hvcnROYW1lICsgJy0nICsgUGF0aC5iYXNlbmFtZShmKSwgUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCxmKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIC8vIGNvbnNvbGUubG9nKG1lcmdlVGRzKTtcbiAgZm9yIChjb25zdCBjaHJGaWxlTmFtZSBvZiBmcy5yZWFkZGlyU3luYyh3c1R5cGVzRGlyKSkge1xuICAgIGlmICghbWVyZ2VUZHMuaGFzKGNockZpbGVOYW1lKSkge1xuICAgIC8vICAgbWVyZ2VUZHMuZGVsZXRlKGNockZpbGVOYW1lKTtcbiAgICAvLyB9IGVsc2Uge1xuICAgICAgY29uc3QgdXNlbGVzcyA9IFBhdGgucmVzb2x2ZSh3c1R5cGVzRGlyLCBjaHJGaWxlTmFtZSk7XG4gICAgICBmcy51bmxpbmsodXNlbGVzcyk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKCdEZWxldGUnLCB1c2VsZXNzKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgZG9uZTogUHJvbWlzZTxhbnk+W10gPSBuZXcgQXJyYXkobWVyZ2VUZHMuc2l6ZSk7XG4gIGxldCBpID0gMDtcbiAgZm9yIChjb25zdCBkdHMgb2YgbWVyZ2VUZHMua2V5cygpKSB7XG4gICAgY29uc3QgdGFyZ2V0ID0gbWVyZ2VUZHMuZ2V0KGR0cykhO1xuICAgIGNvbnN0IGFic0R0cyA9IFBhdGgucmVzb2x2ZSh3c1R5cGVzRGlyLCBkdHMpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIC8vIGNvbnNvbGUubG9nKGBDcmVhdGUgc3ltbGluayAke2Fic0R0c30gLS0+ICR7dGFyZ2V0fWApO1xuICAgIGRvbmVbaSsrXSA9IHN5bWxpbmtBc3luYyh0YXJnZXQsIGFic0R0cyk7XG4gIH1cbiAgcmV0dXJuIFByb21pc2UuYWxsKGRvbmUpO1xufVxuXG4vKipcbiAqIERlbGV0ZSB3b3Jrc3BhY2Ugc3RhdGUgaWYgaXRzIGRpcmVjdG9yeSBkb2VzIG5vdCBleGlzdFxuICovXG5mdW5jdGlvbiBjaGVja0FsbFdvcmtzcGFjZXMoKSB7XG4gIGZvciAoY29uc3Qga2V5IG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCkpIHtcbiAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpO1xuICAgIGlmICghZnMuZXhpc3RzU3luYyhkaXIpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGBXb3Jrc3BhY2UgJHtrZXl9IGRvZXMgbm90IGV4aXN0IGFueW1vcmUuYCk7XG4gICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZGVsZXRlKGtleSkpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBhc3luYyBmdW5jdGlvbiB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKSB7XG4vLyAgIGNvbnN0IGpzb25TdHJzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4vLyAgICAgQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSlcbi8vICAgICAubWFwKChbbmFtZSwgcGtJbmZvXSkgPT4ge1xuLy8gICAgICAgcmV0dXJuIHJlYWRGaWxlQXN5bmMoUGF0aC5yZXNvbHZlKHBrSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuLy8gICAgIH0pXG4vLyAgICk7XG5cbi8vICAgZGVsZXRlVXNlbGVzc1N5bWxpbmsoKTtcbi8vICAgYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGFja2FnZVN0YXRlKGpzb25TdHJzLm1hcChzdHIgPT4gSlNPTi5wYXJzZShzdHIpKSk7XG4vLyB9XG5cbmFzeW5jIGZ1bmN0aW9uIGRlbGV0ZVVzZWxlc3NTeW1saW5rKCkge1xuICBjb25zdCBkb25lczogUHJvbWlzZTx2b2lkPltdID0gW107XG4gIGNvbnN0IGNoZWNrRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBzcmNQYWNrYWdlcyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGRyY3BOYW1lID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwID8gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lIDogbnVsbDtcbiAgY29uc3QgZG9uZTEgPSBsaXN0TW9kdWxlU3ltbGlua3MoY2hlY2tEaXIsIGFzeW5jIGxpbmsgPT4ge1xuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGNoZWNrRGlyLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiAhc3JjUGFja2FnZXMuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdyhgRGVsZXRlIGV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApKTtcbiAgICAgIGNvbnN0IGRvbmUgPSBuZXcgUHJvbWlzZTx2b2lkPigocmVzLCByZWopID0+IHtcbiAgICAgICAgZnMudW5saW5rKGxpbmssIChlcnIpID0+IHsgaWYgKGVycikgcmV0dXJuIHJlaihlcnIpOyBlbHNlIHJlcygpO30pO1xuICAgICAgfSk7XG4gICAgICBkb25lcy5wdXNoKGRvbmUpO1xuICAgIH1cbiAgfSk7XG4gIGF3YWl0IGRvbmUxO1xuICBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gIC8vIGNvbnN0IHB3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIC8vIGNvbnN0IGZvcmJpZERpciA9IFBhdGguam9pbihnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKTtcbiAgLy8gaWYgKHN5bWxpbmtEaXIgIT09IGZvcmJpZERpcikge1xuICAvLyAgIGNvbnN0IHJlbW92ZWQ6IFByb21pc2U8YW55PltdID0gW107XG4gIC8vICAgY29uc3QgZG9uZTIgPSBsaXN0TW9kdWxlU3ltbGlua3MoZm9yYmlkRGlyLCBhc3luYyBsaW5rID0+IHtcbiAgLy8gICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKGZvcmJpZERpciwgbGluaykucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyAgICAgaWYgKHNyY1BhY2thZ2VzLmhhcyhwa2dOYW1lKSkge1xuICAvLyAgICAgICByZW1vdmVkLnB1c2godW5saW5rQXN5bmMobGluaykpO1xuICAvLyAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgLy8gICAgICAgY29uc29sZS5sb2coYFJlZHVuZGFudCBzeW1saW5rIFwiJHtQYXRoLnJlbGF0aXZlKHB3ZCwgbGluayl9XCIgcmVtb3ZlZC5gKTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gICByZXR1cm4gUHJvbWlzZS5hbGwoW2RvbmUxLCBkb25lMiwgLi4ucmVtb3ZlZF0pO1xuICAvLyB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2NvbmZpZy5sb2NhbC10ZW1wbGF0ZS55YW1sJyksIFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnLCAnY29uZmlnLmxvY2FsLnlhbWwnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbG9nNGpzLmpzJyksIHJvb3RQYXRoICsgJy9sb2c0anMuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcycsICdtb2R1bGUtcmVzb2x2ZS5zZXJ2ZXIudG1wbC50cycpLCByb290UGF0aCArICcvbW9kdWxlLXJlc29sdmUuc2VydmVyLnRzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLFxuICAgICAgJ2dpdGlnbm9yZS50eHQnKSwgZ2V0Um9vdERpcigpICsgJy8uZ2l0aWdub3JlJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICBmcy5ta2RpcnBTeW5jKHN5bWxpbmtEaXIpO1xuXG4gIGxvZ0NvbmZpZyhjb25maWcoKSk7XG5cbiAgY29uc3QgcHJvamVjdERpcnMgPSBnZXRQcm9qZWN0TGlzdCgpO1xuXG4gIHByb2plY3REaXJzLmZvckVhY2gocHJqZGlyID0+IHtcbiAgICBfd3JpdGVHaXRIb29rKHByamRpcik7XG4gICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzbGludC5qc29uJyksIHByamRpciArICcvdHNsaW50Lmpzb24nKTtcbiAgfSk7XG5cbiAgYXdhaXQgX3NjYW5QYWNrYWdlQW5kTGluaygpO1xuICBhd2FpdCBkZWxldGVVc2VsZXNzU3ltbGluaygpO1xuXG4gIC8vIGF3YWl0IHdyaXRlQ29uZmlnRmlsZXMoKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVDb25maWdGaWxlcygpIHtcbiAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4uL2NtZC9jb25maWctc2V0dXAnKSkuYWRkdXBDb25maWdzKChmaWxlLCBjb25maWdDb250ZW50KSA9PiB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ3dyaXRlIGNvbmZpZyBmaWxlOicsIGZpbGUpO1xuICAgIHdyaXRlRmlsZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnZGlzdCcsIGZpbGUpLFxuICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzLmlkKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdJbnN0YWxsIGRlcGVuZGVuY2llcyBpbiAnICsgZGlyKTtcbiAgdHJ5IHtcbiAgICBhd2FpdCBjb3B5TnBtcmNUb1dvcmtzcGFjZShkaXIpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcihlKTtcbiAgfVxuICBjb25zdCBzeW1saW5rc0luTW9kdWxlRGlyID0gW10gYXMge2NvbnRlbnQ6IHN0cmluZywgbGluazogc3RyaW5nfVtdO1xuXG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZShkaXIsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICBmcy5ta2RpcnBTeW5jKHRhcmdldCk7XG4gIH1cblxuICAvLyAxLiBUZW1vcHJhcmlseSByZW1vdmUgYWxsIHN5bWxpbmtzIHVuZGVyIGBub2RlX21vZHVsZXMvYCBhbmQgYG5vZGVfbW9kdWxlcy9AKi9gXG4gIC8vIGJhY2t1cCB0aGVtIGZvciBsYXRlIHJlY292ZXJ5XG4gIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyh0YXJnZXQsIGxpbmsgPT4ge1xuICAgIGNvbnN0IGxpbmtDb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIHN5bWxpbmtzSW5Nb2R1bGVEaXIucHVzaCh7Y29udGVudDogbGlua0NvbnRlbnQsIGxpbmt9KTtcbiAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gIH0pO1xuXG4gIC8vIDIuIFJ1biBgbnBtIGluc3RhbGxgXG4gIGNvbnN0IGluc3RhbGxKc29uRmlsZSA9IFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdbaW5pdF0gd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgd3MuaW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDAwKSk7XG4gIHRyeSB7XG4gICAgYXdhaXQgZXhlKCducG0nLCAnaW5zdGFsbCcsIHtjd2Q6IGRpcn0pLnByb21pc2U7XG4gICAgYXdhaXQgZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogZGlyfSkucHJvbWlzZTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gaW5zdGFsbCBkZXBlbmRlbmNpZXMnLCBlLnN0YWNrKTtcbiAgICB0aHJvdyBlO1xuICB9IGZpbmFsbHkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdSZWNvdmVyICcgKyBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIC8vIDMuIFJlY292ZXIgcGFja2FnZS5qc29uIGFuZCBzeW1saW5rcyBkZWxldGVkIGluIFN0ZXAuMS5cbiAgICBmcy53cml0ZUZpbGVTeW5jKGluc3RhbGxKc29uRmlsZSwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIHJldHVybiBfc3ltbGlua0FzeW5jKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBjb3B5TnBtcmNUb1dvcmtzcGFjZSh3c2Rpcjogc3RyaW5nKSB7XG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3c2RpciwgJy5ucG1yYycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyh0YXJnZXQpKVxuICAgIHJldHVybjtcbiAgY29uc3QgaXNDaGluYSA9IGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLmlzSW5DaGluYSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBmaWx0ZXIoY24gPT4gY24gIT0gbnVsbCksXG4gICAgICB0YWtlKDEpXG4gICAgKS50b1Byb21pc2UoKTtcblxuICBpZiAoaXNDaGluYSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdjcmVhdGUgLm5wbXJjIHRvJywgdGFyZ2V0KTtcbiAgICBmcy5jb3B5RmlsZVN5bmMoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uLy5ucG1yYycpLCB0YXJnZXQpO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9zY2FuUGFja2FnZUFuZExpbmsoKSB7XG4gIGNvbnN0IHJtID0gKGF3YWl0IGltcG9ydCgnLi4vcmVjaXBlLW1hbmFnZXInKSk7XG5cbiAgY29uc3QgcHJvalBrZ01hcDogTWFwPHN0cmluZywgUGFja2FnZUluZm9bXT4gPSBuZXcgTWFwKCk7XG4gIGNvbnN0IHBrZ0xpc3Q6IFBhY2thZ2VJbmZvW10gPSBbXTtcbiAgLy8gY29uc3Qgc3ltbGlua3NEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGF3YWl0IHJtLmxpbmtDb21wb25lbnRzQXN5bmMoc3ltbGlua0RpcikucGlwZShcbiAgICB0YXAoKHtwcm9qLCBqc29uRmlsZSwganNvbn0pID0+IHtcbiAgICAgIGlmICghcHJvalBrZ01hcC5oYXMocHJvaikpXG4gICAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKGpzb25GaWxlLCBqc29uLCBmYWxzZSwgc3ltbGlua0Rpcik7XG4gICAgICBwa2dMaXN0LnB1c2goaW5mbyk7XG4gICAgICBwcm9qUGtnTWFwLmdldChwcm9qKSEucHVzaChpbmZvKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIGZvciAoY29uc3QgW3ByaiwgcGtnc10gb2YgcHJvalBrZ01hcC5lbnRyaWVzKCkpIHtcbiAgICBhY3Rpb25EaXNwYXRjaGVyLl9hc3NvY2lhdGVQYWNrYWdlVG9Qcmooe3ByaiwgcGtnc30pO1xuICB9XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNMaW5rZWRQYWNrYWdlcyhwa2dMaXN0KTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvKHBrSnNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQgPSBmYWxzZSxcbiAgc3ltTGlua1BhcmVudERpcj86IHN0cmluZyk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICByZXR1cm4gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlLCBqc29uLCBpc0luc3RhbGxlZCwgc3ltTGlua1BhcmVudERpcik7XG59XG4vKipcbiAqIExpc3QgdGhvc2UgaW5zdGFsbGVkIHBhY2thZ2VzIHdoaWNoIGFyZSByZWZlcmVuY2VkIGJ5IHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZSxcbiAqIHRob3NlIHBhY2thZ2VzIG11c3QgaGF2ZSBcImRyXCIgcHJvcGVydHkgaW4gcGFja2FnZS5qc29uIFxuICogQHBhcmFtIHdvcmtzcGFjZUtleSBcbiAqL1xuZnVuY3Rpb24qIGRvTGlzdEluc3RhbGxlZENvbXA0V29ya3NwYWNlKHN0YXRlOiBQYWNrYWdlc1N0YXRlLCB3b3Jrc3BhY2VLZXk6IHN0cmluZykge1xuICBjb25zdCBvcmlnaW5JbnN0YWxsSnNvbiA9IHN0YXRlLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleSkhLm9yaWdpbkluc3RhbGxKc29uO1xuICAvLyBjb25zdCBkZXBKc29uID0gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IFtvcmlnaW5JbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXNdIDpcbiAgLy8gICBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBvcmlnaW5JbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXNdO1xuICBmb3IgKGNvbnN0IGRlcHMgb2YgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXSkge1xuICAgIGlmIChkZXBzID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBPYmplY3Qua2V5cyhkZXBzKSkge1xuICAgICAgaWYgKCFzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwKSAmJiBkZXAgIT09ICdAd2ZoL3BsaW5rJykge1xuICAgICAgICBjb25zdCBwa2pzb25GaWxlID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgd29ya3NwYWNlS2V5LCAnbm9kZV9tb2R1bGVzJywgZGVwLCAncGFja2FnZS5qc29uJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHBranNvbkZpbGUpKSB7XG4gICAgICAgICAgY29uc3QgcGsgPSBjcmVhdGVQYWNrYWdlSW5mbyhcbiAgICAgICAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpLCB0cnVlKTtcbiAgICAgICAgICBpZiAocGsuanNvbi5kcikge1xuICAgICAgICAgICAgeWllbGQgcGs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGtKc29uRmlsZSBwYWNrYWdlLmpzb24gZmlsZSBwYXRoXG4gKiBAcGFyYW0gaXNJbnN0YWxsZWQgXG4gKiBAcGFyYW0gc3ltTGluayBzeW1saW5rIHBhdGggb2YgcGFja2FnZVxuICogQHBhcmFtIHJlYWxQYXRoIHJlYWwgcGF0aCBvZiBwYWNrYWdlXG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvV2l0aEpzb24ocGtKc29uRmlsZTogc3RyaW5nLCBqc29uOiBhbnksIGlzSW5zdGFsbGVkID0gZmFsc2UsXG4gIHN5bUxpbmtQYXJlbnREaXI/OiBzdHJpbmcpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IG0gPSBtb2R1bGVOYW1lUmVnLmV4ZWMoanNvbi5uYW1lKTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBzaG9ydE5hbWU6IG0hWzJdLFxuICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICBzY29wZTogbSFbMV0sXG4gICAgcGF0aDogc3ltTGlua1BhcmVudERpciA/IFBhdGgucmVzb2x2ZShzeW1MaW5rUGFyZW50RGlyLCBqc29uLm5hbWUpIDogUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpLFxuICAgIGpzb24sXG4gICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGtKc29uRmlsZSkpLFxuICAgIGlzSW5zdGFsbGVkXG4gIH07XG4gIHJldHVybiBwa0luZm87XG59XG5cbmZ1bmN0aW9uIGNwKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoXy5zdGFydHNXaXRoKGZyb20sICctJykpIHtcbiAgICBmcm9tID0gYXJndW1lbnRzWzFdO1xuICAgIHRvID0gYXJndW1lbnRzWzJdO1xuICB9XG4gIGZzLmNvcHlTeW5jKGZyb20sIHRvKTtcbiAgLy8gc2hlbGwuY3AoLi4uYXJndW1lbnRzKTtcbiAgaWYgKC9bL1xcXFxdJC8udGVzdCh0bykpXG4gICAgdG8gPSBQYXRoLmJhc2VuYW1lKGZyb20pOyAvLyB0byBpcyBhIGZvbGRlclxuICBlbHNlXG4gICAgdG8gPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRvKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdjb3B5IHRvICVzJywgY2hhbGsuY3lhbih0bykpO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGZyb20gYWJzb2x1dGUgcGF0aFxuICogQHBhcmFtIHtzdHJpbmd9IHRvIHJlbGF0aXZlIHRvIHJvb3RQYXRoIFxuICovXG5mdW5jdGlvbiBtYXliZUNvcHlUZW1wbGF0ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuZnVuY3Rpb24gX3dyaXRlR2l0SG9vayhwcm9qZWN0OiBzdHJpbmcpIHtcbiAgLy8gaWYgKCFpc1dpbjMyKSB7XG4gIGNvbnN0IGdpdFBhdGggPSBQYXRoLnJlc29sdmUocHJvamVjdCwgJy5naXQvaG9va3MnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCkpIHtcbiAgICBjb25zdCBob29rU3RyID0gJyMhL2Jpbi9zaFxcbicgK1xuICAgICAgYGNkIFwiJHtnZXRSb290RGlyKCl9XCJcXG5gICtcbiAgICAgIC8vICdkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICducHggcHJldHR5LXF1aWNrIC0tc3RhZ2VkXFxuJyArIC8vIFVzZSBgdHNsaW50IC0tZml4YCBpbnN0ZWFkLlxuICAgICAgYHBsaW5rIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG4iXX0=