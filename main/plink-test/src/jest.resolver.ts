/** Respect --preserve-symlink flag of Node.js
 */
import Path from 'node:path';
import resolve from 'resolve';
// import chalk from 'chalk';
import {packageOfFileFactory} from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
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

let getPkgOfFile: ReturnType<typeof packageOfFileFactory>['getPkgOfFile'];

export function sync(request: string, opts: ResolverOptions) {
  if (getPkgOfFile == null) {
    getPkgOfFile = packageOfFileFactory().getPkgOfFile;
  }
  let basedir = opts.basedir;
  if (!Path.isAbsolute(request) && !request.startsWith('.')) {
    const pkg = getPkgOfFile(opts.basedir);
    if (pkg) {
      const rel = Path.relative(pkg.realPath, opts.basedir);
      basedir = Path.resolve(pkg.path, rel);
      // eslint-disable-next-line no-console
      // console.log('resolve', chalk.yellow(request), opts.basedir, basedir);
    }
  }
  try {
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
    throw e;
  }
}

