export interface TOC {
    tag: string;
    text: string;
    id: string;
}
export interface LoaderRecivedData {
    toc: TOC[];
    content: string;
}
