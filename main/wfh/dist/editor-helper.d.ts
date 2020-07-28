import { PackageInfo } from './package-mgr';
export declare function writeTsconfig4project(projectDirs: string[], onGitIgnoreFileUpdate: (file: string, content: string) => void): void;
export declare function writeTsconfigForEachPackage(workspaceDir: string, pks: PackageInfo[], onGitIgnoreFileUpdate: (file: string, content: string) => void): Promise<void>;
