import { TOC } from '../isom/md-types';
export declare function toContentAndToc(source: string): Promise<{
    toc: TOC[];
    content: string;
}>;
