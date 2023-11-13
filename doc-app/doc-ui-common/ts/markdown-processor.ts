import {log4File} from '@wfh/plink';
import {createWorkerControl, fork} from '@wfh/reactivizer/dist/fork-join/node-worker';
import {TOC} from '../isom/md-types';

const log = log4File(__filename);

type MdInputActions = {
  processFile(markdownFileContent: string, filePath: string): void;
  /** Consumer should dispatach to be related to "resolveImage" event */
  imageResolved(resultUrl: string): void;
  /** Consumer should dispatch */
  anchorLinkResolved(url: string): void;
};

type MdOutputEvents = {
  processFileDone(resultHtml: string, toc: TOC[]): void;
  /** Consumer program should react on this event */
  imageToBeResolved(imgSrc: string, mdFilePath: string): void;
  /** Consumer should react and dispatach "anchorLinkResolved" */
  anchorLinkToBeResolved(linkSrc: string, mdFilePath: string): void;
};

export const markdownProcessor = createWorkerControl<MdInputActions, MdOutputEvents>({name: 'markdownProcessor', debug: true});

