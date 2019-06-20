/// <reference types="node" />
import NodePackage from './packageNodeInstance';
import Events = require('events');
import { packageInstance } from './build-util/ts';
export interface ServerRunnerEvent {
    file: string;
    functionName: string;
}
export declare class ServerRunner {
    deactivatePackages: NodePackage[];
    shutdownServer(): Promise<void>;
    protected _deactivatePackages(comps: NodePackage[]): Promise<void>;
}
export declare function runPackages(argv: {
    target: string;
    package: string[];
    [key: string]: any;
}): Promise<void>;
export declare function initInjectorForNodePackages(argv: {
    [key: string]: any;
}): [packageInstance[], {
    eventBus: Events;
}];
export declare function initWebInjector(packages: packageInstance[], apiPrototype: any): Promise<void>;
