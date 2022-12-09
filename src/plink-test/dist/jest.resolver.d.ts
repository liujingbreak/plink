declare type PackageJSON = Record<string, any>;
declare type ResolverOptions = {
    /** Directory to begin resolving from. */
    basedir: string;
    /** List of export conditions. */
    conditions?: Array<string>;
    /** Instance of default resolver. */
    defaultResolver: (path: string, options: ResolverOptions) => string;
    /** List of file extensions to search in order. */
    extensions?: Array<string>;
    /** List of directory names to be looked up for modules recursively. */
    moduleDirectory?: Array<string>;
    /** List of `require.paths` to use if nothing is found in `node_modules`. */
    paths?: Array<string>;
    /** Allows transforming parsed `package.json` contents. */
    packageFilter?: (pkg: PackageJSON, file: string, dir: string) => PackageJSON;
    /** Allows transforms a path within a package. */
    pathFilter?: (pkg: PackageJSON, path: string, relativePath: string) => string;
    /** Current root directory. */
    rootDir?: string;
};
export declare function sync(request: string, opts: ResolverOptions): any;
export {};
