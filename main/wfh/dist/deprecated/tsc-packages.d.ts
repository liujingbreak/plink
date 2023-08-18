import { Observable } from 'rxjs';
import { CompilerOptions } from 'typescript';
export interface Tsconfig {
    extends?: string;
    compilerOptions: {
        [key in keyof CompilerOptions]: any;
    };
    include?: string[];
    exclude?: string[];
    files?: string[];
    references?: {
        path: string;
    }[];
}
export interface TscCmdParam {
    package?: string[];
    project?: string[];
    watch?: boolean;
    sourceMap?: string;
    jsx?: boolean;
    ed?: boolean;
    compileOptions?: {
        [key in keyof CompilerOptions]: any;
    };
}
/**
 * All directories are relative to package real path
 */
export interface PackageJsonTscPropertyItem {
    rootDir: string;
    outDir: string;
    files?: string[];
    /** "references" in tsconfig https://www.typescriptlang.org/docs/handbook/project-references.html */
    references?: string[];
}
export type PackageJsonTscProperty = PackageJsonTscPropertyItem | PackageJsonTscPropertyItem[];
export declare function tsc(opts: TscCmdParam): Observable<unknown>;
export declare function generateTsconfigFiles(pkgs: Iterable<string>, opts: TscCmdParam): Observable<string>;
