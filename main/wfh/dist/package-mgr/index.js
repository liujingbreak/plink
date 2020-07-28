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
exports.listPackagesByProjects = exports.getProjectList = exports.listPackages = exports.getStore = exports.getState = exports.actionDispatcher = exports.slice = void 0;
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
const cli_clean_1 = require("../cmd/cli-clean");
const util_1 = require("util");
const { green: col1, cyan } = require('chalk');
const NS = 'packages';
const state = {
    seq: 1,
    workspaces: {},
    project2Packages: {}
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
            for (const pk of payload.packageJsonFiles) {
                const json = JSON.parse(fs_extra_1.default.readFileSync(pk, 'utf8'));
                const m = moduleNameReg.exec(json.name);
                const pkInfo = {
                    shortName: m[1],
                    name: json.name,
                    scope: m[0],
                    path: path_1.default.dirname(pk),
                    json,
                    realPath: fs_extra_1.default.realpathSync(path_1.default.dirname(pk))
                };
                d.srcPackages[pkInfo.name] = pkInfo;
            }
        },
        _checkPackages() {
        },
        _updatePackageState(d, { payload }) {
            for (const json of payload) {
                d.srcPackages[json.name].json = json;
            }
        },
        addProject(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathOfRootPath(rawDir);
                if (!lodash_1.default.has(d.project2Packages, dir)) {
                    d.project2Packages[dir] = [];
                }
            }
        },
        deleteProject(d, action) {
            for (const rawDir of action.payload) {
                const dir = pathOfRootPath(rawDir);
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
        }
    }
});
exports.actionDispatcher = store_1.stateFactory.bindActionCreators(exports.slice);
// export type ActionsType = typeof actions extends Promise<infer T> ? T : unknown;
const moduleNameReg = /^(?:@([^/]+)\/)?(\S+)/;
const readFileAsync = util_1.promisify(fs_extra_1.default.readFile);
/**
 * Carefully access any property on config, since config setting probably hasn't been set yet at this momment
 */
