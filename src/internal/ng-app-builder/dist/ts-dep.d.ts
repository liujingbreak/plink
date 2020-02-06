import ts from 'typescript';
export default class TsDependencyGraph {
    private co;
    private readFile?;
    requestMap: Map<string, string[]>;
    /**
     * Angular style lazy route loading grammar
     */
    loadChildren: Set<string>;
    toWalk: string[];
    private resCache;
    private host;
    private replacements;
    constructor(co: ts.CompilerOptions, fileReplacements?: {
        replace?: string;
        src?: string;
        with?: string;
        replaceWidth?: string;
    }[], readFile?: ((file: string) => string) | undefined);
    /**
     * @param file must be absolute path
     */
    walkForDependencies(file: string): void;
    report(logFile: string): Promise<unknown>;
    /**
     *
     * @param requestDep
     * @param by
     * @returns true if it is requested at first time
     */
    private checkResolved;
    private _walk;
}
