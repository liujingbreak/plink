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
            // In case some packages have peer dependencies of other packages
            // remove them from dependencies
            for (const key of Object.keys(hoistedDeps)) {
                if (state.srcPackages.has(key))
                    delete hoistedDeps[key];
            }
            for (const key of Object.keys(hoistedDevDeps)) {
                if (state.srcPackages.has(key))
                    delete hoistedDevDeps[key];
            }
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
            d.project2Packages.set(pathToProjKey(prj), pkgs.map(pkgs => pkgs.name));
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
        const projectDirs = getProjectList();
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
        const projPkgMap = new Map();
        yield rm.linkComponentsAsync((proj, pkgJsonFile) => {
            if (!projPkgMap.has(proj))
                projPkgMap.set(proj, []);
            // console.log('_scanPackageAndLink', proj, pkgJsonFile);
            const info = createPackageInfo(pkgJsonFile);
            projPkgMap.get(proj).push(info);
        });
        // console.log(Array.from(projPkgMap.values()));
        const pkgList = [];
        for (const [prj, pkgs] of projPkgMap.entries()) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFzQztBQUV0Qyw4Q0FDa0Y7QUFDbEYsd0NBQXlDO0FBQ3pDLHVEQUErQjtBQUMvQixrRUFBZ0Y7QUFDaEYsb0RBQXNGO0FBQ3RGLCtEQUFzQztBQUN0QyxvREFBbUQ7QUFDbkQsb0RBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCxvREFBdUM7QUFDdkMsc0RBQ3VFO0FBQ3ZFLG9DQUF5RDtBQUN6RCxvQ0FBcUQ7QUFDckQsOERBQTBIO0FBRzFILCtCQUErQjtBQUUvQixNQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUF1QjdDLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO0lBQ3JCLGdCQUFnQixFQUFFLElBQUksR0FBRyxFQUFFO0lBQzNCLFdBQVcsRUFBRSxJQUFJLEdBQUcsRUFBRTtJQUN0QixNQUFNLEVBQUUsRUFBRTtJQUNWLFVBQVUsRUFBRSxFQUFFO0lBQ2QsVUFBVSxFQUFFLHFCQUFhLENBQUMsQ0FBQztRQUN6QixpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFVLEVBQUUsRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7Q0FDcEcsQ0FBQztBQW9CVyxRQUFBLEtBQUssR0FBRyxvQkFBWSxDQUFDLFFBQVEsQ0FBQztJQUN6QyxJQUFJLEVBQUUsRUFB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QUM7UUFDakQsdUNBQXVDO1FBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLE9BQU8sR0FBRyxXQUFXLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsa0JBQU8sRUFBRTtZQUNaLHFCQUFLLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxHQUFHLHNCQUFzQixDQUFDLENBQUM7U0FDOUQ7S0FDRjtJQUNELElBQUk7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGF5bG9hZEFjdGlvbiB9IGZyb20gJ0ByZWR1eGpzL3Rvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmcm9tLCBtZXJnZSwgb2Z9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHR5cGUge09ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgZGlzdGluY3RVbnRpbENoYW5nZWQsIGZpbHRlciwgbWFwLCBzd2l0Y2hNYXAsIG1lcmdlTWFwLFxuICB0YWtlLCBjb25jYXRNYXAsIHNraXAsIGlnbm9yZUVsZW1lbnRzLCBzY2FuLCBjYXRjaEVycm9yIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgd3JpdGVGaWxlIH0gZnJvbSAnLi4vY21kL3V0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7IGxpc3RDb21wRGVwZW5kZW5jeSwgUGFja2FnZUpzb25JbnRlcmYgfSBmcm9tICcuLi9kZXBlbmRlbmN5LWluc3RhbGxlcic7XG5pbXBvcnQgeyB3cml0ZVRzY29uZmlnNHByb2plY3QsIHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZSB9IGZyb20gJy4uL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0IGxvZ0NvbmZpZyBmcm9tICcuLi9sb2ctY29uZmlnJztcbmltcG9ydCB7IGZpbmRBbGxQYWNrYWdlcyB9IGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IHsgc3Bhd24gfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbi8vIGltcG9ydCB7IGNyZWF0ZVByb2plY3RTeW1saW5rIH0gZnJvbSAnLi4vcHJvamVjdC1kaXInO1xuaW1wb3J0IHsgZXhlIH0gZnJvbSAnLi4vcHJvY2Vzcy11dGlscyc7XG5pbXBvcnQgeyBlYWNoUmVjaXBlU3JjLCBzZXRQcm9qZWN0TGlzdCBhcyBzZXRQcm9qZWN0Rm9yUmVjaXBlLFxuICBzZXRXb3Jrc3BhY2VEaXJzIGFzIHNldFdvcmtzcGFjZUZvclJlY2lwZSB9IGZyb20gJy4uL3JlY2lwZS1tYW5hZ2VyJztcbmltcG9ydCB7IHN0YXRlRmFjdG9yeSwgb2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Um9vdERpciwgaXNEcmNwU3ltbGluayB9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCBjbGVhbkludmFsaWRTeW1saW5rcywgeyBpc1dpbjMyLCBzY2FuTm9kZU1vZHVsZXNGb3JTeW1saW5rcywgdW5saW5rQXN5bmMsIF9zeW1saW5rQXN5bmMgfSBmcm9tICcuLi91dGlscy9zeW1saW5rcyc7XG5pbXBvcnQgKiBhcyBjbWRPcHQgZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCB7IGFjdGlvbnMgYXMgX2NsZWFuQWN0aW9ucyB9IGZyb20gJy4uL2NtZC9jbGktY2xlYW4nO1xuaW1wb3J0IHtwcm9taXNpZnl9IGZyb20gJ3V0aWwnO1xuXG5jb25zdCB7Z3JlZW46IGNvbDEsIGN5YW59ID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuLy8gY29uc3QgaXNEcmNwU3ltbGluayA9IGZzLmxzdGF0U3luYyhQYXRoLnJlc29sdmUoJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UnKSkuaXNTeW1ib2xpY0xpbmsoKTtcbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBuYW1lOiBzdHJpbmc7XG4gIHNjb3BlOiBzdHJpbmc7XG4gIHNob3J0TmFtZTogc3RyaW5nO1xuICBqc29uOiBhbnk7XG4gIHBhdGg6IHN0cmluZztcbiAgcmVhbFBhdGg6IHN0cmluZztcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIHNyY1BhY2thZ2VzOiBNYXA8c3RyaW5nLCBQYWNrYWdlSW5mbz47XG4gIC8qKiBLZXkgaXMgcmVsYXRpdmUgcGF0aCB0byByb290IHdvcmtzcGFjZSAqL1xuICB3b3Jrc3BhY2VzOiBNYXA8c3RyaW5nLCBXb3Jrc3BhY2VTdGF0ZT47XG4gIHByb2plY3QyUGFja2FnZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPjtcbiAgbGlua2VkRHJjcDogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ307XG4gIGVycm9yczogc3RyaW5nW107XG59XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgd29ya3NwYWNlczogbmV3IE1hcCgpLFxuICBwcm9qZWN0MlBhY2thZ2VzOiBuZXcgTWFwKCksXG4gIHNyY1BhY2thZ2VzOiBuZXcgTWFwKCksXG4gIGVycm9yczogW10sXG4gIGdpdElnbm9yZXM6IHt9LFxuICBsaW5rZWREcmNwOiBpc0RyY3BTeW1saW5rID9cbiAgICBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSkgOiBudWxsXG59O1xuXG5pbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBkaXI6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG90aGVyIDNyZCBwYXJ0eSBkZXBlbmRlbmNpZXMgaW4gdHVwbGUgb2YgbmFtZSBhbmQgdmVyc2lvbiBwYWlyICovXG4gIC8vIGRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyBkZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvLyBob2lzdGVkRGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ307XG4gIC8vIGhvaXN0ZWREZXZEZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtob2lzdGVkRGlyOiBzdHJpbmd9IHwgdW5kZWZpbmVkIHwgbnVsbD4pIHtcbiAgICB9LFxuICAgIGluaXRXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZywgb3B0OiBjbWRPcHQuSW5pdENtZE9wdGlvbnN9Pikge1xuICAgIH0sXG4gICAgX3N5bmNQYWNrYWdlc1N0YXRlKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxQYWNrYWdlSW5mb1tdPikge1xuICAgICAgZC5zcmNQYWNrYWdlcyA9IG5ldyBNYXAoKTtcbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWQpIHtcbiAgICAgICAgZC5zcmNQYWNrYWdlcy5zZXQocGtJbmZvLm5hbWUsIHBrSW5mbyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBfdXBkYXRlUGFja2FnZVN0YXRlKGQsIHtwYXlsb2FkOiBqc29uc306IFBheWxvYWRBY3Rpb248YW55W10+KSB7XG4gICAgICBmb3IgKGNvbnN0IGpzb24gb2YganNvbnMpIHtcbiAgICAgICAgY29uc3QgcGtnID0gZC5zcmNQYWNrYWdlcy5nZXQoanNvbi5uYW1lKTtcbiAgICAgICAgaWYgKHBrZyA9PSBudWxsKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihcbiAgICAgICAgICAgIGBbcGFja2FnZS1tZ3IuaW5kZXhdIHBhY2thZ2UgbmFtZSBcIiR7anNvbi5uYW1lfVwiIGluIHBhY2thZ2UuanNvbiBpcyBjaGFuZ2VkIHNpbmNlIGxhc3QgdGltZSxcXG5gICtcbiAgICAgICAgICAgICdwbGVhc2UgZG8gXCJpbml0XCIgYWdhaW4gb24gd29ya3NwYWNlIHJvb3QgZGlyZWN0b3J5Jyk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgcGtnLmpzb24gPSBqc29uO1xuICAgICAgfVxuICAgIH0sXG4gICAgYWRkUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGlmICghZC5wcm9qZWN0MlBhY2thZ2VzLmhhcyhkaXIpKSB7XG4gICAgICAgICAgZC5wcm9qZWN0MlBhY2thZ2VzLnNldChkaXIsIFtdKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgZGVsZXRlUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoVG9Qcm9qS2V5KHJhd0Rpcik7XG4gICAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5kZWxldGUoZGlyKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIF9ob2lzdFdvcmtzcGFjZURlcHMoc3RhdGUsIHtwYXlsb2FkOiB7ZGlyfX06IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nfT4pIHtcbiAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcyA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignXCJzcmNQYWNrYWdlc1wiIGlzIG51bGwsIG5lZWQgdG8gcnVuIGBpbml0YCBjb21tYW5kIGZpcnN0Jyk7XG4gICAgICB9XG4gICAgICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICAgICAgY29uc3QgcGtqc29uU3RyID0gZnMucmVhZEZpbGVTeW5jKFBhdGgucmVzb2x2ZShkaXIsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKTtcblxuICAgICAgY29uc3QgcGtqc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IEpTT04ucGFyc2UocGtqc29uU3RyKTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwcyBvZiBbcGtqc29uLmRlcGVuZGVuY2llcywgcGtqc29uLmRldkRlcGVuZGVuY2llc10gYXMge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9W10gKSB7XG4gICAgICAvLyAgIE9iamVjdC5lbnRyaWVzKGRlcHMpO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9KTtcblxuICAgICAgY29uc3QgdXBkYXRpbmdEZXBzID0gey4uLnBranNvbi5kZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGVwZW5kZW5jaWVzOiB0eXBlb2YgZGVwcyA9IFtdO1xuICAgICAgZGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzLmhhcyhkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1tfaG9pc3RXb3Jrc3BhY2VEZXBzXSBkci1jb21wLXBhY2thZ2UgaXMgc3ltbGluaycpO1xuICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzWydkci1jb21wLXBhY2thZ2UnXTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICB9XG5cbiAgICAgIC8vIHBranNvbkxpc3QucHVzaCh1cGRhdGluZ0pzb24pO1xuICAgICAgY29uc3QgaG9pc3RlZERlcHMgPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMuZ2V0KGVudHJ5WzBdKSEuanNvbiksXG4gICAgICAgIGRpciwgdXBkYXRpbmdEZXBzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBob2lzdGVkRGV2RGVwcyA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcy5nZXQoZW50cnlbMF0pIS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RldkRlcHNcbiAgICAgICk7XG5cbiAgICAgIC8vIEluIGNhc2Ugc29tZSBwYWNrYWdlcyBoYXZlIHBlZXIgZGVwZW5kZW5jaWVzIG9mIG90aGVyIHBhY2thZ2VzXG4gICAgICAvLyByZW1vdmUgdGhlbSBmcm9tIGRlcGVuZGVuY2llc1xuICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaG9pc3RlZERlcHMpKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoa2V5KSlcbiAgICAgICAgICBkZWxldGUgaG9pc3RlZERlcHNba2V5XTtcbiAgICAgIH1cblxuICAgICAgZm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXMoaG9pc3RlZERldkRlcHMpKSB7XG4gICAgICAgIGlmIChzdGF0ZS5zcmNQYWNrYWdlcy5oYXMoa2V5KSlcbiAgICAgICAgICBkZWxldGUgaG9pc3RlZERldkRlcHNba2V5XTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmID0ge1xuICAgICAgICAuLi5wa2pzb24sXG4gICAgICAgIGRlcGVuZGVuY2llczogey4uLmhvaXN0ZWREZXBzfSxcbiAgICAgICAgZGV2RGVwZW5kZW5jaWVzOiB7Li4uaG9pc3RlZERldkRlcHN9XG4gICAgICB9O1xuXG4gICAgICBjb25zdCB3cDogV29ya3NwYWNlU3RhdGUgPSB7XG4gICAgICAgIGRpcixcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb246IHBranNvbixcbiAgICAgICAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHBranNvblN0cixcbiAgICAgICAgaW5zdGFsbEpzb24sXG4gICAgICAgIGluc3RhbGxKc29uU3RyOiBKU09OLnN0cmluZ2lmeShpbnN0YWxsSnNvbiwgbnVsbCwgJyAgJyksXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcyxcbiAgICAgICAgbGlua2VkRGV2RGVwZW5kZW5jaWVzXG4gICAgICAgIC8vIGRlcGVuZGVuY2llcyxcbiAgICAgICAgLy8gZGV2RGVwZW5kZW5jaWVzLFxuICAgICAgICAvLyBob2lzdGVkRGVwcyxcbiAgICAgICAgLy8gaG9pc3RlZERldkRlcHNcbiAgICAgIH07XG4gICAgICBzdGF0ZS53b3Jrc3BhY2VzLnNldCh3b3Jrc3BhY2VLZXkoZGlyKSwgd3ApO1xuICAgICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tJywgZGlyKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiBQYWNrYWdlSW5mb1tdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlcy5zZXQocGF0aFRvUHJvaktleShwcmopLCBwa2dzLm1hcChwa2dzID0+IHBrZ3MubmFtZSkpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUdpdElnbm9yZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZ30+KSB7XG4gICAgICBkLmdpdElnbm9yZXNbcGF5bG9hZC5maWxlXSA9IHBheWxvYWQuY29udGVudDtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG4vLyBleHBvcnQgdHlwZSBBY3Rpb25zVHlwZSA9IHR5cGVvZiBhY3Rpb25zIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5jb25zdCByZWFkRmlsZUFzeW5jID0gcHJvbWlzaWZ5PHN0cmluZywgc3RyaW5nLCBzdHJpbmc+KGZzLnJlYWRGaWxlKTtcbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdEZvclJlY2lwZShnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyAgaW5pdFdvcmtzcGFjZVxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0V29ya3NwYWNlKSxcbiAgICAgIHN3aXRjaE1hcCgoe3BheWxvYWQ6IHtkaXIsIG9wdH19KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gICAgICAgIGNvbnN0IGhvaXN0T25QYWNrYWdlQ2hhbmdlcyA9IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5zcmNQYWNrYWdlcyA9PT0gczIuc3JjUGFja2FnZXMpLFxuICAgICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgICAgbWFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSkpXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKGdldFN0YXRlKCkuc3JjUGFja2FnZXMuc2l6ZSA9PT0gMCkge1xuICAgICAgICAgIHJldHVybiBtZXJnZShob2lzdE9uUGFja2FnZUNoYW5nZXMsIG9mKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIoKSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkoZGlyKTtcbiAgICAgICAgICBpZiAob3B0LmZvcmNlICYmIGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9jaGFuZ2UoZCA9PiB7XG4gICAgICAgICAgICAgIC8vIGNsZWFuIHRvIHRyaWdnZXIgaW5zdGFsbCBhY3Rpb25cbiAgICAgICAgICAgICAgZC53b3Jrc3BhY2VzLmdldCh3c0tleSkhLmluc3RhbGxKc29uU3RyID0gJyc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdXBkYXRlTGlua2VkUGFja2FnZVN0YXRlKCk7XG4gICAgICAgICAgcmV0dXJuIGhvaXN0T25QYWNrYWdlQ2hhbmdlcztcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIC8vIGluaXRSb290RGlyXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmluaXRSb290RGlyKSxcbiAgICAgIHN3aXRjaE1hcCgoKSA9PiB7XG4gICAgICAgIHJldHVybiBmcm9tKGluaXRSb290RGlyZWN0b3J5KCkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faG9pc3RXb3Jrc3BhY2VEZXBzKSxcbiAgICAgIGNvbmNhdE1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgICAgICAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkocGF5bG9hZC5kaXIpO1xuICAgICAgICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICAgICAgICBpZiAod3MgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm4gb2YoKTtcbiAgICAgICAgY29uc3QgcGtzOiBQYWNrYWdlSW5mb1tdID0gW1xuICAgICAgICAgIC4uLndzLmxpbmtlZERlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpLFxuICAgICAgICAgIC4uLndzLmxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoKFtuYW1lLCB2ZXJdKSA9PiBzcmNQYWNrYWdlcy5nZXQobmFtZSkpXG4gICAgICAgIF0uZmlsdGVyKHBrID0+IHBrICE9IG51bGwpIGFzIFBhY2thZ2VJbmZvW107XG5cbiAgICAgICAgaWYgKGdldFN0YXRlKCkubGlua2VkRHJjcCkge1xuICAgICAgICAgIGNvbnN0IGRyY3AgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWU7XG4gICAgICAgICAgY29uc3Qgc3BhY2VKc29uID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSkhLm9yaWdpbkluc3RhbGxKc29uO1xuICAgICAgICAgIGlmIChzcGFjZUpzb24uZGVwZW5kZW5jaWVzICYmIHNwYWNlSnNvbi5kZXBlbmRlbmNpZXNbZHJjcF0gfHxcbiAgICAgICAgICAgIHNwYWNlSnNvbi5kZXZEZXBlbmRlbmNpZXMgJiYgc3BhY2VKc29uLmRldkRlcGVuZGVuY2llc1tkcmNwXSkge1xuICAgICAgICAgICAgcGtzLnB1c2goZ2V0U3RhdGUoKS5saW5rZWREcmNwISk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmcm9tKHdyaXRlVHNjb25maWdGb3JFYWNoUGFja2FnZShwYXlsb2FkLmRpciwgcGtzLFxuICAgICAgICAgIChmaWxlLCBjb250ZW50KSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVHaXRJZ25vcmVzKHtmaWxlLCBjb250ZW50fSkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLy8gSGFuZGxlIG5ld2x5IGFkZGVkIHdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAod3MgPT4ge1xuICAgICAgICBjb25zdCBrZXlzID0gQXJyYXkuZnJvbSh3cy5rZXlzKCkpO1xuICAgICAgICBzZXRXb3Jrc3BhY2VGb3JSZWNpcGUoa2V5cy5tYXAoa2V5ID0+IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGtleSkpKTtcbiAgICAgICAgcmV0dXJuIGtleXM7XG4gICAgICB9KSxcbiAgICAgIHNjYW48c3RyaW5nW10+KChwcmV2LCBjdXJyKSA9PiB7XG4gICAgICAgIGlmIChwcmV2Lmxlbmd0aCA8IGN1cnIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgbmV3QWRkZWQgPSBfLmRpZmZlcmVuY2UoY3VyciwgcHJldik7XG4gICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgY29uc29sZS5sb2coJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBuZXdBZGRlZCkge1xuICAgICAgICAgICAgYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7ZGlyfSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHdyaXRlQ29uZmlnRmlsZXMoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycjtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIG1lcmdlTWFwKGFjdGlvbiA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KGFjdGlvbi5wYXlsb2FkLmRpcikpKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKHdzID0+IHdzICE9IG51bGwpXG4gICAgICApKSxcbiAgICAgIGNvbmNhdE1hcCh3cyA9PiBmcm9tKGluc3RhbGxXb3Jrc3BhY2Uod3MhKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLi4uQXJyYXkuZnJvbShnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpKS5tYXAoa2V5ID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcy5nZXQoa2V5KSEuaW5zdGFsbEpzb25TdHIpLFxuICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICBmaWx0ZXIoaW5zdGFsbEpzb25TdHIgPT5pbnN0YWxsSnNvblN0ci5sZW5ndGggPiAwKSxcbiAgICAgICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICAgICAgbWFwKCgpID0+IHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZygnKysrKysrKysrKysgZW1pdCBhY3Rpb24nLCBkaXIpO1xuICAgICAgICAgIHJldHVybiBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHtkaXI6IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGtleSl9KTtcbiAgICAgICAgfSksXG4gICAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICAgICk7XG4gICAgfSksXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgbWFwKHMgPT4gcy5naXRJZ25vcmVzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAoZ2l0SWdub3JlcyA9PiBPYmplY3Qua2V5cyhnaXRJZ25vcmVzKS5qb2luKCcsJykpLFxuICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIHN3aXRjaE1hcCgoKSA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCckJCQkJCQkJCQnLCBmaWxlcyk7XG4gICAgICAgIHJldHVybiBtZXJnZSguLi5PYmplY3Qua2V5cyhnZXRTdGF0ZSgpLmdpdElnbm9yZXMpLm1hcChmaWxlID0+IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLmdpdElnbm9yZXNbZmlsZV0pLFxuICAgICAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgc2tpcCgxKSxcbiAgICAgICAgICBtYXAoY29udGVudCA9PiB7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGUoZmlsZSwgY29udGVudCwgKCkgPT4ge1xuICAgICAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vZGlmeScsIGZpbGUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuYWRkUHJvamVjdCwgc2xpY2UuYWN0aW9ucy5kZWxldGVQcm9qZWN0KSxcbiAgICAgIGNvbmNhdE1hcCgoKSA9PiBmcm9tKF9zY2FuUGFja2FnZUFuZExpbmsoKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgIClcbiAgKS5waXBlKFxuICAgIGNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1twYWNrYWdlLW1nci5pbmRleF0nLCBlcnIpO1xuICAgICAgcmV0dXJuIG9mKCk7XG4gICAgfSlcbiAgKTtcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdGUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdGF0ZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdG9yZSgpOiBPYnNlcnZhYmxlPFBhY2thZ2VzU3RhdGU+IHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0b3JlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1Byb2pLZXkocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKGdldFJvb3REaXIoKSwgcGF0aCk7XG4gIHJldHVybiByZWxQYXRoLnN0YXJ0c1dpdGgoJy4uJykgPyBQYXRoLnJlc29sdmUocGF0aCkgOiByZWxQYXRoO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlS2V5KHBhdGg6IHN0cmluZykge1xuICBsZXQgcmVsID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICBpZiAoUGF0aC5zZXAgPT09ICdcXFxcJylcbiAgICByZWwgPSByZWwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICByZXR1cm4gcmVsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0aFRvV29ya3NwYWNlKHBhdGg6IHN0cmluZykge1xuICByZXR1cm4gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgZm9yIChjb25zdCBwcmogb2YgcHJvamVjdHMpIHtcbiAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocGF0aFRvUHJvaktleShwcmopKTtcbiAgICBpZiAocGtnTmFtZXMpIHtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwayA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICBpZiAocGspXG4gICAgICAgICAgeWllbGQgcGs7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG4vLyBpbXBvcnQgUGFja2FnZU5vZGVJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlcygpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGxldCBpID0gMDtcbiAgZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9LCAnc3JjJyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gQXJyYXkuZnJvbShnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMua2V5cygpKS5tYXAocGogPT4gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgcGopKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlc0J5UHJvamVjdHMoKSB7XG4gIGxldCBvdXQgPSAnJztcbiAgZm9yIChjb25zdCBwcmogb2YgZ2V0UHJvamVjdExpc3QoKSkge1xuICAgIG91dCArPSBjb2wxKGBQcm9qZWN0OiAke3Byan1gKSArICdcXG4nO1xuICAgIGVhY2hSZWNpcGVTcmMocHJqLCAoc3JjRGlyLCByZWNpcGVEaXIpID0+IHtcbiAgICAgIGNvbnN0IHJlbERpciA9IFBhdGgucmVsYXRpdmUocHJqLCBzcmNEaXIpIHx8ICcvJztcbiAgICAgIG91dCArPSBgICAke2NvbDEoJ3wtJyl9ICR7Y3lhbihyZWxEaXIpfVxcbmA7XG4gICAgICBjb25zdCBkZXBzOiBzdHJpbmdbXSA9IHJlY2lwZURpciA/XG4gICAgICAgIE9iamVjdC5rZXlzKHJlcXVpcmUoUGF0aC5yZXNvbHZlKHJlY2lwZURpciwgJ3BhY2thZ2UuanNvbicpKS5kZXBlbmRlbmNpZXMpIDogW107XG4gICAgICBkZXBzLmZvckVhY2gobmFtZSA9PiBvdXQgKz0gYCAgJHtjb2wxKCd8Jyl9ICAkeyBjb2wxKCd8LScpfSAke25hbWV9XFxuYCk7XG4gICAgfSk7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG4gIC8vIG91dCArPSAnXFxuSW5zdGFsbGVkOlxcbic7XG4gIC8vIGVhY2hJbnN0YWxsZWRSZWNpcGUoKHJlY2lwZURpcikgPT4ge1xuICAvLyAgIG91dCArPSBgJHtyZWNpcGVEaXJ9XFxuYDtcbiAgLy8gfSk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUxpbmtlZFBhY2thZ2VTdGF0ZSgpIHtcbiAgY29uc3QganNvblN0cnMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICBBcnJheS5mcm9tKGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZW50cmllcygpKVxuICAgIC5tYXAoKFtuYW1lLCBwa0luZm9dKSA9PiB7XG4gICAgICByZXR1cm4gcmVhZEZpbGVBc3luYyhQYXRoLnJlc29sdmUocGtJbmZvLnJlYWxQYXRoLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG4gICAgfSlcbiAgKTtcblxuICB3YXJuVXNlbGVzc1N5bWxpbmsoKTtcbiAgYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlUGFja2FnZVN0YXRlKGpzb25TdHJzLm1hcChzdHIgPT4gSlNPTi5wYXJzZShzdHIpKSk7XG59XG5cbmZ1bmN0aW9uIHdhcm5Vc2VsZXNzU3ltbGluaygpIHtcbiAgY29uc3Qgc3JjUGFja2FnZXMgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCBub2RlTW9kdWxlID0gUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcycpO1xuICBjb25zdCBkcmNwTmFtZSA9IGdldFN0YXRlKCkubGlua2VkRHJjcCA/IGdldFN0YXRlKCkubGlua2VkRHJjcCEubmFtZSA6IG51bGw7XG4gIHJldHVybiBzY2FuTm9kZU1vZHVsZXNGb3JTeW1saW5rcyhnZXRSb290RGlyKCksIGFzeW5jIGxpbmsgPT4ge1xuICAgIGNvbnN0IHBrZ05hbWUgPSBQYXRoLnJlbGF0aXZlKG5vZGVNb2R1bGUsIGxpbmspLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBpZiAoIGRyY3BOYW1lICE9PSBwa2dOYW1lICYmIHNyY1BhY2thZ2VzLmdldChwa2dOYW1lKSA9PSBudWxsKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdyhgRXh0cmFuZW91cyBzeW1saW5rOiAke2xpbmt9YCkpO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2NvbmZpZy5sb2NhbC10ZW1wbGF0ZS55YW1sJyksIFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnLCAnY29uZmlnLmxvY2FsLnlhbWwnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbG9nNGpzLmpzJyksIHJvb3RQYXRoICsgJy9sb2c0anMuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgcm9vdFBhdGggKyAnL2FwcC5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJywgJ21vZHVsZS1yZXNvbHZlLnNlcnZlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5zZXJ2ZXIudHMnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuYnJvd3Nlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5icm93c2VyLnRzJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gZ2V0UHJvamVjdExpc3QoKTtcblxuICBwcm9qZWN0RGlycy5mb3JFYWNoKHByamRpciA9PiB7XG4gICAgX3dyaXRlR2l0SG9vayhwcmpkaXIpO1xuICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2xpbnQuanNvbicpLCBwcmpkaXIgKyAnL3RzbGludC5qc29uJyk7XG4gIH0pO1xuXG4gIGF3YWl0IF9zY2FuUGFja2FnZUFuZExpbmsoKTtcbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG5cbiAgYXdhaXQgd3JpdGVDb25maWdGaWxlcygpO1xuXG4gIC8vIGNyZWF0ZVByb2plY3RTeW1saW5rKCk7XG4gIHdyaXRlVHNjb25maWc0cHJvamVjdChnZXRQcm9qZWN0TGlzdCgpLCAoZmlsZSwgY29udGVudCkgPT4gYWN0aW9uRGlzcGF0Y2hlci5fdXBkYXRlR2l0SWdub3Jlcyh7ZmlsZSwgY29udGVudH0pKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gd3JpdGVDb25maWdGaWxlcygpIHtcbiAgcmV0dXJuIChhd2FpdCBpbXBvcnQoJy4uL2NtZC9jb25maWctc2V0dXAnKSkuYWRkdXBDb25maWdzKChmaWxlLCBjb25maWdDb250ZW50KSA9PiB7XG4gICAgd3JpdGVGaWxlKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdkaXN0JywgZmlsZSksXG4gICAgICAnXFxuIyBETyBOT1QgTU9ESUZJWSBUSElTIEZJTEUhXFxuJyArIGNvbmZpZ0NvbnRlbnQpO1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFdvcmtzcGFjZSh3czogV29ya3NwYWNlU3RhdGUpIHtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdJbnN0YWxsIGRlcGVuZGVuY2llcyBpbiAnICsgd3MuZGlyKTtcbiAgY29uc3Qgc3ltbGlua3NJbk1vZHVsZURpciA9IFtdIGFzIHtjb250ZW50OiBzdHJpbmcsIGxpbms6IHN0cmluZ31bXTtcblxuICBjb25zdCB0YXJnZXQgPSBQYXRoLnJlc29sdmUod3MuZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gIGlmICghZnMuZXhpc3RzU3luYyh0YXJnZXQpKSB7XG4gICAgZnMubWtkaXJwU3luYyh0YXJnZXQpO1xuICB9XG5cbiAgaWYgKHdzLmxpbmtlZERlcGVuZGVuY2llcy5sZW5ndGggKyB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubGVuZ3RoID4gMCkge1xuICAgIC8vIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlc0ZvclN5bWxpbmtzKHdzLmRpciwgbGluayA9PiB7XG4gICAgICBjb25zdCBsaW5rQ29udGVudCA9IGZzLnJlYWRsaW5rU3luYyhsaW5rKTtcbiAgICAgIHN5bWxpbmtzSW5Nb2R1bGVEaXIucHVzaCh7Y29udGVudDogbGlua0NvbnRlbnQsIGxpbmt9KTtcbiAgICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICB9KTtcbiAgICAvLyBfY2xlYW5BY3Rpb25zLmFkZFdvcmtzcGFjZUZpbGUobGlua3MpO1xuXG4gICAgLy8gMy4gUnVuIGBucG0gaW5zdGFsbGBcbiAgICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUod3MuZGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1tpbml0XSB3cml0ZScsIGluc3RhbGxKc29uRmlsZSk7XG4gICAgZnMud3JpdGVGaWxlKGluc3RhbGxKc29uRmlsZSwgd3MuaW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2luc3RhbGwnLCB7Y3dkOiB3cy5kaXJ9KS5wcm9taXNlO1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnZGVkdXBlJywge2N3ZDogd3MuZGlyfSkucHJvbWlzZTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGUsIGUuc3RhY2spO1xuICAgIH1cbiAgICAvLyA0LiBSZWNvdmVyIHBhY2thZ2UuanNvbiBhbmQgc3ltbGlua3MgZGVsZXRlZCBpbiBTdGVwLjEuXG4gICAgZnMud3JpdGVGaWxlKGluc3RhbGxKc29uRmlsZSwgd3Mub3JpZ2luSW5zdGFsbEpzb25TdHIsICd1dGY4Jyk7XG4gICAgYXdhaXQgcmVjb3ZlclN5bWxpbmtzKCk7XG4gIH1cblxuICBmdW5jdGlvbiByZWNvdmVyU3ltbGlua3MoKSB7XG4gICAgcmV0dXJuIFByb21pc2UuYWxsKHN5bWxpbmtzSW5Nb2R1bGVEaXIubWFwKCh7Y29udGVudCwgbGlua30pID0+IHtcbiAgICAgIHJldHVybiBfc3ltbGlua0FzeW5jKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgIH0pKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBfc2NhblBhY2thZ2VBbmRMaW5rKCkge1xuICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuXG4gIGNvbnN0IHByb2pQa2dNYXA6IE1hcDxzdHJpbmcsIFBhY2thZ2VJbmZvW10+ID0gbmV3IE1hcCgpO1xuXG4gIGF3YWl0IHJtLmxpbmtDb21wb25lbnRzQXN5bmMoKHByb2osIHBrZ0pzb25GaWxlKSA9PiB7XG4gICAgaWYgKCFwcm9qUGtnTWFwLmhhcyhwcm9qKSlcbiAgICAgIHByb2pQa2dNYXAuc2V0KHByb2osIFtdKTtcbiAgICAvLyBjb25zb2xlLmxvZygnX3NjYW5QYWNrYWdlQW5kTGluaycsIHByb2osIHBrZ0pzb25GaWxlKTtcbiAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8ocGtnSnNvbkZpbGUpO1xuICAgIHByb2pQa2dNYXAuZ2V0KHByb2opIS5wdXNoKGluZm8pO1xuICB9KTtcbiAgLy8gY29uc29sZS5sb2coQXJyYXkuZnJvbShwcm9qUGtnTWFwLnZhbHVlcygpKSk7XG4gIGNvbnN0IHBrZ0xpc3Q6IFBhY2thZ2VJbmZvW10gPSBbXTtcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dzXSBvZiBwcm9qUGtnTWFwLmVudHJpZXMoKSkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgcGtnTGlzdC5wdXNoKC4uLnBrZ3MpO1xuICB9XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNQYWNrYWdlc1N0YXRlKHBrZ0xpc3QpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGFja2FnZUluZm8ocGtKc29uRmlsZTogc3RyaW5nLCBpc0luc3RhbGxlZCA9IGZhbHNlKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMocGtKc29uRmlsZSwgJ3V0ZjgnKSk7XG4gIGNvbnN0IG0gPSBtb2R1bGVOYW1lUmVnLmV4ZWMoanNvbi5uYW1lKTtcbiAgY29uc3QgcGtJbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBzaG9ydE5hbWU6IG0hWzJdLFxuICAgIG5hbWU6IGpzb24ubmFtZSxcbiAgICBzY29wZTogbSFbMV0sXG4gICAgcGF0aDogUGF0aC5kaXJuYW1lKHBrSnNvbkZpbGUpLFxuICAgIGpzb24sXG4gICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGtKc29uRmlsZSkpLFxuICAgIGlzSW5zdGFsbGVkXG4gIH07XG4gIHJldHVybiBwa0luZm87XG59XG5cbmZ1bmN0aW9uIGNwKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoXy5zdGFydHNXaXRoKGZyb20sICctJykpIHtcbiAgICBmcm9tID0gYXJndW1lbnRzWzFdO1xuICAgIHRvID0gYXJndW1lbnRzWzJdO1xuICB9XG4gIGZzLmNvcHlTeW5jKGZyb20sIHRvKTtcbiAgLy8gc2hlbGwuY3AoLi4uYXJndW1lbnRzKTtcbiAgaWYgKC9bL1xcXFxdJC8udGVzdCh0bykpXG4gICAgdG8gPSBQYXRoLmJhc2VuYW1lKGZyb20pOyAvLyB0byBpcyBhIGZvbGRlclxuICBlbHNlXG4gICAgdG8gPSBQYXRoLnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHRvKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdjb3B5IHRvICVzJywgY2hhbGsuY3lhbih0bykpO1xufVxuXG5mdW5jdGlvbiBtYXliZUNvcHlUZW1wbGF0ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuZnVuY3Rpb24gX3dyaXRlR2l0SG9vayhwcm9qZWN0OiBzdHJpbmcpIHtcbiAgLy8gaWYgKCFpc1dpbjMyKSB7XG4gIGNvbnN0IGdpdFBhdGggPSBQYXRoLnJlc29sdmUocHJvamVjdCwgJy5naXQvaG9va3MnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCkpIHtcbiAgICBjb25zdCBob29rU3RyID0gJyMhL2Jpbi9zaFxcbicgK1xuICAgICAgYGNkIFwiJHtnZXRSb290RGlyKCl9XCJcXG5gICtcbiAgICAgIC8vICdkcmNwIGluaXRcXG4nICtcbiAgICAgIC8vICducHggcHJldHR5LXF1aWNrIC0tc3RhZ2VkXFxuJyArIC8vIFVzZSBgdHNsaW50IC0tZml4YCBpbnN0ZWFkLlxuICAgICAgYG5vZGUgbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS9iaW4vZHJjcC5qcyBsaW50IC0tcGogXCIke3Byb2plY3QucmVwbGFjZSgvWy9cXFxcXSQvLCAnJyl9XCIgLS1maXhcXG5gO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKSlcbiAgICAgIGZzLnVubGluayhnaXRQYXRoICsgJy9wcmUtY29tbWl0Jyk7XG4gICAgZnMud3JpdGVGaWxlU3luYyhnaXRQYXRoICsgJy9wcmUtcHVzaCcsIGhvb2tTdHIpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdXcml0ZSAnICsgZ2l0UGF0aCArICcvcHJlLXB1c2gnKTtcbiAgICBpZiAoIWlzV2luMzIpIHtcbiAgICAgIHNwYXduKCdjaG1vZCcsICctUicsICcreCcsIHByb2plY3QgKyAnLy5naXQvaG9va3MvcHJlLXB1c2gnKTtcbiAgICB9XG4gIH1cbiAgLy8gfVxufVxuIl19