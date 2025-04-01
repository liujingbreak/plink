"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlinkPackageLookupService = createPlinkPackageLookupService;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const reactivizer_1 = require("@wfh/reactivizer");
const rx = tslib_1.__importStar(require("rxjs"));
const tableFor = ['rootDir', 'fromPackageService', 'pkgPathLenToPathMapChanged', 'packageToPathMap'];
function createPlinkPackageLookupService() {
    const service = new reactivizer_1.SimplexReactor({
        name: 'PlinkPackageLookup',
        debug: false,
        tableFor
    });
    let pkgPathLenToPathMap;
    const { r, s, table } = service;
    r('fromPackageService -> rootDir, pkgPathLenToPathMapChanged', s.pt.fromPackageService.pipe(rx.switchMap(([m, service]) => {
        return service.ot.l.didSwitchSpace.pipe(rx.filter(([, k]) => k != null), rx.distinctUntilChanged(([, a], [, b]) => a === b), rx.map(b => [[m, service], b]));
    }), rx.mergeMap(([[m, service], [, activeSpaceKey]]) => {
        var _a;
        const spacePkgs = (_a = service.ot.getData().data_spacePkgMap[0]) === null || _a === void 0 ? void 0 : _a.get(activeSpaceKey);
        return rx.combineLatest([
            // If data_spacePkgMap doesn't have activeSpaceKey, dispatch "checkSpace" message
            spacePkgs != null ?
                rx.of(spacePkgs) :
                service.o.ft.checkSpace(activeSpaceKey).od(service.o.pt.didCheckSpace).pipe(rx.take(1), rx.mergeMap(() => service.ot.l.data_spacePkgMap), rx.map(([, data]) => data.get(activeSpaceKey)), rx.filter(v => v != null)),
            service.ot.l.data_allPackages.pipe(rx.take(1)),
            service.ot.l.rootDir
        ]).pipe(rx.map(([spacePkgs, [, allPackages], [, rootPath]]) => {
            var _a;
            const installDir = node_path_1.default.resolve(rootPath, activeSpaceKey);
            pkgPathLenToPathMap = new Map();
            s.ft.rootDir(rootPath).dp(m);
            for (const pkgName of spacePkgs) {
                const pkgPath = (_a = allPackages.get(pkgName)) === null || _a === void 0 ? void 0 : _a.realPath;
                const dirs = [pkgPath, node_path_1.default.resolve(installDir, 'node_modules', pkgName)].filter((dir) => dir != null);
                for (const dir of dirs) {
                    const pkgPath = node_path_1.default.relative(rootPath, dir).replace(/\\/g, '/');
                    const pathLen = pkgPath.split(/[/\\]/).length;
                    let pathMap = pkgPathLenToPathMap.get(pathLen);
                    if (pathMap) {
                        pathMap.set(pkgPath, pkgName);
                    }
                    else {
                        pathMap = new Map();
                        pathMap.set(pkgPath, pkgName);
                        pkgPathLenToPathMap.set(pathLen, pathMap);
                    }
                }
            }
            s.ft.pkgPathLenToPathMapChanged(true).dp(m);
        }));
    })));
    r('fromTsconfig -> rootDir, pkgPathLenToPathMapChanged, packageToPathMap', s.pt.fromTsconfig.pipe(rx.map(([m, baseDir, json]) => {
        var _a;
        s.ft.rootDir(baseDir).dp(m);
        pkgPathLenToPathMap = new Map();
        const pkg2PathMap = new Map();
        for (const [key, list] of Object.entries(json.compilerOptions.paths)) {
            const match = /^((?:@[^/]+\/)?[^/]+)\//.exec(key); // matches form of "<package-name>/"
            if (match) {
                const path = list[0];
                const relPath = (_a = /^.+(?!\/\*).(?=\/\*)/.exec(path)) === null || _a === void 0 ? void 0 : _a[0]; // Matches form of "<package-name>/*"
                if (relPath) {
                    const pkgName = match[1];
                    pkg2PathMap.set(pkgName, node_path_1.default.resolve(baseDir, relPath));
                    const pathLen = relPath.split(/[/\\]/).length;
                    let pathMap = pkgPathLenToPathMap.get(pathLen);
                    if (pathMap) {
                        pathMap.set(relPath, pkgName);
                    }
                    else {
                        pathMap = new Map();
                        pathMap.set(relPath, pkgName);
                        pkgPathLenToPathMap.set(pathLen, pathMap);
                    }
                }
            }
        }
        s.ft.pkgPathLenToPathMapChanged(true).dp(m);
        s.ft.packageToPathMap(pkg2PathMap).dp(m);
    })));
    r('lookupPackage, (pkgPathLenToPathMapChanged) -> lookupPackageResolved', s.pt.lookupPackage.pipe(rx.mergeMap(([m, file]) => table.l.rootDir.pipe(rx.map(([, rootDir]) => {
        if (table.getData().pkgPathLenToPathMapChanged[0] !== true)
            throw new Error('You have to run "switch" command to install dependencies before proceed this operation');
        const pathEls = node_path_1.default.relative(rootDir, file).split(/[\\/]/);
        for (const [len, pathMap] of pkgPathLenToPathMap.entries()) {
            const dir = pathEls.splice(0, len).join('/');
            const pkgName = pathMap.get(dir);
            s.ft.lookupPackageResolved(pkgName).dp(m);
            if (pkgName)
                break;
        }
    }), service.catchErrorFor(m)))));
    s.ft.pkgPathLenToPathMapChanged(false).dp();
    return {
        input: s.ft,
        output: s.pt,
        table,
        service
    };
}
//# sourceMappingURL=package-mgr2-lookup.js.map