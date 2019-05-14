import { Compiler } from 'webpack';
export interface IndexHtmlPluginOptions {
    indexFile: string;
    inlineChunkNames: string[];
}
export default class IndexHtmlPlugin {
    options: IndexHtmlPluginOptions;
    inlineChunkSet: Set<any>;
    indexOutputPath: string;
    constructor(options: IndexHtmlPluginOptions);
    apply(compiler: Compiler): void;
}
