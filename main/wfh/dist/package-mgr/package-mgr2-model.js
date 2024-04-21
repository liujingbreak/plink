"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreService = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("../../../packages/reactivizer");
function createStoreService(base) {
    const projPkgMap = new Map();
    const allPackages = new Map();
    const spacePkgMap = new Map();
    const service = (0, reactivizer_1.patch)({
        debugExcludeTypes: ['addPackageToProject']
    }, service => {
        const { i, o, r } = service;
        r('updateBegin, addPackageToProject, updateEnd ->', i.pt.updateBegin.pipe(rx.concatMap(([m]) => {
            const useless = new Map(allPackages);
            projPkgMap.clear();
            return i.pt.addPackageToProject.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.map(([, proj, type, pkg]) => {
                const pkgsStore = projPkgMap.get(proj);
                allPackages.set(pkg.name, pkg);
                useless.delete(pkg.name);
                if (pkgsStore) {
                    pkgsStore.push(pkg.name);
                }
                else {
                    projPkgMap.set(proj, [pkg.name]);
                }
            }), rx.takeUntil(i.pt.updateEnd.pipe((0, reactivizer_1.actionRelatedToAction)(m))), rx.count(), rx.map(() => {
                if (useless.size > 0) {
                    o.ft.onSourcPackageRemoved(useless.values()).dp(m.r);
                }
            }));
        })));
        r('updatePackagesOfSpace -> onNewSpace', i.pt.updatePackagesOfSpace.pipe(rx.map(([m, spaceKey, pkgNames]) => {
            let packageSet = spacePkgMap.get(spaceKey);
            if (packageSet == null) {
                packageSet = new Set();
                spacePkgMap.set(spaceKey, packageSet);
                o.ft.onNewSpace(spaceKey).dp(m.r);
            }
            else {
                packageSet.clear();
            }
            pkgNames.forEach(pkgName => packageSet.add(pkgName));
        })));
        r('removeSpace', i.pt.removeSpace.pipe(rx.map(([, key]) => spacePkgMap.delete(key))));
    }).to(base);
    return {
        projPkgMap,
        allPackages,
        spacePkgMap,
        service
    };
}
exports.createStoreService = createStoreService;
//# sourceMappingURL=package-mgr2-model.js.map