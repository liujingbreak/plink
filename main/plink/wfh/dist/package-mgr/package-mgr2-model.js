"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStoreService = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const inputTableFor = [];
const outputTableFor = ['data_spacePkgMap', 'data_spaceDependencyMap', 'data_allPackages', 'data_projPkgMap'];
function createStoreService(base) {
    const projPkgMap = new Map();
    const allPackages = new Map();
    const spaceDependencyMap = new Map();
    const spacePkgMap = new Map();
    const service = base.config({
        outputTableFor
    });
    // const service0 = patch<PackageMgrModelInput, PackageMgr2ModuleOutput, typeof inputTableFor, typeof outputTableFor>({
    //   debugExcludeTypes: ['addPackageToProject', 'addPackageToSpace', 'updateDependencyOfSpace'],
    //   inputTableFor,
    //   outputTableFor
    // }, service => {
    const { i, o, r } = service;
    r('updatePackagesBegin, addPackageToProject, updatePackagesEnd -> data_allPackages', i.pt.updatePackagesBegin.pipe(rx.concatMap(([m]) => {
        const useless = new Map(allPackages);
        projPkgMap.clear();
        return i.pt.addPackageToProject.pipe((0, reactivizer_1.actionRelatedToAction)(m), rx.map(([, proj, _type, pkg]) => {
            const pkgsStore = projPkgMap.get(proj);
            allPackages.set(pkg.name, pkg);
            useless.delete(pkg.name);
            if (pkgsStore) {
                pkgsStore.add(pkg.name);
            }
            else {
                projPkgMap.set(proj, new Set([pkg.name]));
            }
        }), rx.takeUntil(i.pt.updatePackagesEnd.pipe((0, reactivizer_1.actionRelatedToActionRelatives)(m))), rx.count(), rx.map(() => {
            if (useless.size > 0) {
                o.ft.onSourcPackageRemoved(useless.values()).dp(m.r);
            }
            o.ft.data_allPackages(allPackages).dp(m);
        }));
    })));
    r('updateDependencyOfSpace -> onNewSpace, data_spaceDependencyMap', i.pt.updateDependencyOfSpace.pipe(rx.map(([m, spaceKey, pkgNames]) => {
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
        o.ft.data_spaceDependencyMap(spaceDependencyMap).dp(m);
    })));
    r('removeSpace -> [spacePkgMap], [spaceDependencyMap]', i.pt.removeSpace.pipe(rx.map(([m, key]) => {
        if (spacePkgMap.delete(key))
            o.ft.data_spacePkgMap(spacePkgMap).dp(m);
        if (spaceDependencyMap.delete(key))
            o.ft.data_spaceDependencyMap(spaceDependencyMap).dp(m);
    })));
    r('deletePackageOfSpace', i.pt.deletePackageOfSpace.pipe(rx.map(([m, key, pkg]) => {
        const pkgSet = spacePkgMap.get(key);
        if (pkgSet) {
            pkgSet.delete(pkg);
            if (pkgSet.size === 0)
                spacePkgMap.delete(key);
        }
        o.ft.data_spacePkgMap(spacePkgMap).dp(m);
    })));
    r('addPackageToSpace', i.pt.addPackageToSpace.pipe(rx.map(([m, key, pkg]) => {
        let space = spacePkgMap.get(key);
        if (space == null) {
            space = new Set();
            spacePkgMap.set(key, space);
        }
        space.add(pkg);
        o.ft.data_spacePkgMap(spacePkgMap).dp(m);
    })));
    o.ft.data_spacePkgMap(spacePkgMap).dp();
    o.ft.data_spaceDependencyMap(spaceDependencyMap).dp();
    o.ft.data_allPackages(allPackages).dp();
    o.ft.data_projPkgMap(projPkgMap).dp();
    return {
        service: service
    };
}
exports.createStoreService = createStoreService;
//# sourceMappingURL=package-mgr2-model.js.map