import { PackageInfo } from '../index';
import { DirTree } from '../plink2/dir-tree';
import { CompilerOptions, CompilerOptionSetOpt } from './package-list-helper';
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
export declare function createPackageInfo(pkJsonFile: string, isInstalled?: boolean): PackageInfo;
export declare function createTsConfigForRepos(plinkPkgDir: string, isPlinkLinked: boolean, workspaceDir: string, repoDirs: string[], plinkRootDir: string, srcPackages: Map<string, PackageInfo>, spaceDependencies: Iterable<string>, extraPathMapping: {
    [path: string]: string[];
}, include?: string[]): Generator<readonly [string, {
    extends?: string | undefined;
    include: string[];
    exclude: string[];
    compilerOptions?: Partial<CompilerOptions> | undefined;
}], void, unknown>;
export declare function setTsCompilerOpts(tsconfigDir: string, assigneeOptions: Partial<CompilerOptions>, plinkRootDir: string, workspaceDir: string, srcPackages: Map<string, PackageInfo>, spaceDependedPkgs: Iterable<PackageInfo>, plinkSourcePkgDir?: string | null, opts?: Omit<CompilerOptionSetOpt, 'workspaceDir'>): CompilerOptions;
export declare class PlinkPackageLookup {
    dirMap: DirTree<string>;
    packagePathMap: Map<string, string> | undefined;
    fromTsconfig(baseDir: string, json: {
        compilerOptions: {
            paths: Record<string, string[]>;
        };
    }): Map<string, string>;
}
