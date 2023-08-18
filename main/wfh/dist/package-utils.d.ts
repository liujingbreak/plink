import PackageInstance from './packageNodeInstance';
import { lookupPackageJson } from './cmd/utils';
import { PackageType, allPackages, packages4WorkspaceKey, packages4Workspace } from './package-mgr/package-list-helper';
export { PackageType, allPackages, packages4WorkspaceKey, packages4Workspace };
export declare function createLazyPackageFileFinder(): (file: string) => PackageInstance | undefined;
export type FindPackageCb = (fullName: string, 
/** @Deprecated empty string */
packagePath: string, parsedName: {
    name: string;
    scope: string;
}, json: any, realPackagePath: string, isInstalled: boolean) => void;
export declare function lookForPackages(packageList: string[] | string, cb: FindPackageCb): void;
export declare function findAllPackages(callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string | string[]): void;
export declare function findAllPackages(packageList: string[] | string, callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string | string[]): void;
export { lookupPackageJson as findPackageJsonPath };
export declare function findPackageByType(_types: PackageType | PackageType[], callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string[] | string): void;
