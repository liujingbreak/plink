import 'source-map-support/register';
export declare class Context {
    alias: [reg: RegExp, replaceTo: string][];
    ignorePattern?: RegExp | undefined;
    relativeDepsOutSideDir: Set<string>;
    cyclic: string[];
    canNotResolve: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[];
    externalDeps: Set<string>;
    nodeModuleDeps: Set<string>;
    matchAlias: Set<string>;
    commonDir: string;
    /** traversed files */
    topSortedFiles: string[];
    ignorePkgName: string | undefined;
    constructor(commonDir: string, alias: [reg: RegExp, replaceTo: string][], ignorePattern?: RegExp | undefined, relativeDepsOutSideDir?: Set<string>, cyclic?: string[], canNotResolve?: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[], externalDeps?: Set<string>, nodeModuleDeps?: Set<string>, matchAlias?: Set<string>);
    toPlainObject(): {
        commonDir: string;
        relativeDepsOutSideDir: string[];
        cyclic: string[];
        canNotResolve: {
            target: string;
            file: string;
            pos: string;
            reasone: string;
        }[];
        externalDeps: string[];
        nodeModuleDeps: string[];
        matchAlias: string[];
        files: string[];
    };
}
export declare function dfsTraverseFiles(files: string[], tsconfigFile: string | null | undefined, alias: [reg: string, replaceTo: string][], ignore?: string): ReturnType<Context['toPlainObject']>;
