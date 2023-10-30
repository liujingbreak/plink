import * as wp from 'webpack';
import { OptimizationSplitChunksOptions } from './webpack-infer-types';
export type ModuleTestFn = (module: wp.NormalModule, graphs: {
    chunkGraph: unknown;
    moduleGraph: unknown;
}) => boolean;
export default function setupSplitChunks(config: wp.Configuration, vendorModuleTest: RegExp | ModuleTestFn): void;
export declare function getAngularVendorChunkTestFn(config: wp.Configuration): ModuleTestFn;
export declare function addSplitChunk(config: wp.Configuration, chunkName: string, test: RegExp | ModuleTestFn, chunks?: OptimizationSplitChunksOptions['chunks']): void;
