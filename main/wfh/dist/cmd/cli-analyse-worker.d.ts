import 'source-map-support/register';
export declare class Context {
    alias: [reg: RegExp, replaceTo: string][];
    relativeDepsOutSideDir: Set<string>;
    cyclic: string[];
    canNotResolve: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[];
    externalDeps: Set<string>;
    matchAlias: string[];
    commonDir: string;
    constructor(commonDir: string, alias: [reg: RegExp, replaceTo: string][], relativeDepsOutSideDir?: Set<string>, cyclic?: string[], canNotResolve?: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[], externalDeps?: Set<string>, matchAlias?: string[]);
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
        matchAlias: string[];
    };
}
export declare function dfsTraverseFiles(files: string[], tsconfigFile: string | null | undefined, alias: [reg: string, replaceTo: string][]): ReturnType<Context['toPlainObject']>;
