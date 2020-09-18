import * as wp from 'webpack';
import _ from 'lodash';

const base: NonNullable<wp.Configuration['optimization']> = {
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

export type ModuleTestFn = (
  normalModule: { nameForCondition?: () => string },
  chunks: {name: string}[]
) => boolean;

export default function setupSplitChunks(config: wp.Configuration,
  vendorModuleTest: RegExp | ModuleTestFn) {
  if (vendorModuleTest) {
    const cp = (base.splitChunks as wp.Options.SplitChunksOptions).cacheGroups as {[key: string]: wp.Options.CacheGroupsOptions};
    cp.lazyVendor.test = cp.vendor.test = vendorModuleTest;
  }
  Object.assign(config, base);
}

export function getAngularVendorChunkTestFn(config: wp.Configuration): ModuleTestFn {
  return _.get(config, 'optimization.splitChunks.cacheGroups.vendor.test');
}

export function addSplitChunk(config: wp.Configuration, chunkName: string,
  test: RegExp | ModuleTestFn,
  chunks: wp.Options.SplitChunksOptions['chunks'] = 'async') {
  const cps = _.get(config, 'optimization.splitChunks.cacheGroups') as {[key: string]: wp.Options.CacheGroupsOptions};
  cps[chunkName] = {
    name: chunkName,
    chunks,
    test,
    enforce: true,
    priority: 2,
    minChunks: chunks === 'async' ? 2 : 1
  };
}
