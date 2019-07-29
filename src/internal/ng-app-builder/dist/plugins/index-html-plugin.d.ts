/**
 * Same function as react-dev-utils/InlineChunkHtmlPlugin, but does not rely on HtmlWebpackPlugin
 */
import { Compiler } from 'webpack';
export interface IndexHtmlPluginOptions {
    indexFile: string;
    inlineChunkNames: string[];
    baseHref?: string;
}
export default class IndexHtmlPlugin {
    options: IndexHtmlPluginOptions;
    inlineChunkSet: Set<string>;
    indexOutputPath: string;
    constructor(options: IndexHtmlPluginOptions);
    apply(compiler: Compiler): void;
}
export declare function transformHtml(this: void, html: string, buildOptions: {
    baseHref?: string;
}, inlineReplace: (srcUrl: string) => string | null | void): Promise<string>;
