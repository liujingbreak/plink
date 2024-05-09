"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sync = void 0;
const tslib_1 = require("tslib");
/** Respect --preserve-symlink flag of Node.js
 */
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const resolve_1 = tslib_1.__importDefault(require("resolve"));
// import chalk from 'chalk';
const package_info_gathering_1 = require("@wfh/plink/wfh/dist/package-mgr/package-info-gathering");
let getPkgOfFile;
function sync(request, opts) {
    if (getPkgOfFile == null) {
        getPkgOfFile = (0, package_info_gathering_1.packageOfFileFactory)().getPkgOfFile;
    }
    let basedir = opts.basedir;
    if (!node_path_1.default.isAbsolute(request) && !request.startsWith('.')) {
        const pkg = getPkgOfFile(opts.basedir);
        if (pkg) {
            const rel = node_path_1.default.relative(pkg.realPath, opts.basedir);
            basedir = node_path_1.default.resolve(pkg.path, rel);
            // eslint-disable-next-line no-console
            // console.log('resolve', chalk.yellow(request), opts.basedir, basedir);
        }
    }
    try {
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
        throw e;
    }
}
exports.sync = sync;
//# sourceMappingURL=jest.resolver.js.map