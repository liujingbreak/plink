import { DirTree } from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';
/**
 * @deprecated
 */
export default class LazyPackageFactory {
    packagePathMap: DirTree<PackageBrowserInstance>;
    getPackageByPath(file: string): PackageBrowserInstance | null;
}
export declare function parseName(longName: string): {
    name: string;
    scope?: string;
};
