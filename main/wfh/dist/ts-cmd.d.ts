import { PackageTsDirs } from './utils/misc';
import { CompilerOptions } from 'typescript';
import { CompilerOptions as RequiredCompilerOptions } from './package-mgr/package-list-helper';
export { RequiredCompilerOptions };
export interface TscCmdParam {
    package?: string[];
    project?: string[];
    watch?: boolean;
    sourceMap?: string;
    jsx?: boolean;
    ed?: boolean;
    /** merge compilerOptions "baseUrl" and "paths" from specified tsconfig file */
    mergeTsconfig?: string;
    pathsJsons?: string[];
    compileOptions?: {
        [key in keyof CompilerOptions]?: any;
    };
    overridePackgeDirs?: {
        [pkgName: string]: PackageTsDirs;
    };
}
/**
 * @param {object} argv
 * argv.watch: boolean
 * argv.package: string[]
 * @param {function} onCompiled () => void
 * @return void
 */
export declare function tsc(argv: TscCmdParam): string[];
