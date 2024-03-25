"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packagesService = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/indent */
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const log4js_1 = require("log4js");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const reactivizer_1 = require("../../../packages/reactivizer");
const misc_1 = require("../utils/misc");
const index_1 = require("./index");
const { rootDir, symlinkDirName } = misc_1.plinkEnv;
const log = (0, log4js_1.getLogger)('plink.package-mgr2');
const packageChangesTable = ['onPackageUpdated', 'onPackageUpdated', 'onSpaceRemoved', 'onSpaceUpdated'];
const outputTableFor = [
    'currentSpace',
    'inited', 'workspaces', 'project2Packages', 'srcDir2Packages', 'srcPackages',
    'gitIgnores', 'workspaceUpdateChecksum', 'packagesUpdateChecksum', 'npmInstallOpt', 'currWorkspace',
    'linkedDrcp', 'linkedDrcpProject', 'installedDrcp', 'isInChina'
];
exports.packagesService = new reactivizer_1.ReactorComposite2({
    name: 'PackageMgr2',
    outputTableFor,
    log(msg, ...obj) {
        log.info(msg, ...obj);
    }
});
const { i, o, r, outputTable } = exports.packagesService;
r('scan -> onScanned, project2Packages, srcDir2Packages, inited, srcPackages', i.pt.scan.pipe(rx.withLatestFrom(outputTable.l.project2Packages, outputTable.l.srcDir2Packages), rx.concatMap(async ([[m], [, project2Packages], [, srcDir2Packages]]) => {
    const projPkgMap = new Map();
    const srcPkgMap = new Map();
    const rm = (await import('../recipe-manager.js'));
    const pkgList = [];
    await rx.lastValueFrom(rm.scanPackages().pipe(rx.tap(([proj, jsonFile, srcDir]) => {
        if (proj && !projPkgMap.has(proj))
            projPkgMap.set(proj, []);
        if (proj == null && srcDir && !srcPkgMap.has(srcDir))
            srcPkgMap.set(srcDir, []);
        log.debug('scan package.json', jsonFile);
        const info = (0, index_1.createPackageInfo)(jsonFile, false);
        if (info.json.dr || info.json.plink) {
            pkgList.push(info);
            if (proj)
                projPkgMap.get(proj).push(info);
            else if (srcDir)
                srcPkgMap.get(srcDir).push(info);
            else
                log.error(`Orphan ${jsonFile}`);
        }
        else {
            log.debug(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`, info.json);
        }
    })));
    let dirty = false;
    for (const [prj, pkgs] of projPkgMap.entries()) {
        project2Packages.set((0, index_1.pathToProjKey)(prj), pkgs.map(pkgs => pkgs.name));
        dirty = true;
    }
    if (dirty)
        o.ft.project2Packages(project2Packages).dp(m);
    dirty = false;
    for (const [srcDir, pkgs] of srcPkgMap.entries()) {
        srcDir2Packages.set((0, index_1.pathToProjKey)(srcDir), pkgs.map(pkgs => pkgs.name));
        dirty = true;
    }
    if (dirty)
        o.ft.srcDir2Packages(srcDir2Packages).dp(m);
    o.ft.inited(true).dp(m);
    // o.ft.onScanned().dp(m);
    const srcPackages = new Map();
    for (const pkInfo of pkgList) {
        srcPackages.set(pkInfo.name, pkInfo);
    }
    o.ft.srcPackages(srcPackages).dp(m);
})));
r('syncWorkspace, srcPackages -> currWorkspace', i.pt.syncWorkspace.pipe(rx.concatMap(([m, wsKey]) => rx.combineLatest([
    outputTable.l.srcPackages,
    outputTable.l.workspaces
]).pipe(rx.take(1), rx.tap(([[, srcPackages], [, workspaces]]) => {
    const wsDir = node_path_1.default.resolve(rootDir, wsKey);
    o.ft.currWorkspace(wsKey).dp(m);
    const symlinkDir = node_path_1.default.resolve(wsDir, symlinkDirName || 'node_modules');
    if (!fs_extra_1.default.existsSync(symlinkDir))
        fs_extra_1.default.mkdirpSync(symlinkDir);
    const pkgjsonFile = node_path_1.default.resolve(wsDir, 'package.json');
    const lockFile = node_path_1.default.resolve(wsDir, 'plink2.install.lock');
    let pkjsonStr;
    if (node_fs_1.default.existsSync(lockFile)) {
        log.warn('Plink sync process was interrupted last time, recover content of ' + pkgjsonFile);
        pkjsonStr = node_fs_1.default.readFileSync(lockFile, 'utf8');
        node_fs_1.default.unlinkSync(lockFile);
    }
    else {
        pkjsonStr = node_fs_1.default.readFileSync(pkgjsonFile, 'utf8');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const pkjson = JSON.parse(pkjsonStr);
    const [linkedDependencies, toInstallDeps] = createDependencies(pkjson.dependencies, srcPackages);
    const [linkedDevDependencies, toInstallDevDeps] = createDependencies(pkjson.devDependencies, srcPackages);
    const installJson = Object.assign(Object.assign({}, pkjson), { dependencies: toInstallDeps, devDependencies: toInstallDevDeps });
    let workspaceState = workspaces.get(wsKey);
    if (workspaceState == null) {
        workspaceState = {
            id: wsKey
        };
        workspaces.set(wsKey, workspaceState);
    }
    workspaceState.installJson = installJson;
    workspaceState.installJsonStr = JSON.stringify(installJson, null, '  ');
    workspaceState.linkedDependencies = linkedDependencies;
    workspaceState.linkedDevDependencies = linkedDevDependencies;
    // checkAllWorkspaces();
})))));
o.ft.inited(false).dp();
o.ft.workspaces(new Map()).dp();
o.ft.project2Packages(new Map()).dp();
o.ft.srcDir2Packages(new Map()).dp();
// o.ft.srcPackages(new Map()).dp();
o.ft.gitIgnores({}).dp();
o.ft.workspaceUpdateChecksum(0).dp();
o.ft.packagesUpdateChecksum(0).dp();
o.ft.npmInstallOpt({ isForce: false }).dp();
o.ft.currWorkspace(null).dp();
o.ft.linkedDrcp().dp();
o.ft.linkedDrcpProject().dp();
o.ft.installedDrcp().dp();
o.ft.isInChina().dp();
o.ft.lastCreatedWorkspace().dp();
function createDependencies(dependencies, srcPackages) {
    const sourceDeps = [];
    const toInstallDeps = {};
    for (const pair of Object.entries(dependencies || {})) {
        const [name, ver] = pair;
        const pkgInfo = srcPackages.get(name);
        if (pkgInfo) {
            sourceDeps.push(pair);
            toInstallDeps[name] = pkgInfo.realPath;
        }
        else {
            toInstallDeps[name] = ver;
        }
    }
    return [sourceDeps, toInstallDeps];
}
//# sourceMappingURL=package-mgr2.js.map