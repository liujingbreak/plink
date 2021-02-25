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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsaXRDaHVua3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzcGxpdENodW5rcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxvREFBdUI7QUFFdkIsTUFBTSxJQUFJLEdBQWtEO0lBQzFELFlBQVksRUFBRSxRQUFRO0lBQ3RCLFdBQVcsRUFBRTtRQUNYLGdCQUFnQixFQUFFLFFBQVE7UUFDMUIsTUFBTSxFQUFFLEtBQUs7UUFDYixXQUFXLEVBQUU7WUFDWCxjQUFjLEVBQUUsS0FBSztZQUNyQixPQUFPLEVBQUUsS0FBSztZQUNkLE1BQU0sRUFBRTtnQkFDTixJQUFJLEVBQUUsUUFBUTtnQkFDZCxNQUFNLEVBQUUsU0FBUztnQkFDakIsaUJBQWlCO2dCQUNqQixJQUFJLEVBQUUsMEJBQTBCO2dCQUNoQyxRQUFRLEVBQUUsQ0FBQzthQUNaO1lBQ0QsVUFBVSxFQUFFO2dCQUNWLElBQUksRUFBRSxhQUFhO2dCQUNuQixNQUFNLEVBQUUsT0FBTztnQkFDZixpQkFBaUI7Z0JBQ2pCLElBQUksRUFBRSwwQkFBMEI7Z0JBQ2hDLFFBQVEsRUFBRSxDQUFDO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2FBQ2I7U0FDRjtLQUNGO0NBQ0YsQ0FBQztBQU9GLFNBQXdCLGdCQUFnQixDQUFDLE1BQXdCLEVBQy9ELGdCQUF1QztJQUN2QyxJQUFJLGdCQUFnQixFQUFFO1FBQ3BCLE1BQU0sRUFBRSxHQUFJLElBQUksQ0FBQyxXQUE2QyxDQUFDLFdBQTZELENBQUM7UUFDN0gsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7S0FDeEQ7SUFDRCxJQUFJLE1BQU0sQ0FBQyxZQUFZLElBQUksSUFBSTtRQUM3QixNQUFNLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztJQUMzQixNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQVRELG1DQVNDO0FBRUQsU0FBZ0IsMkJBQTJCLENBQUMsTUFBd0I7SUFDbEUsT0FBTyxnQkFBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsa0RBQWtELENBQUMsQ0FBQztBQUMzRSxDQUFDO0FBRkQsa0VBRUM7QUFFRCxTQUFnQixhQUFhLENBQUMsTUFBd0IsRUFBRSxTQUFpQixFQUN2RSxJQUEyQixFQUMzQixTQUFrRCxPQUFPO0lBQ3pELE1BQU0sR0FBRyxHQUFHLGdCQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxzQ0FBc0MsQ0FBbUQsQ0FBQztJQUNwSCxHQUFHLENBQUMsU0FBUyxDQUFDLEdBQUc7UUFDZixJQUFJLEVBQUUsU0FBUztRQUNmLE1BQU07UUFDTixJQUFJO1FBQ0osT0FBTyxFQUFFLElBQUk7UUFDYixRQUFRLEVBQUUsQ0FBQztRQUNYLFNBQVMsRUFBRSxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdEMsQ0FBQztBQUNKLENBQUM7QUFaRCxzQ0FZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHdwIGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcblxuY29uc3QgYmFzZTogTm9uTnVsbGFibGU8d3AuQ29uZmlndXJhdGlvblsnb3B0aW1pemF0aW9uJ10+ID0ge1xuICBydW50aW1lQ2h1bms6ICdzaW5nbGUnLFxuICBzcGxpdENodW5rczoge1xuICAgIG1heEFzeW5jUmVxdWVzdHM6IEluZmluaXR5LFxuICAgIGNodW5rczogJ2FsbCcsXG4gICAgY2FjaGVHcm91cHM6IHtcbiAgICAgIGRlZmF1bHRWZW5kb3JzOiBmYWxzZSxcbiAgICAgIHZlbmRvcnM6IGZhbHNlLFxuICAgICAgdmVuZG9yOiB7XG4gICAgICAgIG5hbWU6ICd2ZW5kb3InLFxuICAgICAgICBjaHVua3M6ICdpbml0aWFsJyxcbiAgICAgICAgLy8gZW5mb3JjZTogdHJ1ZSxcbiAgICAgICAgdGVzdDogL1tcXC9cXFxcXW5vZGVfbW9kdWxlc1tcXFxcXFwvXS8sXG4gICAgICAgIHByaW9yaXR5OiAxXG4gICAgICB9LFxuICAgICAgbGF6eVZlbmRvcjoge1xuICAgICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgICBjaHVua3M6ICdhc3luYycsXG4gICAgICAgIC8vIGVuZm9yY2U6IHRydWUsXG4gICAgICAgIHRlc3Q6IC9bXFwvXFxcXF1ub2RlX21vZHVsZXNbXFxcXFxcL10vLFxuICAgICAgICBwcmlvcml0eTogMSxcbiAgICAgICAgbWluQ2h1bmtzOiAyXG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnQgdHlwZSBNb2R1bGVUZXN0Rm4gPSAoXG4gIG5vcm1hbE1vZHVsZTogeyBuYW1lRm9yQ29uZGl0aW9uPzogKCkgPT4gc3RyaW5nIH0sXG4gIGNodW5rczoge25hbWU6IHN0cmluZ31bXVxuKSA9PiBib29sZWFuO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBzZXR1cFNwbGl0Q2h1bmtzKGNvbmZpZzogd3AuQ29uZmlndXJhdGlvbixcbiAgdmVuZG9yTW9kdWxlVGVzdDogUmVnRXhwIHwgTW9kdWxlVGVzdEZuKSB7XG4gIGlmICh2ZW5kb3JNb2R1bGVUZXN0KSB7XG4gICAgY29uc3QgY3AgPSAoYmFzZS5zcGxpdENodW5rcyBhcyB3cC5PcHRpb25zLlNwbGl0Q2h1bmtzT3B0aW9ucykuY2FjaGVHcm91cHMgYXMge1trZXk6IHN0cmluZ106IHdwLk9wdGlvbnMuQ2FjaGVHcm91cHNPcHRpb25zfTtcbiAgICBjcC5sYXp5VmVuZG9yLnRlc3QgPSBjcC52ZW5kb3IudGVzdCA9IHZlbmRvck1vZHVsZVRlc3Q7XG4gIH1cbiAgaWYgKGNvbmZpZy5vcHRpbWl6YXRpb24gPT0gbnVsbClcbiAgICBjb25maWcub3B0aW1pemF0aW9uID0ge307XG4gIE9iamVjdC5hc3NpZ24oY29uZmlnLm9wdGltaXphdGlvbiwgYmFzZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBbmd1bGFyVmVuZG9yQ2h1bmtUZXN0Rm4oY29uZmlnOiB3cC5Db25maWd1cmF0aW9uKTogTW9kdWxlVGVzdEZuIHtcbiAgcmV0dXJuIF8uZ2V0KGNvbmZpZywgJ29wdGltaXphdGlvbi5zcGxpdENodW5rcy5jYWNoZUdyb3Vwcy52ZW5kb3IudGVzdCcpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYWRkU3BsaXRDaHVuayhjb25maWc6IHdwLkNvbmZpZ3VyYXRpb24sIGNodW5rTmFtZTogc3RyaW5nLFxuICB0ZXN0OiBSZWdFeHAgfCBNb2R1bGVUZXN0Rm4sXG4gIGNodW5rczogd3AuT3B0aW9ucy5TcGxpdENodW5rc09wdGlvbnNbJ2NodW5rcyddID0gJ2FzeW5jJykge1xuICBjb25zdCBjcHMgPSBfLmdldChjb25maWcsICdvcHRpbWl6YXRpb24uc3BsaXRDaHVua3MuY2FjaGVHcm91cHMnKSBhcyB7W2tleTogc3RyaW5nXTogd3AuT3B0aW9ucy5DYWNoZUdyb3Vwc09wdGlvbnN9O1xuICBjcHNbY2h1bmtOYW1lXSA9IHtcbiAgICBuYW1lOiBjaHVua05hbWUsXG4gICAgY2h1bmtzLFxuICAgIHRlc3QsXG4gICAgZW5mb3JjZTogdHJ1ZSxcbiAgICBwcmlvcml0eTogMixcbiAgICBtaW5DaHVua3M6IGNodW5rcyA9PT0gJ2FzeW5jJyA/IDIgOiAxXG4gIH07XG59XG4iXX0=