import { DirTree } from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
export interface PackageInfo {
    allModules: PackageInstance[];
    dirTree: DirTree<PackageInstance>;
    moduleMap: Map<string, PackageInstance>;
}
export { PackageInstance };
export declare function packageOfFileFactory(): {
    packageInfo: PackageInfo;
    getPkgOfFile(file: string): PackageInstance | undefined;
};
export declare function walkPackages(): PackageInfo;
