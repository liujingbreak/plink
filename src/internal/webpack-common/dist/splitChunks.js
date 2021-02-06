"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSplitChunk = exports.getAngularVendorChunkTestFn = void 0;
const lodash_1 = __importDefault(require("lodash"));
const base = {
    runtimeChunk: 'single',
    splitChunks: {
        maxAsyncRequests: Infinity,
        chunks: 'all',
        cacheGroups: {
            defaultVendors: false,
            vendors: false,
            vendor: {
                name: 'vendor',
                chunks: 'initial',
                // enforce: true,
                test: /[\/\\]node_modules[\\\/]/,
                priority: 1
            },
            lazyVendor: {
                name: 'lazy-vendor',
                chunks: 'async',
                // enforce: true,
                test: /[\/\\]node_modules[\\\/]/,
                priority: 1,
                minChunks: 2
            }
        }
    }
};
function setupSplitChunks(config, vendorModuleTest) {
    if (vendorModuleTest) {
        const cp = base.splitChunks.cacheGroups;
        cp.lazyVendor.test = cp.vendor.test = vendorModuleTest;
    }
    if (config.optimization == null)
        config.optimization = {};
    Object.assign(config.optimization, base);
}
exports.default = setupSplitChunks;
function getAngularVendorChunkTestFn(config) {
    return lodash_1.default.get(config, 'optimization.splitChunks.cacheGroups.vendor.test');
}
exports.getAngularVendorChunkTestFn = getAngularVendorChunkTestFn;
function addSplitChunk(config, chunkName, test, chunks = 'async') {
    const cps = lodash_1.default.get(config, 'optimization.splitChunks.cacheGroups');
    cps[chunkName] = {
        name: chunkName,
        chunks,
        test,
        enforce: true,
        priority: 2,
        minChunks: chunks === 'async' ? 2 : 1
    };
}
exports.addSplitChunk = addSplitChunk;
//# sourceMappingURL=splitChunks.js.map