/**
 * Get environment variables predefined by
```
import {plinkEnv} from './utils/misc';
```
 */
export interface PlinkEnv {
    distDir: string;
    /** whether Plink is a symlink, Drcp is old name of Plink */
    isDrcpSymlink: boolean;
    rootDir: string;
    /** current worktree space directory */
    workDir: string;
    symlinkDirName: string | 'node_modules';
    nodePath: string[];
    plinkDir: string;
}
