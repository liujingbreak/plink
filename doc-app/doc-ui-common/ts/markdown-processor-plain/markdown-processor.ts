import {log4File} from '@wfh/plink';
import {createWorkerControl} from '@wfh/reactivizer/dist/fork-join/node-worker';
import {MdInputActions, MdOutputEvents, MarkdownProcessor} from '../../isom/markdown-process-common';
import {setupReactingForPlain} from '../../isom/markdown-process-extend';

const log = log4File(__filename);

export const markdownProcessor: MarkdownProcessor = createWorkerControl<MdInputActions, MdOutputEvents>({
  name: 'markdownFileProc',
  debug: false,
  debugExcludeTypes: ['wait', 'stopWaiting'],
  log(...msg) {
    log.info(...msg);
  }
});
setupReactingForPlain(markdownProcessor);

