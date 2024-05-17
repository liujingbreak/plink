/** Respect --preserve-symlink flag of Node.js
 */
import Path from 'node:path';
import resolve from 'resolve';
import {lookupTool} from './init-plink';
type PackageJSON = Record<string, any>;

type ResolverOptions = {
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


export function sync(request: string, opts: ResolverOptions) {
  let basedir = opts.basedir;
  let pkgPath: string | undefined;
  try {
    if (!Path.isAbsolute(request) && !request.startsWith('.')) {
      const pkg = lookupTool.dirMap.getData(opts.basedir);
      if (pkg) {
        pkgPath = lookupTool.packagePathMap!.get(pkg)!;
        const rel = Path.relative(pkgPath, opts.basedir);
        basedir = Path.resolve(pkgPath, rel);
      }
    }
    const file = resolve.sync(request, {
      basedir,
      extensions: opts.extensions,
      preserveSymlinks: true
    });
    return file;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
      return opts.defaultResolver(request, opts);
    }
    console.error('[jest.resolver] resolving failed request:', request + ',\n  options: ', opts, (pkgPath ? '\n  package: ' + pkgPath : ''), '\n  ', e);
    throw e;
  }
}

