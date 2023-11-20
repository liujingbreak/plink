import * as rx from 'rxjs';
import { TOC } from '../isom/md-types';
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
export declare function markdownToHtml(source: string, srcFile: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>, resolveLink?: (link: string) => rx.Observable<string> | string): rx.Observable<{
    toc: TOC[];
    content: string;
}>;
export declare function traverseTocTree(tocs: TOC[]): Generator<TOC>;
export declare function tocToString(tocs: TOC[]): string;
export declare function insertOrUpdateMarkdownToc(input: string, srcFile: string): Promise<{
    changedMd: string;
    toc: string;
    html: string;
}>;
