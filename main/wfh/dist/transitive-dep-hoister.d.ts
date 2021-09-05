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
/**
 *
 * @param pkJsonFiles json map of linked package
 * @param workspace
 * @param workspaceDeps
 * @param workspaceDevDeps
 */
export declare function listCompDependency(pkJsonFiles: Map<string, {
    json: PackageJsonInterf;
}>, workspace: string, workspaceDeps: {
    [name: string]: string;
}, workspaceDevDeps?: {
    [name: string]: string;
}): {
    hoisted: Map<string, DependentInfo>;
    hoistedPeers: Map<string, DependentInfo>;
    hoistedDev: Map<string, DependentInfo>;
    hoistedDevPeers: Map<string, DependentInfo>;
};
interface DepInfo {
    ver: string;
    verNum?: string;
    pre: string;
    by: string;
}
export interface DependentInfo {
    /** Is all dependents on same version */
    sameVer: boolean;
    /** Is a direct dependency of space package.json */
    direct: boolean;
    /** In case a transitive peer dependency, it should not
     * be installed automatically, unless it is also a direct dependency of current space,
     * setting to `true` to remind user to install manually
     */
    missing: boolean;
    /** Same trasitive dependency in both normal and peer dependencies list
     * actual version should be the one selected from normal transitive dependency
     */
    duplicatePeer: boolean;
    by: Array<{
        /** dependency version (not dependent's) */
        ver: string;
        /** dependent name */
        name: string;
    }>;
}
export declare class TransitiveDepScanner {
    private excludeLinkedDeps;
    verbosMessage: string | undefined;
    devDeps: Map<string, DepInfo[]>;
    /** key is dependency module name */
    private directDeps;
    private srcDeps;
    private peerDeps;
    private directDepsList;
    /**
     *
     * @param workspaceDeps should include "dependencies" and "devDependencies"
     * @param workspaceName
     * @param excludeLinkedDeps
     */
    constructor(workspaceDeps: {
        [name: string]: string;
    }, workspaceName: string, excludeLinkedDeps: Map<string, any> | Set<string>);
    scanFor(pkJsons: Iterable<PackageJsonInterf>, combineDevDeps?: boolean): void;
    initExistingDeps(deps: Map<string, DepInfo[]>): void;
    /**
     * The base algorithm: "new dependencies" = "direct dependencies of workspace" + "transive dependencies"
     * @param duplicateDepsToCheck extra dependent information to check if they are duplicate.
     */
    hoistDeps(duplicateDepsToCheck?: Map<string, DependentInfo>): Map<string, DependentInfo>[];
    /**
     * - If there is a direct dependency of workspace, move its version to the top of the version list,
     * - If it is peer dependency and it is not a direct dependency of workspace,
     * mark it "missing" so that reminds user to manual install it.
     * @param trackedRaw
     * @param isPeerDeps
     */
    protected collectDependencyInfo(trackedRaw: Map<string, DepInfo[]>, isPeerDeps?: boolean): Map<string, DependentInfo>;
    protected _trackSrcDependency(name: string, version: string, byWhom: string): void;
    protected _trackDevDependency(name: string, version: string, byWhom: string): void;
    private _trackDependency;
    protected _trackPeerDependency(name: string, version: string, byWhom: string): void;
}
export {};
