/// <reference types="node" />
import { PackageInfo, packageInstance as PackageBrowserInstance } from './build-util/ts';
import NodePackage from './packageNodeInstance';
import Events = require('events');
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
export declare function runSinglePackage(argv: {
    target: string;
    arguments: string[];
    [key: string]: any;
}): Promise<void>;
export declare function runPackages(argv: {
    target: string;
    package: string[];
    [key: string]: any;
}): Promise<void>;
export declare function initInjectorForNodePackages(argv: {
    [key: string]: any;
}, packageInfo: PackageInfo): [PackageBrowserInstance[], {
    eventBus: Events;
}];
export declare function initWebInjector(packages: PackageBrowserInstance[], apiPrototype: any): void;
export declare function prepareLazyNodeInjector(argv: {
    [key: string]: any;
}): void;
