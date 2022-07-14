"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printWorkspaceHoistedDeps = exports.printWorkspaces = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console, max-len */
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const package_mgr_1 = require("../package-mgr");
const store_1 = require("../store");
const misc_1 = require("../utils/misc");
const package_utils_1 = require("../package-utils");
const cli_ls_1 = require("./cli-ls");
require("../editor-helper");
// import { getRootDir } from '../utils/misc';
const cli_project_1 = require("./cli-project");
function default_1(opt, workspace) {
    store_1.dispatcher.changeActionOnExit('save');
    (0, package_mgr_1.getStore)().pipe((0, operators_1.distinctUntilChanged)((s1, s2) => s1.packagesUpdateChecksum === s2.packagesUpdateChecksum), (0, operators_1.skip)(1), (0, operators_1.map)(s => {
        console.log((0, cli_ls_1.listPackagesByProjects)(s));
        printWorkspaces();
    })).subscribe();
    const existingWsKeys = (0, package_mgr_1.getState)().workspaces;
    // print newly added workspace hoisted dependency information
    (0, package_mgr_1.getStore)().pipe((0, operators_1.map)(s => s.lastCreatedWorkspace), (0, operators_1.distinctUntilChanged)(), (0, operators_1.scan)((prev, curr) => {
        if (curr && !existingWsKeys.has(curr)) {
            printWorkspaceHoistedDeps((0, package_mgr_1.getState)().workspaces.get(curr));
        }
        return curr;
    })).subscribe();
    // print existing workspace CHANGED hoisted dependency information
    (0, rxjs_1.merge)(...Array.from((0, package_mgr_1.getState)().workspaces.keys()).map(wsKey => (0, package_mgr_1.getStore)().pipe((0, operators_1.map)(s => s.workspaces), (0, operators_1.distinctUntilChanged)(), (0, operators_1.map)(s => s.get(wsKey)), (0, operators_1.distinctUntilChanged)((s1, s2) => s1.hoistInfo === s2.hoistInfo && s1.hoistPeerDepInfo === s2.hoistPeerDepInfo), (0, operators_1.scan)((wsOld, wsNew) => {
        // console.log('*****************', wsKey);
        printWorkspaceHoistedDeps(wsNew);
        return wsNew;
    })))).subscribe();
    if (workspace) {
        package_mgr_1.actionDispatcher.updateWorkspace({ dir: workspace, isForce: opt.force, useYarn: opt.useYarn,
            cache: opt.cache, useNpmCi: opt.useCi });
    }
    else {
        package_mgr_1.actionDispatcher.initRootDir({ isForce: opt.force,
            useYarn: opt.useYarn, cache: opt.cache, useNpmCi: opt.useCi });
        setImmediate(() => (0, cli_project_1.listProject)());
    }
    // setImmediate(() => printWorkspaces());
}
exports.default = default_1;
function printWorkspaces() {
    const table = (0, misc_1.createCliTable)({
        horizontalLines: false,
        colAligns: ['right', 'right']
    });
    const sep = ['--------------', '------------------', '------------', '----------', '-----'].map(item => chalk_1.default.gray(item));
    table.push([{ colSpan: 5, content: chalk_1.default.underline('Worktree Space and linked dependencies\n'), hAlign: 'center' }], ['WORKTREE SPACE', 'DEPENDENCY PACKAGE', 'EXPECTED VERSION', 'ACTUAL VERSION', 'SRC DIR'].map(item => chalk_1.default.gray(item)), sep);
    let wsIdx = 0;
    const srcPkgs = (0, package_mgr_1.getState)().srcPackages;
    for (const reldir of (0, package_mgr_1.getState)().workspaces.keys()) {
        if (wsIdx > 0) {
            table.push(sep);
        }
        let i = 0;
        const pkJson = (0, package_mgr_1.getState)().workspaces.get(reldir).originInstallJson;
        // console.log(pkJson);
        let workspaceLabel = reldir ? `  ${reldir}` : '  (root directory)';
        if ((0, package_mgr_1.getState)().currWorkspace === reldir) {
            workspaceLabel = chalk_1.default.inverse(workspaceLabel);
        }
        else {
            workspaceLabel = chalk_1.default.gray(workspaceLabel);
        }
        for (const { name: dep, json: { version: ver }, isInstalled } of (0, package_utils_1.packages4WorkspaceKey)(reldir)) {
            const expectedVer = convertVersion(pkJson, dep);
            const same = expectedVer === ver;
            table.push([
                i === 0 ? workspaceLabel : '',
                same || !isInstalled ? dep : `${chalk_1.default.red('*')} ${dep}`,
                same ? expectedVer : chalk_1.default.yellow(expectedVer),
                ver,
                isInstalled ? chalk_1.default.gray('(installed)') : path_1.default.relative(misc_1.plinkEnv.rootDir, srcPkgs.get(dep).realPath)
            ]);
            i++;
        }
        if (i === 0) {
            table.push([workspaceLabel]);
        }
        wsIdx++;
    }
    console.log(table.toString());
}
exports.printWorkspaces = printWorkspaces;
function convertVersion(pkgJson, depName) {
    let ver = pkgJson.dependencies ? pkgJson.dependencies[depName] : null;
    if (ver == null && pkgJson.devDependencies) {
        ver = pkgJson.devDependencies[depName];
    }
    if (ver == null) {
        return '';
    }
    if (ver.startsWith('.') || ver.startsWith('file:')) {
        const m = /\-(\d+(?:\.\d+){1,2}(?:-[^-]+)?)\.tgz$/.exec(ver);
        if (m) {
            return m[1];
        }
    }
    return ver;
}
function printWorkspaceHoistedDeps(workspace) {
    console.log(chalk_1.default.bold(`\nHoisted Transitive Dependency & Dependents (${workspace.id || '<root directory>'})`));
    const table = createTable();
    table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
    for (const [dep, dependents] of workspace.hoistInfo.entries()) {
        table.push(renderHoistDepInfo(dep, dependents));
    }
    console.log(table.toString());
    if (workspace.hoistDevInfo.size > 0) {
        const table = createTable();
        table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
        console.log(chalk_1.default.bold(`\nHoisted Transitive (dev) Dependency & Dependents (${workspace.id || '<root directory>'})`));
        for (const [dep, dependents] of workspace.hoistDevInfo.entries()) {
            table.push(renderHoistDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    if (workspace.hoistPeerDepInfo.size > 0) {
        console.log(chalk_1.default.bold(`Hoisted Transitive Peer Dependencies (${workspace.id || '<root directory>'})`));
        const table = createTable();
        table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
        for (const [dep, dependents] of workspace.hoistPeerDepInfo.entries()) {
            table.push(renderHoistPeerDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    if (workspace.hoistDevPeerDepInfo.size > 0) {
        console.log(chalk_1.default.yellowBright(`\nHoisted Transitive Peer Dependencies (dev) (${workspace.id || '<root directory>'})`));
        const table = createTable();
        table.push(['DEPENDENCY', 'DEPENDENT'].map(item => chalk_1.default.gray(item)), ['---', '---'].map(item => chalk_1.default.gray(item)));
        for (const [dep, dependents] of workspace.hoistDevPeerDepInfo.entries()) {
            table.push(renderHoistPeerDepInfo(dep, dependents));
        }
        console.log(table.toString());
    }
    printColorExplaination(workspace);
}
exports.printWorkspaceHoistedDeps = printWorkspaceHoistedDeps;
function createTable() {
    const table = (0, misc_1.createCliTable)({
        horizontalLines: false,
        // style: {head: []},
        colAligns: ['right', 'left']
    });
    return table;
}
function renderHoistDepInfo(dep, dependents) {
    return [
        dependents.sameVer ? dep : dependents.direct ? chalk_1.default.yellow(dep) : chalk_1.default.bgRed(dep),
        dependents.by.map((item, idx) => `${dependents.direct && idx === 0 ? chalk_1.default.green(item.ver) : idx > 0 ? chalk_1.default.gray(item.ver) : chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')
    ];
}
function renderHoistPeerDepInfo(dep, dependents) {
    return [
        dependents.missing ? chalk_1.default.yellow(dep) : (dependents.duplicatePeer ? dep : chalk_1.default.green(dep)),
        dependents.by.map((item, idx) => `${dependents.direct && idx === 0 ? chalk_1.default.green(item.ver) : idx > 0 ? item.ver : chalk_1.default.cyan(item.ver)}: ${chalk_1.default.grey(item.name)}`).join('\n')
    ];
}
function printColorExplaination(workspace) {
    const summary = workspace.hoistInfoSummary;
    if (summary == null)
        return;
    if (summary.conflictDeps.length > 0) {
        console.log(`Above listed transitive dependencies: "${chalk_1.default.red(summary.conflictDeps.join(', '))}" have ` +
            'conflict dependency version, resolve them by choosing a version and add them to worktree space.\n');
    }
    if (lodash_1.default.size(summary.missingDeps) > 0) {
        console.log(`Above listed transitive peer dependencies in ${chalk_1.default.yellow('yellow')} should be added to worktree space as "dependencies":\n` +
            chalk_1.default.yellow(JSON.stringify(summary.missingDeps, null, '  ').replace(/^([^])/mg, (m, p1) => '  ' + p1) + '\n'));
    }
    if (lodash_1.default.size(summary.missingDevDeps) > 0) {
        console.log('Above listed transitive peer dependencies might should be added to worktree space as "devDependencies":\n' +
            chalk_1.default.yellow(JSON.stringify(summary.missingDevDeps, null, '  ').replace(/^([^])/mg, (m, p1) => '  ' + p1)) + '\n');
    }
}
//# sourceMappingURL=cli-init.js.map