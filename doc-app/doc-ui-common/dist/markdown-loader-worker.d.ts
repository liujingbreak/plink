import * as rx from 'rxjs';
import { TOC } from '../isom/md-types';
export declare function toContentAndToc(source: string): Promise<{
    toc: TOC[];
    content: string;
}>;
export declare const testable: {
    parseHtml: typeof parseHtml;
};
declare function parseHtml(html: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string> | null | undefined): rx.Observable<{
    toc: TOC[];
    content: string;
}>;
export {};
