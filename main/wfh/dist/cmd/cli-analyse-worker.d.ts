import 'source-map-support/register';
export declare class Context {
    relativeDepsOutSideDir: Set<string>;
    cyclic: string[];
    canNotResolve: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[];
    externalDeps: Set<string>;
    commonDir: string;
    constructor(commonDir: string, relativeDepsOutSideDir?: Set<string>, cyclic?: string[], canNotResolve?: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[], externalDeps?: Set<string>);
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
    };
}
export declare function dfsTraverseFiles(files: string[]): ReturnType<Context['toPlainObject']>;
