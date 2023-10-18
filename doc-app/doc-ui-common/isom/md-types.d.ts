export interface TOC {
    /** begin with 0 */
    level: number;
    tag: string;
    text: string;
    id: string;
    children?: TOC[];
}
export interface LoaderRecivedData {
    toc: TOC[];
    html: string;
}
