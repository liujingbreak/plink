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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL2ludGVybmFsL3dlYnBhY2stY29tbW9uL3RzL3NwbGl0Q2h1bmtzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLG9EQUF1QjtBQUV2QixNQUFNLElBQUksR0FBa0Q7SUFDMUQsWUFBWSxFQUFFLFFBQVE7SUFDdEIsV0FBVyxFQUFFO1FBQ1gsZ0JBQWdCLEVBQUUsUUFBUTtRQUMxQixNQUFNLEVBQUUsS0FBSztRQUNiLFdBQVcsRUFBRTtZQUNYLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsTUFBTSxFQUFFO2dCQUNOLElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixpQkFBaUI7Z0JBQ2pCLElBQUksRUFBRSwwQkFBMEI7Z0JBQ2hDLFFBQVEsRUFBRSxDQUFDO2FBQ1o7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLE1BQU0sRUFBRSxPQUFPO2dCQUNmLGlCQUFpQjtnQkFDakIsSUFBSSxFQUFFLDBCQUEwQjtnQkFDaEMsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsU0FBUyxFQUFFLENBQUM7YUFDYjtTQUNGO0tBQ0Y7Q0FDRixDQUFDO0FBT0YsU0FBd0IsZ0JBQWdCLENBQUMsTUFBd0IsRUFDL0QsZ0JBQXVDO0lBQ3ZDLElBQUksZ0JBQWdCLEVBQUU7UUFDcEIsTUFBTSxFQUFFLEdBQUksSUFBSSxDQUFDLFdBQTZDLENBQUMsV0FBNkQsQ0FBQztRQUM3SCxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksR0FBRyxnQkFBZ0IsQ0FBQztLQUN4RDtJQUNELElBQUksTUFBTSxDQUFDLFlBQVksSUFBSSxJQUFJO1FBQzdCLE1BQU0sQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQzNCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBVEQsbUNBU0M7QUFFRCxTQUFnQiwyQkFBMkIsQ0FBQyxNQUF3QjtJQUNsRSxPQUFPLGdCQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxrREFBa0QsQ0FBQyxDQUFDO0FBQzNFLENBQUM7QUFGRCxrRUFFQztBQUVELFNBQWdCLGFBQWEsQ0FBQyxNQUF3QixFQUFFLFNBQWlCLEVBQ3ZFLElBQTJCLEVBQzNCLFNBQWtELE9BQU87SUFDekQsTUFBTSxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLHNDQUFzQyxDQUFtRCxDQUFDO0lBQ3BILEdBQUcsQ0FBQyxTQUFTLENBQUMsR0FBRztRQUNmLElBQUksRUFBRSxTQUFTO1FBQ2YsTUFBTTtRQUNOLElBQUk7UUFDSixPQUFPLEVBQUUsSUFBSTtRQUNiLFFBQVEsRUFBRSxDQUFDO1FBQ1gsU0FBUyxFQUFFLE1BQU0sS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUN0QyxDQUFDO0FBQ0osQ0FBQztBQVpELHNDQVlDIiwiZmlsZSI6ImludGVybmFsL3dlYnBhY2stY29tbW9uL2Rpc3Qvc3BsaXRDaHVua3MuanMiLCJzb3VyY2VzQ29udGVudCI6W251bGxdfQ==
