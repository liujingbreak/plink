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
exports.listPackagesByProjects = exports.getProjectList = exports.listPackages = exports.getPackagesOfProjects = exports.pathToWorkspace = exports.pathToProjKey = exports.getStore = exports.getState = exports.actionDispatcher = exports.slice = void 0;
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
    workspaces: {},
    project2Packages: {},
    srcPackages: {},
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
            d.srcPackages = {};
            for (const pkInfo of payload) {
                d.srcPackages[pkInfo.name] = pkInfo;
            }
        },
        _updatePackageState(d, { payload: jsons }) {
            for (const json of jsons) {
                const pkg = d.srcPackages[json.name];
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
                if (!lodash_1.default.has(d.project2Packages, dir)) {
                    d.project2Packages[dir] = [];
                }
            }
        },
        deleteProject(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathToProjKey(rawDir);
                delete d.project2Packages[dir];
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
                if (lodash_1.default.has(state.srcPackages, dep[0])) {
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
                if (lodash_1.default.has(state.srcPackages, dep[0])) {
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
            const hoistedDeps = dependency_installer_1.listCompDependency(linkedDependencies.map(entry => state.srcPackages[entry[0]].json), dir, updatingDeps);
            const hoistedDevDeps = dependency_installer_1.listCompDependency(linkedDevDependencies.map(entry => state.srcPackages[entry[0]].json), dir, updatingDevDeps);
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
            state.workspaces[dir] = wp;
            // console.log('-----------------', dir);
        },
        _installWorkspace(state, { payload: { dir } }) {
        },
        _associatePackageToPrj(d, { payload: { prj, pkgs } }) {
            d.project2Packages[prj] = pkgs.map(pkgs => pkgs.name);
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
        if (lodash_1.default.size(getState().srcPackages) === 0) {
            return rxjs_1.merge(hoistOnPackageChanges, rxjs_1.of(exports.slice.actions.initRootDir()));
        }
        else {
            log_config_1.default(config_1.default());
            if (opt.force) {
                exports.actionDispatcher._change(d => {
                    // console.log('********* clean up')
                    // d.workspaces[dir] = {};
                    d.workspaces[dir].installJsonStr = ''; // clean so that it will be changed after _hoistWorkspaceDeps
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
        const ws = getState().workspaces[payload.dir];
        const pks = [
            ...ws.linkedDependencies.map(([name, ver]) => srcPackages[name]),
            ...ws.linkedDevDependencies.map(([name, ver]) => srcPackages[name])
        ];
        if (getState().linkedDrcp) {
            const drcp = getState().linkedDrcp.name;
            const spaceJson = getState().workspaces[payload.dir].originInstallJson;
            if (spaceJson.dependencies && spaceJson.dependencies[drcp] ||
                spaceJson.devDependencies && spaceJson.devDependencies[drcp]) {
                pks.push(getState().linkedDrcp);
            }
        }
        return rxjs_1.from(editor_helper_1.writeTsconfigForEachPackage(payload.dir, pks, (file, content) => exports.actionDispatcher._updateGitIgnores({ file, content })));
    }), operators_1.ignoreElements()), 
    // Handle newly added workspace
    getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), operators_1.map(ws => Object.keys(ws)), operators_1.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            console.log('New workspace: ', newAdded);
            for (const dir of newAdded) {
                exports.actionDispatcher._installWorkspace({ dir });
            }
        }
        return curr;
    }), operators_1.ignoreElements()), action$.pipe(store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_1.mergeMap(action => getStore().pipe(operators_1.map(s => s.workspaces[action.payload.dir]), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null))), operators_1.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_1.ignoreElements()), ...Object.keys(getState().workspaces).map(dir => {
        return getStore().pipe(operators_1.map(s => s.workspaces[dir].installJsonStr), operators_1.distinctUntilChanged(), operators_1.filter(installJsonStr => installJsonStr.length > 0), operators_1.skip(1), operators_1.take(1), operators_1.map(() => {
            // console.log('+++++++++++ emit action', dir);
            return exports.actionDispatcher._installWorkspace({ dir });
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
function pathToWorkspace(path) {
    return path_1.default.relative(utils_2.getRootDir(), path);
}
exports.pathToWorkspace = pathToWorkspace;
function getPackagesOfProjects(projects) {
    return projects.reduce((pkgs, prj) => {
        const pkgNames = getState().project2Packages[pathToProjKey(prj)];
        pkgNames.forEach(pkgName => pkgs.push(getState().srcPackages[pkgName]));
        return pkgs;
    }, []);
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
    return Object.keys(getState().project2Packages).map(pj => path_1.default.resolve(utils_2.getRootDir(), pj));
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
        const jsonStrs = yield Promise.all(Object.entries(getState().srcPackages || [])
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
        if (drcpName !== pkgName && srcPackages[pkgName] == null) {
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
        yield (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            utils_1.writeFile(path_1.default.resolve(rootPath, 'dist', file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
        // createProjectSymlink();
        editor_helper_1.writeTsconfig4project(getProjectList(), (file, content) => exports.actionDispatcher._updateGitIgnores({ file, content }));
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
function createPackageInfo(pkJsonFile) {
    const json = JSON.parse(fs_extra_1.default.readFileSync(pkJsonFile, 'utf8'));
    const m = moduleNameReg.exec(json.name);
    const pkInfo = {
        shortName: m[2],
        name: json.name,
        scope: m[1],
        path: path_1.default.dirname(pkJsonFile),
        json,
        realPath: fs_extra_1.default.realpathSync(path_1.default.dirname(pkJsonFile))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFzQztBQUN0Qyw4Q0FDeUY7QUFDekYsd0NBQXlDO0FBQ3pDLHVEQUErQjtBQUMvQixrRUFBZ0Y7QUFDaEYsb0RBQXNGO0FBQ3RGLCtEQUFzQztBQUN0QyxvREFBbUQ7QUFDbkQsb0RBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCxvREFBdUM7QUFDdkMsc0RBQXlGO0FBQ3pGLG9DQUF5RDtBQUN6RCxvQ0FBcUQ7QUFDckQsOERBQTBIO0FBRzFILCtCQUErQjtBQUUvQixNQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFzQjdDLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQztBQUN0QixNQUFNLGFBQWEsR0FBRyx1QkFBdUIsQ0FBQztBQUU5QyxNQUFNLEtBQUssR0FBa0I7SUFDM0IsVUFBVSxFQUFFLEVBQUU7SUFDZCxnQkFBZ0IsRUFBRSxFQUFFO0lBQ3BCLFdBQVcsRUFBRSxFQUFFO0lBQ2YsTUFBTSxFQUFFLEVBQUU7SUFDVixVQUFVLEVBQUUsRUFBRTtJQUNkLFVBQVUsRUFBRSxxQkFBYSxDQUFDLENBQUM7UUFDekIsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBVSxFQUFFLEVBQUUsMkNBQTJDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0NBQ3BHLENBQUM7QUFvQlcsUUFBQSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxRQUFRLENBQUM7SUFDekMsSUFBSSxFQUFFLEVBQUU7SUFDUixZQUFZLEVBQUUsS0FBSztJQUNuQixRQUFR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LENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsa0JBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBZTtJQUNwQyxrQkFBa0I7SUFDbEIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDcEQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMxQixNQUFNLE9BQU8sR0FBRyxhQUFhO1lBQzNCLE9BQU8sa0JBQVUsRUFBRSxLQUFLO1lBQ3hCLGtCQUFrQjtZQUNsQixpRUFBaUU7WUFDakUsNERBQTRELE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDdkcsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDO1lBQ3hDLGtCQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztRQUNyQyxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGtCQUFPLEVBQUU7WUFDWixxQkFBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlEO0tBQ0Y7SUFDRCxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBtZXJnZU1hcCxcbiAgcGx1Y2ssIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4sIGNhdGNoRXJyb3IgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9jbWQvdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiB9IGZyb20gJy4uL2RlcGVuZGVuY3ktaW5zdGFsbGVyJztcbmltcG9ydCB7IHdyaXRlVHNjb25maWc0cHJvamVjdCwgd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlIH0gZnJvbSAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHsgZmluZEFsbFBhY2thZ2VzIH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IHsgY3JlYXRlUHJvamVjdFN5bWxpbmsgfSBmcm9tICcuLi9wcm9qZWN0LWRpcic7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IGVhY2hSZWNpcGVTcmMsIHNldFByb2plY3RMaXN0IGFzIHNldFByb2plY3RGb3JSZWNpcGUgfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnksIG9mUGF5bG9hZEFjdGlvbiB9IGZyb20gJy4uL3N0b3JlJztcbmltcG9ydCB7IGdldFJvb3REaXIsIGlzRHJjcFN5bWxpbmsgfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQgY2xlYW5JbnZhbGlkU3ltbGlua3MsIHsgaXNXaW4zMiwgc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3MsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0ICogYXMgY21kT3B0IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgeyBhY3Rpb25zIGFzIF9jbGVhbkFjdGlvbnMgfSBmcm9tICcuLi9jbWQvY2xpLWNsZWFuJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcblxuY29uc3Qge2dyZWVuOiBjb2wxLCBjeWFufSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbi8vIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIHNyY1BhY2thZ2VzOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VJbmZvfTtcbiAgLy8gX3NyY1BhY2thZ2VzQ2hlY2tzdW06IG51bWJlcjtcbiAgd29ya3NwYWNlczoge1tkaXI6IHN0cmluZ106IFdvcmtzcGFjZVN0YXRlfTtcbiAgcHJvamVjdDJQYWNrYWdlczoge1twcmo6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgbGlua2VkRHJjcDogUGFja2FnZUluZm8gfCBudWxsO1xuICBnaXRJZ25vcmVzOiB7W2ZpbGU6IHN0cmluZ106IHN0cmluZ307XG4gIGVycm9yczogc3RyaW5nW107XG59XG5cbmNvbnN0IE5TID0gJ3BhY2thZ2VzJztcbmNvbnN0IG1vZHVsZU5hbWVSZWcgPSAvXig/OkAoW14vXSspXFwvKT8oXFxTKykvO1xuXG5jb25zdCBzdGF0ZTogUGFja2FnZXNTdGF0ZSA9IHtcbiAgd29ya3NwYWNlczoge30sXG4gIHByb2plY3QyUGFja2FnZXM6IHt9LFxuICBzcmNQYWNrYWdlczoge30sXG4gIGVycm9yczogW10sXG4gIGdpdElnbm9yZXM6IHt9LFxuICBsaW5rZWREcmNwOiBpc0RyY3BTeW1saW5rID9cbiAgICBjcmVhdGVQYWNrYWdlSW5mbyhQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCAnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSkgOiBudWxsXG59O1xuXG5pbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBkaXI6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG90aGVyIDNyZCBwYXJ0eSBkZXBlbmRlbmNpZXMgaW4gdHVwbGUgb2YgbmFtZSBhbmQgdmVyc2lvbiBwYWlyICovXG4gIC8vIGRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyBkZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvLyBob2lzdGVkRGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ307XG4gIC8vIGhvaXN0ZWREZXZEZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtob2lzdGVkRGlyOiBzdHJpbmd9IHwgdW5kZWZpbmVkIHwgbnVsbD4pIHtcbiAgICB9LFxuICAgIGluaXRXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZywgb3B0OiBjbWRPcHQuSW5pdENtZE9wdGlvbnN9Pikge1xuICAgIH0sXG4gICAgX3N5bmNQYWNrYWdlc1N0YXRlKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxQYWNrYWdlSW5mb1tdPikge1xuICAgICAgZC5zcmNQYWNrYWdlcyA9IHt9O1xuICAgICAgZm9yIChjb25zdCBwa0luZm8gb2YgcGF5bG9hZCkge1xuICAgICAgICBkLnNyY1BhY2thZ2VzW3BrSW5mby5uYW1lXSA9IHBrSW5mbztcbiAgICAgIH1cbiAgICB9LFxuICAgIF91cGRhdGVQYWNrYWdlU3RhdGUoZCwge3BheWxvYWQ6IGpzb25zfTogUGF5bG9hZEFjdGlvbjxhbnlbXT4pIHtcbiAgICAgIGZvciAoY29uc3QganNvbiBvZiBqc29ucykge1xuICAgICAgICBjb25zdCBwa2cgPSBkLnNyY1BhY2thZ2VzW2pzb24ubmFtZV07XG4gICAgICAgIGlmIChwa2cgPT0gbnVsbCkge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXG4gICAgICAgICAgICBgW3BhY2thZ2UtbWdyLmluZGV4XSBwYWNrYWdlIG5hbWUgXCIke2pzb24ubmFtZX1cIiBpbiBwYWNrYWdlLmpzb24gaXMgY2hhbmdlZCBzaW5jZSBsYXN0IHRpbWUsXFxuYCArXG4gICAgICAgICAgICAncGxlYXNlIGRvIFwiaW5pdFwiIGFnYWluIG9uIHdvcmtzcGFjZSByb290IGRpcmVjdG9yeScpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICAgIHBrZy5qc29uID0ganNvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIV8uaGFzKGQucHJvamVjdDJQYWNrYWdlcywgZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlc1tkaXJdID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkZWxldGUgZC5wcm9qZWN0MlBhY2thZ2VzW2Rpcl07XG4gICAgICB9XG4gICAgfSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgICAgIGNvbnN0IHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG5cbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChfLmhhcyhzdGF0ZS5zcmNQYWNrYWdlcywgZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGV2RGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgICBjb25zdCB1cGRhdGluZ0RldkRlcHMgPSB7Li4ucGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXZEZXBzID0gW107XG4gICAgICBkZXZEZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoXy5oYXMoc3RhdGUuc3JjUGFja2FnZXMsIGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcblxuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbX2hvaXN0V29ya3NwYWNlRGVwc10gZHItY29tcC1wYWNrYWdlIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuXG4gICAgICAvLyBwa2pzb25MaXN0LnB1c2godXBkYXRpbmdKc29uKTtcblxuICAgICAgY29uc3QgaG9pc3RlZERlcHMgPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMhW2VudHJ5WzBdXS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RlcHNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGhvaXN0ZWREZXZEZXBzID0gbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGVudHJ5ID0+IHN0YXRlLnNyY1BhY2thZ2VzIVtlbnRyeVswXV0uanNvbiksXG4gICAgICAgIGRpciwgdXBkYXRpbmdEZXZEZXBzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiB7Li4uaG9pc3RlZERlcHN9LFxuICAgICAgICBkZXZEZXBlbmRlbmNpZXM6IHsuLi5ob2lzdGVkRGV2RGVwc31cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgZGlyLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXNcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzLFxuICAgICAgICAvLyBkZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIC8vIGhvaXN0ZWREZXBzLFxuICAgICAgICAvLyBob2lzdGVkRGV2RGVwc1xuICAgICAgfTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXNbZGlyXSA9IHdwO1xuICAgICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tJywgZGlyKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiBQYWNrYWdlSW5mb1tdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlc1twcmpdID0gcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUdpdElnbm9yZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZ30+KSB7XG4gICAgICBkLmdpdElnbm9yZXNbcGF5bG9hZC5maWxlXSA9IHBheWxvYWQuY29udGVudDtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG4vLyBleHBvcnQgdHlwZSBBY3Rpb25zVHlwZSA9IHR5cGVvZiBhY3Rpb25zIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5jb25zdCByZWFkRmlsZUFzeW5jID0gcHJvbWlzaWZ5PHN0cmluZywgc3RyaW5nLCBzdHJpbmc+KGZzLnJlYWRGaWxlKTtcbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdEZvclJlY2lwZShnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyAgaW5pdFdvcmtzcGFjZVxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0V29ya3NwYWNlKSxcbiAgICAgIHN3aXRjaE1hcCgoe3BheWxvYWQ6IHtkaXIsIG9wdH19KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gICAgICAgIGNvbnN0IGhvaXN0T25QYWNrYWdlQ2hhbmdlcyA9IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5zcmNQYWNrYWdlcyA9PT0gczIuc3JjUGFja2FnZXMpLFxuICAgICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgICAgbWFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSkpXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKF8uc2l6ZShnZXRTdGF0ZSgpIS5zcmNQYWNrYWdlcykgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoaG9pc3RPblBhY2thZ2VDaGFuZ2VzLCBvZihzbGljZS5hY3Rpb25zLmluaXRSb290RGlyKCkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgICAgICAgIGlmIChvcHQuZm9yY2UpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqKiBjbGVhbiB1cCcpXG4gICAgICAgICAgICAgIC8vIGQud29ya3NwYWNlc1tkaXJdID0ge307XG4gICAgICAgICAgICAgIGQud29ya3NwYWNlc1tkaXJdLmluc3RhbGxKc29uU3RyID0gJyc7IC8vIGNsZWFuIHNvIHRoYXQgaXQgd2lsbCBiZSBjaGFuZ2VkIGFmdGVyIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKTtcbiAgICAgICAgICByZXR1cm4gaG9pc3RPblBhY2thZ2VDaGFuZ2VzO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIpLFxuICAgICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZyb20oaW5pdFJvb3REaXJlY3RvcnkoKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9ob2lzdFdvcmtzcGFjZURlcHMpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3Qgc3JjUGFja2FnZXMgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzITtcbiAgICAgICAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXNbcGF5bG9hZC5kaXJdO1xuICAgICAgICBjb25zdCBwa3MgPSBbXG4gICAgICAgICAgLi4ud3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcCgoW25hbWUsIHZlcl0pID0+IHNyY1BhY2thZ2VzW25hbWVdKSxcbiAgICAgICAgICAuLi53cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKChbbmFtZSwgdmVyXSkgPT4gc3JjUGFja2FnZXNbbmFtZV0pXG4gICAgICAgIF07XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgICBjb25zdCBkcmNwID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lO1xuICAgICAgICAgIGNvbnN0IHNwYWNlSnNvbiA9IGdldFN0YXRlKCkud29ya3NwYWNlc1twYXlsb2FkLmRpcl0ub3JpZ2luSW5zdGFsbEpzb247XG4gICAgICAgICAgaWYgKHNwYWNlSnNvbi5kZXBlbmRlbmNpZXMgJiYgc3BhY2VKc29uLmRlcGVuZGVuY2llc1tkcmNwXSB8fFxuICAgICAgICAgICAgc3BhY2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBzcGFjZUpzb24uZGV2RGVwZW5kZW5jaWVzW2RyY3BdKSB7XG4gICAgICAgICAgICBwa3MucHVzaChnZXRTdGF0ZSgpLmxpbmtlZERyY3AhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyb20od3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHBheWxvYWQuZGlyLCBwa3MsXG4gICAgICAgICAgKGZpbGUsIGNvbnRlbnQpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiBPYmplY3Qua2V5cyh3cykpLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnTmV3IHdvcmtzcGFjZTogJywgbmV3QWRkZWQpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHtkaXJ9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnI7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgICBtZXJnZU1hcChhY3Rpb24gPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXNbYWN0aW9uLnBheWxvYWQuZGlyXSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKVxuICAgICAgKSksXG4gICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzKS5tYXAoZGlyID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlc1tkaXJdLmluc3RhbGxKc29uU3RyKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKGluc3RhbGxKc29uU3RyID0+aW5zdGFsbEpzb25TdHIubGVuZ3RoID4gMCksXG4gICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJysrKysrKysrKysrIGVtaXQgYWN0aW9uJywgZGlyKTtcbiAgICAgICAgICByZXR1cm4gYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7ZGlyfSk7XG4gICAgICAgIH0pLFxuICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pLFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMuZ2l0SWdub3JlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKGdpdElnbm9yZXMgPT4gT2JqZWN0LmtleXMoZ2l0SWdub3Jlcykuam9pbignLCcpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnJCQkJCQkJCQkJywgZmlsZXMpO1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS5naXRJZ25vcmVzKS5tYXAoZmlsZSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy5naXRJZ25vcmVzW2ZpbGVdKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIHNraXAoMSksXG4gICAgICAgICAgbWFwKGNvbnRlbnQgPT4ge1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFkZFByb2plY3QsIHNsaWNlLmFjdGlvbnMuZGVsZXRlUHJvamVjdCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gZnJvbShfc2NhblBhY2thZ2VBbmRMaW5rKCkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApXG4gICkucGlwZShcbiAgICBjYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdbcGFja2FnZS1tZ3IuaW5kZXhdJywgZXJyKTtcbiAgICAgIHJldHVybiBvZigpO1xuICAgIH0pXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICBjb25zdCByZWxQYXRoID0gUGF0aC5yZWxhdGl2ZShnZXRSb290RGlyKCksIHBhdGgpO1xuICByZXR1cm4gcmVsUGF0aC5zdGFydHNXaXRoKCcuLicpID8gUGF0aC5yZXNvbHZlKHBhdGgpIDogcmVsUGF0aDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGhUb1dvcmtzcGFjZShwYXRoOiBzdHJpbmcpIHtcbiAgcmV0dXJuIFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBhY2thZ2VzT2ZQcm9qZWN0cyhwcm9qZWN0czogc3RyaW5nW10pIHtcbiAgcmV0dXJuIHByb2plY3RzLnJlZHVjZSgocGtncywgcHJqKSA9PiB7XG4gICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXNbcGF0aFRvUHJvaktleShwcmopXTtcbiAgICBwa2dOYW1lcy5mb3JFYWNoKHBrZ05hbWUgPT4gcGtncy5wdXNoKGdldFN0YXRlKCkuc3JjUGFja2FnZXNbcGtnTmFtZV0pKTtcbiAgICByZXR1cm4gcGtncztcbiAgfSwgW10gYXMgUGFja2FnZUluZm9bXSk7XG59XG4vLyBpbXBvcnQgUGFja2FnZU5vZGVJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlcygpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGxldCBpID0gMDtcbiAgZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9LCAnc3JjJyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMoZ2V0U3RhdGUoKSEucHJvamVjdDJQYWNrYWdlcykubWFwKHBqID0+IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHBqKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBsZXQgb3V0ID0gJyc7XG4gIGZvciAoY29uc3QgcHJqIG9mIGdldFByb2plY3RMaXN0KCkpIHtcbiAgICBvdXQgKz0gY29sMShgUHJvamVjdDogJHtwcmp9YCkgKyAnXFxuJztcbiAgICBlYWNoUmVjaXBlU3JjKHByaiwgKHNyY0RpciwgcmVjaXBlRGlyKSA9PiB7XG4gICAgICBjb25zdCByZWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByaiwgc3JjRGlyKSB8fCAnLyc7XG4gICAgICBvdXQgKz0gYCAgJHtjb2wxKCd8LScpfSAke2N5YW4ocmVsRGlyKX1cXG5gO1xuICAgICAgY29uc3QgZGVwczogc3RyaW5nW10gPSByZWNpcGVEaXIgP1xuICAgICAgICBPYmplY3Qua2V5cyhyZXF1aXJlKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSkuZGVwZW5kZW5jaWVzKSA6IFtdO1xuICAgICAgZGVwcy5mb3JFYWNoKG5hbWUgPT4gb3V0ICs9IGAgICR7Y29sMSgnfCcpfSAgJHsgY29sMSgnfC0nKX0gJHtuYW1lfVxcbmApO1xuICAgIH0pO1xuICAgIG91dCArPSAnXFxuJztcbiAgfVxuICAvLyBvdXQgKz0gJ1xcbkluc3RhbGxlZDpcXG4nO1xuICAvLyBlYWNoSW5zdGFsbGVkUmVjaXBlKChyZWNpcGVEaXIpID0+IHtcbiAgLy8gICBvdXQgKz0gYCR7cmVjaXBlRGlyfVxcbmA7XG4gIC8vIH0pO1xuICByZXR1cm4gb3V0O1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKSB7XG4gIGNvbnN0IGpzb25TdHJzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgT2JqZWN0LmVudHJpZXMoZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcyB8fCBbXSlcbiAgICAubWFwKChbbmFtZSwgcGtJbmZvXSkgPT4ge1xuICAgICAgcmV0dXJuIHJlYWRGaWxlQXN5bmMoUGF0aC5yZXNvbHZlKHBrSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuICAgIH0pXG4gICk7XG5cbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBhY2thZ2VTdGF0ZShqc29uU3Rycy5tYXAoc3RyID0+IEpTT04ucGFyc2Uoc3RyKSkpO1xufVxuXG5mdW5jdGlvbiB3YXJuVXNlbGVzc1N5bWxpbmsoKSB7XG4gIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3Qgbm9kZU1vZHVsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICByZXR1cm4gc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3MoZ2V0Um9vdERpcigpLCBhc3luYyBsaW5rID0+IHtcbiAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiBzcmNQYWNrYWdlc1twa2dOYW1lXSA9PSBudWxsKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdyhgRXh0cmFuZW91cyBzeW1saW5rOiAke2xpbmt9YCkpO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2NvbmZpZy5sb2NhbC10ZW1wbGF0ZS55YW1sJyksIFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnLCAnY29uZmlnLmxvY2FsLnlhbWwnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbG9nNGpzLmpzJyksIHJvb3RQYXRoICsgJy9sb2c0anMuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgcm9vdFBhdGggKyAnL2FwcC5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJywgJ21vZHVsZS1yZXNvbHZlLnNlcnZlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5zZXJ2ZXIudHMnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuYnJvd3Nlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5icm93c2VyLnRzJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgIHBsdWNrKCdwcm9qZWN0MlBhY2thZ2VzJyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3QyUGFja2FnZXMgPT4gT2JqZWN0LmtleXMocHJvamVjdDJQYWNrYWdlcykubWFwKGRpciA9PiBQYXRoLnJlc29sdmUoZGlyKSkpLFxuICAgIHRha2UoMSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBwcm9qZWN0RGlycy5mb3JFYWNoKHByamRpciA9PiB7XG4gICAgX3dyaXRlR2l0SG9vayhwcmpkaXIpO1xuICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2xpbnQuanNvbicpLCBwcmpkaXIgKyAnL3RzbGludC5qc29uJyk7XG4gIH0pO1xuXG4gIGF3YWl0IF9zY2FuUGFja2FnZUFuZExpbmsoKTtcbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG5cbiAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbiAgICB3cml0ZUZpbGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAnZGlzdCcsIGZpbGUpLFxuICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbiAgfSk7XG5cbiAgLy8gY3JlYXRlUHJvamVjdFN5bWxpbmsoKTtcbiAgd3JpdGVUc2NvbmZpZzRwcm9qZWN0KGdldFByb2plY3RMaXN0KCksIChmaWxlLCBjb250ZW50KSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVHaXRJZ25vcmVzKHtmaWxlLCBjb250ZW50fSkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyB3cy5kaXIpO1xuICBjb25zdCBzeW1saW5rc0luTW9kdWxlRGlyID0gW10gYXMge2NvbnRlbnQ6IHN0cmluZywgbGluazogc3RyaW5nfVtdO1xuXG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3cy5kaXIsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICBmcy5ta2RpcnBTeW5jKHRhcmdldCk7XG4gIH1cblxuICBpZiAod3MubGlua2VkRGVwZW5kZW5jaWVzLmxlbmd0aCArIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAgIC8vIGJhY2t1cCB0aGVtIGZvciBsYXRlIHJlY292ZXJ5XG4gICAgYXdhaXQgc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3Mod3MuZGlyLCBsaW5rID0+IHtcbiAgICAgIGNvbnN0IGxpbmtDb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgICAgcmV0dXJuIHVubGlua0FzeW5jKGxpbmspO1xuICAgIH0pO1xuICAgIC8vIF9jbGVhbkFjdGlvbnMuYWRkV29ya3NwYWNlRmlsZShsaW5rcyk7XG5cbiAgICAvLyAzLiBSdW4gYG5wbSBpbnN0YWxsYFxuICAgIGNvbnN0IGluc3RhbGxKc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh3cy5kaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2luaXRdIHdyaXRlJywgaW5zdGFsbEpzb25GaWxlKTtcblxuICAgIGZzLndyaXRlRmlsZShpbnN0YWxsSnNvbkZpbGUsIHdzLmluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGUoJ25wbScsICdpbnN0YWxsJywge2N3ZDogd3MuZGlyfSkucHJvbWlzZTtcbiAgICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2RlZHVwZScsIHtjd2Q6IHdzLmRpcn0pLnByb21pc2U7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhlLCBlLnN0YWNrKTtcbiAgICB9XG4gICAgLy8gNC4gUmVjb3ZlciBwYWNrYWdlLmpzb24gYW5kIHN5bWxpbmtzIGRlbGV0ZWQgaW4gU3RlcC4xLlxuICAgIGZzLndyaXRlRmlsZShpbnN0YWxsSnNvbkZpbGUsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICAgIGF3YWl0IHJlY292ZXJTeW1saW5rcygpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICByZXR1cm4gX3N5bWxpbmtBc3luYyhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gX3NjYW5QYWNrYWdlQW5kTGluaygpIHtcbiAgY29uc3Qgcm0gPSAoYXdhaXQgaW1wb3J0KCcuLi9yZWNpcGUtbWFuYWdlcicpKTtcblxuICBjb25zdCBwcm9qUGtnTWFwOiB7W3Byb2o6IHN0cmluZ106IFBhY2thZ2VJbmZvW119ID0ge307XG4gIGF3YWl0IHJtLmxpbmtDb21wb25lbnRzQXN5bmMoKHByb2osIHBrZ0pzb25GaWxlKSA9PiB7XG4gICAgaWYgKHByb2pQa2dNYXBbcHJval0gPT0gbnVsbClcbiAgICAgIHByb2pQa2dNYXBbcHJval0gPSBbXTtcbiAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8ocGtnSnNvbkZpbGUpO1xuICAgIHByb2pQa2dNYXBbcHJval0ucHVzaChpbmZvKTtcbiAgfSk7XG4gIGNvbnN0IHBrZ0xpc3Q6IFBhY2thZ2VJbmZvW10gPSBbXTtcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dzXSBvZiBPYmplY3QuZW50cmllcyhwcm9qUGtnTWFwKSkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgcGtnTGlzdC5wdXNoKC4uLnBrZ3MpO1xuICB9XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNQYWNrYWdlc1N0YXRlKHBrZ0xpc3QpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBQYXRoLmRpcm5hbWUocGtKc29uRmlsZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSlcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChfLnN0YXJ0c1dpdGgoZnJvbSwgJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnMuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgdG8pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ2NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBfd3JpdGVHaXRIb29rKHByb2plY3Q6IHN0cmluZykge1xuICAvLyBpZiAoIWlzV2luMzIpIHtcbiAgY29uc3QgZ2l0UGF0aCA9IFBhdGgucmVzb2x2ZShwcm9qZWN0LCAnLmdpdC9ob29rcycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoKSkge1xuICAgIGNvbnN0IGhvb2tTdHIgPSAnIyEvYmluL3NoXFxuJyArXG4gICAgICBgY2QgXCIke2dldFJvb3REaXIoKX1cIlxcbmAgK1xuICAgICAgLy8gJ2RyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJ25weCBwcmV0dHktcXVpY2sgLS1zdGFnZWRcXG4nICsgLy8gVXNlIGB0c2xpbnQgLS1maXhgIGluc3RlYWQuXG4gICAgICBgbm9kZSBub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL2Jpbi9kcmNwLmpzIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG4iXX0=