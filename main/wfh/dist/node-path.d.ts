/**
 * Get environment variables predefined by
```
const {isDrcpSymlink, symlinkDir, rootDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
```
 */
export interface PlinkEnv {
    isDrcpSymlink: boolean;
    rootDir: string;
    symlinkDir: string;
}
