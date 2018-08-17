import { Compiler } from 'webpack';
import { ReplacementInf } from '../utils/patch-text';
export interface IndexHtmlPluginOptions {
    indexHtml: string;
    inlineChunkNames: string[];
}
export default class IndexHtmlPlugin {
    options: IndexHtmlPluginOptions;
    inlineChunkSet: Set<any>;
    replacements: ReplacementInf[];
    constructor(options: IndexHtmlPluginOptions);
    apply(compiler: Compiler): void;
    replaceScriptTag(src: string, start: number, end: number): void;
}
