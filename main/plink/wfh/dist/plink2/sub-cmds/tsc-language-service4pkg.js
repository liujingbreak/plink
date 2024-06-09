"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addOnPackageFeatures = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const rx = tslib_1.__importStar(require("rxjs"));
const glob_1 = tslib_1.__importDefault(require("glob"));
const reactivizer_1 = require("@wfh/reactivizer");
const package_mgr2_utils_1 = require("../../package-mgr/package-mgr2-utils");
const tsc_language_service_1 = require("./tsc-language-service");
const newTableActions = ['onTscDirsConfig'];
function addOnPackageFeatures(baseService, pkgMgr, lookupService) {
    const s = baseService.s.forkController();
    const table = baseService.table.addActions('onTscDirsConfig');
    const { r } = baseService;
    const ft = s.ft;
    // const lookupService = createPlinkPackageLookupService();
    lookupService.input.fromPackageService(pkgMgr).dp();
    const packageToTscDirMap = new Map();
    s.interceptor$.next(a$ => {
        const dispenser = new reactivizer_1.ActionDispenser(a$);
        return rx.merge(dispenser.ofType('emitFile').pipe(rx.mergeMap(a => rx.concat(table.l.onTscDirsConfig.pipe(rx.take(1), rx.ignoreElements()), pkgMgr.ot.l.data_allPackages).pipe(rx.map(b => [a, b]))), rx.mergeMap(([action, [, allPackages]]) => {
            const { p: [emittedFile] } = action;
            const file = emittedFile.replace(/[\\/]/g, path_1.default.sep);
            return lookupService.input.lookupPackage(file).od(lookupService.output.lookupPackageResolved).pipe(rx.take(1), rx.map(([, pkgName]) => {
                if (pkgName) {
                    const tscConfig = packageToTscDirMap.get(pkgName);
                    if (tscConfig) {
                        const { isom, srcRoots, dest } = tscConfig;
                        const pkgPath = allPackages.get(pkgName).realPath;
                        const srcDir = srcRoots.find(src => file.startsWith(path_1.default.resolve(pkgPath, src) + path_1.default.sep));
                        if (srcDir) {
                            const absSrcDir = path_1.default.resolve(pkgPath, srcDir) + path_1.default.sep;
                            const relativePath = file.slice(absSrcDir.length);
                            action.p[0] = path_1.default.resolve(pkgPath, dest, relativePath);
                            return action;
                        }
                        else if (isom) {
                            const absIsomDir = path_1.default.resolve(pkgPath, isom) + path_1.default.sep;
                            if (file.startsWith(absIsomDir)) {
                                const relativePath = file.slice(absIsomDir.length);
                                action.p[0] = path_1.default.resolve(pkgPath, 'isom', relativePath);
                                return action;
                            }
                        }
                    }
                    // console.log('intercept', file, pkgName, tscConfig);
                    ft.log(tsc_language_service_1.LogLevel.log, `Source file ${file} is not under any of package's source directroies`).dp(action);
                    return action;
                }
                else {
                    ft.log(tsc_language_service_1.LogLevel.log, `Source file ${file} does not belong to any package`).dp(action);
                    return null;
                }
            }));
        }), rx.filter((a) => a != null)), dispenser.ofOtherTypes());
    });
    r('data_allPackages, updatePackagesEnd -> "packageToTscDirMap", onTscDirsConfig', 
    // pkgMgr.ot.l.data_allPackages.pipe(rx.take(1)),
    pkgMgr.i.pt.updatePackagesEnd.pipe(rx.switchMap(() => pkgMgr.ot.l.data_allPackages.pipe(rx.take(1)))).pipe(rx.switchMap(([m, data]) => {
        packageToTscDirMap.clear();
        return rx.from(data.values()).pipe(rx.mergeMap(pkgInfo => {
            const tscCfg = (0, package_mgr2_utils_1.getTscConfigOfPkg)(pkgInfo.json);
            const normalSrcRoots = [tscCfg.srcDir];
            const includeDirs = tscCfg.include;
            if (includeDirs) {
                normalSrcRoots.push(...includeDirs.map(includeDir => {
                    const wildcardPos = includeDir.indexOf('/*');
                    if (wildcardPos >= 0)
                        return includeDir.slice(0, wildcardPos);
                    else
                        return includeDir;
                }));
            }
            const result = { srcRoots: [], dest: tscCfg.destDir };
            return rx.merge(rx.from(normalSrcRoots).pipe(rx.mergeMap(srcRootDir => fs_1.default.promises.access(path_1.default.resolve(pkgInfo.realPath, srcRootDir))
                .then(() => result.srcRoots.push(srcRootDir)).catch(() => { }))), tscCfg.isomDir ?
                fs_1.default.promises.access(path_1.default.resolve(pkgInfo.realPath, tscCfg.isomDir))
                    .then(() => result.isom = tscCfg.isomDir).catch(() => { }) :
                rx.EMPTY).pipe(rx.finalize(() => {
                packageToTscDirMap.set(pkgInfo.name, result);
            }));
        }), rx.finalize(() => {
            ft.onTscDirsConfig(packageToTscDirMap).dp(m);
        }));
    })));
    r('addSourcePackage -> addSourceFile, didAddSourcePackage', s.pt.addSourcePackage.pipe(rx.mergeMap(([m, pkgNames]) => {
        const dir$ = fetchPackageSourceDirectories(pkgNames);
        const compileFile$ = new rx.Subject();
        const emitFile$ = new rx.Subject();
        const allDone$ = new rx.Subject();
        const onSuggest$ = new rx.Subject();
        const onFail$ = new rx.Subject();
        const splitCompileFileEvents$ = dir$.pipe(rx.mergeMap(dir => {
            return new rx.Observable(sink => {
                (0, glob_1.default)(dir + '/**/*.?([cm])ts', (err, files) => {
                    if (err) {
                        ft.log(tsc_language_service_1.LogLevel.error, err.stack).dp();
                        sink.error(err);
                    }
                    else {
                        for (const file of files) {
                            if (!file.endsWith('.d.ts')) {
                                const [compileFile$, emitFile$] = ft.addSourceFile(file, false).re(m).od(s.pt.compileFile, s.pt.emitFile);
                                sink.next([
                                    compileFile$.pipe(rx.take(1)),
                                    emitFile$
                                ]);
                            }
                        }
                        sink.complete();
                    }
                });
            });
        }), rx.mergeMap(([compileFiles, emitFiles]) => {
            emitFiles.subscribe(a => emitFile$.next(a));
            // compileFiles will complete, but emitFiles is infinite, so only merge complileFiles to main stream to make sure main stream can complete at last
            return compileFiles.pipe(rx.map(action => compileFile$.next(action)));
        }), rx.finalize(() => compileFile$.complete()), rx.ignoreElements());
        return rx.merge(rx.zip(compileFile$.pipe(rx.count()), emitFile$.pipe(rx.takeUntil(allDone$), rx.reduce((arr, [, file]) => {
            arr.push(file);
            return arr;
        }, [])), onSuggest$.pipe(rx.reduce((arr, [, ...payload]) => {
            arr.push(payload);
            return arr;
        }, [])), onFail$.pipe(rx.reduce((arr, [, ...payload]) => {
            arr.push(payload);
            return arr;
        }, []))), compileFile$.pipe(rx.mergeMap(([m]) => {
            const done$ = s.pt.didCompileFile.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.share());
            return rx.merge(s.pt.onSuggest.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.map(p => onSuggest$.next(p))), s.pt.onEmitFailure.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.map(p => onFail$.next(p)))).pipe(rx.takeUntil(done$));
        }), rx.ignoreElements(), rx.finalize(() => {
            allDone$.next();
            onSuggest$.complete();
            onFail$.complete();
        })), splitCompileFileEvents$).pipe(rx.map(([countFiles, emitFiles, suggests, fails]) => {
            ft.didAddSourcePackage(countFiles, emitFiles, suggests, fails).dp(m);
        }), rx.take(1));
    })));
    r('watchSourcePackage -> watch', s.pt.watchSourcePackage.pipe(rx.mergeMap(([m, pkgNames]) => {
        const dir$ = fetchPackageSourceDirectories(pkgNames);
        return dir$.pipe(rx.reduce((arr, it) => {
            arr.push(it);
            return arr;
        }, []), rx.map(dirs => {
            ft.watch(dirs).dp(m);
        }));
    })));
    r('setTsConfigOfPlinkBase -> ', s.pt.setTsConfigOfPlinkBase.pipe(rx.mergeMap(a => pkgMgr.ot.l.updateCommonSrcDir.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(async ([[m], [, commonSrcDir]]) => {
        const file = path_1.default.resolve(__dirname, '../../../tsconfig-base.json');
        const dir = path_1.default.dirname(file);
        const baseTsConfig = await fs_1.default.promises.readFile(file, 'utf8');
        const json = JSON.parse(baseTsConfig);
        json.compilerOptions.declaration = true;
        json.compilerOptions.importHelpers = true;
        json.compilerOptions.rootDir = commonSrcDir;
        json.compilerOptions.outDir = commonSrcDir; // Path.relative(process.cwd(), dir).replace(/\\/g, '/');
        json.compilerOptions.inlineSourceMap = false;
        json.compilerOptions.sourceMap = true;
        ft.setTsConfig(json, dir).dp(m);
    })));
    function fetchPackageSourceDirectories(pkgNames) {
        return pkgMgr.ot.l.data_allPackages.pipe(
        // eslint-disable-next-line no-console
        rx.take(1), rx.mergeMap(([, allPackages]) => {
            return pkgNames.map(pkgName => [pkgName, allPackages.get(pkgName)]);
        }), rx.mergeMap(([pkgName, pkgInfo]) => {
            var _a;
            if (pkgInfo == null) {
                // baseService.dispatchErrorFor(`Source directory of ${pkgName} is not found`, m);
                ft.log(tsc_language_service_1.LogLevel.error, `Source directory of ${pkgName} is not found`).dp();
                return rx.EMPTY;
            }
            const tscCfg = (0, package_mgr2_utils_1.getTscConfigOfPkg)(pkgInfo.json);
            return rx.merge(rx.from((_a = tscCfg.include) !== null && _a !== void 0 ? _a : []), rx.of(path_1.default.resolve(pkgInfo.realPath, tscCfg.srcDir), path_1.default.resolve(pkgInfo.realPath, tscCfg.isomDir)));
        }), rx.mergeMap(dir => fs_1.default.promises.access(dir).then(() => dir).catch(() => null)), rx.filter((dir) => dir != null));
    }
    return baseService;
}
exports.addOnPackageFeatures = addOnPackageFeatures;
//# sourceMappingURL=tsc-language-service4pkg.js.map