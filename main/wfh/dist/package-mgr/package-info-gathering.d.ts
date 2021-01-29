import { DirTree } from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
export interface PackageInfo {
    allModules: PackageInstance[];
    dirTree: DirTree<PackageInstance>;
    moduleMap: {
        [name: string]: PackageInstance;
    };
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
