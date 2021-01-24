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
}
