export default class ChunkInfoPlugin {
    compiler: any;
    apply(compiler: any): void;
    printChunkGroups(compilation: any): Promise<void>;
    printChunks(chunks: any, compilation: any): void;
    simpleModuleId(m: any): string;
    getChunkName(chunk: any): string;
    printChunksByEntry(compilation: any): void;
}
