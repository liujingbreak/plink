import { PackageInfo } from '../index';
import { DirTree } from '../plink2/dir-tree';
import { PackageMgrFullServiceType } from './package-mgr2';
export interface PackageJsonInterf {
    version: string;
    name: string;
    workspaces?: string[];
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
export type TsconfigType = {
    extends?: string;
    include?: string[];
    exclude?: string[];
    compilerOptions: {
        paths: Record<string, string[]>;
        [prop: string]: any;
    };
};
export declare function createPackageInfo(pkJsonFile: string, isInstalled?: boolean): PackageInfo;
export declare function getTscConfigOfPkg(json: any): {
    srcDir: string;
    destDir: string;
    isomDir: string;
    include: string[] | undefined;
    files: string[] | undefined;
};
export declare function createTsConfigForRepos(plinkPkgDir: string, isPlinkLinked: boolean, workspaceDir: string, repoDirs: string[], plinkRootDir: string, srcRootDir: string, srcPackages: Map<string, PackageInfo>, typeRootPkgs: Iterable<PackageInfo>, extraPathMapping: {
    [path: string]: string[];
}, pathForInclude?: string[]): Generator<readonly [string, TsconfigType], void, unknown>;
export declare function createTsConfigFile(tsconfigBaseDir: string, extendTsConfigFile: string | null, plinkPkgDir: string, isPlinkLinked: boolean, workspaceDir: string, plinkRootDir: string, srcPackages: Map<string, PackageInfo>, srcRootDir: string, typeRootPkgs: Iterable<PackageInfo>, extraPathMapping: {
    [path: string]: string[];
}, pathForInclude?: string[]): TsconfigType;
export declare class PlinkPackageLookup {
    dirMap: DirTree<string> | undefined;
    packagePathMap: Map<string, string> | undefined;
    fromTsconfig(baseDir: string, json: {
        compilerOptions: {
            paths: Record<string, string[]>;
        };
    }): Map<string, string>;
    fromService(service: PackageMgrFullServiceType): void;
}
