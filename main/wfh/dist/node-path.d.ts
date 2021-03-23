export declare function calcNodePaths(rootDir: string, symlinksDir: string | null, cwd: string | undefined, plinkDir: string): string[];
/**
 * Get environment variables predefined by
```
const {isDrcpSymlink, symlinkDirName, rootDir, nodePath, distDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
```
 */
export interface PlinkEnv {
    distDir: string;
    /** is Plink a symlink, Drcp is old name of Plink */
    isDrcpSymlink: boolean;
    rootDir: string;
    symlinkDirName: string | 'node_modules';
    nodePath: string[];
    plinkDir: string;
}
