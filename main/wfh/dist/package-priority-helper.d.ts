import PackageNodeInstance from './packageNodeInstance';
import PackageBrowserInstance from './package-mgr/package-instance';
export declare type PackageInstance = PackageBrowserInstance | PackageNodeInstance;
export declare function orderPackages(packages: PackageInstance[], run: (...arg: any[]) => Promise<any> | any, priorityProperty?: string): Promise<void>;
