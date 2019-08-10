import ts from 'typescript';
export default class TsDependencyGraph {
    private co;
    private readFile?;
    walked: Set<string>;
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
    private _walk;
}
