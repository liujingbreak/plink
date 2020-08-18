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
exports.pathToProjKey = exports.listPackagesByProjects = exports.getProjectList = exports.listPackages = exports.getStore = exports.getState = exports.actionDispatcher = exports.slice = void 0;
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
const redux_store_1 = require("../utils/redux-store");
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
        _updatePackageState(d, { payload }) {
            for (const json of payload) {
                d.srcPackages[json.name].json = json;
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
    action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions.initWorkspace), operators_1.switchMap(({ payload: { dir, opt } }) => {
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
    action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_1.switchMap(() => {
        return rxjs_1.from(initRootDirectory());
    }), operators_1.ignoreElements()), action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions._hoistWorkspaceDeps), operators_1.concatMap(({ payload }) => {
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
    }), operators_1.ignoreElements()), action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_1.mergeMap(action => getStore().pipe(operators_1.map(s => s.workspaces[action.payload.dir]), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null))), operators_1.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_1.ignoreElements()), ...Object.keys(getState().workspaces).map(dir => {
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
    }), operators_1.ignoreElements()), action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions.addProject, exports.slice.actions.deleteProject), operators_1.concatMap(() => rxjs_1.from(_scanPackageAndLink())), operators_1.ignoreElements()));
});
function getState() {
    return store_1.stateFactory.sliceState(exports.slice);
}
exports.getState = getState;
function getStore() {
    return store_1.stateFactory.sliceStore(exports.slice);
}
exports.getStore = getStore;
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
// async function scanDirForNodeModules(packageDirs: string[], workspaceDir: string) {
//   // const workspaceNm = Path.resolve(workspaceDir, 'node_modules');
//   const nmDirs = await Promise.all(packageDirs.map(async dir => {
//     const nm = Path.resolve(dir, 'node_modules');
//     try {
//       // await symlinkAsync(workspaceNm, nm);
//     } catch (err) {
//       console.error(chalk.red('[scanDirForNodeModules]'), err);
//     }
//     return nm;
//   }));
//   return nmDirs;
//   // console.log(nmDirs.join('\n'));
// }
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
function pathOfRootPath(path) {
    const relPath = path_1.default.relative(utils_2.getRootDir(), path);
    return relPath.startsWith('..') ? path_1.default.resolve(path) : relPath;
}
function pathToProjKey(path) {
    return pathOfRootPath(path);
}
exports.pathToProjKey = pathToProjKey;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUFzQztBQUN0Qyw4Q0FDNkU7QUFDN0Usd0NBQXlDO0FBQ3pDLHVEQUErQjtBQUMvQixrRUFBZ0Y7QUFDaEYsb0RBQXNGO0FBQ3RGLCtEQUFzQztBQUN0QyxvREFBbUQ7QUFDbkQsb0RBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCxvREFBdUM7QUFDdkMsc0RBQXlGO0FBQ3pGLG9DQUF3QztBQUN4QyxvQ0FBcUQ7QUFDckQsc0RBQXVEO0FBQ3ZELDhEQUEwSDtBQUcxSCwrQkFBK0I7QUFFL0IsTUFBTSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBc0I3QyxNQUFNLEVBQUUsR0FBRyxVQUFVLENBQUM7QUFDdEIsTUFBTSxhQUFhLEdBQUcsdUJBQXVCLENBQUM7QUFFOUMsTUFBTSxLQUFLLEdBQWtCO0lBQzNCLFVBQVUsRUFBRSxFQUFFO0lBQ2QsZ0JBQWdCLEVBQUUsRUFBRTtJQUNwQixXQUFXLEVBQUUsRUFBRTtJQUNmLE1BQU0sRUFBRSxFQUFFO0lBQ1YsVUFBVSxFQUFFLEVBQUU7SUFDZCxVQUFVLEVBQUUscUJBQWEsQ0FBQyxDQUFDO1FBQ3pCLGlCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsa0JBQVUsRUFBRSxFQUFFLDJDQUEyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtDQUNwRyxDQUFDO0FBb0JXLFFBQUEsS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ3pDLElBQUksRUFBRSxFQUFFO0lBQ1IsWUFBWSxFQUFFLEtBQUs7SUFDbkIsUUFBUSxFQUFFO1FBQ1IsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUE4RDtRQUM3RSxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxNQUFnRTtRQUNqRixDQUFDO1FBQ0Qsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUErQjtZQUMzRCxDQUFDLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZQUNuQixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtnQkFDNUIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQztRQUNELG1CQUFtQixDQUFDLENBQUMsRUFBRSxFQUFDLE9BQU8sRUFBdUI7WUFDcEQsS0FBSyxNQUFNLElBQUksSUFBSSxPQUFPLEVBQUU7Z0JBQzFCLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7YUFDdEM7UUFDSCxDQUFDO1FBQ0QsVUFBVSxDQUFDLENBQUMsRUFBRSxNQUErQjtZQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUU7Z0JBQ25DLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxDQUFDLGdCQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLENBQUMsRUFBRTtvQkFDbkMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDOUI7YUFDRjtRQUNILENBQUM7UUFDRCxhQUFhLENBQUMsQ0FBQyxFQUFFLE1BQStCO1lBQzlDLEtBQUssTUFBTSxNQUFNLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRTtnQkFDbkMsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNsQyxPQUFPLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUM7UUFDRCxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUMsRUFBK0I7WUFDdkUsSUFBSSxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRTtnQkFDN0IsTUFBTSxJQUFJLEtBQUssQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO2FBQzVFO1lBQ0QsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFeEIsTUFBTSxTQUFTLEdBQUcsa0JBQUUsQ0FBQyxZQUFZLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFN0UsTUFBTSxNQUFNLEdBQXNCLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEQscUdBQXFHO1lBQ3JHLDBCQUEwQjtZQUMxQixJQUFJO1lBRUosTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBUyxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBRS9ELE1BQU0sWUFBWSxxQkFBTyxNQUFNLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sa0JBQWtCLEdBQWdCLEVBQUUsQ0FBQztZQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNoQixJQUFJLGdCQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQ3BDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDN0IsT0FBTyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVCLE9BQU8sS0FBSyxDQUFDO2lCQUNkO2dCQUNELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFTLE1BQU0sQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUM7WUFDckUsTUFBTSxlQUFlLHFCQUFPLE1BQU0sQ0FBQyxlQUFlLElBQUksRUFBRSxDQUFDLENBQUM7WUFDMUQsTUFBTSxxQkFBcUIsR0FBbUIsRUFBRSxDQUFDO1lBQ2pELE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ25CLElBQUksZ0JBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtvQkFDcEMscUJBQXFCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNoQyxPQUFPLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsT0FBTyxLQUFLLENBQUM7aUJBQ2Q7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUkscUJBQWEsRUFBRTtnQkFDakIsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7Z0JBQ2hFLE9BQU8sWUFBWSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQ3ZDLE9BQU8sZUFBZSxDQUFDLGlCQUFpQixDQUFDLENBQUM7YUFDM0M7WUFFRCxpQ0FBaUM7WUFFakMsTUFBTSxXQUFXLEdBQUcseUNBQWtCLENBQ3BDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQ2xFLEdBQUcsRUFBRSxZQUFZLENBQ2xCLENBQUM7WUFFRixNQUFNLGNBQWMsR0FBRyx5Q0FBa0IsQ0FDdkMscUJBQXFCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFdBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFDckUsR0FBRyxFQUFFLGVBQWUsQ0FDckIsQ0FBQztZQUVGLE1BQU0sV0FBVyxtQ0FDWixNQUFNLEtBQ1QsWUFBWSxvQkFBTSxXQUFXLEdBQzdCLGVBQWUsb0JBQU0sY0FBYyxJQUNwQyxDQUFDO1lBRUYsTUFBTSxFQUFFLEdBQW1CO2dCQUN6QixHQUFHO2dCQUNILGlCQUFpQixFQUFFLE1BQU07Z0JBQ3pCLG9CQUFvQixFQUFFLFNBQVM7Z0JBQy9CLFdBQVc7Z0JBQ1gsY0FBYyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7Z0JBQ3ZELGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixnQkFBZ0I7Z0JBQ2hCLG1CQUFtQjtnQkFDbkIsZUFBZTtnQkFDZixpQkFBaUI7YUFDbEIsQ0FBQztZQUNGLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzNCLHlDQUF5QztRQUMzQyxDQUFDO1FBQ0QsaUJBQWlCLENBQUMsS0FBSyxFQUFFLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFDLEVBQStCO1FBQ3ZFLENBQUM7UUFDRCxzQkFBc0IsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQUUsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFDLEVBQW9EO1lBQ2pHLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFDRCxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsRUFBQyxPQUFPLEVBQWlEO1lBQzVFLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUM7UUFDL0MsQ0FBQztLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRVUsUUFBQSxnQkFBZ0IsR0FBRyxvQkFBWSxDQUFDLGtCQUFrQixDQUFDLGFBQUssQ0FBQyxDQUFDO0FBRXZFLG1GQUFtRjtBQUVuRixNQUFNLGFBQWEsR0FBRyxnQkFBUyxDQUF5QixrQkFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ3JFOztHQUVHO0FBQ0gsb0JBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7SUFDdkMsT0FBTyxZQUFLLENBQ1YsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxFQUMxQyxnQ0FBb0IsRUFBRSxFQUN0QixlQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDUiwrQkFBbUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakI7SUFFRCxpQkFBaUI7SUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyw2QkFBZSxDQUFDLGFBQUssQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQ3ZELHFCQUFTLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUMsRUFBQyxFQUFFLEVBQUU7UUFDbEMsR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFeEIsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQzNDLGdDQUFvQixDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsS0FBSyxFQUFFLENBQUMsV0FBVyxDQUFDLEVBQ25FLGdCQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDaEIsZUFBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLHdCQUFnQixDQUFDLG1CQUFtQixDQUFDLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxDQUN2RCxDQUFDO1FBRUYsSUFBSSxnQkFBQyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDekMsT0FBTyxZQUFLLENBQUMscUJBQXFCLEVBQUUsU0FBRSxDQUFDLGFBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQ3RFO2FBQU07WUFDTCxvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3BCLElBQUksR0FBRyxDQUFDLEtBQUssRUFBRTtnQkFDYix3QkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7b0JBQzNCLG9DQUFvQztvQkFDcEMsMEJBQTBCO29CQUMxQixDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUMsQ0FBQyw2REFBNkQ7Z0JBQ3RHLENBQUMsQ0FBQyxDQUFDO2FBQ0o7WUFDRCx3QkFBd0IsRUFBRSxDQUFDO1lBQzNCLE9BQU8scUJBQXFCLENBQUM7U0FDOUI7SUFDSCxDQUFDLENBQUMsRUFDRiwwQkFBYyxFQUFFLENBQ2pCO0lBRUQsY0FBYztJQUNkLE9BQU8sQ0FBQyxJQUFJLENBQUMsNkJBQWUsQ0FBQyxhQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUNyRCxxQkFBUyxDQUFDLEdBQUcsRUFBRTtRQUNiLE9BQU8sV0FBSSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQztJQUNuQyxDQUFDLENBQUMsRUFDRiwwQkFBYyxFQUFFLENBQ2pCLEVBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyw2QkFBZSxDQUFDLGFBQUssQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFDN0QscUJBQVMsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFDLEVBQUUsRUFBRTtRQUN0QixNQUFNLFdBQVcsR0FBRyxRQUFRLEVBQUUsQ0FBQyxXQUFZLENBQUM7UUFDNUMsTUFBTSxFQUFFLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5QyxNQUFNLEdBQUcsR0FBRztZQUNWLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEUsR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUNwRSxDQUFDO1FBQ0YsSUFBSSxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUU7WUFDekIsTUFBTSxJQUFJLEdBQUcsUUFBUSxFQUFFLENBQUMsVUFBVyxDQUFDLElBQUksQ0FBQztZQUN6QyxNQUFNLFNBQVMsR0FBRyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1lBQ3ZFLElBQUksU0FBUyxDQUFDLFlBQVksSUFBSSxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDeEQsU0FBUyxDQUFDLGVBQWUsSUFBSSxTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFO2dCQUM5RCxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLFVBQVcsQ0FBQyxDQUFDO2FBQ2xDO1NBQ0Y7UUFDRCxPQUFPLFdBQUksQ0FBQywyQ0FBMkIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFDdEQsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FBQyx3QkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDLENBQUMsRUFDRiwwQkFBYyxFQUFFLENBQ2pCO0lBQ0QsK0JBQStCO0lBQy9CLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDOUMsZUFBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUMxQixnQkFBSSxDQUFXLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFO1FBQzVCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzdCLE1BQU0sUUFBUSxHQUFHLGdCQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUN6QyxLQUFLLE1BQU0sR0FBRyxJQUFJLFFBQVEsRUFBRTtnQkFDMUIsd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO2FBQzNDO1NBQ0Y7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakIsRUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLDZCQUFlLENBQUMsYUFBSyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxFQUMzRCxvQkFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNoQyxlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxnQ0FBb0IsRUFBRSxFQUNsRSxrQkFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxDQUN6QixDQUFDLEVBQ0YscUJBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQzNDLDBCQUFjLEVBQUUsQ0FDakIsRUFDRCxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQzlDLE9BQU8sUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNwQixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxFQUMxQyxnQ0FBb0IsRUFBRSxFQUN0QixrQkFBTSxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUEsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsRUFDbEQsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxnQkFBSSxDQUFDLENBQUMsQ0FBQyxFQUNoQixlQUFHLENBQUMsR0FBRyxFQUFFO1lBQ1AsK0NBQStDO1lBQy9DLE9BQU8sd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxHQUFHLEVBQUMsQ0FBQyxDQUFDO1FBQ25ELENBQUMsQ0FBQyxFQUNGLDBCQUFjLEVBQUUsQ0FDakIsQ0FBQztJQUNKLENBQUMsQ0FBQyxFQUNGLFFBQVEsRUFBRSxDQUFDLElBQUksQ0FDYixlQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQ3RCLGdDQUFvQixFQUFFLEVBQ3RCLGVBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQ3BELGdDQUFvQixFQUFFLEVBQ3RCLHFCQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2IsbUNBQW1DO1FBQ25DLE9BQU8sWUFBSyxDQUFDLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxJQUFJLENBQzVFLGVBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsRUFDNUIsZ0NBQW9CLEVBQUUsRUFDdEIsZ0JBQUksQ0FBQyxDQUFDLENBQUMsRUFDUCxlQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7WUFDWixrQkFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDL0IsdUNBQXVDO2dCQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUNILENBQUMsQ0FBQyxDQUFDO0lBQ04sQ0FBQyxDQUFDLEVBQ0YsMEJBQWMsRUFBRSxDQUNqQixFQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsNkJBQWUsQ0FBQyxhQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxhQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUNqRixxQkFBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsRUFDNUMsMEJBQWMsRUFBRSxDQUNqQixDQUNGLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUVILFNBQWdCLFFBQVE7SUFDdEIsT0FBTyxvQkFBWSxDQUFDLFVBQVUsQ0FBQyxhQUFLLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRkQsNEJBRUM7QUFFRCxTQUFnQixRQUFRO0lBQ3RCLE9BQU8sb0JBQVksQ0FBQyxVQUFVLENBQUMsYUFBSyxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUZELDRCQUVDO0FBQ0QsNERBQTREO0FBRTVELFNBQWdCLFlBQVk7SUFDMUIsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ1YsK0JBQWUsQ0FBQyxDQUFDLElBQVksRUFBRSxFQUFFO1FBQy9CLEdBQUcsSUFBSSxHQUFHLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3pCLEdBQUcsSUFBSSxJQUFJLENBQUM7SUFDZCxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFFVixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFURCxvQ0FTQztBQUVELFNBQWdCLGNBQWM7SUFDNUIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRyxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxrQkFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUM3RixDQUFDO0FBRkQsd0NBRUM7QUFFRCxTQUFnQixzQkFBc0I7SUFDcEMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0lBQ2IsS0FBSyxNQUFNLEdBQUcsSUFBSSxjQUFjLEVBQUUsRUFBRTtRQUNsQyxHQUFHLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDdEMsOEJBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7WUFDdkMsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBTSxDQUFDLElBQUksR0FBRyxDQUFDO1lBQ2pELEdBQUcsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztZQUMzQyxNQUFNLElBQUksR0FBYSxTQUFTLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2xGLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7UUFDMUUsQ0FBQyxDQUFDLENBQUM7UUFDSCxHQUFHLElBQUksSUFBSSxDQUFDO0tBQ2I7SUFDRCwyQkFBMkI7SUFDM0IsdUNBQXVDO0lBQ3ZDLDZCQUE2QjtJQUM3QixNQUFNO0lBQ04sT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBbEJELHdEQWtCQztBQUVELFNBQWUsd0JBQXdCOztRQUNyQyxNQUFNLFFBQVEsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQzthQUMzQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsRUFBRSxFQUFFO1lBQ3RCLE9BQU8sYUFBYSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxjQUFjLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RSxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBRUYsa0JBQWtCLEVBQUUsQ0FBQztRQUNyQix3QkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDN0UsQ0FBQztDQUFBO0FBRUQsU0FBUyxrQkFBa0I7SUFDekIsTUFBTSxXQUFXLEdBQUcsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQzNDLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsa0JBQVUsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQzlELE1BQU0sUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQzVFLE9BQU8scUNBQTBCLENBQUMsa0JBQVUsRUFBRSxFQUFFLENBQU0sSUFBSSxFQUFDLEVBQUU7UUFDM0QsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNwRSxJQUFLLFFBQVEsS0FBSyxPQUFPLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksRUFBRTtZQUN6RCx1Q0FBdUM7WUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsTUFBTSxDQUFDLHVCQUF1QixJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUQ7SUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQWUsaUJBQWlCOztRQUM5QixNQUFNLFFBQVEsR0FBRyxrQkFBVSxFQUFFLENBQUM7UUFDOUIsa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMzQyxpQkFBaUIsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSw0Q0FBNEMsQ0FBQyxFQUFFLGNBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7UUFDM0ksaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUM7UUFDakcsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUMsRUFBRSxRQUFRLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFDcEcsaUJBQWlCLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsK0JBQStCLENBQUMsRUFBRSxRQUFRLEdBQUcsMkJBQTJCLENBQUMsQ0FBQztRQUNySSw0Q0FBNEM7UUFDNUMsc0lBQXNJO1FBQ3hJLE1BQU0sa0JBQW9CLEVBQUUsQ0FBQztRQUM3QixJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDN0Msa0JBQUUsQ0FBQyxVQUFVLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUU3QyxvQkFBUyxDQUFDLGdCQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRXBCLE1BQU0sV0FBVyxHQUFHLE1BQU0sUUFBUSxFQUFFLENBQUMsSUFBSSxDQUN2QyxpQkFBSyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsZ0NBQW9CLEVBQUUsRUFDakQsZUFBRyxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQ3BGLGdCQUFJLENBQUMsQ0FBQyxDQUFDLENBQ1IsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUVkLFdBQVcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDM0IsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RCLGlCQUFpQixDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLG1CQUFtQixDQUFDLEVBQUUsTUFBTSxHQUFHLGNBQWMsQ0FBQyxDQUFDO1FBQzNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsRUFBRSxDQUFDO1FBQzVCLGtCQUFrQixFQUFFLENBQUM7UUFFckIsTUFBTSxDQUFDLHdEQUFhLHFCQUFxQixHQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDL0UsaUJBQVMsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQzVDLGlDQUFpQyxHQUFHLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLHFDQUFxQixDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsd0JBQWdCLENBQUMsaUJBQWlCLENBQUMsRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xILENBQUM7Q0FBQTtBQUVELFNBQWUsZ0JBQWdCLENBQUMsRUFBa0I7O1FBQ2hELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxNQUFNLG1CQUFtQixHQUFHLEVBQXVDLENBQUM7UUFFcEUsTUFBTSxNQUFNLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUMxQixrQkFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUN2QjtRQUVELElBQUksRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxFQUFFLENBQUMscUJBQXFCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRTtZQUN0RSwrRUFBK0U7WUFDL0UsZ0NBQWdDO1lBQ2hDLE1BQU0scUNBQTBCLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRTtnQkFDOUMsTUFBTSxXQUFXLEdBQUcsa0JBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFDLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxzQkFBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDO1lBQ0gseUNBQXlDO1lBRXpDLHVCQUF1QjtZQUN2QixNQUFNLGVBQWUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDN0QsdUNBQXVDO1lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1lBRTdDLGtCQUFFLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBRSxFQUFFLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ3pELElBQUk7Z0JBQ0YsTUFBTSxtQkFBRyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNuRCxNQUFNLG1CQUFHLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDbkQ7WUFBQyxPQUFPLENBQUMsRUFBRTtnQkFDVix1Q0FBdUM7Z0JBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzthQUN6QjtZQUNELDBEQUEwRDtZQUMxRCxrQkFBRSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQy9ELE1BQU0sZUFBZSxFQUFFLENBQUM7U0FDekI7UUFFRCxTQUFTLGVBQWU7WUFDdEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLElBQUksRUFBQyxFQUFFLEVBQUU7Z0JBQzdELE9BQU8sd0JBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLGtCQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNOLENBQUM7SUFDSCxDQUFDO0NBQUE7QUFFRCxTQUFlLG1CQUFtQjs7UUFDaEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyx3REFBYSxtQkFBbUIsR0FBQyxDQUFDLENBQUM7UUFFL0MsTUFBTSxVQUFVLEdBQW9DLEVBQUUsQ0FBQztRQUN2RCxNQUFNLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsRUFBRTtZQUNqRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJO2dCQUMxQixVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzVDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBQ2xDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ3BELHdCQUFnQixDQUFDLHNCQUFzQixDQUFDLEVBQUMsR0FBRyxFQUFFLElBQUksRUFBQyxDQUFDLENBQUM7WUFDckQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO1NBQ3ZCO1FBQ0Qsd0JBQWdCLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDL0MsQ0FBQztDQUFBO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxVQUFrQjtJQUMzQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFFLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQzdELE1BQU0sQ0FBQyxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3hDLE1BQU0sTUFBTSxHQUFnQjtRQUMxQixTQUFTLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUNoQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixLQUFLLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUNaLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztRQUM5QixJQUFJO1FBQ0osUUFBUSxFQUFFLGtCQUFFLENBQUMsWUFBWSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7S0FDcEQsQ0FBQztJQUNGLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFFRCxzRkFBc0Y7QUFDdEYsdUVBQXVFO0FBQ3ZFLG9FQUFvRTtBQUNwRSxvREFBb0Q7QUFDcEQsWUFBWTtBQUNaLGdEQUFnRDtBQUNoRCxzQkFBc0I7QUFDdEIsa0VBQWtFO0FBQ2xFLFFBQVE7QUFDUixpQkFBaUI7QUFDakIsU0FBUztBQUNULG1CQUFtQjtBQUNuQix1Q0FBdUM7QUFDdkMsSUFBSTtBQUVKLFNBQVMsRUFBRSxDQUFDLElBQVksRUFBRSxFQUFVO0lBQ2xDLElBQUksZ0JBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFO1FBQzNCLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEIsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNuQjtJQUNELGtCQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN0QiwwQkFBMEI7SUFDMUIsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuQixFQUFFLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjs7UUFFM0MsRUFBRSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3hDLHVDQUF1QztJQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBWSxFQUFFLEVBQVU7SUFDakQsSUFBSSxDQUFDLGtCQUFFLENBQUMsVUFBVSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsa0JBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELEVBQUUsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsSUFBWTtJQUNsQyxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFVLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUNsRCxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNqRSxDQUFDO0FBRUQsU0FBZ0IsYUFBYSxDQUFDLElBQVk7SUFDeEMsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDOUIsQ0FBQztBQUZELHNDQUVDO0FBRUQsU0FBUyxhQUFhLENBQUMsT0FBZTtJQUNwQyxrQkFBa0I7SUFDbEIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDcEQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMxQixNQUFNLE9BQU8sR0FBRyxhQUFhO1lBQzNCLE9BQU8sa0JBQVUsRUFBRSxLQUFLO1lBQ3hCLGtCQUFrQjtZQUNsQixpRUFBaUU7WUFDakUsNERBQTRELE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDdkcsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDO1lBQ3hDLGtCQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztRQUNyQyxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGtCQUFPLEVBQUU7WUFDWixxQkFBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlEO0tBQ0Y7SUFDRCxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIG9mfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBtZXJnZU1hcCxcbiAgcGx1Y2ssIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4gfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9jbWQvdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiB9IGZyb20gJy4uL2RlcGVuZGVuY3ktaW5zdGFsbGVyJztcbmltcG9ydCB7IHdyaXRlVHNjb25maWc0cHJvamVjdCwgd3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlIH0gZnJvbSAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHsgZmluZEFsbFBhY2thZ2VzIH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IHsgY3JlYXRlUHJvamVjdFN5bWxpbmsgfSBmcm9tICcuLi9wcm9qZWN0LWRpcic7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IGVhY2hSZWNpcGVTcmMsIHNldFByb2plY3RMaXN0IGFzIHNldFByb2plY3RGb3JSZWNpcGUgfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBnZXRSb290RGlyLCBpc0RyY3BTeW1saW5rIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgb2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vdXRpbHMvcmVkdXgtc3RvcmUnO1xuaW1wb3J0IGNsZWFuSW52YWxpZFN5bWxpbmtzLCB7IGlzV2luMzIsIHNjYW5Ob2RlTW9kdWxlc0ZvclN5bWxpbmtzLCB1bmxpbmtBc3luYywgX3N5bWxpbmtBc3luYyB9IGZyb20gJy4uL3V0aWxzL3N5bWxpbmtzJztcbmltcG9ydCAqIGFzIGNtZE9wdCBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHsgYWN0aW9ucyBhcyBfY2xlYW5BY3Rpb25zIH0gZnJvbSAnLi4vY21kL2NsaS1jbGVhbic7XG5pbXBvcnQge3Byb21pc2lmeX0gZnJvbSAndXRpbCc7XG5cbmNvbnN0IHtncmVlbjogY29sMSwgY3lhbn0gPSByZXF1aXJlKCdjaGFsaycpO1xuXG4vLyBjb25zdCBpc0RyY3BTeW1saW5rID0gZnMubHN0YXRTeW5jKFBhdGgucmVzb2x2ZSgnbm9kZV9tb2R1bGVzL2RyLWNvbXAtcGFja2FnZScpKS5pc1N5bWJvbGljTGluaygpO1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIG5hbWU6IHN0cmluZztcbiAgc2NvcGU6IHN0cmluZztcbiAgc2hvcnROYW1lOiBzdHJpbmc7XG4gIGpzb246IGFueTtcbiAgcGF0aDogc3RyaW5nO1xuICByZWFsUGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VzU3RhdGUge1xuICBzcmNQYWNrYWdlczoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5mb307XG4gIC8vIF9zcmNQYWNrYWdlc0NoZWNrc3VtOiBudW1iZXI7XG4gIHdvcmtzcGFjZXM6IHtbZGlyOiBzdHJpbmddOiBXb3Jrc3BhY2VTdGF0ZX07XG4gIHByb2plY3QyUGFja2FnZXM6IHtbcHJqOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIGxpbmtlZERyY3A6IFBhY2thZ2VJbmZvIHwgbnVsbDtcbiAgZ2l0SWdub3Jlczoge1tmaWxlOiBzdHJpbmddOiBzdHJpbmd9O1xuICBlcnJvcnM6IHN0cmluZ1tdO1xufVxuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIHdvcmtzcGFjZXM6IHt9LFxuICBwcm9qZWN0MlBhY2thZ2VzOiB7fSxcbiAgc3JjUGFja2FnZXM6IHt9LFxuICBlcnJvcnM6IFtdLFxuICBnaXRJZ25vcmVzOiB7fSxcbiAgbGlua2VkRHJjcDogaXNEcmNwU3ltbGluayA/XG4gICAgY3JlYXRlUGFja2FnZUluZm8oUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgJ25vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpIDogbnVsbFxufTtcblxuaW50ZXJmYWNlIFdvcmtzcGFjZVN0YXRlIHtcbiAgZGlyOiBzdHJpbmc7XG4gIG9yaWdpbkluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZjtcbiAgb3JpZ2luSW5zdGFsbEpzb25TdHI6IHN0cmluZztcbiAgaW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBpbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG5hbWVzIG9mIHRob3NlIHN5bWxpbmsgcGFja2FnZXMgKi9cbiAgbGlua2VkRGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG4gIC8vIC8qKiBvdGhlciAzcmQgcGFydHkgZGVwZW5kZW5jaWVzIGluIHR1cGxlIG9mIG5hbWUgYW5kIHZlcnNpb24gcGFpciAqL1xuICAvLyBkZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gZGV2RGVwZW5kZW5jaWVzOiBbc3RyaW5nLCBzdHJpbmddW107XG5cbiAgLy8gaG9pc3RlZERlcHM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9O1xuICAvLyBob2lzdGVkRGV2RGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ307XG59XG5cbmV4cG9ydCBjb25zdCBzbGljZSA9IHN0YXRlRmFjdG9yeS5uZXdTbGljZSh7XG4gIG5hbWU6IE5TLFxuICBpbml0aWFsU3RhdGU6IHN0YXRlLFxuICByZWR1Y2Vyczoge1xuICAgIGluaXRSb290RGlyKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7aG9pc3RlZERpcjogc3RyaW5nfSB8IHVuZGVmaW5lZCB8IG51bGw+KSB7XG4gICAgfSxcbiAgICBpbml0V29ya3NwYWNlKGQsIGFjdGlvbjogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmcsIG9wdDogY21kT3B0LkluaXRDbWRPcHRpb25zfT4pIHtcbiAgICB9LFxuICAgIF9zeW5jUGFja2FnZXNTdGF0ZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248UGFja2FnZUluZm9bXT4pIHtcbiAgICAgIGQuc3JjUGFja2FnZXMgPSB7fTtcbiAgICAgIGZvciAoY29uc3QgcGtJbmZvIG9mIHBheWxvYWQpIHtcbiAgICAgICAgZC5zcmNQYWNrYWdlc1twa0luZm8ubmFtZV0gPSBwa0luZm87XG4gICAgICB9XG4gICAgfSxcbiAgICBfdXBkYXRlUGFja2FnZVN0YXRlKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjxhbnlbXT4pIHtcbiAgICAgIGZvciAoY29uc3QganNvbiBvZiBwYXlsb2FkKSB7XG4gICAgICAgIGQuc3JjUGFja2FnZXNbanNvbi5uYW1lXS5qc29uID0ganNvbjtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFkZFByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBpZiAoIV8uaGFzKGQucHJvamVjdDJQYWNrYWdlcywgZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlc1tkaXJdID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aFRvUHJvaktleShyYXdEaXIpO1xuICAgICAgICBkZWxldGUgZC5wcm9qZWN0MlBhY2thZ2VzW2Rpcl07XG4gICAgICB9XG4gICAgfSxcbiAgICBfaG9pc3RXb3Jrc3BhY2VEZXBzKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgICBpZiAoc3RhdGUuc3JjUGFja2FnZXMgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1wic3JjUGFja2FnZXNcIiBpcyBudWxsLCBuZWVkIHRvIHJ1biBgaW5pdGAgY29tbWFuZCBmaXJzdCcpO1xuICAgICAgfVxuICAgICAgZGlyID0gUGF0aC5yZXNvbHZlKGRpcik7XG5cbiAgICAgIGNvbnN0IHBranNvblN0ciA9IGZzLnJlYWRGaWxlU3luYyhQYXRoLnJlc29sdmUoZGlyLCAncGFja2FnZS5qc29uJyksICd1dGY4Jyk7XG5cbiAgICAgIGNvbnN0IHBranNvbjogUGFja2FnZUpzb25JbnRlcmYgPSBKU09OLnBhcnNlKHBranNvblN0cik7XG4gICAgICAvLyBmb3IgKGNvbnN0IGRlcHMgb2YgW3BranNvbi5kZXBlbmRlbmNpZXMsIHBranNvbi5kZXZEZXBlbmRlbmNpZXNdIGFzIHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfVtdICkge1xuICAgICAgLy8gICBPYmplY3QuZW50cmllcyhkZXBzKTtcbiAgICAgIC8vIH1cblxuICAgICAgY29uc3QgZGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRlcGVuZGVuY2llcyB8fCB7fSk7XG5cbiAgICAgIGNvbnN0IHVwZGF0aW5nRGVwcyA9IHsuLi5wa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERlcGVuZGVuY2llczogdHlwZW9mIGRlcHMgPSBbXTtcbiAgICAgIGRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChfLmhhcyhzdGF0ZS5zcmNQYWNrYWdlcywgZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGV2RGVwcyA9IE9iamVjdC5lbnRyaWVzPHN0cmluZz4ocGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fSk7XG4gICAgICBjb25zdCB1cGRhdGluZ0RldkRlcHMgPSB7Li4ucGtqc29uLmRldkRlcGVuZGVuY2llcyB8fCB7fX07XG4gICAgICBjb25zdCBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IHR5cGVvZiBkZXZEZXBzID0gW107XG4gICAgICBkZXZEZXBzLmZpbHRlcihkZXAgPT4ge1xuICAgICAgICBpZiAoXy5oYXMoc3RhdGUuc3JjUGFja2FnZXMsIGRlcFswXSkpIHtcbiAgICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMucHVzaChkZXApO1xuICAgICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbZGVwWzBdXTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcblxuICAgICAgaWYgKGlzRHJjcFN5bWxpbmspIHtcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgIGNvbnNvbGUubG9nKCdbX2hvaXN0V29ya3NwYWNlRGVwc10gZHItY29tcC1wYWNrYWdlIGlzIHN5bWxpbmsnKTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICAgIGRlbGV0ZSB1cGRhdGluZ0RldkRlcHNbJ2RyLWNvbXAtcGFja2FnZSddO1xuICAgICAgfVxuXG4gICAgICAvLyBwa2pzb25MaXN0LnB1c2godXBkYXRpbmdKc29uKTtcblxuICAgICAgY29uc3QgaG9pc3RlZERlcHMgPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMhW2VudHJ5WzBdXS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RlcHNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGhvaXN0ZWREZXZEZXBzID0gbGlzdENvbXBEZXBlbmRlbmN5KFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKGVudHJ5ID0+IHN0YXRlLnNyY1BhY2thZ2VzIVtlbnRyeVswXV0uanNvbiksXG4gICAgICAgIGRpciwgdXBkYXRpbmdEZXZEZXBzXG4gICAgICApO1xuXG4gICAgICBjb25zdCBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmYgPSB7XG4gICAgICAgIC4uLnBranNvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiB7Li4uaG9pc3RlZERlcHN9LFxuICAgICAgICBkZXZEZXBlbmRlbmNpZXM6IHsuLi5ob2lzdGVkRGV2RGVwc31cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHdwOiBXb3Jrc3BhY2VTdGF0ZSA9IHtcbiAgICAgICAgZGlyLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvbjogcGtqc29uLFxuICAgICAgICBvcmlnaW5JbnN0YWxsSnNvblN0cjogcGtqc29uU3RyLFxuICAgICAgICBpbnN0YWxsSnNvbixcbiAgICAgICAgaW5zdGFsbEpzb25TdHI6IEpTT04uc3RyaW5naWZ5KGluc3RhbGxKc29uLCBudWxsLCAnICAnKSxcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLFxuICAgICAgICBsaW5rZWREZXZEZXBlbmRlbmNpZXNcbiAgICAgICAgLy8gZGVwZW5kZW5jaWVzLFxuICAgICAgICAvLyBkZXZEZXBlbmRlbmNpZXMsXG4gICAgICAgIC8vIGhvaXN0ZWREZXBzLFxuICAgICAgICAvLyBob2lzdGVkRGV2RGVwc1xuICAgICAgfTtcbiAgICAgIHN0YXRlLndvcmtzcGFjZXNbZGlyXSA9IHdwO1xuICAgICAgLy8gY29uc29sZS5sb2coJy0tLS0tLS0tLS0tLS0tLS0tJywgZGlyKTtcbiAgICB9LFxuICAgIF9pbnN0YWxsV29ya3NwYWNlKHN0YXRlLCB7cGF5bG9hZDoge2Rpcn19OiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZ30+KSB7XG4gICAgfSxcbiAgICBfYXNzb2NpYXRlUGFja2FnZVRvUHJqKGQsIHtwYXlsb2FkOiB7cHJqLCBwa2dzfX06IFBheWxvYWRBY3Rpb248e3Byajogc3RyaW5nOyBwa2dzOiBQYWNrYWdlSW5mb1tdfT4pIHtcbiAgICAgIGQucHJvamVjdDJQYWNrYWdlc1twcmpdID0gcGtncy5tYXAocGtncyA9PiBwa2dzLm5hbWUpO1xuICAgIH0sXG4gICAgX3VwZGF0ZUdpdElnbm9yZXMoZCwge3BheWxvYWR9OiBQYXlsb2FkQWN0aW9uPHtmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZ30+KSB7XG4gICAgICBkLmdpdElnbm9yZXNbcGF5bG9hZC5maWxlXSA9IHBheWxvYWQuY29udGVudDtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG4vLyBleHBvcnQgdHlwZSBBY3Rpb25zVHlwZSA9IHR5cGVvZiBhY3Rpb25zIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5jb25zdCByZWFkRmlsZUFzeW5jID0gcHJvbWlzaWZ5PHN0cmluZywgc3RyaW5nLCBzdHJpbmc+KGZzLnJlYWRGaWxlKTtcbi8qKlxuICogQ2FyZWZ1bGx5IGFjY2VzcyBhbnkgcHJvcGVydHkgb24gY29uZmlnLCBzaW5jZSBjb25maWcgc2V0dGluZyBwcm9iYWJseSBoYXNuJ3QgYmVlbiBzZXQgeWV0IGF0IHRoaXMgbW9tbWVudFxuICovXG5zdGF0ZUZhY3RvcnkuYWRkRXBpYygoYWN0aW9uJCwgc3RhdGUkKSA9PiB7XG4gIHJldHVybiBtZXJnZShcbiAgICBnZXRTdG9yZSgpLnBpcGUobWFwKHMgPT4gcy5wcm9qZWN0MlBhY2thZ2VzKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdEZvclJlY2lwZShnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyAgaW5pdFdvcmtzcGFjZVxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0V29ya3NwYWNlKSxcbiAgICAgIHN3aXRjaE1hcCgoe3BheWxvYWQ6IHtkaXIsIG9wdH19KSA9PiB7XG4gICAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gICAgICAgIGNvbnN0IGhvaXN0T25QYWNrYWdlQ2hhbmdlcyA9IGdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiBzMS5zcmNQYWNrYWdlcyA9PT0gczIuc3JjUGFja2FnZXMpLFxuICAgICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgICAgbWFwKCgpID0+IGFjdGlvbkRpc3BhdGNoZXIuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyfSkpXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKF8uc2l6ZShnZXRTdGF0ZSgpIS5zcmNQYWNrYWdlcykgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoaG9pc3RPblBhY2thZ2VDaGFuZ2VzLCBvZihzbGljZS5hY3Rpb25zLmluaXRSb290RGlyKCkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgICAgICAgIGlmIChvcHQuZm9yY2UpIHtcbiAgICAgICAgICAgIGFjdGlvbkRpc3BhdGNoZXIuX2NoYW5nZShkID0+IHtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJyoqKioqKioqKiBjbGVhbiB1cCcpXG4gICAgICAgICAgICAgIC8vIGQud29ya3NwYWNlc1tkaXJdID0ge307XG4gICAgICAgICAgICAgIGQud29ya3NwYWNlc1tkaXJdLmluc3RhbGxKc29uU3RyID0gJyc7IC8vIGNsZWFuIHNvIHRoYXQgaXQgd2lsbCBiZSBjaGFuZ2VkIGFmdGVyIF9ob2lzdFdvcmtzcGFjZURlcHNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgICB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKTtcbiAgICAgICAgICByZXR1cm4gaG9pc3RPblBhY2thZ2VDaGFuZ2VzO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgLy8gaW5pdFJvb3REaXJcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFJvb3REaXIpLFxuICAgICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGZyb20oaW5pdFJvb3REaXJlY3RvcnkoKSk7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9ob2lzdFdvcmtzcGFjZURlcHMpLFxuICAgICAgY29uY2F0TWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgY29uc3Qgc3JjUGFja2FnZXMgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzITtcbiAgICAgICAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXNbcGF5bG9hZC5kaXJdO1xuICAgICAgICBjb25zdCBwa3MgPSBbXG4gICAgICAgICAgLi4ud3MubGlua2VkRGVwZW5kZW5jaWVzLm1hcCgoW25hbWUsIHZlcl0pID0+IHNyY1BhY2thZ2VzW25hbWVdKSxcbiAgICAgICAgICAuLi53cy5saW5rZWREZXZEZXBlbmRlbmNpZXMubWFwKChbbmFtZSwgdmVyXSkgPT4gc3JjUGFja2FnZXNbbmFtZV0pXG4gICAgICAgIF07XG4gICAgICAgIGlmIChnZXRTdGF0ZSgpLmxpbmtlZERyY3ApIHtcbiAgICAgICAgICBjb25zdCBkcmNwID0gZ2V0U3RhdGUoKS5saW5rZWREcmNwIS5uYW1lO1xuICAgICAgICAgIGNvbnN0IHNwYWNlSnNvbiA9IGdldFN0YXRlKCkud29ya3NwYWNlc1twYXlsb2FkLmRpcl0ub3JpZ2luSW5zdGFsbEpzb247XG4gICAgICAgICAgaWYgKHNwYWNlSnNvbi5kZXBlbmRlbmNpZXMgJiYgc3BhY2VKc29uLmRlcGVuZGVuY2llc1tkcmNwXSB8fFxuICAgICAgICAgICAgc3BhY2VKc29uLmRldkRlcGVuZGVuY2llcyAmJiBzcGFjZUpzb24uZGV2RGVwZW5kZW5jaWVzW2RyY3BdKSB7XG4gICAgICAgICAgICBwa3MucHVzaChnZXRTdGF0ZSgpLmxpbmtlZERyY3AhKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZyb20od3JpdGVUc2NvbmZpZ0ZvckVhY2hQYWNrYWdlKHBheWxvYWQuZGlyLCBwa3MsXG4gICAgICAgICAgKGZpbGUsIGNvbnRlbnQpID0+IGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZUdpdElnbm9yZXMoe2ZpbGUsIGNvbnRlbnR9KSkpO1xuICAgICAgfSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKSxcbiAgICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gICAgZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgbWFwKHMgPT4gcy53b3Jrc3BhY2VzKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgIG1hcCh3cyA9PiBPYmplY3Qua2V5cyh3cykpLFxuICAgICAgc2NhbjxzdHJpbmdbXT4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgICAgaWYgKHByZXYubGVuZ3RoIDwgY3Vyci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBuZXdBZGRlZCA9IF8uZGlmZmVyZW5jZShjdXJyLCBwcmV2KTtcbiAgICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnTmV3IHdvcmtzcGFjZTogJywgbmV3QWRkZWQpO1xuICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIG5ld0FkZGVkKSB7XG4gICAgICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl9pbnN0YWxsV29ya3NwYWNlKHtkaXJ9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnI7XG4gICAgICB9KSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApLFxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5faW5zdGFsbFdvcmtzcGFjZSksXG4gICAgICBtZXJnZU1hcChhY3Rpb24gPT4gZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXNbYWN0aW9uLnBheWxvYWQuZGlyXSksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIGZpbHRlcih3cyA9PiB3cyAhPSBudWxsKVxuICAgICAgKSksXG4gICAgICBjb25jYXRNYXAod3MgPT4gZnJvbShpbnN0YWxsV29ya3NwYWNlKHdzKSkpLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS53b3Jrc3BhY2VzKS5tYXAoZGlyID0+IHtcbiAgICAgIHJldHVybiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlc1tkaXJdLmluc3RhbGxKc29uU3RyKSxcbiAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKGluc3RhbGxKc29uU3RyID0+aW5zdGFsbEpzb25TdHIubGVuZ3RoID4gMCksXG4gICAgICAgIHNraXAoMSksIHRha2UoMSksXG4gICAgICAgIG1hcCgoKSA9PiB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coJysrKysrKysrKysrIGVtaXQgYWN0aW9uJywgZGlyKTtcbiAgICAgICAgICByZXR1cm4gYWN0aW9uRGlzcGF0Y2hlci5faW5zdGFsbFdvcmtzcGFjZSh7ZGlyfSk7XG4gICAgICAgIH0pLFxuICAgICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgICApO1xuICAgIH0pLFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMuZ2l0SWdub3JlcyksXG4gICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgbWFwKGdpdElnbm9yZXMgPT4gT2JqZWN0LmtleXMoZ2l0SWdub3Jlcykuam9pbignLCcpKSxcbiAgICAgIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZygnJCQkJCQkJCQkJywgZmlsZXMpO1xuICAgICAgICByZXR1cm4gbWVyZ2UoLi4uT2JqZWN0LmtleXMoZ2V0U3RhdGUoKS5naXRJZ25vcmVzKS5tYXAoZmlsZSA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy5naXRJZ25vcmVzW2ZpbGVdKSxcbiAgICAgICAgICBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgIHNraXAoMSksXG4gICAgICAgICAgbWFwKGNvbnRlbnQgPT4ge1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlKGZpbGUsIGNvbnRlbnQsICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtb2RpZnknLCBmaWxlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pXG4gICAgICAgICkpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgYWN0aW9uJC5waXBlKG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLmFkZFByb2plY3QsIHNsaWNlLmFjdGlvbnMuZGVsZXRlUHJvamVjdCksXG4gICAgICBjb25jYXRNYXAoKCkgPT4gZnJvbShfc2NhblBhY2thZ2VBbmRMaW5rKCkpKSxcbiAgICAgIGlnbm9yZUVsZW1lbnRzKClcbiAgICApXG4gICk7XG59KTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RhdGUoc2xpY2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RvcmUoKSB7XG4gIHJldHVybiBzdGF0ZUZhY3Rvcnkuc2xpY2VTdG9yZShzbGljZSk7XG59XG4vLyBpbXBvcnQgUGFja2FnZU5vZGVJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RQYWNrYWdlcygpOiBzdHJpbmcge1xuICBsZXQgb3V0ID0gJyc7XG4gIGxldCBpID0gMDtcbiAgZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcpID0+IHtcbiAgICBvdXQgKz0gYCR7aSsrfS4gJHtuYW1lfWA7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9LCAnc3JjJyk7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RMaXN0KCkge1xuICByZXR1cm4gT2JqZWN0LmtleXMoZ2V0U3RhdGUoKSEucHJvamVjdDJQYWNrYWdlcykubWFwKHBqID0+IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIHBqKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXNCeVByb2plY3RzKCkge1xuICBsZXQgb3V0ID0gJyc7XG4gIGZvciAoY29uc3QgcHJqIG9mIGdldFByb2plY3RMaXN0KCkpIHtcbiAgICBvdXQgKz0gY29sMShgUHJvamVjdDogJHtwcmp9YCkgKyAnXFxuJztcbiAgICBlYWNoUmVjaXBlU3JjKHByaiwgKHNyY0RpciwgcmVjaXBlRGlyKSA9PiB7XG4gICAgICBjb25zdCByZWxEaXIgPSBQYXRoLnJlbGF0aXZlKHByaiwgc3JjRGlyKSB8fCAnLyc7XG4gICAgICBvdXQgKz0gYCAgJHtjb2wxKCd8LScpfSAke2N5YW4ocmVsRGlyKX1cXG5gO1xuICAgICAgY29uc3QgZGVwczogc3RyaW5nW10gPSByZWNpcGVEaXIgP1xuICAgICAgICBPYmplY3Qua2V5cyhyZXF1aXJlKFBhdGgucmVzb2x2ZShyZWNpcGVEaXIsICdwYWNrYWdlLmpzb24nKSkuZGVwZW5kZW5jaWVzKSA6IFtdO1xuICAgICAgZGVwcy5mb3JFYWNoKG5hbWUgPT4gb3V0ICs9IGAgICR7Y29sMSgnfCcpfSAgJHsgY29sMSgnfC0nKX0gJHtuYW1lfVxcbmApO1xuICAgIH0pO1xuICAgIG91dCArPSAnXFxuJztcbiAgfVxuICAvLyBvdXQgKz0gJ1xcbkluc3RhbGxlZDpcXG4nO1xuICAvLyBlYWNoSW5zdGFsbGVkUmVjaXBlKChyZWNpcGVEaXIpID0+IHtcbiAgLy8gICBvdXQgKz0gYCR7cmVjaXBlRGlyfVxcbmA7XG4gIC8vIH0pO1xuICByZXR1cm4gb3V0O1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVMaW5rZWRQYWNrYWdlU3RhdGUoKSB7XG4gIGNvbnN0IGpzb25TdHJzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgT2JqZWN0LmVudHJpZXMoZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcyB8fCBbXSlcbiAgICAubWFwKChbbmFtZSwgcGtJbmZvXSkgPT4ge1xuICAgICAgcmV0dXJuIHJlYWRGaWxlQXN5bmMoUGF0aC5yZXNvbHZlKHBrSW5mby5yZWFsUGF0aCwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuICAgIH0pXG4gICk7XG5cbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3VwZGF0ZVBhY2thZ2VTdGF0ZShqc29uU3Rycy5tYXAoc3RyID0+IEpTT04ucGFyc2Uoc3RyKSkpO1xufVxuXG5mdW5jdGlvbiB3YXJuVXNlbGVzc1N5bWxpbmsoKSB7XG4gIGNvbnN0IHNyY1BhY2thZ2VzID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3Qgbm9kZU1vZHVsZSA9IFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3QgZHJjcE5hbWUgPSBnZXRTdGF0ZSgpLmxpbmtlZERyY3AgPyBnZXRTdGF0ZSgpLmxpbmtlZERyY3AhLm5hbWUgOiBudWxsO1xuICByZXR1cm4gc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3MoZ2V0Um9vdERpcigpLCBhc3luYyBsaW5rID0+IHtcbiAgICBjb25zdCBwa2dOYW1lID0gUGF0aC5yZWxhdGl2ZShub2RlTW9kdWxlLCBsaW5rKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgaWYgKCBkcmNwTmFtZSAhPT0gcGtnTmFtZSAmJiBzcmNQYWNrYWdlc1twa2dOYW1lXSA9PSBudWxsKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGNoYWxrLnllbGxvdyhgRXh0cmFuZW91cyBzeW1saW5rOiAke2xpbmt9YCkpO1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBjb25zdCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2NvbmZpZy5sb2NhbC10ZW1wbGF0ZS55YW1sJyksIFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnLCAnY29uZmlnLmxvY2FsLnlhbWwnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbG9nNGpzLmpzJyksIHJvb3RQYXRoICsgJy9sb2c0anMuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgcm9vdFBhdGggKyAnL2FwcC5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJywgJ21vZHVsZS1yZXNvbHZlLnNlcnZlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5zZXJ2ZXIudHMnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuYnJvd3Nlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5icm93c2VyLnRzJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICBsb2dDb25maWcoY29uZmlnKCkpO1xuXG4gIGNvbnN0IHByb2plY3REaXJzID0gYXdhaXQgZ2V0U3RvcmUoKS5waXBlKFxuICAgIHBsdWNrKCdwcm9qZWN0MlBhY2thZ2VzJyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgbWFwKHByb2plY3QyUGFja2FnZXMgPT4gT2JqZWN0LmtleXMocHJvamVjdDJQYWNrYWdlcykubWFwKGRpciA9PiBQYXRoLnJlc29sdmUoZGlyKSkpLFxuICAgIHRha2UoMSlcbiAgKS50b1Byb21pc2UoKTtcblxuICBwcm9qZWN0RGlycy5mb3JFYWNoKHByamRpciA9PiB7XG4gICAgX3dyaXRlR2l0SG9vayhwcmpkaXIpO1xuICAgIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90c2xpbnQuanNvbicpLCBwcmpkaXIgKyAnL3RzbGludC5qc29uJyk7XG4gIH0pO1xuXG4gIGF3YWl0IF9zY2FuUGFja2FnZUFuZExpbmsoKTtcbiAgd2FyblVzZWxlc3NTeW1saW5rKCk7XG5cbiAgYXdhaXQgKGF3YWl0IGltcG9ydCgnLi4vY21kL2NvbmZpZy1zZXR1cCcpKS5hZGR1cENvbmZpZ3MoKGZpbGUsIGNvbmZpZ0NvbnRlbnQpID0+IHtcbiAgICB3cml0ZUZpbGUoUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAnZGlzdCcsIGZpbGUpLFxuICAgICAgJ1xcbiMgRE8gTk9UIE1PRElGSVkgVEhJUyBGSUxFIVxcbicgKyBjb25maWdDb250ZW50KTtcbiAgfSk7XG5cbiAgLy8gY3JlYXRlUHJvamVjdFN5bWxpbmsoKTtcbiAgd3JpdGVUc2NvbmZpZzRwcm9qZWN0KGdldFByb2plY3RMaXN0KCksIChmaWxlLCBjb250ZW50KSA9PiBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVHaXRJZ25vcmVzKHtmaWxlLCBjb250ZW50fSkpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyB3cy5kaXIpO1xuICBjb25zdCBzeW1saW5rc0luTW9kdWxlRGlyID0gW10gYXMge2NvbnRlbnQ6IHN0cmluZywgbGluazogc3RyaW5nfVtdO1xuXG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3cy5kaXIsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICBmcy5ta2RpcnBTeW5jKHRhcmdldCk7XG4gIH1cblxuICBpZiAod3MubGlua2VkRGVwZW5kZW5jaWVzLmxlbmd0aCArIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcy5sZW5ndGggPiAwKSB7XG4gICAgLy8gVGVtb3ByYXJpbHkgcmVtb3ZlIGFsbCBzeW1saW5rcyB1bmRlciBgbm9kZV9tb2R1bGVzL2AgYW5kIGBub2RlX21vZHVsZXMvQCovYFxuICAgIC8vIGJhY2t1cCB0aGVtIGZvciBsYXRlIHJlY292ZXJ5XG4gICAgYXdhaXQgc2Nhbk5vZGVNb2R1bGVzRm9yU3ltbGlua3Mod3MuZGlyLCBsaW5rID0+IHtcbiAgICAgIGNvbnN0IGxpbmtDb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgICAgc3ltbGlua3NJbk1vZHVsZURpci5wdXNoKHtjb250ZW50OiBsaW5rQ29udGVudCwgbGlua30pO1xuICAgICAgcmV0dXJuIHVubGlua0FzeW5jKGxpbmspO1xuICAgIH0pO1xuICAgIC8vIF9jbGVhbkFjdGlvbnMuYWRkV29ya3NwYWNlRmlsZShsaW5rcyk7XG5cbiAgICAvLyAzLiBSdW4gYG5wbSBpbnN0YWxsYFxuICAgIGNvbnN0IGluc3RhbGxKc29uRmlsZSA9IFBhdGgucmVzb2x2ZSh3cy5kaXIsICdwYWNrYWdlLmpzb24nKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnW2luaXRdIHdyaXRlJywgaW5zdGFsbEpzb25GaWxlKTtcblxuICAgIGZzLndyaXRlRmlsZShpbnN0YWxsSnNvbkZpbGUsIHdzLmluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBleGUoJ25wbScsICdpbnN0YWxsJywge2N3ZDogd3MuZGlyfSkucHJvbWlzZTtcbiAgICAgIGF3YWl0IGV4ZSgnbnBtJywgJ2RlZHVwZScsIHtjd2Q6IHdzLmRpcn0pLnByb21pc2U7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhlLCBlLnN0YWNrKTtcbiAgICB9XG4gICAgLy8gNC4gUmVjb3ZlciBwYWNrYWdlLmpzb24gYW5kIHN5bWxpbmtzIGRlbGV0ZWQgaW4gU3RlcC4xLlxuICAgIGZzLndyaXRlRmlsZShpbnN0YWxsSnNvbkZpbGUsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICAgIGF3YWl0IHJlY292ZXJTeW1saW5rcygpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICByZXR1cm4gX3N5bWxpbmtBc3luYyhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gX3NjYW5QYWNrYWdlQW5kTGluaygpIHtcbiAgY29uc3Qgcm0gPSAoYXdhaXQgaW1wb3J0KCcuLi9yZWNpcGUtbWFuYWdlcicpKTtcblxuICBjb25zdCBwcm9qUGtnTWFwOiB7W3Byb2o6IHN0cmluZ106IFBhY2thZ2VJbmZvW119ID0ge307XG4gIGF3YWl0IHJtLmxpbmtDb21wb25lbnRzQXN5bmMoKHByb2osIHBrZ0pzb25GaWxlKSA9PiB7XG4gICAgaWYgKHByb2pQa2dNYXBbcHJval0gPT0gbnVsbClcbiAgICAgIHByb2pQa2dNYXBbcHJval0gPSBbXTtcbiAgICBjb25zdCBpbmZvID0gY3JlYXRlUGFja2FnZUluZm8ocGtnSnNvbkZpbGUpO1xuICAgIHByb2pQa2dNYXBbcHJval0ucHVzaChpbmZvKTtcbiAgfSk7XG4gIGNvbnN0IHBrZ0xpc3Q6IFBhY2thZ2VJbmZvW10gPSBbXTtcbiAgZm9yIChjb25zdCBbcHJqLCBwa2dzXSBvZiBPYmplY3QuZW50cmllcyhwcm9qUGtnTWFwKSkge1xuICAgIGFjdGlvbkRpc3BhdGNoZXIuX2Fzc29jaWF0ZVBhY2thZ2VUb1Byaih7cHJqLCBwa2dzfSk7XG4gICAgcGtnTGlzdC5wdXNoKC4uLnBrZ3MpO1xuICB9XG4gIGFjdGlvbkRpc3BhdGNoZXIuX3N5bmNQYWNrYWdlc1N0YXRlKHBrZ0xpc3QpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlSW5mbyhwa0pzb25GaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhwa0pzb25GaWxlLCAndXRmOCcpKTtcbiAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIHNob3J0TmFtZTogbSFbMl0sXG4gICAgbmFtZToganNvbi5uYW1lLFxuICAgIHNjb3BlOiBtIVsxXSxcbiAgICBwYXRoOiBQYXRoLmRpcm5hbWUocGtKc29uRmlsZSksXG4gICAganNvbixcbiAgICByZWFsUGF0aDogZnMucmVhbHBhdGhTeW5jKFBhdGguZGlybmFtZShwa0pzb25GaWxlKSlcbiAgfTtcbiAgcmV0dXJuIHBrSW5mbztcbn1cblxuLy8gYXN5bmMgZnVuY3Rpb24gc2NhbkRpckZvck5vZGVNb2R1bGVzKHBhY2thZ2VEaXJzOiBzdHJpbmdbXSwgd29ya3NwYWNlRGlyOiBzdHJpbmcpIHtcbi8vICAgLy8gY29uc3Qgd29ya3NwYWNlTm0gPSBQYXRoLnJlc29sdmUod29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4vLyAgIGNvbnN0IG5tRGlycyA9IGF3YWl0IFByb21pc2UuYWxsKHBhY2thZ2VEaXJzLm1hcChhc3luYyBkaXIgPT4ge1xuLy8gICAgIGNvbnN0IG5tID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuLy8gICAgIHRyeSB7XG4vLyAgICAgICAvLyBhd2FpdCBzeW1saW5rQXN5bmMod29ya3NwYWNlTm0sIG5tKTtcbi8vICAgICB9IGNhdGNoIChlcnIpIHtcbi8vICAgICAgIGNvbnNvbGUuZXJyb3IoY2hhbGsucmVkKCdbc2NhbkRpckZvck5vZGVNb2R1bGVzXScpLCBlcnIpO1xuLy8gICAgIH1cbi8vICAgICByZXR1cm4gbm07XG4vLyAgIH0pKTtcbi8vICAgcmV0dXJuIG5tRGlycztcbi8vICAgLy8gY29uc29sZS5sb2cobm1EaXJzLmpvaW4oJ1xcbicpKTtcbi8vIH1cblxuZnVuY3Rpb24gY3AoZnJvbTogc3RyaW5nLCB0bzogc3RyaW5nKSB7XG4gIGlmIChfLnN0YXJ0c1dpdGgoZnJvbSwgJy0nKSkge1xuICAgIGZyb20gPSBhcmd1bWVudHNbMV07XG4gICAgdG8gPSBhcmd1bWVudHNbMl07XG4gIH1cbiAgZnMuY29weVN5bmMoZnJvbSwgdG8pO1xuICAvLyBzaGVsbC5jcCguLi5hcmd1bWVudHMpO1xuICBpZiAoL1svXFxcXF0kLy50ZXN0KHRvKSlcbiAgICB0byA9IFBhdGguYmFzZW5hbWUoZnJvbSk7IC8vIHRvIGlzIGEgZm9sZGVyXG4gIGVsc2VcbiAgICB0byA9IFBhdGgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgdG8pO1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ2NvcHkgdG8gJXMnLCBjaGFsay5jeWFuKHRvKSk7XG59XG5cbmZ1bmN0aW9uIG1heWJlQ29weVRlbXBsYXRlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMoUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgdG8pKSlcbiAgICBjcChQYXRoLnJlc29sdmUoX19kaXJuYW1lLCBmcm9tKSwgdG8pO1xufVxuXG5mdW5jdGlvbiBwYXRoT2ZSb290UGF0aChwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgcmVsUGF0aCA9IFBhdGgucmVsYXRpdmUoZ2V0Um9vdERpcigpLCBwYXRoKTtcbiAgcmV0dXJuIHJlbFBhdGguc3RhcnRzV2l0aCgnLi4nKSA/IFBhdGgucmVzb2x2ZShwYXRoKSA6IHJlbFBhdGg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXRoVG9Qcm9qS2V5KHBhdGg6IHN0cmluZykge1xuICByZXR1cm4gcGF0aE9mUm9vdFBhdGgocGF0aCk7XG59XG5cbmZ1bmN0aW9uIF93cml0ZUdpdEhvb2socHJvamVjdDogc3RyaW5nKSB7XG4gIC8vIGlmICghaXNXaW4zMikge1xuICBjb25zdCBnaXRQYXRoID0gUGF0aC5yZXNvbHZlKHByb2plY3QsICcuZ2l0L2hvb2tzJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKGdpdFBhdGgpKSB7XG4gICAgY29uc3QgaG9va1N0ciA9ICcjIS9iaW4vc2hcXG4nICtcbiAgICAgIGBjZCBcIiR7Z2V0Um9vdERpcigpfVwiXFxuYCArXG4gICAgICAvLyAnZHJjcCBpbml0XFxuJyArXG4gICAgICAvLyAnbnB4IHByZXR0eS1xdWljayAtLXN0YWdlZFxcbicgKyAvLyBVc2UgYHRzbGludCAtLWZpeGAgaW5zdGVhZC5cbiAgICAgIGBub2RlIG5vZGVfbW9kdWxlcy9kci1jb21wLXBhY2thZ2UvYmluL2RyY3AuanMgbGludCAtLXBqIFwiJHtwcm9qZWN0LnJlcGxhY2UoL1svXFxcXF0kLywgJycpfVwiIC0tZml4XFxuYDtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoICsgJy9wcmUtY29tbWl0JykpXG4gICAgICBmcy51bmxpbmsoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpO1xuICAgIGZzLndyaXRlRmlsZVN5bmMoZ2l0UGF0aCArICcvcHJlLXB1c2gnLCBob29rU3RyKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnV3JpdGUgJyArIGdpdFBhdGggKyAnL3ByZS1wdXNoJyk7XG4gICAgaWYgKCFpc1dpbjMyKSB7XG4gICAgICBzcGF3bignY2htb2QnLCAnLVInLCAnK3gnLCBwcm9qZWN0ICsgJy8uZ2l0L2hvb2tzL3ByZS1wdXNoJyk7XG4gICAgfVxuICB9XG4gIC8vIH1cbn1cbiJdfQ==