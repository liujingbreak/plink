import PackageNodeInstance from './packageNodeInstance';
import PackageBrowserInstance from '@dr-core/build-util/dist/package-instance';
export declare type PackageInstance = PackageBrowserInstance | PackageNodeInstance;
export declare function orderPackages(packages: PackageInstance[], run: (...arg: any[]) => Promise<any>, priorityProperty?: string): Promise<void>;
