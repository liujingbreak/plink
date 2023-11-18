import { WorkerControl } from '@wfh/reactivizer/dist/fork-join/node-worker';
import { TOC } from '../isom/md-types';
type MdInputActions = {
    forkProcessFile(markdownFileContent: string, filePath: string): void;
    processFile(markdownFileContent: SharedArrayBuffer, filePath: string): void;
    processFileDone(res: {
        resultHtml: ArrayBuffer;
        toc: TOC[];
        mermaid: ArrayBuffer[];
        transferList: ArrayBuffer[];
    }): void;
    /** Consumer should dispatach to be related to "resolveImage" event */
    imageResolved(resultUrl: string): void;
    /** Consumer should dispatch */
    anchorLinkResolved(url: string): void;
};
export type MdOutputEvents = {
    processFileDone: MdInputActions['processFileDone'];
    /** Consumer program should react on this event */
    imageToBeResolved(imgSrc: string, mdFilePath: string): void;
    /** Consumer should react and dispatach "anchorLinkResolved" */
    anchorLinkToBeResolved(linkSrc: string, mdFilePath: string): void;
    htmlRendered(file: string, html: string): void;
};
export type MarkdownProcessor = WorkerControl<MdInputActions, MdOutputEvents>;
export declare const markdownProcessor: MarkdownProcessor;
export {};
