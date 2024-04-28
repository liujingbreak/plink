"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projPkgMap = exports.spacePkgMap = exports.allPackages = exports.service = exports.spaceDependencyMap = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const chr = tslib_1.__importStar(require("node:child_process"));
const util_1 = tslib_1.__importDefault(require("util"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("../../../packages/reactivizer");
const symlinks_1 = require("../utils/symlinks");
const misc_1 = require("../utils/misc");
const package_mgr2_model_1 = require("./package-mgr2-model");
const package_mgr2_utils_1 = require("./package-mgr2-utils");
const inputTableFor = ['scan'];
const outputTableFor = ['rootPackageJson', 'rootDir', 'linkedDrcp', 'installedDrcp'];
const packagesService = new reactivizer_1.ReactorComposite2({
    name: 'PackageMgr2',
    debug: true,
    inputTableFor,
    outputTableFor,
    debugExcludeTypes: ['createOrChangeSymlink', 'didSymlinkCreation', 'writeFile'],
    log(...obj) {
        // eslint-disable-next-line no-console
        console.log(...obj.map(value => typeof value === 'string' ? value : util_1.default.inspect(value, false, 0)));
    }
});
const { service, spaceDependencyMap, spacePkgMap, allPackages, projPkgMap } = (0, package_mgr2_model_1.createStoreService)(packagesService);
exports.service = service;
exports.spaceDependencyMap = spaceDependencyMap;
exports.spacePkgMap = spacePkgMap;
exports.allPackages = allPackages;
exports.projPkgMap = projPkgMap;
const { i, o, r, outputTable } = service;
const repoNoModuleSymlinkDirTable = service.o.createDataTable('repoNoModuleSymlinkDirs', ([, projKey]) => projKey);
if (misc_1.plinkEnv.isDrcpSymlink) {
    o.ft.linkedDrcp((0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(misc_1.plinkEnv.plinkDir, 'package.json'))).dp();
    o.ft.installedDrcp(null).dp();
}
else {
    o.ft.linkedDrcp(null).dp();
    o.ft.installedDrcp((0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(misc_1.plinkEnv.plinkDir, 'package.json'))).dp();
}
r('scan, didScanSource, didAllSymlinks -> rootDir, onProjectLinked, onDirLinked, rootPackageJson, removeSpace, checkSpace', i.pt.scan.pipe(rx.concatMap(async ([m, rootDir]) => {
    try {
        o.ft.rootDir(rootDir).dp(m);
        const content = await node_fs_1.default.promises.readFile(node_path_1.default.join(rootDir, 'package.json'), 'utf8');
        const pjson = JSON.parse(content);
        i.ft.updateBegin().dp(m);
        const waitForScan = rx.firstValueFrom(o.pt.didScanSource.pipe((0, reactivizer_1.actionRelatedToAction)(m)));
        if (pjson.externalRepo) {
            for (const dir of pjson.externalRepo) {
                o.ft.onProjectLinked(dir).dp(m);
            }
        }
        if (pjson.externalDir) {
            for (const d of pjson.externalDir) {
                o.ft.onDirLinked(d).dp(m);
            }
        }
        o.ft.onProjectLinked('').dp(m);
        i.ft.updateEnd().dp(m);
        o.ft.rootPackageJson(pjson).dp(m);
        await Promise.all([
            waitForScan,
            // check spaces
            spaceDependencyMap.size > 0 ?
                rx.firstValueFrom(rx.from(spaceDependencyMap.keys()).pipe(rx.mergeMap(async (name) => {
                    try {
                        const stat = await node_fs_1.default.promises.stat(node_path_1.default.resolve(rootDir, name));
                        if (!stat.isDirectory()) {
                            i.ft.removeSpace(name).dp(m);
                        }
                        else {
                            await rx.firstValueFrom(o.ft.checkSpace(name).do(o.pt.didCheckSpace, m));
                        }
                    }
                    catch (e) {
                        i.ft.removeSpace(name).dp(m);
                    }
                }))) :
                Promise.resolve()
        ]);
        await rx.firstValueFrom(o.ft.doAllSymlinks().ddo(o.pt.didAllSymlinks));
        o.ft.onScanCompleted().dp(m);
    }
    catch (e) {
        packagesService.dispatchErrorFor(e, m);
    }
})));
r('syncWorkspace, didCheckSpace, didSwitchSpace -> checkSpace, updateCurrentSpace, onSpaceSynced', i.pt.syncWorkspace.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(([, rootDir]) => [a, rootDir]), rx.take(1))), rx.concatMap(([[m, space, npmOpts], rootDir]) => {
    const spaceDir = node_path_1.default.resolve(rootDir, space);
    const spaceKey = node_path_1.default.relative(rootDir, spaceDir).replace(/\\/g, '/');
    return o.ft.checkSpace(spaceKey).do(o.pt.didCheckSpace, m).pipe(rx.take(1), rx.mergeMap(async ([, pkgJson]) => {
        var _a, _b, _c;
        const toWrite = Object.assign({}, pkgJson);
        if (pkgJson.dependencies) {
            toWrite.dependencies = Object.assign({}, pkgJson.dependencies);
        }
        for (const dep of Object.keys((_a = pkgJson.dependencies) !== null && _a !== void 0 ? _a : {})) {
            if (allPackages.has(dep)) {
                toWrite.dependencies[dep] = node_path_1.default.relative(spaceDir, allPackages.get(dep).realPath).replace(/\\/g, '/');
            }
        }
        if (pkgJson.devDependencies) {
            toWrite.devDependencies = Object.assign({}, pkgJson.devDependencies);
        }
        for (const dep of Object.keys((_b = pkgJson.devDependencies) !== null && _b !== void 0 ? _b : {})) {
            if (allPackages.has(dep)) {
                toWrite.devDependencies[dep] = node_path_1.default.relative(spaceDir, allPackages.get(dep).realPath).replace(/\\/g, '/');
            }
        }
        const spacePkgJsonFile = node_path_1.default.resolve(spaceDir, 'package.json');
        const backup = node_path_1.default.resolve(spaceDir, 'package.lock.json');
        await node_fs_1.default.promises.rename(spacePkgJsonFile, backup);
        await rx.firstValueFrom(o.ft.writeFile(spacePkgJsonFile, JSON.stringify(toWrite, null, '  '))
            .ddo(o.pt.didWriteFile, m));
        await new Promise(resolve => setImmediate(resolve));
        const spawnOpt = {
            cwd: spaceDir,
            windowsHide: true,
            stdio: 'inherit',
            env: Object.assign({}, process.env)
        };
        (_c = spawnOpt.env) === null || _c === void 0 ? true : delete _c.NODE_ENV;
        if (process.platform === 'win32') {
            spawnOpt.shell = true;
        }
        try {
            let cp = chr.spawn('npm', ['install'], spawnOpt);
            await new Promise((resolve, rej) => {
                cp.on('exit', (code, sigal) => resolve([code, sigal]));
                cp.on('error', rej);
            });
            if (npmOpts === null || npmOpts === void 0 ? void 0 : npmOpts.dedupe) {
                cp = chr.spawn('npm', ['dedupe'], spawnOpt);
                await new Promise((resolve, rej) => {
                    cp.on('exit', (code, sigal) => resolve([code, sigal]));
                    cp.on('error', rej);
                });
            }
        }
        catch (err) {
            console.error(err);
        }
        finally {
            const actualInstallJson = node_path_1.default.resolve(spaceDir, 'install.package.json');
            if (node_fs_1.default.existsSync(actualInstallJson)) {
                await node_fs_1.default.promises.unlink(actualInstallJson);
            }
            await node_fs_1.default.promises.rename(spacePkgJsonFile, actualInstallJson);
            void node_fs_1.default.promises.rename(backup, spacePkgJsonFile);
        }
    }), rx.mergeMap(() => {
        return i.ft.updateCurrentSpace(spaceKey)
            .do(o.pt.didSwitchSpace, m).pipe(rx.take(1));
    }), rx.finalize(() => o.ft.onSpaceSynced(spaceKey).dp(m)));
})));
r('updateCurrentSpace -> createOrChangeSymlink, didSwitchSpace, writeFile', i.pt.updateCurrentSpace.pipe(rx.filter(([, key]) => key != null), rx.distinctUntilChanged(), rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(([, rootDir]) => [...a, rootDir]), rx.take(1))), rx.mergeMap(([m, key, rootDir]) => rx.forkJoin([
    // create symlinks to <space>/node_moodules
    rx.defer(async () => {
        var _a;
        const spaceNodeModulesDir = node_path_1.default.resolve(rootDir, key, 'node_modules');
        const pkgSet = spacePkgMap.get(key);
        const projList = [...projPkgMap.keys()];
        const createdNmParentDirs = []; // Those directories under which a node_module symlink was previously created
        const waitingTasks = [];
        for (const pkgName of pkgSet) {
            const pkgDir = allPackages.get(pkgName).realPath;
            const proj = projList.find(proj => { var _a; return (_a = projPkgMap.get(proj)) === null || _a === void 0 ? void 0 : _a.has(pkgName); });
            if (proj == null) {
                o.ft.onNotifiableError(`Source package ${pkgName} does not belong to any project`).dp(m);
                continue;
            }
            const noModuleSymlinkDirs = (_a = repoNoModuleSymlinkDirTable.snapshot.get(proj)) === null || _a === void 0 ? void 0 : _a[2];
            if (createdNmParentDirs.some(dir => pkgDir.startsWith(dir)) ||
                (noModuleSymlinkDirs === null || noModuleSymlinkDirs === void 0 ? void 0 : noModuleSymlinkDirs.some(dirWithSlashSuffix => pkgDir.startsWith(dirWithSlashSuffix)))) {
                // current package is in child directory of which previously "node_module" symlink was created in
                // so that Node can resolve to the created symlink from current package, so skip creating symlinks to node_modules
                continue;
            }
            const projDir = node_path_1.default.resolve(rootDir, proj);
            const relPathElements = node_path_1.default.relative(projDir, pkgDir).split(/[\\/]/);
            // Up from "project directory" down to the "package directory", looking for a directory which is for creating a "node_modules" symlink in
            let foundPerfectDir = false;
            for (let i = 1, l = relPathElements.length; i <= l; i++) {
                const nmDir = node_path_1.default.join(projDir, ...relPathElements.slice(0, i), 'node_modules');
                try {
                    const nmStat = await node_fs_1.default.promises.lstat(nmDir);
                    if (nmStat.isDirectory()) {
                        if (spaceNodeModulesDir === nmDir) {
                            foundPerfectDir = true;
                        }
                        continue;
                    }
                    else if (nmStat.isSymbolicLink()) {
                        createdNmParentDirs.push(node_path_1.default.dirname(nmDir) + node_path_1.default.sep);
                        void rx.firstValueFrom(o.ft.createOrChangeSymlink(spaceNodeModulesDir, nmDir).do(o.pt.didSymlinkCreation));
                        foundPerfectDir = true;
                        break;
                    }
                }
                catch (e) {
                    waitingTasks.push(o.ft.createOrChangeSymlink(spaceNodeModulesDir, nmDir)
                        .do(o.pt.didSymlinkCreation).pipe(rx.take(1), rx.catchError(() => rx.of(false)), rx.map(() => nmDir)));
                    createdNmParentDirs.push(node_path_1.default.dirname(nmDir) + node_path_1.default.sep);
                    foundPerfectDir = true;
                    break;
                }
            }
            if (!foundPerfectDir) {
                o.ft.onNotifiableError(`Can not create a symlink of ${node_path_1.default.join(key, 'node_modules')} for package ${pkgDir}, please check whether the directory of package is in a proper location`).dp(m);
            }
        }
        return await rx.firstValueFrom(rx.merge(...waitingTasks).pipe(rx.reduce((addup, item) => {
            addup.push(item);
            return addup;
        }, []), 
        // eslint-disable-next-line no-console
        (0, reactivizer_1.timeoutLog)(5000, () => console.log('Slow completion of updateCurrentSpace waitingTasks')), rx.map(links => [createdNmParentDirs, links])));
    }).pipe(service.labelError('updateCurrentSpace -> createOrChangeSymlink, didSwitchSpace, [create/update symlinks of space node_modules]')),
    // write tsconfig.json to all repo
    rx.merge(outputTable.l.installedDrcp.pipe(rx.map(a => [a, true])), outputTable.l.linkedDrcp.pipe(rx.map(a => [a, false]))).pipe(rx.filter(([[, pkgInfo]]) => pkgInfo != null), rx.take(1), rx.mergeMap(([[, plinkPkg], isInstalled]) => {
        return (0, package_mgr2_utils_1.createTsConfigForRepos)(plinkPkg.realPath, !isInstalled, node_path_1.default.resolve(rootDir, key), [...projPkgMap.keys()], rootDir, allPackages, [...spaceDependencyMap.get(key).values()], {});
    }), rx.mergeMap(([tsConfigFile, json]) => o.ft.writeFile(tsConfigFile, JSON.stringify(json, null, '  '))
        .do(o.pt.didWriteFile).pipe(rx.take(1))), rx.count())
]).pipe(rx.tap(([[createdNmParentDirs, links], fileWrittenCount]) => o.ft.didSwitchSpace(key, createdNmParentDirs, links, fileWrittenCount).dp(m))))));
r('onProjectLinked, onDirLinked, rootPackageJson -> didScanSource', rx.from(import('../recipe-manager.js')).pipe(rx.mergeMap(rm => i.pt.updateBegin.pipe(rx.mergeMap(([m]) => outputTable.l.rootDir.pipe(rx.map(([, rootDir]) => [m, rootDir]))), rx.switchMap(([m, rootDir]) => rx.forkJoin([
    o.pt.onProjectLinked.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m), rx.takeUntil(i.pt.updateEnd.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m))), rx.reduce((arr, [, dir]) => {
        arr.push(node_path_1.default.resolve(rootDir, dir));
        return arr;
    }, []), rx.map(dirs => {
        rm.setProjectList(dirs);
        return true;
    })),
    o.pt.onDirLinked.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m), rx.takeUntil(i.pt.updateEnd.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m))), rx.reduce((arr, [, dirPattern]) => {
        arr.push(dirPattern);
        return arr;
    }, []), rx.map(dirs => {
        rm.setLinkPatterns(dirs);
        return true;
    })),
    rx.of(m)
]).pipe(rx.mergeMap(([, , m]) => {
    // const packageToBeDeleted = new Set<string>(allPackages.keys());
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
})))))));
r('onProjectLinked -> repoPkgJson, repoNoModuleSymlinkDirs', o.pt.onProjectLinked.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(async ([[m, dir], [, rootDir]]) => {
    var _a, _b;
    const projDir = node_path_1.default.resolve(rootDir, dir);
    const jsonFile = node_path_1.default.resolve(projDir, 'package.json');
    if (!node_fs_1.default.existsSync(jsonFile))
        return;
    const content = await node_fs_1.default.promises.readFile(jsonFile, 'utf8');
    const json = JSON.parse(content);
    o.ft.repoPkgJson(projDir, json).dp(m);
    const noModuleSymlinkDirs = ((_b = (_a = json.plink) === null || _a === void 0 ? void 0 : _a.noModuleSymlink) !== null && _b !== void 0 ? _b : []).map(dir => node_path_1.default.resolve(projDir, dir) + node_path_1.default.sep);
    o.ft.repoNoModuleSymlinkDirs(projDir, noModuleSymlinkDirs).dp(m);
})));
r('checkSpace, rootDir -> updateDependencyOfSpace, didCheckSpace', o.pt.checkSpace.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.filter(([, dir]) => dir != null), rx.take(1), rx.map(b => [a, b]))), rx.concatMap(async ([[mOfCheckSpace, spaceKey], [, rootDir]]) => {
    // const spaceKey = Path.relative(rootDir, Path.resolve(rootDir, spaceDir));
    const spacePkgJsonFile = node_path_1.default.resolve(rootDir, spaceKey, 'package.json');
    const content = await node_fs_1.default.promises.readFile(spacePkgJsonFile, 'utf8');
    const json = JSON.parse(content);
    i.ft.updateDependencyOfSpace(spaceKey, (json.dependencies ? Object.keys(json.dependencies) : []).concat(json.devDependencies ? Object.keys(json.devDependencies) : [])).dp(mOfCheckSpace.r);
    o.ft.didCheckSpace(json).dp(mOfCheckSpace);
})));
r('deletePackageOfSpace -> didRemoveSymlink', i.pt.deletePackageOfSpace.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(([, b]) => [...a, b]), rx.take(1))), rx.mergeMap(async ([m, wsKey, pkName, rootDir]) => {
    const link = node_path_1.default.resolve(rootDir, wsKey, 'node_modules', pkName);
    try {
        await node_fs_1.default.promises.unlink(link);
        return o.ft.didRemoveSymlink(link).dp(m);
    }
    catch (e) {
        return o.ft.didRemoveSymlink(link).dp(m);
    }
})));
r('createOrChangeSymlink -> didSymlinkCreation', o.pt.createOrChangeSymlink.pipe(rx.mergeMap(([m, targetPath, linkPath]) => (0, symlinks_1.symlinkAsync)(targetPath, linkPath)
    .then(success => o.ft.didSymlinkCreation(success).dp(m))
    .catch(() => o.ft.didSymlinkCreation(false).dp(m)))));
