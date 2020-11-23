import {Configuration} from 'webpack';
import Path from 'path';
import log4js from 'log4js';

const log = log4js.getLogger('@wfh/cra-scripts.webpack-lib');


/**
 * process.env.INLINE_RUNTIME_CHUNK = 'false' must be set before goes to react-scripts's webpack configure
 * 
 * entry file should be replaced with a server version App.tsx, which using staticRoute
 * @param buildPackage 
 * @param config 
 * @param nodePath 
 */
export function change(buildPackage: string, config: Configuration, nodePath: string[]) {
  // process.env.INLINE_RUNTIME_CHUNK = 'false';
  // config.mode = 'development';
  config.entry = [Path.resolve('./src/App.server.tsx')];
  // config.entry = [Path.resolve('./src/test.tsx')];
  config.output!.path = Path.resolve('ssr-build');
  config.output!.filename = '[name].js';
  config.output!.chunkFilename = '[name].chunk.js';
  config.output!.libraryTarget = 'commonjs';

  config.resolve!.mainFields = ['main', 'module', 'browser'];
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
    (context: string, request: string, callback: (error?: null, result?: string) => void) => {

      // Absolute & Relative paths are not externals
      if (/^\.{0,2}\//.test(request) || Path.isAbsolute(request)) {
        return callback();
      }
      try {
        require.resolve(request);
        callback(null, 'commonjs ' + request);
      } catch {
        log.info('bundled', request);
        // Node couldn't find it, so it must be user-aliased
        callback();
      }
    }
  ];
  return config;
}
