import PackageBrowserInstance from './build-util/ts/package-instance';
export declare function createLazyPackageFileFinder(): (file: string) => PackageBrowserInstance | undefined;
export declare type FindPackageCb = (fullName: string, entryPath: string, parsedName: {
    name: string;
    scope: string;
}, json: any, packagePath: string, isInstalled: boolean) => void;
export declare function lookForPackages(packageList: string[], cb: FindPackageCb): void;
export declare type PackageType = '*' | 'build' | 'core';
export declare function findAllPackages(callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string | string[]): void;
export declare function findAllPackages(packageList: string[] | string, callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string | string[]): void;
export { eachRecipe } from './recipe-manager';
