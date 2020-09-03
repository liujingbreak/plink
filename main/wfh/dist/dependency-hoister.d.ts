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
}): {
    hoisted: Map<string, DependentInfo>;
    msg: () => string;
};
interface DepInfo {
    ver: string;
    verNum?: string;
    pre: string;
    by: string;
}
interface DependentInfo {
    /** All dependents on same version */
    sameVer: boolean;
    by: Array<{
        /** dependency version (not dependent's) */
        ver: string;
        /** dependent name */
        name: string;
    }>;
}
export declare class InstallManager {
    verbosMessage: string;
    /** key is dependency module name */
    private srcDeps;
    constructor(workspaceDeps: {
        [name: string]: string;
    }, workspaceName: string);
    scanFor(pkJsons: PackageJsonInterf[]): void;
    scanSrcDeps(jsonFiles: string[]): void;
    hoistDeps(): Map<string, DependentInfo>;
    protected _trackDependency(name: string, version: string, byWhom: string): void;
    protected _containsDiffVersion(sortedVersions: DepInfo[]): boolean;
    /**
       * Sort by descending
       * @param verInfoList {ver: string, by: string, name: string}
       */
    protected sortByVersion(verInfoList: DepInfo[], name: string): DepInfo[];
}
export {};
