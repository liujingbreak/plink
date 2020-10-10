import { PackageInfo } from './index';
export declare type PackageType = '*' | 'build' | 'core';
export declare function allPackages(_types?: PackageType | PackageType[], recipeType?: 'src' | 'installed', projectDirs?: string[]): Generator<PackageInfo>;
export declare function packages4WorkspaceKey(wsKey: string, includeInstalled?: boolean): Generator<PackageInfo, void, unknown>;
export declare function packages4Workspace(workspaceDir?: string, includeInstalled?: boolean): Generator<PackageInfo, void, unknown>;
