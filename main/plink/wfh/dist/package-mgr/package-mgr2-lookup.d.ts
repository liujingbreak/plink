import { SingleActionFactory, SimplexReactor, PayloadByType } from '@wfh/reactivizer';
import { PackageMgrFullServiceType } from './package-mgr2';
interface PlinkPackageLookupInput {
    /** To initialize lookup functionality, send required information of either fromTsconfig or fromPackageService,
     * if "installDir" is provided, will also consider include search range of directories like <install-dir>/node_modules/<package-name>
     * */
    fromTsconfig(baseDir: string, json: {
        compilerOptions: {
            paths: Record<string, string[]>;
        };
    }, installDir?: string): SingleActionFactory;
    /** To initialize lookup functionality, send required information of either fromTsconfig or fromPackageService */
    fromPackageService(ps: PackageMgrFullServiceType): SingleActionFactory;
    /** Result is replied in message "lookupPackageResolved" */
    lookupPackage(file: string): SingleActionFactory;
}
interface PlinkPackageLookupOutput {
    lookupPackageResolved(packageName: string | undefined | null): SingleActionFactory;
    packageToPathMap(map: Map<string, string>): SingleActionFactory;
}
interface PlinkPackageLookupInternal {
    rootDir(dir: string): SingleActionFactory;
    pkgPathLenToPathMapChanged(initialized: boolean): SingleActionFactory;
}
export declare function createPlinkPackageLookupService(): {
    input: PlinkPackageLookupInput;
    output: PayloadByType<PlinkPackageLookupOutput>;
    table: import("@wfh/reactivizer").ActionTable<PlinkPackageLookupInput & PlinkPackageLookupOutput & PlinkPackageLookupInternal & import("@wfh/reactivizer").BaseActions<PlinkPackageLookupInput & PlinkPackageLookupOutput & PlinkPackageLookupInternal, readonly []>, readonly ("__onError" | "__onDisposed" | "rootDir" | "fromPackageService" | "pkgPathLenToPathMapChanged" | "packageToPathMap")[]>;
    service: SimplexReactor<PlinkPackageLookupInput & PlinkPackageLookupOutput & PlinkPackageLookupInternal, readonly ["rootDir", "fromPackageService", "pkgPathLenToPathMapChanged", "packageToPathMap"]>;
};
export type PlinkPackageLookupService = ReturnType<typeof createPlinkPackageLookupService>;
export {};
