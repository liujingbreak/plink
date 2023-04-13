import { default as _ts } from 'typescript';
import { PackageTsDirs } from './utils/misc';
import { CompilerOptions as RequiredCompilerOptions } from './package-mgr/package-list-helper';
export { RequiredCompilerOptions };
export interface TscCmdParam {
    package?: string[];
    project?: string[];
    watch?: boolean;
    poll?: boolean;
    sourceMap?: string;
    jsx?: boolean;
    ed?: boolean;
    /** merge compilerOptions "baseUrl" and "paths" from specified tsconfig file */
    mergeTsconfig?: string;
    /** JSON string, to be merged to compilerOptions "paths",
     * be aware that "paths" should be relative to "baseUrl" which is relative to `PlinkEnv.workDir`
     * */
    pathsJsons?: Array<string> | {
        [path: string]: string[];
    };
    /**
     * Partial compiler options to be merged, except "baseUrl".
     * "paths" should be relative to `plinkEnv.workDir`
     */
    compilerOptions?: any;
    overridePackgeDirs?: {
        [pkgName: string]: PackageTsDirs;
    };
}
export declare function tsc(argv: TscCmdParam, ts?: typeof _ts): Promise<string[]>;
