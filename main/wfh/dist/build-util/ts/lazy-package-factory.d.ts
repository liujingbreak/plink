import { DirTree } from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';
import { PackageInfo } from '../../package-mgr';
/**
 * @deprecated
 */
export default class LazyPackageFactory {
    private packagesIterable;
    packagePathMap: DirTree<PackageBrowserInstance>;
    constructor(packagesIterable: Iterable<PackageInfo>);
    getPackageByPath(file: string): PackageBrowserInstance | null;
}
export declare function parseName(longName: string): {
    name: string;
    scope?: string;
};
