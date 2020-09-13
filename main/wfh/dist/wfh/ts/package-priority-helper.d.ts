import PackageNodeInstance from './packageNodeInstance';
import PackageBrowserInstance from './build-util/ts/package-instance';
export declare type PackageInstance = PackageBrowserInstance | PackageNodeInstance;
export declare function orderPackages(packages: PackageInstance[], run: (...arg: any[]) => Promise<any>, priorityProperty?: string): Promise<void>;
