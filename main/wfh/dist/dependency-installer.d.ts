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
    hoisted: {
        [dep: string]: string;
    };
    msg: () => string;
};
interface DepInfo {
    ver: string;
    verNum?: string;
    pre: string;
    by: string;
}
export declare class InstallManager {
    verbosMessage: string;
    private srcDeps;
    constructor(workspaceDeps: {
        [name: string]: string;
    }, workspaceName: string);
    scanFor(pkJsons: PackageJsonInterf[]): void;
    scanSrcDeps(jsonFiles: string[]): void;
    hoistDeps(): {
        [dep: string]: string;
    };
    protected _trackDependency(name: string, version: string, byWhom: string): void;
    protected _containsDiffVersion(sortedVersions: DepInfo[]): boolean;
    /**
       * Sort by descending
       * @param verInfoList {ver: string, by: string, name: string}
       */
    protected sortByVersion(verInfoList: DepInfo[], name: string): DepInfo[];
}
export {};
