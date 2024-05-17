"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = void 0;
const tslib_1 = require("tslib");
/** Respect --preserve-symlink flag of Node.js
 */
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const resolve_1 = tslib_1.__importDefault(require("resolve"));
const init_plink_1 = require("./init-plink");
function sync(request, opts) {
    let basedir = opts.basedir;
    let pkgPath;
    try {
        if (!node_path_1.default.isAbsolute(request) && !request.startsWith('.')) {
            const pkg = init_plink_1.lookupTool.dirMap.getData(opts.basedir);
            if (pkg) {
                pkgPath = init_plink_1.lookupTool.packagePathMap.get(pkg);
                const rel = node_path_1.default.relative(pkgPath, opts.basedir);
                basedir = node_path_1.default.resolve(pkgPath, rel);
            }
        }
        const file = resolve_1.default.sync(request, {
            basedir,
            extensions: opts.extensions,
            preserveSymlinks: true
        });
        return file;
    }
    catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            return opts.defaultResolver(request, opts);
        }
        console.error('[jest.resolver] resolving failed request:', request + ',\n  options: ', opts, (pkgPath ? '\n  package: ' + pkgPath : ''), '\n  ', e);
        throw e;
    }
}
exports.sync = sync;
//# sourceMappingURL=jest.resolver.js.map