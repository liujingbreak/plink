"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// export function sync(request: string, opts: ResolverOptions) {
//   let basedir = opts.basedir;
//   let pkgPath: string | undefined;
//   try {
//     if (!Path.isAbsolute(request) && !request.startsWith('.')) {
//       const pkg = lookupPackage(opts.basedir);
//       if (pkg) {
//         pkgPath = lookupTool.packagePathMap!.get(pkg)!;
//         const rel = Path.relative(pkgPath, opts.basedir);
//         basedir = Path.resolve(pkgPath, rel);
//       }
//     }
//     const file = resolve.sync(request, {
//       basedir,
//       extensions: opts.extensions,
//       preserveSymlinks: true
//     });
//     return file;
//   } catch (e) {
//     if ((e as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
//       return opts.defaultResolver(request, opts);
//     }
//     console.error('[jest.resolver] resolving failed request:', request + ',\n  options: ', opts, (pkgPath ? '\n  package: ' + pkgPath : ''), '\n  ', e);
//     throw e;
//   }
// }
//# sourceMappingURL=jest.resolver.js.map