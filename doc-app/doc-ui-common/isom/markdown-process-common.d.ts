import { WorkerControl } from '@wfh/reactivizer/dist/fork-join/node-worker';
import { SingleActionFactory } from '@wfh/reactivizer';
import { TOC } from './md-types';
export type MdInputActions = {
    forkProcessFile(markdownFileContent: string, filePath: string): SingleActionFactory;
    processFile(markdownFileContent: SharedArrayBuffer, filePath: string): SingleActionFactory;
    processFileDone(res: {
        resultHtml: ArrayBuffer;
        toc: TOC[];
        mermaid: ArrayBuffer[];
        transferList: ArrayBuffer[];
    }): SingleActionFactory;
    /** Consumer should dispatach to be related to "resolveImage" event */
    imageResolved(resultUrl: string): SingleActionFactory;
    linkResolved(resultUrl: string): SingleActionFactory;
    /** Consumer should dispatch */
    anchorLinkResolved(url: string): SingleActionFactory;
};
export type MdOutputEvents = {
    processFileDone: MdInputActions['processFileDone'];
    /** Consumer program should react on this event */
    imageToBeResolved(imgSrc: string, mdFilePath: string): SingleActionFactory;
    /** Consumer program should react on this event */
    linkToBeResolved(urlSrc: string, mdFilePath: string): SingleActionFactory;
    /** Consumer should react and dispatach "anchorLinkResolved" */
    anchorLinkToBeResolved(linkSrc: string, mdFilePath: string): SingleActionFactory;
    htmlRendered(file: string, html: string): SingleActionFactory;
};
export type MarkdownProcessor = WorkerControl<MdInputActions, MdOutputEvents>;
export declare function setupReacting(markdownProcessor: MarkdownProcessor): void;
