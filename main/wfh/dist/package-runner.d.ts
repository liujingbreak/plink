import { PackageInfo } from './package-mgr/package-info-gathering';
import _NodeApi from './package-mgr/node-package-api';
import PackageInstance from './packageNodeInstance';
import NodePackage from './packageNodeInstance';
import type { default as ExtensionContext } from './package-mgr/node-package-api';
import { PackageInfo as PackageState } from './package-mgr';
export interface ServerRunnerEvent {
    file: string;
    functionName: string;
}
interface ExtensionExport {
    activate?(ctx: ExtensionContext): void | Promise<void>;
    deactivate?(): any;
}
export declare function isServerPackage(pkg: PackageState): boolean | undefined;
export declare function readPriorityProperty(json: any): any;
export declare function runServer(): {
    started: Promise<{
        name: string;
        exp: ExtensionExport;
    }[]>;
    shutdown(): Promise<void>;
};
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
    exp: ExtensionExport;
}[]>;
/**
 * So that we can use `import api from '__plink'` anywhere in our package
 */
export declare function initInjectorForNodePackages(): [
    PackageInfo,
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
export {};
