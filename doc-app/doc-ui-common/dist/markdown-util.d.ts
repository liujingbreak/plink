import * as rx from 'rxjs';
import { TOC } from '../isom/md-types';
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
export declare function markdownToHtml(source: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>): rx.Observable<{
    toc: TOC[];
    content: string;
}>;
export declare function parseHtml(html: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>, transpileCode?: (language: string, innerHTML: string) => Promise<string> | rx.Observable<string> | void): rx.Observable<{
    toc: TOC[];
    content: string;
} | {
    toc: TOC[];
    content: string;
}>;
export declare function traverseTocTree(tocs: TOC[]): Generator<TOC>;
export declare function tocToString(tocs: TOC[]): string;
export declare function insertOrUpdateMarkdownToc(input: string): Promise<{
    changedMd: string;
    toc: string;
    html: string;
}>;
