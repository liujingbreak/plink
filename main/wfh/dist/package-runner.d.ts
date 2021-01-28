import _NodeApi from './package-mgr/node-package-api';
import PackageInstance from './packageNodeInstance';
import NodePackage from './packageNodeInstance';
import { PackageInfo as PackageState } from './package-mgr';
export interface ServerRunnerEvent {
    file: string;
    functionName: string;
}
export declare function isServerPackage(pkg: PackageState): any;
export declare function readPriorityProperty(json: any): any;
export declare function runServer(): Promise<() => Promise<void>>;
/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
export declare function runSinglePackage({ target, args }: {
    target: string;
    args: string[];
}): Promise<undefined>;
export declare function runPackages(target: string, includePackages: Iterable<string>): Promise<{
    name: string;
    exp: any;
}[]>;
/**
 * So that we can use `import api from '__plink'` anywhere in our package
 */
export declare function initInjectorForNodePackages(): [
    PackageInstance[],
    _NodeApi
];
/**
 * @deprecated
 * Support `import api from '__api';`
 * @param argv
 */
export declare function prepareLazyNodeInjector(argv?: {
    [key: string]: any;
}): void;
export declare function mapPackagesByType(types: string[], onEachPackage: (nodePackage: NodePackage) => void): {
    [type: string]: PackageInstance[];
};
