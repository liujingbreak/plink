export declare function calcNodePaths(rootDir: string, symlinksDir: string | null, cwd: string | undefined, plinkDir: string): string[];
/**
 * Get environment variables predefined by
```
const {isDrcpSymlink, symlinkDir, rootDir, nodePath, distDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
```
 */
export interface PlinkEnv {
    distDir: string;
    isDrcpSymlink: boolean;
    rootDir: string;
    symlinkDir: string | null;
    nodePath: string[];
    plinkDir: string;
}
