import NodePackage from './packageNodeInstance';
export declare class ServerRunner {
    deactivatePackages: NodePackage[];
    shutdownServer(): Promise<void>;
    protected _deactivatePackages(comps: NodePackage[]): Promise<void>;
}
export declare function runPackages(argv: any): any;
