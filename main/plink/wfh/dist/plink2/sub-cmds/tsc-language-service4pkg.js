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
function addOnPackageFeatures(baseService, pkgMgr) {
    const service = baseService;
    const { i, r, o } = service;
    const packageLookuper = new package_mgr2_utils_1.PlinkPackageLookup();
    packageLookuper.fromService(pkgMgr);
    o.interceptor$.next(a$ => {
        const dispenser = new reactivizer_1.ActionDispenser(a$, o.typePrefix);
        return pkgMgr.ot.l.data_allPackages.pipe(rx.switchMap(([, allPackages]) => rx.merge(dispenser.ofType('emitFile').pipe(rx.mergeMap(({ p: [file] }) => {
            var _a, _b;
            const pkgName = (_a = packageLookuper.dirMap) === null || _a === void 0 ? void 0 : _a.getData(file);
            console.log('intercept', file, pkgName, pkgName ? (_b = allPackages.get(pkgName)) === null || _b === void 0 ? void 0 : _b.realPath : '');
            return rx.EMPTY;
        })), dispenser.ofOtherTypes())));
    });
    r('addSourcePackage -> addSourceFile', i.pt.addSourcePackage.pipe(rx.mergeMap(([m, pkgNames]) => {
        const dir$ = pkgMgr.ot.l.data_allPackages.pipe(
        // eslint-disable-next-line no-console
        rx.take(1), rx.mergeMap(([, allPackages]) => {
            return pkgNames.map(pkgName => [pkgName, allPackages.get(pkgName)]);
        }), rx.mergeMap(([pkgName, pkgInfo]) => {
            var _a;
            if (pkgInfo == null) {
                service.dispatchErrorFor(`Source directory of ${pkgName} is not found`, m);
                o.ft.log(tsc_language_service_1.LogLevel.error, `Source directory of ${pkgName} is not found`).dp();
                return rx.EMPTY;
            }
            const tscCfg = (0, package_mgr2_utils_1.getTscConfigOfPkg)(pkgInfo.json);
            return rx.merge(rx.from((_a = tscCfg.include) !== null && _a !== void 0 ? _a : []), rx.of(path_1.default.resolve(pkgInfo.realPath, tscCfg.srcDir).replace(/\\/g, '/'), path_1.default.resolve(pkgInfo.realPath, tscCfg.isomDir).replace(/\\/g, '/')));
        }), rx.mergeMap(dir => fs_1.default.promises.access(dir).then(() => dir).catch(() => null)), rx.filter((dir) => dir != null));
        return dir$.pipe(rx.mergeMap(dir => {
            return new rx.Observable(sink => {
                (0, glob_1.default)(dir + '/**/*.?([cm])ts', (err, files) => {
                    if (err) {
                        o.ft.log(tsc_language_service_1.LogLevel.error, err.stack).dp();
                        sink.error(err);
                    }
                    else {
                        for (const file of files) {
                            if (!file.endsWith('.d.ts'))
                                sink.next(i.ft.addSourceFile(file, false).re(m).od(o.pt.compileFile).pipe(rx.take(1)));
                        }
                        // o.ft.didAddSourcePackage(files).dp(m);
                        sink.complete();
                    }
                });
            });
        }), rx.mergeMap(compileFile$ => compileFile$), (0, reactivizer_1.pairActionToActionStream)(o.pt.didCompileFile), rx.mergeMap(didCompileFile$ => didCompileFile$.pipe(rx.take(1))), rx.count(), rx.tap(count => {
            o.ft.didAddSourcePackage(count).dp(m);
        }));
    })));
    r('setTsConfigOfPlinkBase -> ', i.pt.setTsConfigOfPlinkBase.pipe(rx.mergeMap(a => pkgMgr.ot.l.updateCommonSrcDir.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(async ([[m], [, commonSrcDir]]) => {
        const file = path_1.default.resolve(__dirname, '../../../tsconfig-base.json');
        const dir = path_1.default.dirname(file);
        const baseTsConfig = await fs_1.default.promises.readFile(file, 'utf8');
        const json = JSON.parse(baseTsConfig);
        json.compilerOptions.declaration = true;
        json.compilerOptions.importHelpers = true;
        json.compilerOptions.rootDir = commonSrcDir;
        json.compilerOptions.outDir = commonSrcDir; // Path.relative(process.cwd(), dir).replace(/\\/g, '/');
        json.compilerOptions.inlineSourceMap = false;
        i.ft.setTsConfig(json, dir).dp(m);
    })));
    return service;
}
exports.addOnPackageFeatures = addOnPackageFeatures;
//# sourceMappingURL=tsc-language-service4pkg.js.map