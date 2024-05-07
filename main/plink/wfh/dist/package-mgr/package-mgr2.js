"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackageMgrService = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
// import * as chr from 'node:child_process';
const util_1 = tslib_1.__importDefault(require("util"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const symlinks_1 = require("../utils/symlinks");
const misc_1 = require("../utils/misc");
const package_mgr2_model_1 = require("./package-mgr2-model");
const package_mgr2_utils_1 = require("./package-mgr2-utils");
const inputTableFor = ['scan'];
const outputTableFor = ['rootPackageJson', 'rootDir', 'linkedDrcp', 'installedDrcp'];
function createPackageMgrService() {
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
    const { service } = (0, package_mgr2_model_1.createStoreService)(packagesService);
    const { i, o, r, outputTable } = service;
    const repoNoModuleSymlinkDirTable = service.o.createDataTable('repoNoModuleSymlinkDirs', ([, projKey]) => projKey);
    const npmInstallSpacePkgJsonTable = service.o.createDataTable('didCheckSpace', ([, key]) => key);
    if (misc_1.plinkEnv.isDrcpSymlink) {
        o.ft.linkedDrcp((0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(misc_1.plinkEnv.plinkDir, 'package.json'))).dp();
        o.ft.installedDrcp(null).dp();
    }
    else {
        o.ft.linkedDrcp(null).dp();
        o.ft.installedDrcp((0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(misc_1.plinkEnv.plinkDir, 'package.json'))).dp();
    }
    r('scan, didScanSource, didAllSymlinks -> rootDir, onProjectLinked, onDirLinked, rootPackageJson', i.pt.scan.pipe(rx.concatMap(async ([m, rootDir]) => {
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
            // await rx.firstValueFrom(o.ft.doSymlinksOfSrcPkg().ddo(o.pt.didAllSymlinks));
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
    // r('onProjectLinked -> repoPkgJson, repoNoModuleSymlinkDirs', o.pt.onProjectLinked.pipe(
    //   rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    //   rx.mergeMap(async ([[m, dir], [, rootDir]]) => {
    //     const projDir = Path.resolve(rootDir, dir);
    //     const jsonFile = Path.resolve(projDir, 'package.json');
    //     if (!fs.existsSync(jsonFile))
    //       return;
    //     const content = await fs.promises.readFile(jsonFile, 'utf8');
    //     const json = JSON.parse(content) as RepoPackageJson;
    //     o.ft.repoPkgJson(projDir, json).dp(m);
    //     const noModuleSymlinkDirs = (json.plink?.noModuleSymlink ?? []).map(dir => Path.resolve(projDir, dir) + Path.sep);
    //     o.ft.repoNoModuleSymlinkDirs(projDir, noModuleSymlinkDirs).dp(m);
    //   })
    // ));
    const onSpaceDependencyChanged$ = rx.concat(outputTable.l.data_spaceDependencyMap.pipe(rx.take(1)), i.pt.updateDependencyOfSpace.pipe(rx.mergeMap(([m]) => outputTable.l.data_spaceDependencyMap.pipe(rx.take(1), rx.map(([, ...a]) => [m, ...a])))));
    r('didScanSource, data_allPackages, updateDependencyOfSpace, data_spaceDependencyMap -> addPackageToSpace, deletePackageOfSpace, didSyncSpacePackages', rx.combineLatest([
        o.pt.didScanSource.pipe(rx.mergeMap(() => outputTable.l.data_allPackages.pipe(rx.take(1)))),
        onSpaceDependencyChanged$,
        outputTable.l.data_spacePkgMap
    ]).pipe(rx.map(([[, allPackages], [m, spaceDependencyMap], [, spacePkgMap]]) => {
        for (const [spaceKey, depSet] of spaceDependencyMap.entries()) {
            let spacePkgSet = spacePkgMap.get(spaceKey);
            if (spacePkgSet == null) {
                spacePkgSet = new Set();
            }
            for (const dep of depSet) {
                if (!spacePkgSet.has(dep) && allPackages.has(dep))
                    i.ft.addPackageToSpace(spaceKey, dep).dp(m.r);
            }
        }
        for (const [spaceKey, pkgSet] of spacePkgMap.entries()) {
            let depSet = spaceDependencyMap.get(spaceKey);
            if (depSet == null)
                depSet = new Set();
            for (const pkgName of [...pkgSet]) {
                if (!depSet.has(pkgName) || !allPackages.has(pkgName))
                    i.ft.deletePackageOfSpace(spaceKey, pkgName).dp(m.r);
            }
        }
        o.ft.didSyncSpacePackages().dp(m.r);
    })));
    r('data_spaceDependencyMap, updateDependencyOfSpace -> removeSpace', onSpaceDependencyChanged$.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.map(b => [a, b]))), rx.mergeMap(([[m, spaceDependencyMap], [, rootDir]]) => {
        return rx.firstValueFrom(rx.from(spaceDependencyMap.keys()).pipe(rx.mergeMap(async (name) => {
            try {
                const stat = await node_fs_1.default.promises.stat(node_path_1.default.resolve(rootDir, name));
                if (!stat.isDirectory()) {
                    i.ft.removeSpace(name).dp(m.r);
                }
            }
            catch (e) {
                i.ft.removeSpace(name).dp(m);
            }
        })));
    })));
    r('runInstall, didCheckSpace, didSwitchSpace -> checkSpace, switchToSpace, onSpaceSynced', i.pt.runInstall.pipe(
    // rx.mergeMap(a => outputTable.l.rootDir.pipe(
    //   rx.map(([, rootDir]) => [a, rootDir] as const),
    //   rx.take(1)
    // )),
    // rx.concatMap(([[m, space, npmOpts], rootDir]) => {
    //   const spaceDir = Path.resolve(rootDir, space);
    //   const spaceKey = Path.relative(rootDir, spaceDir).replace(/\\/g, '/');
    //   return o.ft.checkSpace(spaceKey).do(o.pt.didCheckSpace, m).pipe(
    //     rx.take(1),
    //     rx.mergeMap(async ([, pkgJson]) => {
    //       const toWrite = {...pkgJson};
    //       if (pkgJson.dependencies) {
    //         toWrite.dependencies = {...pkgJson.dependencies};
    //       }
    //       for (const dep of Object.keys(pkgJson.dependencies ?? {})) {
    //         if (allPackages.has(dep)) {
    //           toWrite.dependencies![dep] = Path.relative(spaceDir, allPackages.get(dep)!.realPath).replace(/\\/g, '/');
    //         }
    //       }
    //       if (pkgJson.devDependencies) {
    //         toWrite.devDependencies = {...pkgJson.devDependencies};
    //       }
    //       for (const dep of Object.keys(pkgJson.devDependencies ?? {})) {
    //         if (allPackages.has(dep)) {
    //           toWrite.devDependencies![dep] = Path.relative(spaceDir, allPackages.get(dep)!.realPath).replace(/\\/g, '/');
    //         }
    //       }
    //       const spacePkgJsonFile = Path.resolve(spaceDir, 'package.json');
    //       const backup = Path.resolve(spaceDir, 'package.lock.json');
    //       await fs.promises.rename(spacePkgJsonFile, backup);
    //       await rx.firstValueFrom(o.ft.writeFile(spacePkgJsonFile, JSON.stringify(toWrite, null, '  '))
    //         .ddo(o.pt.didWriteFile, m));
    //       await new Promise(resolve => setImmediate(resolve));
    //       const spawnOpt: chr.SpawnOptions = {
    //         cwd: spaceDir,
    //         windowsHide: true,
    //         stdio: 'inherit',
    //         env: {...process.env}
    //       };
    //       delete spawnOpt.env?.NODE_ENV;
    //       if (process.platform === 'win32') {
    //         spawnOpt.shell = true;
    //       }
    //       try {
    //         let cp = chr.spawn('npm', ['install'], spawnOpt);
    //         await new Promise<[number | null, NodeJS.Signals | null]>((resolve, rej) => {
    //           cp.on('exit', (code, sigal) => resolve([code, sigal] as const));
    //           cp.on('error', rej);
    //         });
    //         if (npmOpts?.dedupe) {
    //           cp = chr.spawn('npm', ['dedupe'], spawnOpt);
    //           await new Promise<[number | null, NodeJS.Signals | null]>((resolve, rej) => {
    //             cp.on('exit', (code, sigal) => resolve([code, sigal] as const));
    //             cp.on('error', rej);
    //           });
    //         }
    //       } catch (err) {
    //         console.error(err);
    //       } finally {
    //         const actualInstallJson = Path.resolve(spaceDir, 'install.package.json');
    //         if (fs.existsSync(actualInstallJson)) {
    //           await fs.promises.unlink(actualInstallJson);
    //         }
    //         await fs.promises.rename(spacePkgJsonFile, actualInstallJson);
    //         void fs.promises.rename(backup, spacePkgJsonFile);
    //       }
    //     }),
    //     rx.mergeMap(() => {
    //       return i.ft.switchToSpace(spaceKey)
    //         .do(o.pt.didSwitchSpace, m).pipe(
    //           rx.take(1)
    //         );
    //     }),
    //     rx.finalize(() => o.ft.onSpaceSynced(spaceKey).dp(m))
    //   );
    // })
    ));
    // Create "workspace" symlinks, create node_module symlink, generate actual package.json for "npm install"
    r('switchToSpace, didSyncSpacePackages -> checkSpace, createOrChangeSymlink, didSwitchSpace, writeFile', i.pt.switchToSpace.pipe(rx.filter(([, key]) => key != null), rx.distinctUntilChanged(), rx.concatMap(([m, spaceKey]) => {
        return o.ft.checkSpace(spaceKey).ddo(o.pt.didSyncSpacePackages).pipe(rx.mergeMap(() => o.pt.data_spacePkgMap), rx.take(1), rx.map(([, spacePkgMap]) => [m, spaceKey, spacePkgMap.get(spaceKey)]));
    }), rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.combineLatestWith(outputTable.l.data_projPkgMap, outputTable.l.data_allPackages), rx.map(([[, rootDir], [, projPkgMap], [, allPackages]]) => [...a, rootDir, projPkgMap, allPackages]), rx.take(1))), rx.mergeMap(([m, key, pkgSet, rootDir, projPkgMap, allPackages]) => rx.forkJoin([
        // 1. create symlinks to <install-space>/node_moodules
        rx.defer(async () => {
            var _a;
            const spaceNodeModulesDir = node_path_1.default.resolve(rootDir, key, 'node_modules');
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
            (0, reactivizer_1.timeoutLog)(5000, () => console.log('Slow completion of switchToSpace waitingTasks')), rx.map(links => [createdNmParentDirs, links])));
        }).pipe(service.labelError('switchToSpace -> createOrChangeSymlink, didSwitchSpace, [create/update symlinks of space node_modules]')),
        // 2. create "worksapce" symlinks under "npm install" directory
        rx.from(pkgSet !== null && pkgSet !== void 0 ? pkgSet : []).pipe(rx.mergeMap(async (pkgName, idx) => {
            var _a;
            if (idx === 0) {
                await node_fs_1.default.promises.mkdir(node_path_1.default.resolve(rootDir, key, 'workspaces'));
            }
            const fakeNpmWorkspace = node_path_1.default.resolve(rootDir, key, 'workspaces', pkgName);
            const realPath = (_a = allPackages.get(pkgName)) === null || _a === void 0 ? void 0 : _a.realPath;
            if (realPath) {
                await rx.firstValueFrom(o.ft.createOrChangeSymlink(realPath, fakeNpmWorkspace)
                    .ddo(o.pt.didSymlinkCreation, m));
                return 'workspaces/' + pkgName;
            }
            else {
                o.ft.onNotifiableError(`Unknown error, create not create "NPM workspace" for package ${pkgName}, package is missing`);
                return null;
            }
        }), rx.scan((acc, it) => {
            if (it)
                acc.push(it);
            return acc;
        }, []), rx.mergeMap(a => npmInstallSpacePkgJsonTable.getPayloadStreamOfKey(key).pipe(rx.take(1), rx.map(b => [a, b]))), rx.mergeMap(async ([workspaces, [, , json]]) => {
            var _a;
            const toWrite = Object.assign({}, json);
            toWrite.workspaces = ((_a = toWrite.workspaces) !== null && _a !== void 0 ? _a : []).concat(workspaces);
            if (json.dependencies) {
                toWrite.dependencies = {};
                for (const [k, v] of Object.entries(json.dependencies)) {
                    if (!(pkgSet === null || pkgSet === void 0 ? void 0 : pkgSet.has(k)))
                        toWrite.dependencies[k] = v;
                }
            }
            if (json.devDependencies) {
                toWrite.devDependencies = {};
                for (const [k, v] of Object.entries(json.devDependencies)) {
                    if (!(pkgSet === null || pkgSet === void 0 ? void 0 : pkgSet.has(k)))
                        toWrite.devDependencies[k] = v;
                }
            }
            await rx.firstValueFrom(o.ft.writeFile(node_path_1.default.resolve(rootDir, key, '.plink.install.json'), JSON.stringify(toWrite, null, '  '))
                .do(o.pt.didWriteFile, m));
            return workspaces.length;
        }), service.labelError('Creating NPM workspace in ' + node_path_1.default.resolve(rootDir, key))),
        // 3. write tsconfig.json to all repo
        rx.merge(outputTable.l.installedDrcp.pipe(rx.map(a => [a, true])), outputTable.l.linkedDrcp.pipe(rx.map(a => [a, false]))).pipe(rx.filter(([[, pkgInfo]]) => pkgInfo != null), rx.take(1), rx.withLatestFrom(outputTable.l.data_spaceDependencyMap), rx.mergeMap(([[[, plinkPkg], isInstalled], [, spaceDependencyMap]]) => {
            return (0, package_mgr2_utils_1.createTsConfigForRepos)(plinkPkg.realPath, !isInstalled, node_path_1.default.resolve(rootDir, key), [...projPkgMap.keys()], rootDir, allPackages, [...spaceDependencyMap.get(key).values()], {});
        }), rx.mergeMap(([tsConfigFile, json]) => o.ft.writeFile(tsConfigFile, JSON.stringify(json, null, '  '))
            .do(o.pt.didWriteFile).pipe(rx.take(1))), rx.count())
    ]).pipe(rx.tap(([[createdNmParentDirs, links], workspaceCount, fileWrittenCount]) => o.ft.didSwitchSpace(key, createdNmParentDirs, links, workspaceCount, fileWrittenCount).dp(m))))));
    r('checkSpace, rootDir -> updateDependencyOfSpace, didCheckSpace', o.pt.checkSpace.pipe(rx.mergeMap(a => outputTable.l.rootDir.pipe(rx.filter(([, dir]) => dir != null), rx.take(1), rx.map(b => [a, b]))), rx.concatMap(async ([[mOfCheckSpace, spaceKey], [, rootDir]]) => {
        const spaceDir = node_path_1.default.resolve(rootDir, spaceKey);
        const spacePkgJsonFile = node_path_1.default.resolve(rootDir, spaceKey, 'package.json');
        const content = await node_fs_1.default.promises.readFile(spacePkgJsonFile, 'utf8');
        const json = JSON.parse(content);
        let workspacePkgs = [];
        if (json.workspaces) {
            workspacePkgs = await rx.firstValueFrom(rx.from(json.workspaces).pipe(rx.mergeMap(async (pkgPath) => {
                const pkgDir = node_path_1.default.resolve(spaceDir, pkgPath);
                const stat = await node_fs_1.default.promises.lstat(pkgDir);
                if (!stat.isSymbolicLink()) {
                    const pkInfo = (0, package_mgr2_utils_1.createPackageInfo)(node_path_1.default.resolve(pkgPath, 'package.json'), false);
                    return pkInfo.name;
                }
                return null;
            }), rx.reduce((all, it) => {
                if (it)
                    all.push(it);
                return all;
            }, [])));
        }
        i.ft.updateDependencyOfSpace(spaceKey, (json.dependencies ? Object.keys(json.dependencies) : []).concat(json.devDependencies ? Object.keys(json.devDependencies) : []).concat(workspacePkgs)).dp(mOfCheckSpace.r);
        o.ft.didCheckSpace(spaceKey, json).dp(mOfCheckSpace);
    })));
    // r('deletePackageOfSpace -> didRemoveSymlink', i.pt.deletePackageOfSpace.pipe(
    //   rx.mergeMap(a => outputTable.l.rootDir.pipe(
    //     rx.map(([, b]) => [...a, b] as const),
    //     rx.take(1)
    //   )),
    //   rx.mergeMap(async ([m, wsKey, pkName, rootDir]) => {
    //     const link = Path.resolve(rootDir, wsKey, 'node_modules', pkName);
    //     try {
    //       await fs.promises.unlink(link);
    //       return o.ft.didRemoveSymlink(link).dp(m);
    //     } catch (e) {
    //       return o.ft.didRemoveSymlink(link).dp(m);
    //     }
    //   })
    // ));
    r('createOrChangeSymlink -> didSymlinkCreation', o.pt.createOrChangeSymlink.pipe(rx.mergeMap(([m, targetPath, linkPath]) => (0, symlinks_1.symlinkAsync)(targetPath, linkPath)
        .then(success => o.ft.didSymlinkCreation(success).dp(m))
        .catch(() => o.ft.didSymlinkCreation(false).dp(m)))));
    r('writeFile -> didWriteFile', o.pt.writeFile.pipe(rx.mergeMap(([m, file, content]) => node_fs_1.default.promises.writeFile(file, content, 'utf8')
        .then(() => o.ft.didWriteFile().dp(m))
        .catch(e => service.dispatchErrorFor(e, m)))));
    r('doSymlinksOfSrcPkg -> addPackageToSpace, createOrChangeSymlink, didSymlinkCreation, deletePackageOfSpace, didRemoveSymlink', o.pt.doSymlinksOfSrcPkg.pipe(
    // rx.mergeMap(a => outputTable.l.rootDir.pipe(
    //   rx.map(b => [a, b] as const),
    //   rx.take(1)
    // )),
    // rx.mergeMap(([[m], [, rootDir]]) => {
    //   // let removeSymlinkCount = 0;
    //   const waitObservables = [] as rx.Observable<string>[];
    //   for (const [spaceKey, deps] of spaceDependencyMap) {
    //     const spaceDir = Path.join(rootDir, spaceKey);
    //     const sourcePkgOfSpace = spacePkgMap.get(spaceKey);
    //     for (const pkgName of sourcePkgOfSpace ?? [] as string[]) {
    //       if (!allPackages.has(pkgName)) {
    //         waitObservables.push(i.ft.deletePackageOfSpace(spaceKey, pkgName).do(o.pt.didRemoveSymlink, m).pipe(
    //           rx.take(1), rx.map(() => 'd')
    //         ));
    //       }
    //     }
    //     for (const dep of deps) {
    //       const pkg = allPackages.get(dep);
    //       const realPath = pkg ? Path.relative(spaceDir, pkg.realPath) : null;
    //       if (realPath) {
    //         if (!sourcePkgOfSpace?.has(dep)) {
    //           i.ft.addPackageToSpace(spaceKey, dep).dp(m);
    //         }
    //         waitObservables.push(o.ft.createOrChangeSymlink(realPath, Path.join(spaceDir, 'node_modules', dep))
    //           .do(o.pt.didSymlinkCreation, m)
    //           .pipe(
    //             rx.take(1),
    //             rx.map(([, success]) => success ? 'a' : ''),
    //             rx.catchError(err => rx.EMPTY)
    //           ));
    //       } else {
    //         if (sourcePkgOfSpace?.has(dep)) {
    //           i.ft.deletePackageOfSpace(spaceKey, dep).dp(m);
    //           waitObservables.push(i.ft.deletePackageOfSpace(spaceKey, dep).do(o.pt.didRemoveSymlink, m).pipe(
    //             rx.take(1), rx.map(() => 'd')
    //           ));
    //         }
    //       }
    //     }
    //   }
    //   return rx.merge(...waitObservables).pipe(
    //     rx.reduce((statistics, res) => {
    //       if (res === 'a')
    //         statistics[0]++;
    //       else if (res === 'd')
    //         statistics[1]++;
    //       return statistics;
    //     }, [0, 0] as [added: number, deleted: number]),
    //     rx.map(([added, deleted]) => o.ft.didAllSymlinks(added, deleted).dp(m))
    //   );
    // })
    ));
    return service;
}
exports.createPackageMgrService = createPackageMgrService;
//# sourceMappingURL=package-mgr2.js.map