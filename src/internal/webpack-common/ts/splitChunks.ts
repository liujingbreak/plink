import * as wp from 'webpack';
import _ from 'lodash';
import {OptimizationOptions, OptimizationSplitChunksOptions} from './webpack-infer-types';

const base: OptimizationOptions = {
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
        test: /[/\\]node_modules[\\/]/,
        priority: 1
      },
      lazyVendor: {
        name: 'lazy-vendor',
        chunks: 'async',
        // enforce: true,
        test: /[/\\]node_modules[\\/]/,
        priority: 1,
        minChunks: 2
      }
    }
  }
};

type CacheGroup = Exclude<NonNullable<OptimizationSplitChunksOptions['cacheGroups']> extends
// eslint-disable-next-line @typescript-eslint/ban-types
Record<string, infer K> ? K : unknown, string | Function | RegExp | false>;

export type ModuleTestFn = (
  module: wp.NormalModule, graphs: {chunkGraph: unknown; moduleGraph: unknown}
) => boolean;

export default function setupSplitChunks(config: wp.Configuration,
  vendorModuleTest: RegExp | ModuleTestFn) {
  if (vendorModuleTest) {
    const cp = (base.splitChunks as OptimizationSplitChunksOptions).cacheGroups!;
    (cp.lazyVendor as CacheGroup).test = (cp.vendor as CacheGroup).test = vendorModuleTest;
  }
  if (config.optimization == null)
    config.optimization = {};
  Object.assign(config.optimization, base);
}

export function getAngularVendorChunkTestFn(config: wp.Configuration): ModuleTestFn {
  return _.get(config, 'optimization.splitChunks.cacheGroups.vendor.test') as ModuleTestFn;
}

export function addSplitChunk(config: wp.Configuration, chunkName: string,
  test: RegExp | ModuleTestFn,
  chunks: OptimizationSplitChunksOptions['chunks'] = 'async') {
  const cps = _.get(config, 'optimization.splitChunks.cacheGroups') as NonNullable<OptimizationSplitChunksOptions['cacheGroups']>;
  cps[chunkName] = {
    name: chunkName,
    chunks,
    test,
    enforce: true,
    priority: 2,
    minChunks: chunks === 'async' ? 2 : 1
  };
}

