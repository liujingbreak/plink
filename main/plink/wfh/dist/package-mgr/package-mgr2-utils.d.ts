import { PackageInfo } from '../index';
import { CompilerOptions } from './package-list-helper';
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
