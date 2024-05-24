"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackageMgrService = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const chr = tslib_1.__importStar(require("node:child_process"));
const util_1 = tslib_1.__importDefault(require("util"));
const rx = tslib_1.__importStar(require("rxjs"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const reactivizer_1 = require("@wfh/reactivizer");
const symlinks_1 = require("../utils/symlinks");
const misc_1 = require("../utils/misc");
const cmd_model_1 = require("../plink2/cmd-model");
const package_mgr2_model_1 = require("./package-mgr2-model");
const package_mgr2_utils_1 = require("./package-mgr2-utils");
const package_mgr2_switch_1 = require("./package-mgr2-switch");
const inputTableFor = ['scan'];
const outputTableFor = ['rootPackageJson', 'rootDir', 'linkedDrcp', 'installedDrcp'];
function createPackageMgrService() {
    const packagesService = new reactivizer_1.ReactorComposite2({
        name: 'PackageMgr2',
        debug: false,
        inputTableFor,
        outputTableFor,
        debugExcludeTypes: ['createOrChangeSymlink', 'didSymlinkCreation', 'writeFile'],
        log(...obj) {
            // eslint-disable-next-line no-console
            console.log(...obj.map(value => typeof value === 'string' ? value : util_1.default.inspect(value, false, 0)));
        }
    });
    const { service: withModelService } = (0, package_mgr2_model_1.createStoreService)(packagesService);
    const service = (0, package_mgr2_switch_1.createSwitchSpaceService)(withModelService);
    const { i, o, r, outputTable } = service;
    if (misc_1.plinkEnv.isDrcpSymlink) {
        o.ft.linkedDrcp((0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(misc_1.plinkEnv.plinkDir, 'package.json'))).dp();
        o.ft.installedDrcp(null).dp();
    }
    else {
        o.ft.linkedDrcp(null).dp();
        o.ft.installedDrcp((0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(misc_1.plinkEnv.plinkDir, 'package.json'))).dp();
    }
    r('cmdModelService.enableRxMessageTrace ->', cmd_model_1.cmdModelService.inputTable.l.enableRxMessageTrace.pipe(rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(([, enabled]) => {
        service.config({ debug: enabled });
    })));
    r('scan, didScanSource -> rootDir, onProjectLinked, onDirLinked, rootPackageJson', i.pt.scan.pipe(rx.concatMap(async ([m, rootDir]) => {
        var _a, _b;
        try {
            o.ft.rootDir(rootDir).dp(m);
            const content = await node_fs_1.default.promises.readFile(node_path_1.default.join(rootDir, 'package.json'), 'utf8');
            const pjson = JSON.parse(content);
            i.ft.updatePackagesBegin().dp(m);
            const waitForScan = rx.firstValueFrom(o.pt.didScanSource.pipe((0, reactivizer_1.actionRelatedToAction)(m)));
            if ((_a = pjson.plink) === null || _a === void 0 ? void 0 : _a.externalRepo) {
                for (const dir of pjson.plink.externalRepo) {
                    o.ft.onProjectLinked(dir).dp(m);
                }
            }
            if ((_b = pjson.plink) === null || _b === void 0 ? void 0 : _b.externalDir) {
                for (const d of pjson.plink.externalDir) {
                    o.ft.onDirLinked(d).dp(m);
                }
            }
            o.ft.onProjectLinked('').dp(m);
            o.ft.rootPackageJson(pjson).dp(m);
            await waitForScan;
            i.ft.updatePackagesEnd().dp(m);
            o.ft.onScanCompleted().dp(m);
        }
        catch (e) {
            packagesService.dispatchErrorFor(e, m);
        }
    })));
    r('onProjectLinked, onDirLinked, rootPackageJson -> didScanSource, addPackageToProject', i.pt.updatePackagesBegin.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(([, rootDir]) => [a, require('../recipe-manager'), rootDir]), rx.take(1))), rx.switchMap(([[m], rm, rootDir]) => rx.combineLatest([
        o.pt.onProjectLinked.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m), rx.takeUntil(o.pt.rootPackageJson.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m))), 
        // rx.mergeMap(async ([, dir]) => {
        //   const projPkgJson = JSON.parse(await fs.promises.readFile(Path.resolve(rootDir, dir, 'package.json'), 'utf8')) as RepoPackageJson;
        //   if (projPkgJson.workspaces) {
        //     for (const pkgPath of projPkgJson.workspaces) {
        //       const info = createPackageInfo(Path.resolve(dir, pkgPath, 'package.json'), false);
        //       if (info.json.plink)
        //         i.ft.addPackageToProject(dir, 'repo', info).dp(m);
        //     }
        //   }
        //   return dir;
        // }),
        rx.reduce((arr, [, dir]) => {
            arr.push(node_path_1.default.resolve(rootDir, dir));
            return arr;
        }, []), rx.map(dirs => {
            rm.setProjectList(dirs);
            return true;
        })),
        o.pt.onDirLinked.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m), rx.takeUntil(o.pt.rootPackageJson.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m))), rx.reduce((arr, [, dirPattern]) => {
            arr.push(dirPattern);
            return arr;
        }, []), rx.map(dirs => {
            rm.setLinkPatterns(dirs);
            return true;
        })),
        rx.of(m)
    ]).pipe(rx.mergeMap(([, , m]) => {
        return rx.concat(rm.scanPackages().pipe(rx.map(([proj, jsonFile, srcDir]) => {
            const info = (0, package_mgr2_utils_1.createPackageInfo)(jsonFile, false);
            if (info.json.dr == null && info.json.plink == null)
                return;
            if (proj) {
                i.ft.addPackageToProject(proj, 'repo', info).dp(m);
            }
            else if (srcDir) {
                i.ft.addPackageToProject(srcDir, 'dir', info).dp(m);
            }
            else {
                // eslint-disable-next-line no-console
                console.log(`Package of ${jsonFile} is skipped (due to no "dr" or "plink" property)`, info.json);
            }
        })), new rx.Observable(sub => {
            o.ft.didScanSource().dp(m.r);
            sub.complete();
        }));
    })))));
    const onSpaceDependencyChanged$ = rx.concat(outputTable.l.data_spaceDependencyMap.pipe(rx.take(1)), i.pt.updateDependencyOfSpace.pipe(rx.mergeMap(([m]) => outputTable.l.data_spaceDependencyMap.pipe(rx.take(1), rx.map(([, ...a]) => [m, ...a])))));
    r('didScanSource, data_allPackages, updateDependencyOfSpace, data_spaceDependencyMap -> addPackageToSpace, deletePackageOfSpace, didSyncSpacePackages', rx.combineLatest([
        o.pt.didScanSource.pipe(rx.mergeMap(() => outputTable.l.data_allPackages.pipe(rx.take(1)))),
        onSpaceDependencyChanged$
    ]).pipe(rx.withLatestFrom(outputTable.l.data_spacePkgMap), rx.map(([[[, allPackages], [m, spaceDependencyMap]], [, spacePkgMap]]) => {
        for (const [spaceKey, depSet] of spaceDependencyMap.entries()) {
            const spacePkgSet = spacePkgMap.get(spaceKey);
            for (const dep of depSet) {
                if ((spacePkgSet == null || !spacePkgSet.has(dep)) && allPackages.has(dep))
                    i.ft.addPackageToSpace(spaceKey, dep).dp(m.r);
            }
        }
        for (const [spaceKey, pkgSet] of spacePkgMap.entries()) {
            const depSet = spaceDependencyMap.get(spaceKey);
            for (const pkgName of [...pkgSet]) {
                if (depSet == null || !depSet.has(pkgName) || !allPackages.has(pkgName))
                    i.ft.deletePackageOfSpace(spaceKey, pkgName).dp(m.r);
            }
        }
        o.ft.didSyncSpacePackages().dp(m.r);
    })));
    r('data_spaceDependencyMap, updateDependencyOfSpace -> removeSpace', onSpaceDependencyChanged$.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, spaceDependencyMap], [, rootDir]]) => {
        return rx.from(spaceDependencyMap.keys()).pipe(rx.mergeMap(async (name) => {
            try {
                const stat = await node_fs_1.default.promises.stat(node_path_1.default.resolve(rootDir, name));
                if (!stat.isDirectory()) {
                    i.ft.removeSpace(name).dp(m.r);
                }
            }
            catch (e) {
                i.ft.removeSpace(name).dp(m);
            }
        }));
    })));
    r('runInstall -> didRunInstall', i.pt.runInstall.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(([, rootDir]) => [...a, rootDir]), rx.take(1))), rx.concatMap(async ([m, spaceKey, rootDir]) => {
        var _a;
        const spaceDir = node_path_1.default.resolve(rootDir, spaceKey);
        const installationJsonFile = node_path_1.default.resolve(spaceDir, package_mgr2_switch_1.INSTALLATION_JSON_FILE);
        const spacePkgJsonFile = node_path_1.default.resolve(spaceDir, 'package.json');
        const backup = node_path_1.default.resolve(spaceDir, 'package.lock.json');
        await node_fs_1.default.promises.rename(spacePkgJsonFile, backup);
        await new Promise(resolve => setImmediate(resolve));
        await node_fs_1.default.promises.rename(installationJsonFile, spacePkgJsonFile);
        await new Promise(resolve => setImmediate(resolve));
        const spawnOpt = {
            cwd: spaceDir,
            windowsHide: true,
            stdio: 'inherit',
            env: Object.assign({}, process.env)
        };
        (_a = spawnOpt.env) === null || _a === void 0 ? true : delete _a.NODE_ENV;
        if (process.platform === 'win32') {
            spawnOpt.shell = true;
        }
        try {
            const cp = chr.spawn('npm', ['install'], spawnOpt);
            const [code, sigal] = await new Promise((resolve, rej) => {
                cp.on('exit', (code, sigal) => resolve([code, sigal]));
                cp.on('error', rej);
            });
            if (code !== 0 && code != null) {
                service.dispatchErrorFor(new Error(`npm install exit code is ${code}(${sigal !== null && sigal !== void 0 ? sigal : ''})`), m);
            }
            o.ft.didRunInstall(spaceKey).dp(m);
        }
        catch (err) {
            console.error(err);
            service.dispatchErrorFor(err, m);
        }
        finally {
            await node_fs_1.default.promises.rename(spacePkgJsonFile, installationJsonFile);
            await new Promise(resolve => setImmediate(resolve));
            await node_fs_1.default.promises.rename(backup, spacePkgJsonFile);
        }
    })));
    // Create "workspace" symlinks, create node_module symlink, generate actual package.json for "npm install"
    r('switchToSpace, didCheckSpace -> checkSpace, createOrChangeSymlink, runInstall, didSwitchSpace, writeFile', i.pt.switchToSpace.pipe(rx.filter(([, key]) => key != null), rx.map(([m, key]) => [m, lodash_1.default.trim(key, '/')]), rx.mergeMap(([m, keyOrDir]) => outputTable.l.rootDir.pipe(rx.map(([, rootDir]) => [m, node_path_1.default.relative(rootDir, node_path_1.default.resolve(rootDir, keyOrDir)), rootDir]), rx.take(1))), rx.concatMap(([m, spaceKey, rootDir]) => {
        return o.ft.checkSpace(spaceKey).od(o.pt.didCheckSpace).pipe(rx.mergeMap(() => outputTable.l.data_spacePkgMap), rx.map(([, spacePkgMap]) => { var _a; return [m, rootDir, (_a = spacePkgMap.get(spaceKey)) !== null && _a !== void 0 ? _a : new Set()]; }), rx.combineLatestWith(outputTable.l.data_projPkgMap, outputTable.l.data_allPackages, outputTable.l.data_spaceDependencyMap), rx.take(1), rx.mergeMap(([[m, rootDir, pkgSet], [, projPkgMap], [, allPackages], [, spaceDependency]]) => {
            const steps = i.ft.doingSwitchSpace(rootDir, spaceKey, pkgSet, projPkgMap, allPackages, spaceDependency).re(m).od(o.pt.didCreatingSymlinksToInstallDir, o.pt.didCreatingWorkspaceSymlinks);
            return rx.zip(steps).pipe(rx.take(1));
        }), rx.mergeMap(([[, createdNmParentDirs, links], [, workspaceCount]]) => {
            return o.pt.didWriteTsConfigFiles.pipe((0, reactivizer_1.pairActionToActionStream)(i.ft.runInstall(spaceKey).re(m).od(o.pt.didRunInstall)), rx.map(([, [, fileWrittenCount]]) => {
                o.ft.didSwitchSpace(spaceKey, createdNmParentDirs, links, workspaceCount, fileWrittenCount).dp(m);
            }), rx.take(1));
        }), service.catchErrorFor(m));
    })));
    r('checkSpace, rootDir -> updateDependencyOfSpace, didCheckSpace', o.pt.checkSpace.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.filter(([, dir]) => dir != null), rx.take(1), rx.map(b => [a, b]))), rx.concatMap(async ([[mOfCheckSpace, spaceKey], [, rootDir]]) => {
        try {
            const spaceDir = node_path_1.default.resolve(rootDir, spaceKey);
            const spacePkgJsonFile = node_path_1.default.resolve(rootDir, spaceKey, 'package.json');
            const content = await node_fs_1.default.promises.readFile(spacePkgJsonFile, 'utf8');
            const json = JSON.parse(content);
            let workspacePkgs = [];
            if (json.workspaces) {
                workspacePkgs = await rx.firstValueFrom(rx.from(json.workspaces).pipe(rx.mergeMap(async (pkgPath) => {
                    const pkgDir = node_path_1.default.resolve(spaceDir, pkgPath);
                    try {
                        const stat = await node_fs_1.default.promises.lstat(pkgDir);
                        if (!stat.isSymbolicLink()) {
                            const pkInfo = (0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(pkgPath, 'package.json'), false);
                            return pkInfo.name;
                        }
                        // eslint-disable-next-line no-empty
                    }
                    catch (e) { }
                    return null;
                }), rx.reduce((all, it) => {
                    if (it)
                        all.push(it);
                    return all;
                }, [])));
            }
            i.ft.updateDependencyOfSpace(spaceKey, (json.dependencies ? Object.keys(json.dependencies) : []).concat(json.devDependencies ? Object.keys(json.devDependencies) : []).concat(workspacePkgs)).dp(mOfCheckSpace.r);
            o.ft.didCheckSpace(spaceKey, json).dp(mOfCheckSpace);
        }
        catch (err) {
            console.error(err);
            packagesService.dispatchErrorFor(err, mOfCheckSpace);
        }
    })));
    r('createOrChangeSymlink -> didSymlinkCreation', o.pt.createOrChangeSymlink.pipe(rx.mergeMap(([m, targetPath, linkPath]) => (0, symlinks_1.symlinkAsync)(targetPath, linkPath)
        .then(success => o.ft.didSymlinkCreation(success).dp(m))
        .catch(() => o.ft.didSymlinkCreation(false).dp(m)))));
    r('writeFile -> didWriteFile', o.pt.writeFile.pipe(rx.mergeMap(([m, file, content]) => node_fs_1.default.promises.writeFile(file, content, 'utf8')
        .then(() => o.ft.didWriteFile().dp(m))
        .catch(e => service.dispatchErrorFor(e, m)))));
    return service;
}
exports.createPackageMgrService = createPackageMgrService;
//# sourceMappingURL=package-mgr2.js.map