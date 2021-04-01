export declare function calcNodePaths(rootDir: string, symlinksDir: string | null, cwd: string, plinkDir: string): string[];
/**
 * Get environment variables predefined by
```
import {plinkEnv} from './utils/misc';
```
 */
export interface PlinkEnv {
    distDir: string;
    /** is Plink a symlink, Drcp is old name of Plink */
    isDrcpSymlink: boolean;
    rootDir: string;
    /** to allow Plink command line work for any directory other than process.cwd() */
    workDir: string;
    symlinkDirName: string | 'node_modules';
    nodePath: string[];
    plinkDir: string;
}
