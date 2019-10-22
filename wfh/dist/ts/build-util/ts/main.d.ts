import { DirTree } from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';
export interface BundleInfo {
    moduleMap: {
        [name: string]: PackageBrowserInstance;
    };
    shortNameMap: {
        [name: string]: PackageBrowserInstance;
    };
    bundleMap: {
        [name: string]: PackageBrowserInstance[];
    };
    bundleUrlMap: {
        [name: string]: string[] | {
            css?: string[];
            js?: string[];
        };
    };
    urlPackageSet: {
        [name: string]: number;
    } | null;
}
export interface PackageInfo extends BundleInfo {
    allModules: PackageBrowserInstance[];
    dirTree: DirTree<PackageBrowserInstance>;
    noBundlePackageMap: {
        [name: string]: PackageBrowserInstance;
    };
    entryPageMap: {
        [page: string]: PackageBrowserInstance;
    };
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
export declare function walkPackages(config: any, packageUtils: any): PackageInfo;
export declare function listBundleInfo(_config: any, _packageUtils: any): PackageInfo;
export declare function saveCache(packageInfo: PackageInfo, config: any): void;
