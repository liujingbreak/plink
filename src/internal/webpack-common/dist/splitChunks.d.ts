/// <reference types="webpack-dev-server" />
import * as wp from 'webpack';
export declare type ModuleTestFn = (normalModule: {
    nameForCondition?: () => string;
}, chunks: {
    name: string;
}[]) => boolean;
export default function setupSplitChunks(config: wp.Configuration, vendorModuleTest: RegExp | ModuleTestFn): void;
export declare function getAngularVendorChunkTestFn(config: wp.Configuration): ModuleTestFn;
export declare function addSplitChunk(config: wp.Configuration, chunkName: string, test: RegExp | ModuleTestFn, chunks?: wp.Options.SplitChunksOptions['chunks']): void;
