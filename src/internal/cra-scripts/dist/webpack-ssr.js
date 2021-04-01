"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.change = void 0;
const path_1 = __importDefault(require("path"));
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
            name: true,
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
        (context, request, callback) => {
            // Absolute & Relative paths are not externals
            if (/^\.{0,2}\//.test(request) || path_1.default.isAbsolute(request)) {
                return callback();
            }
            try {
                require.resolve(request);
                callback(null, 'commonjs ' + request);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VicGFjay1zc3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3ZWJwYWNrLXNzci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxnREFBd0I7QUFDeEIsc0NBQTRDO0FBRTVDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUc3RDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsTUFBTSxDQUFDLFlBQW9CLEVBQUUsTUFBcUIsRUFBRSxRQUFrQjtJQUNwRiw4Q0FBOEM7SUFDOUMsK0JBQStCO0lBQy9CLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztJQUN0RCxtREFBbUQ7SUFDbkQsTUFBTSxDQUFDLE1BQU8sQ0FBQyxJQUFJLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNoRCxNQUFNLENBQUMsTUFBTyxDQUFDLFFBQVEsR0FBRyxXQUFXLENBQUM7SUFDdEMsTUFBTSxDQUFDLE1BQU8sQ0FBQyxhQUFhLEdBQUcsaUJBQWlCLENBQUM7SUFDakQsTUFBTSxDQUFDLE1BQU8sQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDO0lBRTFDLE1BQU0sQ0FBQyxPQUFRLENBQUMsVUFBVSxHQUFHLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUMzRCxNQUFNLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN2QixNQUFNLENBQUMsWUFBWSxHQUFHO1FBQ3BCLFFBQVEsRUFBRSxLQUFLO1FBQ2YsMEJBQTBCO1FBQzFCLFdBQVcsRUFBRTtZQUNYLE1BQU0sRUFBRSxLQUFLO1lBQ2IsSUFBSSxFQUFFLElBQUk7WUFDVixXQUFXLEVBQUU7Z0JBQ1gsVUFBVSxFQUFFO29CQUNWLElBQUksRUFBRSxhQUFhO29CQUNuQixNQUFNLEVBQUUsT0FBTztvQkFDZixPQUFPLEVBQUUsSUFBSTtvQkFDYixJQUFJLEVBQUUsd0JBQXdCO29CQUM5QixRQUFRLEVBQUUsQ0FBQztpQkFDWjthQUNGO1NBQ0Y7S0FDRixDQUFDO0lBRUYsTUFBTSxDQUFDLFNBQVMsR0FBRztRQUNqQixpQkFBaUI7UUFDakIsbUJBQW1CO1FBQ25CLGtCQUFrQjtRQUNsQixzQkFBc0I7UUFDdEIsY0FBYztRQUNkLGVBQWU7UUFDZixDQUFDLE9BQWUsRUFBRSxPQUFlLEVBQUUsUUFBaUQsRUFBRSxFQUFFO1lBRXRGLDhDQUE4QztZQUM5QyxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksY0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDMUQsT0FBTyxRQUFRLEVBQUUsQ0FBQzthQUNuQjtZQUNELElBQUk7Z0JBQ0YsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDekIsUUFBUSxDQUFDLElBQUksRUFBRSxXQUFXLEdBQUcsT0FBTyxDQUFDLENBQUM7YUFDdkM7WUFBQyxXQUFNO2dCQUNOLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUM3QixvREFBb0Q7Z0JBQ3BELFFBQVEsRUFBRSxDQUFDO2FBQ1o7UUFDSCxDQUFDO0tBQ0YsQ0FBQztJQUNGLE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUF0REQsd0JBc0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtDb25maWd1cmF0aW9ufSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtsb2dnZXIgYXMgbG9nNGpzfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignQHdmaC9jcmEtc2NyaXB0cy53ZWJwYWNrLWxpYicpO1xuXG5cbi8qKlxuICogcHJvY2Vzcy5lbnYuSU5MSU5FX1JVTlRJTUVfQ0hVTksgPSAnZmFsc2UnIG11c3QgYmUgc2V0IGJlZm9yZSBnb2VzIHRvIHJlYWN0LXNjcmlwdHMncyB3ZWJwYWNrIGNvbmZpZ3VyZVxuICogXG4gKiBlbnRyeSBmaWxlIHNob3VsZCBiZSByZXBsYWNlZCB3aXRoIGEgc2VydmVyIHZlcnNpb24gQXBwLnRzeCwgd2hpY2ggdXNpbmcgc3RhdGljUm91dGVcbiAqIEBwYXJhbSBidWlsZFBhY2thZ2UgXG4gKiBAcGFyYW0gY29uZmlnIFxuICogQHBhcmFtIG5vZGVQYXRoIFxuICovXG5leHBvcnQgZnVuY3Rpb24gY2hhbmdlKGJ1aWxkUGFja2FnZTogc3RyaW5nLCBjb25maWc6IENvbmZpZ3VyYXRpb24sIG5vZGVQYXRoOiBzdHJpbmdbXSkge1xuICAvLyBwcm9jZXNzLmVudi5JTkxJTkVfUlVOVElNRV9DSFVOSyA9ICdmYWxzZSc7XG4gIC8vIGNvbmZpZy5tb2RlID0gJ2RldmVsb3BtZW50JztcbiAgY29uZmlnLmVudHJ5ID0gW1BhdGgucmVzb2x2ZSgnLi9zcmMvQXBwLnNlcnZlci50c3gnKV07XG4gIC8vIGNvbmZpZy5lbnRyeSA9IFtQYXRoLnJlc29sdmUoJy4vc3JjL3Rlc3QudHN4JyldO1xuICBjb25maWcub3V0cHV0IS5wYXRoID0gUGF0aC5yZXNvbHZlKCdzc3ItYnVpbGQnKTtcbiAgY29uZmlnLm91dHB1dCEuZmlsZW5hbWUgPSAnW25hbWVdLmpzJztcbiAgY29uZmlnLm91dHB1dCEuY2h1bmtGaWxlbmFtZSA9ICdbbmFtZV0uY2h1bmsuanMnO1xuICBjb25maWcub3V0cHV0IS5saWJyYXJ5VGFyZ2V0ID0gJ2NvbW1vbmpzJztcblxuICBjb25maWcucmVzb2x2ZSEubWFpbkZpZWxkcyA9IFsnbWFpbicsICdtb2R1bGUnLCAnYnJvd3NlciddO1xuICBjb25maWcudGFyZ2V0ID0gJ25vZGUnO1xuICBjb25maWcub3B0aW1pemF0aW9uID0ge1xuICAgIG1pbmltaXplOiBmYWxzZSxcbiAgICAvLyBydW50aW1lQ2h1bms6ICdzaW5nbGUnLFxuICAgIHNwbGl0Q2h1bmtzOiB7XG4gICAgICBjaHVua3M6ICdhbGwnLFxuICAgICAgbmFtZTogdHJ1ZSxcbiAgICAgIGNhY2hlR3JvdXBzOiB7XG4gICAgICAgIGxhenlWZW5kb3I6IHtcbiAgICAgICAgICBuYW1lOiAnbGF6eS12ZW5kb3InLFxuICAgICAgICAgIGNodW5rczogJ2FzeW5jJyxcbiAgICAgICAgICBlbmZvcmNlOiB0cnVlLFxuICAgICAgICAgIHRlc3Q6IC9bXFxcXC9dbm9kZV9tb2R1bGVzW1xcXFwvXS8sXG4gICAgICAgICAgcHJpb3JpdHk6IDFcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBjb25maWcuZXh0ZXJuYWxzID0gW1xuICAgIC9ecnhqcygkfFsvXFxcXF0pL2ksXG4gICAgL15sb2Rhc2goJHxbL1xcXFxdKS9pLFxuICAgIC9ecmVhY3QoJHxbL1xcXFxdKS9pLFxuICAgIC9ecmVhY3QtZG9tKCR8Wy9cXFxcXSkvaSxcbiAgICAvLyBleHRlcm5hbHMoKVxuICAgIC8vIC9eQGFuZ3VsYXIvLFxuICAgIChjb250ZXh0OiBzdHJpbmcsIHJlcXVlc3Q6IHN0cmluZywgY2FsbGJhY2s6IChlcnJvcj86IG51bGwsIHJlc3VsdD86IHN0cmluZykgPT4gdm9pZCkgPT4ge1xuXG4gICAgICAvLyBBYnNvbHV0ZSAmIFJlbGF0aXZlIHBhdGhzIGFyZSBub3QgZXh0ZXJuYWxzXG4gICAgICBpZiAoL15cXC57MCwyfVxcLy8udGVzdChyZXF1ZXN0KSB8fCBQYXRoLmlzQWJzb2x1dGUocmVxdWVzdCkpIHtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCk7XG4gICAgICB9XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlLnJlc29sdmUocmVxdWVzdCk7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsICdjb21tb25qcyAnICsgcmVxdWVzdCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgbG9nLmluZm8oJ2J1bmRsZWQnLCByZXF1ZXN0KTtcbiAgICAgICAgLy8gTm9kZSBjb3VsZG4ndCBmaW5kIGl0LCBzbyBpdCBtdXN0IGJlIHVzZXItYWxpYXNlZFxuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfVxuICAgIH1cbiAgXTtcbiAgcmV0dXJuIGNvbmZpZztcbn1cbiJdfQ==