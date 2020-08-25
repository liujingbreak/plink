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
const utils_1 = require("../cmd/utils");
const config_1 = __importDefault(require("../config"));
const dependency_installer_1 = require("../dependency-installer");
const editor_helper_1 = require("../editor-helper");
const log_config_1 = __importDefault(require("../log-config"));
const package_utils_1 = require("../package-utils");
const process_utils_1 = require("../process-utils");
// import { createProjectSymlink } from '../project-dir';
const process_utils_2 = require("../process-utils");
const recipe_manager_1 = require("../recipe-manager");
const store_1 = require("../store");
const utils_2 = require("../utils");
const symlinks_1 = __importStar(require("../utils/symlinks"));
const util_1 = require("util");
const { green: col1, cyan } = require('chalk');
const NS = 'packages';
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const state = {
    workspaces: new Map(),
    project2Packages: new Map(),
    srcPackages: new Map(),
    errors: [],
    gitIgnores: {},
    linkedDrcp: utils_2.isDrcpSymlink ?
        createPackageInfo(path_1.default.resolve(utils_2.getRootDir(), 'node_modules/dr-comp-package/package.json')) : null
};
exports.slice = store_1.stateFactory.newSlice({
    name: NS,
    initialState: state,
    reducers: {
        initRootDir(d, action) {
        },
        initWorkspace(d, action) {
        },
        _syncPackagesState(d, { payload }) {
            d.srcPackages = new Map();
            for (const pkInfo of payload) {
                d.srcPackages.set(pkInfo.name, pkInfo);
            }
        },
        _updatePackageState(d, { payload: jsons }) {
            for (const json of jsons) {
                const pkg = d.srcPackages.get(json.name);
                if (pkg == null) {
                    console.error(`[package-mgr.index] package name "${json.name}" in package.json is changed since last time,\n` +
                        'please do "init" again on workspace root directory');
                    continue;
                }
                pkg.json = json;
            }
        },
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
            dir = path_1.default.resolve(dir);
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
            if (utils_2.isDrcpSymlink) {
                // tslint:disable-next-line: no-console
                console.log('[_hoistWorkspaceDeps] dr-comp-package is symlink');
                delete updatingDeps['dr-comp-package'];
                delete updatingDevDeps['dr-comp-package'];
            }
            // pkjsonList.push(updatingJson);
            const hoistedDeps = dependency_installer_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages.get(entry[0]).json), dir, updatingDeps);
            const hoistedDevDeps = dependency_installer_1.listCompDependency(linkedDevDependencies.map(entry => state.srcPackages.get(entry[0]).json), dir, updatingDevDeps);
            const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: Object.assign({}, hoistedDeps), devDependencies: Object.assign({}, hoistedDevDeps) });
            const wp = {
                dir,
                originInstallJson: pkjson,
                originInstallJsonStr: pkjsonStr,
                installJson,
                installJsonStr: JSON.stringify(installJson, null, '  '),
                linkedDependencies,
                linkedDevDependencies
                // dependencies,
                // devDependencies,
                // hoistedDeps,
                // hoistedDevDeps
            };
            state.workspaces.set(workspaceKey(dir), wp);
            // console.log('-----------------', dir);
        },
        _installWorkspace(state, { payload: { dir } }) {
        },
        _associatePackageToPrj(d, { payload: { prj, pkgs } }) {
            d.project2Packages.set(prj, pkgs.map(pkgs => pkgs.name));
        },
        _updateGitIgnores(d, { payload }) {
            d.gitIgnores[payload.file] = payload.content;
        }
    }
});
exports.actionDispatcher = store_1.stateFactory.bindActionCreators(exports.slice);
// export type ActionsType = typeof actions extends Promise<infer T> ? T : unknown;
const readFileAsync = util_1.promisify(fs_extra_1.default.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    return rxjs_1.merge(getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
    }), operators_1.ignoreElements()), 
    //  initWorkspace
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initWorkspace), operators_1.switchMap(({ payload: { dir, opt } }) => {
        dir = path_1.default.resolve(dir);
        const hoistOnPackageChanges = getStore().pipe(operators_1.distinctUntilChanged((s1, s2) => s1.srcPackages === s2.srcPackages), operators_1.skip(1), operators_1.take(1), operators_1.map(() => exports.actionDispatcher._hoistWorkspaceDeps({ dir })));
        if (getState().srcPackages.size === 0) {
            return rxjs_1.merge(hoistOnPackageChanges, rxjs_1.of(exports.slice.actions.initRootDir()));
        }
        else {
            log_config_1.default(config_1.default());
            const wsKey = workspaceKey(dir);
            if (opt.force && getState().workspaces.has(wsKey)) {
                exports.actionDispatcher._change(d => {
                    // clean to trigger install action
                    d.workspaces.get(wsKey).installJsonStr = '';
                });
            }
            updateLinkedPackageState();
            return hoistOnPackageChanges;
        }
    }), operators_1.ignoreElements()), 
    // initRootDir
    action$.pipe(store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_1.switchMap(() => {
        return rxjs_1.from(initRootDirectory());
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_1.concatMap(({ payload }) => {
        const srcPackages = getState().srcPackages;
        const wsKey = workspaceKey(payload.dir);
        const ws = getState().workspaces.get(wsKey);
        if (ws == null)
            return rxjs_1.of();
        const pks = [
            ...ws.linkedDependencies.map(([name, ver]) => srcPackages.get(name)),
            ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages.get(name))
        ].filter(pk => pk != null);
        if (getState().linkedDrcp) {
            const drcp = getState().linkedDrcp.name;
            const spaceJson = getState().workspaces.get(wsKey).originInstallJson;
            if (spaceJson.dependencies && spaceJson.dependencies[drcp] ||
                spaceJson.devDependencies && spaceJson.devDependencies[drcp]) {
                pks.push(getState().linkedDrcp);
            }
        }
        return rxjs_1.from(editor_helper_1.writeTsconfigForEachPackage(payload.dir, pks, (file, content) => exports.actionDispatcher._updateGitIgnores({ file, content })));
    }), operators_1.ignoreElements()), 
    // Handle newly added workspace
    getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), operators_1.map(ws => {
        const keys = Array.from(ws.keys());
        recipe_manager_1.setWorkspaceDirs(keys.map(key => path_1.default.resolve(utils_2.getRootDir(), key)));
        return keys;
    }), operators_1.scan((prev, curr) => {
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
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_1.mergeMap(action => getStore().pipe(operators_1.map(s => s.workspaces.get(workspaceKey(action.payload.dir))), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null))), operators_1.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_1.ignoreElements()), ...Array.from(getState().workspaces.keys()).map(key => {
        return getStore().pipe(operators_1.map(s => s.workspaces.get(key).installJsonStr), operators_1.distinctUntilChanged(), operators_1.filter(installJsonStr => installJsonStr.length > 0), operators_1.skip(1), operators_1.take(1), operators_1.map(() => {
            // console.log('+++++++++++ emit action', dir);
            return exports.actionDispatcher._installWorkspace({ dir: path_1.default.resolve(utils_2.getRootDir(), key) });
        }), operators_1.ignoreElements());
    }), getStore().pipe(operators_1.map(s => s.gitIgnores), operators_1.distinctUntilChanged(), operators_1.map(gitIgnores => Object.keys(gitIgnores).join(',')), operators_1.distinctUntilChanged(), operators_1.switchMap(() => {
        // console.log('$$$$$$$$$', files);
        return rxjs_1.merge(...Object.keys(getState().gitIgnores).map(file => getStore().pipe(operators_1.map(s => s.gitIgnores[file]), operators_1.distinctUntilChanged(), operators_1.skip(1), operators_1.map(content => {
            fs_extra_1.default.writeFile(file, content, () => {
                // tslint:disable-next-line: no-console
                console.log('modify', file);
            });
        }))));
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_1.concatMap(() => rxjs_1.from(_scanPackageAndLink())), operators_1.ignoreElements())).pipe(operators_1.catchError(err => {
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
    const relPath = path_1.default.relative(utils_2.getRootDir(), path);
    return relPath.startsWith('..') ? path_1.default.resolve(path) : relPath;
}
exports.pathToProjKey = pathToProjKey;
function workspaceKey(path) {
    let rel = path_1.default.relative(utils_2.getRootDir(), path);
    if (path_1.default.sep === '\\')
        rel = rel.replace(/\\/g, '/');
    return rel;
}
exports.workspaceKey = workspaceKey;
function pathToWorkspace(path) {
    return path_1.default.relative(utils_2.getRootDir(), path);
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
// import PackageNodeInstance from '../packageNodeInstance';
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
    return Array.from(getState().project2Packages.keys()).map(pj => path_1.default.resolve(utils_2.getRootDir(), pj));
}
exports.getProjectList = getProjectList;
function listPackagesByProjects() {
    let out = '';
    for (const prj of getProjectList()) {
        out += col1(`Project: ${prj}`) + '\n';
        recipe_manager_1.eachRecipeSrc(prj, (srcDir, recipeDir) => {
            const relDir = path_1.default.relative(prj, srcDir) || '/';
            out += `  ${col1('|-')} ${cyan(relDir)}\n`;
            const deps = recipeDir ?
                Object.keys(require(path_1.default.resolve(recipeDir, 'package.json')).dependencies) : [];
            deps.forEach(name => out += `  ${col1('|')}  ${col1('|-')} ${name}\n`);
        });
        out += '\n';
    }
    // out += '\nInstalled:\n';
    // eachInstalledRecipe((recipeDir) => {
    //   out += `${recipeDir}\n`;
    // });
    return out;
}
exports.listPackagesByProjects = listPackagesByProjects;
function updateLinkedPackageState() {
    return __awaiter(this, void 0, void 0, function* () {
        const jsonStrs = yield Promise.all(Array.from(getState().srcPackages.entries())
            .map(([name, pkInfo]) => {
            return readFileAsync(path_1.default.resolve(pkInfo.realPath, 'package.json'), 'utf8');
        }));
        warnUselessSymlink();
        exports.actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
    });
}
function warnUselessSymlink() {
    const srcPackages = getState().srcPackages;
    const nodeModule = path_1.default.resolve(utils_2.getRootDir(), 'node_modules');
    const drcpName = getState().linkedDrcp ? getState().linkedDrcp.name : null;
    return symlinks_1.scanNodeModulesForSymlinks(utils_2.getRootDir(), (link) => __awaiter(this, void 0, void 0, function* () {
        const pkgName = path_1.default.relative(nodeModule, link).replace(/\\/g, '/');
        if (drcpName !== pkgName && srcPackages.get(pkgName) == null) {
            // tslint:disable-next-line: no-console
            console.log(chalk_1.default.yellow(`Extraneous symlink: ${link}`));
        }
    }));
}
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = utils_2.getRootDir();
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
        log_config_1.default(config_1.default());
        const projectDirs = yield getStore().pipe(operators_1.pluck('project2Packages'), operators_1.distinctUntilChanged(), operators_1.map(project2Packages => Object.keys(project2Packages).map(dir => path_1.default.resolve(dir))), operators_1.take(1)).toPromise();
        projectDirs.forEach(prjdir => {
            _writeGitHook(prjdir);
            maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
        });
        yield _scanPackageAndLink();
        warnUselessSymlink();
        yield writeConfigFiles();
        // createProjectSymlink();
        editor_helper_1.writeTsconfig4project(getProjectList(), (file, content) => exports.actionDispatcher._updateGitIgnores({ file, content }));
    });
}
function writeConfigFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            utils_1.writeFile(path_1.default.resolve(utils_2.getRootDir(), 'dist', file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
    });
}
function installWorkspace(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        // tslint:disable-next-line: no-console
        console.log('Install dependencies in ' + ws.dir);
        const symlinksInModuleDir = [];
        const target = path_1.default.resolve(ws.dir, 'node_modules');
        if (!fs_extra_1.default.existsSync(target)) {
            fs_extra_1.default.mkdirpSync(target);
        }
        if (ws.linkedDependencies.length + ws.linkedDevDependencies.length > 0) {
            // Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
            // backup them for late recovery
            yield symlinks_1.scanNodeModulesForSymlinks(ws.dir, link => {
                const linkContent = fs_extra_1.default.readlinkSync(link);
                symlinksInModuleDir.push({ content: linkContent, link });
                return symlinks_1.unlinkAsync(link);
            });
            // _cleanActions.addWorkspaceFile(links);
            // 3. Run `npm install`
            const installJsonFile = path_1.default.resolve(ws.dir, 'package.json');
            // tslint:disable-next-line: no-console
            console.log('[init] write', installJsonFile);
            fs_extra_1.default.writeFile(installJsonFile, ws.installJsonStr, 'utf8');
            try {
                yield process_utils_2.exe('npm', 'install', { cwd: ws.dir }).promise;
                yield process_utils_2.exe('npm', 'dedupe', { cwd: ws.dir }).promise;
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
        const projPkgMap = {};
        yield rm.linkComponentsAsync((proj, pkgJsonFile) => {
            if (projPkgMap[proj] == null)
                projPkgMap[proj] = [];
            const info = createPackageInfo(pkgJsonFile);
            projPkgMap[proj].push(info);
        });
        const pkgList = [];
        for (const [prj, pkgs] of Object.entries(projPkgMap)) {
            exports.actionDispatcher._associatePackageToPrj({ prj, pkgs });
            pkgList.push(...pkgs);
        }
        exports.actionDispatcher._syncPackagesState(pkgList);
    });
}
function createPackageInfo(pkJsonFile, isInstalled = false) {
    const json = JSON.parse(fs_extra_1.default.readFileSync(pkJsonFile, 'utf8'));
    const m = moduleNameReg.exec(json.name);
    const pkInfo = {
        shortName: m[2],
        name: json.name,
        scope: m[1],
        path: path_1.default.dirname(pkJsonFile),
        json,
        realPath: fs_extra_1.default.realpathSync(path_1.default.dirname(pkJsonFile)),
        isInstalled
    };
    return pkInfo;
}
exports.createPackageInfo = createPackageInfo;
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
    if (!fs_extra_1.default.existsSync(path_1.default.resolve(utils_2.getRootDir(), to)))
        cp(path_1.default.resolve(__dirname, from), to);
}
function _writeGitHook(project) {
    // if (!isWin32) {
    const gitPath = path_1.default.resolve(project, '.git/hooks');
    if (fs_extra_1.default.existsSync(gitPath)) {
        const hookStr = '#!/bin/sh\n' +
            `cd "${utils_2.getRootDir()}"\n` +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFzQztBQUN0Qyw4Q0FDeUY7QUFDekYsd0NBQXlDO0FBQ3pDLHVEQUErQjtBQUMvQixrRUFBZ0Y7QUFDaEYsb0RBQXNGO0FBQ3RGLCtEQUFzQztBQUN0QyxvREFBbUQ7QUFDbkQsb0RBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCxvREFBdUM7QUFDdkMsc0RBQ3VFO0FBQ3ZFLG9DQUF5RDtBQUN6RCxvQ0FBcUQ7QUFDckQsOERBQTBIO0FBRzFILCtCQUErQjtBQUUvQixNQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUF1QjdDLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixNQUFNLEVBQUUsRUFBRTtJQUNWLFVBQVUsRUFBRSxFQUFFO0lBQ2QsVUFBVSxFQUFFLHFCQUFhLENBQUMsQ0FBQztRQUN6QixpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFVLEVBQUUsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7Q0FDcEcsQ0FBQztBQW9CVyxRQUFBLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUN6QyxJQUFJLEVBQUUsRUFB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T0FBTyxHQUFHLHNCQUFzQixDQUFDLENBQUM7U0FDOUQ7S0FDRjtJQUNELElBQUk7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBzd2l0Y2hNYXAsIG1lcmdlTWFwLFxuICBwbHVjaywgdGFrZSwgY29uY2F0TWFwLCBza2lwLCBpZ25vcmVFbGVtZW50cywgc2NhbiwgY2F0Y2hFcnJvciB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7IHdyaXRlRmlsZSB9IGZyb20gJy4uL2NtZC91dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5pbXBvcnQgeyBsaXN0Q29tcERlcGVuZGVuY3ksIFBhY2thZ2VKc29uSW50ZXJmIH0gZnJvbSAnLi4vZGVwZW5kZW5jeS1pbnN0YWxsZXInO1xuaW1wb3J0IHsgd3JpdGVUc2NvbmZpZzRwcm9qZWN0LCB3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2UgfSBmcm9tICcuLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCBsb2dDb25maWcgZnJvbSAnLi4vbG9nLWNvbmZpZyc7XG5pbXBvcnQgeyBmaW5kQWxsUGFja2FnZXMgfSBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCB7IHNwYXduIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG4vLyBpbXBvcnQgeyBjcmVhdGVQcm9qZWN0U3ltbGluayB9IGZyb20gJy4uL3Byb2plY3QtZGlyJztcbmltcG9ydCB7IGV4ZSB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuaW1wb3J0IHsgZWFjaFJlY2lwZVNyYywgc2V0UHJvamVjdExpc3QgYXMgc2V0UHJvamVjdEZvclJlY2lwZSxcbiAgc2V0V29ya3NwYWNlRGlycyBhcyBzZXRXb3Jrc3BhY2VGb3JSZWNpcGUgfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGdldFJvb3REaXIsIGlzRHJjcFN5bWxpbmsgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgY2xlYW5JbnZhbGlkU3ltbGlua3MsIHsgaXNXaW4zMiwgc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0ICogYXMgY21kT3B0IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgeyBhY3Rpb25zIGFzIF9jbGVhbkFjdGlvbnMgfSBmcm9tICcuLi9jbWQvY2xpLWNsZWFuJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcblxuY29uc3Qge2dyZWVuOiBjb2wxLCBjeWFufSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbi8vIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG4gIGlzSW5zdGFsbGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBzcmNQYWNrYWdlczogTWFwPHN0cmluZywgUGFja2FnZUluZm8+O1xuICAvKiogS2V5IGlzIHJlbGF0aXZlIHBhdGggdG8gcm9vdCB3b3Jrc3BhY2UgKi9cbiAgd29ya3NwYWNlczogTWFwPHN0cmluZywgV29ya3NwYWNlU3RhdGU+O1xuICBwcm9qZWN0MlBhY2thZ2VzOiBNYXA8c3RyaW5nLCBzdHJpbmdbXT47XG4gIGxpbmtlZERyY3A6IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgZ2l0SWdub3Jlczoge1tmaWxlOiBzdHJpbmddOiBzdHJpbmd9O1xuICBlcnJvcnM6IHN0cmluZ1tdO1xufVxuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIHdvcmtzcGFjZXM6IG5ldyBNYXAoKSxcbiAgcHJvamVjdDJQYWNrYWdlczogbmV3IE1hcCgpLFxuICBzcmNQYWNrYWdlczogbmV3IE1hcCgpLFxuICBlcnJvcnM6IFtdLFxuICBnaXRJZ25vcmVzOiB7fSxcbiAgbGlua2VkRHJjcDogaXNEcmNwU3ltbGluayA/XG4gICAgY3JlYXRlUGFja2FnZUluZm8oUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpIDogbnVsbFxufTtcblxuaW50ZXJmYWNlIFdvcmtzcGFjZVN0YXRlIHtcbiAgZGlyOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG5hbWVzIG9mIHRob3NlIHN5bWxpbmsgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8vIC8qKiBvdGhlciAzcmQgcGFydHkgZGVwZW5kZW5jaWVzIGluIHR1cGxlIG9mIG5hbWUgYW5kIHZlcnNpb24gcGFpciAqL1xuICAvLyBkZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gZGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG5cbiAgLy8gaG9pc3RlZERlcHM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvLyBob2lzdGVkRGV2RGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ307XG59XG5cbmV4cG9ydCBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6IE5TLFxuICBpbml0aWFsU3RhdGU6IHN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGluaXRSb290RGlyKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7aG9pc3RlZERpcjogc3RyaW5nfSB8IHVuZGVmaW5lZCB8IG51bGw+KSB7XG4gICAgfSxcbiAgICBpbml0V29ya3NwYWNlKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmcsIG9wdDogY21kT3B0LkluaXRDbWRPcHRpb25zfT4pIHtcbiAgICB9LFxuICAgIF9zeW5jUGFja2FnZXNTdGF0ZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UGFja2FnZUluZm9bXT4pIHtcbiAgICAgIGQuc3JjUGFja2FnZXMgPSBuZXcgTWFwKCk7XG4gICAgICBmb3IgKGNvbnN0IHBrSW5mbyBvZiBwYXlsb2FkKSB7XG4gICAgICAgIGQuc3JjUGFja2FnZXMuc2V0KHBrSW5mby5uYW1lLCBwa0luZm8pO1xuICAgICAgfVxuICAgIH0sXG4gICAgX3VwZGF0ZVBhY2thZ2VTdGF0ZShkLCB7cGF5bG9hZDoganNvbnN9OiBQYXlsb2FkQWN0aW9uPGFueVtdPikge1xuICAgICAgZm9yIChjb25zdCBqc29uIG9mIGpzb25zKSB7XG4gICAgICAgIGNvbnN0IHBrZyA9IGQuc3JjUGFja2FnZXMuZ2V0KGpzb24ubmFtZSk7XG4gICAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICBgW3BhY2thZ2UtbWdyLmluZGV4XSBwYWNrYWdlIG5hbWUgXCIke2pzb24ubmFtZX1cIiBpbiBwYWNrYWdlLmpzb24gaXMgY2hhbmdlZCBzaW5jZSBsYXN0IHRpbWUsXFxuYCArXG4gICAgICAgICAgICAncGxlYXNlIGRvIFwiaW5pdFwiIGFnYWluIG9uIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeScpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHBrZy5qc29uID0ganNvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIWQucHJvamVjdDJQYWNrYWdlcy5oYXMoZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQoZGlyLCBbXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkLnByb2plY3QyUGFja2FnZXMuZGVsZXRlKGRpcik7XG4gICAgICB9XG4gICAgfSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgICAgIGNvbnN0IHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG5cbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGV2RGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgICBjb25zdCB1cGRhdGluZ0RldkRlcHMgPSB7Li4ucGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXZEZXBzID0gW107XG4gICAgICBkZXZEZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMuaGFzKGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcblxuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbX2hvaXN0V29ya3NwYWNlRGVwc10gZHItY29tcC1wYWNrYWdlIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuXG4gICAgICAvLyBwa2pzb25MaXN0LnB1c2godXBkYXRpbmdKc29uKTtcblxuICAgICAgY29uc3QgaG9pc3RlZERlcHMgPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIGRpciwgdXBkYXRpbmdEZXBzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBob2lzdGVkRGV2RGVwcyA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcy5nZXQoZW50cnlbMF0pIS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RldkRlcHNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHtcbiAgICAgICAgLi4ucGtqc29uLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IHsuLi5ob2lzdGVkRGVwc30sXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogey4uLmhvaXN0ZWREZXZEZXBzfVxuICAgICAgfTtcblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBkaXIsXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llc1xuICAgICAgICAvLyBkZXBlbmRlbmNpZXMsXG4gICAgICAgIC8vIGRldkRlcGVuZGVuY2llcyxcbiAgICAgICAgLy8gaG9pc3RlZERlcHMsXG4gICAgICAgIC8vIGhvaXN0ZWREZXZEZXBzXG4gICAgICB9O1xuICAgICAgc3RhdGUud29ya3NwYWNlcy5zZXQod29ya3NwYWNlS2V5KGRpciksIHdwKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCctLS0tLS0tLS0tLS0tLS0tLScsIGRpcik7XG4gICAgfSxcbiAgICBfaW5zdGFsbFdvcmtzcGFjZShzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgIH0sXG4gICAgX2Fzc29jaWF0ZVBhY2thZ2VUb1ByaihkLCB7cGF5bG9hZDoge3ByaiwgcGtnc319OiBQYXlsb2FkQWN0aW9uPHtwcmo6IHN0cmluZzsgcGtnczogUGFja2FnZUluZm9bXX0+KSB7XG4gICAgICBkLnByb2plY3QyUGFja2FnZXMuc2V0KHByaiwgcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpKTtcbiAgICB9LFxuICAgIF91cGRhdGVHaXRJZ25vcmVzKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7ZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmd9Pikge1xuICAgICAgZC5naXRJZ25vcmVzW3BheWxvYWQuZmlsZV0gPSBwYXlsb2FkLmNvbnRlbnQ7XG4gICAgfVxuICB9XG59KTtcblxuZXhwb3J0IGNvbnN0IGFjdGlvbkRpc3BhdGNoZXIgPSBzdGF0ZUZhY3RvcnkuYmluZEFjdGlvbkNyZWF0b3JzKHNsaWNlKTtcblxuLy8gZXhwb3J0IHR5cGUgQWN0aW9uc1R5cGUgPSB0eXBlb2YgYWN0aW9ucyBleHRlbmRzIFByb21pc2U8aW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuY29uc3QgcmVhZEZpbGVBc3luYyA9IHByb21pc2lmeTxzdHJpbmcsIHN0cmluZywgc3RyaW5nPihmcy5yZWFkRmlsZSk7XG4vKipcbiAqIENhcmVmdWxseSBhY2Nlc3MgYW55IHByb3BlcnR5IG9uIGNvbmZpZywgc2luY2UgY29uZmlnIHNldHRpbmcgcHJvYmFibHkgaGFzbid0IGJlZW4gc2V0IHlldCBhdCB0aGlzIG1vbW1lbnRcbiAqL1xuc3RhdGVGYWN0b3J5LmFkZEVwaWMoKGFjdGlvbiQsIHN0YXRlJCkgPT4ge1xuICByZXR1cm4gbWVyZ2UoXG4gICAgZ2V0U3RvcmUoKS5waXBlKG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHBrcyA9PiB7XG4gICAgICAgIHNldFByb2plY3RGb3JSZWNpcGUoZ2V0UHJvamVjdExpc3QoKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgLy8gIGluaXRXb3Jrc3BhY2VcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFdvcmtzcGFjZSksXG4gICAgICBzd2l0Y2hNYXAoKHtwYXlsb2FkOiB7ZGlyLCBvcHR9fSkgPT4ge1xuICAgICAgICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICAgICAgICBjb25zdCBob2lzdE9uUGFja2FnZUNoYW5nZXMgPSBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuc3JjUGFja2FnZXMgPT09IHMyLnNyY1BhY2thZ2VzKSxcbiAgICAgICAgICBza2lwKDEpLCB0YWtlKDEpLFxuICAgICAgICAgIG1hcCgoKSA9PiBhY3Rpb25EaXNwYXRjaGVyLl9ob2lzdFdvcmtzcGFjZURlcHMoe2Rpcn0pKVxuICAgICAgICApO1xuXG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnNpemUgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoaG9pc3RPblBhY2thZ2VDaGFuZ2VzLCBvZihzbGljZS5hY3Rpb25zLmluaXRSb290RGlyKCkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KGRpcik7XG4gICAgICAgICAgaWYgKG9wdC5mb3JjZSAmJiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICAvLyBjbGVhbiB0byB0cmlnZ2VyIGluc3RhbGwgYWN0aW9uXG4gICAgICAgICAgICAgIGQud29ya3NwYWNlcy5nZXQod3NLZXkpIS5pbnN0YWxsSnNvblN0ciA9ICcnO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHVwZGF0ZUxpbmtlZFBhY2thZ2VTdGF0ZSgpO1xuICAgICAgICAgIHJldHVybiBob2lzdE9uUGFja2FnZUNoYW5nZXM7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICByZXR1cm4gZnJvbShpbml0Um9vdERpcmVjdG9yeSgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyksXG4gICAgICBjb25jYXRNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICBjb25zdCBzcmNQYWNrYWdlcyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gICAgICAgIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHBheWxvYWQuZGlyKTtcbiAgICAgICAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgICAgICAgaWYgKHdzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuIG9mKCk7XG4gICAgICAgIGNvbnN0IHBrczogUGFja2FnZUluZm9bXSA9IFtcbiAgICAgICAgICAuLi53cy5saW5rZWREZXBlbmRlbmNpZXMubWFwKChbbmFtZSwgdmVyXSkgPT4gc3JjUGFja2FnZXMuZ2V0KG5hbWUpKSxcbiAgICAgICAgICAuLi53cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKChbbmFtZSwgdmVyXSkgPT4gc3JjUGFja2FnZXMuZ2V0KG5hbWUpKVxuICAgICAgICBdLmZpbHRlcihwayA9PiBwayAhPSBudWxsKSBhcyBQYWNrYWdlSW5mb1tdO1xuXG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgICBjb25zdCBkcmNwID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lO1xuICAgICAgICAgIGNvbnN0IHNwYWNlSnNvbiA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpIS5vcmlnaW5JbnN0YWxsSnNvbjtcbiAgICAgICAgICBpZiAoc3BhY2VKc29uLmRlcGVuZGVuY2llcyAmJiBzcGFjZUpzb24uZGVwZW5kZW5jaWVzW2RyY3BdIHx8XG4gICAgICAgICAgICBzcGFjZUpzb24uZGV2RGVwZW5kZW5jaWVzICYmIHNwYWNlSnNvbi5kZXZEZXBlbmRlbmNpZXNbZHJjcF0pIHtcbiAgICAgICAgICAgIHBrcy5wdXNoKGdldFN0YXRlKCkubGlua2VkRHJjcCEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZnJvbSh3cml0ZVRzY29uZmlnRm9yRWFjaFBhY2thZ2UocGF5bG9hZC5kaXIsIHBrcyxcbiAgICAgICAgICAoZmlsZSwgY29udGVudCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZSwgY29udGVudH0pKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC8vIEhhbmRsZSBuZXdseSBhZGRlZCB3b3Jrc3BhY2VcbiAgICBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKHdzID0+IHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20od3Mua2V5cygpKTtcbiAgICAgICAgc2V0V29ya3NwYWNlRm9yUmVjaXBlKGtleXMubWFwKGtleSA9PiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpKSk7XG4gICAgICAgIHJldHVybiBrZXlzO1xuICAgICAgfSksXG4gICAgICBzY2FuPHN0cmluZ1tdPigocHJldiwgY3VycikgPT4ge1xuICAgICAgICBpZiAocHJldi5sZW5ndGggPCBjdXJyLmxlbmd0aCkge1xuICAgICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgICAgIGNvbnNvbGUubG9nKCdOZXcgd29ya3NwYWNlOiAnLCBuZXdBZGRlZCk7XG4gICAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgbmV3QWRkZWQpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2luc3RhbGxXb3Jrc3BhY2Uoe2Rpcn0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICB3cml0ZUNvbmZpZ0ZpbGVzKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnI7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgICBtZXJnZU1hcChhY3Rpb24gPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShhY3Rpb24ucGF5bG9hZC5kaXIpKSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKVxuICAgICAgKSksXG4gICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzISkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIC4uLkFycmF5LmZyb20oZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKSkubWFwKGtleSA9PiB7XG4gICAgICByZXR1cm4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMuZ2V0KGtleSkhLmluc3RhbGxKc29uU3RyKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKGluc3RhbGxKc29uU3RyID0+aW5zdGFsbEpzb25TdHIubGVuZ3RoID4gMCksXG4gICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJysrKysrKysrKysrIGVtaXQgYWN0aW9uJywgZGlyKTtcbiAgICAgICAgICByZXR1cm4gYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7ZGlyOiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBrZXkpfSk7XG4gICAgICAgIH0pLFxuICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pLFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMuZ2l0SWdub3JlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKGdpdElnbm9yZXMgPT4gT2JqZWN0LmtleXMoZ2l0SWdub3Jlcykuam9pbignLCcpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnJCQkJCQkJCQkJywgZmlsZXMpO1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS5naXRJZ25vcmVzKS5tYXAoZmlsZSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy5naXRJZ25vcmVzW2ZpbGVdKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIHNraXAoMSksXG4gICAgICAgICAgbWFwKGNvbnRlbnQgPT4ge1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFkZFByb2plY3QsIHNsaWNlLmFjdGlvbnMuZGVsZXRlUHJvamVjdCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gZnJvbShfc2NhblBhY2thZ2VBbmRMaW5rKCkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbcGFja2FnZS1tZ3IuaW5kZXhdJywgZXJyKTtcbiAgICAgIHJldHVybiBvZigpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZUtleShwYXRoOiBzdHJpbmcpIHtcbiAgbGV0IHJlbCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbiAgaWYgKFBhdGguc2VwID09PSAnXFxcXCcpXG4gICAgcmVsID0gcmVsLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcmV0dXJuIHJlbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1dvcmtzcGFjZShwYXRoOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlc09mUHJvamVjdHMocHJvamVjdHM6IHN0cmluZ1tdKSB7XG4gIGZvciAoY29uc3QgcHJqIG9mIHByb2plY3RzKSB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHBhdGhUb1Byb2pLZXkocHJqKSk7XG4gICAgaWYgKHBrZ05hbWVzKSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgY29uc3QgcGsgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrKVxuICAgICAgICAgIHlpZWxkIHBrO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuLy8gaW1wb3J0IFBhY2thZ2VOb2RlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXMoKTogc3RyaW5nIHtcbiAgbGV0IG91dCA9ICcnO1xuICBsZXQgaSA9IDA7XG4gIGZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgb3V0ICs9IGAke2krK30uICR7bmFtZX1gO1xuICAgIG91dCArPSAnXFxuJztcbiAgfSwgJ3NyYycpO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0TGlzdCgpIHtcbiAgcmV0dXJuIEFycmF5LmZyb20oZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmtleXMoKSkubWFwKHBqID0+IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHBqKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBsZXQgb3V0ID0gJyc7XG4gIGZvciAoY29uc3QgcHJqIG9mIGdldFByb2plY3RMaXN0KCkpIHtcbiAgICBvdXQgKz0gY29sMShgUHJvamVjdDogJHtwcmp9YCkgKyAnXFxuJztcbiAgICBlYWNoUmVjaXBlU3JjKHByaiwgKHNyY0RpciwgcmVjaXBlRGlyKSA9PiB7XG4gICAgICBjb25zdCByZWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByaiwgc3JjRGlyKSB8fCAnLyc7XG4gICAgICBvdXQgKz0gYCAgJHtjb2wxKCd8LScpfSAke2N5YW4ocmVsRGlyKX1cXG5gO1xuICAgICAgY29uc3QgZGVwczogc3RyaW5nW10gPSByZWNpcGVEaXIgP1xuICAgICAgICBPYmplY3Qua2V5cyhyZXF1aXJlKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSkuZGVwZW5kZW5jaWVzKSA6IFtdO1xuICAgICAgZGVwcy5mb3JFYWNoKG5hbWUgPT4gb3V0ICs9IGAgICR7Y29sMSgnfCcpfSAgJHsgY29sMSgnfC0nKX0gJHtuYW1lfVxcbmApO1xuICAgIH0pO1xuICAgIG91dCArPSAnXFxuJztcbiAgfVxuICAvLyBvdXQgKz0gJ1xcbkluc3RhbGxlZDpcXG4nO1xuICAvLyBlYWNoSW5zdGFsbGVkUmVjaXBlKChyZWNpcGVEaXIpID0+IHtcbiAgLy8gICBvdXQgKz0gYCR7cmVjaXBlRGlyfVxcbmA7XG4gIC8vIH0pO1xuICByZXR1cm4gb3V0O1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKSB7XG4gIGNvbnN0IGpzb25TdHJzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSlcbiAgICAubWFwKChbbmFtZSwgcGtJbmZvXSkgPT4ge1xuICAgICAgcmV0dXJuIHJlYWRGaWxlQXN5bmMoUGF0aC5yZXNvbHZlKHBrSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuICAgIH0pXG4gICk7XG5cbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBhY2thZ2VTdGF0ZShqc29uU3Rycy5tYXAoc3RyID0+IEpTT04ucGFyc2Uoc3RyKSkpO1xufVxuXG5mdW5jdGlvbiB3YXJuVXNlbGVzc1N5bWxpbmsoKSB7XG4gIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3Qgbm9kZU1vZHVsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICByZXR1cm4gc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3MoZ2V0Um9vdERpcigpLCBhc3luYyBsaW5rID0+IHtcbiAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiBzcmNQYWNrYWdlcy5nZXQocGtnTmFtZSkgPT0gbnVsbCkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3coYEV4dHJhbmVvdXMgc3ltbGluazogJHtsaW5rfWApKTtcbiAgICB9XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbml0Um9vdERpcmVjdG9yeSgpIHtcbiAgY29uc3Qgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG4gIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnZGlzdCcpKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9jb25maWcubG9jYWwtdGVtcGxhdGUueWFtbCcpLCBQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JywgJ2NvbmZpZy5sb2NhbC55YW1sJykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2xvZzRqcy5qcycpLCByb290UGF0aCArICcvbG9nNGpzLmpzJyk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvYXBwLXRlbXBsYXRlLmpzJyksIHJvb3RQYXRoICsgJy9hcHAuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcycsICdtb2R1bGUtcmVzb2x2ZS5zZXJ2ZXIudG1wbC50cycpLCByb290UGF0aCArICcvbW9kdWxlLXJlc29sdmUuc2VydmVyLnRzJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBtYXgtbGluZS1sZW5ndGhcbiAgICAvLyBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAndGVtcGxhdGVzJywgJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXIudG1wbC50cycpLCByb290UGF0aCArICcvbW9kdWxlLXJlc29sdmUuYnJvd3Nlci50cycpO1xuICBhd2FpdCBjbGVhbkludmFsaWRTeW1saW5rcygpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKSlcbiAgICBmcy5ta2RpcnBTeW5jKFBhdGguam9pbihyb290UGF0aCwgJ2xvZ3MnKSk7XG5cbiAgbG9nQ29uZmlnKGNvbmZpZygpKTtcblxuICBjb25zdCBwcm9qZWN0RGlycyA9IGF3YWl0IGdldFN0b3JlKCkucGlwZShcbiAgICBwbHVjaygncHJvamVjdDJQYWNrYWdlcycpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcChwcm9qZWN0MlBhY2thZ2VzID0+IE9iamVjdC5rZXlzKHByb2plY3QyUGFja2FnZXMpLm1hcChkaXIgPT4gUGF0aC5yZXNvbHZlKGRpcikpKSxcbiAgICB0YWtlKDEpXG4gICkudG9Qcm9taXNlKCk7XG5cbiAgcHJvamVjdERpcnMuZm9yRWFjaChwcmpkaXIgPT4ge1xuICAgIF93cml0ZUdpdEhvb2socHJqZGlyKTtcbiAgICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHNsaW50Lmpzb24nKSwgcHJqZGlyICsgJy90c2xpbnQuanNvbicpO1xuICB9KTtcblxuICBhd2FpdCBfc2NhblBhY2thZ2VBbmRMaW5rKCk7XG4gIHdhcm5Vc2VsZXNzU3ltbGluaygpO1xuXG4gIGF3YWl0IHdyaXRlQ29uZmlnRmlsZXMoKTtcblxuICAvLyBjcmVhdGVQcm9qZWN0U3ltbGluaygpO1xuICB3cml0ZVRzY29uZmlnNHByb2plY3QoZ2V0UHJvamVjdExpc3QoKSwgKGZpbGUsIGNvbnRlbnQpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHdyaXRlQ29uZmlnRmlsZXMoKSB7XG4gIHJldHVybiAoYXdhaXQgaW1wb3J0KCcuLi9jbWQvY29uZmlnLXNldHVwJykpLmFkZHVwQ29uZmlncygoZmlsZSwgY29uZmlnQ29udGVudCkgPT4ge1xuICAgIHdyaXRlRmlsZShQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnZGlzdCcsIGZpbGUpLFxuICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluc3RhbGxXb3Jrc3BhY2Uod3M6IFdvcmtzcGFjZVN0YXRlKSB7XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZygnSW5zdGFsbCBkZXBlbmRlbmNpZXMgaW4gJyArIHdzLmRpcik7XG4gIGNvbnN0IHN5bWxpbmtzSW5Nb2R1bGVEaXIgPSBbXSBhcyB7Y29udGVudDogc3RyaW5nLCBsaW5rOiBzdHJpbmd9W107XG5cbiAgY29uc3QgdGFyZ2V0ID0gUGF0aC5yZXNvbHZlKHdzLmRpciwgJ25vZGVfbW9kdWxlcycpO1xuICBpZiAoIWZzLmV4aXN0c1N5bmModGFyZ2V0KSkge1xuICAgIGZzLm1rZGlycFN5bmModGFyZ2V0KTtcbiAgfVxuXG4gIGlmICh3cy5saW5rZWREZXBlbmRlbmNpZXMubGVuZ3RoICsgd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzLmxlbmd0aCA+IDApIHtcbiAgICAvLyBUZW1vcHJhcmlseSByZW1vdmUgYWxsIHN5bWxpbmtzIHVuZGVyIGBub2RlX21vZHVsZXMvYCBhbmQgYG5vZGVfbW9kdWxlcy9AKi9gXG4gICAgLy8gYmFja3VwIHRoZW0gZm9yIGxhdGUgcmVjb3ZlcnlcbiAgICBhd2FpdCBzY2FuTm9kZU1vZHVsZXNGb3JTeW1saW5rcyh3cy5kaXIsIGxpbmsgPT4ge1xuICAgICAgY29uc3QgbGlua0NvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgICBzeW1saW5rc0luTW9kdWxlRGlyLnB1c2goe2NvbnRlbnQ6IGxpbmtDb250ZW50LCBsaW5rfSk7XG4gICAgICByZXR1cm4gdW5saW5rQXN5bmMobGluayk7XG4gICAgfSk7XG4gICAgLy8gX2NsZWFuQWN0aW9ucy5hZGRXb3Jrc3BhY2VGaWxlKGxpbmtzKTtcblxuICAgIC8vIDMuIFJ1biBgbnBtIGluc3RhbGxgXG4gICAgY29uc3QgaW5zdGFsbEpzb25GaWxlID0gUGF0aC5yZXNvbHZlKHdzLmRpciwgJ3BhY2thZ2UuanNvbicpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdbaW5pdF0gd3JpdGUnLCBpbnN0YWxsSnNvbkZpbGUpO1xuXG4gICAgZnMud3JpdGVGaWxlKGluc3RhbGxKc29uRmlsZSwgd3MuaW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7Y3dkOiB3cy5kaXJ9KS5wcm9taXNlO1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogd3MuZGlyfSkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGUsIGUuc3RhY2spO1xuICAgIH1cbiAgICAvLyA0LiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlKGluc3RhbGxKc29uRmlsZSwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIHJldHVybiBfc3ltbGlua0FzeW5jKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBfc2NhblBhY2thZ2VBbmRMaW5rKCkge1xuICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuXG4gIGNvbnN0IHByb2pQa2dNYXA6IHtbcHJvajogc3RyaW5nXTogUGFja2FnZUluZm9bXX0gPSB7fTtcbiAgYXdhaXQgcm0ubGlua0NvbXBvbmVudHNBc3luYygocHJvaiwgcGtnSnNvbkZpbGUpID0+IHtcbiAgICBpZiAocHJvalBrZ01hcFtwcm9qXSA9PSBudWxsKVxuICAgICAgcHJvalBrZ01hcFtwcm9qXSA9IFtdO1xuICAgIGNvbnN0IGluZm8gPSBjcmVhdGVQYWNrYWdlSW5mbyhwa2dKc29uRmlsZSk7XG4gICAgcHJvalBrZ01hcFtwcm9qXS5wdXNoKGluZm8pO1xuICB9KTtcbiAgY29uc3QgcGtnTGlzdDogUGFja2FnZUluZm9bXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtwcmosIHBrZ3NdIG9mIE9iamVjdC5lbnRyaWVzKHByb2pQa2dNYXApKSB7XG4gICAgYWN0aW9uRGlzcGF0Y2hlci5fYXNzb2NpYXRlUGFja2FnZVRvUHJqKHtwcmosIHBrZ3N9KTtcbiAgICBwa2dMaXN0LnB1c2goLi4ucGtncyk7XG4gIH1cbiAgYWN0aW9uRGlzcGF0Y2hlci5fc3luY1BhY2thZ2VzU3RhdGUocGtnTGlzdCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcsIGlzSW5zdGFsbGVkID0gZmFsc2UpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBQYXRoLmRpcm5hbWUocGtKc29uRmlsZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSksXG4gICAgaXNJbnN0YWxsZWRcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChfLnN0YXJ0c1dpdGgoZnJvbSwgJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnMuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgdG8pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ2NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBfd3JpdGVHaXRIb29rKHByb2plY3Q6IHN0cmluZykge1xuICAvLyBpZiAoIWlzV2luMzIpIHtcbiAgY29uc3QgZ2l0UGF0aCA9IFBhdGgucmVzb2x2ZShwcm9qZWN0LCAnLmdpdC9ob29rcycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoKSkge1xuICAgIGNvbnN0IGhvb2tTdHIgPSAnIyEvYmluL3NoXFxuJyArXG4gICAgICBgY2QgXCIke2dldFJvb3REaXIoKX1cIlxcbmAgK1xuICAgICAgLy8gJ2RyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJ25weCBwcmV0dHktcXVpY2sgLS1zdGFnZWRcXG4nICsgLy8gVXNlIGB0c2xpbnQgLS1maXhgIGluc3RlYWQuXG4gICAgICBgbm9kZSBub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL2Jpbi9kcmNwLmpzIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG4iXX0=