"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSwitchSpaceService = exports.INSTALLATION_JSON_FILE = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_fs_1 = tslib_1.__importDefault(require("node:fs"));
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const misc_1 = require("../utils/misc");
const package_mgr2_utils_1 = require("./package-mgr2-utils");
const package_mgr2_utils_2 = require("./package-mgr2-utils");
exports.INSTALLATION_JSON_FILE = '.plink.install.json';
const outputTableFor = ['updateCommonSrcDir'];
function createSwitchSpaceService(origService) {
    const service = origService;
    service.config({
        debugExcludeTypes: ['doingSwitchSpace']
    });
    service.ot.addActions(...outputTableFor);
    const repoNoModuleSymlinkDirTable = service.o.createDataTable('repoNoModuleSymlinkDirs', ([, projKey]) => projKey);
    const npmInstallSpacePkgJsonTable = service.o.createDataTable('didCheckSpace', ([, key]) => key);
    const typeRootPackagesTable = service.o.createDataTable('didUpdateTypeRootPackages', ([, key]) => key);
    const { i, o, r, ot } = service;
    // 1. create symlinks to <install-space>/node_moodules
    r('doingSwitchSpace -> didCreatingSymlinksToInstallDir', i.pt.doingSwitchSpace.pipe(rx.mergeMap(([m, rootDir, key, pkgSet, projPkgMap, allPackages]) => rx.defer(async () => {
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
        return { createdNmParentDirs, waitingTasks };
    }).pipe(
    // eslint-disable-next-line no-console
    (0, reactivizer_1.timeoutLog)(5000, () => console.log('Slow emission of switchToSpace waitingTasks')), rx.mergeMap(({ createdNmParentDirs, waitingTasks }) => rx.merge(...waitingTasks).pipe(rx.reduce((addup, item) => {
        addup.push(item);
        return addup;
    }, []), 
    // eslint-disable-next-line no-console
    (0, reactivizer_1.timeoutLog)(5000, () => console.log('Slow completion of switchToSpace waitingTasks')), rx.map(links => o.ft.didCreatingSymlinksToInstallDir(createdNmParentDirs, links).re(m).dp())))))));
    // 2. create "worksapce" symlinks under "npm install" directory
    r('doingSwitchSpace -> didCreatingWorkspaceSymlinks', i.pt.doingSwitchSpace.pipe(rx.mergeMap(([m, rootDir, key, pkgSet, , allPackages]) => rx.from(pkgSet).pipe(rx.mergeMap(async (pkgName, idx) => {
        var _a;
        if (idx === 0) {
            try {
                await node_fs_1.default.promises.mkdir(node_path_1.default.resolve(rootDir, key, 'workspaces'));
            }
            catch (e) { /* empty */ }
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
    }), rx.reduce((acc, it) => {
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
        await rx.firstValueFrom(o.ft.writeFile(node_path_1.default.resolve(rootDir, key, exports.INSTALLATION_JSON_FILE), JSON.stringify(toWrite, null, '  '))
            .do(o.pt.didWriteFile, m));
        o.ft.didCreatingWorkspaceSymlinks(workspaces.length).re(m).dp();
    }), service.labelError('Creating NPM workspace in ' + node_path_1.default.resolve(rootDir, key))))));
    r('data_projPkgMap -> updateCommonSrcDir', i.pt.updatePackagesEnd.pipe(rx.switchMap(() => ot.l.data_projPkgMap.pipe(rx.take(1))), rx.map(([, projSrcMap]) => {
        const srcRootDir = (0, misc_1.closestCommonParentDir)(projSrcMap.keys());
        o.ft.updateCommonSrcDir(srcRootDir).dp();
    })));
    const tsConfigData$ = rx.combineLatest([
        ot.l.data_allPackages,
        ot.l.data_spaceDependencyMap,
        ot.l.data_projPkgMap,
        ot.l.rootDir,
        ot.l.updateCommonSrcDir,
        rx.merge(ot.l.installedDrcp.pipe(rx.map(a => [a, true])), ot.l.linkedDrcp.pipe(rx.map(a => [a, false]))).pipe(rx.filter(([[, pkgInfo]]) => pkgInfo != null), rx.take(1), rx.map(([[, plinkPkg], isInstalled]) => [plinkPkg, isInstalled]))
        // eslint-disable-next-line no-console
    ]).pipe(rx.take(1), (0, reactivizer_1.timeoutLog)(5000, () => console.log('Fetching latest TS config data timeout')));
    // 3. write tsconfig.json to all repo
    r('didRunInstall -> didWriteTsConfigFiles, updateTypeRootPackages', o.pt.didRunInstall.pipe(rx.mergeMap(([m, spaceKey]) => rx.combineLatest([
        o.ft.updateTypeRootPackages(spaceKey).re(m).od(o.pt.didUpdateTypeRootPackages),
        tsConfigData$
    ]).pipe(rx.take(1), rx.map(([a, b]) => [a, ...b]), rx.mergeMap(([[, , typeRootPkgs], [, allPackages], [, _spaceDependencyMap], [, projPkgMap], [, rootDir], [, commonSrcDir], [plinkPkg, isInstalled]]) => {
        return (0, package_mgr2_utils_1.createTsConfigForRepos)(plinkPkg.realPath, !isInstalled, node_path_1.default.resolve(rootDir, spaceKey), [...projPkgMap.keys()], rootDir, commonSrcDir, allPackages, typeRootPkgs.values(), {}, [...allPackages.values()].map(pkg => pkg.realPath));
    }), rx.mergeMap(([file, json]) => {
        return node_fs_1.default.promises.writeFile(file, JSON.stringify(json, null, '  '), 'utf8');
    }), rx.count(), rx.tap(count => o.ft.didWriteTsConfigFiles(count).dp(m))))));
    r('updateTypeRootPackages -> didUpdateTypeRootPackages', o.pt.updateTypeRootPackages.pipe(rx.mergeMap(a => rx.combineLatest([ot.l.data_allPackages, ot.l.data_spaceDependencyMap, ot.l.rootDir]).pipe(rx.map(b => [a, ...b]), rx.take(1))), rx.concatMap(([[m, spaceKey], [, allPackages], [, spaceDependencyMap], [, rootDir]]) => {
        const deps = spaceDependencyMap.get(spaceKey);
        // eslint-disable-next-line multiline-ternary
        return (deps ? rx.of(deps) : rx.merge(ot.l.data_spaceDependencyMap.pipe(rx.filter(([, depMap]) => depMap.has(spaceKey)), rx.map(([, map]) => map.get(spaceKey))), new rx.Observable(sub => {
            o.ft.checkSpace(spaceKey).dp(m);
            sub.complete();
        }))).pipe(rx.take(1), rx.map(deps => {
            var _a, _b;
            const typeRootPkgs = new Map();
            for (const dep of deps) {
                if (dep.startsWith('@wfh/')) {
                    if (allPackages.has(dep)) {
                        const pkgInfo = allPackages.get(dep);
                        if ((_a = pkgInfo.json.plink) === null || _a === void 0 ? void 0 : _a.typeRoot)
                            typeRootPkgs.set(dep, pkgInfo);
                    }
                    else {
                        const jsonFile = node_path_1.default.resolve(rootDir, spaceKey, 'node_modules', dep, 'package.json');
                        const pkgInfo = (0, package_mgr2_utils_2.createPackageInfo)(jsonFile, true);
                        if ((_b = pkgInfo.json.plink) === null || _b === void 0 ? void 0 : _b.typeRoot)
                            typeRootPkgs.set(dep, pkgInfo);
                    }
                }
            }
            o.ft.didUpdateTypeRootPackages(spaceKey, typeRootPkgs).dp(m);
        }));
    })));
    r('createArbitraryTsConfig -> didArbitraryTsConfig', i.pt.createArbitraryTsConfig.pipe(rx.mergeMap(([m, spaceKey, tsconfigDir]) => {
        const typeRootPackages = typeRootPackagesTable.snapshot.get(spaceKey);
        const typeRootPackages$ = typeRootPackages ?
            rx.of(typeRootPackages) :
            o.ft.updateTypeRootPackages(spaceKey).re(m).od(o.pt.didUpdateTypeRootPackages).pipe(rx.take(1));
        return rx.combineLatest([
            typeRootPackages$,
            ot.l.data_allPackages,
            ot.l.data_spacePkgMap.pipe(rx.map(([, map]) => map.get(spaceKey)), rx.filter((spacePkgSet) => spacePkgSet != null)),
            ot.l.rootDir,
            ot.l.updateCommonSrcDir,
            rx.merge(ot.l.installedDrcp.pipe(rx.map(a => [a, true])), ot.l.linkedDrcp.pipe(rx.map(a => [a, false]))).pipe(rx.filter(([[, pkgInfo]]) => pkgInfo != null), rx.take(1), rx.map(([[, plinkPkg], isInstalled]) => [plinkPkg, isInstalled]))
        ]).pipe(rx.take(1), rx.map(([[, , typeRootPkgMap], [, allPackages], spacePkgSet, [, rootDir], [, commonSrcDir], [plinkPkg, isInstalled]]) => {
            const baseTsConfigFile = node_path_1.default.resolve(plinkPkg.realPath, 'wfh/tsconfig-base.json');
            const srcPkgMap = new Map();
            for (const [name, pkg] of allPackages) {
                if (spacePkgSet.has(name))
                    srcPkgMap.set(name, pkg);
            }
            const json = (0, package_mgr2_utils_1.createTsConfigFile)(tsconfigDir, baseTsConfigFile, plinkPkg.realPath, !isInstalled, node_path_1.default.resolve(rootDir, spaceKey), rootDir, srcPkgMap, commonSrcDir, typeRootPkgMap.values(), {}, ['nothing.ts']);
            o.ft.didArbitraryTsConfig(spaceKey, json).dp(m);
        }));
    })));
    return service;
}
exports.createSwitchSpaceService = createSwitchSpaceService;
//# sourceMappingURL=package-mgr2-switch.js.map