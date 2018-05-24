export default class ChunkInfoPlugin {
    compiler: any;
    done: boolean;
    apply(compiler: any): void;
    printChunkGroups(compilation: any): Promise<void>;
    printChunks(chunks: any, compilation: any): void;
    moduleFileName(m: any): string;
    getChunkName(chunk: any): string;
    printChunksByEntry(compilation: any): void;
}
