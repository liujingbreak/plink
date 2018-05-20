export default class ChunkInfoPlugin {
    compiler: any;
    apply(compiler: any): void;
    printChunks(compilation: any, chunks: any[]): void;
    simpleModuleId(m: any): string;
    getChunkName(chunk: any): string;
    printChunksByEntry(compilation: any): void;
}
