export interface PackageJsonInterf {
    version: string;
    name: string;
    devDependencies?: {
        [nm: string]: string;
    };
    peerDependencies?: {
        [nm: string]: string;
    };
    dependencies?: {
        [nm: string]: string;
    };
}
export declare function listCompDependency(pkJsonFiles: string[] | PackageJsonInterf[], workspace: string, workspaceDeps: {
    [name: string]: string;
}, excludeDep: Map<string, any> | Set<string>): {
    hoisted: Map<string, DependentInfo>;
    hoistedPeers: Map<string, DependentInfo>;
};
export interface DependentInfo {
    /** Is all dependents on same version */
    sameVer: boolean;
    /** Is a direct dependency of space package.json */
    direct: boolean;
    by: Array<{
        /** dependency version (not dependent's) */
        ver: string;
        /** dependent name */
        name: string;
    }>;
}
export declare class InstallManager {
    private excludeDeps;
    verbosMessage: string;
    /** key is dependency module name */
    private directDeps;
    private srcDeps;
    private peerDeps;
    constructor(workspaceDeps: {
        [name: string]: string;
    }, workspaceName: string, excludeDeps: Map<string, any> | Set<string>);
    scanFor(pkJsons: PackageJsonInterf[]): void;
    scanSrcDeps(jsonFiles: string[]): void;
    hoistDeps(): Map<string, DependentInfo>[];
    protected _trackSrcDependency(name: string, version: string, byWhom: string): void;
    protected _trackPeerDependency(name: string, version: string, byWhom: string): void;
}
