"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreService = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("../../../packages/reactivizer");
const inputTableFor = ['updateCurrentSpace'];
function createStoreService(base) {
    const projPkgMap = new Map();
    const allPackages = new Map();
    const spaceDependencyMap = new Map();
    const spacePkgMap = new Map();
    const service = (0, reactivizer_1.patch)({
        debugExcludeTypes: ['addPackageToProject', 'addPackageToSpace', 'updateDependencyOfSpace'],
        inputTableFor
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
                    pkgsStore.add(pkg.name);
                }
                else {
                    projPkgMap.set(proj, new Set([pkg.name]));
                }
            }), rx.takeUntil(i.pt.updateEnd.pipe((0, reactivizer_1.actionRelatedToAction)(m))), rx.count(), rx.map(() => {
                if (useless.size > 0) {
                    o.ft.onSourcPackageRemoved(useless.values()).dp(m.r);
                }
            }));
        })));
        r('updateDependencyOfSpace -> onNewSpace', i.pt.updateDependencyOfSpace.pipe(rx.map(([m, spaceKey, pkgNames]) => {
            let packageSet = spaceDependencyMap.get(spaceKey);
            if (packageSet == null) {
                packageSet = new Set();
                spaceDependencyMap.set(spaceKey, packageSet);
                o.ft.onNewSpace(spaceKey).dp(m.r);
            }
            else {
                packageSet.clear();
            }
            pkgNames.forEach(pkgName => packageSet.add(pkgName));
        })));
        r('removeSpace', i.pt.removeSpace.pipe(rx.map(([, key]) => {
            spacePkgMap.delete(key);
            spaceDependencyMap.delete(key);
        })));
        r('deletePackageOfSpace', i.pt.deletePackageOfSpace.pipe(rx.map(([m, key, pkg]) => {
            var _a;
            (_a = spacePkgMap.get(key)) === null || _a === void 0 ? void 0 : _a.delete(pkg);
        })));
        r('addPackageToSpace', i.pt.addPackageToSpace.pipe(rx.map(([, key, pkg]) => {
            let space = spacePkgMap.get(key);
            if (space == null) {
                space = new Set();
                spacePkgMap.set(key, space);
            }
            space.add(pkg);
        })));
        // r('saveStateToFile', o.pt.saveStateToFile.pipe(
        //   rx.concatMap(() => {
        //     return fs.promises.writeFile();
        //   })
        // ));
        service.i.ft.updateCurrentSpace(null).dp();
    }).to(base);
    return {
        projPkgMap,
        allPackages,
        spacePkgMap,
        spaceDependencyMap,
        service
    };
}
exports.createStoreService = createStoreService;
//# sourceMappingURL=package-mgr2-model.js.map