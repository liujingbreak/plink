import { DirTree } from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';
export interface BundleInfo {
    moduleMap: {
        [name: string]: PackageBrowserInstance;
    };
}
export interface PackageInfo extends BundleInfo {
    allModules: PackageBrowserInstance[];
    dirTree: DirTree<PackageBrowserInstance>;
}
export { PackageBrowserInstance };
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
