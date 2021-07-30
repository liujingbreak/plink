import { DirTree } from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
import { PackageInfo } from '.';
/**
 * @deprecated
 */
export default class LazyPackageFactory {
    private packagesIterable;
    packagePathMap: DirTree<PackageInstance> | undefined;
    constructor(packagesIterable: Iterable<PackageInfo>);
    getPackageByPath(file: string): PackageInstance | null;
}
export declare function parseName(longName: string): {
    name: string;
    scope?: string;
};
