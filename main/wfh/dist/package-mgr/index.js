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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
exports.createPackageInfo = exports.listPackagesByProjects = exports.getProjectList = exports.listPackages = exports.getPackagesOfProjects = exports.pathToWorkspace = exports.workspaceKey = exports.pathToProjKey = exports.getStore = exports.getState = exports.actionDispatcher = exports.slice = void 0;
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
const package_utils_1 = require("../package-utils");
const process_utils_1 = require("../process-utils");
const process_utils_2 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
const misc_1 = require("../utils/misc");
const symlinks_1 = __importStar(require("../utils/symlinks"));
const { symlinkDir } = JSON.parse(process.env.__plink);
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    workspaces: new Map(),
    project2Packages: new Map(),
    srcPackages: new Map(),
    errors: [],
    gitIgnores: {},
    linkedDrcp: misc_1.isDrcpSymlink ?
        createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), 'node_modules/dr-comp-package/package.json'), false, misc_1.getRootDir())
        : null
};
exports.slice = store_1.stateFactory.newSlice({
    name: NS,
    initialState: state,
    reducers: {
        /** Do this action after any linked package is removed or added  */
        initRootDir(d, action) {
        },
        /** Check and install dependency, if there is linked package used in more than one workspace,
         * to switch between different workspace */
        initWorkspace(d, action) {
        },
        _syncPackagesState(d, { payload }) {
            d.srcPackages = new Map();
            for (const pkInfo of payload) {
                d.srcPackages.set(pkInfo.name, pkInfo);
            }
        },
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
                console.log('[_hoistWorkspaceDeps] dr-comp-package is symlink');
                delete updatingDeps['dr-comp-package'];
                delete updatingDevDeps['dr-comp-package'];
            }
            // pkjsonList.push(updatingJson);
            const { hoisted: hoistedDeps, msg } = dependency_hoister_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages.get(entry[0]).json), dir, updatingDeps);
            const { hoisted: hoistedDevDeps, msg: msgDev } = dependency_hoister_1.listCompDependency(linkedDevDependencies.map(entry => state.srcPackages.get(entry[0]).json), dir, updatingDevDeps);
            // tslint:disable-next-line: no-console
            if (msg())
                console.log(`Workspace "${dir}" dependencies:\n`, msg());
            // tslint:disable-next-line: no-console
            if (msgDev())
                console.log(`Workspace "${dir}" devDependencies:\n`, msgDev());
            // In case some packages have peer dependencies of other packages
            // remove them from dependencies
            for (const key of hoistedDeps.keys()) {
                if (state.srcPackages.has(key))
                    hoistedDeps.delete(key);
            }
            for (const key of hoistedDevDeps.keys()) {
                if (state.srcPackages.has(key))
                    hoistedDevDeps.delete(key);
            }
            const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: Array.from(hoistedDeps.entries()).reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}), devDependencies: Array.from(hoistedDevDeps.entries()).reduce((dic, [name, info]) => {
                    dic[name] = info.by[0].ver;
                    return dic;
                }, {}) });
            // console.log(installJson)
            const wsKey = workspaceKey(dir);
            // const installedComp = listInstalledComp4Workspace(state.workspaces, state.srcPackages, wsKey);
            const wp = {
                id: wsKey,
                originInstallJson: pkjson,
                originInstallJsonStr: pkjsonStr,
                installJson,
                installJsonStr: JSON.stringify(installJson, null, '  '),
                linkedDependencies,
                linkedDevDependencies
                // installedComponents: new Map(installedComp.map(pkg => [pkg.name, pkg]))
                // dependencies,
                // devDependencies,
                // hoistedDeps,
                // hoistedDevDeps
            };
            state.workspaces.set(wsKey, wp);
            // console.log('-----------------', dir);
        },
        _installWorkspace(state, { payload: { dir } }) {
        },
        _associatePackageToPrj(d, { payload: { prj, pkgs } }) {
            d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
        },
        _updateGitIgnores(d, { payload }) {
            d.gitIgnores[payload.file] = payload.content;
        }
    }
});
exports.actionDispatcher = store_1.stateFactory.bindActionCreators(exports.slice);
// const readFileAsync = promisify<string, string, string>(fs.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    return rxjs_1.merge(getStore().pipe(operators_2.map(s => s.project2Packages), operators_2.distinctUntilChanged(), operators_2.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
    }), operators_2.ignoreElements()), 
    //  initWorkspace
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initWorkspace), operators_2.switchMap(({ payload: { dir, isForce, logHasConfiged } }) => {
        dir = path_1.default.resolve(dir);
        const hoistOnPackageChanges = getStore().pipe(operators_2.distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages), operators_2.skip(1), operators_2.take(1), operators_2.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir })));
        if (getState().srcPackages.size === 0) {
            return rxjs_1.merge(hoistOnPackageChanges, rxjs_1.of(exports.slice.actions.initRootDir()));
        }
        else {
            if (!logHasConfiged) {
                log_config_1.default(config_1.default());
            }
            const wsKey = workspaceKey(dir);
            if (isForce && getState().workspaces.has(wsKey)) {
                exports.actionDispatcher._change(d => {
                    // clean to trigger install action
                    d.workspaces.get(wsKey).installJsonStr = '';
                });
            }
            // updateLinkedPackageState();
            exports.actionDispatcher._hoistWorkspaceDeps({ dir });
            return rxjs_1.of();
        }
    }), operators_2.ignoreElements()), 
    // initRootDir
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_2.switchMap(() => {
        const goInitWorkspace$ = action$.pipe(store_1.ofPayloadAction(exports.slice.actions._syncPackagesState), operators_2.take(1), operators_2.map(() => {
            if (getState().workspaces.size > 0) {
                for (const key of getState().workspaces.keys()) {
                    const path = path_1.default.resolve(misc_1.getRootDir(), key);
                    exports.actionDispatcher.initWorkspace({ dir: path, isForce: false, logHasConfiged: true });
                }
            }
        }));
        return rxjs_1.merge(goInitWorkspace$, rxjs_1.from(initRootDirectory()));
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_2.concatMap(({ payload }) => {
        const srcPackages = getState().srcPackages;
        const wsKey = workspaceKey(payload.dir);
        const ws = getState().workspaces.get(wsKey);
        if (ws == null)
            return rxjs_1.of();
        const pks = [
            ...ws.linkedDependencies.map(([name, ver]) => srcPackages.get(name)),
            ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages.get(name))
        ].filter(pk => pk != null);
        // if (getState().linkedDrcp) {
        //   const drcp = getState().linkedDrcp!.name;
        //   const spaceJson = getState().workspaces.get(wsKey)!.originInstallJson;
        //   if (spaceJson.dependencies && spaceJson.dependencies[drcp] ||
        //     spaceJson.devDependencies && spaceJson.devDependencies[drcp]) {
        //     pks.push(getState().linkedDrcp!);
        //   }
        // }
        return rxjs_1.from(editor_helper_1.writeTsconfigForEachPackage(payload.dir, pks, (file, content) => exports.actionDispatcher._updateGitIgnores({ file, content })));
    }), operators_2.ignoreElements()), 
    // Handle newly added workspace
    getStore().pipe(operators_2.map(s => s.workspaces), operators_2.distinctUntilChanged(), operators_2.map(ws => {
        const keys = Array.from(ws.keys());
        // setWorkspaceForRecipe(keys.map(key => Path.resolve(getRootDir(), key)));
        return keys;
    }), operators_2.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            console.log('New workspace: ', newAdded);
            for (const dir of newAdded) {
                exports.actionDispatcher._installWorkspace({ dir });
            }
            writeConfigFiles();
        }
        return curr;
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_2.mergeMap(action => {
        const wsKey = workspaceKey(action.payload.dir);
        return getStore().pipe(operators_2.map(s => s.workspaces.get(wsKey)), operators_2.distinctUntilChanged(), operators_2.filter(ws => ws != null), operators_2.take(1), operators_2.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_2.map(() => {
            const pkgEntry = listInstalledComp4Workspace(getState(), workspaceKey(action.payload.dir));
            const installed = new Map((function* () {
                for (const pk of pkgEntry) {
                    yield [pk.name, pk];
                }
            })());
            exports.actionDispatcher._change(d => d.workspaces.get(wsKey).installedComponents = installed);
        }));
    }), operators_2.ignoreElements()), ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(operators_2.map(s => s.workspaces.get(key).installJsonStr), operators_2.distinctUntilChanged(), operators_2.filter(installJsonStr => installJsonStr.length > 0), operators_2.skip(1), operators_2.take(1), operators_2.map(() => {
            return exports.actionDispatcher._installWorkspace({ dir: path_1.default.resolve(misc_1.getRootDir(), key) });
        }), operators_2.ignoreElements());
    }), getStore().pipe(operators_2.map(s => s.gitIgnores), operators_2.distinctUntilChanged(), operators_2.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_2.distinctUntilChanged(), operators_2.switchMap(() => {
        // console.log('$$$$$$$$$', files);
        return rxjs_1.merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(operators_2.map(s => s.gitIgnores[file]), operators_2.distinctUntilChanged(), operators_2.skip(1), operators_2.map(content => {
            fs_extra_1.default.writeFile(file, content, () => {
                // tslint:disable-next-line: no-console
                console.log('modify', file);
            });
        }))));
    }), operators_2.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_2.concatMap(() => rxjs_1.from(_scanPackageAndLink())), operators_2.ignoreElements())).pipe(operators_2.catchError(err => {
        console.error('[package-mgr.index]', err);
        return rxjs_1.of();
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
    let rel = path_1.default.relative(misc_1.getRootDir(), path);
    if (path_1.default.sep === '\\')
        rel = rel.replace(/\\/g, '/');
    return rel;
}
exports.workspaceKey = workspaceKey;
function pathToWorkspace(path) {
    return path_1.default.relative(misc_1.getRootDir(), path);
}
exports.pathToWorkspace = pathToWorkspace;
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
function listPackages() {
    let out = '';
    let i = 0;
    package_utils_1.findAllPackages((name) => {
        out += `${i++}. ${name}`;
        out += '\n';
    }, 'src');
    return out;
}
exports.listPackages = listPackages;
function getProjectList() {
    return Array.from(getState().project2Packages.keys()).map(pj => path_1.default.resolve(misc_1.getRootDir(), pj));
}
exports.getProjectList = getProjectList;
function listPackagesByProjects() {
    const cwd = process.cwd();
    const linkedPkgs = getState().srcPackages;
    let out = '';
    for (const [prj, pkgNames] of getState().project2Packages.entries()) {
        out += `Project ${prj || '.'}\n`;
        const pkgs = pkgNames.map(name => linkedPkgs.get(name));
        const maxWidth = pkgs.reduce((maxWidth, pk) => {
            const width = pk.name.length + pk.json.version.length + 1;
            return width > maxWidth ? width : maxWidth;
        }, 0);
        for (const pk of pkgs) {
            const width = pk.name.length + pk.json.version.length + 1;
            out += `  |- ${chalk_1.default.cyan(pk.name)}@${chalk_1.default.green(pk.json.version)}${' '.repeat(maxWidth - width)}` +
                ` ${path_1.default.relative(cwd, pk.realPath)}\n`;
        }
        out += '\n';
    }
    return out;
}
exports.listPackagesByProjects = listPackagesByProjects;
// async function updateLinkedPackageState() {
//   const jsonStrs = await Promise.all(
//     Array.from(getState().srcPackages.entries())
//     .map(([name, pkInfo]) => {
//       return readFileAsync(Path.resolve(pkInfo.realPath, 'package.json'), 'utf8');
//     })
//   );
//   warnUselessSymlink();
//   actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
// }
function warnUselessSymlink() {
    const checkDir = path_1.default.resolve(misc_1.getRootDir(), 'dist', 'symlinks');
    const srcPackages = getState().srcPackages;
    const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
    const done1 = symlinks_1.listModuleSymlinks(checkDir, (link) => __awaiter(this, void 0, void 0, function* () {
        const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
        if (drcpName !== pkgName && !srcPackages.has(pkgName)) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.yellow(`Extraneous symlink: ${link}`));
        }
    }));
    const pwd = process.cwd();
    const forbidDir = path_1.default.join(misc_1.getRootDir(), 'node_modules');
    if (symlinkDir !== forbidDir) {
        const removed = [];
        const done2 = symlinks_1.listModuleSymlinks(forbidDir, (link) => __awaiter(this, void 0, void 0, function* () {
            const pkgName = path_1.default.relative(forbidDir, link).replace(/\\/g, '/');
            if (srcPackages.has(pkgName)) {
                removed.push(symlinks_1.unlinkAsync(link));
                // tslint:disable-next-line: no-console
                console.log(`Redundant symlink "${path_1.default.relative(pwd, link)}" removed.`);
            }
        }));
        return Promise.all([done1, done2, ...removed]);
    }
    return done1;
}
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = misc_1.getRootDir();
        fs_extra_1.default.mkdirpSync(path_1.default.join(rootPath, 'dist'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/config.local-template.yaml'), path_1.default.join(rootPath, 'dist', 'config.local.yaml'));
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/log4js.js'), rootPath + '/log4js.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates/app-template.js'), rootPath + '/app.js');
        maybeCopyTemplate(path_1.default.resolve(__dirname, '../../templates', 'module-resolve.server.tmpl.ts'), rootPath + '/module-resolve.server.ts');
        // tslint:disable-next-line: max-line-length
        // maybeCopyTemplate(Path.resolve(__dirname, 'templates', 'module-resolve.browser.tmpl.ts'), rootPath + '/module-resolve.browser.ts');
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
        warnUselessSymlink();
        yield writeConfigFiles();
        editor_helper_1.writeTsconfig4project(getProjectList(), (file, content) => exports.actionDispatcher._updateGitIgnores({ file, content }));
    });
}
function writeConfigFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            utils_1.writeFile(path_1.default.resolve(misc_1.getRootDir(), 'dist', file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
    });
}
function installWorkspace(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        const dir = path_1.default.resolve(misc_1.getRootDir(), ws.id);
        // tslint:disable-next-line: no-console
        console.log('Install dependencies in ' + dir);
        const symlinksInModuleDir = [];
        const target = path_1.default.resolve(dir, 'node_modules');
        if (!fs_extra_1.default.existsSync(target)) {
            fs_extra_1.default.mkdirpSync(target);
        }
        if (ws.linkedDependencies.length + ws.linkedDevDependencies.length > 0) {
            // Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
            // backup them for late recovery
            yield symlinks_1.listModuleSymlinks(target, link => {
                const linkContent = fs_extra_1.default.readlinkSync(link);
                symlinksInModuleDir.push({ content: linkContent, link });
                return symlinks_1.unlinkAsync(link);
            });
            // _cleanActions.addWorkspaceFile(links);
            // 3. Run `npm install`
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
                console.log(e, e.stack);
            }
            // 4. Recover package.json and symlinks deleted in Step.1.
            fs_extra_1.default.writeFile(installJsonFile, ws.originInstallJsonStr, 'utf8');
            yield recoverSymlinks();
        }
        function recoverSymlinks() {
            return Promise.all(symlinksInModuleDir.map(({ content, link }) => {
                return symlinks_1._symlinkAsync(content, link, symlinks_1.isWin32 ? 'junction' : 'dir');
            }));
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
        exports.actionDispatcher._syncPackagesState(pkgList);
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
function* listInstalledComp4Workspace(state, workspaceKey) {
    const originInstallJson = state.workspaces.get(workspaceKey).originInstallJson;
    const depJson = process.env.NODE_ENV === 'production' ? [originInstallJson.dependencies] :
        [originInstallJson.dependencies, originInstallJson.devDependencies];
    for (const deps of depJson) {
        if (deps == null)
            continue;
        for (const dep of Object.keys(deps)) {
            if (!state.srcPackages.has(dep) && dep !== 'dr-comp-package') {
                const pk = createPackageInfo(path_1.default.resolve(misc_1.getRootDir(), workspaceKey, 'node_modules', dep, 'package.json'), true);
                if (pk.json.dr) {
                    yield pk;
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
            `node node_modules/dr-comp-package/bin/drcp.js lint --pj "${project.replace(/[/\\]$/, '')}" --fix\n`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFzQztBQUV0Qyw4Q0FBbUM7QUFDbkMsOENBQ2tGO0FBQ2xGLHdDQUF5QztBQUN6Qyx1REFBK0I7QUFDL0IsOERBQThFO0FBQzlFLG9EQUFzRjtBQUN0RiwrREFBc0M7QUFDdEMsb0RBQW1EO0FBQ25ELG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQWtEO0FBQ2xELG9DQUF5RDtBQUN6RCx3Q0FBMEQ7QUFDMUQsOERBQWtIO0FBd0JsSCxNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRWxFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixNQUFNLEVBQUUsRUFBRTtJQUNWLFVBQVUsRUFBRSxFQUFFO0lBQ2QsVUFBVSxFQUFFLG9CQUFhLENBQUMsQ0FBQztRQUN6QixpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUM1QixpQkFBVSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQVUsRUFBRSxDQUFDO1FBQ2xGLENBQUMsQ0FBQyxJQUFJO0NBQ1QsQ0FBQztBQXNCVyxRQUFBLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUN6QyxJQUFJLEVBQUUsRUFBRTtJQUNSLFlBQVksRUFBRSxLQUFLO0lBQ25CLFFBQVEsRUFBRTtRQUNSLG1FQUFtRTtRQUNuRSxXQUFXLENBQUMsQ0FBQyxFQUFFLE1BQThEO1FBQzdFLENBQUM7UUFFRDttREFDMkM7UUFDM0MsYUFBYSxDQUFDLENBQUMsRUFBRSxNQUErRTtRQUNoRyxDQUFDO1FBQ0Qsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUErQjtZQUMzRCxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7WUFDMUIsS0FBSyxNQUFNLE1BQU0sSUFBSSxPQUFPLEVBQUU7Z0JBQzVCLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDeEM7UUFDSCxDQUFDO1FBQ0QsbUVBQW1FO1FBQ25FLGdDQUFnQztRQUNoQyxnREFBZ0Q7UUFDaEQseUJBQXlCO1FBQ3pCLHVCQUF1QjtRQUN2Qiw0R0FBNEc7UUFDNUcsaUVBQWlFO1FBQ2pFLGtCQUFrQjtRQUNsQixRQUFRO1FBQ1IsdUJBQXVCO1FBQ3ZCLE1BQU07UUFDTixLQUFLO1FBQ0wsVUFBVSxDQUFDLENBQUMsRUFBRSxNQUErQjtZQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ2hDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNqQzthQUNGO1FBQ0gsQ0FBQztRQUNELGFBQWEsQ0FBQyxDQUFDLEVBQUUsTUFBK0I7WUFDOUMsS0FBSyxNQUFNLE1BQU0sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNuQyxNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEM7UUFDSCxDQUFDO1FBQ0QsbUJBQW1CLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQStCO1lBQ3ZFLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLEVBQUU7Z0JBQzdCLE1BQU0sSUFBSSxLQUFLLENBQUMseURBQXlELENBQUMsQ0FBQzthQUM1RTtZQUVELE1BQU0sU0FBUyxHQUFHLGtCQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzdFLE1BQU0sTUFBTSxHQUFzQixJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hELHFHQUFxRztZQUNyRywwQkFBMEI7WUFDMUIsSUFBSTtZQUVKLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQVMsTUFBTSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQztZQUUvRCxNQUFNLFlBQVkscUJBQU8sTUFBTSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNwRCxNQUFNLGtCQUFrQixHQUFnQixFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDaEIsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDakMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUM3QixPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUIsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQVMsTUFBTSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNyRSxNQUFNLGVBQWUscUJBQU8sTUFBTSxDQUFDLGVBQWUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUMxRCxNQUFNLHFCQUFxQixHQUFtQixFQUFFLENBQUM7WUFDakQsT0FBTyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDbkIsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDakMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQyxPQUFPLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksb0JBQWEsRUFBRTtnQkFDakIsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7Z0JBQ2hFLE9BQU8sWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUM7YUFDM0M7WUFFRCxpQ0FBaUM7WUFDakMsTUFBTSxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFDLEdBQUcsdUNBQWtCLENBQ3BELGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLElBQUksQ0FBQyxFQUN0RSxHQUFHLEVBQUUsWUFBWSxDQUNsQixDQUFDO1lBRUYsTUFBTSxFQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBQyxHQUFHLHVDQUFrQixDQUMvRCxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxJQUFJLENBQUMsRUFDekUsR0FBRyxFQUFFLGVBQWUsQ0FDckIsQ0FBQztZQUNGLHVDQUF1QztZQUN2QyxJQUFJLEdBQUcsRUFBRTtnQkFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ3BFLHVDQUF1QztZQUN2QyxJQUFJLE1BQU0sRUFBRTtnQkFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxzQkFBc0IsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLGlFQUFpRTtZQUNqRSxnQ0FBZ0M7WUFDaEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3BDLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUM1QixXQUFXLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzNCO1lBRUQsS0FBSyxNQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQ3ZDLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUM1QixjQUFjLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQzlCO1lBRUQsTUFBTSxXQUFXLG1DQUNaLE1BQU0sS0FDVCxZQUFZLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtvQkFDM0UsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO29CQUMzQixPQUFPLEdBQUcsQ0FBQztnQkFDYixDQUFDLEVBQUUsRUFBNkIsQ0FBQyxFQUNqQyxlQUFlLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtvQkFDakYsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO29CQUMzQixPQUFPLEdBQUcsQ0FBQztnQkFDYixDQUFDLEVBQUUsRUFBNkIsQ0FBQyxHQUNsQyxDQUFDO1lBRUYsMkJBQTJCO1lBRTNCLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNoQyxpR0FBaUc7WUFFakcsTUFBTSxFQUFFLEdBQW1CO2dCQUN6QixFQUFFLEVBQUUsS0FBSztnQkFDVCxpQkFBaUIsRUFBRSxNQUFNO2dCQUN6QixvQkFBb0IsRUFBRSxTQUFTO2dCQUMvQixXQUFXO2dCQUNYLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUN2RCxrQkFBa0I7Z0JBQ2xCLHFCQUFxQjtnQkFDckIsMEVBQTBFO2dCQUMxRSxnQkFBZ0I7Z0JBQ2hCLG1CQUFtQjtnQkFDbkIsZUFBZTtnQkFDZixpQkFBaUI7YUFDbEIsQ0FBQztZQUNGLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoQyx5Q0FBeUM7UUFDM0MsQ0FBQztRQUNELGlCQUFpQixDQUFDLEtBQUssRUFBRSxFQUFDLE9BQU8sRUFBRSxFQUFDLEdBQUcsRUFBQyxFQUErQjtRQUN2RSxDQUFDO1FBQ0Qsc0JBQXNCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxFQUFvRDtZQUNqRyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUNELGlCQUFpQixDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBaUQ7WUFDNUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUMvQyxDQUFDO0tBQ0Y7Q0FDRixDQUFDLENBQUM7QUFFVSxRQUFBLGdCQUFnQixHQUFHLG9CQUFZLENBQUMsa0JBQWtCLENBQUMsYUFBSyxDQUFDLENBQUM7QUFFdkUsd0VBQXdFO0FBQ3hFOztHQUVHO0FBQ0gsb0JBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7SUFDdkMsT0FBTyxZQUFLLENBQ1YsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMxQyxnQ0FBb0IsRUFBRSxFQUN0QixlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDUiwrQkFBYyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7SUFDbkMsQ0FBQyxDQUFDLEVBQ0YsMEJBQWMsRUFBRSxDQUNqQjtJQUVELGlCQUFpQjtJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUFlLENBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFDdkQscUJBQVMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxjQUFjLEVBQUMsRUFBQyxFQUFFLEVBQUU7UUFDdEQsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFeEIsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQzNDLGdDQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQ25FLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDaEIsZUFBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUN2RCxDQUFDO1FBRUYsSUFBSSxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRTtZQUNyQyxPQUFPLFlBQUssQ0FBQyxxQkFBcUIsRUFBRSxTQUFFLENBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDdEU7YUFBTTtZQUNMLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ25CLG9CQUFTLENBQUMsZ0JBQU0sRUFBRSxDQUFDLENBQUM7YUFDckI7WUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsSUFBSSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDL0Msd0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO29CQUMzQixrQ0FBa0M7b0JBQ2xDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUM7Z0JBQy9DLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFDRCw4QkFBOEI7WUFDOUIsd0JBQWdCLENBQUMsbUJBQW1CLENBQUMsRUFBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sU0FBRSxFQUFFLENBQUM7U0FDYjtJQUNILENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakI7SUFFRCxjQUFjO0lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBZSxDQUFDLGFBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQ3JELHFCQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2IsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUNuQyx1QkFBZSxDQUFDLGFBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFDakQsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQ1AsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRTtnQkFDbEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUU7b0JBQzlDLE1BQU0sSUFBSSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUM3Qyx3QkFBZ0IsQ0FBQyxhQUFhLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7aUJBQ25GO2FBQ0Y7UUFDSCxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0YsT0FBTyxZQUFLLENBQUMsZ0JBQWdCLEVBQUUsV0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakIsRUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUFlLENBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxFQUM3RCxxQkFBUyxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFFO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLFFBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztRQUMzQyxNQUFNLEtBQUssR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sRUFBRSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUMsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLE9BQU8sU0FBRSxFQUFFLENBQUM7UUFDZCxNQUFNLEdBQUcsR0FBa0I7WUFDekIsR0FBRyxFQUFFLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDcEUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDeEUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFrQixDQUFDO1FBQzVDLCtCQUErQjtRQUMvQiw4Q0FBOEM7UUFDOUMsMkVBQTJFO1FBQzNFLGtFQUFrRTtRQUNsRSxzRUFBc0U7UUFDdEUsd0NBQXdDO1FBQ3hDLE1BQU07UUFDTixJQUFJO1FBQ0osT0FBTyxXQUFJLENBQUMsMkNBQTJCLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQ3RELENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLEVBQ0YsMEJBQWMsRUFBRSxDQUNqQjtJQUNELCtCQUErQjtJQUMvQixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLGdDQUFvQixFQUFFLEVBQzlDLGVBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRTtRQUNQLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDbkMsMkVBQTJFO1FBQzNFLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLEVBQ0YsZ0JBQUksQ0FBVyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM3QixNQUFNLFFBQVEsR0FBRyxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDMUMsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDekMsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLEVBQUU7Z0JBQzFCLHdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQzthQUMzQztZQUNELGdCQUFnQixFQUFFLENBQUM7U0FDcEI7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakIsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUFlLENBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUMzRCxvQkFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQy9DLE9BQU8sUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNwQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUNqQyxnQ0FBb0IsRUFBRSxFQUN0QixrQkFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUN4QixnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNQLHFCQUFTLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRyxDQUFDLENBQUMsQ0FBQyxFQUM1QyxlQUFHLENBQUMsR0FBRyxFQUFFO1lBQ1AsTUFBTSxRQUFRLEdBQ1osMkJBQTJCLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUU1RSxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDbEMsS0FBSyxNQUFNLEVBQUUsSUFBSSxRQUFRLEVBQUU7b0JBQ3pCLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNyQjtZQUNILENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNOLHdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBRSxDQUFDLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBQzFGLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsRUFDRiwwQkFBYyxFQUFFLENBQ2pCLEVBQ0QsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNwRCxPQUFPLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDcEIsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFFLENBQUMsY0FBYyxDQUFDLEVBQy9DLGdDQUFvQixFQUFFLEVBQ3RCLGtCQUFNLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQSxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUNsRCxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ2hCLGVBQUcsQ0FBQyxHQUFHLEVBQUU7WUFDUCxPQUFPLHdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUMsR0FBRyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFDLENBQUMsQ0FBQztRQUNwRixDQUFDLENBQUMsRUFDRiwwQkFBYyxFQUFFLENBQ2pCLENBQUM7SUFDSixDQUFDLENBQUMsRUFDRixRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQ2IsZUFBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUN0QixnQ0FBb0IsRUFBRSxFQUN0QixlQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUNwRCxnQ0FBb0IsRUFBRSxFQUN0QixxQkFBUyxDQUFDLEdBQUcsRUFBRTtRQUNiLG1DQUFtQztRQUNuQyxPQUFPLFlBQUssQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUM1RSxlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQzVCLGdDQUFvQixFQUFFLEVBQ3RCLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1AsZUFBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1osa0JBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUU7Z0JBQy9CLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDLENBQUMsQ0FBQztJQUNOLENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakIsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUFlLENBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsYUFBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsRUFDakYscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLEVBQzVDLDBCQUFjLEVBQUUsQ0FDakIsQ0FDRixDQUFDLElBQUksQ0FDSixzQkFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMxQyxPQUFPLFNBQUUsRUFBRSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQ0gsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDO0FBRUgsU0FBZ0IsUUFBUTtJQUN0QixPQUFPLG9CQUFZLENBQUMsVUFBVSxDQUFDLGFBQUssQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFGRCw0QkFFQztBQUVELFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFLLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixhQUFhLENBQUMsSUFBWTtJQUN4QyxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNqRSxDQUFDO0FBSEQsc0NBR0M7QUFFRCxTQUFnQixZQUFZLENBQUMsSUFBWTtJQUN2QyxJQUFJLEdBQUcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxJQUFJLGNBQUksQ0FBQyxHQUFHLEtBQUssSUFBSTtRQUNuQixHQUFHLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDaEMsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBTEQsb0NBS0M7QUFFRCxTQUFnQixlQUFlLENBQUMsSUFBWTtJQUMxQyxPQUFPLGNBQUksQ0FBQyxRQUFRLENBQUMsaUJBQVUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNDLENBQUM7QUFGRCwwQ0FFQztBQUVELFFBQWUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLFFBQWtCO0lBQ3ZELEtBQUssTUFBTSxHQUFHLElBQUksUUFBUSxFQUFFO1FBQzFCLE1BQU0sUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLFFBQVEsRUFBRTtZQUNaLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO2dCQUM5QixNQUFNLEVBQUUsR0FBRyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMvQyxJQUFJLEVBQUU7b0JBQ0osTUFBTSxFQUFFLENBQUM7YUFDWjtTQUNGO0tBQ0Y7QUFDSCxDQUFDO0FBWEQsc0RBV0M7QUFFRCxTQUFnQixZQUFZO0lBQzFCLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztJQUNiLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNWLCtCQUFlLENBQUMsQ0FBQyxJQUFZLEVBQUUsRUFBRTtRQUMvQixHQUFHLElBQUksR0FBRyxDQUFDLEVBQUUsS0FBSyxJQUFJLEVBQUUsQ0FBQztRQUN6QixHQUFHLElBQUksSUFBSSxDQUFDO0lBQ2QsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRVYsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBVEQsb0NBU0M7QUFFRCxTQUFnQixjQUFjO0lBQzVCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDbEcsQ0FBQztBQUZELHdDQUVDO0FBRUQsU0FBZ0Isc0JBQXNCO0lBQ3BDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixNQUFNLFVBQVUsR0FBRyxRQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDMUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxJQUFJLFFBQVEsRUFBRSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQ25FLEdBQUcsSUFBSSxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUUsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDNUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztZQUMxRCxPQUFPLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzdDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNOLEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3JCLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDMUQsR0FBRyxJQUFJLFFBQVEsZUFBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksZUFBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxFQUFFO2dCQUNuRyxJQUFJLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1NBQ3pDO1FBQ0QsR0FBRyxJQUFJLElBQUksQ0FBQztLQUNiO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBbkJELHdEQW1CQztBQUVELDhDQUE4QztBQUM5Qyx3Q0FBd0M7QUFDeEMsbURBQW1EO0FBQ25ELGlDQUFpQztBQUNqQyxxRkFBcUY7QUFDckYsU0FBUztBQUNULE9BQU87QUFFUCwwQkFBMEI7QUFDMUIsZ0ZBQWdGO0FBQ2hGLElBQUk7QUFFSixTQUFTLGtCQUFrQjtJQUN6QixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDaEUsTUFBTSxXQUFXLEdBQUcsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQzNDLE1BQU0sUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQzVFLE1BQU0sS0FBSyxHQUFHLDZCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUFNLElBQUksRUFBQyxFQUFFO1FBQ3RELE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEUsSUFBSyxRQUFRLEtBQUssT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUN0RCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsTUFBTSxDQUFDLHVCQUF1QixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUQ7SUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sU0FBUyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsaUJBQVUsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzFELElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRTtRQUM1QixNQUFNLE9BQU8sR0FBbUIsRUFBRSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLDZCQUFrQixDQUFDLFNBQVMsRUFBRSxDQUFNLElBQUksRUFBQyxFQUFFO1lBQ3ZELE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbkUsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDaEMsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixjQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7YUFDekU7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUM7S0FDaEQ7SUFDRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFHRCxTQUFlLGlCQUFpQjs7UUFDOUIsTUFBTSxRQUFRLEdBQUcsaUJBQVUsRUFBRSxDQUFDO1FBQzlCLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDM0MsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsNENBQTRDLENBQUMsRUFBRSxjQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBQzNJLGlCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLEVBQUUsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO1FBQ2pHLGlCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDLEVBQUUsUUFBUSxHQUFHLFNBQVMsQ0FBQyxDQUFDO1FBQ3BHLGlCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLGlCQUFpQixFQUFFLCtCQUErQixDQUFDLEVBQUUsUUFBUSxHQUFHLDJCQUEyQixDQUFDLENBQUM7UUFDckksNENBQTRDO1FBQzVDLHNJQUFzSTtRQUN4SSxNQUFNLGtCQUFvQixFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFFN0Msa0JBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFMUIsb0JBQVMsQ0FBQyxnQkFBTSxFQUFFLENBQUMsQ0FBQztRQUVwQixNQUFNLFdBQVcsR0FBRyxjQUFjLEVBQUUsQ0FBQztRQUVyQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzNCLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QixpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxFQUFFLE1BQU0sR0FBRyxjQUFjLENBQUMsQ0FBQztRQUMzRixDQUFDLENBQUMsQ0FBQztRQUVILE1BQU0sbUJBQW1CLEVBQUUsQ0FBQztRQUM1QixrQkFBa0IsRUFBRSxDQUFDO1FBRXJCLE1BQU0sZ0JBQWdCLEVBQUUsQ0FBQztRQUV6QixxQ0FBcUIsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLHdCQUFnQixDQUFDLGlCQUFpQixDQUFDLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUMsQ0FBQztJQUNsSCxDQUFDO0NBQUE7QUFFRCxTQUFlLGdCQUFnQjs7UUFDN0IsT0FBTyxDQUFDLHdEQUFhLHFCQUFxQixHQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDaEYsaUJBQVMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQ2hELGlDQUFpQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUFBO0FBRUQsU0FBZSxnQkFBZ0IsQ0FBQyxFQUFrQjs7UUFDaEQsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sbUJBQW1CLEdBQUcsRUFBdUMsQ0FBQztRQUVwRSxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDMUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdkI7UUFFRCxJQUFJLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDdEUsK0VBQStFO1lBQy9FLGdDQUFnQztZQUNoQyxNQUFNLDZCQUFrQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDdEMsTUFBTSxXQUFXLEdBQUcsa0JBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxzQkFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDO1lBQ0gseUNBQXlDO1lBRXpDLHVCQUF1QjtZQUN2QixNQUFNLGVBQWUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUMxRCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDN0Msa0JBQUUsQ0FBQyxhQUFhLENBQUMsZUFBZSxFQUFFLEVBQUUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDN0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUV4RCxJQUFJO2dCQUNGLE1BQU0sbUJBQUcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNoRCxNQUFNLG1CQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQzthQUNoRDtZQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNWLHVDQUF1QztnQkFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3pCO1lBQ0QsMERBQTBEO1lBQzFELGtCQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDL0QsTUFBTSxlQUFlLEVBQUUsQ0FBQztTQUN6QjtRQUVELFNBQVMsZUFBZTtZQUN0QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxFQUFDLEVBQUUsRUFBRTtnQkFDN0QsT0FBTyx3QkFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsa0JBQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQztJQUNILENBQUM7Q0FBQTtBQUVELFNBQWUsbUJBQW1COztRQUNoQyxNQUFNLEVBQUUsR0FBRyxDQUFDLHdEQUFhLG1CQUFtQixHQUFDLENBQUMsQ0FBQztRQUUvQyxNQUFNLFVBQVUsR0FBK0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6RCxNQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2xDLGtFQUFrRTtRQUNsRSxNQUFNLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQzNDLGVBQUcsQ0FBQyxDQUFDLEVBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUMsRUFBRSxFQUFFO1lBQzdCLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDdkIsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDM0IsTUFBTSxJQUFJLEdBQUcseUJBQXlCLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDMUUsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQixVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWQsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUM5Qyx3QkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUMsQ0FBQyxDQUFDO1NBQ3REO1FBQ0Qsd0JBQWdCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUFBO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsaUJBQWlCLENBQUMsVUFBa0IsRUFBRSxXQUFXLEdBQUcsS0FBSyxFQUN2RSxnQkFBeUI7SUFDekIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBRSxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUM3RCxPQUFPLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDcEYsQ0FBQztBQUpELDhDQUlDO0FBQ0Q7Ozs7R0FJRztBQUNILFFBQVEsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLEtBQW9CLEVBQUUsWUFBb0I7SUFDOUUsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUUsQ0FBQyxpQkFBaUIsQ0FBQztJQUNoRixNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUN4RixDQUFDLGlCQUFpQixDQUFDLFlBQVksRUFBRSxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN0RSxLQUFLLE1BQU0sSUFBSSxJQUFJLE9BQU8sRUFBRTtRQUMxQixJQUFJLElBQUksSUFBSSxJQUFJO1lBQ2QsU0FBUztRQUNYLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxLQUFLLGlCQUFpQixFQUFFO2dCQUM1RCxNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FDMUIsY0FBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBVSxFQUFFLEVBQUUsWUFBWSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUUsY0FBYyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQ2QsTUFBTSxFQUFFLENBQUM7aUJBQ1Y7YUFDRjtTQUNGO0tBQ0Y7QUFDSCxDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBUyx5QkFBeUIsQ0FBQyxVQUFrQixFQUFFLElBQVMsRUFBRSxXQUFXLEdBQUcsS0FBSyxFQUNuRixnQkFBeUI7SUFDekIsTUFBTSxDQUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsTUFBTSxNQUFNLEdBQWdCO1FBQzFCLFNBQVMsRUFBRSxDQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtRQUNmLEtBQUssRUFBRSxDQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1osSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7UUFDN0YsSUFBSTtRQUNKLFFBQVEsRUFBRSxrQkFBRSxDQUFDLFlBQVksQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELFdBQVc7S0FDWixDQUFDO0lBQ0YsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQztBQUVELFNBQVMsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFVO0lBQ2xDLElBQUksZ0JBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQjtJQUNELGtCQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0QiwwQkFBMEI7SUFDMUIsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuQixFQUFFLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjs7UUFFM0MsRUFBRSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBWSxFQUFFLEVBQVU7SUFDakQsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsaUJBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBZTtJQUNwQyxrQkFBa0I7SUFDbEIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDcEQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMxQixNQUFNLE9BQU8sR0FBRyxhQUFhO1lBQzNCLE9BQU8saUJBQVUsRUFBRSxLQUFLO1lBQ3hCLGtCQUFrQjtZQUNsQixpRUFBaUU7WUFDakUsNERBQTRELE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDdkcsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDO1lBQ3hDLGtCQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztRQUNyQyxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGtCQUFPLEVBQUU7WUFDWixxQkFBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlEO0tBQ0Y7SUFDRCxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB0eXBlIHtPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7dGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBkaXN0aW5jdFVudGlsQ2hhbmdlZCwgZmlsdGVyLCBtYXAsIHN3aXRjaE1hcCwgbWVyZ2VNYXAsXG4gIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9jbWQvdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiB9IGZyb20gJy4uL2RlcGVuZGVuY3ktaG9pc3Rlcic7XG5pbXBvcnQgeyB3cml0ZVRzY29uZmlnNHByb2plY3QsIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSB9IGZyb20gJy4uL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7IGZpbmRBbGxQYWNrYWdlcyB9IGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgc2V0UHJvamVjdExpc3R9IGZyb20gJy4uL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Um9vdERpciwgaXNEcmNwU3ltbGluayB9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IGNsZWFuSW52YWxpZFN5bWxpbmtzLCB7IGlzV2luMzIsIGxpc3RNb2R1bGVTeW1saW5rcywgdW5saW5rQXN5bmMsIF9zeW1saW5rQXN5bmMgfSBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgeyBhY3Rpb25zIGFzIF9jbGVhbkFjdGlvbnMgfSBmcm9tICcuLi9jbWQvY2xpLWNsZWFuJztcbmltcG9ydCB0eXBlIHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2NvcGU6IHN0cmluZztcbiAgc2hvcnROYW1lOiBzdHJpbmc7XG4gIGpzb246IGFueTtcbiAgcGF0aDogc3RyaW5nO1xuICByZWFsUGF0aDogc3RyaW5nO1xuICBpc0luc3RhbGxlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlc1N0YXRlIHtcbiAgc3JjUGFja2FnZXM6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLyoqIEtleSBpcyByZWxhdGl2ZSBwYXRoIHRvIHJvb3Qgd29ya3NwYWNlICovXG4gIHdvcmtzcGFjZXM6IE1hcDxzdHJpbmcsIFdvcmtzcGFjZVN0YXRlPjtcbiAgcHJvamVjdDJQYWNrYWdlczogTWFwPHN0cmluZywgc3RyaW5nW10+O1xuICBsaW5rZWREcmNwOiBQYWNrYWdlSW5mbyB8IG51bGw7XG4gIGdpdElnbm9yZXM6IHtbZmlsZTogc3RyaW5nXTogc3RyaW5nfTtcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbn1cblxuY29uc3Qge3N5bWxpbmtEaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgd29ya3NwYWNlczogbmV3IE1hcCgpLFxuICBwcm9qZWN0MlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGVycm9yczogW10sXG4gIGdpdElnbm9yZXM6IHt9LFxuICBsaW5rZWREcmNwOiBpc0RyY3BTeW1saW5rID9cbiAgICBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUoXG4gICAgICBnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpLCBmYWxzZSwgZ2V0Um9vdERpcigpKVxuICAgIDogbnVsbFxufTtcblxuaW50ZXJmYWNlIFdvcmtzcGFjZVN0YXRlIHtcbiAgaWQ6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLyoqIGluc3RhbGxlZCBEUiBjb21wb25lbnQgcGFja2FnZXMgW25hbWUsIHZlcnNpb25dKi9cbiAgaW5zdGFsbGVkQ29tcG9uZW50cz86IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvPjtcbiAgLy8gLyoqIG90aGVyIDNyZCBwYXJ0eSBkZXBlbmRlbmNpZXMgaW4gdHVwbGUgb2YgbmFtZSBhbmQgdmVyc2lvbiBwYWlyICovXG4gIC8vIGRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyBkZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvLyBob2lzdGVkRGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ307XG4gIC8vIGhvaXN0ZWREZXZEZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgLyoqIERvIHRoaXMgYWN0aW9uIGFmdGVyIGFueSBsaW5rZWQgcGFja2FnZSBpcyByZW1vdmVkIG9yIGFkZGVkICAqL1xuICAgIGluaXRSb290RGlyKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7aG9pc3RlZERpcjogc3RyaW5nfSB8IHVuZGVmaW5lZCB8IG51bGw+KSB7XG4gICAgfSxcblxuICAgIC8qKiBDaGVjayBhbmQgaW5zdGFsbCBkZXBlbmRlbmN5LCBpZiB0aGVyZSBpcyBsaW5rZWQgcGFja2FnZSB1c2VkIGluIG1vcmUgdGhhbiBvbmUgd29ya3NwYWNlLCBcbiAgICAgKiB0byBzd2l0Y2ggYmV0d2VlbiBkaWZmZXJlbnQgd29ya3NwYWNlICovXG4gICAgaW5pdFdvcmtzcGFjZShkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nLCBpc0ZvcmNlOiBib29sZWFuLCBsb2dIYXNDb25maWdlZDogYm9vbGVhbn0+KSB7XG4gICAgfSxcbiAgICBfc3luY1BhY2thZ2VzU3RhdGUoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPFBhY2thZ2VJbmZvW10+KSB7XG4gICAgICBkLnNyY1BhY2thZ2VzID0gbmV3IE1hcCgpO1xuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZCkge1xuICAgICAgICBkLnNyY1BhY2thZ2VzLnNldChwa0luZm8ubmFtZSwgcGtJbmZvKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIF91cGRhdGVQYWNrYWdlU3RhdGUoZCwge3BheWxvYWQ6IGpzb25zfTogUGF5bG9hZEFjdGlvbjxhbnlbXT4pIHtcbiAgICAvLyAgIGZvciAoY29uc3QganNvbiBvZiBqc29ucykge1xuICAgIC8vICAgICBjb25zdCBwa2cgPSBkLnNyY1BhY2thZ2VzLmdldChqc29uLm5hbWUpO1xuICAgIC8vICAgICBpZiAocGtnID09IG51bGwpIHtcbiAgICAvLyAgICAgICBjb25zb2xlLmVycm9yKFxuICAgIC8vICAgICAgICAgYFtwYWNrYWdlLW1nci5pbmRleF0gcGFja2FnZSBuYW1lIFwiJHtqc29uLm5hbWV9XCIgaW4gcGFja2FnZS5qc29uIGlzIGNoYW5nZWQgc2luY2UgbGFzdCB0aW1lLFxcbmAgK1xuICAgIC8vICAgICAgICAgJ3BsZWFzZSBkbyBcImluaXRcIiBhZ2FpbiBvbiB3b3Jrc3BhY2Ugcm9vdCBkaXJlY3RvcnknKTtcbiAgICAvLyAgICAgICBjb250aW51ZTtcbiAgICAvLyAgICAgfVxuICAgIC8vICAgICBwa2cuanNvbiA9IGpzb247XG4gICAgLy8gICB9XG4gICAgLy8gfSxcbiAgICBhZGRQcm9qZWN0KGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgaWYgKCFkLnByb2plY3QyUGFja2FnZXMuaGFzKGRpcikpIHtcbiAgICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KGRpciwgW10pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWxldGVQcm9qZWN0KGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjxzdHJpbmdbXT4pIHtcbiAgICAgIGZvciAoY29uc3QgcmF3RGlyIG9mIGFjdGlvbi5wYXlsb2FkKSB7XG4gICAgICAgIGNvbnN0IGRpciA9IHBhdGhUb1Byb2pLZXkocmF3RGlyKTtcbiAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLmRlbGV0ZShkaXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgX2hvaXN0V29ya3NwYWNlRGVwcyhzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcInNyY1BhY2thZ2VzXCIgaXMgbnVsbCwgbmVlZCB0byBydW4gYGluaXRgIGNvbW1hbmQgZmlyc3QnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKTtcbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGV2RGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgICBjb25zdCB1cGRhdGluZ0RldkRlcHMgPSB7Li4ucGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXZEZXBzID0gW107XG4gICAgICBkZXZEZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcblxuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbX2hvaXN0V29ya3NwYWNlRGVwc10gZHItY29tcC1wYWNrYWdlIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuXG4gICAgICAvLyBwa2pzb25MaXN0LnB1c2godXBkYXRpbmdKc29uKTtcbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGVwcywgbXNnfSA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcy5nZXQoZW50cnlbMF0pIS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RlcHNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHtob2lzdGVkOiBob2lzdGVkRGV2RGVwcywgbXNnOiBtc2dEZXZ9ID0gbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGVudHJ5ID0+IHN0YXRlLnNyY1BhY2thZ2VzLmdldChlbnRyeVswXSkhLmpzb24pLFxuICAgICAgICBkaXIsIHVwZGF0aW5nRGV2RGVwc1xuICAgICAgKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgaWYgKG1zZygpKSBjb25zb2xlLmxvZyhgV29ya3NwYWNlIFwiJHtkaXJ9XCIgZGVwZW5kZW5jaWVzOlxcbmAsIG1zZygpKTtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgaWYgKG1zZ0RldigpKSBjb25zb2xlLmxvZyhgV29ya3NwYWNlIFwiJHtkaXJ9XCIgZGV2RGVwZW5kZW5jaWVzOlxcbmAsIG1zZ0RldigpKTtcbiAgICAgIC8vIEluIGNhc2Ugc29tZSBwYWNrYWdlcyBoYXZlIHBlZXIgZGVwZW5kZW5jaWVzIG9mIG90aGVyIHBhY2thZ2VzXG4gICAgICAvLyByZW1vdmUgdGhlbSBmcm9tIGRlcGVuZGVuY2llc1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgaG9pc3RlZERlcHMua2V5cygpKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoa2V5KSlcbiAgICAgICAgICBob2lzdGVkRGVwcy5kZWxldGUoa2V5KTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBrZXkgb2YgaG9pc3RlZERldkRlcHMua2V5cygpKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoa2V5KSlcbiAgICAgICAgICBob2lzdGVkRGV2RGVwcy5kZWxldGUoa2V5KTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuICAgICAgICAuLi5wa2pzb24sXG4gICAgICAgIGRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGVwcy5lbnRyaWVzKCkpLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSksXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogQXJyYXkuZnJvbShob2lzdGVkRGV2RGVwcy5lbnRyaWVzKCkpLnJlZHVjZSgoZGljLCBbbmFtZSwgaW5mb10pID0+IHtcbiAgICAgICAgICBkaWNbbmFtZV0gPSBpbmZvLmJ5WzBdLnZlcjtcbiAgICAgICAgICByZXR1cm4gZGljO1xuICAgICAgICB9LCB7fSBhcyB7W2tleTogc3RyaW5nXTogc3RyaW5nfSlcbiAgICAgIH07XG5cbiAgICAgIC8vIGNvbnNvbGUubG9nKGluc3RhbGxKc29uKVxuXG4gICAgICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleShkaXIpO1xuICAgICAgLy8gY29uc3QgaW5zdGFsbGVkQ29tcCA9IGxpc3RJbnN0YWxsZWRDb21wNFdvcmtzcGFjZShzdGF0ZS53b3Jrc3BhY2VzLCBzdGF0ZS5zcmNQYWNrYWdlcywgd3NLZXkpO1xuXG4gICAgICBjb25zdCB3cDogV29ya3NwYWNlU3RhdGUgPSB7XG4gICAgICAgIGlkOiB3c0tleSxcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb246IHBranNvbixcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHBranNvblN0cixcbiAgICAgICAgaW5zdGFsbEpzb24sXG4gICAgICAgIGluc3RhbGxKc29uU3RyOiBKU09OLnN0cmluZ2lmeShpbnN0YWxsSnNvbiwgbnVsbCwgJyAgJyksXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcyxcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzXG4gICAgICAgIC8vIGluc3RhbGxlZENvbXBvbmVudHM6IG5ldyBNYXAoaW5zdGFsbGVkQ29tcC5tYXAocGtnID0+IFtwa2cubmFtZSwgcGtnXSkpXG4gICAgICAgIC8vIGRlcGVuZGVuY2llcyxcbiAgICAgICAgLy8gZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgICAvLyBob2lzdGVkRGVwcyxcbiAgICAgICAgLy8gaG9pc3RlZERldkRlcHNcbiAgICAgIH07XG4gICAgICBzdGF0ZS53b3Jrc3BhY2VzLnNldCh3c0tleSwgd3ApO1xuICAgICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tJywgZGlyKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiBQYWNrYWdlSW5mb1tdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUdpdElnbm9yZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZ30+KSB7XG4gICAgICBkLmdpdElnbm9yZXNbcGF5bG9hZC5maWxlXSA9IHBheWxvYWQuY29udGVudDtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG4vLyBjb25zdCByZWFkRmlsZUFzeW5jID0gcHJvbWlzaWZ5PHN0cmluZywgc3RyaW5nLCBzdHJpbmc+KGZzLnJlYWRGaWxlKTtcbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdExpc3QoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgLy8gIGluaXRXb3Jrc3BhY2VcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFdvcmtzcGFjZSksXG4gICAgICBzd2l0Y2hNYXAoKHtwYXlsb2FkOiB7ZGlyLCBpc0ZvcmNlLCBsb2dIYXNDb25maWdlZH19KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gICAgICAgIGNvbnN0IGhvaXN0T25QYWNrYWdlQ2hhbmdlcyA9IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5zcmNQYWNrYWdlcyA9PT0gczIuc3JjUGFja2FnZXMpLFxuICAgICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgICAgbWFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSkpXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKGdldFN0YXRlKCkuc3JjUGFja2FnZXMuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBtZXJnZShob2lzdE9uUGFja2FnZUNoYW5nZXMsIG9mKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIoKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmICghbG9nSGFzQ29uZmlnZWQpIHtcbiAgICAgICAgICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKGlzRm9yY2UgJiYgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgICAgICAgICAgLy8gY2xlYW4gdG8gdHJpZ2dlciBpbnN0YWxsIGFjdGlvblxuICAgICAgICAgICAgICBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbEpzb25TdHIgPSAnJztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKTtcbiAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pO1xuICAgICAgICAgIHJldHVybiBvZigpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIpLFxuICAgICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAgICAgY29uc3QgZ29Jbml0V29ya3NwYWNlJCA9IGFjdGlvbiQucGlwZShcbiAgICAgICAgICBvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY1BhY2thZ2VzU3RhdGUpLFxuICAgICAgICAgIHRha2UoMSksXG4gICAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICAgIGlmIChnZXRTdGF0ZSgpLndvcmtzcGFjZXMuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBrZXkgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpO1xuICAgICAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuaW5pdFdvcmtzcGFjZSh7ZGlyOiBwYXRoLCBpc0ZvcmNlOiBmYWxzZSwgbG9nSGFzQ29uZmlnZWQ6IHRydWV9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiBtZXJnZShnb0luaXRXb3Jrc3BhY2UkLCBmcm9tKGluaXRSb290RGlyZWN0b3J5KCkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyksXG4gICAgICBjb25jYXRNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCBzcmNQYWNrYWdlcyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgICAgICAgaWYgKHdzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIG9mKCk7XG4gICAgICAgIGNvbnN0IHBrczogUGFja2FnZUluZm9bXSA9IFtcbiAgICAgICAgICAuLi53cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKChbbmFtZSwgdmVyXSkgPT4gc3JjUGFja2FnZXMuZ2V0KG5hbWUpKSxcbiAgICAgICAgICAuLi53cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKChbbmFtZSwgdmVyXSkgPT4gc3JjUGFja2FnZXMuZ2V0KG5hbWUpKVxuICAgICAgICBdLmZpbHRlcihwayA9PiBwayAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuICAgICAgICAvLyBpZiAoZ2V0U3RhdGUoKS5saW5rZWREcmNwKSB7XG4gICAgICAgIC8vICAgY29uc3QgZHJjcCA9IGdldFN0YXRlKCkubGlua2VkRHJjcCEubmFtZTtcbiAgICAgICAgLy8gICBjb25zdCBzcGFjZUpzb24gPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEub3JpZ2luSW5zdGFsbEpzb247XG4gICAgICAgIC8vICAgaWYgKHNwYWNlSnNvbi5kZXBlbmRlbmNpZXMgJiYgc3BhY2VKc29uLmRlcGVuZGVuY2llc1tkcmNwXSB8fFxuICAgICAgICAvLyAgICAgc3BhY2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBzcGFjZUpzb24uZGV2RGVwZW5kZW5jaWVzW2RyY3BdKSB7XG4gICAgICAgIC8vICAgICBwa3MucHVzaChnZXRTdGF0ZSgpLmxpbmtlZERyY3AhKTtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cbiAgICAgICAgcmV0dXJuIGZyb20od3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHBheWxvYWQuZGlyLCBwa3MsXG4gICAgICAgICAgKGZpbGUsIGNvbnRlbnQpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiB7XG4gICAgICAgIGNvbnN0IGtleXMgPSBBcnJheS5mcm9tKHdzLmtleXMoKSk7XG4gICAgICAgIC8vIHNldFdvcmtzcGFjZUZvclJlY2lwZShrZXlzLm1hcChrZXkgPT4gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwga2V5KSkpO1xuICAgICAgICByZXR1cm4ga2V5cztcbiAgICAgIH0pLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnTmV3IHdvcmtzcGFjZTogJywgbmV3QWRkZWQpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHtkaXJ9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgd3JpdGVDb25maWdGaWxlcygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2UpLFxuICAgICAgbWVyZ2VNYXAoYWN0aW9uID0+IHtcbiAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoYWN0aW9uLnBheWxvYWQuZGlyKTtcbiAgICAgICAgcmV0dXJuIGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBmaWx0ZXIod3MgPT4gd3MgIT0gbnVsbCksXG4gICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzISkpKSxcbiAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGtnRW50cnkgPVxuICAgICAgICAgICAgICBsaXN0SW5zdGFsbGVkQ29tcDRXb3Jrc3BhY2UoZ2V0U3RhdGUoKSwgd29ya3NwYWNlS2V5KGFjdGlvbi5wYXlsb2FkLmRpcikpO1xuXG4gICAgICAgICAgICBjb25zdCBpbnN0YWxsZWQgPSBuZXcgTWFwKChmdW5jdGlvbiooKTogR2VuZXJhdG9yPFtzdHJpbmcsIFBhY2thZ2VJbmZvXT4ge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ0VudHJ5KSB7XG4gICAgICAgICAgICAgICAgeWllbGQgW3BrLm5hbWUsIHBrXTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkoKSk7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiBkLndvcmtzcGFjZXMuZ2V0KHdzS2V5KSEuaW5zdGFsbGVkQ29tcG9uZW50cyA9IGluc3RhbGxlZCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbEpzb25TdHIpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbEpzb25TdHIgPT5pbnN0YWxsSnNvblN0ci5sZW5ndGggPiAwKSxcbiAgICAgICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICByZXR1cm4gYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7ZGlyOiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpfSk7XG4gICAgICAgIH0pLFxuICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pLFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMuZ2l0SWdub3JlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKGdpdElnbm9yZXMgPT4gT2JqZWN0LmtleXMoZ2l0SWdub3Jlcykuam9pbignLCcpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnJCQkJCQkJCQkJywgZmlsZXMpO1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS5naXRJZ25vcmVzKS5tYXAoZmlsZSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy5naXRJZ25vcmVzW2ZpbGVdKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIHNraXAoMSksXG4gICAgICAgICAgbWFwKGNvbnRlbnQgPT4ge1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFkZFByb2plY3QsIHNsaWNlLmFjdGlvbnMuZGVsZXRlUHJvamVjdCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gZnJvbShfc2NhblBhY2thZ2VBbmRMaW5rKCkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbcGFja2FnZS1tZ3IuaW5kZXhdJywgZXJyKTtcbiAgICAgIHJldHVybiBvZigpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKTogT2JzZXJ2YWJsZTxQYWNrYWdlc1N0YXRlPiB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZUtleShwYXRoOiBzdHJpbmcpIHtcbiAgbGV0IHJlbCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbiAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpXG4gICAgcmVsID0gcmVsLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcmV0dXJuIHJlbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1dvcmtzcGFjZShwYXRoOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFBhY2thZ2VzKCk6IHN0cmluZyB7XG4gIGxldCBvdXQgPSAnJztcbiAgbGV0IGkgPSAwO1xuICBmaW5kQWxsUGFja2FnZXMoKG5hbWU6IHN0cmluZykgPT4ge1xuICAgIG91dCArPSBgJHtpKyt9LiAke25hbWV9YDtcbiAgICBvdXQgKz0gJ1xcbic7XG4gIH0sICdzcmMnKTtcblxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJvamVjdExpc3QoKSB7XG4gIHJldHVybiBBcnJheS5mcm9tKGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5rZXlzKCkpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBwaikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpIHtcbiAgY29uc3QgY3dkID0gcHJvY2Vzcy5jd2QoKTtcbiAgY29uc3QgbGlua2VkUGtncyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGxldCBvdXQgPSAnJztcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dOYW1lc10gb2YgZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmVudHJpZXMoKSkge1xuICAgIG91dCArPSBgUHJvamVjdCAke3ByaiB8fCAnLid9XFxuYDtcbiAgICBjb25zdCBwa2dzID0gcGtnTmFtZXMubWFwKG5hbWUgPT4gbGlua2VkUGtncy5nZXQobmFtZSkhKTtcbiAgICBjb25zdCBtYXhXaWR0aCA9IHBrZ3MucmVkdWNlKChtYXhXaWR0aCwgcGspID0+IHtcbiAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgIHJldHVybiB3aWR0aCA+IG1heFdpZHRoID8gd2lkdGggOiBtYXhXaWR0aDtcbiAgICB9LCAwKTtcbiAgICBmb3IgKGNvbnN0IHBrIG9mIHBrZ3MpIHtcbiAgICAgIGNvbnN0IHdpZHRoID0gcGsubmFtZS5sZW5ndGggKyBway5qc29uLnZlcnNpb24ubGVuZ3RoICsgMTtcbiAgICAgIG91dCArPSBgICB8LSAke2NoYWxrLmN5YW4ocGsubmFtZSl9QCR7Y2hhbGsuZ3JlZW4ocGsuanNvbi52ZXJzaW9uKX0keycgJy5yZXBlYXQobWF4V2lkdGggLSB3aWR0aCl9YCArXG4gICAgICBgICR7UGF0aC5yZWxhdGl2ZShjd2QsIHBrLnJlYWxQYXRoKX1cXG5gO1xuICAgIH1cbiAgICBvdXQgKz0gJ1xcbic7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gdXBkYXRlTGlua2VkUGFja2FnZVN0YXRlKCkge1xuLy8gICBjb25zdCBqc29uU3RycyA9IGF3YWl0IFByb21pc2UuYWxsKFxuLy8gICAgIEFycmF5LmZyb20oZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkpXG4vLyAgICAgLm1hcCgoW25hbWUsIHBrSW5mb10pID0+IHtcbi8vICAgICAgIHJldHVybiByZWFkRmlsZUFzeW5jKFBhdGgucmVzb2x2ZShwa0luZm8ucmVhbFBhdGgsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKTtcbi8vICAgICB9KVxuLy8gICApO1xuXG4vLyAgIHdhcm5Vc2VsZXNzU3ltbGluaygpO1xuLy8gICBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQYWNrYWdlU3RhdGUoanNvblN0cnMubWFwKHN0ciA9PiBKU09OLnBhcnNlKHN0cikpKTtcbi8vIH1cblxuZnVuY3Rpb24gd2FyblVzZWxlc3NTeW1saW5rKCkge1xuICBjb25zdCBjaGVja0RpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdkaXN0JywgJ3N5bWxpbmtzJyk7XG4gIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICBjb25zdCBkb25lMSA9IGxpc3RNb2R1bGVTeW1saW5rcyhjaGVja0RpciwgYXN5bmMgbGluayA9PiB7XG4gICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoY2hlY2tEaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIGRyY3BOYW1lICE9PSBwa2dOYW1lICYmICFzcmNQYWNrYWdlcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsueWVsbG93KGBFeHRyYW5lb3VzIHN5bWxpbms6ICR7bGlua31gKSk7XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBwd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICBjb25zdCBmb3JiaWREaXIgPSBQYXRoLmpvaW4oZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmIChzeW1saW5rRGlyICE9PSBmb3JiaWREaXIpIHtcbiAgICBjb25zdCByZW1vdmVkOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICAgIGNvbnN0IGRvbmUyID0gbGlzdE1vZHVsZVN5bWxpbmtzKGZvcmJpZERpciwgYXN5bmMgbGluayA9PiB7XG4gICAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShmb3JiaWREaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChzcmNQYWNrYWdlcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgICAgcmVtb3ZlZC5wdXNoKHVubGlua0FzeW5jKGxpbmspKTtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKGBSZWR1bmRhbnQgc3ltbGluayBcIiR7UGF0aC5yZWxhdGl2ZShwd2QsIGxpbmspfVwiIHJlbW92ZWQuYCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKFtkb25lMSwgZG9uZTIsIC4uLnJlbW92ZWRdKTtcbiAgfVxuICByZXR1cm4gZG9uZTE7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gaW5pdFJvb3REaXJlY3RvcnkoKSB7XG4gIGNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuICBmcy5ta2RpcnBTeW5jKFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvY29uZmlnLmxvY2FsLXRlbXBsYXRlLnlhbWwnKSwgUGF0aC5qb2luKHJvb3RQYXRoLCAnZGlzdCcsICdjb25maWcubG9jYWwueWFtbCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9sb2c0anMuanMnKSwgcm9vdFBhdGggKyAnL2xvZzRqcy5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCByb290UGF0aCArICcvYXBwLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuc2VydmVyLnRtcGwudHMnKSwgcm9vdFBhdGggKyAnL21vZHVsZS1yZXNvbHZlLnNlcnZlci50cycpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgLy8gbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RlbXBsYXRlcycsICdtb2R1bGUtcmVzb2x2ZS5icm93c2VyLnRtcGwudHMnKSwgcm9vdFBhdGggKyAnL21vZHVsZS1yZXNvbHZlLmJyb3dzZXIudHMnKTtcbiAgYXdhaXQgY2xlYW5JbnZhbGlkU3ltbGlua3MoKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGguam9pbihyb290UGF0aCwgJ2xvZ3MnKSkpXG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpO1xuXG4gIGZzLm1rZGlycFN5bmMoc3ltbGlua0Rpcik7XG5cbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG5cbiAgcHJvamVjdERpcnMuZm9yRWFjaChwcmpkaXIgPT4ge1xuICAgIF93cml0ZUdpdEhvb2socHJqZGlyKTtcbiAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNsaW50Lmpzb24nKSwgcHJqZGlyICsgJy90c2xpbnQuanNvbicpO1xuICB9KTtcblxuICBhd2FpdCBfc2NhblBhY2thZ2VBbmRMaW5rKCk7XG4gIHdhcm5Vc2VsZXNzU3ltbGluaygpO1xuXG4gIGF3YWl0IHdyaXRlQ29uZmlnRmlsZXMoKTtcblxuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgKGZpbGUsIGNvbnRlbnQpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdyaXRlQ29uZmlnRmlsZXMoKSB7XG4gIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuLi9jbWQvY29uZmlnLXNldHVwJykpLmFkZHVwQ29uZmlncygoZmlsZSwgY29uZmlnQ29udGVudCkgPT4ge1xuICAgIHdyaXRlRmlsZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnZGlzdCcsIGZpbGUpLFxuICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzLmlkKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdJbnN0YWxsIGRlcGVuZGVuY2llcyBpbiAnICsgZGlyKTtcbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmcsIGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnMubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgaWYgKHdzLmxpbmtlZERlcGVuZGVuY2llcy5sZW5ndGggKyB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubGVuZ3RoID4gMCkge1xuICAgIC8vIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICAgIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyh0YXJnZXQsIGxpbmsgPT4ge1xuICAgICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgICBzeW1saW5rc0luTW9kdWxlRGlyLnB1c2goe2NvbnRlbnQ6IGxpbmtDb250ZW50LCBsaW5rfSk7XG4gICAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gICAgfSk7XG4gICAgLy8gX2NsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGxpbmtzKTtcblxuICAgIC8vIDMuIFJ1biBgbnBtIGluc3RhbGxgXG4gICAgY29uc3QgaW5zdGFsbEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbaW5pdF0gd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCB3cy5pbnN0YWxsSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7Y3dkOiBkaXJ9KS5wcm9taXNlO1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogZGlyfSkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGUsIGUuc3RhY2spO1xuICAgIH1cbiAgICAvLyA0LiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlKGluc3RhbGxKc29uRmlsZSwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIHJldHVybiBfc3ltbGlua0FzeW5jKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBfc2NhblBhY2thZ2VBbmRMaW5rKCkge1xuICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuXG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBjb25zdCBwa2dMaXN0OiBQYWNrYWdlSW5mb1tdID0gW107XG4gIC8vIGNvbnN0IHN5bWxpbmtzRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpO1xuICBhd2FpdCBybS5saW5rQ29tcG9uZW50c0FzeW5jKHN5bWxpbmtEaXIpLnBpcGUoXG4gICAgdGFwKCh7cHJvaiwganNvbkZpbGUsIGpzb259KSA9PiB7XG4gICAgICBpZiAoIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICBwcm9qUGtnTWFwLnNldChwcm9qLCBbXSk7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihqc29uRmlsZSwganNvbiwgZmFsc2UsIHN5bWxpbmtEaXIpO1xuICAgICAgcGtnTGlzdC5wdXNoKGluZm8pO1xuICAgICAgcHJvalBrZ01hcC5nZXQocHJvaikhLnB1c2goaW5mbyk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBmb3IgKGNvbnN0IFtwcmosIHBrZ3NdIG9mIHByb2pQa2dNYXAuZW50cmllcygpKSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtwcmosIHBrZ3N9KTtcbiAgfVxuICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jUGFja2FnZXNTdGF0ZShwa2dMaXN0KTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvKHBrSnNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQgPSBmYWxzZSxcbiAgc3ltTGlua1BhcmVudERpcj86IHN0cmluZyk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICByZXR1cm4gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlLCBqc29uLCBpc0luc3RhbGxlZCwgc3ltTGlua1BhcmVudERpcik7XG59XG4vKipcbiAqIExpc3QgdGhvc2UgaW5zdGFsbGVkIHBhY2thZ2VzIHdoaWNoIGFyZSByZWZlcmVuY2VkIGJ5IHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZSxcbiAqIHRob3NlIHBhY2thZ2VzIG11c3QgaGF2ZSBcImRyXCIgcHJvcGVydHkgaW4gcGFja2FnZS5qc29uIFxuICogQHBhcmFtIHdvcmtzcGFjZUtleSBcbiAqL1xuZnVuY3Rpb24qIGxpc3RJbnN0YWxsZWRDb21wNFdvcmtzcGFjZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgd29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgb3JpZ2luSW5zdGFsbEpzb24gPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgY29uc3QgZGVwSnNvbiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgPyBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzXSA6XG4gICAgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXTtcbiAgZm9yIChjb25zdCBkZXBzIG9mIGRlcEpzb24pIHtcbiAgICBpZiAoZGVwcyA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgIGlmICghc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcCkgJiYgZGVwICE9PSAnZHItY29tcC1wYWNrYWdlJykge1xuICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2VJbmZvKFxuICAgICAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpLCB0cnVlKTtcbiAgICAgICAgaWYgKHBrLmpzb24uZHIpIHtcbiAgICAgICAgICB5aWVsZCBwaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGU6IHN0cmluZywganNvbjogYW55LCBpc0luc3RhbGxlZCA9IGZhbHNlLFxuICBzeW1MaW5rUGFyZW50RGlyPzogc3RyaW5nKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBtID0gbW9kdWxlTmFtZVJlZy5leGVjKGpzb24ubmFtZSk7XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgc2hvcnROYW1lOiBtIVsyXSxcbiAgICBuYW1lOiBqc29uLm5hbWUsXG4gICAgc2NvcGU6IG0hWzFdLFxuICAgIHBhdGg6IHN5bUxpbmtQYXJlbnREaXIgPyBQYXRoLnJlc29sdmUoc3ltTGlua1BhcmVudERpciwganNvbi5uYW1lKSA6IFBhdGguZGlybmFtZShwa0pzb25GaWxlKSxcbiAgICBqc29uLFxuICAgIHJlYWxQYXRoOiBmcy5yZWFscGF0aFN5bmMoUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpKSxcbiAgICBpc0luc3RhbGxlZFxuICB9O1xuICByZXR1cm4gcGtJbmZvO1xufVxuXG5mdW5jdGlvbiBjcChmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKF8uc3RhcnRzV2l0aChmcm9tLCAnLScpKSB7XG4gICAgZnJvbSA9IGFyZ3VtZW50c1sxXTtcbiAgICB0byA9IGFyZ3VtZW50c1syXTtcbiAgfVxuICBmcy5jb3B5U3luYyhmcm9tLCB0byk7XG4gIC8vIHNoZWxsLmNwKC4uLmFyZ3VtZW50cyk7XG4gIGlmICgvWy9cXFxcXSQvLnRlc3QodG8pKVxuICAgIHRvID0gUGF0aC5iYXNlbmFtZShmcm9tKTsgLy8gdG8gaXMgYSBmb2xkZXJcbiAgZWxzZVxuICAgIHRvID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0byk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnY29weSB0byAlcycsIGNoYWxrLmN5YW4odG8pKTtcbn1cblxuZnVuY3Rpb24gbWF5YmVDb3B5VGVtcGxhdGUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB0bykpKVxuICAgIGNwKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGZyb20pLCB0byk7XG59XG5cbmZ1bmN0aW9uIF93cml0ZUdpdEhvb2socHJvamVjdDogc3RyaW5nKSB7XG4gIC8vIGlmICghaXNXaW4zMikge1xuICBjb25zdCBnaXRQYXRoID0gUGF0aC5yZXNvbHZlKHByb2plY3QsICcuZ2l0L2hvb2tzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGgpKSB7XG4gICAgY29uc3QgaG9va1N0ciA9ICcjIS9iaW4vc2hcXG4nICtcbiAgICAgIGBjZCBcIiR7Z2V0Um9vdERpcigpfVwiXFxuYCArXG4gICAgICAvLyAnZHJjcCBpbml0XFxuJyArXG4gICAgICAvLyAnbnB4IHByZXR0eS1xdWljayAtLXN0YWdlZFxcbicgKyAvLyBVc2UgYHRzbGludCAtLWZpeGAgaW5zdGVhZC5cbiAgICAgIGBub2RlIG5vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UvYmluL2RyY3AuanMgbGludCAtLXBqIFwiJHtwcm9qZWN0LnJlcGxhY2UoL1svXFxcXF0kLywgJycpfVwiIC0tZml4XFxuYDtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoICsgJy9wcmUtY29tbWl0JykpXG4gICAgICBmcy51bmxpbmsoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZ2l0UGF0aCArICcvcHJlLXB1c2gnLCBob29rU3RyKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnV3JpdGUgJyArIGdpdFBhdGggKyAnL3ByZS1wdXNoJyk7XG4gICAgaWYgKCFpc1dpbjMyKSB7XG4gICAgICBzcGF3bignY2htb2QnLCAnLVInLCAnK3gnLCBwcm9qZWN0ICsgJy8uZ2l0L2hvb2tzL3ByZS1wdXNoJyk7XG4gICAgfVxuICB9XG4gIC8vIH1cbn1cbiJdfQ==