r('writeFile -> didWriteFile', o.pt.writeFile.pipe(rx.mergeMap(([m, file, content]) => node_fs_1.default.promises.writeFile(file, content, 'utf8')
    .then(() => o.ft.didWriteFile().dp(m))
    .catch(e => service.dispatchErrorFor(e, m)))));
r('doAllSymlinks -> addPackageToSpace, createOrChangeSymlink, didSymlinkCreation, deletePackageOfSpace, didRemoveSymlink', o.pt.doAllSymlinks.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m], [, rootDir]]) => {
    // let removeSymlinkCount = 0;
    const waitObservables = [];
    for (const [spaceKey, deps] of spaceDependencyMap) {
        const spaceDir = node_path_1.default.join(rootDir, spaceKey);
        const sourcePkgOfSpace = spacePkgMap.get(spaceKey);
        for (const pkgName of sourcePkgOfSpace !== null && sourcePkgOfSpace !== void 0 ? sourcePkgOfSpace : []) {
            if (!allPackages.has(pkgName)) {
                waitObservables.push(i.ft.deletePackageOfSpace(spaceKey, pkgName).do(o.pt.didRemoveSymlink, m).pipe(rx.take(1), rx.map(() => 'd')));
            }
        }
        for (const dep of deps) {
            const pkg = allPackages.get(dep);
            const realPath = pkg ? node_path_1.default.relative(spaceDir, pkg.realPath) : null;
            if (realPath) {
                if (!(sourcePkgOfSpace === null || sourcePkgOfSpace === void 0 ? void 0 : sourcePkgOfSpace.has(dep))) {
                    i.ft.addPackageToSpace(spaceKey, dep).dp(m);
                }
                waitObservables.push(o.ft.createOrChangeSymlink(realPath, node_path_1.default.join(spaceDir, 'node_modules', dep))
                    .do(o.pt.didSymlinkCreation, m)
                    .pipe(rx.take(1), rx.map(([, success]) => success ? 'a' : ''), rx.catchError(err => rx.EMPTY)));
            }
            else {
                if (sourcePkgOfSpace === null || sourcePkgOfSpace === void 0 ? void 0 : sourcePkgOfSpace.has(dep)) {
                    i.ft.deletePackageOfSpace(spaceKey, dep).dp(m);
                    const link = node_path_1.default.join(spaceDir, 'node_modules', dep);
                    waitObservables.push(i.ft.deletePackageOfSpace(spaceKey, dep).do(o.pt.didRemoveSymlink, m).pipe(rx.take(1), rx.map(() => 'd')));
                    o.ft.didRemoveSymlink(link).dp(m);
                }
            }
        }
    }
    return rx.merge(...waitObservables).pipe(rx.reduce((statistics, res) => {
        if (res === 'a')
            statistics[0]++;
        else if (res === 'd')
            statistics[1]++;
        return statistics;
    }, [0, 0]), rx.map(([added, deleted]) => o.ft.didAllSymlinks(added, deleted).dp(m)));
})));
//# sourceMappingURL=package-mgr2.js.map