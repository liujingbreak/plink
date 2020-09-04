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
        _installWorkspace(state, { payload: { workspaceKey } }) {
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
        return keys;
    }), operators_2.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            console.log('New workspace: ', newAdded);
            for (const ws of newAdded) {
                exports.actionDispatcher._installWorkspace({ workspaceKey: ws });
            }
            writeConfigFiles();
        }
        return curr;
    }), operators_2.ignoreElements()), ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(operators_2.map(s => s.workspaces.get(key).installJsonStr), operators_2.distinctUntilChanged(), operators_2.filter(installJsonStr => installJsonStr.length > 0), operators_2.skip(1), operators_2.take(1), operators_2.map(() => {
            return exports.actionDispatcher._installWorkspace({ workspaceKey: key });
        }), operators_2.ignoreElements());
    }), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_2.mergeMap(action => {
        const wsKey = action.payload.workspaceKey;
        return getStore().pipe(operators_2.map(s => s.workspaces.get(wsKey)), operators_2.distinctUntilChanged(), operators_2.filter(ws => ws != null), operators_2.take(1), operators_2.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_2.map(() => {
            const pkgEntry = listInstalledComp4Workspace(getState(), wsKey);
            const installed = new Map((function* () {
                for (const pk of pkgEntry) {
                    yield [pk.name, pk];
                }
            })());
            exports.actionDispatcher._change(d => d.workspaces.get(wsKey).installedComponents = installed);
        }));
    }), operators_2.ignoreElements()), getStore().pipe(operators_2.map(s => s.gitIgnores), operators_2.distinctUntilChanged(), operators_2.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_2.distinctUntilChanged(), operators_2.switchMap(() => {
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
    const checkDir = path_1.default.resolve(misc_1.getRootDir(), 'node_modules');
    const srcPackages = getState().srcPackages;
    const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
    const done1 = symlinks_1.listModuleSymlinks(checkDir, (link) => __awaiter(this, void 0, void 0, function* () {
        const pkgName = path_1.default.relative(checkDir, link).replace(/\\/g, '/');
        if (drcpName !== pkgName && !srcPackages.has(pkgName)) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.yellow(`Extraneous symlink: ${link}`));
        }
    }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFzQztBQUV0Qyw4Q0FBbUM7QUFDbkMsOENBQ2tGO0FBQ2xGLHdDQUF5QztBQUN6Qyx1REFBK0I7QUFDL0IsOERBQThFO0FBQzlFLG9EQUFzRjtBQUN0RiwrREFBc0M7QUFDdEMsb0RBQW1EO0FBQ25ELG9EQUF5QztBQUN6QyxvREFBdUM7QUFDdkMsc0RBQWtEO0FBQ2xELG9DQUF5RDtBQUN6RCx3Q0FBMEQ7QUFDMUQsOERBQWtIO0FBdUJsSCxNQUFNLEVBQUMsVUFBVSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRWxFLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixVQUFVLEVBQUUsRUFBRTtJQUNkLFVBQVUsRUFBRSxvQkFBYSxDQUFDLENBQUM7UUFDekIsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FDNUIsaUJBQVUsRUFBRSxFQUFFLDJDQUEyQyxDQUFDLEVBQUUsS0FBSyxFQUFFLGlCQUFVLEVBQUUsQ0FBQztRQUNsRixDQUFDLENBQUMsSUFBSTtDQUNULENBQUM7QUFzQlcsUUFBQSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDekMsSUFBSSxFQUFF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LEVBQUUsT0FBTyxHQUFHLHNCQUFzQixDQUFDLENBQUM7U0FDOUQ7S0FDRjtJQUNELElBQUk7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHR5cGUge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHt0YXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBtZXJnZU1hcCxcbiAgdGFrZSwgY29uY2F0TWFwLCBza2lwLCBpZ25vcmVFbGVtZW50cywgc2NhbiwgY2F0Y2hFcnJvciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJy4uL2NtZC91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgeyBsaXN0Q29tcERlcGVuZGVuY3ksIFBhY2thZ2VKc29uSW50ZXJmIH0gZnJvbSAnLi4vZGVwZW5kZW5jeS1ob2lzdGVyJztcbmltcG9ydCB7IHdyaXRlVHNjb25maWc0cHJvamVjdCwgd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlIH0gZnJvbSAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHsgZmluZEFsbFBhY2thZ2VzIH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBzZXRQcm9qZWN0TGlzdH0gZnJvbSAnLi4vcmVjaXBlLW1hbmFnZXInO1xuaW1wb3J0IHsgc3RhdGVGYWN0b3J5LCBvZlBheWxvYWRBY3Rpb24gfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBnZXRSb290RGlyLCBpc0RyY3BTeW1saW5rIH0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgY2xlYW5JbnZhbGlkU3ltbGlua3MsIHsgaXNXaW4zMiwgbGlzdE1vZHVsZVN5bWxpbmtzLCB1bmxpbmtBc3luYywgX3N5bWxpbmtBc3luYyB9IGZyb20gJy4uL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCB7IGFjdGlvbnMgYXMgX2NsZWFuQWN0aW9ucyB9IGZyb20gJy4uL2NtZC9jbGktY2xlYW4nO1xuaW1wb3J0IHR5cGUge1BsaW5rRW52fSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG4gIGlzSW5zdGFsbGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBzcmNQYWNrYWdlczogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuICAvKiogS2V5IGlzIHJlbGF0aXZlIHBhdGggdG8gcm9vdCB3b3Jrc3BhY2UgKi9cbiAgd29ya3NwYWNlczogTWFwPHN0cmluZywgV29ya3NwYWNlU3RhdGU+O1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIGxpbmtlZERyY3A6IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgZ2l0SWdub3Jlczoge1tmaWxlOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG5jb25zdCB7c3ltbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxuY29uc3QgTlMgPSAncGFja2FnZXMnO1xuY29uc3QgbW9kdWxlTmFtZVJlZyA9IC9eKD86QChbXi9dKylcXC8pPyhcXFMrKS87XG5cbmNvbnN0IHN0YXRlOiBQYWNrYWdlc1N0YXRlID0ge1xuICB3b3Jrc3BhY2VzOiBuZXcgTWFwKCksXG4gIHByb2plY3QyUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgc3JjUGFja2FnZXM6IG5ldyBNYXAoKSxcbiAgZ2l0SWdub3Jlczoge30sXG4gIGxpbmtlZERyY3A6IGlzRHJjcFN5bWxpbmsgP1xuICAgIGNyZWF0ZVBhY2thZ2VJbmZvKFBhdGgucmVzb2x2ZShcbiAgICAgIGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJyksIGZhbHNlLCBnZXRSb290RGlyKCkpXG4gICAgOiBudWxsXG59O1xuXG5pbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBpZDogc3RyaW5nO1xuICBvcmlnaW5JbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIG9yaWdpbkluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgaW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgLyoqIG5hbWVzIG9mIHRob3NlIHN5bWxpbmsgcGFja2FnZXMgKi9cbiAgbGlua2VkRGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8vIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERldkRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvKiogaW5zdGFsbGVkIERSIGNvbXBvbmVudCBwYWNrYWdlcyBbbmFtZSwgdmVyc2lvbl0qL1xuICBpbnN0YWxsZWRDb21wb25lbnRzPzogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuICAvLyAvKiogb3RoZXIgM3JkIHBhcnR5IGRlcGVuZGVuY2llcyBpbiB0dXBsZSBvZiBuYW1lIGFuZCB2ZXJzaW9uIHBhaXIgKi9cbiAgLy8gZGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8vIGRldkRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuXG4gIC8vIGhvaXN0ZWREZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfTtcbiAgLy8gaG9pc3RlZERldkRlcHM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9O1xufVxuXG5leHBvcnQgY29uc3Qgc2xpY2UgPSBzdGF0ZUZhY3RvcnkubmV3U2xpY2Uoe1xuICBuYW1lOiBOUyxcbiAgaW5pdGlhbFN0YXRlOiBzdGF0ZSxcbiAgcmVkdWNlcnM6IHtcbiAgICAvKiogRG8gdGhpcyBhY3Rpb24gYWZ0ZXIgYW55IGxpbmtlZCBwYWNrYWdlIGlzIHJlbW92ZWQgb3IgYWRkZWQgICovXG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtob2lzdGVkRGlyOiBzdHJpbmd9IHwgdW5kZWZpbmVkIHwgbnVsbD4pIHtcbiAgICB9LFxuXG4gICAgLyoqIENoZWNrIGFuZCBpbnN0YWxsIGRlcGVuZGVuY3ksIGlmIHRoZXJlIGlzIGxpbmtlZCBwYWNrYWdlIHVzZWQgaW4gbW9yZSB0aGFuIG9uZSB3b3Jrc3BhY2UsIFxuICAgICAqIHRvIHN3aXRjaCBiZXR3ZWVuIGRpZmZlcmVudCB3b3Jrc3BhY2UgKi9cbiAgICBpbml0V29ya3NwYWNlKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmcsIGlzRm9yY2U6IGJvb2xlYW4sIGxvZ0hhc0NvbmZpZ2VkOiBib29sZWFufT4pIHtcbiAgICB9LFxuICAgIF9zeW5jUGFja2FnZXNTdGF0ZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UGFja2FnZUluZm9bXT4pIHtcbiAgICAgIGQuc3JjUGFja2FnZXMgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IHBrSW5mbyBvZiBwYXlsb2FkKSB7XG4gICAgICAgIGQuc3JjUGFja2FnZXMuc2V0KHBrSW5mby5uYW1lLCBwa0luZm8pO1xuICAgICAgfVxuICAgIH0sXG4gICAgLy8gX3VwZGF0ZVBhY2thZ2VTdGF0ZShkLCB7cGF5bG9hZDoganNvbnN9OiBQYXlsb2FkQWN0aW9uPGFueVtdPikge1xuICAgIC8vICAgZm9yIChjb25zdCBqc29uIG9mIGpzb25zKSB7XG4gICAgLy8gICAgIGNvbnN0IHBrZyA9IGQuc3JjUGFja2FnZXMuZ2V0KGpzb24ubmFtZSk7XG4gICAgLy8gICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgIC8vICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgLy8gICAgICAgICBgW3BhY2thZ2UtbWdyLmluZGV4XSBwYWNrYWdlIG5hbWUgXCIke2pzb24ubmFtZX1cIiBpbiBwYWNrYWdlLmpzb24gaXMgY2hhbmdlZCBzaW5jZSBsYXN0IHRpbWUsXFxuYCArXG4gICAgLy8gICAgICAgICAncGxlYXNlIGRvIFwiaW5pdFwiIGFnYWluIG9uIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeScpO1xuICAgIC8vICAgICAgIGNvbnRpbnVlO1xuICAgIC8vICAgICB9XG4gICAgLy8gICAgIHBrZy5qc29uID0ganNvbjtcbiAgICAvLyAgIH1cbiAgICAvLyB9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuICAgICAgY29uc3QgcGtqc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IEpTT04ucGFyc2UocGtqc29uU3RyKTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwcyBvZiBbcGtqc29uLmRlcGVuZGVuY2llcywgcGtqc29uLmRldkRlcGVuZGVuY2llc10gYXMge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9W10gKSB7XG4gICAgICAvLyAgIE9iamVjdC5lbnRyaWVzKGRlcHMpO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9KTtcblxuICAgICAgY29uc3QgdXBkYXRpbmdEZXBzID0gey4uLnBranNvbi5kZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGVwZW5kZW5jaWVzOiB0eXBlb2YgZGVwcyA9IFtdO1xuICAgICAgZGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1tfaG9pc3RXb3Jrc3BhY2VEZXBzXSBkci1jb21wLXBhY2thZ2UgaXMgc3ltbGluaycpO1xuICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzWydkci1jb21wLXBhY2thZ2UnXTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICB9XG5cbiAgICAgIC8vIHBranNvbkxpc3QucHVzaCh1cGRhdGluZ0pzb24pO1xuICAgICAgY29uc3Qge2hvaXN0ZWQ6IGhvaXN0ZWREZXBzLCBtc2d9ID0gbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMubWFwKGVudHJ5ID0+IHN0YXRlLnNyY1BhY2thZ2VzLmdldChlbnRyeVswXSkhLmpzb24pLFxuICAgICAgICBkaXIsIHVwZGF0aW5nRGVwc1xuICAgICAgKTtcblxuICAgICAgY29uc3Qge2hvaXN0ZWQ6IGhvaXN0ZWREZXZEZXBzLCBtc2c6IG1zZ0Rldn0gPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIGRpciwgdXBkYXRpbmdEZXZEZXBzXG4gICAgICApO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBpZiAobXNnKCkpIGNvbnNvbGUubG9nKGBXb3Jrc3BhY2UgXCIke2Rpcn1cIiBkZXBlbmRlbmNpZXM6XFxuYCwgbXNnKCkpO1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBpZiAobXNnRGV2KCkpIGNvbnNvbGUubG9nKGBXb3Jrc3BhY2UgXCIke2Rpcn1cIiBkZXZEZXBlbmRlbmNpZXM6XFxuYCwgbXNnRGV2KCkpO1xuICAgICAgLy8gSW4gY2FzZSBzb21lIHBhY2thZ2VzIGhhdmUgcGVlciBkZXBlbmRlbmNpZXMgb2Ygb3RoZXIgcGFja2FnZXNcbiAgICAgIC8vIHJlbW92ZSB0aGVtIGZyb20gZGVwZW5kZW5jaWVzXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBob2lzdGVkRGVwcy5rZXlzKCkpIHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhrZXkpKVxuICAgICAgICAgIGhvaXN0ZWREZXBzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBob2lzdGVkRGV2RGVwcy5rZXlzKCkpIHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhrZXkpKVxuICAgICAgICAgIGhvaXN0ZWREZXZEZXBzLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXBzLmVudHJpZXMoKSkucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KSxcbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiBBcnJheS5mcm9tKGhvaXN0ZWREZXZEZXBzLmVudHJpZXMoKSkucmVkdWNlKChkaWMsIFtuYW1lLCBpbmZvXSkgPT4ge1xuICAgICAgICAgIGRpY1tuYW1lXSA9IGluZm8uYnlbMF0udmVyO1xuICAgICAgICAgIHJldHVybiBkaWM7XG4gICAgICAgIH0sIHt9IGFzIHtba2V5OiBzdHJpbmddOiBzdHJpbmd9KVxuICAgICAgfTtcblxuICAgICAgLy8gY29uc29sZS5sb2coaW5zdGFsbEpzb24pXG5cbiAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAvLyBjb25zdCBpbnN0YWxsZWRDb21wID0gbGlzdEluc3RhbGxlZENvbXA0V29ya3NwYWNlKHN0YXRlLndvcmtzcGFjZXMsIHN0YXRlLnNyY1BhY2thZ2VzLCB3c0tleSk7XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgaWQ6IHdzS2V5LFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXNcbiAgICAgICAgLy8gaW5zdGFsbGVkQ29tcG9uZW50czogbmV3IE1hcChpbnN0YWxsZWRDb21wLm1hcChwa2cgPT4gW3BrZy5uYW1lLCBwa2ddKSlcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzLFxuICAgICAgICAvLyBkZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIC8vIGhvaXN0ZWREZXBzLFxuICAgICAgICAvLyBob2lzdGVkRGV2RGVwc1xuICAgICAgfTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXMuc2V0KHdzS2V5LCB3cCk7XG4gICAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0nLCBkaXIpO1xuICAgIH0sXG4gICAgX2luc3RhbGxXb3Jrc3BhY2Uoc3RhdGUsIHtwYXlsb2FkOiB7d29ya3NwYWNlS2V5fX06IFBheWxvYWRBY3Rpb248e3dvcmtzcGFjZUtleTogc3RyaW5nfT4pIHtcbiAgICB9LFxuICAgIF9hc3NvY2lhdGVQYWNrYWdlVG9QcmooZCwge3BheWxvYWQ6IHtwcmosIHBrZ3N9fTogUGF5bG9hZEFjdGlvbjx7cHJqOiBzdHJpbmc7IHBrZ3M6IFBhY2thZ2VJbmZvW119Pikge1xuICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChwYXRoVG9Qcm9qS2V5KHByaiksIHBrZ3MubWFwKHBrZ3MgPT4gcGtncy5uYW1lKSk7XG4gICAgfSxcbiAgICBfdXBkYXRlR2l0SWdub3JlcyhkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248e2ZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nfT4pIHtcbiAgICAgIGQuZ2l0SWdub3Jlc1twYXlsb2FkLmZpbGVdID0gcGF5bG9hZC5jb250ZW50O1xuICAgIH1cbiAgfVxufSk7XG5cbmV4cG9ydCBjb25zdCBhY3Rpb25EaXNwYXRjaGVyID0gc3RhdGVGYWN0b3J5LmJpbmRBY3Rpb25DcmVhdG9ycyhzbGljZSk7XG5cbi8vIGNvbnN0IHJlYWRGaWxlQXN5bmMgPSBwcm9taXNpZnk8c3RyaW5nLCBzdHJpbmcsIHN0cmluZz4oZnMucmVhZEZpbGUpO1xuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcbiAgcmV0dXJuIG1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShtYXAocyA9PiBzLnByb2plY3QyUGFja2FnZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChwa3MgPT4ge1xuICAgICAgICBzZXRQcm9qZWN0TGlzdChnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyAgaW5pdFdvcmtzcGFjZVxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0V29ya3NwYWNlKSxcbiAgICAgIHN3aXRjaE1hcCgoe3BheWxvYWQ6IHtkaXIsIGlzRm9yY2UsIGxvZ0hhc0NvbmZpZ2VkfX0pID0+IHtcbiAgICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgICAgICAgY29uc3QgaG9pc3RPblBhY2thZ2VDaGFuZ2VzID0gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKChzMSwgczIpID0+IHMxLnNyY1BhY2thZ2VzID09PSBzMi5zcmNQYWNrYWdlcyksXG4gICAgICAgICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICAgICAgICBtYXAoKCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXJ9KSlcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5zaXplID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIG1lcmdlKGhvaXN0T25QYWNrYWdlQ2hhbmdlcywgb2Yoc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpcigpKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKCFsb2dIYXNDb25maWdlZCkge1xuICAgICAgICAgICAgbG9nQ29uZmlnKGNvbmZpZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgICAgICBpZiAoaXNGb3JjZSAmJiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICAvLyBjbGVhbiB0byB0cmlnZ2VyIGluc3RhbGwgYWN0aW9uXG4gICAgICAgICAgICAgIGQud29ya3NwYWNlcy5nZXQod3NLZXkpIS5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHVwZGF0ZUxpbmtlZFBhY2thZ2VTdGF0ZSgpO1xuICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSk7XG4gICAgICAgICAgcmV0dXJuIG9mKCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICBjb25zdCBnb0luaXRXb3Jrc3BhY2UkID0gYWN0aW9uJC5waXBlKFxuICAgICAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9zeW5jUGFja2FnZXNTdGF0ZSksXG4gICAgICAgICAgdGFrZSgxKSxcbiAgICAgICAgICBtYXAoKCkgPT4ge1xuICAgICAgICAgICAgaWYgKGdldFN0YXRlKCkud29ya3NwYWNlcy5zaXplID4gMCkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGtleSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGtleSk7XG4gICAgICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5pbml0V29ya3NwYWNlKHtkaXI6IHBhdGgsIGlzRm9yY2U6IGZhbHNlLCBsb2dIYXNDb25maWdlZDogdHJ1ZX0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIG1lcmdlKGdvSW5pdFdvcmtzcGFjZSQsIGZyb20oaW5pdFJvb3REaXJlY3RvcnkoKSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faG9pc3RXb3Jrc3BhY2VEZXBzKSxcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkocGF5bG9hZC5kaXIpO1xuICAgICAgICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICAgICAgICBpZiAod3MgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gb2YoKTtcbiAgICAgICAgY29uc3QgcGtzOiBQYWNrYWdlSW5mb1tdID0gW1xuICAgICAgICAgIC4uLndzLmxpbmtlZERlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpLFxuICAgICAgICAgIC4uLndzLmxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpXG4gICAgICAgIF0uZmlsdGVyKHBrID0+IHBrICE9IG51bGwpIGFzIFBhY2thZ2VJbmZvW107XG4gICAgICAgIC8vIGlmIChnZXRTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgLy8gICBjb25zdCBkcmNwID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lO1xuICAgICAgICAvLyAgIGNvbnN0IHNwYWNlSnNvbiA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgICAgICAgLy8gICBpZiAoc3BhY2VKc29uLmRlcGVuZGVuY2llcyAmJiBzcGFjZUpzb24uZGVwZW5kZW5jaWVzW2RyY3BdIHx8XG4gICAgICAgIC8vICAgICBzcGFjZUpzb24uZGV2RGVwZW5kZW5jaWVzICYmIHNwYWNlSnNvbi5kZXZEZXBlbmRlbmNpZXNbZHJjcF0pIHtcbiAgICAgICAgLy8gICAgIHBrcy5wdXNoKGdldFN0YXRlKCkubGlua2VkRHJjcCEpO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfVxuICAgICAgICByZXR1cm4gZnJvbSh3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2UocGF5bG9hZC5kaXIsIHBrcyxcbiAgICAgICAgICAoZmlsZSwgY29udGVudCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZSwgY29udGVudH0pKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC8vIEhhbmRsZSBuZXdseSBhZGRlZCB3b3Jrc3BhY2VcbiAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHdzID0+IHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20od3Mua2V5cygpKTtcbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9KSxcbiAgICAgIHNjYW48c3RyaW5nW10+KChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgIGlmIChwcmV2Lmxlbmd0aCA8IGN1cnIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbmV3QWRkZWQgPSBfLmRpZmZlcmVuY2UoY3VyciwgcHJldik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IHdzIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHt3b3Jrc3BhY2VLZXk6IHdzfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdyaXRlQ29uZmlnRmlsZXMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbEpzb25TdHIpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbEpzb25TdHIgPT5pbnN0YWxsSnNvblN0ci5sZW5ndGggPiAwKSxcbiAgICAgICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICByZXR1cm4gYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7d29ya3NwYWNlS2V5OiBrZXl9KTtcbiAgICAgICAgfSksXG4gICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIG1lcmdlTWFwKGFjdGlvbiA9PiB7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gYWN0aW9uLnBheWxvYWQud29ya3NwYWNlS2V5O1xuICAgICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod3NLZXkpKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKSxcbiAgICAgICAgICB0YWtlKDEpLFxuICAgICAgICAgIGNvbmNhdE1hcCh3cyA9PiBmcm9tKGluc3RhbGxXb3Jrc3BhY2Uod3MhKSkpLFxuICAgICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwa2dFbnRyeSA9XG4gICAgICAgICAgICAgIGxpc3RJbnN0YWxsZWRDb21wNFdvcmtzcGFjZShnZXRTdGF0ZSgpLCB3c0tleSk7XG5cbiAgICAgICAgICAgIGNvbnN0IGluc3RhbGxlZCA9IG5ldyBNYXAoKGZ1bmN0aW9uKigpOiBHZW5lcmF0b3I8W3N0cmluZywgUGFja2FnZUluZm9dPiB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgcGsgb2YgcGtnRW50cnkpIHtcbiAgICAgICAgICAgICAgICB5aWVsZCBbcGsubmFtZSwgcGtdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSgpKTtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IGQud29ya3NwYWNlcy5nZXQod3NLZXkpIS5pbnN0YWxsZWRDb21wb25lbnRzID0gaW5zdGFsbGVkKTtcbiAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICBtYXAocyA9PiBzLmdpdElnbm9yZXMpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcChnaXRJZ25vcmVzID0+IE9iamVjdC5rZXlzKGdpdElnbm9yZXMpLmpvaW4oJywnKSksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coJyQkJCQkJCQkJCcsIGZpbGVzKTtcbiAgICAgICAgcmV0dXJuIG1lcmdlKC4uLk9iamVjdC5rZXlzKGdldFN0YXRlKCkuZ2l0SWdub3JlcykubWFwKGZpbGUgPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgIG1hcChzID0+IHMuZ2l0SWdub3Jlc1tmaWxlXSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICBza2lwKDEpLFxuICAgICAgICAgIG1hcChjb250ZW50ID0+IHtcbiAgICAgICAgICAgIGZzLndyaXRlRmlsZShmaWxlLCBjb250ZW50LCAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbW9kaWZ5JywgZmlsZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9KVxuICAgICAgICApKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5hZGRQcm9qZWN0LCBzbGljZS5hY3Rpb25zLmRlbGV0ZVByb2plY3QpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IGZyb20oX3NjYW5QYWNrYWdlQW5kTGluaygpKSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKVxuICApLnBpcGUoXG4gICAgY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignW3BhY2thZ2UtbWdyLmluZGV4XScsIGVycik7XG4gICAgICByZXR1cm4gb2YoKTtcbiAgICB9KVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCk6IE9ic2VydmFibGU8UGFja2FnZXNTdGF0ZT4ge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvUHJvaktleShwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbiAgcmV0dXJuIHJlbFBhdGguc3RhcnRzV2l0aCgnLi4nKSA/IFBhdGgucmVzb2x2ZShwYXRoKSA6IHJlbFBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VLZXkocGF0aDogc3RyaW5nKSB7XG4gIGxldCByZWwgPSBQYXRoLnJlbGF0aXZlKGdldFJvb3REaXIoKSwgcGF0aCk7XG4gIGlmIChQYXRoLnNlcCA9PT0gJ1xcXFwnKVxuICAgIHJlbCA9IHJlbC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHJldHVybiByZWw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Xb3Jrc3BhY2UocGF0aDogc3RyaW5nKSB7XG4gIHJldHVybiBQYXRoLnJlbGF0aXZlKGdldFJvb3REaXIoKSwgcGF0aCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogZ2V0UGFja2FnZXNPZlByb2plY3RzKHByb2plY3RzOiBzdHJpbmdbXSkge1xuICBmb3IgKGNvbnN0IHByaiBvZiBwcm9qZWN0cykge1xuICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwYXRoVG9Qcm9qS2V5KHByaikpO1xuICAgIGlmIChwa2dOYW1lcykge1xuICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgIGNvbnN0IHBrID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgIGlmIChwaylcbiAgICAgICAgICB5aWVsZCBwaztcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlcygpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGxldCBpID0gMDtcbiAgZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9LCAnc3JjJyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocGogPT4gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSB7XG4gIGNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG4gIGNvbnN0IGxpbmtlZFBrZ3MgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBsZXQgb3V0ID0gJyc7XG4gIGZvciAoY29uc3QgW3ByaiwgcGtnTmFtZXNdIG9mIGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5lbnRyaWVzKCkpIHtcbiAgICBvdXQgKz0gYFByb2plY3QgJHtwcmogfHwgJy4nfVxcbmA7XG4gICAgY29uc3QgcGtncyA9IHBrZ05hbWVzLm1hcChuYW1lID0+IGxpbmtlZFBrZ3MuZ2V0KG5hbWUpISk7XG4gICAgY29uc3QgbWF4V2lkdGggPSBwa2dzLnJlZHVjZSgobWF4V2lkdGgsIHBrKSA9PiB7XG4gICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICByZXR1cm4gd2lkdGggPiBtYXhXaWR0aCA/IHdpZHRoIDogbWF4V2lkdGg7XG4gICAgfSwgMCk7XG4gICAgZm9yIChjb25zdCBwayBvZiBwa2dzKSB7XG4gICAgICBjb25zdCB3aWR0aCA9IHBrLm5hbWUubGVuZ3RoICsgcGsuanNvbi52ZXJzaW9uLmxlbmd0aCArIDE7XG4gICAgICBvdXQgKz0gYCAgfC0gJHtjaGFsay5jeWFuKHBrLm5hbWUpfUAke2NoYWxrLmdyZWVuKHBrLmpzb24udmVyc2lvbil9JHsnICcucmVwZWF0KG1heFdpZHRoIC0gd2lkdGgpfWAgK1xuICAgICAgYCAke1BhdGgucmVsYXRpdmUoY3dkLCBway5yZWFsUGF0aCl9XFxuYDtcbiAgICB9XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUxpbmtlZFBhY2thZ2VTdGF0ZSgpIHtcbi8vICAgY29uc3QganNvblN0cnMgPSBhd2FpdCBQcm9taXNlLmFsbChcbi8vICAgICBBcnJheS5mcm9tKGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZW50cmllcygpKVxuLy8gICAgIC5tYXAoKFtuYW1lLCBwa0luZm9dKSA9PiB7XG4vLyAgICAgICByZXR1cm4gcmVhZEZpbGVBc3luYyhQYXRoLnJlc29sdmUocGtJbmZvLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG4vLyAgICAgfSlcbi8vICAgKTtcblxuLy8gICB3YXJuVXNlbGVzc1N5bWxpbmsoKTtcbi8vICAgYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGFja2FnZVN0YXRlKGpzb25TdHJzLm1hcChzdHIgPT4gSlNPTi5wYXJzZShzdHIpKSk7XG4vLyB9XG5cbmZ1bmN0aW9uIHdhcm5Vc2VsZXNzU3ltbGluaygpIHtcbiAgY29uc3QgY2hlY2tEaXIgPSBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICBjb25zdCBkb25lMSA9IGxpc3RNb2R1bGVTeW1saW5rcyhjaGVja0RpciwgYXN5bmMgbGluayA9PiB7XG4gICAgY29uc3QgcGtnTmFtZSA9IFBhdGgucmVsYXRpdmUoY2hlY2tEaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIGRyY3BOYW1lICE9PSBwa2dOYW1lICYmICFzcmNQYWNrYWdlcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY2hhbGsueWVsbG93KGBFeHRyYW5lb3VzIHN5bWxpbms6ICR7bGlua31gKSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBjb25zdCBwd2QgPSBwcm9jZXNzLmN3ZCgpO1xuICAvLyBjb25zdCBmb3JiaWREaXIgPSBQYXRoLmpvaW4oZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzJyk7XG4gIC8vIGlmIChzeW1saW5rRGlyICE9PSBmb3JiaWREaXIpIHtcbiAgLy8gICBjb25zdCByZW1vdmVkOiBQcm9taXNlPGFueT5bXSA9IFtdO1xuICAvLyAgIGNvbnN0IGRvbmUyID0gbGlzdE1vZHVsZVN5bWxpbmtzKGZvcmJpZERpciwgYXN5bmMgbGluayA9PiB7XG4gIC8vICAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShmb3JiaWREaXIsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgLy8gICAgIGlmIChzcmNQYWNrYWdlcy5oYXMocGtnTmFtZSkpIHtcbiAgLy8gICAgICAgcmVtb3ZlZC5wdXNoKHVubGlua0FzeW5jKGxpbmspKTtcbiAgLy8gICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIC8vICAgICAgIGNvbnNvbGUubG9nKGBSZWR1bmRhbnQgc3ltbGluayBcIiR7UGF0aC5yZWxhdGl2ZShwd2QsIGxpbmspfVwiIHJlbW92ZWQuYCk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vICAgcmV0dXJuIFByb21pc2UuYWxsKFtkb25lMSwgZG9uZTIsIC4uLnJlbW92ZWRdKTtcbiAgLy8gfVxuICByZXR1cm4gZG9uZTE7XG59XG5cblxuYXN5bmMgZnVuY3Rpb24gaW5pdFJvb3REaXJlY3RvcnkoKSB7XG4gIGNvbnN0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuICBmcy5ta2RpcnBTeW5jKFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvY29uZmlnLmxvY2FsLXRlbXBsYXRlLnlhbWwnKSwgUGF0aC5qb2luKHJvb3RQYXRoLCAnZGlzdCcsICdjb25maWcubG9jYWwueWFtbCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9sb2c0anMuanMnKSwgcm9vdFBhdGggKyAnL2xvZzRqcy5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2FwcC10ZW1wbGF0ZS5qcycpLCByb290UGF0aCArICcvYXBwLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuc2VydmVyLnRtcGwudHMnKSwgcm9vdFBhdGggKyAnL21vZHVsZS1yZXNvbHZlLnNlcnZlci50cycpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgLy8gbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3RlbXBsYXRlcycsICdtb2R1bGUtcmVzb2x2ZS5icm93c2VyLnRtcGwudHMnKSwgcm9vdFBhdGggKyAnL21vZHVsZS1yZXNvbHZlLmJyb3dzZXIudHMnKTtcbiAgYXdhaXQgY2xlYW5JbnZhbGlkU3ltbGlua3MoKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGguam9pbihyb290UGF0aCwgJ2xvZ3MnKSkpXG4gICAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpO1xuXG4gIGZzLm1rZGlycFN5bmMoc3ltbGlua0Rpcik7XG5cbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGdldFByb2plY3RMaXN0KCk7XG5cbiAgcHJvamVjdERpcnMuZm9yRWFjaChwcmpkaXIgPT4ge1xuICAgIF93cml0ZUdpdEhvb2socHJqZGlyKTtcbiAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNsaW50Lmpzb24nKSwgcHJqZGlyICsgJy90c2xpbnQuanNvbicpO1xuICB9KTtcblxuICBhd2FpdCBfc2NhblBhY2thZ2VBbmRMaW5rKCk7XG4gIHdhcm5Vc2VsZXNzU3ltbGluaygpO1xuXG4gIGF3YWl0IHdyaXRlQ29uZmlnRmlsZXMoKTtcblxuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgKGZpbGUsIGNvbnRlbnQpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdyaXRlQ29uZmlnRmlsZXMoKSB7XG4gIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuLi9jbWQvY29uZmlnLXNldHVwJykpLmFkZHVwQ29uZmlncygoZmlsZSwgY29uZmlnQ29udGVudCkgPT4ge1xuICAgIHdyaXRlRmlsZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnZGlzdCcsIGZpbGUpLFxuICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdzLmlkKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdJbnN0YWxsIGRlcGVuZGVuY2llcyBpbiAnICsgZGlyKTtcbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmcsIGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnMubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgaWYgKHdzLmxpbmtlZERlcGVuZGVuY2llcy5sZW5ndGggKyB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubGVuZ3RoID4gMCkge1xuICAgIC8vIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICAgIGF3YWl0IGxpc3RNb2R1bGVTeW1saW5rcyh0YXJnZXQsIGxpbmsgPT4ge1xuICAgICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgICBzeW1saW5rc0luTW9kdWxlRGlyLnB1c2goe2NvbnRlbnQ6IGxpbmtDb250ZW50LCBsaW5rfSk7XG4gICAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gICAgfSk7XG4gICAgLy8gX2NsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGxpbmtzKTtcblxuICAgIC8vIDMuIFJ1biBgbnBtIGluc3RhbGxgXG4gICAgY29uc3QgaW5zdGFsbEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbaW5pdF0gd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoaW5zdGFsbEpzb25GaWxlLCB3cy5pbnN0YWxsSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwMCkpO1xuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7Y3dkOiBkaXJ9KS5wcm9taXNlO1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogZGlyfSkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGUsIGUuc3RhY2spO1xuICAgIH1cbiAgICAvLyA0LiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlKGluc3RhbGxKc29uRmlsZSwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIHJldHVybiBfc3ltbGlua0FzeW5jKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBfc2NhblBhY2thZ2VBbmRMaW5rKCkge1xuICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuXG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuICBjb25zdCBwa2dMaXN0OiBQYWNrYWdlSW5mb1tdID0gW107XG4gIC8vIGNvbnN0IHN5bWxpbmtzRGlyID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpO1xuICBhd2FpdCBybS5saW5rQ29tcG9uZW50c0FzeW5jKHN5bWxpbmtEaXIpLnBpcGUoXG4gICAgdGFwKCh7cHJvaiwganNvbkZpbGUsIGpzb259KSA9PiB7XG4gICAgICBpZiAoIXByb2pQa2dNYXAuaGFzKHByb2opKVxuICAgICAgICBwcm9qUGtnTWFwLnNldChwcm9qLCBbXSk7XG4gICAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihqc29uRmlsZSwganNvbiwgZmFsc2UsIHN5bWxpbmtEaXIpO1xuICAgICAgcGtnTGlzdC5wdXNoKGluZm8pO1xuICAgICAgcHJvalBrZ01hcC5nZXQocHJvaikhLnB1c2goaW5mbyk7XG4gICAgfSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBmb3IgKGNvbnN0IFtwcmosIHBrZ3NdIG9mIHByb2pQa2dNYXAuZW50cmllcygpKSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtwcmosIHBrZ3N9KTtcbiAgfVxuICBhY3Rpb25EaXNwYXRjaGVyLl9zeW5jUGFja2FnZXNTdGF0ZShwa2dMaXN0KTtcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwa0pzb25GaWxlIHBhY2thZ2UuanNvbiBmaWxlIHBhdGhcbiAqIEBwYXJhbSBpc0luc3RhbGxlZCBcbiAqIEBwYXJhbSBzeW1MaW5rIHN5bWxpbmsgcGF0aCBvZiBwYWNrYWdlXG4gKiBAcGFyYW0gcmVhbFBhdGggcmVhbCBwYXRoIG9mIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VJbmZvKHBrSnNvbkZpbGU6IHN0cmluZywgaXNJbnN0YWxsZWQgPSBmYWxzZSxcbiAgc3ltTGlua1BhcmVudERpcj86IHN0cmluZyk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrSnNvbkZpbGUsICd1dGY4JykpO1xuICByZXR1cm4gY3JlYXRlUGFja2FnZUluZm9XaXRoSnNvbihwa0pzb25GaWxlLCBqc29uLCBpc0luc3RhbGxlZCwgc3ltTGlua1BhcmVudERpcik7XG59XG4vKipcbiAqIExpc3QgdGhvc2UgaW5zdGFsbGVkIHBhY2thZ2VzIHdoaWNoIGFyZSByZWZlcmVuY2VkIGJ5IHdvcmtzcGFjZSBwYWNrYWdlLmpzb24gZmlsZSxcbiAqIHRob3NlIHBhY2thZ2VzIG11c3QgaGF2ZSBcImRyXCIgcHJvcGVydHkgaW4gcGFja2FnZS5qc29uIFxuICogQHBhcmFtIHdvcmtzcGFjZUtleSBcbiAqL1xuZnVuY3Rpb24qIGxpc3RJbnN0YWxsZWRDb21wNFdvcmtzcGFjZShzdGF0ZTogUGFja2FnZXNTdGF0ZSwgd29ya3NwYWNlS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgb3JpZ2luSW5zdGFsbEpzb24gPSBzdGF0ZS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgY29uc3QgZGVwSnNvbiA9IHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicgPyBbb3JpZ2luSW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzXSA6XG4gICAgW29yaWdpbkluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgb3JpZ2luSW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzXTtcbiAgZm9yIChjb25zdCBkZXBzIG9mIGRlcEpzb24pIHtcbiAgICBpZiAoZGVwcyA9PSBudWxsKVxuICAgICAgY29udGludWU7XG4gICAgZm9yIChjb25zdCBkZXAgb2YgT2JqZWN0LmtleXMoZGVwcykpIHtcbiAgICAgIGlmICghc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcCkgJiYgZGVwICE9PSAnZHItY29tcC1wYWNrYWdlJykge1xuICAgICAgICBjb25zdCBwayA9IGNyZWF0ZVBhY2thZ2VJbmZvKFxuICAgICAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHdvcmtzcGFjZUtleSwgJ25vZGVfbW9kdWxlcycsIGRlcCwgJ3BhY2thZ2UuanNvbicpLCB0cnVlKTtcbiAgICAgICAgaWYgKHBrLmpzb24uZHIpIHtcbiAgICAgICAgICB5aWVsZCBwaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBrSnNvbkZpbGUgcGFja2FnZS5qc29uIGZpbGUgcGF0aFxuICogQHBhcmFtIGlzSW5zdGFsbGVkIFxuICogQHBhcmFtIHN5bUxpbmsgc3ltbGluayBwYXRoIG9mIHBhY2thZ2VcbiAqIEBwYXJhbSByZWFsUGF0aCByZWFsIHBhdGggb2YgcGFja2FnZVxuICovXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mb1dpdGhKc29uKHBrSnNvbkZpbGU6IHN0cmluZywganNvbjogYW55LCBpc0luc3RhbGxlZCA9IGZhbHNlLFxuICBzeW1MaW5rUGFyZW50RGlyPzogc3RyaW5nKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBtID0gbW9kdWxlTmFtZVJlZy5leGVjKGpzb24ubmFtZSk7XG4gIGNvbnN0IHBrSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgc2hvcnROYW1lOiBtIVsyXSxcbiAgICBuYW1lOiBqc29uLm5hbWUsXG4gICAgc2NvcGU6IG0hWzFdLFxuICAgIHBhdGg6IHN5bUxpbmtQYXJlbnREaXIgPyBQYXRoLnJlc29sdmUoc3ltTGlua1BhcmVudERpciwganNvbi5uYW1lKSA6IFBhdGguZGlybmFtZShwa0pzb25GaWxlKSxcbiAgICBqc29uLFxuICAgIHJlYWxQYXRoOiBmcy5yZWFscGF0aFN5bmMoUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpKSxcbiAgICBpc0luc3RhbGxlZFxuICB9O1xuICByZXR1cm4gcGtJbmZvO1xufVxuXG5mdW5jdGlvbiBjcChmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKF8uc3RhcnRzV2l0aChmcm9tLCAnLScpKSB7XG4gICAgZnJvbSA9IGFyZ3VtZW50c1sxXTtcbiAgICB0byA9IGFyZ3VtZW50c1syXTtcbiAgfVxuICBmcy5jb3B5U3luYyhmcm9tLCB0byk7XG4gIC8vIHNoZWxsLmNwKC4uLmFyZ3VtZW50cyk7XG4gIGlmICgvWy9cXFxcXSQvLnRlc3QodG8pKVxuICAgIHRvID0gUGF0aC5iYXNlbmFtZShmcm9tKTsgLy8gdG8gaXMgYSBmb2xkZXJcbiAgZWxzZVxuICAgIHRvID0gUGF0aC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCB0byk7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnY29weSB0byAlcycsIGNoYWxrLmN5YW4odG8pKTtcbn1cblxuZnVuY3Rpb24gbWF5YmVDb3B5VGVtcGxhdGUoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCB0bykpKVxuICAgIGNwKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIGZyb20pLCB0byk7XG59XG5cbmZ1bmN0aW9uIF93cml0ZUdpdEhvb2socHJvamVjdDogc3RyaW5nKSB7XG4gIC8vIGlmICghaXNXaW4zMikge1xuICBjb25zdCBnaXRQYXRoID0gUGF0aC5yZXNvbHZlKHByb2plY3QsICcuZ2l0L2hvb2tzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGgpKSB7XG4gICAgY29uc3QgaG9va1N0ciA9ICcjIS9iaW4vc2hcXG4nICtcbiAgICAgIGBjZCBcIiR7Z2V0Um9vdERpcigpfVwiXFxuYCArXG4gICAgICAvLyAnZHJjcCBpbml0XFxuJyArXG4gICAgICAvLyAnbnB4IHByZXR0eS1xdWljayAtLXN0YWdlZFxcbicgKyAvLyBVc2UgYHRzbGludCAtLWZpeGAgaW5zdGVhZC5cbiAgICAgIGBub2RlIG5vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UvYmluL2RyY3AuanMgbGludCAtLXBqIFwiJHtwcm9qZWN0LnJlcGxhY2UoL1svXFxcXF0kLywgJycpfVwiIC0tZml4XFxuYDtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoICsgJy9wcmUtY29tbWl0JykpXG4gICAgICBmcy51bmxpbmsoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZ2l0UGF0aCArICcvcHJlLXB1c2gnLCBob29rU3RyKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnV3JpdGUgJyArIGdpdFBhdGggKyAnL3ByZS1wdXNoJyk7XG4gICAgaWYgKCFpc1dpbjMyKSB7XG4gICAgICBzcGF3bignY2htb2QnLCAnLVInLCAnK3gnLCBwcm9qZWN0ICsgJy8uZ2l0L2hvb2tzL3ByZS1wdXNoJyk7XG4gICAgfVxuICB9XG4gIC8vIH1cbn1cbiJdfQ==