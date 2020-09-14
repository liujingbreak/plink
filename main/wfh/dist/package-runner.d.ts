import { PackageInfo, packageInstance as PackageBrowserInstance } from './build-util/ts';
import _NodeApi from './package-mgr/node-package-api';
import NodePackage from './packageNodeInstance';
export interface ServerRunnerEvent {
    file: string;
    functionName: string;
}
export declare class ServerRunner {
    deactivatePackages: NodePackage[];
    shutdownServer(): Promise<void>;
    protected _deactivatePackages(comps: NodePackage[]): Promise<void>;
}
/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
export declare function runSinglePackage({ target, args }: {
    target: string;
    args: string[];
}): Promise<void>;
export declare function runPackages(argv: {
    target: string;
    package: string[];
    [key: string]: any;
}): Promise<void>;
export declare function initInjectorForNodePackages(argv: {
    [key: string]: any;
}, packageInfo: PackageInfo): [PackageBrowserInstance[], _NodeApi];
export declare function initWebInjector(packages: PackageBrowserInstance[], apiPrototype: any): void;
export declare function prepareLazyNodeInjector(argv: {
    [key: string]: any;
}): void;
export declare function mapPackagesByType(types: string[], onEachPackage: (nodePackage: NodePackage) => void): {
    [type: string]: NodePackage[];
};
