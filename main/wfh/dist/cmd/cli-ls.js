"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPackagesByProjects = exports.checkDir = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
const config_1 = tslib_1.__importDefault(require("../config"));
const pkMgr = tslib_1.__importStar(require("../package-mgr"));
// import {getRootDir} from '../utils/misc';
const package_list_helper_1 = require("../package-mgr/package-list-helper");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const path_1 = tslib_1.__importDefault(require("path"));
const cli_init_1 = require("./cli-init");
const operators_1 = require("rxjs/operators");
const misc_1 = require("../utils/misc");
const priorityHelper = tslib_1.__importStar(require("../package-priority-helper"));
const package_runner_1 = require("../package-runner");
const store_1 = require("../store");
async function list(opt) {
    if (opt.hoist) {
        for (const wsState of pkMgr.getState().workspaces.values()) {
            (0, cli_init_1.printWorkspaceHoistedDeps)(wsState);
        }
    }
    if (opt.json)
        console.log(JSON.stringify(jsonOfLinkedPackageForProjects(), null, '  '));
    else
        console.log(listPackagesByProjects(require('../package-mgr').getState()));
    const table = (0, misc_1.createCliTable)({ horizontalLines: false });
    table.push([{ colSpan: 3, hAlign: 'center', content: chalk_1.default.bold('SERVER PACKAGES') }], ['PACKAGE', 'PRIORITY', 'DIRECTORY'].map(item => chalk_1.default.gray(item)), ['------', '-------', '--------'].map(item => chalk_1.default.gray(item)));
    const list = await listServerPackages();
    list.forEach(row => table.push([
        row.name,
        row.priority,
        chalk_1.default.cyan(path_1.default.relative((0, config_1.default)().rootPath, row.dir))
    ]));
    console.log(table.toString());
    (0, cli_init_1.printWorkspaces)();
}
exports.default = list;
function checkDir(opt) {
    store_1.dispatcher.changeActionOnExit('save');
    pkMgr.getStore().pipe((0, operators_1.map)(s => s.packagesUpdateChecksum), (0, operators_1.distinctUntilChanged)(), (0, operators_1.skip)(1), (0, operators_1.take)(1), (0, operators_1.map)((curr) => {
        console.log('Directory state is updated.');
        return curr;
    })).subscribe();
    pkMgr.actionDispatcher.updateDir();
}
exports.checkDir = checkDir;
function listPackagesByProjects(state) {
    const cwd = process.cwd();
    const linkedPkgs = state.srcPackages;
    const table = (0, misc_1.createCliTable)({ horizontalLines: false, colAligns: ['right', 'left', 'left'] });
    table.push([{ colSpan: 3, content: chalk_1.default.bold('LINKED PACKAGES IN PROJECT\n'), hAlign: 'center' }]);
    for (const [prj, pkgNames] of state.project2Packages.entries()) {
        table.push([{
                colSpan: 3, hAlign: 'left',
                content: chalk_1.default.bold('Project: ') + (prj ? chalk_1.default.cyan(prj) : chalk_1.default.cyan('(root directory)'))
            }
        ], ['PACKAGE NAME', 'VERSION', 'PATH'].map(item => chalk_1.default.gray(item)), ['------------', '-------', '----'].map(item => chalk_1.default.gray(item)));
        const pkgs = pkgNames.map(name => linkedPkgs.get(name));
        for (const pk of pkgs) {
            table.push([
                chalk_1.default.cyan(pk.name),
                chalk_1.default.green(pk.json.version),
                path_1.default.relative(cwd, pk.realPath)
            ]);
        }
    }
    for (const [prj, pkgNames] of state.srcDir2Packages.entries()) {
        table.push([{
                colSpan: 3, hAlign: 'left',
                content: chalk_1.default.bold('Source directory: ') + (prj ? chalk_1.default.cyan(prj) : chalk_1.default.cyan('(root directory)'))
            }
        ], ['PACKAGE NAME', 'VERSION', 'PATH'].map(item => chalk_1.default.gray(item)), ['------------', '-------', '----'].map(item => chalk_1.default.gray(item)));
        const pkgs = pkgNames.map(name => linkedPkgs.get(name));
        for (const pk of pkgs) {
            table.push([
                chalk_1.default.cyan(pk.name),
                chalk_1.default.green(pk.json.version),
                path_1.default.relative(cwd, pk.realPath)
            ]);
        }
    }
    return table.toString();
}
exports.listPackagesByProjects = listPackagesByProjects;
function jsonOfLinkedPackageForProjects() {
    const all = {};
    const linkedPkgs = pkMgr.getState().srcPackages;
    for (const [prj, pkgNames] of pkMgr.getState().project2Packages.entries()) {
        const dep = all[prj] = {};
        for (const pkName of pkgNames) {
            const pkg = linkedPkgs.get(pkName);
            if (pkg)
                dep[pkName] = pkg.json.version;
        }
    }
    return all;
}
async function listServerPackages() {
    let wsKey = pkMgr.workspaceKey(misc_1.plinkEnv.workDir);
    wsKey = pkMgr.getState().workspaces.has(wsKey) ? wsKey : pkMgr.getState().currWorkspace;
    if (wsKey == null) {
        return [];
    }
    const pkgs = Array.from((0, package_list_helper_1.packages4WorkspaceKey)(wsKey, true))
        .filter(package_runner_1.isServerPackage)
        .map(pkg => ({
        name: pkg.name,
        priority: (0, package_runner_1.readPriorityProperty)(pkg.json)
    }));
    const list = [];
    await priorityHelper.orderPackages(pkgs, pk => {
        list.push([pk.name, pk.priority]);
    });
    const workspace = pkMgr.getState().workspaces.get(wsKey);
    return list.map(([name, pri]) => {
        const pkg = pkMgr.getState().srcPackages.get(name) || workspace.installedComponents.get(name);
        return {
            name,
            priority: pri + '',
            dir: pkg.realPath
        };
    });
}
//# sourceMappingURL=cli-ls.js.map