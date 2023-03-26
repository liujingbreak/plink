"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.change = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const plink_1 = require("@wfh/plink");
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack-lib');
/**
 * process.env.INLINE_RUNTIME_CHUNK = 'false' must be set before goes to react-scripts's webpack configure
 *
 * entry file should be replaced with a server version App.tsx, which using staticRoute
 * @param buildPackage
 * @param config
 * @param nodePath
 */
function change(buildPackage, config, nodePath) {
    // process.env.INLINE_RUNTIME_CHUNK = 'false';
    // config.mode = 'development';
    config.entry = [path_1.default.resolve('./src/App.server.tsx')];
    // config.entry = [Path.resolve('./src/test.tsx')];
    config.output.path = path_1.default.resolve('ssr-build');
    config.output.filename = '[name].js';
    config.output.chunkFilename = '[name].chunk.js';
    config.output.libraryTarget = 'commonjs';
    config.resolve.mainFields = ['main', 'module', 'browser'];
    config.target = 'node';
    config.optimization = {
        minimize: false,
        // runtimeChunk: 'single',
        splitChunks: {
            chunks: 'all',
            name: false,
            cacheGroups: {
                lazyVendor: {
                    name: 'lazy-vendor',
                    chunks: 'async',
                    enforce: true,
                    test: /[\\/]node_modules[\\/]/,
                    priority: 1
                }
            }
        }
    };
    config.externals = [
        /^rxjs($|[/\\])/i,
        /^lodash($|[/\\])/i,
        /^react($|[/\\])/i,
        /^react-dom($|[/\\])/i,
        // externals()
        // /^@angular/,
        ({ request }, callback) => {
            if (request == null)
                return callback();
            // Absolute & Relative paths are not externals
            if (/^\.{0,2}\//.test(request) || path_1.default.isAbsolute(request)) {
                return callback();
            }
            try {
                require.resolve(request);
                callback(undefined, 'commonjs ' + request);
            }
            catch (_a) {
                log.info('bundled', request);
                // Node couldn't find it, so it must be user-aliased
                callback();
            }
        }
    ];
    return config;
}
exports.change = change;
//# sourceMappingURL=webpack-ssr.js.map