import { PackageTsDirs } from './utils/misc';
import { CompilerOptions } from 'typescript';
export interface TscCmdParam {
    package?: string[];
    project?: string[];
    watch?: boolean;
    sourceMap?: string;
    jsx?: boolean;
    ed?: boolean;
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
