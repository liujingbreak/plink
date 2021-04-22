import * as rx from 'rxjs';
import { TOC } from '../isom/md-types';
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
export declare function markdownToHtml(source: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>): Promise<{
    toc: TOC[];
    content: string;
}>;