store_1.stateFactory.addEpic((action$, state$) => {
    // Handle newly added workspace
    getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), operators_1.map(ws => Object.keys(ws)), operators_1.scan((prev, curr) => {
        if (prev.length < curr.length) {
            const newAdded = lodash_1.default.difference(curr, prev);
            // tslint:disable-next-line: no-console
            console.log('New workspace: ', newAdded);
            for (const dir of newAdded)
                store_1.stateFactory.dispatch(exports.slice.actions._installWorkspace({ dir }));
        }
        return curr;
    })).subscribe();
    return rxjs_1.merge(getStore().pipe(operators_1.map(s => s.project2Packages), operators_1.distinctUntilChanged(), operators_1.map(pks => {
        recipe_manager_1.setProjectList(getProjectList());
    }), operators_1.ignoreElements()), 
    //  initWorkspace
    action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions.initWorkspace), operators_1.switchMap(({ payload: { dir, opt } }) => {
        dir = path_1.default.resolve(dir);
        let scanLinkPackageDirDone = false;
        const doHoistLater = getStore().pipe(operators_1.map(s => s.srcPackages), operators_1.distinctUntilChanged(), operators_1.concatMap((packages) => {
            if (!scanLinkPackageDirDone && packages != null) {
                scanLinkPackageDirDone = true;
                return rxjs_1.from(scanDirForNodeModules(Object.values(packages).map(pk => pk.realPath), dir))
                    .pipe(operators_1.map(() => packages));
            }
            return rxjs_1.of(packages);
        }), operators_1.skip(1), operators_1.take(1), operators_1.map(() => exports.slice.actions._hoistWorkspaceDeps({ dir })));
        if (lodash_1.default.size(getState().srcPackages) === 0) {
            return rxjs_1.merge(doHoistLater, rxjs_1.of(exports.slice.actions.initRootDir()));
        }
        else if (opt.force && getState().workspaces[dir]) {
            log_config_1.default(config_1.default());
            return rxjs_1.merge(doHoistLater, rxjs_1.of(exports.slice.actions._change(d => {
                d.workspaces[dir].installJsonStr = ''; // clean so that it will be changed after _hoistWorkspaceDeps
            }), exports.slice.actions._checkPackages()));
        }
        else {
            log_config_1.default(config_1.default());
            return rxjs_1.merge(doHoistLater, rxjs_1.of(exports.slice.actions._checkPackages()));
        }
    })), action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions._checkPackages), operators_1.mergeMap(() => {
        return rxjs_1.forkJoin(Object.entries(getState().srcPackages || [])
            .map(([name, pkInfo]) => {
            return rxjs_1.from(readFileAsync(path_1.default.resolve(pkInfo.realPath, 'package.json'), 'utf8'));
        }));
    }), operators_1.map(jsonStrs => {
        exports.actionDispatcher._updatePackageState(jsonStrs.map(str => JSON.parse(str)));
    }), operators_1.ignoreElements()), 
    // initRootDir
    action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions.initRootDir), operators_1.switchMap(() => {
        return rxjs_1.from(initRootDirectory());
    })), 
    // In case any workspace's installJsonStr is changed, do _installWorkspace
    getStore().pipe(operators_1.map(s => s.workspaces), operators_1.distinctUntilChanged(), 
    // distinctUntilChanged((s1, s2) => {
    //   const keys1 = Object.keys(s1);
    //   const keys2 = Object.keys(s2);
    //   return keys1.length === keys2.length && keys1.every(key => s2[key] != null);
    // }),
    operators_1.map(workspaces => Object.keys(workspaces)), operators_1.filter(dirs => dirs.length > 0), operators_1.take(1), operators_1.switchMap(dirs => rxjs_1.concat(...dirs.map(dir => getStore()
        .pipe(operators_1.map(s => s.workspaces[dir]), operators_1.distinctUntilChanged((s1, s2) => s1.installJsonStr === s2.installJsonStr), operators_1.skip(1), // skip initial value, only react for changing value event
    operators_1.filter(s => s.installJsonStr.length > 0), operators_1.map(ws => exports.slice.actions._installWorkspace({ dir: ws.dir }))))))), 
    // action$.pipe(ofPayloadAction(slice.actions._syncPackagesState),
    //   switchMap(() => {
    //     const srcPackages = getState()!.srcPackages;
    //     if (srcPackages != null) {
    //       return from(Object.keys(getState()!.workspaces));
    //     }
    //     return from([]);
    //   }),
    //   map(workspace => slice.actions._hoistWorkspaceDeps({dir: workspace}))
    // ),
    action$.pipe(redux_store_1.ofPayloadAction(exports.slice.actions._installWorkspace), operators_1.mergeMap(action => getStore().pipe(operators_1.map(s => s.workspaces[action.payload.dir]), operators_1.distinctUntilChanged(), operators_1.filter(ws => ws != null))), operators_1.concatMap(ws => rxjs_1.from(installWorkspace(ws))), operators_1.ignoreElements())
    // getStore().pipe(
    // map(s => s.project2Packages), distinctUntilChanged(),
    // take(2), takeLast(1),
    // map(() => slice.actions.initWorkspace({dir: ''}))
    );
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
            const deps = Object.keys(require(path_1.default.resolve(recipeDir, 'package.json')).dependencies);
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
const cwd = process.cwd();
function initRootDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootPath = cwd;
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
        const action = yield _initDependency();
        yield (yield Promise.resolve().then(() => __importStar(require('../cmd/config-setup')))).addupConfigs((file, configContent) => {
            utils_1.writeFile(path_1.default.resolve(rootPath || process.cwd(), 'dist', file), '\n# DO NOT MODIFIY THIS FILE!\n' + configContent);
        });
        // createProjectSymlink();
        editor_helper_1.writeTsconfig4Editor(getProjectList());
        return action;
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
        // 1. create symlink `node_modules` under every linked component package's realPath
        const links = yield Promise.all([...ws.linkedDependencies, ...ws.linkedDevDependencies]
            .map(([dep]) => __awaiter(this, void 0, void 0, function* () {
            const dir = getState().srcPackages[dep].realPath;
            const link = path_1.default.resolve(dir, 'node_modules');
            yield symlinks_1.symlinkAsync(target, link);
            return link;
            // return link;
        })));
        if (links.length > 0) {
            // 2. Temoprarily remove all symlinks under `node_modules/` and `node_modules/@*/`
            // backup them for late recovery
            yield symlinks_1.scanNodeModulesForSymlinks(ws.dir, link => {
                const linkContent = fs_extra_1.default.readlinkSync(link);
                symlinksInModuleDir.push({ content: linkContent, link });
                return symlinks_1.unlinkAsync(link);
            });
            cli_clean_1.actions.addWorkspaceFile(links);
            // 3. Run `npm install`
            const installJsonFile = path_1.default.resolve(ws.dir, 'package.json');
            // tslint:disable-next-line: no-console
            console.log('[init] write', installJsonFile);
            fs_extra_1.default.writeFile(installJsonFile, ws.installJsonStr, 'utf8');
            try {
                yield process_utils_2.exe('npm', 'install', { cwd: ws.dir }).promise;
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
function _initDependency() {
    return __awaiter(this, void 0, void 0, function* () {
        const rm = (yield Promise.resolve().then(() => __importStar(require('../recipe-manager'))));
        // const listCompDependency = await (await import('../dependency-installer')).listCompDependency;
        const projectDirs = yield getStore().pipe(operators_1.pluck('project2Packages'), operators_1.distinctUntilChanged(), operators_1.map(project2Packages => Object.keys(project2Packages).map(dir => path_1.default.resolve(dir))), operators_1.take(1)).toPromise();
        projectDirs.forEach(prjdir => {
            _writeGitHook(prjdir);
            maybeCopyTemplate(path_1.default.resolve(__dirname, '../../tslint.json'), prjdir + '/tslint.json');
        });
        let pkJsonFiles = yield rm.linkComponentsAsync();
        // pkJsonFiles.push(...projectDirs.filter(dir => dir !== cwd)
        //     .map(dir => Path.join(dir, 'package.json'))
        //     .filter(file => fs.existsSync(file)));
        pkJsonFiles = lodash_1.default.uniq(pkJsonFiles);
        return exports.slice.actions._syncPackagesState({ packageJsonFiles: pkJsonFiles });
        // const needRunInstall = listCompDependency(pkJsonFiles, true);
        // return needRunInstall;
    });
}
function scanDirForNodeModules(packageDirs, workspaceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        // const workspaceNm = Path.resolve(workspaceDir, 'node_modules');
        const nmDirs = yield Promise.all(packageDirs.map((dir) => __awaiter(this, void 0, void 0, function* () {
            const nm = path_1.default.resolve(dir, 'node_modules');
            try {
                // await symlinkAsync(workspaceNm, nm);
            }
            catch (err) {
                console.error(chalk_1.default.red('[scanDirForNodeModules]'), err);
            }
            return nm;
        })));
        return nmDirs;
        // console.log(nmDirs.join('\n'));
    });
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
        to = path_1.default.relative(cwd, to);
    // tslint:disable-next-line: no-console
    console.log('copy to %s', chalk_1.default.cyan(to));
}
function maybeCopyTemplate(from, to) {
    if (!fs_extra_1.default.existsSync(path_1.default.resolve(cwd, to)))
        cp(path_1.default.resolve(__dirname, from), to);
}
function pathOfRootPath(path) {
    const relPath = path_1.default.relative(utils_2.getRootDir(), path);
    return relPath.startsWith('..') ? path_1.default.resolve(path) : relPath;
}
function _writeGitHook(project) {
    // if (!isWin32) {
    const gitPath = path_1.default.resolve(project, '.git/hooks');
    if (fs_extra_1.default.existsSync(gitPath)) {
        const hookStr = '#!/bin/sh\n' +
            `cd "${cwd}"\n` +
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9wYWNrYWdlLW1nci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLCtCQUF3RDtBQUN4RCw4Q0FDNkU7QUFDN0Usd0NBQXlDO0FBQ3pDLHVEQUErQjtBQUMvQixrRUFBZ0Y7QUFDaEYsb0RBQXdEO0FBQ3hELCtEQUFzQztBQUN0QyxvREFBbUQ7QUFDbkQsb0RBQXlDO0FBQ3pDLHlEQUF5RDtBQUN6RCxvREFBdUM7QUFDdkMsc0RBQXlGO0FBQ3pGLG9DQUF3QztBQUN4QyxvQ0FBcUQ7QUFDckQsc0RBQXVEO0FBQ3ZELDhEQUNzRTtBQUV0RSxnREFBNEQ7QUFDNUQsK0JBQStCO0FBRS9CLE1BQU0sRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBQyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQW1CN0MsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDO0FBR3RCLE1BQU0sS0FBSyxHQUFrQjtJQUMzQixHQUFHLEVBQUUsQ0FBQztJQUNOLFVBQVUsRUFBRSxFQUFFO0lBQ2QsZ0JBQWdCLEVBQUUsRUFBRTtDQUNyQixDQUFDO0FBb0JXLFFBQUEsS0FBSyxHQUFHLG9CQUFZLENBQUMsUUFBUSxDQUFDO0lBQ3pDLElBQUksRUFBRSxFQUFFO0lBQ1IsWUFBWSxFQUFFLEtBQUs7SUFDbkIsUUFBUSxFQUFFO1FBQ1IsV0FBVyxDQUFDLENBQUMsRUFBRSxNQUE4RDtRQUM3RSxDQUFDO1FBQ0QsYUFBYSxDQUFDLENBQUMsRUFBRSxNQUFnRTtRQUNqRixDQUFDO1FBQ0Qsa0JBQWtCLENBQUMsQ0FBQyxFQUFFLEVBQUMsT0FBTyxFQUE4QztZQUMxRSxDQUFDLENBQUMsV0FBVyxHQUFHLEVBQUUsQ0FBQztZ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O1lBQ3hDLGtCQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxhQUFhLENBQUMsQ0FBQztRQUNyQyxrQkFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEdBQUcsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2pELHVDQUF1QztRQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxPQUFPLEdBQUcsV0FBVyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLGtCQUFPLEVBQUU7WUFDWixxQkFBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQyxDQUFDO1NBQzlEO0tBQ0Y7SUFDRCxJQUFJO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFBheWxvYWRBY3Rpb24gfSBmcm9tICdAcmVkdXhqcy90b29sa2l0JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZnJvbSwgbWVyZ2UsIGNvbmNhdCwgb2YsIGZvcmtKb2lufSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGRpc3RpbmN0VW50aWxDaGFuZ2VkLCBmaWx0ZXIsIG1hcCwgc3dpdGNoTWFwLCBtZXJnZU1hcCxcbiAgcGx1Y2ssIHRha2UsIGNvbmNhdE1hcCwgc2tpcCwgaWdub3JlRWxlbWVudHMsIHNjYW4gfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyB3cml0ZUZpbGUgfSBmcm9tICcuLi9jbWQvdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuaW1wb3J0IHsgbGlzdENvbXBEZXBlbmRlbmN5LCBQYWNrYWdlSnNvbkludGVyZiB9IGZyb20gJy4uL2RlcGVuZGVuY3ktaW5zdGFsbGVyJztcbmltcG9ydCB7IHdyaXRlVHNjb25maWc0RWRpdG9yIH0gZnJvbSAnLi4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgbG9nQ29uZmlnIGZyb20gJy4uL2xvZy1jb25maWcnO1xuaW1wb3J0IHsgZmluZEFsbFBhY2thZ2VzIH0gZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJy4uL3Byb2Nlc3MtdXRpbHMnO1xuLy8gaW1wb3J0IHsgY3JlYXRlUHJvamVjdFN5bWxpbmsgfSBmcm9tICcuLi9wcm9qZWN0LWRpcic7XG5pbXBvcnQgeyBleGUgfSBmcm9tICcuLi9wcm9jZXNzLXV0aWxzJztcbmltcG9ydCB7IGVhY2hSZWNpcGVTcmMsIHNldFByb2plY3RMaXN0IGFzIHNldFByb2plY3RGb3JSZWNpcGUgfSBmcm9tICcuLi9yZWNpcGUtbWFuYWdlcic7XG5pbXBvcnQgeyBzdGF0ZUZhY3RvcnkgfSBmcm9tICcuLi9zdG9yZSc7XG5pbXBvcnQgeyBnZXRSb290RGlyLCBpc0RyY3BTeW1saW5rIH0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHsgb2ZQYXlsb2FkQWN0aW9uIH0gZnJvbSAnLi4vdXRpbHMvcmVkdXgtc3RvcmUnO1xuaW1wb3J0IGNsZWFuSW52YWxpZFN5bWxpbmtzLCB7IGlzV2luMzIsIHNjYW5Ob2RlTW9kdWxlc0ZvclN5bWxpbmtzLFxuICBzeW1saW5rQXN5bmMsIHVubGlua0FzeW5jLCBfc3ltbGlua0FzeW5jIH0gZnJvbSAnLi4vdXRpbHMvc3ltbGlua3MnO1xuaW1wb3J0ICogYXMgY21kT3B0IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgeyBhY3Rpb25zIGFzIF9jbGVhbkFjdGlvbnMgfSBmcm9tICcuLi9jbWQvY2xpLWNsZWFuJztcbmltcG9ydCB7cHJvbWlzaWZ5fSBmcm9tICd1dGlsJztcblxuY29uc3Qge2dyZWVuOiBjb2wxLCBjeWFufSA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbi8vIGNvbnN0IGlzRHJjcFN5bWxpbmsgPSBmcy5sc3RhdFN5bmMoUGF0aC5yZXNvbHZlKCdub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlJykpLmlzU3ltYm9saWNMaW5rKCk7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgbmFtZTogc3RyaW5nO1xuICBzY29wZTogc3RyaW5nO1xuICBzaG9ydE5hbWU6IHN0cmluZztcbiAganNvbjogYW55O1xuICBwYXRoOiBzdHJpbmc7XG4gIHJlYWxQYXRoOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZXNTdGF0ZSB7XG4gIHNlcTogbnVtYmVyO1xuICBzcmNQYWNrYWdlcz86IHtbbmFtZTogc3RyaW5nXTogUGFja2FnZUluZm99O1xuICB3b3Jrc3BhY2VzOiB7W2Rpcjogc3RyaW5nXTogV29ya3NwYWNlU3RhdGV9O1xuICBwcm9qZWN0MlBhY2thZ2VzOiB7W3Byajogc3RyaW5nXTogc3RyaW5nW119O1xufVxuXG5jb25zdCBOUyA9ICdwYWNrYWdlcyc7XG5cblxuY29uc3Qgc3RhdGU6IFBhY2thZ2VzU3RhdGUgPSB7XG4gIHNlcTogMSxcbiAgd29ya3NwYWNlczoge30sXG4gIHByb2plY3QyUGFja2FnZXM6IHt9XG59O1xuXG5pbnRlcmZhY2UgV29ya3NwYWNlU3RhdGUge1xuICBkaXI6IHN0cmluZztcbiAgb3JpZ2luSW5zdGFsbEpzb246IFBhY2thZ2VKc29uSW50ZXJmO1xuICBvcmlnaW5JbnN0YWxsSnNvblN0cjogc3RyaW5nO1xuICBpbnN0YWxsSnNvbjogUGFja2FnZUpzb25JbnRlcmY7XG4gIGluc3RhbGxKc29uU3RyOiBzdHJpbmc7XG4gIC8qKiBuYW1lcyBvZiB0aG9zZSBzeW1saW5rIHBhY2thZ2VzICovXG4gIGxpbmtlZERlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyAvKiogbmFtZXMgb2YgdGhvc2Ugc3ltbGluayBwYWNrYWdlcyAqL1xuICBsaW5rZWREZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgLy8gLyoqIG90aGVyIDNyZCBwYXJ0eSBkZXBlbmRlbmNpZXMgaW4gdHVwbGUgb2YgbmFtZSBhbmQgdmVyc2lvbiBwYWlyICovXG4gIC8vIGRlcGVuZGVuY2llczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAvLyBkZXZEZXBlbmRlbmNpZXM6IFtzdHJpbmcsIHN0cmluZ11bXTtcblxuICAvLyBob2lzdGVkRGVwczoge1tkZXA6IHN0cmluZ106IHN0cmluZ307XG4gIC8vIGhvaXN0ZWREZXZEZXBzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfTtcbn1cblxuZXhwb3J0IGNvbnN0IHNsaWNlID0gc3RhdGVGYWN0b3J5Lm5ld1NsaWNlKHtcbiAgbmFtZTogTlMsXG4gIGluaXRpYWxTdGF0ZTogc3RhdGUsXG4gIHJlZHVjZXJzOiB7XG4gICAgaW5pdFJvb3REaXIoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtob2lzdGVkRGlyOiBzdHJpbmd9IHwgdW5kZWZpbmVkIHwgbnVsbD4pIHtcbiAgICB9LFxuICAgIGluaXRXb3Jrc3BhY2UoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHtkaXI6IHN0cmluZywgb3B0OiBjbWRPcHQuSW5pdENtZE9wdGlvbnN9Pikge1xuICAgIH0sXG4gICAgX3N5bmNQYWNrYWdlc1N0YXRlKGQsIHtwYXlsb2FkfTogUGF5bG9hZEFjdGlvbjx7cGFja2FnZUpzb25GaWxlczogc3RyaW5nW119Pikge1xuICAgICAgZC5zcmNQYWNrYWdlcyA9IHt9O1xuICAgICAgZm9yIChjb25zdCBwayBvZiBwYXlsb2FkLnBhY2thZ2VKc29uRmlsZXMpIHtcbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHBrLCAndXRmOCcpKTtcbiAgICAgICAgY29uc3QgbSA9IG1vZHVsZU5hbWVSZWcuZXhlYyhqc29uLm5hbWUpO1xuICAgICAgICBjb25zdCBwa0luZm86IFBhY2thZ2VJbmZvID0ge1xuICAgICAgICAgIHNob3J0TmFtZTogbSFbMV0sXG4gICAgICAgICAgbmFtZToganNvbi5uYW1lLFxuICAgICAgICAgIHNjb3BlOiBtIVswXSxcbiAgICAgICAgICBwYXRoOiBQYXRoLmRpcm5hbWUocGspLFxuICAgICAgICAgIGpzb24sXG4gICAgICAgICAgcmVhbFBhdGg6IGZzLnJlYWxwYXRoU3luYyhQYXRoLmRpcm5hbWUocGspKVxuICAgICAgICB9O1xuICAgICAgICBkLnNyY1BhY2thZ2VzW3BrSW5mby5uYW1lXSA9IHBrSW5mbztcbiAgICAgIH1cbiAgICB9LFxuICAgIF9jaGVja1BhY2thZ2VzKCkge1xuICAgIH0sXG4gICAgX3VwZGF0ZVBhY2thZ2VTdGF0ZShkLCB7cGF5bG9hZH06IFBheWxvYWRBY3Rpb248YW55W10+KSB7XG4gICAgICBmb3IgKGNvbnN0IGpzb24gb2YgcGF5bG9hZCkge1xuICAgICAgICBkLnNyY1BhY2thZ2VzIVtqc29uLm5hbWVdLmpzb24gPSBqc29uO1xuICAgICAgfVxuICAgIH0sXG4gICAgYWRkUHJvamVjdChkLCBhY3Rpb246IFBheWxvYWRBY3Rpb248c3RyaW5nW10+KSB7XG4gICAgICBmb3IgKGNvbnN0IHJhd0RpciBvZiBhY3Rpb24ucGF5bG9hZCkge1xuICAgICAgICBjb25zdCBkaXIgPSBwYXRoT2ZSb290UGF0aChyYXdEaXIpO1xuICAgICAgICBpZiAoIV8uaGFzKGQucHJvamVjdDJQYWNrYWdlcywgZGlyKSkge1xuICAgICAgICAgIGQucHJvamVjdDJQYWNrYWdlc1tkaXJdID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIGRlbGV0ZVByb2plY3QoZCwgYWN0aW9uOiBQYXlsb2FkQWN0aW9uPHN0cmluZ1tdPikge1xuICAgICAgZm9yIChjb25zdCByYXdEaXIgb2YgYWN0aW9uLnBheWxvYWQpIHtcbiAgICAgICAgY29uc3QgZGlyID0gcGF0aE9mUm9vdFBhdGgocmF3RGlyKTtcbiAgICAgICAgZGVsZXRlIGQucHJvamVjdDJQYWNrYWdlc1tkaXJdO1xuICAgICAgfVxuICAgIH0sXG4gICAgX2hvaXN0V29ya3NwYWNlRGVwcyhzdGF0ZSwge3BheWxvYWQ6IHtkaXJ9fTogUGF5bG9hZEFjdGlvbjx7ZGlyOiBzdHJpbmd9Pikge1xuICAgICAgaWYgKHN0YXRlLnNyY1BhY2thZ2VzID09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdcInNyY1BhY2thZ2VzXCIgaXMgbnVsbCwgbmVlZCB0byBydW4gYGluaXRgIGNvbW1hbmQgZmlyc3QnKTtcbiAgICAgIH1cbiAgICAgIGRpciA9IFBhdGgucmVzb2x2ZShkaXIpO1xuXG4gICAgICBjb25zdCBwa2pzb25TdHIgPSBmcy5yZWFkRmlsZVN5bmMoUGF0aC5yZXNvbHZlKGRpciwgJ3BhY2thZ2UuanNvbicpLCAndXRmOCcpO1xuICAgICAgY29uc3QgcGtqc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IEpTT04ucGFyc2UocGtqc29uU3RyKTtcbiAgICAgIC8vIGZvciAoY29uc3QgZGVwcyBvZiBbcGtqc29uLmRlcGVuZGVuY2llcywgcGtqc29uLmRldkRlcGVuZGVuY2llc10gYXMge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9W10gKSB7XG4gICAgICAvLyAgIE9iamVjdC5lbnRyaWVzKGRlcHMpO1xuICAgICAgLy8gfVxuXG4gICAgICBjb25zdCBkZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGVwZW5kZW5jaWVzIHx8IHt9KTtcblxuICAgICAgY29uc3QgdXBkYXRpbmdEZXBzID0gey4uLnBranNvbi5kZXBlbmRlbmNpZXMgfHwge319O1xuICAgICAgY29uc3QgbGlua2VkRGVwZW5kZW5jaWVzOiB0eXBlb2YgZGVwcyA9IFtdO1xuICAgICAgZGVwcy5maWx0ZXIoZGVwID0+IHtcbiAgICAgICAgaWYgKF8uaGFzKHN0YXRlLnNyY1BhY2thZ2VzLCBkZXBbMF0pKSB7XG4gICAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzW2RlcFswXV07XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgICBjb25zdCBkZXZEZXBzID0gT2JqZWN0LmVudHJpZXM8c3RyaW5nPihwa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9KTtcbiAgICAgIGNvbnN0IHVwZGF0aW5nRGV2RGVwcyA9IHsuLi5wa2pzb24uZGV2RGVwZW5kZW5jaWVzIHx8IHt9fTtcbiAgICAgIGNvbnN0IGxpbmtlZERldkRlcGVuZGVuY2llczogdHlwZW9mIGRldkRlcHMgPSBbXTtcbiAgICAgIGRldkRlcHMuZmlsdGVyKGRlcCA9PiB7XG4gICAgICAgIGlmIChfLmhhcyhzdGF0ZS5zcmNQYWNrYWdlcywgZGVwWzBdKSkge1xuICAgICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1tkZXBbMF1dO1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXNEcmNwU3ltbGluaykge1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ1tfaG9pc3RXb3Jrc3BhY2VEZXBzXSBkci1jb21wLXBhY2thZ2UgaXMgc3ltbGluaycpO1xuICAgICAgICBkZWxldGUgdXBkYXRpbmdEZXBzWydkci1jb21wLXBhY2thZ2UnXTtcbiAgICAgICAgZGVsZXRlIHVwZGF0aW5nRGV2RGVwc1snZHItY29tcC1wYWNrYWdlJ107XG4gICAgICB9XG5cbiAgICAgIC8vIHBranNvbkxpc3QucHVzaCh1cGRhdGluZ0pzb24pO1xuXG4gICAgICBjb25zdCBob2lzdGVkRGVwcyA9IGxpc3RDb21wRGVwZW5kZW5jeShcbiAgICAgICAgbGlua2VkRGVwZW5kZW5jaWVzLm1hcChlbnRyeSA9PiBzdGF0ZS5zcmNQYWNrYWdlcyFbZW50cnlbMF1dLmpzb24pLFxuICAgICAgICBkaXIsIHVwZGF0aW5nRGVwc1xuICAgICAgKTtcblxuICAgICAgY29uc3QgaG9pc3RlZERldkRlcHMgPSBsaXN0Q29tcERlcGVuZGVuY3koXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llcy5tYXAoZW50cnkgPT4gc3RhdGUuc3JjUGFja2FnZXMhW2VudHJ5WzBdXS5qc29uKSxcbiAgICAgICAgZGlyLCB1cGRhdGluZ0RldkRlcHNcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IGluc3RhbGxKc29uOiBQYWNrYWdlSnNvbkludGVyZiA9IHtcbiAgICAgICAgLi4ucGtqc29uLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IHsuLi5ob2lzdGVkRGVwc30sXG4gICAgICAgIGRldkRlcGVuZGVuY2llczogey4uLmhvaXN0ZWREZXZEZXBzfVxuICAgICAgfTtcblxuICAgICAgY29uc3Qgd3A6IFdvcmtzcGFjZVN0YXRlID0ge1xuICAgICAgICBkaXIsXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uOiBwa2pzb24sXG4gICAgICAgIG9yaWdpbkluc3RhbGxKc29uU3RyOiBwa2pzb25TdHIsXG4gICAgICAgIGluc3RhbGxKc29uLFxuICAgICAgICBpbnN0YWxsSnNvblN0cjogSlNPTi5zdHJpbmdpZnkoaW5zdGFsbEpzb24sIG51bGwsICcgICcpLFxuICAgICAgICBsaW5rZWREZXBlbmRlbmNpZXMsXG4gICAgICAgIGxpbmtlZERldkRlcGVuZGVuY2llc1xuICAgICAgICAvLyBkZXBlbmRlbmNpZXMsXG4gICAgICAgIC8vIGRldkRlcGVuZGVuY2llcyxcbiAgICAgICAgLy8gaG9pc3RlZERlcHMsXG4gICAgICAgIC8vIGhvaXN0ZWREZXZEZXBzXG4gICAgICB9O1xuICAgICAgc3RhdGUud29ya3NwYWNlc1tkaXJdID0gd3A7XG4gICAgICAvLyBjb25zb2xlLmxvZygnLS0tLS0tLS0tLS0tLS0tLS0nLCBkaXIpO1xuICAgIH0sXG4gICAgX2luc3RhbGxXb3Jrc3BhY2Uoc3RhdGUsIHtwYXlsb2FkOiB7ZGlyfX06IFBheWxvYWRBY3Rpb248e2Rpcjogc3RyaW5nfT4pIHtcbiAgICB9XG4gIH1cbn0pO1xuXG5leHBvcnQgY29uc3QgYWN0aW9uRGlzcGF0Y2hlciA9IHN0YXRlRmFjdG9yeS5iaW5kQWN0aW9uQ3JlYXRvcnMoc2xpY2UpO1xuXG4vLyBleHBvcnQgdHlwZSBBY3Rpb25zVHlwZSA9IHR5cGVvZiBhY3Rpb25zIGV4dGVuZHMgUHJvbWlzZTxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5jb25zdCBtb2R1bGVOYW1lUmVnID0gL14oPzpAKFteL10rKVxcLyk/KFxcUyspLztcbmNvbnN0IHJlYWRGaWxlQXN5bmMgPSBwcm9taXNpZnk8c3RyaW5nLCBzdHJpbmcsIHN0cmluZz4oZnMucmVhZEZpbGUpO1xuLyoqXG4gKiBDYXJlZnVsbHkgYWNjZXNzIGFueSBwcm9wZXJ0eSBvbiBjb25maWcsIHNpbmNlIGNvbmZpZyBzZXR0aW5nIHByb2JhYmx5IGhhc24ndCBiZWVuIHNldCB5ZXQgYXQgdGhpcyBtb21tZW50XG4gKi9cbnN0YXRlRmFjdG9yeS5hZGRFcGljKChhY3Rpb24kLCBzdGF0ZSQpID0+IHtcblxuICAvLyBIYW5kbGUgbmV3bHkgYWRkZWQgd29ya3NwYWNlXG4gIGdldFN0b3JlKCkucGlwZShcbiAgICBtYXAocyA9PiBzLndvcmtzcGFjZXMpLCBkaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG1hcCh3cyA9PiBPYmplY3Qua2V5cyh3cykpLFxuICAgIHNjYW4oKHByZXYsIGN1cnIpID0+IHtcbiAgICAgIGlmIChwcmV2Lmxlbmd0aCA8IGN1cnIubGVuZ3RoKSB7XG4gICAgICAgIGNvbnN0IG5ld0FkZGVkID0gXy5kaWZmZXJlbmNlKGN1cnIsIHByZXYpO1xuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgICAgY29uc29sZS5sb2coJ05ldyB3b3Jrc3BhY2U6ICcsIG5ld0FkZGVkKTtcbiAgICAgICAgZm9yIChjb25zdCBkaXIgb2YgbmV3QWRkZWQpXG4gICAgICAgICAgc3RhdGVGYWN0b3J5LmRpc3BhdGNoKHNsaWNlLmFjdGlvbnMuX2luc3RhbGxXb3Jrc3BhY2Uoe2Rpcn0pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjdXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgcmV0dXJuIG1lcmdlKFxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICBtYXAocGtzID0+IHtcbiAgICAgICAgc2V0UHJvamVjdEZvclJlY2lwZShnZXRQcm9qZWN0TGlzdCgpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG4gICAgLy8gIGluaXRXb3Jrc3BhY2VcbiAgICBhY3Rpb24kLnBpcGUob2ZQYXlsb2FkQWN0aW9uKHNsaWNlLmFjdGlvbnMuaW5pdFdvcmtzcGFjZSksXG4gICAgICBzd2l0Y2hNYXAoKHtwYXlsb2FkOiB7ZGlyLCBvcHR9fSkgPT4ge1xuICAgICAgICBkaXIgPSBQYXRoLnJlc29sdmUoZGlyKTtcblxuICAgICAgICBsZXQgc2NhbkxpbmtQYWNrYWdlRGlyRG9uZSA9IGZhbHNlO1xuICAgICAgICBjb25zdCBkb0hvaXN0TGF0ZXIgPSBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgbWFwKHMgPT4gcy5zcmNQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgY29uY2F0TWFwKChwYWNrYWdlcykgPT4ge1xuICAgICAgICAgICAgaWYgKCFzY2FuTGlua1BhY2thZ2VEaXJEb25lICYmIHBhY2thZ2VzICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgc2NhbkxpbmtQYWNrYWdlRGlyRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgIHJldHVybiBmcm9tKHNjYW5EaXJGb3JOb2RlTW9kdWxlcyhPYmplY3QudmFsdWVzKHBhY2thZ2VzKS5tYXAocGsgPT4gcGsucmVhbFBhdGgpLCBkaXIpKVxuICAgICAgICAgICAgICAucGlwZShtYXAoKCkgPT4gcGFja2FnZXMpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvZihwYWNrYWdlcyk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgc2tpcCgxKSwgdGFrZSgxKSxcbiAgICAgICAgICBtYXAoKCkgPT4gc2xpY2UuYWN0aW9ucy5faG9pc3RXb3Jrc3BhY2VEZXBzKHtkaXJ9KSlcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKF8uc2l6ZShnZXRTdGF0ZSgpIS5zcmNQYWNrYWdlcykgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gbWVyZ2UoZG9Ib2lzdExhdGVyLCBvZihzbGljZS5hY3Rpb25zLmluaXRSb290RGlyKCkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChvcHQuZm9yY2UgJiYgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzW2Rpcl0pIHtcbiAgICAgICAgICBsb2dDb25maWcoY29uZmlnKCkpO1xuICAgICAgICAgIHJldHVybiBtZXJnZShkb0hvaXN0TGF0ZXIsIG9mKFxuICAgICAgICAgICAgc2xpY2UuYWN0aW9ucy5fY2hhbmdlKGQgPT4ge1xuICAgICAgICAgICAgICBkLndvcmtzcGFjZXNbZGlyXS5pbnN0YWxsSnNvblN0ciA9ICcnOyAvLyBjbGVhbiBzbyB0aGF0IGl0IHdpbGwgYmUgY2hhbmdlZCBhZnRlciBfaG9pc3RXb3Jrc3BhY2VEZXBzXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHNsaWNlLmFjdGlvbnMuX2NoZWNrUGFja2FnZXMoKVxuICAgICAgICAgICkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGxvZ0NvbmZpZyhjb25maWcoKSk7XG4gICAgICAgICAgcmV0dXJuIG1lcmdlKGRvSG9pc3RMYXRlciwgb2Yoc2xpY2UuYWN0aW9ucy5fY2hlY2tQYWNrYWdlcygpKSk7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKSxcblxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fY2hlY2tQYWNrYWdlcyksXG4gICAgICBtZXJnZU1hcCgoKSA9PiB7XG4gICAgICAgIHJldHVybiBmb3JrSm9pbihPYmplY3QuZW50cmllcyhnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzIHx8IFtdKVxuICAgICAgICAgIC5tYXAoKFtuYW1lLCBwa0luZm9dKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gZnJvbShyZWFkRmlsZUFzeW5jKFBhdGgucmVzb2x2ZShwa0luZm8ucmVhbFBhdGgsICdwYWNrYWdlLmpzb24nKSwgJ3V0ZjgnKSk7XG4gICAgICAgICAgfSkpO1xuICAgICAgfSksXG4gICAgICBtYXAoanNvblN0cnMgPT4ge1xuICAgICAgICBhY3Rpb25EaXNwYXRjaGVyLl91cGRhdGVQYWNrYWdlU3RhdGUoanNvblN0cnMubWFwKHN0ciA9PiBKU09OLnBhcnNlKHN0cikpKTtcbiAgICAgIH0pLFxuICAgICAgaWdub3JlRWxlbWVudHMoKVxuICAgICksXG5cbiAgICAvLyBpbml0Um9vdERpclxuICAgIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5pbml0Um9vdERpciksXG4gICAgICBzd2l0Y2hNYXAoKCkgPT4ge1xuICAgICAgICByZXR1cm4gZnJvbShpbml0Um9vdERpcmVjdG9yeSgpKTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICAvLyBJbiBjYXNlIGFueSB3b3Jrc3BhY2UncyBpbnN0YWxsSnNvblN0ciBpcyBjaGFuZ2VkLCBkbyBfaW5zdGFsbFdvcmtzcGFjZVxuICAgIGdldFN0b3JlKCkucGlwZShcbiAgICAgIG1hcChzID0+IHMud29ya3NwYWNlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAvLyBkaXN0aW5jdFVudGlsQ2hhbmdlZCgoczEsIHMyKSA9PiB7XG4gICAgICAvLyAgIGNvbnN0IGtleXMxID0gT2JqZWN0LmtleXMoczEpO1xuICAgICAgLy8gICBjb25zdCBrZXlzMiA9IE9iamVjdC5rZXlzKHMyKTtcbiAgICAgIC8vICAgcmV0dXJuIGtleXMxLmxlbmd0aCA9PT0ga2V5czIubGVuZ3RoICYmIGtleXMxLmV2ZXJ5KGtleSA9PiBzMltrZXldICE9IG51bGwpO1xuICAgICAgLy8gfSksXG4gICAgICBtYXAod29ya3NwYWNlcyA9PiBPYmplY3Qua2V5cyh3b3Jrc3BhY2VzKSksXG4gICAgICBmaWx0ZXIoZGlycyA9PiBkaXJzLmxlbmd0aCA+IDApLFxuICAgICAgdGFrZSgxKSxcbiAgICAgIHN3aXRjaE1hcChkaXJzID0+IGNvbmNhdCguLi5kaXJzLm1hcChkaXIgPT4gZ2V0U3RvcmUoKVxuICAgICAgICAucGlwZShcbiAgICAgICAgICBtYXAocyA9PiBzLndvcmtzcGFjZXNbZGlyXSksXG4gICAgICAgICAgZGlzdGluY3RVbnRpbENoYW5nZWQoKHMxLCBzMikgPT4gczEuaW5zdGFsbEpzb25TdHIgPT09IHMyLmluc3RhbGxKc29uU3RyKSxcbiAgICAgICAgICBza2lwKDEpLC8vIHNraXAgaW5pdGlhbCB2YWx1ZSwgb25seSByZWFjdCBmb3IgY2hhbmdpbmcgdmFsdWUgZXZlbnRcbiAgICAgICAgICBmaWx0ZXIocyA9PiBzLmluc3RhbGxKc29uU3RyLmxlbmd0aCA+IDApLFxuICAgICAgICAgIG1hcCh3cyA9PiBzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKHtkaXI6IHdzLmRpcn0pKVxuICAgICAgICApXG4gICAgICApKSlcbiAgICApLFxuICAgIC8vIGFjdGlvbiQucGlwZShvZlBheWxvYWRBY3Rpb24oc2xpY2UuYWN0aW9ucy5fc3luY1BhY2thZ2VzU3RhdGUpLFxuICAgIC8vICAgc3dpdGNoTWFwKCgpID0+IHtcbiAgICAvLyAgICAgY29uc3Qgc3JjUGFja2FnZXMgPSBnZXRTdGF0ZSgpIS5zcmNQYWNrYWdlcztcbiAgICAvLyAgICAgaWYgKHNyY1BhY2thZ2VzICE9IG51bGwpIHtcbiAgICAvLyAgICAgICByZXR1cm4gZnJvbShPYmplY3Qua2V5cyhnZXRTdGF0ZSgpIS53b3Jrc3BhY2VzKSk7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgICAgcmV0dXJuIGZyb20oW10pO1xuICAgIC8vICAgfSksXG4gICAgLy8gICBtYXAod29ya3NwYWNlID0+IHNsaWNlLmFjdGlvbnMuX2hvaXN0V29ya3NwYWNlRGVwcyh7ZGlyOiB3b3Jrc3BhY2V9KSlcbiAgICAvLyApLFxuICAgIGFjdGlvbiQucGlwZShcbiAgICAgIG9mUGF5bG9hZEFjdGlvbihzbGljZS5hY3Rpb25zLl9pbnN0YWxsV29ya3NwYWNlKSxcbiAgICAgIG1lcmdlTWFwKGFjdGlvbiA9PiBnZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgIG1hcChzID0+IHMud29ya3NwYWNlc1thY3Rpb24ucGF5bG9hZC5kaXJdKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgZmlsdGVyKHdzID0+IHdzICE9IG51bGwpXG4gICAgICApKSxcbiAgICAgIGNvbmNhdE1hcCh3cyA9PiBmcm9tKGluc3RhbGxXb3Jrc3BhY2Uod3MpKSksXG4gICAgICBpZ25vcmVFbGVtZW50cygpXG4gICAgKVxuXG4gICAgLy8gZ2V0U3RvcmUoKS5waXBlKFxuICAgIC8vIG1hcChzID0+IHMucHJvamVjdDJQYWNrYWdlcyksIGRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgLy8gdGFrZSgyKSwgdGFrZUxhc3QoMSksXG4gICAgLy8gbWFwKCgpID0+IHNsaWNlLmFjdGlvbnMuaW5pdFdvcmtzcGFjZSh7ZGlyOiAnJ30pKVxuICApO1xufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0ZSgpIHtcbiAgcmV0dXJuIHN0YXRlRmFjdG9yeS5zbGljZVN0YXRlKHNsaWNlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0b3JlKCkge1xuICByZXR1cm4gc3RhdGVGYWN0b3J5LnNsaWNlU3RvcmUoc2xpY2UpO1xufVxuLy8gaW1wb3J0IFBhY2thZ2VOb2RlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0UGFja2FnZXMoKTogc3RyaW5nIHtcbiAgbGV0IG91dCA9ICcnO1xuICBsZXQgaSA9IDA7XG4gIGZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nKSA9PiB7XG4gICAgb3V0ICs9IGAke2krK30uICR7bmFtZX1gO1xuICAgIG91dCArPSAnXFxuJztcbiAgfSwgJ3NyYycpO1xuXG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9qZWN0TGlzdCgpIHtcbiAgcmV0dXJuIE9iamVjdC5rZXlzKGdldFN0YXRlKCkhLnByb2plY3QyUGFja2FnZXMpLm1hcChwaiA9PiBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBwaikpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdFBhY2thZ2VzQnlQcm9qZWN0cygpIHtcbiAgbGV0IG91dCA9ICcnO1xuICBmb3IgKGNvbnN0IHByaiBvZiBnZXRQcm9qZWN0TGlzdCgpKSB7XG4gICAgb3V0ICs9IGNvbDEoYFByb2plY3Q6ICR7cHJqfWApICsgJ1xcbic7XG4gICAgZWFjaFJlY2lwZVNyYyhwcmosIChzcmNEaXIsIHJlY2lwZURpcikgPT4ge1xuICAgICAgY29uc3QgcmVsRGlyID0gUGF0aC5yZWxhdGl2ZShwcmosIHNyY0RpcikgfHwgJy8nO1xuICAgICAgb3V0ICs9IGAgICR7Y29sMSgnfC0nKX0gJHtjeWFuKHJlbERpcil9XFxuYDtcbiAgICAgIGNvbnN0IGRlcHM6IHN0cmluZ1tdID0gT2JqZWN0LmtleXMocmVxdWlyZShQYXRoLnJlc29sdmUocmVjaXBlRGlyLCAncGFja2FnZS5qc29uJykpLmRlcGVuZGVuY2llcyk7XG4gICAgICBkZXBzLmZvckVhY2gobmFtZSA9PiBvdXQgKz0gYCAgJHtjb2wxKCd8Jyl9ICAkeyBjb2wxKCd8LScpfSAke25hbWV9XFxuYCk7XG4gICAgfSk7XG4gICAgb3V0ICs9ICdcXG4nO1xuICB9XG4gIC8vIG91dCArPSAnXFxuSW5zdGFsbGVkOlxcbic7XG4gIC8vIGVhY2hJbnN0YWxsZWRSZWNpcGUoKHJlY2lwZURpcikgPT4ge1xuICAvLyAgIG91dCArPSBgJHtyZWNpcGVEaXJ9XFxuYDtcbiAgLy8gfSk7XG4gIHJldHVybiBvdXQ7XG59XG5cbmNvbnN0IGN3ZCA9IHByb2Nlc3MuY3dkKCk7XG5cbmFzeW5jIGZ1bmN0aW9uIGluaXRSb290RGlyZWN0b3J5KCkge1xuICBjb25zdCByb290UGF0aCA9IGN3ZDtcbiAgZnMubWtkaXJwU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JykpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzL2NvbmZpZy5sb2NhbC10ZW1wbGF0ZS55YW1sJyksIFBhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnLCAnY29uZmlnLmxvY2FsLnlhbWwnKSk7XG4gIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90ZW1wbGF0ZXMvbG9nNGpzLmpzJyksIHJvb3RQYXRoICsgJy9sb2c0anMuanMnKTtcbiAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcy9hcHAtdGVtcGxhdGUuanMnKSwgcm9vdFBhdGggKyAnL2FwcC5qcycpO1xuICBtYXliZUNvcHlUZW1wbGF0ZShQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJywgJ21vZHVsZS1yZXNvbHZlLnNlcnZlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5zZXJ2ZXIudHMnKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG1heC1saW5lLWxlbmd0aFxuICAgIC8vIG1heWJlQ29weVRlbXBsYXRlKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICd0ZW1wbGF0ZXMnLCAnbW9kdWxlLXJlc29sdmUuYnJvd3Nlci50bXBsLnRzJyksIHJvb3RQYXRoICsgJy9tb2R1bGUtcmVzb2x2ZS5icm93c2VyLnRzJyk7XG4gIGF3YWl0IGNsZWFuSW52YWxpZFN5bWxpbmtzKCk7XG4gIGlmICghZnMuZXhpc3RzU3luYyhQYXRoLmpvaW4ocm9vdFBhdGgsICdsb2dzJykpKVxuICAgIGZzLm1rZGlycFN5bmMoUGF0aC5qb2luKHJvb3RQYXRoLCAnbG9ncycpKTtcblxuICBsb2dDb25maWcoY29uZmlnKCkpO1xuICBjb25zdCBhY3Rpb24gPSBhd2FpdCBfaW5pdERlcGVuZGVuY3koKTtcblxuICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuLi9jbWQvY29uZmlnLXNldHVwJykpLmFkZHVwQ29uZmlncygoZmlsZSwgY29uZmlnQ29udGVudCkgPT4ge1xuICAgIHdyaXRlRmlsZShQYXRoLnJlc29sdmUocm9vdFBhdGggfHwgcHJvY2Vzcy5jd2QoKSwgJ2Rpc3QnLCBmaWxlKSxcbiAgICAgICdcXG4jIERPIE5PVCBNT0RJRklZIFRISVMgRklMRSFcXG4nICsgY29uZmlnQ29udGVudCk7XG4gIH0pO1xuXG4gIC8vIGNyZWF0ZVByb2plY3RTeW1saW5rKCk7XG4gIHdyaXRlVHNjb25maWc0RWRpdG9yKGdldFByb2plY3RMaXN0KCkpO1xuICByZXR1cm4gYWN0aW9uO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0YWxsV29ya3NwYWNlKHdzOiBXb3Jrc3BhY2VTdGF0ZSkge1xuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coJ0luc3RhbGwgZGVwZW5kZW5jaWVzIGluICcgKyB3cy5kaXIpO1xuICBjb25zdCBzeW1saW5rc0luTW9kdWxlRGlyID0gW10gYXMge2NvbnRlbnQ6IHN0cmluZywgbGluazogc3RyaW5nfVtdO1xuXG4gIGNvbnN0IHRhcmdldCA9IFBhdGgucmVzb2x2ZSh3cy5kaXIsICdub2RlX21vZHVsZXMnKTtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHRhcmdldCkpIHtcbiAgICBmcy5ta2RpcnBTeW5jKHRhcmdldCk7XG4gIH1cbiAgLy8gMS4gY3JlYXRlIHN5bWxpbmsgYG5vZGVfbW9kdWxlc2AgdW5kZXIgZXZlcnkgbGlua2VkIGNvbXBvbmVudCBwYWNrYWdlJ3MgcmVhbFBhdGhcbiAgY29uc3QgbGlua3MgPSBhd2FpdCBQcm9taXNlLmFsbChbLi4ud3MubGlua2VkRGVwZW5kZW5jaWVzLCAuLi53cy5saW5rZWREZXZEZXBlbmRlbmNpZXNdXG4gICAgLm1hcChhc3luYyAoW2RlcF0pID0+IHtcbiAgICAgIGNvbnN0IGRpciA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMhW2RlcF0ucmVhbFBhdGg7XG4gICAgICBjb25zdCBsaW5rID0gUGF0aC5yZXNvbHZlKGRpciwgJ25vZGVfbW9kdWxlcycpO1xuICAgICAgYXdhaXQgc3ltbGlua0FzeW5jKHRhcmdldCwgbGluayk7XG4gICAgICByZXR1cm4gbGluaztcbiAgICAgIC8vIHJldHVybiBsaW5rO1xuICAgIH0pKTtcblxuICBpZiAobGlua3MubGVuZ3RoID4gMCkge1xuICAgIC8vIDIuIFRlbW9wcmFyaWx5IHJlbW92ZSBhbGwgc3ltbGlua3MgdW5kZXIgYG5vZGVfbW9kdWxlcy9gIGFuZCBgbm9kZV9tb2R1bGVzL0AqL2BcbiAgICAvLyBiYWNrdXAgdGhlbSBmb3IgbGF0ZSByZWNvdmVyeVxuICAgIGF3YWl0IHNjYW5Ob2RlTW9kdWxlc0ZvclN5bWxpbmtzKHdzLmRpciwgbGluayA9PiB7XG4gICAgICBjb25zdCBsaW5rQ29udGVudCA9IGZzLnJlYWRsaW5rU3luYyhsaW5rKTtcbiAgICAgIHN5bWxpbmtzSW5Nb2R1bGVEaXIucHVzaCh7Y29udGVudDogbGlua0NvbnRlbnQsIGxpbmt9KTtcbiAgICAgIHJldHVybiB1bmxpbmtBc3luYyhsaW5rKTtcbiAgICB9KTtcbiAgICBfY2xlYW5BY3Rpb25zLmFkZFdvcmtzcGFjZUZpbGUobGlua3MpO1xuXG4gICAgLy8gMy4gUnVuIGBucG0gaW5zdGFsbGBcbiAgICBjb25zdCBpbnN0YWxsSnNvbkZpbGUgPSBQYXRoLnJlc29sdmUod3MuZGlyLCAncGFja2FnZS5qc29uJyk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1tpbml0XSB3cml0ZScsIGluc3RhbGxKc29uRmlsZSk7XG5cbiAgICBmcy53cml0ZUZpbGUoaW5zdGFsbEpzb25GaWxlLCB3cy5pbnN0YWxsSnNvblN0ciwgJ3V0ZjgnKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgZXhlKCducG0nLCAnaW5zdGFsbCcsIHtjd2Q6IHdzLmRpcn0pLnByb21pc2U7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhlLCBlLnN0YWNrKTtcbiAgICB9XG4gICAgLy8gNC4gUmVjb3ZlciBwYWNrYWdlLmpzb24gYW5kIHN5bWxpbmtzIGRlbGV0ZWQgaW4gU3RlcC4xLlxuICAgIGZzLndyaXRlRmlsZShpbnN0YWxsSnNvbkZpbGUsIHdzLm9yaWdpbkluc3RhbGxKc29uU3RyLCAndXRmOCcpO1xuICAgIGF3YWl0IHJlY292ZXJTeW1saW5rcygpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3ZlclN5bWxpbmtzKCkge1xuICAgIHJldHVybiBQcm9taXNlLmFsbChzeW1saW5rc0luTW9kdWxlRGlyLm1hcCgoe2NvbnRlbnQsIGxpbmt9KSA9PiB7XG4gICAgICByZXR1cm4gX3N5bWxpbmtBc3luYyhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICB9KSk7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gX2luaXREZXBlbmRlbmN5KCkge1xuICBjb25zdCBybSA9IChhd2FpdCBpbXBvcnQoJy4uL3JlY2lwZS1tYW5hZ2VyJykpO1xuXG4gIC8vIGNvbnN0IGxpc3RDb21wRGVwZW5kZW5jeSA9IGF3YWl0IChhd2FpdCBpbXBvcnQoJy4uL2RlcGVuZGVuY3ktaW5zdGFsbGVyJykpLmxpc3RDb21wRGVwZW5kZW5jeTtcbiAgY29uc3QgcHJvamVjdERpcnMgPSBhd2FpdCBnZXRTdG9yZSgpLnBpcGUoXG4gICAgcGx1Y2soJ3Byb2plY3QyUGFja2FnZXMnKSwgZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBtYXAocHJvamVjdDJQYWNrYWdlcyA9PiBPYmplY3Qua2V5cyhwcm9qZWN0MlBhY2thZ2VzKS5tYXAoZGlyID0+IFBhdGgucmVzb2x2ZShkaXIpKSksXG4gICAgdGFrZSgxKVxuICApLnRvUHJvbWlzZSgpO1xuXG4gIHByb2plY3REaXJzLmZvckVhY2gocHJqZGlyID0+IHtcbiAgICBfd3JpdGVHaXRIb29rKHByamRpcik7XG4gICAgbWF5YmVDb3B5VGVtcGxhdGUoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3RzbGludC5qc29uJyksIHByamRpciArICcvdHNsaW50Lmpzb24nKTtcbiAgfSk7XG4gIGxldCBwa0pzb25GaWxlcyA9IGF3YWl0IHJtLmxpbmtDb21wb25lbnRzQXN5bmMoKTtcbiAgLy8gcGtKc29uRmlsZXMucHVzaCguLi5wcm9qZWN0RGlycy5maWx0ZXIoZGlyID0+IGRpciAhPT0gY3dkKVxuICAvLyAgICAgLm1hcChkaXIgPT4gUGF0aC5qb2luKGRpciwgJ3BhY2thZ2UuanNvbicpKVxuICAvLyAgICAgLmZpbHRlcihmaWxlID0+IGZzLmV4aXN0c1N5bmMoZmlsZSkpKTtcbiAgcGtKc29uRmlsZXMgPSBfLnVuaXEocGtKc29uRmlsZXMpO1xuICByZXR1cm4gc2xpY2UuYWN0aW9ucy5fc3luY1BhY2thZ2VzU3RhdGUoe3BhY2thZ2VKc29uRmlsZXM6IHBrSnNvbkZpbGVzfSk7XG4gIC8vIGNvbnN0IG5lZWRSdW5JbnN0YWxsID0gbGlzdENvbXBEZXBlbmRlbmN5KHBrSnNvbkZpbGVzLCB0cnVlKTtcbiAgLy8gcmV0dXJuIG5lZWRSdW5JbnN0YWxsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzY2FuRGlyRm9yTm9kZU1vZHVsZXMocGFja2FnZURpcnM6IHN0cmluZ1tdLCB3b3Jrc3BhY2VEaXI6IHN0cmluZykge1xuICAvLyBjb25zdCB3b3Jrc3BhY2VObSA9IFBhdGgucmVzb2x2ZSh3b3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKTtcbiAgY29uc3Qgbm1EaXJzID0gYXdhaXQgUHJvbWlzZS5hbGwocGFja2FnZURpcnMubWFwKGFzeW5jIGRpciA9PiB7XG4gICAgY29uc3Qgbm0gPSBQYXRoLnJlc29sdmUoZGlyLCAnbm9kZV9tb2R1bGVzJyk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIGF3YWl0IHN5bWxpbmtBc3luYyh3b3Jrc3BhY2VObSwgbm0pO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS5lcnJvcihjaGFsay5yZWQoJ1tzY2FuRGlyRm9yTm9kZU1vZHVsZXNdJyksIGVycik7XG4gICAgfVxuICAgIHJldHVybiBubTtcbiAgfSkpO1xuICByZXR1cm4gbm1EaXJzO1xuICAvLyBjb25zb2xlLmxvZyhubURpcnMuam9pbignXFxuJykpO1xufVxuXG5mdW5jdGlvbiBjcChmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKF8uc3RhcnRzV2l0aChmcm9tLCAnLScpKSB7XG4gICAgZnJvbSA9IGFyZ3VtZW50c1sxXTtcbiAgICB0byA9IGFyZ3VtZW50c1syXTtcbiAgfVxuICBmcy5jb3B5U3luYyhmcm9tLCB0byk7XG4gIC8vIHNoZWxsLmNwKC4uLmFyZ3VtZW50cyk7XG4gIGlmICgvWy9cXFxcXSQvLnRlc3QodG8pKVxuICAgIHRvID0gUGF0aC5iYXNlbmFtZShmcm9tKTsgLy8gdG8gaXMgYSBmb2xkZXJcbiAgZWxzZVxuICAgIHRvID0gUGF0aC5yZWxhdGl2ZShjd2QsIHRvKTtcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKCdjb3B5IHRvICVzJywgY2hhbGsuY3lhbih0bykpO1xufVxuXG5mdW5jdGlvbiBtYXliZUNvcHlUZW1wbGF0ZShmcm9tOiBzdHJpbmcsIHRvOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKFBhdGgucmVzb2x2ZShjd2QsIHRvKSkpXG4gICAgY3AoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgZnJvbSksIHRvKTtcbn1cblxuZnVuY3Rpb24gcGF0aE9mUm9vdFBhdGgocGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHJlbFBhdGggPSBQYXRoLnJlbGF0aXZlKGdldFJvb3REaXIoKSwgcGF0aCk7XG4gIHJldHVybiByZWxQYXRoLnN0YXJ0c1dpdGgoJy4uJykgPyBQYXRoLnJlc29sdmUocGF0aCkgOiByZWxQYXRoO1xufVxuXG5mdW5jdGlvbiBfd3JpdGVHaXRIb29rKHByb2plY3Q6IHN0cmluZykge1xuICAvLyBpZiAoIWlzV2luMzIpIHtcbiAgY29uc3QgZ2l0UGF0aCA9IFBhdGgucmVzb2x2ZShwcm9qZWN0LCAnLmdpdC9ob29rcycpO1xuICBpZiAoZnMuZXhpc3RzU3luYyhnaXRQYXRoKSkge1xuICAgIGNvbnN0IGhvb2tTdHIgPSAnIyEvYmluL3NoXFxuJyArXG4gICAgICBgY2QgXCIke2N3ZH1cIlxcbmAgK1xuICAgICAgLy8gJ2RyY3AgaW5pdFxcbicgK1xuICAgICAgLy8gJ25weCBwcmV0dHktcXVpY2sgLS1zdGFnZWRcXG4nICsgLy8gVXNlIGB0c2xpbnQgLS1maXhgIGluc3RlYWQuXG4gICAgICBgbm9kZSBub2RlX21vZHVsZXMvZHItY29tcC1wYWNrYWdlL2Jpbi9kcmNwLmpzIGxpbnQgLS1waiBcIiR7cHJvamVjdC5yZXBsYWNlKC9bL1xcXFxdJC8sICcnKX1cIiAtLWZpeFxcbmA7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoZ2l0UGF0aCArICcvcHJlLWNvbW1pdCcpKVxuICAgICAgZnMudW5saW5rKGdpdFBhdGggKyAnL3ByZS1jb21taXQnKTtcbiAgICBmcy53cml0ZUZpbGVTeW5jKGdpdFBhdGggKyAnL3ByZS1wdXNoJywgaG9va1N0cik7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ1dyaXRlICcgKyBnaXRQYXRoICsgJy9wcmUtcHVzaCcpO1xuICAgIGlmICghaXNXaW4zMikge1xuICAgICAgc3Bhd24oJ2NobW9kJywgJy1SJywgJyt4JywgcHJvamVjdCArICcvLmdpdC9ob29rcy9wcmUtcHVzaCcpO1xuICAgIH1cbiAgfVxuICAvLyB9XG59XG4iXX0=