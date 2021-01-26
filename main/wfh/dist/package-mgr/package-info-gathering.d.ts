import { DirTree } from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
export interface BundleInfo {
    moduleMap: {
        [name: string]: PackageInstance;
    };
}
export interface PackageInfo extends BundleInfo {
    allModules: PackageInstance[];
    dirTree: DirTree<PackageInstance>;
}
export { PackageInstance };
/**
 * walkPackages
 * @param {*} config
 * @param {*} argv
 * @param {*} packageUtils
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
export declare function walkPackages(): PackageInfo;
export declare function listBundleInfo(): PackageInfo;
export declare function saveCache(packageInfo: PackageInfo): void;
