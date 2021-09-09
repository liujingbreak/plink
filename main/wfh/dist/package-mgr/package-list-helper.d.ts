import { PackageInfo } from './index';
import ts from 'typescript';
export declare type PackageType = '*' | 'build' | 'core';
export declare function allPackages(_types?: PackageType | PackageType[], recipeType?: 'src' | 'installed', projectDirs?: string[]): Generator<PackageInfo>;
export declare function packages4WorkspaceKey(wsKey: string, includeInstalled?: boolean): Generator<PackageInfo>;
export declare function packages4Workspace(workspaceDir?: string, includeInstalled?: boolean): Generator<PackageInfo, any, unknown>;
/**
 * @returns a map of workspace keys of which has specified dependency
 */
export declare function workspacesOfDependencies(...depPkgNames: string[]): Set<string>;
export interface CompilerOptionSetOpt {
    /** Will add typeRoots property for specific workspace, and add paths of file "package-settings.d.ts" */
    workspaceDir?: string;
    /** Add real path of all link package to "paths" property */
    realPackagePaths?: boolean;
    enableTypeRoots?: boolean;
    noTypeRootsInPackages?: boolean;
    /** Default false, Do not include linked package symlinks directory in path*/
    noSymlinks?: boolean;
    extraNodePath?: string[];
    extraTypeRoot?: string[];
}
export interface CompilerOptions {
    baseUrl: string;
    typeRoots: string[];
    paths?: {
        [path: string]: string[];
    };
    [prop: string]: ts.CompilerOptionsValue;
}
/**
 * Set "baseUrl", "paths" and "typeRoots" property relative to tsconfigDir, process.cwd()
 * and process.env.NODE_PATHS
 * @param tsconfigDir project directory where tsconfig file is (virtual),
 * "baseUrl", "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions
 * @param opts CompilerOptionSetOpt
 */
export declare function setTsCompilerOptForNodePath(tsconfigDir: string, baseUrl: string | undefined, assigneeOptions: Partial<CompilerOptions>, opts?: CompilerOptionSetOpt): CompilerOptions;
/**
 *
 * @param pathsDirs Node path like path information
 * @param tsconfigDir
 * @param assigneeOptions
 * @param opts
 */
export declare function appendTypeRoots(pathsDirs: string[], tsconfigDir: string, assigneeOptions: Partial<CompilerOptions>, opts: CompilerOptionSetOpt): void;
