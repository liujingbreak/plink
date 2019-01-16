interface PackageJson {
    dependencies: {
        [k: string]: string;
    };
    devDependencies: {
        [k: string]: string;
    };
}
/**
 * This class helps to install dependencies for command "init",
 * it is in charge of manipulating <drcp-workspace>/dr.package.json
 * and run "yarn install", to protect the original package.json file
*/
declare class Guarder {
    rootPath: string;
    static instances: {
        [k: string]: Guarder;
    };
    changes: PackageJson;
    installChecksum: number | null;
    isPackageJsonDirty: boolean;
    isDrcpSymlink: boolean;
    isNodeModulesChanged: boolean | null;
    offline: boolean;
    protected lastInstalled: string[];
    constructor(rootPath: string);
    /**
     * Backup package.json
     * @param {*} backupFileContent
     */
    beforeChange(backupFileContent?: any): void;
    /**
     * Get last changed package.json json from dr.package.json or memory
     * @returns {JSON} a cloned package.json
     */
    getChanges(): PackageJson;
    getJsonFile(): string;
    /**
     * Mark changes without writing dr.package.json
     * return a complete list of this time marked dependencies together with last time marked
     * @param {object} pk package.json
     * @return changed list [string, string][]
     */
    markChanges(pk: PackageJson): [string, string][];
    isModulesChanged(): boolean;
    installAsync(doNotMarkInstallNum?: boolean, useYarn?: boolean, onlyProd?: boolean, isOffline?: boolean): Promise<string>;
    markInstallNum(): void;
    /**
     * Not including symlink components
     */
    _countPackages(): string[];
    /**
     * Mark changes and writing dr.package.json, and restore package.json and create dr.yarn.lock
     * @param {*} dependencies
     */
    afterChange(): void;
    afterChangeFail(): void;
}
export declare function getInstance(rootPath: string): Guarder;
export {};
//# sourceMappingURL=package-json-guarder.d.ts.map